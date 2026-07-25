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
  { name: 'noir',  mono: true,  bg: '#131417', face: ['#23262b', '#2e3238'], line: '#e8e6df', ear: '#4a4f57', eye: '#e8e6df', pupil: '#131417', nose: '#4a4f57', horn: '#ffd23f', mouth: '#7a7e85', teeth: '#e8e6df' },
  /* --------------------------------------------------------------------------
     A partir daqui ficam fora do W_PALETTE de propósito: nunca saem por sorteio,
     só à mão no studio. O ID escolhe a paleta por pesos acumulados, portanto
     mexer na tabela do sorteio mudaria a cor de todos os critters já gerados.
     -------------------------------------------------------------------------- */
  { name: 'dusk',   bg: '#221a35', face: ['#6b5b95', '#7d6ba8'], line: '#150f24', ear: '#c86b98', eye: '#f3eaff', pupil: '#150f24', nose: '#c86b98', horn: '#ffd23f', mouth: '#e0729a', teeth: '#f3eaff' },
  { name: 'coral',  bg: '#fff0eb', face: ['#ff9d8a', '#ffb3a3'], line: '#5c2a28', ear: '#ff6f61', eye: '#fff7f4', pupil: '#5c2a28', nose: '#ff6f61', horn: '#3ec9b8', mouth: '#d94f45', teeth: '#fff7f4' },
  { name: 'mint',   bg: '#e8f7f0', face: ['#a8e6c8', '#c2eeda'], line: '#1e4636', ear: '#6fc9a0', eye: '#f7fffb', pupil: '#1e4636', nose: '#6fc9a0', horn: '#ffb84d', mouth: '#4a9c78', teeth: '#f7fffb' },
  { name: 'clay',   bg: '#f2e6dc', face: ['#c97b5a', '#d99276'], line: '#40241a', ear: '#8c4f36', eye: '#fdf4ee', pupil: '#40241a', nose: '#8c4f36', horn: '#4a7c8c', mouth: '#8c4f36', teeth: '#fdf4ee' },
  { name: 'ice',    bg: '#eef4fa', face: ['#cfe3f5', '#e0edf9'], line: '#24435c', ear: '#8fbadb', eye: '#fbfdff', pupil: '#24435c', nose: '#8fbadb', horn: '#f2a2b8', mouth: '#6f9fc4', teeth: '#fbfdff' },
  { name: 'neon',   bg: '#0d0d14', face: ['#1f2233', '#2a2e44'], line: '#39ffb0', ear: '#ff3f8e', eye: '#39ffb0', pupil: '#0d0d14', nose: '#ff3f8e', horn: '#ffe74c', mouth: '#ff3f8e', teeth: '#39ffb0' },
  { name: 'butter', bg: '#fff8e1', face: ['#ffe08a', '#ffeaa8'], line: '#5c4415', ear: '#e8a33d', eye: '#fffdf5', pupil: '#5c4415', nose: '#e8a33d', horn: '#7fb069', mouth: '#d4813a', teeth: '#fffdf5' },
  { name: 'plum',   bg: '#f6ebf5', face: ['#d9a7cd', '#e6bfdc'], line: '#4a1f42', ear: '#a35590', eye: '#fdf7fc', pupil: '#4a1f42', nose: '#a35590', horn: '#6fc9a0', mouth: '#a3557f', teeth: '#fdf7fc' }
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
/* 'rigged' fica fora dos pesos de propósito: nunca sai por sorteio, só é escolhida à mão
   no studio. É a boca desenhada para o rig — ver RIG_VISEMES. */
