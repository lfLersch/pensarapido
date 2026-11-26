'use strict';

/**
 * Mais listas para a Escalada, o Carrossel e o Presente Grego.
 *
 * Mesmo formato de escalada.js (que junta estas as dele). Todas tem pelo
 * menos 20 itens: o Carrossel pede uma lista grande, porque a roda gira ate
 * sobrar um e nao pode acabar a resposta antes disso.
 */
const LISTAS_NOVAS = [
  {
    pergunta: 'Cite {n} racas de cachorro',
    tema: 'animais', dif: 30,
    respostas: [
      'Labrador', ['Golden Retriever', 'Golden'], 'Poodle', 'Pastor Alemao',
      ['Bulldog Ingles', 'Buldogue Ingles'], ['Bulldog Frances', 'Buldogue Frances'], 'Pug',
      ['Shih Tzu', 'Shitzu'], ['Yorkshire', 'Yorkshire Terrier'], 'Chihuahua',
      ['Dachshund', 'Salsicha', 'Teckel', 'Cofap'], 'Beagle', 'Rottweiler', ['Pitbull', 'Pit Bull'],
      ['Husky Siberiano', 'Husky'], 'Border Collie', 'Dalmata', ['Doberman', 'Dobermann'], 'Boxer',
      'Chow Chow', 'Akita', ['Shiba Inu', 'Shiba'], 'Maltes', 'Lhasa Apso', 'Pinscher',
      ['Lulu da Pomerania', 'Spitz Alemao', 'Spitz'], 'Sao Bernardo', 'Dogue Alemao',
      ['Fila Brasileiro', 'Fila'], 'Schnauzer', ['Cocker Spaniel', 'Cocker'], ['Basset Hound', 'Basset'],
      'Galgo', 'Pastor Belga', ['Boiadeiro Bernes', 'Bernese'], 'Samoieda', 'Weimaraner',
      'Bull Terrier', ['Jack Russell', 'Jack Russell Terrier'], 'Corgi', ['Cavalier King Charles', 'Cavalier'],
      'Mastiff', 'Collie', ['Vira-lata', 'Viralata', 'SRD', 'Caramelo']
    ]
  },
  {
    pergunta: 'Cite {n} dinossauros ou repteis pre-historicos',
    tema: 'ciencia', dif: 40,
    respostas: [
      ['Tiranossauro Rex', 'T-Rex', 'Tiranossauro', 'Tyrannosaurus'], ['Velociraptor', 'Raptor'],
      'Triceratops', ['Estegossauro', 'Stegosaurus'], ['Braquiossauro', 'Brachiosaurus'],
      ['Diplodoco', 'Diplodocus'], ['Pterodactilo', 'Pterodactyl'], ['Pteranodonte', 'Pteranodon'],
      ['Espinossauro', 'Spinosaurus'], ['Anquilossauro', 'Ankylosaurus'],
      ['Parassaurolofo', 'Parasaurolophus'], ['Alossauro', 'Allosaurus'], ['Iguanodonte', 'Iguanodon'],
      ['Giganotossauro', 'Giganotosaurus'], ['Carnotauro', 'Carnotaurus'],
      ['Argentinossauro', 'Argentinosaurus'], ['Paquicefalossauro', 'Pachycephalosaurus'],
      ['Dilofossauro', 'Dilophosaurus'], ['Compsognato', 'Compsognathus'], ['Galimimo', 'Gallimimus'],
      ['Mosassauro', 'Mosasaurus'], ['Plesiossauro', 'Plesiosaurus'],
      ['Apatossauro', 'Apatosaurus', 'Brontossauro', 'Brontosaurus'], 'Oviraptor',
      ['Deinonico', 'Deinonychus'], ['Ceratossauro', 'Ceratosaurus'], ['Barionix', 'Baryonyx'],
      ['Terizinossauro', 'Therizinosaurus'], ['Estauricossauro', 'Staurikosaurus'],
      ['Ictiossauro', 'Ichthyosaurus'], ['Edmontossauro', 'Edmontosaurus']
    ]
  },
  {
    pergunta: 'Cite {n} filmes da Pixar',
    tema: 'cinema', dif: 35,
    respostas: [
      ['Toy Story', 'Toy Story 2', 'Toy Story 3', 'Toy Story 4'], 'Vida de Inseto',
      ['Monstros S.A.', 'Monstros SA', 'Monsters Inc'], 'Procurando Nemo',
      ['Os Incriveis', 'Incriveis', 'Os Incriveis 2'], ['Carros', 'Cars', 'Carros 2', 'Carros 3'],
      'Ratatouille', ['WALL-E', 'Wall E'], ['Up', 'Up Altas Aventuras'], ['Valente', 'Brave'],
      'Universidade Monstros', ['Divertida Mente', 'Inside Out', 'Divertida Mente 2'],
      ['O Bom Dinossauro', 'Bom Dinossauro'], 'Procurando Dory', ['Viva', 'Viva A Vida e uma Festa', 'Coco'],
      ['Dois Irmaos', 'Onward'], 'Soul', 'Luca', ['Red Crescer e uma Fera', 'Red', 'Turning Red'],
      'Lightyear', ['Elementos', 'Elemental'], 'Elio'
    ]
  },
  {
    pergunta: 'Cite {n} filmes de animacao da Disney',
    tema: 'cinema', dif: 30,
    respostas: [
      ['Branca de Neve', 'Branca de Neve e os Sete Anoes'], 'Pinoquio', 'Fantasia', 'Dumbo', 'Bambi',
      'Cinderela', ['Alice no Pais das Maravilhas', 'Alice'], 'Peter Pan', 'A Dama e o Vagabundo',
      'A Bela Adormecida', ['101 Dalmatas', 'Cento e Um Dalmatas'], 'A Espada era a Lei',
      ['Mogli', 'Mogli o Menino Lobo'], ['Aristogatas', 'Os Aristogatas'], 'Robin Hood',
      'A Pequena Sereia', 'A Bela e a Fera', ['Aladdin', 'Aladim'], 'O Rei Leao', 'Pocahontas',
      'O Corcunda de Notre Dame', 'Hercules', 'Mulan', 'Tarzan', 'A Nova Onda do Imperador',
      ['Lilo e Stitch', 'Lilo & Stitch', 'Stitch'], 'Irmao Urso', 'A Princesa e o Sapo',
      ['Enrolados', 'Rapunzel'], 'Detona Ralph', ['Frozen', 'Frozen Uma Aventura Congelante'],
      ['Operacao Big Hero', 'Big Hero 6', 'Big Hero'], 'Zootopia', 'Moana', 'Encanto',
      ['Raya e o Ultimo Dragao', 'Raya'], ['Wish', 'Wish O Poder dos Desejos'],
      ['Atlantis', 'Atlantis O Reino Perdido'], 'O Planeta do Tesouro', ['Bolt', 'Bolt Supercao']
    ]
  },
  {
    pergunta: 'Cite {n} escritores brasileiros',
    tema: 'historia', dif: 40,
    respostas: [
      'Machado de Assis', 'Jorge Amado', ['Clarice Lispector', 'Clarice'],
      ['Carlos Drummond de Andrade', 'Drummond', 'Carlos Drummond'], 'Cecilia Meireles',
      'Monteiro Lobato', 'Graciliano Ramos', ['Guimaraes Rosa', 'Joao Guimaraes Rosa'],
      'Jose de Alencar', 'Manuel Bandeira', ['Vinicius de Moraes', 'Vinicius'],
      ['Rachel de Queiroz', 'Raquel de Queiroz'], 'Erico Verissimo', 'Luis Fernando Verissimo',
      'Paulo Coelho', 'Ariano Suassuna', 'Castro Alves', 'Goncalves Dias', 'Aluisio Azevedo',
      'Lima Barreto', 'Euclides da Cunha', 'Oswald de Andrade', 'Mario de Andrade', 'Olavo Bilac',
      'Alvares de Azevedo', 'Cora Coralina', 'Ferreira Gullar', 'Rubem Alves', 'Rubem Fonseca',
      ['Lygia Fagundes Telles', 'Ligia Fagundes Telles'], 'Mario Quintana',
      ['Joao Cabral de Melo Neto', 'Joao Cabral'], 'Conceicao Evaristo', 'Ziraldo', 'Ruth Rocha',
      'Ana Maria Machado', 'Augusto Cury', 'Paulo Leminski', 'Nelson Rodrigues',
      'Carolina Maria de Jesus', 'Raul Pompeia', 'Gregorio de Matos', 'Thalita Reboucas'
    ]
  },
  {
    pergunta: 'Cite {n} escritores estrangeiros',
    tema: 'historia', dif: 40,
    respostas: [
      ['William Shakespeare', 'Shakespeare'], ['Miguel de Cervantes', 'Cervantes'],
      ['J. R. R. Tolkien', 'Tolkien'], ['J. K. Rowling', 'JK Rowling'], 'Stephen King',
      'Agatha Christie', 'Jane Austen', 'Charles Dickens', 'Victor Hugo', ['Liev Tolstoi', 'Tolstoi', 'Tolstoy'],
      ['Fiodor Dostoievski', 'Dostoievski', 'Dostoevsky'], ['Franz Kafka', 'Kafka'],
      ['Gabriel Garcia Marquez', 'Gabo'], 'Ernest Hemingway', 'George Orwell', 'Mark Twain',
      'Edgar Allan Poe', 'Dante Alighieri', 'Homero', 'Goethe', 'Jose Saramago', 'Fernando Pessoa',
      ['Luis de Camoes', 'Camoes'], 'Julio Verne', 'Arthur Conan Doyle', 'C. S. Lewis', 'Dan Brown',
      'Oscar Wilde', 'H. P. Lovecraft', 'Mary Shelley', 'Bram Stoker', ['Antoine de Saint-Exupery', 'Saint-Exupery'],
      'Alexandre Dumas', 'Rick Riordan', 'John Green', 'George R. R. Martin', 'Suzanne Collins',
      'Virginia Woolf', 'Jorge Luis Borges', 'Isabel Allende', 'Haruki Murakami', ['Nicolau Maquiavel', 'Maquiavel']
    ]
  },
  {
    pergunta: 'Cite {n} tipos de danca',
    tema: 'musica', dif: 30,
    respostas: [
      'Samba', 'Forro', ['Funk', 'Passinho'], 'Frevo', 'Axe', 'Valsa', 'Tango', 'Salsa',
      ['Ballet', 'Bale'], ['Hip Hop', 'Danca de rua'], ['Break', 'Breakdance', 'Breaking'], 'Zumba', 'Bolero',
      'Lambada', 'Maracatu', 'Flamenco', 'Sapateado', ['Jazz', 'Danca jazz'], 'Danca do ventre',
      'Kizomba', 'Bachata', 'Merengue', 'Rumba', ['Cha-cha-cha', 'Chachacha'], ['Quadrilha', 'Quadrilha junina'],
      'Carimbo', 'Xaxado', ['Samba de gafieira', 'Gafieira'], ['Vanerao', 'Vanera'], 'Swing',
      'Charleston', 'Polca', 'Pole dance', 'Danca contemporanea', 'Ciranda', 'Twerk', 'Lundu',
      'Bumba meu boi', 'Catira', 'Danca de salao'
    ]
  },
  {
    pergunta: 'Cite {n} times da NFL',
    tema: 'esportes', dif: 55,
    respostas: [
      ['Arizona Cardinals', 'Cardinals'], ['Atlanta Falcons', 'Falcons'], ['Baltimore Ravens', 'Ravens'],
      ['Buffalo Bills', 'Bills'], ['Carolina Panthers', 'Panthers'], ['Chicago Bears', 'Bears'],
      ['Cincinnati Bengals', 'Bengals'], ['Cleveland Browns', 'Browns'], ['Dallas Cowboys', 'Cowboys'],
      ['Denver Broncos', 'Broncos'], ['Detroit Lions', 'Lions'], ['Green Bay Packers', 'Packers'],
      ['Houston Texans', 'Texans'], ['Indianapolis Colts', 'Colts'], ['Jacksonville Jaguars', 'Jaguars'],
      ['Kansas City Chiefs', 'Chiefs'], ['Las Vegas Raiders', 'Raiders'],
      ['Los Angeles Chargers', 'Chargers'], ['Los Angeles Rams', 'Rams'], ['Miami Dolphins', 'Dolphins'],
      ['Minnesota Vikings', 'Vikings'], ['New England Patriots', 'Patriots'],
      ['New Orleans Saints', 'Saints'], ['New York Giants', 'Giants'], ['New York Jets', 'Jets'],
      ['Philadelphia Eagles', 'Eagles'], ['Pittsburgh Steelers', 'Steelers'],
      ['San Francisco 49ers', '49ers'], ['Seattle Seahawks', 'Seahawks'],
      ['Tampa Bay Buccaneers', 'Buccaneers', 'Bucs'], ['Tennessee Titans', 'Titans'],
      ['Washington Commanders', 'Commanders']
    ]
  },
  {
    pergunta: 'Cite {n} personagens do folclore brasileiro',
    tema: 'historia', dif: 35,
    respostas: [
      'Saci', 'Curupira', ['Iara', 'Mae d\'agua', 'Mae dagua'], 'Boitata', 'Mula sem cabeca',
      ['Boto cor-de-rosa', 'Boto'], 'Lobisomem', 'Cuca', 'Caipora', 'Negrinho do Pastoreio',
      'Mapinguari', ['Bicho-papao', 'Bicho papao'], 'Corpo-seco', 'Pisadeira', ['Boi-bumba', 'Bumba meu boi'],
      'Matinta Pereira', 'Comadre Fulozinha', ['Cabra-cabriola', 'Cabra cabriola'], 'Mae do ouro',
      'Homem do saco', 'Vitoria-regia', 'Papa-figo'
    ]
  },
  {
    pergunta: 'Cite {n} deuses da mitologia nordica, egipcia ou romana',
    tema: 'historia', dif: 45,
    respostas: [
      'Odin', 'Thor', 'Loki', ['Freya', 'Freyja'], ['Frigga', 'Frigg'], ['Balder', 'Baldur'], 'Heimdall',
      'Tyr', 'Hel', 'Njord', 'Ra', 'Osiris', 'Isis', 'Anubis', 'Horus', 'Seth', 'Bastet', 'Thoth', 'Hathor',
      'Sobek', ['Amon', 'Amon-Ra'], 'Ptah', 'Jupiter', 'Marte', 'Venus', 'Minerva', 'Netuno', 'Plutao',
      'Mercurio', 'Cupido', 'Diana', 'Juno', 'Vulcano', 'Baco', 'Saturno', 'Ceres', 'Vesta', 'Jano'
    ]
  },
  {
    pergunta: 'Cite {n} jogos de tabuleiro ou de cartas',
    tema: 'gerais', dif: 25,
    respostas: [
      'Xadrez', ['Dama', 'Damas'], ['Banco Imobiliario', 'Monopoly'], 'War', ['Detetive', 'Clue'],
      'Jogo da Vida', 'Uno', 'Truco', ['Poquer', 'Poker'], 'Buraco', 'Domino', 'Ludo',
      ['Scrabble', 'Palavras cruzadas'], 'Imagem e Acao', 'Cara a Cara', 'Batalha Naval', 'Pife', 'Paciencia',
      'Gamao', 'Mahjong', 'Catan', 'Jenga', 'Perfil', 'Twister', 'Resta Um', 'Super Trunfo', 'Cacheta',
      ['Blackjack', 'Vinte e um'], 'Canastra', 'Sueca', 'Tranca', ['Dixit'], 'Ticket to Ride', 'Combate',
      'Stop', 'Tapa Certo', 'Rummikub', 'Jogo da Velha', 'Mico', 'Copas'
    ]
  },
  {
    pergunta: 'Cite {n} brincadeiras de crianca',
    tema: 'gerais', dif: 25,
    respostas: [
      ['Esconde-esconde', 'Pique-esconde', 'Esconde esconde'], ['Pega-pega', 'Pique-pega', 'Pega pega'],
      'Amarelinha', 'Cabra-cega', 'Queimada', 'Pular corda', ['Bolinha de gude', 'Gude'],
      ['Pipa', 'Papagaio', 'Soltar pipa'], ['Peao', 'Piao'], ['Pular elastico', 'Elastico'], 'Estatua',
      'Batata quente', 'Telefone sem fio', 'Passa anel', ['Cinco Marias', 'Saquinho'], 'Corre cotia',
      'Ciranda', ['Policia e ladrao', 'Pega-ladrao'], ['Taco', 'Bets', 'Bete'],
      ['Adedonha', 'Stop', 'Adedanha'], 'Vivo ou morto', 'Danca das cadeiras', 'Rouba-bandeira',
      'Mae da rua', 'Lenco atras', 'Morto-vivo', 'Seu mestre mandou', 'Escravos de Jo', 'Gato mia',
      'Carrinho de rolima', 'Balanco', 'Gangorra', 'Escorregador', 'Casinha', 'Boneca'
    ]
  },
  {
    pergunta: 'Cite {n} partes de um carro',
    tema: 'objetos', dif: 25,
    respostas: [
      'Volante', 'Pneu', 'Motor', 'Freio', 'Embreagem', ['Cambio', 'Marcha'], 'Capo', 'Porta-malas',
      'Para-brisa', 'Retrovisor', 'Farol', 'Lanterna', 'Banco', 'Cinto de seguranca', 'Buzina', 'Bateria',
      'Radiador', 'Escapamento', 'Para-choque', 'Limpador de para-brisa', 'Airbag', 'Painel',
      'Velocimetro', 'Tanque de combustivel', 'Roda', 'Estepe', 'Porta', 'Vidro', 'Freio de mao',
      'Suspensao', 'Amortecedor', 'Acelerador', 'Chassi', 'Calota', 'Antena', 'Ar-condicionado',
      'Radio', 'Ignicao', 'Pedal', 'Alternador', 'Carburador', 'Teto solar', 'Placa'
    ]
  },
  {
    pergunta: 'Cite {n} tipos de queijo',
    tema: 'comidas', dif: 35,
    respostas: [
      ['Mussarela', 'Mucarela', 'Muçarela'], 'Prato', 'Parmesao', ['Minas', 'Queijo minas', 'Minas frescal'],
      'Coalho', 'Cheddar', 'Gorgonzola', 'Brie', 'Camembert', 'Provolone', 'Ricota', 'Cottage', 'Gouda',
      'Edam', ['Emmental', 'Suico'], 'Roquefort', 'Mascarpone', 'Feta', 'Burrata', 'Canastra',
      ['Reino', 'Queijo do reino'], 'Pecorino', 'Grana Padano', 'Manchego', 'Gruyere', 'Cream cheese',
      'Requeijao', 'Catupiry', 'Serra da Estrela', 'Colonial', 'Queijo branco', 'Halloumi',
      'Mussarela de bufala', 'Tilsit', 'Raclette'
    ]
  },
  {
    pergunta: 'Cite {n} legumes ou verduras',
    tema: 'comidas', dif: 20,
    respostas: [
      'Alface', 'Tomate', 'Cenoura', 'Batata', 'Cebola', 'Alho', 'Abobrinha', ['Abobora', 'Jerimum'],
      'Berinjela', 'Brocolis', 'Couve', 'Couve-flor', 'Repolho', 'Espinafre', 'Rucula', 'Agriao',
      'Pepino', 'Pimentao', 'Beterraba', 'Chuchu', 'Quiabo', 'Jilo', ['Mandioca', 'Aipim', 'Macaxeira'],
      'Inhame', 'Batata-doce', 'Vagem', 'Ervilha', 'Milho', 'Rabanete', 'Nabo', 'Acelga', 'Almeirao',
      'Chicoria', ['Salsao', 'Aipo'], 'Alho-poro', 'Maxixe', ['Mandioquinha', 'Batata-baroa'], 'Cara',
      'Gengibre', 'Palmito', 'Aspargo', 'Alcachofra', 'Cogumelo', 'Couve-de-bruxelas', 'Salsinha',
      'Cebolinha', 'Coentro'
    ]
  },
  {
    pergunta: 'Cite {n} peixes',
    tema: 'animais', dif: 30,
    respostas: [
      'Tilapia', 'Salmao', 'Atum', 'Sardinha', 'Bacalhau', 'Pirarucu', 'Tambaqui', 'Pintado', 'Dourado',
      'Tucunare', 'Pacu', 'Lambari', 'Traira', 'Piranha', 'Robalo', 'Merluza', 'Pescada', 'Corvina',
      'Badejo', 'Garoupa', 'Linguado', 'Truta', 'Carpa', 'Bagre', 'Tainha', 'Anchova', 'Cavala',
      'Peixe-espada', ['Peixe-palhaco', 'Nemo'], 'Tubarao', ['Arraia', 'Raia'], 'Cavalo-marinho',
      'Baiacu', 'Moreia', 'Enguia', ['Kinguio', 'Peixinho dourado'], ['Betta', 'Peixe-beta'],
      'Barracuda', 'Marlim', 'Acara', 'Surubim', 'Peixe-voador'
    ]
  },
  {
    pergunta: 'Cite {n} meios de transporte',
    tema: 'gerais', dif: 15,
    respostas: [
      'Carro', 'Onibus', ['Moto', 'Motocicleta'], ['Bicicleta', 'Bike'], 'Aviao', 'Helicoptero', 'Navio',
      'Barco', 'Trem', 'Metro', 'Caminhao', 'Taxi', 'Bonde', 'Patinete', 'Skate', ['Balao', 'Balao de ar quente'],
      'Submarino', 'Foguete', 'Jet ski', 'Lancha', 'Canoa', 'Caiaque', 'Teleferico', 'Van', 'Trator',
      'Carroca', 'Cavalo', 'Charrete', 'Ambulancia', 'Triciclo', 'Monotrilho', 'VLT', 'Jangada', 'Iate',
      'Planador', ['Dirigivel', 'Zepelim'], 'Patins', 'Mototaxi', 'Uber', 'Cruzeiro', 'Balsa'
    ]
  },
  {
    pergunta: 'Cite {n} coisas que tem em um aeroporto',
    tema: 'lugares', dif: 25,
    respostas: [
      'Aviao', 'Pista', 'Torre de controle', ['Portao de embarque', 'Portao'], ['Esteira de bagagem', 'Esteira'],
      'Mala', 'Passaporte', ['Cartao de embarque', 'Bilhete', 'Passagem'], ['Raio-x', 'Raio x'],
      'Detector de metal', ['Check-in', 'Balcao de check-in'], ['Free shop', 'Duty free'],
      ['Sala de embarque', 'Sala de espera'], 'Piloto', ['Comissario de bordo', 'Aeromoca', 'Comissaria'],
      'Policia Federal', 'Alfandega', ['Painel de voos', 'Painel'], 'Carrinho de bagagem', 'Banheiro',
      'Lanchonete', 'Restaurante', 'Estacionamento', 'Taxi', 'Escada rolante', 'Elevador', 'Hangar',
      'Caixa eletronico', 'Casa de cambio', 'Loja', 'Cadeira', 'Seguranca', ['Finger', 'Ponte de embarque'],
      'Balanca', 'Etiqueta de bagagem', 'Achados e perdidos', 'Cafeteria', 'Tomada', 'Wi-fi',
      'Imigracao', 'Travesseiro de pescoco'
    ]
  },
  {
    pergunta: 'Cite {n} coisas que tem em um estadio de futebol',
    tema: 'futebol', dif: 20,
    respostas: [
      'Gramado', ['Trave', 'Gol', 'Baliza'], 'Bola', 'Arquibancada', 'Torcida', ['Juiz', 'Arbitro'],
      ['Bandeirinha', 'Assistente', 'Auxiliar'], 'Placar', 'Vestiario', 'Banco de reservas',
      ['Tecnico', 'Treinador'], 'Jogador', 'Goleiro', 'Bandeira', 'Ingresso', 'Catraca', 'Camarote',
      'Cadeira', ['Refletor', 'Holofote'], 'Telao', 'Cachorro-quente', 'Pipoca', 'Refrigerante', 'Policia',
      'Ambulancia', 'Gandula', 'Rede', 'Marca do penalti', 'Grande area', 'Tunel', 'Cabine de imprensa',
      'Camera', 'Narrador', 'Mascote', 'Apito', 'Cartao amarelo', 'Cartao vermelho', 'VAR', 'Uniforme',
      'Chuteira', 'Escanteio', 'Faixa', 'Sinalizador'
    ]
  },
  {
    pergunta: 'Cite {n} campeoes de League of Legends',
    tema: 'games', dif: 45,
    respostas: [
      'Ahri', 'Akali', 'Alistar', 'Amumu', 'Annie', 'Ashe', 'Aatrox', 'Blitzcrank', 'Brand', 'Braum',
      'Caitlyn', 'Darius', 'Diana', 'Draven', 'Ekko', 'Ezreal', 'Fiora', 'Fizz', 'Garen', 'Gragas',
      'Graves', 'Irelia', 'Janna', ['Jarvan IV', 'Jarvan'], 'Jax', 'Jhin', 'Jinx', ['Kai\'Sa', 'Kaisa'],
      'Karma', 'Karthus', 'Katarina', 'Kayle', 'Kayn', 'Kennen', 'Kindred', 'LeBlanc', 'Lee Sin',
      'Leona', 'Lucian', 'Lulu', 'Lux', 'Malphite', 'Master Yi', 'Miss Fortune', 'Mordekaiser',
      'Morgana', 'Nami', 'Nasus', 'Nautilus', 'Nidalee', 'Orianna', 'Pyke', 'Rammus', 'Renekton',
      'Rengar', 'Riven', 'Ryze', 'Senna', 'Sett', 'Shaco', 'Sion', 'Sona', 'Soraka', 'Swain', 'Syndra',
      'Talon', 'Teemo', 'Thresh', 'Tristana', 'Tryndamere', 'Twisted Fate', 'Twitch', 'Varus', 'Vayne',
      'Veigar', 'Viego', 'Viktor', 'Vladimir', 'Volibear', 'Warwick', 'Wukong', 'Xayah', 'Yasuo',
      'Yone', 'Yuumi', 'Zed', 'Ziggs', 'Zyra', 'Zilean', 'Evelynn', 'Ivern', 'Kled', 'Rakan', 'Samira'
    ]
  },
  {
    pergunta: 'Cite {n} tenistas famosos',
    tema: 'esportes', dif: 40,
    respostas: [
      'Roger Federer', 'Rafael Nadal', 'Novak Djokovic', 'Serena Williams', 'Venus Williams', 'Andre Agassi',
      'Pete Sampras', ['Gustavo Kuerten', 'Guga'], 'Maria Sharapova', 'Andy Murray', 'Carlos Alcaraz',
      'Jannik Sinner', 'Daniil Medvedev', 'Steffi Graf', 'Martina Navratilova', 'Bjorn Borg',
      'John McEnroe', 'Boris Becker', 'Iga Swiatek', 'Naomi Osaka', 'Aryna Sabalenka', 'Coco Gauff',
      'Stefanos Tsitsipas', 'Alexander Zverev', 'Dominic Thiem', 'Juan Martin del Potro', 'Stan Wawrinka',
      'Monica Seles', 'Kim Clijsters', 'Justine Henin', ['Bia Haddad Maia', 'Beatriz Haddad Maia', 'Bia Haddad'],
      'Joao Fonseca', 'Maria Esther Bueno', 'Ivan Lendl', 'Jimmy Connors', 'Andy Roddick',
      'Lleyton Hewitt', 'Nick Kyrgios', 'Casper Ruud', 'Martina Hingis'
    ]
  },
  {
    pergunta: 'Cite {n} lutadores de MMA',
    tema: 'esportes', dif: 45,
    respostas: [
      'Anderson Silva', 'Jose Aldo', ['Junior Cigano', 'Cigano', 'Junior dos Santos'], 'Vitor Belfort',
      ['Lyoto Machida', 'Lyoto'], ['Mauricio Shogun', 'Shogun'], ['Rodrigo Minotauro', 'Minotauro', 'Rodrigo Nogueira'],
      'Wanderlei Silva', 'Amanda Nunes', ['Charles do Bronx', 'Charles Oliveira', 'do Bronx'],
      ['Alex Poatan', 'Alex Pereira', 'Poatan'], 'Glover Teixeira', 'Deiveson Figueiredo', 'Ronda Rousey',
      'Conor McGregor', ['Khabib Nurmagomedov', 'Khabib'], 'Jon Jones', ['Georges St-Pierre', 'GSP'],
      'Israel Adesanya', 'Francis Ngannou', 'Daniel Cormier', 'Chuck Liddell', 'Brock Lesnar',
      'Valentina Shevchenko', 'Max Holloway', 'Dustin Poirier', 'Nate Diaz', 'Nick Diaz', 'Islam Makhachev',
      'Alexander Volkanovski', 'Royce Gracie', ['Cris Cyborg', 'Cyborg', 'Cristiane Justino'], 'Fabricio Werdum',
      'Rafael dos Anjos', 'Jessica Andrade', ['Gilbert Durinho', 'Durinho', 'Gilbert Burns'], 'Tom Aspinall',
      'Sean O\'Malley'
    ]
  },
  {
    pergunta: 'Cite {n} grupos de K-pop',
    tema: 'musica', dif: 45,
    respostas: [
      'BTS', 'Blackpink', 'Twice', 'EXO', 'Stray Kids', 'Seventeen', 'NewJeans', 'Red Velvet', 'Big Bang',
      ['Girls\' Generation', 'Girls Generation', 'SNSD'], 'Super Junior', ['TXT', 'Tomorrow X Together'],
      'Enhypen', 'Aespa', 'Itzy', ['(G)I-dle', 'GIDLE', 'I-dle'], ['Le Sserafim', 'Lesserafim'], 'Ateez',
      'NCT', 'Mamamoo', '2NE1', 'Shinee', 'Monsta X', 'Got7', 'IVE', 'Babymonster', 'Illit', 'Kiss of Life',
      'Treasure', 'Riize', 'Wonder Girls', 'Kara', 'f(x)', 'Apink', 'Loona'
    ]
  },
  {
    pergunta: 'Cite {n} rappers internacionais',
    tema: 'musica', dif: 40,
    respostas: [
      'Eminem', 'Drake', ['Kanye West', 'Kanye', 'Ye'], ['Jay-Z', 'Jay Z'], 'Kendrick Lamar',
      ['Tupac', '2Pac', 'Tupac Shakur'], ['Notorious B.I.G.', 'Notorious BIG', 'Biggie'], 'Snoop Dogg',
      ['Dr. Dre', 'Dr Dre'], '50 Cent', 'Lil Wayne', 'Travis Scott', 'Nicki Minaj', 'Cardi B',
      ['J. Cole', 'J Cole'], 'Post Malone', 'Ice Cube', 'Nas', 'Lil Nas X', 'Future', 'Lil Uzi Vert',
      'Megan Thee Stallion', 'Doja Cat', ['A$AP Rocky', 'ASAP Rocky'], ['Tyler, the Creator', 'Tyler the Creator'],
      'Juice WRLD', 'XXXTentacion', 'Pop Smoke', '21 Savage', 'Childish Gambino', 'Missy Elliott',
      'Busta Rhymes', 'Wiz Khalifa', 'Pitbull', 'Lauryn Hill', 'Ludacris', 'Nelly', 'Ice-T', 'Coolio',
      'Mac Miller', 'Playboi Carti', 'Lil Baby', 'Logic'
    ]
  },
  {
    pergunta: 'Cite {n} rappers ou grupos de rap brasileiros',
    tema: 'musica', dif: 40,
    respostas: [
      ['Racionais MCs', 'Racionais'], 'Mano Brown', 'Emicida', 'Criolo', 'Sabotage', 'Marcelo D2', 'Projota',
      'Rashid', 'Djonga', 'BK', ['Matue', 'Matuê'], ['Filipe Ret', 'Ret'], 'L7nnon', 'Orochi',
      ['Baco Exu do Blues', 'Baco'], ['Xama', 'Xamã'], 'Gabriel o Pensador', 'MV Bill', 'Thaide',
      'Black Alien', 'Haikaiss', 'Froid', 'Teto', 'Veigh', 'Major RD', 'Tasha e Tracie', 'Karol Conka',
      'Negra Li', 'Drik Barbosa', 'Sant', 'Kamau', 'Planet Hemp', 'Faccao Central', 'Cone Crew',
      'Hungria', 'Kayblack', 'Recayd Mob', 'Tz da Coronel',
      'Bivolt', 'Rincon Sapiencia'
    ]
  }
];

module.exports = { LISTAS_NOVAS };
