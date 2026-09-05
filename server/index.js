'use strict';

const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const {
  Sala, CATEGORIAS, MODOS, MAX_JOGADORES, MAX_TEXTO, gerarCodigo, indicePerguntas
} = require('./sala');
const dificuldade = require('./dificuldade');

const PORTA = process.env.PORT || 3000;
const SEGUNDOS_PERMITIDOS = [15, 20, 30, 45];
const META_MIN = 20;
const META_MAX = 500;

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
    niveis: dificuldade.NIVEIS
  });
});

// Dificuldade aprendida de cada pergunta, da mais difícil para a mais fácil.
app.get('/api/dificuldades', (_req, res) => {
  res.json(dificuldade.resumo(indicePerguntas()));
});

/** @type {Map<string, Sala>} */
const salas = new Map();

function criarSala(config) {
  let codigo;
  do {
    codigo = gerarCodigo();
  } while (salas.has(codigo));

  const sala = new Sala(codigo, config, (evento, dados) => io.to(codigo).emit(evento, dados));
  salas.set(codigo, sala);
  return sala;
}

function removerSalaSeVazia(sala) {
  if (sala.vazia) {
    sala.destruir();
    salas.delete(sala.codigo);
  }
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
  if (categorias.length === 0) return { erro: 'Escolha pelo menos uma categoria.' };

  // Subcategorias vêm como 'categoria:parte'; só valem as que existem de fato
  // e cuja categoria foi marcada.
  const subsValidas = new Set();
  for (const categoria of CATEGORIAS) {
    for (const sub of categoria.subs || []) subsValidas.add(`${categoria.id}:${sub.id}`);
  }
  const subs = Array.isArray(bruta.subs)
    ? [...new Set(bruta.subs.filter(
        (s) => subsValidas.has(s) && categorias.includes(String(s).split(':')[0])
      ))]
    : [];

  const modo = MODOS.find((m) => m.id === bruta.modo && m.disponivel);
  if (!modo) return { erro: 'Esse modo de jogo ainda não está disponível.' };

  const metaPontos = Number(bruta.metaPontos);
  if (!Number.isInteger(metaPontos) || metaPontos < META_MIN || metaPontos > META_MAX) {
    return { erro: `A meta deve ser um número entre ${META_MIN} e ${META_MAX}.` };
  }

  const segundos = Number(bruta.segundosPorPergunta);
  const segundosPorPergunta = SEGUNDOS_PERMITIDOS.includes(segundos) ? segundos : 20;

  return { config: { categorias, subs, modo: modo.id, metaPontos, segundosPorPergunta } };
}

/* -------------------------------- Socket.IO -------------------------------- */

io.on('connection', (socket) => {
  // Cada socket participa de no máximo uma sala.
  socket.data.codigo = null;

  const salaDoSocket = () => (socket.data.codigo ? salas.get(socket.data.codigo) : null);

  function responder(callback, payload) {
    if (typeof callback === 'function') callback(payload);
  }

  socket.on('sala:criar', ({ nickname, config } = {}, callback) => {
    const nome = limparNickname(nickname);
    if (!nome) return responder(callback, { erro: 'Escolha um nickname de 2 a 16 caracteres.' });
    if (salaDoSocket()) return responder(callback, { erro: 'Você já está em uma sala.' });

    const validacao = validarConfig(config);
    if (validacao.erro) return responder(callback, { erro: validacao.erro });

    const sala = criarSala(validacao.config);
    const { jogador, erro } = sala.entrar(socket.id, nome);
    if (erro) {
      removerSalaSeVazia(sala);
      return responder(callback, { erro });
    }

    socket.join(sala.codigo);
    socket.data.codigo = sala.codigo;

    responder(callback, { ok: true, codigo: sala.codigo, eu: jogador, sala: sala.estadoPublico() });
    publicarEstado(sala);
  });

  socket.on('sala:entrar', ({ nickname, codigo } = {}, callback) => {
    const nome = limparNickname(nickname);
    if (!nome) return responder(callback, { erro: 'Escolha um nickname de 2 a 16 caracteres.' });

    const cod = limparCodigo(codigo);
    if (!cod) return responder(callback, { erro: 'O código da sala tem 4 caracteres.' });
    if (salaDoSocket()) return responder(callback, { erro: 'Você já está em uma sala.' });

    const sala = salas.get(cod);
    if (!sala) return responder(callback, { erro: 'Não encontramos nenhuma sala com esse código.' });

    const { jogador, erro } = sala.entrar(socket.id, nome);
    if (erro) return responder(callback, { erro });

    socket.join(sala.codigo);
    socket.data.codigo = sala.codigo;

    responder(callback, { ok: true, codigo: sala.codigo, eu: jogador, sala: sala.estadoPublico() });
    io.to(sala.codigo).emit('sala:entrou', { nickname: jogador.nickname, avatar: jogador.avatar });
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

  socket.on('sala:novoJogo', (_dados, callback) => {
    const sala = salaDoSocket();
    if (!sala) return responder(callback, { erro: 'Você não está em uma sala.' });
    if (!sala.ehLider(socket.id)) return responder(callback, { erro: 'Só o líder pode reiniciar.' });

    sala.voltarAoLobby();
    responder(callback, { ok: true });
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

// Varredura de salas abandonadas (sem jogadores há mais de uma hora).
setInterval(() => {
  const limite = Date.now() - 60 * 60 * 1000;
  for (const [codigo, sala] of salas) {
    if (sala.vazia && sala.criadaEm < limite) {
      sala.destruir();
      salas.delete(codigo);
    }
  }
}, 10 * 60 * 1000).unref();

servidor.listen(PORTA, () => {
  console.log(`\n  🧠 PensaRápido rodando em http://localhost:${PORTA}\n`);
});
