"""Enemy / mob token mockups (static, no animation yet)."""
from palette import render

E = {}

# ---------------------------------------------------------------- Rattlesnake (coiled, head up)
E['rattlesnake'] = dict(name='Rattlesnake', grid=[
    "......HHHH......",
    ".....HEHHHh.....",
    "......hHHHHTT...",
    ".......XX...T...",
    "......XX........",
    "......Xx........",
    ".......XX.......",
    "...xXXXdXXXx....",
    "..XXdXXXXXdXX...",
    "..wwwwwwwwwww...",
    ".XXdXXXdXXXdXX..",
    ".XdXXXdXXXdXXXRr",
    ".wwwwwwwwwwwwwRR",
    "XXdXXXdXXXdXXXX.",
    ".XXXXXXXXXXXXX..",
], cmap=dict(H=(186, 150, 96), h=(150, 116, 70), E='eye', T='red', X=(204, 170, 112), x=(196, 160, 106), d=(120, 84, 52),
             w=(150, 116, 74), b=(222, 198, 150), R=(226, 214, 180), r=(176, 160, 124)),
    variants=[dict(H=(196, 52, 40), h=(150, 34, 28), X=(200, 56, 42), d=(236, 200, 80), w=(40, 30, 30)),
              dict(H=(62, 60, 58), h=(44, 40, 40), X=(84, 80, 76), d=(150, 144, 130), w=(44, 40, 40)),
              dict(H=(110, 150, 80), h=(80, 112, 56), X=(120, 160, 88), d=(60, 90, 46), w=(80, 112, 56))])

# ---------------------------------------------------------------- Gila lizard
E['lizard'] = dict(name='Gila lizard', grid=[
    "..HHHH...............",
    ".HHEHHHXxXXxXXx......",
    "THHHHHXXXXXXXXXXX....",
    "..bbbbbbbbbbbbbXXXx..",
    "...LL.LL....LL.LL.XXx",
    "..LL...LL..LL...LL.xx",
], cmap=dict(H=(232, 124, 70), E='eye', T='red', X=(52, 40, 40), x=(232, 124, 70), b=(236, 168, 116),
             L=(52, 40, 40)),
    variants=[dict(H=(120, 170, 80), X=(96, 146, 64), x=(64, 104, 46), b=(196, 210, 140), L=(80, 124, 54)),
              dict(H=(196, 164, 116), X=(172, 140, 96), x=(128, 98, 64), b=(226, 206, 160), L=(150, 120, 80)),
              dict(H=(90, 110, 160), X=(64, 84, 130), x=(236, 196, 76), b=(150, 170, 206), L=(64, 84, 130))])

# ---------------------------------------------------------------- Scorpion
E['scorpion'] = dict(name='Scorpion', grid=[
    "..........XXX....",
    ".........XX.XX...",
    ".........X...kk..",
    ".........XX...k..",
    "..........X......",
    "CC.......XX....CC",
    "CCC.....XX....CCC",
    ".CC.XXXXXXXXX.CC.",
    "..CXXXXXXXXXXXC..",
    "...XEXXxXXxXEX...",
    "..L.L.L.L.L.L.L..",
    ".L..L.L...L.L..L.",
], cmap=dict(X=(206, 156, 84), x=(160, 114, 56), C=(190, 140, 70), k=(60, 40, 34), E='eye',
             L=(150, 106, 56)),
    variants=[dict(X=(56, 48, 52), x=(36, 30, 34), C=(70, 60, 64), L=(50, 42, 46), k=(196, 52, 40)),
              dict(X=(200, 70, 48), x=(150, 46, 34), C=(210, 84, 56), L=(140, 50, 36), k=(60, 30, 30))])

