'use strict';

const { CATEGORIAS, QUESTOES } = require('./questions');
const { avaliar, normalizar, mascaraDeAcerto } = require('./comparar');
const { paraRodada, itemDe } = require('./escalada');
const { PALAVRAS } = require('./dicas');
const { RANKINGS } = require('./rankings');
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

// Pergunta simples (Modo Tempo e a rodada 1 dos outros): numa janela de 80%
// das categorias escolhidas nenhuma se repete. Com 10 categorias, quaisquer 8
// perguntas seguidas sao de 8 categorias diferentes.
const VARIACAO_CATEGORIAS = 0.8;

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

// Presente Grego: joga-se em equipes. Um integrante ve a pergunta e leiloa
// quantas respostas o PARCEIRO consegue dizer — e o parceiro so descobre a
// pergunta quando o leilao acaba. Dai o nome: o lance e um presente
// embrulhado que a outra metade da equipe tem que desembrulhar.
const MS_POR_LANCE = 6000;       // tempo de cada equipe para cobrir, duvidar ou passar
const MS_ENTRE_LANCES = 700;     // respiro entre um lance e o proximo
const MS_APOS_LEILAO = 3200;     // tela do "duvido" antes da pergunta aparecer
// A lista precisa de repertorio: com lista curta o lance esbarra no tamanho
// dela e a rodada vira conta de padaria em vez de conhecimento.
const MIN_ITENS_PRESENTE = 15;
const MAX_APOSTA = 60;           // teto so para barrar lance de brincadeira
const PONTOS_POR_APOSTA = 2;     // cada item apostado vale isto para a equipe
// Aqui uma pessoa so digita a lista inteira, entao cada resposta pedida pesa
// mais que na Escalada, onde todo mundo responde em paralelo.
const MS_BASE_LEILAO = 2000;       // relogio da entrega: 2s
const MS_POR_ITEM_PRESENTE = 4000; //  + 4s por resposta prometida
const MS_TETO_PRESENTE = 120000;

// Uma cara para cada equipe: com o teto de 12 jogadores dao 6 equipes.
const EQUIPES_VISUAL = [
  { icone: '🟣', cor: '#a78bfa' },
  { icone: '🟠', cor: '#fb923c' },
  { icone: '🟢', cor: '#34d399' },
  { icone: '🔵', cor: '#60a5fa' },
  { icone: '🔴', cor: '#f87171' },
  { icone: '🟡', cor: '#fbbf24' }
];

/**
 * O formato dos times: QUANTAS equipes e de que TAMANHO.
 *
 * A sala nasce no menor formato que da jogo — duas equipes de dois — e
 * cresce dali, sozinha enquanto a galera chega e na mao quando o lider mexe
 * nos botoes do saguao. Duas equipes de tres, tres de dois, tres de tres,
 * quatro de tres: o que couber em MAX_EQUIPES por MAX_TAMANHO_EQUIPE.
 *
 * Os limites: seis cores, entao seis equipes; e como uma equipe sozinha nao
 * disputa nada, o tamanho para onde duas equipes ja usam a sala inteira.
 */
/** As equipes da sala. Existem desde o comeco: quem entra ja cai numa. */
function criarEquipes(quantas) {
  return Array.from({ length: quantas }, (_, i) => ({
    id: `e${i + 1}`,
    nome: `Equipe ${i + 1}`,
    ...EQUIPES_VISUAL[i],
    // De quem comeca leiloando; dai em diante o papel gira a cada rodada.
    giro: 0,
    jogadores: []
  }));
}

// Dando dicas: leilao AO CONTRARIO, jogado em duplas. As duas metades de cada
// dupla tem papeis opostos — uma ve a palavra secreta e leiloa em quantas
// dicas faz a outra acertar. O lance DESCE: quem se compromete com menos
// palavras leva o leilao, e o resto passa. A rodada vale sempre o mesmo,
// tenha custado uma dica ou dez: o que se disputa e a rodada, nao a dica.
const MAX_DICAS = 10;              // teto do lance de abertura
const MS_BASE_DICAS = 15000;       // relogio da entrega: 15s
const MS_POR_DICA = 9000;          //  + 9s por dica prometida
const MS_TETO_DICAS = 105000;
const PONTOS_POR_RODADA_DICAS = 10; // o que a rodada paga, valha 1 dica ou 10
// Dica que carrega a resposta esta fora. Tres letras ja bastam para entregar
// (`sol` dentro de `solar`), e recusar uma dica boa custa menos do que deixar
// a palavra escapar.
const MIN_LETRAS_ENTREGA = 3;

/* Mais ou Menos Pontos: a mesma lista rende tres rodadas, uma resposta por
   pessoa em cada uma. O que ja foi dito continua fora nas rodadas seguintes. */
const VOLTAS_RANKING = 3;

/* 1 eh bom 2 ok 3 eh demais: uma palavra e tres dicas, da mais vaga para a mais obvia. */
const PONTOS_VENI = [10, 6, 3];  // quanto vale acertar em cada dica
const DICAS_POR_RODADA = 3;
const MS_FASE_VENI = 15000;      // cada dica abre uma janela de 15s para palpitar
const MS_REVELA_VENI = 5000;     // quanto tempo os palpites ficam na tela
// Sala congelada que volta a ter gente: um respiro antes da proxima rodada.
const MS_VOLTA_DA_SALA = 2500;
// Todo mundo travou antes do tempo: um respiro curto para a mesa ler "todo
// mundo ja palpitou" antes de as respostas abrirem de uma vez.
const MS_TODOS_TRAVARAM = 700;

const MAX_JOGADORES = 12;

