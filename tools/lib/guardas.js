/* Comportamentos que a cadeia da boca tem de ter, escritos como assercoes.

   Vivem aqui, e nao dentro do regress, porque o grid-search precisa exactamente
   das mesmas: sem elas o grid escolhe uma boca que correlaciona melhor com o
   envelope do audio e fecha pior entre silabas — mediu-se, e a primeira vencedora
   deixava o vale a 0.222 contra os 0.059 da v1, que e a definicao do "boca
   permanentemente entreaberta" que o comentario da v1 avisa. A metrica sozinha
   compra correlacao com lentidao. Estes numeros e que a impedem. */
const { mkLm, mkBs, fresh } = require('./fixtures');

/* cada pose e [gap entre os labios interiores, blendshapes] — o par que a cadeia consome */
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

function passo(eng, sig, cal, S, nome) {
  const [gap, bs] = POSE[nome];
  eng.processLandmarks(mkLm(gap), mkBs(bs), sig, cal, S);
}

/* corre uma sequencia [[pose, n], ...]; devolve o estado final e a serie do sig.mouth */
function corre(eng, S, seq) {
  const { sig, cal } = fresh(eng, S);
  const serie = [];
  for (const [nome, n] of seq) {
    for (let i = 0; i < n; i++) { passo(eng, sig, cal, S, nome); serie.push(sig.mouth); }
  }
  return { sig, cal, serie };
}

/* o vale entre silabas a 4 sil/s — o numero que separa uma boca que fala de uma
   boca entreaberta. E o guarda mais importante que aqui esta. */
function vale(eng, S) {
  const { sig, cal } = fresh(eng, S);
  let mn = 1;
  for (let c = 0; c < 40; c++) {
    for (let i = 0; i < 4; i++) passo(eng, sig, cal, S, 'vogal');
    for (let i = 0; i < 3; i++) { passo(eng, sig, cal, S, 'fecho'); if (c > 2) mn = Math.min(mn, sig.mouth); }
  }
  return mn;
}

/* devolve {saltado, linhas:[{nome, ok, detalhe}]} */
function assercoesV3(eng) {
  if (!('speechV3' in eng.SENS_DEFAULTS)) return { saltado: true, linhas: [] };
  const S = o => Object.assign({}, eng.SENS_DEFAULTS, o);
  const V1 = S({}), V3 = S({ speechV3: 1 });
  const m = (SS, pose) => corre(eng, SS, [[pose, 40]]).sig;
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

  const sil = corre(eng, V3, [['repouso', 60]]).serie.slice(-30);
  const amp = Math.max.apply(null, sil) - Math.min.apply(null, sil);
  teste('silencio sem flicker', amp < 0.01, 'amplitude=' + amp.toFixed(4) + ' (<0.01)');

  const va1 = vale(eng, V1), va3 = vale(eng, V3);
  teste('vale entre silabas nao sobe', va3 <= va1 + 0.05,
    'v3=' + va3.toFixed(3) + ' vs v1=' + va1.toFixed(3) + ' (+0.05 no maximo)');

  return { saltado: false, linhas };
}

/* ---------------------------------------------------------------------------
   Assercoes da mistura com o microfone.

   O que aqui NAO esta, de proposito: nada que compare a boca com o envelope que a
   alimenta. Um hibrido alimentado pelo envelope correlaciona-se com ele por
   construcao — mediria a propria definicao, nao a qualidade. O que se testa sao as
   propriedades que podem partir: a neutralidade com o slider a 0, o gate contra o
   ruido, o fecho em silencio, e a regra que sustenta o desenho todo — a oclusao do
   VIDEO tem de ganhar a abertura que o AUDIO pede, senao um "pa-pe-po" gritado
   deixava a boca aberta.
   --------------------------------------------------------------------------- */
