/*
 * Contas e progresso na nuvem (Firebase).
 *
 * - Todo jogador é registrado: quem não faz login vira "convidado" (conta anônima do Firebase).
 *   O registro guarda dados técnicos do aparelho, mas o progresso do convidado fica só no aparelho.
 * - Com login (Google ou nome de usuário + senha) o progresso é salvo na nuvem e pode ser
 *   recuperado em outro aparelho. O convidado que faz login mantém o mesmo registro (link de conta).
 * - Sem configuração (TD_FIREBASE_CONFIG = null) ou sem internet, tudo continua funcionando localmente.
 *
 * Coleções no Firestore (regras em firestore.rules):
 *   users/{uid}      perfil + aparelho + datas      (ver docs/CONTAS.md)
 *   saves/{uid}      progresso (só contas com login)
 *   usernames/{nome} reserva do nome de usuário -> uid
 */
(function (root) {
  'use strict';
  const APP_VERSION = '0.3.0';
  const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
  const EMAIL_DOMAIN = '@jogadores.defensores-da-torre.app'; // e-mail interno, nunca recebe mensagens
  const USER_RE = /^[a-z0-9_]{3,16}$/;

  const state = { enabled: false, ready: false, user: null, profile: null, error: null };
  let auth = null, db = null, fb = null;
  let listeners = [];
  let pushTimer = null;

  const notify = () => listeners.forEach((fn) => { try { fn(status()); } catch (e) { console.error(e); } });

  function status() {
    if (!state.enabled) return { mode: 'off', name: 'Neste aparelho' };
    if (!state.user) return { mode: 'connecting', name: 'Conectando...' };
    if (state.user.isAnonymous) return { mode: 'guest', name: 'Convidado' };
    const p = state.profile || {};
    return { mode: 'account', name: p.username || state.user.displayName || 'Jogador', provider: p.provider };
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = resolve; s.onerror = () => reject(new Error('falha ao carregar ' + src));
      document.head.appendChild(s);
    });
  }

  // ---------- dados técnicos do aparelho (obtidos sem pedir permissão) ----------
  async function deviceInfo() {
    const n = navigator;
    const info = {
      appVersion: APP_VERSION,
      userAgent: n.userAgent,
      language: n.language || null,
      languages: (n.languages || []).slice(0, 5),
      timezone: (Intl.DateTimeFormat().resolvedOptions().timeZone) || null,
      screen: { width: screen.width, height: screen.height, pixelRatio: window.devicePixelRatio || 1 },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      cpuCores: n.hardwareConcurrency || null,
      memoryGB: n.deviceMemory || null,
      touchPoints: n.maxTouchPoints || 0,
      connection: n.connection ? { type: n.connection.effectiveType || null, saveData: !!n.connection.saveData } : null,
      installedApp: window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches,
      model: null, os: null, osVersion: null, mobile: null, browser: null,
    };
    // Chrome/Android: modelo e versão do sistema sem pedir permissão
    if (n.userAgentData && n.userAgentData.getHighEntropyValues) {
      try {
        const h = await n.userAgentData.getHighEntropyValues(['model', 'platform', 'platformVersion', 'mobile', 'fullVersionList']);
        info.model = h.model || null;
        info.os = h.platform || null;
        info.osVersion = h.platformVersion || null;
        info.mobile = !!h.mobile;
        info.browser = (h.fullVersionList || []).filter((b) => !/Not.?A.?Brand/i.test(b.brand)).map((b) => `${b.brand} ${b.version}`).join(', ') || null;
      } catch (e) { /* navegador não suporta */ }
    }
    // reserva: extrai do userAgent
    if (!info.os) {
      const ua = n.userAgent;
      const m = ua.match(/Android ([\d.]+)/) || ua.match(/(iPhone|iPad).*OS ([\d_]+)/) || ua.match(/Windows NT ([\d.]+)/);
      if (m) { info.os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : 'Windows'; info.osVersion = (m[2] || m[1]).replace(/_/g, '.'); }
      const mm = ua.match(/Android [\d.]+; ([^;)]+)[;)]/);
      if (!info.model && mm && mm[1] !== 'K') info.model = mm[1].trim();
    }
    return info;
  }

  // ---------- registro do usuário ----------
  async function registerUser(user, extra) {
    const ref = db.collection('users').doc(user.uid);
    const snap = await ref.get();
    const FV = fb.firestore.FieldValue;
    const data = Object.assign({
      lastSeen: FV.serverTimestamp(),
      sessions: FV.increment(1),
      isGuest: user.isAnonymous,
      device: await deviceInfo(),
    }, extra || {});
    if (!snap.exists) {
      data.createdAt = FV.serverTimestamp();
      data.provider = user.isAnonymous ? 'convidado' : (data.provider || 'desconhecido');
    }
    if (!user.isAnonymous) {
      const g = (user.providerData || []).find((p) => p.providerId === 'google.com');
      if (g) Object.assign(data, { email: g.email || null, displayName: g.displayName || null, photoURL: g.photoURL || null, provider: 'google' });
    }
    await ref.set(data, { merge: true });
    const after = await ref.get();
    state.profile = after.data();
  }

  // ---------- inicialização ----------
  async function init() {
    const cfg = root.TD_FIREBASE_CONFIG;
    if (!cfg) { notify(); return status(); }
    state.enabled = true;
    notify();
    try {
      await loadScript(SDK + 'firebase-app-compat.js');
      await Promise.all([loadScript(SDK + 'firebase-auth-compat.js'), loadScript(SDK + 'firebase-firestore-compat.js')]);
      fb = root.firebase;
      fb.initializeApp(cfg);
      auth = fb.auth();
      db = fb.firestore();
      try { await auth.getRedirectResult(); } catch (e) { await handleLinkError(e); }
      await new Promise((resolve) => {
        const off = auth.onAuthStateChanged(async (user) => {
          off();
          if (!user) user = (await auth.signInAnonymously()).user;
          state.user = user;
          resolve();
        });
      });
      await registerUser(state.user);
      state.ready = true;
    } catch (e) {
      console.warn('[nuvem] indisponível, usando só o salvamento local:', e.message);
      state.error = e.message;
      state.enabled = false;
    }
    notify();
    return status();
  }

  // ---------- progresso ----------
  // "pontuação" do progresso: decide qual save vale mais ao trocar de aparelho
  function score(save) {
    if (!save) return -1;
    const ranks = Object.values(save.ranks || {}).reduce((a, b) => a + b, 0);
    return (save.unlockedLevel || 1) * 100000 + ranks * 100 + Math.min(99, Math.floor((save.florins || 0) / 1000));
  }

  async function fetchSave() {
    if (!state.ready || state.user.isAnonymous) return null;
    const snap = await db.collection('saves').doc(state.user.uid).get();
    if (!snap.exists) return null;
    try { return JSON.parse(snap.data().data); } catch (e) { return null; }
  }

  async function pushSaveNow(save) {
    if (!state.ready || !state.user || state.user.isAnonymous) return;
    await db.collection('saves').doc(state.user.uid).set({
      data: JSON.stringify(save),
      score: score(save),
      version: save.version || 1,
      updatedAt: fb.firestore.FieldValue.serverTimestamp(),
    });
  }

  // agrupa várias gravações seguidas em uma só
  function pushSave(save) {
    if (!state.ready || !state.user || state.user.isAnonymous) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => pushSaveNow(save).catch((e) => console.warn('[nuvem] falha ao salvar:', e.message)), 2500);
  }

  // após login: escolhe entre o progresso da nuvem e o do aparelho (o mais avançado)
  async function sync(localSave) {
    const cloud = await fetchSave();
    if (cloud && score(cloud) >= score(localSave)) return { save: cloud, source: 'nuvem' };
    await pushSaveNow(localSave);
    return { save: localSave, source: 'aparelho' };
  }

  // ---------- login ----------
  function toEmail(username) { return username.toLowerCase() + EMAIL_DOMAIN; }

  function friendly(e) {
    const c = (e && e.code) || '';
    if (c.includes('wrong-password') || c.includes('invalid-credential') || c.includes('user-not-found') || c.includes('invalid-login')) return 'Usuário ou senha incorretos.';
    if (c.includes('weak-password')) return 'A senha precisa ter pelo menos 6 caracteres.';
    if (c.includes('email-already-in-use')) return 'Esse nome de usuário já existe.';
    if (c.includes('network')) return 'Sem conexão com a internet.';
    if (c.includes('popup-closed') || c.includes('cancelled-popup')) return 'Login cancelado.';
    if (c.includes('too-many-requests')) return 'Muitas tentativas. Aguarde um pouco.';
    if (c.includes('unauthorized-domain')) return 'Este endereço não está autorizado no Firebase (ver docs/CONTAS.md).';
    return (e && e.message) || 'Erro desconhecido.';
  }

  async function handleLinkError(e) {
    // a conta Google já existe: entra nela (o registro de convidado fica para trás)
    if (e && e.code === 'auth/credential-already-in-use' && e.credential) {
      const r = await auth.signInWithCredential(e.credential);
      state.user = r.user;
      return true;
    }
    if (e) throw e;
    return false;
  }

  async function afterLogin(extra) {
    await registerUser(state.user, extra);
    notify();
  }

  async function loginGoogle() {
    const provider = new fb.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      if (state.user && state.user.isAnonymous) {
        const r = await state.user.linkWithPopup(provider);
        state.user = r.user;
      } else {
        state.user = (await auth.signInWithPopup(provider)).user;
      }
    } catch (e) {
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
        await (state.user && state.user.isAnonymous ? state.user.linkWithRedirect(provider) : auth.signInWithRedirect(provider));
        return;
      }
      try { await handleLinkError(e); } catch (e2) { throw new Error(friendly(e2)); }
    }
    await afterLogin({ provider: 'google' });
  }

  function validUsername(name) {
    const u = (name || '').trim();
    if (!USER_RE.test(u.toLowerCase())) throw new Error('Use de 3 a 16 caracteres: letras, números ou _ (sem espaços ou acentos).');
    return u;
  }

  async function createAccount(name, password) {
    const username = validUsername(name);
    const lower = username.toLowerCase();
    try {
      const taken = await db.collection('usernames').doc(lower).get();
      if (taken.exists) throw Object.assign(new Error(), { code: 'email-already-in-use' });
      const cred = fb.auth.EmailAuthProvider.credential(toEmail(lower), password);
      if (state.user && state.user.isAnonymous) state.user = (await state.user.linkWithCredential(cred)).user;
      else state.user = (await auth.createUserWithEmailAndPassword(toEmail(lower), password)).user;
      await db.collection('usernames').doc(lower).set({ uid: state.user.uid, createdAt: fb.firestore.FieldValue.serverTimestamp() });
    } catch (e) { throw new Error(friendly(e)); }
    await afterLogin({ username, provider: 'usuario' });
  }

  async function login(name, password) {
    const username = validUsername(name);
    try {
      state.user = (await auth.signInWithEmailAndPassword(toEmail(username), password)).user;
    } catch (e) { throw new Error(friendly(e)); }
    await afterLogin({});
  }

  async function logout() {
    clearTimeout(pushTimer);
    await auth.signOut();
    state.user = (await auth.signInAnonymously()).user;
    state.profile = null;
    await registerUser(state.user);
    notify();
  }

  root.TD_CLOUD = {
    APP_VERSION,
    init, status, onChange: (fn) => { listeners.push(fn); },
    loginGoogle, createAccount, login, logout,
    sync, pushSave, pushSaveNow,
    get ready() { return state.ready; },
  };
})(typeof self !== 'undefined' ? self : this);
