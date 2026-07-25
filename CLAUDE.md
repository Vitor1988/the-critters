# the critters

Avatares generativos em canvas 2D + versão animada pela câmara. Sem framework, sem build
step: os ficheiros são o artefacto.

## Stack

- HTML + canvas 2D puro. Zero dependências no gerativo.
- MediaPipe Face Landmarker (`@mediapipe/tasks-vision`, WASM da CDN) só nas páginas
  rigged/studio. Corre no browser — nada da cara ou da voz sai da máquina.
- nginx:alpine a servir estático. Container `the-critters`, porta **8092** (https na
  **8443** via `tailscale serve`), `--memory=32m`,
  sem volumes (as preferências vivem no `localStorage` do browser).

## Ficheiros

| Ficheiro | Papel |
|---|---|
| `engine.js` | geração dos critters, `drawPath`, e o rig (`buildRig`/`applyRig`/`processLandmarks`/`drawModel`) |
| `rig-page.js` | canvas, câmara, loop, favoritos e gravação — comum ao rigged e ao studio |
| `index.html` | gerativo, sem câmara |
| `rigged.html` / `studio.html` | avatar live; o studio acrescenta o painel de afinação |
| `_rigtest.html` | folha de contacto do rig, para iterar sem câmara (ferramenta de dev) |

## Invariantes — partir isto parte o projeto

- **O mesmo ID dá sempre o mesmo critter.** O ID mapeia os traits por *pesos acumulados*
  (`pickW`), portanto mexer numa tabela de pesos muda o resultado de **todos** os IDs já
  gerados. Traits novos entram fora dos pesos (como as 8 paletas novas e a boca `rigged`):
  aparecem no studio, nunca no sorteio.
- **O rig nunca identifica peças pela cor.** As peças da boca são marcadas no `buildModel`
  (`part: lip|hole|teeth|tongue|throat|rigMouth`). A paleta noir tem `teeth === line`, e a
  versão antiga tratava os dentes como buraco da boca.
- **A boca não sai da cara por construção**, não por um limite fixo: os budgets de abertura
  são medidos na bind pose, no `buildRig`, a partir do espaço real entre nariz e queixo.
- **A câmara exige contexto seguro** — `https`, `localhost` ou `file://`. Por http num IP
  o browser nem pede autorização, e o rig cai em modo rato. Daí o `tailscale serve` na
  8443: **`https://vitors-mac-mini.taile6a561.ts.net:8443/` é o URL a usar**, o
  `http://100.104.52.12:8092` só serve para o gerativo.

## Testar sem câmara

`_rigtest.html` desenha uma grelha de critters × poses, com as linhas do nariz e do queixo:

```
_rigtest.html?set=mouth|head|visemes&cw=470&ids=<id,id,…>[&mouth=11][&visemes=1]
```

Servir por http (`python3 -m http.server`) e abrir. Para verificação numérica do rig
(limites, colapso da boca fechada, NaN), correr a engine em node: ela não depende do DOM,
só o `drawPath` é que precisa de um contexto.

## Deploy

```bash
ssh vmini@100.104.52.12 'cd ~/projetos/the-critters && git pull && /usr/local/bin/docker build -t the-critters .'
ssh vmini@100.104.52.12 '/usr/local/bin/docker rm -f the-critters; \
  /usr/local/bin/docker run -d --name the-critters --restart=always -p 8092:80 --memory=32m the-critters'
```

Página na wiki: `Wiki/public/projetos/the-critters.html` — atualizar se mudar porta,
estado ou âmbito.

## Convenções

- Documentação a sério no `README.md` (o rig está lá explicado com os números que o
  justificam). Este ficheiro é só stack + invariantes.
- Mensagens de commit em português, minúsculas, sem acentos.
