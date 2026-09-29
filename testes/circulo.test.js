'use strict';

/*
 * O circulo entre a dificuldade das perguntas e a nota dos jogadores.
 *
 * A dificuldade mexe na nota (acertar pergunta dificil sobe muito), e a nota
 * de quem jogou mexe na dificuldade: se a sala acerta menos do que as notas
 * dela prometiam, a pergunta e mais dificil do que parecia. Circulo assim
 * pode desandar (nota e dificuldade subindo juntas, uma justificando a
 * outra), entao alem das contas uma populacao inteira e simulada.
 *
 * Tambem cobre o que o painel do perfil mostra: nota geral, acerto por
 * faixa de dificuldade contra o esperado, a evolucao partida a partida.
 */

const os = require('os');
const path = require('path');
process.env.PERFIS_ARQUIVO = path.join(os.tmpdir(), `perfis-circulo-${process.pid}.json`);
delete process.env.DATABASE_URL;

const dificuldade = require('../server/dificuldade.js');
const perfis = require('../server/perfis.js');
const { Sala } = require('../server/sala.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(64), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

/* ---------------- 1. A conta de uma rodada ---------------- */
{
  const rodada = { jogadores: 4, tempos: [3000, 9000], duracaoMs: 20000, dificuldadeAtual: 40 };
  const sala = (nota, confianca) => [true, true, false, false].map((acertou) => ({ nota, confianca, acertou }));
  const bruta = dificuldade.dificuldadeObservada(rodada);

  conferir('sem sala (leilao, carrossel) fica a conta de antes', bruta, 43);
  conferir('sala sem nota nenhuma nao mexe',
    dificuldade.dificuldadeObservada({ ...rodada, sala: sala(50, 0) }), bruta);
  conferir('craques errando metade: a pergunta sobe',
    dificuldade.dificuldadeObservada({ ...rodada, sala: sala(80, 1) }) > bruta + 15, true);
  conferir('novatos acertando metade: a pergunta desce',
    dificuldade.dificuldadeObservada({ ...rodada, sala: sala(20, 1) }) < bruta - 15, true);
  conferir('nota provisoria pesa menos que a firme',
    dificuldade.dificuldadeObservada({ ...rodada, sala: sala(80, 0.3) })
      < dificuldade.dificuldadeObservada({ ...rodada, sala: sala(80, 1) }), true);
  conferir('sala que fez exatamente o esperado nao mexe',
    dificuldade.surpresaDaSala([{ nota: 40, confianca: 1, acertou: true }, { nota: 40, confianca: 1, acertou: false }], 40), 0);
  conferir('a observada fica entre 0 e 100', [
    dificuldade.dificuldadeObservada({ jogadores: 1, tempos: [], duracaoMs: 20000, dificuldadeAtual: 5,
      sala: [{ nota: 100, confianca: 1, acertou: false }] }),
    dificuldade.dificuldadeObservada({ jogadores: 1, tempos: [100], duracaoMs: 20000, dificuldadeAtual: 95,
      sala: [{ nota: 0, confianca: 1, acertou: true }] })
  ], [100, 0]);
  conferir('a chance e a mesma nas duas pontas do circulo', perfis.chanceDeAcerto === dificuldade.chanceDeAcerto, true);
}

/* ---------------- 2. A nota que a pessoa leva para a pergunta ---------------- */
{
  const { notaEfetivaDe, normalizarPerfil } = perfis;
  conferir('quem nunca jogou: 50, sem confianca', notaEfetivaDe(null, 'cinema'), { nota: 50, confianca: 0 });

  const veterano = normalizarPerfil({
    geral: { rodadas: 95, acertos: 70, nota: 70, somaDificuldade: 4000 },
    porCategoria: {}
  });
  const semCinema = notaEfetivaDe(veterano, 'cinema');
  conferir('veterano que nunca jogou Cinema entra com a geral', semCinema.nota, 69);
  conferir('  e com quase toda a confianca da geral', semCinema.confianca, 0.95);

  veterano.porCategoria.cinema = normalizarPerfil({ porCategoria: { cinema: { rodadas: 5, nota: 30 } } }).porCategoria.cinema;
  conferir('5 rodadas de Cinema puxam metade do caminho', notaEfetivaDe(veterano, 'cinema').nota, 49.5);
}

/* ---------------- 3. A populacao simulada ---------------- */

/**
 * 40 jogadores de forca conhecida (20 a 80) jogam 80 perguntas de
 * dificuldade conhecida (15 a 85), em salas de 4, com os modulos de verdade.
 * No fim, 4 perguntas dificeis (70) so caem para os mais fortes e 4 faceis
 * (30) so para os mais fracos: as duas turmas acertam uns 73%, e so quem
 * olha a nota da sala consegue separar uma da outra.
 */
function simular(prefixo, comSala, semente = 42) {
  // mulberry32: o sorteio se repete igual a cada vez que o teste roda.
  let estado = semente >>> 0;
  const sorteio = () => {
    estado = (estado + 0x6D2B79F5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const logistica = (x) => 1 / (1 + Math.exp(-x));
  const N = 40;
  const Q = 80;
  const T = 20000;
  const forca = Array.from({ length: N }, (_, i) => 20 + (60 * i) / (N - 1));
  const verdade = Array.from({ length: Q }, (_, i) => 15 + (70 * i) / (Q - 1));
  const DIFICEIS = [80, 81, 82, 83];
  const FACEIS = [84, 85, 86, 87];
  for (const q of DIFICEIS) verdade[q] = 70;
  for (const q of FACEIS) verdade[q] = 30;

  const estatistica = new Map();
  const dif = (q) => (estatistica.get(q) || { dificuldade: 45 }).dificuldade;
  const cliente = (j) => `${prefixo}-${j}`;

  const jogar = (q, mesa) => {
    const antes = dif(q);
    const tempos = [];
    const sala = mesa.map((j) => {
      const chance = logistica((forca[j] - verdade[q]) / 10);
      const acertou = sorteio() < chance;
      if (acertou) tempos.push(T * (0.15 + 0.5 * (1 - chance) * sorteio()));
      return { ...perfis.notaEfetiva(cliente(j), 'cinema'), acertou };
    });
    estatistica.set(q, dificuldade.proximaEstatistica(estatistica.get(q), 45, {
      jogadores: mesa.length, tempos, duracaoMs: T, sala: comSala ? sala : null
    }));
    mesa.forEach((j, k) => perfis.anotarRodada(cliente(j), `J${j}`, {
      acertou: sala[k].acertou, ms: null, primeiro: false, dificuldade: antes,
      categoria: 'cinema', sequencia: 0, medeCategoria: true
    }));
  };
  const mesaDe = (grupo) => {
    const g = [...grupo];
    for (let i = g.length - 1; i > 0; i--) {
      const k = Math.floor(sorteio() * (i + 1));
      [g[i], g[k]] = [g[k], g[i]];
    }
    return g.slice(0, 4);
  };
  const todos = forca.map((_, j) => j);
  const media = (lista) => lista.reduce((a, b) => a + b, 0) / lista.length;
  const nivelMedio = () => media(Array.from({ length: Q }, (_, q) => dif(q)));

  const niveis = [];
  for (let t = 1; t <= 20000; t++) {
    jogar(Math.floor(sorteio() * Q), mesaDe(todos));
    if (t % 10000 === 0) niveis.push(nivelMedio());
  }
  const fortes = todos.filter((j) => forca[j] >= 72);
  const fracos = todos.filter((j) => forca[j] >= 32 && forca[j] <= 48);
  for (let t = 0; t < 60; t++) {
    for (let k = 0; k < 30; k++) jogar(Math.floor(sorteio() * Q), mesaDe(todos));
    for (const q of DIFICEIS) jogar(q, mesaDe(fortes));
    for (const q of FACEIS) jogar(q, mesaDe(fracos));
  }

  const aprendidas = Array.from({ length: Q }, (_, q) => dif(q));
  const reais = verdade.slice(0, Q);
  const ma = media(aprendidas);
  const mb = media(reais);
  let cov = 0; let va = 0; let vb = 0;
  aprendidas.forEach((a, i) => { cov += (a - ma) * (reais[i] - mb); va += (a - ma) ** 2; vb += (reais[i] - mb) ** 2; });

  return {
    niveis,
    correlacao: cov / Math.sqrt(va * vb),
    separacao: media(DIFICEIS.map(dif)) - media(FACEIS.map(dif))
  };
}

// Para calibrar os pesos: VARRER_SEMENTES=1 node testes/circulo.test.js roda
// a simulacao em varias sementes (em 8 delas a nota da sala somou de 7 a 10
// pontos de separacao, e o nivel medio nao andou mais que 0,8).
if (process.env.VARRER_SEMENTES) {
  for (const semente of [1, 7, 42, 123, 999, 2024, 31337, 8]) {
    const c = simular(`vc${semente}`, true, semente);
    const s = simular(`vs${semente}`, false, semente);
    console.log(semente, c.niveis.map((n) => n.toFixed(1)).join('->'), s.niveis[1].toFixed(1),
      c.correlacao.toFixed(3), s.correlacao.toFixed(3), c.separacao.toFixed(1), s.separacao.toFixed(1));
  }
  process.exit(0);
}

{
  const com = simular('com', true);
  const sem = simular('sem', false);
  const r = (n) => Math.round(n * 10) / 10;

  console.log(`     com a nota da sala: nivel ${com.niveis.map(r).join(' -> ')}, correlacao ${com.correlacao.toFixed(3)}, dificil - facil = ${r(com.separacao)}`);
  console.log(`     sem a nota da sala: nivel ${sem.niveis.map(r).join(' -> ')}, correlacao ${sem.correlacao.toFixed(3)}, dificil - facil = ${r(sem.separacao)}`);

  conferir('o nivel medio nao escorrega com o circulo', Math.abs(com.niveis[1] - com.niveis[0]) < 1.5, true);
  conferir('  e fica onde a conta antiga deixava', Math.abs(com.niveis[1] - sem.niveis[1]) < 2, true);
  conferir('a ordem das perguntas continua certa (correlacao > 0,95)', com.correlacao > 0.95, true);
  conferir('  e nao piora com a nota da sala', com.correlacao >= sem.correlacao - 0.01, true);
  conferir('dificil so com craques fica 10+ acima da facil so com novatos', com.separacao >= 10, true);
  conferir('  e e a nota da sala que separa (6+ a mais que sem ela)', com.separacao - sem.separacao >= 6, true);
}

/* ---------------- 4. Na sala: quem entra na conta ---------------- */
{
  // Craque de Geografia: 30 acertos em perguntas dificeis.
  for (let i = 0; i < 30; i++) {
    perfis.anotarRodada('cliente-craque', 'Craque', {
      acertou: true, ms: 4000, primeiro: true, dificuldade: 70, categoria: 'geografia', sequencia: 0, medeCategoria: true
    });
  }
  const sala = (modo) => {
    const s = new Sala('CIR1', { modo, categorias: ['geografia'], metaPontos: 999, segundosPorPergunta: 20 }, () => {}, () => {});
    s.entrar('c', 'Craque', 'cliente-craque');
    s.entrar('n', 'Nova', 'cliente-nova');
    s.entrar('t', 'Tardio', 'cliente-tardio');
    s.naRodada = new Set(['c', 'n']); // Tardio chegou com a pergunta no ar
    s.jogadores.get('n').acertos = 1; // so a Nova acertou
    return s;
  };

  const tempo = sala('tempo').salaDaRodada({ categoria: { id: 'geografia' } });
  conferir('Modo Tempo: entra quem viu a pergunta abrir', tempo.length, 2);
  conferir('  o craque leva a nota alta e firme', tempo[0].nota > 70 && tempo[0].confianca > 0.8, true);
  conferir('  a novata entra sem confianca', [tempo[1].nota, tempo[1].confianca], [50, 0]);
  conferir('  acertou e contado como no perfil', tempo.map((j) => j.acertou), [false, true]);
  conferir('Escalada (categoria de mentira) nao tem sala', sala('tempo').salaDaRodada({ categoria: { id: 'escalada' } }), null);
  conferir('leilao nao tem sala', sala('presente-grego').salaDaRodada({ categoria: { id: 'geografia' } }), null);
}

/* ---------------- 5. O painel do perfil ---------------- */
{
  const quem = 'cliente-painel';
  const rodada = (acertou, dif, categoria) => perfis.anotarRodada(quem, 'Paula', {
    acertou, ms: 5000, primeiro: false, dificuldade: dif, categoria, sequencia: 0, medeCategoria: true
  });

  // Partida 1: cinema, 6 rodadas faceis acertadas e 2 dificeis erradas.
  for (let i = 0; i < 6; i++) rodada(true, 20, 'cinema');
  rodada(false, 80, 'cinema');
  rodada(false, 80, 'cinema');
  perfis.fimDePartida(quem, 'Paula', { venceu: false, pontos: 30 });

  // Partida 2: historia, 5 erradas na media.
  for (let i = 0; i < 5; i++) rodada(false, 45, 'historia');
  perfis.fimDePartida(quem, 'Paula', { venceu: false, pontos: 0 });

  // Partida so de leilao: nenhuma rodada medida, nenhuma foto.
  perfis.fimDePartida(quem, 'Paula', { venceu: true, pontos: 50 });

  const p = perfis.verPerfil(quem);
  conferir('geral soma as duas categorias', [p.geral.rodadas, p.geral.acertos, p.geral.aproveitamento], [13, 6, 46]);
  conferir('uma foto por partida com rodada medida', p.geral.historico.length, 2);
  conferir('a ultima foto e a nota de agora', p.geral.historico[1].nota, p.geral.nota);
  conferir('variacao geral: o quanto a ultima partida mexeu', p.geral.variacao < 0, true);
  conferir('Cinema tem a foto da partida em que jogou, Historia a dela',
    p.desempenho.map((l) => [l.id, l.historico.length]).sort(), [['cinema', 1], ['historia', 1]]);

  const faixas = Object.fromEntries(p.geral.porNivel.map((n) => [n.nivel, [n.rodadas, n.aproveitamento]]));
  conferir('acerto por faixa de dificuldade', faixas,
    { 'Fácil': [6, 100], 'Média': [5, 0], 'Difícil': [0, null], 'Muito difícil': [2, 0] });
  const facil = p.geral.porNivel[0];
  conferir('  com o que a nota esperava ao lado', facil.esperado > 50 && facil.esperado < 100, true);
  conferir('ponto forte e ponto fraco', p.destaques, { forte: 'cinema', fraco: 'historia' });

  // Perfil gravado antes da nota geral existir: ela nasce das categorias.
  const antigo = perfis.normalizarPerfil({
    partidas: 3,
    porCategoria: {
      cinema: { rodadas: 10, acertos: 6, nota: 60, somaDificuldade: 400 },
      musica: { rodadas: 30, acertos: 12, nota: 40, somaDificuldade: 1500 }
    }
  });
  conferir('perfil antigo: a geral vem das categorias',
    [antigo.geral.rodadas, antigo.geral.acertos, antigo.geral.nota], [40, 18, 45]);
  conferir('perfil antigo: historico comeca vazio', antigo.historico, []);

  // Login: a linha do tempo dos dois aparelhos vira uma so.
  for (let i = 0; i < 5; i++) {
    perfis.anotarRodada('cliente-celular', 'Paula', {
      acertou: true, ms: 3000, primeiro: true, dificuldade: 60, categoria: 'cinema', sequencia: 0, medeCategoria: true
    });
  }
  perfis.fimDePartida('cliente-celular', 'Paula', { venceu: true, pontos: 50 });
  perfis.entrarComConta(quem, 'g:paula', 'Paula');
  perfis.entrarComConta('cliente-celular', 'g:paula', 'Paula');
  const conta = perfis.verPerfil(quem);
  conferir('login: a geral soma os dois aparelhos', conta.geral.rodadas, 18);
  conferir('login: as fotos dos dois entram em ordem', conta.geral.historico.length, 3);
  conferir('login: faixas de dificuldade somadas', conta.geral.porNivel[2].rodadas, 5);
}

require('fs').rmSync(process.env.PERFIS_ARQUIVO, { force: true });
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
