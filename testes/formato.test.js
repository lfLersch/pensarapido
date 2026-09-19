'use strict';

/*
 * O formato das equipes: QUANTAS e de que TAMANHO.
 *
 * A sala nasce no menor formato que da jogo — duas equipes de dois — e cresce
 * dali. Sozinha enquanto a galera chega, cada modo pelo seu eixo: o Dando
 * dicas abre duplas novas (mais gente no leilao), o Presente Grego engorda as
 * duas que ja existem. Quando o lider mexe no + do saguao, a sala passa a ser
 * dele e para de se arrumar.
 */

const { Sala } = require('../server/sala.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(56), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

const NOMES = ['ana', 'bia', 'caio', 'duda', 'elis', 'fabio', 'gil', 'hugo',
  'ines', 'joao', 'kaue', 'lia'];

function salaCom(quantos, modo = 'presente-grego') {
  const sala = new Sala('FM01',
    { categorias: ['geografia'], subs: [], fora: [], modo, metaPontos: 9999, segundosPorPergunta: 20 },
    () => {}, () => {});
  for (let i = 0; i < quantos; i++) sala.entrar(NOMES[i], NOMES[i]);
  return sala;
}

/** O formato como a tela ve: "N de T". */
const formato = (sala) => {
  const f = sala.estadoPublico().formato;
  return [f.equipes, f.tamanho];
};
const tamanhos = (sala) => sala.equipes.map((e) => e.jogadores.length);

/* ---------------- A sala nasce no minimo ---------------- */
{
  const sala = salaCom(0);
  conferir('sala vazia ja tem duas equipes de dois', formato(sala), [2, 2]);
  conferir('  e nenhuma delas tem gente', tamanhos(sala), [0, 0]);
  sala.destruir();

  const tempo = salaCom(4, 'tempo');
  conferir('modo sem equipe nao manda formato', tempo.estadoPublico().formato, null);
  tempo.destruir();
}

/* ---------------- O + da direita: mais equipes ---------------- */
{
  const sala = salaCom(4);
  conferir('so o lider mexe',
    /So o lider/.test(sala.mudarFormato('bia', 'equipes', 1).erro || ''), true);

  conferir('o lider abre a terceira equipe', sala.mudarFormato('ana', 'equipes', 1).equipes, 3);
  conferir('  e ela nasce vazia, no fim da fila', tamanhos(sala), [2, 2, 0]);
  conferir('  com cor e id proprios',
    sala.equipes.map((e) => e.id), ['e1', 'e2', 'e3']);

  // Vai ate seis, que e quantas cores existem.
  for (let i = 0; i < 3; i++) sala.mudarFormato('ana', 'equipes', 1);
  conferir('o teto e seis equipes', sala.equipes.length, 6);
  conferir('  e a setima e recusada',
    /maximo e 6 equipes/.test(sala.mudarFormato('ana', 'equipes', 1).erro || ''), true);
  sala.destruir();
}

/* ---------------- O − da direita: fechar equipe ---------------- */
{
  const sala = salaCom(4);
  sala.mudarFormato('ana', 'equipes', 1);
  conferir('a equipe vazia fecha', sala.mudarFormato('ana', 'equipes', -1).equipes, 2);
  conferir('  e as duas do minimo nao fecham',
    /minimo/.test(sala.mudarFormato('ana', 'equipes', -1).erro || ''), true);

  // Com gente dentro, o servidor nao decide por ninguem: manda tirar antes.
  sala.mudarFormato('ana', 'equipes', 1);
  sala.mudarFormato('ana', 'tamanho', 1);
  sala.trocarEquipe('bia', 'e3');
  conferir('equipe com gente nao fecha',
    /Tire a galera/.test(sala.mudarFormato('ana', 'equipes', -1).erro || ''), true);
  conferir('  e ela continua la', sala.equipes.length, 3);
  sala.destruir();
}

/* ---------------- O + de baixo: equipes maiores ---------------- */
{
  const sala = salaCom(4);
  conferir('o lider aumenta o tamanho', sala.mudarFormato('ana', 'tamanho', 1).tamanho, 3);
  conferir('  e o teto de cada equipe acompanha', sala.tetoEquipe(), 3);
  conferir('  entao o terceiro entra numa que estava cheia',
    Boolean(sala.trocarEquipe('duda', 'e1').ok), true);
  conferir('  e a sala fica 3 x 1', tamanhos(sala), [3, 1]);

  for (let i = 0; i < 3; i++) sala.mudarFormato('ana', 'tamanho', 1);
  conferir('o teto do tamanho e seis', sala.tamanhoEquipe, 6);
  conferir('  e o setimo e recusado',
    /maximo e 6 por equipe/.test(sala.mudarFormato('ana', 'tamanho', 1).erro || ''), true);
  sala.destruir();
}

/* ---------------- O − de baixo: nao encolhe em cima de ninguem ---------------- */
{
  const sala = salaCom(6);            // duas de tres
  conferir('seis na sala dao duas de tres', formato(sala), [2, 3]);
  conferir('nao da para encolher com equipe cheia',
    /Tem equipe com 3/.test(sala.mudarFormato('ana', 'tamanho', -1).erro || ''), true);

  sala.sair('fabio');
  sala.sair('elis');
  conferir('com as equipes menores, encolhe', sala.mudarFormato('ana', 'tamanho', -1).tamanho, 2);
  conferir('  e o minimo e dois',
    /precisa de dois/.test(sala.mudarFormato('ana', 'tamanho', -1).erro || ''), true);
  sala.destruir();
}

/* ---------------- Cada modo cresce pelo seu eixo ---------------- */
{
  // Presente Grego: duas equipes que engordam.
  for (const [quantos, esperado] of [[4, [2, 2]], [6, [2, 3]], [8, [2, 4]], [12, [2, 6]]]) {
    const sala = salaCom(quantos);
    conferir(`Presente Grego com ${quantos}: ${esperado[0]} de ${esperado[1]}`,
      formato(sala), esperado);
    sala.destruir();
  }

  // Dando dicas: duplas que se multiplicam.
  for (const [quantos, esperado] of [[4, [2, 2]], [6, [3, 2]], [8, [4, 2]], [12, [6, 2]]]) {
    const sala = salaCom(quantos, 'dando-dicas');
    conferir(`Dando dicas com ${quantos}: ${esperado[0]} de ${esperado[1]}`,
      formato(sala), esperado);
    sala.destruir();
  }
}

/* ---------------- Mexeu no formato, a sala para de crescer ---------------- */
{
  const sala = salaCom(4, 'dando-dicas');
  sala.mudarFormato('ana', 'tamanho', 1);      // duplas viram trios, na mao
  sala.entrar('elis', 'elis');
  sala.entrar('fabio', 'fabio');
  conferir('a sala arrumada a mao respeita o que o lider pediu',
    [formato(sala), tamanhos(sala)], [[2, 3], [3, 3]]);

  // Cheia de verdade: quem chega agora fica sem equipe, e o saguao cobra.
  sala.entrar('gil', 'gil');
  conferir('e quem nao cabe fica sem equipe', sala.semEquipe(), ['gil']);
  conferir('  o saguao diz o que falta',
    /sem equipe/.test(sala.oQueFaltaNasEquipes() || ''), true);
  conferir('  e a partida nao comeca assim',
    /sem equipe/.test(sala.iniciar().erro || ''), true);

  conferir('abrindo outra equipe ele encaixa',
    Boolean(sala.mudarFormato('ana', 'equipes', 1).ok), true);
  sala.trocarEquipe('gil', 'e3');
  conferir('  mas sozinho na equipe ainda trava',
    /sozinha/.test(sala.oQueFaltaNasEquipes() || ''), true);
  sala.destruir();
}

/* ---------------- O nome acompanha o tamanho ---------------- */
{
  const sala = salaCom(4, 'dando-dicas');
  conferir('equipe de dois no Dando dicas e "Dupla"',
    [sala.equipes[0].nome, sala.estadoPublico().formato.rotulo], ['Dupla 1', 'dupla']);

  sala.mudarFormato('ana', 'tamanho', 1);
  conferir('  e de tres em diante e "Equipe"',
    [sala.equipes[0].nome, sala.estadoPublico().formato.rotulo], ['Equipe 1', 'equipe']);

  const pg = salaCom(4);
  conferir('no Presente Grego e sempre "Equipe"', pg.equipes[0].nome, 'Equipe 1');
  pg.destruir();
  sala.destruir();
}

/* ---------------- Formato so mexe antes da partida ---------------- */
{
  const sala = salaCom(4);
  conferir('a partida comeca', sala.iniciar().ok, true);
  sala.limparTemporizador();
  conferir('  e ai o formato trava',
    /antes de a partida comecar/.test(sala.mudarFormato('ana', 'equipes', 1).erro || ''), true);

  sala.voltarAoLobby();
  conferir('  voltando ao saguao, destrava',
    Boolean(sala.mudarFormato('ana', 'equipes', 1).ok), true);
  sala.destruir();
}

/* ---------------- Campo invalido ---------------- */
{
  const sala = salaCom(4);
  conferir('so existem os dois eixos',
    /quantas equipes ou o tamanho/.test(sala.mudarFormato('ana', 'cor', 1).erro || ''), true);
  sala.destruir();
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
