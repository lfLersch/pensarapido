'use strict';

/**
 * Mais perguntas para o banco de questions.js, por categoria.
 *
 * Mesmo formato de la (pergunta, resposta, aceita, dif, sub). questions.js
 * junta estas as dele antes de calcular os atalhos de sobrenome, entao elas
 * passam pelas mesmas regras e pelos mesmos testes.
 */
const QUESTOES_NOVAS = {
  matematica: [
    { pergunta: 'Quanto e 9 × 7?', resposta: '63', aceita: ['sessenta e tres'], dif: 15 },
    { pergunta: 'Quanto e 72 dividido por 8?', resposta: '9', aceita: ['nove'], dif: 15 },
    { pergunta: 'Quanto e 2 elevado a 5?', resposta: '32', dif: 30 },
    { pergunta: 'Qual e a raiz quadrada de 169?', resposta: '13', aceita: ['treze'], dif: 35 },
    { pergunta: 'Quanto e 20% de 250?', resposta: '50', aceita: ['cinquenta'], dif: 30 },
    { pergunta: 'Quanto e a metade de um terco?', resposta: '1/6', aceita: ['um sexto'], dif: 45 },
    { pergunta: 'Quantos minutos tem um dia inteiro?', resposta: '1440', dif: 45 },
    { pergunta: 'Quanto vale a soma dos angulos internos de um quadrado?', resposta: '360°', aceita: ['360', '360 graus'], dif: 30 },
    { pergunta: 'Qual e o proximo numero primo depois do 7?', resposta: '11', aceita: ['onze'], dif: 30 },
    { pergunta: 'Quanto e 1000 menos 1?', resposta: '999', dif: 10 },
    { pergunta: 'Quanto e 25 × 4?', resposta: '100', aceita: ['cem'], dif: 10 },
    { pergunta: 'Quanto e 3 ao cubo?', resposta: '27', aceita: ['vinte e sete'], dif: 30 },
    { pergunta: 'Quantos centimetros tem um metro?', resposta: '100', aceita: ['cem'], dif: 10 },
    { pergunta: 'Quantos gramas tem um quilo?', resposta: '1000', aceita: ['mil'], dif: 10 },
    { pergunta: 'Quantos mililitros tem um litro?', resposta: '1000', aceita: ['mil'], dif: 15 },
    { pergunta: 'Quanto e 7 ao quadrado?', resposta: '49', aceita: ['quarenta e nove'], dif: 20 },
    { pergunta: 'Quanto e 100 dividido por 8?', resposta: '12,5', aceita: ['12.5'], dif: 40 },
    { pergunta: 'Quantos dias tem uma semana e meia?', resposta: '10,5', aceita: ['10.5', 'dez e meio'], dif: 40 },
    { pergunta: 'Quanto e 11 × 11?', resposta: '121', dif: 30 },
    { pergunta: 'Quantos meses tem um seculo?', resposta: '1200', aceita: ['mil e duzentos'], dif: 45 },
    { pergunta: 'Qual numero romano e representado pela letra L?', resposta: '50', aceita: ['cinquenta'], dif: 35 },
    { pergunta: 'Qual numero romano e representado pela letra C?', resposta: '100', aceita: ['cem'], dif: 30 },
    { pergunta: 'Qual numero romano e representado pela letra M?', resposta: '1000', aceita: ['mil'], dif: 35 },
    { pergunta: 'Quanto e 2 + 2 × 2?', resposta: '6', aceita: ['seis'], dif: 35 },
    { pergunta: 'Qual e o dobro de 17?', resposta: '34', aceita: ['trinta e quatro'], dif: 15 }
  ],

  rap: [
    { pergunta: 'Qual banda carioca de Marcelo D2 e BNegao misturava rap e rock nos anos 90?', resposta: 'Planet Hemp', dif: 45 },
    { pergunta: 'Qual rapper ficou famoso com "Old Town Road", misturando trap e country?', resposta: 'Lil Nas X', dif: 40 },
    { pergunta: 'Qual rapper carioca gravou "Ate Quando?" e "2345meia78"?', resposta: 'Gabriel o Pensador', aceita: ['Gabriel Pensador'], dif: 45 },
    { pergunta: 'Qual palavra em ingles da nome a base instrumental sobre a qual o rapper canta?', resposta: 'Beat', aceita: ['Batida'], dif: 30 },
    { pergunta: 'Como se chama o estilo de rap com 808, chimbal acelerado e voz com auto-tune?', resposta: 'Trap', dif: 30 }
  ],

  games: [
    { pergunta: 'Qual personagem da Capcom solta o golpe Hadouken?', resposta: 'Ryu', dif: 35 },
    { pergunta: 'Qual guerreiro espartano protagoniza a serie God of War?', resposta: 'Kratos', dif: 30 },
    { pergunta: 'Qual empresa desenvolve League of Legends e Valorant?', sub: 'tiro', resposta: 'Riot Games', aceita: ['Riot'], dif: 30 },
    { pergunta: 'Qual battle royale de celular da Garena virou febre no Brasil?', sub: 'mobile', resposta: 'Free Fire', dif: 25 },
    { pergunta: 'Qual empresa criou a serie Grand Theft Auto?', sub: 'gta', resposta: 'Rockstar Games', aceita: ['Rockstar'], dif: 35 },
    { pergunta: 'Qual raposa de duas caudas e a melhor amiga do Sonic?', resposta: 'Tails', dif: 30 },
    { pergunta: 'Qual equidna vermelho e rival e amigo do Sonic?', resposta: 'Knuckles', dif: 40 },
    { pergunta: 'Qual fantasma vermelho persegue o Pac-Man junto com Pinky, Inky e Clyde?', resposta: 'Blinky', dif: 55 },
    { pergunta: 'Qual console portatil da Nintendo tinha duas telas, uma delas sensivel ao toque?', sub: 'nintendo', resposta: 'Nintendo DS', aceita: ['DS'], dif: 35 },
    { pergunta: 'Qual jogo de futebol da Konami era conhecido como Winning Eleven?', resposta: 'Pro Evolution Soccer', aceita: ['PES', 'eFootball'], dif: 40 },
    { pergunta: 'Qual jogo da Blizzard tem herois como Tracer e Mercy num jogo de tiro por equipes?', resposta: 'Overwatch', dif: 40 },
    { pergunta: 'Qual jogo de 2017 da Nintendo tem Link explorando Hyrule em mundo aberto?', sub: 'nintendo', resposta: 'Breath of the Wild', aceita: ['Zelda Breath of the Wild', 'BOTW'], dif: 40 }
  ],

  animais: [
    { pergunta: 'Qual ave e simbolo dos Estados Unidos?', resposta: 'Aguia-careca', aceita: ['Aguia careca', 'Aguia'], dif: 35 },
    { pergunta: 'Qual animal e famoso por ser lento e viver pendurado em arvores na Amazonia?', resposta: 'Bicho-preguica', aceita: ['Preguica', 'Bicho preguica'], dif: 15 },
    { pergunta: 'Qual animal marinho tem cinco bracos e pode regenerar um deles se perder?', resposta: 'Estrela-do-mar', aceita: ['Estrela do mar'], dif: 25 },
    { pergunta: 'Qual e o maior jacare do Brasil, que vive na Amazonia e pode passar de cinco metros?', resposta: 'Jacare-acu', aceita: ['Jacare acu'], dif: 60 },
    { pergunta: 'Qual inseto acende uma luz no abdomen a noite?', resposta: 'Vaga-lume', aceita: ['Vagalume', 'Pirilampo'], dif: 20 },
    { pergunta: 'Qual mamifero do cerrado tem um rabo enorme e come formigas e cupins?', resposta: 'Tamandua-bandeira', aceita: ['Tamandua bandeira', 'Tamandua'], dif: 30 },
    { pergunta: 'Qual e o maior lobo da America do Sul, de pernas longas e pelagem avermelhada?', resposta: 'Lobo-guara', aceita: ['Lobo guara'], dif: 35 },
    { pergunta: 'Qual animal aparece na nota de 100 reais?', resposta: 'Garoupa', dif: 55 },
    { pergunta: 'Como se chama o filhote do sapo antes de virar adulto?', resposta: 'Girino', dif: 25 }
  ],

  comidas: [
    { pergunta: 'Qual fruta amazonica de sabor azedo e usada em sucos e sorvetes, de casca marrom e polpa branca?', sub: 'frutas', resposta: 'Cupuacu', dif: 40 },
    { pergunta: 'Qual fruta do cerrado tem espinhos por dentro do caroco e cheiro forte?', sub: 'frutas', resposta: 'Pequi', dif: 45 },
    { pergunta: 'Qual fruta preta da arvore jabuticabeira nasce grudada no tronco?', sub: 'frutas', resposta: 'Jabuticaba', dif: 25 },
    { pergunta: 'Qual fruta de casca grossa e espinhosa tem cheiro forte e e proibida em hoteis da Asia?', sub: 'frutas', resposta: 'Durian', dif: 55 },
    { pergunta: 'Qual legume verde, gosmento por dentro, vai no frango da culinaria mineira?', sub: 'vegetais', resposta: 'Quiabo', dif: 30 },
    { pergunta: 'Qual raiz vermelha deixa a salada e o suco roxos?', sub: 'vegetais', resposta: 'Beterraba', dif: 20 },
    { pergunta: 'Qual doce espanhol de massa frita comprida e coberta de acucar e canela pode ter doce de leite?', sub: 'frituras', resposta: 'Churros', aceita: ['Churro'], dif: 20 },
    { pergunta: 'Qual lanche criado no bar Ponto Chic, em Sao Paulo, leva rosbife, queijo derretido, tomate e picles?', sub: 'lanches', resposta: 'Bauru', dif: 45 },
    { pergunta: 'Qual lanche famoso no Mercadao de Sao Paulo tem fatias e mais fatias de embutido empilhadas no pao?', sub: 'lanches', resposta: 'Sanduiche de mortadela', aceita: ['Mortadela'], dif: 40 },
    { pergunta: 'Qual prato nordestino mistura arroz, feijao verde, queijo coalho e carne seca?', sub: 'pratos', resposta: 'Baiao de dois', dif: 35 },
    { pergunta: 'Qual prato paraense leva tucupi, jambu e pato?', sub: 'pratos', resposta: 'Pato no tucupi', dif: 45 },
    { pergunta: 'Qual prato japones de macarrao em caldo quente ficou famoso com Naruto?', sub: 'pratos', resposta: 'Lamen', aceita: ['Ramen'], dif: 25 },
    { pergunta: 'Qual prato italiano de arroz cremoso e cozido aos poucos com caldo e queijo?', sub: 'pratos', resposta: 'Risoto', aceita: ['Risotto'], dif: 30 },
    { pergunta: 'Qual prato gaucho leva arroz cozido junto com charque?', sub: 'pratos', resposta: 'Arroz carreteiro', aceita: ['Carreteiro'], dif: 40 }
  ],

  esportes: [
    { pergunta: 'Qual Grand Slam e o primeiro do ano, disputado em Melbourne?', sub: 'tenis', resposta: 'Australian Open', aceita: ['Aberto da Australia'], dif: 40 },
    { pergunta: 'Qual Grand Slam e disputado em Nova York, no fim do verao americano?', sub: 'tenis', resposta: 'US Open', aceita: ['Aberto dos Estados Unidos'], dif: 40 },
    { pergunta: 'Como se chama o placar de empate em 40 a 40 no tenis?', sub: 'tenis', resposta: 'Iguais', aceita: ['Deuce'], dif: 50 },
    { pergunta: 'Qual tenista brasileira chegou a semifinal de Roland Garros em 2023?', sub: 'tenis', resposta: 'Beatriz Haddad Maia', aceita: ['Bia Haddad', 'Bia Haddad Maia', 'Haddad Maia'], dif: 45 },
    { pergunta: 'Qual tenista brasileira ganhou 19 titulos de Grand Slam entre simples e duplas nos anos 50 e 60?', sub: 'tenis', resposta: 'Maria Esther Bueno', dif: 55 },
    { pergunta: 'Qual jovem tenista carioca nascido em 2006 venceu o ATP de Buenos Aires em 2025?', sub: 'tenis', resposta: 'Joao Fonseca', dif: 50 },
    { pergunta: 'Qual skatista brasileira e chamada de Fadinha?', sub: 'outros', resposta: 'Rayssa Leal', dif: 25 },
    { pergunta: 'Qual surfista potiguar ganhou o primeiro ouro olimpico da historia do surfe, em Toquio?', sub: 'outros', resposta: 'Italo Ferreira', dif: 45 },
    { pergunta: 'Qual atleta brasileiro do salto com vara ganhou ouro na Rio 2016?', sub: 'outros', resposta: 'Thiago Braz', dif: 50 },
    { pergunta: 'Qual judoca brasileira ganhou ouro em Londres 2012, a primeira mulher do Brasil campea olimpica no judo?', sub: 'outros', resposta: 'Sarah Menezes', dif: 55 },
    { pergunta: 'Qual lutador brasileiro, ex-kickboxer rival de Israel Adesanya, foi campeao do UFC em duas categorias?', sub: 'outros', resposta: 'Alex Pereira', aceita: ['Poatan'], dif: 40 },
    { pergunta: 'Qual canoista brasileiro tem cinco medalhas olimpicas na canoagem de velocidade?', sub: 'outros', resposta: 'Isaquias Queiroz', dif: 50 },
    { pergunta: 'Em qual cidade serao os Jogos Olimpicos de 2028?', sub: 'olimpiadas', resposta: 'Los Angeles', dif: 35 }
  ],

  futebol: [
    { pergunta: 'Qual selecao ganhou a Copa do Mundo de 2018 na Russia?', resposta: 'Franca', aceita: ['Selecao Francesa'], dif: 25 },
    { pergunta: 'Qual selecao ganhou a Copa do Mundo de 2010?', resposta: 'Espanha', aceita: ['Selecao Espanhola'], dif: 30 },
    { pergunta: 'Qual selecao ganhou a Copa do Mundo de 2014 no Brasil?', resposta: 'Alemanha', aceita: ['Selecao Alema'], dif: 20 },
    { pergunta: 'Em que ano o Brasil ganhou o pentacampeonato mundial?', resposta: '2002', aceita: ['Dois mil e dois'], dif: 20 },
    { pergunta: 'Qual clube italiano e conhecido como Velha Senhora?', resposta: 'Juventus', aceita: ['Juve'], dif: 35 },
    { pergunta: 'Qual clube alemao joga na Allianz Arena, em Munique?', resposta: 'Bayern de Munique', aceita: ['Bayern'], dif: 25 },
    { pergunta: 'Qual clube frances de Paris contratou Neymar em 2017?', resposta: 'PSG', aceita: ['Paris Saint-Germain', 'Paris Saint Germain'], dif: 20 },
    { pergunta: 'Qual clube gaucho tem o apelido de Imortal Tricolor?', resposta: 'Gremio', aceita: ['Tricolor Gaucho'], dif: 30 },
    { pergunta: 'Qual clube mineiro e chamado de Galo?', resposta: 'Atletico Mineiro', aceita: ['Atletico-MG', 'Atletico'], dif: 20 },
    { pergunta: 'Qual clube carioca e chamado de Gigante da Colina?', resposta: 'Vasco', aceita: ['Vasco da Gama'], dif: 30 },
    { pergunta: 'Qual clube carioca e chamado de Fogao e ganhou a Libertadores de 2024?', resposta: 'Botafogo', aceita: ['Glorioso'], dif: 30 },
    { pergunta: 'Qual clube paulista e chamado de Tricolor do Morumbi?', resposta: 'Sao Paulo', aceita: ['SPFC'], dif: 20 },
    { pergunta: 'Qual clube de Belo Horizonte tem a Raposa como mascote?', resposta: 'Cruzeiro', aceita: ['Cabuloso'], dif: 25 },
    { pergunta: 'Qual clube gaucho tem o apelido de Colorado?', resposta: 'Internacional', aceita: ['Inter'], dif: 25 },
    { pergunta: 'Qual tecnico italiano assumiu a selecao brasileira em 2025?', resposta: 'Carlo Ancelotti', aceita: ['Ancelotti'], dif: 35 },
    { pergunta: 'Qual premio e dado ao melhor jogador do mundo pela revista France Football?', resposta: 'Bola de Ouro', aceita: ['Ballon d\'Or'], dif: 20 },
    { pergunta: 'Quanto tempo dura uma partida de futebol sem acrescimos?', resposta: '90 minutos', aceita: ['90'], dif: 10 },
    { pergunta: 'Qual e o principal torneio de clubes da America do Sul?', resposta: 'Libertadores', aceita: ['Copa Libertadores'], dif: 15 }
  ],

  geografia: [
    { pergunta: 'Qual e a capital do estado de Tocantins?', resposta: 'Palmas', dif: 40 },
    { pergunta: 'Qual e a capital do estado do Acre?', resposta: 'Rio Branco', dif: 45 },
    { pergunta: 'Qual e a capital do estado de Roraima?', resposta: 'Boa Vista', dif: 45 },
    { pergunta: 'Qual e a capital do estado do Amapa?', resposta: 'Macapa', dif: 45 },
    { pergunta: 'Qual e a capital do estado de Rondonia?', resposta: 'Porto Velho', dif: 45 }
  ],

  historia: [
    { pergunta: 'Em que ano aconteceu a Semana de Arte Moderna em Sao Paulo?', resposta: '1922', dif: 50 }
  ],

  ciencia: [
    { pergunta: 'Qual arvore brasileira deu nome ao pais por causa da madeira avermelhada?', sub: 'botanica', resposta: 'Pau-brasil', aceita: ['Pau brasil'], dif: 20 },
    { pergunta: 'Qual planta do deserto guarda agua e tem espinhos no lugar das folhas?', sub: 'botanica', resposta: 'Cacto', aceita: ['Cactos'], dif: 15 },
    { pergunta: 'Qual e a velocidade aproximada da luz em quilometros por segundo?', resposta: '300 mil', aceita: ['300000', '300.000', 'trezentos mil'], dif: 50 }
  ],

  musica: [
    { pergunta: 'Qual banda irlandesa tem Bono como vocalista?', resposta: 'U2', dif: 30 },
    { pergunta: 'Qual cantor porto-riquenho gravou "Despacito" com Daddy Yankee?', resposta: 'Luis Fonsi', aceita: ['Fonsi'], dif: 35 },
    { pergunta: 'Qual banda de Brasilia gravou "Lanterna dos Afogados" e "Meu Erro"?', resposta: 'Os Paralamas do Sucesso', aceita: ['Paralamas', 'Paralamas do Sucesso'], dif: 40 },
    { pergunta: 'Qual instrumento de cordas e o simbolo do sertanejo de raiz, com dez cordas?', resposta: 'Viola caipira', aceita: ['Viola'], dif: 40 },
    { pergunta: 'Qual instrumento de uma corda so e usado na capoeira?', resposta: 'Berimbau', dif: 20 },
    { pergunta: 'Qual festival de musica nasceu no Rio de Janeiro em 1985?', resposta: 'Rock in Rio', dif: 20 }
  ],

  anime: [
    { pergunta: 'Qual anime de basquete tem o ruivo Hanamichi Sakuragi?', resposta: 'Slam Dunk', dif: 45 },
    { pergunta: 'Qual anime de magia tem a garota Sakura capturando cartas?', resposta: 'Sakura Card Captors', aceita: ['Cardcaptor Sakura', 'Sakura Cardcaptor'], dif: 40 },
    { pergunta: 'Qual anime de 2023 sobre uma elfa que sobrevive aos companheiros virou fenomeno?', resposta: 'Frieren', aceita: ['Sousou no Frieren'], dif: 50 }
  ],

  mainstream: [
    { pergunta: 'Qual reality show da Globo confina participantes numa casa vigiada por cameras?', resposta: 'Big Brother Brasil', aceita: ['BBB', 'Big Brother'], dif: 10 },
    { pergunta: 'Qual reality show da Record confina famosos com animais, roca e provas de fazendeiro?', resposta: 'A Fazenda', aceita: ['Fazenda'], dif: 25 },
    { pergunta: 'Qual empresa criou o assistente de inteligencia artificial Claude?', resposta: 'Anthropic', dif: 40 },
    { pergunta: 'Qual festival de musica acontece em Interlagos e tem edicoes em Chicago e Santiago?', resposta: 'Lollapalooza', aceita: ['Lolla'], dif: 35 },
    { pergunta: 'Qual pais sediou a Copa do Mundo de 2022?', resposta: 'Catar', aceita: ['Qatar'], dif: 15 },
    { pergunta: 'Qual papa americano foi eleito em 2025?', resposta: 'Leao XIV', aceita: ['Papa Leao XIV', 'Leao 14', 'Robert Prevost'], dif: 35 }
  ],

  cinema: [
    { pergunta: 'Qual novela da Globo de 2001 tinha Dona Jura e a frase "nao e brinquedo nao"?', sub: 'novelas', resposta: 'O Clone', aceita: ['Clone'], dif: 45 },
    { pergunta: 'Qual novela de 1976 tinha uma escrava interpretada por Lucelia Santos e fez sucesso no mundo todo?', sub: 'novelas', resposta: 'Escrava Isaura', dif: 45 },
    { pergunta: 'Qual novela da Globo de 1985 se passava num Brasil imaginario com a Viuva Porcina?', sub: 'novelas', resposta: 'Roque Santeiro', dif: 50 },
    { pergunta: 'Qual novela juvenil da Globo se passava numa escola e ficou no ar de 1995 a 2020?', sub: 'novelas', resposta: 'Malhacao', dif: 20 },
    { pergunta: 'Qual novela mexicana com Thalia tinha a mocinha pobre perseguida pela vila Soraya?', sub: 'novelas', resposta: 'Maria do Bairro', dif: 30 },
    { pergunta: 'Qual novela infantil do SBT de 2012 se passava numa escola com a professora Helena e a aluna Maria Joaquina?', sub: 'novelas', resposta: 'Carrossel', dif: 30 }
  ]
};

