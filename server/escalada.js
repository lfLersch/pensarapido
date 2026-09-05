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
 *     pergunta: 'Cite {n} paises da Africa',  // {n} vira o número da rodada
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
    fixo: true, tema: 'futebol', dif: 30,
    respostas: ['Argentina', ['Franca', 'Franca']]
  },
  {
    pergunta: 'Quais sao os tres estados da regiao Sul do Brasil?',
    fixo: true, tema: 'geografia', dif: 35,
    respostas: [
      ['Parana', 'PR'],
      ['Santa Catarina', 'SC'],
      ['Rio Grande do Sul', 'RS']
    ]
  },
  {
    pergunta: 'Quais sao as quatro estacoes do ano?',
    fixo: true, tema: 'gerais', dif: 20,
    respostas: ['Primavera', 'Verao', 'Outono', 'Inverno']
  },
  {
    pergunta: 'Quem foram os quatro integrantes dos Beatles?',
    fixo: true, tema: 'musica', dif: 55,
    respostas: [
      ['John Lennon', 'Lennon', 'John'],
      ['Paul McCartney', 'McCartney', 'Paul'],
      ['George Harrison', 'Harrison', 'George'],
      ['Ringo Starr', 'Ringo', 'Starr']
    ]
  },
  {
    pergunta: 'Quais sao as quatro cores da bandeira do Brasil?',
    fixo: true, tema: 'gerais', dif: 25,
    respostas: ['Verde', 'Amarelo', 'Azul', 'Branco']
  },
  {
    pergunta: 'Quais sao os cinco continentes representados nos aneis olimpicos?',
    fixo: true, tema: 'esportes', dif: 60,
    respostas: [
      ['Africa', 'Africa'], ['America', 'America'], ['Asia', 'Asia'],
      ['Europa'], ['Oceania']
    ]
  },
  {
    pergunta: 'Quais sao as seis cordas de um violao, da mais grave para a mais aguda?',
    fixo: true, tema: 'musica', dif: 70,
    respostas: ['Mi', 'La', 'Re', 'Sol', 'Si', ['Mi agudo', 'Mizinho']]
  },
  {
    pergunta: 'Quais sao os sete pecados capitais?',
    fixo: true, tema: 'gerais', dif: 60,
    respostas: [
      ['Soberba', 'Orgulho'], ['Avareza', 'Ganancia'], ['Luxuria'],
      ['Ira', 'Raiva'], ['Gula'], ['Inveja'], ['Preguica']
    ]
  },
  {
    pergunta: 'Cite as oito selecoes que ja venceram a Copa do Mundo.',
    fixo: true, tema: 'futebol', dif: 75,
    respostas: [
      'Brasil', ['Alemanha', 'Alemanha Ocidental'], 'Italia', 'Argentina',
      ['Franca', 'Franca'], 'Uruguai', 'Inglaterra', 'Espanha'
    ]
  },
  {
    pergunta: 'Cite os dez paises que fazem fronteira com o Brasil.',
    fixo: true, tema: 'geografia', dif: 80,
    respostas: [
      'Argentina', 'Uruguai', 'Paraguai', 'Bolivia', 'Peru', 'Colombia',
      'Venezuela', 'Guiana', 'Suriname', ['Guiana Francesa', 'Franca']
    ]
  },

  /* ---------------------- repertórios abertos ---------------------- */
  {
    pergunta: 'Cite {n} planetas do Sistema Solar',
    minimo: 2, tema: 'ciencia', dif: 30,
    respostas: [
      ['Mercurio', 'Mercurio'], ['Venus', 'Venus'], 'Terra', 'Marte',
      ['Jupiter', 'Jupiter'], 'Saturno', 'Urano', 'Netuno'
    ]
  },
  {
    pergunta: 'Cite {n} paises da America do Sul',
    minimo: 2, tema: 'geografia', dif: 35,
    respostas: [
      'Brasil', 'Argentina', 'Chile', 'Uruguai', 'Paraguai', ['Bolivia', 'Bolivia'],
      'Peru', 'Equador', ['Colombia', 'Colombia'], 'Venezuela', 'Guiana', 'Suriname'
    ]
  },
  {
    pergunta: 'Cite {n} paises da Africa',
    minimo: 3, tema: 'geografia', dif: 50,
    respostas: [
      ['Nigeria', 'Nigeria'], 'Egito', ['Africa do Sul', 'Africa do Sul'],
      ['Quenia', 'Quenia'], ['Etiopia', 'Etiopia'], 'Gana', 'Marrocos',
      ['Argelia', 'Argelia'], 'Angola', ['Mocambique', 'Mocambique'],
      ['Tanzania', 'Tanzania'], 'Uganda', 'Senegal', ['Camaroes', 'Camaroes'],
      'Costa do Marfim', ['Tunisia', 'Tunisia'], ['Libia', 'Libia'], ['Sudao', 'Sudao'],
      ['Zimbabue', 'Zimbabue'], ['Zambia', 'Zambia'], ['Namibia', 'Namibia'],
      'Botsuana', 'Madagascar', 'Mali', ['Somalia', 'Somalia'], 'Ruanda',
      'Burundi', ['Chade', 'Tchade'], ['Niger', 'Niger'], 'Benim', 'Togo',
      ['Guine', 'Guine'], 'Serra Leoa', ['Liberia', 'Liberia'], ['Gabao', 'Gabao'],
      'Malawi', 'Lesoto', ['Mauritania', 'Mauritania'], 'Eritreia', 'Djibuti',
      'Burkina Faso', 'Cabo Verde', ['Gambia', 'Gambia'], ['Guine-Bissau', 'Guine Bissau'],
      ['Sao Tome e Principe', 'Sao Tome'], ['Sudao do Sul', 'Sudao do Sul'],
      ['Republica Centro-Africana', 'Republica Centro Africana'], 'Congo'
    ]
  },
  {
    pergunta: 'Cite {n} paises da Europa',
    minimo: 3, tema: 'geografia', dif: 45,
    respostas: [
      'Portugal', 'Espanha', ['Franca', 'Franca'], ['Italia', 'Italia'], 'Alemanha',
      ['Reino Unido', 'Inglaterra'], 'Irlanda', ['Paises Baixos', 'Holanda'],
      ['Belgica', 'Belgica'], 'Luxemburgo', ['Suica', 'Suica'], ['Austria', 'Austria'],
      'Dinamarca', ['Suecia', 'Suecia'], 'Noruega', ['Finlandia', 'Finlandia'],
      ['Islandia', 'Islandia'], ['Polonia', 'Polonia'], ['Republica Tcheca', 'Tchequia'],
      ['Eslovaquia', 'Eslovaquia'], 'Hungria', ['Romenia', 'Romenia'],
      ['Bulgaria', 'Bulgaria'], ['Grecia', 'Grecia'], ['Croacia', 'Croacia'],
      ['Servia', 'Servia'], ['Eslovenia', 'Eslovenia'], ['Bosnia', 'Bosnia'],
      'Montenegro', ['Macedonia do Norte', 'Macedonia'], ['Albania', 'Albania'],
      ['Ucrania', 'Ucrania'], ['Bielorrussia', 'Bielorrussia'], ['Russia', 'Russia'],
      ['Lituania', 'Lituania'], ['Letonia', 'Letonia'], ['Estonia', 'Estonia'],
      ['Moldavia', 'Moldavia'], 'Malta', 'Chipre', 'Andorra', ['Monaco', 'Monaco'],
      'San Marino', 'Liechtenstein', ['Vaticano', 'Cidade do Vaticano']
    ]
  },
  {
    pergunta: 'Cite {n} estados brasileiros',
    minimo: 3, tema: 'geografia', dif: 40,
    respostas: [
      ['Acre', 'AC'], ['Alagoas', 'AL'], ['Amapa', 'AP'], ['Amazonas', 'AM'],
      ['Bahia', 'BA'], ['Ceara', 'CE'], ['Espirito Santo', 'ES'], ['Goias', 'GO'],
      ['Maranhao', 'MA'], ['Mato Grosso', 'MT'], ['Mato Grosso do Sul', 'MS'],
      ['Minas Gerais', 'MG'], ['Para', 'PA'], ['Paraiba', 'PB'], ['Parana', 'PR'],
      ['Pernambuco', 'PE'], ['Piaui', 'PI'], ['Rio de Janeiro', 'RJ'],
      ['Rio Grande do Norte', 'RN'], ['Rio Grande do Sul', 'RS'], ['Rondonia', 'RO'],
      ['Roraima', 'RR'], ['Santa Catarina', 'SC'], ['Sao Paulo', 'SP'],
      ['Sergipe', 'SE'], ['Tocantins', 'TO'], ['Distrito Federal', 'DF']
    ]
  },
  {
    pergunta: 'Cite {n} esportes olimpicos',
    minimo: 3, tema: 'esportes', dif: 40,
    respostas: [
      'Atletismo', ['Natacao', 'Natacao'], ['Ginastica', 'Ginastica'], ['Judo', 'Judo'],
      ['Volei', 'Volei', 'Voleibol'], 'Basquete', 'Futebol', 'Handebol', 'Boxe',
      'Esgrima', 'Ciclismo', 'Remo', 'Canoagem', ['Tenis', 'Tenis'],
      ['Tenis de mesa', 'Tenis de mesa'], 'Badminton', 'Vela', 'Tiro com arco',
      'Halterofilismo', ['Luta', 'Wrestling'], 'Taekwondo', 'Triatlo', 'Hipismo',
      'Golfe', 'Rugby', 'Surfe', 'Skate', 'Escalada', 'Pentatlo moderno',
      ['Polo aquatico', 'Polo aquatico'], 'Saltos ornamentais', 'Nado artistico',
      ['Hoquei', 'Hoquei'], ['Karate', 'Karate'], 'Beisebol', 'Softbol', 'Breaking'
    ]
  },
  {
    pergunta: 'Cite {n} jogadores de futebol cujo nome comeca com a letra L',
    minimo: 2, tema: 'futebol', dif: 55,
    respostas: [
      ['Lionel Messi', 'Messi'], ['Luka Modric', 'Modric', 'Luka Modric'],
      ['Lewandowski', 'Robert Lewandowski'], ['Luis Suarez', 'Luis Suarez'],
      ['Lothar Matthaus', 'Lothar Matthaus'], ['Lampard', 'Frank Lampard'],
      ['Lahm', 'Philipp Lahm'], ['Lloris', 'Hugo Lloris'],
      ['Lukaku', 'Romelu Lukaku'], ['Lautaro Martinez', 'Lautaro'],
      ['Leonardo Bonucci', 'Bonucci'], ['Leroy Sane', 'Leroy Sane'],
      ['Luis Figo', 'Luis Figo', 'Figo'], ['Lorenzo Insigne', 'Insigne'],
      ['Lucas Moura'], ['Lisandro Martinez', 'Lisandro'], ['Luis Diaz', 'Luis Diaz'],
      ['Lamine Yamal', 'Yamal'], ['Leandro Paredes'], ['Laurent Blanc']
    ]
  },
  {
    pergunta: 'Cite {n} signos do zodiaco',
    minimo: 2, tema: 'gerais', dif: 35,
    respostas: [
      ['Aries', 'Aries'], 'Touro', ['Gemeos', 'Gemeos'], ['Cancer', 'Cancer'],
      ['Leao', 'Leao'], 'Virgem', 'Libra', ['Escorpiao', 'Escorpiao'],
      ['Sagitario', 'Sagitario'], ['Capricornio', 'Capricornio'],
      ['Aquario', 'Aquario'], 'Peixes'
    ]
  },
  {
    pergunta: 'Cite {n} cores do arco-iris',
    minimo: 2, tema: 'gerais', dif: 30,
    respostas: ['Vermelho', 'Laranja', 'Amarelo', 'Verde', 'Azul', 'Anil', 'Violeta']
  },
  {
    pergunta: 'Cite {n} meses do ano',
    minimo: 2, tema: 'gerais', dif: 20,
    respostas: [
      'Janeiro', 'Fevereiro', ['Marco', 'Marco'], 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
  },
  {
    pergunta: 'Cite {n} clubes brasileiros de futebol',
    tema: 'futebol', dif: 25,
    respostas: [
      ['Flamengo', 'Mengao', 'CRF'],
      ['Palmeiras', 'Verdao', 'Porco'],
      ['Corinthians', 'Timao'],
      ['Sao Paulo', 'Tricolor Paulista', 'SPFC'],
      ['Santos', 'Peixe'],
      ['Gremio', 'Imortal Tricolor'],
      ['Internacional', 'Inter', 'Colorado'],
      ['Cruzeiro', 'Raposa'],
      ['Atletico Mineiro', 'Atletico-MG', 'Galo'],
      ['Botafogo', 'Fogao', 'Glorioso'],
      ['Fluminense', 'Flu', 'Tricolor Carioca'],
      ['Vasco da Gama', 'Vasco', 'Gigante da Colina'],
      ['Bahia', 'Esquadrao de Aco'],
      ['Fortaleza', 'Leao do Pici'],
      ['Athletico Paranaense', 'Athletico-PR', 'Furacao'],
      ['Red Bull Bragantino', 'Bragantino', 'Massa Bruta'],
      ['Sport Recife', 'Sport', 'Leao da Ilha'],
      ['Nautico', 'Timbu'],
      ['Goias', 'Esmeraldino'],
      ['Coritiba', 'Coxa', 'Coxa Branca'],
      ['Vitoria', 'Leao da Barra'],
      ['Ceara', 'Vozao'],
      ['Juventude', 'Ju'],
      ['Criciuma', 'Tigre'],
      ['America Mineiro', 'America-MG', 'Coelho'],
      ['Atletico Goianiense', 'Atletico-GO', 'Dragao'],
      ['Cuiaba', 'Dourado'],
      ['Chapecoense', 'Chape'],
      ['Ponte Preta', 'Macaca'],
      ['Guarani', 'Bugre'],
      ['Avai', 'Leao da Ilha de Santa Catarina'],
      ['Figueirense', 'Figueira'],
      ['Paysandu', 'Papao'],
      ['Remo', 'Leao Azul'],
      ['Santa Cruz', 'Cobra Coral'],
      ['Portuguesa', 'Lusa'],
      ['Mirassol', 'Leao'],
      ['Novorizontino', 'Tigre do Vale'],
      ['Operario', 'Fantasma'],
      ['Sampaio Correa', 'Bolivia Querida']
    ]
  },
  {
    pergunta: 'Cite {n} elementos quimicos',
    minimo: 2, tema: 'ciencia', dif: 45,
    respostas: [
      ['Hidrogenio', 'Hidrogenio'], ['Helio', 'Helio'], ['Litio', 'Litio'],
      ['Carbono'], ['Nitrogenio', 'Nitrogenio'], ['Oxigenio', 'Oxigenio'],
      ['Fluor', 'Fluor'], ['Sodio', 'Sodio'], ['Magnesio', 'Magnesio'],
      ['Aluminio', 'Aluminio'], ['Silicio', 'Silicio'], ['Fosforo', 'Fosforo'],
      'Enxofre', 'Cloro', ['Potassio', 'Potassio'], ['Calcio', 'Calcio'],
      'Ferro', 'Cobre', 'Zinco', 'Prata', 'Ouro', ['Mercurio', 'Mercurio'],
      'Chumbo', ['Uranio', 'Uranio'], ['Neonio', 'Neonio'], ['Titanio', 'Titanio'],
      ['Niquel', 'Niquel'], ['Estanho'], ['Bario', 'Bario'], ['Iodo']
    ]
  },
  {
    pergunta: 'Cite {n} instrumentos musicais',
    minimo: 2, tema: 'musica', dif: 25,
    respostas: [
      ['Violao', 'Violao'], 'Guitarra', 'Piano', 'Bateria', 'Baixo', 'Violino',
      'Flauta', ['Saxofone', 'Sax'], 'Trompete', 'Violoncelo', 'Harpa', 'Clarinete',
      ['Acordeao', 'Acordeao', 'Sanfona'], 'Pandeiro', ['Cavaquinho'], 'Trombone',
      ['Orgao', 'Orgao'], 'Ukulele', ['Berimbau'], ['Tuba'], ['Oboe', 'Oboe']
    ]
  },
  {
    pergunta: 'Cite {n} personagens de One Piece',
    minimo: 2, tema: 'anime', dif: 60,
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
    minimo: 2, tema: 'cinema', dif: 40,
    respostas: [
      ['Homem de Ferro', 'Iron Man'], ['Vingadores', 'Avengers'],
      ['Capitao America', 'Capitao America'], ['Thor'], ['Hulk'],
      ['Guardioes da Galaxia', 'Guardioes da Galaxia'], ['Pantera Negra', 'Black Panther'],
      ['Doutor Estranho', 'Doutor Strange'], ['Homem-Formiga', 'Homem Formiga'],
      ['Capita Marvel', 'Capita Marvel'], ['Homem-Aranha', 'Homem Aranha', 'Spider-Man'],
      ['Ultimato', 'Endgame'], ['Guerra Infinita', 'Infinity War'],
      ['Eternos', 'Eternals'], ['Shang-Chi', 'Shang Chi'], ['Deadpool'],
      ['Viuva Negra', 'Viuva Negra'], ['Wandavision']
    ]
  },
  {
    pergunta: 'Cite {n} capitais de paises da America do Sul',
    minimo: 2, tema: 'geografia', dif: 55,
    respostas: [
      ['Brasilia', 'Brasilia'], 'Buenos Aires', 'Santiago', 'Montevideu',
      ['Assuncao', 'Assuncao'], ['La Paz'], 'Lima', 'Quito', ['Bogota', 'Bogota'],
      'Caracas', 'Georgetown', 'Paramaribo'
    ]
  },
  {
    pergunta: 'Cite {n} bandas de rock internacionais',
    tema: 'musica', dif: 30,
    respostas: [
      'Queen',
      ['The Beatles', 'Beatles'],
      'Led Zeppelin',
      'Pink Floyd',
      ['The Rolling Stones', 'Rolling Stones'],
      'Nirvana',
      'Metallica',
      ['AC/DC', 'ACDC'],
      ['Guns N\' Roses', 'Guns and Roses', 'Guns'],
      'U2',
      'Radiohead',
      'Coldplay',
      ['Red Hot Chili Peppers', 'RHCP'],
      'Pearl Jam',
      'Black Sabbath',
      'Iron Maiden',
      'The Who',
      'Oasis',
      'Linkin Park',
      'Green Day',
      'The Doors',
      'Deep Purple',
      'Aerosmith',
      'Foo Fighters',
      'Arctic Monkeys',
      'Muse',
      'The Killers',
      'Imagine Dragons',
      ['Blink-182', 'Blink 182'],
      'System of a Down',
      'Slipknot',
      'Rammstein',
      'Scorpions',
      'Kiss',
      'The Police',
      'Genesis',
      'Dire Straits',
      'Bon Jovi',
      'Maroon 5',
      'Paramore',
      'Nickelback',
      'Evanescence',
      ['Thirty Seconds to Mars', '30 Seconds to Mars'],
      ['Panic! at the Disco', 'Panic at the Disco'],
      'Fall Out Boy',
      ['My Chemical Romance', 'MCR'],
      'Weezer',
      'Pixies',
      'The Smiths',
      'Joy Division',
      'The Cure',
      'Blur',
      'Gorillaz',
      'Franz Ferdinand',
      'The Strokes',
      'Kings of Leon',
      'Interpol',
      'Tame Impala',
      ['Twenty One Pilots', '21 Pilots'],
      'Nine Inch Nails',
      'Alice in Chains',
      'Soundgarden',
      'Stone Temple Pilots',
      'Creed',
      'Audioslave',
      'Rage Against the Machine',
      'Megadeth',
      'Slayer',
      'Anthrax',
      'Judas Priest',
      'Motorhead',
      'The Beach Boys',
      'Eagles',
      'Fleetwood Mac',
      'Toto',
      'Journey',
      ['REM', 'R.E.M.'],
      'Talking Heads'
    ]
  },
  {
    pergunta: 'Cite {n} bandas brasileiras',
    tema: 'musica', dif: 35,
    respostas: [
      ['Legiao Urbana', 'Legiao'],
      'Titas',
      'Capital Inicial',
      ['Barao Vermelho', 'Barao'],
      ['Paralamas do Sucesso', 'Paralamas'],
      ['Engenheiros do Hawaii', 'Engenheiros'],
      'Skank',
      'Jota Quest',
      'O Rappa',
      ['Charlie Brown Jr', 'Charlie Brown Junior', 'CBJR'],
      'Raimundos',
      'Sepultura',
      'Angra',
      ['Cansei de Ser Sexy', 'CSS'],
      'Los Hermanos',
      ['Nando Reis e os Infernais', 'Nando Reis'],
      'Pitty',
      'Detonautas',
      ['NX Zero', 'NXZero'],
      'Fresno',
      ['CPM 22', 'CPM22'],
      ['Ira!', 'Ira'],
      'Kid Abelha',
      ['Ultraje a Rigor', 'Ultraje'],
      'Blitz',
      'RPM',
      'Cidade Negra',
      'Natiruts',
      'Tribalistas',
      ['Mamonas Assassinas', 'Mamonas'],
      ['Charlie Brown Jr.', 'Charlie Brown Junior'],
      'Matanza',
      'Nacao Zumbi',
      ['Mundo Livre S/A', 'Mundo Livre'],
      'Planet Hemp',
      'O Terco',
      'Secos e Molhados',
      ['Mutantes', 'Os Mutantes'],
      'Novos Baianos',
      'Casuarina',
      'Vanguart',
      'Scalene',
      'Malta',
      'Maneva',
      ['Onze:20', 'Onze 20'],
      'Armandinho',
      'Ponto de Equilibrio',
      ['Biquini Cavadao', 'Biquini'],
      'Roupa Nova',
      '14 Bis',
      'Camisa de Venus',
      'Inocentes',
      'Ratos de Porao',
      'Krisiun'
    ]
  },
  {
    pergunta: 'Cite {n} herois da Marvel',
    tema: 'cinema', dif: 25,
    respostas: [
      ['Homem de Ferro', 'Iron Man'],
      'Capitao America',
      'Thor',
      'Hulk',
      ['Viuva Negra', 'Black Widow'],
      ['Gaviao Arqueiro', 'Hawkeye'],
      ['Homem-Aranha', 'Homem Aranha', 'Spider-Man'],
      ['Doutor Estranho', 'Doutor Strange'],
      ['Pantera Negra', 'Black Panther'],
      'Capita Marvel',
      ['Feiticeira Escarlate', 'Wanda'],
      'Visao',
      'Wolverine',
      'Deadpool',
      ['Homem-Formiga', 'Homem Formiga', 'Ant-Man'],
      'Groot',
      ['Rocket Raccoon', 'Rocket'],
      ['Star-Lord', 'Star Lord'],
      'Falcao',
      ['Soldado Invernal', 'Bucky']
    ]
  },
  {
    pergunta: 'Cite {n} herois da DC',
    tema: 'cinema', dif: 35,
    respostas: [
      ['Superman', 'Super-Homem'],
      'Batman',
      ['Mulher-Maravilha', 'Mulher Maravilha'],
      'Flash',
      'Aquaman',
      'Lanterna Verde',
      ['Ciborgue', 'Cyborg'],
      'Robin',
      'Batgirl',
      ['Arqueiro Verde', 'Arrow'],
      'Shazam',
      'Supergirl',
      'Nightwing',
      ['Mulher-Gato', 'Mulher Gato', 'Catwoman'],
      'Constantine',
      'Zatanna'
    ]
  },
  {
    pergunta: 'Cite {n} viloes da DC',
    tema: 'cinema', dif: 45,
    respostas: [
      ['Coringa', 'Joker'],
      'Lex Luthor',
      'Pinguim',
      ['Charada', 'Riddler'],
      ['Duas-Caras', 'Duas Caras'],
      'Espantalho',
      'Bane',
      'Hera Venenosa',
      ['Arlequina', 'Harley Quinn'],
      'Darkseid',
      'Deathstroke',
      'Ra\'s al Ghul'
    ]
  },
  {
    pergunta: 'Cite {n} filmes da saga Star Wars',
    tema: 'cinema', dif: 50,
    respostas: [
      ['Uma Nova Esperanca', 'Star Wars Episodio IV'],
      'O Imperio Contra-Ataca',
      'O Retorno de Jedi',
      'A Ameaca Fantasma',
      'Ataque dos Clones',
      'A Vinganca dos Sith',
      'O Despertar da Forca',
      'Os Ultimos Jedi',
      'A Ascensao Skywalker',
      'Rogue One',
      'Han Solo'
    ]
  },
  {
    pergunta: 'Cite {n} series famosas da Netflix',
    tema: 'cinema', dif: 35,
    respostas: [
      'Stranger Things',
      ['La Casa de Papel', 'Casa de Papel'],
      'Dark',
      ['Round 6', 'Squid Game'],
      'The Crown',
      'Black Mirror',
      'O Gambito da Rainha',
      'Narcos',
      'Ozark',
      'Bridgerton',
      ['Wandinha', 'Wednesday'],
      'You',
      'Lupin',
      'Sex Education',
      'Elite',
      '3%'
    ]
  },
  {
    pergunta: 'Cite {n} animes famosos',
    tema: 'anime', dif: 30,
    respostas: [
      'Naruto',
      'One Piece',
      'Dragon Ball',
      'Bleach',
      ['Attack on Titan', 'Shingeki no Kyojin'],
      'Death Note',
      ['Demon Slayer', 'Kimetsu no Yaiba'],
      'Jujutsu Kaisen',
      ['My Hero Academia', 'Boku no Hero'],
      'Fullmetal Alchemist',
      'Hunter x Hunter',
      'Tokyo Ghoul',
      ['Sword Art Online', 'SAO'],
      'One Punch Man',
      'Cavaleiros do Zodiaco',
      'Yu Yu Hakusho',
      ['Pokemon', 'Pokemon'],
      'Evangelion',
      'Cowboy Bebop',
      'Haikyuu'
    ]
  },
  {
    pergunta: 'Cite {n} personagens de Naruto',
    tema: 'anime', dif: 40,
    respostas: [
      ['Naruto', 'Naruto Uzumaki'],
      ['Sasuke', 'Sasuke Uchiha'],
      ['Sakura', 'Sakura Haruno'],
      ['Kakashi', 'Kakashi Hatake'],
      'Hinata',
      'Shikamaru',
      'Rock Lee',
      'Neji',
      'Gaara',
      'Itachi',
      'Jiraiya',
      'Tsunade',
      'Orochimaru',
      'Madara',
      'Obito',
      ['Pain', 'Nagato'],
      'Kiba',
      'Choji',
      'Ino',
      'Minato'
    ]
  },
  {
    pergunta: 'Cite {n} personagens de Dragon Ball',
    tema: 'anime', dif: 40,
    respostas: [
      'Goku',
      'Vegeta',
      'Gohan',
      'Piccolo',
      'Bulma',
      ['Krilin', 'Kuririn'],
      'Trunks',
      ['Freeza', 'Frieza'],
      'Cell',
      ['Majin Boo', 'Buu'],
      ['Mestre Kame', 'Roshi'],
      ['Chi-Chi', 'Chichi'],
      'Beerus',
      'Whis',
      'Yamcha',
      'Tenshinhan'
    ]
  },
  {
    pergunta: 'Cite {n} jogos da Nintendo',
    tema: 'games', dif: 40,
    respostas: [
      'Super Mario',
      ['The Legend of Zelda', 'Zelda'],
      'Mario Kart',
      ['Pokemon', 'Pokemon'],
      'Metroid',
      'Donkey Kong',
      ['Super Smash Bros', 'Smash Bros'],
      'Animal Crossing',
      'Splatoon',
      'Kirby',
      'Fire Emblem',
      'Star Fox',
      'Pikmin',
      ['Luigi\'s Mansion', 'Luigis Mansion'],
      'Wii Sports'
    ]
  },
  {
    pergunta: 'Cite {n} consoles de videogame',
    tema: 'games', dif: 35,
    respostas: [
      'PlayStation',
      'Xbox',
      ['Nintendo Switch', 'Switch'],
      ['Nintendo 64', 'N64'],
      ['Super Nintendo', 'SNES'],
      ['Mega Drive', 'Genesis'],
      'Master System',
      'Game Boy',
      'Nintendo DS',
      'Wii',
      'GameCube',
      ['PlayStation 2', 'PS2'],
      'Dreamcast',
      ['Atari 2600', 'Atari'],
      'PSP',
      ['Nintendo 3DS', '3DS']
    ]
  },
  {
    pergunta: 'Cite {n} presidentes do Brasil',
    tema: 'historia', dif: 40,
    respostas: [
      ['Getulio Vargas', 'Getulio'],
      ['Juscelino Kubitschek', 'JK'],
      ['Joao Goulart', 'Jango'],
      'Janio Quadros',
      ['Fernando Collor', 'Collor'],
      ['Itamar Franco', 'Itamar'],
      ['Fernando Henrique Cardoso', 'FHC'],
      ['Lula', 'Luiz Inacio Lula da Silva'],
      ['Dilma Rousseff', 'Dilma'],
      ['Michel Temer', 'Temer'],
      ['Jair Bolsonaro', 'Bolsonaro'],
      ['Deodoro da Fonseca', 'Deodoro'],
      'Floriano Peixoto',
      'Castelo Branco'
    ]
  },
  {
    pergunta: 'Cite {n} orgaos do corpo humano',
    tema: 'ciencia', dif: 30,
    respostas: [
      'Coracao',
      'Pulmao',
      'Figado',
      'Rim',
      'Estomago',
      'Intestino',
      'Cerebro',
      'Pancreas',
      'Baco',
      'Bexiga',
      'Pele',
      'Esofago',
      'Vesicula',
      'Utero',
      'Tireoide'
    ]
  },
  {
    pergunta: 'Cite {n} paises da Asia',
    tema: 'geografia', dif: 30,
    respostas: [
      'China',
      'Japao',
      'India',
      'Coreia do Sul',
      'Coreia do Norte',
      'Tailandia',
      'Vietna',
      'Indonesia',
      'Filipinas',
      'Malasia',
      'Cingapura',
      'Paquistao',
      'Bangladesh',
      'Nepal',
      'Mongolia',
      'Camboja',
      'Laos',
      'Mianmar',
      'Sri Lanka',
      'Cazaquistao',
      'Ira',
      'Iraque',
      'Arabia Saudita',
      'Israel',
      'Turquia'
    ]
  },
  {
    pergunta: 'Cite {n} capitais europeias',
    tema: 'geografia', dif: 40,
    respostas: [
      'Lisboa',
      'Madri',
      'Paris',
      'Londres',
      'Roma',
      'Berlim',
      'Viena',
      'Bruxelas',
      'Amsterda',
      'Estocolmo',
      'Oslo',
      'Copenhague',
      'Helsinque',
      'Dublin',
      'Atenas',
      'Varsovia',
      'Praga',
      'Budapeste',
      'Bucareste',
      'Moscou',
      'Berna',
      'Zagreb'
    ]
  },
  {
    pergunta: 'Cite {n} marcas de carro',
    tema: 'mainstream', dif: 25,
    respostas: [
      ['Volkswagen', 'VW'],
      'Fiat',
      'Chevrolet',
      'Ford',
      'Toyota',
      'Honda',
      'Hyundai',
      'Renault',
      'Nissan',
      'Peugeot',
      ['Citroen', 'Citroen'],
      'BMW',
      ['Mercedes-Benz', 'Mercedes'],
      'Audi',
      'Ferrari',
      'Porsche',
      'Lamborghini',
      'Jeep',
      'Volvo',
      'Kia',
      'Mitsubishi',
      'Tesla'
    ]
  },
  {
    pergunta: 'Cite {n} redes sociais ou aplicativos famosos',
    tema: 'mainstream', dif: 20,
    respostas: [
      'Instagram',
      'WhatsApp',
      'Facebook',
      'TikTok',
      ['Twitter', 'X'],
      'YouTube',
      'LinkedIn',
      'Snapchat',
      'Telegram',
      'Pinterest',
      'Reddit',
      'Discord',
      'Twitch',
      'Spotify',
      'Netflix',
      'Uber'
    ]
  },
  {
    pergunta: 'Cite {n} generos musicais',
    tema: 'musica', dif: 25,
    respostas: [
      'Rock',
      'Pop',
      'Samba',
      'Sertanejo',
      'Funk',
      'Forro',
      'MPB',
      'Pagode',
      'Rap',
      'Hip Hop',
      'Jazz',
      'Blues',
      'Reggae',
      'Country',
      'Eletronica',
      'Bossa Nova',
      'Axe',
      ['Heavy Metal', 'Metal'],
      'Punk',
      'Classica'
    ]
  },
  {
    pergunta: 'Cite {n} pratos tipicos brasileiros',
    tema: 'mainstream', dif: 30,
    respostas: [
      'Feijoada',
      'Moqueca',
      'Acaraje',
      'Pao de queijo',
      'Coxinha',
      'Brigadeiro',
      'Vatapa',
      'Tapioca',
      'Baiao de dois',
      'Churrasco',
      'Farofa',
      'Bobo de camarao',
      'Escondidinho',
      'Pastel',
      'Cuscuz',
      'Acai'
    ]
  },
  {
    pergunta: 'Cite {n} times de futebol europeus',
    tema: 'futebol', dif: 30,
    respostas: [
      'Real Madrid',
      'Barcelona',
      'Manchester United',
      'Manchester City',
      'Liverpool',
      'Chelsea',
      'Arsenal',
      'Tottenham',
      ['Bayern de Munique', 'Bayern'],
      ['Borussia Dortmund', 'Dortmund'],
      'Juventus',
      'Milan',
      ['Inter de Milao', 'Inter de Milao', 'Internazionale'],
      'Napoli',
      'Roma',
      ['Paris Saint-Germain', 'PSG'],
      'Ajax',
      'Porto',
      'Benfica',
      'Sporting',
      ['Atletico de Madrid', 'Atletico Madrid']
    ]
  },
  {
    pergunta: 'Cite {n} esportes jogados com bola',
    tema: 'esportes', dif: 25,
    respostas: [
      'Futebol',
      'Basquete',
      ['Volei', 'Volei'],
      'Handebol',
      'Tenis',
      'Golfe',
      'Rugby',
      'Beisebol',
      'Futsal',
      'Polo aquatico',
      'Boliche',
      ['Tenis de mesa', 'Ping pong']
    ]
  },
  {
    pergunta: 'Cite {n} esportes de luta',
    tema: 'esportes', dif: 35,
    respostas: [
      'Boxe',
      'Judo',
      'Karate',
      ['Jiu-jitsu', 'Jiu jitsu'],
      'Muay thai',
      'Taekwondo',
      ['Luta livre', 'Wrestling'],
      'MMA',
      'Capoeira',
      'Esgrima',
      ['Sumo', 'Sumo']
    ]
  },
  {
    pergunta: 'Cite {n} esportes aquaticos',
    tema: 'esportes', dif: 40,
    respostas: [
      'Natacao',
      ['Surfe', 'Surf'],
      'Polo aquatico',
      'Remo',
      'Canoagem',
      'Vela',
      'Mergulho',
      'Nado sincronizado',
      'Saltos ornamentais',
      'Stand up paddle'
    ]
  },
  {
    pergunta: 'Cite {n} posicoes do futebol',
    tema: 'futebol', dif: 25,
    respostas: [
      'Goleiro',
      'Zagueiro',
      'Lateral',
      'Volante',
      ['Meia', 'Meio-campista'],
      'Atacante',
      'Ponta',
      'Centroavante'
    ]
  },
  {
    pergunta: 'Cite {n} personagens de Harry Potter',
    tema: 'cinema', dif: 30,
    respostas: [
      ['Harry Potter', 'Harry'],
      ['Hermione', 'Hermione Granger'],
      ['Rony', 'Ron', 'Rony Weasley'],
      'Dumbledore',
      'Snape',
      'Voldemort',
      'Hagrid',
      ['Draco Malfoy', 'Draco', 'Malfoy'],
      ['Sirius Black', 'Sirius'],
      'McGonagall',
      'Dobby',
      ['Luna Lovegood', 'Luna']
    ]
  },
  {
    pergunta: 'Cite {n} filmes de super-heroi',
    tema: 'cinema', dif: 25,
    respostas: [
      ['Vingadores', 'Os Vingadores'],
      'Homem de Ferro',
      'Batman',
      'Superman',
      ['Homem-Aranha', 'Homem Aranha'],
      'Pantera Negra',
      ['Mulher-Maravilha', 'Mulher Maravilha'],
      'Thor',
      'Capitao America',
      'Deadpool',
      'Aquaman',
      'Liga da Justica',
      'Coringa',
      'Logan'
    ]
  },
  {
    pergunta: 'Cite {n} personagens de Pokemon',
    tema: 'anime', dif: 35,
    respostas: [
      'Pikachu',
      'Charizard',
      'Bulbasaur',
      'Squirtle',
      'Charmander',
      'Mewtwo',
      'Mew',
      'Eevee',
      'Snorlax',
      'Gengar',
      'Jigglypuff',
      'Psyduck'
    ]
  },
  {
    pergunta: 'Cite {n} jogos de tiro',
    tema: 'games', dif: 35,
    respostas: [
      ['Counter-Strike', 'CS'],
      ['Call of Duty', 'COD'],
      'Valorant',
      'Overwatch',
      'Battlefield',
      'Doom',
      'Halo',
      'Rainbow Six',
      ['Apex Legends', 'Apex'],
      'Fortnite',
      'PUBG'
    ]
  },
  {
    pergunta: 'Cite {n} planetas rochosos ou gasosos do Sistema Solar',
    tema: 'ciencia', dif: 25,
    respostas: [
      'Mercurio',
      'Venus',
      'Terra',
      'Marte',
      'Jupiter',
      'Saturno',
      'Urano',
      'Netuno'
    ]
  },
  {
    pergunta: 'Cite {n} sentidos do corpo humano',
    tema: 'ciencia', dif: 20,
    respostas: [
      'Visao',
      'Audicao',
      'Olfato',
      'Paladar',
      'Tato'
    ]
  },
  {
    pergunta: 'Cite {n} cantores brasileiros',
    tema: 'musica', dif: 35,
    respostas: [
      ['Caetano Veloso', 'Caetano'],
      'Gilberto Gil',
      ['Chico Buarque', 'Chico'],
      'Roberto Carlos',
      ['Elis Regina', 'Elis'],
      'Cazuza',
      'Renato Russo',
      ['Ivete Sangalo', 'Ivete'],
      'Anitta',
      'Marisa Monte',
      'Djavan',
      'Alcione',
      'Gal Costa',
      'Milton Nascimento'
    ]
  },
  {
    pergunta: 'Cite {n} capitais do Nordeste brasileiro',
    tema: 'geografia', dif: 40,
    respostas: [
      'Salvador',
      'Recife',
      'Fortaleza',
      'Natal',
      'Joao Pessoa',
      'Maceio',
      'Aracaju',
      'Teresina',
      'Sao Luis'
    ]
  },
  {
    pergunta: 'Cite {n} imperadores ou presidentes que governaram o Brasil no seculo XX',
    tema: 'historia', dif: 55,
    respostas: [
      ['Getulio Vargas', 'Getulio'],
      ['Juscelino Kubitschek', 'JK'],
      ['Joao Goulart', 'Jango'],
      'Janio Quadros',
      'Castelo Branco',
      ['Ernesto Geisel', 'Geisel'],
      ['Joao Figueiredo', 'Figueiredo'],
      ['Jose Sarney', 'Sarney'],
      ['Fernando Collor', 'Collor'],
      ['Itamar Franco', 'Itamar'],
      ['Fernando Henrique Cardoso', 'FHC']
    ]
  },
  {
    pergunta: 'Cite {n} marcas de celular',
    tema: 'mainstream', dif: 25,
    respostas: [
      ['Apple', 'iPhone'],
      'Samsung',
      'Motorola',
      'Xiaomi',
      'LG',
      'Nokia',
      'Huawei',
      'Sony',
      'Asus',
      'Realme'
    ]
  },
  {
    pergunta: 'Cite {n} partes do corpo humano',
    tema: 'ciencia', dif: 15,
    respostas: [
      'Cabeca',
      'Braco',
      'Perna',
      'Mao',
      'Pe',
      'Olho',
      'Nariz',
      'Boca',
      'Orelha',
      'Joelho',
      'Cotovelo',
      'Ombro',
      'Costas',
      'Barriga',
      'Pescoco',
      'Dedo',
      'Tornozelo',
      'Pulso',
      'Quadril',
      'Testa'
    ]
  },
  {
    pergunta: 'Cite {n} ossos do corpo humano',
    tema: 'ciencia', dif: 45,
    respostas: [
      'Femur',
      'Tibia',
      'Fibula',
      'Umero',
      'Radio',
      'Ulna',
      'Cranio',
      'Costela',
      'Coluna',
      'Escapula',
      'Clavicula',
      'Esterno',
      'Bacia',
      'Rotula',
      'Mandibula'
    ]
  },
  {
    pergunta: 'Cite {n} alimentos de origem animal',
    tema: 'comidas', dif: 25,
    respostas: [
      'Leite',
      'Queijo',
      'Ovo',
      'Manteiga',
      'Iogurte',
      'Mel',
      'Carne',
      'Frango',
      'Peixe',
      'Bacon',
      'Presunto',
      'Requeijao',
      'Creme de leite',
      'Linguica'
    ]
  },
  {
    pergunta: 'Cite {n} animais domesticos',
    tema: 'animais', dif: 20,
    respostas: [
      ['Cachorro', 'cao'],
      'Gato',
      ['Passaro', 'passarinho'],
      'Peixe',
      'Hamster',
      'Coelho',
      'Papagaio',
      'Tartaruga',
      'Porquinho-da-india',
      'Cavalo',
      'Galinha',
      'Vaca'
    ]
  },
  {
    pergunta: 'Cite {n} animais da fazenda',
    tema: 'animais', dif: 20,
    respostas: [
      'Vaca',
      'Galinha',
      'Porco',
      'Cavalo',
      'Ovelha',
      'Cabra',
      'Pato',
      'Ganso',
      'Peru',
      'Boi',
      'Burro',
      'Coelho'
    ]
  },
  {
    pergunta: 'Cite {n} animais selvagens',
    tema: 'animais', dif: 20,
    respostas: [
      'Leao',
      'Tigre',
      'Elefante',
      'Girafa',
      'Zebra',
      'Urso',
      'Lobo',
      'Macaco',
      'Rinoceronte',
      'Hipopotamo',
      'Crocodilo',
      'Onca',
      'Leopardo',
      'Hiena',
      'Gorila',
      'Bufalo'
    ]
  },
  {
    pergunta: 'Cite {n} programas ou aplicativos de computador',
    tema: 'mainstream', dif: 25,
    respostas: [
      'Word',
      'Excel',
      'PowerPoint',
      'Photoshop',
      'Chrome',
      'Firefox',
      'Windows',
      'Paint',
      'Zoom',
      'Skype',
      'Spotify',
      'Steam',
      'Discord',
      'VLC',
      ['Notepad', 'bloco de notas']
    ]
  },
  {
    pergunta: 'Cite {n} marcas famosas',
    tema: 'mainstream', dif: 15,
    respostas: [
      'Nike',
      'Adidas',
      'Apple',
      'Samsung',
      ['Coca-Cola', 'coca cola'],
      'Pepsi',
      ['McDonalds', 'mc donalds'],
      'Google',
      'Amazon',
      'Sony',
      'Microsoft',
      'Puma',
      'Havaianas',
      'Nestle',
      'Netflix',
      'Disney',
      'Lego',
      'Gucci'
    ]
  },
  {
    pergunta: 'Cite {n} pecas de roupa',
    tema: 'mainstream', dif: 15,
    respostas: [
      'Camiseta',
      'Calca',
      'Bermuda',
      'Vestido',
      'Saia',
      'Blusa',
      'Casaco',
      'Jaqueta',
      'Meia',
      'Sapato',
      'Tenis',
      'Chinelo',
      'Bone',
      'Cinto',
      'Short',
      'Moletom',
      'Camisa',
      'Sunga',
      'Biquini',
      'Cachecol'
    ]
  },
  {
    pergunta: 'Cite {n} cores',
    tema: 'gerais', dif: 12,
    respostas: [
      'Azul',
      'Vermelho',
      'Amarelo',
      'Verde',
      'Preto',
      'Branco',
      'Roxo',
      'Rosa',
      'Laranja',
      'Marrom',
      'Cinza',
      'Bege',
      'Dourado',
      'Prateado',
      'Violeta',
      'Turquesa'
    ]
  },
  {
    pergunta: 'Cite {n} filmes famosos',
    tema: 'cinema', dif: 20,
    respostas: [
      'Titanic',
      'Avatar',
      'Vingadores',
      'Star Wars',
      'O Senhor dos Aneis',
      'Harry Potter',
      'Jurassic Park',
      'O Rei Leao',
      'Matrix',
      'Batman',
      ['Homem-Aranha', 'homem aranha'],
      'Toy Story',
      'Frozen',
      'Piratas do Caribe',
      'Velozes e Furiosos',
      'O Poderoso Chefao',
      'Forrest Gump',
      'Pulp Fiction'
    ]
  },
  {
    pergunta: 'Cite {n} filmes vencedores do Oscar de Melhor Filme',
    tema: 'cinema', dif: 55,
    respostas: [
      'Titanic',
      'Parasita',
      'Oppenheimer',
      'Gladiador',
      ['O Senhor dos Aneis: O Retorno do Rei', 'O Retorno do Rei'],
      'A Lista de Schindler',
      'O Silencio dos Inocentes',
      'Forrest Gump',
      'O Poderoso Chefao',
      'Rocky',
      'Beleza Americana',
      ['Coragem de um Povo', 'Braveheart'],
      '12 Anos de Escravidao',
      'Green Book',
      'Birdman',
      'O Artista',
      'Spotlight',
      'Moonlight',
      'Tudo em Todo Lugar ao Mesmo Tempo'
    ]
  },
  {
    pergunta: 'Cite {n} series de TV famosas',
    tema: 'cinema', dif: 20,
    respostas: [
      'Friends',
      'Breaking Bad',
      'Game of Thrones',
      'The Office',
      'Stranger Things',
      ['Grey’s Anatomy', 'greys anatomy'],
      'Lost',
      'Prison Break',
      'The Walking Dead',
      'How I Met Your Mother',
      'Sherlock',
      ['Dr. House', 'House'],
      'Supernatural',
      'Modern Family',
      'Dark',
      'Peaky Blinders',
      'Better Call Saul',
      'La Casa de Papel',
      'Chaves',
      'Os Simpsons'
    ]
  },
  {
    pergunta: 'Cite {n} jutsus ou tecnicas de Naruto',
    tema: 'anime', dif: 50,
    respostas: [
      'Rasengan',
      'Chidori',
      ['Clones das Sombras', 'kage bunshin'],
      'Sharingan',
      'Byakugan',
      ['Bola de Fogo', 'katon'],
      'Amaterasu',
      'Susanoo',
      'Kamui',
      ['Modo Sabio', 'sennin mode'],
      'Rasenshuriken',
      'Edo Tensei',
      ['Sexy Jutsu', 'jutsu sexy']
    ]
  },
  {
    pergunta: 'Cite {n} capitais da Asia',
    tema: 'geografia', dif: 45,
    respostas: [
      'Toquio',
      'Pequim',
      'Seul',
      'Nova Delhi',
      'Bangcoc',
      'Hanoi',
      'Jacarta',
      'Manila',
      'Kuala Lumpur',
      'Singapura',
      'Islamabade',
      'Cabul',
      'Teera',
      'Bagda',
      'Riade',
      'Ancara'
    ]
  },
  {
    pergunta: 'Cite {n} capitais da Africa',
    tema: 'geografia', dif: 60,
    respostas: [
      'Cairo',
      'Pretoria',
      'Nairobi',
      'Abuja',
      'Argel',
      'Rabat',
      'Tunis',
      'Adis Abeba',
      'Acra',
      'Dacar',
      'Luanda',
      'Maputo',
      'Harare',
      'Kampala',
      'Tripoli'
    ]
  },
  {
    pergunta: 'Cite {n} capitais mundiais',
    tema: 'geografia', dif: 30,
    respostas: [
      'Brasilia',
      'Washington',
      'Londres',
      'Paris',
      'Berlim',
      'Roma',
      'Madri',
      'Lisboa',
      'Moscou',
      'Pequim',
      'Toquio',
      'Camberra',
      'Ottawa',
      'Cidade do Mexico',
      'Buenos Aires',
      'Santiago',
      'Lima',
      'Bogota',
      'Cairo',
      'Nova Delhi',
      'Seul',
      'Atenas',
      'Viena',
      'Estocolmo',
      'Oslo',
      'Dublin',
      'Varsovia',
      'Praga',
      'Amsterda',
      'Bruxelas'
    ]
  },
  {
    pergunta: 'Cite {n} capitais de estados brasileiros',
    tema: 'geografia', dif: 30,
    respostas: [
      'Sao Paulo',
      'Rio de Janeiro',
      'Belo Horizonte',
      'Salvador',
      'Fortaleza',
      'Recife',
      'Porto Alegre',
      'Curitiba',
      'Manaus',
      'Belem',
      'Goiania',
      'Florianopolis',
      'Vitoria',
      'Natal',
      'Joao Pessoa',
      'Maceio',
      'Aracaju',
      'Teresina',
      'Sao Luis',
      'Cuiaba',
      'Campo Grande',
      'Palmas',
      'Macapa',
      'Boa Vista',
      'Porto Velho',
      'Rio Branco'
    ]
  },
  {
    pergunta: 'Cite {n} pontos turisticos do mundo',
    tema: 'lugares', dif: 30,
    respostas: [
      'Torre Eiffel',
      'Coliseu',
      'Cristo Redentor',
      'Muralha da China',
      'Machu Picchu',
      'Taj Mahal',
      ['Piramides de Gize', 'piramides'],
      'Estatua da Liberdade',
      'Big Ben',
      'Sagrada Familia',
      'Torre de Pisa',
      'Stonehenge',
      'Partenon',
      'Petra',
      'Chichen Itza',
      'Opera de Sydney',
      'Times Square',
      'Louvre'
    ]
  },
  {
    pergunta: 'Cite {n} lugares famosos do Brasil',
    tema: 'lugares', dif: 35,
    respostas: [
      'Cristo Redentor',
      'Pao de Acucar',
      'Cataratas do Iguacu',
      ['Praia de Copacabana', 'Copacabana'],
      'Lencois Maranhenses',
      'Chapada Diamantina',
      'Fernando de Noronha',
      'Amazonia',
      'Pantanal',
      'Teatro Amazonas',
      'Museu do Ipiranga',
      'Congresso Nacional',
      'Elevador Lacerda',
      'Praia do Forte',
      'Gramado',
      'Bonito'
    ]
  },
  {
    pergunta: 'Cite {n} das sete maravilhas do mundo moderno',
    tema: 'lugares', dif: 45,
    respostas: [
      'Cristo Redentor',
      'Muralha da China',
      'Machu Picchu',
      'Chichen Itza',
      'Coliseu',
      'Taj Mahal',
      'Petra'
    ]
  },
  {
    pergunta: 'Cite {n} tipos de lugar de uma cidade',
    tema: 'lugares', dif: 15,
    respostas: [
      'Escola',
      'Hospital',
      'Mercado',
      'Praca',
      'Parque',
      'Igreja',
      'Banco',
      'Farmacia',
      'Padaria',
      'Cinema',
      'Shopping',
      'Restaurante',
      'Rodoviaria',
      'Aeroporto',
      'Biblioteca',
      'Museu',
      'Estadio',
      'Delegacia'
    ]
  },
  {
    pergunta: 'Cite {n} objetos de uma casa',
    tema: 'objetos', dif: 12,
    respostas: [
      'Mesa',
      'Cadeira',
      'Sofa',
      'Cama',
      'Armario',
      'Geladeira',
      'Fogao',
      ['Televisao', 'TV'],
      'Espelho',
      'Abajur',
      'Tapete',
      'Cortina',
      'Ventilador',
      'Microondas',
      'Chuveiro',
      'Vaso',
      'Estante',
      'Relogio'
    ]
  },
  {
    pergunta: 'Cite {n} objetos de cozinha',
    tema: 'objetos', dif: 20,
    respostas: [
      'Panela',
      'Faca',
      'Garfo',
      'Colher',
      'Prato',
      'Copo',
      'Xicara',
      'Frigideira',
      'Tabua',
      'Liquidificador',
      'Batedeira',
      'Peneira',
      'Concha',
      'Ralador',
      'Escorredor',
      'Abridor',
      'Espatula'
    ]
  },
  {
    pergunta: 'Cite {n} itens de material escolar',
    tema: 'objetos', dif: 15,
    respostas: [
      'Caderno',
      'Lapis',
      'Caneta',
      'Borracha',
      'Regua',
      'Apontador',
      'Mochila',
      'Estojo',
      'Tesoura',
      'Cola',
      'Compasso',
      'Calculadora',
      'Marca-texto',
      'Giz',
      'Pincel'
    ]
  },
  {
    pergunta: 'Cite {n} ferramentas',
    tema: 'objetos', dif: 35,
    respostas: [
      'Martelo',
      'Chave de fenda',
      'Alicate',
      'Serrote',
      'Furadeira',
      'Chave inglesa',
      'Trena',
      'Nivel',
      'Parafusadeira',
      'Lixa',
      'Formao',
      'Marreta'
    ]
  },
  {
    pergunta: 'Cite {n} modelos de carro populares no Brasil',
    tema: 'mainstream', dif: 30,
    respostas: [
      'Gol',
      'Uno',
      'Palio',
      'Corsa',
      'Celta',
      'Onix',
      'HB20',
      'Ka',
      'Fiesta',
      'Civic',
      'Corolla',
      'Sandero',
      'Kwid',
      'Mobi',
      'Argo',
      'Polo',
      'Fusca',
      'Strada',
      'Saveiro',
      'Hilux'
    ]
  },
  {
    pergunta: 'Cite {n} marcas de carro de luxo',
    tema: 'mainstream', dif: 40,
    respostas: [
      'Ferrari',
      'Lamborghini',
      'Porsche',
      ['Rolls-Royce', 'Rolls Royce'],
      'Bentley',
      'Maserati',
      'Aston Martin',
      'Bugatti',
      'McLaren',
      'Jaguar',
      ['Mercedes-Benz', 'Mercedes'],
      'BMW'
    ]
  },
  {
    pergunta: 'Cite {n} tipos de veiculo',
    tema: 'objetos', dif: 15,
    respostas: [
      'Carro',
      'Moto',
      'Bicicleta',
      'Onibus',
      'Caminhao',
      'Aviao',
      'Navio',
      'Trem',
      'Helicoptero',
      'Barco',
      'Metro',
      'Patinete',
      'Van',
      'Trator',
      'Submarino'
    ]
  },
  {
    pergunta: 'Cite {n} super-herois',
    tema: 'cinema', dif: 20,
    respostas: [
      ['Superman', 'Super-Homem'],
      'Batman',
      ['Homem-Aranha', 'Homem Aranha'],
      'Homem de Ferro',
      'Capitao America',
      'Thor',
      'Hulk',
      ['Mulher-Maravilha', 'Mulher Maravilha'],
      'Flash',
      'Aquaman',
      'Pantera Negra',
      'Wolverine',
      'Deadpool',
      'Doutor Estranho',
      'Viuva Negra',
      'Capita Marvel',
      'Lanterna Verde',
      'Ciborgue'
    ]
  },
  {
    pergunta: 'Cite {n} viloes de quadrinhos',
    tema: 'cinema', dif: 40,
    respostas: [
      ['Coringa', 'Joker'],
      'Thanos',
      'Lex Luthor',
      'Duende Verde',
      'Magneto',
      'Loki',
      'Venom',
      'Pinguim',
      'Doutor Destino',
      'Ultron',
      'Caveira Vermelha',
      'Darkseid',
      'Bane',
      ['Arlequina', 'Harley Quinn'],
      'Doutor Octopus'
    ]
  },
  {
    pergunta: 'Cite {n} instrumentos de corda',
    tema: 'musica', dif: 30,
    respostas: [
      'Violao',
      'Guitarra',
      'Violino',
      'Violoncelo',
      'Baixo',
      'Harpa',
      'Cavaquinho',
      'Banjo',
      'Viola',
      'Ukulele',
      'Contrabaixo',
      'Bandolim'
    ]
  },
  {
    pergunta: 'Cite {n} instrumentos de sopro',
    tema: 'musica', dif: 40,
    respostas: [
      'Flauta',
      'Saxofone',
      'Trompete',
      'Clarinete',
      'Trombone',
      'Tuba',
      'Gaita',
      'Oboe',
      'Fagote',
      'Trompa',
      'Corneta'
    ]
  },
  {
    pergunta: 'Cite {n} instrumentos de percussao',
    tema: 'musica', dif: 40,
    respostas: [
      'Bateria',
      'Tambor',
      'Pandeiro',
      'Triangulo',
      'Zabumba',
      'Surdo',
      'Cuica',
      'Atabaque',
      'Bongo',
      'Xilofone',
      'Prato',
      'Caixa',
      'Agogo',
      'Reco-reco'
    ]
  },
  {
    pergunta: 'Cite {n} servicos de streaming',
    tema: 'mainstream', dif: 25,
    respostas: [
      'Netflix',
      ['Disney+', 'Disney Plus'],
      ['Amazon Prime Video', 'Prime Video'],
      ['HBO Max', 'Max'],
      'Spotify',
      'YouTube',
      'Globoplay',
      ['Apple TV+', 'Apple TV'],
      ['Paramount+', 'Paramount'],
      'Deezer',
      'Crunchyroll'
    ]
  },
  {
    pergunta: 'Cite {n} duplas sertanejas',
    tema: 'musica', dif: 35,
    respostas: [
      ['Chitaozinho e Xororo', 'Chitaozinho & Xororo'],
      'Zeze Di Camargo e Luciano',
      'Leandro e Leonardo',
      'Bruno e Marrone',
      'Jorge e Mateus',
      'Henrique e Juliano',
      'Maiara e Maraisa',
      'Simone e Simaria',
      'Fernando e Sorocaba',
      'Victor e Leo',
      'Cesar Menotti e Fabiano',
      'Munhoz e Mariano',
      'Matheus e Kauan',
      'Hugo e Guilherme',
      'George Henrique e Rodrigo'
    ]
  },
  {
    pergunta: 'Cite {n} frutas',
    tema: 'comidas', dif: 15,
    respostas: [
      'Banana',
      'Maca',
      'Laranja',
      'Uva',
      'Morango',
      'Abacaxi',
      'Manga',
      'Melancia',
      'Melao',
      'Mamao',
      'Pera',
      'Pessego',
      'Ameixa',
      'Abacate',
      'Goiaba',
      'Caju',
      'Acerola',
      'Maracuja',
      'Limao',
      'Tangerina',
      'Kiwi',
      'Figo',
      'Framboesa',
      'Amora',
      'Cereja',
      'Coco',
      'Jabuticaba',
      'Pitanga',
      'Caqui',
      'Graviola'
    ]
  },
  {
    pergunta: 'Cite {n} jogadores que passaram pelo Barcelona',
    tema: 'futebol', dif: 40,
    respostas: [
      ['Lionel Messi', 'Messi'],
      'Xavi',
      ['Andres Iniesta', 'Iniesta'],
      ['Carles Puyol', 'Puyol'],
      ['Gerard Pique', 'Pique'],
      'Neymar',
      'Luis Suarez',
      'Ronaldinho',
      'Ronaldo',
      'Rivaldo',
      'Dani Alves',
      ['Sergio Busquets', 'Busquets'],
      'Samuel Etoo',
      'Thierry Henry',
      ['Zlatan Ibrahimovic', 'Ibrahimovic'],
      ['Philippe Coutinho', 'Coutinho'],
      ['Ivan Rakitic', 'Rakitic'],
      'Frenkie de Jong',
      'Luis Figo',
      ['Cesc Fabregas', 'Fabregas']
    ]
  },
  {
    pergunta: 'Cite {n} jogadores que passaram pelo Real Madrid',
    tema: 'futebol', dif: 40,
    respostas: [
      ['Cristiano Ronaldo', 'CR7'],
      ['Zinedine Zidane', 'Zidane'],
      'Sergio Ramos',
      ['Iker Casillas', 'Casillas'],
      ['Karim Benzema', 'Benzema'],
      ['Luka Modric', 'Modric'],
      ['Toni Kroos', 'Kroos'],
      ['Gareth Bale', 'Bale'],
      'Marcelo',
      ['Raphael Varane', 'Varane'],
      'Kaka',
      'Luis Figo',
      'Ronaldo',
      'Isco',
      ['Marco Asensio', 'Asensio'],
      'Keylor Navas',
      'Casemiro',
      'James Rodriguez',
      'Alfredo Di Stefano'
    ]
  },
  {
    pergunta: 'Cite {n} jogadores que passaram pelo Milan',
    tema: 'futebol', dif: 50,
    respostas: [
      'Kaka',
      ['Paolo Maldini', 'Maldini'],
      ['Andrea Pirlo', 'Pirlo'],
      ['Marco van Basten', 'van Basten'],
      ['Ruud Gullit', 'Gullit'],
      'Ronaldinho',
      'Ronaldo',
      ['Zlatan Ibrahimovic', 'Ibrahimovic'],
      ['Clarence Seedorf', 'Seedorf'],
      ['Filippo Inzaghi', 'Inzaghi'],
      'Thiago Silva',
      ['Alessandro Nesta', 'Nesta'],
      'Rivaldo',
      'Cafu',
      ['Andriy Shevchenko', 'Shevchenko']
    ]
  },
  {
    pergunta: 'Cite {n} jogadores que passaram pelo Flamengo',
    tema: 'futebol', dif: 45,
    respostas: [
      'Zico',
      'Romario',
      'Ronaldinho',
      'Adriano',
      ['Gabriel Barbosa', 'Gabigol'],
      'Bruno Henrique',
      'Everton Ribeiro',
      'Diego Alves',
      'Filipe Luis',
      'Rafinha',
      'Arrascaeta',
      'Vitinho',
      ['Diego Ribas', 'Diego'],
      'Julio Cesar',
      'Petkovic'
    ]
  },
  {
    pergunta: 'Cite {n} jogadores que passaram pelo Santos',
    tema: 'futebol', dif: 50,
    respostas: [
      'Pele',
      'Neymar',
      'Robinho',
      'Diego',
      'Elano',
      'Ganso',
      ['Gabriel Barbosa', 'Gabigol'],
      'Rodrygo',
      'Alex',
      'Giovanni',
      'Ze Roberto',
      'Leo',
      'Coutinho',
      'Pepe'
    ]
  },
  {
    pergunta: 'Cite {n} clubes onde Cristiano Ronaldo jogou',
    tema: 'futebol', dif: 40,
    respostas: [
      'Sporting',
      'Manchester United',
      'Real Madrid',
      'Juventus',
      ['Al-Nassr', 'Al Nassr']
    ]
  },
  {
    pergunta: 'Cite {n} clubes onde Neymar jogou',
    tema: 'futebol', dif: 35,
    respostas: [
      'Santos',
      'Barcelona',
      ['Paris Saint-Germain', 'PSG'],
      ['Al-Hilal', 'Al Hilal']
    ]
  },
  {
    pergunta: 'Cite {n} clubes onde Zlatan Ibrahimovic jogou',
    tema: 'futebol', dif: 60,
    respostas: [
      'Ajax',
      'Juventus',
      ['Inter de Milao', 'Inter'],
      'Barcelona',
      'Milan',
      ['Paris Saint-Germain', 'PSG'],
      'Manchester United',
      'LA Galaxy',
      'Malmo'
    ]
  },
  {
    pergunta: 'Cite {n} clubes onde Ronaldo Fenomeno jogou',
    tema: 'futebol', dif: 55,
    respostas: [
      'Cruzeiro',
      'PSV',
      'Barcelona',
      ['Inter de Milao', 'Inter'],
      'Real Madrid',
      'Milan',
      'Corinthians'
    ]
  },
  {
    pergunta: 'Cite {n} jogadores nascidos na Argentina',
    tema: 'futebol', dif: 35,
    respostas: [
      ['Lionel Messi', 'Messi'],
      ['Diego Maradona', 'Maradona'],
      ['Sergio Aguero', 'Aguero'],
      ['Angel Di Maria', 'Di Maria'],
      ['Gonzalo Higuain', 'Higuain'],
      ['Javier Mascherano', 'Mascherano'],
      ['Paulo Dybala', 'Dybala'],
      ['Lautaro Martinez', 'Lautaro'],
      ['Emiliano Martinez', 'Dibu'],
      ['Juan Roman Riquelme', 'Riquelme'],
      ['Gabriel Batistuta', 'Batistuta'],
      ['Carlos Tevez', 'Tevez']
    ]
  },
  {
    pergunta: 'Cite {n} jogadores nascidos em Portugal',
    tema: 'futebol', dif: 45,
    respostas: [
      ['Cristiano Ronaldo', 'CR7'],
      'Luis Figo',
      'Eusebio',
      'Bruno Fernandes',
      'Bernardo Silva',
      'Ruben Dias',
      'Joao Felix',
      'Pepe',
      'Nani',
      ['Ricardo Quaresma', 'Quaresma'],
      'Rui Costa',
      'Deco'
    ]
  },
  {
    pergunta: 'Cite {n} jogadores nascidos na Franca',
    tema: 'futebol', dif: 40,
    respostas: [
      ['Zinedine Zidane', 'Zidane'],
      ['Kylian Mbappe', 'Mbappe'],
      ['Antoine Griezmann', 'Griezmann'],
      ['Paul Pogba', 'Pogba'],
      ['NGolo Kante', 'Kante'],
      ['Hugo Lloris', 'Lloris'],
      ['Raphael Varane', 'Varane'],
      ['Olivier Giroud', 'Giroud'],
      ['Franck Ribery', 'Ribery'],
      ['Karim Benzema', 'Benzema'],
      ['Thierry Henry', 'Henry'],
      ['Michel Platini', 'Platini']
    ]
  },
  {
    pergunta: 'Cite {n} jogadores nascidos no Brasil',
    tema: 'futebol', dif: 20,
    respostas: [
      'Pele',
      'Ronaldo',
      'Ronaldinho',
      'Neymar',
      'Kaka',
      'Rivaldo',
      'Romario',
      'Cafu',
      'Roberto Carlos',
      'Thiago Silva',
      'Marcelo',
      'Dani Alves',
      'Casemiro',
      'Alisson',
      'Ederson',
      ['Vinicius Junior', 'Vini Jr'],
      'Gabriel Jesus',
      ['Roberto Firmino', 'Firmino']
    ]
  },
  {
    pergunta: 'Cite {n} jogadores em destaque na decada de 2010',
    tema: 'futebol', dif: 30,
    respostas: [
      ['Lionel Messi', 'Messi'],
      ['Cristiano Ronaldo', 'CR7'],
      'Neymar',
      'Luis Suarez',
      ['Andres Iniesta', 'Iniesta'],
      'Xavi',
      'Sergio Ramos',
      ['Manuel Neuer', 'Neuer'],
      'Thomas Muller',
      ['Toni Kroos', 'Kroos'],
      ['Luka Modric', 'Modric'],
      ['Gareth Bale', 'Bale'],
      ['Robert Lewandowski', 'Lewandowski'],
      ['Eden Hazard', 'Hazard'],
      ['Kevin De Bruyne', 'De Bruyne'],
      ['Mohamed Salah', 'Salah'],
      ['Sadio Mane', 'Mane'],
      ['Antoine Griezmann', 'Griezmann'],
      ['Paul Pogba', 'Pogba'],
      ['Zlatan Ibrahimovic', 'Ibrahimovic'],
      ['Arjen Robben', 'Robben'],
      ['Andrea Pirlo', 'Pirlo'],
      ['Gianluigi Buffon', 'Buffon'],
      ['Sergio Aguero', 'Aguero'],
      ['Edinson Cavani', 'Cavani'],
      'James Rodriguez',
      'Thiago Silva',
      'Dani Alves',
      'Marcelo',
      'Casemiro'
    ]
  },
  {
    pergunta: 'Cite {n} jogadores em destaque na decada de 2000',
    tema: 'futebol', dif: 40,
    respostas: [
      'Ronaldinho',
      'Ronaldo',
      'Kaka',
      ['Zinedine Zidane', 'Zidane'],
      ['Thierry Henry', 'Henry'],
      ['Andriy Shevchenko', 'Shevchenko'],
      'Luis Figo',
      'Roberto Carlos',
      'Cafu',
      'Rivaldo',
      'Raul',
      ['Paolo Maldini', 'Maldini'],
      ['Francesco Totti', 'Totti'],
      ['Steven Gerrard', 'Gerrard'],
      ['Frank Lampard', 'Lampard'],
      ['Didier Drogba', 'Drogba'],
      'Samuel Etoo',
      ['Wayne Rooney', 'Rooney'],
      ['Iker Casillas', 'Casillas'],
      'Deco',
      'Adriano',
      'Robinho'
    ]
  },
  {
    pergunta: 'Cite {n} jogadores em destaque na decada de 1990',
    tema: 'futebol', dif: 55,
    respostas: [
      'Romario',
      'Bebeto',
      'Ronaldo',
      ['Roberto Baggio', 'Baggio'],
      ['George Weah', 'Weah'],
      ['Hristo Stoichkov', 'Stoichkov'],
      ['Zinedine Zidane', 'Zidane'],
      'Rivaldo',
      'Dunga',
      'Taffarel',
      ['Gabriel Batistuta', 'Batistuta'],
      'Marco van Basten',
      ['Paolo Maldini', 'Maldini'],
      ['Jurgen Klinsmann', 'Klinsmann'],
      ['Matthias Sammer', 'Sammer'],
      ['Davor Suker', 'Suker']
    ]
  },
  {
    pergunta: 'Cite {n} campeoes da Copa do Mundo pelo Brasil em 2002',
    tema: 'futebol', dif: 55,
    respostas: [
      'Ronaldo',
      'Rivaldo',
      'Ronaldinho',
      'Cafu',
      'Roberto Carlos',
      'Marcos',
      'Lucio',
      'Edmilson',
      'Gilberto Silva',
      'Kleberson',
      'Juninho Paulista',
      'Denilson'
    ]
  }
];

