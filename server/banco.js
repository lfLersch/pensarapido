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

  CREATE TABLE IF NOT EXISTS vinculos (
    cliente text PRIMARY KEY,
    conta   text NOT NULL
  );

  -- Senso Comum: o top 3 de cada pessoa em cada pergunta do Maria vai com as outras.
  CREATE TABLE IF NOT EXISTS senso_respostas (
    pergunta      text PRIMARY KEY,
    listas        jsonb NOT NULL,
    atualizado_em timestamptz NOT NULL DEFAULT now()
  );

  -- No Supabase, toda tabela do schema public aparece na API pública dele
  -- (anon/authenticated). O jogo não usa essa API: o servidor fala direto com
  -- o Postgres, como dono das tabelas, e o RLS não vale para o dono. Ligado e
  -- sem nenhuma política, ele só tranca a porta da API.
  ALTER TABLE perguntas_usos  ENABLE ROW LEVEL SECURITY;
  ALTER TABLE perguntas_stats ENABLE ROW LEVEL SECURITY;
  ALTER TABLE jogadores       ENABLE ROW LEVEL SECURITY;
  ALTER TABLE vinculos        ENABLE ROW LEVEL SECURITY;
  ALTER TABLE senso_respostas ENABLE ROW LEVEL SECURITY;
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

/* ------------------------------ Leitura segura ------------------------------ */

const TENTATIVAS_LEITURA = 4;
// Os testes encurtam as esperas com BANCO_ESPERA_MS.
const ESPERA_LEITURA_MS = Number(process.env.BANCO_ESPERA_MS) || 3000;   // 3s, 6s, 9s na subida
const INSISTIR_A_CADA_MS = Number(process.env.BANCO_ESPERA_MS) || 30000; // depois, de fundo

/**
 * Le os dados de um modulo, insistindo quando o banco nao responde.
 *
 * Quem chama so libera a GRAVACAO depois que `ler` deu certo. Isso importa:
 * as gravacoes escrevem o valor inteiro (`vezes = 3`, o perfil inteiro), e um
 * servidor que subisse sem ter lido comecaria do zero e, na primeira
 * gravacao, apagaria do banco o historico de todo mundo — o rodizio voltaria
 * a repetir pergunta, a dificuldade e os perfis zerariam.
 *
 * Na subida tenta algumas vezes; se o banco continuar fora, o jogo abre assim
 * mesmo (da para jogar) e a leitura segue tentando de fundo. Quando ela der
 * certo, o `ler` de cada modulo junta o que foi jogado nesse meio-tempo com
 * o que estava no banco.
 *
 * @param {string} nome    para o log ("os usos das perguntas")
 * @param {() => Promise<void>} ler  le e junta; tem que lancar se falhar
 * @returns {Promise<boolean>} resolve quando a subida pode seguir: true se leu
 */
function lerComInsistencia(nome, ler, opcoes = {}) {
  const tentativas = opcoes.tentativas ?? TENTATIVAS_LEITURA;
  const espera = opcoes.esperaMs ?? ESPERA_LEITURA_MS;
  const insistir = opcoes.insistirMs ?? INSISTIR_A_CADA_MS;
  const dormir = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

  return (async () => {
    for (let i = 1; i <= tentativas; i++) {
      try {
        await ler();
        return true;
      } catch (erro) {
        console.warn(`Nao consegui ler ${nome} do banco (tentativa ${i} de ${tentativas}):`, erro.message);
        if (i < tentativas) await dormir(espera * i);
      }
    }
    console.warn(`Sem ${nome} por enquanto: o jogo abre, mas nada disso vai para o banco ate a leitura dar certo.`);
    const tentar = () => ler()
      .then(() => console.log(`Li ${nome} do banco: a gravacao esta liberada.`))
      .catch(() => setTimeout(tentar, insistir).unref());
    setTimeout(tentar, insistir).unref();
    return false;
  })();
}

async function fechar() {
  if (!pool) return;
  const antigo = pool;
  pool = null;
  preparo = null;
  await antigo.end();
}

module.exports = { ativo, preparar, consultar, fechar, precisaSsl, lerComInsistencia };
