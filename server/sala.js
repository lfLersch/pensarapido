'use strict';

const { CATEGORIAS, QUESTOES } = require('./questions');
const { avaliar, normalizar, mascaraDeAcerto } = require('./comparar');
const { paraRodada, itemDe } = require('./escalada');
const dificuldade = require('./dificuldade');

/* ---------------------------- Regras do jogo ---------------------------- */

const PONTOS_MAX = 10;        // base de quem responde na primeira faixa
const MS_POR_FAIXA = 5000;    // a cada 5s de rodada, a base cai 1 ponto
const PONTOS_MIN = 1;         // acertar sempre vale pelo menos 1

// Escalada: cada item lembrado já vale ponto, e fechar a lista dá um empurrão.
const PONTOS_POR_ITEM = 2;
const BONUS_ESCALADA = 5;

const MS_REVELACAO = 2800;   // tela "categoria" antes da pergunta
const MS_RESULTADO = 5000;       // tela de resultado quando o tempo acaba
const MS_RESULTADO_TODOS = 3000; // ... e quando todo mundo acertou antes
const MS_APOS_ULTIMO = 0;        // acertou geral, fecha na hora: a contagem é na tela

// Na Escalada a rodada cresce junto com o número de respostas pedidas.
const MS_POR_RESPOSTA_EXTRA = 3000;
const MS_TETO_RODADA = 90000;

// Carrossel: a vez passa de jogador em jogador e quem não souber sai da
// rodada. Cada pessoa tem 7s, e a cada 2 rodadas o carrossel dá uma volta a
// mais — rodadas 1-2 uma volta, 3-4 duas, 5-6 três.
const MS_POR_VEZ = 7000;
const RODADAS_POR_VOLTA = 2;
// Para em 3 voltas. Sem teto, a rodada 15 pedia 8 voltas: com 2 pessoas isso
// são 16 respostas seguidas, e quase nenhuma lista tem tamanho para isso.
const MAX_VOLTAS = 3;
const BONUS_CARROSSEL = 5;   // para quem chega vivo ao fim da rodada
const MS_ENTRE_VEZES = 900;  // respiro para a tela mostrar quem saiu

// Presente Grego: joga-se em duplas. Um integrante ve a pergunta e leiloa
// quantas respostas o PARCEIRO consegue dizer — e o parceiro so descobre a
// pergunta quando o leilao acaba. Dai o nome: o lance e um presente
// embrulhado que a outra metade da dupla tem que desembrulhar.
const MS_POR_LANCE = 15000;      // tempo de cada dupla para cobrir ou duvidar
const MS_ENTRE_LANCES = 700;     // respiro entre um lance e o proximo
const MS_APOS_LEILAO = 3200;     // tela do "duvido" antes da pergunta aparecer
// A lista precisa de repertorio: com lista curta o lance esbarra no tamanho
// dela e a rodada vira conta de padaria em vez de conhecimento.
const MIN_ITENS_PRESENTE = 15;
const MAX_APOSTA = 60;           // teto so para barrar lance de brincadeira
const PONTOS_POR_APOSTA = 2;     // cada item apostado vale isto para a dupla
// Aqui uma pessoa so digita a lista inteira, entao cada resposta pedida pesa
// mais que na Escalada, onde todo mundo responde em paralelo.
const MS_POR_ITEM_PRESENTE = 6000;
const MS_TETO_PRESENTE = 120000;
const MIN_JOGADORES_DUPLA = 4;   // duas duplas

// Uma cara para cada dupla: com o teto de 12 jogadores dao 6 duplas.
const DUPLAS_VISUAL = [
  { icone: '🟣', cor: '#a78bfa' },
  { icone: '🟠', cor: '#fb923c' },
  { icone: '🟢', cor: '#34d399' },
  { icone: '🔵', cor: '#60a5fa' },
  { icone: '🔴', cor: '#f87171' },
  { icone: '🟡', cor: '#fbbf24' }
];

const MAX_JOGADORES = 12;
const MAX_TEXTO = 120;       // tamanho máximo de uma mensagem
const INTERVALO_MENSAGENS = 350; // anti-spam, em ms

const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem O/0 e I/1
// Mais avatares que o teto de jogadores, para sempre sobrar escolha na troca.
const AVATARES = [
  '🦊', '🐼', '🐸', '🦁', '🐧', '🐙', '🦄', '🐨',
  '🦉', '🐝', '🐬', '🦖', '🐯', '🐷', '🐵', '🐺',
  '🦈', '🦋', '🐢', '🦩', '🦚', '🐳', '🦌', '🐿',
  '🦥', '🦓', '🐮', '🐔', '🦜', '🐦', '🐤', '🦭'
];

const MODOS = [
  {
    id: 'tempo',
    nome: 'Modo Tempo',
    icone: '⏱',
    descricao: 'Escreva a resposta no chat. A cada 5s de rodada a base cai 1 ponto (10, 9, 8, 7) e cai mais 1 para cada pessoa que acertou antes de voce.',
    disponivel: true
  },
  {
    id: 'escalada',
    nome: 'Escalada',
    icone: '🧗',
    descricao: 'Cada rodada pede uma resposta a mais: 1 na primeira, 2 na segunda, 3 na terceira… Cada item lembrado vale 2 pontos e fechar a lista da +5 de bonus.',
    disponivel: true
  },
  {
    id: 'carrossel',
    nome: 'Carrossel visivel',
    icone: '🎠',
    descricao: 'A vez passa de um em um, 7s para cada. Quem nao souber sai da rodada. O que ja foi respondido fica na tela. Rodadas 1-2 dao uma volta, 3-4 duas, 5-6 tres.',
    disponivel: true
  },
  {
    id: 'carrossel-cego',
    nome: 'Carrossel as cegas',
    icone: '🙈',
    descricao: 'O mesmo carrossel, mas sem a lista do que ja foi dito: quem repetir uma resposta que ja saiu esta fora.',
    disponivel: true
  },
  {
    id: 'presente-grego',
    nome: 'Presente Grego',
    icone: '🎁',
    descricao: 'Em duplas. Um de cada dupla ve a pergunta e leiloa quantas respostas o PARCEIRO consegue dizer — e o parceiro so descobre a pergunta no fim. O lance sobe ate alguem duvidar; se a aposta nao sair, quem duvidou leva os pontos.',
    disponivel: true,
    duplas: true
  },
  {
    id: 'equipes',
    nome: 'Equipes',
    icone: '🤝',
    descricao: 'Dois times disputam a pontuacao. Em breve.',
    disponivel: false
  }
];

/* ------------------------------ Utilidades ------------------------------ */

