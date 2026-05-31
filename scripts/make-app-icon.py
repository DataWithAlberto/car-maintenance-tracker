#!/usr/bin/env python3
"""Compone el icono de la app FocusHub a partir de una foto de coche.

Reproduce el mockup `focushub-icon-final.html` ("Monogram Bottom"):
foto a sangre + degradado oscuro inferior + monograma "FH" (F blanca, H azul
Classic Blue) anclado abajo, con esquinas redondeadas estilo macOS.

Uso:  python3 scripts/make-app-icon.py <foto_entrada> <png_salida>
"""
import math
import sys

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

SIZE = 1024
RADIUS = 230  # 90px sobre 400px del mockup → 22.5%
FONT_SIZE = 358  # 140px sobre 400px
PAD_BOTTOM = 102  # 40px sobre 400px
LETTER_SPACING = int(-0.06 * FONT_SIZE)
FONTS = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "/System/Library/Fonts/SFNS.ttf",
]


def oklch_to_rgb(L, C, H):
    h = math.radians(H)
    a, b = C * math.cos(h), C * math.sin(h)
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_**3, m_**3, s_**3
    r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    bb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s

    def gamma(x):
        x = max(0.0, min(1.0, x))
        return 12.92 * x if x <= 0.0031308 else 1.055 * (x ** (1 / 2.4)) - 0.055

    return tuple(int(round(gamma(v) * 255)) for v in (r, g, bb))


def load_font():
    for path in FONTS:
        try:
            return ImageFont.truetype(path, FONT_SIZE)
        except OSError:
            continue
    raise SystemExit("No se encontró una fuente bold del sistema")


def main(inp, outp):
    accent = oklch_to_rgb(0.58, 0.18, 255)

    # 1) Fondo: foto en modo "cover" recortada a cuadrado + saturación/contraste.
    img = Image.open(inp).convert("RGB")
    w, h = img.size
    scale = max(SIZE / w, SIZE / h)
    nw, nh = math.ceil(w * scale), math.ceil(h * scale)
    img = img.resize((nw, nh), Image.LANCZOS)
    left, top = (nw - SIZE) // 2, (nh - SIZE) // 2
    img = img.crop((left, top, left + SIZE, top + SIZE))
    img = ImageEnhance.Color(img).enhance(1.2)
    img = ImageEnhance.Contrast(img).enhance(1.1)
    base = img.convert("RGBA")

    # 2) Degradado: transparente hasta el 30%, negro 0.95 abajo.
    grad = Image.new("L", (1, SIZE), 0)
    start = int(0.30 * SIZE)
    for y in range(SIZE):
        a = 0 if y <= start else int(255 * 0.95 * (y - start) / (SIZE - start))
        grad.putpixel((0, y), a)
    grad = grad.resize((SIZE, SIZE))
    black = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 255))
    transparent = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    base = Image.alpha_composite(base, Image.composite(black, transparent, grad))

    # 3) Monograma "FH" anclado abajo, con sombra suave.
    font = load_font()
    wF, wH = font.getlength("F"), font.getlength("H")
    total = wF + LETTER_SPACING + wH
    xF = (SIZE - total) / 2
    xH = xF + wF + LETTER_SPACING
    baseline = SIZE - PAD_BOTTOM

    shadow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    ds = ImageDraw.Draw(shadow)
    ds.text((xF, baseline + 18), "F", font=font, fill=(0, 0, 0, 205), anchor="ls")
    ds.text((xH, baseline + 18), "H", font=font, fill=(0, 0, 0, 205), anchor="ls")
    shadow = shadow.filter(ImageFilter.GaussianBlur(28))
    base = Image.alpha_composite(base, shadow)

    txt = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    dt = ImageDraw.Draw(txt)
    dt.text((xF, baseline), "F", font=font, fill=(255, 255, 255, 255), anchor="ls")
    dt.text((xH, baseline), "H", font=font, fill=accent + (255,), anchor="ls")
    base = Image.alpha_composite(base, txt)

    # 4) Esquinas redondeadas (transparencia) estilo icono macOS.
    mask = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, SIZE - 1, SIZE - 1], radius=RADIUS, fill=255)
    base.putalpha(mask)

    base.save(outp)
    print(f"Icono generado: {outp}  · azul Classic Blue = rgb{accent}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Uso: make-app-icon.py <foto_entrada> <png_salida>")
    main(sys.argv[1], sys.argv[2])
