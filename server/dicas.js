'use strict';

/*
 * Banco do modo Veni, Vidi, Vici: uma palavra e tres dicas.
 *
 * As dicas sao **soltas, nao frases**: cada uma e um nome, um lugar ou um
 * detalhe que so faz sentido junto com os outros dois. "Michael Jackson",
 * "Mike Tyson" e "Taffarel" levam a `Luva`; "Kill Bill", "taxi de Nova York"
 * e "Pikachu" levam a `Amarelo`. A graca esta em achar o que liga as tres.
 *
 * Regras para escrever uma entrada nova:
 *
 * - **A dica nunca contem a resposta**, nem em outra forma ("formigueiro"
 *   entrega `Formiga`). `testes/veni.test.js` reprova a que escorregar.
 * - **Tres dicas**, da mais enviesada para a mais direta. Se a primeira ja
 *   entrega sozinha, ela esta no lugar errado.
 * - **Curta**: duas ou tres palavras. Definicao de dicionario estraga o jogo.
 * - **Sem acento**, como no resto do texto do jogo.
 * - `aceita` guarda as outras grafias que valem — a comparacao ja perdoa
 *   acento, maiuscula e pontuacao sozinha.
 */

const PALAVRAS = [
  { resposta: 'Cavalo', dicas: ['Escudo da Ferrari', 'Presente de Troia', 'Pula em L no xadrez'], dif: 25 },
  { resposta: 'Amarelo', dicas: ['Kill Bill', 'Taxi de Nova York', 'Pikachu'], dif: 30 },
  { resposta: 'Luva', dicas: ['Michael Jackson', 'Mike Tyson', 'Taffarel'], dif: 35 },
  { resposta: 'Vermelho', dicas: ['A pilula do Matrix', 'Cartao de expulsao', 'Cor do sangue'], dif: 25 },
  { resposta: 'Lua', dicas: ['Neil Armstrong', 'Lobisomem', 'Mare alta'], dif: 20 },
  { resposta: 'Sol', dicas: ['Icaro', 'Girassol', 'Eclipse'], dif: 20 },
  { resposta: 'Espelho', dicas: ['Madrasta da Branca de Neve', 'Narciso', 'Sete anos de azar'], dif: 30 },
  { resposta: 'Maca', dicas: ['Isaac Newton', 'Guilherme Tell', 'Logo da Apple'], aceita: ['Maçã'], dif: 25 },
  { resposta: 'Coroa', dicas: ['Logo da Rolex', 'Burger King', 'Miss Universo'], dif: 30 },
  { resposta: 'Ouro', dicas: ['Rei Midas', 'Bau de pirata', 'Primeiro lugar'], dif: 20 },
  { resposta: 'Guarda-chuva', dicas: ['Mary Poppins', 'Rihanna', 'Pinguim do Batman'], aceita: ['Guarda chuva', 'Sombrinha'], dif: 30 },
  { resposta: 'Chuva', dicas: ['Gene Kelly dancando', 'Arca de Noe', 'Nuvem carregada'], dif: 20 },
  { resposta: 'Relogio', dicas: ['Coelho de Alice', 'Dali derretendo', 'Suica'], dif: 25 },
  { resposta: 'Coracao', dicas: ['Homem de Lata', 'Emoji vermelho', 'Batida no peito'], dif: 20 },
  { resposta: 'Sombra', dicas: ['Peter Pan', 'Sol a pino', 'Silhueta no chao'], dif: 35 },
  { resposta: 'Dente', dicas: ['Fada do travesseiro', 'Dracula', 'Broca do dentista'], dif: 25 },
  { resposta: 'Osso', dicas: ['Cachorro no quintal', 'Bandeira pirata', 'Raio-x'], dif: 25 },
  { resposta: 'Sino', dicas: ['Quasimodo', 'Treno do Papai Noel', 'Torre da igreja'], dif: 30 },
  { resposta: 'Escada', dicas: ['Led Zeppelin', 'Azar de passar embaixo', 'Degrau e corrimao'], dif: 35 },
  { resposta: 'Ponte', dicas: ['Golden Gate', 'Trol dos contos', 'Rio-Niteroi'], dif: 25 },
  { resposta: 'Bicicleta', dicas: ['E.T. voando', 'Tour de France', 'Pedal e guidao'], dif: 20 },
  { resposta: 'Piano', dicas: ['Tom Hanks no teclado gigante', 'Schroeder do Snoopy', '88 teclas'], dif: 30 },
  { resposta: 'Guitarra', dicas: ['Jimi Hendrix', 'Fender', 'Seis cordas'], dif: 25 },
  { resposta: 'Coringa', dicas: ['Heath Ledger', 'Baralho', 'Gotham'], aceita: ['Curinga', 'Joker'], dif: 25 },
  { resposta: 'Aranha', dicas: ['Peter Parker', 'Teia no canto', 'Oito patas'], dif: 20 },
  { resposta: 'Abelha', dicas: ['Maya', 'Mel', 'Ferrao'], dif: 20 },
  { resposta: 'Elefante', dicas: ['Dumbo', 'Anibal nos Alpes', 'Tromba'], dif: 20 },
  { resposta: 'Tubarao', dicas: ['Spielberg em 1975', 'Barbatana na agua', 'Fileiras de dente'], dif: 25 },
  { resposta: 'Pinguim', dicas: ['Madagascar', 'Antartida', 'Parece de smoking'], dif: 20 },
  { resposta: 'Formiga', dicas: ['A cigarra da fabula', 'Fila indiana', 'Carrega folha'], dif: 20 },
  { resposta: 'Borboleta', dicas: ['Efeito do caos', 'Casulo', 'Nado olimpico'], dif: 30 },
  { resposta: 'Camelo', dicas: ['Saara', 'Corcova', 'Beduino'], dif: 25 },
  { resposta: 'Coruja', dicas: ['Hedwig', 'Cabeca que gira', 'Caca de noite'], dif: 20 },
  { resposta: 'Lobo', dicas: ['Tres porquinhos', 'Romulo e Remo', 'Uivo em bando'], dif: 25 },
  { resposta: 'Leao', dicas: ['Mufasa', 'Abertura da MGM', 'Juba'], dif: 15 },
  { resposta: 'Cobra', dicas: ['Eva no paraiso', 'Simbolo da farmacia', 'Troca de pele'], dif: 20 },
  { resposta: 'Rato', dicas: ['Ratatouille', 'Mickey', 'Queijo na armadilha'], dif: 25 },
  { resposta: 'Pizza', dicas: ['Napoles', 'Tartarugas Ninja', 'Oito fatias'], dif: 15 },
  { resposta: 'Chocolate', dicas: ['Willy Wonka', 'Cacau', 'Ovo de Pascoa'], dif: 15 },
  { resposta: 'Cafe', dicas: ['Starbucks', 'Porto de Santos', 'Expresso'], dif: 20 },
  { resposta: 'Queijo', dicas: ['Tom e Jerry', 'Buraco no desenho', 'Minas'], dif: 20 },
  { resposta: 'Banana', dicas: ['Capa do Velvet Underground', 'Minions', 'Casca escorregadia'], dif: 20 },
  { resposta: 'Batata', dicas: ['Perdido em Marte', 'McDonalds', 'Pure'], dif: 25 },
  { resposta: 'Ovo', dicas: ['Humpty Dumpty', 'Veio antes da galinha', 'Gema e clara'], dif: 15 },
  { resposta: 'Gelo', dicas: ['Titanic', 'Elsa', 'Zero grau'], dif: 15 },
  { resposta: 'Fogo', dicas: ['Prometeu', 'Dragao', 'Bombeiro'], dif: 20 },
  { resposta: 'Vento', dicas: ['Moinho de Dom Quixote', 'Furacao', 'Vela do barco'], dif: 30 },
  { resposta: 'Deserto', dicas: ['Pequeno Principe', 'Duna', 'Miragem'], dif: 25 },
  { resposta: 'Ilha', dicas: ['Robinson Crusoe', 'Napoleao em Santa Helena', 'Cercada de agua'], dif: 25 },
  { resposta: 'Farol', dicas: ['Navio na costa', 'Torre listrada', 'Alto do carro'], dif: 35 },
  { resposta: 'Navio', dicas: ['Titanic', 'Moby Dick', 'Proa e ancora'], dif: 20 },
  { resposta: 'Foguete', dicas: ['Apollo 11', 'SpaceX', 'Contagem regressiva'], dif: 25 },
  { resposta: 'Trem', dicas: ['Plataforma nove e tres quartos', 'Revolucao Industrial', 'Trilho e locomotiva'], dif: 20 },
  { resposta: 'Bussola', dicas: ['Jack Sparrow', 'Rosa dos ventos', 'Agulha no norte'], dif: 35 },
  { resposta: 'Mapa', dicas: ['X do tesouro', 'Dora', 'Escala e legenda'], dif: 25 },
  { resposta: 'Livro', dicas: ['Gutenberg', 'Biblioteca de Alexandria', 'Capa e pagina'], dif: 15 },
  { resposta: 'Telefone', dicas: ['Graham Bell', 'Disco de girar', 'Alguem ligando'], dif: 15 },
  { resposta: 'Camera', dicas: ['Kodak', 'Paparazzo', 'Lente e flash'], dif: 25 },
  { resposta: 'Espada', dicas: ['Excalibur', 'Zorro', 'Lamina e bainha'], dif: 25 },
  { resposta: 'Escudo', dicas: ['Capitao America', 'Perseu contra a Medusa', 'Camisa do time'], dif: 30 },
  { resposta: 'Anel', dicas: ['Frodo', 'Campeao da NBA', 'Dedo do casamento'], dif: 25 },
  { resposta: 'Chapeu', dicas: ['Seletora de Hogwarts', 'Indiana Jones', 'Coelho do magico'], dif: 30 },
  { resposta: 'Palhaco', dicas: ['O filme de 2017', 'Nariz vermelho', 'Picadeiro'], dif: 20 },
  { resposta: 'Circo', dicas: ['Cirque du Soleil', 'Lona listrada', 'Trapezio'], dif: 25 },
  { resposta: 'Cinema', dicas: ['Oscar', 'Irmaos Lumiere', 'Pipoca no escuro'], dif: 15 },
  { resposta: 'Carnaval', dicas: ['Sapucai', 'Rei Momo', 'Trio eletrico'], dif: 20 },
  { resposta: 'Natal', dicas: ['Grinch', 'Papai Noel', '25 de dezembro'], dif: 15 },
  { resposta: 'Sonho', dicas: ['Freud', 'A Origem, do Nolan', 'Doce com creme'], dif: 30 },
  { resposta: 'Tempo', dicas: ['Cronos', 'Cura tudo', 'Ampulheta'], dif: 35 },
  { resposta: 'Silencio', dicas: ['Simon e Garfunkel', 'Um minuto em homenagem', 'Regra da biblioteca'], dif: 40 },
  { resposta: 'Dinheiro', dicas: ['Pink Floyd', 'Nao nasce em arvore', 'Cedula e moeda'], dif: 20 },
  { resposta: 'Diamante', dicas: ['Lucy in the Sky', 'Mais duro da natureza', 'Anel de noivado'], dif: 30 },
  { resposta: 'Bola', dicas: ['Wilson do Tom Hanks', '32 gomos', 'Quica e rola'], dif: 20 },
  { resposta: 'Dado', dicas: ['A sorte esta lancada', 'Banco Imobiliario', 'Seis faces'], dif: 35 },
  { resposta: 'Carta', dicas: ['Carteiro', 'Truco', 'Selo e envelope'], dif: 30 },
  { resposta: 'Estrela', dicas: ['Bandeira dos Estados Unidos', 'Reis Magos', 'Cinco pontas'], dif: 25 },
  { resposta: 'Arco-iris', dicas: ['Pote de ouro', 'Over the Rainbow', 'Sete cores'], aceita: ['Arco iris'], dif: 25 },
  { resposta: 'Cerebro', dicas: ['Pinky', 'Vinte por cento da energia', 'Dentro do cranio'], dif: 30 },
  { resposta: 'Sangue', dicas: ['Dracula', 'Tipo O negativo', 'Corre na veia'], dif: 25 },
  { resposta: 'Agua', dicas: ['Moises abrindo o mar', 'H2O', 'Ferve a 100 graus'], dif: 15 },
  { resposta: 'Areia', dicas: ['Ampulheta', 'Vidro derretido', 'Praia e deserto'], dif: 30 },
  { resposta: 'Vulcao', dicas: ['Pompeia', 'Montanha da Perdicao', 'Lava e cratera'], dif: 25 },
  { resposta: 'Montanha', dicas: ['Everest', 'Sisifo', 'Pico nevado'], dif: 20 },
  { resposta: 'Floresta', dicas: ['Chapeuzinho Vermelho', 'Amazonia', 'Arvore sem fim'], dif: 20 },
  { resposta: 'Neve', dicas: ['Boneco de cenoura', 'Floco unico', 'Inverno branco'], dif: 20 },
  { resposta: 'Praia', dicas: ['Copacabana', 'Guarda-sol', 'Areia e mar'], dif: 15 },
  { resposta: 'Xadrez', dicas: ['Kasparov', 'Xeque-mate', '64 casas'], dif: 25 },
  { resposta: 'Futebol', dicas: ['Copa do Mundo', 'Pele', 'Onze de cada lado'], dif: 10 },
  { resposta: 'Boxe', dicas: ['Rocky Balboa', 'Muhammad Ali', 'Ringue e gongo'], dif: 20 },
  { resposta: 'Oculos', dicas: ['Harry Potter', 'John Lennon', 'Lente e armacao'], dif: 20 },
  { resposta: 'Sapato', dicas: ['Cinderela', 'Dorothy batendo tres vezes', 'Cadarco e sola'], dif: 20 },
  { resposta: 'Cadeira', dicas: ['Jogo da danca', 'Nome do diretor atras', 'Quatro pes e encosto'], dif: 25 },
  { resposta: 'Chave', dicas: ['Ben Franklin na pipa', 'Fundo da bolsa', 'Fechadura'], dif: 25 },
  { resposta: 'Janela', dicas: ['Microsoft', 'Gato olhando a rua', 'Vidro e cortina'], dif: 30 },
  { resposta: 'Cama', dicas: ['Bicho-papao embaixo', 'Protesto dos Beatles', 'Colchao e travesseiro'], dif: 25 },
  { resposta: 'Porta', dicas: ['Monstros S.A.', 'Olho magico', 'Macaneta'], dif: 25 },
  { resposta: 'Leite', dicas: ['Pires do gato', 'Vaca', 'Vira queijo'], dif: 15 },
  { resposta: 'Fantasma', dicas: ['Ghostbusters', 'Pac-Man', 'Lencol branco'], dif: 25 },
  { resposta: 'Zumbi', dicas: ['Thriller', 'The Walking Dead', 'Anda atras de cerebro'], dif: 25 },
  { resposta: 'Robo', dicas: ['R2-D2', 'As tres leis', 'Metal programado'], aceita: ['Robô'], dif: 25 },
  { resposta: 'Ovelha', dicas: ['Contar para dormir', 'Dolly clonada', 'La e be'], dif: 25 },
  { resposta: 'Barba', dicas: ['Papai Noel', 'Hipster', 'Navalha do barbeiro'], dif: 30 },
  { resposta: 'Sereia', dicas: ['Ariel', 'Odisseu amarrado ao mastro', 'Meia mulher, meio peixe'], dif: 25 },
  { resposta: 'Trovao', dicas: ['Thor', 'Vem depois do relampago', 'Barulho da tempestade'], dif: 30 },
  { resposta: 'Ponte aerea', dicas: ['Rio e Sao Paulo', 'Congonhas e Santos Dumont', 'Voo de uma hora'], aceita: ['Ponte-aerea'], dif: 45 },
  { resposta: 'Gol', dicas: ['Maracana em 1950', 'Carrinho da Volkswagen', 'Rede balancando'], dif: 30 },
  { resposta: 'Coqueiro', dicas: ['Ilha de desenho animado', 'Agua de coco', 'Arvore da praia'], dif: 35 }
];

module.exports = { PALAVRAS };
