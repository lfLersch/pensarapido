'use strict';

/*
 * Notas de versao (a aba Novidades do saguao).
 *
 * O teste cobra o formato, porque a lista e escrita a mao: data legivel, a
 * mais nova em cima, nenhuma versao repetida e nenhum item vazio.
 */

const { NOTAS, VERSAO } = require('../server/notas.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(52), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

conferir('tem nota que chegue', NOTAS.length >= 3, true);

const semCampo = NOTAS.filter((n) => !n.versao || !n.data || !n.titulo || !Array.isArray(n.itens));
conferir('toda nota tem versao, data, titulo e itens', semCampo.map((n) => n.versao || '?'), []);

const dataTorta = NOTAS.filter((n) => !/^\d{4}-\d{2}-\d{2}$/.test(n.data));
conferir('a data vem no formato ano-mes-dia', dataTorta.map((n) => n.versao), []);

const vazias = NOTAS.filter((n) => !n.itens.length || n.itens.some((i) => !i || i.trim().length < 15));
conferir('nenhum item vazio ou curto demais', vazias.map((n) => n.versao), []);

const versoes = NOTAS.map((n) => n.versao);
conferir('nenhuma versao repetida', versoes.length, new Set(versoes).size);

const datas = NOTAS.map((n) => n.data);
conferir('a mais nova fica no topo', [...datas].sort().reverse(), datas);

conferir('a versao do jogo e a do topo da lista', VERSAO, NOTAS[0].versao);

// A aba mostra o texto como ele esta aqui: tag solta apareceria crua.
const comTag = NOTAS.filter((n) => [n.titulo, ...n.itens].some((t) => /<[^>]+>/.test(t)));
conferir('nenhuma nota com marcacao html', comTag.map((n) => n.versao), []);

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
