'use strict';

/*
 * O contador de usos e o rodizio do sorteio.
 *
 * Dentro de uma partida as perguntas ja nao se repetiam; o que se repetia era
 * de uma partida para a outra, porque a fila nova nascia embaralhada do zero.
 * Agora o rodizio e estrito: quem saiu menos vem sempre antes, e uma pergunta
 * so volta depois que todas as do grupo sairam. Empatadas, sorteio uniforme.
 */

const os = require('os');
const path = require('path');

// Contador so deste teste: nao mexe no usos.json de verdade.
process.env.USOS_ARQUIVO = path.join(os.tmpdir(), `usos-teste-${process.pid}.json`);
delete process.env.DATABASE_URL;

const usos = require('../server/usos.js');
const { Sala, idDaPergunta } = require('../server/sala.js');

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
  // Ninguem usado: a distribuicao tem que ser plana. Se a ordem vazasse para
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

/* ---------------- Quem ja saiu espera as outras ---------------- */
{
  const sufixo = Math.random().toString(36).slice(2);
  const zeradas = ['a', 'b', 'c'].map((x) => `espera-zerada-${x}-${sufixo}`);
  const usada = 'espera-usada-' + sufixo;
  usos.registrar(usada);
  const todas = [usada, ...zeradas];

  let usadaAntes = 0;
  for (let i = 0; i < 2000; i++) {
    const fila = usos.embaralharPorUso(todas, (x) => x);
    if (fila[fila.length - 1] !== usada) usadaAntes++;
  }
  conferir('a que ja saiu nunca passa na frente de uma que nao saiu', usadaAntes, 0);

  // sortear: tira uma do piso e ja conta o uso.
  const tiradas = [0, 1, 2].map(() => usos.sortear(todas, (x) => x));
  conferir('sortear tira as tres zeradas antes da usada',
    [...tiradas].sort(), [...zeradas].sort());
  conferir('  e conta o uso de cada uma', zeradas.map((z) => usos.usosDe(z)), [1, 1, 1]);
  conferir('sortear de lista vazia nao quebra', usos.sortear([], (x) => x), undefined);
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
  // Com o rodizio estrito ninguem passa a frente: todas ficam com 20.
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
  conferir('o uso fica igual para todas', distancia, 0);
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

/* ---------------- Entre partidas, a categoria passa inteira antes de repetir ---------------- */
{
  // Rap e magra: com o rodizio estrito, partidas seguidas so repetem uma
  // pergunta depois de passar por todas — mesmo com a curva de dificuldade.
  const perguntas = new Sala('US02', { categorias: ['rap'], modo: 'tempo', metaPontos: 100, segundosPorPergunta: 20 },
    () => {}).perguntasDaCategoria('rap');
  // A volta acaba quando todas sairam ao menos uma vez a mais do que o piso
  // de agora (o teste de cima ja tirou algumas de rap).
  const pisoAntes = Math.min(...perguntas.map((q) => usos.usosDe(idDaPergunta('rap', q))));
  const voltaAcabou = () => perguntas.every((q) => usos.usosDe(idDaPergunta('rap', q)) > pisoAntes);
  // Pergunta de imagem tem enunciado repetido ("Que filme e este?"): o que
  // identifica e o conjunto enunciado + resposta + midia.
  const chave = (q) => `${q.pergunta}|${q.resposta}|${q.imagem || q.audio || ''}`;
  const vistas = new Set();
  let repetiuCedo = 0;
  const ver = (q) => {
    if (vistas.has(chave(q))) repetiuCedo++;
    vistas.add(chave(q));
  };
  for (let p = 0; !voltaAcabou() && p < 100; p++) {
    const sala = new Sala('US3' + p,
      { categorias: ['rap'], modo: 'tempo', metaPontos: 100, segundosPorPergunta: 20 }, () => {});
    sala.entrar('ana', 'Ana');
    sala.iniciar(); // ja abre a primeira pergunta
    sala.limparTemporizador();
    ver(sala.perguntaAtual);
    for (let i = 0; i < 5 && !voltaAcabou(); i++) {
      sala.jogadores.get('ana').pontos = i * 25; // a curva anda
      ver(sala.sacarDaFila());
    }
    sala.destruir();
  }
  console.log(`     (rap tem ${perguntas.length}; a volta passou por ${vistas.size})`);
  conferir('a volta pela categoria chega ao fim', voltaAcabou(), true);
  conferir('nenhuma repetida antes de a categoria acabar', repetiuCedo, 0);
}

process.on('exit', () => require('fs').rmSync(process.env.USOS_ARQUIVO, { force: true }));
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
