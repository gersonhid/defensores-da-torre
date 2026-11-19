/*
 * Progressão: cadeia de evolução, atributos efetivos, geração de níveis, recompensas.
 * Sem DOM — usado pelo jogo e pelo simulador (tools/simulate.js).
 */
(function (root, factory) {
  const cfg = root.TD_CONFIG || (typeof require === 'function' ? require('./config.js') : null);
  const mod = factory(cfg);
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else root.TD_PROGRESS = mod;
})(typeof self !== 'undefined' ? self : this, function (CFG) {
  'use strict';

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const nodeById = {};
  CFG.tree.forEach((n) => { nodeById[n.id] = n; });

  // RNG determinístico (mulberry32) — o simulador usa sementes fixas.
  function makeRng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function defaultSave() {
    return { version: 2, florins: 0, unlockedLevel: 1, cleared: {}, ranks: {} };
  }

  const rankOf = (save, id) => save.ranks[id] || 0;

  function nodeCost(node, rank) {
    return Math.round(node.cost * Math.pow(node.growth, rank));
  }

  function reqMet(save, node) {
    return (node.req || []).every(([id, r]) => rankOf(save, id) >= r);
  }

  function canBuy(save, nodeOrId) {
    const node = typeof nodeOrId === 'string' ? nodeById[nodeOrId] : nodeOrId;
    const rank = rankOf(save, node.id);
    if (rank >= node.max) return { ok: false, reason: 'max' };
    if (!reqMet(save, node)) return { ok: false, reason: 'req' };
    const cost = nodeCost(node, rank);
    if (save.florins < cost) return { ok: false, reason: 'florins', cost };
    return { ok: true, cost };
  }

  function buy(save, id) {
    const node = nodeById[id];
    const chk = canBuy(save, node);
    if (!chk.ok) return false;
    save.florins -= chk.cost;
    save.ranks[id] = rankOf(save, id) + 1;
    return true;
  }

  // ---------- atributos efetivos ----------
  function baseStats() {
    return {
      tower: clone(CFG.tower),
      aim: clone(CFG.aim),
      respawn: CFG.heroDefaults.respawn,
      bonusPoints: 0,
      heroes: clone(CFG.heroes),
      powers: clone(CFG.powers),
      florimMult: 1,
      victoryMult: 1,
    };
  }

  function expandPath(stats, path) {
    const parts = path.split('.');
    let out = [[]];
    let objs = [stats];
    for (const part of parts) {
      const nextOut = [];
      const nextObjs = [];
      out.forEach((prefix, i) => {
        const o = objs[i];
        const keys = part === '*' ? Object.keys(o) : [part];
        keys.forEach((k) => { nextOut.push(prefix.concat(k)); nextObjs.push(o[k]); });
      });
      out = nextOut; objs = nextObjs;
    }
    return out;
  }

  function computeStats(save) {
    const stats = baseStats();
    const acc = {}; // caminho -> {m, a, set}
    CFG.tree.forEach((node) => {
      const r = rankOf(save, node.id);
      if (!r) return;
      node.fx.forEach((fx) => {
        expandPath(stats, fx.p).forEach((parts) => {
          const key = parts.join('.');
          const e = acc[key] || (acc[key] = { parts, m: 0, a: 0, set: undefined });
          if (fx.set !== undefined) e.set = fx.set;
          if (fx.m) e.m += fx.m * r;
          if (fx.a) e.a += fx.a * r;
        });
      });
    });
    Object.values(acc).forEach((e) => {
      let o = stats;
      for (let i = 0; i < e.parts.length - 1; i++) o = o[e.parts[i]];
      const k = e.parts[e.parts.length - 1];
      if (e.set !== undefined) o[k] = e.set;
      else o[k] = o[k] * Math.max(0.3, 1 + e.m) + e.a;
    });
    Object.values(stats.powers).forEach((p) => { p.cost = Math.max(1, p.cost); });
    return stats;
  }

  function summonPoints(level, stats) {
    const s = CFG.summon;
    return s.basePoints + Math.floor((level - 1) * s.pointsPerLevel) + (stats ? stats.bonusPoints : 0);
  }

  function victoryReward(level, stats, firstClear) {
    const e = CFG.economy;
    const base = (e.victoryBase + e.victoryPerLevel * level) * (stats ? stats.victoryMult : 1);
    return Math.round(base * (firstClear ? 1 : e.replayVictoryFactor));
  }

  // ---------- geração de níveis ----------
  function isBossLevel(level) { return level % CFG.levels.bossEvery === 0; }
  // chefão da faixa de níveis (o de maior bossFrom que já foi alcançado)
  function bossFor(level) {
    let best = null;
    Object.entries(CFG.enemies).forEach(([id, e]) => {
      if (e.boss && e.bossFrom <= level && (!best || e.bossFrom > CFG.enemies[best].bossFrom)) best = id;
    });
    return best;
  }
  function phaseOf(level) { return Math.ceil(level / CFG.levels.bossEvery); }

  function threatMult(level) {
    const L = CFG.levels, n = level - 1;
    return 1 + L.threatLinear * n + L.threatQuad * n * n;
  }

  function generateLevel(level, rng) {
    rng = rng || Math.random;
    const L = CFG.levels;
    const nWaves = Math.min(L.wavesMax, L.wavesBase + Math.floor((level - 1) / L.wavesEvery));
    const types = Object.entries(CFG.enemies).filter(([, e]) => !e.boss && e.unlockLevel <= level);
    const minThreat = Math.min(...types.map(([, e]) => e.threat));
    const spawns = [];
    let t = L.firstDelay;
    for (let w = 0; w < nWaves; w++) {
      let budget = L.baseThreat * threatMult(level) * (1 + L.waveThreatStep * w);
      const list = [];
      while (budget >= minThreat) {
        const fit = types.filter(([, e]) => e.threat <= budget);
        const total = fit.reduce((s, [, e]) => s + e.weight, 0);
        let r = rng() * total;
        let pick = fit[0];
        for (const f of fit) { r -= f[1].weight; if (r <= 0) { pick = f; break; } }
        list.push(pick[0]);
        budget -= pick[1].threat;
      }
      const spacing = L.waveDuration / Math.max(1, list.length);
      list.forEach((type, i) => spawns.push({ t: t + i * spacing, type, wave: w }));
      if (w === nWaves - 1 && isBossLevel(level)) {
        // chefão entra depois da última onda (é o "final" da fase)
        const type = bossFor(level);
        const bosses = level >= 48 ? 2 : 1;
        for (let b = 0; b < bosses; b++) spawns.push({ t: t + L.waveDuration + (L.bossDelay || 0) + b * 4, type, wave: w });
      }
      t += L.waveDuration + L.waveGap;
    }
    spawns.sort((a, b) => a.t - b.t);
    return {
      level,
      waves: nWaves,
      spawns,
      hpMult: Math.pow(L.hpGrowth, level - 1),
      dmgMult: Math.pow(L.dmgGrowth, level - 1),
      rewardMult: Math.pow(L.rewardGrowth, level - 1),
    };
  }

  return {
    CFG, nodeById, makeRng, defaultSave, rankOf, nodeCost, reqMet, canBuy, buy,
    computeStats, summonPoints, victoryReward, generateLevel, threatMult, isBossLevel, bossFor, phaseOf,
  };
});
