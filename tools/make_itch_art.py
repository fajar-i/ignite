"""Buat gambar halaman itch.io dari aset game yang sudah ada.

Pakai:  python tools/make_itch_art.py
Hasil:  docs/itch/banner.png (960x320)  - gambar header halaman
        docs/itch/cover.png  (630x500)  - cover game / submission jam
        docs/itch/bg-tile.png (256x256) - tile latar halaman (opsional)

Bahan: tekstur kertas (Olga Thelavart, Unsplash), font Nodesto Caps Condensed
(Solbera, CC BY-SA 4.0) & Rosario (OFL), potret karakter buatan tim.
"""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', 'itch')
A = lambda *p: os.path.join(ROOT, 'assets', *p)

PAPER = (243, 217, 152)
WAX = (156, 47, 47)
WAX_DARK = (110, 31, 31)
GOLD = (201, 154, 59)
GOLD_LIGHT = (232, 200, 115)
INK = (59, 42, 26)
NIGHT_TOP = (42, 26, 60)
NIGHT_BOT = (12, 8, 22)

TITLE = 'EYES FOR THE NAMELESS'
TAGLINE = 'Satu langkah kecil · satu perintah · satu akibat'


def font(path, size, wght=None):
    f = ImageFont.truetype(path, size)
    if wght is not None:
        try:
            f.set_variation_by_axes([wght])
        except Exception:
            pass
    return f


NODESTO = A('fonts', 'NodestoCapsCondensed-Bold.otf')
ROSARIO = A('fonts', 'rosario', 'Rosario-VariableFont_wght.ttf')
ROSARIO_I = A('fonts', 'rosario', 'Rosario-Italic-VariableFont_wght.ttf')


def night(w, h):
    """Latar malam: gradien vertikal + cahaya lembut di tengah + vinyet."""
    bg = Image.new('RGB', (w, h))
    d = ImageDraw.Draw(bg)
    for y in range(h):
        t = y / max(1, h - 1)
        d.line([(0, y), (w, y)], fill=tuple(int(a + (b - a) * t) for a, b in zip(NIGHT_TOP, NIGHT_BOT)))
    glow = Image.new('L', (w, h), 0)
    ImageDraw.Draw(glow).ellipse([w * 0.2, -h * 0.3, w * 0.8, h * 0.9], fill=110)
    glow = glow.filter(ImageFilter.GaussianBlur(min(w, h) * 0.25))
    bg = Image.composite(Image.new('RGB', (w, h), (120, 70, 140)), bg, glow)
    # bintang kecil deterministik
    d = ImageDraw.Draw(bg)
    seed = 7
    for _ in range(int(w * h / 2600)):
        seed = (seed * 1103515245 + 12345) & 0x7fffffff
        x = seed % w
        seed = (seed * 1103515245 + 12345) & 0x7fffffff
        y = seed % h
        seed = (seed * 1103515245 + 12345) & 0x7fffffff
        r = 1 if seed % 7 else 2
        a = 120 + seed % 120
        d.ellipse([x - r, y - r, x + r, y + r], fill=(a, a, min(255, a + 30)))
    return bg


def paper(w, h):
    """Kertas: tekstur Olga (peta multiply hampir putih) x warna perkamen."""
    tex = Image.open(A('paper.jpg')).convert('RGB')
    tile = Image.new('RGB', (w, h))
    for y in range(0, h, tex.height):
        for x in range(0, w, tex.width):
            tile.paste(tex, (x, y))
    return ImageChops.multiply(tile, Image.new('RGB', (w, h), PAPER))


def rounded_mask(w, h, r):
    m = Image.new('L', (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w - 1, h - 1], r, fill=255)
    return m


def paste_card(base, box, radius=14):
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    shadow = Image.new('L', base.size, 0)
    ImageDraw.Draw(shadow).rounded_rectangle([x0 + 4, y0 + 8, x1 + 4, y1 + 8], radius, fill=170)
    shadow = shadow.filter(ImageFilter.GaussianBlur(10))
    base.paste(Image.new('RGB', base.size, (0, 0, 0)), (0, 0), shadow)
    card = paper(w, h)
    # vinyet sepia di tepi kartu
    vig = Image.new('L', (w, h), 0)
    ImageDraw.Draw(vig).rounded_rectangle([6, 6, w - 7, h - 7], radius, fill=255)
    vig = ImageChops.invert(vig.filter(ImageFilter.GaussianBlur(18)))
    card = Image.composite(Image.new('RGB', (w, h), (190, 150, 90)), card, vig.point(lambda v: v * 0.55))
    base.paste(card, (x0, y0), rounded_mask(w, h, radius))
    d = ImageDraw.Draw(base)
    d.rounded_rectangle([x0, y0, x1 - 1, y1 - 1], radius, outline=(201, 174, 124), width=2)
    d.rounded_rectangle([x0 + 7, y0 + 7, x1 - 8, y1 - 8], max(2, radius - 6), outline=(201, 174, 124, 120), width=1)


def text_center(d, cx, y, s, f, fill, spacing=0):
    if spacing:
        widths = [d.textlength(ch, font=f) for ch in s]
        total = sum(widths) + spacing * (len(s) - 1)
        x = cx - total / 2
        for ch, wch in zip(s, widths):
            d.text((x, y), ch, font=f, fill=fill)
            x += wch + spacing
    else:
        d.text((cx - d.textlength(s, font=f) / 2, y), s, font=f, fill=fill)


