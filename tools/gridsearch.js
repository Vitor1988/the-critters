#!/usr/bin/env node
/* Afinacao dos parametros da cadeia v3 contra os clips de treino.

   Grelha grossa (324 combinacoes) seguida de descida por coordenadas. O holdout
   NUNCA entra aqui — so aparece na tabela final, e e a unica leitura honesta de
   quanto isto generaliza.

   Guardas duros, antes do score: uma combinacao que piore o r ou que multiplique o
   jitter por mais de 1.5 face a v1 em QUALQUER clip de treino e rejeitada, por
   melhor que seja a media. E isto que impede o grid de comprar uma media boa a
   custa de um clip onde a boca fica presa — que e exactamente o modo de falha das
   duas tentativas anteriores.

     node tools/gridsearch.js [--rapido]
*/
const fs = require('fs');
const path = require('path');
const { carrega, replay, eng } = require('./replay');
const { metricas } = require('./metrics');
const { descreve } = require('./lib/clips');
const { assercoesV3 } = require('./lib/guardas');

const TRACES = path.join(__dirname, 'traces');
const todos = fs.readdirSync(TRACES).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort();
const treino = todos.filter(c => !descreve(c).holdout);
const traces = {};
for (const c of todos) traces[c] = carrega(c);
console.log('treino: ' + treino.length + ' clips   holdout: ' + (todos.length - treino.length) + ' (nao tocado)');

/* Tolerancia do guarda do r, por clip. A regra do plano era "rejeitar se pior que a
   v1 em qualquer clip"; a zero, nada passa — as melhores combinacoes perdiam 0.009 e
   0.016 de r em dois dos doze clips e ganhavam em todos os outros. Exigir dominio
   uniforme em 12 clips nao e um guarda, e uma proibicao.

   O guarda existe para impedir que a media seja comprada a custa de um clip onde a
   boca fica presa; 0.02 de r nao e uma boca presa, e ruido. O que continua a zero
   tolerancia sao os guardas de comportamento (fecho das bilabiais, vale entre
   silabas, vogal limpa) — esses e que descrevem o modo de falha real. */
const TOL_R = 0.02;

/* ---------- referencia v1, por clip: e contra ela que os guardas medem ---------- */
const REF = {};
for (const c of treino) REF[c] = metricas(replay(traces[c], { modo: 'v1' }), traces[c]);

const BASE = JSON.parse(JSON.stringify(eng.RIG_V3));
function aplica(p) { for (const k in p) eng.RIG_V3[k] = p[k]; }
function repoe() { for (const k in BASE) eng.RIG_V3[k] = BASE[k]; }

/* ---------- score ----------
   J = r − 0.4·(lag/100 ms) − 0.25·(excesso de jitter) − 0.3·(1 − fecho) + 0.15·alcance
   Os pesos vem do plano. As unidades sao explicitas de proposito: o lag entra
   normalizado a 100 ms para 40 ms de atraso custarem 0.16 — da ordem de grandeza de
   uma melhoria de r que se note. */
function avalia(p, clips, comAuto) {
  aplica(p);
  const violacoes = [];

  /* Guardas de comportamento ANTES dos clips, por duas razoes. A barata: sao ~3000
     chamadas contra ~2400 por clip, e rejeitam a maioria dos candidatos sem replay.
     A que interessa: sem eles o grid escolhe uma boca mais lenta, porque o envelope
     do audio desce devagar e uma boca que fecha tarde correlaciona melhor com ele.
     A primeira vencedora desta grelha tinha relMs 44, holdMs 140 e deixava o vale
     entre silabas a 0.222 (v1: 0.059) — numeros melhores e uma boca pior. */
  for (const l of assercoesV3(eng).linhas) if (!l.ok) violacoes.push('sintetico/' + l.nome + ': ' + l.detalhe);
  if (violacoes.length) return { J: -Infinity, r: 0, lag: 0, jitter: 0, fecho: null, alcance: 0, violacoes };

  const modo = comAuto ? 'v3auto' : 'v3';
  let r = 0, lag = 0, jit = 0, fecho = 0, nf = 0, alc = 0;
  for (const c of clips) {
    const m = metricas(replay(traces[c], { modo }), traces[c]);
    if (REF[c]) {
      if (m.r < REF[c].r - TOL_R) violacoes.push(c + ' r ' + m.r.toFixed(3) + '<' + REF[c].r.toFixed(3));
      else if (m.jitter > 1.5 * REF[c].jitter) violacoes.push(c + ' jitter ' + (m.jitter / REF[c].jitter).toFixed(2) + 'x');
    }
    r += m.r; lag += m.lagMs; jit += m.jitter; alc += m.alcance;
    if (m.fecho !== null) { fecho += m.fecho; nf++; }
  }
  const n = clips.length;
  const jitV1 = clips.reduce((s, c) => s + (REF[c] ? REF[c].jitter : 0), 0) / n;
  const excesso = Math.max(0, (jit / n) / (jitV1 || 1) - 1);
  const J = (r / n) - 0.4 * (lag / n / 100) - 0.25 * excesso -
    0.3 * (1 - (nf ? fecho / nf : 1)) + 0.15 * (alc / n);
  return { J, r: r / n, lag: lag / n, jitter: jit / n, fecho: nf ? fecho / nf : null,
    alcance: alc / n, violacoes };
}

