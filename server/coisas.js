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
  'Cavalo', 'Tartaruga', 'Coelho', 'Golfinho', 'Panda'
];

module.exports = { COISAS };
