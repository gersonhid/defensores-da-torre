/*
 * Bestiário: os 5 heróis e todos os invasores, com retrato, descrição e recompensa por descoberta.
 *  - Herói: descoberto quando é desbloqueado na Evolução.
 *  - Invasor: descoberto quando é derrotado pela 1ª vez (save.bestiary.kills).
 * Cada descoberta dá Florins uma única vez (save.bestiary.claimed). Valores em config.js → bestiary.
 * Ver docs/BESTIARIO.md.
 */
(function (root) {
  'use strict';
  const CFG = root.TD_CONFIG;
  const P = root.TD_PROGRESS;
  const SPR = root.TD_SPRITES;

  // primeiro nível em que cada invasor/chefão aparece (para a dica "aparece no nível N")
  const firstLevel = {};
  Object.entries(CFG.enemies).forEach(([id, e]) => { if (!e.boss) firstLevel[id] = e.unlockLevel || 1; });
  for (let L = 1; L <= 200; L++) {
    if (!P.isBossLevel(L)) continue;
    const b = P.bossFor(L);
    if (b && firstLevel[b] === undefined) firstLevel[b] = L;
  }

  const ENTRIES = []
    .concat(Object.keys(CFG.bestiary.heroes).map((id) => ({ key: 'h_' + id, id, kind: 'hero', def: CFG.heroes[id], info: CFG.bestiary.heroes[id] })))
    .concat(Object.keys(CFG.bestiary.enemies).map((id) => ({
      key: 'e_' + id, id, kind: CFG.enemies[id].boss ? 'boss' : 'enemy', def: CFG.enemies[id], info: CFG.bestiary.enemies[id],
    })));

  function data(save) {
    if (!save.bestiary) save.bestiary = { kills: {}, claimed: {} };
    save.bestiary.kills = save.bestiary.kills || {};
    save.bestiary.claimed = save.bestiary.claimed || {};
    return save.bestiary;
  }

  function discovered(save, entry, stats) {
    if (entry.kind === 'hero') return !!(stats || P.computeStats(save)).heroes[entry.id].unlocked;
    return (data(save).kills[entry.id] || 0) > 0;
  }

  const claimable = (save, entry, stats) => discovered(save, entry, stats) && !data(save).claimed[entry.key];

  function pendingCount(save) {
    const stats = P.computeStats(save);
    return ENTRIES.filter((e) => claimable(save, e, stats)).length;
  }

  // registra os abates de uma partida; devolve os invasores vistos pela 1ª vez
  function recordKills(save, killsBy) {
    const b = data(save);
    const fresh = [];
    Object.entries(killsBy || {}).forEach(([id, n]) => {
      if (!n) return;
      if (!b.kills[id] && CFG.bestiary.enemies[id]) fresh.push(id);
      b.kills[id] = (b.kills[id] || 0) + n;
    });
    return fresh;
  }

  // coleta a recompensa de uma entrada; devolve os Florins ganhos (0 se não podia)
  function claim(save, key) {
    const entry = ENTRIES.find((e) => e.key === key);
    if (!entry || !claimable(save, entry)) return 0;
    data(save).claimed[key] = true;
    save.florins += entry.info.reward;
    return entry.info.reward;
  }

  function claimAll(save) {
    const stats = P.computeStats(save);
    let total = 0;
    ENTRIES.forEach((e) => {
      if (claimable(save, e, stats)) { data(save).claimed[e.key] = true; save.florins += e.info.reward; total += e.info.reward; }
    });
    return total;
  }

  // desenha o retrato (sprite do jogo ampliado em pixels inteiros); escondido = silhueta escura
  function drawPortrait(canvas, id, hidden) {
    const g = canvas.getContext('2d');
    g.clearRect(0, 0, canvas.width, canvas.height);
    const spr = SPR && SPR.store.sprites[id];
    if (!spr) return false; // arte ainda carregando
    const img = spr.frames[0];
    const scale = Math.max(1, Math.floor(Math.min(canvas.width * 0.9 / img.width, canvas.height * 0.9 / img.height)));
    const w = img.width * scale, h = img.height * scale;
    g.imageSmoothingEnabled = false;
    g.drawImage(img, Math.round((canvas.width - w) / 2), Math.round(canvas.height - h - canvas.height * 0.04), w, h);
    if (hidden) {
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = '#0d0906';
      g.fillRect(0, 0, canvas.width, canvas.height);
      g.globalCompositeOperation = 'source-over';
    }
    return true;
  }

  root.TD_BESTIARY = { ENTRIES, firstLevel, data, discovered, claimable, pendingCount, recordKills, claim, claimAll, drawPortrait };
})(typeof self !== 'undefined' ? self : this);