/* corre uma sequencia com o microfone ligado; `dbDe(i)` da o dB de cada frame.
   O `dt` fica por passar, tal como no `corre` sem microfone — assim a comparacao de
   neutralidade isola mesmo o audio (a v3 filtra em ms, e 16.666 vs o 16.7 por omissao
   ja chegava para as duas series divergirem por razoes que nada tem a ver com isto). */
function correAu(eng, S, seq, dbDe) {
  const { sig, cal } = fresh(eng, S);
  const au = { db: dbDe(0), conf: 1 };
  const serie = [], nivel = [];
  let i = 0;
  for (const [nome, n] of seq) {
    const [gap, bs] = POSE[nome];
    for (let k = 0; k < n; k++, i++) {
      au.db = dbDe(i);
      eng.processLandmarks(mkLm(gap), mkBs(bs), sig, cal, S, undefined, au);
      serie.push(sig.mouth);
      nivel.push(sig.au ? sig.au.lvl : 0);
    }
  }
  return { sig, serie, nivel };
}

/* ruido estacionario com o tremor de uma sala; semente fixa = replay determinstico */
function fazRuido(db) {
  let s = 7;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return db + (s / 0x7fffffff - 0.5) * 3; };
}
/* Silabas de 200 ms (150 de voz, 50 de vale) sobre um chao de sala de -60 dB, com
   `nPre` frames so de chao antes — o tempo que o chao automatico leva a assentar.
   TEM de ser modulado: um tom constante, por muito alto que seja, e ruido para o
   gate e nao abre a boca nenhuma (verificado, e e essa a intencao do desenho). */
function fazFala(vozDb, valeDb, nPre) {
  const r = fazRuido(-60);
  const pre = nPre === undefined ? 0 : nPre;
  return i => {
    const s = i < pre ? -200 : ((i - pre) % 12) / 12 < 0.75 ? vozDb : valeDb;
    return 10 * Math.log10(Math.pow(10, s / 10) + Math.pow(10, r() / 10));
  };
}

