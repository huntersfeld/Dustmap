"""Shared palette + grid renderer for the NPC / enemy token mockups.

Same method as the player cowboys (see cowboy2_wheat/tiny.py, cowboy3_cigarillo/tiny3.py):
each sprite is hand-placed on a character grid, one character = one pixel, then a 1 px dark
outline is added around every solid pixel. Effects (glow, smoke) can be drawn after outlining.
"""
import numpy as np
from PIL import Image

OUT = (40, 26, 24)  # outline, ~#281a18

# Global colour names.
C = dict(
    out=OUT, eye=(40, 26, 24), white=(246, 240, 228),
    skin=(232, 152, 106), skind=(190, 112, 78),
    skin2=(186, 118, 76), skin2d=(148, 88, 56),
    skin3=(124, 78, 52), skin3d=(96, 58, 40),
    pale=(226, 214, 196), paled=(186, 172, 156),
    hatbr=(128, 82, 52), hatbrd=(92, 56, 36), hatbrl=(158, 106, 70),
    hatblk=(48, 40, 44), hatblkd=(28, 24, 28), hatblkl=(74, 64, 68),
    hattan=(196, 160, 110), hattand=(150, 118, 78), hattanl=(220, 190, 140),
    hatgry=(150, 144, 136), hatgryd=(108, 102, 96), hatgryl=(182, 176, 168),
    hairbr=(96, 58, 38), hairblk=(44, 34, 32), hairred=(176, 82, 40), hairgry=(206, 202, 196),
    hairblond=(222, 180, 96),
    shirt=(240, 234, 222), shirtd=(200, 194, 182),
    red=(196, 56, 42), redd=(140, 36, 30), blue=(64, 98, 156), blued=(44, 70, 116),
    black=(44, 38, 42), blackd=(28, 24, 28), blackl=(74, 66, 70),
    vest=(110, 70, 46), vestd=(80, 50, 34),
    leather=(150, 92, 58), leatherd=(112, 66, 42),
    denim=(76, 98, 136), denimd=(56, 74, 106),
    pants=(112, 92, 80), pantsd=(86, 70, 62),
    khaki=(160, 140, 96), khakid=(124, 106, 70),
    boot=(60, 40, 32), bootd=(40, 28, 24),
    belt=(118, 72, 46), gold=(236, 196, 76), goldd=(184, 140, 48),
    grey=(172, 170, 164), greyd=(124, 122, 118), steel=(196, 200, 206),
    green=(92, 128, 72), greend=(64, 94, 52), bottle=(92, 150, 96),
    purple=(122, 72, 132), purpled=(88, 50, 98),
    pink=(222, 120, 140), pinkd=(176, 82, 104),
    plaid=(176, 52, 44), plaidd=(120, 34, 30),
    wood=(150, 104, 62), woodd=(110, 74, 44),
    lamp=(255, 226, 120), nose=(214, 82, 70),
    bone=(232, 224, 200), boned=(184, 174, 150),
)


def render(grid, cmap):
    """grid: list of strings; cmap: char -> colour name or RGB(A) tuple."""
    h = len(grid)
    w = max(len(r) for r in grid)
    a = np.zeros((h, w, 4), np.uint8)
    for y, r in enumerate(grid):
        for x, ch in enumerate(r):
            if ch in '. ':
                continue
            col = cmap[ch]
            if isinstance(col, str):
                col = C[col]
            a[y, x] = list(col[:3]) + [col[3] if len(col) > 3 else 255]
    return outline(Image.fromarray(a))


def outline(im):
    a = np.pad(np.array(im), ((1, 1), (1, 1), (0, 0)))
    al = a[:, :, 3] > 0
    o = np.zeros_like(al)
    for dy, dx in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
        o |= np.roll(np.roll(al, dy, 0), dx, 1)
    o &= ~al
    a[o] = list(OUT) + [255]
    return Image.fromarray(a)


def to_frame(im, feet=None, FW=32, FH=32, PX=16, BASE=31):
    """Place a sprite in a 32x32 frame with its feet centre at (16, 31), like std.py.
    feet: optional explicit x of the standing point within the sprite."""
    A = np.array(im)[:, :, 3] > 0
    ys, xs = np.nonzero(A)
    bottom = ys.max()
    if feet is None:
        fx = np.nonzero(A[bottom - 1:bottom + 1].any(0))[0]
        feet = (fx.min() + fx.max()) / 2
    dx = PX - int(np.floor(feet))
    dy = BASE - bottom
    assert xs.min() + dx >= 0 and xs.max() + dx < FW and ys.min() + dy >= 0, (xs.min()+dx, xs.max()+dx, ys.min()+dy)
    g = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
    g.alpha_composite(im, (dx, dy))
    return g
