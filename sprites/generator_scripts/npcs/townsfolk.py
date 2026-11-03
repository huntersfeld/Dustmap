"""Townsfolk / NPC token mockups (static, no animation yet)."""
from palette import render

BASE = dict(E='eye', S='skin', s='skind', H='hatbr', h='hatbrd', L='hatbrl', R='hairbr', M='hairbr',
            W='shirt', w='shirtd', V='vest', v='vestd', C='black', c='blackd', D='red', d='redd',
            B='belt', Y='gold', O='leather', P='pants', p='pantsd', K='boot', Z='grey', G='steel',
            g='greyd', T='black', N='white')


def cm(**kw):
    d = dict(BASE)
    d.update(kw)
    return d


T = {}

# ---------------------------------------------------------------- Bandit
T['bandit'] = dict(name='Bandit', grid=[
    ".........HHHH.........",
    "........HHHHHH........",
    "........HLHHHH........",
    "...H....hhhhhh....H...",
    "...HHHHHHHHHHHHHHHH...",
    ".....HHHHHHHHHHHH.....",
    ".......RSSSSSSR.......",
    ".......RSESSESR.......",
    ".......RDDDDDDR.......",
    "........DDdDDD........",
    "......VVWdDDdWVV......",
    ".....VVVWWdDWWVVV.....",
    "....WVVVWWWWWWVVVW....",
    "...WW.VVWWWWWWVV.WW...",
    "...SS.OBBBYYBBBO.SSGG.",
    "..SS..OOPPPPPPOO..Sg..",
    "......OOPPPPPPP.......",
    ".......PPPPpPPP.......",
    ".......PPP..PPP.......",
    "........PP..PP........",
    "......KKKK..KKKK......",
], cmap=cm(H='hatblk', h='hatblkd', L='hatblkl', R='hairblk', W='khaki', w='khakid'),
    variants=[dict(D='blue', d='blued'), dict(D='black', d='blackd', S='skin2', s='skin2d'),
              dict(D='green', d='greend', S='skin3', s='skin3d', H='hatbr', h='hatbrd', L='hatbrl')])

# ---------------------------------------------------------------- Desperado (bandit boss)
T['desperado'] = dict(name='Desperado', grid=[
    "........HHHHHH........",
    ".......HHHHHHHH.......",
    ".......HLHHHHHH.......",
    ".H.....hGhhhGhh.....H.",
    ".HHHHHHHHHHHHHHHHHHHH.",
    "...HHHHHHHHHHHHHHHH...",
    ".......RSSSSSSR.......",
    ".......RSESSESR.......",
    ".......RSMMMMSR.......",
    "........MSYSSM........",
    "......CCWDDDDWCC......",
    ".....lCCWOWDOWCCl.....",
    "....lCcCWWOOWWCcCl....",
    "...lCc.CWOWWOWC.cCl...",
    "...WW.GOBBYYBBOG.WW...",
    "..SSS.OOCPPPPCOO.SSS..",
    "..SS..OOCPPPPCc...SS..",
    "......cOCPPpPPCc......",
    ".....ccCPP.PPPCcc.....",
    "......c.PP..PP.c......",
    "......ZKKK..KKKZ......",
], cmap=cm(H='hatblk', h='hatblkd', L='hatblkl', R='hairblk', M='hairblk', C='leather', c='leatherd',
           l='hatbrl', W='shirt', D='red', O='belt'),
    variants=[dict(C='black', c='blackd', l='blackl', S='skin2', s='skin2d'),
              dict(C='purple', c='purpled', l='pink', D='gold', S='skin3', s='skin3d')])

