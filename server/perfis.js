'use strict';

/**
 * O perfil de cada jogador: números de todas as partidas e as conquistas.
 *
 * Quem é quem vem da carteirinha do navegador (`cliente`), a mesma que já
 * reconhece a aba voltando depois de uma queda. Sem login, o perfil é daquele
 * navegador: trocar de nickname não perde nada, trocar de navegador começa do
 * zero.
 *
 * Com login do Google, a carteirinha fica LIGADA à conta (`vinculos`), e o
 * perfil passa a ser da conta ("g:" + id do Google): vale em qualquer
 * navegador em que a pessoa entrar. No primeiro login, o que o navegador já
 * tinha é somado à conta. A sala não sabe de nada disso: ela continua
 * mandando a carteirinha, e é aqui que se descobre de quem é o perfil.
 *
 * Com `DATABASE_URL` os perfis moram na tabela `jogadores` e as ligações em
 * `vinculos`; sem ela, em `server/dados/perfis.json`.
 */

const fs = require('fs');
const path = require('path');
const banco = require('./banco');
const { NIVEIS, chanceDeAcerto, ESCALA_NOTA } = require('./dificuldade');

// Os testes apontam para um arquivo temporario, para nao sujar os perfis de verdade.
const ARQUIVO = process.env.PERFIS_ARQUIVO || path.join(__dirname, 'dados', 'perfis.json');
const SALVAR_APOS = 5000;

/** Acerto abaixo disto conta como relâmpago. */
const MS_RELAMPAGO = 2000;
/** Pergunta a partir desta dificuldade é "Muito difícil" (a mesma faixa de dificuldade.js). */
const DIF_MUITO_DIFICIL = 75;

/* ------------------------- Nota por categoria ------------------------- *
 *
 * A nota de cada categoria vai de 0 a 100 e fica na MESMA escala da
 * dificuldade das perguntas. Nota 70 quer dizer: numa pergunta de
 * dificuldade 70, a chance de acertar e meio a meio.
 *
 * Antes de cada rodada, a nota diz a chance esperada de acerto:
 *
 *     esperado = 1 / (1 + e^((dificuldade - nota) / ESCALA_NOTA))
 *
 * e depois dela a nota anda na direcao da surpresa:
 *
 *     nota += passo * (resultado - esperado)      resultado: 1 acertou, 0 errou
 *
 * Por isso acertar pergunta dificil sobe muito (ninguem esperava), acertar
 * facil sobe pouco (era o esperado), errar facil derruba muito e errar
 * dificil quase nao pesa. O passo comeca grande, para a nota achar o lugar
 * dela rapido, e diminui com as rodadas, para ela ficar estavel.
 */

/** Nota de quem ainda nao jogou a categoria. */
const NOTA_INICIAL = 50;
// A chance esperada (e a ESCALA_NOTA dela, em que 10 pontos acima da nota
// sao 27% de chance e 20 sao 12%) mora em dificuldade.js: a mesma conta
// serve para as duas pontas do circulo.
/** Tamanho do passo: `PASSO_INICIAL / (1 + rodadas / 10)`, nunca abaixo de `PASSO_MINIMO`. */
const PASSO_INICIAL = 20;
const PASSO_MINIMO = 3;
/** Com menos rodadas que isto, a nota aparece como provisoria. */
const RODADAS_PARA_NOTA = 5;
/** Quantas partidas o grafico de evolucao guarda. */
const MAX_HISTORICO = 30;

/** A nota depois de uma rodada. `rodadas` e quantas a pessoa ja tinha jogado nesta categoria. */
function novaNota(nota, rodadas, acertou, dificuldade) {
  const passo = Math.max(PASSO_MINIMO, PASSO_INICIAL / (1 + rodadas / 10));
  const esperado = chanceDeAcerto(nota, dificuldade);
  const nova = nota + passo * ((acertou ? 1 : 0) - esperado);
  return Math.round(Math.min(100, Math.max(0, nova)) * 10) / 10;
}

/** Acerto abaixo disto conta para as conquistas de gatilho. */
const MS_GATILHO = 2500;
/** Acerto com menos que isto sobrando no relógio conta como "no último segundo". */
const MS_ULTIMO_SEGUNDO = 1000;
/** Nota e rodadas para contar como especialista numa categoria. */
const NOTA_ESPECIALISTA = 80;
const RODADAS_ESPECIALISTA = 20;
const TOTAL_CATEGORIAS = require('./questions').CATEGORIAS.length;

const marca = (p, nome) => (p.marcas && p.marcas[nome]) || 0;
const especialidades = (p) => Object.values(p.porCategoria || {})
  .filter((c) => c.rodadas >= RODADAS_ESPECIALISTA && c.nota >= NOTA_ESPECIALISTA).length;

const umaCasa = (n) => Math.round(n * 10) / 10;