const MOUTH_STYLES = ['smile', 'chill', 'mad', 'open', 'fangs', 'tongue', 'w', 'zigzag', 'o', 'grin', 'smirk', 'rigged'];
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

  for (let k = 0; k < shapes.length; k++) shapes[k].role = 'ear';
  const faceIdx = shapes.length;
  addShape(shapes, headPts, { fill: face, stroke: pal.line, lw: 4.5, role: 'face' }, rng, 5);

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

  let noseBotY = null;
  const noseStart = shapes.length;
  if (sp.beak) {
    addShape(shapes, wobblyPoly([[-sp.beak * 0.55, botY * 0.02], [sp.beak * 0.55, botY * 0.02], [0, botY * 0.02 + sp.beak]], 3, 4, rng),
      { fill: pal.horn, stroke: pal.line }, rng, 10);
    noseBotY = botY * 0.02 + sp.beak;
  } else if (sp.nose === 'snout') {
    addShape(shapes, wobblyCircle(0, botY * 0.34 + noseDy, 27, 17, 10, 3.5, rng), { fill: face, stroke: pal.line, lw: 3 }, rng, 10);
    addShape(shapes, wobblyPoly([[-10, botY * 0.26 + noseDy], [10, botY * 0.26 + noseDy], [0, botY * 0.26 + noseDy + 11]], 2, 3, rng),
      { fill: pal.nose, stroke: pal.line, lw: 2 }, rng, 10);
    noseBotY = botY * 0.34 + noseDy + 17;
  } else if (sp.nose === 'pig') {
    addShape(shapes, wobblyCircle(0, botY * 0.22 + noseDy, 17, 12, 10, 3, rng), { fill: pal.nose, stroke: pal.line, lw: 2.5 }, rng, 10);
    for (const s of [-1, 1]) {
      addShape(shapes, wobblyCircle(s * 7, botY * 0.22 + noseDy, 3, 4, 6, 1.5, rng), { fill: pal.line, stroke: null }, rng, 10);
    }
    noseBotY = botY * 0.22 + noseDy + 12;
  } else if (sp.nose === 'round') {
    addShape(shapes, wobblyCircle(0, botY * 0.2 + noseDy, 13, 9, 10, 3, rng), { fill: pal.nose, stroke: pal.line, lw: 2.5 }, rng, 10);
    noseBotY = botY * 0.2 + noseDy + 9;
  } else if (sp.nose === 'dots') {
    for (const s of [-1, 1]) {
      addShape(shapes, wobblyCircle(s * 9, botY * 0.12 + noseDy, 3.5, 3.5, 6, 1.5, rng), { fill: pal.nose, stroke: pal.line, lw: 1.5 }, rng, 10);
    }
    noseBotY = botY * 0.12 + noseDy + 3.5;
  } else if (sp.nose === 'tri') {
    addShape(shapes, wobblyPoly([[-9, botY * 0.14 + noseDy], [9, botY * 0.14 + noseDy], [0, botY * 0.14 + noseDy + 10]], 2, 3, rng),
      { fill: pal.nose, stroke: pal.line, lw: 2 }, rng, 10);
    noseBotY = botY * 0.14 + noseDy + 10;
  }

  for (let k = noseStart; k < shapes.length; k++) shapes[k].role = 'nose';

  if (acc === 'nosering' && !sp.beak && sp.nose !== 'none' && sp.nose !== 'dots') {
    const ny = sp.nose === 'snout' ? botY * 0.46 : botY * 0.32;
    addShape(shapes, wobblyCircle(0, ny, 7, 7, 8, 2, rng), { fill: null, stroke: ringColor, lw: 2.5 }, rng, 10);
    extras.push('nosering');
  }

  const mouthStart = shapes.length;
  const mouthStyle = MOUTH_STYLES[t.mouth];
  const my = myBase, mw = Math.min(34, mouthRx * 0.55), mh = 24;
  const smileArcY = (tx) => my - 12 + mh * Math.sin(Math.PI * Math.max(0, Math.min(1, (tx + mw) / (2 * mw))));
  let teethCurve = null, teethH = 0;

  if (mouthStyle === 'smile') {
    addShape(shapes, wobblyArc(0, my - 12, mw, mh, 0.1, Math.PI - 0.1, 12, 4, rng), { fill: null, stroke: pal.line, closed: false, lw: 3.5, part: 'lip' }, rng, 8);
    teethCurve = smileArcY; teethH = 7 + rng() * 4;
  } else if (mouthStyle === 'chill') {
    addShape(shapes, wobblyArc(0, my - 6, mw * 0.8, 5, 0.1, Math.PI - 0.1, 10, 3, rng), { fill: null, stroke: pal.line, closed: false, lw: 3, part: 'lip' }, rng, 8);
  } else if (mouthStyle === 'mad') {
    addShape(shapes, wobblyArc(0, my + 12, mw * 0.9, 18, Math.PI + 0.15, Math.PI * 2 - 0.15, 12, 4, rng), { fill: null, stroke: pal.line, closed: false, lw: 3.5, part: 'lip' }, rng, 8);
  } else if (mouthStyle === 'open') {
    addShape(shapes, wobblyCircle(0, my - 2, mw * 0.75, mh * 0.8, 12, 4, rng), { fill: pal.line, stroke: pal.line, lw: 2, part: 'hole' }, rng, 8);
    addShape(shapes, wobblyCircle(0, my + mh * 0.35, mw * 0.38, mh * 0.28, 10, 3, rng), { fill: pal.mouth, stroke: null, part: 'throat' }, rng, 8);
    teethCurve = () => my - 2 - mh * 0.62; teethH = mh * 0.55;
  } else if (mouthStyle === 'fangs') {
    addShape(shapes, wobblyArc(0, my - 12, mw, mh, 0.1, Math.PI - 0.1, 12, 4, rng), { fill: null, stroke: pal.line, closed: false, lw: 3.5, part: 'lip' }, rng, 8);
    for (const s of [-1, 1]) {
      const fx = s * mw * 0.62, fy = smileArcY(fx);
      addShape(shapes, wobblyPoly([[fx - 7, fy - 2], [fx + 7, fy - 2], [fx, fy + 16]], 2, 2.5, rng),
        { fill: pal.teeth, stroke: pal.line, lw: 1.8, part: 'teeth' }, rng, 8);
    }
  } else if (mouthStyle === 'tongue') {
    addShape(shapes, wobblyArc(0, my - 12, mw, mh, 0.1, Math.PI - 0.1, 12, 4, rng), { fill: null, stroke: pal.line, closed: false, lw: 3.5, part: 'lip' }, rng, 8);
    const tx = (rng() - .5) * 1.1 * mw;
    const by = smileArcY(tx) - 2;
    const rot = tx / mw * 0.3;
    const cyT = by + 15;
    addShape(shapes, wobblyCircle(tx, cyT, 11, 16, 10, 3, rng, rot), { fill: pal.mouth, stroke: pal.line, lw: 2.5, part: 'tongue' }, rng, 9);
    const l0 = rotatePt(tx, cyT - 8, tx, cyT, rot);
    const l1 = rotatePt(tx, cyT + 8, tx, cyT, rot);
    addShape(shapes, [l0, l1], { fill: null, stroke: pal.line, closed: false, lw: 1.8, part: 'tongue' }, rng, 9);
  } else if (mouthStyle === 'w') {
    for (const s of [-1, 1]) {
      addShape(shapes, wobblyArc(s * 11, my - 8, 11, 9, 0.05, Math.PI - 0.05, 8, 2.5, rng), { fill: null, stroke: pal.line, closed: false, lw: 3, part: 'lip' }, rng, 8);
    }
  } else if (mouthStyle === 'zigzag') {
    const pts = [];
    const zw = mw * 1.3, n = 6;
    for (let i = 0; i <= n; i++) {
      pts.push([-zw / 2 + zw * i / n, my - 4 + (i % 2 === 0 ? -5 : 5) + (rng() - .5) * 3]);
    }
    addShape(shapes, pts, { fill: null, stroke: pal.line, closed: false, lw: 3.5, part: 'lip' }, rng, 8);
  } else if (mouthStyle === 'o') {
    addShape(shapes, wobblyCircle(0, my - 4, 9 + rng() * 3, 10 + rng() * 4, 10, 3, rng), { fill: pal.line, stroke: pal.line, lw: 2, part: 'hole' }, rng, 8);
  } else if (mouthStyle === 'grin') {
    addShape(shapes, wobblyCircle(0, my - 4, mw * 0.95, mh * 0.55, 12, 4, rng), { fill: pal.line, stroke: pal.line, lw: 2, part: 'hole' }, rng, 8);
    const n = 5 + t.wild % 3;
    for (let i = 0; i < n; i++) {
      const tx = -mw * 0.72 + mw * 1.44 * i / (n - 1);
      addShape(shapes, wobblyPoly([[tx - 6, my - 4 - mh * 0.4], [tx + 6, my - 4 - mh * 0.4], [tx, my - 4 + mh * 0.12]], 2, 1.8, rng),
        { fill: pal.teeth, stroke: null, part: 'teeth' }, rng, 8);
    }
  } else if (mouthStyle === 'smirk') {
    addShape(shapes, wobblyArc(mw * 0.3, my - 10, mw * 0.7, mh * 0.75, 0.15, Math.PI * 0.85, 10, 3.5, rng, -0.12),
      { fill: null, stroke: pal.line, closed: false, lw: 3.5, part: 'lip' }, rng, 8);
  } else if (mouthStyle === 'rigged') {
    /* Boca desenhada para o rig: lábio de cima e de baixo são duas cadeias do mesmo
       comprimento que partilham os cantos, e o contorno fechado entre elas é o interior
       da boca. Em repouso as duas cadeias coincidem, portanto lê-se como uma linha.
       O applyRig reescreve estes pontos a partir dos visemes; o que fica gravado aqui é
       a bind pose (e o wobble por vértice, para não perder o traço à mão). */
    /* bind pose = a boca 'chill': o mesmo arco, a mesma largura, a mesma curvatura
       relaxada. O que muda é a topologia por baixo. */
    const N = RIG_MOUTH_N;
    const rx = mw * 0.8, ry = 5, cyM = my - 6;
    const a0 = Math.PI - 0.1, a1 = 0.1;
    const wob = [];
    for (let i = 0; i < N * 2; i++) wob.push([(rng() - .5) * 2.4, (rng() - .5) * 2.2]);
    const rest = [];
    for (let i = 0; i < N; i++) {
      const a = a0 + (a1 - a0) * i / (N - 1);
      rest.push([Math.cos(a) * rx + wob[i][0], cyM + Math.sin(a) * ry + wob[i][1] * 0.5]);
    }
    const pts = rest.map(p => [p[0], p[1]]);
    for (let i = N - 2; i > 0; i--) pts.push([rest[i][0], rest[i][1]]);
    addShape(shapes, pts, {
      fill: pal.line, stroke: pal.line, lw: 3, part: 'rigMouth',
      vN: N, vRx: rx, vRy: ry, vA0: a0, vA1: a1, vCx: 0, vCy: cyM, vWob: wob
    }, rng, 8);
  }

  if ((mouthStyle === 'smile' || mouthStyle === 'open') && (topStyle === 'horns' || t.wild % 4 === 2)) {
    const n = 2 + t.wild % 3;
    const lim = mouthStyle === 'open' ? mw * 0.5 : mw * 0.75;
    for (let i = 0; i < n; i++) {
      const tx = -lim + 2 * lim * (n === 1 ? 0.5 : i / (n - 1));
      const by = teethCurve(tx);
      const w = 8 + rng() * 4, h = Math.min(teethH, 7 + rng() * 6);
      addShape(shapes, wobblyPoly([[tx - w / 2, by], [tx + w / 2, by], [tx, by + h]], 2, 2, rng),
        { fill: pal.teeth, stroke: pal.line, lw: 1.8, part: 'teeth' }, rng, 8);
    }
  }

  if (sp.name === 'rabbit' && t.wild >= 29 && (mouthStyle === 'smile' || mouthStyle === 'chill' || mouthStyle === 'w')) {
    const by = mouthStyle === 'smile' ? smileArcY(0) : my - 6;
    for (const s of [-1, 1]) {
      addShape(shapes, wobblyPoly([[s * 8 - 6, by], [s * 8 + 6, by], [s * 8 + 5, by + 14], [s * 8 - 5, by + 14]], 2, 2, rng),
        { fill: pal.teeth, stroke: pal.line, lw: 1.8, part: 'teeth' }, rng, 8);
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
    for (const s of moved) s.role = 'ear';
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
  return {
    /* cópia da paleta: o studio escreve em palette.bg e não pode contaminar PALETTES */
    id, shapes, traits: traitList, palette: Object.assign({}, pal), eyes: eyePos,
    mouth: { y: my, mw, mh, style: mouthStyle },
    face, topY, botY, rx, ry, faceCy: (topY + botY) / 2,
    noseBotY: noseBotY === null ? my - mh * 0.8 : noseBotY
  };
}

const FRICTION = 0.2;

function drawPath(ctx, sh, env, outPath) {
  const pts = sh.pts, offs = sh.offs, n = pts.length;
  const fdx = (sh.follow ? sh.follow.dx || 0 : 0) + (sh.ox || 0);
  const fdy = (sh.follow ? sh.follow.dy || 0 : 0) + (sh.oy || 0);
  const I = sh.intensity;
  const lean = 10 * I;
  const lx = Math.sin(env.angle) * Math.abs(env.drx * lean);
  const ly = Math.cos(env.angle) * Math.abs(env.dry * lean);
  const j = env.Ui * 0.5 * (0.4 + I * 0.08) * (sh.jit === undefined ? 1 : sh.jit);
  const sy = sh.sy === undefined ? 1 : sh.sy;
  const cy = sh.cy || 0;
  const sx = sh.sx === undefined ? 1 : sh.sx;
  const cx = sh.cx || 0;
  const drop = sh.drop || 0;
  const dw = sh.dropW;
  const warp = sh.noWarp ? null : env.warp;
  const P = (i) => {
    const k = ((i % n) + n) % n;
    const o = offs[k];
    if (!env.frozen) {
      o[0] += (lx + (Math.random() - .5) * j - o[0]) * FRICTION;
      o[1] += (ly + (Math.random() - .5) * j - o[1]) * FRICTION;
    }
    let x = cx + (pts[k][0] - cx) * sx + fdx + o[0];
    let y = cy + (pts[k][1] - cy) * sy + fdy + o[1] + drop * (dw ? dw[k] : 1);
    if (warp) {
      /* a cabeça é uma bola: cada ponto vive numa latitude/longitude da esfera e desliza
         pela superfície quando ela roda. Tudo o que está na cara anda junto, e a
         compressão junto ao bordo aparece sozinha (a derivada de sin é cos) — é o
         "trás estreita, frente alarga" do rigging 2D. A esfera é ligeiramente maior que
         a cara (as margens acima), logo quem trata do contorno é a clipping mask. */
      const HP = Math.PI / 2;
      const la = Math.asin(Math.max(-1, Math.min(1, (y - warp.cy) / warp.ry)));
      const lo = Math.asin(Math.max(-1, Math.min(1, (x - warp.cx) / warp.rx)));
      /* quem já está perto do bordo roda menos — numa esfera o deslocamento projectado
         é máximo ao centro (a derivada de sin é cos) e é o soft-limit que impede um olho
         de ser cortado pela silhueta quando a cabeça inclina a fundo */
      const dampY = 1 - Math.abs(la) / HP * 0.55;
      const dampX = 1 - Math.abs(lo) / HP * 0.55;
      const la2 = Math.max(-HP, Math.min(HP, la + warp.ay * dampY));
      const lo2 = Math.max(-HP, Math.min(HP, lo + warp.ax * dampX));
      /* meridianos convergem: o que roda para o bordo também estreita na horizontal */
      const shrink = Math.max(0.7, Math.min(1.25, Math.cos(la2) / Math.max(0.2, Math.cos(la))));
      y = warp.cy + warp.ry * Math.sin(la2);
      x = warp.cx + warp.rx * Math.sin(lo2) * (1 + (shrink - 1) * warp.persp);
    }
    return [x, y];
  };
  /* outPath: guarda a geometria num Path2D (para servir de clipping mask) em vez de
     desenhar directamente no contexto */
  const sink = outPath || ctx;
  if (!outPath) ctx.beginPath();
  if (sh.closed) {
    const a = P(n - 1), b = P(0);
    sink.moveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    for (let i = 0; i < n; i++) { const p = P(i), q = P(i + 1); sink.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
    sink.closePath();
  } else {
    const p0 = P(0);
    sink.moveTo(p0[0], p0[1]);
    for (let i = 1; i < n - 1; i++) { const p = P(i), q = P(i + 1); sink.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
    const pl = P(n - 1);
    sink.lineTo(pl[0], pl[1]);
  }
  const alpha = sh.alpha * (sh.alphaMul === undefined ? 1 : sh.alphaMul);
  if (alpha !== 1) ctx.globalAlpha = alpha;
  if (sh.fill) { ctx.fillStyle = sh.fill; outPath ? ctx.fill(outPath) : ctx.fill(); }
  if (sh.stroke) {
    ctx.strokeStyle = sh.stroke; ctx.lineWidth = sh.lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    outPath ? ctx.stroke(outPath) : ctx.stroke();
  }
  if (alpha !== 1) ctx.globalAlpha = 1;
}

/* ==========================================================================
   rig facial — partilhado por rigged.html e studio.html
   ========================================================================== */

const rigClamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* --------------------------------------------------------------------------
   Visemes da boca 'rigged'. Cada pose é o contorno da abertura como uma
   superelipse: largura, quanto sobe o lábio de cima, quanto desce o de baixo
   (ambos em fracção do budget que a geometria da cara permite) e o expoente
   (2 = elipse; mais alto = fenda de cantos quadrados). Misturam-se linearmente,
   como blendshapes — não há "pose seleccionada", há pesos.
   -------------------------------------------------------------------------- */
const RIG_MOUTH_N = 15;
/* `ratio` é altura/largura da abertura, não uma medida absoluta: é o que garante que o
   "O" é redondo em qualquer cara, em vez de depender do espaço que aquela cara tem entre
   o nariz e o queixo. `upShare` reparte a abertura entre o lábio de cima e o de baixo
   (a mandíbula faz a maior parte do trabalho). */
/* `own` é a abertura que o próprio viseme exige, independente da mandíbula: um "O" faz-se
   com os lábios, com o queixo pouco aberto, e sem isto nunca chegava a ser redondo. */
const RIG_VISEMES = {
  /*        largura   altura/largura  quota de cima  abertura própria  expoente */
  rest:   { rx: 1.00, ratio: 0.00, upShare: 0.25, own: 0.00, p: 2.0 },  /* linha */
  A:      { rx: 0.96, ratio: 0.82, upShare: 0.28, own: 0.00, p: 2.0 },  /* "aah" — queixo */
  /* E e I não têm abertura própria de propósito: o que os distingue é a largura, e um
     sorriso de boca fechada dá stretch a rodos — com abertura própria abriam a boca */
  E:      { rx: 1.26, ratio: 0.28, upShare: 0.32, own: 0.00, p: 2.6 },  /* "eee" — fenda larga */
  I:      { rx: 1.12, ratio: 0.20, upShare: 0.30, own: 0.00, p: 2.4 },  /* "ih" */
  O:      { rx: 0.52, ratio: 1.00, upShare: 0.38, own: 1.00, p: 2.0 },  /* "oh" — círculo */
  U:      { rx: 0.42, ratio: 0.78, upShare: 0.35, own: 0.35, p: 2.0 }   /* "ooo" — bico */
};

/* Pesos dos visemes a partir dos sinais da cara (o "viseme solver"). A zona morta existe
   porque o tracker nunca dá zero com a cara em repouso — sem ela, o resto de pucker e de
   stretch de uma cara parada mantinha a boca do avatar entreaberta. */
function rigVisemeWeights(sig, SENS) {
  const fx = SENS && SENS.puckerFx !== undefined ? SENS.puckerFx : 1;
  const dead = (v, d) => rigClamp((v - d) / (1 - d), 0, 1);
  const open = rigClamp(sig.mouth, 0, 1);
  const pk = dead(rigClamp(sig.pucker, 0, 1), 0.12);
  const fn = dead(rigClamp(sig.funnel, 0, 1), 0.12);
  const st = dead(rigClamp(sig.mouthW * 2, 0, 1), 0.1);
  const w = {
    U: pk * 1.4 * fx,               /* é aqui que o slider 'pucker fx' entra nos visemes */
    O: fn * 2.2 * fx,               /* generoso, para o "O" sair mesmo redondo */
    E: st * (1 - open * 0.5),
    I: st * open * 0.5,
    A: open
  };
  let sum = 0;
  for (const k in w) { w[k] = Math.max(0, w[k]); sum += w[k]; }
  w.rest = Math.max(0, 1 - sum);
  sum += w.rest;
  for (const k in w) w[k] /= sum || 1;
  return w;
}

/* mistura das poses → os parâmetros que qualquer boca do rig consome */
function rigVisemeDrive(sig, SENS) {
  const w = rigVisemeWeights(sig, SENS);
  const d = { rx: 0, ratio: 0, upShare: 0, own: 0, p: 0 };
  for (const k in w) {
    const v = RIG_VISEMES[k];
    d.rx += w[k] * v.rx; d.ratio += w[k] * v.ratio;
    d.upShare += w[k] * v.upShare; d.own += w[k] * v.own; d.p += w[k] * v.p;
  }
  d.amount = Math.max(rigClamp(sig.mouth, 0, 1), d.own);
  return d;
}

/* perfil da abertura ao longo da boca: 0 nos cantos, 1 ao centro */
function rigProfile(t, p) {
  return Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t), p)), 1 / p);
}

