'use strict';

/**
 * Os arquivos de audio das perguntas de musica: quanto dura cada um, de que
 * ponto a rodada comeca a tocar e o endereco que vai para a tela.
 *
 * A musica nao toca mais sempre do comeco. Cada rodada sorteia um ponto de
 * partida, deixando musica suficiente para o limite da sala (30s, se ninguem
 * mexer). Com os trechos de 40s de hoje o sorteio fica nos primeiros segundos;
 * com a musica inteira na pasta (`npm run trechos`, a partir dos FLAC de
 * public/musicas), ele pode cair em qualquer parte dela.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { QUESTOES } = require('./questions');

const PASTA_PUBLICA = path.join(__dirname, '..', 'public');

/* ---------------------------- O limite da sala ---------------------------- */

// Quanto a musica pode tocar numa rodada. So entram as opcoes que o trecho
// mais curto comporta: com os de 40s, oferecer 45s ou 60s seria prometer
// musica que nao existe.
const LIMITES_POSSIVEIS = [10, 15, 20, 30, 45, 60];
const LIMITE_PADRAO = 30;

// O fim de cada trecho tem uma saida suave (fade): o sorteio para antes dela.
const MS_MARGEM_FINAL = 2000;

/* ------------------------- Quanto dura cada MP3 ------------------------- */

// Tabelas do cabecalho de quadro do MP3 (camada III).
const KBPS = {
  1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]
};
const AMOSTRAGEM = { 1: [44100, 48000, 32000], 2: [22050, 24000, 16000], 25: [11025, 12000, 8000] };

function ler(fd, posicao, quantos) {
  const buffer = Buffer.alloc(quantos);
  const lidos = fs.readSync(fd, buffer, 0, quantos, posicao);
  return buffer.subarray(0, lidos);
}

/**
 * A duracao de um MP3 em segundos, lida do proprio arquivo — ou null.
 *
 * O ffmpeg e o LAME gravam no primeiro quadro uma etiqueta ("Info" ou
 * "Xing") com o numero de quadros, e cada quadro tem tamanho fixo de
 * amostras: a conta e exata. Sem etiqueta, a taxa e constante e a conta sai
 * do tamanho do arquivo. So le o comeco: os 93 arquivos inteiros, com a
 * musica completa, passariam de 200 MB.
 */
function duracaoDoMp3(caminho) {
  const fd = fs.openSync(caminho, 'r');
  try {
    const tamanho = fs.fstatSync(fd).size;

    // Etiqueta ID3 no comeco (capa do album, nome da faixa): pula.
    let inicio = 0;
    const id3 = ler(fd, 0, 10);
    if (id3.length === 10 && id3.toString('latin1', 0, 3) === 'ID3') {
      inicio = 10 + (((id3[6] & 0x7f) << 21) | ((id3[7] & 0x7f) << 14)
        | ((id3[8] & 0x7f) << 7) | (id3[9] & 0x7f));
      if (id3[5] & 0x10) inicio += 10; // rodape da etiqueta
    }

    const bloco = ler(fd, inicio, 16 * 1024);
    let q = 0;
    while (q + 4 <= bloco.length && !(bloco[q] === 0xff && (bloco[q + 1] & 0xe0) === 0xe0)) q++;
    if (q + 4 > bloco.length) return null;

    const versaoBits = (bloco[q + 1] >> 3) & 0x03; // 11 = MPEG-1, 10 = MPEG-2, 00 = MPEG-2.5
    const camada = (bloco[q + 1] >> 1) & 0x03;     // 01 = camada III
    if (camada !== 1 || versaoBits === 1) return null;
    const versao = versaoBits === 3 ? 1 : (versaoBits === 2 ? 2 : 25);
    const kbps = KBPS[versao === 1 ? 1 : 2][(bloco[q + 2] >> 4) & 0x0f];
    const taxa = AMOSTRAGEM[versao][(bloco[q + 2] >> 2) & 0x03];
    if (!kbps || !taxa) return null;
    const mono = ((bloco[q + 3] >> 6) & 0x03) === 3;
    const amostrasPorQuadro = versao === 1 ? 1152 : 576;

    // "Info"/"Xing" vem logo depois das informacoes laterais do quadro.
    const lateral = versao === 1 ? (mono ? 17 : 32) : (mono ? 9 : 17);
    const xing = q + 4 + lateral;
    const marca = bloco.toString('latin1', xing, xing + 4);
    if ((marca === 'Info' || marca === 'Xing') && xing + 12 <= bloco.length && (bloco[xing + 7] & 0x01)) {
      return (bloco.readUInt32BE(xing + 8) * amostrasPorQuadro) / taxa;
    }
    // "VBRI", do codificador da Fraunhofer, fica num ponto fixo.
    const vbri = q + 4 + 32;
    if (bloco.toString('latin1', vbri, vbri + 4) === 'VBRI' && vbri + 18 <= bloco.length) {
      return (bloco.readUInt32BE(vbri + 14) * amostrasPorQuadro) / taxa;
    }
    return ((tamanho - inicio - q) * 8) / (kbps * 1000);
  } finally {
    fs.closeSync(fd);
  }
}

