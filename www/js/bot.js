/*
 * Bot: jogador automático usado pelo simulador de balanceamento.
 * Também usado pelo jogo no botão "Auto" da tela de convocação (autoLoadout).
 */
(function (root, factory) {
  const cfg = root.TD_CONFIG || (typeof require === 'function' ? require('./config.js') : null);
  const mod = factory(cfg);
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else root.TD_BOT = mod;
})(typeof self !== 'undefined' ? self : this, function (CFG) {
  'use strict';

  // Perfis de habilidade humana:
  //  noise    = erro médio da mira (px)        reaction = tempo para reavaliar alvo (s)
  //  trackSpd = velocidade máx. do dedo (px/s) powerSkill = chance de usar poder no momento certo
  const PROFILES = {
    casual: { noise: 45, reaction: 0.6, trackSpd: 900,  powerSkill: 0.5 },
    medio:  { noise: 28, reaction: 0.35, trackSpd: 1400, powerSkill: 0.8 },
    bom:    { noise: 14, reaction: 0.18, trackSpd: 2200, powerSkill: 1.0 },
  };

  function gauss(rng) {
    let u = 0, v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function bestCluster(game, radius, maxTowerDist) {
    const tw = game.tower;
    let best = null, bestScore = -1, bestCount = 0;
    game.enemies.forEach((e) => {
      if (e.dead) return;
      const dT = Math.hypot(e.x - tw.x, e.y - tw.y) - tw.r;
      if (maxTowerDist && dT > maxTowerDist) return;
      let count = 0, hp = 0;
      game.enemies.forEach((o) => {
        if (!o.dead && Math.hypot(o.x - e.x, o.y - e.y) <= radius) { count++; hp += o.hp; }
      });
      const urgency = Math.max(0, 1 - dT / 400);
      const score = count + urgency * 2 + (e.def.boss ? 1.5 : 0);
      if (score > bestScore) { bestScore = score; best = e; bestCount = count; }
    });
    return best ? { e: best, count: bestCount } : null;
  }

  function AimBot(profileName, rng) {
    this.p = PROFILES[profileName] || PROFILES.medio;
    this.rng = rng;
    this.decideT = 0;
    this.powerT = 0;
    this.target = null;
    this.off = { x: 0, y: 0 };
    this.pos = null;
  }

  AimBot.prototype.tick = function (game, dt) {
    const p = this.p, rng = this.rng;
    this.decideT -= dt;
    if (this.decideT <= 0 || !this.target || this.target.dead) {
      this.decideT = p.reaction;
      const c = bestCluster(game, game.stats.aim.radius * 0.9);
      this.target = c ? c.e : null;
      this.off = { x: gauss(rng) * p.noise * 0.7, y: gauss(rng) * p.noise * 0.7 };
    }
    if (this.target) {
      const want = { x: this.target.x + this.off.x, y: this.target.y + this.off.y };
      if (!this.pos) this.pos = { x: game.tower.x, y: game.tower.y - 150 };
      const dx = want.x - this.pos.x, dy = want.y - this.pos.y;
      const d = Math.hypot(dx, dy);
      const step = Math.min(d, p.trackSpd * dt);
      if (d > 0) { this.pos.x += dx / d * step; this.pos.y += dy / d * step; }
      game.setAim(this.pos.x, this.pos.y);
    }

    // poderes
    this.powerT -= dt;
    if (this.powerT > 0) return;
    this.powerT = 0.5;
    if (rng() > p.powerSkill) return;
    const danger = game.tower.hp / game.tower.maxHp < 0.45;
    const pw = game.stats.powers;
    if (game.powerReady('meteoro')) {
      const c = bestCluster(game, pw.meteoro.radius * 0.8);
      if (c && (c.count >= 4 || (c.e.def.boss && c.count >= 1) || (danger && c.count >= 2))) {
        game.castPower('meteoro', c.e.x, c.e.y); return;
      }
    }
    if (game.powerReady('gelo')) {
      const c = bestCluster(game, pw.gelo.radius * 0.8, 320);
      if (c && (c.count >= 4 || (danger && c.count >= 2))) { game.castPower('gelo', c.e.x, c.e.y); return; }
    }
    if (game.powerReady('raio')) {
      const c = bestCluster(game, pw.raio.chainRange);
      if (c && (c.count >= 3 || (danger && c.count >= 1))) { game.castPower('raio', c.e.x, c.e.y); }
    }
  };

  // Monta um time automaticamente com os pontos disponíveis.
  function autoLoadout(points, stats) {
    const lo = { heroes: {}, powers: {} };
    let left = points;
    const powIds = ['meteoro', 'gelo', 'raio'].filter((id) => stats.powers[id].unlocked);
    // até 40% dos pontos em poderes (cada poder só pode ser comprado uma vez)
    let pBudget = Math.floor(points * 0.4);
    for (const id of powIds) {
      const c = stats.powers[id].cost;
      if (c <= pBudget) { lo.powers[id] = 1; pBudget -= c; left -= c; }
    }
    const order = ['barbaro', 'arqueiro', 'anao', 'mago', 'elfo'].filter((id) => stats.heroes[id].unlocked);
    let count = 0, bought = true;
    while (bought && count < CFG.heroDefaults.maxOnField) {
      bought = false;
      for (const id of order) {
        const c = stats.heroes[id].cost;
        if (c <= left && count < CFG.heroDefaults.maxOnField) {
          lo.heroes[id] = (lo.heroes[id] || 0) + 1; left -= c; count++; bought = true;
        }
      }
    }
    return lo;
  }

  // Estratégia de compra da cadeia de evolução: menor custo / peso.
  const BRANCH_WEIGHT = { mira: 1.3, comando: 1.4, torre: 1.0, economia: 0.9, arcano: 1.0 };
  function spendFlorins(P, save) {
    for (let guard = 0; guard < 200; guard++) {
      let best = null, bestScore = Infinity;
      CFG.tree.forEach((n) => {
        const chk = P.canBuy(save, n);
        if (!chk.ok) return;
        let w = BRANCH_WEIGHT[n.branch] || 1.0;
        if (n.max === 1) w *= 2.0; // desbloqueios valem muito
        const score = chk.cost / w;
        if (score < bestScore) { bestScore = score; best = n; }
      });
      if (!best) return;
      P.buy(save, best.id);
    }
  }

  return { PROFILES, AimBot, autoLoadout, spendFlorins, bestCluster };
});
