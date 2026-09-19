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
o código —, e dá para entrar com um clique, sem ninguém ditar o código. Só
aparecem salas esperando gente ou entre uma partida e outra: partida rolando
não aceita ninguém. A lista vem de `GET /api/salas` e se atualiza sozinha a
cada 4 segundos enquanto o saguão está na tela.

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
| Categorias | Bandeiras, Geografia, Matemática, Esportes, **Futebol**, Anime (com a parte **Naruto**), Música, **Ouvir músicas** (toca a música), Cinema & TV, História, Ciência, Games, **Mainstream**, **Marcas** |
| Tipo de jogo | **Modo Tempo**, **Escalada**, **Carrossel** (visível ou às cegas), **Veni, Vidi, Vici**, **Mais ou Menos Pontos**, **Presente Grego** ou **Leilão Geral** (Equipes aparece como *em breve*) |
| Pontuação para vencer | 60 / 90 / 120 / 150 / 200 pts, ou um valor livre entre 20 e 500 |
| Tempo por pergunta | 15s / **20s (padrão)** / 30s / 45s |

### Sala de espera

Enquanto ninguém aperta *Iniciar*, a sala mostra quem já chegou. O **líder**
(quem criou a sala, ou quem herdou o posto se ele saiu) tem um **✕ ao lado de
cada pessoa** para tirá-la da sala — vale em todos os modos, e quem é tirado
volta para o saguão com um aviso.

