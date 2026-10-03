'use strict';

/*
 * O trecho de cada rodada de musica: de onde ele toca e por quanto tempo.
 *
 * A musica nao toca mais sempre do comeco: cada rodada sorteia um ponto de
 * partida que deixa musica para o limite inteiro da sala (30s se ninguem
 * mexer). Ela toca ate alguem acertar, todo mundo escolher ou o limite
 * chegar. Vale para a Corrida musical, o Qual e a musica e as perguntas de
 * Ouvir musicas em qualquer modo.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const trechos = require('../server/trechos.js');
const { Sala } = require('../server/sala.js');
const { QUESTOES } = require('../server/questions.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(62), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

const audios = [...new Set(QUESTOES.ouvir.map((q) => q.audio))];
const { LIMITE_PADRAO, MS_MARGEM_FINAL } = trechos;

/* ---------------- 1. Quanto dura cada MP3 ---------------- */
{
  const duracoes = audios.map((a) => trechos.duracaoDoTrecho(a));
  conferir('todo trecho tem a duracao lida do arquivo', duracoes.filter((ms) => !ms).length, 0);
  conferir('  e cada um da para o menor limite inteiro',
    audios.filter((a, i) => duracoes[i] < trechos.LIMITES_POSSIVEIS[0] * 1000), []);

  // Os dois caminhos da leitura, num arquivo montado a mao: etiqueta ID3 na
  // frente e taxa constante sem "Info". 16000 bytes a 128 kbps = 1 segundo.
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'trecho-'));
  const id3 = Buffer.from([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 90]);
  const quadro = Buffer.alloc(16000);
  quadro.set([0xff, 0xfb, 0x90, 0x64]); // MPEG-1, camada III, 128 kbps, 44,1 kHz
  const arquivo = path.join(pasta, 'sem-info.mp3');
  fs.writeFileSync(arquivo, Buffer.concat([id3, Buffer.alloc(90), quadro]));
  conferir('MP3 sem "Info": pula o ID3 e conta pelo tamanho', trechos.duracaoDoMp3(arquivo), 1);
  fs.writeFileSync(arquivo, Buffer.from('isto nao e um mp3'));
  conferir('arquivo que nao e MP3 nao tem duracao', trechos.duracaoDoMp3(arquivo), null);
  fs.rmSync(pasta, { recursive: true, force: true });
}

/* ---------------- 2. As opcoes de limite ---------------- */
{
  const limites = trechos.limitesDaMusica();
  const menor = Math.min(...audios.map((a) => trechos.duracaoDoTrecho(a))) / 1000;
  conferir('so entra limite que o trecho mais curto comporta', limites.opcoes.every((s) => s <= menor), true);
  conferir('  saidos da lista de sempre',
    limites.opcoes.every((s) => trechos.LIMITES_POSSIVEIS.includes(s)), true);
  conferir(`o padrao e ${LIMITE_PADRAO}s`, limites.padrao, menor >= LIMITE_PADRAO ? LIMITE_PADRAO : limites.opcoes.at(-1));
}

