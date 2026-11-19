/*
 * Anúncios recompensados ("assista e ganhe"). Uma interface, três provedores:
 *   TD_ADS.available()             -> true se há como mostrar anúncio
 *   TD_ADS.showRewarded(placement) -> Promise<boolean>  (true = assistiu até o fim, dar a recompensa)
 * placement: 'reviver' | 'dobrar' (vai para os relatórios do provedor)
 */
(function (root) {
  'use strict';
  const CONF = root.TD_ADS_CONFIG || { provider: 'off' };
  let provider = CONF.provider || 'off';
  // dentro do app nativo (Capacitor) com o plugin AdMob instalado, usa AdMob automaticamente
  const inApp = !!(root.Capacitor && root.Capacitor.isNativePlatform && root.Capacitor.isNativePlatform());
  if (CONF.autoAdmobInApp && inApp && root.Capacitor.Plugins && root.Capacitor.Plugins.AdMob) provider = 'admob';
  let busy = false;

  // ---------- simulado (testes) ----------
  function showSimulated(placement) {
    return new Promise((resolve) => {
      const ov = document.createElement('div');
      ov.className = 'ad-sim';
      ov.innerHTML = `<div class="ad-box"><div class="ad-tag">ANÚNCIO DE TESTE</div>
        <div class="ad-body">📺<br>Aqui aparecerá um vídeo<br><small>(${placement})</small></div>
        <div class="ad-count">Recompensa em <b>5</b>s</div>
        <button class="btn small ad-close">Fechar sem recompensa</button></div>`;
      document.body.appendChild(ov);
      let left = 5;
      const done = (ok) => { clearInterval(iv); ov.remove(); resolve(ok); };
      const iv = setInterval(() => {
        left--;
        ov.querySelector('.ad-count b').textContent = left;
        if (left <= 0) {
          ov.querySelector('.ad-count').textContent = 'Recompensa liberada!';
          const c = ov.querySelector('.ad-close');
          c.textContent = 'Fechar e receber'; c.classList.add('primary');
          c.onclick = () => done(true);
          clearInterval(iv);
        }
      }, 1000);
      ov.querySelector('.ad-close').onclick = () => done(false);
    });
  }

  // ---------- Google H5 Games Ads (site / PWA) ----------
  let h5Ready = false;
  function initH5() {
    if (!CONF.h5 || !CONF.h5.client) { provider = 'off'; return; }
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(CONF.h5.client);
    s.crossOrigin = 'anonymous';
    s.setAttribute('data-ad-frequency-hint', '30s');
    if (CONF.h5.test) s.setAttribute('data-adbreak-test', 'on');
    document.head.appendChild(s);
    root.adsbygoogle = root.adsbygoogle || [];
    root.adBreak = root.adConfig = function (o) { root.adsbygoogle.push(o); };
    root.adConfig({ preloadAdBreaks: 'on', sound: 'on', onReady: () => { h5Ready = true; } });
  }
  function showH5(placement) {
    return new Promise((resolve) => {
      let rewarded = false, shown = false;
      root.adBreak({
        type: 'reward',
        name: placement,
        beforeReward: (showAdFn) => { shown = true; showAdFn(); },
        adViewed: () => { rewarded = true; },
        adDismissed: () => { rewarded = false; },
        adBreakDone: () => resolve(shown && rewarded),
      });
    });
  }

  // ---------- AdMob (app Capacitor) ----------
  // Detalhe do plugin: showRewardVideoAd() só termina quando o jogador GANHA a recompensa.
  // Se ele fechar antes, nada acontece — por isso usamos os eventos "Reward" e "Dismissed".
  let admob = null;
  let admobPending = null;          // { resolve, rewarded }
  const prepared = {};              // placement -> true quando já carregado
  const unitOf = (placement) => (CONF.admob.units && CONF.admob.units[placement]) || CONF.admob.rewardedId;

  function finishAdMob(ok) {
    const p = admobPending;
    admobPending = null;
    if (p) p.resolve(ok);
  }

  async function prepareAdMob(placement) {
    try {
      await admob.prepareRewardVideoAd({ adId: unitOf(placement), isTesting: !!CONF.admob.test, immersiveMode: true });
      prepared[placement] = true;
    } catch (e) { prepared[placement] = false; console.warn('[anúncios] não carregou', placement, e && e.message); }
  }

  async function initAdMob() {
    const P = root.Capacitor && root.Capacitor.Plugins;
    admob = P && P.AdMob;
    if (!admob) { provider = 'off'; return; }
    try {
      await admob.initialize({ initializeForTesting: !!CONF.admob.test });
      // consentimento (LGPD/GDPR): mostra o formulário do Google quando exigido
      try {
        const info = await admob.requestConsentInfo();
        if (info.isConsentFormAvailable && info.status === 'REQUIRED') await admob.showConsentForm();
      } catch (e) { console.warn('[anúncios] consentimento:', e && e.message); }
      admob.addListener('onRewardedVideoAdReward', () => { if (admobPending) admobPending.rewarded = true; });
      admob.addListener('onRewardedVideoAdDismissed', () => { if (admobPending) finishAdMob(admobPending.rewarded); });
      admob.addListener('onRewardedVideoAdFailedToShow', () => finishAdMob(false));
      // pré-carrega um anúncio de cada bloco para abrir rápido
      Object.keys(CONF.admob.units || {}).forEach((pl) => prepareAdMob(pl));
    } catch (e) { console.warn('[anúncios] AdMob falhou:', e); provider = 'off'; }
  }

  async function showAdMob(placement) {
    if (!prepared[placement]) await prepareAdMob(placement);
    if (!prepared[placement]) return false;
    prepared[placement] = false;
    const result = new Promise((resolve) => { admobPending = { resolve, rewarded: false }; });
    admob.showRewardVideoAd({ adId: unitOf(placement) }).catch(() => finishAdMob(false));
    const ok = await result;
    prepareAdMob(placement); // já deixa o próximo carregando
    return ok;
  }

  async function init() {
    if (provider === 'h5') initH5();
    else if (provider === 'admob') await initAdMob();
  }

  function available() {
    if (provider === 'simulado' || provider === 'admob') return true;
    if (provider === 'h5') return h5Ready || !!root.adBreak;
    return false;
  }

  async function showRewarded(placement) {
    if (busy || !available()) return false;
    busy = true;
    try {
      if (provider === 'simulado') return await showSimulated(placement);
      if (provider === 'h5') return await showH5(placement);
      if (provider === 'admob') return await showAdMob(placement);
      return false;
    } finally { busy = false; }
  }

  root.TD_ADS = { init, available, showRewarded, get provider() { return provider; } };
})(typeof self !== 'undefined' ? self : this);
