/* Caras sinteticas para os testes numericos da cadeia da boca.

   Nao substituem video real (foi exactamente por so se ter validado aqui que duas
   tentativas anteriores prenderam a boca ao vivo) — servem para *goldens*: provar
   que uma alteracao com os toggles a 0 nao muda nada, bit a bit. */

/* os 19 landmarks que a cadeia le; o resto do array fica em (0.5,0.5) como no replay */
const LM_IDX = [10, 152, 33, 133, 159, 145, 362, 263, 386, 374, 234, 454, 1, 13, 14, 61, 291, 17, 468];

/* cara neutra de frente; `gap` = distancia entre os labios interiores (13/14) */
function mkLm(gap) {
  const lm = [];
  for (let i = 0; i < 478; i++) lm.push({ x: 0.5, y: 0.5, z: 0 });
  const set = (i, x, y) => { lm[i] = { x, y, z: 0 }; };
  set(10, 0.5, 0.30); set(152, 0.5, 0.70);
  set(33, 0.42, 0.42); set(133, 0.46, 0.42); set(159, 0.44, 0.415); set(145, 0.44, 0.425);
  set(362, 0.54, 0.42); set(263, 0.58, 0.42); set(386, 0.56, 0.415); set(374, 0.56, 0.425);
  set(234, 0.38, 0.5); set(454, 0.62, 0.5); set(1, 0.5, 0.5);
  set(13, 0.5, 0.585); set(14, 0.5, 0.585 + gap);
  set(61, 0.46, 0.59); set(291, 0.54, 0.59); set(17, 0.5, 0.62); set(468, 0.44, 0.42);
  return lm;
}

const BS_NAMES = ['jawOpen', 'mouthClose', 'mouthPressLeft', 'mouthPressRight', 'mouthPucker',
  'mouthFunnel', 'mouthSmileLeft', 'mouthSmileRight', 'mouthFrownLeft', 'mouthFrownRight',
  'mouthStretchLeft', 'mouthStretchRight', 'mouthRollLower', 'mouthRollUpper',
  'eyeSquintLeft', 'eyeSquintRight', 'eyeWideLeft', 'eyeWideRight', 'browInnerUp',
  'browOuterUpLeft', 'browOuterUpRight', 'browDownLeft', 'browDownRight', 'eyeBlinkLeft',
  'eyeBlinkRight', 'eyeLookOutLeft', 'eyeLookInLeft', 'eyeLookOutRight', 'eyeLookInRight',
  'eyeLookUpLeft', 'eyeLookUpRight', 'eyeLookDownLeft', 'eyeLookDownRight',
  'mouthLeft', 'mouthRight', 'jawLeft', 'jawRight'];

function mkBs(o) {
  const bs = {};
  for (const k of BS_NAMES) bs[k] = 0;
  return Object.assign(bs, o);
}

/* pre-roll de calibracao: a cadeia so escreve no sig depois de 50 frames de cara parada */
function fresh(eng, SENS) {
  const sig = eng.createSig(), cal = eng.createCalib();
  for (let i = 0; i < 55; i++) eng.processLandmarks(mkLm(0.002), mkBs({ jawOpen: 0.05 }), sig, cal, SENS);
  return { sig, cal };
}

module.exports = { LM_IDX, mkLm, mkBs, BS_NAMES, fresh };
