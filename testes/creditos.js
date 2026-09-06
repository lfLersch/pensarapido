'use strict';

/*
 * Monta a pagina de creditos das imagens.
 *
 * As fotos do jogo vem do Wikimedia Commons sob licencas CC BY e CC BY-SA, que
 * EXIGEM credito ao autor. Este script consulta a licenca e a autoria de cada
 * arquivo na API do Commons e gera public/creditos.html.
 *
 * Rode depois de acrescentar imagens novas:
 *   npm run creditos
 *
 * Vai devagar de proposito — o Commons recusa cliente apressado, e uma
 * enxurrada de 429 aqui produziria uma pagina de creditos incompleta, que e
 * pior do que nenhuma.
 */

const fs = require('fs');
const path = require('path');
const { CATEGORIAS, QUESTOES } = require('../server/questions');

const SAIDA = path.join(__dirname, '..', 'public', 'creditos.html');
const AGENTE = 'PensaRapido/1.0 (jogo de perguntas; pagina de creditos)';
const PAUSA = 700;
const TENTATIVAS = 4;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/** Nome do arquivo no Commons a partir da URL da imagem. */
function arquivoDe(url) {
  if (!url.includes('wikimedia.org')) return null;
  const partes = url.split('/');
  const i = partes.indexOf('thumb');
  // Em URL de thumb o nome vem antes do "500px-..."; senao e o ultimo pedaco.
  const bruto = i >= 0 ? partes[i + 3] : partes[partes.length - 1];
  return decodeURIComponent(bruto);
}

function semTags(valor) {
  if (!valor) return null;
  return String(valor.value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function dados(arquivo) {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json'
            + '&prop=imageinfo&iiprop=extmetadata|url&titles=' + encodeURIComponent('File:' + arquivo);

  for (let t = 1; t <= TENTATIVAS; t++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': AGENTE }, signal: AbortSignal.timeout(25000) });
      if (r.status === 429) { await dormir(3000 * t); continue; }
      const j = await r.json();
      const pagina = Object.values(j.query.pages)[0];
      const info = pagina.imageinfo && pagina.imageinfo[0];
      if (!info || !info.extmetadata) return null;
      const m = info.extmetadata;
      return {
        arquivo,
        pagina: info.descriptionurl || `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(arquivo)}`,
        licenca: semTags(m.LicenseShortName) || 'ver pagina do arquivo',
        autor: semTags(m.Artist) || 'autor nao informado'
      };
    } catch (e) {
      if (t === TENTATIVAS) return null;
      await dormir(2000 * t);
    }
  }
  return null;
}

function escapar(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

(async () => {
  // Junta os arquivos usados, sem repetir.
  const usados = new Map(); // arquivo -> Set(categoria)
  let deFlagcdn = 0;
  let locais = 0;

  for (const categoria of CATEGORIAS) {
    for (const q of QUESTOES[categoria.id] || []) {
      if (!q.imagem) continue;
      if (q.imagem.includes('flagcdn.com')) { deFlagcdn++; continue; }
      if (!q.imagem.startsWith('http')) { locais++; continue; }
      const arquivo = arquivoDe(q.imagem);
      if (!arquivo) continue;
      if (!usados.has(arquivo)) usados.set(arquivo, new Set());
      usados.get(arquivo).add(categoria.nome);
    }
  }

  console.log(`arquivos do Commons: ${usados.size}`);
  console.log(`bandeiras do flagcdn: ${deFlagcdn} (dominio publico, sem exigencia de credito)`);
  if (locais) console.log(`imagens locais: ${locais} (credito por conta de quem adicionou)`);
  console.log('');

  const creditos = [];
  const semDados = [];
  let feitos = 0;

  for (const [arquivo, cats] of usados) {
    const d = await dados(arquivo);
    if (d) creditos.push({ ...d, categorias: [...cats].join(', ') });
    else semDados.push(arquivo);

    if (++feitos % 25 === 0) console.log(`  ${feitos}/${usados.size}`);
    await dormir(PAUSA);
  }

  creditos.sort((a, b) => a.arquivo.localeCompare(b.arquivo));

  const linhas = creditos.map((c) => `      <tr>
        <td><a href="${escapar(c.pagina)}" target="_blank" rel="noopener">${escapar(c.arquivo)}</a></td>
        <td>${escapar(c.autor)}</td>
        <td>${escapar(c.licenca)}</td>
      </tr>`).join('\n');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PensaRapido — creditos das imagens</title>
<style>
  body { margin: 0; padding: 24px; font-family: system-ui, sans-serif;
         background: #0d0a1f; color: #f4f2ff; line-height: 1.5; }
  main { max-width: 1000px; margin: 0 auto; }
  h1 { font-size: 24px; }
  p  { color: #a79fc9; font-size: 14.5px; }
  a  { color: #a78bfa; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
  th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid rgba(255,255,255,.1); }
  th { color: #a79fc9; text-transform: uppercase; font-size: 11px; letter-spacing: .8px; }
  td:first-child { word-break: break-all; }
</style>
</head>
<body>
<main>
  <h1>Creditos das imagens</h1>
  <p>
    As fotos e mapas usados no PensaRapido vem do
    <a href="https://commons.wikimedia.org" target="_blank" rel="noopener">Wikimedia Commons</a>,
    sob licencas Creative Commons que exigem credito ao autor. A lista abaixo
    tem ${creditos.length} arquivos, com autoria, licenca e link para a pagina
    original de cada um.
  </p>
  <p>
    As ${deFlagcdn} bandeiras vem do <a href="https://flagcdn.com" target="_blank" rel="noopener">flagcdn.com</a>;
    desenhos de bandeira nacional sao de dominio publico.
  </p>
  <p><a href="/">&larr; voltar ao jogo</a></p>
  <table>
    <thead><tr><th>Arquivo</th><th>Autor</th><th>Licenca</th></tr></thead>
    <tbody>
${linhas}
    </tbody>
  </table>
</main>
</body>
</html>
`;

  fs.writeFileSync(SAIDA, html, 'utf8');
  console.log(`\ncreditos gravados: ${creditos.length} arquivos em public/creditos.html`);
  if (semDados.length) {
    console.log(`sem metadados (${semDados.length}): ${semDados.slice(0, 5).join(', ')}${semDados.length > 5 ? '...' : ''}`);
  }
})();
