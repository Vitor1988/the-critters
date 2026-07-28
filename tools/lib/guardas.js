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

/* Poses que ficam FORA do `POSE`, e portanto fora do sweep dos goldens: o `regress.js`
   varre `Object.keys(POSE)` e uma chave nova ali era uma diferenca face ao
   `goldens.json`, que e intocavel. Resolvem-se pelo mesmo `passo`. */
const POSE_X = {
  /* O canal do QUEIXO a mandar — e nao ha nenhuma pose no `POSE` em que isso aconteca.
     Na `vogal`, que e a que a bancada usa para a calibracao de maximo, o canal dos
     landmarks ganha (apLM 0.306 contra apBS 0.262) e o `rigSpan` do queixo e inerte:
     apagar essa chamada do `engine.js` nao mudava um unico numero, coisa que uma
     auditoria por mutacao provou.
     O que isto e: o tracker a dar queixo caido com os labios interiores sem separacao
     medivel — barba, resolucao, luz de cima. E exactamente o caso para que a fusao
     "fica o maior" existe. O `mouthClose` fica a zero de proposito: com ele a oclusao
     fechava a boca e nao sobrava saida onde medir o span. */
  queixoSo: [0.004, { jawOpen: 0.30 }]
};

/* `nome` e uma chave do `POSE`/`POSE_X` ou o proprio par [gap, blendshapes] */
const poseDe = p => (Array.isArray(p) ? p : POSE[p] || POSE_X[p]);

function passo(eng, sig, cal, S, nome, dt) {
  const [gap, bs] = poseDe(nome);
  eng.processLandmarks(mkLm(gap), mkBs(bs), sig, cal, S, dt);
}

/* corre uma sequencia [[pose, n], ...]; devolve o estado final e a serie do sig.mouth.
   `dt` fica por passar por omissao — a cadeia assume 16.7 ms, como sempre assumiu. */
