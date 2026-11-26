'use strict';

/*
 * Eu te conheço: as coisas que a sala rankeia.
 *
 * Cada rodada sorteia 5 daqui, misturadas: comida com programa, lugar com
 * mania. A graca esta justamente em comparar banana com laranja — "banho
 * gelado" contra "pizza com borda" so tem resposta pessoal, e e essa resposta
 * que os outros tem que adivinhar.
 *
 * O que entra aqui precisa dividir opiniao. "Ser feliz" todo mundo poe em
 * primeiro, e ai nao ha o que adivinhar.
 */
const COISAS = [
  // Comidas
  'Hambúrguer', 'Pizza com borda recheada', 'Sushi', 'Churrasco', 'Lasanha',
  'Feijoada', 'Pastel de feira', 'Coxinha', 'Açaí', 'Brigadeiro',
  'Pão de queijo', 'Miojo', 'Salada', 'Cachorro-quente', 'Tapioca',
  'Strogonoff', 'Batata frita', 'Sorvete', 'Chocolate amargo', 'Pipoca de cinema',
  'Comida mexicana', 'Fast food', 'Café da manhã de hotel', 'Torta de limão',
  'Bolo de cenoura', 'Macarrão com salsicha', 'Arroz com feijão', 'Peixe', 'Fígado acebolado',
  'Comida da vó', 'Marmita', 'Rodízio de carne', 'Pudim', 'Nutella de colher',
  'Pizza de abacaxi', 'Pão francês quentinho', 'Cuscuz', 'Esfiha', 'Panqueca',
  // Bebidas
  'Café', 'Refrigerante', 'Suco natural', 'Chimarrão', 'Água de coco',
  'Chocolate quente', 'Energético', 'Milkshake', 'Chá gelado', 'Caldo de cana',
  // Programas e passeios
  'Praia', 'Piscina', 'Cachoeira', 'Acampar', 'Parque de diversões',
  'Cinema', 'Show ao vivo', 'Shopping', 'Balada', 'Festa junina',
  'Viagem da escola', 'Viagem de avião', 'Viagem de carro', 'Museu', 'Zoológico',
  'Estádio de futebol', 'Karaokê', 'Boliche', 'Festa de aniversário',
  'Ano-novo na praia', 'Natal em família', 'Carnaval', 'Escape room', 'Trilha na montanha',
  'Fazenda', 'Neve', 'Cruzeiro', 'Disney', 'Feira de domingo',
  // Atividades
  'Jogar bola', 'Jogar videogame', 'Jogar cartas', 'Jogo de tabuleiro', 'Andar de bicicleta',
  'Nadar', 'Academia', 'Correr', 'Dançar', 'Cantar no chuveiro',
  'Cozinhar', 'Ler um livro', 'Maratonar série', 'Ver filme de terror', 'Ver novela',
  'Assistir futebol', 'Tirar foto', 'Desenhar', 'Tocar violão', 'Fazer compras',
  'Lavar louça', 'Arrumar o quarto', 'Passear com o cachorro', 'Ir ao mercado', 'Lavar o carro',
  'Pescar', 'Andar de skate', 'Fazer yoga', 'Montar quebra-cabeça',
  // Situações e manias
  'Banho gelado', 'Banho quente demorado', 'Dormir até tarde', 'Acordar cedo', 'Cochilo da tarde',
  'Dia de chuva', 'Dia de sol forte', 'Frio', 'Calor', 'Vento na cara',
  'Andar de mãos dadas', 'Abraço apertado', 'Cafuné', 'Mensagem de bom dia', 'Ligação de vídeo',
  'Áudio de 5 minutos', 'Surpresa', 'Ganhar presente', 'Dar presente', 'Elogio',
  'Silêncio', 'Música alta', 'Casa cheia', 'Ficar sozinho', 'Conversar até de madrugada',
  'Pegar trânsito', 'Fila de banco', 'Segunda-feira', 'Sexta-feira à noite', 'Domingo à tarde',
  'Férias', 'Feriado prolongado', 'Primeiro dia de aula', 'Último dia de aula', 'Prova surpresa',
  'Acordar sem despertador', 'Cheiro de chuva', 'Cheiro de livro novo', 'Pé na areia', 'Rede na varanda',
  // Objetos
  'Celular', 'Fone de ouvido', 'Travesseiro', 'Cobertor', 'Chinelo',
  'Moletom', 'Óculos de sol', 'Mochila', 'Patinete',
  'Controle remoto', 'Caderno novo', 'Caneta colorida', 'Relógio',
  'Perfume', 'Boné', 'Tênis novo', 'Pijama', 'Ventilador',
  // Bichos
  'Cachorro', 'Gato', 'Peixinho', 'Passarinho', 'Hamster',
  'Cavalo', 'Tartaruga', 'Coelho', 'Golfinho', 'Panda',
  'Papagaio', 'Porquinho-da-índia', 'Pinguim', 'Coruja', 'Borboleta',
  'Leão', 'Elefante', 'Girafa', 'Macaco', 'Capivara',
  // Mais comidas
  'Picanha', 'Frango assado de domingo', 'Pão com ovo', 'Misto-quente', 'Acarajé',
  'Moqueca', 'Baião de dois', 'Escondidinho', 'Nhoque', 'Risoto',
  'Ramen', 'Yakisoba', 'Temaki', 'Taco mexicano', 'Kebab',
  'Batata recheada', 'Pamonha', 'Canjica', 'Paçoca', 'Pé de moleque',
  'Bolo de chocolate', 'Cheesecake', 'Petit gâteau', 'Sonho de padaria', 'Churros',
  'Waffle', 'Panetone', 'Rabanada', 'Ovo de Páscoa', 'Brigadeiro de panela',
  'Pipoca doce', 'Algodão-doce', 'Maçã do amor', 'Picolé', 'Gelatina',
  'Comida de avião', 'Comida de hospital', 'Buffet por quilo', 'Rodízio de pizza', 'Café colonial',
  'Pizza fria no café da manhã', 'Ovo frito com gema mole', 'Abacate com açúcar', 'Quiabo', 'Jiló',
  'Coentro', 'Uva-passa no arroz', 'Azeitona', 'Pimenta', 'Comida apimentada',
  // Mais bebidas
  'Leite com Nescau', 'Vitamina de banana', 'Limonada', 'Guaraná', 'Mate gelado',
  'Iogurte', 'Água com gás', 'Café gelado', 'Smoothie', 'Chá de camomila',
  // Mais programas e lugares
  'Lanchonete de esquina', 'Restaurante chique', 'Feira de artesanato', 'Show de stand-up', 'Teatro',
  'Circo', 'Aquário', 'Planetário', 'Pescaria', 'Piquenique',
  'Churrasco com a família', 'Festa à fantasia', 'Casamento', 'Formatura', 'Chá de bebê',
  'Viagem para a praia', 'Viagem para o interior', 'Viagem internacional', 'Mochilão', 'Hotel fazenda',
  'Resort com tudo incluso', 'Casa de praia', 'Sítio do avô', 'Cidade grande', 'Cidade pequena',
  'Parque aquático', 'Kart', 'Paintball', 'Tirolesa', 'Montanha-russa',
  'Roda-gigante', 'Trem-fantasma', 'Pular de paraquedas', 'Mergulho', 'Passeio de barco',
  'Show de fogos', 'Desfile de escola de samba', 'Bloco de carnaval', 'Rave', 'Pagode com os amigos',
  'Bar com música ao vivo', 'Noite de jogos', 'Noite do pijama', 'Encontro às cegas', 'Viagem sozinho',
  // Mais atividades
  'Jogar vôlei', 'Jogar tênis', 'Jogar xadrez', 'Jogar truco', 'Jogar no celular',
  'Assistir anime', 'Ver vídeo no YouTube', 'Rolar o feed', 'Ouvir podcast', 'Ler mangá',
  'Fazer bolo', 'Fazer churrasco', 'Cuidar de plantas', 'Fazer tricô', 'Pintar quadro',
  'Escrever diário', 'Estudar para prova', 'Fazer trabalho em grupo', 'Apresentar trabalho', 'Falar em público',
  'Dirigir', 'Andar de patins', 'Surfar', 'Escalar', 'Lutar',
  'Meditar', 'Tomar sol', 'Fazer as unhas', 'Cortar o cabelo', 'Fazer faxina',
  'Passar roupa', 'Organizar o guarda-roupa', 'Ir ao dentista', 'Tomar vacina', 'Ir ao médico',
  'Fazer amigos novos', 'Mandar meme', 'Responder e-mail', 'Postar foto', 'Gravar dancinha',
  // Mais situações e manias
  'Chegar atrasado', 'Chegar muito cedo', 'Planejar tudo', 'Improvisar', 'Ganhar no jogo',
  'Perder no jogo', 'Pedir comida por aplicativo', 'Cozinhar para os outros', 'Lavar o cabelo', 'Secar o cabelo',
  'Manhã de sábado', 'Noite de domingo', 'Véspera de feriado', 'Aniversário', 'Dia dos namorados',
  'Natal', 'Páscoa', 'Halloween', 'Festa surpresa', 'Viajar de madrugada',
  'Ficar sem internet', 'Bateria do celular acabando', 'Esquecer a senha', 'Perder o ônibus', 'Pisar no Lego',
  'Acordar com barulho', 'Dormir com a TV ligada', 'Dormir de meia', 'Dormir de janela aberta', 'Ar-condicionado gelado',
  'Ouvir a mesma música no repeat', 'Spoiler', 'Final de novela', 'Último episódio da série', 'Fila de show',
  'Ganhar elogio no trabalho', 'Tirar nota boa', 'Receber carta', 'Encontrar dinheiro no bolso', 'Achar vaga na porta',
  // Mais objetos
  'Videogame', 'Notebook', 'Tablet', 'Caixinha de som', 'Câmera fotográfica',
  'Livro de papel', 'Kindle', 'Garrafa térmica', 'Canivete', 'Guarda-chuva',
  'Bicicleta', 'Skate', 'Violão', 'Bola de futebol', 'Baralho',
  'Rede de dormir', 'Sofá', 'Cama de casal', 'Almofada', 'Vela aromática',
  'Planta em vaso', 'Quadro na parede', 'Tapete felpudo', 'Luminária', 'Cafeteira',
  // Academia
  'Dia de perna', 'Treino de peito', 'Treino de CrossFit', 'Musculação', 'Aula de spinning',
  'Treinar às 6 da manhã', 'Treinar à noite', 'Whey depois do treino', 'Dieta com frango e batata-doce', 'Burpee',
  'Esteira', 'Agachamento', 'Supino', 'Abdominal', 'Personal trainer',
  'Foto no espelho da academia', 'Academia lotada', 'Treino de funcional', 'Pilates', 'Dor muscular no dia seguinte'
];

module.exports = { COISAS };