/**
 * Devolve as listas que servem para uma rodada que pede `n` respostas.
 *
 * - `fixo`: só serve se a lista tiver exatamente `n` itens.
 * - aberta: serve se tiver itens suficientes e já tiver passado o `minimo`.
 */
/**
 * Quanto a rodada aceita de lista genérica.
 *
 * Rodada curta pede assunto fechado ("esportes com bola", 12 itens); rodada
 * longa não tem escolha e precisa de repertório grande ("paises da Europa",
 * 45 itens). O teto cresce junto com o número de respostas pedidas.
 */
const PESO_ESPECIFICA = 3; // quantas vezes a lista fechada entra no sorteio

function tetoDeTamanho(n) {
  return n * 3 + 8;
}

/**
 * Listas que servem para uma rodada de `n` respostas.
 *
 * @param {number} n         quantas respostas a rodada pede
 * @param {string} [evitar]  tema da rodada anterior, para não repetir assunto
 */
function paraRodada(n, evitar) {
  const cabem = LISTAS.filter((lista) => {
    if (lista.fixo) return lista.respostas.length === n;
    return lista.respostas.length >= n && (lista.minimo || 1) <= n;
  });
  if (cabem.length === 0) return [];

  // 1. tira o tema da rodada anterior — a não ser que não sobre nada.
  const semRepetir = evitar ? cabem.filter((l) => l.tema !== evitar) : cabem;
  const base = semRepetir.length ? semRepetir : cabem;

  // 2. prefere o assunto mais fechado que a rodada comporta — mas sem barrar
  //    o resto. Como muro, o teto deixava a rodada de 2 sempre na mesma lista:
  //    "capitais da America do Sul" (12 itens) passava e "capitais europeias"
  //    (22) nao. Agora as especificas entram repetidas no bolo do sorteio, o
  //    que as torna mais provaveis sem tirar as outras do jogo.
  const teto = tetoDeTamanho(n);
  const bolo = [];
  for (const lista of base) {
    const vezes = lista.respostas.length <= teto ? PESO_ESPECIFICA : 1;
    for (let i = 0; i < vezes; i++) bolo.push(lista);
  }
  return bolo;
}