function corre(eng, S, seq, dt) {
  const { sig, cal } = fresh(eng, S);
  const serie = [];
  for (const [nome, n] of seq) {
    for (let i = 0; i < n; i++) { passo(eng, sig, cal, S, nome, dt); serie.push(sig.mouth); }
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

  /* UM BLENDSHAPE EM FALTA NAO PODE ENVENENAR A CADEIA. O `rigClamp` deixa passar o
     NaN e o One Euro nao tem por onde o largar (o `st.x === null` so apanha o primeiro
     frame): sem os `|| 0` um unico frame sem `jawOpen` prendia a boca em NaN para o
     resto da sessao — verificado, e o frame mau nem precisa de vir do tracker, basta
     um blendshape que a versao do modelo deixou de dar.
     Mede-se na `queixoSo` porque e a unica pose onde o canal do queixo manda: em
     qualquer pose do `POSE` o `apLM` tapava o buraco e o teste passava por acaso. */
  {
    const { sig, cal } = fresh(eng, V3);
    let finito = true;
    for (let i = 0; i < 60; i++) {
      const [gap, bs] = POSE_X.queixoSo;
      const b = mkBs(bs);
      if (i === 20) delete b.jawOpen;
      eng.processLandmarks(mkLm(gap), b, sig, cal, V3);
      if (!isFinite(sig.mouth) || !isFinite(sig.press)) finito = false;
    }
    const sa = corre(eng, V3, [['queixoSo', 60]]).sig.mouth;
    teste('blendshape em falta nao prende a boca em NaN',
      finito && Math.abs(sig.mouth - sa) < 0.01,
      'boca ' + sig.mouth.toFixed(4) + ' um segundo depois do frame mau (sa: ' + sa.toFixed(4) + ')');
  }

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
/* `opts` (tudo opcional, e tudo neutro por omissao):
     dt       passa o passo de tempo a cadeia, para os testes de cadencia
     confDe   confianca do microfone frame a frame; `null` tira o `au` de todo (o
              microfone que desaparece), `0` e o microfone que ficou sem confianca
     bandasDe pode devolver `null` num frame: o espectro deixa de vir mas o `au` fica */
function correAu(eng, S, seq, dbDe, bandasDe, opts) {
  const o = opts || {};
  const { sig, cal } = fresh(eng, S);
  const au = { db: dbDe(0), conf: 1 };
  if (bandasDe) au.bandas = bandasDe(0);
  const serie = [], nivel = [], round = [], spread = [], pesoO = [], pesoE = [],
    amount = [], press = [];
  let i = 0;
  for (const [nome, n] of seq) {
    const [gap, bs] = poseDe(nome);
    for (let k = 0; k < n; k++, i++) {
      const conf = o.confDe ? o.confDe(i) : 1;
      let a = null;
      if (conf !== null) {
        au.db = dbDe(i);
        au.conf = conf;
        if (bandasDe) { const b = bandasDe(i); if (b) au.bandas = b; else delete au.bandas; }
        a = au;
      }
      eng.processLandmarks(mkLm(gap), mkBs(bs), sig, cal, S, o.dt, a);
      serie.push(sig.mouth);
      press.push(sig.press);
      nivel.push(sig.au ? sig.au.lvl : 0);
      round.push(sig.au ? sig.au.round : 0);
      spread.push(sig.au ? sig.au.spread : 0);
      const w = eng.rigVisemeWeights(sig, S);
      pesoO.push(w.O); pesoE.push(w.E);
      /* o `amount` do drive e o que a boca do avatar de facto consome — e onde a forma
         por audio se podia disfarcar de abertura sem passar pelo `sig.mouth` */
      amount.push(eng.rigVisemeDrive(sig, S).amount);
    }
  }
  return { sig, serie, nivel, round, spread, pesoO, pesoE, amount, press };
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

  /* 7. SILENCIO DIGITAL NAO E UMA MEDICAO DE SILENCIO — e ausencia de medicao, e nao
        pode entrar no anel do chao de ruido. Zeros exactos chegam a toda a hora (o
        AnalyserNode antes de o stream debitar, o micro em mute, o AudioContext
        suspenso) e um so frame deles punha o chao em -100 dB e o gate em -92: a partir
        dai o ruido de sala a -55 dB lia-se como voz cheia. Medido no engine anterior
        neste mesmo cenario: nivel 1.000 e a boca escancarada a 1.000, com ninguem a
        falar. E o modo de falha mais caro que este canal tem, porque nao precisa de
        ninguem para acontecer — basta ligar a pagina. */
  {
    const sala = fazRuido(-55);
    const r = correAu(eng, S({ audioMix: 1 }), [['repouso', 660]], i => (i < 60 ? -120 : sala()));
    const mxN = Math.max.apply(null, r.nivel), mxB = Math.max.apply(null, r.serie);
    teste('silencio digital seguido de sala nao abre a boca', mxN < 0.1 && mxB < 0.02,
      'nivel max ' + mxN.toFixed(3) + ' (<0.1), boca max ' + mxB.toFixed(4) + ' (<0.02)');
  }

  /* 8. E O MICROFONE NAO MANDA ANTES DE SABER O QUE E ESTA SALA. O anel nasce
        pre-preenchido com a primeira amostra, portanto ate haver sala que chegue o
        percentil do chao e um palpite sobre uma amostra so — e um palpite baixo abre a
        boca toda. Com o microfone a arrancar cinco frames antes de uma voz alta (o caso
        real: a permissao e dada com a pessoa ja a falar), sem a rampa `prontoFrac` o
        nivel ia a 0.57 no quinto frame e a 1.00 no decimo.
        E a mesma disciplina do `prontoMs` da forma, e tem o mesmo preco: ~1 s de
        arranque em que o microfone nao vale. Por isso se exige tambem o outro lado —
        passado esse tempo tem mesmo de valer, senao a rampa era so uma tara. */
  {
    const sala = fazRuido(-60), voz = fazRuido(-20);
    const r = correAu(eng, S({ audioMix: 1 }), [['repouso', 240]], i => (i < 5 ? sala() : voz()));
    const cedo = Math.max.apply(null, r.nivel.slice(0, 20));
    const tarde = Math.max.apply(null, r.nivel.slice(-30));
    teste('o nivel nao se afirma no primeiro terco de segundo', cedo < 0.4 && tarde > 0.9,
      'nivel nos 1os 20 frames ' + cedo.toFixed(3) + ' (<0.4), 4 s depois ' + tarde.toFixed(3) + ' (>0.9)');
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

  /* 8. A CARA VETA A FORMA, TAL COMO VETA A ABERTURA. Um /m/ tem tanta energia como a
        vogal a seguir e um espectro escuro — o microfone nao tem como saber que os
        labios estao colados, e so a cara sabe. Sem o veto da oclusao nas entradas do
        solver, o espectro pedia um "O" com a boca selada, e o "O" tem abertura propria
        (`own` 1.0): a forma entrava no `amount` do drive e a boca abria por uma porta
        que nao e o `sig.mouth`. Medido no engine anterior, com a boca em 0.046 e o
        press em 0.95: o `amount` ia a 0.829 na v1 e a 0.843 na v3, contra os 0.046/0.000
        que o video pedia — 21 px de abertura onde deviam ser 3.6.
        Duas coisas a exigir, e sao mesmo duas: que o `amount` volte ao do video, e que
        o press SOBREVIVA (a pose de labios colados e do video e nao se negoceia). */
  {
    const seq = [['repouso', 120], ['vogal', AQ], ['bilabial', 60]];
    const bandas = i => (i < 120 + AQ ? ESPECTRO.neutro : ESPECTRO.escuro);
    const fala = fazFala(-25, -45, 120);
    for (const [tag, o] of [['v1', {}], ['v3', { speechV3: 1 }]]) {
      const sem = correAu(eng, S(o), seq, fala);
      const com = correAu(eng, S(Object.assign({ audioVisemes: 1 }, o)), seq, fala, bandas);
      const n = com.amount.length - 1;
      teste('bilabial: o espectro escuro nao abre a boca (' + tag + ')',
        com.amount[n] <= sem.amount[n] + 0.02 && com.press[n] > 0.9,
        'amount ' + com.amount[n].toFixed(3) + ' vs ' + sem.amount[n].toFixed(3) +
        ' sem espectro, com o canal redondo a pedir ' + com.round[n].toFixed(2) +
        '; press ' + com.press[n].toFixed(2) + ' (>0.9)');
    }
  }

  /* 9. O MICROFONE A MORRER A MEIO DE UM "OOO". A permissao revogada, o separador em
        segundo plano, o dispositivo desligado: chega `conf` a zero e as bandas deixam
        de vir. Se o estado do audio CONGELAR em vez de largar, o ultimo `round` fica
        colado ao `sig.au` e o solver continua a le-lo para sempre — medido no engine
        anterior, `round` preso em 0.863 e o peso do "O" em 0.65, com a boca do avatar
        parada num bico ate alguem recarregar a pagina.
        Larga-se como largaria se a voz tivesse simplesmente parado, que e a unica coisa
        que se pode afirmar sem ouvir nada. */
  {
    const AQV = 120 + AQ, CORTE = AQV + 30;
    const seq = [['repouso', 120], ['ooo', AQ], ['ooo', 150]];
    const bandas = i => (i < AQV ? ESPECTRO.neutro : ESPECTRO.escuro);
    const o = correAu(eng, S({ audioVisemes: 1 }), seq, fazFala(-25, -45, 120),
      i => (i >= CORTE ? null : bandas(i)), { confDe: i => (i < CORTE ? 1 : 0) });
    const antes = o.round[CORTE - 1], um = o.round[CORTE + 59];
    teste('o round larga quando o microfone morre', antes > 0.5 && um < 0.05,
      'round ' + antes.toFixed(3) + ' no corte -> ' + um.toFixed(3) + ' um segundo depois (<0.05)');
  }

  /* 10. AS DUAS DOSES AO MESMO TEMPO. `audioMix` e `audioVisemes` sao apostas separadas
         e tem dose propria, mas partilham o `sig.au` e o mesmo veto — ligar as duas e o
         unico sitio onde os dois caminhos se cruzam, e nenhum dos outros testes la vai.
         Exige-se o de sempre: nada de NaN, tudo dentro do curso, e a bilabial a fechar
         pelos DOIS lados (a abertura e a forma). */
  {
    const seq = [['repouso', 120], ['vogal', AQ], ['bilabial', 60]];
    const bandas = i => (i < 120 + AQ ? ESPECTRO.neutro : ESPECTRO.escuro);
    const fala = fazFala(-20, -45, 120);
    for (const [tag, o] of [['v1', {}], ['v3', { speechV3: 1 }]]) {
      const sem = correAu(eng, S(o), seq, fala);
      const r = correAu(eng, S(Object.assign({ audioMix: 1, audioVisemes: 1 }, o)), seq, fala, bandas);
      const n = r.serie.length - 1;
      const listas = [r.serie, r.nivel, r.round, r.spread, r.amount, r.press];
      const sao = listas.every(a => a.every(v => isFinite(v) && v >= 0 && v <= 1));
      teste('as duas doses juntas ficam dentro do curso (' + tag + ')', sao,
        'boca max ' + mx(r.serie).toFixed(3) + ' amount max ' + mx(r.amount).toFixed(3) +
        ' nivel max ' + mx(r.nivel).toFixed(3) + (sao ? '' : ' — NaN ou fora de [0,1]'));
      teste('as duas doses juntas: a bilabial continua a fechar (' + tag + ')',
        r.serie[n] <= sem.serie[n] + 0.06 && r.amount[n] <= sem.amount[n] + 0.06,
        'boca ' + r.serie[n].toFixed(3) + ' e amount ' + r.amount[n].toFixed(3) +
        ' vs ' + sem.serie[n].toFixed(3) + '/' + sem.amount[n].toFixed(3) + ' sem doses');
    }
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
  /* o neutro das poses sinteticas: `repouso` tem jawOpen 0.05 e gap 0.002 */
  const boca = (o, pose) => corre(eng, S(o), [[pose || 'vogal', 40]]).sig.mouth;

  /* 0. O CONTRATO DO `rigSpan`, na funcao e nao so na cadeia.
        Sem medicao devolve o MESMO double — a promessa bit a bit que os goldens cobrem
        de lado, aqui com dentes. E o que entra por aqui vem do `localStorage`, que pode
        trazer qualquer coisa: o que nao for uma medicao positiva maior que o neutro tem
        de cair no ramo fixo, e o que for numero mas absurdo tem de ficar preso pelas
        guardas. Sem isto, um `critters.json` estragado escrevia um span NaN e a boca
        desaparecia sem ninguem perceber porque. */
  if (eng.rigSpan && eng.RIG_MAX) {
    const F = eng.RIG_JAW_SPAN;
    /* [maximo, neutro] que nao sao medicao nenhuma: o maximo tem de ser um numero
       positivo E acima do neutro, senao nao ha curso nenhum medido */
    const RAMO_FIXO = [[0, 0.05], [NaN, 0.05], [-0.3, 0.05], [undefined, 0.05], [null, 0.05],
      [0.05, 0.05], [0.02, 0.05]];
    const maus = RAMO_FIXO.filter(([m, n]) => !Object.is(eng.rigSpan(F, m, n), F));
    teste('entrada degenerada cai no span fixo, bit a bit', maus.length === 0,
      maus.length ? 'falha em ' + JSON.stringify(maus) : RAMO_FIXO.length + ' casos, todos ' + F);
    /* e o que e numero mas absurdo fica entre o chao e o tecto. Tres casos que nao sao
       obvios: o `'0.9'` que o JSON traz como texto e o `>` coage sem se queixar; o
       neutro NaN, que o `|| 0` do engine trata como zero (nao cai no ramo fixo — cai
       aqui, e e o sitio certo, porque um neutro que se perdeu nao invalida a medicao);
       e o neutro ausente, o mesmo caso. */
    const EXTREMOS = [[1e9, 0.05], [0.0500001, 0.05], [1e-9, 0], ['0.9', 0.05],
      [0.05, NaN], [0.42, undefined]];
    const fora = EXTREMOS.filter(([m, n]) => {
      const s = eng.rigSpan(F, m, n);
      return !(s >= F * eng.RIG_MAX.chao - 1e-12 && s <= F * eng.RIG_MAX.teto + 1e-12);
    });
    teste('medicao extrema fica entre o chao e o tecto', fora.length === 0,
      '[' + (F * eng.RIG_MAX.chao).toFixed(3) + ', ' + (F * eng.RIG_MAX.teto).toFixed(3) + '] — ' +
      EXTREMOS.map(([m, n]) => eng.rigSpan(F, m, n).toFixed(3)).join(' '));
  }

  for (const [tag, o] of [['v1', {}], ['v3', { speechV3: 1 }]]) {
    /* 1. A CALIBRACAO MUDA MESMO A CADEIA, e muda-a nos DOIS canais.
          A versao anterior desta assercao comparava a omissao com `maxJaw: 0, maxLip: 0`
          — que e a mesma coisa, 0 contra 0: passava sempre e nao guardava nada.
          O que se exige agora e o par. Cada canal tem o seu `rigSpan` no engine e cada
          um so conta na pose onde manda: na `vogal` mandam os landmarks (apLM 0.306
          contra apBS 0.262) e o `maxJaw` e inerte bit a bit; na `queixoSo` e ao
          contrario. Sem as quatro linhas, apagar o `rigSpan` de uma das chamadas nao
          fazia falhar nada — foi o que a auditoria por mutacao provou do lado do queixo,
          onde nenhuma pose do `POSE` chega. */
    const vog = boca(o), qx = boca(o, 'queixoSo');
    const vogL = boca(Object.assign({ maxLip: 0.2 }, o));
    const vogJ = boca(Object.assign({ maxJaw: 0.9 }, o));
    const qxJ = boca(Object.assign({ maxJaw: 0.9 }, o), 'queixoSo');
    const qxL = boca(Object.assign({ maxLip: 0.2 }, o), 'queixoSo');
    teste('o canal dos labios conta na vogal (' + tag + ')', vogL !== vog && Object.is(vogJ, vog),
      'maxLip ' + vog.toFixed(3) + ' -> ' + vogL.toFixed(3) + ', e o maxJaw sozinho e inerte (' +
      (Object.is(vogJ, vog) ? 'bit a bit' : vogJ.toFixed(6)) + ')');
    teste('o canal do queixo conta na queixoSo (' + tag + ')', qxJ !== qx && Object.is(qxL, qx),
      'maxJaw ' + qx.toFixed(3) + ' -> ' + qxJ.toFixed(3) + ', e o maxLip sozinho e inerte (' +
      (Object.is(qxL, qx) ? 'bit a bit' : qxL.toFixed(6)) + ')');

    /* 1b. E a DIRECCAO e a mesma nos dois: curso pessoal largo contem, curto solta */
    const qxCurto = boca(Object.assign({ maxJaw: 0.2 }, o), 'queixoSo');
    teste('no queixo, curso largo contem e curto solta (' + tag + ')', qxJ < qx && qxCurto > qx,
      'queixoSo ' + qxJ.toFixed(3) + ' < ' + qx.toFixed(3) + ' < ' + qxCurto.toFixed(3));

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

/* ---------------------------------------------------------------------------
   Assercoes da fala v4 (`speechV4`).

   A v4 e a v3 com o EMA que honra os taus longos (`rigEmaLongo`, piso 1e-4) em vez do
   `rigEmaA` (piso 0.02). Duas coisas, e so estas duas, e que ha para provar:

   · **resolve o que diz resolver.** A v3 promete nao mudar de comportamento com a
     cadencia — e cumpre, excepto no unico tau longo que tem. Acima de tau ~ dt/0.0202
     (827 ms a 60 fps) o piso de 0.02 morde, o coeficiente volta a ser constante por
     frame, e a baseline de 2 s do sorriso volta a depender da cadencia. Nao e um
     detalhe: essa baseline e o que separa "falar a sorrir" de um "eee", e um sorriso
     que fica por baixo da baseline nao levanta o canal do E.
   · **e nao toca em mais nada.** A troca do EMA e global dentro da v3, portanto tem de
     se provar que os outros taus (18 a 120 ms) dao o MESMO double com e sem piso — e o
     que faz com que a v3, validada ao vivo tal como esta, continue a ser ela.
   --------------------------------------------------------------------------- */
function assercoesV4(eng) {
  if (!('speechV4' in eng.SENS_DEFAULTS)) return { saltado: true, linhas: [] };
  const S = o => Object.assign({}, eng.SENS_DEFAULTS, o);
  const linhas = [];
  const teste = (nome, ok, detalhe) => linhas.push({ nome, ok, detalhe });

  /* o degrau: 2 s de vogal limpa, 2 s da mesma vogal com um sorriso por cima. A
     baseline do sorriso e um EMA de 2 s, portanto e exactamente isto que a exercita. */
  const smileWApos2s = (o, hz) => {
    const dt = 1000 / hz, n = Math.round(2000 / dt);
    return corre(eng, S(o), [['vogal', n], ['vogalSorri', n]], dt).sig.smileW;
  };
  const HZ = [60, 30, 20];
  const espalha = o => {
    const v = HZ.map(hz => smileWApos2s(o, hz));
    return { v, d: Math.max.apply(null, v) - Math.min.apply(null, v) };
  };
  const fmt = x => HZ.map((hz, i) => hz + 'Hz ' + x.v[i].toFixed(4)).join('  ');

  const e3 = espalha({ speechV3: 1 }), e4 = espalha({ speechV3: 1, speechV4: 1 });
  teste('v4: o mesmo degrau de sorriso converge em qualquer cadencia', e4.d < 0.01,
    fmt(e4) + '  (espalhamento ' + e4.d.toFixed(4) + ' < 0.01)');
  /* o outro lado, e e ele que impede a assercao de cima de ser verde por acaso: se o
     degrau nao separasse as cadencias, converger nao provava nada */
  teste('v3: o mesmo degrau diverge, que e o defeito que a v4 corrige', e3.d > 0.05,
    fmt(e3) + '  (espalhamento ' + e3.d.toFixed(4) + ' > 0.05)');

  /* CIRURGIA: a 60 fps a v4 tem de dar a MESMA boca e a mesma oclusao que a v3 — bit a
     bit — e so o canal do sorriso e que pode mudar. E o que sustenta "a v3 fica
     exactamente como foi validada ao vivo". */
  {
    /* acaba NO degrau de sorriso, e nao depois dele: o `smileW` decai em 60 ms e uma
       comparacao feita ja com ele em zero passava por uma diferenca de 1e-9 */
    const seq = [['vogal', 60], ['bilabial', 30], ['vogal', 30], ['vogalSorri', 120]];
    const dt = 1000 / 60;
    const a = corre(eng, S({ speechV3: 1 }), seq, dt);
    const b = corre(eng, S({ speechV3: 1, speechV4: 1 }), seq, dt);
    /* a boca compara-se na SERIE toda e nao so no fim: um transitorio diferente a meio
       que voltasse ao mesmo sitio passava despercebido no estado final */
    const bocaIgual = a.serie.every((v, i) => Object.is(v, b.serie[i]));
    const dSmile = Math.abs(a.sig.smileW - b.sig.smileW);
    teste('v4 so mexe no canal do sorriso',
      bocaIgual && Object.is(a.sig.press, b.sig.press) && dSmile > 0.05,
      'boca ' + (bocaIgual ? 'identica bit a bit nos ' + a.serie.length + ' frames' : 'DIFERE') +
      ', press ' + (Object.is(a.sig.press, b.sig.press) ? 'identico' : 'DIFERE') +
      ', smileW ' + a.sig.smileW.toFixed(4) + ' -> ' + b.sig.smileW.toFixed(4) + ' (>0.05)');

    /* o `speechV4` grava-se sempre com o `speechV3` a 1, mas uma config a mao ou um
       backup antigo por cima podem trazer so um deles: sozinho tem de cair na mesma
       cadeia, e nao na v1 calada */
    const so4 = corre(eng, S({ speechV4: 1 }), seq, dt).sig;
    const v1 = corre(eng, S({}), seq, dt).sig;
    teste('speechV4 sozinho entra na cadeia v3',
      Object.is(so4.mouth, b.sig.mouth) && so4.mouth !== v1.mouth,
      'boca ' + so4.mouth.toFixed(4) + ' — igual a v3+v4 ' +
      (Object.is(so4.mouth, b.sig.mouth) ? 'bit a bit' : '(NAO)') + ', v1 daria ' + v1.mouth.toFixed(4));
  }

  return { saltado: false, linhas };
}

/* ---------------------------------------------------------------------------
   IDs sinteticos, deterministicos.

   As duas baterias abaixo medem em criters inteiros e nao no `sig`, portanto
   precisam de varrer muitos IDs. O `randomId` do engine usa `Math.random`, que aqui
   nao serve: uma bancada que varre uma amostra diferente a cada corrida nao consegue
   dizer "isto passou". LCG local, sem dependencia do engine, mesma lista sempre.
   --------------------------------------------------------------------------- */
const B36_BANCADA = '0123456789abcdefghijklmnopqrstuvwxyz';
function idsSinteticos(n) {
  let s = 20260728 >>> 0;
  const r = () => (s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296;
  const out = [];
  for (let k = 0; k < n; k++) {
    let id = '';
    for (let i = 0; i < 10; i++) id += B36_BANCADA[Math.floor(r() * 36)];
    out.push(id);
  }
  return out;
}

/* ---------------------------------------------------------------------------
   Assercoes das bocas trocadas no rig (`RIG_MOUTH_SWAP`).

   Quatro bocas que o gerativo desenha bem e o rig nao anima com honestidade
   (tongue, fangs, zigzag, grin) passam a ter destino — mas SO no rig. O que aqui se
   prova e a fronteira, que e a parte que se parte sem ninguem dar por ela:

   · o gerativo tem de ficar byte a byte como estava. O ID mapeia os traits por pesos
     acumulados: se a troca escorregasse para o caminho sem `rig`, TODOS os IDs ja
     gerados mudavam de cara. Nao chega verificar que nao mudam — tem de haver IDs da
     amostra a cair mesmo nas quatro escondidas, senao a assercao passa por a amostra
     nao ter nenhuma. Sao 56 dos 200, e o numero esta no detalhe de proposito.
   · do lado do rig, nenhuma pode sobrar — nem por sorteio nem por um `cfg.traits`
     antigo gravado a mao, que e o caso em que a troca tem de acontecer DEPOIS do
     merge dos traits (foi essa a decisao, e e esta a assercao que a prende).
   --------------------------------------------------------------------------- */
function assercoesBocas(eng) {
  if (!eng.RIG_MOUTH_SWAP) return { saltado: true, linhas: [] };
  const linhas = [];
  const teste = (nome, ok, detalhe) => linhas.push({ nome, ok, detalhe });
  const SWAP = eng.RIG_MOUTH_SWAP, ESTILOS = eng.MOUTH_STYLES;
  const escondida = e => Object.prototype.hasOwnProperty.call(SWAP, e);

  /* 1. A TABELA E COERENTE consigo propria: o destino existe, nao e ele proprio
        escondido (nao ha cadeias: uma troca resolve-se num passo) e nao e a origem. */
  {
    const maus = Object.keys(SWAP).filter(k =>
      ESTILOS.indexOf(k) < 0 || ESTILOS.indexOf(SWAP[k]) < 0 || escondida(SWAP[k]) || SWAP[k] === k);
    teste('a tabela de trocas e coerente', maus.length === 0,
      maus.length ? 'maus: ' + maus.join(', ')
        : Object.keys(SWAP).map(k => k + '->' + SWAP[k]).join(' ') + ' (' +
          (ESTILOS.length - Object.keys(SWAP).length) + ' estilos sobram no studio)');
  }

  const IDS = idsSinteticos(200);

  /* 2. O GERATIVO NAO MUDA. `buildModel(id)` sem opcoes e o caminho do `index.html`. */
  {
    const difs = IDS.filter(id => eng.buildModel(id).mouth.style !== ESTILOS[eng.parseId(id).mouth]);
    const naEscondida = IDS.filter(id => escondida(ESTILOS[eng.parseId(id).mouth]));
    teste('o gerativo nao ve a troca', difs.length === 0 && naEscondida.length > 0,
      IDS.length + ' IDs identicos ao trait sorteado, ' + naEscondida.length +
      ' deles numa boca escondida' + (difs.length ? ' — MAS ' + difs.length + ' diferem: ' + difs.slice(0, 3) : ''));
  }

  /* 3. COM RIG NAO SOBRA NENHUMA, e cada uma vai ao destino da tabela. Por sorteio
        (os 200 IDs) e a mao (os 12 estilos forcados por `traits`), que sao caminhos
        diferentes: o segundo passa pelo merge do `opts.traits`. */
  {
    const sobra = IDS.filter(id => escondida(eng.buildModel(id, { rig: true }).mouth.style));
    const erradas = IDS.filter(id => {
      const g = ESTILOS[eng.parseId(id).mouth];
      return escondida(g) && eng.buildModel(id, { rig: true }).mouth.style !== SWAP[g];
    });
    const forcadas = [];
    for (let i = 0; i < ESTILOS.length; i++) {
      const e = eng.buildModel(IDS[0], { rig: true, traits: { mouth: i } }).mouth.style;
      const esperado = escondida(ESTILOS[i]) ? SWAP[ESTILOS[i]] : ESTILOS[i];
      if (e !== esperado || escondida(e)) forcadas.push(ESTILOS[i] + '->' + e);
    }
    teste('com rig nunca sobra uma boca escondida',
      sobra.length === 0 && erradas.length === 0 && forcadas.length === 0,
      sobra.length || erradas.length || forcadas.length
        ? 'sobram ' + sobra.length + ', destino errado ' + erradas.length + ', forcadas ' + forcadas.join(' ')
        : IDS.length + ' IDs + os ' + ESTILOS.length + ' estilos forcados, todos no destino da tabela');
  }

  /* 4. O CFG ANTIGO. Alguem tem `traits: {mouth: 5}` (tongue) gravado no localStorage
        de quando a boca aparecia no studio. A troca esta DEPOIS do merge, portanto
        tambem esse cai — e o que se mede nao e so o nome do estilo, e a AUSENCIA das
        pecas: a lingua e o que ficava pendurada a bombear com a mandibula.
        O contra-exemplo (sem `rig`, a lingua esta la) e o que impede esta assercao de
        ser verde por a lingua nunca ter sido desenhada. */
  {
    const iT = ESTILOS.indexOf('tongue');
    const comRig = eng.buildModel(IDS[0], { rig: true, traits: { mouth: iT } });
    const semRig = eng.buildModel(IDS[0], { traits: { mouth: iT } });
    const nR = comRig.shapes.filter(sh => sh.part === 'tongue').length;
    const nS = semRig.shapes.filter(sh => sh.part === 'tongue').length;
    teste('um cfg antigo com boca escondida cai na troca',
      comRig.mouth.style === SWAP.tongue && nR === 0 && semRig.mouth.style === 'tongue' && nS > 0,
      'traits.mouth=' + iT + ': com rig ' + comRig.mouth.style + '/' + nR + ' pecas de lingua, ' +
      'sem rig ' + semRig.mouth.style + '/' + nS);
  }

  /* 5. OS 12 CONSTROEM RIG. Um estilo que caia no `buildRig` sem labios nem buraco
        ficava sem boca nenhuma e so se via ao vivo. Os budgets sao medidos na cara
        (espaco entre o nariz e o queixo): tem de existir, ser finitos e nao-negativos,
        e os caps por ponto tem de ser um intervalo (capTop <= capBot). */
  {
    const maus = [];
    for (const id of IDS.slice(0, 12)) for (let i = 0; i < ESTILOS.length; i++) {
      const model = eng.buildModel(id, { rig: true, traits: { mouth: i } });
      const M = eng.buildRig(model).mouth;
      if (!M) { maus.push(ESTILOS[i] + '@' + id + ':sem boca'); continue; }
      for (const k of ['down', 'up', 'liftUp', 'liftDown', 'halfW']) {
        if (!isFinite(M[k]) || M[k] < 0) maus.push(ESTILOS[i] + '@' + id + ':' + k + '=' + M[k]);
      }
      for (let j = 0; j < M.half; j++) {
        if (!isFinite(M.capTop[j]) || !isFinite(M.capBot[j]) || M.capTop[j] > M.capBot[j]) {
          maus.push(ESTILOS[i] + '@' + id + ':cap' + j);
        }
      }
    }
    teste('os 12 estilos constroem um rig com budgets saos', maus.length === 0,
      maus.length ? maus.slice(0, 4).join(' ') : ESTILOS.length + ' estilos x 12 IDs, boca em todos');
  }

  return { saltado: false, linhas };
}

/* ---------------------------------------------------------------------------
   Assercoes das emocoes de sessao (`RIG_EMOCOES`, teclas 1-4).

   O overlay corre ENTRE o tracker e o applyRig e escreve seis canais de expressao —
   e mais nenhum. Duas coisas e que se provam aqui, e a segunda e a que custa:

   · o motor: a rampa e linear em ms, o 0 e o 1 saem exactos, e com peso zero nao se
     escreve um unico double. Este ultimo e o que faz "desligado" ser literalmente o
     caminho de sempre — sem ele, uma emocao que nunca foi ligada ja estaria a
     escrever no `sig` a cada frame e os goldens deixavam de significar o que dizem.
   · as arestas dos numeros. Os presets nao sao gosto: `expr -0.50` deixa 47.6% do
     curso do queixo e a -1 deixava ZERO (fala invisivel, boca colada num frown);
     `wide 0.55` deixa o olho fechado a 16.5% do aberto e a 1 subia para 24%, que ja
     nao se le como pestanejo. As duas assercoes correspondentes trazem o
     contra-exemplo com elas — medem tambem o valor que NAO se escolheu, e exigem que
     esse falhe. Sem isso "o triste deixa falar" era verde com qualquer numero.

   Nota para quem vier: ao largar uma emocao fica um residuo de ~0.003 nos seis canais
   (o ultimo frame com peso ainda escreve, o seguinte devolve 0 sem tocar). E POR
   DESENHO — o EMA do tracker come-o no frame seguinte. Nao assertar restauracao
   exacta do `sig`; o que se asserta e que a chamada com peso 0 nao mexe em nada.
   --------------------------------------------------------------------------- */
function assercoesEmocoes(eng) {
  if (!eng.RIG_EMOCOES) return { saltado: true, linhas: [] };
  const linhas = [];
  const teste = (nome, ok, detalhe) => linhas.push({ nome, ok, detalhe });
  const S = eng.SENS_DEFAULTS;
  const ORDEM = eng.RIG_EMO_ORDEM, CANAIS = eng.RIG_EMO_CANAIS;

  /* o sig com uma emocao ja a fundo (40 frames a 16.7 ms; a rampa precisa de 15) */
  const aFundo = (nome, extra) => {
    const sig = eng.createSig();
    if (nome) {
      const emo = eng.createEmo();
      eng.rigEmoToggle(emo, nome);
      for (let i = 0; i < 40; i++) eng.rigEmoApply(emo, sig, 16.7);
    }
    return Object.assign(sig, extra || {});
  };
  const criter = id => {
    const model = eng.buildModel(id, { rig: true });
    return { model, rig: eng.buildRig(model) };
  };

  /* 1. LATCH: a mesma desliga, outra troca. */
  {
    const emo = eng.createEmo();
    const seq = [emo.ativo === null, eng.rigEmoToggle(emo, 'feliz') === 'feliz',
      eng.rigEmoToggle(emo, 'feliz') === null, eng.rigEmoToggle(emo, 'triste') === 'triste',
      eng.rigEmoToggle(emo, 'zangado') === 'zangado', eng.rigEmoToggle(emo, 'zangado') === null];
    teste('latch: a mesma desliga, outra troca', seq.every(Boolean),
      'null -> feliz -> null -> triste -> zangado -> null' + (seq.every(Boolean) ? '' : ' FALHA em ' + seq.indexOf(false)));
  }

  /* 1b. E UM NOME QUE NAO E UMA EMOCAO nunca produz peso nem escreve um double.
         Inclui `__proto__` e `toString`, que a cadeia de prototipos do objecto de
         presets deixa passar pelo `if (RIG_EMOCOES[nome])` do toggle: o rotulo fica
         em `emo.ativo`, mas como nenhum deles esta no `RIG_EMO_ORDEM` nao ha peso a
         subir e o `sig` nao e tocado. E aqui que isso fica preso — se algum dia um
         nome desses conseguir escrever, esta linha fica vermelha. */
  {
    const maus = [];
    for (const nome of ['xpto', '', 'FELIZ', '__proto__', 'toString', 'constructor']) {
      const emo = eng.createEmo(), sig = eng.createSig();
      eng.rigEmoToggle(emo, nome);
      const antes = {};
      for (const k of Object.keys(sig)) if (typeof sig[k] === 'number') antes[k] = sig[k];
      let k = 0;
      for (let i = 0; i < 40; i++) k = eng.rigEmoApply(emo, sig, 16.7);
      const escreveu = Object.keys(antes).filter(c => !Object.is(antes[c], sig[c]));
      if (k !== 0 || escreveu.length) maus.push(JSON.stringify(nome) + ' peso=' + k + ' escreveu ' + escreveu);
    }
    teste('um nome que nao e emocao nao produz peso nem escreve', maus.length === 0,
      maus.length ? maus.join(' | ') : '6 nomes (com __proto__ e toString), peso 0 e sig intacto');
  }

  /* 2. A RAMPA E EXACTA, e em MILISSEGUNDOS. Chega a 1 dentro dos 250 ms mais um
        frame, volta a 0 dentro dos 450 mais um, e nunca sai de [0,1] pelo caminho.
        Os quatro `dt` sao os que o `rAF` da de facto: 120 Hz, 60, 30 e um frame
        perdido. Um EMA no lugar da rampa nunca chegaria ao 1 exacto — e o 1 exacto e
        o que garante que a emocao a fundo poe o canal EXACTAMENTE no preset. */
  {
    const maus = [], detalhe = [];
    for (const dt of [8, 16.7, 33, 50]) {
      const emo = eng.createEmo(), sig = eng.createSig();
      eng.rigEmoToggle(emo, 'feliz');
      let nSobe = 0, fora = false, k = 0;
      for (let i = 0; i < 400 && k !== 1; i++) { k = eng.rigEmoApply(emo, sig, dt); nSobe++; if (!(k >= 0 && k <= 1)) fora = true; }
      const limSobe = Math.ceil(eng.RIG_EMO.subirMs / dt) + 1;
      eng.rigEmoToggle(emo, 'feliz');
      let nDesce = 0;
      for (let i = 0; i < 400 && k !== 0; i++) { k = eng.rigEmoApply(emo, sig, dt); nDesce++; if (!(k >= 0 && k <= 1)) fora = true; }
      const limDesce = Math.ceil(eng.RIG_EMO.descerMs / dt) + 1;
      detalhe.push(dt + 'ms ' + nSobe + '/' + nDesce + ' frames');
      if (nSobe > limSobe || nDesce > limDesce || fora) {
        maus.push(dt + 'ms: sobe ' + nSobe + '(<=' + limSobe + ') desce ' + nDesce + '(<=' + limDesce + ')' + (fora ? ' FORA DE [0,1]' : ''));
      }
    }
    teste('a rampa chega a 1 e a 0 exactos, no tempo prometido', maus.length === 0,
      maus.length ? maus.join(' | ') : detalhe.join('  ') + ' (250/450 ms + 1 frame)');
  }

  /* 3. COM PESO 0 NAO SE ESCREVE UM DOUBLE — e a promessa que sustenta os goldens.
        Compara-se o `sig` imediatamente antes e depois DA CHAMADA, e nao com o estado
        anterior a emocao: ao largar fica o residuo de ~0.003 descrito no cabecalho.
        Testa-se em frio e depois de um ciclo liga/desliga completo, que e o estado em
        que o `emo` ja tem `base`/`escrito` preenchidos e portanto o caminho e outro. */
  {
    const maus = [];
    for (const tag of ['em frio', 'depois de um ciclo']) {
      const emo = eng.createEmo(), sig = eng.createSig();
      sig.mouth = 0.4; sig.press = 0.2; sig.blinkL = 0.7;
      if (tag !== 'em frio') {
        eng.rigEmoToggle(emo, 'surpresa');
        for (let i = 0; i < 30; i++) eng.rigEmoApply(emo, sig, 16.7);
        eng.rigEmoToggle(emo, 'surpresa');
        for (let i = 0; i < 40; i++) eng.rigEmoApply(emo, sig, 16.7);
      }
      const antes = {};
      for (const k of Object.keys(sig)) if (typeof sig[k] === 'number') antes[k] = sig[k];
      const k = eng.rigEmoApply(emo, sig, 16.7);
      const escreveu = Object.keys(antes).filter(c => !Object.is(antes[c], sig[c]));
      if (k !== 0 || escreveu.length) maus.push(tag + ': peso ' + k + ' escreveu ' + escreveu.join(','));
    }
    teste('peso 0 nao escreve um unico double', maus.length === 0,
      maus.length ? maus.join(' | ') : 'Object.is em todo o sig, em frio e depois de um ciclo liga/desliga');
  }

  /* 4. E A FUNDO SO TOCA NOS SEIS. A abertura vem dos visemes, o pestanejo e o gaze
        vem da cara: uma emocao que escrevesse `mouth` fazia caretas a falar. Varrem-se
        TODOS os campos numericos do `sig` menos os seis — assim um canal novo no
        `createSig` entra nesta assercao sozinho. Os canais de fora entram com valores
        distintos e nao-nulos, senao escrever zero neles passava despercebido. */
  {
    const maus = [];
    const modelo = eng.createSig();
    const FORA = Object.keys(modelo).filter(k => typeof modelo[k] === 'number' && CANAIS.indexOf(k) < 0);
    for (const nome of ORDEM) {
      const sig = eng.createSig();
      let v = 0.11;
      for (const c of FORA) { sig[c] = v; v = +(v + 0.037).toFixed(6); }
      const antes = {};
      for (const c of FORA) antes[c] = sig[c];
      const emo = eng.createEmo();
      eng.rigEmoToggle(emo, nome);
      for (let i = 0; i < 40; i++) eng.rigEmoApply(emo, sig, 16.7);
      for (const c of FORA) if (!Object.is(antes[c], sig[c])) maus.push(nome + '.' + c);
      /* e a fundo o canal fica EXACTAMENTE no preset (o 1 exacto da rampa) */
      for (const c of CANAIS) {
        const alvo = eng.RIG_EMOCOES[nome][c] || 0;
        if (!Object.is(sig[c], alvo)) maus.push(nome + '.' + c + '=' + sig[c] + ' != ' + alvo);
      }
    }
    teste('a emocao a fundo escreve os seis canais e nenhum outro', maus.length === 0,
      maus.length ? maus.slice(0, 6).join(' ') : FORA.length + ' campos do sig intactos bit a bit, ' +
      CANAIS.length + ' exactamente no preset');
  }

  /* 4b. A CARA CONTINUA A MANDAR. O preset e um CHAO, nunca um substituto: um sorriso
        real passa o 0.70 do feliz, um frown real passa o -0.50 do triste, e um canal
        que o preset nao reclama nem sequer e escrito. A primeira versao substituia os
        seis canais pelo preset e a cara morria no ecra enquanto o botao estivesse
        ligado — com a semantica antiga estas tres linhas ficam vermelhas. */
  {
    const maus = [];
    const casos = [
      ['sorriso real passa o chao do feliz', 'feliz', { expr: 0.9, joy: 0.95 }, { expr: 0.9, joy: 0.95 }],
      ['frown real passa o chao do triste', 'triste', { expr: -0.8 }, { expr: -0.8 }],
      ['canal nao reclamado fica da cara', 'feliz', { surprise: 0.6, wide: 0.3 }, { surprise: 0.6, wide: 0.3 }]
    ];
    for (const [nome, emocao, entrada, esperado] of casos) {
      const emo = eng.createEmo(), sig = eng.createSig();
      for (const c in entrada) sig[c] = entrada[c];
      eng.rigEmoToggle(emo, emocao);
      for (let i = 0; i < 40; i++) eng.rigEmoApply(emo, sig, 16.7);
      for (const c in esperado)
        if (!Object.is(sig[c], esperado[c])) maus.push(nome + ': ' + c + '=' + sig[c] + ' != ' + esperado[c]);
    }
    teste('a cara continua a mandar por cima do preset', maus.length === 0,
      maus.length ? maus.slice(0, 4).join(' | ') : 'sorriso 0.9 e frown -0.8 sobrevivem ao feliz/triste, surprise/wide nao reclamados intactos');
  }

  const IDS = idsSinteticos(60);

  /* 5. O TRISTE DEIXA FALAR. O `expr` negativo desce os cantos e o mesmo budget que
        os cantos comem e o que sobra para a mandibula: a -1 o queixo fica com ZERO
        curso e a boca cola num frown mudo. O preset esta em -0.50, que deixa metade.
        O contra-exemplo (`expr: -1` a mao, que tem de dar exactamente 0) e o que
        impede esta linha de ser verde com qualquer numero no preset. */
  {
    const razoes = [], maus = [];
    let mortoA1 = true;
    for (const id of IDS.slice(0, 12)) {
      const { model, rig } = criter(id);
      if (!rig.mouth) continue;
      eng.applyRig(model, rig, aFundo(null, { mouth: 1 }), S);
      const j0 = rig.jawDrop;
      eng.applyRig(model, rig, aFundo('triste', { mouth: 1 }), S);
      const jt = rig.jawDrop;
      eng.applyRig(model, rig, aFundo(null, { mouth: 1, expr: -1 }), S);
      if (rig.jawDrop !== 0) mortoA1 = false;
      if (!(j0 > 0 && jt > 0 && jt >= j0 * 0.35)) maus.push(id + ' ' + jt.toFixed(2) + '/' + j0.toFixed(2));
      razoes.push(jt / j0);
    }
    const mn = Math.min.apply(null, razoes), mx = Math.max.apply(null, razoes);
    teste('o triste nao mata a fala (e o expr -1 matava)', maus.length === 0 && mortoA1,
      'jawDrop fica em ' + (100 * mn).toFixed(1) + '-' + (100 * mx).toFixed(1) + '% do sem-emocao em ' +
      razoes.length + ' IDs (>=35%), e com expr -1 a mao da ' + (mortoA1 ? 'exactamente 0' : 'MAIS QUE ZERO'));
  }

  /* 6. OS CANTOS CURVAM, e e uma mudanca de FORMA — o feliz levanta-os, o triste e o
        zangado descem-nos. Nunca ao contrario: essa e a parte dura da assercao.
        O "estritamente" e que nao pode ser universal e nao e bug: em bocas cuja linha
        de repouso ja toca a linha do nariz o `capTop` nao deixa subir mais nada, e e
        exactamente o clamp a fazer o trabalho dele (2 dos 60 IDs, no feliz). */
  {
    const maus = [], resumo = [];
    for (const nome of ORDEM) {
      const sobe = eng.RIG_EMOCOES[nome].expr > 0;
      let bons = 0, errados = 0, n = 0;
      for (const id of IDS) {
        const { model, rig } = criter(id);
        const M = rig.mouth; if (!M) continue; n++;
        eng.applyRig(model, rig, aFundo(nome), S);
        const d0 = M.pts[0][1] - M.rest[0][1], d1 = M.pts[M.half - 1][1] - M.rest[M.half - 1][1];
        const sinal = sobe ? -1 : 1;
        if (d0 * sinal > 1e-9 && d1 * sinal > 1e-9) bons++;
        else if (d0 * sinal < -1e-9 || d1 * sinal < -1e-9) errados++;
      }
      resumo.push(nome + ' ' + (sobe ? 'sobe' : 'desce') + ' ' + bons + '/' + n);
      if (errados > 0 || bons < n * 0.9) maus.push(nome + ': ' + bons + ' bons, ' + errados + ' ao contrario, de ' + n);
    }
    teste('os cantos curvam para o lado da emocao', maus.length === 0,
      maus.length ? maus.join(' | ') : resumo.join('  ') + ' (0 ao contrario)');
  }

  /* 7. A SURPRESA NAO APAGA O PESTANEJO. O `wide` abre o olho somando a escala, e
        somar sobe o CHAO tanto como o tecto: o olho fechado deixa de ser fechado. A
        0.55 fica em 16.5% do aberto, que ainda se le como um piscar; a 1 fica em 24%,
        que ja nao. As duas metades tem de estar aqui — se so estivesse a primeira,
        subir o preset para 1 nao punha nada vermelho. */
  {
    const razao = (sig0, sig1, model, rig, olho) => {
      eng.applyRig(model, rig, sig0, S);
      const aberto = olho.sh.sy;
      eng.applyRig(model, rig, sig1, S);
      return olho.sh.sy / aberto;
    };
    const rSur = [], rWide = [];
    for (const id of IDS.slice(0, 12)) {
      const { model, rig } = criter(id);
      const olho = rig.eyes.find(e => e.side !== 'R') || rig.eyes[0];
      if (!olho) continue;
      rSur.push(razao(aFundo('surpresa', { blinkL: 1, blinkR: 1 }), aFundo('surpresa', { blinkL: 0.05, blinkR: 0.05 }), model, rig, olho));
      rWide.push(razao(aFundo(null, { blinkL: 1, blinkR: 1, wide: 1 }), aFundo(null, { blinkL: 0.05, blinkR: 0.05, wide: 1 }), model, rig, olho));
    }
    const mxS = Math.max.apply(null, rSur), mnW = Math.min.apply(null, rWide);
    teste('a surpresa nao apaga o pestanejo (e o wide 1 apagava)', mxS < 0.20 && mnW >= 0.20,
      'olho fechado a ' + (100 * mxS).toFixed(1) + '% do aberto (<20%), e com wide 1 iria a ' +
      (100 * mnW).toFixed(1) + '% (que e o valor rejeitado)');
  }

  /* 8. AO TROCAR, A CARA PASSA PELO NEUTRO. Foi pedido explicitamente que uma emocao
        nao entre por cima da outra como um crossfade de duas caras: as duas pesam ao
        mesmo tempo na media ponderada e o `expr` atravessa o zero pelo meio. */
  {
    const emo = eng.createEmo(), sig = eng.createSig();
    eng.rigEmoToggle(emo, 'feliz');
    for (let i = 0; i < 30; i++) eng.rigEmoApply(emo, sig, 16.7);
    const partiu = sig.expr;
    eng.rigEmoToggle(emo, 'triste');
    let mn = 1e9;
    for (let i = 0; i < 40; i++) { eng.rigEmoApply(emo, sig, 16.7); mn = Math.min(mn, Math.abs(sig.expr)); }
    teste('trocar de emocao passa pelo neutro', mn < 0.05 && sig.expr === eng.RIG_EMOCOES.triste.expr,
      'expr ' + partiu.toFixed(2) + ' -> ' + sig.expr.toFixed(2) + ', passou a ' + mn.toFixed(3) + ' do zero (<0.05)');
  }

  /* 9. VARRIMENTO. A emocao mexe na mesma geometria que a fala e pelos mesmos budgets:
        4 emocoes x 5 poses x 25 IDs, a meio da rampa e a fundo. Nenhum ponto da boca
        pode sair do seu [capTop, capBot] nem virar NaN — e a rede que o `applyRig` ja
        promete, agora com a emocao a disputar-lhe o espaco. */
  {
    const POSES = [{}, { mouth: 1 }, { mouth: 0.6, press: 0.9 }, { mouth: 0.4, mouthW: 0.8, pucker: 0.7 },
      { mouth: 1, press: 0.5, jawX: 0.6, funnel: 0.5 }];
    let fora = 0, nan = 0, n = 0, pontos = 0;
    for (const id of IDS.slice(0, 25)) {
      const { model, rig } = criter(id);
      const M = rig.mouth; if (!M) continue;
      for (const nome of ORDEM) for (const p of POSES) for (const frames of [4, 40]) {
        const sig = eng.createSig();
        const emo = eng.createEmo();
        eng.rigEmoToggle(emo, nome);
        for (let i = 0; i < frames; i++) eng.rigEmoApply(emo, sig, 16.7);
        Object.assign(sig, p);
        eng.applyRig(model, rig, sig, S);
        n++;
        for (let i = 0; i < M.half; i++) {
          const j = (i > 0 && i < M.half - 1) ? 2 * M.half - 2 - i : i;
          for (const q of (j === i ? [i] : [i, j])) {
            pontos++;
            if (!isFinite(M.pts[q][0]) || !isFinite(M.pts[q][1])) nan++;
            else if (M.pts[q][1] < M.capTop[i] - 1e-9 || M.pts[q][1] > M.capBot[i] + 1e-9) fora++;
          }
        }
        if (!isFinite(rig.jawDrop)) nan++;
      }
    }
    teste('varrimento: a boca fica na cara com emocao', fora === 0 && nan === 0 && n > 0,
      n + ' combinacoes (4 emocoes x ' + POSES.length + ' poses x 25 IDs x meia/inteira rampa), ' +
      pontos + ' pontos, ' + fora + ' fora dos caps, ' + nan + ' nao-finitos');
  }

  return { saltado: false, linhas };
}

const passaTudo = eng => {
  const a = assercoesV3(eng);
  return a.saltado ? true : a.linhas.every(l => l.ok);
};

module.exports = { POSE, POSE_X, ESPECTRO, passo, corre, vale, idsSinteticos, assercoesV3,
  assercoesAudio, assercoesVisemes, assercoesMaximo, assercoesV4, assercoesBocas,
  assercoesEmocoes, passaTudo };
