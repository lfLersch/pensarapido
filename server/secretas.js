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
  { categoria: 'bandeiras', pergunta: 'Sol de maio com rosto no meio de faixas azul celeste e brancas aparece na bandeira de qual pais vizinho do Brasil?', resposta: 'Argentina', aceita: [] }
];

module.exports = { SECRETAS };
