#!/usr/bin/env node
/* Metricas objectivas de uma timeline de replay contra o audio do clip.

   O que cada numero quer dizer, e porque foi escolhido:

   · r      Pearson entre a abertura da boca e o envelope da voz, no clip todo. E a
            pergunta "a boca segue a voz?" reduzida a um numero. Alvo >0.70.
   · lag    desfasamento (ms) que maximiza essa correlacao. Positivo = a boca chega
            atrasada. Alvo |lag| <= 40 ms — acima disso ve-se. E a metrica que apanha
            o release lento da v1, que nenhuma media esconde.
   · p95/p5 alcance dentro da fala: quanto do curso da boca e mesmo usado. A v1
            subutiliza-o em fala baixa; e o modo de falha que o utilizador descreve
            como "boca presa".
   · jitter RMS da segunda diferenca dentro da fala. Sobe com tremor, nao com rampas
            limpas. So faz sentido em relativo — daqui sai o guarda de 1.5x a v1.
   · fecho  fraccao das oclusoes (detectadas no audio) em que a boca de facto fechou.
            Com o Rhubarb e ground truth fonetico; sem ele, minimos do envelope.

   A mascara de fala e o envelope normalizado acima de 0.25, dilatado 100 ms — sem ela
   o silencio entre frases dominava o alcance e o jitter. */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { pct, pearson, melhorLag, reamostra, rmsD2 } = require('./lib/stats');

const RHUBARB = path.join(__dirname, 'bin', 'rhubarb');
const CLIPS = path.join(__dirname, 'clips');

/* dB -> 0..1 pelo proprio clip: o p5 e o chao de silencio, o p95 a voz cheia */
function normaliza(envDb) {
  const lo = pct(envDb, 5), hi = pct(envDb, 95);
  const d = Math.max(1e-6, hi - lo);
  return envDb.map(v => Math.max(0, Math.min(1, (v - lo) / d)));
}

/* mascara de fala: acima de 0.25, dilatada 100 ms para os dois lados (as oclusoes no
   meio de uma palavra sao vales fundos que nao podem partir a mascara em dois) */
function mascaraFala(env01, hz) {
  const n = env01.length, m = new Array(n).fill(false);
  for (let i = 0; i < n; i++) if (env01[i] > 0.25) m[i] = true;
  const raio = Math.round(0.1 * hz);
  const d = m.slice();
  for (let i = 0; i < n; i++) {
    if (!m[i]) continue;
    for (let k = Math.max(0, i - raio); k <= Math.min(n - 1, i + raio); k++) d[k] = true;
  }
  return d;
}

/* oclusoes por Rhubarb (shape A = labios fechados) — ground truth fonetico.
   Nesta maquina (WSL aarch64) o Rhubarb nao corre: so ha binario x86-64 nos releases.
   O caminho fica para quem tenha, e o resultado e cacheado por clip — sem cache o
   grid-search chamaria o binario centenas de milhar de vezes. */
const CACHE_OCL = new Map();
function oclusoesRhubarb(clip) {
  if (CACHE_OCL.has(clip)) return CACHE_OCL.get(clip);
  const guarda = v => { CACHE_OCL.set(clip, v); return v; };
  if (!fs.existsSync(RHUBARB)) return guarda(null);
  let wav = null;
  try {
    const mp4 = ['ravdess', 'user'].map(s => path.join(CLIPS, s, clip + '.mp4')).find(fs.existsSync);
    if (!mp4) return null;
    wav = path.join(require('os').tmpdir(), 'rh-' + clip + '.wav');
    execFileSync('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', '-i', mp4,
      '-vn', '-ac', '1', '-ar', '16000', wav], { stdio: 'pipe' });
    const out = execFileSync(RHUBARB, ['-f', 'json', '-r', 'phonetic', wav],
      { stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 1 << 24 }).toString();
    const j = JSON.parse(out);
    const janelas = [];
    for (const c of j.mouthCues) if (c.value === 'A') janelas.push([c.start * 1000, c.end * 1000]);
    return guarda(janelas);
  } catch (e) {
    return guarda(null);
  } finally {
    if (wav && fs.existsSync(wav)) try { fs.unlinkSync(wav); } catch (e) {}
  }
}

/* proxy sem Rhubarb: minimos locais do envelope dentro da fala */
function oclusoesEnvelope(env01, hz, mask) {
  const n = env01.length, janelas = [];
  let i = 1;
  while (i < n - 1) {
    if (mask[i] && env01[i] < 0.35 && env01[i] <= env01[i - 1] && env01[i] <= env01[i + 1]) {
      let j = i;
      while (j < n - 1 && env01[j] < 0.35) j++;
      if ((j - i) * 1000 / hz >= 30) janelas.push([i * 1000 / hz, j * 1000 / hz]);
      i = j + 1;
    } else i++;
  }
  return janelas;
}

