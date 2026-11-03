import os; HERE=os.path.dirname(os.path.abspath(__file__))  # sibling scripts load from here
import sys; sys.argv=['x']
exec(open(os.path.join(HERE,'sprite2.py')).read().split("variants=[")[0])  # P, make, outline
from PIL import Image, ImageDraw
import numpy as np
H,c,det=24,0.5,0
k=(H-3)/(31+29*c)
def T(x,y):
    yy = y*k if y<=31 else 31*k+(y-31)*k*c
    return (round(x*k), round(yy-3*k+1))
Wd=round(64*k)+2
TOP=3
def layer(draw_fn):
    im=Image.new('RGBA',(Wd,H+TOP),(0,0,0,0)); d=ImageDraw.Draw(im)
    def poly(col,pts): d.polygon([(a,b+TOP) for a,b in (T(*p) for p in pts)],fill=P[col])
    def ell(col,bx):
        a=T(bx[0],bx[1]); z=T(bx[2],bx[3]); d.ellipse([a[0],a[1]+TOP,max(z[0],a[0]),max(z[1],a[1])+TOP],fill=P[col])
    def rect(col,bx):
        a=T(bx[0],bx[1]); z=T(bx[2],bx[3]); d.rectangle([a[0],a[1]+TOP,z[0],z[1]+TOP],fill=P[col])
    def pt(col,pts): d.point([(a,b+TOP) for a,b in (T(*p) for p in pts)],fill=P[col])
    draw_fn(poly,ell,rect,pt); return im
legs=layer(lambda poly,ell,rect,pt:[
    poly('chap',[(24,44),(40,44),(44,50),(44,57),(39,58),(38,52),(34,49),(30,49),(26,52),(25,58),(20,57),(20,50)]),
    poly('boot',[(19,57),(26,57),(26,60),(17,60),(17,59)]),
    poly('boot',[(38,57),(45,57),(47,59),(47,60),(38,60)])])
torso=layer(lambda poly,ell,rect,pt:[
    poly('shirt',[(23,32),(41,32),(42,44),(22,44)]),
    poly('vest',[(26,33),(38,33),(39,44),(25,44)]),
    poly('red',[(27,31),(37,31),(33,38)]),
    rect('belt',(22,43,42,45)), rect('grey',(29,42,35,46)),
    poly('shirt',[(23,32),(24,36),(17,42),(15,44),(13,42),(15,38),(19,33)]),
    poly('shirt',[(41,32),(40,36),(47,42),(49,44),(51,42),(49,38),(45,33)]),
    ell('skin',(11,43,16,48))])
hand=layer(lambda poly,ell,rect,pt:[
    ell('skin',(48,43,53,48)), rect('harm',(46,41,57,45)), pt('out',[(50,43),(54,43)]),
    poly('skin',[(48,45),(53,45),(53,47),(48,47)])])
hat=layer(lambda poly,ell,rect,pt:[
    poly('hatd',[(10,19),(54,19),(56,22),(48,25),(16,25),(8,22)]),
    poly('hat',[(10,18),(54,18),(55,20),(47,23),(17,23),(9,20)]),
    poly('hat',[(23,19),(24,8),(28,4),(32,7),(37,4),(41,8),(41,19)]),
    rect('hatd',(24,16,40,18))])
must=layer(lambda poly,ell,rect,pt:[
    poly('cream',[(32,27),(27,25),(20,25),(13,24),(6,21),(3,17),(2,20),(4,25),(9,29),(16,31),(24,31),(30,30)]),
    poly('cream',[(32,27),(37,25),(44,25),(51,24),(58,21),(61,17),(62,20),(60,25),(55,29),(48,31),(40,31),(34,30)])])
nose=layer(lambda poly,ell,rect,pt:[ell('skin',(29,23,35,28)), pt('hl',[(33,24)])])
def shift(im,dx,dy):
    o=Image.new('RGBA',im.size,(0,0,0,0)); o.alpha_composite(im,(dx,dy) if dx>=0 and dy>=0 else (0,0)) if (dx>=0 and dy>=0) else None
    if dx<0 or dy<0:
        o=Image.new('RGBA',im.size,(0,0,0,0)); o.paste(im,(dx,dy),im)
    return o
def must_frame(dy,tip):
    a=np.array(shift(must,0,dy)); w=a.shape[1]; out=np.zeros_like(a)
    TW=5  # outer columns that flap
    for x in range(w):
        s = tip if (x<TW or x>=w-TW-2) else (round(tip/2) if (x<TW+3 or x>=w-TW-5) else 0)
        out[:,x]=np.roll(a[:,x],s,axis=0)
    return Image.fromarray(out)
def frame(b,hb,tip,hd):
    im=Image.new('RGBA',legs.size,(0,0,0,0))
    im.alpha_composite(legs)
    im.alpha_composite(shift(torso,0,b))
    im.alpha_composite(shift(hand,0,b+hd))
    im.alpha_composite(shift(hat,0,b+hb))
    im.alpha_composite(must_frame(b,tip))
    im.alpha_composite(shift(nose,0,b))
    return outline(im)
# 8-frame cycle (down = +1)
B  =[0,0,1,1,1,1,0,0]
HB =[0,0,-1,0,0,0,1,0]   # hat lags/overshoots relative to body
TIP=[0,0,0,1,1,0,-1,-1]  # mustache tips trail
HD =[0,-1,-1,0,0,0,0,0]  # harmonica hand lift
frames=[frame(B[i],HB[i],TIP[i],HD[i]) for i in range(8)]
w,h=frames[0].size
sheet=Image.new('RGBA',(w*8,h),(0,0,0,0))
for i,f in enumerate(frames): sheet.alpha_composite(f,(i*w,0))
sheet.save('idle24_sheet.png')
sheet.resize((w*8*8,h*8),Image.NEAREST).save('idle24_sheet_8x.png')
# gif on background, 10x
Z=10
def bgf(f):
    g=Image.new('RGBA',(w+16,h+8),(76,112,160,255)); d=ImageDraw.Draw(g)
    d.rectangle([0,h+1,w+16,h+8],fill=(240,202,184))
    g.alpha_composite(f,(8,3)); return g.resize((g.width*Z,g.height*Z),Image.NEAREST).convert('RGB')
gf=[bgf(f) for f in frames]
gf[0].save('idle24.gif',save_all=True,append_images=gf[1:],duration=[140]*8,loop=0)
# transparent gif too
tf=[]
for f in frames:
    big=f.resize((w*Z,h*Z),Image.NEAREST); a=big.split()[3]
    p=big.convert('RGB').quantize(255); p.paste(255,mask=Image.eval(a,lambda v:255 if v<128 else 0)); tf.append(p)
tf[0].save('idle24_transparent.gif',save_all=True,append_images=tf[1:],duration=140,loop=0,transparency=255,disposal=2)
# preview strip
strip=Image.new('RGB',(len(gf)*gf[0].width//2,gf[0].height//2))
for i,g in enumerate(gf): strip.paste(g.resize((g.width//2,g.height//2),Image.NEAREST),(i*g.width//2,0))
strip.save('strip.png'); print(w,h)
