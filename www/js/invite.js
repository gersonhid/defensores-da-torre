/*
 * Indicação de amigos — compartilhar o link do jogo e capturar o código de convite.
 * Regras e prêmios ficam no servidor (server/src/index.js, REF). Ver docs/INDICACAO.md.
 *
 * De onde vem o código de quem convidou:
 *   - site: convite.html?ref=CODIGO  →  index.html?ref=CODIGO  (lido aqui e guardado)
 *   - app:  Play Store com &referrer=ref%3DCODIGO  →  lido na 1ª abertura (plugin nativo InstallReferrer)
 *   - à mão: o amigo digita o código na tela "Indicar amigos"
 */
(function (root) {
  'use strict';
  const GAME_NAME = 'Defensores da Torre'; // trocar junto com o nome comercial (docs/PENDENCIAS.md)
  const CONF = root.TD_SERVER_CONFIG || {};
  const SITE = (CONF.siteUrl || 'https://gersonhid.github.io/defensores-da-torre/').replace(/\/?$/, '/');
  const PENDING_KEY = 'defensores_convite_pendente';
  const REFERRER_READ_KEY = 'defensores_install_referrer_lido';
  const CODE_RE = /^[A-Za-z0-9]{4,12}$/;

  const cap = root.Capacitor;
  const inApp = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  const plugin = (name) => {
    if (!inApp) return null;
    if (cap.Plugins && cap.Plugins[name]) return cap.Plugins[name];
    try { return cap.registerPlugin ? cap.registerPlugin(name) : null; } catch (e) { return null; }
  };
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* ignora */ } },
  };

  // ---------- link e mensagem ----------
  const link = (code) => SITE + 'convite.html' + (code ? '?ref=' + encodeURIComponent(code) : '');
  const message = (code) =>
    `Bora defender a torre comigo! 🏰⚔️ Baixe o ${GAME_NAME} e vamos ver quem vai mais longe: ${link(code)}`;

  // ---------- compartilhar ----------
  const isCancel = (e) => /cancel|abort/i.test((e && (e.name + ' ' + e.message)) || '');

  // menu de compartilhamento do celular; sem ele, copia o link. Retorna 'ok' | 'copiado' | 'cancelado'
  async function share(code) {
    const text = message(code); // o link vai dentro do texto: alguns apps ignoram o campo "url"
    try {
      const Share = plugin('Share');
      if (Share) { await Share.share({ title: GAME_NAME, text, dialogTitle: 'Indicar a um amigo' }); return 'ok'; }
      if (navigator.share) { await navigator.share({ title: GAME_NAME, text }); return 'ok'; }
    } catch (e) {
      if (isCancel(e)) return 'cancelado';
      console.warn('[convite] compartilhar:', e && e.message);
    }
    return (await copy(code)) ? 'copiado' : 'falhou';
  }

  function whatsapp(code) {
    const url = 'https://wa.me/?text=' + encodeURIComponent(message(code));
    // no app, navegar para fora abre o WhatsApp/navegador; no site, abre em outra aba
    if (inApp) { location.href = url; return; }
    const w = root.open(url, '_blank', 'noopener');
    if (!w) location.href = url;
  }

  async function copy(code) {
    const t = link(code);
    try { await navigator.clipboard.writeText(t); return true; } catch (e) { /* tenta o jeito antigo */ }
    const ta = document.createElement('textarea');
    ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { /* sem suporte */ }
    ta.remove();
    return ok;
  }

  // ---------- código de quem convidou ----------
  function setPending(code) {
    code = String(code || '').trim();
    if (CODE_RE.test(code)) store.set(PENDING_KEY, code.toUpperCase());
  }
  const pending = () => store.get(PENDING_KEY);
  const clearPending = () => store.set(PENDING_KEY, null);

  // site: index.html?ref=CODIGO → guarda e limpa o endereço
  function captureFromUrl() {
    try {
      const u = new URL(location.href);
      const ref = u.searchParams.get('ref');
      if (!ref) return;
      setPending(ref);
      u.searchParams.delete('ref');
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    } catch (e) { /* ignora */ }
  }

  // app: lê o "referrer" da instalação pela Play Store (uma vez por instalação)
  async function captureFromInstall() {
    if (!inApp || store.get(REFERRER_READ_KEY)) return;
    const IR = plugin('InstallReferrer');
    if (!IR) return;
    try {
      const r = await IR.get();
      const ref = new URLSearchParams((r && r.referrer) || '').get('ref');
      if (ref) setPending(ref);
      store.set(REFERRER_READ_KEY, '1');
    } catch (e) {
      console.warn('[convite] install referrer:', e && e.message); // tenta de novo na próxima abertura
    }
  }

  captureFromUrl();

  root.TD_INVITE = { link, message, share, whatsapp, copy, pending, setPending, clearPending, captureFromInstall };
})(typeof self !== 'undefined' ? self : this);
