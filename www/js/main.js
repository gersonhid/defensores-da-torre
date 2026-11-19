/* Telas, entrada do usuário, salvamento e loop principal. */
(function () {
  'use strict';
  const CFG = window.TD_CONFIG;
  const P = window.TD_PROGRESS;
  const { Game } = window.TD_ENGINE;
  const BOT = window.TD_BOT;
  const CAMPAIGN_LEVELS = 50;
  const SAVE_KEY = 'defensores_torre_save_v1';

  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Math.round(n).toLocaleString('pt-BR');

  // ---------- salvamento ----------
  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const s = Object.assign(P.defaultSave(), JSON.parse(raw));
        // migração: antes o Arqueiro vinha liberado; quem já jogou continua com ele
        if (s.version < 2) {
          if (s.unlockedLevel > 1 || Object.keys(s.ranks).length) s.ranks.arq_unlock = 1;
          if (s.ranks.arq_flechas || s.ranks.arq_alcance) s.ranks.bar_forca = Math.max(1, s.ranks.bar_forca || 0);
          s.version = 2;
        }
        return s;
      }
    } catch (e) { /* armazenamento indisponível */ }
    return P.defaultSave();
  }
  function persist() {
    save.updatedAt = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignora */ }
    if (window.TD_CLOUD) window.TD_CLOUD.pushSave(save); // só envia se tiver login
  }

  let save = loadSave();
  let selLevel = save.unlockedLevel;
  let loadout = { heroes: {}, powers: {} };
  let game = null;
  let paused = false;
  let speed = 1;
  let screenStack = ['menu'];
  const ui = { armedPower: null, pointer: null };

  const canvas = $('game');
  const renderer = new window.TD_RENDER.Renderer(canvas);
  window.addEventListener('resize', () => renderer.resize());

  // ---------- navegação ----------
  const SCREENS = ['menu', 'help', 'prep', 'tree', 'pause', 'result', 'account', 'revive'];
  function show(name, push) {
    SCREENS.forEach((s) => $('screen-' + s).classList.toggle('hidden', s !== name));
    if (push) screenStack.push(name); else screenStack = [name];
    document.querySelectorAll('.js-florins').forEach((el) => { el.textContent = fmt(save.florins); });
    if (name === 'menu') renderMenu();
    if (name === 'prep') renderPrep();
    if (name === 'tree') { treeSel = null; renderTree(); }
    if (name === 'account') renderAccount();
  }

  // ---------- CONTA ----------
  const CLOUD = window.TD_CLOUD;
  function setAccMsg(text, ok) {
    const m = $('acc-msg');
    m.textContent = text || '';
    m.className = 'acc-msg' + (ok ? ' ok' : '');
  }
  function renderAccount() {
    const st = CLOUD.status();
    $('acc-name').textContent = st.name;
    $('acc-status').textContent = st.mode === 'account' ? `👤 ${st.name}` : st.mode === 'guest' ? '👤 Convidado' : st.mode === 'connecting' ? 'Conectando...' : '📱 Só neste aparelho';
    $('acc-info').textContent =
      st.mode === 'account' ? 'Seu progresso é salvo na nuvem. Entre com a mesma conta em outro aparelho para continuar de onde parou.'
        : st.mode === 'guest' ? 'Seu progresso está salvo só neste aparelho. Entre com o Google ou crie um nome de usuário para não perder o avanço e jogar em outros aparelhos.'
          : st.mode === 'connecting' ? 'Conectando ao servidor...'
            : 'Contas indisponíveis no momento (sem internet ou servidor não configurado). Seu progresso fica salvo neste aparelho.';
    const canLogin = st.mode === 'guest';
    $('acc-google').classList.toggle('hidden', !canLogin);
    $('acc-form').classList.toggle('hidden', !canLogin);
    $('acc-logout').classList.toggle('hidden', st.mode !== 'account');
  }
  async function accAction(fn, okText) {
    document.querySelectorAll('#screen-account .btn').forEach((b) => { b.disabled = true; });
    setAccMsg('Aguarde...', true);
    try {
      await fn();
      if (CLOUD.status().mode === 'account') {
        const r = await CLOUD.sync(save);
        if (r.source === 'nuvem') {
          save = Object.assign(P.defaultSave(), r.save);
          try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignora */ }
          selLevel = save.unlockedLevel;
          okText += ' Progresso recuperado da nuvem.';
        } else okText += ' Progresso deste aparelho salvo na nuvem.';
      }
      setAccMsg(okText, true);
    } catch (e) {
      setAccMsg(e.message || String(e));
    }
    document.querySelectorAll('#screen-account .btn').forEach((b) => { b.disabled = false; });
    renderAccount();
  }
  $('btn-account').onclick = () => { setAccMsg(''); show('account', true); };
  $('acc-google').onclick = () => accAction(() => CLOUD.loginGoogle(), 'Conectado com o Google!');
  $('acc-create').onclick = () => accAction(() => CLOUD.createAccount($('acc-user').value, $('acc-pass').value), 'Conta criada!');
  $('acc-login').onclick = () => accAction(() => CLOUD.login($('acc-user').value, $('acc-pass').value), 'Bem-vindo de volta!');
  $('acc-logout').onclick = () => accAction(() => CLOUD.logout(), 'Você saiu. O progresso continua neste aparelho.');
  CLOUD.onChange(() => { $('acc-name').textContent = CLOUD.status().name; if (!$('screen-account').classList.contains('hidden')) renderAccount(); });
  function back() {
    screenStack.pop();
    const stack = screenStack.length ? screenStack.slice() : ['menu'];
    show(stack[stack.length - 1]);
    screenStack = stack;
  }
  document.querySelectorAll('.js-back').forEach((b) => b.addEventListener('click', back));

  // botão "voltar" do Android (Capacitor)
  try {
    const App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (App) App.addListener('backButton', () => {
      if (game && !paused) pauseGame();
      else if (screenStack[screenStack.length - 1] !== 'menu') back();
      else App.exitApp();
    });
  } catch (e) { /* fora do Android */ }

  // ---------- MENU ----------
  function levelTag(L) {
    if (L > CAMPAIGN_LEVELS) return '♾️ Modo Infinito';
    if (P.isBossLevel(L)) return `Fase ${P.phaseOf(L)} · 👿 ${CFG.enemies[P.bossFor(L)].name}`;
    if (L <= 50) return `Fase ${P.phaseOf(L)} · nível ${((L - 1) % CFG.levels.bossEvery) + 1}/${CFG.levels.bossEvery}` + (save.cleared[L] ? ' ✔' : '');
    if (save.cleared[L]) return '✔ concluído';
    return '';
  }
  function renderMenu() {
    selLevel = Math.max(1, Math.min(selLevel, save.unlockedLevel));
    $('lvl-num').textContent = selLevel;
    $('lvl-tag').textContent = levelTag(selLevel);
    $('lvl-prev').disabled = selLevel <= 1;
    $('lvl-next').disabled = selLevel >= save.unlockedLevel;
  }
  $('lvl-prev').onclick = () => { selLevel--; renderMenu(); };
  $('lvl-next').onclick = () => { selLevel++; renderMenu(); };
  $('btn-play').onclick = () => openPrep(selLevel);
  $('btn-tree').onclick = () => show('tree', true);
  $('btn-help').onclick = () => show('help', true);
  let resetArmed = false;
  $('btn-reset').onclick = () => {
    if (!resetArmed) {
      resetArmed = true;
      $('btn-reset').textContent = 'Toque de novo para confirmar';
      setTimeout(() => { resetArmed = false; $('btn-reset').textContent = 'Apagar progresso'; }, 3000);
      return;
    }
    save = P.defaultSave(); persist(); selLevel = 1; resetArmed = false;
    $('btn-reset').textContent = 'Apagar progresso';
    show('menu');
  };

  // ---------- PREPARAÇÃO ----------
  let stats = P.computeStats(save);
  function openPrep(L) {
    selLevel = L;
    stats = P.computeStats(save);
    // mantém o time anterior se ainda couber
    if (spentPoints() > P.summonPoints(L, stats)) loadout = { heroes: {}, powers: {} };
    Object.keys(loadout.powers).forEach((id) => { if (!stats.powers[id].unlocked) delete loadout.powers[id]; });
    Object.keys(loadout.heroes).forEach((id) => { if (!stats.heroes[id].unlocked) delete loadout.heroes[id]; });
    screenStack = ['menu'];
    show('prep', true);
  }
  function spentPoints() {
    let s = 0;
    Object.entries(loadout.heroes).forEach(([id, n]) => { s += n * stats.heroes[id].cost; });
    Object.entries(loadout.powers).forEach(([id, n]) => { if (n) s += stats.powers[id].cost; });
    return s;
  }
  function heroCount() { return Object.values(loadout.heroes).reduce((a, b) => a + b, 0); }

  function renderPrep() {
    const L = selLevel;
    const total = P.summonPoints(L, stats);
    const left = total - spentPoints();
    const lv = P.generateLevel(L, P.makeRng(L * 101));
    const types = [...new Set(lv.spawns.map((s) => s.type))];
    $('prep-title').textContent = `Nível ${L}` + (L > CAMPAIGN_LEVELS ? ' ♾️' : '');
    $('prep-info').innerHTML = `${lv.waves} ondas · ~${lv.spawns.length} invasores<br>` +
      types.map((t) => `${CFG.enemies[t].icon} ${CFG.enemies[t].name}`).join(' · ');
    $('prep-left').textContent = left;
    $('prep-total').textContent = total;

    const hl = $('prep-heroes');
    hl.innerHTML = '';
    Object.entries(stats.heroes).forEach(([id, h]) => {
      const n = loadout.heroes[id] || 0;
      const div = document.createElement('div');
      div.className = 'item' + (h.unlocked ? '' : ' locked');
      div.innerHTML = `<div class="ico">${h.icon}</div>
        <div class="info"><div class="name">${h.name}</div>
        <div class="sub">${h.unlocked ? `${h.cost} pts · ❤️${fmt(h.hp)} ⚔️${fmt(h.damage)} ${h.range > 40 ? '🏹' : '🗡️'}` : '🔒 Desbloqueie na Evolução'}</div></div>`;
      if (h.unlocked) {
        const minus = btn('−', () => { if (n > 0) { loadout.heroes[id] = n - 1; renderPrep(); } }, n === 0);
        const count = document.createElement('div'); count.className = 'count'; count.textContent = n;
        const plus = btn('+', () => { loadout.heroes[id] = n + 1; renderPrep(); },
          h.cost > left || heroCount() >= CFG.heroDefaults.maxOnField);
        div.append(minus, count, plus);
      }
      hl.appendChild(div);
    });

    const pl = $('prep-powers');
    pl.innerHTML = '';
    Object.entries(stats.powers).forEach(([id, p]) => {
      const owned = !!loadout.powers[id];
      const div = document.createElement('div');
      div.className = 'item' + (p.unlocked ? '' : ' locked');
      const detail = id === 'raio' ? `${fmt(p.damage)} dano, ${Math.round(p.chains)} alvos`
        : id === 'gelo' ? `${fmt(p.dps)}/s por ${p.duration}s + lentidão`
          : `${fmt(p.damage)} dano em área`;
      div.innerHTML = `<div class="ico">${p.icon}</div>
        <div class="info"><div class="name">${p.name}</div>
        <div class="sub">${p.unlocked ? `${p.cost} pts · ${detail} · recarga ${p.cooldown.toFixed(1)}s` : '🔒 Desbloqueie em Evolução → Arcano'}</div></div>`;
      if (p.unlocked) {
        div.append(btn(owned ? '✔' : '+', () => {
          if (owned) delete loadout.powers[id]; else loadout.powers[id] = 1;
          renderPrep();
        }, !owned && p.cost > left));
      }
      pl.appendChild(div);
    });
    $('prep-start').disabled = heroCount() === 0 && !Object.keys(loadout.powers).length;
  }
  function btn(text, fn, disabled) {
    const b = document.createElement('button');
    b.className = 'btn'; b.textContent = text; b.disabled = !!disabled; b.onclick = fn;
    return b;
  }
  $('prep-auto').onclick = () => { loadout = BOT.autoLoadout(P.summonPoints(selLevel, stats), stats); renderPrep(); };
  $('prep-clear').onclick = () => { loadout = { heroes: {}, powers: {} }; renderPrep(); };
  $('prep-start').onclick = () => startGame(selLevel);

  // ---------- EVOLUÇÃO (teia) ----------
  // Cada nó tem pos: [coluna, linha]. Arestas = pré-requisitos.
  // Estados: máximo, comprado, disponível, bloqueado.
  const NODE_W = 118, NODE_H = 54, GAP_X = 34, GAP_Y = 12, PAD = 24;
  const branchIcon = {};
  CFG.branches.forEach((b) => { branchIcon[b.id] = b.icon; });
  let treeSel = null;
  let treeZoomAll = false;
  $('tree-zoom').onclick = () => { treeZoomAll = !treeZoomAll; renderTree(false); };

  function fxTotal(node, rank) {
    return node.fx.map((f) => {
      if (f.set !== undefined) return rank ? 'Desbloqueado' : '';
      if (f.m) return `${f.m > 0 ? '+' : ''}${Math.round(f.m * rank * 100)}%`;
      const v = f.a * rank;
      return `${v > 0 ? '+' : ''}${Number.isInteger(v) ? v : (v * 100).toFixed(0) + '%'}`;
    }).filter(Boolean).join(', ');
  }

  function nodeState(n) {
    const rank = P.rankOf(save, n.id);
    if (rank >= n.max) return 'maxed';
    if (P.reqMet(save, n)) return rank ? 'owned' : 'available';
    return 'locked';
  }

  const nodeXY = (n) => ({
    x: PAD + n.pos[0] * (NODE_W + GAP_X),
    y: PAD + n.pos[1] * (NODE_H + GAP_Y),
  });

  function pickDefaultNode() {
    // o nó disponível mais barato que dá para comprar; senão a raiz
    let best = null, bc = Infinity;
    CFG.tree.forEach((n) => {
      const st = nodeState(n);
      if (st !== 'available' && st !== 'owned') return;
      const c = P.nodeCost(n, P.rankOf(save, n.id));
      if (c < bc) { bc = c; best = n; }
    });
    return best || CFG.tree.find((n) => !n.req || !n.req.length);
  }

  function renderTree(keepScroll) {
    const map = $('tree-map');
    const sx = map.scrollLeft, sy = map.scrollTop;
    const cols = Math.max(...CFG.tree.map((n) => n.pos[0])) + 1;
    const rows = Math.max(...CFG.tree.map((n) => n.pos[1])) + 1;
    const W = PAD * 2 + cols * NODE_W + (cols - 1) * GAP_X;
    const H = PAD * 2 + rows * NODE_H + (rows - 1) * GAP_Y;
    if (!treeSel) treeSel = pickDefaultNode();

    // arestas (SVG atrás dos nós)
    let svg = `<svg class="tree-edges" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
    CFG.tree.forEach((n) => {
      (n.req || []).forEach(([pid, r]) => {
        const p = P.nodeById[pid];
        const a = nodeXY(p), b = nodeXY(n);
        const x1 = a.x + NODE_W, y1 = a.y + NODE_H / 2, x2 = b.x, y2 = b.y + NODE_H / 2;
        const mx = (x1 + x2) / 2;
        const met = P.rankOf(save, pid) >= r;
        svg += `<path class="edge ${met ? 'met' : 'unmet'}" d="M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}"/>`;
        if (r > 1) svg += `<text class="edge-lv ${met ? 'met' : ''}" x="${x2 - 6}" y="${y2 - 5}" text-anchor="end">Nv${r}</text>`;
      });
    });
    svg += '</svg>';

    // nós
    let html = '';
    CFG.tree.forEach((n) => {
      const st = nodeState(n);
      const { x, y } = nodeXY(n);
      const rank = P.rankOf(save, n.id);
      const sel = treeSel && treeSel.id === n.id ? ' sel' : '';
      const afford = (st === 'available' || st === 'owned') && save.florins >= P.nodeCost(n, rank) ? ' afford' : '';
      const big = n.max === 1 ? ' unlock' : '';
      const pct = Math.round(rank / n.max * 100);
      html += `<button class="tnode ${st}${afford}${big}${sel}" data-id="${n.id}" style="left:${x}px;top:${y}px">
        <span class="t-ico">${st === 'locked' ? '🔒' : branchIcon[n.branch]}</span>
        <span class="t-name">${n.name}</span>
        <span class="t-rank">${n.max > 1 ? `${rank}/${n.max}` : (rank ? '✔' : '')}</span>
        <span class="t-bar"><i style="width:${pct}%"></i></span>
      </button>`;
    });

    const canvas = $('tree-canvas');
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    // zoom: 1 = normal; "ver tudo" encaixa a teia inteira na área visível
    const fit = Math.min(1, (map.clientWidth - 4) / W, (map.clientHeight - 4) / H);
    const z = treeZoomAll ? fit : 1;
    canvas.style.zoom = z;
    $('tree-zoom').textContent = treeZoomAll ? '🔍 Aproximar' : '🔍 Ver tudo';
    canvas.innerHTML = svg + html;
    canvas.querySelectorAll('.tnode').forEach((b) => {
      b.onclick = () => { treeSel = P.nodeById[b.dataset.id]; if (treeZoomAll) { treeZoomAll = false; renderTree(false); } else renderTree(true); };
    });
    renderTreeDetail();
    document.querySelectorAll('.js-florins').forEach((el) => { el.textContent = fmt(save.florins); });

    if (keepScroll) { map.scrollLeft = sx; map.scrollTop = sy; }
    else {
      const { x, y } = nodeXY(treeSel);
      map.scrollLeft = (x + NODE_W / 2) * z - map.clientWidth / 2;
      map.scrollTop = (y + NODE_H / 2) * z - map.clientHeight / 2;
    }
  }

  function renderTreeDetail() {
    const d = $('tree-detail');
    const n = treeSel;
    const st = nodeState(n);
    const rank = P.rankOf(save, n.id);
    const reqs = (n.req || []).map(([id, r]) => {
      const ok = P.rankOf(save, id) >= r;
      const pn = P.nodeById[id];
      const name = pn.name;
      return `<li class="${ok ? 'ok' : 'no'}">${ok ? '✔' : '✖'} ${name}${pn.max > 1 ? ` nível ${r}` : ''}</li>`;
    }).join('');
    const now = rank && n.max > 1 ? fxTotal(n, rank) : '';
    const next = rank < n.max && n.max > 1 ? fxTotal(n, rank + 1) : '';
    d.innerHTML = `
      <div class="d-head"><span class="d-ico">${branchIcon[n.branch]}</span><span class="d-name">${n.name}</span></div>
      <div class="d-rank">${n.max > 1 ? `Nível ${rank} / ${n.max}` : (rank ? 'Desbloqueado' : 'Desbloqueio')}</div>
      <p class="d-desc">${n.desc}${n.max > 1 ? ' (por nível)' : ''}</p>
      ${now || next ? `<div class="d-fx">${now ? `Atual: <b>${now}</b>` : ''}${next ? `<br>Próximo: <b>${next}</b>` : ''}</div>` : ''}
      ${reqs ? `<div class="d-req-t">Requer</div><ul class="d-req">${reqs}</ul>` : '<div class="d-req-t">Ponto de partida</div>'}
      <div id="tree-buy"></div>`;
    if (st === 'maxed') { $('tree-buy').innerHTML = '<div class="d-max">★ Máximo</div>'; return; }
    const cost = P.nodeCost(n, rank);
    const b = btn(`${rank ? 'Melhorar' : (n.max === 1 ? 'Desbloquear' : 'Comprar')} · 💰 ${fmt(cost)}`, () => {
      if (P.buy(save, n.id)) { persist(); renderTree(true); }
    }, st === 'locked' || save.florins < cost);
    b.classList.add('primary');
    $('tree-buy').appendChild(b);
  }

  // ---------- PARTIDA ----------
  function startGame(L) {
    stats = P.computeStats(save);
    game = new Game({ levelData: P.generateLevel(L), stats, loadout: JSON.parse(JSON.stringify(loadout)) });
    game.levelNum = L;
    paused = false;
    ui.armedPower = null;
    SCREENS.forEach((s) => $('screen-' + s).classList.add('hidden'));
    screenStack = [];
    $('hud').classList.remove('hidden');
    $('hud-hint').style.opacity = '0.85';
    $('hud-level').textContent = `Nível ${L}`;
    buildPowerButtons();
  }

  function buildPowerButtons() {
    const box = $('hud-powers');
    box.innerHTML = '';
    Object.entries(game.powers).forEach(([id, p]) => {
      if (!p.owned) return;
      const b = document.createElement('button');
      b.className = 'pw-btn';
      b.dataset.id = id;
      b.innerHTML = `${CFG.powers[id].icon}<div class="cd"></div><div class="cdt"></div>`;
      b.addEventListener('pointerdown', (ev) => {
        ev.stopPropagation();
        if (!game.powerReady(id)) return;
        ui.armedPower = ui.armedPower === id ? null : id;
      });
      box.appendChild(b);
    });
  }

  function pauseGame() { if (!game) return; paused = true; show('pause'); }
  $('btn-pause').addEventListener('pointerdown', (e) => { e.stopPropagation(); pauseGame(); });
  $('btn-speed').addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    speed = speed === 1 ? 2 : 1;
    $('btn-speed').textContent = speed + 'x';
  });
  $('pause-resume').onclick = () => { paused = false; $('screen-pause').classList.add('hidden'); screenStack = []; };
  $('pause-quit').onclick = () => { game.tower.hp = 0; game.state = 'lost'; game.endScheduled = true; paused = false; endGame(); };

  // entrada: dedo/ponteiro = mira
  function pointerWorld(ev) {
    const p = renderer.toWorld(ev.clientX, ev.clientY);
    p.x = Math.max(0, Math.min(CFG.world.width, p.x));
    p.y = Math.max(0, Math.min(CFG.world.height, p.y));
    return p;
  }
  canvas.addEventListener('pointerdown', (ev) => {
    if (!game || paused) return;
    const p = pointerWorld(ev);
    ui.pointer = p;
    if (ui.armedPower) {
      if (game.castPower(ui.armedPower, p.x, p.y)) ui.armedPower = null;
      return;
    }
    game.setAim(p.x, p.y);
    $('hud-hint').style.opacity = '0';
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (!game || paused) return;
    const p = pointerWorld(ev);
    ui.pointer = p;
    // toque: só move enquanto pressionado; mouse: segue o cursor
    if (ui.armedPower) return;
    if (ev.pointerType === 'mouse' || ev.buttons || ev.pressure > 0) game.setAim(p.x, p.y);
  });

  function updateHud() {
    const t = game.tower;
    if (game.aim.active) $('hud-hint').style.opacity = '0';
    $('hud-tower-bar').style.width = Math.max(0, t.hp / t.maxHp * 100) + '%';
    $('hud-tower-txt').textContent = `🏰 ${fmt(Math.max(0, t.hp))} / ${fmt(t.maxHp)}`;
    $('hud-wave').textContent = `Onda ${game.currentWave()}/${game.level.waves}`;
    $('hud-florins').textContent = fmt(game.florins);
    document.querySelectorAll('.pw-btn').forEach((b) => {
      const p = game.powers[b.dataset.id];
      const k = Math.max(0, p.cd / p.cooldown);
      b.querySelector('.cd').style.height = (k * 100) + '%';
      b.querySelector('.cdt').textContent = p.cd > 0 ? Math.ceil(p.cd) : '';
      b.classList.toggle('armed', ui.armedPower === b.dataset.id);
    });
  }

  // ---------- ANÚNCIOS ----------
  const ADS = window.TD_ADS;
  function countAd(kind) {
    save.stats = save.stats || {};
    save.stats['ads_' + kind] = (save.stats['ads_' + kind] || 0) + 1;
  }
  function offerRevive() {
    $('hud').classList.add('hidden');
    $('rev-msg').textContent = '';
    const t = game.tower;
    $('rev-info').textContent = `Restam ${game.enemies.length} invasores em campo. Assista a um anúncio para reconstruir a torre com ${Math.round(CFG.ads.reviveHp * 100)}% da vida e atordoar quem estiver perto.`;
    $('rev-watch').disabled = false;
    show('revive');
  }
  $('rev-watch').onclick = async () => {
    $('rev-watch').disabled = true;
    $('rev-msg').textContent = 'Carregando anúncio...';
    const ok = await ADS.showRewarded('reviver');
    if (ok && game && game.revive()) {
      countAd('reviver'); persist();
      game.endScheduled = false;
      $('screen-revive').classList.add('hidden');
      screenStack = [];
      $('hud').classList.remove('hidden');
      updateHud();
      return;
    }
    $('rev-watch').disabled = false;
    $('rev-msg').textContent = ok ? '' : 'Anúncio não concluído ou indisponível. Tente de novo.';
  };
  $('rev-quit').onclick = () => endGame();

  function endGame() {
    const r = game.result();
    const L = game.levelNum;
    const first = !save.cleared[L];
    const bonus = r.won ? P.victoryReward(L, stats, first) : 0;
    const gained = r.florins + bonus;
    save.florins += gained;
    if (r.won) {
      save.cleared[L] = true;
      save.unlockedLevel = Math.max(save.unlockedLevel, L + 1);
    }
    persist();
    $('hud').classList.add('hidden');
    $('res-title').textContent = r.won ? '🏆 Vitória!' : '💀 A torre caiu...';
    $('res-body').innerHTML = `
      <div>Invasores abatidos: <b>${r.kills}</b> / ${r.total}</div>
      ${r.won ? `<div>Torre: <b>${Math.round(r.towerPct * 100)}%</b></div>` : ''}
      <div>Florins dos abates: 💰 ${fmt(r.florins)}</div>
      ${r.won ? `<div>Bônus de vitória${first ? '' : ' (repetição)'}: 💰 ${fmt(bonus)}</div>` : ''}
      <div class="big-gold">+ 💰 <span id="res-gain">${fmt(gained)}</span></div>
      ${r.won ? '' : '<div style="color:var(--muted);font-size:14px">Dica: invista na Evolução e tente de novo!</div>'}`;
    // anúncio: dobrar os Florins desta partida
    const dbl = $('res-double');
    const canDouble = CFG.ads.doubleFlorins && gained > 0 && ADS.available();
    dbl.classList.toggle('hidden', !canDouble);
    dbl.disabled = false;
    dbl.textContent = `📺 Dobrar Florins (+${fmt(gained)})`;
    dbl.onclick = async () => {
      dbl.disabled = true;
      const ok = await ADS.showRewarded('dobrar');
      if (!ok) { dbl.disabled = false; dbl.textContent = '📺 Anúncio indisponível — tentar de novo'; return; }
      save.florins += gained;
      countAd('dobrar');
      persist();
      $('res-gain').textContent = fmt(gained * 2) + ' (x2)';
      dbl.classList.add('hidden');
    };
    $('res-next').classList.toggle('hidden', !r.won);
    $('res-next').onclick = () => { game = null; openPrep(L + 1); };
    $('res-retry').onclick = () => { game = null; openPrep(L); };
    $('res-tree').onclick = () => { game = null; selLevel = r.won ? L + 1 : L; show('menu'); show('tree', true); };
    $('res-menu').onclick = () => { game = null; selLevel = r.won ? L + 1 : L; show('menu'); };
    selLevel = r.won ? L + 1 : L;
    show('result');
  }

  // ---------- loop ----------
  let last = performance.now();
  let hudT = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (game && !paused && game.state === 'running') {
      const steps = speed;
      for (let i = 0; i < steps; i++) game.update(dt);
      hudT -= dt;
      if (hudT <= 0) { hudT = 0.1; updateHud(); }
    }
    if (game && game.state !== 'running' && !game.endScheduled) {
      game.endScheduled = true;
      updateHud();
      // torre caiu: oferece reviver com anúncio (1x por partida)
      if (game.canRevive() && ADS.available()) setTimeout(offerRevive, 600);
      else setTimeout(endGame, 700);
    }
    renderer.draw(game, paused ? 0 : dt, ui);
    requestAnimationFrame(frame);
  }
  // gancho para depuração/testes no console do navegador
  window.TD_DEBUG = {
    get game() { return game; },
    step(seconds) { for (let t = 0; t < seconds; t += 1 / 30) if (game && game.state === 'running') game.update(1 / 30); renderer.draw(game, 0, ui); if (game) updateHud(); },
    addFlorins(n) { save.florins += n; persist(); },
  };

  // jogo é horizontal: em retrato mostra o aviso "gire o celular"
  function checkOrientation() {
    $('rotate').classList.toggle('hidden', window.innerWidth >= window.innerHeight);
  }
  window.addEventListener('resize', checkOrientation);
  checkOrientation();
  try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* ignora */ }

  // app instalável/offline (só em http(s), não no Capacitor nem em file://)
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.Capacitor) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  show('menu');
  requestAnimationFrame(frame);
  renderer.load();
  ADS.init();

  // conecta à nuvem (registra o jogador); com login, puxa o progresso mais avançado
  CLOUD.init().then(async (st) => {
    $('acc-name').textContent = st.name;
    if (st.mode !== 'account') return;
    try {
      const r = await CLOUD.sync(save);
      if (r.source === 'nuvem' && !game) {
        save = Object.assign(P.defaultSave(), r.save);
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignora */ }
        selLevel = save.unlockedLevel;
        if (!$('screen-menu').classList.contains('hidden')) renderMenu();
        document.querySelectorAll('.js-florins').forEach((el) => { el.textContent = fmt(save.florins); });
      }
    } catch (e) { console.warn('[nuvem] sincronização falhou:', e.message); }
  });
})();
