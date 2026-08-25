---
description: Keep game/canvas logic split into dedicated folder modules
applyTo: "src/**"
---

# Cash Clicker

A canvas-based idle/clicker game (Vite + TypeScript, no framework). Click workers on
each floor to earn money, buy upgrades/workers/boosts, unlock new floors up the
skyscraper, and collect badges — income keeps accruing while the tab is closed too.

## Module-first rule

Every distinct game element lives in its own folder under `src/`, named after the
module, with a single `index.ts` entry point (e.g. `src/badges/index.ts`,
`src/worker/index.ts`, `src/gameState/index.ts`) — all related code (drawing, state,
hit-testing, persistence) for that concept stays together in that one folder. Import a
module by its folder name (`import { drawWorker } from "../worker"`), never by reaching
into a sibling's internals. If a module needs multiple files, add them inside that same
folder and re-export from `index.ts` — the folder is the unit of encapsulation, not the
file. `src/main.ts` (entry point) and `src/utils.ts` (small cross-cutting helpers) are
the only code that stays flat; `src/assets/` is static resources, not code.

When adding a new game element, create a new `src/<elementName>/index.ts` folder for it
instead of adding it directly to `main.ts`.
