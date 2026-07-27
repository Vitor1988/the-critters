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
function correAu(eng, S, seq, dbDe, bandasDe) {
  const { sig, cal } = fresh(eng, S);
  const au = { db: dbDe(0), conf: 1 };
  if (bandasDe) au.bandas = bandasDe(0);
  const serie = [], nivel = [], round = [], spread = [], pesoO = [], pesoE = [];
  let i = 0;
  for (const [nome, n] of seq) {
    const [gap, bs] = POSE[nome];
    for (let k = 0; k < n; k++, i++) {
      au.db = dbDe(i);
      if (bandasDe) au.bandas = bandasDe(i);
      eng.processLandmarks(mkLm(gap), mkBs(bs), sig, cal, S, undefined, au);
      serie.push(sig.mouth);
      nivel.push(sig.au ? sig.au.lvl : 0);
      round.push(sig.au ? sig.au.round : 0);
      spread.push(sig.au ? sig.au.spread : 0);
      const w = eng.rigVisemeWeights(sig, S);
      pesoO.push(w.O); pesoE.push(w.E);
    }
  }
  return { sig, serie, nivel, round, spread, pesoO, pesoE };
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

/* ---------------------------------------------------------------------------
   Assercoes dos visemes por audio (`audioVisemes`).

   Espectros sinteticos, e nao clips: o que se testa aqui e a DIRECCAO da derivacao
   (energia em baixo -> O/U, energia em cima -> E/I) e as propriedades que podem
   partir. A qualidade fonetica nao se testa aqui nem em lado nenhum desta bancada —
   os clips do RAVDESS nao tem alinhamento e a prova e o A/B ao vivo.

   Os envelopes TEM de ser silabicos: um som constante, por muito alto que seja, e
   ruido para o gate (ver `assercoesAudio`), portanto uma "vogal sustentada" a nivel
   fixo nao chegaria sequer a passar o gate.
   --------------------------------------------------------------------------- */
/* perfis em dB por banda [50-200, 200-400, 400-800, 800-1500, 1500-2500, 2500-4000, 4000-8000] */
const ESPECTRO = {
  /* fala "media", a queda de ~6 dB/oitava que a voz tem */
  neutro: [-30, -32, -36, -42, -48, -54, -60],
  /* "ooo"/"uuu": tudo em baixo, os agudos desabam */
  escuro: [-28, -30, -34, -50, -66, -72, -78],
  /* "eee"/"iii": F2 la em cima, e o pico ja nao esta nas graves */
  claro: [-34, -38, -44, -44, -38, -40, -50]
};

function assercoesVisemes(eng) {
  if (!('audioVisemes' in eng.SENS_DEFAULTS)) return { saltado: true, linhas: [] };
  const S = o => Object.assign({}, eng.SENS_DEFAULTS, o);
  const linhas = [];
  const teste = (nome, ok, detalhe) => linhas.push({ nome, ok, detalhe });
  const num = o => { const r = {}; for (const k of Object.keys(o).sort()) if (typeof o[k] === 'number') r[k] = o[k]; return r; };
  const mx = a => Math.max.apply(null, a);

  /* 1. NEUTRALIDADE: com a dose a 0, passar o espectro tem de dar o mesmo bit a bit */
  const SEQ = [['repouso', 10], ['vogal', 12], ['fecho', 8], ['vogal', 12], ['bilabial', 8], ['repouso', 10]];
  const fala = fazFala(-25, -45);
  const bandasFixas = () => ESPECTRO.claro;
  for (const [tag, o] of [['v1', {}], ['v3', { speechV3: 1 }]]) {
    const sem = corre(eng, S(o), SEQ).sig;
    const com = correAu(eng, S(o), SEQ, fala, bandasFixas).sig;
    const a = JSON.stringify(num(sem)), b = JSON.stringify(num(com));
    teste('audioVisemes 0 ignora o espectro (' + tag + ')', a === b,
      a === b ? 'identico bit a bit' : 'DIFERE: ' + a.slice(0, 80) + ' vs ' + b.slice(0, 80));
  }

  /* 2. O AUDIO NAO ESCREVE ABERTURA. E a fronteira que separa esta feature do
        `audioMix`: com a dose no maximo, o `sig.mouth` tem de ficar EXACTAMENTE
        onde estava — o espectro so mexe na forma. */
  for (const [tag, o] of [['v1', {}], ['v3', { speechV3: 1 }]]) {
    const sem = correAu(eng, S(o), SEQ, fala).serie;
    const com = correAu(eng, S(Object.assign({ audioVisemes: 1 }, o)), SEQ, fala, bandasFixas).serie;
    let d = 0;
    for (let i = 0; i < sem.length; i++) d = Math.max(d, Math.abs(sem[i] - com[i]));
    teste('a forma nao toca na abertura (' + tag + ')', d === 0, 'max |dmouth| = ' + d);
  }

  /* aquecimento + segmento de teste, com o espectro a mudar a meio */
  const AQ = 200;                       /* ~3.3 s: o gate assenta e a baseline aquece */
  const correForma = perfil => {
    const seq = [['repouso', 120], ['vogal', AQ], ['vogal', 120]];
    const bandas = i => (i < 120 + AQ ? ESPECTRO.neutro : ESPECTRO[perfil]);
    return correAu(eng, S({ audioVisemes: 1 }), seq, fazFala(-25, -45, 120), bandas);
  };
  const fim = o => ({ r: mx(o.round.slice(-100)), s: mx(o.spread.slice(-100)),
    wO: mx(o.pesoO.slice(-100)), wE: mx(o.pesoE.slice(-100)) });

  /* 3. DIRECCAO: graves -> O/U e nao E; agudos -> o inverso */
  const esc = fim(correForma('escuro'));
  teste('espectro grave sobe o O/U e nao o E', esc.r > 0.5 && esc.s < 0.05,
    'round ' + esc.r.toFixed(2) + ' (>0.5) spread ' + esc.s.toFixed(2) + ' (<0.05), peso O ' + esc.wO.toFixed(2));
  const cla = fim(correForma('claro'));
  teste('espectro agudo sobe o E/I e nao o O', cla.s > 0.5 && cla.r < 0.05,
    'spread ' + cla.s.toFixed(2) + ' (>0.5) round ' + cla.r.toFixed(2) + ' (<0.05), peso E ' + cla.wE.toFixed(2));

  /* 4. NEUTRO NAO PEDE FORMA NENHUMA: a fala media e a baseline, e a baseline nao e
        uma careta — e o que impede a boca de andar sempre a fazer bicos */
  const neu = fim(correForma('neutro'));
  teste('espectro medio nao inventa forma', neu.r < 0.15 && neu.s < 0.15,
    'round ' + neu.r.toFixed(2) + ' spread ' + neu.s.toFixed(2) + ' (<0.15)');

  /* 5. SILENCIO: microfone mudo, seja qual for o espectro que venha atras */
  {
    const o = correAu(eng, S({ audioVisemes: 1 }), [['repouso', 400]], () => -100, () => ESPECTRO.claro);
    const s = o.spread.slice(100), r = o.round.slice(100);
    teste('silencio nao da forma nenhuma', mx(s) < 0.01 && mx(r) < 0.01,
      'round max ' + mx(r).toFixed(4) + ' spread max ' + mx(s).toFixed(4));
  }

  /* 6. ARRANQUE: nos primeiros ~1.2 s de voz a baseline ainda nao sabe o que e esta
        voz, e por isso nao se afirma forma nenhuma. Sem esta guarda o primeiro som
        depois de ligar o microfone definia a baseline e prendia a boca numa pose. */
  {
    const o = correAu(eng, S({ audioVisemes: 1 }), [['repouso', 120], ['vogal', 60]],
      fazFala(-25, -45, 120), () => ESPECTRO.escuro);
    const cedo = Math.max(mx(o.round.slice(120, 160)), mx(o.spread.slice(120, 160)));
    teste('nao afirma forma antes de aquecer', cedo < 0.15,
      'maior canal nos primeiros ~0.7 s de voz: ' + cedo.toFixed(3) + ' (<0.15)');
  }

  /* 7. VOGAL LONGA NAO SE APAGA: a baseline anda devagar de proposito, senao um
        "ooooo" de 2 s desaparecia a meio (e e um dos exercicios do A/B) */
  {
    const seq = [['repouso', 120], ['vogal', AQ], ['vogal', 120]];
    const bandas = i => (i < 120 + AQ ? ESPECTRO.neutro : ESPECTRO.escuro);
    const o = correAu(eng, S({ audioVisemes: 1 }), seq, fazFala(-25, -45, 120), bandas);
    const cedo = mx(o.round.slice(120 + AQ, 120 + AQ + 30));      /* primeiro 0.5 s */
    const tarde = mx(o.round.slice(-30));                          /* 2 s depois */
    teste('vogal longa nao se apaga', tarde > 0.6 * cedo,
      'round ' + cedo.toFixed(2) + ' -> ' + tarde.toFixed(2) + ' ao fim de 2 s (>60%)');
  }

  return { saltado: false, linhas };
}

/* ---------------------------------------------------------------------------
   Assercoes da calibracao de maximo (`maxJaw`/`maxLip`).

   O que se prova aqui e o contrato, nao a qualidade: sem calibracao nada muda; com
   ela o span move-se no sentido certo; e as guardas (media geometrica, chao e tecto)
   limitam o estrago de uma medicao ma. A qualidade mediu-se nos 16 clips, esta no
   README, e a decisao e do A/B.
   --------------------------------------------------------------------------- */
function assercoesMaximo(eng) {
  if (!('maxJaw' in eng.SENS_DEFAULTS)) return { saltado: true, linhas: [] };
  const S = o => Object.assign({}, eng.SENS_DEFAULTS, o);
  const linhas = [];
  const teste = (nome, ok, detalhe) => linhas.push({ nome, ok, detalhe });
  const num = o => { const r = {}; for (const k of Object.keys(o).sort()) if (typeof o[k] === 'number') r[k] = o[k]; return r; };
  /* o neutro das poses sinteticas: `repouso` tem jawOpen 0.05 e gap 0.002 */
  const boca = (o, pose) => corre(eng, S(o), [[pose || 'vogal', 40]]).sig.mouth;

  for (const [tag, o] of [['v1', {}], ['v3', { speechV3: 1 }]]) {
    /* 1. NEUTRALIDADE: sem maximo, o span e o fixo e o sig e o mesmo bit a bit */
    const a = JSON.stringify(num(corre(eng, S(o), [['vogal', 40]]).sig));
    const b = JSON.stringify(num(corre(eng, S(Object.assign({ maxJaw: 0, maxLip: 0 }, o)), [['vogal', 40]]).sig));
    teste('sem maximo o span e o fixo (' + tag + ')', a === b, a === b ? 'identico bit a bit' : 'DIFERE');

    /* 2. SENTIDO: um curso pessoal LARGO contem a boca, um curto solta-a. E o que o
          botao faz, e a direccao depende da pessoa — nao ha aqui um "melhor". */
    const base = boca(o);
    const largo = boca(Object.assign({ maxJaw: 0.9, maxLip: 0.2 }, o));
    const curto = boca(Object.assign({ maxJaw: 0.2, maxLip: 0.04 }, o));
    teste('curso largo contem a boca (' + tag + ')', largo < base,
      'vogal ' + base.toFixed(3) + ' -> ' + largo.toFixed(3));
    teste('curso curto solta a boca (' + tag + ')', curto > base,
      'vogal ' + base.toFixed(3) + ' -> ' + curto.toFixed(3));

    /* 3. GUARDAS: uma medicao absurda (a pessoa nao abriu a boca, ou o tracker
          disparou) nao pode multiplicar a boca. O chao de 0.55x do span limita o
          ganho a 1/0.55 = 1.8x no pior caso, e a media geometrica ja tinha comido
          metade da distancia antes disso. */
    const absurdo = boca(Object.assign({ maxJaw: 0.055, maxLip: 0.011 }, o));
    teste('medicao absurda fica presa pelas guardas (' + tag + ')', absurdo <= Math.min(1, base * 1.85),
      'vogal ' + base.toFixed(3) + ' -> ' + absurdo.toFixed(3) + ' (<= ' + Math.min(1, base * 1.85).toFixed(3) + ')');

    /* 4. A SELADA CONTINUA SELADA: o span mexe na escala, nao na oclusao */
    const sel = corre(eng, S(Object.assign({ maxJaw: 0.2, maxLip: 0.04 }, o)), [['bilabial', 40]]).sig.mouth;
    teste('bilabial fecha com span pessoal (' + tag + ')', sel < 0.12,
      'mouth ' + sel.toFixed(3) + ' (<0.12)');
  }
  return { saltado: false, linhas };
}

const passaTudo = eng => {
  const a = assercoesV3(eng);
  return a.saltado ? true : a.linhas.every(l => l.ok);
};

module.exports = { POSE, ESPECTRO, passo, corre, vale, assercoesV3, assercoesAudio,
  assercoesVisemes, assercoesMaximo, passaTudo };
