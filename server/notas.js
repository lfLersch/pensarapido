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
    versao: '1.31',
    data: '2026-10-06',
    titulo: 'Bagunca: todos os modos num so',
    itens: [
      'Modo novo, Bagunca: 3 perguntas do Modo Tempo e um sorteio escolhe o modo da rodada seguinte. Depois volta o Modo Tempo, e assim ate alguem bater a meta.',
      'Quem cria a sala escolhe quantas perguntas do Modo Tempo vem antes de cada sorteio (de 0 a 6) e quais modos entram nele.',
      'Presente Grego e Dando dicas so entram no sorteio com 4 ou mais na sala, e as equipes saem sorteadas na hora.',
      'O mesmo modo nunca sai duas vezes seguidas, e a tela do sorteio mostra a regra do modo que saiu.'
    ]
  },
  {
    versao: '1.30',
    data: '2026-10-04',
    titulo: 'Pagode, samba e forro',
    itens: [
      'Ouvir musicas ganhou 26 musicas e chegou a 258.',
      'Pagode e samba: Zeca Pagodinho, Revelacao, Exaltasamba, Turma do Pagode, Raca Negra, Mumuzinho, Molejo, Menos e Mais e Seu Jorge.',
      'Forro: Falamansa e Esperando na Janela. E mais Natiruts, Gonzaguinha e Boate Azul.',
      'No Qual e a musica, pagode e forro tem opcoes do proprio estilo.'
    ]
  },
  {
    versao: '1.29',
    data: '2026-10-04',
    titulo: '85 musicas novas: 232 para ouvir',
    itens: [
      'Ouvir musicas foi de 147 para 232 musicas.',
      'Rock e pop: Queen, Nirvana, Bon Jovi, Guns N\' Roses, Eagles, a-ha, Cyndi Lauper, Red Hot Chili Peppers e mais.',
      'Nacional: Legiao Urbana, Charlie Brown Jr, Skank, Paralamas, Titas, Mamonas, Engenheiros, Armandinho, Papas da Lingua, Fresno, Tim Maia e Roberto Carlos.',
      'Sertanejo: Marilia Mendonca, Henrique e Juliano, Ze Neto e Cristiano, Chitaozinho e Xororo, Michel Telo, Simone Mendes e mais.',
      'As musicas que vieram de clipe ou de show perderam o que nao era musica: a cena antes da musica, a conversa e os aplausos do fim.'
    ]
  },
  {
    versao: '1.28',
    data: '2026-10-04',
    titulo: 'Corrida musical, Qual e a musica e 147 musicas',
    itens: [
      'Modo novo, Corrida musical: toca um pedaco de uma musica e o primeiro que acertar no chat leva os pontos. A musica para assim que alguem acerta.',
      'Modo novo, Qual e a musica: toca um pedaco e aparecem 4 opcoes. Um clique por musica, e quanto mais rapido, mais pontos. A certa so aparece no fim da rodada.',
      'Nos dois modos a partida pode acabar pela meta de pontos ou depois de 10, 15, 20 ou 30 musicas.',
      'A musica nao toca mais sempre do comeco: cada rodada sorteia um pedaco diferente, e todo mundo ouve o mesmo pedaco ao mesmo tempo.',
      'A sala escolhe por quanto tempo a musica toca, de 15 a 60 segundos. O padrao e 30.',
      'Ouvir musicas foi de 93 para 147 musicas, com bastante rap e funk nacional, Comunidade Nin-Jitsu, Nenhum de Nos, Cidadao Quem e Tim Maia.'
    ]
  },
  {
    versao: '1.27',
    data: '2026-10-04',
    titulo: '43 conquistas, e agora secretas',
    itens: [
      'As conquistas foram de 15 para 43: tem para quem e rapido, para quem acerta no sufoco, para quem joga sem errar e para quem vira o jogo.',
      'Varias vem em degraus: a primeira vez vale uma, depois 10 vezes, 50 vezes, e por ai vai.',
      'Agora elas sao secretas: no perfil aparece so um cadeado, e o que precisa fazer so aparece depois que a conquista sai.',
      'O que voce ja tinha conquistado continua la.'
    ]
  },
  {
    versao: '1.26',
    data: '2026-10-03',
    titulo: 'Estatisticas das perguntas',
    itens: [
      'O saguao ganhou o botao Estatisticas das perguntas: para cada pergunta, quantas vezes ela ja caiu, quanto acertam e quanto tempo levam, em media, para acertar.',
      'Da para buscar pelo texto da pergunta, filtrar por categoria ou parte dela e ordenar pelas mais feitas, mais ou menos acertadas, acerto mais rapido ou mais lento, e dificuldade.',
      'Em cima ficam os totais do que esta filtrado. Pergunta de imagem mostra a imagem, e a de musica tem um botao para ouvir o trecho.',
      'As respostas nao aparecem, para a aba nao virar cola no meio da partida.'
    ]
  },
  {
    versao: '1.25',
    data: '2026-10-01',
    titulo: 'Pausar o jogo',
    itens: [
      'O lider da sala agora tem um botao para pausar o jogo, no topo da pergunta e na tela da categoria.',
      'Pausado, os relogios param onde estavam e a tela "Jogo pausado" cobre a pergunta. Ninguem responde nem vota ate continuar.',
      'Quando o lider continua, o relogio segue de onde parou, e o tempo parado nao conta na pontuacao.'
    ]
  },
  {
    versao: '1.24',
    data: '2026-10-01',
    titulo: 'Quem da nome: leis, efeitos e sindromes',
    itens: [
      'Historia e Cultura ganhou a parte Quem da nome, com 94 perguntas sobre o nome por tras de leis, efeitos, paradoxos, sindromes e palavras.',
      'Leis de Murphy, de Gerson e de Parkinson, Lei Maria da Penha e Lei Rouanet. Efeitos Mandela, Streisand, Dunning-Kruger, Doppler e Tostines.',
      'Navalha de Ockham, gato de Schrodinger e problema de Monty Hall. Sindromes de Estocolmo e de Gabriela. E de onde vem o nome do sanduiche, da guilhotina e do boicote.',
      'O banco foi de 3854 para 3948 perguntas.'
    ]
  },
  {
    versao: '1.23',
    data: '2026-10-01',
    titulo: 'Ciencia ganha Botanica, Biologia e Quimica',
    itens: [
      'Mais 115 perguntas de ciencia, e a categoria agora tem tres partes para escolher na sala: Botanica, Biologia e Quimica.',
      'Botanica: como se classificam o morango (pseudofruto) e o abacaxi (infrutescencia), os tipos de fruto, a familia da laranjeira, a das orquideas, e as partes da flor e da planta.',
      'Biologia: reino, filo, classe, ordem, familia, genero e especie. Do cachorro aos primatas e aos bovinos, mais os filos dos animais e os reinos.',
      'Quimica: as familias da tabela periodica (o oxigenio e um calcogenio; os gases nobres sao outra familia), metais e ametais, misturas e pH.',
      'Na Escalada entram as listas de gases nobres, halogenios, metais alcalinos, frutas citricas, primatas e os cinco reinos.',
      'O banco foi de 3739 para 3854 perguntas, e Ciencia de 109 para 224.'
    ]
  },
  {
    versao: '1.22',
    data: '2026-10-01',
    titulo: 'Enter envia no celular',
    itens: [
      'No celular, o Enter do teclado agora envia a resposta num toque so, mesmo com o texto preditivo ligado. O teclado mostra a tecla Enviar.',
      'Tocar no botao de enviar nao fecha mais o teclado: ele fica aberto para a proxima resposta.'
    ]
  },
  {
    versao: '1.21',
    data: '2026-10-01',
    titulo: 'A imagem aparece antes do relogio comecar',
    itens: [
      'Pergunta com imagem (bandeira, foto, logo) agora baixa a imagem enquanto a categoria esta na tela.',
      'O relogio so comeca quando a imagem ja esta aparecendo para todo mundo: ninguem mais perde segundos olhando um quadro vazio.',
      'Se alguem ainda estiver baixando, a tela da categoria avisa quantos ja estao prontos. A sala espera no maximo 4 segundos a mais.'
    ]
  },
  {
    versao: '1.20',
    data: '2026-09-29',
    titulo: 'Painel de desempenho, e a sua nota agora mexe na dificuldade',
    itens: [
      'O perfil ganhou um painel: sua nota geral e a de cada categoria, com a variacao da ultima partida, a evolucao partida a partida e o seu acerto em cada faixa de dificuldade ao lado do que a sua nota esperava.',
      'Os chips em cima do painel trocam entre Geral e cada categoria. Clicar numa categoria da lista tambem abre ela no painel.',
      'A lista por categoria marca o seu ponto forte e o que pede treino, e mostra quanto cada nota andou na ultima partida.',
      'A dificuldade das perguntas agora olha quem jogou: quando a sala erra o que as notas dela prometiam acertar, a pergunta sobe; quando acerta o que era dado como perdido, desce. Errar entre craques pesa mais que errar entre novatos.',
      'Quem ainda esta com nota provisoria pesa pouco nessa conta, e quem nunca jogou nao pesa nada.'
    ]
  },
  {
    versao: '1.19',
    data: '2026-09-29',
    titulo: 'Mais 216 perguntas de series e desenhos',
    itens: [
      'Perguntas de dentro das series, no estilo dos quizzes de fa: qual e o nome do irmao do Chris, quem e o "Eu" de Eu, a Patroa e as Criancas, quantos meses de aluguel o Seu Madruga deve.',
      'Entraram Chaves, Chapolin, Um Maluco no Pedaco, Kenan e Kel, Hannah Montana, Dois Homens e Meio, Malcolm, A Grande Familia, Castelo Ra-Tim-Bum, Stranger Things, Wandinha, Round 6 e mais.',
      'Todo Mundo Odeia o Chris, Eu, a Patroa e as Criancas, Friends, Game of Thrones e La Casa de Papel ganharam perguntas novas.',
      'Desenhos agora tem perguntas sobre Os Simpsons, Bob Esponja, Scooby-Doo, Turma da Monica, Os Flintstones, Hora de Aventura e outros, alem das imagens.',
      'O banco foi de 3523 para 3739 perguntas, e Cinema & TV passou de 1136 para 1352.'
    ]
  },
  {
    versao: '1.18',
    data: '2026-09-26',
    titulo: 'Filmes em emojis e 246 perguntas de cinema',
    itens: [
      'Cinema & TV ganhou a parte Emojis: 81 charadas em que os emojis contam um filme, como 🦁👑🌅, ou formam o nome de um ator.',
      'Os emojis da charada aparecem grandes, numa linha so deles, embaixo da pergunta.',
      'Mais 165 perguntas de filmes: personagens, atores, diretores e frases famosas, de Frozen e Moana a Matrix, Star Wars e O Auto da Compadecida.',
      'O banco foi de 3277 para 3523 perguntas, e Cinema & TV passou de 890 para 1136.'
    ]
  },
  {
    versao: '1.17',
    data: '2026-09-26',
    titulo: 'Sua nota em cada categoria',
    itens: [
      'O perfil ganhou "Desempenho por categoria": uma nota de 0 a 100 em cada categoria que voce joga, com os acertos e a dificuldade media das perguntas.',
      'A nota leva em conta a dificuldade. Acertar pergunta dificil sobe muito e acertar facil sobe pouco; errar facil derruba muito e errar dificil quase nao pesa.',
      'Nota 70 quer dizer que, numa pergunta de dificuldade 70, a sua chance e meio a meio. Nas primeiras 5 rodadas de uma categoria a nota aparece como provisoria.',
      'Contam o Modo Tempo e a Escalada, em que todo mundo responde a mesma pergunta. Quem entra com a rodada no ar nao leva erro por ela.',
      'O login com Google agora aparece logo no saguao, com um "Agora nao" para quem prefere jogar sem conta. Sem login continua valendo tudo, so que o perfil fica neste navegador.'
    ]
  },
  {
    versao: '1.16',
    data: '2026-09-26',
    titulo: 'Conquistas, perfil e partida que esquenta',
    itens: [
      'A partida agora comeca pelas perguntas mais faceis e vai endurecendo conforme o lider chega perto da meta. A reta final e das mais dificeis.',
      'A comparacao e dentro de cada categoria: Rap tambem tem suas faceis no comeco e suas dificeis no fim.',
      'Novo botao "Meu perfil e conquistas" no saguao: partidas, vitorias, acertos e a maior sequencia de acertos, somando todas as partidas.',
      'Sao 15 conquistas, de Estreia e Primeira vitoria ate Relampago (acertar em menos de 2 segundos), Genio e Imparavel. Quando uma sai, aparece na hora e a sala fica sabendo.',
      'Sem login, o perfil e deste navegador: trocar de nickname nao perde nada, mas outro navegador comeca do zero.',
      'Com o botao "Fazer login com o Google" no perfil, ele passa a valer em qualquer aparelho. O que voce ja tinha jogado no navegador vai junto para a conta.',
      'Do Google, o jogo guarda so o seu primeiro nome e um numero que identifica a conta. E-mail e foto ficam de fora.',
      'O perfil ainda mostra quem mais venceu entre todos os jogadores.',
      'O que o jogo aprende passou a ficar guardado num banco de dados: a dificuldade de cada pergunta, o rodizio e os perfis nao zeram mais a cada atualizacao do site.'
    ]
  },
  {
    versao: '1.15',
    data: '2026-09-20',
    titulo: 'Mais 198 perguntas e leilao com mais tempo',
    itens: [
      'O banco foi de 2877 para 3075 perguntas: Historia e Cultura (192 para 252), Cinema & TV (635 para 688), Geografia (215 para 260) e Mainstream (123 para 163).',
      'Historia e Cultura ganhou muita cultura mesmo: compositores, pintores, escritores, o Louvre, o Teatro Amazonas, tango, forro, capoeira e o Quebra-Nozes.',
      'Geografia ganhou capitais de estado brasileiras, capitais do mundo, moedas, rios, vulcoes e biomas.',
      'Cinema ganhou classicos, diretores, atores e animacoes que faltavam — de Casablanca e Cidadao Kane a Barbie e Oppenheimer.',
      'O leilao ficou menos apertado: 9 segundos por lance, no lugar de 6. E quem ABRE o leilao tem 12, porque decide sem lance na mesa e ainda esta lendo a pergunta.',
      'O cartao do jogador na sala de espera parou de vazar por cima da equipe do lado quando o nome era comprido.'
    ]
  },
  {
    versao: '1.14',
    data: '2026-09-20',
    titulo: 'Menos pergunta repetida, e 177 perguntas novas',
    itens: [
      'O servidor passou a contar quantas vezes cada pergunta ja entrou, e usa isso para sortear: quem ja saiu perde chance ate as outras alcancarem.',
      'Quando todas estiverem empatadas, todas voltam a ter a mesma chance — e o que pesa e a distancia para a menos usada, nunca o numero absoluto.',
      'Nao e proibicao, e rodizio: a pergunta repetida ainda pode sair, so nao na mesma frequencia de quem nunca saiu.',
      'Antes, dentro de uma partida nada se repetia, mas a partida seguinte comecava de uma fila embaralhada do zero — e era ai que as mesmas perguntas voltavam.',
      'O banco foi de 2700 para 2877 perguntas, engordando as categorias mais magras: Rap (27 para 62), Animais (63 para 98), Comidas (67 para 99), Games (79 para 119) e Mainstream (88 para 123).',
      'Sobrenome de uma letra deixou de virar resposta aceita: "Cardi B" nao aceita mais so "B".'
    ]
  },
  {
    versao: '1.13',
    data: '2026-09-20',
    titulo: 'Caiu? Volta com os pontos',
    itens: [
      'Da para entrar na sala a qualquer momento, inclusive no meio de uma rodada — partida rolando tambem aparece na lista do saguao.',
      'Quem cai e volta com o MESMO nickname volta com tudo que era dele: os pontos, os acertos, o icone e a equipe. Maiuscula e acento nao atrapalham.',
      'E a aba volta sozinha: se a conexao cair, ela entra de novo no lugar em que voce estava, sem ninguem digitar nada.',
      'Quem chega no meio de uma rodada comeca a valer na seguinte, com a tela avisando disso.',
      'Se todo mundo sair, a sala congela em vez de seguir jogando sozinha, e espera 10 minutos por alguem — o placar fica intacto.',
      'Sair pelo botao continua sendo de proposito, e quem o lider expulsa nao volta com os pontos de antes.'
    ]
  },
  {
    versao: '1.12',
    data: '2026-09-19',
    titulo: 'Equipes do tamanho que voce quiser',
    itens: [
      'Nos modos em equipe da para montar a sala como quiser: um + a direita abre outra equipe e um + embaixo faz caber mais gente em cada uma. Duas equipes de tres, tres de dois, tres de tres, quatro de tres.',
      'Sao ate seis equipes e ate seis pessoas em cada. So o lider mexe nos botoes, e so antes de a partida comecar.',
      'Enquanto ninguem mexe, a sala se arruma sozinha como sempre fez: o Presente Grego engorda as duas equipes e o Dando dicas abre duplas novas. O Dando dicas com sala impar agora tem saida — e so aumentar o tamanho e virar trio.',
      'Quem chega e nao cabe em equipe nenhuma aparece separado, e o saguao diz o que falta para a partida poder comecar.',
      'O modo Veni, Vidi, Vici agora se chama "1 eh bom 2 ok 3 eh demais", que e o que a pontuacao dele faz.',
      'Nesse modo as respostas travadas aparecem logo abaixo das dicas, com o nome de quem escreveu embaixo de cada uma.',
      'E elas abrem assim que a mesa inteira responde, sem esperar os 15 segundos acabarem. Em compensacao, so da para trocar de ideia enquanto alguem ainda nao respondeu.'
    ]
  },
  {
    versao: '1.11',
    data: '2026-09-19',
    titulo: 'Dez listas novas no Mais ou Menos Pontos',
    itens: [
      'As 99 musicas mais ouvidas da historia do Spotify e os 80 albuns mais vendidos de todos os tempos.',
      'Os 98 livros mais vendidos da historia, com os titulos em portugues: O Alquimista em terceiro, atras de Um Conto de Duas Cidades e O Pequeno Principe.',
      'As 100 empresas mais valiosas do mundo, por valor de mercado.',
      'As 50 contas mais seguidas do Instagram e os 20 brasileiros mais seguidos.',
      'Os maiores artilheiros da historia do futebol (82 nomes) e os 25 maiores da Selecao Brasileira.',
      'Os 25 jogadores com mais titulos na carreira — a ordem e aproximada, porque as fontes divergem no total de cada um.',
      'Os 27 estados do Brasil, do mais populoso ao menos.',
      'A lista de bilheteria passou de 30 para 49 filmes.',
      'O banco foi de 15 para 25 listas e de 765 para 1.390 itens.',
      'Nas listas de gente o sobrenome basta: "Marquezine" vale por Bruna Marquezine, desde que nao acerte outro nome da mesma lista.'
    ]
  },
  {
    versao: '1.10',
    data: '2026-09-19',
    titulo: 'Dando dicas: o leilao ao contrario',
    itens: [
      'Dando dicas: jogado em duplas, com leilao AO CONTRARIO. Uma metade de cada dupla ve a mesma palavra secreta e leiloa em quantas dicas faz a outra metade acertar.',
      'O lance desce: cobrir e prometer MENOS dicas que a mesa. Quem nao quer descer mais passa, e quando sobra uma dupla so, ela tem que entregar.',
      'Cada dica e uma palavra solta, e palavra que carrega a resposta nao vale — nem um pedaco dela. Quem adivinha chuta a vontade, e o chute errado vai para o chat para o parceiro saber por onde puxar.',
      'A pontuacao e por rodada, nao por dica: a rodada vale 10 pontos, custe uma dica ou dez. Se a palavra nao sair, os 10 vao para cada uma das outras duplas.',
      'As duplas aparecem na sala de espera uma de cada vez, e a partida so comeca com todas completas — sao de dois, e o lance de abertura tem teto de 10 dicas.'
    ]
  },
  {
    versao: '1.9',
    data: '2026-09-19',
    titulo: 'Palpite fechado no Veni e tres rodadas por lista',
    itens: [
      'Veni, Vidi, Vici: cada dica abre uma janela de 15 segundos. O que voce escrever fica guardado e ninguem ve — nem quem esta do seu lado.',
      'Quando o tempo fecha, todos os palpites aparecem de uma vez. Quem acertou leva o que a dica valia (10, 6 ou 3), igual para todos.',
      'Ninguem acertou? Entra a dica seguinte, valendo menos. Acertou alguem, a rodada acaba ali — a palavra ja esta na tela.',
      'Da para trocar de ideia quantas vezes quiser ate o tempo acabar: vale o ultimo palpite escrito.',
      'O banco de palavras passou de 107 para 283, com dicas do tipo "impressora, caneta, pintor" (tinta) e "aeroporto, boate, Formula 1" (pista).',
      'Duas cartas nunca abrem com a mesma primeira dica: na janela de 15 segundos e so ela que esta na tela, e cada um tem um palpite.',
      'Entraram as cartas de tres campos diferentes — um filme, um personagem historico, um livro: "Tio Patinhas, Aquiles e O Hobbit" levam a Pes; "O Iluminado, Paris Hilton e Psicose" levam a Hotel.',
      'As mesmas referencias viraram 34 perguntas do jogo normal, na mao contraria: a carta pede a palavra, e a pergunta pede o nome — "quem perde a mao da espada em Game of Thrones?" ou "que heroi grego so podia ser ferido num ponto do calcanhar?".',
      'Sobrenome continua bastando nessas: "Lannister", "Kahlo" e "Krueger" valem o nome inteiro, e agora isso tambem vale para pergunta que comeca com "Que detetive..." ou "Que pintora...".',
      'Mais ou Menos Pontos: a mesma lista agora rende tres rodadas seguidas, e o que ja foi dito continua fora nas seguintes.',
      'Nesse modo cada um responde uma vez por rodada: chutou fora da lista, gastou a vez. Repetir o que outro disse nao gasta.',
      'O topo da lista so e revelado na terceira rodada — antes disso o resultado mostra apenas o que a mesa acertou.',
      'As listas ficaram bem maiores: 15 listas, varias com 100 nomes — paises, cidades, rios, estadios, jogos, artistas do Spotify, canais do YouTube e mais.'
    ]
  },
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