# ---------------------------------------------------------------- Miner
T['miner'] = dict(name='Miner', grid=[
    "....................gG",
    "..........FF.......gG.",
    "........HHFFHH....gGG.",
    ".......HHLHHHHH..JG...",
    ".......HHHHHHHH..J....",
    "......hhhhhhhhhh.J....",
    ".......RSSSSSSR..J....",
    ".......RSESSESR..J....",
    ".......RsSSSSsR..J....",
    "........MMMMMM..SJ....",
    "......WWVWWWWVWWSJ....",
    ".....WWWVWWWWVWWW.....",
    ".....WWwVWWWWVwW......",
    ".....WW.VWWWWV.WW.....",
    ".....SS.BBBYBBB.SS....",
    ".....SS.PPPPPPP.SS....",
    "........PPPPPPP.......",
    "........PPPpPPP.......",
    "........PPP.PPP.......",
    "........PP...PP.......",
    "......KKKK...KKKK.....",
], cmap=cm(H='khaki', h='khakid', L='hattanl', F='lamp', R='hairbr', M='hairbr', W='plaid', w='plaidd',
           V='leather', P='denim', p='denimd', G='steel', g='greyd', J='wood'),
    variants=[dict(W='blue', w='blued', S='skin2', s='skin2d', M='hairblk', R='hairblk'),
              dict(W='khaki', w='khakid', S='skin3', s='skin3d', M='hairgry', R='hairgry')])


# ---------------------------------------------------------------- Barkeep
T['barkeep'] = dict(name='Barkeep', grid=[
    "......................",
    "......................",
    "........RRRRRR........",
    ".......RRRNRRRR.......",
    ".......RSSSSSSR.......",
    ".......SSSSSSSS.......",
    ".......SESSSSES.......",
    ".......SSSssSSS.......",
    ".....MMMMMMMMMMMM.....",
    ".....M..SSSSSS..M.....",
    "......WWVTTTTVWW......",
    ".....WWWVWTTWVWWW.....",
    ".....WWwVAAAAVwWW.....",
    ".....WW.AAAAAA.WW.....",
    ".....SS.AAAAAA.SS.GG..",
    ".....SS.AAAAAA.SSGQQG.",
    "........AAaAAA...GQQG.",
    "........AAaAAA....GG..",
    "........PPP.PPP.......",
    "........PP...PP.......",
    "......KKKK...KKKK.....",
], cmap=cm(R='hairblk', N='blackl', M='hairblk', V='black', T='red', A='shirt', a='shirtd',
           P='black', p='blackd', G='steel', Q='gold'),
    variants=[dict(S='skin2', s='skin2d', R='hairred', M='hairred', N='hatbrl', T='green'),
              dict(S='skin3', s='skin3d', R='hairgry', M='hairgry', N='white', T='blue')])
T['barkeep']['cmap'].update(N='hairbr')
T['barkeep']['cmap']['blackl'] = 'blackl'

# ---------------------------------------------------------------- Cowboy (generic ranch hand)
T['cowboy'] = dict(name='Cowboy', grid=[
    ".........HHHH.........",
    "........HHHHHH........",
    "........HLHhHH........",
    "..HH....hhhhhh....HH..",
    "...HHHHHHHHHHHHHHHH...",
    ".....HHHHHHHHHHHH.....",
    ".......RSSSSSSR.......",
    ".......RSESSESR.......",
    ".......RSSsSSSR.......",
    "........SSSSSS........",
    "......WWWDDDDWWW......",
    ".....WWWWWDDWWWWW.....",
    ".....WWwWWWWWWwWW.....",
    ".....WW.WWWWWW.WW.....",
    ".....SS.OBBYBBO.SS....",
    ".....SS.OPPPPPO.SSL...",
    "......L.OPPPPPO.LL.L..",
    "........OOPpPOO..LLL..",
    "........OOO.OOO.......",
    "........PP...PP.......",
    "......ZKKK...KKKZ.....",
], cmap=cm(H='hattan', h='hattand', L='hattanl', W='plaid', w='plaidd', D='shirt', O='leather',
           P='denim', p='denimd'),
    variants=[dict(W='blue', w='blued', H='hatbr', h='hatbrd', S='skin2', s='skin2d'),
              dict(W='green', w='greend', H='hatgry', h='hatgryd', S='skin3', s='skin3d', R='hairblk')])