/*
 * Segunda leva: so respostas que a categoria ainda nao tinha. Dentro de uma
 * partida a sala nao repete resposta, entao uma pergunta nova sobre uma
 * resposta velha quase nao muda a variedade.
 */
const LEVA_2 = {
  rap: [
    { pergunta: 'Qual rapper paulistano gravou "Ponta de Lanca" e mistura rap com ritmos africanos?', resposta: 'Rincon Sapiencia', aceita: ['Rincon'], dif: 50 },
    { pergunta: 'Qual rapper carioca lancou os albuns "Castelos & Ruinas" e "Gigantes"?', resposta: 'BK', dif: 50 },
    { pergunta: 'Qual projeto da Pineapple StormTV junta varios rappers em musicas acusticas?', resposta: 'Poesia Acustica', dif: 40 },
    { pergunta: 'Qual album dos Racionais de 2002 tem as faixas "Vida Loka" partes 1 e 2?', resposta: 'Nada Como um Dia Apos o Outro Dia', dif: 55 },
    { pergunta: 'Qual musica dos Racionais conta o dia a dia de um preso, escrita com Jocenir?', resposta: 'Diario de um Detento', dif: 40 },
    { pergunta: 'Qual rapper americano gravou "Gangsta\'s Paradise" em 1995?', resposta: 'Coolio', dif: 40 },
    { pergunta: 'Qual rapper gravou "Lucid Dreams" e morreu em 2019 aos 21 anos?', resposta: 'Juice WRLD', aceita: ['Juice World'], dif: 45 },
    { pergunta: 'Qual rapper gravou "SAD!" e "Moonlight" e foi morto em 2018?', resposta: 'XXXTentacion', dif: 45 },
    { pergunta: 'Qual rapper e ator criou a serie "Atlanta" e lancou o clipe "This Is America"?', resposta: 'Childish Gambino', aceita: ['Donald Glover'], dif: 40 },
    { pergunta: 'Qual rapper de Atlanta gravou "Mask Off"?', resposta: 'Future', dif: 45 },
    { pergunta: 'Qual rapper gravou "See You Again" com Charlie Puth para Velozes e Furiosos 7?', resposta: 'Wiz Khalifa', dif: 35 },
    { pergunta: 'Qual rapper de Miami e conhecido como Mr. Worldwide?', resposta: 'Pitbull', dif: 25 },
    { pergunta: 'Qual rapper de Houston gravou "Savage" com Beyonce e criou o termo Hot Girl Summer?', resposta: 'Megan Thee Stallion', aceita: ['Megan'], dif: 40 },
    { pergunta: 'Qual cantora e rapper gravou "Say So" e "Kiss Me More"?', resposta: 'Doja Cat', dif: 35 },
    { pergunta: 'Qual rapper do Brooklyn gravou "Dior" e foi morto em 2020?', resposta: 'Pop Smoke', dif: 45 },
    { pergunta: 'Qual rapper gravou o album "Swimming" e morreu em 2018, ex-namorado de Ariana Grande?', resposta: 'Mac Miller', dif: 45 },
    { pergunta: 'Qual rapper de Atlanta, nascido em Londres, gravou "Bank Account" e "a lot"?', resposta: '21 Savage', dif: 45 },
    { pergunta: 'Qual filme de 2002 com Eminem tem o nome de uma avenida de Detroit?', resposta: '8 Mile', aceita: ['8 Mile Rua das Ilusoes'], dif: 30 },
    { pergunta: 'Como se chama a arte de fazer a batida do rap so com a boca?', resposta: 'Beatbox', dif: 25 },
    { pergunta: 'Qual gravadora fundada por Eminem lancou 50 Cent junto com a Aftermath?', resposta: 'Shady Records', dif: 55 }
  ],

  games: [
    { pergunta: 'Qual jogo de 2017 tem Mario jogando o chapeu falante Cappy?', sub: 'nintendo', resposta: 'Super Mario Odyssey', aceita: ['Mario Odyssey'], dif: 40 },
    { pergunta: 'Qual jogo de 2015 mistura futebol com carros turbinados?', resposta: 'Rocket League', dif: 35 },
    { pergunta: 'Qual jogo de celular da Supercell tem duelos de cartas com torres do Rei e das Princesas?', sub: 'mobile', resposta: 'Clash Royale', dif: 30 },
    { pergunta: 'Qual jogo de celular da Supercell tem vilas, muralhas e barbaros atacando bases?', sub: 'mobile', resposta: 'Clash of Clans', dif: 30 },
    { pergunta: 'Qual jogo de celular tem um grafiteiro correndo nos trilhos do metro fugindo do guarda?', sub: 'mobile', resposta: 'Subway Surfers', aceita: ['Subway Surf'], dif: 20 },
    { pergunta: 'Qual jogo de celular consiste em cortar frutas com o dedo sem acertar bombas?', sub: 'mobile', resposta: 'Fruit Ninja', dif: 25 },
    { pergunta: 'Qual jogo de celular da King junta doces coloridos de tres em tres?', sub: 'mobile', resposta: 'Candy Crush', aceita: ['Candy Crush Saga'], dif: 20 },
    { pergunta: 'Qual bolinha rosa da Nintendo engole os inimigos e copia os poderes deles?', sub: 'nintendo', resposta: 'Kirby', dif: 30 },
    { pergunta: 'Qual gorila de gravata vermelha e um dos primeiros personagens da Nintendo?', sub: 'nintendo', resposta: 'Donkey Kong', dif: 25 },
    { pergunta: 'Qual jogo de luta da Bandai Namco tem lutadores como Heihachi e Jin Kazama?', resposta: 'Tekken', dif: 40 },
    { pergunta: 'Qual plataforma de jogos criados pelos proprios usuarios tem a moeda Robux?', sub: 'mobile', resposta: 'Roblox', dif: 20 },
    { pergunta: 'Qual jogo da Ubisoft tem coreografias de musicas pop para dancar na frente da TV?', resposta: 'Just Dance', dif: 25 },
    { pergunta: 'Qual robo azul da Capcom atira com o braco canhao?', resposta: 'Mega Man', aceita: ['Megaman', 'Rockman'], dif: 35 },
    { pergunta: 'Qual cacadora de recompensas da Nintendo usa armadura laranja em Metroid?', sub: 'nintendo', resposta: 'Samus', aceita: ['Samus Aran'], dif: 45 },
    { pergunta: 'Qual jogo roguelike de 2020 tem Zagreus tentando fugir do submundo grego?', resposta: 'Hades', dif: 50 },
    { pergunta: 'Qual jogo indie de 2015 tem o esqueleto Sans e deixa voce poupar todos os monstros?', resposta: 'Undertale', dif: 45 },
    { pergunta: 'Qual lutador brasileiro de pele verde solta choques em Street Fighter?', resposta: 'Blanka', dif: 35 },
    { pergunta: 'Qual jogo de fliperama com tapete de setas para dancar era febre nos shoppings brasileiros?', resposta: 'Pump It Up', aceita: ['Pump'], dif: 40 }
  ],

  animais: [
    { pergunta: 'Qual animal dos Andes carrega peso e cospe quando se irrita?', resposta: 'Lhama', dif: 25 },
    { pergunta: 'Qual lagarta produz o fio usado para fazer seda?', resposta: 'Bicho-da-seda', aceita: ['Bicho da seda'], dif: 35 },
    { pergunta: 'Qual e o maior lagarto do mundo, que vive na Indonesia?', resposta: 'Dragao-de-komodo', aceita: ['Dragao de komodo', 'Komodo'], dif: 30 },
    { pergunta: 'Qual e o maior cervo da America do Sul, que vive em areas alagadas?', resposta: 'Cervo-do-pantanal', aceita: ['Cervo do pantanal'], dif: 50 },
    { pergunta: 'Qual primata de pelo laranja vive nas ilhas de Borneu e Sumatra?', resposta: 'Orangotango', dif: 30 },
    { pergunta: 'Qual animal marinho gelatinoso e transparente queima a pele com os tentaculos?', resposta: 'Agua-viva', aceita: ['Agua viva', 'Medusa'], dif: 20 },
    { pergunta: 'Qual inseto canta alto no verao depois de passar anos debaixo da terra?', resposta: 'Cigarra', dif: 25 },
    { pergunta: 'Qual felino brasileiro pequeno tem pelagem pintada parecida com a da onca?', resposta: 'Jaguatirica', dif: 40 },
    { pergunta: 'Qual cao selvagem vive na Australia?', resposta: 'Dingo', dif: 40 },
    { pergunta: 'Qual animal aparece na nota de 20 reais?', resposta: 'Mico-leao-dourado', aceita: ['Mico leao dourado'], dif: 40 },
    { pergunta: 'Qual animal aparece na nota de 5 reais?', resposta: 'Garca', dif: 55 },
    { pergunta: 'Qual molusco marinho produz perolas?', resposta: 'Ostra', dif: 20 },
    { pergunta: 'Qual cobra brasileira tem um chocalho na ponta do rabo?', resposta: 'Cascavel', dif: 20 },
    { pergunta: 'Qual mamifero do Artico tem presas compridas e bigode grosso?', resposta: 'Morsa', dif: 30 },
    { pergunta: 'Qual mamifero marinho preto e branco e chamado de baleia assassina?', resposta: 'Orca', dif: 20 },
    { pergunta: 'Qual inseto vive em colonias e carrega muitas vezes o proprio peso?', resposta: 'Formiga', dif: 15 },
    { pergunta: 'Qual ave do cerrado de pernas longas tem um canto alto que se ouve de longe?', resposta: 'Seriema', dif: 50 },
    { pergunta: 'Qual animal da fazenda fornece a la?', resposta: 'Ovelha', dif: 10 },
    { pergunta: 'Qual e o filhote da galinha?', resposta: 'Pintinho', aceita: ['Pinto'], dif: 10 },
    { pergunta: 'Qual animal da fazenda faz "oinc" e adora lama?', resposta: 'Porco', dif: 10 },
    { pergunta: 'Qual animal hiberna no inverno e adora mel nos desenhos animados?', resposta: 'Urso', dif: 15 }
  ],

  comidas: [
    { pergunta: 'Qual fruta tem a castanha do lado de fora?', sub: 'frutas', resposta: 'Caju', dif: 25 },
    { pergunta: 'Qual fruta vermelha por dentro e usada no doce Romeu e Julieta?', sub: 'frutas', resposta: 'Goiaba', dif: 25 },
    { pergunta: 'Qual fruta cortada em fatias tem formato de estrela?', sub: 'frutas', resposta: 'Carambola', dif: 30 },
    { pergunta: 'Qual fruta de polpa laranja e sementes pretas e famosa no cafe da manha?', sub: 'frutas', resposta: 'Mamao', aceita: ['Papaia'], dif: 20 },
    { pergunta: 'Qual fruta verde e espinhosa por fora tem polpa branca e azedinha?', sub: 'frutas', resposta: 'Graviola', dif: 40 },
    { pergunta: 'Qual fruta pequena e vermelha, de casca aspera, tem polpa branca e veio da China?', sub: 'frutas', resposta: 'Lichia', dif: 40 },
    { pergunta: 'Qual fruta de agua refrescante e vendida gelada na praia?', sub: 'frutas', resposta: 'Coco', aceita: ['Agua de coco'], dif: 15 },
    { pergunta: 'Qual fruta vermelha cheia de sementes e comida no Ano-Novo para dar sorte?', sub: 'frutas', resposta: 'Roma', dif: 40 },
    { pergunta: 'Qual raiz amarela e cheirosa, prima da cenoura, e usada em pures e sopas de inverno?', sub: 'vegetais', resposta: 'Mandioquinha', aceita: ['Batata-baroa', 'Batata baroa'], dif: 45 },
    { pergunta: 'Qual legume verde claro, de sabor suave e casca com espinhos finos, vai em sopas e refogados?', sub: 'vegetais', resposta: 'Chuchu', dif: 30 },
    { pergunta: 'Qual legume amargo e pequeno e verde e famoso por dividir opinioes?', sub: 'vegetais', resposta: 'Jilo', dif: 30 },
    { pergunta: 'Qual folha de sabor picante e muito usada em saladas com tomate seco?', sub: 'vegetais', resposta: 'Rucula', dif: 30 },
    { pergunta: 'Qual parte comestivel da palmeira e usada em saladas e no recheio de torta?', sub: 'vegetais', resposta: 'Palmito', dif: 30 },
    { pergunta: 'Qual bolinho frito de massa doce e passado no acucar com canela e tipico de dia chuvoso?', sub: 'frituras', resposta: 'Bolinho de chuva', dif: 25 },
    { pergunta: 'Qual petisco crocante e feito de pele de porco frita?', sub: 'frituras', resposta: 'Torresmo', dif: 20 },
    { pergunta: 'Qual bolinho frito do Oriente Medio e feito de grao-de-bico?', sub: 'frituras', resposta: 'Falafel', dif: 40 },
    { pergunta: 'Qual empanado japones leve e crocante e feito com camarao ou legumes?', sub: 'frituras', resposta: 'Tempura', dif: 35 },
    { pergunta: 'Qual rosquinha frita americana tem um buraco no meio e cobertura colorida?', sub: 'frituras', resposta: 'Donut', aceita: ['Rosquinha americana'], dif: 20 },
    { pergunta: 'Qual lanche brasileiro leva hamburguer, ovo, bacon, presunto, queijo e salada, tudo junto?', sub: 'lanches', resposta: 'X-tudo', aceita: ['X tudo', 'Xis tudo'], dif: 20 },
    { pergunta: 'Qual massa francesa folhada em formato de meia-lua e servida no cafe?', sub: 'lanches', resposta: 'Croissant', dif: 25 },
    { pergunta: 'Qual massa fininha francesa pode ser doce ou salgada e e dobrada com recheio?', sub: 'lanches', resposta: 'Crepe', dif: 25 },
    { pergunta: 'Qual prato russo popular no Brasil leva carne, creme de leite e batata palha?', sub: 'pratos', resposta: 'Strogonoff', aceita: ['Estrogonofe', 'Stroganoff'], dif: 15 },
    { pergunta: 'Qual prato leva carne seca coberta com pure de mandioca e queijo gratinado?', sub: 'pratos', resposta: 'Escondidinho', dif: 25 },
    { pergunta: 'Qual prato baiano cremoso leva pao, amendoim, camarao e dende?', sub: 'pratos', resposta: 'Vatapa', dif: 40 },
    { pergunta: 'Qual prato peruano e feito com peixe cru marinado no limao?', sub: 'pratos', resposta: 'Ceviche', dif: 35 },
    { pergunta: 'Qual prato suico de panela e feito com queijo derretido para mergulhar pao?', sub: 'pratos', resposta: 'Fondue', dif: 30 },
    { pergunta: 'Qual prato italiano de massinhas de batata e comido no dia 29 para atrair dinheiro?', sub: 'pratos', resposta: 'Nhoque', aceita: ['Gnocchi'], dif: 30 },
    { pergunta: 'Qual caldo paraense quente leva tucupi, jambu, goma de tapioca e camarao?', sub: 'pratos', resposta: 'Tacaca', dif: 50 }
  ],

  geografia: [
    { pergunta: 'Qual e a capital do Catar?', resposta: 'Doha', dif: 45 },
    { pergunta: 'Qual e a capital da Arabia Saudita?', resposta: 'Riad', aceita: ['Riyadh'], dif: 50 },
    { pergunta: 'Qual e a capital da Indonesia?', resposta: 'Jacarta', aceita: ['Jakarta'], dif: 45 },
    { pergunta: 'Qual e a capital da Malasia?', resposta: 'Kuala Lumpur', dif: 50 },
    { pergunta: 'Qual e a capital do Paquistao?', resposta: 'Islamabad', dif: 55 },
    { pergunta: 'Qual e a capital do Iraque?', resposta: 'Bagda', aceita: ['Baghdad'], dif: 45 },
    { pergunta: 'Qual e a capital da Siria?', resposta: 'Damasco', dif: 50 },
    { pergunta: 'Qual e a capital do Libano?', resposta: 'Beirute', dif: 45 },
    { pergunta: 'Qual e a capital do Senegal?', resposta: 'Dacar', aceita: ['Dakar'], dif: 55 },
    { pergunta: 'Qual e a capital de Angola?', resposta: 'Luanda', dif: 45 },
    { pergunta: 'Qual e a capital de Mocambique?', resposta: 'Maputo', dif: 50 },
    { pergunta: 'Qual e a capital de Gana?', resposta: 'Acra', aceita: ['Accra'], dif: 55 },
    { pergunta: 'Qual e a capital da Romenia?', resposta: 'Bucareste', dif: 50 },
    { pergunta: 'Qual e a capital da Croacia?', resposta: 'Zagreb', dif: 50 },
    { pergunta: 'Qual e a capital da Islandia?', resposta: 'Reykjavik', aceita: ['Reiquiavique'], dif: 50 },
    { pergunta: 'Qual e a capital da Costa Rica?', resposta: 'San Jose', dif: 50 },
    { pergunta: 'Qual e a capital do estado do Piaui?', resposta: 'Teresina', dif: 35 },
    { pergunta: 'Qual e a capital do estado da Paraiba?', resposta: 'Joao Pessoa', dif: 30 },
    { pergunta: 'Qual e a capital do estado de Alagoas?', resposta: 'Maceio', dif: 30 },
    { pergunta: 'Qual e a capital do estado de Sergipe?', resposta: 'Aracaju', dif: 35 },
    { pergunta: 'Qual e a capital do estado de Mato Grosso?', resposta: 'Cuiaba', dif: 35 },
    { pergunta: 'Qual e a capital do estado de Mato Grosso do Sul?', resposta: 'Campo Grande', dif: 35 }
  ],

  historia: [
    { pergunta: 'Qual movimento de 1789 em Minas Gerais terminou com a morte de Tiradentes?', resposta: 'Inconfidencia Mineira', dif: 30 },
    { pergunta: 'Qual guerra no sertao baiano teve Antonio Conselheiro como lider?', resposta: 'Guerra de Canudos', aceita: ['Canudos'], dif: 40 },
    { pergunta: 'Qual revolta gaucha durou de 1835 a 1845 contra o Imperio?', resposta: 'Revolucao Farroupilha', aceita: ['Farroupilha', 'Guerra dos Farrapos'], dif: 40 },
    { pergunta: 'Qual guerra de 1864 a 1870 juntou Brasil, Argentina e Uruguai na Triplice Alianca?', resposta: 'Guerra do Paraguai', dif: 40 },
    { pergunta: 'Qual presidente brasileiro sofreu impeachment em 1992?', resposta: 'Fernando Collor', aceita: ['Collor', 'Collor de Mello'], dif: 35 },
    { pergunta: 'Qual plano economico de 1994 criou a moeda que o Brasil usa ate hoje?', resposta: 'Plano Real', dif: 30 },
    { pergunta: 'Qual imperio foi fundado por Gengis Khan?', resposta: 'Imperio Mongol', aceita: ['Mongol', 'Mongois'], dif: 40 },
    { pergunta: 'Qual era o nome do navio em que Charles Darwin deu a volta ao mundo?', resposta: 'Beagle', aceita: ['HMS Beagle'], dif: 55 },
    { pergunta: 'Qual explorador noruegues chegou primeiro ao Polo Sul, em 1911?', resposta: 'Roald Amundsen', aceita: ['Amundsen'], dif: 55 },
    { pergunta: 'Qual cadela sovietica foi o primeiro animal a orbitar a Terra, em 1957?', resposta: 'Laika', dif: 35 },
    { pergunta: 'Qual rei frances chamado de Rei Sol construiu o Palacio de Versalhes?', resposta: 'Luis XIV', aceita: ['Luis 14'], dif: 45 },
    { pergunta: 'Qual monge alemao pregou 95 teses em 1517 e iniciou a Reforma Protestante?', resposta: 'Martinho Lutero', aceita: ['Lutero', 'Martin Lutero'], dif: 35 },
    { pergunta: 'Qual escritora mineira e catadora de papel escreveu "Quarto de Despejo"?', resposta: 'Carolina Maria de Jesus', dif: 45 },
    { pergunta: 'Qual compositor brasileiro do seculo XIX escreveu a opera "O Guarani"?', resposta: 'Carlos Gomes', dif: 55 },
    { pergunta: 'Qual maestro brasileiro compos as "Bachianas Brasileiras"?', resposta: 'Heitor Villa-Lobos', aceita: ['Villa-Lobos', 'Villa Lobos'], dif: 45 },
    { pergunta: 'Qual pintor holandes pintou "Moca com Brinco de Perola"?', resposta: 'Johannes Vermeer', aceita: ['Vermeer'], dif: 50 },
    { pergunta: 'Qual pintor renascentista italiano pintou "O Nascimento de Venus"?', resposta: 'Sandro Botticelli', aceita: ['Botticelli'], dif: 50 },
    { pergunta: 'Qual arquiteto catalao projetou a Sagrada Familia, em Barcelona?', resposta: 'Antoni Gaudi', aceita: ['Gaudi'], dif: 40 },
    { pergunta: 'Qual escultor mineiro do barroco esculpiu os profetas de Congonhas?', resposta: 'Aleijadinho', dif: 40 },
    { pergunta: 'Qual heroina francesa da Guerra dos Cem Anos foi queimada em 1431?', resposta: 'Joana d\'Arc', aceita: ['Joana Darc', 'Joana dArc'], dif: 35 },
    { pergunta: 'Qual deus romano da guerra deu nome ao planeta vermelho?', sub: 'mitologia', resposta: 'Marte', dif: 30 },
    { pergunta: 'Qual deusa nordica do amor e da beleza anda numa carruagem puxada por gatos?', sub: 'mitologia', resposta: 'Freya', aceita: ['Freyja'], dif: 50 },
    { pergunta: 'Qual deus nordico guarda a ponte arco-iris Bifrost?', sub: 'mitologia', resposta: 'Heimdall', dif: 50 },
    { pergunta: 'Qual deus egipcio com cabeca de falcao e filho de Isis e Osiris?', sub: 'mitologia', resposta: 'Horus', dif: 45 },
    { pergunta: 'Qual foi a capital do Brasil de 1763 ate a inauguracao de Brasilia?', resposta: 'Rio de Janeiro', aceita: ['Rio'], dif: 30 }
  ],

  ciencia: [
    { pergunta: 'Qual organela e chamada de usina de energia da celula?', sub: 'biologia', resposta: 'Mitocondria', dif: 30 },
    { pergunta: 'Qual proteina das hemacias transporta oxigenio no sangue?', sub: 'biologia', resposta: 'Hemoglobina', dif: 35 },
    { pergunta: 'Qual hormonio produzido pelo pancreas controla o acucar no sangue?', sub: 'biologia', resposta: 'Insulina', dif: 30 },
    { pergunta: 'Qual celula do sistema nervoso transmite impulsos eletricos?', sub: 'biologia', resposta: 'Neuronio', dif: 30 },
    { pergunta: 'Qual orgao faz as trocas gasosas da respiracao?', sub: 'biologia', resposta: 'Pulmao', aceita: ['Pulmoes'], dif: 15 },
    { pergunta: 'Qual parte do encefalo cuida do equilibrio e da coordenacao dos movimentos?', sub: 'biologia', resposta: 'Cerebelo', dif: 40 },
    { pergunta: 'Como se chama a passagem do liquido para o vapor quando a agua ferve?', resposta: 'Ebulicao', dif: 35 },
    { pergunta: 'Como se chama a passagem do vapor para o liquido, como as gotas num copo gelado?', resposta: 'Condensacao', dif: 30 },
    { pergunta: 'Qual teoria explica a origem do universo a partir de uma grande expansao?', resposta: 'Big Bang', dif: 20 },
    { pergunta: 'Qual regiao do espaco tem gravidade tao forte que nem a luz escapa?', resposta: 'Buraco negro', dif: 20 },
    { pergunta: 'Qual unidade mede a distancia que a luz percorre em um ano?', resposta: 'Ano-luz', aceita: ['Ano luz'], dif: 30 },
    { pergunta: 'Qual cometa passa perto da Terra a cada 76 anos?', resposta: 'Halley', aceita: ['Cometa Halley'], dif: 35 },
    { pergunta: 'Qual astro foi rebaixado de planeta para planeta anao em 2006?', resposta: 'Plutao', dif: 25 },
    { pergunta: 'Qual telescopio espacial lancado em 1990 leva o nome de um astronomo americano?', resposta: 'Hubble', dif: 35 },
    { pergunta: 'Qual telescopio espacial lancado em 2021 e o sucessor do Hubble?', resposta: 'James Webb', dif: 40 },
    { pergunta: 'Qual vitamina e abundante na laranja e no limao?', resposta: 'Vitamina C', dif: 15 },
    { pergunta: 'Qual camada da Terra fica entre a crosta e o nucleo?', resposta: 'Manto', dif: 30 },
    { pergunta: 'Qual escala mede a magnitude dos terremotos?', resposta: 'Richter', aceita: ['Escala Richter'], dif: 30 },
    { pergunta: 'Qual mineral e o mais duro da natureza?', resposta: 'Diamante', dif: 20 },
    { pergunta: 'Qual fisico britanico estudou buracos negros e escreveu "Uma Breve Historia do Tempo"?', resposta: 'Stephen Hawking', aceita: ['Hawking'], dif: 25 },
    { pergunta: 'Qual inventor servio-americano estudou a corrente alternada e deu nome a uma montadora?', resposta: 'Nikola Tesla', aceita: ['Tesla'], dif: 35 }
  ],

  musica: [
    { pergunta: 'Qual cantor carioca gravou "Exagerado" e "O Tempo Nao Para"?', resposta: 'Cazuza', dif: 25 },
    { pergunta: 'Qual cantor baiano gravou "Maluco Beleza" e "Metamorfose Ambulante"?', resposta: 'Raul Seixas', aceita: ['Raulzito'], dif: 25 },
    { pergunta: 'Qual cantor carioca de soul gravou "Gostava Tanto de Voce" e "Descobridor dos Sete Mares"?', resposta: 'Tim Maia', dif: 25 },
    { pergunta: 'Qual cantor carioca gravou "Mas Que Nada" e "Pais Tropical"?', resposta: 'Jorge Ben Jor', aceita: ['Jorge Ben'], dif: 35 },
    { pergunta: 'Qual sambista carioca gravou "Deixa a Vida Me Levar"?', resposta: 'Zeca Pagodinho', dif: 20 },
    { pergunta: 'Qual cantor dos Secos & Molhados gravou "Homem com H"?', resposta: 'Ney Matogrosso', dif: 30 },
    { pergunta: 'Qual cantor do Clube da Esquina gravou "Travessia" e "Maria Maria"?', resposta: 'Milton Nascimento', aceita: ['Milton', 'Bituca'], dif: 35 },
    { pergunta: 'Qual cantora baiana, irma de Caetano Veloso, e chamada de Abelha Rainha?', resposta: 'Maria Bethania', aceita: ['Bethania'], dif: 35 },
    { pergunta: 'Qual cantora baiana da Tropicalia gravou "Baby" e "Divino Maravilhoso"?', resposta: 'Gal Costa', dif: 40 },
    { pergunta: 'Qual cantor cearense gravou "Como Nossos Pais" e "Apenas um Rapaz Latino-Americano"?', resposta: 'Belchior', dif: 40 },
    { pergunta: 'Qual dupla de irmaos fez sucesso nos anos 90 com "Vamo Pula" e "Imortal"?', resposta: 'Sandy e Junior', aceita: ['Sandy & Junior'], dif: 25 },
    { pergunta: 'Qual roqueira baiana gravou "Me Adora" e o disco "Admiravel Chip Novo"?', resposta: 'Pitty', dif: 30 },
    { pergunta: 'Qual banda de reggae de Brasilia gravou "Liberdade pra Dentro da Cabeca"?', resposta: 'Natiruts', dif: 35 },
    { pergunta: 'Qual dupla sertaneja gravou "Cuida Bem Dela" e "Flor e o Beija-Flor"?', resposta: 'Henrique e Juliano', aceita: ['Henrique & Juliano'], dif: 30 },
    { pergunta: 'Qual dupla sertaneja de Goias gravou "E o Amor" no comeco dos anos 90?', resposta: 'Zeze Di Camargo e Luciano', aceita: ['Zeze Di Camargo & Luciano', 'Zeze e Luciano'], dif: 25 },
    { pergunta: 'Qual cantor de pagode saiu do Exaltasamba e gravou "Deixa Tudo Como Ta"?', resposta: 'Thiaguinho', dif: 30 },
    { pergunta: 'Qual cantora carioca gravou "Pesadao" e "Dona de Mim"?', resposta: 'Iza', dif: 30 },
    { pergunta: 'Qual cantora gaucha gravou "Penhasco" e "Chico"?', resposta: 'Luisa Sonza', dif: 30 },
    { pergunta: 'Qual drag queen paulistana gravou "Bumbum de Ouro" e "Vermelho"?', resposta: 'Gloria Groove', dif: 35 },
    { pergunta: 'Qual banda britanica gravou "Yellow" e "Viva la Vida"?', resposta: 'Coldplay', dif: 20 },
    { pergunta: 'Qual banda de Adam Levine gravou "Sugar" e "Moves Like Jagger"?', resposta: 'Maroon 5', dif: 25 },
    { pergunta: 'Qual cantora americana gravou "drivers license" e "good 4 u"?', resposta: 'Olivia Rodrigo', dif: 35 },
    { pergunta: 'Qual cantora americana gravou "Espresso" e "Please Please Please"?', resposta: 'Sabrina Carpenter', dif: 35 },
    { pergunta: 'Qual cantora americana gravou "Flowers" e foi a Hannah Montana?', resposta: 'Miley Cyrus', dif: 25 },
    { pergunta: 'Qual grupo sueco gravou "Dancing Queen" e "Mamma Mia"?', resposta: 'ABBA', dif: 25 },
    { pergunta: 'Qual dupla francesa de capacetes de robo gravou "Get Lucky"?', resposta: 'Daft Punk', dif: 35 },
    { pergunta: 'Qual DJ sueco gravou "Wake Me Up" e "Levels"?', resposta: 'Avicii', dif: 35 },
    { pergunta: 'Qual trio de irmaos gravou "Stayin\' Alive"?', resposta: 'Bee Gees', dif: 30 }
  ],

  anime: [
    { pergunta: 'Qual rei das maldicoes vive dentro do corpo de Itadori em Jujutsu Kaisen?', sub: 'jujutsu', resposta: 'Sukuna', aceita: ['Ryomen Sukuna'], dif: 30 },
    { pergunta: 'Qual cacador de Demon Slayer usa a respiracao do trovao e vive com medo?', sub: 'demonslayer', resposta: 'Zenitsu', aceita: ['Zenitsu Agatsuma'], dif: 30 },
    { pergunta: 'Qual cacador de Demon Slayer usa uma cabeca de javali?', sub: 'demonslayer', resposta: 'Inosuke', aceita: ['Inosuke Hashibira'], dif: 30 },
    { pergunta: 'Qual Hashira das chamas luta no trem Mugen em Demon Slayer?', sub: 'demonslayer', resposta: 'Rengoku', aceita: ['Kyojuro Rengoku'], dif: 35 },
    { pergunta: 'Qual e o rei dos onis em Demon Slayer?', sub: 'demonslayer', resposta: 'Muzan', aceita: ['Muzan Kibutsuji'], dif: 40 },
    { pergunta: 'Qual menina telepata de Spy x Family adora amendoim?', resposta: 'Anya', aceita: ['Anya Forger'], dif: 30 },
    { pergunta: 'Qual principe exilado tem o poder do Geass em Code Geass?', resposta: 'Lelouch', aceita: ['Lelouch Lamperouge', 'Lelouch vi Britannia'], dif: 45 },
    { pergunta: 'Qual cacador de recompensas de Cowboy Bebop luta jeet kune do?', resposta: 'Spike Spiegel', aceita: ['Spike'], dif: 50 },
    { pergunta: 'Qual espadachim de Berserk carrega a enorme espada Matadora de Dragoes?', resposta: 'Guts', dif: 45 },
    { pergunta: 'Qual protagonista de Tokyo Ghoul vira meio-ghoul depois de um transplante?', resposta: 'Ken Kaneki', aceita: ['Kaneki'], dif: 40 },
    { pergunta: 'Qual garoto pilota o Eva-01 em Neon Genesis Evangelion?', resposta: 'Shinji Ikari', aceita: ['Shinji'], dif: 45 },
    { pergunta: 'Qual personagem de Chainsaw Man e a Demonia do Sangue?', resposta: 'Power', dif: 40 },
    { pergunta: 'Qual pirata de One Piece tinha a fruta do tremor e era o homem mais forte do mundo?', sub: 'onepiece', resposta: 'Barba Branca', aceita: ['Whitebeard', 'Edward Newgate'], dif: 35 },
    { pergunta: 'Qual irmao de Luffy usa a fruta do fogo e morre em Marineford?', sub: 'onepiece', resposta: 'Ace', aceita: ['Portgas D. Ace', 'Portgas'], dif: 30 },
    { pergunta: 'Qual arqueologa dos Chapeus de Palha consegue ler os Poneglyphs?', resposta: 'Nico Robin', aceita: ['Robin'], dif: 35 },
    { pergunta: 'Qual pokemon inicial de fogo evolui para Charizard?', resposta: 'Charmander', dif: 20 }
  ],

  mainstream: [
    { pergunta: 'Qual loja chinesa de roupas baratas pela internet virou febre no Brasil?', resposta: 'Shein', dif: 20 },
    { pergunta: 'Qual aplicativo de compras de Singapura tem o logo de uma sacola laranja?', resposta: 'Shopee', dif: 25 },
    { pergunta: 'Qual aplicativo de videos curtos, rival do TikTok, e popular no interior do Brasil?', resposta: 'Kwai', dif: 35 },
    { pergunta: 'Qual evento de cultura pop e quadrinhos acontece em Sao Paulo todo fim de ano?', resposta: 'CCXP', aceita: ['Comic Con Experience'], dif: 35 },
    { pergunta: 'Qual servico do Google traduz textos entre idiomas?', resposta: 'Google Tradutor', aceita: ['Google Translate'], dif: 15 },
    { pergunta: 'Qual reality de culinaria da Band tem Ana Paula Padrao e jurados como Erick Jacquin?', resposta: 'MasterChef', aceita: ['MasterChef Brasil'], dif: 25 },
    { pergunta: 'Qual apresentador assumiu o "Domingao" da Globo em 2021?', resposta: 'Luciano Huck', aceita: ['Huck'], dif: 25 },
    { pergunta: 'Qual apresentador comandou o "Domingao" por 32 anos?', resposta: 'Faustao', aceita: ['Fausto Silva'], dif: 20 },
    { pergunta: 'Qual apresentador fundou o SBT e dizia "Quem quer dinheiro?"', resposta: 'Silvio Santos', dif: 15 },
    { pergunta: 'Qual apresentadora gaucha ficou conhecida como Rainha dos Baixinhos?', resposta: 'Xuxa', aceita: ['Xuxa Meneghel'], dif: 15 },
    { pergunta: 'Quais criaturinhas amarelas de macacao jeans trabalham para o vilao Gru?', resposta: 'Minions', aceita: ['Minion'], dif: 15 },
    { pergunta: 'Qual boneca da Mattel ganhou um filme de sucesso em 2023?', resposta: 'Barbie', dif: 15 },
    { pergunta: 'Qual bichinho de pelucia de dentes pontudos da Pop Mart virou febre em 2025?', resposta: 'Labubu', dif: 35 },
    { pergunta: 'Qual assistente de voz vem nos iPhones?', resposta: 'Siri', dif: 15 }
  ]
};

