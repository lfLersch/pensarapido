'use strict';

/*
 * Notas de versao, da mais nova para a mais velha.
 *
 * E o que a aba "Novidades" do saguao mostra. Cada entrada e uma leva de
 * mudancas que foi para o ar junto — nao e o log do git, e a versao que o
 * jogador entende: o que mudou para ele.
 *
 * Ao publicar uma leva nova, acrescente no TOPO da lista:
 *
 *   { versao: '1.9', data: '2026-10-02', titulo: 'O que mudou', itens: [...] }
 *
 * `data` no formato ANO-MES-DIA, e cada item em uma frase, sem jargao de
 * codigo. `testes/notas.test.js` cobra o formato e a ordem.
 */

const NOTAS = [
  {
    versao: '1.8',
    data: '2026-09-18',
    titulo: 'Dois modos novos: Veni, Vidi, Vici e Mais ou Menos Pontos',
    itens: [
      'Veni, Vidi, Vici: uma palavra e tres dicas, que entram uma por terco da rodada. Acertar na primeira vale 10 pontos, na segunda 6 e na terceira 3.',
      'As dicas sao soltas, nao frases: "Michael Jackson, Mike Tyson e Taffarel" levam a Luva. Sao 107 palavras no banco.',
      'Mais ou Menos Pontos: a lista vem em ordem e a posicao e a pontuacao. O primeiro da lista vale 1 ponto e o ultimo vale o tamanho dela; fora da lista, zero.',
      'Cinco listas para esse modo: paises por populacao e por area, cidades do Brasil, filmes de maior bilheteria e linguas mais faladas.',
      'Historia ganhou a parte Mitologia, com 40 perguntas: Helena de Troia, Prometeu, Icaro, Nefertiti, Odin e companhia.'
    ]
  },
  {
    versao: '1.7',
    data: '2026-09-18',
    titulo: 'Leilao Geral, equipes de verdade e leilao mais rapido',
    itens: [
      'Leilao Geral: cada um por si. Todo mundo ve a pergunta e aposta quantas respostas consegue dizer sozinho; quem nao cobre o lance sai da rodada.',
      'Quem leva o leilao ganha 2 pontos por resposta entregue. Se nao chegar no que prometeu, cada um dos outros leva o valor da aposta.',
      'Presente Grego agora e por equipes montadas na sala: da para trocar de lado no botao, e cada equipe leva metade da sala mais uma pessoa.',
      'Numero impar de jogadores passou a valer no Presente Grego: 3 contra 2 esta liberado.',
      'O leilao ficou mais rapido: 6 segundos por lance, no lugar de 15. A entrega passou a durar 2 segundos mais 4 por resposta prometida.',
      'O lider pode tirar alguem da sala em qualquer modo, pelo X ao lado do nome.'
    ]
  },
  {
    versao: '1.6',
    data: '2026-09-10',
    titulo: 'Ouvir musicas, Marcas e pontos turisticos',
    itens: [
      'Categoria Ouvir musicas: 93 trechos de 40 segundos, com duas perguntas cada — o nome da musica e quem canta.',
      'Categoria Marcas: 103 logos sem o nome escrito, divididos em carros, tecnologia, moda, comida e outras.',
      'Esportes ganhou os 29 times da NBA e o logo da liga; Futebol ganhou escudos; Cinema & TV ganhou fotos de novela, de atores e de gente da TV.',
      'Geografia ganhou a parte Pontos turisticos: 15 lugares, com pergunta do lugar e da cidade.',
      'Historia e Ciencia ganharam 35 perguntas: quem descobriu o que, datas e simbolos quimicos.',
      'Na criacao da sala, as partes de cada categoria ja comecam marcadas. Desmarcar uma tira so ela; marcar uma parte com a categoria desmarcada traz so aquela parte.'
    ]
  },
  {
    versao: '1.5',
    data: '2026-09-06',
    titulo: 'Presente Grego e votacao para pular',
    itens: [
      'Modo Presente Grego: um integrante leiloa quantas respostas o parceiro consegue dizer, e o parceiro so ve a pergunta no fim do leilao.',
      'Qualquer pessoa pode votar para pular a rodada; com metade mais um, ela morre na hora.',
      'O saguao passou a listar as salas abertas, com o modo e a lotacao, para entrar sem precisar do codigo.',
      'O "quase" mostra onde voce errou: quem digita "cera" com "cara" na frente ve "c_ra".'
    ]
  },
  {
    versao: '1.4',
    data: '2026-09-06',
    titulo: 'Carrossel, em duas versoes',
    itens: [
      'Modo Carrossel: a vez passa de um em um, 7 segundos para cada, e quem nao souber sai da rodada.',
      'Carrossel as cegas: a mesma coisa, sem a lista do que ja foi dito. Errar nao elimina; repetir o que ja saiu, sim.',
      'As rodadas 1 e 2 dao uma volta, 3 e 4 duas, e da 5 em diante tres.'
    ]
  },
  {
    versao: '1.0',
    data: '2026-09-01',
    titulo: 'O comeco',
    itens: [
      'Modo Tempo: a resposta e digitada no chat, e a pontuacao cai com o relogio e com quem acertou antes.',
      'Modo Escalada: cada rodada pede uma resposta a mais que a anterior.',
      'Banco de perguntas com imagem, e listas para as rodadas de varias respostas.'
    ]
  }
];

/** A versao que esta no ar: e a primeira da lista. */
const VERSAO = NOTAS[0].versao;

module.exports = { NOTAS, VERSAO };
