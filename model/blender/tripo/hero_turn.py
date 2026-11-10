"""Crop and encode render_hero_turn.cjs's frames for the site: every frame cropped to the area the mascot covers at any
angle (the rest of the 1.7 : 1 canvas is empty), WebP q92 with lossless-quality alpha → web/public/models/hero-turn/NNN.webp.

    python3 model/blender/tripo/hero_turn.py FRAMES_DIR

q92: PSNR ≈ 47 dB over the hero's navy against the lossless frames (visually identical, eyes and brows included),
~60 KB a frame. Prints the crop as fractions of the canvas: copy it into CROP in web/src/components/hero/HeroTurn.tsx.
"""
import glob
import os
import sys

from PIL import Image

frames = sorted(glob.glob(os.path.join(sys.argv[1], "*.png")))
out = os.path.join(os.path.dirname(__file__), "../../../web/public/models/hero-turn")
os.makedirs(out, exist_ok=True)
W, H = Image.open(frames[0]).size
box = None
for f in frames:
    b = Image.open(f).getchannel("A").getbbox()
    box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
pad = 4  # a few clear pixels around the silhouette: no clipped anti-aliased edge
box = (max(0, box[0] - pad), max(0, box[1] - pad), min(W, box[2] + pad), min(H, box[3] + pad))
total = 0
for i, f in enumerate(frames):
    dst = os.path.join(out, f"{i:03d}.webp")
    Image.open(f).crop(box).save(dst, "WEBP", quality=92, alpha_quality=100, method=6)
    total += os.path.getsize(dst)
print(f"{len(frames)} frames, {box[2] - box[0]}x{box[3] - box[1]}, {total / 1e6:.1f} MB")
print(f"CROP = {{ l: {box[0]} / {W}, t: {box[1]} / {H}, w: {box[2] - box[0]} / {W}, h: {box[3] - box[1]} / {H} }}")
