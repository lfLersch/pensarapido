'use strict';

/*
 * Maria vai com as outras: uma pergunta de top 5 e cada um escreve o seu.
 *
 * Cada coisa que outra pessoa tambem escreveu vale 1; no mesmo lugar, 2. A
 * conta e feita com cada pessoa da mesa e soma. A escrita vale com 80% de
 * precisao, e o nome curto vale pelo comprido ("Messi" por "Lionel Messi").
 */

const os = require('os');
const path = require('path');
// Cada rodada grava o top 3 para o Senso Comum: os testes nao sujam o dado de verdade.
process.env.SENSO_ARQUIVO = path.join(os.tmpdir(), `senso-maria-teste-${process.pid}.json`);

const { Sala, MODOS, MODOS_SORTEAVEIS, pontuarMaria } = require('../server/sala.js');
const { TOPS } = require('../server/tops.js');
const { normalizar, mesmaCoisa } = require('../server/comparar.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(58), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

function novaSala(quantos = 3) {
  const eventos = [];
  const sala = new Sala('MARI',
    { categorias: [], subs: [], fora: [], modo: 'maria', metaPontos: 9999, segundosPorPergunta: 20 },
    (evento, dados) => eventos.push({ evento, dados }));
  ['ana', 'bia', 'caio', 'duda'].slice(0, quantos).forEach((id) => sala.entrar(id, id[0].toUpperCase() + id.slice(1)));
  return { sala, eventos };
}

function rodadaAberta(quantos = 3) {
  const { sala, eventos } = novaSala(quantos);
  sala.iniciar();
  sala.limparTemporizador();
  sala.mostrarPergunta();
  sala.limparTemporizador();
  return { sala, eventos };
}

const ultimo = (eventos, nome) => [...eventos].reverse().find((e) => e.evento === nome);

/* ---------------- O modo e as perguntas ---------------- */
{
  const modo = MODOS.find((m) => m.id === 'maria');
  conferir('o modo existe e esta disponivel', Boolean(modo && modo.disponivel), true);
  conferir('nao usa categorias', Boolean(modo.semCategorias), true);
  conferir('entra na roleta da Bagunca', MODOS_SORTEAVEIS.includes('maria'), true);
  conferir('tem pergunta para muitas rodadas', TOPS.length >= 100, true);
  const chaves = TOPS.map(normalizar);
  conferir('nenhuma pergunta repetida', chaves.length - new Set(chaves).size, 0);
  conferir('toda pergunta e um top 5', TOPS.filter((t) => !/^Top 5 /.test(t)), []);
}

/* ---------------- A mesma coisa ---------------- */
{
  const iguais = [
    ['Beatles', 'The Beatles'], ['Beatles', 'beatls'], ['Japão', 'japao'], ['Messi', 'Lionel Messi'],
    ['Neymar', 'Neymar Jr'], ['Einstein', 'Albert Einstein'], ['Pelé', 'pele'], ['Golden Retriever', 'golden retriver'],
    ['Leonardo da Vinci', 'Da Vinci'], ['Coca-Cola', 'coca cola']
  ];
  const diferentes = [
    ['Gato', 'Pato'], ['Brasil', 'Chile'], ['Ronaldo', 'Ronaldinho'], ['Ana', 'Ana Maria Braga'],
    ['Nova York', 'Nova Zelândia'], ['Cão', 'Cachorro'], ['', ''], ['Itália', 'Índia']
  ];
  conferir('o que e a mesma coisa bate', iguais.filter(([a, b]) => !mesmaCoisa(a, b)), []);
  conferir('o que e outra coisa nao bate', diferentes.filter(([a, b]) => mesmaCoisa(a, b)), []);
  conferir('vale para os dois lados', iguais.filter(([a, b]) => !mesmaCoisa(b, a)), []);
}

/* ---------------- A conta ---------------- */
{
  const listas = new Map([
    ['ana', ['Cachorro', 'Gato', 'Coelho', 'Panda', 'Coala']],
    ['bia', ['Cachorro', 'Coelho', 'Gato', 'Pinguim', '']],
    ['caio', ['Gato', 'Cachorro', 'Hamster', 'Panda', 'Lontra']]
  ]);
  const { porJogador, daMesa } = pontuarMaria(listas);
  const pontos = (id) => porJogador.get(id).pontos;
  // ana x bia: Cachorro no lugar (2) + Gato (1) + Coelho (1) = 4
  // ana x caio: Gato (1) + Cachorro (1) + Panda no lugar (2) = 4
  // bia x caio: Cachorro (1) + Gato (1) = 2
  conferir('ana soma com bia e com caio: 4 + 4', pontos('ana'), 8);
  conferir('bia: 4 + 2', pontos('bia'), 6);
  conferir('caio: 4 + 2', pontos('caio'), 6);
  conferir('quantos pensaram igual em cada lugar (ana)', porJogador.get('ana').iguais, [2, 2, 1, 1, 0]);
  conferir('quantos no mesmo lugar (ana)', porJogador.get('ana').noLugar, [1, 0, 0, 1, 0]);
  conferir('o top da mesa vem dos mais votados', daMesa.slice(0, 2).map((c) => c.texto), ['Cachorro', 'Gato']);
  conferir("na tela vai a grafia mais escrita",
    pontuarMaria(new Map([["a", ["Gatos", "", "", "", ""]], ["b", ["Gato", "", "", "", ""]], ["c", ["gato", "", "", "", ""]]])).daMesa[0].texto, "Gato");
  conferir('  com quantos votaram', daMesa.slice(0, 3).map((c) => c.votos), [3, 3, 2]);
}

{
  // A mesma coisa duas vezes na lista conta uma vez so.
  const { porJogador } = pontuarMaria(new Map([
    ['ana', ['Messi', 'Lionel Messi', 'Pelé', '', '']],
    ['bia', ['Pelé', 'Messi', '', '', '']]
  ]));
  conferir('repetida na propria lista nao conta duas vezes', porJogador.get('ana').pontos, 2);
}

{
  const { porJogador } = pontuarMaria(new Map([
    ['ana', ['A', 'B', 'C', 'D', 'E'].map((l) => `Coisa ${l}${l}${l}`)],
    ['bia', ['A', 'B', 'C', 'D', 'E'].map((l) => `Coisa ${l}${l}${l}`)],
    ['caio', ['A', 'B', 'C', 'D', 'E'].map((l) => `Coisa ${l}${l}${l}`)],
    ['duda', ['A', 'B', 'C', 'D', 'E'].map((l) => `Coisa ${l}${l}${l}`)]
  ]));
  conferir('top identico com 3 pessoas: 10 de cada uma', porJogador.get('ana').pontos, 30);
}

/* ---------------- Comecar ---------------- */
{
  const { sala } = novaSala(1);
  conferir('sozinho nao comeca', Boolean(sala.iniciar().erro), true);
}

/* ---------------- Uma rodada ---------------- */
{
  const { sala, eventos } = rodadaAberta();
  const pergunta = ultimo(eventos, 'rodada:pergunta').dados;
  conferir('a pergunta e um dos tops', TOPS.includes(pergunta.pergunta), true);
  conferir('o relogio e de um minuto', pergunta.duracaoMs, 60000);
  conferir('5 linhas, 3 escrevendo', [pergunta.maria.itens, pergunta.maria.escrevem], [5, 3]);
  conferir('nao tem mascara nem chances', [pergunta.mascara, pergunta.chances], [null, null]);

  sala.jogadores.get('bia').ultimaMensagem = 0;
  conferir('o chat fecha enquanto a mesa escreve', Boolean(sala.palpitar('bia', 'cachorro').erro), true);

  conferir('lista curta e recusada', Boolean(sala.escreverMaria('ana', ['a', 'b'], true).erro), true);
  conferir('lista vazia nao confirma', Boolean(sala.escreverMaria('ana', ['', '', '', '', ''], true).erro), true);
  conferir('repetida nao confirma', Boolean(sala.escreverMaria('ana', ['Gato', 'gatos', '', '', ''], true).erro), true);

  sala.escreverMaria('ana', ['Cachorro', 'Gato', 'Coelho', 'Panda', 'Coala'], true);
  conferir('confirmado nao muda mais', Boolean(sala.escreverMaria('ana', ['x', '', '', '', ''], true).erro), true);
  conferir('confirmar avisa a mesa', ultimo(eventos, 'maria:travou').dados.quantos, 1);
  // Bia confirma; Caio so deixa o rascunho e o tempo acaba.
  sala.escreverMaria('bia', ['Cachorro', 'Coelho', 'Gato', 'Pinguim', ''], true);
  sala.escreverMaria('caio', ['Gato', 'Cachorro', 'Hamster', 'Panda', 'Lontra'], false);
  conferir('com gente faltando a rodada segue', sala.estado, 'pergunta');

  sala.encerrarRodada();
  sala.limparTemporizador();
  const res = ultimo(eventos, 'rodada:resultado').dados;
  const de = (id) => res.detalhes.find((d) => d.jogadorId === id);
  conferir('os pontos de cada um', ['ana', 'bia', 'caio'].map((id) => de(id).ganhou), [8, 6, 6]);
  conferir('rascunho sem confirmar vale', [de('caio').maria.papel, de('caio').maria.confirmou], ['escreveu', false]);
  conferir('quem pensou mais igual vem primeiro', res.detalhes[0].jogadorId, 'ana');
  conferir('o resultado traz o top da mesa', res.maria.daMesa[0].texto, 'Cachorro');
  conferir('o placar soma', sala.jogadores.get('ana').pontos, 8);
  sala.jogadores.get('bia').ultimaMensagem = 0;
  conferir('no resultado o chat volta', sala.palpitar('bia', 'boa!').veredito, 'chat');
}

{
  // Todo mundo confirmou: a rodada fecha sem esperar o relogio.
  const { sala } = rodadaAberta(2);
  sala.escreverMaria('ana', ['Paris', '', '', '', ''], true);
  sala.escreverMaria('bia', ['Paris', '', '', '', ''], true);
  conferir('todo mundo confirmou: fecha', Boolean(sala.agendado), true);
  sala.limparTemporizador();
  sala.encerrarRodada();
  sala.limparTemporizador();
  conferir('  e cada um leva 2 (mesma coisa, mesmo lugar)', sala.jogadores.get('ana').pontos, 2);
}

{
  // A pergunta nao repete na partida.
  const { sala } = novaSala(2);
  sala.iniciar();
  sala.limparTemporizador();
  const vistas = new Set([sala.maria.pergunta]);
  for (let i = 0; i < 30; i++) {
    sala.estado = 'resultado';
    sala.comecarRodada();
    sala.limparTemporizador();
    vistas.add(sala.maria.pergunta);
  }
  conferir('31 rodadas, 31 perguntas diferentes', vistas.size, 31);
}

/* ---------------- Na Bagunca ---------------- */

/** Uma Bagunca que so sorteia o Maria, com o relogio na mao do teste. */
function bagunca(quantos, perguntasAteSorteio = 0) {
  const eventos = [];
  const sala = new Sala('BAGM',
    { modo: 'bagunca', categorias: ['geografia'], subs: [], fora: [], metaPontos: 9999,
      segundosPorPergunta: 20, perguntasAteSorteio, modosBagunca: ['maria'] },
    (evento, dados) => eventos.push({ evento, dados }));
  sala.agendado = null;
  sala.agendar = (fn, ms) => { sala.agendado = { fn, ms }; };
  sala.limparTemporizador = () => { sala.agendado = null; };
  ['ana', 'bia', 'caio', 'duda'].slice(0, quantos).forEach((id) => sala.entrar(id, id));
  sala.iniciar();
  return { sala, eventos };
}

{
  const { sala, eventos } = bagunca(4, 1);
  conferir('a Bagunca abre com o Modo Tempo', sala.modo, 'tempo');
  sala.pularRodada();
  sala.agendado.fn();                      // fim do resultado: vem o sorteio
  conferir('  e o sorteio tira o Maria', [sala.estado, sala.modo], ['sorteio', 'maria']);
  sala.agendado.fn();                      // fim da roleta: a rodada abre
  sala.agendado.fn();                      // fim da tela da categoria
  const pergunta = ultimo(eventos, 'rodada:pergunta').dados;
  conferir('  com as cinco linhas na tela', [TOPS.includes(pergunta.pergunta), pergunta.maria.itens], [true, 5]);

  // Os quatro escrevem o mesmo top: fora da Bagunca seriam 30 para cada.
  for (const id of ['ana', 'bia', 'caio', 'duda']) sala.escreverMaria(id, ['Azul', 'Preto', 'Verde', 'Rosa', 'Roxo'], true);
  sala.agendado.fn();                      // todos confirmaram: fecha
  const res = ultimo(eventos, 'rodada:resultado').dados;
  conferir('  e a rodada paga no maximo 10, como as outras', res.detalhes.map((d) => d.ganhou), [10, 10, 10, 10]);
  conferir('  o placar soma so os 10', sala.jogadores.get('ana').pontos, 10);
  sala.agendado.fn();                      // fim do resultado: volta o Modo Tempo
  conferir('  depois volta o Modo Tempo', sala.modo, 'tempo');
}
{
  const { sala } = bagunca(1, 0);
  conferir('sozinho na sala ele nao entra na roleta', sala.modosQueCabem().includes('maria'), false);
  conferir('  e segue o Modo Tempo', sala.modo, 'tempo');
}
{
  // A sala encolheu entre o sorteio e a rodada.
  const { sala } = bagunca(2, 1);
  sala.pularRodada();
  sala.agendado.fn();
  conferir('com dois, sai o Maria', [sala.estado, sala.modo], ['sorteio', 'maria']);
  sala.sair('bia');
  sala.agendado.fn();
  conferir('  saiu alguem antes da rodada: segue o Modo Tempo, sem acabar o jogo', [sala.estado, sala.modo], ['categoria', 'tempo']);
}

console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