const rigDist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function rigCentroid(pts) {
  let x = 0, y = 0;
  for (const p of pts) { x += p[0]; y += p[1]; }
  return [x / pts.length, y / pts.length];
}

function rigBounds(pts) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of pts) {
    if (p[0] < x0) x0 = p[0];
    if (p[0] > x1) x1 = p[0];
    if (p[1] < y0) y0 = p[1];
    if (p[1] > y1) y1 = p[1];
  }
  return { x0, x1, y0, y1 };
}

/* janela de entrada do queixo, acima do neutro calibrado, que corresponde ao curso todo
   da boca do avatar. `JAW` é o blendshape, `LIP` a abertura entre os lábios interiores
   sobre a altura da cara. Subir estes números torna a boca mais contida; descer, mais
   solta — é o mesmo botão que o `mouth gain`, mas para toda a gente. */
const RIG_JAW_SPAN = 0.42;
const RIG_LIP_SPAN = 0.085;

function createSig() {
  return {
    blinkL: 1, blinkR: 1, mouth: 0, mouthW: 0, expr: 0, yaw: 0, pitch: 0, roll: 0,
    gx: 0, gy: 0, hx: 0, hy: 0, joy: 0, sad: 0, surprise: 0, anger: 0, wide: 0,
    pucker: 0, stretch: 0, jawX: 0, funnel: 0
  };
}

