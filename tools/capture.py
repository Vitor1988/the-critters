#!/usr/bin/env python3
"""Video -> trace JSON pelo MediaPipe Face Landmarker.

Corre o MESMO modelo e as MESMAS opcoes que as paginas rigged/studio carregam da CDN
(face_landmarker float16/1, runningMode VIDEO, numFaces 1, blendshapes ligados). Um
trace capturado com outra versao ou outro modo nao representa producao e nao serve
para afinar nada.

Saida por clip, em tools/traces/<clip>.json:

  {clip, fps, w, h, bsNames[52], lmIdx[19],
   frames: [{t, bs: [52 floats], lm: [[x,y] x19]}],
   audio: {hz: 100, envDb: [...], bandas: [[7 floats] x N], bandasHz: [...]}}

Os landmarks vao so nos 19 indices que a cadeia le — o replay recompoe o array de 478
com (0.5,0.5) no resto, que e exactamente o que a cadeia ignora.

  python3 tools/capture.py                 # todos os clips ainda sem trace
  python3 tools/capture.py --forcar        # recaptura tudo
  python3 tools/capture.py --frames 30 X   # so os primeiros 30 frames de um clip (gate T0)
  python3 tools/capture.py --so-audio      # so o bloco `audio` dos traces que ja existem

O `--so-audio` existe porque as bandas chegaram depois dos traces: recalcula o audio
dos clips e reescreve-o nos traces sem tocar nos landmarks — nao precisa do mediapipe
(que e a unica dependencia pesada aqui) e nao arrisca um tracker de outra versao a
contaminar frames ja capturados. O `envDb` sai do mesmo codigo de sempre, byte a byte.
"""
import argparse
import json
import os
import subprocess
import sys
import urllib.request

import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
CLIPS = os.path.join(AQUI, "clips")
TRACES = os.path.join(AQUI, "traces")
MODELO = os.path.join(AQUI, "models", "face_landmarker.task")
MODELO_URL = ("https://storage.googleapis.com/mediapipe-models/face_landmarker/"
              "face_landmarker/float16/1/face_landmarker.task")

# os 19 landmarks que processLandmarks le, por ordem fixa (o replay depende dela)
LM_IDX = [10, 152, 33, 133, 159, 145, 362, 263, 386, 374, 234, 454, 1, 13, 14, 61, 291, 17, 468]

AUDIO_HZ = 100          # 10 ms por amostra do envelope
AUDIO_SR = 16000

# Bandas de frequencia da forma da boca (referencia: wawa-lipsync). Nao sao formantes
# nem pretendem ser: sao sete baldes grosseiros de onde a energia esta, e a derivacao
# no engine usa RACIOS entre eles — o F2 de cada pessoa cai onde cair, o que se mede e
# se a energia esta em baixo (bico, "ooo") ou em cima (fenda, "eee").
BANDAS_HZ = [50, 200, 400, 800, 1500, 2500, 4000, 8000]
BANDA_WIN = 512         # 32 ms de janela (a AnalyserNode do browser usa 1024 @48k = 21 ms)


def garante_modelo():
    if os.path.exists(MODELO):
        return
    os.makedirs(os.path.dirname(MODELO), exist_ok=True)
    print("a descarregar o modelo face_landmarker...", flush=True)
    urllib.request.urlretrieve(MODELO_URL, MODELO)


