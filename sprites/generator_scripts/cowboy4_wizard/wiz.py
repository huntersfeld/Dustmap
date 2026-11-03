import numpy as np
from PIL import Image, ImageDraw
P=dict(H=(112,74,52),h=(140,112,92),L=(140,96,68),R=(50,34,30),S=(232,158,112),s=(196,124,88),U=(80,130,200),E=(40,26,24),
 B=(58,40,34),C=(114,64,44),c=(76,42,30),l=(146,90,64),W=(196,182,156),A=(150,92,56),T=(66,42,32),G=(176,174,168),
 Q=(156,96,60),P=(104,100,62),p=(80,76,46),K=(96,58,42))
OUT=(28,18,16)
MARGIN=3
WISP=[(250,246,232,255),(214,226,244,240),(190,206,236,200)]
BASE=[
"......HHH.............",
"........HH............",
"........HHH...........",
"........HHHH..........",
"........HHHHH.........",
".......hhhhhhh........",
"..HHHHHHHHHHHHHHHHHH..",
".H....RRssssssRR....H.",
"......RRSUSSUSRR......",
"......RRSSSsSSRR......",
"......RRBSSSSBRR......",
"......RRBBEEBBRR......",
".....CCRlBBBBlRCC.....",
"....CCCClWSSWlCCCC....",
"....CCCClWAWWlCCCC....",
".....CCClWWAWlCCC.....",
".....CCClWWWAlCCC.....",
".....CCClTGGTACCC.....",
".....CCClPPPPQQCC.....",
".....CCccPPPPQQcCC....",
"....CCCccPP.PPccCCC...",
"....CCcc.PP.PP.ccCC...",
"...CCc...PP.PP...cCC..",
"........KKK.KKK.......",
]
def put(g,pts):
    g=[list(r.ljust(24,'.')) for r in g]
    for x,y,ch in pts: g[y][x]=ch
    return [''.join(r) for r in g]
mir=lambda pts:[(21-x,y,ch) for x,y,ch in pts]
ARM_DOWN=[(3,14,'C'),(3,15,'C'),(4,15,'C'),(5,15,'c'),(3,16,'C'),(4,16,'C'),(5,16,'c'),(2,17,'C'),(3,17,'l'),(4,17,'C'),(5,17,'c'),
          (3,18,'S'),(4,18,'S'),(3,19,'S')]
ARM_UP_R=[(17,13,'C'),(18,14,'C'),(17,14,'C'),(18,15,'C'),(19,15,'C'),(17,15,'c'),(18,16,'C'),(19,16,'l'),
          (19,14,'C'),(20,13,'C'),(20,12,'S'),(21,12,'S'),(20,11,'S'),(21,10,'S'),(19,11,'S')]
ARM_OUT=[(3,14,'C'),(2,15,'C'),(3,15,'C'),(4,15,'c'),(1,16,'C'),(2,16,'l'),(3,16,'C'),(4,16,'c'),(0,17,'C'),(1,17,'C'),(2,17,'C'),
         (0,18,'S'),(1,18,'S'),(1,19,'S')]
def wisp(x,y,big=True,flip=False):  # flame rising from (x,y)
    f=-1 if flip else 1
    pts=[(x,y,0),(x+f,y,1),(x,y-1,0),(x+f,y-2,0),(x+f,y-3,1),(x,y-4,1),(x,y-5,2)]
    return pts if big else [(x,y,0),(x,y-1,0),(x+f,y-2,1),(x+f,y-3,2)]
POSES={
 "A Relaxed":      (ARM_DOWN+mir(ARM_DOWN), wisp(20,18,False)),
 "B Palm up (art)":(ARM_DOWN+ARM_UP_R, wisp(21,9)),
 "C Arms out":     (ARM_OUT+[(21-x+1,y,ch) for x,y,ch in ARM_OUT], wisp(-1,18,False,True)+wisp(23,18,False)),
}
def render(g,w=[]):
    h=len(g); W=max(len(r) for r in g)
    m=MARGIN
    a=np.zeros((h+2,W+2*m,4),np.uint8)
    for y,r in enumerate(g):
        for x,ch in enumerate(r):
            if ch!='.': a[y+1,x+m]=list(P[ch])+[255]
    al=a[:,:,3]>0; o=np.zeros_like(al)
    for dy,dx in [(1,0),(-1,0),(0,1),(0,-1)]: o|=np.roll(np.roll(al,dy,0),dx,1)
    o&=~al; a[o]=list(OUT)+[255]
    for x,y,k in w:
        Y,X=y+1,x+m
        if 0<=Y<a.shape[0] and 0<=X<a.shape[1] and (a[Y,X,3]==0 or tuple(a[Y,X,:3])==OUT): a[Y,X]=WISP[k]
    return Image.fromarray(a)
if __name__=='__main__':
    Z=10; tw=30*Z+20
    sheet=Image.new('RGBA',(tw*3+10,27*Z+50),(30,30,34,255)); d=ImageDraw.Draw(sheet)
    for i,(name,(arms,w)) in enumerate(POSES.items()):
        g=put(BASE,arms); t=render(g,w); t.save(f'pose_{name[0]}.png')
        bg=Image.new('RGBA',(30,27),(66,104,160,255)); bd=ImageDraw.Draw(bg); bd.rectangle([0,23,30,27],fill=(240,202,184))
        bg.alpha_composite(t,(0,0))
        sheet.alpha_composite(bg.resize((30*Z,27*Z),Image.NEAREST),(10+i*tw,10)); d.text((14+i*tw,27*Z+20),name,fill=(230,230,230))
    sheet.save('wiz_mockups.png')