function createCalib() {
  return { ready: null, frames: 0, acc: { ear: 0, mouth: 0, jaw: 0, yaw: 0, pitch: 0, roll: 0, hx: 0, hy: 0, mouthW: 0, gx: 0, gy: 0 } };
}

/* devolve true quando a calibração já terminou (i.e. o sig está a ser escrito) */
function processLandmarks(lm, bs, sig, cal, SENS) {
  const earL = rigDist(lm[159], lm[145]) / rigDist(lm[33], lm[133]);
  const earR = rigDist(lm[386], lm[374]) / rigDist(lm[362], lm[263]);
  const faceH = rigDist(lm[10], lm[152]);
  const mouthR = rigDist(lm[13], lm[14]) / faceH;
  const mouthW = rigDist(lm[61], lm[291]) / faceH;

  const rollRaw = Math.atan2(lm[263].y - lm[33].y, lm[263].x - lm[33].x);
  const midX = (lm[234].x + lm[454].x) / 2;
  const halfW = Math.abs(lm[454].x - lm[234].x) / 2 + 1e-6;
  const yawRaw = rigClamp(-(lm[1].x - midX) / halfW, -1.2, 1.2);
  const pitchRaw = ((lm[10].y + lm[152].y) / 2 - lm[1].y) / (lm[152].y - lm[10].y);
  const hxRaw = (0.5 - lm[1].x) * 2;
  const hyRaw = (lm[1].y - 0.5) * 2;

  let gazeX = 0, gazeY = 0;
  if (bs) {
    gazeX = rigClamp(-(bs.eyeLookOutLeft + bs.eyeLookInRight - bs.eyeLookInLeft - bs.eyeLookOutRight) * 1.3 * SENS.gazeGain, -1, 1);
    gazeY = rigClamp((bs.eyeLookDownLeft + bs.eyeLookDownRight - bs.eyeLookUpLeft - bs.eyeLookUpRight) * 1.1 * SENS.gazeGain, -1, 1);
  } else {
    const eyeW = rigDist(lm[33], lm[133]);
    gazeX = rigClamp(-((lm[468].x - (lm[33].x + lm[133].x) / 2) / eyeW) * 2.4, -1, 1);
    gazeY = rigClamp(((lm[468].y - (lm[159].y + lm[145].y) / 2) / (rigDist(lm[159], lm[145]) + 0.001)) * 0.8, -1, 1);
  }

  if (!cal.ready) {
    cal.frames++;
    const a = cal.acc;
    a.ear += (earL + earR) / 2;
    a.mouth += mouthR;
    a.jaw += bs ? bs.jawOpen : 0;
    a.yaw += yawRaw; a.pitch += pitchRaw; a.roll += rollRaw;
    a.hx += hxRaw; a.hy += hyRaw; a.mouthW += mouthW;
    a.gx += gazeX; a.gy += gazeY;
    if (cal.frames >= 50) {
      const n = cal.frames;
      cal.ready = {
        ear: a.ear / n, mouth: a.mouth / n, jaw: a.jaw / n, mouthW: a.mouthW / n,
        yaw: a.yaw / n, pitch: a.pitch / n, roll: a.roll / n,
        hx: a.hx / n, hy: a.hy / n, gx: a.gx / n, gy: a.gy / n
      };
    }
    return false;
  }
  const calib = cal.ready;

  if (bs) {
    /* Remapeamento de range fixo, como nas ferramentas de VTuber: o tracker nunca usa o
       range 0–1 (a fala pica o jawOpen a 0.12–0.18) e o queixo tem activação basal — daí
       a janela de entrada explícita, com o zero a vir da calibração desta cara.
       Fixo e não adaptativo de propósito: normalizar pelo pico da própria pessoa fazia
       qualquer fala ocupar o curso todo, do 8 para o 80.
       Dois sinais independentes, fica o maior: o blendshape do queixo e a abertura entre
       os lábios interiores medida nos landmarks. Um apanha o que o outro falha. */
    const openBS = (bs.jawOpen - (calib.jaw || 0) - 0.02) / RIG_JAW_SPAN;
    const openLM = (mouthR - calib.mouth - 0.004) / RIG_LIP_SPAN;
    const jaw = rigClamp(Math.pow(rigClamp(Math.max(openBS, openLM), 0, 1), 0.85) * SENS.mouthGain, 0, 1);
    const press = rigClamp(bs.mouthClose + (bs.mouthPressLeft + bs.mouthPressRight) / 2, 0, 1);
    const pucker = rigClamp(bs.mouthPucker, 0, 1);
    sig.funnel += (rigClamp(bs.mouthFunnel, 0, 1) - sig.funnel) * 0.4;
    const openT = jaw * (1 - 0.6 * press) * (1 - 0.35 * pucker);
    /* fecha quase tão depressa como abre: entre sílabas a boca tem mesmo de voltar, senão
       a fala corrida lê-se como uma boca permanentemente entreaberta */
    sig.mouth += (openT - sig.mouth) * rigClamp((openT > sig.mouth ? 0.6 : 0.45) * SENS.smooth, 0.05, 1);
    const smile = (bs.mouthSmileLeft + bs.mouthSmileRight) / 2;
    const frown = (bs.mouthFrownLeft + bs.mouthFrownRight) / 2;
    sig.expr += (rigClamp(smile - frown, -1, 1) - sig.expr) * 0.25;
    const smileB = rigClamp(smile * 1.8, 0, 1);
    const frownB = rigClamp(frown * 1.8, 0, 1);
    const squint = (bs.eyeSquintLeft + bs.eyeSquintRight) / 2;
    sig.joy += (rigClamp(smileB * 0.7 + squint * 0.8, 0, 1) - sig.joy) * 0.3;
    sig.sad += (rigClamp(frownB * 0.6 + bs.browInnerUp * frownB * 0.8, 0, 1) - sig.sad) * 0.3;
    const wide = (bs.eyeWideLeft + bs.eyeWideRight) / 2;
    const browUp = (bs.browInnerUp + (bs.browOuterUpLeft + bs.browOuterUpRight) / 2) / 2;
    sig.surprise += (rigClamp(wide * 0.9 + browUp * 0.9, 0, 1) - sig.surprise) * 0.3;
    sig.anger += (rigClamp((bs.browDownLeft + bs.browDownRight) * 0.9, 0, 1) - sig.anger) * 0.3;
    sig.wide += (rigClamp(wide * 1.5, 0, 1) - sig.wide) * 0.3;
    const stretch = rigClamp((bs.mouthStretchLeft + bs.mouthStretchRight) / 2, 0, 1);
    sig.pucker += (pucker - sig.pucker) * 0.4;
    sig.stretch += (stretch - sig.stretch) * 0.4;
    sig.mouthW += (rigClamp((stretch - pucker) * 0.8, -0.5, 0.5) - sig.mouthW) * 0.3;
    sig.jawX += (rigClamp((bs.mouthRight - bs.mouthLeft) + (bs.jawRight - bs.jawLeft) * 0.6, -1, 1) - sig.jawX) * 0.35;
    sig.blinkL += (rigClamp(1 - bs.eyeBlinkRight * 1.6 * SENS.blinkGain, 0.02, 1) - sig.blinkL) * 0.5;
    sig.blinkR += (rigClamp(1 - bs.eyeBlinkLeft * 1.6 * SENS.blinkGain, 0.02, 1) - sig.blinkR) * 0.5;
  } else {
    const tBlinkL = rigClamp((earL - calib.ear * 0.45) / (calib.ear * 0.45), 0.05, 1);
    const tBlinkR = rigClamp((earR - calib.ear * 0.45) / (calib.ear * 0.45), 0.05, 1);
    sig.blinkL += (tBlinkL - sig.blinkL) * 0.45;
    sig.blinkR += (tBlinkR - sig.blinkR) * 0.45;
    const openT = rigClamp(Math.pow(rigClamp((mouthR - calib.mouth * 1.1) / 0.05, 0, 1), 0.8), 0, 1);
    sig.mouth += (openT - sig.mouth) * (openT > sig.mouth ? 0.6 : 0.25);
    const wT = rigClamp((mouthW - calib.mouthW) / calib.mouthW, -0.25, 0.4);
    sig.mouthW += (wT - sig.mouthW) * 0.3;
    const cornerY = (lm[61].y + lm[291].y) / 2;
    const exprT = rigClamp(-(cornerY - lm[17].y) / faceH * 9, -1, 1);
    sig.expr += (exprT - sig.expr) * 0.3;
  }

  sig.gx += (rigClamp(gazeX - calib.gx, -1, 1) - sig.gx) * 0.35;
  sig.gy += (rigClamp(gazeY - calib.gy, -1, 1) - sig.gy) * 0.35;

  sig.roll += (rigClamp(-(rollRaw - calib.roll) * 2 * SENS.headGain, -1, 1) - sig.roll) * 0.2;
  sig.yaw += (rigClamp((yawRaw - calib.yaw) * 2.2 * SENS.headGain, -1.2, 1.2) - sig.yaw) * 0.2;
  sig.pitch += (rigClamp((pitchRaw - calib.pitch) * 6 * SENS.headGain, -1.2, 1.2) - sig.pitch) * 0.2;

  sig.hx += (rigClamp((hxRaw - calib.hx) * 2, -1.5, 1.5) - sig.hx) * 0.15;
  sig.hy += (rigClamp((hyRaw - calib.hy) * 2, -1.5, 1.5) - sig.hy) * 0.15;
  return true;
}

