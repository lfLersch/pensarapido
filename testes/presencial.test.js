'use strict';

/*
 * Jogo presencial: todos no mesmo lugar. O lider e a tela (a TV, o
 * computador) e nao joga — so mostra a pergunta, a imagem e a musica. Quem
 * joga entra pelo celular. A tela nao pontua, nao entra no placar, nao entra
 * em equipe e a rodada nao espera por ela.
 */

const { Sala } = require('../server/sala.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(66), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

/** Uma sala com o relogio na mao do teste. O primeiro nome e o lider. */
function montar(config = {}, jogadores = ['Tela', 'Ana', 'Bia']) {
  const eventos = [];
  const sala = new Sala('PRES', Object.assign({
    modo: 'tempo', categorias: ['geografia', 'cinema'], subs: [], fora: [],
    metaPontos: 999, segundosPorPergunta: 20, limiteMusica: 30, presencial: true
  }, config), (evento, dados) => eventos.push({ evento, dados }));
  sala.agendado = null;
  sala.agendar = (fn, ms) => { sala.agendado = { fn, ms }; };
  sala.limparTemporizador = () => { sala.agendado = null; };
  jogadores.forEach((nome, i) => sala.entrar(String.fromCharCode(97 + i), nome));
  return { sala, eventos, ultimo: (nome) => [...eventos].reverse().find((e) => e.evento === nome) };
}

/** Passa da tela da categoria para a pergunta. */
function abrir(sala) {
  for (const id of sala.jogadores.keys()) sala.imagemCarregada(id, sala.rodada);
  if (sala.estado === 'categoria') sala.agendado.fn();
}

/* ---------------- 1. A tela nao joga ---------------- */
{
  const { sala } = montar({}, ['Tela']);
  conferir('so a tela na sala: nao da para comecar', Boolean(sala.iniciar().erro), true);
  sala.entrar('b', 'Ana');
  conferir('  com alguem pelo celular, comeca', sala.iniciar().ok, true);
  conferir('o lider e a tela', [sala.ehTela('a'), sala.ehTela('b')], [true, false]);
  conferir('a tela fica fora do placar', sala.placar().map((j) => j.nickname), ['Ana']);
  conferir('  mas o saguao lista ela, marcada', sala.estadoPublico().jogadores.map((j) => [j.nickname, j.tela]).sort(),
    [['Ana', false], ['Tela', true]]);
}

/* ---------------- 2. A rodada nao espera a tela ---------------- */
{
  const { sala, ultimo } = montar();
  sala.iniciar();
  abrir(sala);
  const resposta = sala.perguntaAtual.resposta || sala.perguntaAtual.itens[0].oficial;
  sala.jogadores.get('a').ultimaMensagem = 0;
  conferir('o que a tela escreve e so conversa', sala.palpitar('a', resposta).veredito, 'chat');
  conferir('  e nao pontua', sala.jogadores.get('a').pontos, 0);
  sala.palpitar('b', resposta);
  conferir('so um dos dois acertou: a rodada espera', sala.agendado && sala.agendado.ms === 0, false);
  sala.palpitar('c', resposta);
  conferir('os dois que jogam acertaram: a rodada fecha', sala.agendado && sala.agendado.ms, 0);
  sala.agendado.fn();
  const resultado = ultimo('rodada:resultado').dados;
  conferir('o resultado so traz quem joga', resultado.detalhes.map((d) => d.nickname).sort(), ['Ana', 'Bia']);
}

/* ---------------- 3. A imagem: so a tela carrega ---------------- */
{
  const { sala } = montar({ proporcaoImagem: 'so-imagem' });
  sala.iniciar();
  conferir('pergunta com imagem', Boolean(sala.perguntaAtual.imagem), true);
  sala.agendado.fn();
  conferir('  sem a tela pronta, a sala espera', sala.estado, 'categoria');
  sala.imagemCarregada('a', sala.rodada);
  conferir('  a tela carregou: abre, sem esperar os celulares', sala.estado, 'pergunta');
}

/* ---------------- 4. Qual e a musica ---------------- */
{
  const { sala, ultimo } = montar({ modo: 'qual-musica', categorias: ['ouvir'] });
  sala.iniciar();
  abrir(sala);
  const certa = sala.perguntaAtual.opcaoCerta;
  const errada = (certa + 1) % 4;
  conferir('a tela nao clica nas opcoes', Boolean(sala.escolherOpcao('a', certa).erro), true);
  sala.escolherOpcao('b', certa);
  conferir('  e a rodada nao espera por ela', sala.agendado && sala.agendado.ms === 0, false);
  sala.escolherOpcao('c', errada);
  conferir('quem joga clicou: a rodada fecha', sala.agendado && sala.agendado.ms, 0);
  sala.agendado.fn();
  const detalhes = ultimo('rodada:resultado').dados.detalhes;
  conferir('o resultado diz em qual opcao cada um clicou (para o bicho dele)',
    detalhes.map((d) => [d.nickname, d.escolhaIndice]).sort(), [['Ana', certa], ['Bia', errada]]);
}

/* ---------------- 5. Equipes sem a tela ---------------- */
{
  const { sala } = montar({ modo: 'presente-grego', categorias: ['geografia'] }, ['Tela', 'Ana', 'Bia', 'Caio', 'Duda']);
  const nasEquipes = sala.equipes.flatMap((e) => e.jogadores);
  conferir('a tela nao cai em equipe', nasEquipes.includes('a'), false);
  conferir('  e nao conta como sem equipe', sala.semEquipe(), []);
  conferir('  nem consegue entrar numa', Boolean(sala.trocarEquipe('a', 'e1').erro), true);
  conferir('a partida comeca com as quatro pessoas', sala.iniciar().ok, true);
}

/* ---------------- 6. Sem o presencial, tudo como sempre ---------------- */
{
  const { sala } = montar({ presencial: false });
  conferir('sem presencial o lider joga', [sala.ehTela('a'), sala.placar().length], [false, 3]);
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
