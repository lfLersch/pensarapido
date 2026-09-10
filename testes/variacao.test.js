'use strict';

/*
 * Pergunta simples: as categorias variam.
 *
 * Numa janela de 80% das categorias escolhidas nenhuma se repete: com 10
 * categorias, quaisquer 8 perguntas seguidas sao de 8 categorias diferentes.
 * Antes o sorteio era por pergunta num monte so, e a categoria mais recheada
 * dominava — Cinema tem 543 perguntas e Rap 27.
 */

const { Sala } = require('../server/sala.js');
const { CATEGORIAS } = require('../server/questions.js');
const { normalizar } = require('../server/comparar.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(56), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

function sortear(categorias, quantas, subs = []) {
  const sala = new Sala('VAR1',
    { categorias, subs, modo: 'tempo', metaPontos: 9999, segundosPorPergunta: 20 },
    () => {});
  sala.montarFila();
  const saida = [];
  for (let i = 0; i < quantas; i++) saida.push(sala.sacarDaFila());
  sala.destruir();
  return saida;
}

/** Primeira janela do tamanho pedido que tem categoria repetida, ou null. */
function janelaRepetida(seq, tamanho) {
  for (let i = 0; i + tamanho <= seq.length; i++) {
    const trecho = seq.slice(i, i + tamanho);
    if (new Set(trecho).size !== tamanho) return { onde: i, trecho };
  }
  return null;
}

const ids = CATEGORIAS.map((c) => c.id);

/* ---------------- A janela de 80% vale para qualquer tamanho ---------------- */
for (const quantas of [2, 3, 5, 10, ids.length]) {
  const escolhidas = ids.slice(0, quantas);
  const janela = Math.max(1, Math.ceil(quantas * 0.8));
  // Varias partidas, porque o sorteio dentro da janela e livre.
  let pior = null;
  for (let partida = 0; partida < 20 && !pior; partida++) {
    pior = janelaRepetida(sortear(escolhidas, 120).map((p) => p.categoria), janela);
  }
  conferir(`${quantas} categorias: quaisquer ${janela} seguidas sao diferentes`, pior, null);
}

/* ---------------- Nenhuma categoria domina ---------------- */
{
  const escolhidas = ids.slice(0, 10);
  const conta = {};
  for (const p of sortear(escolhidas, 400)) conta[p.categoria] = (conta[p.categoria] || 0) + 1;
  const valores = Object.values(conta);
  conferir('todas as 10 categorias aparecem', valores.length, 10);
  conferir('a mais sorteada nao passa de 1,5x a menos sorteada',
    Math.max(...valores) <= Math.min(...valores) * 1.5, true);
}

/* ---------------- A regra antiga continua: resposta nao repete ---------------- */
{
  let repetidas = 0;
  const vistas = new Set();
  for (const p of sortear(ids, 150)) {
    const chave = normalizar(p.resposta || '');
    if (/^[0-9]+$/.test(chave)) continue;   // conta de matematica pode repetir
    if (vistas.has(chave)) repetidas++;
    vistas.add(chave);
  }
  conferir('150 perguntas de todas as categorias, sem resposta repetida', repetidas, 0);
}

/* ---------------- Casos de borda ---------------- */
{
  conferir('com uma categoria so, continua sorteando', sortear([ids[0]], 30).length, 30);

  // Parte marcada que nao existe nao pode deixar a categoria sem pergunta.
  const semParte = sortear([ids[0]], 5, [`${ids[0]}:parte-que-nao-existe`]);
  conferir('parte marcada vazia cai na categoria inteira', semParte.length, 5);

  // Mais perguntas que a categoria tem: recomeca em vez de quebrar.
  const pequena = CATEGORIAS.reduce((a, b) =>
    (require('../server/questions.js').QUESTOES[a.id] || []).length <=
    (require('../server/questions.js').QUESTOES[b.id] || []).length ? a : b);
  const total = (require('../server/questions.js').QUESTOES[pequena.id] || []).length;
  conferir(`${pequena.id} (${total}): sorteia ${total + 10} sem quebrar`,
    sortear([pequena.id], total + 10).every(Boolean), true);
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
