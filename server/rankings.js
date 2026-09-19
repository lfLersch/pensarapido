'use strict';

/*
 * Banco do modo Mais ou Menos Pontos: listas em ORDEM.
 *
 * A posicao e a pontuacao. O primeiro da lista vale 1 ponto e o ultimo vale o
 * tamanho dela: dizer "India" nos paises mais populosos rende 1, dizer "Togo"
 * rende 100, e quem lembra de um pais que nao esta na lista nao leva nada.
 * Por isso a ordem importa mais aqui do que em qualquer outro banco.
 *
 * Como manter:
 *
 * - **A ordem e a fonte.** Cada lista diz de onde veio; ao atualizar, troque a
 *   lista inteira, nunca um item no meio.
 * - Quando a ordem exata nao existe em lugar nenhum (medalhas somadas de mais
 *   de um seculo, participacoes em Copas), o campo `fonte` avisa que a ordem e
 *   **aproximada** — vale o jogo, nao vale como referencia.
 * - **Sem acento**, como no resto do texto do jogo (a comparacao ignora acento
 *   de qualquer jeito).
 * - `variantes` guarda as outras formas que valem para o mesmo item: o nome em
 *   ingles, a grafia de Portugal, o apelido.
 * - `testes/ranking.test.js` reprova lista curta, item repetido e par de itens
 *   que o corretor nao distingue.
 */

const { normalizar, sobrenomesDe, distancia, LIMITE_CERTO } = require('./comparar');

/** Item simples ou item com apelidos. */
const item = (oficial, ...variantes) => ({ oficial, variantes });

