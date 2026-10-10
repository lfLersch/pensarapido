'use strict';

/**
 * De que rede vem cada conexao.
 *
 * Serve para uma coisa so: um computador nao encher o saguao de salas, uma
 * por aba. Nao e a identidade de ninguem — a casa inteira no mesmo wi-fi sai
 * pelo mesmo IP, e por isso o limite e de salas, nunca de abas: os amigos do
 * sofa continuam entrando todos na mesma sala.
 *
 * No Render a conexao chega pelo proxy, e o endereco dela e o do proxy. O de
 * quem esta do outro lado vem no cabecalho: o `cf-connecting-ip` da Cloudflare,
 * que ela mesma escreve por cima do que vier, ou, sem ele, o primeiro do
 * `x-forwarded-for`.
 *
 * Endereco de rede interna fica de fora do limite. No PC e na rede de casa
 * todo mundo e da casa; e, se o cabecalho do proxy sumir um dia, todo mundo
 * chegaria com o IP do proxy — e o site inteiro teria uma sala so.
 */

/** '::ffff:200.1.2.3' e '200.1.2.3' sao o mesmo endereco. */
function normalizarIp(ip) {
  return String(ip || '')
    .trim()
    .toLowerCase()
    .replace(/%.*$/, '')
    .replace(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/, '$1');
}

/** O IP de quem abriu a conexao, a partir do handshake do socket. */
function ipDe(handshake) {
  const cabecalhos = (handshake && handshake.headers) || {};
  const cloudflare = String(cabecalhos['cf-connecting-ip'] || '').trim();
  const encaminhado = String(cabecalhos['x-forwarded-for'] || '').split(',')[0].trim();
  return normalizarIp(cloudflare || encaminhado || (handshake && handshake.address));
}

/** Localhost, wi-fi de casa, rede do provedor ou do proxy: nada disso e alguem na internet. */
function ehInterno(ip) {
  if (!ip || ip === '::1' || ip === '::') return true;
  const v4 = /^(\d+)\.(\d+)\.\d+\.\d+$/.exec(ip);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    return a === 10 || a === 127 || a === 0
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 169 && b === 254)
      || (a === 100 && b >= 64 && b <= 127);
  }
  // IPv6: rede local (fc00::/7) e enlace (fe80::/10).
  return /^(fc|fd|fe[89ab])/.test(ip);
}

/**
 * A chave do limite. No IPv4 e o proprio IP; no IPv6 e o bloco /64, porque
 * uma casa recebe o bloco inteiro e cada aparelho (ou cada aba, se alguem
 * quiser) pode tirar um endereco novo dele.
 */
function chaveDe(ip) {
  if (!ip.includes(':')) return ip;
  const [cabeca, cauda] = ip.split('::');
  const inicio = cabeca ? cabeca.split(':') : [];
  const fim = cauda ? cauda.split(':') : [];
  const grupos = cauda === undefined
    ? inicio
    : [...inicio, ...Array(Math.max(0, 8 - inicio.length - fim.length)).fill('0'), ...fim];
  return `${grupos.slice(0, 4).map((g) => g.replace(/^0+(?=.)/, '')).join(':')}::/64`;
}

/** De que rede vem a conexao, ou null quando ela fica fora do limite. */
function origemDe(handshake) {
  const ip = ipDe(handshake);
  return ehInterno(ip) ? null : chaveDe(ip);
}

module.exports = { origemDe, ipDe, ehInterno, chaveDe, normalizarIp };
