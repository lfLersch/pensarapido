'use strict';

/*
 * Converte o acervo de public/musicas (FLAC ou o que for) em MP3 para o jogo:
 * public/audio/trecho-<nome>.mp3, com a musica inteira.
 *
 *   npm run trechos                       todas, inteiras, a 96 kbps
 *   npm run trechos -- --kbps 64          mais leve (uns 2/3 do tamanho)
 *   npm run trechos -- --segundos 150     so os primeiros 2:30 de cada uma
 *   npm run trechos -- --de ~/Musicas     outra pasta
 *   npm run trechos -- --refazer          converte de novo as que ja estao prontas
 *   npm run trechos -- --catalogo <pasta> grava o catalogo em outro lugar
 *   npm run trechos -- --mesmo-assim      converte mesmo passando do peso
 *
 * Primeiro cataloga a pasta, como o `npm run catalogo`: sao as etiquetas que
 * dizem que arquivo e de que musica, quais o jogo ja usa e quais sao novas.
 * Cada musica vira um MP3 so: entre duplicadas fica a de estudio, com
 * etiqueta e em FLAC. As do jogo mantem o nome que ja tinham
 * (trecho-yellow.mp3, que deixa de ser o trecho de 40s e passa a ser a musica
 * inteira); as novas ganham um nome pelo titulo. O catalogo anota o MP3 de
 * cada uma, e e por ele que as novas viram pergunta depois.
 *
 * Todas saem no mesmo volume e sem etiqueta: titulo e artista gravados no MP3
 * entregariam a resposta. O que ja foi convertido nao e refeito, entao rodar
 * de novo depois de baixar mais musicas so converte as novas.
 *
 * Antes de converter, faz a conta do peso: os MP3 vao para o git, e o que
 * entra no historico nao sai mais. Passando de 800 MB, para e mostra quanto
 * daria com menos kbps ou so o comeco de cada musica.
 *
 * Precisa do ffmpeg.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { CATALOGO } = require('../server/musicas');
const { duracaoDoMp3 } = require('../server/trechos');
const { montarCatalogo, escrever, creditos, chaveTitulo, horas } = require('./catalogo');

const RAIZ = path.join(__dirname, '..');
const FAIXA_CURTA = 60; // menos que isto e vinheta, nao musica
const MB_PESADO = 800;  // o GitHub pede o repositorio inteiro abaixo de 1 GB

/* ------------------------------ Escolhas ------------------------------ */

const semAcento = (texto) => String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const slug = (texto) => semAcento(texto).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/**
 * Entre os arquivos da mesma musica, o melhor para o quiz: gravacao de
 * estudio, com etiqueta e em FLAC, nessa ordem de importancia.
 */
function melhorDe(grupo) {
  const nota = (m) => (m.versao ? 4 : 0) + (m.etiquetas ? 0 : 2) + (/\.flac$/i.test(m.arquivo) ? 0 : 1);
  return grupo.slice().sort((a, b) => nota(a) - nota(b))[0];
}

/**
 * O nome do MP3 de cada musica escolhida.
 *
 * A do jogo fica com o nome de sempre, que as perguntas ja usam. A nova ganha
 * o do titulo; se ele ja for de outra musica ("Perfect", "Stay"), entra o
 * artista no nome, como em trecho-perfect-simple-plan.
 */
function nomear(escolhidas, catalogoDoJogo) {
  const usados = new Set(catalogoDoJogo.map((m) => m.trecho));
  for (const m of escolhidas) if (m.trecho) m.slug = m.trecho;
  for (const m of escolhidas) {
    if (m.trecho) continue;
    const titulo = slug(m.titulo) || 'faixa';
    const primeiro = String(m.artista || '').split(/\s*[,;&/]\s*|\s+(?:feat|ft)\.?\s+/i)[0];
    let nome = titulo;
    if (usados.has(nome) && primeiro) nome = `${titulo}-${slug(primeiro)}`;
    for (let n = 2; usados.has(nome); n++) nome = `${titulo}-${n}`;
    usados.add(nome);
    m.slug = nome;
  }
}

/** Agrupa as entradas do catalogo por musica (artista principal + titulo). */
function porMusica(musicas) {
  const grupos = new Map();
  for (const m of musicas) {
    const chave = `${[...creditos(m.artista)][0] || ''}|${chaveTitulo(m.titulo)}`;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(m);
  }
  return [...grupos.values()];
}

/* ------------------------------- Corte ------------------------------- */