/* ------------------------------------------------------------------ *
 * Listas "com a letra X", geradas a partir das que ja existem.
 *
 * Em vez de escrever "paises com A", "paises com B" a mao, cada fonte e
 * fatiada pela primeira letra do nome. So vira lista a letra que tiver itens
 * suficientes — com duas ou tres a pergunta ficaria impossivel na rodada alta.
 * ------------------------------------------------------------------ */

const FONTES_POR_LETRA = [
  ['Cite {n} paises da Europa', 'paises da Europa', 'geografia'],
  ['Cite {n} paises da Africa', 'paises da Africa', 'geografia'],
  ['Cite {n} paises da Asia', 'paises da Asia', 'geografia'],
  ['Cite {n} paises da America do Sul', 'paises da America do Sul', 'geografia'],
  ['Cite {n} estados brasileiros', 'estados brasileiros', 'geografia'],
  ['Cite {n} capitais mundiais', 'capitais do mundo', 'geografia'],
  ['Cite {n} frutas', 'frutas', 'comidas'],
  ['Cite {n} animais selvagens', 'animais', 'animais'],
  ['Cite {n} clubes brasileiros de futebol', 'clubes brasileiros', 'futebol'],
  ['Cite {n} bandas de rock internacionais', 'bandas de rock', 'musica'],
  ['Cite {n} marcas famosas', 'marcas', 'mainstream'],
  ['Cite {n} pecas de roupa', 'pecas de roupa', 'objetos'],
  ['Cite {n} objetos de uma casa', 'objetos de casa', 'objetos'],
  ['Cite {n} nomes de animais domesticos', 'animais domesticos', 'animais']
];

