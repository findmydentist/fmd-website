"""Demo reels for the demo dentists: short, silent, vertical (9 : 16) dental-tip clips, three tip cards over a slowly
zooming mascot picture, in the site's font and colours, marked "Demo reel". Also writes each reel's
captions (WebVTT) so the video player can show them.

  python3 web/scripts/make-reels.py [id …]   → web/public/reels/<id>.mp4, <id>.jpg (poster), <id>.vtt
Needs ffmpeg. The font is the site's Plus Jakarta Sans (scripts/fonts, OFL).
"""
import math, os, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.dirname(HERE)
OUT = os.path.join(WEB, "public/reels")
FONT = os.path.join(HERE, "fonts/PlusJakartaSans-latin.woff2")
W, H, FPS, CARD_S = 720, 1280, 30, 3.0

# id: (picture under web/public, two gradient colours, title, three tips)
REELS = {
    "brush-2min": ("img/mascots/mascot-guide-1024.webp", ((6, 24, 48), (14, 80, 120)), "Brushing, done right", ["Brush for two full minutes, twice a day", "Angle the bristles towards the gum line", "A soft brush and gentle circles are enough"]),
    "floss-daily": ("img/mascots/mascot-walk-512.webp", ((8, 20, 40), (20, 70, 110)), "Floss once a day", ["Brushing misses the gaps between teeth", "Curve the floss round each tooth, gently", "A little bleeding usually settles in 1–2 weeks"]),
    "aligner-wear": ("img/mascots/mascot-scholar-1024.webp", ((10, 18, 44), (30, 60, 130)), "Living with aligners", ["Wear them 20–22 hours a day", "Take them out to eat and drink anything but water", "Brush before you put them back in"]),
    "braces-food": ("img/mascots/mascot-pin-1024.webp", ((14, 14, 40), (52, 46, 120)), "Eating with braces", ["Skip hard and sticky foods for now", "Cut fruit and corn off the cob into small pieces", "Rinse after meals, then brush"]),
    "whitening-safe": ("img/mascots/mascot-shield-1024.webp", ((24, 14, 40), (90, 50, 110)), "Is whitening safe?", ["Done or guided by a dentist, yes", "A little sensitivity for a day or two is normal", "Fillings and crowns don't change colour"]),
    "implant-care": ("models/stills/tooth.webp", ((6, 22, 36), (12, 80, 100)), "Caring for an implant", ["Brush and floss it like a natural tooth", "Clean carefully where it meets the gum", "A check-up every year keeps it healthy"]),
    "after-extraction": ("img/mascots/mascot-vault-1024.webp", ((8, 18, 40), (24, 64, 120)), "After a tooth is taken out", ["Bite on the gauze for about 30 minutes", "No straws, spitting or smoking for 2 days", "Call the clinic if bleeding doesn't settle"]),
    "kids-first-visit": ("img/mascots/mascot-point-512.webp", ((10, 22, 46), (40, 90, 150)), "Your child's first visit", ["Around the first tooth or first birthday", "Mostly a gentle look and tips for parents", "Keep it fun: no scary words beforehand"]),
    "root-canal-myths": ("img/mascots/mascot-laptop-1024.webp", ((8, 16, 36), (30, 50, 110)), "Root canal myths", ["Today's root canals feel much like a filling", "They save your natural tooth", "Pain before treatment is the infection, not the cure"]),
    "denture-care": ("img/mascots/mascot-read-1024.webp", ((12, 18, 38), (40, 60, 110)), "Looking after dentures", ["Take them out and rinse after meals", "Brush them gently, every day", "Soak overnight, never in hot water"]),
    "bleeding-gums": ("img/mascots/mascot-guide-1024.webp", ((22, 12, 32), (90, 40, 80)), "Bleeding gums?", ["Often the first sign of gum inflammation", "Keep brushing, gently and more thoroughly", "Mention it at your next check-up"]),
}

def font(size, weight):
    f = ImageFont.truetype(FONT, size)
    try:
        f.set_variation_by_axes([weight])
    except Exception:
        pass
    return f

def wrap(d, text, f, width):
    lines, line = [], ""
    for w in text.split():
        t = (line + " " + w).strip()
        if d.textlength(t, font=f) <= width:
            line = t
        else:
            lines.append(line)
            line = w
    return lines + [line]

def ease(x):
    x = min(1, max(0, x))
    return x * x * (3 - 2 * x)

