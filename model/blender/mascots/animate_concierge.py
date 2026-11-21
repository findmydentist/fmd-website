"""Usage: python3 model/blender/mascots/animate_concierge.py web/public/img/mascots/mascot-concierge-1024.webp <frames dir>
then encode as encode_videos.sh does (VP9 with alpha, CRF 24) → web/public/img/mascots/mascot-concierge-action.webm.

A short looping animation of mascot-concierge-1024.webp made only from that picture, for FMD Edge (the private
concierge): a gracious welcoming bow from the hips with a respectful nod, the open hand presenting the service bell, the
bell answering with a soft settling chime, a gold glint sweeping the brass and a few sparkles, one slow blink, breathing.
Soft 2D warps of the picture itself (the table and bell stay put while he moves) plus the drawn blink, glint and stars.
"""
import sys, math, os
import numpy as np
from PIL import Image
from scipy import ndimage

SRC, OUT = sys.argv[1], sys.argv[2]
FPS, L = 30, 7.0
img = np.asarray(Image.open(SRC).convert("RGBA")).astype(np.float32) / 255
H, W = img.shape[:2]
pm = img.copy(); pm[..., :3] *= pm[..., 3:4]  # premultiplied, so edges interpolate cleanly
rgb, al = img[..., :3], img[..., 3]
TAU = 2 * math.pi

def bump(t, at, width):
    u = ((t % L) - at) / width
    return math.sin(math.pi * u) ** 2 if 0 < u < 1 else 0.0
def smooth(v, a, b):
    x = np.clip((v - a) / (b - a), 0, 1); return x * x * (3 - 2 * x)
def sample(src, py, px):
    return np.stack([ndimage.map_coordinates(src[..., c], [py, px], order=1, mode="constant") for c in range(src.shape[-1])], -1)
def rotate_back(px, py, c, ang, w):
    ca, sa = math.cos(-ang), math.sin(-ang)
    dx, dy = px - c[0], py - c[1]
    rx, ry = c[0] + ca * dx - sa * dy, c[1] + sa * dx + ca * dy
    return px + w * (rx - px), py + w * (ry - py)

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)

# ---- what's what in the picture
sat = rgb.max(2) - rgb.min(2)
gold = ((rgb[..., 0] > rgb[..., 2] + 0.15) & (rgb[..., 1] > rgb[..., 2] + 0.05) & (sat > 0.18) & (al > 0.3) & (xx > 580) & (yy > 560)).astype(np.float32)
navy = ((rgb[..., 2] > rgb[..., 0] + 0.1) & (rgb.mean(2) < 0.4) & (al > 0.3) & (xx > 650) & (yy > 640)).astype(np.float32)
# the bell (brass dome and its navy base) above the table, as a soft mask
bell = np.maximum(gold, navy) * (xx > 696) * (xx < 862) * (yy > 568) * (yy < 698)
bell = ndimage.gaussian_filter(ndimage.binary_closing(bell > 0, iterations=6).astype(np.float32), 2)
BELL_PIVOT = (776.0, 692.0)
# the table and its stand: they never move with him
table = smooth(xx, 575, 600) * smooth(yy, 640, 662)
still = np.maximum(table, bell)
HIPS = (330.0, 770.0)
body_w = smooth(yy, 800, 700) * (1 - still)            # everything above the hips, not the table or bell
NECK = (420.0, 505.0)
head_w = smooth(yy, 545, 470) * (1 - still)
WRIST = (588.0, 602.0)
hand_w = (1 - smooth(((xx - 650) / 78) ** 2 + ((yy - 585) / 52) ** 2, 0.6, 1.5)) * smooth(xx, 560, 590) * (1 - still)

# ---- the eyes: skin painted in behind them, so they can close
EYES = [(394, 351, 36, 42), (567, 397, 31, 41)]
def ellipse(cx, cy, rx, ry):
    return ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2
skin = pm.copy()
for cx, cy, rx, ry in EYES:
    x0, x1, y0, y1 = int(cx - rx - 30), int(cx + rx + 30), int(cy - ry - 30), int(cy + ry + 30)
    hole = ellipse(cx, cy, rx + 10, ry + 10)[y0:y1, x0:x1] <= 1
    ring = (~hole) & (ellipse(cx, cy, rx + 10, ry + 10)[y0:y1, x0:x1] <= 1.6)
    patch = skin[y0:y1, x0:x1].copy()
    patch[hole] = patch[ring].mean(0)
    for _ in range(2500):
        avg = np.stack([ndimage.uniform_filter(patch[..., c], 3, mode="nearest") for c in range(4)], -1)
        patch[hole] = avg[hole]
    skin[y0:y1, x0:x1] = patch
eye_mask = np.zeros((H, W), np.float32)
for cx, cy, rx, ry in EYES:
    eye_mask = np.maximum(eye_mask, 1 - smooth(ellipse(cx, cy, rx + 6, ry + 6), 0.82, 1.0))
INK = np.array([0.13, 0.12, 0.2, 1.0], np.float32)

