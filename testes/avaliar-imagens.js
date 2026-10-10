'use strict';

/*
 * Pagina para avaliar as imagens que o npm run baixar-imagens deixou em
 * imagens-para-avaliar/.
 *
 *   npm run avaliar-imagens        abre em http://localhost:3457
 *
 * Cada imagem aparece com as perguntas que vao sair dela (perguntas.json,
 * quando a pasta tiver um), um botao "pode subir" e uma caixa para dizer o
 * que mudar. Tudo e gravado na hora em avaliacao.json, na mesma pasta: e de
 * la que sai a lista do que entra no jogo. So escuta na propria maquina.
 */

const fs = require('fs');
const http = require('http');
const path = require('path');

const PASTA = path.join(__dirname, '..', 'imagens-para-avaliar');
const AVALIACAO = path.join(PASTA, 'avaliacao.json');
const PORTA = Number(process.env.PORTA_AVALIAR) || 3457;
const TIPOS = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif'
};

function lerJson(arquivo) {
  try { return JSON.parse(fs.readFileSync(path.join(PASTA, arquivo), 'utf8')); } catch (e) { return {}; }
}

const imagens = () => (fs.existsSync(PASTA) ? fs.readdirSync(PASTA) : [])
  .filter((f) => TIPOS[path.extname(f).toLowerCase()])
  .sort();

function itens() {
  const origem = lerJson('origem.json');
  const perguntas = lerJson('perguntas.json');
  const avaliacao = lerJson('avaliacao.json');
  return imagens().map((arquivo) => {
    const o = origem[arquivo] || {};
    const a = avaliacao[arquivo] || {};
    return {
      arquivo,
      kb: Math.round(fs.statSync(path.join(PASTA, arquivo)).size / 1024),
      busca: o.busca || '',
      pagina: o.pagina || '',
      perguntas: perguntas[arquivo] || [],
      aprovada: Boolean(a.aprovada),
      nota: a.nota || ''
    };
  });
}

function responder(res, status, tipo, corpo) {
  res.writeHead(status, { 'Content-Type': tipo, 'Cache-Control': 'no-store' });
  res.end(corpo);
}

function lerCorpo(req) {
  return new Promise((ok, falha) => {
    let corpo = '';
    req.on('data', (parte) => {
      corpo += parte;
      if (corpo.length > 20000) { falha(new Error('grande demais')); req.destroy(); }
    });
    req.on('end', () => ok(corpo));
    req.on('error', falha);
  });
}

async function salvar(req, res) {
  let dados;
  try { dados = JSON.parse(await lerCorpo(req)); } catch (e) { return responder(res, 400, 'text/plain', 'json invalido'); }
  const { arquivo } = dados;
  if (typeof arquivo !== 'string' || !imagens().includes(arquivo)) return responder(res, 404, 'text/plain', 'imagem nao existe');

  const avaliacao = lerJson('avaliacao.json');
  avaliacao[arquivo] = {
    aprovada: Boolean(dados.aprovada),
    nota: String(dados.nota || '').slice(0, 2000),
    quando: new Date().toISOString()
  };
  fs.writeFileSync(AVALIACAO, JSON.stringify(avaliacao, null, 2));
  responder(res, 200, 'application/json', '{"ok":true}');
}

function imagem(res, nome) {
  // So o nome do arquivo, sem pasta: nada de /imagens/../../server/banco.js.
  if (nome !== path.basename(nome) || !imagens().includes(nome)) return responder(res, 404, 'text/plain', 'nao achei');
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(nome).toLowerCase()], 'Cache-Control': 'no-store' });
  fs.createReadStream(path.join(PASTA, nome)).pipe(res);
}

const servidor = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && url.pathname === '/') return responder(res, 200, 'text/html; charset=utf-8', PAGINA);
  if (req.method === 'GET' && url.pathname === '/api/itens') return responder(res, 200, 'application/json', JSON.stringify(itens()));
  if (req.method === 'POST' && url.pathname === '/api/avaliacao') return salvar(req, res).catch(() => responder(res, 500, 'text/plain', 'erro'));
  if (req.method === 'GET' && url.pathname.startsWith('/imagens/')) {
    let nome;
    try { nome = decodeURIComponent(url.pathname.slice('/imagens/'.length)); } catch (e) { return responder(res, 400, 'text/plain', 'nome invalido'); }
    return imagem(res, nome);
  }
  responder(res, 404, 'text/plain', 'nao achei');
});

