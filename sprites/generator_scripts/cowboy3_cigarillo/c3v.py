import c3
from PIL import Image, ImageDraw
SPLIT=24
def make(H,c):
    k=(H-3)/(SPLIT-3+(61-SPLIT)*c)
    def T(x,y):
        yy=y*k if y<=SPLIT else SPLIT*k+(y-SPLIT)*k*c
        return (round((x-13)*k)+1, round(yy-3*k)+1)
    c3.TF=T; c3.CANVAS=(round(39*k)+3,H)
    return c3.make('C')
if __name__=='__main__':
    out=[(n,make(H,c)) for n,H,c in [('64px_base',64,1.0),('48px_squat',48,0.7),('40px_squat',40,0.6),('32px_chibi',32,0.55),('24px_auto',24,0.5)]]
    for n,s in out: s.save(f'v_{n}.png')
    Z=6; pad=24; Ht=max(s.height for _,s in out)*Z+pad*2
    Wt=sum(s.width*Z for _,s in out)+pad*(len(out)+1)
    sheet=Image.new('RGBA',(Wt,Ht+30),(66,104,160,255)); d=ImageDraw.Draw(sheet)
    d.rectangle([0,Ht-pad-10,Wt,Ht+30],fill=(240,202,184))
    x=pad
    for name,s in out:
        b=s.resize((s.width*Z,s.height*Z),Image.NEAREST)
        sheet.alpha_composite(b,(x,Ht-pad-b.height)); d.text((x,Ht+4),name,fill=(60,40,30)); x+=b.width+pad
    sheet.convert('RGB').save('variants.png')
