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
- **boca abre** — crossfade da boca fechada para boca aberta paramétrica
- **head pose** — yaw/pitch/roll controlam o lean + rotação (a mesma física jelly)
- **gaze** — pupilas seguem o olhar (iris tracking)
- **calibração** — primeiros 50 frames com cara neutral; botão recalibrate

Em modo rig os traits incompatíveis são filtrados automaticamente (sem olhos closed/dead/wink).

**Nota**: precisa de ser servido por http(s) (getUserMedia não funciona em file://):
```
npx serve .        # ou python3 -m http.server
```
Para usar como webcam em calls: OBS com Window Capture → Virtual Camera, ou partilha de janela/tab.

## Deploy

É um ficheiro estático — abrir `index.html` ou servir com qualquer static server.
