'use strict';

/**
 * Login com Google: confere o bilhete que o botão do Google entrega na página.
 *
 * O botão devolve um "ID token" assinado pelo Google. O servidor NÃO confia no
 * que a página diz: confere a assinatura, a validade e se o bilhete foi
 * emitido para o NOSSO app (`GOOGLE_CLIENT_ID`). Só então usa o `sub`, o
 * identificador fixo da conta, que não muda nem se a pessoa trocar de e-mail.
 *
 * Sem `GOOGLE_CLIENT_ID` o login fica desligado e o botão nem aparece.
 * O e-mail e a foto não são guardados: o jogo só precisa saber que é a mesma
 * pessoa, e do primeiro nome para mostrar no perfil.
 */

// Colado no painel do Render, o valor pode vir com espaco ou quebra de linha
// no fim, e ai nenhum bilhete bateria com ele.
const CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || '').trim();

let verificador = null;

function ativo() {
  return Boolean(CLIENT_ID);
}

/**
 * @param {string} credencial o ID token que o botão do Google devolveu
 * @returns {Promise<{conta:string, nome:string}>} `conta` é "g:" + o sub do Google
 */
async function verificar(credencial) {
  if (!ativo()) throw new Error('Login com Google desligado.');
  if (typeof credencial !== 'string' || credencial.length > 4096) throw new Error('Bilhete invalido.');

  if (!verificador) {
    const { OAuth2Client } = require('google-auth-library');
    verificador = new OAuth2Client(CLIENT_ID);
  }
  const bilhete = await verificador.verifyIdToken({ idToken: credencial, audience: CLIENT_ID });
  const dados = bilhete.getPayload();
  if (!dados || !dados.sub) throw new Error('Bilhete sem conta.');

  return {
    conta: `g:${dados.sub}`,
    nome: String(dados.given_name || dados.name || '').slice(0, 40)
  };
}

module.exports = { ativo, verificar, CLIENT_ID };
