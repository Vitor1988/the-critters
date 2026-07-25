'use strict';

function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0; }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const B36 = '0123456789abcdefghijklmnopqrstuvwxyz';

const PALETTES = [
  { name: 'paper', mono: true,  bg: '#fdfcf8', face: ['#fdfcf8'], line: '#16130f', ear: '#fdfcf8', eye: '#fdfcf8', pupil: '#16130f', nose: '#fdfcf8', horn: '#fdfcf8', mouth: '#9a968f', teeth: '#fdfcf8' },
  { name: 'melon',  bg: '#fff3e4', face: ['#ffd9c0', '#ffe9d6', '#ffcdb2'], line: '#59362b', ear: '#e88ca0', eye: '#fff8ec', pupil: '#59362b', nose: '#e88ca0', horn: '#7fb069', mouth: '#d1603d', teeth: '#fff8ec' },
  { name: 'lagoon', bg: '#d8f3ee', face: ['#a7e8e0', '#c8f1ec'], line: '#14424c', ear: '#f4a259', eye: '#fdfdf4', pupil: '#14424c', nose: '#f4a259', horn: '#ee6c4d', mouth: '#ee6c4d', teeth: '#fdfdf4' },
  { name: 'grape',  bg: '#efe7fb', face: ['#d9c8f5', '#e4d8f9'], line: '#3d2c5a', ear: '#8f6fc9', eye: '#fdfaff', pupil: '#3d2c5a', nose: '#8f6fc9', horn: '#ffd23f', mouth: '#c95d8e', teeth: '#fdfaff' },
  { name: 'moss',   bg: '#eef2e2', face: ['#cfe0b5', '#ddeac9'], line: '#2e3b24', ear: '#8a9b6e', eye: '#fbfdf4', pupil: '#2e3b24', nose: '#8a9b6e', horn: '#e07a5f', mouth: '#b5654d', teeth: '#fbfdf4' },
  { name: 'ember',  bg: '#2b2d42', face: ['#ef8354', '#f4a261'], line: '#1a1b2e', ear: '#e63946', eye: '#fff3e4', pupil: '#1a1b2e', nose: '#e63946', horn: '#ffd23f', mouth: '#ffd23f', teeth: '#fff3e4' },
  { name: 'candy',  bg: '#ffe5f1', face: ['#ffc4dd', '#ffd6e8'], line: '#7a1f4d', ear: '#ff8fb8', eye: '#fff6fa', pupil: '#7a1f4d', nose: '#ff8fb8', horn: '#5ec8e5', mouth: '#d94f70', teeth: '#fff6fa' },
  { name: 'denim',  bg: '#e3ecf5', face: ['#b8cfe8', '#cbddf0'], line: '#1d3557', ear: '#5c7ea3', eye: '#f5f9fd', pupil: '#1d3557', nose: '#5c7ea3', horn: '#e9c46a', mouth: '#c1666b', teeth: '#f5f9fd' },
  { name: 'slime',  bg: '#f2ffd8', face: ['#c6ec7d', '#d9f49b'], line: '#2f4419', ear: '#7ba23f', eye: '#fafff0', pupil: '#2f4419', nose: '#7ba23f', horn: '#9b5de5', mouth: '#e07a9a', teeth: '#fafff0' },
  { name: 'noir',  mono: true,  bg: '#131417', face: ['#23262b', '#2e3238'], line: '#e8e6df', ear: '#4a4f57', eye: '#e8e6df', pupil: '#131417', nose: '#4a4f57', horn: '#ffd23f', mouth: '#7a7e85', teeth: '#e8e6df' }
];

const SPECIES = [
  { name: 'cat',    rx: 95,  ry: 88, ear: 'tri',   nose: 'tri' },
  { name: 'dog',    rx: 105, ry: 85, ear: 'flop',  nose: 'round' },
  { name: 'rabbit', rx: 80,  ry: 92, ear: 'long',  nose: 'tri' },
  { name: 'bear',   rx: 100, ry: 92, ear: 'round', nose: 'round' },
  { name: 'frog',   rx: 112, ry: 68, ear: 'none',  nose: 'dots' },
  { name: 'owl',    rx: 92,  ry: 90, ear: 'tuft',  nose: 'none', beak: 18 },
  { name: 'mouse',  rx: 85,  ry: 85, ear: 'big',   nose: 'tri' },
  { name: 'fox',    rx: 95,  ry: 85, ear: 'tri',   nose: 'snout' },
  { name: 'panda',  rx: 98,  ry: 90, ear: 'round', nose: 'round', patches: true },
  { name: 'pig',    rx: 100, ry: 88, ear: 'flop',  nose: 'pig' }
];

const HEAD_SHAPES = ['round', 'tall', 'wide', 'pear', 'skull', 'boxy', 'lumpy', 'bean', 'peanut', 'cone', 'dome', 'blob', 'bulb', 'moon', 'trapezoid', 'egg', 'apple', 'potato', 'onion', 'shield'];
const EYE_STYLES = ['dot', 'ball', 'dead', 'chameleon', 'lazy', 'star', 'closed', 'wink', 'googly', 'ring'];
const MOUTH_STYLES = ['smile', 'chill', 'mad', 'open', 'fangs', 'tongue', 'w', 'zigzag', 'o', 'grin', 'smirk'];
const TOP_STYLES = ['none', 'horns', 'antenna', 'mohawk', 'halo'];
const PATTERNS = ['none', 'stripes', 'spots', 'mask', 'patch'];
const ACCESSORIES = ['none', 'blush', 'whiskers', 'scar', 'eyepatch', 'piercing', 'nosering', 'hat', 'beanie', 'earring'];

const W_PALETTE = [14, 10, 10, 10, 10, 9, 10, 10, 9, 8];
const W_HEAD    = [16, 10, 10, 7, 6, 7, 6, 5, 5, 5, 5, 3, 3, 2, 3, 6, 5, 5, 4, 4];
const W_EYEC    = [8, 55, 17, 12, 8];
const W_EYES    = [20, 16, 4, 6, 10, 6, 12, 8, 10, 8];
const W_MOUTH   = [16, 10, 8, 9, 7, 8, 8, 6, 5, 10, 13];
const W_TOP     = [55, 14, 11, 10, 10];
const W_PATTERN = [55, 11, 11, 11, 12];
const W_ACC     = [21, 12, 10, 7, 7, 7, 6, 6, 5, 9];

