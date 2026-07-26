#!/usr/bin/env node
/* Replay de um trace pela cadeia real do engine.js.

   Duas decisoes que mudam os numeros e portanto tem de estar certas:

   1. O RELOGIO E O DO LOOP, NAO O DO VIDEO. Ao vivo o `frame()` corre a 60 Hz por
      rAF e chama `processLandmarks` a cada tick, com a camara a debitar ~30 fps —
      ou seja, cada frame da camara passa pela cadeia duas vezes. Como a cadeia e
      um EMA por frame (sem dt na v1/v2), replayar a cadencia do video daria metade
      da suavizacao e metricas erradas. Aqui o tick e 1/60 s e o frame do video
      repete-se, tal como ao vivo. `--hz 30` reproduz o mobile (detTick % 2).

   2. A CALIBRACAO E INJECTADA. Ao vivo sao 50 frames de cara parada; nestes clips
      o actor ja esta a falar quase desde o inicio, portanto a media desses frames
      seria uma boca a meio caminho. Em vez disso o zero vem do proprio clip: p10
      do queixo/abertura/fecho (o repouso que ele de facto tem) e medianas para a
      pose da cabeca. `--pct` varia o percentil, para o teste de sensibilidade.

   Uso:
     node tools/replay.js <clip> [--modo v1|v2|v3] [--hz 60|30] [--pct 10] [--json]
*/
const fs = require('fs');
const path = require('path');
const { loadEngine } = require('./lib/shim');
const { pct, mediana } = require('./lib/stats');

const TRACES = path.join(__dirname, 'traces');
const eng = loadEngine();

/* posicao de cada landmark dentro do array de 19 do trace */
const P = { p10: 0, p152: 1, p33: 2, p133: 3, p159: 4, p145: 5, p362: 6, p263: 7, p386: 8,
  p374: 9, p234: 10, p454: 11, p1: 12, p13: 13, p14: 14, p61: 15, p291: 16, p17: 17, p468: 18 };
const LM_IDX = [10, 152, 33, 133, 159, 145, 362, 263, 386, 374, 234, 454, 1, 13, 14, 61, 291, 17, 468];

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function carrega(nome) {
  const f = path.join(TRACES, nome + '.json');
  if (!fs.existsSync(f)) throw new Error('sem trace: ' + f);
  const tr = JSON.parse(fs.readFileSync(f, 'utf8'));
  /* blendshapes por NOME (o indice nao e contrato) e o array de 478 que a cadeia espera */
  const idx = {};
  tr.bsNames.forEach((n, i) => { idx[n] = i; });
  tr.bsIdx = idx;
  tr.bsObj = tr.frames.map(fr => {
    const o = {};
    for (let i = 0; i < tr.bsNames.length; i++) o[tr.bsNames[i]] = fr.bs[i];
    return o;
  });
  return tr;
}

/* medidas geometricas cruas, iguais as do processLandmarks — so para calibrar */
function cruas(lm) {
  const faceH = dist(lm[P.p10], lm[P.p152]);
  const earL = dist(lm[P.p159], lm[P.p145]) / dist(lm[P.p33], lm[P.p133]);
  const earR = dist(lm[P.p386], lm[P.p374]) / dist(lm[P.p362], lm[P.p263]);
  const midX = (lm[P.p234][0] + lm[P.p454][0]) / 2;
  const halfW = Math.abs(lm[P.p454][0] - lm[P.p234][0]) / 2 + 1e-6;
  return {
    ear: (earL + earR) / 2,
    mouth: dist(lm[P.p13], lm[P.p14]) / faceH,
    mouthW: dist(lm[P.p61], lm[P.p291]) / faceH,
    roll: Math.atan2(lm[P.p263][1] - lm[P.p33][1], lm[P.p263][0] - lm[P.p33][0]),
    yaw: Math.max(-1.2, Math.min(1.2, -(lm[P.p1][0] - midX) / halfW)),
    pitch: ((lm[P.p10][1] + lm[P.p152][1]) / 2 - lm[P.p1][1]) / (lm[P.p152][1] - lm[P.p10][1]),
    hx: (0.5 - lm[P.p1][0]) * 2,
    hy: (lm[P.p1][1] - 0.5) * 2
  };
}

/* o `cal.ready` que a cadeia consumiria depois dos 50 frames — construido do clip */
function fazCalib(tr, SENS, percentil) {
  const p = percentil === undefined ? 10 : percentil;
  const col = { ear: [], mouth: [], mouthW: [], roll: [], yaw: [], pitch: [], hx: [], hy: [] };
  const jaw = [], close = [], gx = [], gy = [];
  const g = SENS.gazeGain;
  for (let i = 0; i < tr.frames.length; i++) {
    const c = cruas(tr.frames[i].lm);
    for (const k in col) col[k].push(c[k]);
    const b = tr.bsObj[i];
    jaw.push(b.jawOpen);
    close.push(b.mouthClose);
    gx.push(Math.max(-1, Math.min(1, -(b.eyeLookOutLeft + b.eyeLookInRight - b.eyeLookInLeft - b.eyeLookOutRight) * 1.3 * g)));
    gy.push(Math.max(-1, Math.min(1, (b.eyeLookDownLeft + b.eyeLookDownRight - b.eyeLookUpLeft - b.eyeLookUpRight) * 1.1 * g)));
  }
  return {
    /* repouso = percentil baixo: e o que a cara faz quando esta calada */
    jaw: pct(jaw, p), mouth: pct(col.mouth, p), close: pct(close, p),
    /* pose da cabeca e abertura dos olhos: mediana, que e o centro e nao o extremo */
    ear: mediana(col.ear), mouthW: mediana(col.mouthW),
    yaw: mediana(col.yaw), pitch: mediana(col.pitch), roll: mediana(col.roll),
    hx: mediana(col.hx), hy: mediana(col.hy), gx: mediana(gx), gy: mediana(gy)
  };
}

