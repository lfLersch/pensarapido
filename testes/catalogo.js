'use strict';

/*
 * Catalogo do acervo: o que tem na pasta das musicas inteiras.
 *
 *   npm run catalogo                      le public/musicas
 *   npm run catalogo -- --de ~/Musicas    outra pasta
 *
 * De cada arquivo sai titulo, artista, album, ano e duracao, lidos das
 * etiquetas — FLAC e MP3 aqui mesmo; os outros formatos pelo ffprobe, se ele
 * estiver instalado. Arquivo sem etiqueta usa o nome do arquivo e o das
 * pastas ("Coldplay/Parachutes/05 Yellow.flac"). O resultado vai para:
 *
 *   catalogo/musicas.md    para ler: por artista, com o que pede atencao
 *   catalogo/musicas.json  para o jogo e para quem mexer no acervo depois
 *
 * A pasta das musicas fica fora do git, mas estes dois arquivos sao pequenos
 * e podem ir para o repositorio: e por eles que da para saber o que tem no
 * acervo sem ter a pasta na mao.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { duracaoDoMp3 } = require('../server/trechos');

const RAIZ = path.join(__dirname, '..');
const EXTENSOES = ['.flac', '.mp3', '.m4a', '.wav', '.ogg', '.opus', '.aac', '.wma', '.aiff', '.webm'];
const MAX_ETIQUETA = 16 * 1024 * 1024; // ID3 maior que isto e quase tudo capa de album

/* ------------------------------- Texto ------------------------------- */

const semAcento = (texto) => String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '');

// O que vem depois de " - " ou entre parenteses e e versao, nao nome:
// "Hey Jude - Remastered 2015", "Infiel (Ao Vivo)".
const VERSAO = /\b(remaster\w*|ao vivo|en vivo|live|ac[uú]stic[oa]|acoustic|unplugged|radio edit|edit|single version|album version|vers[aã]o|version|mono|stereo|deluxe|bonus|demo|instrumental|karaok[eê]|playback|extended|remix|mix|sped up|slowed|feat\.?|ft\.?)\b/i;

/** A chave de um titulo, para comparar: sem versao, participacao, acento nem pontuacao. */
function chaveTitulo(titulo) {
  let s = semAcento(titulo).toLowerCase();
  s = s.replace(/\[[^\]]*\]/g, ' ').replace(/\([^)]*\)/g, ' ');
  s = s.replace(/\s(feat|ft|featuring|part)\.?\s.*$/, ' ');
  const partes = s.split(/\s+[-–—]\s+/);
  if (partes.length > 1 && VERSAO.test(partes.slice(1).join(' '))) s = partes[0];
  return s.replace(/[^a-z0-9]/g, '');
}

/** "Hey Jude" e "Hey Jude, Pt. 2" sao a mesma; "Stay" e "Stay with Me" nao. */
function mesmoTitulo(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const [curto, longo] = a.length <= b.length ? [a, b] : [b, a];
  return (curto.length >= 6 && longo.startsWith(curto)) || (curto.length >= 10 && longo.includes(curto));
}

