// ============================================================
// INSTINTO MTB - juego 2D de descenso (Phaser 3)
// Todos los gráficos se generan por código: no necesitas assets.
// ============================================================

const W = 960;
const H = 540;
const GROUND_Y = 430;     // altura del suelo (en el mundo)
const PLAYER_X = 250;     // posición fija de la bici en pantalla
const SLOPE = 0.085;      // inclinación de la cámara (radianes) = sensación de bajada

const BIKE_COLORS = [0xE5383B, 0x2B7DE9, 0x2EAD5B, 0xF28C1E, 0x8A4FD8, 0xF2F2F2];

const TITLE_FONT = '"Russo One", Impact, "Arial Black", sans-serif';
const BODY_FONT = 'Rubik, Arial, Helvetica, sans-serif';

// Ajustes de juego (aquí se afina la dificultad)
const TUNING = {
  jumpSpeed: 650,
  gravity: 1700,
  hitDamage: 20,     // energía que quitas al chocar
  canEnergy: 5,      // energía que da una lata
  invulnSeconds: 1.0
};

// Un nivel = un objeto de configuración.
// Campos opcionales: slip (resbaloso), meteors (rocas del cielo), hint (mensaje),
// snow/ash/embers (partículas de ambiente), deco (tipo de árboles de fondo)
const LEVELS = [
  {
    name: 'Montaña',
    hint: 'Esquiva troncos y rocas. Recoge latas para no quedarte sin energía.',
    length: 12000, baseSpeed: 280, maxSpeed: 360, drain: 6,
    skyTop: 0x5FA8E0, skyBot: 0xD6EEF9,
    far: 0x7A9FBF, mid: 0x4C7D5A, deco: 0x2E5B3A, decoType: 'pine', snowCaps: true,
    top: 0x4C9440, dirt: 0x7A5636, dust: 0xB9956B, clouds: 0xFFFFFF,
    obstacles: ['rock', 'rock', 'log']
  },
  {
    name: 'Desierto',
    hint: 'El calor gasta tu energía mucho más rápido. No te pierdas las latas.',
    length: 12000, baseSpeed: 300, maxSpeed: 380, drain: 7,
    skyTop: 0xF3A56B, skyBot: 0xFBE6B8,
    far: 0xD98E5A, mid: 0xC97A3F, deco: 0x4E8F4A, decoType: 'cactus', sun: { x: 740, y: 95, r: 46, color: 0xFFF6D0 },
    top: 0xD9A55A, dirt: 0xB9803E, dust: 0xE6C58A, heat: true,
    obstacles: ['cactus', 'cactus', 'rock']
  },
  {
    name: 'Hielo',
    hint: 'Las placas de hielo te hacen derrapar: pierdes el control un momento.',
    length: 12000, baseSpeed: 300, maxSpeed: 390, drain: 6.5, slip: 2.2,
    skyTop: 0x7FA7C9, skyBot: 0xE9F3FA,
    far: 0xB7CDE0, mid: 0xD9E8F2, deco: 0x3B6B73, decoType: 'snowpine', snowCaps: true,
    top: 0xFFFFFF, dirt: 0xB9D3E4, dust: 0xFFFFFF, snow: true, clouds: 0xEEF4F8,
    obstacles: ['rock', 'ice', 'iceblock', 'ice']
  },
  {
    name: 'Volcán',
    hint: 'Caen rocas del cielo. Mira las marcas rojas en el piso.',
    length: 12000, baseSpeed: 320, maxSpeed: 420, drain: 6, meteors: true,
    skyTop: 0x1A0F14, skyBot: 0x7A2E22,
    far: 0x3A2224, mid: 0x241516, deco: 0x160D0E, decoType: 'spike', sun: { x: 760, y: 110, r: 56, color: 0xC0432A },
    top: 0x4A2E2A, dirt: 0x2E1C1A, dust: 0x7A5A52, volcano: true, embers: true, ash: true,
    obstacles: ['lava', 'lava', 'rock']
  }
];

// ---------- Utilidades de color ----------
const _shadeCache = new Map();
function shade(c, amt) {
  const k = c * 1000 + amt;
  if (_shadeCache.has(k)) return _shadeCache.get(k);
  const col = Phaser.Display.Color.IntegerToColor(c);
  if (amt >= 0) col.brighten(amt); else col.darken(-amt);
  _shadeCache.set(k, col.color);
  return col.color;
}
function lerpColor(a, b, t) {
  const ca = Phaser.Display.Color.IntegerToColor(a), cb = Phaser.Display.Color.IntegerToColor(b);
  const r = Phaser.Display.Color.Interpolate.ColorWithColor(ca, cb, 100, t * 100);
  return Phaser.Display.Color.GetColor(r.r, r.g, r.b);
}
function hex(c) { return '#' + c.toString(16).padStart(6, '0'); }

// ---------- Texturas generadas por código ----------
function mkTex(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

function makeTextures(scene) {
  const mk = (k, w, h, d) => mkTex(scene, k, w, h, d);

  mk('hitbox', 40, 34, g => { g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 40, 34); });
  mk('groundbox', W * 2, 40, g => { g.fillStyle(0xffffff, 1); g.fillRect(0, 0, W * 2, 40); });

  mk('dust', 16, 16, g => {
    g.fillStyle(0xffffff, 0.35); g.fillCircle(8, 8, 8);
    g.fillStyle(0xffffff, 0.8); g.fillCircle(8, 8, 5);
  });

  mk('rock', 64, 48, g => {
    const P = (a) => a.map(([x, y]) => ({ x, y }));
    g.fillStyle(0x2b2b2e, 1); g.fillPoints(P([[0, 48], [10, 14], [34, 0], [50, 8], [64, 48]]), true);
    g.fillStyle(0x6f7176, 1); g.fillPoints(P([[3, 46], [12, 16], [34, 3], [49, 10], [61, 46]]), true);
    g.fillStyle(0x9a9ca1, 1); g.fillPoints(P([[12, 16], [34, 3], [38, 22], [22, 30]]), true);
    g.fillStyle(0x5a5c61, 1); g.fillPoints(P([[38, 22], [49, 10], [61, 46], [40, 46]]), true);
    g.fillStyle(0xb8bac0, 1); g.fillPoints(P([[20, 12], [34, 5], [31, 14]]), true);
  });

  mk('log', 76, 36, g => {
    g.fillStyle(0x3a2412, 1); g.fillRoundedRect(0, 2, 76, 34, 16);
    g.fillStyle(0x7A4B24, 1); g.fillRoundedRect(2, 4, 72, 30, 14);
    g.fillStyle(0x9a6232, 1); g.fillRoundedRect(4, 6, 60, 9, 5);
    g.lineStyle(2, 0x5a3418, 1);
    for (let i = 0; i < 5; i++) g.lineBetween(10 + i * 11, 10, 14 + i * 11, 30);
    g.fillStyle(0x3a2412, 1); g.fillCircle(60, 19, 15);
    g.fillStyle(0xC79A63, 1); g.fillCircle(60, 19, 13);
    g.lineStyle(1.5, 0x9a6b3a, 1); g.strokeCircle(60, 19, 9); g.strokeCircle(60, 19, 5);
    g.fillStyle(0x7A4B24, 1); g.fillCircle(60, 19, 2.5);
  });

  // Lata energizante: negra con verde neón y acabado metálico
  mk('can', 30, 46, g => {
    const P = (a) => a.map(([x, y]) => ({ x, y }));
    g.fillStyle(0x8BE04E, 0.22); g.fillEllipse(15, 23, 30, 46);           // halo
    g.fillStyle(0x050607, 1); g.fillRoundedRect(3, 5, 24, 40, 5);           // cuerpo
    g.fillStyle(0x15171a, 1); g.fillRoundedRect(5, 7, 20, 36, 4);
    g.fillStyle(0x3a3f45, 0.9); g.fillRoundedRect(7, 9, 3, 32, 1.5);        // reflejo izquierdo
    g.fillStyle(0xffffff, 0.12); g.fillRoundedRect(20, 9, 2, 32, 1);        // reflejo derecho
    g.fillStyle(0x8BE04E, 1);
    g.fillPoints(P([[16, 11], [11, 25], [15, 25], [12, 38], [20, 21], [16, 21], [19, 11]]), true);   // rayo
    g.fillStyle(0xDFFFB0, 1); g.fillPoints(P([[16, 11], [13, 19], [15, 19], [18, 11]]), true);
    g.lineStyle(1.5, 0x8BE04E, 1); g.lineBetween(7, 41, 23, 41); g.lineBetween(7, 8, 23, 8);     // franjas
    g.fillStyle(0xB9BEC6, 1); g.fillRoundedRect(6, 2, 18, 6, 2);            // tapa
    g.fillStyle(0x6e7378, 1); g.fillRect(12, 3, 6, 2);
    g.fillStyle(0x8BE04E, 1); g.fillCircle(21, 4, 1.5);                     // anillo
  });

  mk('cactus', 44, 70, g => {
    const dark = 0x2f6e3a, mid = 0x3F8F4A, light = 0x66B36A;
    const arm = (x, y, w, h) => {
      g.fillStyle(dark, 1); g.fillRoundedRect(x - 1, y - 1, w + 2, h + 2, 6);
      g.fillStyle(mid, 1); g.fillRoundedRect(x, y, w, h, 5);
      g.fillStyle(light, 1); g.fillRoundedRect(x + 2, y + 2, 3, h - 6, 2);
    };
    arm(16, 2, 13, 68);
    arm(2, 24, 9, 22); arm(3, 38, 16, 8);
    arm(33, 14, 9, 22); arm(24, 30, 16, 8);
    g.lineStyle(1, dark, 0.7); g.lineBetween(22, 6, 22, 66); g.lineBetween(26, 8, 26, 66);
    g.fillStyle(0xF06292, 1); g.fillCircle(22, 3, 3.5); g.fillStyle(0xFFF59D, 1); g.fillCircle(22, 3, 1.5);
  });

  mk('iceblock', 54, 50, g => {
    const P = (a) => a.map(([x, y]) => ({ x, y }));
    g.fillStyle(0x4f93b8, 1); g.fillPoints(P([[0, 50], [8, 14], [26, 0], [46, 10], [54, 50]]), true);
    g.fillStyle(0x9ED8F2, 1); g.fillPoints(P([[3, 48], [10, 17], [26, 4], [44, 13], [51, 48]]), true);
    g.fillStyle(0xE6F6FF, 1); g.fillPoints(P([[10, 17], [26, 4], [24, 30]]), true);
    g.fillStyle(0x7fc0e0, 1); g.fillPoints(P([[24, 30], [44, 13], [51, 48], [30, 48]]), true);
    g.lineStyle(2, 0xffffff, 0.9); g.lineBetween(14, 20, 24, 8);
  });

  mk('ice', 110, 12, g => {
    g.fillStyle(0x8FC9E8, 1); g.fillEllipse(55, 6, 110, 12);
    g.fillStyle(0xCDEBFA, 1); g.fillEllipse(55, 5, 100, 8);
    g.lineStyle(1.5, 0xffffff, 1); g.lineBetween(20, 5, 50, 4); g.lineBetween(60, 7, 90, 6);
  });

  mk('lava', 120, 36, g => {
    g.fillStyle(0xFF5A1F, 0.25); g.fillEllipse(60, 20, 120, 36);
    g.fillStyle(0xB32E0C, 1); g.fillEllipse(60, 22, 104, 22);
    g.fillStyle(0xFF5A1F, 1); g.fillEllipse(60, 21, 92, 16);
    g.fillStyle(0xFFC24A, 1); g.fillEllipse(56, 19, 56, 8);
    g.fillStyle(0xFFF0A0, 1); g.fillCircle(40, 18, 2.5); g.fillCircle(72, 20, 2);
  });

  mk('meteor', 34, 34, g => {
    g.fillStyle(0xFF8A3D, 0.35); g.fillCircle(17, 17, 17);
    g.fillStyle(0x3b2a26, 1); g.fillCircle(17, 17, 13);
    g.fillStyle(0x6b5552, 1); g.fillCircle(14, 14, 9);
    g.fillStyle(0xFF8A3D, 1); g.fillCircle(12, 12, 4);
  });

  mk('warn', 44, 40, g => {
    const P = (a) => a.map(([x, y]) => ({ x, y }));
    g.fillStyle(0x7a0f12, 1); g.fillPoints(P([[22, 0], [44, 40], [0, 40]]), true);
    g.fillStyle(0xE5383B, 1); g.fillPoints(P([[22, 5], [40, 37], [4, 37]]), true);
    g.fillStyle(0xffffff, 1); g.fillRect(20, 14, 4, 13); g.fillRect(20, 30, 4, 4);
  });

  mk('volcano', 420, 300, g => {
    const P = (a) => a.map(([x, y]) => ({ x, y }));
    g.fillStyle(0x3a2426, 1); g.fillPoints(P([[0, 300], [150, 40], [270, 40], [420, 300]]), true);
    g.fillStyle(0x4c3133, 1); g.fillPoints(P([[150, 40], [270, 40], [300, 120], [210, 300], [120, 300], [160, 110]]), true);
    g.fillStyle(0xFF5A1F, 1); g.fillPoints(P([[150, 40], [270, 40], [244, 58], [176, 58]]), true);
    g.fillStyle(0xFFC24A, 1); g.fillPoints(P([[204, 58], [216, 58], [230, 150], [222, 220], [206, 160]]), true);
    g.fillStyle(0xFF5A1F, 1); g.fillPoints(P([[180, 58], [190, 58], [170, 130], [160, 110]]), true);
  });

  mk('flag', 70, 160, g => {
    g.fillStyle(0x8e9196, 1); g.fillRect(6, 0, 7, 160);
    g.fillStyle(0xd8dadf, 1); g.fillRect(8, 0, 3, 160);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
      g.fillStyle((r + c) % 2 ? 0x141414 : 0xffffff, 1);
      g.fillRect(13 + c * 11, 4 + r * 11, 11, 11);
    }
  });

  mk('vignette', 64, 36, g => {
    for (let i = 0; i < 14; i++) {
      g.fillStyle(0x000000, 0.045);
      g.fillEllipse(32, 18, 64 - i * 1.4, 36 - i * 1.2);
    }
  });

  mk('streak', 60, 4, g => {
    g.fillStyle(0xffffff, 0.2); g.fillRoundedRect(0, 0, 60, 4, 2);
    g.fillStyle(0xffffff, 0.7); g.fillRoundedRect(20, 1, 40, 2, 1);
  });

  const speaker = (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRect(4, 11, 7, 10);
    g.fillPoints([{ x: 10, y: 11 }, { x: 18, y: 5 }, { x: 18, y: 27 }, { x: 10, y: 21 }], true);
  };
  mk('snd_on', 32, 32, g => {
    speaker(g);
    g.lineStyle(2.5, 0xffffff, 1);
    g.beginPath(); g.arc(18, 16, 6, -0.9, 0.9); g.strokePath();
    g.beginPath(); g.arc(18, 16, 11, -0.9, 0.9); g.strokePath();
  });
  mk('snd_off', 32, 32, g => {
    speaker(g);
    g.lineStyle(3, 0xff6b6b, 1); g.lineBetween(21, 11, 30, 21); g.lineBetween(30, 11, 21, 21);
  });

  mk('cloud', 160, 60, g => {
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(40, 40, 70, 34); g.fillEllipse(80, 30, 80, 46); g.fillEllipse(120, 42, 70, 32);
    g.fillEllipse(80, 44, 140, 28);
  });
}

