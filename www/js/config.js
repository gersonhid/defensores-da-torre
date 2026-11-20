/*
 * CONFIGURAÇÃO DE BALANCEAMENTO
 * ------------------------------------------------------------
 * TODOS os números do jogo ficam aqui. Altere e rode:
 *     npm run sim
 * para ver o efeito na curva de dificuldade (ver docs/BALANCEAMENTO.md).
 *
 * Unidades: distância em "unidades de chão" (mundo lógico 1120x1000, visto de cima),
 * tempo em segundos. A perspectiva inclinada é só visual (ver `view` e js/camera.js).
 * Arquivo UMD: funciona no navegador (window.TD_CONFIG) e no Node (require).
 */
(function (root, factory) {
  const cfg = factory();
  if (typeof module === 'object' && module.exports) module.exports = cfg;
  else root.TD_CONFIG = cfg;
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    // Mapa mais "fundo" que largo: depois de inclinado ele preenche uma tela horizontal.
    // Distância canto -> torre ≈ 750 (quase igual à versão retrato, preserva o balanceamento).
    // spawnMargin: distância fora da borda onde os invasores surgem (vêm de qualquer ponto do contorno)
    world: { width: 1120, height: 1000, spawnMargin: 30 },

    // ---------------- TOQUE ----------------
    // A mira fica acima do dedo para não ser escondida por ele (em pixels da tela; 0 = sob o dedo).
    input: { touchAimOffset: 45 },

    // ---------------- CÂMERA / PIXEL ART (só visual) ----------------
    // pixelHeight: altura da tela interna em pixels "gordos" (menor = pixels maiores).
    // top/bottom: linha da tela onde ficam a borda de trás e da frente do mapa.
    // farScale: tamanho das coisas no fundo em relação à frente (1 = sem perspectiva).
    // tilt: achatamento vertical do chão (1 = visto de cima, 0.5 = bem deitado).
    view: { pixelHeight: 320, top: 58, bottom: 312, farScale: 0.68, tilt: 0.6, spriteScale: 1.7 },

    // ---------------- TORRE ----------------
    tower: { hp: 600, armor: 0, regen: 0, thorns: 0, radius: 48 },
    // Tamanho da torre na TELA (unidades do mundo), usado para calcular a "zona cega" atrás dela:
    // chão onde um personagem ficaria mais da metade escondido. Invasores contornam essa zona e
    // os heróis não ficam parados nela. halfWidth = meia largura do corpo da torre; sideMargin = folga.
    // Se a arte da torre mudar de proporção, ajuste aqui. Ver docs/VISIBILIDADE.md.
    towerSprite: { height: 200, halfWidth: 48, sideMargin: 10 },

    // ---------------- MIRA DO JOGADOR ----------------
    // Pulso de dano em área a cada `interval` segundos na posição do dedo.
    aim: { damage: 19, interval: 0.85, radius: 46, critChance: 0, critMult: 2.5, pierce: 0 },

    // ---------------- HERÓIS ----------------
    heroDefaults: { leash: 310, respawn: 14, homeRadius: 105, maxOnField: 16 },

    // ---------------- TABERNA ----------------
    // Desbloqueada na Evolução. De `interval` em `interval` segundos um herói extra entra na batalha,
    // sorteado na proporção dos heróis convocados (1 Bárbaro + 2 Arqueiros = 33% / 67%).
    // max = heróis da Taberna vivos ao mesmo tempo; o relógio só anda enquanto houver vaga.
    // Heróis da Taberna não renascem. Ver docs/TABERNA.md.
    tavern: { unlocked: false, interval: 45, max: 1, firstDelay: 20 },
    // range = distância borda-a-borda. splash = raio de dano em área (70% nos secundários).
    heroes: {
      barbaro:  { name: 'Bárbaro',  icon: '🪓', color: '#c0392b', cost: 3, unlocked: true,
                  hp: 240, damage: 22, interval: 1.0,  range: 8,   speed: 95,  armor: 2, splash: 0,
                  radius: 16, lifesteal: 0 },
      arqueiro: { name: 'Arqueiro', icon: '🏹', color: '#27ae60', cost: 3, unlocked: false,
                  hp: 100, damage: 15, interval: 0.95, range: 230, speed: 85,  armor: 0, splash: 0,
                  radius: 14, doubleShot: 0 },
      anao:     { name: 'Anão',     icon: '⛏️', color: '#d35400', cost: 4, unlocked: false,
                  hp: 340, damage: 30, interval: 1.5,  range: 8,   speed: 70,  armor: 6, splash: 45,
                  radius: 17, stun: 0 },
      elfo:     { name: 'Elfo',     icon: '🧝', color: '#16a085', cost: 5, unlocked: false,
                  hp: 120, damage: 11, interval: 0.5,  range: 270, speed: 115, armor: 1, splash: 0,
                  radius: 14, extraTargets: 0 },
      mago:     { name: 'Mago',     icon: '🧙', color: '#8e44ad', cost: 6, unlocked: false,
                  hp: 90,  damage: 30, interval: 1.9,  range: 220, speed: 80,  armor: 0, splash: 65,
                  radius: 15, slowOnHit: 0 },
    },

    // ---------------- PODERES ----------------
    // Comprados com pontos antes da partida (1 de cada). Durante a partida podem ser
    // lançados sempre que a recarga (cooldown) terminar.
    powers: {
      raio:    { name: 'Raio',          icon: '⚡', cost: 5, cooldown: 12, unlocked: false,
                 damage: 80, chains: 4, chainRange: 160, falloff: 0.85 },
      gelo:    { name: 'Chuva de Gelo', icon: '❄️', cost: 6, cooldown: 18, unlocked: false,
                 dps: 25, duration: 4, radius: 150, slow: 0.5 },
      meteoro: { name: 'Meteoro',       icon: '☄️', cost: 8, cooldown: 22, unlocked: false,
                 damage: 240, radius: 115, delay: 0.9 },
    },

    // ---------------- INVASORES (valores do nível 1) ----------------
    // threat = custo no "orçamento de ameaça" da onda. weight = chance relativa de sorteio.
    enemies: {
      goblin: { name: 'Goblin', icon: '👺', color: '#6ab04c', hp: 30,  speed: 68,  damage: 5,  interval: 1.0,
                range: 6,   armor: 0, reward: 2,  threat: 1,   radius: 13, unlockLevel: 1,  weight: 5 },
      lobo:   { name: 'Lobo',   icon: '🐺', color: '#7f8c8d', hp: 24,  speed: 125, damage: 4,  interval: 0.8,
                range: 6,   armor: 0, reward: 2,  threat: 1.2, radius: 13, unlockLevel: 3,  weight: 3 },
      orc:    { name: 'Orc',    icon: '👹', color: '#2d6a4f', hp: 90,  speed: 50,  damage: 12, interval: 1.2,
                range: 8,   armor: 3, reward: 5,  threat: 3,   radius: 17, unlockLevel: 4,  weight: 3 },
      xama:   { name: 'Xamã',   icon: '💀', color: '#6c5ce7', hp: 55,  speed: 45,  damage: 10, interval: 2.0,
                range: 190, armor: 0, reward: 6,  threat: 3.5, radius: 14, unlockLevel: 7,  weight: 2, ranged: true },
      troll:  { name: 'Troll',  icon: '🦍', color: '#576574', hp: 320, speed: 32,  damage: 28, interval: 1.6,
                range: 10,  armor: 6, reward: 16, threat: 10,  radius: 24, unlockLevel: 10, weight: 1.2 },
      // CHEFÕES: aparecem no fim do último nível de cada fase. bossFrom = nível a partir do qual este é o chefe.
      chefe_goblin: { name: 'Rei Goblin', icon: '👑', color: '#8bc34a', hp: 480, speed: 38, damage: 18, interval: 1.4,
                range: 8,   armor: 2, reward: 35, threat: 0,   radius: 22, boss: true, bossFrom: 1 },
      chefe_orc: { name: 'Senhor da Guerra Orc', icon: '👹', color: '#33691e', hp: 950, speed: 32, damage: 32, interval: 1.6,
                range: 10,  armor: 5, reward: 60, threat: 0,   radius: 28, boss: true, bossFrom: 10 },
      ogro:   { name: 'Ogro Chefe', icon: '👿', color: '#b33939', hp: 880, speed: 27, damage: 45, interval: 2.0,
                range: 12,  armor: 8, reward: 90, threat: 0,   radius: 34, boss: true, bossFrom: 22 },
      troll_anciao: { name: 'Troll Ancião', icon: '🗿', color: '#455a64', hp: 1250, speed: 24, damage: 60, interval: 2.2,
                range: 12,  armor: 10, reward: 130, threat: 0, radius: 38, boss: true, bossFrom: 37 },
    },

    // ---------------- BESTIÁRIO ----------------
    // Recompensa (Florins) coletada uma única vez quando o herói é desbloqueado ou o invasor é
    // derrotado pela primeira vez, ou o poder é desbloqueado.
    // Total: 800 (heróis) + 650 (poderes) + 2.080 (invasores) = 3.530. Ver docs/BESTIARIO.md.
    bestiary: {
      heroes: {
        barbaro:  { reward: 50,  desc: 'Guerreiro das montanhas do norte. Segura a linha de frente com o machado e não recua.' },
        arqueiro: { reward: 100, desc: 'Caçador da floresta. Acerta um alvo de cada vez, de longe, antes que chegue à torre.' },
        anao:     { reward: 150, desc: 'Forjado nas minas. A armadura pesada aguenta golpes e o martelo atinge vários inimigos.' },
        elfo:     { reward: 200, desc: 'Arqueiro veloz de alcance enorme. Dispara sem parar, mas sofre contra armaduras.' },
        mago:     { reward: 300, desc: 'Estudioso das artes arcanas. Bolas de fogo em área, mas é frágil de perto.' },
      },
      powers: {
        raio:    { reward: 150, desc: 'Um relâmpago cai do céu e salta de inimigo em inimigo, perdendo força a cada salto.' },
        gelo:    { reward: 200, desc: 'Uma nevasca cobre a área: congela aos poucos e deixa os invasores lentos.' },
        meteoro: { reward: 300, desc: 'Uma rocha em chamas cai do céu e esmaga tudo em volta. Demora um instante para chegar.' },
      },
      enemies: {
        goblin:       { reward: 30,  desc: 'Pequeno, numeroso e covarde. Sozinho não assusta; em bando derruba muralhas.' },
        lobo:         { reward: 40,  desc: 'Corre mais rápido que todos. Chega à torre antes que você perceba.' },
        orc:          { reward: 60,  desc: 'Soldado de armadura de ferro. Golpes fracos mal arranham.' },
        xama:         { reward: 80,  desc: 'Feiticeiro morto-vivo. Ataca a torre de longe com chamas roxas.' },
        troll:        { reward: 120, desc: 'Gigante lento e resistente. Cada golpe do porrete abala as pedras da torre.' },
        chefe_goblin: { reward: 150, desc: 'Chefão. O mais esperto dos goblins se coroou rei e comanda o bando.' },
        chefe_orc:    { reward: 300, desc: 'Chefão. Veterano de cem batalhas, lidera as legiões orcs.' },
        ogro:         { reward: 500, desc: 'Chefão. Armadura grossa: só golpes fortes e perfurantes o derrubam.' },
        troll_anciao: { reward: 800, desc: 'Chefão. Tão velho quanto a própria torre. Dizem que já a derrubou uma vez.' },
      },
    },

    // ---------------- GERAÇÃO DE NÍVEIS ----------------
    levels: {
      baseThreat: 13,       // ameaça da 1ª onda do nível 1 (~13 goblins)
      // multiplicador de ameaça = 1 + threatLinear*(N-1) + threatQuad*(N-1)^2
      threatLinear: 0.115, threatQuad: 0.0008,
      waveThreatStep: 0.15, // cada onda dentro do nível é +15% maior
      wavesBase: 3, wavesEvery: 4, wavesMax: 8,
      hpGrowth: 1.025,      // +2.5% vida dos inimigos por nível
      dmgGrowth: 1.03,      // +3% dano dos inimigos por nível
      rewardGrowth: 1.0,    // +0% Florins por abate por nível
      waveDuration: 14, waveGap: 5, firstDelay: 2,
      bossEvery: 3,         // fase = 3 níveis; o último termina com um chefão
      bossDelay: 3,         // segundos após a última onda até o chefão entrar
      bossHpMult: 3.0,      // força dos chefões: multiplicador de vida
      bossDmgMult: 2.5,     // força dos chefões: multiplicador de dano
    },

    // ---------------- ANÚNCIOS RECOMPENSADOS ----------------
    // reviveHp: vida da torre ao reviver (fração). reviveStun: segundos que os inimigos ficam atordoados.
    // doubleFlorins: o anúncio na tela de resultado repete os Florins ganhos na partida.
    ads: { reviveHp: 0.5, reviveStun: 2.5, reviveRadius: 260, doubleFlorins: true },

    // ---------------- PONTOS DE CONVOCAÇÃO ----------------
    summon: { basePoints: 6, pointsPerLevel: 0.75 },

    // ---------------- ECONOMIA (Florins) ----------------
    economy: { victoryBase: 15, victoryPerLevel: 8, replayVictoryFactor: 0.3 },

    // ---------------- CADEIA DE EVOLUÇÃO ----------------
    // custo do próximo nível = round(cost * growth^rankAtual)
    // fx: p = caminho do atributo ('*' = todos), m = multiplicador por nível (+0.1 = +10%),
    //     a = soma por nível, set = valor fixo (desbloqueios)
    branches: [
      { id: 'torre',    name: 'Torre',    icon: '🏰' },
      { id: 'mira',     name: 'Mira',     icon: '🎯' },
      { id: 'comando',  name: 'Comando',  icon: '🚩' },
      { id: 'barbaro',  name: 'Bárbaro',  icon: '🪓' },
      { id: 'arqueiro', name: 'Arqueiro', icon: '🏹' },
      { id: 'anao',     name: 'Anão',     icon: '⛏️' },
      { id: 'elfo',     name: 'Elfo',     icon: '🧝' },
      { id: 'mago',     name: 'Mago',     icon: '🧙' },
      { id: 'arcano',   name: 'Arcano',   icon: '🔮' },
      { id: 'economia', name: 'Tesouro',  icon: '💰' },
      { id: 'taberna',  name: 'Taberna',  icon: '🍺' },
    ],
    tree: [
      // TORRE
      { id: 'torre_muralha', branch: 'torre', name: 'Muralhas Reforçadas', desc: '+12% vida da torre', pos: [2, 7],
        max: 15, cost: 40, growth: 1.32, req: [['bar_vida', 1]], fx: [{ p: 'tower.hp', m: 0.12 }] },
      { id: 'torre_pedreiros', branch: 'torre', name: 'Pedreiros', desc: '+2 vida/s de regeneração', pos: [3, 8],
        max: 5, cost: 120, growth: 1.45, req: [['torre_muralha', 2]], fx: [{ p: 'tower.regen', a: 2 }] },
      { id: 'torre_blindagem', branch: 'torre', name: 'Blindagem', desc: '+1 armadura (reduz cada golpe)', pos: [3, 7],
        max: 5, cost: 150, growth: 1.5, req: [['torre_muralha', 3]], fx: [{ p: 'tower.armor', a: 1 }] },
      { id: 'torre_espinhos', branch: 'torre', name: 'Espinhos', desc: 'Atacantes corpo-a-corpo sofrem +6 de dano', pos: [4, 7],
        max: 5, cost: 220, growth: 1.5, req: [['torre_blindagem', 2]], fx: [{ p: 'tower.thorns', a: 6 }] },
      // MIRA
      { id: 'mira_pontaria', branch: 'mira', name: 'Pontaria', desc: '+12% dano da mira', pos: [1, 2],
        max: 15, cost: 40, growth: 1.32, req: [['bar_forca', 1]], fx: [{ p: 'aim.damage', m: 0.12 }] },
      { id: 'mira_gatilho', branch: 'mira', name: 'Gatilho Rápido', desc: '-5% intervalo entre disparos', pos: [2, 1],
        max: 8, cost: 80, growth: 1.4, req: [['mira_pontaria', 2]], fx: [{ p: 'aim.interval', m: -0.05 }] },
      { id: 'mira_ampla', branch: 'mira', name: 'Mira Ampla', desc: '+8% raio da mira', pos: [2, 2],
        max: 6, cost: 100, growth: 1.45, req: [['mira_pontaria', 3]], fx: [{ p: 'aim.radius', m: 0.08 }] },
      { id: 'mira_critico', branch: 'mira', name: 'Golpe Crítico', desc: '+6% chance de crítico (x2.5)', pos: [3, 0],
        max: 6, cost: 200, growth: 1.45, req: [['mira_gatilho', 3]], fx: [{ p: 'aim.critChance', a: 0.06 }] },
      { id: 'mira_perfurante', branch: 'mira', name: 'Disparo Perfurante', desc: 'Ignora 2 de armadura', pos: [4, 0],
        max: 4, cost: 260, growth: 1.5, req: [['mira_critico', 2]], fx: [{ p: 'aim.pierce', a: 2 }] },
      // COMANDO
      { id: 'cmd_estrategista', branch: 'comando', name: 'Estrategista', desc: '+1 ponto de convocação', pos: [4, 6],
        max: 10, cost: 90, growth: 1.38, req: [['arq_alcance', 1]], fx: [{ p: 'bonusPoints', a: 1 }] },
      { id: 'cmd_clerigo', branch: 'comando', name: 'Clérigo', desc: '-10% tempo para heróis renascerem', pos: [5, 7],
        max: 5, cost: 120, growth: 1.45, req: [['cmd_estrategista', 2]], fx: [{ p: 'respawn', m: -0.1 }] },
      { id: 'cmd_vitalidade', branch: 'comando', name: 'Vitalidade', desc: '+6% vida de todos os heróis', pos: [5, 6],
        max: 10, cost: 150, growth: 1.42, req: [['cmd_estrategista', 3]], fx: [{ p: 'heroes.*.hp', m: 0.06 }] },
      { id: 'cmd_lideranca', branch: 'comando', name: 'Liderança', desc: '+6% dano de todos os heróis', pos: [5, 5],
        max: 10, cost: 180, growth: 1.42, req: [['cmd_estrategista', 4]], fx: [{ p: 'heroes.*.damage', m: 0.06 }] },
      // TABERNA
      // logo depois do Arqueiro (início do jogo); fica numa linha própria, abaixo da teia
      { id: 'tav_unlock', branch: 'taberna', name: 'Taberna', desc: 'Um herói extra entra na batalha de tempos em tempos (proporção dos convocados)', pos: [2, 9],
        max: 1, cost: 300, growth: 1, req: [['arq_unlock', 1]], fx: [{ p: 'tavern.unlocked', set: true }] },
      { id: 'tav_rodada', branch: 'taberna', name: 'Rodada da Casa', desc: '-8% tempo entre heróis da Taberna', pos: [3, 9],
        max: 6, cost: 150, growth: 1.45, req: [['tav_unlock', 1]], fx: [{ p: 'tavern.interval', m: -0.08 }] },
      { id: 'tav_mesas', branch: 'taberna', name: 'Mais Mesas', desc: '+1 herói da Taberna ao mesmo tempo', pos: [3, 10],
        max: 3, cost: 500, growth: 1.8, req: [['tav_unlock', 1]], fx: [{ p: 'tavern.max', a: 1 }] },
      // BÁRBARO
      { id: 'bar_forca', branch: 'barbaro', name: 'Força Bruta', desc: '+10% dano do Bárbaro', pos: [0, 4],
        max: 12, cost: 60, growth: 1.35, fx: [{ p: 'heroes.barbaro.damage', m: 0.1 }] },
      { id: 'bar_vida', branch: 'barbaro', name: 'Pele Grossa', desc: '+10% vida do Bárbaro', pos: [1, 5],
        max: 12, cost: 60, growth: 1.35, req: [['bar_forca', 1]], fx: [{ p: 'heroes.barbaro.hp', m: 0.1 }] },
      { id: 'bar_furia', branch: 'barbaro', name: 'Fúria Sangrenta', desc: 'Recupera 8% do dano causado como vida', pos: [1, 3],
        max: 3, cost: 300, growth: 1.6, req: [['bar_forca', 3]], fx: [{ p: 'heroes.barbaro.lifesteal', a: 0.08 }] },
      // ARQUEIRO
      { id: 'arq_unlock', branch: 'arqueiro', name: 'Convocar Arqueiro', desc: 'Desbloqueia o Arqueiro (dano à distância)', pos: [1, 4],
        max: 1, cost: 80, growth: 1, req: [['bar_forca', 1]], fx: [{ p: 'heroes.arqueiro.unlocked', set: true }] },
      { id: 'arq_flechas', branch: 'arqueiro', name: 'Flechas Afiadas', desc: '+10% dano do Arqueiro', pos: [2, 4],
        max: 12, cost: 60, growth: 1.35, req: [['arq_unlock', 1]], fx: [{ p: 'heroes.arqueiro.damage', m: 0.1 }] },
      { id: 'arq_alcance', branch: 'arqueiro', name: 'Olho de Águia', desc: '+8% alcance do Arqueiro', pos: [3, 5],
        max: 5, cost: 80, growth: 1.4, req: [['arq_flechas', 1]], fx: [{ p: 'heroes.arqueiro.range', m: 0.08 }] },
      { id: 'arq_dupla', branch: 'arqueiro', name: 'Flecha Dupla', desc: '+15% chance de disparar 2 flechas', pos: [3, 3],
        max: 3, cost: 300, growth: 1.6, req: [['arq_flechas', 3]], fx: [{ p: 'heroes.arqueiro.doubleShot', a: 0.15 }] },
      // ANÃO
      { id: 'anao_unlock', branch: 'anao', name: 'Convocar Anão', desc: 'Desbloqueia o Anão (tanque com martelo em área)', pos: [3, 4],
        max: 1, cost: 250, growth: 1, req: [['arq_flechas', 2]], fx: [{ p: 'heroes.anao.unlocked', set: true }] },
      { id: 'anao_martelo', branch: 'anao', name: 'Martelo Rúnico', desc: '+10% dano do Anão', pos: [4, 4],
        max: 8, cost: 80, growth: 1.35, req: [['anao_unlock', 1]], fx: [{ p: 'heroes.anao.damage', m: 0.1 }] },
      { id: 'anao_couraca', branch: 'anao', name: 'Couraça de Mithril', desc: '+10% vida do Anão', pos: [4, 5],
        max: 8, cost: 80, growth: 1.35, req: [['anao_unlock', 1]], fx: [{ p: 'heroes.anao.hp', m: 0.1 }] },
      { id: 'anao_atordoar', branch: 'anao', name: 'Tremor', desc: '+12% chance de atordoar (1s)', pos: [5, 3],
        max: 3, cost: 350, growth: 1.6, req: [['anao_martelo', 3]], fx: [{ p: 'heroes.anao.stun', a: 0.12 }] },
      // ELFO
      { id: 'elfo_unlock', branch: 'elfo', name: 'Convocar Elfo', desc: 'Desbloqueia o Elfo (disparos rápidos, longo alcance)', pos: [5, 4],
        max: 1, cost: 500, growth: 1, req: [['anao_martelo', 2]], fx: [{ p: 'heroes.elfo.unlocked', set: true }] },
      { id: 'elfo_precisao', branch: 'elfo', name: 'Precisão Élfica', desc: '+10% dano do Elfo', pos: [6, 4],
        max: 8, cost: 100, growth: 1.35, req: [['elfo_unlock', 1]], fx: [{ p: 'heroes.elfo.damage', m: 0.1 }] },
      { id: 'elfo_agilidade', branch: 'elfo', name: 'Agilidade', desc: '-5% intervalo de ataque do Elfo', pos: [6, 5],
        max: 6, cost: 120, growth: 1.4, req: [['elfo_unlock', 1]], fx: [{ p: 'heroes.elfo.interval', m: -0.05 }] },
      { id: 'elfo_multi', branch: 'elfo', name: 'Chuva de Flechas', desc: '+1 alvo extra por disparo', pos: [7, 3],
        max: 2, cost: 600, growth: 2, req: [['elfo_precisao', 3]], fx: [{ p: 'heroes.elfo.extraTargets', a: 1 }] },
      // MAGO
      { id: 'mago_unlock', branch: 'mago', name: 'Convocar Mago', desc: 'Desbloqueia o Mago (bola de fogo em área)', pos: [7, 4],
        max: 1, cost: 800, growth: 1, req: [['elfo_precisao', 2]], fx: [{ p: 'heroes.mago.unlocked', set: true }] },
      { id: 'mago_arcano', branch: 'mago', name: 'Poder Arcano', desc: '+10% dano do Mago', pos: [8, 4],
        max: 8, cost: 120, growth: 1.35, req: [['mago_unlock', 1]], fx: [{ p: 'heroes.mago.damage', m: 0.1 }] },
      { id: 'mago_explosao', branch: 'mago', name: 'Explosão Ampla', desc: '+10% raio da explosão', pos: [8, 5],
        max: 5, cost: 150, growth: 1.45, req: [['mago_unlock', 1]], fx: [{ p: 'heroes.mago.splash', m: 0.1 }] },
      { id: 'mago_gelo', branch: 'mago', name: 'Toque Gélido', desc: 'Ataques deixam alvos 15% mais lentos', pos: [9, 4],
        max: 3, cost: 450, growth: 1.6, req: [['mago_arcano', 3]], fx: [{ p: 'heroes.mago.slowOnHit', a: 0.15 }] },
      // ARCANO
      { id: 'pod_raio', branch: 'arcano', name: 'Desbloquear Raio', desc: 'Raio em cadeia que salta entre inimigos', pos: [3, 2],
        max: 1, cost: 350, growth: 1, req: [['mira_ampla', 1]], fx: [{ p: 'powers.raio.unlocked', set: true }] },
      { id: 'pod_raio_forca', branch: 'arcano', name: 'Tempestade', desc: '+15% dano do Raio', pos: [4, 1],
        max: 6, cost: 150, growth: 1.4, req: [['pod_raio', 1]], fx: [{ p: 'powers.raio.damage', m: 0.15 }] },
      { id: 'pod_raio_cadeia', branch: 'arcano', name: 'Condutor', desc: '+1 salto do Raio', pos: [4, 2],
        max: 4, cost: 250, growth: 1.6, req: [['pod_raio', 1]], fx: [{ p: 'powers.raio.chains', a: 1 }] },
      { id: 'pod_gelo', branch: 'arcano', name: 'Desbloquear Chuva de Gelo', desc: 'Área que causa dano e lentidão', pos: [8, 2],
        max: 1, cost: 650, growth: 1, req: [['pod_raio_cadeia', 1], ['mago_unlock', 1]], fx: [{ p: 'powers.gelo.unlocked', set: true }] },
      { id: 'pod_gelo_forca', branch: 'arcano', name: 'Granizo', desc: '+15% dano da Chuva de Gelo', pos: [9, 1],
        max: 6, cost: 180, growth: 1.4, req: [['pod_gelo', 1]], fx: [{ p: 'powers.gelo.dps', m: 0.15 }] },
      { id: 'pod_gelo_area', branch: 'arcano', name: 'Nevasca', desc: '+10% área da Chuva de Gelo', pos: [9, 0],
        max: 4, cost: 220, growth: 1.5, req: [['pod_gelo', 1]], fx: [{ p: 'powers.gelo.radius', m: 0.1 }] },
      { id: 'pod_meteoro', branch: 'arcano', name: 'Desbloquear Meteoro', desc: 'Impacto devastador em área', pos: [10, 2],
        max: 1, cost: 1100, growth: 1, req: [['pod_gelo', 1]], fx: [{ p: 'powers.meteoro.unlocked', set: true }] },
      { id: 'pod_meteoro_forca', branch: 'arcano', name: 'Núcleo Ardente', desc: '+15% dano do Meteoro', pos: [11, 1],
        max: 6, cost: 220, growth: 1.4, req: [['pod_meteoro', 1]], fx: [{ p: 'powers.meteoro.damage', m: 0.15 }] },
      { id: 'pod_meteoro_area', branch: 'arcano', name: 'Cratera', desc: '+10% área do Meteoro', pos: [11, 2],
        max: 4, cost: 260, growth: 1.5, req: [['pod_meteoro', 1]], fx: [{ p: 'powers.meteoro.radius', m: 0.1 }] },
      { id: 'pod_canalizacao', branch: 'arcano', name: 'Canalização', desc: '-8% recarga de todos os poderes', pos: [11, 3],
        max: 5, cost: 700, growth: 1.5, req: [['pod_meteoro', 1]], fx: [{ p: 'powers.*.cooldown', m: -0.08 }] },
      { id: 'pod_foco', branch: 'arcano', name: 'Foco Arcano', desc: 'Poderes custam -1 ponto de convocação', pos: [12, 3],
        max: 2, cost: 1500, growth: 2, req: [['pod_canalizacao', 2]], fx: [{ p: 'powers.*.cost', a: -1 }] },
      // TESOURO
      { id: 'eco_saque', branch: 'economia', name: 'Saque', desc: '+6% Florins por abate', pos: [2, 6],
        max: 10, cost: 60, growth: 1.4, req: [['bar_vida', 1]], fx: [{ p: 'florimMult', m: 0.06 }] },
      { id: 'eco_tesouro', branch: 'economia', name: 'Tesouro Real', desc: '+20% bônus de vitória', pos: [3, 6],
        max: 5, cost: 100, growth: 1.45, req: [['eco_saque', 2]], fx: [{ p: 'victoryMult', m: 0.2 }] },
    ],
  };
});
