import sys, os
from PIL import Image, ImageDraw, ImageFont
from palette import to_frame
SKY=(66,104,160); SAND=(240,202,184); SHAD=(212,166,154)
def lineup(frames, labels, cols, Z=6, title=None, bg=True):
    FW=32; gap=6; lab=12
    rows=(len(frames)+cols-1)//cols
    W=(cols*(FW+gap)+gap); H=rows*(FW+gap+lab)+gap
    im=Image.new('RGBA',(W,H),SAND if bg else (30,30,34))
    d=ImageDraw.Draw(im)
    for i,(f,l) in enumerate(zip(frames,labels)):
        x=gap+(i%cols)*(FW+gap); y=gap+(i//cols)*(FW+gap+lab)
        if bg and l:
            d.rectangle([x,y,x+FW-1,y+FW-1],fill=(232,190,170))
            d.ellipse([x+16-7,y+29,x+16+7,y+33],fill=SHAD)
        im.alpha_composite(f,(x,y))
    big=im.resize((W*Z,H*Z),Image.NEAREST)
    d=ImageDraw.Draw(big)
    try: font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',22)
    except: font=ImageFont.load_default()
    for i,l in enumerate(labels):
        x=gap+(i%cols)*(FW+gap); y=gap+(i//cols)*(FW+gap+lab)+FW+1
        tw=d.textlength(l,font=font)
        d.text(((x+FW/2)*Z-tw/2,y*Z+4),l,fill=(70,44,34),font=font)
    return big
