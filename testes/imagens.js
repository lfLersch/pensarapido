'use strict';

/*
 * Confere se toda imagem usada nas perguntas ainda carrega.
 *
 * As fotos de jogadores e as bandeiras vêm de servidores de terceiros
 * (Wikimedia Commons e flagcdn), então uma delas pode sair do ar sem aviso.
 * Este teste não roda junto com `npm test` porque depende da internet —
 * rode de vez em quando com `npm run checar-imagens`.
 *
 * O Wikimedia devolve 429 para clientes apressados, então aqui vai devagar:
 * duas conexões, pausa entre as requisições e nova tentativa quando toma 429.
 */

const { CATEGORIAS, QUESTOES } = require('../server/questions');

const AGENTE = 'PensaRapido/1.0 (jogo de perguntas; verificacao de links)';
const CONCORRENCIA = 2;
const PAUSA = 350;
const TENTATIVAS = 4;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

function todasAsImagens() {
  const lista = [];
  for (const categoria of CATEGORIAS) {
    for (const q of QUESTOES[categoria.id] || []) {
      if (q.imagem) lista.push({ categoria: categoria.id, alvo: q.resposta, url: q.imagem });
    }
  }
  return lista;
}

async function checar(item) {
  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    try {
      const resposta = await fetch(item.url, {
        method: 'HEAD',
        headers: { 'User-Agent': AGENTE, Accept: 'image/*' },
        signal: AbortSignal.timeout(20000)
      });

      if (resposta.status === 429) {          // pediu para ir mais devagar
        await dormir(2500 * tentativa);
        continue;
      }

      const tipo = resposta.headers.get('content-type') || '';
      return { ...item, ok: resposta.ok && tipo.startsWith('image/'), status: resposta.status, tipo };
    } catch (erro) {
      if (tentativa === TENTATIVAS) return { ...item, ok: false, status: 'ERRO: ' + erro.message };
      await dormir(1500 * tentativa);
    }
  }
  return { ...item, ok: false, status: '429 (o servidor seguiu recusando)' };
}

(async () => {
  const fila = todasAsImagens();
  const total = fila.length;
  const resultados = [];

  console.log(`Checando ${total} imagens (devagar, para não tomar 429)…\n`);

  await Promise.all(Array.from({ length: CONCORRENCIA }, async () => {
    while (fila.length) {
      resultados.push(await checar(fila.shift()));
      if (resultados.length % 25 === 0) console.log(`  ${resultados.length}/${total}`);
      await dormir(PAUSA);
    }
  }));

  const quebradas = resultados.filter((r) => !r.ok);

  console.log(`\nChecadas:  ${resultados.length}`);
  console.log(`OK:        ${resultados.length - quebradas.length}`);
  console.log(`Quebradas: ${quebradas.length}`);

  if (quebradas.length) {
    console.log('\nEstas precisam de uma imagem nova:\n');
    for (const r of quebradas) {
      console.log(`  [${r.status}] ${r.categoria} · ${r.alvo}`);
      console.log(`      ${r.url}`);
    }
    process.exit(1);
  }

  console.log('\nTodas as imagens estão no ar.');
})();