function pickW(v, weights) {
  let total = 0;
  for (const w of weights) total += w;
  let x = v / 36 * total;
  for (let i = 0; i < weights.length; i++) { x -= weights[i]; if (x < 0) return i; }
  return weights.length - 1;
}

function rotatePt(x, y, cx, cy, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
}

function wobblyArc(cx, cy, rx, ry, a0, a1, seg, jit, rng, rot) {
  const pts = [];
  for (let i = 0; i <= seg; i++) {
    const a = a0 + (a1 - a0) * i / seg;
    let x = cx + Math.cos(a) * rx + (rng() - .5) * jit;
    let y = cy + Math.sin(a) * ry + (rng() - .5) * jit;
    if (rot) { const p = rotatePt(x, y, cx, cy, rot); x = p[0]; y = p[1]; }
    pts.push([x, y]);
  }
  return pts;
}

function wobblyCircle(cx, cy, rx, ry, seg, jit, rng, rot) {
  return wobblyArc(cx, cy, rx, ry, 0, Math.PI * 2, seg, jit, rng, rot);
}

function wobblyPoly(verts, sub, jit, rng) {
  const pts = [];
  for (let i = 0; i < verts.length; i++) {
    const a = verts[i], b = verts[(i + 1) % verts.length];
    for (let j = 0; j < sub; j++) {
      const t = j / sub;
      pts.push([a[0] + (b[0] - a[0]) * t + (rng() - .5) * jit, a[1] + (b[1] - a[1]) * t + (rng() - .5) * jit]);
    }
  }
  return pts;
}

function starVerts(cx, cy, ro, ri, n, rot) {
  const v = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? ro : ri;
    const a = rot + Math.PI * i / n;
    v.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return v;
}

function headPoints(shape, rx, ry, jit, rng) {
  if (shape === 'boxy') {
    const pts = [], n = 3;
    for (let i = 0; i <= 16; i++) {
      const a = Math.PI * 2 * i / 16;
      const c = Math.cos(a), s = Math.sin(a);
      pts.push([Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * rx + (rng() - .5) * jit,
                Math.sign(s) * Math.pow(Math.abs(s), 2 / n) * ry + (rng() - .5) * jit]);
    }
    return pts;
  }
  let erx = rx, ery = ry, j = jit;
  if (shape === 'tall') { erx *= 0.85; ery *= 1.22; }
  else if (shape === 'wide') { erx *= 1.22; ery *= 0.85; }
  else if (shape === 'lumpy') j = jit * 2.6;
  let pts = wobblyCircle(0, 0, erx, ery, 16, j, rng);
  const uy = ry;
  if (shape === 'pear' || shape === 'skull') {
    const k = shape === 'pear' ? 1 : -1;
    pts = pts.map(([x, y]) => [x * (1 + k * 0.3 * (y / uy)), y]);
  } else if (shape === 'bean') {
    pts = pts.map(([x, y]) => [x + Math.sin(y / uy * Math.PI * 0.5) * rx * 0.18, y]);
  } else if (shape === 'peanut') {
    pts = pts.map(([x, y]) => [x * (0.55 + 0.45 * Math.abs(Math.cos(y / uy * Math.PI * 0.5))) * 1.15, y]);
  } else if (shape === 'cone') {
    pts = pts.map(([x, y]) => [x * (0.35 + 0.9 * (y / uy + 1) / 2), y]);
  } else if (shape === 'trapezoid') {
    pts = pts.map(([x, y]) => [x * (1.25 - 0.55 * (y / uy + 1) / 2), y]);
  } else if (shape === 'dome') {
    pts = pts.map(([x, y]) => [x, y > uy * 0.55 ? uy * 0.55 + (y - uy * 0.55) * 0.3 : y * 1.12]);
  } else if (shape === 'blob') {
    pts = pts.map(([x, y]) => y > 0 ? [x * 1.12, y * 1.32] : [x * 0.82, y]);
  } else if (shape === 'bulb') {
    pts = pts.map(([x, y]) => y < 0 ? [x * 1.05, y * 1.15] : [x * 0.55, y]);
  } else if (shape === 'moon') {
    pts = pts.map(([x, y]) => [x + Math.sin(y / uy * Math.PI * 0.5) * rx * 0.38, y]);
  } else if (shape === 'egg') {
    pts = pts.map(([x, y]) => [x * (1 + 0.18 * (y / uy)), y * 1.08]);
  } else if (shape === 'apple') {
    pts = pts.map(([x, y]) => [x, y < -uy * 0.65 ? y + Math.abs(x) / rx * uy * 0.22 : y]);
  } else if (shape === 'potato') {
    const tilt = rng() < 0.5 ? -0.14 : 0.14;
    pts = wobblyCircle(0, 0, erx, ery * 1.12, 16, j * 1.8, rng).map(([x, y]) => rotatePt(x, y, 0, 0, tilt));
  } else if (shape === 'onion') {
    pts = pts.map(([x, y]) => y < 0 ? [x * (1 - 0.45 * Math.pow(-y / uy, 2)), y] : [x * (1 + 0.12 * (y / uy)), y]);
  } else if (shape === 'shield') {
    pts = pts.map(([x, y]) => y > 0 ? [x * (1 - 0.55 * (y / uy)), y] : [x * 1.05, y]);
  }
  return pts;
}

function widthAt(pts, y, tol) {
  let m = 0;
  for (const p of pts) if (Math.abs(p[1] - y) < tol) m = Math.max(m, Math.abs(p[0]));
  return m;
}

function colorDist(a, b) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const dr = (pa >> 16 & 255) - (pb >> 16 & 255), dg = (pa >> 8 & 255) - (pb >> 8 & 255), db = (pa & 255) - (pb & 255);
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function parseId(id) {
  const c = id.split('').map(ch => Math.max(0, B36.indexOf(ch)));
  const g = i => c[i] === undefined ? 0 : c[i];
  return {
    species: g(0) % SPECIES.length,
    palette: pickW(g(1), W_PALETTE),
    head: pickW(g(2), W_HEAD),
    eyes: pickW(g(3), W_EYEC),
    eyeStyle: pickW(g(4), W_EYES),
    mouth: pickW(g(5), W_MOUTH),
    top: pickW(g(6), W_TOP),
    pattern: pickW(g(7), W_PATTERN),
    accessory: pickW(g(8), W_ACC),
    wild: g(9)
  };
}

function randomId() {
  const r = () => Math.floor(Math.random() * 36);
  let s = '';
  for (let i = 0; i < 10; i++) s += B36[r()];
  return s;
}

