'use strict';

/*
 * Modo Leilao Geral: cada um por si.
 *
 * Todo mundo ve a pergunta e aposta quantas respostas consegue dizer sozinho.
 * Quem nao quiser cobrir passa e sai da rodada; sobrando um, ele responde.
 * Quem levou o leilao ganha 2 pontos por resposta que deu — e se nao chegar no
 * que prometeu, cada um dos outros leva a aposta.
 */

const { Sala } = require('../server/sala.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(54), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

const NOMES = ['ana', 'bia', 'caio', 'duda'];

function montarSala(quantos = 3) {
  const eventos = [];
  const privados = [];
  const sala = new Sala('LG01',
    { categorias: ['geografia'], subs: [], fora: [], modo: 'leilao-geral', metaPontos: 9999, segundosPorPergunta: 20 },
    (evento, dados) => eventos.push({ evento, dados }),
    (para, evento, dados) => privados.push({ para, evento, dados }));
  for (let i = 0; i < quantos; i++) sala.entrar(NOMES[i], NOMES[i]);
  return { sala, eventos, privados };
}

/** Sala com o leilao da rodada 1 aberto e sem temporizadores soltos. */
function novaSala(quantos = 3) {
  const tudo = montarSala(quantos);
  tudo.sala.iniciar();
  tudo.sala.limparTemporizador();
  tudo.sala.mostrarPergunta();   // categoria -> leilao
  tudo.sala.limparTemporizador();
  return tudo;
}

/** De quem e a vez agora. */
const daVez = (sala) => sala.leiloeiroDe(sala.equipePorId(sala.leilao.equipes[sala.leilao.vez]));

function apostar(sala, valor) {
  const quem = daVez(sala);
  const r = sala.apostar(quem, valor);
  sala.limparTemporizador();
  return { quem, ...r };
}

function passar(sala) {
  const quem = daVez(sala);
  const r = sala.passar(quem);
  sala.limparTemporizador();
  return { quem, ...r };
}

/** Responde um item ainda livre. */
function responder(sala, socketId) {
  const livre = sala.perguntaAtual.itens.findIndex((_, i) => !sala.itensUsados.has(i));
  sala.jogadores.get(socketId).ultimaMensagem = 0;
  const r = sala.palpitar(socketId, sala.perguntaAtual.itens[livre].oficial);
  sala.limparTemporizador();
  return r;
}

/* ---------------- Quem pode comecar ---------------- */
{
  const { sala } = montarSala(1);
  conferir('sozinho nao da leilao', /pelo menos dois/.test(sala.iniciar().erro || ''), true);
  sala.destruir();

  const { sala: sala2 } = montarSala(2);
  conferir('dois ja jogam', sala2.iniciar().ok, true);
  sala2.limparTemporizador();
  conferir('  e cada um vira o proprio time',
    sala2.equipes.map((e) => e.jogadores.length), [1, 1]);
  sala2.destruir();
}

/* ---------------- A pergunta e publica: cada um aposta por si ---------------- */
{
  const { sala, privados } = novaSala(3);
  const comAPergunta = privados.filter((p) => p.evento === 'leilao:pergunta');
  conferir('todo mundo recebe o enunciado', comAPergunta.length, 3);
  conferir('  e e o mesmo enunciado da rodada',
    comAPergunta.every((p) => p.dados.pergunta === sala.perguntaAtual.pergunta), true);
  conferir('quem leiloa tambem e quem responde',
    sala.equipes.every((e) => sala.leiloeiroDe(e) === sala.respondedorDe(e)), true);
  sala.destruir();
}

/* ---------------- Cobrir, passar e fechar ---------------- */
{
  const { sala } = novaSala(3);

  conferir('nao da para passar antes do primeiro lance',
    /Abra o leilao|quem abre o leilao/i.test(passar(sala).erro || ''), true);
  conferir('duvido nao existe neste modo',
    /nao ha duvido/i.test(sala.duvidar(daVez(sala)).erro || ''), true);

  const primeiro = apostar(sala, 3);
  conferir('o primeiro lance entra', primeiro.aposta, 3);
  conferir('  e so fala quem esta na vez',
    /Nao e a sua vez/.test(sala.passar(primeiro.quem).erro || ''), true);

  // Forca a vez de volta para quem apostou: nem assim da para passar do
  // proprio lance — sem lance de outra pessoa, o leilao nao teria vencedor.
  const posto = sala.equipes.find((e) => e.jogadores.includes(primeiro.quem));
  const vezDele = sala.leilao.equipes.indexOf(posto.id);
  const vezReal = sala.leilao.vez;
  sala.leilao.vez = vezDele;
  conferir('  e ninguem passa do proprio lance',
    /maior lance/.test(sala.passar(primeiro.quem).erro || ''), true);
  sala.leilao.vez = vezReal;

  const segundo = passar(sala);
  conferir('o segundo passa', Boolean(segundo.ok), true);
  conferir('  e o leilao continua aberto', sala.leilaoAberto(), true);

  const terceiro = passar(sala);
  conferir('o terceiro passa e fecha o leilao', Boolean(terceiro.ok), true);
  conferir('  quem levou foi quem apostou', sala.leilao.respondedor, primeiro.quem);
  conferir('  e a rodada passa a pedir a aposta', sala.perguntaAtual.necessarias, 3);
  sala.destruir();
}

/* ---------------- Entregou: leva 2 pontos por resposta ---------------- */
{
  const { sala } = novaSala(3);
  const dono = apostar(sala, 2).quem;
  passar(sala);
  passar(sala);
  sala.mostrarPergunta();
  sala.limparTemporizador();

  const outro = [...sala.jogadores.keys()].find((id) => id !== dono);
  conferir('so quem levou o leilao responde',
    /So quem foi desafiado/.test(sala.palpitar(outro, 'chute qualquer').erro || ''), true);

  responder(sala, dono);
  responder(sala, dono);
  sala.encerrarRodada();
  sala.limparTemporizador();

  conferir('entregou 2: leva 4 pontos', sala.jogadores.get(dono).pontos, 4);
  conferir('  e os outros nao levam nada',
    [...sala.jogadores.values()].filter((j) => j.id !== dono).map((j) => j.pontos), [0, 0]);
  conferir('  o resultado diz que conseguiu', sala.leilao.conseguiu, true);
  sala.destruir();
}

/* ---------------- Nao entregou: os outros levam a aposta ---------------- */
{
  const { sala } = novaSala(3);
  const dono = apostar(sala, 5).quem;
  passar(sala);
  passar(sala);
  sala.mostrarPergunta();
  sala.limparTemporizador();

  responder(sala, dono);
  responder(sala, dono);
  sala.encerrarRodada();
  sala.limparTemporizador();

  conferir('disse 2 de 5: leva 4 pontos pelo que deu', sala.jogadores.get(dono).pontos, 4);
  conferir('  e cada um dos outros leva a aposta',
    [...sala.jogadores.values()].filter((j) => j.id !== dono).map((j) => j.pontos), [5, 5]);
  conferir('  o resumo leva a aposta e o consolo',
    [sala.resumoDoPresente().aposta, sala.resumoDoPresente().consolo], [5, 5]);
  sala.destruir();
}

/* ---------------- Passar no tempo tambem tira do leilao ---------------- */
{
  const { sala } = novaSala(3);
  const dono = apostar(sala, 4).quem;

  const forade = sala.leilao.equipes[sala.leilao.vez];
  sala.lanceNoTempo(forade);            // o relogio do lance zerou
  sala.limparTemporizador();
  conferir('quem deixou o tempo acabar sai do leilao',
    sala.leilao.fora.includes(forade), true);

  const ultimo = sala.leilao.equipes[sala.leilao.vez];
  sala.lanceNoTempo(ultimo);
  sala.limparTemporizador();
  conferir('  e o ultimo a sair fecha o leilao no maior lance',
    [sala.leilao.fechado, sala.leilao.respondedor, sala.leilao.aposta], [true, dono, 4]);
  sala.destruir();
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