/** Em qual faixa de dificuldade.js (Facil, Media, Dificil, Muito dificil) a pergunta cai. */
function indiceDoNivel(dificuldade) {
  const i = NIVEIS.findIndex((n) => dificuldade < n.ate);
  return i < 0 ? NIVEIS.length - 1 : i;
}

/* --------------------------- Fichas de desempenho --------------------------- *
 *
 * Uma ficha e o desempenho num recorte: uma categoria, ou todas juntas (a
 * "geral"). Alem da nota, ela separa as rodadas por faixa de dificuldade e
 * guarda quanto a nota ESPERAVA de acerto em cada uma — e o que o painel do
 * perfil compara com o acerto de verdade.
 */

function novaFicha() {
  return {
    rodadas: 0,
    acertos: 0,
    nota: NOTA_INICIAL,
    somaDificuldade: 0,
    porNivel: NIVEIS.map(() => ({ rodadas: 0, acertos: 0, somaEsperado: 0 }))
  };
}

/** Completa a ficha que veio de antes dos campos novos existirem. */
function normalizarFicha(bruta) {
  const f = Object.assign(novaFicha(), bruta || {});
  if (!Array.isArray(f.porNivel) || f.porNivel.length !== NIVEIS.length) {
    f.porNivel = novaFicha().porNivel;
  }
  return f;
}

/** Uma rodada na ficha. A chance esperada sai da nota de ANTES da rodada. */
function anotarNaFicha(f, acertou, dificuldade) {
  const nivel = f.porNivel[indiceDoNivel(dificuldade)];
  nivel.rodadas += 1;
  if (acertou) nivel.acertos += 1;
  nivel.somaEsperado += chanceDeAcerto(f.nota, dificuldade);

  f.nota = novaNota(f.nota, f.rodadas, acertou, dificuldade);
  f.rodadas += 1;
  if (acertou) f.acertos += 1;
  f.somaDificuldade += dificuldade;
}

/** Junta a ficha `de` na `para`: contagens somam, a nota vira a media pesada pelas rodadas. */
function somarFicha(para, de) {
  const total = para.rodadas + de.rodadas;
  if (total) para.nota = umaCasa((para.nota * para.rodadas + de.nota * de.rodadas) / total);
  para.rodadas = total;
  para.acertos += de.acertos;
  para.somaDificuldade += de.somaDificuldade;
  para.porNivel.forEach((nivel, i) => {
    const outro = de.porNivel[i];
    nivel.rodadas += outro.rodadas;
    nivel.acertos += outro.acertos;
    nivel.somaEsperado += outro.somaEsperado;
  });
  if (para.inicioPartida == null && de.inicioPartida != null) para.inicioPartida = de.inicioPartida;
}

/**
 * A geral de um perfil de antes dela existir: a soma das categorias. A
 * divisao por faixa de dificuldade nao tem como ser refeita, e comeca vazia.
 */
function geralDasCategorias(porCategoria) {
  const geral = novaFicha();
  for (const c of Object.values(porCategoria)) {
    const f = normalizarFicha(c);
    somarFicha(geral, { ...f, porNivel: novaFicha().porNivel });
  }
  return geral;
}

/**
 * A nota que a pessoa leva para uma pergunta desta categoria, e o quanto
 * ela merece confianca — e o que entra na dificuldade da pergunta
 * (dificuldade.js).
 *
 * Nota provisoria nao pode valer inteira: quem jogou 1 rodada de Cinema ainda
 * nao disse nada sobre Cinema. Entao cada nota vale na proporcao da
 * confianca, `rodadas / (rodadas + 5)`, e o resto vem de um degrau acima:
 *
 *   geral   = 50    + confianca da geral     x (nota geral - 50)
 *   efetiva = geral + confianca da categoria x (nota da categoria - geral)
 *
 * Quem joga muito no geral e nunca jogou Cinema entra com a nota geral; quem
 * nunca jogou nada entra com 50 e confianca 0, e nao mexe na pergunta.
 */
function notaEfetivaDe(p, categoria) {
  if (!p) return { nota: NOTA_INICIAL, confianca: 0 };
  const confianca = (f) => (f ? f.rodadas / (f.rodadas + RODADAS_PARA_NOTA) : 0);
  const g = p.geral || novaFicha();
  const c = categoria ? p.porCategoria[categoria] : null;
  const geral = NOTA_INICIAL + confianca(g) * (g.nota - NOTA_INICIAL);
  const nota = c ? geral + confianca(c) * (c.nota - geral) : geral;
  return {
    nota: umaCasa(nota),
    confianca: Math.round((1 - (1 - confianca(g)) * (1 - confianca(c))) * 100) / 100
  };
}

/**
 * As conquistas, na ordem em que aparecem no perfil.
 * `feita(p)` recebe o perfil e diz se ela já foi alcançada.
 *
 * Enquanto não sai, a conquista é secreta: a tela mostra só um cadeado, sem
 * nome nem regra (e o servidor nem manda). Para criar uma nova, basta uma
 * linha aqui; se ela precisar de um contador novo, use `p.marcas`, que soma
 * sozinho no login e não muda o formato do banco.
 */
