'use strict';

/**
 * Conexão com o Postgres (Supabase, Neon ou qualquer outro).
 *
 * Só liga quando existe a variável `DATABASE_URL`. Sem ela o jogo continua
 * gravando em `server/dados/*.json`, como sempre — no PC ninguém precisa de
 * banco para jogar. No Render o disco zera a cada deploy, e é por isso que lá
 * os contadores precisam morar no banco.
 *
 * As tabelas se criam sozinhas na subida (`CREATE TABLE IF NOT EXISTS`): não
 * há SQL para rodar no painel.
 */

const URL_BANCO = process.env.DATABASE_URL || '';

const TABELAS = `
  CREATE TABLE IF NOT EXISTS perguntas_usos (
    id     text PRIMARY KEY,
    vezes  integer NOT NULL
  );

  CREATE TABLE IF NOT EXISTS perguntas_stats (
    id            text PRIMARY KEY,
    vezes         integer NOT NULL,
    jogadores     integer NOT NULL,
    acertos       integer NOT NULL,
    dificuldade   real    NOT NULL,
    tempo_medio   integer NOT NULL,
    atualizado_em timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS jogadores (
    cliente       text PRIMARY KEY,
    nickname      text NOT NULL,
    dados         jsonb NOT NULL,
    atualizado_em timestamptz NOT NULL DEFAULT now()
  );
`;

let pool = null;
let preparo = null;

function ativo() {
  return Boolean(URL_BANCO);
}

/** Banco local (testes, PC) fala sem SSL; o da nuvem exige. */
function precisaSsl(url) {
  try {
    const { hostname, searchParams } = new URL(url);
    if (searchParams.get('sslmode') === 'disable') return false;
    return !['localhost', '127.0.0.1', '::1'].includes(hostname);
  } catch {
    return true;
  }
}

function conexao() {
  if (!pool) {
    const { Pool } = require('pg');
    pool = new Pool({
      connectionString: URL_BANCO,
      ssl: precisaSsl(URL_BANCO) ? { rejectUnauthorized: false } : false,
      max: 3,
      connectionTimeoutMillis: 10000
    });
    // Uma conexão ociosa que cai não pode derrubar o servidor inteiro.
    pool.on('error', (erro) => console.warn('Conexao com o banco caiu:', erro.message));
  }
  return pool;
}

/** Cria as tabelas uma vez; quem chamar de novo recebe a mesma promessa. */
function preparar() {
  if (!preparo) {
    // Se falhar (banco fora do ar), a proxima chamada tenta de novo.
    preparo = conexao().query(TABELAS).catch((erro) => {
      preparo = null;
      throw erro;
    });
  }
  return preparo;
}

async function consultar(sql, parametros) {
  await preparar();
  return conexao().query(sql, parametros);
}

async function fechar() {
  if (!pool) return;
  const antigo = pool;
  pool = null;
  preparo = null;
  await antigo.end();
}

module.exports = { ativo, preparar, consultar, fechar, precisaSsl };
