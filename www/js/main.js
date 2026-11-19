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
      if (raw) return Object.assign(P.defaultSave(), JSON.parse(raw));
    } catch (e) { /* armazenamento indisponível */ }
    return P.defaultSave();
  }
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignora */ }
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
  const SCREENS = ['menu', 'help', 'prep', 'tree', 'pause', 'result'];
  function show(name, push) {
    SCREENS.forEach((s) => $('screen-' + s).classList.toggle('hidden', s !== name));
    if (push) screenStack.push(name); else screenStack = [name];
    document.querySelectorAll('.js-florins').forEach((el) => { el.textContent = fmt(save.florins); });
    if (name === 'menu') renderMenu();
    if (name === 'prep') renderPrep();
    if (name === 'tree') renderTree();
  }
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
    if (L % CFG.levels.bossEvery === 0) return '👿 Chefe!';
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

  // ---------- EVOLUÇÃO ----------
  let treeBranch = CFG.branches[0].id;
  function fxTotal(node, rank) {
    return node.fx.map((f) => {
      if (f.set !== undefined) return rank ? 'Desbloqueado' : '';
      if (f.m) return `${f.m > 0 ? '+' : ''}${Math.round(f.m * rank * 100)}%`;
      const v = f.a * rank;
      return `${v > 0 ? '+' : ''}${Number.isInteger(v) ? v : (v * 100).toFixed(0) + '%'}`;
    }).filter(Boolean).join(', ');
  }
  function renderTree() {
    const tabs = $('tree-tabs');
    tabs.innerHTML = '';
    CFG.branches.forEach((b) => {
      const t = document.createElement('button');
      const canAny = CFG.tree.some((n) => n.branch === b.id && P.canBuy(save, n).ok);
      t.className = 'tab' + (b.id === treeBranch ? ' active' : '') + (canAny ? ' has-buy' : '');
      t.innerHTML = `<span class="t-ico">${b.icon}</span>${b.name}`;
      t.onclick = () => { treeBranch = b.id; renderTree(); };
      tabs.appendChild(t);
    });
    const list = $('tree-nodes');
    const scroll = list.scrollTop;
    list.innerHTML = '';
    CFG.tree.filter((n) => n.branch === treeBranch).forEach((n) => {
      const rank = P.rankOf(save, n.id);
      const met = P.reqMet(save, n);
      const maxed = rank >= n.max;
      const div = document.createElement('div');
      div.className = 'node' + (maxed ? ' maxed' : '') + (met ? '' : ' locked');
      const pips = n.max > 1 ? `<div class="n-pips">${Array.from({ length: n.max }, (_, i) => `<span class="pip${i < rank ? ' on' : ''}"></span>`).join('')}</div>` : '';
      const req = met ? '' : `<div class="n-req">🔒 Requer: ${(n.req || []).map(([id, r]) => `${P.nodeById[id].name} ${r}`).join(', ')}</div>`;
      const total = rank && n.max > 1 ? `<div class="n-total">Atual: ${fxTotal(n, rank)}</div>` : '';
      div.innerHTML = `<div class="n-head"><span class="n-name">${n.name}</span><span class="n-rank">${rank}/${n.max}</span></div>
        <div class="n-desc">${n.desc}${n.max > 1 ? ' (por nível)' : ''}</div>${pips}${total}${req}`;
      if (!maxed && met) {
        const cost = P.nodeCost(n, rank);
        div.appendChild(btn(`${rank ? 'Melhorar' : 'Comprar'} · 💰 ${fmt(cost)}`, () => {
          if (P.buy(save, n.id)) { persist(); renderTree(); }
        }, save.florins < cost));
      }
      list.appendChild(div);
    });
    list.scrollTop = scroll;
    document.querySelectorAll('.js-florins').forEach((el) => { el.textContent = fmt(save.florins); });
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

  function endGame() {
    const r = game.result();
    const L = game.levelNum;
    const first = !save.cleared[L];
    const bonus = r.won ? P.victoryReward(L, stats, first) : 0;
    save.florins += r.florins + bonus;
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
      <div class="big-gold">+ 💰 ${fmt(r.florins + bonus)}</div>
      ${r.won ? '' : '<div style="color:var(--muted);font-size:14px">Dica: invista na Evolução e tente de novo!</div>'}`;
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
      setTimeout(endGame, 700);
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
})();
