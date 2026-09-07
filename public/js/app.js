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
    segundosPorPergunta: 20
  },
  acertou: false,
  necessarias: 1,   // Escalada: quantas respostas a rodada pede
  meusItens: [],    // Escalada: o que já respondi nesta rodada
  emRodada: false,
  placar: [],       // ultimo placar recebido
  carrossel: null,  // Carrossel: { voltas, msPorVez, ordem } da rodada
  vivos: null,      // Carrossel: quem ainda nao saiu
  presente: null,   // Presente Grego: { duplas, aposta, ... } da rodada
  votei: false,     // votei para pular a rodada atual
  contagem: null,
  urgencia: null,
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
  if (codigo.length !== 4) return avisar('aviso-lobby', 'O codigo da sala tem 4 caracteres.');

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
      if (marcada) {
        estado.escolhas.categorias.delete(categoria.id);
        for (const s of [...estado.escolhas.subs]) {
          if (s.startsWith(categoria.id + ':')) estado.escolhas.subs.delete(s);
        }
      } else {
        estado.escolhas.categorias.add(categoria.id);
      }
      item.classList.toggle('marcada', !marcada);
      item.setAttribute('aria-pressed', String(!marcada));
      atualizarResumo();
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
        chip.title = `So as perguntas de ${sub.nome} dentro de ${categoria.nome}`;

        chip.addEventListener('click', () => {
          const marcada = estado.escolhas.subs.has(chip.dataset.id);
          if (marcada) estado.escolhas.subs.delete(chip.dataset.id);
          else {
            estado.escolhas.subs.add(chip.dataset.id);
            estado.escolhas.categorias.add(categoria.id); // parte marcada exige a categoria
          }
          sincronizarCategorias();
        });

        caixa.appendChild(chip);
      }
      grade.appendChild(caixa);
    }
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

  // Os chips ficam sempre à vista: esconder quando a categoria estava
  // desmarcada tornava impossível escolher só a parte (clicar em "Nenhuma"
  // fazia o chip sumir). Clicar num chip marca a categoria dona junto.
  document.querySelectorAll('.subcategorias').forEach((caixa) => {
    caixa.classList.toggle('apagada', !estado.escolhas.categorias.has(caixa.dataset.de));
  });

  document.querySelectorAll('.subchip').forEach((chip) => {
    const marcada = estado.escolhas.subs.has(chip.dataset.id);
    chip.classList.toggle('marcada', marcada);
    chip.setAttribute('aria-pressed', String(marcada));
  });

  atualizarResumo();
}

