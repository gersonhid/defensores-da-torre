/*
 * Contas e progresso na nuvem — cliente da API própria (server/, hospedada no Railway).
 *
 * - Todo jogador é registrado: sem login vira "convidado" (com dados técnicos do aparelho);
 *   o progresso do convidado fica só no aparelho.
 * - Com login (nome de usuário + senha, ou Google) o progresso vai para a nuvem e é recuperado
 *   em outro aparelho. O convidado que cria conta mantém o mesmo registro.
 * - Sem servidor configurado ou sem internet, tudo continua funcionando localmente.
 */
(function (root) {
  'use strict';
  const APP_VERSION = '0.4.0';
  const CONF = root.TD_SERVER_CONFIG || {};
  const API = (CONF.api || '').replace(/\/+$/, '');
  const TOKEN_KEY = 'defensores_token_v1';

  const state = { enabled: !!API, ready: false, user: null, token: null };
  const listeners = [];
  let pushTimer = null;

  const notify = () => listeners.forEach((fn) => { try { fn(status()); } catch (e) { console.error(e); } });
  const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } };
  const setToken = (t) => { state.token = t; try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignora */ } };

  function status() {
    if (!state.enabled) return { mode: 'off', name: 'Neste aparelho' };
    if (!state.user) return { mode: 'connecting', name: 'Conectando...' };
    if (state.user.kind === 'convidado') return { mode: 'guest', name: 'Convidado' };
    return { mode: 'account', name: state.user.username || state.user.displayName || 'Jogador', provider: state.user.kind };
  }

  async function api(method, path, body) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    let res;
    try {
      res = await fetch(API + path, {
        method,
        headers: Object.assign({ 'Content-Type': 'application/json' }, state.token ? { Authorization: 'Bearer ' + state.token } : {}),
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      });
    } catch (e) {
      throw Object.assign(new Error('Sem conexão com o servidor.'), { status: 0 });
    } finally { clearTimeout(timer); }
    let json = {};
    try { json = await res.json(); } catch (e) { /* vazio */ }
    if (!res.ok) throw Object.assign(new Error(json.erro || 'Erro ' + res.status), { status: res.status });
    return json;
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
    if (n.userAgentData && n.userAgentData.getHighEntropyValues) {
      try {
        const h = await n.userAgentData.getHighEntropyValues(['model', 'platform', 'platformVersion', 'mobile', 'fullVersionList']);
        info.model = h.model || null;
        info.os = h.platform || null;
        info.osVersion = h.platformVersion || null;
        info.mobile = !!h.mobile;
        info.browser = (h.fullVersionList || []).filter((b) => !/Not.?A.?Brand/i.test(b.brand)).map((b) => `${b.brand} ${b.version}`).join(', ') || null;
      } catch (e) { /* não suportado */ }
    }
    if (!info.os) {
      const ua = n.userAgent;
      const m = ua.match(/Android ([\d.]+)/) || ua.match(/(iPhone|iPad).*OS ([\d_]+)/) || ua.match(/Windows NT ([\d.]+)/);
      if (m) { info.os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : 'Windows'; info.osVersion = (m[2] || m[1]).replace(/_/g, '.'); }
      const mm = ua.match(/Android [\d.]+; ([^;)]+)[;)]/);
      if (!info.model && mm && mm[1] !== 'K') info.model = mm[1].trim();
    }
    return info;
  }

  function applyAuth(r) { setToken(r.token); state.user = r.user; notify(); }

  // ---------- inicialização: todo jogador é registrado ----------
  async function init() {
    if (!state.enabled) { notify(); return status(); }
    notify();
    try {
      const device = await deviceInfo();
      state.token = getToken();
      if (state.token) {
        try { state.user = (await api('POST', '/api/session', { device })).user; }
        catch (e) { if (e.status === 401) { setToken(null); } else throw e; }
      }
      if (!state.user) applyAuth(await api('POST', '/api/guest', { device }));
      state.ready = true;
    } catch (e) {
      console.warn('[nuvem] indisponível, usando só o salvamento local:', e.message);
      state.enabled = false;
    }
    notify();
    return status();
  }

  // ---------- progresso ----------
  function score(save) {
    if (!save) return -1;
    const ranks = Object.values(save.ranks || {}).reduce((a, b) => a + b, 0);
    return (save.unlockedLevel || 1) * 100000 + ranks * 100 + Math.min(99, Math.floor((save.florins || 0) / 1000));
  }
  const isAccount = () => state.ready && state.user && state.user.kind !== 'convidado';

  async function pushSaveNow(save) {
    if (!isAccount()) return;
    await api('PUT', '/api/save', { data: save });
  }
  function pushSave(save) {
    if (!isAccount()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => pushSaveNow(save).catch((e) => console.warn('[nuvem] falha ao salvar:', e.message)), 2500);
  }
  // após login: fica com o progresso mais avançado (nuvem x aparelho)
  async function sync(localSave) {
    const r = await api('GET', '/api/save');
    if (r.data && score(r.data) >= score(localSave)) return { save: r.data, source: 'nuvem' };
    await pushSaveNow(localSave);
    return { save: localSave, source: 'aparelho' };
  }

  // ---------- login ----------
  async function createAccount(username, password) {
    applyAuth(await api('POST', '/api/register', { username, password, device: await deviceInfo() }));
  }
  async function login(username, password) {
    applyAuth(await api('POST', '/api/login', { username, password, device: await deviceInfo() }));
  }
  async function loginGoogleCredential(credential) {
    applyAuth(await api('POST', '/api/google', { credential, device: await deviceInfo() }));
  }
  async function logout() {
    clearTimeout(pushTimer);
    setToken(null);
    state.user = null;
    applyAuth(await api('POST', '/api/guest', { device: await deviceInfo() }));
  }

  // botão oficial "Entrar com Google" (Google Identity Services)
  let gisLoading = null;
  function loadGis() {
    if (root.google && root.google.accounts) return Promise.resolve();
    if (!gisLoading) {
      gisLoading = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.async = true; s.onload = resolve; s.onerror = () => reject(new Error('Não foi possível carregar o login do Google.'));
        document.head.appendChild(s);
      });
    }
    return gisLoading;
  }
  async function renderGoogleButton(el, onCredential) {
    if (!CONF.googleClientId) { el.innerHTML = ''; return false; }
    await loadGis();
    root.google.accounts.id.initialize({
      client_id: CONF.googleClientId,
      callback: (resp) => onCredential(resp.credential),
      ux_mode: 'popup',
    });
    el.innerHTML = '';
    root.google.accounts.id.renderButton(el, { theme: 'filled_black', size: 'large', text: 'signin_with', shape: 'rectangular', locale: 'pt-BR', width: 260 });
    return true;
  }

  root.TD_CLOUD = {
    APP_VERSION,
    init, status, onChange: (fn) => { listeners.push(fn); },
    createAccount, login, loginGoogleCredential, logout, renderGoogleButton,
    sync, pushSave, pushSaveNow,
    get ready() { return state.ready; },
    get googleEnabled() { return !!CONF.googleClientId && state.enabled; },
  };
})(typeof self !== 'undefined' ? self : this);
