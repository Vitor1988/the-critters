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

   3. O AUDIO E INJECTADO COMO SE FOSSE O MICROFONE. O trace traz o envelope do proprio
      clip (`audio.envDb`, 100 Hz), e com `--audio <mix>` ele entra no
      `processLandmarks` pelo mesmo parametro que ao vivo traz o microfone, alinhado
      por timestamp. Duas ressalvas que mudam a leitura dos numeros:

      · **os clips do RAVDESS sao de estudio**: o silencio deles e silencio DIGITAL
        (-120 dB, zeros exactos), coisa que nenhum microfone da. Sem um chao de ruido
        realista por baixo, o gate automatico nunca era exercitado. Dai o `--ruido
        <db>`, que soma potencia de ruido ao envelope: e o mesmo discurso gravado numa
        sala a serio. O valor tipico de um portatil anda pelos -55 dB.
      · **CIRCULARIDADE**: a metrica `r` correlaciona a boca com este mesmo envelope.
        Alimentar a boca com ele infla o `r` por construcao — um `r` alto aqui nao
        prova nada sobre o hibrido. O que a bancada pode provar sao as propriedades
        de seguranca (a oclusao continua a ganhar, o silencio fecha, o ruido nao abre,
        o jitter nao explode, a amplitude nao inflaciona). O ritmo e so ao vivo.

    4. AS BANDAS ENTRAM PELO MESMO SITIO. Com `--visemes <dose>` o trace injecta tambem
      o `audio.bandas` (7 log-energias a 100 Hz, do mesmo clip) no `au.bandas`, que e
      exactamente o que o rig-page passa da AnalyserNode. A derivacao (brilho, baseline
      por mediana, canais round/spread) corre dentro do engine, nao aqui — a bancada
      nao tem uma copia dela.

  Uso:
     node tools/replay.js <clip> [--modo v1|v2|v3|v4] [--hz 60|30] [--pct 10]
                                 [--audio <0..1>] [--visemes <0..1>] [--ruido <db>] [--json]

  `--hz` so conhece dois valores: 60 (um tick por frame) e 30 (`detTick % 2`, o mobile).
  Qualquer outro numero cai no caminho dos 60 e da exactamente os mesmos numeros — nao
  ha aqui uma cadencia continua, ha os dois casos que a pagina de facto tem.
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

/* a `v4` grava-se com o `speechV3` a 1 tambem, e e assim que a pagina a escreve: e a
   mesma cadeia, so muda o EMA. Nas metricas desta bancada ela da o MESMO que a v3 (o
   unico canal que difere e o do sorriso, e ele so chega a boca pelo slider `viseme E`,
   que esta a 0) — esta aqui para se poder pedir, e para o `verify-bancada` poder provar
   essa igualdade em video real em vez de a assumir. */
const MODOS = { v1: {}, v2: { speechV2: 1 }, v3: { speechV3: 1 },
  v4: { speechV3: 1, speechV4: 1 }, v3auto: { speechV3: 1, speechAuto: 1 } };

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

/* Envelope do clip com um chao de ruido por baixo, em dB. Soma-se POTENCIA, nao dB:
   o envelope e 20·log10(rms), portanto 10·log10(10^(a/10) + 10^(n/10)) e a soma certa
   de dois sinais descorrelacionados. O tremor de +-1.5 dB e o que um chao de sala tem
   de facto, e sem ele o histograma do chao caia todo num unico bin — mas vem de um
   PRNG com semente fixa, porque o replay tem de ser determinstico. */
function comRuido(envDb, ruidoDb) {
  if (!(ruidoDb > -200)) return envDb;
  let s = 12345;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  return envDb.map(v => {
    const n = ruidoDb + (rnd() - 0.5) * 3;
    return 10 * Math.log10(Math.pow(10, v / 10) + Math.pow(10, n / 10));
  });
}

