/* Divisao treino / holdout, num sitio so — para o grid-search nao poder tocar no
   holdout por distraccao.

   RAVDESS codifica o nome: modalidade-canal-emocao-intensidade-frase-repeticao-actor.
   O holdout e uma emocao de cada, repartida pelos dois actores: se a afinacao so
   servisse para um actor ou para uma emocao, aparece aqui. Os clips do proprio
   utilizador (clips/user) sao holdout PERMANENTE — nunca entram no treino, e a
   razao de ser da bancada e que sejam eles a decidir, nao estes. */
const HOLDOUT = [
  '01-01-01-01-02-01-01',   /* neutral, actor 01, frase 2 */
  '01-01-02-01-01-01-02',   /* calm,    actor 02, frase 1 */
  '01-01-03-02-02-01-01',   /* happy forte, actor 01 — o que nunca fecha a boca */
  '01-01-05-01-02-01-02'    /* angry,   actor 02, frase 2 */
];

const EMOCAO = { '01': 'neutral', '02': 'calm', '03': 'happy', '04': 'sad',
  '05': 'angry', '06': 'fearful', '07': 'disgust', '08': 'surprised' };

function descreve(nome) {
  const p = nome.split('-');
  return {
    emocao: EMOCAO[p[2]] || p[2],
    forte: p[3] === '02',
    frase: +p[4],
    actor: p[6],
    holdout: HOLDOUT.indexOf(nome) >= 0 || nome.indexOf('user-') === 0
  };
}

/* etiqueta curta para as tabelas: "neutral!  a01 f2" */
function etiqueta(nome) {
  const d = descreve(nome);
  return (d.emocao + (d.forte ? '!' : '')).padEnd(8) + ' a' + d.actor + ' f' + d.frase;
}

module.exports = { HOLDOUT, descreve, etiqueta };
