'use strict';

/*
 * Perfil do jogador e conquistas.
 *
 * O perfil e da carteirinha do navegador e atravessa as partidas: numeros de
 * sempre (partidas, vitorias, acertos) e as conquistas que saem deles. Aqui
 * uma partida e simulada rodada a rodada, e o arquivo fica num lugar
 * temporario para nao sujar os perfis de verdade.
 */

const os = require('os');
const path = require('path');
process.env.PERFIS_ARQUIVO = path.join(os.tmpdir(), `perfis-teste-${process.pid}.json`);
delete process.env.DATABASE_URL;
// Um ID de mentira: liga o login, e nenhum bilhete de verdade vai bater com ele.
process.env.GOOGLE_CLIENT_ID = 'teste.apps.googleusercontent.com';

const { Sala } = require('../server/sala.js');
const perfis = require('../server/perfis.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(56), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

const avisos = [];
const paraSocket = [];
const s = new Sala('PER1', {
  modo: 'tempo', categorias: ['cinema'], metaPontos: 50, segundosPorPergunta: 20
}, (evento, dados) => { if (evento === 'chat:mensagem') avisos.push(dados.texto); },
(socketId, evento, dados) => paraSocket.push({ socketId, evento, dados }));

s.entrar('a', 'Ana', 'cliente-ana-0001');
s.entrar('b', 'Bia', 'cliente-bia-0002');
s.entrar('c', 'Cid'); // sem carteirinha: joga, mas nao tem perfil
s.iniciar();
s.limparTemporizador();

const ana = s.jogadores.get('a');
const bia = s.jogadores.get('b');

/** Uma rodada em que Ana acerta rapido e em primeiro, e Bia erra. */
function rodadaDaAna(dif) {
  s.acertos = new Map([['a', { ms: 1500, pontos: 10, posicao: 1, bonus: 0 }]]);
  ana.acertos += 1;
  ana.pontos += 10;
  s.anotarRodadaNosPerfis({ categoria: { id: 'cinema' } }, dif);
}

for (let i = 0; i < 5; i++) rodadaDaAna(i === 4 ? 80 : 30);

const meio = perfis.verPerfil('cliente-ana-0001');
const feitas = (p) => p.conquistas.filter((c) => c.quando).map((c) => c.id);
conferir('Ana: 5 acertos contados', meio.acertos, 5);
conferir('Ana: sequencia de 5', meio.maiorSequencia, 5);
conferir('Ana: conquistas no meio da partida', feitas(meio), ['gatilho', 'relampago', 'sabichao', 'embalado']);
conferir('as que nao sairam vem secretas, sem nome nem regra',
  meio.conquistas.filter((c) => !c.quando).every((c) => c.secreta && !c.nome && !c.descricao && !c.id), true);
conferir('Ana recebeu o aviso no socket dela', paraSocket.every((x) => x.socketId === 'a' && x.evento === 'conquista:nova'), true);
conferir('a sala ficou sabendo', avisos.some((t) => /Ana desbloqueou .*Relampago/.test(t)), true);

// Bia erra e acerta: a sequencia dela zera no erro.
s.acertos = new Map();
bia.acertos += 1;
s.anotarRodadaNosPerfis({ categoria: { id: 'cinema' } }, 30);
s.anotarRodadaNosPerfis({ categoria: { id: 'cinema' } }, 30);
conferir('Bia: 1 acerto, sem posicao nao conta como primeiro', perfis.verPerfil('cliente-bia-0002').acertos, 1);
conferir('Bia: sequencia voltou a zero depois do erro', bia.sequencia, 0);

s.terminar();
s.terminar(); // chamado de novo nao conta a partida duas vezes

const fim = perfis.verPerfil('cliente-ana-0001');
conferir('Ana: 1 partida (terminar duas vezes nao dobra)', fim.partidas, 1);
conferir('Ana: venceu (50 de 50)', fim.vitorias, 1);
conferir('Ana: estreia e primeira vitoria', ['estreia', 'primeira-vitoria'].every((id) => feitas(fim).includes(id)), true);
conferir('Bia: jogou e nao venceu', [perfis.verPerfil('cliente-bia-0002').partidas, perfis.verPerfil('cliente-bia-0002').vitorias], [1, 0]);
conferir('sem carteirinha nao vira perfil', perfis.melhores().map((j) => j.nickname), ['Ana', 'Bia']);
conferir('perfil desconhecido vem zerado', perfis.verPerfil('ninguem-000').partidas, 0);

/* ---------------- Login com Google: a conta junta os navegadores ---------------- */
{
  // Ana (1 partida, 1 vitoria neste navegador) entra com a conta do Google.
  perfis.entrarComConta('cliente-ana-0001', 'g:123', 'Ana');
  const ligada = perfis.verPerfil('cliente-ana-0001');
  conferir('login leva o que o navegador tinha', [ligada.partidas, ligada.vitorias, ligada.acertos], [1, 1, 5]);
  conferir('perfil mostra a conta', ligada.conta, { nome: 'Ana' });

  // Entrar de novo na mesma conta nao soma de novo.
  perfis.entrarComConta('cliente-ana-0001', 'g:123', 'Ana');
  conferir('entrar duas vezes nao dobra', perfis.verPerfil('cliente-ana-0001').partidas, 1);

  // No celular (outra carteirinha), Ana joga uma partida sem login e depois entra.
  perfis.fimDePartida('cliente-ana-celular', 'Ana', { venceu: false, pontos: 10 });
  perfis.entrarComConta('cliente-ana-celular', 'g:123', 'Ana');
  conferir('o celular soma na mesma conta', perfis.verPerfil('cliente-ana-celular').partidas, 2);
  conferir('e o computador ve o mesmo perfil', perfis.verPerfil('cliente-ana-0001').partidas, 2);

  // Jogando ja ligada, a partida vai para a conta.
  perfis.fimDePartida('cliente-ana-0001', 'Ana', { venceu: true, pontos: 50 });
  conferir('partida com login conta na conta', perfis.verPerfil('cliente-ana-celular').vitorias, 2);
  conferir('a conquista mais antiga fica', Boolean(perfis.verPerfil('cliente-ana-celular').conquistas.find((c) => c.id === 'relampago').quando), true);

  // Saindo, o navegador volta a jogar sem login, do zero; a conta continua.
  perfis.sairDaConta('cliente-ana-0001');
  conferir('sair: navegador volta do zero', [perfis.verPerfil('cliente-ana-0001').partidas, perfis.verPerfil('cliente-ana-0001').conta], [0, null]);
  conferir('sair: a conta continua no outro aparelho', perfis.verPerfil('cliente-ana-celular').partidas, 3);
  conferir('ranking nao lista o perfil somado duas vezes', perfis.melhores().filter((j) => j.nickname === 'Ana').length, 1);
}

/* ---------------- Nota por categoria: facil e dificil pesam diferente ---------------- */
{
  const { novaNota, chanceDeAcerto } = perfis;
  const sobe = (acertou, dif) => Math.round((novaNota(50, 10, acertou, dif) - 50) * 10) / 10;

  conferir('nota igual a dificuldade: chance meio a meio', chanceDeAcerto(70, 70), 0.5);
  conferir('acertar dificil sobe mais que acertar facil', sobe(true, 80) > sobe(true, 20), true);
  conferir('errar facil derruba mais que errar dificil', sobe(false, 20) < sobe(false, 80), true);
  conferir('acertar facil quase nao mexe (< 1 ponto)', sobe(true, 20) < 1, true);
  conferir('errar dificil quase nao mexe (> -1 ponto)', sobe(false, 80) > -1, true);
  conferir('o passo diminui com as rodadas',
    novaNota(50, 0, true, 50) - 50 > novaNota(50, 100, true, 50) - 50, true);
  conferir('a nota fica entre 0 e 100', [novaNota(99, 0, true, 100), novaNota(1, 0, false, 0)].every((n) => n >= 0 && n <= 100), true);

  // Quem acerta sempre as dificeis sobe; quem erra sempre as faceis desce.
  let craque = 50;
  let novato = 50;
  for (let i = 0; i < 30; i++) {
    craque = novaNota(craque, i, true, 75);
    novato = novaNota(novato, i, false, 25);
  }
  conferir('acertando sempre dificuldade 75, passa de 75', craque > 75, true);
  conferir('errando sempre dificuldade 25, cai abaixo de 25', novato < 25, true);
}

/* Na sala: so conta quem estava na rodada, e so nos modos em que todos respondem. */
{
  const partida = (modo) => {
    const sala = new Sala('PER2', {
      modo, categorias: ['geografia'], metaPontos: 999, segundosPorPergunta: 20
    }, () => {}, () => {});
    sala.entrar('x', 'Xena', `cliente-xena-${modo}`);
    sala.entrar('y', 'Yuri', `cliente-yuri-${modo}`);
    sala.naRodada = new Set(['x']); // Yuri chegou com a rodada no ar
    sala.acertos = new Map();
    sala.anotarRodadaNosPerfis({ categoria: { id: 'geografia' }, dificuldade: 60 }, 60);
    return sala;
  };

  partida('tempo');
  const xena = perfis.verPerfil('cliente-xena-tempo').desempenho;
  conferir('Modo Tempo: erro de quem estava conta na categoria', xena.map((l) => [l.id, l.rodadas, l.acertos]), [['geografia', 1, 0]]);
  conferir('com poucas rodadas a nota e provisoria', xena[0].provisoria, true);
  conferir('quem chegou no meio nao leva erro', perfis.verPerfil('cliente-yuri-tempo').desempenho, []);

  partida('presente-grego');
  conferir('leilao nao mexe na nota da categoria', perfis.verPerfil('cliente-xena-presente-grego').desempenho, []);
}

/* ---------------- Conquistas de jogo: gatilho, sufoco, partida sem erro, virada ---------------- */
{
  const ids = (cliente) => perfis.verPerfil(cliente).conquistas.filter((c) => c.quando).map((c) => c.id);

  // Uma partida de Modo Tempo com 4 pessoas; so a Duda e a Eva tem carteirinha.
  const sala = new Sala('PER3', {
    modo: 'tempo', categorias: ['cinema'], metaPontos: 40, segundosPorPergunta: 20
  }, () => {}, () => {});
  for (const [id, nome] of [['d', 'Duda'], ['e', 'Eva'], ['f', 'Fabi'], ['g', 'Gil']]) {
    sala.entrar(id, nome, `cliente-${nome.toLowerCase()}-0003`);
  }
  sala.iniciar();
  sala.limparTemporizador();
  const [duda, eva] = [sala.jogadores.get('d'), sala.jogadores.get('e')];

  /** Uma rodada: `quem` acerta, cada um com o seu tempo; o resto erra. */
  const rodada = (quem) => {
    sala.naRodada = new Set(sala.jogadores.keys());
    sala.duracaoPerguntaMs = 20000;
    sala.acertos = new Map();
    quem.forEach(([jogador, ms], i) => {
      sala.acertos.set(jogador.id, { ms, pontos: 10, posicao: i + 1, bonus: 0 });
      jogador.acertos += 1;
      jogador.pontos += 10;
    });
    sala.anotarRodadaNosPerfis({ categoria: { id: 'cinema' }, dificuldade: 40 }, 40);
  };

  rodada([[eva, 3000]]);                 // Eva na frente: a Duda em ultimo na metade? ainda nao
  rodada([[eva, 3000]]);                 // Eva 20 de 40: metade. Duda (0) esta em ultimo
  rodada([[duda, 19500], [eva, 4000]]);  // Duda acerta com meio segundo no relogio
  rodada([[duda, 2200]]);                // Duda sozinha, com 4 na rodada, em 2,2 s
  rodada([[duda, 5000]]);
  rodada([[duda, 5000]]);
  duda.pontos = 40;                      // e fecha a partida na frente
  sala.terminar();

  const d = ids('cliente-duda-0003');
  conferir('no ultimo segundo (19,5 s de 20)', d.includes('ultimo-segundo'), true);
  conferir('rapido no gatilho (2,2 s)', d.includes('gatilho'), true);
  conferir('so eu sei (unica a acertar, com 4 na rodada)', d.includes('so-eu'), true);
  conferir('virada: estava em ultimo na metade e venceu', d.includes('virada'), true);
  conferir('Duda errou 2 rodadas: sem Perfeicao', d.includes('perfeicao'), false);
  conferir('Eva perdeu: sem virada nem atropelo', ['virada', 'atropelo'].some((id) => ids('cliente-eva-0003').includes(id)), false);
}

/* Uma partida inteira sem errar, vencida com o dobro de pontos. */
{
  const ids = (cliente) => perfis.verPerfil(cliente).conquistas.filter((c) => c.quando).map((c) => c.id);
  const sala = new Sala('PER4', {
    modo: 'tempo', categorias: ['cinema'], metaPontos: 50, segundosPorPergunta: 20
  }, () => {}, () => {});
  sala.entrar('h', 'Hugo', 'cliente-hugo-0004');
  sala.entrar('i', 'Iris', 'cliente-iris-0004');
  sala.iniciar();
  sala.limparTemporizador();
  const hugo = sala.jogadores.get('h');
  for (let i = 0; i < 5; i++) {
    sala.naRodada = new Set(sala.jogadores.keys());
    sala.duracaoPerguntaMs = 20000;
    sala.acertos = new Map([['h', { ms: 6000, pontos: 10, posicao: 1, bonus: 0 }]]);
    hugo.acertos += 1;
    hugo.pontos += 10;
    sala.anotarRodadaNosPerfis({ categoria: { id: 'cinema' }, dificuldade: 40 }, 40);
  }
  sala.terminar();
  const h = ids('cliente-hugo-0004');
  conferir('5 rodadas, nenhuma errada: Perfeicao', h.includes('perfeicao'), true);
  conferir('50 a 0: Atropelo', h.includes('atropelo'), true);
  conferir('Iris errou todas: sem Perfeicao', ids('cliente-iris-0004').includes('perfeicao'), false);
}

/* Horario de Brasilia para a Coruja, e os contadores novos somam no login. */
{
  conferir('03:30 em Brasilia e madrugada', perfis.horaDeBrasilia(Date.parse('2026-09-26T06:30:00Z')), 3);
  conferir('15:00 em Brasilia nao e', perfis.horaDeBrasilia(Date.parse('2026-09-26T18:00:00Z')), 15);
  perfis.fimDePartida('cliente-coruja-0005', 'Coruja', { venceu: false, pontos: 0, quando: Date.parse('2026-09-26T06:30:00Z') });
  conferir('partida terminada de madrugada: Coruja',
    perfis.verPerfil('cliente-coruja-0005').conquistas.some((c) => c.id === 'coruja'), true);

  perfis.anotarRodada('cliente-junta-a', 'Juca', { acertou: true, ms: 2000, sequencia: 1 });
  perfis.anotarRodada('cliente-junta-b', 'Juca', { acertou: true, ms: 2000, sequencia: 1 });
  perfis.entrarComConta('cliente-junta-a', 'g:juca', 'Juca');
  perfis.entrarComConta('cliente-junta-b', 'g:juca', 'Juca');
  // Dois gatilhos (um em cada aparelho) viram dois na conta.
  for (let i = 0; i < 8; i++) perfis.anotarRodada('cliente-junta-a', 'Juca', { acertou: true, ms: 2000, sequencia: 1 });
  conferir('gatilhos dos dois aparelhos somam (2 + 8 = 10)',
    perfis.verPerfil('cliente-junta-a').conquistas.some((c) => c.id === 'gatilho-10'), true);
}

/* O servidor nunca aceita um bilhete sem conferir. */
(async () => {
  const google = require('../server/google.js');
  let recusou = false;
  try { await google.verificar('bilhete-inventado'); } catch { recusou = true; }
  conferir('bilhete do Google inventado e recusado', recusou, true);
  terminarTeste();
})();

function terminarTeste() {
  require('fs').rmSync(process.env.PERFIS_ARQUIVO, { force: true });

  if (falhas) {
    console.log(`\n${falhas} falha(s).`);
    process.exit(1);
  }
  console.log('\nTudo certo.');
  process.exit(0);
}
