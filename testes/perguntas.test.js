'use strict';

/*
 * A pergunta nao pode entregar a resposta.
 *
 * "Qual cavalo de madeira derrubou a cidade de Troia?" tinha como resposta
 * "Cavalo de Troia" — escrita no enunciado. Mesmo defeito na serie que "leva
 * 3% ao Maralto" (3%), no filme do tubarao que aterroriza a praia (Tubarao),
 * na empresa que fabrica o Nintendo Switch (Nintendo). Variante aceita conta
 * igual: "Qual e a formula quimica da agua?" aceitava "agua".
 */

const { CATEGORIAS, QUESTOES } = require('../server/questions.js');
const { normalizar, avaliar } = require('../server/comparar.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(58), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

/** O texto em palavras, com espaco nas pontas, para achar uma forma inteira. */
const palavras = (texto) => ' ' + String(texto)
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9%]+/g, ' ').trim() + ' ';

const todas = CATEGORIAS.flatMap((c) => (QUESTOES[c.id] || []).map((q) => ({ ...q, categoria: c.id })));

/* ---------- 1. nenhuma resposta ou variante inteira no enunciado ---------- */
{
  const entregam = [];
  for (const q of todas) {
    const texto = palavras(q.pergunta);
    for (const forma of [q.resposta, ...(q.aceita || [])]) {
      const f = palavras(forma).trim();
      if (f && texto.includes(` ${f} `)) {
        entregam.push(`${q.categoria}: "${q.pergunta}" -> ${forma}`);
        break;
      }
    }
  }
  conferir('nenhuma pergunta traz a resposta no enunciado', entregam, []);
}

/* ---------- 2. resposta de um caractere e chute ---------- */
{
  // Com 350ms entre mensagens, as 26 letras cabem numa rodada de 20s: quem
  // nao sabe digita o alfabeto. Na matematica o numero e a propria conta.
  const curtas = [];
  for (const q of todas) {
    if (q.categoria === 'matematica') continue;
    for (const forma of [q.resposta, ...(q.aceita || [])]) {
      if (normalizar(forma).length === 1) curtas.push(`${q.categoria}: "${q.pergunta}" -> ${forma}`);
    }
  }
  conferir('nenhuma resposta de um caractere fora de matematica', curtas, []);
}

/* ---------- 3. os dois casos que apareceram jogando ---------- */
{
  const cavalo = todas.find((q) => normalizar(q.resposta) === normalizar('Cavalo de Troia'));
  conferir('Cavalo de Troia: o enunciado nao fala em cavalo nem em Troia',
    /cavalo|troia/i.test(cavalo.pergunta), false);

  const serie = todas.find((q) => q.resposta === '3%');
  conferir('3%: o enunciado nao traz 3%', serie.pergunta.includes('3%'), false);

  // "3%" virava so "3" no corretor, e na rodada "Cite 3 series famosas" o
  // numero do enunciado contava como a serie.
  conferir('"3" nao acerta a serie "3%"', avaliar('3', '3%').veredito, 'chat');
  conferir('"3%" continua acertando', avaliar('3%', '3%').veredito, 'certo');
}

/* ---------- 4. cada pergunta tem um id so dela ---------- */
{
  // O id guarda a dificuldade aprendida. "Quem canta esta musica?" -> Justin
  // Bieber vale para tres trechos diferentes: sem o audio no id, os tres
  // dividiam uma estatistica so.
  const { indicePerguntas } = require('../server/sala.js');
  conferir('nenhuma pergunta divide o id com outra', indicePerguntas().size, todas.length);
}

/* ---------- 5. imagem e audio locais existem ---------- */
{
  // Pergunta apontando para arquivo que nao existe fica sem imagem ou muda
  // no meio da partida.
  const fs = require('fs');
  const path = require('path');
  const faltando = [];
  for (const q of todas) {
    for (const url of [q.imagem, q.audio]) {
      if (!url || url.startsWith('http')) continue;
      if (!fs.existsSync(path.join(__dirname, '..', 'public', url))) faltando.push(`${q.categoria}: ${url}`);
    }
  }
  conferir('toda imagem e audio local existe em public/', faltando, []);
  conferir('os trechos de musica viraram pergunta', todas.filter((q) => q.audio).length >= 22, true);
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
