# bancada da fala

Ferramentas de desenvolvimento. **Não entram no container** — o `Dockerfile` copia
ficheiros por nome, portanto esta pasta fica de fora por construção, não por um
`.dockerignore` que alguém se possa esquecer de manter.

Existem por uma razão concreta: duas alterações ao rig da boca passaram na simulação
sintética e prenderam a boca na cara real (ver *Cicatrizes* no `README.md` da raiz). A
bancada mede em **vídeo de pessoas mesmo a falar**, contra o áudio delas. Não substitui o
A/B ao vivo — serve para rejeitar más ideias em minutos, para que só chegue à câmara o que
já sobreviveu a alguma coisa.

## O que é cada peça

| Ficheiro | Papel |
|---|---|
| `fetch-datasets.sh` | traz os 16 clips do RAVDESS (Zenodo 1188976, actores 01 e 02) e normaliza-os com ffmpeg |
| `capture.py` | vídeo → trace JSON pelo MediaPipe (o **mesmo** modelo e opções da CDN de produção) + o áudio (envelope e bandas) |
| `replay.js` | replay de um trace pela cadeia real do `engine.js` (sem cópia: carrega o ficheiro de produção) |
| `metrics.js` | métricas da timeline contra o envelope do áudio: `r`, `lag`, alcance, jitter, fecho |
| `regress.js` | goldens numéricos (v1/v2 bit a bit) + asserções da v3, do áudio, da forma, do máximo e da v4 |
| `gridsearch.js` | afinação do `RIG_V3`: grelha de 324 + descida por coordenadas, com guardas duros |
| `tabela.js` | o relatório: tabela por clip e médias, separadas em treino e holdout |
| `verify-bancada.js` | verifica a **bancada**, não o rig: determinismo, sanidade da métrica, sensibilidade à calibração |
| `lib/guardas.js` | as poses sintéticas e as asserções — partilhadas pelo regress e pelo grid, de propósito |
| `lib/clips.js` | a divisão treino/holdout, num sítio só, para o grid não lhe poder tocar por distracção |
| `_parity.html` + `parity-server.js` | paridade Python↔browser do tracker num clip |
| `_enginetest.html` | o engine corrido num browser: apanha o que o node não apanha |

`clips/`, `traces/`, `out/` e `models/` estão no `.gitignore` — são grandes e
reconstrutíveis. Os números que interessam vivem no `README.md` da raiz, não em JSON.

## Correr

Preparar os dados (uma vez; o `capture.py` é o passo lento):

```bash
cd tools
./fetch-datasets.sh                              # ~1.1 GB do Zenodo -> clips/
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python capture.py                      # clips/ -> traces/
.venv/bin/python capture.py <clip> --frames 30   # um só, para testar o ambiente
python3 capture.py --so-audio                    # só o bloco `audio` dos traces que já existem
node verify-bancada.js --com-v3                  # a bancada vale alguma coisa?
```

O `--so-audio` recalcula o `envDb` e as `bandas` a partir dos clips e reescreve-os nos
traces **sem tocar nos landmarks** — e sem precisar do mediapipe (o `import` dele é
tardio de propósito, porque um espectro só precisa de numpy e do ffmpeg). É como as
bandas entraram em traces já capturados, e aborta se o envelope sair diferente do que lá
estava: um envelope diferente mudava todos os números da bancada por baixo.

Medir:

```bash
node regress.js                          # goldens + asserções da v3 e do áudio  <- sempre
node tabela.js v1 v2 v3 --out final      # a tabela + out/final.json
node tabela.js --hz 30 v1 v3             # à cadência do mobile
node replay.js <clip> --modo v3          # um clip, para ir ver o que se passa nele
node gridsearch.js                       # afinação do RIG_V3 (--rapido: grelha grossa)

node replay.js <clip> --modo v3 --audio 0.7 --ruido -55      # com o microfone simulado
node replay.js <clip> --modo v3 --visemes 0.7 --ruido -55    # com o espectro do microfone
```

### provar que uma asserção tem dentes

Uma asserção verde não vale nada enquanto ninguém a tiver visto vermelha — esta bancada
já teve uma que comparava `0` com `0` e passava sempre. `CRITTERS_ENGINE` aponta o shim
a outro `engine.js`, e é assim que se verifica o lado vermelho:

