'use strict';

/* Teste headless: uma rodada completa da Sala, com relógio controlado. */

const { Sala, calcularPontos } = require('../server/sala.js');

const eventos = [];
const sala = new Sala('TEST', {
  categorias: ['geografia'],
  modo: 'tempo',
  metaPontos: 20,
  segundosPorPergunta: 20
}, (evento, dados) => eventos.push({ evento, dados }));

sala.entrar('luiz', 'Luiz');
sala.entrar('ana', 'Ana');
sala.entrar('bia', 'Bia');
sala.entrar('caio', 'Caio');

sala.iniciar();
sala.limparTemporizador();   // não espera a revelação
sala.mostrarPergunta();
sala.limparTemporizador();   // não deixa a rodada expirar sozinha

const t0 = sala.inicioPergunta;
const certa = sala.perguntaAtual.resposta;

// Relógio controlado: cada mensagem acontece num instante exato.
const dateNowReal = Date.now;
const emT = (ms) => { Date.now = () => t0 + ms; };

// Faixa de 5s define a base (10, 9, 8, 7); desce mais 1 por quem acertou antes.
emT(1500);  sala.palpitar('luiz', certa);            // 1º, faixa 0-5s   -> 10 - 0 = 10
emT(3400);  sala.palpitar('ana', certa);             // 2º, faixa 0-5s   -> 10 - 1 =  9
emT(5500);  sala.palpitar('bia', certa);             // 3º, faixa 5-10s  ->  9 - 2 =  7
emT(7000);  sala.palpitar('caio', 'sei la, chutei'); // virou conversa   ->        0

Date.now = dateNowReal;
sala.encerrarRodada();
sala.limparTemporizador();

const resultado = eventos.find((e) => e.evento === 'rodada:resultado').dados;

const esperado = { Luiz: 10, Ana: 9, Bia: 7, Caio: 0 };
let falhas = 0;

console.log('Resposta certa:', resultado.resposta);
console.log('Dificuldade   :', resultado.dificuldade.valor, '-', resultado.dificuldade.nivel, '\n');

for (const d of resultado.detalhes) {
  const ok = d.ganhou === esperado[d.nickname];
  if (!ok) falhas++;
  console.log(
    (ok ? 'ok   ' : 'FALHA'),
    d.nickname.padEnd(6),
    (d.ms === null ? '   —  ' : ((d.ms / 1000).toFixed(1) + 's').padStart(6)),
    d.acertou ? 'acertou' : 'não     ',
    '-> +' + d.ganhou,
    '(esperado +' + esperado[d.nickname] + ')'
  );
}

/* O palpite do Caio estava longe: tinha que virar mensagem de chat. */
const mensagensChat = eventos.filter((e) => e.evento === 'chat:mensagem' && e.dados.tipo === 'jogador');
const foiParaOChat = mensagensChat.some((m) => m.dados.texto === 'sei la, chutei');
console.log('\nok   ', 'palpite distante virou mensagem de chat:', foiParaOChat);
if (!foiParaOChat) falhas++;

/* A resposta certa NUNCA pode ir ao chat global. */
const vazou = mensagensChat.some((m) => m.dados.texto.toLowerCase().includes(certa.toLowerCase()));
console.log('ok   ', 'resposta certa não vazou no chat:', !vazou);
if (vazou) falhas++;

console.log('\nPlacar:', resultado.placar.map((j) => `${j.nickname} ${j.pontos}`).join(' | '));
console.log('Acabou (meta 20)?', resultado.acabou, '-> esperado false');
if (resultado.acabou !== false) falhas++;

/* Segunda rodada: Luiz chega a 20 e a partida deve terminar. */
// O relógio falso deixou `ultimaMensagem` no futuro; zera para o anti-spam
// não confundir a próxima mensagem com spam.
for (const j of sala.jogadores.values()) j.ultimaMensagem = 0;

sala.proximaRodada();
sala.limparTemporizador();
sala.mostrarPergunta();
sala.limparTemporizador();
sala.palpitar('luiz', sala.perguntaAtual.resposta);
sala.encerrarRodada();
sala.limparTemporizador();

const rodada2 = eventos.filter((e) => e.evento === 'rodada:resultado').pop().dados;
console.log('\nRodada 2 — Luiz:', rodada2.placar.find((j) => j.nickname === 'Luiz').pontos, 'pts');
console.log('Acabou (meta 20)?', rodada2.acabou, '-> esperado true');
if (rodada2.acabou !== true) falhas++;

sala.destruir();

/* ---------------------------------------------------------------- *
 * A tabela de pontos do Modo Tempo, faixa por faixa.
 * ---------------------------------------------------------------- */


console.log('\nPontos por faixa de tempo e posição (rodada de 20s):\n');
console.log('   tempo    1º   2º   3º   4º');
for (const seg of [2, 7, 12, 17]) {
  const linha = [1, 2, 3, 4].map((p) => String(calcularPontos(seg * 1000, p)).padStart(4));
  console.log(`   ${String(seg + 's').padEnd(7)}${linha.join(' ')}`);
}

const casos = [
  [2000,  1, 10, 'primeiro na faixa 0-5s'],
  [7000,  1,  9, 'primeiro na faixa 5-10s'],
  [12000, 1,  8, 'primeiro na faixa 10-15s'],
  [17000, 1,  7, 'primeiro na faixa 15-20s'],
  [16000, 3,  5, 'terceiro depois de 15s (o exemplo pedido)'],
  [2000,  4,  7, 'quarto ainda na primeira faixa'],
  [19000, 12, 1, 'último de uma sala cheia nunca fica abaixo de 1']
];

console.log('');
for (const [ms, posicao, esperadoPts, comentario] of casos) {
  const obtido = calcularPontos(ms, posicao);
  const ok = obtido === esperadoPts;
  if (!ok) falhas++;
  console.log(
    (ok ? 'ok   ' : 'FALHA'),
    `${String(ms / 1000) + 's'} em ${posicao}º -> ${obtido} pts`.padEnd(28),
    ok ? '' : `(esperado ${esperadoPts})`,
    '·', comentario
  );
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
