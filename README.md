# 🧠 PensaRápido

Jogo de perguntas e respostas multiplayer em tempo real. Não tem alternativas:
a resposta é **digitada no chat**, e o mesmo chat serve para conversar. Vence
quem chegar primeiro à pontuação combinada.

## Como rodar

```bash
npm install
npm start
```

Abra `http://localhost:3000`. Para jogar em vários aparelhos na mesma rede, use
o IP da máquina (ex.: `http://192.168.0.10:3000`).

## Como funciona

### Saguão

Todo jogador começa digitando um **nickname** e escolhendo entre:

- **Criar sala** — abre a tela de configuração; o botão *Criar sala* fica no fim dela.
- **Entrar na sala** — abre um campo para o código de 4 caracteres.

Embaixo, o saguão lista as **salas abertas** — quem criou, o modo, a lotação e
o código —, e dá para entrar com um clique, sem ninguém ditar o código. Entra
também a sala com **partida rolando**, marcada como tal: dá para entrar a
qualquer momento (ver [Cair e voltar](#cair-e-voltar)). A lista vem de
`GET /api/salas` e se atualiza sozinha a cada 4 segundos enquanto o saguão
está na tela.

### Cair e voltar

Wi-fi que pisca, aba que fecha sem querer, celular que dorme. Nada disso custa
a partida: **dá para entrar a qualquer momento**, inclusive no meio de uma
rodada, e **quem volta com o mesmo nickname volta com o que era dele** — os
pontos, os acertos, o ícone e a equipe.

O nickname é a identidade, comparado sem olhar maiúscula nem acento: *ANA* volta
como *Ana*. Quando alguém sai, a sala guarda a ficha dele; quando o mesmo nome
entra de novo, ela devolve tudo e apaga a ficha. Xará de quem está na sala
**agora** continua virando *Ana (2)* — o que não ganha sufixo é justamente o
nome de quem caiu, porque ele é a chave de volta.

**A aba volta sozinha.** Ela guarda o código da sala no navegador, e quando a
conexão cai e volta ela entra de novo com o mesmo nickname, sem ninguém digitar
nada. Sair pelo botão *Sair* é de propósito: aí a aba esquece a sala e não tenta
voltar.

**A carteirinha.** Junto com o nickname, a aba manda um número guardado no
navegador — só serve para dizer *"sou a mesma aba"*. Sem ela a volta rápida
quebrava: reconectar leva menos de um segundo, e o `disconnect` da conexão
velha chega bem depois. Atrás de um proxy a conexão cai para long-polling e o
servidor só nota a morte no *ping timeout*, uns 20 segundos — nessa janela a
cadeira ainda parece ocupada pela própria pessoa, e ela voltava como *Ana (2)*,
do zero, olhando para os próprios pontos no lugar de outra pessoa.

Com a carteirinha batendo, a cadeira é retomada na hora. Sem ela (aba nova,
outro aparelho), vale o nickname — e aí só quando o socket antigo já morreu de
fato. **Quem tem o mesmo nome, outra carteirinha e está online não é tocado:**
esse é outra pessoa e continua virando *Ana (2)*.

**Quem chega no meio de uma rodada começa a valer na seguinte.** A tela do jogo
abre com *"Você entra na próxima rodada"* e o chat trancado até lá. Nos modos em
equipe isso é obrigatório: mexer em quem está numa equipe com o leilão no ar
trocaria os papéis dela na metade, então o encaixe acontece entre uma rodada e
outra.

**Saiu todo mundo? A sala espera.** Em vez de seguir jogando para uma plateia
vazia, os relógios param e ela congela — em qualquer fase, inclusive na tela de
resultado. Quem voltar reacende a sala a partir da próxima rodada, com o placar
intacto. Passados **10 minutos** sem ninguém, a varredura recolhe a sala; a que
nunca chegou a jogar morre na hora, porque não tem placar para guardar.

Duas coisas **não** voltam. Quem foi **expulso** pelo líder não volta com os
pontos de antes (senão o botão do líder não serviria para nada), e a **coroa**
não é devolvida: se o líder cai, o posto passa para quem ficou e fica com ele.

No rodapé fica o link **Novidades**, com a versão que está no ar ao lado. Ele
abre a lista de notas de versão, da mais nova para a mais antiga — o que mudou
em cada leva que foi publicada.

As notas ficam em [`server/notas.js`](server/notas.js) e viajam junto com
`GET /api/config`. Publicou uma leva? Acrescente uma entrada **no topo** da
lista, com `versao`, `data` (ano-mês-dia), `titulo` e os `itens` em frases
curtas, sem jargão de código — `testes/notas.test.js` cobra o formato, a ordem
e que a versão do topo seja a do jogo.

### Configuração (só quem cria)

| Ajuste | Opções |
| --- | --- |
| Categorias | Bandeiras, Geografia, Matemática, Esportes (com a parte **Fórmula 1**), **Futebol**, Anime (com a parte **Naruto**), Música, **Ouvir músicas** (toca a música), Cinema & TV, História (com as partes Mitologia e **Quem dá nome**), **Ciência** (com as partes Botânica, Biologia e Química), Games, **Mainstream**, **Marcas** |
| Tipo de jogo | **Modo Tempo**, **Escalada**, **Carrossel** (visível ou às cegas), **1 é bom 2 ok 3 é demais**, **Mais ou Menos Pontos**, **Presente Grego**, **Leilão Geral**, **Dando dicas**, **Corrida musical**, **Qual é a música** ou **Bagunça**, todos num só (Equipes aparece como *em breve*) |
| Dificuldade das perguntas | só no Modo Tempo: uma faixa de **0 a 100** (padrão, *Normal*), que dá o título da sala — ver [Faixa de dificuldade](#faixa-de-dificuldade-modo-tempo) |
| Bagunça | só nela: quantas perguntas do Modo Tempo até cada sorteio (0 a 6, **3** de padrão) e quais modos entram no sorteio (**todos** de padrão) |
| Pontuação para vencer | 60 / 90 / 120 / 150 / 200 pts, ou um valor livre entre 20 e 500 |
| Tempo por pergunta | 15s / **20s (padrão)** / 30s / 45s |
| Limite da música | 15s / 20s / **30s (padrão)** / 45s / 60s — por quanto tempo a música toca, no máximo |
| Fim da partida | só nos modos musicais: **por pontos** (a meta acima) ou **por número de músicas** (10 / **15** / 20 / 30) |

Nos dois modos musicais a categoria é sempre **Ouvir músicas** e a rodada dura
o limite da música, então somem da tela as categorias e o tempo por pergunta.

### Sala de espera

Enquanto ninguém aperta *Iniciar*, a sala mostra quem já chegou. O **líder**
(quem criou a sala, ou quem herdou o posto se ele saiu) tem um **✕ ao lado de
cada pessoa** para tirá-la da sala — vale em todos os modos, e quem é tirado
volta para o saguão com um aviso.

Nos **modos em equipe** a lista vira uma caixa por time, com o botão de trocar
de lado embaixo de cada uma — ver [O formato das equipes](#o-formato-das-equipes).

### O chat é a resposta

Cada mensagem digitada é comparada com a resposta certa. O quanto a pessoa
errou é a **distância de edição dividida pelo tamanho da resposta** — ou seja,
quantos por cento da palavra saíram errados:

| Erro | O que acontece |
| --- | --- |
| **menos de 10%** | conta como **acerto** e pontua |
| **de 10% a 20%** | mostra **onde você errou** só para quem escreveu; a mensagem **não** vai ao chat |
| **mais de 20%** | é conversa: vira **mensagem normal no chat global** |

**O "quase" mostra onde foi o erro.** Em vez de um aviso genérico, volta a
resposta com as letras que bateram no lugar e `_` onde faltou — quem digitou
`cera` com `cara` na frente vê **`c_ra`**. A conta é o mesmo alinhamento de
Levenshtein que já mede o erro, refeito de trás para frente para saber quais
letras casaram (`mascaraDeAcerto`, em [`server/comparar.js`](server/comparar.js)).
Espaço e pontuação passam direto: não é neles que alguém erra.

A dica só aparece na faixa do "quase". Palpite longe continua indo para o
chat sem devolver nada — senão bastaria digitar letras soltas para arrancar a
resposta do servidor.

**Item de lista é azul; resposta fechada é verde.** Quando a rodada pede
vários itens (Escalada, Carrossel, Presente Grego), cada acerto parcial entra
no chat no mesmo formato compacto do acerto, só que em azul. O verde fica
reservado para quem fechou a resposta inteira — numa rodada de Escalada as
duas coisas aparecem seguidas, e a cor é o que separa "lembrei mais um" de
"acabei".

Antes de comparar, o texto é normalizado: acentos, maiúsculas, pontuação e
espaços são ignorados. `JAPÃO`, `japao` e `Japão` são a mesma coisa.

Duas proteções extras, ambas fora do chat global:

- Uma frase que **contém** a resposta (`"acho que é o Johnny Depp"`) nunca é
  publicada, para não entregar o jogo.
- Depois de acertar, você continua conversando normalmente, mas qualquer
  mensagem parecida com a resposta continua sendo segurada.

Os limites ficam no topo de [`server/comparar.js`](server/comparar.js)
(`LIMITE_CERTO`, `LIMITE_QUASE`), caso queira afrouxar ou apertar.

**Enter envia, também no celular.** No computador o próprio formulário cuida
disso. No Android, com texto preditivo ligado, o teclado trata o Enter como
"confirmar a palavra" (tecla 229, sem a ação de enviar), e alguns teclados
mandam uma quebra de linha no lugar da tecla — era preciso tocar duas vezes.
Agora o campo tem `enterkeyhint="send"` (o teclado mostra **Enviar**, que
confirma a palavra e envia num toque só), e o Enter e a quebra de linha são
tratados direto no campo. Enter no meio de uma composição de verdade
(japonês, chinês) continua só confirmando. Tocar no ➤ não fecha o teclado.

> **Onde fica a fronteira:** *menos* de 10% é acerto, então 10% exatos já contam
> como "quase". Numa resposta de 10 letras, 1 letra errada dá exatamente 10% e
> cai no "quase". Para aceitar esse caso, troque `<` por `<=` em `LIMITE_CERTO`.

### Cinco chances por pergunta

No **Modo Tempo** e na **Escalada**, cada pessoa pode errar **5 vezes por
pergunta**. Sem esse teto, quem não sabia metralhava palpites até um colar.

- Gasta chance todo palpite que não acerta: o que vai para o chat e o "quase".
  Durante a pergunta não há como separar conversa de chute, então o "kkk"
  também conta.
- Não gasta: acertar, repetir um item que você já disse na Escalada e
  escrever na tela da categoria, antes de a pergunta aparecer.
- O campo de resposta mostra quantas chances restam, e a última vem avisada.
- Sem chances, a pessoa vira plateia, igual a quem já acertou: a conversa
  continua indo ao chat, mas nada parecido com a resposta sai dela e nada
  mais pontua.
- A contagem é pelo nickname. Cair e voltar no meio da pergunta não devolve
  as chances.

Os outros modos já tinham regra própria para o palpite e não mudam: a vez do
Carrossel, o respondedor dos leilões, o palpite único do Mais ou Menos Pontos
e o palpite fechado do 1 é bom 2 ok 3 é demais. O número fica em
`CHANCES_POR_PERGUNTA`, no topo de [`server/sala.js`](server/sala.js).

### Acentos

**O texto do jogo não usa acentos** — perguntas, respostas, categorias e a
interface. Foi uma escolha de apresentação, aplicada de uma vez sobre todos os
textos.

Isso **não muda o que o jogador pode digitar**: a comparação sempre ignorou
acento, maiúscula, pontuação e espaço. Quem escreve "Japão" acerta uma resposta
gravada como "Japao", e vice-versa. Os comentários do código e este README
seguem acentuados, porque são para quem lê o projeto, não para quem joga.

### Modo Tempo — pontuação

A rodada tem **20 segundos**, e dois descontos se somam.

**1. O relógio.** A rodada é fatiada em faixas de 5s, e a base cai 1 ponto por
faixa:

| Quando acertou | Base |
| --- | --- |
| 0 a 5s | 10 |
| 5 a 10s | 9 |
| 10 a 15s | 8 |
| 15 a 20s | 7 |

**2. A fila.** Cai mais **1 ponto para cada pessoa que acertou antes**. O
primeiro não perde nada, o segundo perde 1, o terceiro perde 2, e assim por
diante.

Juntando os dois, a tabela de uma rodada fica assim:

| Acertou em | 1º | 2º | 3º | 4º |
| --- | --- | --- | --- | --- |
| até 5s | 10 | 9 | 8 | 7 |
| 5 a 10s | 9 | 8 | 7 | 6 |
| 10 a 15s | 8 | 7 | 6 | 5 |
| 15 a 20s | 7 | 6 | 5 | 4 |

Ou seja: **quem acerta em terceiro depois de 15s leva 5 pontos** — a faixa vale
7 e saem 2 de quem chegou na frente.

- Um acerto nunca vale menos que **1 ponto**, por mais tarde e mais atrás que venha.
- Errar não tira ponto, mas cada um tem **5 chances por pergunta** (veja abaixo).
- A rodada fecha quando ninguém mais pode pontuar — cada um acertou ou gastou
  as chances — ou quando o tempo acaba.
- A partida acaba assim que alguém alcança a meta definida pelo líder.

As faixas são de 5s independente da duração escolhida, então uma rodada de 30s
simplesmente continua a escada: 10, 9, 8, 7, 6, 5.

O relógio que vale é o do **servidor**, contado a partir do instante em que a
pergunta foi enviada — o cronômetro da tela é só visual.

### Modo Escalada

Cada rodada pede uma resposta a mais que a anterior: 1 na primeira, 2 na
segunda, 3 na terceira. A rodada ganha **3 segundos por resposta extra** — a de
6 respostas dura 45s.

**Pontuação:** cada item lembrado vale **2 pontos**, e fechar a lista dá **+5 de
bônus**. Quem lembra 3 de 4 leva 6; quem fecha as 4 leva 8 + 5 = 13. Progresso
parcial conta, então ninguém sai de mãos vazias por ter parado a um item do fim.

Cada rodada dá **5 chances de errar**, como no Modo Tempo: item fora da lista
gasta uma, item novo e item repetido não.

**Escolha da lista.** Cada lista tem um `tema`, e o sorteio faz duas coisas:

1. **não repete o tema da rodada anterior** — se a rodada 3 foi de geografia, a
   rodada 4 procura outro assunto;
2. **prefere o assunto fechado nas rodadas curtas.** O teto de tamanho é
   `n * 3 + 8`: na rodada de 2 respostas ele fica em 14 itens, e na de 12 sobe
   para 44. A ideia é pedir *esportes com bola* quando faltam 2 respostas e
   *esportes olímpicos* quando faltam 12 — específico embaixo, genérico em cima.

   **O teto é preferência, não muro.** Como filtro rígido ele travava a
   variedade: na rodada de 2 só *capitais da América do Sul* (12 itens) passava,
   e *capitais europeias* (22) nunca aparecia. Agora as listas dentro do teto
   entram três vezes no bolo do sorteio e as demais uma vez — as fechadas
   continuam mais prováveis, sem tirar as outras do jogo.

São **263 listas escritas à mão** (13.044 itens) e outras **339 geradas**
a partir delas — 602 no total. Cobrem futebol, geografia, música, cinema,
séries, anime, games, ciência, história, filosofia, mitologia, política,
esportes, objetos de casa e cultura pop.

Entre as maiores: **144 filósofos e sociólogos**, os **97 vencedores do
Oscar de Melhor Filme** (a lista completa, de *Asas* a *Anora*), **172
atores** e **88 atrizes** internacionais, **141 artistas com Grammy**,
**125 séries**, **119 presidentes e líderes mundiais do século XXI**,
**115 cantores sertanejos** (cada integrante de dupla vale sozinho),
**106 personagens da mitologia grega**, **96 pilotos de Fórmula 1**,
**86 artistas de funk**, **79 divas pop** e **72 ditadores da história**.

**Um cômodo por lista.** *Coisas que tem em uma cozinha* (92) sozinha não
cobre a casa, então cada cômodo virou uma pergunta: banheiro (50), quarto
(44), escritório (42), sala de estar (40), garagem (40), quintal (36) e
área de serviço (32). É repertório que todo mundo tem na cabeça sem estudar
— o tipo de lista que salva uma rodada alta.

**A escola também virou repertório.** *Coisas que tem na aula de português*
(147) e *de matemática* (141) puxam o vocabulário que todo mundo atravessou:
substantivo, paroxítona, crase e oração de um lado; Bhaskara, incógnita,
potenciação e hipotenusa do outro. As duas dividem o mesmo `tema`, então
nunca caem em rodadas seguidas.

### Mais ou Menos Pontos

Uma **lista em ordem** — os 100 países mais populosos, as 100 maiores cidades do
Brasil, os 30 filmes de maior bilheteria. **A posição é a pontuação**:

| Resposta | Vale |
| --- | --- |
| o 1º da lista | **1 ponto** |
| o 30º da lista | **30 pontos** |
| o último da lista | **o tamanho dela** |
| qualquer coisa fora da lista | **0** |

Dizer *Índia* nos países mais populosos rende 1 ponto; lembrar da *Eslovênia*,
lá no fim da lista, rende quase 100. O óbvio quase não pontua, e o nome que
ninguém lembra vale uma rodada inteira — daí o nome do modo.

**A mesma lista fica por três rodadas.** Uma lista de 100 nomes morreria com
quatro respostas; em três voltas a mesa raspa o que sabe, e o que já saiu
**continua fora** nas voltas seguintes — a tela mostra a lista do que já foi
dito para ninguém tentar de novo.

Três regras seguram a esperteza:

- **Cada pessoa responde uma vez por rodada.** A primeira resposta que bate na
  lista é a que conta.
- **Chutou fora da lista, gastou a vez.** Errar não custa pontos, mas custa a
  rodada: é um palpite por volta, e esse foi o dele.
- **Resposta que já saiu não conta de novo** — nem da mesma volta, nem das
  anteriores. O acerto vai público no chat com a posição ("Mogi das Cruzes —
  50º da lista"), então copiar do vizinho devolve *"já foi dito"*. Repetir,
  esse sim, **não gasta a vez**: duas pessoas podem digitar o mesmo nome no
  mesmo segundo.

O **topo da lista só abre na terceira volta** — antes disso o resultado mostra
apenas o que a mesa acertou, senão as duas voltas seguintes seriam cópia da
tela. Como uma rodada dessas não tem "resposta certa" única, ela **não alimenta
a dificuldade adaptativa**.

São **25 listas** em [`server/rankings.js`](server/rankings.js), 1.390 itens:
países por população, área e PIB, cidades do Brasil e do mundo, estados
brasileiros, rios, estádios, jogos mais vendidos, artistas e músicas do
Spotify, álbuns e livros mais vendidos, filmes de maior bilheteria, canais do
YouTube, contas do Instagram (mundo e Brasil), empresas mais valiosas,
artilheiros da história e da Seleção, jogadores com mais títulos, línguas
faladas e medalhas olímpicas. Cada uma com a **fonte e o ano** anotados: a
ordem é o que vale, então atualizar significa trocar a lista inteira, nunca um
item no meio.

Duas listas perderam um item de propósito: *Lose Yourself* e *Velozes e
Furiosos 8*, que o corretor não distingue de *Love Yourself* e do *7*. Sem
isso, quem dissesse um levaria a pontuação do outro. A `fonte` da lista diz
qual item saiu.

Nas listas de gente, **o sobrenome basta** — *Marquezine* vale por Bruna
Marquezine —, desde que ele não acerte outro item da mesma lista.

### 1 é bom 2 ok 3 é demais

O nome é a pontuação: uma palavra e **três dicas**, e acertar na primeira vale
mais do que acertar na terceira. Cada dica abre uma **janela de 15 segundos**: o
que você escreve fica **guardado no servidor e ninguém vê** — nem quem está do
seu lado. **Travar a resposta é simplesmente responder.**

A janela fecha de dois jeitos: **o tempo acaba** ou **a mesa inteira responde**
— com todo mundo travado não há o que esperar do relógio. Nos dois casos as
respostas abrem **todas de uma vez, logo abaixo das dicas**, cada uma com o
nome de quem escreveu embaixo dela.

| Quando acertou | Vale |
| --- | --- |
| ainda na 1ª dica | **10** |
| na 2ª dica | **6** |
| na 3ª dica | **3** |

Quem acertou leva o valor cheio da dica, **igual para todos** — ninguém viu o
palpite do outro, então não há primeiro nem segundo. **Acertou alguém, a rodada
acaba** ali (a palavra já está na tela); **não acertou ninguém, entra a dica
seguinte**, valendo menos. Dá para **trocar de ideia** quantas vezes quiser
**enquanto a janela estiver aberta**: vale o último palpite escrito. Como
responder é travar, quem responde por último fecha a janela — então só dá para
repensar enquanto ainda falta alguém.

O palpite não passa pelo chat enquanto a janela está aberta. Se passasse, o
primeiro acerto entregaria a palavra para a mesa inteira e as duas dicas
seguintes não valeriam nada.

**A dica é solta, não é frase.** Cada uma é um nome ou um detalhe que só fecha
junto com os outros dois: *Michael Jackson · Mike Tyson · Taffarel* levam a
**Luva**; *Kill Bill · táxi de Nova York · Pikachu* levam a **Amarelo**. A
primeira é a mais enviesada e a terceira é a que chega mais perto — definição de
dicionário estraga o jogo.

Outro tipo de trinca é a **palavra que cabe nos três**: *impressora · caneta ·
pintor* levam a **Tinta**; *aeroporto · boate · Fórmula 1* levam a **Pista**;
*cresce na cabeça · canta · Atlético Mineiro* levam a **Galo**.

E tem a trinca de **três campos diferentes** — um filme, um personagem
histórico, um livro —, no molde das cartas de jogo de palavra-chave: *Tio
Patinhas · Aquiles · O Hobbit* levam a **Pés**; *O Iluminado · Paris Hilton ·
Psicose* levam a **Hotel**; *Freddie Mercury · Bruno Mars · Viagem ao Centro da
Terra* levam a **Planeta**.

Duas cartas **nunca abrem com a mesma primeira dica**: na janela de 15 segundos
da dica 1 é só ela que está na tela, e o palpite é um por pessoa. Repetir a
referência mais adiante na carta continua valendo — *Ferrari* abre **Vermelho**
e fecha **Cavalo**, e é disso que o modo vive.

As mesmas referências viram **pergunta do modo normal na mão contrária**: a
carta dá as pistas e pede a palavra; a pergunta descreve o detalhe e pede o
nome. *"Quem perde a mão da espada em Game of Thrones e passa o resto da série
tentando virar outro homem?"* → **Jaime Lannister**. *"Que herói grego só podia
ser ferido num ponto do calcanhar?"* → **Aquiles**. São 34 perguntas assim,
espalhadas por Cinema & TV, História, Música e Animais.

O banco fica em [`server/dicas.js`](server/dicas.js), com **283 palavras**. As
regras estão no topo do arquivo, e `testes/veni.test.js` cobra as duas
principais: **a dica nunca pode conter a resposta**, nem em outra forma (foi
assim que "formigueiro" saiu da dica de *Formiga*), e **nenhuma dica passa de
cinco palavras**.

### O formato das equipes

O **Presente Grego** e o **Dando dicas** dividem a sala em times, e o formato
é do líder: **quantas equipes** e **de que tamanho**. Na sala de espera há dois
controles — um **+ à direita** das caixas, que abre outra equipe, e um **+
embaixo**, que faz caber mais gente em cada uma. Dois times de três, três de
dois, três de três, quatro de três: o que couber em **até 6 equipes de até 6**
(seis porque são seis cores, e seis por equipe porque com 12 na sala duas
equipes já usam todo mundo).

Os dois **−** desfazem, com duas travas para o servidor não decidir por
ninguém: **equipe com gente dentro não fecha** e **o tamanho não encolhe abaixo
da maior equipe**. Tire as pessoas antes. Só o líder mexe, e só enquanto a
partida não começou.

**Enquanto ninguém mexe, a sala se arruma sozinha.** Ela nasce no menor formato
que dá jogo — duas equipes de dois — e cresce quando não cabe mais ninguém,
cada modo pelo seu eixo:

| Na sala | Presente Grego | Dando dicas |
| --- | --- | --- |
| 4 | 2 de 2 | 2 de 2 |
| 6 | 2 de 3 | 3 de 2 |
| 8 | 2 de 4 | 4 de 2 |
| 12 | 2 de 6 | 6 de 2 |

O Presente Grego **engorda as duas equipes**, que é como ele sempre funcionou;
o Dando dicas **abre duplas novas**, porque mais equipe é mais gente no leilão
e mais lance na mesa. **No instante em que o líder toca num dos botões a sala
para de crescer sozinha** — o formato passa a ser o que ele pediu.

Quem chega e **não cabe em equipe nenhuma** entra na sala assim mesmo, aparece
numa lista à parte e o saguão diz o que falta. Para começar:

- ninguém pode estar **sem equipe**;
- pelo menos **duas equipes com gente**;
- e **nenhuma equipe sozinha** — toda equipe que tem alguém precisa de dois, uma
  pessoa leiloa e a outra responde.

Sala **ímpar** no Dando dicas cai nesse último caso: com 5 pessoas a sala abre
uma terceira dupla e sobra alguém sem par. A saída é o **+ de baixo** — as
duplas viram trios e a quinta pessoa entra num deles. Numa equipe de três os
papéis giram a cada rodada, então o terceiro só fica de fora de uma rodada por
vez.

Enquanto a equipe for de dois, o **Dando dicas chama ela de "Dupla"**; do
terceiro integrante em diante ela vira "Equipe", no chat e na tela de resultado.

### Presente Grego

Joga-se **em equipes**, a partir de 4 pessoas na sala. Elas aparecem na sala de
espera, uma caixa ao lado da outra: quem entra cai na menor com vaga e pode
mudar de lado no botão embaixo da lista, enquanto a partida não começou.

Quantas equipes e de que tamanho é o líder quem diz, nos dois **+** do saguão
— ver [O formato das equipes](#o-formato-das-equipes). Sem ninguém mexer, o
Presente Grego fica com **duas equipes que engordam junto com a sala**: 2 de 2
com quatro pessoas, 3 contra 2 com cinco, 2 de 4 com oito. Para começar,
**cada equipe com gente precisa de pelo menos duas pessoas** — sem isso o
leilão fica sem adversário.

Cada rodada tem dois papéis dentro da equipe, e eles **giram a cada rodada** —
numa equipe de três, em três rodadas cada um leiloa uma vez:

- **🔨 quem leiloa** — vê a pergunta e aposta quantas respostas o colega faz;
- **🎁 quem responde** — não vê nada até o leilão acabar.

O enunciado sai do servidor **um a um, só para quem leiloa**. Não é a tela que
esconde: a mensagem nem chega a quem vai responder, então não adianta abrir o
inspetor. Durante o leilão o chat fica trancado para todo mundo — quem leiloa
já leu a pergunta, e uma frase solta entregaria o assunto.

**O leilão.** A palavra passa de uma equipe para a outra, **9s para cada** —
**12s para quem abre**, que decide sem lance na mesa e ainda está lendo a
pergunta:

- **cobrir** — apostar qualquer número **maior** que o lance na mesa (de 4 pode
  ir para 5 ou direto para 11);
- **duvidar** — encerrar o leilão e cobrar o último lance. Não dá para duvidar
  antes do primeiro lance nem do próprio lance da equipe.

Deixar o tempo acabar tem dois significados: **sem lance na mesa** o leilão abre
no mínimo (quem começa é obrigado a apostar); **com lance na mesa** vale como
*duvido*, porque ninguém cobriu.

**A entrega.** Fechado o leilão, a pergunta abre para a mesa inteira, mas só
**quem foi desafiado** escreve. O relógio não é o da sala: a entrega dura
`2s + 4s por resposta prometida`, com teto de 120s. Quem prometeu 5 tem 22
segundos; quem prometeu 12, 50 — o tempo cresce com o tamanho do que foi
prometido, porque é uma pessoa só digitando a lista. Errar não elimina: só queima relógio.

**Pontuação: tudo ou nada.** O prêmio é `aposta × 2`, e vai inteiro para uma das
equipes — todo mundo dela recebe:

| O que aconteceu | Quem leva |
| --- | --- |
| Entregou as respostas prometidas | a equipe que **apostou** |
| Faltou uma que seja | a equipe que **duvidou** |

Parar a um item do combinado vale o mesmo que parar em zero. É isso que torna o
lance alto tentador e perigoso na mesma medida: apostar 12 e não entregar dá 24
pontos para quem duvidou.

**As listas.** Só entram repertórios com **15 itens ou mais**, e o número some
do enunciado — *"Cite {n} países da África"* vira *"Cite países da África"*,
porque quantas respostas valem é justamente o que o leilão decide. Rodada de
Presente Grego **não alimenta a dificuldade adaptativa**: responde uma pessoa
só, contra um alvo que ela nem escolheu.

Se alguém sai no meio e a rodada fica sem quem responder, ela é **cancelada**
sem ninguém pontuar. A equipe do maior lance só perde a rodada se ficar com
menos de duas pessoas; com três, ainda sobra quem entregue o presente. Sem duas
equipes de dois, a partida termina.

### Leilão Geral

O mesmo leilão do Presente Grego, só que **cada um por si**: a pergunta é
pública desde o começo e cada pessoa aposta **quantas respostas ela mesma
consegue dizer**. A sala precisa de duas pessoas, porque alguém tem que ter a
chance de cobrir o lance.

**O leilão.** A palavra passa de pessoa em pessoa, 9s para cada (12s para quem
abre), e na sua vez
há duas saídas:

- **cobrir** — apostar um número maior que o lance na mesa;
- **passar** — sair do leilão desta rodada. Quem abre é obrigado a apostar (sem
  lance na mesa não há do que desistir), e quem está com o maior lance não
  passa do próprio lance.

Deixar o tempo acabar conta como passar. Quando sobra uma pessoa só, o leilão
fecha nela: a rodada passa a pedir exatamente o que ela prometeu, e só ela
escreve — o chat fica trancado para o resto da mesa, como no Presente Grego.

**Pontuação.** Diferente do Presente Grego, aqui não é tudo ou nada:

| O que aconteceu | Quem leva |
| --- | --- |
| Cada resposta entregue | **2 pontos** para quem levou o leilão |
| Não chegou no que prometeu | **cada um dos outros** leva o tamanho da aposta |

Apostar 5 e dizer 5 vale 10 pontos e deixa a mesa a zero; apostar 5 e dizer 2
vale 4 pontos — e dá 5 para cada uma das outras pessoas. Entregar tudo é o
único jeito de não pagar ninguém.

### Dando dicas

O leilão **ao contrário**, jogado em **duplas**. Nos outros leilões o lance sobe
e ganha quem promete mais; aqui ele **desce**, e ganha quem se compromete a
fazer o parceiro acertar com **menos palavras**.

A sala precisa de **4 jogadores, em número par**. Cada dupla tem exatamente
dois — o terceiro não teria papel na rodada —, e dá para até **seis duplas**
(o teto de 12 pessoas da sala). Na sala de espera aparecem as duplas que já
têm gente mais uma vazia; com alguém sozinho num time, o botão de iniciar fica
travado.

Os dois papéis **giram a cada rodada**, então quem deu as dicas na rodada 1
adivinha na rodada 2:

- **💡 quem dá as dicas** — vê a palavra secreta e leiloa por ela;
- **🤔 quem adivinha** — não vê nada, nem a categoria.

**A palavra.** Sai do mesmo banco das outras rodadas, mas o que interessa é a
**resposta**, não o enunciado: *"Quem ganhou a Copa de 2002?"* vira a palavra
`Brasil` e a pergunta é jogada fora. Nem toda resposta serve de alvo — número
puro viraria charada de aritmética e frase comprida ninguém arranca do
parceiro —, então o sorteio insiste até achar uma de até três palavras com
letra. A **categoria de verdade fica escondida** (a tela diz só *Dando dicas*):
saber que é Geografia já faria metade do trabalho da dica.

A palavra sai do servidor **uma a uma, só para quem leiloa**. Não é a tela que
esconde: a mensagem nem chega a quem vai adivinhar. Durante o leilão o chat
fica trancado para todo mundo, e a rodada abre **sem máscara** — o formato da
palavra entregaria o que se está tentando arrancar a duras penas.

**O leilão ao contrário.** A palavra passa de dupla em dupla, **9s para cada** —
**12s para quem abre**:

- **cobrir** — prometer um número **menor** que o lance na mesa. O teto de
  abertura é **10 dicas** e o chão é **1**;
- **passar** — sair do leilão desta rodada. Não há *duvido*: quem não quer
  descer mais, desiste.

Quem abre é obrigado a apostar, e deixar o tempo acabar sem lance na mesa abre
no **teto**, que é o lance mais seguro. Com lance na mesa, o tempo esgotado vale
como passar. Um lance de **1 não tem como ser coberto**: só resta a todo mundo
passar, e a dupla entrega com uma palavra só.

**A entrega.** Fechado o leilão, a dupla inteira escreve — é a única rodada do
jogo com duas bocas ao mesmo tempo:

- quem deu o lance manda **dicas**, e cada dica é **uma palavra só**. São
  exatamente as que prometeu; a décima primeira de um lance de dez não entra;
- o parceiro manda **palpites**, à vontade. O chute errado **vai para o chat**
  de propósito: quem dá as dicas precisa ouvir por onde o outro está indo.

O resto da mesa assiste calado — os leiloeiros das outras duplas já viram a
palavra e a entregariam numa frase. **Dica que carrega a resposta é recusada**,
nos dois sentidos: `senna` dentro de *Ayrton Senna* e `formigueiro` em volta de
*Formiga*. Três letras já bastam para entregar (`sol` dentro de `solar`), e a
dica recusada **não gasta** nada do orçamento.

O relógio da entrega é `15s + 9s por dica prometida`, com teto de 105s: quem
prometeu 1 tem 24 segundos, quem prometeu 8 tem 87. Gastar as dicas cedo deixa o
resto do relógio para o parceiro pensar.

**Pontuação: por rodada, não por dica.** A rodada vale **10 pontos**, custe uma
dica ou dez:

| O que aconteceu | Quem leva |
| --- | --- |
| A palavra saiu dentro do orçamento | os **dois** da dupla que levou o leilão |
| As dicas acabaram e a palavra não saiu | **cada uma** das outras duplas |

É aí que o leilão ao contrário morde: descer o lance **não rende mais ponto**,
rende o direito de tentar. Fechar em 1 paga igual a fechar em 8 — o que muda é
o risco de a palavra não sair e a rodada inteira ir para quem passou.

Rodada de Dando dicas **não alimenta a dificuldade adaptativa**: adivinha uma
pessoa só, e o que ela tem na frente não é a pergunta, são as palavras que o
parceiro escolheu. Se quem dá as dicas ou quem adivinha sai no meio, a rodada é
**cancelada** sem ninguém pontuar.

### Corrida musical

Toca um pedaço sorteado de uma música (ver [Categoria Ouvir
músicas](#categoria-ouvir-músicas)) e **o primeiro que acertar no chat leva os
pontos**. A pergunta é *"Qual é o nome desta música?"* ou *"Quem canta esta
música?"*, como na categoria.

- **Pontos:** o mesmo esquema do Modo Tempo — 10 nos primeiros 5 s, 1 a menos a
  cada 5 s. Como só o primeiro pontua, o desconto da fila não entra.
- **A música para quando alguém acerta**: a rodada fecha na hora. Palpite certo
  que chega no mesmo instante, depois do primeiro, é segurado e não vale nada.
- Se ninguém acerta, a rodada dura o **limite da música** da sala.
- São **5 chances por música**, como no Modo Tempo.

### Qual é a música

Toca um pedaço sorteado de uma música e aparecem **4 opções**. A resposta é o
clique, e o chat vira só conversa.

- **Um clique por música**, sem troca. Certo vale o esquema do Modo Tempo (10
  nos primeiros 5 s, 1 a menos a cada 5 s); errado, zero.
- **Ninguém fica sabendo na hora se acertou**, nem quem clicou: a certa só
  aparece no resultado, em verde, com a errada de cada um em vermelho e o que
  cada pessoa marcou na lista.
- A rodada fecha quando **todo mundo clicou** ou no **limite da música**.
- **As opções erradas são do mesmo estilo** (rap nacional com rap nacional,
  sertanejo com sertanejo — o estilo de cada música fica em
  [`server/musicas.js`](server/musicas.js)): "Negro Drama" ao lado de "Shape of
  You" se acertaria sem ouvir nada. Ficam de fora o que também valeria como
  resposta — o parceiro do dueto, o "Perfect" da outra banda.
- O chat **segura** a mensagem que parece com qualquer uma das quatro opções:
  quem já clicou não consegue soprar para os outros.
- Pergunta sem opções possíveis (*"De qual anime é esta música?"*) não entra.
- Não há máscara da resposta: o tamanho apontaria a opção certa.

**Nos dois modos musicais** a partida acaba pela meta de pontos ou pelo
número de músicas (a sala escolhe), a mesma música não toca duas vezes na
partida e a rodada **não alimenta a dificuldade adaptativa**: na corrida só uma
pessoa chega a acertar, e com quatro opções um em cada quatro acerta no chute.
`testes/musicas.test.js` cobre os dois.

### Bagunça

Todos os modos numa partida só. A sala joga **3 perguntas do Modo Tempo**, e aí
um **sorteio** escolhe o modo da rodada seguinte entre os outros dez. Jogada
essa rodada, volta o Modo Tempo e a conta recomeça:

```
Tempo, Tempo, Tempo, 🎲 Escalada, Tempo, Tempo, Tempo, 🎲 Presente Grego, …
```

O líder ajusta as duas coisas na configuração:

- **quantas perguntas até cada sorteio**, de 0 a 6. Com **0** não há Modo
  Tempo no meio: toda rodada sai do sorteio;
- **quais modos entram no sorteio**, um chip para cada. Precisa sobrar pelo
  menos um. O Modo Tempo não aparece na lista — ele já é o recheio.

**Quem cabe no sorteio é decidido na hora dele**, pela sala daquele momento:

- **os modos em equipe** (Presente Grego e Dando dicas) só entram **com 4 ou
  mais na sala** — duas equipes de dois. Com menos gente a sala de espera
  avisa quais ficam de fora, mas a partida começa assim mesmo;
- o **Leilão Geral** precisa de duas pessoas, como sempre;
- **o último modo sorteado espera a vez**: o mesmo modo não sai duas vezes
  seguidas, a não ser que seja o único marcado;
- se nada do que foi marcado cabe na sala, a rodada segue no Modo Tempo e o
  chat explica por quê.

**A roleta.** O sorteio tem tela própria (`bagunca:sorteio`, 5,5 s): a roleta
gira pelos modos que podiam sair, para no sorteado e mostra a regra dele.
Quem sorteia é o servidor; a roleta é só o espetáculo. Durante a partida a
etiqueta de cima diz o modo da rodada, e a tela da categoria diz em que
pergunta do Modo Tempo a sala está até o sorteio (*Rodada 2 · 2 de 3 até o
sorteio*).

**As equipes saem do sorteio.** Não há caixas de equipe no saguão: o modo em
equipe aparece de vez em quando e quem está na sala muda no caminho. Cada vez
que um deles cai, a sala é embaralhada na hora, e a tela do sorteio já mostra
quem joga com quem — o Presente Grego em duas equipes que dividem a sala, o
Dando dicas em duplas (com gente ímpar, uma delas vira trio). A equipe vale
**uma rodada**: os pontos vão para cada integrante, e o placar final é de
cada um.

**Cada modo joga como ele mesmo**, numa rodada só, com três ajustes:

- a **Escalada** sobe um degrau a cada vez que é sorteada e começa no 2 (a
  de uma resposta seria a pergunta comum do Modo Tempo);
- o **Carrossel** também cresce pelas vezes em que saiu, e não pela rodada da
  partida: o primeiro dá uma volta;
- o **Mais ou Menos Pontos** abre e fecha a lista na mesma rodada, sem as
  três voltas — e o topo dela aparece no resultado.

As **rodadas musicais** (Corrida e Qual é a música) tocam música mesmo sem a
categoria Ouvir músicas marcada, de uma fila só delas: assim Ouvir músicas não
vaza para o Modo Tempo de quem não marcou. Tocam pelo **limite da música** da
sala, e a partida acaba sempre pela meta de pontos.

Por dentro, cada `ehX()` da sala pergunta pelo **modo da rodada**
(`sala.modo`), e não pelo da sala: fora da Bagunça os dois são o mesmo; nela,
o sorteio troca o primeiro e o resto do código segue sem saber. O ritmo, quem
cabe, as equipes, os ajustes e a música isolada estão em
`testes/bagunca.test.js`.

### Pular a rodada

Qualquer pessoa pode votar para **pular a rodada**, e com **metade mais um**
ela morre na hora: 2 votos numa sala de 3, 3 numa de 4, 4 numa de 6. Serve
para destravar a mesa quando a categoria não agrada ou ninguém sabe a
pergunta.

O botão aparece **na tela da categoria e no topo do jogo** — dá para recusar a
categoria assim que ela aparece, e o voto continua valendo depois que a
pergunta abre. Clicar de novo tira o voto; o placar (`2/3`) fica no próprio
botão e cada voto vira aviso no chat.

Duas decisões que valem registrar:

- **A resposta é revelada mesmo assim.** Quem vota para pular normalmente vota
  por não saber, e ficar sem saber é pior que a rodada perdida.
- **O que já foi ganho continua ganho.** Tirar ponto de quem acertou antes da
  votação fechar transformaria o botão em castigo — o voto é para destravar a
  mesa, não para punir quem sabia.

Rodada pulada **não alimenta a dificuldade adaptativa**: quase ninguém tentou
responder, então ela não mede nada sobre a pergunta.

### Pausar o jogo

O **líder** tem um botão **⏸ Pausar** no topo da pergunta (e na tela da
categoria). No celular fica só o ícone.

- **Tudo para onde estava:** o relógio da rodada, o da vez no Carrossel, o do
  lance no leilão, a contagem da tela de resultado e a espera da imagem. Cada
  um guarda quanto faltava (`pausar`, em [`server/sala.js`](server/sala.js)).
- **A pergunta some:** a tela *"Jogo pausado"* cobre o jogo inteiro. Com o
  relógio parado, ninguém fica olhando a imagem ou o enunciado com todo o
  tempo do mundo.
- **Ninguém responde, vota ou dá lance.** O servidor recusa enquanto a pausa
  durar, e o chat fecha, como no leilão: senão daria para combinar a resposta.
  Se a música de *Ouvir músicas* estava tocando, para junto.
- **Só o líder continua.** Na volta, cada relógio segue com o que faltava, e o
  início da pergunta anda o tempo que ficou parado: a pontuação por tempo não
  conta a pausa. O chat registra quem pausou e quem continuou.
- **Se o líder sai pausado,** a coroa passa como sempre e quem herdou continua.
  Quem entra durante a pausa já abre a tela de pausa.
- Se a partida acaba, ou a sala esvazia e alguém volta, a pausa some.

Tudo o que seria agendado durante a pausa (alguém sai e a rodada fecharia, por
exemplo) espera a volta: `agendar` e `agendarVez` guardam o que chega em vez de
disparar. `testes/pausa.test.js` cobre.

### Categorias variadas (Modo Tempo)

O sorteio escolhe primeiro a **categoria** e só depois a pergunta. Numa janela
de **80% das categorias** escolhidas nenhuma se repete: com 10 categorias,
quaisquer 8 perguntas seguidas são de 8 categorias diferentes; com todas as 16,
quaisquer 13. Dentro da janela o sorteio é livre, então a ordem não vira um
rodízio previsível.

Antes o sorteio era por pergunta, num monte só — e a categoria mais recheada
dominava: Cinema tem 543 perguntas e Rap 27, então uma rodada em cada quatro
era de cinema. A regra antiga continua valendo por cima: resposta que já saiu
na partida não volta.

### Carrossel às cegas

O mesmo carrossel, sem a lista do que já foi dito — e agora sem **nenhum**
jeito de ver: o acerto vai para o chat sem o nome do item, e o palpite repetido
não é publicado. Antes o nome aparecia no chat e a lista "já foi dito" piscava
embaixo por um instante, o que acabava com o modo.

As regras também mudaram: **errar não elimina**, só gasta os 7 segundos — dá
para tentar de novo. O que tira da rodada é **repetir** uma resposta que já
saiu, que é justamente o que o modo pede para lembrar. A dica do "quase" nunca
aponta para um item já dito. O carrossel visível continua como era: errou,
saiu.

### Sobrenome basta

Em qualquer resposta que seja nome de pessoa, **o sobrenome sozinho vale**:
`Messi` por *Lionel Messi*, `Reeves` por *Keanu Reeves*, `Vinci` ou `da Vinci`
por *Leonardo da Vinci*. Ninguém digita o nome inteiro com o relógio correndo.

A variante não é escrita à mão — era assim que ela se perdia a cada lista nova.
`sobrenomesDe` (em [`server/comparar.js`](server/comparar.js)) gera o atalho
na carga: para toda lista de pessoas (jogadores, cantores, atores, políticos,
pilotos…) e, no banco de perguntas, para as fotos de jogador e os enunciados
"Quem…?" e "Qual ator/cantor/…". Sufixo de geração e numeral de rei vão junto
(*Downey Jr.*, *Pedro I*); nome "X e Y" não tem atalho (*Claudinho e Buchecha*
é dupla).

Três travas, porque aceitar demais também é defeito:

- sobrenome de **duas pessoas** da mesma lista não vale para nenhuma (*Rafael*
  e *Diogo Portugal*). Cada lista decide por si: "Costa" é ambíguo em *cantores
  brasileiros*, mas na lista dos que começam com G só existe Gal Costa;
- no banco de perguntas, sobrenome que **acertaria outra pergunta** da categoria
  também não — era assim que "Silva" virava chute que acertava metade das fotos
  de jogador;
- e o atalho **nunca pode estar no enunciado**: *"Quem massacrou o clã
  Uchiha?"* não aceita `Uchiha`.

### A pergunta não entrega a resposta

Nenhuma pergunta pode trazer a resposta — nem uma variante aceita — escrita no
enunciado. Cerca de cem foram reescritas: *"Qual cavalo de madeira derrubou a
cidade de Troia?"* → *Cavalo de Troia*, a série que *"leva 3% ao Maralto"* →
*3%*, *"Qual empresa fabrica o Nintendo Switch?"* → *Nintendo*, e variante que
entregava sem ninguém ver: *"Qual é a fórmula química da água?"* aceitava
`água`.

Resposta de **um caractere** também saiu (fora da matemática, onde o número é a
própria conta): com 350 ms entre mensagens, as 26 letras cabem numa rodada de
20 s. Os símbolos químicos viraram pergunta ao contrário — *"Qual elemento tem
o símbolo C?"* → *Carbono*.

E o `%` passou a contar no corretor: *3%* virava só `3`, e na rodada *"Cite 3
séries famosas"* digitar o número do próprio enunciado valia como a série.

### Listas que contêm outras

*"Cite super-heróis"* e *"Cite heróis da Marvel"* eram a mesma pergunta com
respostas diferentes: *Gavião Arqueiro* valia numa e não na outra. Agora uma
tabela (`INCLUSOES`, em [`server/escalada.js`](server/escalada.js)) diz que a
lista genérica aceita tudo o que as específicas aceitam: super-heróis incluem
os heróis da Marvel e da DC, vilões de quadrinhos os das duas, *capitais
mundiais* todas as capitais por continente, *cantores brasileiros* os
sertanejos, as cantoras, o funk, o pagode e o gospel, *objetos de uma casa*
todos os cômodos. A união é feita na carga, sem copiar item a item — então não
descola quando alguém edita só uma das listas.

### Durante a partida

1. A **categoria aparece sozinha em tela cheia** por ~2,8s.
2. Vem a pergunta, com a **categoria pequena logo acima dela**.
3. Abaixo aparece o **formato da resposta**: `Johnny Depp` vira `•••••• ••••`.
4. Perguntas de bandeira e de futebol mostram a imagem, que já vem carregada
   da tela da categoria ([a imagem chega antes do relógio](#a-imagem-chega-antes-do-relógio));
   as de música mostram um trecho da letra em destaque.
5. O placar e o chat ficam ao lado (no celular, acima e abaixo da pergunta).
6. No fim da rodada aparecem a resposta certa, as outras formas aceitas, a
   dificuldade da pergunta e quem pontuou.

## Rodízio: a mesma pergunta não volta tão cedo

Dentro de uma partida nenhuma pergunta se repete — a sala guarda o que já caiu.
O problema era **de uma partida para a outra**: a fila nova nascia embaralhada
do zero, e as mesmas perguntas voltavam, ainda mais nas categorias magras.

Agora o servidor conta **quantas vezes cada pergunta já entrou** e usa isso
para montar a fila. A regra é a do rodízio, não a da proibição: quem já saiu
**perde peso** até as outras alcançarem. Uma pergunta com contador 1 num monte
de zeros entra com menos chance; **quando todas estiverem em 1, todas voltam a
ter a mesma chance**.

O que conta é sempre a **distância para a menos usada do grupo**, nunca o
número absoluto — senão, depois de muitas partidas, o banco inteiro ficaria
com pesos minúsculos e o sorteio viraria outra coisa. Cada uso a mais que o
piso multiplica o peso por `0,55`: um uso a mais entra com pouco mais da
metade da chance, dois a mais com um terço. **Ainda pode sair** — o que não
pode é sair na mesma frequência de quem nunca saiu.

Não é uma ordenação, é um sorteio: cada pergunta tira uma chave aleatória
`-ln(u) / peso` e a fila sai ordenada por ela. Com todos os pesos iguais isso
é exatamente um embaralhamento uniforme — o teste cobra as duas pontas.

Na prática, simulando 40 partidas de 15 rodadas numa categoria de 30
perguntas (o ideal seria 20 usos para cada uma):

| | menos usada | mais usada | desvio |
| --- | --- | --- | --- |
| embaralhamento uniforme | 13 | 27 | 3,19 |
| com o rodízio | 18 | 21 | 0,82 |

O contador mora em [`server/usos.js`](server/usos.js) e é gravado em
`server/dados/usos.json`, junto com as estatísticas de dificuldade — **no
Render o disco zera a cada deploy**, então lá ele vai para o banco de dados
(veja [Banco de dados](#banco-de-dados)). Ele
aparece no campo `usos` de `GET /api/dificuldades`.

É diferente do `vezes` da dificuldade adaptativa: lá o contador só anda nas
rodadas que alimentam a dificuldade (leilão e Mais ou Menos Pontos ficam de
fora, de propósito). Aqui conta toda vez que a pergunta entrou, que é o que o
rodízio precisa saber.

## Dificuldade crescente

Dentro da partida, as perguntas começam fáceis e endurecem até a meta. O
"andamento" é a pontuação do líder sobre a meta (de 0 a 1), e o sorteio pega,
entre as perguntas da frente da fila, a de dificuldade mais perto dele.

- A escolha fica entre as perguntas que **saíram menos** (um quarto da fila,
  no mínimo 8), então o rodízio continua valendo.
- A dificuldade é medida **dentro da categoria**: em que ponto a pergunta fica
  entre as mais fáceis e as mais difíceis de lá. Sem isso, categoria difícil
  nunca apareceria no começo.

`testes/crescente.test.js` simula uma partida: em Cinema, a média sai de
0,05 (entre as mais fáceis) no começo para 0,98 no fim.

### Faixa de dificuldade (Modo Tempo)

No Modo Tempo, quem cria a sala escolhe **de que pedaço de cada categoria**
saem as perguntas: uma barra de duas alças de 0 a 100, pintada em três níveis
— **Fácil** (0–33, verde), **Médio** (34–66, amarelo) e **Difícil** (67–100,
vermelho). O nível onde a faixa começa e o nível onde ela termina dão o
**título da sala**, com uma ilustração para cada um:

| Começa em | Termina em | Título | Atalho |
| --- | --- | --- | --- |
| Fácil | Fácil | **Primata** | 0–33 |
| Fácil | Médio | **Analfabeto** | 0–66 |
| Fácil | Difícil | **Normal** (o padrão) | 0–100 |
| Médio | Médio | **Esquisito** | 34–66 |
| Médio | Difícil | **Palestrinha** | 34–100 |
| Difícil | Difícil | **Pseudo intelectual** | 67–100 |

- A escala é a mesma da dificuldade crescente: **dentro da categoria**, 0 é a
  pergunta mais fácil de lá e 100 a mais difícil. Na escala da própria
  pergunta (o `dif`) quase nada passa de 67 — Cinema não tem nenhuma —, e "só
  difíceis" ficaria vazio.
- A posição é o **lugar** da pergunta na fila da mais fácil para a mais
  difícil, não a média dos empates. Pergunta que nunca caiu fica na base
  escrita à mão, e um bloco de 60 perguntas iguais entraria inteiro ou ficaria
  inteiro de fora. Pelo lugar, os três níveis repartem a categoria sem sobra:
  cada um leva um terço.
- Cada ponto da barra vale meio ponto para cada lado (0–33 vai até 33,5), para
  duas faixas vizinhas não deixarem pergunta no meio.
- A faixa tem pelo menos **10 pontos** de largura: assim toda categoria de 10
  perguntas ou mais tem pergunta em qualquer faixa. Se as categorias marcadas
  não deixarem nenhuma, a sala não é criada.
- Dentro da faixa a partida continua **crescente**: um Palestrinha começa
  pelas médias e termina nas mais difíceis.
- O título aparece no resumo da sala e na lista de salas abertas do saguão
  (o *Normal* não, porque é o de sempre).

Os níveis e os títulos ficam em `NIVEIS_FAIXA` e `TITULOS_FAIXA`, no topo de
[`server/sala.js`](server/sala.js); as ilustrações em `public/img/titulos/`.
`testes/faixa.test.js` cobre a validação, os títulos e o sorteio.

## Perfil e conquistas

Cada navegador tem um perfil, reconhecido pela carteirinha (o mesmo número
que já traz a aba de volta depois de uma queda). Não há conta nem senha:
trocar de nickname não perde nada, trocar de navegador começa do zero.

O perfil soma partidas, vitórias, acertos, a maior sequência de acertos e as
categorias em que a pessoa já acertou. Dessas somas saem as **43 conquistas**
de [`server/perfis.js`](server/perfis.js), várias em degraus (1, 10, 50...
vezes). Para criar uma nova, é só acrescentar uma linha em `CONQUISTAS`. Se
ela precisar de um contador novo, use `p.marcas`, que soma sozinho no login e
não muda o formato do banco.

**As conquistas são secretas até sair.** Para as que ainda não saíram,
`perfil:ver` manda só `{ secreta: true }`, sem nome, regra nem id (o id já
entregaria a regra), e a tela mostra um cadeado.

Algumas regras que não são óbvias:

- **Rápido no gatilho:** acerto em menos de 2,5 s. **Relâmpago:** menos de 2 s.
- **No último segundo:** acerto com menos de 1 s sobrando no relógio.
- **Perfeição:** terminar a partida sem errar nenhuma rodada, com pelo menos
  5 rodadas no Modo Tempo ou na Escalada.
- **Só eu sei:** ser a única pessoa a acertar, numa rodada com 4 ou mais.
- **Virada histórica:** vencer estando em último quando o líder chegou na
  metade da meta.
- **Por um triz:** vencer com diferença de até 5% da meta.
- **Coruja:** terminar uma partida entre meia-noite e 5h, horário de Brasília. Quem já cumpre a regra ganha a
conquista na próxima rodada que jogar.

- Conquista nova chega na hora (`conquista:nova` para quem ganhou, e um aviso
  no chat da sala).
- O saguão tem o botão **Meu perfil e conquistas** (evento `perfil:ver`).
- `GET /api/melhores` lista quem mais venceu.

Quem entra sem carteirinha (navegador muito antigo) joga normalmente, só não
acumula perfil.

### Nota por categoria

Cada categoria tem uma nota de 0 a 100, na **mesma escala da dificuldade**
das perguntas: nota 70 quer dizer que, numa pergunta de dificuldade 70, a
chance de acertar é meio a meio. É a ideia do Elo do xadrez, com as
perguntas no papel do adversário.

Antes da rodada, a nota dá a chance esperada; depois, anda na direção da
surpresa:

```
esperado = 1 / (1 + e^((dificuldade - nota) / 10))
nota    += passo × (resultado - esperado)        resultado: 1 acertou, 0 errou
passo    = max(3, 20 / (1 + rodadas / 10))
```

Com nota 50 e já com 10 rodadas jogadas:

| | dificuldade 20 | dificuldade 50 | dificuldade 80 |
| --- | --- | --- | --- |
| acertou | +0,5 | +5 | +9,5 |
| errou | −9,5 | −5 | −0,5 |

- A dificuldade usada é a de **antes** da rodada, porque a de depois já traz
  o resultado dela.
- **Contam o Modo Tempo e a Escalada**, em que todos respondem a mesma
  pergunta. Leilões, Carrossel, Mais ou Menos Pontos e Veni ficam de fora,
  porque neles quem não acertou nem sempre errou.
- **Quem chega no meio da rodada não leva erro:** só conta quem viu a pergunta
  abrir.
- Com menos de 5 rodadas na categoria, a nota aparece como provisória.
- No login, notas de dois aparelhos viram a média pesada pelas rodadas.
- A nota volta para a dificuldade: ver [Dificuldade adaptativa](#dificuldade-adaptativa).

### Painel de desempenho

A tela do perfil tem um painel com um recorte por vez: **Geral** (todas as
perguntas) ou uma categoria, escolhidos nos chips de cima. Clicar numa
categoria da lista abre o painel nela.

- **A nota** em destaque, com a variação da última partida e a faixa em que
  ela acerta meio a meio ("Meio a meio em perguntas de dificuldade 63").
- **Aproveitamento**, rodadas medidas e dificuldade média das perguntas.
- **Evolução da nota**: uma foto por partida, das últimas 30.
- **Acerto por dificuldade**: em cada faixa (Fácil, Média, Difícil, Muito
  difícil), o quanto a pessoa acertou contra o quanto a nota esperava. Barra
  longe do traço quer dizer que a nota ainda está se ajustando.
- Na lista por categoria, **ponto forte** e **para treinar** marcam a maior e
  a menor nota entre as que já não são provisórias.
- Os mesmos números ficam numa tabela, embaixo dos gráficos, para quem não
  enxerga o gráfico.

A nota **geral** é uma nota como a das categorias, andando a cada rodada
medida de qualquer categoria. Perfil gravado antes dela existir ganha a geral
somando as categorias (a média das notas pesada pelas rodadas); a divisão por
faixa de dificuldade e a evolução começam do zero, porque não dá para
refazê-las.

### Estatísticas das perguntas

O saguão tem o botão **Estatísticas das perguntas**, que abre uma tabela com
todas as perguntas do banco:

- **Vezes** — quantas vezes a pergunta já caiu, em qualquer modo. É o mesmo
  contador do [rodízio](#rodízio-a-mesma-pergunta-não-volta-tão-cedo).
- **Acerto** — a parte de quem estava na rodada que acertou ("9 de 12").
- **Tempo do acerto** — quanto levou, em média, do relógio abrir até o acerto.
- **Dificuldade** — a [aprendida](#dificuldade-adaptativa), com o nível.

Acerto e tempo vêm das rodadas que medem a pergunta, as mesmas que alimentam a
dificuldade: os leilões (Presente Grego, Leilão Geral e Dando dicas) e o Mais
ou Menos Pontos ficam de fora. Em cima ficam os totais do que está filtrado,
com o acerto e o tempo pesados pelo número de respostas e de acertos.

Dá para buscar no texto da pergunta, filtrar por categoria ou parte dela,
ordenar (mais feitas, mais ou menos acertadas, acerto mais rápido ou mais
lento, dificuldade; clicar no cabeçalho da coluna também ordena) e ficar só
com as que já caíram. A lista vem de 50 em 50. Pergunta de imagem mostra a
imagem, e a de música tem um botão para ouvir o trecho, porque é isso que
separa um "Que país é este?" do outro.

**As respostas não aparecem**, e a busca não olha a resposta: a aba é pública
e, aberta noutra guia, viraria cola no meio da partida. Os números vêm de
`GET /api/estatisticas` (`categoria`, `sub`, `busca`, `ordem`, `feitas=1`,
`pagina`, `tamanho` até 100), que `testes/estatisticas.test.js` cobre.

### Login com Google (opcional)

Com o login, o perfil passa a ser da **conta**, e vale em qualquer aparelho.

- **Convite:** o saguão oferece o login logo de cara. **"Agora não"** esconde
  o convite de vez naquele navegador, e o login continua na tela do perfil.
- **Como liga:** a carteirinha do navegador fica ligada à conta (tabela
  `vinculos`), e o perfil passa a morar em `g:<id do Google>`. A sala não
  muda nada: ela continua mandando a carteirinha, e `perfis.js` descobre de
  quem é o perfil.
- **Primeiro login:** o que o navegador tinha jogado sem login é somado à
  conta. Entrar de novo na mesma conta não soma de novo.
- **Sair da conta:** o navegador volta a jogar sem login, do zero, e a conta
  continua intacta nos outros aparelhos.
- **Quem confere:** o servidor ([`server/google.js`](server/google.js)) confere
  a assinatura do bilhete do Google e se ele foi emitido para o nosso app.
- **O que fica guardado:** só o primeiro nome e o `sub` (o id fixo da conta).
  E-mail e foto não.

Para ligar:

1. No [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   configure a tela de consentimento (público **Externo**) e clique em
   **Publicar app**. Em teste, só os testadores cadastrados conseguem entrar.
2. Crie um **ID do cliente OAuth** do tipo **Aplicativo da Web**, com as
   origens `https://pensarapido.onrender.com` e `http://localhost:3000`.
3. No Render, crie `GOOGLE_CLIENT_ID` com esse ID. Ele não é segredo: vai
   para a página em `/api/config`. Sem ele, o botão não aparece. `testes/perfis.test.js` simula uma partida inteira.

## Banco de dados

Sem configurar nada, o jogo grava os contadores (rodízio do sorteio,
dificuldade adaptativa e perfis dos jogadores) em `server/dados/*.json`. Isso basta no PC, mas **no
Render o disco zera a cada deploy**. Com a variável **`DATABASE_URL`**, os mesmos
dados vão para um **Postgres** (Supabase, Neon ou outro) e voltam em cada subida.

**As tabelas se criam sozinhas** quando o servidor sobe (`perguntas_usos`,
`perguntas_stats`, `jogadores` e `vinculos`), então não há SQL para rodar no painel. A conexão fica em
[`server/banco.js`](server/banco.js).

Na mesma subida o servidor liga o **RLS** (Row-Level Security) nas quatro, sem
nenhuma política. Isso fecha a API pública do Supabase, que o jogo não usa, e
não muda nada para o servidor: ele entra como dono das tabelas, e o RLS não
vale para o dono. É o que tira o aviso `rls_disabled_in_public` do Supabase.

Para ligar no Supabase:

1. No projeto, clique em **Connect** → **Connection string** → **URI**, na
   opção **Session pooler** (porta 5432, que funciona no Render sem IPv6).
2. Troque `[YOUR-PASSWORD]` pela senha do banco.
3. No Render, em **Environment**, crie `DATABASE_URL` com essa URL. O serviço
   reinicia sozinho e o log mostra `dados: banco de dados`.

A URL tem a senha: ela fica **só no Render**, nunca no repositório.

Como funciona:

- a porta só abre **depois** de ler os contadores do banco, senão a primeira
  partida sortearia como se nada tivesse rodado;
- as gravações continuam juntas a cada 5 s, e só vai para o banco o que
  mudou;
- no deploy o Render manda `SIGTERM`, e o servidor grava o que falta antes de
  sair;
- se o banco estiver fora do ar, o jogo **sobe assim mesmo** (começando do
  zero) e tenta gravar de novo na próxima vez.

O teste `testes/banco.test.js` simula um reinício contra um Postgres de
verdade quando existe `TESTE_DATABASE_URL`, apontando para um banco
descartável (as tabelas de lá são apagadas). Sem essa variável, a parte com
banco é pulada.

## Dificuldade adaptativa

Toda pergunta tem um campo `dif` (0 a 100) em `questions.js`, que é só o **ponto
de partida**. Depois de cada rodada o servidor recalcula, em
[`server/dificuldade.js`](server/dificuldade.js):

```
bruta     = 100 × (0,65 × parte que errou + 0,35 × parte do tempo gasta)
surpresa  = média de  confiança × (chance esperada − acertou)
observada = bruta + 50 × surpresa
nova      = atual + peso × (observada − atual)
```

- **Acerto e tempo** — quanto menos gente acerta e quanto mais demora, mais
  sobe. É a conta de sempre.
- **A nota de quem jogou** — cada pessoa que viu a pergunta abrir tem uma
  chance esperada de acertar, que sai da nota dela na categoria contra a
  dificuldade atual (a mesma conta da [nota por categoria](#nota-por-categoria)).
  Errar o que a nota prometia acertar empurra a pergunta para cima; acertar o
  que ela dava como perdido, para baixo. **Errar entre craques pesa mais que
  errar entre novatos.**
- **Confiança** — nota provisória não vale inteira: cada nota pesa
  `rodadas / (rodadas + 5)`. Quem nunca jogou nada entra com confiança 0 e
  não mexe na pergunta; quem joga muito mas nunca jogou aquela categoria
  entra com a nota geral.
- **Peso** — a base escrita no arquivo pesa como se já viesse de 4 rodadas, e
  nenhuma rodada nova pesa menos de 10%. Uma partida sozinha não leva o número
  para o extremo.
- **Onde a nota não entra** — só o Modo Tempo e as perguntas comuns da
  Escalada comparam a sala com as notas, porque neles todo mundo responde a
  mesma pergunta (as listas da Escalada não têm categoria). No Carrossel e no
  1 é bom 2 ok 3 é demais fica só a conta bruta; leilões e Mais ou Menos
  Pontos nem registram.

É um círculo: a dificuldade mexe na nota, e a nota mexe na dificuldade. O
`testes/circulo.test.js` simula 40 jogadores de força conhecida em 80
perguntas de dificuldade conhecida e confere que ele não desanda:

| | com a nota da sala | sem |
| --- | --- | --- |
| nível médio das perguntas depois de 10 mil e 20 mil rodadas | 43,7 → 44,1 | 44,4 → 44,8 |
| correlação com a dificuldade de verdade | 0,974 | 0,976 |
| difícil jogada só por craques − fácil jogada só por novatos | **13,8** | 5,3 |

As duas últimas perguntas acertam uns 73% cada uma. Sem olhar quem jogou, elas
parecem quase iguais. O peso 50 foi escolhido na mesma simulação: com 0 elas
não se separam, e passando de 80 uma rodada sozinha pesa demais.

Níveis: **Fácil** (<30) · **Média** (<55) · **Difícil** (<75) · **Muito difícil**.

**A dificuldade não altera a pontuação.** Ela ordena o sorteio (a [partida
começa pelas fáceis](#dificuldade-crescente)) e pesa na nota do perfil.

O que foi aprendido vai para a tabela `perguntas_stats` quando há
`DATABASE_URL`, e para `server/dados/estatisticas.json` quando não há. Para
inspecionar, com o servidor no ar:

```bash
curl -s http://localhost:3000/api/dificuldades
```

## Estrutura

```
server/
  index.js       servidor HTTP + Socket.IO, valida tudo que chega do cliente
  sala.js        regras da sala e da partida (estados, pontuação, rodadas, chat)
  comparar.js    normalização e a régua de acerto / quase / chat
  escalada.js    listas de resposta múltipla do Modo Escalada
  banco.js       conexão com o Postgres (só com DATABASE_URL)
  dificuldade.js dificuldade adaptativa e persistência das estatísticas
  questions.js   banco de perguntas por categoria
  musicas.js     duração e estilo de cada música de Ouvir músicas
  dados/         estatísticas acumuladas (criado sozinho)
public/
  index.html     as cinco telas do jogo
  css/style.css  estilo
  js/app.js      cliente: telas, cronômetro, chat, eventos de socket
```

### Estados de uma sala

```
lobby → categoria → pergunta → resultado → (categoria… ou fim)
                                              ↑             │
                                              └─────────────┘
```

Os modos de leilão — **Presente Grego**, **Leilão Geral** e **Dando dicas** —
entram com um estado a mais entre a categoria e a pergunta:

```
lobby → categoria → leilao → pergunta → resultado → …
```

Na **Bagunça**, a rodada sorteada ganha um estado antes da categoria — a tela
da roleta:

```
… resultado → sorteio → categoria → (leilao →) pergunta → resultado → …
```

O líder volta ao saguão pelo botão *Jogar de novo*, mantendo os jogadores.

## Ritmo de uma rodada

```
categoria (2,8s)  ->  [esperando a imagem, até 4s]  ->  pergunta (30s)  ->  resultado  ->  próxima
```

### A imagem chega antes do relógio

Pergunta com imagem (bandeira, foto, logo) manda a imagem **já na tela da
categoria**. O navegador baixa e decodifica escondido, e avisa o servidor
(`rodada:imagemPronta`) quando ela está pronta para aparecer. A pergunta — e o
relógio — só abrem quando **todo mundo** que viu a categoria abrir avisou.

A música de *Ouvir músicas* passa pelo mesmo portão: o aviso vem quando o
áudio já baixou e já está parado no ponto sorteado, pronto para tocar junto com
os outros.

- Quem já estava pronto não espera nada a mais: se todos avisaram dentro dos
  2,8 s, a pergunta abre na hora de sempre.
- Faltando alguém, a tela da categoria fica com *"Carregando a imagem para todo
  mundo… 1 de 2 prontos"* e a barra recomeça. O último aviso abre a pergunta na
  hora; se ele não vier, a sala segue depois de **4 segundos**, para uma
  internet ruim não travar todo mundo.
- Quem entra com a categoria na tela não é esperado, e quem sai deixa de ser.
- Imagem quebrada também avisa: esperar por ela não adiantaria.
- A imagem vai direto no `<img>` da pergunta, ainda escondido. Quando a
  pergunta abre, o navegador não baixa de novo: ela aparece pintada no mesmo
  quadro em que o relógio começa.

Testado com duas abas, uma limitada a 30 kbps: nas três rodadas a sala esperou
de 0,4 a 2,4 s a mais pela aba lenta, e nas duas a imagem já estava pintada
quando a pergunta chegou. `testes/imagem.test.js` cobre o portão.

Cada etapa mostra **quantos segundos faltam, em número**. A rodada não espera o
relógio acabar: assim que **todo mundo acerta**, ela fecha na hora e o resultado
conta **3 segundos** até a próxima pergunta. Quando o tempo acaba com gente sem
acertar, o resultado fica **5 segundos** — quem errou precisa de mais tempo para
ler a resposta.

Os contadores rodam em `setInterval`, não em `requestAnimationFrame`: o
navegador congela os quadros do rAF em aba de segundo plano, e o número parava
no lugar até a pessoa voltar. As barras animam por `transition` do CSS, pelo
mesmo motivo. O relógio que vale continua sendo o do servidor — o da tela é só
para a pessoa se situar.

## Escalada: listas parametrizadas

Duas famílias de pergunta que rendem muito com pouco conteúdo escrito:

**"Começam com a letra X" — geradas sozinhas.** Em vez de escrever *países com
A*, *países com B* uma a uma, cada lista-fonte é fatiada pela primeira letra do
nome. Só vira pergunta a letra que tiver ao menos 4 itens e que não pegue mais
de um quarto da lista — uma letra que abocanha o repertório inteiro anuncia uma
restrição que não restringe. Hoje 29 fontes viram **282 listas automáticas** —
adicionar uma fruta nova ao repertório cria pergunta em todas as letras
afetadas, sem tocar em mais nada.

O recorte pela **última** letra existiu e saiu do jogo: quase todo substantivo
em português acaba em *-a* ou *-o*, então a Escalada vivia caindo nessas duas,
e ninguém organiza vocabulário pelo fim da palavra.

```js
const FONTES_POR_LETRA = [
  ['Cite {n} frutas', 'frutas', 'comidas'],
  ...
];
```

**Elenco, carreira e nacionalidade.** Escritas à mão, porque dependem de dados
que o banco não tem: *jogadores que passaram pelo Barcelona*, *clubes onde
Zlatan jogou*, *jogadores nascidos na França*. A de carreira é naturalmente
fechada — Neymar tem 4 clubes, Zlatan tem 9 — o que dá um bom degrau de
dificuldade entre elas.

## Subcategorias

Uma categoria pode ser dividida em partes escolhidas separadamente — por
exemplo **Anime → Naruto**, **Esportes → NBA** e **Marcas → Carros**. A
máquina serve para qualquer uma:

```js
{ id: 'anime', nome: 'Anime', icone: '🍥', cor: '#ec4899',
  subs: [{ id: 'naruto', nome: 'Naruto', icone: '🌀' }] }
```

As perguntas da parte levam o campo `sub`:

```js
{ pergunta: 'Qual é a vila do Naruto?', sub: 'naruto', resposta: 'Konoha', dif: 30 }
```

Na criação da sala, os chips das partes ficam embaixo da categoria e **começam
todos marcados**:

- **Categoria marcada** vem inteira. Desmarcar uma parte tira só aquela parte
  (vai no campo `fora` da configuração).
- **Categoria desmarcada com parte marcada** traz só aquela parte (campo `subs`).
- Marcar a categoria marca todas as partes dela; desmarcar tira todas.

O servidor revalida tudo (chip inventado é descartado) e recusa a sala se a
escolha não tiver nenhuma pergunta — Marcas, por exemplo, só tem perguntas
dentro das partes.

## Banco de perguntas

**3948 perguntas em 18 categorias**, mais 608 listas para o Modo Escalada. A resposta certa nunca é enviada ao cliente
antes do fim da rodada — quem confere é o servidor.

### Formato

```js
{
  pergunta: 'Quem interpreta Jack Sparrow?',
  resposta: 'Johnny Depp',
  aceita: ['Depp'],        // opcional: outras formas válidas
  dif: 15,                 // opcional: dificuldade inicial 0-100 (padrão 40)
  imagem: 'https://…',     // opcional (ou '/img/arquivo.jpg', de public/img)
  audio: '/audio/….mp3',   // opcional: toca junto com a pergunta
  letra: 'trecho…'         // opcional: mostra um trecho de letra em destaque
}
```

**`aceita` é o que faz o nome completo e o apelido valerem igual** — a regra
vale para toda pergunta cuja resposta é uma pessoa. Quem joga pode escrever o
nome de registro ou o apelido pelo qual a pessoa é conhecida:

```js
{ resposta: 'Lionel Messi',     aceita: ['Messi', 'Leo Messi'] }
{ resposta: 'Cristiano Ronaldo', aceita: ['Ronaldo', 'CR7', 'Cristiano'] }
{ resposta: 'Virgil van Dijk',  aceita: ['van Dijk', 'Dijk'] }
```

Quem é conhecido só pelo apelido entra ao contrário: a resposta oficial é o
apelido e o nome de registro é que vira variante aceita.

```js
{ resposta: 'Kaká',     aceita: ['Ricardo Izecson dos Santos Leite', 'Ricardo Kaká'] }
{ resposta: 'Hulk',     aceita: ['Givanildo Vieira de Sousa', 'Givanildo Vieira'] }
{ resposta: 'Casemiro', aceita: ['Carlos Henrique Casimiro', 'Casimiro'] }
```

### Geografia — mapas de contorno

A parte **Mapas** mostra o globo com um país destacado e pergunta qual é. São
51 países, e a imagem vem do Commons pelo arquivo
`País (orthographic projection).svg`.

O caminho do arquivo no Commons é derivado do MD5 do nome, então a URL é
montada sem consultar a API:

```js
const arquivo = `${pais}_(orthographic_projection).svg`;
const md5 = crypto.createHash('md5').update(arquivo).digest('hex');
// .../commons/thumb/<md5[0]>/<md5[0..1]>/<arquivo>/500px-<arquivo>.png
```

Cinco países ficaram de fora porque o Commons usa outro nome de arquivo para
eles — Argentina, Grécia, Irlanda, Rússia e China dão 404 nesse padrão.

### Categoria Futebol

**162 jogadores, todos com foto.** A lista cobre:

- **os vencedores da Bola de Ouro masculina de 1981 para cá** — Rummenigge,
  Platini, van Basten, Baggio, Ronaldo, Zidane, Figo, Ronaldinho, Kaká, Messi,
  Cristiano Ronaldo, Modrić, Benzema, Rodri;
- **todas as vencedoras da Bola de Ouro feminina** — Ada Hegerberg, Megan
  Rapinoe, Alexia Putellas e Aitana Bonmatí (enunciado *"Quem é esta jogadora?"*);
- os nomes mais conhecidos da década de 2010, por seleção e por liga.

Os vencedores até 1980 saíram de propósito: são fotos em preto e branco de
jogadores que quase ninguém reconhece hoje, e a rodada morria sem acerto. Se
quiser Cruyff, Beckenbauer, Yashin e companhia de volta, eles estão no histórico
do git — o commit que os removeu diz quais foram.

As fotos vêm do **Wikimedia Commons** (licença livre), buscadas pela API da
Wikipédia e gravadas como URL em `questions.js` — nada é baixado para o projeto.
Como são imagens de terceiros, dependem do Commons continuar no ar; o comando
`npm run checar-imagens` percorre todas e avisa se alguma sair.

### Categoria Marcas — logos

**103 logos** em cinco partes: Carros, Tecnologia, Moda e esporte, Comida e
bebida e Outras. O enunciado é sempre *"De quem é este logo?"*. Só entra logo
**sem o nome da marca escrito**: se a palavra está na imagem, a pergunta entrega
a resposta. Pelo mesmo motivo, sigla que aparece no logo (NB, LV, TS) não vale
como resposta.

As imagens ficam em `public/img/logo-*.jpg`, reduzidas para no máximo 480 px.
Na mesma leva entraram os **29 times da NBA e o logo da liga** (Esportes → NBA, *"Qual time da NBA
usa este logo?"*), os escudos de Manchester United e Liverpool no Futebol e o
Snoopy em Cinema & TV. O fundo transparente vira branco: logo preto sobre
transparente sumiria na tela escura do jogo.

### Categoria Ouvir músicas

A categoria **Ouvir músicas** toca **um pedaço sorteado** de uma música — não
é sempre o começo. São 258 músicas, do rock ao sertanejo, ao funk e ao rap
nacional (Yellow, Waka Waka, Billie Jean, Racionais, Djonga, Comunidade
Nin-Jitsu e outras), e cada uma tem **duas perguntas**: *"Qual é o nome desta
música?"* e *"Quem canta esta música?"* — ou *"Qual banda canta…"*, para banda
não ganhar atalho de sobrenome ("Park" valendo por Linkin Park). Em dueto vale
qualquer um dos nomes.

- **O arquivo é a música inteira**, em `public/audio/musica-<nome>.mp3`: MP3 de
  64 kbps mono, todas no mesmo volume (-14 LUFS), uns 1,7 MB por música e 440
  MB no total. A **taxa é fixa** de propósito: com taxa variável o navegador
  pula para um ponto aproximado do meio da música, e cada um ouviria um pedaço
  diferente.
- **Quem sorteia o ponto é o servidor** (`sortearInicio`, em
  [`server/sala.js`](server/sala.js)), para a sala inteira ouvir o mesmo
  pedaço. O sorteio fica longe dos 15 s iniciais (silêncio, a plateia do ao
  vivo) e deixa 10 s de folga no fim, antes do fade-out. A duração de cada
  música mora em [`server/musicas.js`](server/musicas.js).
- **A música toca até o limite da sala** (30 s por padrão) e para sozinha.
  Fora dos modos musicais o relógio da pergunta continua sendo o tempo por
  pergunta: com 20 s de pergunta e limite de 30 s, a rodada acaba antes; com
  45 s de pergunta e limite de 15 s, a música para e a rodada segue.
- **A música chega antes do relógio**, pelo mesmo portão da imagem: na tela da
  categoria o navegador baixa o áudio, pula para o ponto sorteado e avisa que
  está pronto. Sem isso, quem tem a internet lenta ouvia segundos depois dos
  outros — e na Corrida musical perdia por isso.
- **Pausa:** a música para junto e volta do ponto em que estava. Quem tocou no
  "ouvir" depois (autoplay bloqueado) entra no ponto em que a sala está, não
  no começo do pedaço.
- **O primeiro toque na página destrava o som** (um instante de silêncio): o
  iPhone só deixa tocar sozinho um áudio que já tocou dentro de um toque da
  pessoa. Ainda assim, quando o navegador bloqueia, o tocador pede um toque.
- A entrada é suave (600 ms), menos no iPhone, que ignora o volume do áudio.
- **Volume:** o tocador tem um botão de mudo e uma barra. A escolha fica
  guardada no navegador (`pensarapido:volume`), não no perfil: vale para toda
  música dali em diante, da rodada e do trecho das estatísticas, e a entrada
  suave sobe até ela, não até o máximo. A barra é quadrática (o ouvido sente o
  volume em escala, e na reta a metade de baixo seria quase toda alta).
  Arrastar a barra tira o mudo. No iPhone, onde a página não muda o volume do
  áudio, fica só o mudo. No celular o volume desce para uma linha própria,
  senão o tocador passava da tela junto com o aviso "Toque para ouvir".
- A mesma música não toca duas vezes na partida, mesmo tendo duas perguntas.
- O id de cada pergunta continua saindo do nome antigo do arquivo
  (`trecho-<nome>.mp3`): a dificuldade e o rodízio de antes da troca não se
  perdem.
- Os originais ficam em `public/musicas/`, que está no `.gitignore` e **não vai
  para o repositório**. Ali também fica um `catalogo.html`, com a lista das
  músicas e quais já estão no jogo.

**Música nova:** converta o original para `public/audio/musica-<nome>.mp3` (64
kbps, mono, taxa fixa, volume igualado), escreva as duas perguntas em
`questions.js` e acrescente a linha com a duração e o estilo em
`server/musicas.js`. `testes/musicas.test.js` confere que as três coisas
batem.

**Clipe e show vêm com sobra.** Música baixada de clipe ou de DVD costuma ter
cena antes da música, conversa, plateia e créditos. Antes de converter, o que
não é música sai do arquivo: o volume segundo a segundo mostra onde a música
começa e acaba (vinheta e fala ficam bem abaixo da música), e a fração de
instantes de silêncio dentro de cada segundo separa fala (pausa entre as
sílabas) de música (som contínuo). Fala por cima da banda escapa das duas
medidas — em "Detalhes", ao vivo, o corte foi feito a mão. Introdução quieta
de verdade (o violão de Wonderwall) não é sobra: as músicas de álbum ficam
inteiras.

> São músicas com direito autoral. Para jogar entre amigos tudo bem, mas no site
> público as músicas inteiras ficam acessíveis para qualquer um.

### Categoria Música — perguntas de letra

O campo `letra` mostra um trecho em destaque, e o enunciado decide o que se
pergunta sobre ele — *"Qual é o nome desta música?"* ou *"Quem canta/gravou?"*.

**O trecho precisa ter de 4 a 8 versos.** Com uma linha só o jogador não tem de
onde tirar a resposta; passando de oito, o bloco toma a tela e sobra pouco
espaço para a pergunta e o chat.

> **No momento não há nenhuma pergunta de letra no ar.** As que existiam tinham
> uma linha cada e foram retiradas. **Eu não escrevo letras de música** — nem as
> protegidas por direito autoral nem as livres — então os versos precisam ser
> colados por você. O bloco `LETRAS_MUSICA` em `questions.js` está lá, vazio,
> com o formato documentado: é só preencher que elas voltam ao sorteio.

```js
{ pergunta: 'Quem canta esta música?',
  letra: ['primeiro verso',
          'segundo verso',
          'terceiro verso',
          'quarto verso'],
  resposta: 'Nome do artista', aceita: ['apelido'], dif: 40 }
```

Depois de preencher, confira o tamanho:

```bash
npm run checar-letras
```

### Cinema — charadas de emoji

A parte **Emojis** de Cinema & TV conta um filme em emojis, como no quiz de
filmes do canal Aculturados. A charada vai no **fim do enunciado**, e é só
isso que a pergunta precisa:

```js
{ pergunta: 'Que filme estes emojis representam? 🦁👑🌅', sub: 'emojis',
  resposta: 'O Rei Leao', aceita: ['Rei Leao', 'The Lion King'], dif: 15 }
```

O cliente separa os emojis do fim do texto (`EMOJIS_NO_FIM`, em
`public/js/app.js`) e os mostra grandes, numa linha própria. Como eles fazem
parte do enunciado, chegam também a quem lê a pergunta no leilão. A charada
pode formar o nome de uma pessoa em vez de um filme — *"Que ator estes emojis
formam? 🍷⛽"* → **Vin Diesel** —, e aí o sobrenome vale sozinho, como em toda
pergunta que começa por "Que ator".

**Só emoji até o Unicode 12.** O Windows 10 parou nessa versão e desenha os
mais novos (🪨, 🪄, 🫏…) como um quadradinho. Bandeira de país vira duas letras
no Windows (🇺🇸 aparece como "US"), então só entra onde as letras também
servem de pista. `testes/perguntas.test.js` reprova charada com emoji novo
demais, emoji fora do fim do enunciado e filme repetido.

### Cinema — perguntas de dentro da série

A resposta é algo **da própria obra** (personagem, lugar, bordão, número), e o
enunciado abre com o título entre aspas. Os padrões vêm dos quizzes de série
que mais circulam (Racha Cuca, Quizur): parentesco, *quem é o X do título*,
bordão pela metade, número famoso e cidade onde se passa.

```js
{ pergunta: 'Em "Todo Mundo Odeia o Chris", qual e o nome do irmao mais novo de Chris, mais alto e mais popular que ele?',
  sub: 'series', resposta: 'Drew', dif: 25 }
{ pergunta: 'Em "Eu, a Patroa e as Criancas", quem e o "Eu" do titulo, o pai vivido por Damon Wayans?',
  sub: 'series', resposta: 'Michael Kyle', aceita: ['Michael', 'Kyle'], dif: 35 }
{ pergunta: 'Em "Chaves", como termina a desculpa do garoto "Foi sem querer..."?',
  sub: 'series', resposta: 'Querendo', dif: 20 }
```

Enunciado que começa por *Em* não ganha o atalho de sobrenome automático, então
o primeiro nome e o sobrenome do personagem vão escritos no `aceita`. Cuidado
com sobrenome solto ali: ele **tira o atalho de outra pergunta** que tenha o
mesmo sobrenome — *"Cooper"* para Winnie Cooper fazia *"Cooper"* parar de valer
para Sheldon Cooper. Na dúvida, deixe só o primeiro nome.

### Criar uma categoria nova

Acrescente uma entrada em `CATEGORIAS` (com `id`, `nome`, `icone` e `cor`) e uma
lista com o mesmo `id` em `QUESTOES`. O cliente monta a tela de configuração a
partir de `/api/config`, então nada mais precisa mudar.

## Testes

```bash
npm test
```

Cobre a régua de acerto/quase/chat (36 casos), a pontuação por atraso numa
rodada com relógio controlado, o Modo Escalada da rodada 1 à 6 — incluindo a
checagem de que nenhum item correto vaza para o chat —, o Carrossel, o
**Dando dicas** (duplas completas, o lance que desce, a palavra que não vaza,
a dica de uma palavra só e a rodada que paga igual custe 1 ou 10),
**Presente Grego** (formação das equipes, regras do lance, o segredo do
enunciado, as duas pontas do "duvido" e o que acontece quando alguém sai no
meio), o **Leilão Geral** (a pergunta pública, passar o lance, o leilão que
fecha em quem sobrou e as duas contas da pontuação), a **votação para pular** (o teto de metade mais um, o voto que
alterna, as três fases em que vale e o que acontece quando quem votou sai),
as **5 chances por pergunta** (o que gasta, o que não gasta, a resposta certa
que não vale nem vaza depois da última, a rodada que fecha quando ninguém mais
pode pontuar e a chance que não volta ao recarregar a página)
o **círculo entre nota e dificuldade** (a simulação de uma população
inteira, o que entra na conta da sala e o painel do perfil),
a **aba Estatísticas** (os números de cada pergunta, os totais pesados, as
ordens, as páginas e a resposta que não sai),
as **músicas** (arquivo, duração e perguntas que batem, o ponto sorteado longe
do começo e do fim, a Corrida que fecha no primeiro acerto, as quatro opções
honestas do Qual é a música e a partida pelo número de músicas),
a **Bagunça** (o ritmo de Modo Tempo e sorteio, os modos em equipe só com 4
ou mais, só sai o que foi marcado e nunca duas vezes seguidas, as equipes
sorteadas, a Escalada que sobe a cada sorteio e a música que não vaza para o
Modo Tempo)
e a regra de nomes:
percorre as formas de nome dos 162 jogadores, confirma que todas valem como
acerto e falha se algum apelido servir para duas pessoas diferentes (foi assim
que "Silva", "Ronaldo", "Müller", "Costa" e "Martínez" saíram das variantes).

As imagens ficam fora do `npm test` porque dependem da internet:

```bash
npm run checar-imagens
```

Percorre as imagens do banco (fotos de jogadores e bandeiras) e lista as que
saíram do ar. Vai devagar de propósito — o Wikimedia recusa cliente apressado.

## Limites atuais

- As salas vivem **na memória do processo**: reiniciar apaga todas as partidas
  em andamento (as estatísticas de dificuldade sobrevivem).
- Não há reconexão — se a conexão cair, o jogador volta ao saguão e entra de novo.
- Máximo de 12 jogadores por sala; não dá para entrar com a partida em andamento.
- O chat tem limite de 120 caracteres por mensagem e uma pausa de 350ms entre
  mensagens, para conter spam.
