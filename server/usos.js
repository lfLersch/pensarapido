'use strict';

/**
 * Quantas vezes cada pergunta já entrou em jogo.
 *
 * Serve para uma coisa só: **espalhar o sorteio**. Dentro de uma partida as
 * perguntas não se repetem (a sala guarda o que já caiu), mas a partida
 * seguinte começa de uma fila embaralhada do zero — e é aí que as mesmas
 * perguntas voltavam, ainda mais nas categorias magras.
 *
 * A regra é a do rodízio estrito: **quem saiu menos vem sempre antes**. Uma
 * pergunta com contador 1 só volta quando todas as do grupo chegarem a 1; até
 * lá, sorteia-se só entre as que estão no piso. Como quem joga costuma ser a
 * mesma turma, ver de novo uma pergunta antes de passar pelo banco inteiro é
 * pior do que qualquer outra coisa que o sorteio tente equilibrar.
 *
 * (Antes era um peso: quem já tinha saído só perdia chance, e com um banco
 * grande isso ainda deixava as mesmas voltarem de uma partida para a outra.)
 *
 * Isto é diferente de `dificuldade.js`, que também tem um `vezes`: lá o
 * contador só anda nas rodadas que alimentam a dificuldade (leilão e Mais ou
 * Menos Pontos ficam de fora, de propósito). Aqui conta toda vez que a
 * pergunta entrou, que é o que o rodízio precisa saber.
 */

const fs = require('fs');
const path = require('path');
const banco = require('./banco');

// Os testes apontam para um arquivo temporario: senao gravam no contador de
// verdade e deixam o rodizio local torto.
const ARQUIVO = process.env.USOS_ARQUIVO || path.join(__dirname, 'dados', 'usos.json');
const SALVAR_APOS = 5000; // junta as escritas em disco a cada 5s

/** @type {Map<string, number>} id da pergunta -> quantas vezes ja entrou */
const usos = new Map();
/** Com banco, so vai para la o que mudou desde a ultima gravacao. */
const sujos = new Set();
let pendente = null;

/* ------------------------------ Persistência ------------------------------ */

function lerArquivo() {
  try {
    const bruto = JSON.parse(fs.readFileSync(ARQUIVO, 'utf8'));
    for (const [id, vezes] of Object.entries(bruto)) {
      if (Number.isFinite(vezes) && vezes > 0) usos.set(id, vezes);
    }
  } catch (erro) {
    if (erro.code !== 'ENOENT') {
      console.warn('Nao consegui ler os usos das perguntas, comecando do zero:', erro.message);
    }
  }
}

async function lerBanco() {
  try {
    const { rows } = await banco.consultar('SELECT id, vezes FROM perguntas_usos');
    // Soma em vez de sobrescrever: o que entrou em jogo antes da leitura
    // terminar nao se perde.
    for (const { id, vezes } of rows) usos.set(id, (usos.get(id) || 0) + vezes);
  } catch (erro) {
    console.warn('Nao consegui ler os usos do banco, comecando do zero:', erro.message);
  }
}

/** Resolve quando os contadores ja foram lidos (do banco ou do arquivo). */
function carregar() {
  if (banco.ativo()) return lerBanco();
  lerArquivo();
  return Promise.resolve();
}

function gravarArquivo() {
  try {
    fs.mkdirSync(path.dirname(ARQUIVO), { recursive: true });
    fs.writeFileSync(ARQUIVO, JSON.stringify(Object.fromEntries(usos)), 'utf8');
  } catch (erro) {
    console.warn('Nao consegui gravar os usos das perguntas:', erro.message);
  }
}

async function gravarBanco() {
  if (!sujos.size) return;
  const ids = [...sujos];
  sujos.clear();
  try {
    await banco.consultar(
      `INSERT INTO perguntas_usos (id, vezes)
       SELECT * FROM unnest($1::text[], $2::int[])
       ON CONFLICT (id) DO UPDATE SET vezes = EXCLUDED.vezes`,
      [ids, ids.map((id) => usos.get(id) || 0)]
    );
  } catch (erro) {
    for (const id of ids) sujos.add(id); // tenta de novo na proxima
    console.warn('Nao consegui gravar os usos no banco:', erro.message);
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

/* -------------------------------- Contagem -------------------------------- */

/** A pergunta entrou em jogo: o contador dela anda um. */
function registrar(id) {
  if (!id) return 0;
  const vezes = (usos.get(id) || 0) + 1;
  usos.set(id, vezes);
  sujos.add(id);
  agendarSalvamento();
  return vezes;
}

function usosDe(id) {
  return usos.get(id) || 0;
}

/**
 * Ordena de quem saiu menos para quem saiu mais, embaralhando os empates.
 *
 * Todas com o mesmo contador, isto é um embaralhamento uniforme. Com
 * contadores diferentes, nenhuma que saiu mais passa na frente de uma que
 * saiu menos.
 *
 * @param {T[]} itens
 * @param {(item:T)=>string} idDe  como achar o id de cada item
 * @returns {T[]} uma copia ordenada
 * @template T
 */
function embaralharPorUso(itens, idDe) {
  if (itens.length < 2) return itens.slice();
  return itens
    .map((item) => ({ item, vezes: usosDe(idDe(item)), sorte: Math.random() }))
    .sort((a, b) => a.vezes - b.vezes || a.sorte - b.sorte)
    .map((x) => x.item);
}

/**
 * Uma das menos usadas do grupo, sorteada entre elas, já contada como usada.
 * É o sorteio de uma pergunta só (Mais ou Menos Pontos, Maria vai com as
 * outras, Pergunta secreta...).
 */
function sortear(itens, idDe) {
  const item = embaralharPorUso(itens, idDe)[0];
  if (item !== undefined) registrar(idDe(item));
  return item;
}

/** Para o painel de inspecao: o que ja rodou e o quanto. */
function resumo() {
  return Object.fromEntries(usos);
}

const pronto = carregar();
// So vale para o arquivo: gravar no banco e assincrono e nao cabe no `exit`
// (o index.js grava antes de sair quando recebe SIGTERM).
process.on('exit', () => { if (pendente && !banco.ativo()) gravarArquivo(); });

module.exports = {
  registrar, usosDe, embaralharPorUso, sortear, resumo, salvar, pronto
};
