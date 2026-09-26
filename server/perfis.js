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
/** Diferenca que muda a chance: 10 pontos acima da nota = 27% de chance; 20 = 12%. */
const ESCALA_NOTA = 10;
/** Tamanho do passo: `PASSO_INICIAL / (1 + rodadas / 10)`, nunca abaixo de `PASSO_MINIMO`. */
const PASSO_INICIAL = 20;
const PASSO_MINIMO = 3;
/** Com menos rodadas que isto, a nota aparece como provisoria. */
const RODADAS_PARA_NOTA = 5;

function chanceDeAcerto(nota, dificuldade) {
  return 1 / (1 + Math.exp((dificuldade - nota) / ESCALA_NOTA));
}

/** A nota depois de uma rodada. `rodadas` e quantas a pessoa ja tinha jogado nesta categoria. */
function novaNota(nota, rodadas, acertou, dificuldade) {
  const passo = Math.max(PASSO_MINIMO, PASSO_INICIAL / (1 + rodadas / 10));
  const esperado = chanceDeAcerto(nota, dificuldade);
  const nova = nota + passo * ((acertou ? 1 : 0) - esperado);
  return Math.round(Math.min(100, Math.max(0, nova)) * 10) / 10;
}

/**
 * As conquistas, na ordem em que aparecem no perfil.
 * `feita(p)` recebe o perfil e diz se ela já foi alcançada.
 */
const CONQUISTAS = [
  { id: 'estreia', icone: '🎮', nome: 'Estreia', descricao: 'Jogou a primeira partida', feita: (p) => p.partidas >= 1 },
  { id: 'veterano', icone: '🎖️', nome: 'Veterano', descricao: 'Jogou 25 partidas', feita: (p) => p.partidas >= 25 },
  { id: 'maratonista', icone: '🏃', nome: 'Maratonista', descricao: 'Jogou 100 partidas', feita: (p) => p.partidas >= 100 },
  { id: 'primeira-vitoria', icone: '🏆', nome: 'Primeira vitoria', descricao: 'Venceu uma partida', feita: (p) => p.vitorias >= 1 },
  { id: 'campeao', icone: '👑', nome: 'Campeao', descricao: 'Venceu 10 partidas', feita: (p) => p.vitorias >= 10 },
  { id: 'lenda', icone: '🌟', nome: 'Lenda', descricao: 'Venceu 50 partidas', feita: (p) => p.vitorias >= 50 },
  { id: 'cem-acertos', icone: '💯', nome: 'Cem acertos', descricao: 'Acertou 100 rodadas', feita: (p) => p.acertos >= 100 },
  { id: 'mil-acertos', icone: '🧠', nome: 'Enciclopedia', descricao: 'Acertou 1000 rodadas', feita: (p) => p.acertos >= 1000 },
  { id: 'relampago', icone: '⚡', nome: 'Relampago', descricao: 'Acertou em menos de 2 segundos', feita: (p) => p.relampagos >= 1 },
  { id: 'sempre-primeiro', icone: '🥇', nome: 'Sempre primeiro', descricao: 'Foi o primeiro a acertar 50 vezes', feita: (p) => p.primeiros >= 50 },
  { id: 'sabichao', icone: '🎓', nome: 'Sabichao', descricao: 'Acertou uma pergunta Muito dificil', feita: (p) => p.dificeis >= 1 },
  { id: 'genio', icone: '🔥', nome: 'Genio', descricao: 'Acertou 25 perguntas Muito dificeis', feita: (p) => p.dificeis >= 25 },
  { id: 'embalado', icone: '🎯', nome: 'Embalado', descricao: 'Acertou 5 rodadas seguidas numa partida', feita: (p) => p.maiorSequencia >= 5 },
  { id: 'imparavel', icone: '🚀', nome: 'Imparavel', descricao: 'Acertou 10 rodadas seguidas numa partida', feita: (p) => p.maiorSequencia >= 10 },
  { id: 'ecletico', icone: '🌍', nome: 'Ecletico', descricao: 'Acertou perguntas de 10 categorias diferentes', feita: (p) => p.categorias.length >= 10 }
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
    // id da categoria -> { rodadas, acertos, nota, somaDificuldade }
    porCategoria: {},
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
    if (r.primeiro) p.primeiros += 1;
    if (Number.isFinite(r.dificuldade) && r.dificuldade >= DIF_MUITO_DIFICIL) p.dificeis += 1;
    if (r.categoria && !p.categorias.includes(r.categoria)) p.categorias.push(r.categoria);
  }
  p.maiorSequencia = Math.max(p.maiorSequencia, r.sequencia || 0);
  if (r.medeCategoria && r.categoria && Number.isFinite(r.dificuldade)) {
    const c = p.porCategoria[r.categoria]
      || (p.porCategoria[r.categoria] = { rodadas: 0, acertos: 0, nota: NOTA_INICIAL, somaDificuldade: 0 });
    c.nota = novaNota(c.nota, c.rodadas, r.acertou, r.dificuldade);
    c.rodadas += 1;
    if (r.acertou) c.acertos += 1;
    c.somaDificuldade += r.dificuldade;
  }
  marcar(chave);
  return conferirConquistas(p);
}

/** A partida acabou para esta pessoa. */
function fimDePartida(cliente, nickname, { venceu, pontos }) {
  if (!cliente) return [];
  const chave = chaveDe(cliente);
  const p = perfilDe(chave, nickname);
  p.partidas += 1;
  if (venceu) p.vitorias += 1;
  p.pontos += Math.max(0, pontos || 0);
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

  // Por categoria: somam as contagens, e a nota vira a media pesada pelas rodadas.
  for (const [id, c] of Object.entries(de.porCategoria || {})) {
    const alvo = para.porCategoria[id];
    if (!alvo) {
      para.porCategoria[id] = { ...c };
      continue;
    }
    const total = alvo.rodadas + c.rodadas;
    alvo.nota = total ? Math.round(((alvo.nota * alvo.rodadas + c.nota * c.rodadas) / total) * 10) / 10 : alvo.nota;
    alvo.rodadas = total;
    alvo.acertos += c.acertos;
    alvo.somaDificuldade += c.somaDificuldade;
  }
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


/** O perfil para a tela: os números e todas as conquistas, feitas ou não. */
function verPerfil(cliente) {
  const conta = cliente ? vinculos.get(cliente) : null;
  const p = (cliente && perfis.get(chaveDe(cliente))) || perfilVazio();
  return {
    conta: conta ? { nome: p.nomeConta || p.nickname || '' } : null,
    nickname: p.nickname,
    partidas: p.partidas,
    vitorias: p.vitorias,
    acertos: p.acertos,
    pontos: p.pontos,
    maiorSequencia: p.maiorSequencia,
    categorias: p.categorias.length,
    desempenho: Object.entries(p.porCategoria)
      .map(([id, c]) => ({
        id,
        nota: Math.round(c.nota),
        provisoria: c.rodadas < RODADAS_PARA_NOTA,
        rodadas: c.rodadas,
        acertos: c.acertos,
        dificuldadeMedia: c.rodadas ? Math.round(c.somaDificuldade / c.rodadas) : null
      }))
      .sort((a, b) => a.provisoria - b.provisoria || b.nota - a.nota || b.rodadas - a.rodadas),
    conquistas: CONQUISTAS.map((c) => ({ ...publica(c), quando: p.conquistas[c.id] || null }))
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
  CONQUISTAS, MS_RELAMPAGO, DIF_MUITO_DIFICIL,
  chanceDeAcerto, novaNota, NOTA_INICIAL, RODADAS_PARA_NOTA
};
