#!/usr/bin/env python3
"""
Rebuild the shipped subset woff2 fonts in assets/fonts/ so they include the
math/Greek/symbol glyphs the app actually renders but the stock @fontsource
"latin" subset omits:  π  √  ⇄  ‰  ≈  →

For each shipped file we subset from the matching @fontsource woff2, using the
union of:
  - every codepoint already declared in that file's CSS unicode-range, and
  - the six extra codepoints above (when the source font actually has them).

Usage:  python3 scripts/subset-fonts.py [--write]
Without --write it only reports; with --write it rewrites assets/fonts/*.woff2.
"""
import os
import re
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSS = os.path.join(ROOT, "style.css")
FONTSRC = os.path.join(ROOT, "scripts", ".font-src")
OUTDIR = os.path.join(ROOT, "assets", "fonts")

# Glyphs the task asks us to guarantee, and which the app really shows.
EXTRA = {
    "π": 0x03C0, "√": 0x221A, "⇄": 0x21C4,
    "‰": 0x2030, "≈": 0x2248, "→": 0x2192,
}
SHIPPED = {
    "fraunces-latin-200-normal.woff2": "fraunces-200.ttf",
    "fraunces-latin-800-normal.woff2": "fraunces-800.ttf",
    "ibm-plex-sans-latin-400-normal.woff2": "ibm-plex-sans-400.ttf",
    "ibm-plex-sans-latin-600-normal.woff2": "ibm-plex-sans-600.ttf",
    "jetbrains-mono-latin-400-normal.woff2": "jetbrains-mono-400.ttf",
    "jetbrains-mono-latin-600-normal.woff2": "jetbrains-mono-600.ttf",
}


def css_unicode_ranges():
    """Return {filename: [codepoints...]} parsed from the @font-face blocks."""
    with open(CSS, encoding="utf-8") as fh:
        css = fh.read()
    out = {}
    for block in re.findall(r"@font-face\s*\{[^}]*\}", css):
        src = re.search(r"url\((['\"]?)([^)'\"]+\.woff2)\1\)", block)
        ur = re.search(r"unicode-range:\s*([^;]+);", block)
        if not src or not ur:
            continue
        fname = os.path.basename(src.group(2))
        cps = set()
        for tok in ur.group(1).split(","):
            tok = tok.strip()
            if "-" in tok.replace("U+", "").replace("u+", ""):
                lo, hi = tok.split("-")
                lo_cp = int(lo.replace("U+", "").replace("u+", ""), 16)
                hi_cp = int(hi.replace("U+", "").replace("u+", ""), 16)
                cps.update(range(lo_cp, hi_cp + 1))
            else:
                cps.add(int(tok[2:], 16))
        out[fname] = cps
    return out


def cmap_codes(path):
    with TTFont(path) as f:
        return set(f.getBestCmap().keys())


def main():
    write = "--write" in sys.argv
    ranges = css_unicode_ranges()
    for fname, src_file in SHIPPED.items():
        out_path = os.path.join(OUTDIR, fname)
        src_path = os.path.join(FONTSRC, src_file)
        if not os.path.exists(src_path):
            print(f"!! source missing: {src_path}")
            continue
        src_codes = cmap_codes(src_path)
        base = ranges.get(fname, set())
        # Only keep extras the source actually contains.
        have = {cp for cp in EXTRA.values() if cp in src_codes}
        want = base | have
        # Use the object API to subset to an explicit codepoint list.
        opts = subset.Options()
        opts.flavor = "woff2"
        opts.layout_features = ["*"]
        opts.notdef_outline = True
        opts.drop_tables = ["DSIG"]
        font = subset.load_font(src_path, opts)
        ss = subset.Subsetter(options=opts)
        ss.populate(unicodes=sorted(want))
        ss.subset(font)
        if write:
            subset.save_font(font, out_path, opts)
        new_codes = cmap_codes(out_path if write else src_path)
        added = [ch for ch, cp in EXTRA.items() if cp in new_codes]
        missing = [ch for ch, cp in EXTRA.items() if cp not in new_codes]
        size = os.path.getsize(out_path) if write else os.path.getsize(src_path)
        print(f"{fname}")
        print(f"   extras now present: {' '.join(added) or '(none)'}")
        print(f"   extras still absent: {' '.join(missing) or '(none)'}")
        print(f"   size: {size} bytes {'(written)' if write else '(source, dry-run)'}")


if __name__ == "__main__":
    main()
