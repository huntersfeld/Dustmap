import c3, numpy as np
from PIL import Image, ImageDraw
P=c3.P
M={'H':'hat','h':'hatd','L':'hatl','R':'hair','S':'skin','s':'skind','E':'out','M':'must','W':'shirt','T':'tie',
   'V':'vest','C':'coat','c':'coatd','l':'coatl','B':'belt','G':'grey','O':'holster','P':'pants','p':'pantsd',
   'K':'boot','Z':'grey','b':'btn'}
GRID=[
".........HHHH.........",
"........HHHHHH........",
"........HLHHHH........",
"..H.....hhhhhh.....H..",
"..HHHHHHHHHHHHHHHHHH..",
"....HHHHHHHHHHHHHH....",
".......RssssssR.......",
".......RSEsSESR.......",
".......RSSSsSSR.......",
"........SMMMMS........",
"........MSSSSM........",
"......CCMWTTWMCC......",
".....lCClVTTVlCCl.....",
"....lCcClVVbVlCcCl....",
"...lCc.ClVVVVlC.cCl...",
"...WW..GBBGGBBC..WW...",
"..SSS.OOCPPPPC...SSS..",
"..SS..OOCPPPPCc...SS..",
"......cOCPPpPPCc......",
".....ccCPP.PPPCcc.....",
"......c.PP..PP.c......",
"......ZKKK..KKKZ......",
]
def tiny(grid=GRID):
    h=len(grid); w=max(len(r) for r in grid)
    a=np.zeros((h,w,4),np.uint8)
    for y,r in enumerate(grid):
        for x,ch in enumerate(r):
            if ch!='.': a[y,x]=list(P[M[ch]])+[255]
    return c3.outline(Image.fromarray(a))
if __name__=='__main__':
    t=tiny(); print(t.size); t.save('v_24px_tiny.png')
    t.resize((t.width*16,t.height*16),Image.NEAREST).save('z_tiny.png')