/* modo rato: quando não há câmara/tracker */
function applyIdle(sig, mouse, W, H, st) {
  const mmx = (mouse.x - W / 2) / (W / 2), mmy = (mouse.y - H / 2) / (H / 2);
  sig.gx += (rigClamp(mmx, -1, 1) - sig.gx) * 0.1;
  sig.gy += (rigClamp(mmy, -1, 1) - sig.gy) * 0.1;
  sig.yaw += (mmx * 0.4 - sig.yaw) * 0.08;
  sig.pitch += (mmy * 0.3 - sig.pitch) * 0.08;
  sig.mouth += ((mouse.down ? 0.4 + Math.random() * 0.6 : 0) - sig.mouth) * 0.3;
  sig.expr += (rigClamp(-mmy * 1.2, -1, 1) - sig.expr) * 0.1;
  st.blinkTimer = (st.blinkTimer || 0) - 1;
  if (st.blinkTimer <= 0) st.blinkTimer = 120 + Math.random() * 200;
  const tb = st.blinkTimer < 8 ? 0.05 : 1;
  sig.blinkL += (tb - sig.blinkL) * 0.5;
  sig.blinkR += (tb - sig.blinkR) * 0.5;
}

/* --------------------------------------------------------------------------
   buildRig — prepara os deformadores a partir do modelo (bind pose).
   Convenções de rigging usadas na boca:
     · os cantos são âncoras: peso 0, nunca se movem com a mandíbula
     · lábio de cima e de baixo têm budgets de abertura separados, calculados
       aqui a partir do espaço real entre o nariz e o queixo (range of motion)
     · as peças interiores (língua, garganta) são filhas do lábio de baixo
     · o ruído dos pontos coincidentes é partilhado, para a boca fechada
       colapsar numa linha limpa em vez de ficar um cordão duplo
   -------------------------------------------------------------------------- */