```bash
git show HEAD:engine.js > /tmp/antes.js                   # ou uma cópia sabotada de propósito
CRITTERS_ENGINE=/tmp/antes.js node regress.js             # a asserção nova tem de FALHAR aqui
CRITTERS_ENGINE=/tmp/antes.js node verify-bancada.js --com-v3
```

Contra o `HEAD` de 2026-07-28 (antes das correcções do áudio) dá **goldens OK e 8 de 58
asserções vermelhas** — e as duas metades dizem coisas diferentes: os goldens passarem
prova que aquelas correcções foram neutras para a v1/v2, e as 8 vermelhas são a lista
exacta do que elas corrigiram.

A regra que daqui sai: **uma correcção no engine chega com uma asserção que fica vermelha
sem ela**, e quem a escreve confirma-o antes de a dar por feita, não depois.

### o microfone na bancada

`--audio <0..1>` injecta o `audio.envDb` do próprio trace no `processLandmarks` pelo mesmo
parâmetro que ao vivo traz o microfone, alinhado por timestamp. `--ruido <dB>` soma-lhe um
chão de sala — obrigatório para ter algum sentido, porque o RAVDESS é de estúdio e o
silêncio dele é *digital* (−120 dB, zeros exactos); sem chão, o gate automático nunca é
exercitado. −55 dB é um portátil típico.

**A regra que aqui se aplica é diferente das outras: o `r` e o `fecho` não valem.** Ambos
se medem contra o envelope, e um híbrido alimentado por esse envelope correlaciona-se com
ele por construção — o `r` sobe de 0.66 para 0.88 e não quer dizer nada. O que a bancada
pode dizer sobre o híbrido é só isto: o vale entre sílabas, o jitter, a amplitude, o gate
contra ruído, e se a oclusão do vídeo continua a ganhar. As asserções em `lib/guardas.js`
(`assercoesAudio`) são exactamente essas, e correm no `regress.js` como as da v3.

Duas delas são de um tipo diferente das outras — não perguntam se o híbrido é bom, mas se
o canal do nível sobrevive ao que lhe chega de facto, e as duas apanharam bugs a sério:

- **silêncio digital.** Zeros exactos chegam a toda a hora (a `AnalyserNode` antes de o
  stream debitar, o micro em mute, o `AudioContext` suspenso) e **não são uma medição de
  silêncio**. Um único frame deles punha o chão em −100 dB e o gate em −92: a partir daí
  o ruído de sala a −55 dB lia-se como voz cheia. Medido no engine anterior, neste
  cenário: nível 1.000 e boca escancarada a 1.000, sem ninguém falar. É o modo de falha
  mais caro que este canal tem, porque não precisa de ninguém — basta abrir a página.
- **a rampa `pronto`.** O anel do chão nasce pré-preenchido com a primeira amostra, e até
  haver sala que chegue o percentil é um palpite sobre uma amostra só. Com o microfone a
  arrancar cinco frames antes de uma voz alta (o caso real: a permissão é dada com a
  pessoa já a falar), sem a rampa o nível ia a 0.57 ao quinto frame e a 1.00 ao décimo.
  A asserção exige os **dois** lados — nada no primeiro terço de segundo, e cheio um
  segundo depois, senão a rampa era só uma tara.

### o espectro na bancada (`--visemes`)

`--visemes <0..1>` injecta o `audio.bandas` do trace (7 log-energias a 100 Hz) no
`au.bandas`, exactamente pelo parâmetro que ao vivo traz a AnalyserNode. A derivação
— brilho, baseline por mediana, canais redondo/fenda — corre **dentro do engine**: a
bancada não tem uma cópia dela, tal como não tem uma cópia da cadeia da boca.

Três avisos sobre o que estes números valem:

- **um clip isolado não chega.** Em 4 segundos a baseline não assenta, e com a trava de
  arranque (~1.2 s de voz) um clip do RAVDESS não produz forma nenhuma. Os números do
  README saíram de correr os 16 clips **seguidos**, como um minuto de conversa.
- **não há verdade fonética aqui.** Mediu-se o contraste entre a frase que começa em
  "Kids" e a que começa em "Dogs" e deu **−0.06** — nada, e com o sinal trocado. O
  ataque de cada frase é uma plosiva e sem alinhamento forçado não se isola a vogal.
