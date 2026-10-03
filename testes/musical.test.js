'use strict';

/*
 * Os dois modos musicais: Corrida musical e Qual e a musica.
 *
 * Os dois tocam os trechos de Ouvir musicas. Na Corrida a resposta e escrita
 * no chat e o primeiro acerto leva a rodada inteira; no Qual e a musica sao
 * quatro opcoes, um clique por pessoa, e quanto mais rapido mais pontos. Nos
 * dois o lider escolhe o que perguntar (o nome, quem canta ou os dois) e se a
 * partida acaba numa meta de pontos ou depois de um numero de musicas.
 */

const fs = require('fs');
const path = require('path');
const { Sala, pontosPorRapidez, PONTOS_CORRIDA } = require('../server/sala.js');
const musicas = require('../server/musicas.js');
const dificuldade = require('../server/dificuldade.js');
const { avaliar, normalizar } = require('../server/comparar.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(64), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

// Relogio controlado: o anti-spam pede 350ms entre mensagens, e os pontos do
// Qual e a musica dependem de quando o clique chegou.
const dateNowReal = Date.now;
let relogio = dateNowReal();
const emT = (sala, ms) => {
  relogio = sala.inicioPergunta + ms;
  Date.now = () => relogio;
};
const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

const { CATALOGO } = musicas;
const trecho = (nome) => CATALOGO.find((m) => m.trecho === nome);

/** Sala de um modo musical com a primeira pergunta no ar e o relogio parado. */
function salaNoAr(modo, extra = {}, nomes = ['Ana', 'Bia', 'Caio']) {
  const eventos = [];
  const sala = new Sala('MUS1', {
    categorias: ['ouvir'], subs: [], fora: [], modo, metaPontos: 999, segundosPorPergunta: 20,
    perguntar: 'os-dois', fim: 'pontos', musicas: null, ...extra
  }, (evento, dados) => eventos.push({ evento, dados }), () => {});
  for (const nome of nomes) sala.entrar(nome.toLowerCase(), nome);
  sala.iniciar();
  sala.limparTemporizador();   // nao espera a revelacao
  sala.mostrarPergunta();
  sala.limparTemporizador();   // nao deixa a rodada expirar sozinha
  relogio = sala.inicioPergunta;
  return { sala, eventos };
}

const ultimo = (eventos, nome) => eventos.filter((e) => e.evento === nome).map((e) => e.dados).pop();
const ditoNoChat = (eventos) => eventos
  .filter((e) => e.evento === 'chat:mensagem' && e.dados.tipo === 'jogador')
  .map((e) => e.dados.texto);

(async () => {
  /* ---------------- 1. O catalogo ---------------- */
  {
    conferir('os 93 trechos de Ouvir musicas viraram musica', CATALOGO.length, 93);

    const arquivos = fs.readdirSync(path.join(__dirname, '..', 'public', 'audio'))
      .filter((f) => f.endsWith('.mp3')).map((f) => musicas.trechoDe(`/audio/${f}`));
    conferir('todo arquivo de public/audio esta no catalogo',
      arquivos.filter((t) => !trecho(t)), []);
    conferir('todo trecho tem um estilo', CATALOGO.filter((m) => !m.estilo).map((m) => m.trecho), []);

    const listados = musicas.ESTILOS.flatMap((e) => e.trechos);
    conferir('nenhum trecho em dois estilos', listados.filter((t, i) => listados.indexOf(t) !== i), []);
    conferir('nenhum estilo cita trecho que nao existe', listados.filter((t) => !trecho(t)), []);
    conferir('todo trecho tem o nome ou quem canta',
      CATALOGO.filter((m) => !m.nome && !m.quem).map((m) => m.trecho), []);

    // "De qual serie e esta musica?" nao e nem o nome nem quem canta.
    conferir('a abertura do iCarly so entra perguntando quem canta',
      [Boolean(trecho('leave-it-all-to-me').nome), trecho('leave-it-all-to-me').quem.resposta],
      [false, 'Miranda Cosgrove']);
    conferir('cada pergunta escolhe o trecho certo',
      [musicas.musicasPara('nome').length, musicas.musicasPara('quem').length, musicas.musicasPara('os-dois').length],
      [92, 92, 93]);
  }

  /* ---------------- 2. As quatro opcoes ---------------- */
  {
    const tortas = [];
    const iguais = [];
    for (const musica of CATALOGO) {
      for (const tipo of ['nome', 'quem']) {
        const certa = musica[tipo];
        if (!certa) continue;
        for (let k = 0; k < 25; k++) {
          const { opcoes, certa: i } = musicas.opcoesPara(musica, tipo);
          if (opcoes.length !== 4 || opcoes[i] !== certa.resposta) tortas.push(`${musica.trecho}:${tipo}`);
          if (new Set(opcoes.map(normalizar)).size !== 4) iguais.push(`${musica.trecho}:${tipo}`);
          for (const errada of opcoes.filter((_, j) => j !== i)) {
            const aceita = [certa.resposta, ...(certa.aceita || [])].some((forma) =>
              avaliar(errada, forma).veredito !== 'chat' || avaliar(forma, errada).veredito !== 'chat');
            if (aceita) tortas.push(`${musica.trecho}:${tipo}:${errada}`);
          }
        }
      }
    }
    conferir('sempre 4 opcoes, com a certa no lugar que o servidor diz', [...new Set(tortas)], []);
    conferir('nenhuma opcao repetida', [...new Set(iguais)], []);

    // As que pegariam justamente quem sabia a resposta.
    const nunca = (nome, tipo, proibidas) => {
      const vistas = new Set();
      for (let k = 0; k < 200; k++) musicas.opcoesPara(trecho(nome), tipo).opcoes.forEach((o) => vistas.add(o));
      return proibidas.filter((p) => vistas.has(p));
    };
    conferir('Umbrella nunca oferece Jay-Z (ele canta junto)', nunca('umbrella', 'quem', ['Jay-Z']), []);
    conferir('Anti-Amor nunca oferece Jorge e Mateus', nunca('anti-amor', 'quem', ['Jorge e Mateus']), []);
    conferir('Dentro da Hilux nunca oferece os MCs que cantam junto',
      nunca('dentro-da-hilux', 'quem', ['Mc Daniel', 'MC Ryan SP']), []);
    conferir('Leave It All to Me nunca oferece Drake Bell nem Drake',
      nunca('leave-it-all-to-me', 'quem', ['Drake Bell', 'Drake']), []);
    conferir('Love Yourself nunca oferece Lose Yourself', nunca('love-yourself', 'nome', ['Lose Yourself']), []);

    // Estilo com estilo: um sertanejo no meio de rocks gringos se entrega.
    const sertanejos = musicas.ESTILOS.find((e) => e.id === 'sertanejo').trechos;
    const foraDoEstilo = [];
    for (const nome of sertanejos) {
      for (let k = 0; k < 20; k++) {
        const { opcoes } = musicas.opcoesPara(trecho(nome), 'nome');
        for (const o of opcoes) {
          if (!CATALOGO.some((m) => m.estilo === 'sertanejo' && m.nome && m.nome.resposta === o)) foraDoEstilo.push(o);
        }
      }
    }
    conferir('sertanejo: as quatro opcoes do nome sao sertanejo', [...new Set(foraDoEstilo)], []);

    const duplas = new Set(CATALOGO.filter((m) => m.quem && musicas.jeitoDe(m.quem) === 'dupla').map((m) => m.quem.resposta));
    const naoDupla = [];
    for (let k = 0; k < 50; k++) {
      for (const o of musicas.opcoesPara(trecho('propaganda'), 'quem').opcoes) if (!duplas.has(o)) naoDupla.push(o);
    }
    conferir('"Qual dupla canta" oferece duplas', [...new Set(naoDupla)], []);
  }

  /* ---------------- 3. Configuracao ---------------- */
  {
    conferir('o padrao pergunta os dois e acaba na meta',
      musicas.configMusical({}).config, { perguntar: 'os-dois', fim: 'pontos', musicas: null });
    conferir('pergunta inventada cai no padrao',
      musicas.configMusical({ perguntar: 'letra' }).config.perguntar, 'os-dois');
    conferir('por musicas guarda quantas',
      musicas.configMusical({ perguntar: 'quem', fim: 'musicas', musicas: 10 }).config,
      { perguntar: 'quem', fim: 'musicas', musicas: 10 });
    conferir('menos de 3 musicas e recusado', Boolean(musicas.configMusical({ fim: 'musicas', musicas: 2 }).erro), true);
    conferir('mais de 50 musicas e recusado', Boolean(musicas.configMusical({ fim: 'musicas', musicas: 51 }).erro), true);
    conferir('numero quebrado e recusado', Boolean(musicas.configMusical({ fim: 'musicas', musicas: 7.5 }).erro), true);
  }

  /* ---------------- 4. O endereco do trecho nao entrega a musica ---------------- */
  {
    const { sala, eventos } = salaNoAr('corrida-musical');
    const categoria = ultimo(eventos, 'rodada:categoria');
    const pergunta = ultimo(eventos, 'rodada:pergunta');
    const arquivo = sala.perguntaAtual.audio;
    conferir('a tela recebe um endereco sorteado', /^\/trecho\/[\w-]{12,}$/.test(pergunta.audio), true);
    conferir('  sem o nome do arquivo', pergunta.audio.includes(musicas.trechoDe(arquivo)), false);
    conferir('  e o servidor sabe a que arquivo ele leva', musicas.audioDoEndereco(pergunta.audio.slice(8)), arquivo);
    conferir('  o mesmo da tela da categoria, para baixar antes', categoria.audio, pergunta.audio);
    conferir('endereco inventado nao leva a nada', musicas.audioDoEndereco('inventado'), null);
    sala.destruir();
  }

  /* ---------------- 5. Corrida musical ---------------- */
  {
    const { sala, eventos } = salaNoAr('corrida-musical');
    const pergunta = ultimo(eventos, 'rodada:pergunta');
    const certa = sala.perguntaAtual.resposta;
    const idDaPergunta = sala.perguntaAtual.id;
    const antes = dificuldade.estatisticaDe(idDaPergunta);

    conferir('a Corrida mostra a mascara e conta as chances', [Boolean(pergunta.mascara), pergunta.chances], [true, 5]);
    conferir('  e nao tem opcoes', pergunta.opcoes, null);
    conferir('  a categoria diz o que vem: o nome ou quem canta',
      ['Nome da musica', 'Quem canta'].includes(pergunta.categoria.nome), true);

    emT(sala, 1000);
    const chute = sala.palpitar('bia', 'nao faco ideia');
    conferir('palpite longe vai ao chat e gasta chance', [chute.veredito, chute.chances], ['chat', 4]);

    emT(sala, 3200);
    const ana = sala.palpitar('ana', certa);
    conferir(`o primeiro acerto leva ${PONTOS_CORRIDA}`, [ana.veredito, ana.pontos, ana.posicao], ['certo', PONTOS_CORRIDA, 1]);

    emT(sala, 3300);
    const bia = sala.palpitar('bia', certa);
    conferir('quem acerta depois chega tarde', [bia.veredito, bia.motivo], ['bloqueado', 'corrida']);
    conferir('  e nao pontua', sala.jogadores.get('bia').pontos, 0);
    conferir('  e a resposta nao vaza no chat',
      ditoNoChat(eventos).some((t) => normalizar(t).includes(normalizar(certa))), false);

    await esperar(20);
    conferir('o primeiro acerto fecha a rodada na hora', sala.estado, 'resultado');
    const resultado = ultimo(eventos, 'rodada:resultado');
    conferir('o resultado traz a resposta e a ficha da musica',
      [resultado.resposta, Boolean(resultado.musica && (resultado.musica.nome || resultado.musica.artista))], [certa, true]);
    conferir('so a Ana pontuou', resultado.detalhes.filter((d) => d.ganhou > 0).map((d) => d.nickname), ['Ana']);
    conferir('a Corrida nao mexe na dificuldade aprendida', dificuldade.estatisticaDe(idDaPergunta), antes);
    conferir('nem na nota da categoria', sala.rodadaMedeTodos(), false);
    sala.destruir();
  }

  /* ---------------- 6. Corrida: ninguem mais pode pontuar ---------------- */
  {
    const { sala } = salaNoAr('corrida-musical', {}, ['Ana', 'Bia']);
    for (const nome of ['ana', 'bia']) {
      for (let i = 0; i < 5; i++) {
        relogio += 400;
        Date.now = () => relogio;
        sala.palpitar(nome, `chute numero ${i} de ${nome}`);
      }
    }
    await esperar(20);
    conferir('todo mundo sem chance: a rodada fecha sem dono', sala.estado, 'resultado');
    sala.destruir();
  }

  /* ---------------- 7. Qual e a musica ---------------- */
  {
    const { sala, eventos } = salaNoAr('qual-e-a-musica');
    const pergunta = ultimo(eventos, 'rodada:pergunta');
    const certa = sala.perguntaAtual.certa;
    const errada = (certa + 1) % 4;

    conferir('a tela recebe 4 opcoes', pergunta.opcoes.length, 4);
    conferir('  e nada que aponte a certa',
      ['certa', 'resposta', 'aceita'].filter((campo) => campo in pergunta), []);
    conferir('  sem mascara e sem chances', [pergunta.mascara, pergunta.chances], [null, null]);

    const chat = sala.palpitar('ana', 'essa eu sei');
    conferir('o chat fecha enquanto a musica toca', Boolean(chat.erro), true);

    emT(sala, 1000);
    conferir('clique certo aos 1s', sala.escolher('ana', certa), { ok: true, indice: certa });
    conferir('  os pontos so entram no fim da rodada', sala.jogadores.get('ana').pontos, 0);
    conferir('  a mesa so sabe quantos escolheram',
      ultimo(eventos, 'musica:escolheu'), { jogadorId: 'ana', quantos: 1, total: 3 });
    emT(sala, 1500);
    conferir('o segundo clique nao vale', Boolean(sala.escolher('ana', errada).erro), true);
    conferir('opcao que nao existe nao vale', Boolean(sala.escolher('bia', 7).erro), true);

    // Quem chega com a musica tocando nao viu as opcoes: joga a proxima.
    sala.entrar('davi', 'Davi');
    conferir('quem chegou no meio nao escolhe', sala.escolher('davi', certa).erro, 'Voce entra na proxima musica.');

    emT(sala, 10500);
    sala.escolher('bia', certa);
    emT(sala, 12000);
    sala.escolher('caio', errada);
    conferir('todo mundo escolheu: a rodada fecha sem esperar o relogio', sala.estado, 'pergunta');
    await esperar(800);
    conferir('  ... depois de um respiro', sala.estado, 'resultado');

    const resultado = ultimo(eventos, 'rodada:resultado');
    const ganhou = Object.fromEntries(resultado.detalhes.map((d) => [d.nickname, d.ganhou]));
    conferir('certo aos 1s vale 10, aos 10,5s vale 5, errado vale 0',
      [ganhou.Ana, ganhou.Bia, ganhou.Caio], [10, 5, 0]);
    conferir('o resultado abre as opcoes e a certa', [resultado.escolhas.opcoes, resultado.escolhas.certa],
      [pergunta.opcoes, certa]);
    conferir('  e quem marcou o que', resultado.escolhas.quem.map((q) => [q.nickname, q.indice]),
      [['Ana', certa], ['Bia', certa], ['Caio', errada]]);
    conferir('  e o detalhe de cada um', resultado.detalhes.map((d) => [d.nickname, d.escolha]),
      [['Ana', certa], ['Bia', certa], ['Caio', errada], ['Davi', null]]);
    conferir('sem "tambem valia": a resposta foi um clique', resultado.aceita, []);
    conferir('o Qual e a musica nao mede a categoria', sala.rodadaMedeTodos(), false);

    const depois = sala.palpitar('caio', 'eu sabia!');
    conferir('com a rodada fechada o chat volta', depois.veredito, 'chat');
    sala.destruir();
  }

  /* ---------------- 8. Qual e a musica: cair e voltar ---------------- */
  {
    const { sala, eventos } = salaNoAr('qual-e-a-musica', {}, ['Ana', 'Bia']);
    const certa = sala.perguntaAtual.certa;
    emT(sala, 2500);
    sala.escolher('ana', certa);
    sala.sair('ana');
    sala.entrar('ana-de-novo', 'Ana');
    conferir('voltar nao devolve o clique', Boolean(sala.escolher('ana-de-novo', certa).erro), true);
    emT(sala, 4000);
    sala.escolher('bia', certa);
    await esperar(800);
    const resultado = ultimo(eventos, 'rodada:resultado');
    const ana = resultado.detalhes.find((d) => d.nickname === 'Ana');
    conferir('mas o clique de antes da queda vale', ana.ganhou, 9);
    sala.destruir();
  }

  /* ---------------- 9. Pontos por rapidez ---------------- */
  {
    const casos = [
      [0, 20000, 10], [1999, 20000, 10], [2000, 20000, 9], [10500, 20000, 5],
      [19999, 20000, 1], [20000, 20000, 1], [25000, 20000, 1], [2999, 30000, 10], [3000, 30000, 9]
    ];
    conferir('dez faixas iguais, de 10 ate 1',
      casos.map(([ms, duracao]) => pontosPorRapidez(ms, duracao)), casos.map((c) => c[2]));
  }

  /* ---------------- 10. Partida por musicas ---------------- */
  {
    const { sala, eventos } = salaNoAr('qual-e-a-musica', { fim: 'musicas', musicas: 3 }, ['Ana', 'Bia']);
    const tocadas = [];
    for (let rodada = 1; rodada <= 3; rodada++) {
      if (rodada > 1) {
        sala.proximaRodada();
        sala.limparTemporizador();
        sala.mostrarPergunta();
        sala.limparTemporizador();
      }
      conferir(`musica ${rodada}: o andamento vai de 0 a 1`, sala.andamento(), (rodada - 1) / 2);
      tocadas.push(sala.perguntaAtual.audio);
      emT(sala, 1000);
      // Ana acerta todas; Bia so a primeira.
      sala.escolher('ana', sala.perguntaAtual.certa);
      sala.escolher('bia', rodada === 1 ? sala.perguntaAtual.certa : (sala.perguntaAtual.certa + 1) % 4);
      sala.limparTemporizador();
      sala.encerrarRodada();
      sala.limparTemporizador();
      conferir(`  o resultado da musica ${rodada} ${rodada === 3 ? 'fecha' : 'nao fecha'} a partida`,
        ultimo(eventos, 'rodada:resultado').acabou, rodada === 3);
    }
    conferir('nenhum trecho repetido', new Set(tocadas).size, 3);
    conferir('a meta de pontos nao conta: 30 pts e ninguem chegou a 999', sala.jogadores.get('ana').pontos, 30);
    sala.proximaRodada();
    const fim = ultimo(eventos, 'jogo:fim');
    conferir('depois da ultima, a partida acaba', [sala.estado, fim.rodadas], ['fim', 3]);
    conferir('  e vence quem fez mais pontos', fim.vencedores, ['ana']);
    sala.destruir();
  }

  /* ---------------- 11. Empate no topo ---------------- */
  {
    const { sala, eventos } = salaNoAr('corrida-musical', { fim: 'musicas', musicas: 3 }, ['Ana', 'Bia', 'Caio']);
    sala.jogadores.get('ana').pontos = 20;
    sala.jogadores.get('bia').pontos = 20;
    sala.jogadores.get('caio').pontos = 10;
    sala.terminar();
    conferir('empate no topo: as duas vencem', ultimo(eventos, 'jogo:fim').vencedores, ['ana', 'bia']);
    sala.destruir();

    const zerada = salaNoAr('corrida-musical', { fim: 'musicas', musicas: 3 }, ['Ana', 'Bia']);
    zerada.sala.terminar();
    conferir('ninguem vence com zero', ultimo(zerada.eventos, 'jogo:fim').vencedores, []);
    zerada.sala.destruir();
  }

  /* ---------------- 12. Pular ---------------- */
  {
    const { sala, eventos } = salaNoAr('qual-e-a-musica', { fim: 'musicas', musicas: 3 }, ['Ana', 'Bia', 'Caio']);
    emT(sala, 1000);
    sala.escolher('ana', sala.perguntaAtual.certa);
    sala.votarPular('bia');
    sala.votarPular('caio');
    sala.limparTemporizador();
    const pulada = ultimo(eventos, 'rodada:resultado');
    conferir('rodada pulada: quem ja tinha acertado leva', sala.jogadores.get('ana').pontos, 10);
    conferir('  e a tela recebe as opcoes abertas', pulada.escolhas.certa, sala.perguntaAtual.certa);

    sala.rodada = 2;
    sala.proximaRodada(); // a ultima musica
    sala.limparTemporizador();
    sala.mostrarPergunta();
    sala.limparTemporizador();
    sala.votarPular('bia');
    sala.votarPular('caio');
    sala.limparTemporizador();
    conferir('pular a ultima musica fecha a partida', ultimo(eventos, 'rodada:resultado').acabou, true);
    sala.destruir();
  }

  /* ---------------- 13. O que perguntar ---------------- */
  {
    const tipos = (perguntar, rodadas) => {
      const { sala } = salaNoAr('corrida-musical', { perguntar }, ['Ana']);
      const vistos = [sala.perguntaAtual.categoria.nome];
      const audios = [sala.perguntaAtual.audio];
      for (let i = 1; i < rodadas; i++) {
        sala.proximaRodada();
        sala.limparTemporizador();
        vistos.push(sala.perguntaAtual.categoria.nome);
        audios.push(sala.perguntaAtual.audio);
      }
      sala.destruir();
      return { vistos, audios };
    };
    conferir('so o nome', [...new Set(tipos('nome', 12).vistos)], ['Nome da musica']);
    conferir('so quem canta', [...new Set(tipos('quem', 12).vistos)], ['Quem canta']);

    const { vistos, audios } = tipos('os-dois', 40);
    const nomes = vistos.filter((v) => v === 'Nome da musica').length;
    conferir('os dois: metade de cada', nomes, 20);
    conferir('  e o mesmo trecho nao volta nem trocando a pergunta', new Set(audios).size, 40);
  }

  /* ---------------- 14. Os modos musicais pedem musica, nao categoria ---------------- */
  {
    const { MODOS } = require('../server/sala.js');
    const musicais = MODOS.filter((m) => m.musical).map((m) => m.id);
    conferir('os dois modos aparecem marcados como musicais', musicais, ['corrida-musical', 'qual-e-a-musica']);
    conferir('  e disponiveis', MODOS.filter((m) => m.musical && m.disponivel).length, 2);
  }

  Date.now = dateNowReal;
  console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
  process.exit(falhas ? 1 : 0);
})();
