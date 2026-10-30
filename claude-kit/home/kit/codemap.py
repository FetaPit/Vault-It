#!/usr/bin/env python3
"""Compact map of the big files in a git repo, for Claude's context.

Lists files over MIN_LINES with line-numbered section titles (comment banners,
Markdown headings, top-level functions and classes) so Claude can Read by range
instead of loading whole files. Prints nothing for repos with no big files.

Usage: python3 codemap.py [repo_dir] [file ...]
"""
import os
import re
import subprocess
import sys

MIN_LINES = int(os.environ.get("CODEMAP_MIN_LINES", "800"))
MAX_FILES = 6
MAX_ENTRIES = 45
MIN_BYTES = 20_000  # cheap pre-filter before counting lines
MAX_BYTES = 5_000_000

SKIP = re.compile(
    r"(\.min\.|\.map$|\.lock$|lock\.(json|yaml)$|\.(svg|png|jpe?g|gif|webp|ico|pdf|woff2?|ttf|otf|zip|gz|wasm)$"
    r"|(^|/)(dist|build|vendor|node_modules|\.next|coverage)/)"
)
RULE = re.compile(r"[═━]{3,}|^\s*(//|/\*|<!--|#|\*)\s*[=\-~*#]{6,}")
DEF = re.compile(
    r"^(export\s+)?(default\s+)?(async\s+)?(function\*?|class|def)\s+([A-Za-z_$][\w$]*)"
    r"|^(export\s+)?(const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(async\s*)?(\(|function|class)"
)
HEAD = re.compile(r"^(#{1,2})\s+(.*)")


def clean(t):
    t = re.sub(r"[═━]", "", t)
    return re.sub(r"^[\s/*<>!#=\-~]+|[\s/*<>!#=\-~]+$", "", t)[:90]


def sections(path, lines):
    out = []
    if path.endswith((".md", ".mdx")):
        return [(i + 1, "  " * (len(m.group(1)) - 1) + m.group(2)) for i, l in enumerate(lines) if (m := HEAD.match(l))]
    banners, defs = [], []
    i = 0
    while i < len(lines):
        line = lines[i]
        if RULE.search(line):
            t = clean(line)
            if t:
                banners.append((i + 1, t))
            elif i + 1 < len(lines) and clean(lines[i + 1]) and not RULE.search(lines[i + 1]):
                banners.append((i + 2, clean(lines[i + 1])))
                j = i + 2
                while j < len(lines) and j - i < 8 and not RULE.search(lines[j]):
                    j += 1
                i = j  # skip to the closing rule
        elif m := DEF.match(line):
            defs.append((i + 1, (m.group(5) or m.group(8)) + "()"))
        i += 1
    out = banners if len(banners) >= 5 else sorted(banners + defs)
    if len(out) > MAX_ENTRIES:  # keep an even spread
        step = len(out) / MAX_ENTRIES
        out = [out[int(k * step)] for k in range(MAX_ENTRIES)] + [(0, f"... {len(out) - MAX_ENTRIES} more, grep for detail")]
    return out


def main():
    root = sys.argv[1] if len(sys.argv) > 1 else "."
    wanted = sys.argv[2:]
    try:
        files = wanted or subprocess.run(
            ["git", "-C", root, "ls-files"], capture_output=True, text=True, timeout=5
        ).stdout.splitlines()
    except Exception:
        return
    big = []
    for f in files:
        p = os.path.join(root, f)
        if SKIP.search(f):
            continue
        try:
            size = os.path.getsize(p)
            if (not wanted and size < MIN_BYTES) or size > MAX_BYTES:
                continue
            with open(p, encoding="utf-8") as fh:
                lines = fh.read().split("\n")
        except (OSError, UnicodeDecodeError):
            continue
        if wanted or len(lines) >= MIN_LINES:
            big.append((len(lines), f, lines))
    if not big:
        return
    big.sort(reverse=True)
    print(f"# Big files: never Read whole. Jump to a range (Read offset/limit) or Grep.")
    for n, f, lines in big[:MAX_FILES]:
        print(f"\n## {f} ({n} lines)")
        for ln, title in sections(f, lines):
            print(f"{ln}: {title}" if ln else title)
    if len(big) > MAX_FILES:
        print("\nAlso big: " + ", ".join(f"{f} ({n})" for n, f, _ in big[MAX_FILES:MAX_FILES + 10]))


if __name__ == "__main__":
    try:
        main()
    except BrokenPipeError:  # output cut short by `head`
        sys.stderr.close()