const CONQUISTAS = [
  // Partidas e vitórias
  { id: 'estreia', icone: '🎮', nome: 'Estreia', descricao: 'Jogou a primeira partida', feita: (p) => p.partidas >= 1 },
  { id: 'veterano', icone: '🎖️', nome: 'Veterano', descricao: 'Jogou 25 partidas', feita: (p) => p.partidas >= 25 },
  { id: 'maratonista', icone: '🏃', nome: 'Maratonista', descricao: 'Jogou 100 partidas', feita: (p) => p.partidas >= 100 },
  { id: 'primeira-vitoria', icone: '🏆', nome: 'Primeira vitoria', descricao: 'Venceu uma partida', feita: (p) => p.vitorias >= 1 },
  { id: 'campeao', icone: '👑', nome: 'Campeao', descricao: 'Venceu 10 partidas', feita: (p) => p.vitorias >= 10 },
  { id: 'lenda', icone: '🌟', nome: 'Lenda', descricao: 'Venceu 50 partidas', feita: (p) => p.vitorias >= 50 },

  // Acertos
  { id: 'dez-acertos', icone: '✅', nome: 'Aquecendo', descricao: 'Acertou 10 rodadas', feita: (p) => p.acertos >= 10 },
  { id: 'cinquenta-acertos', icone: '📚', nome: 'Pegando o jeito', descricao: 'Acertou 50 rodadas', feita: (p) => p.acertos >= 50 },
  { id: 'cem-acertos', icone: '💯', nome: 'Cem acertos', descricao: 'Acertou 100 rodadas', feita: (p) => p.acertos >= 100 },
  { id: 'quinhentos-acertos', icone: '🧩', nome: 'Cabeca cheia', descricao: 'Acertou 500 rodadas', feita: (p) => p.acertos >= 500 },
  { id: 'mil-acertos', icone: '🧠', nome: 'Enciclopedia', descricao: 'Acertou 1000 rodadas', feita: (p) => p.acertos >= 1000 },
  { id: 'cinco-mil-acertos', icone: '🔮', nome: 'Oraculo', descricao: 'Acertou 5000 rodadas', feita: (p) => p.acertos >= 5000 },

  // Velocidade
  { id: 'gatilho', icone: '🔫', nome: 'Rapido no gatilho', descricao: 'Acertou em menos de 2,5 segundos', feita: (p) => marca(p, 'gatilhos') >= 1 },
  { id: 'gatilho-10', icone: '🌡️', nome: 'Gatilho quente', descricao: 'Acertou 10 vezes em menos de 2,5 segundos', feita: (p) => marca(p, 'gatilhos') >= 10 },
  { id: 'gatilho-50', icone: '🤠', nome: 'Mais rapido do oeste', descricao: 'Acertou 50 vezes em menos de 2,5 segundos', feita: (p) => marca(p, 'gatilhos') >= 50 },
  { id: 'gatilho-200', icone: '🐆', nome: 'Reflexo de guepardo', descricao: 'Acertou 200 vezes em menos de 2,5 segundos', feita: (p) => marca(p, 'gatilhos') >= 200 },
  { id: 'relampago', icone: '⚡', nome: 'Relampago', descricao: 'Acertou em menos de 2 segundos', feita: (p) => p.relampagos >= 1 },
  { id: 'relampago-25', icone: '🌩️', nome: 'Tempestade', descricao: 'Acertou 25 vezes em menos de 2 segundos', feita: (p) => p.relampagos >= 25 },
  { id: 'na-frente', icone: '🏁', nome: 'Na frente', descricao: 'Foi o primeiro a acertar 10 vezes', feita: (p) => p.primeiros >= 10 },
  { id: 'sempre-primeiro', icone: '🥇', nome: 'Sempre primeiro', descricao: 'Foi o primeiro a acertar 50 vezes', feita: (p) => p.primeiros >= 50 },

  // No sufoco
  { id: 'ultimo-segundo', icone: '⏱️', nome: 'No ultimo segundo', descricao: 'Acertou com menos de 1 segundo no relogio', feita: (p) => marca(p, 'ultimoSegundo') >= 1 },
  { id: 'ultimo-segundo-10', icone: '😅', nome: 'Especialista em sufoco', descricao: 'Acertou 10 vezes com menos de 1 segundo no relogio', feita: (p) => marca(p, 'ultimoSegundo') >= 10 },
  { id: 'so-eu', icone: '🦉', nome: 'So eu sei', descricao: 'Foi o unico a acertar numa rodada com 4 ou mais pessoas', feita: (p) => marca(p, 'soEu') >= 1 },
  { id: 'so-eu-10', icone: '🗝️', nome: 'Guardiao do saber', descricao: 'Foi o unico a acertar 10 vezes, com 4 ou mais pessoas na rodada', feita: (p) => marca(p, 'soEu') >= 10 },

  // Perguntas difíceis
  { id: 'sabichao', icone: '🎓', nome: 'Sabichao', descricao: 'Acertou uma pergunta Muito dificil', feita: (p) => p.dificeis >= 1 },
  { id: 'genio', icone: '🔥', nome: 'Genio', descricao: 'Acertou 25 perguntas Muito dificeis', feita: (p) => p.dificeis >= 25 },
  { id: 'cerebro-de-ouro', icone: '🏅', nome: 'Cerebro de ouro', descricao: 'Acertou 100 perguntas Muito dificeis', feita: (p) => p.dificeis >= 100 },

  // Sequências e partidas sem erro
  { id: 'embalado', icone: '🎯', nome: 'Embalado', descricao: 'Acertou 5 rodadas seguidas numa partida', feita: (p) => p.maiorSequencia >= 5 },
  { id: 'imparavel', icone: '🚀', nome: 'Imparavel', descricao: 'Acertou 10 rodadas seguidas numa partida', feita: (p) => p.maiorSequencia >= 10 },
  { id: 'maquina', icone: '🤖', nome: 'Maquina', descricao: 'Acertou 20 rodadas seguidas numa partida', feita: (p) => p.maiorSequencia >= 20 },
  { id: 'perfeicao', icone: '💎', nome: 'Perfeicao', descricao: 'Terminou uma partida sem errar nenhuma rodada (pelo menos 5)', feita: (p) => marca(p, 'perfeitas') >= 1 },
  { id: 'impecavel', icone: '👼', nome: 'Impecavel', descricao: 'Terminou 5 partidas sem errar nenhuma rodada', feita: (p) => marca(p, 'perfeitas') >= 5 },

  // Jeitos de vencer
  { id: 'virada', icone: '🔄', nome: 'Virada historica', descricao: 'Venceu estando em ultimo na metade da partida', feita: (p) => marca(p, 'viradas') >= 1 },
  { id: 'atropelo', icone: '🚜', nome: 'Atropelo', descricao: 'Venceu com o dobro dos pontos do segundo colocado', feita: (p) => marca(p, 'lavadas') >= 1 },
  { id: 'por-um-triz', icone: '📸', nome: 'Por um triz', descricao: 'Venceu por uma diferenca minima', feita: (p) => marca(p, 'trizes') >= 1 },

  // Categorias
  { id: 'curioso', icone: '🧭', nome: 'Curioso', descricao: 'Acertou perguntas de 5 categorias diferentes', feita: (p) => p.categorias.length >= 5 },
  { id: 'ecletico', icone: '🌍', nome: 'Ecletico', descricao: 'Acertou perguntas de 10 categorias diferentes', feita: (p) => p.categorias.length >= 10 },
  { id: 'sabe-tudo', icone: '🌌', nome: 'Sabe-tudo', descricao: 'Acertou perguntas de todas as categorias', feita: (p) => p.categorias.length >= TOTAL_CATEGORIAS },
  { id: 'especialista', icone: '🔬', nome: 'Especialista', descricao: 'Chegou a nota 80 numa categoria, com 20 rodadas ou mais', feita: (p) => especialidades(p) >= 1 },
  { id: 'mestre', icone: '🧙', nome: 'Mestre', descricao: 'Chegou a nota 80 em 3 categorias, com 20 rodadas ou mais em cada', feita: (p) => especialidades(p) >= 3 },

  // Jeitos de jogar
  { id: 'casa-cheia', icone: '🏟️', nome: 'Casa cheia', descricao: 'Jogou uma partida com 6 ou mais pessoas', feita: (p) => marca(p, 'casaCheia') >= 1 },
  { id: 'folego', icone: '🫁', nome: 'Folego de sobra', descricao: 'Jogou uma partida de 30 rodadas ou mais', feita: (p) => marca(p, 'maratonas') >= 1 },
  { id: 'coruja', icone: '🌙', nome: 'Coruja', descricao: 'Terminou uma partida entre meia-noite e 5 da manha', feita: (p) => marca(p, 'madrugadas') >= 1 }
];

