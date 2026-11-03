"""Idle-animation recipes, one per character. Grid coordinates are (x, y) in the character's
grid in townsfolk.py / enemies.py. Each recipe returns dict(parts, patch, fx, cmap)."""
from animate import part, rows, B, HAT, LAG, TAIL, SWAY, Z0, put
from palette import C

GLINT = (255, 252, 236)


def human(hat_end, leg_row, hatchars='HhLF', pre=(), tails=False, mid=11, hat_dx=Z0, hat_dy=HAT,
          body_dx=Z0, body_dy=B):
    """Standard humanoid: hat lags, body breathes, legs planted. `pre` parts win over these."""
    ps = list(pre)
    ps.append(part('hat', lambda x, y, c: y <= hat_end and c in hatchars, hat_dx, hat_dy, z=5))
    if tails:
        ps.append(part('tailL', lambda x, y, c: y >= leg_row - 2 and c == 'c' and x < mid, [-t for t in TAIL], z=1))
        ps.append(part('tailR', lambda x, y, c: y >= leg_row - 2 and c == 'c' and x >= mid, TAIL, z=1))
    ps.append(part('body', lambda x, y, c: y < leg_row, body_dx, body_dy, z=3))
    ps.append(part('legs', lambda x, y, c: True, z=0))
    return ps


def hands(x_left, x_right, y0, y1, dy=LAG, dx=Z0):
    return part('hands', lambda x, y, c: y0 <= y <= y1 and (x <= x_left or x >= x_right), dx, dy, z=4)


def cycle(f, pts, ch, period=None):
    """One glint moving along pts."""
    period = period or len(pts)
    i = f % period
    return [(pts[i][0], pts[i][1], ch)] if i < len(pts) else []


S = {}

# ------------------------------------------------------------------ townsfolk
S['bandit'] = lambda: dict(parts=human(5, 16, pre=[hands(4, 17, 13, 15)]))
S['desperado'] = lambda: dict(parts=human(5, 17, tails=True, pre=[hands(4, 17, 14, 16)]))


def _miner():
    pick = part('pick', lambda x, y, c: (c in 'JGg' and y <= 10) or (x == 16 and y in (9, 10)), Z0, LAG, z=4)

    def fx(f, a, off):
        ox, oy = off['hat']
        # headlamp: bulb flickers, soft un-outlined halo pulses
        bright = f in (0, 1, 4, 5)
        for x, y in [(10, 1), (11, 1), (10, 2), (11, 2)]:
            put(a, x + ox, y + oy, GLINT if (bright and y == 1) else C['lamp'])
        al = 150 if bright else 90
        for x, y in [(9, 0), (12, 0), (10, -1), (11, -1), (8, 1), (13, 1)]:
            put(a, x + ox, y + oy, (255, 226, 120, al))
    return dict(parts=human(5, 16, pre=[pick, hands(6, 16, 14, 15)]), fx=fx)


S['miner'] = _miner


def _barkeep():
    glass = part('glass', lambda x, y, c: x >= 17 and 14 <= y <= 17, Z0, LAG, z=4)
    tips = part('tips', lambda x, y, c: c == 'M' and (x in (5, 16)) and y == 9, Z0, LAG, z=4)
    pts = [(18, 15), (19, 15), (19, 16), (18, 16)]
    return dict(parts=human(3, 18, hatchars='RN', pre=[glass, tips, hands(6, 15, 14, 15)]),
                patch=lambda f: cycle(f, pts, 'n', 8), cmap=dict(n=GLINT))


S['barkeep'] = _barkeep


def _cowboy():
    lasso = part('lasso', lambda x, y, c: c == 'J', [0, 0, 0, 1, 1, 0, 0, -1], LAG, z=4)
    return dict(parts=human(5, 18, pre=[lasso, hands(6, 16, 14, 15)]))


S['cowboy'] = _cowboy


def _cowgirl():
    hair = part('hair', lambda x, y, c: c == 'R' and 6 <= y <= 10, Z0, LAG, z=2)
    return dict(parts=human(5, 19, pre=[hair, hands(5, 16, 13, 14)]))


S['cowgirl'] = _cowgirl


def _sheriff():
    tips = part('tips', lambda x, y, c: c == 'M' and y == 9, Z0, LAG, z=4)
    return dict(parts=human(5, 16, pre=[tips, hands(4, 17, 13, 15)]),
                patch=lambda f: [(6, 12, 'n')] if f == 1 else [], cmap=dict(n=GLINT))


S['sheriff'] = _sheriff


def _singer():
    feather = part('feather', lambda x, y, c: c == 'F', [0, 0, 0, 1, 1, 0, 0, -1], HAT, z=6)
    hem = part('hem', lambda x, y, c: 17 <= y <= 19, SWAY, Z0, z=2)
    return dict(parts=human(3, 17, hatchars='R', pre=[feather, hem, hands(6, 15, 11, 13)]))


