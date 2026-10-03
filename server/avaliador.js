'use strict';

/**
 * O avaliador de dificuldade das musicas.
 *
 * Cada musica tem uma dificuldade de 0 a 100 que anda com as rodadas — a
 * mesma media movel da dificuldade adaptativa das perguntas, so que pela
 * musica, e nao pela pergunta: o nome e o quem canta da mesma musica somam
 * juntos, em qualquer modo que a toque.
 *
 * E ela que decide de que parte a musica toca:
 *
 *   ficando dificil  -> cada vez mais uma parte conhecida: o comeco ou o refrao;
 *   ficando facil    -> cada vez mais o meio da musica, fora do refrao;
 *   no meio-termo    -> qualquer ponto.
 *
 * Funciona como um termostato: a musica que ninguem reconhece passa a tocar o
 * refrao, a que todo mundo acerta de cara passa a tocar a estrofe do meio, e
 * as duas voltam para o meio-termo.
 */

const dificuldade = require('./dificuldade');
const { QUESTOES } = require('./questions');
const { trechoDe } = require('./musicas');

// A partir de 45 a musica comeca a tocar parte conhecida, e de 65 so toca
// parte conhecida; abaixo de 35 comeca a tocar o meio, e abaixo de 15 so o
// meio. A mudanca e gradual para a musica nao pular de um lado para o outro
// a cada rodada.
const CONHECIDA_DESDE = 45;
const CONHECIDA_SEMPRE = 65;
const MEIO_DESDE = 35;
const MEIO_SEMPRE = 15;

// Antes disto o avaliador ainda nao viu a musica tocar: sorteio livre.
const RODADAS_PARA_AVALIAR = 2;

// Ponto de partida de cada musica: a media do `dif` das perguntas dela.
const BASES = new Map();
{
  const soma = new Map();
  for (const q of QUESTOES.ouvir || []) {
    if (!q.audio) continue;
    const trecho = trechoDe(q.audio);
    const atual = soma.get(trecho) || { total: 0, n: 0 };
    soma.set(trecho, { total: atual.total + (q.dif ?? 40), n: atual.n + 1 });
  }
  for (const [trecho, { total, n }] of soma) BASES.set(trecho, total / n);
}

const idDe = (trecho) => dificuldade.idDe('musica', trecho);
const baseDe = (trecho) => BASES.get(trecho) ?? 40;

/** A dificuldade atual da musica: a aprendida, ou a base enquanto nao tocou. */
function dificuldadeDaMusica(trecho) {
  return dificuldade.dificuldadeDe(idDe(trecho), baseDe(trecho));
}

/** Quantas rodadas o avaliador ja viu desta musica. */
function rodadasDaMusica(trecho) {
  const estatistica = dificuldade.estatisticaDe(idDe(trecho));
  return estatistica ? estatistica.vezes : 0;
}

const rampa = (de, ate, valor) => Math.min(1, Math.max(0, (valor - de) / (ate - de)));

/**
 * De que parte a proxima rodada desta musica toca: 'conhecida' (o comeco ou
 * o refrao), 'meio' (fora do refrao) ou 'qualquer'.
 */
function regimeDaMusica(trecho, sorteio = Math.random) {
  if (rodadasDaMusica(trecho) < RODADAS_PARA_AVALIAR) return 'qualquer';
  const valor = dificuldadeDaMusica(trecho);
  const conhecida = rampa(CONHECIDA_DESDE, CONHECIDA_SEMPRE, valor);
  const meio = rampa(MEIO_DESDE, MEIO_SEMPRE, valor);
  const sorte = sorteio();
  if (sorte < conhecida) return 'conhecida';
  if (sorte < conhecida + meio) return 'meio';
  return 'qualquer';
}

/**
 * O avaliador aprende com uma rodada e devolve a dificuldade nova.
 *
 * @param {string} trecho
 * @param {object} rodada
 * @param {number} rodada.participantes  quem podia reconhecer a musica
 * @param {number[]} rodada.tempos       ms de cada acerto
 * @param {number} rodada.duracaoMs      quanto a musica tocou, no maximo
 * @param {number} [rodada.chute]        a chance de acertar sem saber (1/4 nas
 *                                       quatro opcoes), descontada do acerto
 */
function anotarRodada(trecho, { participantes, tempos, duracaoMs, chute = 0 }) {
  if (!trecho || !participantes || !duracaoMs) return dificuldadeDaMusica(trecho);
  const acertos = tempos.length;
  let fracao = Math.min(1, acertos / participantes);
  if (chute > 0) fracao = Math.max(0, (fracao - chute) / (1 - chute));
  const tempo = acertos
    ? tempos.reduce((soma, ms) => soma + Math.min(1, ms / duracaoMs), 0) / acertos
    : 1;
  return dificuldade.registrarObservada(idDe(trecho), baseDe(trecho),
    dificuldade.dificuldadeObservada(fracao, tempo), { jogadores: participantes, tempos });
}

module.exports = {
  CONHECIDA_DESDE, CONHECIDA_SEMPRE, MEIO_DESDE, MEIO_SEMPRE, RODADAS_PARA_AVALIAR,
  dificuldadeDaMusica, rodadasDaMusica, regimeDaMusica, anotarRodada, baseDe
};
