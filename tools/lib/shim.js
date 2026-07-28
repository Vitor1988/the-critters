/* Carrega o `engine.js` de producao dentro do node.

   O engine e um classic script sem exports: nao ha `module.exports` nem `export`.
   O truque provado e avaliar o ficheiro inteiro e acrescentar no fim uma expressao
   que devolve os simbolos de topo. Como o `eval` directo em sloppy mode partilha o
   escopo lexical, o epilogo ve os `const`/`function` declarados pelo engine.

   Assim as ferramentas correm a cadeia *real*, byte a byte, sem copia nem mock. */
const fs = require('fs');
const path = require('path');

/* `CRITTERS_ENGINE=<caminho>` troca o engine que a bancada carrega, e serve para uma
   coisa so — mas e uma coisa que esta bancada precisa mesmo de poder fazer: correr as
   assercoes contra um engine ANTERIOR a uma correccao (`git show HEAD:engine.js`) ou
   contra uma copia sabotada de proposito, para provar que elas ficam VERMELHAS com o
   bug. Sem isso, "esta assercao tem dentes" e uma afirmacao que ninguem verificou —
   e a bancada ja teve assercoes que comparavam zero com zero e passavam sempre.
   Por omissao carrega o engine de producao, como sempre. */
const ENGINE = process.env.CRITTERS_ENGINE
  ? path.resolve(process.env.CRITTERS_ENGINE)
  : path.join(__dirname, '..', '..', 'engine.js');

/* os simbolos que a bancada consome; qualquer um em falta rebenta aqui e nao la a frente */
/* Os que vao com `typeof` sao os das features atras de toggle: a bancada tem de poder
   correr contra um engine anterior a elas (e como se prova que uma assercao nova fica
   vermelha com o bug) sem rebentar no epilogo. */
const EPILOGO = ';({ createSig, createCalib, processLandmarks, rigVisemeWeights,' +
  ' rigVisemeDrive, rigClamp, SENS_DEFAULTS, RIG_JAW_SPAN, RIG_LIP_SPAN,' +
  ' RIG_V3: typeof RIG_V3 === "undefined" ? null : RIG_V3,' +
  ' RIG_AUDIO: typeof RIG_AUDIO === "undefined" ? null : RIG_AUDIO,' +
  ' RIG_VISAUDIO: typeof RIG_VISAUDIO === "undefined" ? null : RIG_VISAUDIO,' +
  ' RIG_MAX: typeof RIG_MAX === "undefined" ? null : RIG_MAX,' +
  ' rigSpan: typeof rigSpan === "undefined" ? null : rigSpan,' +
  ' rigAudioVeto: typeof rigAudioVeto === "undefined" ? null : rigAudioVeto,' +
  /* o modelo e o rig: as assercoes das bocas e das emocoes medem na geometria, e nao
     so no `sig` — os cantos da boca, o `jawDrop`, os budgets do `buildRig` */
  ' buildModel: typeof buildModel === "undefined" ? null : buildModel,' +
  ' buildRig: typeof buildRig === "undefined" ? null : buildRig,' +
  ' applyRig: typeof applyRig === "undefined" ? null : applyRig,' +
  ' parseId: typeof parseId === "undefined" ? null : parseId,' +
  ' MOUTH_STYLES: typeof MOUTH_STYLES === "undefined" ? null : MOUTH_STYLES,' +
  ' RIG_MOUTH_SWAP: typeof RIG_MOUTH_SWAP === "undefined" ? null : RIG_MOUTH_SWAP,' +
  ' RIG_EMOCOES: typeof RIG_EMOCOES === "undefined" ? null : RIG_EMOCOES,' +
  ' RIG_EMO: typeof RIG_EMO === "undefined" ? null : RIG_EMO,' +
  ' RIG_EMO_ORDEM: typeof RIG_EMO_ORDEM === "undefined" ? null : RIG_EMO_ORDEM,' +
  ' RIG_EMO_CANAIS: typeof RIG_EMO_CANAIS === "undefined" ? null : RIG_EMO_CANAIS,' +
  ' createEmo: typeof createEmo === "undefined" ? null : createEmo,' +
  ' rigEmoToggle: typeof rigEmoToggle === "undefined" ? null : rigEmoToggle,' +
  ' rigEmoApply: typeof rigEmoApply === "undefined" ? null : rigEmoApply })';

function loadEngine() {
  const src = fs.readFileSync(ENGINE, 'utf8');
  const api = eval(src + EPILOGO);
  for (const k of ['createSig', 'createCalib', 'processLandmarks', 'rigVisemeWeights', 'SENS_DEFAULTS']) {
    if (!api[k]) throw new Error('engine.js sem simbolo esperado: ' + k);
  }
  return api;
}

module.exports = { loadEngine, ENGINE };