const MIN_EQUIPES = 2;
const MAX_EQUIPES = EQUIPES_VISUAL.length;
const MIN_TAMANHO_EQUIPE = 2;   // uma pessoa leiloa, a outra responde
const MAX_TAMANHO_EQUIPE = Math.floor(MAX_JOGADORES / MIN_EQUIPES);
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
    descricao: 'O mesmo carrossel, mas sem a lista do que ja foi dito. Errar nao elimina: da para tentar de novo dentro dos 7s. Quem repetir uma resposta que ja saiu esta fora.',
    disponivel: true
  },
  {
    id: 'presente-grego',
    nome: 'Presente Grego',
    icone: '🎁',
    descricao: 'Em equipes. Um de cada equipe ve a pergunta e leiloa quantas respostas o PARCEIRO consegue dizer — e o parceiro so descobre a pergunta no fim. O lance sobe ate alguem duvidar; se a aposta nao sair, quem duvidou leva os pontos.',
    disponivel: true,
    equipes: true
  },
  {
    id: 'ranking',
    nome: 'Mais ou Menos Pontos',
    icone: '📈',
    descricao: 'Uma lista em ordem — os 100 paises mais populosos, as 100 maiores cidades do Brasil. A resposta vale a posicao dela na lista: o primeiro rende 1 ponto e o ultimo rende 100. Fora da lista, zero. Cada um responde uma vez por rodada, e a mesma lista rende tres rodadas — o que ja foi dito continua fora.',
    disponivel: true
  },
  {
    id: 'veni',
    nome: '1 eh bom 2 ok 3 eh demais',
    icone: '🥇',
    descricao: 'Uma palavra e tres dicas. Cada dica da 15 segundos para escrever um palpite, que fica escondido ate o tempo fechar — ai todos aparecem juntos. Quem acertou leva 10 pontos na primeira dica, 6 na segunda e 3 na terceira, igual para todos.',
    disponivel: true
  },
  {
    id: 'leilao-geral',
    nome: 'Leilao Geral',
    icone: '🔨',
    descricao: 'Cada um por si. Todo mundo ve a pergunta e aposta quantas respostas consegue dizer sozinho; quem nao cobrir o lance esta fora da rodada. Quem leva o leilao ganha 2 pontos por resposta que der — e se nao chegar no que prometeu, cada um dos outros leva a aposta.',
    disponivel: true
  },
  {
    id: 'dando-dicas',
    nome: 'Dando dicas',
    icone: '💡',
    descricao: 'Leilao ao contrario, em duplas. Uma metade de cada dupla ve a mesma palavra secreta e leiloa em quantas dicas faz a outra metade acertar — e cada dica e UMA palavra. O lance desce ate todos passarem; quem ficou tem que entregar. A rodada vale 10 pontos, custe 1 dica ou 10: se a palavra nao sair, os 10 vao para as outras duplas.',
    disponivel: true,
    equipes: true,
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

/**
 * Id de uma pergunta comum, para a estatistica de dificuldade.
 *
 * "Quem canta esta musica?" -> Justin Bieber vale para tres trechos, e "Que
 * filme e este?" -> Batman para tres imagens: o audio ou a imagem entra no id
 * para cada uma ter a sua estatistica. (No Render o disco zera a cada deploy,
 * entao trocar o id nao perde nada que ja estivesse aprendido la.)
 */
function idDaPergunta(categoria, q) {
  const midia = q.audio || q.imagem;
  const resposta = midia ? `${q.resposta}|${midia}` : q.resposta;
  return dificuldade.idDe(categoria, q.pergunta, resposta);
}

/**
 * A resposta serve de palavra secreta do Dando dicas?
 *
 * O alvo tem que ser explicavel em palavras soltas. `1969` e `42` nao sao: a
 * dica viraria charada de aritmetica. Frase comprida tambem nao — ninguem
 * arranca "Guerra dos Cem Anos entre Inglaterra e Franca" do parceiro.
 */
function serveDeAlvo(resposta) {
  const texto = String(resposta || '').trim();
  if (!texto) return false;
  if (!/[a-zA-ZÀ-ɏ]/.test(texto)) return false;   // numero puro, data, placar
  return texto.split(/\s+/).length <= 3 && normalizar(texto).length >= 3;
}

/** Índice de todas as perguntas, para o painel de dificuldades. */
function indicePerguntas() {
  const mapa = new Map();
  for (const categoria of CATEGORIAS) {
    for (const q of QUESTOES[categoria.id] || []) {
      mapa.set(idDaPergunta(categoria.id, q), {
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
    // Quem caiu, guardado pelo nickname: quem volta com o mesmo nome volta com
    // o que era dele. Uma queda de conexao nao devia custar a partida.
    this.desligados = new Map(); // nickname normalizado -> { pontos, acertos, ... }
    // Sala sem ninguem no meio da partida: os relogios param e ela espera.
    this.congelada = false;
    this.estado = 'lobby';      // lobby | categoria | leilao | pergunta | resultado | fim
    this.criadaEm = Date.now();
    // Desde quando a sala esta sem ninguem. Quem recolhe as abandonadas e a
    // varredura do `index.js`; ate la, ela espera quem caiu voltar.
    this.vaziaDesde = null;

    this.rodada = 0;
    this.perguntaAtual = null;
    this.inicioPergunta = null;
    this.primeiroAcertoEm = null;
    this.acertos = new Map();   // socketId -> { ms, pontos, posicao }
    this.progresso = new Map(); // Escalada: socketId -> Set(índices já ditos)
    this.itensUsados = new Set(); // Carrossel: itens ja ditos por QUALQUER um
    this.pontosRodada = new Map(); // socketId -> pontos feitos nesta rodada
    this.pulos = new Set();        // quem votou para pular a rodada atual
    this.errouRanking = new Set(); // Mais ou Menos Pontos: quem ja gastou a vez errando
    this.ultimoTema = null;     // tema da rodada anterior, para não repetir
    this.jogadoresNaRodada = 0;

    this.filas = new Map();     // categoria -> perguntas embaralhadas ainda não usadas
    this.ultimasCategorias = []; // de onde vieram as últimas perguntas, para variar
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

    // Presente Grego e Dando dicas: as equipes são montadas na sala e duram a
    // partida inteira; o leilão dura uma rodada. O formato (quantas e de que
    // tamanho) começa no mínimo e cresce com a sala.
    this.equipes = criarEquipes(MIN_EQUIPES);
    this.tamanhoEquipe = MIN_TAMANHO_EQUIPE;
    // O líder mexeu nos botões: a sala para de se arrumar sozinha.
    this.formatoAMao = false;
    // "Dupla 1" ou "Equipe 1" depende do modo e do tamanho, então o nome sai
    // daqui e não do `criarEquipes`.
    this.renomearEquipes();
    this.leilao = null;

    // Mais ou Menos Pontos: em qual das tres voltas desta lista a sala está,
    // e o que já foi dito nas voltas anteriores.
    this.voltaRanking = 0;
    this.itensJaDitos = new Set();

    // 1 eh bom 2 ok 3 eh demais: qual das tres dicas está na tela agora, e o palpite
    // fechado de cada um nesta janela — ninguem ve ate o tempo acabar.
    this.dicaAtual = 0;
    this.palpitesVeni = new Map();

    this.temporizador = null;
    this.temporizadorVez = null; // o relógio dos 7s corre à parte do da rodada
  }

  /* --------------------------- Jogadores ---------------------------- */

  /**
   * Entrar na sala — a qualquer momento, inclusive no meio da partida.
   *
   * O nickname e a identidade: quem cai e volta com o mesmo nome recupera os
   * pontos, os acertos, o icone e a equipe que eram dele. Internet caindo no
   * meio de uma partida e coisa demais para custar o jogo inteiro.
   */
  entrar(socketId, nickname) {
    if (this.jogadores.size >= MAX_JOGADORES) {
      return { erro: 'Esta sala ja esta cheia.' };
    }

    const chave = normalizar(nickname);
    const guardado = this.desligados.get(chave);
    // Nome ja em uso por quem esta na sala AGORA vira "Ana (2)"; nome de quem
    // caiu nao, porque e justamente a chave de volta.
    const emUso = new Set([...this.jogadores.values()].map((j) => normalizar(j.nickname)));

    let nomeFinal = guardado ? guardado.nickname : nickname;
    let sufixo = 2;
    while (emUso.has(normalizar(nomeFinal))) {
      nomeFinal = `${nickname} (${sufixo++})`;
    }

    const avataresUsados = new Set([...this.jogadores.values()].map((j) => j.avatar));
    const avatar = (guardado && !avataresUsados.has(guardado.avatar))
      ? guardado.avatar
      : (AVATARES.find((a) => !avataresUsados.has(a)) || AVATARES[0]);

    const jogador = {
      id: socketId,
      nickname: nomeFinal,
      avatar,
      pontos: guardado ? guardado.pontos : 0,
      acertos: guardado ? guardado.acertos : 0,
      lider: this.jogadores.size === 0,
      ultimaMensagem: 0
    };

    this.jogadores.set(socketId, jogador);
    this.desligados.delete(chave);

    // Fora de partida da para arrumar as equipes na hora. Com a rodada no ar
    // nao: mexer em quem esta numa equipe troca os papeis dela no meio do
    // leilao. Entao quem chega agora entra na proxima rodada.
    if (!this.rodadaNoAr()) {
      const antiga = guardado && this.equipePorId(guardado.equipe);
      if (antiga && antiga.jogadores.length < this.tamanhoEquipe) antiga.jogadores.push(socketId);
      else this.encaixarNaEquipe(socketId);
    }

    // A sala estava parada esperando alguem voltar.
    if (this.congelada) this.descongelar();

    return { jogador, voltou: Boolean(guardado) };
  }

  /**
   * A sala ficou sem ninguem no meio da partida.
   *
   * Em vez de deixar as rodadas correndo para uma plateia vazia, os relogios
   * param e a sala espera. Quem voltar reacende dela a partir da proxima
   * rodada, com o placar intacto.
   */
  congelar() {
    // Vale em qualquer fase da partida, nao so com a rodada no ar: sair
    // durante a tela de resultado deixava o temporizador da proxima rodada
    // correndo, e a sala seguia jogando para uma plateia vazia.
    if (this.congelada || !this.emPartida()) return;
    this.limparTemporizador();
    this.congelada = true;
  }

  descongelar() {
    if (!this.congelada) return;
    this.congelada = false;
    this.avisar('A sala voltou. Proxima rodada ja vem.', true);
    this.agendar(() => this.proximaRodada(), MS_VOLTA_DA_SALA);
  }

  sair(socketId) {
    const jogador = this.jogadores.get(socketId);
    if (!jogador) return null;

    // Guarda o que era dele antes de apagar: o nickname e a chave de volta.
    this.desligados.set(normalizar(jogador.nickname), {
      nickname: jogador.nickname,
      avatar: jogador.avatar,
      pontos: jogador.pontos,
      acertos: jogador.acertos,
      equipe: (this.equipeDoJogador(socketId) || {}).id || null
    });

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

    if (this.ehLeilao() && this.estado !== 'lobby') this.desfazerEquipe(socketId);
    this.tirarDasEquipes(socketId);

    // Sair muda o placar da votação de pular: com uma pessoa a menos o teto
    // baixa, e os votos que já estavam na mesa podem fechar a conta sozinhos.
    if (this.pulos.delete(socketId) || this.pulos.size > 0) {
      if (this.rodadaNoAr() && this.jogadores.size > 0 && this.pulos.size >= this.votosParaPular()) {
        this.pularRodada();
      } else if (this.rodadaNoAr()) {
        this.emitir('rodada:pular', {
          votos: this.pulos.size,
          necessarios: this.votosParaPular(),
          quem: [...this.pulos]
        });
      }
    }

    // Só faltava quem saiu para fechar a rodada.
    if (this.estado === 'pergunta' && this.todosAcertaram()) {
      this.agendar(() => this.encerrarRodada(), MS_APOS_ULTIMO);
    }

    // Quem saiu levou junto o palpite dele; com uma pessoa a menos, os que
    // ficaram podem ja ser a mesa inteira.
    if (this.palpitesVeni.delete(socketId) || this.palpitesVeni.size > 0) {
      this.travarSeTodosResponderam();
    }

    // Saiu o ultimo: a sala para de rodar e fica esperando alguem voltar.
    if (this.vazia) this.congelar();

    return jogador;
  }

  /** O lider tira alguem da sala. Devolve o jogador removido. */
  expulsar(socketIdLider, socketIdAlvo) {
    if (!this.ehLider(socketIdLider)) return { erro: 'So o lider pode expulsar.' };
    if (socketIdLider === socketIdAlvo) return { erro: 'Voce nao pode se expulsar.' };

    const alvo = this.jogadores.get(socketIdAlvo);
    if (!alvo) return { erro: 'Esse jogador nao esta na sala.' };

    const removido = this.sair(socketIdAlvo);
    // Expulsar e de proposito: nao da para voltar pelo mesmo nome com os
    // pontos de antes, senao o botao do lider nao serviria para nada.
    this.desligados.delete(normalizar(alvo.nickname));
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
    if (this.temEquipes()) {
      const falta = this.oQueFaltaNasEquipes();
      if (falta) return { erro: falta };
    }
    if (this.ehLeilaoGeral() && this.jogadores.size < 2) {
      return { erro: 'O Leilao Geral precisa de pelo menos dois jogadores: alguem tem que cobrir o lance.' };
    }

    for (const jogador of this.jogadores.values()) {
      jogador.pontos = 0;
      jogador.acertos = 0;
    }

    this.rodada = 0;
    this.filas = new Map();
    this.ultimasCategorias = [];
    this.respostasUsadas.clear();
    this.listasUsadas.clear();
    if (this.ehLeilao()) this.formarEquipes();
    this.montarFila();
    this.proximaRodada();
    return { ok: true };
  }

  /* ------------------------- Equipes (Presente Grego) ------------------------ */

  ehPresenteGrego() {
    return this.config.modo === 'presente-grego';
  }

  ehVeni() {
    return this.config.modo === 'veni';
  }

  ehRanking() {
    return this.config.modo === 'ranking';
  }

  ehLeilaoGeral() {
    return this.config.modo === 'leilao-geral';
  }

  ehDandoDicas() {
    return this.config.modo === 'dando-dicas';
  }

  /** O leilao do Dando dicas anda para tras: ganha quem pedir MENOS. */
  ehLeilaoReverso() {
    return this.ehDandoDicas();
  }

  /** Os modos de leilao: em equipes, em duplas ou cada um por si. */
  ehLeilao() {
    return this.ehPresenteGrego() || this.ehLeilaoGeral() || this.ehDandoDicas();
  }

  /** Os modos em que a sala se divide em times antes de a partida comecar. */
  temEquipes() {
    return this.ehPresenteGrego() || this.ehDandoDicas();
  }

  /** Quantas pessoas uma equipe precisa ter para entrar no leilao. */
  minimoDaEquipe() {
    return this.ehLeilaoGeral() ? 1 : 2;
  }

  /** Quantas pessoas cabem numa equipe. O saguao ajusta no + de baixo. */
  tetoEquipe() {
    return this.tamanhoEquipe;
  }

  /**
   * "Dupla" so enquanto a equipe for de dois.
   *
   * O nome aparece no chat e na tela de resultado ("a Dupla 1 leva 10 pts"),
   * entao ele acompanha o formato: aumentou o tamanho, viraram equipes.
   */
  renomearEquipes() {
    const dupla = this.ehDandoDicas() && this.tamanhoEquipe === 2;
    this.equipes.forEach((equipe, i) => {
      equipe.nome = `${dupla ? 'Dupla' : 'Equipe'} ${i + 1}`;
    });
  }

  /** Como a sala chama um time agora, para a tela nao ter que adivinhar. */
  rotuloEquipe() {
    return this.ehDandoDicas() && this.tamanhoEquipe === 2 ? 'dupla' : 'equipe';
  }

  /** Abre mais uma equipe, se ainda houver cor para ela. */
  acrescentarEquipe() {
    if (this.equipes.length >= MAX_EQUIPES) return null;
    const i = this.equipes.length;
    const nova = { id: `e${i + 1}`, nome: '', ...EQUIPES_VISUAL[i], giro: 0, jogadores: [] };
    this.equipes.push(nova);
    this.renomearEquipes();
    return nova;
  }

  /**
   * Nao coube mais ninguem: a sala se arruma sozinha.
   *
   * Cada modo cresce por onde fica melhor. O Dando dicas abre uma equipe nova
   * — mais gente no leilao e mais lance na mesa. O Presente Grego engorda as
   * que ja existem, que e como ele sempre funcionou: duas equipes, metade da
   * sala em cada. Depois que o lider mexe nos botoes, ninguem mexe mais.
   */
  crescerSozinha() {
    const porEquipes = this.ehDandoDicas();
    if (porEquipes && this.acrescentarEquipe()) return;
    if (this.tamanhoEquipe < MAX_TAMANHO_EQUIPE) {
      this.tamanhoEquipe += 1;
      this.renomearEquipes();
      return;
    }
    this.acrescentarEquipe();
  }

  /**
   * O + e o − do saguao: quantas equipes (a direita) e de que tamanho (embaixo).
   *
   * Devolve a frase do erro em vez de corrigir sozinho — fechar uma equipe com
   * gente dentro ou encolher abaixo de quem ja esta la sao coisas que o lider
   * precisa resolver antes, e nao o servidor por ele.
   */
  mudarFormato(socketId, campo, delta) {
    if (!this.ehLider(socketId)) return { erro: 'So o lider muda o formato das equipes.' };
    if (!this.temEquipes()) return { erro: 'Este modo nao joga em equipes.' };
    if (this.estado !== 'lobby' && this.estado !== 'fim') {
      return { erro: 'So da para mudar as equipes antes de a partida comecar.' };
    }

    const sobe = Number(delta) > 0;

    if (campo === 'equipes') {
      if (sobe) {
        if (!this.acrescentarEquipe()) return { erro: `O maximo e ${MAX_EQUIPES} equipes.` };
      } else {
        if (this.equipes.length <= MIN_EQUIPES) {
          return { erro: `Sao ${MIN_EQUIPES} equipes no minimo: sem duas nao ha disputa.` };
        }
        const ultima = this.equipes[this.equipes.length - 1];
        if (ultima.jogadores.length) {
          return { erro: `Tire a galera da ${ultima.nome} antes de fechar ela.` };
        }
        this.equipes.pop();
        this.renomearEquipes();
      }
    } else if (campo === 'tamanho') {
      if (sobe) {
        if (this.tamanhoEquipe >= MAX_TAMANHO_EQUIPE) {
          return { erro: `O maximo e ${MAX_TAMANHO_EQUIPE} por equipe.` };
        }
        this.tamanhoEquipe += 1;
      } else {
        if (this.tamanhoEquipe <= MIN_TAMANHO_EQUIPE) {
          return { erro: 'Uma equipe precisa de dois: um leiloa e o outro responde.' };
        }
        const maior = Math.max(0, ...this.equipes.map((e) => e.jogadores.length));
        if (maior >= this.tamanhoEquipe) {
          return { erro: `Tem equipe com ${maior}: tire alguem antes de diminuir.` };
        }
        this.tamanhoEquipe -= 1;
      }
      this.renomearEquipes();
    } else {
      return { erro: 'So da para mudar quantas equipes ou o tamanho delas.' };
    }

    this.formatoAMao = true;
    return { ok: true, equipes: this.equipes.length, tamanho: this.tamanhoEquipe };
  }

  /** Quem esta na sala mas nao coube em equipe nenhuma. */
  semEquipe() {
    return [...this.jogadores.keys()].filter((id) => !this.equipeDoJogador(id));
  }

  /**
   * O que ainda falta para as equipes poderem jogar, em uma frase — ou null
   * quando esta tudo certo. A mesma conta serve para travar o `iniciar` e para
   * a dica embaixo da lista, entao a regra mora em um lugar so.
   */
  oQueFaltaNasEquipes() {
    const sobrando = this.semEquipe().length;
    if (sobrando) {
      return `${sobrando === 1 ? 'Uma pessoa esta' : `${sobrando} pessoas estao`} sem equipe:`
        + ' aumente o tamanho ou abra outra equipe.';
    }

    const comGente = this.equipes.filter((e) => e.jogadores.length > 0);
    if (comGente.length < MIN_EQUIPES) {
      return `Faltam equipes com gente: sao ${MIN_EQUIPES} no minimo, senao nao ha disputa.`;
    }

    const capenga = comGente.find((e) => e.jogadores.length < MIN_TAMANHO_EQUIPE);
    if (capenga) {
      return `A ${capenga.nome} esta sozinha: toda equipe precisa de ${MIN_TAMANHO_EQUIPE}`
        + ' — uma pessoa leiloa e a outra responde.';
    }
    return null;
  }

  equipeDoJogador(socketId) {
    return this.equipes.find((e) => e.jogadores.includes(socketId)) || null;
  }

  /** Quem chega cai na equipe menor que ainda tenha vaga. */
  encaixarNaEquipe(socketId) {
    // Fora dos modos em equipe a sala nao tem times para escolher.
    if (!this.temEquipes()) return;
    if (this.equipeDoJogador(socketId)) return;

    const comVaga = () => this.equipes.filter((e) => e.jogadores.length < this.tamanhoEquipe);

    let vagas = comVaga();
    // Lotou: a sala cresce sozinha — a nao ser que o lider ja tenha arrumado
    // o formato na mao, e ai a sala e dele.
    if (!vagas.length && !this.formatoAMao) {
      this.crescerSozinha();
      vagas = comVaga();
    }
    // Ainda sem vaga: a pessoa entra sem equipe, e o saguao cobra o lider.
    if (!vagas.length) return;

    const menor = vagas.reduce((a, b) => (b.jogadores.length < a.jogadores.length ? b : a));
    menor.jogadores.push(socketId);
  }

  tirarDasEquipes(socketId) {
    for (const equipe of this.equipes) {
      equipe.jogadores = equipe.jogadores.filter((id) => id !== socketId);
    }
  }

  /** Trocar de equipe só vale antes de a partida começar. */
  trocarEquipe(socketId, idEquipe) {
    if (!this.jogadores.has(socketId)) return { erro: 'Voce nao esta nesta sala.' };
    if (this.estado !== 'lobby' && this.estado !== 'fim') {
      return { erro: 'So da para trocar de equipe antes de a partida comecar.' };
    }
    const destino = this.equipes.find((e) => e.id === idEquipe);
    if (!destino) return { erro: 'Essa equipe nao existe.' };
    if (destino.jogadores.includes(socketId)) return { ok: true, equipe: destino.id };
    if (destino.jogadores.length >= this.tamanhoEquipe) {
      return { erro: `A ${destino.nome} esta cheia: cabem ${this.tamanhoEquipe} por equipe.` };
    }

    this.tirarDasEquipes(socketId);
    destino.jogadores.push(socketId);
    return { ok: true, equipe: destino.id };
  }

  /** Prepara para a partida as equipes que a sala montou. */
  formarEquipes() {
    // Leilao Geral: cada pessoa e o proprio time — leiloa e responde sozinha.
    if (this.ehLeilaoGeral()) {
      this.equipes = [...this.jogadores.values()].map((jogador, i) => ({
        id: `j${i + 1}`,
        nome: jogador.nickname,
        ...EQUIPES_VISUAL[i % EQUIPES_VISUAL.length],
        giro: 0,
        jogadores: [jogador.id]
      }));
      return;
    }

    for (const equipe of this.equipes) {
      equipe.jogadores = embaralhar(this.presentesDe(equipe));
      // Quem abre leiloando sai deste sorteio; daí em diante o papel gira a
      // cada rodada, para ninguém passar a partida inteira sem responder.
      equipe.giro = Math.floor(Math.random() * Math.max(1, equipe.jogadores.length));
    }
  }

  /** Os integrantes que ainda estão na sala. */
  presentesDe(equipe) {
    return equipe ? equipe.jogadores.filter((id) => this.jogadores.has(id)) : [];
  }

  equipePorId(id) {
    return this.equipes.find((d) => d.id === id) || null;
  }

  equipeDe(socketId) {
    return this.equipes.find((d) => d.jogadores.includes(socketId)) || null;
  }

  /**
   * Quem entra no leilao. No Presente Grego e equipe com dois ou mais (senao
   * nao ha a quem apostar); no Leilao Geral basta a pessoa estar na sala.
   */
  equipesAtivas() {
    return this.equipes.filter((e) => this.presentesDe(e).length >= this.minimoDaEquipe());
  }

  /** Quem leiloa nesta rodada por esta equipe. O papel gira a cada rodada. */
  leiloeiroDe(equipe) {
    const gente = this.presentesDe(equipe);
    if (gente.length < this.minimoDaEquipe()) return null;
    return gente[(this.rodada - 1 + equipe.giro) % gente.length];
  }

  /**
   * Quem responde: o seguinte na roda do Presente Grego, que recebe o presente
   * sem saber o que tem dentro — ou a propria pessoa, no Leilao Geral.
   */
  respondedorDe(equipe) {
    const gente = this.presentesDe(equipe);
    if (gente.length < this.minimoDaEquipe()) return null;
    return gente[(this.rodada + equipe.giro) % gente.length];
  }

  /**
   * Alguém saiu no meio da partida: a equipe dele fica capenga e sai do leilão.
   * Se a rodada dependia dessa pessoa, ela não tem como terminar.
   */
  desfazerEquipe(socketId) {
    const equipe = this.equipeDe(socketId);
    if (!equipe) return;

    const eraDaVez = this.estado === 'leilao'
      && this.leilao
      && this.leilao.equipes[this.leilao.vez] === equipe.id;
    const tinhaOMaiorLance = this.leilao && this.leilao.equipeAposta === equipe.id;

    equipe.jogadores = equipe.jogadores.filter((id) => id !== socketId);

    // Quem ia entregar o presente sumiu: a rodada não tem como terminar.
    if (this.leilao && this.leilao.respondedor === socketId) {
      return this.cancelarRodada('quem tinha sido desafiado saiu da sala');
    }
    // Dando dicas: sem quem da as dicas a outra metade fica olhando para o teto.
    if (this.ehDandoDicas() && this.leilao && this.leilao.fechado
        && this.leilao.quemApostou === socketId) {
      return this.cancelarRodada('quem ia dar as dicas saiu da sala');
    }
    if (!this.leilaoAberto()) return;
    // A equipe do maior lance só perde a rodada se ficar sem dois: com três
    // integrantes ainda sobra gente para entregar o presente.
    if (tinhaOMaiorLance && this.presentesDe(equipe).length < 2) {
      return this.cancelarRodada('a equipe do maior lance ficou sem dois jogadores');
    }
    if (eraDaVez) this.avancarLance();
  }

  /**
   * As perguntas das categorias escolhidas, numa fila embaralhada POR
   * categoria.
   *
   * O sorteio escolhe primeiro a categoria e só depois a pergunta. Sorteando
   * a pergunta direto de um monte só, a categoria mais recheada dominava:
   * Cinema tem 543 perguntas e Rap 27, então uma rodada em cada quatro era de
   * cinema e rap quase nunca aparecia.
   */
  montarFila() {
    this.filas = new Map();
    for (const idCategoria of categoriasEmJogo(this.config)) {
      const perguntas = this.perguntasDaCategoria(idCategoria);
      if (perguntas.length) this.filas.set(idCategoria, embaralhar(perguntas));
    }
  }

  /** As perguntas de uma categoria, respeitando as partes marcadas. */
  perguntasDaCategoria(idCategoria) {
    return perguntasEscolhidas(this.config, idCategoria);
  }

  /**
   * Tira a próxima pergunta, variando a categoria.
   *
   * Numa janela de 80% das categorias escolhidas nenhuma se repete: com 10
   * categorias, quaisquer 8 perguntas seguidas são de 8 categorias
   * diferentes. Dentro da janela o sorteio é livre, então a ordem não vira
   * um rodízio previsível.
   */
  sacarDaFila() {
    if (!this.filas || this.filas.size === 0) this.montarFila();
    const categorias = [...this.filas.keys()];

    const janela = Math.max(1, Math.ceil(categorias.length * VARIACAO_CATEGORIAS));
    // Quem apareceu nas últimas (janela - 1) perguntas espera a vez.
    const bloqueadas = new Set(janela > 1 ? this.ultimasCategorias.slice(-(janela - 1)) : []);
    const livres = categorias.filter((c) => !bloqueadas.has(c));
    const opcoes = livres.length ? livres : categorias;
    const categoria = opcoes[Math.floor(Math.random() * opcoes.length)];

    this.ultimasCategorias.push(categoria);
    if (this.ultimasCategorias.length > categorias.length) this.ultimasCategorias.shift();

    return this.sacarDaCategoria(categoria);
  }

  /**
   * Tira uma pergunta da categoria pulando as que repetem uma resposta já
   * dada nesta partida.
   *
   * Resposta puramente numérica escapa da regra: "quanto e 6x5" e "quanto e
   * 27+3" dão 30, e ninguém sente isso como repetição — são contas diferentes.
   */
  sacarDaCategoria(categoria) {
    let fila = this.filas.get(categoria);
    if (!fila || fila.length === 0) {
      fila = embaralhar(this.perguntasDaCategoria(categoria));
      this.filas.set(categoria, fila);
    }

    const puladas = [];
    while (fila.length > 0) {
      const bruta = fila.shift();
      const chave = normalizar(bruta.resposta || '');
      if (/^[0-9]+$/.test(chave) || !this.respostasUsadas.has(chave)) {
        // As puladas voltam para o fim: podem servir numa partida seguinte.
        if (puladas.length) fila.push(...puladas);
        this.respostasUsadas.add(chave);
        return bruta;
      }
      puladas.push(bruta);
    }

    // Só sobrou repetição nesta categoria — a partida é mais longa que o
    // baralho dela. Recomeça a categoria em vez de ficar sem pergunta.
    const nova = embaralhar(this.perguntasDaCategoria(categoria));
    const bruta = nova.shift();
    this.filas.set(categoria, nova);
    this.respostasUsadas.add(normalizar(bruta.resposta || ''));
    return bruta;
  }

  /**
   * Mais ou Menos Pontos: uma lista em ordem.
   *
   * A lista inteira vira o repertorio da rodada, e a posicao de cada item e a
   * pontuacao dele. A pergunta pede UM item, porque cada pessoa responde uma
   * vez so.
   */
  perguntaRanking() {
    const livres = RANKINGS.filter((r) => !this.listasUsadas.has(r.id));
    const bolo = livres.length ? livres : RANKINGS;
    const lista = bolo[Math.floor(Math.random() * bolo.length)];
    this.listasUsadas.add(lista.id);

    const id = dificuldade.idDe('ranking', lista.pergunta, lista.id);
    const difBase = lista.dif ?? 35;

    return {
      id,
      pergunta: lista.pergunta,
      imagem: null,
      audio: null,
      letra: null,
      resposta: null,
      aceita: [],
      itens: lista.itens.map((i) => ({ oficial: i.oficial, variantes: i.variantes || [] })),
      necessarias: 1,
      fixo: true,
      ranking: true,
      fonte: lista.fonte,
      categoria: { id: 'ranking', nome: 'Mais ou Menos Pontos', icone: '📈', cor: '#22c55e' },
      difBase,
      dificuldade: dificuldade.dificuldadeDe(id, difBase)
    };
  }

  /**
   * 1 eh bom 2 ok 3 eh demais: uma palavra do banco de dicas.
   *
   * A pergunta é sempre a mesma ("que palavra e esta?"); quem muda são as três
   * dicas, que entram uma por terço da rodada.
   */
  perguntaVeni() {
    const livres = PALAVRAS.filter((p) => !this.respostasUsadas.has(normalizar(p.resposta)));
    const bolo = livres.length ? livres : PALAVRAS;
    const palavra = bolo[Math.floor(Math.random() * bolo.length)];
    this.respostasUsadas.add(normalizar(palavra.resposta));

    const id = dificuldade.idDe('veni', palavra.dicas[0], palavra.resposta);
    const difBase = palavra.dif ?? 30;

    return {
      id,
      pergunta: 'Que palavra e esta?',
      imagem: null,
      audio: null,
      letra: null,
      resposta: palavra.resposta,
      aceita: palavra.aceita || [],
      itens: [{ oficial: palavra.resposta, variantes: palavra.aceita || [] }],
      necessarias: 1,
      fixo: true,
      dicas: palavra.dicas,
      categoria: { id: 'veni', nome: '1 eh bom 2 ok 3 eh demais', icone: '🥇', cor: '#f59e0b' },
      difBase,
      dificuldade: dificuldade.dificuldadeDe(id, difBase)
    };
  }

  /**
   * Abre a janela de uma dica: 15s para cada um escrever um palpite.
   *
   * O palpite fica guardado no servidor e ninguem ve — nem quem escreveu do
   * lado. Se o chat julgasse na hora, o primeiro acerto entregaria a palavra
   * para a mesa inteira, e as duas dicas seguintes nao valeriam nada.
   */
  abrirFaseVeni(indice) {
    if (this.estado !== 'pergunta' || !this.perguntaAtual) return;

    this.dicaAtual = indice;
    this.palpitesVeni = new Map();
    this.inicioPergunta = Date.now();

    if (indice > 0) {
      this.emitir('veni:dica', {
        indice,
        dica: this.perguntaAtual.dicas[indice],
        vale: PONTOS_VENI[indice],
        duracaoMs: MS_FASE_VENI
      });
    }

    this.agendar(() => this.fecharFaseVeni(), MS_FASE_VENI);
  }

  /**
   * A mesa inteira ja travou a resposta? Entao a janela fecha sem esperar.
   *
   * Quem quisesse trocar de ideia perde a chance — mas a alternativa era a
   * sala inteira olhando um relogio que nao muda mais nada.
   */
  travarSeTodosResponderam() {
    if (!this.ehVeni() || this.estado !== 'pergunta') return false;
    if (this.jogadores.size === 0) return false;
    if (this.palpitesVeni.size < this.jogadores.size) return false;

    this.agendar(() => this.fecharFaseVeni(), MS_TODOS_TRAVARAM);
    return true;
  }

  /**
   * Fecha a janela: todos os palpites viram publicos de uma vez.
   *
   * Quem acertou leva o que a dica valia — igual para todos, porque ninguem
   * viu o palpite do outro. Se alguem acertou, a rodada acaba (a palavra ja
   * esta na tela); se ninguem acertou, entra a proxima dica, valendo menos.
   */
  fecharFaseVeni() {
    if (this.estado !== 'pergunta' || !this.perguntaAtual) return;

    const fase = this.dicaAtual;
    const vale = PONTOS_VENI[fase];
    const agora = Date.now();
    const palpites = [];

    for (const [id, texto] of this.palpitesVeni) {
      const jogador = this.jogadores.get(id);
      if (!jogador) continue;

      const certo = this.perguntaAtual.itens.some(
        (item) => avaliar(texto, item.oficial, item.variantes).veredito === 'certo'
      );
      palpites.push({
        jogadorId: id,
        nickname: jogador.nickname,
        avatar: jogador.avatar,
        texto,
        certo
      });

      if (!certo || this.acertos.has(id)) continue;
      jogador.pontos += vale;
      jogador.acertos += 1;
      this.pontosRodada.set(id, vale);
      this.acertos.set(id, {
        ms: agora - this.inicioPergunta, pontos: vale, posicao: this.acertos.size + 1, bonus: 0
      });
      if (this.primeiroAcertoEm === null) this.primeiroAcertoEm = agora;
    }

    this.palpitesVeni = new Map();

    const acertou = palpites.some((p) => p.certo);
    const fim = acertou || fase >= DICAS_POR_RODADA - 1;

    this.emitir('veni:revelacao', {
      indice: fase,
      vale,
      palpites,
      acertou,
      fim,
      duracaoMs: MS_REVELA_VENI,
      placar: this.placar()
    });

    if (fim) this.agendar(() => this.encerrarRodada(), MS_REVELA_VENI);
    else this.agendar(() => this.abrirFaseVeni(fase + 1), MS_REVELA_VENI);
  }

  /** Uma pergunta comum: uma resposta só. */
  perguntaSimples() {
    const bruta = this.sacarDaFila();
    const id = idDaPergunta(bruta.categoria, bruta);
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

  /**
   * Dando dicas: a palavra secreta da rodada.
   *
   * Sai do mesmo banco das outras rodadas, mas o que interessa e a RESPOSTA e
   * nao o enunciado: "Quem ganhou a Copa de 2002?" vira a palavra `Brasil`, e
   * o enunciado e jogado fora. Nem toda resposta serve de alvo — numero puro e
   * frase comprida nao se explicam em palavras soltas —, entao o sorteio
   * insiste algumas vezes antes de cair no banco do Veni, que e feito so de
   * palavras adivinhaveis.
   */
  perguntaDica() {
    let escolhida = this.perguntaSimples();
    for (let tentativa = 1; tentativa < 8 && !serveDeAlvo(escolhida.resposta); tentativa++) {
      escolhida = this.perguntaSimples();
    }
    if (!serveDeAlvo(escolhida.resposta)) escolhida = this.perguntaVeni();

    return {
      ...escolhida,
      // O enunciado publico nao diz nada: quem adivinha so tem as dicas.
      pergunta: 'Adivinhe a palavra pelas dicas do seu parceiro.',
      // A palavra em si sai daqui para quem leiloa, um a um, e nunca para a sala.
      segredo: escolhida.resposta,
      imagem: null,
      audio: null,
      letra: null,
      dicas: null,
      necessarias: 1,
      fixo: true,
      // A categoria de verdade tambem fica escondida: sabendo que e Geografia,
      // metade do trabalho da dica ja estaria feito.
      categoria: { id: 'dando-dicas', nome: 'Dando dicas', icone: '💡', cor: '#38bdf8' }
    };
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
    // Leilao sem dois lados não tem como acontecer.
    if (this.ehLeilao() && this.equipesAtivas().length < 2) {
      this.avisar(this.ehLeilaoGeral()
        ? 'Nao sobraram dois jogadores para o leilao. Fim de jogo.'
        : 'Nao sobraram duas equipes completas. Fim de jogo.', true);
      return this.terminar();
    }

    // Quem chegou com a rodada no ar ficou de fora dela; entre uma rodada e
    // outra da para encaixar sem trocar papel de ninguem no meio do caminho.
    for (const id of this.semEquipe()) this.encaixarNaEquipe(id);

    this.rodada += 1;

    if (this.ehLeilao()) {
      this.perguntaAtual = this.ehDandoDicas() ? this.perguntaDica() : this.perguntaPresente();
      this.prepararLeilao();
    } else if (this.ehRanking()) {
      // A mesma lista fica por tres rodadas: cada pessoa responde uma vez em
      // cada uma, e o que já saiu continua fora.
      const mesmaLista = this.perguntaAtual
        && this.perguntaAtual.ranking
        && this.voltaRanking < VOLTAS_RANKING;

      this.voltaRanking = mesmaLista ? this.voltaRanking + 1 : 1;
      this.itensJaDitos = mesmaLista ? new Set(this.itensUsados) : new Set();
      this.perguntaAtual = mesmaLista
        ? { ...this.perguntaAtual, volta: this.voltaRanking }
        : this.perguntaRanking();
    } else if (this.ehVeni()) {
      this.perguntaAtual = this.perguntaVeni();
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
    // Mais ou Menos Pontos: a lista continua, e com ela o que já foi dito.
    if (this.ehRanking()) this.itensUsados = new Set(this.itensJaDitos);
    this.pontosRodada = new Map();
    this.pulos = new Set();
    this.errouRanking = new Set();
    this.dicaAtual = 0;
    this.palpitesVeni = new Map();
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

    // Dando dicas: o relogio cresce com o numero de dicas prometidas, porque
    // cada dica e uma ida e volta — a palavra sai, o parceiro chuta, erra,
    // pensa de novo. Quem prometeu 3 tem 42s; quem prometeu 8, 87s.
    if (this.ehDandoDicas()) {
      const dicas = (this.leilao && this.leilao.aposta) || 1;
      return Math.min(MS_BASE_DICAS + dicas * MS_POR_DICA, MS_TETO_DICAS);
    }
    // Nos outros leilões o relógio não é o da sala: é uma pessoa só digitando,
    // e o tamanho da entrega é que diz quanto tempo ela precisa.
    if (this.ehLeilao()) {
      const pedidas = this.perguntaAtual.necessarias || 1;
      return Math.min(MS_BASE_LEILAO + pedidas * MS_POR_ITEM_PRESENTE, MS_TETO_PRESENTE);
    }
    // 1 eh bom 2 ok 3 eh demais: o relogio que aparece e o da janela de palpite, nao o
    // da rodada inteira — sao tres janelas iguais, uma por dica.
    if (this.ehVeni()) return MS_FASE_VENI;

    return Math.min(base + extras * MS_POR_RESPOSTA_EXTRA, MS_TETO_RODADA);
  }

  mostrarPergunta() {
    // Nos leilões a pergunta não abre a rodada: primeiro vem o leilão.
    if (this.ehLeilao() && this.estado === 'categoria') return this.iniciarLeilao();

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
      // No 1 eh bom 2 ok 3 eh demais a máscara entregaria o tamanho da palavra, e o
      // jogo ali é adivinhar pelas dicas.
      // No Dando dicas a mascara entregaria o tamanho da palavra que o
      // parceiro esta tentando arrancar a duras penas.
      mascara: !this.ehVeni() && !this.ehDandoDicas()
        && this.perguntaAtual.necessarias === 1 && this.perguntaAtual.resposta
        ? this.perguntaAtual.resposta.replace(/[\p{L}\p{N}]/gu, '•')
        : null,
      duracaoMs: this.ehCarrossel() ? null : duracaoMs,
      // Mais ou Menos Pontos: a mesa precisa saber ate onde vai a lista.
      ranking: this.ehRanking()
        ? {
            total: this.perguntaAtual.itens.length,
            fonte: this.perguntaAtual.fonte,
            volta: this.voltaRanking,
            voltas: VOLTAS_RANKING,
            // O que ja saiu nas voltas anteriores: o chat rolou, e sem isso a
            // mesa repetiria o que nao vale mais.
            jaDitos: [...this.itensUsados].map((i) => this.perguntaAtual.itens[i].oficial)
          }
        : null,
      // 1 eh bom 2 ok 3 eh demais: so a primeira dica; as outras chegam no meio da rodada.
      veni: this.ehVeni()
        ? {
            dica: this.perguntaAtual.dicas[0],
            indice: 0,
            total: DICAS_POR_RODADA,
            vale: PONTOS_VENI[0],
            valores: PONTOS_VENI,
            duracaoMs: MS_FASE_VENI
          }
        : null,
      carrossel: this.ehCarrossel()
        ? { voltas: this.voltasAlvo, msPorVez: MS_POR_VEZ, ordem: this.ordem, visivel: this.mostraDitos() }
        : null,
      // Presente Grego: agora a pergunta é pública, mas só uma pessoa responde
      // — e a mesa inteira sabe quanto ela prometeu entregar.
      presente: this.ehLeilao() && this.leilao
        ? {
            aposta: this.leilao.aposta,
            respondedor: this.leilao.respondedor,
            equipeAposta: this.leilao.equipeAposta,
            equipeDuvidou: this.leilao.equipeDuvidou,
            // Dando dicas: aqui a dupla inteira escreve — uma metade manda as
            // palavras e a outra chuta —, entao a tela precisa dos dois nomes.
            dicador: this.ehDandoDicas() ? this.leilao.quemApostou : null
          }
        : null
    });

    // No carrossel não há relógio único de rodada: o tempo é de cada vez.
    // No Veni quem manda no relógio é a janela de palpite: ela é que decide
    // se entra outra dica ou se a rodada acabou.
    if (this.ehCarrossel()) this.iniciarVez();
    else if (this.ehVeni()) this.abrirFaseVeni(0);
    else this.agendar(() => this.encerrarRodada(), duracaoMs);
  }

  /* ---------------------- Leilão (Presente Grego) ---------------------- */

  /** Zera o leilão da rodada e decide qual equipe abre. */
  prepararLeilao() {
    const ativas = this.equipesAtivas();
    // Abrir o leilão é desvantagem — o primeiro lance é o mais barato de
    // cobrir —, então a vez de começar gira a cada rodada.
    const giro = (this.rodada - 1) % Math.max(1, ativas.length);
    const ordem = ativas.slice(giro).concat(ativas.slice(0, giro));

    this.leilao = {
      equipes: ordem.map((d) => d.id),
      vez: 0,
      aposta: 0,            // maior lance na mesa
      equipeAposta: null,    // de quem é esse lance
      quemApostou: null,
      equipeDuvidou: null,   // quem chamou o blefe
      quemDuvidou: null,
      respondedor: null,    // quem vai ter que entregar
      // O "duvido" fecha o leilão na hora, mas a pergunta só abre alguns
      // segundos depois. Sem esta trava, um lance atrasado entrava nessa
      // brecha e trocava quem tinha sido desafiado.
      fechado: false,
      fora: [],          // Leilao Geral e Dando dicas: quem ja saiu do leilao
      historico: [],
      conseguiu: false,
      ditas: 0,
      premio: 0,
      // Dando dicas: as palavras ja gastas e em qual delas o parceiro acertou.
      dicasUsadas: [],
      acertouEm: null
    };
  }

  /** Abre o leilão: a pergunta vai só para quem vai leiloar. */
  iniciarLeilao() {
    this.estado = 'leilao';

    this.emitir('leilao:comeco', {
      rodada: this.rodada,
      msPorLance: MS_POR_LANCE,
      maxAposta: this.ehDandoDicas() ? MAX_DICAS : MAX_APOSTA,
      pontosPorAposta: this.ehDandoDicas() ? PONTOS_POR_RODADA_DICAS : PONTOS_POR_APOSTA,
      // Leilao ao contrario: a tela precisa saber que o lance desce.
      reverso: this.ehLeilaoReverso(),
      equipes: this.leilao.equipes.map((id) => this.equipePublica(this.equipePorId(id)))
    });

    // O enunciado sai daqui um por um, e não pelo evento da sala: se fosse
    // junto, quem vai responder leria a pergunta antes de o leilão acabar.
    for (const id of this.leilao.equipes) {
      const leiloeiro = this.leiloeiroDe(this.equipePorId(id));
      if (leiloeiro) {
        this.emitirPara(leiloeiro, 'leilao:pergunta', {
          pergunta: this.perguntaAtual.pergunta,
          // No Dando dicas quem leiloa nao le um enunciado: le a palavra que
          // vai ter que arrancar do parceiro.
          segredo: this.ehDandoDicas() ? this.perguntaAtual.segredo : null
        });
      }
    }

    this.avisar(this.ehDandoDicas()
      ? 'Leilao aberto! O lance DESCE: leva quem topar fazer o parceiro acertar com menos dicas.'
      : this.ehLeilaoGeral()
        ? 'Leilao aberto! Cada um aposta quantas consegue dizer sozinho.'
        : 'Leilao aberto! Quem esta leiloando ja viu a pergunta.');
    this.abrirLance();
  }

  /** Retrato de uma equipe para a tela, com os papéis desta rodada. */
  equipePublica(equipe) {
    if (!equipe) return null;
    const cracha = (id) => {
      const j = this.jogadores.get(id);
      return j ? { id: j.id, nickname: j.nickname, avatar: j.avatar } : null;
    };
    return {
      id: equipe.id,
      nome: equipe.nome,
      icone: equipe.icone,
      cor: equipe.cor,
      leiloeiro: cracha(this.leiloeiroDe(equipe)),
      respondedor: cracha(this.respondedorDe(equipe))
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

  /** Passa a palavra para a equipe da vez e liga o relógio do lance. */
  abrirLance() {
    if (!this.leilaoAberto()) return;

    const equipe = this.equipePorId(this.leilao.equipes[this.leilao.vez]);
    const quem = this.leiloeiroDe(equipe);
    if (!equipe || !quem) return this.cancelarRodada('uma equipe se desfez no meio do leilao');

    const reverso = this.ehLeilaoReverso();
    const naMesa = this.leilao.aposta;
    // Leilao normal o lance sobe a partir do que esta na mesa; no reverso ele
    // desce, e o chao e uma dica so — abaixo disso nao ha o que prometer.
    const minimo = reverso ? 1 : naMesa + 1;
    const maximo = reverso ? (naMesa > 0 ? naMesa - 1 : MAX_DICAS) : MAX_APOSTA;
    // Cobrir um lance de 1 no reverso e impossivel: so resta passar.
    const daParaCobrir = maximo >= minimo;

    this.emitir('leilao:vez', {
      equipeId: equipe.id,
      jogadorId: quem,
      aposta: naMesa,
      minimo,
      maximo,
      podeApostar: daParaCobrir,
      // Ninguém duvida do nada, nem do próprio lance. No Leilao Geral e no
      // Dando dicas nao ha duvido: quem nao quer cobrir passa, e sai da rodada.
      podeDuvidar: !this.ehLeilaoGeral() && !reverso
        && naMesa > 0 && this.leilao.equipeAposta !== equipe.id,
      podePassar: (this.ehLeilaoGeral() || reverso)
        && naMesa > 0 && this.leilao.equipeAposta !== equipe.id,
      msPorLance: MS_POR_LANCE
    });

    clearTimeout(this.temporizadorVez);
    this.temporizadorVez = setTimeout(() => this.lanceNoTempo(equipe.id), MS_POR_LANCE);
  }

  /** O relógio do lance zerou sem ninguém dizer nada. */
  lanceNoTempo(equipeId) {
    if (!this.leilaoAberto()) return;
    const equipe = this.equipePorId(equipeId);
    const quem = this.leiloeiroDe(equipe);
    if (!quem) return this.cancelarRodada('uma equipe se desfez no meio do leilao');

    if (this.leilao.aposta > 0 && this.leilao.equipeAposta !== equipeId) {
      if (this.ehLeilaoGeral() || this.ehLeilaoReverso()) {
        this.avisar('Tempo! Quem nao cobre sai do leilao.');
        return this.registrarPasso(equipeId, quem);
      }
      this.avisar('Tempo! Ninguem cobriu o lance.');
      return this.fecharLeilao(quem, equipeId);
    }

    // Quem abre é obrigado a apostar: sem lance na mesa não há o que duvidar.
    // No reverso, abrir calado sai pelo lance mais seguro — o teto de dicas.
    if (this.ehLeilaoReverso()) {
      this.avisar('Tempo! O leilao abriu no teto de dicas.');
      return this.registrarLance(quem, equipeId, MAX_DICAS);
    }
    this.avisar('Tempo! O leilao abriu no lance minimo.');
    this.registrarLance(quem, equipeId, this.leilao.aposta + 1);
  }

  /**
   * Um lance novo: a aposta é de quantas respostas o PARCEIRO consegue dizer.
   * Vale qualquer número, desde que maior que o lance que estava na mesa.
   */
  apostar(socketId, valor) {
    if (!this.leilaoAberto()) return { erro: 'O leilao nao esta aberto.' };

    const equipe = this.equipePorId(this.leilao.equipes[this.leilao.vez]);
    if (!equipe || this.leiloeiroDe(equipe) !== socketId) return { erro: 'Nao e a sua vez no leilao.' };

    const aposta = Number(valor);
    if (!Number.isInteger(aposta)) return { erro: 'A aposta e um numero inteiro.' };

    if (this.ehLeilaoReverso()) {
      // Ao contrario: cobrir e prometer MENOS dicas que o lance na mesa.
      if (aposta < 1) return { erro: 'O minimo e uma dica.' };
      if (aposta > MAX_DICAS) return { erro: `O teto e ${MAX_DICAS} dicas.` };
      if (this.leilao.aposta > 0 && aposta >= this.leilao.aposta) {
        return { erro: `O lance precisa ser menor que ${this.leilao.aposta}.` };
      }
    } else {
      if (aposta <= this.leilao.aposta) {
        return { erro: `A aposta precisa ser maior que ${this.leilao.aposta}.` };
      }
      if (aposta > MAX_APOSTA) return { erro: `O teto do leilao e ${MAX_APOSTA}.` };
    }

    this.registrarLance(socketId, equipe.id, aposta);
    return { ok: true, aposta };
  }

  registrarLance(socketId, equipeId, aposta) {
    clearTimeout(this.temporizadorVez);

    this.leilao.aposta = aposta;
    this.leilao.equipeAposta = equipeId;
    this.leilao.quemApostou = socketId;
    this.leilao.historico.push({ equipeId, jogadorId: socketId, aposta });

    const jogador = this.jogadores.get(socketId);
    const equipe = this.equipePorId(equipeId);
    const parceiro = this.jogadores.get(this.respondedorDe(equipe));

    this.emitir('leilao:lance', {
      equipeId,
      jogadorId: socketId,
      nickname: jogador ? jogador.nickname : '',
      aposta,
      historico: this.leilao.historico
    });
    const nome = jogador ? jogador.nickname : 'Alguem';
    const outro = parceiro ? parceiro.nickname : 'o parceiro';
    this.avisar(this.ehDandoDicas()
      ? `${nome} faz ${outro} acertar em ${aposta} ${aposta === 1 ? 'dica' : 'dicas'}.`
      : this.ehLeilaoGeral()
        ? `${nome} apostou que diz ${aposta} sozinho.`
        : `${nome} apostou que ${outro} diz ${aposta}.`);

    this.avancarLance();
  }

  /** "Duvido": encerra o leilão e cobra o último lance. */
  duvidar(socketId) {
    if (this.ehLeilaoGeral() || this.ehLeilaoReverso()) {
      return { erro: 'Neste modo nao ha duvido: ou cobre, ou passa.' };
    }
    if (!this.leilaoAberto()) return { erro: 'O leilao nao esta aberto.' };

    const equipe = this.equipePorId(this.leilao.equipes[this.leilao.vez]);
    if (!equipe || this.leiloeiroDe(equipe) !== socketId) return { erro: 'Nao e a sua vez no leilao.' };
    if (this.leilao.aposta <= 0) return { erro: 'Ainda nao ha lance para duvidar. Abra o leilao.' };
    if (this.leilao.equipeAposta === equipe.id) return { erro: 'Voce nao duvida do proprio lance.' };

    this.fecharLeilao(socketId, equipe.id);
    return { ok: true };
  }

  /**
   * "Passo": sai do leilao desta rodada. So existe no Leilao Geral, onde nao
   * ha parceiro para desafiar — quem nao cobre simplesmente desiste.
   */
  passar(socketId) {
    if (!this.ehLeilaoGeral() && !this.ehLeilaoReverso()) {
      return { erro: 'Neste modo nao da para passar: ou cobre, ou duvida.' };
    }
    if (!this.leilaoAberto()) return { erro: 'O leilao nao esta aberto.' };

    const posto = this.equipePorId(this.leilao.equipes[this.leilao.vez]);
    if (!posto || this.leiloeiroDe(posto) !== socketId) return { erro: 'Nao e a sua vez no leilao.' };
    if (this.leilao.aposta <= 0) return { erro: 'Ainda nao ha lance: quem abre o leilao tem que apostar.' };
    if (this.leilao.equipeAposta === posto.id) return { erro: 'Voce esta com o maior lance: nao da para passar.' };

    this.registrarPasso(posto.id, socketId);
    return { ok: true };
  }

  /** Tira do leilao quem passou; sobrando um, o leilao fecha nele. */
  registrarPasso(postoId, socketId) {
    clearTimeout(this.temporizadorVez);
    if (!this.leilao.fora.includes(postoId)) this.leilao.fora.push(postoId);

    const jogador = this.jogadores.get(socketId);
    this.emitir('leilao:passou', {
      equipeId: postoId,
      jogadorId: socketId,
      nickname: jogador ? jogador.nickname : '',
      fora: [...this.leilao.fora]
    });
    this.avisar(`${jogador ? jogador.nickname : 'Alguem'} passou e saiu do leilao.`);

    const sobraram = this.leilao.equipes.filter((id) => !this.leilao.fora.includes(id)
      && this.leiloeiroDe(this.equipePorId(id)));
    if (sobraram.length <= 1) return this.fecharLeilao(socketId, postoId);
    this.avancarLance();
  }

  /** Passa a palavra para a próxima equipe que ainda esteja no leilão. */
  avancarLance() {
    clearTimeout(this.temporizadorVez);
    if (!this.leilaoAberto()) return;

    for (let passo = 0; passo < this.leilao.equipes.length; passo++) {
      this.leilao.vez = (this.leilao.vez + 1) % this.leilao.equipes.length;
      const id = this.leilao.equipes[this.leilao.vez];
      if (this.leilao.fora.includes(id)) continue;   // ja saiu do leilao
      if (this.leiloeiroDe(this.equipePorId(id))) {
        this.agendar(() => this.abrirLance(), MS_ENTRE_LANCES);
        return;
      }
    }

    this.cancelarRodada('as equipes se desfizeram no meio do leilao');
  }

  /**
   * Fecha o leilão. Quem fez o último lance entrega o presente: o parceiro
   * dele é quem vai ter que dizer as respostas prometidas.
   */
  fecharLeilao(quemDuvidou, equipeDuvidou) {
    this.limparTemporizador();
    this.leilao.fechado = true;

    const desafiada = this.equipePorId(this.leilao.equipeAposta);
    const respondedor = this.respondedorDe(desafiada);
    if (!respondedor) return this.cancelarRodada('a equipe do maior lance se desfez');

    this.leilao.quemDuvidou = quemDuvidou;
    this.leilao.equipeDuvidou = equipeDuvidou;
    this.leilao.respondedor = respondedor;
    // A rodada passa a pedir exatamente o que foi prometido. No Dando dicas
    // nao: la a rodada pede UMA palavra, e o lance e o teto de dicas que quem
    // ganhou tem para arrancar essa palavra do parceiro.
    if (!this.ehDandoDicas()) this.perguntaAtual.necessarias = this.leilao.aposta;

    const duvidoso = this.jogadores.get(quemDuvidou);
    const vitima = this.jogadores.get(respondedor);
    const dicador = this.jogadores.get(this.leilao.quemApostou);
    const quantas = `${this.leilao.aposta} ${this.leilao.aposta === 1 ? 'dica' : 'dicas'}`;

    this.emitir('leilao:fim', {
      aposta: this.leilao.aposta,
      equipeAposta: this.leilao.equipeAposta,
      equipeDuvidou,
      quemDuvidou,
      nicknameDuvidou: duvidoso ? duvidoso.nickname : '',
      respondedor,
      nicknameRespondedor: vitima ? vitima.nickname : '',
      // Dando dicas: a mesa acompanha os dois lados da dupla que levou.
      dicador: this.ehDandoDicas() ? this.leilao.quemApostou : null,
      nicknameDicador: dicador ? dicador.nickname : '',
      duracaoMs: MS_APOS_LEILAO
    });
    this.avisar(this.ehDandoDicas()
      ? `Ninguem foi mais baixo! ${dicador ? dicador.nickname : 'Quem levou o leilao'} tem ${
        quantas} para fazer ${vitima ? vitima.nickname : 'o parceiro'} acertar.`
      : this.ehLeilaoGeral()
        ? `Ninguem cobriu! ${vitima ? vitima.nickname : 'Quem levou o leilao'} tem que dizer ${this.leilao.aposta}.`
        : `${duvidoso ? duvidoso.nickname : 'Alguem'} duvidou! ${
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
    const porque = {
      tempo: 'nao respondeu a tempo',
      repetiu: 'repetiu uma resposta que ja tinha saido',
      errou: 'errou'
    }[motivo] || 'errou';
    this.avisar(`${jogador ? jogador.nickname : 'Alguem'} ${porque} e saiu da rodada.`);

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

    // Dando dicas tem duas bocas na rodada, e elas dizem coisas diferentes:
    // uma manda palavras soltas, a outra chuta a palavra secreta. Resolve tudo
    // ali, antes da conta de itens que os outros modos fazem.
    if (this.ehDandoDicas() && this.estado === 'pergunta') {
      return this.falarNaEntrega(socketId, jogador, limpo);
    }

    // Nos leilões quem responde é só quem levou o leilão. Se os outros
    // pudessem escrever, soprariam a lista inteira.
    if (this.ehLeilao() && this.estado === 'pergunta') {
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

    // 1 eh bom 2 ok 3 eh demais: o palpite e secreto ate a janela fechar. Da para
    // trocar de ideia quantas vezes quiser; vale o ultimo que ficou escrito.
    if (this.ehVeni() && this.estado === 'pergunta') {
      const trocou = this.palpitesVeni.has(socketId);
      this.palpitesVeni.set(socketId, limpo);
      this.emitir('veni:palpitou', {
        jogadorId: socketId,
        quantos: this.palpitesVeni.size,
        total: this.jogadores.size
      });
      // Travar a resposta e simplesmente responder. Com a mesa inteira
      // travada nao ha o que esperar do relogio: as respostas abrem na hora.
      this.travarSeTodosResponderam();
      return { veredito: 'palpite', texto: limpo, trocou };
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
        // No Carrossel, "quase" de um item que JA saiu nao vale como dica: a
        // mascara entregaria o que foi dito, e no as cegas lembrar e o jogo.
        if (this.ehCarrossel() && jaTenho.has(i)) continue;
        perto = true;
        if (r.erro < quaseErro) {
          quaseErro = r.erro;
          quaseAlvo = r.alvo;
        }
      }
    }
    if (repetido >= 0) novoItem = -1;

    // Carrossel: a vez se resolve aqui. Acertou, passa adiante. "Quase" é só
    // um aviso, e sobra tempo dos 7s para tentar de novo.
    if (this.ehCarrossel() && this.estado === 'pergunta') {
      if (novoItem >= 0) return this.acertoNoCarrossel(socketId, jogador, novoItem);
      if (perto) return { veredito: 'quase', dica: mascaraDeAcerto(limpo, quaseAlvo) };

      // Às cegas: errar não tira ninguém — só queima o relógio. O que elimina
      // é repetir o que já saiu, que é justamente o que o modo pede para
      // lembrar. E o palpite repetido não vai para o chat: lá ele diria a
      // todo mundo o que já foi dito.
      if (!this.mostraDitos()) {
        if (repetido < 0) return { veredito: 'errado' };
        this.eliminar(socketId, 'repetiu');
        return { veredito: 'eliminado', motivo: 'repetiu' };
      }

      // Visível: errar ou repetir o que está na tela, sai da rodada.
      const item = repetido >= 0 ? this.perguntaAtual.itens[repetido].oficial : null;
      this.publicarChat(jogador, limpo);
      this.eliminar(socketId, 'errou');
      return { veredito: 'eliminado', motivo: 'errou', repetido: item };
    }

    // Nos leilões errar não elimina — só queima o relógio, que já é o castigo.
    // Cada acerto é público, porque a mesa inteira está torcendo.
    if (this.ehLeilao() && this.estado === 'pergunta') {
      if (novoItem >= 0) return this.acertoNoPresente(socketId, jogador, novoItem);
      if (perto) return { veredito: 'quase', dica: mascaraDeAcerto(limpo, quaseAlvo) };
      if (repetido >= 0) {
        return { veredito: 'repetido', item: this.perguntaAtual.itens[repetido].oficial };
      }
      this.publicarChat(jogador, limpo);
      return { veredito: 'chat' };
    }

    // Mais ou Menos Pontos: a resposta vale a posicao dela na lista, e cada
    // item conta uma vez so na mesa — copiar do chat nao rende nada.
    if (this.ehRanking() && this.estado === 'pergunta') {
      if (this.acertos.has(socketId) || this.errouRanking.has(socketId)) {
        return { veredito: 'bloqueado' };
      }
      if (novoItem >= 0 && this.itensUsados.has(novoItem)) {
        repetido = novoItem;
        novoItem = -1;
      }
      if (novoItem >= 0) return this.acertoNoRanking(socketId, jogador, novoItem, agora);

      // Repetir nao gasta a vez: duas pessoas podem digitar o mesmo nome no
      // mesmo segundo, e quem chegou depois nao tem culpa disso.
      if (repetido >= 0) {
        return { veredito: 'repetido', item: this.perguntaAtual.itens[repetido].oficial };
      }
      if (perto) return { veredito: 'quase', dica: mascaraDeAcerto(limpo, quaseAlvo) };

      // Fora da lista: e uma vez so por rodada, entao a vez dele acabou aqui.
      this.errouRanking.add(socketId);
      this.publicarChat(jogador, limpo);
      if (this.todosAcertaram()) this.agendar(() => this.encerrarRodada(), MS_APOS_ULTIMO);
      return { veredito: 'errado', gastou: true };
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

    // No visível o acerto é público de propósito: os outros precisam saber o
    // que já saiu para não repetir na vez deles. No às cegas o nome NÃO vai —
    // é o que cada um tem que lembrar sozinho, e mandar no chat era entregar
    // a lista inteira.
    this.emitir('chat:mensagem', {
      tipo: 'acerto',
      jogadorId: socketId,
      nickname: jogador.nickname,
      avatar: jogador.avatar,
      pontos: PONTOS_POR_ITEM,
      texto: this.mostraDitos() ? nomeItem : null,
      item: true
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
   * Dando dicas: tudo que a dupla vencedora digita durante a entrega.
   *
   * Quem deu o lance manda DICAS — uma palavra de cada vez, e so tem as que
   * prometeu. O parceiro manda PALPITES. O resto da mesa assiste calado: quem
   * leiloou pelas outras duplas ja viu a palavra e entregaria tudo numa frase.
   */
  falarNaEntrega(socketId, jogador, texto) {
    const leilao = this.leilao;
    if (!leilao || !leilao.respondedor) return { veredito: 'bloqueado' };

    if (socketId === leilao.quemApostou) return this.darDica(socketId, jogador, texto);
    if (socketId === leilao.respondedor) return this.chutarPalavra(socketId, jogador, texto);
    return { erro: 'So a dupla que levou o leilao fala nesta rodada.' };
  }

  /** Uma dica na mesa: uma palavra, e nunca a resposta disfarcada. */
  darDica(socketId, jogador, texto) {
    const leilao = this.leilao;
    if (leilao.acertouEm !== null) return { erro: 'Seu parceiro ja acertou!' };
    if (/\s/.test(texto)) return { erro: 'Cada dica e uma palavra so.' };
    if (leilao.dicasUsadas.length >= leilao.aposta) {
      return { erro: 'Suas dicas acabaram. Agora e torcer.' };
    }
    if (this.dicaEntregaAPalavra(texto)) {
      return { erro: 'Essa palavra entrega a resposta. Escolha outra — esta nao conta.' };
    }

    leilao.dicasUsadas.push(texto);
    const restam = leilao.aposta - leilao.dicasUsadas.length;

    // A dica vai para a mesa inteira: e o espetaculo da rodada, e quem esta
    // de fora precisa ver do que a dupla foi capaz.
    this.publicarChat(jogador, texto);
    this.emitir('dicas:nova', {
      jogadorId: socketId,
      dica: texto,
      indice: leilao.dicasUsadas.length,
      total: leilao.aposta
    });

    return { veredito: 'dica', dica: texto, quantas: leilao.dicasUsadas.length, restam };
  }

  /** O palpite de quem esta adivinhando. Errar so queima relogio. */
  chutarPalavra(socketId, jogador, texto) {
    if (this.leilao.acertouEm !== null) return { veredito: 'bloqueado' };

    const alvo = this.perguntaAtual.itens[0];
    const r = avaliar(texto, alvo.oficial, alvo.variantes);

    if (r.veredito === 'certo') return this.acertoNaDica(socketId, jogador);
    if (r.veredito === 'quase') return { veredito: 'quase', dica: mascaraDeAcerto(texto, r.alvo) };

    // Errou: vai para o chat de propósito. Quem esta dando as dicas precisa
    // ouvir o chute torto para saber por onde puxar a proxima palavra.
    this.publicarChat(jogador, texto);
    return { veredito: 'chat' };
  }

  /**
   * A palavra saiu: a rodada acaba aqui e a conta e feita no `pagarDicas`.
   *
   * Guarda em que dica veio o acerto — nao muda a pontuacao (a rodada vale o
   * mesmo por uma dica ou por dez), mas e a historia que a tela conta.
   */
  acertoNaDica(socketId, jogador) {
    const palavra = this.perguntaAtual.resposta;
    this.leilao.acertouEm = this.leilao.dicasUsadas.length;
    this.progresso.set(socketId, new Set([0]));

    this.emitir('chat:mensagem', {
      tipo: 'acerto',
      jogadorId: socketId,
      nickname: jogador.nickname,
      avatar: jogador.avatar,
      pontos: 0,
      texto: palavra,
      item: true
    });
    this.emitir('dicas:acertou', {
      jogadorId: socketId,
      palavra,
      dicas: this.leilao.acertouEm,
      prometidas: this.leilao.aposta
    });

    this.agendar(() => this.encerrarRodada(), MS_APOS_ULTIMO);
    return { veredito: 'certo', item: palavra, quantos: 1, necessarias: 1, pontos: 0 };
  }

  /**
   * A dica esta carregando a resposta?
   *
   * Vale para os dois lados: `senna` dentro de "Ayrton Senna" e "formigueiro"
   * em volta de `Formiga`. Tres letras ja bastam para entregar (`sol` dentro
   * de `solar`), e perder uma dica boa por excesso de zelo custa menos do que
   * ver a palavra escapar de graca.
   */
  dicaEntregaAPalavra(texto) {
    const limpa = normalizar(texto);
    if (!limpa) return false;

    const formas = [this.perguntaAtual.resposta, ...(this.perguntaAtual.aceita || [])]
      .map(normalizar)
      .filter(Boolean);

    return formas.some((forma) => forma === limpa
      || (forma.length >= MIN_LETRAS_ENTREGA && limpa.includes(forma))
      || (limpa.length >= MIN_LETRAS_ENTREGA && forma.includes(limpa)));
  }

  /**
   * Presente Grego: um item entregue. Ainda não vale ponto nenhum — no fim é
   * tudo ou nada, e quem leva é a equipe que apostou ou a que duvidou.
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
    if (this.jogadores.size === 0) return false;
    // Mais ou Menos Pontos: quem chutou fora da lista tambem ja jogou a vez
    // dele, entao nao ha mais o que esperar dele nesta rodada.
    const gastaram = this.ehRanking()
      ? this.acertos.size + this.errouRanking.size
      : this.acertos.size;
    return gastaram >= this.jogadores.size;
  }

  /**
   * Fecha a conta do Presente Grego: é tudo ou nada.
   *
   * Entregou o que foi prometido, a equipe que apostou leva; faltou um item que
   * seja, quem duvidou leva. Nos dois casos o prêmio é o tamanho da aposta —
   * por isso o lance alto é tentador e perigoso na mesma medida.
   */
  pagarPresente() {
    const leilao = this.leilao;
    if (!leilao || !leilao.respondedor) return;

    leilao.ditas = (this.progresso.get(leilao.respondedor) || new Set()).size;
    leilao.conseguiu = leilao.ditas >= leilao.aposta;
    leilao.premio = leilao.aposta * PONTOS_POR_APOSTA;

    const vencedora = this.equipePorId(leilao.conseguiu ? leilao.equipeAposta : leilao.equipeDuvidou);
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

  /**
   * Fecha a conta do Dando dicas: a rodada e que vale, nao a dica.
   *
   * Sair em uma dica ou em dez paga igual — o lance baixo nao rende mais
   * ponto, rende o direito de tentar. O que ele compra e o risco: se a palavra
   * nao sai, a rodada inteira vai para as OUTRAS duplas, que passaram
   * justamente por acharem a promessa grande demais.
   */
  pagarDicas() {
    const leilao = this.leilao;
    if (!leilao || !leilao.respondedor) return;

    leilao.ditas = leilao.dicasUsadas.length;
    leilao.conseguiu = leilao.acertouEm !== null;
    leilao.premio = PONTOS_POR_RODADA_DICAS;

    // Só as duplas que estavam no leilão dividem a rodada; uma dupla que se
    // desfez no meio não leva nada.
    const donas = leilao.conseguiu
      ? [this.equipePorId(leilao.equipeAposta)]
      : leilao.equipes.filter((id) => id !== leilao.equipeAposta).map((id) => this.equipePorId(id));

    for (const dupla of donas) {
      if (!dupla) continue;
      for (const id of this.presentesDe(dupla)) {
        const jogador = this.jogadores.get(id);
        if (!jogador) continue;
        jogador.pontos += leilao.premio;
        this.pontosRodada.set(id, (this.pontosRodada.get(id) || 0) + leilao.premio);
        this.acertos.set(id, { ms: null, pontos: leilao.premio, posicao: null, bonus: 0 });
      }
    }

    const adivinhou = this.jogadores.get(leilao.respondedor);
    if (adivinhou && leilao.conseguiu) adivinhou.acertos += 1;
  }

  /**
   * Leilao Geral: quem levou o leilao ganha 2 pontos por resposta que deu.
   * Se nao chegou no que prometeu, cada um dos outros leva a aposta — e ele
   * fica so com o que entregou.
   */
  pagarLeilaoGeral() {
    const leilao = this.leilao;
    if (!leilao || !leilao.respondedor) return;

    leilao.ditas = (this.progresso.get(leilao.respondedor) || new Set()).size;
    leilao.conseguiu = leilao.ditas >= leilao.aposta;
    leilao.premio = leilao.ditas * PONTOS_POR_APOSTA;
    leilao.consolo = leilao.conseguiu ? 0 : leilao.aposta;

    const dono = this.jogadores.get(leilao.respondedor);
    if (dono) {
      dono.pontos += leilao.premio;
      this.pontosRodada.set(dono.id, (this.pontosRodada.get(dono.id) || 0) + leilao.premio);
      this.acertos.set(dono.id, { ms: null, pontos: leilao.premio, posicao: null, bonus: 0 });
      if (leilao.conseguiu) dono.acertos += 1;
    }

    if (leilao.consolo <= 0) return;
    for (const jogador of this.jogadores.values()) {
      if (jogador.id === leilao.respondedor) continue;
      jogador.pontos += leilao.consolo;
      this.pontosRodada.set(jogador.id, (this.pontosRodada.get(jogador.id) || 0) + leilao.consolo);
      this.acertos.set(jogador.id, { ms: null, pontos: leilao.consolo, posicao: null, bonus: 0 });
    }
  }

  /**
   * Mais ou Menos Pontos: paga a posicao do item na lista.
   *
   * O primeiro da lista rende 1 ponto e o ultimo rende o tamanho dela: dizer o
   * obvio quase nao pontua, e lembrar de quem esta la no fim vale uma rodada
   * inteira. O item dito vai publico no chat, senao os outros repetiriam.
   */
  acertoNoRanking(socketId, jogador, indice, agora) {
    const pontos = indice + 1;
    const nomeItem = this.perguntaAtual.itens[indice].oficial;
    const ms = agora - this.inicioPergunta;
    const posicao = this.acertos.size + 1;

    this.itensUsados.add(indice);
    this.progresso.set(socketId, new Set([indice]));

    jogador.pontos += pontos;
    this.pontosRodada.set(socketId, pontos);
    if (this.primeiroAcertoEm === null) this.primeiroAcertoEm = agora;
    this.acertos.set(socketId, { ms, pontos, posicao, bonus: 0 });
    jogador.acertos += 1;

    this.emitir('chat:mensagem', {
      tipo: 'acerto',
      jogadorId: socketId,
      nickname: jogador.nickname,
      avatar: jogador.avatar,
      pontos,
      posicao,
      ms,
      necessarias: 1,
      texto: `${nomeItem} — ${pontos}o da lista`,
      item: true
    });

    this.emitir('rodada:acertou', {
      jogadorId: socketId,
      totalAcertos: this.acertos.size,
      totalJogadores: this.jogadores.size,
      placar: this.placar()
    });

    if (this.todosAcertaram()) this.agendar(() => this.encerrarRodada(), MS_APOS_ULTIMO);

    return { veredito: 'certo', pontos, posicao, item: nomeItem, quantos: 1, necessarias: 1 };
  }

  /** O que esta pessoa fez na rodada de leilao, para o resultado. */
  papelNoPresente(socketId) {
    if (!this.ehLeilao() || !this.leilao) return null;

    // No Dando dicas os dois lados da dupla trabalham, e cada um do seu jeito.
    if (this.ehDandoDicas()) {
      if (this.leilao.quemApostou === socketId) return 'dicou';
      if (this.leilao.respondedor === socketId) return 'adivinhou';
      const dupla = this.equipeDe(socketId);
      return dupla && this.leilao.fora.includes(dupla.id) ? 'passou' : null;
    }

    if (this.leilao.respondedor === socketId) return 'respondeu';
    if (this.leilao.quemApostou === socketId) return 'apostou';
    if (this.leilao.quemDuvidou === socketId && !this.ehLeilaoGeral()) return 'duvidou';
    if (this.ehLeilaoGeral()) {
      const posto = this.equipes.find((e) => e.jogadores.includes(socketId));
      if (posto && this.leilao.fora.includes(posto.id)) return 'passou';
    }
    return null;
  }

  /** Como o leilão terminou, para a tela de resultado. */
  resumoDoPresente() {
    const l = this.leilao;
    if (!l) return null;
    return {
      modo: this.config.modo,
      aposta: l.aposta,
      ditas: l.ditas,
      premio: l.premio,
      consolo: l.consolo || 0,
      conseguiu: l.conseguiu,
      respondedor: l.respondedor,
      equipeAposta: l.equipeAposta,
      equipeDuvidou: l.equipeDuvidou,
      equipeVencedora: l.conseguiu ? l.equipeAposta : l.equipeDuvidou,
      historico: l.historico,
      // Dando dicas: as palavras que foram gastas e em qual delas a ficha caiu.
      dicasUsadas: l.dicasUsadas,
      acertouEm: l.acertouEm,
      equipes: this.equipes.map((d) => ({ id: d.id, nome: d.nome, icone: d.icone, cor: d.cor }))
    };
  }

  /* --------------------- Pular a rodada por votação --------------------- */

  /** Metade mais um: 2 votos numa sala de 3, 3 numa de 4, 4 numa de 6. */
  votosParaPular() {
    return Math.floor(this.jogadores.size / 2) + 1;
  }

  /** A partida esta rolando, em qualquer fase dela. */
  emPartida() {
    return this.estado !== 'lobby' && this.estado !== 'fim';
  }

  /** A rodada está no ar, em qualquer uma das fases em que dá para pular. */
  rodadaNoAr() {
    return this.estado === 'categoria' || this.estado === 'leilao' || this.estado === 'pergunta';
  }

  /**
   * Voto para pular a rodada. Clicar de novo tira o voto — a pessoa pode
   * mudar de ideia enquanto a votação não fecha.
   */
  votarPular(socketId) {
    if (!this.jogadores.has(socketId)) return { erro: 'Voce nao esta nesta sala.' };
    if (!this.rodadaNoAr()) return { erro: 'Nao ha rodada para pular agora.' };

    if (this.pulos.has(socketId)) this.pulos.delete(socketId);
    else this.pulos.add(socketId);

    const necessarios = this.votosParaPular();
    const jogador = this.jogadores.get(socketId);
    this.avisar(this.pulos.has(socketId)
      ? `${jogador.nickname} quer pular (${this.pulos.size} de ${necessarios}).`
      : `${jogador.nickname} tirou o voto de pular (${this.pulos.size} de ${necessarios}).`);

    this.emitir('rodada:pular', {
      votos: this.pulos.size,
      necessarios,
      quem: [...this.pulos]
    });

    if (this.pulos.size >= necessarios) this.pularRodada();
    return { ok: true, votou: this.pulos.has(socketId), votos: this.pulos.size, necessarios };
  }

  /**
   * A maioria não quis esta rodada: ela morre aqui e a próxima começa.
   *
   * A resposta é revelada mesmo assim — quem votou para pular normalmente
   * votou por não saber, e ficar sem saber é pior que a rodada perdida.
   *
   * O que já foi ganho na rodada continua ganho. Tirar ponto de quem acertou
   * antes da votação fechar transformaria o botão em castigo, e o voto de
   * pular é para destravar a mesa, não para punir quem sabia.
   */
  pularRodada() {
    if (!this.rodadaNoAr()) return;
    this.limparTemporizador();
    this.estado = 'resultado';

    const pergunta = this.perguntaAtual;
    const resposta = pergunta ? this.revelacaoSimples(pergunta) : { texto: '—', lista: [] };

    this.avisar(`A sala pulou a rodada. A resposta era: ${resposta.texto}`, true);

    this.emitir('rodada:resultado', {
      rodada: this.rodada,
      titulo: 'Rodada pulada',
      resposta: resposta.texto,
      listaCompleta: resposta.lista,
      listaParcial: resposta.parcial,
      necessarias: pergunta ? pergunta.necessarias : 0,
      aceita: pergunta ? pergunta.aceita : [],
      // Rodada pulada não mede a pergunta: quase ninguém tentou responder.
      dificuldade: { valor: 0, nivel: 'sem conta', cor: '#6f6791' },
      detalhes: [],
      placar: this.placar(),
      duracaoMs: MS_RESULTADO,
      acabou: false
    });

    this.agendar(() => this.proximaRodada(), MS_RESULTADO);
  }

  /**
   * A resposta sem o que é de cada modo — serve para a rodada que acabou
   * antes de ser jogada.
   */
  revelacaoSimples(pergunta) {
    if (pergunta.necessarias === 1 && pergunta.resposta) {
      return { texto: pergunta.resposta, lista: [], parcial: false };
    }
    if (pergunta.fixo) {
      const lista = pergunta.itens.map((i) => i.oficial);
      return { texto: lista.join(', '), lista, parcial: false };
    }
    return {
      texto: `qualquer ${pergunta.necessarias} de ${pergunta.itens.length} possiveis`,
      lista: embaralhar(pergunta.itens.map((i) => i.oficial)).slice(0, 12),
      parcial: true
    };
  }

  /**
   * Rodada que não tem como continuar (alguém saiu no meio do leilão, uma
   * equipe se desfez). Ninguém pontua e a partida segue na rodada seguinte.
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

    if (this.ehDandoDicas()) this.pagarDicas();
    else if (this.ehLeilaoGeral()) this.pagarLeilaoGeral();
    else if (this.ehPresenteGrego()) this.pagarPresente();

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
    const novaDificuldade = this.ehLeilao() || this.ehRanking()
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
        // Presente Grego e Dando dicas: de que time é e o que fez nesta rodada.
        equipe: this.temEquipes() ? (this.equipeDe(jogador.id) || {}).id || null : null,
        papel: this.papelNoPresente(jogador.id)
      };
    });

    detalhes.sort((a, b) => (a.posicao ?? Infinity) - (b.posicao ?? Infinity));

    const vencedores = [...this.jogadores.values()].filter((j) => j.pontos >= this.config.metaPontos);

    // Como revelar depende do tipo: uma resposta só, um conjunto fechado
    // ("os 8 campeoes do mundo") ou um repertório aberto ("paises da Africa").
    let textoResposta;
    let listaCompleta = [];

    if (this.ehDandoDicas()) {
      const l = this.leilao;
      const dicador = this.jogadores.get(l.quemApostou);
      const adivinhou = this.jogadores.get(l.respondedor);
      const dupla = this.equipePorId(l.equipeAposta);
      const quantas = `${l.aposta} ${l.aposta === 1 ? 'dica' : 'dicas'}`;
      textoResposta = l.conseguiu
        ? `${adivinhou ? adivinhou.nickname : 'O parceiro'} disse "${pergunta.resposta}" na dica ${
          l.acertouEm} de ${l.aposta} — a ${dupla ? dupla.nome : 'dupla'} leva ${l.premio} pts`
        : `a palavra era ${pergunta.resposta}, e ${quantas} nao bastaram — ${
          l.premio} pts para cada uma das outras duplas`;
    } else if (this.ehLeilaoGeral()) {
      const l = this.leilao;
      const dono = this.jogadores.get(l.respondedor);
      const nome = dono ? dono.nickname : 'Quem levou o leilao';
      listaCompleta = embaralhar(
        pergunta.itens.filter((_, i) => !this.itensUsados.has(i)).map((i) => i.oficial)
      ).slice(0, 12);
      textoResposta = l.conseguiu
        ? `${nome} prometeu ${l.aposta} e entregou — leva ${l.premio} pts`
        : `${nome} disse ${l.ditas} de ${l.aposta} — leva ${l.premio} pts, e cada um dos outros leva ${l.consolo}`;
    } else if (this.ehPresenteGrego()) {
      const l = this.leilao;
      const entregador = this.jogadores.get(l.respondedor);
      const nome = entregador ? entregador.nickname : 'Quem foi desafiado';
      const dono = this.equipePorId(l.conseguiu ? l.equipeAposta : l.equipeDuvidou);
      listaCompleta = embaralhar(
        pergunta.itens.filter((_, i) => !this.itensUsados.has(i)).map((i) => i.oficial)
      ).slice(0, 12);
      const quantas = `${l.aposta} ${l.aposta === 1 ? 'resposta' : 'respostas'}`;
      textoResposta = l.conseguiu
        ? `${nome} entregou ${quantas} — a ${dono ? dono.nome : 'equipe'} leva ${l.premio} pts`
        : `${nome} disse ${l.ditas} de ${l.aposta} — a ${dono ? dono.nome : 'equipe'} leva ${l.premio} pts por ter duvidado`;
    } else if (this.ehRanking()) {
      // A lista ainda tem voltas pela frente: mostrar o topo agora entregaria
      // as respostas das proximas. Entao so sai o que a mesa mesma ja disse,
      // com a posicao de cada um, e o topo fica para a ultima volta.
      const posicoes = [...this.itensUsados].sort((a, b) => a - b);
      if (this.voltaRanking < VOLTAS_RANKING) {
        listaCompleta = posicoes.slice(0, 12).map((i) => `${i + 1}. ${pergunta.itens[i].oficial}`);
        textoResposta = `volta ${this.voltaRanking} de ${VOLTAS_RANKING} — a mesma lista volta na proxima, sem repetir o que ja saiu`;
      } else {
        listaCompleta = pergunta.itens.slice(0, 12).map((i, k) => `${k + 1}. ${i.oficial}`);
        const ultimo = pergunta.itens[pergunta.itens.length - 1].oficial;
        textoResposta = `a lista tinha ${pergunta.itens.length} nomes — do 1 ponto ate ${
          pergunta.itens.length} (${ultimo})`;
      }
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

    this.avisar(this.ehLeilao()
      ? `Fim do leilao: ${textoResposta}`
      : `A resposta era: ${textoResposta}`, true);

    this.emitir('rodada:resultado', {
      rodada: this.rodada,
      // O Presente Grego não tem "a resposta certa": tem uma aposta que saiu
      // ou não saiu.
      titulo: this.ehLeilao() ? 'Fim do leilao' : 'Resposta certa',
      resposta: textoResposta,
      presente: this.ehLeilao() ? this.resumoDoPresente() : null,
      // 1 eh bom 2 ok 3 eh demais: no fim aparecem as tres, ate as que nao deu tempo de ler.
      dicas: this.ehVeni() ? pergunta.dicas : null,
      // Dando dicas: as palavras que a dupla gastou, na ordem em que sairam.
      dicasDadas: this.ehDandoDicas() && this.leilao ? this.leilao.dicasUsadas : null,
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
    this.pulos = new Set();
    this.errouRanking = new Set();
    this.voltaRanking = 0;
    this.itensJaDitos = new Set();
    // As equipes continuam como estavam: quem já escolheu não escolhe de novo.
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
        const equipe = this.temEquipes() ? this.equipeDe(j.id) : null;
        return {
          id: j.id,
          nickname: j.nickname,
          avatar: j.avatar,
          pontos: j.pontos,
          acertos: j.acertos,
          lider: j.lider,
          // Nos modos em equipe todo mundo do time pontua junto, então o
          // placar precisa dizer quem é de quem.
          equipe: equipe ? equipe.id : null,
          equipeNome: equipe ? equipe.nome : null,
          equipeIcone: equipe ? equipe.icone : null
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
      equipes: this.equipes.map((e) => ({
        id: e.id, nome: e.nome, icone: e.icone, cor: e.cor, jogadores: e.jogadores
      })),
      tetoEquipe: this.tamanhoEquipe,
      // O saguao desenha os + e − a partir daqui, e a dica embaixo da lista
      // vem pronta do servidor: a regra de quem pode comecar mora em um lugar so.
      formato: this.temEquipes()
        ? {
            equipes: this.equipes.length,
            tamanho: this.tamanhoEquipe,
            minEquipes: MIN_EQUIPES,
            maxEquipes: MAX_EQUIPES,
            minTamanho: MIN_TAMANHO_EQUIPE,
            maxTamanho: MAX_TAMANHO_EQUIPE,
            rotulo: this.rotuloEquipe(),
            semEquipe: this.semEquipe(),
            falta: this.oQueFaltaNasEquipes()
          }
        : null,
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

/**
 * Categorias que entram no sorteio: as marcadas e as que só tiveram alguma
 * parte marcada.
 */
function categoriasEmJogo(config) {
  const donas = (config.subs || []).map((s) => String(s).split(':')[0]);
  const ids = new Set([...(config.categorias || []), ...donas]);
  return CATEGORIAS.map((c) => c.id).filter((id) => ids.has(id));
}

/**
 * As perguntas de uma categoria conforme as partes escolhidas.
 *
 * Categoria marcada vem inteira, menos as partes desmarcadas (`fora`).
 * Categoria desmarcada com parte marcada (`subs`) traz só essas partes.
 */
function perguntasEscolhidas(config, idCategoria) {
  const prefixo = idCategoria + ':';
  const partes = (lista) => new Set((lista || [])
    .filter((s) => s.startsWith(prefixo)).map((s) => s.slice(prefixo.length)));
  const todas = (QUESTOES[idCategoria] || []).map((p) => ({ ...p, categoria: idCategoria }));

  if ((config.categorias || []).includes(idCategoria)) {
    const fora = partes(config.fora);
    return todas.filter((p) => !(p.sub && fora.has(p.sub)));
  }
  const soEstas = partes(config.subs);
  return todas.filter((p) => p.sub && soEstas.has(p.sub));
}

module.exports = {
  Sala, AVATARES, CATEGORIAS, MODOS, MAX_JOGADORES, MAX_TEXTO,
  gerarCodigo, calcularPontos, indicePerguntas, categoriasEmJogo, perguntasEscolhidas
};