const MINIMO_POR_LETRA = 4;

/** Primeira letra do nome oficial, sem acento e em maiuscula. */
function letraInicial(bruto) {
  const nome = Array.isArray(bruto) ? bruto[0] : bruto;
  return nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').charAt(0).toUpperCase();
}

for (const [enunciadoFonte, rotulo, tema] of FONTES_POR_LETRA) {
  const fonte = LISTAS.find((l) => l.pergunta === enunciadoFonte);
  if (!fonte) continue;

  const porLetra = new Map();
  for (const item of fonte.respostas) {
    const letra = letraInicial(item);
    if (!porLetra.has(letra)) porLetra.set(letra, []);
    porLetra.get(letra).push(item);
  }

  for (const [letra, itens] of porLetra) {
    if (itens.length < MINIMO_POR_LETRA) continue;
    LISTAS.push({
      pergunta: `Cite {n} ${rotulo} que comecam com a letra ${letra}`,
      tema,
      // Recorte por letra e mais dificil que a lista inteira: o repertorio
      // encolhe e a pessoa precisa filtrar de cabeca.
      dif: 55,
      respostas: itens
    });
  }
}


/* ------------------------------------------------------------------ *
 * "Terminam com a letra X" — mesma ideia do recorte pela primeira letra.
 * ------------------------------------------------------------------ */

