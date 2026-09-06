'use strict';

/*
 * Uma partida nao pode repetir pergunta.
 *
 * O banco tem 293 respostas que aparecem em mais de uma pergunta: "Star Wars"
 * responde 5 perguntas de Cinema & TV, "Legiao Urbana" 5 de Musica. Sao
 * perguntas diferentes no arquivo, mas para quem joga sao a mesma coisa — na
 * segunda vez todo mundo digita na hora e a rodada perde a graca.
 */

const { Sala } = require('../server/sala.js');
const { normalizar } = require('../server/comparar.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(52), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

function sala(config) {
  const s = new Sala('REP1', Object.assign({
    modo: 'tempo', metaPontos: 99999, segundosPorPergunta: 20
  }, config), () => {});
  s.entrar('a', 'Ana');
  s.iniciar();
  s.limparTemporizador();
  return s;
}

/* ---------------- Modo Tempo: resposta nao se repete ---------------- */
{
  const s = sala({ categorias: ['cinema'] });
  const vistas = [];
  for (let i = 0; i < 200; i++) vistas.push(normalizar(s.perguntaSimples().resposta));

  const contagem = {};
  for (const v of vistas) contagem[v] = (contagem[v] || 0) + 1;
  const repetidas = Object.entries(contagem).filter(([, n]) => n > 1);

  conferir('200 perguntas de Cinema sem resposta repetida',
    repetidas.map(([r, n]) => `${r} x${n}`), []);
  s.destruir();
}

/* -------- Conta com o mesmo resultado nao conta como repeticao -------- */
{
  // "quanto e 6x5" e "quanto e 27+3" dao 30. Sao contas diferentes e ninguem
  // sente isso como pergunta repetida, entao resposta numerica passa.
  const s = sala({ categorias: ['matematica'] });
  const vistas = [];
  for (let i = 0; i < 60; i++) vistas.push(s.perguntaSimples());

  const enunciados = new Set(vistas.map((q) => q.pergunta));
  const numericas = vistas.filter((q) => /^[0-9]+$/.test(normalizar(q.resposta)));

  conferir('matematica sorteia 60 enunciados diferentes', enunciados.size, 60);
  conferir('  e a maioria e resposta numerica (que pode repetir)',
    numericas.length > 30, true);
  s.destruir();
}

/* ------------- Baralho pequeno nao trava nem vem vazio ------------- */
{
  // So os desenhos: o baralho acaba antes da partida. Depois de esgotar, uma
  // passagem nova comeca — repetir e melhor do que ficar sem pergunta.
  const s = sala({ categorias: ['cinema'], subs: ['cinema:desenhos'] });
  const vistas = [];
  let vazia = false;
  for (let i = 0; i < 90; i++) {
    const q = s.perguntaSimples();
    if (!q || !q.resposta) { vazia = true; break; }
    vistas.push(normalizar(q.resposta));
  }

  const distintas = new Set(vistas).size;
  let primeiraRepeticao = -1;
  const ja = new Set();
  vistas.forEach((v, i) => {
    if (ja.has(v) && primeiraRepeticao < 0) primeiraRepeticao = i;
    ja.add(v);
  });

  conferir('baralho pequeno nunca devolve pergunta vazia', vazia, false);
  conferir('  e so repete depois de esgotar o baralho',
    primeiraRepeticao >= distintas - 1, true);
  s.destruir();
}

/* ---------------- Escalada: lista nao se repete ---------------- */
{
  const s = new Sala('REP2', {
    categorias: ['geografia'], modo: 'escalada', metaPontos: 99999, segundosPorPergunta: 20
  }, () => {});
  s.entrar('a', 'Ana');
  s.iniciar();
  s.limparTemporizador();

  const listas = [];
  for (let n = 2; n <= 25; n++) listas.push(s.perguntaEscalada(n).pergunta.replace(/\d+/, 'N'));

  const contagem = {};
  for (const l of listas) contagem[l] = (contagem[l] || 0) + 1;
  const repetidas = Object.entries(contagem).filter(([, n]) => n > 1);

  conferir('24 rodadas de Escalada sem lista repetida',
    repetidas.map(([l, n]) => `${l} x${n}`), []);
  s.destruir();
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
