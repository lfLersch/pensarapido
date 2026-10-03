'use strict';

/*
 * Gera os trechos de public/audio a partir das musicas inteiras de
 * public/musicas (FLAC, fora do git).
 *
 * O jogo sorteia de que ponto do trecho cada rodada toca. Com trechos de 40s
 * o sorteio fica no comeco da musica; com trechos longos — ou a musica
 * inteira —, ele cai em qualquer parte dela.
 *
 *   npm run trechos                        a musica inteira, a 96 kbps
 *   npm run trechos -- --segundos 150      so os primeiros 2:30 de cada uma
 *   npm run trechos -- --kbps 128          mais qualidade, mais peso
 *   npm run trechos -- --so yellow,baby    so essas (o nome do trecho)
 *   npm run trechos -- --listar            so mostra que arquivo vira que trecho
 *
 * Precisa do ffmpeg. O arquivo de cada musica e achado pelo nome — titulo e
 * artista, sem acento, maiuscula nem pontuacao, valendo tambem o nome das
 * pastas. O que nao der para achar sozinho vai em public/musicas/mapa.json:
 *
 *   { "yellow": "Coldplay/Parachutes/05 Yellow.flac" }
 *
 * Todos saem no mesmo volume, sem etiqueta nenhuma: titulo e artista
 * gravados no MP3 entregariam a resposta para quem baixasse o arquivo.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { CATALOGO } = require('../server/musicas');
const { normalizar } = require('../server/comparar');
const { duracaoDoMp3 } = require('../server/trechos');

const RAIZ = path.join(__dirname, '..');
const EXTENSOES = ['.flac', '.mp3', '.m4a', '.wav', '.ogg', '.opus', '.aac', '.wma', '.aiff'];

const argumento = (nome, padrao) => {
  const i = process.argv.indexOf(`--${nome}`);
  const valor = i >= 0 ? process.argv[i + 1] : undefined;
  return valor !== undefined && !valor.startsWith('--') ? valor : padrao;
};

const DE = path.resolve(RAIZ, argumento('de', 'public/musicas'));
const PARA = path.resolve(RAIZ, argumento('para', 'public/audio'));
const KBPS = Number(argumento('kbps', 96));
const SEGUNDOS = Number(argumento('segundos', 0)); // 0 = a musica inteira
const SO = argumento('so', '').split(',').map((s) => s.trim()).filter(Boolean);
const LISTAR = process.argv.includes('--listar');

function sair(mensagem) {
  console.error(mensagem);
  process.exit(1);
}

if (!Number.isInteger(KBPS) || KBPS < 64 || KBPS > 320) sair('--kbps vai de 64 a 320.');
if (!Number.isFinite(SEGUNDOS) || SEGUNDOS < 0 || (SEGUNDOS > 0 && SEGUNDOS < 15)) {
  sair('--segundos e 0 (a musica inteira) ou pelo menos 15.');
}
if (!fs.existsSync(DE)) sair(`Nao achei ${DE}. E ai que ficam as musicas inteiras (fora do git).`);
if (!LISTAR && spawnSync('ffmpeg', ['-version']).status !== 0) {
  sair('Nao achei o ffmpeg. Instale (https://ffmpeg.org) e rode de novo.');
}

/* ------------------------- Que arquivo e de quem ------------------------- */

/** Todos os arquivos de audio da pasta, com as subpastas (Artista/Album/faixa). */
function listar(pasta, prefixo = '') {
  const achados = [];
  for (const item of fs.readdirSync(pasta, { withFileTypes: true })) {
    const relativo = path.join(prefixo, item.name);
    if (item.isDirectory()) achados.push(...listar(path.join(pasta, item.name), relativo));
    else if (EXTENSOES.includes(path.extname(item.name).toLowerCase())) achados.push(relativo);
  }
  return achados;
}

const arquivos = listar(DE);
const chaveDe = new Map(arquivos.map((rel) => [rel, normalizar(rel.replace(/\.[^.]+$/, ''))]));

const caminhoDoMapa = path.join(DE, 'mapa.json');
const mapa = fs.existsSync(caminhoDoMapa) ? JSON.parse(fs.readFileSync(caminhoDoMapa, 'utf8')) : {};

/** As grafias de uma resposta, comparaveis com o nome do arquivo. */
function grafias(q) {
  return q ? [q.resposta, ...(q.aceita || [])].map(normalizar).filter((f) => f.length >= 3) : [];
}

/**
 * O arquivo de origem de um trecho. O titulo tem que estar no nome; o
 * artista desempata — sao dois "Perfect", o do Ed Sheeran e o do Simple Plan.
 */
