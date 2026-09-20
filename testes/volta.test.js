'use strict';

/*
 * Cair e voltar para a sala.
 *
 * Conexao cai, aba fecha sem querer, celular dorme. Nada disso devia custar a
 * partida: da para entrar a qualquer momento, e quem volta com o MESMO
 * nickname volta com os pontos, os acertos, o icone e a equipe que eram dele.
 *
 * Quem entra no meio de uma rodada so entra em equipe na rodada seguinte —
 * mexer numa equipe com o leilao no ar trocaria os papeis dela na metade.
 */

const { Sala } = require('../server/sala.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(56), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

const NOMES = ['Ana', 'Bia', 'Caio', 'Duda'];

function salaCom(quantos, modo = 'tempo') {
  const eventos = [];
  const sala = new Sala('VT01',
    { categorias: ['geografia'], subs: [], fora: [], modo, metaPontos: 9999, segundosPorPergunta: 20 },
    (evento, dados) => eventos.push({ evento, dados }), () => {});
  for (let i = 0; i < quantos; i++) sala.entrar(NOMES[i].toLowerCase(), NOMES[i]);
  return { sala, eventos };
}

/* ---------------- Entrar a qualquer momento ---------------- */
{
  const { sala } = salaCom(2);
  sala.iniciar();
  sala.limparTemporizador();
  conferir('a partida esta no ar', sala.estado, 'categoria');

  const tarde = sala.entrar('caio', 'Caio');
  conferir('da para entrar com a partida rolando', Boolean(tarde.jogador), true);
  conferir('  e quem chega comeca do zero', tarde.jogador.pontos, 0);
  conferir('  sem ter voltado de lugar nenhum', Boolean(tarde.voltou), false);
  conferir('  e a sala conta com ele', sala.jogadores.size, 3);
  sala.destruir();
}

/* ---------------- O nickname traz os pontos de volta ---------------- */
{
  const { sala } = salaCom(2);
  sala.iniciar();
  sala.limparTemporizador();

  const ana = sala.jogadores.get('ana');
  ana.pontos = 37;
  ana.acertos = 4;
  const iconeDela = ana.avatar;

  sala.sair('ana');
  conferir('quem sai fica guardado pelo nickname', [...sala.desligados.keys()], ['ana']);
  conferir('  e some da sala', sala.jogadores.has('ana'), false);

  const volta = sala.entrar('ana-nova', 'Ana');
  conferir('voltar com o mesmo nick devolve os pontos', volta.jogador.pontos, 37);
  conferir('  e os acertos', volta.jogador.acertos, 4);
  conferir('  e o mesmo icone', volta.jogador.avatar, iconeDela);
  conferir('  e a sala sabe que foi uma volta', volta.voltou, true);
  conferir('  o nickname nao ganha sufixo', volta.jogador.nickname, 'Ana');
  conferir('  e o placar conta certo',
    sala.placar().map((j) => `${j.nickname}=${j.pontos}`), ['Ana=37', 'Bia=0']);
  conferir('  a ficha guardada foi consumida', sala.desligados.size, 0);
  sala.destruir();
}

/* ---------------- Maiuscula e acento nao atrapalham ---------------- */
{
  const { sala } = salaCom(2);
  sala.iniciar();
  sala.limparTemporizador();
  sala.jogadores.get('ana').pontos = 10;
  sala.sair('ana');

  const volta = sala.entrar('x', 'ANA');
  conferir('o nick bate sem olhar maiuscula', volta.jogador.pontos, 10);
  conferir('  e volta com a grafia que ele usava', volta.jogador.nickname, 'Ana');
  sala.destruir();
}

/* ---------------- Reconectar antes de o servidor ver a queda ---------------- */
{
  // O caso que aparece de verdade na internet: a aba reconecta em menos de um
  // segundo e o `disconnect` da conexao velha so chega depois. A cadeira ainda
  // esta ocupada pela propria pessoa, e sem cuidado ela volta como "Ana (2)".
  const { sala } = salaCom(2);
  sala.iniciar();
  sala.limparTemporizador();
  sala.jogadores.get('ana').pontos = 25;

  // O socket de Ana morreu, mas o servidor ainda nao soube: ela segue na sala.
  const mortos = new Set(['ana']);
  sala.estaOnline = (id) => !mortos.has(id);
  conferir('a cadeira dela ainda esta ocupada', sala.jogadores.has('ana'), true);

  const volta = sala.entrar('ana-reconectada', 'Ana');
  conferir('ela volta com o proprio nome, sem sufixo', volta.jogador.nickname, 'Ana');
  conferir('  e com os pontos', volta.jogador.pontos, 25);
  conferir('  e a cadeira velha foi liberada', sala.jogadores.has('ana'), false);
  conferir('  sem duplicar ninguem no placar', sala.placar().length, 2);
  sala.destruir();
}

/* ---------------- A carteirinha vale mesmo com o socket velho "vivo" ---------------- */
{
  // Este e o caso do Render: atras de proxy a conexao vira long-polling, e o
  // servidor so nota a queda no ping timeout — ate la o socket velho parece
  // de pe. Quem resolve e a carteirinha do navegador.
  const { sala } = salaCom(2);
  sala.iniciar();
  sala.limparTemporizador();
  sala.jogadores.get('ana').pontos = 30;
  sala.jogadores.get('ana').cliente = 'aba-da-ana-0001';

  // De proposito: para o servidor, TODO MUNDO ainda esta online.
  const volta = sala.entrar('ana-reconectada', 'Ana', 'aba-da-ana-0001');
  conferir('a mesma aba retoma a cadeira mesmo assim', volta.jogador.nickname, 'Ana');
  conferir('  com os pontos', volta.jogador.pontos, 30);
  conferir('  e sem duplicar no placar', sala.placar().length, 2);
  sala.destruir();
}

/* ---------------- A carteirinha acha os pontos ate se o nick mudar ---------------- */
{
  const { sala } = salaCom(2);
  sala.iniciar();
  sala.limparTemporizador();
  sala.jogadores.get('ana').pontos = 15;
  sala.jogadores.get('ana').cliente = 'aba-da-ana-0001';
  sala.sair('ana');

  const volta = sala.entrar('ana3', 'Aninha', 'aba-da-ana-0001');
  conferir('voltou com outro nick, mas e a mesma aba', volta.jogador.pontos, 15);
  conferir('  e usa a grafia guardada', volta.jogador.nickname, 'Ana');
  sala.destruir();
}

/* ---------------- Xara ONLINE, de outra aba, nao toma a cadeira ---------------- */
{
  const { sala } = salaCom(2);
  sala.jogadores.get('ana').pontos = 25;
  sala.jogadores.get('ana').cliente = 'aba-da-ana-0001';

  // Outra pessoa, outra carteirinha, e a Ana de verdade online.
  const xara = sala.entrar('outra-ana', 'Ana', 'aba-de-outra-9999');
  conferir('com a Ana online, a xara vira (2)', xara.jogador.nickname, 'Ana (2)');
  conferir('  e comeca do zero', xara.jogador.pontos, 0);
  conferir('  e a Ana de verdade continua na sala com os pontos',
    [sala.jogadores.has('ana'), sala.jogadores.get('ana').pontos], [true, 25]);
  sala.destruir();
}

/* ---------------- Nick de quem ESTA na sala continua virando (2) ---------------- */
{
  const { sala } = salaCom(2);
  const xara = sala.entrar('outra', 'Ana');
  conferir('xara de quem esta na sala vira (2)', xara.jogador.nickname, 'Ana (2)');
  conferir('  e comeca do zero', xara.jogador.pontos, 0);
  sala.destruir();
}

/* ---------------- Expulsar e de proposito: nao da para voltar ---------------- */
{
  const { sala } = salaCom(3);
  sala.iniciar();
  sala.limparTemporizador();
  sala.jogadores.get('bia').pontos = 50;

  sala.expulsar('ana', 'bia');
  conferir('quem foi expulso nao fica guardado', sala.desligados.has('bia'), false);

  const volta = sala.entrar('bia-nova', 'Bia');
  conferir('  entao ele volta do zero', [volta.jogador.pontos, Boolean(volta.voltou)], [0, false]);
  sala.destruir();
}

/* ---------------- Sala vazia no meio da partida espera ---------------- */
{
  const { sala } = salaCom(2);
  sala.iniciar();
  sala.limparTemporizador();
  sala.jogadores.get('ana').pontos = 12;

  sala.sair('ana');
  sala.sair('bia');
  conferir('esvaziou no meio: a sala congela', [sala.vazia, sala.congelada], [true, true]);
  conferir('  e os relogios param', sala.temporizador, null);

  const volta = sala.entrar('ana2', 'Ana');
  conferir('quem volta acha o placar onde deixou', volta.jogador.pontos, 12);
  conferir('  e a sala descongela', sala.congelada, false);
  conferir('  com a proxima rodada agendada', sala.temporizador !== null, true);
  sala.limparTemporizador();
  sala.destruir();
}

/* ---------------- Congela em qualquer fase, nao so com a rodada no ar ---------------- */
{
  // Sair durante a tela de resultado deixava o temporizador da proxima rodada
  // correndo, e a sala seguia jogando sozinha ate a meta.
  for (const fase of ['categoria', 'pergunta', 'resultado']) {
    const { sala } = salaCom(2);
    sala.iniciar();
    sala.estado = fase;
    sala.agendar(() => {}, 60000);   // o relogio que a sala teria nessa fase
    sala.sair('ana');
    sala.sair('bia');
    conferir(`sair durante "${fase}" congela a sala`,
      [sala.congelada, sala.temporizador], [true, null]);
    sala.destruir();
  }

  // Entre partidas nao ha o que congelar: a sala so esta esperando.
  const { sala: parada } = salaCom(2);
  parada.sair('ana');
  parada.sair('bia');
  conferir('no saguao ela nao congela', parada.congelada, false);
  parada.destruir();
}

/* ---------------- Equipe: volta para a mesma, fora de rodada ---------------- */
{
  const { sala } = salaCom(4, 'presente-grego');
  const daAna = sala.equipeDoJogador('ana').id;
  sala.jogadores.get('ana').pontos = 20;

  sala.sair('ana');
  conferir('sair tira da equipe', sala.equipeDoJogador('ana'), null);

  const volta = sala.entrar('ana2', 'Ana');
  conferir('no saguao ela volta para a equipe de antes',
    sala.equipeDoJogador('ana2').id, daAna);
  conferir('  com os pontos', volta.jogador.pontos, 20);
  sala.destruir();
}

/* ---------------- Equipe: com a rodada no ar, so na proxima ---------------- */
{
  const { sala } = salaCom(4, 'presente-grego');
  sala.iniciar();
  sala.limparTemporizador();
  sala.mostrarPergunta();          // categoria -> leilao
  sala.limparTemporizador();
  conferir('o leilao esta aberto', sala.estado, 'leilao');

  const chegou = sala.entrar('elis', 'Elis');
  conferir('quem chega no meio nao entra em equipe na hora',
    sala.equipeDoJogador('elis'), null);
  conferir('  e a sala sabe que ele esta sobrando', sala.semEquipe(), ['elis']);
  conferir('  mas ja esta na sala', Boolean(chegou.jogador), true);

  sala.proximaRodada();
  sala.limparTemporizador();
  conferir('na rodada seguinte ele entra numa equipe',
    Boolean(sala.equipeDoJogador('elis')), true);
  conferir('  e ninguem fica sobrando', sala.semEquipe(), []);
  sala.destruir();
}

/* ---------------- Sala cheia nao aceita nem quem volta ---------------- */
{
  const { sala } = salaCom(4);
  for (let i = 0; i < 8; i++) sala.entrar(`extra${i}`, `Extra${i}`);
  conferir('a sala encheu', sala.jogadores.size, 12);
  conferir('  e o 13o e recusado',
    /ja esta cheia/.test(sala.entrar('tarde', 'Tarde').erro || ''), true);
  sala.destruir();
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