- **o que se pode provar** é o resto, e está em `assercoesVisemes`: a direcção (graves →
  O/U, agudos → E/I), que a forma **não escreve abertura** (`sig.mouth` bit a bit igual
  com a dose no máximo), o silêncio, o arranque e a vogal longa.

E três que se acrescentaram depois, porque a auditoria mostrou que "a forma não escreve
abertura" estava a ser verificada no sítio errado — no `sig.mouth`, que era o único sítio
por onde a forma **não** passava:

- **a cara veta a forma, tal como veta a abertura.** Um /m/ tem tanta energia como a
  vogal a seguir e um espectro escuro; o microfone não tem como saber que os lábios estão
  colados. Sem o veto da oclusão nas entradas do solver, o espectro pedia um "O" — e o
  "O" tem abertura própria (`own` 1.0), portanto a forma entrava no `amount` do drive e
  abria a boca por uma porta que não é o `sig.mouth`. Medido no engine anterior, com a
  boca em 0.046 e o press em 0.95: `amount` a **0.829** (v1) e **0.843** (v3) contra os
  0.046/0.000 que o vídeo pedia. A asserção mede o `amount`, e exige também que o press
  sobreviva — a pose de lábios colados é do vídeo e não se negoceia.
- **o microfone a morrer a meio de um "ooo".** `conf` a zero, as bandas a faltar, a
  permissão revogada. Se o estado congela em vez de largar, o último `round` fica colado
  ao `sig.au` e o solver continua a lê-lo: `round` preso em 0.863 e o peso do "O" em
  0.65, com a boca parada num bico até alguém recarregar a página.
- **as duas doses ao mesmo tempo.** `audioMix` e `audioVisemes` têm dose própria mas
  partilham o `sig.au` e o mesmo veto, e é o único sítio onde os dois caminhos se cruzam.
  Exige-se o de sempre: nada de NaN, tudo dentro de [0,1], e a bilabial a fechar pelos
  dois lados (a abertura **e** a forma).

### a calibração de máximo na bancada

Simula-se passando `maxJaw`/`maxLip` no `sens` do `replay` — o "AAA" da pessoa é o p98
do queixo dos clips fortes de cada actor. Serviu para escolher as guardas (média
geométrica e o chão de 0.55×) com números em vez de intuição; a tabela está no
`README.md` da raiz. As asserções de contrato estão em `assercoesMaximo`: sem medição o
span é o fixo **bit a bit**, um curso largo contém a boca, um curto solta-a, uma medição
absurda fica presa pelas guardas e a bilabial continua a fechar.

**Há dois canais, e cada um só conta na pose onde manda.** Isto custou uma auditoria por
mutação a descobrir: apagar o `rigSpan` do canal do **queixo** do `engine.js` não fazia
falhar uma única asserção. A razão é que todas elas mediam na pose `vogal`, e nela é o
canal dos *landmarks* que ganha a fusão "fica o maior" — `apLM` 0.306 contra `apBS`
0.262. O `maxJaw` era inerte **bit a bit**, e o teste passava por não estar a olhar.

A pose que faltava é a `queixoSo` (em `POSE_X`, e não no `POSE`, porque uma chave nova
ali mudava o sweep dos goldens): queixo caído com os lábios interiores sem separação
mensurável — barba, resolução, luz de cima. É exactamente o caso para que a fusão
existe. As asserções são agora um par, e é o par que fecha o buraco:

| pose | quem manda | `maxJaw` sozinho | `maxLip` sozinho |
|---|---|---|---|
| `vogal` | landmarks | inerte, bit a bit | 0.365 → 0.320 (v1) |
| `queixoSo` | queixo | 0.599 → 0.444 (v1) | inerte, bit a bit |

Apagar qualquer uma das duas chamadas ao `rigSpan` põe agora quatro asserções vermelhas.

