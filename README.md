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
| Categorias | Bandeiras, Geografia, Matemática, Esportes, **Futebol**, Anime (com a parte **Naruto**), Música, **Ouvir músicas** (toca a música), Cinema & TV, História, Ciência, Games, **Mainstream**, **Marcas** |
| Tipo de jogo | **Modo Tempo**, **Escalada**, **Carrossel** (visível ou às cegas), **1 é bom 2 ok 3 é demais**, **Mais ou Menos Pontos**, **Presente Grego**, **Leilão Geral** ou **Dando dicas** (Equipes aparece como *em breve*) |
| Pontuação para vencer | 60 / 90 / 120 / 150 / 200 pts, ou um valor livre entre 20 e 500 |
| Tempo por pergunta | 15s / **20s (padrão)** / 30s / 45s |

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
Render o disco zera a cada deploy**, então o rodízio recomeça do zero lá. Ele
aparece no campo `usos` de `GET /api/dificuldades`.

É diferente do `vezes` da dificuldade adaptativa: lá o contador só anda nas
rodadas que alimentam a dificuldade (leilão e Mais ou Menos Pontos ficam de
fora, de propósito). Aqui conta toda vez que a pergunta entrou, que é o que o
rodízio precisa saber.

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

Os modos de leilão — **Presente Grego**, **Leilão Geral** e **Dando dicas** —
entram com um estado a mais entre a categoria e a pergunta:

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

**3075 perguntas em 18 categorias**, mais 602 listas para o Modo Escalada. A resposta certa nunca é enviada ao cliente
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
**Dando dicas** (duplas completas, o lance que desce, a palavra que não vaza,
a dica de uma palavra só e a rodada que paga igual custe 1 ou 10),
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
