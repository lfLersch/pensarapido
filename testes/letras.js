'use strict';

/*
 * Confere o tamanho dos trechos de letra.
 *
 * Regra: no mínimo 4 linhas, sendo 4 a 8 o ideal. Com uma linha só o jogador
 * quase não tem de onde tirar a resposta; com mais de oito o bloco toma a tela
 * inteira e sobra pouco espaço para a pergunta e o chat.
 *
 * Roda com `npm run checar-letras` — fica fora do `npm test` porque é um
 * lembrete de conteúdo a completar, não um defeito de código.
 */

const { QUESTOES } = require('../server/questions');

const MINIMO = 4;
const IDEAL_MAX = 8;

const comLetra = (QUESTOES.musica || []).filter((q) => q.letra);

const linhasDe = (q) => (Array.isArray(q.letra) ? q.letra : [q.letra]).filter((l) => String(l).trim());

const curtas = [];
const longas = [];
const boas = [];

for (const q of comLetra) {
  const n = linhasDe(q).length;
  if (n < MINIMO) curtas.push({ q, n });
  else if (n > IDEAL_MAX) longas.push({ q, n });
  else boas.push({ q, n });
}

console.log(`Perguntas com letra: ${comLetra.length}`);
console.log(`  entre ${MINIMO} e ${IDEAL_MAX} linhas: ${boas.length}`);
console.log(`  com menos de ${MINIMO}:        ${curtas.length}`);
console.log(`  com mais de ${IDEAL_MAX}:         ${longas.length}`);

if (curtas.length) {
  console.log(`\nFaltam linhas nestas (mínimo ${MINIMO}, ideal ${MINIMO} a ${IDEAL_MAX}):\n`);
  for (const { q, n } of curtas) {
    console.log(`  ${String(n).padStart(2)} linha(s) · ${q.resposta}`);
  }
  console.log(`
  Para completar, abra o bloco LETRAS_MUSICA em server/questions.js e
  transforme a lista de linhas em ${MINIMO} a ${IDEAL_MAX} versos:

    { pergunta: 'Qual é o nome desta música?',
      letra: ['primeira linha',
              'segunda linha',
              'terceira linha',
              'quarta linha'],
      resposta: '...', dif: 40 }
`);
}

if (longas.length) {
  console.log(`\nPassaram de ${IDEAL_MAX} linhas (o bloco fica grande demais na tela):\n`);
  for (const { q, n } of longas) console.log(`  ${n} linhas · ${q.resposta}`);
}

process.exit(curtas.length || longas.length ? 1 : 0);