# ---------------------------------------------------------------- Tarantula
E['tarantula'] = dict(name='Tarantula', grid=[
    "...L.........L...",
    "..L.L..BBB..L.L..",
    ".L...LBBBBBL...L.",
    "L...LBBBbBBBL...L",
    "...LLBBBBBBBLL...",
    "..L.LBBBBBBBL.L..",
    ".L..L.BRERB.L..L.",
    "L...L..fff..L...L",
], cmap=dict(B=(80, 56, 46), b=(196, 110, 62), L=(64, 46, 40), R=(196, 52, 40), E='eye', f=(120, 84, 70)),
    variants=[dict(B=(44, 40, 48), b=(122, 72, 132), L=(36, 32, 40), f=(70, 60, 76)),
              dict(B=(160, 120, 80), b=(220, 170, 110), L=(130, 96, 64), f=(190, 150, 100))])
E['tarantula']['grid'][6] = ".L..L.BEBEB.L..L."
E['tarantula']['cmap']['R'] = (196, 52, 40)

# ---------------------------------------------------------------- Coyote
E['coyote'] = dict(name='Coyote', grid=[
    "...X.X..............",
    "...XXX..............",
    "..XXEXX.............",
    "NXXXXXXX............",
    "..bbXXXXXXXXXXXX.xx.",
    "....XXXXXXXXXXXXXxxx",
    "....bXXXXXXXXXXX..xx",
    "....XX.X.....XX.X...",
    "....X..X.....X..X...",
    "...NN.NN....NN.NN...",
], cmap=dict(X=(196, 150, 96), x=(150, 108, 64), b=(236, 214, 176), E='eye', N=(60, 42, 36)),
    variants=[dict(X=(150, 146, 140), x=(100, 96, 92), b=(220, 216, 208)),
              dict(X=(120, 74, 50), x=(80, 50, 36), b=(196, 160, 120))])

# ---------------------------------------------------------------- Vulture
E['vulture'] = dict(name='Vulture', grid=[
    ".......RRR......",
    "......RERER.....",
    ".......RYR......",
    "......NNNNN.....",
    "...WWNNNNNNNWW..",
    "..WWWWWWWWWWWWW.",
    ".WWWwWWWWWWWwWWW",
    ".WWwWWWWWWWWWwWW",
    "WWWwWWWWWWWWWwWW",
    "WW.wWWWWWWWWWw.W",
    "W...WWWWWWWWW...",
    "....wwW...Www...",
    ".....YY...YY....",
], cmap=dict(R=(206, 112, 96), E='eye', Y=(226, 196, 120), N=(232, 222, 206), W=(62, 50, 54),
             w=(40, 32, 36)),
    variants=[dict(R=(70, 64, 66), W=(96, 70, 52), w=(70, 50, 38)),
              dict(R=(206, 112, 96), N=(70, 60, 64), W=(150, 140, 132), w=(110, 102, 96))])

# ---------------------------------------------------------------- Armadillo (goofy)
E['armadillo'] = dict(name='Armadillo', grid=[
    "......XXXXXXX......",
    "....XXxXxXxXxXX....",
    ".SS.XxXxXxXxXxXX...",
    "SESSXxXxXxXxXxXXX..",
    "nSSSXxXxXxXxXxXXXSS",
    "....SS.......SS....",
], cmap=dict(X=(200, 176, 156), x=(150, 124, 108), S=(226, 170, 150), E='eye', n=(150, 90, 84)),
    variants=[dict(X=(170, 136, 106), x=(120, 92, 70)),
              dict(X=(160, 170, 182), x=(110, 120, 132))])

# ---------------------------------------------------------------- Jackalope (goofy)
E['jackalope'] = dict(name='Jackalope', grid=[
    "A...A.A.....",
    ".A.A..A.....",
    "..AA.A......",
    "..XAAX......",
    "..XX.X......",
    ".XXXXX......",
    "XEXXXXX.....",
    "nXXXXXXXXX..",
    "..bXXXXXXXXb",
    "..bXXXXXXXbb",
    "...XX..XXX..",
    "..XX..XXX...",
], cmap=dict(A=(214, 196, 160), X=(176, 140, 104), b=(240, 228, 210), E='eye', n=(222, 120, 140)),
    variants=[dict(X=(150, 146, 140), A=(232, 220, 196)),
              dict(X=(232, 226, 214), A=(176, 140, 104), E=(196, 52, 40))])