// Fondos de cada nivel: cielo, montañas lejanas, colinas con árboles y suelo
function makeLevelTextures(scene, lvl, idx) {
  const SW = W + 700, SH = H + 500;
  mkTex(scene, 'sky' + idx, SW, SH, g => {
    const n = 48;
    for (let i = 0; i < n; i++) {
      g.fillStyle(lerpColor(lvl.skyTop, lvl.skyBot, i / (n - 1)), 1);
      g.fillRect(0, i * SH / n, SW, SH / n + 1);
    }
    if (lvl.ash) {
      g.fillStyle(0xffffff, 0.5);
      const rnd = new Phaser.Math.RandomDataGenerator(['stars']);
      for (let i = 0; i < 70; i++) g.fillCircle(rnd.between(0, SW), rnd.between(0, SH * 0.35), rnd.realInRange(0.6, 1.6));
    }
  });

  // Montañas lejanas (picos)
  mkTex(scene, 'far' + idx, W, 320, g => {
    const rnd = new Phaser.Math.RandomDataGenerator(['far' + idx]);
    const pts = [{ x: 0, y: 316 }];
    const peaks = [];
    let x = 0;
    while (x < W) {
      const nx = Math.min(W, x + rnd.between(90, 160));
      const px = (x + nx) / 2, py = rnd.between(40, 150);
      pts.push({ x: px, y: py }); peaks.push({ x: px, y: py, w: (nx - x) / 2 });
      pts.push({ x: nx, y: rnd.between(170, 230) });
      x = nx;
    }
    pts.push({ x: W, y: 316 });
    g.fillStyle(lvl.far, 1); g.fillPoints(pts, true);
    g.fillStyle(shade(lvl.far, -18), 1);
    peaks.forEach(p => g.fillPoints([{ x: p.x, y: p.y }, { x: p.x + p.w, y: p.y + 110 }, { x: p.x + p.w * 0.25, y: p.y + 130 }], true));
    if (lvl.snowCaps) {
      g.fillStyle(0xffffff, 0.95);
      peaks.forEach(p => g.fillPoints([{ x: p.x, y: p.y }, { x: p.x + p.w * 0.35, y: p.y + 34 }, { x: p.x + p.w * 0.15, y: p.y + 28 }, { x: p.x, y: p.y + 36 }, { x: p.x - p.w * 0.2, y: p.y + 26 }, { x: p.x - p.w * 0.35, y: p.y + 34 }], true));
    }
    if (lvl.decoType === 'cactus') {
      // mesas planas
      g.fillStyle(shade(lvl.far, -10), 1);
      [[80, 200], [420, 180], [760, 210]].forEach(([mx, my]) => g.fillPoints([{ x: mx - 70, y: 316 }, { x: mx - 40, y: my }, { x: mx + 40, y: my }, { x: mx + 70, y: 316 }], true));
    }
  });

  // Colinas cercanas con decoración
  mkTex(scene, 'mid' + idx, W, 260, g => {
    const rnd = new Phaser.Math.RandomDataGenerator(['mid' + idx]);
    const hy = x => 150 - 34 * Math.sin(2 * Math.PI * 2 * x / W) - 18 * Math.sin(2 * Math.PI * 5 * x / W + 1);
    const pts = [{ x: 0, y: 256 }];
    for (let x = 0; x <= W; x += 10) pts.push({ x, y: hy(x) });
    pts.push({ x: W, y: 256 });
    g.fillStyle(lvl.mid, 1); g.fillPoints(pts, true);
    g.fillStyle(shade(lvl.mid, -12), 1);
    const pts2 = [{ x: 0, y: 256 }];
    for (let x = 0; x <= W; x += 10) pts2.push({ x, y: hy(x) + 40 + 10 * Math.sin(x / 50) });
    pts2.push({ x: W, y: 256 });
    g.fillPoints(pts2, true);

    const deco = lvl.deco;
    for (let x = 20; x < W; x += rnd.between(40, 80)) {
      const by = hy(x) + 6, s = rnd.realInRange(0.7, 1.2);
      if (lvl.decoType === 'pine' || lvl.decoType === 'snowpine') {
        g.fillStyle(shade(deco, -20), 1); g.fillRect(x - 2 * s, by - 10 * s, 4 * s, 12 * s);
        for (let i = 0; i < 3; i++) {
          const w = (16 - i * 4) * s, t = by - (8 + i * 13) * s;
          g.fillStyle(deco, 1); g.fillTriangle(x - w, t, x + w, t, x, t - 20 * s);
          if (lvl.decoType === 'snowpine') { g.fillStyle(0xffffff, 1); g.fillTriangle(x - w * 0.5, t - 10 * s, x + w * 0.5, t - 10 * s, x, t - 20 * s); }
        }
      } else if (lvl.decoType === 'cactus') {
        g.fillStyle(deco, 1);
        g.fillRoundedRect(x - 4 * s, by - 34 * s, 8 * s, 36 * s, 3);
        g.fillRoundedRect(x - 12 * s, by - 24 * s, 6 * s, 14 * s, 3); g.fillRect(x - 12 * s, by - 14 * s, 10 * s, 4 * s);
        g.fillRoundedRect(x + 6 * s, by - 28 * s, 6 * s, 14 * s, 3); g.fillRect(x + 2 * s, by - 18 * s, 10 * s, 4 * s);
      } else {
        g.fillStyle(deco, 1);
        g.fillTriangle(x - 10 * s, by + 4, x + 10 * s, by + 4, x + rnd.between(-6, 6), by - 40 * s);
      }
    }
  });

  // Suelo (tile de 256 px)
  mkTex(scene, 'ground' + idx, 256, 260, g => {
    const rnd = new Phaser.Math.RandomDataGenerator(['ground' + idx]);
    const n = 20;
    for (let i = 0; i < n; i++) {
      g.fillStyle(lerpColor(lvl.dirt, shade(lvl.dirt, -40), i / (n - 1)), 1);
      g.fillRect(0, i * 260 / n, 256, 260 / n + 1);
    }
    g.fillStyle(shade(lvl.dirt, -25), 0.6);
    for (let i = 0; i < 26; i++) g.fillEllipse(rnd.between(0, 256), rnd.between(30, 240), rnd.between(4, 10), rnd.between(3, 6));
    g.fillStyle(shade(lvl.dirt, 15), 0.5);
    for (let i = 0; i < 14; i++) g.fillEllipse(rnd.between(0, 256), rnd.between(30, 240), rnd.between(3, 7), 2);
    // franja superior
    g.fillStyle(shade(lvl.top, -25), 1); g.fillRect(0, 0, 256, 18);
    g.fillStyle(lvl.top, 1); g.fillRect(0, 0, 256, 13);
    g.fillStyle(shade(lvl.top, 25), 1); g.fillRect(0, 0, 256, 4);
    if (lvl.decoType === 'pine') {
      g.lineStyle(2, shade(lvl.top, 30), 1);
      for (let x = 4; x < 256; x += rnd.between(8, 16)) g.lineBetween(x, 12, x + rnd.between(-3, 3), 2);
    }
    if (lvl.snow) {
      g.lineStyle(1.5, 0x9ec6dd, 0.8);
      for (let x = 10; x < 256; x += rnd.between(30, 60)) g.lineBetween(x, 14, x + rnd.between(10, 30), 60 + rnd.between(0, 30));
    }
    if (lvl.volcano) {
      g.lineStyle(2, 0xFF5A1F, 0.9);
      for (let x = 10; x < 256; x += rnd.between(40, 80)) { g.lineBetween(x, 18, x + 12, 44); g.lineBetween(x + 12, 44, x + 6, 70); }
    }
  });
}

