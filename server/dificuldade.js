'use strict';

/**
 * Dificuldade adaptativa das perguntas.
 *
 * Cada pergunta começa com a dificuldade escrita em questions.js (campo `dif`),
 * e o servidor vai ajustando esse número conforme as partidas acontecem:
 *
 *   - quanto MENOS gente acerta, mais a dificuldade SOBE;
 *   - quanto MAIS demoram para acertar, mais a dificuldade SOBE.
 *
 * A dificuldade NÃO altera a pontuação — ela existe para separar perguntas por
 * nível depois (montar salas "só fácil", "só difícil", equilibrar rodadas...).
 * Se um dia for usada para pontuar, o valor já está pronto aqui.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const banco = require('./banco');

const ARQUIVO = path.join(__dirname, 'dados', 'estatisticas.json');
const SALVAR_APOS = 5000; // junta as escritas em disco a cada 5s

// Quanto cada fator pesa na dificuldade observada numa rodada.
const PESO_ACERTO = 0.65;
const PESO_TEMPO = 0.35;

// Peso mínimo de uma rodada nova: garante que a dificuldade continue
// acompanhando mudanças mesmo depois de muitas partidas.
const PESO_MINIMO = 0.10;

// A dificuldade escrita em questions.js entra como se já viesse de algumas
// rodadas. Sem isso, a primeira partida sozinha jogaria o valor para o extremo
// (uma rodada em que ninguém acerta valeria 100 na hora).
const RODADAS_DA_BASE = 4;

const NIVEIS = [
  { ate: 30,  nome: 'Fácil',         cor: '#22c55e' },
  { ate: 55,  nome: 'Média',         cor: '#eab308' },
  { ate: 75,  nome: 'Difícil',       cor: '#f97316' },
  { ate: 101, nome: 'Muito difícil', cor: '#ef4444' }
];

/** @type {Map<string, {vezes:number, jogadores:number, acertos:number, dificuldade:number, tempoMedio:number}>} */
const estatisticas = new Map();
/** Com banco, so vai para la o que mudou desde a ultima gravacao. */
const sujos = new Set();
let pendente = null;

/* ------------------------------ Persistência ------------------------------ */

function lerArquivo() {
  try {
    const bruto = JSON.parse(fs.readFileSync(ARQUIVO, 'utf8'));
    for (const [id, dados] of Object.entries(bruto)) {
      if (dados && typeof dados.dificuldade === 'number') estatisticas.set(id, dados);
    }
  } catch (erro) {
    if (erro.code !== 'ENOENT') {
      console.warn('Não consegui ler as estatísticas, começando do zero:', erro.message);
    }
  }
}

async function lerBanco() {
  try {
    const { rows } = await banco.consultar(
      'SELECT id, vezes, jogadores, acertos, dificuldade, tempo_medio FROM perguntas_stats'
    );
    for (const linha of rows) {
      // Rodada registrada antes da leitura terminar ganha: ela ja partiu da base.
      if (estatisticas.has(linha.id)) continue;
      estatisticas.set(linha.id, {
        vezes: linha.vezes,
        jogadores: linha.jogadores,
        acertos: linha.acertos,
        dificuldade: linha.dificuldade,
        tempoMedio: linha.tempo_medio
      });
    }
  } catch (erro) {
    console.warn('Não consegui ler as estatísticas do banco, começando do zero:', erro.message);
  }
}

/** Resolve quando as estatísticas já foram lidas (do banco ou do arquivo). */
function carregar() {
  if (banco.ativo()) return lerBanco();
  lerArquivo();
  return Promise.resolve();
}

function gravarArquivo() {
  try {
    fs.mkdirSync(path.dirname(ARQUIVO), { recursive: true });
    fs.writeFileSync(ARQUIVO, JSON.stringify(Object.fromEntries(estatisticas), null, 2), 'utf8');
  } catch (erro) {
    console.warn('Não consegui gravar as estatísticas:', erro.message);
  }
}