function assercoesAudio(eng) {
  if (!('audioMix' in eng.SENS_DEFAULTS)) return { saltado: true, linhas: [] };
  const S = o => Object.assign({}, eng.SENS_DEFAULTS, o);
  const linhas = [];
  const teste = (nome, ok, detalhe) => linhas.push({ nome, ok, detalhe });
  const num = o => { const r = {}; for (const k of Object.keys(o).sort()) if (typeof o[k] === 'number') r[k] = o[k]; return r; };

  /* 1. NEUTRALIDADE: com audioMix 0, passar microfone tem de dar o mesmo bit a bit,
        nas tres cadeias — e a regra dura numero 1 aplicada ao caminho novo */
  const SEQ = [['repouso', 10], ['vogal', 12], ['fecho', 8], ['vogal', 12], ['bilabial', 8], ['repouso', 10]];
  const berra = fazFala(-25, -45);
  for (const [tag, o] of [['v1', {}], ['v2', { speechV2: 1 }], ['v3', { speechV3: 1 }]]) {
    const semMic = corre(eng, S(o), SEQ).sig;
    const comMic = correAu(eng, S(o), SEQ, berra).sig;
    const a = JSON.stringify(num(semMic)), b = JSON.stringify(num(comMic));
    teste('audioMix 0 ignora o microfone (' + tag + ')', a === b,
      a === b ? 'identico bit a bit' : 'DIFERE: ' + a.slice(0, 90) + ' vs ' + b.slice(0, 90));
  }

  /* 2. RUIDO: ruido estacionario a qualquer nivel nao pode abrir a boca. E o teste do
        gate automatico — sem ele o hibrido punha a boca a mastigar a ventoinha. */
  for (const db of [-60, -45, -30]) {
    const r = correAu(eng, S({ audioMix: 1 }), [['repouso', 900]], fazRuido(db));
    const est = r.serie.slice(300);
    const mx = Math.max.apply(null, est);
    teste('ruido a ' + db + ' dB nao abre a boca', mx < 0.02, 'boca max ' + mx.toFixed(4) + ' (<0.02)');
  }

  /* 3. SILENCIO: microfone mudo, cara em repouso — fecha e fica quieta */
  {
    const r = correAu(eng, S({ audioMix: 1 }), [['repouso', 600]], () => -100);
    const s = r.serie.slice(200);
    const amp = Math.max.apply(null, s) - Math.min.apply(null, s);
    teste('silencio fecha e nao tremelica', Math.max.apply(null, s) < 0.01 && amp < 0.01,
      'boca max ' + Math.max.apply(null, s).toFixed(4) + ' amplitude ' + amp.toFixed(4));
  }

  /* 4. TOM CONSTANTE: por muito alto que seja, um som estacionario e ruido para o
        gate. E o mesmo teste do ponto 2 no extremo — e a razao por que um assobio
        continuo nao mexe a boca, ao contrario de uma vogal. */
  {
    const r = correAu(eng, S({ audioMix: 1 }), [['repouso', 600]], () => -15);
    const mx = Math.max.apply(null, r.serie.slice(200));
    teste('tom constante alto continua a ser ruido', mx < 0.02, 'boca max ' + mx.toFixed(4) + ' (<0.02)');
  }

  /* 5. PICO E VALE: com envelope silabico, a boca sobe no pico e volta a descer.
        Nao e uma medida de qualidade (seria circular) — e a prova de que o sinal
        chega mesmo ao alvo e de que o vale nao fica preso em cima. */
  for (const [tag, o] of [['v1', {}], ['v3', { speechV3: 1 }]]) {
    const r = correAu(eng, S(Object.assign({ audioMix: 1 }, o)), [['repouso', 600]], fazFala(-30, -50, 120));
    const s = r.serie.slice(300);
    const mx = Math.max.apply(null, s), mn = Math.min.apply(null, s);
    teste('envelope silabico abre e volta (' + tag + ')', mx > 0.6 && mn < 0.85 * mx,
      'pico ' + mx.toFixed(3) + ' vale ' + mn.toFixed(3));
  }

  /* 6. A OCLUSAO DO VIDEO GANHA. A cara faz uma bilabial enquanto o microfone leva
        uma voz alta e modulada: a boca tem de continuar fechada. E a regra que separa
        este desenho de um lipsync so de audio, e a que o "pa-pe-po" verifica ao vivo.

        O padrao e RELATIVO ao video, nao absoluto, e a diferenca importa: a v1 sozinha
        ja deixa a `selada` em 0.46 (queixo a 0.55 satura a abertura e so lhe resta a
        trava do press — e um defeito conhecido dela, e o que a v2 corrige). Exigir um
        numero absoluto aqui reprovava a cadeia pelo que ela ja fazia sem microfone. O
        que se mede e o que o audio ACRESCENTA. */
  const alto = fazFala(-20, -45, 240);   /* 4 s de sala, depois voz alta */
  for (const pose of ['bilabial', 'selada']) {
    for (const [tag, o] of [['v1', {}], ['v3', { speechV3: 1 }]]) {
      const seq = [['repouso', 240], ['vogal', 60], [pose, 40]];
      const SS = S(Object.assign({ audioMix: 1 }, o));
      const semMic = corre(eng, SS, seq).sig.mouth;
      const r = correAu(eng, SS, seq, alto);
      const mx = Math.max.apply(null, r.serie.slice(-10));
      const nivel = Math.max.apply(null, r.nivel.slice(-40));
      teste(pose + ' fecha contra o microfone (' + tag + ')', mx <= semMic + 0.06 && nivel > 0.5,
        'boca ' + mx.toFixed(3) + ' vs ' + semMic.toFixed(3) + ' sem mic (+0.06 no maximo)' +
        ', com o audio a pedir ' + nivel.toFixed(2));
    }
  }

  return { saltado: false, linhas };
}

const passaTudo = eng => {
  const a = assercoesV3(eng);
  return a.saltado ? true : a.linhas.every(l => l.ok);
};

module.exports = { POSE, passo, corre, vale, assercoesV3, assercoesAudio, passaTudo };
