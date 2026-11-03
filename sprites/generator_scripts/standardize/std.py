import numpy as np, json
from PIL import Image, ImageDraw
import os
# Paths are relative to the repo: inputs are the per-character idle sheets (the anim*.py outputs, renamed),
# outputs go to sprites/game_ready. Debug previews (lineup_f0.png, pivot_check.png) are written to the current directory.
SPRITES=os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..'))
PC=os.path.join(SPRITES,'per_character')
SRC=[("cowboy1_harmonica",os.path.join(PC,"cowboy_sprites","cowboy_idle_24px_sheet.png")),
     ("cowboy2_wheat",os.path.join(PC,"cowboy2_sprites","cowboy2_idle_tiny_sheet.png")),
     ("cowboy3_cigarillo",os.path.join(PC,"cowboy3_sprites","cowboy3_idle_tiny_sheet.png")),
     ("cowboy4_wizard",os.path.join(PC,"cowboy4_sprites","cowboy4_idle_tiny_sheet.png"))]
N=8
chars=[]
for name,p in SRC:
    sh=Image.open(p).convert('RGBA'); fw=sh.width//N; fh=sh.height
    fr=[sh.crop((i*fw,0,(i+1)*fw,fh)) for i in range(N)]
    A=np.stack([np.array(f)[:,:,3]>0 for f in fr]).any(0)
    ys,xs=np.nonzero(A); bottom=ys.max()
    # pivot x = centre of the feet: opaque pixels in the bottom 2 rows (union of frames)
    fx=np.nonzero(A[bottom-1:bottom+1].any(0))[0]; cx=(fx.min()+fx.max())/2
    chars.append(dict(name=name,frames=fr,fw=fw,fh=fh,bottom=bottom,cx=cx,top=ys.min(),left=xs.min(),right=xs.max()))
    print(name,fw,fh,'bottom',bottom,'cx',cx,'extent x',xs.min(),xs.max(),'top',ys.min())
FW=FH=32; PX=16; BASE=31
OUT=os.environ.get('DUSTMAP_SPRITE_OUT',os.path.join(SPRITES,'game_ready')); os.makedirs(OUT,exist_ok=True)
atlas=Image.new('RGBA',(FW*N,FH*len(chars)),(0,0,0,0)); meta={"frame_width":FW,"frame_height":FH,"frames_per_animation":N,
  "frame_duration_ms":150,"fps":round(1000/150,2),"pivot":{"x":PX,"y":BASE,"note":"bottom-center, between the feet"},"animations":{}}
std={}
for r,c in enumerate(chars):
    dx=PX-int(np.floor(c['cx'])); dy=BASE-c['bottom']
    assert c['left']+dx>=0 and c['right']+dx<FW and c['top']+dy>=0, c['name']
    fr=[]
    for f in c['frames']:
        g=Image.new('RGBA',(FW,FH),(0,0,0,0)); g.alpha_composite(f,(dx,dy)); fr.append(g)
    std[c['name']]=fr
    sheet=Image.new('RGBA',(FW*N,FH),(0,0,0,0))
    for i,g in enumerate(fr): sheet.alpha_composite(g,(i*FW,0)); atlas.alpha_composite(g,(i*FW,r*FH))
    sheet.save(f"{OUT}/{c['name']}_idle_32x32_sheet.png")
    meta["animations"][c['name']+"_idle"]={"atlas_row":r,"x":0,"y":r*FH,"frames":N,"loop":True}
atlas.save(f"{OUT}/all_cowboys_idle_atlas_32x32.png")
atlas.resize((atlas.width*8,atlas.height*8),Image.NEAREST).save(f"{OUT}/all_cowboys_idle_atlas_8x_preview.png")
json.dump(meta,open(f"{OUT}/all_cowboys_idle_atlas.json","w"),indent=2)
# ---- lineup: staggered phases so they don't breathe in unison ----
Z=8; gap=4; names=list(std)
LW=FW*4+gap*5+18; LH=FH+10
OFF=[0,3,5,2]
def lineup(f,bg=True):
    im=Image.new('RGBA',(LW,LH),(0,0,0,0))
    if bg:
        im=Image.new('RGBA',(LW,LH),(66,104,160,255)); d=ImageDraw.Draw(im)
        d.ellipse([10,4,46,7],fill=(240,214,186)); d.polygon([(LW-18,BASE+4),(LW-14,14),(LW-4,12),(LW,12),(LW,BASE+4)],fill=(194,82,60))
        d.polygon([(0,BASE+4),(0,BASE-2),(14,BASE-4),(24,BASE-1),(40,BASE+4)],fill=(92,76,122))
        d.rectangle([0,BASE+4,LW,LH],fill=(240,202,184))
        for i in range(4):
            x=gap+i*(FW+gap)+PX; d.ellipse([x-8,BASE+3,x+8,BASE+6],fill=(212,166,154))
    for i,n in enumerate(names):
        im.alpha_composite(std[n][(f+OFF[i])%N],(gap+i*(FW+gap),4))
    return im
fr=[lineup(f).resize((LW*Z,LH*Z),Image.NEAREST).convert('RGB') for f in range(N)]
fr[0].save(f"{OUT}/cowboy_lineup.gif",save_all=True,append_images=fr[1:],duration=150,loop=0)
fr[0].save('lineup_f0.png')
# pivot check: overlay pivot markers on frame 0
chk=lineup(0); a=np.array(chk)
for i in range(4): a[4+BASE, gap+i*(FW+gap)+PX]=(255,0,255,255)
Image.fromarray(a).resize((LW*Z,LH*Z),Image.NEAREST).save('pivot_check.png')
print('ok', LW, LH)
