'use strict';

/*
 * Senso Comum: o quadro sai do top 3 que a mesa deu no Maria vai com as
 * outras (pesos 4, 3 e 2, somando 100%). Todos da vez chutam juntos; quem
 * acertou a resposta mais alta continua, o resto sai. O acerto vale a
 * porcentagem dividida por 10, arredondada (pelo menos 1).
 */

const os = require('os');
const path = require('path');
// Os testes nao podem sujar o dado de verdade.
process.env.SENSO_ARQUIVO = path.join(os.tmpdir(), `senso-teste-${process.pid}.json`);

const { Sala, MODOS, MODOS_SORTEAVEIS } = require('../server/sala.js');
const senso = require('../server/senso.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(58), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

const ultimo = (eventos, nome) => [...eventos].reverse().find((e) => e.evento === nome);

function novaSala(modo, quantos = 3) {
  const eventos = [];
  const sala = new Sala('SENS',
    { categorias: [], subs: [], fora: [], modo, metaPontos: 9999, segundosPorPergunta: 20 },
    (evento, dados) => eventos.push({ evento, dados }));
  ['ana', 'bia', 'caio', 'duda'].slice(0, quantos).forEach((id) => sala.entrar(id, id[0].toUpperCase() + id.slice(1)));
  return { sala, eventos };
}

/* ---------------- O modo ---------------- */
{
  const modo = MODOS.find((m) => m.id === 'senso-comum');
  conferir('o modo existe e esta disponivel', Boolean(modo && modo.disponivel), true);
  conferir('nao usa categorias', Boolean(modo.semCategorias), true);
  conferir('fica fora da roleta da Bagunca', MODOS_SORTEAVEIS.includes('senso-comum'), false);
}

/* ---------------- O quadro ---------------- */
{
  // O exemplo das regras: so o top 3 conta, com pesos 4, 3 e 2.
  const quadro = senso.quadroDe([
    ['azul', 'preto', 'branco', 'rosa', 'roxo'],
    ['vermelho', 'azul', 'preto', 'laranja', 'branco']
  ]);
  conferir('os pesos sao 4, 3 e 2', quadro.map((r) => [r.texto, r.peso]),
    [['azul', 7], ['preto', 5], ['vermelho', 4], ['branco', 2]]);
  conferir('a porcentagem soma 100', quadro.map((r) => r.porcento), [39, 28, 22, 11]);
  conferir('os pontos sao a porcentagem / 10', quadro.map((r) => r.pontos), [4, 3, 2, 1]);
}

{
  const quadro = senso.quadroDe([['Azul', '', ''], ['azul', 'Preto', ''], ['Azull', 'Rosa choque', 'Verde']]);
  conferir('grafias parecidas sao a mesma resposta', quadro[0].peso, 12);
  conferir('  e aparece a mais escrita', quadro[0].texto, 'Azul');
  conferir('o chute vale com 80% de precisao', senso.respostaDoChute(quadro, 'rosa choqe'), 2);
  conferir('  mas nao com menos', senso.respostaDoChute(quadro, 'azu'), -1);
  conferir('chute fora do quadro', senso.respostaDoChute(quadro, 'amarelo'), -1);
}

{
  let soma100 = true;
  for (let i = 0; i < 200; i++) {
    const valores = Array.from({ length: 1 + Math.floor(Math.random() * 15) }, () => 2 + Math.floor(Math.random() * 30));
    if (senso.inteirosQueSomam100(valores).reduce((s, v) => s + v, 0) !== 100) soma100 = false;
  }
  conferir('qualquer quadro soma exatamente 100', soma100, true);
  const quadro = senso.quadroDe(Array.from({ length: 40 }, (_, i) => [`Coisa ${'abcdefghijklmnopqrstuvwxyz'[i % 26]}${i}x`, '', '']));
  conferir('resposta com pouca % ainda vale 1 ponto', Math.min(...quadro.map((r) => r.pontos)), 1);
}

/* ---------------- Sem dado nao tem jogo ---------------- */
senso._zerar();
{
  const { sala } = novaSala('senso-comum');
  const r = sala.iniciar();
  conferir('sem dado o modo avisa e nao comeca', Boolean(r.erro && /falta dado/.test(r.erro)), true);
}
{
  for (let i = 0; i < 6; i++) senso.registrar('Top 5 cores', [['azul', 'preto', 'branco']]);
  conferir('6 pessoas ainda nao bastam', senso.prontas(), []);
  const { sala } = novaSala('senso-comum');
  conferir('  e o aviso diz quanto falta', /Top 5 cores", com 6/.test(sala.iniciar().erro), true);
  senso.registrar('Top 5 cores', [['vermelho', 'azul', 'preto']]);
  conferir('com 7 a pergunta fica pronta', senso.prontas(), ['Top 5 cores']);
}

/* ---------------- O Maria grava o top 3 ---------------- */
{
  const { sala } = novaSala('maria', 2);
  sala.iniciar();
  sala.limparTemporizador();
  sala.mostrarPergunta();
  sala.limparTemporizador();
  const pergunta = sala.maria.pergunta;
  const antes = senso.pessoasDe(pergunta);
  sala.escreverMaria('ana', ['Paris', 'Roma', 'Tokyo', 'Lima', 'Cairo'], true);
  sala.escreverMaria('bia', ['', '', '', 'Lima', ''], true);
  sala.limparTemporizador();
  sala.encerrarRodada();
  sala.limparTemporizador();
  conferir('o Maria grava quem deu algum top 3', senso.pessoasDe(pergunta) - antes, 1);
}

/* ---------------- Uma rodada ---------------- */
// Quadro: azul 40% (4 pts), preto 28% (3), vermelho 19% (2), branco 13% (1).
senso._zerar();
for (let i = 0; i < 7; i++) {
  senso.registrar('Top 5 cores', [i % 2 ? ['vermelho', 'azul', 'preto'] : ['azul', 'preto', 'branco']]);
}
{
  const { sala, eventos } = novaSala('senso-comum', 4);
  conferir('com dado o modo comeca', sala.iniciar(), { ok: true });
  sala.limparTemporizador();
  sala.mostrarPergunta();
  sala.limparTemporizador();
  const pergunta = ultimo(eventos, 'rodada:pergunta').dados;
  conferir('a pergunta e a que tem dado', pergunta.pergunta, 'Top 5 cores');
  conferir('o quadro vai fechado', [pergunta.senso.linhas, pergunta.senso.reveladas], [4, []]);
  conferir('o primeiro chute tem 13s', ultimo(eventos, 'senso:vez').dados.duracaoMs, 13000);
  conferir('  e todo mundo esta na vez', ultimo(eventos, 'senso:vez').dados.vez.length, 4);

  const fala = (id, texto) => { sala.jogadores.get(id).ultimaMensagem = 0; return sala.palpitar(id, texto); };
  conferir('o chute fica escondido', fala('ana', 'vermelho').veredito, 'palpite');
  conferir('da para trocar o chute', fala('ana', 'azul').trocou, true);
  fala('bia', 'Azul');
  fala('caio', 'preto');
  conferir('ninguem viu o chute no chat', eventos.some((e) => e.evento === 'chat:mensagem' && /azul/i.test(e.dados.texto || '')), false);
  fala('duda', 'amarelo');
  conferir('todo mundo chutou: a vez fecha', Boolean(sala.agendado), true);
  sala.limparTemporizador();
  sala.fecharVezSenso();
  sala.limparTemporizador();

  const rev = ultimo(eventos, 'senso:revelacao').dados;
  const de = (id) => rev.chutes.find((c) => c.jogadorId === id);
  conferir('quem acertou leva os pontos da resposta', [de('ana').pontos, de('bia').pontos, de('caio').pontos, de('duda').pontos], [4, 4, 3, 0]);
  conferir('continua quem acertou a mais alta', rev.continuam, ['ana', 'bia']);
  conferir('o quadro abre o que saiu', rev.reveladas.map((r) => r.texto), ['azul', 'preto']);

  sala.abrirVezSenso(new Set(rev.continuam));
  sala.limparTemporizador();
  conferir('os outros chutes tem 10s', ultimo(eventos, 'senso:vez').dados.duracaoMs, 10000);
  conferir('quem saiu nao chuta', Boolean(fala('caio', 'branco').erro), true);
  fala('ana', 'preto');      // ja tinha saido: erro
  fala('bia', 'vermelho');
  sala.limparTemporizador();
  sala.fecharVezSenso();
  sala.limparTemporizador();
  const rev2 = ultimo(eventos, 'senso:revelacao').dados;
  conferir('resposta que ja saiu conta como erro', rev2.chutes.find((c) => c.jogadorId === 'ana').motivo, 'ja tinha saido');
  conferir('  e so quem acertou continua', [rev2.continuam, rev2.fim], [['bia'], false]);

  sala.abrirVezSenso(new Set(rev2.continuam));
  sala.limparTemporizador();
  fala('bia', 'branco');
  sala.limparTemporizador();
  sala.fecharVezSenso();
  conferir('o quadro fechou: acaba a rodada', ultimo(eventos, 'senso:revelacao').dados.fim, true);
  sala.limparTemporizador();
  sala.encerrarRodada();
  sala.limparTemporizador();
  const res = ultimo(eventos, 'rodada:resultado').dados;
  conferir('o resultado traz o quadro inteiro', res.senso.quadro.map((r) => r.porcento), [40, 28, 19, 13]);
  conferir('os pontos da rodada somam', res.detalhes.map((d) => [d.jogadorId, d.ganhou]),
    [['bia', 7], ['ana', 4], ['caio', 3], ['duda', 0]]);
  conferir('o placar soma', sala.jogadores.get('bia').pontos, 7);
}

{
  // Ninguem acertou: a rodada acaba na primeira vez.
  const { sala, eventos } = novaSala('senso-comum', 2);
  sala.iniciar();
  sala.limparTemporizador();
  sala.mostrarPergunta();
  sala.limparTemporizador();
  sala.fecharVezSenso();
  sala.limparTemporizador();
  const rev = ultimo(eventos, 'senso:revelacao').dados;
  conferir('ninguem chutou: fim, e ninguem pontua', [rev.fim, rev.chutes.map((c) => c.motivo)], [true, ['nao chutou', 'nao chutou']]);
}

senso._zerar();
console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
