'use strict';

/*
 * Cinco chances por pergunta.
 *
 * No Modo Tempo e na Escalada, quem nao sabia metralhava palpites ate um
 * colar. Agora cada palpite errado — longe da resposta ou "quase" — gasta uma
 * das 5 chances da pergunta. Sem chances, a pessoa vira plateia: a conversa
 * continua indo ao chat, mas nada perto da resposta sai dela, e nada mais
 * pontua.
 */

const { Sala, CHANCES_POR_PERGUNTA } = require('../server/sala.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(62), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

// Relogio controlado: o anti-spam pede 350ms entre mensagens da mesma pessoa,
// entao cada palpite acontece 400ms depois do anterior.
const dateNowReal = Date.now;
let relogio = dateNowReal();
const palpite = (sala, id, texto) => {
  relogio += 400;
  Date.now = () => relogio;
  return sala.palpitar(id, texto);
};

const config = (modo) => ({ categorias: ['geografia'], modo, metaPontos: 999, segundosPorPergunta: 20 });

/** Sala com a pergunta no ar e o relogio parado, com a resposta que o teste escolher. */
function salaNoAr(modo, nomes, itens) {
  const eventos = [];
  const sala = new Sala('CH01', config(modo), (evento, dados) => eventos.push({ evento, dados }), () => {});
  for (const nome of nomes) sala.entrar(nome.toLowerCase(), nome);
  sala.iniciar();
  sala.limparTemporizador();   // nao espera a revelacao
  sala.mostrarPergunta();
  sala.limparTemporizador();   // nao deixa a rodada expirar sozinha
  Object.assign(sala.perguntaAtual, {
    resposta: itens[0], aceita: [], necessarias: itens.length > 1 ? 2 : 1,
    itens: itens.map((oficial) => ({ oficial, variantes: [] }))
  });
  relogio = sala.inicioPergunta;
  return { sala, eventos };
}

const ditoNoChat = (eventos) => eventos
  .filter((e) => e.evento === 'chat:mensagem' && e.dados.tipo === 'jogador')
  .map((e) => e.dados.texto);

(async () => {
  conferir('sao 5 chances', CHANCES_POR_PERGUNTA, 5);

  /* ---------------- 1. Modo Tempo: gastar tudo ---------------- */
  {
    const { sala, eventos } = salaNoAr('tempo', ['Ana', 'Bia', 'Caio'], ['Pernambuco']);

    const abertura = eventos.find((e) => e.evento === 'rodada:pergunta').dados;
    conferir('a pergunta avisa quantas chances cada um tem', abertura.chances, 5);

    const restam = ['Bahia', 'Ceara', 'Piaui', 'Sergipe'].map((t) => palpite(sala, 'ana', t).chances);
    conferir('cada palpite longe gasta uma chance', restam, [4, 3, 2, 1]);
    conferir('  e continua indo ao chat', ditoNoChat(eventos), ['Bahia', 'Ceara', 'Piaui', 'Sergipe']);

    const quase = palpite(sala, 'ana', 'Pernambuko');
    conferir('o "quase" tambem gasta, e aqui era a ultima', [quase.veredito, quase.chances], ['quase', 0]);

    const tarde = palpite(sala, 'ana', 'Pernambuco');
    conferir('sem chances, a resposta certa nao vale', [tarde.veredito, tarde.motivo], ['bloqueado', 'chances']);
    conferir('  nao pontua', sala.jogadores.get('ana').pontos, 0);
    conferir('  e nao vaza no chat', ditoNoChat(eventos).some((t) => /pernamb/i.test(t)), false);

    const papo = palpite(sala, 'ana', 'que dificil');
    conferir('sem chances, a conversa ainda vai ao chat', [papo.veredito, papo.chances], ['chat', undefined]);

    palpite(sala, 'bia', 'Alagoas');
    palpite(sala, 'bia', 'Paraiba');
    const bia = palpite(sala, 'bia', 'Pernambuco');
    conferir('quem ainda tem chance acerta normalmente', bia.veredito, 'certo');
    conferir('  e pontua', sala.jogadores.get('bia').pontos > 0, true);

    for (const t of ['Acre', 'Amapa', 'Goias', 'Para']) palpite(sala, 'caio', t);
    conferir('com o Caio ainda podendo pontuar, a rodada segue', sala.estado, 'pergunta');
    palpite(sala, 'caio', 'Roraima');
    await new Promise((resolver) => setTimeout(resolver, 20));
    conferir('ninguem mais pode pontuar: a rodada fecha na hora', sala.estado, 'resultado');
    sala.destruir();
  }

  /* ---------------- 2. Cair e voltar nao devolve as chances ---------------- */
  {
    const { sala } = salaNoAr('tempo', ['Ana', 'Bia'], ['Pernambuco']);
    for (const t of ['Bahia', 'Ceara', 'Piaui', 'Sergipe', 'Alagoas']) palpite(sala, 'ana', t);
    sala.sair('ana');
    sala.entrar('ana-de-novo', 'Ana');
    const volta = palpite(sala, 'ana-de-novo', 'Pernambuco');
    conferir('recarregar a pagina nao devolve as chances', [volta.veredito, volta.motivo], ['bloqueado', 'chances']);
    sala.destruir();
  }

  /* ---------------- 3. Antes da pergunta aparecer ---------------- */
  {
    const sala = new Sala('CH02', config('tempo'), () => {}, () => {});
    sala.entrar('ana', 'Ana');
    sala.iniciar();
    sala.limparTemporizador();
    const antes = palpite(sala, 'ana', 'boa sorte, gente');
    conferir('na tela da categoria, conversa nao gasta chance', [sala.estado, antes.chances], ['categoria', undefined]);
    sala.destruir();
  }

  /* ---------------- 4. Escalada ---------------- */
  {
    const { sala, eventos } = salaNoAr('escalada', ['Ana', 'Bia'], ['Recife', 'Olinda', 'Caruaru']);
    conferir('Escalada tambem avisa as chances',
      eventos.find((e) => e.evento === 'rodada:pergunta').dados.chances, 5);
    conferir('item novo nao gasta chance', palpite(sala, 'ana', 'Recife').chances, undefined);
    conferir('repetir o que ja disse nao gasta chance', palpite(sala, 'ana', 'Recife').veredito, 'repetido');
    conferir('fora da lista gasta', palpite(sala, 'ana', 'Salvador').chances, 4);
    sala.destruir();
  }

  /* ---------------- 5. Os outros modos tem regra propria ---------------- */
  {
    const modos = ['tempo', 'escalada', 'carrossel', 'carrossel-cego', 'presente-grego',
      'ranking', 'veni', 'leilao-geral', 'dando-dicas'];
    const usam = modos.filter((modo) => new Sala('CH03', config(modo), () => {}, () => {}).usaChances());
    conferir('so Modo Tempo e Escalada contam chances', usam, ['tempo', 'escalada']);
  }

  Date.now = dateNowReal;
  console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
  process.exit(falhas ? 1 : 0);
})();
