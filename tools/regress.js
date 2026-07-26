#!/usr/bin/env node
/* Goldens numericos da cadeia da boca + assercoes da cadeia v3.

     node tools/regress.js --write   grava tools/goldens.json (feito UMA vez, antes
                                     de tocar no engine — nao se reescreve depois)
     node tools/regress.js           compara e sai != 0 a primeira diferenca

   Os goldens cobrem so o que tem de ficar invariante: a v1, a v2 e os sliders todos.
   A v3 nao entra nos goldens (mudaria-os por construcao) — e verificada por
   *propriedades* no fim: selada fecha, vogal limpa nao perde amplitude face a v1,
   press cronico sem tecto. Numeros congelados provariam so que a v3 nao mudou; o que
   interessa provar e que a v3 nao e pior.

   Nao ha tolerancia nos goldens: compara-se a representacao do double. Uma diferenca
   no ultimo bit e uma diferenca de comportamento por explicar. */
const fs = require('fs');
const path = require('path');
const { loadEngine } = require('./lib/shim');
const { mkLm, mkBs, fresh } = require('./lib/fixtures');

const GOLDENS = path.join(__dirname, 'goldens.json');
const eng = loadEngine();
const S0 = eng.SENS_DEFAULTS;
const sens = o => Object.assign({}, S0, o || {});

/* ---------- vocabulario de poses ---------- */
/* cada entrada e [gap entre os labios interiores, blendshapes] — o par que a cadeia consome */
const POSE = {
  repouso:    [0.002, { jawOpen: 0.05 }],
  vogal:      [0.014, { jawOpen: 0.18 }],
  vogalPress: [0.014, { jawOpen: 0.18, mouthClose: 0.25, mouthPressLeft: 0.05, mouthPressRight: 0.05 }],
  vogalSorri: [0.014, { jawOpen: 0.18, mouthSmileLeft: 0.25, mouthSmileRight: 0.25 }],
  escancara:  [0.030, { jawOpen: 0.45, mouthClose: 0.3 }],
  selada:     [0.002, { jawOpen: 0.55, mouthClose: 0.6, mouthPressLeft: 0.3, mouthPressRight: 0.3 }],
  bilabial:   [0.001, { jawOpen: 0.10, mouthClose: 0.55, mouthPressLeft: 0.4, mouthPressRight: 0.4,
                        mouthRollLower: 0.3, mouthRollUpper: 0.3 }],
  eee:        [0.008, { jawOpen: 0.10, mouthSmileLeft: 0.6, mouthSmileRight: 0.6,
                        mouthStretchLeft: 0.12, mouthStretchRight: 0.12 }],
  ooo:        [0.012, { jawOpen: 0.15, mouthPucker: 0.6, mouthFunnel: 0.4 }],
  fecho:      [0.002, { jawOpen: 0.05, mouthClose: 0.4 }],
  baixinho:   [0.006, { jawOpen: 0.09, mouthClose: 0.1 }]
};

function passo(sig, cal, S, nome) {
  const [gap, bs] = POSE[nome];
  eng.processLandmarks(mkLm(gap), mkBs(bs), sig, cal, S);
}

/* corre uma sequencia [[pose, n], ...]; devolve o estado final e a serie do sig.mouth */
function corre(S, seq) {
  const { sig, cal } = fresh(eng, S);
  const serie = [];
  for (const [nome, n] of seq) {
    for (let i = 0; i < n; i++) { passo(sig, cal, S, nome); serie.push(sig.mouth); }
  }
  return { sig, cal, serie };
}

/* dump completo do sig + pesos dos visemes: apanha regressoes fora da boca tambem */
function dump(sig, S) {
  const w = eng.rigVisemeWeights(sig, S);
  const out = {};
  for (const k of Object.keys(sig).sort()) out[k] = sig[k];
  for (const k of Object.keys(w).sort()) out['w_' + k] = w[k];
  return out;
}

/* ---------- baterias invariantes ---------- */
const R = { engine: {}, sens: {}, casos: {}, modos: {}, sweep: {}, series: {} };

