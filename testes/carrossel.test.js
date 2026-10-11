'use strict';

/*
 * Modo Carrossel: a vez passa de um em um, 7s para cada, e quem nao souber sai
 * da rodada. A roda gira ate sobrar um, e a colocacao paga a rodada.
 */

const { Sala } = require('../server/sala.js');
const { avaliar } = require('../server/comparar.js');

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

/**
 * Um item livre que nenhum outro da lista imita.
 *
 * Repetir um item parecido com outro ("Nintendo DS" e "Nintendo 3DS") cai na
 * faixa do "quase" antes de contar como repeticao, e o teste falhava de vez
 * em quando conforme a lista sorteada.
 */
function itemSoDele(sala) {
  const itens = sala.perguntaAtual.itens;
  const indice = itens.findIndex((item, i) => !sala.itensUsados.has(i) && itens.every((outro, j) =>
    j === i || avaliar(item.oficial, outro.oficial, outro.variantes).veredito === 'chat'));
  return indice >= 0 ? indice : itens.findIndex((_, i) => !sala.itensUsados.has(i));
}

/** Responde certo pelo jogador da vez, pegando um item ainda livre. */
function responderCerto(sala) {
  const quem = daVez(sala);
  const livre = itemSoDele(sala);
  sala.jogadores.get(quem).ultimaMensagem = 0;
  const r = sala.palpitar(quem, sala.perguntaAtual.itens[livre].oficial);
  sala.limparTemporizador();
  return { quem, ...r };
}

/* ---------------- As voltas nao tem fim ---------------- */
{
  const { sala } = novaSala(2);
  conferir('a lista e grande: pelo menos 20 respostas', sala.perguntaAtual.itens.length >= 20, true);
  // Quatro voltas de acerto com 2 pessoas: antes a rodada parava na 1a.
  for (let i = 0; i < 8; i++) responderCerto(sala);
  conferir('com todo mundo acertando, a roda continua girando', [sala.estado, sala.vivos.size], ['pergunta', 2]);
  conferir('  ja na 5a volta', sala.voltasFeitas, 4);
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

/* ---------------- Acertar passa a vez (o ponto vem no fim) ---------------- */
{
  const { sala } = novaSala(3);
  const primeiro = daVez(sala);
  const r = responderCerto(sala);

  conferir('acerto na vez nao paga na hora', [r.veredito, r.pontos], ['item', 0]);
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
  const r = sala.palpitar(quem, 'qzxwvk ploft trumbz');

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
    sala.palpitar(quem, 'qzxwvk ploft ' + 'trumbz'.repeat(i + 1));
    sala.limparTemporizador();
  }

  conferir('comecou com 3 vivos', vivosNoInicio, 3);
  conferir('sobrou 1 depois de 2 eliminados', sala.vivos.size, 1);
  sala.destruir();
}

/* ---------------- Colocacao: quem sobra e o 1o ---------------- */
{
  const { sala } = novaSala(3);
  const primeiroASair = daVez(sala);
  sala.jogadores.get(primeiroASair).ultimaMensagem = 0;
  sala.palpitar(primeiroASair, 'zzxqk vvwpl gruntz');
  sala.limparTemporizador();
  const segundoASair = daVez(sala);
  sala.jogadores.get(segundoASair).ultimaMensagem = 0;
  sala.palpitar(segundoASair, 'kkwqz plvvx brontz');
  sala.limparTemporizador();

  const sobrevivente = [...sala.vivos][0];
  sala.encerrarRodada();
  sala.limparTemporizador();
  const pontos = (id) => sala.jogadores.get(id).pontos;

  conferir('quem sobra leva 10, o ultimo a sair 9, o primeiro a sair 8',
    [pontos(sobrevivente), pontos(segundoASair), pontos(primeiroASair)], [10, 9, 8]);
  sala.destruir();
}

