/* Estatistica da bancada. Tudo em JS puro para nao trazer dependencias a um projecto
   que nao tem nenhuma. */

const media = a => a.reduce((s, v) => s + v, 0) / (a.length || 1);

/* percentil por interpolacao linear (o mesmo criterio do numpy, para os numeros da
   captura em python e do replay em node serem comparaveis) */
function pct(a, p) {
  if (!a.length) return 0;
  const s = a.slice().sort((x, y) => x - y);
  const i = (s.length - 1) * p / 100;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo);
}

const mediana = a => pct(a, 50);

function pearson(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 3) return 0;
  const ma = media(a.slice(0, n)), mb = media(b.slice(0, n));
  let sa = 0, sb = 0, sab = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - ma, db = b[i] - mb;
    sa += da * da; sb += db * db; sab += da * db;
  }
  const d = Math.sqrt(sa * sb);
  return d < 1e-12 ? 0 : sab / d;
}

/* correlacao cruzada: devolve o desfasamento (em amostras) que maximiza a correlacao.
   positivo = `a` esta atrasado face a `b`.

   O maximo e refinado por parabola sobre os tres pontos a volta do pico: a 60 Hz uma
   amostra sao 16.7 ms, e sem sub-amostra duas cadeias com 10 ms de diferenca davam
   exactamente o mesmo numero. */
function melhorLag(a, b, maxLag) {
  const rs = new Map();
  const corr = k => {
    if (rs.has(k)) return rs.get(k);
    const x = [], y = [];
    for (let i = 0; i < a.length; i++) {
      const j = i - k;
      if (j >= 0 && j < b.length) { x.push(a[i]); y.push(b[j]); }
    }
    const r = x.length < 10 ? -2 : pearson(x, y);
    rs.set(k, r);
    return r;
  };
  let melhor = 0, rMax = -2;
  for (let k = -maxLag; k <= maxLag; k++) {
    const r = corr(k);
    if (r > rMax) { rMax = r; melhor = k; }
  }
  const r0 = corr(melhor - 1), r2 = corr(melhor + 1);
  let ajuste = 0;
  if (r0 > -2 && r2 > -2) {
    const den = r0 - 2 * rMax + r2;
    if (Math.abs(den) > 1e-12) ajuste = Math.max(-0.5, Math.min(0.5, 0.5 * (r0 - r2) / den));
  }
  return { lag: melhor + ajuste, r: rMax };
}

/* reamostra uma serie de passo constante (hz) para instantes arbitrarios, por
   interpolacao linear — e assim que o envelope de audio (100 Hz) encontra a
   timeline do replay (60 Hz) */
function reamostra(serie, hz, instantesMs) {
  const passo = 1000 / hz;
  return instantesMs.map(t => {
    const i = t / passo;
    if (i <= 0) return serie[0] !== undefined ? serie[0] : 0;
    if (i >= serie.length - 1) return serie[serie.length - 1] !== undefined ? serie[serie.length - 1] : 0;
    const a = Math.floor(i), f = i - a;
    return serie[a] + (serie[a + 1] - serie[a]) * f;
  });
}

/* RMS da segunda diferenca: mede tremor (oscilacao frame a frame) sem penalizar
   rampas — uma subida limpa tem segunda diferenca ~0 */
function rmsD2(a) {
  if (a.length < 3) return 0;
  let s = 0, n = 0;
  for (let i = 2; i < a.length; i++) { const d = a[i] - 2 * a[i - 1] + a[i - 2]; s += d * d; n++; }
  return Math.sqrt(s / (n || 1));
}

module.exports = { media, pct, mediana, pearson, melhorLag, reamostra, rmsD2 };
