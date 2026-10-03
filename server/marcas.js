'use strict';

/**
 * As partes conhecidas de cada musica, em segundos do arquivo de public/audio.
 *
 * O avaliador de dificuldade usa isto para escolher de onde a rodada toca:
 * musica que ficou dificil toca uma parte conhecida (o comeco ou o refrao), e
 * musica que ficou facil toca o meio, fora do refrao.
 *
 *   'yellow': { refrao: [[52, 70], [110, 128]] }   cada refrao: [inicio, fim]
 *   'wish-you-were-here': { comeco: 17 }           a musica comeca de verdade aos 17s
 *
 * `comeco` serve para a musica cujo arquivo abre com silencio, ruido ou fala
 * (Wish You Were Here abre com um radio sendo sintonizado). Sem ele, o comeco
 * e o segundo zero.
 *
 * Ainda vazio: os trechos de hoje sao os 40 primeiros segundos de cada musica,
 * e o refrao quase sempre vem depois. As marcacoes entram junto com as
 * musicas inteiras — e o teste reprova marcacao de trecho que nao existe ou
 * que passa do fim do arquivo.
 */
const MARCAS = {};

/** As marcacoes de um trecho, com os padroes: comeca no zero e sem refrao conhecido. */
function marcasDe(trecho) {
  const marcas = MARCAS[trecho] || {};
  return { comeco: marcas.comeco || 0, refrao: marcas.refrao || [] };
}

module.exports = { MARCAS, marcasDe };
