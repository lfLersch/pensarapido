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
    modo: 'tempo',
    metaPontos: 120,
    segundosPorPergunta: 30
  },
  acertou: false,
  necessarias: 1,   // Escalada: quantas respostas a rodada pede
  meusItens: [],    // Escalada: o que já respondi nesta rodada
  emRodada: false,
  animacao: null
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
  if (codigo.length !== 4) return avisar('aviso-lobby', 'O código da sala tem 4 caracteres.');

  socket.emit('sala:entrar', { nickname, codigo }, (resposta) => {
    if (resposta.erro) return avisar('aviso-lobby', resposta.erro);
    avisar('aviso-lobby', '');
    estado.eu = resposta.eu;
    estado.sala = resposta.sala;
    inputCodigo.value = '';
    renderizarSala();
    mostrarTela('tela-sala');
  });
}

$('btn-entrar').addEventListener('click', entrarNaSala);
inputCodigo.addEventListener('keydown', (e) => { if (e.key === 'Enter') entrarNaSala(); });
inputNickname.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !$('painel-entrar').hidden) entrarNaSala();
});

/* =====================================================================
   2. CONFIGURAÇÃO DA SALA
   ===================================================================== */

$('btn-voltar-lobby').addEventListener('click', () => mostrarTela('tela-lobby'));

async function carregarConfig() {
  const resposta = await fetch('/api/config');
  estado.config = await resposta.json();
  montarCategorias();
  montarModos();
  montarMetas();
  montarTempos();
  atualizarResumo();
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
      const marcada = estado.escolhas.categorias.has(categoria.id);
      if (marcada) estado.escolhas.categorias.delete(categoria.id);
      else estado.escolhas.categorias.add(categoria.id);
      item.classList.toggle('marcada', !marcada);
      item.setAttribute('aria-pressed', String(!marcada));
      atualizarResumo();
    });

    grade.appendChild(item);
  }

  // Começa com tudo marcado.
  estado.config.categorias.forEach((c) => estado.escolhas.categorias.add(c.id));
  sincronizarCategorias();
}

function sincronizarCategorias() {
  document.querySelectorAll('.categoria').forEach((el) => {
    const marcada = estado.escolhas.categorias.has(el.dataset.id);
    el.classList.toggle('marcada', marcada);
    el.setAttribute('aria-pressed', String(marcada));
  });
  atualizarResumo();
}

$('btn-todas-categorias').addEventListener('click', () => {
  estado.config.categorias.forEach((c) => estado.escolhas.categorias.add(c.id));
  sincronizarCategorias();
});

