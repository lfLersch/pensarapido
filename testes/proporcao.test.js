'use strict';

/*
 * Imagem ou texto: a sala escolhe quanto das perguntas e de imagem. "So
 * imagens" so tira pergunta com imagem, "so texto" nenhuma, e 5:1, 2:1, 1:1...
 * espalham os dois tipos nessa proporcao.
 */

const { Sala, PROPORCOES_IMAGEM } = require('../server/sala.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(62), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

/** As `n` primeiras perguntas de uma sala de Modo Tempo: true = com imagem. */
function sorteadas(proporcaoImagem, n, categorias = ['cinema', 'geografia', 'matematica', 'futebol']) {
  const sala = new Sala('PROP', {
    modo: 'tempo', categorias, subs: [], fora: [], metaPontos: 9999, segundosPorPergunta: 20,
    ...(proporcaoImagem ? { proporcaoImagem } : {})
  }, () => {}, () => {});
  const tipos = [];
  for (let i = 0; i < n; i++) tipos.push(Boolean(sala.perguntaSimples().imagem));
  sala.destruir();
  return tipos;
}
const imagens = (tipos) => tipos.filter(Boolean).length;

conferir('as opcoes vao de so imagens a so texto, com Normal de padrao',
  PROPORCOES_IMAGEM.map((p) => p.id), ['livre', 'so-imagem', '5-1', '2-1', '1-1', '1-2', '1-5', 'so-texto']);

const soImagem = sorteadas('so-imagem', 30);
conferir('so imagens: as 30 perguntas tem imagem', imagens(soImagem), 30);
const soTexto = sorteadas('so-texto', 30);
conferir('so texto: nenhuma das 30 tem imagem', imagens(soTexto), 0);

conferir('1:1: 15 de 30 com imagem', imagens(sorteadas('1-1', 30)), 15);
conferir('2:1: 20 de 30 com imagem', imagens(sorteadas('2-1', 30)), 20);
conferir('5:1: 25 de 30 com imagem', imagens(sorteadas('5-1', 30)), 25);
conferir('1:5: 5 de 30 com imagem', imagens(sorteadas('1-5', 30)), 5);

const dois = sorteadas('2-1', 9);
conferir('2:1 espalhado: imagem, imagem, texto, e de novo', dois,
  [true, true, false, true, true, false, true, true, false]);

// Sem nada do tipo pedido nas categorias marcadas, vale qualquer uma.
conferir('so imagens com so Matematica: segue com texto, sem travar',
  sorteadas('so-imagem', 5, ['matematica']).length, 5);

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
