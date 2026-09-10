'use strict';

/*
 * Sobrenome basta: "Messi" vale por "Lionel Messi".
 *
 * Isso foi pedido para jogadores de futebol e precisou ser pedido de novo:
 * cada lista nova nascia sem o sobrenome como variante, e 62% dos nomes
 * compostos das listas recusavam o sobrenome sozinho. Agora ele e gerado na
 * carga, e este teste reprova nome de pessoa que nao o aceite — a nao ser
 * que o sobrenome seja de mais de uma pessoa, ou esteja no enunciado.
 */

const { LISTAS, LISTAS_DE_PESSOAS, itemDe } = require('../server/escalada.js');
const { QUESTOES } = require('../server/questions.js');
const { avaliar, sobrenomesDe } = require('../server/comparar.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(58), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

/* ---------------- 1. o recorte do sobrenome ---------------- */
{
  const casos = [
    ['Lionel Messi', ['Messi']],
    ['Robert Downey Jr.', ['Downey Jr.']],      // sufixo de geracao vai junto
    ['Cafe Filho', []],                          // o sobrenome e o nome inteiro
    ['Pele', []],                                // uma palavra so
    ['Leonardo da Vinci', ['Vinci', 'da Vinci']],
    ['Deodoro da Fonseca', ['Fonseca', 'da Fonseca']],
    ['Costa e Silva', []],                       // 'X e Y': o ultimo nome sozinho e outra pessoa
    ['Claudinho e Buchecha', []],                // dupla nao tem sobrenome
    ['Dom Pedro I', ['Pedro I']]                 // numeral de rei nao e sobrenome
  ];
  for (const [nome, esperado] of casos) conferir(`sobrenome de ${nome}`, sobrenomesDe(nome), esperado);
}

/* ---------------- 2. listas de pessoas ---------------- */
{
  let compostos = 0;
  let aceitos = 0;
  const faltando = [];

  for (const lista of LISTAS) {
    if (lista.fixo || !LISTAS_DE_PESSOAS.test(lista.pergunta) || /duplas/i.test(lista.pergunta)) continue;
    const itens = lista.respostas.map(itemDe);

    itens.forEach((item, i) => {
      const [sobrenome] = sobrenomesDe(item.oficial);
      if (!sobrenome) return;
      compostos++;
      if (avaliar(sobrenome, item.oficial, item.variantes).veredito === 'certo') {
        aceitos++;
        return;
      }
      // So pode faltar se o sobrenome tambem acertaria outra pessoa da lista.
      const deOutro = itens.some((outro, j) => j !== i &&
        avaliar(sobrenome, outro.oficial, [...outro.variantes, ...sobrenomesDe(outro.oficial)]).veredito === 'certo');
      if (!deOutro) faltando.push(`${lista.pergunta}: ${item.oficial} (${sobrenome})`);
    });
  }

  console.log(`     ${aceitos} de ${compostos} nomes compostos aceitam o sobrenome sozinho`);
  conferir('nenhum nome recusa o sobrenome sem motivo', faltando.slice(0, 10), []);

  const jogador = LISTAS.find((l) => l.pergunta === 'Cite {n} jogadores nascidos na Argentina')
    .respostas.map(itemDe).find((i) => i.oficial === 'Lionel Messi');
  conferir('"Messi" vale na lista de argentinos',
    avaliar('Messi', jogador.oficial, jogador.variantes).veredito, 'certo');
}

/* ---------------- 3. banco de perguntas ---------------- */
{
  const acha = (categoria, trecho) => QUESTOES[categoria].find((q) => q.pergunta.includes(trecho));

  const neo = acha('cinema', 'Neo');
  conferir('"Reeves" vale por Keanu Reeves', avaliar('Reeves', neo.resposta, neo.aceita || []).veredito, 'certo');

  // O atalho nunca pode estar no enunciado: seria dar a resposta.
  const itachi = acha('anime', 'Uchiha');
  conferir('"Uchiha" nao vale quando a pergunta ja fala do cla Uchiha',
    avaliar('Uchiha', itachi.resposta, itachi.aceita || []).veredito === 'certo', false);

  // Foto de jogador: o sobrenome vale, salvo se for de mais de um jogador.
  let fotos = 0;
  let comSobrenome = 0;
  for (const q of QUESTOES.futebol) {
    const [s] = sobrenomesDe(q.resposta);
    if (!s) continue;
    fotos++;
    if (avaliar(s, q.resposta, q.aceita || []).veredito === 'certo') comSobrenome++;
  }
  console.log(`     ${comSobrenome} de ${fotos} jogadores de nome composto aceitam o sobrenome`);
  conferir('a maioria dos jogadores aceita o sobrenome', comSobrenome / fotos > 0.8, true);
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
