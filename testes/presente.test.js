'use strict';

/*
 * Modo Presente Grego: joga-se em equipes. Um integrante ve a pergunta e leiloa
 * quantas respostas o PARCEIRO consegue dizer; o parceiro so descobre a
 * pergunta quando o leilao acaba. O lance sobe ate alguem duvidar, e ai a
 * equipe do ultimo lance tem que entregar o que prometeu.
 */

const { Sala } = require('../server/sala.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(52), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

const NOMES = ['Ana', 'Bia', 'Caio', 'Duda', 'Elis', 'Fabio'];

function montarSala(quantos = 4, modo = 'presente-grego') {
  const eventos = [];
  const privados = [];
  const sala = new Sala(
    'PG01',
    { categorias: ['geografia'], modo, metaPontos: 9999, segundosPorPergunta: 20 },
    (evento, dados) => eventos.push({ evento, dados }),
    (para, evento, dados) => privados.push({ para, evento, dados })
  );
  for (let i = 0; i < quantos; i++) sala.entrar(NOMES[i].toLowerCase(), NOMES[i]);
  return { sala, eventos, privados };
}

/** Sala ja com o leilao da rodada 1 aberto e sem temporizadores soltos. */
function novaSala(quantos = 4) {
  const tudo = montarSala(quantos);
  tudo.sala.iniciar();
  tudo.sala.limparTemporizador();
  tudo.sala.mostrarPergunta();   // categoria -> leilao
  tudo.sala.limparTemporizador();
  return tudo;
}

/** Quem esta com a palavra no leilao. */
const daVez = (sala) => sala.leiloeiroDe(sala.equipePorId(sala.leilao.equipes[sala.leilao.vez]));

/** Faz um lance pela equipe da vez e para os temporizadores. */
function apostar(sala, valor) {
  const quem = daVez(sala);
  const r = sala.apostar(quem, valor);
  sala.limparTemporizador();
  return { quem, ...r };
}

/** Responde um item ainda livre pelo jogador informado. */
function responder(sala, socketId) {
  const livre = sala.perguntaAtual.itens.findIndex((_, i) => !sala.itensUsados.has(i));
  sala.jogadores.get(socketId).ultimaMensagem = 0;
  const r = sala.palpitar(socketId, sala.perguntaAtual.itens[livre].oficial);
  sala.limparTemporizador();
  return r;
}

/* ---------------- Quem pode comecar a partida ---------------- */
{
  const { sala } = montarSala(3);
  conferir('3 jogadores deixam uma equipe sozinha',
    /sozinha/.test(sala.iniciar().erro || ''), true);
  sala.destruir();

  // Impar entra: 3 contra 2 vale. O que nao vale e equipe com menos de dois.
  const { sala: sala2 } = montarSala(5);
  conferir('impar entra: 3 contra 2', sala2.iniciar().ok, true);
  sala2.limparTemporizador();
  conferir('  e as equipes ficam 3 x 2', sala2.equipes.map((e) => e.jogadores.length), [3, 2]);
  sala2.destruir();

  const { sala: sala5 } = montarSala(5);
  sala5.equipes[0].jogadores.push(...sala5.equipes[1].jogadores.splice(0));
  conferir('com todo mundo de um lado so, falta adversario',
    /Faltam equipes/.test(sala5.iniciar().erro || ''), true);
  sala5.destruir();

  const { sala: sala3 } = montarSala(4);
  conferir('4 jogadores entram', sala3.iniciar().ok, true);
  sala3.limparTemporizador();
  conferir('  e viram 2 equipes de 2', sala3.equipes.map((d) => d.jogadores.length), [2, 2]);
  conferir('  com todo mundo em alguma equipe',
    new Set(sala3.equipes.flatMap((d) => d.jogadores)).size, 4);
  sala3.destruir();
}

/* ---------------- Os papeis alternam a cada rodada ---------------- */
{
  const { sala } = novaSala(4);
  const equipe = sala.equipes[0];

  const leiloeiroR1 = sala.leiloeiroDe(equipe);
  const respondedorR1 = sala.respondedorDe(equipe);
  conferir('leiloeiro e respondedor sao pessoas diferentes',
    leiloeiroR1 !== respondedorR1, true);

  sala.rodada = 2;
  conferir('na rodada seguinte os papeis trocam',
    sala.leiloeiroDe(equipe), respondedorR1);
  conferir('  e quem apostou passa a responder',
    sala.respondedorDe(equipe), leiloeiroR1);
  sala.destruir();
}

/* ---------------- A pergunta so vai para quem leiloa ---------------- */
{
  const { sala, eventos, privados } = novaSala(4);

  const publicos = JSON.stringify(eventos.filter((e) => e.evento !== 'chat:mensagem'));
  conferir('o enunciado nao sai no evento da sala',
    publicos.includes(sala.perguntaAtual.pergunta), false);

  const comAPergunta = privados.filter((p) => p.evento === 'leilao:pergunta');
  conferir('cada equipe recebe a pergunta uma vez', comAPergunta.length, 2);
  conferir('  e quem recebeu foi o leiloeiro de cada equipe',
    comAPergunta.map((p) => p.para).sort(),
    sala.equipes.map((d) => sala.leiloeiroDe(d)).sort());
  conferir('  com o enunciado inteiro',
    comAPergunta[0].dados.pergunta, sala.perguntaAtual.pergunta);

  // Quem vai responder nao pode ter recebido nada.
  const respondedores = sala.equipes.map((d) => sala.respondedorDe(d));
  conferir('  e quem vai responder nao recebeu nada',
    comAPergunta.some((p) => respondedores.includes(p.para)), false);

  conferir('o enunciado nao traz numero de respostas',
    /Cite \d+ /.test(sala.perguntaAtual.pergunta), false);
  sala.destruir();
}

/* ---------------- O chat fica trancado durante o leilao ---------------- */
{
  const { sala } = novaSala(4);
  const quem = daVez(sala);
  sala.jogadores.get(quem).ultimaMensagem = 0;
  const r = sala.palpitar(quem, 'e sobre paises, galera');
  conferir('ninguem escreve durante o leilao', /leilao/.test(r.erro || ''), true);
  sala.destruir();
}

/* ---------------- Regras do lance ---------------- */
{
  const { sala } = novaSala(4);
  const quem = daVez(sala);
  const outro = sala.leiloeiroDe(sala.equipePorId(sala.leilao.equipes[1]));

  conferir('quem nao esta na vez nao aposta',
    sala.apostar(outro, 3).erro, 'Nao e a sua vez no leilao.');
  conferir('nao da para duvidar antes do primeiro lance',
    /Abra o leilao/.test(sala.duvidar(quem).erro || ''), true);

  const primeiro = apostar(sala, 4);
  conferir('o primeiro lance entra', primeiro.aposta, 4);
  conferir('  e a palavra passa para a outra equipe', daVez(sala) !== quem, true);

  const agora = daVez(sala);
  conferir('lance igual nao cobre', sala.apostar(agora, 4).erro, 'A aposta precisa ser maior que 4.');
  conferir('lance menor nao cobre', sala.apostar(agora, 2).erro, 'A aposta precisa ser maior que 4.');
  conferir('lance quebrado nao vale', sala.apostar(agora, 5.5).erro, 'A aposta e um numero inteiro.');
  conferir('lance acima do teto nao vale', /teto/.test(sala.apostar(agora, 999).erro || ''), true);

  // Pular de 4 para 11 e legitimo: vale qualquer numero maior que o anterior.
  const salto = apostar(sala, 11);
  conferir('qualquer numero maior vale', salto.aposta, 11);
  conferir('  e o lance na mesa e o ultimo', sala.leilao.aposta, 11);
  sala.destruir();
}

/* ---------------- Nao se duvida do proprio lance ---------------- */
{
  const { sala } = novaSala(4);
  apostar(sala, 3);
  apostar(sala, 5);   // a outra equipe cobriu
  // Agora a palavra voltou para quem abriu; o lance na mesa e da outra equipe.
  const quem = daVez(sala);
  const minhaEquipe = sala.equipePorId(sala.leilao.equipes[sala.leilao.vez]);
  conferir('o lance na mesa e da outra equipe',
    sala.leilao.equipeAposta !== minhaEquipe.id, true);
  conferir('e da para duvidar dele', sala.duvidar(quem).ok, true);
  sala.limparTemporizador();
  sala.destruir();
}

/* ---------------- Duvidar cobra o ultimo lance ---------------- */
{
  const { sala, eventos } = novaSala(4);
  const abriu = apostar(sala, 3);
  const cobriu = apostar(sala, 6);

  const duvidoso = daVez(sala);
  sala.duvidar(duvidoso);
  sala.limparTemporizador();

  const fim = eventos.filter((e) => e.evento === 'leilao:fim').pop().dados;
  conferir('o duvido fecha o leilao no ultimo lance', fim.aposta, 6);
  conferir('  desafiando a equipe que apostou', fim.equipeAposta, sala.equipeDe(cobriu.quem).id);
  conferir('  e quem responde e o PARCEIRO de quem apostou',
    fim.respondedor, sala.respondedorDe(sala.equipeDe(cobriu.quem)));
  conferir('  nunca quem fez o lance', fim.respondedor !== cobriu.quem, true);
  conferir('a rodada passa a pedir o tamanho da aposta',
    sala.perguntaAtual.necessarias, 6);
  conferir('quem abriu o leilao nao e o desafiado',
    fim.respondedor !== abriu.quem, true);
  sala.destruir();
}

/* ---------------- Leilao fechado nao aceita mais nada ---------------- */
{
  // Entre o "duvido" e a pergunta aparecer passam alguns segundos de tela, e
  // a sala continua no estado 'leilao'. Um lance atrasado nao pode entrar
  // nessa brecha e trocar quem foi desafiado.
  const { sala } = novaSala(4);
  apostar(sala, 2);
  const cobriu = apostar(sala, 4);
  sala.duvidar(daVez(sala));
  sala.limparTemporizador();

  const desafiado = sala.leilao.respondedor;
  const atrasado = sala.leiloeiroDe(sala.equipePorId(sala.leilao.equipes[sala.leilao.vez]));

  conferir('lance depois do duvido nao entra',
    sala.apostar(atrasado, 9).erro, 'O leilao nao esta aberto.');
  conferir('duvido depois do duvido tambem nao',
    sala.duvidar(atrasado).erro, 'O leilao nao esta aberto.');
  conferir('  a aposta cobrada continua a mesma', sala.leilao.aposta, 4);
  conferir('  e quem foi desafiado nao muda', sala.leilao.respondedor, desafiado);
  conferir('  que e o parceiro de quem apostou',
    desafiado, sala.respondedorDe(sala.equipeDe(cobriu.quem)));
  sala.destruir();
}

/* ---------------- So o desafiado responde ---------------- */
{
  const { sala } = novaSala(4);
  apostar(sala, 3);
  apostar(sala, 4);
  sala.duvidar(daVez(sala));
  sala.limparTemporizador();
  sala.mostrarPergunta();      // leilao -> pergunta
  sala.limparTemporizador();

  conferir('a rodada esta na fase de responder', sala.estado, 'pergunta');

  const desafiado = sala.leilao.respondedor;
  const intruso = [...sala.jogadores.keys()].find((id) => id !== desafiado);
  sala.jogadores.get(intruso).ultimaMensagem = 0;
  const r = sala.palpitar(intruso, sala.perguntaAtual.itens[0].oficial);
  conferir('quem nao foi desafiado nao responde', /desafiado/.test(r.erro || ''), true);

  const ok = responder(sala, desafiado);
  conferir('o desafiado responde', ok.veredito, 'item');
  conferir('  e o item ainda nao vale ponto', sala.jogadores.get(desafiado).pontos, 0);
  sala.destruir();
}

/* ---------------- Entregou: a equipe que apostou leva ---------------- */
{
  const { sala } = novaSala(4);
  apostar(sala, 2);
  const cobriu = apostar(sala, 3);
  sala.duvidar(daVez(sala));
  sala.limparTemporizador();
  sala.mostrarPergunta();
  sala.limparTemporizador();

  const equipeQueApostou = sala.equipeDe(cobriu.quem);
  const equipeQueDuvidou = sala.equipePorId(sala.leilao.equipeDuvidou);
  const desafiado = sala.leilao.respondedor;

  for (let i = 0; i < 3; i++) responder(sala, desafiado);
  sala.encerrarRodada();
  sala.limparTemporizador();

  conferir('entregou as 3 prometidas', sala.leilao.conseguiu, true);
  conferir('a equipe que apostou leva 3x2',
    equipeQueApostou.jogadores.map((id) => sala.jogadores.get(id).pontos), [6, 6]);
  conferir('  e quem duvidou nao leva nada',
    equipeQueDuvidou.jogadores.map((id) => sala.jogadores.get(id).pontos), [0, 0]);
  sala.destruir();
}

/* ---------------- Faltou um item: quem duvidou leva ---------------- */
{
  const { sala } = novaSala(4);
  apostar(sala, 2);
  const cobriu = apostar(sala, 5);
  sala.duvidar(daVez(sala));
  sala.limparTemporizador();
  sala.mostrarPergunta();
  sala.limparTemporizador();

  const equipeQueApostou = sala.equipeDe(cobriu.quem);
  const equipeQueDuvidou = sala.equipePorId(sala.leilao.equipeDuvidou);
  const desafiado = sala.leilao.respondedor;

  // Parou a um item do combinado: no Presente Grego isso e derrota inteira.
  for (let i = 0; i < 4; i++) responder(sala, desafiado);
  sala.encerrarRodada();
  sala.limparTemporizador();

  conferir('4 de 5 nao entrega o presente', sala.leilao.conseguiu, false);
  conferir('  e o placar registra o que saiu', sala.leilao.ditas, 4);
  conferir('quem duvidou leva 5x2',
    equipeQueDuvidou.jogadores.map((id) => sala.jogadores.get(id).pontos), [10, 10]);
  conferir('  e quem apostou fica a zero',
    equipeQueApostou.jogadores.map((id) => sala.jogadores.get(id).pontos), [0, 0]);
  sala.destruir();
}

/* ---------------- Tempo esgotado ---------------- */
{
  // Sem lance na mesa, o tempo abre no minimo: nao da para duvidar do nada.
  const { sala } = novaSala(4);
  const quem = daVez(sala);
  sala.lanceNoTempo(sala.equipes.find((d) => d.jogadores.includes(quem)).id);
  sala.limparTemporizador();
  conferir('tempo sem lance abre no minimo', sala.leilao.aposta, 1);
  conferir('  e o leilao continua aberto', sala.estado, 'leilao');
  sala.destruir();

  // Com lance na mesa, deixar o tempo passar e o mesmo que duvidar.
  const { sala: sala2 } = novaSala(4);
  apostar(sala2, 7);
  const daVezAgora = sala2.equipePorId(sala2.leilao.equipes[sala2.leilao.vez]);
  sala2.lanceNoTempo(daVezAgora.id);
  sala2.limparTemporizador();
  conferir('tempo com lance na mesa vale como duvido', sala2.leilao.equipeDuvidou, daVezAgora.id);
  conferir('  cobrando o lance de 7', sala2.perguntaAtual.necessarias, 7);
  sala2.destruir();
}

/* ---------------- A rodada cresce junto com a aposta ---------------- */
{
  const { sala } = novaSala(4);
  apostar(sala, 1);
  apostar(sala, 2);
  sala.duvidar(daVez(sala));
  sala.limparTemporizador();

  // 2s de base + 4s por resposta prometida.
  conferir('aposta de 2 da 10s', sala.duracaoDaRodada(), 10000);
  sala.leilao.aposta = 10;
  sala.perguntaAtual.necessarias = 10;
  conferir('aposta de 10 da 42s', sala.duracaoDaRodada(), 42000);
  sala.leilao.aposta = 40;
  sala.perguntaAtual.necessarias = 40;
  conferir('aposta enorme para no teto de 120s', sala.duracaoDaRodada(), 120000);
  sala.destruir();
}

/* ---------------- Sair no meio nao trava a rodada ---------------- */
{
  // Quem tinha sido desafiado sai: a rodada nao tem como acabar.
  const { sala } = novaSala(4);
  apostar(sala, 2);
  apostar(sala, 3);
  sala.duvidar(daVez(sala));
  sala.limparTemporizador();
  sala.mostrarPergunta();
  sala.limparTemporizador();

  sala.sair(sala.leilao.respondedor);
  sala.limparTemporizador();
  conferir('sem o desafiado a rodada e cancelada', sala.estado, 'resultado');
  conferir('  e ninguem pontua',
    [...sala.jogadores.values()].map((j) => j.pontos), [0, 0, 0]);
  sala.destruir();

  // A equipe do maior lance se desfaz no meio do leilao.
  const { sala: sala2 } = novaSala(4);
  const lance = apostar(sala2, 5);
  sala2.sair(lance.quem);
  sala2.limparTemporizador();
  conferir('equipe do maior lance desfeita cancela a rodada', sala2.estado, 'resultado');
  sala2.destruir();

  // Sem duas equipes inteiras, a partida acaba na virada da rodada.
  const { sala: sala3 } = novaSala(4);
  sala3.sair(sala3.equipes[0].jogadores[0]);
  sala3.limparTemporizador();
  sala3.estado = 'resultado';
  sala3.proximaRodada();
  sala3.limparTemporizador();
  conferir('sem duas equipes inteiras o jogo acaba', sala3.estado, 'fim');
  sala3.destruir();
}

/* ---------------- Sao sempre duas equipes, de qualquer tamanho ---------------- */
{
  const { sala } = novaSala(6);
  conferir('6 jogadores dao 2 equipes de 3', sala.equipes.map((e) => e.jogadores.length), [3, 3]);
  conferir('  e as duas entram no leilao', sala.leilao.equipes.length, 2);

  const primeira = sala.leilao.equipes[0];
  apostar(sala, 2);
  conferir('a palavra passa para a outra equipe',
    sala.leilao.equipes[sala.leilao.vez] !== primeira, true);

  apostar(sala, 3);
  conferir('  e volta para a primeira', sala.leilao.equipes[sala.leilao.vez], primeira);

  // Na equipe de tres, quem leiloa e quem responde sao pessoas diferentes.
  const trio = sala.equipes[0];
  conferir('  e quem leiloa nao e quem responde',
    sala.leiloeiroDe(trio) === sala.respondedorDe(trio), false);
  sala.destruir();
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
