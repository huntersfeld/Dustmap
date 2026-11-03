"""Build idle animations for every NPC / enemy token (and its colour variants).
Run: python3 sprites/generator_scripts/npcs/build_anim.py
Outputs sprites/game_ready/npcs_enemies/: per-token 8-frame 32x32 sheets, a combined atlas + JSON
(same format as all_cowboys_idle_atlas.json) and preview GIFs."""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import townsfolk as TF, enemies as EN
from animate import frames, frame32, N
from anim_specs import S

ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.environ.get('NPC_ANIM_OUT', os.path.join(ROOT, 'game_ready', 'npcs_enemies'))
os.makedirs(os.path.join(OUT, 'sheets'), exist_ok=True)


def anim(table, key, variant=None):
    t = table[key]; spec = S[key]()
    cmap = dict(t['cmap'])
    if variant is not None:
        cmap.update(t['variants'][variant])
    cmap.update(spec.get('cmap', {}))
    return frame32(frames(t['grid'], cmap, spec['parts'], spec.get('patch'), spec.get('fx')))


entries = []   # (group, key, name, variant_label, frames)
for gname, mod, table in [('townsfolk', TF, TF.T), ('enemies', EN, EN.E)]:
    for k in mod.ORDER:
        entries.append((gname, k, table[k]['name'], None, anim(table, k)))
        for i in range(len(table[k]['variants'])):
            entries.append((gname, k, table[k]['name'], i, anim(table, k, i)))

atlas = Image.new('RGBA', (32 * N, 32 * len(entries)))
meta = {"frame_width": 32, "frame_height": 32, "frames_per_animation": N, "frame_duration_ms": 150,
        "fps": round(1000 / 150, 2), "pivot": {"x": 16, "y": 31, "note": "bottom-center, standing point"},
        "animations": {}}
for r, (g, k, name, v, frs) in enumerate(entries):
    aid = k + ('' if v is None else '_' + chr(98 + v)) + '_idle'
    sheet = Image.new('RGBA', (32 * N, 32))
    for i, f in enumerate(frs):
        sheet.alpha_composite(f, (32 * i, 0)); atlas.alpha_composite(f, (32 * i, 32 * r))
    sheet.save(os.path.join(OUT, 'sheets', f'{aid}_32x32_sheet.png'))
    meta['animations'][aid] = {"atlas_row": r, "x": 0, "y": 32 * r, "frames": N, "loop": True, "group": g,
                               "name": name, "variant": 'A' if v is None else chr(66 + v)}
atlas.save(os.path.join(OUT, 'npcs_enemies_idle_atlas_32x32.png'))
json.dump(meta, open(os.path.join(OUT, 'npcs_enemies_idle_atlas.json'), 'w'), indent=2)

# ---- preview GIFs: staggered phases like cowboy_lineup.gif
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def font(n):
    try: return ImageFont.truetype(FONT, n)
    except Exception: return ImageFont.load_default()

def lineup_gif(items, cols, path, Z=5, title=''):
    gap, lab, top = 4, 9, 12
    rows_ = (len(items) + cols - 1) // cols
    W = cols * (32 + gap) + gap; H = top + rows_ * (32 + gap + lab) + gap
    out = []
    for f in range(N):
        im = Image.new('RGBA', (W, H), (240, 202, 184, 255)); d = ImageDraw.Draw(im)
        for i, it in enumerate(items):
            if it is None: continue
            label, frs = it
            x = gap + (i % cols) * (32 + gap); y = top + (i // cols) * (32 + gap + lab)
            d.rectangle([x, y, x + 31, y + 31], fill=(232, 190, 170))
            d.ellipse([x + 9, y + 29, x + 23, y + 33], fill=(212, 166, 154))
            im.alpha_composite(frs[(f + i * 3) % N], (x, y))
        big = im.resize((W * Z, H * Z), Image.NEAREST).convert('RGB'); d = ImageDraw.Draw(big)
        d.text((gap * Z, 3 * Z), title, fill=(70, 44, 34), font=font(24))
        for i, it in enumerate(items):
            if it is None: continue
            label = it[0]
            x = gap + (i % cols) * (32 + gap); y = top + (i // cols) * (32 + gap + lab) + 33
            tw = d.textlength(label, font=font(17))
            d.text(((x + 16) * Z - tw / 2, y * Z), label, fill=(70, 44, 34), font=font(17))
        out.append(big)
    out[0].save(path, save_all=True, append_images=out[1:], duration=150, loop=0)

for g, cols, title in [('townsfolk', 7, 'Townsfolk & NPCs - idle'), ('enemies', 6, 'Enemies & mobs - idle')]:
    base = [(name, frs) for gg, k, name, v, frs in entries if gg == g and v is None]
    lineup_gif(base, cols, os.path.join(OUT, f'{g}_idle_lineup.gif'), title=title)
    allv = []
    for k in [kk for gg, kk, _, v, _ in entries if gg == g and v is None]:
        row = [(name if v is None else f'{chr(66 + v)}', frs) for gg, kk, name, v, frs in entries if kk == k]
        allv += row + [None] * (4 - len(row))   # 4 slots per character, 2 characters per row
    lineup_gif(allv, 8, os.path.join(OUT, f'{g}_idle_all_variants.gif'), Z=4, title=title + ' (all colour variants)')
print(len(entries), 'animations ->', OUT)