const duracoes = new Map(); // '/audio/trecho-x.mp3' -> ms (ou null)

/** Quanto dura um trecho do banco, em ms. Lido uma vez e guardado. */
function duracaoDoTrecho(audio) {
  if (!audio) return null;
  if (!duracoes.has(audio)) {
    let segundos = null;
    try {
      segundos = duracaoDoMp3(path.join(PASTA_PUBLICA, audio));
    } catch {
      segundos = null;
    }
    duracoes.set(audio, Number.isFinite(segundos) ? Math.round(segundos * 1000) : null);
  }
  return duracoes.get(audio);
}

/** Todos os audios que o banco de perguntas usa. */
function audiosDoBanco() {
  const audios = new Set();
  for (const perguntas of Object.values(QUESTOES)) {
    for (const q of perguntas) if (q.audio) audios.add(q.audio);
  }
  return [...audios];
}

let limitesCalculados = null;

/**
 * As opcoes de limite que a configuracao oferece, e o padrao.
 *
 * Sai do trecho mais curto do banco: so entra o limite que todos comportam.
 */
function limitesDaMusica() {
  if (!limitesCalculados) {
    const conhecidas = audiosDoBanco().map(duracaoDoTrecho).filter((ms) => ms);
    const menor = conhecidas.length ? Math.min(...conhecidas) / 1000 : LIMITE_PADRAO;
    const cabem = LIMITES_POSSIVEIS.filter((s) => s <= menor);
    const opcoes = cabem.length ? cabem : [LIMITES_POSSIVEIS[0]];
    limitesCalculados = {
      opcoes,
      padrao: opcoes.includes(LIMITE_PADRAO) ? LIMITE_PADRAO : opcoes[opcoes.length - 1],
      menorTrecho: Math.floor(menor)
    };
  }
  return limitesCalculados;
}

/* -------------------------- O ponto de partida -------------------------- */

// O "meio" da musica comeca depois da introducao: 15s ou um quinto da
// musica, o que for mais.
const MS_INTRO = 15000;
const FRACAO_INTRO = 0.2;
// O refrao entra com um respiro antes, para a primeira palavra nao cortar.
const MS_ANTES_DO_REFRAO = 1000;

/** O pedaco [desde, ate] menos os intervalos proibidos. */
function subtrair([desde, ate], proibidos) {
  let livres = desde < ate ? [[desde, ate]] : [];
  for (const [a, b] of proibidos) {
    livres = livres.flatMap(([x, y]) => {
      if (b <= x || a >= y) return [[x, y]];
      const sobra = [];
      if (a > x) sobra.push([x, a]);
      if (b < y) sobra.push([b, y]);
      return sobra;
    });
  }
  return livres;
}

/**
 * De onde a rodada comeca a tocar, em ms desde o inicio do arquivo, e que
 * parte da musica e essa.
 *
 * Sempre sobra `limiteMs` de musica pela frente, antes da saida suave do fim;
 * trecho curto demais para isso toca do comeco. Dentro disso, o regime que o
 * avaliador escolheu (ver avaliador.js) manda:
 *
 *   'conhecida' -> o comeco ou um refrao marcado (ver marcas.js);
 *   'meio'      -> depois da introducao, e a janela tocada nao encosta em
 *                  nenhum refrao. Sem lugar assim, vale qualquer ponto;
 *   'qualquer'  -> qualquer ponto.
 *
 * @returns {{inicioMs:number, parte:'comeco'|'refrao'|'meio'|'qualquer'}}
 */
