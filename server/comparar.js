'use strict';

/**
 * Comparação de palpites do PensaRápido.
 *
 * Cada mensagem digitada no chat é medida contra a resposta certa:
 *
 *   erro < 10%          -> certo   (pontua)
 *   10% <= erro <= 20%  -> quase   (aviso só para quem escreveu; não vai ao chat)
 *   erro > 20%          -> chat    (vira mensagem normal para todo mundo)
 *
 * "Erro" é a distância de Levenshtein dividida pelo tamanho da resposta, ou
 * seja: quantos por cento da palavra a pessoa errou.
 */

const LIMITE_CERTO = 0.10; // abaixo disso conta como acerto
const LIMITE_QUASE = 0.20; // até aqui é "quase"; acima vira mensagem de chat
const MIN_SPOILER = 4;     // respostas com 4+ caracteres são protegidas de spoiler

/**
 * Deixa o texto comparável: sem acentos, sem maiúsculas, sem pontuação e sem
 * espaços. Assim "Japão", "japao" e "JAPAO" são a mesma coisa, e o jogador não
 * perde ponto por causa de um acento ou de um espaço a mais.
 */
function normalizar(texto) {
  if (typeof texto !== 'string') return '';
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Distância de Levenshtein (número mínimo de edições entre duas strings). */
function distancia(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let anterior = new Array(b.length + 1);
  let atual = new Array(b.length + 1);

  for (let j = 0; j <= b.length; j++) anterior[j] = j;

  for (let i = 1; i <= a.length; i++) {
    atual[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      atual[j] = Math.min(
        atual[j - 1] + 1,      // inserção
        anterior[j] + 1,       // remoção
        anterior[j - 1] + custo // substituição
      );
    }
    [anterior, atual] = [atual, anterior];
  }

  return anterior[b.length];
}

/**
 * Avalia um palpite contra a resposta certa e suas variantes aceitas.
 *
 * @param {string} palpite    o que a pessoa digitou
 * @param {string} resposta   a resposta oficial
 * @param {string[]} aceitas  outras formas válidas ("Holanda" para "Países Baixos")
 * @returns {{veredito:'certo'|'quase'|'chat', erro:number, spoiler:boolean}}
 */
function avaliar(palpite, resposta, aceitas = []) {
  const p = normalizar(palpite);
  if (!p) return { veredito: 'chat', erro: 1, spoiler: false };

  const candidatos = [resposta, ...aceitas].map(normalizar).filter(Boolean);
  if (candidatos.length === 0) return { veredito: 'chat', erro: 1, spoiler: false };

  let melhorErro = Infinity;
  let spoiler = false;

  for (const candidato of candidatos) {
    melhorErro = Math.min(melhorErro, distancia(p, candidato) / candidato.length);
    // Frase que contém a resposta ("acho que é o Johnny Depp") não pode ir ao chat.
    if (candidato.length >= MIN_SPOILER && p.includes(candidato)) spoiler = true;
  }

  if (melhorErro < LIMITE_CERTO) return { veredito: 'certo', erro: melhorErro, spoiler };
  if (melhorErro <= LIMITE_QUASE || spoiler) return { veredito: 'quase', erro: melhorErro, spoiler };
  return { veredito: 'chat', erro: melhorErro, spoiler };
}

module.exports = { avaliar, normalizar, distancia, LIMITE_CERTO, LIMITE_QUASE };
