'use strict';

/*
 * As musicas da categoria Ouvir musicas: quanto cada uma dura e de que estilo e.
 *
 * O arquivo de cada uma e a musica inteira, em `public/audio/musica-<nome>.mp3`
 * (MP3 de 64 kbps mono, taxa fixa, todas no mesmo volume). A taxa fixa nao e
 * capricho: com taxa variavel o navegador pula para um ponto aproximado do
 * meio da musica, e cada um ouviria um pedaco diferente.
 *
 * - `duracao`, em segundos, e o que a sala usa para sortear de que ponto a
 *   musica toca sem cair no silencio do comeco nem passar do fim.
 * - `estilo` escolhe as opcoes erradas do Qual e a musica: "Negro Drama" ao
 *   lado de "Shape of You" se acertaria sem ouvir nada.
 *
 * Musica nova: converta o original para `public/audio/musica-<nome>.mp3`,
 * escreva as duas perguntas dela em questions.js (o nome e quem canta) e
 * acrescente a linha aqui. `testes/musicas.test.js` confere que as tres
 * coisas batem.
 */

const ESTILOS = {
  pop: 'Pop internacional',
  rock: 'Rock internacional',
  hiphop: 'Rap internacional',
  sertanejo: 'Sertanejo',
  funk: 'Funk',
  rap: 'Rap nacional',
  nacional: 'Pop e rock nacional'
};