/* ---------------- 3. O ponto de partida ---------------- */
{
  const tortos = [];
  for (const audio of audios) {
    const duracao = trechos.duracaoDoTrecho(audio);
    for (const s of trechos.limitesDaMusica().opcoes) {
      const limite = s * 1000;
      for (let k = 0; k < 20; k++) {
        const inicio = trechos.sortearInicio(audio, limite);
        const sobra = duracao - inicio;
        if (!Number.isInteger(inicio) || inicio < 0) tortos.push(`${audio} ${s}s: ${inicio}`);
        // Sobra musica para o limite inteiro, antes da saida suave do fim.
        if (duracao >= limite + MS_MARGEM_FINAL && sobra < limite + MS_MARGEM_FINAL) {
          tortos.push(`${audio} ${s}s: comeca em ${inicio}, sobram ${sobra}`);
        }
      }
    }
  }
  conferir('o sorteio deixa musica para o limite inteiro', tortos.slice(0, 5), []);

  const audio = audios[0];
  const duracao = trechos.duracaoDoTrecho(audio);
  conferir('o sorteio mais baixo toca do comeco', trechos.sortearInicio(audio, 10000, () => 0), 0);
  conferir('o mais alto para antes da saida suave',
    trechos.sortearInicio(audio, 10000, () => 0.99999) <= duracao - 10000 - MS_MARGEM_FINAL, true);
  const vistos = new Set(Array.from({ length: 200 }, () => trechos.sortearInicio(audio, 10000)));
  conferir('nao e sempre o comeco', vistos.size > 20, true);
  conferir('limite maior que o trecho: toca do comeco', trechos.sortearInicio(audio, duracao + 5000), 0);

  conferir('a musica toca o limite', trechos.tempoTocando(audio, 1000, 10000), 10000);
  conferir('  ou o que sobra do trecho, se ele acabar antes',
    trechos.tempoTocando(audio, 0, duracao + 20000), duracao);
}

/* ---------------- 4. Que parte da musica ---------------- */
{
  // Uma musica inteira de mentira: 200s, refroes de 50 a 70s e de 120 a 140s.
  const marcas = { refrao: [[50, 70], [120, 140]] };
  const sorteios = (regime, n = 2000) => Array.from({ length: n },
    () => trechos.inicioNaMusica(200000, 30000, regime, marcas));
  const encosta = (inicio) => marcas.refrao.some(([a, b]) => inicio < b * 1000 && inicio + 30000 > a * 1000);

  const conhecidas = new Set(sorteios('conhecida').map((x) => `${x.parte}@${x.inicioMs}`));
  conferir('parte conhecida: o comeco ou um refrao, com 1s de respiro antes',
    [...conhecidas].sort(), ['comeco@0', 'refrao@119000', 'refrao@49000']);

  const meio = sorteios('meio');
  conferir('meio: sempre marcado como meio', [...new Set(meio.map((x) => x.parte))], ['meio']);
  conferir('  a janela tocada nunca encosta num refrao', meio.filter((x) => encosta(x.inicioMs)).length, 0);
  conferir('  e comeca depois da introducao (um quinto da musica)',
    Math.min(...meio.map((x) => x.inicioMs)) >= 40000, true);
  conferir('  sobrando musica para o limite inteiro',
    Math.max(...meio.map((x) => x.inicioMs)) <= 200000 - 30000 - MS_MARGEM_FINAL, true);

  const qualquer = sorteios('qualquer');
  conferir('qualquer: do comeco ate o ultimo ponto que cabe',
    [Math.min(...qualquer.map((x) => x.inicioMs)) < 5000,
      Math.max(...qualquer.map((x) => x.inicioMs)) <= 200000 - 30000 - MS_MARGEM_FINAL], [true, true]);

  conferir('o comeco marcado vale como comeco',
    trechos.inicioNaMusica(200000, 30000, 'conhecida', { comeco: 17 }, () => 0), { inicioMs: 17000, parte: 'comeco' });
  conferir('sem refrao marcado, a parte conhecida e o comeco',
    trechos.inicioNaMusica(200000, 30000, 'conhecida', {}, () => 0.9), { inicioMs: 0, parte: 'comeco' });
  // Refrao ocupando o meio inteiro: nao ha meio que fuja dele.
  conferir('sem meio que fuja do refrao, vale qualquer ponto',
    trechos.inicioNaMusica(200000, 30000, 'meio', { refrao: [[10, 190]] }, () => 0.5).parte, 'qualquer');
  conferir('trecho curto demais toca do comeco, em qualquer regime',
    ['conhecida', 'meio', 'qualquer'].map((r) => trechos.inicioNaMusica(25000, 30000, r, marcas).inicioMs), [0, 0, 0]);
}

