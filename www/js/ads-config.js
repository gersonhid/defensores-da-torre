/*
 * Configuração de anúncios recompensados. Veja docs/PROPAGANDAS.md.
 *
 * provider:
 *   'simulado' — anúncio falso de 5 s, para testar o fluxo (NÃO gera receita). Usado no site/PWA.
 *   'admob'    — Google AdMob nativo; só funciona no app gerado pelo Capacitor (Android Studio).
 *   'h5'       — Google H5 Games Ads (AdSense), para o jogo publicado como site/PWA.
 *   'off'      — sem anúncios (botões somem).
 *
 * No app Capacitor o jogo troca sozinho para 'admob' (ver autoAdmobInApp).
 */
window.TD_ADS_CONFIG = {
  provider: 'simulado',
  autoAdmobInApp: true,   // dentro do app Android (Capacitor) usa AdMob automaticamente

  admob: {
    // ID do APP (com "~"): vai no AndroidManifest.xml (meta-data com.google.android.gms.ads.APPLICATION_ID)
    appId: 'ca-app-pub-8988709771724980~4728653773',
    // ID de cada BLOCO de anúncio premiado (com "/"), um por momento do jogo
    units: {
      reviver: 'ca-app-pub-8988709771724980/7305222364',  // torre caiu -> reviver
      dobrar:  'ca-app-pub-8988709771724980/4331574667',  // tela de resultado -> dobrar Florins
    },
    // true = anúncios de TESTE do Google (obrigatório durante o desenvolvimento;
    // nunca clique em anúncios reais do seu próprio app). Mude para false só na versão da loja.
    test: true,
  },

  h5: {
    client: null,      // 'ca-pub-XXXXXXXXXXXXXXXX' (ID de editor do AdSense)
    test: true,
  },
};