def frames(rid, tmp):
    pic, (c1, c2), title, tips = REELS[rid]
    art = Image.open(os.path.join(WEB, "public", pic)).convert("RGBA")
    bg = Image.new("RGB", (W, H))
    px = bg.load()
    for y in range(H):
        t = y / H
        col = tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))
        for x in range(W):
            px[x, y] = col
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((W * 0.1, H * 0.08, W * 0.9, H * 0.52), fill=(125, 211, 252, 60))
    bg = Image.alpha_composite(bg.convert("RGBA"), glow.filter(ImageFilter.GaussianBlur(80)))
    big, mid, small, tag = font(54, 750), font(40, 650), font(26, 600), font(24, 650)
    n = int(len(tips) * CARD_S * FPS)
    for i in range(n):
        t = i / FPS
        f = bg.copy()
        # the picture: a slow zoom, gently floating
        z = 1.0 + 0.08 * (t / (len(tips) * CARD_S))
        size = int(min(W * 0.78, H * 0.42) * z)
        r = size / max(art.width, art.height)
        a = art.resize((max(1, int(art.width * r)), max(1, int(art.height * r))), Image.LANCZOS)
        if art.mode == "RGBA" and art.getextrema()[3][0] == 255:  # an opaque picture: round its corners
            m = Image.new("L", a.size, 0)
            ImageDraw.Draw(m).rounded_rectangle((0, 0, a.width, a.height), 36, fill=255)
            a.putalpha(m)
        y0 = int(H * 0.30 - a.height / 2 + 10 * math.sin(t * 1.3))
        f.alpha_composite(a, (int((W - a.width) / 2), max(100, y0)))
        # everything else is drawn on its own layer and blended on (drawing straight onto the frame would replace pixels)
        ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(ov)
        # top: the label and the title
        d.rounded_rectangle((36, 40, 36 + d.textlength("FMD · Demo reel", font=tag) + 32, 86), 23, fill=(0, 0, 0, 110))
        d.text((52, 50), "FMD · Demo reel", font=tag, fill=(255, 255, 255, 235))
        # bottom: the title, then the tip card for this moment, sliding up and fading in
        k = min(len(tips) - 1, int(t // CARD_S))
        u = (t - k * CARD_S) / CARD_S
        alpha = ease(u / 0.18) * (1 - ease((u - 0.86) / 0.14)) if k < len(tips) - 1 else ease(u / 0.18)
        dy = int(40 * (1 - ease(u / 0.22)))
        ty = int(H * 0.60)
        for line in wrap(d, title, big, W - 96):
            d.text((48, ty), line, font=big, fill=(255, 255, 255, 255))
            ty += 66
        card_top = ty + 28 + dy
        lines = wrap(d, tips[k], mid, W - 160)
        card_h = 56 + len(lines) * 52
        cd = d
        cd.rounded_rectangle((40, card_top, W - 40, card_top + card_h), 28, fill=(255, 255, 255, int(28 * alpha)), outline=(255, 255, 255, int(70 * alpha)), width=2)
        cd.text((68, card_top + 22), f"{k + 1}/{len(tips)}", font=small, fill=(125, 211, 252, int(255 * alpha)))
        yy = card_top + 56
        for line in lines:
            cd.text((68, yy - 4), line, font=mid, fill=(255, 255, 255, int(255 * alpha)))
            yy += 52
        # progress bars, as stories show
        seg = (W - 72 - (len(tips) - 1) * 8) / len(tips)
        for j in range(len(tips)):
            x0 = 36 + j * (seg + 8)
            d.rounded_rectangle((x0, 18, x0 + seg, 24), 3, fill=(255, 255, 255, 70))
            fill = 1 if j < k else (u if j == k else 0)
            if fill > 0:
                d.rounded_rectangle((x0, 18, x0 + seg * fill, 24), 3, fill=(255, 255, 255, 235))
        Image.alpha_composite(f, ov).convert("RGB").save(os.path.join(tmp, f"{i:04d}.png"))

def vtt(rid):
    _, _, title, tips = REELS[rid]
    ts = lambda s: f"00:{int(s // 60):02d}:{s % 60:06.3f}"
    cues = [f"{ts(k * CARD_S)} --> {ts((k + 1) * CARD_S)}\n{title}: {tip}" for k, tip in enumerate(tips)]
    return "WEBVTT\n\n" + "\n\n".join(cues) + "\n"

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for rid in sys.argv[1:] or REELS:
        with tempfile.TemporaryDirectory() as tmp:
            frames(rid, tmp)
            mp4 = os.path.join(OUT, f"{rid}.mp4")
            subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", str(FPS), "-i", os.path.join(tmp, "%04d.png"),
                            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "27", "-preset", "slow", "-movflags", "+faststart", "-an", mp4], check=True)
            Image.open(os.path.join(tmp, f"{int(FPS * 1.2):04d}.png")).convert("RGB").save(os.path.join(OUT, f"{rid}.jpg"), quality=80)
        open(os.path.join(OUT, f"{rid}.vtt"), "w").write(vtt(rid))
        print("wrote", f"reels/{rid}.mp4", f"{os.path.getsize(mp4) // 1024} KB")
