'use strict';

/*
 * Faixa de dificuldade do Modo Tempo: o lider escolhe de que pedaco de cada
 * categoria saem as perguntas (0 = a mais facil de la, 100 = a mais dificil),
 * e a faixa da o titulo da sala — de Primata a Pseudo intelectual.
 *
 * Confere a validacao, o titulo de cada combinacao de niveis, que os tres
 * tercos repartem a categoria sem sobra nem buraco e que a partida so sorteia
 * dentro da faixa.
 */

const {
  Sala, idDaPergunta, perguntasEscolhidas, naFaixa, faixaDe, tituloDaFaixa,
  NIVEIS_FAIXA, TITULOS_FAIXA, FAIXA_MIN_LARGURA
} = require('../server/sala.js');
const { CATEGORIAS } = require('../server/questions.js');
const dificuldade = require('../server/dificuldade.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(62), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

const difDe = (categoria, q) => dificuldade.dificuldadeDe(idDaPergunta(categoria, q), q.dif ?? 40);
const daCategoria = (categoria) => perguntasEscolhidas({ categorias: [categoria] }, categoria);

/* A faixa que chega do cliente. */
conferir('0 a 100 passa', faixaDe({ min: 0, max: 100 }), { min: 0, max: 100 });
conferir('34 a 66 passa', faixaDe({ min: 34, max: 66 }), { min: 34, max: 66 });
conferir('a mais estreita permitida passa', faixaDe({ min: 40, max: 40 + FAIXA_MIN_LARGURA }), { min: 40, max: 50 });
conferir('estreita demais vira 0 a 100', faixaDe({ min: 40, max: 45 }), { min: 0, max: 100 });
conferir('invertida vira 0 a 100', faixaDe({ min: 80, max: 20 }), { min: 0, max: 100 });
conferir('fora da escala vira 0 a 100', faixaDe({ min: -5, max: 120 }), { min: 0, max: 100 });
conferir('numero quebrado vira 0 a 100', faixaDe({ min: 10.5, max: 60 }), { min: 0, max: 100 });
conferir('sem faixa vira 0 a 100', faixaDe(undefined), { min: 0, max: 100 });

/* O titulo: o nivel do comeco e o do fim da faixa. */
const titulo = (min, max) => tituloDaFaixa({ min, max }).nome;
conferir('0 a 100 e Normal', titulo(0, 100), 'Normal');
conferir('facil ate facil e Primata', titulo(0, 33), 'Primata');
conferir('facil ate medio e Analfabeto', titulo(0, 66), 'Analfabeto');
conferir('medio ate medio e Esquisito', titulo(34, 66), 'Esquisito');
conferir('medio ate dificil e Palestrinha', titulo(34, 100), 'Palestrinha');
conferir('dificil ate dificil e Pseudo intelectual', titulo(67, 100), 'Pseudo intelectual');
conferir('facil ate dificil, sem as pontas, continua Normal', titulo(20, 80), 'Normal');
conferir('a divisa: 33 ainda e facil, 34 ja e medio', [titulo(10, 33), titulo(10, 34)], ['Primata', 'Analfabeto']);

// Toda combinacao de niveis que da faixa (comeco antes do fim) tem um titulo so.
const ids = NIVEIS_FAIXA.map((n) => n.id);
const combinacoes = ids.flatMap((de, i) => ids.slice(i).map((ate) => `${de}-${ate}`));
conferir('um titulo para cada combinacao de niveis',
  combinacoes.map((c) => TITULOS_FAIXA.filter((t) => `${t.de}-${t.ate}` === c).length), combinacoes.map(() => 1));
conferir('os niveis cobrem 0 a 100 sem buraco',
  NIVEIS_FAIXA.every((n, i) => n.de === (i ? NIVEIS_FAIXA[i - 1].ate + 1 : 0)) && NIVEIS_FAIXA.at(-1).ate === 100, true);

/* Os tres tercos repartem cada categoria: sem sobra, sem buraco, em ordem. */
for (const categoria of ['cinema', 'futebol', 'rap', 'matematica']) {
  const todas = daCategoria(categoria);
  const tercos = NIVEIS_FAIXA.map((n) => naFaixa(categoria, todas, { min: n.de, max: n.ate }));
  const juntas = new Set(tercos.flat());
  conferir(`${categoria}: os tercos somam a categoria inteira, sem repetir`,
    [juntas.size, tercos.flat().length], [todas.length, todas.length]);
  // Cada ponto vale meio para cada lado: 0-33 tem 33,5 de largura, 34-66 tem 33.
  const largura = (n) => Math.min(100, n.ate + 0.5) - Math.max(0, n.de - 0.5);
  conferir(`${categoria}: cada terco leva a fatia da largura dele (+-1)`,
    tercos.every((t, i) => Math.abs(t.length - (todas.length * largura(NIVEIS_FAIXA[i])) / 100) <= 1), true);
  const maxFacil = Math.max(...tercos[0].map((q) => difDe(categoria, q)));
  const minDificil = Math.min(...tercos[2].map((q) => difDe(categoria, q)));
  conferir(`${categoria}: a mais dificil do facil <= a mais facil do dificil`, maxFacil <= minDificil, true);
  conferir(`${categoria}: 0 a 100 devolve tudo`, naFaixa(categoria, todas, { min: 0, max: 100 }).length, todas.length);
}

/* A largura minima garante pergunta em toda categoria de 10 ou mais. */
{
  const vazias = [];
  for (const { id } of CATEGORIAS) {
    const todas = daCategoria(id);
    if (todas.length < 10) continue;
    for (let min = 0; min + FAIXA_MIN_LARGURA <= 100; min++) {
      if (!naFaixa(id, todas, { min, max: min + FAIXA_MIN_LARGURA }).length) vazias.push(`${id} ${min}`);
    }
  }
  conferir('nenhuma faixa de largura minima fica vazia', vazias, []);
}

/* A partida so sorteia dentro da faixa, e continua andando do facil ao dificil dentro dela. */
function sortear(faixa, categoria, quantas) {
  const s = new Sala('FAI1', {
    modo: 'tempo', categorias: [categoria], metaPontos: 100, segundosPorPergunta: 20, faixa
  }, () => {});
  s.entrar('a', 'Ana');
  s.iniciar();
  s.limparTemporizador();
  const sorteadas = [];
  for (let i = 0; i < quantas; i++) {
    s.jogadores.get('a').pontos = Math.round((100 * i) / quantas);
    sorteadas.push(s.sacarDaFila());
  }
  s.destruir();
  return sorteadas;
}

for (const [faixa, nome] of [[{ min: 67, max: 100 }, 'Pseudo intelectual'], [{ min: 0, max: 33 }, 'Primata']]) {
  const dentro = new Set(naFaixa('cinema', daCategoria('cinema'), faixa).map((q) => q.pergunta));
  const sorteadas = sortear(faixa, 'cinema', 60);
  conferir(`${nome}: as 60 perguntas sorteadas estao na faixa`,
    sorteadas.filter((q) => !dentro.has(q.pergunta)).length, 0);
}

{
  // Rap tem 62 perguntas: o terco de cima tem 20, e a partida passa disso.
  const dentro = new Set(naFaixa('rap', daCategoria('rap'), { min: 67, max: 100 }).map((q) => q.pergunta));
  const sorteadas = sortear({ min: 67, max: 100 }, 'rap', 30);
  conferir('rap, so dificeis: mesmo dando a volta na fila, nada de fora',
    sorteadas.filter((q) => !dentro.has(q.pergunta)).length, 0);
}

{
  const faixa = { min: 34, max: 100 };
  const dentro = naFaixa('cinema', daCategoria('cinema'), faixa).map((q) => difDe('cinema', q)).sort((a, b) => a - b);
  const meio = dentro[Math.floor(dentro.length / 2)];
  const sorteadas = sortear(faixa, 'cinema', 40).map((q) => difDe('cinema', q));
  const media = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const comeco = media(sorteadas.slice(0, 8));
  const fim = media(sorteadas.slice(-8));
  console.log(`  palestrinha em cinema: comeco ${comeco.toFixed(1)}, fim ${fim.toFixed(1)}, meio da faixa ${meio}`);
  conferir('dentro da faixa a partida ainda comeca pelas mais faceis', comeco < meio && fim > meio, true);
}

/* Sem faixa (os outros modos), a categoria vem inteira. */
{
  const s = new Sala('FAI2', { modo: 'escalada', categorias: ['rap'], metaPontos: 100, segundosPorPergunta: 20 }, () => {});
  conferir('sem faixa na config: a categoria inteira', s.perguntasDaCategoria('rap').length, daCategoria('rap').length);
  s.destruir();
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
