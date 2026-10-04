'use strict';

/**
 * A aba Estatisticas: quantas vezes cada pergunta caiu, quanto acertam e em
 * quanto tempo.
 *
 * Nao guarda nada proprio. Junta os dois contadores que ja existiam:
 *
 *   - `usos.js` conta toda vez que a pergunta entrou em jogo, em qualquer
 *     modo. E o "vezes" da aba;
 *   - `dificuldade.js` guarda, das rodadas que medem a pergunta (os leiloes
 *     e o Mais ou Menos Pontos ficam de fora), quantas pessoas podiam
 *     responder, quantas acertaram e o tempo medio do acerto.
 *
 * A resposta nao sai daqui: a aba e publica, e aberta noutra guia viraria
 * cola no meio da partida. Pelo mesmo motivo a busca so olha o texto da
 * pergunta — buscar "Brasil" nao pode achar o mapa do Brasil. A imagem e o
 * audio saem, porque sao a propria pergunta (a partida ja os manda para o
 * navegador) e sao o que separa "Que pais e este?" de "Que pais e este?".
 */

const dificuldade = require('./dificuldade');
const usos = require('./usos');

const TAMANHO_PADRAO = 50;
const TAMANHO_MAXIMO = 100;
const BUSCA_MAXIMA = 80;