function buildRig(model) {
  const pal = model.palette;
  const m = model.mouth;
  const rig = { eyes: [], brows: [], lip: null, holes: [], kids: [], viseme: null, jawDrop: 0 };

  for (const sh of model.shapes) {
    if (sh.role !== 'eye') continue;
    const c = rigCentroid(sh.pts);
    let best = 0, bestD = 1e9;
    model.eyes.forEach((e, i) => {
      const d = Math.hypot(c[0] - e[0], c[1] - e[1]);
      if (d < bestD) { bestD = d; best = i; }
    });
    sh.cy = model.eyes[best][1];
    rig.eyes.push({ sh, side: model.eyes.length === 1 ? 'B' : (best < model.eyes.length / 2 ? 'L' : 'R') });
  }

  const browEyes = model.eyes.slice(0, 2);
  if (browEyes.length === 2) {
    const rng = mulberry32(hashStr(model.id + ':brow'));
    let at = model.shapes.length;
    for (let i = model.shapes.length - 1; i >= 0; i--) if (model.shapes[i].role === 'eye') { at = i + 1; break; }
    const made = [];
    for (let bi = 0; bi < 2; bi++) {
      const [ex, ey, er] = browEyes[bi];
      const inner = bi === 0 ? 1 : -1;
      const pts = wobblyArc(ex, ey - er * 1.75, er * 1.05, er * 0.5, Math.PI * 1.08, Math.PI * 1.92, 8, 3, rng);
      const sh = {
        pts, offs: pts.map(() => [0, 0]), closed: false, lw: 4, alpha: 1, intensity: 8,
        fill: null, stroke: pal.line, role: 'browRig', oy: 0, drop: 0,
        dropW: pts.map(p => (p[0] - ex) / (er * 1.05) * inner)
      };
      made.push(sh);
      rig.brows.push({ sh });
    }
    model.shapes.splice(at, 0, ...made);
  }

  /* A bola é para a boca e o nariz — as peças que antes não acompanhavam a cabeça e
     acabavam trocadas entre si. Os olhos e as sobrancelhas ficam de fora, com o lean
     de sempre: é o movimento amplo que dá vida à cara. Como a boca e o nariz passam a
     partilhar o mesmo deslocamento, o nariz nunca mais pode cair por baixo da boca. */
  for (const sh of model.shapes) {
    sh.noWarp = !(sh.role === 'mouth' || sh.role === 'nose');
    /* e acompanham a cara em vez de terem lean próprio (o nariz tinha 10, a boca 8) */
    if (!sh.noWarp) sh.intensity = 5;
  }

  const parts = { lip: [], hole: [], teeth: [], tongue: [], throat: [], rigMouth: [] };
  for (const sh of model.shapes) {
    if (sh.role !== 'mouth') continue;
    (parts[sh.part] || parts.lip).push(sh);
    /* a boca move-se solidária com a cara (mesma intensity) e sem ruído próprio:
       o jitter por ponto separaria as duas metades do lábio e faria "ferver" a fala */
    sh.intensity = 5;
    sh.jit = 0;
  }

  /* sem dentes no modo rig: não há mandíbula a que os prender de forma credível */
  for (const sh of parts.teeth) sh.alphaMul = 0;

  const chinY = model.botY - 7;
  const noseY = model.noseBotY + 3;

  /* boca 'rigged': o budget é o mesmo critério das outras — o espaço real que a cara
     tem entre o nariz e o queixo, medido uma vez aqui */
  for (const sh of parts.rigMouth) {
    /* medido na curva real da bind pose: os cantos em cima, o centro do arco em baixo */
    const top = sh.vCy + Math.sin(sh.vA1) * sh.vRy;
    const bot = sh.vCy + sh.vRy;
    sh.vUp = Math.max(4, top - noseY);
    sh.vDown = Math.max(6, chinY - bot);
    /* o levantar dos cantos também tem de caber: há caras em que a boca nasce colada ao
       nariz, e sem isto o sorriso metia-se por dentro dele */
    sh.vLiftUp = Math.min(7, Math.max(0, top - noseY));
    sh.vLiftDown = Math.min(7, Math.max(0, chinY - bot));
    rig.viseme = sh;
  }

  const lips = [];
  for (const sh of parts.lip) {
    const b = rigBounds(sh.pts);
    if (!sh.closed && b.x1 - b.x0 >= 6) lips.push({ sh, cx: (b.x0 + b.x1) / 2 });
    else sh.alphaMul = 0;
  }

  if (lips.length) {
    lips.sort((a, b) => a.cx - b.cx);
    const chain = [];
    for (const { sh } of lips) {
      let sp = sh.pts;
      if (sp[0][0] > sp[sp.length - 1][0]) sp = sp.slice().reverse();
      for (const p of sp) chain.push([p[0], p[1]]);
      sh.alphaMul = 0;
    }
    const n = chain.length;
    const c = rigCentroid(chain);
    /* w: peso do ponto na abertura (0 nos cantos), usado só para medir os budgets aqui —
       na deformação o perfil vem do viseme. uu: posição ao longo da cadeia. */
    const w = [], uu = [];
    for (let i = 0; i < n; i++) {
      w.push(Math.pow(Math.sin(Math.PI * i / (n - 1)), 1.3));
      uu.push(i / (n - 1));
    }

    /* range of motion: quanto pode cada lábio andar antes de sair da cara.
       Dividido pelo peso do ponto, para nenhum ponto passar o limite. */
    let down = Infinity, up = Infinity, liftUp = 7, liftDown = 7;
    for (let i = 0; i < n; i++) {
      const wi = Math.max(w[i], 1e-3), ci = Math.max(1 - w[i], 1e-3);
      /* o lábio de baixo alisa-se em direcção à linha entre os cantos, que nalgumas
         bocas (a 'mad', de cantos em baixo) fica *abaixo* do ponto original — é esse o
         ponto de partida a contar para o budget */
      const flat = chain[0][1] + (chain[n - 1][1] - chain[0][1]) * uu[i];
      const lowest = Math.max(chain[i][1], flat);
      down = Math.min(down, (chinY - lowest) / wi);
      up = Math.min(up, (chain[i][1] - noseY) / wi);
      liftUp = Math.min(liftUp, (chain[i][1] - noseY) / ci);
      liftDown = Math.min(liftDown, (chinY - lowest) / ci);
    }
    down = Math.max(0, down); up = Math.max(0, up);
    const budget = Math.min(down + up, Math.max(10, (chinY - noseY) * 0.85));
    const dn = Math.min(down, budget * 0.75);

    const offs = [];
    for (let i = 0; i < n; i++) offs.push([0, 0]);
    const sh = {
      pts: chain.map(p => [p[0], p[1]]).concat(chain.map(p => [p[0], p[1]]).reverse()),
      offs: offs.concat(offs.slice().reverse()),
      basePts: chain.map(p => [p[0], p[1]]),
      half: n, u: uu,
      halfW: Math.max(2, (rigBounds(chain).x1 - rigBounds(chain).x0) / 2),
      corner0: chain[0][1], corner1: chain[n - 1][1],
      closed: true, lw: lips[0].sh.lw, alpha: 1, alphaMul: 1, intensity: 5, jit: 0,
      fill: pal.line, stroke: pal.line, role: 'mouth', part: 'lipRig',
      cx: c[0], cy: c[1], sx: 1, sy: 1, ox: 0, oy: 0,
      down: dn, up: Math.min(up, budget - dn),
      liftUp: Math.max(0, liftUp), liftDown: Math.max(0, liftDown)
    };
    model.shapes.splice(model.shapes.indexOf(lips[0].sh), 0, sh);
    rig.lip = sh;
  }

  for (const sh of parts.hole) {
    const b = rigBounds(sh.pts);
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    sh.basePts = sh.pts.map(p => [p[0], p[1]]);
    sh.baseCx = cx; sh.baseCy = cy;
    sh.baseRx = Math.max(2, (b.x1 - b.x0) / 2);
    sh.baseRy = Math.max(2, (b.y1 - b.y0) / 2);
    sh.downMax = sh.baseRy + Math.max(0, chinY - b.y1);
    sh.upMax = sh.baseRy + Math.max(0, b.y0 - noseY);
    sh.liftUp = Math.min(7, Math.max(0, cy - noseY));
    sh.liftDown = Math.min(7, Math.max(0, chinY - cy));
    rig.holes.push(sh);
  }

  /* língua e garganta: filhas do lábio de baixo */
  for (const sh of parts.tongue.concat(parts.throat)) {
    const c = rigCentroid(sh.pts);
    const b = rigBounds(sh.pts);
    sh.cx = c[0]; sh.cy = c[1];
    sh.basePts = sh.pts.map(p => [p[0], p[1]]);
    rig.kids.push({ sh, throat: sh.part === 'throat', dropMax: Math.max(0, chinY - b.y1) });
  }
  return rig;
}