/* corre o trace pela cadeia; devolve a timeline que as metricas consomem */
function replay(tr, opts) {
  const o = opts || {};
  const hz = o.hz || 60;
  const SENS = Object.assign({}, eng.SENS_DEFAULTS, MODOS[o.modo || 'v1'] || {},
    o.audio > 0 ? { audioMix: o.audio } : {},
    o.visemes > 0 ? { audioVisemes: o.visemes } : {}, o.sens || {});
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

  /* microfone simulado: o mesmo objecto reutilizado, como ao vivo (o rig-page tambem
     nao aloca um por frame). `null` quando nao ha mistura — e o caminho de video puro. */
  const usaAu = o.audio > 0 || o.visemes > 0;
  const env = usaAu ? comRuido(tr.audio.envDb, o.ruido) : null;
  const auHz = tr.audio ? tr.audio.hz : 100;
  /* as bandas so vao quando alguem as pede: sem `--visemes` o `au` sai igual ao que
     sempre saiu, e o engine nem lhes toca */
  const bandas = o.visemes > 0 ? (tr.audio.bandas || null) : null;
  if (o.visemes > 0 && !bandas) throw new Error('trace sem audio.bandas — correr: python3 tools/capture.py --so-audio');
  const au = env ? { db: env[0], conf: 1 } : null;
  if (au && bandas) au.bandas = bandas[0];
  const poeAu = T => {
    if (!env) return;
    const i = Math.round(T * auHz / 1000);
    au.db = env[Math.max(0, Math.min(env.length - 1, i))];
    if (bandas) au.bandas = bandas[Math.max(0, Math.min(bandas.length - 1, i))];
  };

  /* aquecimento: o primeiro frame repetido 0.5 s para os EMA assentarem no repouso.
     Nao entra na timeline — de outro modo a rampa inicial contaminava todas as metricas,
     e do mesmo modo em todas as cadeias, mas com pesos diferentes. */
  if (tr.frames.length) {
    poe(tr.frames[0]);
    poeAu(0);
    for (let i = 0; i < 30; i++) eng.processLandmarks(lm, tr.bsObj[0], sig, cal, SENS, dt, au);
  }

  const out = { t: [], mouth: [], press: [], ref: [], au: [], wE: [], wA: [], wO: [], wU: [], wI: [],
    round: [], spread: [] };
  let iFrame = 0, tick = 0;
  for (let T = 0; T <= fim; T += passoTick, tick++) {
    while (iFrame + 1 < tr.frames.length && tr.frames[iFrame + 1].t <= T) iFrame++;
    if (tick % cadaN !== 0) continue;
    poe(tr.frames[iFrame]);
    poeAu(T);
    eng.processLandmarks(lm, tr.bsObj[iFrame], sig, cal, SENS, dt, au);
    const w = eng.rigVisemeWeights(sig, SENS);
    out.t.push(T); out.mouth.push(sig.mouth); out.press.push(sig.press);
    out.ref.push(referencia(tr, iFrame, cal.ready));
    out.au.push(sig.au ? sig.au.lvl : 0);
    out.wE.push(w.E); out.wA.push(w.A); out.wO.push(w.O); out.wU.push(w.U); out.wI.push(w.I);
    out.round.push(sig.au ? sig.au.round : 0);
    out.spread.push(sig.au ? sig.au.spread : 0);
  }
  out.hz = hz; out.modo = o.modo || 'v1'; out.clip = tr.clip;
  out.audio = o.audio || 0; out.visemes = o.visemes || 0; out.ruido = env ? o.ruido : null;
  return out;
}

/* `eng` sai daqui para o grid-search poder mexer no RIG_V3 desta MESMA instancia do
   engine — carregar uma segunda daria outro objecto e as afinacoes nao teriam efeito */
module.exports = { carrega, replay, fazCalib, comRuido, MODOS, eng };

/* ---------- CLI ---------- */
if (require.main === module) {
  const args = process.argv.slice(2);
  const val = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
  const FLAGS = ['--modo', '--hz', '--pct', '--audio', '--visemes', '--ruido'];
  const nome = args.find(a => !a.startsWith('--') && FLAGS.indexOf(args[args.indexOf(a) - 1]) < 0);
  if (!nome) { console.error('uso: node tools/replay.js <clip> [--modo v1|v2|v3|v4] [--hz 60|30] [--pct 10] [--audio 0..1] [--visemes 0..1] [--ruido dB] [--json]'); process.exit(2); }
  const tr = carrega(nome);
  const tl = replay(tr, { modo: val('--modo', 'v1'), hz: +val('--hz', 60), pct: +val('--pct', 10),
    audio: +val('--audio', 0), visemes: +val('--visemes', 0), ruido: +val('--ruido', -55) });
  if (args.includes('--json')) { console.log(JSON.stringify(tl)); process.exit(0); }
  console.log(nome + '  modo ' + tl.modo + '  ' + tl.hz + 'Hz  ' + tl.t.length + ' amostras' +
    (tl.audio ? '  audio ' + tl.audio + ' (ruido ' + tl.ruido + ' dB)' : ''));
  console.log('  mouth  min ' + Math.min.apply(null, tl.mouth).toFixed(3) +
    '  p95 ' + pct(tl.mouth, 95).toFixed(3) + '  max ' + Math.max.apply(null, tl.mouth).toFixed(3));
  console.log('  press  max ' + Math.max.apply(null, tl.press).toFixed(3));
  if (tl.audio) console.log('  nivel  p50 ' + pct(tl.au, 50).toFixed(3) +
    '  p95 ' + pct(tl.au, 95).toFixed(3) + '  max ' + Math.max.apply(null, tl.au).toFixed(3));
  if (tl.visemes) console.log('  forma  round p95 ' + pct(tl.round, 95).toFixed(3) +
    '  spread p95 ' + pct(tl.spread, 95).toFixed(3) +
    '  wO p95 ' + pct(tl.wO, 95).toFixed(3) + '  wE p95 ' + pct(tl.wE, 95).toFixed(3));
}