/* ---------------- 5. O avaliador de dificuldade ---------------- */
{
  const avaliador = require('../server/avaliador.js');
  const dificuldade = require('../server/dificuldade.js');

  // Uma musica que nao existe no banco, para o teste nao mexer na nota das de verdade.
  const falsa = `teste-avaliador-${Date.now()}`;
  conferir('musica sem pergunta no banco comeca em 40', avaliador.dificuldadeDaMusica(falsa), 40);
  conferir('a base de uma musica e a media das perguntas dela',
    avaliador.baseDe('waka-waka'), (QUESTOES.ouvir.filter((q) => q.audio.includes('trecho-waka-waka')).reduce((s, q) => s + q.dif, 0)) / 2);
  conferir('antes de tocar o bastante, o sorteio e livre', avaliador.regimeDaMusica(falsa, () => 0), 'qualquer');

  const subiu = avaliador.anotarRodada(falsa, { participantes: 4, tempos: [], duracaoMs: 30000 });
  conferir('ninguem reconheceu: a musica fica mais dificil', subiu > 40, true);
  const desceu = avaliador.anotarRodada(falsa, { participantes: 4, tempos: [1000, 1500, 2000, 2500], duracaoMs: 30000 });
  conferir('  todo mundo de cara: fica mais facil', desceu < subiu, true);

  // O chute das quatro opcoes: metade certa e quase nada acima do acaso.
  const chute = `${falsa}-chute`;
  const comChute = avaliador.anotarRodada(chute, { participantes: 4, tempos: [3000], duracaoMs: 30000, chute: 0.25 });
  conferir('no Qual e a musica, 1 de 4 certo e o que o chute daria', comChute,
    dificuldade.registrarObservada(`${chute}-conta`, 40, dificuldade.dificuldadeObservada(0, 0.1)));

  // O regime vem da dificuldade. Mil sorteios espalhados por igual dizem em
  // que parte das rodadas cada regime sai.
  const regimes = () => {
    const contagem = { conhecida: 0, meio: 0, qualquer: 0 };
    for (let i = 0; i < 1000; i++) {
      contagem[avaliador.regimeDaMusica(falsa, () => (i + 0.5) / 1000)] += 1;
    }
    return contagem;
  };
  // Leva a dificuldade da musica falsa ao valor pedido: muitas rodadas iguais.
  const forcar = (alvo) => {
    for (let i = 0; i < 60; i++) dificuldade.registrarObservada(dificuldade.idDe('musica', falsa), 40, alvo);
  };
  forcar(80);
  conferir('musica muito dificil: so parte conhecida', regimes().conhecida, 1000);
  forcar(55);
  const meioTermo = regimes();
  conferir('  ficando dificil: parte conhecida em parte das rodadas',
    meioTermo.conhecida > 300 && meioTermo.conhecida < 700 && meioTermo.meio === 0, true);
  forcar(40);
  conferir('  no meio-termo: sorteio livre', regimes().qualquer, 1000);
  forcar(25);
  const facil = regimes();
  conferir('  ficando facil: o meio em parte das rodadas', facil.meio > 300 && facil.meio < 700 && facil.conhecida === 0, true);
  forcar(5);
  conferir('  muito facil: so o meio', regimes().meio, 1000);
}

/* ---------------- 6. Marcacoes ---------------- */
{
  const { MARCAS } = require('../server/marcas.js');
  const conhecidos = new Set(audios.map((a) => a.replace(/^.*\/trecho-/, '').replace(/\.mp3$/, '')));
  const tortas = [];
  for (const [trecho, marcas] of Object.entries(MARCAS)) {
    if (!conhecidos.has(trecho)) { tortas.push(`${trecho}: nao existe`); continue; }
    const duracao = trechos.duracaoDoTrecho(`/audio/trecho-${trecho}.mp3`) / 1000;
    if (marcas.comeco !== undefined && !(marcas.comeco >= 0 && marcas.comeco < duracao)) {
      tortas.push(`${trecho}: comeco fora do arquivo`);
    }
    for (const [a, b] of marcas.refrao || []) {
      if (!(a >= 0 && b > a && b <= duracao + 1)) tortas.push(`${trecho}: refrao ${a}-${b} fora do arquivo`);
    }
  }
  conferir('toda marcacao e de trecho que existe e cabe no arquivo', tortas, []);
}