// ============================================================
// La bici y el piloto: se dibujan cada cuadro con Graphics
// (así la suspensión, el pedaleo y las ruedas se animan de verdad)
// ============================================================
function ik(a, b, l1, l2, side) {
  let dx = b.x - a.x, dy = b.y - a.y;
  let d = Math.hypot(dx, dy);
  const maxD = l1 + l2 - 0.5;
  if (d > maxD) { dx *= maxD / d; dy *= maxD / d; d = maxD; }
  const cosA = Phaser.Math.Clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const t = Math.atan2(dy, dx) + side * Math.acos(cosA);
  return { jx: a.x + Math.cos(t) * l1, jy: a.y + Math.sin(t) * l1, ex: a.x + dx, ey: a.y + dy };
}

class BikeRig {
  constructor(scene, x, y, color) {
    this.scene = scene;
    this.color = color;
    this.g = scene.add.graphics();
    this.g.setPosition(x, y);
    this.shadow = scene.add.graphics();
    this.shadow.setPosition(x, y);
    this.wheelA = 0; this.crank = 0;
    this.sag = 0; this.sagV = 0;
    this.air = 0;
    this.height = 0;
    this.draw();
  }
  setColor(c) { this.color = c; this.draw(); }
  setDepth(d) { this.g.setDepth(d); this.shadow.setDepth(d - 1); }
  bump(v) { this.sagV += v; }

  update(dt, speed, onGround, height) {
    this.wheelA += speed * dt / 21;
    if (onGround) this.crank += speed * dt / 55;
    this.sagV += (-220 * this.sag - 14 * this.sagV) * dt;
    this.sag += this.sagV * dt;
    this.air += ((onGround ? 0 : 1) - this.air) * Math.min(1, dt * 9);
    this.height = height;
    this.draw();
  }

  tube(pts, w, col, hl) {
    const g = this.g;
    const pass = (lw, c, a, dy) => {
      g.lineStyle(lw, c, a);
      for (let i = 0; i < pts.length - 1; i++) g.lineBetween(pts[i].x, pts[i].y + dy, pts[i + 1].x, pts[i + 1].y + dy);
      g.fillStyle(c, a);
      pts.forEach(p => g.fillCircle(p.x, p.y + dy, lw / 2));
    };
    pass(w + 2.5, 0x14181f, 1, 0);
    pass(w, col, 1, 0);
    if (hl !== false) pass(Math.max(1, w * 0.3), shade(col, 45), 0.85, -w * 0.25);
  }

  wheel(cx, cy, r) {
    const g = this.g, a = this.wheelA;
    g.lineStyle(7, 0x1a1d22, 1); g.strokeCircle(cx, cy, r - 3.5);
    g.lineStyle(2, 0x3a3f47, 1);
    for (let i = 0; i < 18; i++) {
      const t = a + i * Math.PI * 2 / 18;
      g.lineBetween(cx + Math.cos(t) * (r - 1), cy + Math.sin(t) * (r - 1), cx + Math.cos(t) * (r - 5), cy + Math.sin(t) * (r - 5));
    }
    g.lineStyle(2.5, 0xd9dde3, 1); g.strokeCircle(cx, cy, r - 8);
    g.lineStyle(1, 0xb0b5bd, 0.9);
    for (let i = 0; i < 12; i++) {
      const t = a * 0.98 + i * Math.PI / 6;
      g.lineBetween(cx, cy, cx + Math.cos(t) * (r - 8), cy + Math.sin(t) * (r - 8));
    }
    g.lineStyle(1.5, 0x9aa0a8, 1); g.strokeCircle(cx, cy, 6.5);
    g.fillStyle(0x14181f, 1); g.fillCircle(cx, cy, 4);
    g.fillStyle(0xd9dde3, 1); g.fillCircle(cx, cy, 2);
  }

