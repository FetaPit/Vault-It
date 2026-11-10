#!/usr/bin/env python3
"""Vault-form type family generator (PT Live Design for Vault-It).

One parametric generator for every style. Each glyph is drawn from code with
straight edges and 45 degree chamfers only, so the CFF (.otf) and TrueType
(.ttf) outlines are the same points.

    python3 build_vault_form.py            # build all styles
    python3 build_vault_form.py Bold       # build styles whose key contains "Bold"

To rename the family, change FAMILY below. Everything else (file names,
PostScript names, CSS family names, Reserved Font Name) follows from it.
"""
import math
import os
import sys
from pathlib import Path

import numpy as np
import shapely
from shapely import affinity
from shapely.geometry import LineString, MultiPolygon, Polygon, box
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

# --------------------------------------------------------------------------
# Family identity. Change FAMILY to rename everything.
# --------------------------------------------------------------------------
FAMILY = "Vault-form"
PS_FAMILY = FAMILY.replace("-", "").replace(" ", "")          # Vaultform
SLUG = FAMILY.lower().replace(" ", "-")                       # vault-form
VENDOR = "PTLD"
VERSION = "1.000"
YEAR = "2026"
COPYRIGHT = f'Copyright {YEAR} PT Live Design (Vault-It), with Reserved Font Name "{FAMILY}".'
DESIGNER = "Pete T for PT Live Design"
MANUFACTURER = "PT Live Design (Vault-It)"
LICENCE = ("This Font Software is licensed under the SIL Open Font License, Version 1.1. "
           "This license is available with a FAQ at: https://openfontlicense.org")
LICENCE_URL = "https://openfontlicense.org"

ROOT = Path(__file__).resolve().parents[1]

# --------------------------------------------------------------------------
# Vertical metrics (UPM 1000)
# --------------------------------------------------------------------------
UPM = 1000
CAP, XH, ASC, DESC = 700, 530, 740, -190
TYPO_ASC, TYPO_DESC = 950, -250          # line-height normal = 1.2, cap height centred
WATER = round(0.42 * CAP)                # hatch waterline

REG_S = 94
WIDE = 1.06          # extra counter width for the normal-width cut
WEIGHTS = {
    # S = vertical stem, hr = horizontal/vertical, h3 = extra thinning for 3-tier
    # glyphs (e s a 8 3 B E S), cf = counter factor for the condensed width
    "Light":   dict(cls=300, S=60,  hr=0.90, h3=0.97, cf=0.66),
    "Regular": dict(cls=400, S=94,  hr=0.87, h3=0.94, cf=0.62),
    "Bold":    dict(cls=700, S=160, hr=0.80, h3=0.88, cf=0.58),
}

STYLES = [
    # key,                weight,   cond,  hatch
    ("Light",             "Light",   False, False),
    ("Regular",           "Regular", False, False),
    ("Bold",              "Bold",    False, False),
    ("CondensedLight",    "Light",   True,  False),
    ("CondensedRegular",  "Regular", True,  False),
    ("CondensedBold",     "Bold",    True,  False),
    ("HatchBold",         "Bold",    False, True),
    ("CondensedHatchBold", "Bold",   True,  True),
]

# Chamfer signature (brief 1.2): big 45 degree chamfers top-left and
# bottom-right, small ones top-right and bottom-left, square where a stem runs
# on. Cutting those two corners leaves every chamfer edge running "/", which
# is what gives the forward lean without italics. (Big chamfers at top-right
# and bottom-left, as first written in the brief, put the edges at "\" and
# read upright or leaning back in proofs.)
HATCH_DIR = "/"     # stripes run parallel to the big chamfer edges

BIGNUM = 4000


# --------------------------------------------------------------------------
# Geometry primitives
# --------------------------------------------------------------------------
def U(*gs):
    return unary_union([g for g in gs if g is not None and not g.is_empty])


def octa(x0, y0, x1, y1, ch=(0, 0, 0, 0)):
    """Rectangle with per-corner 45 degree chamfers ch=(bl, br, tr, tl)."""
    bl, br, tr, tl = [max(0.0, float(c)) for c in ch]
    w, h = x1 - x0, y1 - y0
    bl, br, tr, tl = [min(c, w, h) for c in (bl, br, tr, tl)]

    def fit(a, b, lim):
        if a + b > lim and a + b > 0:
            k = lim / (a + b)
            return a * k, b * k
        return a, b
    bl, br = fit(bl, br, w)
    tl, tr = fit(tl, tr, w)
    bl, tl = fit(bl, tl, h)
    br, tr = fit(br, tr, h)
    pts = [(x0 + bl, y0), (x1 - br, y0), (x1, y0 + br), (x1, y1 - tr),
           (x1 - tr, y1), (x0 + tl, y1), (x0, y1 - tl), (x0, y0 + bl)]
    out = []
    for p in pts:
        if not out or abs(out[-1][0] - p[0]) > 1e-6 or abs(out[-1][1] - p[1]) > 1e-6:
            out.append(p)
    if len(out) > 1 and abs(out[0][0] - out[-1][0]) < 1e-6 and abs(out[0][1] - out[-1][1]) < 1e-6:
        out.pop()
    return Polygon(out)


def inset(geom, sx, sy):
    """Anisotropic mitre inset: vertical stems sx thick, horizontal bars sy thick."""
    k = sx / sy
    g = affinity.scale(geom, 1, k, origin=(0, 0))
    g = g.buffer(-sx, join_style="mitre", mitre_limit=10)
    return affinity.scale(g, 1, 1 / k, origin=(0, 0))


def diag(x1, y1, x2, y2, t):
    """Diagonal stroke of perpendicular thickness t, horizontal terminals."""
    dx, dy = x2 - x1, y2 - y1
    L = math.hypot(dx, dy)
    hw = t / (abs(dy) / L) / 2
    return Polygon([(x1 - hw, y1), (x1 + hw, y1), (x2 + hw, y2), (x2 - hw, y2)]).buffer(0)


def stroke(pts, t, cap="flat"):
    return LineString(pts).buffer(t / 2, cap_style=cap, join_style="mitre", mitre_limit=4)


def vee(x0, x1, yb, yt, t, f):
    """V shape inside [x0,x1] x [yb,yt], stroke t, flat vertex f at the bottom."""
    xm = (x0 + x1) / 2
    dx, dy = xm - f / 2 - x0, yt - yb
    L = math.hypot(dx, dy)
    tw = t / (dy / L)
    slope = dy / dx
    yi = yt - (xm - (x0 + tw)) * slope
    yi = max(yi, yb + 1)
    pts = [(x0, yt), (x0 + tw, yt), (xm, yi), (x1 - tw, yt), (x1, yt),
           (xm + f / 2, yb), (xm - f / 2, yb)]
    return Polygon(pts).buffer(0)


def flipy(g, y0, y1):
    return affinity.scale(g, 1, -1, origin=(0, (y0 + y1) / 2))


def flipx(g, x0, x1):
    return affinity.scale(g, -1, 1, origin=((x0 + x1) / 2, 0))


def T(g, dx=0, dy=0):
    return affinity.translate(g, dx, dy)


def polys(geom):
    if geom.is_empty:
        return []
    if isinstance(geom, Polygon):
        return [geom]
    out = []
    for g in getattr(geom, "geoms", []):
        out.extend(polys(g))
    return out


# --------------------------------------------------------------------------
# Style context
# --------------------------------------------------------------------------
class G:
    def __init__(self, weight, cond):
        p = WEIGHTS[weight]
        self.weight, self.cond = weight, cond
        self.S = p["S"]
        self.H = round(p["S"] * p["hr"])
        self.H3 = round(self.H * p["h3"])
        self.cf = p["cf"] if cond else 1.0
        self.X, self.C, self.A, self.D = XH, CAP, ASC, DESC
        sb = 0.25 * self.S + 45
        if cond:
            sb *= 0.86
        self.sbV = round(sb)                 # straight side
        self.sbO = round(sb * 0.86)          # chamfered side
        self.sbD = round(sb * 0.18)          # diagonal side
        self.sbT = round(sb * 0.35)          # overhanging bar
        self.sbC = round(sb * 1.14)          # capital straight side
        self.cache = {}

    # width of a shape with n vertical stems whose Regular-wide outer width is base
    def w(self, base, n=2):
        # Normal width keeps its counters as weight grows (Bold gets wider, for
        # headings); Condensed gives counter space back to the stems instead.
        shrink = 0.45 if self.cond else 0.12
        c = base - n * REG_S - n * (self.S - REG_S) * shrink
        if not self.cond:
            c *= WIDE
        return round(n * self.S + c * self.cf)

    def big(self, w, h=None):
        h = w if h is None else h
        return round(0.28 * min(w, h))

    def sm(self, w=None, h=None):
        if w is None:
            return round(0.3 * self.S)
        h = w if h is None else h
        return round(max(0.3 * self.S, 0.055 * min(w, h)))

    def ring(self, x0, y0, x1, y1, ch=(0, 0, 0, 0), sx=None, sy=None, open=""):
        sx = sx or self.S
        sy = sy or self.H
        ox0 = x0 - BIGNUM if "l" in open else x0
        ox1 = x1 + BIGNUM if "r" in open else x1
        oy0 = y0 - BIGNUM if "b" in open else y0
        oy1 = y1 + BIGNUM if "t" in open else y1
        outer = octa(ox0, oy0, ox1, oy1, ch)
        inner = inset(outer, sx, sy)
        return outer.difference(inner).intersection(box(x0, y0, x1, y1))

    def dot(self, x, y, w=None, h=None):
        w = w or self.dw
        h = h or self.dh
        return octa(x, y, x + w, y + h, (0, 0, 0, round(0.22 * min(w, h))))

    @property
    def dw(self):
        return round(self.S * 1.06 + 8)

    @property
    def dh(self):
        return round(self.S * 1.06 + 8)

    @property
    def t(self):            # diagonal stroke weight
        return round(self.S * 0.98)

    def hook(self, x0, x1, ytop, bc=None):
        """Descender hook shared by g, y, j: right stem down, bar to the left."""
        S, H, D = self.S, self.H, self.D
        bc = round(0.5 * abs(D)) if bc is None else bc
        r = self.ring(x0, D, x1, ytop, (self.sm(), bc, 0, 0), open="t")
        return r.difference(box(x0 - 10, D + H, x1 - S, ytop + 10))


GLYPHS = {}      # name -> (unicodes, func)
ORDER = []


def gl(name, *unis):
    def deco(fn):
        GLYPHS[name] = (list(unis), fn)
        ORDER.append(name)
        return fn
    return deco


def get(g, name):
    """Drawn glyph: (geom, W, lsb, rsb) with geom in [0, W]."""
    if name not in g.cache:
        r = GLYPHS[name][1](g)
        if len(r) == 4:
            r = (r[0], r[1], r[2], r[3])
        g.cache[name] = r
    return g.cache[name]


# ==========================================================================
# LOWER CASE
# ==========================================================================
@gl("a", 0x61)
def _a(g):
    S, H3, X = g.S, g.H3, g.X
    W = g.w(540, 2)
    bt = round(0.57 * X)
    top = g.ring(0, 0, W, X, (0, 0, g.sm(W, X), 0), sy=H3, open="lb")
    top = top.difference(box(-10, -10, W - S, bt))
    bowl = g.ring(0, 0, W, bt, (g.sm(W, bt), 0, 0, g.big(W, bt)), sy=H3)
    return U(top, bowl), W, g.sbO, g.sbV


@gl("b", 0x62)
def _b(g):
    S, H, X, A = g.S, g.H, g.X, g.A
    W = g.w(570, 2)
    bowl = g.ring(0, 0, W, X, (g.sm(W, X), g.big(W, X), g.sm(W, X), 0))
    return U(bowl, box(0, X - H, S, A)), W, g.sbV, g.sbO


@gl("c", 0x63)
def _c(g):
    S, H, X = g.S, g.H, g.X
    W = g.w(520, 2)
    r = g.ring(0, 0, W, X, (g.sm(W, X), g.big(W, X), g.sm(W, X), g.big(W, X)))
    r = r.difference(box(W - S - 10, round(0.30 * X), W + 10, round(0.70 * X)))
    return r, W, g.sbO, g.sbT + 6


