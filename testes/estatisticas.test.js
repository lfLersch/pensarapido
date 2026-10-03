'use strict';

/*
 * A aba Estatisticas.
 *
 * Para cada pergunta: quantas vezes caiu (o contador do rodizio), quanto a
 * sala acerta e em quanto tempo (o que a dificuldade ja guardava). Com filtro,
 * busca, ordem e paginas — e sem a resposta, para a aba nao virar cola.
 */

const { consultar, lerFiltros } = require('../server/estatisticas.js');
const { indicePerguntas } = require('../server/sala.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(62), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

/* Um banco pequeno, com os numeros na mao do teste. */
const pergunta = (categoria, texto, extra = {}) => ({ categoria, pergunta: texto, resposta: 'segredo', base: 40, sub: null, imagem: null, audio: null, ...extra });
const indice = new Map([
  ['a', pergunta('geografia', 'Qual e a capital da Australia?', { sub: 'lugares' })],
  ['b', pergunta('geografia', 'Que pais e este, destacado no mapa?', { sub: 'mapas', imagem: 'https://exemplo/mapa.png' })],
  ['c', pergunta('ciencia', 'Qual a classificacao botanica do morango?', { base: 70 })],
  ['d', pergunta('ciencia', 'Qual gas e o mais abundante no ar?')],
  ['e', pergunta('musica', 'Qual e o nome desta musica?', { audio: '/audio/trecho.mp3' })]
]);
const ESTATISTICAS = {
  // 3 de 4 acertaram, em media 2 s
  a: { vezes: 2, jogadores: 4, acertos: 3, dificuldade: 22, tempoMedio: 2000 },
  // 1 de 10, em 9 s
  b: { vezes: 5, jogadores: 10, acertos: 1, dificuldade: 81, tempoMedio: 9000 },
  // caiu, mas ninguem acertou: tem acerto (0%) e nao tem tempo
  c: { vezes: 1, jogadores: 3, acertos: 0, dificuldade: 75, tempoMedio: 0 }
};
const USOS = { a: 4, b: 5, c: 1, e: 2 }; // e: so caiu no Leilao, sem estatistica
const fontes = { estatisticaDe: (id) => ESTATISTICAS[id] || null, usosDe: (id) => USOS[id] || 0 };
const ver = (query) => consultar(indice, query, fontes);
const ids = (r) => r.linhas.map((l) => l.id);

/* ---------------- 1. Os numeros de cada pergunta ---------------- */
{
  const r = ver({ ordem: 'vezes' });
  const linha = (id) => r.linhas.find((l) => l.id === id);
  conferir('vezes vem do rodizio, que conta toda entrada', linha('a').vezes, 4);
  conferir('acerto: 3 de 4 respostas', [linha('a').acerto, linha('a').acertos, linha('a').respostas], [75, 3, 4]);
  conferir('tempo medio do acerto em ms', linha('a').tempoMedioMs, 2000);
  conferir('ninguem acertou: 0% de acerto e sem tempo', [linha('c').acerto, linha('c').tempoMedioMs], [0, null]);
  conferir('nunca caiu: zero vezes, sem acerto e sem tempo', [linha('d').vezes, linha('d').acerto, linha('d').tempoMedioMs], [0, null, null]);
  conferir('  e a dificuldade e a escrita no banco', linha('d').dificuldade, 40);
  conferir('so caiu onde nao mede: vezes conta, acerto nao', [linha('e').vezes, linha('e').acerto], [2, null]);
  conferir('dificuldade aprendida e o nivel dela', [linha('b').dificuldade, linha('b').nivel], [81, 'Muito difícil']);
  conferir('a imagem e o audio vao junto', [linha('b').imagem, linha('e').audio], ['https://exemplo/mapa.png', '/audio/trecho.mp3']);
  conferir('a parte da categoria vai junto', [linha('a').sub, linha('d').sub], ['lugares', null]);
  conferir('a resposta NAO vai', r.linhas.some((l) => 'resposta' in l), false);
}

/* ---------------- 2. O rodizio chegou depois ---------------- */
{
  const r = consultar(indice, {}, { estatisticaDe: fontes.estatisticaDe, usosDe: () => 0 });
  conferir('sem rodizio, vale o que a dificuldade contou', r.linhas.find((l) => l.id === 'b').vezes, 5);
}

/* ---------------- 3. Os totais do recorte ---------------- */
{
  const { resumo } = ver({});
  conferir('quantas perguntas, quantas ja cairam', [resumo.perguntas, resumo.feitas], [5, 4]);
  conferir('vezes somadas', resumo.vezes, 12);
  // 4 acertos em 17 respostas: a media e das respostas, nao das perguntas
  conferir('acerto pesa pelo numero de respostas', [resumo.acertos, resumo.respostas, resumo.acerto], [4, 17, 24]);
  // (3 x 2000 + 1 x 9000) / 4
  conferir('tempo pesa pelo numero de acertos', resumo.tempoMedioMs, 3750);
  conferir('o resumo e do recorte todo, nao da pagina', ver({ tamanho: '1' }).resumo.perguntas, 5);
  conferir('recorte sem resposta: sem acerto e sem tempo',
    [ver({ categoria: 'musica' }).resumo.acerto, ver({ categoria: 'musica' }).resumo.tempoMedioMs], [null, null]);
}

/* ---------------- 4. Filtros e busca ---------------- */
{
  conferir('categoria', ids(ver({ categoria: 'ciencia' })).sort(), ['c', 'd']);
  conferir('parte da categoria', ids(ver({ categoria: 'geografia', sub: 'mapas' })), ['b']);
  conferir('busca sem acento e sem maiuscula', ids(ver({ busca: 'AUSTRÁLIA' })), ['a']);
  conferir('busca com varias palavras: todas precisam estar', ids(ver({ busca: 'qual morango' })), ['c']);
  conferir('a busca nao olha a resposta', ver({ busca: 'segredo' }).total, 0);
  conferir('so as que ja cairam', ids(ver({ feitas: '1' })).sort(), ['a', 'b', 'c', 'e']);
  conferir('categoria que nao existe: nada', ver({ categoria: 'xyz' }).total, 0);
}

/* ---------------- 5. Ordens ---------------- */
{
  conferir('mais feitas', ids(ver({ ordem: 'vezes' })), ['b', 'a', 'e', 'c', 'd']);
  conferir('menos feitas', ids(ver({ ordem: 'menos-vezes' })), ['d', 'c', 'e', 'a', 'b']);
  conferir('mais acertadas (sem resposta no fim)', ids(ver({ ordem: 'acerto' })), ['a', 'b', 'c', 'e', 'd']);
  conferir('menos acertadas (sem resposta no fim tambem)', ids(ver({ ordem: 'menos-acerto' })), ['c', 'b', 'a', 'e', 'd']);
  conferir('acerto mais rapido (sem tempo no fim)', ids(ver({ ordem: 'rapidas' })), ['a', 'b', 'e', 'c', 'd']);
  conferir('acerto mais lento (sem tempo no fim tambem)', ids(ver({ ordem: 'lentas' })), ['b', 'a', 'e', 'c', 'd']);
  conferir('mais dificeis (empate: a mais feita antes)', ids(ver({ ordem: 'dificuldade' })), ['b', 'c', 'e', 'd', 'a']);
  conferir('ordem que nao existe vira a padrao', ver({ ordem: 'toString' }).ordem, 'vezes');
}

/* ---------------- 6. Paginas ---------------- */
{
  const paginas = [0, 1, 2].map((p) => ids(ver({ ordem: 'menos-acerto', tamanho: '2', pagina: String(p) })));
  conferir('paginas de 2: nada repete, nada falta', paginas, [['c', 'b'], ['a', 'e'], ['d']]);
  conferir('o total e do recorte todo', ver({ tamanho: '2' }).total, 5);
  conferir('tamanho tem teto', lerFiltros({ tamanho: '5000' }).tamanho, 100);
  conferir('lixo na URL vira o padrao',
    [lerFiltros({ tamanho: 'abc', pagina: '-3' }).tamanho, lerFiltros({ pagina: '-3' }).pagina], [50, 0]);
  conferir('parametro repetido na URL e ignorado', lerFiltros({ busca: ['a', 'b'] }).busca, '');
}

/* ---------------- 7. O banco de verdade ---------------- */
{
  const real = indicePerguntas();
  const r = consultar(real, { tamanho: '100' });
  conferir('todas as perguntas do jogo entram', r.total, real.size);
  conferir('nenhuma linha leva a resposta', r.linhas.some((l) => 'resposta' in l), false);
  const comImagem = consultar(real, { categoria: 'bandeiras', tamanho: '1' }).linhas[0];
  conferir('bandeira leva a imagem', typeof comImagem.imagem, 'string');
  const comAudio = consultar(real, { categoria: 'ouvir', tamanho: '1' }).linhas[0];
  conferir('musica para ouvir leva o audio', typeof comAudio.audio, 'string');
  conferir('as partes da categoria entram no indice',
    consultar(real, { categoria: 'ciencia', sub: 'botanica' }).total > 0, true);
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