function perfilVazio() {
  return {
    nickname: '',
    partidas: 0,
    vitorias: 0,
    acertos: 0,
    pontos: 0,
    relampagos: 0,
    primeiros: 0,
    dificeis: 0,
    maiorSequencia: 0,
    categorias: [],
    // Todas as categorias juntas, e cada uma sozinha: fichas de novaFicha().
    geral: novaFicha(),
    porCategoria: {},
    // Contadores das conquistas mais novas (gatilhos, perfeitas, viradas...)
    marcas: {},
    // Uma foto por partida: { quando, nota (geral), cats: { id: nota } }.
    historico: [],
    // Categorias medidas desde a ultima foto: entram na proxima.
    mexidas: [],
    conquistas: {} // id -> quando foi alcançada (ms)
  };
}

/** @type {Map<string, ReturnType<typeof perfilVazio>>} cliente ou conta -> perfil */
const perfis = new Map();
/** @type {Map<string, string>} carteirinha -> conta do Google ligada a ela */
const vinculos = new Map();
/** O que mudou desde a última gravação (inclui o que foi apagado). */
const sujos = new Set();
const vinculosSujos = new Set();
let pendente = null;

/** Junta o que veio de fora com o formato atual (campos novos entram zerados). */
function normalizarPerfil(bruto) {
  const p = Object.assign(perfilVazio(), bruto || {});
  if (!Array.isArray(p.categorias)) p.categorias = [];
  if (!p.conquistas || typeof p.conquistas !== 'object') p.conquistas = {};
  if (!p.porCategoria || typeof p.porCategoria !== 'object') p.porCategoria = {};
  if (!p.marcas || typeof p.marcas !== 'object') p.marcas = {};
  for (const [id, c] of Object.entries(p.porCategoria)) p.porCategoria[id] = normalizarFicha(c);
  // Perfil de antes da nota geral: ela nasce da soma das categorias.
  const tinhaGeral = bruto && bruto.geral && typeof bruto.geral === 'object';
  p.geral = tinhaGeral ? normalizarFicha(bruto.geral) : geralDasCategorias(p.porCategoria);
  if (!Array.isArray(p.historico)) p.historico = [];
  if (!Array.isArray(p.mexidas)) p.mexidas = [];
  return p;
}