@gl("d", 0x64)
def _d(g):
    S, H, X, A = g.S, g.H, g.X, g.A
    W = g.w(570, 2)
    bowl = g.ring(0, 0, W, X, (g.sm(W, X), round(g.big(W, X) * 0.75), 0, g.big(W, X)))
    return U(bowl, box(W - S, X - H, W, A)), W, g.sbO, g.sbV


@gl("e", 0x65)
def _e(g):
    S, H3, X = g.S, g.H3, g.X
    W = g.w(550, 2)
    r = g.ring(0, 0, W, X, (g.sm(W, X), g.big(W, X), g.sm(W, X), g.big(W, X)), sy=H3)
    yb0 = round(X * (0.47 if g.weight == "Bold" else 0.485) - H3 / 2)
    bar = box(0, yb0, W, yb0 + H3)
    cut = box(W - max(S, g.big(W, X)) - 10, H3, W + 10, yb0)
    return U(r, bar).difference(cut), W, g.sbO, g.sbO


@gl("f", 0x66)
def _f(g):
    S, H, X, A = g.S, g.H, g.X, g.A
    ov = round(0.42 * S + 26)
    arm = round((0.62 * S + 130) * (0.86 if g.cond else 1))
    W = ov + S + arm
    hook = g.ring(ov, 0, W, A, (0, 0, g.sm(), round(0.5 * (W - ov))), open="b")
    hook = hook.difference(box(ov + S, -10, W + 10, A - H))
    cross = box(0, X - H, ov + S + round(arm * 0.78), X)
    return U(hook, cross), W, g.sbT, g.sbT - 6


@gl("g", 0x67)
def _g(g):
    S, H, X, D = g.S, g.H, g.X, g.D
    W = g.w(570, 2)
    bowl = g.ring(0, 0, W, X, (g.sm(W, X), 0, g.sm(W, X), g.big(W, X)))
    return U(bowl, g.hook(0, W, H + 5)), W, g.sbO, g.sbV


@gl("h", 0x68)
def _h(g):
    S, H, X, A = g.S, g.H, g.X, g.A
    W = g.w(550, 2)
    arch = g.ring(0, 0, W, X, (0, 0, g.sm(W, X), 0), open="b")
    return U(arch, box(0, 0, S, A)), W, g.sbV, g.sbV


def i_dot_y(g):
    return g.X + round(0.15 * g.X) + (8 if g.weight == "Light" else 0)


@gl("dotlessi", 0x131)
def _dotlessi(g):
    return box(0, 0, g.S, g.X), g.S, g.sbV, g.sbV


@gl("i", 0x69)
def _i(g):
    S = g.S
    d = g.dot((S - g.dw) / 2, i_dot_y(g))
    return U(box(0, 0, S, g.X), d), S, g.sbV, g.sbV


@gl("j", 0x6A)
def _j(g):
    S, X = g.S, g.X
    W = S + round(0.7 * S + 70)
    d = g.dot(W - S + (S - g.dw) / 2, i_dot_y(g))
    return U(g.hook(0, W, X, bc=round(0.35 * abs(g.D))), d), W, round(g.sbV - (W - S) * 0.75), g.sbV


@gl("k", 0x6B)
def _k(g):
    S, X, A, t = g.S, g.X, g.A, g.t
    W = g.w(520, 2)
    yj = round(0.40 * X)
    tw = t / math.sin(math.atan2(X - yj, W - S)) / 2
    arm = diag(S * 0.5, yj, W - tw, X, t)
    tw2 = t / math.sin(math.atan2(yj + 60, W - S)) / 2
    leg = diag(S + (W - S) * 0.22, yj + 60, W - tw2, 0, t)
    return U(box(0, 0, S, A), arm, leg).intersection(box(0, 0, W, A)), W, g.sbV, g.sbD


@gl("l", 0x6C)
def _l(g):
    S, H, A = g.S, g.H, g.A
    W = S + round(0.5 * S + 62)
    r = g.ring(0, 0, W, A, (g.sm(), 0, 0, 0), open="t")
    r = r.difference(box(S, H, W + 10, A + 10))
    foot = octa(0, 0, W, H, (g.sm(), round(0.85 * H), 0, 0))
    return U(r.intersection(box(0, 0, S, A)), foot), W, g.sbV, g.sbT


@gl("m", 0x6D)
def _m(g):
    S, H, X = g.S, g.H, g.X
    W = g.w(860, 3)
    mx = round((W - S) / 2)
    sub = (W + S) / 2
    arch = g.ring(0, 0, W, X, (0, 0, g.sm(W, X), g.big(sub, X)), open="b")
    return U(arch, box(mx, 0, mx + S, X)), W, g.sbV, g.sbV


@gl("n", 0x6E)
def _n(g):
    X = g.X
    W = g.w(550, 2)
    return g.ring(0, 0, W, X, (0, 0, g.sm(W, X), g.big(W, X)), open="b"), W, g.sbV, g.sbV


@gl("o", 0x6F)
def _o(g):
    X = g.X
    W = g.w(570, 2)
    B, s = g.big(W, X), g.sm(W, X)
    return g.ring(0, 0, W, X, (s, B, s, B)), W, g.sbO, g.sbO


@gl("p", 0x70)
def _p(g):
    S, H, X, D = g.S, g.H, g.X, g.D
    W = g.w(570, 2)
    bowl = g.ring(0, 0, W, X, (0, g.big(W, X), g.sm(W, X), g.big(W, X)))
    return U(bowl, box(0, D, S, H)), W, g.sbV, g.sbO


@gl("q", 0x71)
def _q(g):
    S, H, X, D = g.S, g.H, g.X, g.D
    W = g.w(570, 2)
    bowl = g.ring(0, 0, W, X, (g.sm(W, X), 0, g.sm(W, X), g.big(W, X)))
    return U(bowl, box(W - S, D, W, H)), W, g.sbO, g.sbV


@gl("r", 0x72)
def _r(g):
    S, H, X = g.S, g.H, g.X
    Wn = g.w(550, 2)
    W = S + round((Wn - 2 * S) * 0.62 + 0.45 * S)
    r = g.ring(0, 0, W, X, (0, 0, g.sm(Wn, X), min(g.big(Wn, X), round(1.2 * S + 40))), open="b")
    r = r.difference(box(S, -10, W + 10, X - H))
    return r, W, g.sbV, g.sbT


@gl("s", 0x73)
def _s(g):
    S, H3, X = g.S, g.H3, g.X
    W = g.w(530, 2)
    ym0 = round(0.5 * X - H3 / 2 + 0.01 * X)
    ym1 = ym0 + H3
    up = g.ring(0, ym0, W, X, (g.sm(W, X), 0, g.sm(W, X), g.big(W, X - ym0)), sy=H3)
    up = up.difference(box(W - S - 10, ym0 + H3, W + 10, X - H3))
    lo = g.ring(0, 0, W, ym1, (g.sm(W, X), g.big(W, ym1), g.sm(W, ym1), 0), sy=H3)
    lo = lo.difference(box(-10, H3, S + 10, ym1 - H3))
    return U(up, lo), W, g.sbO, g.sbO


@gl("t", 0x74)
def _t(g):
    S, H, X = g.S, g.H, g.X
    ov = round(0.42 * S + 34)
    foot = round((0.5 * S + 92) * (0.88 if g.cond else 1))
    W = ov + S + foot
    tH = X + round(0.62 * (g.A - X))
    st = octa(ov, 0, ov + S, tH, (g.sm(), 0, 0, round(0.75 * S)))
    footb = octa(ov, 0, W, H, (g.sm(), round(0.85 * H), 0, 0))
    st = U(st, footb)
    cross = box(0, X - H, W, X)
    return U(st, cross), W, g.sbT, g.sbT


@gl("u", 0x75)
def _u(g):
    X = g.X
    W = g.w(550, 2)
    return g.ring(0, 0, W, X, (g.sm(W, X), g.big(W, X), 0, 0), open="t"), W, g.sbV, g.sbV


@gl("v", 0x76)
def _v(g):
    W = g.w(560, 2)
    return vee(0, W, 0, g.X, g.t, round(g.t * 0.9)), W, g.sbD, g.sbD


@gl("w", 0x77)
def _w(g):
    W = g.w(860, 3)
    t = round(g.t * 0.95)
    f = round(t * 0.9)
    # strokes thickness 't' so outer vees use horizontal width tw
    a = (W + t * 1.15) / 2
    v1 = vee(0, a, 0, g.X, t, f)
    v2 = vee(W - a, W, 0, g.X, t, f)
    return U(v1, v2), W, g.sbD, g.sbD


@gl("x", 0x78)
def _x(g):
    W = g.w(540, 2)
    X, t = g.X, round(g.t * 0.95)
    hw = t / math.sin(math.atan2(X, W - t)) / 2
    s1 = diag(hw, X, W - hw, 0, t)
    s2 = diag(W - hw, X, hw, 0, t)
    return U(s1, s2).intersection(box(0, 0, W, X)), W, g.sbD, g.sbD


@gl("y", 0x79)
def _y(g):
    S, H, X = g.S, g.H, g.X
    W = g.w(550, 2)
    cup = g.ring(0, 0, W, X, (g.sm(W, X), 0, 0, 0), open="t")
    return U(cup, g.hook(0, W, X)), W, g.sbV, g.sbV


@gl("z", 0x7A)
def _z(g):
    S, H, X, t = g.S, g.H, g.X, g.t
    W = g.w(510, 2)
    hw = t / math.sin(math.atan2(X - 2 * H, W)) / 2
    d = diag(W - hw, X - H, hw, H, t)
    top = octa(0, X - H, W, X, (0, 0, 0, round(0.85 * H)))
    bot = octa(0, 0, W, H, (0, round(0.85 * H), 0, 0))
    return U(top, bot, d).intersection(box(0, 0, W, X)), W, g.sbO, g.sbO


# ==========================================================================
# UPPER CASE
# ==========================================================================
@gl("A", 0x41)
def _A(g):
    S, H, C = g.S, g.H, g.C
    W = g.w(700, 2)
    Ba = round(0.34 * W)
    r = g.ring(0, 0, W, C, (0, 0, Ba, Ba), open="b")
    ya = round(0.36 * C)
    return U(r, box(0, ya, W, ya + H)), W, g.sbC, g.sbC


