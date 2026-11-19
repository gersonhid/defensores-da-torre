#!/usr/bin/env node
/*
 * SIMULADOR DE BALANCEAMENTO
 * Joga a campanha inteira com um bot usando o MESMO motor do jogo.
 *
 *   node tools/simulate.js                       (perfil "medio", 40 níveis, 6 sementes)
 *   node tools/simulate.js --profile casual
 *   node tools/simulate.js --levels 60 --seeds 10
 *   node tools/simulate.js --noupgrade           (nunca compra evolução: mostra a "parede")
 *
 * Metas de design (ver docs/BALANCEAMENTO.md):
 *   - Níveis 1-5:   vitória na 1ª tentativa, torre > 50%
 *   - Níveis 6-25:  1 a 2 tentativas em média
 *   - Níveis 26+:   1.5 a 3 tentativas (exige "farmar" e escolher bem a evolução)
 */
const path = require('path');
const CFG = require(path.join(__dirname, '../www/js/config.js'));
const P = require(path.join(__dirname, '../www/js/progress.js'));
const { Game } = require(path.join(__dirname, '../www/js/engine.js'));
const BOT = require(path.join(__dirname, '../www/js/bot.js'));

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf('--' + name);
  if (i < 0) return def;
  const v = args[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};
const PROFILE = opt('profile', 'medio');
const LEVELS = +opt('levels', 40);
const SEEDS = +opt('seeds', 6);
const MAX_ATTEMPTS = +opt('attempts', 8);
const NO_UPGRADE = !!opt('noupgrade', false);
const DT = 1 / 30;

function playLevel(level, save, rng) {
  const stats = P.computeStats(save);
  const pts = P.summonPoints(level, stats);
  const loadout = BOT.autoLoadout(pts, stats);
  const game = new Game({ levelData: P.generateLevel(level, rng), stats, loadout, rng, visual: false });
  const bot = new BOT.AimBot(PROFILE, rng);
  while (game.state === 'running' && game.t < 900) {
    bot.tick(game, DT);
    game.update(DT);
  }
  return game.result();
}

const rows = [];
for (let L = 1; L <= LEVELS; L++) rows.push({ L, attempts: [], firstWin: 0, towerPct: [], florins: [], time: [], reached: 0, spent: [], dmg: {} });

let stuckCount = 0;
const unlockAt = {}; // id -> [nível em que foi comprado, por semente]
for (let seed = 1; seed <= SEEDS; seed++) {
  const rng = P.makeRng(seed * 7919);
  const save = P.defaultSave();
  let totalSpent = 0;
  for (let L = 1; L <= LEVELS; L++) {
    const row = rows[L - 1];
    row.reached++;
    let won = false, n = 0;
    while (!won && n < MAX_ATTEMPTS) {
      n++;
      const r = playLevel(L, save, rng);
      const first = !save.cleared[L];
      const gain = r.florins + (r.won ? P.victoryReward(L, P.computeStats(save), first) : 0);
      save.florins += gain;
      row.florins.push(gain);
      Object.entries(r.dmgBy).forEach(([k, v]) => { row.dmg[k] = (row.dmg[k] || 0) + v; });
      row.time.push(r.time);
      if (r.won) { won = true; save.cleared[L] = true; row.towerPct.push(r.towerPct); if (n === 1) row.firstWin++; }
      if (!NO_UPGRADE) {
        const before = save.florins;
        BOT.spendFlorins(P, save);
        totalSpent += before - save.florins;
        CFG.tree.filter((n) => n.max === 1 && save.ranks[n.id] && !save['_u_' + n.id]).forEach((n) => { save['_u_' + n.id] = 1; (unlockAt[n.id] = unlockAt[n.id] || []).push(L); });
      }
    }
    row.attempts.push(n);
    row.spent.push(totalSpent);
    if (!won) { stuckCount++; break; }
  }
}

const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);
const pad = (s, n) => String(s).padStart(n);

console.log(`\nPerfil: ${PROFILE}  |  sementes: ${SEEDS}  |  máx tentativas: ${MAX_ATTEMPTS}${NO_UPGRADE ? '  |  SEM EVOLUÇÃO' : ''}\n`);
console.log(' Nív | chegou | tentat. | 1ª vit% | torre% | Florins/tent | Florins gastos | duração | avaliação');
console.log('-----+--------+---------+---------+--------+--------------+----------------+---------+-----------');
for (const r of rows) {
  if (!r.reached) break;
  const att = avg(r.attempts);
  const fw = (r.firstWin / r.reached) * 100;
  const tp = avg(r.towerPct) * 100;
  let verdict = 'ok';
  if (r.attempts.some((a) => a >= MAX_ATTEMPTS) && r.firstWin < r.reached) verdict = 'PAREDE';
  else if (r.L <= 5 && (fw < 100 || tp < 50)) verdict = 'difícil p/ início';
  else if (r.L > 5 && r.L <= 25 && att > 2) verdict = 'difícil';
  else if (r.L > 25 && att > 3) verdict = 'difícil';
  else if (r.L > 5 && fw === 100 && tp > 85) verdict = 'fácil demais';
  console.log(
    `${pad(r.L, 4)} | ${pad(r.reached, 6)} | ${pad(att.toFixed(2), 7)} | ${pad(fw.toFixed(0), 7)} | ${pad(isNaN(tp) ? '-' : tp.toFixed(0), 6)} |` +
    ` ${pad(avg(r.florins).toFixed(0), 12)} | ${pad(avg(r.spent).toFixed(0), 14)} | ${pad(avg(r.time).toFixed(0) + 's', 7)} | ${verdict}`
  );
}
// Participação no dano por faixa de níveis
const bands = [[1, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 999]];
const SOURCES = ['mira', 'barbaro', 'arqueiro', 'anao', 'elfo', 'mago', 'raio', 'gelo', 'meteoro', 'espinhos'];
console.log('\nParticipação no dano (%):');
console.log('  Níveis  | ' + SOURCES.map((s) => s.padStart(8)).join(' '));
for (const [a, b] of bands) {
  const acc = {};
  rows.filter((r) => r.L >= a && r.L <= b).forEach((r) => Object.entries(r.dmg).forEach(([k, v]) => { acc[k] = (acc[k] || 0) + v; }));
  const tot = Object.values(acc).reduce((s, x) => s + x, 0);
  if (!tot) continue;
  console.log(`  ${pad(a, 2)}-${String(b > 100 ? '+' : b).padEnd(4)} | ` + SOURCES.map((s) => pad(((acc[s] || 0) / tot * 100).toFixed(1), 8)).join(' '));
}

console.log('\nNível médio em que cada desbloqueio é comprado:');
CFG.tree.filter((n) => n.max === 1).forEach((n) => {
  const a = unlockAt[n.id] || [];
  console.log(`  ${n.name.padEnd(28)} ${a.length ? 'nível ' + avg(a).toFixed(1) + (a.length < SEEDS ? ` (${a.length}/${SEEDS})` : '') : '-'}`);
});

console.log(`\nCampanhas travadas (não passaram em ${MAX_ATTEMPTS} tentativas): ${stuckCount}/${SEEDS}\n`);