$('btn-nenhuma-categoria').addEventListener('click', () => {
  estado.escolhas.categorias.clear();
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
        atualizarResumo();
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
  const total = estado.escolhas.categorias.size;
  const modo = estado.config.modos.find((m) => m.id === estado.escolhas.modo);
  $('resumo-config').innerHTML = `
    <span>${plural(total, 'categoria', 'categorias')}</span>
    <span>${modo ? modo.icone + ' ' + modo.nome : '—'}</span>
    <span>Meta <b>${estado.escolhas.metaPontos} pts</b></span>
    <span><b>${estado.escolhas.segundosPorPergunta}s</b> por pergunta</span>`;

  $('btn-criar').disabled = total === 0;
}

$('btn-criar').addEventListener('click', () => {
  const nickname = inputNickname.value.trim();
  if (nickname.length < 2) {
    mostrarTela('tela-lobby');
    return avisar('aviso-lobby', 'Digite um nickname com pelo menos 2 caracteres.');
  }
  if (estado.escolhas.categorias.size === 0) {
    return avisar('aviso-config', 'Escolha pelo menos uma categoria.');
  }

  const config = {
    categorias: [...estado.escolhas.categorias],
    modo: estado.escolhas.modo,
    metaPontos: estado.escolhas.metaPontos,
    segundosPorPergunta: estado.escolhas.segundosPorPergunta
  };

  socket.emit('sala:criar', { nickname, config }, (resposta) => {
    if (resposta.erro) return avisar('aviso-config', resposta.erro);
    avisar('aviso-config', '');
    estado.eu = resposta.eu;
    estado.sala = resposta.sala;
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
  $('resumo-sala').innerHTML = `
    <span>${modo ? modo.icone + ' ' + modo.nome : '—'}</span>
    <span>Meta <b>${sala.config.metaPontos} pts</b></span>
    <span><b>${sala.config.segundosPorPergunta}s</b> por pergunta</span>
    <span>${plural(sala.config.categorias.length, 'categoria', 'categorias')}</span>`;
  $('resumo-sala').title = sala.config.categorias.map(nomeCategoria).join(', ');

  const lista = $('lista-jogadores');
  lista.innerHTML = '';
  for (const jogador of sala.jogadores) {
    const item = criar('li', 'jogador');
    const souEu = jogador.id === estado.eu?.id;
    item.innerHTML = `
      <span class="jogador__avatar">${jogador.avatar}</span>
      <span class="jogador__nome">${escapar(jogador.nickname)}${souEu ? '<span class="jogador__voce">(você)</span>' : ''}</span>
      ${jogador.lider ? '<span class="coroa">👑 Líder</span>' : ''}`;
    lista.appendChild(item);
  }

  $('contador-jogadores').textContent = `${sala.jogadores.length}/${estado.config.maxJogadores}`;

  const souLider = sala.jogadores.some((j) => j.id === estado.eu?.id && j.lider);
  $('btn-iniciar').hidden = !souLider;
  $('texto-espera').hidden = souLider;
}

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
  socket.emit('sala:sair', {}, () => {
    estado.eu = null;
    estado.sala = null;
    pararAnimacao();
    mostrarTela('tela-lobby');
  });
}

$('btn-sair-sala').addEventListener('click', sairDaSala);
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

function pararAnimacao() {
  if (estado.animacao) {
    cancelAnimationFrame(estado.animacao);
    estado.animacao = null;
  }
}

/**
 * Anima uma barra que esvazia e, opcionalmente, um contador em segundos.
 */
function contarTempo(barra, duracaoMs, mostrarSegundos) {
  pararAnimacao();
  const inicio = performance.now();

  if (mostrarSegundos) {
    $('cronometro-num').textContent = Math.ceil(duracaoMs / 1000);
    cronometro.classList.remove('urgente');
  }

  const passo = (agora) => {
    const restante = Math.max(0, duracaoMs - (agora - inicio));
    barra.style.transform = `scaleX(${restante / duracaoMs})`;

    if (mostrarSegundos) {
      const segundos = Math.ceil(restante / 1000);
      if ($('cronometro-num').textContent !== String(segundos)) {
        $('cronometro-num').textContent = segundos;
      }
      cronometro.classList.toggle('urgente', segundos <= 5 && segundos > 0);
    }

    if (restante > 0) estado.animacao = requestAnimationFrame(passo);
    else estado.animacao = null;
  };

  estado.animacao = requestAnimationFrame(passo);
}

/* --------------------- 4a. Revelação da categoria --------------------- */

socket.on('rodada:categoria', (dados) => {
  estado.acertou = false;
  estado.emRodada = true;

  mostrarTela('tela-jogo');
  jogo.hidden = true;
  revelacao.hidden = false;

  $('revelacao-rodada').textContent = `Rodada ${dados.rodada}`;
  $('revelacao-icone').textContent = dados.categoria.icone;
  $('revelacao-nome').textContent = dados.categoria.nome;
  $('revelacao-nome').style.color = '';

  contarTempo($('revelacao-barra'), dados.duracaoMs, false);

  if (dados.placar) renderizarPlacar(dados.placar);
});

/* --------------------------- 4b. Pergunta --------------------------- */

socket.on('rodada:pergunta', (dados) => {
  revelacao.hidden = true;
  jogo.hidden = false;
  mostrarTela('tela-jogo');

  estado.acertou = false;

  $('jogo-codigo').textContent = estado.sala?.codigo || '----';
  $('jogo-rodada').textContent = dados.rodada;
  $('jogo-meta').textContent = `${estado.sala?.config.metaPontos ?? '—'} pts`;

  // A categoria fica pequena, logo acima da pergunta.
  $('pergunta-categoria').style.setProperty('--cor-categoria', dados.categoria.cor);
  $('pergunta-categoria-icone').textContent = dados.categoria.icone;
  $('pergunta-categoria-nome').textContent = dados.categoria.nome;

  $('pergunta-texto').textContent = dados.pergunta;
  $('mascara').textContent = dados.mascara || '';

  // Perguntas de música mostram o trecho da letra em destaque.
  const letra = $('letra');
  letra.textContent = dados.letra || '';
  letra.hidden = !dados.letra;

  // Modo Escalada: painel com quantas respostas faltam.
  estado.necessarias = dados.necessarias || 1;
  estado.meusItens = [];
  const painel = $('escalada');
  painel.hidden = estado.necessarias < 2;
  if (!painel.hidden) {
    $('escalada-itens').innerHTML = '';
    atualizarEscalada();
  }

  const figura = $('pergunta-figura');
  if (dados.imagem) {
    $('pergunta-imagem').src = dados.imagem;
    $('pergunta-imagem').alt = dados.pergunta;
    figura.hidden = false;
  } else {
    figura.hidden = true;
    $('pergunta-imagem').removeAttribute('src');
  }

  $('resultado').hidden = true;
  $('status-respostas').textContent = '';

  inputChat.disabled = false;
  inputChat.placeholder = 'Escreva sua resposta…';
  if (!('ontouchstart' in window)) inputChat.focus();

  mensagemSistema(`Rodada ${dados.rodada} · ${dados.categoria.nome}`);

  contarTempo(barraTempo, dados.duracaoMs, true);
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

/** Aviso que só quem escreveu enxerga — não vai para o chat de ninguém. */
function avisoParticular(texto) {
  const el = criar('div', 'msg msg--privado');
  el.innerHTML = `${escapar(texto)}<span class="msg__so-voce">só você está vendo isto</span>`;
  adicionarMensagem(el);

  formChat.classList.remove('quase');
  void formChat.offsetWidth; // reinicia a animação
  formChat.classList.add('quase');
  setTimeout(() => formChat.classList.remove('quase'), 900);
}

socket.on('chat:mensagem', (msg) => {
  if (msg.tipo === 'sistema') return mensagemSistema(msg.texto, msg.destaque);

  const souEu = msg.jogadorId === estado.eu?.id;

  if (msg.tipo === 'acerto') {
    const el = criar('div', 'msg msg--acerto' + (souEu ? ' msg--eu' : ''));
    const quando = msg.ms != null ? ` em ${(msg.ms / 1000).toFixed(1)}s` : '';
    el.innerHTML = `${msg.avatar} <b>${escapar(msg.nickname)}</b> acertou${quando} · +${msg.pontos} pts`;
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

  const texto = inputChat.value.trim();
  if (!texto) return;
  inputChat.value = '';

  socket.emit('sala:palpite', { texto }, (resposta) => {
    if (!resposta) return;
    if (resposta.erro) return avisoParticular(resposta.erro);

    if (resposta.veredito === 'quase') {
      avisoParticular('Quase! Confira a escrita — sua mensagem não foi para o chat.');

    } else if (resposta.veredito === 'bloqueado') {
      avisoParticular('Segurei essa mensagem para não entregar a resposta.');

    } else if (resposta.veredito === 'repetido') {
      avisoParticular(`Você já tinha dito "${resposta.item}". Tente outra.`);

    } else if (resposta.veredito === 'item') {
      // Acertou um item da lista, mas ainda falta responder mais.
      registrarItem(resposta.item);
      avisoParticular(`Boa! "${resposta.item}" conta. Faltam ${resposta.necessarias - resposta.quantos}.`);

    } else if (resposta.veredito === 'certo') {
      estado.acertou = true;
      if (resposta.item) registrarItem(resposta.item);
      inputChat.placeholder = 'Acertou! Agora é só papo…';
    }
  });
});

socket.on('rodada:acertou', (dados) => {
  $('status-respostas').textContent =
    `${dados.totalAcertos} de ${dados.totalJogadores} já acertaram`;

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
  barraTempo.style.transform = 'scaleX(0)';
  cronometro.classList.remove('urgente');
  $('mascara').textContent = '';
  $('escalada').hidden = true;

  $('resultado-certa').textContent = dados.resposta;

  const selo = $('selo-dificuldade');
  selo.style.setProperty('--cor-dif', dados.dificuldade.cor);
  selo.textContent = `${dados.dificuldade.nivel} · ${dados.dificuldade.valor}`;
  selo.title = 'Dificuldade da pergunta: sobe quando pouca gente acerta ou quando demoram muito. '
             + 'Não altera a pontuação.';

  // Repertório aberto ("países da África") mostra uma amostra do que valia.
  if (dados.listaParcial && dados.listaCompleta && dados.listaCompleta.length) {
    $('resultado-aceita').textContent = 'Algumas que valiam: ' + dados.listaCompleta.join(', ');
  } else if (dados.aceita && dados.aceita.length) {
    $('resultado-aceita').textContent = 'Também valia: ' + dados.aceita.join(', ');
  } else {
    $('resultado-aceita').textContent = '';
  }

  const lista = $('resultado-lista');
  lista.innerHTML = '';

  for (const detalhe of dados.detalhes) {
    const item = criar('li', 'resultado__item ' + (detalhe.acertou ? 'acertou' : 'errou'));
    const tempo = detalhe.ms === null ? 'não acertou' : `${(detalhe.ms / 1000).toFixed(1)}s`;

    const pedia = detalhe.necessarias || 1;
    const conseguiu = detalhe.itens || [];

    item.innerHTML = `
      <span class="jogador__avatar">${detalhe.avatar}</span>
      <span class="resultado__nome">${escapar(detalhe.nickname)}</span>
      ${detalhe.posicao === 1 ? '<span class="selo-primeiro">1º a acertar</span>' : ''}
      ${pedia > 1 ? `<span class="resultado__tempo">${conseguiu.length}/${pedia}</span>` : ''}
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
  $('status-respostas').textContent = dados.acabou ? 'Alguém bateu a meta!' : '';
  inputChat.placeholder = 'Digite uma mensagem…';

  renderizarPlacar(dados.placar);
});

/* ---------------------------- Placar lateral ---------------------------- */

function renderizarPlacar(placar) {
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
  $('fim-titulo').textContent = campeao ? `${campeao.nickname} venceu!` : 'Fim de jogo!';
  $('fim-sub').textContent = campeao
    ? `${campeao.pontos} pontos · meta de ${meta} pts · ${plural(rodadas ?? 0, 'rodada', 'rodadas')}`
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
   Eventos gerais da sala
   ===================================================================== */

socket.on('sala:estado', (sala) => {
  const anterior = estado.sala?.estado;
  estado.sala = sala;

  // Mantém o "sou eu" em dia (o líder pode ter mudado).
  const eu = sala.jogadores.find((j) => j.id === estado.eu?.id);
  if (eu) estado.eu = { ...estado.eu, ...eu };

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

socket.on('sala:entrou', ({ nickname, avatar }) => brindar(`${avatar} ${nickname} entrou`));
socket.on('sala:saiu', ({ nickname }) => brindar(`${nickname} saiu da sala`));

socket.on('disconnect', () => {
  pararAnimacao();
  brindar('Conexão perdida. Recarregue a página.');
});

socket.on('connect', () => {
  // Uma reconexão cria um socket novo: a sala anterior já não existe para nós.
  if (estado.sala && !$('tela-lobby').classList.contains('ativa')) {
    estado.sala = null;
    estado.eu = null;
    mostrarTela('tela-lobby');
    avisar('aviso-lobby', 'A conexão caiu e você saiu da sala. Entre de novo.');
  }
});

/* --------------------------------- Início --------------------------------- */

carregarConfig().catch(() => {
  avisar('aviso-lobby', 'Não consegui carregar as configurações. Recarregue a página.');
});