function acharOrigem(musica) {
  if (mapa[musica.trecho]) return { arquivo: mapa[musica.trecho], como: 'mapa.json' };

  const titulos = [...grafias(musica.nome), normalizar(musica.trecho)];
  const artistas = grafias(musica.quem);
  const candidatos = [];
  for (const rel of arquivos) {
    const chave = chaveDe.get(rel);
    if (!titulos.some((t) => chave.includes(t))) continue;
    candidatos.push({ rel, pontos: artistas.some((a) => chave.includes(a)) ? 2 : 1 });
  }
  if (!candidatos.length) return { erro: 'nenhum arquivo com o titulo no nome' };

  const melhor = Math.max(...candidatos.map((c) => c.pontos));
  const empate = candidatos.filter((c) => c.pontos === melhor);
  if (empate.length > 1) return { erro: `mais de um arquivo serve: ${empate.map((c) => c.rel).join(' | ')}` };
  return { arquivo: empate[0].rel, como: melhor === 2 ? 'titulo e artista' : 'so o titulo' };
}

/* -------------------------------- Corte -------------------------------- */

/** Corta e converte um arquivo, num temporario: se der errado, o trecho antigo fica. */
function converter(origem, destino) {
  const temporario = `${destino}.novo.mp3`;
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-i', origem,
    '-vn', '-map_metadata', '-1', '-fflags', '+bitexact'];
  if (SEGUNDOS > 0) args.push('-t', String(SEGUNDOS));
  args.push(
    // Todo mundo no mesmo volume, como os trechos antigos.
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
    '-ar', '44100', '-ac', '2', '-c:a', 'libmp3lame', '-b:a', `${KBPS}k`,
    // Nenhuma etiqueta: o titulo gravado no arquivo seria a resposta.
    '-id3v2_version', '0', '-write_id3v1', '0',
    temporario
  );
  const r = spawnSync('ffmpeg', args, { encoding: 'utf8' });
  if (r.status !== 0) {
    fs.rmSync(temporario, { force: true });
    throw new Error((r.stderr || 'ffmpeg falhou').trim().split('\n').pop());
  }
  fs.renameSync(temporario, destino);
}

/* ------------------------------- Execucao ------------------------------- */

const alvo = SO.length ? CATALOGO.filter((m) => SO.includes(m.trecho)) : CATALOGO;
if (SO.length && alvo.length !== SO.length) {
  sair(`Trecho desconhecido: ${SO.filter((t) => !CATALOGO.some((m) => m.trecho === t)).join(', ')}`);
}

console.log(`${arquivos.length} arquivos em ${path.relative(RAIZ, DE) || DE}; ${alvo.length} trechos para fazer.`);
console.log(SEGUNDOS ? `Cada trecho: os primeiros ${SEGUNDOS}s, a ${KBPS} kbps.\n` : `Cada trecho: a musica inteira, a ${KBPS} kbps.\n`);

const usados = new Map(); // arquivo -> trecho
const faltaram = [];
let feitos = 0;
let bytes = 0;
let menor = Infinity;

for (const musica of alvo) {
  const achado = acharOrigem(musica);
  if (achado.erro) {
    faltaram.push(`${musica.trecho}: ${achado.erro}`);
    console.log(`FALTA  ${musica.trecho.padEnd(28)} ${achado.erro}`);
    continue;
  }
  if (usados.has(achado.arquivo)) {
    const erro = `o arquivo ja virou ${usados.get(achado.arquivo)}`;
    faltaram.push(`${musica.trecho}: ${erro}`);
    console.log(`FALTA  ${musica.trecho.padEnd(28)} ${erro}`);
    continue;
  }
  usados.set(achado.arquivo, musica.trecho);

  if (LISTAR) {
    console.log(`ok     ${musica.trecho.padEnd(28)} <- ${achado.arquivo} (${achado.como})`);
    continue;
  }

  const destino = path.join(PARA, `trecho-${musica.trecho}.mp3`);
  try {
    converter(path.join(DE, achado.arquivo), destino);
  } catch (erro) {
    faltaram.push(`${musica.trecho}: ${erro.message}`);
    console.log(`ERRO   ${musica.trecho.padEnd(28)} ${erro.message}`);
    continue;
  }
  const segundos = duracaoDoMp3(destino);
  const tamanho = fs.statSync(destino).size;
  feitos += 1;
  bytes += tamanho;
  menor = Math.min(menor, segundos);
  const minutos = `${Math.floor(segundos / 60)}:${String(Math.round(segundos % 60)).padStart(2, '0')}`;
  console.log(`ok     ${musica.trecho.padEnd(28)} ${minutos.padStart(5)}  ${(tamanho / 1048576).toFixed(1).padStart(4)} MB  <- ${achado.arquivo}`);
}

console.log('');
if (LISTAR) {
  console.log(`${usados.size} de ${alvo.length} trechos tem arquivo.`);
} else {
  console.log(`${feitos} de ${alvo.length} trechos feitos, ${(bytes / 1048576).toFixed(0)} MB no total.`);
  if (feitos) {
    console.log(`O mais curto tem ${Math.floor(menor)}s: o limite da musica na sala vai ate o maior valor que caiba nele.`);
  }
}
if (faltaram.length) {
  console.log(`\nFaltaram ${faltaram.length}. Os trechos antigos deles continuam como estavam.`);
  console.log('Para os que o nome nao resolveu, ponha em public/musicas/mapa.json: { "trecho": "arquivo.flac" }');
}
process.exit(faltaram.length && !feitos && !LISTAR ? 1 : 0);
