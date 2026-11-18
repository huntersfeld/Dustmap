"""Rebuild app/dustmap.html from app/dustmap_src.html by inlining the token sprite sheets.
Run from the project root:  python3 app/build_dustmap.py

Tokens are referenced in saved maps by their index (token.s), so the order is append-only:
app/token_manifest.json fixes it. New NPC/enemy sheets are appended to the end automatically."""
import base64, json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
sheets = root / "sprites" / "game_ready"
npc_dir = sheets / "npcs_enemies"
uri = lambda p: "data:image/png;base64," + base64.b64encode(p.read_bytes()).decode()

PARTY = [("cowboy1_harmonica", "Harmonica"), ("cowboy2_wheat", "Wheat"),
         ("cowboy3_cigarillo", "Cigarillo"), ("cowboy4_wizard", "Wizard")]
npc_meta = json.loads((npc_dir / "npcs_enemies_idle_atlas.json").read_text())["animations"]

man_path = root / "app" / "token_manifest.json"
manifest = json.loads(man_path.read_text()) if man_path.exists() else [p for p, _ in PARTY]
assert manifest[:4] == [p for p, _ in PARTY], "the four party cowboys must stay at indices 0-3"
for aid in npc_meta:                       # append anything new, never reorder
    if aid not in manifest:
        manifest.append(aid)
man_path.write_text(json.dumps(manifest, indent=1) + "\n")

uris, info = [], []
for aid in manifest:
    if aid in dict(PARTY):
        uris.append(uri(sheets / f"{aid}_idle_32x32_sheet.png"))
        info.append({"name": dict(PARTY)[aid], "group": "Party", "v": "A"})
    else:
        m = npc_meta[aid]
        uris.append(uri(npc_dir / "sheets" / f"{aid}_32x32_sheet.png"))
        info.append({"name": m["name"], "group": "Townsfolk" if m["group"] == "townsfolk" else "Enemies", "v": m["variant"]})

src = (root / "app" / "dustmap_src.html").read_text()
assert "__SHEETS__" in src and "__TOKINFO__" in src and "__FIREBASE__" in src
# Firebase web config for live sessions outside claude.ai (public values; see firebase/database.rules.json)
fb_path = root / "app" / "firebase_config.json"
fb = json.loads(fb_path.read_text()) if fb_path.exists() else None
out = src.replace("__SHEETS__", json.dumps(uris)).replace("__TOKINFO__", json.dumps(info)).replace("__FIREBASE__", json.dumps(fb))
(root / "app" / "dustmap.html").write_text(out)
print(f"wrote app/dustmap.html ({len(uris)} token sheets, {len(out) // 1024} KB)")
