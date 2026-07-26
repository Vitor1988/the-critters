/* Carrega o `engine.js` de producao dentro do node.

   O engine e um classic script sem exports: nao ha `module.exports` nem `export`.
   O truque provado e avaliar o ficheiro inteiro e acrescentar no fim uma expressao
   que devolve os simbolos de topo. Como o `eval` directo em sloppy mode partilha o
   escopo lexical, o epilogo ve os `const`/`function` declarados pelo engine.

   Assim as ferramentas correm a cadeia *real*, byte a byte, sem copia nem mock. */
const fs = require('fs');
const path = require('path');

const ENGINE = path.join(__dirname, '..', '..', 'engine.js');

/* os simbolos que a bancada consome; qualquer um em falta rebenta aqui e nao la a frente */
const EPILOGO = ';({ createSig, createCalib, processLandmarks, rigVisemeWeights,' +
  ' rigVisemeDrive, rigClamp, SENS_DEFAULTS, RIG_JAW_SPAN, RIG_LIP_SPAN,' +
  ' RIG_V3: typeof RIG_V3 === "undefined" ? null : RIG_V3 })';

function loadEngine() {
  const src = fs.readFileSync(ENGINE, 'utf8');
  const api = eval(src + EPILOGO);
  for (const k of ['createSig', 'createCalib', 'processLandmarks', 'rigVisemeWeights', 'SENS_DEFAULTS']) {
    if (!api[k]) throw new Error('engine.js sem simbolo esperado: ' + k);
  }
  return api;
}

module.exports = { loadEngine, ENGINE };
