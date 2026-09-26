'use strict';

const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const {
  Sala, CATEGORIAS, MODOS, MAX_JOGADORES, MAX_TEXTO, gerarCodigo, indicePerguntas,
  categoriasEmJogo, perguntasEscolhidas
} = require('./sala');
const dificuldade = require('./dificuldade');
const usos = require('./usos');
const perfis = require('./perfis');
const google = require('./google');
const banco = require('./banco');
const { NOTAS, VERSAO } = require('./notas');

const PORTA = process.env.PORT || 3000;
const SEGUNDOS_PERMITIDOS = [15, 20, 30, 45];
const META_MIN = 20;
const META_MAX = 500;
// Sala que esvaziou no meio da partida nao morre na hora: quem caiu tem esse
// tempo para voltar e reencontrar o proprio placar.
const MS_ESPERANDO_VOLTA = 10 * 60 * 1000;

const app = express();
const servidor = http.createServer(app);
const io = new Server(servidor);

app.use(express.static(path.join(__dirname, '..', 'public')));

// O cliente monta as telas de configuração a partir daqui.
app.get('/api/config', (_req, res) => {
  res.json({
    categorias: CATEGORIAS,
    modos: MODOS,
    maxJogadores: MAX_JOGADORES,
    maxTexto: MAX_TEXTO,
    segundosPermitidos: SEGUNDOS_PERMITIDOS,
    meta: { min: META_MIN, max: META_MAX },
    niveis: dificuldade.NIVEIS,
    versao: VERSAO,
    notas: NOTAS,
    // O ID do cliente do Google nao e segredo: o botao precisa dele na pagina.
    googleClientId: google.ativo() ? google.CLIENT_ID : null
  });
});

// Dificuldade aprendida de cada pergunta, da mais difícil para a mais fácil.
app.get('/api/dificuldades', (_req, res) => {
  // `usos` e o contador do rodizio do sorteio, que anda toda vez que a
  // pergunta entra; `vezes` so conta as rodadas que alimentam a dificuldade.
  res.json(dificuldade.resumo(indicePerguntas())
    .map((linha) => ({ ...linha, usos: usos.usosDe(linha.id) })));
});

// Os que mais venceram, de todas as salas e de sempre.
app.get('/api/melhores', (_req, res) => {
  res.json({ jogadores: perfis.melhores(10) });
});

// Salas que ainda aceitam gente, para o saguao listar e a pessoa entrar sem
// precisar que alguem dite o codigo.
app.get('/api/salas', (_req, res) => {
  const abertas = [];
  for (const sala of salas.values()) {
    if (sala.vazia) continue;
    // Partida rolando tambem entra na lista: da para cair e voltar, e quem
    // chega no meio comeca a valer na proxima rodada. O `estado` vai junto
    // para o saguao dizer o que e o que.
    if (sala.jogadores.size >= MAX_JOGADORES) continue;

    const lider = [...sala.jogadores.values()].find((j) => j.lider);
    const modo = MODOS.find((m) => m.id === sala.config.modo);
    abertas.push({
      codigo: sala.codigo,
      lider: lider ? lider.nickname : '',
      avatar: lider ? lider.avatar : '',
      jogadores: sala.jogadores.size,
      max: MAX_JOGADORES,
      modo: modo ? modo.nome : sala.config.modo,
      icone: modo ? modo.icone : '',
      estado: sala.estado
    });
  }
  // Sala mais cheia primeiro: e onde a partida comeca antes.
  abertas.sort((a, b) => b.jogadores - a.jogadores);
  res.json(abertas);
});

/** @type {Map<string, Sala>} */
const salas = new Map();

function criarSala(config) {
  let codigo;
  do {
    codigo = gerarCodigo();
  } while (salas.has(codigo));

  const sala = new Sala(
    codigo,
    config,
    (evento, dados) => io.to(codigo).emit(evento, dados),
    // Cada socket é dono de uma sala com o próprio id, então dá para falar com
    // uma pessoa só — é assim que a pergunta do Presente Grego chega apenas a
    // quem está leiloando.
    (socketId, evento, dados) => io.to(socketId).emit(evento, dados)
  );
  // A sala precisa saber quem ainda esta de pe para reconhecer a cadeira de
  // quem caiu e o servidor ainda nao percebeu.
  sala.estaOnline = (socketId) => io.sockets.sockets.has(socketId);

  salas.set(codigo, sala);
  return sala;
}

