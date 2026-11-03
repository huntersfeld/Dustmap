from PIL import Image, ImageDraw
import numpy as np
P=dict(hat=(104,66,48),hatd=(72,44,34),hatl=(132,88,62),
 skin=(236,160,112),skind=(196,120,84),hair=(92,58,40),beard=(120,84,60),beardd=(92,62,44),
 shirt=(240,232,216),shirtd=(204,194,176),coat=(84,52,40),coatd=(60,36,28),coatl=(110,72,54),
 red=(196,62,42),redd=(150,42,30),pants=(110,70,50),pantsd=(86,52,38),boot=(70,42,32),
 grey=(170,170,162),greyd=(120,120,112),belt=(100,62,44),holster=(140,82,52),
 wheat=(236,196,120),wheatd=(200,160,90),out=(36,24,22))
def make(pose):
    im=Image.new('RGBA',(64,64),(0,0,0,0)); d=ImageDraw.Draw(im)
    poly=lambda c,p: d.polygon(p,fill=P[c]); rect=lambda c,b: d.rectangle(b,fill=P[c])
    line=lambda c,p: d.line(p,fill=P[c]); pt=lambda c,p: d.point(p,fill=P[c])
    # duster back flaps (long coat behind legs)
    poly('coatd',[(22,30),(42,30),(45,50),(43,53),(38,51),(26,51),(21,53),(19,50)])
    # legs
    poly('pants',[(26,38),(38,38),(39,56),(34,56),(32,44),(30,56),(25,56)])
    line('pantsd',[(32,40),(32,44)])
    # boots + spurs
    poly('boot',[(24,55),(30,55),(31,59),(22,59),(22,58)])
    poly('boot',[(34,55),(40,55),(42,58),(42,59),(33,59)])
    pt('grey',[(20,57),(44,57)])
    # shirt torso
    poly('shirt',[(26,25),(38,25),(39,38),(25,38)])
    # coat front panels (open vest/duster) + collar
    poly('coat',[(23,25),(28,24),(29,38),(28,50),(22,50),(21,36)])
    poly('coat',[(41,25),(36,24),(35,38),(36,50),(42,50),(43,36)])
    poly('coatl',[(24,24),(28,23),(29,28),(26,30)]); poly('coatl',[(40,24),(36,23),(35,28),(38,30)])
    line('coatd',[(23,49),(28,49)]); line('coatd',[(36,49),(41,49)])
    # bandana
    poly('red',[(28,24),(36,24),(33,32),(31,32)]); pt('redd',[(32,31),(31,30)])
    # belt + buckle
    rect('belt',(25,37,39,38))
    d.ellipse([29,36,34,39],fill=P['grey']); pt('greyd',[(30,38),(33,38)])
    # holster on his right hip (viewer left) with revolver grip
    poly('holster',[(24,38),(28,38),(28,46),(25,47),(24,45)])
    poly('shirtd',[(24,35),(26,34),(27,35),(26,37),(25,37)]); pt('grey',[(27,37),(28,36)])
    if pose=='A':   # arms relaxed at sides, slightly out
        poly('shirt',[(26,25),(22,27),(20,33),(22,34),(24,30)]); poly('shirt',[(38,25),(42,27),(44,33),(42,34),(40,30)])
        rect('shirtd',(20,32,22,33)); rect('shirtd',(42,32,44,33))
        poly('skin',[(20,34),(23,34),(23,40),(20,41)]); poly('skin',[(41,34),(44,34),(44,41),(41,40)])
        d.ellipse([19,40,23,44],fill=P['skin']); d.ellipse([41,40,45,44],fill=P['skin'])
    elif pose=='B': # gunslinger: arms out & down, right hand hovering over gun
        poly('shirt',[(26,25),(21,27),(17,32),(19,34),(23,30)]); poly('shirt',[(38,25),(43,27),(47,32),(45,34),(41,30)])
        rect('shirtd',(17,32,19,33)); rect('shirtd',(45,32,47,33))
        poly('skin',[(17,34),(20,34),(18,40),(15,39)]); poly('skin',[(44,34),(47,34),(49,39),(46,40)])
        d.ellipse([13,38,18,43],fill=P['skin']); d.ellipse([46,38,51,43],fill=P['skin'])
        pt('skind',[(14,42),(16,43),(48,43),(50,42)])
    elif pose=='C': # hand resting on gun grip, other thumb hooked in belt
        poly('shirt',[(26,25),(22,27),(20,32),(22,34),(24,30)]); poly('shirt',[(38,25),(43,27),(45,32),(43,34),(41,30)])
        rect('shirtd',(20,32,22,33)); rect('shirtd',(43,32,45,33))
        poly('skin',[(20,34),(23,34),(26,35),(24,37),(21,37)]); d.ellipse([23,33,28,37],fill=P['skin'])
        poly('skin',[(42,34),(45,34),(41,37),(38,37)]); d.ellipse([36,34,40,38],fill=P['skin'])
    # head
    poly('skin',[(27,14),(37,14),(37,22),(35,25),(29,25),(27,22)])
    rect('skind',(28,16,36,16))      # hat shadow over eyes
    pt('out',[(29,17),(30,17),(33,17),(34,17)])       # squinting eyes
    pt('skind',[(32,18),(32,19),(31,19)])   # nose
    poly('hair',[(26,13),(28,13),(28,21),(26,20)]); poly('hair',[(36,13),(38,13),(38,20),(36,21)])
    poly('beard',[(27,18),(28,20),(30,21),(34,21),(36,20),(37,18),(37,22),(35,25),(29,25),(27,22)])
    line('beardd',[(30,24),(34,24)])
    pt('out',[(32,22),(33,22),(34,22)])  # mouth
    d.point([(26,16),(26,17)],fill=P['skin']); # ear
    # hat
    poly('hat',[(26,13),(27,6),(30,3),(32,5),(35,3),(38,6),(38,13)])
    rect('hatd',(26,10,38,12))
    poly('hat',[(17,13),(47,13),(49,11),(48,14),(40,16),(24,16),(16,14),(15,11)])
    line('hatd',[(20,15),(44,15)]); line('hatl',[(28,6),(28,9)])
    # wheat stalk from mouth, drooping out to the right
    line('wheat',[(35,22),(40,22),(45,23),(49,25)])
    pt('wheatd',[(50,25),(51,26),(50,27),(52,26),(51,27),(52,28)]); pt('wheat',[(51,25),(52,27),(53,28)])
    return outline(im)
def outline(im):
    a=np.array(im); al=a[:,:,3]>0; o=np.zeros_like(al)
    for dy,dx in [(1,0),(-1,0),(0,1),(0,-1)]: o|=np.roll(np.roll(al,dy,0),dx,1)
    o&=~al; a[o]=list(P['out'])+[255]; return Image.fromarray(a)
def bg(S=64):
    im=Image.new('RGBA',(S,S),(56,98,160,255)); d=ImageDraw.Draw(im)
    d.rectangle([0,54,S,S],fill=(240,202,184)); d.polygon([(48,54),(52,30),(64,28),(64,54)],fill=(196,72,56))
    d.polygon([(0,54),(0,50),(8,49),(14,51),(20,54)],fill=(92,76,122)); d.ellipse([16,58,50,62],fill=(200,156,146))
    return im
tiles=[]
for k in 'ABC':
    s=make(k); s.resize((512,512),Image.NEAREST).save(f'pose_{k}.png')
    b=bg(); b.alpha_composite(s); tiles.append(b.resize((384,384),Image.NEAREST))
sheet=Image.new('RGB',(384*3+40,404),(30,30,34))
for i,t in enumerate(tiles): sheet.paste(t,(10+i*394,10))
sheet.save('mockups.png')
