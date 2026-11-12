"""Vault-It wordmark in Vault-form Heading (D+), normal width (owner, 12 Nov 2026).

Vault in the text colour, the brick hyphen and It in teal. Writes brand/logo/*.svg.
Run: python3 build_wordmark.py (needs the built ttf files)."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_vault_form as V
from shapely import affinity
from PIL import ImageFont

OUT = Path(__file__).resolve().parents[3] / "logo"
TTF = Path(__file__).resolve().parents[1] / "ttf"
THEMES = {"night": dict(bg="#080808", vault="#E8E8E8", it="#44C0B9"),
          "daylight": dict(bg="#F3F7F6", vault="#06161A", it="#007F7B")}
CUTS = [("dplus", False, "heading-bold")]   # owner, 12 Nov: D+ normal width


def kern_positions(ttf, s):
    f = ImageFont.truetype(str(ttf), 1000, layout_engine=ImageFont.Layout.RAQM)
    xs = []
    for i in range(len(s)):
        k = 0
        if i:
            k = f.getlength(s[i - 1:i + 1]) - f.getlength(s[i - 1]) - f.getlength(s[i])
        xs.append(f.getlength(s[:i]) + k)
    return xs, f.getlength(s)


def path_d(geom):
    out = []
    for p in V.polys(geom):
        for ring in [p.exterior] + list(p.interiors):
            pts = list(ring.coords)[:-1]
            out.append("M" + " L".join(f"{x:.0f} {-y:.0f}" for x, y in pts) + "Z")
    return "".join(out)


for mode, cond, slug in CUTS:
    g, glyphs, _ = V.build_glyphs("Bold", cond, mode)
    ttf = TTF / f"vault-form-{slug}.ttf"
    track = -20                                    # .wm letter-spacing -0.02em
    xv, wv = kern_positions(ttf, "Vault")
    parts = [("vault", affinity.translate(glyphs[c][0], x + i * track)) for i, (c, x) in enumerate(zip("Vault", xv))]
    pen = wv + 5 * track + 70                      # brick margin .07em
    bw, bh, lift = 300, 170, 60                    # brick .3em x .17em, lifted .06em
    brick = V.octa(pen, lift, pen + bw, lift + bh, ch=(16, 44, 16, 44))
    add, cut, extra = V.cyber(g, brick, "hyphen", mode)
    parts.append(("it", V.finalize(V.U(brick.difference(cut), add))))
    pen += bw + 70 + extra
    xi, wi = kern_positions(ttf, "It")
    for i, (c, x) in enumerate(zip("It", xi)):
        parts.append(("it", affinity.translate(glyphs[c][0], pen + x + i * track)))
    geoms = V.U(*[p[1] for p in parts])
    x0, y0, x1, y1 = geoms.bounds
    pad = 120
    vb = f"{x0 - pad:.0f} {-y1 - pad:.0f} {x1 - x0 + 2 * pad:.0f} {y1 - y0 + 2 * pad:.0f}"
    for th, c in THEMES.items():
        body = "".join(f'<path fill="{c[role]}" d="{path_d(gm)}"/>' for role, gm in parts)
        for bg in (True, False):
            rect = f'<rect x="{x0 - pad:.0f}" y="{-y1 - pad:.0f}" width="{x1 - x0 + 2 * pad:.0f}" height="{y1 - y0 + 2 * pad:.0f}" fill="{c["bg"]}"/>' if bg else ""
            svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="Vault-It">'
                   f'{rect}{body}</svg>')
            name = f"vault-it-wordmark-{th}{'' if bg else '-transparent'}.svg"
            (OUT / name).write_text(svg)
    print(slug, "done", vb)
