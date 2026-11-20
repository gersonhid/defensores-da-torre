/*
 * Modelo analítico de balanceamento (rápido, sem simular a partida).
 * Usado pela página tools/balanceamento.html e testável no Node.
 *
 * Para cada nível, supondo que o jogador vence de primeira e gasta os Florins como o bot:
 *   - Força dos invasores = vida efetiva somada de todos os invasores do nível
 *     (vida × chefão × armadura contra os golpes do time)
 *   - Força do time       = dano por segundo (heróis + mira + poderes + Taberna) × duração do nível × eficiência
 *   - Folga               = força do time ÷ força dos invasores  (>1 sobra, <1 falta)
 *   - Florins             = abates + bônus de vitória
 */
(function (root, factory) {
  const mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else root.TD_MODEL = mod;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // dano por segundo de um herói (com chances de disparo duplo, alvos extras e área)
  function heroDps(h) {
    let d = h.damage / h.interval;
    d *= 1 + (h.doubleShot || 0);
    d *= 1 + (h.extraTargets || 0);
    if (h.splash > 0) d *= 1 + Math.min(2, h.splash / 45) * 0.7; // atinge outros na área (70% do dano)
    return d;
  }

  // fontes de dano do time: { nome, dps, golpe, perfura }
  function damageSources(CFG, stats, loadout, duration) {
    const src = [];
    const heroIds = Object.keys(loadout.heroes || {}).filter((id) => loadout.heroes[id] > 0);
    let heroCount = 0, heroDpsSum = 0;
    heroIds.forEach((id) => {
      const h = stats.heroes[id], n = loadout.heroes[id];
      heroCount += n; heroDpsSum += heroDps(h) * n;
      src.push({ name: 'herois', id, dps: heroDps(h) * n, hit: h.damage, pierce: 0 });
    });
    const a = stats.aim;
    const aimTargets = 1.4 * Math.pow(a.radius / CFG.aim.radius, 2) * 0.8 + 0.2; // mais área = mais alvos por pulso
    src.push({ name: 'mira', dps: a.damage / a.interval * (1 + a.critChance * (a.critMult - 1)) * aimTargets, hit: a.damage, pierce: a.pierce });
    const pw = stats.powers, own = loadout.powers || {};
    if (own.raio) {
      let sum = 0, f = 1;
      for (let i = 0; i < Math.round(pw.raio.chains); i++) { sum += f; f *= pw.raio.falloff; }
      src.push({ name: 'poderes', id: 'raio', dps: pw.raio.damage * sum / pw.raio.cooldown, hit: pw.raio.damage, pierce: 0 });
    }
    if (own.gelo) src.push({ name: 'poderes', id: 'gelo', dps: pw.gelo.dps * pw.gelo.duration * 4 / pw.gelo.cooldown, hit: pw.gelo.dps, pierce: 0 });
    if (own.meteoro) src.push({ name: 'poderes', id: 'meteoro', dps: pw.meteoro.damage * 4 / pw.meteoro.cooldown, hit: pw.meteoro.damage, pierce: 0 });
    // Taberna: heróis extras em média (entram após firstDelay, 1 a cada interval, até max; ~60% do tempo vivos)
    const tv = stats.tavern;
    let tavernAvg = 0;
    if (tv && tv.unlocked && heroCount > 0) {
      tavernAvg = Math.min(tv.max, Math.max(0, duration - tv.firstDelay) / tv.interval) * 0.6;
      src.push({ name: 'taberna', dps: heroDpsSum / heroCount * tavernAvg, hit: 25, pierce: 0 });
    }
    return { src, heroCount, tavernAvg };
  }

  function analyze(opts) {
    const { CFG, P, BOT } = opts;
    const levels = opts.levels || 50;
    const eff = opts.efficiency == null ? 0.3 : opts.efficiency;
    const save = P.defaultSave();
    const rows = [];
    let cum = 0, spentTotal = 0;
    for (let L = 1; L <= levels; L++) {
      const stats = P.computeStats(save);
      const pts = P.summonPoints(L, stats);
      const lo = BOT.autoLoadout(pts, stats);
      const lv = P.generateLevel(L, P.makeRng(L * 101)); // mesmo sorteio da tela de preparação
      const last = lv.spawns.length ? lv.spawns[lv.spawns.length - 1].t : 0;
      const duration = last + 12; // tempo para os últimos chegarem e caírem
      const { src, heroCount, tavernAvg } = damageSources(CFG, stats, lo, duration);
      const totalDps = src.reduce((s, x) => s + x.dps, 0);
      // fator de armadura: dano efetivo médio contra uma armadura, ponderado pelo dps de cada fonte
      const armorEff = (armor) => src.reduce((s, x) => s + x.dps * Math.max(0.25, 1 - Math.max(0, armor - x.pierce) / Math.max(1, x.hit)), 0) / Math.max(1e-9, totalDps);
      let hp = 0, ehp = 0, killF = 0, enemyDps = 0, bosses = 0;
      lv.spawns.forEach((s) => {
        const d = CFG.enemies[s.type];
        const boss = !!d.boss;
        if (boss) bosses++;
        const h = d.hp * lv.hpMult * (boss ? CFG.levels.bossHpMult : 1);
        hp += h;
        ehp += h / armorEff(d.armor);
        killF += d.reward * lv.rewardMult * stats.florimMult;
        enemyDps += d.damage * lv.dmgMult * (boss ? CFG.levels.bossDmgMult : 1) / d.interval;
      });
      const victory = P.victoryReward(L, stats, true);
      const gained = Math.round(killF + victory);
      const teamForce = totalDps * duration * eff;
      const parts = {};
      src.forEach((x) => { parts[x.name] = (parts[x.name] || 0) + x.dps * duration * eff; });
      // ganha os Florins e gasta como o bot
      save.florins += gained;
      cum += gained;
      const had = Object.assign({}, save.ranks);
      const before = save.florins;
      BOT.spendFlorins(P, save);
      spentTotal += before - save.florins;
      const unlocks = CFG.tree.filter((n) => n.max === 1 && save.ranks[n.id] && !had[n.id]).map((n) => n.name);
      save.cleared[L] = true;
      save.unlockedLevel = L + 1;
      rows.push({
        L, boss: P.isBossLevel(L), bosses, enemies: lv.spawns.length, waves: lv.waves, duration,
        enemyHp: hp, enemyForce: ehp, enemyDps, teamDps: totalDps, teamForce, parts, ratio: teamForce / ehp,
        points: pts, heroes: heroCount, tavernAvg, killFlorins: Math.round(killF), victory, gained, cum, spent: spentTotal,
        unlocks, ranksTotal: Object.values(save.ranks).reduce((s, x) => s + x, 0),
      });
    }
    return rows;
  }

  return { analyze, heroDps };
});
