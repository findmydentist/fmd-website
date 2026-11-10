#!/usr/bin/env bash
# The section mascots as transparent looping videos for phones (MascotArt plays them there instead of live canvases):
# render_stills.cjs VIDEO=1 renders one exact loop of each motion as lossless PNG frames (1080 px, supersampled), then a
# two-pass VP9 with alpha (WebM) is encoded from them → web/public/models/videos/<name>.webm.
#
#   model/blender/mascots/encode_videos.sh                 every mascot
#   model/blender/mascots/encode_videos.sh vault reading   just those
#   PLAYWRIGHT=/path/to/playwright-core  as for render_stills.cjs
#
# CRF 18 two-pass: SSIM ≈ 0.994 against the lossless frames (visually identical) at ~2.5 MB per 12 s.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/../../../web/public/models/videos"
FRAMES="$(mktemp -d)"
trap 'rm -rf "$FRAMES"' EXIT
mkdir -p "$OUT"
names=("$@")
# not the glass tooth: it stays live on phones (a full turn of see-through glass is a 7+ MB video vs a 0.47 MB model)
[ ${#names[@]} -eq 0 ] && names=(guide guide-left laptop reading scholar vault butler pin heart)

for n in "${names[@]}"; do
  VIDEO=1 GPU=1 ONLY="$n" FRAMES="$FRAMES" node "$HERE/render_stills.cjs"
  for pass in 1 2; do
    out=(-f null /dev/null)
    [ $pass = 2 ] && out=("$OUT/$n.webm")
    ffmpeg -hide_banner -loglevel error -y -framerate 30 -i "$FRAMES/$n/%04d.png" \
      -c:v libvpx-vp9 -pix_fmt yuva420p -crf 18 -b:v 0 -pass $pass -passlogfile "$FRAMES/vp9" \
      -deadline good -cpu-used 1 -row-mt 1 -auto-alt-ref 1 -lag-in-frames 25 -g 9999 -an "${out[@]}"
  done
  rm -rf "${FRAMES:?}/$n"
  echo "wrote $n.webm ($(du -h "$OUT/$n.webm" | cut -f1))"
done
