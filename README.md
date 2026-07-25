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

### rig da boca

Todas as peças da boca são marcadas na engine (`part: lip | hole | teeth | tongue | throat`)
no momento em que são desenhadas — o rig nunca as adivinha pela cor, que colide entre si
em algumas paletas.

- **cantos ancorados** — o peso por ponto é `sin(πu)^1.3`: 1 no centro, 0 nos cantos. A
  mandíbula nunca arrasta os cantos da boca, é o que evita a boca a "deslizar" pela cara
- **budget de abertura calculado na bind pose** — no `buildRig` mede-se o espaço real entre
  o nariz e o queixo e reparte-se 75% para o lábio de baixo, o resto para o de cima. A boca
  não pode sair do contorno da cara por construção, em vez de por um limite fixo
- **sorriso corner-driven** — a expressão levanta/baixa os cantos (peso `1-w`), com orçamento
  próprio; não curva a boca toda
- **peças interiores são filhas do lábio de baixo** — a língua acompanha a mandíbula, a
  garganta é deformada no espaço do buraco, por isso nunca sai dele
- **ruído partilhado** — os pontos coincidentes das duas metades do lábio partilham o mesmo
  offset de jitter, para a boca fechada colapsar numa linha limpa
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

Amplitude de `sig.mouth` numa fala simulada a 4 sílabas/s:

| pico do jawOpen | linear original | auto-range | range fixo |
|---|---|---|---|
| 0.12 (fala baixa) | 0.06 | 0.39 | **0.23** |
| 0.18 (fala normal) | 0.10 | 0.58 | **0.35** |
| 0.25 (expressiva) | 0.15 | 0.75 | **0.48** |
| 0.45 (boca aberta) | 0.28 | 0.72 | **0.74** |
| 0.80 (exagerada) | 0.52 | 0.65 | **0.60** |

Repare-se na coluna do auto-range: 0.45 dá *mais* que 0.80. Não era monótono.

### visemes — o toggle

O checkbox **`visemes (A/E/I/O/U)`** no studio troca o que comanda a abertura de **qualquer**
boca: em vez do simples abrir/fechar, passa a ser o solver de vogais. Funciona nas três
famílias — as de arco (`smile`, `chill`, `w`, …), as de buraco (`open`, `o`, `grin`) e a
`rigged` — porque o `rigVisemeDrive` devolve os mesmos parâmetros (largura, proporção,
repartição entre lábios, expoente do perfil) e cada família aplica-os à sua geometria.
O desenho de cada boca mantém-se: é o mesmo `w`, com as vogais por baixo.

Com o toggle desligado nada muda em relação ao comportamento antigo. A boca `rigged` usa
os visemes sempre — é o que ela é.

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
- o **wobble é gravado por vértice** no build: partilhado na linha (senão a boca fechada
  não fecha) e multiplicativo na abertura, para o traço não perder o ar de desenhado à mão

Vê-la: `_rigtest.html?set=visemes&mouth=11&ids=<id>`.

`_rigtest.html?ids=<id,id,…>&cw=470&set=mouth|head|visemes` desenha a folha de contacto do rig
(cada critter × 8 poses, com as linhas do nariz e do queixo a vermelho). `set=head` cobre
as poses de cabeça e `set=visemes` as vogais. É a forma rápida de ver o efeito de uma alteração ao rig sem câmara —
serve por http tal como as outras páginas.

## Ficheiros

| Ficheiro | Papel |
|---|---|
| `engine.js` | geração dos critters + `drawPath` + o rig (`buildRig`/`applyRig`/`processLandmarks`) |
| `index.html` | gerativo, sem câmara |
| `rig-page.js` | canvas, câmara, loop e UI comuns ao rigged e ao studio |
| `rigged.html` | PFP live |
| `studio.html` | PFP live + painel de afinação (grava em `localStorage`, por critter) |
| `_rigtest.html` | folha de contacto do rig (ferramenta de dev) |

**Nota**: precisa de ser servido por http(s) (getUserMedia não funciona em file://):
```
npx serve .        # ou python3 -m http.server
```
Para usar como webcam em calls: OBS com Window Capture → Virtual Camera, ou partilha de janela/tab.

## Deploy

É um ficheiro estático — abrir `index.html` ou servir com qualquer static server.