  draw() {
    const g = this.g, c = this.color, air = this.air, sag = this.sag;
    g.clear();
    const R = 21;
    const RW = { x: -32, y: -R }, FW = { x: 36, y: -R };
    const S = (x, y) => ({ x, y: y + sag });
    const BB = S(-4, -17), ST = S(-19, -57), HT = S(27, -55), HB = S(32, -42);
    const crankA = this.crank;
    const pedal = (ang) => ({ x: BB.x + Math.cos(ang) * 11, y: BB.y + Math.sin(ang) * 11 });
    const pNear = pedal(crankA), pFar = pedal(crankA + Math.PI);

    // Piloto: postura en el suelo vs. en el aire (se mezcla con "air")
    const mix = (a, b) => ({ x: a.x + (b.x - a.x) * air, y: a.y + (b.y - a.y) * air + sag });
    const HIP = mix({ x: -13, y: -62 }, { x: -22, y: -60 });
    const SH = mix({ x: 9, y: -90 }, { x: 2, y: -88 });
    const HEAD = mix({ x: 19, y: -98 }, { x: 12, y: -96 });
    const HAND = S(34, -63);
    const darkSuit = 0x23262e, suitFar = 0x15171c;
    const outline = 0x0e1014;
    const skin = 0xc9956b;

    // Pierna: muslo más grueso que la pantorrilla, rodillera y bota
    const leg = (pd, far) => {
      const k = ik(HIP, pd, 27, 27, -1);
      const col = far ? suitFar : darkSuit;
      const knee = { x: k.jx, y: k.jy }, foot = { x: k.ex, y: k.ey };
      this.tube([HIP, knee], 9.5, col, false);
      this.tube([knee, foot], 7, col, false);
      g.fillStyle(outline, 1); g.fillCircle(knee.x, knee.y, 5.2);
      g.fillStyle(far ? shade(c, -40) : c, 1); g.fillCircle(knee.x, knee.y, 4);            // rodillera
      g.fillStyle(outline, 1); g.fillRoundedRect(foot.x - 7, foot.y - 4, 15, 7, 3);         // bota
      g.fillStyle(far ? shade(c, -40) : c, 1); g.fillRoundedRect(foot.x - 5, foot.y - 3, 4, 2, 1);
    };

    // Brazo: hombro, antebrazo, codera y guante
    const arm = (far) => {
      const a = ik(SH, HAND, 19, 19, 1);
      const col = far ? suitFar : darkSuit;
      const elbow = { x: a.jx, y: a.jy }, hand = { x: a.ex, y: a.ey };
      this.tube([SH, elbow], 8, col, false);
      this.tube([elbow, hand], 6.5, col, false);
      g.fillStyle(outline, 1); g.fillCircle(elbow.x, elbow.y, 4.4);
      g.fillStyle(far ? shade(c, -40) : c, 1); g.fillCircle(elbow.x, elbow.y, 3.2);         // codera
      g.fillStyle(outline, 1); g.fillCircle(hand.x, hand.y + 1, 4.2);                       // guante
      g.fillStyle(far ? shade(c, -40) : c, 1); g.fillCircle(hand.x - 1, hand.y, 1.6);
    };

    // ---- Sombra en el piso ----
    const sh = this.shadow;
    sh.clear();
    const hs = Phaser.Math.Clamp(1 - this.height / 260, 0.35, 1);
    sh.fillStyle(0x000000, 0.22 * hs);
    sh.fillEllipse(2, 2, 92 * hs, 10 * hs);

    // ---- Pierna de atrás ----
    leg(pFar, true);

    // ---- Ruedas ----
    this.wheel(RW.x, RW.y, R);
    this.wheel(FW.x, FW.y, R);
    // disco de freno
    g.lineStyle(1.5, 0xb0b5bd, 0.9); g.strokeCircle(RW.x, RW.y, 9); g.strokeCircle(FW.x, FW.y, 9);

    // ---- Cuadro ----
    this.tube([RW, BB], 4, c);                                        // vaina
    this.tube([RW, S(-16, -50)], 3.5, c);                             // tirante
    this.tube([S(-25, -42), S(-13, -51)], 5, 0x9aa0a8);               // amortiguador trasero
    g.fillStyle(0x14181f, 1); g.fillCircle(-19 + 0, -46.5 + sag, 3.5);
    this.tube([BB, ST], 5, c);                                        // tubo del asiento
    this.tube([HB, BB], 6, c);                                        // tubo diagonal
    this.tube([ST, HT], 5, c);                                        // tubo superior
    this.tube([HT, HB], 7, 0x14181f, false);                          // tubo de dirección
    // Horquilla con suspensión
    this.tube([HB, S(34, -32)], 4, 0xd9dde3, false);                  // barra (stanchion)
    this.tube([S(34, -32), FW], 5.5, c);                              // botella
    g.fillStyle(0x14181f, 1); g.fillRoundedRect(HB.x - 5, HB.y - 2, 10, 5, 2);
    // Manubrio y tija
    this.tube([HT, S(34, -61)], 4, 0x14181f, false);
    this.tube([S(27, -62), S(43, -60)], 5, 0x14181f, false);
    g.fillStyle(0x3a3f47, 1); g.fillCircle(43, -60 + sag, 3);
    // Asiento
    this.tube([ST, S(-21, -63)], 3, 0x9aa0a8, false);
    g.fillStyle(0x14181f, 1); g.fillRoundedRect(-33, -68 + sag, 22, 6, 3);
    g.fillStyle(0x3a3f47, 1); g.fillRoundedRect(-31, -68 + sag, 12, 2, 1);
    // Cadena y platos
    g.lineStyle(1.5, 0x5a5f68, 1);
    g.lineBetween(BB.x, BB.y - 8, RW.x, RW.y - 4.5); g.lineBetween(BB.x, BB.y + 8, RW.x, RW.y + 4.5);
    g.lineStyle(2, 0x9aa0a8, 1); g.strokeCircle(RW.x, RW.y, 4.5);
    g.fillStyle(0x14181f, 1); g.fillCircle(BB.x, BB.y, 9);
    g.lineStyle(2.5, 0xb0b5bd, 1); g.strokeCircle(BB.x, BB.y, 7.5);
    // Bielas y pedales
    g.lineStyle(3.5, 0x2b2f36, 1);
    g.lineBetween(BB.x, BB.y, pFar.x, pFar.y); g.lineBetween(BB.x, BB.y, pNear.x, pNear.y);
    g.fillStyle(0x14181f, 1); g.fillCircle(BB.x, BB.y, 3);

    // ---- Piloto ----
    arm(true);                                                        // brazo de atrás
    const tdx = SH.x - HIP.x, tdy = SH.y - HIP.y, tl = Math.hypot(tdx, tdy);
    const nx = -tdy / tl, ny = tdx / tl;                              // perpendicular al torso
    // torso: polígono con hombros anchos
    const hipB = { x: HIP.x - nx * 5, y: HIP.y - ny * 5 }, hipF = { x: HIP.x + nx * 5, y: HIP.y + ny * 5 };
    const shB = { x: SH.x - nx * 7.5, y: SH.y - ny * 7.5 }, shF = { x: SH.x + nx * 7, y: SH.y + ny * 7 };
    g.lineStyle(3, outline, 1); g.strokePoints([hipB, hipF, shF, shB], true, true);
    g.fillStyle(darkSuit, 1); g.fillPoints([hipB, hipF, shF, shB], true);
    g.fillStyle(c, 1); g.fillPoints([hipF, shF, { x: shF.x - nx * 6, y: shF.y - ny * 6 }, { x: hipF.x - nx * 4, y: hipF.y - ny * 4 }], true);   // panel del jersey
    g.fillStyle(0xffffff, 0.9); g.fillPoints([{ x: shB.x + nx * 3, y: shB.y + ny * 3 }, { x: shB.x + nx * 7, y: shB.y + ny * 7 }, { x: shB.x + nx * 7 - tdx * 0.14, y: shB.y + ny * 7 - tdy * 0.14 }, { x: shB.x + nx * 3 - tdx * 0.14, y: shB.y + ny * 3 - tdy * 0.14 }], true); // franja blanca
    g.fillStyle(outline, 1); g.fillEllipse(HIP.x - 1, HIP.y + 1, 16, 10);               // short
    g.fillStyle(c, 1); g.fillEllipse(HIP.x - 1, HIP.y - 2, 13, 3);
    // pierna de adelante y brazo de adelante
    leg(pNear, false);
    arm(false);
    // cuello y protector cervical
    g.lineStyle(6, skin, 1); g.lineBetween(SH.x + 1, SH.y - 2, HEAD.x - 2, HEAD.y + 8);
    g.fillStyle(outline, 1); g.fillEllipse(SH.x + 1, SH.y - 3, 15, 7);
    g.fillStyle(0x2f333c, 1); g.fillEllipse(SH.x + 1, SH.y - 3.5, 12, 4.5);

    // ---- Casco integral de downhill (vista de perfil, mirando a la derecha) ----
    const hx = HEAD.x, hy = HEAD.y;
    const K = 0.8;                                                    // tamaño del casco
    const P = (a) => a.map(([x, y]) => ({ x: hx + x * K, y: hy + y * K }));
    // forma alargada: nuca redonda + mentonera que sale hacia adelante y abajo
    const shell = [[-12.5, 3], [-13, -3], [-10.5, -9.5], [-5, -13.8], [2, -15], [8.5, -13.6], [13, -9.5],
                   [15, -4.5], [15.5, 2], [19, 4.5], [21.5, 8.5], [20, 13], [15, 15.5], [5, 15.5], [-2.5, 13], [-8.5, 9]];
    g.fillStyle(c, 1); g.fillPoints(P(shell), true);                                    // concha
    g.fillStyle(shade(c, -32), 1);                                                      // sombra de la parte baja
    g.fillPoints(P([[-12.5, 3], [-8.5, 9], [-2.5, 13], [5, 15.5], [15, 15.5], [20, 13], [21.5, 8.5], [18, 11], [8, 12.5], [-1, 10], [-8, 5.5], [-12.8, 0]]), true);
    g.fillStyle(shade(c, 40), 0.85);                                                    // brillo en la parte alta
    g.fillPoints(P([[-8, -9.5], [-3, -12.8], [4, -13.6], [9, -12], [3, -11], [-4, -9.5]]), true);
    // gráfica: franja blanca que recorre el casco de atrás hacia la mentonera
    g.fillStyle(0xffffff, 0.95);
    g.fillPoints(P([[-12.6, -1], [-6, 1], [4, 4.5], [14, 6.5], [19.5, 7], [20.5, 9], [13, 9], [3, 7], [-6, 4], [-12.4, 2]]), true);
    // abertura de la cara (hueco oscuro)
    g.fillStyle(outline, 1); g.fillPoints(P([[7.5, -6.5], [15.3, -6], [16, 3], [14.5, 5.5], [9, 5], [6.5, 1]]), true);
    // piel: mejilla y nariz que asoman bajo los goggles
    g.fillStyle(skin, 1); g.fillPoints(P([[9, 0.5], [14.8, 0.5], [16.6, 2], [14.6, 4.3], [10, 4]]), true);
    g.fillStyle(shade(skin, -25), 1); g.fillCircle(hx + 10.5 * K, hy + 2.6 * K, 1);
    // ventilas de la mentonera
    g.fillStyle(outline, 1);
    [[15.5, 9.2], [17.6, 9.8]].forEach(([vx, vy]) => g.fillRoundedRect(hx + vx * K, hy + vy * K, 1.4, 3.2, 0.7));
    // correa de los goggles por fuera del casco
    g.fillStyle(outline, 1); g.fillPoints(P([[-13, -6.5], [8, -7.5], [8, -1.5], [-13, -1]]), true);
    g.fillStyle(0x8BE04E, 1); g.fillPoints(P([[-12.6, -5.5], [8, -6.6], [8, -2.6], [-12.6, -2]]), true);
    g.fillStyle(outline, 1); g.fillRect(hx - 6 * K, hy - 5.6 * K, 1.6, 2.4); g.fillRect(hx, hy - 5.9 * K, 1.6, 2.4);
    // goggles: marco y lente espejo naranja (pequeño, metido en la abertura)
    g.fillStyle(outline, 1); g.fillRoundedRect(hx + 7 * K, hy - 8 * K, 10.5 * K, 8.5 * K, 2);
    g.fillStyle(0x3a1d0a, 1); g.fillRoundedRect(hx + 8.6 * K, hy - 6.6 * K, 7.6 * K, 5.6 * K, 1.4);
    g.fillStyle(0xFF9A2E, 1); g.fillRoundedRect(hx + 8.6 * K, hy - 6.6 * K, 7.6 * K, 3 * K, 1.2);
    g.fillStyle(0xFFE08A, 1); g.fillRect(hx + 9.6 * K, hy - 5.8 * K, 2.4, 1);
    // visera larga hacia adelante
    g.fillStyle(outline, 1); g.fillPoints(P([[0, -15.8], [10, -15], [23.5, -12.2], [23, -9], [12, -10.4], [3, -12.5]]), true);
    g.fillStyle(shade(c, -15), 1); g.fillPoints(P([[1.5, -14.6], [10, -13.8], [22, -11.4], [21.8, -10], [12, -11.3], [3.5, -13]]), true);
    g.fillStyle(0xffffff, 0.9); g.fillPoints(P([[8, -13.6], [18, -11.8], [18, -11], [8, -12.6]]), true);
    g.fillStyle(0xb0b5bd, 1); g.fillCircle(hx + 4 * K, hy - 13.4 * K, 0.9);                     // tornillo de la visera
    g.lineStyle(2.2, outline, 1); g.strokePoints(P(shell), true, true);              // contorno del casco
  }
}


