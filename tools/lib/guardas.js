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

const passaTudo = eng => {
  const a = assercoesV3(eng);
  return a.saltado ? true : a.linhas.every(l => l.ok);
};

module.exports = { POSE, passo, corre, vale, assercoesV3, passaTudo };