/**
 * Fecha a sala que ficou vazia — menos a que tem partida para voltar.
 *
 * Sala que nunca jogou nao guarda nada, entao morre na hora. A que estava no
 * meio de uma partida fica de molho: o placar e os pontos de quem caiu moram
 * nela, e sem isso "voltar com os pontos" nao existiria para o ultimo que sai.
 * Quem recolhe essas e a varredura, passado `MS_ESPERANDO_VOLTA`.
 */
function removerSalaSeVazia(sala) {
  if (!sala.vazia) {
    sala.vaziaDesde = null;
    return;
  }
  if (sala.rodada === 0 && sala.estado === 'lobby') {
    sala.destruir();
    salas.delete(sala.codigo);
    return;
  }
  if (!sala.vaziaDesde) sala.vaziaDesde = Date.now();
}

function publicarEstado(sala) {
  io.to(sala.codigo).emit('sala:estado', sala.estadoPublico());
}

/* --------------------------- Validação de entrada --------------------------- */

function limparNickname(valor) {
  if (typeof valor !== 'string') return null;
  const limpo = valor.replace(/\s+/g, ' ').trim().slice(0, 16);
  return limpo.length >= 2 ? limpo : null;
}

function limparCodigo(valor) {
  if (typeof valor !== 'string') return null;
  const limpo = valor.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  return limpo.length === 4 ? limpo : null;
}

/** Nunca confia na configuração vinda do cliente. */
function validarConfig(bruta) {
  if (!bruta || typeof bruta !== 'object') return { erro: 'Configuração inválida.' };

  const idsValidos = new Set(CATEGORIAS.map((c) => c.id));
  const categorias = Array.isArray(bruta.categorias)
    ? [...new Set(bruta.categorias.filter((id) => idsValidos.has(id)))]
    : [];
  // Partes vêm como 'categoria:parte' e só valem as que existem de fato.
  // `fora`: partes desmarcadas de uma categoria marcada (saem só elas).
  // `subs`: partes marcadas de uma categoria desmarcada (entram só elas).
  const partesValidas = new Set();
  for (const categoria of CATEGORIAS) {
    for (const sub of categoria.subs || []) partesValidas.add(`${categoria.id}:${sub.id}`);
  }
  const partes = (lista, daMarcada) => (Array.isArray(lista)
    ? [...new Set(lista.filter((s) => partesValidas.has(s)
        && categorias.includes(String(s).split(':')[0]) === daMarcada))]
    : []);
  const fora = partes(bruta.fora, true);
  const subs = partes(bruta.subs, false);

  // Categoria marcada com todas as partes desmarcadas pode ficar sem nada
  // (Marcas só tem perguntas dentro das partes).
  const escolha = { categorias, subs, fora };
  const comPerguntas = categoriasEmJogo(escolha)
    .filter((id) => perguntasEscolhidas(escolha, id).length > 0);
  if (comPerguntas.length === 0) return { erro: 'Escolha pelo menos uma categoria.' };

  const modo = MODOS.find((m) => m.id === bruta.modo && m.disponivel);
  if (!modo) return { erro: 'Esse modo de jogo ainda não está disponível.' };

  const metaPontos = Number(bruta.metaPontos);
  if (!Number.isInteger(metaPontos) || metaPontos < META_MIN || metaPontos > META_MAX) {
    return { erro: `A meta deve ser um número entre ${META_MIN} e ${META_MAX}.` };
  }

  const segundos = Number(bruta.segundosPorPergunta);
  const segundosPorPergunta = SEGUNDOS_PERMITIDOS.includes(segundos) ? segundos : 20;

  return { config: { categorias, subs, fora, modo: modo.id, metaPontos, segundosPorPergunta } };
}

