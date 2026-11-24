'use strict';

/*
 * Acha em que segundos de cada musica o nome dela e cantado, para o sorteio
 * do ponto nao comecar o trecho com o nome na cara (ver `sortearInicio`, em
 * server/sala.js).
 *
 * 1. Transcreve com o whisper que vem no ffmpeg as musicas que ainda nao tem
 *    transcricao em `transcricoes/<nome>.srt` (pasta fora do repositorio).
 *    Precisa do modelo do whisper.cpp (ggml-small.bin, de
 *    huggingface.co/ggerganov/whisper.cpp) em WHISPER_MODELO. Sem ele, so
 *    usa as transcricoes que ja existem. Leva mais ou menos o tempo da musica.
 * 2. Procura o nome (e os outros nomes aceitos) no texto, com folga para o
 *    erro de uma letra do whisper, e escreve os intervalos no campo `nome` de
 *    cada musica em server/musicas.js.
 *
 *   WHISPER_MODELO=C:/modelos/ggml-small.bin npm run nome-cantado
 *
 * Fica fora do `npm test`: transcrever e lento e depende do ffmpeg.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { QUESTOES } = require('../server/questions.js');
const { MUSICAS } = require('../server/musicas.js');

const RAIZ = path.join(__dirname, '..');
const PASTA = path.join(RAIZ, 'transcricoes');
const ARQUIVO_MUSICAS = path.join(RAIZ, 'server', 'musicas.js');
const INTERNACIONAIS = new Set(['pop', 'rock', 'hiphop']);

// O whisper erra o tempo em um segundo ou dois: o intervalo ganha folga.
const FOLGA = 1;

/* ---------------------------- 1. Transcrever ---------------------------- */

function transcrever(nome) {
  const modelo = process.env.WHISPER_MODELO;
  const tmp = `${nome}.srt.tmp`;
  // O filtro do ffmpeg nao aceita o "C:" no caminho: tudo relativo a pasta.
  const relModelo = path.relative(PASTA, modelo).split(path.sep).join('/');
  const lingua = INTERNACIONAIS.has(MUSICAS[nome].estilo) ? 'auto' : 'pt';
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error',
    '-i', path.join(RAIZ, 'public', 'audio', `musica-${nome}.mp3`),
    '-af', `whisper=model=${relModelo}:language=${lingua}:use_gpu=false:queue=30:format=srt:max_len=40:destination=${tmp}`,
    '-f', 'null', '-'], { cwd: PASTA, encoding: 'utf8' });
  if (r.status !== 0 || !fs.existsSync(path.join(PASTA, tmp))) {
    console.log(`  erro em ${nome}: ${(r.stderr || '').slice(0, 200)}`);
    return;
  }
  fs.renameSync(path.join(PASTA, tmp), path.join(PASTA, `${nome}.srt`));
}

/* ------------------------- 2. Achar o nome cantado ------------------------- */

const palavras = (texto) => String(texto)
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);

/** Trechos do srt: inicio, fim (segundos) e as palavras. */
function lerSrt(texto) {
  const tempo = (h, m, s, ms) => Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms) / 1000;
  const trechos = [];
  for (const bloco of texto.split(/\r?\n\r?\n/)) {
    const t = /(\d+):(\d+):(\d+),(\d+) --> (\d+):(\d+):(\d+),(\d+)/.exec(bloco);
    if (!t) continue;
    const linhas = bloco.split(/\r?\n/);
    const fala = linhas.slice(linhas.findIndex((l) => l.includes('-->')) + 1).join(' ');
    // "[Music]", "(Musica)": e o whisper dizendo que nao tem voz.
    const limpa = fala.replace(/\[[^\]]*\]|\([^)]*\)/g, ' ');
    trechos.push({ ini: tempo(...t.slice(1, 5)), fim: tempo(...t.slice(5, 9)), palavras: palavras(limpa) });
  }
  return trechos;
}

/** Erro de uma letra so conta em palavra comprida: "yelow" e "yellow", mas "one" nao e "own". */
function parecida(a, b) {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 1) return false;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length][b.length] <= 1;
}

/** Os nomes da musica, cada um como lista de palavras. Nome comprido vale pelas tres primeiras. */
function nomesDe(nome) {
  const audio = `/audio/musica-${nome}.mp3`;
  const q = QUESTOES.ouvir.find((p) => p.audio === audio && /nome desta musica/i.test(p.pergunta));
  if (!q) return [];
  return [q.resposta, ...(q.aceita || [])]
    .map((n) => palavras(String(n).replace(/\([^)]*\)/g, ' ')))
    .filter((p) => p.length)
    .map((p) => (p.length > 4 ? p.slice(0, 3) : p));
}

/** Intervalos [inicio, fim] em que algum dos nomes e cantado, ja juntos e com folga. */
function intervalos(trechos, nomes) {
  // As palavras em fila, cada uma lembrando de que trecho veio: o nome pode
  // comecar num trecho e terminar no seguinte.
  const fila = trechos.flatMap((t) => t.palavras.map((p) => ({ p, t })));
  const achados = [];
  for (const nome of nomes) {
    for (let i = 0; i + nome.length <= fila.length; i++) {
      if (nome.every((p, k) => parecida(fila[i + k].p, p))) {
        achados.push([fila[i].t.ini - FOLGA, fila[i + nome.length - 1].t.fim + FOLGA]);
      }
    }
  }
  achados.sort((a, b) => a[0] - b[0]);
  const juntos = [];
  for (const [a, b] of achados) {
    const ultimo = juntos[juntos.length - 1];
    if (ultimo && a <= ultimo[1]) ultimo[1] = Math.max(ultimo[1], b);
    else juntos.push([a, b]);
  }
  return juntos.map(([a, b]) => [Math.max(0, Math.round(a * 10) / 10), Math.round(b * 10) / 10]);
}

/* ------------------------------ Rodar tudo ------------------------------ */

if (require.main === module) {
  fs.mkdirSync(PASTA, { recursive: true });
  const faltam = Object.keys(MUSICAS).filter((n) => !fs.existsSync(path.join(PASTA, `${n}.srt`)));
  if (faltam.length && process.env.WHISPER_MODELO) {
    console.log(`Transcrevendo ${faltam.length} musicas...`);
    faltam.forEach((n, i) => { console.log(`  ${i + 1}/${faltam.length} ${n}`); transcrever(n); });
  } else if (faltam.length) {
    console.log(`${faltam.length} musicas sem transcricao (falta WHISPER_MODELO): ficam sem o campo nome.`);
  }

  let fonte = fs.readFileSync(ARQUIVO_MUSICAS, 'utf8');
  let comNome = 0;
  for (const nome of Object.keys(MUSICAS)) {
    const srt = path.join(PASTA, `${nome}.srt`);
    if (!fs.existsSync(srt)) continue;
    const lista = intervalos(lerSrt(fs.readFileSync(srt, 'utf8')), nomesDe(nome));
    if (lista.length) comNome++;
    const linha = new RegExp(`^(  '${nome}': \\{ duracao: [\\d.]+, estilo: '\\w+')(, nome: \\[.*\\])?( \\},?)$`, 'm');
    const campo = lista.length ? `, nome: ${JSON.stringify(lista).replace(/,/g, ', ')}` : '';
    fonte = fonte.replace(linha, `$1${campo}$3`);
  }
  fs.writeFileSync(ARQUIVO_MUSICAS, fonte);
  console.log(`Nome cantado achado em ${comNome} de ${Object.keys(MUSICAS).length} musicas.`);
}

module.exports = { lerSrt, intervalos, nomesDe, palavras };