/** De quem é o perfil desta carteirinha: da conta ligada, ou dela mesma. */
function chaveDe(cliente) {
  return vinculos.get(cliente) || cliente;
}

/* ------------------------------ Persistência ------------------------------ */

function lerArquivo() {
  try {
    const bruto = JSON.parse(fs.readFileSync(ARQUIVO, 'utf8'));
    // O formato antigo era só o mapa de perfis, sem ligações.
    const lidos = bruto.perfis && typeof bruto.perfis === 'object' ? bruto.perfis : bruto;
    for (const [chave, dados] of Object.entries(lidos)) perfis.set(chave, normalizarPerfil(dados));
    for (const [cliente, conta] of Object.entries(bruto.vinculos || {})) vinculos.set(cliente, conta);
  } catch (erro) {
    if (erro.code !== 'ENOENT') console.warn('Nao consegui ler os perfis, comecando do zero:', erro.message);
  }
}

async function lerBanco() {
  try {
    const [jogadores, ligacoes] = await Promise.all([
      banco.consultar('SELECT cliente, dados FROM jogadores'),
      banco.consultar('SELECT cliente, conta FROM vinculos')
    ]);
    for (const { cliente, dados } of jogadores.rows) {
      // Quem jogou antes da leitura terminar ja esta no mapa: fica o que tiver mais partidas.
      const atual = perfis.get(cliente);
      const lido = normalizarPerfil(dados);
      if (!atual || lido.partidas > atual.partidas) perfis.set(cliente, lido);
    }
    for (const { cliente, conta } of ligacoes.rows) {
      if (!vinculos.has(cliente)) vinculos.set(cliente, conta);
    }
  } catch (erro) {
    console.warn('Nao consegui ler os perfis do banco, comecando do zero:', erro.message);
  }
}

function carregar() {
  if (banco.ativo()) return lerBanco();
  lerArquivo();
  return Promise.resolve();
}

function gravarArquivo() {
  try {
    fs.mkdirSync(path.dirname(ARQUIVO), { recursive: true });
    fs.writeFileSync(ARQUIVO, JSON.stringify({
      perfis: Object.fromEntries(perfis),
      vinculos: Object.fromEntries(vinculos)
    }), 'utf8');
  } catch (erro) {
    console.warn('Nao consegui gravar os perfis:', erro.message);
  }
}

async function gravarBanco() {
  if (!sujos.size && !vinculosSujos.size) return;
  const chaves = [...sujos];
  const ligacoes = [...vinculosSujos];
  sujos.clear();
  vinculosSujos.clear();

  // O que sumiu do mapa (perfil somado numa conta, login desfeito) sai do banco.
  const vivos = chaves.filter((c) => perfis.has(c));
  const apagados = chaves.filter((c) => !perfis.has(c));
  const ligados = ligacoes.filter((c) => vinculos.has(c));
  const desligados = ligacoes.filter((c) => !vinculos.has(c));

  try {
    if (vivos.length) {
      await banco.consultar(
        `INSERT INTO jogadores (cliente, nickname, dados, atualizado_em)
         SELECT c, n, d::jsonb, now() FROM unnest($1::text[], $2::text[], $3::text[]) AS t(c, n, d)
         ON CONFLICT (cliente) DO UPDATE
           SET nickname = EXCLUDED.nickname, dados = EXCLUDED.dados, atualizado_em = now()`,
        [vivos, vivos.map((c) => perfis.get(c).nickname), vivos.map((c) => JSON.stringify(perfis.get(c)))]
      );
    }
    if (apagados.length) {
      await banco.consultar('DELETE FROM jogadores WHERE cliente = ANY($1::text[])', [apagados]);
    }
    if (ligados.length) {
      await banco.consultar(
        `INSERT INTO vinculos (cliente, conta)
         SELECT * FROM unnest($1::text[], $2::text[])
         ON CONFLICT (cliente) DO UPDATE SET conta = EXCLUDED.conta`,
        [ligados, ligados.map((c) => vinculos.get(c))]
      );
    }
    if (desligados.length) {
      await banco.consultar('DELETE FROM vinculos WHERE cliente = ANY($1::text[])', [desligados]);
    }
  } catch (erro) {
    for (const c of chaves) sujos.add(c);
    for (const c of ligacoes) vinculosSujos.add(c);
    console.warn('Nao consegui gravar os perfis no banco:', erro.message);
  }
}

