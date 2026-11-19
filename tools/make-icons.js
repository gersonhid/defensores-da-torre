#!/usr/bin/env node
/* Gera os ícones PNG do app (torre em pixel art) sem dependências: node tools/make-icons.js */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// 32x32, uma letra por pixel. A torre fica nos 70% centrais (área segura de ícone "maskable").
const ART = [
  '................................',
  '................................',
  '................................',
  '................................',
  '...............kbb..............',
  '...............kbbbb............',
  '...............kbbbbb...........',
  '...............kbb..............',
  '...............k................',
  '.........oooo.ooooo.oooo........',
  '.........oLLo.oLLMo.oMMo........',
  '.........oLLoooLMMoooMDo........',
  '.........oLLLLLMMMMMMDDo........',
  '.........ooooooooooooooo........',
  '..........oLLLMMMMMMDDo.........',
  '..........oLLMMMMMMMDDo.........',
  '..........oLLMMoooMMDDo.........',
  '..........oLLMMoyoMMDDo.........',
  '..........oLLMMoooMMDDo.........',
  '..........oLLMMMMMMMDDo.........',
  '..........oLLMMMMMMMDDo.........',
  '..........oLLMMMMMMMDDo.........',
  '..........oLLMMwwwMMDDo.........',
  '..........oLLMwwwwwMDDo.........',
  '..........oLLMwwwwwMDDo.........',
  '........ooooooooooooooooo.......',
  '........oSSSSSSSSSSSSSSSo.......',
  '........ooooooooooooooooo.......',
  '................................',
  '................................',
  '................................',
  '................................',
];
const PAL = {
  '.': [30, 58, 30], o: [26, 20, 14], L: [181, 172, 156], M: [143, 135, 123], D: [107, 100, 89],
  S: [94, 87, 77], w: [58, 42, 28], y: [255, 211, 107], k: [61, 43, 31], b: [46, 107, 209],
};

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size) {
  const k = size / 32;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const col = PAL[ART[Math.floor(y / k)][Math.floor(x / k)]];
      const i = y * (size * 3 + 1) + 1 + x * 3;
      raw[i] = col[0]; raw[i + 1] = col[1]; raw[i + 2] = col[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const out = path.join(__dirname, '..', 'www', 'icons');
fs.mkdirSync(out, { recursive: true });
[192, 512].forEach((s) => fs.writeFileSync(path.join(out, `icon-${s}.png`), png(s)));
console.log('Ícones gerados em www/icons/');
