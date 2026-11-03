from PIL import Image, ImageDraw
import numpy as np
P=dict(hat=(44,38,42),hatl=(70,62,66),hatd=(28,24,28),
 skin=(232,152,106),skind=(190,112,78),hair=(96,58,38),must=(112,68,44),
 shirt=(240,234,222),shirtd=(200,194,182),tie=(24,20,22),
 coat=(52,44,48),coatd=(34,28,32),coatl=(76,66,70),vest=(40,34,38),btn=(130,126,122),
 pants=(112,92,80),pantsd=(86,70,62),boot=(26,22,24),
 belt=(118,72,46),holster=(150,92,58),grey=(172,170,164),greyd=(124,122,118),out=(14,10,12))
CANVAS=(64,64)
TF=lambda x,y:(x,y)
class XD:
    def __init__(s,d): s.d=d
    def _p(s,p): return [TF(*q) for q in p]
    def _b(s,b):
        a=TF(b[0],b[1]); z=TF(b[2],b[3]); return [a[0],a[1],max(a[0],z[0]),max(a[1],z[1])]
    def polygon(s,p,fill): s.d.polygon(s._p(p),fill=fill)
    def line(s,p,fill): s.d.line(s._p(p),fill=fill)
    def point(s,p,fill): s.d.point(s._p(p),fill=fill)
    def rectangle(s,b,fill): s.d.rectangle(s._b(b),fill=fill)
    def ellipse(s,b,fill): s.d.ellipse(s._b(b),fill=fill)
