import smoke as S, tiny3, c3, numpy as np
from PIL import Image, ImageDraw
P=c3.P; M=tiny3.M
G=S.put(S.base,[(20,16,'k'),(21,16,'k'),(22,16,'a')])
W=27; G=[r.ljust(W,'.') for r in G]; h=len(G)
LEG=next(i for i,r in enumerate(G) if r.startswith("......cOCPP"))
TOP=2
def build(sel):
    a=np.zeros((h+TOP+1,W,4),np.uint8)
    for y,r in enumerate(G):
        for x,ch in enumerate(r):
            if ch!='.' and sel(x,y,ch): a[y+TOP,x]=list(P[M[ch]])+[255]
    return a
L_hat =build(lambda x,y,c: y<=5)
L_body=build(lambda x,y,c: 5<y<LEG)
L_tL  =build(lambda x,y,c: y>=LEG and c=='c' and x<11)
L_tR  =build(lambda x,y,c: y>=LEG and c=='c' and x>=11)
L_legs=build(lambda x,y,c: y>=LEG and c!='c')
sh=lambda a,dx,dy: np.roll(np.roll(a,dy,0),dx,1)
def outline(a):
    a=a.copy(); al=a[:,:,3]>0; o=np.zeros_like(al)
    for dy,dx in [(1,0),(-1,0),(0,1),(0,-1)]: o|=np.roll(np.roll(al,dy,0),dx,1)
    o&=~al; a[o]=list(P['out'])+[255]; return a
B   =[0,0,1,1,1,1,0,0]
HAT =[0,0,1,1,1,1,1,0]
TAIL=[0,0,0,1,1,1,0,0]
EMB =[(255,112,40),(255,150,60),(255,112,40),(230,90,36),(255,112,40),(255,170,70),(255,128,48),(230,90,36)]
PATH=[(0,-1),(0,-2),(1,-3),(1,-4),(0,-5),(1,-6),(2,-7),(2,-8)]
SM=[(214,218,230,255),(206,210,224,240),(190,196,212,220),(176,182,200,170)]
frames=[]
for f in range(8):
    out=np.zeros_like(L_body)
    for a in [sh(L_tL,-TAIL[f],0),sh(L_tR,TAIL[f],0),L_legs,sh(L_body,0,B[f]),sh(L_hat,0,HAT[f])]:
        m=a[:,:,3]>0; out[m]=a[m]
    out=outline(out)
    ex,ey=23,16+TOP+B[f]
    out[ey,ex]=list(EMB[f])+[255]
    for j in range(4):           # 4 puffs spaced along the path, rising each frame
        dx,dy=PATH[(f+j*2)%8]
        x,y=ex+dx,ey+dy
        if 0<=y<out.shape[0] and x<W and out[y,x,3]==0:
            out[y,x]=SM[min(3,((f+j*2)%8)//2)]
    frames.append(Image.fromarray(out))
fw,fh=frames[0].size
frames[0].save('still_cigarillo.png')
sheet=Image.new('RGBA',(fw*8,fh),(0,0,0,0))
for i,fr in enumerate(frames): sheet.alpha_composite(fr,(i*fw,0))
sheet.save('idle3_sheet.png'); sheet.resize((fw*64,fh*8),Image.NEAREST).save('idle3_sheet_8x.png')
Z=10
def bgf(fr):
    g=Image.new('RGBA',(fw+6,fh+3),(66,104,160,255)); d=ImageDraw.Draw(g)
    d.rectangle([0,fh-2,fw+6,fh+3],fill=(240,202,184)); g.alpha_composite(fr,(3,0))
    return g.resize((g.width*Z,g.height*Z),Image.NEAREST).convert('RGB')
gf=[bgf(x) for x in frames]
gf[0].save('idle3.gif',save_all=True,append_images=gf[1:],duration=150,loop=0)
tf=[]
for fr in frames:
    big=fr.resize((fw*Z,fh*Z),Image.NEAREST); a=big.split()[3]
    p=big.convert('RGB').quantize(255); p.paste(255,mask=Image.eval(a,lambda v:255 if v<100 else 0)); tf.append(p)
tf[0].save('idle3_transparent.gif',save_all=True,append_images=tf[1:],duration=150,loop=0,transparency=255,disposal=2)
strip=Image.new('RGB',(gf[0].width*4//2,gf[0].height),(0,0,0))
for i,g in enumerate(gf): strip.paste(g.resize((g.width//2,g.height//2),Image.NEAREST),((i%4)*g.width//2,(i//4)*g.height//2))
strip.save('check3.png'); print(fw,fh,LEG)
