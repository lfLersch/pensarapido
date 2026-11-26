'use strict';

/*
 * Dificuldade crescente: a partida começa pelas perguntas mais fáceis e
 * termina pelas mais difíceis.
 *
 * O "andamento" é o líder sobre a meta. Aqui a simulação empurra os pontos do
 * líder de 0 até a meta e confere que as perguntas sorteadas acompanham: as do
 * começo ficam entre as mais fáceis da categoria, as do fim entre as mais
 * difíceis. A comparação é dentro da categoria, igual ao sorteio.
 */

const os = require('os');
const path = require('path');

// Contador de usos zerado e so deste teste: com o arquivo de verdade, o que
// partidas e testes anteriores deixaram muda a frente da fila e o resultado.
process.env.USOS_ARQUIVO = path.join(os.tmpdir(), `usos-crescente-${process.pid}.json`);
delete process.env.DATABASE_URL;

const { Sala, idDaPergunta } = require('../server/sala.js');
const { QUESTOES } = require('../server/questions.js');
const dificuldade = require('../server/dificuldade.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(56), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

// O mesmo id que sala.js usa: pergunta com imagem ou audio leva a midia junto.
const difDe = (categoria, q) => dificuldade.dificuldadeDe(idDaPergunta(categoria, q), q.dif ?? 40);

/** Em que ponto da categoria a pergunta fica: 0 = a mais fácil, 1 = a mais difícil. */
function posicaoNaCategoria(categoria, q) {
  const todas = QUESTOES[categoria].map((x) => difDe(categoria, x));
  const valor = difDe(categoria, q);
  const abaixo = todas.filter((d) => d < valor).length;
  const iguais = todas.filter((d) => d === valor).length;
  return (abaixo + iguais / 2) / todas.length;
}

const media = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;

for (const categoria of ['cinema', 'geografia']) {
  const s = new Sala('CRE1', {
    modo: 'tempo', categorias: [categoria], metaPontos: 100, segundosPorPergunta: 20
  }, () => {});
  s.entrar('a', 'Ana');
  s.iniciar();
  s.limparTemporizador();
  const ana = s.jogadores.get('a');

  const porEtapa = [];
  for (let pontos = 0; pontos <= 100; pontos += 20) {
    ana.pontos = pontos;
    const etapa = [];
    for (let i = 0; i < 12; i++) {
      const q = s.sacarDaFila();
      etapa.push(posicaoNaCategoria(categoria, q));
    }
    porEtapa.push(media(etapa));
  }

  const inicio = porEtapa[0];
  const fim = porEtapa[porEtapa.length - 1];
  console.log(`  ${categoria}: ${porEtapa.map((p) => p.toFixed(2)).join(' -> ')}`);

  conferir(`${categoria}: comeco entre as mais faceis (< 0.35)`, inicio < 0.35, true);
  conferir(`${categoria}: fim entre as mais dificeis (> 0.65)`, fim > 0.65, true);
  conferir(`${categoria}: o fim e mais dificil que o comeco`, fim > inicio, true);
}

/*
 * A curva não pode prender a partida nas mesmas perguntas. Quando a janela
 * era um quarto da fila e saía sempre a mais perto do alvo, 20 partidas de
 * cinema (3 perguntas cada, no começo) mostravam umas 17 perguntas
 * diferentes. Agora a curva só escolhe entre as que saíram menos vezes:
 * as 60 têm que ser diferentes.
 */
{
  const vistas = new Set();
  for (let p = 0; p < 20; p++) {
    const s = new Sala('CRE3' + p, {
      modo: 'tempo', categorias: ['cinema'], metaPontos: 100, segundosPorPergunta: 20
    }, () => {});
    s.entrar('a', 'Ana');
    s.iniciar();
    s.limparTemporizador();
    // Pergunta de imagem repete o enunciado ("Que filme e este?"): a
    // identidade e enunciado + resposta + imagem.
    for (let i = 0; i < 3; i++) {
      const q = s.sacarDaFila();
      vistas.add(`${q.pergunta}|${q.resposta}|${q.imagem || ''}`);
    }
    s.destruir();
  }
  console.log(`  cinema, 20 partidas x 3 perguntas: ${vistas.size} diferentes`);
  conferir('o comeco da partida nao repete de uma partida para outra', vistas.size, 60);
}

/* O andamento nunca passa de 1, nem com o líder acima da meta. */
{
  const s = new Sala('CRE2', {
    modo: 'tempo', categorias: ['cinema'], metaPontos: 50, segundosPorPergunta: 20
  }, () => {});
  s.entrar('a', 'Ana');
  s.jogadores.get('a').pontos = 80;
  conferir('andamento travado em 1 acima da meta', s.andamento(), 1);
  s.jogadores.get('a').pontos = 0;
  conferir('andamento 0 no comeco', s.andamento(), 0);
}

// Depois do `exit` do usos.js, que grava o que ficou pendente.
process.on('exit', () => require('fs').rmSync(process.env.USOS_ARQUIVO, { force: true }));

if (falhas) {
  console.log(`\n${falhas} falha(s).`);
  process.exit(1);
}
console.log('\nTudo certo.');
process.exit(0);