/* fraccao das oclusoes em que a boca chegou a fechar face ao seu pico local */
function recallFecho(tl, janelas) {
  if (!janelas || !janelas.length) return { recall: null, n: 0 };
  let acertos = 0, n = 0;
  for (const [a, b] of janelas) {
    let minDentro = Infinity, picoVolta = 0;
    for (let i = 0; i < tl.t.length; i++) {
      const t = tl.t[i];
      if (t >= a && t <= b) minDentro = Math.min(minDentro, tl.mouth[i]);
      if (t >= a - 200 && t <= b + 200) picoVolta = Math.max(picoVolta, tl.mouth[i]);
    }
    if (minDentro === Infinity || picoVolta < 0.08) continue;   /* oclusao fora de fala util */
    n++;
    if (minDentro < 0.35 * picoVolta) acertos++;
  }
  return { recall: n ? acertos / n : null, n };
}

/* O envelope, a mascara e as oclusoes dependem so do clip e da cadencia da timeline —
   nunca da cadeia em teste. Cacheados, porque o grid-search corre isto centenas de
   milhar de vezes e sem cache passava a vida a ordenar arrays para percentis. */
const CACHE_AUDIO = new Map();
function prepara(tl, trace) {
  const chave = trace.clip + '@' + tl.t.length + '@' + (tl.t[1] - tl.t[0]);
  if (CACHE_AUDIO.has(chave)) return CACHE_AUDIO.get(chave);
  const hz = trace.audio.hz;
  const env01 = normaliza(trace.audio.envDb);
  const mask = mascaraFala(env01, hz);
  const janRh = oclusoesRhubarb(trace.clip);
  const p = {
    hz, env01, mask,
    /* o envelope vive a 100 Hz e a timeline a 60 (ou 30) — encontram-se nos instantes dela */
    envT: reamostra(env01, hz, tl.t),
    maskT: tl.t.map(t => {
      const i = Math.round(t * hz / 1000);
      return mask[Math.max(0, Math.min(mask.length - 1, i))];
    }),
    janelas: janRh || oclusoesEnvelope(env01, hz, mask),
    fonteFecho: janRh ? 'rhubarb' : 'envelope'
  };
  CACHE_AUDIO.set(chave, p);
  return p;
}

function metricas(tl, trace) {
  const { envT, maskT, janelas, fonteFecho } = prepara(tl, trace);

  const r = pearson(tl.mouth, envT);

  /* lag: passo da timeline em ms, +-200 ms de procura.
     `lagMs` e contra a referencia crua (o atraso que a cadeia acrescenta — ver a nota
     em replay.js sobre porque nao e contra o audio); `lagAudio` fica so como registo. */
  const passo = tl.t.length > 1 ? tl.t[1] - tl.t[0] : 16.667;
  const maxK = Math.round(200 / passo);
  const ml = melhorLag(tl.mouth, tl.ref, maxK);
  const mlAudio = melhorLag(tl.mouth, envT, maxK);

  const dentro = [], d2 = [];
  for (let i = 0; i < tl.mouth.length; i++) if (maskT[i]) dentro.push(tl.mouth[i]);
  /* a segunda diferenca calcula-se em segmentos contiguos, senao os saltos entre
     trechos de fala contavam como tremor */
  let seg = [];
  for (let i = 0; i < tl.mouth.length; i++) {
    if (maskT[i]) seg.push(tl.mouth[i]);
    else { if (seg.length > 3) d2.push(rmsD2(seg)); seg = []; }
  }
  if (seg.length > 3) d2.push(rmsD2(seg));

  const fecho = recallFecho(tl, janelas);

  return {
    clip: trace.clip, modo: tl.modo, hz: tl.hz, fonteFecho,
    r,
    lagMs: ml.lag * passo,
    rRef: ml.r,
    lagAudioMs: mlAudio.lag * passo,
    p95: pct(dentro, 95), p5: pct(dentro, 5), mediana: pct(dentro, 50),
    alcance: pct(dentro, 95) - pct(dentro, 5),
    jitter: d2.length ? d2.reduce((a, b) => a + b, 0) / d2.length : 0,
    fecho: fecho.recall, nFechos: fecho.n,
    amostras: tl.mouth.length, fracFala: maskT.filter(Boolean).length / (maskT.length || 1)
  };
}

module.exports = { metricas, normaliza, mascaraFala, oclusoesRhubarb, oclusoesEnvelope };

/* ---------- CLI: metricas de um clip nas tres cadeias ---------- */
if (require.main === module) {
  const { carrega, replay } = require('./replay');
  const nome = process.argv[2];
  if (!nome) { console.error('uso: node tools/metrics.js <clip>'); process.exit(2); }
  const tr = carrega(nome);
  console.log('modo   r      lag     p95    p5     jitter   fecho');
  for (const modo of ['v1', 'v2', 'v3']) {
    const m = metricas(replay(tr, { modo }), tr);
    console.log('%s   %s  %s %s  %s  %s  %s', modo.padEnd(4),
      m.r.toFixed(3), (m.lagMs.toFixed(0) + 'ms').padStart(6), m.p95.toFixed(3),
      m.p5.toFixed(3), m.jitter.toFixed(5), m.fecho === null ? '  —' : m.fecho.toFixed(2));
  }
  console.log('(lag = atraso que a cadeia acrescenta ao tracker; fonte do fecho: ' +
    metricas(replay(tr, { modo: 'v1' }), tr).fonteFecho + ')');
}
