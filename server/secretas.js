'use strict';

/**
 * Pergunta secreta: o enunciado comeca todo escondido e abre uma palavra por
 * vez, em ordem sorteada, uma a cada vez de jogador. Quem acerta leva o
 * numero de palavras que ainda estavam escondidas.
 *
 * Como a palavra que abre e sorteada, cada pergunta precisa de mais de uma
 * pista forte espalhada pela frase ("anjo", "pernas tortas", "futebol"): se
 * tudo dependesse de uma palavra so, a rodada seria pura sorte.
 *
 * Toda pergunta tem pelo menos 13 palavras (testes/secreta.test.js cobra),
 * sem acentos, como o resto do texto do jogo. `categoria` e o id de
 * questions.js: a sala so sorteia das categorias que o lider marcou.
 */
const SECRETAS = [
  /* ------------------------------ Futebol ------------------------------ */
  { categoria: 'futebol', pergunta: 'Anjo das pernas tortas e o apelido de qual jogador de futebol brasileiro campeao do mundo?', resposta: 'Garrincha', aceita: ['Mane Garrincha'] },
  { categoria: 'futebol', pergunta: 'Fenomeno, dentuco e artilheiro da Copa de 2002, qual e o nome deste atacante brasileiro?', resposta: 'Ronaldo', aceita: ['Ronaldo Fenomeno', 'Ronaldo Nazario'] },
  { categoria: 'futebol', pergunta: 'Mao de Deus e gol do seculo contra a Inglaterra em 1986 foram feitos por qual craque argentino?', resposta: 'Maradona', aceita: ['Diego Maradona'] },
  { categoria: 'futebol', pergunta: 'Galinho de Quintino e o maior idolo da historia do Flamengo, qual e o nome desse meia?', resposta: 'Zico', aceita: [] },
  { categoria: 'futebol', pergunta: 'Maracanazo foi a derrota do Brasil em casa na final de 1950 para qual selecao sul americana?', resposta: 'Uruguai', aceita: [] },
  { categoria: 'futebol', pergunta: 'Rei do futebol, tricampeao mundial e mais de mil gols na carreira: quem e esse jogador do Santos?', resposta: 'Pele', aceita: ['Edson Arantes do Nascimento'] },
  { categoria: 'futebol', pergunta: 'Sete a um em Belo Horizonte na Copa de 2014 foi a goleada que o Brasil levou de qual selecao?', resposta: 'Alemanha', aceita: [] },
  { categoria: 'futebol', pergunta: 'Bruxo, sorriso largo e Bola de Ouro em 2005 com a camisa do Barcelona: quem e esse brasileiro?', resposta: 'Ronaldinho', aceita: ['Ronaldinho Gaucho'] },
  { categoria: 'futebol', pergunta: 'Siuuu e a comemoracao famosa de qual atacante portugues que jogou no Manchester United e no Real Madrid?', resposta: 'Cristiano Ronaldo', aceita: ['CR7', 'Cristiano'] },
  { categoria: 'futebol', pergunta: 'Pulga e o apelido de qual camisa dez argentino que ganhou oito Bolas de Ouro e a Copa de 2022?', resposta: 'Messi', aceita: ['Lionel Messi', 'Leo Messi'] },
  { categoria: 'futebol', pergunta: 'Imperador era o apelido deste atacante canhoto que brilhou na Inter de Milao e no Flamengo, quem e ele?', resposta: 'Adriano', aceita: ['Adriano Imperador'] },
  { categoria: 'futebol', pergunta: 'Mundial de 2012 em Yokohama contra o Chelsea, com gol de Guerrero, foi conquistado por qual clube paulista?', resposta: 'Corinthians', aceita: [] },
  { categoria: 'futebol', pergunta: 'Rabo de cavalo budista e penalti perdido na final de 1994 contra o Brasil marcam qual craque italiano?', resposta: 'Roberto Baggio', aceita: ['Baggio'] },
  { categoria: 'futebol', pergunta: 'Old Trafford e o estadio de qual clube ingles conhecido como Diabos Vermelhos da cidade de Manchester?', resposta: 'Manchester United', aceita: ['United'] },
  { categoria: 'futebol', pergunta: 'Tetracampeao em 1994 nos Estados Unidos, o Brasil venceu nos penaltis a final contra qual selecao europeia?', resposta: 'Italia', aceita: [] },

  /* ------------------------------ Esportes ----------------------------- */
  { categoria: 'esportes', pergunta: 'Tema da vitoria tocava toda vez que este piloto brasileiro tricampeao de Formula 1 vencia, quem era ele?', resposta: 'Ayrton Senna', aceita: ['Senna'] },
  { categoria: 'esportes', pergunta: 'Raio na comemoracao e recorde de nove segundos e cinquenta e oito nos cem metros: quem e esse velocista jamaicano?', resposta: 'Usain Bolt', aceita: ['Bolt'] },
  { categoria: 'esportes', pergunta: 'Vinte e oito medalhas olimpicas fazem deste nadador americano o maior medalhista da historia, qual e o nome dele?', resposta: 'Michael Phelps', aceita: ['Phelps'] },
  { categoria: 'esportes', pergunta: 'Guga ficou famoso por desenhar um coracao no saibro de Roland Garros, qual e o esporte dele?', resposta: 'Tenis', aceita: [] },
  { categoria: 'esportes', pergunta: 'Fadinha do skate ganhou prata em Toquio com apenas treze anos, qual e o nome dessa atleta brasileira?', resposta: 'Rayssa Leal', aceita: ['Rayssa'] },
  { categoria: 'esportes', pergunta: 'Air Jordan e o tenis que leva o nome de qual lenda do basquete que jogou no Chicago Bulls?', resposta: 'Michael Jordan', aceita: ['Jordan'] },
  { categoria: 'esportes', pergunta: 'Dez perfeito em Montreal 1976 foi a primeira nota maxima da ginastica olimpica, conquistada por qual atleta romena?', resposta: 'Nadia Comaneci', aceita: ['Comaneci'] },
  { categoria: 'esportes', pergunta: 'Rei do saibro com quatorze titulos de Roland Garros, quem e esse tenista espanhol canhoto de Mallorca?', resposta: 'Rafael Nadal', aceita: ['Nadal', 'Rafa Nadal'] },
  { categoria: 'esportes', pergunta: 'Cinturao, octogono e finalizacao sao palavras do UFC, que e a maior liga de qual esporte de luta?', resposta: 'MMA', aceita: ['Artes marciais mistas'] },
  { categoria: 'esportes', pergunta: 'Rebeca Andrade ganhou ouro no salto e prata no individual geral em Toquio em qual modalidade olimpica?', resposta: 'Ginastica artistica', aceita: ['Ginastica'] },
  { categoria: 'esportes', pergunta: 'Touchdown vale seis pontos e o Super Bowl decide o campeao de qual esporte muito popular nos Estados Unidos?', resposta: 'Futebol americano', aceita: [] },

  /* ----------------------------- Geografia ----------------------------- */
  { categoria: 'geografia', pergunta: 'Cristo Redentor de bracos abertos no alto do Corcovado fica em qual cidade brasileira famosa pelas praias?', resposta: 'Rio de Janeiro', aceita: ['Rio'] },
  { categoria: 'geografia', pergunta: 'Canguru e coala so existem naturalmente neste pais, que tambem e um continente inteiro, qual e o nome dele?', resposta: 'Australia', aceita: [] },
  { categoria: 'geografia', pergunta: 'Maior deserto quente do mundo, ocupando boa parte do norte da Africa, qual e o nome deste deserto?', resposta: 'Saara', aceita: ['Sahara', 'Deserto do Saara'] },
  { categoria: 'geografia', pergunta: 'Oito mil oitocentos e quarenta e oito metros e a altura da montanha mais alta do planeta, qual e ela?', resposta: 'Everest', aceita: ['Monte Everest'] },
  { categoria: 'geografia', pergunta: 'Pais da bota no mapa da Europa, com Roma, Veneza e a pizza napolitana, qual e o nome dele?', resposta: 'Italia', aceita: [] },
  { categoria: 'geografia', pergunta: 'Encontro das aguas do Negro e do Solimoes acontece perto de qual capital brasileira no meio da floresta?', resposta: 'Manaus', aceita: [] },
  { categoria: 'geografia', pergunta: 'Tulipas, moinhos de vento e bicicletas por todo lado sao simbolos de qual pais europeu com capital em Amsterda?', resposta: 'Holanda', aceita: ['Paises Baixos'] },
  { categoria: 'geografia', pergunta: 'Cataratas com duzentas e setenta e cinco quedas na fronteira entre Brasil e Argentina ficam em qual cidade paranaense?', resposta: 'Foz do Iguacu', aceita: ['Foz'] },
  { categoria: 'geografia', pergunta: 'Sol nascente e o desenho da bandeira de qual pais asiatico formado por ilhas, com capital em Toquio?', resposta: 'Japao', aceita: [] },
  { categoria: 'geografia', pergunta: 'Maior pais do mundo em area, cruzando a Europa e a Asia inteira, qual e o nome desse pais gigante?', resposta: 'Russia', aceita: [] },
  { categoria: 'geografia', pergunta: 'Planejada por Lucio Costa no formato de um aviao, qual cidade e a capital federal do Brasil desde 1960?', resposta: 'Brasilia', aceita: [] },
  { categoria: 'geografia', pergunta: 'Fiordes gelados, aurora boreal e a capital Oslo ficam em qual pais nordico da Escandinavia, vizinho da Suecia?', resposta: 'Noruega', aceita: [] },
  { categoria: 'geografia', pergunta: 'Machu Picchu, a cidade perdida dos incas no alto dos Andes, fica em qual pais da America do Sul?', resposta: 'Peru', aceita: [] },
  { categoria: 'geografia', pergunta: 'Mais extenso e mais caudaloso do Brasil, nascendo nos Andes do Peru, qual e o nome desse grande rio?', resposta: 'Amazonas', aceita: ['Rio Amazonas'] },

  /* ------------------------------ Historia ----------------------------- */
  { categoria: 'historia', pergunta: 'Independencia ou morte foi o grito as margens do Ipiranga dado por qual principe portugues em 1822?', resposta: 'Dom Pedro I', aceita: ['Pedro I', 'Dom Pedro'] },
  { categoria: 'historia', pergunta: 'Lei Aurea assinada em 1888 acabou com a escravidao no Brasil, e quem assinou foi qual princesa imperial?', resposta: 'Princesa Isabel', aceita: ['Isabel'] },
  { categoria: 'historia', pergunta: 'Bicorne, mao dentro do casaco e derrota em Waterloo marcam qual imperador frances baixinho do seculo dezenove?', resposta: 'Napoleao', aceita: ['Napoleao Bonaparte', 'Bonaparte'] },
  { categoria: 'historia', pergunta: 'Mil quatrocentos e noventa e dois foi o ano em que qual navegador genoves chegou a America pela Espanha?', resposta: 'Cristovao Colombo', aceita: ['Colombo'] },
  { categoria: 'historia', pergunta: 'Muro que dividia uma capital europeia caiu em 1989 e reunificou qual pais dividido desde a Segunda Guerra?', resposta: 'Alemanha', aceita: [] },
  { categoria: 'historia', pergunta: 'Inconfidencia Mineira terminou com o enforcamento de qual alferes, hoje considerado heroi nacional e lembrado em abril?', resposta: 'Tiradentes', aceita: ['Joaquim Jose da Silva Xavier'] },
  { categoria: 'historia', pergunta: 'Eu tenho um sonho foi o discurso de 1963 de qual lider americano da luta pelos direitos civis dos negros?', resposta: 'Martin Luther King', aceita: ['Luther King', 'Martin Luther King Jr'] },
  { categoria: 'historia', pergunta: 'Titanic afundou em 1912 na primeira viagem depois de bater em um iceberg em qual oceano do planeta?', resposta: 'Atlantico', aceita: ['Oceano Atlantico'] },
  { categoria: 'historia', pergunta: 'Cleopatra foi a ultima rainha de qual civilizacao antiga das piramides, dos faraos e do rio Nilo?', resposta: 'Egito', aceita: ['Egito Antigo', 'Egipcia'] },
  { categoria: 'historia', pergunta: 'Pequeno passo para um homem, salto gigante para a humanidade, disse em 1969 qual astronauta ao pisar na Lua?', resposta: 'Neil Armstrong', aceita: ['Armstrong'] },
  { categoria: 'historia', pergunta: 'Pai da aviacao para os brasileiros, voou com o 14 Bis em Paris em 1906, qual e o nome dele?', resposta: 'Santos Dumont', aceita: ['Alberto Santos Dumont'] },
  { categoria: 'historia', pergunta: 'Tridente, mar e cavalos sao simbolos de qual deus grego dos oceanos, irmao de Zeus e de Hades?', resposta: 'Poseidon', aceita: ['Netuno'] },
  { categoria: 'historia', pergunta: 'Martelo voador chamado Mjolnir pertence a qual deus nordico do trovao, filho de Odin e irmao de Loki?', resposta: 'Thor', aceita: [] },

  /* ------------------------------ Ciencia ------------------------------ */
  { categoria: 'ciencia', pergunta: 'Maca caindo na cabeca teria inspirado qual cientista ingles a formular a lei da gravitacao universal?', resposta: 'Isaac Newton', aceita: ['Newton'] },
  { categoria: 'ciencia', pergunta: 'E igual a m c ao quadrado e a equacao mais famosa de qual fisico alemao de cabelo baguncado?', resposta: 'Albert Einstein', aceita: ['Einstein'] },
  { categoria: 'ciencia', pergunta: 'Usina de energia da celula, com DNA proprio, e o apelido de qual organela das aulas de biologia?', resposta: 'Mitocondria', aceita: [] },
  { categoria: 'ciencia', pergunta: 'Planeta vermelho com o maior vulcao do sistema solar e alvo de robos da Nasa, qual e o nome dele?', resposta: 'Marte', aceita: [] },
  { categoria: 'ciencia', pergunta: 'Clorofila, luz do sol e gas carbonico sao os ingredientes do processo em que plantas produzem o proprio alimento, qual?', resposta: 'Fotossintese', aceita: [] },
  { categoria: 'ciencia', pergunta: 'Au e o simbolo na tabela periodica de qual metal amarelo e precioso usado em medalhas e aliancas?', resposta: 'Ouro', aceita: [] },
  { categoria: 'ciencia', pergunta: 'Penicilina foi descoberta por acaso em 1928 num fungo de laboratorio por qual cientista escoces?', resposta: 'Alexander Fleming', aceita: ['Fleming'] },
  { categoria: 'ciencia', pergunta: 'Aneis enormes de gelo e rocha fazem dele o planeta mais bonito do telescopio, qual e o sexto planeta do sistema solar?', resposta: 'Saturno', aceita: [] },
  { categoria: 'ciencia', pergunta: 'Maior orgao do corpo humano, que protege contra germes e regula a temperatura, qual e o nome dele?', resposta: 'Pele', aceita: [] },
  { categoria: 'ciencia', pergunta: 'Evolucao das especies por selecao natural foi a teoria publicada em 1859 por qual naturalista ingles?', resposta: 'Charles Darwin', aceita: ['Darwin'] },
  { categoria: 'ciencia', pergunta: 'Agua congela a zero grau e ferve a cem graus nesta escala de temperatura criada por um astronomo sueco, qual e ela?', resposta: 'Celsius', aceita: ['Escala Celsius', 'Graus Celsius'] },

  /* --------------------------- Cinema & TV ---------------------------- */
  { categoria: 'cinema', pergunta: 'Rosebud e a ultima palavra dita pelo protagonista de qual classico de Orson Welles lancado em 1941?', resposta: 'Cidadao Kane', aceita: [] },
  { categoria: 'cinema', pergunta: 'Hakuna matata e a filosofia de Timao e Pumba em qual desenho da Disney sobre um leaozinho chamado Simba?', resposta: 'O Rei Leao', aceita: ['Rei Leao'] },
  { categoria: 'cinema', pergunta: 'Expecto patronum e o feitico que afasta dementadores na saga de qual bruxo de oculos com cicatriz na testa?', resposta: 'Harry Potter', aceita: [] },
  { categoria: 'cinema', pergunta: 'Wilson, uma bola de volei, vira o melhor amigo de Tom Hanks perdido numa ilha em qual filme?', resposta: 'Naufrago', aceita: ['O Naufrago', 'Cast Away'] },
  { categoria: 'cinema', pergunta: 'Pilula azul ou pilula vermelha e a escolha que Morpheus oferece a Neo em qual filme de ficcao de 1999?', resposta: 'Matrix', aceita: ['The Matrix'] },
  { categoria: 'cinema', pergunta: 'Dadinho e o nome de infancia de Ze Pequeno em qual filme brasileiro de 2002 dirigido por Fernando Meirelles?', resposta: 'Cidade de Deus', aceita: [] },
  { categoria: 'cinema', pergunta: 'Eu sou seu pai e a revelacao que Darth Vader faz a Luke Skywalker em qual saga espacial?', resposta: 'Star Wars', aceita: ['Guerra nas Estrelas'] },
  { categoria: 'cinema', pergunta: 'Mickey, Pato Donald e Pateta sao os personagens mais antigos de qual estudio americano de animacao e parques tematicos?', resposta: 'Disney', aceita: ['Walt Disney'] },
  { categoria: 'cinema', pergunta: 'Winter is coming e o lema da casa Stark em qual serie da HBO sobre a disputa pelo Trono de Ferro?', resposta: 'Game of Thrones', aceita: ['GoT'] },
  { categoria: 'cinema', pergunta: 'Heisenberg e o nome que um professor de quimica adota ao virar traficante em qual serie americana?', resposta: 'Breaking Bad', aceita: [] },
  { categoria: 'cinema', pergunta: 'Pedra, papel, tesoura, lagarto, Spock e o jogo explicado por Sheldon em qual serie de comedia sobre cientistas nerds?', resposta: 'The Big Bang Theory', aceita: ['Big Bang Theory', 'Big Bang'] },
  { categoria: 'cinema', pergunta: 'Mundo Invertido, Eleven e Demogorgon aparecem em qual serie da Netflix ambientada nos anos oitenta em Hawkins?', resposta: 'Stranger Things', aceita: [] },
  { categoria: 'cinema', pergunta: 'Dona Florinda, Chiquinha e o professor Girafales moram na mesma vila deste seriado mexicano, qual e o nome do protagonista?', resposta: 'Chaves', aceita: ['El Chavo'] },
  { categoria: 'cinema', pergunta: 'Rose solta a mao de Jack no mar gelado no final de qual filme de James Cameron de 1997?', resposta: 'Titanic', aceita: [] },
  { categoria: 'cinema', pergunta: 'Ogro verde que mora num pantano e se apaixona pela princesa Fiona e o heroi de qual animacao da DreamWorks?', resposta: 'Shrek', aceita: [] },

  /* ------------------------------- Musica ------------------------------ */
  { categoria: 'musica', pergunta: 'Moonwalk e a luva branca de uma mao so viraram marca registrada de qual rei do pop americano?', resposta: 'Michael Jackson', aceita: ['Michael'] },
  { categoria: 'musica', pergunta: 'Garota de Ipanema foi composta por Vinicius de Moraes e qual maestro, um dos pais da bossa nova?', resposta: 'Tom Jobim', aceita: ['Jobim', 'Antonio Carlos Jobim'] },
  { categoria: 'musica', pergunta: 'Abbey Road, a faixa de pedestres mais famosa do mundo, e capa de um disco de qual banda de Liverpool?', resposta: 'Beatles', aceita: ['The Beatles'] },
  { categoria: 'musica', pergunta: 'Rainha dos baixinhos, com nave espacial e paquitas, apresentava programa infantil na Globo, quem e essa apresentadora?', resposta: 'Xuxa', aceita: ['Xuxa Meneghel'] },
  { categoria: 'musica', pergunta: 'Brasilia amarela com roda gaucha aparece no maior sucesso de qual banda de Guarulhos que fez fama em 1995?', resposta: 'Mamonas Assassinas', aceita: ['Mamonas'] },
  { categoria: 'musica', pergunta: 'Freddie Mercury era o vocalista de bigode de qual banda britanica de We Will Rock You e Bohemian Rhapsody?', resposta: 'Queen', aceita: [] },
  { categoria: 'musica', pergunta: 'Rainha do rock brasileiro, ex Mutantes e cantora de Ovelha Negra, quem foi essa artista paulistana?', resposta: 'Rita Lee', aceita: [] },
  { categoria: 'musica', pergunta: 'Show das Poderosas, Vai Malandra e Envolver sao sucessos de qual cantora carioca que virou fenomeno mundial?', resposta: 'Anitta', aceita: [] },
  { categoria: 'musica', pergunta: 'Swifties e o nome dos fas de qual cantora americana dona da turne The Eras Tour?', resposta: 'Taylor Swift', aceita: ['Taylor'] },
  { categoria: 'musica', pergunta: 'Asa Branca, o hino do sertao nordestino, foi gravada por qual rei do baiao com sanfona e chapeu de couro?', resposta: 'Luiz Gonzaga', aceita: ['Gonzagao'] },
  { categoria: 'musica', pergunta: 'Faroeste Caboclo, com mais de nove minutos, e uma musica de qual banda de rock de Brasilia liderada por Renato Russo?', resposta: 'Legiao Urbana', aceita: [] },

  /* ------------------------------- Anime ------------------------------- */
  { categoria: 'anime', pergunta: 'Kamehameha e o golpe de energia mais famoso de qual saiyajin criado por Akira Toriyama em Dragon Ball?', resposta: 'Goku', aceita: ['Son Goku', 'Kakarotto'] },
  { categoria: 'anime', pergunta: 'Dattebayo e a mania de fala do ninja loiro que sonha em ser Hokage em qual anime da vila da Folha?', resposta: 'Naruto', aceita: [] },
  { categoria: 'anime', pergunta: 'Chapeu de palha e corpo de borracha sao marcas do capitao que quer ser o Rei dos Piratas em qual anime?', resposta: 'One Piece', aceita: [] },
  { categoria: 'anime', pergunta: 'Death Note e o caderno que mata quem tem o nome escrito nele, e quem o usa e qual estudante genio?', resposta: 'Light Yagami', aceita: ['Light', 'Kira'] },
  { categoria: 'anime', pergunta: 'Pika pika e tudo o que fala o mascote amarelo e eletrico de Ash em qual franquia de monstrinhos?', resposta: 'Pokemon', aceita: [] },
  { categoria: 'anime', pergunta: 'Titas gigantes atras de muralhas enormes devoram humanos em qual anime protagonizado por Eren Yeager?', resposta: 'Attack on Titan', aceita: ['Shingeki no Kyojin', 'Ataque dos Titas'] },
  { categoria: 'anime', pergunta: 'Cavaleiros de bronze vestem armaduras de constelacoes para proteger Atena em qual anime classico dos anos oitenta?', resposta: 'Cavaleiros do Zodiaco', aceita: ['Saint Seiya', 'Os Cavaleiros do Zodiaco'] },
  { categoria: 'anime', pergunta: 'Ryomen Sukuna e o rei das maldicoes que vive dentro de Yuji Itadori em qual anime de feiticeiros?', resposta: 'Jujutsu Kaisen', aceita: [] },

  /* ------------------------------- Games ------------------------------- */
  { categoria: 'games', pergunta: 'Encanador bigodudo de macacao vermelho que pula em cogumelos e salva a princesa Peach, qual e o nome dele?', resposta: 'Mario', aceita: ['Super Mario'] },
  { categoria: 'games', pergunta: 'Creepers explodem e tudo e feito de blocos cubicos neste jogo de sobrevivencia e construcao, qual e o nome dele?', resposta: 'Minecraft', aceita: [] },
  { categoria: 'games', pergunta: 'Ourico azul e veloz que junta aneis dourados e enfrenta o Doutor Robotnik, qual e o nome desse mascote da Sega?', resposta: 'Sonic', aceita: ['Sonic the Hedgehog'] },
  { categoria: 'games', pergunta: 'Battle royale com cem jogadores, construcao de paredes e dancinhas famosas, qual e esse jogo da Epic Games?', resposta: 'Fortnite', aceita: [] },
  { categoria: 'games', pergunta: 'Triforce, Hyrule e a espada mestra aparecem na saga em que o heroi Link salva qual princesa?', resposta: 'Zelda', aceita: ['Princesa Zelda'] },
  { categoria: 'games', pergunta: 'Fatality e o golpe final sangrento de qual jogo de luta com Scorpion, Sub Zero e Raiden?', resposta: 'Mortal Kombat', aceita: [] },
  { categoria: 'games', pergunta: 'Pacotes de cartas de jogadores, Ultimate Team e lancamento todo ano: qual e essa franquia de futebol da EA?', resposta: 'FIFA', aceita: ['EA FC', 'EA Sports FC'] },
  { categoria: 'games', pergunta: 'Bolinhas comidas num labirinto enquanto quatro fantasminhas coloridos perseguem: qual e o nome desse classico do fliperama amarelo?', resposta: 'Pac Man', aceita: ['Pacman'] },
  { categoria: 'games', pergunta: 'Impostor e tripulante discutem quem e o suspeito numa nave espacial neste jogo de 2018, qual e o nome dele?', resposta: 'Among Us', aceita: [] },

  /* ----------------------------- Mainstream ---------------------------- */
  { categoria: 'mainstream', pergunta: 'Paredao, anjo, lider e eliminacao toda semana fazem parte de qual reality show apresentado na Globo?', resposta: 'Big Brother Brasil', aceita: ['BBB', 'Big Brother'] },
  { categoria: 'mainstream', pergunta: 'Brigadeiro, pao de queijo e coxinha costumam aparecer juntos em qual tipo de festa brasileira de criancas?', resposta: 'Aniversario', aceita: ['Festa de aniversario'] },
  { categoria: 'mainstream', pergunta: 'Quadrilha, pamonha, fogueira e quentao fazem parte de qual festa tradicional brasileira comemorada no mes de junho?', resposta: 'Festa Junina', aceita: ['Sao Joao'] },
  { categoria: 'mainstream', pergunta: 'Barba branca, roupa vermelha e um treno puxado por renas sao a marca de qual bom velhinho do Natal?', resposta: 'Papai Noel', aceita: ['Noel', 'Santa Claus'] },
  { categoria: 'mainstream', pergunta: 'Mascaras, carros alegoricos e escolas de samba desfilam na Sapucai durante qual festa popular brasileira de fevereiro?', resposta: 'Carnaval', aceita: [] },
  { categoria: 'mainstream', pergunta: 'Tweet, hashtag e passarinho azul eram simbolos da rede social que Elon Musk comprou e rebatizou de X, qual era o nome antigo?', resposta: 'Twitter', aceita: [] },

  /* ------------------------------- Marcas ------------------------------ */
  { categoria: 'marcas', pergunta: 'Maca mordida e o logotipo de qual empresa americana que fabrica o iPhone e foi fundada por Steve Jobs?', resposta: 'Apple', aceita: [] },
  { categoria: 'marcas', pergunta: 'Just do it e o slogan de qual marca esportiva americana cujo simbolo e um risco chamado swoosh?', resposta: 'Nike', aceita: [] },
  { categoria: 'marcas', pergunta: 'Arcos dourados formando um M amarelo sao o simbolo de qual rede de lanchonetes famosa pelo Big Mac?', resposta: 'McDonalds', aceita: ['Mc Donalds', 'Mequi'] },
  { categoria: 'marcas', pergunta: 'Cavalo empinado sobre fundo amarelo e o simbolo de qual fabricante italiana de carros esportivos vermelhos de Maranello?', resposta: 'Ferrari', aceita: [] },
  { categoria: 'marcas', pergunta: 'Sereia verde de duas caudas e o logotipo de qual rede americana de cafeterias nascida em Seattle?', resposta: 'Starbucks', aceita: [] },
  { categoria: 'marcas', pergunta: 'Tres listras paralelas nos tenis e roupas identificam qual marca esportiva alema rival da Nike e da Puma?', resposta: 'Adidas', aceita: [] },
  { categoria: 'marcas', pergunta: 'Garrafa contour e receita secreta guardada a sete chaves sao marcas de qual refrigerante de cola de Atlanta?', resposta: 'Coca Cola', aceita: ['Coca'] },

  /* ----------------------------- Matematica ---------------------------- */
  { categoria: 'matematica', pergunta: 'Tres virgula catorze e o comeco de qual numero que relaciona o comprimento e o diametro de um circulo?', resposta: 'Pi', aceita: [] },
  { categoria: 'matematica', pergunta: 'Hipotenusa ao quadrado e igual a soma dos quadrados dos catetos, diz o teorema de qual matematico grego?', resposta: 'Pitagoras', aceita: [] },
  { categoria: 'matematica', pergunta: 'Divisivel apenas por um e por ele mesmo, como dois, tres, cinco e sete, e que tipo de numero?', resposta: 'Primo', aceita: ['Numero primo', 'Primos'] },
  { categoria: 'matematica', pergunta: 'Seis faces quadradas iguais, oito vertices e doze arestas formam qual figura geometrica de tres dimensoes?', resposta: 'Cubo', aceita: ['Hexaedro'] },
  { categoria: 'matematica', pergunta: 'Delta igual a b ao quadrado menos quatro a c aparece na formula de qual matematico, usada em equacoes de segundo grau?', resposta: 'Bhaskara', aceita: [] },

  /* ------------------------------ Bandeiras ---------------------------- */
  { categoria: 'bandeiras', pergunta: 'Folha de bordo vermelha no meio de faixas vermelhas e brancas aparece na bandeira de qual pais da America do Norte?', resposta: 'Canada', aceita: [] },
  { categoria: 'bandeiras', pergunta: 'Ordem e Progresso escrito numa faixa sobre um ceu estrelado azul esta na bandeira de qual pais?', resposta: 'Brasil', aceita: [] },
  { categoria: 'bandeiras', pergunta: 'Cinquenta estrelas brancas e treze listras vermelhas e brancas formam a bandeira de qual pais da America do Norte?', resposta: 'Estados Unidos', aceita: ['EUA', 'USA'] },
  { categoria: 'bandeiras', pergunta: 'Aguia comendo uma cobra em cima de um cacto esta no centro da bandeira de qual pais latino americano?', resposta: 'Mexico', aceita: [] },
  { categoria: 'bandeiras', pergunta: 'Sol de maio com rosto no meio de faixas azul celeste e brancas aparece na bandeira de qual pais vizinho do Brasil?', resposta: 'Argentina', aceita: [] },
  { categoria: 'bandeiras', pergunta: 'Cruz branca deitada sobre fundo vermelho, a bandeira mais antiga ainda em uso, e de qual pais nordico com capital Copenhague?', resposta: 'Dinamarca', aceita: [] },
  { categoria: 'bandeiras', pergunta: 'Circulo vermelho no centro de um fundo totalmente branco forma a bandeira de qual pais asiatico das ilhas do sol nascente?', resposta: 'Japao', aceita: [] },
  { categoria: 'bandeiras', pergunta: 'Union Jack, com as cruzes de Sao Jorge, Santo Andre e Sao Patricio, e a bandeira de qual pais europeu com capital Londres?', resposta: 'Reino Unido', aceita: ['Inglaterra', 'Gra Bretanha'] },
  { categoria: 'bandeiras', pergunta: 'Cinco estrelas amarelas no canto de um fundo vermelho formam a bandeira de qual pais asiatico mais populoso ate pouco tempo?', resposta: 'China', aceita: [] },
  { categoria: 'bandeiras', pergunta: 'Cedro verde entre duas faixas vermelhas horizontais e o simbolo na bandeira de qual pais do Oriente Medio com capital Beirute?', resposta: 'Libano', aceita: [] },
  { categoria: 'bandeiras', pergunta: 'Cruz branca no centro de um quadrado vermelho, bandeira quadrada famosa pelos relogios e chocolates, de qual pais europeu?', resposta: 'Suica', aceita: [] },
  { categoria: 'bandeiras', pergunta: 'Tricolor vertical azul, branco e vermelho, a bandeira da revolucao de 1789, pertence a qual pais com capital Paris?', resposta: 'Franca', aceita: [] },
  { categoria: 'bandeiras', pergunta: 'Estrela de Davi azul entre duas faixas azuis horizontais sobre fundo branco aparece na bandeira de qual pais do Oriente Medio?', resposta: 'Israel', aceita: [] },
  { categoria: 'bandeiras', pergunta: 'Roda azul de vinte e quatro raios no meio das faixas laranja, branca e verde esta na bandeira de qual pais asiatico gigante?', resposta: 'India', aceita: [] },
  { categoria: 'bandeiras', pergunta: 'Escudo, esfera armilar e as cores verde e vermelha formam a bandeira de qual pais europeu que colonizou o Brasil?', resposta: 'Portugal', aceita: [] },

  /* ----------------------- Mais futebol ----------------------- */
  { categoria: 'futebol', pergunta: 'Menino Ney, camisa dez do Santos e maior artilheiro da historia da selecao brasileira: qual e o nome desse atacante?', resposta: 'Neymar', aceita: ['Neymar Jr'] },
  { categoria: 'futebol', pergunta: 'Doutor e capitao da Democracia Corinthiana, este meia de barba e cabeca erguida jogou a Copa de 1982, quem e ele?', resposta: 'Socrates', aceita: [] },
  { categoria: 'futebol', pergunta: 'Baixinho, melhor jogador da Copa do tetra em 1994 e famoso por gols de area pelo Barcelona e pelo Vasco, qual e o nome dele?', resposta: 'Romario', aceita: [] },
  { categoria: 'futebol', pergunta: 'Bola de Ouro de 2007, idolo do Milan e revelado pelo Sao Paulo antes do Real Madrid: quem e esse meia brasileiro?', resposta: 'Kaka', aceita: [] },
  { categoria: 'futebol', pergunta: 'Fla Flu e o classico entre o Flamengo e qual clube carioca de tricolor verde, branco e grena das Laranjeiras?', resposta: 'Fluminense', aceita: ['Flu'] },
  { categoria: 'futebol', pergunta: 'Camp Nou, La Masia e a camisa azul grena sao simbolos de qual clube espanhol da Catalunha onde Messi jogou por anos?', resposta: 'Barcelona', aceita: ['Barca'] },
  { categoria: 'futebol', pergunta: 'Santiago Bernabeu e a casa de qual clube merengue da capital espanhola, recordista de titulos da Champions League?', resposta: 'Real Madrid', aceita: ['Real'] },
  { categoria: 'futebol', pergunta: 'Mais querido, Gavea e Maracana lotado em vermelho e preto lembram qual clube carioca de maior torcida do Brasil?', resposta: 'Flamengo', aceita: ['Mengao'] },
  { categoria: 'futebol', pergunta: 'Porco, Allianz Parque e verde e branco sao simbolos de qual clube paulista que ja ganhou tres Libertadores?', resposta: 'Palmeiras', aceita: ['Verdao'] },
  { categoria: 'futebol', pergunta: 'Laranja mecanica era o apelido da selecao de qual pais europeu que perdeu as finais de Copa de 1974 e 1978?', resposta: 'Holanda', aceita: ['Paises Baixos'] },
  { categoria: 'futebol', pergunta: 'Copa do Mundo de 2022 no Catar terminou com Messi campeao depois de uma final nos penaltis contra qual selecao?', resposta: 'Franca', aceita: [] },

  /* ----------------------- Mais esportes ----------------------- */
  { categoria: 'esportes', pergunta: 'Hexacampeao da NBA com os Bulls, o numero vinte e tres e dono de uma marca de tenis bilionaria, qual o esporte dele?', resposta: 'Basquete', aceita: ['Basquetebol'] },
  { categoria: 'esportes', pergunta: 'Rede alta, levantador, libero e saque viagem fazem parte de qual esporte em que o Brasil de Giba e Bernardinho brilhou?', resposta: 'Volei', aceita: ['Voleibol'] },
  { categoria: 'esportes', pergunta: 'Kimono branco, faixa preta e ippon sao termos de qual arte marcial japonesa olimpica em que Aurelio Miguel foi campeao?', resposta: 'Judo', aceita: [] },
  { categoria: 'esportes', pergunta: 'Ferrari vermelha e sete titulos mundiais de Formula 1 fizeram a fama de qual piloto alemao recordista dos anos dois mil?', resposta: 'Michael Schumacher', aceita: ['Schumacher'] },
  { categoria: 'esportes', pergunta: 'Pista de tartan, quatrocentos metros e revezamento sao partes de qual conjunto de provas olimpicas de corrida, salto e arremesso?', resposta: 'Atletismo', aceita: [] },
  { categoria: 'esportes', pergunta: 'Sete titulos mundiais, seis deles pela Mercedes, e o recorde de vitorias na Formula 1 sao de qual piloto ingles?', resposta: 'Lewis Hamilton', aceita: ['Hamilton'] },
  { categoria: 'esportes', pergunta: 'Ginga, berimbau, roda e golpes como meia lua e armada formam qual luta brasileira criada por africanos escravizados?', resposta: 'Capoeira', aceita: [] },
  { categoria: 'esportes', pergunta: 'Ondas gigantes de Nazare e titulos mundiais de Gabriel Medina e Italo Ferreira sao de qual esporte praticado no mar?', resposta: 'Surfe', aceita: ['Surf'] },
  { categoria: 'esportes', pergunta: 'Mesa verde, raquete pequena e bolinha branca leve: Hugo Calderano e o grande nome brasileiro de qual esporte olimpico?', resposta: 'Tenis de mesa', aceita: ['Pingue pongue', 'Ping pong'] },
  { categoria: 'esportes', pergunta: 'Tour de France, camisa amarela e montanhas dos Alpes fazem parte de qual esporte de corrida sobre duas rodas?', resposta: 'Ciclismo', aceita: [] },

  /* ----------------------- Mais geografia ----------------------- */
  { categoria: 'geografia', pergunta: 'Torre Eiffel, Arco do Triunfo e o museu do Louvre ficam em qual cidade europeia conhecida como cidade luz?', resposta: 'Paris', aceita: [] },
  { categoria: 'geografia', pergunta: 'Coliseu, Fontana di Trevi e o Vaticano bem no meio ficam em qual cidade italiana chamada de cidade eterna?', resposta: 'Roma', aceita: [] },
  { categoria: 'geografia', pergunta: 'Estatua da Liberdade, Times Square e Central Park ficam em qual cidade americana apelidada de Big Apple?', resposta: 'Nova York', aceita: ['New York', 'Nova Iorque'] },
  { categoria: 'geografia', pergunta: 'Piramides de Gize, Esfinge e o rio Nilo ficam perto de qual capital africana, a maior cidade do mundo arabe?', resposta: 'Cairo', aceita: ['O Cairo'] },
  { categoria: 'geografia', pergunta: 'Pelourinho, acaraje e o elevador Lacerda ficam em qual capital nordestina, primeira capital do Brasil colonial?', resposta: 'Salvador', aceita: [] },
  { categoria: 'geografia', pergunta: 'Maior oceano do planeta, entre a America e a Asia, tem o nome que quer dizer calmo, qual e ele?', resposta: 'Pacifico', aceita: ['Oceano Pacifico'] },
  { categoria: 'geografia', pergunta: 'Muralha com milhares de quilometros, a Cidade Proibida e os pandas gigantes sao simbolos de qual pais asiatico?', resposta: 'China', aceita: [] },
  { categoria: 'geografia', pergunta: 'Big Ben, Tamisa, onibus vermelho de dois andares e o Palacio de Buckingham ficam em qual capital europeia?', resposta: 'Londres', aceita: ['London'] },
  { categoria: 'geografia', pergunta: 'Planicie alagada no Mato Grosso, com jacares, capivaras e onca pintada, e qual bioma brasileiro, a maior area umida do mundo?', resposta: 'Pantanal', aceita: [] },
  { categoria: 'geografia', pergunta: 'Taj Mahal de marmore branco, rio Ganges e Bollywood ficam em qual pais asiatico com mais de um bilhao de habitantes?', resposta: 'India', aceita: [] },
  { categoria: 'geografia', pergunta: 'Lencois de areia branca com lagoas azuis de agua da chuva formam qual parque nacional famoso no estado do Maranhao?', resposta: 'Lencois Maranhenses', aceita: [] },
  { categoria: 'geografia', pergunta: 'Fernando de Noronha, Recife e Porto de Galinhas ficam em qual estado do Nordeste brasileiro, terra do frevo?', resposta: 'Pernambuco', aceita: [] },

  /* ----------------------- Mais historia ----------------------- */
  { categoria: 'historia', pergunta: 'Primeiro imperador romano, sobrinho de Julio Cesar, deu nome ao mes de agosto, qual e o nome dele?', resposta: 'Augusto', aceita: ['Otaviano', 'Cesar Augusto'] },
  { categoria: 'historia', pergunta: 'Quilombo dos Palmares teve como maior lider este heroi negro morto em vinte de novembro de 1695, quem foi?', resposta: 'Zumbi', aceita: ['Zumbi dos Palmares'] },
  { categoria: 'historia', pergunta: 'Muro que dividia uma capital alema em leste e oeste caiu em 1989, marcando o fim da Guerra Fria, que cidade era?', resposta: 'Berlim', aceita: [] },
  { categoria: 'historia', pergunta: 'Ataque a Pearl Harbor em 1941 levou os Estados Unidos a entrar em qual grande conflito mundial contra o Eixo?', resposta: 'Segunda Guerra Mundial', aceita: ['Segunda Guerra'] },
  { categoria: 'historia', pergunta: 'Mona Lisa, Ultima Ceia e desenhos de maquinas voadoras sao obra de qual genio italiano do Renascimento?', resposta: 'Leonardo da Vinci', aceita: ['Da Vinci', 'Leonardo'] },
  { categoria: 'historia', pergunta: 'Pai dos pobres, criador da CLT e do Estado Novo, este presidente gaucho governou o Brasil por quinze anos seguidos, quem?', resposta: 'Getulio Vargas', aceita: ['Vargas', 'Getulio'] },
  { categoria: 'historia', pergunta: 'Navio que afundou em 1912 apos bater num iceberg na primeira viagem, dito inafundavel, qual era o nome dele?', resposta: 'Titanic', aceita: [] },
  { categoria: 'historia', pergunta: 'Grito do Ipiranga, sete de setembro de 1822, as margens de um riacho em Sao Paulo: o que foi proclamado ali?', resposta: 'Independencia do Brasil', aceita: ['Independencia'] },
  { categoria: 'historia', pergunta: 'Cleopatra foi a ultima rainha de qual civilizacao antiga das piramides, faraos e hieroglifos as margens do Nilo?', resposta: 'Egito Antigo', aceita: ['Egito', 'Egipcia'] },
  { categoria: 'historia', pergunta: 'Medusa com cabelos de serpente foi derrotada por este heroi grego filho de Zeus que usou um escudo espelhado, quem?', resposta: 'Perseu', aceita: [] },
  { categoria: 'historia', pergunta: 'Doze trabalhos, forca descomunal e filho de Zeus com uma mortal: quem e esse heroi da mitologia grega?', resposta: 'Hercules', aceita: ['Heracles'] },

  /* ----------------------- Mais ciencia ----------------------- */
  { categoria: 'ciencia', pergunta: 'Tabela periodica foi organizada pela primeira vez por este quimico russo que previu elementos ainda nao descobertos, quem?', resposta: 'Mendeleiev', aceita: ['Dmitri Mendeleiev'] },
  { categoria: 'ciencia', pergunta: 'Molecula em dupla helice que guarda o codigo genetico de quase todos os seres vivos e conhecida por qual sigla?', resposta: 'DNA', aceita: ['ADN'] },
  { categoria: 'ciencia', pergunta: 'Duas vezes premio Nobel, pioneira da radioatividade e descobridora do polonio e do radio, quem foi essa cientista polonesa?', resposta: 'Marie Curie', aceita: ['Curie'] },
  { categoria: 'ciencia', pergunta: 'Maior orgao interno do corpo humano, que produz bile e filtra toxinas do sangue, qual e o nome dele?', resposta: 'Figado', aceita: [] },
  { categoria: 'ciencia', pergunta: 'Gas que respiramos para viver, de simbolo O na tabela periodica, liberado pelas plantas: qual e o nome dele?', resposta: 'Oxigenio', aceita: [] },
  { categoria: 'ciencia', pergunta: 'Vacina contra a variola foi criada no seculo XVIII por qual medico ingles que usou o virus da variola bovina?', resposta: 'Edward Jenner', aceita: ['Jenner'] },
  { categoria: 'ciencia', pergunta: 'Estrela mais proxima da Terra, em torno da qual giram os planetas, e uma ana amarela: qual e o nome dela?', resposta: 'Sol', aceita: [] },
  { categoria: 'ciencia', pergunta: 'Liquido vermelho bombeado pelo coracao, com hemacias, leucocitos e plaquetas: como se chama esse tecido do corpo?', resposta: 'Sangue', aceita: [] },
  { categoria: 'ciencia', pergunta: 'Brasileiro que descobriu o ciclo da doenca de Chagas, transmitida pelo barbeiro, foi qual cientista mineiro?', resposta: 'Carlos Chagas', aceita: [] },

  /* ----------------------- Mais cinema ----------------------- */
  { categoria: 'cinema', pergunta: 'Aneis, hobbits, Gandalf e a Terra Media sao da trilogia de Peter Jackson baseada nos livros de Tolkien, qual o nome?', resposta: 'O Senhor dos Aneis', aceita: ['Senhor dos Aneis'] },
  { categoria: 'cinema', pergunta: 'Tubarao assassino e uma trilha de duas notas famosa deram inicio a carreira de qual diretor de ET e Jurassic Park?', resposta: 'Steven Spielberg', aceita: ['Spielberg'] },
  { categoria: 'cinema', pergunta: 'Coringa de Heath Ledger e o heroi mascarado de Gotham estao em qual filme de Christopher Nolan lancado em 2008?', resposta: 'Batman O Cavaleiro das Trevas', aceita: ['O Cavaleiro das Trevas', 'Cavaleiro das Trevas'] },
  { categoria: 'cinema', pergunta: 'Dinossauros clonados num parque numa ilha da Costa Rica, dirigido por Spielberg em 1993, qual e o filme?', resposta: 'Jurassic Park', aceita: ['Parque dos Dinossauros'] },
  { categoria: 'cinema', pergunta: 'Thanos estalando os dedos com a manopla e os Vingadores reunidos aparecem em qual filme da Marvel de 2018?', resposta: 'Vingadores Guerra Infinita', aceita: ['Guerra Infinita', 'Infinity War'] },
  { categoria: 'cinema', pergunta: 'Nos somos Groot e um guaxinim falante fazem parte de qual equipe espacial dos filmes da Marvel com Chris Pratt?', resposta: 'Guardioes da Galaxia', aceita: [] },
  { categoria: 'cinema', pergunta: 'Professor, Berlim, Toquio e mascaras de Dali assaltam a Casa da Moeda da Espanha em qual serie de sucesso?', resposta: 'La Casa de Papel', aceita: ['Casa de Papel', 'Money Heist'] },
  { categoria: 'cinema', pergunta: 'Jogos infantis mortais, macacao verde e um premio bilionario fazem parte de qual serie sul coreana da Netflix?', resposta: 'Round 6', aceita: ['Squid Game'] },
  { categoria: 'cinema', pergunta: 'Familia amarela de Springfield, com Homer, Marge, Bart, Lisa e Maggie, estrela qual desenho animado americano?', resposta: 'Os Simpsons', aceita: ['Simpsons'] },
  { categoria: 'cinema', pergunta: 'Odete Roitman, Maria de Fatima e o misterio de quem matou marcaram qual novela da Globo de 1988, regravada em 2025?', resposta: 'Vale Tudo', aceita: [] },

  /* ----------------------- Mais musica ----------------------- */
  { categoria: 'musica', pergunta: 'Rainha do pop, Like a Virgin e Material Girl sao sucessos de qual cantora americana dos anos oitenta?', resposta: 'Madonna', aceita: [] },
  { categoria: 'musica', pergunta: 'Rei do rock, topete, rebolado e Graceland sao marcas de qual cantor americano de Love Me Tender?', resposta: 'Elvis Presley', aceita: ['Elvis'] },
  { categoria: 'musica', pergunta: 'Rei da musica romantica brasileira, Jovem Guarda e o especial de fim de ano na Globo: quem e esse cantor capixaba?', resposta: 'Roberto Carlos', aceita: [] },
  { categoria: 'musica', pergunta: 'Garota de Ipanema e Chega de Saudade sao classicos de qual genero musical carioca nascido no fim dos anos cinquenta?', resposta: 'Bossa Nova', aceita: [] },
  { categoria: 'musica', pergunta: 'Rainha do axe, ela canta Sorte Grande e Poeira e comanda trio eletrico no carnaval de Salvador, qual e o nome dela?', resposta: 'Ivete Sangalo', aceita: ['Ivete'] },
  { categoria: 'musica', pergunta: 'Rocket Man, oculos extravagantes e a trilha de O Rei Leao sao marcas de qual cantor e pianista ingles?', resposta: 'Elton John', aceita: [] },
  { categoria: 'musica', pergunta: 'Satisfaction, a lingua vermelha no logo e Mick Jagger no vocal sao marcas de qual banda inglesa de rock?', resposta: 'Rolling Stones', aceita: ['The Rolling Stones'] },
  { categoria: 'musica', pergunta: 'Smells Like Teen Spirit e Kurt Cobain no vocal fizeram o grunge famoso com qual banda de Seattle?', resposta: 'Nirvana', aceita: [] },
  { categoria: 'musica', pergunta: 'Hello, Rolling in the Deep e Someone Like You sao baladas de qual cantora inglesa de voz potente?', resposta: 'Adele', aceita: [] },
  { categoria: 'musica', pergunta: 'Marilia Mendonca ficou conhecida como rainha de qual movimento do sertanejo que canta dor de cotovelo do ponto de vista feminino?', resposta: 'Feminejo', aceita: ['Sofrencia'] },

  /* ----------------------- Rap ----------------------- */
  { categoria: 'rap', pergunta: 'Sobrevivendo no Inferno, Diario de um Detento e Mano Brown no microfone sao marcas de qual grupo de rap paulistano?', resposta: 'Racionais MCs', aceita: ['Racionais'] },
  { categoria: 'rap', pergunta: 'Lose Yourself, Slim Shady e o filme 8 Mile sao de qual rapper branco de Detroit considerado um dos maiores de todos?', resposta: 'Eminem', aceita: ['Marshall Mathers'] },
  { categoria: 'rap', pergunta: 'AmarElo, Leandro Roque de Oliveira e o show no Theatro Municipal sao marcas de qual rapper paulistano?', resposta: 'Emicida', aceita: [] },
  { categoria: 'rap', pergunta: 'California Love, morte em Las Vegas em 1996 e rivalidade com a costa leste marcam qual rapper americano?', resposta: 'Tupac', aceita: ['2Pac', 'Tupac Shakur'] },
  { categoria: 'rap', pergunta: 'Hotline Bling, God\'s Plan e a cidade de Toronto sao marcas de qual rapper canadense recordista de streams?', resposta: 'Drake', aceita: [] },
  { categoria: 'rap', pergunta: 'Damn, To Pimp a Butterfly e o premio Pulitzer de musica fizeram historia com qual rapper de Compton?', resposta: 'Kendrick Lamar', aceita: ['Kendrick'] },
  { categoria: 'rap', pergunta: 'Heresia, Ladrao e O Menino que Queria Ser Deus sao discos de qual rapper mineiro de Belo Horizonte?', resposta: 'Djonga', aceita: [] },
  { categoria: 'rap', pergunta: 'Kanye ganhou a fama como produtor do selo Roc A Fella, de qual rapper casado com Beyonce e dono de bilhoes?', resposta: 'Jay Z', aceita: ['Jay-Z'] },
  { categoria: 'rap', pergunta: 'Planet Hemp, samba misturado com rap e o disco A Procura da Batida Perfeita marcam a carreira de qual rapper carioca?', resposta: 'Marcelo D2', aceita: ['D2'] },
  { categoria: 'rap', pergunta: 'Maquina do Tempo, Quer Voar e o selo 30PRAUM de Fortaleza fizeram o sucesso de qual trapper cearense de cabelo colorido?', resposta: 'Matue', aceita: [] },

  /* ----------------------- Mais anime ----------------------- */
  { categoria: 'anime', pergunta: 'Caderno da morte, shinigami Ryuk e o detetive L fazem parte de qual anime de suspense sobre Light Yagami?', resposta: 'Death Note', aceita: [] },
  { categoria: 'anime', pergunta: 'Respiracao da agua, Tanjiro e a irma Nezuko transformada em oni estao em qual anime de espadachins?', resposta: 'Demon Slayer', aceita: ['Kimetsu no Yaiba'] },
  { categoria: 'anime', pergunta: 'Quirk, All Might e a academia U.A. onde Deku estuda para ser heroi estao em qual anime?', resposta: 'My Hero Academia', aceita: ['Boku no Hero', 'Boku no Hero Academia'] },
  { categoria: 'anime', pergunta: 'Esferas do dragao, Shenlong e o saiyajin de cabelo espetado estao em qual anime de Akira Toriyama?', resposta: 'Dragon Ball', aceita: ['Dragon Ball Z'] },
  { categoria: 'anime', pergunta: 'Castelo animado, Viagem de Chihiro e Meu Amigo Totoro sao filmes de qual estudio japones de Hayao Miyazaki?', resposta: 'Studio Ghibli', aceita: ['Ghibli'] },
  { categoria: 'anime', pergunta: 'Cacador de cacadores, Gon e Killua e o exame cheio de provas mortais estao em qual anime de Togashi?', resposta: 'Hunter x Hunter', aceita: ['Hunter Hunter'] },

  /* ----------------------- Mais games ----------------------- */
  { categoria: 'games', pergunta: 'Rockstar, Los Santos, roubar carros e missoes de crime sao marcas de qual serie de jogos de mundo aberto?', resposta: 'GTA', aceita: ['Grand Theft Auto'] },
  { categoria: 'games', pergunta: 'Battle royale de celular da Garena, partidas curtas com cinquenta jogadores e febre entre os brasileiros: qual jogo e esse?', resposta: 'Free Fire', aceita: [] },
  { categoria: 'games', pergunta: 'Kratos, o fantasma de Esparta, enfrenta deuses gregos e depois nordicos em qual serie da PlayStation?', resposta: 'God of War', aceita: [] },
  { categoria: 'games', pergunta: 'Hadouken, Shoryuken, Ryu e Chun Li sao lutadores de qual classico jogo de luta da Capcom dos fliperamas?', resposta: 'Street Fighter', aceita: [] },
  { categoria: 'games', pergunta: 'Bombas, contraterroristas, mapa Dust 2 e times de cinco contra cinco: qual jogo de tiro da Valve?', resposta: 'Counter Strike', aceita: ['CS', 'CS GO', 'CS2'] },
  { categoria: 'games', pergunta: 'Blocos coloridos caindo, linhas completas sumindo e uma musica russa: qual quebra cabeca classico de 1984?', resposta: 'Tetris', aceita: [] },
  { categoria: 'games', pergunta: 'Joel, Ellie, fungos que transformam pessoas e um mundo pos apocaliptico estao em qual jogo que virou serie da HBO?', resposta: 'The Last of Us', aceita: [] },

  /* ----------------------- League of Legends ----------------------- */
  { categoria: 'lol', pergunta: 'Summoner\'s Rift, nexus, torres e cinco contra cinco: qual e o jogo da Riot Games mais jogado em PC?', resposta: 'League of Legends', aceita: ['LoL'] },
  { categoria: 'lol', pergunta: 'Espadachim de Ionia com vento, apelidado de hasagi, tido como o campeao mais odiado nas partidas solo, quem e ele?', resposta: 'Yasuo', aceita: [] },
  { categoria: 'lol', pergunta: 'Yordle de chapeu que planta cogumelos venenosos invisiveis e o mais irritante do jogo segundo muitos, quem e ele?', resposta: 'Teemo', aceita: [] },
  { categoria: 'lol', pergunta: 'Atiradora de cabelo azul, irma de Vi e protagonista da serie Arcane, qual campea maluca de Zaun e essa?', resposta: 'Jinx', aceita: [] },
  { categoria: 'lol', pergunta: 'Faker, o maior jogador da historia, defende qual time sul coreano campeao mundial varias vezes?', resposta: 'T1', aceita: ['SKT', 'SK Telecom T1'] },
  { categoria: 'lol', pergunta: 'Raposa de nove caudas que encanta inimigos com beijo e campea de Ionia, qual e o nome dela?', resposta: 'Ahri', aceita: [] },
  { categoria: 'lol', pergunta: 'Monge cego de Ionia que chuta inimigos e e famoso pelo insec em jogadas incriveis, quem e ele?', resposta: 'Lee Sin', aceita: [] },
  { categoria: 'lol', pergunta: 'Serie animada da Netflix sobre Piltover e Zaun, com Vi e Jinx, ganhou o Emmy em 2022, qual e o nome dela?', resposta: 'Arcane', aceita: [] },

  /* ----------------------- Mais mainstream ----------------------- */
  { categoria: 'mainstream', pergunta: 'Domingo depois da Semana Santa, ovos de chocolate e um coelho que traz doces fazem parte de qual data comemorativa crista?', resposta: 'Pascoa', aceita: [] },
  { categoria: 'mainstream', pergunta: 'Fogos a meia noite, roupa branca, pular sete ondas e lentilha fazem parte de qual festa de trinta e um de dezembro?', resposta: 'Reveillon', aceita: ['Ano Novo', 'Virada'] },
  { categoria: 'mainstream', pergunta: 'Trinta e um de outubro, abobora com vela, fantasias e doces ou travessuras fazem parte de qual festa americana?', resposta: 'Halloween', aceita: ['Dia das Bruxas'] },
  { categoria: 'mainstream', pergunta: 'Doze de junho, cartas de amor, flores e jantar a dois fazem parte de qual data comemorativa brasileira?', resposta: 'Dia dos Namorados', aceita: [] },
  { categoria: 'mainstream', pergunta: 'Dancinha de quinze segundos, For You e trends virais fazem parte de qual rede social chinesa de videos curtos?', resposta: 'TikTok', aceita: [] },
  { categoria: 'mainstream', pergunta: 'Mensagens com dois risquinhos azuis, grupos da familia e audios longos fazem parte de qual aplicativo?', resposta: 'WhatsApp', aceita: ['Zap'] },
  { categoria: 'mainstream', pergunta: 'Stories, reels, feed e curtidas em fotos fazem parte de qual rede social comprada pelo Facebook em 2012?', resposta: 'Instagram', aceita: ['Insta'] },

  /* ----------------------- Mais marcas ----------------------- */
  { categoria: 'marcas', pergunta: 'Chocolate em barra com quadradinhos, roxo no rotulo e criado na Inglaterra, qual marca e famosa pelo Dairy Milk?', resposta: 'Cadbury', aceita: [] },
  { categoria: 'marcas', pergunta: 'Chinelos de borracha com a bandeirinha do Brasil na tira e sola com desenho de grao de arroz: qual marca brasileira?', resposta: 'Havaianas', aceita: [] },
  { categoria: 'marcas', pergunta: 'Buscador mais usado do planeta, Gmail e Android pertencem a qual empresa americana de Mountain View?', resposta: 'Google', aceita: [] },
  { categoria: 'marcas', pergunta: 'Moveis para montar sozinho, almondegas no restaurante e nomes suecos sao marcas de qual loja?', resposta: 'Ikea', aceita: [] },
  { categoria: 'marcas', pergunta: 'Bolacha recheada de chocolate com creme branco no meio, que se torce e molha no leite, qual marca e essa?', resposta: 'Oreo', aceita: [] },

  /* ----------------------- Mais matematica ----------------------- */
  { categoria: 'matematica', pergunta: 'Triangulo com tres lados iguais e tres angulos de sessenta graus recebe qual nome na geometria?', resposta: 'Equilatero', aceita: ['Triangulo equilatero'] },
  { categoria: 'matematica', pergunta: 'Numero que multiplicado por ele mesmo da cento e quarenta e quatro, a raiz quadrada de uma grosa, qual e?', resposta: 'Doze', aceita: ['12'] },
  { categoria: 'matematica', pergunta: 'Poligono com oito lados, como a placa de pare do transito, recebe qual nome na geometria plana?', resposta: 'Octogono', aceita: [] },
  { categoria: 'matematica', pergunta: 'Sequencia em que cada numero e a soma dos dois anteriores, um, um, dois, tres, cinco, leva o nome de qual matematico?', resposta: 'Fibonacci', aceita: [] },
  { categoria: 'matematica', pergunta: 'Angulo de noventa graus, como o canto de uma folha de papel, recebe qual nome na geometria?', resposta: 'Reto', aceita: ['Angulo reto'] },
  { categoria: 'matematica', pergunta: 'Cem dividido por quatro, a quarta parte de uma centena, ou um quarto de cem: quanto e essa conta?', resposta: 'Vinte e cinco', aceita: ['25'] },

  /* ----------------------- Animais ----------------------- */
  { categoria: 'animais', pergunta: 'Maior mamifero do planeta, vive no oceano, pode passar de trinta metros e se alimenta de krill: qual animal e esse?', resposta: 'Baleia azul', aceita: ['Baleia'] },
  { categoria: 'animais', pergunta: 'Pescoco mais comprido do reino animal, manchas marrons e folhas de acacia na savana: qual animal africano?', resposta: 'Girafa', aceita: [] },
  { categoria: 'animais', pergunta: 'Maior roedor do mundo, mansinho, nada bem e vive nas margens de rios e lagos de Curitiba: qual e o animal?', resposta: 'Capivara', aceita: [] },
  { categoria: 'animais', pergunta: 'Mamifero que voa, dorme de cabeca para baixo e usa ecolocalizacao para cacar a noite: qual animal e esse?', resposta: 'Morcego', aceita: [] },
  { categoria: 'animais', pergunta: 'Ave que nao voa, vive na Antartida, anda de pe e mergulha atras de peixes, de smoking natural: qual animal?', resposta: 'Pinguim', aceita: [] },
  { categoria: 'animais', pergunta: 'Felino mais rapido do mundo, passa de cem quilometros por hora e tem manchas pretas pelo corpo: qual animal?', resposta: 'Guepardo', aceita: ['Chita'] },
  { categoria: 'animais', pergunta: 'Marsupial australiano que carrega o filhote na bolsa e anda pulando com as patas traseiras: qual animal?', resposta: 'Canguru', aceita: [] },
  { categoria: 'animais', pergunta: 'Muda de cor para se camuflar, tem olhos que giram para lados diferentes e lingua comprida: qual reptil?', resposta: 'Camaleao', aceita: [] },
  { categoria: 'animais', pergunta: 'Oito bracos, tres coracoes, tinta para fugir e inteligencia surpreendente: qual molusco marinho e esse?', resposta: 'Polvo', aceita: [] },
  { categoria: 'animais', pergunta: 'Maior felino das Americas, rei do Pantanal, de pelagem amarela com rosetas pretas: qual animal brasileiro?', resposta: 'Onca pintada', aceita: ['Onca', 'Jaguar'] },

  /* ----------------------- Comidas ----------------------- */
  { categoria: 'comidas', pergunta: 'Feijao preto, linguica, carne seca, couve e laranja servidos no sabado: qual e esse prato tipico brasileiro?', resposta: 'Feijoada', aceita: [] },
  { categoria: 'comidas', pergunta: 'Bolinho de massa de feijao fradinho frito no dende, com vatapa e camarao, vendido pelas baianas: qual comida?', resposta: 'Acaraje', aceita: [] },
  { categoria: 'comidas', pergunta: 'Arroz com peixe cru enrolado em alga nori, wasabi e shoyu: qual comida japonesa e essa?', resposta: 'Sushi', aceita: [] },
  { categoria: 'comidas', pergunta: 'Massa em camadas com molho a bolonhesa, bechamel e queijo gratinado no forno: qual prato italiano?', resposta: 'Lasanha', aceita: [] },
  { categoria: 'comidas', pergunta: 'Leite condensado, chocolate em po e manteiga enrolados em bolinha com granulado: qual doce de festa?', resposta: 'Brigadeiro', aceita: [] },
  { categoria: 'comidas', pergunta: 'Massa de mandioca polvilhada, recheada com queijo ou coco e dobrada como meia lua na chapa: qual comida nordestina?', resposta: 'Tapioca', aceita: [] },
  { categoria: 'comidas', pergunta: 'Frango desfiado com catupiry dentro de massa frita em formato de gota: qual salgado de festa?', resposta: 'Coxinha', aceita: [] },
  { categoria: 'comidas', pergunta: 'Fruta roxa da Amazonia batida congelada na tigela, com granola e banana por cima: qual comida?', resposta: 'Acai', aceita: [] },
  { categoria: 'comidas', pergunta: 'Massa fina recheada de queijo e presunto dobrada e frita na hora na feira de domingo, com caldo de cana: qual comida?', resposta: 'Pastel', aceita: ['Pastel de feira'] },
  { categoria: 'comidas', pergunta: 'Tortilha de milho dobrada com carne, guacamole, pimenta e cebola por cima: qual comida mexicana e essa?', resposta: 'Taco', aceita: [] }
];

module.exports = { SECRETAS };
