'use strict';

/**
 * Quantas vezes cada pergunta já entrou em jogo.
 *
 * Serve para uma coisa só: **espalhar o sorteio**. Dentro de uma partida as
 * perguntas não se repetem (a sala guarda o que já caiu), mas a partida
 * seguinte começa de uma fila embaralhada do zero — e é aí que as mesmas
 * perguntas voltavam, ainda mais nas categorias magras.
 *
 * A regra é a do rodízio, não a da proibição: quem já saiu **perde peso** no
 * sorteio até as outras alcançarem. Uma pergunta com contador 1 num monte de
 * zeros entra com menos chance; quando todas estiverem em 1, todas voltam a
 * ter a mesma chance. O que conta é sempre a DISTÂNCIA para a menos usada do
 * grupo, nunca o número absoluto — senão, depois de muitas partidas, o banco
 * inteiro ficaria com pesos minúsculos e o sorteio viraria outra coisa.
 *
 * Isto é diferente de `dificuldade.js`, que também tem um `vezes`: lá o
 * contador só anda nas rodadas que alimentam a dificuldade (leilão e Mais ou
 * Menos Pontos ficam de fora, de propósito). Aqui conta toda vez que a
 * pergunta entrou, que é o que o rodízio precisa saber.
 */

const fs = require('fs');
const path = require('path');
const banco = require('./banco');

const ARQUIVO = path.join(__dirname, 'dados', 'usos.json');
const SALVAR_APOS = 5000; // junta as escritas em disco a cada 5s

/**
 * Quanto uma pergunta perde de peso por cada uso a mais que a menos usada.
 *
 * 0.55 dá um empurrão claro sem virar fila rígida: com um uso a mais ela entra
 * com pouco mais da metade da chance, com dois usos a mais com um terço. Ainda
 * pode sair — o que não pode é sair na mesma frequência de quem nunca saiu.
 */
const PESO_POR_USO_EXTRA = 0.55;

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
 * O peso de cada pergunta dentro de um grupo, de 0 a 1.
 *
 * Relativo à menos usada do grupo: a que está no piso vale 1, e cada uso a
 * mais multiplica por `PESO_POR_USO_EXTRA`. Todas empatadas, todas valem 1.
 */
function pesoDe(vezes, piso) {
  return PESO_POR_USO_EXTRA ** Math.max(0, vezes - piso);
}

/**
 * Embaralha dando a frente a quem saiu menos.
 *
 * É um sorteio, não uma ordenação: cada item tira uma chave aleatória
 * `-ln(u) / peso` e a lista sai ordenada por ela. Peso maior tende a chaves
 * menores, então quem saiu menos costuma vir antes — mas qualquer ordem
 * continua possível, e com todos os pesos iguais isto é exatamente um
 * embaralhamento uniforme.
 *
 * @param {T[]} itens
 * @param {(item:T)=>string} idDe  como achar o id de cada item
 * @returns {T[]} uma copia embaralhada
 * @template T
 */
function embaralharPorUso(itens, idDe) {
  if (itens.length < 2) return itens.slice();

  const vezes = itens.map((item) => usosDe(idDe(item)));
  const piso = Math.min(...vezes);

  return itens
    .map((item, i) => ({
      item,
      chave: -Math.log(1 - Math.random()) / pesoDe(vezes[i], piso)
    }))
    .sort((a, b) => a.chave - b.chave)
    .map((x) => x.item);
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
  registrar, usosDe, pesoDe, embaralharPorUso, resumo, salvar, pronto, PESO_POR_USO_EXTRA
};
