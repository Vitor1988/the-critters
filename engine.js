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
/* Quatro bocas que o gerativo desenha bem e o rig não anima com honestidade: a língua da
   `tongue` fica pendurada a bombear com a mandíbula, e a `fangs`/`grin` vivem de dentes
   que no rig são invisíveis (não há mandíbula a que os prender). Em vez de as deixar
   cair, cada uma tem destino — e só no rig, como já acontece com os olhos: o sorteio, os
   pesos e o index ficam byte a byte iguais.
     tongue/fangs → smile   desenham o MESMO arco: a linha de repouso é bit a bit igual
     zigzag       → w       o vizinho de registo (linha não-arco, carácter parecido)
     grin         → open    o mesmo ramo do buildRig (buraco → eixo da elipse) */
const RIG_MOUTH_SWAP = { tongue: 'smile', fangs: 'smile', zigzag: 'w', grin: 'open' };
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
  let mouthStyle = MOUTH_STYLES[t.mouth];
  /* depois do merge dos traits de propósito: um cfg antigo com uma boca escondida
     gravada à mão cai também na troca (não se migra nada no localStorage por isto) */
  if (opts && opts.rig && RIG_MOUTH_SWAP[mouthStyle]) mouthStyle = RIG_MOUTH_SWAP[mouthStyle];
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
    /* boca neutra desenhada para o rig: o arco da 'chill' com mais pontos e wobble mais
       contido. Fora dos pesos do sorteio — só à mão, no studio. */
    addShape(shapes, wobblyArc(0, my - 6, mw * 0.8, 5, 0.1, Math.PI - 0.1, 16, 1.8, rng),
      { fill: null, stroke: pal.line, closed: false, lw: 3, part: 'lip' }, rng, 8);
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
/* `semAudio` corta o contributo do microfone: é o que o `rigVisemeDrive` usa para saber
   quanta abertura o VÍDEO pediu, sem a forma que o áudio acrescentou por cima. */
function rigVisemeWeights(sig, SENS, semAudio) {
  const fx = SENS && SENS.puckerFx !== undefined ? SENS.puckerFx : 1;
  const dead = (v, d) => rigClamp((v - d) / (1 - d), 0, 1);
  const open = rigClamp(sig.mouth, 0, 1);
  let pk = dead(rigClamp(sig.pucker, 0, 1), 0.12);
  let fn = dead(rigClamp(sig.funnel, 0, 1), 0.12);
  /* o slider `viseme E` dosa o quanto o smile alimenta o E — a 0 (omissão) esta linha
     é exactamente a validada (só mouthW*2) */
  const eDose = SENS && SENS.visemeE !== undefined ? SENS.visemeE : 0;
  let st = dead(rigClamp(Math.max(sig.mouthW * 2, (sig.smileW || 0) * eDose), 0, 1), 0.1);
  /* visemes por áudio (slider `audioVisemes`, omissão 0): os dois canais do microfone
     entram AQUI, nas entradas do solver, e não nas poses nem na abertura. O `max` é o
     que faz o vídeo continuar a mandar quando ele já viu a forma — o áudio só
     acrescenta quando a cara não deu sinal. Sem dose ou sem microfone, nem se lê. */
  const avDose = semAudio || !SENS || SENS.audioVisemes === undefined ? 0 : SENS.audioVisemes;
  if (avDose > 0 && sig.au) {
    const K = RIG_VISAUDIO;
    /* e passam pelo MESMO veto da oclusão que trava a mistura na abertura
       (`rigAudioVeto`): o microfone pede forma, a cara é que a autoriza. Sem ele, um
       /m/ — que tem tanta energia como a vogal a seguir, e um espectro escuro — punha o
       solver a pedir um "O" com os lábios colados: medido, com `sig.mouth` 0.02 e press
       0.95, o drive pedia amount 0.835 (contra 0.020 sem áudio) e a boca abria 21 px
       onde devia abrir 3.6. Na v1 a oclusão é o `press`; na v3 o `sig.press` É a
       oclusão própria (`v.oc`), que é o sinal certo nas duas. */
    const dose = rigAudioVeto(avDose, rigClamp(sig.press, 0, 1));
    const r = dose * (sig.au.round || 0), s = dose * (sig.au.spread || 0);
    pk = Math.max(pk, r * K.pesoU);
    fn = Math.max(fn, r * K.pesoO);
    st = Math.max(st, s);
  }
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
  /* A ABERTURA é do vídeo, e só dele. O `own` das poses existe para o "O" sair redondo
     com o queixo quase fechado — mas a partir do momento em que a forma pode vir do
     microfone, herdar esse `own` fazia o slider da FORMA mandar na ABERTURA, que é
     exactamente a divisão de trabalho que o `audioMix` respeita e este caminho não.
     Por isso o amount conta só o `own` dos pesos de vídeo; a mistura das poses (rx,
     ratio, upShare, p) é a de cima, com o áudio incluído. Sem `audioVisemes` — ou sem
     microfone — o segundo solver nem corre, e o amount é o mesmo double de sempre. */
  let own = d.own;
  if (SENS && SENS.audioVisemes > 0 && sig.au) {
    const wv = rigVisemeWeights(sig, SENS, true);
    own = 0;
    for (const k in wv) own += wv[k] * RIG_VISEMES[k].own;
  }
  d.amount = Math.max(rigClamp(sig.mouth, 0, 1), own);
  return d;
}

/* perfil da abertura ao longo da boca: 0 nos cantos, 1 ao centro */
function rigProfile(t, p) {
  return Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t), p)), 1 / p);
}

/* pseudo-aleatório determinístico por (instante, ponto), para o boil do traço — o hash
   clássico de shaders: barato, sem estado, e igual em qualquer máquina */
function rigBoil(seed, i) {
  const v = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453;
  return (v - Math.floor(v)) * 2 - 1;
}

/* Cada estilo entra no rig como uma *linha de repouso* — a sua boca fechada, tal como é
   desenhada — mais estes dois ajustes de carácter. `ratio` multiplica a proporção do
   viseme (o 'o' abre redondo e pequeno, o 'grin' largo e baixo) e `p` o expoente do
   perfil (mais alto = fenda de cantos mais rectos). A mecânica é a mesma para todas. */
const RIG_MOUTH_N = 17;
const RIG_MOUTH_STYLE = {
  smile:  { ratio: 1.00, p: 1.00 },
  chill:  { ratio: 0.95, p: 1.00 },
  mad:    { ratio: 1.00, p: 1.00 },
  open:   { ratio: 1.20, p: 1.00 },
  fangs:  { ratio: 1.05, p: 1.00 },
  tongue: { ratio: 1.00, p: 1.00 },
  w:      { ratio: 0.95, p: 1.15 },
  zigzag: { ratio: 0.95, p: 1.20 },
  o:      { ratio: 1.70, p: 1.00 },
  grin:   { ratio: 0.85, p: 1.15 },
  smirk:  { ratio: 1.00, p: 1.00 },
  rigged: { ratio: 1.00, p: 1.00 }
};

/* reamostra uma polilinha para N pontos, pelo parâmetro e não por x: o 'w' são dois
   arcos que se sobrepõem em x, e por x a interpolação ficava ambígua */