// ============================================================
// SONIDO: todo se genera con Web Audio (no hay archivos de audio)
// ============================================================
const SFX = {
  ctx: null, master: null, sfxBus: null, musicBus: null, noiseBuf: null,
  muted: false, track: null, timer: null, roll: null,

  // El navegador solo deja sonar audio después de un toque o tecla
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const comp = this.ctx.createDynamicsCompressor();
      comp.connect(this.ctx.destination);
      this.master = this.ctx.createGain(); this.master.connect(comp);
      this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value = 0.7; this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = 0.32; this.musicBus.connect(this.master);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      try { this.muted = localStorage.getItem('imtb-muted') === '1'; } catch (e) {}
      this.master.gain.value = this.muted ? 0 : 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.track && !this.timer) this._startScheduler();
  },
  ready() { return this.ctx && this.ctx.state === 'running'; },

  toggleMute() {
    this.unlock();
    if (!this.ctx) return false;
    this.muted = !this.muted;
    this.master.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx.currentTime, 0.02);
    try { localStorage.setItem('imtb-muted', this.muted ? '1' : '0'); } catch (e) {}
    return this.muted;
  },

  // ---- piezas básicas ----
  tone(f, dur, { type = 'square', vol = 0.2, to = null, at = 0, bus = null, attack = 0.005 } = {}) {
    if (!this.ready()) return;
    const t = this.ctx.currentTime + at;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || this.sfxBus);
    o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, { vol = 0.3, type = 'lowpass', f = 1200, to = null, q = 0.7, at = 0, bus = null } = {}) {
    if (!this.ready()) return;
    const t = this.ctx.currentTime + at;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const fl = this.ctx.createBiquadFilter(); fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f, t);
    if (to) fl.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(fl); fl.connect(g); g.connect(bus || this.sfxBus);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
  },

  // ---- efectos del juego ----
  jump()  { this.noise(0.22, { vol: 0.25, type: 'bandpass', f: 600, to: 2400, q: 1.2 }); this.tone(220, 0.14, { type: 'triangle', vol: 0.12, to: 440 }); },
  land()  { this.tone(120, 0.16, { type: 'sine', vol: 0.45, to: 50 }); this.noise(0.14, { vol: 0.3, f: 900, to: 200 }); this.tone(900, 0.05, { type: 'square', vol: 0.03, at: 0.02 }); },
  can()   { [988, 1319, 1976].forEach((f, i) => this.tone(f, 0.12, { type: 'square', vol: 0.09, at: i * 0.055 })); this.noise(0.06, { vol: 0.12, type: 'highpass', f: 5000 }); },
  hit()   { this.noise(0.35, { vol: 0.6, f: 1800, to: 120 }); this.tone(160, 0.3, { type: 'sawtooth', vol: 0.25, to: 45 }); this.tone(1400, 0.06, { type: 'square', vol: 0.08 }); },
  skid()  { this.noise(0.6, { vol: 0.22, type: 'bandpass', f: 3200, to: 1800, q: 4 }); },
  warn()  { this.tone(880, 0.09, { type: 'square', vol: 0.1 }); this.tone(880, 0.09, { type: 'square', vol: 0.1, at: 0.16 }); },
  boom()  { this.tone(90, 0.5, { type: 'sine', vol: 0.6, to: 30 }); this.noise(0.6, { vol: 0.5, f: 700, to: 60 }); },
  click() { this.tone(660, 0.05, { type: 'square', vol: 0.08 }); this.tone(990, 0.06, { type: 'square', vol: 0.06, at: 0.04 }); },
  star(i) { this.tone(784 * Math.pow(1.26, i), 0.25, { type: 'triangle', vol: 0.18 }); this.tone(1568 * Math.pow(1.26, i), 0.2, { type: 'sine', vol: 0.06 }); },
  win()   { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, i === 3 ? 0.6 : 0.16, { type: 'square', vol: 0.12, at: i * 0.12 })); this.tone(262, 0.8, { type: 'triangle', vol: 0.2, at: 0.36 }); },
  lose()  { [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.28, { type: 'sawtooth', vol: 0.1, at: i * 0.18 })); },

  // ---- sonido de rodar (llanta en tierra/hielo), continuo ----
  startRoll(icy) {
    this.stopRoll();
    if (!this.ready()) return;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const fl = this.ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.Q.value = 0.9; fl.frequency.value = icy ? 2400 : 500;
    const g = this.ctx.createGain(); g.gain.value = 0;
    src.connect(fl); fl.connect(g); g.connect(this.sfxBus); src.start();
    this.roll = { src, fl, g, icy };
  },
  setRoll(speed, onGround) {
    if (!this.roll && this.ready() && this._wantRoll !== undefined) this.startRoll(this._wantRoll);
    if (!this.roll) return;
    const t = this.ctx.currentTime;
    this.roll.g.gain.setTargetAtTime(onGround ? 0.04 + speed / 6000 : 0.004, t, 0.05);
    this.roll.fl.frequency.setTargetAtTime((this.roll.icy ? 1800 : 300) + speed * 1.2, t, 0.1);
  },
  stopRoll() {
    if (this.roll) { try { this.roll.src.stop(); } catch (e) {} this.roll = null; }
  },

  // ---- música: un loop distinto por nivel ----
  playMusic(name) {
    if (this.track === name) return;
    this.stopMusic();
    this.track = name;
    if (this.ready()) this._startScheduler();
  },
  stopMusic() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null; this.track = null;
  },
  _startScheduler() {
    const T = MUSIC[this.track];
    if (!T) return;
    this.step = 0;
    this.nextT = this.ctx.currentTime + 0.08;
    const s16 = 60 / T.bpm / 4;
    this.timer = setInterval(() => {
      if (!this.ready()) return;
      while (this.nextT < this.ctx.currentTime + 0.15) {
        this._playStep(T, this.step, this.nextT - this.ctx.currentTime);
        this.nextT += s16; this.step++;
      }
    }, 25);
  },
  _playStep(T, step, at) {
    const i = step % 16, bar = Math.floor(step / 16) % 4;
    const mb = this.musicBus;
    const note = (semi) => T.root * Math.pow(2, semi / 12);
    if (T.drums) {
      if (T.kick[i]) this.tone(150, 0.22, { type: 'sine', vol: 0.9, to: 40, at, bus: mb });
      if (T.snare[i]) { this.noise(0.16, { vol: 0.45, type: 'highpass', f: 1500, at, bus: mb }); this.tone(190, 0.08, { type: 'triangle', vol: 0.25, at, bus: mb }); }
      if (i % 2 === 1) this.noise(0.04, { vol: 0.18, type: 'highpass', f: 7000, at, bus: mb });
    }
    const b = T.bass[i];
    if (b !== null) this.tone(note(b + T.prog[bar]), 0.17, { type: 'sawtooth', vol: 0.22, at, bus: mb, attack: 0.01 });
    if (T.lead && bar % 2 === 1) {
      const l = T.lead[i];
      if (l !== null) this.tone(note(l + T.prog[bar] + 24), 0.12, { type: 'square', vol: 0.06, at, bus: mb });
    }
  }
};

// Canciones: raíz (Hz), tempo, progresión por compás y patrones de 16 pasos
const _ = null;
const MUSIC = {
  menu:     { root: 55,    bpm: 104, drums: false, prog: [0, 0, -4, -2],
              bass: [0, _, _, 12, _, _, 7, _, 0, _, _, 12, _, 10, 7, _], lead: [12, _, 15, _, 19, _, 15, _, 12, _, 10, _, 7, _, _, _] },
  montana:  { root: 55,    bpm: 132, drums: true,  prog: [0, 0, -4, -2],
              kick: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,1,0], snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
              bass: [0, _, 0, 12, _, 0, 10, _, 0, _, 0, 12, _, 10, 7, _], lead: [12, _, 15, 12, 17, _, 15, _, 12, _, 10, 12, _, 7, _, _] },
  desierto: { root: 73.4,  bpm: 122, drums: true,  prog: [0, 1, 0, -2],
              kick: [1,0,0,1, 0,0,1,0, 1,0,0,1, 0,0,1,0], snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1],
              bass: [0, _, 1, _, 0, _, 7, 8, 7, _, 1, _, 0, _, _, _], lead: [12, 13, 16, _, 17, 16, 13, _, 12, _, 13, _, 12, _, _, _] },
  hielo:    { root: 61.7,  bpm: 128, drums: true,  prog: [0, -4, -7, -5],
              kick: [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0], snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
              bass: [0, _, _, _, 12, _, 7, _, 0, _, _, _, 14, _, 12, _], lead: [19, _, 24, _, 22, _, 19, _, 17, _, 19, _, 15, _, _, _] },
  volcan:   { root: 49,    bpm: 150, drums: true,  prog: [0, 0, 1, -1],
              kick: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,1], snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,1,0],
              bass: [0, 0, 12, 0, 0, 13, 0, 12, 0, 0, 12, 0, 15, 13, 12, 10], lead: [12, _, 13, _, 12, _, 10, _, 12, _, 15, _, 13, _, 12, _] }
};
const LEVEL_TRACKS = ['montana', 'desierto', 'hielo', 'volcan'];

// Desbloquear el audio con el primer toque, clic o tecla
['pointerdown', 'touchstart', 'keydown'].forEach(ev =>
  window.addEventListener(ev, () => SFX.unlock(), { capture: true, passive: true }));

// ============================================================
// Escena 1: carga fuentes, genera texturas y pasa al menú
// ============================================================
class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    makeTextures(this);
    this.registry.set('bikeColor', BIKE_COLORS[0]);
    const go = () => { if (!this.started) { this.started = true; this.scene.start('Menu'); } };
    if (document.fonts && document.fonts.load) {
      Promise.all([document.fonts.load('20px "Russo One"'), document.fonts.load('20px Rubik')]).then(go, go);
      setTimeout(go, 1500);
    } else go();
  }
}

// Botón de sonido (esquina). Devuelve la zona que ocupa para no confundirlo con un salto.
function addMuteButton(scene, x, y) {
  const h = scene.hud.bind(scene);
  const bg = h(scene.add.circle(x, y, 22, 0x0b1220, 0.6).setStrokeStyle(1, 0xffffff, 0.3).setInteractive({ useHandCursor: true }));
  const icon = h(scene.add.image(x, y, SFX.muted ? 'snd_off' : 'snd_on').setScale(0.85));
  bg.on('pointerdown', () => { const m = SFX.toggleMute(); icon.setTexture(m ? 'snd_off' : 'snd_on'); });
  return new Phaser.Geom.Rectangle(x - 26, y - 26, 52, 52);
}

// Helpers de cámara: el mundo se ve inclinado (bajada), el HUD no
function setupCameras(scene) {
  const main = scene.cameras.main;
  main.setRotation(-SLOPE);
  scene.hudCam = scene.cameras.add(0, 0, W, H);
  scene.world = obj => { scene.hudCam.ignore(obj); return obj; };
  scene.hud = obj => { main.ignore(obj); return obj; };
}

function buildBackdrop(scene, lvl, idx) {
  makeLevelTextures(scene, lvl, idx);
  const w = scene.world.bind(scene);
  w(scene.add.image(W / 2, H / 2 - 40, 'sky' + idx));
  if (lvl.sun) {
    w(scene.add.circle(lvl.sun.x, lvl.sun.y, lvl.sun.r * 1.6, lvl.sun.color, 0.18));
    w(scene.add.circle(lvl.sun.x, lvl.sun.y, lvl.sun.r, lvl.sun.color));
  }
  const far = w(scene.add.tileSprite(-350, GROUND_Y + 18, W + 700, 320, 'far' + idx).setOrigin(0, 1));
  let volcano = null;
  if (lvl.volcano) volcano = w(scene.add.image(720, GROUND_Y + 16, 'volcano').setOrigin(0.5, 1));
  const mid = w(scene.add.tileSprite(-350, GROUND_Y + 18, W + 700, 260, 'mid' + idx).setOrigin(0, 1));
  const ground = w(scene.add.tileSprite(-350, GROUND_Y, W + 700, 260, 'ground' + idx).setOrigin(0, 0)).setDepth(1);
  const clouds = [];
  if (lvl.clouds) {
    for (let i = 0; i < 4; i++) {
      const cl = w(scene.add.image(i * 300 + 80, 60 + (i % 2) * 70, 'cloud')).setTint(lvl.clouds).setAlpha(0.85).setScale(0.8 + i * 0.1);
      clouds.push(cl);
    }
  }
  return { far, mid, ground, clouds, volcano };
}

