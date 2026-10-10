'use strict';

/*
 * De que rede vem a conexao: e por ela que um computador lidera uma sala so.
 *
 * Atras do proxy do Render o IP certo vem no cabecalho; rede interna (PC,
 * wi-fi de casa, o proprio proxy) fica fora do limite; e no IPv6 a casa e o
 * bloco /64 inteiro, nao cada endereco dele.
 */

const { origemDe, ipDe, ehInterno, chaveDe } = require('../server/origem.js');

let falhas = 0;
const conferir = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA'), nome.padEnd(58), JSON.stringify(obtido),
    ok ? '' : '<-- esperava ' + JSON.stringify(esperado));
};

const handshake = (headers, address = '10.0.0.5') => ({ headers, address });

/* ------------------------------- Qual IP vale ------------------------------- */

conferir('cf-connecting-ip vale primeiro',
  ipDe(handshake({ 'cf-connecting-ip': '200.1.2.3', 'x-forwarded-for': '9.9.9.9' })), '200.1.2.3');
conferir('sem ele, o primeiro do x-forwarded-for',
  ipDe(handshake({ 'x-forwarded-for': '200.1.2.3, 10.0.0.1' })), '200.1.2.3');
conferir('sem cabecalho, o endereco da conexao',
  ipDe(handshake({}, '200.1.2.3')), '200.1.2.3');
conferir('IPv4 dentro de IPv6 vira IPv4',
  ipDe(handshake({}, '::ffff:200.1.2.3')), '200.1.2.3');
conferir('handshake sem nada nao quebra', ipDe(undefined), '');

/* ----------------------------- Rede interna ----------------------------- */

for (const ip of ['127.0.0.1', '::1', '10.20.30.40', '172.16.0.1', '172.31.255.255',
  '192.168.0.10', '169.254.1.1', '100.64.0.1', 'fd12:3456::1', 'fe80::1', '']) {
  conferir(`${ip || '(vazio)'} e interno`, ehInterno(ip), true);
}
for (const ip of ['200.1.2.3', '172.32.0.1', '8.8.8.8', '2804:14c:1:2::5']) {
  conferir(`${ip} e da internet`, ehInterno(ip), false);
}

/* ------------------------------- A chave ------------------------------- */

conferir('IPv4 e o proprio IP', chaveDe('200.1.2.3'), '200.1.2.3');
conferir('IPv6 vira o bloco /64',
  chaveDe('2804:14c:65a1:4021:a1b2:c3d4:e5f6:0001'), '2804:14c:65a1:4021::/64');
conferir('dois enderecos do mesmo bloco, mesma chave',
  chaveDe('2804:14c:65a1:4021::5'), chaveDe('2804:14c:65a1:4021:ffff:1:2:3'));
conferir('bloco vizinho, outra chave',
  chaveDe('2804:14c:65a1:4022::5') === chaveDe('2804:14c:65a1:4021::5'), false);
conferir(':: no meio do bloco', chaveDe('2804::1'), '2804:0:0:0::/64');
conferir('zero a esquerda nao separa', chaveDe('2804:014c:0001:0002::1'), '2804:14c:1:2::/64');

/* ------------------------------- Origem ------------------------------- */

conferir('localhost fica fora do limite', origemDe(handshake({}, '::1')), null);
conferir('wi-fi de casa fica fora do limite', origemDe(handshake({}, '192.168.0.12')), null);
conferir('proxy sem cabecalho fica fora do limite', origemDe(handshake({}, '10.1.2.3')), null);
conferir('internet atras do proxy entra no limite',
  origemDe(handshake({ 'x-forwarded-for': '200.1.2.3, 10.0.0.1' })), '200.1.2.3');

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
