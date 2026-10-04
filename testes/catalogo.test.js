'use strict';

/*
 * O catalogo do acervo e a conversao para MP3 (npm run catalogo e npm run
 * trechos). Os dois rodam no computador de quem tem as musicas, longe de
 * qualquer revisao: o que da para conferir sem os arquivos de verdade esta
 * aqui — as etiquetas, o nome tirado do caminho, a ligacao com as musicas do
 * jogo e a escolha entre arquivos duplicados.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const cat = require('./catalogo.js');
const { melhorDe, nomear, pesoEmMb } = require('./trechos.js');
const { CATALOGO } = require('../server/musicas.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(60), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'acervo-'));
const gravar = (nome, ...partes) => {
  const arquivo = path.join(pasta, nome);
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  fs.writeFileSync(arquivo, Buffer.concat(partes));
  return arquivo;
};

/* ---------------- FLAC: comentarios Vorbis e duracao ---------------- */
{
  const u32le = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
  const bloco = (tipo, ultimo, dados) => Buffer.concat([
    Buffer.from([(ultimo ? 0x80 : 0) | tipo, dados.length >> 16, (dados.length >> 8) & 0xff, dados.length & 0xff]),
    dados
  ]);
  // STREAMINFO: 44,1 kHz, estereo, 16 bits, 187 segundos.
  const info = Buffer.alloc(34);
  const taxa = 44100;
  const amostras = taxa * 187;
  info[10] = taxa >> 12;
  info[11] = (taxa >> 4) & 0xff;
  info[12] = ((taxa & 0x0f) << 4) | (1 << 1);
  info[13] = 15 << 4;
  info.writeUInt32BE(amostras, 14);
  const comentarios = ['TITLE=Infiel', 'ARTIST=Marília Mendonça', 'ALBUM=Realidade', 'DATE=2016-01-01'];
  const vorbis = Buffer.concat([u32le(6), Buffer.from('teste'), Buffer.from([0]).subarray(0, 1), u32le(comentarios.length),
    ...comentarios.flatMap((c) => [u32le(Buffer.byteLength(c)), Buffer.from(c)])]);
  // vendor de 6 bytes: "teste" + 1 byte
  const capa = Buffer.alloc(300 * 1024); // a capa e pulada sem ser lida
  const arquivo = gravar('Pasta/qualquer.flac', Buffer.from('fLaC'), bloco(0, false, info), bloco(4, false, vorbis), bloco(6, true, capa));
  conferir('FLAC: titulo, artista, album e ano das etiquetas',
    (({ titulo, artista, album, ano }) => [titulo, artista, album, ano])(cat.lerEtiquetas(arquivo)),
    ['Infiel', 'Marília Mendonça', 'Realidade', '2016-01-01']);
  conferir('FLAC: a duracao sai do STREAMINFO', cat.lerEtiquetas(arquivo).duracao, 187);
}

/* ---------------- MP3: ID3v2.3 em UTF-16 e ID3v2.4 em UTF-8 ---------------- */
{
  const quadro23 = (id, texto, utf16) => {
    const corpo = utf16
      ? Buffer.concat([Buffer.from([1, 0xff, 0xfe]), Buffer.from(texto, 'utf16le')])
      : Buffer.concat([Buffer.from([0]), Buffer.from(texto, 'latin1')]);
    const cab = Buffer.alloc(10);
    cab.write(id, 0, 'latin1');
    cab.writeUInt32BE(corpo.length, 4);
    return Buffer.concat([cab, corpo]);
  };
  const tag = (versao, quadros) => {
    const corpo = Buffer.concat(quadros);
    const n = corpo.length;
    return Buffer.concat([Buffer.from([0x49, 0x44, 0x33, versao, 0, 0,
      (n >> 21) & 0x7f, (n >> 14) & 0x7f, (n >> 7) & 0x7f, n & 0x7f]), corpo]);
  };
  // Um quadro MPEG de 128 kbps e 16000 bytes de audio: 1 segundo.
  const audio = Buffer.alloc(16000);
  audio.set([0xff, 0xfb, 0x90, 0x64]);
  const v23 = gravar('v23.mp3', tag(3, [quadro23('TIT2', 'É o Amor', true), quadro23('TPE1', 'Zezé Di Camargo & Luciano', false)]), audio);
  const lido = cat.lerEtiquetas(v23);
  conferir('ID3v2.3: titulo em UTF-16 e artista em Latin-1', [lido.titulo, lido.artista], ['É o Amor', 'Zezé Di Camargo & Luciano']);
  conferir('ID3v2.3: a duracao pula a etiqueta', lido.duracao, 1);

  const quadro24 = (id, texto) => {
    const corpo = Buffer.concat([Buffer.from([3]), Buffer.from(texto, 'utf8')]);
    const n = corpo.length;
    const cab = Buffer.from([...Buffer.from(id, 'latin1'), (n >> 21) & 0x7f, (n >> 14) & 0x7f, (n >> 7) & 0x7f, n & 0x7f, 0, 0]);
    return Buffer.concat([cab, corpo]);
  };
  const v24 = gravar('v24.mp3', tag(4, [quadro24('TIT2', 'Envolver'), quadro24('TPE1', 'Anitta\u0000Outro Artista')]), audio);
  conferir('ID3v2.4: varios artistas separados por \\0', cat.lerEtiquetas(v24).artista, 'Anitta, Outro Artista');
  conferir('arquivo que nao e audio volta vazio, sem quebrar',
    cat.lerEtiquetas(gravar('lixo.flac', Buffer.from('nada aqui'))), {});
}

