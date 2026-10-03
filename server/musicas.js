'use strict';

/**
 * As musicas dos dois modos musicais: Corrida musical e Qual e a musica.
 *
 * Nao ha banco proprio: as musicas sao os trechos de "Ouvir musicas", que ja
 * trazem as duas perguntas de cada um — "Qual e o nome desta musica?" e
 * "Quem canta esta musica?" (ou "Qual banda/dupla/grupo canta…"). O catalogo
 * so junta as duas pelo arquivo do trecho e anota o estilo de cada musica.
 *
 * O estilo existe por causa das quatro opcoes do Qual e a musica: as erradas
 * tem que ser plausiveis. Um sertanejo no meio de tres rocks gringos se
 * entrega sozinho; no meio de tres sertanejos, so quem conhece acerta.
 */

const { QUESTOES } = require('./questions');
const { avaliar } = require('./comparar');

/* ------------------------------- Os estilos ------------------------------- *
 *
 * Cada trecho de public/audio entra em exatamente um estilo — o teste cobra.
 * A `familia` e o segundo degrau: sem opcoes que cheguem no mesmo estilo, as
 * que faltam saem da mesma familia (musica brasileira com brasileira, gringa
 * com gringa), porque o idioma do titulo tambem entrega a resposta.
 */
const ESTILOS = [
  {
    id: 'pop', familia: 'gringa',
    trechos: [
      'as-it-was', 'baby', 'bang-bang', 'billie-jean', 'birds-of-a-feather', 'blinding-lights',
      'cant-take-my-eyes-off-you', 'die-with-a-smile', 'dont-start-now', 'firework', 'flowers',
      'good-4-u', 'heat-waves', 'hot-n-cold', 'it-aint-me', 'love-yourself', 'night-changes',
      'perfect', 'photograph', 'poker-face', 'shape-of-you', 'someone-you-loved', 'starboy',
      'stay', 'steal-my-girl', 'story-of-my-life', 'the-climb', 'the-one-that-got-away',
      'thinking-out-loud', 'umbrella', 'what-makes-you-beautiful', 'wrecking-ball'
    ]
  },
  {
    id: 'rock', familia: 'gringa',
    trechos: [
      'a-sky-full-of-stars', 'american-idiot', 'back-in-black', 'believer', 'dont-look-back-in-anger',
      'highway-to-hell', 'i-wanna-be-yours', 'in-the-end', 'mr-brightside', 'patience',
      'perfect-simple-plan', 'sweater-weather', 'sweet-child-o-mine', 'the-night-we-met',
      'viva-la-vida', 'wish-you-were-here', 'wonderwall', 'yellow', 'you-shook-me-all-night-long'
    ]
  },
  {
    // Rap, hip hop e R&B de fora.
    id: 'rap', familia: 'gringa',
    trechos: [
      'dont-matter', 'empire-state-of-mind', 'gods-plan', 'kiss-kiss', 'lose-yourself',
      'mockingbird', 'one-dance', 'sunflower', 'till-i-collapse'
    ]
  },
  {
    id: 'latina', familia: 'gringa',
    trechos: ['dai-dai', 'dtmf', 'envolver', 'hips-dont-lie', 'waka-waka']
  },
  {
    // Abertura de serie e trilha de anime.
    id: 'trilha', familia: 'gringa',
    trechos: ['found-a-way', 'leave-it-all-to-me', 'sadness-and-sorrow']
  },
  {
    id: 'sertanejo', familia: 'brasil',
    trechos: [
      'anti-amor', 'borboletas', 'calcinha-de-renda', 'chuva-de-arroz', 'cor-de-ouro',
      'dentro-da-hilux', 'dormi-na-praca', 'e-o-amor', 'fada', 'molhando-o-volante',
      'o-que-e-que-tem', 'propaganda', 'tudo-que-voce-quiser'
    ]
  },
  {
    id: 'funk', familia: 'brasil',
    trechos: [
      'agora-to-solteira', 'beijinho-no-ombro', 'hoje-eu-vou-parar-na-gaiola', 'namora-ai',
      'novidade-na-area', 'pow-pow-tey-tey', 'renasci-das-cinzas', 'se-eu-tiver-solteiro'
    ]
  },
  {
    // Rock e rap daqui.
    id: 'nacional', familia: 'brasil',
    trechos: ['diario-de-um-detento', 'levo-comigo', 'menina-estranha', 'vida-loka-parte-2']
  }
];

const ESTILO_DO_TRECHO = new Map();
for (const estilo of ESTILOS) {
  for (const trecho of estilo.trechos) ESTILO_DO_TRECHO.set(trecho, estilo);
}

/** "/audio/trecho-yellow.mp3" -> "yellow" */
function trechoDe(audio) {
  return String(audio || '').replace(/^.*\/trecho-/, '').replace(/\.mp3$/, '');
}

// As duas perguntas que os modos sabem fazer. "De qual serie e esta musica?"
// fica de fora: nao e nem o nome nem quem canta.
const PERGUNTA_NOME = /nome desta musica/i;
const PERGUNTA_QUEM = /canta esta musica/i;

/**
 * Uma entrada por trecho: o audio, o estilo e as duas perguntas dele.
 *
 * As perguntas sao os proprios objetos do banco — com o `aceita` ja completo
 * pelos atalhos de sobrenome —, entao o modo musical confere a resposta
 * exatamente como o Modo Tempo confere.
 */