# lasso coil uses L (rope); keep hat highlight distinct
T['cowboy']['grid'] = [r[:15] + r[15:].replace('L', 'J') if i >= 15 else r for i, r in enumerate(T['cowboy']['grid'])]
T['cowboy']['grid'][16] = "......J.OPPPPPO.JJ.J.."
T['cowboy']['cmap']['J'] = 'hattanl'

# ---------------------------------------------------------------- Cowgirl
T['cowgirl'] = dict(name='Cowgirl', grid=[
    ".........HHHH.........",
    "........HHHHHH........",
    "........HLHHHH........",
    "...H....hhhhhh....H...",
    "...HHHHHHHHHHHHHHHH...",
    ".....HHHHHHHHHHHH.....",
    "......RRSSSSSSRR......",
    "......RRSESSESRR......",
    "......RRSSSSSSRR......",
    "......RR.SSSS.RR......",
    "......RVWWDDWWVR......",
    ".....WVVVWWWWVVVW.....",
    ".....WVvVWWWWVvVW.....",
    ".....SV.VVWWVV.VS.....",
    ".....SS.BBBYBBB.SS....",
    "........XXXXXXX.......",
    ".......XXXXXXXXX......",
    "......XXXxXXXxXXX.....",
    "......xXXXXXXXXXx.....",
    ".........S...S........",
    "........KKK..KKK......",
], cmap=cm(H='shirt', h='red', L='white', R='hairblond', V='leather', v='leatherd', W='shirt',
           D='red', X='denim', x='denimd'),
    variants=[dict(R='hairred', H='hatbr', h='hatbrd', L='hatbrl', X='purple', x='purpled'),
              dict(R='hairblk', S='skin3', s='skin3d', H='hatblk', h='gold', L='hatblkl', X='khaki', x='khakid')])

# ---------------------------------------------------------------- Sheriff
T['sheriff'] = dict(name='Sheriff', grid=[
    ".........HHHH.........",
    "........HHHHHH........",
    "........HLHHHH........",
    "...H....hhhhhh....H...",
    "...HHHHHHHHHHHHHHHH...",
    ".....HHHHHHHHHHHH.....",
    ".......RSSSSSSR.......",
    ".......RSESSESR.......",
    ".......RMMMMMMR.......",
    "........M.SS.M........",
    "......VVWWTTWWVV......",
    ".....VVVWWWWWWVVV.....",
    "....WVYVWWWWWWVVVW....",
    "...WW.VVWWWWWWVV.WW...",
    "...SS.OBBBYYBBBO.SS...",
    "..SS..OOPPPPPPOO..SS..",
    "......OOPPPPPPOO......",
    ".......PPPPpPPP.......",
    ".......PPP..PPP.......",
    "........PP..PP........",
    "......ZKKK..KKKZ......",
], cmap=cm(H='hatgry', h='hatblk', L='hatgryl', M='hairgry', R='hairgry', V='leather', v='leatherd',
           W='shirt', T='black'),
    variants=[dict(H='shirt', h='hatbr', L='white', S='skin2', s='skin2d', M='hairbr', R='hairbr'),
              dict(H='hatblk', h='gold', L='hatblkl', S='skin3', s='skin3d', M='hairblk', R='hairblk')])

# ---------------------------------------------------------------- Saloon singer
T['singer'] = dict(name='Saloon singer', grid=[
    "...........F..........",
    "..........FF..........",
    "........RRFRRR........",
    ".......RRRRRRRR.......",
    "......RRSSSSSSRR......",
    "......RRSESSESRR......",
    "......RRSSSSSSRR......",
    "......RRSSDDSSRR......",
    ".......R.SSSS.R.......",
    "........SSSSSS........",
    ".....XXSXXXXXXSXX.....",
    ".....SSXXXXXXXXSS.....",
    ".....SS.XXxXXX.SS.....",
    ".....SS.XXXXXX.SS.....",
    "........XXXXXX........",
    ".......NXXXXXXN.......",
    "......NXXXxXXXXN......",
    ".....NXXXXXXXXXXN.....",
    ".....NNXXxXXXxXNN.....",
    "......NNNNNNNNNN......",
    ".......KK....KK.......",
], cmap=cm(F='pink', R='hairred', D='red', X='red', x='redd', N='white'),
    variants=[dict(X='purple', x='purpled', F='gold', R='hairblk'),
              dict(X='blue', x='blued', F='white', R='hairblond', S='skin3', s='skin3d')])

