'use strict';

/*
 * Modo Veni, Vidi, Vici: uma palavra e tres dicas.
 *
 * Cada dica abre uma janela de 15s. O palpite fica fechado no servidor e so
 * aparece quando a janela acaba — todos de uma vez. Quem acertou leva o que a
 * dica valia (10, 6 ou 3), igual para todos, porque ninguem viu o palpite do
 * outro. Acertou alguem, a rodada acaba; nao acertou ninguem, entra a dica
 * seguinte, valendo menos.
 */

const { Sala } = require('../server/sala.js');
const { PALAVRAS } = require('../server/dicas.js');
const { normalizar } = require('../server/comparar.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(52), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

function novaSala(modo = 'veni') {
  const eventos = [];
  const sala = new Sala('VVV1',
    { categorias: ['bandeiras'], subs: [], fora: [], modo, metaPontos: 9999, segundosPorPergunta: 20 },
    (evento, dados) => eventos.push({ evento, dados }));
  sala.entrar('ana', 'Ana');
  sala.entrar('bia', 'Bia');
  return { sala, eventos };
}

/** Uma rodada de Veni parada no comeco da primeira janela. */
function rodadaAberta() {
  const { sala, eventos } = novaSala();
  sala.iniciar();
  sala.limparTemporizador();
  sala.mostrarPergunta();
  sala.limparTemporizador();          // a janela de 15s nao roda no teste
  return { sala, eventos };
}

const solta = (sala, quem, texto) => {
  sala.jogadores.get(quem).ultimaMensagem = 0;
  return sala.palpitar(quem, texto);
};

/* ---------------- O banco ---------------- */
{
  conferir('o banco tem palavra que chegue', PALAVRAS.length >= 50, true);
  const longas = PALAVRAS.filter((p) => (p.dicas || []).some((d) => d.split(" ").length > 5));
  conferir('dica e curta: no maximo cinco palavras', longas.map((p) => p.resposta), []);

  const semTres = PALAVRAS.filter((p) => !Array.isArray(p.dicas) || p.dicas.length !== 3);
  conferir('toda palavra tem tres dicas', semTres.map((p) => p.resposta), []);

  const vazias = PALAVRAS.filter((p) => (p.dicas || []).some((d) => !d || d.trim().length < 3));
  conferir('nenhuma dica em branco', vazias.map((p) => p.resposta), []);

  // A dica nao pode trazer a resposta: "o cavalo da Ferrari" entrega tudo.
  const entregam = [];
  for (const p of PALAVRAS) {
    const formas = [p.resposta, ...(p.aceita || [])].map(normalizar).filter((f) => f.length >= 4);
    for (const dica of p.dicas || []) {
      const limpa = normalizar(dica);
      if (formas.some((f) => limpa.includes(f))) entregam.push(`${p.resposta}: ${dica}`);
    }
  }
  conferir('nenhuma dica entrega a resposta', entregam, []);

  const vistas = new Map();
  const repetidas = [];
  for (const p of PALAVRAS) {
    const chave = normalizar(p.resposta);
    if (vistas.has(chave)) repetidas.push(p.resposta);
    vistas.set(chave, true);
  }
  conferir('nenhuma palavra repetida no banco', repetidas, []);
}

/* ---------------- A rodada ---------------- */
{
  const { sala, eventos } = rodadaAberta();

  const pergunta = eventos.find((e) => e.evento === 'rodada:pergunta').dados;
  conferir('a rodada manda so a primeira dica', pergunta.veni.indice, 0);
  conferir('  e diz quanto ela vale', pergunta.veni.vale, 10);
  conferir('  e quantas dicas existem', pergunta.veni.total, 3);
  conferir('a dica que foi para a tela e a primeira do banco',
    pergunta.veni.dica, sala.perguntaAtual.dicas[0]);
  conferir('o enunciado nao entrega a palavra',
    normalizar(pergunta.pergunta).includes(normalizar(sala.perguntaAtual.resposta)), false);
  conferir('o relogio da tela e a janela de 15s', pergunta.duracaoMs, 15000);
  conferir('  e a dica diz o mesmo tempo', pergunta.veni.duracaoMs, 15000);
  sala.destruir();
}

/* ---------------- O palpite fica fechado ---------------- */
{
  const { sala, eventos } = rodadaAberta();
  const antes = eventos.length;

  const r = solta(sala, 'ana', sala.perguntaAtual.resposta);
  conferir('o palpite certo nao e julgado na hora', r.veredito, 'palpite');
  conferir('  e volta so o que a pessoa escreveu', r.texto, sala.perguntaAtual.resposta);
  conferir('  sem pontuar ninguem ainda', sala.jogadores.get('ana').pontos, 0);

  const novos = eventos.slice(antes).map((e) => e.evento);
  conferir('  e nada do palpite vai para o chat', novos.includes('chat:mensagem'), false);
  conferir('  a mesa so fica sabendo que ele palpitou', novos, ['veni:palpitou']);

  const aviso = eventos[eventos.length - 1].dados;
  conferir('  o aviso conta quantos ja palpitaram', [aviso.quantos, aviso.total], [1, 2]);

  const errado = solta(sala, 'bia', 'nao faco ideia');
  conferir('o palpite errado tambem fica guardado', errado.veredito, 'palpite');

  const trocado = solta(sala, 'bia', sala.perguntaAtual.resposta);
  conferir('da para trocar de ideia enquanto a janela esta aberta', trocado.trocou, true);
  conferir('  e vale o ultimo que ficou escrito', sala.palpitesVeni.get('bia'),
    sala.perguntaAtual.resposta);
  sala.destruir();
}

/* ---------------- Travou a mesa inteira, a janela fecha ---------------- */
{
  // Travar a resposta e simplesmente responder: com todo mundo respondido nao
  // ha o que esperar do relogio.
  const { sala, eventos } = rodadaAberta();

  solta(sala, 'ana', 'chute solto');
  conferir('com um so respondido a janela segue aberta',
    eventos.some((e) => e.evento === 'veni:revelacao'), false);
  conferir('  e nada foi agendado por conta disso', sala.temporizador, null);

  solta(sala, 'bia', sala.perguntaAtual.resposta);
  conferir('respondeu o ultimo: a revelacao ja esta agendada',
    sala.temporizador !== null, true);

  sala.fecharFaseVeni();
  sala.limparTemporizador();

  const revelacao = eventos.filter((e) => e.evento === 'veni:revelacao').map((e) => e.dados)[0];
  conferir('  e ela abre os dois palpites',
    revelacao.palpites.map((x) => [x.nickname, x.certo]), [['Ana', false], ['Bia', true]]);
  sala.destruir();
}

/* ---------------- Quem sai pode fechar a conta ---------------- */
{
  const { sala, eventos } = rodadaAberta();
  solta(sala, 'ana', 'so eu respondi');
  conferir('faltava a bia', sala.temporizador, null);

  sala.sair('bia');
  sala.limparTemporizador();
  conferir('bia saiu: quem ficou ja era a mesa inteira',
    eventos.some((e) => e.evento === 'veni:revelacao')
      || sala.palpitesVeni.size >= sala.jogadores.size, true);
  sala.destruir();
}

/* ---------------- A revelacao paga todo mundo igual ---------------- */
{
  const { sala, eventos } = rodadaAberta();
  solta(sala, 'ana', sala.perguntaAtual.resposta);
  solta(sala, 'bia', sala.perguntaAtual.resposta);

  sala.fecharFaseVeni();
  sala.limparTemporizador();

  const revelacao = eventos.find((e) => e.evento === 'veni:revelacao').dados;
  conferir('a revelacao abre os palpites de todos',
    revelacao.palpites.map((p) => p.nickname), ['Ana', 'Bia']);
  conferir('  e marca quem acertou', revelacao.palpites.map((p) => p.certo), [true, true]);
  conferir('acertar na primeira dica vale 10', revelacao.vale, 10);
  conferir('  e os dois levam o mesmo: ninguem viu o palpite do outro',
    [sala.jogadores.get('ana').pontos, sala.jogadores.get('bia').pontos], [10, 10]);
  conferir('acertou alguem, a rodada acaba', revelacao.fim, true);
  sala.destruir();
}

/* ---------------- Sem acerto, entra a dica seguinte ---------------- */
{
  const { sala, eventos } = rodadaAberta();
  solta(sala, 'ana', 'chute qualquer');

  sala.fecharFaseVeni();
  sala.limparTemporizador();

  const primeira = eventos.find((e) => e.evento === 'veni:revelacao').dados;
  conferir('ninguem acertou: a rodada continua', primeira.fim, false);
  conferir('  e o palpite errado aparece riscado', primeira.palpites[0].certo, false);
  conferir('  sem pontuar ninguem', sala.jogadores.get('ana').pontos, 0);

  sala.abrirFaseVeni(1);
  sala.limparTemporizador();
  const dica2 = eventos.filter((e) => e.evento === 'veni:dica').map((e) => e.dados);
  conferir('a segunda dica entra sozinha', dica2.map((d) => d.indice), [1]);
  conferir('  e vale menos que a primeira', dica2[0].vale, 6);
  conferir('  a dica que chega e a do banco', dica2[0].dica, sala.perguntaAtual.dicas[1]);
  conferir('  com janela propria de 15s', dica2[0].duracaoMs, 15000);
  conferir('  e o palpite anterior nao conta mais', sala.palpitesVeni.size, 0);

  solta(sala, 'bia', sala.perguntaAtual.resposta);
  sala.fecharFaseVeni();
  sala.limparTemporizador();
  conferir('acertar na dica 2 vale 6', sala.jogadores.get('bia').pontos, 6);
  sala.destruir();
}

/* ---------------- A terceira dica fecha a rodada de qualquer jeito ---------------- */
{
  const { sala, eventos } = rodadaAberta();

  sala.abrirFaseVeni(2);
  sala.limparTemporizador();
  solta(sala, 'ana', sala.perguntaAtual.resposta);
  sala.fecharFaseVeni();
  sala.limparTemporizador();
  conferir('acertar na dica 3 vale 3', sala.jogadores.get('ana').pontos, 3);

  const revelacoes = eventos.filter((e) => e.evento === 'veni:revelacao').map((e) => e.dados);
  conferir('  e a rodada acaba na ultima dica', revelacoes[0].fim, true);
  sala.destruir();
}

{
  const { sala, eventos } = rodadaAberta();
  sala.abrirFaseVeni(2);
  sala.limparTemporizador();
  solta(sala, 'ana', 'nada a ver');
  sala.fecharFaseVeni();
  sala.limparTemporizador();

  const ultima = eventos.filter((e) => e.evento === 'veni:revelacao').map((e) => e.dados)[0];
  conferir('ninguem acertou na terceira: acabou assim mesmo', ultima.fim, true);
  conferir('  e ninguem pontuou', [sala.jogadores.get('ana').pontos, sala.jogadores.get('bia').pontos], [0, 0]);
  sala.destruir();
}

/* ---------------- O nome do modo ---------------- */
{
  const { MODOS } = require('../server/sala.js');
  const modo = MODOS.find((m) => m.id === 'veni');
  conferir('o modo se chama pelo que a pontuacao faz',
    modo.nome, '1 eh bom 2 ok 3 eh demais');

  const { sala } = rodadaAberta();
  conferir('  e a rodada mostra o mesmo nome',
    sala.perguntaAtual.categoria.nome, modo.nome);
  conferir('  com o mesmo icone', sala.perguntaAtual.categoria.icone, modo.icone);
  sala.destruir();
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