function embaralhar(lista) {
  const copia = lista.slice();
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function gerarCodigo() {
  let codigo = '';
  for (let i = 0; i < 4; i++) {
    codigo += ALFABETO_CODIGO[Math.floor(Math.random() * ALFABETO_CODIGO.length)];
  }
  return codigo;
}

/**
 * Pontuação do Modo Tempo.
 *
 * Dois descontos se somam:
 *
 *   1. o relógio — a rodada é fatiada em faixas de 5s e a base cai 1 por faixa;
 *      numa rodada de 20s isso dá 10, 9, 8 e 7;
 *   2. a fila — cai mais 1 ponto para cada pessoa que acertou antes.
 *
 * Exemplo: terceiro a acertar, aos 16s -> faixa de 15-20s vale 7, menos 2 de
 * quem chegou na frente = 5 pontos.
 *
 * @param {number} msNaRodada  tempo desde que a pergunta apareceu
 * @param {number} posicao     1 para o primeiro a acertar, 2 para o segundo...
 */
function calcularPontos(msNaRodada, posicao) {
  const faixa = Math.floor(Math.max(0, msNaRodada) / MS_POR_FAIXA);
  const base = PONTOS_MAX - faixa;
  return Math.max(PONTOS_MIN, base - (posicao - 1));
}

/** Índice de todas as perguntas, para o painel de dificuldades. */
function indicePerguntas() {
  const mapa = new Map();
  for (const categoria of CATEGORIAS) {
    for (const q of QUESTOES[categoria.id] || []) {
      mapa.set(dificuldade.idDe(categoria.id, q.pergunta, q.resposta), {
        categoria: categoria.id,
        pergunta: q.pergunta,
        resposta: q.resposta,
        base: q.dif ?? 40
      });
    }
  }
  return mapa;
}

/* -------------------------------- Sala ---------------------------------- */

class Sala {
  /**
   * @param {string} codigo
   * @param {{categorias:string[], modo:string, metaPontos:number, segundosPorPergunta:number}} config
   * @param {(evento:string, dados:any)=>void} emitir  publica um evento na sala
   * @param {(socketId:string, evento:string, dados:any)=>void} [emitirPara]
   *        fala com uma pessoa so. No Presente Grego a pergunta vai por aqui:
   *        quem esta no leilao ve, quem vai responder nao.
   */
  constructor(codigo, config, emitir, emitirPara) {
    this.codigo = codigo;
    this.config = config;
    this.emitir = emitir;
    this.emitirPara = emitirPara || (() => {});

    this.jogadores = new Map(); // socketId -> jogador
    this.estado = 'lobby';      // lobby | categoria | leilao | pergunta | resultado | fim
    this.criadaEm = Date.now();

    this.rodada = 0;
    this.perguntaAtual = null;
    this.inicioPergunta = null;
    this.primeiroAcertoEm = null;
    this.acertos = new Map();   // socketId -> { ms, pontos, posicao }
    this.progresso = new Map(); // Escalada: socketId -> Set(índices já ditos)
    this.itensUsados = new Set(); // Carrossel: itens ja ditos por QUALQUER um
    this.pontosRodada = new Map(); // socketId -> pontos feitos nesta rodada
    this.ultimoTema = null;     // tema da rodada anterior, para não repetir
    this.jogadoresNaRodada = 0;

    this.fila = [];             // perguntas embaralhadas ainda não usadas
    // Respostas e listas que já caíram nesta partida. Duas cenas diferentes de
    // Star Wars são duas perguntas no banco, mas para quem joga são a mesma:
    // na segunda todo mundo digita na hora. "Star Wars" é resposta de 5
    // perguntas do banco, "Legiao Urbana" de 5.
    this.respostasUsadas = new Set();
    this.listasUsadas = new Set();

    // Carrossel: de quem é a vez e quem já saiu desta rodada.
    this.ordem = [];            // socketIds na ordem em que o carrossel gira
    this.vez = 0;               // índice em `ordem`
    this.vivos = new Set();     // ainda na rodada
    this.voltasAlvo = 1;
    this.voltasFeitas = 0;
    this.inicioVez = 0;

    // Presente Grego: as duplas duram a partida inteira; o leilão, uma rodada.
    this.duplas = [];
    this.leilao = null;

    this.temporizador = null;
    this.temporizadorVez = null; // o relógio dos 7s corre à parte do da rodada
  }

  /* --------------------------- Jogadores ---------------------------- */

  entrar(socketId, nickname) {
    if (this.jogadores.size >= MAX_JOGADORES) {
      return { erro: 'Esta sala ja esta cheia.' };
    }
    if (this.estado !== 'lobby' && this.estado !== 'fim') {
      return { erro: 'A partida ja comecou. Espere ela terminar.' };
    }

    const nomesUsados = new Set([...this.jogadores.values()].map((j) => j.nickname.toLowerCase()));
    let nomeFinal = nickname;
    let sufixo = 2;
    while (nomesUsados.has(nomeFinal.toLowerCase())) {
      nomeFinal = `${nickname} (${sufixo++})`;
    }

    const avataresUsados = new Set([...this.jogadores.values()].map((j) => j.avatar));
    const avatar = AVATARES.find((a) => !avataresUsados.has(a)) || AVATARES[0];

    const jogador = {
      id: socketId,
      nickname: nomeFinal,
      avatar,
      pontos: 0,
      acertos: 0,
      lider: this.jogadores.size === 0,
      ultimaMensagem: 0
    };

    this.jogadores.set(socketId, jogador);
    return { jogador };
  }

  sair(socketId) {
    const jogador = this.jogadores.get(socketId);
    if (!jogador) return null;

    this.jogadores.delete(socketId);
    this.acertos.delete(socketId);

    // Se o líder saiu, promove quem estiver na fila.
    if (jogador.lider) {
      const proximo = this.jogadores.values().next().value;
      if (proximo) proximo.lider = true;
    }

    // Carrossel: quem fecha a aba no meio da própria vez trava o carrossel,
    // porque o relógio dos 7s espera uma resposta que não vem mais.
    if (this.ehCarrossel() && this.vivos.has(socketId)) {
      const eraAVez = this.ordem[this.vez] === socketId;
      this.vivos.delete(socketId);
      if (this.estado === 'pergunta' && eraAVez) this.avancarVez();
    }

    if (this.ehPresenteGrego() && this.duplas.length) this.desfazerDupla(socketId);

    // Só faltava quem saiu para fechar a rodada.
    if (this.estado === 'pergunta' && this.todosAcertaram()) {
      this.agendar(() => this.encerrarRodada(), MS_APOS_ULTIMO);
    }

    return jogador;
  }

  /** O lider tira alguem da sala. Devolve o jogador removido. */
  expulsar(socketIdLider, socketIdAlvo) {
    if (!this.ehLider(socketIdLider)) return { erro: 'So o lider pode expulsar.' };
    if (socketIdLider === socketIdAlvo) return { erro: 'Voce nao pode se expulsar.' };

    const alvo = this.jogadores.get(socketIdAlvo);
    if (!alvo) return { erro: 'Esse jogador nao esta na sala.' };

    const removido = this.sair(socketIdAlvo);
    return { ok: true, jogador: removido };
  }

  /** Troca o proprio avatar, se ninguem mais estiver usando. */
  trocarAvatar(socketId, avatar) {
    const jogador = this.jogadores.get(socketId);
    if (!jogador) return { erro: 'Voce nao esta nesta sala.' };
    if (!AVATARES.includes(avatar)) return { erro: 'Esse icone nao existe.' };
    if (jogador.avatar === avatar) return { ok: true, avatar };

    const emUso = [...this.jogadores.values()].some((j) => j.avatar === avatar);
    if (emUso) return { erro: 'Esse icone ja e de outra pessoa.' };

    jogador.avatar = avatar;
    return { ok: true, avatar };
  }

  /** Quais icones ainda estao livres, para a pessoa escolher. */
  avataresLivres() {
    const usados = new Set([...this.jogadores.values()].map((j) => j.avatar));
    return AVATARES.filter((a) => !usados.has(a));
  }

  ehLider(socketId) {
    const jogador = this.jogadores.get(socketId);
    return Boolean(jogador && jogador.lider);
  }

  get vazia() {
    return this.jogadores.size === 0;
  }

  /* ----------------------------- Partida ---------------------------- */

  iniciar() {
    if (this.estado !== 'lobby' && this.estado !== 'fim') {
      return { erro: 'A partida ja esta em andamento.' };
    }
    if (this.jogadores.size < 1) {
      return { erro: 'E preciso pelo menos um jogador.' };
    }
    if (this.ehPresenteGrego()) {
      if (this.jogadores.size < MIN_JOGADORES_DUPLA) {
        return { erro: `O Presente Grego precisa de ${MIN_JOGADORES_DUPLA} jogadores: sao duas duplas no minimo.` };
      }
      if (this.jogadores.size % 2 !== 0) {
        return { erro: 'O Presente Grego e jogado em duplas: o numero de jogadores tem que ser par.' };
      }
    }

    for (const jogador of this.jogadores.values()) {
      jogador.pontos = 0;
      jogador.acertos = 0;
    }

    this.rodada = 0;
    this.fila = [];
    this.respostasUsadas.clear();
    this.listasUsadas.clear();
    if (this.ehPresenteGrego()) this.formarDuplas();
    this.montarFila();
    this.proximaRodada();
    return { ok: true };
  }

  /* ------------------------- Duplas (Presente Grego) ------------------------ */

  ehPresenteGrego() {
    return this.config.modo === 'presente-grego';
  }

  /** Sorteia as duplas da partida. Elas duram até o fim do jogo. */
  formarDuplas() {
    const ids = embaralhar([...this.jogadores.keys()]);
    this.duplas = [];

    for (let i = 0; i + 1 < ids.length; i += 2) {
      const n = this.duplas.length;
      this.duplas.push({
        id: `d${n + 1}`,
        nome: `Dupla ${n + 1}`,
        ...DUPLAS_VISUAL[n % DUPLAS_VISUAL.length],
        // Quem abre leiloando é sorteado aqui; daí em diante os papéis
        // alternam a cada rodada. Sorteio puro rodada a rodada deixaria
        // alguém a partida inteira sem nunca responder.
        giro: Math.floor(Math.random() * 2),
        jogadores: [ids[i], ids[i + 1]]
      });
    }
  }

  duplaPorId(id) {
    return this.duplas.find((d) => d.id === id) || null;
  }

  duplaDe(socketId) {
    return this.duplas.find((d) => d.jogadores.includes(socketId)) || null;
  }

  /** Só dupla inteira entra no leilão: com um integrante só não há a quem apostar. */
  duplasAtivas() {
    return this.duplas.filter(
      (d) => d.jogadores.length === 2 && d.jogadores.every((id) => this.jogadores.has(id))
    );
  }

  /** Quem leiloa nesta rodada por esta dupla. O papel troca a cada rodada. */
  leiloeiroDe(dupla) {
    if (!dupla || dupla.jogadores.length < 2) return null;
    return dupla.jogadores[(this.rodada - 1 + dupla.giro) % 2];
  }

  /** O outro: quem vai receber o presente sem saber o que tem dentro. */
  respondedorDe(dupla) {
    const leiloeiro = this.leiloeiroDe(dupla);
    if (!leiloeiro) return null;
    return dupla.jogadores.find((id) => id !== leiloeiro) || null;
  }

  /**
   * Alguém saiu no meio da partida: a dupla dele fica capenga e sai do leilão.
   * Se a rodada dependia dessa pessoa, ela não tem como terminar.
   */
  desfazerDupla(socketId) {
    const dupla = this.duplaDe(socketId);
    if (!dupla) return;

    const eraDaVez = this.estado === 'leilao'
      && this.leilao
      && this.leilao.duplas[this.leilao.vez] === dupla.id;
    const tinhaOMaiorLance = this.leilao && this.leilao.duplaAposta === dupla.id;

    dupla.jogadores = dupla.jogadores.filter((id) => id !== socketId);

    // Quem ia entregar o presente sumiu: a rodada não tem como terminar.
    if (this.leilao && this.leilao.respondedor === socketId) {
      return this.cancelarRodada('quem tinha sido desafiado saiu da sala');
    }
    if (!this.leilaoAberto()) return;
    // Sem a dupla do maior lance não há presente para entregar.
    if (tinhaOMaiorLance) return this.cancelarRodada('a dupla do maior lance se desfez');
    if (eraDaVez) this.avancarLance();
  }

  /** Junta as perguntas das categorias escolhidas e embaralha. */
  montarFila() {
    const todas = [];
    const subsEscolhidas = new Set(this.config.subs || []);

    for (const idCategoria of this.config.categorias) {
      // Quais partes desta categoria foram marcadas? Nenhuma = a categoria toda.
      const daCategoria = [...subsEscolhidas]
        .filter((s) => s.startsWith(idCategoria + ':'))
        .map((s) => s.slice(idCategoria.length + 1));
      const filtrar = daCategoria.length > 0;

      for (const pergunta of QUESTOES[idCategoria] || []) {
        if (filtrar && !daCategoria.includes(pergunta.sub)) continue;
        todas.push({ ...pergunta, categoria: idCategoria });
      }
    }

    this.fila = embaralhar(todas);
  }

  /**
   * Tira a próxima pergunta da fila pulando as que repetem uma resposta já
   * dada nesta partida.
   *
   * Resposta puramente numérica escapa da regra: "quanto e 6x5" e "quanto e
   * 27+3" dão 30, e ninguém sente isso como repetição — são contas diferentes.
   */
  sacarDaFila() {
    if (this.fila.length === 0) this.montarFila();

    const puladas = [];
    while (this.fila.length > 0) {
      const bruta = this.fila.shift();
      const chave = normalizar(bruta.resposta || '');

      if (/^[0-9]+$/.test(chave) || !this.respostasUsadas.has(chave)) {
        // As puladas voltam para o fim: podem servir numa partida seguinte.
        if (puladas.length) this.fila.push(...puladas);
        this.respostasUsadas.add(chave);
        return bruta;
      }
      puladas.push(bruta);
    }

    // Sobrou só repetição — a partida é mais longa que o baralho escolhido.
    // Recomeça uma passagem em vez de ficar sem pergunta.
    this.respostasUsadas.clear();
    this.fila = embaralhar(puladas);
    if (this.fila.length === 0) this.montarFila();
    const bruta = this.fila.shift();
    this.respostasUsadas.add(normalizar(bruta.resposta || ''));
    return bruta;
  }

  /** Uma pergunta comum: uma resposta só. */
  perguntaSimples() {
    const bruta = this.sacarDaFila();
    const id = dificuldade.idDe(bruta.categoria, bruta.pergunta, bruta.resposta);
    const difBase = bruta.dif ?? 40;

    return {
      id,
      pergunta: bruta.pergunta,
      imagem: bruta.imagem || null,
      audio: bruta.audio || null,
      // Aceita string ou lista; para a tela vai sempre lista de linhas.
      letra: bruta.letra
        ? (Array.isArray(bruta.letra) ? bruta.letra : [bruta.letra])
        : null,
      resposta: bruta.resposta,
      aceita: bruta.aceita || [],
      itens: [{ oficial: bruta.resposta, variantes: bruta.aceita || [] }],
      necessarias: 1,
      fixo: true,
      categoria: CATEGORIAS.find((c) => c.id === bruta.categoria),
      difBase,
      dificuldade: dificuldade.dificuldadeDe(id, difBase)
    };
  }

  /**
   * Modo Escalada: a rodada N pede N respostas.
   * A rodada 1 é uma pergunta comum; da 2 em diante vem uma lista.
   */
  perguntaEscalada(necessarias) {
    if (necessarias <= 1) return this.perguntaSimples();

    const candidatas = paraRodada(necessarias, this.ultimoTema);
    // Sem lista do tamanho certo (rodadas muito altas), a escalada trava no
    // maior tamanho disponível em vez de quebrar a partida.
    if (candidatas.length === 0) {
      for (let n = necessarias - 1; n >= 2; n--) {
        const menores = paraRodada(n, this.ultimoTema);
        if (menores.length) return this.montarListaEscalada(menores, n);
      }
      return this.perguntaSimples();
    }

    return this.montarListaEscalada(candidatas, necessarias);
  }

  montarListaEscalada(candidatas, necessarias) {
    // Tira do bolo as listas que já caíram nesta partida. Se não sobrar nada,
    // repetir é melhor do que travar a rodada.
    const novas = candidatas.filter((l) => !this.listasUsadas.has(l.pergunta));
    const bolo = novas.length ? novas : candidatas;

    const lista = bolo[Math.floor(Math.random() * bolo.length)];
    this.listasUsadas.add(lista.pergunta);
    const enunciado = lista.pergunta.replace('{n}', String(necessarias));
    this.ultimoTema = lista.tema || null;
    const id = dificuldade.idDe('escalada', enunciado, String(necessarias));
    const difBase = lista.dif ?? 45;

    return {
      id,
      pergunta: enunciado,
      imagem: null,
      letra: null,
      audio: null,
      resposta: null,
      aceita: [],
      itens: lista.respostas.map(itemDe),
      necessarias,
      fixo: Boolean(lista.fixo),
      categoria: { id: 'escalada', nome: `${necessarias} respostas`, icone: '🧗', cor: '#f59e0b' },
      difBase,
      dificuldade: dificuldade.dificuldadeDe(id, difBase)
    };
  }

  /**
   * Quantas voltas o carrossel dá nesta rodada.
   * Rodadas 1-2 uma volta, 3-4 duas, 5-6 três, e assim por diante.
   */
  voltasDaRodada(rodada) {
    return Math.min(MAX_VOLTAS, Math.floor((rodada - 1) / RODADAS_POR_VOLTA) + 1);
  }

  /**
   * Carrossel: precisa de uma lista grande o bastante para todo mundo
   * responder em todas as voltas — 4 pessoas em 3 voltas pedem 12 respostas.
   */
  perguntaCarrossel(rodada) {
    const voltas = this.voltasDaRodada(rodada);
    const precisa = Math.max(2, this.jogadores.size * voltas);

    let candidatas = paraRodada(precisa, this.ultimoTema);
    let tamanho = precisa;
    // Sem lista tão grande, encolhe o pedido em vez de quebrar a rodada.
    for (let n = precisa - 1; candidatas.length === 0 && n >= 2; n--) {
      candidatas = paraRodada(n, this.ultimoTema);
      tamanho = n;
    }
    if (candidatas.length === 0) return this.perguntaSimples();

    const pergunta = this.montarListaEscalada(candidatas, tamanho);

    // O número no enunciado é o total da rodada inteira, não o que cabe a
    // cada um. "Cite 14 frutas" fazia parecer que a pessoa tinha que lembrar
    // catorze na sua vez, quando o que ela deve é uma.
    pergunta.pergunta = pergunta.pergunta.replace(/^Cite \d+ /, 'Cite ');

    // No carrossel ninguém precisa completar a lista sozinho: o que vale é
    // ter uma resposta na sua vez.
    pergunta.categoria = { id: 'carrossel', nome: `${voltas} volta${voltas > 1 ? 's' : ''}`, icone: '🎠', cor: '#f59e0b' };
    return pergunta;
  }

  /**
   * Presente Grego: uma lista grande e sem número no enunciado.
   *
   * Quantas respostas a rodada pede é justamente o que o leilão decide, então
   * "Cite 15 paises da Africa" vira "Cite paises da Africa".
   */
  perguntaPresente() {
    const semFixas = (lista) => !lista.fixo;
    let candidatas = paraRodada(MIN_ITENS_PRESENTE, this.ultimoTema).filter(semFixas);
    if (candidatas.length === 0) candidatas = paraRodada(MIN_ITENS_PRESENTE).filter(semFixas);
    if (candidatas.length === 0) return this.perguntaSimples();

    const pergunta = this.montarListaEscalada(candidatas, MIN_ITENS_PRESENTE);
    pergunta.pergunta = pergunta.pergunta.replace(/^Cite \d+ /, 'Cite ');
    pergunta.categoria = { id: 'presente-grego', nome: 'Leilao', icone: '🎁', cor: '#f59e0b' };
    return pergunta;
  }

  /** Monta a fila de vezes do carrossel para a rodada que vai começar. */
  prepararCarrossel() {
    const ids = [...this.jogadores.keys()];
    // A cada rodada o começo anda um lugar, senão o primeiro joga sempre com
    // a lista inteira livre e o último sempre com as sobras.
    const giro = (this.rodada - 1) % Math.max(1, ids.length);
    this.ordem = ids.slice(giro).concat(ids.slice(0, giro));
    this.vivos = new Set(this.ordem);
    this.vez = 0;
    this.voltasAlvo = this.voltasDaRodada(this.rodada);
    this.voltasFeitas = 0;
  }

  proximaRodada() {
    // Presente Grego sem duas duplas inteiras não tem leilão possível.
    if (this.ehPresenteGrego() && this.duplasAtivas().length < 2) {
      this.avisar('Nao sobraram duas duplas completas. Fim de jogo.', true);
      return this.terminar();
    }

    this.rodada += 1;

    if (this.ehPresenteGrego()) {
      this.perguntaAtual = this.perguntaPresente();
      this.prepararLeilao();
    } else if (this.ehCarrossel()) {
      this.perguntaAtual = this.perguntaCarrossel(this.rodada);
      this.prepararCarrossel();
    } else if (this.config.modo === 'escalada') {
      this.perguntaAtual = this.perguntaEscalada(this.rodada);
    } else {
      this.perguntaAtual = this.perguntaSimples();
    }

    const categoria = this.perguntaAtual.categoria;

    this.acertos = new Map();
    this.progresso = new Map();
    this.itensUsados = new Set();
    this.pontosRodada = new Map();
    this.primeiroAcertoEm = null;
    this.estado = 'categoria';

    this.emitir('rodada:categoria', {
      rodada: this.rodada,
      categoria,
      duracaoMs: MS_REVELACAO,
      placar: this.placar()
    });

    this.agendar(() => this.mostrarPergunta(), MS_REVELACAO);
  }

  /** Quanto tempo a rodada atual fica no ar. */
  duracaoDaRodada() {
    const base = this.config.segundosPorPergunta * 1000;
    const extras = Math.max(0, (this.perguntaAtual.necessarias || 1) - 1);

    // No Presente Grego é uma pessoa só digitando a lista inteira, sem ajuda
    // de ninguém: cada resposta pedida vale mais tempo que na Escalada.
    if (this.ehPresenteGrego()) {
      return Math.min(base + extras * MS_POR_ITEM_PRESENTE, MS_TETO_PRESENTE);
    }
    return Math.min(base + extras * MS_POR_RESPOSTA_EXTRA, MS_TETO_RODADA);
  }

  mostrarPergunta() {
    // No Presente Grego a pergunta não abre a rodada: primeiro vem o leilão, e
    // só quem leiloa enxerga o enunciado.
    if (this.ehPresenteGrego() && this.estado === 'categoria') return this.iniciarLeilao();

    this.estado = 'pergunta';
    this.inicioPergunta = Date.now();
    this.jogadoresNaRodada = this.jogadores.size;

    const duracaoMs = this.duracaoDaRodada();

    this.emitir('rodada:pergunta', {
      rodada: this.rodada,
      categoria: this.perguntaAtual.categoria,
      pergunta: this.perguntaAtual.pergunta,
      imagem: this.perguntaAtual.imagem,
      audio: this.perguntaAtual.audio,
      letra: this.perguntaAtual.letra,
      necessarias: this.perguntaAtual.necessarias,
      // A resposta NUNCA vai junto — o servidor é quem confere.
      // Vai só o formato dela: "Johnny Depp" vira "•••••• ••••".
      // Em lista com várias respostas não há máscara: entregaria demais.
      mascara: this.perguntaAtual.necessarias === 1 && this.perguntaAtual.resposta
        ? this.perguntaAtual.resposta.replace(/[\p{L}\p{N}]/gu, '•')
        : null,
      duracaoMs: this.ehCarrossel() ? null : duracaoMs,
      carrossel: this.ehCarrossel()
        ? { voltas: this.voltasAlvo, msPorVez: MS_POR_VEZ, ordem: this.ordem, visivel: this.mostraDitos() }
        : null,
      // Presente Grego: agora a pergunta é pública, mas só uma pessoa responde
      // — e a mesa inteira sabe quanto ela prometeu entregar.
      presente: this.ehPresenteGrego() && this.leilao
        ? {
            aposta: this.leilao.aposta,
            respondedor: this.leilao.respondedor,
            duplaAposta: this.leilao.duplaAposta,
            duplaDuvidou: this.leilao.duplaDuvidou
          }
        : null
    });

    // No carrossel não há relógio único de rodada: o tempo é de cada vez.
    if (this.ehCarrossel()) this.iniciarVez();
    else this.agendar(() => this.encerrarRodada(), duracaoMs);
  }

  /* ---------------------- Leilão (Presente Grego) ---------------------- */

  /** Zera o leilão da rodada e decide qual dupla abre. */
  prepararLeilao() {
    const ativas = this.duplasAtivas();
    // Abrir o leilão é desvantagem — o primeiro lance é o mais barato de
    // cobrir —, então a vez de começar gira a cada rodada.
    const giro = (this.rodada - 1) % Math.max(1, ativas.length);
    const ordem = ativas.slice(giro).concat(ativas.slice(0, giro));

    this.leilao = {
      duplas: ordem.map((d) => d.id),
      vez: 0,
      aposta: 0,            // maior lance na mesa
      duplaAposta: null,    // de quem é esse lance
      quemApostou: null,
      duplaDuvidou: null,   // quem chamou o blefe
      quemDuvidou: null,
      respondedor: null,    // quem vai ter que entregar
      // O "duvido" fecha o leilão na hora, mas a pergunta só abre alguns
      // segundos depois. Sem esta trava, um lance atrasado entrava nessa
      // brecha e trocava quem tinha sido desafiado.
      fechado: false,
      historico: [],
      conseguiu: false,
      ditas: 0,
      premio: 0
    };
  }

  /** Abre o leilão: a pergunta vai só para quem vai leiloar. */
  iniciarLeilao() {
    this.estado = 'leilao';

    this.emitir('leilao:comeco', {
      rodada: this.rodada,
      msPorLance: MS_POR_LANCE,
      maxAposta: MAX_APOSTA,
      pontosPorAposta: PONTOS_POR_APOSTA,
      duplas: this.leilao.duplas.map((id) => this.duplaPublica(this.duplaPorId(id)))
    });

    // O enunciado sai daqui um por um, e não pelo evento da sala: se fosse
    // junto, quem vai responder leria a pergunta antes de o leilão acabar.
    for (const id of this.leilao.duplas) {
      const leiloeiro = this.leiloeiroDe(this.duplaPorId(id));
      if (leiloeiro) {
        this.emitirPara(leiloeiro, 'leilao:pergunta', { pergunta: this.perguntaAtual.pergunta });
      }
    }

    this.avisar('Leilao aberto! Quem esta leiloando ja viu a pergunta.');
    this.abrirLance();
  }

  /** Retrato de uma dupla para a tela, com os papéis desta rodada. */
  duplaPublica(dupla) {
    if (!dupla) return null;
    const cracha = (id) => {
      const j = this.jogadores.get(id);
      return j ? { id: j.id, nickname: j.nickname, avatar: j.avatar } : null;
    };
    return {
      id: dupla.id,
      nome: dupla.nome,
      icone: dupla.icone,
      cor: dupla.cor,
      leiloeiro: cracha(this.leiloeiroDe(dupla)),
      respondedor: cracha(this.respondedorDe(dupla))
    };
  }

  /**
   * O leilão ainda aceita lance?
   *
   * Entre o "duvido" e a pergunta aparecer passam alguns segundos de tela, e
   * nessa janela a sala continua no estado `leilao` — mas o leilão acabou.
   */
  leilaoAberto() {
    return this.estado === 'leilao' && Boolean(this.leilao) && !this.leilao.fechado;
  }

  /** Passa a palavra para a dupla da vez e liga o relógio do lance. */
  abrirLance() {
    if (!this.leilaoAberto()) return;

    const dupla = this.duplaPorId(this.leilao.duplas[this.leilao.vez]);
    const quem = this.leiloeiroDe(dupla);
    if (!dupla || !quem) return this.cancelarRodada('uma dupla se desfez no meio do leilao');

    this.emitir('leilao:vez', {
      duplaId: dupla.id,
      jogadorId: quem,
      aposta: this.leilao.aposta,
      minimo: this.leilao.aposta + 1,
      // Ninguém duvida do nada, nem do próprio lance.
      podeDuvidar: this.leilao.aposta > 0 && this.leilao.duplaAposta !== dupla.id,
      msPorLance: MS_POR_LANCE
    });

    clearTimeout(this.temporizadorVez);
    this.temporizadorVez = setTimeout(() => this.lanceNoTempo(dupla.id), MS_POR_LANCE);
  }

  /** O relógio do lance zerou sem ninguém dizer nada. */
  lanceNoTempo(duplaId) {
    if (!this.leilaoAberto()) return;
    const dupla = this.duplaPorId(duplaId);
    const quem = this.leiloeiroDe(dupla);
    if (!quem) return this.cancelarRodada('uma dupla se desfez no meio do leilao');

    if (this.leilao.aposta > 0 && this.leilao.duplaAposta !== duplaId) {
      this.avisar('Tempo! Ninguem cobriu o lance.');
      return this.fecharLeilao(quem, duplaId);
    }

    // Quem abre é obrigado a apostar: sem lance na mesa não há o que duvidar.
    this.avisar('Tempo! O leilao abriu no lance minimo.');
    this.registrarLance(quem, duplaId, this.leilao.aposta + 1);
  }

  /**
   * Um lance novo: a aposta é de quantas respostas o PARCEIRO consegue dizer.
   * Vale qualquer número, desde que maior que o lance que estava na mesa.
   */
  apostar(socketId, valor) {
    if (!this.leilaoAberto()) return { erro: 'O leilao nao esta aberto.' };

    const dupla = this.duplaPorId(this.leilao.duplas[this.leilao.vez]);
    if (!dupla || this.leiloeiroDe(dupla) !== socketId) return { erro: 'Nao e a sua vez no leilao.' };

    const aposta = Number(valor);
    if (!Number.isInteger(aposta)) return { erro: 'A aposta e um numero inteiro.' };
    if (aposta <= this.leilao.aposta) {
      return { erro: `A aposta precisa ser maior que ${this.leilao.aposta}.` };
    }
    if (aposta > MAX_APOSTA) return { erro: `O teto do leilao e ${MAX_APOSTA}.` };

    this.registrarLance(socketId, dupla.id, aposta);
    return { ok: true, aposta };
  }

  registrarLance(socketId, duplaId, aposta) {
    clearTimeout(this.temporizadorVez);

    this.leilao.aposta = aposta;
    this.leilao.duplaAposta = duplaId;
    this.leilao.quemApostou = socketId;
    this.leilao.historico.push({ duplaId, jogadorId: socketId, aposta });

    const jogador = this.jogadores.get(socketId);
    const dupla = this.duplaPorId(duplaId);
    const parceiro = this.jogadores.get(this.respondedorDe(dupla));

    this.emitir('leilao:lance', {
      duplaId,
      jogadorId: socketId,
      nickname: jogador ? jogador.nickname : '',
      aposta,
      historico: this.leilao.historico
    });
    this.avisar(`${jogador ? jogador.nickname : 'Alguem'} apostou que ${
      parceiro ? parceiro.nickname : 'o parceiro'} diz ${aposta}.`);

    this.avancarLance();
  }

  /** "Duvido": encerra o leilão e cobra o último lance. */
  duvidar(socketId) {
    if (!this.leilaoAberto()) return { erro: 'O leilao nao esta aberto.' };

    const dupla = this.duplaPorId(this.leilao.duplas[this.leilao.vez]);
    if (!dupla || this.leiloeiroDe(dupla) !== socketId) return { erro: 'Nao e a sua vez no leilao.' };
    if (this.leilao.aposta <= 0) return { erro: 'Ainda nao ha lance para duvidar. Abra o leilao.' };
    if (this.leilao.duplaAposta === dupla.id) return { erro: 'Voce nao duvida do proprio lance.' };

    this.fecharLeilao(socketId, dupla.id);
    return { ok: true };
  }

  /** Passa a palavra para a próxima dupla que ainda esteja inteira. */
  avancarLance() {
    clearTimeout(this.temporizadorVez);
    if (!this.leilaoAberto()) return;

    for (let passo = 0; passo < this.leilao.duplas.length; passo++) {
      this.leilao.vez = (this.leilao.vez + 1) % this.leilao.duplas.length;
      if (this.leiloeiroDe(this.duplaPorId(this.leilao.duplas[this.leilao.vez]))) {
        this.agendar(() => this.abrirLance(), MS_ENTRE_LANCES);
        return;
      }
    }

    this.cancelarRodada('as duplas se desfizeram no meio do leilao');
  }

  /**
   * Fecha o leilão. Quem fez o último lance entrega o presente: o parceiro
   * dele é quem vai ter que dizer as respostas prometidas.
   */
  fecharLeilao(quemDuvidou, duplaDuvidou) {
    this.limparTemporizador();
    this.leilao.fechado = true;

    const desafiada = this.duplaPorId(this.leilao.duplaAposta);
    const respondedor = this.respondedorDe(desafiada);
    if (!respondedor) return this.cancelarRodada('a dupla do maior lance se desfez');

    this.leilao.quemDuvidou = quemDuvidou;
    this.leilao.duplaDuvidou = duplaDuvidou;
    this.leilao.respondedor = respondedor;
    // A rodada passa a pedir exatamente o que foi prometido.
    this.perguntaAtual.necessarias = this.leilao.aposta;

    const duvidoso = this.jogadores.get(quemDuvidou);
    const vitima = this.jogadores.get(respondedor);

    this.emitir('leilao:fim', {
      aposta: this.leilao.aposta,
      duplaAposta: this.leilao.duplaAposta,
      duplaDuvidou,
      quemDuvidou,
      nicknameDuvidou: duvidoso ? duvidoso.nickname : '',
      respondedor,
      nicknameRespondedor: vitima ? vitima.nickname : '',
      duracaoMs: MS_APOS_LEILAO
    });
    this.avisar(`${duvidoso ? duvidoso.nickname : 'Alguem'} duvidou! ${
      vitima ? vitima.nickname : 'O parceiro'} tem que dizer ${this.leilao.aposta}.`, true);

    // Agora a pergunta pode ser pública: a mesa inteira assiste à entrega.
    // O desvio do `mostrarPergunta` só vale saindo da tela de categoria, então
    // aqui ele segue o caminho normal.
    this.agendar(() => this.mostrarPergunta(), MS_APOS_LEILAO);
  }

  ehCarrossel() {
    return this.config.modo === 'carrossel' || this.config.modo === 'carrossel-cego';
  }

  /** So o carrossel visivel manda a lista do que ja foi respondido. */
  mostraDitos() {
    return this.config.modo === 'carrossel';
  }

  /** Abre a vez de quem está na posição atual e liga o relógio dos 7s. */
  iniciarVez() {
    if (this.estado !== 'pergunta') return;

    const jogadorId = this.ordem[this.vez];
    this.inicioVez = Date.now();

    this.emitir('carrossel:vez', {
      jogadorId,
      volta: this.voltasFeitas + 1,
      voltas: this.voltasAlvo,
      msPorVez: MS_POR_VEZ,
      vivos: [...this.vivos],
      ordem: this.ordem,
      // O que já foi dito vai junto: sem essa lista à vista ninguém sabe o
      // que ainda vale, e repetir elimina.
      ditos: this.mostraDitos()
        ? [...this.itensUsados].map((i) => this.perguntaAtual.itens[i].oficial)
        : null
    });

    clearTimeout(this.temporizadorVez);
    this.temporizadorVez = setTimeout(() => {
      // O tempo dessa pessoa acabou sem resposta.
      this.eliminar(jogadorId, 'tempo');
    }, MS_POR_VEZ);
  }

  /**
   * Tira alguém da rodada e segue o carrossel.
   * `motivo`: 'tempo' (não respondeu a tempo) ou 'errou'.
   */
  eliminar(jogadorId, motivo) {
    if (this.estado !== 'pergunta' || !this.vivos.has(jogadorId)) return;
    clearTimeout(this.temporizadorVez);

    this.vivos.delete(jogadorId);
    const jogador = this.jogadores.get(jogadorId);

    this.emitir('carrossel:eliminado', {
      jogadorId,
      nickname: jogador ? jogador.nickname : '',
      motivo,
      vivos: [...this.vivos]
    });
    this.avisar(motivo === 'tempo'
      ? `${jogador ? jogador.nickname : 'Alguem'} nao respondeu a tempo e saiu da rodada.`
      : `${jogador ? jogador.nickname : 'Alguem'} errou e saiu da rodada.`);

    this.avancarVez();
  }

  /**
   * Passa a vez para o próximo que ainda está na rodada. Fecha a rodada
   * quando as voltas terminam ou quando sobra no máximo uma pessoa.
   */
  avancarVez() {
    clearTimeout(this.temporizadorVez);
    if (this.estado !== 'pergunta') return;

    if (this.vivos.size <= 1) {
      this.agendar(() => this.encerrarRodada(), MS_ENTRE_VEZES);
      return;
    }

    // Anda até achar alguém vivo, contando uma volta a cada retorno ao topo.
    for (let passo = 0; passo < this.ordem.length + 1; passo++) {
      this.vez += 1;
      if (this.vez >= this.ordem.length) {
        this.vez = 0;
        this.voltasFeitas += 1;
        if (this.voltasFeitas >= this.voltasAlvo) {
          this.agendar(() => this.encerrarRodada(), MS_ENTRE_VEZES);
          return;
        }
      }
      if (this.vivos.has(this.ordem[this.vez])) {
        this.agendar(() => this.iniciarVez(), MS_ENTRE_VEZES);
        return;
      }
    }

    this.agendar(() => this.encerrarRodada(), MS_ENTRE_VEZES);
  }

  /**
   * Toda mensagem digitada passa por aqui: pode ser um acerto, um "quase" ou
   * uma mensagem de chat comum.
   */
  palpitar(socketId, texto) {
    const jogador = this.jogadores.get(socketId);
    if (!jogador) return { erro: 'Voce nao esta nesta sala.' };

    const limpo = String(texto || '').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXTO);
    if (!limpo) return { erro: 'Escreva alguma coisa.' };

    const agora = Date.now();
    if (agora - jogador.ultimaMensagem < INTERVALO_MENSAGENS) {
      return { erro: 'Devagar! Espere um instante.' };
    }
    jogador.ultimaMensagem = agora;

    // Presente Grego: durante o leilão o chat fica fechado para todo mundo.
    // Quem está leiloando já leu a pergunta, e uma frase solta entregaria o
    // assunto para quem vai ter que responder.
    if (this.estado === 'leilao') {
      return { erro: 'O leilao esta rolando. O chat volta quando ele acabar.' };
    }

    // Fora de rodada (saguão, resultado, fim) é chat puro.
    const rodadaViva = this.perguntaAtual && (this.estado === 'pergunta' || this.estado === 'categoria');
    if (!rodadaViva) {
      this.publicarChat(jogador, limpo);
      return { veredito: 'chat' };
    }

    // Presente Grego: quem responde é só quem foi desafiado. Se os outros
    // pudessem escrever, o parceiro soprava a lista inteira.
    if (this.ehPresenteGrego() && this.estado === 'pergunta') {
      if (!this.leilao || socketId !== this.leilao.respondedor) {
        return { erro: 'So quem foi desafiado responde esta rodada.' };
      }
    }

    // Carrossel: enquanto a pergunta está no ar, só quem está na vez escreve.
    // O chat fica trancado para os outros — uma mensagem de quem não é da vez
    // entregaria a resposta de graça.
    if (this.ehCarrossel() && this.estado === 'pergunta') {
      if (!this.vivos.has(socketId)) {
        return { erro: 'Voce ja saiu desta rodada.' };
      }
      if (this.ordem[this.vez] !== socketId) {
        return { erro: 'Espere a sua vez.' };
      }
    }

    // Mede o palpite contra cada item que a pergunta aceita. No Modo Tempo há
    // um item só; na Escalada há vários e cada um conta uma vez.
    // No Carrossel a lista do que já foi dito é de todos: o que um respondeu
    // não serve para o próximo.
    const jaTenho = this.ehCarrossel()
      ? this.itensUsados
      : (this.progresso.get(socketId) || new Set());
    let novoItem = -1;
    let repetido = -1;
    let perto = false;
    // Do "quase" mais perto sai a dica: a grafia que a pessoa quase acertou.
    let quaseAlvo = null;
    let quaseErro = Infinity;

    // Varre a lista toda de propósito, sem parar no primeiro item livre: se o
    // palpite também bate num item que a pessoa já tem, vale como repetido.
    // Parando cedo, "Charlie Brown Jr" e "Charlie Brown Junior" marcavam dois
    // itens diferentes e a mesma resposta pontuava duas vezes.
    for (let i = 0; i < this.perguntaAtual.itens.length; i++) {
      const item = this.perguntaAtual.itens[i];
      const r = avaliar(limpo, item.oficial, item.variantes);

      if (r.veredito === 'certo') {
        if (jaTenho.has(i)) repetido = i;
        else if (novoItem < 0) novoItem = i;
      } else if (r.veredito === 'quase') {
        perto = true;
        if (r.erro < quaseErro) {
          quaseErro = r.erro;
          quaseAlvo = r.alvo;
        }
      }
    }
    if (repetido >= 0) novoItem = -1;

    // Carrossel: a vez se resolve aqui. Acertou, passa adiante; errou ou
    // repetiu o que já foi dito, sai da rodada. "Quase" é só um aviso, e
    // sobra tempo dos 7s para tentar de novo.
    if (this.ehCarrossel() && this.estado === 'pergunta') {
      if (novoItem >= 0) return this.acertoNoCarrossel(socketId, jogador, novoItem);
      if (perto) return { veredito: 'quase', dica: mascaraDeAcerto(limpo, quaseAlvo) };

      const item = repetido >= 0 ? this.perguntaAtual.itens[repetido].oficial : null;
      this.publicarChat(jogador, limpo);
      this.eliminar(socketId, 'errou');
      return { veredito: 'eliminado', motivo: 'errou', repetido: item };
    }

    // Presente Grego: aqui errar não elimina — só queima o relógio, que já é o
    // castigo. Cada acerto é público, porque a mesa inteira está torcendo.
    if (this.ehPresenteGrego() && this.estado === 'pergunta') {
      if (novoItem >= 0) return this.acertoNoPresente(socketId, jogador, novoItem);
      if (perto) return { veredito: 'quase', dica: mascaraDeAcerto(limpo, quaseAlvo) };
      if (repetido >= 0) {
        return { veredito: 'repetido', item: this.perguntaAtual.itens[repetido].oficial };
      }
      this.publicarChat(jogador, limpo);
      return { veredito: 'chat' };
    }

    // Longe de tudo: é conversa, vai para todo mundo.
    if (novoItem < 0 && repetido < 0 && !perto) {
      this.publicarChat(jogador, limpo);
      return { veredito: 'chat' };
    }

    // Perto de alguma resposta, mas essa pessoa não pode mais pontuar (já
    // completou, ou a pergunta ainda nem apareceu): a mensagem morre aqui.
    if (this.estado !== 'pergunta' || this.acertos.has(socketId)) {
      return { veredito: 'bloqueado' };
    }

    if (novoItem < 0 && repetido >= 0) {
      return { veredito: 'repetido', item: this.perguntaAtual.itens[repetido].oficial };
    }

    // De 10% a 20% de erro: em vez de um "quase" seco, devolve o que ja bateu
    // — "c_ra" para quem escreveu "cera" com "cara" na frente. A mensagem
    // continua sendo so de quem escreveu.
    if (novoItem < 0) {
      return { veredito: 'quase', dica: mascaraDeAcerto(limpo, quaseAlvo) };
    }

    /* --- acertou um item --- */
    jaTenho.add(novoItem);
    this.progresso.set(socketId, jaTenho);

    const nomeItem = this.perguntaAtual.itens[novoItem].oficial;
    const necessarias = this.perguntaAtual.necessarias;

    // Ainda falta responder mais: confirma só para quem escreveu, para não
    // entregar o item aos outros.
    // Na Escalada cada item lembrado já pontua, mesmo sem fechar a lista.
    if (necessarias > 1) {
      jogador.pontos += PONTOS_POR_ITEM;
      this.pontosRodada.set(socketId, (this.pontosRodada.get(socketId) || 0) + PONTOS_POR_ITEM);
    }

    if (jaTenho.size < necessarias) {
      return {
        veredito: 'item', item: nomeItem, pontos: PONTOS_POR_ITEM,
        quantos: jaTenho.size, necessarias
      };
    }

    /* --- completou a rodada --- */
    const ms = agora - this.inicioPergunta;
    const posicao = this.acertos.size + 1;

    let pontos;
    let bonus = 0;

    if (necessarias > 1) {
      // Escalada: os itens já foram pagos a 2 cada; fechar a lista dá o bônus.
      bonus = BONUS_ESCALADA;
      jogador.pontos += bonus;
      this.pontosRodada.set(socketId, (this.pontosRodada.get(socketId) || 0) + bonus);
      pontos = this.pontosRodada.get(socketId);
    } else {
      // Modo Tempo: faixa de 5s menos quem acertou antes.
      pontos = calcularPontos(ms, posicao);
      jogador.pontos += pontos;
      this.pontosRodada.set(socketId, pontos);
    }

    if (this.primeiroAcertoEm === null) this.primeiroAcertoEm = agora;

    this.acertos.set(socketId, { ms, pontos, posicao, bonus });
    jogador.acertos += 1;

    this.emitir('chat:mensagem', {
      tipo: 'acerto',
      jogadorId: socketId,
      nickname: jogador.nickname,
      avatar: jogador.avatar,
      pontos,
      posicao,
      ms,
      necessarias
    });

    this.emitir('rodada:acertou', {
      jogadorId: socketId,
      totalAcertos: this.acertos.size,
      totalJogadores: this.jogadores.size,
      placar: this.placar()
    });

    if (this.todosAcertaram()) {
      this.agendar(() => this.encerrarRodada(), MS_APOS_ULTIMO);
    }

    return { veredito: 'certo', pontos, posicao, item: nomeItem, quantos: jaTenho.size, necessarias };
  }

  /**
   * Carrossel: alguém respondeu certo na sua vez. O item sai de circulação
   * para todo mundo, valem 2 pontos e a vez passa adiante.
   */
  acertoNoCarrossel(socketId, jogador, indice) {
    this.itensUsados.add(indice);

    const meus = this.progresso.get(socketId) || new Set();
    meus.add(indice);
    this.progresso.set(socketId, meus);

    jogador.pontos += PONTOS_POR_ITEM;
    this.pontosRodada.set(socketId, (this.pontosRodada.get(socketId) || 0) + PONTOS_POR_ITEM);

    const nomeItem = this.perguntaAtual.itens[indice].oficial;

    // Aqui o acerto é público de propósito: os outros precisam saber o que já
    // saiu para não repetir na vez deles.
    this.emitir('chat:mensagem', {
      tipo: 'acerto',
      jogadorId: socketId,
      nickname: jogador.nickname,
      avatar: jogador.avatar,
      pontos: PONTOS_POR_ITEM,
      texto: nomeItem
    });
    this.emitir('rodada:acertou', {
      jogadorId: socketId,
      totalAcertos: this.itensUsados.size,
      totalJogadores: this.jogadores.size,
      placar: this.placar()
    });

    this.avancarVez();
    return { veredito: 'item', item: nomeItem, pontos: PONTOS_POR_ITEM };
  }

  /**
   * Presente Grego: um item entregue. Ainda não vale ponto nenhum — no fim é
   * tudo ou nada, e quem leva é a dupla que apostou ou a que duvidou.
   */
  acertoNoPresente(socketId, jogador, indice) {
    const meus = this.progresso.get(socketId) || new Set();
    meus.add(indice);
    this.progresso.set(socketId, meus);
    this.itensUsados.add(indice);

    const nomeItem = this.perguntaAtual.itens[indice].oficial;
    const aposta = this.leilao.aposta;

    this.emitir('chat:mensagem', {
      tipo: 'acerto',
      jogadorId: socketId,
      nickname: jogador.nickname,
      avatar: jogador.avatar,
      pontos: 0,
      texto: nomeItem
    });
    this.emitir('presente:progresso', {
      jogadorId: socketId,
      item: nomeItem,
      quantos: meus.size,
      aposta
    });

    // Entregou o prometido: não faz sentido segurar o resto do relógio.
    if (meus.size >= aposta) this.agendar(() => this.encerrarRodada(), MS_APOS_ULTIMO);

    return { veredito: 'item', item: nomeItem, quantos: meus.size, necessarias: aposta };
  }

  publicarChat(jogador, texto) {
    this.emitir('chat:mensagem', {
      tipo: 'jogador',
      jogadorId: jogador.id,
      nickname: jogador.nickname,
      avatar: jogador.avatar,
      texto
    });
  }

  /** Aviso do sistema no chat (início de rodada, resposta revelada...). */
  avisar(texto, destaque = false) {
    this.emitir('chat:mensagem', { tipo: 'sistema', texto, destaque });
  }

  todosAcertaram() {
    return this.jogadores.size > 0 && this.acertos.size >= this.jogadores.size;
  }

  /**
   * Fecha a conta do Presente Grego: é tudo ou nada.
   *
   * Entregou o que foi prometido, a dupla que apostou leva; faltou um item que
   * seja, quem duvidou leva. Nos dois casos o prêmio é o tamanho da aposta —
   * por isso o lance alto é tentador e perigoso na mesma medida.
   */
  pagarPresente() {
    const leilao = this.leilao;
    if (!leilao || !leilao.respondedor) return;

    leilao.ditas = (this.progresso.get(leilao.respondedor) || new Set()).size;
    leilao.conseguiu = leilao.ditas >= leilao.aposta;
    leilao.premio = leilao.aposta * PONTOS_POR_APOSTA;

    const vencedora = this.duplaPorId(leilao.conseguiu ? leilao.duplaAposta : leilao.duplaDuvidou);
    if (!vencedora) return;

    for (const id of vencedora.jogadores) {
      const jogador = this.jogadores.get(id);
      if (!jogador) continue;
      jogador.pontos += leilao.premio;
      this.pontosRodada.set(id, (this.pontosRodada.get(id) || 0) + leilao.premio);
      this.acertos.set(id, { ms: null, pontos: leilao.premio, posicao: null, bonus: 0 });
    }

    const entregador = this.jogadores.get(leilao.respondedor);
    if (entregador && leilao.conseguiu) entregador.acertos += 1;
  }

  /** O que esta pessoa fez na rodada do Presente Grego, para o resultado. */
  papelNoPresente(socketId) {
    if (!this.ehPresenteGrego() || !this.leilao) return null;
    if (this.leilao.respondedor === socketId) return 'respondeu';
    if (this.leilao.quemApostou === socketId) return 'apostou';
    if (this.leilao.quemDuvidou === socketId) return 'duvidou';
    return null;
  }

  /** Como o leilão terminou, para a tela de resultado. */
  resumoDoPresente() {
    const l = this.leilao;
    if (!l) return null;
    return {
      aposta: l.aposta,
      ditas: l.ditas,
      premio: l.premio,
      conseguiu: l.conseguiu,
      respondedor: l.respondedor,
      duplaAposta: l.duplaAposta,
      duplaDuvidou: l.duplaDuvidou,
      duplaVencedora: l.conseguiu ? l.duplaAposta : l.duplaDuvidou,
      historico: l.historico,
      duplas: this.duplas.map((d) => ({ id: d.id, nome: d.nome, icone: d.icone, cor: d.cor }))
    };
  }

  /**
   * Rodada que não tem como continuar (alguém saiu no meio do leilão, uma
   * dupla se desfez). Ninguém pontua e a partida segue na rodada seguinte.
   */
  cancelarRodada(motivo) {
    if (this.estado !== 'leilao' && this.estado !== 'pergunta') return;
    this.limparTemporizador();
    this.estado = 'resultado';

    this.avisar(`Rodada cancelada: ${motivo}.`, true);
    this.emitir('rodada:resultado', {
      rodada: this.rodada,
      titulo: 'Rodada cancelada',
      resposta: motivo,
      listaCompleta: [],
      listaParcial: false,
      necessarias: 0,
      aceita: [],
      dificuldade: { valor: 0, nivel: 'sem conta', cor: '#6f6791' },
      detalhes: [],
      placar: this.placar(),
      duracaoMs: MS_RESULTADO,
      acabou: false
    });

    this.agendar(() => this.proximaRodada(), MS_RESULTADO);
  }

  encerrarRodada() {
    if (this.estado !== 'pergunta') return;
    this.limparTemporizador();

    if (this.ehPresenteGrego()) this.pagarPresente();

    // Carrossel: quem chegou vivo ao fim da rodada leva o bônus.
    if (this.ehCarrossel()) {
      for (const id of this.vivos) {
        const jogador = this.jogadores.get(id);
        if (!jogador) continue;
        jogador.pontos += BONUS_CARROSSEL;
        this.pontosRodada.set(id, (this.pontosRodada.get(id) || 0) + BONUS_CARROSSEL);
        this.acertos.set(id, { ms: null, pontos: this.pontosRodada.get(id), posicao: null, bonus: BONUS_CARROSSEL });
      }
    }

    // Se ninguém ficou de fora, a espera é mais curta.
    const msResultado = this.todosAcertaram() ? MS_RESULTADO_TODOS : MS_RESULTADO;
    this.estado = 'resultado';

    const tempos = [...this.acertos.values()].map((a) => a.ms);
    const participantes = Math.max(this.jogadoresNaRodada, this.acertos.size, 1);

    // A dificuldade sobe quando pouca gente acerta ou quando demoram muito.
    // No Presente Grego a rodada não mede a pergunta: responde uma pessoa só,
    // contra um alvo que ela nem escolheu. Registrar isso sujaria a
    // estatística da lista, então aqui a dificuldade é só lida.
    const novaDificuldade = this.ehPresenteGrego()
      ? dificuldade.dificuldadeDe(this.perguntaAtual.id, this.perguntaAtual.difBase)
      : dificuldade.registrar(this.perguntaAtual.id, this.perguntaAtual.difBase, {
          jogadores: participantes,
          tempos,
          duracaoMs: this.config.segundosPorPergunta * 1000
        });

    const pergunta = this.perguntaAtual;

    const detalhes = [...this.jogadores.values()].map((jogador) => {
      const acerto = this.acertos.get(jogador.id) || null;
      const meus = this.progresso.get(jogador.id) || new Set();
      return {
        jogadorId: jogador.id,
        nickname: jogador.nickname,
        avatar: jogador.avatar,
        acertou: Boolean(acerto),
        posicao: acerto ? acerto.posicao : null,
        ganhou: this.pontosRodada.get(jogador.id) || 0,
        bonus: acerto && acerto.bonus ? acerto.bonus : 0,
        ms: acerto ? acerto.ms : null,
        total: jogador.pontos,
        // Escalada: o que a pessoa conseguiu lembrar, mesmo sem completar.
        itens: [...meus].map((i) => pergunta.itens[i].oficial),
        necessarias: pergunta.necessarias,
        // Carrossel: quem sobreviveu à rodada e quem caiu no caminho.
        eliminado: this.ehCarrossel() ? !this.vivos.has(jogador.id) : false,
        // Presente Grego: de que dupla é e o que fez nesta rodada.
        dupla: this.ehPresenteGrego() ? (this.duplaDe(jogador.id) || {}).id || null : null,
        papel: this.papelNoPresente(jogador.id)
      };
    });

    detalhes.sort((a, b) => (a.posicao ?? Infinity) - (b.posicao ?? Infinity));

    const vencedores = [...this.jogadores.values()].filter((j) => j.pontos >= this.config.metaPontos);

    // Como revelar depende do tipo: uma resposta só, um conjunto fechado
    // ("os 8 campeoes do mundo") ou um repertório aberto ("paises da Africa").
    let textoResposta;
    let listaCompleta = [];

    if (this.ehPresenteGrego()) {
      const l = this.leilao;
      const entregador = this.jogadores.get(l.respondedor);
      const nome = entregador ? entregador.nickname : 'Quem foi desafiado';
      const dono = this.duplaPorId(l.conseguiu ? l.duplaAposta : l.duplaDuvidou);
      listaCompleta = embaralhar(
        pergunta.itens.filter((_, i) => !this.itensUsados.has(i)).map((i) => i.oficial)
      ).slice(0, 12);
      const quantas = `${l.aposta} ${l.aposta === 1 ? 'resposta' : 'respostas'}`;
      textoResposta = l.conseguiu
        ? `${nome} entregou ${quantas} — a ${dono ? dono.nome : 'dupla'} leva ${l.premio} pts`
        : `${nome} disse ${l.ditas} de ${l.aposta} — a ${dono ? dono.nome : 'dupla'} leva ${l.premio} pts por ter duvidado`;
    } else if (this.ehCarrossel()) {
      const sobraram = [...this.vivos].map((id) => this.jogadores.get(id)).filter(Boolean);
      listaCompleta = embaralhar(
        pergunta.itens.filter((_, i) => !this.itensUsados.has(i)).map((i) => i.oficial)
      ).slice(0, 12);
      const nomes = sobraram.map((j) => j.nickname).join(', ');
      textoResposta = sobraram.length
        ? `${sobraram.length > 1 ? 'sobraram' : 'sobrou'}: ${nomes}`
        : 'ninguem sobrou';
    } else if (pergunta.necessarias === 1 && pergunta.resposta) {
      textoResposta = pergunta.resposta;
    } else if (pergunta.fixo) {
      listaCompleta = pergunta.itens.map((i) => i.oficial);
      textoResposta = listaCompleta.join(', ');
    } else {
      listaCompleta = embaralhar(pergunta.itens.map((i) => i.oficial)).slice(0, 12);
      textoResposta = `qualquer ${pergunta.necessarias} de ${pergunta.itens.length} possiveis`;
    }

    this.avisar(this.ehPresenteGrego()
      ? `Fim do leilao: ${textoResposta}`
      : `A resposta era: ${textoResposta}`, true);

    this.emitir('rodada:resultado', {
      rodada: this.rodada,
      // O Presente Grego não tem "a resposta certa": tem uma aposta que saiu
      // ou não saiu.
      titulo: this.ehPresenteGrego() ? 'Fim do leilao' : 'Resposta certa',
      resposta: textoResposta,
      presente: this.ehPresenteGrego() ? this.resumoDoPresente() : null,
      listaCompleta,
      listaParcial: !pergunta.fixo && pergunta.necessarias > 1,
      necessarias: pergunta.necessarias,
      aceita: pergunta.aceita,
      dificuldade: {
        valor: Math.round(novaDificuldade),
        nivel: dificuldade.nivelDe(novaDificuldade).nome,
        cor: dificuldade.nivelDe(novaDificuldade).cor
      },
      detalhes,
      placar: this.placar(),
      duracaoMs: msResultado,
      acabou: vencedores.length > 0
    });

    this.agendar(() => {
      if (vencedores.length > 0) this.terminar();
      else this.proximaRodada();
    }, msResultado);
  }

  terminar() {
    this.estado = 'fim';
    this.limparTemporizador();
    this.perguntaAtual = null;
    this.emitir('jogo:fim', {
      placar: this.placar(),
      metaPontos: this.config.metaPontos,
      rodadas: this.rodada
    });
  }

  /** Volta ao saguão mantendo os jogadores, para uma nova partida. */
  voltarAoLobby() {
    this.limparTemporizador();
    this.estado = 'lobby';
    this.rodada = 0;
    this.perguntaAtual = null;
    this.acertos = new Map();
    this.progresso = new Map();
    this.itensUsados = new Set();
    this.pontosRodada = new Map();
    // As duplas são sorteadas de novo a cada partida.
    this.duplas = [];
    this.leilao = null;
    for (const jogador of this.jogadores.values()) {
      jogador.pontos = 0;
      jogador.acertos = 0;
    }
  }

  /* ------------------------------ Auxiliares ------------------------------ */

  placar() {
    return [...this.jogadores.values()]
      .map((j) => {
        const dupla = this.ehPresenteGrego() ? this.duplaDe(j.id) : null;
        return {
          id: j.id,
          nickname: j.nickname,
          avatar: j.avatar,
          pontos: j.pontos,
          acertos: j.acertos,
          lider: j.lider,
          // No Presente Grego os dois integrantes pontuam juntos, então o
          // placar precisa dizer quem é de quem.
          dupla: dupla ? dupla.id : null,
          duplaNome: dupla ? dupla.nome : null,
          duplaIcone: dupla ? dupla.icone : null
        };
      })
      .sort((a, b) => b.pontos - a.pontos || b.acertos - a.acertos || a.nickname.localeCompare(b.nickname));
  }

  estadoPublico() {
    return {
      codigo: this.codigo,
      estado: this.estado,
      config: this.config,
      rodada: this.rodada,
      jogadores: this.placar(),
      duplas: this.duplas.map((d) => ({
        id: d.id, nome: d.nome, icone: d.icone, cor: d.cor, jogadores: d.jogadores
      })),
      avataresLivres: this.avataresLivres()
    };
  }

  agendar(fn, ms) {
    this.limparTemporizador();
    this.temporizador = setTimeout(fn, ms);
  }

  limparTemporizador() {
    if (this.temporizador) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }
    if (this.temporizadorVez) {
      clearTimeout(this.temporizadorVez);
      this.temporizadorVez = null;
    }
  }

  destruir() {
    this.limparTemporizador();
    this.jogadores.clear();
  }
}

module.exports = {
  Sala, AVATARES, CATEGORIAS, MODOS, MAX_JOGADORES, MAX_TEXTO,
  gerarCodigo, calcularPontos, indicePerguntas
};
