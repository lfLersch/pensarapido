'use strict';

/*
 * Baixa do Google Imagens uma imagem para cada item de uma lista.
 *
 * A lista e um .txt com um nome por linha:
 *
 *   # linha que comeca com # e comentario
 *   [logo]                  o que vem abaixo vira logo-<nome>.jpg, e a busca
 *   Ferrari                 leva a palavra "logo" junto: "Ferrari logo"
 *   Puma | esportiva        o que vem depois do | entra so na busca
 *   [ator]
 *   Jim Carrey
 *   Fernanda Torres #2      #2 comeca do segundo resultado (o primeiro veio errado)
 *   Tony Ramos https://...  com o endereco da imagem no fim, baixa essa, sem buscar
 *
 * As imagens vao para imagens-para-avaliar/ (fora do git), com o nome sem
 * acento: logo-ferrari.jpg, ator-jim-carrey.jpg. Abra avaliar.html, que fica
 * na mesma pasta, para ver todas de uma vez; as aprovadas voce passa para
 * public/img. O que ja existe numa das duas pastas nao e baixado de novo: para
 * trocar uma imagem errada, apague o arquivo e rode de novo com #2, #3...
 *
 * O Google fechou a API de busca para quem chega agora, entao a busca passa
 * por um servico que devolve os resultados do Google Imagens. Serve qualquer
 * um dos dois, com a chave num arquivo .env na raiz (fora do git):
 *
 *   SERPER_API_KEY=...   serper.dev  — 2500 buscas gratis, uma vez so
 *   SERPAPI_KEY=...      serpapi.com — 250 buscas gratis por mes
 *
 * Linha com endereco de imagem nao precisa de chave.
 *
 *   npm run baixar-imagens                     le imagens-para-baixar.txt
 *   npm run baixar-imagens -- outra-lista.txt
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const PASTA = path.join(RAIZ, 'imagens-para-avaliar');
const JOGO = path.join(RAIZ, 'public', 'img');
const ORIGEM = path.join(PASTA, 'origem.json');
const PAGINA = path.join(PASTA, 'avaliar.html');
const LISTA_PADRAO = path.join(RAIZ, 'imagens-para-baixar.txt');
const EXTENSOES = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'];
const AGENTE = 'Mozilla/5.0 (compatible; PensaRapido/1.0; jogo de perguntas)';

const CANDIDATOS = 5;               // resultados tentados antes de desistir
const MINIMO = 1536;                // menos que isso e icone ou pixel de rastreio (logo-amazon tem 3,6 KB)
const MAXIMO = 3 * 1024 * 1024;     // mais que isso segura a rodada no celular
const GRANDE = 500 * 1024;          // so avisa: a mediana de public/img e 45 KB
const PAUSA = 300;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;
const escapar = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const MODELO = `# Um nome por linha. Tire o # da frente para valer.
#
# [logo]               o que vem abaixo vira logo-<nome>.jpg e a busca leva "logo"
# Ferrari
# Puma | esportiva     o que vem depois do | entra so na busca
#
# [ator]
# Jim Carrey
# Fernanda Torres #2   #2 comeca do segundo resultado
`;

const SEM_CHAVE = `Falta a chave do servico de busca. Crie um arquivo .env na raiz do projeto
com UMA destas linhas:

  SERPER_API_KEY=sua-chave     (serper.dev — 2500 buscas gratis, sem cartao)
  SERPAPI_KEY=sua-chave        (serpapi.com — 250 buscas gratis por mes)

O .env fica fora do git. Linha que ja traz o endereco da imagem no fim
funciona sem chave.`;

/** Le as chaves do .env da raiz, sem passar por cima do que ja esta no ambiente. */
function lerEnv() {
  let texto;
  try { texto = fs.readFileSync(path.join(RAIZ, '.env'), 'utf8'); } catch (e) { return; }
  for (const linha of texto.replace(/^﻿/, '').split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

/** "McDonald's Brasil" -> "mcdonalds-brasil". */
const paraArquivo = (texto) => texto
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/['’]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function lerLista(texto) {
  const itens = [];
  let grupo = '';

  for (const bruta of texto.replace(/^﻿/, '').split(/\r?\n/)) {
    let linha = bruta.trim();
    if (!linha || linha.startsWith('#')) continue;

    const cabeca = linha.match(/^\[(.*)\]$/);
    if (cabeca) { grupo = cabeca[1].trim(); continue; }

    let url = null;
    const link = linha.match(/\s(https?:\/\/\S+)$/);
    if (link) {
      url = link[1];
      linha = linha.slice(0, link.index).trim();
    }

    let posicao = 1;
    const pulo = linha.match(/\s+#(\d+)$/);
    if (pulo) {
      posicao = Math.max(1, Number(pulo[1]));
      linha = linha.slice(0, pulo.index);
    }

    const [nome, ...extras] = linha.split('|').map((s) => s.trim());
    if (!nome) continue;
    itens.push({
      nome,
      busca: [nome, grupo, ...extras].filter(Boolean).join(' '),
      arquivo: [grupo, nome].filter(Boolean).map(paraArquivo).filter(Boolean).join('-'),
      posicao,
      url
    });
  }
  return itens;
}

/** Chave recusada ou buscas esgotadas: nao adianta seguir para o proximo nome. */
function erroDaBusca(servico, status, mensagem) {
  const erro = new Error(mensagem || `${servico} respondeu ${status}`);
  erro.fatal = [401, 402, 403, 429].includes(status);
  return erro;
}

// Cada servico devolve a lista no mesmo formato: { url, miniatura, pagina }.
const BUSCAS = {
  SERPER_API_KEY: async (termo, chave) => {
    const r = await fetch('https://google.serper.dev/images', {
      method: 'POST',
      headers: { 'X-API-KEY': chave, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: termo, gl: 'br' }),
      signal: AbortSignal.timeout(30000)
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw erroDaBusca('serper', r.status, j.message);
    return (j.images || []).map((i) => ({ url: i.imageUrl, miniatura: i.thumbnailUrl, pagina: i.link }));
  },

  SERPAPI_KEY: async (termo, chave) => {
    const url = 'https://serpapi.com/search.json?engine=google_images&gl=br'
              + '&q=' + encodeURIComponent(termo) + '&api_key=' + encodeURIComponent(chave);
    const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw erroDaBusca('serpapi', r.status, j.error);
    // Busca sem resultado volta 200 com `error`: e so lista vazia.
    return (j.images_results || []).map((i) => ({ url: i.original, miniatura: i.thumbnail, pagina: i.link }));
  }
};

/** Que imagem e, pelos primeiros bytes: o content-type de site alheio mente. */
function extensaoDe(b) {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return '.jpg';
  if (b[0] === 0x89 && b.toString('latin1', 1, 4) === 'PNG') return '.png';
  if (b.toString('latin1', 0, 3) === 'GIF') return '.gif';
  if (b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return '.webp';
  if (b.toString('latin1', 4, 8) === 'ftyp' && /avi[fs]/.test(b.toString('latin1', 8, 12))) return '.avif';
  return null;
}

async function baixar(url, minimo = MINIMO) {
  if (!url) throw new Error('resultado sem endereco');
  const r = await fetch(url, {
    headers: { 'User-Agent': AGENTE, Accept: 'image/avif,image/webp,image/*' },
    signal: AbortSignal.timeout(20000)
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  if (Number(r.headers.get('content-length')) > MAXIMO) throw new Error('grande demais');

  const dados = Buffer.from(await r.arrayBuffer());
  const ext = extensaoDe(dados);
  // SVG cai aqui tambem: o jogo e o imagens-locais so contam imagem de pixel.
  if (!ext) throw new Error('nao e imagem (svg ou pagina no lugar)');
  if (dados.length < minimo) throw new Error(`pequena demais (${kb(dados.length)})`);
  if (dados.length > MAXIMO) throw new Error(`grande demais (${kb(dados.length)})`);
  return { dados, ext };
}

/** O primeiro resultado que baixa direito, a partir da posicao pedida. */
async function primeiraQueBaixa(resultados, posicao) {
  const candidatos = resultados.slice(posicao - 1, posicao - 1 + CANDIDATOS);
  const motivos = [];

  for (const [i, c] of candidatos.entries()) {
    try {
      return { ...(await baixar(c.url)), pagina: c.pagina, posicao: posicao + i };
    } catch (e) {
      motivos.push(`#${posicao + i}: ${e.message}`);
    }
  }

  // Site que recusa robo ainda deixa a miniatura do proprio Google: pequena,
  // mas melhor que nada. Ela nao passa pelo minimo, porque e pequena mesmo.
  if (candidatos[0] && candidatos[0].miniatura) {
    try {
      return { ...(await baixar(candidatos[0].miniatura, 0)), pagina: candidatos[0].pagina, posicao, miniatura: true };
    } catch (e) {
      motivos.push(`miniatura: ${e.message}`);
    }
  }

  throw new Error(candidatos.length ? motivos.join('; ') : 'a busca nao trouxe nada');
}

/** O arquivo com esse nome, em qualquer extensao, no jogo ou na avaliacao. */
function jaExiste(base) {
  for (const pasta of [JOGO, PASTA]) {
    const achado = EXTENSOES.map((ext) => base + ext).find((f) => fs.existsSync(path.join(pasta, f)));
    if (achado) return path.relative(RAIZ, path.join(pasta, achado)).replace(/\\/g, '/');
  }
  return null;
}

const imagensDaPasta = () => fs.readdirSync(PASTA)
  .filter((f) => EXTENSOES.includes(path.extname(f).toLowerCase()))
  .sort();

/** A pagina com todas as imagens da pasta, para avaliar de uma vez. */
function montarPagina(origem) {
  const arquivos = imagensDaPasta();
  const cartoes = arquivos.map((f) => {
    const o = origem[f] || {};
    let site = '';
    try { site = new URL(o.pagina).hostname.replace(/^www\./, ''); } catch (e) { /* sem origem */ }
    return `  <figure>
    <a href="${escapar(encodeURI(f))}" target="_blank"><img src="${escapar(encodeURI(f))}" alt="" loading="lazy"></a>
    <figcaption>
      <b>${escapar(f)}</b> <span>${kb(fs.statSync(path.join(PASTA, f)).size)}</span>
      ${o.busca ? `<p>${escapar(o.busca)}</p>` : ''}
      ${site ? `<a href="${escapar(o.pagina)}" target="_blank" rel="noopener">${escapar(site)}</a>` : ''}
    </figcaption>
  </figure>`;
  }).join('\n');

  fs.writeFileSync(PAGINA, `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Imagens para avaliar</title>
<style>
  body { margin: 0; padding: 20px; font-family: system-ui, sans-serif; background: #0d0a1f; color: #f4f2ff; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  body > p { color: #a79fc9; font-size: 14px; margin: 0 0 18px; }
  main { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
  figure { margin: 0; background: #1a1534; border-radius: 10px; overflow: hidden; }
  figure img { display: block; width: 100%; height: 200px; object-fit: contain; background: #000; }
  figcaption { padding: 8px 10px 10px; font-size: 12.5px; line-height: 1.4; word-break: break-word; }
  figcaption span { color: #a79fc9; }
  figcaption p { margin: 4px 0; color: #d6d0f5; }
  a { color: #a78bfa; }
</style>
</head>
<body>
<h1>Imagens para avaliar (${arquivos.length})</h1>
<p>As aprovadas vao para public/img; as erradas, apague e rode de novo com #2 na linha.</p>
<main>
${cartoes}
</main>
</body>
</html>
`, 'utf8');
}

async function main() {
  lerEnv();

  const arquivoLista = path.resolve(process.argv[2] || LISTA_PADRAO);
  if (!fs.existsSync(arquivoLista)) {
    if (process.argv[2]) {
      console.log(`nao achei a lista: ${arquivoLista}`);
      process.exit(1);
    }
    fs.writeFileSync(arquivoLista, MODELO, 'utf8');
    console.log(`criei ${path.basename(arquivoLista)} — escreva os nomes nele e rode de novo`);
    return;
  }

  const itens = lerLista(fs.readFileSync(arquivoLista, 'utf8'));
  if (!itens.length) {
    console.log(`${path.basename(arquivoLista)} esta vazia (ou so com comentarios)`);
    return;
  }

  const variavel = Object.keys(BUSCAS).find((k) => process.env[k]);
  if (!variavel && itens.some((i) => !i.url)) {
    console.log(SEM_CHAVE);
    process.exit(1);
  }
  const buscar = variavel && BUSCAS[variavel];
  const chave = variavel && process.env[variavel];

  fs.mkdirSync(PASTA, { recursive: true });
  let origem = {};
  try { origem = JSON.parse(fs.readFileSync(ORIGEM, 'utf8')); } catch (e) { /* primeira vez */ }

  const via = variavel ? `, buscando no Google Imagens (via ${variavel.replace(/_.*/, '').toLowerCase()})` : '';
  console.log(`${itens.length} itens${via}\n`);

  let baixadas = 0;
  let parou = null;
  const existentes = [];
  const falhas = [];

  for (const [i, item] of itens.entries()) {
    if (!item.arquivo) {
      falhas.push({ item, motivo: 'nome sem nenhuma letra para virar arquivo' });
      continue;
    }
    const existente = jaExiste(item.arquivo);
    if (existente) {
      existentes.push(existente);
      console.log(`  ja tem  ${existente}`);
      continue;
    }

    try {
      const achada = item.url
        ? { ...(await baixar(item.url)), pagina: item.url, posicao: 1 }
        : await primeiraQueBaixa(await buscar(item.busca, chave), item.posicao);
      const nome = item.arquivo + achada.ext;
      fs.writeFileSync(path.join(PASTA, nome), achada.dados);
      origem[nome] = { busca: item.busca, pagina: achada.pagina };
      baixadas++;

      const notas = [];
      if (achada.posicao !== 1) notas.push(`resultado #${achada.posicao}`);
      if (achada.miniatura) notas.push('MINIATURA, baixa resolucao');
      if (achada.dados.length > GRANDE) notas.push('PESADA, vale reduzir');
      let site = '';
      try { site = new URL(achada.pagina).hostname.replace(/^www\./, ''); } catch (e) { /* sem pagina */ }
      console.log(`  ok      ${nome}  ${kb(achada.dados.length)}  ${site}${notas.length ? `  (${notas.join(', ')})` : ''}`);
    } catch (e) {
      if (e.fatal) {
        // Problema da chave, nao do nome: o item volta para a proxima rodada.
        parou = { motivo: e.message, faltam: itens.length - i };
        break;
      }
      falhas.push({ item, motivo: e.message });
      console.log(`  FALHOU  ${item.nome}: ${e.message}`);
    }
    if (!item.url) await dormir(PAUSA);
  }

  // So guarda a origem do que ainda esta na pasta: o que foi apagado saiu da avaliacao.
  const naPasta = new Set(imagensDaPasta());
  origem = Object.fromEntries(Object.entries(origem).filter(([f]) => naPasta.has(f)));
  fs.writeFileSync(ORIGEM, JSON.stringify(origem, null, 2));
  montarPagina(origem);

  console.log(`\nbaixadas: ${baixadas}   ja existiam: ${existentes.length}   falharam: ${falhas.length}`);
  if (parou) {
    console.log(`\nPAREI: a busca recusou a chave ou as buscas gratis acabaram ("${parou.motivo}").`);
    console.log(`Faltaram ${parou.faltam} itens. Confira a chave no .env e rode de novo: o que ja baixou fica.`);
  }
  if (baixadas) {
    console.log(`\nAvalie em ${path.relative(RAIZ, PAGINA).replace(/\\/g, '/')}: e a primeira do Google, nao uma escolhida.`);
    console.log('As aprovadas vao para public/img; as erradas, apague e ponha #2 na linha.');
  }
  if (falhas.length) {
    console.log('\nPara as que falharam, mude a busca com | (ex.: "Puma | marca esportiva") ou use #2.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