/* ---------------- A lista acabou com mais de um vivo: empate ---------------- */
{
  const { sala } = novaSala(3);
  const fora = daVez(sala);
  sala.jogadores.get(fora).ultimaMensagem = 0;
  sala.palpitar(fora, 'zzxqk vvwpl gruntz');
  sala.limparTemporizador();
  // Gasta a lista inteira menos um item, e o ultimo acerto a fecha.
  const itens = sala.perguntaAtual.itens.length;
  for (let i = 0; i < itens; i++) sala.itensUsados.add(i);
  sala.itensUsados.delete(itens - 1);
  const quem = daVez(sala);
  sala.jogadores.get(quem).ultimaMensagem = 0;
  sala.palpitar(quem, sala.perguntaAtual.itens[itens - 1].oficial);
  const agendado = sala.agendado;
  sala.limparTemporizador();
  agendado.fn();
  sala.limparTemporizador();

  conferir('lista acabou: a rodada fecha sem mais vez', sala.estado, 'resultado');
  const vivos = [...sala.vivos].map((id) => sala.jogadores.get(id).pontos);
  conferir('  os dois que sobraram empatam em 1o: 10 cada', vivos, [10, 10]);
  conferir('  e quem saiu e o 3o: 8', sala.jogadores.get(fora).pontos, 8);
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

/* ---------- Visivel manda a lista do que ja saiu; as cegas nao ---------- */
{
  for (const [modo, esperado] of [['carrossel', true], ['carrossel-cego', false]]) {
    const eventos = [];
    const sala = new Sala('CAR9', {
      categorias: ['geografia'], modo, metaPontos: 9999, segundosPorPergunta: 20
    }, (evento, dados) => eventos.push({ evento, dados }));
    sala.entrar('a', 'Ana');
    sala.entrar('b', 'Bia');
    sala.iniciar();
    sala.limparTemporizador();
    sala.mostrarPergunta();
    sala.limparTemporizador();

    const pergunta = eventos.filter((e) => e.evento === 'rodada:pergunta').pop().dados;
    const vez = eventos.filter((e) => e.evento === 'carrossel:vez').pop().dados;

    conferir(modo + ' anuncia se a lista aparece', pergunta.carrossel.visivel, esperado);
    conferir('  e manda (ou nao) o que ja foi dito', Array.isArray(vez.ditos), esperado);
    sala.destruir();
  }
}

/* ---------- As cegas: errar nao elimina, repetir sim, e nada vaza ---------- */
{
  // O as cegas mostrava a resposta no chat e piscava a lista embaixo: o modo
  // e sobre lembrar o que ja saiu, entao nenhum nome dito pode aparecer. E
  // errar passou a so gastar o relogio — o que elimina e repetir.
  const eventos = [];
  const sala = new Sala('CEG1', {
    categorias: ['geografia'], modo: 'carrossel-cego', metaPontos: 9999, segundosPorPergunta: 20
  }, (evento, dados) => eventos.push({ evento, dados }));
  sala.entrar('a', 'Ana');
  sala.entrar('b', 'Bia');
  sala.entrar('c', 'Caio');
  sala.iniciar();
  sala.limparTemporizador();
  sala.mostrarPergunta();
  sala.limparTemporizador();

  // Lista fixa, para o teste nao depender do sorteio.
  sala.perguntaAtual = {
    ...sala.perguntaAtual,
    itens: ['Argentina', 'Brasil', 'Colombia', 'Dinamarca', 'Equador', 'Finlandia']
      .map((nome) => ({ oficial: nome, variantes: [] }))
  };

  const tentar = (quem, texto) => {
    sala.jogadores.get(quem).ultimaMensagem = 0;
    const r = sala.palpitar(quem, texto);
    sala.limparTemporizador();
    return r;
  };

  const primeiro = daVez(sala);
  const errou = tentar(primeiro, 'qzxwvk ploft trumbz');
  conferir('as cegas: errar nao elimina', errou.veredito, 'errado');
  conferir('  quem errou continua viva', sala.vivos.has(primeiro), true);
  conferir('  e continua com a vez', daVez(sala), primeiro);

  const antesDoAcerto = eventos.length;
  tentar(primeiro, 'Argentina');
  const acerto = eventos.slice(antesDoAcerto)
    .filter((e) => e.evento === 'chat:mensagem' && e.dados.tipo === 'acerto').pop();
  conferir('as cegas: o acerto nao leva o nome no chat', acerto.dados.texto, null);
  conferir('  mas continua marcado como item de lista', acerto.dados.item, true);

  const segundo = daVez(sala);
  // "Argentine" esta a uma letra de um item que JA saiu: nada de dica.
  const quase = tentar(segundo, 'Argentine');
  conferir('as cegas: quase de item ja dito nao vira dica', quase.veredito, 'errado');

  const antesDaRepeticao = eventos.length;
  const repetiu = tentar(segundo, 'Argentina');
  conferir('as cegas: repetir elimina', [repetiu.veredito, repetiu.motivo], ['eliminado', 'repetiu']);
  const vazou = eventos.slice(antesDaRepeticao).some((e) =>
    e.evento === 'chat:mensagem' && /argentina/i.test(JSON.stringify(e.dados)));
  conferir('  e o palpite repetido nao vai para o chat', vazou, false);
  sala.destruir();
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