function salvar() {
  if (pendente) clearTimeout(pendente);
  pendente = null;
  if (banco.ativo()) return gravarBanco();
  gravarArquivo();
  return Promise.resolve();
}

function agendarSalvamento() {
  if (pendente) return;
  pendente = setTimeout(salvar, SALVAR_APOS);
  pendente.unref();
}

/* -------------------------------- Registro -------------------------------- */

/** O perfil (criado na hora se preciso) de uma carteirinha ou de uma conta. */
function perfilDe(chave, nickname) {
  let p = perfis.get(chave);
  if (!p) {
    p = perfilVazio();
    perfis.set(chave, p);
  }
  if (nickname) p.nickname = nickname;
  return p;
}

function contar(p, nome) {
  p.marcas[nome] = (p.marcas[nome] || 0) + 1;
}

/** A hora (0 a 23) no horário de Brasília: é daqui que vem quase todo mundo. */
function horaDeBrasilia(quando = Date.now()) {
  const hora = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', hour: 'numeric', hourCycle: 'h23'
  }).format(new Date(quando));
  return Number(hora);
}

function marcar(chave) {
  sujos.add(chave);
  agendarSalvamento();
}

/** Marca as conquistas recém-alcançadas e devolve só elas. */
function conferirConquistas(p) {
  const novas = [];
  for (const c of CONQUISTAS) {
    if (!p.conquistas[c.id] && c.feita(p)) {
      p.conquistas[c.id] = Date.now();
      novas.push(publica(c));
    }
  }
  return novas;
}

function publica(c) {
  return { id: c.id, icone: c.icone, nome: c.nome, descricao: c.descricao };
}

/**
 * Uma rodada terminou para esta pessoa.
 *
 * @param {string} cliente
 * @param {string} nickname
 * @param {object} r
 * @param {boolean} r.acertou
 * @param {number|null} r.ms          quanto levou para acertar (quando se sabe)
 * @param {boolean} r.primeiro        foi a primeira a acertar
 * @param {number|null} r.dificuldade dificuldade da pergunta
 * @param {string|null} r.categoria
 * @param {number} r.sequencia        rodadas seguidas acertando nesta partida
 * @returns {object[]} as conquistas que acabaram de sair
 */
function anotarRodada(cliente, nickname, r) {
  if (!cliente) return [];
  const chave = chaveDe(cliente);
  const p = perfilDe(chave, nickname);
  if (r.acertou) {
    p.acertos += 1;
    if (Number.isFinite(r.ms) && r.ms < MS_RELAMPAGO) p.relampagos += 1;
    if (Number.isFinite(r.ms) && r.ms < MS_GATILHO) contar(p, 'gatilhos');
    if (Number.isFinite(r.restanteMs) && r.restanteMs >= 0 && r.restanteMs < MS_ULTIMO_SEGUNDO) contar(p, 'ultimoSegundo');
    if (r.soEle) contar(p, 'soEu');
    if (r.primeiro) p.primeiros += 1;
    if (Number.isFinite(r.dificuldade) && r.dificuldade >= DIF_MUITO_DIFICIL) p.dificeis += 1;
    if (r.categoria && !p.categorias.includes(r.categoria)) p.categorias.push(r.categoria);
  }
  p.maiorSequencia = Math.max(p.maiorSequencia, r.sequencia || 0);
  if (r.medeCategoria && r.categoria && Number.isFinite(r.dificuldade)) {
    const c = p.porCategoria[r.categoria] || (p.porCategoria[r.categoria] = novaFicha());
    // A primeira rodada medida da partida guarda de onde a nota saiu, para a
    // variacao que o painel mostra ("+4 na ultima partida").
    if (!p.mexidas.length) p.geral.inicioPartida = p.geral.nota;
    if (!p.mexidas.includes(r.categoria)) {
      p.mexidas.push(r.categoria);
      c.inicioPartida = c.nota;
    }
    anotarNaFicha(c, r.acertou, r.dificuldade);
    anotarNaFicha(p.geral, r.acertou, r.dificuldade);
  }
  marcar(chave);
  return conferirConquistas(p);
}

