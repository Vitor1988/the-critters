#!/usr/bin/env node
/* Verificacao da propria bancada — antes de confiar num numero que ela produza.

   1. determinismo: duas corridas do mesmo replay tem de ser identicas bit a bit
   2. sanidade da metrica: com o envelope deslocado 2 s, o r tem de colapsar
   3. sensibilidade da calibracao: o ranking entre cadeias nao pode depender de se
      o repouso e o p5, o p10 ou o p15 do clip (a calibracao e injectada, e portanto
      uma escolha nossa — se o resultado mudar com ela, o resultado nao vale nada)
   4. cadencia: cada cadeia tem de ser consistente CONSIGO PROPRIA entre 60 e 30 Hz
      (ver a nota longa no proprio bloco — o criterio anterior era o ranking cruzado,
      e estava errado)
   5. a v4 e a v3 na boca: em video real, e nao so nas poses sinteticas
   6. o microfone simulado a 30 Hz: o caminho do audio tambem corre no mobile */
const fs = require('fs');
const path = require('path');
const { carrega, replay, eng } = require('./replay');
const { metricas } = require('./metrics');
const { pct } = require('./lib/stats');

const TRACES = path.join(__dirname, 'traces');
const clips = fs.readdirSync(TRACES).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5));
const MODOS = process.argv.includes('--com-v3') ? ['v1', 'v2', 'v3'] : ['v1', 'v2'];
/* filtros por frame contra filtros em milissegundos — e a divisao que o ponto 4 usa */
const PORFRAME = ['v1', 'v2'];
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
let ordemP10 = null;
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
  ordemP10 = ordens[10];
  const vals = Object.values(ordens);
  if (vals.every(v => v === vals[0])) ok('ranking estavel entre p5/p10/p15: ' + vals[0]);
  else falha('ranking MUDA com o percentil: ' + JSON.stringify(ordens));
}

/* ---- 4. cadencia: cada cadeia consigo propria ----

   O que aqui estava era o ranking CRUZADO entre cadeias a 60 e a 30 Hz, e era o
   criterio errado — reprovava a bancada por uma propriedade que ela devia estar a
   celebrar.

   Porque: a 30 Hz o replay chama a cadeia metade das vezes (`detTick % 2`, como o
   mobile). Os filtros da v1/v2 sao coeficientes POR FRAME, portanto a metade da
   cadencia ficam com o dobro do tempo de subida — suavizacao de borla, que ninguem
   pediu. E o `r` premeia suavizacao, porque correlaciona a boca com um envelope que e
   suave: a v1 sobe de 0.5748 para 0.6092 sem ninguem lhe ter tocado e passa a v3, que
   fica onde estava (0.5988 -> 0.5990) precisamente por filtrar em milissegundos. O
   ranking invertia, o gate ficava vermelho, e o que ele estava a castigar era a
   propriedade que a v3 veio trazer. Um criterio que premeia um artefacto nao e um
   criterio: e um erro com saida diferente de zero.

   O que a bancada pode mesmo exigir e que cada cadeia seja consistente CONSIGO PROPRIA
   entre cadencias. E a promessa explicita da v3 ("filtros em milissegundos, nao em
   frames") e o que se quer garantir que continua verdade quando alguem lhe mexer.

   A deriva das cadeias por frame mede-se e imprime-se, mas nao reprova — e o defeito
   conhecido delas, esta documentado no engine, e e a razao de ser da v3. Em troca
   exige-se o contrapeso: elas TEM de derivar mais do que a v3. Se nao derivassem, o
   modo 30 Hz do replay nao estaria a exercitar a cadencia nenhuma e a invariancia da
   v3 nao provava coisa nenhuma — passaria por um teste que nao testa. */
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
  const deriva = m => Math.abs(soma[60][m] - soma[30][m]) / clips.length;
  console.log('  60Hz ' + MODOS.map(m => m + '=' + (soma[60][m] / clips.length).toFixed(4)).join(' ') +
    '   30Hz ' + MODOS.map(m => m + '=' + (soma[30][m] / clips.length).toFixed(4)).join(' '));
  console.log('  deriva |r(60)-r(30)|: ' + MODOS.map(m => m + '=' + deriva(m).toFixed(4)).join(' '));

  const emMs = MODOS.filter(m => PORFRAME.indexOf(m) < 0);
  const porFrame = MODOS.filter(m => PORFRAME.indexOf(m) >= 0);
  if (emMs.length) {
    const pior = Math.max.apply(null, emMs.map(deriva));
    if (pior <= 0.01) ok('cadeias em ms invariantes a cadencia: ' + emMs.join('/') + ' derivam ' + pior.toFixed(4) + ' (<=0.01)');
    else falha('cadeia em ms deriva com a cadencia: ' + emMs.map(m => m + '=' + deriva(m).toFixed(4)).join(' '));

    /* o contrapeso: sem isto, "a v3 nao deriva" podia ser so o replay a nao mudar nada */
    const menorFrame = Math.min.apply(null, porFrame.map(deriva));
    if (menorFrame > 5 * Math.max(pior, 1e-6))
      ok('e o modo 30 Hz mexe mesmo na cadencia: as por frame derivam ' + menorFrame.toFixed(4) +
        ', ' + Math.round(menorFrame / Math.max(pior, 1e-9)) + 'x mais');
    else falha('as cadeias por frame nao derivam (' + menorFrame.toFixed(4) +
      ') — o modo 30 Hz nao esta a exercitar a cadencia, e a invariancia da v3 nao prova nada');
  }

  /* o ranking so se compara a 60 Hz, que e a cadencia a que o rAF corre e a que os
     numeros do README foram medidos — e tem de bater com o do ponto 3 */
  const o60 = MODOS.slice().sort((a, b) => soma[60][b] - soma[60][a]).join('>');
  if (o60 === ordemP10) ok('ranking a 60 Hz igual ao do ponto 3: ' + o60);
  else falha('ranking a 60 Hz (' + o60 + ') difere do do percentil p10 (' + ordemP10 + ')');
}

