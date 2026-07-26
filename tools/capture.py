#!/usr/bin/env python3
"""Video -> trace JSON pelo MediaPipe Face Landmarker.

Corre o MESMO modelo e as MESMAS opcoes que as paginas rigged/studio carregam da CDN
(face_landmarker float16/1, runningMode VIDEO, numFaces 1, blendshapes ligados). Um
trace capturado com outra versao ou outro modo nao representa producao e nao serve
para afinar nada.

Saida por clip, em tools/traces/<clip>.json:

  {clip, fps, w, h, bsNames[52], lmIdx[19],
   frames: [{t, bs: [52 floats], lm: [[x,y] x19]}],
   audio: {hz: 100, envDb: [...]}}

Os landmarks vao so nos 19 indices que a cadeia le — o replay recompoe o array de 478
com (0.5,0.5) no resto, que e exactamente o que a cadeia ignora.

  python3 tools/capture.py                 # todos os clips ainda sem trace
  python3 tools/capture.py --forcar        # recaptura tudo
  python3 tools/capture.py --frames 30 X   # so os primeiros 30 frames de um clip (gate T0)
"""
import argparse
import json
import os
import subprocess
import sys
import urllib.request

import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision

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


def garante_modelo():
    if os.path.exists(MODELO):
        return
    os.makedirs(os.path.dirname(MODELO), exist_ok=True)
    print("a descarregar o modelo face_landmarker...", flush=True)
    urllib.request.urlretrieve(MODELO_URL, MODELO)


def envelope(caminho):
    """log-RMS por 10 ms do audio do clip, mono 16 kHz."""
    proc = subprocess.run(
        ["ffmpeg", "-nostdin", "-loglevel", "error", "-i", caminho,
         "-vn", "-ac", "1", "-ar", str(AUDIO_SR), "-f", "s16le", "-"],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    x = np.frombuffer(proc.stdout, dtype="<i2").astype(np.float32) / 32768.0
    hop = AUDIO_SR // AUDIO_HZ
    n = len(x) // hop
    if n == 0:
        return []
    blocos = x[:n * hop].reshape(n, hop)
    rms = np.sqrt((blocos ** 2).mean(axis=1) + 1e-12)
    return [round(float(v), 3) for v in 20.0 * np.log10(rms)]


def captura(caminho, limite=None):
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
    args = ap.parse_args()

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

    mau = 0
    for sub, nome, caminho in alvos:
        destino = os.path.join(TRACES, nome + ".json")
        if os.path.exists(destino) and not args.forcar and not args.frames:
            continue
        tr = captura(caminho, args.frames)
        tr["clip"] = nome
        tr["conjunto"] = sub
        tr["audio"] = {"hz": AUDIO_HZ, "envDb": envelope(caminho)}
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