/** A chave de um nome de artista: "The Weeknd" e "Weeknd", "Jorge & Mateus" e "Jorge e Mateus". */
function chaveArtista(nome) {
  return semAcento(nome).toLowerCase()
    .replace(/^(the|os|as|o|a)\s+/, '')
    .replace(/\s+(&|e|and|y|n'?)\s+/g, ' ')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Todos os artistas de um credito, em chave.
 *
 * Separa participacao ("feat.", virgula, ponto e virgula) e, numa segunda
 * leva, dupla ("&", " e "). A barra so separa quando dos dois lados ha nome
 * de verdade: "Marilia Mendonca/Maiara & Maraisa" sao dois, mas "AC/DC" e
 * "HUNTR/X" sao um so. O credito inteiro sempre entra tambem, senao
 * "Chiclete com Banana" e "Earth, Wind & Fire" se perderiam.
 */
function creditos(nome) {
  const texto = String(nome || '').replace(/(\p{L}{3,})\s*\/\s*(?=\p{L}{3,})/gu, '$1, ');
  const fortes = texto.split(/\s*[,;+]\s*|\s+(?:feat|ft|featuring|part|participa[cç][aã]o)\.?\s+/i);
  const fracas = fortes.flatMap((c) => c.split(/\s+(?:&|e|and|y)\s+/i));
  return new Set([nome, ...fortes, ...fracas].map(chaveArtista).filter(Boolean));
}

/** Tira do nome o lixo de video baixado: "(Official Video)", "[Lyrics]", "(Clipe Oficial)". */
function limparTitulo(titulo) {
  return String(titulo || '')
    .replace(/_/g, ' ')
    .replace(/[[(][^\])]*\b(official|oficial|lyrics?|letra|v[ií]deo|clipe|[aá]udio|visuali[sz]\w*|hd|4k|hq|mv)\b[^\])]*[\])]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** O que torna a gravacao ruim para o quiz: plateia, outro arranjo, sem voz. */
function versaoDe(titulo, album) {
  const t = semAcento(titulo).toLowerCase();
  const a = semAcento(album).toLowerCase();
  if (/\bao vivo\b|\ben vivo\b|\(live\b|[-–] live\b|\blive (at|in|from)\b/.test(t) || /\bao vivo\b|\blive (at|in|from)\b/.test(a)) return 'ao vivo';
  if (/\bacustic[oa]\b|\bacoustic\b|\bunplugged\b/.test(t) || /\bacustic[oa]\b|\bunplugged\b/.test(a)) return 'acustico';
  if (/\bremix\b/.test(t)) return 'remix';
  if (/\binstrumental\b|\bkaraok[e]\b|\bplayback\b/.test(t)) return 'sem voz';
  if (/\bsped up\b|\bslowed\b|\bacelerad[ao]\b/.test(t)) return 'acelerada';
  return null;
}

/* ----------------------------- Etiquetas ----------------------------- */

function ler(fd, posicao, quantos) {
  const buffer = Buffer.alloc(Math.max(0, quantos));
  const lidos = fs.readSync(fd, buffer, 0, buffer.length, posicao);
  return buffer.subarray(0, lidos);
}

const synchsafe = (b, i) => ((b[i] & 0x7f) << 21) | ((b[i + 1] & 0x7f) << 14) | ((b[i + 2] & 0x7f) << 7) | (b[i + 3] & 0x7f);

/** Juntando valores repetidos: o FLAC pode ter um ARTIST por artista. */
function juntar(tags, chave, valor) {
  const limpo = String(valor || '').trim();
  if (!limpo) return;
  tags[chave] = tags[chave] && !tags[chave].split(', ').includes(limpo) ? `${tags[chave]}, ${limpo}` : limpo;
}

/** Os comentarios Vorbis do FLAC: "TITLE=Yellow", "ARTIST=Coldplay"... */
function comentariosVorbis(b) {
  const tags = {};
  let p = 0;
  try {
    const vendor = b.readUInt32LE(p);
    p += 4 + vendor;
    const quantos = b.readUInt32LE(p);
    p += 4;
    for (let i = 0; i < quantos && p + 4 <= b.length; i++) {
      const tamanho = b.readUInt32LE(p);
      p += 4;
      const texto = b.toString('utf8', p, p + tamanho);
      p += tamanho;
      const igual = texto.indexOf('=');
      if (igual > 0) juntar(tags, texto.slice(0, igual).toLowerCase(), texto.slice(igual + 1));
    }
  } catch {
    // Comentario cortado: fica o que deu para ler.
  }
  return tags;
}

/** FLAC: os blocos de metadados, pulando a capa sem ler. */
function lerFlac(fd, inicio) {
  if (ler(fd, inicio, 4).toString('latin1') !== 'fLaC') return null;
  let pos = inicio + 4;
  let vorbis = {};
  let duracao = null;
  for (let i = 0; i < 256; i++) {
    const cab = ler(fd, pos, 4);
    if (cab.length < 4) break;
    const tipo = cab[0] & 0x7f;
    const tamanho = (cab[1] << 16) | (cab[2] << 8) | cab[3];
    pos += 4;
    if (tipo === 0 && tamanho >= 18) {
      const b = ler(fd, pos, 18);
      const taxa = (b[10] << 12) | (b[11] << 4) | (b[12] >> 4);
      const amostras = (b[13] & 0x0f) * 2 ** 32 + b.readUInt32BE(14);
      if (taxa && amostras) duracao = amostras / taxa;
    } else if (tipo === 4) {
      vorbis = comentariosVorbis(ler(fd, pos, tamanho));
    }
    pos += tamanho;
    if (cab[0] & 0x80) break; // ultimo bloco
  }
  return {
    titulo: vorbis.title,
    artista: vorbis.artist || vorbis.albumartist || vorbis['album artist'] || vorbis.album_artist,
    album: vorbis.album,
    ano: vorbis.date || vorbis.year || vorbis.originaldate,
    genero: vorbis.genre,
    duracao
  };
}

/** Texto de um quadro do ID3: o primeiro byte diz a codificacao. */
function textoId3(d) {
  if (!d.length) return '';
  const corpo = d.subarray(1);
  let texto;
  if (d[0] === 0) texto = corpo.toString('latin1');
  else if (d[0] === 3) texto = corpo.toString('utf8');
  else if (d[0] === 1 || d[0] === 2) {
    const partes = [];
    let p = 0;
    while (p + 1 < corpo.length) {
      let bigEndian = d[0] === 2;
      if (corpo[p] === 0xff && corpo[p + 1] === 0xfe) { bigEndian = false; p += 2; }
      else if (corpo[p] === 0xfe && corpo[p + 1] === 0xff) { bigEndian = true; p += 2; }
      let fim = p;
      while (fim + 1 < corpo.length && !(corpo[fim] === 0 && corpo[fim + 1] === 0)) fim += 2;
      const pedaco = Buffer.from(corpo.subarray(p, fim));
      if (bigEndian) pedaco.swap16();
      partes.push(pedaco.toString('utf16le'));
      p = fim + 2;
    }
    texto = partes.join('\u0000');
  } else return '';
  // O ID3v2.4 separa varios valores com \0 ("Artista 1\0Artista 2").
  return texto.split('\u0000').map((s) => s.trim()).filter(Boolean).join(', ');
}

const QUADROS = {
  TIT2: 'titulo', TPE1: 'artista', TPE2: 'artistaAlbum', TALB: 'album', TYER: 'ano', TDRC: 'ano', TCON: 'genero',
  TT2: 'titulo', TP1: 'artista', TP2: 'artistaAlbum', TAL: 'album', TYE: 'ano', TCO: 'genero'
};

/** Desfaz o "unsynchronisation" do ID3: todo FF 00 volta a ser FF. */
function desfazerUnsync(b) {
  const saida = [];
  for (let i = 0; i < b.length; i++) {
    saida.push(b[i]);
    if (b[i] === 0xff && b[i + 1] === 0x00) i++;
  }
  return Buffer.from(saida);
}

/** ID3v2 (2.2, 2.3 e 2.4), no comeco do MP3. */
function lerId3v2(fd) {
  const cab = ler(fd, 0, 10);
  if (cab.length < 10 || cab.toString('latin1', 0, 3) !== 'ID3') return null;
  const versao = cab[3];
  let corpo = ler(fd, 10, Math.min(synchsafe(cab, 6), MAX_ETIQUETA));
  if (cab[5] & 0x80 && versao < 4) corpo = desfazerUnsync(corpo);

  let p = 0;
  if (cab[5] & 0x40 && corpo.length >= 4) p = versao === 4 ? synchsafe(corpo, 0) : 4 + corpo.readUInt32BE(0);
  const curto = versao === 2;
  const tags = {};
  while (p + (curto ? 6 : 10) <= corpo.length) {
    const id = corpo.toString('latin1', p, p + (curto ? 3 : 4));
    if (!/^[A-Z0-9]{3,4}$/.test(id)) break; // acabaram os quadros: e enchimento
    const tamanho = curto
      ? (corpo[p + 3] << 16) | (corpo[p + 4] << 8) | corpo[p + 5]
      : (versao === 4 ? synchsafe(corpo, p + 4) : corpo.readUInt32BE(p + 4));
    const inicio = p + (curto ? 6 : 10);
    let dados = corpo.subarray(inicio, inicio + tamanho);
    const nome = QUADROS[id];
    if (nome && !tags[nome]) {
      const formato = curto ? 0 : corpo[p + 9];
      // Comprimido ou cifrado: nao da para ler sem mais trabalho, e e raro em texto.
      const fechado = versao === 4 ? formato & 0x0c : formato & 0xc0;
      if (!fechado) {
        if (versao === 4 && formato & 0x40) dados = dados.subarray(1);
        if (versao === 4 && formato & 0x01) dados = dados.subarray(4);
        if (versao === 4 && formato & 0x02) dados = desfazerUnsync(dados);
        tags[nome] = textoId3(dados);
      }
    }
    if (tamanho <= 0) break;
    p = inicio + tamanho;
  }
  return tags;
}

/** ID3v1: os ultimos 128 bytes do MP3, com campos de tamanho fixo. */
function lerId3v1(fd, tamanhoArquivo) {
  if (tamanhoArquivo < 128) return {};
  const b = ler(fd, tamanhoArquivo - 128, 128);
  if (b.toString('latin1', 0, 3) !== 'TAG') return {};
  const campo = (de, ate) => b.toString('latin1', de, ate).replace(/\0[\s\S]*$/, '').trim();
  return { titulo: campo(3, 33), artista: campo(33, 63), album: campo(63, 93), ano: campo(93, 97) };
}

function lerMp3(caminho, fd) {
  const v2 = lerId3v2(fd) || {};
  const v1 = lerId3v1(fd, fs.fstatSync(fd).size);
  let duracao = null;
  try {
    duracao = duracaoDoMp3(caminho);
  } catch {
    duracao = null;
  }
  return {
    titulo: v2.titulo || v1.titulo,
    artista: v2.artista || v2.artistaAlbum || v1.artista,
    album: v2.album || v1.album,
    ano: v2.ano || v1.ano,
    genero: v2.genero ? v2.genero.replace(/^\(\d+\)\s*/, '') : null,
    duracao
  };
}

let ffprobe = null;
function temFfprobe() {
  if (ffprobe === null) ffprobe = spawnSync('ffprobe', ['-version']).status === 0;
  return ffprobe;
}

/** Os outros formatos (M4A, OGG, OPUS, WAV...): pelo ffprobe, se ele existir. */
function lerComFfprobe(caminho) {
  if (!temFfprobe()) return {};
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:format_tags', '-of', 'json', caminho],
    { encoding: 'utf8' });
  if (r.status !== 0) return {};
  try {
    const formato = JSON.parse(r.stdout).format || {};
    const tags = Object.fromEntries(Object.entries(formato.tags || {}).map(([k, v]) => [k.toLowerCase(), v]));
    return {
      titulo: tags.title,
      artista: tags.artist || tags.album_artist,
      album: tags.album,
      ano: tags.date || tags.year,
      genero: tags.genre,
      duracao: Number(formato.duration) || null
    };
  } catch {
    return {};
  }
}

/** As etiquetas de um arquivo, pelo formato dele. Nunca lanca: arquivo estranho volta vazio. */
function lerEtiquetas(caminho) {
  const extensao = path.extname(caminho).toLowerCase();
  let fd;
  try {
    fd = fs.openSync(caminho, 'r');
    if (extensao === '.flac') {
      // Alguns FLAC trazem um ID3 na frente do "fLaC".
      const cab = ler(fd, 0, 10);
      const inicio = cab.toString('latin1', 0, 3) === 'ID3' ? 10 + synchsafe(cab, 6) + (cab[5] & 0x10 ? 10 : 0) : 0;
      return lerFlac(fd, inicio) || {};
    }
    if (extensao === '.mp3') return lerMp3(caminho, fd);
  } catch {
    return {};
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
  return lerComFfprobe(caminho);
}

/* --------------------------- Nome do arquivo --------------------------- */

// Pasta que agrupa, nao e artista: "Sertanejo/Infiel.flac", "Downloads/...".
const PASTAS_GENERICAS = new Set(['musicas', 'musica', 'music', 'novas', 'novos', 'downloads', 'download',
  'flac', 'mp3', 'albuns', 'album', 'singles', 'playlist', 'playlists', 'varios', 'variosartistas', 'variousartists',
  'sertanejo', 'funk', 'pagode', 'samba', 'mpb', 'rock', 'pop', 'rap', 'hiphop', 'axe', 'forro', 'piseiro',
  'gospel', 'eletronica', 'electronic', 'kpop', 'latina', 'latino', 'reggaeton', 'trilhas', 'trilha', 'anime',
  'nacional', 'nacionais', 'internacional', 'internacionais', 'gringa', 'gringas', 'brasil', 'brasileiras']);

/**
 * Titulo e artista tirados do caminho, para o arquivo sem etiqueta.
 *
 * "Artista - Titulo.ext" e o padrao dos baixadores; sem traco, o artista vem
 * da pasta ("Artista/Album/05 Titulo.ext" ou "Artista/Titulo.ext"). O numero
 * da faixa sai da frente, mas so com dois digitos ou separador: "7 rings" e
 * titulo inteiro.
 */
function doCaminho(relativo) {
  const partes = relativo.split(/[\\/]/);
  const arquivo = partes.pop();
  let nome = limparTitulo(arquivo.replace(/\.[^.]+$/, ''));
  nome = nome.replace(/^(?:\d{1,2}[-.]\d{1,3}|\d{2,3})(?:\s*[-._)]\s*|\s+)/, '');

  let artista = null;
  let titulo = nome;
  const traco = nome.split(/\s+[-–—]\s+/);
  if (traco.length >= 2 && traco[0].trim()) {
    artista = traco[0].trim();
    titulo = traco.slice(1).join(' - ').trim();
  }
  if (!artista) {
    const pastas = partes.filter((p) => !PASTAS_GENERICAS.has(chaveArtista(p)));
    // Com duas pastas ou mais, a ultima costuma ser o album: o artista e a anterior.
    artista = pastas.length >= 2 ? pastas[pastas.length - 2] : (pastas[0] || null);
  }
  return { titulo, artista };
}

/* ------------------------------ O jogo ------------------------------ */

/**
 * Liga cada arquivo a uma das musicas que o jogo ja usa, se for uma delas.
 * O titulo precisa bater; o artista, quando o arquivo diz qual e, tambem —
 * sao dois "Perfect", o do Ed Sheeran e o do Simple Plan. Arquivo que serve
 * para duas fica sem ligacao: melhor nada do que a errada.
 */
function ligarAoJogo(entradas, catalogoDoJogo) {
  const doJogo = catalogoDoJogo.map((m) => ({
    trecho: m.trecho,
    titulos: [...(m.nome ? [m.nome.resposta, ...(m.nome.aceita || [])] : []), m.trecho.replace(/-/g, ' ')]
      .map(chaveTitulo).filter(Boolean),
    artistas: (m.quem ? [m.quem.resposta, ...(m.quem.aceita || [])] : []).map(chaveArtista).filter(Boolean)
  }));
  for (const entrada of entradas) {
    const titulo = chaveTitulo(entrada.titulo);
    const deQuem = entrada.artista ? creditos(entrada.artista) : null;
    const servem = doJogo.filter((m) => m.titulos.some((t) => mesmoTitulo(t, titulo))
      && (!deQuem || !m.artistas.length || m.artistas.some((a) => deQuem.has(a))));
    entrada.trecho = servem.length === 1 ? servem[0].trecho : null;
  }
}

/* ------------------------------ Catalogo ------------------------------ */

function listar(pasta, prefixo = '') {
  const achados = [];
  for (const item of fs.readdirSync(pasta, { withFileTypes: true })) {
    const relativo = prefixo ? `${prefixo}/${item.name}` : item.name;
    if (item.isDirectory()) achados.push(...listar(path.join(pasta, item.name), relativo));
    else if (EXTENSOES.includes(path.extname(item.name).toLowerCase())) achados.push(relativo);
  }
  return achados;
}

/** Uma entrada do catalogo: etiquetas, e o nome do arquivo para o que faltar. */
function catalogarArquivo(pasta, relativo) {
  const tags = lerEtiquetas(path.join(pasta, relativo));
  const doNome = doCaminho(relativo);
  let titulo = limparTitulo(tags.titulo) || doNome.titulo;
  const artista = String(tags.artista || '').trim() || doNome.artista;
  // Video baixado traz "Artista - Titulo" dentro do proprio titulo.
  const traco = titulo.split(/\s+[-–—]\s+/);
  if (traco.length >= 2 && artista && creditos(artista).has(chaveArtista(traco[0]))) {
    titulo = traco.slice(1).join(' - ');
  }
  const ano = Number((String(tags.ano || '').match(/\d{4}/) || [])[0]) || null;
  return {
    arquivo: relativo,
    titulo,
    artista: artista || null,
    album: tags.album || null,
    ano,
    genero: tags.genero || null,
    duracao: Number.isFinite(tags.duracao) && tags.duracao > 0 ? Math.round(tags.duracao) : null,
    versao: versaoDe(titulo, tags.album),
    etiquetas: Boolean(tags.titulo && tags.artista),
    trecho: null
  };
}

const ordem = (a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });

