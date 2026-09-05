'use strict';

/**
 * Perguntas de lista do Modo Escalada.
 *
 * Na Escalada, cada rodada pede uma resposta a mais que a anterior:
 * rodada 1 pede 1, rodada 2 pede 2, rodada 3 pede 3, e assim por diante.
 * A rodada 1 usa uma pergunta normal do banco comum; da 2 em diante vêm daqui.
 *
 * Formato:
 *   {
 *     pergunta: 'Cite {n} países da África',  // {n} vira o número da rodada
 *     respostas: [...],                       // cada item: 'Nome' ou ['Nome', 'variante', ...]
 *     minimo: 3,                              // (opcional) só entra a partir dessa rodada
 *     fixo: true,                             // (opcional) exige TODOS os itens da lista
 *     dif: 45
 *   }
 *
 * `fixo` é para conjuntos fechados: "os finalistas da Copa de 2022" são
 * exatamente dois, então essa pergunta só aparece na rodada 2.
 * Sem `fixo`, a lista é um repertório: a pergunta serve para qualquer rodada
 * até o tamanho da lista, e vale qualquer combinação de itens distintos.
 */

const LISTAS = [
  /* ---------------------- conjuntos fechados ---------------------- */
  {
    pergunta: 'Quem foram os dois finalistas da Copa do Mundo de 2022?',
    fixo: true, dif: 30,
    respostas: ['Argentina', ['França', 'Franca']]
  },
  {
    pergunta: 'Quais são os três estados da região Sul do Brasil?',
    fixo: true, dif: 35,
    respostas: [
      ['Paraná', 'PR'],
      ['Santa Catarina', 'SC'],
      ['Rio Grande do Sul', 'RS']
    ]
  },
  {
    pergunta: 'Quais são as quatro estações do ano?',
    fixo: true, dif: 20,
    respostas: ['Primavera', 'Verão', 'Outono', 'Inverno']
  },
  {
    pergunta: 'Quem foram os quatro integrantes dos Beatles?',
    fixo: true, dif: 55,
    respostas: [
      ['John Lennon', 'Lennon', 'John'],
      ['Paul McCartney', 'McCartney', 'Paul'],
      ['George Harrison', 'Harrison', 'George'],
      ['Ringo Starr', 'Ringo', 'Starr']
    ]
  },
  {
    pergunta: 'Quais são as quatro cores da bandeira do Brasil?',
    fixo: true, dif: 25,
    respostas: ['Verde', 'Amarelo', 'Azul', 'Branco']
  },
  {
    pergunta: 'Quais são os cinco continentes representados nos anéis olímpicos?',
    fixo: true, dif: 60,
    respostas: [
      ['África', 'Africa'], ['América', 'America'], ['Ásia', 'Asia'],
      ['Europa'], ['Oceania']
    ]
  },
  {
    pergunta: 'Quais são as seis cordas de um violão, da mais grave para a mais aguda?',
    fixo: true, dif: 70,
    respostas: ['Mi', 'Lá', 'Ré', 'Sol', 'Si', ['Mi agudo', 'Mizinho']]
  },
  {
    pergunta: 'Quais são os sete pecados capitais?',
    fixo: true, dif: 60,
    respostas: [
      ['Soberba', 'Orgulho'], ['Avareza', 'Ganância'], ['Luxúria'],
      ['Ira', 'Raiva'], ['Gula'], ['Inveja'], ['Preguiça']
    ]
  },
  {
    pergunta: 'Cite as oito seleções que já venceram a Copa do Mundo.',
    fixo: true, dif: 75,
    respostas: [
      'Brasil', ['Alemanha', 'Alemanha Ocidental'], 'Itália', 'Argentina',
      ['França', 'Franca'], 'Uruguai', 'Inglaterra', 'Espanha'
    ]
  },
  {
    pergunta: 'Cite os dez países que fazem fronteira com o Brasil.',
    fixo: true, dif: 80,
    respostas: [
      'Argentina', 'Uruguai', 'Paraguai', 'Bolívia', 'Peru', 'Colômbia',
      'Venezuela', 'Guiana', 'Suriname', ['Guiana Francesa', 'França']
    ]
  },

  /* ---------------------- repertórios abertos ---------------------- */
  {
    pergunta: 'Cite {n} planetas do Sistema Solar',
    minimo: 2, dif: 30,
    respostas: [
      ['Mercúrio', 'Mercurio'], ['Vênus', 'Venus'], 'Terra', 'Marte',
      ['Júpiter', 'Jupiter'], 'Saturno', 'Urano', 'Netuno'
    ]
  },
  {
    pergunta: 'Cite {n} países da América do Sul',
    minimo: 2, dif: 35,
    respostas: [
      'Brasil', 'Argentina', 'Chile', 'Uruguai', 'Paraguai', ['Bolívia', 'Bolivia'],
      'Peru', 'Equador', ['Colômbia', 'Colombia'], 'Venezuela', 'Guiana', 'Suriname'
    ]
  },
  {
    pergunta: 'Cite {n} países da África',
    minimo: 3, dif: 50,
    respostas: [
      ['Nigéria', 'Nigeria'], 'Egito', ['África do Sul', 'Africa do Sul'],
      ['Quênia', 'Quenia'], ['Etiópia', 'Etiopia'], 'Gana', 'Marrocos',
      ['Argélia', 'Argelia'], 'Angola', ['Moçambique', 'Mocambique'],
      ['Tanzânia', 'Tanzania'], 'Uganda', 'Senegal', ['Camarões', 'Camaroes'],
      'Costa do Marfim', ['Tunísia', 'Tunisia'], ['Líbia', 'Libia'], ['Sudão', 'Sudao'],
      ['Zimbábue', 'Zimbabue'], ['Zâmbia', 'Zambia'], ['Namíbia', 'Namibia'],
      'Botsuana', 'Madagascar', 'Mali', ['Somália', 'Somalia'], 'Ruanda',
      'Burundi', ['Chade', 'Tchade'], ['Níger', 'Niger'], 'Benim', 'Togo',
      ['Guiné', 'Guine'], 'Serra Leoa', ['Libéria', 'Liberia'], ['Gabão', 'Gabao'],
      'Malawi', 'Lesoto', ['Mauritânia', 'Mauritania'], 'Eritreia', 'Djibuti',
      'Burkina Faso', 'Cabo Verde', ['Gâmbia', 'Gambia'], ['Guiné-Bissau', 'Guine Bissau'],
      ['São Tomé e Príncipe', 'Sao Tome'], ['Sudão do Sul', 'Sudao do Sul'],
      ['República Centro-Africana', 'Republica Centro Africana'], 'Congo'
    ]
  },
  {
    pergunta: 'Cite {n} países da Europa',
    minimo: 3, dif: 45,
    respostas: [
      'Portugal', 'Espanha', ['França', 'Franca'], ['Itália', 'Italia'], 'Alemanha',
      ['Reino Unido', 'Inglaterra'], 'Irlanda', ['Países Baixos', 'Holanda'],
      ['Bélgica', 'Belgica'], 'Luxemburgo', ['Suíça', 'Suica'], ['Áustria', 'Austria'],
      'Dinamarca', ['Suécia', 'Suecia'], 'Noruega', ['Finlândia', 'Finlandia'],
      ['Islândia', 'Islandia'], ['Polônia', 'Polonia'], ['República Tcheca', 'Tchequia'],
      ['Eslováquia', 'Eslovaquia'], 'Hungria', ['Romênia', 'Romenia'],
      ['Bulgária', 'Bulgaria'], ['Grécia', 'Grecia'], ['Croácia', 'Croacia'],
      ['Sérvia', 'Servia'], ['Eslovênia', 'Eslovenia'], ['Bósnia', 'Bosnia'],
      'Montenegro', ['Macedônia do Norte', 'Macedonia'], ['Albânia', 'Albania'],
      ['Ucrânia', 'Ucrania'], ['Bielorrússia', 'Bielorrussia'], ['Rússia', 'Russia'],
      ['Lituânia', 'Lituania'], ['Letônia', 'Letonia'], ['Estônia', 'Estonia'],
      ['Moldávia', 'Moldavia'], 'Malta', 'Chipre', 'Andorra', ['Mônaco', 'Monaco'],
      'San Marino', 'Liechtenstein', ['Vaticano', 'Cidade do Vaticano']
    ]
  },
  {
    pergunta: 'Cite {n} estados brasileiros',
    minimo: 3, dif: 40,
    respostas: [
      ['Acre', 'AC'], ['Alagoas', 'AL'], ['Amapá', 'AP'], ['Amazonas', 'AM'],
      ['Bahia', 'BA'], ['Ceará', 'CE'], ['Espírito Santo', 'ES'], ['Goiás', 'GO'],
      ['Maranhão', 'MA'], ['Mato Grosso', 'MT'], ['Mato Grosso do Sul', 'MS'],
      ['Minas Gerais', 'MG'], ['Pará', 'PA'], ['Paraíba', 'PB'], ['Paraná', 'PR'],
      ['Pernambuco', 'PE'], ['Piauí', 'PI'], ['Rio de Janeiro', 'RJ'],
      ['Rio Grande do Norte', 'RN'], ['Rio Grande do Sul', 'RS'], ['Rondônia', 'RO'],
      ['Roraima', 'RR'], ['Santa Catarina', 'SC'], ['São Paulo', 'SP'],
      ['Sergipe', 'SE'], ['Tocantins', 'TO'], ['Distrito Federal', 'DF']
    ]
  },
  {
    pergunta: 'Cite {n} esportes olímpicos',
    minimo: 3, dif: 40,
    respostas: [
      'Atletismo', ['Natação', 'Natacao'], ['Ginástica', 'Ginastica'], ['Judô', 'Judo'],
      ['Vôlei', 'Volei', 'Voleibol'], 'Basquete', 'Futebol', 'Handebol', 'Boxe',
      'Esgrima', 'Ciclismo', 'Remo', 'Canoagem', ['Tênis', 'Tenis'],
      ['Tênis de mesa', 'Tenis de mesa'], 'Badminton', 'Vela', 'Tiro com arco',
      'Halterofilismo', ['Luta', 'Wrestling'], 'Taekwondo', 'Triatlo', 'Hipismo',
      'Golfe', 'Rugby', 'Surfe', 'Skate', 'Escalada', 'Pentatlo moderno',
      ['Polo aquático', 'Polo aquatico'], 'Saltos ornamentais', 'Nado artístico',
      ['Hóquei', 'Hoquei'], ['Karatê', 'Karate'], 'Beisebol', 'Softbol', 'Breaking'
    ]
  },
  {
    pergunta: 'Cite {n} jogadores de futebol cujo nome começa com a letra L',
    minimo: 2, dif: 55,
    respostas: [
      ['Lionel Messi', 'Messi'], ['Luka Modrić', 'Modric', 'Luka Modric'],
      ['Lewandowski', 'Robert Lewandowski'], ['Luis Suárez', 'Luis Suarez'],
      ['Lothar Matthäus', 'Lothar Matthaus'], ['Lampard', 'Frank Lampard'],
      ['Lahm', 'Philipp Lahm'], ['Lloris', 'Hugo Lloris'],
      ['Lukaku', 'Romelu Lukaku'], ['Lautaro Martínez', 'Lautaro'],
      ['Leonardo Bonucci', 'Bonucci'], ['Leroy Sané', 'Leroy Sane'],
      ['Luís Figo', 'Luis Figo', 'Figo'], ['Lorenzo Insigne', 'Insigne'],
      ['Lucas Moura'], ['Lisandro Martínez', 'Lisandro'], ['Luis Díaz', 'Luis Diaz'],
      ['Lamine Yamal', 'Yamal'], ['Leandro Paredes'], ['Laurent Blanc']
    ]
  },
  {
    pergunta: 'Cite {n} signos do zodíaco',
    minimo: 2, dif: 35,
    respostas: [
      ['Áries', 'Aries'], 'Touro', ['Gêmeos', 'Gemeos'], ['Câncer', 'Cancer'],
      ['Leão', 'Leao'], 'Virgem', 'Libra', ['Escorpião', 'Escorpiao'],
      ['Sagitário', 'Sagitario'], ['Capricórnio', 'Capricornio'],
      ['Aquário', 'Aquario'], 'Peixes'
    ]
  },
  {
    pergunta: 'Cite {n} cores do arco-íris',
    minimo: 2, dif: 30,
    respostas: ['Vermelho', 'Laranja', 'Amarelo', 'Verde', 'Azul', 'Anil', 'Violeta']
  },
  {
    pergunta: 'Cite {n} meses do ano',
    minimo: 2, dif: 20,
    respostas: [
      'Janeiro', 'Fevereiro', ['Março', 'Marco'], 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
  },
  {
    pergunta: 'Cite {n} clubes brasileiros de futebol',
    minimo: 2, dif: 30,
    respostas: [
      'Flamengo', 'Palmeiras', ['Corinthians', 'Corintians'], ['São Paulo', 'Sao Paulo'],
      'Santos', ['Grêmio', 'Gremio'], ['Internacional', 'Inter'],
      'Cruzeiro', ['Atlético Mineiro', 'Atletico Mineiro', 'Galo'], 'Botafogo',
      'Fluminense', 'Vasco', 'Bahia', 'Fortaleza',
      ['Athletico Paranaense', 'Atletico Paranaense'], 'Bragantino',
      ['Sport', 'Sport Recife'], ['Náutico', 'Nautico'], 'Goiás', 'Coritiba',
      ['Vitória', 'Vitoria'], ['Ceará', 'Ceara'], ['Juventude'], ['Criciúma', 'Criciuma']
    ]
  },
  {
    pergunta: 'Cite {n} elementos químicos',
    minimo: 2, dif: 45,
    respostas: [
      ['Hidrogênio', 'Hidrogenio'], ['Hélio', 'Helio'], ['Lítio', 'Litio'],
      ['Carbono'], ['Nitrogênio', 'Nitrogenio'], ['Oxigênio', 'Oxigenio'],
      ['Flúor', 'Fluor'], ['Sódio', 'Sodio'], ['Magnésio', 'Magnesio'],
      ['Alumínio', 'Aluminio'], ['Silício', 'Silicio'], ['Fósforo', 'Fosforo'],
      'Enxofre', 'Cloro', ['Potássio', 'Potassio'], ['Cálcio', 'Calcio'],
      'Ferro', 'Cobre', 'Zinco', 'Prata', 'Ouro', ['Mercúrio', 'Mercurio'],
      'Chumbo', ['Urânio', 'Uranio'], ['Neônio', 'Neonio'], ['Titânio', 'Titanio'],
      ['Níquel', 'Niquel'], ['Estanho'], ['Bário', 'Bario'], ['Iodo']
    ]
  },
  {
    pergunta: 'Cite {n} instrumentos musicais',
    minimo: 2, dif: 25,
    respostas: [
      ['Violão', 'Violao'], 'Guitarra', 'Piano', 'Bateria', 'Baixo', 'Violino',
      'Flauta', ['Saxofone', 'Sax'], 'Trompete', 'Violoncelo', 'Harpa', 'Clarinete',
      ['Acordeão', 'Acordeao', 'Sanfona'], 'Pandeiro', ['Cavaquinho'], 'Trombone',
      ['Órgão', 'Orgao'], 'Ukulele', ['Berimbau'], ['Tuba'], ['Oboé', 'Oboe']
    ]
  },
  {
    pergunta: 'Cite {n} personagens de One Piece',
    minimo: 2, dif: 60,
    respostas: [
      ['Monkey D. Luffy', 'Luffy'], ['Roronoa Zoro', 'Zoro'], 'Nami', 'Usopp',
      ['Sanji'], ['Tony Tony Chopper', 'Chopper'], ['Nico Robin', 'Robin'],
      'Franky', 'Brook', 'Jinbe', ['Portgas D. Ace', 'Ace'], ['Shanks'],
      ['Barba Branca', 'Whitebeard'], ['Trafalgar Law', 'Law'], ['Boa Hancock', 'Hancock'],
      ['Kaido'], ['Big Mom'], ['Doflamingo'], ['Crocodile'], ['Buggy']
    ]
  },
  {
    pergunta: 'Cite {n} filmes da Marvel',
    minimo: 2, dif: 40,
    respostas: [
      ['Homem de Ferro', 'Iron Man'], ['Vingadores', 'Avengers'],
      ['Capitão América', 'Capitao America'], ['Thor'], ['Hulk'],
      ['Guardiões da Galáxia', 'Guardioes da Galaxia'], ['Pantera Negra', 'Black Panther'],
      ['Doutor Estranho', 'Doutor Strange'], ['Homem-Formiga', 'Homem Formiga'],
      ['Capitã Marvel', 'Capita Marvel'], ['Homem-Aranha', 'Homem Aranha', 'Spider-Man'],
      ['Ultimato', 'Endgame'], ['Guerra Infinita', 'Infinity War'],
      ['Eternos', 'Eternals'], ['Shang-Chi', 'Shang Chi'], ['Deadpool'],
      ['Viúva Negra', 'Viuva Negra'], ['Wandavision']
    ]
  },
  {
    pergunta: 'Cite {n} capitais de países da América do Sul',
    minimo: 2, dif: 55,
    respostas: [
      ['Brasília', 'Brasilia'], 'Buenos Aires', 'Santiago', 'Montevidéu',
      ['Assunção', 'Assuncao'], ['La Paz'], 'Lima', 'Quito', ['Bogotá', 'Bogota'],
      'Caracas', 'Georgetown', 'Paramaribo'
    ]
  },
  {
    pergunta: 'Cite {n} bandas de rock',
    minimo: 2, dif: 35,
    respostas: [
      ['Queen'], ['The Beatles', 'Beatles'], ['Led Zeppelin'], ['Pink Floyd'],
      ['The Rolling Stones', 'Rolling Stones'], ['Nirvana'], ['Metallica'],
      ['AC/DC', 'ACDC'], ['Guns N Roses', 'Guns and Roses'], ['U2'],
      ['Radiohead'], ['Coldplay'], ['Red Hot Chili Peppers', 'RHCP'],
      ['Pearl Jam'], ['Black Sabbath'], ['Iron Maiden'], ['The Who'],
      ['Legião Urbana', 'Legiao Urbana'], ['Titãs', 'Titas'], ['Capital Inicial']
    ]
  }
];

/**
 * Devolve as listas que servem para uma rodada que pede `n` respostas.
 *
 * - `fixo`: só serve se a lista tiver exatamente `n` itens.
 * - aberta: serve se tiver itens suficientes e já tiver passado o `minimo`.
 */
function paraRodada(n) {
  return LISTAS.filter((lista) => {
    if (lista.fixo) return lista.respostas.length === n;
    return lista.respostas.length >= n && (lista.minimo || 1) <= n;
  });
}

/** Normaliza um item para { oficial, variantes }. */
function itemDe(bruto) {
  const formas = Array.isArray(bruto) ? bruto : [bruto];
  return { oficial: formas[0], variantes: formas.slice(1) };
}

module.exports = { LISTAS, paraRodada, itemDe };