No **Presente Grego** a lista vira duas, uma por equipe, com o botão de trocar
de lado embaixo de cada uma (ver [Presente Grego](#presente-grego)).

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

> **Onde fica a fronteira:** *menos* de 10% é acerto, então 10% exatos já contam
> como "quase". Numa resposta de 10 letras, 1 letra errada dá exatamente 10% e
> cai no "quase". Para aceitar esse caso, troque `<` por `<=` em `LIMITE_CERTO`.

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
- Não existe punição por errar: dá para tentar quantas vezes quiser até o tempo acabar.
- A rodada fecha quando todos acertam ou quando o tempo acaba.
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

Uma **lista em ordem** — os 60 países mais populosos, as 50 maiores cidades do
Brasil, os 30 filmes de maior bilheteria. **A posição é a pontuação**:

| Resposta | Vale |
| --- | --- |
| o 1º da lista | **1 ponto** |
| o 30º da lista | **30 pontos** |
| o último da lista | **o tamanho dela** |
| qualquer coisa fora da lista | **0** |

Dizer *Índia* nos países mais populosos rende 1 ponto; lembrar da *Romênia*, que
fecha a lista, rende 60. O óbvio quase não pontua, e o nome que ninguém lembra
vale uma rodada inteira — daí o nome do modo.

Duas regras seguram a esperteza:

- **Cada pessoa responde uma vez por rodada.** A primeira resposta que bate na
  lista é a que conta; depois dela o chat fica só para conversa.
- **Resposta que já saiu não conta de novo.** O acerto vai público no chat com
  a posição ("Mogi das Cruzes — 50º da lista"), então copiar do vizinho devolve
  *"já foi dito"*.

No fim da rodada a mesa vê o **topo da lista** e até onde ia a pontuação. Como
uma rodada dessas não tem "resposta certa" única, ela **não alimenta a
dificuldade adaptativa**.

As listas ficam em [`server/rankings.js`](server/rankings.js), cada uma com a
**fonte e o ano** anotados — a ordem é o que vale, então atualizar significa
trocar a lista inteira, nunca um item no meio.

### Veni, Vidi, Vici

Uma palavra e **três dicas**, que entram uma por terço da rodada. A rodada dura
**50% a mais** que a da sala (30s na configuração padrão), então cada dica fica
uns 10 segundos sozinha na tela antes de a próxima aparecer.

| Quando acertou | Vale |
| --- | --- |
| ainda na 1ª dica | **10** |
| na 2ª dica | **6** |
| na 3ª dica | **3** |

Desconta **1 ponto para cada pessoa que acertou antes**, como no Modo Tempo, e
o acerto nunca vale menos que 1. Quem erra continua tentando até o tempo acabar.

**A dica é solta, não é frase.** Cada uma é um nome ou um detalhe que só fecha
junto com os outros dois: *Michael Jackson · Mike Tyson · Taffarel* levam a
**Luva**; *Kill Bill · táxi de Nova York · Pikachu* levam a **Amarelo**. A
primeira é a mais enviesada e a terceira é a que chega mais perto — definição de
dicionário estraga o jogo.

O banco fica em [`server/dicas.js`](server/dicas.js), com **107 palavras**. As
regras estão no topo do arquivo, e `testes/veni.test.js` cobra as duas
principais: **a dica nunca pode conter a resposta**, nem em outra forma (foi
assim que "formigueiro" saiu da dica de *Formiga*), e **nenhuma dica passa de
cinco palavras**.

### Presente Grego

Joga-se em **duas equipes**, a partir de 4 pessoas na sala. As equipes aparecem
na sala de espera, uma ao lado da outra: quem entra cai na menor e pode mudar de
lado no botão embaixo da lista, enquanto a partida não começou.

**Cada equipe leva metade da sala, mais uma pessoa** — com 4 ou 5 na sala, até
3; com 6 ou 7, até 4. A folga de um permite time desigual (3 contra 2), e o teto
impede a sala inteira de ficar do mesmo lado, o que deixaria o leilão sem
adversário. Para começar, **cada equipe precisa de pelo menos duas pessoas**.

Cada rodada tem dois papéis dentro da equipe, e eles **giram a cada rodada** —
numa equipe de três, em três rodadas cada um leiloa uma vez:

- **🔨 quem leiloa** — vê a pergunta e aposta quantas respostas o colega faz;
- **🎁 quem responde** — não vê nada até o leilão acabar.

O enunciado sai do servidor **um a um, só para quem leiloa**. Não é a tela que
esconde: a mensagem nem chega a quem vai responder, então não adianta abrir o
inspetor. Durante o leilão o chat fica trancado para todo mundo — quem leiloa
já leu a pergunta, e uma frase solta entregaria o assunto.

**O leilão.** A palavra passa de uma equipe para a outra, **6s para cada**:

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

**O leilão.** A palavra passa de pessoa em pessoa, 6s para cada, e na sua vez
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
4. Perguntas de bandeira e de futebol mostram a imagem; as de música mostram um
   trecho da letra em destaque.
5. O placar e o chat ficam ao lado (no celular, acima e abaixo da pergunta).
6. No fim da rodada aparecem a resposta certa, as outras formas aceitas, a
   dificuldade da pergunta e quem pontuou.

## Dificuldade adaptativa

Toda pergunta tem um campo `dif` (0 a 100) em `questions.js`, que é só o **ponto
de partida**. Depois de cada rodada o servidor recalcula:

- quanto **menos gente acerta**, mais a dificuldade **sobe** (peso 0,65);
- quanto **mais demoram** para acertar, mais ela **sobe** (peso 0,35).

O valor novo entra por média móvel, e a base escrita no arquivo pesa como se já
viesse de 4 rodadas — assim uma única partida não joga o número para o extremo.

Níveis: **Fácil** (<30) · **Média** (<55) · **Difícil** (<75) · **Muito difícil**.

**A dificuldade não altera a pontuação.** Ela existe para separar perguntas por
nível depois — montar salas "só fácil", equilibrar rodadas, ou eventualmente
pontuar. O valor já está pronto em [`server/dificuldade.js`](server/dificuldade.js).

O que foi aprendido fica em `server/dados/estatisticas.json` e sobrevive a
reinícios. Para inspecionar, com o servidor no ar:

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
  dificuldade.js dificuldade adaptativa e persistência das estatísticas
  questions.js   banco de perguntas por categoria
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

O **Presente Grego** entra com um estado a mais entre a categoria e a pergunta:

```
lobby → categoria → leilao → pergunta → resultado → …
```

O líder volta ao saguão pelo botão *Jogar de novo*, mantendo os jogadores.

## Ritmo de uma rodada

```
categoria (2,8s)  ->  pergunta (30s)  ->  resultado  ->  próxima
```

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

**2666 perguntas em 18 categorias**, mais 602 listas para o Modo Escalada. A resposta certa nunca é enviada ao cliente
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

A categoria **Ouvir músicas** toca os 40 primeiros segundos de uma música. São 93
músicas, do rock ao sertanejo e ao funk (Yellow, Waka Waka, Billie Jean, Racionais e
outras), e cada trecho tem **duas perguntas**: *"Qual é o nome desta música?"* e
*"Quem canta esta música?"* — ou *"Qual banda canta…"*, para banda não ganhar
atalho de sobrenome ("Park" valendo por Linkin Park). Em dueto vale qualquer um
dos dois nomes.

- Os arquivos inteiros (FLAC, dezenas de MB cada) ficam em `public/musicas/`,
  que está no `.gitignore` e **não vai para o repositório**.
- O jogo usa só os trechos, em `public/audio/trecho-*.mp3` (MP3 de 112 kbps,
  ~550 KB cada, todos no mesmo volume e com entrada e saída suaves).
- O trecho é sempre o começo da música, de 0:00 a 0:40 (Wish You Were Here, de 0:17 a 0:57). Dá para trocar o de
  qualquer música por outro ponto, escolhendo o segundo na mão.
- Quando o navegador bloqueia o som automático, o tocador pede um toque.

> São músicas com direito autoral. Para jogar entre amigos tudo bem, mas no site
> público os trechos ficam acessíveis para qualquer um.

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
**Presente Grego** (formação das equipes, regras do lance, o segredo do
enunciado, as duas pontas do "duvido" e o que acontece quando alguém sai no
meio), o **Leilão Geral** (a pergunta pública, passar o lance, o leilão que
fecha em quem sobrou e as duas contas da pontuação), a **votação para pular** (o teto de metade mais um, o voto que
alterna, as três fases em que vale e o que acontece quando quem votou sai)
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
