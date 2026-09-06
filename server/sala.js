'use strict';

const { CATEGORIAS, QUESTOES } = require('./questions');
const { avaliar } = require('./comparar');
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
    id: 'sobrevivencia',
    nome: 'Sobrevivencia',
    icone: '💀',
    descricao: 'Errou, saiu. Em breve.',
    disponivel: false
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
   */
  constructor(codigo, config, emitir) {
    this.codigo = codigo;
    this.config = config;
    this.emitir = emitir;

    this.jogadores = new Map(); // socketId -> jogador
    this.estado = 'lobby';      // lobby | categoria | pergunta | resultado | fim
    this.criadaEm = Date.now();

    this.rodada = 0;
    this.perguntaAtual = null;
    this.inicioPergunta = null;
    this.primeiroAcertoEm = null;
    this.acertos = new Map();   // socketId -> { ms, pontos, posicao }
    this.progresso = new Map(); // Escalada: socketId -> Set(índices já ditos)
    this.pontosRodada = new Map(); // socketId -> pontos feitos nesta rodada
    this.ultimoTema = null;     // tema da rodada anterior, para não repetir
    this.jogadoresNaRodada = 0;

    this.fila = [];             // perguntas embaralhadas ainda não usadas
    this.temporizador = null;
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

    for (const jogador of this.jogadores.values()) {
      jogador.pontos = 0;
      jogador.acertos = 0;
    }

    this.rodada = 0;
    this.fila = [];
    this.montarFila();
    this.proximaRodada();
    return { ok: true };
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

  /** Uma pergunta comum: uma resposta só. */
  perguntaSimples() {
    if (this.fila.length === 0) this.montarFila(); // acabou o baralho, reembaralha

    const bruta = this.fila.shift();
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
    const lista = candidatas[Math.floor(Math.random() * candidatas.length)];
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

  proximaRodada() {
    this.rodada += 1;

    this.perguntaAtual = this.config.modo === 'escalada'
      ? this.perguntaEscalada(this.rodada)
      : this.perguntaSimples();

    const categoria = this.perguntaAtual.categoria;

    this.acertos = new Map();
    this.progresso = new Map();
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
    return Math.min(base + extras * MS_POR_RESPOSTA_EXTRA, MS_TETO_RODADA);
  }

  mostrarPergunta() {
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
      duracaoMs
    });

    this.agendar(() => this.encerrarRodada(), duracaoMs);
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

    // Fora de rodada (saguão, resultado, fim) é chat puro.
    const rodadaViva = this.perguntaAtual && (this.estado === 'pergunta' || this.estado === 'categoria');
    if (!rodadaViva) {
      this.publicarChat(jogador, limpo);
      return { veredito: 'chat' };
    }

    // Mede o palpite contra cada item que a pergunta aceita. No Modo Tempo há
    // um item só; na Escalada há vários e cada um conta uma vez.
    const jaTenho = this.progresso.get(socketId) || new Set();
    let novoItem = -1;
    let repetido = -1;
    let perto = false;

    for (let i = 0; i < this.perguntaAtual.itens.length; i++) {
      const item = this.perguntaAtual.itens[i];
      const r = avaliar(limpo, item.oficial, item.variantes);

      if (r.veredito === 'certo') {
        if (jaTenho.has(i)) repetido = i;
        else { novoItem = i; break; }
      } else if (r.veredito === 'quase') {
        perto = true;
      }
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

    // De 10% a 20% de erro: aviso particular, sem ir para o chat.
    if (novoItem < 0) {
      return { veredito: 'quase' };
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

  encerrarRodada() {
    if (this.estado !== 'pergunta') return;
    this.limparTemporizador();

    // Se ninguém ficou de fora, a espera é mais curta.
    const msResultado = this.todosAcertaram() ? MS_RESULTADO_TODOS : MS_RESULTADO;
    this.estado = 'resultado';

    const tempos = [...this.acertos.values()].map((a) => a.ms);
    const participantes = Math.max(this.jogadoresNaRodada, this.acertos.size, 1);

    // A dificuldade sobe quando pouca gente acerta ou quando demoram muito.
    const novaDificuldade = dificuldade.registrar(this.perguntaAtual.id, this.perguntaAtual.difBase, {
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
        necessarias: pergunta.necessarias
      };
    });

    detalhes.sort((a, b) => (a.posicao ?? Infinity) - (b.posicao ?? Infinity));

    const vencedores = [...this.jogadores.values()].filter((j) => j.pontos >= this.config.metaPontos);

    // Como revelar depende do tipo: uma resposta só, um conjunto fechado
    // ("os 8 campeoes do mundo") ou um repertório aberto ("paises da Africa").
    let textoResposta;
    let listaCompleta = [];

    if (pergunta.necessarias === 1 && pergunta.resposta) {
      textoResposta = pergunta.resposta;
    } else if (pergunta.fixo) {
      listaCompleta = pergunta.itens.map((i) => i.oficial);
      textoResposta = listaCompleta.join(', ');
    } else {
      listaCompleta = embaralhar(pergunta.itens.map((i) => i.oficial)).slice(0, 12);
      textoResposta = `qualquer ${pergunta.necessarias} de ${pergunta.itens.length} possiveis`;
    }

    this.avisar(`A resposta era: ${textoResposta}`, true);

    this.emitir('rodada:resultado', {
      rodada: this.rodada,
      resposta: textoResposta,
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
    this.pontosRodada = new Map();
    for (const jogador of this.jogadores.values()) {
      jogador.pontos = 0;
      jogador.acertos = 0;
    }
  }

  /* ------------------------------ Auxiliares ------------------------------ */

  placar() {
    return [...this.jogadores.values()]
      .map((j) => ({
        id: j.id,
        nickname: j.nickname,
        avatar: j.avatar,
        pontos: j.pontos,
        acertos: j.acertos,
        lider: j.lider
      }))
      .sort((a, b) => b.pontos - a.pontos || b.acertos - a.acertos || a.nickname.localeCompare(b.nickname));
  }

  estadoPublico() {
    return {
      codigo: this.codigo,
      estado: this.estado,
      config: this.config,
      rodada: this.rodada,
      jogadores: this.placar(),
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