function addShape(shapes, pts, opts, rng, intensity) {
  const offs = pts.map(() => [0, 0]);
  shapes.push(Object.assign({ pts, offs, closed: true, lw: 3.5, alpha: 1, intensity: intensity || 5 }, opts));
  return shapes[shapes.length - 1];
}

const RIG_EYE_STYLES = ['dot', 'ball', 'chameleon', 'lazy', 'star', 'googly', 'ring'];

function buildModel(id, opts) {
  const t = parseId(id);
  if (opts && opts.traits) Object.assign(t, opts.traits);
  const rng = mulberry32(hashStr(id));
  const sp = SPECIES[t.species];
  const pal = PALETTES[t.palette];
  const face = pal.face[Math.floor(rng() * pal.face.length)];
  const ringColor = pal.mono ? pal.line : (colorDist(pal.horn, face) < 60 ? pal.line : pal.horn);
  const shapes = [];
  const sizeJit = 0.9 + rng() * 0.2;
  const headPts = headPoints(HEAD_SHAPES[t.head], sp.rx * sizeJit, sp.ry * sizeJit, 7, rng);
  const rx = Math.max(...headPts.map(p => Math.abs(p[0])));
  const ry = Math.max(...headPts.map(p => Math.abs(p[1])));
  const topY = Math.min(...headPts.map(p => p[1]));
  const botY = Math.max(...headPts.map(p => p[1]));
  const topYAt = (x) => {
    let m = 0;
    for (const p of headPts) if (Math.abs(p[0] - x) < 16) m = Math.min(m, p[1]);
    return m || topY;
  };
  const earRx = widthAt(headPts, topY * 0.7, ry * 0.3) || rx * 0.6;
  const eyeRx = widthAt(headPts, topY * 0.18, ry * 0.3) || rx * 0.7;
  const mouthRx = widthAt(headPts, botY * 0.52, ry * 0.3) || rx * 0.7;
  const topPts = headPts.filter(p => p[1] < topY * 0.75);
  const topX = topPts.length ? topPts.reduce((sum, p) => sum + p[0], 0) / topPts.length : 0;
  const asymL = 0.65 + rng() * 0.7;
  const asymR = 0.65 + rng() * 0.7;
  const acc = ACCESSORIES[t.accessory];
  const hatWorn = acc === 'hat' || acc === 'beanie';
  const extras = [];

  const earY = topY * 0.8;
  const earsHidden = hatWorn && (sp.ear === 'long' || sp.ear === 'tuft');
  if (earsHidden) {
  } else if (sp.ear === 'tri') {
    for (const s of [-1, 1]) {
      const a = s < 0 ? asymL : asymR, w = 52 * a, h = 62 * a;
      const ex = s * earRx * 0.55, ey = earY + ry * 0.08;
      addShape(shapes, wobblyPoly([[ex - w / 2, ey], [ex + w / 2, ey], [ex + s * 12 * a, ey - h]], 3, 5, rng),
        { fill: face, stroke: pal.line }, rng, 3);
      addShape(shapes, wobblyPoly([[ex - w / 4, ey - h * 0.12], [ex + w / 4, ey - h * 0.12], [ex + s * 10 * a, ey - h * 0.62]], 2, 3, rng),
        { fill: pal.ear, stroke: pal.line, lw: 2 }, rng, 3);
    }
  } else if (sp.ear === 'long') {
    for (const s of [-1, 1]) {
      const a = s < 0 ? asymL : asymR;
      const ex = s * earRx * 0.42, ey = topY - 58 * a;
      addShape(shapes, wobblyCircle(ex, ey, 19 * a, 66 * a, 10, 5, rng, s * 0.12),
        { fill: face, stroke: pal.line }, rng, 3);
      addShape(shapes, wobblyCircle(ex, ey + 6, 9 * a, 44 * a, 8, 4, rng, s * 0.12),
        { fill: pal.ear, stroke: null }, rng, 3);
    }
  } else if (sp.ear === 'flop') {
    for (const s of [-1, 1]) {
      const a = s < 0 ? asymL : asymR;
      const ex = s * rx * 0.86, ey = -ry * 0.28;
      addShape(shapes, wobblyCircle(ex, ey, 17 * a, 56 * a, 10, 5, rng, s * 0.38),
        { fill: pal.ear, stroke: pal.line }, rng, 3);
    }
  } else if (sp.ear === 'round' || sp.ear === 'big') {
    const baseR = sp.ear === 'big' ? 38 : 26;
    for (const s of [-1, 1]) {
      const a = s < 0 ? asymL : asymR;
      const ex = s * earRx * 0.68, ey = earY - (sp.ear === 'big' ? 10 : 0);
      addShape(shapes, wobblyCircle(ex, ey, baseR * a, baseR * a, 10, 4, rng),
        { fill: face, stroke: pal.line }, rng, 3);
      addShape(shapes, wobblyCircle(ex, ey, baseR * 0.45 * a, baseR * 0.45 * a, 8, 3, rng),
        { fill: pal.ear, stroke: null }, rng, 3);
    }
  } else if (sp.ear === 'tuft') {
    for (const s of [-1, 1]) {
      const a = s < 0 ? asymL : asymR;
      const ex = s * earRx * 0.55, ey = topY * 0.85;
      addShape(shapes, wobblyPoly([[ex - 14 * a, ey + 8], [ex + 14 * a, ey + 8], [ex + s * 16 * a, ey - 26 * a]], 2, 4, rng),
        { fill: face, stroke: pal.line }, rng, 3);
    }
  }

  const faceIdx = shapes.length;
  addShape(shapes, headPts, { fill: face, stroke: pal.line, lw: 4.5 }, rng, 5);

  const pattern = PATTERNS[t.pattern];
  if (pattern === 'stripes' && !sp.patches) {
    for (let k = 0; k < 3; k++) {
      const sy = topY * (0.42 + k * 0.14);
      const w = earRx * (0.52 - k * 0.1);
      addShape(shapes, wobblyArc(0, sy, w, 9, Math.PI * 1.12, Math.PI * 1.88, 8, 3, rng),
        { fill: null, stroke: pal.line, closed: false, lw: 5, alpha: 0.75 }, rng, 5);
    }
    for (const s of [-1, 1]) {
      for (let k = 0; k < 2; k++) {
        const sy = botY * (0.12 + k * 0.2);
        addShape(shapes, wobblyArc(s * mouthRx * 0.9, sy, 16, 6, s > 0 ? -0.9 : Math.PI - 0.9, s > 0 ? 0.9 : Math.PI + 0.9, 6, 2.5, rng),
          { fill: null, stroke: pal.line, closed: false, lw: 4, alpha: 0.75 }, rng, 5);
      }
    }
  } else if (pattern === 'spots' && !sp.patches) {
    const n = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const s = rng() < 0.5 ? -1 : 1;
      const sx = s * (rx * 0.3 + rng() * rx * 0.45);
      const sy = topY * 0.65 + rng() * (botY * 0.1 - topY * 0.65);
      addShape(shapes, wobblyCircle(sx, sy, 10 + rng() * 14, 8 + rng() * 10, 8, 4, rng, rng() * 3),
        { fill: pal.ear, stroke: null, alpha: 0.45 }, rng, 5);
    }
  } else if (pattern === 'mask' && !sp.patches) {
    addShape(shapes, wobblyCircle(0, topY * 0.18, eyeRx * 0.95, ry * 0.3, 14, 5, rng),
      { fill: pal.line, stroke: null, alpha: 0.16 }, rng, 5);
  } else if (pattern === 'patch' && !sp.patches) {
    const s = rng() < 0.5 ? -1 : 1;
    addShape(shapes, wobblyCircle(s * eyeRx * 0.45, topY * 0.2, 26 + rng() * 8, 30 + rng() * 8, 10, 5, rng, s * 0.3),
      { fill: pal.ear, stroke: null, alpha: 0.85 }, rng, 5);
  }

  const topStart = shapes.length;
  const topStyle = hatWorn ? 'none' : TOP_STYLES[t.top];
  if (topStyle === 'horns') {
    for (const s of [-1, 1]) {
      const ex = s * earRx * 0.45;
      const by = topYAt(ex);
      const hs = 0.8 + rng() * 0.45;
      const tip = [ex + s * 24 * hs, by - 58 * hs];
      const pts = [[ex - 13, by + 4], [ex + s * 4, by - 20 * hs], [ex + s * 12, by - 40 * hs], tip,
                   [ex + s * 16, by - 34 * hs], [ex + s * 10, by - 14 * hs], [ex + 13, by + 4]]
        .map(([x, y]) => [x + (rng() - .5) * 4, y + (rng() - .5) * 4]);
      addShape(shapes, pts, { fill: pal.horn, stroke: pal.line }, rng, 5);
    }
  } else if (topStyle === 'antenna') {
    const n = 1 + Math.floor(rng() * 2);
    for (let k = 0; k < n; k++) {
      const ex = n === 1 ? topX : topX + (k === 0 ? -earRx * 0.35 : earRx * 0.35);
      const by = topYAt(ex);
      const top = [ex + (rng() - .5) * 20, by - 62 - rng() * 20];
      addShape(shapes, [[ex, by + 4], [ex + 8, by - 22], [ex - 6, by - 42], top], { fill: null, stroke: pal.line, closed: false, lw: 3 }, rng, 5);
      addShape(shapes, wobblyCircle(top[0], top[1], 10, 10, 8, 3, rng), { fill: pal.horn, stroke: pal.line, lw: 2.5 }, rng, 6);
    }
  } else if (topStyle === 'mohawk') {
    const n = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const fx = -earRx * 0.5 + earRx * i / (n - 1);
      const ey = topY * Math.sqrt(Math.max(0, 1 - (fx / rx) * (fx / rx)));
      const h = 22 + rng() * 14;
      addShape(shapes, wobblyPoly([[fx - 13, ey + 4], [fx + 13, ey + 4], [fx, ey - h]], 2, 4, rng),
        { fill: pal.horn, stroke: pal.line, lw: 2.5 }, rng, 8);
    }
  } else if (topStyle === 'halo') {
    addShape(shapes, wobblyCircle(topX, topY - 34, 30, 8, 12, 3, rng), { fill: null, stroke: pal.horn, lw: 4.5 }, rng, 12);
  }
  for (let k = topStart; k < shapes.length; k++) shapes[k].role = 'top';

  const eyeCount = t.eyes + 1;
  let eyeStyle = EYE_STYLES[t.eyeStyle];
  if (opts && opts.rig) eyeStyle = RIG_EYE_STYLES[t.eyeStyle % RIG_EYE_STYLES.length];
  const eyeR = Math.max(9, Math.min(27 - eyeCount * 3, eyeRx * (eyeCount > 2 ? 0.32 : 0.42)));
  const spread = eyeCount === 1 ? 0 : eyeRx * 0.62;
  const noseDy = eyeCount === 1 ? ry * 0.08 : 0;
  const eyePos = [];
  const eyeStart = shapes.length;
  const eyepatchEye = acc === 'eyepatch' && eyeCount > 1 && !sp.patches ? Math.floor(rng() * Math.min(2, eyeCount)) : -1;

  if (eyepatchEye >= 0) {
    const [px, py] = [-spread + 2 * spread * eyepatchEye / (eyeCount - 1), topY * 0.18];
    addShape(shapes, [[-rx * 1.05, py - 26], [0, py - 10], [rx * 1.05, py + 6]],
      { fill: null, stroke: pal.line, closed: false, lw: 6 }, rng, 4);
  }

  for (let i = 0; i < eyeCount; i++) {
    const fx = eyeCount === 1 ? 0 : -spread + 2 * spread * i / (eyeCount - 1);
    const ex = fx + (rng() - .5) * 10;
    const ey = topY * 0.18 + (rng() - .5) * 14 - (eyeCount > 2 && i % 2 ? 8 : 0);
    let er = eyeR * (t.wild % 5 === 4 ? (i === 0 ? 1.3 : 0.75) : 1);
    if (eyeCount === 1) er = Math.min(er, eyeRx * 0.38);
    eyePos.push([ex, ey, er]);
    if (sp.patches && i < 2) {
      addShape(shapes, wobblyCircle(ex, ey, er * 1.6, er * 1.9, 10, 4, rng, (ex < 0 ? -1 : 1) * 0.35),
        { fill: pal.line, stroke: null, alpha: 0.85, role: 'patch' }, rng, 4);
    }
    if (i === eyepatchEye) continue;
    if (eyeStyle === 'closed' || (eyeStyle === 'wink' && i === 0)) {
      addShape(shapes, wobblyArc(ex, ey + er * 0.25, er * 0.8, er * 0.7, Math.PI + 0.2, Math.PI * 2 - 0.2, 8, 3, rng),
        { fill: null, stroke: pal.line, closed: false, lw: 4 }, rng, 12);
      continue;
    }
    addShape(shapes, wobblyCircle(ex, ey, er, er * (0.85 + rng() * 0.3), 12, 4, rng),
      { fill: pal.eye, stroke: pal.line }, rng, 12);
    if (eyeStyle === 'dead') {
      const s = er * 0.55;
      addShape(shapes, [[ex - s, ey - s], [ex, ey], [ex + s, ey + s]], { fill: null, stroke: pal.pupil, closed: false, lw: 3.5 }, rng, 12);
      addShape(shapes, [[ex + s, ey - s], [ex, ey], [ex - s, ey + s]], { fill: null, stroke: pal.pupil, closed: false, lw: 3.5 }, rng, 12);
    } else if (eyeStyle === 'chameleon') {
      addShape(shapes, wobblyCircle(ex, ey, er * 0.6, 2.5, 8, 2, rng, (rng() - .5) * 1.2),
        { fill: pal.pupil, stroke: null, follow: { x: ex, y: ey, max: er * 0.5 } }, rng, 12);
    } else if (eyeStyle === 'star') {
      addShape(shapes, wobblyPoly(starVerts(ex, ey, er * 0.5, er * 0.22, 5, -Math.PI / 2), 1, 2, rng),
        { fill: pal.pupil, stroke: null, follow: { x: ex, y: ey, max: er * 0.5 } }, rng, 12);
    } else if (eyeStyle === 'googly') {
      const ga = rng() * 6.283, gd = er * (0.3 + rng() * 0.3);
      addShape(shapes, wobblyCircle(ex + Math.cos(ga) * gd, ey + Math.sin(ga) * gd, er * 0.3, er * 0.3, 10, 2, rng),
        { fill: pal.pupil, stroke: null }, rng, 12);
    } else if (eyeStyle === 'ring') {
      addShape(shapes, wobblyCircle(ex, ey, er * 0.38, er * 0.38, 10, 2, rng),
        { fill: null, stroke: pal.pupil, lw: 3, follow: { x: ex, y: ey, max: er * 0.55 } }, rng, 12);
    } else {
      const pr = eyeStyle === 'dot' ? er * 0.22 : er * 0.45;
      addShape(shapes, wobblyCircle(ex, ey, pr, pr, 10, 2, rng),
        { fill: pal.pupil, stroke: null, follow: { x: ex, y: ey, max: er * 0.55 } }, rng, 12);
      if (eyeStyle === 'lazy') {
        addShape(shapes, wobblyArc(ex, ey - er * 0.05, er * 1.05, er * 0.8, Math.PI * 1.08, Math.PI * 1.92, 8, 3, rng),
          { fill: null, stroke: pal.line, closed: false, lw: 4 }, rng, 12);
      }
    }
  }

  if (eyepatchEye >= 0) {
    const [ex, ey, er] = eyePos[eyepatchEye];
    addShape(shapes, wobblyCircle(ex, ey, er * 1.1, er * 1.2, 10, 3, rng, 0.15),
      { fill: pal.line, stroke: pal.line, lw: 2 }, rng, 12);
    extras.push('eyepatch');
  }

  let glassesStart = -1;
  if (sp.name === 'owl' && t.wild >= 30 && eyeCount >= 2 && eyepatchEye < 0) {
    glassesStart = shapes.length;
    const [lx, ly, lr] = eyePos[0], [rx2, ry2, rr] = eyePos[1];
    for (const [ex, ey, er] of [eyePos[0], eyePos[1]]) {
      addShape(shapes, wobblyCircle(ex, ey, er * 1.3, er * 1.3, 12, 2.5, rng), { fill: null, stroke: pal.line, lw: 3 }, rng, 12);
    }
    addShape(shapes, [[lx + lr * 1.3, ly], [rx2 - rr * 1.3, ry2]], { fill: null, stroke: pal.line, closed: false, lw: 3 }, rng, 12);
    extras.push('glasses');
  }
  const glassesEnd = glassesStart < 0 ? -1 : shapes.length;

  for (let k = eyeStart; k < shapes.length; k++) {
    if (shapes[k].role) continue;
    if (glassesStart >= 0 && k >= glassesStart && k < glassesEnd) { shapes[k].role = 'glasses'; continue; }
    shapes[k].role = 'eye';
  }

  const snoutMouth = sp.nose === 'snout';
  const myBase = snoutMouth ? botY * 0.66 : botY * 0.52;

  if (sp.beak) {
    addShape(shapes, wobblyPoly([[-sp.beak * 0.55, botY * 0.02], [sp.beak * 0.55, botY * 0.02], [0, botY * 0.02 + sp.beak]], 3, 4, rng),
      { fill: pal.horn, stroke: pal.line }, rng, 10);
  } else if (sp.nose === 'snout') {
    addShape(shapes, wobblyCircle(0, botY * 0.34 + noseDy, 27, 17, 10, 3.5, rng), { fill: face, stroke: pal.line, lw: 3 }, rng, 10);
    addShape(shapes, wobblyPoly([[-10, botY * 0.26 + noseDy], [10, botY * 0.26 + noseDy], [0, botY * 0.26 + noseDy + 11]], 2, 3, rng),
      { fill: pal.nose, stroke: pal.line, lw: 2 }, rng, 10);
  } else if (sp.nose === 'pig') {
    addShape(shapes, wobblyCircle(0, botY * 0.22 + noseDy, 17, 12, 10, 3, rng), { fill: pal.nose, stroke: pal.line, lw: 2.5 }, rng, 10);
    for (const s of [-1, 1]) {
      addShape(shapes, wobblyCircle(s * 7, botY * 0.22 + noseDy, 3, 4, 6, 1.5, rng), { fill: pal.line, stroke: null }, rng, 10);
    }
  } else if (sp.nose === 'round') {
    addShape(shapes, wobblyCircle(0, botY * 0.2 + noseDy, 13, 9, 10, 3, rng), { fill: pal.nose, stroke: pal.line, lw: 2.5 }, rng, 10);
  } else if (sp.nose === 'dots') {
    for (const s of [-1, 1]) {
      addShape(shapes, wobblyCircle(s * 9, botY * 0.12 + noseDy, 3.5, 3.5, 6, 1.5, rng), { fill: pal.nose, stroke: pal.line, lw: 1.5 }, rng, 10);
    }
  } else if (sp.nose === 'tri') {
    addShape(shapes, wobblyPoly([[-9, botY * 0.14 + noseDy], [9, botY * 0.14 + noseDy], [0, botY * 0.14 + noseDy + 10]], 2, 3, rng),
      { fill: pal.nose, stroke: pal.line, lw: 2 }, rng, 10);
  }

  if (acc === 'nosering' && !sp.beak && sp.nose !== 'none' && sp.nose !== 'dots') {
    const ny = sp.nose === 'snout' ? botY * 0.46 : botY * 0.32;
    addShape(shapes, wobblyCircle(0, ny, 7, 7, 8, 2, rng), { fill: null, stroke: ringColor, lw: 2.5 }, rng, 10);
    extras.push('nosering');
  }

  const mouthStart = shapes.length;
  const mouthStyle = t.mouth === 'rig' ? 'rig' : MOUTH_STYLES[t.mouth];
  const my = myBase, mw = Math.min(34, mouthRx * 0.55), mh = 24;
  const smileArcY = (tx) => my - 12 + mh * Math.sin(Math.PI * Math.max(0, Math.min(1, (tx + mw) / (2 * mw))));
  let teethCurve = null, teethH = 0;

  if (mouthStyle === 'smile') {
    addShape(shapes, wobblyArc(0, my - 12, mw, mh, 0.1, Math.PI - 0.1, 12, 4, rng), { fill: null, stroke: pal.line, closed: false, lw: 3.5 }, rng, 8);
    teethCurve = smileArcY; teethH = 7 + rng() * 4;
  } else if (mouthStyle === 'chill') {
    addShape(shapes, wobblyArc(0, my - 6, mw * 0.8, 5, 0.1, Math.PI - 0.1, 10, 3, rng), { fill: null, stroke: pal.line, closed: false, lw: 3 }, rng, 8);
  } else if (mouthStyle === 'mad') {
    addShape(shapes, wobblyArc(0, my + 12, mw * 0.9, 18, Math.PI + 0.15, Math.PI * 2 - 0.15, 12, 4, rng), { fill: null, stroke: pal.line, closed: false, lw: 3.5 }, rng, 8);
  } else if (mouthStyle === 'open') {
    addShape(shapes, wobblyCircle(0, my - 2, mw * 0.75, mh * 0.8, 12, 4, rng), { fill: pal.line, stroke: pal.line, lw: 2 }, rng, 8);
    addShape(shapes, wobblyCircle(0, my + mh * 0.35, mw * 0.38, mh * 0.28, 10, 3, rng), { fill: pal.mouth, stroke: null }, rng, 8);
    teethCurve = () => my - 2 - mh * 0.62; teethH = mh * 0.55;
  } else if (mouthStyle === 'fangs') {
    addShape(shapes, wobblyArc(0, my - 12, mw, mh, 0.1, Math.PI - 0.1, 12, 4, rng), { fill: null, stroke: pal.line, closed: false, lw: 3.5 }, rng, 8);
    for (const s of [-1, 1]) {
      const fx = s * mw * 0.62, fy = smileArcY(fx);
      addShape(shapes, wobblyPoly([[fx - 7, fy - 2], [fx + 7, fy - 2], [fx, fy + 16]], 2, 2.5, rng),
        { fill: pal.teeth, stroke: pal.line, lw: 1.8 }, rng, 8);
    }
  } else if (mouthStyle === 'tongue') {
    addShape(shapes, wobblyArc(0, my - 12, mw, mh, 0.1, Math.PI - 0.1, 12, 4, rng), { fill: null, stroke: pal.line, closed: false, lw: 3.5 }, rng, 8);
    const tx = (rng() - .5) * 1.1 * mw;
    const by = smileArcY(tx) - 2;
    const rot = tx / mw * 0.3;
    const cyT = by + 15;
    addShape(shapes, wobblyCircle(tx, cyT, 11, 16, 10, 3, rng, rot), { fill: pal.mouth, stroke: pal.line, lw: 2.5 }, rng, 9);
    const l0 = rotatePt(tx, cyT - 8, tx, cyT, rot);
    const l1 = rotatePt(tx, cyT + 8, tx, cyT, rot);
    addShape(shapes, [l0, l1], { fill: null, stroke: pal.line, closed: false, lw: 1.8 }, rng, 9);
  } else if (mouthStyle === 'w') {
    for (const s of [-1, 1]) {
      addShape(shapes, wobblyArc(s * 11, my - 8, 11, 9, 0.05, Math.PI - 0.05, 8, 2.5, rng), { fill: null, stroke: pal.line, closed: false, lw: 3 }, rng, 8);
    }
  } else if (mouthStyle === 'zigzag') {
    const pts = [];
    const zw = mw * 1.3, n = 6;
    for (let i = 0; i <= n; i++) {
      pts.push([-zw / 2 + zw * i / n, my - 4 + (i % 2 === 0 ? -5 : 5) + (rng() - .5) * 3]);
    }
    addShape(shapes, pts, { fill: null, stroke: pal.line, closed: false, lw: 3.5 }, rng, 8);
  } else if (mouthStyle === 'o') {
    addShape(shapes, wobblyCircle(0, my - 4, 9 + rng() * 3, 10 + rng() * 4, 10, 3, rng), { fill: pal.line, stroke: pal.line, lw: 2 }, rng, 8);
  } else if (mouthStyle === 'grin') {
    addShape(shapes, wobblyCircle(0, my - 4, mw * 0.95, mh * 0.55, 12, 4, rng), { fill: pal.line, stroke: pal.line, lw: 2 }, rng, 8);
    const n = 5 + t.wild % 3;
    for (let i = 0; i < n; i++) {
      const tx = -mw * 0.72 + mw * 1.44 * i / (n - 1);
      addShape(shapes, wobblyPoly([[tx - 6, my - 4 - mh * 0.4], [tx + 6, my - 4 - mh * 0.4], [tx, my - 4 + mh * 0.12]], 2, 1.8, rng),
        { fill: pal.teeth, stroke: null }, rng, 8);
    }
  } else if (mouthStyle === 'rig') {
    addShape(shapes, wobblyArc(0, my - 6, mw * 0.85, 4, 0.05, Math.PI - 0.05, 12, 1.2, rng), { fill: null, stroke: pal.line, closed: false, lw: 3.5 }, rng, 8);
  } else if (mouthStyle === 'smirk') {
    addShape(shapes, wobblyArc(mw * 0.3, my - 10, mw * 0.7, mh * 0.75, 0.15, Math.PI * 0.85, 10, 3.5, rng, -0.12),
      { fill: null, stroke: pal.line, closed: false, lw: 3.5 }, rng, 8);
  }

  if ((mouthStyle === 'smile' || mouthStyle === 'open') && (topStyle === 'horns' || t.wild % 4 === 2)) {
    const n = 2 + t.wild % 3;
    const lim = mouthStyle === 'open' ? mw * 0.5 : mw * 0.75;
    for (let i = 0; i < n; i++) {
      const tx = -lim + 2 * lim * (n === 1 ? 0.5 : i / (n - 1));
      const by = teethCurve(tx);
      const w = 8 + rng() * 4, h = Math.min(teethH, 7 + rng() * 6);
      addShape(shapes, wobblyPoly([[tx - w / 2, by], [tx + w / 2, by], [tx, by + h]], 2, 2, rng),
        { fill: pal.teeth, stroke: pal.line, lw: 1.8 }, rng, 8);
    }
  }

  if (sp.name === 'rabbit' && t.wild >= 29 && (mouthStyle === 'smile' || mouthStyle === 'chill' || mouthStyle === 'w')) {
    const by = mouthStyle === 'smile' ? smileArcY(0) : my - 6;
    for (const s of [-1, 1]) {
      addShape(shapes, wobblyPoly([[s * 8 - 6, by], [s * 8 + 6, by], [s * 8 + 5, by + 14], [s * 8 - 5, by + 14]], 2, 2, rng),
        { fill: pal.teeth, stroke: pal.line, lw: 1.8 }, rng, 8);
    }
    extras.push('buckteeth');
  }

  for (let k = mouthStart; k < shapes.length; k++) shapes[k].role = 'mouth';

  if (acc === 'blush') {
    for (const s of [-1, 1]) {
      addShape(shapes, wobblyCircle(s * mouthRx * 0.72, myBase - botY * 0.22, 11 + rng() * 4, 7 + rng() * 3, 8, 2.5, rng),
        { fill: pal.mouth, stroke: null, alpha: 0.55 }, rng, 5);
    }
  } else if (acc === 'whiskers' && !sp.beak) {
    for (const s of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        const wy = myBase - botY * 0.24 + k * 10;
        const ew = widthAt(headPts, wy, 12) || mouthRx;
        const fan = (k - 1) * 9;
        addShape(shapes, [[s * (ew - 16), wy], [s * (ew + 8), wy + fan * 0.4], [s * (ew + 32), wy + fan]],
          { fill: null, stroke: pal.line, closed: false, lw: 2.2 }, rng, 5);
      }
    }
  } else if (acc === 'scar') {
    const s = rng() < 0.5 ? -1 : 1;
    const x0 = s * earRx * 0.35, y0 = topY * 0.55, x1 = s * earRx * 0.6, y1 = topY * 0.28;
    addShape(shapes, [[x0, y0], [x1, y1]], { fill: null, stroke: pal.line, closed: false, lw: 2.5 }, rng, 5);
    for (let k = 0; k < 3; k++) {
      const f = 0.2 + k * 0.3;
      const px = x0 + (x1 - x0) * f, py = y0 + (y1 - y0) * f;
      addShape(shapes, [[px - 5, py + 2], [px + 5, py - 2]], { fill: null, stroke: pal.line, closed: false, lw: 2 }, rng, 5);
    }
  } else if (acc === 'piercing') {
    const s = rng() < 0.5 ? -1 : 1;
    const py = botY * 0.18;
    const near = headPts.filter(p => Math.abs(p[1] - py) < ry * 0.25);
    const edge = near.length ? (s < 0 ? Math.min(...near.map(p => p[0])) : Math.max(...near.map(p => p[0]))) : s * rx * 0.7;
    const exx = edge - s * 3;
    addShape(shapes, wobblyCircle(exx, py, 6.5, 6.5, 8, 2, rng), { fill: null, stroke: ringColor, lw: 2.5 }, rng, 5);
    addShape(shapes, wobblyCircle(exx, py - 7, 2.5, 2.5, 6, 1.5, rng), { fill: ringColor, stroke: null }, rng, 5);
    extras.push('piercing');
  } else if (acc === 'earring' && sp.ear !== 'none' && !earsHidden) {
    const s = rng() < 0.5 ? -1 : 1;
    const a = s < 0 ? asymL : asymR;
    let rcx = 0, rcy = 0;
    if (sp.ear === 'tri') {
      rcx = s * earRx * 0.55 + s * 22 * a; rcy = earY + ry * 0.08 - 5;
    } else if (sp.ear === 'long') {
      rcx = s * earRx * 0.42 + s * 19 * a; rcy = topY - 88 * a;
    } else if (sp.ear === 'flop') {
      const ex = s * rx * 0.86, ey = -ry * 0.28;
      rcx = ex - Math.sin(s * 0.38) * 56 * a;
      rcy = ey + Math.cos(0.38) * 56 * a - 3;
    } else if (sp.ear === 'round' || sp.ear === 'big') {
      const baseR = sp.ear === 'big' ? 38 : 26;
      rcx = s * earRx * 0.68 + s * baseR * a * 0.92;
      rcy = earY - (sp.ear === 'big' ? 10 : 0);
    } else if (sp.ear === 'tuft') {
      rcx = s * earRx * 0.72; rcy = topY * 0.78;
    }
    const e0 = shapes.length;
    addShape(shapes, wobblyCircle(rcx, rcy - 5, 2.5, 2.5, 6, 1.5, rng), { fill: ringColor, stroke: null }, rng, 3);
    addShape(shapes, wobblyCircle(rcx, rcy, 6, 6, 8, 2, rng), { fill: null, stroke: ringColor, lw: 2.5 }, rng, 3);
    const moved = shapes.splice(e0, 2);
    shapes.splice(faceIdx, 0, ...moved);
    extras.push('earring');
  } else if (acc === 'hat') {
    const hy = topY * 0.58, tilt = (rng() - .5) * 0.2;
    const hw = widthAt(headPts, hy, ry * 0.25) || earRx;
    const capH = Math.max(30, ry * 0.45 + 12);
    const dome = wobblyArc(topX, hy + 4, hw * 0.98, capH, Math.PI, Math.PI * 2, 12, 5, rng)
      .map(([x, y]) => rotatePt(x, y, topX, hy, tilt));
    addShape(shapes, dome, { fill: pal.horn, stroke: pal.line, role: 'top' }, rng, 8);
    const brim = wobblyCircle(topX + hw * 0.25, hy + 4, hw * 1.2, 10, 12, 4, rng, tilt)
      .map(([x, y]) => rotatePt(x, y, topX, hy, tilt));
    addShape(shapes, brim, { fill: pal.horn, stroke: pal.line, role: 'top' }, rng, 8);
    extras.push('hat');
  } else if (acc === 'beanie') {
    const bandY = topY * 0.55;
    const hw = widthAt(headPts, bandY, ry * 0.25) || earRx;
    const capH = Math.max(26, ry * 0.42 + 10);
    addShape(shapes, wobblyArc(topX, bandY + 6, hw * 0.98, capH, Math.PI, Math.PI * 2, 12, 5, rng),
      { fill: pal.horn, stroke: pal.line, role: 'top' }, rng, 8);
    addShape(shapes, wobblyPoly([[topX - hw, bandY + 2], [topX + hw, bandY + 2], [topX + hw, bandY + 16], [topX - hw, bandY + 16]], 4, 3, rng),
      { fill: pal.ear, stroke: pal.line, lw: 2.5, role: 'top' }, rng, 8);
    addShape(shapes, wobblyCircle(topX, bandY + 6 - capH - 4, 9, 9, 8, 3, rng), { fill: pal.ear, stroke: pal.line, lw: 2, role: 'top' }, rng, 10);
    extras.push('beanie');
  }

  if (!hatWorn && sp.name === 'frog' && t.wild >= 32) {
    const cy = topY * 0.88, cw = 30;
    const verts = [[-cw, cy + 12], [-cw, cy - 8], [-cw * 0.5, cy + 2], [0, cy - 16], [cw * 0.5, cy + 2], [cw, cy - 8], [cw, cy + 12]]
      .map(([x, y]) => [x + topX, y]);
    addShape(shapes, wobblyPoly(verts, 2, 2.5, rng), { fill: pal.horn, stroke: pal.line, lw: 2.5, role: 'top' }, rng, 9);
    extras.push('crown');
  }

  if (!hatWorn && sp.name === 'mouse' && t.wild >= 32) {
    const cy = topY * 0.85;
    addShape(shapes, wobblyPoly([[-24, cy + 10], [26, cy + 4], [-16, cy - 22]].map(([x, y]) => [x + topX, y]), 3, 3, rng), { fill: pal.horn, stroke: pal.line, lw: 2.5, role: 'top' }, rng, 9);
    for (let k = 0; k < 2; k++) {
      addShape(shapes, wobblyCircle(topX - 6 + k * 14, cy - 4 + k * 4, 3.5, 3.5, 6, 1.5, rng), { fill: pal.bg, stroke: null }, rng, 9);
    }
    extras.push('cheese');
  }

  if (sp.name === 'pig' && t.wild >= 30) {
    const n = 3 + t.wild % 3;
    for (let i = 0; i < n; i++) {
      const s = rng() < 0.5 ? -1 : 1;
      addShape(shapes, wobblyCircle(s * rng() * mouthRx * 0.85, botY * (0.1 + rng() * 0.55), 8 + rng() * 10, 6 + rng() * 8, 8, 4, rng, rng() * 3),
        { fill: pal.nose, stroke: null, alpha: 0.4 }, rng, 2);
    }
    extras.push('mud');
  }

  const traitList = [sp.name, HEAD_SHAPES[t.head], pal.name, eyeCount + ' eye' + (eyeCount > 1 ? 's' : ''), eyeStyle, mouthStyle];
  if (topStyle !== 'none') traitList.push(topStyle);
  if (pattern !== 'none' && !sp.patches) traitList.push(pattern);
  if (acc !== 'none' && !['eyepatch', 'piercing', 'nosering', 'hat', 'beanie', 'earring'].includes(acc)) traitList.push(acc);
  for (const e of extras) traitList.push(e);
  return { shapes, traits: traitList, palette: pal, eyes: eyePos, mouth: { y: my, mw, mh, style: mouthStyle }, face, topY, botY, ry };
}

