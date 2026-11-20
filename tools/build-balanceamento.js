#!/usr/bin/env node
/*
 * Gera tools/balanceamento.html: página auto contida (um arquivo só, funciona offline) com a
 * matemática de evolução do jogo, parâmetros editáveis e gráficos. Copia para dentro dela o código
 * atual de www/js/ (config, progress, engine, bot) + tools/balance-model.js.
 *
 *   npm run balanceamento      (rode de novo sempre que mudar o config.js)
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/<\/script/gi, '<\\/script');
let html = fs.readFileSync(path.join(__dirname, 'balanceamento.template.html'), 'utf8');
const parts = {
  config: 'www/js/config.js',
  progress: 'www/js/progress.js',
  engine: 'www/js/engine.js',
  bot: 'www/js/bot.js',
  model: 'tools/balance-model.js',
};
for (const [key, file] of Object.entries(parts)) html = html.replace(`/*@@${key}@@*/`, () => `\n/* ===== ${file} ===== */\n` + read(file));
html = html.replace('@@DATA@@', new Date().toLocaleString('pt-BR'));
const out = path.join(__dirname, 'balanceamento.html');
fs.writeFileSync(out, html);
console.log('Gerado:', path.relative(root, out), `(${Math.round(html.length / 1024)} KB)`);
