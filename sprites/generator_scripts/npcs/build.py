"""Build the NPC / enemy mockup sheets into sprites/mockups/npcs_enemies/.
Run from anywhere: python3 sprites/generator_scripts/npcs/build.py"""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from PIL import Image, ImageDraw, ImageFont
import townsfolk as TF, enemies as EN
from palette import to_frame
from sheet import lineup

ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.environ.get('NPC_MOCKUP_OUT', os.path.join(ROOT, 'mockups', 'npcs_enemies'))
os.makedirs(OUT, exist_ok=True)
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

def font(n):
    try: return ImageFont.truetype(FONT, n)
    except Exception: return ImageFont.load_default()

def titled(img, title, sub):
    pad = 70
    im = Image.new('RGB', (img.width, img.height + pad), (240, 202, 184))
    d = ImageDraw.Draw(im)
    d.text((36, 14), title, fill=(70, 44, 34), font=font(30))
    d.text((36 + d.textlength(title, font=font(30)) + 16, 24), sub, fill=(130, 90, 70), font=font(18))
    im.paste(img.convert('RGB'), (0, pad))
    return im

groups = [('townsfolk', TF, TF.T), ('enemies', EN, EN.E)]
atlas_rows = []
for gname, mod, table in groups:
    keys = mod.ORDER
    base = [to_frame(mod.sprite(k)) for k in keys]
    for k, f in zip(keys, base): atlas_rows.append((gname, k, f))
    cols = 7 if gname == 'townsfolk' else 6
    sheet = lineup(base, [table[k]['name'] for k in keys], cols)
    titled(sheet, 'Townsfolk & NPCs' if gname == 'townsfolk' else 'Enemies & mobs',
           'static mockups, 32x32 tokens shown at 6x').save(f'{OUT}/{gname}_lineup.png')
    # variants: one row per character, base + colour variants
    frames, labels = [], []
    for k in keys:
        n = len(table[k]['variants'])
        row = [to_frame(mod.sprite(k))] + [to_frame(mod.sprite(k, i)) for i in range(n)]
        row += [Image.new('RGBA', (32, 32))] * (4 - len(row))
        frames += row
        labels += [table[k]['name']] + [f'variant {chr(66 + i)}' for i in range(n)] + [''] * (3 - n)
    vs = lineup(frames, labels, 8, Z=5)
    titled(vs, ('Townsfolk' if gname == 'townsfolk' else 'Enemies') + ' colour variants',
           'A = base; B-D are palette swaps').save(f'{OUT}/{gname}_variants.png')

# game-ready style single-frame atlas (row per group) + json, same frame/pivot convention as the cowboys
FW = 32
n = max(len(m.ORDER) for _, m, _ in groups)
atlas = Image.new('RGBA', (FW * n, FW * 2))
meta = {"frame_width": 32, "frame_height": 32, "pivot": {"x": 16, "y": 31, "note": "bottom-center, standing point"},
        "status": "static mockups (frame 0 only, no animation yet)", "sprites": {}}
col = {'townsfolk': 0, 'enemies': 0}
for gname, k, f in atlas_rows:
    r = 0 if gname == 'townsfolk' else 1
    atlas.alpha_composite(f, (col[gname] * FW, r * FW))
    meta['sprites'][k] = {"group": gname, "x": col[gname] * FW, "y": r * FW}
    col[gname] += 1
atlas.save(f'{OUT}/npcs_enemies_static_atlas_32x32.png')
json.dump(meta, open(f'{OUT}/npcs_enemies_static_atlas.json', 'w'), indent=2)

# scale check: the party next to some NPCs and mobs on a 16 px grid
party = Image.open(os.path.join(ROOT, 'game_ready', 'all_cowboys_idle_atlas_32x32.png')).convert('RGBA')
pf = [party.crop((0, r * 32, 32, r * 32 + 32)) for r in range(4)]
W, H = 16 * 15, 16 * 6
sc = Image.new('RGBA', (W, H), (232, 196, 150, 255)); d = ImageDraw.Draw(sc)
for x in range(0, W, 16): d.line([(x, 0), (x, H)], fill=(214, 176, 132))
for y in range(0, H, 16): d.line([(0, y), (W, y)], fill=(214, 176, 132))
rows = [pf + [to_frame(TF.sprite(k)) for k in ['barkeep', 'bandit', 'miner']],
        [to_frame(EN.sprite(k)) for k in ['rattlesnake', 'coyote', 'scorpion', 'vulture', 'skeleton', 'cactus', 'sandworm']]]
for r, cast in enumerate(rows):
    for i, f in enumerate(cast):
        cx = 16 + 32 * i + 8 + 8 * r; cy = 16 * (2 + 3 * r) + 8   # standing point on a square centre
        d.ellipse([cx - 6, cy - 2, cx + 6, cy + 2], fill=(196, 150, 110))
        sc.alpha_composite(f, (cx - 16, cy - 31))
titled(sc.resize((W * 5, H * 5), Image.NEAREST), 'Scale check',
       'party + NPCs + mobs on the 5 ft grid (16 px squares), 5x').save(f'{OUT}/scale_check.png')
print('wrote', OUT)
