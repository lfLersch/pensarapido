'use strict';

/* Modo Escalada: a rodada N pede N respostas. */

const { Sala } = require('../server/sala.js');

const eventos = [];
const sala = new Sala('ESC1', {
  categorias: ['geografia'],
  modo: 'escalada',
  metaPontos: 200,
  segundosPorPergunta: 30
}, (evento, dados) => eventos.push({ evento, dados }));

sala.entrar('luiz', 'Luiz');
sala.entrar('ana', 'Ana');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(46), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

/** Avança para a próxima rodada sem esperar os temporizadores. */
function abrirRodada() {
  sala.limparTemporizador();
  sala.mostrarPergunta();
  sala.limparTemporizador();
  for (const j of sala.jogadores.values()) j.ultimaMensagem = 0;
  return sala.perguntaAtual;
}

/* ------------------------------ Rodada 1 ------------------------------ */

sala.iniciar();
let pergunta = abrirRodada();

console.log('Rodada 1:', pergunta.pergunta);
conferir('rodada 1 pede 1 resposta', pergunta.necessarias, 1);

const r1 = sala.palpitar('luiz', pergunta.resposta);
conferir('resposta certa completa a rodada 1', r1.veredito, 'certo');
conferir('rodada 1 vale 10 pontos', r1.pontos, 10);

sala.encerrarRodada();
sala.limparTemporizador();

/* ------------------------------ Rodada 2 ------------------------------ */

sala.proximaRodada();
pergunta = abrirRodada();

console.log('\nRodada 2:', pergunta.pergunta);
conferir('rodada 2 pede 2 respostas', pergunta.necessarias, 2);
conferir('rodada 2 tem itens suficientes', pergunta.itens.length >= 2, true);

const primeiro = pergunta.itens[0].oficial;
const segundo = pergunta.itens[1].oficial;

const p1 = sala.palpitar('luiz', primeiro);
conferir('1º item -> progresso parcial', [p1.veredito, p1.quantos, p1.necessarias], ['item', 1, 2]);

for (const j of sala.jogadores.values()) j.ultimaMensagem = 0;
const p2 = sala.palpitar('luiz', primeiro);
conferir('repetir o mesmo item -> repetido', p2.veredito, 'repetido');

for (const j of sala.jogadores.values()) j.ultimaMensagem = 0;
const p3 = sala.palpitar('luiz', 'batata frita com queijo');
conferir('palpite distante -> vai para o chat', p3.veredito, 'chat');

for (const j of sala.jogadores.values()) j.ultimaMensagem = 0;
const p4 = sala.palpitar('luiz', segundo);
conferir('2º item -> completa e pontua', [p4.veredito, p4.quantos], ['certo', 2]);

/* Nenhum item respondido pode ter ido ao chat global. */
const textosDoChat = eventos
  .filter((e) => e.evento === 'chat:mensagem' && e.dados.tipo === 'jogador')
  .map((e) => e.dados.texto.toLowerCase());

const vazou = [primeiro, segundo].some((item) =>
  textosDoChat.some((t) => t.includes(item.toLowerCase())));
conferir('nenhum item correto vazou no chat', vazou, false);
conferir('a conversa distante apareceu no chat', textosDoChat.includes('batata frita com queijo'), true);

sala.encerrarRodada();
sala.limparTemporizador();

const resultado2 = eventos.filter((e) => e.evento === 'rodada:resultado').pop().dados;
const luiz2 = resultado2.detalhes.find((d) => d.nickname === 'Luiz');
conferir('resultado lista os itens do jogador', luiz2.itens.length, 2);

/* ------------------------ Rodadas 3, 4, 5 e 6 ------------------------ */

console.log('');
for (let n = 3; n <= 6; n++) {
  sala.proximaRodada();
  pergunta = abrirRodada();
  conferir(`rodada ${n} pede ${n} respostas`, pergunta.necessarias, n);

  // Responder n-1 itens não pode completar a rodada.
  for (let i = 0; i < n - 1; i++) {
    for (const j of sala.jogadores.values()) j.ultimaMensagem = 0;
    const r = sala.palpitar('ana', pergunta.itens[i].oficial);
    if (r.veredito !== 'item') { falhas++; console.log('FALHA item parcial na rodada', n, r); }
  }

  for (const j of sala.jogadores.values()) j.ultimaMensagem = 0;
  const ultimo = sala.palpitar('ana', pergunta.itens[n - 1].oficial);
  conferir(`  rodada ${n}: o ${n}º item completa`, ultimo.veredito, 'certo');

  console.log(`     "${pergunta.pergunta}" (${pergunta.itens.length} itens no repertório)`);
  sala.encerrarRodada();
  sala.limparTemporizador();
}

