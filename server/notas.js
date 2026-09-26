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
