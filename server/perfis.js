'use strict';

/**
 * O perfil de cada jogador: números de todas as partidas e as conquistas.
 *
 * Quem é quem vem da carteirinha do navegador (`cliente`), a mesma que já
 * reconhece a aba voltando depois de uma queda. Não há conta nem senha: o
 * perfil é daquele navegador. Trocar de nickname não perde nada; trocar de
 * navegador (ou limpar os dados dele) começa um perfil novo.
 *
 * Com `DATABASE_URL` os perfis moram na tabela `jogadores`; sem ela, em
 * `server/dados/perfis.json`, igual aos outros contadores.
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
    conquistas: {} // id -> quando foi alcançada (ms)
  };
}

/** @type {Map<string, ReturnType<typeof perfilVazio>>} cliente -> perfil */
const perfis = new Map();
const sujos = new Set();
let pendente = null;

/** Junta o que veio de fora com o formato atual (campos novos entram zerados). */
function normalizarPerfil(bruto) {
  const p = Object.assign(perfilVazio(), bruto || {});
  if (!Array.isArray(p.categorias)) p.categorias = [];
  if (!p.conquistas || typeof p.conquistas !== 'object') p.conquistas = {};
  return p;
}

/* ------------------------------ Persistência ------------------------------ */

function lerArquivo() {
  try {
    const bruto = JSON.parse(fs.readFileSync(ARQUIVO, 'utf8'));
    for (const [cliente, dados] of Object.entries(bruto)) perfis.set(cliente, normalizarPerfil(dados));
  } catch (erro) {
    if (erro.code !== 'ENOENT') console.warn('Nao consegui ler os perfis, comecando do zero:', erro.message);
  }
}

async function lerBanco() {
  try {
    const { rows } = await banco.consultar('SELECT cliente, dados FROM jogadores');
    for (const { cliente, dados } of rows) {
      // Quem jogou antes da leitura terminar ja esta no mapa: fica o que tiver mais partidas.
      const atual = perfis.get(cliente);
      const lido = normalizarPerfil(dados);
      if (!atual || lido.partidas > atual.partidas) perfis.set(cliente, lido);
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
    fs.writeFileSync(ARQUIVO, JSON.stringify(Object.fromEntries(perfis)), 'utf8');
  } catch (erro) {
    console.warn('Nao consegui gravar os perfis:', erro.message);
  }
}

async function gravarBanco() {
  if (!sujos.size) return;
  const clientes = [...sujos];
  sujos.clear();
  try {
    await banco.consultar(
      `INSERT INTO jogadores (cliente, nickname, dados, atualizado_em)
       SELECT c, n, d::jsonb, now() FROM unnest($1::text[], $2::text[], $3::text[]) AS t(c, n, d)
       ON CONFLICT (cliente) DO UPDATE
         SET nickname = EXCLUDED.nickname, dados = EXCLUDED.dados, atualizado_em = now()`,
      [
        clientes,
        clientes.map((c) => perfis.get(c).nickname),
        clientes.map((c) => JSON.stringify(perfis.get(c)))
      ]
    );
  } catch (erro) {
    for (const c of clientes) sujos.add(c);
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

function perfilDe(cliente, nickname) {
  let p = perfis.get(cliente);
  if (!p) {
    p = perfilVazio();
    perfis.set(cliente, p);
  }
  if (nickname) p.nickname = nickname;
  return p;
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
  const p = perfilDe(cliente, nickname);
  if (r.acertou) {
    p.acertos += 1;
    if (Number.isFinite(r.ms) && r.ms < MS_RELAMPAGO) p.relampagos += 1;
    if (r.primeiro) p.primeiros += 1;
    if (Number.isFinite(r.dificuldade) && r.dificuldade >= DIF_MUITO_DIFICIL) p.dificeis += 1;
    if (r.categoria && !p.categorias.includes(r.categoria)) p.categorias.push(r.categoria);
  }
  p.maiorSequencia = Math.max(p.maiorSequencia, r.sequencia || 0);
  sujos.add(cliente);
  agendarSalvamento();
  return conferirConquistas(p);
}

/** A partida acabou para esta pessoa. */
function fimDePartida(cliente, nickname, { venceu, pontos }) {
  if (!cliente) return [];
  const p = perfilDe(cliente, nickname);
  p.partidas += 1;
  if (venceu) p.vitorias += 1;
  p.pontos += Math.max(0, pontos || 0);
  sujos.add(cliente);
  agendarSalvamento();
  return conferirConquistas(p);
}

/** O perfil para a tela: os números e todas as conquistas, feitas ou não. */
function verPerfil(cliente) {
  const p = (cliente && perfis.get(cliente)) || perfilVazio();
  return {
    nickname: p.nickname,
    partidas: p.partidas,
    vitorias: p.vitorias,
    acertos: p.acertos,
    pontos: p.pontos,
    maiorSequencia: p.maiorSequencia,
    categorias: p.categorias.length,
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
  anotarRodada, fimDePartida, verPerfil, melhores, salvar, pronto,
  CONQUISTAS, MS_RELAMPAGO, DIF_MUITO_DIFICIL
};