/**
 * Fecha a partida no historico: uma foto da nota geral e das categorias que
 * foram medidas, e a variacao de cada uma desde o comeco dela. Partida sem
 * rodada medida (so leilao, por exemplo) nao vira foto.
 */
function fotografar(p) {
  if (!p.mexidas.length) return;
  const cats = {};
  for (const id of p.mexidas) {
    const c = p.porCategoria[id];
    if (!c) continue;
    cats[id] = c.nota;
    c.variacao = umaCasa(c.nota - (c.inicioPartida ?? c.nota));
    delete c.inicioPartida;
  }
  p.geral.variacao = umaCasa(p.geral.nota - (p.geral.inicioPartida ?? p.geral.nota));
  delete p.geral.inicioPartida;
  p.historico.push({ quando: Date.now(), nota: p.geral.nota, cats });
  if (p.historico.length > MAX_HISTORICO) p.historico.splice(0, p.historico.length - MAX_HISTORICO);
  p.mexidas = [];
}

/** A partida acabou para esta pessoa. */
function fimDePartida(cliente, nickname, fim) {
  if (!cliente) return [];
  const { venceu, pontos } = fim;
  const chave = chaveDe(cliente);
  const p = perfilDe(chave, nickname);
  p.partidas += 1;
  if (venceu) p.vitorias += 1;
  p.pontos += Math.max(0, pontos || 0);
  if (fim.perfeita) contar(p, 'perfeitas');
  if (fim.virada) contar(p, 'viradas');
  if (fim.lavada) contar(p, 'lavadas');
  if (fim.porUmTriz) contar(p, 'trizes');
  if ((fim.jogadores || 0) >= 6) contar(p, 'casaCheia');
  if ((fim.rodadas || 0) >= 30) contar(p, 'maratonas');
  if (horaDeBrasilia(fim.quando) < 5) contar(p, 'madrugadas');
  fotografar(p);
  marcar(chave);
  return conferirConquistas(p);
}

/* --------------------------------- Contas --------------------------------- */

const SOMAM = ['partidas', 'vitorias', 'acertos', 'pontos', 'relampagos', 'primeiros', 'dificeis'];

/** Junta o perfil `de` dentro de `para`: soma os números e fica com a conquista mais antiga. */
function somar(para, de) {
  for (const campo of SOMAM) para[campo] += de[campo] || 0;
  para.maiorSequencia = Math.max(para.maiorSequencia, de.maiorSequencia || 0);
  for (const c of de.categorias) if (!para.categorias.includes(c)) para.categorias.push(c);
  for (const [id, quando] of Object.entries(de.conquistas)) {
    para.conquistas[id] = para.conquistas[id] ? Math.min(para.conquistas[id], quando) : quando;
  }
  if (!para.nickname) para.nickname = de.nickname;
  for (const [nome, n] of Object.entries(de.marcas || {})) para.marcas[nome] = (para.marcas[nome] || 0) + n;

  // Geral e por categoria: somam as contagens, e a nota vira a media pesada pelas rodadas.
  somarFicha(para.geral, de.geral);
  for (const [id, c] of Object.entries(de.porCategoria || {})) {
    const alvo = para.porCategoria[id];
    if (alvo) somarFicha(alvo, c);
    else para.porCategoria[id] = JSON.parse(JSON.stringify(c));
  }
  // As fotos dos dois aparelhos entram na mesma linha do tempo.
  para.historico = [...para.historico, ...de.historico]
    .sort((a, b) => a.quando - b.quando)
    .slice(-MAX_HISTORICO);
  for (const id of de.mexidas) if (!para.mexidas.includes(id)) para.mexidas.push(id);
}

/**
 * Liga a carteirinha a uma conta do Google.
 *
 * O que o navegador jogou sem login vai para a conta (somado) e o perfil
 * solto dele deixa de existir. Entrar de novo na mesma conta não soma nada.
 * Um navegador que estava em OUTRA conta só troca de conta: o perfil daquela
 * continua dela.
 */
function entrarComConta(cliente, conta, nome) {
  if (!cliente || !conta) return [];
  const antes = vinculos.get(cliente);
  const destino = perfilDe(conta);
  if (nome) destino.nomeConta = nome;

  if (antes !== conta) {
    const solto = antes ? null : perfis.get(cliente);
    if (solto) {
      somar(destino, solto);
      perfis.delete(cliente);
      sujos.add(cliente);
    }
    vinculos.set(cliente, conta);
    vinculosSujos.add(cliente);
  }
  marcar(conta);
  return conferirConquistas(destino);
}

/** Desliga a carteirinha da conta: o navegador volta a jogar sem login, do zero. */
function sairDaConta(cliente) {
  if (!cliente || !vinculos.has(cliente)) return;
  vinculos.delete(cliente);
  vinculosSujos.add(cliente);
  agendarSalvamento();
}