/* A rodada cresce em tempo junto com o número de respostas. */
sala.perguntaAtual = { necessarias: 1 };
const t1 = sala.duracaoDaRodada();
sala.perguntaAtual = { necessarias: 6 };
const t6 = sala.duracaoDaRodada();
console.log('');
conferir('rodada de 1 resposta dura 30s', t1, 30000);
conferir('rodada de 6 respostas dura 45s (5 extras x 3s)', t6, 45000);

sala.destruir();

/* ---------------------------------------------------------------- *
 * Pontuacao: cada item vale 2, completar a lista da bonus.
 * ---------------------------------------------------------------- */

console.log('');
{
  const eventos = [];
  const sala = new Sala('PONT', {
    categorias: ['geografia'], subs: [], modo: 'escalada',
    metaPontos: 200, segundosPorPergunta: 20
  }, (evento, dados) => eventos.push({ evento, dados }));

  sala.entrar('a', 'Ana');
  sala.entrar('b', 'Bia');
  sala.iniciar();
  sala.limparTemporizador();

  sala.rodada = 2;            // a proxima sera a rodada 3, que pede 3 respostas
  sala.proximaRodada();
  sala.limparTemporizador();
  sala.mostrarPergunta();
  sala.limparTemporizador();

  const pergunta = sala.perguntaAtual;
  const inicio = sala.inicioPergunta;
  const dateNowReal = Date.now;

  // O anti-spam recusa mensagens a menos de 350ms uma da outra, entao cada
  // palpite acontece num instante proprio.
  const dizer = (ms, quem, texto) => {
    Date.now = () => inicio + ms;
    return sala.palpitar(quem, texto);
  };

  const a1 = dizer(1000, 'a', pergunta.itens[0].oficial);
  const a2 = dizer(3000, 'a', pergunta.itens[1].oficial);
  const a3 = dizer(5000, 'a', pergunta.itens[2].oficial);
  const b1 = dizer(7000, 'b', pergunta.itens[3].oficial);
  Date.now = dateNowReal;

  const pontosDe = (nome) => [...sala.jogadores.values()].find((j) => j.nickname === nome).pontos;

  conferir('1o item da Ana conta como progresso', a1.veredito, 'item');
  conferir('  e ja vale 2 pontos', a1.pontos, 2);
  conferir('2o item tambem vale 2', a2.pontos, 2);
  conferir('3o item fecha a lista', a3.veredito, 'certo');
  conferir('  total da Ana = 3x2 + 5 de bonus', a3.pontos, 11);
  conferir('placar da Ana', pontosDe('Ana'), 11);
  conferir('Bia lembrou so 1 item', b1.veredito, 'item');
  conferir('  e leva os 2 pontos dele, sem bonus', pontosDe('Bia'), 2);

  sala.encerrarRodada();
  sala.limparTemporizador();

  const resultado = eventos.filter((e) => e.evento === 'rodada:resultado').pop().dados;
  const ana = resultado.detalhes.find((d) => d.nickname === 'Ana');
  const bia = resultado.detalhes.find((d) => d.nickname === 'Bia');

  conferir('resultado mostra o bonus da Ana', ana.bonus, 5);
  conferir('resultado mostra o que a Bia fez sem completar', bia.ganhou, 2);

  sala.destruir();
}

/* ------------- Item repetido nao pode pontuar duas vezes ------------- */
{
  // Uma lista com o MESMO item escrito de duas formas. Antes o palpite parava
  // no primeiro item livre: quem dizia as duas formas marcava dois itens e
  // levava o dobro de pontos pela mesma resposta.
  const eventos2 = [];
  const sala2 = new Sala('ESC2', {
    categorias: ['geografia'], modo: 'escalada', metaPontos: 200, segundosPorPergunta: 30
  }, (evento, dados) => eventos2.push({ evento, dados }));
  sala2.entrar('luiz', 'Luiz');
  sala2.iniciar();
  sala2.limparTemporizador();

  sala2.perguntaAtual = {
    id: 'teste-repetido',
    pergunta: 'Cite 2 bandas',
    itens: [
      { oficial: 'Charlie Brown Jr', variantes: ['Charlie Brown Junior'] },
      { oficial: 'Charlie Brown Jr.', variantes: ['Charlie Brown Junior'] }
    ],
    necessarias: 2, fixo: false, resposta: 'Charlie Brown Jr', aceita: [],
    categoria: { id: 'escalada', nome: '2 respostas' }, difBase: 40, dificuldade: 40
  };
  sala2.estado = 'pergunta';
  sala2.inicioPergunta = Date.now();
  sala2.progresso = new Map();
  sala2.acertos = new Map();

  const p1 = sala2.palpitar('luiz', 'Charlie Brown Jr');
  sala2.jogadores.get('luiz').ultimaMensagem = 0;
  const p2 = sala2.palpitar('luiz', 'Charlie Brown Junior');

  conferir('1a forma da banda conta como item', p1.veredito, 'item');
  conferir('2a forma da MESMA banda e repetida', p2.veredito, 'repetido');
  conferir('  e nao pontua de novo', p2.pontos, undefined);

  sala2.destruir();
}

