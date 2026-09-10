'use strict';

/*
 * Escolha de partes (subcategorias) na criacao da sala.
 *
 * A categoria marcada comeca com todas as partes marcadas. Desmarcar uma parte
 * tira so ela (`fora`); marcar uma parte com a categoria desmarcada traz so
 * aquela parte (`subs`).
 */

const { QUESTOES } = require('../server/questions.js');
const { categoriasEmJogo, perguntasEscolhidas } = require('../server/sala.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(60), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

const cinema = QUESTOES.cinema;
const contar = (filtro) => cinema.filter(filtro).length;

/* ---------- categoria marcada: inteira ---------- */
{
  const config = { categorias: ['cinema'], subs: [], fora: [] };
  conferir('categoria marcada vem inteira', perguntasEscolhidas(config, 'cinema').length, cinema.length);
  conferir('config antiga sem subs nem fora tambem vem inteira',
    perguntasEscolhidas({ categorias: ['cinema'] }, 'cinema').length, cinema.length);
}

/* ---------- desmarcar uma parte tira so ela ---------- */
{
  const config = { categorias: ['cinema'], subs: [], fora: ['cinema:desenhos'] };
  const vieram = perguntasEscolhidas(config, 'cinema');
  conferir('sem desenhos: nenhum desenho', vieram.filter((p) => p.sub === 'desenhos').length, 0);
  conferir('sem desenhos: o resto da categoria continua',
    vieram.length, contar((p) => p.sub !== 'desenhos'));
  conferir('perguntas sem parte continuam', vieram.filter((p) => !p.sub).length, contar((p) => !p.sub));
}

/* ---------- so a parte, com a categoria desmarcada ---------- */
{
  const config = { categorias: [], subs: ['cinema:desenhos'], fora: [] };
  const vieram = perguntasEscolhidas(config, 'cinema');
  conferir('so desenhos: vem so desenho', vieram.every((p) => p.sub === 'desenhos'), true);
  conferir('so desenhos: vem todos os desenhos', vieram.length, contar((p) => p.sub === 'desenhos'));
  conferir('a categoria da parte entra no sorteio', categoriasEmJogo(config), ['cinema']);
}

/* ---------- misturando ---------- */
{
  const config = { categorias: ['bandeiras'], subs: ['esportes:nba'], fora: [] };
  conferir('categoria inteira + parte de outra', categoriasEmJogo(config), ['bandeiras', 'esportes']);
  conferir('da outra vem so a parte',
    perguntasEscolhidas(config, 'esportes').every((p) => p.sub === 'nba'), true);
  conferir('categoria que nao foi escolhida fica de fora', perguntasEscolhidas(config, 'cinema').length, 0);
}

/* ---------- Ouvir musicas ---------- */
{
  const ouvir = perguntasEscolhidas({ categorias: ['ouvir'] }, 'ouvir');
  conferir('Ouvir musicas: 44 perguntas, todas com audio', [ouvir.length, ouvir.every((p) => p.audio)], [44, true]);
  // Cada trecho tem duas perguntas: o nome da musica e quem canta.
  const porTrecho = {};
  for (const p of ouvir) porTrecho[p.audio] = (porTrecho[p.audio] || 0) + 1;
  conferir('cada trecho tem 2 perguntas', Object.values(porTrecho).every((n) => n === 2), true);
  conferir('Musica nao tem mais audio', QUESTOES.musica.some((p) => p.audio), false);
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
