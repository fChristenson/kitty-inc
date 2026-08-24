---
description: Keep game/canvas logic split into dedicated modules
applyTo: "src/**"
---

# Module structure for this project

This is a canvas-based idle/clicker game (Vite + TypeScript, no framework). Keep each
distinct game element in its own dedicated file under `src/`:

- `src/sprites.ts` — furniture sprite loading, size-tier target heights, and random
  sprite selection. Nothing else should load or pick sprites directly.
- `src/floors.ts` — floor state (`Floor`, `Placement` types), building a floor
  (`buildFloor`), and drawing a floor slab (`drawFloor`). Also owns `FLOOR_W`/`FLOOR_H`.
- `src/upgradeButton.ts` — the upgrade button image/rendering, hover/hit-testing, and
  the coin-burst particle animation (state + rAF loop are fully encapsulated here).
- `src/utils.ts` — small shared helpers (`loadImage`, `randomInt`) used by multiple
  modules. Add new cross-cutting helpers here rather than duplicating them.

`src/main.ts` must stay a thin orchestrator only:

- DOM setup (building the `#app` markup, grabbing element references).
- Loading assets by calling into the dedicated modules above.
- Owning top-level game state (e.g. the `floors` array, `hoveredRow`).
- Wiring event listeners that call into the modules' exported functions.
- Driving the render loop by calling each module's `draw*` function — it should not
  contain drawing logic, physics, or asset-loading logic itself.

When adding a new game element (a new UI widget, animation, or mechanic), create a new
`src/<elementName>.ts` file for it instead of adding it directly to `main.ts`. Export
only what other modules need (types, a loader, a `draw*` function, and any
hit-testing/interaction helpers); keep internal state (e.g. particle arrays,
animation-frame ids) private to that module.
