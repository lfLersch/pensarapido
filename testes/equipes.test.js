'use strict';

/*
 * As equipes do Presente Grego.
 *
 * Elas existem desde a sala: quem entra cai na menor com vaga e pode trocar
 * de lado enquanto a partida nao comecou. A sala nasce com duas equipes de
 * dois e vai engordando sozinha conforme a galera chega, ate o lider mexer
 * nos botoes do saguao (ver formato.test.js).
 */

const { Sala } = require('../server/sala.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(56), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

const NOMES = ['ana', 'bia', 'caio', 'duda', 'elis', 'fabio', 'gil', 'hugo'];

function salaCom(quantos, modo = 'presente-grego') {
  const sala = new Sala('EQ01',
    { categorias: ['geografia'], subs: [], fora: [], modo, metaPontos: 9999, segundosPorPergunta: 20 },
    () => {}, () => {});
  for (let i = 0; i < quantos; i++) sala.entrar(NOMES[i], NOMES[i]);
  return sala;
}

const tamanhos = (sala) => sala.equipes.map((e) => e.jogadores.length);

/* ---------------- quem entra cai na equipe menor ---------------- */
{
  const sala = salaCom(4);
  conferir('4 na sala: duas equipes de dois', tamanhos(sala), [2, 2]);
  conferir('ninguem fica fora de equipe',
    sala.equipes.flatMap((e) => e.jogadores).sort(), NOMES.slice(0, 4).sort());
  sala.destruir();

  const impar = salaCom(5);
  conferir('5 na sala: 3 de um lado, 2 do outro', tamanhos(impar), [3, 2]);
  impar.destruir();
}

/* ---------------- o teto cresce junto com a sala ---------------- */
{
  // Duas equipes, e o tamanho sobe so quando nao cabe mais ninguem: com 5 na
  // sala sao duas de tres (3 x 2), com 7 sao duas de quatro (4 x 3).
  for (const [quantos, teto] of [[4, 2], [5, 3], [6, 3], [7, 4], [8, 4]]) {
    const sala = salaCom(quantos);
    conferir(`com ${quantos} na sala, cada equipe leva ate ${teto}`, sala.tetoEquipe(), teto);
    conferir('  e continuam sendo duas equipes', sala.equipes.length, 2);
    conferir('  com todo mundo em alguma',
      sala.equipes.flatMap((e) => e.jogadores).length, quantos);
    sala.destruir();
  }
}

/* ---------------- trocar de equipe ---------------- */
{
  const sala = salaCom(5);          // e1: ana, caio, elis | e2: bia, duda
  const paraOutra = sala.trocarEquipe('bia', 'e1');
  conferir('a equipe cheia recusa mais um', Boolean(paraOutra.erro), true);
  conferir('e a sala fica como estava', tamanhos(sala), [3, 2]);

  const voltando = sala.trocarEquipe('elis', 'e2');
  conferir('trocar para a equipe com vaga funciona', voltando.equipe, 'e2');
  conferir('as equipes ficam 2 x 3', tamanhos(sala), [2, 3]);
  conferir('ninguem fica em duas equipes ao mesmo tempo',
    sala.equipes.filter((e) => e.jogadores.includes('elis')).length, 1);

  conferir('trocar para a propria equipe nao muda nada',
    [sala.trocarEquipe('elis', 'e2').equipe, tamanhos(sala)], ['e2', [2, 3]]);
  conferir('equipe que nao existe e recusada', Boolean(sala.trocarEquipe('elis', 'e9').erro), true);
  sala.destruir();
}

/* ---------------- sair tira da equipe ---------------- */
{
  const sala = salaCom(4);
  sala.sair('ana');
  conferir('quem sai some das equipes',
    sala.equipes.flatMap((e) => e.jogadores).includes('ana'), false);
  conferir('e o teto acompanha a sala menor', sala.tetoEquipe(), 2);
  sala.destruir();
}

/* ---------------- comecar a partida ---------------- */
{
  const sala = salaCom(4);
  sala.trocarEquipe('bia', 'e2');   // ja estava la; so para garantir
  sala.equipes[0].jogadores.push(...sala.equipes[1].jogadores.splice(0));
  conferir('com todo mundo de um lado so, a partida nao comeca',
    /Faltam equipes/.test(sala.iniciar().erro || ''), true);
  sala.destruir();

  const ok = salaCom(5);
  conferir('3 contra 2 comeca', ok.iniciar().ok, true);
  ok.limparTemporizador();
  conferir('trocar de equipe no meio da partida e recusado',
    Boolean(ok.trocarEquipe('ana', 'e2').erro), true);

  /* Na equipe de tres os papeis giram: em tres rodadas, cada um leiloa uma vez. */
  const trio = ok.equipes.find((e) => e.jogadores.length === 3);
  const leiloeiros = new Set();
  for (let rodada = 1; rodada <= 3; rodada++) {
    ok.rodada = rodada;
    const leiloeiro = ok.leiloeiroDe(trio);
    const respondedor = ok.respondedorDe(trio);
    leiloeiros.add(leiloeiro);
    conferir(`rodada ${rodada}: quem leiloa nao responde`, leiloeiro === respondedor, false);
  }
  conferir('em tres rodadas, os tres leiloam', leiloeiros.size, 3);
  ok.destruir();
}

/* ---------------- expulsar (vale em todos os modos) ---------------- */
{
  for (const modo of ['tempo', 'escalada', 'carrossel', 'presente-grego']) {
    const sala = salaCom(3, modo);
    conferir(`${modo}: so o lider expulsa`, Boolean(sala.expulsar('bia', 'caio').erro), true);
    conferir(`${modo}: o lider expulsa`, Boolean(sala.expulsar('ana', 'caio').ok), true);
    conferir(`${modo}: quem foi expulso saiu da sala`, sala.jogadores.has('caio'), false);
    conferir(`${modo}: o lider nao se expulsa`, Boolean(sala.expulsar('ana', 'ana').erro), true);
    sala.destruir();
  }
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