function letraFinal(bruto) {
  const nome = Array.isArray(bruto) ? bruto[0] : bruto;
  const limpo = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z]/g, '');
  return limpo.charAt(limpo.length - 1).toUpperCase();
}

for (const [enunciadoFonte, rotulo, tema] of FONTES_POR_LETRA) {
  const fonte = LISTAS.find((l) => l.pergunta === enunciadoFonte);
  if (!fonte) continue;

  const porLetra = new Map();
  for (const item of fonte.respostas) {
    const letra = letraFinal(item);
    if (!porLetra.has(letra)) porLetra.set(letra, []);
    porLetra.get(letra).push(item);
  }

  for (const [letra, itens] of porLetra) {
    if (itens.length < MINIMO_POR_LETRA) continue;
    LISTAS.push({
      pergunta: `Cite {n} ${rotulo} que terminam com a letra ${letra}`,
      tema,
      // Mais dificil que o recorte pela inicial: ninguem organiza vocabulario
      // pela ultima letra.
      dif: 65,
      respostas: itens
    });
  }
}

/* ------------------------------------------------------------------ *
 * "Com exatamente N letras".
 *
 * So vale para fonte de nome curto e de uma palavra so — contar as letras de
 * "Republica Tcheca" nao e pergunta, e adivinhacao. Por isso a lista de fontes
 * e separada, e entradas com espaco ou hifen ficam de fora.
 * ------------------------------------------------------------------ */

