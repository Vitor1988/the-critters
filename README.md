# the critters

Generative interactive animal-monster avatars, inspirado em [the dudes](https://github.com) (ficheiro `../thedudes..html`).

Reescrito de raiz: canvas 2D puro, sem dependências, num único `index.html`.

## Como funciona

- Cada critter é um ID de 6 caracteres base36 no URL hash (`index.html#1a2b3c`)
- O ID codifica traits com **raridade pesada**: espécie (10) · paleta (10) · cabeça (15) · nº olhos (1-5) · olhos (10) · boca (11) · topo (horns/antenna/mohawk/halo) · padrão (stripes/spots/mask/patch) · acessório (blush/brows/whiskers/scar/eyepatch/earring/nosering/hat/beanie)
- Traits exclusivos por espécie (raros): crown (frog) · glasses (owl) · cheese (mouse) · mud (pig) · buckteeth (rabbit) · patches (panda)
- Regras de coerência: hat/beanie suprime traits de topo; eyepatch só com 2+ olhos; nosering só com nariz; earring só com orelhas; sem patterns no panda
- Física replicada dos dudes: lean direcional dos vértices para o rato (`sin(angle)·|drx·10·intensity|`) + jitter da energia do clique com easing 0.2 por vértice
- RNG com seed (FNV-1a + mulberry32): o mesmo ID gera **sempre** o mesmo critter
- Formas "wobbly": pontos sobre elipses/polígonos com jitter, curvas suaves por quadráticas
- Mutações de monstro: orelhas assimétricas, 1-5 olhos, olhos dead (X) / chameleon, dentes, chifres, antenas

## Controlo

| Tecla | Ação |
|---|---|
| `L` / botão random | novo critter aleatório |
| `espaço` | modo estático (sem shake) |
| `A` | freeze total |
| `S` / botão save png | exportar PNG (full res, com DPR) |
| rato | pupilas seguem, velocidade do rato = shake |
| clique / toque | injeta energia de distorção (decai ao longo do tempo) |

## rigged.html — PFP rigged com face tracking

Versão "live" do critter: usa MediaPipe Face Landmarker (478 pontos, 100% local no browser) para animar o avatar com a tua cara:

- **blink por olho** (winks funcionam) — eye aspect ratio com calibração neutral
- **boca** — rig próprio (ver abaixo)
- **head pose** — yaw/pitch/roll controlam o lean + rotação (a mesma física jelly)
- **gaze** — pupilas seguem o olhar (iris tracking)
- **sobrancelhas** — surprise/anger/sad
- **calibração** — primeiros 50 frames com cara neutral; botão recalibrate

Em modo rig os traits incompatíveis são filtrados automaticamente (sem olhos closed/dead/wink).

### rig da boca — uma só, para todos os estilos

Todas as peças da boca são marcadas na engine (`part: lip | hole | teeth | tongue | throat`)
no momento em que são desenhadas — o rig nunca as adivinha pela cor, que colide entre si
em algumas paletas.

No modo rig **não há uma boca por estilo**: há uma boca, e cada estilo entra nela como uma
*linha de repouso* — a sua boca fechada, tal como o critter a desenha. As de arco (`smile`,
`chill`, `w`, `zigzag`, `smirk`, …) dão a linha directamente; as de buraco (`open`, `o`,
`grin`) dão o eixo horizontal da elipse e passam a fechar numa linha limpa como as outras.
Reamostrada para 17 pontos pelo parâmetro (não por x: o `w` são dois arcos que se sobrepõem
em x). Cada estilo traz ainda dois ajustes de carácter em `RIG_MOUTH_STYLE` — `ratio`
(o `o` abre redondo e pequeno, o `grin` largo e baixo) e `p` (expoente do perfil).

Resultado: o `mad` continua a ser uma carranca fechada e o `zigzag` uma serra, mas todos
abrem com a mesma mecânica — cantos ancorados, visemes, budgets medidos na cara.

- **cantos ancorados** — o perfil da abertura é 0 nos cantos (superelipse do viseme; o
  `sin(πu)^1.3` sobrevive só para medir os budgets). A mandíbula nunca arrasta os cantos,
  é o que evita a boca a "deslizar" pela cara
- **budget de abertura calculado na bind pose** — no `buildRig` mede-se o espaço real entre
  o nariz e o queixo e reparte-se 75% para o lábio de baixo, o resto para o de cima. A boca
  não pode sair do contorno da cara por construção, em vez de por um limite fixo
- **sorriso corner-driven** — a expressão levanta/baixa os cantos (peso `1-w`), com orçamento
  próprio; não curva a boca toda
- **peças interiores são filhas do lábio de baixo** — a língua acompanha a mandíbula, a
  garganta é deformada no espaço do buraco, por isso nunca sai dele
- **boil do traço** — a boca aberta redesenha o contorno ~8×/s (hash determinístico por
  instante × ponto, `rigBoil`), como o line boil da animação à mão. É multiplicativo na
  abertura: fechada, colapsa numa linha exacta, com qualquer combinação de sinais
- **oclusão M/B/P** — o `mouthClose`/`mouthPress` do tracker é uma *pose*, não só um
  travão da abertura: de boca fechada a linha achata (a `w` e a `zigzag` alisam-se ao
  pressionar), estreita um nadinha e o traço engrossa. O `(1-openK)` apaga o efeito assim
  que a mandíbula abre. É o ritmo abre-fecha-pressiona que faz a fala ler-se como fala
- **budgets conjuntos + limites por ponto** — o lift dos cantos, a subida do lábio e o
  achatamento do press disputam o mesmo espaço até ao nariz, e descontam-se uns aos
  outros. E como os budgets globais eram medidos com um perfil (`sin^1.3`) mas aplicados
  com outro (a superelipse do viseme) — perto dos cantos um vale ~4× o outro e a soma
  chegava a passar a linha do nariz ~6px —, cada ponto tem ainda tecto e chão próprios
  (`capTop`/`capBot`, medidos na bind pose) onde o `applyRig` prende o resultado final:
  zero violações em 972k poses varridas, com o colapso da boca fechada intacto
- **lábio de baixo liso** — o lábio de baixo é a mandíbula, e a mandíbula não tem os dois
  lóbulos da `w` nem os dentes de serra da `zigzag`. À medida que a boca abre, deixa de
  copiar o desenho de cima e assenta na linha entre os cantos (o budget do queixo conta
  com isso, senão a `mad` — de cantos em baixo — passava a linha do queixo)
- **sem dentes** — escondidos no modo rig; não há mandíbula a que os prender de forma credível

### head pose

Três movimentos, cada um no seu papel:

- **lean** — a paralaxe jelly de sempre, proporcional à `intensity` de cada peça (olhos
  12, sobrancelhas 8, cara 5). É o movimento amplo dos olhos, e fica como está. Vem
  directamente da pose: ligá-lo à velocidade da cabeça dá um bounce a cada rotação
- **rotação da bola** — **só a boca e o nariz**. Vivem numa latitude/longitude de uma
  esfera e deslizam pela superfície quando ela roda (`y' = cy + ry·sin(lat + θ)`),
  portanto andam sempre juntos, com o foreshortening a aparecer sozinho (a derivada de
  `sin` é `cos`) — o "trás estreita, frente alarga" do rigging 2D
- **translação** (`rigHeadShift` + o roll) — a cabeça mexeu-se no enquadramento

Porquê só a boca e o nariz: eram as peças que não acompanhavam. Cada uma seguia a sua
`intensity` (nariz 10, boca 8), portanto a certa altura o nariz passava por baixo da
boca. Partilhando o mesmo deslocamento, isso deixa de poder acontecer. Os olhos e as
sobrancelhas ficam livres — não passam pela bola nem pela máscara.

Detalhes que fazem falta na prática:

- **clipping mask** — a boca e o nariz são clipados à silhueta real da cara (com o seu
  jitter), como as clipping masks do rigging 2D. Sem isto saem pelo contorno, que não é
  uma elipse. O clip liga/desliga por grupos, poucas transições por frame
- **soft limit** — quem já está perto do bordo roda menos (`damp`), senão a boca é
  cortada pela silhueta mal a cabeça inclina a fundo
- **margem da esfera** — a cara não cobre a bola até ao equador; ocupa uns ±45°
- o `sig.pitch`, `roll`, `hx` e `hy` passaram a ser limitados como o `yaw` já era — o
  `pitch` sem limite chegava a 1.8

Sliders no studio: `bola (boca/nariz)`, `lean (olhos)`, `head move`.

### gaze

A pupila move-se dentro de uma órbita, não até ao bordo do olho, e verticalmente tem menos
espaço (a pálpebra corta). Com o ganho original (`f.max · 1.3` nos dois eixos) bastava
inclinar a cabeça — o olhar fica no ecrã, portanto o `eyeLookUp`/`Down` satura — para a
pupila colar à linha de cima ou de baixo do olho. Agora: 0.95 na horizontal, 0.55 na
vertical.

### resposta à fala

A fala normal pica o `jawOpen` do tracker a **0.12–0.18** — uma fatia pequena do range —,
e o mapeamento linear original punha a boca do avatar a mexer-se 6% do curso a falar
normal contra 52% com expressões exageradas: parecia que não respondia.

O que **não** resulta é auto-range (normalizar pelo pico recente da própria pessoa):
qualquer fala passa a ocupar o curso todo — do 8 para o 80 — e deixa de ser monótono,
porque abrir mais a boca alarga o range e pode dar menos abertura no avatar.

A prática das ferramentas de VTuber é remapeamento de **range fixo** (o Warudo expõe-no
como quatro valores: range de entrada → range de saída), justamente porque os trackers
nunca usam o 0–1 e o queixo tem activação basal. É o que está aqui:

- **janela de entrada explícita** (`RIG_JAW_SPAN`, `RIG_LIP_SPAN`), com o zero vindo da
  calibração desta cara — há quem tenha a boca naturalmente entreaberta
- **dois sinais independentes, fica o maior** — o blendshape `jawOpen` e a abertura entre
  os lábios interiores medida nos landmarks (13/14 sobre a altura da cara). Um apanha o
  que o outro falha
- **curva** de expoente 0.85, um empurrão na zona baixa sem distorcer o resto
- **fecha quase tão depressa como abre** (0.6 / 0.45) — senão a fala corrida lê-se como uma
  boca permanentemente entreaberta

**Cicatrizes** (tentado como constante fixa, recuado — não repetir sem teste em câmara
real): snap-to-close perto do zero, viseme E alimentado pelo smile, e gate no queixo *com*
a trava pós-fusão em simultâneo. Prendiam a boca na fala real: o `mouthClose` co-dispara
com a fala normal, a fala baixa vive na zona onde o snap morde, e o E (ratio 0.28) roubava
altura às vogais. A simulação sintética não tem esse ruído — passou nos números e falhou
na cara. As duas primeiras renasceram como **sliders com omissão neutra** (`viseme E`,
`fecho`): a dose passou a ser de quem usa, não minha — a 0/1 são exactamente a cadeia
validada, `fecho` a 2 é o antigo snap, `viseme E` a 1 é a experiência revertida.

**`fala v2` (toggle no studio, desligado por omissão)** — a parte que afinal fazia falta,
isolada para A/B ao vivo: o press cala o *queixo* antes da fusão e deixa de travar depois.
Com press crónico, a trava pós-fusão da v1 põe um teto na abertura (~82% com press 0.3)
que nenhum `mouth gain` fura — é por isso que o slider parece pouco expressivo na v1. Na
v2 o teto é 100% (vogal com press 0.3: 0.30 → 0.37), o gain mapeia quase 1:1, e as seladas
deliberadas passam a fechar de facto (queixo caído de lábios selados: 0.46 → 0.02). O modo
debug (`d`) mostra o `pr` para se ver o nível de press de cada cara.

Amplitude de `sig.mouth` numa fala simulada a 4 sílabas/s:

| pico do jawOpen | linear original | auto-range | range fixo |
|---|---|---|---|
| 0.12 (fala baixa) | 0.06 | 0.39 | **0.23** |
| 0.18 (fala normal) | 0.10 | 0.58 | **0.35** |
| 0.25 (expressiva) | 0.15 | 0.75 | **0.48** |
| 0.45 (boca aberta) | 0.28 | 0.72 | **0.74** |
| 0.80 (exagerada) | 0.52 | 0.65 | **0.60** |

Repare-se na coluna do auto-range: 0.45 dá *mais* que 0.80. Não era monótono.

### a bancada (`tools/`) — porque a simulação sintética já não decide nada

Aquela tabela é de fala *simulada*, e é essa a raiz das cicatrizes acima: duas alterações
passaram nos números e prenderam a boca na cara real. A bancada existe para que a próxima
proposta seja medida em **vídeo de pessoas mesmo a falar** antes de chegar à câmara.

O caminho é `vídeo → traces → replay → métricas`. Os traces saem do **mesmo** modelo do
MediaPipe que as páginas carregam da CDN (`capture.py`, `face_landmarker` float16/1, modo
VIDEO, blendshapes ligados) — um trace de outra versão não representa produção. O replay
(`replay.js`) passa-os pela cadeia real do `engine.js`, sem cópia: o `regress.js` carrega o
ficheiro de produção por `eval` porque o engine é classic script e não exporta nada. Duas
decisões que mudam os números e por isso estão lá escritas: **o relógio é o do loop, não o
do vídeo** (ao vivo o `frame()` corre a 60 Hz e a câmara debita 30, portanto cada frame
passa pela cadeia duas vezes) e **a calibração é injectada** a partir dos percentis do
próprio clip (os actores já estão a falar ao segundo zero; os 50 frames de cara parada do
live não existem ali).

Contra o que se mede: o envelope do áudio do mesmo clip. `r` de Pearson (a boca segue a
voz?), `lag` por correlação cruzada, `alcance` p95−p5 dentro da fala, `jitter` (RMS da 2ª
diferença — sobe com tremor, não com rampas) e `fecho` (fracção dos vales do envelope em
que a boca de facto fecha). Dataset: 16 clips do RAVDESS, actores 01 e 02, **12 de treino
e 4 em holdout** — o holdout nunca entra na afinação, é a única leitura honesta de quanto
isto generaliza. Paridade Python↔browser verificada num clip (`_parity.html`).

O que a bancada mede *não* é a cara dele a falar português. Serve para rejeitar más ideias
em minutos, não para aprovar boas — a aprovação continua a ser o A/B ao vivo.

### `fala v3` (select no studio, `v1` por omissão)

Terceira cadeia, atrás do select `fala`, desenhada e afinada na bancada. Quatro mudanças,
cada uma contra um modo de falha medido:

- **o `mouthClose` desconta-se ao queixo, não trava depois da fusão.** No ARKit ele
  significa "os lábios fecham *apesar* do queixo estar aberto"; a v1 trata-o como ruído e
  é isso que põe o tecto que a v2 já tinha diagnosticado. Aqui entra como
  `jawOpen − 1.1·mouthClose`, com a linha de base calibrada pela mesma combinação para o
  repouso desta cara continuar a dar zero
- **oclusão M/B/P como sinal próprio** — `mouthClose` que o queixo não explica, mais os
  lábios enrolados (`mouthRoll*`), mais o press, com uma zona morta de 0.15. Sem a zona
  morta a v3 repetia a cicatriz: descontar o `mouthClose` ao queixo *e* fechar com ele
  outra vez, o que cortava um quarto da abertura de uma vogal limpa
- **filtros em milissegundos, não em frames.** One Euro nos sinais crus (parado filtra
  muito, em movimento deixa passar o ataque da sílaba) e EMA assimétrico dt-aware no alvo.
  A v1 muda de comportamento entre 30 e 60 fps porque os coeficientes são por frame; a v3
  não — o `rig-page.js` passa o dt real, preso entre 8 e 50 ms
- **E vs sorriso por baseline lenta** — quem fala a sorrir tem um sorriso *lento* por
  baixo e o "eee" é um evento por cima dele. Uma constante de 2 s separa os dois, em vez
  da zona morta fixa de 0.25 da v1, e um gate por abertura impede que um sorriso de boca
  fechada roube altura às vogais

Os parâmetros (`RIG_V3`) não são escolhas de gosto: saíram de uma grelha de 324
combinações sobre os 12 clips de treino, com **guardas duros antes do score** — qualquer
combinação que piorasse o `r` ou multiplicasse o jitter por mais de 1.5 face à v1 em
*qualquer* clip é rejeitada, por melhor que fosse a média. Foram rejeitadas 276 das 324, e
os guardas ganharam a sua paga: a primeira vencedora por score puro deixava o vale entre
sílabas a 0.22 contra 0.06 da v1 — a "boca permanentemente entreaberta" que a v1 já
avisava. A métrica sozinha compra correlação com lentidão.

Números (60 Hz; `lag` positivo = boca atrasada; `fecho` = fracção de vales acertados):

| treino (12 clips) | r | lag | jitter | alcance | fecho |
|---|---|---|---|---|---|
| v1 | 0.600 | 11 ms | 0.034 | 0.80 | 0.52 |
| v2 | 0.593 | 11 ms | 0.035 | 0.82 | 0.52 |
| v3 | **0.630** | 12 ms | **0.032** | 0.80 | 0.51 |

| holdout (4 clips, nunca afinados) | r | lag | jitter | alcance | fecho |
|---|---|---|---|---|---|
| v1 | 0.500 | 11 ms | 0.033 | 0.72 | 0.56 |
| v2 | 0.468 | 11 ms | 0.034 | 0.75 | 0.56 |
| v3 | **0.506** | 15 ms | **0.031** | 0.74 | **0.58** |

Ou seja: ganho real mas modesto (+5% de `r` no treino, +1% no holdout), com menos tremor e
sem pagar em lag — 15 ms continua muito abaixo dos 40 ms em que se começa a ver. A v2 é a
única que piora o `r` no holdout, o que era de esperar: liberta o tecto sem nada que a
segure.

Aquele +1% do holdout merece ser lido com cuidado, porque é uma média de quatro clips e um
deles é patológico: o `happy` forte do actor 01 dá `r` **negativo** nas três cadeias
(−0.03 na v1, −0.09 na v3) — é o clip em que ele declama de boca sempre aberta, e a boca
deixa de ter relação com o volume da voz. Nos outros três a v3 ganha de forma consistente
(0.666→0.697, 0.682→0.705, 0.687→0.717, sempre ~+0.03). Um clip mau não se remove por ser
mau, mas também não se finge que a média de quatro números diz o que diz a de trinta. O
outro senão está no lag: nos clips de emoção forte a v3 chega a 22-31 ms contra 8-12 da
v1 — o hold de 140 ms a fazer o seu trabalho, ainda dentro do orçamento, mas é o primeiro
sítio onde olhar se ao vivo parecer atrasada.

**A v3 não é o caminho por omissão e não passa a ser sem A/B ao vivo** — 0.630 contra
0.600 em dois actores americanos a declamar duas frases não é argumento para mexer no que
está validado na cara de quem usa isto. O guião do A/B está em `tools/README.md`. No modo
debug (`d`), a v3 mostra `ap` e `oc`: com `ap` alto e a boca fechada, quem está a fechar é
a oclusão — distingue-se sinal de pose sem adivinhar.

**Auto-range, outra vez: reprovado, e agora com números.** A checkbox `auto range` existe
(só na v3, desligada) mas a bancada rejeitou-a: viola o guarda do `r` em **11 dos 12 clips
de treino**, um deles a cair de 0.372 para 0.113. Alarga o alcance para 0.92 e baixa o lag
para 3 ms — e é exactamente esse o engodo, porque o que ele faz é seguir a envolvente em
vez da boca. Fica no studio só porque o caso que interessa é o oposto do que estes clips
têm (fala baixa, cansada, ao fim do dia) e esse só se vê ao vivo.

### lipsync híbrido — o slider `áudio` (omissão 0, desligado)

A câmara e o microfone falham em coisas diferentes. **A câmara não sente o ritmo das
sílabas**: a 30 fps cada frame vale 33 ms, uma sílaba dura 150-200 ms, e o que sai é uma
boca que acerta na forma e arredonda o compasso. **O microfone não quer saber da luz** —
tem o ritmo ao milissegundo, mas não distingue um "mmm" de um "ahh" nem sabe sequer se os
lábios estão juntos. Daí a divisão de trabalho do VTube Studio/VSeeFace, que é a que está
aqui: **o áudio manda na ABERTURA, o vídeo continua a mandar na FORMA e na OCLUSÃO**.

O slider `áudio (mistura mic)` (grupo *boca*, do studio) é o peso da mistura. A 0 — a
omissão — nada disto existe: não se pede o microfone, não corre uma linha do caminho novo,
e a saída é byte-a-byte a de antes (provado abaixo). Funciona nas três cadeias, v1/v2/v3.

**Onde a mistura entra.** Só no alvo de abertura, e antes do filtro final:

```
alvo = lerp(aberturaVídeo, nívelÁudio, audioMix · veto) · oclusão · pucker
```

Antes da oclusão, não depois — é isso que garante que uma bilabial fecha a boca por muito
alto que se esteja a falar. Os visemes de forma (E, A, O, U), o `press` e a largura
continuam 100% do vídeo: o microfone não escreve um único sinal de forma.

**O microfone é pedido quando o slider sai do zero, nunca no arranque.** É também o gesto
que o browser exige para abrir um `AudioContext`. Negada a permissão, degrada em silêncio
para vídeo puro com um aviso na linha de estado. A voltar a 0, larga-se o microfone. A
página `rigged.html` usa o `audioMix` gravado como qualquer outra sensibilidade, mas espera
pelo primeiro clique — nunca pede o microfone só por ser aberta. Tudo local, como o resto.

**Do dB ao curso da boca** (`RIG_AUDIO`): RMS do domínio do tempo → dB; chão de ruído
automático (percentil 10 dos últimos 4 s, com descida imediata e subida travada a 10 dB/s);
`gate = chão + 8 dB`; tecto adaptativo com o span preso entre 12 e 30 dB; ataque 20 ms,
descida 90 ms. O tecto é o que faz o mesmo código servir um micro com ganho alto e um
fraco; o `spanMin` é o que impede o "do 8 para o 80" — em silêncio o tecto não se aproxima
do gate, portanto o ruído nunca chega a parecer voz.

#### o que a bancada mediu — e o que ela não pode medir

**Aviso de circularidade, primeiro.** A métrica `r` correlaciona a boca com o envelope do
áudio. Um híbrido *alimentado* por esse envelope infla o `r` por construção: sobe de 0.66
para 0.88, e esse número não vale nada. Pela mesma razão não vale o `fecho`, que deteta as
oclusões pelos mínimos do próprio envelope. **Nada disto foi usado para decidir.** O que a
bancada pode provar são as propriedades que podem partir, e essas foram medidas nos 16
clips com um chão de ruído de sala injectado (`--ruido`, porque o RAVDESS é de estúdio e o
silêncio dele é *digital*, −120 dB, coisa que nenhum microfone dá):

| `audioMix` | vale entre sílabas (v1) | jitter (v1) | p95 | p5 |
|---|---|---|---|---|
| 0 (vídeo puro) | 0.68 | 0.0355 | 0.828 | 0.000 |
| 0.7 | 0.63 | 0.0254 | 0.769 | 0.000 |
| 1 | 0.60 | 0.0290 | 0.816 | 0.000 |

O híbrido **não engorda a boca** (p95 mantém-se, p5 fica em 0), **não treme mais** (o
jitter baixa ~20%) e **fecha melhor entre sílabas** — este último por construção, porque o
envelope tem vales mais fundos do que o tracker; o que interessa é que venha sem tremor.
A amplitude bate certo sozinha: a razão entre o p95 do vídeo e o do áudio tem mediana 0.97
nos 16 clips, ou seja o tecto adaptativo aterra no mesmo sítio onde o vídeo já estava — não
foi preciso escalar nada à mão.

Os tempos saíram de um varrimento: a 110 ms o vale fica em 0.66 do pico, a 90 ms em 0.60,
e o tremor sobe de 0.0272 para 0.0290 — trocou-se um bocado de tremor por vale mais fundo,
que é o lado certo para o defeito que este projeto tem. O `gamma` ficou em **1.0** por
medição, não por gosto: abaixo de 1 a boca engorda no meio do intervalo e o vale sobe.

**O gate, isolado** (cara parada, dB sintético): ruído estacionário a −60, −45, −30 e −20 dB
não abre a boca **nada** (máximo 0.0000). Um tom constante alto também não — para o gate,
constante *é* ruído, por muito que seja. Um degrau de ruído (o ar condicionado a arrancar)
abre a boca e leva **~5 s** a fechar enquanto o chão sobe; era 9 s antes de o limite de
subida passar de 3 para 10 dB/s, e em 40 s de fala contínua o chão assenta no mesmo sítio
com 3 ou com 25 dB/s — quem manda no regime permanente é o percentil.

**O que a bancada apanhou, e é a razão de haver um veto.** Com a mistura no máximo e sem
veto, uma bilabial abria a boca a **0.43** (o vídeo sozinho fecha-a a 0.046) e uma selada a
**0.47** (a v3 fecha-a a 0.000). É o modo de falha de qualquer lipsync só de áudio: o "m"
de "mãe" tem tanta energia como o "ã". O veto (`rigAudioVeto`) tira peso ao microfone à
medida que a oclusão do vídeo sobe, e a zero autoriza-o completamente. As fronteiras (0.30
a 0.62) foram medidas e não adivinhadas: **a falar, a oclusão fica em 0.05 de mediana e
nunca passa de 0.20**, portanto o veto não toca num único frame de fala normal. Com ele, a
bilabial volta a 0.046 — exactamente o vídeo — e a selada da v3 a 0.044.

**O lag não é mensurável neste material.** O envelope aparece 342 ms *depois* da abertura
crua do vídeo (mediana, saturando a janela de procura), porque os actores do RAVDESS abrem
a boca antes de emitir som — está registado na `replay.js` desde a ronda anterior. Contra
este material, um número de lag diria mais sobre a declamação deles do que sobre o código.
**Que o ritmo fica mais colado às sílabas é a intenção do desenho, não um resultado
medido** — é exactamente o que o A/B ao vivo tem de decidir.

#### guião de A/B do áudio

No studio, `d` liga o debug (`+A` e `au` = nível depois do gate; a 0.00 com voz a sair, ou
o chão ainda não assentou ou o gate está a cortar). Põe o slider `áudio` em **0.7**, aceita
o microfone, e compara **0 vs 0.7 vs 1** em cada exercício:

1. **fala corrida, 20 s.** É o exercício que decide. O ritmo deve ficar visivelmente mais
   colado às sílabas; se ficar *atrasado*, é o release de 90 ms e diz-se
2. **"pá-pé-pó", "um bom pombo bebe".** Tem de continuar a fechar. Na bancada fecha ao
   nível do vídeo, mas é aqui que o veto se vê ou não se vê
3. **silêncio com o ruído de fundo da sala, 10 s.** Boca quieta. O `au` deve ficar a 0.00
4. **falar baixinho.** É onde o tecto adaptativo devia ganhar ao vídeo sozinho
5. **assobiar** — um assobio contínuo é um tom estacionário e **não deve abrir a boca**;
   **bater palmas** é o oposto, um transiente com muita energia, e **passa o gate**: espera
   uma abertura curta a cada palma. Não é defeito, é a consequência de um detector de
   energia não saber o que é voz
6. **queixo caído de boca fechada.** Na v1 abre a 0.46 com ou sem microfone (defeito antigo
   da v1, que a v2 corrige); na v3 fica em 0.04

#### limitações honestas

- **o gate é de energia, não de voz.** Palmas, uma porta a bater, uma tosse ou música com
  percussão passam. Um detector de voz a sério (bandas de formantes, ou um VAD) é outra
  ronda
- **ruído doméstico não-estacionário** — televisão, conversa noutra divisão — sobe o chão
  devagar e entretanto mexe a boca. Ruído *estacionário* (ventoinha, frigorífico) é o caso
  fácil e esse está resolvido
- **echo das colunas.** Pediu-se `echoCancellation`, o que ajuda; com colunas altas e
  microfone aberto, o avatar responde ao que sai delas. Auscultadores resolvem
- **o ganho automático fica desligado** de propósito (normalizava a dinâmica, que é o
  sinal). Nem todos os dispositivos respeitam o pedido
- **os números acima são de dois actores americanos a declamar duas frases**, com um chão de
  ruído *simulado*. O material não tem uma única bilabial gravada numa sala a sério

### visemes por áudio — o slider `áudio nas vogais` (omissão 0, desligado)

O híbrido de cima deu ao microfone a **abertura** e deixou a **forma** inteirinha ao
vídeo. Esta é a outra metade: com dose acima de zero, o espectro da voz passa a poder
dizer que a boca está **redonda** (`ooo`, `uuu`) ou em **fenda** (`eee`, `iii`). É
independente do slider `áudio` — doses separadas, A/B separado — e a **abertura e a
oclusão continuam exactamente onde estavam**: medido nos 16 clips, o `sig.mouth` sai
**bit a bit igual** com a dose a 0 ou a 1.

**Onde entra**: nas *entradas* do solver de visemes (`rigVisemeWeights`), no mesmo sítio
por onde o pucker e o stretch do vídeo já entravam, e por `max` — o vídeo continua a
mandar quando viu a forma, o áudio só acrescenta quando a cara não deu sinal. Não toca
nas poses (`RIG_VISEMES`), nem na abertura, nem na oclusão M/B/P.

**Como se lê uma forma num espectro sem fingir fonética.** Sete bandas grosseiras
(50-200, 200-400, … 4000-8000 Hz, a mesma repartição do wawa-lipsync) reduzidas a **um
eixo: o brilho** — quanta energia está em cima face a baixo. Duas medidas independentes
votam nele:

- **tilt**, a diferença em dB entre 1.5-4 kHz e 200-800 Hz;
- **centroide** espectral, em oitavas.

Nos clips da bancada correlacionam-se só a **r = 0.39** — não são a mesma medida, e é
por isso que entram as duas. O peso de **10 dB por oitava** que as põe na mesma escala
não é gosto: é a razão entre os desvios-padrão delas na fala real (9.58 dB / 0.951
oitavas = 10.1). Com o centroide fora, o eixo perde metade da amplitude do lado claro
(p95 do desvio cai de +19.9 para +9.3 dB) e o canal das fendas praticamente não acende.

**Nada disto tem limiares absolutos de Hz, e é o essencial.** Os formantes mudam com a
pessoa, com o microfone e com a distância: nos 16 clips o brilho médio varia **9 dB
entre clips**, tanto quanto varia *dentro* de cada um. Um limiar fixo servia uma voz e
falhava a seguinte. O que se compara é com a **média desta voz** — um seguidor de
mediana lento (passo fixo, 0.8 dB/s, robusto aos 20 dB de um "sss" que arrastariam uma
média) guarda o brilho habitual de quem fala, e os canais medem o desvio em dB face a
ele. As rampas são **assimétricas** porque a distribuição o é: o desvio tem p5 −8.0 dB
e p95 +19.9 dB (a cauda clara é o dobro, porque um sibilante sobe 20 dB e não há nada
que desça outro tanto). Ficaram em −4/−10 dB para o redondo e +7/+18 para a fenda —
escolhidas para os dois canais acenderem a mesma fracção do tempo.

**O arranque tem trava própria, e foi a bancada que a exigiu.** Sem ela, o primeiro som
depois de ligar o microfone define a baseline e tudo o que vem a seguir parece escuro:
nos clips do RAVDESS, que começam todos por uma plosiva, a boca ficava presa num "O" em
61-64% dos frames dos clips mais altos. Enquanto a baseline não tiver ouvido ~1.2 s de
voz não se afirma forma nenhuma (e ao dobro disso conta por inteiro) — a mesma
disciplina do chão de ruído, que também não deixa o microfone mandar antes de saber o
que é silêncio.

#### o que a bancada mediu — e o que ela não consegue medir

Os traces ganharam `audio.bandas` (7 log-energias a 100 Hz, do mesmo clip;
`capture.py --so-audio` recalcula-as sem re-correr o tracker) e o `replay.js --visemes`
injecta-as pelo mesmo parâmetro que ao vivo traz a AnalyserNode.

| medido | resultado |
|---|---|
| a forma toca na abertura? | **não**: o maior desvio do `sig.mouth` é **0** nos 16 clips, dose 0 vs 0.7 |
| flicker de forma | **0.37** mudanças de estado por segundo (uma por grupo silábico) |
| quanto tempo pede forma | **78%** dos frames com voz não pedem forma nenhuma |
| equilíbrio dos canais | redondo activo 3%, fenda 6% — nenhum domina |
| peso nos visemes (p95) | O 0.20 · U 0.06 · E 0.10, contra A 0.44 — secundário, como devia |
| vogal longa apaga-se? | o canal cai de 0.99 para **0.83** ao fim de 2 s |

Os números da tabela são de um **stream contínuo** dos 16 clips seguidos (~59 s), e não
dos clips um a um: em 4 segundos não há tempo para a baseline assentar, e por isso um
clip isolado, com a trava de arranque, não produz forma nenhuma. É o mesmo que dizer que
**a bancada não pode escolher as constantes de tempo da baseline** — 0.8 dB/s e os 5 s
de aquecimento saíram do compromisso medido nos sintéticos (uma vogal de 2 s tem de
sobreviver; um arranque de 1 s tem de convergir), não de uma grelha. Se ao vivo um dos
canais ficar preso, é aí que se olha primeiro.

E o que a bancada **não** conseguiu medir, dito às claras:

- **não há validação fonética.** Tentou-se: as duas frases do RAVDESS são "**Kids** are
  talking by the door" e "**Dogs** are sitting by the door", ou seja uma começa numa
  vogal de fenda e a outra numa redonda. Medido no núcleo da primeira vogal, o contraste
  entre as duas frases é de **−0.06** na diferença dos canais — ou seja, nada, e com o
  sinal trocado. O ataque de cada frase é uma plosiva (/k/, /d/) que domina a janela, e
  sem alinhamento forçado não há como isolar a vogal. **Não se finge que este material
  prova precisão fonética: não prova.**
- **um "sss" lê-se como fenda.** Não é bem um defeito — um /s/ faz-se de boca esticada e
  quase fechada —, mas é o mesmo detector a responder a consoantes e a vogais.
- **é um espectro, não um reconhecedor de vogais.** Um "ó" e um "ô" são o mesmo brilho;
  o que ele distingue é claro de escuro.

#### guião de A/B dos visemes por áudio

`áudio nas vogais` em **0.7**, aceitar o microfone. No debug (`d`) aparece `fo R.. S..`
— os dois canais. Ambos a 0.00 com voz a sair quer dizer que a baseline ainda está a
aquecer (~2 s) ou que o som não se afasta o suficiente da média desta voz.

1. **"ooo" / "eee" / "aaa", ~1 s cada, alternados.** É o exercício que decide: a forma
   tem de ficar **nítida** — bico no "ooo", fenda no "eee", e o "aaa" a não fazer nem um
   nem outro (é a baseline). Comparar 0 vs 0.7 vs 1.
2. **fala normal, 20 s.** O contrário do anterior: **sem caretas espúrias**. Se a boca
   andar a fazer bicos a meio de frases, é a dose (ou os limiares) e diz-se.
3. **vogal sustentada, 5 s.** A forma deve manter-se, não desvanecer. Aos 2 s a bancada
   diz que sobra 83%; a partir daí é a baseline a ganhar terreno, e ver-se-á.
4. **"pá-pé-pó".** A oclusão é do vídeo e não muda: tem de continuar a fechar igual.
5. **silêncio com o ruído da sala.** `fo` a 0.00 e boca quieta.

### calibração de máximo — o botão `calibrar máximo` (sem calibração = nada muda)

A calibração de sempre (os 50 frames de cara neutra) mede o **zero** desta cara. O botão
`calibrar máximo`, ao lado do `recalibrate` nas duas páginas live, mede o outro extremo:
carrega-se, abre-se a boca ao máximo ("AAA") durante ~40 frames, e guarda-se o **p95** do
`jawOpen` e da abertura por landmarks. A partir daí a janela de entrada deixa de ser o
palpite fixo (`RIG_JAW_SPAN` 0.42 / `RIG_LIP_SPAN` 0.085) e passa a ser o curso **desta**
pessoa. Segunda pressão do botão limpa a medição e volta ao fixo — é assim que se faz o
A/B.

Fica em `localStorage` (`critter-rigmax`), **global** como as sensibilidades, e de
propósito **fora do export/importar e da sincronização**: as afinações viajam bem entre
dispositivos, uma medição feita nesta câmara não — no telemóvel a lente e a distância são
outras. O `resolveSens` põe-na sempre por cima, portanto uma afinação "só deste avatar"
não a pode capturar por engano.

**Aplica-se às três cadeias** (v1, v2, v3) e não só à v3, porque a neutralidade é
demonstrável e não uma promessa: sem medição o `rigSpan` devolve *o mesmo double* que
estava lá antes, e o `regress.js` confirma-o bit a bit — nos goldens sintéticos e nos 16
clips reais (a impressão digital de 96 timelines é idêntica à da árvore anterior).

**Duas guardas, e a bancada disse porquê.** O histórico manda: auto-range pelo pico
recente já foi tentado duas vezes e deu "do 8 para o 80". Isto não é auto-range — é uma
medição única e deliberada, que não se mexe sozinha — mas uma medição *má* (a pessoa não
abriu a boca, o tracker perdeu-a) tem de custar pouco:

- **média geométrica com o fixo** — anda metade da distância em log;
- **chão e tecto** — nunca menos de 0.55× nem mais de 1.8× o span fixo.

Simulado nos 16 clips, com o "AAA" a ser o p98 do queixo dos clips fortes de cada actor
(o análogo mais próximo de uma abertura deliberada):

| variante | span do queixo | Δ alcance | Δ r | pior Δ r |
|---|---|---|---|---|
| span medido em bruto (sem média geométrica) | 0.42 → 0.68 | **−0.18** | −0.004 | −0.029 |
| com média geométrica (é o que está) | 0.42 → 0.54 | −0.09 | −0.002 | −0.026 |
| medição má (boca fechada), presa pelo chão | 0.42 → 0.23 | +0.12 | +0.006 | −0.080 |

Ou seja: **a média geométrica corta a metade o estrago** de um máximo grande, que é
exactamente o modo de falha que este projecto teme (boca contida = "boca presa"). E o
chão é o que impede uma medição falhada de multiplicar a boca — mesmo totalmente presa
pela guarda, uma medição má custa correlação no pior clip e sobe o tremor 35%, e é por
isso que o botão recusa a medição quando a boca mal abriu.

**A direcção do efeito depende da pessoa, e é essa a questão.** Nos dois actores da
bancada o curso real do queixo é 0.41 e 0.48 (o fixo, 0.42, é um bom palpite) mas o dos
lábios é 0.108 e 0.118 contra os 0.085 fixos — 26 a 39% acima. Para eles, calibrar
**contém** a boca em vez de a soltar. Quem tiver o curso curto — mouth pequena, câmara
de lado, tracker tímido — ganha boca; quem o tiver longo perde saturação. Qual dos dois é
o caso dele, só o A/B ao vivo diz. No debug (`d`) aparece ` · span 0.31/0.07` com os dois
spans pessoais em vigor.

#### guião de A/B da calibração de máximo

1. **calibrar** (botão, abrir bem a boca até a contagem acabar) e **falar normal, 20 s**.
   A boca abre mais, menos, ou igual? Com `d` ligado, comparar o `span` com 0.42/0.085.
2. **falar baixinho.** É o caso que interessa: se o curso pessoal for curto, é aqui que
   se nota.
3. **limpar** (segunda pressão) e repetir os dois. Empate não promove — fica o fixo.
4. **"pá-pé-pó"** com o máximo calibrado: as bilabiais têm de continuar a fechar (o span
   mexe na escala, não na oclusão).

### visemes — como toda a boca abre

Os visemes comandam a abertura de **todas** as bocas; não há segundo caminho. O
`rigVisemeDrive` devolve os mesmos parâmetros (largura, proporção, repartição entre lábios,
expoente do perfil) e cada família de boca aplica-os à sua geometria — as de arco (`smile`,
`chill`, `w`, …), as de buraco (`open`, `o`, `grin`) e a `rigged`. O desenho de cada boca
mantém-se: é o mesmo `w`, com as vogais por baixo.

Houve um período com um toggle e o antigo abrir/fechar por trás. O antigo não sobreviveu à
comparação e saiu — dois caminhos para a mesma coisa é código a mais para manter.

### a boca `rigged` (visemes)

As 11 bocas são traits gerativos, desenhados para um critter **estático**: o `buildRig`
tem de as converter em algo deformável (juntar arcos numa cadeia, tratar elipses como
buracos, inferir cantos e pesos). Funciona, mas é engenharia inversa.

`rigged` é a 12ª opção do seletor de boca no studio — fora dos pesos de propósito, portanto
nunca sai por sorteio; só à mão, e fica gravada no cfg do critter como qualquer outro
trait. Nasce já com a topologia certa:

- **a bind pose é a boca `chill`** — o mesmo arco, a mesma largura (`mw·0.8`), a mesma
  curvatura relaxada. O que muda é a topologia por baixo
- **duas cadeias que partilham os cantos** (lábio de cima e de baixo), com o contorno
  fechado entre elas a ser o interior da boca. Fechada, as cadeias coincidem *exactamente*
  e lê-se como uma linha
- **nunca mais alta do que larga** — em caras de boca pequena o budget vertical dá muito
  mais do que a largura e o "A" saía um oval de pé
- **visemes como blendshapes** — `RIG_VISEMES` define cada pose (A/E/I/O/U + rest) como o
  contorno da abertura numa superelipse. O `rigVisemeWeights` traduz os sinais da cara em
  pesos e as poses misturam-se linearmente — não há pose "seleccionada". Cada pose tem:
  - `ratio` = **altura/largura**, não uma medida absoluta. É o que mantém o "O" redondo em
    qualquer cara, em vez de depender do espaço que aquela cara tem entre nariz e queixo
  - `own` = a abertura que o viseme exige **sem a mandíbula**. Um "O" faz-se com os lábios
    e o queixo pouco aberto; sem isto nunca chegava a ser redondo. `E` e `I` têm `own: 0`
    de propósito — distinguem-se pela largura, e um sorriso de boca fechada dá stretch a
    rodos, que com abertura própria abria a boca do avatar
  - a abertura final é `max(jaw, own)`, portanto **boca fechada é boca fechada**
- **zona morta** nos sinais de lábio: o tracker nunca dá zero com a cara em repouso, e sem
  ela o resíduo de pucker/stretch mantinha a boca entreaberta
- o wobble estático por vértice deu lugar ao **boil do traço** (ver o rig da boca): o
  mesmo contrato — multiplicativo na abertura, fechada colapsa exacta — mas o contorno é
  redesenhado ~8×/s, com uma semente própria por critter

Vê-la: `_rigtest.html?set=visemes&mouth=11&ids=<id>`.

`_rigtest.html?ids=<id,id,…>&cw=470&set=mouth|head|visemes` desenha a folha de contacto do rig
(cada critter × as poses do set, com as linhas do nariz e do queixo a vermelho). `set=head`
cobre as poses de cabeça e `set=visemes` as vogais + a oclusão M. É a forma rápida de ver o
efeito de uma alteração ao rig sem câmara — serve por http tal como as outras páginas.

## Ficheiros

| Ficheiro | Papel |
|---|---|
| `engine.js` | geração dos critters + `drawPath` + o rig (`buildRig`/`applyRig`/`processLandmarks`) |
| `index.html` | gerativo, sem câmara |
| `rig-page.js` | canvas, câmara, loop e UI comuns ao rigged e ao studio |
| `rigged.html` | PFP live |
| `studio.html` | PFP live + painel de afinação (grava em `localStorage`, por critter) |
| `_rigtest.html` | folha de contacto do rig (ferramenta de dev) |
| `_uitest.html` | medição do layout mobile em iframes de telemóvel (ferramenta de dev) |
| `tools/` | bancada offline da fala: vídeo real → traces → replay → métricas (ver `tools/README.md`). Fora do container |

**Nota**: precisa de ser servido por http(s) (getUserMedia não funciona em file://):
```
npx serve .        # ou python3 -m http.server
```
Para usar como webcam em calls: OBS com Window Capture → Virtual Camera, ou partilha de janela/tab.

## Favoritos, gravação e paletas

- **favoritos** — botão `♡ favorito` nas três páginas; os IDs ficam em `localStorage`
  (`critter-favs`, até 60) e aparecem como chips clicáveis por baixo dos botões
- **afinação** — as sensibilidades são da *cara e da câmara de quem usa*, não do bicho:
  ficam numa base global (`critter-sens`) aplicada a todos os critters. O checkbox
  **`afinação só deste avatar`** grava-as no cfg do critter, que ganha à global — útil
  quando um desenho específico precisa de outra coisa. A paleta, a boca e o fundo
  continuam sempre por critter. A **calibração de máximo** (`critter-rigmax`) é a
  excepção: é global, ganha sempre, e não entra no export nem na sincronização — é uma
  medição *desta* câmara
- **exportar / importar** — botões no studio: um JSON com favoritos, afinação global e
  todos os cfgs de critter
- **sincronização** — o `localStorage` é por browser, portanto abrir no telemóvel dava um
  avatar sem nada. O servidor guarda o mesmo JSON em `data/critters.json` e as páginas
  puxam-no ao abrir (se for mais recente) e empurram-no 1,2s depois de cada alteração.
  Não há backend: é o **módulo WebDAV do nginx** a aceitar o `PUT`, com um volume para os
  dados sobreviverem a rebuilds. Conflitos: ganha quem gravou por último — chega para uso
  pessoal, mas afinar em dois dispositivos ao mesmo tempo perde uma das versões. Sem
  autenticação, de propósito: só existe dentro da tailnet
- **gravar vídeo** (`rigged`/`studio`) — `canvas.captureStream(30)` + a faixa de áudio do
  microfone num só `MediaStream`, gravados por `MediaRecorder` para **`.mp4`** (H.264
  baseline + AAC: abre em iPhone, WhatsApp e QuickTime sem conversão; `.webm` fica só
  como recurso em browsers sem MP4, tipo Firefox). Grava o **avatar**, não a câmara.
  A permissão do microfone é pedida só ao carregar em gravar, com timeout: se não for
  respondida em 8s, grava na mesma sem som
- **paletas** — 18 na lista, mas só as 10 primeiras entram no sorteio. As restantes
  escolhem-se à mão no studio. É de propósito: o ID mapeia a paleta por pesos acumulados,
  portanto mexer na tabela do sorteio mudava a cor de todos os critters já gerados

## Mobile

Em ecrãs pequenos o studio **não sobrepõe nada**: a página passa a fluxo normal com
scroll nativo — canvas em cima (46svh), título, botões e o painel `studio config`
(fechado por omissão) por baixo. Não há `position:fixed`: com a página em
`overflow:hidden` o browser móvel nunca recolhe a barra e o viewport de layout nunca
coincide com o visível — todas as variantes de gaveta ancorada em baixo (CSS `bottom`,
Visual Viewport, posicionamento por JS) morreram disso. A pré-visualização da câmara
fica escondida em mobile: chocava sempre com o cabeçalho, e a pessoa vê-se no avatar.

Para verificar sem telemóvel: `_uitest.html` mede o layout em iframes com tamanho de
telefone. Tem de ser em iframe — uma janela top-level do Chrome headless tem largura
mínima ≈512px e não serve para simular 402.

## Deploy

Site estático — abrir `index.html` ou servir com qualquer static server.

**A câmara exige contexto seguro**: `https`, `localhost`/`127.0.0.1` ou `file://`. Servido
por http num IP (`http://100.104.52.12:8092`) o browser **nem chega a pedir autorização** e
o rig fica em modo rato — a página di-lo explicitamente em vez de dizer "no camera".
Daí o `tailscale serve` a dar https por cima do container.

No homelab corre em container próprio (nginx:alpine, sem build step):

```bash
ssh vmini@100.104.52.12 'cd ~/projetos/the-critters && git pull && /usr/local/bin/docker build -t the-critters .'
ssh vmini@100.104.52.12 '/usr/local/bin/docker stop the-critters; /usr/local/bin/docker rm the-critters; \
  /usr/local/bin/docker run -d --name the-critters --restart=always -p 8092:80 --memory=32m \
  -v critters-data:/var/lib/critters the-critters'
```

O volume `critters-data` guarda o `data/critters.json` da sincronização — **sem ele, um
rebuild apaga os favoritos e a afinação de todos os dispositivos**.