/* --------------------------------------------------------------------------
   applyRig — avalia o rig para o estado actual dos sinais.
   Ordem do stack: bind pose → mandíbula → largura → cantos → pucker → jawX
   -------------------------------------------------------------------------- */
function applyRig(model, rig, sig, SENS) {
  for (const b of rig.eyes) {
    const bl = b.side === 'L' ? sig.blinkL : b.side === 'R' ? sig.blinkR : (sig.blinkL + sig.blinkR) / 2;
    b.sh.sy = rigClamp(bl * (1 - sig.joy * 0.3) + sig.wide * 0.25, 0.03, 1.3);
    if (b.sh.follow) b.sh.follow.blinkScale = bl;
  }
  for (const br of rig.brows) {
    br.sh.oy = -sig.surprise * 14 + sig.anger * 7 - sig.joy * 2;
    br.sh.drop = (sig.anger - sig.sad) * 10;
  }

  const width = 1 + sig.mouthW * 0.55 * SENS.mouthWidth + Math.max(0, sig.expr) * 0.1;
  const smile = rigClamp(sig.expr, -1, 1);
  const shiftX = sig.jawX * 10;
  rig.jawDrop = 0;

  /* Os visemes comandam a abertura de qualquer boca — não há segundo caminho. O simples
     abrir/fechar existia antes deles e não sobreviveu à comparação. */
  const D = rigVisemeDrive(sig, SENS);
  const wx = width * D.rx;

  const L = rig.lip;
  if (L) {
    const H = D.amount * D.ratio * 2 * L.halfW * wx * SENS.openHeight;
    const up = Math.min(H * D.upShare, L.up);
    const dn = Math.min(H - H * D.upShare, L.down);
    const lift = smile * (smile > 0 ? L.liftUp : L.liftDown);
    const openK = L.down > 0 ? rigClamp(dn / L.down, 0, 1) : 0;
    const n = L.half;
    for (let i = 0; i < L.pts.length; i++) {
      const k = i < n ? i : 2 * n - 1 - i;
      const b = L.basePts[k];
      const w = rigProfile(-1 + 2 * L.u[k], D.p);
      L.pts[i][0] = L.cx + (b[0] - L.cx) * wx;
      if (i < n) {
        L.pts[i][1] = b[1] - up * w - lift * (1 - w);
      } else {
        /* o lábio de baixo é a mandíbula, e a mandíbula é lisa: à medida que a boca abre,
           vai deixando de copiar o desenho de cima (os dois lóbulos da 'w', os dentes da
           'zigzag') e assenta na linha entre os cantos */
        const flat = L.corner0 + (L.corner1 - L.corner0) * L.u[k];
        const y = b[1] + (flat - b[1]) * openK * 0.8;
        L.pts[i][1] = y + dn * w - lift * (1 - w);
      }
    }
    L.ox = shiftX;
    rig.jawDrop = dn;
  }

  const V = rig.viseme;
  if (V) {
    /* a altura sai da largura pela proporção do viseme — é isso que mantém o "O" redondo
       em qualquer cara — e é comandada pelo maior de dois: o queixo, ou o que o próprio
       viseme exige. Com a cara em repouso ambos são zero, portanto a boca fecha mesmo. */
    const halfW = V.vRx * D.rx * width;
    const H = D.amount * D.ratio * 2 * halfW * SENS.openHeight;
    const up = Math.min(H * D.upShare, V.vUp);
    const dn = Math.min(H - H * D.upShare, V.vDown);
    const N = V.vN;
    const lift = smile * (smile > 0 ? V.vLiftUp : V.vLiftDown);
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      const t = -1 + 2 * u;
      /* superelipse: p=2 dá elipse, mais alto aproxima uma fenda de cantos rectos.
         prof vale 0 nos cantos, portanto é lá que os dois lábios se encontram. */
      const prof = rigProfile(t, D.p);
      /* o wobble da linha é partilhado pelos dois lábios (senão a boca fechada não
         fecha) e o da abertura é multiplicativo, logo desaparece com ela */
      const ang = V.vA0 + (V.vA1 - V.vA0) * u;
      const x = V.vCx + Math.cos(ang) * halfW + shiftX + V.vWob[i][0];
      const base = V.vCy + Math.sin(ang) * V.vRy - lift * t * t + V.vWob[i][1] * 0.5;
      V.pts[i][0] = x;
      V.pts[i][1] = base - up * prof * (1 + V.vWob[i][1] * 0.05);
      if (i > 0 && i < N - 1) {
        const j = 2 * N - 2 - i;   /* o mesmo t, na volta de baixo do contorno */
        V.pts[j][0] = x;
        V.pts[j][1] = base + dn * prof * (1 + V.vWob[N + i][1] * 0.05);
      }
    }
    V.ox = 0; V.oy = 0; V.sx = 1; V.sy = 1;
    rig.jawDrop = dn;
  }

  const H = rig.holes[0] || null;
  for (const hole of rig.holes) {
    /* o viseme já traz a forma — o "O" é redondo pela proporção — portanto não há aqui
       nenhum blend circular do pucker: arredondaria duas vezes */
    const RX = hole.baseRx * wx;
    const shut = hole.baseRy * 0.12;
    const H = D.amount * D.ratio * 2 * RX * SENS.openHeight;
    const RYu = rigClamp(H * D.upShare, shut, hole.upMax);
    const RYd = rigClamp(H - H * D.upShare, shut, hole.downMax);
    const lift = smile * (smile > 0 ? hole.liftUp : hole.liftDown);
    for (let i = 0; i < hole.pts.length; i++) {
      const b = hole.basePts[i];
      const nx = (b[0] - hole.baseCx) / hole.baseRx;
      const ny = (b[1] - hole.baseCy) / hole.baseRy;
      const corner = Math.abs(nx) * (1 - Math.min(1, Math.abs(ny)));
      hole.pts[i][0] = hole.baseCx + nx * RX + shiftX;
      hole.pts[i][1] = hole.baseCy + ny * (ny < 0 ? RYu : RYd) - lift * corner;
    }
    hole.sx = 1; hole.sy = 1; hole.ox = 0; hole.oy = 0;
    if (hole === H) rig.jawDrop = RYd - hole.baseRy * 0.12;
  }

  for (const kid of rig.kids) {
    const sh = kid.sh;
    if (kid.throat && H) {
      const s = rigClamp((rig.jawDrop + H.baseRy * 0.12) / H.baseRy, 0.05, 3);
      for (let i = 0; i < sh.pts.length; i++) {
        const b = sh.basePts[i];
        sh.pts[i][0] = H.baseCx + (b[0] - H.baseCx) * wx;
        sh.pts[i][1] = H.baseCy + (b[1] - H.baseCy) * s;
      }
      sh.ox = shiftX; sh.oy = 0; sh.sx = 1; sh.sy = 1;
    } else {
      sh.ox = shiftX;
      sh.oy = Math.min(rig.jawDrop * 0.85, kid.dropMax);
      sh.sx = wx;
    }
  }
}