/* --------- Recorte por letra precisa recortar de verdade --------- */
{
  // Uma letra que pega quase a lista inteira anuncia uma restricao que nao
  // restringe nada: "paises da Europa com A" seria quase o repertorio todo.
  // O recorte pela ULTIMA letra saiu do jogo — quase todo substantivo em
  // portugues acaba em -a ou -o, entao a Escalada vivia caindo nessas duas.
  const { LISTAS } = require('../server/escalada.js');
  const TETO = 0.25;

  let piorNome = null;
  let piorFatia = 0;
  const letras = new Set();

  for (const lista of LISTAS) {
    const m = lista.pergunta.match(/Cite \{n\} (.+?) que (?:termina|comeca)m com a letra (\w)/);
    if (!m) continue;
    letras.add(m[2]);
    const fonte = LISTAS.find((l) => l.pergunta === `Cite {n} ${m[1]}`);
    if (!fonte) continue;
    const fatia = lista.respostas.length / fonte.respostas.length;
    if (fatia > piorFatia) { piorFatia = fatia; piorNome = lista.pergunta; }
  }

  conferir(`nenhum recorte passa de ${TETO * 100}% da fonte (pior: ${piorNome})`,
    piorFatia <= TETO + 1e-9, true);
  conferir('e os recortes usam varias letras, nao so -a e -o', letras.size >= 8, true);
}

/* ---------------- As listas de paises tem que estar completas ---------------- */
{
  // A Asia tinha 25 dos 48 paises: faltava o Iemen, os do Golfo, o
  // Afeganistao e quase toda a Asia Central. Pais e a pergunta mais facil de
  // conferir que existe, entao nao ha desculpa para faltar.
  const { LISTAS } = require('../server/escalada.js');
  const quantos = (nome) => {
    const l = LISTAS.find((x) => x.pergunta === `Cite {n} paises d${nome}`);
    return l ? l.respostas.length : 0;
  };

  // 193 membros da ONU + Vaticano e Palestina (observadores) + Taiwan.
  conferir('Africa tem os 54 paises', quantos('a Africa'), 54);
  conferir('Asia tem os 48', quantos('a Asia'), 48);
  conferir('Europa tem os 45 (44 + Vaticano)', quantos('a Europa'), 45);
  conferir('America do Sul tem os 12', quantos('a America do Sul'), 12);
  conferir('Oceania tem os 14', quantos('a Oceania'), 14);
  conferir('America Central e Caribe tem os 20',
    quantos('a America Central ou do Caribe'), 20);

  // Nenhum pais pode aparecer em dois continentes: quem responde "Egito" em
  // "paises da Asia" tem que ouvir que errou.
  const onde = new Map();
  for (const lista of LISTAS) {
    const m = lista.pergunta.match(/^Cite \{n\} paises d[ao]s? (.+)$/);
    if (!m || /letra|exatamente|espanhol/.test(lista.pergunta)) continue;
    for (const r of lista.respostas) {
      const nome = Array.isArray(r) ? r[0] : r;
      if (!onde.has(nome)) onde.set(nome, []);
      onde.get(nome).push(m[1]);
    }
  }
  const dobrados = [...onde].filter(([, cs]) => cs.length > 1)
    .map(([nome, cs]) => `${nome} (${cs.join('/')})`);
  conferir('nenhum pais em dois continentes', dobrados, []);
}

/* ------- Dois itens da mesma lista nao podem ser o mesmo palpite ------- */
{
  // "PlayStation" e "PlayStation 2" eram itens separados, mas um caractere de
  // diferenca em doze fica abaixo dos 10% de erro: o corretor via os dois como
  // o mesmo palpite, entao o segundo nunca pontuava. Item que o corretor nao
  // distingue tem que ser um item so, com o outro nome como variante.
  const { LISTAS } = require('../server/escalada.js');
  const { avaliar } = require('../server/comparar.js');

  const ambiguos = [];
  for (const lista of LISTAS) {
    const itens = lista.respostas.map((r) => (Array.isArray(r) ? r : [r]));
    for (let i = 0; i < itens.length; i++) {
      for (let j = i + 1; j < itens.length; j++) {
        if (avaliar(itens[i][0], itens[j][0], itens[j].slice(1)).veredito === 'certo') {
          ambiguos.push(`${itens[i][0]} = ${itens[j][0]} (${lista.pergunta})`);
        }
      }
    }
  }

  conferir('nenhum par de itens indistinguivel', ambiguos, []);
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
