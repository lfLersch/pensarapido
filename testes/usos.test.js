'use strict';

/*
 * O contador de usos e o rodizio do sorteio.
 *
 * Dentro de uma partida as perguntas ja nao se repetiam; o que se repetia era
 * de uma partida para a outra, porque a fila nova nascia embaralhada do zero.
 * Agora quem ja saiu perde peso ate as outras alcancarem — e quando todas
 * empatam, todas voltam a ter a mesma chance.
 */

const usos = require('../server/usos.js');
const { Sala } = require('../server/sala.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(58), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

const perto = (nome, obtido, esperado, folga) => {
  const ok = Math.abs(obtido - esperado) <= folga;
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(58), obtido,
    ok ? '' : `<-- esperava ~${esperado} (+-${folga})`);
};

/* ---------------- O peso: relativo a menos usada do grupo ---------------- */
{
  conferir('quem esta no piso vale 1', usos.pesoDe(0, 0), 1);
  conferir('  e o piso e relativo, nao absoluto', usos.pesoDe(7, 7), 1);
  conferir('todas empatadas, todas valem o mesmo',
    [usos.pesoDe(3, 3), usos.pesoDe(3, 3)], [1, 1]);

  const umAMais = usos.pesoDe(1, 0);
  const doisAMais = usos.pesoDe(2, 0);
  conferir('um uso a mais pesa menos que o piso', umAMais < 1, true);
  conferir('  e dois a mais pesam menos ainda', doisAMais < umAMais, true);
  conferir('  mas nunca chega a zero: continua podendo sair', doisAMais > 0, true);
  conferir('a perda e so uma inclinacao, nao uma proibicao', umAMais > 0.3, true);
}

/* ---------------- O contador anda e persiste na memoria ---------------- */
{
  const id = 'teste-contador-' + Math.random().toString(36).slice(2);
  conferir('pergunta nova comeca zerada', usos.usosDe(id), 0);
  conferir('registrar devolve o total novo', usos.registrar(id), 1);
  usos.registrar(id);
  conferir('  e vai somando', usos.usosDe(id), 2);
  conferir('id vazio nao conta nada', usos.registrar(''), 0);
}

/* ---------------- Com todos empatados, o sorteio e uniforme ---------------- */
{
  // Ninguem usado: a distribuicao tem que ser plana. Se o peso vazasse para
  // um lado, a primeira posicao cairia sempre nos mesmos.
  const itens = ['a', 'b', 'c', 'd'].map((x) => 'plano-' + x);
  const primeiros = new Map(itens.map((i) => [i, 0]));
  const RODADAS = 4000;
  for (let i = 0; i < RODADAS; i++) {
    const fila = usos.embaralharPorUso(itens, (x) => x);
    primeiros.set(fila[0], primeiros.get(fila[0]) + 1);
  }
  const esperado = RODADAS / itens.length;
  for (const [item, vezes] of primeiros) {
    perto(`${item} abre a fila umas ${esperado} vezes`, vezes, esperado, esperado * 0.25);
  }
}

/* ---------------- Quem ja saiu cede a vez ---------------- */
{
  const zerada = 'cede-zerada-' + Math.random().toString(36).slice(2);
  const usada = 'cede-usada-' + Math.random().toString(36).slice(2);
  for (let i = 0; i < 3; i++) usos.registrar(usada);

  let zeradaNaFrente = 0;
  const RODADAS = 2000;
  for (let i = 0; i < RODADAS; i++) {
    const fila = usos.embaralharPorUso([zerada, usada], (x) => x);
    if (fila[0] === zerada) zeradaNaFrente++;
  }
  conferir('a que nunca saiu abre a fila na maioria das vezes',
    zeradaNaFrente > RODADAS * 0.6, true);
  conferir('  mas a outra ainda sai de vez em quando',
    zeradaNaFrente < RODADAS, true);
}

/* ---------------- Uma lista de um item so nao quebra ---------------- */
{
  conferir('lista de um item volta ela mesma',
    usos.embaralharPorUso(['unico'], (x) => x), ['unico']);
  conferir('lista vazia volta vazia', usos.embaralharPorUso([], (x) => x), []);
}

/* ---------------- Na pratica: o rodizio achata o uso ---------------- */
{
  // 30 perguntas, 40 partidas de 15 rodadas: o ideal e 20 usos para cada uma.
  // Com embaralhamento uniforme o intervalo fica largo; com o rodizio, apertado.
  const N = 30, PARTIDAS = 40, RODADAS = 15;
  const itens = Array.from({ length: N }, (_, i) => `rodizio-${Math.random().toString(36).slice(2)}-${i}`);

  const conta = new Map(itens.map((i) => [i, 0]));
  for (let p = 0; p < PARTIDAS; p++) {
    const fila = usos.embaralharPorUso(itens, (x) => x);
    for (let r = 0; r < RODADAS; r++) {
      conta.set(fila[r], conta.get(fila[r]) + 1);
      usos.registrar(fila[r]);
    }
  }

  const vezes = [...conta.values()];
  const ideal = (PARTIDAS * RODADAS) / N;
  const distancia = Math.max(...vezes) - Math.min(...vezes);
  console.log(`     (ideal ${ideal} usos; saiu de ${Math.min(...vezes)} a ${Math.max(...vezes)})`);
  conferir('o uso fica perto do ideal para todas', distancia <= 6, true);
  conferir('  e ninguem fica de fora', Math.min(...vezes) > 0, true);
}

/* ---------------- A sala conta de verdade ao sortear ---------------- */
{
  const sala = new Sala('US01',
    { categorias: ['rap'], subs: [], fora: [], modo: 'tempo', metaPontos: 9999, segundosPorPergunta: 20 },
    () => {}, () => {});
  sala.entrar('ana', 'Ana');

  const antes = usos.resumo();
  const somaAntes = Object.values(antes).reduce((a, b) => a + b, 0);

  sala.montarFila();
  const sorteadas = [];
  for (let i = 0; i < 5; i++) sorteadas.push(sala.sacarDaFila());

  const somaDepois = Object.values(usos.resumo()).reduce((a, b) => a + b, 0);
  conferir('cada pergunta sorteada soma um no contador', somaDepois - somaAntes, 5);
  conferir('  e vieram cinco perguntas diferentes',
    new Set(sorteadas.map((q) => q.resposta)).size, 5);
  sala.destruir();
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