/* ---------------- Nome do arquivo, para quem nao tem etiqueta ---------------- */
{
  conferir('"Artista/Album/05 Titulo"', cat.doCaminho('Coldplay/Parachutes/05 Yellow.flac'), { titulo: 'Yellow', artista: 'Coldplay' });
  conferir('"Artista - Titulo (Official Video)"', cat.doCaminho('Downloads/Michael Jackson - Billie Jean (Official Video).webm'),
    { titulo: 'Billie Jean', artista: 'Michael Jackson' });
  conferir('numero de um digito e titulo, nao faixa', cat.doCaminho('Ariana Grande/7 rings.mp3').titulo, '7 rings');
  conferir('pasta de genero nao vira artista', cat.doCaminho('Sertanejo/Faixa.flac').artista, null);
}

/* ---------------- Chaves de titulo e de artista ---------------- */
{
  conferir('versao depois do traco nao conta', cat.chaveTitulo('Hey Jude - Remastered 2015'), cat.chaveTitulo('Hey Jude'));
  conferir('"(Ao Vivo)" nao conta', cat.chaveTitulo('Infiel (Ao Vivo)'), 'infiel');
  conferir('"Stay" e "Stay with Me" sao outras', cat.mesmoTitulo(cat.chaveTitulo('Stay'), cat.chaveTitulo('Stay with Me')), false);
  conferir('"&" e "e" sao a mesma dupla', cat.chaveArtista('Henrique & Juliano'), cat.chaveArtista('Henrique e Juliano'));
  conferir('participacao vira credito', cat.creditos('Marília Mendonça, Maiara & Maraisa').has(cat.chaveArtista('Maiara & Maraisa')), true);
  conferir('"Drake Bell" nao e o Drake', cat.creditos('Drake Bell').has('drake'), false);
  conferir('"AC/DC" e "HUNTR/X" ficam inteiros',
    [cat.creditos('AC/DC').has('acdc'), cat.creditos('HUNTR/X, EJAE').has('huntrx')], [true, true]);
}

/* ---------------- Ligar ao jogo ---------------- */
{
  // Cada musica do jogo, escrita como as etiquetas escreveriam, liga a ela mesma.
  const entradas = CATALOGO.map((m) => ({
    titulo: m.nome ? m.nome.resposta : m.trecho.replace(/-/g, ' '),
    artista: m.quem ? m.quem.resposta : null,
    esperado: m.trecho
  }));
  cat.ligarAoJogo(entradas, CATALOGO);
  conferir('as 93 musicas do jogo se reconhecem pelas etiquetas',
    entradas.filter((e) => e.trecho !== e.esperado).map((e) => `${e.titulo}: ${e.trecho}`), []);
  const semArtista = [{ titulo: 'Perfect', artista: null }];
  cat.ligarAoJogo(semArtista, CATALOGO);
  conferir('"Perfect" sem artista serve para duas: fica sem ligacao', semArtista[0].trecho, null);
}

/* ---------------- Escolha entre duplicadas e nome do MP3 ---------------- */
{
  const estudio = { arquivo: 'a.flac', versao: null, etiquetas: true };
  const aoVivo = { arquivo: 'b.flac', versao: 'ao vivo', etiquetas: true };
  const mp3 = { arquivo: 'c.mp3', versao: null, etiquetas: true };
  conferir('entre duplicadas fica a de estudio, em FLAC', melhorDe([aoVivo, mp3, estudio]).arquivo, 'a.flac');

  const escolhidas = [
    { trecho: 'yellow', titulo: 'Yellow', artista: 'Coldplay' },
    { trecho: null, titulo: 'Infiel', artista: 'Marília Mendonça' },
    { trecho: null, titulo: 'Stay', artista: 'Rihanna, Mikky Ekko' },
    { trecho: null, titulo: 'Stay', artista: 'Zedd & Alessia Cara' }
  ];
  nomear(escolhidas, CATALOGO);
  conferir('a do jogo fica com o nome de sempre; as novas, pelo titulo e, se repetir, pelo artista',
    escolhidas.map((m) => m.slug), ['yellow', 'infiel', 'stay-rihanna', 'stay-zedd']);

  // 100 musicas de 3:30 a 96 kbps: o peso que o script avisa antes de converter.
  const cem = Array.from({ length: 100 }, () => ({ duracao: 210 }));
  conferir('peso: 100 musicas de 3:30 a 96 kbps dao uns 240 MB', Math.round(pesoEmMb(cem, { kbps: 96, segundos: 0 })), 240);
  conferir('peso: cortadas em 2:30 a 64 kbps, uns 114 MB', Math.round(pesoEmMb(cem, { kbps: 64, segundos: 150 })), 114);
}

fs.rmSync(pasta, { recursive: true, force: true });
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