# ---------------------------------------------------------------- Undertaker (goofy)
T['undertaker'] = dict(name='Undertaker', grid=[
    ".........HHHHH........",
    ".........HHHHH........",
    ".........HLHHH........",
    ".........HHHHH........",
    ".........hhhhh........",
    ".......HHHHHHHHH......",
    "........SSSSSSS.......",
    "........SESSSES.......",
    "........SSSSSSS.......",
    "........SSEEESS.......",
    ".........SSSSS........",
    ".......CCCWTWCCC......",
    "......CCCCWTWCCCC.....",
    "......CCcCCWCCcCC.....",
    "......CC.CCCCC.CC.....",
    "......SS.CCCCC.SS.....",
    "........CCCcCCC.......",
    "........CCCcCCC.......",
    "........CCC.CCC.......",
    ".........PP.PP........",
    "........KKK.KKK.......",
], cmap=cm(H='hatblk', h='blackl', L='hatblkl', S='pale', s='paled', M='blackl', C='black', c='blackd',
           W='shirt', T='black', P='blackd'),
    variants=[dict(h='purple', S='skin', s='skind', M='hairgry'),
              dict(h='red', S='skin3', s='skin3d', M='hairblk')])

# ---------------------------------------------------------------- Snake-oil salesman (goofy)
T['snakeoil'] = dict(name='Snake-oil seller', grid=[
    "....................",
    "...................",
    "........HHHHHH.....GG.",
    ".......HLHHHHHH...GQQG",
    ".......hhhhhhhh...GQQG",
    "......HHHHHHHHHH..GQQG",
    ".......RSSSSSSR...GQQG",
    ".......RSESSESR....SS.",
    ".......MMMssMMM....S..",
    "........SSSSSS....SX..",
    "......XXWTTTWXXXXXX...",
    ".....XXXWWTWWXXXXX....",
    ".....XXxXWWWXXxX......",
    ".....XX.XXXXXX........",
    ".....SS.XXxXXX........",
    ".....SS.XXXXXX........",
    "........xxxxxxx.......",
    "........XXXxXXX.......",
    "........XXX.XXX.......",
    "........XX...XX.......",
    "......KKKK...KKKK.....",
], cmap=cm(H='hattanl', h='red', L='white', M='hairbr', X='green', x='greend', T='red', G='white',
           Q='bottle'),
    variants=[dict(X='plaid', x='plaidd', h='blue', Q='purple'),
              dict(X='purple', x='purpled', h='gold', Q='red', S='skin2', s='skin2d')])

# ---------------------------------------------------------------- Old prospector (goofy)
T['prospector'] = dict(name='Prospector', grid=[
    "......................",
    "......................",
    ".........HHHH.........",
    "........HHLHHH........",
    "......HHhhhhhhHH......",
    ".......RSSSSSSR.......",
    ".......RSESSESR.......",
    "......RRSSSsSSRR......",
    "......MMMMMMMMMM......",
    "......MMMMEMMMMM......",
    ".....VMMMMMMMMMMV.....",
    ".....VVMMMMMMMMVV.....",
    ".....VV.MMMMMM.VV.....",
    ".....SS.MMMMMM.SS.....",
    "...GGGGGGMMMM.........",
    "...gGGGGGgMM..........",
    "....gggggPPPP.........",
    "........PPPpPPP.......",
    "........PPP.PPP.......",
    "........PP...PP.......",
    "......KKKK...KKKK.....",
], cmap=cm(H='hatbr', h='hatbrd', L='hatbrl', R='hairgry', M='hairgry', V='red', v='redd',
           G='grey', g='greyd', P='khaki', p='khakid'),
    variants=[dict(H='hattan', h='hattand', L='hattanl', V='blue', S='skin2', s='skin2d'),
              dict(V='green', S='skin3', s='skin3d', G='gold', g='goldd')])
