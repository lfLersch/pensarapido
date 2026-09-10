'use strict';

/*
 * Lista generica aceita tudo o que as especificas aceitam.
 *
 * "Cite super-herois" e "Cite herois da Marvel" eram a mesma pergunta com
 * respostas diferentes: Gaviao Arqueiro valia numa e nao na outra. Toda lista
 * de INCLUSOES precisa aceitar cada resposta das listas que ela inclui.
 */

const { LISTAS, INCLUSOES, itemDe } = require('../server/escalada.js');
const { avaliar } = require('../server/comparar.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(58), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

const acertaAlgum = (texto, itens) =>
  itens.some((i) => avaliar(texto, i.oficial, i.variantes).veredito === 'certo');

for (const [geral, especificas] of Object.entries(INCLUSOES)) {
  const itens = LISTAS.find((l) => l.pergunta === geral).respostas.map(itemDe);
  const faltam = [];
  for (const pergunta of especificas) {
    for (const bruto of LISTAS.find((l) => l.pergunta === pergunta).respostas) {
      const { oficial } = itemDe(bruto);
      if (!acertaAlgum(oficial, itens)) faltam.push(oficial);
    }
  }
  conferir(`${geral.replace('Cite {n} ', '')} aceita tudo das especificas`, faltam, []);
}

/* O caso que motivou a regra, e o que ela nao pode estragar. */
{
  const superHerois = LISTAS.find((l) => l.pergunta === 'Cite {n} super-herois').respostas.map(itemDe);
  conferir('Gaviao Arqueiro vale em super-herois', acertaAlgum('Gaviao Arqueiro', superHerois), true);
  conferir('Mulher-Maravilha tambem', acertaAlgum('Mulher-Maravilha', superHerois), true);

  const viloes = LISTAS.find((l) => l.pergunta === 'Cite {n} viloes de quadrinhos').respostas.map(itemDe);
  conferir('Charada (DC) vale em viloes de quadrinhos', acertaAlgum('Charada', viloes), true);
  conferir('Thanos (Marvel) tambem', acertaAlgum('Thanos', viloes), true);

  // A especifica continua especifica: a Marvel nao ganha herois da DC.
  const marvel = LISTAS.find((l) => l.pergunta === 'Cite {n} herois da Marvel').respostas.map(itemDe);
  conferir('Batman nao vale em herois da Marvel', acertaAlgum('Batman', marvel), false);
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
