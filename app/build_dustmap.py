"""Rebuild app/dustmap.html from app/dustmap_src.html by inlining the four token sprite sheets.
Run from the project root:  python3 app/build_dustmap.py"""
import base64, json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
sheets = root / "sprites" / "game_ready"
names = ["cowboy1_harmonica", "cowboy2_wheat", "cowboy3_cigarillo", "cowboy4_wizard"]
uris = ["data:image/png;base64," + base64.b64encode((sheets / f"{n}_idle_32x32_sheet.png").read_bytes()).decode() for n in names]
src = (root / "app" / "dustmap_src.html").read_text()
(root / "app" / "dustmap.html").write_text(src.replace("__SHEETS__", json.dumps(uris)))
print("wrote app/dustmap.html")