/** Le a pasta inteira e monta o catalogo, com o que pede atencao. */
function montarCatalogo(pasta, catalogoDoJogo) {
  const musicas = listar(pasta).map((relativo) => catalogarArquivo(pasta, relativo));
  ligarAoJogo(musicas, catalogoDoJogo);
  musicas.sort((a, b) => ordem(a.artista || '~', b.artista || '~') || ordem(a.titulo, b.titulo));

  const grupos = new Map();
  for (const m of musicas) {
    const chave = `${[...creditos(m.artista)][0] || ''}|${chaveTitulo(m.titulo)}`;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(m);
  }
  const ligados = new Set(musicas.map((m) => m.trecho).filter(Boolean));
  return {
    musicas,
    artistas: new Set(musicas.map((m) => chaveArtista(m.artista)).filter(Boolean)).size,
    segundos: musicas.reduce((soma, m) => soma + (m.duracao || 0), 0),
    duplicadas: [...grupos.values()].filter((g) => g.length > 1),
    versoes: musicas.filter((m) => m.versao),
    semEtiqueta: musicas.filter((m) => !m.etiquetas),
    curtas: musicas.filter((m) => m.duracao && m.duracao < 60),
    totalDoJogo: catalogoDoJogo.length,
    trechosSemArquivo: catalogoDoJogo.filter((m) => !ligados.has(m.trecho))
  };
}

