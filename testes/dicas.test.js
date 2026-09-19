'use strict';

/*
 * Modo Dando dicas: leilao AO CONTRARIO, jogado em duplas.
 *
 * Uma metade de cada dupla ve a mesma palavra secreta e leiloa em quantas
 * dicas faz a outra metade acertar. O lance DESCE ate todo mundo passar; quem
 * ficou tem que entregar, uma palavra por dica. A rodada paga sempre o mesmo,
 * custe uma dica ou dez — o que se disputa e a rodada, nao a dica.
 */

const { Sala } = require('../server/sala.js');
const { normalizar } = require('../server/comparar.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(54), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

const NOMES = ['Ana', 'Bia', 'Caio', 'Duda', 'Elis', 'Fabio'];

function montarSala(quantos = 4) {
  const eventos = [];
  const privados = [];
  const sala = new Sala(
    'DD01',
    { categorias: ['geografia'], subs: [], fora: [], modo: 'dando-dicas', metaPontos: 9999, segundosPorPergunta: 20 },
    (evento, dados) => eventos.push({ evento, dados }),
    (para, evento, dados) => privados.push({ para, evento, dados })
  );
  for (let i = 0; i < quantos; i++) sala.entrar(NOMES[i].toLowerCase(), NOMES[i]);
  return { sala, eventos, privados };
}

/** Sala ja com o leilao da rodada 1 aberto e sem temporizadores soltos. */
function novaSala(quantos = 4) {
  const tudo = montarSala(quantos);
  tudo.sala.iniciar();
  tudo.sala.limparTemporizador();
  tudo.sala.mostrarPergunta();   // categoria -> leilao
  tudo.sala.limparTemporizador();
  return tudo;
}

/** Quem esta com a palavra no leilao. */
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

/**
 * O que a dupla da vez esta vendo agora.
 *
 * `avancarLance` ja mexeu a vez, mas deixa o aviso para um temporizador que o
 * teste corta — entao aqui a vez e aberta na mao, so para ler o payload.
 */
function vezAtual(sala, eventos) {
  sala.abrirLance();
  sala.limparTemporizador();
  return eventos.filter((e) => e.evento === 'leilao:vez').pop().dados;
}

/**
 * Troca a palavra sorteada por uma conhecida.
 *
 * O banco entrega tanto `Roma` quanto `Mar Morto`, e as regras da dica caem
 * em ramos diferentes conforme a palavra tenha uma parte ou duas. Plantando o
 * alvo, o teste mede a regra e nao o sorteio.
 */
function plantar(sala, palavra) {
  sala.perguntaAtual.resposta = palavra;
  sala.perguntaAtual.segredo = palavra;
  sala.perguntaAtual.aceita = [];
  sala.perguntaAtual.itens = [{ oficial: palavra, variantes: [] }];
  return palavra;
}

/** Leva a rodada ate a entrega, com o lance combinado. */
function ateAEntrega(quantos, lance, palavra) {
  const tudo = novaSala(quantos);
  if (palavra) plantar(tudo.sala, palavra);
  const dono = apostar(tudo.sala, lance).quem;
  // Todas as outras duplas passam: no reverso nao ha duvido.
  while (tudo.sala.leilaoAberto()) passar(tudo.sala);
  tudo.sala.mostrarPergunta();
  tudo.sala.limparTemporizador();
  return { ...tudo, dono };
}

/** Manda um texto por alguem, sem esbarrar no anti-spam. */
function falar(sala, socketId, texto) {
  sala.jogadores.get(socketId).ultimaMensagem = 0;
  const r = sala.palpitar(socketId, texto);
  sala.limparTemporizador();
  return r;
}

/* ---------------- Quem pode comecar a partida ---------------- */
{
  const { sala } = montarSala(2);
  conferir('duas pessoas deixam uma dupla sozinha',
    /sozinha/.test(sala.iniciar().erro || ''), true);
  sala.destruir();

  // Impar sobra: a sala abre uma dupla nova e a quinta pessoa fica sem par.
  const { sala: impar } = montarSala(5);
  conferir('sala impar deixa alguem sem par',
    /sozinha/.test(impar.iniciar().erro || ''), true);
  conferir('  porque a sala abriu uma terceira dupla',
    impar.equipes.map((d) => d.jogadores.length), [2, 2, 1]);
  // O jeito de destravar e o + de baixo: duplas viram trios.
  conferir('  o lider aumenta o tamanho', Boolean(impar.mudarFormato('ana', 'tamanho', 1).ok), true);
  impar.trocarEquipe(impar.equipes[2].jogadores[0], 'e1');
  conferir('  e o que sobrava entra num trio',
    impar.equipes.map((d) => d.jogadores.length), [3, 2, 0]);
  conferir('  ai a partida comeca', impar.iniciar().ok, true);
  impar.limparTemporizador();
  impar.destruir();

  const { sala: par } = montarSala(4);
  conferir('quatro jogadores comecam', par.iniciar().ok, true);
  par.limparTemporizador();
  conferir('  e caem de dois em dois',
    par.equipes.map((d) => d.jogadores.length), [2, 2]);
  par.destruir();
}

/* ---------------- As duplas na sala de espera ---------------- */
{
  const { sala } = montarSala(4);
  conferir('a dupla tem teto de dois', sala.tetoEquipe(), 2);
  conferir('a sala fica com as duas duplas cheias', sala.estadoPublico().equipes.length, 2);
  conferir('  e elas se chamam Dupla enquanto forem de dois',
    sala.equipes.map((d) => d.nome), ['Dupla 1', 'Dupla 2']);

  // Quem entra cai na dupla menor, entao as duas ja estao cheias: ninguem da
  // segunda consegue se mudar para a primeira.
  const daOutraDupla = sala.equipes[1].jogadores[0];
  conferir('dupla cheia recusa quem vem da outra',
    /cheia/.test(sala.trocarEquipe(daOutraDupla, 'e1').erro || ''), true);
  sala.destruir();

  // O Dando dicas cresce abrindo duplas, nao engordando as que ja existem:
  // mais gente no leilao e mais lance na mesa.
  const { sala: cheia } = montarSala(6);
  conferir('seis jogadores formam tres duplas',
    cheia.equipes.map((d) => d.jogadores.length), [2, 2, 2]);
  cheia.destruir();
}

/* ---------------- A palavra secreta ---------------- */
{
  const { sala, eventos, privados } = novaSala(4);

  const comASenha = privados.filter((p) => p.evento === 'leilao:pergunta');
  conferir('o segredo vai so para quem leiloa', comASenha.length, 2);
  conferir('  e e a palavra, nao o enunciado',
    comASenha.every((p) => p.dados.segredo === sala.perguntaAtual.resposta), true);

  const leiloeiros = sala.leilao.equipes.map((id) => sala.leiloeiroDe(sala.equipePorId(id)));
  conferir('quem leiloa nao e quem adivinha',
    sala.leilao.equipes.every((id) => {
      const dupla = sala.equipePorId(id);
      return sala.leiloeiroDe(dupla) !== sala.respondedorDe(dupla);
    }), true);
  conferir('  e o segredo nao chega a quem adivinha',
    comASenha.every((p) => leiloeiros.includes(p.para)), true);

  const comeco = eventos.find((e) => e.evento === 'leilao:comeco').dados;
  conferir('a tela sabe que o leilao e ao contrario', comeco.reverso, true);
  conferir('  e que o teto e de 10 dicas', comeco.maxAposta, 10);
  conferir('a categoria de verdade fica escondida',
    sala.perguntaAtual.categoria.id, 'dando-dicas');
  sala.destruir();
}

/* ---------------- O lance desce ---------------- */
{
  const { sala, eventos } = novaSala(4);

  conferir('nao da para passar antes do primeiro lance',
    /quem abre o leilao tem que apostar/i.test(passar(sala).erro || ''), true);
  conferir('duvido nao existe neste modo',
    /nao ha duvido/i.test(sala.duvidar(daVez(sala)).erro || ''), true);

  const abertura = apostar(sala, 6);
  conferir('o primeiro lance entra', abertura.aposta, 6);
  conferir('  e cobrir por cima nao vale',
    /menor que 6/.test(sala.apostar(daVez(sala), 7).erro || ''), true);
  conferir('  nem empatar', /menor que 6/.test(sala.apostar(daVez(sala), 6).erro || ''), true);
  sala.limparTemporizador();

  const corte = apostar(sala, 3);
  conferir('cobrir e prometer menos', corte.aposta, 3);
  conferir('  e o chao e uma dica', /minimo e uma dica/.test(sala.apostar(daVez(sala), 0).erro || ''), true);
  sala.limparTemporizador();

  const vez = vezAtual(sala, eventos);
  conferir('a vez diz ate onde da para descer', [vez.minimo, vez.maximo], [1, 2]);

  passar(sala);
  conferir('sobrou uma dupla: o leilao fecha nela',
    [sala.leilao.fechado, sala.leilao.aposta], [true, 3]);
  conferir('  quem prometeu e quem vai dicar', sala.leilao.quemApostou, corte.quem);
  conferir('  e a rodada continua pedindo uma palavra so',
    sala.perguntaAtual.necessarias, 1);
  sala.destruir();
}

/* ---------------- Lance de uma dica nao tem como ser coberto ---------------- */
{
  const { sala, eventos } = novaSala(6);
  apostar(sala, 1);

  const vez = vezAtual(sala, eventos);
  conferir('com 1 na mesa nao ha lance possivel',
    [vez.podeApostar, vez.podePassar], [false, true]);
  conferir('  e o servidor recusa mesmo assim',
    /menor que 1/.test(sala.apostar(daVez(sala), 1).erro || ''), true);
  sala.limparTemporizador();
  sala.destruir();
}

/* ---------------- Deixar o tempo acabar ---------------- */
{
  const { sala } = novaSala(4);
  const abridor = sala.leilao.equipes[sala.leilao.vez];
  sala.lanceNoTempo(abridor);
  sala.limparTemporizador();
  conferir('quem abre calado abre no teto de dicas', sala.leilao.aposta, 10);

  const seguinte = sala.leilao.equipes[sala.leilao.vez];
  sala.lanceNoTempo(seguinte);
  sala.limparTemporizador();
  conferir('  e quem nao cobre a tempo sai do leilao',
    [sala.leilao.fora.includes(seguinte), sala.leilao.fechado], [true, true]);
  sala.destruir();
}

/* ---------------- A entrega: uma palavra por dica ---------------- */
{
  const { sala, eventos } = ateAEntrega(4, 3, 'Girassol');
  const dicador = sala.leilao.quemApostou;
  const adivinha = sala.leilao.respondedor;
  const plateia = [...sala.jogadores.keys()].find((id) => id !== dicador && id !== adivinha);

  conferir('a mesa nao entra na conversa',
    /So a dupla que levou o leilao/.test(falar(sala, plateia, 'oi').erro || ''), true);
  conferir('dica com duas palavras nao vale',
    /uma palavra so/.test(falar(sala, dicador, 'lugar grande').erro || ''), true);
  conferir('a propria resposta nao vale de dica',
    /entrega a resposta/.test(falar(sala, dicador, 'girassol').erro || ''), true);
  // A regra vale nos dois sentidos: a dica dentro da resposta e a resposta
  // dentro da dica.
  conferir('  nem um pedaco dela',
    /entrega a resposta/.test(falar(sala, dicador, 'girass').erro || ''), true);
  conferir('  nem uma palavra que a contenha',
    /entrega a resposta/.test(falar(sala, dicador, 'girassolzinho').erro || ''), true);
  conferir('  e a recusada nao gasta dica', sala.leilao.dicasUsadas.length, 0);

  const primeira = falar(sala, dicador, 'quentinho');
  conferir('a dica entra', [primeira.veredito, primeira.quantas, primeira.restam], ['dica', 1, 2]);
  const naMesa = eventos.filter((e) => e.evento === 'dicas:nova').pop().dados;
  conferir('  e vai para a mesa inteira', [naMesa.dica, naMesa.indice, naMesa.total],
    ['quentinho', 1, 3]);

  conferir('chute torto vira mensagem de chat, para o dicador ouvir',
    falar(sala, adivinha, 'abacaxi com farinha').veredito, 'chat');

  falar(sala, dicador, 'longe');
  falar(sala, dicador, 'perto');
  conferir('a quarta dica esbarra no lance',
    /dicas acabaram/.test(falar(sala, dicador, 'sobrou').erro || ''), true);
  conferir('  e o gasto para no prometido', sala.leilao.dicasUsadas.length, 3);
  sala.destruir();
}

/* ---------------- Acertou: a dupla leva a rodada ---------------- */
{
  const { sala, eventos } = ateAEntrega(4, 5);
  const dicador = sala.leilao.quemApostou;
  const adivinha = sala.leilao.respondedor;
  const palavra = sala.perguntaAtual.resposta;

  falar(sala, dicador, 'primeira');
  conferir('quem da as dicas nao adivinha pelo parceiro',
    falar(sala, dicador, palavra).erro ? 'recusado' : 'passou', 'recusado');

  conferir('o parceiro acerta', falar(sala, adivinha, palavra).veredito, 'certo');
  conferir('  e a rodada guarda em que dica foi', sala.leilao.acertouEm, 1);

  sala.encerrarRodada();
  sala.limparTemporizador();

  const dupla = sala.equipePorId(sala.leilao.equipeAposta);
  const daDupla = dupla.jogadores.map((id) => sala.jogadores.get(id).pontos);
  const deFora = [...sala.jogadores.values()]
    .filter((j) => !dupla.jogadores.includes(j.id)).map((j) => j.pontos);
  conferir('a dupla inteira leva os 10 da rodada', daDupla, [10, 10]);
  conferir('  e a outra dupla nao leva nada', deFora, [0, 0]);
  conferir('  uma dica gasta de cinco paga o mesmo',
    [sala.leilao.ditas, sala.leilao.premio], [1, 10]);

  const resultado = eventos.filter((e) => e.evento === 'rodada:resultado').pop().dados;
  conferir('o resultado conta as dicas gastas', resultado.dicasDadas, ['primeira']);
  conferir('  e diz o papel de cada um',
    resultado.detalhes.map((d) => d.papel).sort(),
    ['adivinhou', 'dicou', 'passou', 'passou']);
  sala.destruir();
}

/* ---------------- Nao saiu: a rodada vai para as outras duplas ---------------- */
{
  const { sala } = ateAEntrega(6, 2);
  const dupla = sala.equipePorId(sala.leilao.equipeAposta);

  sala.encerrarRodada();
  sala.limparTemporizador();

  conferir('quem prometeu demais fica a zero',
    dupla.jogadores.map((id) => sala.jogadores.get(id).pontos), [0, 0]);
  conferir('  e as outras duas duplas levam 10 cada',
    [...sala.jogadores.values()].filter((j) => !dupla.jogadores.includes(j.id))
      .map((j) => j.pontos), [10, 10, 10, 10]);
  conferir('  o premio nao depende do lance', sala.resumoDoPresente().premio, 10);
  sala.destruir();
}

/* ---------------- O relogio cresce com o que foi prometido ---------------- */
{
  const curta = ateAEntrega(4, 1);
  const longa = ateAEntrega(4, 8);
  conferir('uma dica da 24s', curta.sala.duracaoDaRodada(), 24000);
  conferir('oito dicas dao 87s', longa.sala.duracaoDaRodada(), 87000);
  curta.sala.destruir();
  longa.sala.destruir();
}

/* ---------------- A palavra nunca vaza para a mesa ---------------- */
{
  const { sala, eventos } = ateAEntrega(4, 2, 'Girassol');
  const palavra = normalizar(sala.perguntaAtual.resposta);

  const publicos = eventos.filter((e) => e.evento !== 'rodada:resultado');
  const vazou = publicos.filter((e) => normalizar(JSON.stringify(e.dados)).includes(palavra));
  conferir('nenhum evento publico carrega a palavra', vazou.map((e) => e.evento), []);

  const pergunta = eventos.filter((e) => e.evento === 'rodada:pergunta').pop().dados;
  conferir('a rodada abre sem mascara da palavra', pergunta.mascara, null);
  conferir('  e o enunciado nao diz nada',
    pergunta.pergunta, 'Adivinhe a palavra pelas dicas do seu parceiro.');
  sala.destruir();
}

/* ---------------- A palavra secreta e explicavel ---------------- */
{
  const { sala } = novaSala(4);
  const alvos = [];
  for (let i = 0; i < 60; i++) alvos.push(sala.perguntaDica().resposta);

  const numericas = alvos.filter((a) => !/[a-zA-ZÀ-ɏ]/.test(a));
  conferir('nenhum alvo e so numero', numericas, []);
  const compridas = alvos.filter((a) => a.trim().split(/\s+/).length > 3);
  conferir('nenhum alvo e uma frase', compridas, []);
  sala.destruir();
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
