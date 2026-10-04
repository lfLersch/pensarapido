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

/* ---------- 6. charadas de emoji ---------- */
{
  // A tela so poe em destaque os emojis do FIM do enunciado — a mesma regra
  // de EMOJIS_NO_FIM, em public/js/app.js. Emoji no meio da frase sai pequeno.
  const EMOJIS_NO_FIM = /^(.*?)\s*((?:[0-9#*]️?⃣|[\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Modifier}‍️]|\s)+)$/u;
  const charadas = todas.filter((q) => q.sub === 'emojis');
  conferir('a parte Emojis tem charada que chegue', charadas.length >= 50, true);

  const tortas = charadas.filter((q) => {
    const partes = q.pergunta.match(EMOJIS_NO_FIM);
    return !partes || !partes[1].trim() || !/\p{Extended_Pictographic}/u.test(partes[2]);
  });
  conferir('toda charada tem texto e termina nos emojis', tortas.map((q) => q.pergunta), []);

  const respostas = charadas.map((q) => normalizar(q.resposta));
  conferir('nenhuma resposta repetida entre as charadas',
    respostas.filter((r, i) => respostas.indexOf(r) !== i), []);

  // O Windows 10 parou no Unicode 12: emoji mais novo (a pedra, a varinha, o
  // burro) vira quadradinho, e a charada fica sem uma das pistas.
  const NOVO_DEMAIS = /[\u{1FA74}-\u{1FA77}\u{1FA7B}-\u{1FA7F}\u{1FA83}-\u{1FA8F}\u{1FA96}-\u{1FAFF}\u{1F972}\u{1F977}-\u{1F979}\u{1F90C}\u{1F9A3}\u{1F9A4}\u{1F9AB}-\u{1F9AD}\u{1F9CB}\u{1F9CC}\u{1F6D6}\u{1F6D7}\u{1F6DC}-\u{1F6DF}\u{1F6FB}\u{1F6FC}\u{1F7F0}\u{26A7}]/u;
  conferir('nenhuma charada usa emoji depois do Unicode 12',
    charadas.filter((q) => NOVO_DEMAIS.test(q.pergunta)).map((q) => q.pergunta), []);
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
