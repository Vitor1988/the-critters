#!/usr/bin/env bash
# Traz os clips da bancada: RAVDESS (Zenodo 1188976), actores 01 e 02, e normaliza-os.
#
# Porque estes 16: so modalidade 01-* (full-AV — os 02-* nao tem audio, e a metrica
# vive do envelope); emocoes neutral/calm/happy/angry (as que dao dinamica de fala sem
# choro nem grito); 2 de intensidade forte por actor; as duas frases. 8 por actor.
#
# A normalizacao NAO mexe no fps (29.97 nativo) nem espelha: o scaleX(-1) do live e
# CSS, o tracker ve a imagem tal como ela vem da camara.
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAW="$AQUI/clips/raw"
OUT="$AQUI/clips"
ZEN="https://zenodo.org/api/records/1188976/files"

mkdir -p "$RAW" "$OUT/ravdess" "$OUT/user"

# 8 por actor: emocao-intensidade-frase-repeticao (a 7a posicao, o actor, entra no ciclo)
CLIPS=(
  "01-01-01-01-01-01"  # neutral   normal  frase1
  "01-01-01-01-02-01"  # neutral   normal  frase2
  "01-01-02-01-01-01"  # calm      normal  frase1
  "01-01-02-01-02-01"  # calm      normal  frase2
  "01-01-03-01-01-01"  # happy     normal  frase1
  "01-01-03-02-02-01"  # happy     FORTE   frase2
  "01-01-05-01-02-01"  # angry     normal  frase2
  "01-01-05-02-01-01"  # angry     FORTE   frase1
)

for A in 01 02; do
  ZIP="$RAW/Actor_$A.zip"
  if [ ! -f "$ZIP" ]; then
    echo "a descarregar Actor_$A (~550MB)..."
    curl -L --retry 3 --retry-delay 2 -o "$ZIP" "$ZEN/Video_Speech_Actor_$A.zip/content"
  fi
  for C in "${CLIPS[@]}"; do
    NOME="$C-$A"
    DEST="$OUT/ravdess/$NOME.mp4"
    [ -f "$DEST" ] && continue
    unzip -o -j -q "$ZIP" "Actor_$A/$NOME.mp4" -d "$RAW"
    # -2 mantem a largura par (exigencia do h264); fps e audio intactos
    ffmpeg -nostdin -loglevel error -y -i "$RAW/$NOME.mp4" \
      -vf "scale=-2:480" -c:v libx264 -crf 20 -preset veryfast -c:a copy "$DEST"
    rm -f "$RAW/$NOME.mp4"
    echo "  $NOME"
  done
done

N=$(ls -1 "$OUT/ravdess"/*.mp4 2>/dev/null | wc -l)
echo "$N clips normalizados em $OUT/ravdess"
echo "(clips do proprio utilizador vao para $OUT/user — holdout permanente)"