def make(pose):
    im=Image.new('RGBA',CANVAS,(0,0,0,0)); d=XD(ImageDraw.Draw(im))
    poly=lambda c,p: d.polygon(p,fill=P[c]); rect=lambda c,b: d.rectangle(b,fill=P[c])
    line=lambda c,p: d.line(p,fill=P[c]); pt=lambda c,p: d.point(p,fill=P[c])
    # frock coat back/tails
    poly('coatd',[(24,30),(40,30),(42,46),(45,55),(38,54),(26,54),(19,55),(22,46)])
    # legs
    poly('pants',[(27,38),(37,38),(39,58),(34,58),(32,44),(30,58),(25,58)])
    line('pantsd',[(32,41),(32,45)])
    # boots + spurs
    poly('boot',[(25,57),(30,57),(30,60),(22,60),(22,59)]); poly('boot',[(34,57),(39,57),(42,59),(42,60),(34,60)])
    pt('grey',[(23,57),(41,57)])
    # vest & shirt
    poly('vest',[(28,25),(36,25),(37,38),(27,38)])
    poly('shirt',[(29,24),(35,24),(33,29),(31,29)])
    line('tie',[(31,24),(33,24)]); pt('tie',[(32,25),(31,26),(33,26),(31,27),(33,28)])
    pt('btn',[(32,30),(32,32),(32,34)])
    # coat front panels + lapels
    poly('coat',[(23,25),(29,24),(30,38),(28,50),(25,54),(20,54),(22,40)])
    poly('coat',[(41,25),(35,24),(34,38),(36,50),(39,54),(44,54),(42,40)])
    poly('coatl',[(27,24),(29,24),(31,30),(29,32),(27,28)]); poly('coatl',[(37,24),(35,24),(33,30),(35,32),(37,28)])
    # gunbelt + buckle, slung toward holster
    rect('belt',(27,36,37,37)); line('belt',[(27,38),(24,39)])
    d.ellipse([30,35,34,38],fill=P['grey']); pt('greyd',[(31,37),(33,37)])
    poly('holster',[(22,39),(26,38),(27,46),(24,48),(22,46)])
    pt('grey',[(24,37),(25,36),(25,37)])  # revolver hammer/grip
    if pose=='A':   # relaxed arms at sides
        poly('coat',[(24,25),(21,27),(20,38),(23,39),(24,30)]); poly('coat',[(40,25),(43,27),(44,38),(41,39),(40,30)])
        line('coatl',[(21,28),(20,37)]); line('coatl',[(43,28),(44,37)])
        line('coatd',[(24,30),(23,38)]); line('coatd',[(40,30),(41,38)])
        rect('shirt',(20,38,23,38)); rect('shirt',(41,38,44,38))
        d.ellipse([19,39,23,43],fill=P['skin']); d.ellipse([41,39,45,43],fill=P['skin'])
    elif pose=='B': # hand on gun grip, other hand in pocket, elbow out
        poly('coat',[(24,25),(20,28),(19,34),(22,36),(25,37),(26,35),(23,32),(24,29)])
        line('coatl',[(20,29),(19,34)]); line('coatd',[(23,32),(25,35)]); line('coatd',[(24,29),(23,31)])
        rect('shirt',(25,35,26,36))
        d.ellipse([24,34,28,38],fill=P['skin']); pt('skind',[(25,37)])
        poly('coat',[(40,25),(44,28),(45,34),(41,38),(38,39),(37,37),(41,33),(40,30)])
        line('coatl',[(44,29),(45,33)]); line('coatd',[(40,30),(41,33)]); line('coatd',[(41,33),(38,37)])
    elif pose=='C': # gunslinger: arms out & down, ready
        poly('coat',[(24,25),(20,28),(17,35),(19,37),(23,31)]); poly('coat',[(40,25),(44,28),(47,35),(45,37),(41,31)])
        line('coatl',[(20,28),(17,34)]); line('coatl',[(44,28),(47,34)])
        line('coatd',[(23,31),(20,36)]); line('coatd',[(41,31),(44,36)])
        rect('shirt',(16,36,19,37)); rect('shirt',(45,36,48,37))
        d.ellipse([14,37,18,41],fill=P['skin']); d.ellipse([46,37,50,41],fill=P['skin'])
        pt('skind',[(15,41),(49,41)])
    # head
    poly('skin',[(28,12),(36,12),(36,20),(34,23),(30,23),(28,20)])
    rect('skind',(28,13,36,14))           # brim shadow
    pt('out',[(29,15),(30,15),(33,15),(34,15)])   # heavy-lidded eyes
    pt('skind',[(31,16),(31,17),(32,18)])  # nose
    poly('hair',[(27,11),(28,11),(28,18),(27,17)]); poly('hair',[(36,11),(37,11),(37,17),(36,18)])
    # horseshoe mustache drooping past chin
    line('must',[(29,19),(35,19)]); line('must',[(29,19),(29,24)]); line('must',[(35,19),(35,24)])
    pt('must',[(30,20),(34,20)]); pt('skind',[(31,21),(32,21),(33,21)])
    # hat: black, flat-ish brim, tall crown with pinch
    poly('hat',[(27,11),(27,5),(29,3),(32,4),(35,3),(37,5),(37,11)])
    rect('hatd',(27,9,37,10)); line('hatl',[(28,5),(28,8)])
    poly('hat',[(18,11),(46,11),(47,9),(47,12),(40,13),(24,13),(17,12),(17,9)])
    line('hatl',[(20,11),(26,11)])
    return outline(im)
def outline(im):
    a=np.pad(np.array(im),((1,1),(1,1),(0,0))); al=a[:,:,3]>0; o=np.zeros_like(al)
    for dy,dx in [(1,0),(-1,0),(0,1),(0,-1)]: o|=np.roll(np.roll(al,dy,0),dx,1)
    o&=~al; a[o]=list(P['out'])+[255]; return Image.fromarray(a)
def bg(S=64):
    im=Image.new('RGBA',(S,S),(66,104,160,255)); d=ImageDraw.Draw(im)
    d.rectangle([0,56,S,S],fill=(240,202,184)); d.polygon([(48,56),(52,30),(64,28),(64,56)],fill=(196,80,58))
    d.polygon([(0,56),(0,52),(8,51),(14,53),(20,56)],fill=(92,76,122)); d.ellipse([16,59,50,63],fill=(200,156,146))
    return im
if __name__=='__main__':
    tiles=[]
    for k in 'ABC':
        s=make(k); s.resize((512,512),Image.NEAREST).save(f'pose_{k}.png')
        b=bg(); b.alpha_composite(s); tiles.append(b.resize((384,384),Image.NEAREST))
    sheet=Image.new('RGB',(384*3+40,404),(30,30,34))
    for i,t in enumerate(tiles): sheet.paste(t,(10+i*394,10))
    sheet.save('mockups.png')
