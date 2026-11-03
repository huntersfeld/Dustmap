import os; HERE=os.path.dirname(os.path.abspath(__file__))  # sibling scripts load from here
src=open(os.path.join(HERE,'tiny.py')).read().split("\nif __name__")[0]
exec(src)
from PIL import Image, ImageDraw
import numpy as np
G=["."*22]+GRID[0:6]+["......RssssssR........"]+GRID[8:]
G=[r.ljust(22,'.') for r in G]
h,w=len(G),22
TOP=2  # headroom
def build(sel):
    a=np.zeros((h+TOP+1,w,4),np.uint8)
    for y,r in enumerate(G):
        for x,ch in enumerate(r):
            if ch!='.' and sel(x,y,ch): a[y+TOP,x]=list(P[M[ch]])+[255]
    return a
HAT_END=6; LEG_START=19
WHEAT_HEAD=lambda x,y,ch: ch in 'Yy' and x>=16
L_hat  = build(lambda x,y,ch: y<=HAT_END)
L_wstk = build(lambda x,y,ch: ch in 'Yy' and x<16)
L_whd  = build(WHEAT_HEAD)
L_tail = build(lambda x,y,ch: y>=LEG_START and ch in 'c')
L_legs = build(lambda x,y,ch: y>=LEG_START and ch not in 'c')
L_body = build(lambda x,y,ch: HAT_END<y<LEG_START and ch not in 'Yy')
def sh(a,dx,dy): return np.roll(np.roll(a,dy,0),dx,1)
def comp(layers):
    out=np.zeros_like(L_body)
    for a in layers:
        m=a[:,:,3]>0; out[m]=a[m]
    return outline(Image.fromarray(out))
B   =[0,0,1,1,1,1,0,0]
HAT =[0,0,1,1,1,1,1,0]      # hat settles with body, lifts a frame late
WHD =[1,0,0,0,1,1,1,1]      # wheat head trails by two
TAIL=[0,0,0,1,1,1,0,0]      # duster tails drift
L_tailL=build(lambda x,y,ch: y>=LEG_START and ch=='c' and x<11)
L_tailR=build(lambda x,y,ch: y>=LEG_START and ch=='c' and x>=11)
frames=[]
for i in range(8):
    t=TAIL[i]
    frames.append(comp([sh(L_tailL,-t,0), sh(L_tailR,t,0), L_legs, sh(L_body,0,B[i]),
        sh(L_wstk,0,B[i]), sh(L_whd,0,WHD[i]), sh(L_hat,0,HAT[i])]))
W_,H_=frames[0].size
sheet=Image.new('RGBA',(W_*8,H_),(0,0,0,0))
for i,f in enumerate(frames): sheet.alpha_composite(f,(i*W_,0))
sheet.save('idle_sheet.png'); sheet.resize((W_*64,H_*8),Image.NEAREST).save('idle_sheet_8x.png')
Z=10
def bgf(f):
    g=Image.new('RGBA',(W_+12,H_+4),(56,98,160,255)); d=ImageDraw.Draw(g)
    d.rectangle([0,H_-1,W_+12,H_+4],fill=(240,202,184)); g.alpha_composite(f,(6,1))
    return g.resize((g.width*Z,g.height*Z),Image.NEAREST).convert('RGB')
gf=[bgf(f) for f in frames]
gf[0].save('idle.gif',save_all=True,append_images=gf[1:],duration=150,loop=0)
tf=[]
for f in frames:
    big=f.resize((W_*Z,H_*Z),Image.NEAREST); a=big.split()[3]
    p=big.convert('RGB').quantize(255); p.paste(255,mask=Image.eval(a,lambda v:255 if v<128 else 0)); tf.append(p)
tf[0].save('idle_transparent.gif',save_all=True,append_images=tf[1:],duration=150,loop=0,transparency=255,disposal=2)
print(W_,H_)
