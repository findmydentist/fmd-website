"""Usage: python3 model/blender/mascots/animate_shield.py web/public/img/mascots/mascot-shield-1024.webp <frames dir>
then encode as encode_videos.sh does (VP9 with alpha, CRF 24) → web/public/img/mascots/mascot-shield-action.webm.

A short looping animation of mascot-shield-1024.webp made only from that picture: a soft 2D warp (head tilt about
the neck, hand pats on the chest, slow breathing and the faintest sway from the feet) plus a slow blink drawn over the eyes: calm, for the Trust section."""
import sys, math, os
import numpy as np
from PIL import Image
from scipy import ndimage

SRC, OUT = sys.argv[1], sys.argv[2]
FPS, L = 30, 6.0
img = np.asarray(Image.open(SRC).convert("RGBA")).astype(np.float32) / 255
H, W = img.shape[:2]
pm = img.copy(); pm[..., :3] *= pm[..., 3:4]  # premultiplied, so edges interpolate cleanly

TAU = 2 * math.pi
def bump(t, at, width):
    u = ((t % L) - at) / width
    return math.sin(math.pi * u) ** 2 if 0 < u < 1 else 0.0
def smooth(v, a, b):
    x = np.clip((v - a) / (b - a), 0, 1); return x * x * (3 - 2 * x)

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)

# ---- the eyes: skin painted in behind each, so they can close
EYES = [(456, 309, 40, 47), (639, 346, 35, 47)]  # centre x, y, radius x, y
def ellipse(cx, cy, rx, ry, grow=0.0):
    return ((xx - cx) / (rx + grow)) ** 2 + ((yy - cy) / (ry + grow)) ** 2
skin = pm.copy()
for cx, cy, rx, ry in EYES:
    # fill each eye's hole from the clean skin ring just outside it (harmonic fill, in a small patch)
    x0, x1, y0, y1 = int(cx - rx - 30), int(cx + rx + 30), int(cy - ry - 30), int(cy + ry + 30)
    e = ellipse(cx, cy, rx, ry)[y0:y1, x0:x1]
    hole = e <= ((rx + 10) / rx) ** 2 * 1.0
    ring = (~hole) & (ellipse(cx, cy, rx + 10, ry + 10)[y0:y1, x0:x1] <= 1.6)
    patch = skin[y0:y1, x0:x1].copy()
    patch[hole] = patch[ring].mean(0)
    for _ in range(2500):
        avg = np.stack([ndimage.uniform_filter(patch[..., c], 3, mode="nearest") for c in range(4)], -1)
        patch[hole] = avg[hole]
    skin[y0:y1, x0:x1] = patch
# the eyes themselves (soft-edged), and where the painted skin shows when they close
eye_mask = np.zeros((H, W), np.float32)
for cx, cy, rx, ry in EYES:
    eye_mask = np.maximum(eye_mask, 1 - smooth(ellipse(cx, cy, rx + 6, ry + 6), 0.82, 1.0))
LID = np.array([0.13, 0.12, 0.2, 1.0], np.float32)  # the brows' dark ink

def with_eyes(openness):
    """the picture with both eyes opened by `openness` (1 open … 0 shut, drawn as happy ^ arcs)"""
    if openness > 0.999: return pm
    m = eye_mask[..., None]
    out = skin * m + pm * (1 - m)  # eyes gone: skin behind
    s = max(openness, 0.05)
    show = float(smooth(np.float32(openness), 0.05, 0.14))  # the squashed eye fades out as it shuts
    for cx, cy, rx, ry in EYES:
        pivot = cy + 0.3 * ry  # eyes close down towards the lower lid
        sy = pivot + (yy - pivot) / s
        if show > 0:
            eye = np.stack([ndimage.map_coordinates(pm[..., c], [sy, xx], order=1, mode="constant") for c in range(4)], -1)
            em = ndimage.map_coordinates(eye_mask, [sy, xx], order=1, mode="constant")
            em = (em * show * (np.abs(xx - cx) < rx + 12))[..., None]
            out = eye * em + out * (1 - em)
        k = 1 - float(smooth(np.float32(openness), 0.04, 0.16))
        if k > 0:  # the shut eye: a soft upward arc, tapered at the ends
            u = (xx - cx) / (rx * 0.9)
            curve = cy + 0.28 * ry - 0.3 * ry * (1 - u ** 2)
            a = np.clip(3.4 - np.abs(yy - curve), 0, 1) * np.clip((1 - np.abs(u)) * 5, 0, 1) * k
            out = LID * a[..., None] + out * (1 - a[..., None])
    return out

