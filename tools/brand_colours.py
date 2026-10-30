#!/usr/bin/env python3
"""Brand rollout, phase 1: swap hard-coded colours in CSS for theme tokens.

Only CSS is touched: <style> blocks, style="..." attributes (in markup and in JS template strings)
and el.style.prop = '...' assignments. Canvas and SVG attribute colours are left alone (they are
handled by the Daylight phase). The embedded HB3D engine block is skipped (it is rebuilt from src/hb3d).

Usage: python3 tools/brand_colours.py index.html [--dry]
"""
import re, sys

BRAND = {  # hex -> token, any property
    '44c0b9': 'var(--teal)', '38a09a': 'var(--teal)', '2d8882': 'var(--faint)', '007f7b': 'var(--teal-deep)',
    'c9a84c': 'var(--brass)', 'e8c56a': 'var(--gold)', '3ecf8e': 'var(--green)', 'e05c5c': 'var(--red)',
    '9b7ec8': 'var(--purple)', '64b5f6': 'var(--blue)', 'e0894a': 'var(--orange)', 'f59e0b': 'var(--amber)',
    'e8e8e8': 'var(--text)', 'e6eef7': 'var(--text)', 'e8f0ef': 'var(--text)',
    '9aa0a6': 'var(--muted)', '7d8793': 'var(--muted)', '8fa3b5': 'var(--muted)', '8fb4b1': 'var(--muted)',
    '6b8197': 'var(--muted)', '6b7780': 'var(--muted)', '5a6068': 'var(--lock)',
}
RGB = {  # rgba channel triplet -> token holding "r g b"
    (255, 255, 255): '--ink-rgb', (68, 192, 185): '--teal-rgb', (201, 168, 76): '--brass-rgb',
    (232, 197, 106): '--gold-rgb', (62, 207, 142): '--green-rgb', (224, 92, 92): '--red-rgb',
    (100, 181, 246): '--blue-rgb', (155, 126, 200): '--purple-rgb', (224, 137, 74): '--orange-rgb',
    (245, 158, 11): '--amber-rgb', (0, 127, 123): '--teal-deep-rgb',
}
BG_PROPS = ('background', 'background-color', 'background-image')
HEX = re.compile(r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b')
RGBA = re.compile(r'rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+%?)\s*)?\)')

def is_dark(r, g, b): return max(r, g, b) <= 48 and (r, g, b) != (0, 0, 0)

def conv_value(prop, val, stats):
    prop = prop.strip().lower()
    bg = prop in BG_PROPS
    shadow = 'shadow' in prop
    def hexrep(m):
        h = m.group(1).lower()
        if len(h) == 3: h = ''.join(c * 2 for c in h)
        if h in BRAND and not (shadow and BRAND[h] in ('var(--text)', 'var(--muted)', 'var(--lock)')):
            stats['hex'] += 1; return BRAND[h]
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
        if bg and is_dark(r, g, b):
            stats['dark'] += 1; return 'var(--bg)' if h == '080808' else 'var(--panel)'
        if prop.startswith('border') and is_dark(r, g, b):
            stats['dark'] += 1; return 'var(--line2)'
        return m.group(0)
    def rgbarep(m):
        r, g, b = int(m.group(1)), int(m.group(2)), int(m.group(3)); a = m.group(4)
        tok = RGB.get((r, g, b))
        if tok and not (shadow and tok == '--ink-rgb'):
            stats['rgba'] += 1
            return 'rgb(var(%s)%s)' % (tok, (' / ' + a) if a is not None else '')
        if bg and is_dark(r, g, b):
            stats['dark'] += 1
            return 'rgb(var(--panel-rgb)%s)' % ((' / ' + a) if a is not None else '')
        return m.group(0)
    v = HEX.sub(hexrep, val)
    return RGBA.sub(rgbarep, v)

DECL = re.compile(r'([a-zA-Z-]+)(\s*:\s*)([^;{}"]+)')

def conv_css(css, stats):
    return DECL.sub(lambda m: m.group(1) + m.group(2) + conv_value(m.group(1), m.group(3), stats), css)

def main():
    path = sys.argv[1]; dry = '--dry' in sys.argv
    s = open(path, encoding='utf-8').read()
    a = s.find('<<HB3D_ENGINE'); b = s.find('HB3D_ENGINE>>')
    head, eng, tail = (s[:a], s[a:b], s[b:]) if a >= 0 and b > a else (s, '', '')
    stats = {'hex': 0, 'rgba': 0, 'dark': 0}
    def part(t):
        t = re.sub(r'(<style[^>]*>)(.*?)(</style>)', lambda m: m.group(1) + conv_css(m.group(2), stats) + m.group(3), t, flags=re.S)
        t = re.sub(r'(style=")([^"]*)(")', lambda m: m.group(1) + conv_css(m.group(2), stats) + m.group(3), t)
        t = re.sub(r"(style=')([^']*)(')", lambda m: m.group(1) + conv_css(m.group(2), stats) + m.group(3), t)
        t = re.sub(r"(\.style\.([a-zA-Z]+)\s*=\s*')([^']*)(')",
                   lambda m: m.group(1) + conv_value(re.sub(r'([A-Z])', r'-\1', m.group(2)).lower(), m.group(3), stats) + m.group(4), t)
        t = re.sub(r"(\.style\.cssText\s*=\s*')([^']*)(')", lambda m: m.group(1) + conv_css(m.group(2), stats) + m.group(3), t)
        return t
    out = part(head) + eng + part(tail)
    print(stats)
    if not dry: open(path, 'w', encoding='utf-8').write(out)

if __name__ == '__main__':
    main()
