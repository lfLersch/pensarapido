'use strict';

/* Modo Escalada: a rodada N pede N respostas. */

const { Sala } = require('../server/sala.js');

const eventos = [];
const sala = new Sala('ESC1', {
  categorias: ['geografia'],
  modo: 'escalada',
  metaPontos: 200,
  segundosPorPergunta: 30
}, (evento, dados) => eventos.push({ evento, dados }));

sala.entrar('luiz', 'Luiz');
sala.entrar('ana', 'Ana');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(46), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

/** Avança para a próxima rodada sem esperar os temporizadores. */
function abrirRodada() {
  sala.limparTemporizador();
  sala.mostrarPergunta();
  sala.limparTemporizador();
  for (const j of sala.jogadores.values()) j.ultimaMensagem = 0;
  return sala.perguntaAtual;
}

/* ------------------------------ Rodada 1 ------------------------------ */

sala.iniciar();
let pergunta = abrirRodada();

console.log('Rodada 1:', pergunta.pergunta);
conferir('rodada 1 pede 1 resposta', pergunta.necessarias, 1);

const r1 = sala.palpitar('luiz', pergunta.resposta);
conferir('resposta certa completa a rodada 1', r1.veredito, 'certo');
conferir('rodada 1 vale 10 pontos', r1.pontos, 10);

sala.encerrarRodada();
sala.limparTemporizador();

/* ------------------------------ Rodada 2 ------------------------------ */

sala.proximaRodada();
pergunta = abrirRodada();

console.log('\nRodada 2:', pergunta.pergunta);
conferir('rodada 2 pede 2 respostas', pergunta.necessarias, 2);
conferir('rodada 2 tem itens suficientes', pergunta.itens.length >= 2, true);

const primeiro = pergunta.itens[0].oficial;
const segundo = pergunta.itens[1].oficial;

const p1 = sala.palpitar('luiz', primeiro);
conferir('1º item -> progresso parcial', [p1.veredito, p1.quantos, p1.necessarias], ['item', 1, 2]);

for (const j of sala.jogadores.values()) j.ultimaMensagem = 0;
const p2 = sala.palpitar('luiz', primeiro);
conferir('repetir o mesmo item -> repetido', p2.veredito, 'repetido');

for (const j of sala.jogadores.values()) j.ultimaMensagem = 0;
const p3 = sala.palpitar('luiz', 'batata frita com queijo');
conferir('palpite distante -> vai para o chat', p3.veredito, 'chat');

for (const j of sala.jogadores.values()) j.ultimaMensagem = 0;
const p4 = sala.palpitar('luiz', segundo);
conferir('2º item -> completa e pontua', [p4.veredito, p4.quantos], ['certo', 2]);

/* Nenhum item respondido pode ter ido ao chat global. */
const textosDoChat = eventos
  .filter((e) => e.evento === 'chat:mensagem' && e.dados.tipo === 'jogador')
  .map((e) => e.dados.texto.toLowerCase());

const vazou = [primeiro, segundo].some((item) =>
  textosDoChat.some((t) => t.includes(item.toLowerCase())));
conferir('nenhum item correto vazou no chat', vazou, false);
conferir('a conversa distante apareceu no chat', textosDoChat.includes('batata frita com queijo'), true);

sala.encerrarRodada();
sala.limparTemporizador();

const resultado2 = eventos.filter((e) => e.evento === 'rodada:resultado').pop().dados;
const luiz2 = resultado2.detalhes.find((d) => d.nickname === 'Luiz');
conferir('resultado lista os itens do jogador', luiz2.itens.length, 2);

/* ------------------------ Rodadas 3, 4, 5 e 6 ------------------------ */

console.log('');
for (let n = 3; n <= 6; n++) {
  sala.proximaRodada();
  pergunta = abrirRodada();
  conferir(`rodada ${n} pede ${n} respostas`, pergunta.necessarias, n);

  // Responder n-1 itens não pode completar a rodada.
  for (let i = 0; i < n - 1; i++) {
    for (const j of sala.jogadores.values()) j.ultimaMensagem = 0;
    const r = sala.palpitar('ana', pergunta.itens[i].oficial);
    if (r.veredito !== 'item') { falhas++; console.log('FALHA item parcial na rodada', n, r); }
  }

  for (const j of sala.jogadores.values()) j.ultimaMensagem = 0;
  const ultimo = sala.palpitar('ana', pergunta.itens[n - 1].oficial);
  conferir(`  rodada ${n}: o ${n}º item completa`, ultimo.veredito, 'certo');

  console.log(`     "${pergunta.pergunta}" (${pergunta.itens.length} itens no repertório)`);
  sala.encerrarRodada();
  sala.limparTemporizador();
}

/* A rodada cresce em tempo junto com o número de respostas. */
sala.perguntaAtual = { necessarias: 1 };
const t1 = sala.duracaoDaRodada();
sala.perguntaAtual = { necessarias: 6 };
const t6 = sala.duracaoDaRodada();
console.log('');
conferir('rodada de 1 resposta dura 30s', t1, 30000);
conferir('rodada de 6 respostas dura 55s', t6, 55000);

sala.destruir();
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
