# Dustmap — project context

Hand-off notes for continuing this project in a new chat or project. Read this first; it explains what exists, how the code is built, the decisions already made, and what comes next.

**Live prototype:** https://claude.ai/artifact/DNWCJkheMFSz67dMPTWf5x (published from `app/dustmap.html`, shared as "Anyone with the link")

## What this is

Two related pieces of work:

1. **Pixel-art cowboy sprites.** Four characters translated from painted reference art (`reference/original_art/`) into tiny pixel sprites with 8-frame idle animations. They are the tokens used in Dustmap.
2. **Dustmap.** A browser-based battle-map editor for D&D-style tabletop games, set in a pixel-art Western desert. The DM draws shapes or brushes terrain and it fills in procedurally (ragged edges, shorelines, cliffs, scattered cacti and rocks, towns that fill with buildings). It is heading toward a multiplayer DM + players tool.

## Files in this package

| Path | What it is |
|---|---|
| `PROJECT_CONTEXT.md` | This document |
| `app/dustmap.html` | The complete, runnable page (what is published). Open it in a browser. |
| `app/dustmap_src.html` | Same page with the sprite data replaced by a `__SHEETS__` placeholder. **Edit this one.** |
| `app/build_dustmap.py` | Rebuilds `dustmap.html` from the source by inlining the four sprite sheets |
| `app/tests/verify_partial_redraw.js` | Playwright test: makes edits, then checks the partial redraw matches a full redraw pixel-for-pixel |
| `app/tests/mine_scene_smoke_test.js` | Playwright test: builds a mine scene (stone, raised-stone cave wall, rails, props, grid, stamp, token drag) |
| `sprites/game_ready/` | Final 32×32 sprite sheets (8 frames each), combined atlas + JSON, lineup GIF |
| `sprites/per_character/` | Every intermediate deliverable per character (pose mockups, size variants, eye/cigarette/palm variants, idle GIFs) |
| `sprites/generator_scripts/` | The Python (Pillow + NumPy) scripts that drew each sprite. Sibling-script loads and `standardize/std.py` paths are repo-relative; other outputs go to the current directory. |
| `reference/original_art/` | The four painted characters the sprites are based on |
| `reference/mockups/` | Early static mockups of the editor and terrain fills |

## The four cowboys (sprites)

All are tiny pixel art, hand-placed on a character grid for the smallest size, then animated by moving parts a whole pixel at a time.

| # | Name | Pose / details chosen | Idle animation |
|---|---|---|---|
| 1 | Harmonica | Huge hat and white mustache, gunslinger stance (arms out and down), harmonica in right hand | Breathing, hat lag, mustache tips flap, harmonica-hand flick |
| 2 | Wheat | Bearded drifter, duster, wheat stalk in mouth, relaxed arms, **hat pulled low** (eyes hidden) | Breathing, hat lag, wheat head dangles, duster tails flare |
| 3 | Cigarillo | Black frock coat, horseshoe mustache, gunslinger stance, **cigarillo held in hand**, pants lightened for contrast with coat | Breathing, hat lag, coat tails, ember flicker, looping smoke puffs |
| 4 | Wizard | Pointed floppy hat, long hair and beard, brown coat, satchel, **palm up at shoulder height with a blue flame** | Breathing, hat + floppy-tip lag, coat tails, procedural flickering blue flame |

**Game-ready format (`sprites/game_ready/`):** every sheet is a single row of 8 frames, each 32×32 px. Pivot is bottom-centre between the feet at (16, 31). 150 ms per frame. `all_cowboys_idle_atlas.json` describes the atlas. Smoke and flame pixels are semi-transparent (no outline) and only survive fully in the PNGs, not in transparent GIFs.

**Art conventions:** 1 px dark outline (`#281a18`-ish) around solid shapes; effects (smoke, magic, glow) have no outline; colours come from the painted references; animation offsets are whole pixels, with secondary parts lagging the body by 1–2 frames (hats only lag on the way *up*, so no gap opens between hat and head).

## Dustmap: features today

