'use strict';

/*
 * Pergunta secreta: a pergunta comeca toda escondida e abre uma palavra por
 * vez, uma a cada vez de jogador (8s cada). Quem acerta na sua vez leva o
 * numero de palavras que ainda estavam escondidas.
 */

const { Sala, MODOS, MS_VEZ_SECRETA, MIN_PALAVRAS_SECRETA } = require('../server/sala.js');
const { SECRETAS } = require('../server/secretas.js');
const { CATEGORIAS } = require('../server/questions.js');
const { normalizar, avaliar } = require('../server/comparar.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(56), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

function novaSala(quantos = 3, categorias = ['futebol']) {
  const eventos = [];
  const sala = new Sala('SEC1', {
    categorias, modo: 'pergunta-secreta', metaPontos: 9999, segundosPorPergunta: 20
  }, (evento, dados) => eventos.push({ evento, dados }));

  const nomes = ['Ana', 'Bia', 'Caio', 'Duda'];
  for (let i = 0; i < quantos; i++) sala.entrar(nomes[i].toLowerCase(), nomes[i]);
  sala.iniciar();
  sala.limparTemporizador();
  sala.mostrarPergunta();
  return { sala, eventos };
}

const daVez = (sala) => sala.secreta.daVez;
const ultimo = (eventos, nome) => [...eventos].reverse().find((e) => e.evento === nome);

/** Faz o respiro entre uma vez e outra acontecer na hora. */
function proximaVez(sala) {
  const fn = sala.agendado && sala.agendado.fn;
  sala.limparTemporizador();
  if (fn) fn();
}

function palpite(sala, id, texto) {
  sala.jogadores.get(id).ultimaMensagem = 0;
  return sala.palpitar(id, texto);
}

/* ---------------- O banco ---------------- */
{
  const modo = MODOS.find((m) => m.id === 'pergunta-secreta');
  conferir('o modo existe e esta disponivel', Boolean(modo && modo.disponivel), true);
  conferir('8s por vez, no minimo 13 palavras', [MS_VEZ_SECRETA, MIN_PALAVRAS_SECRETA], [8000, 13]);

  const curtas = SECRETAS.filter((q) => q.pergunta.split(/\s+/).length < MIN_PALAVRAS_SECRETA);
  conferir('toda pergunta tem pelo menos 13 palavras', curtas.map((q) => q.pergunta), []);

  const ids = new Set(CATEGORIAS.map((c) => c.id));
  conferir('toda categoria existe', SECRETAS.filter((q) => !ids.has(q.categoria)).map((q) => q.categoria), []);

  const acentos = SECRETAS.filter((q) => /[^\x00-\x7f]/.test(q.pergunta + q.resposta + (q.aceita || []).join('')));
  conferir('sem acentos', acentos.map((q) => q.pergunta), []);

  // A pergunta nao pode trazer a resposta escrita: ela abre palavra por palavra.
  const entregam = SECRETAS.filter((q) => normalizar(q.pergunta).includes(normalizar(q.resposta)));
  conferir('a pergunta nao contem a resposta', entregam.map((q) => q.resposta), []);

  const repetidas = SECRETAS.length - new Set(SECRETAS.map((q) => q.pergunta)).size;
  conferir('nenhuma pergunta repetida', repetidas, 0);
  conferir('banco com pelo menos 100 perguntas', SECRETAS.length >= 100, true);
}

/* ---------------- Comeca tudo escondido ---------------- */
{
  const { sala, eventos } = novaSala(3);
  const pergunta = ultimo(eventos, 'rodada:pergunta').dados;
  conferir('o enunciado nao vai na abertura', pergunta.pergunta, '');
  conferir('  nem a mascara da resposta', pergunta.mascara, null);
  conferir('  vai so quantas palavras tem', pergunta.secreta.total, sala.perguntaAtual.palavras.length);
  conferir('  e a categoria nao entrega o assunto', pergunta.categoria.id, 'pergunta-secreta');
  conferir('so pergunta das categorias marcadas',
    SECRETAS.find((q) => q.pergunta === sala.perguntaAtual.pergunta).categoria, 'futebol');

  const vez = ultimo(eventos, 'secreta:vez').dados;
  const abertas = vez.palavras.map((p, i) => (p === null ? null : i)).filter((i) => i !== null);
  conferir('a primeira vez abre 1 palavra', abertas.length, 1);
  conferir('  no lugar dela na frase', vez.palavras[vez.nova], sala.perguntaAtual.palavras[vez.nova]);
  conferir('  e avisa qual abriu', abertas, [vez.nova]);
  conferir('  e vale o resto', vez.valendo, sala.perguntaAtual.palavras.length - 1);
  conferir('  e do primeiro da roda', vez.jogadorId, sala.secreta.ordem[0]);
  sala.destruir();
}

/* ---------------- As palavras abrem em ordem sorteada ---------------- */
{
  let foraDeOrdem = 0;
  let tortos = 0;
  const primeiras = new Set();
  for (let i = 0; i < 40; i++) {
    const { sala } = novaSala(2);
    const sorteio = sala.secreta.sorteio;
    const todas = sala.perguntaAtual.palavras.map((_, k) => k);
    if (JSON.stringify([...sorteio].sort((x, y) => x - y)) !== JSON.stringify(todas)) tortos++;
    if (sorteio.some((v, k) => v !== k)) foraDeOrdem++;
    primeiras.add(sorteio[0]);
    sala.destruir();
  }
  conferir('o sorteio tem cada palavra uma vez', tortos, 0);
  conferir('a ordem nao e da esquerda para a direita', foraDeOrdem, 40);
  conferir('  e a primeira palavra varia', primeiras.size > 5, true);
}

/* ---------------- Cada vez abre a proxima do sorteio ---------------- */
{
  const { sala, eventos } = novaSala(2);
  const sorteio = sala.secreta.sorteio;
  palpite(sala, daVez(sala), 'zzzzzz');
  proximaVez(sala);
  palpite(sala, daVez(sala), 'zzzzzz');
  proximaVez(sala);
  const vez = ultimo(eventos, 'secreta:vez').dados;
  const abertas = vez.palavras.map((p, i) => (p === null ? null : i)).filter((i) => i !== null);
  conferir('3a vez: abertas as 3 primeiras do sorteio', abertas, sorteio.slice(0, 3).sort((x, y) => x - y));
  conferir('  e a nova e a 3a do sorteio', vez.nova, sorteio[2]);
  sala.destruir();
}

/* ---------------- Acertar vale as palavras escondidas ---------------- */
{
  const { sala, eventos } = novaSala(3);
  const total = sala.perguntaAtual.palavras.length;
  const [a, b, c] = sala.secreta.ordem;

  // A vez de A: erra, e a vez passa para B com mais uma palavra.
  const r1 = palpite(sala, a, 'zzzzzz qualquer coisa');
  conferir('errou: a vez passa', r1.veredito, 'passou');
  conferir('  o erro vai para o chat', ultimo(eventos, 'chat:mensagem').dados.texto, 'zzzzzz qualquer coisa');
  conferir('  e ninguem escreve no respiro', palpite(sala, b, sala.perguntaAtual.resposta).erro, 'Espere a sua vez.');
  proximaVez(sala);
  conferir('agora e a vez de B, com 2 palavras', [daVez(sala), sala.secreta.reveladas], [b, 2]);

  // Quem nao esta na vez nao responde.
  conferir('fora da vez nao responde', palpite(sala, c, sala.perguntaAtual.resposta).erro, 'Espere a sua vez.');
  conferir('  e o palpite dele nao pontua', sala.jogadores.get(c).pontos, 0);

  // B acerta com 2 palavras abertas.
  const r2 = palpite(sala, b, sala.perguntaAtual.resposta);
  conferir('acertou com 2 palavras abertas', [r2.veredito, r2.pontos], ['certo', total - 2]);
  conferir('  os pontos entram no placar', sala.jogadores.get(b).pontos, total - 2);
  proximaVez(sala);
  const resultado = ultimo(eventos, 'rodada:resultado').dados;
  conferir('a rodada acaba no acerto', sala.estado, 'resultado');
  conferir('  e o resultado mostra a pergunta inteira', resultado.secreta.palavras, sala.perguntaAtual.palavras);
  conferir('  e a resposta', resultado.resposta, sala.perguntaAtual.resposta);
  sala.destruir();
}

/* ---------------- "Quase" nao gasta a vez ---------------- */
{
  const { sala } = novaSala(2);
  const quem = daVez(sala);
  // Uma resposta fixa, para o "quase" nao depender do sorteio.
  sala.perguntaAtual.resposta = 'Garrincha';
  sala.perguntaAtual.aceita = [];
  conferir('(Garincha e quase de Garrincha)', avaliar('Garincha', 'Garrincha').veredito, 'quase');
  const r = palpite(sala, quem, 'Garincha');
  conferir('quase: avisa e continua na vez', [r.veredito, daVez(sala)], ['quase', quem]);
  const certo = palpite(sala, quem, 'garrincha');
  conferir('  e ainda da para acertar na mesma vez', certo.veredito, 'certo');
  sala.destruir();
}

/* ---------------- O tempo passa a vez ---------------- */
{
  const { sala, eventos } = novaSala(2);
  const [a, b] = sala.secreta.ordem;
  conferir('o relogio da vez e de 8s', sala.agendadoVez.fim - Date.now() <= MS_VEZ_SECRETA, true);
  sala.agendadoVez.fn();
  conferir('o tempo acabou: a vez passou', ultimo(eventos, 'secreta:passou').dados, { jogadorId: a, motivo: 'tempo' });
  proximaVez(sala);
  conferir('  para o proximo, com mais uma palavra', [daVez(sala), sala.secreta.reveladas], [b, 2]);
  sala.destruir();
}

/* ---------------- Ninguem acertou: a ultima palavra nao abre ---------------- */
{
  const { sala, eventos } = novaSala(2);
  const total = sala.perguntaAtual.palavras.length;
  let vezes = 0;
  while (sala.estado === 'pergunta' && vezes < 100) {
    palpite(sala, daVez(sala), 'zzzzzz');
    proximaVez(sala);
    vezes++;
  }
  conferir('abre ate faltar uma palavra (vale 1 na ultima vez)', vezes, total - 1);
  conferir('  e acaba sem ninguem pontuar',
    [...sala.jogadores.values()].map((j) => j.pontos), [0, 0]);
  conferir('  mostrando a pergunta inteira', ultimo(eventos, 'rodada:resultado').dados.secreta.palavras.length, total);
  sala.destruir();
}

/* ---------------- A roda gira entre as rodadas ---------------- */
{
  const { sala } = novaSala(3);
  const primeira = sala.secreta.ordem[0];
  palpite(sala, daVez(sala), sala.perguntaAtual.resposta);
  sala.limparTemporizador();
  sala.encerrarRodada();
  sala.limparTemporizador();
  const anterior = sala.perguntaAtual.pergunta;
  sala.comecarRodada();
  sala.limparTemporizador();
  sala.mostrarPergunta();
  conferir('na rodada seguinte outro comeca', sala.secreta.ordem[0] !== primeira, true);
  conferir('  e a pergunta e outra', sala.perguntaAtual.pergunta !== anterior, true);
  sala.destruir();
}

/* ---------------- Quem sai na propria vez nao trava a roda ---------------- */
{
  const { sala } = novaSala(3);
  const [a, b] = sala.secreta.ordem;
  sala.sair(a);
  proximaVez(sala);
  conferir('saiu na vez: a vez vai para o proximo', daVez(sala), b);
  sala.destruir();
}

/* ---------------- Categoria sem pergunta secreta usa o banco inteiro ---------------- */
{
  const { sala } = novaSala(2, ['ouvir']);
  conferir('sem secreta na categoria: sorteia do banco todo', Boolean(sala.perguntaAtual.palavras), true);
  sala.destruir();
}

if (falhas) {
  console.log(`\n${falhas} falha(s).`);
  process.exit(1);
}
console.log('\nPergunta secreta ok.');
