/*
 * Servidor de contas e progresso (Railway). Veja docs/CONTAS.md.
 * api: endereço da API, ex.: 'https://defensores-api.up.railway.app'
 * googleClientId: ID do cliente OAuth "Aplicativo da Web" do Google Cloud (para "Entrar com Google").
 * Enquanto api for null, o jogo salva só no aparelho.
 */
window.TD_SERVER_CONFIG = {
  api: 'https://api-production-5f9a2aef.up.railway.app',
  googleClientId: null,
  // endereço público do jogo; o link de convite é siteUrl + 'convite.html?ref=CODIGO'
  siteUrl: 'https://gersonhid.github.io/defensores-da-torre/',
};
