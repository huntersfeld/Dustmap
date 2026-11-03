import tiny3, c3, numpy as np
from PIL import Image, ImageDraw
P=c3.P; P.update(cig=(238,234,224),ember=(255,112,40),cigar=(132,86,52),ash=(150,146,140))
tiny3.M.update({'w':'cig','e':'ember','k':'cigar','a':'ash'})
SMOKE=(206,210,222,255); SMOKE2=(176,182,198,255)
base=list(tiny3.GRID)
def put(g,pts):
    g=[list(r) for r in g]
    for x,y,ch in pts:
        while len(g[y])<=x: g[y].append('.')
        g[y][x]=ch
    return [''.join(r) for r in g]
V=[
 ("1 Mouth corner", put(base,[(12,10,'w'),(13,10,'w'),(14,10,'w'),(15,10,'e')]), [(16,9,1),(16,8,0),(17,7,0),(17,6,1)]),
 ("2 Drooping", put(base,[(12,10,'w'),(13,10,'w'),(14,11,'w'),(15,11,'w'),(16,12,'e')]), [(17,11,1),(17,10,0),(16,9,0),(17,8,1)]),
 ("3 Other side", put(base,[(9,10,'w'),(8,10,'w'),(7,10,'w'),(6,10,'e')]), [(5,9,1),(5,8,0),(4,7,0),(4,6,1)]),
 ("4 In his hand", put(base,[(20,16,'w'),(21,16,'e')]), [(21,15,1),(22,14,0),(21,13,0),(22,12,1)]),
 ("5 Cigarillo", put(base,[(12,10,'k'),(13,10,'k'),(14,11,'k'),(15,11,'k'),(16,11,'a'),(17,11,'e')]), [(18,10,1),(18,9,0),(17,8,0),(18,7,0),(19,6,1)]),
]
def render(grid,smoke):
    t=tiny3.tiny(grid)
    big=Image.new('RGBA',(t.width+3,t.height),(0,0,0,0)); big.alpha_composite(t,(0,0))
    a=np.array(big)
    for x,y,s in smoke: a[y+1,x+1]=SMOKE2 if s else SMOKE
    return Image.fromarray(a)
if __name__=='__main__':
    Z=10; tw=27*Z+20
    sheet=Image.new('RGBA',(tw*len(V)+10,26*Z+50),(30,30,34,255)); d=ImageDraw.Draw(sheet)
    crops=Image.new('RGBA',(len(V)*(14*16+10)+10,14*16+20),(30,30,34,255))
    for i,(name,g,sm) in enumerate(V):
        t=render(g,sm); t.save(f'cig_{i+1}.png')
        bg=Image.new('RGBA',(27,26),(66,104,160,255)); bd=ImageDraw.Draw(bg); bd.rectangle([0,22,27,26],fill=(240,202,184))
        bg.alpha_composite(t,(0,26-t.height))
        sheet.alpha_composite(bg.resize((27*Z,26*Z),Image.NEAREST),(10+i*tw,10)); d.text((14+i*tw,26*Z+20),name,fill=(230,230,230))
        cx=6 if i!=3 else 11; cy=6 if i!=3 else 10
        crops.alpha_composite(bg.crop((cx,cy-2,cx+14,cy+12)).resize((14*16,14*16),Image.NEAREST),(10+i*(14*16+10),10))
    sheet.save('cig_variants.png'); crops.save('cig_closeups.png')