def star(d, cx, cy, r, fill):
    pts = []
    for i in range(8):
        rr = r if i % 2 == 0 else r * 0.32
        import math
        a = math.pi / 4 * i - math.pi / 2
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    d.polygon(pts, fill=fill)


def ornament(d, cx, y, half, color=GOLD):
    d.line([(cx - half, y), (cx - 14, y)], fill=color, width=2)
    d.line([(cx + 14, y), (cx + half, y)], fill=color, width=2)
    star(d, cx, y, 8, color)


def portrait(name, height, flip=False):
    im = Image.open(A('portraits', name)).convert('RGBA')
    im = im.resize((round(im.width * height / im.height), height), Image.LANCZOS)
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    return im


def with_glow(base, im, pos):
    """Tempel potret dengan bayangan lembut agar menyatu dengan latar."""
    a = im.split()[-1]
    sh = Image.new('L', base.size, 0)
    sh.paste(a.filter(ImageFilter.GaussianBlur(6)), (pos[0] + 6, pos[1] + 6))
    base.paste(Image.new('RGB', base.size, (0, 0, 0)), (0, 0), sh.point(lambda v: v * 0.55))
    base.paste(im, pos, im)


def fit(d, text, path, size, max_w, wght=None, spacing=0):
    """Perkecil ukuran font sampai teks muat di max_w."""
    while size > 8:
        f = font(path, size, wght)
        wdt = d.textlength(text, font=f) + spacing * (len(text) - 1)
        if wdt <= max_w:
            return f
        size -= 1
    return font(path, size, wght)


def banner():
    w, h = 960, 320
    img = night(w, h)
    cx0, cx1 = 178, 782
    paste_card(img, (cx0, 38, cx1, 282))
    d = ImageDraw.Draw(img)
    inner = cx1 - cx0 - 70
    ornament(d, w // 2, 72, 150)
    f_title = fit(d, TITLE, NODESTO, 80, inner, spacing=3)
    text_center(d, w // 2 + 2, 88 + 3, TITLE, f_title, (90, 20, 20), spacing=3)
    text_center(d, w // 2, 88, TITLE, f_title, WAX, spacing=3)
    sub = 'Jadilah mata bagi sang kesatria. Susun perintah, keluarlah dari kastil.'
    f_sub = fit(d, sub, ROSARIO_I, 21, inner, 400)
    text_center(d, w // 2, 178, sub, f_sub, INK)
    ornament(d, w // 2, 222, 190)
    f_tag = fit(d, TAGLINE.upper(), ROSARIO, 15, inner, 700, spacing=2)
    text_center(d, w // 2, 238, TAGLINE.upper(), f_tag, (122, 88, 16), spacing=2)
    k = portrait('knight.png', 300, flip=True)
    p = portrait('princess.png', 300)
    with_glow(img, k, (cx0 - k.width + 6, h - 300 + 14))
    with_glow(img, p, (cx1 - 6, h - 300 + 14))
    return img


def cover():
    w, h = 630, 500
    img = night(w, h)
    paste_card(img, (60, 36, 570, 250))
    d = ImageDraw.Draw(img)
    ornament(d, w // 2, 66, 130)
    f_title = font(NODESTO, 74)
    for i, line in enumerate(['EYES FOR THE', 'NAMELESS']):
        y = 80 + i * 70
        text_center(d, w // 2 + 2, y + 3, line, f_title, (90, 20, 20), spacing=3)
        text_center(d, w // 2, y, line, f_title, WAX, spacing=3)
    ornament(d, w // 2, 228, 150)
    k = portrait('knight.png', 290, flip=True)
    p = portrait('princess.png', 290)
    with_glow(img, k, (w // 2 - k.width - 4, h - 290 + 26))
    with_glow(img, p, (w // 2 + 4, h - 290 + 26))
    # pita bawah
    f_tag = font(ROSARIO, 15, 700)
    band = Image.new('L', (w, 44), 0)
    ImageDraw.Draw(band).rectangle([0, 0, w, 44], fill=200)
    img.paste(Image.new('RGB', (w, 44), WAX_DARK), (0, h - 44), band)
    text_center(d, w // 2, h - 33, 'GAME EDUKASI STEM · BERPIKIR KOMPUTASIONAL', f_tag, GOLD_LIGHT, spacing=2)
    return img


def bg_tile():
    """Tile latar halaman: malam gelap polos dengan bintang tipis, menyambung tanpa jahitan."""
    w = h = 256
    img = Image.new('RGB', (w, h), (16, 11, 26))
    d = ImageDraw.Draw(img)
    seed = 3
    for _ in range(26):
        seed = (seed * 1103515245 + 12345) & 0x7fffffff
        x = seed % w
        seed = (seed * 1103515245 + 12345) & 0x7fffffff
        y = seed % h
        a = 70 + seed % 90
        d.point((x, y), fill=(a, a, a + 20))
    return img


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    banner().save(os.path.join(OUT, 'banner.png'), optimize=True)
    cover().save(os.path.join(OUT, 'cover.png'), optimize=True)
    bg_tile().save(os.path.join(OUT, 'bg-tile.png'), optimize=True)
    for n in ('banner.png', 'cover.png', 'bg-tile.png'):
        print(n, os.path.getsize(os.path.join(OUT, n)), 'bytes')