def pcm(caminho):
    """audio do clip em mono 16 kHz, float -1..1."""
    proc = subprocess.run(
        ["ffmpeg", "-nostdin", "-loglevel", "error", "-i", caminho,
         "-vn", "-ac", "1", "-ar", str(AUDIO_SR), "-f", "s16le", "-"],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    return np.frombuffer(proc.stdout, dtype="<i2").astype(np.float32) / 32768.0


def envelope(x):
    """log-RMS por 10 ms — o mesmo calculo de sempre, agora sobre o PCM ja lido."""
    hop = AUDIO_SR // AUDIO_HZ
    n = len(x) // hop
    if n == 0:
        return []
    blocos = x[:n * hop].reshape(n, hop)
    rms = np.sqrt((blocos ** 2).mean(axis=1) + 1e-12)
    return [round(float(v), 3) for v in 20.0 * np.log10(rms)]


def bandas(x):
    """log-energia (dB) das 7 bandas, a mesma cadencia do envelope.

    Janela de Hann de 32 ms com passo de 10 ms — sobreposicao, portanto, tal como no
    browser (a AnalyserNode tambem devolve o espectro da sua ultima janela a cada
    leitura). O que importa para a derivacao sao diferencas entre bandas na MESMA
    janela, e essas nao dependem do comprimento dela.
    """
    hop = AUDIO_SR // AUDIO_HZ
    n = len(x) // hop
    if n == 0:
        return []
    janela = np.hanning(BANDA_WIN).astype(np.float32)
    pad = np.pad(x, (0, BANDA_WIN), mode="constant")
    idx = np.arange(BANDA_WIN)[None, :] + (np.arange(n) * hop)[:, None]
    quadros = pad[idx] * janela
    esp = np.abs(np.fft.rfft(quadros, axis=1)) ** 2
    freqs = np.fft.rfftfreq(BANDA_WIN, 1.0 / AUDIO_SR)
    out = np.zeros((n, len(BANDAS_HZ) - 1), dtype=np.float64)
    for b in range(len(BANDAS_HZ) - 1):
        sel = (freqs >= BANDAS_HZ[b]) & (freqs < BANDAS_HZ[b + 1])
        # media e nao soma: bandas largas tem mais bins e ficariam altas so por isso
        out[:, b] = 10.0 * np.log10(esp[:, sel].mean(axis=1) + 1e-12)
    return [[round(float(v), 2) for v in linha] for linha in out]


def bloco_audio(caminho):
    x = pcm(caminho)
    return {"hz": AUDIO_HZ, "envDb": envelope(x),
            "bandasHz": BANDAS_HZ, "bandas": bandas(x)}


def captura(caminho, limite=None):
    # importado aqui e nao no topo: o `--so-audio` so precisa de numpy + ffmpeg, e
    # exigir-lhe o mediapipe instalado era pedir 400 MB para calcular um espectro
    import cv2
    import mediapipe as mp
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision as mp_vision

    cap = cv2.VideoCapture(caminho)
    if not cap.isOpened():
        raise RuntimeError("nao abriu: " + caminho)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    opts = mp_vision.FaceLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=MODELO),
        running_mode=mp_vision.RunningMode.VIDEO,
        num_faces=1,
        output_face_blendshapes=True)

    frames, bs_names = [], None
    perdidos = 0
    with mp_vision.FaceLandmarker.create_from_options(opts) as lm:
        i = 0
        ultimo_t = -1
        while True:
            ok, quadro = cap.read()
            if not ok or (limite and i >= limite):
                break
            # o MediaPipe exige timestamps ms inteiros e estritamente crescentes
            t = int(round(i * 1000.0 / fps))
            if t <= ultimo_t:
                t = ultimo_t + 1
            ultimo_t = t
            rgb = cv2.cvtColor(quadro, cv2.COLOR_BGR2RGB)
            img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            r = lm.detect_for_video(img, t)
            if not r.face_landmarks:
                perdidos += 1
                i += 1
                continue
            if bs_names is None and r.face_blendshapes:
                bs_names = [c.category_name for c in r.face_blendshapes[0]]
            pts = r.face_landmarks[0]
            frames.append({
                "t": t,
                "bs": [round(float(c.score), 6) for c in r.face_blendshapes[0]],
                "lm": [[round(float(pts[k].x), 6), round(float(pts[k].y), 6)] for k in LM_IDX],
            })
            i += 1
    cap.release()
    return {"fps": fps, "w": w, "h": h, "bsNames": bs_names, "lmIdx": LM_IDX,
            "frames": frames, "perdidos": perdidos, "lidos": i}