@gl("B", 0x42)
def _B(g):
    S, H3, C = g.S, g.H3, g.C
    W = g.w(650, 2)
    ym = round(0.54 * C)
    Wu = W - round(0.07 * W)
    lo = g.ring(0, 0, W, ym + H3 // 2, (0, g.big(W, ym), g.sm(W, ym), 0), sy=H3)
    up = g.ring(0, ym - H3 // 2, Wu, C, (0, g.big(Wu, C - ym), g.sm(Wu, C - ym), 0), sy=H3)
    return U(lo, up), W, g.sbC, g.sbO


@gl("C", 0x43)
def _C(g):
    S, H, C = g.S, g.H, g.C
    W = g.w(660, 2)
    r = g.ring(0, 0, W, C, (g.sm(W, C), g.big(W, C), g.sm(W, C), g.big(W, C)))
    r = r.difference(box(W - S - 10, round(0.31 * C), W + 10, round(0.69 * C)))
    return r, W, g.sbO, g.sbT + 8


@gl("D", 0x44)
def _D(g):
    C = g.C
    W = g.w(680, 2)
    return g.ring(0, 0, W, C, (0, g.big(W, C), g.sm(W, C), 0)), W, g.sbC, g.sbO


@gl("E", 0x45)
def _E(g):
    S, H3, C = g.S, g.H3, g.C
    W = g.w(590, 2)
    r = g.ring(0, 0, W, C, (g.sm(), 0, 0, g.sm()), sy=H3, open="r")
    ym = round(0.5 * C + 6)
    return U(r, box(0, ym - H3 / 2, round(W * 0.9), ym + H3 / 2)), W, g.sbC, g.sbT


@gl("F", 0x46)
def _F(g):
    S, H, C = g.S, g.H, g.C
    W = g.w(570, 2)
    r = g.ring(0, 0, W, C, (0, 0, 0, g.sm()), open="rb")
    ym = round(0.47 * C)
    return U(r, box(0, ym - H / 2, round(W * 0.9), ym + H / 2)), W, g.sbC, g.sbT


@gl("G", 0x47)
def _G(g):
    S, H, C = g.S, g.H, g.C
    W = g.w(680, 2)
    B, s = g.big(W, C), g.sm(W, C)
    r = g.ring(0, 0, W, C, (s, B, s, B))
    yb = round(0.47 * C)
    r = r.difference(box(W - S - 10, yb, W + 10, round(0.72 * C)))
    spur = box(round(0.5 * W), yb - H, W, yb)
    return U(r, spur), W, g.sbO, g.sbV


@gl("H", 0x48)
def _H(g):
    S, H, C = g.S, g.H, g.C
    W = g.w(680, 2)
    ym = round(0.52 * C)
    return U(box(0, 0, S, C), box(W - S, 0, W, C), box(0, ym - H / 2, W, ym + H / 2)), W, g.sbC, g.sbC


@gl("I", 0x49)
def _I(g):
    return box(0, 0, g.S, g.C), g.S, g.sbC, g.sbC


@gl("J", 0x4A)
def _J(g):
    S, C = g.S, g.C
    W = g.w(560, 2)
    r = g.ring(0, 0, W, C, (g.sm(W, C), g.big(W, C), 0, 0), open="t")
    r = r.difference(box(-10, round(0.3 * C), S + 10, C + 10))
    return r, W, g.sbO, g.sbC


@gl("K", 0x4B)
def _K(g):
    S, C, t = g.S, g.C, g.t
    W = g.w(650, 2)
    yj = round(0.42 * C)
    tw = t / math.sin(math.atan2(C - yj, W - S)) / 2
    arm = diag(S * 0.5, yj, W - tw, C, t)
    tw2 = t / math.sin(math.atan2(yj + 70, W - S)) / 2
    leg = diag(S + (W - S) * 0.2, yj + 70, W - tw2, 0, t)
    return U(box(0, 0, S, C), arm, leg).intersection(box(0, 0, W, C)), W, g.sbC, g.sbD


@gl("L", 0x4C)
def _L(g):
    W = g.w(540, 2)
    return g.ring(0, 0, W, g.C, (g.sm(), 0, 0, 0), open="tr"), W, g.sbC, g.sbT


@gl("M", 0x4D)
def _M(g):
    S, C, t = g.S, g.C, g.t
    W = g.w(820, 2)
    v = vee(0, W, round(0.32 * C), C, round(t * 0.92), round(S * 0.9))
    return U(box(0, 0, S, C), box(W - S, 0, W, C), v), W, g.sbC, g.sbC


@gl("N", 0x4E)
def _N(g):
    S, C, t = g.S, g.C, g.t
    W = g.w(690, 2)
    tt = round(t * 0.95)
    hw = tt / math.sin(math.atan2(C, W - tt)) / 2
    d = diag(hw, C, W - hw, 0, tt)
    return U(box(0, 0, S, C), box(W - S, 0, W, C), d).intersection(box(0, 0, W, C)), W, g.sbC, g.sbC


@gl("O", 0x4F)
def _O(g):
    C = g.C
    W = g.w(720, 2)
    B, s = g.big(W, C), g.sm(W, C)
    return g.ring(0, 0, W, C, (s, B, s, B)), W, g.sbO, g.sbO


@gl("P", 0x50)
def _P(g):
    S, H, C = g.S, g.H, g.C
    W = g.w(640, 2)
    yb = round(0.40 * C)
    bowl = g.ring(0, yb, W, C, (0, g.big(W, C - yb), g.sm(W, C - yb), 0))
    return U(bowl, box(0, 0, S, C)), W, g.sbC, g.sbO


@gl("Q", 0x51)
def _Q(g):
    S, C, t = g.S, g.C, g.t
    W = g.w(720, 2)
    B, s = g.big(W, C), g.sm(W, C)
    o = g.ring(0, 0, W, C, (s, B, s, B))
    tt = round(t * 0.9)
    tail = diag(W * 0.6, round(0.3 * C), W + round(0.02 * W), -round(0.1 * C), tt)
    tail = tail.intersection(box(0, -round(0.1 * C), W + 0.12 * W, C))
    return U(o, tail), W, g.sbO, g.sbO - 10


@gl("R", 0x52)
def _R(g):
    S, H, C, t = g.S, g.H, g.C, g.t
    W = g.w(660, 2)
    yb = round(0.40 * C)
    Wb = W - round(0.03 * W)
    bowl = g.ring(0, yb, Wb, C, (0, g.big(Wb, C - yb), g.sm(Wb, C - yb), 0))
    tw = t / math.sin(math.atan2(yb + H, W - S)) / 2
    leg = diag(round(W * 0.48), yb + H / 2, W - tw, 0, t)
    return U(bowl, box(0, 0, S, C), leg.intersection(box(0, 0, W, C))), W, g.sbC, g.sbD


@gl("S", 0x53)
def _S(g):
    S, H3, C = g.S, g.H3, g.C
    W = g.w(640, 2)
    ym0 = round(0.5 * C - H3 / 2 + 0.01 * C)
    ym1 = ym0 + H3
    up = g.ring(0, ym0, W, C, (g.sm(W, C), 0, g.sm(W, C), g.big(W, C - ym0)), sy=H3)
    up = up.difference(box(W - S - 10, ym0 + H3, W + 10, C - H3))
    lo = g.ring(0, 0, W, ym1, (g.sm(W, C), g.big(W, ym1), g.sm(W, ym1), 0), sy=H3)
    lo = lo.difference(box(-10, H3, S + 10, ym1 - H3))
    return U(up, lo), W, g.sbO, g.sbO


@gl("T", 0x54)
def _T(g):
    S, H, C = g.S, g.H, g.C
    W = g.w(640, 2)
    x = round((W - S) / 2)
    return U(box(0, C - H, W, C), box(x, 0, x + S, C)), W, g.sbT, g.sbT


@gl("U", 0x55)
def _U(g):
    C = g.C
    W = g.w(680, 2)
    return g.ring(0, 0, W, C, (g.sm(W, C), g.big(W, C), 0, 0), open="t"), W, g.sbC, g.sbC


@gl("V", 0x56)
def _V(g):
    W = g.w(700, 2)
    return vee(0, W, 0, g.C, g.t, round(g.t * 0.9)), W, g.sbD, g.sbD


@gl("W", 0x57)
def _W(g):
    W = g.w(1000, 3)
    t = round(g.t * 0.96)
    f = round(t * 0.9)
    a = (W + t * 1.15) / 2
    return U(vee(0, a, 0, g.C, t, f), vee(W - a, W, 0, g.C, t, f)), W, g.sbD, g.sbD


@gl("X", 0x58)
def _X(g):
    W = g.w(680, 2)
    C, t = g.C, round(g.t * 0.96)
    hw = t / math.sin(math.atan2(C, W - t)) / 2
    return U(diag(hw, C, W - hw, 0, t), diag(W - hw, C, hw, 0, t)).intersection(box(0, 0, W, C)), W, g.sbD, g.sbD


@gl("Y", 0x59)
def _Y(g):
    S, C, t = g.S, g.C, g.t
    W = g.w(680, 2)
    yv = round(0.40 * C)
    v = vee(0, W, yv, C, t, S)
    x = (W - S) / 2
    return U(v, box(x, 0, x + S, yv + 2)), W, g.sbD, g.sbD


@gl("Z", 0x5A)
def _Z(g):
    S, H, C, t = g.S, g.H, g.C, g.t
    W = g.w(620, 2)
    hw = t / math.sin(math.atan2(C - 2 * H, W)) / 2
    d = diag(W - hw, C - H, hw, H, t)
    top = octa(0, C - H, W, C, (0, 0, 0, round(0.85 * H)))
    bot = octa(0, 0, W, H, (0, round(0.85 * H), 0, 0))
    return U(top, bot, d).intersection(box(0, 0, W, C)), W, g.sbO, g.sbO


# ==========================================================================
# FIGURES (tabular by default, .pnum alternates)
# ==========================================================================
def digit_w(g):
    return g.w(560, 2)


def tab_adv(g):
    return digit_w(g) + 2 * round(g.sbV * 0.9)


DIGITS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"]


def d_zero(g, W):
    S, H, C = g.S, g.H, g.C
    B, s = g.big(W, C), g.sm(W, C)
    o = g.ring(0, 0, W, C, (s, B, s, B))
    # inner mark: a short slash parallel to the big chamfers
    t = round(S * 0.78)
    ci, cy = W / 2, C / 2
    L = min(W - 2 * S, C - 2 * H) * 0.36
    sl = diag(ci - L / 2, cy - L * 0.75, ci + L / 2, cy + L * 0.75, t)
    return U(o, sl)


def d_one(g, W, base=True):
    S, H, C = g.S, g.H, g.C
    xs = round(W / 2 - S / 2 + 0.06 * W)
    fl = round(0.28 * W + 0.3 * S)
    flag = octa(xs - fl, C - round(1.1 * H) - 30, xs + 1, C, (0, 0, 0, round(0.9 * fl)))
    parts = [box(xs, 0, xs + S, C), flag]
    if base:
        parts.append(box(round(0.12 * W), 0, round(0.88 * W) + round(0.06 * W), H))
    return U(*parts)


def d_two(g, W):
    S, H3, C = g.S, g.H3, g.C
    ym0 = round(0.47 * C - H3 / 2)
    up = g.ring(0, ym0, W, C, (0, g.big(W, C - ym0), g.sm(W, C), g.big(W, C)), sy=H3)
    up = up.difference(box(-10, ym0 + H3, S + 10, C - H3))
    lo = g.ring(0, 0, W, ym0 + H3, (g.sm(W, C), 0, 0, g.sm(W, C)), sy=H3, open="r")
    lo = lo.difference(box(S, H3, W + 10, ym0))
    return U(up, lo, box(0, 0, W, H3))


def d_three(g, W):
    S, H3, C = g.S, g.H3, g.C
    r = g.ring(0, 0, W, C, (g.sm(W, C), g.big(W, C), g.sm(W, C), g.big(W, C)), sy=H3)
    r = r.difference(box(-10, H3, W - S, C - H3))
    ym = round(0.52 * C)
    mid = box(round(0.28 * W), ym - H3 / 2, W, ym + H3 / 2)
    return U(r, mid)


def d_four(g, W):
    S, H, C = g.S, g.H, g.C
    yb = round(0.30 * C)
    cup = g.ring(0, yb, W, C, (g.sm(W, C - yb), 0, 0, 0), open="t")
    cup = U(cup, octa(0, yb, S, C, (0, 0, 0, round(0.75 * S))))
    return U(cup, box(W - S, 0, W, C))


def d_five(g, W):
    S, H3, C = g.S, g.H3, g.C
    ym0 = round(0.53 * C - H3 / 2)
    top = U(box(0, ym0, S, C), octa(0, C - H3, W, C, (0, 0, 0, g.sm())))
    lo = g.ring(0, 0, W, ym0 + H3, (g.sm(W, C), g.big(W, ym0 + H3), g.sm(W, ym0 + H3), 0), sy=H3)
    lo = lo.difference(box(-10, H3, S + 10, ym0))
    return U(top, lo)


def d_six(g, W):
    S, H3, C = g.S, g.H3, g.C
    ym1 = round(0.56 * C + H3 / 2)
    lo = g.ring(0, 0, W, ym1, (g.sm(W, C), g.big(W, ym1), g.sm(W, ym1), 0), sy=H3)
    top = g.ring(0, 0, W, C, (0, 0, g.sm(W, C), g.big(W, C)), sy=H3, open="b")
    top = top.difference(box(S, -10, W + 10, C - H3))
    return U(lo, top)


def d_seven(g, W):
    S, H, C, t = g.S, g.H, g.C, g.t
    top = octa(0, C - H, W, C, (0, 0, g.sm(), round(0.85 * H)))
    tw = t / math.sin(math.atan2(C - H, W * 0.62)) / 2
    d = diag(W - tw, C - H / 2, round(W * 0.34) + tw, 0, t)
    return U(top, d).intersection(box(0, 0, W, C))


def d_eight(g, W):
    S, H3, C = g.S, g.H3, g.C
    ym0 = round(0.52 * C - H3 / 2)
    dx = round(0.05 * W)
    up = g.ring(dx, ym0, W - dx, C, (g.sm(W, C), g.big(W, C - ym0), g.sm(W, C), g.big(W, C - ym0)), sy=H3)
    lo = g.ring(0, 0, W, ym0 + H3, (g.sm(W, C), g.big(W, ym0), g.sm(W, C), g.big(W, ym0)), sy=H3)
    return U(up, lo)


def d_nine(g, W):
    S, H3, C = g.S, g.H3, g.C
    ym0 = round(0.44 * C - H3 / 2)
    up = g.ring(0, ym0, W, C, (g.sm(W, C), 0, g.sm(W, C), g.big(W, C - ym0)), sy=H3)
    bot = g.ring(0, 0, W, C, (g.sm(W, C), g.big(W, C), 0, 0), sy=H3, open="t")
    bot = bot.difference(box(-10, H3, W - S, C + 10))
    return U(up, bot)


DIGIT_FN = [d_zero, d_one, d_two, d_three, d_four, d_five, d_six, d_seven, d_eight, d_nine]


def make_digit(i, pnum):
    def fn(g):
        W = digit_w(g)
        if i == 1:
            geom = d_one(g, W, base=not pnum)
        else:
            geom = DIGIT_FN[i](g, W)
        x0, _, x1, _ = geom.bounds
        geom = T(geom, -x0)
        Wd = round(x1 - x0)
        if pnum:
            sb = g.sbV if i != 1 else round(g.sbV * 1.1)
            return geom, Wd, sb, sb
        adv = tab_adv(g)
        l = round((adv - Wd) / 2)
        return geom, Wd, l, adv - Wd - l
    return fn


for _i, _n in enumerate(DIGITS):
    gl(_n, 0x30 + _i)(make_digit(_i, False))
for _i, _n in enumerate(DIGITS):
    gl(_n + ".pnum")(make_digit(_i, True))


# ==========================================================================
# PUNCTUATION AND SYMBOLS
# ==========================================================================
AXIS = 330          # maths axis
HY = 285            # hyphen centre


@gl("space", 0x20)
def _space(g):
    return Polygon(), 0, round((260 + (g.S - REG_S) * 0.3) * (0.86 if g.cond else 1)), 0


@gl("uni00A0", 0xA0)
def _nbsp(g):
    return get(g, "space")


@gl("period", 0x2E)
def _period(g):
    return g.dot(0, 0), g.dw, g.sbV, g.sbV


def comma_shape(g):
    dw = g.dw
    tail = Polygon([(dw * 0.3, 1), (dw, 1), (dw * 0.55, -0.62 * dw - 20), (dw * 0.55 - 0.7 * dw, -0.62 * dw - 20)])
    return U(octa(0, 0, dw, g.dh, (0, 0, round(0.22 * dw), 0)), tail.intersection(box(-50, -400, dw, 10)))


@gl("comma", 0x2C)
def _comma(g):
    s = comma_shape(g)
    x0 = s.bounds[0]
    return T(s, -x0), round(s.bounds[2] - x0), g.sbV - 8, g.sbV


@gl("colon", 0x3A)
def _colon(g):
    return U(g.dot(0, 0), g.dot(0, g.X - g.dh)), g.dw, g.sbV, g.sbV


@gl("semicolon", 0x3B)
def _semicolon(g):
    s = comma_shape(g)
    x0 = s.bounds[0]
    return T(U(s, g.dot(0, g.X - g.dh)), -x0), round(s.bounds[2] - x0), g.sbV - 8, g.sbV


@gl("exclam", 0x21)
def _exclam(g):
    S = g.S
    x = (g.dw - S) / 2
    return U(box(x, g.dh + round(0.12 * g.C), x + S, g.C), g.dot(0, 0)), g.dw, g.sbV, g.sbV


@gl("exclamdown", 0xA1)
def _exclamdown(g):
    geom, W, l, r = get(g, "exclam")
    return T(flipy(geom, 0, g.C), 0, g.D), W, l, r


@gl("question", 0x3F)
def _question(g):
    S, H, C = g.S, g.H, g.C
    W = g.w(560, 2)
    yq = round(0.38 * C)
    r = g.ring(0, yq, W, C, (0, g.big(W, C - yq), g.sm(W, C - yq), g.big(W, C)))
    r = r.difference(box(-10, yq - 10, S + 10, C - H))
    xs = round((W - S) / 2)
    r = r.difference(box(-10, yq - 10, xs, yq + H + 1))
    st = box(xs, g.dh + round(0.12 * C), xs + S, yq + H)
    return U(r, st, g.dot(xs + (S - g.dw) / 2, 0)), W, g.sbV, g.sbO


@gl("questiondown", 0xBF)
def _questiondown(g):
    geom, W, l, r = get(g, "question")
    return T(affinity.rotate(geom, 180, origin=(W / 2, g.C / 2)), 0, g.D), W, r, l


@gl("quotesingle", 0x27)
def _quotesingle(g):
    w = round(g.S * 0.9)
    return box(0, g.C - round(0.3 * g.C), w, g.C), w, g.sbV, g.sbV


@gl("quotedbl", 0x22)
def _quotedbl(g):
    w = round(g.S * 0.9)
    gap = round(g.S * 0.8 + 30)
    h = round(0.3 * g.C)
    return U(box(0, g.C - h, w, g.C), box(w + gap, g.C - h, 2 * w + gap, g.C)), 2 * w + gap, g.sbV, g.sbV


def quote_shape(g, closing):
    s = comma_shape(g)
    s = T(s, -s.bounds[0])
    if not closing:
        s = affinity.rotate(s, 180, origin="center")
        s = T(s, -s.bounds[0])
    return T(s, 0, g.C - s.bounds[3])


@gl("quoteleft", 0x2018)
def _quoteleft(g):
    s = quote_shape(g, False)
    return s, round(s.bounds[2]), g.sbV, g.sbV - 8


@gl("quoteright", 0x2019)
def _quoteright(g):
    s = quote_shape(g, True)
    return s, round(s.bounds[2]), g.sbV - 8, g.sbV


@gl("quotesinglbase", 0x201A)
def _quotesinglbase(g):
    return get(g, "comma")


def double(g, s, gap_k=0.55):
    w = s.bounds[2]
    gap = round(g.S * gap_k + 22)
    return U(s, T(s, w + gap)), round(2 * w + gap)


@gl("quotedblleft", 0x201C)
def _quotedblleft(g):
    s, W = double(g, quote_shape(g, False))
    return s, W, g.sbV, g.sbV - 8


@gl("quotedblright", 0x201D)
def _quotedblright(g):
    s, W = double(g, quote_shape(g, True))
    return s, W, g.sbV - 8, g.sbV


@gl("quotedblbase", 0x201E)
def _quotedblbase(g):
    c, W0, l, r = get(g, "comma")
    s, W = double(g, c)
    return s, W, l, r


@gl("hyphen", 0x2D)
def _hyphen(g):
    W = round((300 + (g.S - REG_S) * 0.6) * (0.85 if g.cond else 1))
    return box(0, HY - g.H / 2, W, HY + g.H / 2), W, g.sbT + 6, g.sbT + 6


@gl("endash", 0x2013)
def _endash(g):
    W = round(500 * (0.85 if g.cond else 1))
    return box(0, HY - g.H / 2, W, HY + g.H / 2), W, 0, 0


@gl("emdash", 0x2014)
def _emdash(g):
    W = round(1000 * (0.85 if g.cond else 1))
    return box(0, HY - g.H / 2, W, HY + g.H / 2), W, 0, 0


def math_w(g):
    return digit_w(g)


def math_sb(g):
    adv = tab_adv(g)
    W = math_w(g)
    return round((adv - W) / 2), adv - W - round((adv - W) / 2)


@gl("minus", 0x2212)
def _minus(g):
    W = math_w(g)
    l, r = math_sb(g)
    return box(0, AXIS - g.H / 2, W, AXIS + g.H / 2), W, l, r


@gl("plus", 0x2B)
def _plus(g):
    W = math_w(g)
    l, r = math_sb(g)
    S, H = g.S, g.H
    x = (W - S) / 2
    return U(box(0, AXIS - H / 2, W, AXIS + H / 2), box(x, AXIS - W / 2, x + S, AXIS + W / 2)), W, l, r


@gl("plusminus", 0xB1)
def _plusminus(g):
    W = math_w(g)
    l, r = math_sb(g)
    S, H = g.S, g.H
    x = (W - S) / 2
    c = AXIS + 60
    return U(box(0, c - H / 2, W, c + H / 2), box(x, c - W * 0.42, x + S, c + W * 0.42),
             box(0, 0, W, H)), W, l, r


@gl("equal", 0x3D)
def _equal(g):
    W = math_w(g)
    l, r = math_sb(g)
    H = g.H
    gap = round(0.9 * H + 40)
    return U(box(0, AXIS - gap / 2 - H, W, AXIS - gap / 2), box(0, AXIS + gap / 2, W, AXIS + gap / 2 + H)), W, l, r


@gl("multiply", 0xD7)
def _multiply(g):
    W = round(math_w(g) * 0.84)
    adv = tab_adv(g)
    l = round((adv - W) / 2)
    t = round(g.S * 0.9)
    hw = t / math.sin(math.radians(45)) / 2
    h = W
    y0 = AXIS - h / 2
    s = U(diag(hw, y0 + h, W - hw, y0, t), diag(W - hw, y0 + h, hw, y0, t)).intersection(box(0, y0, W, y0 + h))
    return s, W, l, adv - W - l


@gl("divide", 0xF7)
def _divide(g):
    W = math_w(g)
    l, r = math_sb(g)
    H = g.H
    d = g.dw
    x = (W - d) / 2
    gap = round(0.5 * H + 40)
    return U(box(0, AXIS - H / 2, W, AXIS + H / 2), g.dot(x, AXIS + H / 2 + gap), g.dot(x, AXIS - H / 2 - gap - g.dh)), W, l, r


def chevron(g, W, h, t, yc):
    s = stroke([(W, yc + h / 2), (0, yc), (W, yc - h / 2)], t)
    return s.intersection(box(0, yc - h / 2, W, yc + h / 2))


@gl("less", 0x3C)
def _less(g):
    W = math_w(g)
    l, r = math_sb(g)
    return chevron(g, W, W * 1.0, g.S * 0.95, AXIS), W, l, r


@gl("greater", 0x3E)
def _greater(g):
    geom, W, l, r = get(g, "less")
    return flipx(geom, 0, W), W, r, l


def guil(g, W, h, yc):
    return chevron(g, W, h, round(g.S * 0.9), yc)


@gl("guilsinglleft", 0x2039)
def _guilsinglleft(g):
    W = round(0.42 * g.X + g.S * 0.4)
    return guil(g, W, round(0.62 * g.X), round(0.48 * g.X)), W, g.sbD + 12, g.sbD + 12


@gl("guilsinglright", 0x203A)
def _guilsinglright(g):
    geom, W, l, r = get(g, "guilsinglleft")
    return flipx(geom, 0, W), W, r, l


@gl("guillemotleft", 0xAB)
def _guillemotleft(g):
    geom, W, l, r = get(g, "guilsinglleft")
    gap = round(0.35 * W + g.S * 0.3)
    return U(geom, T(geom, W * 0.62 + gap * 0.4)), round(W * 1.62 + gap * 0.4), l, r


@gl("guillemotright", 0xBB)
def _guillemotright(g):
    geom, W, l, r = get(g, "guillemotleft")
    return flipx(geom, 0, W), W, r, l


@gl("slash", 0x2F)
def _slash(g):
    W = round(0.42 * g.C)
    t = round(g.S * 0.95)
    hw = t / math.sin(math.atan2(g.C + 120, W)) / 2
    return diag(hw, -60, W - hw, g.C + 60, t), W, g.sbD, g.sbD


@gl("backslash", 0x5C)
def _backslash(g):
    geom, W, l, r = get(g, "slash")
    return flipx(geom, 0, W), W, l, r


@gl("fraction", 0x2044)
def _fraction(g):
    geom, W, l, r = get(g, "slash")
    return geom, W, -round(W * 0.15), -round(W * 0.15)


@gl("bar", 0x7C)
def _bar(g):
    w = round(g.S * 0.9)
    return box(0, g.D, w, g.A + 20), w, g.sbV + 10, g.sbV + 10


@gl("brokenbar", 0xA6)
def _brokenbar(g):
    w = round(g.S * 0.9)
    m = (g.D + g.A) / 2
    return U(box(0, g.D, w, m - 50), box(0, m + 50, w, g.A + 20)), w, g.sbV + 10, g.sbV + 10


@gl("underscore", 0x5F)
def _underscore(g):
    W = round(520 * (0.85 if g.cond else 1))
    return box(0, -150, W, -150 + g.H), W, 0, 0


def paren(g, square):
    S, H = g.S, g.H
    W = S + round(0.55 * S + 70)
    y0, y1 = -150, g.C + 90
    c = 0 if square else round(0.72 * W)
    return g.ring(0, y0, W, y1, (c, 0, 0, c), open="r"), W


@gl("parenleft", 0x28)
def _parenleft(g):
    s, W = paren(g, False)
    return s, W, g.sbV + 6, g.sbT


@gl("parenright", 0x29)
def _parenright(g):
    s, W = paren(g, False)
    return flipx(s, 0, W), W, g.sbT, g.sbV + 6


@gl("bracketleft", 0x5B)
def _bracketleft(g):
    s, W = paren(g, True)
    return s, W, g.sbV + 6, g.sbT


@gl("bracketright", 0x5D)
def _bracketright(g):
    s, W = paren(g, True)
    return flipx(s, 0, W), W, g.sbT, g.sbV + 6


@gl("braceleft", 0x7B)
def _braceleft(g):
    S, H = g.S, g.H
    nub = round(0.45 * S + 50)
    s, W = paren(g, True)
    s = T(s, nub)
    ym = (-150 + g.C + 90) / 2
    n = box(0, ym - H / 2, nub + 1, ym + H / 2)
    return U(s, n), W + nub, g.sbV, g.sbT


@gl("braceright", 0x7D)
def _braceright(g):
    s, W, l, r = get(g, "braceleft")
    return flipx(s, 0, W), W, r, l


@gl("asterisk", 0x2A)
def _asterisk(g):
    R = round(0.24 * g.C)
    t = round(min(g.S * 0.85, 0.42 * R))
    cx, cy = R, g.C - R
    parts = []
    for ang in (90, 210, 330):
        a = math.radians(ang)
        parts.append(stroke([(cx - R * math.cos(a), cy - R * math.sin(a)), (cx + R * math.cos(a), cy + R * math.sin(a))], t))
    s = U(*parts)
    x0 = s.bounds[0]
    return T(s, -x0), round(s.bounds[2] - x0), g.sbV, g.sbV


@gl("numbersign", 0x23)
def _numbersign(g):
    S, H, C = g.S, g.H, g.C
    W = g.w(640, 2)
    tv = round(min(S * 0.9, 0.17 * W))
    th = round(min(H * 0.9, 0.15 * C))
    x1 = round(0.22 * W)
    x2 = W - x1 - tv
    y1, y2 = round(0.30 * C), round(0.66 * C)
    return U(box(x1, 0, x1 + tv, C), box(x2, 0, x2 + tv, C),
             box(0, y1 - th / 2, W, y1 + th / 2), box(0, y2 - th / 2, W, y2 + th / 2)), W, g.sbD + 10, g.sbD + 10


@gl("dollar", 0x24)
def _dollar(g):
    s, W, l, r = get(g, "S")
    S = g.S
    # compress the S a touch and add ticks top and bottom
    s = affinity.scale(s, 1, 0.86, origin=(0, 0))
    s = T(s, 0, round(0.07 * g.C))
    tv = round(S * 0.8)
    x = (W - tv) / 2
    return U(s, box(x, -90, x + tv, 10 + 0.07 * g.C), box(x, g.C - 0.07 * g.C - 10, x + tv, g.C + 90)), W, l, r


@gl("percent", 0x25)
def _percent(g):
    S = g.S
    W = g.w(820, 3)
    sx = round(S * 0.8)
    rw = round(0.36 * W)
    rh = round(0.42 * g.C)
    a = g.ring(0, g.C - rh, rw, g.C, (0, g.big(rw, rh), 0, g.big(rw, rh)), sx=sx, sy=sx)
    b = g.ring(W - rw, 0, W, rh, (0, g.big(rw, rh), 0, g.big(rw, rh)), sx=sx, sy=sx)
    t = round(S * 0.85)
    hw = t / math.sin(math.atan2(g.C, W * 0.56)) / 2
    d = diag(W * 0.22 + hw, 0, W * 0.78 - hw, g.C, t)
    return U(a, b, d), W, g.sbV, g.sbV


@gl("ampersand", 0x26)
def _ampersand(g):
    S, H, C, t = g.S, g.H3, g.C, g.t
    W = g.w(700, 2)
    yu = round(0.54 * C)
    xu0, xu1 = round(0.06 * W), round(0.66 * W)
    up = g.ring(xu0, yu, xu1, C, (0, 0, g.sm(), g.big(xu1 - xu0, C - yu)), sy=H)
    up = up.difference(box(xu0 + S, yu - 10, xu1 + 10, yu + H))
    lo = g.ring(0, 0, round(0.86 * W), yu + H, (g.sm(), g.big(W, yu), 0, 0), sy=H, open="t")
    lo = lo.difference(box(S, yu - H, round(0.86 * W) + 10, yu + H + 10))
    lo = lo.difference(box(round(0.86 * W) - S - 10, round(0.40 * C), W + 10, yu + 10))
    tw = t / math.sin(math.atan2(yu + H, W - xu0)) / 2
    leg = diag(xu0 + S + tw * 0.2, yu + H, W - tw, 0, round(t * 0.95)).intersection(box(0, 0, W, C))
    arm = box(round(0.86 * W) - S, round(0.40 * C) - 2, W, round(0.40 * C) + H)
    return U(up, lo, leg, arm), W, g.sbO, g.sbD


@gl("at", 0x40)
def _at(g):
    S, C = g.S, g.C
    W = g.w(900, 3)
    th = round(S * 0.78)
    y0, y1 = -130, C + 40
    outer = g.ring(0, y0, W, y1, (g.sm(), g.big(W, y1 - y0), g.sm(), g.big(W, y1 - y0)), sx=th, sy=th)
    ix0, ix1 = round(0.28 * W), round(0.72 * W)
    iy0, iy1 = round(0.12 * C), round(0.66 * C)
    inner = g.ring(ix0, iy0, ix1, iy1, (g.sm(), 0, 0, g.big(ix1 - ix0, iy1 - iy0)), sx=th, sy=th)
    outer = outer.difference(box(ix1 - th, y0 - 10, W + 10, iy0 + th))
    tail = box(ix1 - th, iy0, W, iy0 + th)
    stem = box(ix1 - th, iy0, ix1, iy1)
    return U(outer, inner, tail, stem), W, g.sbO, g.sbO


@gl("asciicircum", 0x5E)
def _asciicircum(g):
    W = round(math_w(g) * 0.9)
    h = round(0.36 * g.C)
    v = vee(0, W, 0, h, round(g.S * 0.85), round(g.S * 0.8))
    v = flipy(v, 0, h)
    return T(v, 0, g.C - h), W, g.sbD + 10, g.sbD + 10


@gl("asciitilde", 0x7E)
def _asciitilde(g):
    W = math_w(g)
    l, r = math_sb(g)
    return T(tilde_shape(g, W, round(0.26 * W), round(g.S * 0.85)), 0, AXIS - 0.13 * W), W, l, r


def tilde_shape(g, w, h, t):
    pts = [(-0.06 * w, 0), (0.24 * w, h), (0.40 * w, h), (0.60 * w, 0), (0.76 * w, 0), (1.06 * w, h)]
    s = stroke([(x, y + t / 2 * 0) for x, y in pts], t)
    return s.intersection(box(0, -t / 2, w, h + t / 2))


@gl("sterling", 0xA3)
def _sterling(g):
    S, H, C = g.S, g.H, g.C
    W = g.w(600, 2)
    xs = round(0.16 * W)
    hook = g.ring(xs, 0, W, C, (0, 0, g.sm(), g.big(W - xs, C)), open="b")
    hook = hook.difference(box(xs + S, -10, W + 10, C - H))
    yb = round(0.42 * C)
    bar = box(0, yb - H / 2, round(0.70 * W), yb + H / 2)
    base = box(0, 0, W, H)
    return U(hook, bar, base), W, g.sbT, g.sbV


@gl("Euro", 0x20AC)
def _Euro(g):
    S, H, C = g.S, g.H, g.C
    W = g.w(640, 2)
    ov = round(0.12 * W)
    c = g.ring(ov, 0, W, C, (g.sm(), g.big(W, C), g.sm(), g.big(W, C)))
    c = c.difference(box(W - S - 10, round(0.31 * C), W + 10, round(0.69 * C)))
    th = round(H * 0.8)
    y1, y2 = round(0.38 * C), round(0.60 * C)
    bars = U(box(0, y1 - th / 2, round(0.68 * W), y1 + th / 2), box(0, y2 - th / 2, round(0.74 * W), y2 + th / 2))
    return U(c, bars), W, g.sbT, g.sbT + 8


@gl("cent", 0xA2)
def _cent(g):
    s, W, l, r = get(g, "c")
    tv = round(g.S * 0.8)
    x = (W - tv) / 2 - W * 0.04
    return U(s, box(x, -100, x + tv, g.X + 100)), W, l, r


@gl("yen", 0xA5)
def _yen(g):
    s, W, l, r = get(g, "Y")
    H = round(g.H * 0.85)
    return U(s, box(round(0.12 * W), 0.30 * g.C - H / 2, round(0.88 * W), 0.30 * g.C + H / 2)), W, l, r


@gl("section", 0xA7)
def _section(g):
    s, W, l, r = get(g, "s")
    s2 = T(s, 0, -round(0.36 * g.X))
    return U(s, s2).intersection(box(0, -0.4 * g.X, W, g.X)), W, l, r


@gl("degree", 0xB0)
def _degree(g):
    sz = round(0.34 * g.C)
    th = round(min(g.S * 0.7, 0.24 * sz))
    r = g.ring(0, g.C - sz, sz, g.C, (0, g.big(sz), 0, g.big(sz)), sx=th, sy=th)
    return r, sz, g.sbV, g.sbV


def circled(g, inner_name):
    S = g.S
    W = round(0.86 * 1000 + (g.S - REG_S) * 0.6)
    if g.cond:
        W = round(W * 0.86)
    th = round(S * 0.62)
    y0, y1 = -20, g.C + 20
    outer = g.ring(0, y0, W, y1, (g.sm(), g.big(W, y1 - y0), g.sm(), g.big(W, y1 - y0)), sx=th, sy=th)
    return outer, W, th


@gl("copyright", 0xA9)
def _copyright(g):
    outer, W, th = circled(g, "c")
    S, C = g.S, g.C
    cw = round(0.42 * W)
    ch_ = round(0.46 * C)
    x0, y0 = (W - cw) / 2, (C - ch_) / 2
    c = g.ring(x0, y0, x0 + cw, y0 + ch_, (g.sm(), g.big(cw, ch_), g.sm(), g.big(cw, ch_)), sx=round(S * 0.7), sy=round(S * 0.62))
    c = c.difference(box(x0 + cw - S, y0 + ch_ * 0.32, x0 + cw + 10, y0 + ch_ * 0.68))
    return U(outer, c), W, g.sbO, g.sbO


@gl("registered", 0xAE)
def _registered(g):
    outer, W, th = circled(g, "R")
    S, C = g.S, g.C
    cw = round(0.40 * W)
    ch_ = round(0.48 * C)
    x0, y0 = (W - cw) / 2, (C - ch_) / 2
    sx, sy = round(S * 0.7), round(S * 0.62)
    yb = y0 + ch_ * 0.42
    bowl = g.ring(x0, yb, x0 + cw, y0 + ch_, (0, g.big(cw, ch_ * 0.6), g.sm(), 0), sx=sx, sy=sy)
    st = box(x0, y0, x0 + sx, y0 + ch_)
    t = round(sx * 0.95)
    hw = t / math.sin(math.atan2(yb - y0, cw * 0.5)) / 2
    leg = diag(x0 + cw * 0.45, yb + sy / 2, x0 + cw - hw, y0, t).intersection(box(x0, y0, x0 + cw, y0 + ch_))
    return U(outer, bowl, st, leg), W, g.sbO, g.sbO


@gl("bullet", 0x2022)
def _bullet(g):
    sz = round(0.42 * g.X + 0.3 * g.S)
    return octa(0, AXIS - sz / 2, sz, AXIS + sz / 2, (g.sm(sz, sz), g.big(sz), g.sm(sz, sz), g.big(sz))), sz, g.sbV, g.sbV


@gl("periodcentered", 0xB7)
def _periodcentered(g):
    return g.dot(0, HY - g.dh / 2), g.dw, g.sbV, g.sbV


@gl("ellipsis", 0x2026)
def _ellipsis(g):
    gap = round(g.dw * 0.9 + 40)
    s = U(g.dot(0, 0), g.dot(g.dw + gap, 0), g.dot(2 * (g.dw + gap), 0))
    return s, 3 * g.dw + 2 * gap, g.sbV, g.sbV


@gl("logicalnot", 0xAC)
def _logicalnot(g):
    W = math_w(g)
    l, r = math_sb(g)
    H, S = g.H, g.S
    return U(box(0, AXIS, W, AXIS + H), box(W - S, AXIS - 140, W, AXIS + H)), W, l, r


@gl("macron", 0xAF)
def _macron(g):
    W = round(0.5 * g.X)
    th = round(g.H * 0.8)
    return box(0, g.C + 60, W, g.C + 60 + th), W, g.sbV, g.sbV


@gl("ordfeminine", 0xAA)
def _ordfeminine(g):
    return ord_ind(g, "a")


@gl("ordmasculine", 0xBA)
def _ordmasculine(g):
    return ord_ind(g, "o")


def ord_ind(g, base):
    # a small superior letter drawn as its own ring, with a rule under it
    S = round(g.S * 0.72)
    H = round(g.H * 0.72)
    w = round(0.36 * g.C + (g.S - REG_S) * 0.4)
    h = round(0.38 * g.C)
    y0 = g.C - h
    if base == "o":
        s = g.ring(0, y0, w, g.C, (g.sm(), g.big(w, h), g.sm(), g.big(w, h)), sx=S, sy=H)
    else:
        s = g.ring(0, y0, w, g.C, (g.sm(), 0, g.sm(), g.big(w, h)), sx=S, sy=H)
        s = s.difference(box(-10, y0 + h * 0.55, S + 1, g.C - H))
        s = U(s, box(0, y0 + h * 0.55 - H / 2, w, y0 + h * 0.55 + H / 2))
    rule = box(0, y0 - H - 50, w, y0 - 50)
    return U(s, rule), w, g.sbV, g.sbV


@gl("mu", 0xB5)
def _mu(g):
    s, W, l, r = get(g, "u")
    return U(s, box(0, g.D, g.S, g.H)), W, l, r


@gl("paragraph", 0xB6)
def _paragraph(g):
    S, C = g.S, g.C
    W = g.w(600, 2)
    st1 = box(W - S, g.D, W, C)
    xs = round(W * 0.5)
    st2 = box(xs, g.D, xs + round(S * 0.8), C)
    bowl = octa(0, round(0.42 * C), xs + 1, C, (g.sm(), 0, 0, g.big(xs, C * 0.5)))
    return U(st1, st2, bowl, box(xs, C - g.H, W, C)), W, g.sbO, g.sbV


@gl("dagger", 0x2020)
def _dagger(g):
    W = g.w(480, 2)
    S, H = g.S, g.H
    x = (W - S) / 2
    return U(box(x, g.D + 40, x + S, g.C), box(0, g.C - 0.3 * g.C - H, W, g.C - 0.3 * g.C)), W, g.sbV, g.sbV


@gl("perthousand", 0x2030)
def _perthousand(g):
    s, W, l, r = get(g, "percent")
    S = g.S
    rw = round(0.36 * W)
    rh = round(0.42 * g.C)
    sx = round(S * 0.8)
    extra = g.ring(W + round(0.08 * W), 0, W + round(0.08 * W) + rw, rh, (0, g.big(rw, rh), 0, g.big(rw, rh)), sx=sx, sy=sx)
    return U(s, extra), W + round(0.08 * W) + rw, l, r


# ==========================================================================
# EXTRA LETTERS
# ==========================================================================
@gl("ae", 0xE6)
def _ae(g):
    a, Wa, l, _ = get(g, "a")
    e, We, _, r = get(g, "e")
    return U(a, T(e, Wa - g.S)), Wa - g.S + We, l, r


@gl("AE", 0xC6)
def _AE(g):
    S, H, H3, C = g.S, g.H, g.H3, g.C
    Wa = g.w(560, 2)
    Ba = round(0.4 * Wa)
    left = g.ring(0, 0, Wa, C, (0, 0, 0, Ba), open="b")
    ya = round(0.36 * C)
    E, We, _, r = get(g, "E")
    e = T(E, Wa - S)
    return U(left, box(0, ya, Wa, ya + H), e), Wa - S + We, g.sbC, r


@gl("oe", 0x153)
def _oe(g):
    o, Wo, l, _ = get(g, "o")
    e, We, _, r = get(g, "e")
    return U(o, T(e, Wo - g.S)), Wo - g.S + We, l, r


@gl("OE", 0x152)
def _OE(g):
    o, Wo, l, _ = get(g, "O")
    E, We, _, r = get(g, "E")
    o = o.difference(box(Wo - g.S, -1, Wo + 10, g.C + 1))
    return U(o, T(E, Wo - g.S)), Wo - g.S + We, l, r


@gl("germandbls", 0xDF)
def _germandbls(g):
    S, H3, A = g.S, g.H3, g.A
    W = g.w(560, 2)
    ym = round(0.50 * A)
    Wu = W - round(0.10 * W)
    up = g.ring(0, ym - H3 // 2, Wu, A, (0, g.sm(Wu, A - ym), g.sm(Wu, A - ym), g.big(Wu, A - ym)), sy=H3)
    up = up.difference(box(S, ym - H3, round(0.42 * W), ym + H3))
    up = U(up, box(round(0.42 * W), ym - H3 // 2, Wu, ym + H3 // 2))
    lo = g.ring(0, 0, W, ym + H3 // 2, (0, g.big(W, ym), g.sm(W, ym), 0), sy=H3)
    lo = lo.difference(box(-10, -10, round(0.42 * W), ym + H3))
    return U(up, lo, box(0, 0, S, A - 20)), W, g.sbV, g.sbO


@gl("eth", 0xF0)
def _eth(g):
    S, H, X, A, t = g.S, g.H, g.X, g.A, g.t
    W = g.w(570, 2)
    B, s = g.big(W, X), g.sm(W, X)
    o = g.ring(0, 0, W, X, (s, B, 0, B))
    st = octa(W - S, X - H, W, A, (0, 0, 0, round(0.7 * S)))
    yc = round(X + 0.45 * (A - X))
    cross = diag(W - S * 1.6, yc - 60, W + S * 0.3, yc + 60, round(H * 0.8))
    return U(o, st, cross).intersection(box(-10, 0, W + S * 0.3, A)), W, g.sbO, g.sbV - 10


@gl("Eth", 0xD0)
def _Eth(g):
    s, W, l, r = get(g, "D")
    ov = round(0.12 * W)
    ym = g.C / 2
    H = round(g.H * 0.9)
    return U(T(s, ov), box(0, ym - H / 2, ov + round(0.4 * W), ym + H / 2)), W + ov, round(l * 0.4), r


@gl("thorn", 0xFE)
def _thorn(g):
    S, H, X, A, D = g.S, g.H, g.X, g.A, g.D
    W = g.w(570, 2)
    bowl = g.ring(0, 0, W, X, (0, g.big(W, X), g.sm(W, X), 0))
    return U(bowl, box(0, D, S, A)), W, g.sbV, g.sbO


@gl("Thorn", 0xDE)
def _Thorn(g):
    S, C = g.S, g.C
    W = g.w(620, 2)
    y0, y1 = round(0.18 * C), round(0.80 * C)
    bowl = g.ring(0, y0, W, y1, (0, g.big(W, y1 - y0), g.sm(), 0))
    return U(bowl, box(0, 0, S, C)), W, g.sbC, g.sbO


@gl("Oslash", 0xD8)
def _Oslash(g):
    o, W, l, r = get(g, "O")
    t = round(g.S * 0.8)
    hw = t / math.sin(math.atan2(g.C, W)) / 2
    sl = diag(-W * 0.03 + hw, -0.03 * g.C, W * 1.03 - hw, g.C * 1.03, t)
    return U(o, sl), W, l, r


@gl("oslash", 0xF8)
def _oslash(g):
    o, W, l, r = get(g, "o")
    t = round(g.S * 0.8)
    hw = t / math.sin(math.atan2(g.X, W)) / 2
    sl = diag(-W * 0.04 + hw, -0.05 * g.X, W * 1.04 - hw, g.X * 1.05, t)
    return U(o, sl), W, l, r


# ==========================================================================
# ACCENTS (built as geometric unions, no components)
# ==========================================================================
def mark(g, kind, cap):
    """Mark geometry centred on x=0, bottom on y=0."""
    t = round(g.S * 0.74 + 10)
    h = 108 if cap else 124
    if kind == "acute":
        a = h * 0.42
        return diag(-a, 0, a, h, t)
    if kind == "grave":
        a = h * 0.42
        return diag(a, 0, -a, h, t)
    if kind == "circumflex":
        w = h * 2.1 + t * 0.6
        v = vee(-w / 2, w / 2, 0, h, round(t * 0.9), round(t * 0.85))
        return flipy(v, 0, h)
    if kind == "caron":
        w = h * 2.1 + t * 0.6
        return vee(-w / 2, w / 2, 0, h, round(t * 0.9), round(t * 0.85))
    if kind == "dieresis":
        d = g.dw
        gap = round(d * 0.75 + 34)
        return U(g.dot(-gap / 2 - d, 0, d, min(g.dh, h + 10)), g.dot(gap / 2, 0, d, min(g.dh, h + 10)))
    if kind == "ring":
        w = round(h * 1.25 + t * 0.4)
        th = round(t * 0.78)
        return g.ring(-w / 2, 0, w / 2, h + 8, (0, g.big(w, h), 0, g.big(w, h)), sx=th, sy=th)
    if kind == "tilde":
        w = round(h * 2.4 + t * 0.4)
        th = round(t * 0.82)
        s = tilde_shape(g, w, round(h * 0.7), th)
        return T(s, -w / 2, th / 2)
    if kind == "cedilla":
        th = round(t * 0.9)
        st = box(-th / 2, -150, th / 2, 10)
        bar = octa(-th / 2 - round(0.5 * h + 10), -150, th / 2, -150 + th, (round(0.6 * th), 0, 0, 0))
        return U(st, bar)
    raise KeyError(kind)


def mark_y(g, cap):
    return g.C + 50 if cap else g.X + round(0.14 * g.X)


ACCENTS = {
    "grave": 0x300, "acute": 0x301, "circumflex": 0x302, "tilde": 0x303,
    "dieresis": 0x308, "ring": 0x30A, "caron": 0x30C, "cedilla": 0x327,
}

COMPOSITES = [
    # name, unicode, base, mark
    ("Agrave", 0xC0, "A", "grave"), ("Aacute", 0xC1, "A", "acute"), ("Acircumflex", 0xC2, "A", "circumflex"),
    ("Atilde", 0xC3, "A", "tilde"), ("Adieresis", 0xC4, "A", "dieresis"), ("Aring", 0xC5, "A", "ring"),
    ("Ccedilla", 0xC7, "C", "cedilla"),
    ("Egrave", 0xC8, "E", "grave"), ("Eacute", 0xC9, "E", "acute"), ("Ecircumflex", 0xCA, "E", "circumflex"),
    ("Edieresis", 0xCB, "E", "dieresis"),
    ("Igrave", 0xCC, "I", "grave"), ("Iacute", 0xCD, "I", "acute"), ("Icircumflex", 0xCE, "I", "circumflex"),
    ("Idieresis", 0xCF, "I", "dieresis"),
    ("Ntilde", 0xD1, "N", "tilde"),
    ("Ograve", 0xD2, "O", "grave"), ("Oacute", 0xD3, "O", "acute"), ("Ocircumflex", 0xD4, "O", "circumflex"),
    ("Otilde", 0xD5, "O", "tilde"), ("Odieresis", 0xD6, "O", "dieresis"),
    ("Ugrave", 0xD9, "U", "grave"), ("Uacute", 0xDA, "U", "acute"), ("Ucircumflex", 0xDB, "U", "circumflex"),
    ("Udieresis", 0xDC, "U", "dieresis"),
    ("Yacute", 0xDD, "Y", "acute"), ("Ydieresis", 0x178, "Y", "dieresis"),
    ("Scaron", 0x160, "S", "caron"), ("Zcaron", 0x17D, "Z", "caron"),
    ("agrave", 0xE0, "a", "grave"), ("aacute", 0xE1, "a", "acute"), ("acircumflex", 0xE2, "a", "circumflex"),
    ("atilde", 0xE3, "a", "tilde"), ("adieresis", 0xE4, "a", "dieresis"), ("aring", 0xE5, "a", "ring"),
    ("ccedilla", 0xE7, "c", "cedilla"),
    ("egrave", 0xE8, "e", "grave"), ("eacute", 0xE9, "e", "acute"), ("ecircumflex", 0xEA, "e", "circumflex"),
    ("edieresis", 0xEB, "e", "dieresis"),
    ("igrave", 0xEC, "dotlessi", "grave"), ("iacute", 0xED, "dotlessi", "acute"),
    ("icircumflex", 0xEE, "dotlessi", "circumflex"), ("idieresis", 0xEF, "dotlessi", "dieresis"),
    ("ntilde", 0xF1, "n", "tilde"),
    ("ograve", 0xF2, "o", "grave"), ("oacute", 0xF3, "o", "acute"), ("ocircumflex", 0xF4, "o", "circumflex"),
    ("otilde", 0xF5, "o", "tilde"), ("odieresis", 0xF6, "o", "dieresis"),
    ("ugrave", 0xF9, "u", "grave"), ("uacute", 0xFA, "u", "acute"), ("ucircumflex", 0xFB, "u", "circumflex"),
    ("udieresis", 0xFC, "u", "dieresis"),
    ("yacute", 0xFD, "y", "acute"), ("ydieresis", 0xFF, "y", "dieresis"),
    ("scaron", 0x161, "s", "caron"), ("zcaron", 0x17E, "z", "caron"),
]

SPACING_MARKS = [("grave", 0x60, "grave"), ("acute", 0xB4, "acute"), ("dieresis", 0xA8, "dieresis"),
                 ("cedilla", 0xB8, "cedilla")]


def make_composite(base, kind):
    def fn(g):
        geom, W, l, r = get(g, base)
        cap = base[0].isupper()
        m = mark(g, kind, cap)
        if kind == "cedilla":
            xc = W / 2 + (0 if not cap else 0)
            m = T(m, xc, 0)
        else:
            xc = W / 2
            if base in ("a",):
                xc = W / 2 + g.S * 0.1
            m = T(m, xc, mark_y(g, cap))
        mx0, _, mx1, _ = m.bounds
        off = -min(0.0, mx0)
        over = max(0.0, mx1 - W)
        geom = T(U(geom, m), off)
        W2 = round(W + off + over)
        return geom, W2, max(round(l - off), 12), max(round(r - over), 12)
    return fn


for _name, _u, _base, _mk in COMPOSITES:
    gl(_name, _u)(make_composite(_base, _mk))


def make_spacing_mark(kind):
    def fn(g):
        m = mark(g, kind, False)
        if kind != "cedilla":
            m = T(m, 0, mark_y(g, False))
        x0, _, x1, _ = m.bounds
        return T(m, -x0), round(x1 - x0), g.sbV, g.sbV
    return fn


for _name, _u, _kind in SPACING_MARKS:
    gl(_name, _u)(make_spacing_mark(_kind))


@gl(".notdef")
def _notdef(g):
    W = 500
    th = 50
    return g.ring(0, 0, W, g.C, (0, 0, 0, 0), sx=th, sy=th), W, 50, 50


# ==========================================================================
# Hatch cut
# ==========================================================================
def hatch(g, geom):
    if geom.is_empty:
        return geom
    S = g.S
    period, gap = 56, 21
    t_in = round(0.2 * S)
    inner = geom.buffer(-t_in, join_style="mitre", mitre_limit=10)
    zone = inner.intersection(box(-2000, -2000, 4000, WATER))
    if zone.is_empty:
        return geom
    x0, y0, x1, y1 = zone.bounds
    bands = []
    w = gap * math.sqrt(2)
    lo = int((x0 - y1) // (period * math.sqrt(2))) - 2
    hi = int((x1 - y0) // (period * math.sqrt(2))) + 2
    for k in range(lo, hi + 1):
        c = k * period * math.sqrt(2)
        if HATCH_DIR == "/":
            # x - y = c  ..  c + w
            bands.append(Polygon([(c + y0 - 10, y0 - 10), (c + w + y0 - 10, y0 - 10), (c + w + y1 + 10, y1 + 10), (c + y1 + 10, y1 + 10)]))
        else:
            # x + y = c .. c + w
            bands.append(Polygon([(c - y0 + 10, y0 - 10), (c + w - y0 + 10, y0 - 10), (c + w - y1 - 10, y1 + 10), (c - y1 - 10, y1 + 10)]))
    cut = zone.intersection(U(*bands))
    keep = [p for p in polys(cut) if p.area > gap * gap * 1.4 and p.minimum_rotated_rectangle.length > 0]
    good = []
    for p in keep:
        mrr = p.minimum_rotated_rectangle
        xs, ys = mrr.exterior.coords.xy
        e1 = math.hypot(xs[1] - xs[0], ys[1] - ys[0])
        e2 = math.hypot(xs[2] - xs[1], ys[2] - ys[1])
        if min(e1, e2) >= gap * 0.8:
            good.append(p)
    if not good:
        return geom
    return geom.difference(U(*good))


# ==========================================================================
# Build
# ==========================================================================
def finalize(geom):
    geom = geom.buffer(0)
    geom = shapely.set_precision(geom, 1.0)
    geom = geom.simplify(0.5)
    ps = [orient(p, 1.0) for p in polys(geom) if p.area > 20]
    return MultiPolygon(ps) if ps else Polygon()


def contours(geom, tt):
    out = []
    for p in polys(geom):
        for ring in [p.exterior] + list(p.interiors):
            pts = [(int(round(x)), int(round(y))) for x, y in list(ring.coords)[:-1]]
            if len(pts) < 3:
                continue
            if tt:
                pts = pts[::-1]
            out.append(pts)
    return out


def draw(pen, cs):
    for pts in cs:
        pen.moveTo(pts[0])
        for p in pts[1:]:
            pen.lineTo(p)
        pen.closePath()


def build_glyphs(weight, cond, hatched):
    g = G(weight, cond)
    out = {}
    for name in ORDER:
        geom, W, l, r = get(g, name)
        geom = T(geom, l)
        adv = int(round(l + W + r))
        out[name] = [geom, adv]
    raw = {k: (v[0], v[1]) for k, v in out.items()}
    for name in out:
        geom = out[name][0]
        if hatched and not geom.is_empty and name not in (".notdef",):
            geom = hatch(g, geom)
        out[name][0] = finalize(geom)
    return g, out, raw


# ---------------- automatic kerning from side profiles ----------------
KERN_LEFT_EXCLUDE = set(DIGITS)
TAB_SET = set(DIGITS) | {"comma", "period", "colon", "sterling", "Euro", "dollar", "minus", "hyphen",
                         "plus", "percent", "slash", "space", "uni00A0", "equal", "multiply", "divide"}


def side_profiles(raw, names, ys, win):
    L = np.full((len(names), len(ys)), np.nan)
    R = np.full((len(names), len(ys)), np.nan)
    lines = [LineString([(-3000, y), (5000, y)]) for y in ys]
    for i, n in enumerate(names):
        geom, adv = raw[n]
        if geom.is_empty:
            continue
        gb = geom.buffer(0)
        for j, ln in enumerate(lines):
            seg = gb.intersection(ln)
            if seg.is_empty:
                continue
            b = seg.bounds
            L[i, j] = b[0]
            R[i, j] = adv - b[2]
    # dilate vertically: within +-win rows take the closest ink
    k = int(win)
    Ld, Rd = L.copy(), R.copy()
    for s in range(1, k + 1):
        Ld[:, s:] = np.fmin(Ld[:, s:], L[:, :-s])
        Ld[:, :-s] = np.fmin(Ld[:, :-s], L[:, s:])
        Rd[:, s:] = np.fmin(Rd[:, s:], R[:, :-s])
        Rd[:, :-s] = np.fmin(Rd[:, :-s], R[:, s:])
    return L, R, Ld, Rd


KERN_PUNCT = ["period", "comma", "colon", "semicolon", "quotesingle", "quotedbl", "quoteleft", "quoteright",
              "quotedblleft", "quotedblright", "quotesinglbase", "quotedblbase", "hyphen", "endash", "emdash",
              "parenleft", "parenright", "bracketleft", "bracketright", "braceleft", "braceright", "slash",
              "question", "exclam", "guillemotleft", "guillemotright", "guilsinglleft", "guilsinglright",
              "ellipsis", "ampersand", "asterisk"]


def kern_base(name):
    for n, _u, base, _m in COMPOSITES:
        if n == name:
            return base if base != "dotlessi" else "i"
    return name


def compute_kerning(g, raw):
    """Profile-based kerning, then grouped by base letter so files stay small.

    For every pair the side profiles (closest ink per 10 unit row, dilated
    70 units up and down) give a gap curve. The kern pulls the average gap
    towards the n|n gap and never lets the closest point get tighter than
    0.42 of it. Accented letters share their base's class; a class pair takes
    the gentlest value of its members so marks never clash with overhangs.
    Tabular figures are never kerned, so money columns stay aligned.
    """
    names = [n for n in ORDER if (n[:1].isalpha() and len(n) > 0 and n not in DIGITS and not n.endswith(".pnum")
                                  and n not in KERN_PUNCT and n not in ("dotlessi",) and GLYPHS[n][0]
                                  and (chr(GLYPHS[n][0][0]).isalpha()))] + KERN_PUNCT
    names = [n for n in names if n in GLYPHS]
    step = 10
    ys = np.arange(DESC - 40, 960, step)
    L, R, Ld, Rd = side_profiles(raw, names, ys, win=round(70 / step))
    ref = 2 * g.sbV
    n = len(names)
    big = 1e6
    Rn = np.where(np.isnan(R), big, R)[:, None, :]
    Rdn = np.where(np.isnan(Rd), big, Rd)[:, None, :]
    Ln = np.where(np.isnan(L), big, L)[None, :, :]
    Ldn = np.where(np.isnan(Ld), big, Ld)[None, :, :]
    d = np.minimum(Rn + Ldn, Rdn + Ln)                      # (n, n, rows)
    valid = d < big / 2
    both = (~np.isnan(R))[:, None, :] & (~np.isnan(L))[None, :, :]
    cnt = valid.sum(axis=2)
    dmin = np.where(valid, d, big).min(axis=2)
    cap = ref + 260
    dmean = np.where(valid, np.minimum(d, cap), 0).sum(axis=2) / np.maximum(cnt, 1)
    # lower case against lower case: gentler, never positive, and never
    # closer than 0.66 of the n|n gap at the nearest point (keeps rn from m)
    lc = np.array([nm[:1].islower() for nm in names])
    both_lc = lc[:, None] & lc[None, :]
    fac = np.where(both_lc, 0.35, 0.5)
    floor = np.where(both_lc, 0.66, 0.42) * ref
    k = -(dmean - ref) * fac
    k = np.maximum(k, -(dmin - floor))
    k = np.where(both_lc, np.minimum(k, 0), k)
    k = np.where(dmin < 0.3 * ref, np.maximum(k, 0.3 * ref - dmin), k)
    k = np.clip(k, -200, 80)
    k = np.where((cnt >= 4) & (both.sum(axis=2) >= 4), k, 0)
    k = np.round(k / 5) * 5
    k[np.abs(k) < 20] = 0
    # group by base letter, gentlest member value wins
    bases = []
    for nm in names:
        b = kern_base(nm)
        if b not in bases:
            bases.append(b)
    bidx = {b: [i for i, nm in enumerate(names) if kern_base(nm) == b] for b in bases}
    nb = len(bases)
    K = np.zeros((nb, nb))
    for a, ba in enumerate(bases):
        for c, bc in enumerate(bases):
            sub = k[np.ix_(bidx[ba], bidx[bc])]
            if (sub > 0).any() and (sub < 0).any():
                continue
            K[a, c] = sub.flat[np.abs(sub).argmin()]
    # merge identical rows / columns into classes
    def merge(M):
        groups = {}
        for i in range(M.shape[0]):
            groups.setdefault(tuple(M[i]), []).append(i)
        return list(groups.values())
    lgroups = [g_ for g_ in merge(K) if np.any(K[g_[0]] != 0)]
    rgroups = [g_ for g_ in merge(K.T) if np.any(K[:, g_[0]] != 0)]
    pairs = {}
    for lg in lgroups:
        lm = tuple(i for b in lg for i in bidx[bases[b]])
        for rg in rgroups:
            v = int(K[lg[0], rg[0]])
            if v:
                rm = tuple(i for b in rg for i in bidx[bases[b]])
                pairs[(lm, rm)] = v
    return names, pairs


def fea_text(g, names, pairs):
    lines = ["languagesystem DFLT dflt;", "languagesystem latn dflt;", ""]
    tab = " ".join(DIGITS)
    prop = " ".join(d + ".pnum" for d in DIGITS)
    lines += [f"@tab = [{tab}];", f"@prop = [{prop}];",
              "feature pnum { sub @tab by @prop; } pnum;",
              "feature tnum { sub @prop by @tab; } tnum;", ""]
    used_l, used_r = {}, {}
    body = []
    for (a, b), k in sorted(pairs.items()):
        if a not in used_l:
            used_l[a] = f"@kL{len(used_l)}"
        if b not in used_r:
            used_r[b] = f"@kR{len(used_r)}"
    for a, cn in used_l.items():
        lines.append(f"{cn} = [{' '.join(names[i] for i in a)}];")
    for b, cn in used_r.items():
        lines.append(f"{cn} = [{' '.join(names[i] for i in b)}];")
    lines.append("feature kern {")
    for (a, b), k in sorted(pairs.items(), key=lambda kv: (used_l[kv[0][0]], used_r[kv[0][1]])):
        lines.append(f"  pos {used_l[a]} {used_r[b]} {k};")
    lines.append("} kern;")
    return "\n".join(lines) + "\n"


def style_names(key, weight, cond, hatched):
    sub = weight
    if hatched:
        fam_typo = f"{FAMILY} Condensed Hatch" if cond else f"{FAMILY} Hatch"
        ps_fam = f"{PS_FAMILY}CondensedHatch" if cond else f"{PS_FAMILY}Hatch"
    else:
        fam_typo = f"{FAMILY} Condensed" if cond else FAMILY
        ps_fam = f"{PS_FAMILY}Condensed" if cond else PS_FAMILY
    if weight in ("Regular", "Bold"):
        fam1, sub1 = fam_typo, weight
    else:
        fam1, sub1 = f"{fam_typo} {weight}", "Regular"
    full = f"{fam_typo} {weight}" if weight != "Regular" else f"{fam_typo} Regular"
    ps = f"{ps_fam}-{weight}"
    fslug = SLUG + "-" + ("condensed-" if cond else "") + ("hatch-" if hatched else "") + weight.lower()
    if hatched and cond:
        fslug = f"{SLUG}-condensed-hatch-{weight.lower()}"
    return dict(familyName=fam1, styleName=sub1, typographicFamily=fam_typo, typographicSubfamily=sub,
                fullName=full, psName=ps, file=fslug)


def build_style(key, weight, cond, hatched, outdir):
    g, glyphs, raw = build_glyphs(weight, cond, hatched)
    nm = style_names(key, weight, cond, hatched)
    order = [".notdef"] + [n for n in ORDER if n != ".notdef"]
    cmap = {}
    for n in order:
        for u in GLYPHS[n][0]:
            cmap[u] = n
    names_k, pairs = compute_kerning(g, raw)
    fea = fea_text(g, names_k, pairs)

    ymax = max(glyphs[n][0].bounds[3] for n in order if not glyphs[n][0].is_empty)
    ymin = min(glyphs[n][0].bounds[1] for n in order if not glyphs[n][0].is_empty)
    win_asc = int(max(TYPO_ASC, math.ceil(ymax)))
    win_desc = int(max(-TYPO_DESC, math.ceil(-ymin)))

    name_strings = dict(
        copyright=COPYRIGHT,
        familyName=nm["familyName"],
        styleName=nm["styleName"],
        uniqueFontIdentifier=f"{VERSION};{VENDOR};{nm['psName']}",
        fullName=nm["fullName"],
        version=f"Version {VERSION}",
        psName=nm["psName"],
        manufacturer=MANUFACTURER,
        designer=DESIGNER,
        description=f"{FAMILY}: a squared, chamfered brand face for Vault-It.",
        licenseDescription=LICENCE,
        licenseInfoURL=LICENCE_URL,
        typographicFamily=nm["typographicFamily"],
        typographicSubfamily=nm["typographicSubfamily"],
    )
    results = {}
    for tt in (False, True):
        fb = FontBuilder(UPM, isTTF=tt)
        fb.setupGlyphOrder(order)
        fb.setupCharacterMap(cmap)
        metrics = {}
        if tt:
            gl_ = {}
            for n in order:
                pen = TTGlyphPen(None)
                draw(pen, contours(glyphs[n][0], True))
                gl_[n] = pen.glyph()
            fb.setupGlyf(gl_)
        else:
            cs = {}
            for n in order:
                pen = T2CharStringPen(glyphs[n][1], None)
                draw(pen, contours(glyphs[n][0], False))
                cs[n] = pen.getCharString()
            fb.setupCFF(nm["psName"], {"FullName": nm["fullName"], "FamilyName": nm["typographicFamily"],
                                       "Weight": weight, "Notice": COPYRIGHT, "version": VERSION}, cs, {})
        for n in order:
            geom, adv = glyphs[n]
            lsb = int(math.floor(geom.bounds[0])) if not geom.is_empty else 0
            metrics[n] = (adv, lsb)
        fb.setupHorizontalMetrics(metrics)
        # hhea matches the typo metrics (line height 1.2); win covers every glyph
        fb.setupHorizontalHeader(ascent=max(TYPO_ASC, win_asc), descent=min(TYPO_DESC, -win_desc), lineGap=0)
        fb.setupNameTable(name_strings, mac=False)
        fs = 0
        if weight == "Bold":
            fs |= 1 << 5
        else:
            fs |= 1 << 6
        fs |= 1 << 7  # USE_TYPO_METRICS
        fb.setupOS2(version=4, usWeightClass=WEIGHTS[weight]["cls"], usWidthClass=3 if cond else 5,
                    fsType=0, achVendID=VENDOR, fsSelection=fs,
                    sTypoAscender=TYPO_ASC, sTypoDescender=TYPO_DESC, sTypoLineGap=0,
                    usWinAscent=win_asc, usWinDescent=win_desc,
                    sxHeight=XH, sCapHeight=CAP, ulCodePageRange1=(1 << 0) | (1 << 29), ulCodePageRange2=0,
                    usDefaultChar=0, usBreakChar=32, usMaxContext=2)
        fb.setupPost(underlinePosition=-130, underlineThickness=round(g.H * 0.8))
        if tt:
            fb.setupMaxp()
        fb.setupDummyDSIG() if False else None
        fb.addOpenTypeFeatures(fea)
        f = fb.font
        f["head"].fontRevision = float(VERSION)
        f["head"].macStyle = 1 if weight == "Bold" else 0
        f["OS/2"].recalcUnicodeRanges(f)
        f["OS/2"].recalcAvgCharWidth(f)
        f["OS/2"].panose.bFamilyType = 2
        f["OS/2"].panose.bWeight = {300: 4, 400: 5, 700: 8}[WEIGHTS[weight]["cls"]]
        f["OS/2"].panose.bProportion = 6 if cond else 3
        ext = "ttf" if tt else "otf"
        path = outdir / ext / f"{nm['file']}.{ext}"
        path.parent.mkdir(parents=True, exist_ok=True)
        fb.save(str(path))
        results[ext] = path
    return nm, results, len(order), len(pairs)


def hint_and_compress(ttf_path, outdir):
    """Autohint the TrueType file (if ttfautohint-py is installed) and write WOFF2."""
    try:
        import ttfautohint
        data = ttfautohint.ttfautohint(in_file=str(ttf_path), hinting_range_min=8, hinting_range_max=50,
                                       hinting_limit=200, increase_x_height=14, windows_compatibility=True,
                                       no_info=True, default_script="latn", fallback_script="none")
        ttf_path.write_bytes(data)
        hinted = True
    except ImportError:
        hinted = False
    f = TTFont(str(ttf_path))
    f.flavor = "woff2"
    w = outdir / "woff2" / (ttf_path.stem + ".woff2")
    w.parent.mkdir(parents=True, exist_ok=True)
    f.save(str(w))
    return w, hinted


OFL_BODY = """
This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is copied below, and is also available with a FAQ at:
https://openfontlicense.org


-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) and the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.
"""


def write_ofl():
    (ROOT / "OFL.txt").write_text(COPYRIGHT + "\n" + OFL_BODY.lstrip("\n"))


def write_css():
    out = [f"/* {FAMILY} type family. PT Live Design for Vault-It.",
           "   Licence: SIL Open Font License 1.1, see OFL.txt. Self-hosted: keep these paths relative.",
           "   Generated by source/build_vault_form.py. */", ""]
    for key, w, cond, hatched in STYLES:
        nm = style_names(key, w, cond, hatched)
        out += ["@font-face {",
                f'  font-family: "{nm["typographicFamily"]}";',
                f'  src: url("woff2/{nm["file"]}.woff2") format("woff2"),',
                f'       url("ttf/{nm["file"]}.ttf") format("truetype");',
                f"  font-weight: {WEIGHTS[w]['cls']};",
                "  font-style: normal;",
                "  font-display: swap;",
                "}", ""]
    F = FAMILY
    out += [":root {",
            "  /* Fallback stacks per use. DM Sans stays the body face. */",
            f'  --font-vf-display: "{F}", "Syne", "Segoe UI", system-ui, -apple-system, sans-serif;',
            f'  --font-vf-condensed: "{F} Condensed", "{F}", "Arial Narrow", "Segoe UI", system-ui, sans-serif;',
            f'  --font-vf-figures: "{F}", "Share Tech Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;',
            f'  --font-vf-label: "{F} Condensed", "Share Tech Mono", ui-monospace, monospace;',
            f'  --font-vf-hatch: "{F} Hatch", "{F}", "Syne", system-ui, sans-serif;',
            f'  --font-vf-hatch-condensed: "{F} Condensed Hatch", "{F} Condensed", "{F}", system-ui, sans-serif;',
            "}", "",
            "/* Helpers. Figures are tabular by default; .vf-pnum switches to proportional. */",
            ".vf-display { font-family: var(--font-vf-display); font-weight: 700; }",
            ".vf-figures { font-family: var(--font-vf-figures); font-variant-numeric: tabular-nums lining-nums; }",
            ".vf-pnum { font-variant-numeric: proportional-nums; }",
            ".vf-label { font-family: var(--font-vf-label); font-weight: 400; text-transform: uppercase; letter-spacing: 0.06em; }",
            ".vf-hatch { font-family: var(--font-vf-hatch); font-weight: 700; } /* 48 px and up only */",
            ""]
    (ROOT / f"{SLUG}.css").write_text("\n".join(out))


def render_templates():
    """specimen.html and README.md come from templates so a rename is one line."""
    here = Path(__file__).resolve().parent
    subs = {"__FAMILY__": FAMILY, "__SLUG__": SLUG, "__PSFAMILY__": PS_FAMILY, "__VERSION__": VERSION}
    for src, dst in (("specimen.template.html", "specimen.html"), ("README.template.md", "README.md")):
        t = here / src
        if not t.exists():
            continue
        text = t.read_text()
        for k, v in subs.items():
            text = text.replace(k, v)
        (ROOT / dst).write_text(text)


def main():
    sel = sys.argv[1:] or None
    for key, weight, cond, hatched in STYLES:
        if sel and not any(s in key for s in sel):
            continue
        nm, res, n, npairs = build_style(key, weight, cond, hatched, ROOT)
        w, hinted = hint_and_compress(res["ttf"], ROOT)
        print(f"{nm['psName']:<32} {n} glyphs, {npairs} kern pairs, hinted={hinted} -> {res['otf'].name}, "
              f"{res['ttf'].name}, {w.name}")
    write_ofl()
    write_css()
    render_templates()


if __name__ == "__main__":
    main()
