'use strict';

/* ============================================================
   PensaRápido — cliente
   ============================================================ */

const socket = io();

const METAS_SUGERIDAS = [60, 90, 120, 150, 200];

const estado = {
  config: null,         // vem de /api/config
  eu: null,             // jogador local
  sala: null,           // estado público da sala
  escolhas: {
    categorias: new Set(),
    subs: new Set(),
    modo: 'tempo',
    metaPontos: 120,
    segundosPorPergunta: 20,
    faixa: { min: 0, max: 100 },  // Modo Tempo: a faixa de dificuldade das perguntas
    limiteMusica: 30,     // por quanto tempo a musica toca, no maximo
    fimPor: 'pontos',     // modos musicais: 'pontos' ou 'musicas'
    totalMusicas: 15,
    perguntasAteSorteio: 3,    // Bagunca: perguntas do Modo Tempo entre um sorteio e outro
    modosBagunca: new Set()    // Bagunca: os modos que entram na roleta
  },
  musica: null,     // a musica da rodada: { inicio, limite, abriuEm, parada }
  acertou: false,
  necessarias: 1,   // Escalada: quantas respostas a rodada pede
  meusItens: [],    // Escalada: o que já respondi nesta rodada
  emRodada: false,
  placar: [],       // ultimo placar recebido
  carrossel: null,  // Carrossel: { voltas, msPorVez, ordem } da rodada
  vivos: null,      // Carrossel: quem ainda nao saiu
  presente: null,   // Presente Grego: { equipes, aposta, ... } da rodada
  votei: false,     // votei para pular a rodada atual
  contagem: null,
  urgencia: null,
  pausado: false,   // o lider pausou o jogo
};

/* ----------------------------- Atalhos ----------------------------- */

const $ = (id) => document.getElementById(id);
const criar = (tag, classe) => {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  return el;
};

function mostrarTela(id) {
  document.querySelectorAll('.tela').forEach((t) => t.classList.toggle('ativa', t.id === id));
  // Voltou ao saguao: a lista de salas abertas atualiza na hora.
  if (id === 'tela-lobby') carregarSalasAbertas();
}

function avisar(idElemento, mensagem) {
  const el = $(idElemento);
  el.textContent = mensagem || '';
  if (mensagem) {
    el.animate(
      [{ transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }],
      { duration: 220, iterations: 1 }
    );
  }
}