/* ------------------------------- Saida ------------------------------- */

const minutos = (s) => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : '');
const celula = (texto) => String(texto ?? '').replace(/\|/g, '\\|');
const quem = (m) => `${m.artista || '?'} — ${m.titulo}`;
const nomeNoJogo = (m) => (m.nome ? m.nome.resposta : m.trecho);

function horas(segundos) {
  const h = Math.floor(segundos / 3600);
  const min = Math.round((segundos % 3600) / 60);
  return h ? `${h} h ${min} min` : `${min} min`;
}

function markdown(c, { pasta, data }) {
  const novas = c.musicas.filter((m) => !m.trecho).length;
  const doJogo = c.trechosSemArquivo.length;
  const linhas = [
    '# Catalogo do acervo',
    '',
    `Gerado por \`npm run catalogo\` em ${data}, da pasta \`${pasta}\`.`,
    '',
    `**${c.musicas.length} musicas** de **${c.artistas} artistas**, ${horas(c.segundos)} de musica.`,
    '',
    `- **${c.totalDoJogo - doJogo} de ${c.totalDoJogo}** musicas do jogo tem o arquivo inteiro aqui.`
      + (doJogo ? ` Faltam: ${c.trechosSemArquivo.map(nomeNoJogo).join(', ')}.` : ''),
    `- **${novas} novas**, que ainda nao estao no jogo.`,
    ''
  ];

  const conferir = [
    ['Duplicadas', c.duplicadas.map((g) => `${quem(g[0])}: ${g.map((m) => `\`${m.arquivo}\``).join(', ')}`)],
    ['Versoes ruins para o quiz (plateia, outro arranjo, sem voz)', c.versoes.map((m) => `${quem(m)} (${m.versao})`)],
    ['Sem etiqueta: titulo e artista sairam do nome do arquivo', c.semEtiqueta.map((m) => `\`${m.arquivo}\` → ${quem(m)}`)],
    ['Curtas demais (menos de 1 minuto)', c.curtas.map((m) => `${quem(m)} (${minutos(m.duracao)})`)]
  ].filter(([, itens]) => itens.length);
  if (conferir.length) {
    linhas.push('## Para conferir', '');
    for (const [titulo, itens] of conferir) {
      linhas.push(`### ${titulo} (${itens.length})`, '', ...itens.map((i) => `- ${i}`), '');
    }
  }

  linhas.push('## Musicas', '', '| Artista | Musica | Album | Ano | Duracao | No jogo |', '| --- | --- | --- | --- | --- | --- |');
  for (const m of c.musicas) {
    linhas.push(`| ${celula(m.artista || '?')} | ${celula(m.titulo)}${m.versao ? ` _(${m.versao})_` : ''} | ${
      celula(m.album || '')} | ${m.ano || ''} | ${minutos(m.duracao)} | ${m.trecho ? 'sim' : ''} |`);
  }
  return `${linhas.join('\n')}\n`;
}

