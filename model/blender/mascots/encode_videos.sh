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
# The glass tooth: 720 px (its box is ~280×200 css px), CRF 30: a full turn of see-through glass changes every pixel,
# alpha included (CRF 20 is 12 MB for the same look; 30 measures SSIM 0.992, 36 starts to soften the glints).
# FMD AI's mascot (assistant-<mood>, AssistantMascot): ASSISTANT=1 renders from public/models/assistant.glb, 576×768
# (its box is 96×128 css px).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/../../../web/public/models/videos"
FRAMES="$(mktemp -d)"
trap 'rm -rf "$FRAMES"' EXIT
mkdir -p "$OUT"
names=("$@")
[ ${#names[@]} -eq 0 ] && names=(guide guide-left laptop reading scholar vault butler pin heart tooth
  assistant-idle assistant-listening assistant-thinking assistant-explaining)

for n in "${names[@]}"; do
  env=() crf=18
  case $n in
    tooth) env=(SIZE=720) crf=30 ;;
    assistant-*) env=(ASSISTANT=1 SIZE=768) ;;
  esac
  env "${env[@]}" VIDEO=1 GPU=1 ONLY="$n" FRAMES="$FRAMES" node "$HERE/render_stills.cjs"
  for pass in 1 2; do
    out=(-f null /dev/null)
    [ $pass = 2 ] && out=("$OUT/$n.webm")
    ffmpeg -hide_banner -loglevel error -y -framerate 30 -i "$FRAMES/$n/%04d.png" \
      -c:v libvpx-vp9 -pix_fmt yuva420p -crf $crf -b:v 0 -pass $pass -passlogfile "$FRAMES/vp9" \
      -deadline good -cpu-used 1 -row-mt 1 -auto-alt-ref 1 -lag-in-frames 25 -g 9999 -an "${out[@]}"
  done
  rm -rf "${FRAMES:?}/$n"
  echo "wrote $n.webm ($(du -h "$OUT/$n.webm" | cut -f1))"
done