function brindar(texto) {
  const el = criar('div', 'brinde');
  el.textContent = texto;
  $('brindes').appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

const plural = (n, um, muitos) => `${n} ${n === 1 ? um : muitos}`;

/* =====================================================================
   1. SAGUÃO
   ===================================================================== */

const inputNickname = $('input-nickname');
const inputCodigo = $('input-codigo');

inputNickname.value = localStorage.getItem('pensarapido:nickname') || '';

/**
 * A sala em que eu estava, guardada no navegador.
 *
 * E o que permite voltar sozinho quando a conexao cai: a aba reabre, acha o
 * codigo aqui e entra de novo com o mesmo nickname — que e o que o servidor
 * usa para devolver os pontos.
 */
const salaLembrada = {
  guardar: (codigo) => localStorage.setItem('pensarapido:sala', codigo),
  ler: () => localStorage.getItem('pensarapido:sala') || '',
  esquecer: () => localStorage.removeItem('pensarapido:sala')
};

/**
 * A carteirinha desta aba — um numero qualquer, guardado no navegador.
 *
 * Serve para o servidor reconhecer a MESMA aba voltando. So o nickname nao
 * basta: logo depois de uma queda o socket velho ainda parece vivo (atras de
 * proxy a conexao vira long-polling, e a morte so e notada no ping timeout),
 * e sem a carteirinha a pessoa voltava como "Ana (2)", do zero.
 */
function carteirinha() {
  let id = localStorage.getItem('pensarapido:cliente');
  if (!id) {
    id = (crypto.randomUUID && crypto.randomUUID())
      || `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem('pensarapido:cliente', id);
  }
  return id;
}

function nicknameValido() {
  const nome = inputNickname.value.trim();
  if (nome.length < 2) {
    avisar('aviso-lobby', 'Digite um nickname com pelo menos 2 caracteres.');
    inputNickname.focus();
    return null;
  }
  localStorage.setItem('pensarapido:nickname', nome);
  return nome;
}

$('btn-abrir-criar').addEventListener('click', () => {
  if (!nicknameValido()) return;
  avisar('aviso-lobby', '');
  $('painel-entrar').hidden = true;
  mostrarTela('tela-config');
});

$('btn-abrir-entrar').addEventListener('click', () => {
  const painel = $('painel-entrar');
  painel.hidden = !painel.hidden;
  avisar('aviso-lobby', '');
  if (!painel.hidden) inputCodigo.focus();
});

inputCodigo.addEventListener('input', () => {
  inputCodigo.value = inputCodigo.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
});

function entrarNaSala() {
  const nickname = nicknameValido();
  if (!nickname) return;

  const codigo = inputCodigo.value.trim();
  if (codigo.length !== 4) return avisar('aviso-lobby', 'O codigo da sala tem 4 caracteres.');

  socket.emit('sala:entrar', { nickname, codigo, cliente: carteirinha() }, (resposta) => {
    if (resposta.erro) return avisar('aviso-lobby', resposta.erro);
    avisar('aviso-lobby', '');
    estado.eu = resposta.eu;
    estado.sala = resposta.sala;
    salaLembrada.guardar(resposta.codigo);
    inputCodigo.value = '';
    if (resposta.voltou) brindar('Voce voltou, com os pontos de antes');
    // Pode ser uma sala com a partida ja rolando: a tela certa depende do
    // estado dela, nao e sempre o saguao.
    abrirTelaDaSala(resposta.sala);
  });
}

$('btn-entrar').addEventListener('click', entrarNaSala);
inputCodigo.addEventListener('keydown', (e) => { if (e.key === 'Enter') entrarNaSala(); });
inputNickname.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !$('painel-entrar').hidden) entrarNaSala();
});

/* --------------------------- Salas abertas --------------------------- */

/**
 * As salas que ainda aceitam gente, para entrar sem precisar que alguém dite
 * o código. Atualiza sozinha enquanto o saguão está na tela.
 */
async function carregarSalasAbertas() {
  if (!$('tela-lobby').classList.contains('ativa')) return;

  let salas;
  try {
    const resposta = await fetch('/api/salas');
    salas = await resposta.json();
  } catch {
    return; // sem rede: fica a lista que já está na tela
  }

  const lista = $('salas-lista');
  lista.innerHTML = '';
  for (const sala of salas) {
    const item = criar('li', 'sala-aberta');
    // Sala com partida no ar tambem aparece: da para cair e voltar, e quem
    // chega no meio comeca a valer na proxima rodada.
    const quando = sala.estado === 'fim'
      ? ' · entre partidas'
      : sala.estado === 'lobby' ? '' : ' · partida rolando';
    item.innerHTML = `
      <span class="sala-aberta__lider">${sala.avatar} ${escapar(sala.lider)}</span>
      <span class="sala-aberta__modo">${sala.icone} ${escapar(sala.modo)}${
        sala.titulo ? ` · ${escapar(sala.titulo)}` : ''} · ${sala.codigo}${quando}</span>
      <span class="sala-aberta__gente">${sala.jogadores}/${sala.max}</span>
      <button class="btn btn--secundario sala-aberta__entrar" type="button">Entrar</button>`;
    item.querySelector('button').addEventListener('click', () => {
      inputCodigo.value = sala.codigo;
      entrarNaSala();
    });
    lista.appendChild(item);
  }

  $('salas-vazio').hidden = salas.length > 0;
  $('salas-contagem').textContent = salas.length ? String(salas.length) : '';
}

carregarSalasAbertas();
setInterval(carregarSalasAbertas, 4000);

/* =====================================================================
   2. CONFIGURAÇÃO DA SALA
   ===================================================================== */

$('btn-voltar-lobby').addEventListener('click', () => mostrarTela('tela-lobby'));

/* ---------------------------- Novidades ----------------------------- */

/* ---------------------------- Perfil e conquistas ---------------------------- */

$('btn-abrir-perfil').addEventListener('click', () => {
  mostrarTela('tela-perfil');
  socket.emit('perfil:ver', { cliente: carteirinha() }, (resposta) => {
    if (resposta?.perfil) renderizarPerfil(resposta.perfil);
  });
  fetch('/api/melhores')
    .then((r) => r.json())
    .then((dados) => renderizarMelhores(dados.jogadores || []))
    .catch(() => renderizarMelhores([]));
});
$('btn-voltar-perfil').addEventListener('click', () => mostrarTela('tela-lobby'));

/* ---------------------------- Estatisticas ---------------------------- *
 *
 * Uma pagina de perguntas por vez, com os totais do recorte inteiro em cima.
 * Filtro novo pede a primeira pagina de novo; "Mostrar mais" pede a seguinte
 * e junta embaixo. O servidor nao manda as respostas.
 */

const abaEstatisticas = {
  pagina: 0,
  carregadas: 0,
  pedido: 0,      // so vale a resposta do ultimo pedido: a busca dispara varios
  espera: null,   // a busca espera a pessoa parar de digitar
  audio: null,
  tocando: null   // o botao do trecho que esta tocando
};

// Cada coluna ordena num sentido e, clicada de novo, no contrario.
const ORDENS_DA_COLUNA = {
  vezes: ['vezes', 'menos-vezes'],
  acerto: ['acerto', 'menos-acerto'],
  rapidas: ['rapidas', 'lentas'],
  dificuldade: ['dificuldade', 'menos-dificuldade']
};
const ORDENS_CRESCENTES = new Set(['menos-vezes', 'menos-acerto', 'rapidas', 'menos-dificuldade']);

const milhar = (n) => Number(n || 0).toLocaleString('pt-BR');
const emSegundos = (ms) => (ms === null || ms === undefined ? '—'
  : `${(ms / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`);

$('btn-abrir-estatisticas').addEventListener('click', () => {
  montarCategoriasDaAba();
  mostrarTela('tela-estatisticas');
  carregarEstatisticas();
});
$('btn-voltar-estatisticas').addEventListener('click', () => {
  pararTrecho();
  mostrarTela('tela-lobby');
});

$('est-busca').addEventListener('input', () => {
  clearTimeout(abaEstatisticas.espera);
  abaEstatisticas.espera = setTimeout(carregarEstatisticas, 250);
});
$('est-busca').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  clearTimeout(abaEstatisticas.espera);
  e.target.blur(); // no celular, fecha o teclado para mostrar a lista
  carregarEstatisticas();
});
for (const id of ['est-categoria', 'est-ordem', 'est-feitas']) {
  $(id).addEventListener('change', () => carregarEstatisticas());
}
$('est-mais').addEventListener('click', () => carregarEstatisticas({ mais: true }));

for (const botao of document.querySelectorAll('#est-tabela th[data-ordem] button')) {
  botao.addEventListener('click', () => {
    const [primeira, segunda] = ORDENS_DA_COLUNA[botao.parentElement.dataset.ordem];
    $('est-ordem').value = $('est-ordem').value === primeira ? segunda : primeira;
    carregarEstatisticas();
  });
}

/** As categorias e as partes delas, uma vez so (a configuracao nao muda). */
function montarCategoriasDaAba() {
  const select = $('est-categoria');
  if (select.options.length > 1 || !estado.config) return;
  for (const c of estado.config.categorias) {
    select.add(new Option(`${c.icone} ${c.nome}`, c.id));
    for (const s of c.subs || []) {
      select.add(new Option(`   ${s.icone} ${s.nome}`, `${c.id}:${s.id}`));
    }
  }
}

async function carregarEstatisticas({ mais = false } = {}) {
  const aba = abaEstatisticas;
  const pedido = ++aba.pedido;
  const pagina = mais ? aba.pagina + 1 : 0;

  const [categoria, sub] = $('est-categoria').value.split(':');
  const busca = $('est-busca').value.trim();
  const params = new URLSearchParams({ ordem: $('est-ordem').value, pagina: String(pagina) });
  if (categoria) params.set('categoria', categoria);
  if (sub) params.set('sub', sub);
  if (busca) params.set('busca', busca);
  if ($('est-feitas').checked) params.set('feitas', '1');

  marcarOrdemNaTabela();
  $('est-mais').disabled = true;
  $('est-tabela').setAttribute('aria-busy', 'true');

  let dados;
  try {
    const resposta = await fetch(`/api/estatisticas?${params}`);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    dados = await resposta.json();
  } catch {
    if (pedido !== aba.pedido) return;
    $('est-tabela').removeAttribute('aria-busy');
    $('est-mais').disabled = false;
    if (mais) brindar('Nao deu para carregar mais agora. Tente de novo.');
    else mostrarVazioDaAba('Nao deu para carregar as estatisticas agora. Tente de novo daqui a pouco.');
    return;
  }
  if (pedido !== aba.pedido) return; // chegou depois de um pedido mais novo

  $('est-tabela').removeAttribute('aria-busy');
  aba.pagina = pagina;
  const corpo = $('est-linhas');
  if (!mais) {
    pararTrecho();
    corpo.innerHTML = '';
    aba.carregadas = 0;
    desenharResumoDaAba(dados.resumo);
  }
  for (const linha of dados.linhas) corpo.appendChild(linhaDaAba(linha));
  aba.carregadas += dados.linhas.length;

  const vazio = dados.total === 0;
  $('est-tabela').hidden = vazio;
  if (vazio) {
    mostrarVazioDaAba($('est-feitas').checked
      ? 'Nenhuma pergunta deste recorte caiu ainda.'
      : 'Nenhuma pergunta com esse texto nesta categoria.');
  } else {
    $('est-vazio').hidden = true;
  }
  $('est-contagem').textContent = vazio ? '' : `Mostrando ${milhar(aba.carregadas)} de ${milhar(dados.total)} perguntas`;

  const faltam = dados.total - aba.carregadas;
  $('est-mais').hidden = faltam <= 0;
  $('est-mais').disabled = false;
  $('est-mais').textContent = `Mostrar mais ${milhar(Math.min(faltam, dados.tamanho))}`;
}

function mostrarVazioDaAba(texto) {
  $('est-tabela').hidden = true;
  $('est-contagem').textContent = '';
  $('est-mais').hidden = true;
  $('est-vazio').textContent = texto;
  $('est-vazio').hidden = false;
}

/** O cabecalho da coluna em uso fica marcado, com o sentido para o leitor de tela. */
function marcarOrdemNaTabela() {
  const ordem = $('est-ordem').value;
  for (const th of document.querySelectorAll('#est-tabela th[data-ordem]')) {
    const ativa = ORDENS_DA_COLUNA[th.dataset.ordem].includes(ordem);
    th.classList.toggle('est-ordenada', ativa);
    th.classList.toggle('est-ordenada--crescente', ativa && ORDENS_CRESCENTES.has(ordem));
    if (ativa) th.setAttribute('aria-sort', ORDENS_CRESCENTES.has(ordem) ? 'ascending' : 'descending');
    else th.removeAttribute('aria-sort');
  }
}

function desenharResumoDaAba(r) {
  const numeros = [
    [milhar(r.feitas), `de ${milhar(r.perguntas)} perguntas ja cairam`],
    [milhar(r.vezes), 'vezes que elas cairam'],
    [r.acerto === null ? '—' : `${r.acerto}%`,
      r.respostas ? `de acerto, em ${milhar(r.respostas)} respostas` : 'de acerto'],
    [emSegundos(r.tempoMedioMs), 'tempo medio do acerto']
  ];
  $('est-resumo').innerHTML = numeros.map(([valor, rotulo]) => `
    <div class="perfil-numero">
      <span class="perfil-numero__valor">${valor}</span>
      <span class="perfil-numero__rotulo">${rotulo}</span>
    </div>`).join('');
}

function linhaDaAba(l) {
  const tr = criar('tr', 'est-linha' + (l.vezes ? '' : ' est-linha--nunca'));
  const c = categoriaDe(l.categoria);
  const sub = l.sub && (c.subs || []).find((s) => s.id === l.sub);
  const nivel = (estado.config?.niveis || []).find((n) => n.nome === l.nivel);

  const acerto = l.acerto === null ? '<span class="est-sem">—</span>' : `
    <span class="est-acerto">
      <span class="est-barra" aria-hidden="true"><span style="width:${l.acerto}%"></span></span>
      <span>${l.acerto}%</span>
    </span>
    <span class="est-detalhe">${milhar(l.acertos)} de ${milhar(l.respostas)}</span>`;

  tr.innerHTML = `
    <td class="est-col-pergunta">
      <div class="est-pergunta">
        <div class="est-pergunta__textos">
          <span class="est-pergunta__texto">${escapar(l.pergunta)}</span>
          <span class="est-pergunta__onde">${c.icone} ${escapar(c.nome)}${
            sub ? ` · ${sub.icone} ${escapar(sub.nome)}` : ''}</span>
        </div>
      </div>
    </td>
    <td class="est-num" data-rotulo="Vezes">${l.vezes ? milhar(l.vezes) : '<span class="est-sem">0</span>'}</td>
    <td class="est-num" data-rotulo="Acerto">${acerto}</td>
    <td class="est-num" data-rotulo="Tempo">${l.tempoMedioMs === null
      ? '<span class="est-sem">—</span>' : emSegundos(l.tempoMedioMs)}</td>
    <td class="est-num" data-rotulo="Dificuldade">
      <span class="est-nivel"><i style="background:${nivel ? nivel.cor : 'var(--texto-fraco)'}"></i>${Math.round(l.dificuldade)}</span>
      <span class="est-detalhe">${escapar(l.nivel)}</span>
    </td>`;

  // A imagem e o audio sao o que separa "Que pais e este?" de outro igual.
  const pergunta = tr.querySelector('.est-pergunta');
  if (l.imagem) {
    const img = criar('img', 'est-miniatura');
    img.src = l.imagem;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('error', () => img.remove());
    pergunta.prepend(img);
  } else if (l.audio) {
    const botao = criar('button', 'est-trecho');
    botao.type = 'button';
    botao.textContent = '▶\uFE0E';
    botao.setAttribute('aria-label', 'Ouvir o trecho');
    botao.addEventListener('click', () => tocarTrecho(botao, l.audio));
    pergunta.prepend(botao);
  }
  return tr;
}

function tocarTrecho(botao, url) {
  const aba = abaEstatisticas;
  if (aba.tocando === botao) { pararTrecho(); return; }
  pararTrecho();
  aba.audio = aba.audio || new Audio();
  aplicarVolume(aba.audio);
  aba.audio.src = url;
  aba.audio.onended = pararTrecho;
  // O arquivo e a musica inteira: aqui toca 30s a partir de um terco dela,
  // que costuma ja ter passado da introducao.
  aba.audio.onloadedmetadata = () => {
    const inicio = (aba.audio.duration || 0) / 3;
    aba.audio.currentTime = inicio;
    aba.audio.ontimeupdate = () => { if (aba.audio.currentTime >= inicio + 30) pararTrecho(); };
  };
  // Trocar de trecho no meio interrompe o play anterior: so desmarca se
  // ainda for este que esta tocando.
  aba.audio.play().catch(() => { if (aba.tocando === botao) pararTrecho(); });
  aba.tocando = botao;
  botao.textContent = '■';
  botao.setAttribute('aria-label', 'Parar o trecho');
  botao.classList.add('est-trecho--tocando');
}

function pararTrecho() {
  const aba = abaEstatisticas;
  if (aba.audio) aba.audio.pause();
  if (aba.tocando) {
    aba.tocando.textContent = '▶\uFE0E';
    aba.tocando.setAttribute('aria-label', 'Ouvir o trecho');
    aba.tocando.classList.remove('est-trecho--tocando');
  }
  aba.tocando = null;
}

/**
 * Login com Google, opcional.
 *
 * O botao oficial do Google entrega um bilhete assinado; quem confere e o
 * servidor. Sem `googleClientId` na configuracao o login esta desligado e a
 * area nem aparece.
 */
let googlePronto = null;

function carregarGoogle() {
  if (!googlePronto) {
    googlePronto = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => {
        google.accounts.id.initialize({
          client_id: estado.config.googleClientId,
          callback: entrarComGoogle
        });
        resolve();
      };
      script.onerror = () => {
        googlePronto = null;
        reject(new Error('sem Google'));
      };
      document.head.appendChild(script);
    });
  }
  return googlePronto;
}

/**
 * O convite do saguao: oferece o login logo de cara, mas "Agora nao" some
 * com ele de vez neste navegador. Quem ja esta com a conta ligada nem ve.
 */
const SEM_LOGIN = 'pensarapido:semLogin';

function lerSemLogin() {
  try { return localStorage.getItem(SEM_LOGIN) === '1'; } catch { return false; }
}

function mostrarConviteDeLogin() {
  const convite = $('convite-login');
  convite.hidden = true;
  if (!estado.config?.googleClientId || lerSemLogin()) return;

  socket.emit('perfil:ver', { cliente: carteirinha() }, (resposta) => {
    if (resposta?.perfil?.conta) return;
    carregarGoogle()
      .then(() => {
        const lugar = $('convite-google');
        lugar.innerHTML = '';
        google.accounts.id.renderButton(lugar, {
          theme: 'filled_black', text: 'signin_with', shape: 'pill', locale: 'pt-BR'
        });
        convite.hidden = false;
      })
      .catch(() => {});
  });
}

$('btn-convite-agora-nao').addEventListener('click', () => {
  $('convite-login').hidden = true;
  try { localStorage.setItem(SEM_LOGIN, '1'); } catch { /* sem armazenamento: o convite volta na proxima */ }
});

function entrarComGoogle({ credential }) {
  socket.emit('conta:entrar', { credencial: credential, cliente: carteirinha() }, (resposta) => {
    if (resposta?.erro) return brindar(resposta.erro);
    $('convite-login').hidden = true;
    renderizarPerfil(resposta.perfil);
    brindar('Conta ligada: seu perfil agora vale em qualquer aparelho.');
    for (const c of resposta.conquistas || []) brindar(`${c.icone} Conquista: ${c.nome}`);
  });
}

$('btn-conta-sair').addEventListener('click', () => {
  socket.emit('conta:sair', { cliente: carteirinha() }, (resposta) => {
    if (window.google?.accounts?.id) google.accounts.id.disableAutoSelect();
    if (resposta?.perfil) renderizarPerfil(resposta.perfil);
  });
});

function renderizarConta(perfil) {
  const area = $('perfil-conta');
  area.hidden = !estado.config?.googleClientId;
  if (area.hidden) return;

  const ligada = Boolean(perfil.conta);
  $('conta-texto').textContent = ligada
    ? `Conectado com o Google${perfil.conta.nome ? ` como ${perfil.conta.nome}` : ''}. Seu perfil vale em qualquer aparelho.`
    : 'Entre com o Google para levar seu perfil e suas conquistas para qualquer aparelho. O que voce ja jogou aqui vai junto.';
  $('btn-conta-sair').hidden = !ligada;

  const botao = $('conta-google');
  botao.hidden = ligada;
  botao.innerHTML = '';
  if (!ligada) {
    carregarGoogle()
      .then(() => google.accounts.id.renderButton(botao, {
        theme: 'filled_black', text: 'signin_with', shape: 'pill', locale: 'pt-BR'
      }))
      .catch(() => { $('conta-texto').textContent = 'O login com Google nao carregou. Confira a internet.'; });
  }
}

function renderizarPerfil(perfil) {
  renderizarConta(perfil);
  const numeros = [
    ['Partidas', perfil.partidas],
    ['Vitorias', perfil.vitorias],
    ['Acertos', perfil.acertos],
    ['Maior sequencia', perfil.maiorSequencia]
  ];
  $('perfil-numeros').innerHTML = numeros.map(([rotulo, valor]) => `
    <div class="perfil-numero">
      <span class="perfil-numero__valor">${valor}</span>
      <span class="perfil-numero__rotulo">${rotulo}</span>
    </div>`).join('');

  renderizarPainel(perfil);

  const feitas = perfil.conquistas.filter((c) => c.quando).length;
  $('perfil-contagem').textContent = `${feitas}/${perfil.conquistas.length}`;
  // As que ainda nao sairam sao secretas: o servidor nem manda nome ou regra.
  $('perfil-conquistas').innerHTML = perfil.conquistas.map((c) => (c.secreta
    ? `
    <li class="conquista conquista--secreta">
      <span class="conquista__icone">🔒</span>
      <span class="conquista__nome">???</span>
      <span class="conquista__descricao">Conquista secreta</span>
    </li>`
    : `
    <li class="conquista conquista--feita" title="Desde ${new Date(c.quando).toLocaleDateString('pt-BR')}">
      <span class="conquista__icone">${c.icone}</span>
      <span class="conquista__nome">${escapar(c.nome)}</span>
      <span class="conquista__descricao">${escapar(c.descricao)}</span>
    </li>`)).join('');
}

/* ---------------------------- Painel de desempenho ---------------------------- *
 *
 * O painel mostra um recorte por vez: "Geral" (todas as perguntas) ou uma
 * categoria. Os chips de cima escolhem o recorte, e tudo embaixo (nota,
 * evolucao, acerto por dificuldade) se redesenha para ele. Os graficos sao
 * SVG na mao, medidos na largura da tela, com o valor no hover e no teclado
 * e uma tabela com os mesmos numeros para quem nao enxerga o grafico.
 */

const painelDesempenho = { perfil: null, recorte: 'geral' };
const SVG = 'http://www.w3.org/2000/svg';

function noSvg(tag, atributos = {}, pai = null) {
  const no = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(atributos)) no.setAttribute(k, v);
  if (pai) pai.appendChild(no);
  return no;
}

function categoriaDe(id) {
  return (estado.config?.categorias || []).find((c) => c.id === id)
    || { id, nome: id, icone: '❓', cor: 'var(--primaria)' };
}

function renderizarPainel(perfil) {
  painelDesempenho.perfil = perfil;
  const existe = painelDesempenho.recorte === 'geral' || (perfil.desempenho || []).some((l) => l.id === painelDesempenho.recorte);
  if (!existe) painelDesempenho.recorte = 'geral';
  desenharFiltro();
  desenharRecorte();
  renderizarDesempenho(perfil.desempenho || [], perfil.destaques || {});
}

function escolherRecorte(id) {
  painelDesempenho.recorte = id;
  desenharFiltro();
  desenharRecorte();
}

function desenharFiltro() {
  const filtro = $('painel-filtro');
  filtro.innerHTML = '';
  const opcoes = [{ id: 'geral', rotulo: '🧠 Geral' },
    ...(painelDesempenho.perfil.desempenho || []).map((l) => {
      const c = categoriaDe(l.id);
      return { id: l.id, rotulo: `${c.icone} ${c.nome}` };
    })];
  for (const opcao of opcoes) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'subchip' + (opcao.id === painelDesempenho.recorte ? ' marcada' : '');
    chip.setAttribute('role', 'tab');
    chip.setAttribute('aria-selected', String(opcao.id === painelDesempenho.recorte));
    chip.textContent = opcao.rotulo;
    chip.addEventListener('click', () => escolherRecorte(opcao.id));
    filtro.appendChild(chip);
  }
}

/** A ficha do recorte escolhido: a geral, ou a de uma categoria. */
function fichaDoRecorte() {
  const p = painelDesempenho.perfil;
  if (painelDesempenho.recorte === 'geral') return { ...p.geral, titulo: 'Nota geral' };
  const l = p.desempenho.find((d) => d.id === painelDesempenho.recorte);
  return { ...l, titulo: `Nota em ${categoriaDe(l.id).nome}` };
}

function desenharRecorte() {
  const alvo = $('painel');
  const f = fichaDoRecorte();
  alvo.innerHTML = '';

  if (!f.rodadas) {
    alvo.innerHTML = '<p class="painel__vazio">Jogue uma partida no Modo Tempo ou na Escalada: a partir da primeira rodada o painel ganha sua nota, e a cada partida um ponto na evolucao.</p>';
    return;
  }

  // Cabecalho: a nota em destaque e tres numeros ao lado.
  const topo = document.createElement('div');
  topo.className = 'painel__topo';
  const variacao = Number.isFinite(f.variacao) && f.variacao !== 0
    ? `<span class="painel__variacao painel__variacao--${f.variacao > 0 ? 'sobe' : 'desce'}">${f.variacao > 0 ? '▲' : '▼'} ${Math.abs(Math.round(f.variacao))} na ultima partida</span>`
    : '';
  topo.innerHTML = `
    <div class="painel__nota">
      <span class="painel__rotulo"></span>
      <span class="painel__valor">${f.nota}</span>
      ${f.provisoria ? `<span class="painel__provisoria">provisoria · ${f.rodadas} de 5 rodadas</span>` : variacao}
      <span class="painel__sub">Meio a meio em perguntas de dificuldade ${f.nota} (${f.nivel})</span>
    </div>
    <div class="painel__kpis">
      <div class="kpi"><span class="kpi__valor">${f.aproveitamento}%</span><span class="kpi__texto"><span class="kpi__rotulo">Aproveitamento</span><span class="kpi__detalhe">${f.acertos} acertos em ${f.rodadas}</span></span></div>
      <div class="kpi"><span class="kpi__valor">${f.rodadas}</span><span class="kpi__texto"><span class="kpi__rotulo">Rodadas medidas</span><span class="kpi__detalhe">no Modo Tempo e na Escalada</span></span></div>
      <div class="kpi"><span class="kpi__valor">${f.dificuldadeMedia}</span><span class="kpi__texto"><span class="kpi__rotulo">Dificuldade media</span><span class="kpi__detalhe">das perguntas que voce pegou</span></span></div>
    </div>`;
  topo.querySelector('.painel__rotulo').textContent = f.titulo;
  alvo.appendChild(topo);

  const evolucao = cartaoDeGrafico(alvo, 'Evolucao da nota', 'Um ponto por partida, das ultimas 30.');
  desenharEvolucao(evolucao, f.historico || []);

  const niveis = cartaoDeGrafico(alvo, 'Acerto por dificuldade', 'A barra e quanto voce acertou em cada faixa; o traco, quanto a sua nota esperava.');
  desenharNiveis(niveis, f.porNivel || []);

  alvo.appendChild(tabelaDoRecorte(f));
}

function cartaoDeGrafico(alvo, titulo, descricao) {
  const cartao = document.createElement('div');
  cartao.className = 'painel__grafico';
  const h = document.createElement('h4');
  h.className = 'painel__titulo';
  h.textContent = titulo;
  const p = document.createElement('p');
  p.className = 'painel__descricao';
  p.textContent = descricao;
  const area = document.createElement('div');
  area.className = 'grafico';
  cartao.append(h, p, area);
  alvo.appendChild(cartao);
  return area;
}

/** A dica que segue o mouse (ou o foco): valor forte em cima, o rotulo embaixo. */
function dicaDo(area) {
  let dica = area.querySelector('.grafico__dica');
  if (!dica) {
    dica = document.createElement('div');
    dica.className = 'grafico__dica';
    dica.hidden = true;
    area.appendChild(dica);
  }
  return {
    mostrar(x, y, linhas) {
      dica.innerHTML = '';
      linhas.forEach(([valor, rotulo]) => {
        const linha = document.createElement('div');
        const forte = document.createElement('strong');
        forte.textContent = valor;
        const fraco = document.createElement('span');
        fraco.textContent = rotulo;
        linha.append(forte, fraco);
        dica.appendChild(linha);
      });
      dica.hidden = false;
      const largura = area.clientWidth;
      const w = dica.offsetWidth;
      dica.style.left = `${Math.min(Math.max(0, x - w / 2), Math.max(0, largura - w))}px`;
      dica.style.top = `${Math.max(0, y - dica.offsetHeight - 10)}px`;
    },
    esconder() { dica.hidden = true; }
  };
}

const dataCurta = (ms) => new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

/** Linha da nota, partida a partida, com a mira que acha o ponto mais perto. */
function desenharEvolucao(area, pontos) {
  if (pontos.length < 2) {
    area.innerHTML = `<p class="painel__vazio">${pontos.length
      ? `Uma partida ate aqui, com nota ${pontos[0].nota}. A linha aparece a partir da segunda.`
      : 'A evolucao aparece quando voce terminar uma partida.'}</p>`;
    return;
  }
  const largura = Math.max(260, area.clientWidth || 320);
  const altura = 190;
  const m = { cima: 14, baixo: 24, esq: 30, dir: 34 };
  const x = (i) => m.esq + (i * (largura - m.esq - m.dir)) / (pontos.length - 1);
  const y = (v) => m.cima + ((100 - v) * (altura - m.cima - m.baixo)) / 100;

  const svg = noSvg('svg', {
    width: largura, height: altura, viewBox: `0 0 ${largura} ${altura}`, class: 'grafico__svg',
    tabindex: 0, role: 'img',
    'aria-label': `Evolucao da nota: de ${pontos[0].nota} para ${pontos[pontos.length - 1].nota} em ${pontos.length} partidas. Use as setas para ver cada partida.`
  });

  for (const v of [0, 25, 50, 75, 100]) {
    noSvg('line', { x1: m.esq, x2: largura - m.dir, y1: y(v), y2: y(v), class: v === 0 ? 'grafico__base' : 'grafico__grade' }, svg);
    noSvg('text', { x: m.esq - 8, y: y(v) + 4, class: 'grafico__eixo', 'text-anchor': 'end' }, svg).textContent = v;
  }
  noSvg('text', { x: m.esq, y: altura - 6, class: 'grafico__eixo' }, svg).textContent = dataCurta(pontos[0].quando);
  noSvg('text', { x: largura - m.dir, y: altura - 6, class: 'grafico__eixo', 'text-anchor': 'end' }, svg)
    .textContent = dataCurta(pontos[pontos.length - 1].quando);

  const caminho = pontos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.nota).toFixed(1)}`).join(' ');
  noSvg('path', { d: `${caminho} L${x(pontos.length - 1)},${y(0)} L${x(0)},${y(0)} Z`, class: 'grafico__area' }, svg);
  noSvg('path', { d: caminho, class: 'grafico__linha' }, svg);

  const ultimo = pontos.length - 1;
  noSvg('circle', { cx: x(ultimo), cy: y(pontos[ultimo].nota), r: 4, class: 'grafico__ponto' }, svg);
  noSvg('text', { x: x(ultimo) + 9, y: y(pontos[ultimo].nota) + 4, class: 'grafico__valor' }, svg).textContent = pontos[ultimo].nota;

  const mira = noSvg('line', { y1: m.cima, y2: y(0), class: 'grafico__mira', visibility: 'hidden' }, svg);
  const foco = noSvg('circle', { r: 4, class: 'grafico__ponto', visibility: 'hidden' }, svg);
  area.appendChild(svg);
  const dica = dicaDo(area);

  let atual = null;
  const marcar = (i) => {
    atual = i;
    const p = pontos[i];
    mira.setAttribute('x1', x(i));
    mira.setAttribute('x2', x(i));
    foco.setAttribute('cx', x(i));
    foco.setAttribute('cy', y(p.nota));
    mira.setAttribute('visibility', 'visible');
    foco.setAttribute('visibility', 'visible');
    const anterior = i ? p.nota - pontos[i - 1].nota : null;
    const mudou = anterior === null ? 'primeira partida do grafico'
      : `${anterior > 0 ? '+' : ''}${anterior} desde a partida anterior`;
    dica.mostrar(x(i), y(p.nota), [[`Nota ${p.nota}`, `${dataCurta(p.quando)} · ${mudou}`]]);
  };
  const soltar = () => {
    atual = null;
    mira.setAttribute('visibility', 'hidden');
    foco.setAttribute('visibility', 'hidden');
    dica.esconder();
  };
  svg.addEventListener('pointermove', (e) => {
    const caixa = svg.getBoundingClientRect();
    const px = e.clientX - caixa.left;
    const passo = (largura - m.esq - m.dir) / (pontos.length - 1);
    marcar(Math.min(ultimo, Math.max(0, Math.round((px - m.esq) / passo))));
  });
  svg.addEventListener('pointerleave', soltar);
  svg.addEventListener('blur', soltar);
  svg.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const i = atual === null ? ultimo : atual + (e.key === 'ArrowRight' ? 1 : -1);
    marcar(Math.min(ultimo, Math.max(0, i)));
  });
}

/** Uma coluna por faixa de dificuldade: a barra e o acerto, o traco e o esperado. */
function desenharNiveis(area, faixas) {
  const legenda = document.createElement('div');
  legenda.className = 'grafico__legenda';
  legenda.innerHTML = '<span><i class="chave chave--barra"></i>Seu acerto</span><span><i class="chave chave--traco"></i>Esperado pela sua nota</span>';
  area.appendChild(legenda);

  const largura = Math.max(260, area.clientWidth || 320);
  const altura = 200;
  const m = { cima: 22, baixo: 40, esq: 30, dir: 8 };
  const faixa = (largura - m.esq - m.dir) / faixas.length;
  const y = (v) => m.cima + ((100 - v) * (altura - m.cima - m.baixo)) / 100;
  const BARRA = 24;

  const svg = noSvg('svg', {
    width: largura, height: altura, viewBox: `0 0 ${largura} ${altura}`, class: 'grafico__svg', role: 'img',
    'aria-label': 'Acerto por faixa de dificuldade: ' + faixas.map((f) => f.rodadas
      ? `${f.nivel} ${f.aproveitamento}% (esperado ${f.esperado}%)` : `${f.nivel} sem rodadas`).join(', ')
  });
  for (const v of [0, 25, 50, 75, 100]) {
    noSvg('line', { x1: m.esq, x2: largura - m.dir, y1: y(v), y2: y(v), class: v === 0 ? 'grafico__base' : 'grafico__grade' }, svg);
    noSvg('text', { x: m.esq - 8, y: y(v) + 4, class: 'grafico__eixo', 'text-anchor': 'end' }, svg).textContent = `${v}%`;
  }
  area.appendChild(svg);
  const dica = dicaDo(area);

  faixas.forEach((f, i) => {
    const centro = m.esq + faixa * i + faixa / 2;
    noSvg('text', { x: centro, y: altura - 22, class: 'grafico__rotulo', 'text-anchor': 'middle' }, svg).textContent = f.nivel;
    // Na tela estreita a faixa nao tem lugar para "rodadas" escrito: fica o numero.
    const cabe = faixa >= 84;
    noSvg('text', { x: centro, y: altura - 8, class: 'grafico__eixo', 'text-anchor': 'middle' }, svg)
      .textContent = cabe ? (f.rodadas ? plural(f.rodadas, 'rodada', 'rodadas') : 'nenhuma') : String(f.rodadas);
    if (!f.rodadas) return;

    // Barra com a ponta de cima arredondada e a base reta, no chao do grafico.
    const topo = y(f.aproveitamento);
    const base = y(0);
    const r = Math.min(4, (base - topo) / 2);
    const esq = centro - BARRA / 2;
    const dir = centro + BARRA / 2;
    const grupo = noSvg('g', { class: 'grafico__coluna', tabindex: 0 }, svg);
    noSvg('rect', { x: m.esq + faixa * i, y: m.cima, width: faixa, height: base - m.cima, class: 'grafico__alvo' }, grupo);
    if (base - topo > 0.5) {
      noSvg('path', {
        d: `M${esq},${base} L${esq},${topo + r} Q${esq},${topo} ${esq + r},${topo} L${dir - r},${topo} Q${dir},${topo} ${dir},${topo + r} L${dir},${base} Z`,
        class: 'grafico__barra'
      }, grupo);
    }
    // O valor vai acima da barra e do traco, o que estiver mais alto: assim o traco nunca corta o numero.
    const acima = Number.isFinite(f.esperado) ? Math.min(topo, y(f.esperado)) : topo;
    noSvg('text', { x: centro, y: acima - 7, class: 'grafico__valor', 'text-anchor': 'middle' }, grupo).textContent = `${f.aproveitamento}%`;
    if (Number.isFinite(f.esperado)) {
      noSvg('line', { x1: centro - 18, x2: centro + 18, y1: y(f.esperado), y2: y(f.esperado), class: 'grafico__esperado' }, grupo);
    }

    const mostrar = () => {
      const diferenca = f.aproveitamento - f.esperado;
      const leitura = Math.abs(diferenca) < 5 ? 'dentro do esperado'
        : diferenca > 0 ? `${diferenca} pontos acima do esperado` : `${-diferenca} pontos abaixo do esperado`;
      dica.mostrar(centro, topo, [
        [`${f.aproveitamento}% de acerto`, `${f.nivel} · ${f.acertos} de ${f.rodadas}`],
        [`${f.esperado}% esperado`, leitura]
      ]);
    };
    grupo.addEventListener('pointerenter', mostrar);
    grupo.addEventListener('focus', mostrar);
    grupo.addEventListener('pointerleave', () => dica.esconder());
    grupo.addEventListener('blur', () => dica.esconder());
  });
}

/** Os mesmos numeros dos graficos, em tabela, para ler sem o grafico. */
function tabelaDoRecorte(f) {
  const detalhes = document.createElement('details');
  detalhes.className = 'painel__tabela';
  const resumo = document.createElement('summary');
  resumo.textContent = 'Ver os numeros em tabela';
  detalhes.appendChild(resumo);

  const tabela = (cabecalho, linhas) => {
    const t = document.createElement('table');
    const tr = t.createTHead().insertRow();
    for (const c of cabecalho) {
      const th = document.createElement('th');
      th.textContent = c;
      tr.appendChild(th);
    }
    const corpo = t.createTBody();
    for (const linha of linhas) {
      const r = corpo.insertRow();
      for (const c of linha) r.insertCell().textContent = c;
    }
    return t;
  };
  detalhes.appendChild(tabela(['Faixa', 'Rodadas', 'Acerto', 'Esperado'],
    (f.porNivel || []).map((n) => [n.nivel, n.rodadas, n.rodadas ? `${n.aproveitamento}%` : '—', n.rodadas ? `${n.esperado}%` : '—'])));
  if ((f.historico || []).length) {
    detalhes.appendChild(tabela(['Partida', 'Nota'],
      f.historico.map((h) => [new Date(h.quando).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }), h.nota])));
  }
  return detalhes;
}

// A largura dos graficos e medida na hora: girou o celular, redesenha.
let esperaRedesenho = null;
window.addEventListener('resize', () => {
  if (!painelDesempenho.perfil || $('tela-perfil').classList.contains('ativa') === false) return;
  clearTimeout(esperaRedesenho);
  esperaRedesenho = setTimeout(desenharRecorte, 150);
});

