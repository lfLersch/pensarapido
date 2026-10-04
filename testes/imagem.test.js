'use strict';

/*
 * A imagem chega antes do relogio.
 *
 * A pergunta de bandeira ou de foto vinha com a URL junto, e o relogio
 * comecava na mesma hora: com a internet arrastada, a pessoa perdia segundos
 * olhando um quadro vazio enquanto os outros ja respondiam. Agora a imagem vai
 * na tela da categoria, cada navegador avisa quando ela esta pronta, e a
 * pergunta so abre (com o relogio) quando todo mundo avisou — ou quando o
 * teto de espera acaba, para ninguem travar a sala.
 */

const { Sala } = require('../server/sala.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(60), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

/** Uma sala de bandeiras (toda pergunta tem imagem) com o relogio na mao do teste. */
function montar(config = {}) {
  const eventos = [];
  const sala = new Sala('IMG1', Object.assign({
    modo: 'tempo', categorias: ['bandeiras'], metaPontos: 999, segundosPorPergunta: 20
  }, config), (evento, dados) => eventos.push({ evento, dados }));
  // O que a sala agendar fica guardado aqui, sem correr sozinho.
  sala.agendado = null;
  sala.agendar = (fn, ms) => { sala.agendado = { fn, ms }; };
  sala.limparTemporizador = () => { sala.agendado = null; };
  sala.entrar('a', 'Ana');
  sala.entrar('b', 'Bia');
  sala.iniciar();
  return { sala, eventos, ultimo: (nome) => [...eventos].reverse().find((e) => e.evento === nome) };
}

/* ---------------- 1. A imagem vai junto com a categoria ---------------- */
{
  const { sala, ultimo } = montar();
  const categoria = ultimo('rodada:categoria');
  conferir('a tela da categoria ja leva a imagem', categoria.dados.imagem, sala.perguntaAtual.imagem);
  conferir('  e a imagem existe', typeof categoria.dados.imagem === 'string' && categoria.dados.imagem.length > 0, true);
  conferir('o fim da tela da categoria passa pelo portao', sala.agendado.ms, 2800);
}

/* ---------------- 2. Todo mundo pronto antes: abre na hora ---------------- */
{
  const { sala } = montar();
  sala.imagemCarregada('a', sala.rodada);
  sala.imagemCarregada('b', sala.rodada);
  sala.agendado.fn(); // acabou a tela da categoria
  conferir('com todos prontos, a pergunta abre sem esperar', sala.estado, 'pergunta');
}

/* ---------------- 3. Falta alguem: espera, e o ultimo aviso libera ---------------- */
{
  const { sala, ultimo } = montar();
  sala.imagemCarregada('a', sala.rodada);
  sala.agendado.fn();
  conferir('faltando a Bia, a sala espera', sala.estado, 'categoria');
  conferir('  e avisa quantos ja estao prontos', ultimo('rodada:aguardando').dados.prontos, 1);
  conferir('  de quantos', ultimo('rodada:aguardando').dados.total, 2);
  conferir('  com o teto de espera agendado', sala.agendado.ms, 4000);

  sala.imagemCarregada('b', sala.rodada - 1);
  conferir('aviso de outra rodada nao conta', sala.estado, 'categoria');

  const antes = Date.now();
  sala.imagemCarregada('b', sala.rodada);
  conferir('chegou o aviso da Bia: a pergunta abre na hora', sala.estado, 'pergunta');
  conferir('  e o relogio comeca agora, nao na tela da categoria', sala.inicioPergunta >= antes, true);
  conferir('  e a pergunta leva a mesma imagem', ultimo('rodada:pergunta').dados.imagem, ultimo('rodada:categoria').dados.imagem);
}

/* ---------------- 4. Quem chegou depois nao segura a sala ---------------- */
{
  const { sala } = montar();
  sala.entrar('c', 'Cid'); // entrou com a categoria na tela
  sala.imagemCarregada('a', sala.rodada);
  sala.imagemCarregada('b', sala.rodada);
  sala.agendado.fn();
  conferir('quem entrou durante a categoria nao e esperado', sala.estado, 'pergunta');
}

/* ---------------- 5. Quem faltava saiu: abre para quem ficou ---------------- */
{
  const { sala } = montar();
  sala.imagemCarregada('a', sala.rodada);
  sala.agendado.fn();
  sala.sair('b');
  conferir('saiu quem faltava: a pergunta abre', sala.estado, 'pergunta');
}

/* ---------------- 6. O teto: internet que nao vem nao trava ninguem ---------------- */
{
  const { sala } = montar();
  sala.agendado.fn(); // ninguem avisou
  conferir('ninguem pronto: espera', sala.estado, 'categoria');
  sala.agendado.fn(); // acabou o teto
  conferir('acabou o teto: abre assim mesmo', sala.estado, 'pergunta');
  sala.imagemCarregada('a', sala.rodada);
  conferir('aviso atrasado nao faz nada', sala.estado, 'pergunta');
}

/* ---------------- 7. Sem imagem, nada muda ---------------- */
{
  const { sala, ultimo } = montar({ categorias: ['matematica'] });
  conferir('pergunta sem imagem: a categoria nao leva nada', ultimo('rodada:categoria').dados.imagem, null);
  sala.agendado.fn();
  conferir('  e a pergunta abre direto, como antes', sala.estado, 'pergunta');
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
