/*
 * Motor da partida — lógica pura (sem DOM). Usado pelo jogo e pelo simulador.
 *   const g = new TD_ENGINE.Game({ levelData, stats, loadout, rng, visual })
 *   g.setAim(x, y); g.castPower('meteoro', x, y); g.update(dt);
 *   g.state: 'running' | 'won' | 'lost'
 */
(function (root, factory) {
  const cfg = root.TD_CONFIG || (typeof require === 'function' ? require('./config.js') : null);
  const mod = factory(cfg);
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else root.TD_ENGINE = mod;
})(typeof self !== 'undefined' ? self : this, function (CFG) {
  'use strict';

  const W = CFG.world.width, H = CFG.world.height;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function Game(opts) {
    this.rng = opts.rng || Math.random;
    this.visual = opts.visual !== false;
    this.level = opts.levelData;
    this.stats = opts.stats;
    const s = this.stats;

    this.t = 0;
    this.speed = 1;
    this.state = 'running';
    this.spawnIdx = 0;
    this.enemies = [];
    this.heroes = [];
    this.zones = [];
    this.pending = [];
    this.fx = [];
    this.kills = 0;
    this.dmgBy = {};
    this.florins = 0;
    this.spawned = 0;
    this.totalEnemies = this.level.spawns.length;

    this.tower = {
      x: W / 2, y: H / 2, r: s.tower.radius,
      hp: s.tower.hp, maxHp: s.tower.hp, armor: s.tower.armor, regen: s.tower.regen, thorns: s.tower.thorns,
      hitT: 0,
    };
    this.aim = { x: W / 2, y: H / 2 - 200, active: false, cd: 0, flash: 0 };

    // heróis convocados
    const lo = opts.loadout || { heroes: {}, powers: {} };
    const list = [];
    Object.entries(lo.heroes || {}).forEach(([id, n]) => { for (let i = 0; i < n; i++) list.push(id); });
    const nH = Math.min(list.length, CFG.heroDefaults.maxOnField);
    for (let i = 0; i < nH; i++) {
      const id = list[i];
      const st = s.heroes[id];
      const ang = (i / Math.max(1, nH)) * Math.PI * 2 - Math.PI / 2;
      const home = {
        x: this.tower.x + Math.cos(ang) * CFG.heroDefaults.homeRadius,
        y: this.tower.y + Math.sin(ang) * CFG.heroDefaults.homeRadius,
      };
      this.heroes.push({
        id, st, x: home.x, y: home.y, home, r: st.radius,
        hp: st.hp, maxHp: st.hp, cd: this.rng() * st.interval, dead: false, respawnT: 0, target: null, face: 1,
        anim: 0,
      });
    }
    this.powers = {};
    // poder comprado = disponível a partida toda, com recarga. Começa pronto.
    Object.keys(s.powers).forEach((id) => {
      this.powers[id] = { owned: !!(lo.powers && lo.powers[id]), cd: 0, cooldown: s.powers[id].cooldown };
    });
  }

  const P = Game.prototype;

  P.powerReady = function (id) {
    const p = this.powers[id];
    return !!p && p.owned && p.cd <= 0;
  };

  P.addFx = function (f) {
    if (!this.visual) return;
    f.max = f.ttl;
    this.fx.push(f);
  };

  P.setAim = function (x, y) {
    this.aim.x = Math.max(0, Math.min(W, x));
    this.aim.y = Math.max(0, Math.min(H, y));
    this.aim.active = true;
  };

  // ---------- dano ----------
  P.damageEnemy = function (e, amount, pierce, src) {
    if (e.dead) return 0;
    const armor = Math.max(0, e.armor - (pierce || 0));
    const eff = Math.min(e.hp, Math.max(amount * 0.25, amount - armor));
    e.hp -= eff;
    this.dmgBy[src || 'outros'] = (this.dmgBy[src || 'outros'] || 0) + eff;
    e.hitT = 0.12;
    if (e.hp <= 0) {
      e.dead = true;
      this.kills++;
      const gain = e.reward * this.stats.florimMult;
      this.florins += gain;
      this.addFx({ kind: 'death', x: e.x, y: e.y, color: e.def.color, ttl: 0.5 });
      this.addFx({ kind: 'coin', x: e.x, y: e.y, text: '+' + Math.round(gain), ttl: 0.9 });
    }
    return eff;
  };

  P.damageHero = function (h, amount) {
    const eff = Math.max(amount * 0.25, amount - h.st.armor);
    h.hp -= eff;
    h.hitT = 0.12;
    if (h.hp <= 0 && !h.dead) {
      h.dead = true;
      h.target = null;
      h.respawnT = this.stats.respawn;
      this.addFx({ kind: 'death', x: h.x, y: h.y, color: h.st.color, ttl: 0.6 });
    }
  };

  P.damageTower = function (amount) {
    const eff = Math.max(amount * 0.25, amount - this.tower.armor);
    this.tower.hp -= eff;
    this.tower.hitT = 0.15;
  };

  P.enemiesNear = function (x, y, r) {
    return this.enemies.filter((e) => !e.dead && Math.hypot(e.x - x, e.y - y) <= r + e.r);
  };

  // ---------- spawn ----------
  P.spawn = function (type) {
    const def = CFG.enemies[type];
    const lv = this.level;
    // ponto aleatório em todo o contorno do mapa (uniforme pelo perímetro), um pouco para fora da borda
    const m = CFG.world.spawnMargin;
    let d = this.rng() * 2 * (W + H);
    let x, y;
    if (d < W) { x = d; y = -m; }
    else if ((d -= W) < H) { x = W + m; y = d; }
    else if ((d -= H) < W) { x = W - d; y = H + m; }
    else { d -= W; x = -m; y = H - d; }
    const hp = def.hp * lv.hpMult * (def.boss ? (CFG.levels.bossHpMult || 1) : 1);
    this.enemies.push({
      type, def, x, y, r: def.radius,
      hp, maxHp: hp, speed: def.speed, damage: def.damage * lv.dmgMult * (def.boss ? (CFG.levels.bossDmgMult || 1) : 1), interval: def.interval,
      range: def.range, armor: def.armor, reward: def.reward * lv.rewardMult, ranged: !!def.ranged,
      cd: def.interval * 0.5, slow: 0, slowT: 0, stunT: 0, dead: false, hitT: 0, anim: this.rng() * 6,
    });
    this.spawned++;
  };

  // ---------- poderes ----------
  P.castPower = function (id, x, y) {
    if (this.state !== 'running' || !this.powerReady(id)) return false;
    const p = this.stats.powers[id];
    if (id === 'raio') {
      let first = null, best = 140;
      this.enemies.forEach((e) => { if (!e.dead) { const d = Math.hypot(e.x - x, e.y - y); if (d < best) { best = d; first = e; } } });
      if (!first) return false;
      const hit = [first];
      let cur = first, dmg = p.damage;
      const pts = [{ x: cur.x, y: cur.y - 400 }, { x: cur.x, y: cur.y }];
      this.damageEnemy(cur, dmg, 0, 'raio');
      for (let i = 1; i < Math.round(p.chains); i++) {
        let nx = null, nd = p.chainRange;
        this.enemies.forEach((e) => {
          if (e.dead || hit.includes(e)) return;
          const d = dist(e, cur);
          if (d < nd) { nd = d; nx = e; }
        });
        if (!nx) break;
        dmg *= p.falloff;
        hit.push(nx); cur = nx;
        pts.push({ x: cur.x, y: cur.y });
        this.damageEnemy(cur, dmg, 0, 'raio');
      }
      this.addFx({ kind: 'lightning', pts, ttl: 0.35 });
    } else if (id === 'gelo') {
      this.zones.push({ x, y, r: p.radius, dps: p.dps, slow: p.slow, t: p.duration, max: p.duration });
    } else if (id === 'meteoro') {
      this.pending.push({ x, y, r: p.radius, damage: p.damage, t: p.delay, max: p.delay });
    } else return false;
    this.powers[id].cd = this.powers[id].cooldown;
    return true;
  };

  // ---------- loop ----------
  P.update = function (dt) {
    if (this.state !== 'running') return;
    this.t += dt;
    const tw = this.tower;

    while (this.spawnIdx < this.level.spawns.length && this.level.spawns[this.spawnIdx].t <= this.t) {
      this.spawn(this.level.spawns[this.spawnIdx].type);
      this.spawnIdx++;
    }

    tw.hp = Math.min(tw.maxHp, tw.hp + tw.regen * dt);
    tw.hitT = Math.max(0, tw.hitT - dt);
    Object.values(this.powers).forEach((p) => { if (p.cd > 0) p.cd -= dt; });

    this.updateAim(dt);
    this.heroes.forEach((h) => this.updateHero(h, dt));
    this.enemies.forEach((e) => this.updateEnemy(e, dt));
    this.updateZones(dt);

    this.enemies = this.enemies.filter((e) => !e.dead);
    for (let i = this.fx.length - 1; i >= 0; i--) {
      this.fx[i].ttl -= dt;
      if (this.fx[i].ttl <= 0) this.fx.splice(i, 1);
    }

    if (tw.hp <= 0) { tw.hp = 0; this.state = 'lost'; }
    else if (this.spawnIdx >= this.level.spawns.length && this.enemies.length === 0) this.state = 'won';
  };

  // Reviver (recompensa de anúncio): só uma vez por partida, só depois de perder.
  P.canRevive = function () { return this.state === 'lost' && !this.revived; };
  P.revive = function () {
    if (!this.canRevive()) return false;
    const A = CFG.ads;
    const tw = this.tower;
    this.revived = true;
    this.state = 'running';
    tw.hp = tw.maxHp * A.reviveHp;
    // onda de choque: empurra e atordoa quem está perto
    this.enemies.forEach((e) => {
      const d = dist(e, tw);
      if (d > A.reviveRadius) return;
      const k = (A.reviveRadius - d) / Math.max(1, d);
      e.x += (e.x - tw.x) * Math.min(k, 1.5);
      e.y += (e.y - tw.y) * Math.min(k, 1.5);
      e.stunT = Math.max(e.stunT, A.reviveStun);
    });
    this.addFx({ kind: 'explosion', x: tw.x, y: tw.y, r: A.reviveRadius, ttl: 0.8 });
    return true;
  };

  P.currentWave = function () {
    const s = this.level.spawns[Math.min(this.spawnIdx, this.level.spawns.length - 1)];
    return s ? s.wave + 1 : 1;
  };

  P.updateAim = function (dt) {
    const a = this.aim, st = this.stats.aim;
    a.flash = Math.max(0, a.flash - dt);
    if (!a.active) return;
    a.cd -= dt;
    if (a.cd > 0) return;
    a.cd += st.interval;
    if (a.cd < 0) a.cd = st.interval;
    a.flash = 0.18;
    const targets = this.enemiesNear(a.x, a.y, st.radius);
    let crit = false;
    targets.forEach((e) => {
      let dmg = st.damage;
      if (this.rng() < st.critChance) { dmg *= st.critMult; crit = true; }
      this.damageEnemy(e, dmg, st.pierce, 'mira');
    });
    this.addFx({ kind: 'aimPulse', x: a.x, y: a.y, r: st.radius, crit, ttl: 0.3 });
  };

  P.pickHeroTarget = function (h) {
    const leash = CFG.heroDefaults.leash;
    const tw = this.tower;
    if (h.target && !h.target.dead && dist(h.target, tw) <= leash + 40) return h.target;
    let best = null, bd = Infinity;
    this.enemies.forEach((e) => {
      if (e.dead) return;
      const dt = dist(e, tw);
      if (dt > leash && dist(e, h) - e.r - h.r > h.st.range) return;
      // prioriza inimigos perto do herói, com bônus para os perto da torre
      const score = dist(e, h) + dt * 0.5;
      if (score < bd) { bd = score; best = e; }
    });
    return best;
  };

  P.moveTo = function (o, tx, ty, speed, dt) {
    const dx = tx - o.x, dy = ty - o.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return;
    const step = Math.min(d, speed * dt);
    o.x += (dx / d) * step;
    o.y += (dy / d) * step;
    if (Math.abs(dx) > 0.5) o.face = dx > 0 ? 1 : -1;
    o.anim = (o.anim || 0) + dt * 8;
  };

  P.updateHero = function (h, dt) {
    const st = h.st;
    h.hitT = Math.max(0, (h.hitT || 0) - dt);
    if (h.dead) {
      h.respawnT -= dt;
      if (h.respawnT <= 0) {
        h.dead = false; h.hp = h.maxHp; h.x = this.tower.x; h.y = this.tower.y; h.cd = st.interval;
        this.addFx({ kind: 'respawn', x: h.x, y: h.y, ttl: 0.5 });
      }
      return;
    }
    h.cd -= dt;
    h.target = this.pickHeroTarget(h);
    const tg = h.target;
    if (!tg) { this.moveTo(h, h.home.x, h.home.y, st.speed, dt); return; }
    const edge = dist(h, tg) - tg.r - h.r;
    if (edge > st.range) { this.moveTo(h, tg.x, tg.y, st.speed, dt); return; }
    h.face = tg.x > h.x ? 1 : -1;
    if (h.cd > 0) return;
    h.cd = st.interval;
    this.heroAttack(h, tg);
  };

  P.heroAttack = function (h, tg) {
    const st = h.st;
    const targets = [tg];
    if (st.extraTargets) {
      const others = this.enemies
        .filter((e) => !e.dead && e !== tg && dist(e, h) - e.r - h.r <= st.range)
        .sort((a, b) => dist(a, h) - dist(b, h));
      for (let i = 0; i < Math.round(st.extraTargets) && i < others.length; i++) targets.push(others[i]);
    }
    const shots = st.doubleShot && this.rng() < st.doubleShot ? 2 : 1;
    let dealt = 0;
    for (let s = 0; s < shots; s++) {
      targets.forEach((t) => {
        if (t.dead) return;
        dealt += this.damageEnemy(t, st.damage, 0, h.id);
        if (st.splash) {
          this.enemiesNear(t.x, t.y, st.splash).forEach((o) => { if (o !== t) dealt += this.damageEnemy(o, st.damage * 0.7, 0, h.id); });
        }
        if (st.stun && this.rng() < st.stun) t.stunT = 1.0;
        if (st.slowOnHit) { t.slow = Math.max(t.slow, st.slowOnHit); t.slowT = Math.max(t.slowT, 2); }
        if (st.range > 40) this.addFx({ kind: 'proj', hero: h.id, x: h.x, y: h.y, x2: t.x, y2: t.y, ttl: 0.18 });
        else this.addFx({ kind: 'slash', x: t.x, y: t.y, ttl: 0.2 });
        if (st.splash) this.addFx({ kind: 'blast', x: t.x, y: t.y, r: st.splash, hero: h.id, ttl: 0.3 });
      });
    }
    if (st.lifesteal) h.hp = Math.min(h.maxHp, h.hp + dealt * st.lifesteal);
  };

  P.updateEnemy = function (e, dt) {
    if (e.dead) return;
    e.hitT = Math.max(0, e.hitT - dt);
    if (e.stunT > 0) { e.stunT -= dt; return; }
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slow = 0; }
    const speed = e.speed * (1 - e.slow);
    e.cd -= dt;
    const tw = this.tower;
    const dTower = dist(e, tw) - tw.r - e.r;

    if (e.ranged) {
      if (dTower > e.range) { this.moveTo(e, tw.x, tw.y, speed, dt); return; }
      if (e.cd <= 0) {
        e.cd = e.interval;
        this.damageTower(e.damage);
        this.addFx({ kind: 'enemyProj', x: e.x, y: e.y, x2: tw.x, y2: tw.y, ttl: 0.3 });
      }
      return;
    }

    // bloqueio por herói adjacente
    let blocker = null, bd = 12;
    this.heroes.forEach((h) => {
      if (h.dead) return;
      const d = dist(e, h) - e.r - h.r;
      if (d < bd) { bd = d; blocker = h; }
    });
    if (blocker) {
      if (e.cd <= 0) {
        e.cd = e.interval;
        this.damageHero(blocker, e.damage);
        this.addFx({ kind: 'bite', x: blocker.x, y: blocker.y, ttl: 0.15 });
      }
      return;
    }
    if (dTower > e.range) { this.moveTo(e, tw.x, tw.y, speed, dt); return; }
    if (e.cd <= 0) {
      e.cd = e.interval;
      this.damageTower(e.damage);
      if (tw.thorns) this.damageEnemy(e, tw.thorns, 99, 'espinhos');
      this.addFx({ kind: 'bite', x: e.x + (tw.x - e.x) * 0.3, y: e.y + (tw.y - e.y) * 0.3, ttl: 0.15 });
    }
  };

  P.updateZones = function (dt) {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.t -= dt;
      this.enemiesNear(z.x, z.y, z.r).forEach((e) => {
        this.damageEnemy(e, z.dps * dt, 99, 'gelo'); // dano contínuo ignora armadura
        e.slow = Math.max(e.slow, z.slow);
        e.slowT = Math.max(e.slowT, 0.3);
      });
      if (z.t <= 0) this.zones.splice(i, 1);
    }
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const m = this.pending[i];
      m.t -= dt;
      if (m.t <= 0) {
        this.enemiesNear(m.x, m.y, m.r).forEach((e) => this.damageEnemy(e, m.damage, 0, 'meteoro'));
        this.addFx({ kind: 'explosion', x: m.x, y: m.y, r: m.r, ttl: 0.6 });
        this.pending.splice(i, 1);
      }
    }
  };

  P.result = function () {
    return {
      won: this.state === 'won',
      kills: this.kills,
      total: this.totalEnemies,
      florins: Math.round(this.florins),
      towerPct: this.tower.hp / this.tower.maxHp,
      time: this.t,
      dmgBy: this.dmgBy,
    };
  };

  return { Game };
});