S['singer'] = _singer


def _undertaker():
    def patch(f):
        if f in (2, 3):   # shifty eyes: look right
            return [(9, 7, 'S'), (13, 7, 'S'), (10, 7, 'E'), (14, 7, 'E')]
        if f in (5, 6):   # ...then left
            return [(9, 7, 'S'), (13, 7, 'S'), (8, 7, 'E'), (12, 7, 'E')]
        return []
    return dict(parts=human(5, 18, hat_dy=[0, 0, 1, 1, 1, 1, 1, 0]), patch=patch)


S['undertaker'] = _undertaker


def _snakeoil():
    bottle = part('bottle', lambda x, y, c: x >= 17 and y <= 9, Z0, [0, -1, -1, 0, 0, -1, -1, 0], z=6)
    pts = [(19, 3), (19, 4), (19, 5), (19, 6)]
    return dict(parts=human(5, 16, pre=[bottle, hands(6, 99, 14, 15)]),
                patch=lambda f: cycle(f, pts, 'n', 8), cmap=dict(n=GLINT))


S['snakeoil'] = _snakeoil


def _prospector():
    pan = part('pan', lambda x, y, c: 14 <= y <= 16 and ((x <= 9 and c in 'GgYS') or (x == 13 and c == 'S')),
               [0, 1, 0, -1, 0, 1, 0, -1], LAG, z=6)
    path = [0, 1, 2, 3, 2, 1, 0, 1]   # a gold fleck swirls around the pan
    return dict(parts=human(4, 16, pre=[pan]), patch=lambda f: [(5, 15, 'G'), (3 + path[f], 15, 'Y')])


S['prospector'] = _prospector


def _drunk():
    sway = [0, 0, 1, 1, 1, 0, 0, 0]
    def patch(f):   # heavy eyelids
        return [(9, 7, 's'), (12, 7, 's')] if f in (3, 4, 5) else []
    return dict(parts=human(5, 17, hat_dx=[0, 0, 0, 1, 1, 1, 0, 0], body_dx=sway), patch=patch)


S['drunk'] = _drunk


def _kid():
    tips = part('tips', lambda x, y, c: y == 5 and (x <= 2 or x >= 19), Z0, [0, 0, 0, 1, 1, 1, 1, 1], z=5)
    return dict(parts=human(6, 14, pre=[tips]))


S['kid'] = _kid

# ------------------------------------------------------------------ enemies


def _rattlesnake():
    ps = [part('tongue', lambda x, y, c: c == 'T', [0, 0, 1, 1, 1, 1, 0, 0], z=5),
          part('head', lambda x, y, c: y <= 2, [0, 0, 1, 1, 1, 1, 0, 0], z=5),
          part('neck', lambda x, y, c: 3 <= y <= 4, [0, 0, 0, 1, 1, 0, 0, 0], z=4),
          part('rattle', lambda x, y, c: c in 'Rr', Z0, [0, -1, 0, -1, 0, -1, 0, -1], z=4),
          part('coil', lambda x, y, c: True, z=1)]
    # tongue flicks out on frames 1-2 and 5 only
    def patch(f):
        return [] if f in (1, 2, 5) else [(11, 2, '.'), (12, 2, '.'), (12, 3, '.')]
    return dict(parts=ps, patch=patch)


S['rattlesnake'] = _rattlesnake


def _lizard():
    pushup = [0, 0, -1, -1, 0, 0, 0, 0]
    ps = [part('head', lambda x, y, c: y <= 2 and x <= 6, Z0, pushup, z=4),
          part('front', lambda x, y, c: y == 3 and x <= 6, Z0, pushup, z=3),
          part('tailtip', lambda x, y, c: x >= 19, Z0, [0, 0, 0, 0, -1, -1, 0, 0], z=3),
          part('rest', lambda x, y, c: True, z=1)]
    return dict(parts=ps, patch=lambda f: [] if f in (5, 6) else [(0, 2, '.')])


S['lizard'] = _lizard


def _scorpion():
    ps = [part('sting', lambda x, y, c: c == 'k', [0, 0, 1, 1, 1, 0, 0, 0], [0, -1, -1, 0, 0, 0, 0, 0], z=5),
          part('tail', lambda x, y, c: y <= 6 and x >= 8 and c == 'X', [0, 0, 1, 1, 0, 0, 0, 0], [0, -1, 0, 0, 0, 0, 0, 0], z=4),
          part('clawL', lambda x, y, c: c == 'C' and x < 8, Z0, [0, 1, 0, 0, 0, 1, 0, 0], z=4),
          part('clawR', lambda x, y, c: c == 'C' and x >= 8, Z0, [0, 0, 0, 1, 0, 0, 0, 1], z=4),
          part('body', lambda x, y, c: 7 <= y <= 9, Z0, B, z=3),
          part('legs', lambda x, y, c: True, z=1)]
    return dict(parts=ps)