/** Texto sem acento, minusculo e com um espaco entre as palavras, para a busca. */
function paraBusca(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Sem dado (nunca respondida) vai sempre para o fim, nas duas direcoes.
const nulosNoFim = (campo, sentido) => (a, b) => {
  if (a[campo] === null || b[campo] === null) return (a[campo] === null) - (b[campo] === null);
  return sentido * (a[campo] - b[campo]);
};

/** As ordens da aba. A primeira de cada par e a que o cabecalho da coluna usa. */
const ORDENS = {
  vezes: (a, b) => b.vezes - a.vezes,
  'menos-vezes': (a, b) => a.vezes - b.vezes,
  acerto: nulosNoFim('taxa', -1),
  'menos-acerto': nulosNoFim('taxa', 1),
  rapidas: nulosNoFim('tempoMedioMs', 1),
  lentas: nulosNoFim('tempoMedioMs', -1),
  dificuldade: (a, b) => b.dificuldade - a.dificuldade,
  'menos-dificuldade': (a, b) => a.dificuldade - b.dificuldade
};
const ORDEM_PADRAO = 'vezes';

// Empate: a mais jogada primeiro, depois em ordem alfabetica, e o id no fim
// para a pagina 2 nunca repetir nem pular ninguem da pagina 1.
const alfabetica = new Intl.Collator('pt').compare;
function desempate(a, b) {
  return (b.vezes - a.vezes) || (b.respostas - a.respostas)
    || alfabetica(a.pergunta, b.pergunta) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/**
 * O indice das perguntas ja com o texto da busca. O indice nao muda com o
 * servidor no ar, entao isto roda uma vez so.
 */
const preparados = new WeakMap();
function preparar(indice) {
  if (!preparados.has(indice)) {
    preparados.set(indice, [...indice].map(([id, meta]) => ({ id, meta, texto: paraBusca(meta.pergunta) })));
  }
  return preparados.get(indice);
}

/** A linha de uma pergunta: o que ja caiu dela e o que a sala fez. */
function linhaDe(id, meta, fontes) {
  const dados = fontes.estatisticaDe(id);
  const respostas = dados ? dados.jogadores : 0;
  const acertos = dados ? dados.acertos : 0;
  const valor = dados ? dados.dificuldade : meta.base;
  return {
    id,
    categoria: meta.categoria,
    sub: meta.sub || null,
    pergunta: meta.pergunta,
    imagem: meta.imagem || null,
    audio: meta.audio || null,
    // O rodizio conta toda entrada; a dificuldade so as que medem. Se o
    // rodizio chegou depois de a dificuldade ja ter contado, vale o maior.
    vezes: Math.max(fontes.usosDe(id), dados ? dados.vezes : 0),
    respostas,
    acertos,
    taxa: respostas ? acertos / respostas : null,
    tempoMedioMs: acertos ? dados.tempoMedio : null,
    dificuldade: valor,
    nivel: dificuldade.nivelDe(valor).nome
  };
}

/** Os totais do recorte: o acerto e o tempo pesam pelo numero de respostas. */
function resumir(linhas) {
  let feitas = 0, vezes = 0, respostas = 0, acertos = 0, somaTempo = 0;
  for (const l of linhas) {
    if (l.vezes) feitas++;
    vezes += l.vezes;
    respostas += l.respostas;
    acertos += l.acertos;
    if (l.tempoMedioMs !== null) somaTempo += l.tempoMedioMs * l.acertos;
  }
  return {
    perguntas: linhas.length,
    feitas,
    vezes,
    respostas,
    acertos,
    acerto: respostas ? Math.round((acertos / respostas) * 100) : null,
    tempoMedioMs: acertos ? Math.round(somaTempo / acertos) : null
  };
}

/** Le os filtros da URL, aceitando so o que existe. */
function lerFiltros(query = {}) {
  const texto = (v) => (typeof v === 'string' ? v : '');
  const inteiro = (v, padrao) => {
    const n = Number.parseInt(texto(v), 10);
    return Number.isFinite(n) ? n : padrao;
  };
  const ordem = texto(query.ordem);
  return {
    categoria: texto(query.categoria) || null,
    sub: texto(query.sub) || null,
    busca: paraBusca(texto(query.busca).slice(0, BUSCA_MAXIMA)),
    feitas: query.feitas === '1' || query.feitas === true,
    ordem: Object.hasOwn(ORDENS, ordem) ? ordem : ORDEM_PADRAO,
    pagina: Math.max(0, inteiro(query.pagina, 0)),
    tamanho: Math.min(TAMANHO_MAXIMO, Math.max(1, inteiro(query.tamanho, TAMANHO_PADRAO)))
  };
}

/**
 * Uma pagina da aba.
 *
 * @param {Map<string, object>} indice  `indicePerguntas()` da sala
 * @param {object} query  categoria, sub, busca, feitas ('1'), ordem, pagina, tamanho
 * @param {object} [fontes]  de onde vem os numeros (os testes trocam)
 * @returns {{ resumo: object, total: number, pagina: number, tamanho: number, ordem: string, linhas: object[] }}
 *   O resumo e do recorte inteiro (todas as paginas), nao so da pagina.
 */
function consultar(indice, query, fontes = { estatisticaDe: dificuldade.estatisticaDe, usosDe: usos.usosDe }) {
  const f = lerFiltros(query);
  const termos = f.busca ? f.busca.split(' ') : [];

  const linhas = [];
  for (const { id, meta, texto } of preparar(indice)) {
    if (f.categoria && meta.categoria !== f.categoria) continue;
    if (f.sub && meta.sub !== f.sub) continue;
    if (termos.length && !termos.every((t) => texto.includes(t))) continue;
    const linha = linhaDe(id, meta, fontes);
    if (f.feitas && !linha.vezes) continue;
    linhas.push(linha);
  }

  const comparar = ORDENS[f.ordem];
  linhas.sort((a, b) => comparar(a, b) || desempate(a, b));

  const inicio = f.pagina * f.tamanho;
  return {
    resumo: resumir(linhas),
    total: linhas.length,
    pagina: f.pagina,
    tamanho: f.tamanho,
    ordem: f.ordem,
    linhas: linhas.slice(inicio, inicio + f.tamanho).map(({ taxa, ...linha }) => ({
      ...linha,
      acerto: taxa === null ? null : Math.round(taxa * 100)
    }))
  };
}

module.exports = { consultar, lerFiltros, paraBusca, ORDENS };