const FONTES_POR_TAMANHO = [
  ['Cite {n} frutas', 'frutas', 'comidas'],
  ['Cite {n} animais selvagens', 'animais', 'animais'],
  ['Cite {n} cores', 'cores', 'gerais'],
  ['Cite {n} paises da Europa', 'paises da Europa', 'geografia'],
  ['Cite {n} paises da Asia', 'paises da Asia', 'geografia'],
  ['Cite {n} pecas de roupa', 'pecas de roupa', 'objetos'],
  ['Cite {n} objetos de uma casa', 'objetos de casa', 'objetos']
];

const MINIMO_POR_TAMANHO = 4;

function umaPalavraSo(bruto) {
  const nome = Array.isArray(bruto) ? bruto[0] : bruto;
  return !/[\s-]/.test(nome.trim());
}

function quantasLetras(bruto) {
  const nome = Array.isArray(bruto) ? bruto[0] : bruto;
  return nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z]/g, '').length;
}

for (const [enunciadoFonte, rotulo, tema] of FONTES_POR_TAMANHO) {
  const fonte = LISTAS.find((l) => l.pergunta === enunciadoFonte);
  if (!fonte) continue;

  const porTamanho = new Map();
  for (const item of fonte.respostas.filter(umaPalavraSo)) {
    const n = quantasLetras(item);
    if (!porTamanho.has(n)) porTamanho.set(n, []);
    porTamanho.get(n).push(item);
  }

  for (const [tamanho, itens] of porTamanho) {
    if (itens.length < MINIMO_POR_TAMANHO) continue;
    LISTAS.push({
      pergunta: `Cite {n} ${rotulo} com exatamente ${tamanho} letras`,
      tema, dif: 60, respostas: itens
    });
  }
}

/** Normaliza um item para { oficial, variantes }. */
function itemDe(bruto) {
  const formas = Array.isArray(bruto) ? bruto : [bruto];
  return { oficial: formas[0], variantes: formas.slice(1) };
}

module.exports = { LISTAS, paraRodada, itemDe, tetoDeTamanho };
