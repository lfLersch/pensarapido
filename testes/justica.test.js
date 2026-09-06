'use strict';

/*
 * As duas regras de justica das perguntas.
 *
 * 1. Lista que tem fim no mundo real precisa estar inteira no jogo. A NBA tem
 *    30 times e o banco guardava 24: quem respondesse Pacers, Kings ou
 *    Timberwolves — times que existem — ouvia que errou. O defeito nao e a
 *    pessoa nao lembrar, e a pessoa acertar e o jogo dizer que esta errado.
 *
 * 2. Pergunta de contagem e chutavel. "Quantos coracoes tem um polvo?" tem
 *    resposta entre 1 e 10, e o anti-spam so exige 350ms entre mensagens:
 *    numa rodada de 20s cabem quase 60 palpites. Quem nao sabe digita 1, 2, 3
 *    e ganha de quem sabe. Matematica escapa, porque ali a conta e o jogo.
 */

const { LISTAS } = require('../server/escalada.js');
const { CATEGORIAS, QUESTOES } = require('../server/questions.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(52), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

/* ---------- 1. conjuntos fechados tem que estar completos ---------- */
{
  // [trecho do enunciado, quantos existem no mundo]
  const FECHADOS = [
    ['times da NBA', 30],
    ['filmes da saga Star Wars', 12],
    ['elementos quimicos', 118],
    ['presidentes do Brasil', 35],
    ['estados brasileiros', 27],
    ['capitais de estados brasileiros', 27],
    ['planetas do Sistema Solar', 8],
    ['signos do zodiaco', 12],
    ['meses do ano', 12],
    ['paises da Africa', 54],
    ['paises da Asia', 48],
    ['paises da America do Sul', 12],
    ['paises da Oceania', 14],
    ['cidades do Brasil com mais de 1 milhao', 15],
    ['Jogos Olimpicos de Verao', 23],
    ['Jogos Olimpicos de Inverno', 22]
  ];

  for (const [trecho, quantos] of FECHADOS) {
    const lista = LISTAS.find((l) => l.pergunta.includes(trecho));
    conferir(`${trecho} tem os ${quantos}`, lista ? lista.respostas.length : null, quantos);
  }
}

/* ---------- 2. nenhuma pergunta de contagem fora de matematica ---------- */
{
  const chutaveis = [];
  for (const categoria of CATEGORIAS) {
    if (categoria.id === 'matematica') continue;
    for (const q of QUESTOES[categoria.id] || []) {
      const resposta = String(q.resposta).trim();
      if (/^\s*Quant[oa]s\b/.test(q.pergunta) && /^[0-9]+$/.test(resposta)) {
        chutaveis.push(`${categoria.id}: ${q.pergunta} (${resposta})`);
      }
    }
  }
  conferir('nenhuma pergunta de contagem fora de matematica', chutaveis, []);
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
