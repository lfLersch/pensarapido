'use strict';

/*
 * A Bagunca: todos os modos numa partida so.
 *
 * Entre um sorteio e outro a sala joga o Modo Tempo — 3 perguntas, se o lider
 * nao mexer —, e o sorteio escolhe o modo da rodada seguinte entre os que
 * ficaram marcados. Aqui: o ritmo das rodadas, os modos em equipe so a partir
 * de 4 na sala, so sai o que foi marcado, o mesmo modo nao sai duas vezes
 * seguidas, as equipes sorteadas e a musica que nao vaza para o Modo Tempo.
 */

const { Sala, MODOS, MODOS_SORTEAVEIS, configDaBagunca } = require('../server/sala.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(66), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

const NOMES = ['ana', 'bia', 'caio', 'duda', 'elis', 'fabio', 'gil', 'hugo'];
const EM_EQUIPE = MODOS.filter((m) => m.equipes && m.disponivel).map((m) => m.id);

/** Uma sala da Bagunca com o relogio na mao do teste, ja na primeira rodada. */
function montar(quantos, config = {}) {
  const eventos = [];
  const sala = new Sala('BAG1', Object.assign({
    modo: 'bagunca', categorias: ['geografia'], subs: [], fora: [],
    metaPontos: 9999, segundosPorPergunta: 20, limiteMusica: 30
  }, config), (evento, dados) => eventos.push({ evento, dados }), () => {});
  sala.agendado = null;
  sala.agendar = (fn, ms) => { sala.agendado = { fn, ms }; };
  sala.limparTemporizador = () => { sala.agendado = null; };
  for (let i = 0; i < quantos; i++) sala.entrar(NOMES[i], NOMES[i]);
  sala.iniciar();
  // Com 0 perguntas ate o sorteio a partida ja abre sorteando.
  if (sala.estado === 'sorteio') sala.agendado.fn();
  return { sala, eventos };
}

/**
 * Leva a sala ate a tela da proxima rodada e devolve o modo dela. A rodada no
 * ar e pulada (vale em qualquer modo, ate no meio do leilao); se cair num
 * sorteio, ele roda e a rodada sorteada abre.
 */
function proxima(sala) {
  if (sala.estado !== 'sorteio') {
    sala.pularRodada();
    sala.agendado.fn();
  }
  if (sala.estado === 'sorteio') sala.agendado.fn();
  return sala.modo;
}

/** O modo das proximas `n` rodadas, contando a que ja esta na tela. */
function ritmo(sala, n) {
  const modos = [sala.modo];
  while (modos.length < n) modos.push(proxima(sala));
  return modos;
}

/* ---------------- 1. O modo existe e o que a roleta pode sortear ---------------- */
{
  const bagunca = MODOS.find((m) => m.id === 'bagunca');
  conferir('a Bagunca esta na lista de modos, disponivel', Boolean(bagunca && bagunca.disponivel), true);
  conferir('a roleta nao sorteia a propria Bagunca', MODOS_SORTEAVEIS.includes('bagunca'), false);
  conferir('  nem o Modo Tempo, que ja e o recheio', MODOS_SORTEAVEIS.includes('tempo'), false);
  conferir('  nem modo que ainda nao existe', MODOS_SORTEAVEIS.includes('equipes'), false);
  conferir('  e sorteia todos os outros',
    MODOS_SORTEAVEIS.length, MODOS.filter((m) => m.disponivel).length - 2);
}

/* ---------------- 2. A configuracao conferida ---------------- */
{
  conferir('sem dizer nada: 3 perguntas, todos os modos e 6s para ler a regra',
    configDaBagunca({}), { perguntasAteSorteio: 3, modosBagunca: MODOS_SORTEAVEIS, segundosSorteio: 6, pausarModoNovo: false });
  conferir('o tempo da regra vale o que o lider escolheu',
    configDaBagunca({ segundosSorteio: 20 }).segundosSorteio, 20);
  conferir('  e fora da lista volta para 6',
    configDaBagunca({ segundosSorteio: 3 }).segundosSorteio, 6);
  conferir('quantas perguntas ate o sorteio vale o que o lider escolheu',
    configDaBagunca({ perguntasAteSorteio: 5 }).perguntasAteSorteio, 5);
  conferir('  zero tambem vale: toda rodada e sorteada',
    configDaBagunca({ perguntasAteSorteio: 0 }).perguntasAteSorteio, 0);
  conferir('  e numero fora da lista volta para 3',
    configDaBagunca({ perguntasAteSorteio: 99 }).perguntasAteSorteio, 3);
  conferir('so ficam os modos marcados, sem repetir e sem os que nao existem',
    configDaBagunca({ modosBagunca: ['veni', 'xyz', 'veni', 'tempo', 'escalada'] }).modosBagunca,
    ['escalada', 'veni']);
  conferir('nenhum modo marcado e recusado', Boolean(configDaBagunca({ modosBagunca: [] }).erro), true);
}

/* ---------------- 3. O ritmo: Modo Tempo, sorteio, Modo Tempo ---------------- */
{
  const { sala } = montar(3, { perguntasAteSorteio: 3, modosBagunca: ['veni'] });
  conferir('3 perguntas do Modo Tempo e a quarta e a sorteada, sem parar',
    ritmo(sala, 12),
    ['tempo', 'tempo', 'tempo', 'veni', 'tempo', 'tempo', 'tempo', 'veni', 'tempo', 'tempo', 'tempo', 'veni']);
  sala.destruir();

  const um = montar(2, { perguntasAteSorteio: 1, modosBagunca: ['veni'] });
  conferir('com 1 pergunta ate o sorteio, um e outro',
    ritmo(um.sala, 6), ['tempo', 'veni', 'tempo', 'veni', 'tempo', 'veni']);
  um.sala.destruir();

  const zero = montar(2, { perguntasAteSorteio: 0, modosBagunca: ['veni', 'ranking'] });
  zero.eventos.length = 0;
  // Sem Modo Tempo no meio, ele entra na roleta como mais um modo.
  const sorteadas = ritmo(zero.sala, 30);
  conferir('com 0, toda rodada e sorteada e o Modo Tempo entra na roleta',
    [...new Set(sorteadas)].sort(), ['ranking', 'tempo', 'veni']);
  conferir('  com tela de sorteio antes de cada uma, Modo Tempo inclusive',
    zero.eventos.filter((e) => e.evento === 'bagunca:sorteio').length, 29);
  zero.sala.destruir();
}

/* ---------------- 4. O sorteio na tela ---------------- */
{
  const { sala, eventos } = montar(3, { perguntasAteSorteio: 1, modosBagunca: ['veni', 'escalada'] });
  proxima(sala);
  const sorteio = eventos.find((e) => e.evento === 'bagunca:sorteio');
  conferir('o sorteio avisa a sala antes da rodada', Boolean(sorteio), true);
  conferir('  com o modo que saiu', sorteio.dados.modo.id, sala.modo);
  conferir('  a roleta com o que podia sair', sorteio.dados.roleta.map((m) => m.id).sort(), ['escalada', 'veni']);
  conferir('  e a rodada seguinte', sorteio.dados.rodada, 2);
  conferir('  a tela fica 6s sem o lider mexer', sorteio.dados.duracaoMs, 6000);

  const categorias = eventos.filter((e) => e.evento === 'rodada:categoria');
  conferir('a tela da categoria diz de que modo e a rodada',
    categorias.map((e) => e.dados.modo), ['tempo', sala.modo]);
  conferir('  e no Modo Tempo, quanto falta para o sorteio',
    categorias.map((e) => e.dados.bagunca.pergunta), [1, null]);
  sala.destruir();

  // Com mais tempo para ler a regra, a tela e a espera da rodada crescem juntas.
  const lenta = montar(3, { perguntasAteSorteio: 1, modosBagunca: ['veni'], segundosSorteio: 20 });
  lenta.sala.pularRodada();
  lenta.sala.agendado.fn();
  const sorteioLento = lenta.eventos.find((e) => e.evento === 'bagunca:sorteio');
  conferir('com 20s escolhidos, a tela do sorteio diz 20s', sorteioLento.dados.duracaoMs, 20000);
  conferir('  e a rodada so comeca depois deles',
    [lenta.sala.estado, lenta.sala.agendado.ms], ['sorteio', 20000]);
  lenta.sala.destruir();
}

/* ---------------- 4b. Pausar quando sai um modo novo ---------------- */
{
  conferir('a pausa no modo novo vem desligada', configDaBagunca({}).pausarModoNovo, false);

  const { sala, eventos } = montar(3, { perguntasAteSorteio: 1, modosBagunca: ['veni'], pausarModoNovo: true });
  const lider = NOMES[0];
  sala.pularRodada();
  sala.agendado.fn();
  conferir('modo novo: a roleta gira antes de pausar', [sala.estado, sala.agendado.ms, Boolean(sala.pausa)], ['sorteio', 2500, false]);
  sala.agendado.fn();
  const pausa = eventos.filter((e) => e.evento === 'sala:pausa').pop();
  conferir('  e a sala para, com a regra do modo na pausa',
    [Boolean(sala.pausa), pausa.dados.pausado, pausa.dados.modo.id, Boolean(pausa.dados.modo.descricao)],
    [true, true, 'veni', true]);
  conferir('  ninguem fora o lider continua', Boolean(sala.continuar(NOMES[1]).erro), true);
  sala.continuar(lider);
  sala.agendado.fn();
  conferir('  o lider continua e a rodada do modo comeca', [sala.estado !== 'sorteio', sala.modo], [true, 'veni']);

  // A segunda vez do mesmo modo ja e conhecida: a roleta nao para o jogo.
  proxima(sala);
  sala.pularRodada();
  sala.agendado.fn();
  conferir('o mesmo modo de novo nao pausa', [sala.estado, sala.agendado.ms, Boolean(sala.pausa)], ['sorteio', 6000, false]);
  sala.destruir();
}

/* ---------------- 5. Modo em equipe so a partir de 4 ---------------- */
{
  const visto = (quantos) => {
    const { sala } = montar(quantos, { perguntasAteSorteio: 0 });
    const modos = new Set(ritmo(sala, 160));
    sala.destruir();
    return modos;
  };

  const tres = visto(3);
  conferir('com 3 na sala nenhum modo em equipe sai', EM_EQUIPE.filter((m) => tres.has(m)), []);
  conferir('  e o resto sai todo',
    MODOS_SORTEAVEIS.filter((m) => !EM_EQUIPE.includes(m) && !tres.has(m)), []);

  const quatro = visto(4);
  conferir('com 4 os modos em equipe entram no sorteio', EM_EQUIPE.filter((m) => quatro.has(m)), EM_EQUIPE);

  const sozinho = visto(1);
  conferir('sozinho na sala o Leilao Geral tambem fica fora', sozinho.has('leilao-geral'), false);
}

/* ---------------- 6. Nenhum modo cabe: segue o Modo Tempo ---------------- */
{
  const { sala, eventos } = montar(3, { perguntasAteSorteio: 1, modosBagunca: ['presente-grego'] });
  conferir('so modo em equipe marcado e 3 na sala: so Modo Tempo',
    ritmo(sala, 5), ['tempo', 'tempo', 'tempo', 'tempo', 'tempo']);
  conferir('  e a sala fica sabendo por que',
    eventos.some((e) => e.evento === 'chat:mensagem' && /Nenhum modo/.test(e.dados.texto || '')), true);
  conferir('  sem tela de sorteio', eventos.some((e) => e.evento === 'bagunca:sorteio'), false);
  sala.destruir();
}

/* ---------------- 7. So sai o que foi marcado, e nunca duas vezes seguidas ---------------- */
{
  const { sala } = montar(3, { perguntasAteSorteio: 0, modosBagunca: ['veni', 'ranking', 'escalada'] });
  const modos = ritmo(sala, 60);
  conferir('so saem os modos marcados (e o Modo Tempo, com 0 perguntas)',
    [...new Set(modos)].filter((m) => !['veni', 'ranking', 'escalada', 'tempo'].includes(m)), []);
  conferir('o mesmo modo nunca sai duas vezes seguidas',
    modos.some((m, i) => i > 0 && m === modos[i - 1]), false);
  sala.destruir();

  const unico = montar(2, { perguntasAteSorteio: 0, modosBagunca: ['veni'] });
  const alterna = ritmo(unico.sala, 6);
  conferir('com um modo so marcado e 0 perguntas, ele alterna com o Modo Tempo',
    [new Set(alterna).size, alterna.some((m, i) => i > 0 && m === alterna[i - 1])], [2, false]);
  unico.sala.destruir();

  const soUm = montar(2, { perguntasAteSorteio: 1, modosBagunca: ['veni'] });
  const sorteados = ritmo(soUm.sala, 6).filter((m) => m !== 'tempo');
  conferir('com um modo so marcado, o sorteio repete ele', sorteados, ['veni', 'veni', 'veni']);
  soUm.sala.destruir();
}

/* ---------------- 8. As equipes saem do sorteio ---------------- */
{
  const equipesDe = (quantos, modo) => {
    // Com 1 pergunta ate o sorteio: com 0 o Modo Tempo tambem entraria na roleta.
    const { sala, eventos } = montar(quantos, { perguntasAteSorteio: 1, modosBagunca: [modo] });
    sala.pularRodada();
    sala.agendado.fn();
    const sorteio = eventos.find((e) => e.evento === 'bagunca:sorteio');
    const tamanhos = sala.equipes.map((e) => e.jogadores.length).sort().reverse();
    const todos = sala.equipes.flatMap((e) => e.jogadores).sort();
    const nomes = sorteio.dados.equipes.map((e) => e.nome);
    sala.destruir();
    return { tamanhos, todos, nomes, naTela: sorteio.dados.equipes.length };
  };

  const presente = equipesDe(5, 'presente-grego');
  conferir('Presente Grego: duas equipes dividindo a sala', presente.tamanhos, [3, 2]);
  conferir('  com todo mundo em alguma', presente.todos, NOMES.slice(0, 5).sort());
  conferir('  e a tela do sorteio mostra as equipes', presente.naTela, 2);

  conferir('Dando dicas com 4: duas duplas', equipesDe(4, 'dando-dicas').tamanhos, [2, 2]);
  const dicas = equipesDe(5, 'dando-dicas');
  conferir('Dando dicas com 5: uma dupla e um trio', dicas.tamanhos, [3, 2]);
  conferir('  e o trio vira equipe no nome', dicas.nomes, ['Equipe 1', 'Equipe 2']);
  conferir('Dando dicas com 8: quatro duplas', equipesDe(8, 'dando-dicas').tamanhos, [2, 2, 2, 2]);

  // As equipes da rodada sao outras a cada sorteio.
  const { sala } = montar(8, { perguntasAteSorteio: 0, modosBagunca: ['presente-grego', 'veni'] });
  const formacoes = new Set();
  for (let i = 0; i < 40; i++) {
    if (sala.modo === 'presente-grego') formacoes.add(JSON.stringify(sala.equipes.map((e) => [...e.jogadores].sort())));
    proxima(sala);
  }
  conferir('as equipes mudam de um sorteio para o outro', formacoes.size > 1, true);
  sala.destruir();
}

/* ---------------- 9. A rodada sorteada joga como o modo dela ---------------- */
{
  // Escalada: na Bagunca nao tem numero — 30s para lembrar o maximo que der.
  const esc = montar(2, { perguntasAteSorteio: 1, modosBagunca: ['escalada'] });
  const escaladas = [];
  const noTempo = new Set();
  for (let i = 0; i < 8; i++) {
    proxima(esc.sala);
    const p = esc.sala.perguntaAtual;
    if (esc.sala.modo === 'escalada') escaladas.push([p.livre, p.necessarias === p.itens.length, esc.sala.duracaoDaRodada()]);
    else noTempo.add(p.necessarias);
  }
  conferir('Escalada sorteada e livre: pede a lista inteira, em 30s', escaladas[0], [true, true, 30000]);
  conferir('  e o enunciado nao tem numero', /^Cite o maximo de /.test(esc.sala.perguntaAtual.pergunta) || esc.sala.modo !== 'escalada', true);
  conferir('  e o Modo Tempo do meio continua pedindo uma', [...noTempo], [1]);
  esc.sala.destruir();

  // Mais ou Menos Pontos: a lista abre e fecha na mesma rodada.
  const rank = montar(2, { perguntasAteSorteio: 1, modosBagunca: ['ranking'] });
  const listas = [];
  for (let i = 0; i < 6; i++) {
    proxima(rank.sala);
    if (rank.sala.modo === 'ranking') listas.push(rank.sala.perguntaAtual.id);
  }
  conferir('Mais ou Menos Pontos sorteado troca de lista a cada vez', new Set(listas).size, listas.length);
  conferir('  e numa volta so', rank.sala.voltasRanking(), 1);
  rank.sala.destruir();

  // Carrossel: sem numero de voltas, gira ate sobrar um.
  const car = montar(3, { perguntasAteSorteio: 1, modosBagunca: ['carrossel'] });
  proxima(car.sala);
  conferir('Carrossel sorteado gira ate sobrar um', [car.sala.modo, car.sala.voltasAlvo], ['carrossel', null]);
  car.sala.destruir();
}

/* ---------------- 10. A musica sorteada nao vaza para o Modo Tempo ---------------- */
{
  const { sala } = montar(2, { perguntasAteSorteio: 1, modosBagunca: ['corrida', 'qual-musica'] });
  let musicas = 0;
  let semAudio = 0;
  let audioNoTempo = 0;
  for (let i = 0; i < 30; i++) {
    const modo = proxima(sala);
    if (modo === 'tempo') {
      if (sala.perguntaAtual.audio || sala.perguntaAtual.categoria.id !== 'geografia') audioNoTempo++;
    } else {
      musicas++;
      if (!sala.perguntaAtual.audio) semAudio++;
    }
  }
  conferir('a rodada musical toca musica sem a categoria marcada', [musicas > 0, semAudio], [true, 0]);
  conferir('  e o Modo Tempo continua so na categoria marcada', audioNoTempo, 0);
  conferir('  e Ouvir musicas nao entra nas filas das categorias', sala.filas.has('ouvir'), false);
  sala.destruir();
}

/* ---------------- 11. O fim e de cada um ---------------- */
{
  const { sala, eventos } = montar(4, { perguntasAteSorteio: 0, modosBagunca: ['presente-grego'], metaPontos: 20 });
  // A rodada em equipe esta no ar, e alguem bate a meta.
  sala.jogadores.get('ana').pontos = 25;
  sala.pularRodada();
  sala.agendado.fn();
  const fim = eventos.find((e) => e.evento === 'jogo:fim');
  conferir('a partida acaba pela meta', Boolean(fim), true);
  conferir('  e o placar final nao carrega a equipe da ultima rodada',
    fim.dados.placar.some((j) => j.equipe), false);

  sala.voltarAoLobby();
  conferir('de volta ao saguao a sala volta a ser a Bagunca', sala.modo, 'bagunca');
  conferir('  e os botoes de equipe nao valem para ela',
    Boolean(sala.mudarFormato('ana', 'equipes', 1).erro), true);
  sala.destruir();
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