/* -------------------------------- Socket.IO -------------------------------- */

io.on('connection', (socket) => {
  // Cada socket participa de no máximo uma sala.
  socket.data.codigo = null;

  const salaDoSocket = () => (socket.data.codigo ? salas.get(socket.data.codigo) : null);

  function responder(callback, payload) {
    if (typeof callback === 'function') callback(payload);
  }

  /** A carteirinha que a aba manda: so serve para reconhecer a mesma aba. */
  function limparCliente(valor) {
    if (typeof valor !== 'string') return null;
    const limpo = valor.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40);
    return limpo.length >= 8 ? limpo : null;
  }

  socket.on('sala:criar', ({ nickname, config, cliente } = {}, callback) => {
    const nome = limparNickname(nickname);
    if (!nome) return responder(callback, { erro: 'Escolha um nickname de 2 a 16 caracteres.' });
    if (salaDoSocket()) return responder(callback, { erro: 'Você já está em uma sala.' });

    const validacao = validarConfig(config);
    if (validacao.erro) return responder(callback, { erro: validacao.erro });

    const sala = criarSala(validacao.config);
    // A carteirinha vai desde a criacao: quem abre a sala tambem cai da
    // internet, e sem ela o dono voltaria como "Ana (2)".
    const { jogador, erro } = sala.entrar(socket.id, nome, limparCliente(cliente));
    if (erro) {
      removerSalaSeVazia(sala);
      return responder(callback, { erro });
    }

    socket.join(sala.codigo);
    socket.data.codigo = sala.codigo;

    responder(callback, { ok: true, codigo: sala.codigo, eu: jogador, sala: sala.estadoPublico() });
    publicarEstado(sala);
  });

  socket.on('sala:entrar', ({ nickname, codigo, cliente } = {}, callback) => {
    const nome = limparNickname(nickname);
    if (!nome) return responder(callback, { erro: 'Escolha um nickname de 2 a 16 caracteres.' });

    const cod = limparCodigo(codigo);
    if (!cod) return responder(callback, { erro: 'O código da sala tem 4 caracteres.' });
    if (salaDoSocket()) return responder(callback, { erro: 'Você já está em uma sala.' });

    const sala = salas.get(cod);
    if (!sala) return responder(callback, { erro: 'Não encontramos nenhuma sala com esse código.' });

    const { jogador, erro, voltou } = sala.entrar(socket.id, nome, limparCliente(cliente));
    if (erro) return responder(callback, { erro });

    socket.join(sala.codigo);
    socket.data.codigo = sala.codigo;

    responder(callback, {
      ok: true, codigo: sala.codigo, eu: jogador, sala: sala.estadoPublico(), voltou
    });
    io.to(sala.codigo).emit('sala:entrou', {
      nickname: jogador.nickname, avatar: jogador.avatar, voltou
    });
    publicarEstado(sala);
  });

  socket.on('sala:iniciar', (_dados, callback) => {
    const sala = salaDoSocket();
    if (!sala) return responder(callback, { erro: 'Você não está em uma sala.' });
    if (!sala.ehLider(socket.id)) return responder(callback, { erro: 'Só o líder pode começar.' });

    const { erro } = sala.iniciar();
    if (erro) return responder(callback, { erro });

    responder(callback, { ok: true });
    publicarEstado(sala);
  });

  // Uma única entrada para tudo que a pessoa digita: pode virar acerto,
  // aviso de "quase" ou mensagem de chat — quem decide é o servidor.
  socket.on('sala:palpite', ({ texto } = {}, callback) => {
    const sala = salaDoSocket();
    if (!sala) return responder(callback, { erro: 'Você não está em uma sala.' });
    if (typeof texto !== 'string') return responder(callback, { erro: 'Mensagem inválida.' });

    responder(callback, sala.palpitar(socket.id, texto));
  });

  // Voto para pular a rodada. Metade mais um fecha a conta.
  socket.on('sala:pular', (_dados, callback) => {
    const sala = salaDoSocket();
    if (!sala) return responder(callback, { erro: 'Você não está em uma sala.' });

    responder(callback, sala.votarPular(socket.id));
  });

  // Presente Grego: o lance diz quantas respostas o PARCEIRO vai conseguir.
  socket.on('sala:apostar', ({ aposta } = {}, callback) => {
    const sala = salaDoSocket();
    if (!sala) return responder(callback, { erro: 'Você não está em uma sala.' });

    const valor = Number(aposta);
    if (!Number.isInteger(valor) || valor < 1) {
      return responder(callback, { erro: 'A aposta é um número inteiro a partir de 1.' });
    }

    responder(callback, sala.apostar(socket.id, valor));
  });

  socket.on('sala:passar', (_dados, callback) => {
    const sala = salaDoSocket();
    if (!sala) return responder(callback, { erro: 'Voce nao esta em uma sala.' });

    const { erro } = sala.passar(socket.id);
    if (erro) return responder(callback, { erro });
    responder(callback, { ok: true });
  });

  socket.on('sala:duvidar', (_dados, callback) => {
    const sala = salaDoSocket();
    if (!sala) return responder(callback, { erro: 'Você não está em uma sala.' });

    responder(callback, sala.duvidar(socket.id));
  });

  // O perfil desta carteirinha: numeros de sempre e conquistas.
  socket.on('perfil:ver', ({ cliente } = {}, callback) => {
    responder(callback, { perfil: perfis.verPerfil(limparCliente(cliente)) });
  });

  // Login com Google: o servidor confere o bilhete antes de ligar a conta.
  socket.on('conta:entrar', async ({ credencial, cliente } = {}, callback) => {
    const carteirinha = limparCliente(cliente);
    if (!carteirinha) return responder(callback, { erro: 'Navegador sem carteirinha.' });
    try {
      const { conta, nome } = await google.verificar(credencial);
      const novas = perfis.entrarComConta(carteirinha, conta, nome);
      responder(callback, { perfil: perfis.verPerfil(carteirinha), conquistas: novas });
    } catch (erro) {
      console.warn('Login com Google recusado:', erro.message);
      responder(callback, { erro: 'Nao deu para entrar com o Google. Tente de novo.' });
    }
  });

  socket.on('conta:sair', ({ cliente } = {}, callback) => {
    const carteirinha = limparCliente(cliente);
    perfis.sairDaConta(carteirinha);
    responder(callback, { perfil: perfis.verPerfil(carteirinha) });
  });

  socket.on('sala:novoJogo', (_dados, callback) => {
    const sala = salaDoSocket();
    if (!sala) return responder(callback, { erro: 'Você não está em uma sala.' });
    if (!sala.ehLider(socket.id)) return responder(callback, { erro: 'Só o líder pode reiniciar.' });

    sala.voltarAoLobby();
    responder(callback, { ok: true });
    publicarEstado(sala);
  });

  socket.on('sala:expulsar', ({ jogadorId } = {}, callback) => {
    const sala = salaDoSocket();
    if (!sala) return responder(callback, { erro: 'Voce nao esta em uma sala.' });
    if (typeof jogadorId !== 'string') return responder(callback, { erro: 'Jogador invalido.' });

    const { erro, jogador } = sala.expulsar(socket.id, jogadorId);
    if (erro) return responder(callback, { erro });

    // Avisa quem foi tirado e o desliga da sala, para nao continuar recebendo
    // os eventos da partida.
    const alvo = io.sockets.sockets.get(jogadorId);
    if (alvo) {
      alvo.emit('sala:expulso');
      alvo.leave(sala.codigo);
      alvo.data.codigo = null;
    }

    io.to(sala.codigo).emit('sala:saiu', { nickname: jogador.nickname, expulso: true });
    responder(callback, { ok: true });
    removerSalaSeVazia(sala);
    if (salas.has(sala.codigo)) publicarEstado(sala);
  });

  socket.on('sala:equipe', ({ equipeId } = {}, callback) => {
    const sala = salaDoSocket();
    if (!sala) return responder(callback, { erro: 'Voce nao esta em uma sala.' });

    const { erro } = sala.trocarEquipe(socket.id, equipeId);
    if (erro) return responder(callback, { erro });

    responder(callback, { ok: true });
    publicarEstado(sala);
  });

  // O + e o − do saguao: quantas equipes e de que tamanho.
  socket.on('sala:formato', ({ campo, delta } = {}, callback) => {
    const sala = salaDoSocket();
    if (!sala) return responder(callback, { erro: 'Voce nao esta em uma sala.' });
    if (campo !== 'equipes' && campo !== 'tamanho') {
      return responder(callback, { erro: 'So da para mudar quantas equipes ou o tamanho delas.' });
    }
    if (delta !== 1 && delta !== -1) return responder(callback, { erro: 'Mude de um em um.' });

    const r = sala.mudarFormato(socket.id, campo, delta);
    if (r.erro) return responder(callback, { erro: r.erro });

    responder(callback, r);
    publicarEstado(sala);
  });

  socket.on('sala:trocarAvatar', ({ avatar } = {}, callback) => {
    const sala = salaDoSocket();
    if (!sala) return responder(callback, { erro: 'Voce nao esta em uma sala.' });
    if (typeof avatar !== 'string') return responder(callback, { erro: 'Icone invalido.' });

    const r = sala.trocarAvatar(socket.id, avatar);
    if (r.erro) return responder(callback, { erro: r.erro });

    responder(callback, r);
    publicarEstado(sala);
  });

  socket.on('sala:sair', (_dados, callback) => {
    const sala = salaDoSocket();
    if (!sala) return responder(callback, { ok: true });

    const jogador = sala.sair(socket.id);
    socket.leave(sala.codigo);
    socket.data.codigo = null;

    if (jogador) io.to(sala.codigo).emit('sala:saiu', { nickname: jogador.nickname });
    removerSalaSeVazia(sala);
    if (salas.has(sala.codigo)) publicarEstado(sala);

    responder(callback, { ok: true });
  });

  socket.on('disconnect', () => {
    const sala = salaDoSocket();
    if (!sala) return;

    const jogador = sala.sair(socket.id);
    socket.data.codigo = null;

    if (jogador) io.to(sala.codigo).emit('sala:saiu', { nickname: jogador.nickname });
    removerSalaSeVazia(sala);
    if (salas.has(sala.codigo)) publicarEstado(sala);
  });
});