# ---- the warps (each maps an output pixel to where it comes from)
HEAD_PIVOT = (545.0, 470.0)
head_w = smooth(yy, 505, 445)                       # 1 for the head, 0 below the collar
HAND = (518.0, 572.0)
hand_w = 1 - smooth(((xx - HAND[0]) / 82) ** 2 + ((yy - HAND[1]) / 72) ** 2, 0.55, 1.6)
FEET_Y = 980.0

def rotate_back(px, py, c, ang, w):
    """sample point for a rotation by `ang` about c, blended in by weight w"""
    ca, sa = math.cos(-ang), math.sin(-ang)
    dx, dy = px - c[0], py - c[1]
    rx, ry = c[0] + ca * dx - sa * dy, c[1] + sa * dx + ca * dy
    return px + w * (rx - px), py + w * (ry - py)

def frame(t):
    """calm and steady, for Trust: slow breathing, the faintest sway, a small head tilt, two soft pats, one slow blink"""
    breath = math.sin(TAU * t / 3.0)                     # two slow breaths a loop
    sway = math.radians(0.5) * math.sin(TAU * t / L)     # the whole figure, from the feet: barely there
    tilt = math.radians(1.5) * math.sin(TAU * t / L + 0.6)
    pats = 0.5 * (bump(t, 1.2, 0.7) + bump(t, 1.95, 0.7))
    openness = 1 - min(1.0, 1.3 * bump(t, 3.9, 0.85))
    # whole body, from the feet: breathing (a little taller and slimmer in, back out) and the sway
    sy = 1 + 0.006 * breath
    sx = 1 - 0.003 * breath
    cxb = 495.0
    vx, vy = rotate_back(xx, yy, (cxb, FEET_Y), sway, 1.0)
    qx = cxb + (vx - cxb) / sx
    qy = FEET_Y + (vy - FEET_Y) / sy
    # the hand: lifts gently off the chest and settles back, twice
    hw = ndimage.map_coordinates(hand_w, [qy, qx], order=1)
    rx_, ry_ = qx - hw * (2.0 * pats), qy - hw * (-8.0 * pats)
    # the head: a small, slow tilt, and the slightest nod with the pats
    hdw = ndimage.map_coordinates(head_w, [ry_, rx_], order=1)
    sx_, sy_ = rotate_back(rx_, ry_, HEAD_PIVOT, tilt, hdw)
    sy_ = sy_ - hdw * 1.5 * pats
    src = with_eyes(openness)
    out = np.stack([ndimage.map_coordinates(src[..., c], [sy_, sx_], order=1, mode="constant") for c in range(4)], -1)
    a = out[..., 3:4]
    rgb = np.where(a > 1e-4, out[..., :3] / np.maximum(a, 1e-4), 0)
    return np.clip(np.concatenate([rgb, a], -1) * 255 + 0.5, 0, 255).astype(np.uint8)

os.makedirs(OUT, exist_ok=True)
n = int(round(L * FPS))
only = [int(x) for x in sys.argv[3].split(",")] if len(sys.argv) > 3 else range(n)
for i in only:
    Image.fromarray(frame(i / FPS)).save(f"{OUT}/{i:04d}.png")
print("frames", len(list(only)))