/** Uma linha por categoria jogada: a nota, a barra, e um clique abre ela no painel. */
function renderizarDesempenho(linhas, destaques) {
  const lista = $('perfil-desempenho');
  if (!linhas.length) {
    lista.innerHTML = '<li class="desempenho__vazio">Jogue uma partida no Modo Tempo ou na Escalada para aparecer sua nota em cada categoria.</li>';
    return;
  }
  lista.innerHTML = linhas.map((l) => {
    const c = categoriaDe(l.id);
    const detalhe = l.provisoria
      ? `provisoria · ${plural(l.rodadas, 'rodada', 'rodadas')}`
      : `${l.aproveitamento}% de acerto em ${plural(l.rodadas, 'rodada', 'rodadas')} · dificuldade media ${l.dificuldadeMedia}`;
    const selo = l.id === destaques.forte ? '<span class="selo selo--forte">💪 ponto forte</span>'
      : l.id === destaques.fraco ? '<span class="selo selo--fraco">🎯 para treinar</span>' : '';
    const variacao = !l.provisoria && Number.isFinite(l.variacao) && Math.round(l.variacao) !== 0
      ? `<span class="desempenho__variacao desempenho__variacao--${l.variacao > 0 ? 'sobe' : 'desce'}">${l.variacao > 0 ? '▲' : '▼'} ${Math.abs(Math.round(l.variacao))}</span>`
      : '';
    return `
      <li>
        <button type="button" class="desempenho__linha${l.provisoria ? ' desempenho__linha--provisoria' : ''}" data-categoria="${escapar(l.id)}">
          <span class="desempenho__icone">${c.icone}</span>
          <span class="desempenho__meio">
            <span class="desempenho__nome">${escapar(c.nome)} ${selo}</span>
            <span class="desempenho__barra"><span style="width:${l.nota}%;background:${c.cor}"></span></span>
            <span class="desempenho__detalhe">${detalhe}</span>
          </span>
          <span class="desempenho__fim">
            <span class="desempenho__nota">${l.nota}</span>
            ${variacao}
          </span>
        </button>
      </li>`;
  }).join('');
  for (const botao of lista.querySelectorAll('[data-categoria]')) {
    botao.addEventListener('click', () => {
      escolherRecorte(botao.dataset.categoria);
      $('painel-filtro').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

function renderizarMelhores(jogadores) {
  const lista = $('perfil-melhores');
  lista.innerHTML = jogadores.length
    ? jogadores.map((j) => `
      <li class="melhor">
        <span class="melhor__nome">${escapar(j.nickname)}</span>
        <span class="melhor__numeros">${plural(j.vitorias, 'vitoria', 'vitorias')} · ${plural(j.partidas, 'partida', 'partidas')}</span>
      </li>`).join('')
    : '<li class="melhor melhor--vazio">Ninguem terminou uma partida ainda.</li>';
}

// Conquista nova no meio do jogo: aparece na hora, uma de cada vez.
socket.on('conquista:nova', ({ conquistas } = {}) => {
  for (const c of conquistas || []) brindar(`${c.icone} Conquista: ${c.nome}`);
});

$('btn-abrir-notas').addEventListener('click', () => {
  montarNotas();
  mostrarTela('tela-notas');
});
$('btn-voltar-notas').addEventListener('click', () => mostrarTela('tela-lobby'));

/** Desenha as notas de versao que vieram com a configuracao. */
function montarNotas() {
  const lista = $('notas-lista');
  lista.innerHTML = '';

  for (const nota of estado.config.notas || []) {
    const item = criar('li', 'nota');
    const dia = nota.data.split('-').reverse().join('/');
    item.innerHTML = `
      <div class="nota__topo">
        <span class="nota__versao">v${escapar(nota.versao)}</span>
        <span class="nota__data">${dia}</span>
      </div>
      <h3 class="nota__titulo">${escapar(nota.titulo)}</h3>
      <ul class="nota__itens">${
        nota.itens.map((texto) => `<li>${escapar(texto)}</li>`).join('')}</ul>`;
    lista.appendChild(item);
  }
}

async function carregarConfig() {
  const resposta = await fetch('/api/config');
  estado.config = await resposta.json();
  // A versao fica no rodape do saguao, ao lado do link das novidades.
  $('versao-atual').textContent = estado.config.versao ? `v${estado.config.versao}` : '';
  mostrarConviteDeLogin();
  montarCategorias();
  estado.escolhas.limiteMusica = estado.config.limiteMusicaPadrao || 30;
  estado.escolhas.totalMusicas = estado.config.totalMusicasPadrao || 15;
  montarModos();
  montarMetas();
  montarTempos();
  montarLimites();
  montarFim();
  montarBagunca();
  montarFaixa();
  sincronizarModo();
}

/** O modo escolhido e musical (Corrida musical, Qual e a musica)? */
function modoMusical(id = estado.escolhas.modo) {
  const modo = estado.config.modos.find((m) => m.id === id);
  return Boolean(modo && modo.musical);
}

/**
 * Os blocos da configuracao que valem para o modo escolhido.
 *
 * Nos modos musicais a categoria e sempre Ouvir musicas e a rodada dura o
 * limite da musica, entao somem as categorias e o tempo por pergunta; aparece
 * a escolha de acabar por pontos ou pelo numero de musicas.
 */
function sincronizarModo() {
  const musical = modoMusical();
  const bagunca = estado.escolhas.modo === 'bagunca';
  $('bloco-categorias').hidden = musical;
  $('bloco-tempo').hidden = musical;
  $('bloco-fim').hidden = !musical;
  $('bloco-bagunca').hidden = !bagunca;
  $('bloco-faixa').hidden = estado.escolhas.modo !== 'tempo';
  const porMusicas = musical && estado.escolhas.fimPor === 'musicas';
  $('bloco-meta').hidden = porMusicas;
  $('total-opcoes').hidden = !porMusicas;
  document.querySelectorAll('#fim-opcoes .pilula').forEach((p) => {
    p.classList.toggle('escolhida', p.dataset.fim === estado.escolhas.fimPor);
  });
  $('limite-dica').textContent = musical
    ? 'A rodada dura isso: a musica toca ate alguem acertar, ate todo mundo responder ou ate o limite. O pedaco e sorteado, nao e sempre o comeco.'
    : bagunca
      ? 'Vale para a categoria Ouvir musicas e para as rodadas musicais do sorteio: por quanto tempo a musica toca, no maximo.'
      : 'Vale para a categoria Ouvir musicas: por quanto tempo a musica toca, no maximo. O pedaco e sorteado, nao e sempre o comeco.';
  atualizarResumo();
}

/* ------------------------------ Bagunca ------------------------------ */

/** Os modos que a roleta da Bagunca pode sortear, com a cara de cada um. */
function modosSorteaveis() {
  const ids = estado.config.bagunca ? estado.config.bagunca.modos : [];
  return ids.map((id) => estado.config.modos.find((m) => m.id === id)).filter(Boolean);
}

/**
 * A configuracao da Bagunca: quantas perguntas do Modo Tempo ate cada
 * sorteio, e quais modos entram na roleta. Comeca com todos marcados.
 */
function montarBagunca() {
  const cfg = estado.config.bagunca;
  if (!cfg) return;
  estado.escolhas.perguntasAteSorteio = cfg.perguntasPadrao;
  estado.escolhas.modosBagunca = new Set(cfg.modos);

  montarPilulas($('bagunca-perguntas'), cfg.perguntas, (n) => String(n),
    estado.escolhas.perguntasAteSorteio, (n) => {
      estado.escolhas.perguntasAteSorteio = n;
      sincronizarBagunca();
    });

  const caixa = $('bagunca-modos');
  caixa.innerHTML = '';
  for (const modo of modosSorteaveis()) {
    const chip = criar('button', 'subchip');
    chip.type = 'button';
    chip.dataset.id = modo.id;
    chip.innerHTML = `${modo.icone} ${escapar(modo.nome)}`
      + (modo.equipes ? ` <span class="subchip__tag">${cfg.minEquipes}+</span>` : '');
    chip.title = modo.equipes
      ? `Em equipes: so entra no sorteio com ${cfg.minEquipes} ou mais na sala`
      : modo.descricao;
    chip.addEventListener('click', () => {
      const marcados = estado.escolhas.modosBagunca;
      if (marcados.has(modo.id)) marcados.delete(modo.id);
      else marcados.add(modo.id);
      sincronizarBagunca();
    });
    caixa.appendChild(chip);
  }
  sincronizarBagunca();
}

function sincronizarBagunca() {
  const marcados = estado.escolhas.modosBagunca;
  document.querySelectorAll('#bagunca-modos .subchip').forEach((chip) => {
    const marcado = marcados.has(chip.dataset.id);
    chip.classList.toggle('marcada', marcado);
    chip.setAttribute('aria-pressed', String(marcado));
  });

  const n = estado.escolhas.perguntasAteSorteio;
  $('bagunca-dica').textContent = n === 0
    ? 'Sem Modo Tempo no meio: toda rodada sai do sorteio.'
    : `${plural(n, 'pergunta', 'perguntas')} do Modo Tempo, um sorteio, uma rodada do modo sorteado — e de novo.`;

  // Os modos em equipe dependem de quem estiver na sala na hora do sorteio.
  const emEquipe = modosSorteaveis().filter((m) => m.equipes && marcados.has(m.id));
  const varios = emEquipe.length > 1;
  $('bagunca-equipes').hidden = emEquipe.length === 0;
  $('bagunca-equipes').textContent = emEquipe.length
    ? `${emEquipe.map((m) => m.nome).join(' e ')} ${varios ? 'jogam' : 'joga'} em equipes: so ${
      varios ? 'entram' : 'entra'} no sorteio com ${estado.config.bagunca.minEquipes} ou mais na sala, e as equipes saem sorteadas na hora.`
    : '';
  atualizarResumo();
}

$('btn-todos-modos').addEventListener('click', () => {
  estado.escolhas.modosBagunca = new Set(estado.config.bagunca.modos);
  sincronizarBagunca();
});

$('btn-nenhum-modo').addEventListener('click', () => {
  estado.escolhas.modosBagunca.clear();
  sincronizarBagunca();
});

/* -------------------- Faixa de dificuldade (Modo Tempo) -------------------- */

/** O nivel (facil, medio, dificil) de um ponto da faixa. */
function nivelDaFaixa(valor) {
  const { niveis } = estado.config.faixa;
  return niveis.find((n) => valor <= n.ate) || niveis[niveis.length - 1];
}

/** O titulo de uma faixa: o nivel onde ela comeca e o nivel onde termina. */
function tituloDaFaixa(faixa) {
  const de = nivelDaFaixa(faixa.min).id;
  const ate = nivelDaFaixa(faixa.max).id;
  return estado.config.faixa.titulos.find((t) => t.de === de && t.ate === ate);
}

const imagemDoTitulo = (titulo) => `img/titulos/${titulo.id}.svg`;

/**
 * A faixa de dificuldade do Modo Tempo: uma barra de duas alcas pintada de
 * verde, amarelo e vermelho, e um atalho para cada titulo.
 */
function montarFaixa() {
  const cfg = estado.config.faixa;
  if (!cfg) return;
  estado.escolhas.faixa = { ...cfg.padrao };

  // Onde cada nivel comeca e termina na barra: a divisa fica entre o ultimo
  // ponto de um nivel e o primeiro do outro (33 | 34 -> 33,5%).
  const divisas = cfg.niveis.map((n) => (n.ate >= 100 ? 100 : n.ate + 0.5));
  const pedacos = cfg.niveis.map((n, i) => ({ ...n, de: i ? divisas[i - 1] : 0, ate: divisas[i] }));
  document.querySelector('.faixa__trilho').style.background = `linear-gradient(90deg, ${
    pedacos.map((p) => `${p.cor} ${p.de}% ${p.ate}%`).join(', ')})`;

  // O nome de cada nivel embaixo do pedaco dele.
  const niveis = $('faixa-niveis');
  niveis.innerHTML = '';
  niveis.style.gridTemplateColumns = pedacos.map((p) => `${p.ate - p.de}fr`).join(' ');
  for (const nivel of cfg.niveis) {
    const rotulo = criar('span', 'faixa__nivel');
    rotulo.style.setProperty('--cor', nivel.cor);
    rotulo.textContent = nivel.nome;
    niveis.appendChild(rotulo);
  }

  // Atalhos: cada titulo leva a faixa do comeco do nivel dele ao fim do outro.
  const caixa = $('faixa-titulos');
  caixa.innerHTML = '';
  for (const titulo of cfg.titulos) {
    const de = cfg.niveis.find((n) => n.id === titulo.de);
    const ate = cfg.niveis.find((n) => n.id === titulo.ate);
    const chip = criar('button', 'titulo-chip');
    chip.type = 'button';
    chip.dataset.id = titulo.id;
    chip.title = `${de.de} a ${ate.ate}: ${titulo.dica}`;
    chip.innerHTML = `<img src="${imagemDoTitulo(titulo)}" alt="" width="28" height="28" /> ${escapar(titulo.nome)}`;
    chip.addEventListener('click', () => {
      estado.escolhas.faixa = { min: de.de, max: ate.ate };
      sincronizarFaixa();
    });
    caixa.appendChild(chip);
  }

  // As alcas nao se cruzam, nem chegam mais perto que a largura minima.
  const inputMin = $('faixa-min');
  const inputMax = $('faixa-max');
  inputMin.addEventListener('input', () => {
    estado.escolhas.faixa.min = Math.min(Number(inputMin.value), estado.escolhas.faixa.max - cfg.minLargura);
    sincronizarFaixa();
  });
  inputMax.addEventListener('input', () => {
    estado.escolhas.faixa.max = Math.max(Number(inputMax.value), estado.escolhas.faixa.min + cfg.minLargura);
    sincronizarFaixa();
  });

  // Clique na barra, fora das alcas: a alca mais perto vai ate ali.
  const controle = $('faixa-controle');
  controle.addEventListener('pointerdown', (evento) => {
    if (evento.target.tagName === 'INPUT') return; // pegou a alca: o proprio input cuida
    evento.preventDefault(); // senao o clique tira o foco da alca logo depois
    const barra = controle.getBoundingClientRect();
    const alca = parseFloat(getComputedStyle(controle).getPropertyValue('--alca')) || 0;
    const fracao = (evento.clientX - barra.left - alca / 2) / (barra.width - alca);
    const valor = Math.round(Math.min(1, Math.max(0, fracao)) * 100);
    const { min, max } = estado.escolhas.faixa;
    const input = valor <= min || Math.abs(valor - min) < Math.abs(valor - max) ? inputMin : inputMax;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    input.focus();
  });

  sincronizarFaixa();
}

function sincronizarFaixa() {
  const { min, max } = estado.escolhas.faixa;
  const nivelMin = nivelDaFaixa(min);
  const nivelMax = nivelDaFaixa(max);

  // Cada alca leva a cor do nivel onde esta, e o que fica fora da faixa apaga.
  for (const [input, valor, nivel] of [[$('faixa-min'), min, nivelMin], [$('faixa-max'), max, nivelMax]]) {
    input.value = valor;
    input.style.setProperty('--cor', nivel.cor);
    input.setAttribute('aria-valuetext', `${valor}, ${nivel.nome}`);
  }
  $('faixa-fora-min').style.width = `${min}%`;
  $('faixa-fora-max').style.width = `${100 - max}%`;

  const titulo = tituloDaFaixa(estado.escolhas.faixa);
  $('faixa').style.setProperty('--cor-de', nivelMin.cor);
  $('faixa').style.setProperty('--cor-ate', nivelMax.cor);
  $('faixa-imagem').src = imagemDoTitulo(titulo);
  $('faixa-nome').textContent = titulo.nome;
  $('faixa-dica').textContent = titulo.dica;
  $('faixa-valores').innerHTML = `<b style="color:${nivelMin.cor}">${min}</b> a <b style="color:${nivelMax.cor}">${max}</b>`;

  document.querySelectorAll('.titulo-chip').forEach((chip) => {
    const marcado = chip.dataset.id === titulo.id;
    chip.classList.toggle('escolhida', marcado);
    chip.setAttribute('aria-pressed', String(marcado));
  });
  atualizarResumo();
}

/** "Primata · 0 a 33", com a ilustracao, para os dois resumos. */
function resumoDaFaixa(faixa) {
  if (!faixa || !estado.config.faixa) return '';
  const titulo = tituloDaFaixa(faixa);
  return `<span class="resumo__faixa"><img src="${imagemDoTitulo(titulo)}" alt="" width="20" height="20" /><b>${
    escapar(titulo.nome)}</b> · ${faixa.min} a ${faixa.max}</span>`;
}

/** "7 modos · sorteio a cada 3 perguntas", para os dois resumos. */
function resumoDaBagunca(perguntas, quantosModos) {
  const ritmo = perguntas === 0
    ? 'toda rodada sorteada'
    : `sorteio a cada <b>${perguntas}</b> ${perguntas === 1 ? 'pergunta' : 'perguntas'}`;
  return `<span><b>${quantosModos}</b> ${quantosModos === 1 ? 'modo' : 'modos'} · ${ritmo}</span>`;
}

/** Pilulas de escolha unica: marca a do valor atual e chama `escolher` no clique. */
function montarPilulas(caixa, valores, rotulo, atual, escolher) {
  caixa.innerHTML = '';
  for (const valor of valores) {
    const pilula = criar('button', 'pilula');
    pilula.type = 'button';
    pilula.dataset.valor = String(valor);
    pilula.textContent = rotulo(valor);
    pilula.classList.toggle('escolhida', valor === atual);
    pilula.addEventListener('click', () => {
      escolher(valor);
      caixa.querySelectorAll('.pilula').forEach((p) => {
        p.classList.toggle('escolhida', p.dataset.valor === String(valor));
      });
      atualizarResumo();
    });
    caixa.appendChild(pilula);
  }
}

function montarLimites() {
  montarPilulas($('limite-opcoes'), estado.config.limitesMusica || [15, 20, 30, 45, 60],
    (s) => `${s}s`, estado.escolhas.limiteMusica, (s) => { estado.escolhas.limiteMusica = s; });
}

function montarFim() {
  montarPilulas($('total-opcoes'), estado.config.totaisMusicas || [10, 15, 20, 30],
    (n) => `${n} musicas`, estado.escolhas.totalMusicas, (n) => { estado.escolhas.totalMusicas = n; });
  document.querySelectorAll('#fim-opcoes .pilula').forEach((p) => {
    p.addEventListener('click', () => {
      estado.escolhas.fimPor = p.dataset.fim;
      sincronizarModo();
    });
  });
}

function montarCategorias() {
  const grade = $('grade-categorias');
  grade.innerHTML = '';

  for (const categoria of estado.config.categorias) {
    const item = criar('button', 'categoria');
    item.type = 'button';
    item.style.setProperty('--cor', categoria.cor);
    item.dataset.id = categoria.id;
    item.setAttribute('aria-pressed', 'false');
    item.innerHTML = `
      <span class="categoria__icone">${categoria.icone}</span>
      <span class="categoria__nome">${categoria.nome}</span>
      <span class="categoria__check">✔</span>`;

    item.addEventListener('click', () => {
      // Marcar a categoria marca todas as partes dela; desmarcar tira tudo.
      const marcada = estado.escolhas.categorias.has(categoria.id);
      if (marcada) estado.escolhas.categorias.delete(categoria.id);
      else estado.escolhas.categorias.add(categoria.id);
      for (const parte of partesDe(categoria)) {
        if (marcada) estado.escolhas.subs.delete(parte);
        else estado.escolhas.subs.add(parte);
      }
      sincronizarCategorias();
    });

    grade.appendChild(item);

    // Categoria dividida em partes: cada uma vira um chip abaixo dela.
    if (categoria.subs && categoria.subs.length) {
      const caixa = criar('div', 'subcategorias');
      caixa.dataset.de = categoria.id;

      for (const sub of categoria.subs) {
        const chip = criar('button', 'subchip');
        chip.type = 'button';
        chip.dataset.id = `${categoria.id}:${sub.id}`;
        chip.innerHTML = `${sub.icone} ${sub.nome}`;
        chip.title = `Perguntas de ${sub.nome} dentro de ${categoria.nome}`;

        // A parte liga e desliga sozinha: com a categoria marcada, desmarcar
        // tira só esta parte; com a categoria desmarcada, marcar traz só ela.
        chip.addEventListener('click', () => {
          if (estado.escolhas.subs.has(chip.dataset.id)) estado.escolhas.subs.delete(chip.dataset.id);
          else estado.escolhas.subs.add(chip.dataset.id);
          sincronizarCategorias();
        });

        caixa.appendChild(chip);
      }
      grade.appendChild(caixa);
    }
  }

  marcarTodasCategorias();
}

/** Tudo marcado: cada categoria com todas as partes. É assim que começa. */
function marcarTodasCategorias() {
  for (const c of estado.config.categorias) {
    estado.escolhas.categorias.add(c.id);
    partesDe(c).forEach((parte) => estado.escolhas.subs.add(parte));
  }
  sincronizarCategorias();
}

/** Partes de uma categoria, no formato 'categoria:parte'. */
function partesDe(categoria) {
  return (categoria.subs || []).map((s) => `${categoria.id}:${s.id}`);
}

/** Categorias que entram no jogo: as marcadas e as que têm alguma parte marcada. */
function categoriasEscolhidas() {
  return estado.config.categorias.filter((c) => estado.escolhas.categorias.has(c.id)
    || partesDe(c).some((parte) => estado.escolhas.subs.has(parte)));
}

function sincronizarCategorias() {
  document.querySelectorAll('.categoria').forEach((el) => {
    const marcada = estado.escolhas.categorias.has(el.dataset.id);
    el.classList.toggle('marcada', marcada);
    el.setAttribute('aria-pressed', String(marcada));
  });

  // Os chips ficam sempre à vista, mesmo com a categoria desmarcada: é assim
  // que se escolhe só uma parte dela. Só apagam quando nada ali vai para o jogo.
  document.querySelectorAll('.subcategorias').forEach((caixa) => {
    const alguma = [...estado.escolhas.subs].some((parte) => parte.startsWith(caixa.dataset.de + ':'));
    caixa.classList.toggle('apagada', !estado.escolhas.categorias.has(caixa.dataset.de) && !alguma);
  });

  document.querySelectorAll('.subchip').forEach((chip) => {
    const marcada = estado.escolhas.subs.has(chip.dataset.id);
    chip.classList.toggle('marcada', marcada);
    chip.setAttribute('aria-pressed', String(marcada));
  });

  atualizarResumo();
}

$('btn-todas-categorias').addEventListener('click', marcarTodasCategorias);

$('btn-nenhuma-categoria').addEventListener('click', () => {
  estado.escolhas.categorias.clear();
  estado.escolhas.subs.clear();
  sincronizarCategorias();
});

function montarModos() {
  const grade = $('grade-modos');
  grade.innerHTML = '';

  for (const modo of estado.config.modos) {
    const item = criar('button', 'modo');
    item.type = 'button';
    item.dataset.id = modo.id;
    if (!modo.disponivel) item.classList.add('modo--indisponivel');
    if (modo.id === estado.escolhas.modo && modo.disponivel) item.classList.add('escolhido');

    item.innerHTML = `
      ${modo.disponivel ? '' : '<span class="modo__tag">Em breve</span>'}
      <div class="modo__topo">
        <span class="modo__icone">${modo.icone}</span>
        <span class="modo__nome">${modo.nome}</span>
      </div>
      <p class="modo__desc">${modo.descricao}</p>`;

    if (modo.disponivel) {
      item.addEventListener('click', () => {
        estado.escolhas.modo = modo.id;
        document.querySelectorAll('.modo').forEach((m) => m.classList.toggle('escolhido', m.dataset.id === modo.id));
        sincronizarModo();
      });
    } else {
      item.disabled = true;
    }

    grade.appendChild(item);
  }
}

function montarMetas() {
  const caixa = $('meta-opcoes');
  const inputMeta = $('input-meta');
  caixa.innerHTML = '';

  for (const valor of METAS_SUGERIDAS) {
    const pilula = criar('button', 'pilula');
    pilula.type = 'button';
    pilula.dataset.valor = String(valor);
    pilula.textContent = `${valor} pts`;
    pilula.addEventListener('click', () => {
      estado.escolhas.metaPontos = valor;
      inputMeta.value = valor;
      sincronizarMetas();
    });
    caixa.appendChild(pilula);
  }

  inputMeta.addEventListener('input', () => {
    const valor = parseInt(inputMeta.value, 10);
    if (Number.isInteger(valor)) {
      estado.escolhas.metaPontos = valor;
      sincronizarMetas();
    }
  });

  sincronizarMetas();
}

function sincronizarMetas() {
  document.querySelectorAll('#meta-opcoes .pilula').forEach((p) => {
    p.classList.toggle('escolhida', Number(p.dataset.valor) === estado.escolhas.metaPontos);
  });
  atualizarResumo();
}

function montarTempos() {
  const caixa = $('tempo-opcoes');
  caixa.innerHTML = '';

  for (const segundos of estado.config.segundosPermitidos) {
    const pilula = criar('button', 'pilula');
    pilula.type = 'button';
    pilula.dataset.valor = String(segundos);
    pilula.textContent = `${segundos}s`;
    pilula.classList.toggle('escolhida', segundos === estado.escolhas.segundosPorPergunta);
    pilula.addEventListener('click', () => {
      estado.escolhas.segundosPorPergunta = segundos;
      document.querySelectorAll('#tempo-opcoes .pilula').forEach((p) => {
        p.classList.toggle('escolhida', Number(p.dataset.valor) === segundos);
      });
      atualizarResumo();
    });
    caixa.appendChild(pilula);
  }
}

function atualizarResumo() {
  const musical = modoMusical();
  const total = musical ? 1 : categoriasEscolhidas().length;
  const modo = estado.config.modos.find((m) => m.id === estado.escolhas.modo);
  const bagunca = Boolean(modo && modo.bagunca);
  $('resumo-config').innerHTML = musical
    ? `
    <span>${modo.icone} ${modo.nome}</span>
    <span>${resumoDoFim(estado.escolhas)}</span>
    <span>Musica de ate <b>${estado.escolhas.limiteMusica}s</b></span>`
    : `
    <span>${plural(total, 'categoria', 'categorias')}</span>
    <span>${modo ? modo.icone + ' ' + modo.nome : '—'}</span>
    ${bagunca ? resumoDaBagunca(estado.escolhas.perguntasAteSorteio, estado.escolhas.modosBagunca.size) : ''}
    ${modo && modo.id === 'tempo' ? resumoDaFaixa(estado.escolhas.faixa) : ''}
    <span>Meta <b>${estado.escolhas.metaPontos} pts</b></span>
    <span><b>${estado.escolhas.segundosPorPergunta}s</b> por pergunta</span>
    ${modo && modo.equipes ? '<span>👥 <b>4+</b> jogadores, em equipes</span>' : ''}`;

  $('btn-criar').disabled = total === 0 || (bagunca && estado.escolhas.modosBagunca.size === 0);
}

/** "Meta 120 pts" ou "15 musicas", conforme a partida acaba. */
function resumoDoFim(config) {
  return config.fimPor === 'musicas' && modoMusical(config.modo)
    ? `<b>${config.totalMusicas}</b> musicas`
    : `Meta <b>${config.metaPontos} pts</b>`;
}

$('btn-criar').addEventListener('click', () => {
  const nickname = inputNickname.value.trim();
  if (nickname.length < 2) {
    mostrarTela('tela-lobby');
    return avisar('aviso-lobby', 'Digite um nickname com pelo menos 2 caracteres.');
  }
  if (!modoMusical() && categoriasEscolhidas().length === 0) {
    return avisar('aviso-config', 'Escolha pelo menos uma categoria.');
  }
  const bagunca = estado.escolhas.modo === 'bagunca';
  if (bagunca && estado.escolhas.modosBagunca.size === 0) {
    return avisar('aviso-config', 'Deixe pelo menos um modo no sorteio da Bagunca.');
  }

  // Categoria marcada vai inteira, menos as partes desmarcadas (`fora`);
  // parte marcada de categoria desmarcada vai sozinha (`subs`).
  const marcadas = estado.escolhas.categorias;
  const config = {
    categorias: [...marcadas],
    fora: estado.config.categorias.filter((c) => marcadas.has(c.id))
      .flatMap(partesDe).filter((parte) => !estado.escolhas.subs.has(parte)),
    subs: [...estado.escolhas.subs].filter((parte) => !marcadas.has(parte.split(':')[0])),
    modo: estado.escolhas.modo,
    metaPontos: estado.escolhas.metaPontos,
    segundosPorPergunta: estado.escolhas.segundosPorPergunta,
    limiteMusica: estado.escolhas.limiteMusica,
    fimPor: estado.escolhas.fimPor,
    totalMusicas: estado.escolhas.totalMusicas,
    ...(estado.escolhas.modo === 'tempo' ? { faixa: { ...estado.escolhas.faixa } } : {}),
    ...(bagunca ? {
      perguntasAteSorteio: estado.escolhas.perguntasAteSorteio,
      modosBagunca: [...estado.escolhas.modosBagunca]
    } : {})
  };

  socket.emit('sala:criar', { nickname, config, cliente: carteirinha() }, (resposta) => {
    if (resposta.erro) return avisar('aviso-config', resposta.erro);
    avisar('aviso-config', '');
    estado.eu = resposta.eu;
    estado.sala = resposta.sala;
    salaLembrada.guardar(resposta.codigo);
    renderizarSala();
    mostrarTela('tela-sala');
  });
});

/* =====================================================================
   3. SALA DE ESPERA
   ===================================================================== */

function nomeCategoria(id) {
  const c = estado.config.categorias.find((x) => x.id === id);
  return c ? `${c.icone} ${c.nome}` : id;
}

function renderizarSala() {
  const sala = estado.sala;
  if (!sala) return;

  $('codigo-texto').textContent = sala.codigo;

  const modo = estado.config.modos.find((m) => m.id === sala.config.modo);
  // Categoria que entrou só com uma parte também conta.
  const emJogo = [...new Set([...sala.config.categorias, ...(sala.config.subs || []).map((s) => s.split(':')[0])])];
  $('resumo-sala').innerHTML = modo && modo.musical
    ? `
    <span>${modo.icone} ${modo.nome}</span>
    <span>${resumoDoFim(sala.config)}</span>
    <span>Musica de ate <b>${sala.config.limiteMusica}s</b></span>`
    : `
    <span>${modo ? modo.icone + ' ' + modo.nome : '—'}</span>
    ${modo && modo.bagunca ? resumoDaBagunca(sala.config.perguntasAteSorteio, (sala.config.modosBagunca || []).length) : ''}
    ${resumoDaFaixa(sala.config.faixa)}
    <span>Meta <b>${sala.config.metaPontos} pts</b></span>
    <span><b>${sala.config.segundosPorPergunta}s</b> por pergunta</span>
    <span>${plural(emJogo.length, 'categoria', 'categorias')}</span>`;
  $('resumo-sala').title = emJogo.map(nomeCategoria).join(', ');

  // Nos modos em equipe a sala vira um time por caixa; nos outros, uma lista só.
  const porEquipes = Boolean(modo && modo.equipes);
  const lista = $('lista-jogadores');
  lista.innerHTML = '';
  lista.hidden = porEquipes;
  $('equipes-sala').hidden = !porEquipes;

  if (porEquipes) desenharEquipesDaSala();
  else for (const jogador of sala.jogadores) lista.appendChild(crachaDeJogador(jogador));

  $('contador-jogadores').textContent = `${sala.jogadores.length}/${estado.config.maxJogadores}`;

  const souLider = sala.jogadores.some((j) => j.id === estado.eu?.id && j.lider);
  $('btn-iniciar').hidden = !souLider;
  $('texto-espera').hidden = souLider;

  // Nao adianta apertar iniciar com a sala torta — o servidor recusa. A frase
  // do que falta vem pronta de la, para a regra morar em um lugar so.
  const falta = porEquipes ? (sala.formato && sala.formato.falta) : null;
  // Na Bagunca a dica so avisa: a partida comeca, e o modo em equipe entra
  // no sorteio quando a sala tiver gente para ele.
  const aviso = falta || equipesForaDaBagunca(sala);
  const dica = $('dica-equipes');
  dica.hidden = !aviso;
  dica.textContent = aviso || '';
  $('btn-iniciar').disabled = Boolean(falta);
}

/** Bagunca com pouca gente: quais modos em equipe ficam fora do sorteio, numa frase. */
function equipesForaDaBagunca(sala) {
  if (sala.config.modo !== 'bagunca' || !estado.config.bagunca) return null;
  const minimo = estado.config.bagunca.minEquipes;
  if (sala.jogadores.length >= minimo) return null;
  const fora = (sala.config.modosBagunca || [])
    .map((id) => estado.config.modos.find((m) => m.id === id))
    .filter((m) => m && m.equipes);
  if (!fora.length) return null;
  return `Com menos de ${minimo} na sala, ${fora.map((m) => m.nome).join(' e ')} ${
    fora.length > 1 ? 'ficam' : 'fica'} fora do sorteio.`;
}

/** Um jogador na lista da sala, com o botao de expulsar para o lider. */
function crachaDeJogador(jogador) {
  const sala = estado.sala;
  const item = criar('li', 'jogador');
  const souEu = jogador.id === estado.eu?.id;
  const souLiderAgora = sala.jogadores.some((j) => j.id === estado.eu?.id && j.lider);

  item.innerHTML = `
    <button class="jogador__avatar${souEu ? ' jogador__avatar--meu' : ''}"
            type="button"${souEu ? ' title="Clique para trocar de icone"' : ' disabled'}>
      ${jogador.avatar}
    </button>
    <span class="jogador__nome">${escapar(jogador.nickname)}${souEu ? '<span class="jogador__voce">(voce)</span>' : ''}</span>
    ${jogador.lider ? '<span class="coroa">👑 Lider</span>' : ''}
    ${souLiderAgora && !souEu ? '<button class="jogador__expulsar" type="button" title="Expulsar da sala">✕</button>' : ''}`;

  if (souEu) {
    item.querySelector('.jogador__avatar').addEventListener('click', abrirEscolhaAvatar);
  }

  const botaoExpulsar = item.querySelector('.jogador__expulsar');
  if (botaoExpulsar) {
    botaoExpulsar.addEventListener('click', () => {
      if (!confirm(`Expulsar ${jogador.nickname} da sala?`)) return;
      socket.emit('sala:expulsar', { jogadorId: jogador.id }, (r) => {
        if (r?.erro) avisar('aviso-sala', r.erro);
      });
    });
  }

  return item;
}

/**
 * Os times da sala, com o botao de entrar embaixo de cada um.
 *
 * O formato — quantas equipes e de que tamanho — vem do servidor e e o lider
 * quem mexe nele, pelo + da direita e pelo + de baixo.
 */
function desenharEquipesDaSala() {
  const sala = estado.sala;
  const caixa = $('equipes-grade');
  caixa.innerHTML = '';

  const formato = sala.formato || {};
  const teto = formato.tamanho || sala.tetoEquipe || 1;
  const porId = new Map(sala.jogadores.map((j) => [j.id, j]));
  const time = formato.rotulo || 'equipe';

  desenharBotoesDeFormato(formato);
  desenharSemEquipe(formato, porId);

  for (const equipe of sala.equipes || []) {
    const bloco = criar('div', 'equipe-sala');
    bloco.style.setProperty('--cor-equipe', equipe.cor);
    const minha = equipe.jogadores.includes(estado.eu?.id);
    const cheia = equipe.jogadores.length >= teto;
    bloco.classList.toggle('minha', minha);

    const cabecalho = criar('div', 'equipe-sala__cabecalho');
    cabecalho.innerHTML = `<span class="equipe-sala__nome">${equipe.icone} ${escapar(equipe.nome)}</span>
      <span class="equipe-sala__contagem">${equipe.jogadores.length}/${teto}</span>`;
    bloco.appendChild(cabecalho);

    const lista = criar('ul', 'lista-jogadores');
    for (const id of equipe.jogadores) {
      const jogador = porId.get(id);
      if (jogador) lista.appendChild(crachaDeJogador(jogador));
    }
    bloco.appendChild(lista);

    const botao = criar('button', 'btn btn--fantasma equipe-sala__entrar');
    botao.type = 'button';
    botao.disabled = minha || cheia;
    botao.textContent = minha
      ? 'Voce joga aqui'
      : (cheia ? `${time === 'dupla' ? 'Dupla' : 'Equipe'} cheia` : `Entrar nesta ${time}`);
    botao.addEventListener('click', () => {
      socket.emit('sala:equipe', { equipeId: equipe.id }, (r) => {
        if (r?.erro) avisar('aviso-sala', r.erro);
      });
    });
    bloco.appendChild(botao);

    caixa.appendChild(bloco);
  }
}

/**
 * Liga os + e − ao que a sala aceita agora.
 *
 * So o lider mexe, entao para os outros os botoes somem — fica so a conta,
 * que todo mundo precisa ler para saber quantos cabem.
 */
function desenharBotoesDeFormato(formato) {
  const souLider = estado.sala.jogadores.some((j) => j.id === estado.eu?.id && j.lider);
  const equipes = formato.equipes || 0;
  const tamanho = formato.tamanho || 0;

  $('conta-equipes').textContent = plural(equipes, 'equipe', 'equipes');
  $('conta-tamanho').textContent = `${tamanho} por ${formato.rotulo || 'equipe'}`;

  const ligar = (id, mostrar, travado, dica) => {
    const botao = $(id);
    botao.hidden = !mostrar;
    botao.disabled = travado;
    botao.title = dica;
  };

  ligar('btn-mais-equipe', souLider, equipes >= formato.maxEquipes,
    equipes >= formato.maxEquipes ? `O maximo e ${formato.maxEquipes} equipes` : 'Mais uma equipe');
  ligar('btn-menos-equipe', souLider, equipes <= formato.minEquipes,
    equipes <= formato.minEquipes ? 'Sem duas equipes nao ha disputa' : 'Fechar a ultima equipe');
  ligar('btn-mais-tamanho', souLider, tamanho >= formato.maxTamanho,
    tamanho >= formato.maxTamanho ? `O maximo e ${formato.maxTamanho} por equipe` : 'Cabe mais um em cada equipe');
  ligar('btn-menos-tamanho', souLider, tamanho <= formato.minTamanho,
    tamanho <= formato.minTamanho ? 'Uma equipe precisa de dois' : 'Um a menos em cada equipe');
}

/** Quem ficou de fora porque nao havia vaga: o lider resolve no +. */
function desenharSemEquipe(formato, porId) {
  const lista = $('lista-sem-equipe');
  const sobrando = formato.semEquipe || [];
  lista.innerHTML = '';
  lista.hidden = sobrando.length === 0;

  for (const id of sobrando) {
    const jogador = porId.get(id);
    if (jogador) lista.appendChild(crachaDeJogador(jogador));
  }
}

function mudarFormato(campo, delta) {
  socket.emit('sala:formato', { campo, delta }, (r) => {
    if (r?.erro) avisar('aviso-sala', r.erro);
    else avisar('aviso-sala', '');
  });
}

$('btn-mais-equipe').addEventListener('click', () => mudarFormato('equipes', 1));
$('btn-menos-equipe').addEventListener('click', () => mudarFormato('equipes', -1));
$('btn-mais-tamanho').addEventListener('click', () => mudarFormato('tamanho', 1));
$('btn-menos-tamanho').addEventListener('click', () => mudarFormato('tamanho', -1));

/**
 * Balao para trocar o proprio icone.
 *
 * Os livres vem do servidor junto com o estado da sala, entao a lista nunca
 * mostra um icone que outra pessoa acabou de pegar.
 */
function abrirEscolhaAvatar() {
  const antigo = document.getElementById('balao-avatar');
  if (antigo) return antigo.remove(); // clicar de novo fecha

  const livres = estado.sala?.avataresLivres || [];
  if (!livres.length) return brindar('Nao sobrou nenhum icone livre');

  const balao = criar('div', 'balao');
  balao.id = 'balao-avatar';
  balao.innerHTML = '<span class="balao__titulo">Escolha seu icone</span>';

  const grade = criar('div', 'balao__grade');
  for (const avatar of livres) {
    const opcao = criar('button', 'balao__opcao');
    opcao.type = 'button';
    opcao.textContent = avatar;
    opcao.addEventListener('click', () => {
      socket.emit('sala:trocarAvatar', { avatar }, (r) => {
        if (r?.erro) brindar(r.erro);
      });
      balao.remove();
    });
    grade.appendChild(opcao);
  }
  balao.appendChild(grade);

  const meu = document.querySelector('.jogador__avatar--meu');
  (meu ? meu.parentElement : document.body).appendChild(balao);

  // Clicar fora fecha.
  setTimeout(() => {
    document.addEventListener('click', function fecha(e) {
      if (!balao.contains(e.target)) {
        balao.remove();
        document.removeEventListener('click', fecha);
      }
    });
  }, 0);
}

socket.on('sala:expulso', () => {
  salaLembrada.esquecer();
  estado.sala = null;
  estado.eu = null;
  pararAnimacao();
  pararAudio();
  mostrarTela('tela-lobby');
  avisar('aviso-lobby', 'O lider tirou voce da sala.');
});

$('codigo-valor').addEventListener('click', async () => {
  const codigo = estado.sala?.codigo;
  if (!codigo) return;
  try {
    await navigator.clipboard.writeText(codigo);
  } catch {
    // Sem permissão de área de transferência: o jogador copia na mão.
  }
  const aviso = $('codigo-copiado');
  aviso.classList.add('visivel');
  setTimeout(() => aviso.classList.remove('visivel'), 1600);
});

$('btn-iniciar').addEventListener('click', () => {
  socket.emit('sala:iniciar', {}, (resposta) => {
    if (resposta?.erro) avisar('aviso-sala', resposta.erro);
  });
});

function sairDaSala() {
  // Sair no botao e de proposito: a aba esquece a sala e nao tenta voltar.
  salaLembrada.esquecer();
  socket.emit('sala:sair', {}, () => {
    estado.eu = null;
    estado.sala = null;
    pararAnimacao();
    mostrarTela('tela-lobby');
  });
}

$('btn-sair-sala').addEventListener('click', sairDaSala);
$('btn-sair-jogo').addEventListener('click', () => {
  if (confirm('Sair da sala e voltar ao inicio?')) sairDaSala();
});
$('btn-fim-sair').addEventListener('click', sairDaSala);

/* =====================================================================
   4. JOGO
   ===================================================================== */

const revelacao = $('revelacao');
const jogo = $('jogo');
const barraTempo = $('barra-tempo');
const cronometro = $('cronometro');
const caixaChat = $('chat-mensagens');
const formChat = $('chat-form');
const inputChat = $('chat-input');

function escapar(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

/**
 * O modo da rodada no ar. Fora da Bagunca e o da sala; nela muda a cada
 * sorteio, e e por ele que a tela decide o que mostrar.
 */
const modoDaRodada = () => estado.sala?.modoDaRodada || estado.sala?.config.modo;

/** Na Bagunca, a etiqueta de cima diz de que modo e a rodada. */
function escreverModo() {
  const bagunca = estado.sala?.config.modo === 'bagunca';
  $('jogo-modo').hidden = !bagunca;
  if (!bagunca) return;
  const modo = estado.config.modos.find((m) => m.id === modoDaRodada());
  $('jogo-modo-nome').textContent = modo ? `${modo.icone} ${modo.nome}` : '';
}

/**
 * Esvazia uma barra no tempo pedido.
 *
 * Quem anima é o próprio navegador, por transition — assim a barra não depende
 * de a aba estar pintando quadros.
 */
/*
 * Os relogios que estao na tela agora: a barra, o numero e o aviso de
 * "acabando". A pausa congela os tres onde estiverem e, na volta, cada um
 * segue com o que faltava. Relogio que comeca com o jogo pausado (a vez do
 * carrossel quando alguem sai, por exemplo) ja nasce parado.
 */
const relogio = { barra: null, numero: null, urgencia: null };

function animarBarra(barra, duracaoMs) {
  relogio.barra = { el: barra, fim: Date.now() + duracaoMs, restante: duracaoMs, parada: estado.pausado };
  barra.style.transition = 'none';
  barra.style.transform = 'scaleX(1)';
  void barra.offsetWidth; // força o navegador a aplicar o estado inicial
  if (estado.pausado) return;
  barra.style.transition = `transform ${duracaoMs}ms linear`;
  barra.style.transform = 'scaleX(0)';
}

/**
 * Conta os segundos que faltam dentro de um elemento.
 *
 * Em setInterval de propósito: em aba de fundo o navegador segura os quadros
 * do rAF, mas continua chamando o intervalo (no pior caso, uma vez por
 * segundo — que é exatamente a precisão de que um contador precisa).
 */
function contarSegundos(elemento, duracaoMs, aoZerar) {
  pararContagem();
  const fim = Date.now() + duracaoMs;
  relogio.numero = { el: elemento, fim, aoZerar, restante: duracaoMs, parado: estado.pausado };
  if (estado.pausado) {
    if (elemento) elemento.textContent = Math.ceil(duracaoMs / 1000);
    return;
  }

  const escrever = () => {
    const restante = Math.max(0, fim - Date.now());
    const segundos = Math.ceil(restante / 1000);
    if (elemento && elemento.textContent !== String(segundos)) {
      elemento.textContent = segundos;
    }
    if (restante <= 0) {
      pararContagem();
      if (aoZerar) aoZerar();
    }
    return segundos;
  };

  escrever();
  estado.contagem = setInterval(escrever, 200);
}

function pararContagem() {
  if (estado.contagem) {
    clearInterval(estado.contagem);
    estado.contagem = null;
  }
}

/** Cronômetro da pergunta: barra + número + aviso de "acabando". */
function contarTempo(barra, duracaoMs, mostrarSegundos) {
  animarBarra(barra, duracaoMs);
  if (!mostrarSegundos) return;

  cronometro.classList.remove('urgente');
  contarSegundos($('cronometro-num'), duracaoMs);
  vigiarUrgencia(duracaoMs);
}

/** O "urgente" acompanha o mesmo intervalo do número. */
function vigiarUrgencia(duracaoMs) {
  const fim = Date.now() + duracaoMs;
  pararUrgencia();
  relogio.urgencia = { fim, restante: duracaoMs, parada: estado.pausado };
  if (estado.pausado) return;
  estado.urgencia = setInterval(() => {
    const segundos = Math.ceil(Math.max(0, fim - Date.now()) / 1000);
    cronometro.classList.toggle('urgente', segundos <= 5 && segundos > 0);
    if (segundos <= 0) pararUrgencia();
  }, 200);
}

/** Congela a barra, o numero e o "acabando" onde estiverem. */
function pausarRelogios() {
  const agora = Date.now();
  const barra = relogio.barra;
  if (barra && !barra.parada) {
    barra.restante = Math.max(0, barra.fim - agora);
    // A barra anda por transition: para parar, fixa a escala de agora.
    const matriz = getComputedStyle(barra.el).transform;
    const escala = matriz && matriz.startsWith('matrix(') ? parseFloat(matriz.slice(7)) : 0;
    barra.el.style.transition = 'none';
    barra.el.style.transform = `scaleX(${escala})`;
    barra.parada = true;
  }
  const numero = relogio.numero;
  if (numero && !numero.parado && estado.contagem) {
    numero.restante = Math.max(0, numero.fim - agora);
    numero.parado = true;
    pararContagem();
  }
  const urgencia = relogio.urgencia;
  if (urgencia && !urgencia.parada && estado.urgencia) {
    urgencia.restante = Math.max(0, urgencia.fim - agora);
    urgencia.parada = true;
    pararUrgencia();
  }
}

/** Cada relogio segue com o que faltava quando a pausa comecou. */
function retomarRelogios() {
  const barra = relogio.barra;
  if (barra && barra.parada) {
    barra.parada = false;
    barra.fim = Date.now() + barra.restante;
    void barra.el.offsetWidth;
    barra.el.style.transition = `transform ${barra.restante}ms linear`;
    barra.el.style.transform = 'scaleX(0)';
  }
  const numero = relogio.numero;
  if (numero && numero.parado) {
    numero.parado = false;
    contarSegundos(numero.el, numero.restante, numero.aoZerar);
  }
  const urgencia = relogio.urgencia;
  if (urgencia && urgencia.parada) vigiarUrgencia(urgencia.restante);
}

function pararUrgencia() {
  if (estado.urgencia) {
    clearInterval(estado.urgencia);
    estado.urgencia = null;
  }
}

function pararAnimacao() {
  pararContagem();
  pararUrgencia();
}

/* --------------------- 4a. Revelação da categoria --------------------- */

socket.on('rodada:categoria', (dados) => {
  estado.acertou = false;
  estado.emRodada = true;
  estado.votei = false;
  mostrarVotacao(0, 0);
  if (estado.sala && dados.modo) estado.sala.modoDaRodada = dados.modo;

  mostrarTela('tela-jogo');
  jogo.hidden = true;
  esconderSorteio();
  revelacao.hidden = false;

  atualizarBotoesDePausa();
  $('revelacao-rodada').textContent = rotuloDaRodada(dados);
  $('revelacao-icone').textContent = dados.categoria.icone;
  $('revelacao-nome').textContent = dados.categoria.nome;
  $('revelacao-nome').style.color = '';

  contarTempo($('revelacao-barra'), dados.duracaoMs, false);
  contarSegundos($('revelacao-num'), dados.duracaoMs);
  $('revelacao-espera').hidden = true;

  estado.carregando = dados.imagem ? 'a imagem' : (dados.audio ? 'a musica' : null);
  if (dados.imagem) preCarregarImagem(dados.imagem, dados.rodada);
  else if (dados.audio) preCarregarAudio(dados.audio, dados.rodada);

  if (dados.placar) renderizarPlacar(dados.placar);
});

/**
 * "Rodada 4", e na Bagunca o que ela e: o modo sorteado, ou em que pergunta
 * do Modo Tempo a sala esta ate o proximo sorteio.
 */
function rotuloDaRodada(dados) {
  const bagunca = dados.bagunca;
  if (!bagunca) return `Rodada ${dados.rodada}`;
  if (bagunca.pergunta) return `Rodada ${dados.rodada} · ${bagunca.pergunta} de ${bagunca.de} ate o sorteio`;
  const modo = estado.config.modos.find((m) => m.id === dados.modo);
  return modo ? `Rodada ${dados.rodada} · ${modo.icone} ${modo.nome}` : `Rodada ${dados.rodada}`;
}

/* ------------------------- 4a2. Sorteio da Bagunca ------------------------- */

/*
 * A roleta gira pelos modos que podiam sair, freando, e para no sorteado.
 * Quem sorteia e o servidor — a roleta e so o espetaculo, e chega ao fim
 * com folga para a mesa ler a regra do modo (e as equipes, se for o caso)
 * antes de a tela da categoria entrar.
 */
let roleta = null;

socket.on('bagunca:sorteio', (dados) => {
  estado.emRodada = true;
  estado.votei = false;
  if (estado.sala) estado.sala.modoDaRodada = dados.modo.id;

  mostrarTela('tela-jogo');
  jogo.hidden = true;
  revelacao.hidden = true;
  $('sorteio').hidden = false;
  atualizarBotoesDePausa();

  $('sorteio-rodada').textContent = `Sorteio · rodada ${dados.rodada}`;
  pararContagem();
  contarTempo($('sorteio-barra'), dados.duracaoMs, false);
  girarRoleta(dados);

  if (dados.placar) renderizarPlacar(dados.placar);
});

function girarRoleta(dados) {
  clearTimeout(roleta);
  const caixa = $('sorteio');
  caixa.classList.remove('sorteio--parou');
  $('sorteio-desc').hidden = true;
  $('sorteio-equipes').hidden = true;

  const opcoes = dados.roleta && dados.roleta.length > 1 ? dados.roleta : null;
  if (!opcoes) return pararRoleta(dados);

  // Cada passo demora um pouco mais que o anterior: uns dois segundos ao todo.
  const PASSOS = 16;
  let passo = 0;
  let i = Math.floor(Math.random() * opcoes.length);
  const girar = () => {
    if (passo >= PASSOS) return pararRoleta(dados);
    const modo = opcoes[i++ % opcoes.length];
    $('sorteio-icone').textContent = modo.icone;
    $('sorteio-nome').textContent = modo.nome;
    passo += 1;
    roleta = setTimeout(girar, 45 + passo * passo);
  };
  girar();
}

function pararRoleta(dados) {
  roleta = null;
  $('sorteio-icone').textContent = dados.modo.icone;
  $('sorteio-nome').textContent = dados.modo.nome;
  $('sorteio').classList.add('sorteio--parou');

  const desc = $('sorteio-desc');
  desc.textContent = dados.modo.descricao || '';
  desc.hidden = !dados.modo.descricao;

  // Modo em equipe: as equipes sairam junto com o sorteio.
  const lista = $('sorteio-equipes');
  lista.innerHTML = '';
  lista.hidden = !dados.equipes;
  for (const equipe of dados.equipes || []) {
    const item = criar('li', 'sorteio__equipe');
    item.style.setProperty('--cor-equipe', equipe.cor);
    item.innerHTML = `<b>${equipe.icone} ${escapar(equipe.nome)}</b> ${
      equipe.jogadores.map(escapar).join(', ')}`;
    lista.appendChild(item);
  }
}

function esconderSorteio() {
  clearTimeout(roleta);
  roleta = null;
  $('sorteio').hidden = true;
}

/**
 * Baixa a musica da pergunta durante a tela da categoria e ja deixa o audio
 * parado no ponto sorteado. O aviso ao servidor e o mesmo da imagem: a
 * pergunta so abre quando todo mundo esta pronto para ouvir o mesmo pedaco
 * ao mesmo tempo — na Corrida musical, quem ouve dois segundos depois perde.
 *
 * Cada pre-carga ganha um numero: um aviso atrasado da rodada anterior nao
 * pula o audio da rodada nova para o ponto velho.
 */
let preCarga = 0;
function preCarregarAudio(audio, rodada) {
  const player = $('tocador-audio');
  const minha = ++preCarga;
  pararAudio();
  estado.musica = null;
  if (player.getAttribute('src') !== audio.url) player.src = audio.url;

  let avisou = false;
  const avisar = () => {
    if (avisou || minha !== preCarga) return;
    avisou = true;
    socket.emit('rodada:imagemPronta', { rodada });
  };
  // Pronto e: ja pulou para o ponto e tem audio dali para a frente.
  const quandoPulou = () => {
    if (minha !== preCarga) return;
    if (player.readyState >= 3) return avisar();
    player.addEventListener('canplay', avisar, { once: true });
  };
  const pular = () => {
    if (minha !== preCarga) return;
    player.addEventListener('seeked', quandoPulou, { once: true });
    player.currentTime = audio.inicio || 0;
  };
  // Musica que nao carrega avisa igual: esperar por ela so atrasaria a sala.
  player.addEventListener('error', avisar, { once: true });
  if (player.readyState >= 1) pular();
  else player.addEventListener('loadedmetadata', pular, { once: true });
}

/**
 * Baixa a imagem da pergunta enquanto a categoria esta na tela, e avisa o
 * servidor quando ela esta pronta para aparecer. O relogio da pergunta so
 * comeca depois do aviso de todo mundo: assim ninguem perde segundos olhando
 * um quadro vazio. A imagem vai direto no <img> da pergunta, que ainda esta
 * escondido — quando a pergunta abrir, ela ja esta la.
 */
function preCarregarImagem(url, rodada) {
  const img = $('pergunta-imagem');
  if (img.getAttribute('src') !== url) img.src = url;
  const avisar = () => socket.emit('rodada:imagemPronta', { rodada });
  // decode() espera baixar E decodificar: so o "load" ainda deixaria a
  // imagem grande pintando aos pedacos no primeiro segundo.
  const pronta = img.decode
    ? img.decode()
    : new Promise((ok, falhou) => {
      if (img.complete) return ok();
      img.addEventListener('load', ok, { once: true });
      img.addEventListener('error', falhou, { once: true });
    });
  // Imagem quebrada avisa igual: esperar por ela so atrasaria a sala.
  pronta.then(avisar, avisar);
}

// A tela da categoria acabou, mas ainda tem gente baixando a imagem.
socket.on('rodada:aguardando', ({ prontos, total, duracaoMs } = {}) => {
  const aviso = $('revelacao-espera');
  aviso.textContent = `Carregando ${estado.carregando || 'a imagem'} para todo mundo… ${prontos} de ${total} prontos`;
  if (aviso.hidden) {
    aviso.hidden = false;
    // A barra recomeça: e o tempo maximo que a sala espera.
    contarTempo($('revelacao-barra'), duracaoMs, false);
    $('revelacao-num').textContent = '';
  }
});

/* --------------------------- 4b. Pergunta --------------------------- */

// Charada de emoji ("Que filme estes emojis representam? 🦁👑🌅"): os emojis
// do fim do enunciado descem para uma linha propria, grandes como no telao.
// O teclado numerico (1️⃣) e a bandeira (🇺🇸) tambem contam como emoji.
const EMOJIS_NO_FIM = /^(.*?)\s*((?:[0-9#*]️?⃣|[\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Modifier}‍️]|\s)+)$/u;

function escreverPergunta(texto) {
  const alvo = $('pergunta-texto');
  const partes = String(texto ?? '').match(EMOJIS_NO_FIM);
  if (!partes || !/\p{Extended_Pictographic}/u.test(partes[2])) {
    alvo.textContent = texto;
    return;
  }
  alvo.textContent = partes[1];
  const emojis = criar('span', 'pergunta__emojis');
  emojis.textContent = partes[2].trim();
  alvo.appendChild(emojis);
}

socket.on('rodada:pergunta', (dados) => {
  atualizarBotoesDePausa();
  revelacao.hidden = true;
  esconderSorteio();
  jogo.hidden = false;
  mostrarTela('tela-jogo');

  estado.acertou = false;

  $('jogo-codigo').textContent = estado.sala?.codigo || '----';
  $('jogo-rodada').textContent = dados.rodada;
  escreverMeta(dados.rodada);
  escreverModo();

  // A categoria fica pequena, logo acima da pergunta.
  $('pergunta-categoria').style.setProperty('--cor-categoria', dados.categoria.cor);
  $('pergunta-categoria-icone').textContent = dados.categoria.icone;
  $('pergunta-categoria-nome').textContent = dados.categoria.nome;

  escreverPergunta(dados.pergunta);
  $('pergunta-texto').classList.remove('pergunta__texto--segredo');
  $('mascara').textContent = dados.mascara || '';

  // Perguntas de música mostram o trecho da letra em destaque, uma linha
  // por vez — quebrar as linhas é o que faz o trecho parecer uma letra.
  const letra = $('letra');
  const linhas = Array.isArray(dados.letra) ? dados.letra : (dados.letra ? [dados.letra] : []);
  letra.innerHTML = '';
  for (const texto of linhas) {
    const linha = criar('span', 'letra__linha');
    linha.textContent = texto;
    letra.appendChild(linha);
  }
  letra.hidden = linhas.length === 0;

  // 1 eh bom 2 ok 3 eh demais: a primeira dica entra com a pergunta; as outras duas
  // chegam sozinhas no meio da rodada.
  mostrarDicas(dados.veni);

  // Mais ou Menos Pontos: a escala fica a vista, senao ninguem sabe se vale
  // a pena arriscar o nome dificil.
  const escala = $('ranking-aviso');
  escala.hidden = !dados.ranking;
  if (dados.ranking) {
    const ja = dados.ranking.jaDitos || [];
    escala.textContent = `Volta ${dados.ranking.volta} de ${dados.ranking.voltas} nesta lista. `
      + `Cada um responde uma vez: o 1o da lista vale 1 ponto e o ${dados.ranking.total}o vale ${
        dados.ranking.total}. Fora da lista, zero.`
      + (ja.length ? ` Ja sairam: ${ja.join(', ')}.` : '');
    escala.title = dados.ranking.fonte || '';
  }

  // Modo Escalada: painel com quantas respostas faltam.
  estado.necessarias = dados.necessarias || 1;
  estado.meusItens = [];
  const painel = $('escalada');
  // No Carrossel e no Presente Grego o painel "suas respostas — so voce ve"
  // nao cabe: ali cada acerto e publico, senao a pessoa seguinte repete o que
  // ja saiu (e no leilao a mesa inteira acompanha a entrega).
  painel.hidden = estado.necessarias < 2 || Boolean(dados.carrossel) || Boolean(dados.presente);
  if (!painel.hidden) {
    $('escalada-itens').innerHTML = '';
    atualizarEscalada();
  }

  montarAudio(dados.audio, dados.audioInicio, dados.audioLimiteMs);
  desenharOpcoes(dados.opcoes);

  const figura = $('pergunta-figura');
  if (dados.imagem) {
    // Ja veio carregada na tela da categoria: trocar o src de novo faria
    // o navegador recomecar.
    if ($('pergunta-imagem').getAttribute('src') !== dados.imagem) $('pergunta-imagem').src = dados.imagem;
    $('pergunta-imagem').alt = dados.pergunta;
    figura.hidden = false;
  } else {
    figura.hidden = true;
    $('pergunta-imagem').removeAttribute('src');
  }

  $('resultado').hidden = true;
  $('status-respostas').textContent = '';

  inputChat.disabled = false;
  // Modo Tempo e Escalada: cada palpite errado gasta uma das chances.
  inputChat.placeholder = dados.chances
    ? `Escreva sua resposta… (${plural(dados.chances, 'chance', 'chances')})`
    : 'Escreva sua resposta…';
  if (!('ontouchstart' in window)) inputChat.focus();

  // Modo Carrossel: a fila de jogadores e de quem é a vez.
  const carrossel = $('carrossel');
  estado.carrossel = dados.carrossel || null;
  carrossel.hidden = !dados.carrossel;
  if (dados.carrossel) {
    estado.vivos = new Set(dados.carrossel.ordem);
    montarFilaCarrossel(dados.carrossel.ordem, null);
    $('carrossel-volta').textContent =
      `${dados.carrossel.voltas} volta${dados.carrossel.voltas > 1 ? 's' : ''}`;
    // Enquanto a vez não chega, ninguém escreve.
    mostrarDitos(dados.carrossel.visivel ? [] : null);
    trancarChat('Espere a sua vez…');
  }

  // Presente Grego: o leilao acabou, a pergunta abriu para a mesa inteira e
  // agora so quem foi desafiado escreve.
  if (dados.presente) abrirEntregaDoPresente(dados.presente);
  else { $('presente').hidden = true; $('segredo').hidden = true; }

  if (!dados.presente) mensagemSistema(`Rodada ${dados.rodada} · ${dados.categoria.nome}`);

  // 1 eh bom 2 ok 3 eh demais: aqui o campo nao e chat, e um palpite fechado — ele so
  // aparece para a mesa quando o tempo da dica acaba.
  if (dados.veni) {
    inputChat.placeholder = 'Trave sua resposta — ninguem ve ate a janela fechar…';
    $('status-respostas').textContent = 'Ninguem palpitou ainda.';
  }

  // Qual e a musica: a resposta e o clique, o chat e so conversa.
  if (dados.opcoes) {
    inputChat.placeholder = 'Clique numa das opcoes. Aqui e so conversa…';
    $('status-respostas').textContent = 'Ninguem escolheu ainda.';
  } else if (modoDaRodada() === 'corrida') {
    inputChat.placeholder = `Seja o primeiro a acertar… (${plural(dados.chances, 'chance', 'chances')})`;
  }

  pararContagem();
  // No carrossel o relógio é de cada vez, não da rodada: quem conta é
  // 'carrossel:vez'.
  if (dados.duracaoMs) contarTempo(barraTempo, dados.duracaoMs, true);
});

/** Deixa o campo de resposta indisponível com um aviso no lugar. */
function trancarChat(aviso) {
  // Pausado, o campo fica trancado: a mudanca vale para quando o jogo voltar.
  if (estado.pausado) {
    estado.chatDaPausa = { disabled: true, placeholder: aviso };
    return;
  }
  inputChat.disabled = true;
  inputChat.value = '';
  inputChat.placeholder = aviso;
}

function destrancarChat(aviso) {
  if (estado.pausado) {
    estado.chatDaPausa = { disabled: false, placeholder: aviso };
    return;
  }
  inputChat.disabled = false;
  inputChat.placeholder = aviso;
  if (!('ontouchstart' in window)) inputChat.focus();
}

/** Desenha a fila do carrossel, marcando de quem é a vez e quem já saiu. */
function montarFilaCarrossel(ordem, jogadorDaVez) {
  const fila = $('carrossel-fila');
  fila.innerHTML = '';
  const porId = new Map((estado.placar || []).map((j) => [j.id, j]));

  for (const id of ordem) {
    const jogador = porId.get(id);
    const item = criar('li', 'carrossel__jogador');
    if (id === jogadorDaVez) item.classList.add('agora');
    if (estado.vivos && !estado.vivos.has(id)) item.classList.add('fora');
    item.innerHTML = `<span>${jogador ? jogador.avatar : '👤'}</span><span>${
      jogador ? jogador.nickname : '—'}</span>`;
    fila.appendChild(item);
  }
}

/** Desenha a lista do que ja foi respondido nesta rodada. */
function mostrarDitos(ditos) {
  const caixa = $('carrossel-ditos');
  const lista = $('carrossel-lista');
  // No Carrossel as cegas o servidor manda null: nao existe lista para ver.
  if (!ditos) { caixa.hidden = true; estado.ditos = null; return; }
  lista.innerHTML = '';
  for (const nome of ditos) {
    const el = criar('li', 'carrossel__dito');
    el.textContent = nome;
    lista.appendChild(el);
  }
  caixa.hidden = ditos.length === 0;
  estado.ditos = ditos.slice();
}

/** Acrescenta um item na hora, sem esperar a proxima vez comecar. */
function registrarDito(nome) {
  if (estado.ditos === null) return;   // modo as cegas
  const ditos = estado.ditos || [];
  if (ditos.includes(nome)) return;
  mostrarDitos(ditos.concat(nome));
}

socket.on('carrossel:vez', (dados) => {
  estado.vivos = new Set(dados.vivos);
  // O às cegas manda `null` de propósito. Trocar por [] fazia o registrarDito
  // achar que havia lista e piscar a resposta embaixo até a próxima vez.
  mostrarDitos(dados.ditos);
  montarFilaCarrossel(dados.ordem, dados.jogadorId);

  const minha = dados.jogadorId === socket.id;
  const porId = new Map((estado.placar || []).map((j) => [j.id, j]));
  const jogador = porId.get(dados.jogadorId);

  const rotulo = $('carrossel-vez');
  rotulo.classList.toggle('minha', minha);
  rotulo.textContent = minha ? 'Sua vez!' : `Vez de ${jogador ? jogador.nickname : '…'}`;
  $('carrossel-volta').textContent = `volta ${dados.volta} de ${dados.voltas}`;

  if (minha) destrancarChat('Rapido! Escreva sua resposta…');
  else trancarChat(`Vez de ${jogador ? jogador.nickname : 'outro jogador'}…`);

  pararContagem();
  contarTempo(barraTempo, dados.msPorVez, true);
});

socket.on('carrossel:eliminado', (dados) => {
  estado.vivos = new Set(dados.vivos);
  if (estado.carrossel) montarFilaCarrossel(estado.carrossel.ordem, null);

  if (dados.jogadorId === socket.id) {
    trancarChat('Voce saiu desta rodada.');
    // Sem isto o rótulo continuava em "Sua vez!" depois de a pessoa cair.
    const rotulo = $('carrossel-vez');
    rotulo.classList.remove('minha');
    rotulo.textContent = 'Voce saiu desta rodada';
  }
});

/* --------------------- Pular a rodada por votação --------------------- */

/**
 * Desenha os dois botões de pular — o da tela de categoria e o do jogo.
 *
 * São dois porque a votação vale nas duas telas: dá para recusar a categoria
 * assim que ela aparece, e o voto continua valendo depois que a pergunta abre.
 */
function mostrarVotacao(votos, necessarios) {
  const texto = votos > 0 ? `${votos}/${necessarios}` : '';
  for (const [botao, marcador] of [['btn-pular', 'pular-votos'], ['btn-pular-rev', 'pular-votos-rev']]) {
    $(marcador).textContent = texto;
    $(botao).classList.toggle('votou', estado.votei);
  }
}

function votarPular() {
  socket.emit('sala:pular', {}, (r) => {
    if (r?.erro) return avisoParticular(r.erro);
    estado.votei = Boolean(r.votou);
    mostrarVotacao(r.votos, r.necessarios);
  });
}

$('btn-pular').addEventListener('click', votarPular);
$('btn-pular-rev').addEventListener('click', votarPular);

socket.on('rodada:pular', (dados) => {
  // O servidor manda quem votou, então o botão continua certo mesmo se o
  // callback do próprio clique chegar fora de ordem.
  estado.votei = dados.quem.includes(socket.id);
  mostrarVotacao(dados.votos, dados.necessarios);
});

/* ------------------------ Modo Presente Grego ------------------------ */

/**
 * Limpa os blocos que só aparecem em alguns modos.
 *
 * O leilão entra na tela do jogo sem passar pelo `rodada:pergunta`, então
 * precisa apagar o que sobrou da rodada anterior por conta própria.
 */
function limparTabuleiro() {
  $('resultado').hidden = true;
  $('escalada').hidden = true;
  $('carrossel').hidden = true;
  $('letra').hidden = true;
  $('dicas').hidden = true;
  $('dicas').innerHTML = '';
  esconderPalpites();
  $('ranking-aviso').hidden = true;
  $('pergunta-figura').hidden = true;
  $('segredo').hidden = true;
  $('mascara').textContent = '';
  $('status-respostas').textContent = '';
  montarAudio(null);
  desenharOpcoes(null);
}

/** Etiqueta de cima: a meta de pontos, ou em que musica a partida esta. */
function escreverMeta(rodada) {
  const config = estado.sala?.config;
  const porMusicas = Boolean(config && config.fimPor === 'musicas' && modoMusical(config.modo));
  $('jogo-meta-rotulo').textContent = porMusicas ? 'Musica' : 'Meta';
  $('jogo-meta').textContent = porMusicas
    ? `${rodada ?? estado.sala?.rodada ?? 0} de ${config.totalMusicas}`
    : `${config?.metaPontos ?? '—'} pts`;
}

/* --------------------------- Qual e a musica --------------------------- */

/** As quatro opcoes da rodada (ou nada, nos outros modos). */
function desenharOpcoes(opcoes) {
  const caixa = $('opcoes');
  caixa.innerHTML = '';
  caixa.hidden = !opcoes;
  estado.minhaOpcao = null;
  if (!opcoes) return;

  opcoes.forEach((texto, indice) => {
    const botao = criar('button', 'opcao');
    botao.type = 'button';
    botao.innerHTML = `<span class="opcao__letra">${'ABCD'[indice] || indice + 1}</span>`
      + `<span class="opcao__texto">${escapar(texto)}</span>`;
    botao.addEventListener('click', () => escolherOpcao(indice));
    caixa.appendChild(botao);
  });
}

/**
 * Um clique por musica, sem troca. Ninguem fica sabendo na hora se acertou:
 * a certa so aparece no resultado.
 */
function escolherOpcao(indice) {
  if (estado.minhaOpcao !== null || estado.pausado) return;
  estado.minhaOpcao = indice;
  marcarMinhaOpcao(indice);

  socket.emit('sala:opcao', { indice }, (resposta) => {
    if (resposta?.erro) {
      estado.minhaOpcao = null;
      marcarMinhaOpcao(null);
      return avisoParticular(resposta.erro);
    }
    avisoParticular('Resposta travada. A certa aparece quando a musica acabar.');
  });
}

function marcarMinhaOpcao(indice) {
  [...$('opcoes').children].forEach((botao, i) => {
    botao.classList.toggle('escolhida', i === indice);
    botao.disabled = indice !== null;
  });
}

// Quantos ja clicaram — sem dizer em que, nem se acertaram.
socket.on('qual:escolheu', ({ quantos, total } = {}) => {
  $('status-respostas').textContent = `${quantos} de ${total} ja escolheram`;
});

/** No resultado: a certa em verde e, se a minha era outra, ela em vermelho. */
function revelarOpcoes(opcoes) {
  const botoes = [...$('opcoes').children];
  if (!opcoes || !botoes.length) return;
  botoes.forEach((botao, i) => {
    botao.disabled = true;
    botao.classList.toggle('certa', i === opcoes.certa);
    botao.classList.toggle('errada', i === estado.minhaOpcao && i !== opcoes.certa);
  });
}

/* ------------------------ 1 eh bom 2 ok 3 eh demais -------------------------- */

/** Comeca a lista de dicas da rodada (ou esconde, nos outros modos). */
function mostrarDicas(veni) {
  const lista = $('dicas');
  lista.innerHTML = '';
  lista.hidden = !veni;
  esconderPalpites();
  if (!veni) return;
  acrescentarDica(veni.dica, veni.indice, veni.vale);
}

function esconderPalpites() {
  const lista = $('palpites');
  if (!lista) return;
  lista.hidden = true;
  lista.innerHTML = '';
}

/**
 * Os palpites de todo mundo, abertos de uma vez.
 *
 * Enquanto a dica esta no ar ninguem ve nada — e o que faz o palpite valer:
 * se desse para ler o do vizinho, a primeira resposta certa valeria por todos.
 */
function mostrarPalpites(dados) {
  const lista = $('palpites');
  lista.innerHTML = '';
  lista.hidden = false;

  if (!dados.palpites.length) {
    const vazio = criar('li', 'palpite palpite--vazio');
    vazio.textContent = 'Ninguem arriscou nesta dica.';
    lista.appendChild(vazio);
    return;
  }

  for (const p of dados.palpites) {
    const item = criar('li', p.certo ? 'palpite palpite--certo' : 'palpite palpite--errado');
    // A resposta em cima e quem escreveu de subtitulo embaixo: o que a mesa
    // quer ler primeiro e o palpite, nao de quem ele e.
    item.innerHTML = `<span class="palpite__corpo">
        <span class="palpite__texto">${escapar(p.texto)}</span>
        <span class="palpite__quem">${escapar(p.avatar)} ${escapar(p.nickname)}</span>
      </span>
      <span class="palpite__marca">${p.certo ? '+' + dados.vale : '✗'}</span>`;
    lista.appendChild(item);
  }
}

/** Uma dica na tela, com quanto vale acertar a partir dela. */
function acrescentarDica(texto, indice, vale) {
  const lista = $('dicas');
  lista.hidden = false;

  const item = criar('li', 'dica');
  if (indice > 0) item.classList.add('dica--nova');
  item.innerHTML = `<span class="dica__texto">${escapar(texto)}</span>
    <span class="dica__vale">vale ${vale}</span>`;
  lista.appendChild(item);
}

socket.on('veni:dica', (dados) => {
  acrescentarDica(dados.dica, dados.indice, dados.vale);
  mensagemSistema(`Dica ${dados.indice + 1}: ${dados.dica} · agora vale ${dados.vale}`);

  // Janela nova: os palpites da anterior saem da tela e o relogio recomeca.
  esconderPalpites();
  $('status-respostas').textContent = 'Ninguem palpitou ainda.';
  destrancarChat('Trave sua resposta — ninguem ve ate a janela fechar…');
  pararContagem();
  if (dados.duracaoMs) contarTempo(barraTempo, dados.duracaoMs, true);
});

/** Quantos ja escreveram alguma coisa — o que, so no fim. */
socket.on('veni:palpitou', (dados) => {
  $('status-respostas').textContent = dados.quantos >= dados.total
    ? 'Todo mundo ja palpitou.'
    : `${dados.quantos} de ${dados.total} ja palpitaram`;
});

socket.on('veni:revelacao', (dados) => {
  mostrarPalpites(dados);
  if (dados.placar) renderizarPlacar(dados.placar);

  const certos = dados.palpites.filter((p) => p.certo);
  mensagemSistema(certos.length
    ? `${certos.map((p) => p.nickname).join(', ')} ${certos.length > 1 ? 'acertaram' : 'acertou'} — ${dados.vale} pts`
    : 'Ninguem acertou nesta dica.');

  $('status-respostas').textContent = certos.length
    ? `${certos.length} de ${dados.palpites.length} acertaram`
    : 'Nenhum acerto nesta dica.';

  trancarChat(dados.fim ? 'Fim da rodada…' : 'Ja vem a proxima dica…');
  pararContagem();
  contarTempo(barraTempo, dados.duracaoMs, true);
});

/** No Leilao Geral cada um leiloa por si: nao ha parceiro, nem duvido. */
const leilaoGeral = () => modoDaRodada() === 'leilao-geral';

/** Dando dicas: leilao ao contrario, em duplas — o lance desce. */
const dandoDicas = () => modoDaRodada() === 'dando-dicas';

socket.on('leilao:comeco', (dados) => {
  revelacao.hidden = true;
  esconderSorteio();
  jogo.hidden = false;
  mostrarTela('tela-jogo');

  estado.acertou = false;
  estado.carrossel = null;
  estado.presente = {
    equipes: dados.equipes, aposta: 0, equipeAposta: null,
    maxAposta: dados.maxAposta, reverso: Boolean(dados.reverso), fora: []
  };

  $('jogo-codigo').textContent = estado.sala?.codigo || '----';
  $('jogo-rodada').textContent = dados.rodada;
  escreverMeta(dados.rodada);
  escreverModo();

  $('pergunta-categoria').style.setProperty('--cor-categoria', dandoDicas() ? '#38bdf8' : '#f59e0b');
  $('pergunta-categoria-icone').textContent = dandoDicas() ? '💡' : (leilaoGeral() ? '🔨' : '🎁');
  $('pergunta-categoria-nome').textContent = dandoDicas()
    ? 'Dando dicas' : (leilaoGeral() ? 'Leilao geral' : 'Leilao');

  limparTabuleiro();

  // Quem vai responder não pode ler o enunciado: para essa pessoa a pergunta
  // chega só no fim do leilão, pelo `rodada:pergunta`.
  const souLeiloeiro = dados.equipes.some((d) => d.leiloeiro && d.leiloeiro.id === socket.id);
  $('pergunta-texto').textContent = souLeiloeiro
    ? (dandoDicas() ? 'Vendo a palavra…' : 'Lendo a pergunta…')
    : dandoDicas()
      ? 'Seu parceiro esta leiloando por voce. Voce so descobre a palavra pelas dicas dele.'
      : 'Seu parceiro esta leiloando por voce. Voce so ve a pergunta quando o leilao acabar.';
  $('pergunta-texto').classList.toggle('pergunta__texto--segredo', !souLeiloeiro);

  $('presente').hidden = false;
  $('presente-entrega').hidden = true;
  $('presente-forma').hidden = true;
  $('presente-itens').innerHTML = '';
  $('presente-itens').classList.toggle('presente__itens--dicas', dandoDicas());
  $('presente-fase').textContent = dandoDicas() ? 'Leilao ao contrario' : 'Leilao';
  $('presente-lance').textContent = 'sem lance ainda';
  desenharEquipes(null, null);

  trancarChat('O leilao esta rolando…');
  mensagemSistema(`Rodada ${dados.rodada} · ${
    dandoDicas() ? 'leilao ao contrario, em duplas'
      : leilaoGeral() ? 'leilao geral' : 'leilao em equipes'}`);
  pararContagem();
});

// Chega só para quem está leiloando.
socket.on('leilao:pergunta', (dados) => {
  // Dando dicas: quem leiloa nao le um enunciado — le a palavra que vai ter
  // que arrancar do parceiro, e ela fica a vista ate a rodada acabar.
  if (dados.segredo) {
    if (estado.presente) estado.presente.segredo = dados.segredo;
    $('pergunta-texto').textContent = 'Faca seu parceiro dizer:';
    mostrarSegredo(dados.segredo);
  } else {
    escreverPergunta(dados.pergunta);
  }
  $('pergunta-texto').classList.remove('pergunta__texto--segredo');
});

/** A palavra secreta em destaque, so na tela de quem da as dicas. */
function mostrarSegredo(palavra) {
  const caixa = $('segredo');
  caixa.textContent = palavra;
  caixa.hidden = !palavra;
}

/** Desenha as equipes com os papéis da rodada e quem está com a palavra. */
function desenharEquipes(equipeDaVez, equipeDoLance) {
  const lista = $('presente-equipes');
  lista.innerHTML = '';
  if (!estado.presente) return;

  for (const equipe of estado.presente.equipes) {
    const item = criar('li', 'presente__equipe');
    item.dataset.id = equipe.id;
    item.style.setProperty('--cor-equipe', equipe.cor);
    if (equipe.id === equipeDaVez) item.classList.add('agora');
    if (equipe.id === equipeDoLance) item.classList.add('topo');

    const meu = [equipe.leiloeiro, equipe.respondedor].some((p) => p && p.id === estado.eu?.id);
    if (meu) item.classList.add('minha');

    const fora = (estado.presente.fora || []).includes(equipe.id);
    if (fora) item.classList.add('fora');

    const lance = estado.presente.lances?.[equipe.id];
    const selo = lance ? `<span class="presente__valor">${lance}</span>` : '';
    const nomes = (icone, titulo, pessoa) => `<span class="presente__papel" title="${titulo}">${
      icone} ${escapar(pessoa ? pessoa.nickname : '—')}</span>`;

    item.innerHTML = leilaoGeral()
      ? `
      <span class="presente__equipe-nome">${equipe.icone} ${
        escapar(equipe.leiloeiro ? equipe.leiloeiro.nickname : equipe.nome)}</span>
      <span class="presente__papel">${fora ? 'passou' : 'no leilao'}</span>
      ${selo}`
      : dandoDicas()
        ? `
      <span class="presente__equipe-nome">${equipe.icone} ${escapar(equipe.nome)}</span>
      ${nomes('💡', 'leiloa e da as dicas', equipe.leiloeiro)}
      ${nomes('🤔', 'adivinha, sem ver a palavra', equipe.respondedor)}
      ${selo}`
        : `
      <span class="presente__equipe-nome">${equipe.icone} ${escapar(equipe.nome)}</span>
      ${nomes('🔨', 'leiloa esta rodada', equipe.leiloeiro)}
      ${nomes('🎁', 'responde esta rodada, sem ver a pergunta', equipe.respondedor)}
      ${selo}`;
    lista.appendChild(item);
  }
}

socket.on('leilao:vez', (dados) => {
  if (!estado.presente) return;
  estado.presente.aposta = dados.aposta;
  estado.presente.vez = dados.jogadorId;

  const equipe = estado.presente.equipes.find((d) => d.id === dados.equipeId);
  const minha = dados.jogadorId === socket.id;

  desenharEquipes(dados.equipeId, estado.presente.equipeAposta);

  $('presente-lance').textContent = dados.aposta > 0
    ? `lance na mesa: ${dandoDicas() ? plural(dados.aposta, 'dica', 'dicas') : dados.aposta}`
    : 'sem lance ainda';

  const vez = $('presente-vez');
  vez.classList.toggle('minha', minha);
  vez.textContent = minha
    ? (dandoDicas()
      ? 'Sua vez: em quantas dicas voce faz seu parceiro acertar?'
      : leilaoGeral()
        ? 'Sua vez: quantas voce consegue dizer sozinho?'
        : 'Sua vez: quantas o seu parceiro consegue dizer?')
    : `Vez de ${equipe && equipe.leiloeiro ? equipe.leiloeiro.nickname : '…'}`;

  const forma = $('presente-forma');
  forma.hidden = !minha;
  if (minha) {
    const campo = $('presente-input');
    const teto = dados.maximo ?? estado.presente.maxAposta ?? 60;
    campo.min = String(dados.minimo);
    campo.max = String(teto);
    // No leilao ao contrario o campo abre no lance mais seguro que ainda
    // cobre — um a menos que o da mesa; nos outros, no minimo para cobrir.
    campo.value = String(dandoDicas() ? teto : dados.minimo);
    campo.disabled = dados.podeApostar === false;
    $('presente-campo-rotulo').textContent = dandoDicas()
      ? 'Acerta em' : (leilaoGeral() ? 'Eu digo' : 'Meu parceiro diz');
    $('presente-apostar').disabled = dados.podeApostar === false;
    $('presente-apostar').textContent = dandoDicas() ? 'Faco em menos' : 'Apostar';

    const duvidar = $('presente-duvidar');
    const passar = $('presente-passar');
    duvidar.hidden = leilaoGeral() || dandoDicas();
    passar.hidden = !leilaoGeral() && !dandoDicas();
    duvidar.disabled = !dados.podeDuvidar;
    duvidar.title = dados.podeDuvidar
      ? `Duvido que a outra equipe faca ${dados.aposta}`
      : 'So da para duvidar de um lance que ja esta na mesa';
    passar.disabled = !dados.podePassar;
    passar.title = dados.podePassar
      ? 'Sai do leilao desta rodada'
      : 'Quem abre o leilao tem que apostar';
    if (!('ontouchstart' in window) && !campo.disabled) campo.focus();
  }

  pararContagem();
  contarTempo(barraTempo, dados.msPorLance, true);
});

socket.on('leilao:passou', (dados) => {
  if (!estado.presente) return;
  estado.presente.fora = dados.fora || [];
  desenharEquipes(null, estado.presente.equipeAposta);
});

socket.on('leilao:lance', (dados) => {
  if (!estado.presente) return;
  estado.presente.aposta = dados.aposta;
  estado.presente.equipeAposta = dados.equipeId;
  estado.presente.lances = { [dados.equipeId]: dados.aposta };

  $('presente-lance').textContent = `lance na mesa: ${
    dandoDicas() ? plural(dados.aposta, 'dica', 'dicas') : dados.aposta}`;
  $('presente-forma').hidden = true;
  desenharEquipes(null, dados.equipeId);
});

socket.on('leilao:fim', (dados) => {
  if (!estado.presente) return;
  estado.presente.aposta = dados.aposta;
  estado.presente.respondedor = dados.respondedor;

  $('presente-forma').hidden = true;
  $('presente-fase').textContent = dandoDicas()
    ? 'Ninguem foi mais baixo!'
    : leilaoGeral() ? 'Ninguem cobriu!' : 'Duvidaram!';
  $('presente-lance').textContent = dandoDicas()
    ? `${plural(dados.aposta, 'dica', 'dicas')} para entregar`
    : `aposta cobrada: ${dados.aposta}`;
  desenharEquipes(dados.equipeDuvidou, dados.equipeAposta);

  const vez = $('presente-vez');
  const souEu = dados.respondedor === socket.id;
  const souODicador = dados.dicador === socket.id;
  vez.classList.toggle('minha', souEu || souODicador);
  vez.textContent = dandoDicas()
    ? (souODicador
      ? `A dupla e sua! Prepare ${plural(dados.aposta, 'dica', 'dicas')} para ${dados.nicknameRespondedor}.`
      : souEu
        ? `${dados.nicknameDicador} vai te dar ${plural(dados.aposta, 'dica', 'dicas')}. Prepare-se!`
        : `${dados.nicknameDicador} tem ${plural(dados.aposta, 'dica', 'dicas')} para ${
          dados.nicknameRespondedor} acertar`)
    : leilaoGeral()
      ? (souEu
        ? `Voce levou o leilao! Prepare-se para dizer ${dados.aposta}.`
        : `${dados.nicknameRespondedor} levou o leilao e tem que dizer ${dados.aposta}`)
      : (souEu
        ? `${dados.nicknameDuvidou} duvidou de voce! Prepare-se para dizer ${dados.aposta}.`
        : `${dados.nicknameDuvidou} duvidou · ${dados.nicknameRespondedor} tem que dizer ${dados.aposta}`);

  pararContagem();
  contarTempo(barraTempo, dados.duracaoMs, true);
});

/** Depois do leilão a pergunta é pública e só o desafiado responde. */
function abrirEntregaDoPresente(presente) {
  if (!estado.presente) estado.presente = { equipes: [] };
  estado.presente.aposta = presente.aposta;
  estado.presente.respondedor = presente.respondedor;
  estado.presente.dicador = presente.dicador;
  estado.presente.entregues = [];

  if (dandoDicas()) return abrirEntregaDasDicas(presente);

  const souEu = presente.respondedor === socket.id;
  const quem = (estado.placar || []).find((j) => j.id === presente.respondedor);

  $('presente').hidden = false;
  $('presente-forma').hidden = true;
  $('presente-fase').textContent = 'Entrega';
  $('presente-lance').textContent = `aposta de ${presente.aposta}`;
  desenharEquipes(presente.equipeAposta, presente.equipeAposta);

  const vez = $('presente-vez');
  vez.classList.toggle('minha', souEu);
  vez.textContent = souEu
    ? `Voce prometeu ${presente.aposta}. Escreva no chat!`
    : `${quem ? quem.nickname : (leilaoGeral() ? 'Quem levou o leilao' : 'A pessoa desafiada')
      } tem que dizer ${presente.aposta}`;

  $('presente-entrega').hidden = false;
  $('presente-itens').innerHTML = '';
  $('presente-rotulo').textContent = souEu ? 'suas respostas' : `respostas de ${quem ? quem.nickname : '…'}`;
  atualizarEntrega(0, presente.aposta);

  if (souEu) destrancarChat(`Diga ${plural(presente.aposta, 'resposta', 'respostas')}…`);
  else trancarChat(`${quem ? quem.nickname : 'Quem foi desafiado'} esta respondendo…`);
}

/**
 * Dando dicas: a entrega tem duas pessoas escrevendo.
 *
 * Quem deu o lance manda as palavras — uma de cada vez, e só as que prometeu
 * — e o parceiro chuta. A mesa assiste: quem leiloou pelas outras duplas já
 * viu a palavra e entregaria tudo numa frase.
 */
function abrirEntregaDasDicas(presente) {
  const cracha = (id) => (estado.placar || []).find((j) => j.id === id);
  const adivinha = cracha(presente.respondedor);
  const dicador = cracha(presente.dicador);
  const souODicador = presente.dicador === socket.id;
  const souEu = presente.respondedor === socket.id;

  $('presente').hidden = false;
  $('presente-forma').hidden = true;
  $('presente-fase').textContent = 'Dicas';
  $('presente-lance').textContent = `teto de ${plural(presente.aposta, 'dica', 'dicas')}`;
  desenharEquipes(presente.equipeAposta, presente.equipeAposta);

  // A palavra continua a vista para quem esta dando as dicas, e so para ele.
  $('pergunta-texto').textContent = souODicador
    ? 'Faca seu parceiro dizer:'
    : 'Adivinhe a palavra pelas dicas.';
  mostrarSegredo(souODicador ? estado.presente.segredo : null);

  const vez = $('presente-vez');
  vez.classList.toggle('minha', souEu || souODicador);
  vez.textContent = souODicador
    ? `Uma palavra por dica. Voce tem ${plural(presente.aposta, 'dica', 'dicas')}.`
    : souEu
      ? `${dicador ? dicador.nickname : 'Seu parceiro'} esta te dando as dicas. Chute a vontade!`
      : `${dicador ? dicador.nickname : 'A dupla'} tenta em ${
        plural(presente.aposta, 'dica', 'dicas')} · ${adivinha ? adivinha.nickname : '…'} adivinha`;

  $('presente-entrega').hidden = false;
  $('presente-itens').innerHTML = '';
  $('presente-itens').classList.add('presente__itens--dicas');
  $('presente-rotulo').textContent = 'dicas dadas';
  atualizarEntrega(0, presente.aposta);

  if (souODicador) destrancarChat('Uma palavra por dica…');
  else if (souEu) destrancarChat('Chute a palavra!');
  else trancarChat(`${dicador ? dicador.nickname : 'A dupla'} esta dando as dicas…`);
}

socket.on('dicas:nova', (dados) => {
  const el = criar('li', 'presente__item presente__item--dica');
  el.textContent = `${dados.indice}. ${dados.dica}`;
  $('presente-itens').appendChild(el);
  atualizarEntrega(dados.indice, dados.total);

  // Gastou a ultima: quem deu as dicas nao tem mais o que fazer a nao ser
  // torcer, e o campo diz isso em vez de ficar convidando a escrever.
  if (dados.indice >= dados.total && dados.jogadorId === socket.id) {
    trancarChat('Suas dicas acabaram. Agora e torcer!');
  }
});

socket.on('dicas:acertou', (dados) => {
  $('presente-fase').textContent = 'Acertou!';
  $('presente-lance').textContent = `na dica ${dados.dicas} de ${dados.prometidas}`;
  const vez = $('presente-vez');
  vez.classList.add('minha');
  vez.textContent = `A palavra era ${dados.palavra}.`;
});

function atualizarEntrega(quantos, aposta) {
  const contador = $('presente-contador');
  contador.textContent = `${quantos} de ${aposta}`;
  contador.classList.toggle('completo', quantos >= aposta);
}

socket.on('presente:progresso', (dados) => {
  const el = criar('li', 'presente__item');
  el.textContent = dados.item;
  $('presente-itens').appendChild(el);
  atualizarEntrega(dados.quantos, dados.aposta);
});

$('presente-forma').addEventListener('submit', (evento) => {
  evento.preventDefault();
  const aposta = parseInt($('presente-input').value, 10);
  if (!Number.isInteger(aposta)) return avisoParticular('Escreva um numero inteiro.');

  socket.emit('sala:apostar', { aposta }, (resposta) => {
    if (resposta?.erro) avisoParticular(resposta.erro);
  });
});

$('presente-passar').addEventListener('click', () => {
  socket.emit('sala:passar', {}, (resposta) => {
    if (resposta?.erro) avisoParticular(resposta.erro);
  });
});

$('presente-duvidar').addEventListener('click', () => {
  socket.emit('sala:duvidar', {}, (resposta) => {
    if (resposta?.erro) avisoParticular(resposta.erro);
  });
});

/* --------------------------- Modo Escalada --------------------------- */

function atualizarEscalada() {
  const contador = $('escalada-contador');
  const quantos = estado.meusItens.length;
  contador.textContent = `${quantos} de ${estado.necessarias}`;
  contador.classList.toggle('completo', quantos >= estado.necessarias);
}

function registrarItem(nome) {
  if (estado.meusItens.includes(nome)) return;
  estado.meusItens.push(nome);

  const el = criar('li', 'escalada__item');
  el.textContent = nome;
  $('escalada-itens').appendChild(el);
  atualizarEscalada();
}

/* ------------------------------ Audio -------------------------------- */

/**
 * Prepara o tocador da rodada.
 *
 * O arquivo e a musica inteira e a sala sorteia o ponto: todo mundo ouve o
 * mesmo pedaco, do segundo `inicio` ate o limite. A tela da categoria ja
 * baixou o audio e parou ali (preCarregarAudio), entao aqui e so dar o play.
 *
 * Tenta tocar sozinho, mas o navegador recusa som automatico em pagina sem
 * interacao recente. Quando recusa, o botao ganha destaque em vez de a
 * pergunta ficar muda sem ninguem entender por que — e o toque entra no ponto
 * em que os outros estao, nao no comeco do pedaco.
 */
function montarAudio(url, inicio = 0, limiteMs = null) {
  const caixa = $('tocador');
  const player = $('tocador-audio');

  pararAudio();
  estado.musica = null;

  if (!url) {
    caixa.hidden = true;
    player.removeAttribute('src');
    return;
  }

  caixa.hidden = false;
  caixa.classList.remove('tocando', 'travado', 'acabou');
  $('tocador-aviso').textContent = '';
  estado.musica = {
    inicio: inicio || 0,
    limite: limiteMs ? limiteMs / 1000 : Infinity,
    abriuEm: Date.now(),
    paradoMs: 0,       // quanto a rodada ficou pausada
    pausouEm: null
  };
  if (player.getAttribute('src') !== url) player.src = url;
  tocarNoPonto();
}

/** Segundos de musica que ja correram para a sala, sem contar a pausa. */
function musicaDecorrida() {
  const m = estado.musica;
  const pausaAgora = m.pausouEm ? Date.now() - m.pausouEm : 0;
  return Math.max(0, (Date.now() - m.abriuEm - m.paradoMs - pausaAgora) / 1000);
}

/** Toca do ponto em que a sala esta agora — ou avisa que o pedaco ja acabou. */
function tocarNoPonto() {
  const m = estado.musica;
  const player = $('tocador-audio');
  if (!m) return;

  const ponto = m.inicio + musicaDecorrida();
  if (ponto >= m.inicio + m.limite) return musicaAcabou();
  // Meio segundo de diferenca nao vale um pulo: pular tambem engasga.
  if (player.readyState >= 1 && Math.abs(player.currentTime - ponto) > 0.5) player.currentTime = ponto;
  else if (player.readyState < 1) {
    player.addEventListener('loadedmetadata', () => { player.currentTime = ponto; }, { once: true });
  }

  subirVolume(player);
  player.play()
    .then(() => marcarTocando(true))
    .catch(() => {
      // Autoplay bloqueado: quem toca e a pessoa.
      $('tocador').classList.add('travado');
      $('tocador-aviso').textContent = 'Toque para ouvir';
    });
}

/**
 * Entrada suave: o pedaco cai no meio de uma frase, e comecar no volume cheio
 * soa como um tranco. Sobe ate o volume que a pessoa escolheu. (O iPhone
 * ignora o volume do <audio>: la entra seco.)
 */
function subirVolume(player) {
  clearInterval(estado.subindoVolume);
  aplicarVolume(player);
  player.volume = 0;
  const comeco = Date.now();
  estado.subindoVolume = setInterval(() => {
    const fracao = Math.min(1, (Date.now() - comeco) / 600);
    player.volume = fracao * volumeDoAudio();
    if (fracao >= 1) clearInterval(estado.subindoVolume);
  }, 40);
}

/** O pedaco chegou ao limite da sala. */
function musicaAcabou() {
  const player = $('tocador-audio');
  player.pause();
  marcarTocando(false);
  $('tocador').classList.add('acabou');
  $('tocador-aviso').textContent = 'Fim do trecho';
}

function marcarTocando(sim) {
  $('tocador').classList.toggle('tocando', sim);
  $('tocador-botao').innerHTML = sim ? '&#10074;&#10074;' : '&#9654;';
}

function pararAudio() {
  const player = $('tocador-audio');
  if (!player) return;
  clearInterval(estado.subindoVolume);
  player.pause();
  marcarTocando(false);
}

$('tocador-botao').addEventListener('click', () => {
  const player = $('tocador-audio');
  $('tocador').classList.remove('travado');
  $('tocador-aviso').textContent = '';

  if (player.paused) {
    // A musica e da sala: voltar a tocar entra onde os outros estao.
    if (estado.musica) return tocarNoPonto();
    player.play().then(() => marcarTocando(true)).catch(() => {
      $('tocador-aviso').textContent = 'Nao consegui tocar este audio';
    });
  } else {
    player.pause();
    marcarTocando(false);
  }
});

// O limite: o arquivo e a musica inteira, quem para no fim do pedaco e a tela.
$('tocador-audio').addEventListener('timeupdate', () => {
  const m = estado.musica;
  const player = $('tocador-audio');
  if (m && !player.paused && player.currentTime >= m.inicio + m.limite) musicaAcabou();
});

/*
 * Destrava o som no primeiro toque na pagina.
 *
 * O iPhone so deixa tocar sozinho um <audio> que ja tocou dentro de um toque
 * da pessoa. Sem isso, na Corrida musical quem esta no celular teria que
 * tocar no "ouvir" a cada musica e largaria atras. Um instante de silencio no
 * primeiro toque (entrar, criar a sala, digitar o nome) resolve para o resto.
 */
const SILENCIO = 'data:audio/wav;base64,UklGRuwAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YcgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
function destravarSom() {
  const player = $('tocador-audio');
  // Com musica carregada, mexer no src atrapalharia a rodada.
  if (estado.somDestravado || player.getAttribute('src')) return;
  player.src = SILENCIO;
  player.play()
    .then(() => {
      estado.somDestravado = true;
      player.pause();
      if (player.getAttribute('src') === SILENCIO) player.removeAttribute('src');
      document.removeEventListener('pointerdown', destravarSom, true);
      document.removeEventListener('keydown', destravarSom, true);
    })
    .catch(() => {
      if (player.getAttribute('src') === SILENCIO) player.removeAttribute('src');
    });
}
document.addEventListener('pointerdown', destravarSom, true);
document.addEventListener('keydown', destravarSom, true);

$('tocador-audio').addEventListener('ended', () => marcarTocando(false));
$('tocador-audio').addEventListener('error', () => {
  $('tocador').classList.remove('tocando');
  $('tocador-aviso').textContent = 'Audio indisponivel';
});

/* ------------------------------ Volume ------------------------------- */

// O volume e de cada navegador: fica guardado e vale para toda musica, da
// rodada e do trecho das estatisticas.
const VOLUME = 'pensarapido:volume';
const VOLUME_PADRAO = { nivel: 80, mudo: false };

function lerVolume() {
  try {
    const salvo = JSON.parse(localStorage.getItem(VOLUME));
    if (salvo && Number.isFinite(salvo.nivel)) {
      return { nivel: Math.min(100, Math.max(0, Math.round(salvo.nivel))), mudo: Boolean(salvo.mudo) };
    }
  } catch { /* sem armazenamento, ou guardado torto: fica o padrao */ }
  return { ...VOLUME_PADRAO };
}

function guardarVolume() {
  try { localStorage.setItem(VOLUME, JSON.stringify(estado.volume)); } catch { /* sem armazenamento: vale so ate fechar */ }
}

estado.volume = lerVolume();

// No iPhone o volume do <audio> e so do aparelho: a pagina escreve e ele
// continua em 1. La a barra nao mexeria em nada, entao fica so o mudo.
const volumeFixo = (() => {
  const teste = document.createElement('audio');
  teste.volume = 0.5;
  return teste.volume === 1;
})();

/**
 * O volume do <audio>, de 0 a 1, para o nivel da barra. A conta e o
 * quadrado: o ouvido sente o volume em escala, e na reta a metade de baixo
 * da barra seria quase toda alta.
 */
function volumeDoAudio() {
  return (estado.volume.nivel / 100) ** 2;
}

function aplicarVolume(player) {
  if (!player) return;
  player.muted = estado.volume.mudo || estado.volume.nivel === 0;
  player.volume = volumeDoAudio();
}

/** Mexeu no volume: vale na hora, inclusive no meio da entrada suave. */
function mudarVolume(mudanca) {
  Object.assign(estado.volume, mudanca);
  guardarVolume();
  clearInterval(estado.subindoVolume);
  aplicarVolume($('tocador-audio'));
  aplicarVolume(abaEstatisticas.audio);
  desenharVolume();
}

function desenharVolume() {
  const { nivel, mudo } = estado.volume;
  const calado = mudo || nivel === 0;
  const caixa = $('volume');
  caixa.classList.toggle('volume--mudo', calado);
  caixa.classList.toggle('volume--baixo', !calado && nivel < 50);
  const barra = $('volume-barra');
  barra.value = nivel;
  barra.hidden = volumeFixo;
  barra.style.setProperty('--nivel', `${calado ? 0 : nivel}%`);
  barra.setAttribute('aria-valuetext', calado ? 'Sem som' : `${nivel}%`);
  const botao = $('volume-mudo');
  botao.setAttribute('aria-pressed', String(calado));
  botao.setAttribute('aria-label', calado ? 'Ligar o som' : 'Tirar o som');
  botao.title = calado ? 'Ligar o som' : 'Tirar o som';
}

// Arrastar a barra liga o som de novo, como em qualquer tocador.
$('volume-barra').addEventListener('input', () => {
  mudarVolume({ nivel: Number($('volume-barra').value), mudo: false });
});

$('volume-mudo').addEventListener('click', () => {
  const { nivel, mudo } = estado.volume;
  // Calado pela barra no zero: o botao devolve um volume que se ouca.
  if (nivel === 0) return mudarVolume({ nivel: 50, mudo: false });
  mudarVolume({ mudo: !mudo });
});

desenharVolume();

/* ------------------------------- Chat -------------------------------- */

function adicionarMensagem(elemento) {
  caixaChat.appendChild(elemento);
  // Segura o histórico para o chat não crescer sem fim.
  while (caixaChat.children.length > 80) caixaChat.firstChild.remove();
  caixaChat.scrollTop = caixaChat.scrollHeight;
}

function mensagemSistema(texto, destaque = false) {
  const el = criar('div', 'msg msg--sistema' + (destaque ? ' destaque' : ''));
  el.textContent = texto;
  adicionarMensagem(el);
}

/**
 * Aviso que só quem escreveu enxerga — não vai para o chat de ninguém.
 *
 * `classe` troca a cor: o "quase" é amarelo, o item de lista é azul.
 * `dica` é a máscara de letras do "quase" ("c_ra"), que entra em destaque.
 */
function avisoParticular(texto, classe = 'msg--privado', dica = '') {
  const el = criar('div', `msg ${classe}`);
  el.innerHTML = `${escapar(texto)}
    ${dica ? `<code class="msg__mascara">${escapar(dica)}</code>` : ''}
    <span class="msg__so-voce">so voce esta vendo isto</span>`;
  adicionarMensagem(el);

  formChat.classList.remove('quase');
  void formChat.offsetWidth; // reinicia a animação
  formChat.classList.add('quase');
  setTimeout(() => formChat.classList.remove('quase'), 900);
}

/**
 * Item de lista acertado, no mesmo formato compacto do acerto — só que azul e
 * particular.
 *
 * Azul é a cor de "um item da lista"; verde fica reservado para quem fechou a
 * resposta inteira. Na Escalada a mensagem precisa ser particular: se fosse
 * pública, entregaria o item para os outros.
 */
function avisoDeItem(resposta) {
  const el = criar('div', 'msg msg--item');
  const eu = estado.eu || {};
  const quanto = resposta.pontos ? ` · +${resposta.pontos} pts` : '';
  const falta = resposta.necessarias && resposta.quantos != null
    ? ` · faltam ${resposta.necessarias - resposta.quantos}`
    : '';

  el.innerHTML = `${eu.avatar || ''} <b>${escapar(eu.nickname || 'Voce')}</b> acertou: `
    + `<b>${escapar(resposta.item)}</b>${quanto}${falta}`
    + '<span class="msg__so-voce">so voce esta vendo isto</span>';
  adicionarMensagem(el);
}

socket.on('chat:mensagem', (msg) => {
  if (msg.tipo === 'sistema') return mensagemSistema(msg.texto, msg.destaque);

  const souEu = msg.jogadorId === estado.eu?.id;

  if (msg.tipo === 'acerto') {
    // Acerto com `texto` é um item de lista (Carrossel, Presente Grego): azul.
    // Sem `texto`, é a resposta fechada da rodada: verde.
    // No às cegas o item vem sem `texto` (o nome não pode vazar), mas continua
    // sendo item de lista: `item` mantém o azul.
    const cor = (msg.texto || msg.item) ? 'msg--item' : 'msg--acerto';
    const el = criar('div', `msg ${cor}` + (souEu ? ' msg--eu' : ''));
    const quando = msg.ms != null ? ` em ${(msg.ms / 1000).toFixed(1)}s` : '';
    // No Carrossel vem tambem O QUE foi respondido: sem isso ninguem sabe o
    // que ja saiu, e repetir elimina.
    const oQue = msg.texto ? `: <b>${escapar(msg.texto)}</b>` : '';
    // No Presente Grego o item nao vale ponto na hora: a conta e no fim da
    // rodada, e e tudo ou nada.
    const ganho = msg.pontos ? ` · +${msg.pontos} pts` : '';
    el.innerHTML = `${msg.avatar} <b>${escapar(msg.nickname)}</b> acertou${oQue}${quando}${ganho}`;
    if (msg.texto && estado.carrossel) registrarDito(msg.texto);
    adicionarMensagem(el);
    return;
  }

  const el = criar('div', 'msg' + (souEu ? ' msg--eu' : ''));
  el.innerHTML =
    `<span class="msg__nome">${msg.avatar} ${escapar(msg.nickname)}</span>: ${escapar(msg.texto)}`;
  adicionarMensagem(el);
});

formChat.addEventListener('submit', (evento) => {
  evento.preventDefault();
  enviarDoChat();
});

/*
 * O Enter do celular.
 *
 * No computador o Enter envia pelo proprio formulario. No celular nem sempre:
 * com texto preditivo, o teclado do Android trata o Enter como "confirmar a
 * palavra" (chega como tecla 229, sem a acao padrao de enviar), e alguns
 * teclados mandam uma quebra de linha no lugar da tecla. Era preciso tocar
 * duas vezes, ou no botao.
 *
 * Entao o Enter e tratado aqui, nos dois formatos, e o teclado mostra
 * "Enviar" (enterkeyhint="send"), que o navegador trata como acao: confirma a
 * palavra e envia num toque so. Quem esta compondo de verdade (japones,
 * chines) continua confirmando com o Enter sem enviar no meio.
 */
inputChat.addEventListener('keydown', (evento) => {
  if (evento.key !== 'Enter' || evento.isComposing || evento.keyCode === 229) return;
  evento.preventDefault();
  enviarDoChat();
});
inputChat.addEventListener('beforeinput', (evento) => {
  if (evento.inputType !== 'insertLineBreak' && evento.inputType !== 'insertParagraph') return;
  evento.preventDefault();
  enviarDoChat();
});
// Tocar no botao de enviar nao tira o foco do campo: o teclado do celular
// fica aberto para a proxima resposta.
formChat.querySelector('.chat__enviar').addEventListener('mousedown', (evento) => evento.preventDefault());
formChat.querySelector('.chat__enviar').addEventListener('touchstart', (evento) => {
  evento.preventDefault();
  enviarDoChat();
}, { passive: false });

function enviarDoChat() {
  const texto = inputChat.value.trim();
  if (!texto || inputChat.disabled) return;
  inputChat.value = '';

  socket.emit('sala:palpite', { texto }, (resposta) => {
    if (!resposta) return;
    if (resposta.erro) return avisoParticular(resposta.erro);

    if (resposta.veredito === 'quase') {
      // A dica mostra ONDE errou: "c_ra" para quem escreveu "cera".
      avisoParticular('Quase! Faltou acertar as letras marcadas:',
        'msg--privado', resposta.dica);

    } else if (resposta.veredito === 'bloqueado') {
      avisoParticular(resposta.motivo === 'chances'
        ? 'Suas chances acabaram nesta pergunta. Segurei a mensagem para nao entregar a resposta.'
        : 'Segurei essa mensagem para nao entregar a resposta.');

    } else if (resposta.veredito === 'repetido') {
      avisoParticular(`Voce ja tinha dito "${resposta.item}". Tente outra.`);

    } else if (resposta.veredito === 'errado') {
      // Mais ou Menos Pontos: e um palpite por rodada, e esse foi o dele.
      // Carrossel às cegas: errar não elimina, só gasta o relógio.
      avisoParticular(resposta.gastou
        ? 'Nao esta na lista — e era o seu palpite desta rodada.'
        : 'Nao vale. Tente outra — voce ainda tem tempo.');

    } else if (resposta.veredito === 'eliminado') {
      // Carrossel: saiu da rodada — por errar (visível) ou repetir (às cegas).
      avisoParticular(resposta.motivo === 'repetiu'
        ? 'Essa ja tinha saido. Voce saiu desta rodada.'
        : resposta.repetido
          ? `"${resposta.repetido}" ja tinha sido dito. Voce saiu desta rodada.`
          : 'Errou! Voce saiu desta rodada.');

    } else if (resposta.veredito === 'dica') {
      // Dando dicas: a palavra já foi para a mesa pelo chat; aqui só fica o
      // lembrete de quantas ainda restam.
      inputChat.placeholder = resposta.restam > 0
        ? `Restam ${plural(resposta.restam, 'dica', 'dicas')}…`
        : 'Era a ultima dica. Agora e torcer!';

    } else if (resposta.veredito === 'item') {
      // Um item de lista tem cara propria: azul, e no mesmo formato do acerto
      // — verde continua sendo "fechou a resposta inteira".
      if (!estado.carrossel) registrarItem(resposta.item);
      avisoDeItem(resposta);

    } else if (resposta.veredito === 'palpite') {
      // 1 eh bom 2 ok 3 eh demais: guardado e mudo ate a revelacao. Responder
      // e travar, entao quem responde por ultimo fecha a janela para a mesa:
      // so da para repensar enquanto ainda falta alguem.
      avisoParticular(resposta.trocou
        ? `Troquei seu palpite para "${resposta.texto}".`
        : `Palpite travado: "${resposta.texto}". Da para trocar enquanto a janela estiver aberta.`);

    } else if (resposta.veredito === 'certo') {
      estado.acertou = true;
      if (resposta.item) registrarItem(resposta.item);
      inputChat.placeholder = 'Acertou! Agora e so papo…';
    }

    // Modo Tempo e Escalada: o palpite errado (ou o "quase") gastou uma chance.
    if (typeof resposta.chances === 'number') mostrarChances(resposta.chances);
  });
}

/** Quantos palpites errados ainda cabem nesta pergunta, no proprio campo. */
function mostrarChances(restam) {
  if (restam > 0) {
    if (restam === 1) avisoParticular('Ultima chance nesta pergunta!');
    inputChat.placeholder = `Restam ${plural(restam, 'chance', 'chances')}…`;
    return;
  }
  avisoParticular('Acabaram suas chances nesta pergunta.');
  inputChat.placeholder = 'Sem chances nesta pergunta. Agora e so papo…';
}

socket.on('rodada:acertou', (dados) => {
  $('status-respostas').textContent =
    `${dados.totalAcertos} de ${dados.totalJogadores} ja acertaram`;

  const item = document.querySelector(`.placar__item[data-id="${dados.jogadorId}"]`);
  if (item) {
    item.classList.remove('respondeu');
    void item.offsetWidth; // reinicia a animação
    item.classList.add('respondeu');
  }

  if (dados.placar) renderizarPlacar(dados.placar);
});

/* --------------------------- 4c. Resultado --------------------------- */

socket.on('rodada:resultado', (dados) => {
  pararAnimacao();
  estado.votei = false;
  mostrarVotacao(0, 0);
  barraTempo.style.transform = 'scaleX(0)';
  cronometro.classList.remove('urgente');
  $('mascara').textContent = '';
  pararAudio();
  // A rodada acabou: o botao do tocador deixa de seguir a sala e toca dali.
  estado.musica = null;
  revelarOpcoes(dados.opcoes);
  $('escalada').hidden = true;
  // Fim da rodada do Carrossel: a fila some e o chat volta para todos.
  if (estado.carrossel) {
    $('carrossel').hidden = true;
    estado.carrossel = null;
    destrancarChat('Digite uma mensagem…');
  }
  // Fim do Presente Grego: o painel do leilao sai e o chat volta para todos.
  if (estado.presente) {
    $('presente').hidden = true;
    $('segredo').hidden = true;
    estado.presente = null;
    destrancarChat('Digite uma mensagem…');
  }

  // O Presente Grego nao tem "resposta certa": tem uma aposta que saiu ou nao.
  $('resultado-rotulo').textContent = dados.titulo || 'Resposta certa';
  $('resultado-certa').textContent = dados.resposta;

  const selo = $('selo-dificuldade');
  selo.style.setProperty('--cor-dif', dados.dificuldade.cor);
  selo.textContent = `${dados.dificuldade.nivel} · ${dados.dificuldade.valor}`;
  selo.title = 'Dificuldade da pergunta: sobe quando pouca gente acerta ou quando demoram muito. '
             + 'Nao altera a pontuacao.';

  // O que ainda cabe contar da rodada: as dicas que foram gastas, uma amostra
  // do repertório aberto ou as outras grafias que valiam.
  const rodape = [];
  if (dados.dicasDadas && dados.dicasDadas.length) {
    rodape.push('As dicas foram: ' + dados.dicasDadas.join(' · '));
  }
  if (dados.listaParcial && dados.listaCompleta && dados.listaCompleta.length) {
    rodape.push('Algumas que valiam: ' + dados.listaCompleta.join(', '));
  } else if (dados.aceita && dados.aceita.length) {
    rodape.push('Tambem valia: ' + dados.aceita.join(', '));
  }
  $('resultado-aceita').textContent = rodape.join(' — ');

  const lista = $('resultado-lista');
  lista.innerHTML = '';

  const PAPEIS = {
    apostou: '🔨 apostou', duvidou: '🤨 duvidou', respondeu: '🎁 respondeu',
    passou: '🚪 passou', dicou: '💡 deu as dicas', adivinhou: '🤔 adivinhou'
  };

  for (const detalhe of dados.detalhes) {
    const item = criar('li', 'resultado__item ' + (detalhe.acertou ? 'acertou' : 'errou'));
    // No Presente Grego quase ninguem responde: o "nao acertou" pelo relogio
    // nao diz nada, e quem conta a historia e o papel na rodada.
    // Qual e a musica: quem errou mostra em que clicou.
    const naoAcertou = dados.opcoes
      ? (detalhe.escolha ? `marcou ${detalhe.escolha}` : 'nao escolheu')
      : 'nao acertou';
    const tempo = dados.presente
      ? (PAPEIS[detalhe.papel] || '—')
      : (detalhe.ms === null ? naoAcertou : `${(detalhe.ms / 1000).toFixed(1)}s`);

    const pedia = detalhe.necessarias || 1;
    const conseguiu = detalhe.itens || [];
    // "3/7" só faz sentido para quem respondeu; no leilão, os outros três nem
    // podiam escrever.
    const mostraContagem = dados.presente ? detalhe.papel === 'respondeu' : pedia > 1;

    item.innerHTML = `
      <span class="jogador__avatar">${detalhe.avatar}</span>
      <span class="resultado__nome">${escapar(detalhe.nickname)}</span>
      ${detalhe.posicao === 1 && !dados.presente ? '<span class="selo-primeiro">1º a acertar</span>' : ''}
      ${mostraContagem ? `<span class="resultado__tempo">${conseguiu.length}/${pedia}</span>` : ''}
      <span class="resultado__tempo">${tempo}</span>
      <span class="resultado__ganho ${detalhe.ganhou > 0 ? 'positivo' : ''}">
        ${detalhe.ganhou > 0 ? '+' + detalhe.ganhou : '0'}
      </span>
      ${pedia > 1 && conseguiu.length
        ? `<p class="resultado__itens">${escapar(conseguiu.join(', '))}</p>`
        : ''}`;
    lista.appendChild(item);
  }

  $('resultado').hidden = false;
  $('proxima').hidden = Boolean(dados.acabou);
  if (!dados.acabou) contarSegundos($('resultado-num'), dados.duracaoMs);
  $('status-respostas').textContent = dados.acabou ? 'Alguem bateu a meta!' : '';
  inputChat.placeholder = 'Digite uma mensagem…';

  renderizarPlacar(dados.placar);
});

/* ---------------------------- Placar lateral ---------------------------- */

function renderizarPlacar(placar) {
  // Guardado porque o Carrossel precisa de nome e avatar para montar a fila.
  estado.placar = placar;
  const lista = $('placar-lista');
  lista.innerHTML = '';

  placar.forEach((jogador, posicao) => {
    const item = criar('li', 'placar__item');
    item.dataset.id = jogador.id;
    if (jogador.id === estado.eu?.id) item.classList.add('eu');
    if (posicao === 0 && jogador.pontos > 0) item.classList.add('lider-placar');

    item.innerHTML = `
      <span class="placar__pos">${posicao + 1}º</span>
      <span class="placar__avatar">${jogador.avatar}</span>
      <span class="placar__nome">${escapar(jogador.nickname)}</span>
      ${jogador.equipeIcone
        ? `<span class="placar__equipe" title="${escapar(jogador.equipeNome || '')}">${jogador.equipeIcone}</span>`
        : ''}
      <span class="placar__pontos">${jogador.pontos}</span>`;
    lista.appendChild(item);
  });
}

/* =====================================================================
   5. FIM DE JOGO
   ===================================================================== */

socket.on('jogo:fim', (dados) => {
  pararAnimacao();
  estado.emRodada = false;
  renderizarFim(dados.placar, dados.metaPontos, dados.rodadas);
  mostrarTela('tela-fim');
});

function renderizarFim(placar, meta, rodadas) {
  const campeao = placar[0];
  // Partida dos modos musicais pode acabar pelo numero de musicas, sem meta.
  const config = estado.sala?.config;
  const porMusicas = Boolean(config && config.fimPor === 'musicas' && modoMusical(config.modo));
  const regra = porMusicas ? `${config.totalMusicas} musicas` : `meta de ${meta} pts`;
  $('fim-titulo').textContent = campeao ? `${campeao.nickname} venceu!` : 'Fim de jogo!';
  $('fim-sub').textContent = campeao
    ? `${campeao.pontos} pontos · ${regra} · ${plural(rodadas ?? 0, 'rodada', 'rodadas')}`
    : '';

  // Pódio: 2º, 1º, 3º (nessa ordem visual)
  const podio = $('podio');
  podio.innerHTML = '';
  const medalhas = ['🥇', '🥈', '🥉'];
  const ordemVisual = [1, 0, 2];

  for (const posicao of ordemVisual) {
    const jogador = placar[posicao];
    if (!jogador) continue;
    const lugar = criar('div', `podio__lugar podio__lugar--${posicao + 1}`);
    lugar.innerHTML = `
      <span class="podio__medalha">${medalhas[posicao]}</span>
      <span class="podio__avatar">${jogador.avatar}</span>
      <span class="podio__nome">${escapar(jogador.nickname)}</span>
      <span class="podio__pontos">${jogador.pontos}</span>`;
    podio.appendChild(lugar);
  }

  // Lista completa (a partir do 4º, se houver)
  const lista = $('fim-lista');
  lista.innerHTML = '';
  placar.slice(3).forEach((jogador, i) => {
    const item = criar('li', 'placar__item');
    if (jogador.id === estado.eu?.id) item.classList.add('eu');
    item.innerHTML = `
      <span class="placar__pos">${i + 4}º</span>
      <span class="placar__avatar">${jogador.avatar}</span>
      <span class="placar__nome">${escapar(jogador.nickname)}</span>
      <span class="placar__pontos">${jogador.pontos}</span>`;
    lista.appendChild(item);
  });

  const souLider = placar.some((j) => j.id === estado.eu?.id && j.lider);
  $('btn-novo-jogo').hidden = !souLider;
  $('fim-espera').hidden = souLider;
}

$('btn-novo-jogo').addEventListener('click', () => {
  socket.emit('sala:novoJogo', {}, (resposta) => {
    if (resposta?.erro) brindar(resposta.erro);
  });
});

/* =====================================================================
   Pausa
   ===================================================================== */

/*
 * So o lider pausa e continua. Pausado, a tela "Jogo pausado" cobre a
 * pergunta, os relogios congelam onde estavam, a musica para e o campo de
 * resposta tranca. O servidor e quem manda: ele recusa palpite, voto e lance
 * enquanto a pausa durar, e avisa todo mundo com 'sala:pausa'.
 */

const souLider = () => Boolean(estado.eu?.lider);

function atualizarBotoesDePausa() {
  const mostra = souLider() && !estado.pausado;
  $('btn-pausar').hidden = !mostra;
  $('btn-pausar-rev').hidden = !mostra;
  $('btn-pausar-sorteio').hidden = !mostra;
  $('btn-continuar').hidden = !souLider();
  $('pausa-espera').hidden = souLider();
}

function aplicarPausa(pausado, por) {
  if (pausado && !estado.pausado) {
    pausarRelogios();
    estado.pausado = true;
    estado.chatDaPausa = { disabled: inputChat.disabled, placeholder: inputChat.placeholder };
    inputChat.disabled = true;
    inputChat.placeholder = 'Jogo pausado…';
    const player = $('tocador-audio');
    estado.musicaDaPausa = Boolean(player.src) && !player.paused;
    if (estado.musicaDaPausa) pararAudio();
    // O relogio da musica para junto: na volta ela segue de onde estava.
    if (estado.musica) estado.musica.pausouEm = Date.now();
    $('pausa').hidden = false;
  } else if (!pausado && estado.pausado) {
    estado.pausado = false;
    $('pausa').hidden = true;
    const chat = estado.chatDaPausa || { disabled: false, placeholder: 'Escreva sua resposta…' };
    inputChat.disabled = chat.disabled;
    inputChat.placeholder = chat.placeholder;
    if (!chat.disabled && !('ontouchstart' in window)) inputChat.focus();
    retomarRelogios();
    if (estado.musica && estado.musica.pausouEm) {
      estado.musica.paradoMs += Date.now() - estado.musica.pausouEm;
      estado.musica.pausouEm = null;
    }
    if (estado.musicaDaPausa) {
      if (estado.musica) tocarNoPonto();
      else $('tocador-audio').play().then(() => marcarTocando(true)).catch(() => {});
    }
  }
  if (pausado) $('pausa-quem').textContent = por ? `${por} pausou o jogo.` : '';
  atualizarBotoesDePausa();
}

function pedirPausa() {
  socket.emit('sala:pausar', {}, (resposta) => {
    if (resposta?.erro) brindar(resposta.erro);
  });
}
$('btn-pausar').addEventListener('click', pedirPausa);
$('btn-pausar-rev').addEventListener('click', pedirPausa);
$('btn-pausar-sorteio').addEventListener('click', pedirPausa);
$('btn-continuar').addEventListener('click', () => {
  socket.emit('sala:continuar', {}, (resposta) => {
    if (resposta?.erro) brindar(resposta.erro);
  });
});

socket.on('sala:pausa', ({ pausado, por } = {}) => aplicarPausa(Boolean(pausado), por));

/* =====================================================================
   Eventos gerais da sala
   ===================================================================== */

/**
 * Poe a pessoa na tela do momento da sala.
 *
 * Entrando no saguao da sala e simples; entrando com a partida no ar, a tela
 * do jogo abre com um aviso no lugar da pergunta — o proximo
 * `rodada:categoria` preenche o resto sozinho.
 */
function abrirTelaDaSala(sala) {
  if (sala.estado === 'lobby') {
    renderizarSala();
    return mostrarTela('tela-sala');
  }
  if (sala.estado === 'fim') {
    renderizarFim(sala.jogadores, sala.config.metaPontos, sala.rodada);
    return mostrarTela('tela-fim');
  }

  revelacao.hidden = true;
  esconderSorteio();
  jogo.hidden = false;
  limparTabuleiro();
  $('jogo-codigo').textContent = sala.codigo;
  $('jogo-rodada').textContent = sala.rodada;
  escreverMeta(sala.rodada);
  escreverModo();
  $('pergunta-categoria-icone').textContent = '⏳';
  $('pergunta-categoria-nome').textContent = 'Entrando';
  $('pergunta-texto').textContent = 'Voce entra na proxima rodada.';
  $('pergunta-texto').classList.add('pergunta__texto--segredo');
  $('presente').hidden = true;
  renderizarPlacar(sala.jogadores);
  trancarChat('Esperando a proxima rodada…');
  mostrarTela('tela-jogo');
}

socket.on('sala:estado', (sala) => {
  const anterior = estado.sala?.estado;
  estado.sala = sala;

  // Mantém o "sou eu" em dia (o líder pode ter mudado).
  const eu = sala.jogadores.find((j) => j.id === estado.eu?.id);
  if (eu) estado.eu = { ...estado.eu, ...eu };

  // Quem entra (ou volta) com o jogo pausado ja abre a tela de pausa; e a
  // partida que acaba ou volta ao saguao leva a pausa junto.
  const emJogo = sala.estado !== 'lobby' && sala.estado !== 'fim';
  aplicarPausa(Boolean(emJogo && sala.pausa), sala.pausa?.por);

  if (sala.estado === 'lobby') {
    renderizarSala();
    if (anterior !== 'lobby') {
      pararAnimacao();
      mostrarTela('tela-sala');
    }
  } else if (sala.estado === 'fim') {
    renderizarFim(sala.jogadores, sala.config.metaPontos, sala.rodada);
    mostrarTela('tela-fim');
  } else {
    renderizarPlacar(sala.jogadores);
  }
});

socket.on('sala:entrou', ({ nickname, avatar, voltou }) =>
  brindar(`${avatar} ${nickname} ${voltou ? 'voltou' : 'entrou'}`));
socket.on('sala:saiu', ({ nickname, expulso }) =>
  brindar(expulso ? `${nickname} foi expulso da sala` : `${nickname} saiu da sala`));

socket.on('disconnect', () => {
  pararAnimacao();
  brindar('Conexao perdida. Recarregue a pagina.');
});

socket.on('connect', () => {
  // Uma reconexao cria um socket NOVO, entao para o servidor somos outra
  // pessoa. O caminho de volta e entrar de novo com o mesmo nickname: e por
  // ele que o servidor devolve os pontos, o icone e a equipe.
  const estavaJogando = estado.sala && !$('tela-lobby').classList.contains('ativa');
  if (!estavaJogando) return;

  const codigo = salaLembrada.ler() || estado.sala.codigo;
  const nickname = estado.eu?.nickname || localStorage.getItem('pensarapido:nickname') || '';

  estado.sala = null;
  estado.eu = null;

  if (!codigo || nickname.length < 2) return caiuFora('A conexao caiu. Entre de novo.');

  brindar('Reconectando…');
  socket.emit('sala:entrar', { nickname, codigo, cliente: carteirinha() }, (resposta) => {
    if (resposta?.erro) return caiuFora(`A conexao caiu e nao deu para voltar: ${resposta.erro}`);

    estado.eu = resposta.eu;
    estado.sala = resposta.sala;
    salaLembrada.guardar(resposta.codigo);
    abrirTelaDaSala(resposta.sala);
    brindar(resposta.voltou ? 'Voce voltou, com os pontos de antes' : 'Voce voltou para a sala');
  });
});

/** Nao deu para voltar: a aba esquece a sala e volta ao saguao. */
function caiuFora(aviso) {
  salaLembrada.esquecer();
  pararAnimacao();
  mostrarTela('tela-lobby');
  avisar('aviso-lobby', aviso);
}

/* --------------------------------- Início --------------------------------- */

carregarConfig().catch(() => {
  avisar('aviso-lobby', 'Nao consegui carregar as configuracoes. Recarregue a pagina.');
});
