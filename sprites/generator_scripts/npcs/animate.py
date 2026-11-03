"""Part-based idle animator for the NPC / enemy tokens.

Same method as the player cowboys (cowboy3_cigarillo/anim3.py): the character grid is split
into parts (hat, body, legs, tails, props...), each part is shifted a whole pixel at a time on
an 8-frame loop, the parts are composited, then the 1 px outline is added. Small per-frame
grid patches handle blinks, tongue flicks and glints; fx() adds un-outlined glow pixels.

Frame timing matches the cowboys: 8 frames x 150 ms, breathing on frames 2-5, hats lag by one
frame on the way up (never on the way down, so no gap opens between hat and head).
"""
import numpy as np
from PIL import Image
from palette import C, OUT, to_frame

N = 8
PADX, PADT = 4, 3
# standard curves
B = [0, 0, 1, 1, 1, 1, 0, 0]       # breathing: body sinks 1 px
HAT = [0, 0, 1, 1, 1, 1, 1, 0]     # hat lags on the way up
LAG = [0, 0, 0, 1, 1, 1, 1, 0]     # secondary parts (hands, beards) lag one more frame
TAIL = [0, 0, 0, 1, 1, 1, 0, 0]    # coat tails flare
SWAY = [0, 0, 1, 1, 0, 0, -1, -1]  # side-to-side
Z0 = [0] * N


def rows(a, b):
    return lambda x, y, c: a <= y <= b


def part(name, sel, dx=Z0, dy=Z0, z=0):
    return dict(name=name, sel=sel, dx=dx, dy=dy, z=z)


def col(cmap, ch):
    v = cmap[ch]
    v = C[v] if isinstance(v, str) else v
    return tuple(v[:3]) + ((v[3],) if len(v) > 3 else (255,))


def _outline(a):
    al = a[:, :, 3] > 0
    p = np.pad(al, 1)
    o = p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]   # no wrap-around
    o &= ~al
    a = a.copy()
    a[o] = list(OUT) + [255]
    return a


def frames(grid, cmap, parts, patch=None, fx=None):
    """Return 8 RGBA frames (sprite-sized, padded) for one character."""
    w = max(len(r) for r in grid) + 2 * PADX
    h = len(grid) + PADT + 2
    out = []
    for f in range(N):
        g = [list(r.ljust(w - 2 * PADX, '.')) for r in grid]
        if patch:
            for x, y, ch in patch(f):
                if 0 <= y < len(g) and 0 <= x < len(g[0]):
                    g[y][x] = ch
        layers = {p['name']: np.zeros((h, w, 4), np.uint8) for p in parts}
        for y, r in enumerate(g):
            for x, ch in enumerate(r):
                if ch in '. ':
                    continue
                for p in parts:
                    if p['sel'](x, y, ch):
                        X = x + PADX + p['dx'][f]
                        Y = y + PADT + p['dy'][f]
                        if 0 <= X < w and 0 <= Y < h:
                            layers[p['name']][Y, X] = col(cmap, ch)
                        break
        a = np.zeros((h, w, 4), np.uint8)
        for p in sorted(parts, key=lambda p: p['z']):
            L = layers[p['name']]
            m = L[:, :, 3] > 0
            a[m] = L[m]
        a = _outline(a)
        if fx:
            off = {p['name']: (p['dx'][f] + PADX, p['dy'][f] + PADT) for p in parts}
            fx(f, a, off)
        out.append(Image.fromarray(a))
    return out


def frame32(frs):
    """Place 8 frames into 32x32 cells with one shared offset (feet centre -> (16,31))."""
    A = np.stack([np.array(f)[:, :, 3] > 0 for f in frs]).any(0)
    ys, xs = np.nonzero(A)
    bottom = ys.max()
    fx_ = np.nonzero(A[bottom - 1:bottom + 1].any(0))[0]
    feet = (fx_.min() + fx_.max()) / 2
    dx = 16 - int(np.floor(feet))
    dy = 31 - bottom
    assert xs.min() + dx >= 0 and xs.max() + dx < 32 and ys.min() + dy >= 0, (xs.min() + dx, xs.max() + dx, ys.min() + dy)
    res = []
    for f in frs:
        g = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
        g.alpha_composite(f, (dx, dy))
        res.append(g)
    return res


def put(a, x, y, rgba):
    if 0 <= y < a.shape[0] and 0 <= x < a.shape[1]:
        if len(rgba) == 3:
            rgba = tuple(rgba) + (255,)
        if rgba[3] >= 255 or a[y, x, 3] == 0:
            a[y, x] = rgba
