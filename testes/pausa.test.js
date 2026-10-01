'use strict';

/*
 * O lider pausa e continua o jogo.
 *
 * Pausado, os dois relogios (o da rodada e o da vez/lance) param onde
 * estavam e guardam quanto faltava; ninguem responde, vota ou da lance. Na
 * volta, cada relogio retoma com o que faltava, e o inicio da pergunta anda o
 * tempo que ficou parado, para a pontuacao por tempo nao contar a pausa.
 */

const { Sala } = require('../server/sala.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(62), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

function montar(config = {}) {
  const eventos = [];
  const sala = new Sala('PAU1', Object.assign({
    modo: 'tempo', categorias: ['matematica'], metaPontos: 500, segundosPorPergunta: 20
  }, config), (evento, dados) => eventos.push({ evento, dados }));
  sala.entrar('a', 'Ana'); // lider
  sala.entrar('b', 'Bia');
  sala.entrar('c', 'Cid');
  sala.iniciar();
  sala.limparTemporizador();
  return { sala, eventos, ultimo: (nome) => [...eventos].reverse().find((e) => e.evento === nome) };
}

(async () => {
  /* ---------------- 1. Quem pode pausar ---------------- */
  {
    const { sala } = montar();
    sala.mostrarPergunta();
    conferir('quem nao e lider nao pausa', sala.pausar('b').erro, 'So o lider pode pausar o jogo.');
    conferir('  e o relogio continua correndo', Boolean(sala.agendado), true);

    const saguao = new Sala('PAU0', { modo: 'tempo', categorias: ['matematica'], metaPontos: 500, segundosPorPergunta: 20 }, () => {});
    saguao.entrar('x', 'Xena');
    conferir('no saguao nao tem o que pausar', saguao.pausar('x').erro, 'Nao tem partida rolando.');
    sala.destruir();
  }

  /* ---------------- 2. Pausa e volta no meio da pergunta ---------------- */
  {
    const { sala, eventos, ultimo } = montar();
    sala.mostrarPergunta();
    const inicio = sala.inicioPergunta;
    await esperar(60);

    conferir('o lider pausa', sala.pausar('a'), { ok: true });
    conferir('  a sala avisa todo mundo', ultimo('sala:pausa').dados, { pausado: true, por: 'Ana' });
    conferir('  o relogio da rodada para', [sala.temporizador, sala.agendado], [null, null]);
    const restante = sala.pausa.rodada.restante;
    conferir('  e guarda quanto faltava (uns 19,9 de 20 s)', restante > 19000 && restante <= 19950, true);
    conferir('  quem entra ve a tela de pausa', sala.estadoPublico().pausa, { por: 'Ana' });
    conferir('pausar de novo nao muda nada', sala.pausar('a'), { ok: true });

    conferir('pausado ninguem responde', sala.palpitar('b', '42').erro, 'O jogo esta pausado. O chat volta quando ele continuar.');
    conferir('pausado ninguem vota para pular', sala.votarPular('b').erro, 'O jogo esta pausado.');
    conferir('quem nao e lider nao continua', sala.continuar('b').erro, 'So o lider pode continuar o jogo.');

    await esperar(150);
    const antes = Date.now();
    conferir('o lider continua', sala.continuar('a'), { ok: true });
    conferir('  a sala avisa todo mundo', ultimo('sala:pausa').dados, { pausado: false, por: 'Ana' });
    const sobra = sala.agendado.fim - antes;
    conferir('  o relogio volta com o que faltava', Math.abs(sobra - restante) < 30, true);
    const andou = sala.inicioPergunta - inicio;
    conferir('  o inicio da pergunta anda o tempo parado (~150 ms)', andou >= 140 && andou < 260, true);
    conferir('  e o chat diz quem pausou e quem continuou',
      eventos.filter((e) => e.evento === 'chat:mensagem').map((e) => e.dados.texto).filter((t) => /pausou|continuou/.test(t)),
      ['Ana pausou o jogo.', 'Ana continuou o jogo.']);
    conferir('depois da pausa o palpite volta a valer', sala.palpitar('b', 'oi').erro, undefined);
    sala.destruir();
  }

  /* ---------------- 3. O que acontece durante a pausa espera a volta ---------------- */
  {
    const { sala } = montar();
    sala.mostrarPergunta();
    sala.pausar('a');
    // A rodada fecha quando ninguem mais pode pontuar: Bia e Cid saem.
    sala.sair('b');
    sala.sair('c');
    conferir('o que seria agendado na pausa nao corre', sala.temporizador, null);
    conferir('  fica guardado para a volta', Boolean(sala.pausa && sala.pausa.rodada), true);
    sala.destruir();
  }

  /* ---------------- 4. O lider sai pausado: a coroa continua ---------------- */
  {
    const { sala } = montar();
    sala.mostrarPergunta();
    sala.pausar('a');
    sala.sair('a');
    conferir('o lider saiu e a sala segue pausada', Boolean(sala.pausa), true);
    conferir('quem herdou a coroa continua', sala.continuar('b'), { ok: true });
    conferir('  e o relogio volta', Boolean(sala.agendado), true);
    sala.destruir();
  }

  /* ---------------- 5. Carrossel: o relogio da vez tambem para ---------------- */
  {
    const { sala } = montar({ modo: 'carrossel', categorias: ['geografia'] });
    sala.mostrarPergunta();
    conferir('carrossel: a vez tem relogio proprio', Boolean(sala.agendadoVez), true);
    sala.pausar('a');
    conferir('  pausado, a vez para e guarda o que faltava',
      [sala.temporizadorVez, sala.pausa.vez && sala.pausa.vez.restante > 6000], [null, true]);
    sala.continuar('a');
    conferir('  na volta, a vez retoma', Boolean(sala.agendadoVez), true);
    sala.destruir();
  }

  /* ---------------- 6. Esperando a imagem ---------------- */
  {
    const { sala } = montar({ categorias: ['bandeiras'] });
    sala.proximaRodada();
    sala.abrirPergunta(); // fim da tela da categoria, ninguem pronto
    conferir('esperando a imagem', [sala.estado, sala.esperandoImagem], ['categoria', true]);
    sala.pausar('a');
    for (const id of ['a', 'b', 'c']) sala.imagemCarregada(id, sala.rodada);
    conferir('pausado, a imagem chegar nao abre a pergunta', sala.estado, 'categoria');
    sala.continuar('a');
    conferir('  na volta, abre na hora', sala.estado, 'pergunta');
    sala.destruir();
  }

  /* ---------------- 7. Acabou a partida ou a sala esvaziou: a pausa some ---------------- */
  {
    const { sala, ultimo } = montar();
    sala.mostrarPergunta();
    sala.pausar('a');
    sala.terminar();
    conferir('a partida acabou: a pausa some', [sala.pausa, ultimo('sala:pausa').dados.pausado], [null, false]);
    sala.destruir();
  }

  console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
  process.exit(falhas ? 1 : 0);
})();