function montarCatalogo(perguntas) {
  const porAudio = new Map();
  for (const q of perguntas) {
    if (!q.audio) continue;
    const trecho = trechoDe(q.audio);
    const estilo = ESTILO_DO_TRECHO.get(trecho);
    const musica = porAudio.get(q.audio) || {
      audio: q.audio,
      trecho,
      estilo: estilo ? estilo.id : null,
      familia: estilo ? estilo.familia : null,
      nome: null,
      quem: null
    };
    if (PERGUNTA_NOME.test(q.pergunta)) musica.nome = q;
    else if (PERGUNTA_QUEM.test(q.pergunta)) musica.quem = q;
    porAudio.set(q.audio, musica);
  }
  return [...porAudio.values()];
}

const CATALOGO = montarCatalogo(QUESTOES.ouvir || []);

/** O que perguntar: o nome da musica, quem canta, ou um dos dois por rodada. */
const PERGUNTAR = ['nome', 'quem', 'os-dois'];

/** As musicas que servem para o que a sala escolheu perguntar. */
function musicasPara(perguntar, catalogo = CATALOGO) {
  if (perguntar === 'nome') return catalogo.filter((m) => m.nome);
  if (perguntar === 'quem') return catalogo.filter((m) => m.quem);
  return catalogo.filter((m) => m.nome || m.quem);
}

/* ------------------------------ As opcoes ------------------------------ */

/** Banda, dupla ou artista solo — "Qual dupla canta" pede opcoes de dupla. */
function jeitoDe(q) {
  const texto = q ? q.pergunta : '';
  if (/dupla/i.test(texto)) return 'dupla';
  if (/banda|grupo/i.test(texto)) return 'banda';
  return 'solo';
}

/**
 * Quao boa uma musica e como fonte de opcao errada para outra: 0 e a melhor.
 *
 * O estilo pesa mais que tudo; no quem canta, banda com banda e dupla com
 * dupla vem logo atras — "Qual dupla canta" com tres cantores solo nas
 * opcoes se resolve por eliminacao.
 */
function distanciaDeEstilo(musica, outra, tipo) {
  const mesmoJeito = tipo !== 'quem' || jeitoDe(musica.quem) === jeitoDe(outra.quem);
  if (musica.estilo === outra.estilo) return mesmoJeito ? 0 : 1;
  if (musica.familia === outra.familia) return mesmoJeito ? 2 : 3;
  return mesmoJeito ? 4 : 5;
}

/**
 * Duas respostas que o jogador confundiria: iguais, quase iguais ou uma
 * dentro da outra ("Drake" e "Drake Bell", "Love Yourself" e "Lose Yourself").
 *
 * Vale contra cada forma aceita de `b`: Leave It All to Me aceita "Drake
 * Bell", e "Drake" nas opcoes pegaria justamente quem sabia a resposta.
 */
function parecidas(a, b, aceitasDeB = []) {
  return [b, ...aceitasDeB].some((forma) => avaliar(a, forma).veredito !== 'chat'
    || avaliar(forma, a).veredito !== 'chat');
}

function embaralhar(lista) {
  const copia = lista.slice();
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * As quatro opcoes de uma rodada do Qual e a musica, ja embaralhadas.
 *
 * A certa e a resposta da pergunta; as tres erradas saem das outras musicas,
 * do estilo mais parecido para o menos parecido. Nenhuma errada pode ser
 * tambem uma resposta aceita: "Jay-Z" esta em Umbrella, "Jorge e Mateus" em
 * Anti-Amor, e "Drake Bell" canta Leave It All to Me junto com a Miranda.
 *
 * @returns {{opcoes:string[], certa:number}}
 */
function opcoesPara(musica, tipo, catalogo = CATALOGO, quantas = 4) {
  const certa = musica[tipo];
  const candidatas = embaralhar(catalogo.filter((outra) => outra !== musica && outra[tipo]))
    // Estavel: dentro do mesmo degrau a ordem continua sorteada.
    .sort((a, b) => distanciaDeEstilo(musica, a, tipo) - distanciaDeEstilo(musica, b, tipo));

  const erradas = [];
  for (const outra of candidatas) {
    if (erradas.length >= quantas - 1) break;
    const texto = outra[tipo].resposta;
    if (parecidas(texto, certa.resposta, certa.aceita || [])) continue;
    if (erradas.some((ja) => parecidas(texto, ja))) continue;
    erradas.push(texto);
  }

  const opcoes = embaralhar([certa.resposta, ...erradas]);
  return { opcoes, certa: opcoes.indexOf(certa.resposta) };
}

/* ---------------------------- Configuracao ---------------------------- */

const MUSICAS_MIN = 3;
const MUSICAS_MAX = 50;
const MUSICAS_PADRAO = 10;
const MUSICAS_SUGERIDAS = [5, 10, 15, 20];

/**
 * A parte da configuracao que so os modos musicais tem. Nunca confia no
 * cliente: o que vier torto cai no padrao, menos o numero de musicas, que
 * volta como erro para a pessoa corrigir.
 */
function configMusical(bruta = {}) {
  const perguntar = PERGUNTAR.includes(bruta.perguntar) ? bruta.perguntar : 'os-dois';
  const fim = bruta.fim === 'musicas' ? 'musicas' : 'pontos';
  if (fim === 'pontos') return { config: { perguntar, fim, musicas: null } };

  const musicas = Number(bruta.musicas);
  if (!Number.isInteger(musicas) || musicas < MUSICAS_MIN || musicas > MUSICAS_MAX) {
    return { erro: `A partida tem de ${MUSICAS_MIN} a ${MUSICAS_MAX} musicas.` };
  }
  return { config: { perguntar, fim, musicas } };
}

module.exports = {
  CATALOGO, ESTILOS, PERGUNTAR,
  MUSICAS_MIN, MUSICAS_MAX, MUSICAS_PADRAO, MUSICAS_SUGERIDAS,
  montarCatalogo, musicasPara, opcoesPara, trechoDe, jeitoDe, configMusical
};