function scrollBackdrop(bd, dx) {
  bd.far.tilePositionX += dx * 0.08;
  bd.mid.tilePositionX += dx * 0.28;
  bd.ground.tilePositionX += dx;
  if (bd.volcano) { bd.volcano.x -= dx * 0.08; if (bd.volcano.x < -300) bd.volcano.x = W + 500; }
  bd.clouds.forEach((c, i) => { c.x -= dx * (0.03 + i * 0.01) + 0.05; if (c.x < -150) c.x = W + 450; });
}

function ambientParticles(scene, lvl) {
  const w = scene.world.bind(scene);
  if (lvl.snow) w(scene.add.particles(0, 0, 'dust', {
    x: { min: -300, max: W + 300 }, y: -80, speedY: { min: 60, max: 110 }, speedX: { min: -70, max: -30 },
    lifespan: 7000, scale: { min: 0.25, max: 0.6 }, alpha: 0.9, frequency: 45, tint: 0xffffff
  })).setDepth(6);
  if (lvl.ash) w(scene.add.particles(0, 0, 'dust', {
    x: { min: -300, max: W + 300 }, y: -80, speedY: { min: 30, max: 70 }, speedX: { min: -60, max: -20 },
    lifespan: 9000, scale: { min: 0.2, max: 0.45 }, alpha: { start: 0.6, end: 0 }, frequency: 70, tint: 0x9a8a86
  })).setDepth(6);
  if (lvl.embers) w(scene.add.particles(0, 0, 'dust', {
    x: { min: -300, max: W + 300 }, y: GROUND_Y + 10, speedY: { min: -90, max: -30 }, speedX: { min: -40, max: 10 },
    lifespan: { min: 1500, max: 3000 }, scale: { start: 0.35, end: 0 }, alpha: { start: 1, end: 0 }, frequency: 90, tint: [0xFF5A1F, 0xFFC24A]
  })).setDepth(6);
}

