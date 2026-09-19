'use strict';

/*
 * Banco do modo Mais ou Menos Pontos: listas em ORDEM.
 *
 * A posicao e a pontuacao. O primeiro da lista vale 1 ponto e o ultimo vale o
 * tamanho da lista: dizer "India" nos paises mais populosos rende 1, dizer
 * "Romenia" rende 60, e quem lembra de um pais que nao esta na lista nao leva
 * nada. Por isso a ordem importa mais aqui do que em qualquer outro banco.
 *
 * Como manter:
 *
 * - **A ordem e a fonte.** Cada lista traz de onde ela veio e de quando; ao
 *   atualizar, troque a lista inteira, nao um item no meio.
 * - **Sem acento**, como no resto do texto do jogo (a comparacao ignora
 *   acento de qualquer jeito).
 * - `variantes` guarda as outras formas que valem para o mesmo item.
 * - O enunciado pede UM item ("cite um dos paises..."), porque cada pessoa
 *   responde uma vez so por rodada.
 */

/** Item simples ou item com apelidos. */
const item = (oficial, ...variantes) => ({ oficial, variantes });

const RANKINGS = [
  {
    id: 'paises-populosos',
    pergunta: 'Cite um dos 60 paises mais populosos do mundo',
    fonte: 'Wikipedia, lista de paises por populacao (2026)',
    tema: 'geografia',
    dif: 30,
    itens: [
      item('India'), item('China'), item('Estados Unidos', 'EUA', 'USA'), item('Indonesia'),
      item('Paquistao'), item('Nigeria'), item('Brasil'), item('Bangladesh'),
      item('Russia'), item('Mexico'), item('Etiopia'), item('Japao'),
      item('Filipinas'), item('Republica Democratica do Congo', 'Congo', 'RDC'), item('Egito'),
      item('Vietna', 'Vietname', 'Vietnam'), item('Turquia'), item('Ira', 'Irao', 'Iran'),
      item('Alemanha'), item('Tailandia'), item('Reino Unido'), item('Franca'),
      item('Italia'), item('Tanzania'), item('Africa do Sul'), item('Myanmar', 'Birmania'),
      item('Quenia'), item('Coreia do Sul'), item('Colombia'), item('Espanha'),
      item('Uganda'), item('Argentina'), item('Argelia'), item('Sudao'),
      item('Ucrania'), item('Iraque'), item('Afeganistao'), item('Polonia'),
      item('Canada'), item('Marrocos'), item('Angola'), item('Arabia Saudita'),
      item('Malasia'), item('Uzbequistao'), item('Peru'), item('Mocambique'),
      item('Gana'), item('Iemen'), item('Nepal'), item('Venezuela'),
      item('Madagascar'), item('Camaroes'), item('Costa do Marfim'), item('Coreia do Norte'),
      item('Australia'), item('Niger'), item('Sri Lanka'), item('Burkina Faso', 'Burquina Fasso'),
      item('Mali'), item('Romenia')
    ]
  },
  {
    id: 'paises-area',
    pergunta: 'Cite um dos 50 maiores paises do mundo em area',
    fonte: 'Wikipedia, lista de paises por area (2026)',
    tema: 'geografia',
    dif: 35,
    itens: [
      item('Russia'), item('Canada'), item('China'), item('Estados Unidos', 'EUA', 'USA'),
      item('Brasil'), item('Australia'), item('India'), item('Argentina'),
      item('Cazaquistao'), item('Argelia'), item('Republica Democratica do Congo', 'Congo', 'RDC'),
      item('Arabia Saudita'), item('Mexico'), item('Indonesia'), item('Sudao'),
      item('Libia'), item('Ira', 'Irao', 'Iran'), item('Mongolia'), item('Peru'),
      item('Chade'), item('Niger'), item('Angola'), item('Mali'), item('Africa do Sul'),
      item('Colombia'), item('Etiopia'), item('Bolivia'), item('Mauritania'),
      item('Egito'), item('Tanzania'), item('Nigeria'), item('Venezuela'),
      item('Paquistao'), item('Namibia'), item('Mocambique'), item('Turquia'),
      item('Chile'), item('Zambia'), item('Myanmar', 'Birmania'), item('Afeganistao'),
      item('Sudao do Sul'), item('Somalia'), item('Republica Centro-Africana'),
      item('Madagascar'), item('Botswana', 'Botsuana'), item('Quenia'), item('Ucrania'),
      item('Franca'), item('Iemen'), item('Tailandia')
    ]
  },
  {
    id: 'cidades-brasil',
    pergunta: 'Cite uma das 50 cidades mais populosas do Brasil',
    fonte: 'IBGE, Censo 2022, via Wikipedia',
    tema: 'geografia',
    dif: 35,
    itens: [
      item('Sao Paulo'), item('Rio de Janeiro'), item('Brasilia'), item('Fortaleza'),
      item('Salvador'), item('Belo Horizonte'), item('Manaus'), item('Curitiba'),
      item('Recife'), item('Goiania'), item('Porto Alegre'), item('Belem'),
      item('Guarulhos'), item('Campinas'), item('Sao Luis'), item('Maceio'),
      item('Campo Grande'), item('Sao Goncalo'), item('Teresina'), item('Joao Pessoa'),
      item('Sao Bernardo do Campo', 'Sao Bernardo'), item('Duque de Caxias'),
      item('Nova Iguacu'), item('Natal'), item('Santo Andre'), item('Osasco'),
      item('Sorocaba'), item('Uberlandia'), item('Ribeirao Preto'),
      item('Sao Jose dos Campos'), item('Cuiaba'), item('Jaboatao dos Guararapes', 'Jaboatao'),
      item('Contagem'), item('Joinville'), item('Feira de Santana'), item('Aracaju'),
      item('Londrina'), item('Juiz de Fora'), item('Florianopolis'),
      item('Aparecida de Goiania'), item('Serra'), item('Campos dos Goytacazes', 'Campos'),
      item('Belford Roxo'), item('Niteroi'), item('Sao Jose do Rio Preto'),
      item('Ananindeua'), item('Vila Velha'), item('Caxias do Sul'), item('Porto Velho'),
      item('Mogi das Cruzes')
    ]
  },
  {
    id: 'filmes-bilheteria',
    pergunta: 'Cite um dos 30 filmes de maior bilheteria da historia',
    fonte: 'Wikipedia, lista de filmes de maior bilheteria (2026)',
    tema: 'cinema',
    dif: 40,
    itens: [
      item('Avatar'), item('Vingadores: Ultimato', 'Ultimato', 'Endgame'),
      item('Homem-Aranha: Um Novo Dia', 'Homem Aranha Um Novo Dia'),
      item('Avatar: O Caminho da Agua', 'Avatar 2'), item('Ne Zha 2'),
      item('Titanic'), item('Star Wars: O Despertar da Forca', 'O Despertar da Forca'),
      item('Vingadores: Guerra Infinita', 'Guerra Infinita', 'Infinity War'),
      item('Homem-Aranha: Sem Volta para Casa', 'Sem Volta para Casa', 'No Way Home'),
      item('Zootopia 2'), item('Divertida Mente 2', 'Divertidamente 2'),
      item('A Odisseia'), item('Jurassic World'), item('O Rei Leao'),
      item('Os Vingadores', 'Vingadores'), item('Velozes e Furiosos 7', 'Velozes & Furiosos 7'),
      item('Top Gun: Maverick', 'Top Gun Maverick'), item('Avatar: Fogo e Cinzas', 'Avatar 3'),
      item('Frozen 2', 'Frozen II'), item('Barbie'),
      item('Vingadores: Era de Ultron', 'Era de Ultron'), item('Super Mario Bros. O Filme', 'Super Mario'),
      item('Pantera Negra', 'Black Panther'),
      item('Harry Potter e as Reliquias da Morte: Parte 2', 'Reliquias da Morte Parte 2'),
      item('Deadpool e Wolverine', 'Deadpool & Wolverine'),
      item('Star Wars: Os Ultimos Jedi', 'Os Ultimos Jedi'),
      item('Jurassic World: Reino Ameacado', 'Reino Ameacado'), item('Frozen'),
      item('A Bela e a Fera'), item('Os Incriveis 2')
    ]
  },
  {
    id: 'linguas-faladas',
    pergunta: 'Cite uma das 30 linguas mais faladas do mundo',
    fonte: 'Ethnologue, via Wikipedia (total de falantes)',
    tema: 'geografia',
    dif: 40,
    itens: [
      item('Ingles'), item('Mandarim', 'Chines mandarim'), item('Hindi'), item('Espanhol'),
      item('Portugues'), item('Arabe'), item('Bengali'), item('Frances'),
      item('Russo'), item('Urdu'), item('Indonesio'), item('Alemao'),
      item('Japones'), item('Marata'), item('Telugo'), item('Turco'),
      item('Tamil'), item('Cantones', 'Chines yue'), item('Chines wu', 'Wu'),
      item('Coreano'), item('Vietnamita'), item('Hausa'), item('Persa', 'Farsi'),
      item('Arabe egipcio'), item('Suaili', 'Swahili'), item('Javanes'),
      item('Italiano'), item('Punjabi'), item('Guzerate'), item('Tailandes')
    ]
  }
];

module.exports = { RANKINGS };