// Varredura das salas abandonadas: as que esvaziaram e ninguem voltou.
setInterval(() => {
  const limite = Date.now() - MS_ESPERANDO_VOLTA;
  for (const [codigo, sala] of salas) {
    if (!sala.vazia) continue;
    // `vaziaDesde` e a hora em que a ultima pessoa saiu; a sala que nunca teve
    // ninguem cai pela hora em que foi criada.
    if ((sala.vaziaDesde || sala.criadaEm) < limite) {
      sala.destruir();
      salas.delete(codigo);
    }
  }
}, 60 * 1000).unref();

// Com banco, os contadores chegam por rede: so abre a porta depois de le-los,
// senao a primeira partida sortearia como se nada tivesse rodado ainda.
Promise.all([dificuldade.pronto, usos.pronto, perfis.pronto]).then(() => {
  servidor.listen(PORTA, () => {
    const onde = banco.ativo() ? 'banco de dados' : 'arquivos em server/dados';
    console.log(`\n  🧠 PensaRápido rodando em http://localhost:${PORTA} (dados: ${onde})\n`);
  });
});

// O Render manda SIGTERM a cada deploy: grava o que falta antes de sair.
let saindo = false;
async function encerrar() {
  if (saindo) return;
  saindo = true;
  try {
    await Promise.all([dificuldade.salvar(), usos.salvar(), perfis.salvar()]);
    await banco.fechar();
  } catch (erro) {
    console.warn('Erro ao gravar antes de sair:', erro.message);
  }
  process.exit(0);
}
process.on('SIGTERM', encerrar);
process.on('SIGINT', encerrar);
