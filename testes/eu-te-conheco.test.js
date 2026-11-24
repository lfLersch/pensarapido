'use strict';

/*
 * Eu te conheço: um rankeia 5 coisas, os outros tentam rankear igual.
 *
 * A vez de rankear gira por ordem de chegada. Enquanto quem rankeia arrasta
 * as cartas, os outros esperam; quando ele confirma (ou o tempo acaba), e a
 * vez dos outros. Cada coisa no mesmo lugar vale 2, e quem rankeou leva a
 * media do que a mesa fez.
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

/** Uma rodada parada no comeco da escolha, sem relogio correndo. */
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
  conferir('fica fora da roleta da Bagunca', MODOS_SORTEAVEIS.includes('eu-te-conheco'), false);
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
  conferir('a primeira a rankear e quem chegou primeiro', pergunta.eu.escolhe, 'ana');
  conferir('sao 5 coisas diferentes', new Set(pergunta.eu.itens).size, 5);
  conferir('a fase e a de escolha', pergunta.eu.fase, 'escolha');
  conferir('o ranking de ninguem vai junto', 'ordem' in pergunta.eu || 'ordemDele' in pergunta.eu, false);
  conferir('nao tem mascara nem chances', [pergunta.mascara, pergunta.chances], [null, null]);

  conferir('quem nao e da vez nao rankeia', Boolean(sala.ordenarEu('bia', [0, 1, 2, 3, 4], true).erro), true);
  conferir('ranking torto e recusado', Boolean(sala.ordenarEu('ana', [0, 0, 1, 2, 3], true).erro), true);
  conferir('ranking curto e recusado', Boolean(sala.ordenarEu('ana', [0, 1, 2], true).erro), true);

  // O chat continua chat: digitar o nome de uma das coisas nao faz nada.
  sala.jogadores.get('bia').ultimaMensagem = 0;
  conferir('escrever uma das coisas e so conversa',
    sala.palpitar('bia', pergunta.eu.itens[0]).veredito, 'chat');

  sala.ordenarEu('ana', [4, 3, 2, 1, 0], false);
  conferir('rascunho nao fecha a escolha', sala.eu.fase, 'escolha');
  const r = sala.ordenarEu('ana', [2, 0, 4, 1, 3], true);
  sala.limparTemporizador();
  conferir('confirmar abre a vez dos outros', [r.travou, sala.eu.fase], [true, 'palpite']);
  const palpite = ultimo(eventos, 'eu:palpite').dados;
  conferir('  e os outros sabem quantos adivinham', palpite.total, 2);
  conferir('  e comecam de outra ordem', JSON.stringify(palpite.inicio) === JSON.stringify([2, 0, 4, 1, 3]), false);
  conferir('quem rankeou nao adivinha', Boolean(sala.ordenarEu('ana', [0, 1, 2, 3, 4], true).erro), true);

  // Bia acerta tudo; Caio acerta 2 (as posicoes 1 e 3) e nao confirma.
  sala.ordenarEu('caio', [2, 1, 4, 0, 3], false);
  sala.ordenarEu('bia', [2, 0, 4, 1, 3], true);
  conferir('confirmado nao muda mais', Boolean(sala.ordenarEu('bia', [0, 1, 2, 3, 4], true).erro), true);
  conferir('com gente faltando a rodada segue', sala.estado, 'pergunta');

  sala.encerrarRodada();
  sala.limparTemporizador();
  const res = ultimo(eventos, 'rodada:resultado').dados;
  const de = (id) => res.detalhes.find((d) => d.jogadorId === id);
  conferir('o resultado traz o ranking certo', res.eu.ordem, [2, 0, 4, 1, 3]);
  conferir('acertou as 5: 10 pontos', [de('bia').eu.lugares, de('bia').ganhou], [5, 10]);
  conferir('rascunho sem confirmar vale: 3 no lugar, 6 pontos', [de('caio').eu.lugares, de('caio').ganhou], [3, 6]);
  conferir('quem rankeou leva a media (10 e 6 -> 8)', de('ana').ganhou, 8);
  conferir('quem rankeou vem primeiro na lista', res.detalhes[0].jogadorId, 'ana');
  conferir('o placar soma', [sala.jogadores.get('ana').pontos, sala.jogadores.get('bia').pontos], [8, 10]);
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
  conferir('a vez gira por todo mundo e recomeca', vez, ['ana', 'bia', 'caio', 'ana']);
  const usadas = sala.coisasUsadas.size;
  conferir('as coisas nao se repetem na partida', usadas, 20);
}

/* ---------------- O tempo acaba ---------------- */
{
  const { sala, eventos } = rodadaAberta();
  sala.ordenarEu('ana', [1, 0, 2, 3, 4], false);
  sala.abrirPalpiteEu();                       // o relogio de quem rankeia acabou
  sala.limparTemporizador();
  conferir('sem confirmar, vale o rascunho de quem rankeou', sala.eu.ordemDele, [1, 0, 2, 3, 4]);
  sala.encerrarRodada();                       // ninguem mexeu em nada
  sala.limparTemporizador();
  const res = ultimo(eventos, 'rodada:resultado').dados;
  conferir('quem nem mexeu leva zero', res.detalhes.filter((d) => d.eu.papel === 'parado').map((d) => d.ganhou), [0, 0]);
  conferir('  e quem rankeou tambem', res.detalhes.find((d) => d.jogadorId === 'ana').ganhou, 0);
}

/* ---------------- Todos confirmam ---------------- */
{
  const { sala } = rodadaAberta();
  sala.ordenarEu('ana', [0, 1, 2, 3, 4], true);
  sala.limparTemporizador();
  sala.ordenarEu('bia', [1, 0, 2, 3, 4], true);
  conferir('falta um: nao fecha', Boolean(sala.agendado), false);
  sala.ordenarEu('caio', [0, 1, 2, 4, 3], true);
  conferir('todos confirmaram: fecha sem esperar o relogio', Boolean(sala.agendado), true);
  sala.limparTemporizador();
}

/* ---------------- Gente saindo ---------------- */
{
  const { sala, eventos } = rodadaAberta();
  sala.sair('ana');
  conferir('quem rankeia saiu antes: a rodada cai', ultimo(eventos, 'rodada:resultado').dados.titulo, 'Rodada cancelada');
  sala.limparTemporizador();
}
{
  const { sala } = rodadaAberta();
  sala.ordenarEu('ana', [0, 1, 2, 3, 4], true);
  sala.limparTemporizador();
  sala.ordenarEu('bia', [1, 0, 2, 3, 4], true);
  sala.sair('caio');
  conferir('saiu o unico que faltava: fecha', Boolean(sala.agendado), true);
  sala.limparTemporizador();
}
{
  const { sala, eventos } = rodadaAberta(2);
  sala.ordenarEu('ana', [0, 1, 2, 3, 4], true);
  sala.limparTemporizador();
  sala.sair('bia');
  conferir('saiu quem adivinhava sozinho: a rodada cai', ultimo(eventos, 'rodada:resultado').dados.titulo, 'Rodada cancelada');
  sala.limparTemporizador();
}

/* ---------------- Pular ---------------- */
{
  const { sala, eventos } = rodadaAberta();
  sala.ordenarEu('ana', [3, 1, 2, 0, 4], true);
  sala.limparTemporizador();
  sala.pularRodada();
  sala.limparTemporizador();
  const itens = sala.eu.itens;
  conferir('rodada pulada mostra o ranking de quem rankeou',
    ultimo(eventos, 'rodada:resultado').dados.resposta.startsWith(`1º ${itens[3]}`), true);
}

console.log(falhas ? `\n${falhas} falha(s).` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
