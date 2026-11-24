'use strict';

/*
 * Maria vai com as outras: as perguntas de top 5.
 *
 * Cada rodada sorteia uma daqui e todo mundo escreve o seu top 5. Ponto e
 * para quem pensa igual a mesa: cada coisa que outra pessoa tambem pos vale.
 *
 * O que entra aqui precisa ter resposta aberta, mas com "favoritos" que
 * muita gente lembra: "Top 5 frutas" tem banana, morango e manga na boca de
 * todo mundo, e a graca e adivinhar o resto. Pergunta com resposta unica
 * ("os 5 maiores paises em area") nao serve — ai e conta, nao opiniao.
 */
const TOPS = [
  // Musica
  'Top 5 bandas',
  'Top 5 cantores brasileiros',
  'Top 5 cantoras',
  'Top 5 cantores internacionais',
  'Top 5 músicas para cantar no karaokê',
  'Top 5 estilos musicais',
  'Top 5 instrumentos musicais',
  'Top 5 duplas sertanejas',
  'Top 5 bandas de rock',
  'Top 5 rappers',

  // Bichos e natureza
  'Top 5 animais mais fofos',
  'Top 5 animais mais perigosos',
  'Top 5 animais de estimação',
  'Top 5 raças de cachorro',
  'Top 5 aves',
  'Top 5 animais do mar',
  'Top 5 insetos mais nojentos',
  'Top 5 flores',
  'Top 5 árvores',

  // Lugares
  'Top 5 países para viajar',
  'Top 5 cidades do Brasil para visitar',
  'Top 5 praias do Brasil',
  'Top 5 cidades do mundo',
  'Top 5 pontos turísticos do mundo',
  'Top 5 estados do Brasil',
  'Top 5 países da Europa',
  'Top 5 países da Ásia',
  'Top 5 lugares para ir num encontro',
  'Top 5 lugares para passar as férias',

  // Pessoas da história
  'Top 5 cientistas da história',
  'Top 5 personalidades da história',
  'Top 5 brasileiros da história',
  'Top 5 inventores',
  'Top 5 pintores',
  'Top 5 escritores',
  'Top 5 filósofos',
  'Top 5 presidentes do Brasil',
  'Top 5 líderes mundiais da história',
  'Top 5 vilões da história real',
  'Top 5 personalidades do século XXI',
  'Top 5 bilionários',

  // Esporte
  'Top 5 esportistas da história',
  'Top 5 jogadores de futebol da história',
  'Top 5 jogadores de futebol do século XXI',
  'Top 5 jogadores brasileiros de futebol',
  'Top 5 times de futebol do Brasil',
  'Top 5 times de futebol do mundo',
  'Top 5 seleções de futebol',
  'Top 5 esportes',
  'Top 5 esportes olímpicos',
  'Top 5 pilotos de Fórmula 1',
  'Top 5 jogadores de basquete',
  'Top 5 tenistas',
  'Top 5 atletas brasileiros (fora do futebol)',
  'Top 5 lutadores',

  // Cinema, séries e TV
  'Top 5 filmes',
  'Top 5 filmes de terror',
  'Top 5 filmes de comédia',
  'Top 5 filmes de animação',
  'Top 5 filmes brasileiros',
  'Top 5 séries',
  'Top 5 desenhos animados',
  'Top 5 animes',
  'Top 5 novelas',
  'Top 5 atores',
  'Top 5 atrizes',
  'Top 5 super-heróis',
  'Top 5 vilões de filme',
  'Top 5 personagens da Disney',
  'Top 5 sagas de filmes',
  'Top 5 apresentadores de TV',
  'Top 5 programas de TV',

  // Marcas e coisas
  'Top 5 marcas',
  'Top 5 marcas de roupa',
  'Top 5 marcas de carro',
  'Top 5 marcas de celular',
  'Top 5 redes sociais',
  'Top 5 aplicativos',
  'Top 5 videogames',
  'Top 5 jogos de videogame',
  'Top 5 jogos de tabuleiro ou de cartas',
  'Top 5 brinquedos de infância',
  'Top 5 invenções da humanidade',
  'Top 5 objetos para levar para uma ilha deserta',

  // Comida e bebida
  'Top 5 comidas',
  'Top 5 comidas brasileiras',
  'Top 5 doces',
  'Top 5 frutas',
  'Top 5 sabores de pizza',
  'Top 5 sabores de sorvete',
  'Top 5 bebidas',
  'Top 5 salgados de festa',
  'Top 5 lanches de fast food',
  'Top 5 comidas de festa junina',
  'Top 5 culinárias do mundo',

  // Vida
  'Top 5 profissões',
  'Top 5 profissões mais difíceis',
  'Top 5 matérias da escola',
  'Top 5 cursos de faculdade',
  'Top 5 superpoderes',
  'Top 5 hobbies',
  'Top 5 coisas para fazer no fim de semana',
  'Top 5 feriados',
  'Top 5 cores',
  'Top 5 nomes de menino',
  'Top 5 nomes de menina',
  'Top 5 medos mais comuns',
  'Top 5 coisas que irritam',
  'Top 5 presentes de aniversário',
  'Top 5 meios de transporte',
  'Top 5 signos',
  'Top 5 personagens de conto de fadas',
  'Top 5 monstros e criaturas lendárias',
  'Top 5 personagens do folclore brasileiro',
  'Top 5 deuses da mitologia',
  'Top 5 maravilhas do mundo',
  'Top 5 planetas e astros'
];

module.exports = { TOPS };