const MUSICAS = {
  // pop
  'as-it-was': { duracao: 167.3, estilo: 'pop' },
  'baby': { duracao: 214.0, estilo: 'pop' },
  'bang-bang': { duracao: 199.4, estilo: 'pop' },
  'billie-jean': { duracao: 294.2, estilo: 'pop' },
  'birds-of-a-feather': { duracao: 210.4, estilo: 'pop' },
  'blinding-lights': { duracao: 200.1, estilo: 'pop' },
  'cant-take-my-eyes-off-you': { duracao: 203.3, estilo: 'pop' },
  'dai-dai': { duracao: 223.5, estilo: 'pop' },
  'die-with-a-smile': { duracao: 251.7, estilo: 'pop' },
  'dont-start-now': { duracao: 183.3, estilo: 'pop' },
  'dtmf': { duracao: 237.2, estilo: 'pop' },
  'envolver': { duracao: 193.8, estilo: 'pop' },
  'firework': { duracao: 227.9, estilo: 'pop' },
  'flowers': { duracao: 200.7, estilo: 'pop' },
  'found-a-way': { duracao: 181.7, estilo: 'pop' },
  'good-4-u': { duracao: 178.2, estilo: 'pop' },
  'hips-dont-lie': { duracao: 218.4, estilo: 'pop' },
  'hot-n-cold': { duracao: 223.3, estilo: 'pop' },
  'it-aint-me': { duracao: 220.8, estilo: 'pop' },
  'kiss-kiss': { duracao: 250.7, estilo: 'pop' },
  'leave-it-all-to-me': { duracao: 158.5, estilo: 'pop' },
  'love-yourself': { duracao: 233.8, estilo: 'pop' },
  'night-changes': { duracao: 226.6, estilo: 'pop' },
  'perfect': { duracao: 263.4, estilo: 'pop' },
  'photograph': { duracao: 259.0, estilo: 'pop' },
  'poker-face': { duracao: 237.1, estilo: 'pop' },
  'sadness-and-sorrow': { duracao: 165.1, estilo: 'pop' },
  'shape-of-you': { duracao: 233.8, estilo: 'pop' },
  'someone-you-loved': { duracao: 182.2, estilo: 'pop' },
  'starboy': { duracao: 230.5, estilo: 'pop' },
  'stay': { duracao: 141.8, estilo: 'pop' },
  'steal-my-girl': { duracao: 228.2, estilo: 'pop' },
  'story-of-my-life': { duracao: 245.5, estilo: 'pop' },
  'the-climb': { duracao: 236.1, estilo: 'pop' },
  'the-one-that-got-away': { duracao: 227.4, estilo: 'pop' },
  'thinking-out-loud': { duracao: 281.6, estilo: 'pop' },
  'umbrella': { duracao: 274.4, estilo: 'pop' },
  'waka-waka': { duracao: 202.7, estilo: 'pop' },
  'what-makes-you-beautiful': { duracao: 198.9, estilo: 'pop' },
  'wrecking-ball': { duracao: 221.4, estilo: 'pop' },
  // rock
  'a-sky-full-of-stars': { duracao: 267.9, estilo: 'rock' },
  'american-idiot': { duracao: 176.6, estilo: 'rock' },
  'back-in-black': { duracao: 256.1, estilo: 'rock' },
  'believer': { duracao: 204.4, estilo: 'rock' },
  'dont-look-back-in-anger': { duracao: 290.7, estilo: 'rock' },
  'heat-waves': { duracao: 238.9, estilo: 'rock' },
  'highway-to-hell': { duracao: 208.1, estilo: 'rock' },
  'i-wanna-be-yours': { duracao: 184.1, estilo: 'rock' },
  'in-the-end': { duracao: 216.3, estilo: 'rock' },
  'mr-brightside': { duracao: 223.1, estilo: 'rock' },
  'patience': { duracao: 354.9, estilo: 'rock' },
  'perfect-simple-plan': { duracao: 277.1, estilo: 'rock' },
  'sweater-weather': { duracao: 240.5, estilo: 'rock' },
  'sweet-child-o-mine': { duracao: 356.1, estilo: 'rock' },
  'the-night-we-met': { duracao: 208.3, estilo: 'rock' },
  'viva-la-vida': { duracao: 241.5, estilo: 'rock' },
  'wish-you-were-here': { duracao: 338.5, estilo: 'rock' },
  'wonderwall': { duracao: 262.0, estilo: 'rock' },
  'yellow': { duracao: 266.8, estilo: 'rock' },
  'you-shook-me-all-night-long': { duracao: 210.4, estilo: 'rock' },
  // hiphop
  'dont-matter': { duracao: 293.1, estilo: 'hiphop' },
  'empire-state-of-mind': { duracao: 277.2, estilo: 'hiphop' },
  'gods-plan': { duracao: 199.0, estilo: 'hiphop' },
  'lose-yourself': { duracao: 320.3, estilo: 'hiphop' },
  'mockingbird': { duracao: 251.4, estilo: 'hiphop' },
  'one-dance': { duracao: 174.0, estilo: 'hiphop' },
  'sunflower': { duracao: 158.1, estilo: 'hiphop' },
  'till-i-collapse': { duracao: 299.9, estilo: 'hiphop' },
  // sertanejo
  'anti-amor': { duracao: 165.4, estilo: 'sertanejo' },
  'borboletas': { duracao: 201.5, estilo: 'sertanejo' },
  'calcinha-de-renda': { duracao: 199.4, estilo: 'sertanejo' },
  'chuva-de-arroz': { duracao: 186.8, estilo: 'sertanejo' },
  'cor-de-ouro': { duracao: 171.8, estilo: 'sertanejo' },
  'dentro-da-hilux': { duracao: 163.1, estilo: 'sertanejo' },
  'dormi-na-praca': { duracao: 160.3, estilo: 'sertanejo' },
  'e-o-amor': { duracao: 202.8, estilo: 'sertanejo' },
  'fada': { duracao: 244.7, estilo: 'sertanejo' },
  'molhando-o-volante': { duracao: 162.6, estilo: 'sertanejo' },
  'o-que-e-que-tem': { duracao: 215.2, estilo: 'sertanejo' },
  'propaganda': { duracao: 142.0, estilo: 'sertanejo' },
  'tudo-que-voce-quiser': { duracao: 249.2, estilo: 'sertanejo' },
  // funk
  'a-gente-brigou': { duracao: 169.8, estilo: 'funk' },
  'agora-to-solteira': { duracao: 222.2, estilo: 'funk' },
  'amo-minha-favela': { duracao: 119.8, estilo: 'funk' },
  'beijinho-no-ombro': { duracao: 166.9, estilo: 'funk' },
  'brota-aqui-na-base': { duracao: 166.2, estilo: 'funk' },
  'calendario-do-papai': { duracao: 141.2, estilo: 'funk' },
  'camisa-do-gremio': { duracao: 139.5, estilo: 'funk' },
  'ela-voltou-de-perna-bamba': { duracao: 158.1, estilo: 'funk' },
  'felina': { duracao: 225.9, estilo: 'funk' },
  'gauchinha': { duracao: 273.4, estilo: 'funk' },
  'hoje-eu-vou-parar-na-gaiola': { duracao: 177.1, estilo: 'funk' },
  'isso-que-e-vida': { duracao: 159.5, estilo: 'funk' },
  'jetski': { duracao: 148.7, estilo: 'funk' },
  'lembrei-de-tu': { duracao: 173.9, estilo: 'funk' },
  'namora-ai': { duracao: 148.7, estilo: 'funk' },
  'novidade-na-area': { duracao: 120.1, estilo: 'funk' },
  'passinho-do-volante': { duracao: 174.6, estilo: 'funk' },
  'posso-ate-nao-te-dar-flores': { duracao: 162.6, estilo: 'funk' },
  'pow-pow-tey-tey': { duracao: 132.1, estilo: 'funk' },
  'renasci-das-cinzas': { duracao: 296.7, estilo: 'funk' },
  'revoada-do-tubarao': { duracao: 573.4, estilo: 'funk' },
  'se-eu-tiver-solteiro': { duracao: 169.9, estilo: 'funk' },
  'vai-sentando-sem-compromisso': { duracao: 192.1, estilo: 'funk' },
  // rap
  'a-rezadeira': { duracao: 263.1, estilo: 'rap' },
  'amor-e-fe': { duracao: 322.8, estilo: 'rap' },
  'calma-na-alma': { duracao: 317.5, estilo: 'rap' },
  'chama-os-mulekes': { duracao: 353.6, estilo: 'rap' },
  'corte-americano': { duracao: 139.6, estilo: 'rap' },
  'diario-de-um-detento': { duracao: 451.1, estilo: 'rap' },
  'ela-so-quer-paz': { duracao: 174.4, estilo: 'rap' },
  'estilo-cachorro': { duracao: 377.6, estilo: 'rap' },
  'hoje-cedo': { duracao: 194.1, estilo: 'rap' },
  'invicto': { duracao: 249.0, estilo: 'rap' },
  'irmao-dqbrada': { duracao: 360.6, estilo: 'rap' },
  'jurei-odin': { duracao: 202.1, estilo: 'rap' },
  'leal': { duracao: 212.7, estilo: 'rap' },
  'lembrancas': { duracao: 270.6, estilo: 'rap' },
  'levanta-e-anda': { duracao: 150.5, estilo: 'rap' },
  'linda-louca-e-mimada': { duracao: 234.4, estilo: 'rap' },
  'muleque-de-vila': { duracao: 277.7, estilo: 'rap' },
  'mun-ra': { duracao: 275.4, estilo: 'rap' },
  'nada-bom': { duracao: 168.8, estilo: 'rap' },
  'negro-drama': { duracao: 411.9, estilo: 'rap' },
  'neurotico-de-guerra': { duracao: 220.2, estilo: 'rap' },
  'o-rap-e-preto': { duracao: 199.5, estilo: 'rap' },
  'o-vagabundo-e-a-dama': { duracao: 305.7, estilo: 'rap' },
  'qual-e': { duracao: 223.8, estilo: 'rap' },
  'rainha-da-pista': { duracao: 258.8, estilo: 'rap' },
  'rap-e-compromisso': { duracao: 264.0, estilo: 'rap' },
  'raplord': { duracao: 262.9, estilo: 'rap' },
  'se-essa-bunda': { duracao: 249.2, estilo: 'rap' },
  'solto': { duracao: 219.2, estilo: 'rap' },
  'vida-loka-parte-2': { duracao: 350.6, estilo: 'rap' },
  'zorro-do-asfalto': { duracao: 213.9, estilo: 'rap' },
  // nacional
  'amanha-ou-depois': { duracao: 220.7, estilo: 'nacional' },
  'detetive': { duracao: 205.7, estilo: 'nacional' },
  'garota-radical': { duracao: 176.5, estilo: 'nacional' },
  'pinhal': { duracao: 219.7, estilo: 'nacional' },
  'levo-comigo': { duracao: 206.7, estilo: 'nacional' },
  'menina-estranha': { duracao: 176.8, estilo: 'nacional' },
  'nao-quero-dinheiro': { duracao: 153.8, estilo: 'nacional' },
  'o-maior-idiota-do-mundo': { duracao: 208.4, estilo: 'nacional' },
  'piloto-automatico': { duracao: 196.7, estilo: 'nacional' },
  'toda-molhada': { duracao: 221.4, estilo: 'nacional' },
  'tudo-que-ela-gosta-de-escutar': { duracao: 172.6, estilo: 'nacional' },
  'voce-vai-lembrar-de-mim': { duracao: 241.5, estilo: 'nacional' }
};

/** A musica de um endereco de audio ('/audio/musica-yellow.mp3'), ou null. */
function musicaDe(url) {
  const nome = /\/audio\/musica-(.+)\.mp3$/.exec(String(url || ''));
  return (nome && MUSICAS[nome[1]]) || null;
}

module.exports = { MUSICAS, ESTILOS, musicaDe };