function rigResample(line, N) {
  const out = [], last = line.length - 1;
  for (let i = 0; i < N; i++) {
    const t = last * i / (N - 1);
    const a = Math.min(last, Math.floor(t)), b = Math.min(last, a + 1), f = t - a;
    out.push([line[a][0] + (line[b][0] - line[a][0]) * f, line[a][1] + (line[b][1] - line[a][1]) * f]);
  }
  return out;
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

/* --------------------------------------------------------------------------
   fala v3 — EXPERIMENTAL, atrás do toggle `speechV3` (omissão 0 = não existe).
   Não é, e não pode passar a ser, o caminho por omissão sem A/B ao vivo: ver a
   NOTA no `processLandmarks`. Duas tentativas anteriores bateram certo na
   simulação e prenderam a boca na cara real; desta vez há uma bancada de vídeo
   real por trás (`tools/`), o que baixa o risco mas não substitui a cara dele.

   O que muda face à v1, e porquê:

   · **semântica do `mouthClose`.** No ARKit o `mouthClose` é o quanto os lábios
     fecham *apesar* do queixo estar aberto. A v1 trata-o como ruído e trava com
     ele *depois* da fusão — e é isso que põe um tecto na abertura quando ele
     dispara cronicamente. Aqui desconta-se ao queixo *antes*, que é o que ele
     significa, e a linha de base desconta-se com a mesma combinação para o
     repouso desta cara continuar a dar zero.
   · **oclusão como sinal próprio.** Os lábios enrolados (`mouthRoll*`) e o press
     dizem "M/B/P" muito melhor do que o `mouthClose` sozinho. Ataque de 15 ms
     porque uma bilabial dura ~100 ms e chegar tarde é o mesmo que faltar.
   · **filtros em milissegundos, não em frames.** One Euro nos crus (parado
     filtra muito, em movimento deixa passar o ataque) e EMA assimétrico no
     alvo. A v1 muda de comportamento entre 30 e 60 fps porque os coeficientes
     são por frame; esta não.
   · **o hold cede à oclusão.** Segura a boca entre sílabas rápidas, mas nunca
     contra uma bilabial — é essa a diferença entre um hold e uma trava, e foi
     uma trava que prendeu a boca das duas vezes anteriores.
   -------------------------------------------------------------------------- */
const RIG_V3 = {
  /* Estes números saíram do `tools/gridsearch.js`: grelha de 324 combinações sobre
     12 clips de vídeo real, com 4 em holdout, seguida de descida por coordenadas.
     Não são escolhas de gosto — mas também não são verdade revelada: são o que
     ganha *nestes* clips (dois actores americanos a declamar duas frases), e é
     por isso que a v3 fica atrás de um toggle até ele a ver na cara dele. */
  k: 1.1,           /* quanto do mouthClose se desconta ao queixo */
  gamma: 0.7,       /* curva da abertura (a v1 usa 0.85; mais baixo levanta a fala baixa) */
  /* as constantes de tempo partiram das da v1 (subida 0.6/frame = 18 ms, descida
     0.45/frame = 28 ms), não de números redondos: a v3 não pode estrear-se mais
     lenta do que aquilo que substitui. O grid acabou por fechar ainda mais depressa. */
  atkMs: 20,        /* constante de subida da boca */
  relMs: 18,        /* e de descida (o `fecho` do utilizador escala esta) */
  ocAtkMs: 30,      /* oclusão: o grid preferiu-a mais calma do que os 15 ms previstos */
  ocRelMs: 30,
  ocGate: 0.9,      /* quanto a oclusão fecha a boca no máximo */
  /* zona morta da oclusão: sem ela, a v3 repetia o erro que a NOTA descreve —
     descontar o mouthClose ao queixo E fechar com ele outra vez. Na fala normal o
     mouthClose co-dispara a 0.25 com o queixo a 0.18, e sem esta margem isso
     bastava para cortar 25% da abertura de uma vogal limpa. */
  ocDead: 0.15,
  /* o par hold é o contrapeso do `relMs` curto: fecha depressa entre sílabas, mas
     não deixa a boca colapsar a zero em cada vale de 30 ms — sem ele o fecho rápido
     lê-se como tremor */
  holdMs: 140,      /* anti-flicker: tempo mínimo antes de deixar cair */
  holdFloor: 0.22,  /* e o piso, em fracção do pico recente */
  eGateLo: 0.10,    /* o "eee" só conta com a boca já a abrir... */
  eGateHi: 0.30,    /* ...e conta por inteiro a partir daqui */
  euro: { minCut: 1.5, beta: 0.5, dCut: 1.0 },
  auto: { decay: 0.06, minSpan: 0.15 }   /* decay em unidades por segundo */
};

/* coeficiente de um EMA de constante `tau` (ms) para um passo de `dt` (ms). É isto
   que torna a cadeia independente da cadência: a 30 ou a 60 fps o mesmo tau dá o
   mesmo tempo de subida. */
const rigEmaA = (dt, tau) => rigClamp(1 - Math.exp(-dt / Math.max(1, tau)), 0.02, 1);

/* ...mas só até onde o piso de 0.02 deixa. Acima de tau ≈ dt/0.0202 (827 ms a 60 fps,
   2475 ms a 20) o piso morde, o coeficiente volta a ser constante por frame e a cadeia
   volta a mudar de comportamento com a cadência — o defeito que a v3 veio corrigir.
   Medido no único tau longo que a v3 tem, a baseline de 2 s do sorriso: 2 s depois do
   mesmo degrau a baseline vale 0.547 a 60 fps e 0.379 a 20, e o canal do "eee" que sai
   dela 0.102 contra 0.405 — 4x.
   Isto não corrige a v3: a v3 foi validada ao vivo com o piso, tal como está. É o EMA da
   v4 (`speechV4`), e o piso que fica é só o anti-degenerado (com tau infinito o filtro
   deixava de andar). */
const rigEmaLongo = (dt, tau) => rigClamp(1 - Math.exp(-dt / Math.max(1, tau)), 1e-4, 1);

/* One Euro: corte adaptativo à velocidade. Com a cara parada filtra muito (mata o
   tremor do tracker, que é o que faz a boca vibrar em silêncio); em movimento
   filtra pouco (não come o ataque da sílaba). Um EMA fixo tem de escolher um dos
   dois — é o compromisso que a v1 paga. */
function rigOneEuro(st, x, dt, cfg) {
  const dtS = Math.max(0.001, dt / 1000);
  if (st.x === null) { st.x = x; st.dx = 0; return x; }
  const alfa = fc => 1 / (1 + 1 / (2 * Math.PI * fc * dtS));
  st.dx += alfa(cfg.dCut) * ((x - st.x) / dtS - st.dx);
  st.x += alfa(cfg.minCut + cfg.beta * Math.abs(st.dx)) * (x - st.x);
  return st.x;
}

/* --------------------------------------------------------------------------
   mistura com o microfone — EXPERIMENTAL, atrás do slider `audioMix` (omissão 0).
   Com o slider a 0 nada disto corre: nem se pede o microfone, nem se toca no alvo.

   Porquê misturar de todo: a câmara e o microfone falham em coisas diferentes. O
   tracker vê a *forma* da boca (bilabiais, o "eee", o bico do "u") mas a 30 fps
   perde metade do ritmo silábico e chega atrasado ao ataque; o microfone tem o
   ritmo ao milissegundo mas não sabe distinguir um "mmm" de um "ahh", nem sequer
   se a boca está aberta. Daí a divisão de trabalho do VTube Studio/VSeeFace: o
   áudio manda na ABERTURA, o vídeo continua a mandar na FORMA e na OCLUSÃO — a
   mistura entra só no alvo da abertura, antes do filtro final, e a bilabial do
   vídeo continua a fechar a boca por cima do que o áudio pedir.

   O nível sai daqui já normalizado (0..1), não em dB, porque o que a boca precisa
   é de uma fracção de curso. Entre o dB cru e essa fracção há três coisas:

   · **chão de ruído automático.** Percentil baixo dos últimos ~4 s, não o mínimo:
     o mínimo agarra-se a uma amostra e nunca mais larga. Desce a pique (um som
     acabou de parar: o chão é já) e sobe travado, senão uma frase longa arrastava
     o chão consigo e comia as sílabas fracas do fim.
   · **gate acima do chão.** Ventoinha, frigorífico e o próprio ruído do
     pré-amplificador vivem no chão; a margem é o que os deixa de fora. Abaixo do
     gate o nível é zero exacto — a boca fecha, não fica a vibrar a 0.03.
   · **tecto adaptativo, com o span preso.** Sem ele o mesmo código dá uma boca
     saturada num micro com ganho alto e uma boca tímida num micro fraco (nos
     próprios clips da bancada os picos variam 26 dB entre actores). O `spanMin`
     é o que impede o "do 8 para o 80": em silêncio o tecto não se aproxima do
     gate mais do que isto, portanto o ruído nunca chega a parecer voz.
   -------------------------------------------------------------------------- */
const RIG_AUDIO = {
  /* Como estes números foram escolhidos: `tools/replay.js --audio` injecta o envelope
     dos 16 clips de vídeo real como se fosse o microfone (com `--ruido` a pôr-lhes um
     chão de sala por baixo, que o estúdio do RAVDESS não tem). O critério NÃO foi o
     `r` — correlacionar a boca com o envelope que a alimenta é circular e mede zero.
     Foi o par que o projecto de facto teme: o vale entre sílabas e o tremor. */
  janelaMs: 4000,     /* janela do chão de ruído */
  pctChao: 10,        /* e o percentil dela que conta como chão */
  /* fracção do anel que tem de estar cheia de amostras REAIS antes de o nível valer
     alguma coisa (~1 s a 60 fps). O anel nasce pré-preenchido com a primeira amostra,
     portanto até haver sala que chegue o percentil é um palpite sobre uma amostra só —
     e é a mesma disciplina do `prontoMs` da forma: o microfone não manda antes de saber
     o que é o silêncio desta sala. */
  prontoFrac: 0.25,
  /* a 10 dB/s um degrau de ruído (o ar condicionado a arrancar) deixa de mexer a boca
     ao fim de ~5 s em vez de ~9 s, e não custa nada na fala corrida: em 40 s de fala
     contínua o chão assenta no mesmo sítio com 3 ou com 25 dB/s — quem manda no regime
     permanente é o percentil, isto só governa o transitório */
  subidaDbS: 10,      /* o chão sobe no máximo isto por segundo (a descida é imediata) */
  margemDb: 8,        /* gate = chão + isto */
  spanMin: 12,        /* dB entre o gate e a boca cheia: nunca menos... */
  spanMax: 30,        /* ...nem mais do que isto */
  tetoQuedaDbS: 3,    /* o tecto desce isto por segundo quando ninguém fala */
  /* 1.0 = sem curva, e é medido: com gamma abaixo de 1 a boca engorda no meio do
     intervalo e o vale entre sílabas sobe, que é exactamente o modo de falha que a v1
     documenta. A compensação da fala baixa já vem do tecto adaptativo, não daqui. */
  gamma: 1.0,
  /* Fronteiras do veto da oclusão (ver `rigAudioVeto`): abaixo de `vetoDead` o
     microfone não dá por nada, em `vetoCheio` já não tem autoridade nenhuma.
     Medido nos 16 clips, e não adivinhado: a falar, a oclusão das duas cadeias fica
     em 0.05 de mediana e nunca passa de 0.20 (v1) / 0.17 (v3). O bloco da v1 avisa
     que o `mouthClose` co-dispara na fala normal, e é verdade — mas na cara real
     co-dispara muito abaixo do que a pose sintética `vogalPress` sugere. Daí haver
     folga para pôr a zona morta em 0.30 sem tocar num único frame de fala, e fechar
     o veto já em 0.62, que é o que faz uma boca selada ficar selada. */
  vetoDead: 0.30,
  vetoCheio: 0.62,
  atkMs: 20,          /* ataque rápido: a sílaba começa no primeiro milissegundo */
  /* 90 ms: a 110 ms o vale entre sílabas fica em 0.66 do pico, a 90 ms em 0.60 (o vídeo
     sozinho dá 0.68 na v1 e 0.74 na v3), e o tremor sobe de 0.0272 para 0.0290 — ambos
     bem abaixo dos 0.0355 do vídeo. Trocou-se um bocado de tremor por vale mais fundo,
     que é o lado certo para o defeito que este projecto tem. */
  relMs: 90,
  dbMin: -100
};

/* Veto da oclusão sobre o microfone: o áudio pede curso, o vídeo é que o autoriza.

   Sem isto a mistura tinha um buraco que a bancada apanhou — a berrar com a mistura
   no máximo, uma bilabial abria a boca a 0.43 (o vídeo sozinho fecha-a a 0.05) e uma
   selada a 0.47. É o modo de falha de qualquer lipsync só de áudio: o "m" de "mãe"
   tem tanta energia como o "ã", e só a cara sabe que os lábios estão colados.

   O veto é sobre a MISTURA, não sobre o alvo: com os lábios selados o peso do
   microfone vai a zero e o que fica é exactamente a boca de vídeo — não uma média
   das duas. E tem zona morta, senão a fala normal (onde o `press` co-dispara) perdia
   metade do microfone sem haver oclusão nenhuma. */
function rigAudioVeto(mix, ocl) {
  const K = RIG_AUDIO;
  return mix * (1 - rigClamp((ocl - K.vetoDead) / (K.vetoCheio - K.vetoDead), 0, 1));
}

/* Sem sinal do microfone o estado LARGA, não congela. "Sem sinal" é tudo o que não é
   uma medição: zeros digitais (o AnalyserNode antes de o stream debitar, o micro em
   mute, o AudioContext suspenso), `conf` a zero, ou o microfone que morreu a meio.
   As constantes são as de descida de cada canal — larga como largaria se a voz tivesse
   simplesmente parado, que é a única coisa que se pode afirmar sem ouvir nada. */
function rigAudioLargaNivel(a, dt) {
  a.lvl += (0 - a.lvl) * rigEmaA(dt, RIG_AUDIO.relMs);
}
function rigAudioLargaForma(a, dt) {
  const K = RIG_VISAUDIO;
  a.round += (0 - a.round) * rigEmaA(dt, K.relMs);
  a.spread += (0 - a.spread) * rigEmaA(dt, K.relMs);
}

/* nível de voz 0..1 a partir do dB instantâneo do microfone. O estado (anel, histograma,
   chão, tecto) vive no `sig.au`, criado à primeira utilização — sem microfone fica nulo.
   O histograma de 1 dB é o que torna o percentil O(1) por frame em vez de uma ordenação. */
function rigAudioLevel(sig, au, dt) {
  const K = RIG_AUDIO;
  const db = rigClamp(au.db, K.dbMin, 0);
  /* Silêncio digital NÃO é uma medição de silêncio — é ausência de medição, e não pode
     entrar no anel. Um único frame de zeros punha o chão em −100, o gate em −92, e a
     partir daí o ruído de sala a −55 dB lia-se como voz a 1.00 durante 6.8 s (medido).
     O `!(db > ...)` apanha de caminho um dB que não seja número, que envenenava o chão
     e o gate para sempre. Sem sinal larga-se o nível e o anel fica com o que já sabia
     da sala; antes do primeiro sinal nem se cria estado. */
  if (!(db > K.dbMin)) {
    if (!sig.au) return 0;
    rigAudioLargaNivel(sig.au, dt);
    return sig.au.lvl;
  }
  const bin = Math.round(db) - K.dbMin;
  let a = sig.au;
  if (!a) {
    /* a janela é em tempo, e o anel em amostras: dimensiona-se pela cadência real */
    const n = rigClamp(Math.round(K.janelaMs / Math.max(8, dt)), 60, 600);
    /* `round`/`spread` são os canais de forma (ver `rigAudioShape`): vivem aqui
       porque são estado do microfone, e sem microfone não há nenhum */
    a = sig.au = { anel: new Array(n).fill(bin), i: 0, bins: new Array(101).fill(0), validos: 0,
      chao: db, teto: db + K.spanMin, gate: db + K.margemDb, lvl: 0, round: 0, spread: 0 };
    a.bins[bin] = n;
  }
  a.bins[a.anel[a.i]]--;
  a.bins[bin]++;
  a.anel[a.i] = bin;
  a.i = (a.i + 1) % a.anel.length;
  if (a.validos < a.anel.length) a.validos++;

  let acc = 0, b = 0;
  const alvoN = a.anel.length * K.pctChao / 100;
  /* `b <= 100`: o histograma vai até ao bin 100 (0 dB, o fundo de escala) e a varredura
     tem de o poder somar como qualquer outro */
  for (; b <= 100; b++) { acc += a.bins[b]; if (acc >= alvoN) break; }
  const pChao = b + K.dbMin;
  a.chao = pChao < a.chao ? pChao : Math.min(pChao, a.chao + K.subidaDbS * dt / 1000);
  a.teto = Math.max(db, a.teto - K.tetoQuedaDbS * dt / 1000);

  a.gate = a.chao + K.margemDb;
  const span = rigClamp(a.teto - a.gate, K.spanMin, K.spanMax);
  /* e o nível só se afirma depois de o anel ter ouvido sala que chegue (ver `prontoFrac`) */
  const pronto = rigClamp(a.validos / (a.anel.length * K.prontoFrac), 0, 1);
  const alvo = pronto * Math.pow(rigClamp((db - a.gate) / span, 0, 1), K.gamma);
  a.lvl += (alvo - a.lvl) * rigEmaA(dt, alvo > a.lvl ? K.atkMs : K.relMs);
  return a.lvl;
}

/* --------------------------------------------------------------------------
   visemes por áudio — EXPERIMENTAL, atrás do slider `audioVisemes` (omissão 0),
   e independente do `audioMix`: são doses separadas porque são apostas separadas.
   O `audioMix` deixa o microfone mandar na ABERTURA; isto deixa-o mandar na FORMA
   (o "ooo" redondo contra o "eee" de fenda), que era o outro lado do trabalho.

   Como se lê uma forma num espectro, sem fingir fonética: sete bandas grosseiras
   (50-200, 200-400, ... 4000-8000 Hz) e um só eixo — o BRILHO, quanta energia está
   em cima face a baixo. Um "eee"/"iii" tem o F2 lá em cima e é brilhante; um
   "ooo"/"uuu" tem tudo em baixo e é escuro; o "aaa" fica no meio, que é o que se
   quer (a abertura já o desenha). Duas medidas independentes votam nesse eixo:

   · **tilt**, a diferença em dB entre as bandas de 1.5-4 kHz e as de 200-800 Hz;
   · **centroide** espectral, em oitavas.

   Nos 16 clips da bancada correlacionam-se só a r=0.39 — não são a mesma medida, e
   é por isso que entram as duas. O peso de 10 dB por oitava não é gosto: é a razão
   entre os desvios-padrão delas na fala real (9.58 dB / 0.951 oitavas = 10.1).

   O que NÃO se faz aqui, e é o essencial: comparar com limiares absolutos de Hz. Os
   formantes mudam com a pessoa, com o microfone e com a distância — um limiar fixo
   servia uma voz e falhava a seguinte. O que se compara é com a MÉDIA DESTA VOZ: um
   seguidor de mediana lento guarda o brilho habitual de quem está a falar, e os
   canais medem o desvio em dB face a ele. Quem tem voz grave e microfone abafado tem
   a baseline baixa, e o "eee" dele continua a destacar-se dela.
   -------------------------------------------------------------------------- */
const RIG_VISAUDIO = {
  /* limiares medidos na fala real (os 16 clips seguidos, ~59 s, com a baseline já
     assente): o desvio do brilho tem p5 −8.0 dB, mediana ~0, p85 +11.9 e p95 +19.9
     — a cauda clara é o dobro da escura, porque um "sss" sobe 20 dB e não há nada
     que desça outro tanto. Daí as rampas serem assimétricas: escolhidas para os dois
     canais acenderem a mesma fracção do tempo (11% e 13% dos frames com voz), com
     mais de metade dos frames a não pedir forma nenhuma. */
  rDead: 4, rCheio: 10,     /* O/U: abaixo de −4 dB começa, a −10 dB está cheio */
  sDead: 7, sCheio: 18,     /* E/I: a cauda clara é mais longa, o limiar acompanha-a */
  kCent: 10,                /* dB por oitava — a razão dos desvios-padrão medidos */
  /* a baseline anda devagar de propósito: uma vogal sustentada de 2 s só lhe move
     1.6 dB, portanto o "ooooo" não se apaga a meio. O arranque é que tem de ser
     rápido (senão os primeiros segundos ficam com a baseline do primeiro som que
     apanharam), e por isso o passo começa ~30x maior e decai com o tempo de voz. */
  passoDbS: 0.8,
  aqueceMs: 5000,
  /* e enquanto a baseline não tiver ouvido voz que chegue, NÃO SE AFIRMA FORMA
     NENHUMA. Sem isto, o primeiro som depois de ligar o microfone define a baseline
     e tudo o que vem a seguir parece escuro (ou claro) — nos clips da bancada, que
     começam todos por uma plosiva, é o que acontece: a boca ficava presa num "O"
     durante segundos. É a mesma disciplina do chão de ruído do `RIG_AUDIO`, que
     também não deixa o microfone mandar antes de saber o que é silêncio. */
  prontoMs: 1200,
  atkMs: 40,                /* mesma lógica do resto: sobe depressa... */
  relMs: 90,                /* ...e larga com calma, senão pisca entre sílabas */
  vozMin: 0.25,             /* nível pós-gate abaixo do qual não se afirma forma nenhuma */
  /* como o canal redondo se reparte pelos visemes: o "O" leva o dobro do "U", que é
     o que dá um bico aberto em vez de um beicinho fechado (o solver já multiplica o
     funnel por 2.2 e o pucker por 1.4) */
  pesoO: 1, pesoU: 0.5
};

/* log2 da frequência central de cada banda (média geométrica das fronteiras) */
const RIG_VISAUDIO_HZ = [50, 200, 400, 800, 1500, 2500, 4000, 8000];
const RIG_VISAUDIO_FC = [];
for (let i = 0; i < 7; i++) RIG_VISAUDIO_FC.push(Math.log2(Math.sqrt(RIG_VISAUDIO_HZ[i] * RIG_VISAUDIO_HZ[i + 1])));

/* escreve `sig.au.round` e `sig.au.spread` (0..1) a partir das 7 bandas em dB e do
   nível já passado pelo gate. Vive no `sig.au` e não em campos novos do `sig` de
   propósito: é estado do microfone, e sem microfone não existe. */
function rigAudioShape(sig, bandas, nivel, dt) {
  const K = RIG_VISAUDIO;
  const a = sig.au;
  if (!a || !bandas || bandas.length < 7) return;
  let sp = 0, sw = 0;
  for (let i = 0; i < 7; i++) {
    const p = Math.pow(10, bandas[i] / 10);
    sp += p; sw += p * RIG_VISAUDIO_FC[i];
  }
  const tilt = (bandas[4] + bandas[5]) / 2 - (bandas[1] + bandas[2]) / 2;
  const brilho = 0.5 * (tilt + K.kCent * (sw / (sp || 1e-12)));

  const voz = rigClamp((nivel - K.vozMin) / (1 - K.vozMin), 0, 1);
  let x = 0;
  if (voz > 0) {
    if (a.brilho === undefined) { a.brilho = brilho; a.vozMs = 0; }
    a.vozMs += dt * voz;
    /* seguidor de mediana por passo fixo (aproximação estocástica): ao contrário de
       uma média, não é arrastado pelos 20 dB de um sibilante — e é uma linha */
    const passo = K.passoDbS * Math.max(1, K.aqueceMs / (1 + a.vozMs)) * dt * voz / 1000;
    const d = brilho - a.brilho;
    a.brilho += Math.sign(d) * Math.min(passo, Math.abs(d));
    x = brilho - a.brilho;
  }
  const rampa = (v, d0, d1) => rigClamp((v - d0) / (d1 - d0), 0, 1);
  /* peso do arranque: 0 até `prontoMs` de voz ouvida, 1 ao dobro disso */
  const pronto = rigClamp(((a.vozMs || 0) - K.prontoMs) / K.prontoMs, 0, 1);
  const alvoS = voz * pronto * rampa(x, K.sDead, K.sCheio);
  const alvoR = voz * pronto * rampa(-x, K.rDead, K.rCheio);
  a.spread += (alvoS - a.spread) * rigEmaA(dt, alvoS > a.spread ? K.atkMs : K.relMs);
  a.round += (alvoR - a.round) * rigEmaA(dt, alvoR > a.round ? K.atkMs : K.relMs);
}

/* --------------------------------------------------------------------------
   calibração de máximo — EXPERIMENTAL, atrás dos `maxJaw`/`maxLip` (omissão 0 =
   não existe, e o `rigSpan` devolve o span fixo de sempre, o mesmo double).

   O `RIG_JAW_SPAN`/`RIG_LIP_SPAN` é um palpite sobre a população: a janela de
   entrada que corresponde ao curso todo da boca do avatar. O botão `calibrar
   máximo` mede o curso REAL de quem está à frente da câmara (p95 de uns 40 frames
   de "AAA") e substitui o palpite por ele.

   Duas guardas, e a razão de existirem está no README: auto-range pelo pico
   recente já foi tentado e deu "do 8 para o 80". Isto não é auto-range — é uma
   medição única, deliberada, que não se mexe sozinha — mas uma medição má (a
   pessoa não abriu a boca, o tracker perdeu-a, a luz mudou) tem de custar pouco:

   · **média geométrica com o fixo**: anda metade da distância em log. Um máximo
     medido a metade do fixo dá um span a 0.71 do fixo, não a 0.5.
   · **chão e tecto**: nunca menos de 0.55x nem mais de 1.8x o fixo, aconteça o que
     acontecer à medição.

   Nos dois actores da bancada o curso real do queixo é 0.41 e 0.48 (o fixo é 0.42,
   bom palpite) mas o dos lábios é 0.108 e 0.118 contra os 0.085 fixos — 26 a 39%
   acima. Ou seja: a direcção do efeito depende da pessoa, e é isso que o botão
   resolve. Quem tiver o curso curto ganha boca; quem o tiver longo perde
   saturação. Qual dos dois é o caso dele só o A/B ao vivo diz.
   -------------------------------------------------------------------------- */
const RIG_MAX = { chao: 0.55, teto: 1.8 };

function rigSpan(fixo, maximo, neutro) {
  /* sem calibração de máximo devolve o MESMO double: o caminho de sempre, bit a bit */
  if (!(maximo > 0)) return fixo;
  const medido = maximo - (neutro || 0);
  if (!(medido > 0)) return fixo;
  return rigClamp(Math.sqrt(fixo * medido), fixo * RIG_MAX.chao, fixo * RIG_MAX.teto);
}

/* escreve sig.mouth, sig.press e sig.smileW — o resto do bloco é partilhado com a v1 */
function rigSpeechV3(bs, sig, calib, SENS, dt, pucker, smile, mouthR, auMix, auAlvo) {
  const K = RIG_V3;
  let v = sig.v3;
  if (!v) v = sig.v3 = { jf: { x: null, dx: 0 }, cf: { x: null, dx: 0 }, oc: 0, ap: 0,
    pico: 0, holdT: 0, alvoAnt: 0, smile: smile, lo: 0, hi: K.auto.minSpan };

  /* **fala v4** (`speechV4`, omissão 0): esta cadeia, filtrada com o EMA que honra os
     taus longos (`rigEmaLongo`). A troca é global e não uma excepção numa linha porque
     dos taus daqui só a baseline do sorriso (2 s) passa o ponto onde o piso da v3 morde
     — os outros (18 a 120 ms, mesmo com os sliders nos extremos) dão o mesmo double com
     e sem piso. A v3 fica exactamente como foi validada. */
  const ema = SENS.speechV4 > 0 ? rigEmaLongo : rigEmaA;

  /* o `|| 0` é o que impede um blendshape em falta de envenenar o One Euro: o `rigClamp`
     deixa passar o NaN, e o filtro não tem por onde o largar (o `st.x === null` só apanha
     o primeiro frame) — um único frame mau prendia a boca em NaN para o resto da sessão */
  const jf = rigOneEuro(v.jf, rigClamp(bs.jawOpen || 0, 0, 1), dt, K.euro);
  const cf = rigOneEuro(v.cf, rigClamp(bs.mouthClose || 0, 0, 1), dt, K.euro);

  /* abertura pelo blendshape, com o mouthClose descontado no sítio certo, e pelos
     landmarks — fica a maior, como na v1: um apanha o que o outro falha */
  const base = (calib.jaw || 0) - K.k * (calib.close || 0);
  const apBS = (jf - K.k * cf - base - 0.02) / rigSpan(RIG_JAW_SPAN, SENS.maxJaw, calib.jaw);
  const apLM = (mouthR - calib.mouth - 0.004) / rigSpan(RIG_LIP_SPAN, SENS.maxLip, calib.mouth);
  let ap = rigClamp(Math.max(apBS, apLM), 0, 1);

  /* auto-range (só com `speechAuto`): normaliza pelo curso que esta pessoa usa de
     facto. O `minSpan` é o que impede o "do 8 para o 80" que matou a ideia da
     primeira vez — com a boca quase parada, o span não encolhe abaixo dele. */
  if (SENS.speechAuto > 0) {
    const passo = K.auto.decay * dt / 1000;
    v.lo = Math.min(ap, v.lo + passo);
    v.hi = Math.max(ap, v.hi - passo);
    ap = rigClamp((ap - v.lo) / Math.max(K.auto.minSpan, v.hi - v.lo), 0, 1);
  }

  /* oclusão M/B/P: o fecho que o queixo não explica, mais os lábios enrolados,
     mais o press. Os três juntos separam uma bilabial de uma boca simplesmente
     fechada — que era o que faltava à v1 para não travar a fala normal. */
  const oc = rigClamp(2 * Math.max(0, cf - 0.5 * jf - K.ocDead) +
    0.5 * ((bs.mouthRollLower || 0) + (bs.mouthRollUpper || 0)) +
    0.4 * ((bs.mouthPressLeft || 0) + (bs.mouthPressRight || 0)), 0, 1);
  v.oc += (oc - v.oc) * ema(dt, oc > v.oc ? K.ocAtkMs : K.ocRelMs);

  v.ap = ap;   /* guardado só para o debug: com `ap` alto e a boca fechada, quem fecha é a oclusão */
  /* a mistura do microfone entra aqui e só aqui: na abertura crua, ANTES da oclusão e
     do pucker, e já com o veto da oclusão aplicado ao peso (`rigAudioVeto`) */
  let drv = Math.pow(ap, K.gamma);
  if (auMix > 0) drv += (auAlvo - drv) * rigAudioVeto(auMix, v.oc);
  let alvo = rigClamp(drv * SENS.mouthGain *
    (1 - K.ocGate * v.oc) * (1 - 0.35 * pucker), 0, 1);

  /* hold anti-flicker, que cede à oclusão */
  v.pico = Math.max(alvo, v.pico * Math.exp(-dt / 400));
  if (alvo > v.alvoAnt) v.holdT = K.holdMs; else v.holdT -= dt;
  v.alvoAnt = alvo;
  if (v.holdT > 0 && v.oc < 0.4) alvo = Math.max(alvo, K.holdFloor * v.pico);

  /* os sliders continuam a fazer o que dizem: `reactivity` encurta as duas
     constantes, `fecho` só a de descida — como na v1, mas agora em ms */
  const tau = (alvo > sig.mouth ? K.atkMs : K.relMs / SENS.closeSpeed) / SENS.smooth;
  sig.mouth += (alvo - sig.mouth) * ema(dt, tau);
  sig.press = v.oc;

  /* E vs sorriso: quem fala a sorrir tem um sorriso *lento* por baixo; o "eee" é um
     evento por cima dele. A baseline de 2 s separa os dois, e o gate por abertura
     impede que um sorriso de boca fechada roube altura às vogais. */
  /* (é este o tau que o piso do `rigEmaA` satura, e a única diferença medível da v4) */
  v.smile += (smile - v.smile) * ema(dt, 2000);
  const gate = rigClamp((ap - K.eGateLo) / (K.eGateHi - K.eGateLo), 0, 1);
  sig.smileW += (rigClamp(Math.max(0, smile - v.smile) * 1.8, 0, 1) * gate - sig.smileW) * ema(dt, 60);
}

function createSig() {
  return {
    blinkL: 1, blinkR: 1, mouth: 0, mouthW: 0, expr: 0, yaw: 0, pitch: 0, roll: 0,
    gx: 0, gy: 0, hx: 0, hy: 0, joy: 0, sad: 0, surprise: 0, anger: 0, wide: 0,
    pucker: 0, stretch: 0, jawX: 0, funnel: 0, press: 0, smileW: 0,
    /* estado dos filtros da fala v3, criado a primeira utilizacao — na v1/v2 fica nulo */
    v3: null,
    /* estado do chao de ruido do microfone, idem — sem `audioMix` fica nulo */
    au: null
  };
}

function createCalib() {
  return { ready: null, frames: 0, acc: { ear: 0, mouth: 0, jaw: 0, close: 0, yaw: 0, pitch: 0, roll: 0, hx: 0, hy: 0, mouthW: 0, gx: 0, gy: 0 } };
}

/* devolve true quando a calibração já terminou (i.e. o sig está a ser escrito).
   `dtMs` é o tempo desde o frame anterior; só a fala v3 o usa, e quem não o passa
   fica com 16.7 (um frame a 60 Hz), que é o que a v1 sempre assumiu implicitamente.
   `au` é o microfone — `{db, conf, bandas}`, dB instantâneo, confiança (0 = sem mic) e
   as 7 log-energias do espectro. O `db` só é lido com o `audioMix` ou o `audioVisemes`
   fora do zero, e as `bandas` só com o `audioVisemes`; quem não os passa fica em vídeo
   puro, byte a byte. */
function processLandmarks(lm, bs, sig, cal, SENS, dtMs, au) {
  const dt = dtMs || 16.7;
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
    a.close += bs ? bs.mouthClose : 0;   /* so a v3 usa; na v1/v2 fica gravado e ignorado */
    a.yaw += yawRaw; a.pitch += pitchRaw; a.roll += rollRaw;
    a.hx += hxRaw; a.hy += hyRaw; a.mouthW += mouthW;
    a.gx += gazeX; a.gy += gazeY;
    if (cal.frames >= 50) {
      const n = cal.frames;
      cal.ready = {
        ear: a.ear / n, mouth: a.mouth / n, jaw: a.jaw / n, close: a.close / n, mouthW: a.mouthW / n,
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
    /* NOTA: já se tentou "melhorar" isto às cegas duas vezes (snap-to-close, E via
       smile, gate+trava em simultâneo) e ambas prenderam a boca na cara real — o
       mouthClose co-dispara com a fala normal e a fala baixa vive nas zonas onde esses
       ajustes mordem. A v1 é o comportamento validado ao vivo; alterações só por A/B
       com o toggle `fala v2` do studio, nunca por a simulação bater certo. */
    const press = rigClamp(bs.mouthClose + (bs.mouthPressLeft + bs.mouthPressRight) / 2, 0, 1);
    const pucker = rigClamp(bs.mouthPucker, 0, 1);
    const smile = (bs.mouthSmileLeft + bs.mouthSmileRight) / 2;
    /* a v4 é a v3 com outro filtro, e entra pela mesma porta: quem a grave sozinha (uma
       config à mão, um backup antigo por cima) cai na cadeia certa na mesma */
    const v3 = SENS.speechV3 > 0 || SENS.speechV4 > 0;
    sig.funnel += (rigClamp(bs.mouthFunnel, 0, 1) - sig.funnel) * 0.4;
    /* microfone: mesma mistura para as três cadeias, calculada uma vez. Com o slider
       a 0 (omissão) ou sem microfone vivo, `auMix` fica 0 e o caminho é o de sempre.
       Os dois usos do microfone têm dose própria e são independentes: o `audioMix`
       manda na abertura, o `audioVisemes` na forma. Basta um deles para valer a pena
       medir o nível, mas só o `audioMix` lhe toca no alvo. */
    let auMix = 0, auAlvo = 0;
    const auForma = SENS.audioVisemes > 0 && au && au.bandas;
    if ((SENS.audioMix > 0 || auForma) && au && au.conf > 0) {
      const nivel = rigAudioLevel(sig, au, dt);
      if (SENS.audioMix > 0) {
        auAlvo = nivel;
        auMix = rigClamp(SENS.audioMix * au.conf, 0, 1);
      }
      if (auForma) rigAudioShape(sig, au.bandas, nivel, dt);
      /* microfone vivo mas sem espectro, com a dose de forma ligada: a forma larga */
      else if (sig.au && SENS.audioVisemes > 0) rigAudioLargaForma(sig.au, dt);
    } else if (sig.au) {
      /* Sem microfone vivo neste frame — `conf` a zero, `au` ausente, a permissão
         revogada a meio — o estado do áudio LARGA. Congelado, o último `round` ficava
         colado ao `sig.au` e o solver continuava a lê-lo: com o microfone a morrer a
         meio de um "ooo", medi o `round` preso em 0.833 e o peso do "O" em 0.66 para
         sempre, com a boca do avatar presa na pose. Sem áudio nenhum o `sig.au` é nulo
         e isto não corre — é a garantia de que o caminho de sempre não muda. */
      rigAudioLargaNivel(sig.au, dt);
      rigAudioLargaForma(sig.au, dt);
    }
    if (v3) {
      rigSpeechV3(bs, sig, calib, SENS, dt, pucker, smile, mouthR, auMix, auAlvo);
    } else {
    /* fala v2 (toggle no studio, para A/B ao vivo): o press cala o *queixo* antes da
       fusão e deixa de travar depois. Com press crónico, a trava pós-fusão da v1 põe um
       teto na abertura (~82% com press 0.3) que nenhum mouth gain fura — é isso que a
       v2 liberta; as seladas continuam a fechar porque a distância entre lábios manda. */
    const v2 = SENS.speechV2 > 0;
    /* o span é o fixo enquanto não houver calibração de máximo — literalmente o
       mesmo número, e é o que os goldens provam */
    const openBS0 = (bs.jawOpen - (calib.jaw || 0) - 0.02) / rigSpan(RIG_JAW_SPAN, SENS.maxJaw, calib.jaw);
    const openBS = v2 ? openBS0 * Math.max(0, 1 - 1.1 * press) : openBS0;
    const openLM = (mouthR - calib.mouth - 0.004) / rigSpan(RIG_LIP_SPAN, SENS.maxLip, calib.mouth);
    /* a mistura do microfone entra antes da trava do press e do pucker, pelas mesmas
       razões da v3, e com o mesmo veto — aqui a oclusão é o `press`, que é o único
       sinal de lábios colados que esta cadeia tem */
    let drv = Math.pow(rigClamp(Math.max(openBS, openLM), 0, 1), 0.85);
    if (auMix > 0) drv += (auAlvo - drv) * rigAudioVeto(auMix, press);
    const jaw = rigClamp(drv * SENS.mouthGain, 0, 1);
    const openT = jaw * (v2 ? 1 : 1 - 0.6 * press) * (1 - 0.35 * pucker);
    /* fecha quase tão depressa como abre: entre sílabas a boca tem mesmo de voltar, senão
       a fala corrida lê-se como uma boca permanentemente entreaberta */
    /* `fecho` (closeSpeed) só escala a descida: a 1 é o 0.45 validado, acima fecha mais
       seco entre sílabas (a versão contínua do snap-to-close, doseada pelo utilizador) */
    sig.mouth += (openT - sig.mouth) * rigClamp((openT > sig.mouth ? 0.6 : 0.45 * SENS.closeSpeed) * SENS.smooth, 0.05, 1);
    /* oclusão M/B/P: além de travar a abertura (openT acima), os lábios pressionados são
       uma *pose* — ver o bloco press no applyRig. Ataque rápido: uma bilabial dura ~100ms */
    sig.press += (press - sig.press) * (press > sig.press ? 0.6 : 0.4);
    }
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
    /* canal do "eee": o smile com zona morta (o meio sorriso de quem fala não conta).
       Só entra no viseme E, e doseado pelo slider `viseme E` — a 0 não existe.
       (a v3 já o escreveu à sua maneira, com baseline lenta em vez de zona morta fixa) */
    if (!v3) sig.smileW += (Math.max(0, smile - 0.25) * 1.1 - sig.smileW) * 0.4;
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
    sig.press += (0 - sig.press) * 0.4;   /* sem blendshapes não há sinal de press */
    sig.smileW += (0 - sig.smileW) * 0.4; /* nem de smile para o viseme E */
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
  const rig = { eyes: [], brows: [], mouth: null, kids: [], jawDrop: 0 };

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

  const parts = { lip: [], hole: [], teeth: [], tongue: [], throat: [] };
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

  /* --------------------------------------------------------------------------
     Uma só boca no rig, seja qual for o estilo. A *linha de repouso* vem do desenho
     — é a boca fechada tal como o critter a tem — e a mecânica por cima é sempre a
     mesma: cantos ancorados, perfil do viseme, budgets medidos na cara.
       · bocas de arco (smile, chill, w, zigzag, …) dão a linha directamente
       · bocas de buraco (open, o, grin) dão o eixo horizontal da elipse, e passam
         assim a fechar numa linha limpa como as outras
     -------------------------------------------------------------------------- */
  let restLine = null, anchor = null, lineW = 3.5;

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
    restLine = rigResample(chain, RIG_MOUTH_N);
    anchor = lips[0].sh;
    lineW = lips[0].sh.lw;
  } else if (parts.hole.length) {
    const sh = parts.hole[0];
    const b = rigBounds(sh.pts);
    const cy = (b.y0 + b.y1) / 2, rx = Math.max(2, (b.x1 - b.x0) / 2), cx = (b.x0 + b.x1) / 2;
    /* o desenho está de boca aberta: a linha de repouso é o eixo da elipse, com um
       resto do contorno para não ficar uma régua */
    const line = [];
    for (let i = 0; i < RIG_MOUTH_N; i++) {
      const t = -1 + 2 * i / (RIG_MOUTH_N - 1);
      let near = 0, nd = 1e9;
      for (let k = 0; k < sh.pts.length; k++) {
        const d = Math.abs(sh.pts[k][0] - (cx + t * rx));
        if (d < nd) { nd = d; near = k; }
      }
      line.push([cx + t * rx, cy + (sh.pts[near][1] - cy) * 0.12]);
    }
    restLine = line;
    anchor = sh;
    lineW = sh.lw;
    for (const h of parts.hole) h.alphaMul = 0;
  }

  if (restLine) {
    const n = restLine.length;
    const c = rigCentroid(restLine);
    const style = RIG_MOUTH_STYLE[model.mouth.style] || RIG_MOUTH_STYLE.chill;
    const rngM = mulberry32(hashStr(model.id + ':mouth'));
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
      const flat = restLine[0][1] + (restLine[n - 1][1] - restLine[0][1]) * uu[i];
      const lowest = Math.max(restLine[i][1], flat);
      down = Math.min(down, (chinY - lowest) / wi);
      up = Math.min(up, (restLine[i][1] - noseY) / wi);
      liftUp = Math.min(liftUp, (restLine[i][1] - noseY) / ci);
      liftDown = Math.min(liftDown, (chinY - lowest) / ci);
    }
    down = Math.max(0, down); up = Math.max(0, up);
    const budget = Math.min(down + up, Math.max(10, (chinY - noseY) * 0.85));
    const dn = Math.min(down, budget * 0.75);

    /* limites articulares por ponto: os budgets acima são globais e medidos com o perfil
       sin^1.3, mas a abertura aplica o perfil superelipse do viseme — perto dos cantos
       um vale ~4x o outro, e em bocas de cantos altos a soma passava o nariz. O clamp
       por ponto é a rede: nenhum ponto sai do seu intervalo, aconteça o que acontecer.
       Se o repouso já cruza a linha do nariz/queixo (nariz baixo), o limite é o repouso. */
    const capTop = [], capBot = [];
    for (let i = 0; i < n; i++) {
      const flat = restLine[0][1] + (restLine[n - 1][1] - restLine[0][1]) * uu[i];
      capTop.push(Math.min(restLine[i][1], noseY));
      capBot.push(Math.max(restLine[i][1], flat, chinY));
    }

    /* contorno fechado: lábio de cima (n) + lábio de baixo pela volta (n-2, sem repetir
       os cantos). Os offsets são partilhados entre os pontos que coincidem quando a
       boca está fechada, senão a linha de repouso abria-se com o jitter. */
    const offs = [];
    for (let i = 0; i < n; i++) offs.push([0, 0]);
    const pts = restLine.map(p => [p[0], p[1]]);
    const offsAll = offs.slice();
    for (let i = n - 2; i > 0; i--) { pts.push([restLine[i][0], restLine[i][1]]); offsAll.push(offs[i]); }
    const sh = {
      pts, offs: offsAll, rest: restLine.map(p => [p[0], p[1]]),
      half: n, u: uu, wobSeed: Math.floor(rngM() * 997), capTop, capBot,
      halfW: Math.max(2, (rigBounds(restLine).x1 - rigBounds(restLine).x0) / 2),
      corner0: restLine[0][1], corner1: restLine[n - 1][1],
      ratioK: style.ratio, pK: style.p,
      closed: true, lw: lineW, lw0: lineW, alpha: 1, alphaMul: 1, intensity: 5, jit: 0,
      fill: pal.line, stroke: pal.line, role: 'mouth', part: 'mouthRig',
      cx: c[0], cy: c[1], sx: 1, sy: 1, ox: 0, oy: 0,
      down: dn, up: Math.min(up, budget - dn),
      liftUp: Math.max(0, liftUp), liftDown: Math.max(0, liftDown)
    };
    model.shapes.splice(model.shapes.indexOf(anchor), 0, sh);
    rig.mouth = sh;
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
function applyRig(model, rig, sig, SENS, now) {
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

  const M = rig.mouth;
  if (M) {
    /* A altura sai da largura pela proporção do viseme (é isso que mantém o "O" redondo
       em qualquer cara), afinada pelo carácter do estilo, e é comandada pelo maior de
       dois: o queixo ou o que o próprio viseme exige. Em repouso ambos são zero — a boca
       fecha na sua linha de origem, seja ela o sorriso, o "w" ou a serra do zigzag. */
    const H = D.amount * D.ratio * M.ratioK * 2 * M.halfW * wx * SENS.openHeight;
    const dn0 = Math.min(H - H * D.upShare, M.down);
    const openK = M.down > 0 ? rigClamp(dn0 / M.down, 0, 1) : 0;

    /* Oclusão M/B/P: lábios pressionados são uma *pose*, não só um travão — a linha
       achata (o desenho da 'w' ou da 'zigzag' alisa-se ao pressionar), estreita um
       nadinha e o traço engrossa. Só de boca fechada: o (1-openK) apaga o press assim
       que a mandíbula abre. É o abre-fecha-pressiona que faz a fala ler-se como fala. */
    const pr = rigClamp((sig.press - 0.15) / 0.85, 0, 1) * (1 - openK);
    const prF = pr * 0.3;
    M.lw = M.lw0 * (1 + pr * 0.45);
    const wxp = wx * (1 - pr * 0.08);

    /* Budgets *conjuntos*: o lift dos cantos, a subida do lábio e o achatamento do press
       disputam o mesmo espaço até ao nariz (e o frown com a descida, até ao queixo).
       Cada um sozinho respeitava o limite mas a soma passava-o até ~3px — descontam-se
       uns aos outros, e o /1.05 absorve a amplitude do boil do traço. */
    const lift = smile > 0
      ? Math.min(smile * M.liftUp, M.liftUp * (1 - prF))
      : Math.max(smile * M.liftDown, -M.liftDown * (1 - prF));
    const up = Math.min(H * D.upShare,
      Math.max(0, M.up * (1 - Math.max(0, lift) / Math.max(1e-3, M.liftUp) - prF) / 1.05));
    const dn = Math.min(dn0,
      Math.max(0, M.down * (1 - Math.max(0, -lift) / Math.max(1e-3, M.liftDown) - prF) / 1.05));

    const p = D.p * M.pK;
    const n = M.half;
    /* o boil é multiplicativo na abertura: dá um traço vivo, redesenhado ~8x/s como na
       animação à mão, e desaparece com ela — a boca fechada continua a colapsar exacta.
       Determinístico: sem `now` (testes em node, contact sheet) fica o frame 0. */
    const bkt = Math.floor((now || 0) / 125) + M.wobSeed;
    for (let i = 0; i < n; i++) {
      const b = M.rest[i];
      const w = rigProfile(-1 + 2 * M.u[i], p);
      const jitter = 1 + rigBoil(bkt, i) * 0.05;
      const flat = M.corner0 + (M.corner1 - M.corner0) * M.u[i];
      const capT = M.capTop[i], capB = M.capBot[i];
      /* a base (com o achatamento do press) é presa primeiro, e as duas metades partem
         dela — é isso que mantém o colapso exacto mesmo quando um clamp morde */
      const by = rigClamp(b[1] + (flat - b[1]) * prF, capT, capB);
      const x = M.cx + (b[0] - M.cx) * wxp;
      M.pts[i][0] = x;
      M.pts[i][1] = rigClamp(by - lift * (1 - w) - up * w * jitter, capT, capB);
      if (i > 0 && i < n - 1) {
        /* o lábio de baixo é a mandíbula, e a mandíbula é lisa: à medida que a boca abre,
           vai deixando de copiar o desenho de cima (os dois lóbulos da 'w', os dentes da
           'zigzag') e assenta na linha entre os cantos */
        const bot = by + (flat - by) * openK * 0.8 - lift * (1 - w);
        const j = 2 * n - 2 - i;
        M.pts[j][0] = x;
        M.pts[j][1] = rigClamp(bot + dn * w * jitter, capT, capB);
      }
    }
    M.ox = shiftX;
    rig.jawDrop = dn;
  }

  /* língua e garganta seguem a mandíbula: descem com o lábio de baixo, sem passar o
     queixo, e a garganta cresce com a abertura (só se vê quando a boca está aberta) */
  for (const kid of rig.kids) {
    const sh = kid.sh;
    sh.ox = shiftX;
    sh.oy = Math.min(rig.jawDrop * 0.85, kid.dropMax);
    sh.sx = wx;
    if (kid.throat) {
      const grow = M ? rigClamp(rig.jawDrop / Math.max(6, M.down), 0, 1) : 0;
      sh.sy = 0.25 + grow * 0.9;
      sh.alphaMul = grow > 0.05 ? 1 : 0;
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

/* visemeE e closeSpeed nasceram de experiências revertidas (ver "cicatrizes" no README):
   em vez de constantes minhas, são doses do utilizador — a 0/1 são exactamente a cadeia
   validada, e o que os sliders adicionam foi ele que o pôs lá. */
/* `audioVisemes` e o par `maxJaw`/`maxLip` entram com omissão neutra: a 0 são
   exactamente a cadeia de antes — o primeiro nem lê o espectro, o segundo devolve o
   span fixo. `maxJaw`/`maxLip` não são sliders: são a medição do botão `calibrar
   máximo`, e vivem aqui porque são da cara de quem usa, como as outras. */
/* `speechV4` grava-se SEMPRE com `speechV3` a 1 (é a mesma cadeia, outro filtro): assim
   a hierarquia é v4 > v3 > v2 > v1 na leitura, e quem só olha para o `speechV3` — o
   debug da rig-page, uma config antiga — continua a ver a verdade. */
const SENS_DEFAULTS = { mouthGain: 1, mouthWidth: 1, openHeight: 1, puckerFx: 1, visemeE: 0, closeSpeed: 1, gazeGain: 1, blinkGain: 1, headGain: 1, headMove: 1, sphere: 1, lean: 1, smooth: 1, speechV2: 0, speechV3: 0, speechV4: 0, speechAuto: 0, audioMix: 0, audioVisemes: 0, maxJaw: 0, maxLip: 0 };
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
  syncTouch();
  return i < 0;
}

/* ---------- sensibilidades ----------
   As sensibilidades são da *cara e da câmara de quem está a usar*, não do bicho: guardá-las
   por critter obrigava a reafinar tudo de cada vez que se muda de avatar. Ficam numa base
   global, e um avatar pode ter as suas (override) quando faz sentido para aquele desenho. */
const SENS_KEY = 'critter-sens';

function loadGlobalSens() {
  try { return Object.assign({}, SENS_DEFAULTS, JSON.parse(localStorage.getItem(SENS_KEY)) || {}); }
  catch (e) { return Object.assign({}, SENS_DEFAULTS); }
}
function saveGlobalSens(sens) {
  try { localStorage.setItem(SENS_KEY, JSON.stringify(sens)); } catch (e) {}
  syncTouch();
}
/* ---------- máximo pessoal da boca (botão `calibrar máximo`) ----------
   O curso real da boca desta pessoa nesta câmara, medido uma vez. Fica numa chave
   própria e NÃO entra no exportar/importar nem na sincronização: as sensibilidades
   viajam bem entre dispositivos, uma medição feita nesta câmara não — no telemóvel a
   distância e a lente são outras, e o número certo lá é outro. */
const RIGMAX_KEY = 'critter-rigmax';

function loadRigMax() {
  try { const o = JSON.parse(localStorage.getItem(RIGMAX_KEY)); return o && typeof o === 'object' ? o : null; }
  catch (e) { return null; }
}
function saveRigMax(o) {
  try { if (o) localStorage.setItem(RIGMAX_KEY, JSON.stringify(o)); else localStorage.removeItem(RIGMAX_KEY); }
  catch (e) {}
}

/* as do avatar, se existirem, ganham à base global */
function resolveSens(id) {
  const cfg = loadCritterCfg(id);
  const s = Object.assign(loadGlobalSens(), cfg.sens || {});
  /* o máximo é da cara e da câmara, nunca do avatar: entra sempre por cima, portanto
     uma afinação "só deste avatar" não o pode capturar por engano */
  const m = loadRigMax();
  s.maxJaw = m && m.jaw > 0 ? m.jaw : 0;
  s.maxLip = m && m.lip > 0 ? m.lip : 0;
  return s;
}

/* ---------- exportar / importar tudo ---------- */
function exportAll() {
  const cfgs = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf('critter-cfg:') === 0) cfgs[k.slice(12)] = JSON.parse(localStorage.getItem(k));
    }
  } catch (e) {}
  return { v: 1, favs: loadFavs(), sens: loadGlobalSens(), critters: cfgs };
}
function importAll(data) {
  if (!data || data.v !== 1) throw new Error('ficheiro não é um backup de critters');
  try {
    if (Array.isArray(data.favs)) localStorage.setItem(FAVS_KEY, JSON.stringify(data.favs.slice(0, FAVS_MAX)));
    if (data.sens) saveGlobalSens(Object.assign({}, SENS_DEFAULTS, data.sens));
    for (const id in (data.critters || {})) localStorage.setItem('critter-cfg:' + id, JSON.stringify(data.critters[id]));
  } catch (e) { throw new Error('não foi possível gravar (localStorage cheio?)'); }
  return Object.keys(data.critters || {}).length;
}

/* ---------- sincronização com o servidor ----------
   O localStorage é por browser: abrir no telemóvel dava um avatar sem nada. O servidor
   guarda o mesmo JSON do exportar/importar num ficheiro (WebDAV do nginx, sem backend).
   Resolução de conflitos: ganha quem gravou por último — chega para uso pessoal, mas
   duas afinações em paralelo em dispositivos diferentes perdem uma. */
const SYNC_URL = 'data/critters.json';
const SYNC_AT_KEY = 'critter-sync-at';
let syncTimer = 0, syncOn = true;

function syncStamp() { try { return +localStorage.getItem(SYNC_AT_KEY) || 0; } catch (e) { return 0; } }

/* traz o do servidor se for mais recente que o que está neste dispositivo */
function syncPull() {
  return fetch(SYNC_URL + '?t=' + Date.now(), { cache: 'no-store' })
    .then(r => (r.ok ? r.json() : null))
    .then(data => {
      if (!data || !data.updatedAt || data.updatedAt <= syncStamp()) return false;
      importAll(data);
      try { localStorage.setItem(SYNC_AT_KEY, String(data.updatedAt)); } catch (e) {}
      return true;
    })
    .catch(() => false);
}

function syncPush() {
  if (!syncOn) return Promise.resolve(false);
  const data = exportAll();
  data.updatedAt = Date.now();
  return fetch(SYNC_URL, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }).then(r => {
    if (r.ok) { try { localStorage.setItem(SYNC_AT_KEY, String(data.updatedAt)); } catch (e) {} }
    else if (r.status === 405 || r.status === 403) syncOn = false;  /* servidor sem escrita */
    return r.ok;
  }).catch(() => false);
}

/* chamar depois de qualquer alteração: agrupa as gravações seguidas numa só */
function syncTouch() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncPush, 1200);
}

function loadCritterCfg(id) {
  try { return JSON.parse(localStorage.getItem('critter-cfg:' + id)) || {}; } catch (e) { return {}; }
}
function saveCritterCfg(id, cfg) {
  try { localStorage.setItem('critter-cfg:' + id, JSON.stringify(cfg)); } catch (e) {}
  syncTouch();
}