Há ainda o contrato do **`rigSpan` como função**, e não só através da cadeia: o que entra
por ali vem do `localStorage` e pode ser qualquer coisa. O que não for uma medição
positiva e acima do neutro (`0`, `NaN`, negativo, `undefined`, `null`, igual ao neutro)
tem de devolver o span fixo **`Object.is`-igual**; o que for número mas absurdo (`1e9`,
uma medição a rasar o neutro, o `'0.9'` que o JSON traz como texto e o `>` coage sem se
queixar) tem de ficar entre o chão e o tecto. Um `critters.json` estragado escrevia um
span NaN e a boca desaparecia sem ninguém perceber porquê.

### a v4 na bancada

A v4 é a v3 com o EMA que honra os taus longos (`rigEmaLongo`, piso 1e-4) em vez do
`rigEmaA` (piso 0.02). Acima de tau ≈ dt/0.0202 — 827 ms a 60 fps — o piso morde, o
coeficiente volta a ser constante por frame, e a cadeia volta a depender da cadência.
A v3 só tem um tau nessa zona, a baseline de 2 s do sorriso, mas não é um detalhe: é ela
que separa "falar a sorrir" de um "eee".

`assercoesV4` prova as duas metades, e são mesmo duas:

- **resolve o que diz resolver.** O mesmo degrau de sorriso a 60/30/20 fps deixa o
  `smileW` em 0.0426 / 0.1377 / 0.1688 na v3 — 4× — e em 0.1700 / 0.1694 / 0.1688 na v4.
  Exige-se convergência na v4 (< 0.01) **e** divergência na v3 (> 0.05): sem o segundo,
  a v4 convergir podia ser só o degrau não separar as cadências.
- **e não toca em mais nada.** A troca do EMA é global dentro da v3, portanto prova-se
  que a boca e a oclusão saem **bit a bit iguais** às da v3 na série toda, e que só o
  canal do sorriso muda. É o que sustenta "a v3 fica exactamente como foi validada".

E porque o `speechV4` se grava sempre com `speechV3: 1` mas uma config à mão ou um backup
antigo por cima podem trazer só um deles, há uma asserção para o `speechV4` sozinho cair
na mesma cadeia e não na v1 calada.

Na tabela a v4 **não entra por omissão**: nestas métricas dá o mesmo que a v3, bit a bit
nos 16 clips, porque o canal do sorriso só chega à boca pelo slider `viseme E`, que está
a 0. Uma coluna repetida não é informação. `node tabela.js v3 v4` e `--modo v4` aceitam-na
para quem quiser ver; a igualdade em si é uma verificação do `verify-bancada.js`, para que
deixar de ser verdade seja uma falha e não uma surpresa.

O `gridsearch.js` **não escreve no `engine.js`**: grava a vencedora em
`out/gridsearch.json` e os valores copiam-se à mão para o `RIG_V3`. É de propósito — uma
alteração à cadeia da boca passa sempre por alguém a olhar para ela.

Cuidado com o `--rapido`: ele **reescreve** o `out/gridsearch.json` com a vencedora da
grelha grossa, e essa não é a que está no `RIG_V3` (a do engine saiu da grelha completa
seguida da descida por coordenadas). Como o ficheiro é o único registo de proveniência
dos números do `RIG_V3`, uma corrida rápida por curiosidade apaga-o. Copiar antes.

### o `verify-bancada.js`, e o critério da cadência que mudou

Verifica a **bancada**, não o rig: determinismo, sanidade da métrica, e se um número que
ela produz sobrevive às escolhas que nós fizemos por ela.

O ponto 4 costumava exigir que **o ranking entre cadeias fosse o mesmo a 60 e a 30 Hz**, e
esse critério estava errado — reprovava a bancada por uma propriedade que ela devia estar
a celebrar. A 30 Hz o replay chama a cadeia metade das vezes (`detTick % 2`, como o
mobile). Os filtros da v1/v2 são coeficientes **por frame**, portanto a metade da cadência
ficam com o dobro do tempo de subida: suavização de borla, que ninguém pediu. E o `r`
premeia suavização, porque correlaciona a boca com um envelope que é suave. Resultado: a
v1 sobe de 0.5748 para 0.6092 sem ninguém lhe ter tocado e passa a v3, que fica onde
estava (0.5988 → 0.5990) precisamente por filtrar em milissegundos. **Um critério que
premeia um artefacto não é um critério — é um erro com saída diferente de zero.**

O que substituiu, e é o que a bancada pode mesmo afirmar:

