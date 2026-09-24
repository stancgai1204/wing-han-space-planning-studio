# WING HAN GROUP — Space Planning Studio

A lightweight 2D conceptual zoning and furniture-planning prototype for the Southmark Tower A 23F office plan.

## Live application

<https://stancgai1204.github.io/wing-han-space-planning-studio/>

## Current prototype

- Editable Phase 2 zoning blocks
- 100 mm movement and resize grid
- Box-to-box snapping
- Live net-area calculations with column deductions
- Aligned and distance dimensions
- Zone-edge doors with flip controls
- Teik office room-detail and editable furniture preview
- Image-plan upload and PDF export

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
