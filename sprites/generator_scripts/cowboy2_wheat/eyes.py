import os; HERE=os.path.dirname(os.path.abspath(__file__))  # sibling scripts load from here
import sys
src=open(os.path.join(HERE,'tiny.py')).read().split("\nif __name__")[0]
exec(src)
from PIL import ImageDraw
base=list(GRID)
def v(**rows):
    g=list(base)
    for k,r in rows.items(): g[int(k[1:])]=r
    return g
low=[" "*22]+base[0:6]+["......RssssssR........"]+base[8:]
low=[r.replace(' ','.') for r in low]
V=[
 ("1 Current", base),
 ("2 Shadow band", v(r6="......RssssssR........", r7="......RsEssEsR........")),
 ("3 Faint slits", v(r6="......RssssssR........", r7="......RSsSSsSR........")),
 ("4 Fully shaded", v(r6="......RssssssR........", r7="......RssssssR........")),
 ("5 Hat pulled low", low),
 ("6 Steely glint", v(r6="......RssssssR........", r7="......RssssWsR........")),
]
def render(g):
    global GRID; GRID=g; return tiny()
Z=10; tw=26*Z+20; th=30*Z+40
sheet=Image.new('RGBA',(tw*len(V)+10,th),(30,30,34,255)); d=ImageDraw.Draw(sheet)
for i,(name,g) in enumerate(V):
    t=render(g); t.save(f'eyes_{i+1}.png')
    bg=Image.new('RGBA',(26,28),(56,98,160,255)); bd=ImageDraw.Draw(bg); bd.rectangle([0,24,26,28],fill=(240,202,184))
    bg.alpha_composite(t,(1,27-t.height+1) if t.height<=27 else (1,0))
    sheet.alpha_composite(bg.resize((26*Z,28*Z),Image.NEAREST),(10+i*tw,10))
    d.text((14+i*tw,28*Z+16),name,fill=(230,230,230))
sheet.save('eye_variants.png')
# close-up of heads only
crop=Image.new('RGBA',(len(V)*(16*14+10)+10,12*14+20),(30,30,34,255))
for i in range(len(V)):
    t=Image.open(f'eyes_{i+1}.png'); bg=Image.new('RGBA',t.size,(56,98,160,255)); bg.alpha_composite(t)
    h=bg.crop((5,1,21,13)).resize((16*14,12*14),Image.NEAREST); crop.alpha_composite(h,(10+i*(16*14+10),10))
crop.save('eye_closeups.png')