- **cada cadeia tem de ser consistente consigo própria** entre 60 e 30 Hz. Às cadeias em
  ms exige-se |Δr| ≤ 0.01 (a v3 deriva 0.0002); é a promessa explícita dela, e é o que se
  quer garantir que continua verdade quando alguém lhe mexer.
- **as cadeias por frame derivam, e isso mede-se sem reprovar** — é o defeito conhecido
  delas e a razão de ser da v3. Mas exige-se o contrapeso: elas *têm* de derivar mais
  (v1 0.0343, 145×). Sem isso, "a v3 não deriva" podia ser só o modo 30 Hz do replay a
  não estar a exercitar cadência nenhuma, e a asserção passava por não testar nada.
- **o ranking compara-se só a 60 Hz**, que é a cadência a que o `rAF` corre e a que os
  números do README foram medidos, e tem de bater com o do teste do percentil.

E dois pontos novos: a **v4 idêntica à v3** nos 16 clips (ver acima), e o **microfone
simulado a 30 Hz** — o ponto 4 corre a 30 Hz sem áudio nenhum, e o caminho do microfone
tem estado que se dimensiona pelo `dt` (o anel do chão, a rampa `pronto`, os EMA da
forma) que mais nenhum teste exercita nessa cadência. É sanidade e não qualidade: nada
fora de [0,1], nada NaN, a boca a abrir e a voltar, e os números na mesma ordem de
grandeza (rácio 30/60 do pico 0.98–1.01, do nível 1.007).

### o que a bancada continua a NÃO cobrir

Escrito para a próxima sessão não voltar a descobrir isto do zero:

- **o envelope e as bandas do `capture.py` são uma reimplementação em numpy sobre o PCM
  do ffmpeg — não é o que a `AnalyserNode` calcula no browser.** E o `_parity.html`, que é
  o único gate de paridade que existe, compara **landmarks** e não toca no áudio: deste
  lado não há nada a verificar que os dois batam certo. O desvio foi medido fora desta
  bancada em ~3.7 dB por frame (número de fora, aqui não reproduzível). Chega para
  exercitar o gate, o chão e o tecto; não chega para afinar limiares ao dB.
- **o `dt` do replay é fixo** (16.667 ms, ou 33.3 a `--hz 30`). O `rAF` real varia, salta
  frames e congela ao mudar de separador. Nada aqui apanha um `dt` de 250 ms.
- **`--hz` só conhece dois valores**: 60 e 30. Qualquer outro número cai no caminho dos 60
  e dá exactamente os mesmos números — não há aqui uma cadência contínua. (As asserções
  sintéticas do `regress.js` é que passam `dt` a sério, e é lá que a v4 se mede a 20 Hz.)
- **a cara está sempre presente.** Não há um único frame sem tracker, sem `blendshapes`,
  com a cara a sair de campo ou com duas caras. O que existe é uma asserção de um
  blendshape em falta na v3 — o resto do caminho de perda de tracking não está medido.
- **não há verdade fonética**, e não há nenhuma no horizonte sem alinhamento forçado.
- **os clips são dois actores americanos a declamar duas frases.** Não há fala espontânea,
  nem português, nem uma pessoa a falar à distância a que usa isto. É o buraco maior, e o
  que o tapa está no fim deste ficheiro: 3-5 clips do próprio utilizador em `clips/user/`.

Armadilha conhecida no WSL: `mediapipe` puxa `opencv-python`, que precisa de `libGL.so.1`.
O `requirements.txt` fixa a variante `-headless` justamente por isso.

**Antes de qualquer commit que toque na cadeia da boca**: `node regress.js` e
`node verify-bancada.js --com-v3`. O primeiro compara com `goldens.json` bit a bit — se a
v1 ou a v2 mudarem um dígito, o toggle não era neutro e a alteração está errada, seja o
que for que as métricas digam. O `goldens.json` **não se recaptura**: a promessa dele é
ser anterior às features novas e continuar verde.

## Guião do A/B ao vivo

A bancada não decide. Isto decide.