# hands holding gold pan: put skin at row 14 ends
T['prospector']['grid'][14] = "..SGGGGGGMMMMS........"
T['prospector']['grid'][13] = ".....SS.MMMMMM.SS....."
T['prospector']['grid'][13] = ".....V..MMMMMM..V....."
T['prospector']['grid'][15] = "...gGYGGGgMM..........".replace('Y', 'Y')

# ---------------------------------------------------------------- Town drunk (goofy)
T['drunk'] = dict(name='Town drunk', grid=[
    "..........HHHH........",
    ".........HHHHHH.......",
    ".........HLHHHH.......",
    "......H..hhhhhh.......",
    "......HHHHHHHHHHHH....",
    "........HHHHHHHHHHH...",
    ".......RSSSSSSR.......",
    ".......RSEsSEsR.......",
    ".......RSSXXSSR.......",
    "........SMMMMS........",
    "......WWWSSSWWW.......",
    ".....WWWVWWWVWWWQ.....",
    ".....WWwVWWWVwWWQ.....",
    ".....WW.VWWWV.SSQ.....",
    ".....SS.BBBBBB.SQ.....",
    ".....SS.PPPPPPP.......",
    "........PPPPPPP.......",
    "........PPPpPPP.......",
    ".........PP.PPP.......",
    "........PP....PP......",
    "......KKKK....KKKK....",
], cmap=cm(H='hatgry', h='hatgryd', L='hatgryl', X='nose', M='hairbr', W='shirtd', w='khakid',
           V='red', Q='bottle', P='pantsd'),
    variants=[dict(H='hatbr', h='hatbrd', L='hatbrl', V='blue', S='skin2', s='skin2d'),
              dict(H='hatblk', h='hatblkd', L='hatblkl', V='green', S='skin3', s='skin3d', M='hairgry')])

# ---------------------------------------------------------------- Kid in a big hat (goofy)
T['kid'] = dict(name='Kid w/ big hat', grid=[
    "......................",
    "........HHHHHH........",
    ".......HHHHHHHH.......",
    ".......HLHHHHHH.......",
    "......hhhhhhhhhh......",
    ".HHHHHHHHHHHHHHHHHHHH.",
    "...HHHHHHHHHHHHHHHH...",
    "........SSSSSS........",
    "........ESSSSE........",
    "........SSDDSS........",
    "........WWWWWW........",
    ".......WWWDDWWW.......",
    "......SWWWWWWWWS......",
    "......S.BBYYBB.S......",
    "........PPPPPP........",
    "........PP..PP........",
    ".......KKK..KKK.......",
], cmap=cm(H='hattan', h='red', L='hattanl', D='redd', W='blue', P='denim', p='denimd'),
    variants=[dict(H='hatblk', h='hatblkd', L='hatblkl', W='plaid', S='skin2', s='skin2d'),
              dict(H='white', h='blue', L='white', W='green', S='skin3', s='skin3d')])
T['kid']['cmap']['D'] = 'skind'
T['kid']['grid'][11] = ".......WWWWWWWW......."

ORDER = ['bandit', 'desperado', 'miner', 'barkeep', 'cowboy', 'cowgirl', 'sheriff', 'singer',
         'undertaker', 'snakeoil', 'prospector', 'drunk', 'kid']


def sprite(key, variant=None):
    t = T[key]
    cmap = dict(t['cmap'])
    if variant is not None:
        cmap.update(t['variants'][variant])
    return render(t['grid'], cmap)
