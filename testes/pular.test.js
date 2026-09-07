'use strict';

/*
 * Votacao para pular a rodada: metade mais um pula.
 *
 * Serve para destravar a mesa quando a categoria nao agrada ou ninguem sabe a
 * pergunta. O voto alterna, vale nas tres fases em que a rodada esta no ar
 * (categoria, leilao e pergunta), e quem sai da sala leva o voto junto.
 */

const { Sala } = require('../server/sala.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(52), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

const NOMES = ['Ana', 'Bia', 'Caio', 'Duda', 'Elis', 'Fabio'];

function novaSala(quantos = 4, modo = 'tempo') {
  const eventos = [];
  const sala = new Sala('PUL1',
    { categorias: ['geografia'], modo, metaPontos: 9999, segundosPorPergunta: 20 },
    (evento, dados) => eventos.push({ evento, dados }),
    () => {});
  for (let i = 0; i < quantos; i++) sala.entrar(NOMES[i].toLowerCase(), NOMES[i]);
  sala.iniciar();
  sala.limparTemporizador();
  return { sala, eventos };
}

const ids = (sala) => [...sala.jogadores.keys()];

/* ---------------- Quantos votos fecham a conta ---------------- */
{
  for (const [quantos, esperado] of [[1, 1], [2, 2], [3, 2], [4, 3], [5, 3], [6, 4]]) {
    const { sala } = novaSala(Math.min(quantos, NOMES.length));
    // A sala e montada com o tamanho pedido; confere a regra de metade mais um.
    conferir(`sala de ${quantos} pede ${esperado} votos`, sala.votosParaPular(), esperado);
    sala.destruir();
  }
}

/* ---------------- Um voto so nao pula ---------------- */
{
  const { sala } = novaSala(4);
  const [ana, bia] = ids(sala);

  const r1 = sala.votarPular(ana);
  conferir('primeiro voto entra', [r1.votos, r1.necessarios], [1, 3]);
  conferir('  e a rodada continua de pe', sala.estado, 'categoria');

  const r2 = sala.votarPular(bia);
  conferir('segundo voto tambem nao fecha', r2.votos, 2);
  conferir('  rodada ainda viva', sala.estado, 'categoria');
  sala.destruir();
}

/* ---------------- Metade mais um pula na hora ---------------- */
{
  const { sala, eventos } = novaSala(4);
  const [ana, bia, caio] = ids(sala);

  sala.votarPular(ana);
  sala.votarPular(bia);
  sala.votarPular(caio);
  sala.limparTemporizador();

  conferir('o terceiro voto de 4 pula a rodada', sala.estado, 'resultado');
  const resultado = eventos.filter((e) => e.evento === 'rodada:resultado').pop().dados;
  conferir('  a tela diz que foi pulada', resultado.titulo, 'Rodada pulada');
  conferir('  e a resposta e revelada mesmo assim', resultado.resposta.length > 0, true);
  conferir('  sem ninguem pontuar',
    [...sala.jogadores.values()].map((j) => j.pontos), [0, 0, 0, 0]);
  sala.destruir();
}

/* ---------------- O voto alterna ---------------- */
{
  const { sala } = novaSala(4);
  const [ana, bia, caio] = ids(sala);

  sala.votarPular(ana);
  sala.votarPular(bia);
  const tirou = sala.votarPular(bia);
  conferir('clicar de novo tira o voto', [tirou.votou, tirou.votos], [false, 1]);

  // Com Bia fora, o voto de Caio ainda nao fecha os 3.
  sala.votarPular(caio);
  conferir('  e a conta volta a faltar um', sala.estado, 'categoria');

  sala.votarPular(bia);
  sala.limparTemporizador();
  conferir('  votando de novo, fecha', sala.estado, 'resultado');
  sala.destruir();
}

/* ---------------- Vale nas tres fases da rodada ---------------- */
{
  // Na pergunta.
  const { sala } = novaSala(3);
  sala.mostrarPergunta();
  sala.limparTemporizador();
  conferir('fase pergunta aceita voto', sala.estado, 'pergunta');
  const [ana, bia] = ids(sala);
  sala.votarPular(ana);
  sala.votarPular(bia);
  sala.limparTemporizador();
  conferir('  e 2 de 3 pulam', sala.estado, 'resultado');

  // Fora de rodada nao ha o que pular.
  const r = sala.votarPular(ana);
  conferir('no resultado nao da para votar', /rodada para pular/.test(r.erro || ''), true);
  sala.destruir();

  // No leilao do Presente Grego.
  const pg = new Sala('PUL2',
    { categorias: ['geografia'], modo: 'presente-grego', metaPontos: 9999, segundosPorPergunta: 20 },
    () => {}, () => {});
  for (let i = 0; i < 4; i++) pg.entrar(NOMES[i].toLowerCase(), NOMES[i]);
  pg.iniciar(); pg.limparTemporizador();
  pg.mostrarPergunta(); pg.limparTemporizador();   // categoria -> leilao
  conferir('fase leilao aceita voto', pg.estado, 'leilao');
  const jog = [...pg.jogadores.keys()];
  pg.votarPular(jog[0]);
  pg.votarPular(jog[1]);
  pg.votarPular(jog[2]);
  pg.limparTemporizador();
  conferir('  e a maioria pula o leilao', pg.estado, 'resultado');
  pg.destruir();
}

/* ---------------- Quem sai leva o voto junto ---------------- */
{
  // Sair baixa o teto: 4 pessoas pedem 3 votos, 3 pessoas pedem 2.
  const { sala } = novaSala(4);
  const [ana, bia, caio] = ids(sala);

  sala.votarPular(ana);
  sala.votarPular(bia);
  conferir('2 de 4 nao pula', sala.estado, 'categoria');

  // Caio sai sem ter votado: sobram 3 pessoas e os 2 votos ja bastam.
  sala.sair(caio);
  sala.limparTemporizador();
  conferir('com um a menos, os mesmos 2 votos fecham', sala.estado, 'resultado');
  sala.destruir();

  // Quem votou e saiu nao deixa o voto para tras.
  const { sala: sala2 } = novaSala(4);
  const outros = ids(sala2);
  sala2.votarPular(outros[0]);
  sala2.sair(outros[0]);
  sala2.limparTemporizador();
  conferir('o voto de quem saiu some', sala2.pulos.size, 0);
  conferir('  e a rodada segue', sala2.estado, 'categoria');
  sala2.destruir();
}

/* ---------------- A rodada seguinte comeca do zero ---------------- */
{
  const { sala } = novaSala(3);
  const [ana, bia] = ids(sala);
  sala.votarPular(ana);
  sala.votarPular(bia);
  sala.limparTemporizador();
  conferir('rodada 1 pulada', sala.estado, 'resultado');

  sala.proximaRodada();
  sala.limparTemporizador();
  conferir('a rodada nova zera a votacao', sala.pulos.size, 0);
  conferir('  e nao herda o pulo', sala.estado, 'categoria');
  sala.destruir();
}

/* ---------------- Quem nao esta na sala nao vota ---------------- */
{
  const { sala } = novaSala(3);
  const r = sala.votarPular('fantasma');
  conferir('quem nao esta na sala nao vota', /nao esta nesta sala/.test(r.erro || ''), true);
  conferir('  e nada foi contado', sala.pulos.size, 0);
  sala.destruir();
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