No **studio**, painel `sensibilidade`: o select `fala` comuta `v1` ↔ `v3` ao vivo, sem
recarregar. Tecla `d` liga a linha de debug — na v3 mostra `V3`, `ap` (abertura crua,
antes da oclusão) e `oc` (oclusão). É o par que separa sinal de pose: **se a boca não abre
com o `ap` alto, quem a está a fechar é a oclusão**, e isso é um parâmetro, não um bug do
tracker.

Alternar v1↔v3 **a meio de cada exercício**, não entre exercícios — a memória para
diferenças pequenas é curta.

- **(a) fala corrida, 20 s.** Falar normal, do que calhar. A boca acompanha ou vai atrás?
- **(b) bilabiais.** "um bom pombo bebe", "pá-pé-pó". **Tem de fechar** em cada M/B/P. Se
  não fechar, ver o `oc` — se ele sobe e a boca não fecha, é ganho a menos; se não sobe, o
  tracker não está a dar o sinal.
- **(c) vogais sustentadas.** "aaaaa", "ooooo", 5 s cada. A boca fica parada ou treme?
- **(d) fala baixinha**, quase a murmurar — com a checkbox `auto range` desligada e depois
  ligada. É o único exercício em que o auto range pode ganhar; na bancada perde em 11 dos
  12 clips, portanto se não ganhar claramente aqui, fica desligado para sempre.
- **(e) falar a sorrir.** O "eee" continua a ler-se, mas o sorriso não pode roubar altura
  às vogais nem manter a boca aberta.
- **(f) silêncio, 10 s.** Cara parada, boca fechada. Zero flicker — nem um tremor.

Reportar em palavras, não em números: **boca presa** (abre menos do que devia), **atraso**,
**tremor**, **aberturas fantasma** (abre sem ninguém falar). Em qual dos exercícios, e em
qual das versões.

Se a v3 ganhar: promove-se a omissão numa alteração separada, e o select fica para trás.
Se perder, ou empatar, fica onde está — atrás do select. Empate não promove.

## Guião do A/B do áudio

Independente do anterior: o slider `áudio (mistura mic)` funciona em qualquer das cadeias.
Pôr em **0.7**, aceitar o microfone (só é pedido quando o slider sai do zero), e comparar
**0 vs 0.7 vs 1** dentro de cada exercício. No debug (`d`) aparece `+A` e `au`, o nível
depois do gate.

- **(a) fala corrida, 20 s.** O exercício que decide. O ritmo fica mais colado às sílabas?
  Se ficar *atrasado*, é o release de 90 ms (`RIG_AUDIO.relMs`) e diz-se.
- **(b) "pá-pé-pó", "um bom pombo bebe".** Tem de continuar a fechar. Na bancada fecha ao
  nível do vídeo, mas é aqui que o veto da oclusão se vê ou não se vê.
- **(c) silêncio com o ruído de fundo da sala, 10 s.** Boca quieta, `au` a 0.00.
- **(d) falar baixinho.** Onde o tecto adaptativo devia ganhar ao vídeo sozinho.
- **(e) assobiar e bater palmas.** O assobio contínuo é um tom estacionário e **não deve**
  abrir a boca; as palmas são transientes com muita energia e **passam o gate** — espera
  uma abertura curta por palma. É a consequência de um detector de energia não saber o que
  é voz, não um defeito da implementação. Reportar o que de facto acontece.

Reportar em palavras: **atraso**, **tremor**, **aberturas fantasma**, **boca presa** — em
qual exercício e em que posição do slider.

## Guião de A/B dos visemes por áudio e da calibração de máximo

Os dois guiões completos estão no `README.md` da raiz, nas secções respectivas. Em duas
linhas, porque é o que se esquece:

- **`áudio nas vogais`** — "ooo/eee/aaa" alternados a 0 vs 0.7 (a forma tem de ficar
  nítida) e depois fala normal (não pode fazer caretas). No debug, `fo R.. S..`.
- **`calibrar máximo`** — calibrar, falar normal e baixinho, limpar, repetir. No debug,
  ` · span 0.31/0.07`. A direcção do efeito depende do curso da boca de quem calibra:
  não há um "melhor" à partida.

Depois disto: 3-5 clips do próprio utilizador a falar português (30-60 s, luz normal, à
distância a que usa isto de verdade) entram em `clips/user/` e ficam **holdout
permanente** — nunca entram em nenhum grid-search. É o que falta à bancada, e sabe-se.
