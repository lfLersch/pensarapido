'use strict';

const { avaliar, normalizar, distancia } = require('../server/comparar.js');

const casos = [
  // [palpite, resposta, aceitas, veredito esperado, comentário]
  ['Johnny Depp',      'Johnny Depp', ['Depp'], 'certo', 'exato'],
  ['johnny depp',      'Johnny Depp', ['Depp'], 'certo', 'minúsculas'],
  ['JOHNNYDEPP',       'Johnny Depp', ['Depp'], 'certo', 'sem espaço, maiúsculas'],
  ['Johny Depp',       'Johnny Depp', ['Depp'], 'quase', '1 erro em 10 letras = 10% exatos -> fronteira'],
  ['Johnny Deppp',     'Johnny Depp', ['Depp'], 'quase', '1 letra a mais = 10% exatos'],
  ['Alexander Flemming','Alexander Fleming', ['Fleming'], 'certo', '1 erro em 16 letras = 6%'],
  ['Depp',             'Johnny Depp', ['Depp'], 'certo', 'variante aceita'],
  ['Jonny Dep',        'Johnny Depp', ['Depp'], 'quase', '2 erros'],
  ['Brad Pitt',        'Johnny Depp', ['Depp'], 'chat',  'outra pessoa'],
  ['acho que é johnny depp', 'Johnny Depp', ['Depp'], 'quase', 'frase com a resposta = spoiler'],

  ['japao',            'Japão',  [], 'certo', 'sem acento'],
  ['Japão',            'Japão',  [], 'certo', 'com acento'],
  ['japau',            'Japão',  [], 'quase', '1 erro em 5 letras = 20%'],
  ['japaum',           'Japão',  [], 'chat',  '2 erros em 5 letras = 40%'],
  ['china',            'Japão',  [], 'chat',  'errado'],

  ['Holanda',          'Países Baixos', ['Holanda'], 'certo', 'apelido do país'],
  ['paises baixos',    'Países Baixos', ['Holanda'], 'certo', 'sem acento'],

  ['H2O',              'H2O', ['água'], 'certo', 'fórmula'],
  ['agua',             'H2O', ['água'], 'certo', 'variante'],
  ['água',             'H2O', ['água'], 'certo', 'variante com acento'],

  ['180',              '180°', ['180 graus'], 'certo', 'grau opcional'],
  ['180 graus',        '180°', ['180 graus'], 'certo', 'por extenso'],
  ['90',               '180°', ['180 graus'], 'chat',  'número errado'],

  ['60',               'R$ 60', ['60', '60 reais'], 'certo', 'só o número'],
  ['R$ 60',            'R$ 60', ['60', '60 reais'], 'certo', 'com cifrão'],

  ['Attack on Titan',  'Attack on Titan', ['Shingeki no Kyojin'], 'certo', 'exato'],
  ['shingeki no kyojin','Attack on Titan',['Shingeki no Kyojin'], 'certo', 'nome japonês'],

  ['boa noite galera', 'Camberra', ['Canberra'], 'chat', 'conversa comum'],
  ['alguem sabe?',     'Camberra', ['Canberra'], 'chat', 'conversa comum'],
  ['canberra',         'Camberra', ['Canberra'], 'certo', 'grafia inglesa'],
  ['camberra',         'Camberra', ['Canberra'], 'certo', 'grafia oficial'],
  ['canberra!!!',      'Camberra', ['Canberra'], 'certo', 'com pontuação'],

  ['5',                '5', [], 'certo', 'resposta de 1 dígito'],
  ['6',                '5', [], 'chat',  'número errado curto'],
  ['',                 '5', [], 'chat',  'vazio'],
  ['   ',              '5', [], 'chat',  'só espaço']
];

let falhas = 0;
for (const [palpite, resposta, aceitas, esperado, comentario] of casos) {
  const r = avaliar(palpite, resposta, aceitas);
  const ok = r.veredito === esperado;
  if (!ok) falhas++;
  console.log(
    (ok ? 'ok   ' : 'FALHA'),
    JSON.stringify(palpite).padEnd(24),
    '->', r.veredito.padEnd(9),
    '(' + Math.round(r.erro * 100) + '% erro)',
    ok ? '' : '<-- esperava ' + esperado,
    '·', comentario
  );
}

console.log('\nnormalizar("Países Baixos!") =', JSON.stringify(normalizar('Países Baixos!')));
console.log('distancia("gato","rato") =', distancia('gato', 'rato'));
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
