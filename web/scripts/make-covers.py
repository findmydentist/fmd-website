"""Demo cover pictures for the demo dentists' profiles: calm, abstract "clinic light" banners (soft blurred lights over
deep blues), one per dentist, seeded by their id so each is its own and re-running gives the same pictures.
Decorative only, not photos of real clinics.

  python3 web/scripts/make-covers.py            → web/public/img/covers/<id>.webp (1500 × 500)
"""
import hashlib, os, random, re, sys
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.dirname(HERE)
OUT = os.path.join(WEB, "public/img/covers")
W, H = 1500, 500
# base gradients (left → right) and light colours, all within the site's blues, with a warm or mint accent here and there
PALETTES = [
    ((6, 14, 34), (14, 42, 86), [(56, 189, 248), (96, 165, 250), (186, 230, 253)]),
    ((8, 12, 30), (30, 27, 75), [(129, 140, 248), (56, 189, 248), (224, 231, 255)]),
    ((4, 20, 32), (8, 56, 76), [(34, 211, 238), (125, 211, 252), (165, 243, 252)]),
    ((10, 14, 28), (40, 32, 64), [(147, 197, 253), (196, 181, 253), (253, 230, 138)]),
    ((6, 16, 30), (12, 48, 66), [(56, 189, 248), (110, 231, 183), (209, 250, 229)]),
    ((8, 10, 24), (24, 44, 90), [(59, 130, 246), (147, 197, 253), (254, 215, 170)]),
]

def ids():
    src = open(os.path.join(WEB, "src/sample/providers.ts")).read()
    return re.findall(r'\{ id: "([a-z-]+)", name: "Dr\.', src)

def cover(seed: str) -> Image.Image:
    rnd = random.Random(int(hashlib.sha1(seed.encode()).hexdigest(), 16))
    a, b, lights = PALETTES[rnd.randrange(len(PALETTES))]
    img = Image.new("RGB", (W, H))
    px = img.load()
    tilt = rnd.uniform(-0.25, 0.25)
    for x in range(W):
        for y in range(0, H, 1):
            t = min(1, max(0, x / W + tilt * (y / H - 0.5)))
            px[x, y] = tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))
    # soft lights: a few large glows and many small bokeh discs
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    for _ in range(4):
        r = rnd.randint(160, 320)
        cx, cy = rnd.randint(0, W), rnd.randint(-60, H + 60)
        c = rnd.choice(lights)
        g.ellipse((cx - r, cy - r, cx + r, cy + r), fill=c + (rnd.randint(40, 70),))
    glow = glow.filter(ImageFilter.GaussianBlur(90))
    bokeh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    k = ImageDraw.Draw(bokeh)
    for _ in range(rnd.randint(26, 40)):
        r = rnd.randint(8, 46)
        cx, cy = rnd.randint(0, W), rnd.randint(0, H)
        c = rnd.choice(lights)
        k.ellipse((cx - r, cy - r, cx + r, cy + r), fill=c + (rnd.randint(28, 90),))
    bokeh = bokeh.filter(ImageFilter.GaussianBlur(rnd.uniform(5, 9)))
    out = Image.alpha_composite(img.convert("RGBA"), glow)
    out = Image.alpha_composite(out, bokeh)
    # a gentle darkening towards the bottom, where the profile photo and name sit
    shade = Image.new("L", (1, H))
    for y in range(H):
        shade.putpixel((0, y), int(110 * max(0, (y / H - 0.45) / 0.55) ** 1.4))
    out = Image.composite(Image.new("RGBA", (W, H), (4, 6, 14, 255)), out, shade.resize((W, H)))
    return out.convert("RGB")

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for i in (sys.argv[1:] or ids()):
        cover(i).save(os.path.join(OUT, f"{i}.webp"), "WEBP", quality=82, method=6)
        print("wrote", f"img/covers/{i}.webp")
