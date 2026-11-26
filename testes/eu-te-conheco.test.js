'use strict';

/*
 * Eu te conheço: todo mundo rankeia 5 coisas ao mesmo tempo, e o ranking de
 * cada um e comparado com o da base da rodada.
 *
 * A base gira por ordem de chegada. Cada coisa no mesmo lugar que no ranking
 * da base vale 2, e a base leva a media do que a mesa fez.
 */

const { Sala, MODOS, MODOS_SORTEAVEIS } = require('../server/sala.js');
const { COISAS } = require('../server/coisas.js');
const { normalizar } = require('../server/comparar.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(58), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

function novaSala(quantos = 3) {
  const eventos = [];
  const sala = new Sala('EUTC',
    { categorias: [], subs: [], fora: [], modo: 'eu-te-conheco', metaPontos: 9999, segundosPorPergunta: 20 },
    (evento, dados) => eventos.push({ evento, dados }));
  ['ana', 'bia', 'caio', 'duda'].slice(0, quantos).forEach((id) => sala.entrar(id, id[0].toUpperCase() + id.slice(1)));
  return { sala, eventos };
}

/** Uma rodada com as cartas abertas, sem relogio correndo. */
function rodadaAberta(quantos = 3) {
  const { sala, eventos } = novaSala(quantos);
  sala.iniciar();
  sala.limparTemporizador();
  sala.mostrarPergunta();
  sala.limparTemporizador();
  return { sala, eventos };
}

const ultimo = (eventos, nome) => [...eventos].reverse().find((e) => e.evento === nome);

/* ---------------- O modo e as coisas ---------------- */
{
  const modo = MODOS.find((m) => m.id === 'eu-te-conheco');
  conferir('o modo existe e esta disponivel', Boolean(modo && modo.disponivel), true);
  conferir('nao usa categorias', Boolean(modo.semCategorias), true);
  conferir('entra na roleta da Bagunca', MODOS_SORTEAVEIS.includes('eu-te-conheco'), true);
  conferir('tem coisa para muitas rodadas', COISAS.length >= 100, true);
  const chaves = COISAS.map(normalizar);
  conferir('nenhuma coisa repetida', chaves.length - new Set(chaves).size, 0);
}

/* ---------------- Comecar ---------------- */
{
  const { sala } = novaSala(1);
  conferir('sozinho nao comeca', Boolean(sala.iniciar().erro), true);
}

{
  const { sala, eventos } = rodadaAberta();
  const pergunta = ultimo(eventos, 'rodada:pergunta').dados;
  conferir('a primeira base e quem chegou primeiro', pergunta.eu.escolhe, 'ana');
  conferir('sao 5 coisas diferentes', new Set(pergunta.eu.itens).size, 5);
  conferir('o ranking de ninguem vai junto', Object.keys(pergunta.eu).some((k) => /ordem|inicio/.test(k)), false);
  conferir('nao tem mascara nem chances', [pergunta.mascara, pergunta.chances], [null, null]);
  conferir('todo mundo joga a rodada', [...sala.eu.participam].sort(), ['ana', 'bia', 'caio']);

  conferir('ranking torto e recusado', Boolean(sala.ordenarEu('ana', [0, 0, 1, 2, 3], true).erro), true);
  conferir('ranking curto e recusado', Boolean(sala.ordenarEu('ana', [0, 1, 2], true).erro), true);

  // O chat continua chat: digitar o nome de uma das coisas nao faz nada.
  sala.jogadores.get('bia').ultimaMensagem = 0;
  conferir('escrever uma das coisas e so conversa',
    sala.palpitar('bia', pergunta.eu.itens[0]).veredito, 'chat');

  // Todo mundo rankeia ao mesmo tempo: os outros nem esperam a base.
  conferir('quem nao e a base rankeia antes dela', sala.ordenarEu('bia', [2, 0, 4, 1, 3], true).travou, true);
  conferir('confirmado nao muda mais', Boolean(sala.ordenarEu('bia', [0, 1, 2, 3, 4], true).erro), true);
  sala.ordenarEu('ana', [4, 3, 2, 1, 0], false);
  sala.ordenarEu('ana', [2, 0, 4, 1, 3], true);
  conferir('a base confirmou: a rodada segue para quem falta', sala.estado, 'pergunta');
  // Caio acerta 3 (lugares 1, 3 e 5) e nao confirma.
  sala.ordenarEu('caio', [2, 1, 4, 0, 3], false);

  sala.encerrarRodada();
  sala.limparTemporizador();
  const res = ultimo(eventos, 'rodada:resultado').dados;
  const de = (id) => res.detalhes.find((d) => d.jogadorId === id);
  conferir('o resultado traz o ranking da base', res.eu.ordem, [2, 0, 4, 1, 3]);
  conferir('acertou as 5: 10 pontos', [de('bia').eu.lugares, de('bia').ganhou], [5, 10]);
  conferir('rascunho sem confirmar vale: 3 no lugar, 6 pontos', [de('caio').eu.lugares, de('caio').ganhou], [3, 6]);
  conferir('  e vem marcado como nao confirmado', [de('bia').eu.confirmou, de('caio').eu.confirmou], [true, false]);
  conferir('cada um leva o proprio ranking no resultado', de('caio').eu.ordem, [2, 1, 4, 0, 3]);
  conferir('a base leva a media (10 e 6 -> 8)', de('ana').ganhou, 8);
  conferir('a base vem primeiro na lista', res.detalhes[0].jogadorId, 'ana');
  conferir('o placar soma', [sala.jogadores.get('ana').pontos, sala.jogadores.get('bia').pontos], [8, 10]);
}

{
  const { sala, eventos } = rodadaAberta(4);
  sala.ordenarEu('ana', [0, 1, 2, 3, 4], true);
  sala.ordenarEu('bia', [0, 1, 3, 2, 4], true);
  sala.ordenarEu('caio', [0, 1, 4, 3, 2], true);
  sala.ordenarEu('duda', [4, 0, 2, 1, 3], true);
  sala.limparTemporizador();
  sala.encerrarRodada();
  sala.limparTemporizador();
  const res = ultimo(eventos, 'rodada:resultado').dados;
  conferir('a lista: a base, depois de quem fez mais para quem fez menos',
    res.detalhes.map((d) => [d.jogadorId, d.ganhou]), [['ana', 5], ['bia', 6], ['caio', 6], ['duda', 2]]);
}

/* ---------------- A vez gira ---------------- */
{
  const { sala } = novaSala(3);
  sala.iniciar();
  sala.limparTemporizador();
  const vez = [sala.eu.escolhe];
  for (let i = 0; i < 3; i++) {
    sala.estado = 'resultado';
    sala.comecarRodada();
    sala.limparTemporizador();
    vez.push(sala.eu.escolhe);
  }
  conferir('a base gira por todo mundo e recomeca', vez, ['ana', 'bia', 'caio', 'ana']);
  const usadas = sala.coisasUsadas.size;
  conferir('as coisas nao se repetem na partida', usadas, 20);
}

/* ---------------- O tempo acaba ---------------- */
{
  const { sala, eventos } = rodadaAberta();
  sala.ordenarEu('ana', [1, 0, 2, 3, 4], false);
  sala.ordenarEu('bia', [1, 0, 2, 4, 3], false);
  sala.encerrarRodada();                       // o relogio acabou, ninguem confirmou
  sala.limparTemporizador();
  const res = ultimo(eventos, 'rodada:resultado').dados;
  const de = (id) => res.detalhes.find((d) => d.jogadorId === id);
  conferir('sem confirmar, vale o rascunho da base', res.eu.ordem, [1, 0, 2, 3, 4]);
  conferir('  e o de quem adivinhava', [de('bia').eu.lugares, de('bia').ganhou], [3, 6]);
  conferir('quem nem mexeu leva zero', [de('caio').eu.papel, de('caio').ganhou], ['parado', 0]);
}
{
  const { sala, eventos } = rodadaAberta();
  sala.ordenarEu('bia', [1, 0, 2, 4, 3], true);
  sala.encerrarRodada();                       // a base nem mexeu nas cartas
  sala.limparTemporizador();
  const res = ultimo(eventos, 'rodada:resultado').dados;
  conferir('a base nao rankeou: sem com o que comparar', res.eu.ordem, null);
  conferir('  ninguem pontua', res.detalhes.map((d) => d.ganhou), [0, 0, 0]);
}

/* ---------------- Todos confirmam ---------------- */
{
  const { sala } = rodadaAberta();
  sala.ordenarEu('bia', [1, 0, 2, 3, 4], true);
  sala.ordenarEu('caio', [0, 1, 2, 4, 3], true);
  conferir('falta a base: nao fecha', Boolean(sala.agendado), false);
  sala.ordenarEu('ana', [0, 1, 2, 3, 4], true);
  conferir('todos confirmaram: fecha sem esperar o relogio', Boolean(sala.agendado), true);
  sala.limparTemporizador();
}

/* ---------------- Gente chegando e saindo ---------------- */
{
  const { sala } = rodadaAberta();
  sala.entrar('duda', 'Duda');
  conferir('quem chega no meio entra na proxima', Boolean(sala.ordenarEu('duda', [0, 1, 2, 3, 4], true).erro), true);
}
{
  const { sala, eventos } = rodadaAberta();
  sala.sair('ana');
  conferir('a base saiu sem confirmar: a rodada cai', ultimo(eventos, 'rodada:resultado').dados.titulo, 'Rodada cancelada');
  sala.limparTemporizador();
}
{
  const { sala, eventos } = rodadaAberta();
  sala.ordenarEu('ana', [3, 1, 2, 0, 4], true);
  sala.sair('ana');
  conferir('a base saiu ja confirmada: a rodada segue', sala.estado, 'pergunta');
  sala.ordenarEu('bia', [3, 1, 2, 0, 4], true);
  sala.ordenarEu('caio', [3, 1, 2, 4, 0], true);
  sala.limparTemporizador();
  sala.encerrarRodada();
  sala.limparTemporizador();
  const res = ultimo(eventos, 'rodada:resultado').dados;
  conferir('  e compara com o ranking que ela deixou', res.detalhes.map((d) => d.ganhou), [10, 6]);
}
{
  const { sala } = rodadaAberta();
  sala.ordenarEu('ana', [0, 1, 2, 3, 4], true);
  sala.ordenarEu('bia', [1, 0, 2, 3, 4], true);
  sala.sair('caio');
  conferir('saiu o unico que faltava: fecha', Boolean(sala.agendado), true);
  sala.limparTemporizador();
}
{
  const { sala, eventos } = rodadaAberta(2);
  sala.ordenarEu('ana', [0, 1, 2, 3, 4], true);
  sala.sair('bia');
  conferir('saiu quem adivinhava sozinho: a rodada cai', ultimo(eventos, 'rodada:resultado').dados.titulo, 'Rodada cancelada');
  sala.limparTemporizador();
}

/* ---------------- Pausa e pular ---------------- */
{
  const { sala } = rodadaAberta();
  sala.pausa = { desde: Date.now() };
  conferir('pausado ninguem mexe nas cartas', Boolean(sala.ordenarEu('bia', [0, 1, 2, 3, 4], true).erro), true);
  sala.pausa = null;
}
{
  const { sala, eventos } = rodadaAberta();
  sala.ordenarEu('ana', [3, 1, 2, 0, 4], true);
  sala.pularRodada();
  sala.limparTemporizador();
  const itens = sala.eu.itens;
  conferir('rodada pulada mostra o ranking da base',
    ultimo(eventos, 'rodada:resultado').dados.resposta.startsWith(`1º ${itens[3]}`), true);
}

/* ---------------- Na Bagunca ---------------- */

/** Uma Bagunca que so sorteia o Eu te conheço, com o relogio na mao do teste. */
function bagunca(quantos, perguntasAteSorteio = 0) {
  const eventos = [];
  const sala = new Sala('BAGU',
    { modo: 'bagunca', categorias: ['geografia'], subs: [], fora: [], metaPontos: 9999,
      segundosPorPergunta: 20, perguntasAteSorteio, modosBagunca: ['eu-te-conheco'] },
    (evento, dados) => eventos.push({ evento, dados }));
  sala.agendado = null;
  sala.agendar = (fn, ms) => { sala.agendado = { fn, ms }; };
  sala.limparTemporizador = () => { sala.agendado = null; };
  ['ana', 'bia', 'caio'].slice(0, quantos).forEach((id) => sala.entrar(id, id));
  sala.iniciar();
  return { sala, eventos };
}

{
  const { sala, eventos } = bagunca(3, 1);
  conferir('a Bagunca abre com o Modo Tempo', sala.modo, 'tempo');
  sala.pularRodada();
  sala.agendado.fn();                      // fim do resultado: vem o sorteio
  conferir('  e o sorteio tira o Eu te conheço', [sala.estado, sala.modo], ['sorteio', 'eu-te-conheco']);
  sala.agendado.fn();                      // fim da roleta: a rodada abre
  sala.agendado.fn();                      // fim da tela da categoria
  const pergunta = ultimo(eventos, 'rodada:pergunta').dados;
  conferir('  com as cartas na tela', Boolean(pergunta.eu && pergunta.eu.itens.length === 5), true);

  sala.ordenarEu(pergunta.eu.escolhe, [0, 1, 2, 3, 4], true);
  const outros = [...sala.jogam.keys()].filter((id) => id !== pergunta.eu.escolhe);
  for (const id of outros) sala.ordenarEu(id, [0, 1, 2, 3, 4], true);
  sala.agendado.fn();                      // todos confirmaram: fecha
  const res = ultimo(eventos, 'rodada:resultado').dados;
  conferir('  e paga como sempre: 5 no lugar, 10 pontos', res.detalhes.filter((d) => d.ganhou === 10).length, 3);
  sala.agendado.fn();                      // fim do resultado: volta o Modo Tempo
  conferir('  depois volta o Modo Tempo', sala.modo, 'tempo');
}
{
  const { sala } = bagunca(1, 0);
  conferir('sozinho na sala ele nao entra na roleta', sala.modosQueCabem().includes('eu-te-conheco'), false);
  conferir('  e segue o Modo Tempo', sala.modo, 'tempo');
}
{
  // A sala encolheu entre o sorteio e a rodada.
  const { sala } = bagunca(2, 1);
  sala.pularRodada();
  sala.agendado.fn();
  conferir('com dois, sai o Eu te conheço', [sala.estado, sala.modo], ['sorteio', 'eu-te-conheco']);
  sala.sair('bia');
  sala.agendado.fn();
  conferir('  saiu alguem antes da rodada: segue o Modo Tempo, sem acabar o jogo', [sala.estado, sala.modo], ['categoria', 'tempo']);
}

console.log(falhas ? `\n${falhas} falha(s).` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