/** A nota (e a confianca nela) de quem joga com esta carteirinha, para uma pergunta desta categoria. */
function notaEfetiva(cliente, categoria) {
  return notaEfetivaDe(cliente ? perfis.get(chaveDe(cliente)) : null, categoria);
}

const porcento = (parte, todo) => (todo ? Math.round((100 * parte) / todo) : null);

/** Uma ficha do jeito que o painel desenha. */
function fichaParaTela(f) {
  return {
    nota: Math.round(f.nota),
    // A faixa de dificuldade em que a pessoa acerta meio a meio.
    nivel: NIVEIS[indiceDoNivel(f.nota)].nome,
    provisoria: f.rodadas < RODADAS_PARA_NOTA,
    rodadas: f.rodadas,
    acertos: f.acertos,
    aproveitamento: porcento(f.acertos, f.rodadas),
    dificuldadeMedia: f.rodadas ? Math.round(f.somaDificuldade / f.rodadas) : null,
    variacao: Number.isFinite(f.variacao) ? f.variacao : null,
    porNivel: NIVEIS.map((n, i) => {
      const nivel = f.porNivel[i];
      return {
        nivel: n.nome,
        rodadas: nivel.rodadas,
        acertos: nivel.acertos,
        aproveitamento: porcento(nivel.acertos, nivel.rodadas),
        esperado: nivel.rodadas ? Math.round((100 * nivel.somaEsperado) / nivel.rodadas) : null
      };
    })
  };
}

/**
 * O ponto forte e o que pede treino: a maior e a menor nota entre as
 * categorias que ja passaram da fase provisoria. Com uma so, nao ha o que comparar.
 */
function destaquesDe(linhas) {
  const firmes = linhas.filter((l) => !l.provisoria);
  if (firmes.length < 2) return { forte: null, fraco: null };
  const ordem = [...firmes].sort((a, b) => b.nota - a.nota);
  const forte = ordem[0];
  const fraco = ordem[ordem.length - 1];
  return forte.nota === fraco.nota ? { forte: null, fraco: null } : { forte: forte.id, fraco: fraco.id };
}

/** O perfil para a tela: os números, o painel de desempenho e todas as conquistas. */
function verPerfil(cliente) {
  const conta = cliente ? vinculos.get(cliente) : null;
  const p = (cliente && perfis.get(chaveDe(cliente))) || perfilVazio();
  const desempenho = Object.entries(p.porCategoria)
    .map(([id, c]) => ({
      id,
      ...fichaParaTela(c),
      historico: p.historico
        .filter((h) => h.cats && Number.isFinite(h.cats[id]))
        .map((h) => ({ quando: h.quando, nota: Math.round(h.cats[id]) }))
    }))
    .sort((a, b) => a.provisoria - b.provisoria || b.nota - a.nota || b.rodadas - a.rodadas);
  return {
    conta: conta ? { nome: p.nomeConta || p.nickname || '' } : null,
    nickname: p.nickname,
    partidas: p.partidas,
    vitorias: p.vitorias,
    acertos: p.acertos,
    pontos: p.pontos,
    maiorSequencia: p.maiorSequencia,
    categorias: p.categorias.length,
    geral: {
      ...fichaParaTela(p.geral),
      historico: p.historico.map((h) => ({ quando: h.quando, nota: Math.round(h.nota) }))
    },
    desempenho,
    destaques: destaquesDe(desempenho),
    // Secretas ate sair: sem nome, sem regra, nem o id (que ja entregaria a regra).
    conquistas: CONQUISTAS.map((c) => (p.conquistas[c.id]
      ? { ...publica(c), quando: p.conquistas[c.id] }
      : { secreta: true }))
  };
}

/** Os que mais venceram, para o ranking geral. */
function melhores(limite = 10) {
  return [...perfis.values()]
    .filter((p) => p.partidas > 0 && p.nickname)
    .sort((a, b) => b.vitorias - a.vitorias || b.acertos - a.acertos || b.partidas - a.partidas)
    .slice(0, limite)
    .map((p) => ({
      nickname: p.nickname,
      vitorias: p.vitorias,
      partidas: p.partidas,
      acertos: p.acertos,
      conquistas: Object.keys(p.conquistas).length
    }));
}

const pronto = carregar();
process.on('exit', () => { if (pendente && !banco.ativo()) gravarArquivo(); });

module.exports = {
  anotarRodada, fimDePartida, verPerfil, melhores, salvar, pronto, entrarComConta, sairDaConta,
  CONQUISTAS, MS_RELAMPAGO, MS_GATILHO, MS_ULTIMO_SEGUNDO, DIF_MUITO_DIFICIL, horaDeBrasilia,
  chanceDeAcerto, novaNota, NOTA_INICIAL, ESCALA_NOTA, RODADAS_PARA_NOTA, MAX_HISTORICO,
  notaEfetiva, notaEfetivaDe, normalizarPerfil
};
