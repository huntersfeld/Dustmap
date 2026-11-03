import os; HERE=os.path.dirname(os.path.abspath(__file__))  # sibling scripts load from here
from PIL import Image
import numpy as np
exec(open(os.path.join(HERE,'c2v.py')).read().split("if __name__")[0])
M={'H':'hat','h':'hatd','L':'hatl','R':'hair','S':'skin','s':'skind','E':'out','B':'beard','b':'beardd',
   'W':'shirt','w':'shirtd','C':'coat','c':'coatd','D':'red','T':'belt','G':'grey','O':'holster','I':'shirtd',
   'P':'pants','p':'pantsd','K':'boot','Y':'wheat','y':'wheatd','Z':'grey'}
GRID=[
"........H..H..........",
".......HHHHHH.........",
".......HLHHHH.........",
".H.....hhhhhh.....H...",
".HHHHHHHHHHHHHHHHHH...",
"...HHHHHHHHHHHHHH.....",
"......RssssssR........",
"......RSESSESR........",
"......RBSSsSBR........",
".......BBBEBYYY.......",
"......CBbbbBC.YY......",
".....WCDDDDDCW..Yy....",
"....WWCWDDDWCWW..yy...",
"....WwCWWDWWCwW...y...",
"....SSCWWWWWCSS.......",
"....SSCTTGGTCSS.......",
"....SSIOPPPPCSS.......",
"....SSOOPPPPCSS.......",
"....cCOOPPpPPCc.......",
"...ccCCPP.PPCCcc......",
"....c..PP.PP..c.......",
"....ZKKKK.KKKKZ.......",
]
def tiny():
    h=len(GRID); w=max(len(r) for r in GRID)
    a=np.zeros((h,w,4),np.uint8)
    for y,r in enumerate(GRID):
        for x,ch in enumerate(r):
            if ch!='.': a[y,x]=list(P[M[ch]])+[255]
    return outline(Image.fromarray(a))
if __name__=='__main__':
    t=tiny(); print(t.size); t.save('v_24px_tiny.png'); t.resize((t.width*16,t.height*16),Image.NEAREST).save('z_tiny.png')
    from PIL import ImageDraw
    variants=[('64px_base',64,1.0,2),('48px_squat',48,0.7,2),('40px_squat',40,0.6,1),('32px_chibi',32,0.55,1)]
    out=[(n,make(H,c,d)) for n,H,c,d in variants]+[('24px_tiny',t)]
    Z=6; pad=24; Ht=max(s.height for _,s in out)*Z+pad*2
    Wt=sum(s.width*Z for _,s in out)+pad*(len(out)+1)
    sheet=Image.new('RGBA',(Wt,Ht+30),(56,98,160,255)); d=ImageDraw.Draw(sheet)
    d.rectangle([0,Ht-pad-10,Wt,Ht+30],fill=(240,202,184))
    x=pad
    for name,s in out:
        b=s.resize((s.width*Z,s.height*Z),Image.NEAREST)
        sheet.alpha_composite(b,(x,Ht-pad-b.height)); d.text((x,Ht+4),name,fill=(60,40,30)); x+=b.width+pad
    sheet.convert('RGB').save('variants.png')