R.engine.RIG_JAW_SPAN = eng.RIG_JAW_SPAN;
R.engine.RIG_LIP_SPAN = eng.RIG_LIP_SPAN;
/* guardado a parte: chaves novas sao permitidas, apagadas ou alteradas nao (regra dura) */
R.sens = Object.assign({}, S0);

/* -- casos A-F: as metas que a cadeia validada ao vivo tem de continuar a cumprir -- */
{
  const S = sens();
  {  /* A: queixo caido com labios selados — nao pode abrir */
    const { sig } = corre(S, [['selada', 40]]);
    R.casos.A_selada = { mouth: sig.mouth, press: sig.press };
  }
  {  /* B: fala 4 sil/s a 30fps — o vale entre silabas e o que conta */
    const { sig, cal } = fresh(eng, S);
    let mn = 1, mx = 0;
    for (let c = 0; c < 40; c++) {
      for (let i = 0; i < 4; i++) { passo(sig, cal, S, 'vogal'); if (c > 2) mx = Math.max(mx, sig.mouth); }
      for (let i = 0; i < 3; i++) { passo(sig, cal, S, 'fecho'); if (c > 2) mn = Math.min(mn, sig.mouth); }
    }
    R.casos.B_fala4hz = { pico: mx, vale: mn };
  }
  {  /* C: "eee" — o E vive da largura, nao da abertura */
    const { sig } = corre(S, [['eee', 40]]);
    const w = eng.rigVisemeWeights(sig, S);
    R.casos.C_eee = { E: w.E, I: w.I, mouth: sig.mouth };
  }
  {  /* D: vogal limpa — a amplitude de referencia, nada a pode baixar */
    const { sig } = corre(S, [['vogal', 40]]);
    R.casos.D_vogal = { mouth: sig.mouth };
  }
  {  /* E: vogal com ruido de press (o mouthClose co-dispara na cara real) */
    const { sig } = corre(S, [['vogalPress', 40]]);
    R.casos.E_vogalPress = { mouth: sig.mouth, press: sig.press };
  }
  {  /* F: meio sorriso a falar nao pode disparar o E */
    const { sig } = corre(S, [['vogalSorri', 40]]);
    const w = eng.rigVisemeWeights(sig, S);
    R.casos.F_vogalSorri = { E: w.E, A: w.A, smileW: sig.smileW };
  }
}

/* -- v1 vs v2 nas poses que separam as duas cadeias -- */
for (const [tag, o] of [['v1', {}], ['v2', { speechV2: 1 }]]) {
  const S = sens(o), linha = {};
  for (const pose of ['vogalPress', 'escancara', 'selada', 'bilabial', 'vogal', 'baixinho']) {
    const { sig } = corre(S, [[pose, 40]]);
    linha[pose] = { mouth: sig.mouth, press: sig.press };
  }
  R.modos[tag] = linha;
}

/* -- sweep: sig completo em todas as poses, com cada slider fora do neutro. E aqui que
      uma alteracao "inofensiva" fora da boca aparece. -- */
const VARIANTES = [
  ['base', {}], ['v2', { speechV2: 1 }],
  ['gain0.6', { mouthGain: 0.6 }], ['gain1.5', { mouthGain: 1.5 }],
  ['largura0.5', { mouthWidth: 0.5 }], ['altura1.4', { openHeight: 1.4 }],
  ['fecho2', { closeSpeed: 2 }], ['smooth0.5', { smooth: 0.5 }], ['smooth2', { smooth: 2 }],
  ['visemeE1', { visemeE: 1 }], ['pucker0.5', { puckerFx: 0.5 }],
  ['blink1.6', { blinkGain: 1.6 }], ['gaze0.5', { gazeGain: 0.5 }], ['head1.4', { headGain: 1.4 }]
];
for (const [tag, o] of VARIANTES) {
  const S = sens(o), grupo = {};
  for (const pose of Object.keys(POSE)) grupo[pose] = dump(corre(S, [[pose, 40]]).sig, S);
  R.sweep[tag] = grupo;
}

/* -- series por frame: o teste mais sensivel ao tempo que ha aqui. Se o dt entrar na
      cadeia e nao for neutro com os toggles a 0, rebenta nestas listas. -- */