/* Terceira leva: reforco do Modo Tempo nas categorias que ficaram de fora. */
const LEVA_3 = {
  futebol: [
    { pergunta: 'Qual estadio carioca recebeu as finais das Copas de 1950 e 2014?', resposta: 'Maracana', aceita: ['Estadio Mario Filho'], dif: 15 },
    { pergunta: 'Qual e o estadio do Sao Paulo FC?', resposta: 'Morumbi', aceita: ['Morumbis', 'Cicero Pompeu de Toledo'], dif: 20 },
    { pergunta: 'Qual estadio de Belo Horizonte recebeu o 7 a 1 da Copa de 2014?', resposta: 'Mineirao', aceita: ['Estadio Magalhaes Pinto'], dif: 25 },
    { pergunta: 'Qual e o estadio do Vasco, no bairro de Sao Cristovao?', resposta: 'Sao Januario', aceita: ['Estadio Sao Januario'], dif: 30 },
    { pergunta: 'Qual e o estadio do Santos, onde Pele brilhou?', resposta: 'Vila Belmiro', aceita: ['Urbano Caldeira'], dif: 25 },
    { pergunta: 'Qual e o estadio do Internacional, as margens do Guaiba?', resposta: 'Beira-Rio', aceita: ['Beira Rio'], dif: 25 },
    { pergunta: 'Qual e o estadio do Corinthians, em Itaquera?', resposta: 'Neo Quimica Arena', aceita: ['Arena Corinthians', 'Itaquerao'], dif: 25 },
    { pergunta: 'Qual torneio de selecoes da America do Sul o Brasil venceu em casa em 2019?', resposta: 'Copa America', aceita: ['Copa America 2019'], dif: 20 },
    { pergunta: 'Qual e a principal liga de clubes da Inglaterra?', resposta: 'Premier League', aceita: ['Premier'], dif: 15 },
    { pergunta: 'Qual torneio europeu de clubes tem a bola de estrelas como simbolo e um hino tocado antes de cada jogo?', resposta: 'Champions League', aceita: ['Liga dos Campeoes', 'Champions'], dif: 15 },
    { pergunta: 'Qual e o campeonato nacional de clubes do Brasil, em pontos corridos desde 2003?', resposta: 'Brasileirao', aceita: ['Campeonato Brasileiro', 'Serie A'], dif: 15 },
    { pergunta: 'Qual tecnico gaucho levou o Brasil ao penta em 2002?', resposta: 'Felipao', aceita: ['Luiz Felipe Scolari', 'Scolari'], dif: 20 },
    { pergunta: 'Qual tecnico, campeao do mundo como jogador e como treinador do Brasil, morreu em 2024?', resposta: 'Zagallo', aceita: ['Mario Jorge Lobo Zagallo', 'Velho Lobo'], dif: 30 },
    { pergunta: 'Qual tecnico gaucho comandou o Brasil nas Copas de 2018 e 2022?', resposta: 'Tite', aceita: ['Adenor Bacchi'], dif: 20 },
    { pergunta: 'Qual tecnico do Sao Paulo bicampeao mundial em 1992 e 1993 comandou o Brasil em 1982?', resposta: 'Tele Santana', aceita: ['Tele'], dif: 40 },
    { pergunta: 'Qual tecnico catalao comandou o Barcelona de Messi e depois o Manchester City?', resposta: 'Pep Guardiola', aceita: ['Guardiola', 'Pep'], dif: 25 },
    { pergunta: 'Qual tecnico portugues se apresentou ao Chelsea como "The Special One"?', resposta: 'Jose Mourinho', aceita: ['Mourinho'], dif: 30 },
    { pergunta: 'Qual tecnico alemao levou o Liverpool ao titulo da Champions em 2019?', resposta: 'Jurgen Klopp', aceita: ['Klopp'], dif: 30 },
    { pergunta: 'Qual tecnico portugues ganhou duas Libertadores seguidas pelo Palmeiras?', resposta: 'Abel Ferreira', aceita: ['Abel'], dif: 25 },
    { pergunta: 'Qual tecnico portugues levou o Flamengo ao titulo da Libertadores de 2019?', resposta: 'Jorge Jesus', aceita: ['Mister'], dif: 25 },
    { pergunta: 'Qual torneio da FIFA ganhou um formato com 32 clubes nos Estados Unidos em 2025?', resposta: 'Mundial de Clubes', aceita: ['Copa do Mundo de Clubes'], dif: 25 },
    { pergunta: 'Qual clube ingles venceu o PSG na final do Mundial de Clubes de 2025?', resposta: 'Chelsea', aceita: ['Blues'], dif: 35 }
  ],

  esportes: [
    { pergunta: 'Em qual circuito ingles foi disputado o primeiro GP da historia da F1, em 1950?', sub: 'f1', resposta: 'Silverstone', dif: 40 },
    { pergunta: 'Qual circuito italiano e chamado de Templo da Velocidade?', sub: 'f1', resposta: 'Monza', dif: 40 },
    { pergunta: 'Qual circuito japones tem o tracado em forma de oito?', sub: 'f1', resposta: 'Suzuka', dif: 45 },
    { pergunta: 'Qual circuito belga tem a famosa curva Eau Rouge?', sub: 'f1', resposta: 'Spa-Francorchamps', aceita: ['Spa'], dif: 45 },
    { pergunta: 'Qual piloto espanhol, filho de um campeao do Rally Dakar, saiu da Ferrari para a Williams?', sub: 'f1', resposta: 'Carlos Sainz', aceita: ['Sainz'], dif: 40 },
    { pergunta: 'Qual piloto australiano sorridente bebia champanhe no sapato no podio?', sub: 'f1', resposta: 'Daniel Ricciardo', aceita: ['Ricciardo'], dif: 40 },
    { pergunta: 'Qual piloto finlandes foi companheiro de Hamilton na Mercedes de 2017 a 2021?', sub: 'f1', resposta: 'Valtteri Bottas', aceita: ['Bottas'], dif: 45 },
    { pergunta: 'Qual piloto japones correu pela AlphaTauri e chegou a Red Bull?', sub: 'f1', resposta: 'Yuki Tsunoda', aceita: ['Tsunoda'], dif: 45 },
    { pergunta: 'Qual equipe verde da F1 tem Fernando Alonso e Lance Stroll?', sub: 'f1', resposta: 'Aston Martin', dif: 35 },
    { pergunta: 'Qual equipe americana estreou na F1 em 2016?', sub: 'f1', resposta: 'Haas', dif: 45 },
    { pergunta: 'Qual chefe austriaco comanda a equipe Mercedes na F1?', sub: 'f1', resposta: 'Toto Wolff', aceita: ['Wolff'], dif: 40 },
    { pergunta: 'Qual engenheiro britanico projetou carros campeoes pela Williams, McLaren e Red Bull?', sub: 'f1', resposta: 'Adrian Newey', aceita: ['Newey'], dif: 55 },
    { pergunta: 'Qual dirigente ingles comandou os negocios da F1 por quase 40 anos?', sub: 'f1', resposta: 'Bernie Ecclestone', aceita: ['Ecclestone'], dif: 50 },
    { pergunta: 'Qual jovem italiano substituiu Hamilton na Mercedes em 2025?', sub: 'f1', resposta: 'Kimi Antonelli', aceita: ['Andrea Kimi Antonelli', 'Antonelli'], dif: 45 },
    { pergunta: 'Qual piloto canadense, filho do dono da equipe, corre pela Aston Martin?', sub: 'f1', resposta: 'Lance Stroll', aceita: ['Stroll'], dif: 40 },
    { pergunta: 'Qual trofeu e entregue ao campeao da NBA?', sub: 'nba', resposta: 'Larry O\'Brien', aceita: ['Trofeu Larry O\'Brien', 'Larry OBrien'], dif: 50 },
    { pergunta: 'Qual jogador grego do Milwaukee Bucks e chamado de Greek Freak?', sub: 'nba', resposta: 'Giannis Antetokounmpo', aceita: ['Giannis'], dif: 35 },
    { pergunta: 'Qual ala-armador do Miami Heat ganhou tres titulos e era chamado de Flash?', sub: 'nba', resposta: 'Dwyane Wade', aceita: ['Wade', 'Dwayne Wade'], dif: 40 },
    { pergunta: 'Qual jogador dos Warriors forma os Splash Brothers com Stephen Curry?', sub: 'nba', resposta: 'Klay Thompson', aceita: ['Klay'], dif: 35 },
    { pergunta: 'Qual pivo brasileiro de cabelo cacheado jogou anos no Cleveland Cavaliers?', sub: 'nba', resposta: 'Anderson Varejao', aceita: ['Varejao'], dif: 40 },
    { pergunta: 'Qual brasileiro ganhou o premio de sexto homem da NBA pelo Phoenix Suns em 2007?', sub: 'nba', resposta: 'Leandrinho', aceita: ['Leandro Barbosa'], dif: 50 },
    { pergunta: 'Qual pivo brasileiro foi campeao da NBA com o San Antonio Spurs em 2014?', sub: 'nba', resposta: 'Tiago Splitter', aceita: ['Splitter'], dif: 50 },
    { pergunta: 'Qual pivo brasileiro do Denver Nuggets tinha Maybyner como primeiro nome?', sub: 'nba', resposta: 'Nene', aceita: ['Nene Hilario'], dif: 50 },
    { pergunta: 'Qual jogador de cabelo colorido do Chicago Bulls era o rei dos rebotes?', sub: 'nba', resposta: 'Dennis Rodman', aceita: ['Rodman'], dif: 35 },
    { pergunta: 'Qual pivo nigeriano ganhou dois titulos com o Houston Rockets nos anos 90?', sub: 'nba', resposta: 'Hakeem Olajuwon', aceita: ['Olajuwon'], dif: 55 },
    { pergunta: 'Qual pivo marcou 100 pontos num unico jogo da NBA, em 1962?', sub: 'nba', resposta: 'Wilt Chamberlain', aceita: ['Chamberlain'], dif: 50 },
    { pergunta: 'Qual pivo do Boston Celtics ganhou 11 titulos da NBA?', sub: 'nba', resposta: 'Bill Russell', dif: 50 },
    { pergunta: 'Como ficou conhecida a selecao americana de basquete das Olimpiadas de 1992?', sub: 'nba', resposta: 'Dream Team', aceita: ['Time dos Sonhos'], dif: 25 },
    { pergunta: 'Qual filme de 1996 junta Michael Jordan e o Pernalonga numa partida de basquete?', sub: 'nba', resposta: 'Space Jam', dif: 20 },
    { pergunta: 'Qual armador do Memphis Grizzlies ficou famoso pelas enterradas acrobaticas?', sub: 'nba', resposta: 'Ja Morant', aceita: ['Morant'], dif: 45 }
  ],

  lol: [
    { pergunta: 'Em qual regiao de Runeterra vivem Yasuo, Ahri e Irelia?', resposta: 'Ionia', dif: 30 },
    { pergunta: 'Qual cidade do progresso de Runeterra fica em cima de Zaun?', resposta: 'Piltover', dif: 30 },
    { pergunta: 'Qual regiao gelada de Runeterra e a terra de Ashe e Braum?', resposta: 'Freljord', dif: 40 },
    { pergunta: 'Qual imperio do deserto de Runeterra e de Azir e Nasus?', resposta: 'Shurima', dif: 40 },
    { pergunta: 'Qual cidade portuaria de piratas e de Miss Fortune e Gangplank?', resposta: 'Aguas de Sentina', aceita: ['Bilgewater'], dif: 45 },
    { pergunta: 'Qual jogador sul-coreano da T1 e considerado o maior de todos os tempos?', resposta: 'Faker', dif: 20 },
    { pergunta: 'Como se chama abater os cinco inimigos em sequencia, sozinho?', resposta: 'Pentakill', aceita: ['Penta'], dif: 20 },
    { pergunta: 'Como se chama a emboscada do cacador numa rota, vindo da selva?', resposta: 'Gank', dif: 25 },
    { pergunta: 'Como se chama abater tropas para ganhar ouro?', resposta: 'Farm', aceita: ['Farmar', 'Last hit'], dif: 25 },
    { pergunta: 'Qual feitico de invocador leva o campeao de volta a rota, ate uma torre aliada?', resposta: 'Teleporte', aceita: ['TP'], dif: 30 },
    { pergunta: 'Qual feitico de invocador recupera vida do campeao e de um aliado proximo?', resposta: 'Curar', aceita: ['Cura', 'Heal'], dif: 30 }
  ],

  bandeiras: [
    { pergunta: 'Qual pais do Himalaia tem um dragao branco na bandeira?', resposta: 'Butao', dif: 50 },
    { pergunta: 'Qual pais tem o mapa da propria ilha desenhado na bandeira, no Mediterraneo?', resposta: 'Chipre', dif: 50 },
    { pergunta: 'Qual pais tem duas chaves cruzadas e uma tiara na bandeira amarela e branca?', resposta: 'Vaticano', dif: 40 },
    { pergunta: 'Qual principado tem a bandeira vermelha em cima e branca embaixo, igual a da Indonesia?', resposta: 'Monaco', dif: 45 },
    { pergunta: 'Qual pais insular tem uma cruz de condecoracao no canto da bandeira branca e vermelha?', resposta: 'Malta', dif: 50 },
    { pergunta: 'Qual pais dos Balcas tem o mapa dourado do territorio e seis estrelas na bandeira azul?', resposta: 'Kosovo', dif: 55 }
  ],

  cinema: [
    { pergunta: 'Quais dois ratos de laboratorio tentam dominar o mundo toda noite?', sub: 'desenhos', resposta: 'Pink e Cerebro', dif: 30 },
    { pergunta: 'Qual urso do parque Jellystone vive roubando cestas de piquenique?', sub: 'desenhos', resposta: 'Ze Colmeia', dif: 30 },
    { pergunta: 'Qual vilao de caveira azul e o inimigo de He-Man?', sub: 'desenhos', resposta: 'Esqueleto', aceita: ['Skeletor'], dif: 30 },
    { pergunta: 'Qual cachorro trapalhao da Disney e amigo do Mickey?', sub: 'desenhos', resposta: 'Pateta', dif: 15 },
    { pergunta: 'Quais dois esquilos da Disney vivem aprontando com o Pato Donald?', sub: 'desenhos', resposta: 'Tico e Teco', dif: 20 }
  ],

  marcas: [
    { pergunta: 'Qual montadora italiana fabricou o Uno e o Palio?', sub: 'carros', resposta: 'Fiat', dif: 15 },
    { pergunta: 'Qual montadora americana criou o Modelo T, o primeiro carro feito em linha de montagem?', sub: 'carros', resposta: 'Ford', dif: 20 },
    { pergunta: 'Qual montadora alema tem o logo azul e branco que lembra uma helice?', sub: 'carros', resposta: 'BMW', dif: 20 },
    { pergunta: 'Qual montadora alema fabrica o esportivo 911?', sub: 'carros', resposta: 'Porsche', dif: 25 },
    { pergunta: 'Qual montadora italiana de superesportivos tem um touro bravo no logo?', sub: 'carros', resposta: 'Lamborghini', dif: 20 },
    { pergunta: 'Qual montadora chinesa de carros eletricos abriu fabrica em Camacari, na Bahia?', sub: 'carros', resposta: 'BYD', dif: 35 },
    { pergunta: 'Qual montadora sueca e famosa pela seguranca dos carros?', sub: 'carros', resposta: 'Volvo', dif: 25 },
    { pergunta: 'Qual marca americana de jipes fabrica o Renegade em Pernambuco?', sub: 'carros', resposta: 'Jeep', dif: 25 },
    { pergunta: 'Qual montadora coreana fabrica o Sportage?', sub: 'carros', resposta: 'Kia', dif: 30 },
    { pergunta: 'Qual montadora japonesa fabrica o Kicks e o esportivo GT-R?', sub: 'carros', resposta: 'Nissan', dif: 30 },
    { pergunta: 'Qual montadora brasileira dos anos 80 fabricou o pequeno BR-800?', sub: 'carros', resposta: 'Gurgel', dif: 55 },
    { pergunta: 'Qual marca brasileira de sandalias de plastico tem cheiro de chiclete?', sub: 'moda', resposta: 'Melissa', dif: 30 },
    { pergunta: 'Qual rede espanhola de moda pertence ao grupo Inditex?', sub: 'moda', resposta: 'Zara', dif: 30 },
    { pergunta: 'Qual rede de lojas de roupa nasceu em Porto Alegre e e uma das maiores do Brasil?', sub: 'moda', resposta: 'Renner', aceita: ['Lojas Renner'], dif: 30 },
    { pergunta: 'Qual marca catarinense de camisetas basicas tem dois peixinhos no logo?', sub: 'moda', resposta: 'Hering', dif: 35 },
    { pergunta: 'Qual marca italiana de luxo tem uma plaquinha triangular de metal nas bolsas?', sub: 'moda', resposta: 'Prada', dif: 40 },
    { pergunta: 'Qual marca francesa de luxo e famosa pela bolsa Birkin?', sub: 'moda', resposta: 'Hermes', dif: 45 },
    { pergunta: 'Qual achocolatado da Nestle e o rival historico do Toddy?', sub: 'comida', resposta: 'Nescau', dif: 15 },
    { pergunta: 'Qual achocolatado rival do Nescau pertence a PepsiCo?', sub: 'comida', resposta: 'Toddy', dif: 20 },
    { pergunta: 'Qual marca brasileira de chocolates tem milhares de lojas e vende ovos de Pascoa por todo o pais?', sub: 'comida', resposta: 'Cacau Show', dif: 20 },
    { pergunta: 'Qual fabrica capixaba de chocolates faz o Serenata de Amor e o Baton?', sub: 'comida', resposta: 'Garoto', dif: 25 },
    { pergunta: 'Qual marca de chocolates fabrica o Diamante Negro e o Sonho de Valsa?', sub: 'comida', resposta: 'Lacta', dif: 30 },
    { pergunta: 'Qual marca de panetones e biscoitos tem nome de familia italiana e sede em Sao Paulo?', sub: 'comida', resposta: 'Bauducco', dif: 30 },
    { pergunta: 'Qual marca de frios e congelados tem o mascote Lequetreque?', sub: 'comida', resposta: 'Sadia', dif: 30 },
    { pergunta: 'Qual cerveja holandesa tem garrafa verde e estrela vermelha?', sub: 'comida', resposta: 'Heineken', dif: 20 },
    { pergunta: 'Qual refrigerante de laranja pertence a Coca-Cola?', sub: 'comida', resposta: 'Fanta', dif: 15 },
    { pergunta: 'Qual refrigerante de limao da Coca-Cola tem a lata verde?', sub: 'comida', resposta: 'Sprite', dif: 15 },
    { pergunta: 'Qual marca brasileira de cosmeticos vende de porta em porta e tem a linha Ekos?', sub: 'outras', resposta: 'Natura', dif: 25 },
    { pergunta: 'Qual marca de perfumes nascida em Curitiba tem o Malbec?', sub: 'outras', resposta: 'O Boticario', aceita: ['Boticario'], dif: 25 },
    { pergunta: 'Qual banco digital de Belo Horizonte tem a cor laranja?', sub: 'outras', resposta: 'Inter', aceita: ['Banco Inter'], dif: 30 },
    { pergunta: 'Qual operadora de celular de origem italiana tem a cor azul no Brasil?', sub: 'outras', resposta: 'TIM', dif: 25 },
    { pergunta: 'Qual companhia aerea brasileira laranja foi fundada em 2001?', sub: 'outras', resposta: 'Gol', aceita: ['Gol Linhas Aereas'], dif: 25 },
    { pergunta: 'Qual companhia aerea nasceu da fusao da TAM com a chilena LAN?', sub: 'outras', resposta: 'LATAM', dif: 25 }
  ]
};

