from PIL import Image, ImageDraw
import numpy as np
P=dict(
 hat=(140,90,58),hatd=(104,64,42),hatl=(168,114,74),
 cream=(244,234,212),creamd=(214,198,168),
 skin=(242,170,122),skind=(214,132,92),
 shirt=(140,128,70),shirtd=(108,98,52),
 vest=(78,50,38),red=(204,62,40),redd=(158,40,28),
 chap=(110,72,50),chapd=(84,52,36),boot=(44,30,30),
 grey=(160,160,150),greyd=(110,110,104),belt=(124,82,52),
 harm=(176,180,184),out=(36,24,22))
def poly(d,c,pts): d.polygon(pts,fill=P[c])
def make(pose, S=64):
    im=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(im)
    # legs / chaps (bowlegged)
    poly(d,'chap',[(24,44),(40,44),(44,50),(44,57),(39,58),(38,52),(34,49),(30,49),(26,52),(25,58),(20,57),(20,50)])
    poly(d,'chapd',[(30,49),(34,49),(33,46),(31,46)])
    d.line([(21,51),(21,56)],fill=P['chapd']); d.line([(43,51),(43,56)],fill=P['chapd'])
    # boots
    poly(d,'boot',[(19,57),(26,57),(26,60),(17,60),(17,59)])
    poly(d,'boot',[(38,57),(45,57),(47,59),(47,60),(38,60)])
    d.point([(16,58),(15,58),(48,58),(49,58)],fill=P['grey'])
    # torso
    poly(d,'shirt',[(23,32),(41,32),(42,44),(22,44)])
    poly(d,'vest',[(26,33),(38,33),(39,44),(25,44)])
    poly(d,'red',[(27,31),(37,31),(33,38)]); d.point([(33,38),(32,37)],fill=P['redd'])
    # belt + buckle
    d.rectangle([22,43,42,45],fill=P['belt'])
    d.rectangle([29,42,35,46],fill=P['grey']); d.rectangle([30,43,34,45],fill=P['greyd'])
    # arms
    if pose=='A':   # arms straight out, slight droop; harmonica in right hand
        poly(d,'shirt',[(23,32),(23,37),(13,38),(11,37),(11,34),(14,33)])
        poly(d,'shirt',[(41,32),(41,37),(51,38),(53,37),(53,34),(50,33)])
        d.line([(12,37),(22,37)],fill=P['shirtd']); d.line([(42,37),(52,37)],fill=P['shirtd'])
        d.ellipse([6,33,11,38],fill=P['skin'])
        d.ellipse([53,33,58,38],fill=P['skin'])
        d.rectangle([52,31,60,34],fill=P['harm']); d.point([(54,32),(56,32),(58,32)],fill=P['greyd']); d.ellipse([53,33,58,38],fill=P['skin']); d.line([(54,36),(57,36)],fill=P['skind'])
    elif pose=='B': # gunslinger: arms out and down, hands loose by hips
        poly(d,'shirt',[(23,32),(24,36),(17,42),(15,44),(13,42),(15,38),(19,33)])
        poly(d,'shirt',[(41,32),(40,36),(47,42),(49,44),(51,42),(49,38),(45,33)])
        d.ellipse([11,43,16,48],fill=P['skin']); d.ellipse([48,43,53,48],fill=P['skin'])
        d.point([(11,47),(52,47)],fill=P['skind'])
    elif False: # arms raised up and out, celebratory "ta-da"
        poly(d,'shirt',[(23,32),(23,36),(16,33),(11,28),(13,26),(18,30)])
        poly(d,'shirt',[(41,32),(41,36),(48,33),(53,28),(51,26),(46,30)])
        d.ellipse([9,22,14,27],fill=P['skin']); d.ellipse([50,22,55,27],fill=P['skin'])
        d.rectangle([2,20,10,23],fill=P['harm']); d.point([(4,21),(6,21),(8,21)],fill=P['greyd'])
    # head / nose
    d.ellipse([28,21,36,29],fill=P['skin']); d.point([(34,23),(33,22)],fill=(252,200,160))
    # hat
    poly(d,'hatd',[(10,19),(54,19),(56,22),(48,25),(16,25),(8,22)])
    poly(d,'hat',[(10,18),(54,18),(55,20),(47,23),(17,23),(9,20)])
    poly(d,'hat',[(23,19),(24,8),(28,4),(32,7),(37,4),(41,8),(41,19)])
    d.line([(29,6),(32,9),(35,6)],fill=P['hatd'])
    d.rectangle([24,16,40,18],fill=P['hatd'])
    d.line([(25,9),(25,15)],fill=P['hatl'])
    # mustache: big sweeping, tips curling up
    poly(d,'cream',[(32,27),(27,25),(20,25),(13,24),(6,21),(3,17),(2,20),(4,25),(9,29),(16,31),(24,31),(30,30)])
    poly(d,'cream',[(32,27),(37,25),(44,25),(51,24),(58,21),(61,17),(62,20),(60,25),(55,29),(48,31),(40,31),(34,30)])
    d.line([(8,28),(16,30),(24,30)],fill=P['creamd']); d.line([(40,30),(48,30),(56,28)],fill=P['creamd'])
    # nose on top of mustache
    d.ellipse([29,23,35,28],fill=P['skin']); d.point([(33,24)],fill=(252,200,160)); d.line([(30,27),(34,27)],fill=P['skind'])
    if pose=='C':
        poly(d,'shirt',[(24,32),(24,36),(17,33),(12,27),(10,22),(13,21),(15,26),(20,31)])
        poly(d,'shirt',[(40,32),(40,36),(47,33),(52,27),(54,22),(51,21),(49,26),(44,31)])
        d.line([(23,35),(17,32),(12,26)],fill=P['shirtd']); d.line([(41,35),(47,32),(52,26)],fill=P['shirtd'])
        d.ellipse([8,16,14,22],fill=P['skin']); d.ellipse([50,16,56,22],fill=P['skin'])
        d.rectangle([4,15,11,18],fill=P['harm']); d.point([(5,16),(7,16),(9,16)],fill=P['greyd'])
        d.line([(8,20),(12,20)],fill=P['skind']); d.line([(52,20),(55,20)],fill=P['skind'])
    return outline(im)
def outline(im):
    a=np.array(im); al=a[:,:,3]>0
    o=np.zeros_like(al)
    for dy,dx in [(1,0),(-1,0),(0,1),(0,-1)]:
        o|=np.roll(np.roll(al,dy,0),dx,1)
    o&=~al
    a[o]=list(P['out'])+[255]
    return Image.fromarray(a)
def bg(S=64):
    im=Image.new('RGBA',(S,S),(76,112,160,255)); d=ImageDraw.Draw(im)
    d.rectangle([0,50,S,S],fill=(240,202,184)); d.polygon([(48,50),(52,30),(64,30),(64,50)],fill=(188,86,66))
    d.polygon([(0,50),(0,46),(8,45),(14,47),(20,50)],fill=(92,76,122))
    d.ellipse([12,58,52,62],fill=(200,156,146))
    return im
names={'A':'Arms out, harmonica in hand','B':'Gunslinger stance','C':'Arms up, ta-da'}
tiles=[]
for k in 'ABC':
    s=make(k); s.resize((512,512),Image.NEAREST).save(f'mock_{k}.png')
    b=bg(); b.alpha_composite(s); tiles.append(b.resize((384,384),Image.NEAREST))
sheet=Image.new('RGB',(384*3+40,384+20),(30,30,34))
for i,t in enumerate(tiles): sheet.paste(t,(10+i*(384+10),10))
sheet.save('mockups.png')
