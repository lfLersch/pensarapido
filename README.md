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

### Configuração (só quem cria)

| Ajuste | Opções |
| --- | --- |
| Categorias | Bandeiras, Geografia, Matemática, Esportes, **Futebol**, Anime (com a parte **Naruto**), Música, Cinema & TV, História, Ciência, Games, **Mainstream** |
| Tipo de jogo | **Modo Tempo**, **Escalada**, **Carrossel** (visível ou às cegas) ou **Presente Grego** (Equipes aparece como *em breve*) |
| Pontuação para vencer | 60 / 90 / 120 / 150 / 200 pts, ou um valor livre entre 20 e 500 |
| Tempo por pergunta | 15s / **20s (padrão)** / 30s / 45s |

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

São **212 listas escritas à mão** (mais de 5.800 itens) e outras **318 geradas**
a partir delas — 530 no total. Cobrem futebol, geografia, música, cinema,
séries, anime, games, ciência, história, mitologia, política, esportes e
cultura pop.

Entre as maiores: os **97 vencedores do Oscar de Melhor Filme** (a lista
completa, de *Asas* a *Anora*), **172 atores** e **88 atrizes**
internacionais, **141 artistas com Grammy**, **125 séries**, **119
presidentes e líderes mundiais do século XXI**, **115 cantores sertanejos**
(cada integrante de dupla vale sozinho), **106 personagens da mitologia
grega**, **96 pilotos de Fórmula 1**, **86 artistas de funk**, **79 divas
pop** e **72 ditadores da história**.

### Presente Grego

Joga-se **em duplas**, e a sala precisa de um número **par a partir de 4**. As
duplas são sorteadas quando a partida começa e duram até o fim dela.

Cada rodada tem dois papéis dentro da dupla, e eles **trocam a cada rodada**:

- **🔨 quem leiloa** — vê a pergunta e aposta quantas respostas o parceiro faz;
- **🎁 quem responde** — não vê nada até o leilão acabar.

O enunciado sai do servidor **um a um, só para quem leiloa**. Não é a tela que
esconde: a mensagem nem chega a quem vai responder, então não adianta abrir o
inspetor. Durante o leilão o chat fica trancado para todo mundo — quem leiloa
já leu a pergunta, e uma frase solta entregaria o assunto.

**O leilão.** A palavra passa de dupla em dupla, **15s para cada uma**:

- **cobrir** — apostar qualquer número **maior** que o lance na mesa (de 4 pode
  ir para 5 ou direto para 11);
- **duvidar** — encerrar o leilão e cobrar o último lance. Não dá para duvidar
  antes do primeiro lance nem do próprio lance da dupla.

Deixar o tempo acabar tem dois significados: **sem lance na mesa** o leilão abre
no mínimo (quem começa é obrigado a apostar); **com lance na mesa** vale como
*duvido*, porque ninguém cobriu.

**A entrega.** Fechado o leilão, a pergunta abre para a mesa inteira, mas só
**quem foi desafiado** escreve. A rodada dura `20s + 6s por resposta além da
primeira`, com teto de 120s — o dobro do peso da Escalada, porque aqui é uma
pessoa só digitando a lista sozinha. Errar não elimina: só queima relógio.

**Pontuação: tudo ou nada.** O prêmio é `aposta × 2`, e vai inteiro para uma das
duplas — as duas pessoas dela recebem:

| O que aconteceu | Quem leva |
| --- | --- |
| Entregou as respostas prometidas | a dupla que **apostou** |
| Faltou uma que seja | a dupla que **duvidou** |

Parar a um item do combinado vale o mesmo que parar em zero. É isso que torna o
lance alto tentador e perigoso na mesma medida: apostar 12 e não entregar dá 24
pontos para quem duvidou.

**As listas.** Só entram repertórios com **15 itens ou mais**, e o número some
do enunciado — *"Cite {n} países da África"* vira *"Cite países da África"*,
porque quantas respostas valem é justamente o que o leilão decide. Rodada de
Presente Grego **não alimenta a dificuldade adaptativa**: responde uma pessoa
só, contra um alvo que ela nem escolheu.

Se alguém sai no meio e a rodada fica sem quem responder, ela é **cancelada**
sem ninguém pontuar. Sem duas duplas inteiras, a partida termina.

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

**"Com a letra X" — geradas sozinhas.** Em vez de escrever *países com A*,
*países com B* uma a uma, cada lista-fonte é fatiada pela primeira letra do
nome. Só vira pergunta a letra que tiver ao menos 4 itens; com duas ou três a
rodada alta ficaria impossível. Hoje 14 fontes viram **41 listas automáticas** —
adicionar uma fruta nova ao repertório cria pergunta em todas as letras
afetadas, sem tocar em mais nada.

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

Uma categoria pode ser dividida em partes escolhidas separadamente. Hoje só
**Anime → Naruto** usa isso, mas a máquina serve para qualquer uma:

```js
{ id: 'anime', nome: 'Anime', icone: '🍥', cor: '#ec4899',
  subs: [{ id: 'naruto', nome: 'Naruto', icone: '🌀' }] }
```

As perguntas da parte levam o campo `sub`:

```js
{ pergunta: 'Qual é a vila do Naruto?', sub: 'naruto', resposta: 'Konoha', dif: 30 }
```

Na criação da sala, os chips das partes aparecem embaixo da categoria quando ela
está marcada. **Marcar a categoria sem escolher parte nenhuma traz tudo**;
escolhendo uma ou mais partes, só as perguntas delas entram no sorteio. Marcar
uma parte marca a categoria junto, e o servidor revalida os dois — chip
inventado é descartado.

## Banco de perguntas

**1991 perguntas em 16 categorias**, mais 27 listas para o Modo Escalada. A resposta certa nunca é enviada ao cliente
antes do fim da rodada — quem confere é o servidor.

### Formato

```js
{
  pergunta: 'Quem interpreta Jack Sparrow?',
  resposta: 'Johnny Depp',
  aceita: ['Depp'],        // opcional: outras formas válidas
  dif: 15,                 // opcional: dificuldade inicial 0-100 (padrão 40)
  imagem: 'https://…',     // opcional
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
**Presente Grego** (formação das duplas, regras do lance, o segredo do
enunciado, as duas pontas do "duvido" e o que acontece quando alguém sai no
meio) e a regra de nomes:
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