/* Academia, musculacao e CrossFit. */
const ACADEMIA = {
  esportes: [
    { pergunta: 'Como se chama o local onde se treina CrossFit?', resposta: 'Box', dif: 30 },
    { pergunta: 'Qual sigla do CrossFit significa "treino do dia"?', resposta: 'WOD', aceita: ['Workout of the Day'], dif: 35 },
    { pergunta: 'Qual sigla de treino significa fazer o maximo de rodadas possivel num tempo fixo?', resposta: 'AMRAP', dif: 50 },
    { pergunta: 'Qual sigla de treino manda fazer um exercicio no comeco de cada minuto?', resposta: 'EMOM', dif: 50 },
    { pergunta: 'Qual metodo de treino alterna 20 segundos de esforco maximo e 10 de descanso?', resposta: 'Tabata', dif: 40 },
    { pergunta: 'Qual exercicio junta agachamento, flexao no chao e salto, odiado por quase todo mundo?', resposta: 'Burpee', dif: 20 },
    { pergunta: 'Qual WOD em homenagem a um militar tem corrida de 1 milha, 100 barras, 200 flexoes e 300 agachamentos?', resposta: 'Murph', dif: 55 },
    { pergunta: 'Qual WOD classico do CrossFit tem thrusters e barras em 21, 15 e 9 repeticoes?', resposta: 'Fran', dif: 60 },
    { pergunta: 'Qual competicao anual define o atleta mais preparado do mundo no CrossFit?', resposta: 'CrossFit Games', aceita: ['Games'], dif: 35 },
    { pergunta: 'Qual americano venceu cinco vezes seguidas os CrossFit Games, de 2016 a 2020?', resposta: 'Mat Fraser', aceita: ['Fraser', 'Mathew Fraser'], dif: 55 },
    { pergunta: 'Qual australiana venceu seis vezes seguidas os CrossFit Games entre as mulheres?', resposta: 'Tia-Clair Toomey', aceita: ['Tia Toomey', 'Toomey'], dif: 60 },
    { pergunta: 'Qual americano fundou o CrossFit no ano 2000?', resposta: 'Greg Glassman', aceita: ['Glassman'], dif: 60 },
    { pergunta: 'Qual movimento de CrossFit passa o corpo por cima da barra ou das argolas depois da puxada?', resposta: 'Muscle-up', aceita: ['Muscle up'], dif: 45 },
    { pergunta: 'Qual exercicio junta agachamento frontal e desenvolvimento com a barra num so movimento?', resposta: 'Thruster', dif: 55 },
    { pergunta: 'Como se chama pular corda passando ela duas vezes por baixo dos pes num salto so?', resposta: 'Double under', aceita: ['Double unders', 'Pulo duplo'], dif: 45 },
    { pergunta: 'Qual bola pesada e arremessada contra um alvo na parede depois do agachamento?', resposta: 'Wall ball', aceita: ['Wallball'], dif: 40 },
    { pergunta: 'Qual peso de ferro com alca, parecido com uma bola de canhao, e usado no swing?', resposta: 'Kettlebell', dif: 25 },
    { pergunta: 'Como se chama o levantamento que tira a barra do chao ate a cintura, com as costas retas?', resposta: 'Levantamento terra', aceita: ['Terra', 'Deadlift'], dif: 30 },
    { pergunta: 'Qual exercicio deitado no banco empurra a barra para cima trabalhando o peitoral?', resposta: 'Supino', aceita: ['Supino reto'], dif: 15 },
    { pergunta: 'Qual exercicio de perna e chamado de rei dos exercicios, com a barra nas costas?', resposta: 'Agachamento', aceita: ['Agachamento livre'], dif: 20 },
    { pergunta: 'Qual exercicio sobe o quadril com as costas apoiadas no banco para trabalhar o gluteo?', resposta: 'Elevacao pelvica', aceita: ['Hip thrust'], dif: 35 },
    { pergunta: 'Qual exercicio isometrico mantem o corpo reto apoiado nos antebracos?', resposta: 'Prancha', aceita: ['Prancha abdominal'], dif: 15 },
    { pergunta: 'Qual maquina de perna empurra uma plataforma com os pes, sentado e inclinado?', resposta: 'Leg press', dif: 20 },
    { pergunta: 'Qual exercicio de braco dobra o cotovelo segurando a barra com as palmas para cima?', resposta: 'Rosca direta', aceita: ['Rosca'], dif: 25 },
    { pergunta: 'Qual musculo da parte de tras do braco tem tres cabecas?', resposta: 'Triceps', dif: 20 },
    { pergunta: 'Qual musculo da frente da coxa tem quatro cabecas?', resposta: 'Quadriceps', dif: 25 },
    { pergunta: 'Qual suplemento e feito da proteina do soro do leite?', resposta: 'Whey protein', aceita: ['Whey'], dif: 15 },
    { pergunta: 'Qual suplemento muito estudado aumenta forca e e tomado em doses de 3 a 5 gramas por dia?', resposta: 'Creatina', dif: 25 },
    { pergunta: 'Como se chama o crescimento do musculo, objetivo de quem faz musculacao?', resposta: 'Hipertrofia', dif: 25 },
    { pergunta: 'Como se chama a dor muscular que aparece um ou dois dias depois do treino?', resposta: 'Dor tardia', aceita: ['DOMS', 'Dor muscular tardia'], dif: 45 },
    { pergunta: 'Como se chama o dia de treino de perna, famoso por ser pulado?', resposta: 'Leg day', aceita: ['Dia de perna'], dif: 15 },
    { pergunta: 'Qual fisiculturista austriaco foi sete vezes Mr. Olympia e virou o Exterminador do Futuro?', resposta: 'Arnold Schwarzenegger', aceita: ['Arnold', 'Schwarzenegger'], dif: 20 },
    { pergunta: 'Qual campeonato de fisiculturismo da o titulo de melhor do mundo, vencido oito vezes por Ronnie Coleman?', resposta: 'Mr. Olympia', aceita: ['Mr Olympia', 'Olympia'], dif: 40 },
    { pergunta: 'Qual fisiculturista canadense foi seis vezes campeao da categoria Classic Physique no Mr. Olympia?', resposta: 'Chris Bumstead', aceita: ['CBum', 'Bumstead'], dif: 45 }
  ]
};

for (const leva of [LEVA_2, LEVA_3, ACADEMIA]) {
  for (const [categoria, perguntas] of Object.entries(leva)) {
    QUESTOES_NOVAS[categoria] = [...(QUESTOES_NOVAS[categoria] || []), ...perguntas];
  }
}

module.exports = { QUESTOES_NOVAS };
