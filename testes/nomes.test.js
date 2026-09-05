'use strict';

/*
 * Regra de nomes de pessoas:
 * "podem haver 2 respostas, o nome inteiro ou o apelido".
 *
 * Este teste percorre o banco inteiro e garante que:
 *   1. toda pergunta de pessoa tem pelo menos uma forma alternativa;
 *   2. a resposta oficial e cada variante aceita valem como acerto;
 *   3. nenhuma variante é tão genérica que acerte a pergunta de OUTRA pessoa.
 */

const { CATEGORIAS, QUESTOES } = require('../server/questions');
const { avaliar } = require('../server/comparar');

let falhas = 0;
const erro = (msg) => { falhas++; console.log('FALHA ' + msg); };

/* ---------- 1 e 2: toda forma de nome vale como acerto ---------- */

const pessoas = QUESTOES.futebol;
let formasTestadas = 0;
let semVariante = 0;

for (const q of pessoas) {
  const variantes = q.aceita || [];
  if (variantes.length === 0) {
    semVariante++;
    erro(`sem variante aceita: ${q.resposta}`);
  }

  for (const forma of [q.resposta, ...variantes]) {
    formasTestadas++;
    const { veredito } = avaliar(forma, q.resposta, variantes);
    if (veredito !== 'certo') {
      erro(`"${forma}" não vale como resposta de "${q.resposta}" (deu ${veredito})`);
    }
  }
}

console.log(`Futebol: ${pessoas.length} pessoas, ${formasTestadas} formas de nome testadas`);
console.log(`  todas com variante aceita: ${semVariante === 0 ? 'sim' : 'NÃO (' + semVariante + ' sem)'}`);

/* ---------- 3: nenhuma forma acerta a pergunta de outra pessoa ---------- */

const colisoes = [];

for (const q of pessoas) {
  for (const forma of [q.resposta, ...(q.aceita || [])]) {
    for (const outra of pessoas) {
      if (outra === q || outra.resposta === q.resposta) continue;
      const { veredito } = avaliar(forma, outra.resposta, outra.aceita || []);
      if (veredito === 'certo') {
        colisoes.push(`"${forma}" (de ${q.resposta}) também acerta "${outra.resposta}"`);
      }
    }
  }
}

if (colisoes.length) {
  console.log(`\n${colisoes.length} colisão(ões) de nome — uma resposta serve para duas pessoas:`);
  // Sobrenome solto que duas pessoas dividem ("Silva", "Ronaldo") deixa a
  // pergunta fácil demais: dá para acertar sem saber de quem é a foto.
  for (const c of [...new Set(colisoes)]) erro('nome ambíguo: ' + c);
} else {
  console.log('  nenhuma colisão entre nomes');
}

/* ---------- pessoas nas outras categorias ---------- */

console.log('\nOutras categorias — respostas com variante aceita:');
for (const c of CATEGORIAS) {
  if (c.id === 'futebol') continue;
  const qs = QUESTOES[c.id] || [];
  const comVariante = qs.filter((q) => q.aceita && q.aceita.length).length;
  console.log(`  ${c.nome.padEnd(12)} ${comVariante}/${qs.length}`);
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