const SEQS = {
  ataque:    [['repouso', 5], ['vogal', 25], ['repouso', 25]],
  silabas:   [['vogal', 4], ['fecho', 3], ['vogal', 4], ['fecho', 3], ['vogal', 4], ['fecho', 6]],
  bilabiais: [['vogal', 6], ['bilabial', 5], ['vogal', 6], ['bilabial', 5], ['vogal', 8]],
  rampa:     [['baixinho', 15], ['vogal', 15], ['escancara', 15], ['repouso', 15]]
};
for (const [tag, o] of [['v1', {}], ['v2', { speechV2: 1 }]]) {
  const S = sens(o), g = {};
  for (const nome of Object.keys(SEQS)) g[nome] = corre(S, SEQS[nome]).serie;
  R.series[tag] = g;
}

/* ---------- assercoes da v3 (propriedades, nao numeros congelados) ---------- */
/* so correm quando o engine ja tem a v3; antes disso a seccao e saltada */
function verificaV3() {
  const temV3 = 'speechV3' in S0;
  if (!temV3) return { saltado: true, linhas: [] };
  const V1 = sens(), V3 = sens({ speechV3: 1 });
  const m = (S, pose, n) => corre(S, [[pose, n || 40]]).sig;
  const linhas = [];
  const teste = (nome, ok, detalhe) => linhas.push({ nome, ok, detalhe });

  const selada3 = m(V3, 'selada');
  teste('selada fecha', selada3.mouth < 0.06, 'mouth=' + selada3.mouth.toFixed(3) + ' (<0.06)');

  const bil3 = m(V3, 'bilabial');
  teste('bilabial fecha', bil3.mouth < 0.10, 'mouth=' + bil3.mouth.toFixed(3) + ' (<0.10)');
  teste('bilabial marca press', bil3.press > 0.35, 'press=' + bil3.press.toFixed(3) + ' (>0.35)');

  const vog1 = m(V1, 'vogal'), vog3 = m(V3, 'vogal');
  teste('vogal limpa nao perde vs v1', vog3.mouth >= vog1.mouth * 0.9,
    'v3=' + vog3.mouth.toFixed(3) + ' vs v1=' + vog1.mouth.toFixed(3) + ' (>=90%)');

  const pr1 = m(V1, 'vogalPress'), pr3 = m(V3, 'vogalPress');
  teste('press cronico sem tecto', pr3.mouth > pr1.mouth,
    'v3=' + pr3.mouth.toFixed(3) + ' vs v1=' + pr1.mouth.toFixed(3));

  const esc1 = m(V1, 'escancara'), esc3 = m(V3, 'escancara');
  teste('escancarada usa mais curso que a v1', esc3.mouth > esc1.mouth,
    'v3=' + esc3.mouth.toFixed(3) + ' vs v1=' + esc1.mouth.toFixed(3));

  /* silencio prolongado: sem flicker significa serie plana no fim */
  const sil = corre(V3, [['repouso', 60]]).serie.slice(-30);
  const amp = Math.max.apply(null, sil) - Math.min.apply(null, sil);
  teste('silencio sem flicker', amp < 0.01, 'amplitude=' + amp.toFixed(4) + ' (<0.01)');

  /* a v3 tem de continuar a fechar entre silabas — o vale nao pode subir face a v1 */
  const vale = S => {
    const { sig, cal } = fresh(eng, S);
    let mn = 1;
    for (let c = 0; c < 40; c++) {
      for (let i = 0; i < 4; i++) passo(sig, cal, S, 'vogal');
      for (let i = 0; i < 3; i++) { passo(sig, cal, S, 'fecho'); if (c > 2) mn = Math.min(mn, sig.mouth); }
    }
    return mn;
  };
  const va1 = vale(V1), va3 = vale(V3);
  teste('vale entre silabas nao sobe', va3 <= va1 + 0.05,
    'v3=' + va3.toFixed(3) + ' vs v1=' + va1.toFixed(3));

  return { saltado: false, linhas };
}