/** Corta e converte um arquivo, num temporario: se der errado, o antigo fica. */
function converter(origem, destino, { kbps, segundos }) {
  const temporario = `${destino}.novo.mp3`;
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-i', origem,
    '-vn', '-map_metadata', '-1', '-fflags', '+bitexact'];
  if (segundos > 0) args.push('-t', String(segundos));
  args.push(
    // Todo mundo no mesmo volume, como os trechos antigos.
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
    '-ar', '44100', '-ac', '2', '-c:a', 'libmp3lame', '-b:a', `${kbps}k`,
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

/** Quantos MB de MP3 as musicas dao, a tantos kbps e cortadas em tantos segundos. */
function pesoEmMb(musicas, { kbps, segundos }) {
  const total = musicas.reduce((soma, m) => soma + (segundos ? Math.min(segundos, m.duracao || segundos) : (m.duracao || 0)), 0);
  return (total * kbps * 1000) / 8 / 1048576;
}

/** O MP3 de destino ja esta pronto: existe e tem a duracao esperada. */
function jaPronto(destino, esperado) {
  if (!fs.existsSync(destino) || !esperado) return false;
  try {
    return Math.abs(duracaoDoMp3(destino) - esperado) <= 2;
  } catch {
    return false;
  }
}

/* ------------------------------ Execucao ------------------------------ */

function sair(mensagem) {
  console.error(mensagem);
  process.exit(1);
}

const argumento = (nome, padrao) => {
  const i = process.argv.indexOf(`--${nome}`);
  const valor = i >= 0 ? process.argv[i + 1] : undefined;
  return valor !== undefined && !valor.startsWith('--') ? valor : padrao;
};

if (require.main === module) {
  const de = path.resolve(RAIZ, argumento('de', 'public/musicas'));
  const para = path.resolve(RAIZ, argumento('para', 'public/audio'));
  const kbps = Number(argumento('kbps', 96));
  const segundos = Number(argumento('segundos', 0)); // 0 = a musica inteira
  const refazer = process.argv.includes('--refazer');
  const ondeCatalogo = path.resolve(RAIZ, argumento('catalogo', 'catalogo'));

  if (!Number.isInteger(kbps) || kbps < 48 || kbps > 320) sair('--kbps vai de 48 a 320.');
  if (!Number.isFinite(segundos) || segundos < 0 || (segundos > 0 && segundos < 45)) {
    sair('--segundos e 0 (a musica inteira) ou pelo menos 45.');
  }
  if (!fs.existsSync(de)) sair(`Nao achei ${de}. E ai que ficam as musicas inteiras (fora do git).`);
  if (spawnSync('ffmpeg', ['-version']).status !== 0) {
    sair('Nao achei o ffmpeg. Instale (Windows: winget install ffmpeg; Mac: brew install ffmpeg) e rode de novo.');
  }

  const c = montarCatalogo(de, CATALOGO);
  if (!c.musicas.length) sair(`Nenhum arquivo de audio em ${de}.`);

  // Uma por musica, e vinheta fica de fora.
  const escolhidas = [];
  for (const grupo of porMusica(c.musicas)) {
    const melhor = melhorDe(grupo);
    for (const m of grupo) if (m !== melhor) m.igualA = melhor.arquivo;
    if (melhor.duracao && melhor.duracao < FAIXA_CURTA) continue;
    escolhidas.push(melhor);
  }
  nomear(escolhidas, CATALOGO);

  console.log(`${c.musicas.length} arquivos, ${escolhidas.length} musicas para o jogo.`);
  const previsto = pesoEmMb(escolhidas, { kbps, segundos });
  console.log(`${segundos ? `Cada uma: os primeiros ${segundos}s` : 'Cada uma: inteira'}, a ${kbps} kbps — uns ${Math.round(previsto)} MB.\n`);
  if (previsto > MB_PESADO && !process.argv.includes('--mesmo-assim')) {
    const opcao = (k, seg) => `  npm run trechos -- --kbps ${k}${seg ? ` --segundos ${seg}` : ''}`.padEnd(48)
      + `uns ${Math.round(pesoEmMb(escolhidas, { kbps: k, segundos: seg }))} MB`;
    sair([
      `Passa de ${MB_PESADO} MB, pesado demais para o git: o GitHub pede o repositorio inteiro abaixo de 1 GB,`,
      'e o que entra no historico nao sai mais. Escolha um destes:',
      '',
      opcao(64, segundos),
      opcao(kbps, segundos || 150),
      opcao(64, segundos || 150),
      '',
      'ou rode com --mesmo-assim para converter assim mesmo.'
    ].join('\n'));
  }

  let feitas = 0;
  let prontas = 0;
  const falhas = [];
  fs.mkdirSync(para, { recursive: true });
  for (const m of escolhidas) {
    const destino = path.join(para, `trecho-${m.slug}.mp3`);
    const esperado = m.duracao ? (segundos ? Math.min(segundos, m.duracao) : m.duracao) : null;
    m.audio = `/audio/trecho-${m.slug}.mp3`;
    if (!refazer && jaPronto(destino, esperado)) {
      prontas += 1;
      continue;
    }
    try {
      converter(path.join(de, m.arquivo), destino, { kbps, segundos });
      feitas += 1;
      console.log(`ok     trecho-${m.slug}.mp3  <- ${m.arquivo}`);
    } catch (erro) {
      m.audio = null;
      falhas.push(`${m.arquivo}: ${erro.message}`);
      console.log(`ERRO   ${m.arquivo}: ${erro.message}`);
    }
  }

  escrever(c, { de, para: ondeCatalogo, por: 'npm run trechos' });

  const mb = escolhidas
    .map((m) => path.join(para, `trecho-${m.slug}.mp3`))
    .filter((f) => fs.existsSync(f))
    .reduce((soma, f) => soma + fs.statSync(f).size, 0) / 1048576;
  const novas = escolhidas.filter((m) => !m.trecho && m.audio).length;
  const doJogo = escolhidas.filter((m) => m.trecho && m.audio).length;

  console.log(`\n${feitas} convertidas agora, ${prontas} ja estavam prontas, ${falhas.length} com erro.`);
  console.log(`${doJogo} das ${CATALOGO.length} musicas do jogo agora estao inteiras; ${novas} sao novas.`);
  console.log(`${Math.round(mb)} MB de MP3 (${horas(escolhidas.reduce((s, m) => s + (m.duracao || 0), 0))} de musica).`);
  console.log('\nO catalogo (catalogo/musicas.md) diz que MP3 virou cada musica.');
  console.log('Musica inteira tem direito autoral: antes do push, confira que o repositorio no GitHub e privado.');
  console.log('Para enviar: git add catalogo public/audio && git commit -m "Acervo de musicas" && git push');
  process.exit(falhas.length && !feitas && !prontas ? 1 : 0);
}

module.exports = { melhorDe, nomear, porMusica, pesoEmMb, slug };