def with_eyes(src, openness):
    if openness > 0.999: return src
    m = eye_mask[..., None]
    out = skin * m + src * (1 - m)
    s = max(openness, 0.05)
    show = float(smooth(np.float32(openness), 0.05, 0.14))
    k = 1 - float(smooth(np.float32(openness), 0.04, 0.16))
    for cx, cy, rx, ry in EYES:
        pivot = cy + 0.3 * ry
        sy = pivot + (yy - pivot) / s
        if show > 0:
            eye = sample(src, sy, xx)
            em = (ndimage.map_coordinates(eye_mask, [sy, xx], order=1) * show * (np.abs(xx - cx) < rx + 12))[..., None]
            out = eye * em + out * (1 - em)
        if k > 0:
            u = (xx - cx) / (rx * 0.9)
            curve = cy + 0.28 * ry - 0.3 * ry * (1 - u ** 2)
            a = np.clip(3.2 - np.abs(yy - curve), 0, 1) * np.clip((1 - np.abs(u)) * 5, 0, 1) * k
            out = INK * a[..., None] + out * (1 - a[..., None])
    return out

# ---- the brass glint and the sparkles
brass = ndimage.gaussian_filter(gold, 1.0)
diag = (xx - 690) + 0.6 * (yy - 570)                    # the glint travels down-right across the brass
SPARKS = [(812, 546, 3.35, 17), (858, 590, 3.62, 12), (757, 522, 3.9, 14)]  # x, y, when, size
def star(cx, cy, size, a):
    """a soft four-point glint: two thin rays and a little glow, in warm white"""
    dx, dy = np.abs(xx - cx), np.abs(yy - cy)
    rays = np.exp(-(dx / (size * 0.09 + 0.6)) ** 2) * np.exp(-(dy / size) ** 2) + np.exp(-(dy / (size * 0.09 + 0.6)) ** 2) * np.exp(-(dx / size) ** 2)
    glow = np.exp(-((dx ** 2 + dy ** 2) / (size * 0.45) ** 2))
    return np.clip((rays + 0.6 * glow) * a, 0, 1)
WARM = np.array([1.0, 0.95, 0.82], np.float32)

def frame(t):
    breath = math.sin(TAU * t / 3.5)
    bow = math.radians(1.4) * bump(t, 0.2, 2.4)          # the welcoming bow
    nod = bump(t, 0.35, 2.2)
    present = math.radians(-6.0) * bump(t, 2.2, 1.6)     # the open hand lifts towards the bell
    u = (t % L) - 3.2                                    # the bell answers: a soft chime that settles
    chime = math.radians(1.3) * math.sin(TAU * u / 0.32) * math.exp(-u / 0.45) * min(1.0, u / 0.05) if 0 < u < 1.6 else 0.0
    tilt = math.radians(0.8) * math.sin(TAU * t / L)
    openness = 1 - min(1.0, 1.3 * bump(t, 5.3, 0.9))

    # breathing: the body (not the table) a touch taller and slimmer, from the feet
    sy, sx = 1 + 0.005 * breath * (1 - still), 1 - 0.0025 * breath * (1 - still)
    qx = 330 + (xx - 330) / sx
    qy = 915 + (yy - 915) / sy
    # the bow, from the hips
    bw = ndimage.map_coordinates(body_w, [qy, qx], order=1)
    qx, qy = rotate_back(qx, qy, HIPS, bow, bw)
    # the presenting hand
    hw = ndimage.map_coordinates(hand_w, [qy, qx], order=1)
    qx, qy = rotate_back(qx, qy, WRIST, present, hw)
    # the head: a respectful nod with the bow, a slow small tilt
    hd = ndimage.map_coordinates(head_w, [qy, qx], order=1)
    qx, qy = rotate_back(qx, qy, NECK, math.radians(1.2) * nod + tilt, hd)
    qy = qy - hd * 3.0 * nod
    # the bell rocks on its base
    bl = ndimage.map_coordinates(bell, [qy, qx], order=1)
    qx, qy = rotate_back(qx, qy, BELL_PIVOT, chime, bl)

    out = sample(with_eyes(pm, openness), qy, qx)
    # the glint across the brass (after the chime), screened on
    g = (t % L) - 3.25
    if 0 < g < 1.1:
        c = -60 + g / 1.1 * 420
        band = np.exp(-((diag - c) / 24) ** 2) * 0.6 * math.sin(math.pi * g / 1.1)
        gl = ndimage.map_coordinates(brass, [qy, qx], order=1) * band
        out[..., :3] = out[..., :3] + (WARM * out[..., 3:4] - out[..., :3]) * gl[..., None]
    # the sparkles, over everything
    for cx, cy, at, size in SPARKS:
        v = ((t % L) - at) / 0.9
        if 0 < v < 1:
            a = star(cx, cy, size * (0.6 + 0.4 * math.sin(math.pi * v)), math.sin(math.pi * v) ** 1.5)
            col = np.concatenate([WARM, [1.0]]).astype(np.float32)
            out = col * a[..., None] + out * (1 - a[..., None])
    a = out[..., 3:4]
    rgb_ = np.where(a > 1e-4, out[..., :3] / np.maximum(a, 1e-4), 0)
    return np.clip(np.concatenate([rgb_, a], -1) * 255 + 0.5, 0, 255).astype(np.uint8)

os.makedirs(OUT, exist_ok=True)
n = int(round(L * FPS))
only = [int(x) for x in sys.argv[3].split(",")] if len(sys.argv) > 3 else range(n)
for i in only:
    Image.fromarray(frame(i / FPS)).save(f"{OUT}/{i:04d}.png")
print("frames", len(list(only)))
