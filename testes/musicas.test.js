'use strict';

/*
 * A musica inteira, o ponto sorteado e os dois modos musicais.
 *
 * O arquivo de cada musica e ela inteira e a sala sorteia de que ponto ela
 * toca. Aqui: o arquivo, a duracao e as duas perguntas de cada musica batem;
 * o sorteio fica longe do comeco e do fim; a Corrida musical fecha no primeiro
 * acerto; o Qual e a musica da quatro opcoes honestas e um clique por pessoa;
 * e a partida pode acabar pelo numero de musicas.
 */

const fs = require('fs');
const path = require('path');
const {
  Sala, calcularPontos, sortearInicio, montarOpcoes, tipoMusical, idDaPergunta
} = require('../server/sala.js');
const { QUESTOES } = require('../server/questions.js');
const { MUSICAS, ESTILOS, musicaDe } = require('../server/musicas.js');
const { normalizar } = require('../server/comparar.js');
const dificuldade = require('../server/dificuldade.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(64), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

/** Uma sala com o relogio na mao do teste, ja na pergunta. */
function montar(config = {}, jogadores = ['Ana', 'Bia']) {
  const eventos = [];
  const sala = new Sala('MUS1', Object.assign({
    modo: 'tempo', categorias: ['ouvir'], metaPontos: 999, segundosPorPergunta: 20, limiteMusica: 30
  }, config), (evento, dados) => eventos.push({ evento, dados }));
  sala.agendado = null;
  sala.agendar = (fn, ms) => { sala.agendado = { fn, ms }; };
  sala.limparTemporizador = () => { sala.agendado = null; };
  jogadores.forEach((nome, i) => sala.entrar(String.fromCharCode(97 + i), nome));
  sala.iniciar();
  return { sala, eventos, ultimo: (nome) => [...eventos].reverse().find((e) => e.evento === nome) };
}

/** Passa da tela da categoria para a pergunta, com todo mundo pronto. */
function abrir(sala) {
  for (const id of sala.jogadores.keys()) sala.imagemCarregada(id, sala.rodada);
  if (sala.estado === 'categoria') sala.agendado.fn();
}

/* ---------------- 1. Arquivo, duracao e perguntas batem ---------------- */
{
  const audios = [...new Set(QUESTOES.ouvir.map((q) => q.audio))];
  const semMusica = audios.filter((a) => !musicaDe(a));
  conferir('toda pergunta de Ouvir musicas tem a musica cadastrada', semMusica, []);

  const usadas = new Set(audios.map((a) => a.match(/musica-(.+)\.mp3$/)[1]));
  conferir('toda musica cadastrada tem pergunta', Object.keys(MUSICAS).filter((m) => !usadas.has(m)), []);

  const semArquivo = Object.keys(MUSICAS)
    .filter((m) => !fs.existsSync(path.join(__dirname, '..', 'public', 'audio', `musica-${m}.mp3`)));
  conferir('todo arquivo de musica existe', semArquivo, []);

  const estiloTorto = Object.entries(MUSICAS).filter(([, m]) => !ESTILOS[m.estilo]).map(([n]) => n);
  conferir('todo estilo existe', estiloTorto, []);

  const curtas = Object.entries(MUSICAS).filter(([, m]) => !(m.duracao >= 90)).map(([n]) => n);
  conferir('nenhuma musica com menos de 90s (cabe o sorteio)', curtas, []);

  // Cerca de 64 kbps: o tamanho do arquivo bate com a duracao cadastrada.
  const tortas = Object.entries(MUSICAS).filter(([nome, m]) => {
    const bytes = fs.statSync(path.join(__dirname, '..', 'public', 'audio', `musica-${nome}.mp3`)).size;
    return Math.abs(bytes / 8000 - m.duracao) > 3;
  }).map(([n]) => n);
  conferir('arquivo de 64 kbps com a duracao cadastrada', tortas, []);
}

/* ---------------- 2. O id continua o do trecho antigo ---------------- */
{
  const q = { pergunta: 'Qual e o nome desta musica?', audio: '/audio/musica-yellow.mp3', resposta: 'Yellow' };
  conferir('o id da pergunta sai do nome antigo do arquivo',
    idDaPergunta('ouvir', q),
    dificuldade.idDe('ouvir', q.pergunta, 'Yellow|/audio/trecho-yellow.mp3'));
}

/* ---------------- 3. O sorteio do ponto ---------------- */
{
  let foraDaMargem = 0;
  let menor = Infinity;
  let maior = 0;
  for (let i = 0; i < 400; i++) {
    const inicio = sortearInicio('/audio/musica-yellow.mp3', 30000);
    menor = Math.min(menor, inicio);
    maior = Math.max(maior, inicio);
    if (inicio < 15 || inicio + 30 > MUSICAS.yellow.duracao - 10) foraDaMargem++;
  }
  conferir('o ponto fica entre 15s e o fim menos limite e folga', foraDaMargem, 0);
  conferir('  e varia de verdade', maior - menor > 60, true);
  conferir('musica desconhecida toca do comeco', sortearInicio('/audio/nada.mp3', 30000), 0);
}

/* ---------------- 4. As opcoes do Qual e a musica ---------------- */
{
  let tortas = 0;
  let foraDoEstilo = 0;
  let total = 0;
  for (const q of QUESTOES.ouvir.filter(tipoMusical)) {
    for (let i = 0; i < 5; i++) {
      const { opcoes, certa } = montarOpcoes(q);
      total++;
      const valem = new Set([q.resposta, ...(q.aceita || [])].map(normalizar));
      const unicas = new Set(opcoes.map(normalizar)).size === 4;
      const outrasValem = opcoes.filter((o, k) => k !== certa && valem.has(normalizar(o))).length;
      if (opcoes.length !== 4 || opcoes[certa] !== q.resposta || !unicas || outrasValem) tortas++;
      // Opcao errada de outro estilo so quando o estilo nao tem tres.
      const estilo = musicaDe(q.audio).estilo;
      const doEstilo = QUESTOES.ouvir.filter((o) => tipoMusical(o) === tipoMusical(q)
        && o.audio !== q.audio && musicaDe(o.audio).estilo === estilo
        && !valem.has(normalizar(o.resposta)));
      const bastam = new Set(doEstilo.map((o) => normalizar(o.resposta))).size >= 3;
      const mistura = opcoes.some((o, k) => k !== certa && !doEstilo.some((d) => d.resposta === o));
      if (bastam && mistura) foraDoEstilo++;
    }
  }
  conferir('quatro opcoes diferentes, a certa entre elas, nenhuma errada que vale', tortas, 0);
  conferir('as erradas sao do mesmo estilo quando ele tem tres', foraDoEstilo, 0);
  conferir('  (opcoes conferidas)', total > 1000, true);

  const anime = QUESTOES.ouvir.find((q) => /anime/.test(q.pergunta));
  conferir('pergunta de anime nao vira opcao', tipoMusical(anime), null);
}

/* ---------------- 5. Ouvir musicas no Modo Tempo ---------------- */
{
  const { sala, ultimo } = montar();
  const categoria = ultimo('rodada:categoria');
  conferir('a categoria ja leva a musica e o ponto', Boolean(categoria.dados.audio && categoria.dados.audio.url), true);
  conferir('  o ponto e o da pergunta', categoria.dados.audio.inicio, sala.perguntaAtual.audioInicio);
  sala.agendado.fn(); // acabou a tela da categoria, ninguem avisou
  conferir('a musica passa pelo portao da imagem', sala.estado, 'categoria');
  sala.imagemCarregada('a', sala.rodada);
  sala.imagemCarregada('b', sala.rodada);
  conferir('  e abre quando todos estao prontos', sala.estado, 'pergunta');
  const pergunta = ultimo('rodada:pergunta').dados;
  conferir('o relogio continua o tempo por pergunta', pergunta.duracaoMs, 20000);
  conferir('a musica para no limite da sala', pergunta.audioLimiteMs, 30000);
  conferir('Modo Tempo nao tem opcoes', pergunta.opcoes, null);
}

/* ---------------- 6. Corrida musical ---------------- */
{
  const { sala, ultimo } = montar({ modo: 'corrida', categorias: ['bandeiras'], limiteMusica: 20 });
  abrir(sala);
  conferir('Corrida: a rodada dura o limite da musica', ultimo('rodada:pergunta').dados.duracaoMs, 20000);
  conferir('  so pergunta de musica', Boolean(sala.perguntaAtual.audio), true);

  sala.inicioPergunta = Date.now() - 7000; // acertou aos 7s
  const ana = sala.palpitar('a', sala.perguntaAtual.resposta);
  conferir('o primeiro acerto leva os pontos do Modo Tempo', ana.pontos, calcularPontos(7000, 1));
  conferir('  e fecha a rodada na hora', sala.agendado && sala.agendado.ms, 0);

  sala.jogadores.get('b').ultimaMensagem = 0;
  const bia = sala.palpitar('b', sala.perguntaAtual.resposta);
  conferir('quem acerta no mesmo instante nao leva nada', bia.veredito, 'bloqueado');
  conferir('  e os pontos dela continuam zero', sala.jogadores.get('b').pontos, 0);
}

/* ---------------- 7. Qual e a musica ---------------- */
{
  const { sala, ultimo } = montar({ modo: 'qual-musica' }, ['Ana', 'Bia', 'Caio']);
  abrir(sala);
  const pergunta = ultimo('rodada:pergunta').dados;
  conferir('Qual e a musica: quatro opcoes na tela', pergunta.opcoes.length, 4);
  conferir('  sem mascara (o tamanho apontaria a certa)', pergunta.mascara, null);
  conferir('  e a certa nao vai junto', 'opcaoCerta' in pergunta, false);

  const certa = sala.perguntaAtual.opcaoCerta;
  const errada = (certa + 1) % 4;
  sala.inicioPergunta = Date.now() - 3000;
  conferir('clicar na certa vale', sala.escolherOpcao('a', certa).ok, true);
  conferir('  10 pontos nos primeiros 5s', sala.jogadores.get('a').pontos, 10);
  conferir('  e nao da para trocar', Boolean(sala.escolherOpcao('a', errada).erro), true);
  conferir('  nem fica sabendo na hora se acertou', 'certo' in sala.escolherOpcao('b', errada), false);
  conferir('errar vale zero', sala.jogadores.get('b').pontos, 0);
  conferir('a rodada espera quem falta', sala.agendado && sala.agendado.ms === 0, false);

  sala.jogadores.get('c').ultimaMensagem = 0;
  conferir('o chat segura quem escreve uma opcao', sala.palpitar('c', pergunta.opcoes[errada]).veredito, 'bloqueado');
  sala.jogadores.get('c').ultimaMensagem = 0;
  conferir('  e o resto e conversa', sala.palpitar('c', 'que musica boa').veredito, 'chat');
  conferir('  que nao pontua', sala.jogadores.get('c').pontos, 0);

  sala.escolherOpcao('c', certa);
  conferir('todo mundo clicou: a rodada fecha', sala.agendado && sala.agendado.ms, 0);
  sala.agendado.fn();
  const resultado = ultimo('rodada:resultado').dados;
  conferir('o resultado mostra a certa', resultado.opcoes.certa, certa);
  const bia = resultado.detalhes.find((d) => d.nickname === 'Bia');
  conferir('  e em que cada um clicou', bia.escolha, pergunta.opcoes[errada]);
}

/* ---------------- 8. Fim pelo numero de musicas, sem musica repetida ---------------- */
{
  const { sala, eventos } = montar({ modo: 'qual-musica', fimPor: 'musicas', totalMusicas: 30 });
  const tocadas = [];
  while (sala.estado !== 'fim' && tocadas.length < 40) {
    abrir(sala);
    tocadas.push(sala.perguntaAtual.audio);
    sala.escolherOpcao('a', sala.perguntaAtual.opcaoCerta);
    sala.escolherOpcao('b', (sala.perguntaAtual.opcaoCerta + 1) % 4);
    sala.agendado.fn(); // fecha a rodada
    sala.agendado.fn(); // fim do resultado
  }
  conferir('a partida para nas 30 musicas', tocadas.length, 30);
  conferir('  nenhuma musica tocou duas vezes', new Set(tocadas).size, 30);
  const fim = eventos.find((e) => e.evento === 'jogo:fim');
  conferir('  e o fim diz quantas eram', fim && fim.dados.totalMusicas, 30);
  conferir('  com quem fez mais pontos na frente', fim && fim.dados.placar[0].nickname, 'Ana');
}

/* ---------------- 9. Pela meta de pontos, como sempre ---------------- */
{
  const { sala, eventos } = montar({ modo: 'qual-musica', fimPor: 'pontos', metaPontos: 25 });
  let rodadas = 0;
  while (sala.estado !== 'fim' && rodadas < 20) {
    abrir(sala);
    sala.inicioPergunta = Date.now();
    sala.escolherOpcao('a', sala.perguntaAtual.opcaoCerta);
    sala.escolherOpcao('b', (sala.perguntaAtual.opcaoCerta + 1) % 4);
    sala.agendado.fn();
    sala.agendado.fn();
    rodadas++;
  }
  conferir('pela meta: acaba em 3 musicas de 10 pontos', rodadas, 3);
  conferir('  e o fim nao fala em numero de musicas', eventos.find((e) => e.evento === 'jogo:fim').dados.totalMusicas, null);
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
