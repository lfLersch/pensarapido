'use strict';

/**
 * Senso Comum: o que a mesa respondeu no Maria vai com as outras.
 *
 * Cada rodada do Maria grava o top 3 de cada pessoa, por pergunta. Com isso
 * sai a estatistica do Senso Comum: o 1o lugar pesa 4, o 2o pesa 3 e o 3o
 * pesa 2, e o quadro e o peso de cada coisa em porcentagem — a soma e sempre
 * 100. Quem disse "azul, preto, branco" e quem disse "vermelho, azul, preto"
 * dao azul 7, preto 5, vermelho 4 e branco 2: 39%, 28%, 22% e 11%.
 *
 * Uma pergunta so entra no jogo com MIN_PESSOAS_SENSO respostas: com duas ou
 * tres pessoas a "estatistica" seria a opiniao de alguem.
 *
 * Grava como os outros contadores: num arquivo no PC, no Postgres quando
 * existe DATABASE_URL (no Render o disco zera a cada deploy).
 */

const fs = require('fs');
const path = require('path');
const banco = require('./banco');
const { mesmaCoisa, normalizar } = require('./comparar');

const ARQUIVO = process.env.SENSO_ARQUIVO || path.join(__dirname, 'dados', 'senso.json');
const SALVAR_APOS = 5000;
const PESOS_SENSO = [4, 3, 2];          // 1o, 2o e 3o lugar
const MIN_PESSOAS_SENSO = 7;
// Uma pergunta muito jogada nao cresce sem fim: ficam as respostas mais novas.
const MAX_LISTAS = 400;
const MAX_LETRAS = 40;

/** @type {Map<string, string[][]>} pergunta -> top 3 de cada pessoa */
const respostas = new Map();
const sujos = new Set();
let pendente = null;

/* ------------------------------ Persistencia ------------------------------ */

const limparLista = (lista) => (Array.isArray(lista) ? lista : [])
  .slice(0, PESOS_SENSO.length)
  .map((t) => (typeof t === 'string' ? t.replace(/\s+/g, ' ').trim().slice(0, MAX_LETRAS) : ''));

function guardar(pergunta, listas) {
  const ja = respostas.get(pergunta) || [];
  const todas = ja.concat(listas.map(limparLista).filter((l) => l.some(Boolean)));
  respostas.set(pergunta, todas.slice(-MAX_LISTAS));
}

function lerArquivo() {
  try {
    const bruto = JSON.parse(fs.readFileSync(ARQUIVO, 'utf8'));
    for (const [pergunta, listas] of Object.entries(bruto)) {
      if (Array.isArray(listas)) guardar(pergunta, listas);
    }
  } catch (erro) {
    if (erro.code !== 'ENOENT') console.warn('Nao consegui ler o Senso Comum, comecando do zero:', erro.message);
  }
}

/** So grava no banco depois de ler: gravar sem ter lido apagaria as respostas. */
let lido = !banco.ativo();

async function lerBanco() {
  const { rows } = await banco.consultar('SELECT pergunta, listas FROM senso_respostas');
  // Junta em vez de sobrescrever: o que foi gravado antes da leitura fica.
  for (const { pergunta, listas } of rows) {
    const novas = respostas.get(pergunta) || [];
    respostas.delete(pergunta);
    guardar(pergunta, listas || []);
    guardar(pergunta, novas);
  }
  lido = true;
  if (sujos.size) agendarSalvamento();
}

function carregar() {
  if (banco.ativo()) return banco.lerComInsistencia('as respostas do Senso Comum', lerBanco);
  lerArquivo();
  return Promise.resolve();
}

function gravarArquivo() {
  try {
    fs.mkdirSync(path.dirname(ARQUIVO), { recursive: true });
    fs.writeFileSync(ARQUIVO, JSON.stringify(Object.fromEntries(respostas)), 'utf8');
  } catch (erro) {
    console.warn('Nao consegui gravar o Senso Comum:', erro.message);
  }
}