const RANKINGS = [
  {
    id: 'paises-populosos',
    pergunta: 'Cite um dos 100 paises mais populosos do mundo',
    fonte: 'Wikipedia, lista de paises por populacao (2026)',
    tema: 'geografia',
    dif: 30,
    itens: [
      item('India'), item('China'), item('Estados Unidos', 'EUA', 'USA'), item('Indonesia'),
      item('Paquistao'), item('Nigeria'), item('Brasil'), item('Bangladesh'),
      item('Russia'), item('Mexico'), item('Etiopia'), item('Japao'),
      item('Filipinas'), item('Republica Democratica do Congo', 'RDC', 'Congo'), item('Egito'),
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
      item('Mali'), item('Romenia'), item('Malawi'), item('Chile'),
      item('Cazaquistao'), item('Zambia'), item('Guatemala'), item('Equador'),
      item('Siria'), item('Paises Baixos', 'Holanda'), item('Senegal'), item('Camboja'),
      item('Chade'), item('Somalia'), item('Zimbabue', 'Zimbabwe'), item('Guine'),
      item('Ruanda'), item('Benim', 'Benin'), item('Burundi'), item('Tunisia'),
      item('Bolivia'), item('Belgica'), item('Haiti'), item('Cuba'),
      item('Sudao do Sul'), item('Republica Dominicana'), item('Grecia'),
      item('Republica Tcheca', 'Tchequia', 'Chequia'), item('Portugal'), item('Jordania'),
      item('Azerbaijao'), item('Suecia'), item('Honduras'),
      item('Emirados Arabes Unidos', 'Emirados Arabes'), item('Hungria'), item('Tajiquistao'),
      item('Bielorrussia', 'Belarus'), item('Austria'), item('Papua-Nova Guine', 'Papua Nova Guine'),
      item('Israel'), item('Suica'), item('Togo')
    ]
  },
  {
    id: 'paises-area',
    pergunta: 'Cite um dos 100 maiores paises do mundo em area',
    fonte: 'Wikipedia, lista de paises por area (2026)',
    tema: 'geografia',
    dif: 35,
    itens: [
      item('Russia'), item('Canada'), item('China'), item('Estados Unidos', 'EUA', 'USA'),
      item('Brasil'), item('Australia'), item('India'), item('Argentina'),
      item('Cazaquistao'), item('Argelia'), item('Republica Democratica do Congo', 'RDC'),
      item('Arabia Saudita'), item('Mexico'), item('Indonesia'), item('Sudao'),
      item('Libia'), item('Ira', 'Irao', 'Iran'), item('Mongolia'), item('Peru'),
      item('Chade'), item('Niger'), item('Angola'), item('Mali'), item('Africa do Sul'),
      item('Colombia'), item('Etiopia'), item('Bolivia'), item('Mauritania'),
      item('Egito'), item('Tanzania'), item('Nigeria'), item('Venezuela'),
      item('Paquistao'), item('Namibia'), item('Mocambique'), item('Turquia'),
      item('Chile'), item('Zambia'), item('Myanmar', 'Birmania'), item('Afeganistao'),
      item('Sudao do Sul'), item('Somalia'), item('Republica Centro-Africana'),
      item('Madagascar'), item('Botsuana', 'Botswana'), item('Quenia'), item('Ucrania'),
      item('Franca'), item('Iemen'), item('Tailandia'), item('Espanha'),
      item('Turcomenistao', 'Turquemenistao'), item('Camaroes'),
      item('Papua-Nova Guine', 'Papua Nova Guine'), item('Suecia'), item('Uzbequistao'),
      item('Marrocos'), item('Iraque'), item('Paraguai'), item('Zimbabue', 'Zimbabwe'),
      item('Noruega'), item('Japao'), item('Alemanha'), item('Republica do Congo'),
      item('Finlandia'), item('Vietna', 'Vietname'), item('Malasia'), item('Costa do Marfim'),
      item('Polonia'), item('Oma'), item('Italia'), item('Filipinas'),
      item('Equador'), item('Burkina Faso', 'Burquina Fasso'), item('Nova Zelandia'),
      item('Gabao'), item('Guine'), item('Reino Unido'), item('Uganda'),
      item('Gana'), item('Romenia'), item('Laos'), item('Guiana'),
      item('Bielorrussia', 'Belarus'), item('Quirguistao'), item('Senegal'), item('Siria'),
      item('Camboja'), item('Uruguai'), item('Suriname'), item('Tunisia'),
      item('Nepal'), item('Bangladesh'), item('Tajiquistao'), item('Grecia'),
      item('Nicaragua'), item('Coreia do Norte'), item('Malawi'), item('Eritreia'),
      item('Benim', 'Benin')
    ]
  },
  {
    id: 'cidades-brasil',
    pergunta: 'Cite uma das 100 cidades mais populosas do Brasil',
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
      item('Mogi das Cruzes'), item('Jundiai'), item('Macapa'), item('Sao Joao de Meriti'),
      item('Piracicaba'), item('Campina Grande'), item('Santos'), item('Maua'),
      item('Montes Claros'), item('Boa Vista'), item('Betim'), item('Maringa'),
      item('Anapolis'), item('Diadema'), item('Carapicuiba'), item('Petrolina'),
      item('Bauru'), item('Caruaru'), item('Vitoria da Conquista'), item('Itaquaquecetuba'),
      item('Rio Branco'), item('Blumenau'), item('Ponta Grossa'), item('Caucaia'),
      item('Cariacica'), item('Franca'), item('Olinda'), item('Praia Grande'),
      item('Cascavel'), item('Canoas'), item('Paulista'), item('Uberaba'),
      item('Santarem'), item('Sao Vicente'), item('Ribeirao das Neves'),
      item('Sao Jose dos Pinhais'), item('Pelotas'), item('Vitoria'), item('Barueri'),
      item('Taubate'), item('Suzano'), item('Palmas'), item('Camacari'),
      item('Varzea Grande'), item('Limeira'), item('Guaruja'), item('Juazeiro do Norte'),
      item('Foz do Iguacu'), item('Sumare'), item('Petropolis'), item('Cotia')
    ]
  },
  {
    id: 'cidades-mundo',
    pergunta: 'Cite uma das 60 cidades mais populosas do mundo',
    fonte: 'Wikipedia, cidades por populacao dentro do limite da cidade',
    tema: 'geografia',
    dif: 45,
    itens: [
      item('Chongqing', 'Xunquim'), item('Pequim', 'Beijing'), item('Xangai', 'Shanghai'),
      item('Tianjin'), item('Chengdu'), item('Guangzhou', 'Cantao'), item('Shenyang'),
      item('Hangzhou', 'Hancheu'), item('Suzhou', 'Sucheu'), item('Wuhan'),
      item('Harbin'), item('Xian'), item('Nanquim', 'Nanjing'), item('Jinan'),
      item('Qingdao'), item('Dongguan'), item('Foshan'), item('Dalian'),
      item('Toquio', 'Tokyo'), item('Deli', 'Nova Delhi', 'Delhi'), item('Mumbai', 'Bombaim'),
      item('Calcuta', 'Kolkata'), item('Bangalore', 'Bangalor'), item('Hyderabad', 'Haiderabade'),
      item('Chennai', 'Chenai'), item('Ahmedabad', 'Amedabade'), item('Surat', 'Surrate'),
      item('Pune'), item('Daca', 'Dhaka'), item('Karachi', 'Carachi'),
      item('Lahore'), item('Istambul', 'Istanbul'), item('Moscou', 'Moscovo'),
      item('Sao Paulo'), item('Rio de Janeiro'), item('Belo Horizonte'),
      item('Cidade do Mexico', 'Mexico City'), item('Guadalajara'), item('Buenos Aires'),
      item('Lima'), item('Bogota'), item('Jacarta', 'Jakarta'),
      item('Bangkok', 'Banguecoque'), item('Seul', 'Seoul'), item('Manila'),
      item('Osaka'), item('Nagoia', 'Nagoya'), item('Fukuoka'),
      item('Nova York', 'Nova Iorque', 'New York'), item('Los Angeles'), item('Chicago'),
      item('Houston'), item('Dallas'), item('Toronto'), item('Filadelfia', 'Philadelphia'),
      item('Atlanta'), item('Miami'), item('Washington'), item('Paris'), item('Londres', 'London')
    ]
  },
  {
    id: 'paises-pib',
    pergunta: 'Cite uma das 60 maiores economias do mundo',
    fonte: 'Wikipedia, paises por PIB nominal (2026)',
    tema: 'geografia',
    dif: 40,
    itens: [
      item('Estados Unidos', 'EUA', 'USA'), item('China'), item('Alemanha'), item('Japao'),
      item('India'), item('Reino Unido'), item('Franca'), item('Russia'),
      item('Italia'), item('Canada'), item('Brasil'), item('Espanha'),
      item('Mexico'), item('Coreia do Sul'), item('Australia'), item('Indonesia'),
      item('Arabia Saudita'), item('Paises Baixos', 'Holanda'), item('Turquia'), item('Taiwan'),
      item('Suica'), item('Polonia'), item('Argentina'), item('Suecia'),
      item('Belgica'), item('Tailandia'), item('Israel'), item('Irlanda'),
      item('Noruega'), item('Nigeria'), item('Emirados Arabes Unidos', 'Emirados Arabes'),
      item('Egito'), item('Austria'), item('Bangladesh'), item('Malasia'),
      item('Singapura'), item('Ira', 'Irao'), item('Vietna', 'Vietname'), item('Africa do Sul'),
      item('Filipinas'), item('Dinamarca'), item('Paquistao'), item('Hong Kong'),
      item('Colombia'), item('Chile'), item('Romenia'),
      item('Republica Tcheca', 'Tchequia', 'Chequia'), item('Iraque'), item('Finlandia'),
      item('Portugal'), item('Nova Zelandia'), item('Peru'), item('Cazaquistao'),
      item('Grecia'), item('Catar', 'Qatar'), item('Ucrania'), item('Argelia'),
      item('Hungria'), item('Kuwait'), item('Marrocos')
    ]
  },
  {
    id: 'paises-visitados',
    pergunta: 'Cite um dos 30 paises mais visitados por turistas',
    fonte: 'Organizacao Mundial do Turismo, via Wikipedia',
    tema: 'geografia',
    dif: 40,
    itens: [
      item('Franca'), item('Espanha'), item('Estados Unidos', 'EUA', 'USA'), item('China'),
      item('Turquia'), item('Italia'), item('Mexico'), item('Hong Kong'),
      item('Reino Unido'), item('Alemanha'), item('Grecia'), item('Austria'),
      item('Portugal'), item('Paises Baixos', 'Holanda'), item('Japao'), item('Tailandia'),
      item('Macau'), item('Arabia Saudita'), item('Malasia'),
      item('Emirados Arabes Unidos', 'Emirados Arabes'), item('Vietna', 'Vietname'),
      item('Coreia do Sul'), item('Marrocos'), item('Egito'), item('Tunisia'),
      item('Africa do Sul'), item('Argelia'), item('Zambia'), item('Tanzania'),
      item('Zimbabue', 'Zimbabwe')
    ]
  },
  {
    id: 'rios-extensos',
    pergunta: 'Cite um dos 40 rios mais extensos do mundo',
    fonte: 'Wikipedia, lista dos rios mais extensos do mundo',
    tema: 'geografia',
    dif: 50,
    itens: [
      item('Nilo'), item('Amazonas'), item('Yangtze', 'Rio Azul'),
      item('Mississippi', 'Mississippi-Missouri', 'Missouri'), item('Ob', 'Ob-Irtich', 'Irtich'),
      item('Congo'), item('Huang He', 'Rio Amarelo'), item('Parana'), item('Amur'),
      item('Lena'), item('Mackenzie'), item('Mekong'), item('Niger'),
      item('Ienissei', 'Yenisei'), item('Murray', 'Murray-Darling'), item('Volga'),
      item('Madeira'), item('Eufrates'), item('Purus'), item('Yukon'),
      item('Indo'), item('Sao Francisco'), item('Sir Daria'), item('Salween'),
      item('Sao Lourenco'), item('Rio Grande'), item('Tunguska'), item('Bramaputra'),
      item('Danubio'), item('Tocantins'), item('Zambeze'), item('Vilyuy'),
      item('Araguaia'), item('Amu Daria'), item('Japura'), item('Nelson'),
      item('Paraguai'), item('Kolyma'), item('Ganges'), item('Pilcomayo')
    ]
  },
  {
    id: 'filmes-bilheteria',
    pergunta: 'Cite um dos filmes de maior bilheteria da historia',
    fonte: 'Wikipedia, lista de filmes de maior bilheteria (2026) — sem Velozes e Furiosos 8, que o corretor nao distingue do 7',
    tema: 'cinema',
    dif: 40,
    itens: [
      item('Avatar'), item('Vingadores: Ultimato'), item('Homem-Aranha: Um Novo Dia', 'Brand New Day'),
      item('Avatar: O Caminho da Agua'), item('Titanic'), item('Ne Zha 2'),
      item('Star Wars: O Despertar da Forca'), item('Vingadores: Guerra Infinita'), item('Homem-Aranha: Sem Volta para Casa'),
      item('Zootopia 2'), item('Divertida Mente 2', 'Inside Out 2'), item('A Odisseia'),
      item('Jurassic World'), item('O Rei Leao'), item('Os Vingadores'),
      item('Velozes e Furiosos 7'), item('Top Gun: Maverick'), item('Avatar: Fogo e Cinzas'),
      item('Frozen 2'), item('Barbie'), item('Vingadores: Era de Ultron'),
      item('Super Mario Bros: O Filme', 'Super Mario Bros'), item('Pantera Negra'), item('Harry Potter e as Reliquias da Morte Parte 2', 'Reliquias da Morte Parte 2'),
      item('Deadpool e Wolverine', 'Deadpool & Wolverine'), item('Star Wars: Os Ultimos Jedi'), item('Jurassic World: Reino Ameacado'),
      item('Frozen'), item('A Bela e a Fera'), item('Os Incriveis 2'),
      item('Homem de Ferro 3'), item('Minions'),
      item('Capitao America: Guerra Civil'), item('Aquaman'), item('O Senhor dos Aneis: O Retorno do Rei'),
      item('Toy Story 5'), item('Homem-Aranha: Longe de Casa'), item('Capita Marvel'),
      item('Transformers: O Lado Oculto da Lua'), item('007 Operacao Skyfall', 'Skyfall'), item('Transformers: A Era da Extincao'),
      item('Batman: O Cavaleiro das Trevas Ressurge', 'O Cavaleiro das Trevas Ressurge'), item('Coringa'), item('Star Wars: A Ascensao Skywalker'),
      item('Toy Story 4'), item('Toy Story 3'), item('Piratas do Caribe: O Bau da Morte'),
      item('Moana 2'), item('Rogue One', 'Rogue One: Uma Historia Star Wars')
    ]
  },
  {
    id: 'jogos-vendidos',
    pergunta: 'Cite um dos 40 jogos eletronicos mais vendidos da historia',
    fonte: 'Wikipedia, lista de jogos eletronicos mais vendidos',
    tema: 'games',
    dif: 40,
    itens: [
      item('Minecraft'), item('Grand Theft Auto V', 'GTA V', 'GTA 5'),
      item('Red Dead Redemption 2'), item('Wii Sports'), item('Mario Kart 8'),
      item('PUBG', 'PlayerUnknowns Battlegrounds'), item('Terraria'),
      item('The Witcher 3', 'Witcher 3'), item('Skyrim', 'The Elder Scrolls V'),
      item('Super Mario Bros'), item('Overwatch'), item('Human Fall Flat'),
      item('Tetris'), item('Pokemon Red e Blue', 'Pokemon Red', 'Pokemon Blue'),
      item('Animal Crossing: New Horizons', 'Animal Crossing'), item('Wii Fit'),
      item('Pac-Man'), item('Hogwarts Legacy'), item('Monster Hunter World'),
      item('Mario Kart Wii'), item('Cyberpunk 2077'), item('Super Smash Bros Ultimate'),
      item('Zelda: Breath of the Wild', 'Breath of the Wild'), item('Wii Sports Resort'),
      item('Call of Duty: Modern Warfare 2019', 'Modern Warfare 2019'),
      item('Call of Duty: Modern Warfare 3', 'Modern Warfare 3'),
      item('Call of Duty: Black Ops', 'Black Ops'), item('New Super Mario Bros'),
      item('New Super Mario Bros Wii'), item('Elden Ring'), item('Diablo III', 'Diablo 3'),
      item('Stardew Valley'), item('Call of Duty: Black Ops II', 'Black Ops 2'),
      item('Pokemon Gold e Silver', 'Pokemon Gold'), item('Call of Duty: Ghosts'),
      item('Duck Hunt'), item('Wii Play'), item('The Walking Dead'),
      item('Borderlands 2'), item('Super Mario Odyssey')
    ]
  },
  {
    id: 'artistas-spotify',
    pergunta: 'Cite um dos 40 artistas mais ouvidos no Spotify',
    fonte: 'Wikipedia, artistas com mais ouvintes mensais no Spotify',
    tema: 'musica',
    dif: 35,
    itens: [
      item('Bruno Mars'), item('Justin Bieber'), item('Rihanna'), item('The Weeknd', 'Weeknd'),
      item('Taylor Swift'), item('Lady Gaga'), item('Bad Bunny'), item('Drake'),
      item('Ariana Grande'), item('Shakira'), item('Coldplay'), item('Katy Perry'),
      item('Michael Jackson'), item('David Guetta'), item('Pitbull'), item('Ed Sheeran'),
      item('Maroon 5'), item('Calvin Harris'), item('Billie Eilish'), item('Dua Lipa'),
      item('Eminem'), item('J Balvin'), item('Post Malone'), item('Kanye West', 'Ye'),
      item('Kendrick Lamar'), item('Sia'), item('Beyonce'), item('Olivia Rodrigo'),
      item('Black Eyed Peas'), item('Karol G'), item('SZA'), item('Lana Del Rey'),
      item('Daddy Yankee'), item('Harry Styles'), item('Tame Impala'), item('Miley Cyrus'),
      item('Sean Paul'), item('Travis Scott'), item('Justin Timberlake'), item('Adele')
    ]
  },
  {
    id: 'canais-youtube',
    pergunta: 'Cite um dos 40 canais com mais inscritos do YouTube',
    fonte: 'Wikipedia, canais do YouTube com mais inscritos (2026)',
    tema: 'mainstream',
    dif: 45,
    itens: [
      item('MrBeast'), item('T-Series'), item('Cocomelon'), item('SET India'),
      item('Vlad and Niki'), item('Stokes Twins'), item('Kids Diana Show'),
      item('KIMPRO'), item('Like Nastya'), item('Zee Music Company'),
      item('Alejo Igoa'), item('WWE'), item('Goldmines'), item('PewDiePie'),
      item('Sony SAB'), item('Alans Universe'), item('Blackpink'), item('Zee TV'),
      item('ChuChu TV'), item('Topper Guild'), item('A4'), item('KL Bro Biju Rithvik'),
      item('BANGTANTV'), item('Baby Shark', 'Pinkfong'), item('Zamzam Brothers'),
      item('Cristiano Ronaldo', 'UR Cristiano'), item('Toys and Colors'),
      item('T-Series Bhakti Sagar'), item('Hybe Labels'), item('Mark Rober'),
      item('Colors TV'), item('Tips Official'), item('5-Minute Crafts'), item('Zhong'),
      item('Justin Bieber'), item('Fede Vigevani'), item('Bispo Bruno Leonardo'),
      item('ISSEI'), item('Aaj Tak'), item('Anaya Kandhal')
    ]
  },
  {
    id: 'estadios',
    pergunta: 'Cite um dos 40 maiores estadios de futebol do mundo',
    fonte: 'Wikipedia, estadios de futebol por capacidade',
    tema: 'futebol',
    dif: 55,
    itens: [
      item('Rungrado Primeiro de Maio', 'Rungrado'), item('Camp Nou'), item('FNB Stadium', 'Soccer City'),
      item('Estadio da Nova Capital Administrativa'), item('Cotton Bowl'), item('Wembley'),
      item('Lusail'), item('Estadio Azteca', 'Azteca'), item('Bukit Jalil'),
      item('Borg El-Arab'), item('Mais Monumental', 'Monumental de Nunez'), item('Salt Lake Stadium'),
      item('Stadium Australia'), item('Santiago Bernabeu', 'Bernabeu'), item('Croke Park'),
      item('Jakarta International Stadium'), item('Signal Iduna Park', 'Westfalenstadion'),
      item('Stade de France'), item('Luzhniki'), item('Shah Alam'),
      item('Estadio Monumental de Lima', 'Monumental de Lima'), item('Giuseppe Meazza', 'San Siro'),
      item('Estadio Olimpico de Guangdong'), item('Hangzhou Olympic Sports Centre'),
      item('Stade des Martyrs'), item('Ninho de Passaro', 'Estadio Nacional de Pequim'),
      item('Maracana'), item('Azadi'), item('Gelora Bung Karno'), item('Ataturk Olimpiyat'),
      item('Old Trafford'), item('Grande Estadio de Tanger'), item('Allianz Arena'),
      item('Naghsh-e Jahan'), item('Bank of America Stadium'), item('Principality Stadium'),
      item('Olympiastadion'), item('Estadio Internacional do Cairo'),
      item('Mane Garrincha'), item('Estadio Olimpico de Roma', 'Stadio Olimpico')
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
  },
  {
    id: 'medalhas-olimpicas',
    pergunta: 'Cite um dos 30 paises com mais medalhas olimpicas',
    fonte: 'Quadro geral dos Jogos de Verao — ordem aproximada',
    tema: 'esportes',
    dif: 45,
    itens: [
      item('Estados Unidos', 'EUA', 'USA'), item('Uniao Sovietica', 'URSS'),
      item('Alemanha'), item('Reino Unido', 'Gra-Bretanha'), item('Franca'),
      item('Italia'), item('China'), item('Suecia'), item('Russia'),
      item('Hungria'), item('Australia'), item('Japao'), item('Finlandia'),
      item('Coreia do Sul'), item('Paises Baixos', 'Holanda'), item('Romenia'),
      item('Canada'), item('Cuba'), item('Polonia'), item('Suica'),
      item('Noruega'), item('Dinamarca'), item('Espanha'), item('Bulgaria'),
      item('Brasil'), item('Nova Zelandia'), item('Belgica'), item('Ucrania'),
      item('Quenia'), item('Jamaica')
    ]
  },
  {
    id: 'copas-participacoes',
    pergunta: 'Cite uma das 25 selecoes com mais Copas do Mundo disputadas',
    fonte: 'Participacoes em Copas do Mundo — ordem aproximada',
    tema: 'futebol',
    dif: 45,
    itens: [
      item('Brasil'), item('Alemanha'), item('Italia'), item('Argentina'),
      item('Mexico'), item('Franca'), item('Espanha'), item('Inglaterra'),
      item('Belgica'), item('Uruguai'), item('Suica'), item('Servia', 'Iugoslavia'),
      item('Suecia'), item('Estados Unidos', 'EUA'), item('Paises Baixos', 'Holanda'),
      item('Coreia do Sul'), item('Russia'), item('Chile'), item('Paraguai'),
      item('Republica Tcheca', 'Tchecoslovaquia'), item('Portugal'), item('Camaroes'),
      item('Polonia'), item('Hungria'), item('Austria')
    ]
  },
  {
    id: 'musicas-spotify',
    pergunta: 'Cite uma das musicas mais ouvidas da historia do Spotify',
    fonte: 'Wikipedia, most-streamed songs on Spotify (2026) — sem Lose Yourself, que o corretor nao distingue de Love Yourself',
    tema: 'musica',
    dif: 40,
    itens: [
      item('Blinding Lights'), item('Shape Of You'), item('Sweater Weather'),
      item('Starboy'), item('As It Was'), item('One Dance'),
      item('Sunflower'), item('Someone You Loved'), item('Perfect'),
      item('Stay'), item('I Wanna Be Yours'), item('Die With A Smile'),
      item('Birds of a Feather'), item('Yellow'), item('Believer'),
      item('The Night We Met'), item('Heat Waves'), item('Riptide'),
      item('Closer'), item('Lovely'), item('Something Just Like This'),
      item('Every Breath You Take'), item('Iris'), item('Another Love'),
      item('Say You Wont Let Go'), item('Counting Stars'), item('Take Me To Church'),
      item('Photograph'), item('Viva La Vida'), item('Dance Monkey'),
      item('Cant Hold Us'), item('Locked Out Of Heaven'), item('Cruel Summer'),
      item('Just the Way You Are'), item('Mr. Brightside'), item('Rockstar'),
      item('Senorita'), item('Die For You'), item('Watermelon Sugar'),
      item('Thats What I Like'), item('In The End'), item('Love Yourself'),
      item('Dont Start Now'), item('When I Was Your Man'), item('Circles'),
      item('Bohemian Rhapsody'), item('Billie Jean'), item('Wake Me Up'),
      item('Without Me'), item('Let Me Love You'), item('Goosebumps'),
      item('Thinking Out Loud'), item('Lucid Dreams'), item('All of Me'),
      item('Espresso'), item('Gods Plan'), item('All The Stars'),
      item('Shallow'), item('Stressed Out'), item('Beautiful Things'),
      item('The Hills'), item('Demons'), item('Creep'),
      item('Do I Wanna Know'), item('Treat You Better'), item('See You Again'),
      item('Thunder'), item('Smells Like Teen Spirit'), item('Seven'),
      item('Sorry'), item('Wonderwall'), item('Unforgettable'),
      item('No Role Modelz'), item('505'),
      item('The Scientist'), item('Dont Stop Believin'), item('Humble'),
      item('Theres Nothing Holdin Me Back'), item('Flowers'), item('Bad Guy'),
      item('Drivers License'), item('End Of Beginning'), item('Dreams'),
      item('7 Rings'), item('Take On Me'), item('Numb'),
      item('Let Her Go'), item('Kill Bill'), item('Sweet Child O Mine'),
      item('Payphone'), item('One Of The Girls'), item('Save Your Tears'),
      item('Cold Heart'), item('Lean On'), item('One Kiss'),
      item('Uptown Funk'), item('Dont Stop Me Now'), item('Danza Kuduro'),
      item('Africa')
    ]
  },
  {
    id: 'albuns-vendidos',
    pergunta: 'Cite um dos 80 albuns mais vendidos da historia',
    fonte: 'Wikipedia, list of best-selling albums (2026)',
    tema: 'musica',
    dif: 45,
    itens: [
      item('Thriller'), item('Back in Black'), item('The Bodyguard', 'O Guarda-Costas'),
      item('The Dark Side of the Moon'), item('Their Greatest Hits 1971-1975'), item('Hotel California'),
      item('Come On Over'), item('Rumours'), item('Bat Out of Hell'),
      item('Saturday Night Fever'), item('Led Zeppelin IV'), item('Bad'),
      item('Jagged Little Pill'), item('Dirty Dancing'), item('Falling into You'),
      item('Dangerous'), item('21', 'Album 21 da Adele'), item('1', 'Album 1 dos Beatles'),
      item('Metallica'), item('Let\'s Talk About Love'), item('Legend', 'Legend do Bob Marley'),
      item('Nevermind'), item('Appetite for Destruction'), item('Born in the U.S.A.'),
      item('Gold: Greatest Hits'), item('Brothers in Arms'), item('The Immaculate Collection'),
      item('Supernatural'), item('Music Box'), item('The Wall'),
      item('Sgt. Pepper\'s Lonely Hearts Club Band'), item('Abbey Road'), item('Grease', 'Nos Tempos da Brilhantina'),
      item('Come Away with Me'), item('The Eminem Show'), item('Titanic', 'Trilha de Titanic'),
      item('Unplugged'), item('Greatest Hits'), item('Baby One More Time'),
      item('Slippery When Wet'), item('Greatest Hits do Journey'), item('Whitney Houston'),
      item('No Jacket Required'), item('The Marshall Mathers LP'), item('Hybrid Theory'),
      item('The Joshua Tree'), item('Purple Rain'), item('Tapestry'),
      item('True Blue'), item('Faith'), item('Bridge over Troubled Water'),
      item('Greatest Hits do Elton John'), item('Millennium'), item('25', 'Album 25 da Adele'),
      item('Spice'), item('The Sign'), item('American Idiot'),
      item('HIStory'), item('All the Way'), item('(What\'s the Story) Morning Glory?'),
      item('The Score'), item('Like a Virgin'), item('Cross Road'),
      item('Dookie'), item('Cracked Rear View'), item('Elvis\' Christmas Album'),
      item('Boston'), item('Daydream'), item('Whitney'),
      item('The Woman in Me'), item('Oops!... I Did It Again'), item('Hysteria'),
      item('The Miseducation of Lauryn Hill'), item('Tracy Chapman'), item('Off the Wall'),
      item('Can\'t Slow Down'), item('The Colour of My Love'), item('Wish You Were Here'),
      item('Romanza'), item('Back to Black')
    ]
  },
  {
    id: 'empresas-valiosas',
    pergunta: 'Cite uma das 100 empresas mais valiosas do mundo',
    fonte: 'CompaniesMarketCap, valor de mercado (2026)',
    tema: 'economia',
    dif: 35,
    itens: [
      item('NVIDIA'), item('Apple'), item('Alphabet', 'Google'),
      item('Microsoft'), item('Amazon'), item('TSMC', 'Taiwan Semiconductor'),
      item('SpaceX'), item('Broadcom'), item('Meta', 'Facebook'),
      item('Saudi Aramco', 'Aramco'), item('Tesla'), item('Samsung'),
      item('Micron'), item('Berkshire Hathaway', 'Berkshire'), item('Eli Lilly'),
      item('SK Hynix'), item('JPMorgan Chase'), item('AMD'),
      item('Walmart'), item('Visa'), item('Exxon Mobil'),
      item('Johnson & Johnson'), item('ASML'), item('CXMT'),
      item('Intel'), item('Mastercard'), item('Tencent'),
      item('AbbVie'), item('Oracle'), item('Cisco'),
      item('Palantir'), item('China Construction Bank'), item('Chevron'),
      item('Bank of America'), item('Costco'), item('Coca-Cola'),
      item('Caterpillar'), item('Merck'), item('Dell'),
      item('Lam Research'), item('Agricultural Bank of China'), item('Roche'),
      item('Applied Materials'), item('HSBC'), item('ICBC', 'Banco Industrial e Comercial da China'),
      item('Procter & Gamble'), item('UnitedHealth'), item('General Electric'),
      item('Morgan Stanley'), item('Bank of China'), item('Home Depot'),
      item('Netflix'), item('Palo Alto Networks'), item('Arm'),
      item('Philip Morris'), item('Alibaba'), item('Royal Bank of Canada'),
      item('Goldman Sachs'), item('Shell'), item('Novartis'),
      item('Sandisk'), item('RTX'), item('Wells Fargo'),
      item('Mitsubishi UFJ'), item('AstraZeneca'), item('Arista Networks'),
      item('GE Vernova'), item('Texas Instruments'), item('CrowdStrike'),
      item('SAP'), item('Thermo Fisher'), item('Nestle'),
      item('MediaTek'), item('Siemens'), item('Kweichow Moutai'),
      item('KLA'), item('L\'Oreal'), item('SoftBank'),
      item('International Holding Company'), item('LVMH'), item('Toyota'),
      item('PetroChina'), item('Citigroup'), item('Marvell'),
      item('BHP'), item('China Mobile'), item('IBM'),
      item('Linde'), item('American Express'), item('CATL'),
      item('Amgen'), item('Santander'), item('TotalEnergies'),
      item('Toronto-Dominion Bank'), item('Verizon'), item('Salesforce'),
      item('Seagate'), item('Allianz'), item('Amphenol'),
      item('Novo Nordisk')
    ]
  },
  {
    id: 'instagram-mundo',
    pergunta: 'Cite uma das 50 contas mais seguidas do Instagram',
    fonte: 'Wikipedia, most-followed Instagram accounts (2026)',
    tema: 'internet',
    dif: 35,
    itens: [
      item('Instagram', 'Perfil do Instagram'), item('Cristiano Ronaldo', 'Cristiano', 'CR7'), item('Lionel Messi', 'Messi'),
      item('Selena Gomez'), item('Dwayne Johnson', 'The Rock'), item('Kylie Jenner'),
      item('Ariana Grande'), item('Kim Kardashian'), item('Beyonce'),
      item('Khloe Kardashian'), item('Nike'), item('Justin Bieber'),
      item('Kendall Jenner'), item('Taylor Swift'), item('Virat Kohli'),
      item('National Geographic'), item('Neymar'), item('Jennifer Lopez'),
      item('Kourtney Kardashian'), item('Miley Cyrus'), item('Katy Perry'),
      item('Real Madrid', 'Real Madrid CF'), item('Zendaya'), item('Kevin Hart'),
      item('Cardi B'), item('LeBron James', 'LeBron'), item('Demi Lovato'),
      item('Barcelona', 'FC Barcelona', 'Barca'), item('Rihanna'), item('Chris Brown'),
      item('Drake'), item('Kylian Mbappe', 'Mbappe'), item('Ellen DeGeneres'),
      item('Billie Eilish'), item('Liga dos Campeoes', 'Champions League', 'UEFA Champions League'), item('Lisa'),
      item('Narendra Modi'), item('NASA'), item('Gal Gadot'),
      item('Vin Diesel'), item('Shakira'), item('Shraddha Kapoor'),
      item('Priyanka Chopra'), item('Jennie'), item('Dua Lipa'),
      item('NBA'), item('MrBeast'), item('David Beckham'),
      item('Snoop Dogg'), item('Alia Bhatt')
    ]
  },
  {
    id: 'instagram-brasil',
    pergunta: 'Cite um dos 20 brasileiros mais seguidos no Instagram',
    fonte: 'TechTudo, ranking de brasileiros no Instagram (2026)',
    tema: 'internet',
    dif: 35,
    pessoas: true,
    itens: [
      item('Neymar'), item('Ronaldinho Gaucho', 'Ronaldinho'), item('Marcelo'),
      item('Anitta'), item('Vinicius Junior', 'Vinicius Jr', 'Vini Jr'), item('Virginia Fonseca'),
      item('Whindersson Nunes'), item('Tata Werneck', 'Tata'), item('Larissa Manoela'),
      item('Maisa', 'Maisa Silva'), item('Gusttavo Lima'), item('Bruna Marquezine'),
      item('Marina Ruy Barbosa'), item('Simone Mendes'), item('Wesley Safadao'),
      item('Paolla Oliveira'), item('Marilia Mendonca'), item('Luan Santana'),
      item('Ivete Sangalo'), item('Carlinhos Maia')
    ]
  },
  {
    id: 'artilheiros-mundo',
    pergunta: 'Cite um dos maiores artilheiros da historia do futebol',
    fonte: 'Wikipedia, footballers with 500 or more goals',
    tema: 'futebol',
    dif: 45,
    pessoas: true,
    itens: [
      item('Cristiano Ronaldo', 'Cristiano', 'CR7'), item('Erwin Helmchen'), item('Josef Bican'),
      item('Lionel Messi', 'Messi'), item('Ronnie Rooke'), item('Jimmy Jones'),
      item('Ferenc Puskas'), item('Ferenc Deak'), item('Abe Lenstra'),
      item('Romario'), item('Pele', 'Edson Arantes'), item('Robert Lewandowski'),
      item('Tommy Lawton'), item('Gerd Muller'), item('Sammy Hughes'),
      item('Joe Bambrick'), item('Ernst Wilimowski'), item('Tom Waring'),
      item('Boy Martin'), item('Ferenc Bene'), item('Eusebio'),
      item('Stan Mortensen'), item('Fernando Peyroteo'), item('Joe Smith'),
      item('Frederick Roberts'), item('Luis Suarez'), item('Gyula Zsengeller'),
      item('Jimmy Greaves'), item('Uwe Seeler'), item('Fritz Walter'),
      item('Tulio Maravilha'), item('Zlatan Ibrahimovic'), item('David Wilson'),
      item('Jimmy Kelly'), item('Imre Schlosser'), item('Glenn Ferguson'),
      item('Franz Binder'), item('Charlie Fleming'), item('Hughie Gallacher'),
      item('Dixie Dean'), item('John Aldridge'), item('Isidro Langara'),
      item('Hugo Sanchez'), item('Jose Torres'), item('Karim Benzema'),
      item('Jimmy McGrory'), item('Sandor Kocsis'), item('Paul Dechamps'),
      item('Dave Halliday'), item('Jimmy Smith'), item('Zico'),
      item('Harry Kane'), item('Ferenc Szusza'), item('Jock Dodds'),
      item('Jozsef Takacs'), item('Tommy Dickson'), item('Otto Harder'),
      item('Dennis Westcott'), item('Joseph Mermans'), item('Hughie Ferguson'),
      item('Alfredo Di Stefano'), item('Nandor Hidegkuti'), item('Des Dickson'),
      item('Hans Krankl'), item('Gunnar Nordahl'), item('Roberto Dinamite'),
      item('W. G. Richardson'), item('George Brown'), item('Trevor Thompson'),
      item('Giorgio Chinaglia'), item('David McLean'), item('Gyorgy Sarosi'),
      item('George Camsell'), item('Arthur Rowley'), item('Istvan Avar'),
      item('Raich Carter'), item('Steve Bloomer'), item('Dennis Guy'),
      item('Willy van der Kuijlen'), item('Albert de Cleyn'), item('Delio Onnis'),
      item('Lajos Tichy')
    ]
  },
  {
    id: 'artilheiros-brasil',
    pergunta: 'Cite um dos 25 maiores artilheiros da Selecao Brasileira',
    fonte: 'Bolavip, ranking de artilheiros da Selecao',
    tema: 'futebol',
    dif: 35,
    pessoas: true,
    itens: [
      item('Neymar'), item('Pele', 'Edson Arantes'), item('Ronaldo'),
      item('Romario'), item('Zico'), item('Bebeto'),
      item('Rivaldo'), item('Jairzinho'), item('Ronaldinho Gaucho', 'Ronaldinho'),
      item('Ademir'), item('Tostao'), item('Zizinho'),
      item('Careca'), item('Kaka', 'Ricardo Kaka'), item('Luis Fabiano'),
      item('Robinho'), item('Adriano'), item('Rivelino'),
      item('Jair'), item('Socrates'), item('Leonidas'),
      item('Philippe Coutinho'), item('Roberto Dinamite'), item('Richarlison'),
      item('Didi')
    ]
  },
  {
    id: 'livros-vendidos',
    pergunta: 'Cite um dos 98 livros mais vendidos da historia',
    fonte: 'Wikipedia, list of best-selling books (2026)',
    tema: 'literatura',
    dif: 45,
    itens: [
      item('Um Conto de Duas Cidades'), item('O Pequeno Principe'), item('O Alquimista'),
      item('Harry Potter e a Pedra Filosofal', 'Pedra Filosofal'), item('E Nao Sobrou Nenhum', 'O Caso dos Dez Negrinhos'), item('O Sonho da Camara Vermelha'),
      item('O Hobbit'), item('Alice no Pais das Maravilhas'), item('She'),
      item('O Codigo Da Vinci'), item('Harry Potter e a Camara Secreta', 'Camara Secreta'), item('O Apanhador no Campo de Centeio'),
      item('O Mundo de Sofia'), item('As Pontes de Madison'), item('Cem Anos de Solidao'),
      item('Lolita'), item('Heidi'), item('Meu Filho, Meu Tesouro'),
      item('Anne de Green Gables'), item('Beleza Negra'), item('O Nome da Rosa'),
      item('A Aguia Pousou'), item('A Longa Jornada'), item('O Relatorio Hite'),
      item('A Teia de Charlotte', 'A Teia de Carlota'), item('O Homem Ruivo'), item('Uma Vida com Propositos'),
      item('Pedro Coelho'), item('Fernao Capelo Gaivota'), item('A Lagarta Comilona'),
      item('Uma Mensagem a Garcia'), item('O Sol e Para Todos', 'To Kill a Mockingbird'), item('Flores no Atico'),
      item('Cosmos'), item('Anjos e Demonios'), item('Como Fazer Amigos e Influenciar Pessoas'),
      item('Alcoolicos Anonimos'), item('Medo de Voar'), item('Assim Foi Temperado o Aco'),
      item('Guerra e Paz'), item('As Aventuras de Pinoquio'), item('O Diario de Anne Frank'),
      item('Suas Zonas Erroneas'), item('Passaros Feridos'), item('Kane e Abel'),
      item('O Cacador de Pipas'), item('O Vale das Bonecas'), item('O Grande Gatsby'),
      item('E o Vento Levou'), item('Rebecca'), item('A Revolta de Mamie Stover'),
      item('Os Homens que Nao Amavam as Mulheres', 'Millennium', 'A Garota com a Tatuagem de Dragao'), item('O Simbolo Perdido'), item('Jogos Vorazes'),
      item('James e o Pessego Gigante'), item('Ben-Hur'), item('A Jovem Guarda'),
      item('Quem Mexeu no Meu Queijo'), item('Uma Breve Historia do Tempo'), item('Paulo e Virginia'),
      item('Sede de Viver'), item('O Vento nos Salgueiros'), item('Os 7 Habitos das Pessoas Altamente Eficazes'),
      item('Totto-chan'), item('Sapiens'), item('Terras Desbravadas'),
      item('A Profecia Celestina'), item('A Culpa e das Estrelas'), item('A Garota no Trem'),
      item('A Cabana'), item('Tio Stiopa'), item('O Poderoso Chefao'),
      item('Love Story'), item('Em Chamas'), item('A Esperanca'),
      item('Kitchen'), item('A Nebulosa de Andromeda'), item('Garota Exemplar'),
      item('O Triangulo das Bermudas'), item('O Mundo se Despedaca'), item('Totem do Lobo'),
      item('The Happy Hooker'), item('Tubarao'), item('Para Sempre'),
      item('A Sala das Mulheres'), item('O Que Esperar Quando Voce Esta Esperando'), item('As Aventuras de Huckleberry Finn'),
      item('O Diario Secreto de Adrian Mole'), item('Orgulho e Preconceito'), item('Kon-Tiki'),
      item('O Bom Soldado Svejk'), item('Onde Vivem os Monstros'), item('O Poder do Pensamento Positivo'),
      item('O Segredo'), item('Duna'), item('A Fantastica Fabrica de Chocolate', 'Charlie e a Fabrica de Chocolate'),
      item('O Macaco Nu'), item('Kokoro')
    ]
  },
  {
    id: 'jogadores-titulos',
    pergunta: 'Cite um dos 25 jogadores com mais titulos na carreira',
    fonte: 'Consenso de scores24, SportsMole e GiveMeSport — ordem aproximada, as fontes divergem',
    tema: 'futebol',
    dif: 45,
    pessoas: true,
    itens: [
      item('Lionel Messi'), item('Dani Alves'), item('Marquinhos'),
      item('Hossam Hassan'), item('Hossam Ashour'), item('Andres Iniesta'),
      item('Sergio Busquets'), item('Gerard Pique'), item('Angel Di Maria', 'Di Maria'),
      item('David Alaba'), item('Karim Benzema'), item('Thomas Muller', 'Muller'),
      item('Ryan Giggs'), item('Cristiano Ronaldo'), item('Toni Kroos'),
      item('Luka Modric', 'Modric'), item('Maxwell'), item('Xavi'),
      item('Zlatan Ibrahimovic'), item('Marcelo'), item('Dani Carvajal'),
      item('Nacho Fernandez', 'Nacho'), item('Neymar'), item('Sergio Ramos'),
      item('Carles Puyol')
    ]
  },
  {
    id: 'estados-populosos',
    pergunta: 'Cite um dos 27 estados do Brasil, do mais populoso ao menos',
    fonte: 'IBGE via Wikipedia, populacao das unidades federativas (2026)',
    tema: 'geografia',
    dif: 25,
    itens: [
      item('Sao Paulo'), item('Minas Gerais'), item('Rio de Janeiro'),
      item('Bahia'), item('Parana'), item('Rio Grande do Sul'),
      item('Pernambuco'), item('Ceara'), item('Para'),
      item('Santa Catarina'), item('Goias'), item('Maranhao'),
      item('Amazonas'), item('Paraiba'), item('Espirito Santo'),
      item('Mato Grosso'), item('Rio Grande do Norte'), item('Piaui'),
      item('Alagoas'), item('Distrito Federal', 'Brasilia', 'DF'), item('Mato Grosso do Sul'),
      item('Sergipe'), item('Rondonia'), item('Tocantins'),
      item('Acre'), item('Amapa'), item('Roraima')
    ]
  }
];

/*
 * Sobrenome basta: "Marquezine" vale por "Bruna Marquezine". Vale so nas
 * listas marcadas com `pessoas`, e so quando o sobrenome nao acerta outro
 * item da MESMA lista — senao "Ronaldo" decidiria sozinho entre dois nomes.
 */
for (const lista of RANKINGS) {
  if (!lista.pessoas) continue;

  const atalhos = lista.itens.map((it) => sobrenomesDe(it.oficial));
  const conhecidas = lista.itens.map((it) =>
    [it.oficial, ...it.variantes].map(normalizar).filter(Boolean));

  lista.itens.forEach((it, i) => {
    const novos = atalhos[i].filter((forma) => {
      const f = normalizar(forma);
      if (conhecidas[i].includes(f)) return false;
      return !conhecidas.some((outras, j) => j !== i
        && outras.some((c) => distancia(f, c) / c.length < LIMITE_CERTO));
    });
    if (novos.length) it.variantes = [...it.variantes, ...novos];
  });
}

module.exports = { RANKINGS };