# ---------------------------------------------------------------- Skeleton outlaw (undead)
E['skeleton'] = dict(name='Skeleton outlaw', grid=[
    ".........HHHH.........",
    "........HHHHHH........",
    "........HLHHHH........",
    "...H....hhhhhh....H...",
    "...HHHHHHHHHHHHHHHH...",
    ".....HHHHHHHHHHHH.....",
    "........SSSSSS........",
    "........SEESEE........",
    "........SSSnSS........",
    ".........sSsS.........",
    "......DDDDDDDDDD......",
    ".....SS.SSSSSS.SS.....",
    "....SS..S.SS.S..SS....",
    "...SS...SSSSSS...SS...",
    "...SS....BBBB....SSGG.",
    "..S.S....SSSS....SSg..",
    ".........S..S.........",
    "........S....S........",
    "........S....S........",
    "........S....S........",
    "......KKKK..KKKK......",
], cmap=dict(H=(100, 72, 50), h=(70, 48, 34), L=(130, 96, 70), S=(232, 224, 200), s=(184, 174, 150),
             E='eye', n=(120, 110, 96), D=(160, 40, 34), B=(110, 66, 42), G=(196, 200, 206),
             g=(124, 122, 118), K=(60, 40, 32)),
    variants=[dict(H=(48, 40, 44), h=(28, 24, 28), L=(74, 64, 68), D=(64, 98, 156)),
              dict(E=(120, 220, 140), D=(70, 120, 80), H=(150, 144, 136), h=(108, 102, 96), L=(182, 176, 168))])

# ---------------------------------------------------------------- Cactus fiend
E['cactus'] = dict(name='Cactus fiend', grid=[
    ".........FF..........",
    "........XXXX.........",
    ".......XXxXXX........",
    ".......XEXXEX........",
    ".XX....XXxXXX....XX..",
    ".XX....XXnnnX....XX..",
    ".XxX...XXxXXX...XxX..",
    ".XXX...XXXXXX...XXX..",
    "..XXXXXXXxXXXXXXXX...",
    "...XXXXXXXXXXXXXX....",
    ".......XXxXXX........",
    ".......XXXXXX........",
    ".......XXxXXX........",
    "......XXXXXXXX.......",
    ".....XX......XX......",
    ".....dd......dd......",
], cmap=dict(X=(96, 146, 76), x=(66, 106, 54), E='eye', n=(150, 40, 34), F=(232, 110, 150),
             d=(150, 110, 70)),
    variants=[dict(X=(130, 160, 96), x=(96, 124, 70), F=(240, 200, 80)),
              dict(X=(76, 118, 104), x=(50, 86, 76), F=(240, 240, 230), E=(236, 196, 76))])

# ---------------------------------------------------------------- Giant sandworm (big)
E['sandworm'] = dict(name='Sandworm', grid=[
    "......XXXXXXX......",
    ".....XtXtXtXtX.....",
    "....XtMMMMMMMtX....",
    "....XMMMMMMMMMX....",
    "....XtMMMMMMMtX....",
    "....XXtXtXtXtXX....",
    ".....XxXXXXXxX.....",
    ".....XXxXXXxXX.....",
    ".....XxXXXXXxX.....",
    "....XXXxXXXxXXX....",
    "..ssXXxXXXXXxXXss..",
    ".sssssssssssssssss.",
    "sssSssssSsssssSssss",
], cmap=dict(X=(196, 136, 106), x=(150, 96, 74), t=(246, 240, 228), M=(110, 30, 34), s=(226, 186, 140),
             S=(190, 150, 110)),
    variants=[dict(X=(150, 140, 120), x=(110, 100, 86), M=(60, 30, 40)),
              dict(X=(170, 120, 160), x=(126, 84, 118), M=(70, 140, 90))])

ORDER = ['rattlesnake', 'lizard', 'scorpion', 'tarantula', 'coyote', 'vulture',
         'armadillo', 'jackalope', 'skeleton', 'cactus', 'sandworm']


def sprite(key, variant=None):
    t = E[key]
    cmap = dict(t['cmap'])
    if variant is not None:
        cmap.update(t['variants'][variant])
    return render(t['grid'], cmap)
