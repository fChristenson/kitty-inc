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
hit-testing, persistence) for that concept stays together in that one folder. `src/main.ts`
(entry point) and `src/utils.ts` (small cross-cutting helpers) are the only code that
stays flat; `src/assets/` is static resources, not code.

When adding a new game element, create a new `src/<elementName>/index.ts` folder for it
instead of adding it directly to `main.ts`.

## Facade rule: import only through a module's own index.ts

A module's folder may itself contain nested sub-folders for its own internal parts
(e.g. `floors/worker/`, `floors/incomePanel/`, `hud/badges/`, `background/clouds/`) —
that's expected once a module grows past one file. But code **outside** that module's
own folder tree must only ever import from the module's top-level
`src/<module>/index.ts`, never by reaching into one of its nested sub-folders
(`../floors/worker`, `../hud/badges`, `../background/gameCanvas`, etc. from anywhere
outside `floors`/`hud`/`background`). Whatever a nested part exposes that another
module actually needs must be re-exported from the parent `index.ts` — that file is
the one and only public surface of the module. A brand new top-level module folder
(nothing else already imports from it) still needs its own `index.ts` even if it's
currently just a one-line re-export, so it has a facade ready the moment something
outside it needs to import from it.

Within a module's own folder tree, siblings may import each other (or their own parent)
directly by relative path (e.g. `floors/worker/index.ts` importing from `floors/index.ts`
or from a sibling `floors/incomePanel/index.ts`) — the one-entry-point rule is only about
crossing _out_ of the module, not moving around inside it.

Watch for import cycles this can create: if a nested part (e.g. `floors/upgradeButton`)
computes a top-level `const` from a value it imports back from its own parent's
`index.ts` (e.g. `FLOOR_W`), and that parent's `index.ts` also re-exports that nested
part, you get a real circular import — the nested part evaluates _before_ the parent's
own top-level code runs, and reading that not-yet-initialized `const` throws
`ReferenceError: Cannot access 'X' before initialization`. Function declarations don't
have this problem (they're hoisted before any module in the cycle runs), only
top-level `const`/`let` do. If a value is needed for eager top-level math in more than
one nested part, put it in its own small dependency-free file inside the module (e.g.
`floors/constants.ts`) that the parent `index.ts` re-exports and every nested part
imports directly — never have nested parts read shared constants back through the
barrel that also re-exports them.

## UI element rule: dependencies passed in at render time

A module's public functions — canvas draw calls, DOM widgets, anything that puts
something on screen or wires up interaction — take every dependency they need as a
parameter at the point they're called (`drawX(ctx, deps)`, `wireX(container, deps)`),
never by importing another module's live state, DOM element, or container reference
directly. Combined with the facade rule above, this means a module's `index.ts` should
only ever need to export two kinds of things: constants, and functions like these that
receive their dependencies at render/call time. If a module's export list has grown to
include a raw mutable value or a function that only works because it secretly reaches
into another specific module, that's a sign a dependency should be passed in as a
parameter instead.