/* ---------- gravar ou comparar ---------- */
const escrever = process.argv.includes('--write');
const txt = JSON.stringify(R, null, 1);

if (escrever) {
  fs.writeFileSync(GOLDENS, txt + '\n');
  console.log('goldens gravados em ' + GOLDENS);
  console.log('  casos ' + Object.keys(R.casos).length +
    ' · modos ' + Object.keys(R.modos).length +
    ' · sweep ' + Object.keys(R.sweep).length +
    ' · series ' + Object.keys(R.series).length +
    ' · sliders ' + Object.keys(R.sens).length);
  process.exit(0);
}

if (!fs.existsSync(GOLDENS)) {
  console.error('sem goldens.json — correr primeiro: node tools/regress.js --write');
  process.exit(2);
}

const velho = JSON.parse(fs.readFileSync(GOLDENS, 'utf8'));
const difs = [];

/* SENS: chaves novas sao permitidas (a v3 traz duas); apagar, renomear ou mudar
   o valor de omissao de uma existente e violacao da regra dura numero 1 */
const novas = [];
for (const k of Object.keys(velho.sens)) {
  if (!(k in R.sens)) difs.push('SENS.' + k + ': chave REMOVIDA ou renomeada');
  else if (!Object.is(velho.sens[k], R.sens[k])) difs.push('SENS.' + k + ': omissao ' + velho.sens[k] + ' -> ' + R.sens[k]);
}
for (const k of Object.keys(R.sens)) if (!(k in velho.sens)) novas.push(k + '=' + R.sens[k]);

/* comparacao recursiva do resto, para dizer *onde* difere e nao so que difere */
(function cmp(a, b, caminho) {
  if (difs.length > 40) return;
  const ta = a === null ? 'null' : Array.isArray(a) ? 'array' : typeof a;
  const tb = b === null ? 'null' : Array.isArray(b) ? 'array' : typeof b;
  if (ta !== tb) { difs.push(caminho + ': tipo ' + ta + ' -> ' + tb); return; }
  if (ta === 'array') {
    if (a.length !== b.length) { difs.push(caminho + ': comprimento ' + a.length + ' -> ' + b.length); return; }
    for (let i = 0; i < a.length; i++) cmp(a[i], b[i], caminho + '[' + i + ']');
  } else if (ta === 'object') {
    for (const k of Object.keys(a)) {
      if (!(k in b)) { difs.push(caminho + '.' + k + ': desapareceu'); continue; }
      cmp(a[k], b[k], caminho + '.' + k);
    }
    for (const k of Object.keys(b)) if (!(k in a)) difs.push(caminho + '.' + k + ': novo');
  } else if (ta === 'number') {
    if (!Object.is(a, b)) difs.push(caminho + ': ' + a + ' -> ' + b);
  } else if (a !== b) difs.push(caminho + ': ' + a + ' -> ' + b);
})({ engine: velho.engine, casos: velho.casos, modos: velho.modos, sweep: velho.sweep, series: velho.series },
   { engine: R.engine, casos: R.casos, modos: R.modos, sweep: R.sweep, series: R.series }, '');

if (difs.length) {
  console.error('REGRESSAO: ' + difs.length + ' diferenca(s) face aos goldens');
  for (const d of difs.slice(0, 40)) console.error('  ' + d);
  process.exit(1);
}
console.log('goldens OK — v1/v2 e sliders identicos bit a bit');
if (novas.length) console.log('  chaves SENS novas (permitido): ' + novas.join(', '));

const v3 = verificaV3();
if (v3.saltado) { console.log('  v3 ainda nao existe no engine — assercoes saltadas'); process.exit(0); }
console.log('assercoes da v3:');
let falhou = 0;
for (const l of v3.linhas) {
  console.log('  ' + (l.ok ? 'ok  ' : 'FALHA ') + l.nome + '  ' + l.detalhe);
  if (!l.ok) falhou++;
}
if (falhou) { console.error(falhou + ' assercao(oes) da v3 falharam'); process.exit(1); }
console.log('  ' + v3.linhas.length + '/' + v3.linhas.length + ' ok');