async function gravarBanco() {
  if (!sujos.size || !lido) return;
  const perguntas = [...sujos];
  sujos.clear();
  try {
    await banco.consultar(
      `INSERT INTO senso_respostas (pergunta, listas)
       SELECT p, l::jsonb FROM unnest($1::text[], $2::text[]) AS t(p, l)
       ON CONFLICT (pergunta) DO UPDATE SET listas = EXCLUDED.listas, atualizado_em = now()`,
      [perguntas, perguntas.map((p) => JSON.stringify(respostas.get(p) || []))]
    );
  } catch (erro) {
    for (const p of perguntas) sujos.add(p);
    console.warn('Nao consegui gravar o Senso Comum no banco:', erro.message);
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

/**
 * Uma rodada do Maria acabou: o top 3 de cada um entra na conta da pergunta.
 * @param {string} pergunta
 * @param {string[][]} listas o top de cada pessoa (so os 3 primeiros contam)
 */
function registrar(pergunta, listas) {
  if (!pergunta || !Array.isArray(listas)) return 0;
  const antes = (respostas.get(pergunta) || []).length;
  guardar(pergunta, listas);
  const depois = respostas.get(pergunta).length;
  if (depois !== antes || antes >= MAX_LISTAS) {
    sujos.add(pergunta);
    agendarSalvamento();
  }
  return depois;
}

/** Quantas pessoas ja responderam cada pergunta. */
function pessoasDe(pergunta) {
  return (respostas.get(pergunta) || []).length;
}

/** As perguntas que ja tem gente bastante para virar quadro. */
function prontas() {
  return [...respostas.keys()].filter((p) => pessoasDe(p) >= MIN_PESSOAS_SENSO);
}

/**
 * Quanta gente ja respondeu cada pergunta, da mais respondida para a menos.
 * So a contagem: as respostas sao o proprio jogo.
 */
function resumo() {
  return [...respostas.keys()]
    .map((pergunta) => ({ pergunta, pessoas: pessoasDe(pergunta), pronta: pessoasDe(pergunta) >= MIN_PESSOAS_SENSO }))
    .sort((a, b) => b.pessoas - a.pessoas || a.pergunta.localeCompare(b.pergunta));
}

/** A pergunta mais perto de ficar pronta: { pergunta, pessoas } ou null. */
function maisPerto() {
  let melhor = null;
  for (const pergunta of respostas.keys()) {
    const pessoas = pessoasDe(pergunta);
    if (!melhor || pessoas > melhor.pessoas) melhor = { pergunta, pessoas };
  }
  return melhor;
}

/* ------------------------------- Estatistica ------------------------------ */

/**
 * Porcentagens inteiras que somam 100, o mais perto possivel das de verdade
 * (maior resto: cada um leva o piso, e os pontos que faltam vao para quem
 * ficou com a maior sobra).
 */
function inteirosQueSomam100(valores) {
  const total = valores.reduce((s, v) => s + v, 0);
  if (!total) return valores.map(() => 0);
  const exatos = valores.map((v) => (v / total) * 100);
  const pisos = exatos.map(Math.floor);
  let falta = 100 - pisos.reduce((s, v) => s + v, 0);
  const ordem = exatos.map((v, i) => [v - pisos[i], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (const [, i] of ordem) {
    if (falta <= 0) break;
    pisos[i] += 1;
    falta -= 1;
  }
  return pisos;
}

/**
 * O quadro de uma pergunta, da resposta mais forte para a mais fraca.
 *
 * Cada resposta junta as grafias que sao a mesma coisa (`mesmaCoisa`, a regua
 * de 80% do Maria) e aparece na grafia mais escrita. `porcento` e o inteiro
 * da tela (a coluna soma 100); `pontos` e a porcentagem dividida por 10,
 * arredondada — e acertar vale pelo menos 1.
 *
 * @param {string[][]} listas
 * @returns {{ texto:string, formas:string[], peso:number, porcento:number, pontos:number }[]}
 */
function quadroDe(listas) {
  const grupos = [];
  for (const lista of listas) {
    const vistos = new Set();   // a mesma coisa duas vezes no top conta uma
    limparLista(lista).forEach((t, k) => {
      if (!t) return;
      let grupo = grupos.find((g) => mesmaCoisa(g.chave, t));
      if (!grupo) grupos.push(grupo = { chave: t, peso: 0, formas: new Map() });
      if (vistos.has(grupo)) return;
      vistos.add(grupo);
      grupo.peso += PESOS_SENSO[k];
      const forma = normalizar(t);
      const ja = grupo.formas.get(forma);
      grupo.formas.set(forma, { texto: ja ? ja.texto : t, vezes: (ja ? ja.vezes : 0) + 1 });
    });
  }

  grupos.sort((a, b) => b.peso - a.peso);
  const porcentos = inteirosQueSomam100(grupos.map((g) => g.peso));
  const total = grupos.reduce((s, g) => s + g.peso, 0);
  return grupos.map((g, i) => {
    const formas = [...g.formas.values()].sort((x, y) => y.vezes - x.vezes || y.texto.length - x.texto.length);
    const exato = (g.peso / total) * 100;
    return {
      texto: formas[0].texto,
      formas: formas.map((f) => f.texto),
      peso: g.peso,
      porcento: porcentos[i],
      pontos: Math.max(1, Math.round(exato / 10))
    };
  });
}

/** O quadro da pergunta como ela esta agora. */
function quadroDaPergunta(pergunta) {
  return quadroDe(respostas.get(pergunta) || []);
}

/** Qual resposta do quadro um chute acerta (-1: nenhuma). A mais forte ganha. */
function respostaDoChute(quadro, chute) {
  if (!chute) return -1;
  return quadro.findIndex((r) => r.formas.some((f) => mesmaCoisa(f, chute)));
}

/** So para os testes: comecar do zero, sem tocar no arquivo. */
function _zerar() {
  respostas.clear();
  sujos.clear();
  if (pendente) clearTimeout(pendente);
  pendente = null;
}

const pronto = carregar();
process.on('exit', () => { if (pendente && !banco.ativo()) gravarArquivo(); });

module.exports = {
  registrar, pessoasDe, prontas, maisPerto, resumo, quadroDe, quadroDaPergunta, respostaDoChute,
  inteirosQueSomam100, salvar, pronto, _zerar,
  PESOS_SENSO, MIN_PESSOAS_SENSO
};
