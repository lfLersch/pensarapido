'use strict';

/*
 * Inventario das imagens em public/img.
 *
 * Serve para responder tres coisas antes de criar pergunta:
 *   1. quais arquivos existem na pasta;
 *   2. quais ja estao ligados a alguma pergunta;
 *   3. quais estao sobrando, esperando virar pergunta.
 *
 *   npm run imagens-locais
 */

const fs = require('fs');
const path = require('path');
const { CATEGORIAS, QUESTOES } = require('../server/questions');

const PASTA = path.join(__dirname, '..', 'public', 'img');
const EXTENSOES = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'];

if (!fs.existsSync(PASTA)) {
  fs.mkdirSync(PASTA, { recursive: true });
  console.log('criei public/img — coloque as imagens ai dentro');
}

const arquivos = fs.readdirSync(PASTA)
  .filter((f) => EXTENSOES.includes(path.extname(f).toLowerCase()))
  .sort();

// Quais caminhos locais ja aparecem no banco.
const emUso = new Map(); // arquivo -> [respostas]
for (const categoria of CATEGORIAS) {
  for (const q of QUESTOES[categoria.id] || []) {
    if (!q.imagem || q.imagem.startsWith('http')) continue;
    const nome = path.basename(q.imagem);
    if (!emUso.has(nome)) emUso.set(nome, []);
    emUso.get(nome).push(`${categoria.id}: ${q.resposta}`);
  }
}

const ligados = arquivos.filter((f) => emUso.has(f));
const soltos = arquivos.filter((f) => !emUso.has(f));
const quebrados = [...emUso.keys()].filter((f) => !arquivos.includes(f));

console.log(`pasta: public/img`);
console.log(`  arquivos:        ${arquivos.length}`);
console.log(`  ja em perguntas: ${ligados.length}`);
console.log(`  sobrando:        ${soltos.length}`);

if (soltos.length) {
  console.log('\nsem pergunta ainda:');
  for (const f of soltos) {
    const tamanho = (fs.statSync(path.join(PASTA, f)).size / 1024).toFixed(0);
    console.log(`  ${f}  (${tamanho} KB)`);
  }
}

if (ligados.length) {
  console.log('\nja ligados:');
  for (const f of ligados) console.log(`  ${f}  ->  ${emUso.get(f).join(' | ')}`);
}

// Pergunta apontando para arquivo que nao existe quebra a imagem em partida.
if (quebrados.length) {
  console.log(`\nATENCAO — pergunta aponta para arquivo que nao esta na pasta (${quebrados.length}):`);
  for (const f of quebrados) console.log(`  ${f}  ->  ${emUso.get(f).join(' | ')}`);
  process.exit(1);
}
