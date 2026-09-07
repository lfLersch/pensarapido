'use strict';

/*
 * Duas respostas da MESMA lista nao podem ser a mesma coisa para o comparador.
 *
 * A regua de acerto aceita ate 10% de erro. Numa lista de 97 filmes, "O
 * Poderoso Chefao" e a variante "O Poderoso Chefao 2" ficam a uma letra de
 * distancia: 1 de 16 caracteres da 6% de erro, ou seja, "certo". Na pratica os
 * dois filmes viravam a mesma resposta — quem dissesse os dois ouvia
 * "voce ja tinha dito" no segundo, e um item ficava inalcancavel.
 *
 * Como `palpitar` varre a lista inteira e para no primeiro item livre, o
 * defeito e silencioso: nada quebra, so some uma resposta.
 */

const { LISTAS, itemDe } = require('../server/escalada.js');
const { avaliar } = require('../server/comparar');

let falhas = 0;

const choques = [];
let formasTestadas = 0;

for (const lista of LISTAS) {
  const itens = lista.respostas.map(itemDe);

  for (let i = 0; i < itens.length; i++) {
    // Testa a resposta oficial e cada variante aceita contra os outros itens.
    for (const forma of [itens[i].oficial, ...itens[i].variantes]) {
      formasTestadas++;
      for (let j = 0; j < itens.length; j++) {
        if (i === j) continue;
        if (avaliar(forma, itens[j].oficial, itens[j].variantes).veredito === 'certo') {
          choques.push(`${lista.pergunta}: "${forma}" tambem acerta "${itens[j].oficial}"`);
        }
      }
    }
  }
}

console.log(`${LISTAS.length} listas, ${formasTestadas} formas de resposta conferidas`);

if (choques.length) {
  falhas = choques.length;
  for (const c of [...new Set(choques)]) console.log('FALHA', c);
} else {
  console.log('ok    nenhuma resposta acerta outra da mesma lista');
}

/* ---------- Nenhuma lista com item repetido ---------- */
{
  const repetidos = [];
  for (const lista of LISTAS) {
    const vistos = new Set();
    for (const item of lista.respostas.map(itemDe)) {
      const chave = item.oficial.toLowerCase();
      if (vistos.has(chave)) repetidos.push(`${lista.pergunta}: "${item.oficial}"`);
      vistos.add(chave);
    }
  }
  if (repetidos.length) {
    falhas += repetidos.length;
    for (const r of repetidos) console.log('FALHA item repetido em', r);
  } else {
    console.log('ok    nenhuma lista com item repetido');
  }
}

/* ---------- Listas que existem e nao encolheram ---------- */
{
  // Guarda o tamanho minimo das listas grandes: uma edicao futura que corte
  // metade dos itens sem querer para aqui.
  const MINIMOS = [
    ['Cite {n} atores internacionais', 150],
    ['Cite {n} atrizes internacionais', 80],
    ['Cite {n} artistas que ja ganharam o Grammy', 130],
    ['Cite {n} series de TV famosas', 110],
    ['Cite {n} sitcoms', 45],
    ['Cite {n} personagens da mitologia grega', 100],
    ['Cite {n} personagens de Bob Esponja', 20],
    ['Cite {n} artistas de funk brasileiro', 80],
    ['Cite {n} cantores sertanejos', 100],
    ['Cite {n} divas pop', 70],
    ['Cite {n} pilotos de Formula 1', 90],
    ['Cite {n} ditadores da historia', 65],
    ['Cite {n} presidentes e lideres mundiais do seculo XXI', 110],
    ['Cite {n} filosofos ou sociologos', 130],
    ['Cite {n} coisas que tem em uma cozinha', 85],
    ['Cite {n} coisas que tem em um banheiro', 45],
    ['Cite {n} coisas que tem em um quarto', 40],
    ['Cite {n} coisas que tem em uma sala de estar', 35],
    ['Cite {n} coisas que tem em uma area de servico', 30],
    ['Cite {n} coisas que tem em uma garagem', 35],
    ['Cite {n} coisas que tem em um quintal', 32],
    ['Cite {n} coisas que tem em um escritorio', 38],
    ['Cite {n} coisas que tem na aula de portugues', 130],
    ['Cite {n} coisas que tem na aula de matematica', 125]
  ];

  for (const [pergunta, minimo] of MINIMOS) {
    const lista = LISTAS.find((l) => l.pergunta === pergunta);
    const quantos = lista ? lista.respostas.length : 0;
    const ok = quantos >= minimo;
    if (!ok) falhas++;
    console.log((ok ? 'ok   ' : 'FALHA'), pergunta.padEnd(46),
      String(quantos).padStart(4), ok ? '' : '<-- esperava ao menos ' + minimo);
  }
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