const PAGINA = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Avaliar imagens</title>
<style>
  :root {
    --fundo: #0d0a1f; --cartao: #1a1534; --borda: #2c2550; --texto: #f4f2ff;
    --suave: #a79fc9; --destaque: #a78bfa; --ok: #22c55e; --ok-fundo: #143524;
    --nota: #f59e0b; --nota-fundo: #3a2a0c; --erro: #f87171;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, sans-serif; background: var(--fundo); color: var(--texto); }
  header { position: sticky; top: 0; z-index: 2; background: rgba(13, 10, 31, .96);
           border-bottom: 1px solid var(--borda); padding: 12px 16px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  header p { margin: 0 0 10px; color: var(--suave); font-size: 13.5px; }
  .filtros { display: flex; flex-wrap: wrap; gap: 6px; }
  .filtros button { background: var(--cartao); color: var(--texto); border: 1px solid var(--borda);
                    border-radius: 999px; padding: 6px 12px; font: inherit; font-size: 13px; cursor: pointer; }
  .filtros button[aria-pressed="true"] { background: var(--destaque); border-color: var(--destaque); color: #120d29; font-weight: 600; }
  main { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; padding: 16px; }
  .cartao { background: var(--cartao); border: 2px solid var(--borda); border-radius: 12px; overflow: hidden;
            display: flex; flex-direction: column; }
  .cartao.aprovada { border-color: var(--ok); }
  .cartao.pedido { border-color: var(--nota); }
  .cartao img { display: block; width: 100%; height: 220px; object-fit: contain; background: #000; }
  .corpo { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
  h2 { font-size: 16px; margin: 0; }
  ol { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
  li { font-size: 13.5px; line-height: 1.35; }
  li .p { color: var(--suave); display: block; }
  li small { color: var(--suave); display: block; font-size: 12px; }
  .sem-perguntas { color: var(--suave); font-size: 13px; margin: 0; }
  .subir { display: flex; align-items: center; gap: 8px; padding: 9px 10px; border-radius: 8px; cursor: pointer;
           border: 1px solid var(--borda); font-weight: 600; font-size: 14px; user-select: none; }
  .subir input { width: 20px; height: 20px; accent-color: var(--ok); margin: 0; }
  .aprovada .subir { background: var(--ok-fundo); border-color: var(--ok); }
  textarea { width: 100%; min-height: 58px; resize: vertical; background: var(--fundo); color: var(--texto);
             border: 1px solid var(--borda); border-radius: 8px; padding: 8px; font: inherit; font-size: 13.5px; }
  .pedido textarea { border-color: var(--nota); background: var(--nota-fundo); }
  textarea:focus, .filtros button:focus-visible, .subir:focus-within { outline: 2px solid var(--destaque); outline-offset: 1px; }
  .rodape { display: flex; justify-content: space-between; gap: 8px; font-size: 11.5px; color: var(--suave); margin-top: auto; }
  .rodape a { color: var(--destaque); }
  .estado.erro { color: var(--erro); }
  .vazio { padding: 40px 16px; color: var(--suave); }
</style>
</head>
<body>
<header>
  <h1>Imagens para avaliar</h1>
  <p>Marque <b>Pode subir</b> nas que estão boas e escreva o que mudar nas outras. Tudo é salvo sozinho; quando terminar, é só avisar.</p>
  <div class="filtros" role="group" aria-label="Filtrar"></div>
</header>
<main aria-live="polite"></main>
<script>
const FILTROS = [
  ['todas', 'Todas', () => true],
  ['faltam', 'Faltam avaliar', (i) => !i.aprovada && !i.nota.trim()],
  ['sobem', 'Podem subir', (i) => i.aprovada],
  ['pedidos', 'Com pedido de mudança', (i) => Boolean(i.nota.trim())]
];
let itens = [];
let filtro = 'todas';

const el = (tag, props = {}, ...filhos) => {
  const e = Object.assign(document.createElement(tag), props);
  for (const f of filhos) if (f != null) e.append(f);
  return e;
};

function desenharFiltros() {
  const caixa = document.querySelector('.filtros');
  caixa.replaceChildren(...FILTROS.map(([id, nome, teste]) => el('button', {
    type: 'button',
    textContent: nome + ' (' + itens.filter(teste).length + ')',
    ariaPressed: String(filtro === id),
    onclick: () => { filtro = id; desenhar(); }
  })));
}

function titulo(item) {
  const ator = item.perguntas.find((p) => p.sub === 'atores');
  return ator ? ator.resposta : item.arquivo;
}

function cartao(item) {
  const estado = el('span', { className: 'estado' });
  const marcar = () => {
    c.classList.toggle('aprovada', item.aprovada);
    c.classList.toggle('pedido', Boolean(item.nota.trim()));
  };
  let espera;
  const salvar = async () => {
    estado.className = 'estado';
    estado.textContent = 'salvando…';
    try {
      const r = await fetch('/api/avaliacao', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arquivo: item.arquivo, aprovada: item.aprovada, nota: item.nota })
      });
      if (!r.ok) throw new Error();
      estado.textContent = 'salvo ✓';
    } catch (e) {
      estado.className = 'estado erro';
      estado.textContent = 'não salvou — o servidor está aberto?';
    }
    desenharFiltros();
  };

  const caixa = el('input', { type: 'checkbox', checked: item.aprovada });
  caixa.addEventListener('change', () => { item.aprovada = caixa.checked; marcar(); salvar(); });

  const nota = el('textarea', { value: item.nota, placeholder: 'O que precisa mudar? (outra foto, outra resposta, outro papel…)' });
  nota.setAttribute('aria-label', 'O que mudar em ' + titulo(item));
  nota.addEventListener('input', () => {
    item.nota = nota.value; marcar();
    clearTimeout(espera); espera = setTimeout(salvar, 700);
  });
  nota.addEventListener('blur', () => { if (espera) { clearTimeout(espera); espera = null; salvar(); } });

  const perguntas = item.perguntas.length
    ? el('ol', {}, ...item.perguntas.map((p) => el('li', {},
        el('span', { className: 'p', textContent: p.pergunta }),
        el('b', { textContent: p.resposta }),
        p.aceita && p.aceita.length ? el('small', { textContent: 'também vale: ' + p.aceita.join(', ') }) : null)))
    : el('p', { className: 'sem-perguntas', textContent: item.busca || 'Sem perguntas ainda.' });

  let site = '';
  try { site = new URL(item.pagina).hostname.replace(/^www\\./, ''); } catch (e) { /* sem origem */ }
  const endereco = '/imagens/' + encodeURIComponent(item.arquivo);
  const c = el('article', { className: 'cartao' },
    el('a', { href: endereco, target: '_blank', title: 'Abrir a imagem inteira' },
      el('img', { src: endereco, alt: titulo(item), loading: 'lazy' })),
    el('div', { className: 'corpo' },
      el('h2', { textContent: titulo(item) }),
      perguntas,
      el('label', { className: 'subir' }, caixa, 'Pode subir'),
      nota,
      el('div', { className: 'rodape' },
        el('span', {}, item.arquivo + ' · ' + item.kb + ' KB', site ? ' · ' : '',
          site ? el('a', { href: item.pagina, target: '_blank', rel: 'noopener', textContent: site }) : null),
        estado)));
  marcar();
  return c;
}

function desenhar() {
  desenharFiltros();
  const teste = FILTROS.find(([id]) => id === filtro)[2];
  const lista = itens.filter(teste);
  document.querySelector('main').replaceChildren(...(lista.length
    ? lista.map(cartao)
    : [el('p', { className: 'vazio', textContent: 'Nenhuma imagem aqui.' })]));
}

fetch('/api/itens').then((r) => r.json()).then((dados) => { itens = dados; desenhar(); });
</script>
</body>
</html>
`;

servidor.listen(PORTA, '127.0.0.1', () => {
  const n = imagens().length;
  console.log(`\n  Avaliar imagens: http://localhost:${PORTA}  (${n} na pasta imagens-para-avaliar)\n`);
  console.log('  O que for marcado fica em imagens-para-avaliar/avaliacao.json. Ctrl+C para fechar.\n');
});
