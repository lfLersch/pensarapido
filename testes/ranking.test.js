'use strict';

/*
 * Modo Mais ou Menos Pontos: listas em ordem, e a posicao e a pontuacao.
 *
 * O primeiro da lista vale 1 ponto e o ultimo vale o tamanho dela. A mesma
 * lista rende tres rodadas: em cada uma, cada pessoa responde uma vez so — e
 * quem chuta fora da lista gastou a vez dele. O que ja foi dito nao conta de
 * novo em nenhuma das tres, senao bastava copiar o chat.
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

/** Fecha a rodada e abre a seguinte, sem esperar os relogios. */
function virarRodada(sala) {
  sala.encerrarRodada();
  sala.limparTemporizador();
  sala.proximaRodada();
  sala.limparTemporizador();
  sala.mostrarPergunta();
  sala.limparTemporizador();
}

const dizer = (sala, quem, texto) => {
  sala.jogadores.get(quem).ultimaMensagem = 0;
  const r = sala.palpitar(quem, texto);
  sala.limparTemporizador();
  return r;
};

const ultima = (eventos, nome) => eventos.filter((e) => e.evento === nome).pop().dados;

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
  conferir('  e em qual das tres voltas a mesa esta',
    [pergunta.ranking.volta, pergunta.ranking.voltas], [1, 3]);
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

  conferir('  mas repetir nao gasta a vez',
    dizer(sala, 'bia', itens[4].oficial).pontos, 5);

  const fora = dizer(sala, 'caio', 'xilofone quadrado de nuvem');
  conferir('chutar fora da lista gasta a vez', [fora.veredito, fora.gastou], ['errado', true]);
  conferir('  e depois disso nao da para tentar de novo',
    dizer(sala, 'caio', itens[9].oficial).veredito, 'bloqueado');
  conferir('  quem errou segue com zero', sala.jogadores.get('caio').pontos, 0);
  conferir('com todo mundo servido, a rodada fecha sozinha', sala.todosAcertaram(), true);
  sala.destruir();
}

/* ---------------- A mesma lista rende tres voltas ---------------- */
{
  const { sala, eventos } = novaSala(2);
  const lista = sala.perguntaAtual;
  const itens = lista.itens;

  dizer(sala, 'ana', itens[0].oficial);
  dizer(sala, 'bia', itens[1].oficial);
  virarRodada(sala);

  conferir('a segunda rodada e a mesma lista', sala.perguntaAtual.id, lista.id);
  let pergunta = ultima(eventos, 'rodada:pergunta');
  conferir('  e a mesa sabe que e a volta 2', pergunta.ranking.volta, 2);
  conferir('  com o que ja saiu na tela', pergunta.ranking.jaDitos,
    [itens[0].oficial, itens[1].oficial]);

  conferir('o que saiu na volta anterior nao conta de novo',
    dizer(sala, 'ana', itens[0].oficial).veredito, 'repetido');
  conferir('  mas item novo vale a posicao dele',
    dizer(sala, 'ana', itens[5].oficial).pontos, 6);
  dizer(sala, 'bia', itens[6].oficial);

  virarRodada(sala);
  pergunta = ultima(eventos, 'rodada:pergunta');
  conferir('a terceira rodada ainda e a mesma lista', sala.perguntaAtual.id, lista.id);
  conferir('  e ja sao quatro nomes fora', pergunta.ranking.jaDitos.length, 4);
  dizer(sala, 'ana', itens[7].oficial);
  dizer(sala, 'bia', itens[8].oficial);

  virarRodada(sala);
  conferir('depois de tres voltas entra outra lista',
    sala.perguntaAtual.id === lista.id, false);
  pergunta = ultima(eventos, 'rodada:pergunta');
  conferir('  e a contagem recomeca do zero',
    [pergunta.ranking.volta, pergunta.ranking.jaDitos.length], [1, 0]);
  sala.destruir();
}

/* ---------------- O topo da lista so abre na ultima volta ---------------- */
{
  const { sala, eventos } = novaSala();
  const itens = sala.perguntaAtual.itens;
  dizer(sala, 'ana', itens[1].oficial);
  sala.encerrarRodada();
  sala.limparTemporizador();

  let resultado = ultima(eventos, 'rodada:resultado');
  conferir('na volta 1 o resultado mostra so o que a mesa disse',
    resultado.listaCompleta, [`2. ${itens[1].oficial}`]);
  conferir('  e avisa que a lista continua',
    resultado.resposta.includes('volta 1 de 3'), true);

  sala.destruir();

  const fim = novaSala();
  const finais = fim.sala.perguntaAtual.itens;
  fim.sala.voltaRanking = 3;                 // a terceira volta desta lista
  dizer(fim.sala, 'ana', finais[1].oficial);
  fim.sala.encerrarRodada();
  fim.sala.limparTemporizador();

  resultado = ultima(fim.eventos, 'rodada:resultado');
  conferir('na ultima volta o resultado abre o topo da lista',
    resultado.listaCompleta.slice(0, 3), finais.slice(0, 3).map((i, k) => `${k + 1}. ${i.oficial}`));
  conferir('  e diz ate onde ia a pontuacao',
    resultado.resposta.includes(String(finais.length)), true);
  fim.sala.destruir();
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