def sanidade(tr):
    """avisos por clip: sem dinamica de queixo nao ha nada para medir."""
    nomes = tr["bsNames"]
    ij = nomes.index("jawOpen")
    jaw = np.array([f["bs"][ij] for f in tr["frames"]])
    lm = np.array([f["lm"] for f in tr["frames"]])
    gap = np.abs(lm[:, 14, 1] - lm[:, 13, 1])          # 13/14 = labios interiores
    faceh = np.abs(lm[:, 1, 1] - lm[:, 0, 1])          # 10 -> 152
    razao = gap / np.maximum(faceh, 1e-6)
    r = float(np.corrcoef(razao, jaw)[0, 1]) if len(jaw) > 3 else 0.0
    return {
        "maxJaw": float(jaw.max()), "p10Jaw": float(np.percentile(jaw, 10)),
        "corrLipJaw": r,
        "nan": bool(np.isnan(jaw).any() or np.isnan(lm).any()),
        "ok": bool(jaw.max() > 0.10 and np.percentile(jaw, 10) < 0.06 and r > 0.6),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("clip", nargs="?", help="um clip so (nome sem .mp4)")
    ap.add_argument("--frames", type=int, default=None, help="limite de frames (gate T0)")
    ap.add_argument("--forcar", action="store_true")
    ap.add_argument("--so-audio", action="store_true",
                    help="so recalcula o bloco `audio` dos traces que ja existem")
    args = ap.parse_args()

    if not args.so_audio:
        garante_modelo()
    os.makedirs(TRACES, exist_ok=True)

    alvos = []
    for sub in ("ravdess", "user"):
        d = os.path.join(CLIPS, sub)
        if not os.path.isdir(d):
            continue
        for f in sorted(os.listdir(d)):
            if f.endswith(".mp4"):
                nome = f[:-4]
                if args.clip and nome != args.clip:
                    continue
                alvos.append((sub, nome, os.path.join(d, f)))
    if not alvos:
        print("sem clips — correr tools/fetch-datasets.sh primeiro")
        return 1

    if args.so_audio:
        n = 0
        for sub, nome, caminho in alvos:
            destino = os.path.join(TRACES, nome + ".json")
            if not os.path.exists(destino):
                continue
            with open(destino) as fh:
                tr = json.load(fh)
            antigo = tr.get("audio", {}).get("envDb")
            tr["audio"] = bloco_audio(caminho)
            # o envelope tem de sair identico ao que ja estava: se mudar, os numeros
            # todos da bancada mudavam por baixo e ninguem dava por isso
            if antigo is not None and antigo != tr["audio"]["envDb"]:
                print("%-24s ENVELOPE MUDOU — abortado" % nome)
                return 1
            with open(destino, "w") as fh:
                json.dump(tr, fh, separators=(",", ":"))
            print("%-24s env %d  bandas %dx%d" % (nome, len(tr["audio"]["envDb"]),
                  len(tr["audio"]["bandas"]), len(BANDAS_HZ) - 1))
            n += 1
        print("%d trace(s) com audio actualizado" % n)
        return 0

    mau = 0
    for sub, nome, caminho in alvos:
        destino = os.path.join(TRACES, nome + ".json")
        if os.path.exists(destino) and not args.forcar and not args.frames:
            continue
        tr = captura(caminho, args.frames)
        tr["clip"] = nome
        tr["conjunto"] = sub
        tr["audio"] = bloco_audio(caminho)
        s = sanidade(tr)
        esperado = tr["lidos"]
        print("%-24s %3d/%-3d frames  maxJaw %.3f  p10 %.3f  corr %.2f  %s%s" % (
            nome, len(tr["frames"]), esperado, s["maxJaw"], s["p10Jaw"], s["corrLipJaw"],
            "ok" if s["ok"] else "SUSPEITO", "  NaN!" if s["nan"] else ""))
        if s["nan"] or not s["ok"]:
            mau += 1
        if args.frames:            # gate T0: nao grava, so mostra
            print("   bsNames: %d  (1o: %s)  lm: %d indices" % (
                len(tr["bsNames"]), tr["bsNames"][0], len(tr["lmIdx"])))
            continue
        tr["sanidade"] = s
        with open(destino, "w") as fh:
            json.dump(tr, fh, separators=(",", ":"))
    if mau:
        print("\n%d clip(s) suspeito(s) — ver acima" % mau)
    return 0


if __name__ == "__main__":
    sys.exit(main())