async function gravarBanco() {
  if (!sujos.size) return;
  const ids = [...sujos];
  sujos.clear();
  const linhas = ids.map((id) => estatisticas.get(id));
  try {
    await banco.consultar(
      `INSERT INTO perguntas_stats (id, vezes, jogadores, acertos, dificuldade, tempo_medio)
       SELECT * FROM unnest($1::text[], $2::int[], $3::int[], $4::int[], $5::real[], $6::int[])
       ON CONFLICT (id) DO UPDATE SET
         vezes = EXCLUDED.vezes,
         jogadores = EXCLUDED.jogadores,
         acertos = EXCLUDED.acertos,
         dificuldade = EXCLUDED.dificuldade,
         tempo_medio = EXCLUDED.tempo_medio,
         atualizado_em = now()`,
      [
        ids,
        linhas.map((d) => d.vezes),
        linhas.map((d) => d.jogadores),
        linhas.map((d) => d.acertos),
        linhas.map((d) => d.dificuldade),
        linhas.map((d) => d.tempoMedio)
      ]
    );
  } catch (erro) {
    for (const id of ids) sujos.add(id); // tenta de novo na próxima
    console.warn('Não consegui gravar as estatísticas no banco:', erro.message);
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

/* -------------------------------- Consulta -------------------------------- */

/**
 * Identificador estável de uma pergunta (muda se o enunciado ou a resposta mudar).
 *
 * A resposta entra no id porque várias perguntas repetem o mesmo enunciado —
 * "De quem é essa bandeira?" e "Quem é este jogador?" aparecem dezenas de vezes.
 * Sem ela, todas dividiriam a mesma estatística.
 */
function idDe(categoria, pergunta, resposta = '') {
  return crypto.createHash('sha1')
    .update(`${categoria}|${pergunta}|${resposta}`)
    .digest('hex')
    .slice(0, 10);
}

function nivelDe(valor) {
  return NIVEIS.find((n) => valor < n.ate) || NIVEIS[NIVEIS.length - 1];
}

/** Dificuldade atual da pergunta: a aprendida, ou a base se ainda não jogou. */
function dificuldadeDe(id, base) {
  const dados = estatisticas.get(id);
  return dados ? dados.dificuldade : base;
}

function estatisticaDe(id) {
  return estatisticas.get(id) || null;
}

/* -------------------------------- Registro -------------------------------- */

/**
 * Registra o resultado de uma rodada e devolve a dificuldade atualizada.
 *
 * @param {string} id           id da pergunta
 * @param {number} base         dificuldade inicial escrita em questions.js
 * @param {object} rodada
 * @param {number} rodada.jogadores  quantas pessoas podiam responder
 * @param {number[]} rodada.tempos   ms de cada acerto (só de quem acertou)
 * @param {number} rodada.duracaoMs  tempo total que a pergunta ficou no ar
 */
function registrar(id, base, { jogadores, tempos, duracaoMs }) {
  if (!jogadores || jogadores < 1 || !duracaoMs) return dificuldadeDe(id, base);

  const acertos = tempos.length;
  const parteAcerto = 1 - acertos / jogadores;

  // Quem não acertou conta como se tivesse levado a rodada inteira.
  const parteTempo = acertos === 0
    ? 1
    : tempos.reduce((soma, ms) => soma + Math.min(1, ms / duracaoMs), 0) / acertos;

  const observada = 100 * (PESO_ACERTO * parteAcerto + PESO_TEMPO * parteTempo);

  const anterior = estatisticas.get(id) || {
    vezes: 0, jogadores: 0, acertos: 0, dificuldade: base, tempoMedio: 0
  };

  const peso = Math.max(PESO_MINIMO, 1 / (anterior.vezes + RODADAS_DA_BASE));
  const dificuldade = Math.min(100, Math.max(0,
    anterior.dificuldade + (observada - anterior.dificuldade) * peso
  ));

  const somaTempos = anterior.tempoMedio * anterior.acertos + tempos.reduce((s, t) => s + t, 0);
  const totalAcertos = anterior.acertos + acertos;

  estatisticas.set(id, {
    vezes: anterior.vezes + 1,
    jogadores: anterior.jogadores + jogadores,
    acertos: totalAcertos,
    dificuldade: Math.round(dificuldade * 10) / 10,
    tempoMedio: totalAcertos ? Math.round(somaTempos / totalAcertos) : 0
  });

  sujos.add(id);
  agendarSalvamento();
  return estatisticas.get(id).dificuldade;
}

/** Tudo que já foi aprendido, para inspeção via /api/dificuldades. */
function resumo(perguntasPorId) {
  const linhas = [];
  for (const [id, meta] of perguntasPorId) {
    const dados = estatisticas.get(id);
    const valor = dados ? dados.dificuldade : meta.base;
    linhas.push({
      id,
      categoria: meta.categoria,
      pergunta: meta.pergunta,
      base: meta.base,
      dificuldade: valor,
      nivel: nivelDe(valor).nome,
      vezes: dados ? dados.vezes : 0,
      taxaAcerto: dados && dados.jogadores ? Math.round((dados.acertos / dados.jogadores) * 100) : null,
      tempoMedioMs: dados ? dados.tempoMedio : null
    });
  }
  return linhas.sort((a, b) => b.dificuldade - a.dificuldade);
}

const pronto = carregar();
// So vale para o arquivo: gravar no banco e assincrono e nao cabe no `exit`
// (o index.js grava antes de sair quando recebe SIGTERM).
process.on('exit', () => { if (pendente && !banco.ativo()) gravarArquivo(); });

module.exports = {
  idDe, registrar, dificuldadeDe, estatisticaDe, nivelDe, resumo, salvar, pronto, NIVEIS
};
