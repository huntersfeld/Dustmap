from PIL import Image, ImageDraw
import numpy as np, math
P=dict(hat=(140,90,58),hatd=(104,64,42),hatl=(168,114,74),cream=(244,234,212),creamd=(214,198,168),
 skin=(242,170,122),skind=(214,132,92),shirt=(140,128,70),shirtd=(108,98,52),vest=(78,50,38),
 red=(204,62,40),redd=(158,40,28),chap=(110,72,50),chapd=(84,52,36),boot=(44,30,30),
 grey=(160,160,150),greyd=(110,110,104),belt=(124,82,52),harm=(184,188,192),out=(36,24,22),hl=(252,200,160))
def make(H, c, detail=2):
    k=(H-3)/(31+29*c)
    def T(x,y):
        yy = y*k if y<=31 else 31*k+(y-31)*k*c
        return (round(x*k), round(yy - 3*k + 1))
    Wd=round(64*k)+2
    im=Image.new('RGBA',(Wd,H),(0,0,0,0)); d=ImageDraw.Draw(im)
    def poly(col,pts): d.polygon([T(*p) for p in pts],fill=P[col])
    def ell(col,b):
        a=T(b[0],b[1]); z=T(b[2],b[3]); d.ellipse([a[0],a[1],max(z[0],a[0]),max(z[1],a[1])],fill=P[col])
    def rect(col,b):
        a=T(b[0],b[1]); z=T(b[2],b[3]); d.rectangle([a[0],a[1],z[0],z[1]],fill=P[col])
    def line(col,pts): d.line([T(*p) for p in pts],fill=P[col])
    def pt(col,pts): d.point([T(*p) for p in pts],fill=P[col])
    # legs
    poly('chap',[(24,44),(40,44),(44,50),(44,57),(39,58),(38,52),(34,49),(30,49),(26,52),(25,58),(20,57),(20,50)])
    if detail>=2:
        poly('chapd',[(30,49),(34,49),(33,46),(31,46)])
        line('chapd',[(21,51),(21,56)]); line('chapd',[(43,51),(43,56)])
    poly('boot',[(19,57),(26,57),(26,60),(17,60),(17,59)])
    poly('boot',[(38,57),(45,57),(47,59),(47,60),(38,60)])
    if detail>=1: pt('grey',[(16,58),(48,58)])
    # torso
    poly('shirt',[(23,32),(41,32),(42,44),(22,44)])
    poly('vest',[(26,33),(38,33),(39,44),(25,44)])
    poly('red',[(27,31),(37,31),(33,38)])
    rect('belt',(22,43,42,45))
    rect('grey',(29,42,35,46))
    if detail>=2: rect('greyd',(30,43,34,45))
    # arms out and down (gunslinger)
    poly('shirt',[(23,32),(24,36),(17,42),(15,44),(13,42),(15,38),(19,33)])
    poly('shirt',[(41,32),(40,36),(47,42),(49,44),(51,42),(49,38),(45,33)])
    ell('skin',(11,43,16,48))
    # harmonica gripped in right hand, held horizontally
    ell('skin',(48,43,53,48))
    rect('harm',(46,41,57,45))
    rect('greyd',(47,43,56,43)) if detail>=2 else None
    if detail>=1: pt('out',[(48,43),(51,43),(54,43)] if detail>=2 else [(50,43),(54,43)])
    poly('skin',[(48,45),(53,45),(53,47),(48,47)])
    if detail>=2: line('skind',[(49,47),(52,47)]); pt('skind',[(11,47)])
    # hat
    poly('hatd',[(10,19),(54,19),(56,22),(48,25),(16,25),(8,22)])
    poly('hat',[(10,18),(54,18),(55,20),(47,23),(17,23),(9,20)])
    poly('hat',[(23,19),(24,8),(28,4),(32,7),(37,4),(41,8),(41,19)])
    rect('hatd',(24,16,40,18))
    if detail>=2: line('hatd',[(29,6),(32,9),(35,6)]); line('hatl',[(25,9),(25,15)])
    # mustache
    poly('cream',[(32,27),(27,25),(20,25),(13,24),(6,21),(3,17),(2,20),(4,25),(9,29),(16,31),(24,31),(30,30)])
    poly('cream',[(32,27),(37,25),(44,25),(51,24),(58,21),(61,17),(62,20),(60,25),(55,29),(48,31),(40,31),(34,30)])
    if detail>=2: line('creamd',[(8,28),(16,30),(24,30)]); line('creamd',[(40,30),(48,30),(56,28)])
    ell('skin',(29,23,35,28))
    if detail>=1: pt('hl',[(33,24)])
    return outline(im)
def outline(im):
    a=np.array(im); al=a[:,:,3]>0
    a=np.pad(a,((1,1),(1,1),(0,0))); al=np.pad(al,1)
    o=np.zeros_like(al)
    for dy,dx in [(1,0),(-1,0),(0,1),(0,-1)]: o|=np.roll(np.roll(al,dy,0),dx,1)
    o&=~al; a[o]=list(P['out'])+[255]
    return Image.fromarray(a)
variants=[('64px_base',64,1.0,2),('48px_squat',48,0.7,2),('40px_squat',40,0.6,1),('32px_chibi',32,0.55,1),('24px_tiny',24,0.5,0)]
out=[]
for name,H,c,det in variants:
    s=make(H,c,det); s.save(f'v_{name}.png'); out.append((name,s))
# comparison sheet: each at 6x, bottom-aligned, on desert bg
Z=6; pad=24; Ht=max(s.height for _,s in out)*Z+pad*2
Wt=sum(s.width*Z for _,s in out)+pad*(len(out)+1)
sheet=Image.new('RGBA',(Wt,Ht+30),(76,112,160,255)); d=ImageDraw.Draw(sheet)
d.rectangle([0,Ht-pad-10,Wt,Ht+30],fill=(240,202,184))
x=pad
for name,s in out:
    b=s.resize((s.width*Z,s.height*Z),Image.NEAREST)
    sheet.alpha_composite(b,(x,Ht-pad-b.height)); d.text((x,Ht+4),name,fill=(60,40,30)); x+=b.width+pad
sheet.convert('RGB').save('variants.png')
# also true-size strip to show actual scale
