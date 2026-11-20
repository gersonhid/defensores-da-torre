/*
 * Renderização em pixel art com câmera inclinada.
 * Desenha numa tela interna de baixa resolução (view.pixelHeight px de altura) que o CSS
 * amplia sem suavização (image-rendering: pixelated). Só desenha — não altera o jogo.
 */
(function (root) {
  'use strict';
  const CFG = root.TD_CONFIG;
  const { Camera } = root.TD_CAMERA;
  const SPR = root.TD_SPRITES;
  const W = CFG.world.width, H = CFG.world.height;
  const R = Math.round;

  // área do chão desenhada (maior que o mapa, para preencher as laterais e o fundo)
  const GX0 = -700, GX1 = W + 700, GY0 = -700, GY1 = H + 150;
  const TEXEL = 2; // unidades do mundo por pixel da textura do chão

  function Renderer(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.time = 0;
    this.ready = false;
    this.groundTex = null;
    this.groundLayer = null;
    this.trees = makeTreeSpots();
    this.resize();
  }

  Renderer.prototype.load = async function () {
    const cam0 = new Camera(100);
    await SPR.init(cam0.sNear);
    this.groundTex = buildGroundTexture(SPR.store.ground);
    this.ready = true;
    this.resize();
  };

  Renderer.prototype.resize = function () {
    const sh = CFG.view.pixelHeight;
    const sw = Math.round(sh * window.innerWidth / Math.max(1, window.innerHeight));
    this.canvas.width = sw;
    this.canvas.height = sh;
    this.cam = new Camera(sw);
    this.ctx.imageSmoothingEnabled = false;
    this.groundLayer = this.groundTex ? projectGround(this.groundTex, this.cam, SPR.store.backdrop) : null;
  };

  // posição na janela (CSS px) -> pixels da tela interna
  Renderer.prototype.toScreen = function (clientX, clientY) {
    return { x: clientX / window.innerWidth * this.canvas.width, y: clientY / window.innerHeight * this.canvas.height };
  };

  // posição na janela (CSS px) -> chão do mundo
  Renderer.prototype.toWorld = function (clientX, clientY) {
    const sx = clientX / window.innerWidth * this.canvas.width;
    const sy = clientY / window.innerHeight * this.canvas.height;
    return this.cam.unproject(sx, sy);
  };

  // ---------------------------------------------------------------------------
  // Chão: textura vista de cima -> projetada linha a linha (Mode 7), uma única vez
  // ---------------------------------------------------------------------------
  function makeTreeSpots() {
    let s = 99;
    const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const spots = [];
    // fileira de floresta no fundo + bosques nas laterais
    for (let i = 0; i < 70; i++) spots.push({ x: GX0 + r() * (GX1 - GX0), y: -40 - r() * 260 });
    for (let i = 0; i < 40; i++) {
      const left = r() < 0.5;
      spots.push({ x: left ? -40 - r() * 420 : W + 40 + r() * 420, y: r() * H });
    }
    // poucas árvores esparsas dentro do mapa, longe da torre e fora da faixa da frente
    // (para não esconder invasores que vêm da borda de baixo)
    for (let i = 0; i < 10; i++) {
      const x = 60 + r() * (W - 120), y = 40 + r() * (H - 260);
      if (Math.hypot(x - W / 2, y - H / 2) > CFG.heroDefaults.leash + 60) spots.push({ x, y });
    }
    return spots;
  }

  function buildGroundTexture(groundArt) {
    const tw = Math.ceil((GX1 - GX0) / TEXEL), th = Math.ceil((GY1 - GY0) / TEXEL);
    const c = document.createElement('canvas');
    c.width = tw; c.height = th;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    const wx = (x) => (x - GX0) / TEXEL, wy = (y) => (y - GY0) / TEXEL;
    let s = 7;
    const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };

    if (groundArt) {
      const pat = g.createPattern(groundArt.img, 'repeat');
      const k = (groundArt.tileWorld / TEXEL) / groundArt.img.height;
      g.save(); g.scale(k, k); g.fillStyle = pat; g.fillRect(0, 0, tw / k, th / k); g.restore();
    } else {
      g.fillStyle = '#4f7f35';
      g.fillRect(0, 0, tw, th);
      const greens = ['#5a8c3c', '#46732f', '#3f692a', '#62963f', '#4a7a32'];
      for (let i = 0; i < tw * th * 0.18; i++) {
        g.fillStyle = greens[(r() * greens.length) | 0];
        g.fillRect((r() * tw) | 0, (r() * th) | 0, 1 + (r() < 0.3), 1);
      }
      for (let i = 0; i < 900; i++) { // tufos
        const x = (r() * tw) | 0, y = (r() * th) | 0;
        g.fillStyle = '#2f5a22'; g.fillRect(x, y, 1, 2); g.fillRect(x + 2, y, 1, 2);
        g.fillStyle = '#6fa548'; g.fillRect(x + 1, y - 1, 1, 3);
      }
    }
    // manchas de terra batida espalhadas (os invasores vêm de qualquer direção)
    const dirt = ['#8a6a45', '#7b5c3b', '#977552', '#6e5134'];
    for (let p = 0; p < 26; p++) {
      const cx = r() * W, cy = r() * H;
      if (Math.hypot(cx - W / 2, cy - H / 2) < 140) continue;
      const rx = 30 + r() * 70, ry = 20 + r() * 50;
      for (let k = 0; k < rx * ry * 0.35; k++) {
        const a = r() * Math.PI * 2, d = Math.sqrt(r());
        g.fillStyle = dirt[(r() * dirt.length) | 0];
        g.fillRect(wx(cx + Math.cos(a) * rx * d) | 0, wy(cy + Math.sin(a) * ry * d) | 0, 2, 2);
      }
    }
    // anel de terra pisoteada em volta do pátio
    for (let i = 0; i < 2200; i++) {
      const a = r() * Math.PI * 2, d = 95 + r() * 60;
      if (r() < d / 160 - 0.35) continue;
      g.fillStyle = dirt[(r() * dirt.length) | 0];
      g.fillRect(wx(W / 2 + Math.cos(a) * d) | 0, wy(H / 2 + Math.sin(a) * d) | 0, 2, 2);
    }
    // pátio de pedra em volta da torre
    for (let i = 0; i < 2600; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 95;
      g.fillStyle = r() < 0.5 ? '#8d8676' : (r() < 0.5 ? '#a39b89' : '#756e60');
      g.fillRect(wx(W / 2 + Math.cos(a) * d) | 0, wy(H / 2 + Math.sin(a) * d) | 0, 2, 2);
    }
    // flores e pedrinhas
    for (let i = 0; i < 500; i++) {
      const x = (r() * tw) | 0, y = (r() * th) | 0;
      const k = r();
      g.fillStyle = k < 0.25 ? '#f5d76e' : k < 0.45 ? '#e86f6f' : k < 0.6 ? '#ffffff' : '#9a9a8c';
      g.fillRect(x, y, 1, 1);
    }
    return c;
  }

  function projectGround(tex, cam, backdrop) {
    const c = document.createElement('canvas');
    c.width = cam.sw; c.height = cam.sh;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    for (let sy = 0; sy < cam.sh; sy++) {
      const wy = cam.unproject(0, sy + 0.5).y;
      const s = cam.scaleAt(wy);
      const x0 = W / 2 - (cam.sw / 2) / s;
      const ty = Math.floor((wy - GY0) / TEXEL);
      if (ty < 0 || ty >= tex.height) continue;
      g.drawImage(tex, (x0 - GX0) / TEXEL, ty, (cam.sw / s) / TEXEL, 1, 0, sy, cam.sw, 1);
    }
    // névoa de distância no topo
    const fog = g.createLinearGradient(0, 0, 0, CFG.view.top + 20);
    fog.addColorStop(0, 'rgba(170,200,190,0.55)');
    fog.addColorStop(1, 'rgba(170,200,190,0)');
    g.fillStyle = fog;
    g.fillRect(0, 0, cam.sw, CFG.view.top + 20);
    if (backdrop) {
      const h = Math.round(CFG.view.top * 0.9);
      const w = Math.round(backdrop.naturalWidth * h / backdrop.naturalHeight);
      for (let x = 0; x < cam.sw; x += w) g.drawImage(backdrop, x, 0, w, h);
    }
    return c;
  }

  // ---------------------------------------------------------------------------
  // Desenho do quadro
  // ---------------------------------------------------------------------------
  Renderer.prototype.draw = function (game, dt, ui) {
    this.time += dt;
    const ctx = this.ctx;
    const cam = this.cam;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#3f6b2c';
    ctx.fillRect(0, 0, cam.sw, cam.sh);
    if (!this.ready) return;
    ctx.drawImage(this.groundLayer, 0, 0);

    // decalques no chão
    this.groundEllipse(W / 2, H / 2, CFG.heroDefaults.leash, null, 'rgba(255,255,255,0.10)', true);
    if (game) {
      game.zones.forEach((z) => this.drawIce(z));
      game.pending.forEach((m) => this.groundEllipse(m.x, m.y, m.r, `rgba(255,80,0,${0.15 + 0.25 * (1 - m.t / m.max)})`, 'rgba(255,120,0,0.9)', true));
      game.fx.forEach((f) => { if (f.kind === 'aimPulse' || f.kind === 'blast' || f.kind === 'explosion') this.drawGroundFx(f); });
      this.drawAim(game, ui);
    }

    // objetos em pé, ordenados pela profundidade
    const list = this.trees.map((t) => ({ y: t.y, draw: () => this.drawSprite('tree', t.x, t.y, 0, false, false) }));
    const tw = game ? game.tower : { x: W / 2, y: H / 2, hitT: 0 };
    // quem é desenhado antes da torre está atrás dela; se ficar coberto, aparece em transparência por cima
    let towerBox = null;
    const behind = [];
    list.push({ y: tw.y, draw: () => { towerBox = this.drawTower(tw); } });
    if (game) {
      const unit = (o, id, boss) => () => { const d = this.drawUnit(o, id, boss); if (!towerBox && d) behind.push(d); };
      game.enemies.forEach((e) => list.push({ y: e.y, draw: unit(e, e.type, e.def.boss) }));
      game.heroes.forEach((h) => { if (!h.dead) list.push({ y: h.y, draw: unit(h, h.id, false) }); });
    }
    list.sort((a, b) => a.y - b.y);
    list.forEach((o) => o.draw());
    if (towerBox) this.drawGhosts(behind, towerBox);

    if (game) {
      game.pending.forEach((m) => this.drawMeteorFalling(m));
      game.fx.forEach((f) => this.drawAirFx(f));
      if (game.tower) this.drawTowerBar(game.tower);
    }
  };

  Renderer.prototype.groundEllipse = function (x, y, r, fill, stroke, dashed) {
    const ctx = this.ctx;
    const p = this.cam.project(x, y);
    const { rx, ry } = this.cam.groundRadii(y, r);
    ctx.beginPath();
    ctx.ellipse(R(p.x), R(p.y), Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) {
      ctx.strokeStyle = stroke; ctx.lineWidth = 1;
      if (dashed) ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  Renderer.prototype.shadow = function (x, y, r) {
    this.groundEllipse(x, y, r, 'rgba(0,0,0,0.30)');
  };

  // desenha um sprite com os pés no ponto (x, y) do chão
  Renderer.prototype.drawSprite = function (id, x, y, lift, flip, white, frameIdx) {
    const spr = SPR.store.sprites[id];
    if (!spr) return null;
    const frames = white ? spr.white : spr.frames;
    const img = frames[(frameIdx || 0) % frames.length];
    const p = this.cam.project(x, y, lift || 0);
    const h = Math.max(2, R(spr.worldHeight * p.s));
    const w = Math.max(1, R(img.width * h / img.height));
    const dx = R(p.x - w / 2), dy = R(p.y - h);
    const ctx = this.ctx;
    if (flip) {
      ctx.save(); ctx.translate(dx + w, dy); ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, w, h);
      ctx.restore();
    } else ctx.drawImage(img, dx, dy, w, h);
    return { x: p.x, top: dy, w, h };
  };

  Renderer.prototype.drawTower = function (t) {
    this.shadow(t.x + 8, t.y + 8, CFG.tower.radius + 8);
    return this.drawSprite('tower', t.x, t.y + CFG.tower.radius * 0.6, 0, false, t.hitT > 0);
  };

  // personagens atrás da torre: redesenha por cima em transparência ("raio-x"), só se a torre os cobre
  Renderer.prototype.drawGhosts = function (list, tb) {
    const ctx = this.ctx;
    const tl = tb.x - tb.w / 2, tr = tb.x + tb.w / 2;
    list.forEach((d) => {
      const b = d.box;
      const ul = b.x - b.w / 2, ur = b.x + b.w / 2;
      const ox = Math.min(ur, tr) - Math.max(ul, tl);
      const oy = Math.min(b.top + b.h, tb.top + tb.h) - Math.max(b.top, tb.top);
      if (ox <= 0 || oy <= 0 || ox * oy < b.w * b.h * 0.25) return; // pouco coberto: não precisa
      ctx.globalAlpha = 0.55;
      this.drawSprite(d.id, d.o.x, d.o.y, d.bob, d.flip, false, d.frame);
      ctx.globalAlpha = 1;
      if (d.o.hp < d.o.maxHp) this.bar(b.x, b.top - 3, Math.max(8, Math.min(24, b.w)), d.o.hp / d.o.maxHp, d.o.def ? '#e84118' : '#4cd137');
    });
  };

  Renderer.prototype.drawUnit = function (o, id, boss) {
    this.shadow(o.x, o.y, o.r * 0.9);
    const moving = (o.anim || 0);
    const frame = Math.floor(moving / 2.5) % 2;
    const bob = Math.abs(Math.sin(moving)) * 2;
    const flip = o.def ? o.face === -1 : o.face === -1;
    const box = this.drawSprite(id, o.x, o.y, bob, flip, o.hitT > 0, frame);
    if (!box) return null;
    const ctx = this.ctx;
    if (o.slow > 0) { ctx.fillStyle = '#9fe8ff'; ctx.fillRect(R(box.x) - 1, box.top - 3, 1, 1); ctx.fillRect(R(box.x) + 1, box.top - 4, 1, 1); }
    if (o.stunT > 0) {
      const a = this.time * 8;
      ctx.fillStyle = '#ffe066';
      for (let i = 0; i < 3; i++) ctx.fillRect(R(box.x + Math.cos(a + i * 2.1) * 4), R(box.top - 2 + Math.sin(a + i * 2.1) * 1.5), 1, 1);
    }
    if (o.tavern) { // caneca acima da cabeça: herói da Taberna
      const mx = R(box.x) - 1, my = box.top - 7;
      ctx.fillStyle = '#f5f0e0'; ctx.fillRect(mx, my, 3, 1);
      ctx.fillStyle = '#e1a32a'; ctx.fillRect(mx, my + 1, 3, 3);
      ctx.fillStyle = '#8a5a14'; ctx.fillRect(mx + 3, my + 2, 1, 1);
    }
    if (boss) { ctx.fillStyle = '#ffd32a'; ctx.fillRect(R(box.x) - 2, box.top - 7, 5, 1); ctx.fillRect(R(box.x) - 2, box.top - 8, 1, 1); ctx.fillRect(R(box.x), box.top - 9, 1, 2); ctx.fillRect(R(box.x) + 2, box.top - 8, 1, 1); }
    if (o.hp < o.maxHp) this.bar(box.x, box.top - 3, Math.max(8, Math.min(24, box.w)), o.hp / o.maxHp, o.def ? '#e84118' : '#4cd137');
    return { o, id, box, bob, flip, frame };
  };

  Renderer.prototype.bar = function (cx, y, w, pct, col) {
    const ctx = this.ctx;
    const x = R(cx - w / 2);
    ctx.fillStyle = '#111';
    ctx.fillRect(x - 1, R(y) - 1, w + 2, 3);
    ctx.fillStyle = col;
    ctx.fillRect(x, R(y), Math.max(0, R(w * pct)), 1);
  };

  Renderer.prototype.drawTowerBar = function (t) {
    if (t.hp >= t.maxHp) return;
    const p = this.cam.project(t.x, t.y + CFG.tower.radius * 0.6, SPR.store.sprites.tower.worldHeight + 6);
    const pct = t.hp / t.maxHp;
    this.bar(p.x, p.y, 30, pct, pct > 0.5 ? '#4cd137' : pct > 0.25 ? '#fbc531' : '#e84118');
  };

  Renderer.prototype.drawIce = function (z) {
    const a = Math.min(1, z.t / 0.4);
    this.groundEllipse(z.x, z.y, z.r, `rgba(150,210,255,${0.3 * a})`, `rgba(220,240,255,${0.8 * a})`);
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(240,250,255,0.95)';
    for (let i = 0; i < 26; i++) {
      const ang = i * 2.39996, rr = ((i * 37) % 100) / 100 * z.r;
      const gx = z.x + Math.cos(ang) * rr, gy = z.y + Math.sin(ang) * rr;
      const fall = 60 - ((this.time * 140 + i * 23) % 60);
      const p = this.cam.project(gx, gy, fall);
      ctx.fillRect(R(p.x), R(p.y), 1, 2);
    }
  };

  Renderer.prototype.drawGroundFx = function (f) {
    const k = 1 - f.ttl / f.max;
    if (f.kind === 'aimPulse') {
      this.groundEllipse(f.x, f.y, f.r * (0.4 + k * 0.7), `rgba(255,120,80,${0.3 * (1 - k)})`, f.crit ? `rgba(255,215,0,${1 - k})` : `rgba(255,80,80,${1 - k})`);
    } else if (f.kind === 'blast') {
      this.groundEllipse(f.x, f.y, f.r * (0.5 + k * 0.5), f.hero === 'mago' ? `rgba(255,120,40,${0.5 * (1 - k)})` : `rgba(230,180,90,${0.45 * (1 - k)})`);
    } else if (f.kind === 'explosion') {
      this.groundEllipse(f.x, f.y, f.r * (0.3 + k * 0.9), `rgba(255,${120 + k * 100 | 0},0,${0.7 * (1 - k)})`, `rgba(60,30,10,${1 - k})`);
    }
  };

  Renderer.prototype.drawMeteorFalling = function (m) {
    const k = 1 - m.t / m.max;
    const h = 420 * (1 - k);
    const p = this.cam.project(m.x + 220 * (1 - k), m.y, h);
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(255,170,60,0.6)';
    for (let i = 1; i < 6; i++) ctx.fillRect(R(p.x + i * 3), R(p.y - i * 5), 3, 3);
    ctx.fillStyle = '#ff9f1a'; ctx.fillRect(R(p.x) - 3, R(p.y) - 3, 7, 7);
    ctx.fillStyle = '#fff1a8'; ctx.fillRect(R(p.x) - 1, R(p.y) - 1, 3, 3);
  };

  const PROJ_COLOR = { arqueiro: '#f5e6c8', elfo: '#7bed9f', mago: '#ff7f50' };

  Renderer.prototype.drawAirFx = function (f) {
    const ctx = this.ctx;
    const cam = this.cam;
    const k = 1 - f.ttl / f.max;
    switch (f.kind) {
      case 'proj': case 'enemyProj': {
        const x = f.x + (f.x2 - f.x) * k, y = f.y + (f.y2 - f.y) * k;
        const arc = 18 + Math.sin(k * Math.PI) * 30;
        const p = cam.project(x, y, arc);
        ctx.fillStyle = f.kind === 'enemyProj' ? '#c3a6ff' : (PROJ_COLOR[f.hero] || '#fff');
        const sz = f.hero === 'mago' || f.kind === 'enemyProj' ? 3 : 2;
        ctx.fillRect(R(p.x) - (sz >> 1), R(p.y) - (sz >> 1), sz, sz);
        break;
      }
      case 'slash': case 'bite': {
        const p = cam.project(f.x, f.y, 14);
        ctx.fillStyle = f.kind === 'slash' ? `rgba(255,255,255,${1 - k})` : `rgba(255,60,60,${1 - k})`;
        const d = R(2 + k * 4);
        ctx.fillRect(R(p.x) - d, R(p.y) - d, 1, 1); ctx.fillRect(R(p.x) + d, R(p.y) - d, 1, 1);
        ctx.fillRect(R(p.x), R(p.y), 1, 1); ctx.fillRect(R(p.x) - d, R(p.y) + d, 1, 1); ctx.fillRect(R(p.x) + d, R(p.y) + d, 1, 1);
        break;
      }
      case 'lightning': {
        ctx.strokeStyle = `rgba(210,235,255,${1 - k})`;
        ctx.lineWidth = 1;
        // pts[0] = céu, pts[1..] = alvos no chão
        const first = f.pts[1];
        const pts = [cam.project(first.x, first.y, 500)].concat(f.pts.slice(1).map((pt) => cam.project(pt.x, pt.y, 12)));
        ctx.beginPath();
        ctx.moveTo(R(pts[0].x), R(pts[0].y));
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i];
          for (let s = 1; s <= 5; s++) {
            const t = s / 5, j = s === 5 ? 0 : (Math.random() - 0.5) * 8;
            ctx.lineTo(R(a.x + (b.x - a.x) * t + j), R(a.y + (b.y - a.y) * t));
          }
        }
        ctx.stroke();
        break;
      }
      case 'death': case 'respawn': {
        const p = cam.project(f.x, f.y, 10 + k * 14);
        ctx.fillStyle = f.kind === 'respawn' ? `rgba(255,255,180,${1 - k})` : f.color;
        ctx.globalAlpha = 1 - k;
        for (let i = 0; i < 6; i++) {
          const a = i * 1.047;
          ctx.fillRect(R(p.x + Math.cos(a) * k * 9), R(p.y + Math.sin(a) * k * 5), 2, 2);
        }
        ctx.globalAlpha = 1;
        break;
      }
      case 'tavern': { // caneca subindo da porta da torre
        const p = cam.project(f.x, f.y, 26 + k * 34);
        ctx.globalAlpha = Math.min(1, (1 - k) * 2);
        const x = R(p.x) - 3, y = R(p.y);
        ctx.fillStyle = '#3a2410'; ctx.fillRect(x - 1, y - 1, 9, 9);
        ctx.fillStyle = '#f5f0e0'; ctx.fillRect(x, y, 6, 2);
        ctx.fillStyle = '#e1a32a'; ctx.fillRect(x, y + 2, 6, 5);
        ctx.fillStyle = '#c47f12'; ctx.fillRect(x + 6, y + 3, 1, 3);
        ctx.globalAlpha = 1;
        break;
      }
      case 'coin': {
        const p = cam.project(f.x, f.y, 30 + k * 30);
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = '#7a5a00'; ctx.fillRect(R(p.x) - 1, R(p.y) - 1, 4, 4);
        ctx.fillStyle = '#ffd32a'; ctx.fillRect(R(p.x) - 1, R(p.y) - 1, 3, 3);
        ctx.fillStyle = '#fff6b0'; ctx.fillRect(R(p.x) - 1, R(p.y) - 1, 1, 1);
        ctx.globalAlpha = 1;
        break;
      }
    }
  };

  Renderer.prototype.drawAim = function (game, ui) {
    if (ui && ui.armedPower && ui.pointer) {
      const p = game.stats.powers[ui.armedPower];
      this.groundEllipse(ui.pointer.x, ui.pointer.y, p.radius || p.chainRange * 0.6, 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.9)', true);
    }
    const a = game.aim;
    if (!a.active) return;
    const st = game.stats.aim;
    // linha pontilhada discreta do dedo até a mira (só no toque, enquanto o dedo está na tela)
    if (ui && ui.finger) {
      const target = ui.armedPower && ui.pointer ? ui.pointer : a;
      const t = this.cam.project(target.x, target.y);
      const ctx0 = this.ctx;
      ctx0.fillStyle = 'rgba(255,255,255,0.45)';
      const dx = t.x - ui.finger.x, dy = t.y - ui.finger.y;
      const n = Math.max(1, Math.floor(Math.hypot(dx, dy) / 4));
      for (let i = 1; i < n; i += 2) ctx0.fillRect(R(ui.finger.x + dx * i / n), R(ui.finger.y + dy * i / n), 1, 1);
    }
    const charge = 1 - Math.max(0, a.cd) / st.interval;
    this.groundEllipse(a.x, a.y, st.radius, 'rgba(255,60,60,0.10)', 'rgba(255,60,60,0.95)');
    // anel de recarga
    const ctx = this.ctx;
    const p = this.cam.project(a.x, a.y);
    const { rx, ry } = this.cam.groundRadii(a.y, st.radius + 7);
    ctx.strokeStyle = 'rgba(255,220,80,0.95)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(R(p.x), R(p.y), rx, ry, 0, -Math.PI / 2, -Math.PI / 2 + charge * Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,60,60,0.95)';
    ctx.fillRect(R(p.x) - 3, R(p.y), 7, 1);
    ctx.fillRect(R(p.x), R(p.y) - 2, 1, 5);
  };

  root.TD_RENDER = { Renderer };
})(typeof self !== 'undefined' ? self : this);
