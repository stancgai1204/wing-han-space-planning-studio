# WING HAN GROUP — Space Planning Studio

A lightweight 2D conceptual zoning and furniture-planning prototype for the Southmark Tower A 23F office plan.

## Live application

<https://stancgai1204.github.io/wing-han-space-planning-studio/>

## Current prototype

- Editable Phase 2 zoning blocks
- Custom room types with selectable zoning colours
- 100 mm movement and resize grid
- Box-to-box snapping
- Live net-area calculations with column deductions
- Aligned and distance dimensions
- Dimension visibility toggle
- AutoCAD-style 100 mm snapped polyline walls
- Doors that attach to zoning edges or walls and cut a visible opening
- Door width and flip controls
- Image-plan upload, PDF export, and colour-zoning DXF export

## Run locally

Requires Node.js.

```powershell
node preview-server.mjs
```

Open <http://127.0.0.1:4173/>.

## Project structure

- `dist/` — browser application and plan asset
- `preview-server.mjs` — local static preview server

The application uses deterministic 2D geometry; it does not use generative image AI for planning geometry.
