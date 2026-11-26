'use strict';

/*
 * Filme de saga: "Que filme e este?" com uma cena de Harry Potter e o
 * Prisioneiro de Azkaban. Acertar so "Harry Potter" vale metade dos pontos do
 * relogio; acertar o filme vale a metade e mais 5 de bonus, tenha ou nao
 * acertado a saga antes.
 */

const { Sala, calcularPontos, pontosDaSaga, BONUS_FILME_DA_SAGA } = require('../server/sala.js');
const { QUESTOES } = require('../server/questions.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(62), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

conferir('a metade arredonda para cima', [pontosDaSaga(0, 1), pontosDaSaga(1000, 2), pontosDaSaga(60000, 9)], [5, 5, 1]);
conferir('o bonus do filme e 5', BONUS_FILME_DA_SAGA, 5);

const eventos = [];
const sala = new Sala('SAGA', {
  categorias: ['cinema'], modo: 'tempo', metaPontos: 100, segundosPorPergunta: 30
}, (evento, dados) => eventos.push({ evento, dados }));
for (const [id, nome] of [['ana', 'Ana'], ['bia', 'Bia'], ['caio', 'Caio'], ['duda', 'Duda']]) sala.entrar(id, nome);
sala.iniciar();
sala.limparTemporizador();
sala.mostrarPergunta();
sala.limparTemporizador();

// A pergunta da rodada vira um filme de saga, do jeito que o banco manda.
const resposta = 'Harry Potter e o Prisioneiro de Azkaban';
const aceita = ['O Prisioneiro de Azkaban', 'Prisioneiro de Azkaban'];
Object.assign(sala.perguntaAtual, {
  pergunta: 'Que filme e este?', resposta, aceita,
  itens: [{ oficial: resposta, variantes: aceita }], saga: ['Harry Potter'], necessarias: 1
});

const t0 = sala.inicioPergunta;
const dateNowReal = Date.now;
const emT = (ms) => { Date.now = () => t0 + ms; sala.jogadores.forEach((j) => { j.ultimaMensagem = 0; }); };

// Ana acerta a saga no primeiro segundo: metade de 10.
emT(1000);
let r = sala.palpitar('ana', 'harry potter');
conferir('Ana acertou a saga', [r.veredito, r.pontos, r.bonus], ['saga', 5, 5]);
conferir('  e continua na pergunta', sala.acertos.has('ana'), false);

// Repetir a saga nao gasta chance e nao vai para o chat.
emT(1500);
r = sala.palpitar('ana', 'Harry Potter');
conferir('  repetir a saga avisa e nao gasta chance', [r.veredito, r.repetida, r.chances], ['saga', true, undefined]);

// Bia acerta o filme direto, segunda a acertar alguma coisa: metade de 9 + 5.
emT(3000);
r = sala.palpitar('bia', 'O prisioneiro de azkaban');
conferir('Bia acertou o filme direto: metade + bonus', [r.veredito, r.pontos, r.bonus],
  ['certo', pontosDaSaga(3000, 2) + 5, 5]);

// Ana agora acerta o filme: so o bonus entra, a metade ja estava paga.
emT(6000);
r = sala.palpitar('ana', resposta);
conferir('Ana acertou o filme depois da saga: 5 + 5', [r.veredito, r.pontos], ['certo', 10]);
conferir('  o placar da Ana soma 10, nao 15', sala.jogadores.get('ana').pontos, 10);

// Caio quase acerta a saga (gasta chance), depois acerta: terceiro a acertar algo.
// Uma letra errada ja vale ("Harry Poter"); duas e "quase".
emT(8000);
r = sala.palpitar('caio', 'Hary Poter');
conferir('Caio quase acertou a saga: gasta chance', [r.veredito, r.chances], ['quase', 4]);
emT(12000);
r = sala.palpitar('caio', 'Harry Potter');
conferir('Caio acertou a saga em 3o', [r.veredito, r.pontos], ['saga', Math.ceil(calcularPontos(12000, 3) / 2)]);

// Quem ja acertou o filme e escreve a saga nao entrega nada ao chat.
r = sala.palpitar('bia', 'Harry Potter');
conferir('Bia, ja com o filme, escreve a saga: segurado', r.veredito, 'bloqueado');

Date.now = dateNowReal;
sala.encerrarRodada();
sala.limparTemporizador();

const resultado = eventos.find((e) => e.evento === 'rodada:resultado').dados;
const de = (nome) => resultado.detalhes.find((d) => d.nickname === nome);
conferir('resultado: Ana acertou o filme, +10 e 5 de bonus',
  [de('Ana').acertou, de('Ana').ganhou, de('Ana').bonus], [true, 10, 5]);
conferir('resultado: Caio ficou so com a saga',
  [de('Caio').acertou, de('Caio').saga, de('Caio').ganhou], [false, true, Math.ceil(calcularPontos(12000, 3) / 2)]);
conferir('resultado: Duda nao fez nada', [de('Duda').acertou, de('Duda').saga, de('Duda').ganhou], [false, false, 0]);

// A saga nunca vai para o chat da mesa.
const chat = eventos.filter((e) => e.evento === 'chat:mensagem' && e.dados.tipo === 'jogador')
  .map((e) => e.dados.texto.toLowerCase());
conferir('a saga nao vazou no chat', chat.filter((t) => t.includes('harry')), []);
const avisos = eventos.filter((e) => e.evento === 'chat:mensagem' && e.dados.tipo === 'acerto' && e.dados.saga);
conferir('a mesa ve quem acertou a saga (Ana e Caio)', avisos.map((e) => e.dados.nickname), ['Ana', 'Caio']);

/* O banco: cada filme de saga pede "Que filme e este?", e o nome da saga nao acerta o filme. */
{
  const { avaliar } = require('../server/comparar');
  const sagas = Object.values(QUESTOES).flat().filter((q) => q.saga);
  conferir('o banco tem filmes de saga', sagas.length > 0, true);
  conferir('  todos com "Que filme e este?"', sagas.filter((q) => q.pergunta !== 'Que filme e este?').map((q) => q.imagem), []);
  const vale = sagas.filter((q) => q.saga.some((s) => avaliar(s, q.resposta, q.aceita || []).veredito === 'certo'));
  conferir('  o nome da saga nunca acerta o filme', vale.map((q) => q.imagem), []);
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
