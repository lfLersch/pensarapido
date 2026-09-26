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
conferir('Ana: conquistas no meio da partida', feitas(meio), ['relampago', 'sabichao', 'embalado']);
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

require('fs').rmSync(process.env.PERFIS_ARQUIVO, { force: true });

if (falhas) {
  console.log(`\n${falhas} falha(s).`);
  process.exit(1);
}
console.log('\nTudo certo.');
process.exit(0);
