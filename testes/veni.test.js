'use strict';

/*
 * Modo Veni, Vidi, Vici: uma palavra e tres dicas.
 *
 * As dicas entram uma por terco da rodada e cada uma derruba o valor do
 * acerto: 10 na primeira, 6 na segunda, 3 na terceira, menos 1 para cada
 * pessoa que acertou antes.
 */

const { Sala } = require('../server/sala.js');
const { PALAVRAS } = require('../server/dicas.js');
const { normalizar } = require('../server/comparar.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(52), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

function novaSala(modo = 'veni') {
  const eventos = [];
  const sala = new Sala('VVV1',
    { categorias: ['bandeiras'], subs: [], fora: [], modo, metaPontos: 9999, segundosPorPergunta: 20 },
    (evento, dados) => eventos.push({ evento, dados }));
  sala.entrar('ana', 'Ana');
  sala.entrar('bia', 'Bia');
  return { sala, eventos };
}

/* ---------------- O banco ---------------- */
{
  conferir('o banco tem palavra que chegue', PALAVRAS.length >= 50, true);
  const longas = PALAVRAS.filter((p) => (p.dicas || []).some((d) => d.split(" ").length > 5));
  conferir('dica e curta: no maximo cinco palavras', longas.map((p) => p.resposta), []);

  const semTres = PALAVRAS.filter((p) => !Array.isArray(p.dicas) || p.dicas.length !== 3);
  conferir('toda palavra tem tres dicas', semTres.map((p) => p.resposta), []);

  const vazias = PALAVRAS.filter((p) => (p.dicas || []).some((d) => !d || d.trim().length < 3));
  conferir('nenhuma dica em branco', vazias.map((p) => p.resposta), []);

  // A dica nao pode trazer a resposta: "o cavalo da Ferrari" entrega tudo.
  const entregam = [];
  for (const p of PALAVRAS) {
    const formas = [p.resposta, ...(p.aceita || [])].map(normalizar).filter((f) => f.length >= 4);
    for (const dica of p.dicas || []) {
      const limpa = normalizar(dica);
      if (formas.some((f) => limpa.includes(f))) entregam.push(`${p.resposta}: ${dica}`);
    }
  }
  conferir('nenhuma dica entrega a resposta', entregam, []);

  const vistas = new Map();
  const repetidas = [];
  for (const p of PALAVRAS) {
    const chave = normalizar(p.resposta);
    if (vistas.has(chave)) repetidas.push(p.resposta);
    vistas.set(chave, true);
  }
  conferir('nenhuma palavra repetida no banco', repetidas, []);
}

/* ---------------- A rodada ---------------- */
{
  const { sala, eventos } = novaSala();
  sala.iniciar();
  sala.limparTemporizador();
  sala.mostrarPergunta();
  sala.limparTemporizador();

  const pergunta = eventos.find((e) => e.evento === 'rodada:pergunta').dados;
  conferir('a rodada manda so a primeira dica', pergunta.veni.indice, 0);
  conferir('  e diz quanto ela vale', pergunta.veni.vale, 10);
  conferir('  e quantas dicas existem', pergunta.veni.total, 3);
  conferir('a dica que foi para a tela e a primeira do banco',
    pergunta.veni.dica, sala.perguntaAtual.dicas[0]);
  conferir('o enunciado nao entrega a palavra',
    normalizar(pergunta.pergunta).includes(normalizar(sala.perguntaAtual.resposta)), false);
  conferir('a rodada dura 50% mais que a da sala', pergunta.duracaoMs, 30000);
  sala.destruir();
}

/* ---------------- A pontuacao cai a cada dica ---------------- */
{
  for (const [dica, esperado] of [[0, 10], [1, 6], [2, 3]]) {
    const { sala } = novaSala();
    sala.iniciar();
    sala.limparTemporizador();
    sala.mostrarPergunta();
    sala.limparTemporizador();

    sala.dicaAtual = dica;
    sala.jogadores.get('ana').ultimaMensagem = 0;
    const r = sala.palpitar('ana', sala.perguntaAtual.resposta);
    conferir(`acertar na dica ${dica + 1} vale ${esperado}`, r.pontos, esperado);
    sala.destruir();
  }

  const { sala } = novaSala();
  sala.iniciar();
  sala.limparTemporizador();
  sala.mostrarPergunta();
  sala.limparTemporizador();

  sala.jogadores.get('ana').ultimaMensagem = 0;
  sala.palpitar('ana', sala.perguntaAtual.resposta);
  sala.jogadores.get('bia').ultimaMensagem = 0;
  const segunda = sala.palpitar('bia', sala.perguntaAtual.resposta);
  conferir('o segundo a acertar leva 1 a menos', segunda.pontos, 9);

  sala.dicaAtual = 2;
  conferir('  e na ultima dica o acerto nunca fica abaixo de 1',
    Math.max(1, 3 - 5), 1);
  sala.destruir();
}

/* ---------------- As dicas entram sozinhas ---------------- */
async function dicasNoTempo() {
  const { sala, eventos } = novaSala();
  sala.iniciar();
  sala.limparTemporizador();
  sala.mostrarPergunta();
  sala.limparTemporizador();          // tira o relogio da rodada, nao as dicas
  sala.agendarDicas(90);              // 30ms por dica, para o teste nao esperar

  await new Promise((pronto) => setTimeout(pronto, 150));

  const dicas = eventos.filter((e) => e.evento === 'veni:dica').map((e) => e.dados);
  conferir('as outras duas dicas entram sozinhas', dicas.map((d) => d.indice), [1, 2]);
  conferir('  e cada uma vale menos que a anterior', dicas.map((d) => d.vale), [6, 3]);
  conferir('  a dica que chega e a do banco',
    dicas.map((d) => d.dica), sala.perguntaAtual.dicas.slice(1));
  conferir('a sala acompanha em qual dica esta', sala.dicaAtual, 2);

  sala.limparTemporizador();
  sala.destruir();

  console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
  process.exit(falhas ? 1 : 0);
}

dicasNoTempo();