/* ---------------- 7. Na sala ---------------- */
function rodada(config) {
  const eventos = [];
  const sala = new Sala('TRE1', {
    subs: [], fora: [], metaPontos: 999, segundosPorPergunta: 45, ...config
  }, (evento, dados) => eventos.push({ evento, dados }), () => {});
  sala.entrar('ana', 'Ana');
  sala.iniciar();
  sala.limparTemporizador();
  sala.mostrarPergunta();
  sala.limparTemporizador();
  const achar = (nome) => eventos.find((e) => e.evento === nome).dados;
  return { sala, categoria: achar('rodada:categoria'), pergunta: achar('rodada:pergunta') };
}

{
  const { sala, categoria, pergunta } = rodada({ categorias: ['ouvir'], modo: 'corrida-musical', segundosMusica: 15 });
  const duracao = trechos.duracaoDoTrecho(sala.perguntaAtual.audio);
  conferir('Corrida: a rodada dura o limite da musica', pergunta.duracaoMs, 15000);
  conferir('  e a musica comeca num ponto que deixa os 15s inteiros',
    pergunta.audioInicioMs >= 0 && pergunta.audioInicioMs <= duracao - 15000 - MS_MARGEM_FINAL, true);
  conferir('  o mesmo ponto vai na tela da categoria, para baixar antes', categoria.audioInicioMs, pergunta.audioInicioMs);
  sala.destruir();
}
{
  const { sala, pergunta } = rodada({ categorias: ['ouvir'], modo: 'tempo', segundosMusica: 20 });
  conferir('Ouvir musicas no Modo Tempo: vale o limite da musica, nao os 45s', pergunta.duracaoMs, 20000);
  conferir('  e o ponto sorteado tambem', typeof pergunta.audioInicioMs, 'number');
  sala.destruir();
}
{
  const { sala, pergunta } = rodada({ categorias: ['geografia'], modo: 'tempo', segundosMusica: 20 });
  conferir('pergunta sem audio continua com o tempo por pergunta', [pergunta.duracaoMs, pergunta.audioInicioMs], [45000, 0]);
  sala.destruir();
}
{
  const { sala, pergunta } = rodada({ categorias: ['ouvir'], modo: 'qual-e-a-musica', perguntar: 'os-dois', fim: 'pontos' });
  conferir(`sem limite na configuracao, a musica toca ${LIMITE_PADRAO}s`, pergunta.duracaoMs, LIMITE_PADRAO * 1000);

  // Os pontos por rapidez acompanham o relogio da musica: 10 faixas de 3s.
  const certa = sala.perguntaAtual.certa;
  const real = Date.now;
  Date.now = () => sala.inicioPergunta + 10500;
  sala.escolher('ana', certa);
  Date.now = real;
  sala.limparTemporizador();
  sala.encerrarRodada();
  sala.limparTemporizador();
  conferir('  e o clique aos 10,5s de 30s vale 7', sala.jogadores.get('ana').pontos, 7);
  sala.destruir();
}
{
  // Cada rodada sorteia de novo.
  const inicios = new Set();
  const { sala } = rodada({ categorias: ['ouvir'], modo: 'corrida-musical', segundosMusica: 10, perguntar: 'nome' });
  for (let i = 0; i < 15; i++) {
    inicios.add(sala.perguntaAtual.inicioAudioMs);
    sala.proximaRodada();
    sala.limparTemporizador();
  }
  conferir('cada rodada toca de um ponto diferente', inicios.size > 5, true);
  sala.destruir();
}

/* ---------------- 8. O endereco ---------------- */
{
  const endereco = trechos.enderecoDoTrecho(audios[0]);
  conferir('o endereco nao traz o nome do arquivo', endereco.includes('trecho-'), false);
  conferir('  e o servidor sabe a que arquivo ele leva', trechos.audioDoEndereco(endereco.slice('/trecho/'.length)), audios[0]);
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