- **Map:** 16 px = one 5 ft square. Sizes from 20×14 up to 60×40 squares (Settings dropdown, or zoom out and click the + tabs on each edge to add 10 squares on that side). Resizing keeps content in place and can be undone.
- **Camera:** trackpad two-finger scroll pans and pinch zooms; mouse wheel zooms in steps; right-drag, Space-drag, Pan tool (H) or dragging empty ground in Select pans; touch pinch/pan; `+` `−` zoom, `0` fits.
- **Tools:** Shape (D, click polygon points), Brush (B), Sculpt (E), Select (V), Objects (O), Measure (M), Pointer (P), Pan (H).
- **Terrain (Terrain tab):** Sand, Scrub, Mesa, Water, Badlands, Road, Town, Stone, Mine rail.
  - Water gets foam, a wet-sand band and depth shading. Mesa gets rock faces on its south side, outlines and cast shadows. Stone is one material: flat it is cave floor; raised (Elevation or Sculpt) it becomes a cave wall with the dark wall texture on top and dark gray rock faces.
  - Roads get wheel ruts computed from the *merged* road shape (so crossings join cleanly). A road can only climb or drop one elevation level at a time; larger jumps are skipped and the road resumes beyond them; where it crosses a one-level cliff it renders as a ramp.
  - Town fills itself with small/medium/large buildings (shack 3×3, saloon 5×5, hotel 7×6 squares, true scale) plus barrels, crates and troughs; buildings avoid roads, so a road through a town becomes a street.
  - Mine rail draws ties and two rails along the stroke path.
- **Elevation (Elevation tab):** Hill, High hill, Cliff, High cliff, Lower, Deepest, Flatten. Raised cliffs get rock faces coloured by the ground underneath (red for mesa, purple for badlands, dark gray for stone, tan otherwise); hills get a graded south slope, lit north/west edges, a shaded east edge and a soft cast shadow; lowered land renders as a recessed pit (inner wall, shadow, darker floor); lowered water just gets darker.
- **Sculpt:** in one motion, drag over an area, hold still about 0.38 s (a ring fills) or press Shift, then drag up/down to step it along one ladder: Deepest, Lower, Flat, Hill, Cliff, High cliff, Towering cliff (`SLAD`), starting from the most common level under it. One step up from flat is a hill; further steps are cliffs. There is no separate Hill/Cliff toggle.
- **Brush:** small gaps fully enclosed inside a single stroke fill automatically (up to about 8·r² px).
- **Objects:** buildings, well, wagon, trough, barrels, crates, boulder, cactus, rock, dead tree, ore cart, lantern (glow), timber supports, rubble, crystals (glow). Grid picker (Google-Docs-style 6×6) places arrays with adjustable spacing; arrays move as a group (Alt grabs one).
- **Select:** click to select; a terrain shape only moves when dragged *after* it is selected (otherwise the drag pans). Drag corners to reshape. Auto-placed buildings, props, cacti and rocks can be picked up individually (they become normal objects and the generator leaves the spot empty). Shift-click / Shift-drag box for multi-select; **Save as stamp** stores the selection as a reusable stamp (saved per browser).
- **Tokens:** the four cowboys, animated. They snap so their standing point (shadow) lands exactly on a square centre, edge midpoint or corner; a diamond shows the target while dragging; Alt places freely.
- **Measure:** square-to-square distance in feet and squares, 5e default (diagonals count 5 ft).
- **Pointer:** click for a radar ping; press and drag for a pointer with a fading tail.
- **Other:** Undo (Ctrl/Cmd+Z), Reroll details, Clear map (two-click confirm), Load example, Snapshot (renders an image the user right-click saves), 5 ft grid toggle, edge roughness slider, token animation toggle. Map autosaves to `localStorage`.

## How the code works (`app/dustmap_src.html`)

One self-contained HTML file: inline CSS and a single IIFE script, no libraries. Fonts: Pixelify Sans (brand) and Work Sans (UI) from Google Fonts. Single dark theme by choice.

### State (saved to `localStorage['dustmap-v2']`)

```
st = {
  v: 3, cols, rows,            // map size in squares (W = cols*16, H = rows*16 px)
  seed, rag,                   // detail seed; edge roughness 0–9
  ops: [ { kind:'poly'|'stroke', layer:'ground'|'height',
           t (terrain index) | h (level), s (0 hill / 1 cliff),
           pts:[[x,y]...], r (stroke radius), sid (per-op random id) } ],
  objects: [ { k, x, y, v, g? } ],   // centre position; v = variant; g = group id
  tokens:  [ { s (sheet 0–3), x, y (standing point), o (frame offset) } ],
  skip: [ "prefix:x:y" ]             // auto-placed items the user picked up
}
```
Older saves are migrated (`migrate()`); stamps live separately in `localStorage['dustmap-stamps']`.

Terrain indices: 0 sand, 1 scrub, 2 mesa, 3 water, 4 badlands, 5 road, 6 town, 7 stone, 8 retired (old Cave wall; `migrate()` turns each such op into Stone plus a two-level cliff over the same shape), 9 mine rail.

### Rendering pipeline