/* Três movimentos, cada um no seu papel:

   · lean — a paralaxe jelly de sempre, proporcional à intensity de cada peça (olhos 12,
     sobrancelhas 8, cara 5). É o movimento amplo dos olhos, e fica como está.
   · rotação — só a boca e o nariz: deslizam pela superfície de uma bola
     (`y' = cy + ry·sin(lat + θ)`), portanto andam sempre juntos e com foreshortening.
     Era isto que faltava: cada um seguia a sua intensity (nariz 10, boca 8) e a certa
     altura o nariz passava por baixo da boca.
   · translação — a cabeça mexeu-se no enquadramento (rigHeadShift). */
const RIG_SPHERE = 0.3;
/* A cara desenhada não cobre a bola até ao equador — a face frontal de uma cabeça ocupa
   uns ±45°. Sem esta margem os traços de baixo caem no bordo mal a cabeça inclina (a
   boca chegava a rodar para fora de vista) e as caras achatadas distorcem. */
const RIG_SPHERE_MARGIN_X = 1.15;
const RIG_SPHERE_MARGIN_Y = 1.12;

function rigEnv(sig, frozen, SENS, model) {
  const S = SENS || SENS_DEFAULTS;
  const yaw = rigClamp(sig.yaw, -1.2, 1.2), pitch = rigClamp(sig.pitch, -1.2, 1.2);

  /* lean directo da pose, como sempre foi — ligá-lo à velocidade dava um bounce a cada
     rotação da cabeça, que não é o comportamento deste avatar */
  const k = S.lean === undefined ? 1 : S.lean;
  const drx = yaw * 0.5 * k;
  const dry = -pitch * 0.6 * k;

  const sph = RIG_SPHERE * (S.sphere === undefined ? 1 : S.sphere);
  return {
    drx, dry, angle: Math.atan2(yaw, -pitch + 0.001),
    Ui: 2 + sig.mouth * 18, frozen: !!frozen,
    warp: model ? {
      ax: yaw * sph, ay: -pitch * sph, persp: 0.35,
      cx: 0, cy: model.faceCy,
      rx: model.rx * RIG_SPHERE_MARGIN_X, ry: model.ry * RIG_SPHERE_MARGIN_Y
    } : null
  };
}

/* deslocamento rígido da cara, em unidades do modelo */
function rigHeadShift(sig, SENS) {
  const m = SENS && SENS.headMove !== undefined ? SENS.headMove : 1;
  const yaw = rigClamp(sig.yaw, -1.2, 1.2), pitch = rigClamp(sig.pitch, -1.2, 1.2);
  return {
    x: (sig.hx * 16 + yaw * 8) * m,
    y: 12 + (sig.hy * 22 - pitch * 12) * m
  };
}

function drawModel(ctx, model, sig, SENS, frozen) {
  const env = rigEnv(sig, !!frozen, SENS, model);
  /* clipping mask: o que vive na superfície da cara não pode sair dela quando a bola
     roda. É a mesma ideia das clipping masks do rigging 2D, e como a máscara é a
     silhueta real (irregular, com o seu jitter) funciona em qualquer forma de cabeça.
     O clip liga/desliga por grupos: com a ordem dos shapes são ~4 transições. */
  let mask = null, clipped = false;
  for (const sh of model.shapes) {
    if (sh.follow) {
      const f = sh.follow;
      const bsc = f.blinkScale === undefined ? 1 : f.blinkScale;
      /* a pupila move-se dentro de uma órbita, não até ao bordo do olho: verticalmente
         há menos espaço (a pálpebra corta), e ao inclinar a cabeça o olhar continua no
         ecrã, portanto o eyeLook satura — com o ganho antigo (1.3) a pupila ficava
         colada à linha de cima ou de baixo do olho. */
      f.dx = (f.dx || 0) + (sig.gx * f.max * 0.95 * bsc - (f.dx || 0)) * 0.2;
      f.dy = (f.dy || 0) + (sig.gy * f.max * 0.55 * bsc - (f.dy || 0)) * 0.2;
    }
    if (sh.role === 'face' && env.warp) {
      mask = new Path2D();
      drawPath(ctx, sh, env, mask);
      continue;
    }
    const want = !!(mask && !sh.noWarp);
    if (want !== clipped) {
      if (clipped) ctx.restore(); else { ctx.save(); ctx.clip(mask); }
      clipped = want;
    }
    drawPath(ctx, sh, env);
  }
  if (clipped) ctx.restore();
}

const SENS_DEFAULTS = { mouthGain: 1, mouthWidth: 1, openHeight: 1, puckerFx: 1, gazeGain: 1, blinkGain: 1, headGain: 1, headMove: 1, sphere: 1, lean: 1, smooth: 1 };
/* ---------- favoritos (localStorage, partilhados pelas três páginas) ---------- */
const FAVS_KEY = 'critter-favs';
const FAVS_MAX = 60;

function loadFavs() {
  try { const l = JSON.parse(localStorage.getItem(FAVS_KEY)); return Array.isArray(l) ? l : []; } catch (e) { return []; }
}
function isFav(id) { return loadFavs().indexOf(id) >= 0; }
function toggleFav(id) {
  const l = loadFavs();
  const i = l.indexOf(id);
  if (i >= 0) l.splice(i, 1); else l.unshift(id);
  try { localStorage.setItem(FAVS_KEY, JSON.stringify(l.slice(0, FAVS_MAX))); } catch (e) {}
  return i < 0;
}

function loadCritterCfg(id) {
  try { return JSON.parse(localStorage.getItem('critter-cfg:' + id)) || {}; } catch (e) { return {}; }
}
function saveCritterCfg(id, cfg) {
  try { localStorage.setItem('critter-cfg:' + id, JSON.stringify(cfg)); } catch (e) {}
}