const MODOS = { v1: {}, v2: { speechV2: 1 }, v3: { speechV3: 1 }, v3auto: { speechV3: 1, speechAuto: 1 } };

/* Referencia SEM cadeia: a abertura crua deste frame, com a mesma fusao e a mesma
   calibracao, mas sem um unico filtro. Serve para medir o atraso que a *cadeia*
   acrescenta ao tracker.

   Porque nao medir o atraso contra o audio, como estava planeado: nestes clips o
   jawOpen CRU ja aparece adiantado 200-300 ms face ao envelope (o actor prepara a
   boca antes de emitir som, e a cauda do audio dura mais do que o movimento). Isso
   e do material, nao da cadeia — mediu-se antes de escolher a metrica. Contra o
   audio, o numero diria mais sobre o actor do que sobre o codigo; contra a
   referencia crua diz exactamente o que se pode corrigir. O lag vs audio fica
   registado a parte, como informacao. */
function referencia(tr, i, calib) {
  const b = tr.bsObj[i];
  const lm = tr.frames[i].lm;
  const faceH = dist(lm[P.p10], lm[P.p152]);
  const mouthR = dist(lm[P.p13], lm[P.p14]) / faceH;
  const a = (b.jawOpen - calib.jaw - 0.02) / eng.RIG_JAW_SPAN;
  const c = (mouthR - calib.mouth - 0.004) / eng.RIG_LIP_SPAN;
  return Math.max(0, Math.min(1, Math.max(a, c)));
}

/* corre o trace pela cadeia; devolve a timeline que as metricas consomem */
function replay(tr, opts) {
  const o = opts || {};
  const hz = o.hz || 60;
  const SENS = Object.assign({}, eng.SENS_DEFAULTS, MODOS[o.modo || 'v1'] || {}, o.sens || {});
  const cal = { ready: fazCalib(tr, SENS, o.pct), frames: 50, acc: {} };
  const sig = eng.createSig();

  /* array de 478 partilhado: so os 19 indices reais mudam, o resto fica em (0.5,0.5)
     — que e exactamente o que a cadeia nunca le */
  const lm = [];
  for (let i = 0; i < 478; i++) lm.push({ x: 0.5, y: 0.5, z: 0 });
  const poe = f => { for (let k = 0; k < 19; k++) { const q = lm[LM_IDX[k]]; q.x = f.lm[k][0]; q.y = f.lm[k][1]; } };

  const passoTick = 1000 / 60;                 /* o rAF e sempre 60 Hz */
  const cadaN = hz === 30 ? 2 : 1;             /* mobile: deteccao frame sim frame nao */
  const dt = passoTick * cadaN;
  const fim = tr.frames.length ? tr.frames[tr.frames.length - 1].t : 0;

  /* aquecimento: o primeiro frame repetido 0.5 s para os EMA assentarem no repouso.
     Nao entra na timeline — de outro modo a rampa inicial contaminava todas as metricas,
     e do mesmo modo em todas as cadeias, mas com pesos diferentes. */
  if (tr.frames.length) {
    poe(tr.frames[0]);
    for (let i = 0; i < 30; i++) eng.processLandmarks(lm, tr.bsObj[0], sig, cal, SENS, dt);
  }

  const out = { t: [], mouth: [], press: [], ref: [], wE: [], wA: [], wO: [], wU: [], wI: [] };
  let iFrame = 0, tick = 0;
  for (let T = 0; T <= fim; T += passoTick, tick++) {
    while (iFrame + 1 < tr.frames.length && tr.frames[iFrame + 1].t <= T) iFrame++;
    if (tick % cadaN !== 0) continue;
    poe(tr.frames[iFrame]);
    eng.processLandmarks(lm, tr.bsObj[iFrame], sig, cal, SENS, dt);
    const w = eng.rigVisemeWeights(sig, SENS);
    out.t.push(T); out.mouth.push(sig.mouth); out.press.push(sig.press);
    out.ref.push(referencia(tr, iFrame, cal.ready));
    out.wE.push(w.E); out.wA.push(w.A); out.wO.push(w.O); out.wU.push(w.U); out.wI.push(w.I);
  }
  out.hz = hz; out.modo = o.modo || 'v1'; out.clip = tr.clip;
  return out;
}

module.exports = { carrega, replay, fazCalib, MODOS };

/* ---------- CLI ---------- */
if (require.main === module) {
  const args = process.argv.slice(2);
  const val = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
  const nome = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--modo' &&
    args[args.indexOf(a) - 1] !== '--hz' && args[args.indexOf(a) - 1] !== '--pct');
  if (!nome) { console.error('uso: node tools/replay.js <clip> [--modo v1|v2|v3] [--hz 60|30] [--pct 10] [--json]'); process.exit(2); }
  const tr = carrega(nome);
  const tl = replay(tr, { modo: val('--modo', 'v1'), hz: +val('--hz', 60), pct: +val('--pct', 10) });
  if (args.includes('--json')) { console.log(JSON.stringify(tl)); process.exit(0); }
  console.log(nome + '  modo ' + tl.modo + '  ' + tl.hz + 'Hz  ' + tl.t.length + ' amostras');
  console.log('  mouth  min ' + Math.min.apply(null, tl.mouth).toFixed(3) +
    '  p95 ' + pct(tl.mouth, 95).toFixed(3) + '  max ' + Math.max.apply(null, tl.mouth).toFixed(3));
  console.log('  press  max ' + Math.max.apply(null, tl.press).toFixed(3));
}
