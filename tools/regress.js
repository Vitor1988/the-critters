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
const { POSE, corre: corre0, vale, assercoesV3, assercoesAudio,
  assercoesVisemes, assercoesMaximo, assercoesV4, assercoesBocas,
  assercoesEmocoes } = require('./lib/guardas');

const GOLDENS = path.join(__dirname, 'goldens.json');
const eng = loadEngine();
const S0 = eng.SENS_DEFAULTS;
const sens = o => Object.assign({}, S0, o || {});

/* as poses e o motor de sequencias vivem em lib/guardas.js — partilhados com o
   grid-search, que precisa exactamente das mesmas definicoes */
const passo = (sig, cal, S, nome) => {
  const [gap, bs] = POSE[nome];
  eng.processLandmarks(mkLm(gap), mkBs(bs), sig, cal, S);
};
const corre = (S, seq) => corre0(eng, S, seq);

/* dump completo do sig + pesos dos visemes: apanha regressoes fora da boca tambem.
   So os campos numericos: o `sig` guarda tambem o estado interno dos filtros da v3
   (um objecto, nulo na v1/v2), que e implementacao e nao sinal. Como todos os sinais
   sao numeros, este filtro nao muda um unico valor dos goldens ja gravados. */
function dump(sig, S) {
  const w = eng.rigVisemeWeights(sig, S);
  const out = {};
  for (const k of Object.keys(sig).sort()) if (typeof sig[k] === 'number') out[k] = sig[k];
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
/* definidas em lib/guardas.js: o grid-search usa-as como guardas duros, e e por isso
   que tem de ser as mesmas e nao uma copia */
const verificaV3 = () => assercoesV3(eng);

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

let falhou = 0, total = 0;
function bateria(titulo, r, semNada) {
  if (r.saltado) { console.log('  ' + semNada); return; }
  console.log(titulo);
  for (const l of r.linhas) {
    console.log('  ' + (l.ok ? 'ok  ' : 'FALHA ') + l.nome + '  ' + l.detalhe);
    if (!l.ok) falhou++;
  }
  total += r.linhas.length;
  console.log('  ' + r.linhas.filter(l => l.ok).length + '/' + r.linhas.length + ' ok');
}

bateria('assercoes da v3:', verificaV3(), 'v3 ainda nao existe no engine — assercoes saltadas');
bateria('assercoes do audio:', assercoesAudio(eng), 'audioMix ainda nao existe no engine — assercoes saltadas');
bateria('assercoes dos visemes por audio:', assercoesVisemes(eng), 'audioVisemes ainda nao existe no engine — assercoes saltadas');
bateria('assercoes do maximo pessoal:', assercoesMaximo(eng), 'maxJaw ainda nao existe no engine — assercoes saltadas');
bateria('assercoes da v4:', assercoesV4(eng), 'speechV4 ainda nao existe no engine — assercoes saltadas');
bateria('assercoes das bocas trocadas:', assercoesBocas(eng), 'RIG_MOUTH_SWAP ainda nao existe no engine — assercoes saltadas');
bateria('assercoes das emocoes:', assercoesEmocoes(eng), 'RIG_EMOCOES ainda nao existe no engine — assercoes saltadas');

if (falhou) { console.error(falhou + ' de ' + total + ' assercao(oes) falharam'); process.exit(1); }