S['scorpion'] = _scorpion


def _tarantula():
    ps = [part('body', lambda x, y, c: c in 'BbEf', Z0, B, z=4),
          part('legL', lambda x, y, c: x <= 1, Z0, [0, 0, -1, -1, 0, 0, 0, 0], z=2),
          part('legR', lambda x, y, c: x >= 15, Z0, [0, 0, 0, 0, 0, 0, -1, -1], z=2),
          part('legs', lambda x, y, c: True, z=1)]
    return dict(parts=ps)


S['tarantula'] = _tarantula


def _coyote():
    ps = [part('head', lambda x, y, c: y <= 3 and x <= 7, Z0, LAG, z=4),
          part('tail', lambda x, y, c: x >= 16 and 4 <= y <= 6, Z0, [0, -1, -1, 0, 0, -1, -1, 0], z=3),
          part('body', lambda x, y, c: 4 <= y <= 6, Z0, B, z=3),
          part('legs', lambda x, y, c: True, z=1)]
    return dict(parts=ps, patch=lambda f: [(5, 0, '.')] if f == 5 else [])


S['coyote'] = _coyote


def _vulture():
    look = [0, 0, 1, 1, 0, 0, -1, -1]
    shrug = [0, 0, -1, -1, 0, 0, 0, 0]
    ps = [part('head', lambda x, y, c: y <= 2, look, B, z=5),
          part('wingL', lambda x, y, c: x <= 2 and 5 <= y <= 10, [0, 0, -1, -1, 0, 0, 0, 0], shrug, z=2),
          part('wingR', lambda x, y, c: x >= 13 and 5 <= y <= 10, [0, 0, 1, 1, 0, 0, 0, 0], shrug, z=2),
          part('ruff', lambda x, y, c: y == 3, Z0, B, z=4),
          part('body', lambda x, y, c: y <= 11, z=3),
          part('feet', lambda x, y, c: True, z=1)]
    return dict(parts=ps)


S['vulture'] = _vulture


def _armadillo():
    ps = [part('head', lambda x, y, c: x <= 3, [0, 0, -1, -1, 0, -1, 0, 0], z=4),
          part('tail', lambda x, y, c: x >= 17, Z0, [0, 0, 0, -1, -1, 0, 0, 0], z=3),
          part('rest', lambda x, y, c: True, z=1)]
    return dict(parts=ps, patch=lambda f: [(0, 4, 'S')] if f in (2, 5) else [])


S['armadillo'] = _armadillo


def _jackalope():
    ps = [part('antlers', lambda x, y, c: c == 'A', Z0, HAT, z=5),
          part('upper', lambda x, y, c: y <= 9, Z0, B, z=3),
          part('legs', lambda x, y, c: True, z=1)]
    return dict(parts=ps, patch=lambda f: [(0, 7, 'X')] if f in (1, 3, 5) else [])


S['jackalope'] = _jackalope


def _skeleton():
    jaw = part('jaw', lambda x, y, c: y == 9, Z0, [0, 1, 1, 2, 1, 2, 0, 0], z=3)
    return dict(parts=human(5, 16, hatchars='HhL', pre=[jaw, hands(4, 17, 13, 15)]))


S['skeleton'] = _skeleton


def _cactus():
    ps = [part('flower', lambda x, y, c: c == 'F', [0, 0, 1, 1, 0, 0, -1, -1], z=5),
          part('armL', lambda x, y, c: x <= 4 and 4 <= y <= 7, [0, -1, -1, -1, 0, 0, 0, 0], z=3),
          part('armR', lambda x, y, c: x >= 16 and 4 <= y <= 7, [0, 0, 0, 0, 0, 1, 1, 1], z=3),
          part('rest', lambda x, y, c: True, z=1)]
    def patch(f):   # growl: mouth opens wider
        return [(9, 6, 'n'), (10, 6, 'n')] if f in (2, 3, 4) else []
    return dict(parts=ps, patch=patch)


S['cactus'] = _cactus


def _sandworm():
    ps = [part('sand', lambda x, y, c: c in 'sS', z=6),
          part('worm', lambda x, y, c: True, Z0, [0, 0, 1, 1, 2, 2, 1, 0], z=2)]
    def patch(f):   # chomp: jaws close on frames 3-5
        if f in (3, 4, 5):
            return [(x, 2, 't' if x % 2 else 'X') for x in range(6, 13)] + \
                   [(x, 4, 't' if x % 2 == 0 else 'X') for x in range(6, 13)]
        return []
    def fx(f, a, off):
        # sand grains trickle off the mound while it sinks
        if f in (2, 3, 4, 5):
            k = f - 2
            for x, y in [(3, 9), (15, 9), (2, 8), (16, 8)]:
                put(a, x + 4 + (k % 2), y + 3 + k // 2, (236, 206, 160, 200))
    return dict(parts=ps, patch=patch, fx=fx)


S['sandworm'] = _sandworm