const FRICTION = 0.2;

function drawPath(ctx, sh, env) {
  const pts = sh.pts, offs = sh.offs, n = pts.length;
  const fdx = (sh.follow ? sh.follow.dx || 0 : 0) + (sh.ox || 0);
  const fdy = (sh.follow ? sh.follow.dy || 0 : 0) + (sh.oy || 0);
  const I = sh.intensity;
  const lean = 10 * I;
  const lx = Math.sin(env.angle) * Math.abs(env.drx * lean);
  const ly = Math.cos(env.angle) * Math.abs(env.dry * lean);
  const j = env.Ui * 0.5 * (0.4 + I * 0.08);
  const sy = sh.sy === undefined ? 1 : sh.sy;
  const cy = sh.cy || 0;
  const sx = sh.sx === undefined ? 1 : sh.sx;
  const cx = sh.cx || 0;
  const drop = sh.drop || 0;
  const dw = sh.dropW;
  const P = (i) => {
    const k = ((i % n) + n) % n;
    const o = offs[k];
    if (!env.frozen) {
      o[0] += (lx + (Math.random() - .5) * j - o[0]) * FRICTION;
      o[1] += (ly + (Math.random() - .5) * j - o[1]) * FRICTION;
    }
    const x = cx + (pts[k][0] - cx) * sx + fdx + o[0];
    const y = cy + (pts[k][1] - cy) * sy + fdy + o[1] + drop * (dw ? dw[k] : 1);
    return [x, y];
  };
  ctx.beginPath();
  if (sh.closed) {
    const a = P(n - 1), b = P(0);
    ctx.moveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    for (let i = 0; i < n; i++) { const p = P(i), q = P(i + 1); ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
    ctx.closePath();
  } else {
    const p0 = P(0);
    ctx.moveTo(p0[0], p0[1]);
    for (let i = 1; i < n - 1; i++) { const p = P(i), q = P(i + 1); ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
    const pl = P(n - 1);
    ctx.lineTo(pl[0], pl[1]);
  }
  const alpha = sh.alpha * (sh.alphaMul === undefined ? 1 : sh.alphaMul);
  if (alpha !== 1) ctx.globalAlpha = alpha;
  if (sh.fill) { ctx.fillStyle = sh.fill; ctx.fill(); }
  if (sh.stroke) { ctx.strokeStyle = sh.stroke; ctx.lineWidth = sh.lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
  if (alpha !== 1) ctx.globalAlpha = 1;
}

const SENS_DEFAULTS = { mouthGain: 1, mouthWidth: 1, openHeight: 1, puckerFx: 1, gazeGain: 1, blinkGain: 1, headGain: 1, smooth: 1 };
function loadCritterCfg(id) {
  try { return JSON.parse(localStorage.getItem('critter-cfg:' + id)) || {}; } catch (e) { return {}; }
}
function saveCritterCfg(id, cfg) {
  try { localStorage.setItem('critter-cfg:' + id, JSON.stringify(cfg)); } catch (e) {}
}