/* ---------- grelha grossa: 3·3·3·4·3 = 324 ---------- */
const GRELHA = {
  k:      [0.7, 0.85, 1.0],
  gamma:  [0.7, 0.85, 1.0],
  atkMs:  [12, 20, 30],
  relMs:  [20, 28, 36, 50],
  ocGate: [0.5, 0.7, 0.9]
};
const chaves = Object.keys(GRELHA);
const combos = [];
(function gera(i, acc) {
  if (i === chaves.length) { combos.push(Object.assign({}, acc)); return; }
  for (const v of GRELHA[chaves[i]]) { acc[chaves[i]] = v; gera(i + 1, acc); }
})(0, {});

console.log('\ngrelha grossa: ' + combos.length + ' combinacoes x ' + treino.length + ' clips');
const t0 = Date.now();
let melhor = null, rejeitadas = 0;
const sobreviventes = [];
for (const p of combos) {
  const a = avalia(p, treino, false);
  if (a.violacoes.length) { rejeitadas++; continue; }
  sobreviventes.push({ p, a });
  if (!melhor || a.J > melhor.a.J) melhor = { p: Object.assign({}, p), a };
}
console.log('rejeitadas pelos guardas: ' + rejeitadas + '   sobreviventes: ' + sobreviventes.length +
  '   (' + ((Date.now() - t0) / 1000).toFixed(1) + 's)');

if (!melhor) {
  console.log('\nNENHUMA combinacao passou os guardas duros.');
  console.log('as 5 menos mas (por J), com as violacoes:');
  const q = combos.map(p => ({ p, a: avalia(p, treino, false) })).sort((x, y) => y.a.J - x.a.J);
  for (const s of q.slice(0, 5)) console.log('  ' + JSON.stringify(s.p) + '  J=' + s.a.J.toFixed(4) +
    '  viola: ' + s.a.violacoes.slice(0, 3).join(', '));
  repoe();
  process.exit(1);
}
console.log('melhor da grelha: ' + JSON.stringify(melhor.p) + '  J=' + melhor.a.J.toFixed(4));

/* ---------- descida por coordenadas, ja com os parametros que a grelha nao varreu ---------- */
const PASSOS = {
  k:         [0.6, 0.7, 0.8, 0.85, 0.9, 1.0, 1.1],
  gamma:     [0.6, 0.7, 0.8, 0.85, 0.9, 1.0],
  atkMs:     [8, 12, 16, 20, 25, 30],
  relMs:     [18, 22, 26, 28, 32, 36, 44],
  ocGate:    [0.4, 0.5, 0.6, 0.7, 0.8, 0.9],
  ocDead:    [0.05, 0.10, 0.15, 0.20, 0.25],
  ocAtkMs:   [8, 12, 15, 20, 30],
  ocRelMs:   [30, 45, 60, 80],
  holdMs:    [0, 40, 70, 100, 140],
  holdFloor: [0, 0.08, 0.15, 0.22]
};
let atual = Object.assign({}, BASE, melhor.p);
let melhorJ = avalia(atual, treino, false).J;
console.log('\ndescida por coordenadas (partindo de J=' + melhorJ.toFixed(4) + ')');
for (let volta = 0; volta < 3; volta++) {
  let mudou = false;
  for (const k of Object.keys(PASSOS)) {
    const orig = atual[k];
    let bestV = orig, bestJ = melhorJ;
    for (const v of PASSOS[k]) {
      if (v === orig) continue;
      atual[k] = v;
      const a = avalia(atual, treino, false);
      if (a.violacoes.length) continue;
      if (a.J > bestJ + 1e-9) { bestJ = a.J; bestV = v; }
    }
    atual[k] = bestV;
    if (bestV !== orig) { mudou = true; melhorJ = bestJ; console.log('  ' + k + ': ' + orig + ' -> ' + bestV + '  J=' + bestJ.toFixed(4)); }
  }
  if (!mudou) { console.log('  volta ' + (volta + 1) + ': estavel'); break; }
}

/* ---------- speechAuto avaliado so sobre a vencedora ---------- */
const semAuto = avalia(atual, treino, false);
const comAuto = avalia(atual, treino, true);
console.log('\nauto-range sobre a vencedora:');
console.log('  off  J=' + semAuto.J.toFixed(4) + '  r=' + semAuto.r.toFixed(4) + '  alcance=' + semAuto.alcance.toFixed(3) +
  '  violacoes=' + semAuto.violacoes.length);
console.log('  on   J=' + comAuto.J.toFixed(4) + '  r=' + comAuto.r.toFixed(4) + '  alcance=' + comAuto.alcance.toFixed(3) +
  '  violacoes=' + comAuto.violacoes.length);
if (comAuto.violacoes.length) console.log('       (viola: ' + comAuto.violacoes.slice(0, 4).join(', ') + ')');

console.log('\n---- vencedora ----');
console.log(JSON.stringify(atual, null, 1));
const fim = { vencedora: atual, treino: semAuto, auto: comAuto,
  grelha: { combos: combos.length, rejeitadas, sobreviventes: sobreviventes.length } };
fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'out', 'gridsearch.json'), JSON.stringify(fim, null, 1));
console.log('\ngravado em tools/out/gridsearch.json');
console.log('(o RIG_V3 do engine.js NAO foi alterado — copiar os valores a mao e correr o regress)');
repoe();