function json(c, { pasta, data }) {
  return `${JSON.stringify({
    geradoEm: data,
    pasta,
    total: c.musicas.length,
    musicas: c.musicas,
    trechosSemArquivo: c.trechosSemArquivo.map((m) => m.trecho)
  }, null, 2)}\n`;
}

/** Le a pasta, escreve os dois arquivos e devolve o catalogo. */
function catalogar({ de, para, catalogoDoJogo }) {
  const c = montarCatalogo(de, catalogoDoJogo);
  const meta = {
    pasta: path.relative(RAIZ, de).split(path.sep).join('/') || '.',
    data: new Date().toISOString().slice(0, 10)
  };
  fs.mkdirSync(para, { recursive: true });
  fs.writeFileSync(path.join(para, 'musicas.md'), markdown(c, meta), 'utf8');
  fs.writeFileSync(path.join(para, 'musicas.json'), json(c, meta), 'utf8');
  return c;
}

/* ------------------------------ Execucao ------------------------------ */

if (require.main === module) {
  const argumento = (nome, padrao) => {
    const i = process.argv.indexOf(`--${nome}`);
    return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : padrao;
  };
  const de = path.resolve(RAIZ, argumento('de', 'public/musicas'));
  const para = path.resolve(RAIZ, argumento('para', 'catalogo'));
  if (!fs.existsSync(de)) {
    console.error(`Nao achei ${de}. Ponha as musicas la, ou diga onde estao: npm run catalogo -- --de <pasta>`);
    process.exit(1);
  }
  const { CATALOGO } = require('../server/musicas');
  const c = catalogar({ de, para, catalogoDoJogo: CATALOGO });
  if (!c.musicas.length) {
    console.error(`Nenhum arquivo de audio em ${de}.`);
    process.exit(1);
  }
  const ligados = c.totalDoJogo - c.trechosSemArquivo.length;
  console.log(`${c.musicas.length} musicas de ${c.artistas} artistas (${horas(c.segundos)}).`);
  console.log(`${ligados} das ${c.totalDoJogo} musicas do jogo tem o arquivo inteiro; ${c.musicas.filter((m) => !m.trecho).length} sao novas.`);
  console.log(`Para conferir: ${c.duplicadas.length} duplicadas, ${c.versoes.length} versoes ao vivo/remix/acustico, `
    + `${c.semEtiqueta.length} sem etiqueta, ${c.curtas.length} curtas.`);
  if (!temFfprobe() && c.musicas.some((m) => !['.flac', '.mp3'].includes(path.extname(m.arquivo).toLowerCase()))) {
    console.log('Sem o ffprobe, os arquivos que nao sao FLAC nem MP3 ficaram so com o nome do arquivo.');
  }
  console.log(`\nCatalogo em ${path.relative(RAIZ, para)}/musicas.md e ${path.relative(RAIZ, para)}/musicas.json.`);
  console.log('Faca commit desses dois arquivos: sao pequenos, e e por eles que da para ver o acervo sem a pasta.');
}

module.exports = {
  chaveTitulo, chaveArtista, creditos, mesmoTitulo, limparTitulo, versaoDe, doCaminho,
  lerEtiquetas, ligarAoJogo, montarCatalogo, catalogar, markdown
};
