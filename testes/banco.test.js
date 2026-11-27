'use strict';

/*
 * Os contadores sobrevivem a um reinicio quando ha banco.
 *
 * No Render o disco zera a cada deploy: com `DATABASE_URL` o rodizio e a
 * dificuldade vao para o Postgres e voltam na subida seguinte. Sem banco nada
 * muda — os arquivos em server/dados continuam valendo.
 *
 * A parte com banco so roda com `TESTE_DATABASE_URL` apontando para um
 * Postgres descartavel (as tabelas de la sao apagadas antes do teste).
 */

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(58), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

const MODULOS = ['banco', 'usos', 'dificuldade'].map((m) => require.resolve(`../server/${m}.js`));

/** Carrega os modulos do zero, como numa subida nova do servidor. */
function subir(url) {
  for (const m of MODULOS) delete require.cache[m];
  if (url) process.env.DATABASE_URL = url;
  else delete process.env.DATABASE_URL;
  return {
    banco: require('../server/banco.js'),
    usos: require('../server/usos.js'),
    dificuldade: require('../server/dificuldade.js')
  };
}

async function main() {
  /* ------------------------- SSL: local sem, nuvem com ------------------------- */

  const { precisaSsl } = subir(null).banco;
  conferir('localhost fala sem SSL', precisaSsl('postgresql://u:s@localhost:5432/x'), false);
  conferir('sslmode=disable desliga o SSL',
    precisaSsl('postgresql://u:s@db.exemplo.com/x?sslmode=disable'), false);
  conferir('Supabase fala com SSL',
    precisaSsl('postgresql://postgres.abc:s@aws-0-sa-east-1.pooler.supabase.com:5432/postgres'), true);

  /* --------------------------- Sem banco: arquivos --------------------------- */

  const semBanco = subir(null);
  conferir('sem DATABASE_URL o banco fica desligado', semBanco.banco.ativo(), false);
  await semBanco.usos.pronto;
  conferir('sem banco os modulos sobem normalmente', typeof semBanco.usos.usosDe('x'), 'number');

  /* ------------------- Banco fora do ar na subida: nao apaga ------------------- */

  {
    // Um servidor que sobe sem conseguir ler comeca do zero. Se gravasse
    // assim mesmo, escreveria "vezes = 1" por cima do historico do banco.
    process.env.BANCO_ESPERA_MS = '5';
    for (const m of MODULOS) delete require.cache[m];
    process.env.DATABASE_URL = 'postgresql://u:s@127.0.0.1:1/x?sslmode=disable';
    const falso = require('../server/banco.js');
    let foraDoAr = true;
    const gravados = [];
    falso.consultar = async (sql, parametros) => {
      if (/^\s*SELECT/i.test(sql)) {
        if (foraDoAr) throw new Error('banco fora do ar');
        return { rows: /perguntas_usos/.test(sql) ? [{ id: 'p1', vezes: 5 }] : [] };
      }
      gravados.push(parametros);
      return { rows: [] };
    };
    const usosFora = require('../server/usos.js');
    const subiu = await usosFora.pronto;
    conferir('com o banco fora, o jogo sobe assim mesmo', subiu, false);
    usosFora.registrar('p1');
    await usosFora.salvar();
    conferir('  e nao grava nada por cima do banco', gravados.length, 0);

    // O banco volta: a leitura de fundo junta o jogado com o historico.
    foraDoAr = false;
    for (let i = 0; i < 100 && usosFora.usosDe('p1') < 6; i++) await new Promise((r) => setTimeout(r, 10));
    conferir('quando o banco volta, soma o historico com o jogado', usosFora.usosDe('p1'), 6);
    await usosFora.salvar();
    conferir('  e so entao grava, ja com a soma', gravados.map((p) => p[1]), [[6]]);
    delete process.env.BANCO_ESPERA_MS;
  }

  /* --------------------------- Com banco: reinicio --------------------------- */

  const url = process.env.TESTE_DATABASE_URL;
  if (!url) {
    console.log('pulado  parte com banco (defina TESTE_DATABASE_URL para rodar)');
  } else {
    const limpeza = subir(url);
    await limpeza.banco.consultar('DELETE FROM perguntas_usos; DELETE FROM perguntas_stats;');
    await limpeza.banco.fechar();

    const primeira = subir(url);
    await Promise.all([primeira.usos.pronto, primeira.dificuldade.pronto]);
    primeira.usos.registrar('p1');
    primeira.usos.registrar('p1');
    primeira.usos.registrar('p2');
    const dif = primeira.dificuldade.registrar('p1', 50,
      { jogadores: 4, tempos: [3000], duracaoMs: 15000 });
    await Promise.all([primeira.usos.salvar(), primeira.dificuldade.salvar()]);
    await primeira.banco.fechar();

    const segunda = subir(url);
    await Promise.all([segunda.usos.pronto, segunda.dificuldade.pronto]);
    conferir('usos voltam do banco depois do reinicio',
      [segunda.usos.usosDe('p1'), segunda.usos.usosDe('p2')], [2, 1]);
    conferir('dificuldade volta do banco depois do reinicio',
      segunda.dificuldade.dificuldadeDe('p1', 50), dif);
    conferir('estatistica volta inteira',
      segunda.dificuldade.estatisticaDe('p1'),
      { vezes: 1, jogadores: 4, acertos: 1, dificuldade: dif, tempoMedio: 3000 });

    // Gravar de novo so atualiza a linha, nao duplica.
    segunda.usos.registrar('p1');
    await segunda.usos.salvar();
    const { rows } = await segunda.banco.consultar(
      "SELECT vezes FROM perguntas_usos WHERE id = 'p1'");
    conferir('segunda gravacao atualiza a mesma linha', rows.map((r) => r.vezes), [3]);

    // A API publica do Supabase nao pode ler nem apagar nada.
    const rls = await segunda.banco.consultar(
      `SELECT relname FROM pg_class
        WHERE relname IN ('perguntas_usos', 'perguntas_stats', 'jogadores', 'vinculos')
          AND relrowsecurity ORDER BY relname`);
    conferir('RLS ligado nas quatro tabelas', rls.rows.map((r) => r.relname),
      ['jogadores', 'perguntas_stats', 'perguntas_usos', 'vinculos']);
    await segunda.banco.fechar();
  }

  delete process.env.DATABASE_URL;
  console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo.');
  process.exit(falhas ? 1 : 0);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
