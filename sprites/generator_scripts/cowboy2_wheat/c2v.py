import os; HERE=os.path.dirname(os.path.abspath(__file__))  # sibling scripts load from here
from PIL import Image, ImageDraw
import numpy as np
exec(open(os.path.join(HERE,'c2.py')).read().split("def make")[0])  # palette P
SPLIT=25
def make(H,c,det):
    k=(H-3)/(SPLIT-3+(60-SPLIT)*c)
    def T(x,y):
        yy=y*k if y<=SPLIT else SPLIT*k+(y-SPLIT)*k*c
        return (round((x-14)*k)+1, round(yy-3*k)+1)
    Wd=round(40*k)+3
    im=Image.new('RGBA',(Wd,H),(0,0,0,0)); d=ImageDraw.Draw(im)
    poly=lambda col,p: d.polygon([T(*q) for q in p],fill=P[col])
    def rect(col,b):
        a=T(b[0],b[1]); z=T(b[2],b[3]); d.rectangle([a[0],a[1],max(a[0],z[0]),max(a[1],z[1])],fill=P[col])
    def ell(col,b):
        a=T(b[0],b[1]); z=T(b[2],b[3]); d.ellipse([a[0],a[1],max(a[0],z[0]),max(a[1],z[1])],fill=P[col])
    line=lambda col,p: d.line([T(*q) for q in p],fill=P[col])
    pt=lambda col,p: d.point([T(*q) for q in p],fill=P[col])
    poly('coatd',[(22,30),(42,30),(45,50),(43,53),(38,51),(26,51),(21,53),(19,50)])
    poly('pants',[(26,38),(38,38),(39,56),(34,56),(32,44),(30,56),(25,56)])
    if det>=2: line('pantsd',[(32,40),(32,44)])
    poly('boot',[(24,55),(30,55),(31,59),(22,59),(22,58)])
    poly('boot',[(34,55),(40,55),(42,58),(42,59),(33,59)])
    if det>=1: pt('grey',[(20,57),(44,57)])
    poly('shirt',[(26,25),(38,25),(39,38),(25,38)])
    poly('coat',[(23,25),(28,24),(29,38),(28,50),(22,50),(21,36)])
    poly('coat',[(41,25),(36,24),(35,38),(36,50),(42,50),(43,36)])
    if det>=2:
        poly('coatl',[(24,24),(28,23),(29,28),(26,30)]); poly('coatl',[(40,24),(36,23),(35,28),(38,30)])
    poly('red',[(28,24),(36,24),(33,32),(31,32)])
    rect('belt',(25,37,39,38))
    ell('grey',(29,36,34,39))
    poly('holster',[(24,38),(28,38),(28,46),(25,47),(24,45)])
    if det>=1: poly('shirtd',[(24,35),(26,34),(27,35),(26,37),(25,37)])
    # arms relaxed
    poly('shirt',[(26,25),(22,27),(20,33),(22,34),(24,30)]); poly('shirt',[(38,25),(42,27),(44,33),(42,34),(40,30)])
    if det>=1: rect('shirtd',(20,32,22,33)); rect('shirtd',(42,32,44,33))
    poly('skin',[(20,34),(23,34),(23,40),(20,41)]); poly('skin',[(41,34),(44,34),(44,41),(41,40)])
    ell('skin',(19,40,23,44)); ell('skin',(41,40,45,44))
    # head
    poly('skin',[(27,14),(37,14),(37,22),(35,25),(29,25),(27,22)])
    if det>=2: rect('skind',(28,16,36,16))
    pt('out',[(29,17),(34,17)] if det<2 else [(29,17),(30,17),(33,17),(34,17)])
    if det>=2: pt('skind',[(32,18),(32,19),(31,19)])
    poly('hair',[(26,13),(28,13),(28,21),(26,20)]); poly('hair',[(36,13),(38,13),(38,20),(36,21)])
    poly('beard',[(27,18),(28,20),(30,21),(34,21),(36,20),(37,18),(37,22),(35,25),(29,25),(27,22)])
    if det>=2: line('beardd',[(30,24),(34,24)])
    if det>=1: pt('out',[(32,22),(33,22)])
    poly('hat',[(26,13),(27,6),(30,3),(32,5),(35,3),(38,6),(38,13)])
    rect('hatd',(26,10,38,12))
    poly('hat',[(17,13),(47,13),(49,11),(48,14),(40,16),(24,16),(16,14),(15,11)])
    if det>=2: line('hatd',[(20,15),(44,15)]); line('hatl',[(28,6),(28,9)])
    line('wheat',[(35,22),(40,22),(45,23),(49,25)])
    pt('wheatd',[(50,25),(51,26),(52,27)]); pt('wheat',[(51,25),(52,26)])
    return outline(im)
def outline(im):
    a=np.pad(np.array(im),((1,1),(1,1),(0,0))); al=a[:,:,3]>0; o=np.zeros_like(al)
    for dy,dx in [(1,0),(-1,0),(0,1),(0,-1)]: o|=np.roll(np.roll(al,dy,0),dx,1)
    o&=~al; a[o]=list(P['out'])+[255]; return Image.fromarray(a)
if __name__=='__main__':
    variants=[('64px_base',64,1.0,2),('48px_squat',48,0.7,2),('40px_squat',40,0.6,1),('32px_chibi',32,0.55,1),('24px_tiny',24,0.5,0)]
    out=[]
    for name,H,c,det in variants:
        s=make(H,c,det); s.save(f'v_{name}.png'); out.append((name,s))
    Z=6; pad=24; Ht=max(s.height for _,s in out)*Z+pad*2
    Wt=sum(s.width*Z for _,s in out)+pad*(len(out)+1)
    sheet=Image.new('RGBA',(Wt,Ht+30),(56,98,160,255)); d=ImageDraw.Draw(sheet)
    d.rectangle([0,Ht-pad-10,Wt,Ht+30],fill=(240,202,184))
    x=pad
    for name,s in out:
        b=s.resize((s.width*Z,s.height*Z),Image.NEAREST)
        sheet.alpha_composite(b,(x,Ht-pad-b.height)); d.text((x,Ht+4),name,fill=(60,40,30)); x+=b.width+pad
    sheet.convert('RGB').save('variants.png')
