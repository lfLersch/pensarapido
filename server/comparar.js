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
 * @returns {{veredito:'certo'|'quase'|'chat', erro:number, spoiler:boolean, alvo:string}}
 *          `alvo` é a forma que chegou mais perto — é dela que sai a dica do
 *          "quase", para a máscara mostrar a grafia que a pessoa quase acertou.
 */
function avaliar(palpite, resposta, aceitas = []) {
  const p = normalizar(palpite);
  if (!p) return { veredito: 'chat', erro: 1, spoiler: false, alvo: resposta };

  let melhorErro = Infinity;
  let melhorAlvo = resposta;
  let spoiler = false;

  for (const forma of [resposta, ...aceitas]) {
    const candidato = normalizar(forma);
    if (!candidato) continue;

    const erro = distancia(p, candidato) / candidato.length;
    if (erro < melhorErro) {
      melhorErro = erro;
      melhorAlvo = forma;
    }
    // Frase que contém a resposta ("acho que é o Johnny Depp") não pode ir ao chat.
    if (candidato.length >= MIN_SPOILER && p.includes(candidato)) spoiler = true;
  }

  if (melhorErro === Infinity) return { veredito: 'chat', erro: 1, spoiler: false, alvo: resposta };

  const fim = { erro: melhorErro, spoiler, alvo: melhorAlvo };
  if (melhorErro < LIMITE_CERTO) return { veredito: 'certo', ...fim };
  if (melhorErro <= LIMITE_QUASE || spoiler) return { veredito: 'quase', ...fim };
  return { veredito: 'chat', ...fim };
}

/**
 * Alinha duas palavras e diz quais letras de `b` o `a` acertou.
 *
 * É o mesmo cálculo da distância de Levenshtein, mas guardando a matriz para
 * refazer o caminho de trás para frente: cada passo na diagonal sem custo é
 * uma letra que bateu.
 *
 * @returns {boolean[]} do tamanho de `b`
 */
function casarLetras(a, b) {
  const matriz = [];
  for (let i = 0; i <= a.length; i++) {
    matriz.push(new Array(b.length + 1).fill(0));
    matriz[i][0] = i;
  }
  for (let j = 0; j <= b.length; j++) matriz[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      matriz[i][j] = Math.min(
        matriz[i - 1][j] + 1,
        matriz[i][j - 1] + 1,
        matriz[i - 1][j - 1] + custo
      );
    }
  }

  const casou = new Array(b.length).fill(false);
  let i = a.length;
  let j = b.length;

  while (i > 0 && j > 0) {
    const custo = a[i - 1] === b[j - 1] ? 0 : 1;
    if (matriz[i][j] === matriz[i - 1][j - 1] + custo) {
      if (custo === 0) casou[j - 1] = true;
      i--;
      j--;
    } else if (matriz[i][j] === matriz[i - 1][j] + 1) {
      i--; // sobrou letra no palpite
    } else {
      j--; // faltou letra da resposta
    }
  }

  return casou;
}

/**
 * O que a pessoa já acertou da resposta, letra por letra.
 *
 * Para a resposta "cara", quem digitou "cera" recebe "c_ra": as letras que
 * bateram aparecem no lugar e as que faltaram viram "_". Espaço, hífen e
 * pontuação passam direto — não é neles que alguém erra.
 *
 * Vale como dica do "quase", quando a pessoa já está a uma ou duas letras da
 * resposta e só precisa saber ONDE errou.
 */
function mascaraDeAcerto(palpite, resposta) {
  const alvo = normalizar(resposta);
  if (!alvo) return '';

  const casou = casarLetras(normalizar(palpite), alvo);

  let posicao = 0;
  let saida = '';
  for (const caractere of String(resposta)) {
    // Só letra e número entram na conta: o resto não é erro de ninguém.
    if (normalizar(caractere)) {
      saida += casou[posicao] ? caractere : '_';
      posicao++;
    } else {
      saida += caractere;
    }
  }
  return saida;
}

module.exports = {
  avaliar, normalizar, distancia, casarLetras, mascaraDeAcerto,
  LIMITE_CERTO, LIMITE_QUASE
};
