#!/usr/bin/env node
/* Verificacao da propria bancada — antes de confiar num numero que ela produza.

   1. determinismo: duas corridas do mesmo replay tem de ser identicas bit a bit
   2. sanidade da metrica: com o envelope deslocado 2 s, o r tem de colapsar
   3. sensibilidade da calibracao: o ranking entre cadeias nao pode depender de se
      o repouso e o p5, o p10 ou o p15 do clip (a calibracao e injectada, e portanto
      uma escolha nossa — se o resultado mudar com ela, o resultado nao vale nada)
   4. cadencia: 30 Hz (mobile) nao pode inverter o ranking */
const fs = require('fs');
const path = require('path');
const { carrega, replay } = require('./replay');
const { metricas } = require('./metrics');

const TRACES = path.join(__dirname, 'traces');
const clips = fs.readdirSync(TRACES).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5));
const MODOS = process.argv.includes('--com-v3') ? ['v1', 'v2', 'v3'] : ['v1', 'v2'];
let falhas = 0;
const falha = (m) => { console.log('  FALHA ' + m); falhas++; };
const ok = (m) => console.log('  ok    ' + m);

/* ---- 1. determinismo ---- */
{
  const tr = carrega(clips[0]);
  const a = replay(tr, { modo: 'v1' }), b = replay(tr, { modo: 'v1' });
  if (JSON.stringify(a) === JSON.stringify(b)) ok('replay deterministico (2 corridas identicas)');
  else falha('replay NAO deterministico');
}

/* ---- 2. sanidade da metrica ---- */
{
  const tr = carrega(clips[0]);
  const tl = replay(tr, { modo: 'v1' });
  const rBom = metricas(tl, tr).r;
  /* mesmo clip, envelope deslocado 2 s: se o r nao colapsar, a metrica nao mede nada */
  const desloc = JSON.parse(JSON.stringify(tr));
  const n = Math.round(2 * tr.audio.hz);
  desloc.audio.envDb = tr.audio.envDb.slice(n).concat(tr.audio.envDb.slice(0, n));
  desloc.clip = tr.clip + '-deslocado';
  const rMau = metricas(tl, desloc).r;
  if (rMau < 0.2 && rBom > 0.5) ok('metrica sa: r ' + rBom.toFixed(3) + ' -> ' + rMau.toFixed(3) + ' com o audio deslocado 2 s');
  else falha('r nao colapsou com o audio deslocado: ' + rBom.toFixed(3) + ' -> ' + rMau.toFixed(3));
}

/* ---- 3. sensibilidade ao percentil da calibracao ---- */
{
  const ordens = {};
  for (const p of [5, 10, 15]) {
    const soma = {};
    for (const m of MODOS) soma[m] = 0;
    for (const c of clips) {
      const tr = carrega(c);
      for (const m of MODOS) soma[m] += metricas(replay(tr, { modo: m, pct: p }), tr).r;
    }
    ordens[p] = MODOS.slice().sort((a, b) => soma[b] - soma[a]).join('>');
    console.log('  pct ' + p + ': ' + MODOS.map(m => m + ' r=' + (soma[m] / clips.length).toFixed(4)).join('  '));
  }
  const vals = Object.values(ordens);
  if (vals.every(v => v === vals[0])) ok('ranking estavel entre p5/p10/p15: ' + vals[0]);
  else falha('ranking MUDA com o percentil: ' + JSON.stringify(ordens));
}

/* ---- 4. cadencia mobile ---- */
{
  const soma = {};
  for (const hz of [60, 30]) {
    soma[hz] = {};
    for (const m of MODOS) soma[hz][m] = 0;
    for (const c of clips) {
      const tr = carrega(c);
      for (const m of MODOS) soma[hz][m] += metricas(replay(tr, { modo: m, hz }), tr).r;
    }
  }
  const o60 = MODOS.slice().sort((a, b) => soma[60][b] - soma[60][a]).join('>');
  const o30 = MODOS.slice().sort((a, b) => soma[30][b] - soma[30][a]).join('>');
  console.log('  60Hz ' + MODOS.map(m => m + '=' + (soma[60][m] / clips.length).toFixed(4)).join(' ') +
    '   30Hz ' + MODOS.map(m => m + '=' + (soma[30][m] / clips.length).toFixed(4)).join(' '));
  if (o60 === o30) ok('ranking igual a 60 e a 30 Hz: ' + o60);
  else falha('ranking inverte no mobile: 60Hz ' + o60 + ' vs 30Hz ' + o30);
}

console.log(falhas ? '\n' + falhas + ' verificacao(oes) falharam' : '\nbancada verificada');
process.exit(falhas ? 1 : 0);