$('btn-todas-categorias').addEventListener('click', () => {
  estado.config.categorias.forEach((c) => estado.escolhas.categorias.add(c.id));
  sincronizarCategorias();
});

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
    <span><b>${estado.escolhas.segundosPorPergunta}s</b> por pergunta</span>
    ${modo && modo.duplas ? '<span>👥 <b>4, 6, 8…</b> jogadores</span>' : ''}`;

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
    subs: [...estado.escolhas.subs],
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

    lista.appendChild(item);
  }

  $('contador-jogadores').textContent = `${sala.jogadores.length}/${estado.config.maxJogadores}`;

  const souLider = sala.jogadores.some((j) => j.id === estado.eu?.id && j.lider);
  $('btn-iniciar').hidden = !souLider;
  $('texto-espera').hidden = souLider;

  // Presente Grego: nao adianta apertar iniciar com a sala impar — o servidor
  // recusa. Melhor dizer isso antes.
  const quantos = sala.jogadores.length;
  const faltaFechar = Boolean(modo && modo.duplas) && (quantos < 4 || quantos % 2 !== 0);
  const dica = $('dica-duplas');
  dica.hidden = !faltaFechar;
  dica.textContent = quantos < 4
    ? `${modo ? modo.nome : 'Este modo'} e em duplas: faltam ${4 - quantos} para fechar duas duplas.`
    : 'Falta uma pessoa para fechar a ultima dupla — o numero tem que ser par.';
  $('btn-iniciar').disabled = faltaFechar;
}

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
 * Esvazia uma barra no tempo pedido.
 *
 * Quem anima é o próprio navegador, por transition — assim a barra não depende
 * de a aba estar pintando quadros.
 */
function animarBarra(barra, duracaoMs) {
  barra.style.transition = 'none';
  barra.style.transform = 'scaleX(1)';
  void barra.offsetWidth; // força o navegador a aplicar o estado inicial
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

  // O "urgente" acompanha o mesmo intervalo do número.
  const fim = Date.now() + duracaoMs;
  pararUrgencia();
  estado.urgencia = setInterval(() => {
    const segundos = Math.ceil(Math.max(0, fim - Date.now()) / 1000);
    cronometro.classList.toggle('urgente', segundos <= 5 && segundos > 0);
    if (segundos <= 0) pararUrgencia();
  }, 200);
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

  mostrarTela('tela-jogo');
  jogo.hidden = true;
  revelacao.hidden = false;

  $('revelacao-rodada').textContent = `Rodada ${dados.rodada}`;
  $('revelacao-icone').textContent = dados.categoria.icone;
  $('revelacao-nome').textContent = dados.categoria.nome;
  $('revelacao-nome').style.color = '';

  contarTempo($('revelacao-barra'), dados.duracaoMs, false);
  contarSegundos($('revelacao-num'), dados.duracaoMs);

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

  montarAudio(dados.audio);

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
  else $('presente').hidden = true;

  if (!dados.presente) mensagemSistema(`Rodada ${dados.rodada} · ${dados.categoria.nome}`);

  pararContagem();
  // No carrossel o relógio é de cada vez, não da rodada: quem conta é
  // 'carrossel:vez'.
  if (dados.duracaoMs) contarTempo(barraTempo, dados.duracaoMs, true);
});

/** Deixa o campo de resposta indisponível com um aviso no lugar. */
function trancarChat(aviso) {
  inputChat.disabled = true;
  inputChat.value = '';
  inputChat.placeholder = aviso;
}

function destrancarChat(aviso) {
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
  mostrarDitos(dados.ditos || []);
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
  $('pergunta-figura').hidden = true;
  $('mascara').textContent = '';
  $('status-respostas').textContent = '';
  montarAudio(null);
}

socket.on('leilao:comeco', (dados) => {
  revelacao.hidden = true;
  jogo.hidden = false;
  mostrarTela('tela-jogo');

  estado.acertou = false;
  estado.carrossel = null;
  estado.presente = { duplas: dados.duplas, aposta: 0, duplaAposta: null, maxAposta: dados.maxAposta };

  $('jogo-codigo').textContent = estado.sala?.codigo || '----';
  $('jogo-rodada').textContent = dados.rodada;
  $('jogo-meta').textContent = `${estado.sala?.config.metaPontos ?? '—'} pts`;

  $('pergunta-categoria').style.setProperty('--cor-categoria', '#f59e0b');
  $('pergunta-categoria-icone').textContent = '🎁';
  $('pergunta-categoria-nome').textContent = 'Leilao';

  limparTabuleiro();

  // Quem vai responder não pode ler o enunciado: para essa pessoa a pergunta
  // chega só no fim do leilão, pelo `rodada:pergunta`.
  const souLeiloeiro = dados.duplas.some((d) => d.leiloeiro && d.leiloeiro.id === socket.id);
  $('pergunta-texto').textContent = souLeiloeiro
    ? 'Lendo a pergunta…'
    : 'Seu parceiro esta leiloando por voce. Voce so ve a pergunta quando o leilao acabar.';
  $('pergunta-texto').classList.toggle('pergunta__texto--segredo', !souLeiloeiro);

  $('presente').hidden = false;
  $('presente-entrega').hidden = true;
  $('presente-forma').hidden = true;
  $('presente-itens').innerHTML = '';
  $('presente-fase').textContent = 'Leilao';
  $('presente-lance').textContent = 'sem lance ainda';
  desenharDuplas(null, null);

  trancarChat('O leilao esta rolando…');
  mensagemSistema(`Rodada ${dados.rodada} · leilao em duplas`);
  pararContagem();
});

// Chega só para quem está leiloando.
socket.on('leilao:pergunta', (dados) => {
  $('pergunta-texto').textContent = dados.pergunta;
  $('pergunta-texto').classList.remove('pergunta__texto--segredo');
});

/** Desenha as duplas com os papéis da rodada e quem está com a palavra. */
function desenharDuplas(duplaDaVez, duplaDoLance) {
  const lista = $('presente-duplas');
  lista.innerHTML = '';
  if (!estado.presente) return;

  for (const dupla of estado.presente.duplas) {
    const item = criar('li', 'presente__dupla');
    item.dataset.id = dupla.id;
    item.style.setProperty('--cor-dupla', dupla.cor);
    if (dupla.id === duplaDaVez) item.classList.add('agora');
    if (dupla.id === duplaDoLance) item.classList.add('topo');

    const meu = [dupla.leiloeiro, dupla.respondedor].some((p) => p && p.id === estado.eu?.id);
    if (meu) item.classList.add('minha');

    const lance = estado.presente.lances?.[dupla.id];
    item.innerHTML = `
      <span class="presente__dupla-nome">${dupla.icone} ${escapar(dupla.nome)}</span>
      <span class="presente__papel" title="leiloa esta rodada">🔨 ${
        escapar(dupla.leiloeiro ? dupla.leiloeiro.nickname : '—')}</span>
      <span class="presente__papel" title="responde esta rodada, sem ver a pergunta">🎁 ${
        escapar(dupla.respondedor ? dupla.respondedor.nickname : '—')}</span>
      ${lance ? `<span class="presente__valor">${lance}</span>` : ''}`;
    lista.appendChild(item);
  }
}

socket.on('leilao:vez', (dados) => {
  if (!estado.presente) return;
  estado.presente.aposta = dados.aposta;
  estado.presente.vez = dados.jogadorId;

  const dupla = estado.presente.duplas.find((d) => d.id === dados.duplaId);
  const minha = dados.jogadorId === socket.id;

  desenharDuplas(dados.duplaId, estado.presente.duplaAposta);

  $('presente-lance').textContent = dados.aposta > 0
    ? `lance na mesa: ${dados.aposta}`
    : 'sem lance ainda';

  const vez = $('presente-vez');
  vez.classList.toggle('minha', minha);
  vez.textContent = minha
    ? 'Sua vez: quantas o seu parceiro consegue dizer?'
    : `Vez de ${dupla && dupla.leiloeiro ? dupla.leiloeiro.nickname : '…'}`;

  const forma = $('presente-forma');
  forma.hidden = !minha;
  if (minha) {
    const campo = $('presente-input');
    campo.min = String(dados.minimo);
    campo.max = String(estado.presente.maxAposta || 60);
    campo.value = String(dados.minimo);
    $('presente-duvidar').disabled = !dados.podeDuvidar;
    $('presente-duvidar').title = dados.podeDuvidar
      ? `Duvido que a outra dupla faca ${dados.aposta}`
      : 'So da para duvidar de um lance que ja esta na mesa';
    if (!('ontouchstart' in window)) campo.focus();
  }

  pararContagem();
  contarTempo(barraTempo, dados.msPorLance, true);
});

socket.on('leilao:lance', (dados) => {
  if (!estado.presente) return;
  estado.presente.aposta = dados.aposta;
  estado.presente.duplaAposta = dados.duplaId;
  estado.presente.lances = { [dados.duplaId]: dados.aposta };

  $('presente-lance').textContent = `lance na mesa: ${dados.aposta}`;
  $('presente-forma').hidden = true;
  desenharDuplas(null, dados.duplaId);
});

socket.on('leilao:fim', (dados) => {
  if (!estado.presente) return;
  estado.presente.aposta = dados.aposta;
  estado.presente.respondedor = dados.respondedor;

  $('presente-forma').hidden = true;
  $('presente-fase').textContent = 'Duvidaram!';
  $('presente-lance').textContent = `aposta cobrada: ${dados.aposta}`;
  desenharDuplas(dados.duplaDuvidou, dados.duplaAposta);

  const vez = $('presente-vez');
  const souEu = dados.respondedor === socket.id;
  vez.classList.toggle('minha', souEu);
  vez.textContent = souEu
    ? `${dados.nicknameDuvidou} duvidou de voce! Prepare-se para dizer ${dados.aposta}.`
    : `${dados.nicknameDuvidou} duvidou · ${dados.nicknameRespondedor} tem que dizer ${dados.aposta}`;

  pararContagem();
  contarTempo(barraTempo, dados.duracaoMs, true);
});

/** Depois do leilão a pergunta é pública e só o desafiado responde. */
function abrirEntregaDoPresente(presente) {
  if (!estado.presente) estado.presente = { duplas: [] };
  estado.presente.aposta = presente.aposta;
  estado.presente.respondedor = presente.respondedor;
  estado.presente.entregues = [];

  const souEu = presente.respondedor === socket.id;
  const quem = (estado.placar || []).find((j) => j.id === presente.respondedor);

  $('presente').hidden = false;
  $('presente-forma').hidden = true;
  $('presente-fase').textContent = 'Entrega';
  $('presente-lance').textContent = `aposta de ${presente.aposta}`;
  desenharDuplas(presente.duplaAposta, presente.duplaAposta);

  const vez = $('presente-vez');
  vez.classList.toggle('minha', souEu);
  vez.textContent = souEu
    ? `Voce prometeu ${presente.aposta}. Escreva no chat!`
    : `${quem ? quem.nickname : 'A pessoa desafiada'} tem que dizer ${presente.aposta}`;

  $('presente-entrega').hidden = false;
  $('presente-itens').innerHTML = '';
  $('presente-rotulo').textContent = souEu ? 'suas respostas' : `respostas de ${quem ? quem.nickname : '…'}`;
  atualizarEntrega(0, presente.aposta);

  if (souEu) destrancarChat(`Diga ${plural(presente.aposta, 'resposta', 'respostas')}…`);
  else trancarChat(`${quem ? quem.nickname : 'Quem foi desafiado'} esta respondendo…`);
}

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
 * Tenta tocar sozinho, mas o navegador recusa som automatico em pagina sem
 * interacao recente. Quando recusa, o botao ganha destaque em vez de a
 * pergunta ficar muda sem ninguem entender por que.
 */
function montarAudio(url) {
  const caixa = $('tocador');
  const player = $('tocador-audio');

  pararAudio();

  if (!url) {
    caixa.hidden = true;
    player.removeAttribute('src');
    return;
  }

  caixa.hidden = false;
  caixa.classList.remove('tocando', 'travado');
  $('tocador-aviso').textContent = '';
  player.src = url;
  player.currentTime = 0;

  player.play()
    .then(() => marcarTocando(true))
    .catch(() => {
      // Autoplay bloqueado: quem toca e a pessoa.
      caixa.classList.add('travado');
      $('tocador-aviso').textContent = 'Toque para ouvir';
    });
}

function marcarTocando(sim) {
  $('tocador').classList.toggle('tocando', sim);
  $('tocador-botao').innerHTML = sim ? '&#10074;&#10074;' : '&#9654;';
}

function pararAudio() {
  const player = $('tocador-audio');
  if (!player) return;
  player.pause();
  marcarTocando(false);
}

$('tocador-botao').addEventListener('click', () => {
  const player = $('tocador-audio');
  $('tocador').classList.remove('travado');
  $('tocador-aviso').textContent = '';

  if (player.paused) {
    player.play().then(() => marcarTocando(true)).catch(() => {
      $('tocador-aviso').textContent = 'Nao consegui tocar este audio';
    });
  } else {
    player.pause();
    marcarTocando(false);
  }
});

$('tocador-audio').addEventListener('ended', () => marcarTocando(false));
$('tocador-audio').addEventListener('error', () => {
  $('tocador').classList.remove('tocando');
  $('tocador-aviso').textContent = 'Audio indisponivel';
});

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
    const cor = msg.texto ? 'msg--item' : 'msg--acerto';
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

  const texto = inputChat.value.trim();
  if (!texto) return;
  inputChat.value = '';

  socket.emit('sala:palpite', { texto }, (resposta) => {
    if (!resposta) return;
    if (resposta.erro) return avisoParticular(resposta.erro);

    if (resposta.veredito === 'quase') {
      // A dica mostra ONDE errou: "c_ra" para quem escreveu "cera".
      avisoParticular('Quase! Faltou acertar as letras marcadas:',
        'msg--privado', resposta.dica);

    } else if (resposta.veredito === 'bloqueado') {
      avisoParticular('Segurei essa mensagem para nao entregar a resposta.');

    } else if (resposta.veredito === 'repetido') {
      avisoParticular(`Voce ja tinha dito "${resposta.item}". Tente outra.`);

    } else if (resposta.veredito === 'eliminado') {
      // Carrossel: errou na sua vez e saiu da rodada.
      avisoParticular(resposta.repetido
        ? `"${resposta.repetido}" ja tinha sido dito. Voce saiu desta rodada.`
        : 'Errou! Voce saiu desta rodada.');

    } else if (resposta.veredito === 'item') {
      // Um item de lista tem cara propria: azul, e no mesmo formato do acerto
      // — verde continua sendo "fechou a resposta inteira".
      if (!estado.carrossel) registrarItem(resposta.item);
      avisoDeItem(resposta);

    } else if (resposta.veredito === 'certo') {
      estado.acertou = true;
      if (resposta.item) registrarItem(resposta.item);
      inputChat.placeholder = 'Acertou! Agora e so papo…';
    }
  });
});

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

  // Repertório aberto ("paises da Africa") mostra uma amostra do que valia.
  if (dados.listaParcial && dados.listaCompleta && dados.listaCompleta.length) {
    $('resultado-aceita').textContent = 'Algumas que valiam: ' + dados.listaCompleta.join(', ');
  } else if (dados.aceita && dados.aceita.length) {
    $('resultado-aceita').textContent = 'Tambem valia: ' + dados.aceita.join(', ');
  } else {
    $('resultado-aceita').textContent = '';
  }

  const lista = $('resultado-lista');
  lista.innerHTML = '';

  const PAPEIS = { apostou: '🔨 apostou', duvidou: '🤨 duvidou', respondeu: '🎁 respondeu' };

  for (const detalhe of dados.detalhes) {
    const item = criar('li', 'resultado__item ' + (detalhe.acertou ? 'acertou' : 'errou'));
    // No Presente Grego quase ninguem responde: o "nao acertou" pelo relogio
    // nao diz nada, e quem conta a historia e o papel na rodada.
    const tempo = dados.presente
      ? (PAPEIS[detalhe.papel] || '—')
      : (detalhe.ms === null ? 'nao acertou' : `${(detalhe.ms / 1000).toFixed(1)}s`);

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
      ${jogador.duplaIcone
        ? `<span class="placar__dupla" title="${escapar(jogador.duplaNome || '')}">${jogador.duplaIcone}</span>`
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
socket.on('sala:saiu', ({ nickname, expulso }) =>
  brindar(expulso ? `${nickname} foi expulso da sala` : `${nickname} saiu da sala`));

socket.on('disconnect', () => {
  pararAnimacao();
  brindar('Conexao perdida. Recarregue a pagina.');
});

socket.on('connect', () => {
  // Uma reconexão cria um socket novo: a sala anterior já não existe para nós.
  if (estado.sala && !$('tela-lobby').classList.contains('ativa')) {
    estado.sala = null;
    estado.eu = null;
    mostrarTela('tela-lobby');
    avisar('aviso-lobby', 'A conexao caiu e voce saiu da sala. Entre de novo.');
  }
});

/* --------------------------------- Início --------------------------------- */

carregarConfig().catch(() => {
  avisar('aviso-lobby', 'Nao consegui carregar as configuracoes. Recarregue a pagina.');
});
