'use strict';

/*
 * Modo Carrossel: a vez passa de um em um, 7s para cada, e quem nao souber sai
 * da rodada. Rodadas 1-2 dao uma volta, 3-4 duas voltas, 5-6 tres.
 */

const { Sala } = require('../server/sala.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(50), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

function novaSala(quantos = 3) {
  const eventos = [];
  const sala = new Sala('CAR1', {
    categorias: ['geografia'], modo: 'carrossel', metaPontos: 9999, segundosPorPergunta: 20
  }, (evento, dados) => eventos.push({ evento, dados }));

  const nomes = ['Ana', 'Bia', 'Caio', 'Duda'];
  for (let i = 0; i < quantos; i++) sala.entrar(nomes[i].toLowerCase(), nomes[i]);
  sala.iniciar();
  sala.limparTemporizador();
  sala.mostrarPergunta();
  sala.limparTemporizador();
  for (const j of sala.jogadores.values()) j.ultimaMensagem = 0;
  return { sala, eventos };
}

/** Quem esta na vez agora. */
const daVez = (sala) => sala.ordem[sala.vez];

/** Responde certo pelo jogador da vez, pegando um item ainda livre. */
function responderCerto(sala) {
  const quem = daVez(sala);
  const livre = sala.perguntaAtual.itens.findIndex((_, i) => !sala.itensUsados.has(i));
  sala.jogadores.get(quem).ultimaMensagem = 0;
  const r = sala.palpitar(quem, sala.perguntaAtual.itens[livre].oficial);
  sala.limparTemporizador();
  return { quem, ...r };
}

/* ---------------- Quantas voltas cada rodada da ---------------- */
{
  const { sala } = novaSala(3);
  conferir('rodada 1 da 1 volta', sala.voltasDaRodada(1), 1);
  conferir('rodada 2 da 1 volta', sala.voltasDaRodada(2), 1);
  conferir('rodada 3 da 2 voltas', sala.voltasDaRodada(3), 2);
  conferir('rodada 4 da 2 voltas', sala.voltasDaRodada(4), 2);
  conferir('rodada 5 da 3 voltas', sala.voltasDaRodada(5), 3);
  conferir('rodada 6 da 3 voltas', sala.voltasDaRodada(6), 3);
  // Para em 3: sem teto a rodada 15 pedia 8 voltas, e com 2 pessoas isso sao
  // 16 respostas seguidas, que quase nenhuma lista tem.
  conferir('rodada 9 nao passa de 3 voltas', sala.voltasDaRodada(9), 3);
  conferir('rodada 30 tambem para em 3', sala.voltasDaRodada(30), 3);
  sala.destruir();
}

/* ---------------- So quem esta na vez escreve ---------------- */
{
  const { sala } = novaSala(3);
  const eu = daVez(sala);
  const outro = sala.ordem.find((id) => id !== eu);

  sala.jogadores.get(outro).ultimaMensagem = 0;
  const r = sala.palpitar(outro, 'Japao');
  conferir('quem nao e da vez nao escreve', r.erro, 'Espere a sua vez.');

  // e nem como conversa solta: o chat fica trancado
  sala.jogadores.get(outro).ultimaMensagem = 0;
  const r2 = sala.palpitar(outro, 'oi pessoal');
  conferir('  nem para conversar', r2.erro, 'Espere a sua vez.');
  sala.destruir();
}

/* ---------------- Acertar passa a vez e vale 2 pontos ---------------- */
{
  const { sala } = novaSala(3);
  const primeiro = daVez(sala);
  const r = responderCerto(sala);

  conferir('acerto na vez vale 2 pontos', r.pontos, 2);
  conferir('  e a vez passa para o proximo', daVez(sala) !== primeiro, true);
  conferir('  o item sai de circulacao para todos', sala.itensUsados.size, 1);

  // o proximo nao pode repetir o que ja foi dito
  const segundo = daVez(sala);
  sala.jogadores.get(segundo).ultimaMensagem = 0;
  const rep = sala.palpitar(segundo, sala.perguntaAtual.itens[[...sala.itensUsados][0]].oficial);
  conferir('repetir o que ja saiu elimina', rep.veredito, 'eliminado');
  conferir('  e o eliminado sai dos vivos', sala.vivos.has(segundo), false);
  sala.destruir();
}

/* ---------------- Errar elimina; nao saber tambem ---------------- */
{
  const { sala, eventos } = novaSala(3);
  const quem = daVez(sala);
  sala.jogadores.get(quem).ultimaMensagem = 0;
  const r = sala.palpitar(quem, 'abacaxi com bolinhas');

  conferir('resposta errada elimina', r.veredito, 'eliminado');
  conferir('  com motivo "errou"', r.motivo, 'errou');
  const aviso = eventos.filter((e) => e.evento === 'carrossel:eliminado').pop();
  conferir('  e a sala e avisada de quem saiu', aviso.dados.jogadorId, quem);
  sala.destruir();
}

/* ---------------- Sobrar sozinho fecha a rodada ---------------- */
{
  const { sala } = novaSala(3);
  const vivosNoInicio = sala.vivos.size;

  // dois erram seguido; o terceiro fica sozinho
  for (let i = 0; i < 2; i++) {
    const quem = daVez(sala);
    sala.jogadores.get(quem).ultimaMensagem = 0;
    sala.palpitar(quem, 'resposta claramente errada ' + i);
    sala.limparTemporizador();
  }

  conferir('comecou com 3 vivos', vivosNoInicio, 3);
  conferir('sobrou 1 depois de 2 eliminados', sala.vivos.size, 1);
  sala.destruir();
}

/* ---------------- Quem sobrevive leva bonus ---------------- */
{
  const { sala } = novaSala(3);
  const perdedor = daVez(sala);
  sala.jogadores.get(perdedor).ultimaMensagem = 0;
  sala.palpitar(perdedor, 'isso nao e resposta de nada');
  sala.limparTemporizador();

  const sobrevivente = [...sala.vivos][0];
  const antes = sala.jogadores.get(sobrevivente).pontos;
  sala.encerrarRodada();
  sala.limparTemporizador();

  conferir('sobrevivente ganha o bonus de 5',
    sala.jogadores.get(sobrevivente).pontos - antes, 5);
  conferir('eliminado nao ganha bonus', sala.jogadores.get(perdedor).pontos, 0);
  sala.destruir();
}

/* ---------------- Sair no meio da propria vez nao trava ---------------- */
{
  const { sala } = novaSala(3);
  const quem = daVez(sala);
  sala.sair(quem);
  sala.limparTemporizador();

  conferir('quem saiu nao esta mais vivo', sala.vivos.has(quem), false);
  conferir('  e o carrossel seguiu para outra pessoa', daVez(sala) !== quem, true);
  sala.destruir();
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
