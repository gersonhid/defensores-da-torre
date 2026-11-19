#!/usr/bin/env node
/* Servidor local sem dependências: node tools/serve.js  ->  http://localhost:8080 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', 'www');
const port = +process.argv[2] || 8080;
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
};
http.createServer((req, res) => {
  let p = path.normalize(path.join(root, decodeURIComponent(req.url.split('?')[0])));
  if (!p.startsWith(root)) { res.writeHead(403); return res.end(); }
  if (p.endsWith(path.sep)) p = path.join(p, 'index.html');
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(p).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}).listen(port, '127.0.0.1', () => console.log(`Jogo em http://localhost:${port}`));