// ============================================================
// Escena 2: menú con selector de color
// ============================================================
class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    setupCameras(this);
    this.bd = buildBackdrop(this, LEVELS[0], 0);
    this.world(this.add.rectangle(W / 2, H / 2, W * 2, H * 2, 0x0b1220, 0.35));

    this.rig = new BikeRig(this, 200, GROUND_Y + 2, this.registry.get('bikeColor'));
    this.world(this.rig.g); this.world(this.rig.shadow);
    this.rig.g.setScale(1.9); this.rig.shadow.setScale(1.9);
    this.rig.setDepth(5);
    this.dust = this.world(this.add.particles(0, 0, 'dust', {
      x: 200 - 60, y: GROUND_Y, speedX: { min: -140, max: -60 }, speedY: { min: -50, max: -5 },
      lifespan: { min: 300, max: 700 }, scale: { start: 1.1, end: 0.1 }, alpha: { start: 0.6, end: 0 }, frequency: 35, tint: LEVELS[0].dust
    })).setDepth(4);

    const h = this.hud.bind(this);
    h(this.add.text(W / 2 + 3, 72, 'INSTINTO MTB', { fontFamily: TITLE_FONT, fontSize: '70px', color: '#0b1220' }).setOrigin(0.5).setAlpha(0.6));
    h(this.add.text(W / 2, 68, 'INSTINTO MTB', { fontFamily: TITLE_FONT, fontSize: '70px', color: '#ffffff', stroke: '#0b1220', strokeThickness: 8 }).setOrigin(0.5));
    h(this.add.text(W / 2, 122, 'DESCENSO EXTREMO', { fontFamily: BODY_FONT, fontSize: '18px', fontStyle: '500', color: '#cfe6f5', letterSpacing: 6 }).setOrigin(0.5));

    // Panel derecho
    const px = 585, py = 165, pw = 350, ph = 350;
    h(this.add.rectangle(px, py, pw, ph, 0x0b1220, 0.62).setOrigin(0, 0).setStrokeStyle(1, 0xffffff, 0.18));
    h(this.add.text(px + pw / 2, py + 26, 'ELIGE TU BICI', { fontFamily: TITLE_FONT, fontSize: '20px', color: '#ffffff' }).setOrigin(0.5));
    this.rings = [];
    const startX = px + pw / 2 - (BIKE_COLORS.length - 1) * 27;
    BIKE_COLORS.forEach((c, i) => {
      const sx = startX + i * 54, sy = py + 72;
      h(this.add.circle(sx, sy + 2, 18, 0x000000, 0.4));
      const sw = h(this.add.circle(sx, sy, 17, c).setStrokeStyle(2, 0x0b1220).setInteractive({ useHandCursor: true }));
      h(this.add.ellipse(sx - 4, sy - 6, 9, 5, 0xffffff, 0.55));
      const ring = h(this.add.circle(sx, sy, 23).setStrokeStyle(3, 0xffffff).setVisible(false));
      this.rings.push(ring);
      sw.on('pointerdown', () => this.pick(i));
    });
    this.pick(Math.max(0, BIKE_COLORS.indexOf(this.registry.get('bikeColor'))));

    const play = h(this.add.text(px + pw / 2, py + 140, 'JUGAR', {
      fontFamily: TITLE_FONT, fontSize: '30px', color: '#0b1220', backgroundColor: '#8BE04E', padding: { x: 60, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
    play.on('pointerover', () => play.setStyle({ backgroundColor: '#a4ee6c' }));
    play.on('pointerout', () => play.setStyle({ backgroundColor: '#8BE04E' }));
    play.on('pointerdown', () => this.start(0));

    h(this.add.text(px + pw / 2, py + 196, 'IR DIRECTO A UN NIVEL', { fontFamily: BODY_FONT, fontSize: '13px', fontStyle: '500', color: '#9fb4c4', letterSpacing: 2 }).setOrigin(0.5));
    LEVELS.forEach((l, i) => {
      const bx = px + 18 + (i % 2) * 160, by = py + 218 + Math.floor(i / 2) * 54;
      const card = h(this.add.rectangle(bx, by, 148, 44, 0xffffff, 0.08).setOrigin(0, 0).setStrokeStyle(1, 0xffffff, 0.2).setInteractive({ useHandCursor: true }));
      h(this.add.rectangle(bx + 10, by + 10, 24, 24, l.skyTop).setOrigin(0, 0).setStrokeStyle(1, 0xffffff, 0.3));
      h(this.add.rectangle(bx + 10, by + 24, 24, 10, l.top).setOrigin(0, 0));
      h(this.add.text(bx + 44, by + 22, (i + 1) + '  ' + l.name, { fontFamily: BODY_FONT, fontSize: '17px', fontStyle: '500', color: '#ffffff' }).setOrigin(0, 0.5));
      card.on('pointerover', () => card.setFillStyle(0xffffff, 0.18));
      card.on('pointerout', () => card.setFillStyle(0xffffff, 0.08));
      card.on('pointerdown', () => this.start(i));
    });

    h(this.add.text(W / 2, H - 18, 'ESPACIO / TOQUE: SALTAR      ←  FRENAR      →  ACELERAR', {
      fontFamily: BODY_FONT, fontSize: '13px', fontStyle: '500', color: '#cfe6f5', letterSpacing: 2
    }).setOrigin(0.5));

    h(this.add.image(W / 2, H / 2, 'vignette').setDisplaySize(W * 1.6, H * 1.6).setAlpha(0.8)).setDepth(-1);

    // Botón de pantalla completa
    const fsBg = h(this.add.circle(36, 36, 22, 0x0b1220, 0.6).setStrokeStyle(1, 0xffffff, 0.3).setInteractive({ useHandCursor: true }));
    h(this.add.text(36, 36, '⛶', { fontFamily: BODY_FONT, fontSize: '22px', color: '#ffffff' }).setOrigin(0.5));
    fsBg.on('pointerdown', (p, lx, ly, ev) => {
      if (ev && ev.stopPropagation) ev.stopPropagation();
      if (this.scale.isFullscreen) this.scale.stopFullscreen(); else this.scale.startFullscreen();
    });

    addMuteButton(this, 88, 36);
    SFX.playMusic('menu');

    this.input.keyboard.on('keydown-SPACE', () => this.start(0));
    this.input.keyboard.on('keydown-ENTER', () => this.start(0));
  }

  pick(i) {
    SFX.click();
    this.registry.set('bikeColor', BIKE_COLORS[i]);
    this.rig.setColor(BIKE_COLORS[i]);
    this.rings.forEach((r, k) => r.setVisible(k === i));
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    scrollBackdrop(this.bd, 240 * dt);
    this.rig.update(dt, 240, true, 0);
  }

  start(level) {
    SFX.click();
    this.registry.set('level', level);
    this.scene.start('Game');
  }
}

// ============================================================
// Escena 3: el juego
// ============================================================
class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    const idx = this.registry.get('level') || 0;
    this.idx = idx;
    this.lvl = LEVELS[idx];
    const lvl = this.lvl;

    setupCameras(this);
    this.bd = buildBackdrop(this, lvl, idx);
    ambientParticles(this, lvl);

    // Suelo físico invisible
    const gb = this.physics.add.staticImage(W / 2, GROUND_Y + 20, 'groundbox').setVisible(false);

    // Cuerpo físico de la bici (invisible) + dibujo
    this.hitbox = this.physics.add.sprite(PLAYER_X, GROUND_Y - 17, 'hitbox').setVisible(false);
    this.hitbox.body.setGravityY(TUNING.gravity);
    this.physics.add.collider(this.hitbox, gb);
    this.rig = new BikeRig(this, PLAYER_X, GROUND_Y + 2, this.registry.get('bikeColor'));
    this.world(this.rig.g); this.world(this.rig.shadow);
    this.rig.setDepth(5);
    this.wasGround = true;

    this.dust = this.world(this.add.particles(0, 0, 'dust', {
      x: PLAYER_X - 34, y: GROUND_Y, speedX: { min: -160, max: -60 }, speedY: { min: -60, max: -5 },
      lifespan: { min: 300, max: 700 }, scale: { start: 1, end: 0.1 }, alpha: { start: 0.55, end: 0 }, frequency: 40, tint: lvl.dust
    })).setDepth(4);

    this.obstacles = this.physics.add.group({ allowGravity: false, immovable: true });
    this.cans = this.physics.add.group({ allowGravity: false });
    this.patches = this.physics.add.group({ allowGravity: false, immovable: true });
    this.physics.add.overlap(this.hitbox, this.obstacles, this.onHit, null, this);
    this.physics.add.overlap(this.hitbox, this.cans, this.onCan, null, this);
    this.physics.add.overlap(this.hitbox, this.patches, () => { if (this.skid <= 0) SFX.skid(); this.skid = 1.2; }, null, this);

    // Estado
    this.skid = 0;
    this.markers = [];
    this.meteorTimer = 3;
    this.distance = 0;
    this.speed = lvl.baseSpeed;
    this.energy = 100;
    this.canCount = 0;
    this.invuln = 0;
    this.slow = 0;
    this.state = 'play';
    this.layout = this.buildLayout();
    this.nextItem = 0;

    // Controles
    const kb = this.input.keyboard;
    this.cursors = kb.createCursorKeys();
    const jumpKeys = [kb.addKey('SPACE'), kb.addKey('UP'), kb.addKey('W')];
    jumpKeys.forEach(k => {
      k.on('down', () => this.handleInput());
      k.on('up', () => { if (this.hitbox.body.velocity.y < -200) this.hitbox.body.setVelocityY(-200); });
    });
    this.touch = { brake: false, boost: false };
    this.input.on('pointerdown', (p) => { if (!this.onTouchButton(p)) this.handleInput(); });
    this.input.on('pointerup', () => { if (this.hitbox.body.velocity.y < -200) this.hitbox.body.setVelocityY(-200); });

    this.createHud();
    this.createTouchControls();

    SFX.playMusic(LEVEL_TRACKS[idx]);
    SFX._wantRoll = !!lvl.slip;
    SFX.startRoll(!!lvl.slip);
    this.events.once('shutdown', () => { SFX.stopRoll(); SFX._wantRoll = undefined; });
  }

  onTouchButton(p) {
    return this.touchZones && this.touchZones.some(z => Phaser.Geom.Rectangle.Contains(z, p.x, p.y));
  }

  // Botones en pantalla (solo en dispositivos táctiles)
  createTouchControls() {
    this.touchZones = [addMuteButton(this, W / 2, 40)];
    if (!this.sys.game.device.input.touch) return;
    const h = this.hud.bind(this);
    const mk = (x, label, key) => {
      const zone = new Phaser.Geom.Rectangle(x - 60, H - 150, 120, 120);
      this.touchZones.push(zone);
      const bg = h(this.add.circle(x, H - 90, 42, 0x0b1220, 0.45).setStrokeStyle(2, 0xffffff, 0.35).setInteractive({ useHandCursor: true }));
      h(this.add.text(x, H - 90, label, { fontFamily: TITLE_FONT, fontSize: '30px', color: '#ffffff' }).setOrigin(0.5).setAlpha(0.9));
      const on = () => { this.touch[key] = true; bg.setFillStyle(0xffffff, 0.35); };
      const off = () => { this.touch[key] = false; bg.setFillStyle(0x0b1220, 0.45); };
      bg.on('pointerdown', on); bg.on('pointerup', off); bg.on('pointerout', off);
    };
    mk(80, '◀', 'brake');
    mk(190, '▶', 'boost');
    h(this.add.text(W - 24, H - 84, 'TOCA PARA SALTAR', { fontFamily: BODY_FONT, fontSize: '13px', fontStyle: '500', color: '#ffffff', letterSpacing: 2 }).setOrigin(1, 0.5).setAlpha(0.6));
  }

  // ---- Generación del recorrido ----
  buildLayout() {
    const lvl = this.lvl;
    const rnd = new Phaser.Math.RandomDataGenerator(['instinto-mtb']);
    const items = [];
    let d = 900;
    while (d < lvl.length - 700) {
      items.push({ at: d, type: rnd.pick(lvl.obstacles) });
      if (rnd.frac() < 0.55) {
        [85, 125, 85].forEach((h, i) => items.push({ at: d - 60 + i * 60, type: 'can', h }));
      } else if (rnd.frac() < 0.5) {
        items.push({ at: d + 260, type: 'can', h: 22 });
      }
      d += rnd.between(420, 700);
    }
    items.push({ at: lvl.length, type: 'finish' });
    items.sort((a, b) => a.at - b.at);
    return items;
  }

  spawn(item) {
    const x = PLAYER_X + (item.at - this.distance);
    if (item.type === 'can') {
      const c = this.world(this.cans.create(x, GROUND_Y - item.h, 'can')).setDepth(3);
      c.body.setAllowGravity(false);
      c.body.setSize(22, 38);
      c.body.setOffset(4, 5);
      c.setData('baseY', c.y);
      c.setData('phase', Math.random() * 6.28);
    } else if (item.type === 'finish') {
      this.finishFlag = this.world(this.add.image(x, GROUND_Y, 'flag').setOrigin(0.2, 1).setDepth(2));
    } else if (item.type === 'ice') {
      const p = this.world(this.patches.create(x, GROUND_Y + 2, 'ice').setOrigin(0.5, 1)).setDepth(2);
      p.body.setAllowGravity(false);
      p.body.setSize(p.width * 0.9, 8);
      p.body.setOffset(p.width * 0.05, p.height - 8);
    } else {
      const o = this.world(this.obstacles.create(x, GROUND_Y + (item.type === 'lava' ? 6 : 2), item.type).setOrigin(0.5, 1)).setDepth(3);
      this.fitBody(o);
    }
  }

  fitBody(o) {
    const bw = o.width * 0.7, bh = o.height * 0.75;
    o.body.setAllowGravity(false);
    o.body.setSize(bw, bh);
    o.body.setOffset((o.width - bw) / 2, o.height - bh);
  }

  // ---- Volcán: aviso en el piso y roca que cae ----
  spawnMeteorWarning() {
    const x = PLAYER_X + 90 + this.speed * 1.55 + Phaser.Math.Between(0, 160);
    if (x > W + 40) return;
    const marker = this.world(this.add.image(x, GROUND_Y - 22, 'warn').setDepth(4));
    this.tweens.add({ targets: marker, alpha: 0.35, duration: 180, yoyo: true, repeat: -1 });
    this.markers.push(marker);
    SFX.warn();
    this.time.delayedCall(800, () => {
      if (this.state !== 'play' || !marker.active) return;
      const m = this.world(this.obstacles.create(marker.x, -60, 'meteor')).setDepth(3);
      m.body.setAllowGravity(false);
      m.setData('meteor', true);
      m.setData('marker', marker);
    });
  }

  landMeteor(m) {
    const marker = m.getData('marker');
    if (marker) { this.markers = this.markers.filter(k => k !== marker); marker.destroy(); }
    m.setData('meteor', false);
    m.setTexture('rock').setOrigin(0.5, 1);
    m.y = GROUND_Y + 2;
    this.fitBody(m);
    m.body.setVelocityY(0);
    this.cameras.main.shake(100, 0.006);
    this.burst(m.x, GROUND_Y, 10, 0xFF8A3D);
    SFX.boom();
  }

  burst(x, y, n, tint) {
    const p = this.world(this.add.particles(x, y, 'dust', {
      speed: { min: 60, max: 180 }, angle: { min: 200, max: 340 }, lifespan: { min: 300, max: 600 },
      scale: { start: 0.9, end: 0 }, alpha: { start: 0.8, end: 0 }, gravityY: 500, tint, emitting: false
    })).setDepth(6);
    p.explode(n);
    this.time.delayedCall(900, () => p.destroy());
  }

  // ---- Controles ----
  handleInput() {
    if (this.state === 'play') {
      if (this.hitbox.body.touching.down) {
        this.hitbox.body.setVelocityY(-TUNING.jumpSpeed);
        SFX.jump();
        this.rig.bump(-60);
        this.burst(PLAYER_X - 30, GROUND_Y, 6, this.lvl.dust);
      }
    } else if (this.time.now - this.endTime > 500) {
      if (this.state === 'win') {
        if (this.idx < LEVELS.length - 1) {
          this.registry.set('level', this.idx + 1);
          this.scene.restart();
        } else {
          this.scene.start('Menu');
        }
      } else {
        this.scene.restart();
      }
    }
  }

  // ---- Colisiones ----
  onHit(hb, obs) {
    if (this.state !== 'play' || this.invuln > 0 || obs.getData('hit')) return;
    obs.setData('hit', true);
    obs.setAlpha(0.5);
    SFX.hit();
    this.energy -= TUNING.hitDamage;
    this.invuln = TUNING.invulnSeconds;
    this.slow = 1;
    this.rig.bump(90);
    this.cameras.main.shake(160, 0.012);
    this.flash.setAlpha(0.45);
    this.tweens.add({ targets: this.flash, alpha: 0, duration: 350 });
    this.burst(PLAYER_X + 10, GROUND_Y - 20, 10, 0xE5383B);
  }

  onCan(hb, can) {
    if (this.state !== 'play') return;
    const pop = this.world(this.add.text(can.x, can.y - 14, '+' + TUNING.canEnergy, {
      fontFamily: TITLE_FONT, fontSize: '24px', color: '#DFFFB0', stroke: '#1b3d0f', strokeThickness: 5
    }).setOrigin(0.5).setDepth(10));
    this.tweens.add({ targets: pop, y: pop.y - 44, alpha: 0, duration: 650, onComplete: () => pop.destroy() });
    this.burst(can.x, can.y, 8, 0x8BE04E);
    SFX.can();
    can.destroy();
    this.canCount += 1;
    this.energy = Math.min(100, this.energy + TUNING.canEnergy);
    this.tweens.add({ targets: this.canIcon, scale: 1.4, duration: 90, yoyo: true });
  }

  // ---- HUD ----
  createHud() {
    const h = this.hud.bind(this);
    const style = { fontFamily: BODY_FONT, fontSize: '14px', fontStyle: '500', color: '#ffffff', letterSpacing: 1 };

    h(this.add.rectangle(16, 16, 310, 58, 0x0b1220, 0.6).setOrigin(0, 0).setStrokeStyle(1, 0xffffff, 0.18));
    this.canIcon = h(this.add.image(38, 45, 'can').setScale(0.75));
    h(this.add.text(58, 24, 'ENERGÍA', style));
    h(this.add.rectangle(58, 44, 220, 16, 0x000000, 0.45).setOrigin(0, 0));
    this.energyBar = h(this.add.rectangle(59, 45, 218, 14, 0x8BE04E).setOrigin(0, 0));
    this.energyGloss = h(this.add.rectangle(59, 45, 218, 5, 0xffffff, 0.3).setOrigin(0, 0));
    this.energyText = h(this.add.text(286, 52, '100%', { fontFamily: TITLE_FONT, fontSize: '15px', color: '#ffffff' }).setOrigin(0, 0.5));

    h(this.add.rectangle(W - 16, 16, 230, 58, 0x0b1220, 0.6).setOrigin(1, 0).setStrokeStyle(1, 0xffffff, 0.18));
    h(this.add.text(W - 30, 26, 'NIVEL ' + (this.idx + 1) + '  ·  ' + this.lvl.name.toUpperCase(), { fontFamily: TITLE_FONT, fontSize: '16px', color: '#ffffff' }).setOrigin(1, 0));
    this.canText = h(this.add.text(W - 30, 48, 'Latas: 0', style).setOrigin(1, 0));

    // Barra de progreso
    h(this.add.rectangle(W / 2, H - 20, 620, 10, 0x0b1220, 0.6).setStrokeStyle(1, 0xffffff, 0.2));
    this.progressFill = h(this.add.rectangle(W / 2 - 308, H - 20, 0, 6, this.registry.get('bikeColor')).setOrigin(0, 0.5));
    h(this.add.image(W / 2 + 312, H - 26, 'flag').setScale(0.22).setOrigin(0.2, 1));
    this.progressDot = h(this.add.circle(W / 2 - 308, H - 20, 8, this.registry.get('bikeColor')).setStrokeStyle(2, 0x0b1220));

    // Flash rojo al chocar
    this.flash = h(this.add.rectangle(W / 2, H / 2, W, H, 0xE5383B, 1).setAlpha(0));
    // Viñeta (oscurece bordes) y líneas de velocidad
    this.vignette = h(this.add.image(W / 2, H / 2, 'vignette').setDisplaySize(W * 1.6, H * 1.6).setAlpha(0.9)).setDepth(-1);
    this.streaks = h(this.add.particles(0, 0, 'streak', {
      x: W + 40, y: { min: 20, max: H - 60 }, speedX: { min: -1400, max: -900 }, lifespan: 900,
      scaleX: { min: 1, max: 2.2 }, alpha: { start: 0.5, end: 0 }, frequency: 60, emitting: false
    }));

    // Mensaje de la regla del nivel
    const hintBg = h(this.add.rectangle(W / 2, 108, 720, 54, 0x0b1220, 0.7).setStrokeStyle(1, 0xffffff, 0.2));
    const hint = h(this.add.text(W / 2, 108, this.lvl.hint, {
      fontFamily: BODY_FONT, fontSize: '20px', fontStyle: '500', color: '#ffffff', align: 'center', wordWrap: { width: 690 }
    }).setOrigin(0.5));
    this.tweens.add({ targets: [hint, hintBg], alpha: 0, delay: 3000, duration: 800, onComplete: () => { hint.destroy(); hintBg.destroy(); } });
  }

  updateHud() {
    const e = Phaser.Math.Clamp(this.energy, 0, 100);
    this.energyBar.setSize(218 * e / 100, 14);
    this.energyGloss.setSize(218 * e / 100, 5);
    this.energyBar.setFillStyle(e < 25 ? 0xE5383B : e < 50 ? 0xF2C94C : 0x8BE04E);
    this.energyText.setText(Math.round(e) + '%');
    this.canText.setText('Latas: ' + this.canCount);
    const t = Phaser.Math.Clamp(this.distance / this.lvl.length, 0, 1);
    this.progressDot.x = W / 2 - 308 + 616 * t;
    this.progressFill.setSize(616 * t, 6);
  }

  // ---- Fin de nivel ----
  end(win) {
    if (this.state !== 'play') return;
    this.state = win ? 'win' : 'lose';
    this.endTime = this.time.now;
    SFX.stopMusic(); SFX.stopRoll(); SFX._wantRoll = undefined;
    if (win) SFX.win(); else SFX.lose();
    this.obstacles.setVelocityX(0);
    this.cans.setVelocityX(0);
    this.patches.setVelocityX(0);
    this.dust.emitting = false;
    const h = this.hud.bind(this);
    h(this.add.rectangle(W / 2, H / 2, W, H, 0x0b1220, 0.6));
    const last = this.idx >= LEVELS.length - 1;
    const title = win ? (last ? '¡JUEGO COMPLETADO!' : '¡META!') : 'SIN ENERGÍA';
    const panel = h(this.add.rectangle(W / 2, H / 2 + 10, 560, 270, 0x0b1220, 0.75).setStrokeStyle(1, 0xffffff, 0.2));
    const t1 = h(this.add.text(W / 2, H / 2 - 40, title, {
      fontFamily: TITLE_FONT, fontSize: win && last ? '48px' : '64px', color: win ? '#8BE04E' : '#ff6b6b', stroke: '#0b1220', strokeThickness: 6
    }).setOrigin(0.5));
    h(this.add.text(W / 2, H / 2 + 26, win ? 'Latas recogidas: ' + this.canCount : 'Llegaste al ' + Math.floor(100 * this.distance / this.lvl.length) + '% del recorrido', {
      fontFamily: BODY_FONT, fontSize: '22px', fontStyle: '500', color: '#ffffff'
    }).setOrigin(0.5));
    if (win) {
      const stars = this.energy >= 60 ? 3 : this.energy >= 30 ? 2 : 1;
      for (let i = 0; i < 3; i++) {
        const st = h(this.add.star(W / 2 - 60 + i * 60, H / 2 - 100, 5, 9, 20, i < stars ? 0xFFC24A : 0x2a3340).setStrokeStyle(2, 0x0b1220));
        st.setScale(0); this.tweens.add({ targets: st, scale: 1, delay: 700 + i * 180, duration: 300, ease: 'Back.Out' });
        if (i < stars) this.time.delayedCall(700 + i * 180, () => SFX.star(i));
      }
    }
    const next = win ? (last ? 'Espacio o toque para volver al menú' : 'Espacio o toque para el siguiente nivel') : 'Espacio o toque para reintentar';
    h(this.add.text(W / 2, H / 2 + 74, next.toUpperCase(), { fontFamily: BODY_FONT, fontSize: '14px', fontStyle: '500', color: '#9fb4c4', letterSpacing: 2 }).setOrigin(0.5));
    panel.setScale(0.9); t1.setScale(0.9);
    this.tweens.add({ targets: [panel, t1], scale: 1, duration: 250, ease: 'Back.Out' });
  }

  // ---- Bucle principal ----
  update(time, delta) {
    if (this.state !== 'play') return;
    const dt = Math.min(delta, 50) / 1000;
    const lvl = this.lvl;

    const t = Phaser.Math.Clamp(this.distance / lvl.length, 0, 1);
    let target = lvl.baseSpeed + (lvl.maxSpeed - lvl.baseSpeed) * t;
    if (this.skid <= 0) {
      if (this.cursors.left.isDown || this.touch.brake) target *= 0.7;
      if (this.cursors.right.isDown || this.touch.boost) target *= 1.15;
    } else {
      target *= 1.25;
    }
    target *= 1 - 0.5 * this.slow;
    this.speed += (target - this.speed) * Math.min(1, dt * (lvl.slip || 6));
    this.slow = Math.max(0, this.slow - dt * 1.2);
    this.skid = Math.max(0, this.skid - dt);

    this.distance += this.speed * dt;
    this.energy -= lvl.drain * dt;
    this.invuln = Math.max(0, this.invuln - dt);

    if (lvl.meteors && this.distance > 1500) {
      this.meteorTimer -= dt;
      if (this.meteorTimer <= 0) {
        this.spawnMeteorWarning();
        this.meteorTimer = Phaser.Math.FloatBetween(3.2, 4.6);
      }
    }

    scrollBackdrop(this.bd, this.speed * dt);

    while (this.nextItem < this.layout.length &&
           this.layout[this.nextItem].at - this.distance < W - PLAYER_X + 260) {
      this.spawn(this.layout[this.nextItem]);
      this.nextItem++;
    }

    const move = grp => grp.getChildren().slice().forEach(o => {
      o.body.setVelocityX(-this.speed);
      if (o.getData('meteor')) {
        o.body.setVelocityY(700);
        o.rotation += dt * 6;
        if (o.y >= GROUND_Y - 6) { o.rotation = 0; this.landMeteor(o); }
      }
      if (o.getData('baseY') !== undefined) o.y = o.getData('baseY') + Math.sin(time / 300 + o.getData('phase')) * 4;
      if (o.x < -220) o.destroy();
    });
    move(this.obstacles);
    move(this.cans);
    move(this.patches);
    this.markers = this.markers.filter(k => {
      k.x -= this.speed * dt;
      if (k.x < -60) { k.destroy(); return false; }
      return true;
    });
    if (this.finishFlag) this.finishFlag.x -= this.speed * dt;

    // Bici: sigue al cuerpo físico, se inclina en el aire, suspensión al aterrizar
    const onGround = this.hitbox.body.touching.down;
    const vy = this.hitbox.body.velocity.y;
    const height = (GROUND_Y - 17) - this.hitbox.y;
    this.rig.g.setPosition(PLAYER_X, this.hitbox.y + 19);
    this.rig.g.setRotation(onGround ? 0 : Phaser.Math.Clamp(vy * 0.00045, -0.32, 0.28));
    if (onGround && !this.wasGround) { this.rig.bump(70); SFX.land(); this.burst(PLAYER_X - 10, GROUND_Y, 8, lvl.dust); }
    this.wasGround = onGround;
    this.rig.update(dt, this.speed, onGround, height);
    this.rig.g.setAlpha(this.invuln > 0 && Math.floor(time / 80) % 2 ? 0.35 : 1);
    this.dust.emitting = onGround;
    this.dust.frequency = this.speed > 340 ? 25 : 40;
    SFX.setRoll(this.speed, onGround);
    this.streaks.emitting = this.speed > 345 || (!onGround && height > 60);
    this.cameras.main.scrollY += ((-height * 0.25) - this.cameras.main.scrollY) * Math.min(1, dt * 6);

    this.updateHud();

    if (this.distance >= lvl.length) this.end(true);
    else if (this.energy <= 0) this.end(false);
  }
}

// ============================================================
// Configuración del juego
// ============================================================
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#0b0f14',
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 3 },
  scene: [BootScene, MenuScene, GameScene]
});
