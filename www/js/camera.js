/*
 * Câmera inclinada (perspectiva estilo "Mode 7").
 * A lógica do jogo acontece num chão plano visto de cima (x, y do mundo).
 * Aqui convertemos chão -> tela (pixels internos) e tela -> chão (para o toque/mira).
 *
 *   profundidade z(y) vai de zFar (fundo, y=0) até 1 (frente, y=H)
 *   escala(y)  = sNear / z
 *   telaY(y)   = horizonte + A / z
 *   telaX(x,y) = centro + (x - W/2) * escala(y)
 */
(function (root) {
  'use strict';
  const CFG = root.TD_CONFIG;
  const W = CFG.world.width, H = CFG.world.height;

  function Camera(screenW) {
    const v = CFG.view;
    this.sh = v.pixelHeight;
    this.sw = screenW;
    this.zFar = 1 / v.farScale;
    this.A = (v.bottom - v.top) / (1 - v.farScale);
    this.horizon = v.bottom - this.A;
    // taxa vertical do chão na frente = tilt * escala horizontal na frente
    this.sNear = this.A * (this.zFar - 1) / (H * v.tilt);
    this.spriteScale = v.spriteScale;
  }

  Camera.prototype.z = function (y) { return this.zFar + (1 - this.zFar) * (y / H); };
  Camera.prototype.scaleAt = function (y) { return this.sNear / this.z(y); };

  // chão -> tela. h = altura acima do chão (unidades do mundo).
  Camera.prototype.project = function (x, y, h) {
    const z = this.z(y);
    const s = this.sNear / z;
    return { x: this.sw / 2 + (x - W / 2) * s, y: this.horizon + this.A / z - (h || 0) * s, s };
  };

  // tela -> chão
  Camera.prototype.unproject = function (sx, sy) {
    const z = this.A / Math.max(1, sy - this.horizon);
    const y = H * (z - this.zFar) / (1 - this.zFar);
    const s = this.sNear / z;
    return { x: W / 2 + (sx - this.sw / 2) / s, y };
  };

  // raios (na tela) de um círculo de raio r desenhado no chão em y
  Camera.prototype.groundRadii = function (y, r) {
    const z = this.z(y);
    const s = this.sNear / z;
    const dYdy = this.A * (this.zFar - 1) / (H * z * z);
    return { rx: r * s, ry: r * dYdy };
  };

  root.TD_CAMERA = { Camera };
})(typeof self !== 'undefined' ? self : this);
