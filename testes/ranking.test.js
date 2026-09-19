'use strict';

/*
 * Modo Mais ou Menos Pontos: listas em ordem, e a posicao e a pontuacao.
 *
 * O primeiro da lista vale 1 ponto e o ultimo vale o tamanho dela. Cada pessoa
 * responde uma vez por rodada, e o que ja foi dito nao conta de novo — senao
 * bastava copiar o chat.
 */

const { Sala } = require('../server/sala.js');
const { RANKINGS } = require('../server/rankings.js');
const { avaliar, normalizar } = require('../server/comparar.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(54), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

function novaSala(quantos = 2) {
  const eventos = [];
  const sala = new Sala('RK01',
    { categorias: ['bandeiras'], subs: [], fora: [], modo: 'ranking', metaPontos: 9999, segundosPorPergunta: 20 },
    (evento, dados) => eventos.push({ evento, dados }));
  for (const [id, nome] of [['ana', 'Ana'], ['bia', 'Bia'], ['caio', 'Caio']].slice(0, quantos)) {
    sala.entrar(id, nome);
  }
  sala.iniciar();
  sala.limparTemporizador();
  sala.mostrarPergunta();
  sala.limparTemporizador();
  return { sala, eventos };
}

const dizer = (sala, quem, texto) => {
  sala.jogadores.get(quem).ultimaMensagem = 0;
  const r = sala.palpitar(quem, texto);
  sala.limparTemporizador();
  return r;
};

/* ---------------- O banco ---------------- */
{
  conferir('tem lista que chegue', RANKINGS.length >= 4, true);

  const curtas = RANKINGS.filter((r) => r.itens.length < 20);
  conferir('nenhuma lista com menos de 20 itens', curtas.map((r) => r.id), []);

  const semFonte = RANKINGS.filter((r) => !r.fonte);
  conferir('toda lista diz de onde veio', semFonte.map((r) => r.id), []);

  // Dois itens que o corretor confunde fariam a mesma resposta valer posicoes
  // diferentes conforme a ordem da varredura.
  const ambiguos = [];
  for (const lista of RANKINGS) {
    for (let i = 0; i < lista.itens.length; i++) {
      for (let j = i + 1; j < lista.itens.length; j++) {
        const a = lista.itens[i];
        const b = lista.itens[j];
        if (avaliar(a.oficial, b.oficial, b.variantes || []).veredito === 'certo') {
          ambiguos.push(`${lista.id}: ${a.oficial} = ${b.oficial}`);
        }
      }
    }
  }
  conferir('nenhum par de itens indistinguivel', ambiguos, []);

  const repetidos = [];
  for (const lista of RANKINGS) {
    const vistos = new Set();
    for (const it of lista.itens) {
      const chave = normalizar(it.oficial);
      if (vistos.has(chave)) repetidos.push(`${lista.id}: ${it.oficial}`);
      vistos.add(chave);
    }
  }
  conferir('nenhum item repetido dentro da lista', repetidos, []);
}

/* ---------------- A posicao e a pontuacao ---------------- */
{
  const { sala, eventos } = novaSala();
  const itens = sala.perguntaAtual.itens;
  const pergunta = eventos.find((e) => e.evento === 'rodada:pergunta').dados;

  conferir('a rodada avisa o tamanho da lista', pergunta.ranking.total, itens.length);
  conferir('  e de onde a lista veio', typeof pergunta.ranking.fonte, 'string');
  conferir('a rodada pede uma resposta so', pergunta.necessarias, 1);

  const topo = dizer(sala, 'ana', itens[0].oficial);
  conferir('o primeiro da lista vale 1 ponto', topo.pontos, 1);

  const fundo = dizer(sala, 'bia', itens[itens.length - 1].oficial);
  conferir('o ultimo da lista vale o tamanho dela', fundo.pontos, itens.length);
  conferir('  e o placar soma isso', sala.jogadores.get('bia').pontos, itens.length);
  sala.destruir();
}

/* ---------------- Uma resposta por pessoa, sem copiar ---------------- */
{
  const { sala } = novaSala(3);
  const itens = sala.perguntaAtual.itens;

  dizer(sala, 'ana', itens[2].oficial);
  conferir('quem ja respondeu nao responde de novo',
    dizer(sala, 'ana', itens[3].oficial).veredito, 'bloqueado');

  conferir('copiar a resposta de outro nao conta',
    dizer(sala, 'bia', itens[2].oficial).veredito, 'repetido');

  conferir('  mas outro item ainda vale',
    dizer(sala, 'bia', itens[4].oficial).pontos, 5);

  const fora = dizer(sala, 'caio', 'xilofone quadrado de nuvem');
  conferir('fora da lista nao pontua e vira conversa', fora.veredito, 'chat');
  conferir('  e quem ficou de fora segue com zero', sala.jogadores.get('caio').pontos, 0);

  // A terceira pessoa ainda pode pontuar; quando todos responderem a rodada fecha.
  dizer(sala, 'caio', itens[9].oficial);
  conferir('com todo mundo respondido, a rodada fecha sozinha',
    sala.acertos.size, sala.jogadores.size);
  sala.destruir();
}

/* ---------------- O resultado mostra o topo da lista ---------------- */
{
  const { sala, eventos } = novaSala();
  const itens = sala.perguntaAtual.itens;
  dizer(sala, 'ana', itens[1].oficial);
  sala.encerrarRodada();
  sala.limparTemporizador();

  const resultado = eventos.filter((e) => e.evento === 'rodada:resultado').pop().dados;
  conferir('o resultado abre o topo da lista', resultado.listaCompleta.slice(0, 3),
    itens.slice(0, 3).map((i, k) => `${k + 1}. ${i.oficial}`));
  conferir('  e diz ate onde ia a pontuacao',
    resultado.resposta.includes(String(itens.length)), true);
  sala.destruir();
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
