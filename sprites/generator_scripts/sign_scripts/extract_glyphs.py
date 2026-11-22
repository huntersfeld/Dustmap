"""Turn the alphabet charts from Hunter's "D&D Language and Script" Drive folder into pixel glyphs for signs.

Each chart (dnd-font-<script>.png, 1981 x 1800) is the same template: three bands of nine cells, a Latin label above
each glyph. This crops every glyph cell, finds the ink, and samples it onto a small pixel grid. All glyphs of one script
share one vertical band and scale, so small marks stay small and descenders stay low.

    python3 extract_glyphs.py <folder with dnd-font-*.png or <script>.png> [out.json]

Writes {script: {"h": rows, "g": {letters: [width, row bitmasks...]}}}. Keys are lowercase letters or groups such as
"ck" (one glyph for both) and digraphs such as "th" (Primordial). The page reads this as SIGN_GLYPHS.
"""
import sys, os, json
import numpy as np
from PIL import Image

XS = [178, 358, 538, 716, 897, 1078, 1259, 1437, 1618, 1798]       # cell borders
YS = [(360, 537), (900, 1076), (1438, 1617)]                         # glyph rows
AZ = list('abcdefghijklmnopqrstuvwxyz')
CEL = ['b', 'ck', 'gj', 'd', 'f', 'a', 'e', 'm', 'i', 'wy', 'h', 'l', 'p', 'q', 'n', 'x', 'o', 'r', 'z', 'uv', 's', 't']
ORDER = {
    'celestial': CEL, 'giant': CEL,
    'orc': ['a', 'b', 'cp', 'd', 'e', 'f', 'g', 'h', 'ijy', 'k', 'l', 'm', 'n', 'o', 'q', 'r', 's', 't', 'u', 'vw', 'x', 'z'],
    'primordial': ['c', 'ijy', 'th', 'h', 'z', 'uvw', 'e', 'd', 'g', 'b', 'a', 't', 's', 'r', 'kq', 'ts', 'fp', 'ph', 'o', 'x', 'n', 'm', 'l'],
}
ROWS = {'halfling': 10, 'goblin': 11, 'gnomish': 11, 'dwarvish': 11, 'draconic': 16}   # rows of pixels for the script's band (default 13)
THR = {'draconic': .12, 'infernal': .15, 'elvish': .18, 'sylvan': .18, 'undercommon': .17, 'giant': .2}   # share of a block that must be ink (default .24; thin pen scripts need less)


def cells(img):
    for r, (y0, y1) in enumerate(YS):
        for c in range(9):
            yield img[y0 + 6:y1 - 5, XS[c] + 6:XS[c + 1] - 5]


def extract(path, name):
    g = np.array(Image.open(path).convert('L')).astype(int)
    order = ORDER.get(name, AZ)
    ink = []
    for k, cell in enumerate(cells(g)):
        if k >= len(order): break
        m = cell < 110
        ys, xs = np.nonzero(m)
        if not len(ys): continue
        ink.append((order[k], m, ys.min(), ys.max(), xs.min(), xs.max()))
    top = min(i[2] for i in ink); bot = max(i[3] for i in ink)
    rows = ROWS.get(name, 13); blk = (bot - top + 1) / rows
    out = {}
    for key, m, y0, y1, x0, x1 in ink:
        w = max(1, int(round((x1 - x0 + 1) / blk)))
        cx = (x0 + x1 + 1) / 2; left = cx - w * blk / 2
        bits = []
        for r in range(rows):
            v = 0
            for c in range(w):
                ya, yb = int(top + r * blk), int(top + (r + 1) * blk)
                xa, xb = int(max(0, left + c * blk)), int(min(m.shape[1], left + (c + 1) * blk))
                if xb > xa and yb > ya and m[ya:yb, xa:xb].mean() > THR.get(name, .24): v |= 1 << c
            bits.append(v)
        out[key] = [w] + bits
    return {'h': rows, 'g': out}


if __name__ == '__main__':
    src = sys.argv[1]; res = {}
    for f in sorted(os.listdir(src)):
        if not f.endswith('.png'): continue
        name = f[:-4].replace('dnd-font-', '')
        res[name] = extract(os.path.join(src, f), name)
    s = json.dumps(res, separators=(',', ':'))
    if len(sys.argv) > 2: open(sys.argv[2], 'w').write(s)
    else: print(s)
