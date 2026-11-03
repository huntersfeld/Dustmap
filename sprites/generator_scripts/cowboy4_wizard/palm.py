import wiz, numpy as np
from PIL import Image, ImageDraw
put=wiz.put; BASE=wiz.BASE; AD=wiz.ARM_DOWN
WHITE=[(250,246,232,255),(214,226,244,240),(190,206,236,200)]
BLUE =[(220,244,255,255),(120,190,255,240),(70,130,230,210)]
GREEN=[(230,255,220,255),(140,230,150,240),(80,180,110,210)]
def flame(x,y,f=1): return [(x,y,0),(x+f,y,1),(x,y-1,0),(x+f,y-2,0),(x+f,y-3,1),(x,y-4,1),(x,y-5,2)]
def orb(x,y): return [(x,y-2,0),(x-1,y-2,1),(x+1,y-2,1),(x,y-1,1),(x,y-3,1),(x-1,y-1,2),(x+1,y-3,2),(x+1,y-1,2),(x-1,y-3,2)]
HIGH=wiz.ARM_UP_R
SHOULDER=[(17,13,'C'),(18,13,'C'),(19,13,'C'),(20,13,'C'),(17,14,'C'),(18,14,'C'),(19,14,'l'),(20,14,'C'),(18,15,'C'),(19,15,'C'),(17,15,'c'),
          (21,13,'S'),(22,13,'S'),(22,12,'S'),(23,12,'S'),(21,14,'S')]
CHEST=[(17,13,'C'),(17,14,'C'),(18,14,'C'),(18,15,'C'),(17,15,'C'),(16,15,'c'),(15,14,'C'),(16,14,'l'),(18,16,'C'),
       (14,13,'S'),(15,13,'S'),(13,13,'S'),(15,12,'S')]
V=[
 ("1 High palm",        AD+HIGH,     flame(21,9),  WHITE, False),
 ("2 Shoulder height",  AD+SHOULDER, flame(22,11), WHITE, False),
 ("3 Close to chest",   AD+CHEST,    flame(14,12), WHITE, True),
 ("4 Blue flame",       AD+SHOULDER, flame(22,11), BLUE,  False),
 ("5 Floating orb",     AD+SHOULDER, orb(22,12),   BLUE,  False),
 ("6 Green flame",      AD+HIGH,     flame(21,9),  GREEN, False),
]
def render(g,w,col,over):
    wiz.WISP=col
    if not over: return wiz.render(g,w)
    im=np.array(wiz.render(g,[]))
    for x,y,k in w: im[y+1,x+wiz.MARGIN]=col[k]
    return Image.fromarray(im)
Z=10; tw=30*Z+20
sheet=Image.new('RGBA',(tw*3+10,(27*Z+50)*2),(30,30,34,255)); d=ImageDraw.Draw(sheet)
for i,(name,arms,w,col,over) in enumerate(V):
    t=render(put(BASE,arms),w,col,over); t.save(f'palm_{i+1}.png')
    bg=Image.new('RGBA',(30,27),(66,104,160,255)); bd=ImageDraw.Draw(bg); bd.rectangle([0,23,30,27],fill=(240,202,184))
    bg.alpha_composite(t,(0,0))
    X=10+(i%3)*tw; Y=10+(i//3)*(27*Z+50)
    sheet.alpha_composite(bg.resize((30*Z,27*Z),Image.NEAREST),(X,Y)); d.text((X+4,Y+27*Z+10),name,fill=(230,230,230))
sheet.save('palm_variants.png')
