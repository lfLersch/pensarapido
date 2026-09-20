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
  presente: null,   // Presente Grego: { equipes, aposta, ... } da rodada
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
      <span class="sala-aberta__modo">${sala.icone} ${escapar(sala.modo)} · ${sala.codigo}${quando}</span>
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
  const total = categoriasEscolhidas().length;
  const modo = estado.config.modos.find((m) => m.id === estado.escolhas.modo);
  $('resumo-config').innerHTML = `
    <span>${plural(total, 'categoria', 'categorias')}</span>
    <span>${modo ? modo.icone + ' ' + modo.nome : '—'}</span>
    <span>Meta <b>${estado.escolhas.metaPontos} pts</b></span>
    <span><b>${estado.escolhas.segundosPorPergunta}s</b> por pergunta</span>
    ${modo && modo.equipes ? '<span>👥 <b>4+</b> jogadores, em equipes</span>' : ''}`;

  $('btn-criar').disabled = total === 0;
}

$('btn-criar').addEventListener('click', () => {
  const nickname = inputNickname.value.trim();
  if (nickname.length < 2) {
    mostrarTela('tela-lobby');
    return avisar('aviso-lobby', 'Digite um nickname com pelo menos 2 caracteres.');
  }
  if (categoriasEscolhidas().length === 0) {
    return avisar('aviso-config', 'Escolha pelo menos uma categoria.');
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
    segundosPorPergunta: estado.escolhas.segundosPorPergunta
  };

  socket.emit('sala:criar', { nickname, config }, (resposta) => {
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
  $('resumo-sala').innerHTML = `
    <span>${modo ? modo.icone + ' ' + modo.nome : '—'}</span>
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
  const dica = $('dica-equipes');
  dica.hidden = !falta;
  dica.textContent = falta || '';
  $('btn-iniciar').disabled = Boolean(falta);
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
  else { $('presente').hidden = true; $('segredo').hidden = true; }

  if (!dados.presente) mensagemSistema(`Rodada ${dados.rodada} · ${dados.categoria.nome}`);

  // 1 eh bom 2 ok 3 eh demais: aqui o campo nao e chat, e um palpite fechado — ele so
  // aparece para a mesa quando o tempo da dica acaba.
  if (dados.veni) {
    inputChat.placeholder = 'Trave sua resposta — ninguem ve ate a janela fechar…';
    $('status-respostas').textContent = 'Ninguem palpitou ainda.';
  }

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
const leilaoGeral = () => estado.sala?.config.modo === 'leilao-geral';

/** Dando dicas: leilao ao contrario, em duplas — o lance desce. */
const dandoDicas = () => estado.sala?.config.modo === 'dando-dicas';

socket.on('leilao:comeco', (dados) => {
  revelacao.hidden = true;
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
  $('jogo-meta').textContent = `${estado.sala?.config.metaPontos ?? '—'} pts`;

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
    $('pergunta-texto').textContent = dados.pergunta;
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
  jogo.hidden = false;
  limparTabuleiro();
  $('jogo-codigo').textContent = sala.codigo;
  $('jogo-rodada').textContent = sala.rodada;
  $('jogo-meta').textContent = `${sala.config.metaPontos} pts`;
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
  socket.emit('sala:entrar', { nickname, codigo }, (resposta) => {
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
