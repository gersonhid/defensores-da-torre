/*
 * Configuração de anúncios recompensados. Veja docs/ANUNCIOS.md.
 *
 * provider:
 *   'simulado' — anúncio falso de 5 s, para testar o fluxo (NÃO gera receita). Padrão enquanto não há conta.
 *   'h5'       — Google H5 Games Ads (AdSense), para o jogo publicado como site/PWA (PWABuilder).
 *   'admob'    — Google AdMob nativo, para o app gerado pelo Capacitor.
 *   'off'      — sem anúncios (botões somem).
 */
window.TD_ADS_CONFIG = {
  provider: 'simulado',
  h5: {
    client: null,      // 'ca-pub-XXXXXXXXXXXXXXXX' (ID de editor do AdSense)
    test: true,        // true = anúncios de teste do Google (use até a aprovação)
  },
  admob: {
    // ID de teste oficial do Google para anúncio premiado. Troque pelo seu ao publicar.
    rewardedId: 'ca-app-pub-3940256099942544/5224354917',
    test: true,
  },
};
