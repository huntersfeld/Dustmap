import wiz, palm, numpy as np
from PIL import Image, ImageDraw
P=wiz.P; OUT=wiz.OUT; BLUE=palm.BLUE
G=wiz.put(wiz.BASE, wiz.ARM_DOWN+palm.SHOULDER)
h=len(G); W=24; M=3; TOP=3
LEG=20
def build(sel):
    a=np.zeros((h+TOP+2,W+2*M,4),np.uint8)
    for y,r in enumerate(G):
        for x,ch in enumerate(r):
            if ch!='.' and sel(x,y,ch): a[y+TOP,x+M]=list(P[ch])+[255]
    return a
L_tip =build(lambda x,y,c: y<=1)
L_hat =build(lambda x,y,c: 2<=y<=6 or (y==7 and c=='H'))
L_body=build(lambda x,y,c: 7<=y<LEG and not (y==7 and c=='H'))
L_tL  =build(lambda x,y,c: y>=LEG and c in 'Cc' and x<11)
L_tR  =build(lambda x,y,c: y>=LEG and c in 'Cc' and x>=11)
L_legs=build(lambda x,y,c: y>=LEG and c not in 'Cc')
sh=lambda a,dx,dy: np.roll(np.roll(a,dy,0),dx,1)
def outline(a):
    a=a.copy(); al=a[:,:,3]>0; o=np.zeros_like(al)
    for dy,dx in [(1,0),(-1,0),(0,1),(0,-1)]: o|=np.roll(np.roll(al,dy,0),dx,1)
    o&=~al; a[o]=list(OUT)+[255]; return a
B   =[0,0,1,1,1,1,0,0]
HAT =[0,0,1,1,1,1,1,0]
TIPY=[0,0,1,1,1,1,1,1]     # tip drops with hat, lifts late
TIPX=[0,0,0,0,1,1,0,0]     # and flops sideways a pixel
TAIL=[0,0,0,1,1,1,0,0]
FL=[
 [(0,0,0),(1,0,1),(0,-1,0),(1,-2,0),(1,-3,1),(0,-4,1),(0,-5,2)],
 [(0,0,0),(1,0,1),(0,-1,0),(0,-2,0),(1,-3,1),(1,-4,1),(1,-5,2)],
 [(0,0,0),(-1,0,1),(0,-1,0),(1,-1,1),(1,-2,0),(0,-3,1),(0,-4,2),(1,-6,2)],
 [(0,0,0),(1,0,1),(0,-1,0),(0,-2,0),(0,-3,1),(-1,-4,1),(-1,-5,2)],
 [(0,0,0),(1,0,1),(0,-1,0),(1,-1,1),(1,-2,0),(1,-3,1),(0,-4,1),(0,-5,2),(1,-7,2)],
 [(0,0,0),(0,-1,0),(1,-2,0),(1,-3,1),(2,-4,1),(1,-5,2)],
 [(0,0,0),(1,0,1),(0,-1,0),(0,-2,1),(1,-3,0),(1,-4,1),(0,-5,2),(0,-6,2)],
 [(0,0,0),(-1,0,1),(0,-1,0),(0,-2,0),(1,-3,1),(0,-4,1),(1,-5,2)],
]
frames=[]
for f in range(8):
    out=np.zeros_like(L_body)
    for a in [sh(L_tL,-TAIL[f],0),sh(L_tR,TAIL[f],0),L_legs,sh(L_body,0,B[f]),sh(L_hat,0,HAT[f]),sh(L_tip,TIPX[f]*-1,TIPY[f])]:
        m=a[:,:,3]>0; out[m]=a[m]
    out=outline(out)
    bx,by=22+M,11+TOP+B[f]
    for dx,dy,k in FL[f]:
        X,Y=bx+dx,by+dy
        if 0<=Y<out.shape[0] and 0<=X<out.shape[1] and (out[Y,X,3]==0 or tuple(out[Y,X,:3])==OUT): out[Y,X]=BLUE[k]
    # palm glow: tint fingertips blue on bright frames
    if f in (0,4,6):
        Y,X=11+TOP+B[f]+1,22+M
        out[Y,X]=(180,210,240,255)
    frames.append(Image.fromarray(out))
fw,fh=frames[0].size
frames[0].save('wizard_still.png')
sheet=Image.new('RGBA',(fw*8,fh),(0,0,0,0))
for i,fr in enumerate(frames): sheet.alpha_composite(fr,(i*fw,0))
sheet.save('idle4_sheet.png'); sheet.resize((fw*64,fh*8),Image.NEAREST).save('idle4_sheet_8x.png')
Z=10
def bgf(fr):
    g=Image.new('RGBA',(fw+4,fh+2),(66,104,160,255)); d=ImageDraw.Draw(g)
    d.rectangle([0,fh-3,fw+4,fh+2],fill=(240,202,184)); g.alpha_composite(fr,(2,0))
    return g.resize((g.width*Z,g.height*Z),Image.NEAREST).convert('RGB')
gf=[bgf(x) for x in frames]
gf[0].save('idle4.gif',save_all=True,append_images=gf[1:],duration=150,loop=0)
tf=[]
for fr in frames:
    big=fr.resize((fw*Z,fh*Z),Image.NEAREST); a=big.split()[3]
    p=big.convert('RGB').quantize(255); p.paste(255,mask=Image.eval(a,lambda v:255 if v<100 else 0)); tf.append(p)
tf[0].save('idle4_transparent.gif',save_all=True,append_images=tf[1:],duration=150,loop=0,transparency=255,disposal=2)
print(fw,fh)
