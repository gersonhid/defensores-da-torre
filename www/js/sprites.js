/*
 * Sprites e arte.
 *  1) Tenta carregar as imagens listadas em ART (geradas no Gemini, ver docs/ARTE.md).
 *     - fundo magenta (#FF00FF) vira transparente
 *     - a imagem é reduzida para o tamanho em pixels que terá no jogo ("repixelização")
 *  2) O que não existir é substituído por placeholders em pixel art feitos aqui no código.
 * Assim dá para trocar a arte aos poucos, um arquivo por vez.
 */
(function (root) {
  'use strict';
  const CFG = root.TD_CONFIG;

  // ---------------------------------------------------------------------------
  // ARTE EXTERNA — coloque os arquivos em www/assets/ com estes nomes.
  // height = altura visual em unidades do mundo (o jogo calcula os pixels).
  // frames = quadros lado a lado na imagem (animação de caminhada); 1 = estático.
  // ---------------------------------------------------------------------------
  const ART = {
    ground:   { src: 'assets/ground.png',   type: 'texture', tileWorld: 280 },
    backdrop: { src: 'assets/backdrop.png', type: 'backdrop' },
    tower:    { src: 'assets/tower.png',    type: 'sprite', height: 200 },
    tree:     { src: 'assets/tree.png',     type: 'sprite', height: 120 },
    // personagens (fase 2 da arte)
    barbaro:  { src: 'assets/chars/barbaro.png',  type: 'sprite', frames: 1 },
    arqueiro: { src: 'assets/chars/arqueiro.png', type: 'sprite', frames: 1 },
    anao:     { src: 'assets/chars/anao.png',     type: 'sprite', frames: 1 },
    elfo:     { src: 'assets/chars/elfo.png',     type: 'sprite', frames: 1 },
    mago:     { src: 'assets/chars/mago.png',     type: 'sprite', frames: 1 },
    goblin:   { src: 'assets/chars/goblin.png',   type: 'sprite', frames: 1 },
    lobo:     { src: 'assets/chars/lobo.png',     type: 'sprite', frames: 1 },
    orc:      { src: 'assets/chars/orc.png',      type: 'sprite', frames: 1 },
    xama:     { src: 'assets/chars/xama.png',     type: 'sprite', frames: 1 },
    troll:    { src: 'assets/chars/troll.png',    type: 'sprite', frames: 1 },
    ogro:     { src: 'assets/chars/ogro.png',     type: 'sprite', frames: 1 },
    chefe_goblin: { src: 'assets/chars/chefe_goblin.png', type: 'sprite', frames: 1 },
    chefe_orc:    { src: 'assets/chars/chefe_orc.png',    type: 'sprite', frames: 1 },
    troll_anciao: { src: 'assets/chars/troll_anciao.png', type: 'sprite', frames: 1 },
  };

  // altura visual (mundo) de cada personagem
  function visualHeight(id) {
    const d = CFG.heroes[id] || CFG.enemies[id];
    return d ? d.radius * 2 * CFG.view.spriteScale : 40;
  }

  // ---------------------------------------------------------------------------
  // Placeholders em pixel art
  // ---------------------------------------------------------------------------
  const HUMANOID = {
    body: [
      '....hhhh....',
      '...hhhhhh...',
      '...ssssss...',
      '...sesses...',
      '...ssssss...',
      '....ssss....',
      '..bbbbbbbb..',
      '.sbbbbbbbbs.',
      '.sbbbbbbbbs.',
      '.s.bbbbbb.s.',
      '...bbbbbb...',
    ],
    legsA: ['...ll..ll...', '...ll..ll...', '...dd..dd...'],
    legsB: ['...ll..ll...', '..ll....ll..', '..dd....dd..'],
  };
  const WOLF = {
    body: [
      '...........gg.',
      '..........gggg',
      'g........ggeg.',
      '.gggggggggggg.',
      '..gggggggggg..',
      '..gggggggggg..',
    ],
    legsA: ['..g.g....g.g..', '..g.g....g.g..', '.dd.dd..dd.dd.'],
    legsB: ['...g.g..g.g...', '...g.g..g.g...', '..dd.dd.dd.dd.'],
  };

  const LOOK = {
    barbaro:  { h: '#a33a1a', s: '#e0ac69', b: '#7a4b2a', l: '#5c3a1e', d: '#2e1d10', w: 'axe' },
    arqueiro: { h: '#2f6b2f', s: '#e0ac69', b: '#3e8e41', l: '#5c4033', d: '#2e2014', w: 'bow' },
    anao:     { h: '#d4762c', s: '#e8b07a', b: '#8a8f99', l: '#5a5f69', d: '#2e2e33', w: 'hammer', beard: '#d4762c' },
    elfo:     { h: '#f2d16b', s: '#f1c9a0', b: '#1fa38a', l: '#0f6e5c', d: '#3b2a1a', w: 'bow' },
    mago:     { h: '#4b2c8a', s: '#e8c39e', b: '#3b4cc0', l: '#2b388f', d: '#1d2455', w: 'staff', hat: '#4b2c8a' },
    goblin:   { h: '#3d5e2a', s: '#7cc04f', b: '#7a5230', l: '#5c3d22', d: '#2e1f10', w: 'dagger' },
    orc:      { h: '#2b2b2b', s: '#4e7d3a', b: '#6d6d6d', l: '#4a4a4a', d: '#222222', w: 'club' },
    xama:     { h: '#5b2a86', s: '#9b7fd1', b: '#4a2a6a', l: '#3a2054', d: '#1f1030', w: 'staff' },
    troll:    { h: '#4a5560', s: '#7d8c99', b: '#5b4a3a', l: '#4a3a2c', d: '#2a2018', w: 'club' },
    ogro:     { h: '#5a1010', s: '#c0504d', b: '#4a3020', l: '#3a2418', d: '#20120a', w: 'club' },
    chefe_goblin: { h: '#e1b12c', s: '#8bc34a', b: '#8e2b2b', l: '#5c3d22', d: '#2e1f10', w: 'axe' },
    chefe_orc:    { h: '#1b1b1b', s: '#33691e', b: '#8a8a8a', l: '#4a4a4a', d: '#222222', w: 'hammer' },
    troll_anciao: { h: '#cfd8dc', s: '#607d8b', b: '#3e2723', l: '#2e1d16', d: '#1a120d', w: 'club', beard: '#cfd8dc' },
    lobo:     { g: '#7f8c8d', e: '#ffdd00', d: '#4a4f50' },
  };

  function paintTemplate(rows, pal) {
    const w = rows[0].length, h = rows.length;
    const c = document.createElement('canvas');
    c.width = w + 4; c.height = h + 1; // margem p/ arma
    const g = c.getContext('2d');
    rows.forEach((row, y) => {
      for (let x = 0; x < w; x++) {
        const ch = row[x];
        if (ch === '.') continue;
        g.fillStyle = ch === 'e' ? '#111111' : (pal[ch] || '#ff00ff');
        g.fillRect(x + 2, y, 1, 1);
      }
    });
    return { c, g };
  }

  function addWeapon(g, kind, h) {
    const px = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
    const wood = '#7a5230', steel = '#c8cdd6';
    switch (kind) {
      case 'axe':
        for (let y = 3; y < 11; y++) px(14, y, wood);
        px(13, 3, steel); px(13, 4, steel); px(15, 3, steel); px(15, 4, steel); px(15, 5, steel); px(13, 5, steel);
        break;
      case 'hammer':
        for (let y = 4; y < 11; y++) px(14, y, wood);
        for (let x = 12; x < 17; x++) { px(x, 3, steel); px(x, 4, steel); }
        break;
      case 'staff':
        for (let y = 1; y < 13; y++) px(14, y, wood);
        px(14, 0, '#7ef9ff'); px(13, 1, '#7ef9ff'); px(15, 1, '#7ef9ff');
        break;
      case 'bow':
        [[14, 3], [15, 4], [15, 5], [15, 6], [15, 7], [15, 8], [14, 9]].forEach(([x, y]) => px(x, y, wood));
        for (let y = 4; y < 9; y++) px(14, y, '#eeeeee');
        break;
      case 'club':
        for (let y = 5; y < 11; y++) px(14, y, wood);
        px(13, 3, wood); px(14, 3, wood); px(15, 3, wood); px(13, 4, wood); px(14, 4, wood); px(15, 4, wood);
        break;
      case 'dagger':
        px(14, 7, steel); px(14, 6, steel); px(14, 8, wood);
        break;
    }
  }

  function makeCharacter(id) {
    const pal = LOOK[id];
    const tpl = id === 'lobo' ? WOLF : HUMANOID;
    const frames = [tpl.legsA, tpl.legsB].map((legs) => {
      const { c, g } = paintTemplate(tpl.body.concat(legs), pal);
      if (pal.w) addWeapon(g, pal.w, c.height);
      if (pal.beard) { g.fillStyle = pal.beard; g.fillRect(5, 4, 6, 2); g.fillRect(6, 6, 4, 1); }
      if (pal.hat) { g.fillStyle = pal.hat; g.fillRect(4, 0, 8, 2); g.fillRect(6, -1, 4, 1); g.fillRect(3, 2, 10, 1); }
      return c;
    });
    return finishSprite(frames, visualHeight(id), true);
  }

  // Árvore placeholder (pinheiro)
  function makeTree() {
    const c = document.createElement('canvas');
    c.width = 15; c.height = 22;
    const g = c.getContext('2d');
    const dark = '#1f4d2b', mid = '#2d6b3a', light = '#3f8a4a';
    for (let layer = 0; layer < 3; layer++) {
      const top = layer * 5, half = 3 + layer * 2;
      for (let y = 0; y < 7; y++) {
        const w = Math.min(half, 1 + y);
        for (let x = -w; x <= w; x++) {
          g.fillStyle = x < -w / 2 ? dark : x > w / 2 ? light : mid;
          g.fillRect(7 + x, top + y, 1, 1);
        }
      }
    }
    g.fillStyle = '#5c3a1e'; g.fillRect(6, 19, 3, 3);
    return finishSprite([c], ART.tree.height, false);
  }

  // Torre placeholder (pedra, vista 3/4)
  function makeTower() {
    const c = document.createElement('canvas');
    c.width = 40; c.height = 64;
    const g = c.getContext('2d');
    const px = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    // corpo
    px(6, 18, 28, 42, '#8f877b');
    px(6, 18, 6, 42, '#a79f92');   // luz à esquerda
    px(28, 18, 6, 42, '#6b6459');  // sombra à direita
    for (let y = 20; y < 58; y += 5) for (let x = 6 + ((y / 5) % 2) * 3; x < 34; x += 6) px(x, y, 5, 1, '#5e574d');
    // porta
    px(16, 46, 8, 14, '#3a2a1c'); px(17, 45, 6, 1, '#3a2a1c'); px(19, 46, 1, 14, '#22180f');
    // janela
    px(18, 28, 4, 6, '#1d1a16'); px(19, 29, 2, 2, '#ffd36b');
    // topo / ameias
    px(3, 12, 34, 7, '#9a9184'); px(3, 18, 34, 1, '#5e574d');
    for (let x = 3; x < 37; x += 6) px(x, 7, 4, 5, '#9a9184');
    // bandeira
    px(20, 0, 1, 9, '#3d2b1f');
    px(21, 0, 8, 2, '#2e6bd1'); px(21, 2, 6, 2, '#2e6bd1'); px(21, 4, 4, 1, '#2e6bd1');
    // base
    px(2, 59, 36, 5, '#5e574d');
    return finishSprite([c], ART.tower.height, false);
  }

  // versão branca (flash de dano)
  function whiteOf(c) {
    const w = document.createElement('canvas');
    w.width = c.width; w.height = c.height;
    const g = w.getContext('2d');
    g.drawImage(c, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w.width, w.height);
    return w;
  }

  function finishSprite(frames, worldHeight, animated) {
    return { frames, white: frames.map(whiteOf), worldHeight, animated };
  }

  // ---------------------------------------------------------------------------
  // Processamento das imagens do Gemini
  // ---------------------------------------------------------------------------
  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  // magenta -> transparente (tolerante a variações de compressão)
  function chromaKey(img) {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    try {
      const d = g.getImageData(0, 0, c.width, c.height);
      const p = d.data;
      for (let i = 0; i < p.length; i += 4) {
        const r = p[i], gg = p[i + 1], b = p[i + 2];
        if (r > 150 && b > 150 && gg < 110 && Math.abs(r - b) < 90) p[i + 3] = 0;
      }
      g.putImageData(d, 0, 0);
    } catch (e) {
      console.warn('[arte] não consegui remover o fundo (abra o jogo por um servidor, não por file://)');
    }
    return c;
  }

  // reduz para a altura alvo em pixels, mantendo bordas nítidas (alpha 0 ou 255)
  function pixelize(src, targetH) {
    targetH = Math.max(4, Math.round(targetH));
    const targetW = Math.max(1, Math.round(src.width * targetH / src.height));
    // reduz em etapas para fazer média dos pixels (evita serrilhado)
    let cur = src;
    while (cur.height / 2 > targetH) {
      const t = document.createElement('canvas');
      t.width = Math.max(targetW, Math.round(cur.width / 2));
      t.height = Math.max(targetH, Math.round(cur.height / 2));
      const tg = t.getContext('2d');
      tg.imageSmoothingQuality = 'high';
      tg.drawImage(cur, 0, 0, t.width, t.height);
      cur = t;
    }
    const out = document.createElement('canvas');
    out.width = targetW; out.height = targetH;
    const og = out.getContext('2d');
    og.imageSmoothingQuality = 'high';
    og.drawImage(cur, 0, 0, targetW, targetH);
    try {
      const d = og.getImageData(0, 0, targetW, targetH);
      for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] < 128 ? 0 : 255;
      og.putImageData(d, 0, 0);
    } catch (e) { /* file:// */ }
    return out;
  }

  // recorta área transparente em volta (o Gemini costuma deixar margem)
  function trim(c) {
    try {
      const g = c.getContext('2d');
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
        if (d[(y * c.width + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      if (x1 < 0) return c;
      const t = document.createElement('canvas');
      t.width = x1 - x0 + 1; t.height = y1 - y0 + 1;
      t.getContext('2d').drawImage(c, x0, y0, t.width, t.height, 0, 0, t.width, t.height);
      return t;
    } catch (e) { return c; }
  }

  function splitFrames(c, n) {
    if (n <= 1) return [c];
    const fw = Math.floor(c.width / n);
    return Array.from({ length: n }, (_, i) => {
      const f = document.createElement('canvas');
      f.width = fw; f.height = c.height;
      f.getContext('2d').drawImage(c, i * fw, 0, fw, c.height, 0, 0, fw, c.height);
      return trim(f);
    });
  }

  const store = { sprites: {}, ground: null, backdrop: null, loaded: [] };

  // pxPerWorld = escala (px de tela por unidade do mundo) na frente do mapa
  async function init(pxPerWorld) {
    const jobs = Object.entries(ART).map(async ([id, a]) => {
      const img = await loadImage(a.src);
      if (!img) return;
      store.loaded.push(id);
      if (a.type === 'texture') {
        // textura do chão: reduzida para ~1 pixel a cada 2 unidades do mundo
        store.ground = { img: pixelize(img, a.tileWorld / 2), tileWorld: a.tileWorld };
      } else if (a.type === 'backdrop') {
        store.backdrop = img;
      } else {
        const keyed = trim(chromaKey(img));
        const frames = splitFrames(keyed, a.frames || 1);
        const wh = a.height || visualHeight(id);
        const target = wh * pxPerWorld;
        const px = frames.map((f) => pixelize(f, target));
        store.sprites[id] = finishSprite(px, wh, (a.frames || 1) > 1);
      }
    });
    await Promise.all(jobs);
    // placeholders para o que faltou
    Object.keys(LOOK).forEach((id) => { if (!store.sprites[id]) store.sprites[id] = makeCharacter(id); });
    if (!store.sprites.tower) store.sprites.tower = makeTower();
    if (!store.sprites.tree) store.sprites.tree = makeTree();
    if (store.loaded.length) console.log('[arte] imagens carregadas:', store.loaded.join(', '));
    return store;
  }

  root.TD_SPRITES = { ART, init, store, visualHeight };
})(typeof self !== 'undefined' ? self : this);