/* ---- 5. a v4 e a v3 na boca ----
   A v4 troca o EMA por um que honra os taus longos, e a unica coisa que isso muda e a
   baseline de 2 s do sorriso. As poses sinteticas ja o dizem (`assercoesV4` no
   regress); aqui prova-se em video real, que e onde uma diferenca que ninguem previu
   apareceria. Se um dia deixarem de ser iguais, a v4 passou a ser outra cadeia e tem
   de voltar ao A/B — nao e uma afinacao do filtro. */
if (eng.SENS_DEFAULTS.speechV4 !== undefined) {
  let difs = 0;
  for (const c of clips) {
    const tr = carrega(c);
    const a = replay(tr, { modo: 'v3' }), b = replay(tr, { modo: 'v4' });
    a.modo = b.modo = '';           /* o rotulo do modo e a unica diferenca legitima */
    if (JSON.stringify(a) !== JSON.stringify(b)) difs++;
  }
  if (!difs) ok('v4 identica a v3 nos ' + clips.length + ' clips, bit a bit (so o canal do sorriso difere, e nao chega a boca)');
  else falha('v4 difere da v3 em ' + difs + ' de ' + clips.length + ' clips — deixou de ser a mesma cadeia');
}

/* ---- 6. o microfone simulado a 30 Hz ----
   O ponto 4 corre a 30 Hz sem audio nenhum, e o caminho do microfone tem estado
   proprio que se dimensiona pelo `dt` (o anel do chao de ruido, a rampa `pronto`, os
   EMA da forma). Nada disso e exercitado a 30 Hz por mais nenhum teste.
   Isto e uma verificacao de SANIDADE e nao de qualidade: as duas doses ligadas, e o
   que se exige e que nada saia de [0,1], que nada seja NaN, que a boca continue a
   abrir e a voltar, e que os numeros nao mudem de ordem de grandeza com a cadencia.
   (Nao se exige forma nenhuma: num clip de 4 s a baseline do brilho nao assenta — ver
   o aviso no README.) */
{
  const CAD = [60, 30];
  for (const modo of ['v1', 'v3']) {
    const por = {};
    let sujo = null;
    for (const hz of CAD) {
      let pico = 0, vale = 0, niv = 0;
      for (const c of clips) {
        const tr = carrega(c);
        const tl = replay(tr, { modo, hz, audio: 0.7, visemes: 0.7, ruido: -55 });
        for (const k of ['mouth', 'press', 'au', 'round', 'spread']) {
          if (!tl[k].every(v => typeof v === 'number' && isFinite(v) && v >= -1e-9 && v <= 1 + 1e-9))
            sujo = sujo || (c + ' @' + hz + 'Hz: `' + k + '` com NaN ou fora de [0,1]');
        }
        const m = metricas(tl, tr);
        pico += m.p95; vale += m.p5; niv += pct(tl.au, 95);
      }
      const n = clips.length;
      por[hz] = { pico: pico / n, vale: vale / n, niv: niv / n };
      console.log('  audio+visemes ' + modo + ' @' + hz + 'Hz: pico ' + por[hz].pico.toFixed(3) +
        '  vale ' + por[hz].vale.toFixed(3) + '  nivel p95 ' + por[hz].niv.toFixed(3));
    }
    if (sujo) { falha('audio+visemes ' + modo + ' produz lixo — ' + sujo); continue; }
    const mau = CAD.filter(hz => !(por[hz].pico > 0.5 && por[hz].vale < 0.1 && por[hz].niv > 0.5));
    if (mau.length) { falha('audio ' + modo + ': pico/vale/nivel fora dos limites a ' + mau.join(' e ') + ' Hz'); continue; }
    const rp = por[30].pico / por[60].pico, rn = por[30].niv / por[60].niv;
    if (rp > 0.8 && rp < 1.25 && rn > 0.8 && rn < 1.25)
      ok('audio ' + modo + ' sao a 60 e a 30 Hz (racio 30/60: pico ' + rp.toFixed(3) + ', nivel ' + rn.toFixed(3) + ')');
    else falha('audio ' + modo + ' muda de ordem de grandeza a 30 Hz: pico x' + rp.toFixed(3) + ', nivel x' + rn.toFixed(3));
  }
}

console.log(falhas ? '\n' + falhas + ' verificacao(oes) falharam' : '\nbancada verificada');
process.exit(falhas ? 1 : 0);
