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
  }
];

module.exports = { RANKINGS };
