# Dustmap

A browser-based battle-map editor for our D&D campaign, set in a pixel-art Western desert. The DM sketches shapes or brushes terrain and the map fills itself in: ragged edges, shorelines, cliffs, cacti and rocks, towns that grow buildings, mines with rails. Tokens are four hand-made animated cowboy sprites. It is heading toward a live multiplayer DM + players tool.

**Live prototype:** https://claude.ai/artifact/DNWCJkheMFSz67dMPTWf5x

For the full design notes, state format, rendering pipeline and roadmap, read [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md).

## Layout

| Path | What it is |
|---|---|
| `app/dustmap_src.html` | The editor source. **Edit this one.** Sprite data is a `__SHEETS__` placeholder. |
| `app/dustmap.html` | The built, runnable page (what gets published). Generated; don't edit by hand. |
| `app/build_dustmap.py` | Inlines the four sprite sheets into the source to produce `dustmap.html`. |
| `app/tests/` | Playwright checks (partial redraw vs. full redraw, mine scene smoke test, map library). |
| `sprites/game_ready/` | Final 32×32, 8-frame idle sheets, combined atlas + JSON, lineup GIF. |
| `sprites/per_character/` | Intermediate art per character (pose mockups, size and detail variants, idle GIFs). |
| `sprites/generator_scripts/` | Python (Pillow + NumPy) scripts that draw each sprite. |
| `reference/` | Original painted character art and early editor mockups. |

## Build and test

Requires Python 3 and Node 18+.

```sh
npm install                 # installs Playwright
npx playwright install chromium   # first time only
npm run build               # app/dustmap_src.html -> app/dustmap.html
npm test                    # build, then run both browser checks
```

Open `app/dustmap.html` directly in a browser to use the editor. The **Map** button in the header holds the map library: switch maps, and export or import them as `.dustmap.json` files. When publishing as a claude.ai artifact, declare `capabilities: {downloads: true}` so Export can save files. Screenshots from the tests land in `app/tests/output/`.

`verify_partial_redraw.js` must keep passing: edits only repaint the changed area, and that repaint has to be pixel-identical to a full redraw. Any new noise, parity or `%` term in the paint code must use absolute map coordinates (`x+OX`, `y+OY`).

## Regenerating sprites

The generator scripts write their images to the current directory, so run them from a scratch folder:

```sh
pip install pillow numpy
mkdir -p /tmp/sprites && cd /tmp/sprites
python3 /path/to/dustmap/sprites/generator_scripts/cowboy4_wizard/anim4.py
```

`sprites/generator_scripts/standardize/std.py` reads the per-character idle sheets in `sprites/per_character/` and writes the standardized 32×32 sheets and atlas into `sprites/game_ready/` (set `DUSTMAP_SPRITE_OUT` to send them elsewhere). Running it on the committed sheets reproduces `game_ready/` exactly.