function inicioNaMusica(duracaoMs, limiteMs, regime = 'qualquer', marcas = {}, sorteio = Math.random) {
  const ultimo = (duracaoMs || 0) - limiteMs - MS_MARGEM_FINAL;
  if (ultimo <= 0) return { inicioMs: 0, parte: 'comeco' };
  const noLimite = (ms) => Math.floor(Math.max(0, Math.min(ms, ultimo)));

  const comeco = noLimite((marcas.comeco || 0) * 1000);
  const refroes = (marcas.refrao || [])
    .map(([a, b]) => [a * 1000, b * 1000])
    .filter(([a, b]) => b > a && a < duracaoMs);

  if (regime === 'conhecida') {
    const partes = [
      { inicioMs: comeco, parte: 'comeco' },
      ...refroes.map(([a]) => ({ inicioMs: noLimite(a - MS_ANTES_DO_REFRAO), parte: 'refrao' }))
    ];
    return partes[Math.floor(sorteio() * partes.length)];
  }

  if (regime === 'meio') {
    // Comecar em s toca [s, s + limite]: para nao encostar no refrao [a, b],
    // s nao pode cair entre a - limite e b.
    const proibidos = refroes.map(([a, b]) => [a - limiteMs, b]);
    const intro = comeco + Math.max(MS_INTRO, duracaoMs * FRACAO_INTRO);
    // Trecho curto nao tem introducao inteira para pular: ai so o comeco sai.
    for (const desde of [intro, comeco + 1000]) {
      const livres = subtrair([desde, ultimo], proibidos);
      const total = livres.reduce((soma, [a, b]) => soma + (b - a), 0);
      if (total <= 0) continue;
      let alvo = sorteio() * total;
      for (const [a, b] of livres) {
        if (alvo <= b - a) return { inicioMs: Math.floor(a + alvo), parte: 'meio' };
        alvo -= b - a;
      }
    }
  }

  return { inicioMs: noLimite(sorteio() * ultimo), parte: 'qualquer' };
}

/** O ponto de partida de um trecho do banco, pelo regime que o avaliador pediu. */
function escolherInicio(audio, limiteMs, regime, marcas, sorteio) {
  return inicioNaMusica(duracaoDoTrecho(audio), limiteMs, regime, marcas, sorteio);
}

/** Um ponto de partida qualquer, sem olhar a dificuldade. */
function sortearInicio(audio, limiteMs, sorteio = Math.random) {
  return escolherInicio(audio, limiteMs, 'qualquer', {}, sorteio).inicioMs;
}

/**
 * Quanto a musica toca a partir de `inicioMs`: o limite, ou o que sobra do
 * trecho se ele acabar antes. E isso que a rodada dura.
 */
function tempoTocando(audio, inicioMs, limiteMs) {
  const duracao = duracaoDoTrecho(audio);
  return duracao ? Math.max(1000, Math.min(limiteMs, duracao - inicioMs)) : limiteMs;
}

/* -------------------- O endereco do trecho na rodada -------------------- *
 *
 * O arquivo se chama "trecho-yellow.mp3": mandar esse endereco para a tela e
 * entregar a resposta para quem abre o inspetor. Cada rodada ganha um
 * endereco sorteado que so o servidor sabe ligar ao arquivo.
 */
const MS_VALIDADE_ENDERECO = 30 * 60 * 1000;
const enderecos = new Map(); // codigo -> { audio, criadoEm }

function enderecoDoTrecho(audio) {
  if (!audio) return null;
  const agora = Date.now();
  for (const [codigo, registro] of enderecos) {
    if (agora - registro.criadoEm > MS_VALIDADE_ENDERECO) enderecos.delete(codigo);
  }
  const codigo = crypto.randomBytes(12).toString('base64url');
  enderecos.set(codigo, { audio, criadoEm: agora });
  return `/trecho/${codigo}`;
}

/** O arquivo por tras de um endereco sorteado, ou null se ele nao existe (mais). */
function audioDoEndereco(codigo) {
  const registro = enderecos.get(String(codigo || ''));
  return registro ? registro.audio : null;
}

module.exports = {
  LIMITES_POSSIVEIS, LIMITE_PADRAO, MS_MARGEM_FINAL, MS_INTRO, FRACAO_INTRO, MS_ANTES_DO_REFRAO,
  duracaoDoMp3, duracaoDoTrecho, limitesDaMusica, inicioNaMusica, escolherInicio, sortearInicio,
  tempoTocando, enderecoDoTrecho, audioDoEndereco
};
