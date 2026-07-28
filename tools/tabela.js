#!/usr/bin/env node
/* Tabela de metricas por clip, para as cadeias pedidas. E o relatorio da bancada.

     node tools/tabela.js                 # v1 v2
     node tools/tabela.js v1 v2 v3        # com a v3
     node tools/tabela.js --hz 30 v1 v3   # cadencia do mobile
     node tools/tabela.js --out baseline  # grava tools/out/baseline.json

   A `v4` aceita-se como qualquer outra, mas nao entra na tabela por omissao de
   proposito: nestas metricas ela da o MESMO que a v3, bit a bit nos 16 clips (o unico
   canal que difere e a baseline do sorriso, e ela so chega a boca pelo slider `viseme
   E`, que esta a 0). Uma coluna repetida nao e informacao — quem quiser confirmar a
   igualdade tem-na como verificacao no `verify-bancada.js`. */
const fs = require('fs');
const path = require('path');
const { carrega, replay } = require('./replay');
const { metricas } = require('./metrics');
const { descreve, etiqueta } = require('./lib/clips');

const TRACES = path.join(__dirname, 'traces');
const args = process.argv.slice(2);
const val = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
const hz = +val('--hz', 60);
const saida = val('--out', null);
const modos = args.filter(a => /^v\d/.test(a));
const MODOS = modos.length ? modos : ['v1', 'v2'];

const clips = fs.readdirSync(TRACES).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort();
const linhas = [];
for (const c of clips) {
  const tr = carrega(c);
  const por = {};
  for (const m of MODOS) por[m] = metricas(replay(tr, { modo: m, hz }), tr);
  linhas.push({ clip: c, holdout: descreve(c).holdout, por });
}

function mostra(titulo, sel) {
  const ls = linhas.filter(l => sel(l));
  if (!ls.length) return;
  console.log('\n' + titulo + '  (' + ls.length + ' clips, ' + hz + ' Hz)');
  console.log('clip                     ' + MODOS.map(m =>
    (m + ': r     lag   p95   jit').padEnd(28)).join(''));
  for (const l of ls) {
    let s = etiqueta(l.clip).padEnd(25);
    for (const m of MODOS) {
      const x = l.por[m];
      s += (x.r.toFixed(3) + '  ' + x.lagMs.toFixed(0).padStart(3) + 'ms  ' +
        x.p95.toFixed(2) + '  ' + x.jitter.toFixed(4)).padEnd(28);
    }
    console.log(s);
  }
  const med = m => {
    const g = k => ls.reduce((s, l) => s + l.por[m][k], 0) / ls.length;
    const fs_ = ls.map(l => l.por[m].fecho).filter(v => v !== null);
    return { r: g('r'), lag: g('lagMs'), p95: g('p95'), p5: g('p5'), jitter: g('jitter'),
      alcance: g('alcance'), fecho: fs_.length ? fs_.reduce((a, b) => a + b, 0) / fs_.length : null };
  };
  let s = 'MEDIA'.padEnd(25);
  for (const m of MODOS) {
    const x = med(m);
    s += (x.r.toFixed(3) + '  ' + x.lag.toFixed(0).padStart(3) + 'ms  ' +
      x.p95.toFixed(2) + '  ' + x.jitter.toFixed(4)).padEnd(28);
  }
  console.log(s);
  let f = 'fecho/alcance'.padEnd(25);
  for (const m of MODOS) {
    const x = med(m);
    f += ((x.fecho === null ? '—' : x.fecho.toFixed(2)) + ' / ' + x.alcance.toFixed(3)).padEnd(28);
  }
  console.log(f);
  return MODOS.reduce((o, m) => (o[m] = med(m), o), {});
}

const resumo = {
  treino: mostra('TREINO', l => !l.holdout),
  holdout: mostra('HOLDOUT', l => l.holdout),
  todos: mostra('TODOS', () => true)
};

if (saida) {
  const f = path.join(__dirname, 'out', saida + '.json');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify({ hz, modos: MODOS, resumo, linhas }, null, 1));
  console.log('\ngravado em ' + f);
}