1. **`rasterize(ops)`** turns the op list into per-pixel arrays: `L` (terrain), `Hm` (height), `Sm` (edge style), `own` (which op owns the pixel). Height ops are applied first, then ground ops (so roads can check heights). Edges are roughened by displacing each sample with value noise (`vn`) scaled by the roughness. Rails are not rasterized; they are drawn as geometry later.
2. **`paintMap(img, R, seed)`** colours every pixel: base textures, scrub/town/road/stone edge dithering, shorelines and depth, mesa and cave-wall faces/outlines/shadows, the elevation pass (faces, rims, pit walls, cast shadows, ramps), water ripples, rails, then auto-placed content: town buildings and props (per town op), and scatter. It returns the list of auto-placed items so Select can pick them up.
3. **Sprites:** every object is drawn once into a cached sprite (`sprite(k, v)`) with an automatic outline and a soft translucent shadow, then blended onto the map with `drawObject()`.
4. **Layers on screen:** terrain canvas (`tcan`) → objects canvas (`ocan`) → animated tokens → grid → overlays (selection, drafts, measure, pointer) drawn in screen space. Camera: `Z` = screen px per map px, `cam` = map px at the view's top-left.

### Partial redraw (important invariant)

Edits call `markOp(op)` / `markRect()` instead of redrawing everything. `renderRegion()` rasterizes and paints only the changed rectangle plus a 24 px margin, using global offsets `OX/OY` so **every noise lookup, pattern and scatter decision uses absolute map coordinates**. Scatter and ripples are placed one candidate per small cell, decided by a hash of that cell's absolute position, so an edit never reshuffles details elsewhere. A town touched by an edit is re-rendered whole (its building layout depends on the whole town shape). The test `verify_partial_redraw.js` checks a partial redraw is pixel-identical to a full redraw; **keep it passing** when changing paint code (any new `%`, parity or noise term must use `x+OX`, `y+OY`).

Full redraws still happen for: load, Reroll, roughness, resize, and undo that changes seed/roughness/skip. Typical edit: 40–130 ms. Full redraw: 0.3–0.5 s (40×28) and slower at 60×40.

### Build and test

- Edit `app/dustmap_src.html`, then `python3 app/build_dustmap.py` to produce `app/dustmap.html`.
- Tests use Node + Playwright with Chromium (`npm test`, or `node app/tests/verify_partial_redraw.js`). They load `app/dustmap.html` relative to the repo, write screenshots to `app/tests/output/`, and exit non-zero on failure.

### Platform notes (claude.ai artifacts)

- Scripts only from cdnjs / jsDelivr / unpkg; no network fetches; `alert/confirm/prompt` don't work (use in-page confirms); downloads need the `downloads` capability; `localStorage` is per viewer and per browser.
- Multiplayer building blocks available to this account: **`room`** (live messages and presence for whoever has the page open: pointers, pings, rulers) and **`db`** (shared, persistent documents with access rules: the shared map, roles). Both need the page declared with those capabilities; `db` needs signed-in viewers with access to the artifact.

## Decisions and preferences so far

- The user prefers the **tiniest sprite size** and chooses from small sets of visual options before animating.
- True-scale battle maps (one person = one square) over a compact look; buildings were scaled up rather than tokens shrunk.
- Elevation should feel physical: pits recess into the ground; roads obey one-level steps.
- Interaction choices: a pause (dwell), not angle or speed, switches Sculpt from selecting to raising; terrain shapes must be selected before they can be dragged.
- Physics engine (pour rocks, explosions, craters) is **parked** as a nice-to-have.

## Roadmap

| Phase | Item | Status |
|---|---|---|
| 1 | Camera drag fix (trackpad/touch/select-drag panning) | Done |
| 1 | Redraw only changed areas; stable details | Done |
| 1 | Brush gap fill | Done |
| 1 | Token snapping to centres / edge midpoints / corners | Done |
| 2 | Stone / cave / mine terrain and props | Done |
| 2 | Object grid placement and reusable stamps | Done |
| 3 | **Map library**: named maps saved in the page, switch between them, export/import as a file (needed to "build locally, then load into a session") | **Next** |
| 4 | Multiplayer core: sessions, DM + player roles, shared live map, players move only their own token, shared pointer/measure/ping | To do |
| 5 | Hidden areas (fog of war) painted by the DM, revealable mid-session | To do |
| 6 | DM animation paths (token walks a drawn path at a set speed) | To do |
| 6 | Interactive objects (click a door to load another map; more actions later) | To do |
| — | Physics engine | Parked |

Planned role details for Phase 4: the artifact owner is DM by default and can make someone else DM. DM: full editing, add/move/remove any token, load maps, assign tokens to players, hide areas. Players: view, move their own token, Pointer and Measure. Players must be signed in and given access via the page's Share menu.

## Known limitations

- Full redraws are slow on 60×40 maps; maps above 60×40 are disabled.
- Stamps are per browser, not per map.
- Picked-up auto items are tied to the current layout; Reroll or reshaping a town can bring generated items back elsewhere.
- Snapshot can't download directly (artifact sandbox); the user right-clicks the image.
