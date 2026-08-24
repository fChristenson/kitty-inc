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
- `src/upgradeButton.ts` — the upgrade button drawing/hover/hit-testing only. Spawning a
  coin burst from it is done by calling `coins.ts` directly (see below).
- `src/coins.ts` — the shared outward/gravity coin-burst particle system (`spawnCoinBurst`,
  `hasActiveCoins`, `drawCoins`; state + rAF loop fully encapsulated here). Used by the
  upgrade button and `worker.ts`'s click reaction.
- `src/coinFloat.ts` — a separate, quieter coin animation: a few small coins that bubble
  straight up from a point and fade out (`spawnFloatingCoins`, `hasActiveFloatingCoins`,
  `drawFloatingCoins`), with its own particle array/rAF loop, independent of `coins.ts`.
  Not currently wired to anything; available for whichever element wants this look
  instead of the burst.
- `src/incomePanel.ts` — the per-floor "Income" panel (title, fill bar, `$X/Ns` text)
  and `increaseIncomeRate`, the only way a floor's `incomeAmount`/`incomeIntervalSeconds`
  should be mutated. The bar's fill duration always matches `incomeIntervalSeconds`.
- `src/floorNumber.ts` — the top-left "N / total" floor number label drawn on each floor
  (plain bold cartoon text, no panel background).
- `src/star.ts` — the small gold star + upgrade-count number drawn just under the floor
  number label (`drawUpgradeStar`), reflecting `floor.upgradeCount`.
- `src/worker.ts` — the small cartoon office worker (`drawWorker`) that paces back and
  forth across the floor's walkable band (`FLOOR_X_MIN`/`FLOOR_X_MAX` from `floors.ts`);
  per-floor position/direction state lives in its own `WeakMap<Floor, ...>`, same pattern
  as `incomePanel.ts`'s fill-cycle clock. No-ops on locked floors. Also owns click handling:
  `hitTestWorker`, `clickWorker` (triggers its little bounce reaction), and `getWorkerCenter`
  (so `main.ts` can spawn `coins.ts`'s shared coin-burst particles at its position).
- `src/totalIncome.ts` — accrual + persistence of the running total income: `formatTotalIncome`
  (6-digit cap with K/M/B/T/.../decillion suffixes), `startTotalIncomeTicker` (the only thing
  allowed to accrue floors' income into the total, skipping any floor that isn't `unlocked`),
  `getTotalIncome`, and `spendTotalIncome` (the only way to deduct from the total, used to pay
  for upgrades/unlocks). Drawing the total is `hud.ts`'s job, not this file's.
- `src/floorLock.ts` — locked-floor state: `drawFloorLock` (grey overlay + unlock-price panel,
  a no-op once `floor.unlocked`), `hitTestFloorLock`, and `unlockFloor` (the only way
  `floor.unlocked` should be mutated). Every floor above floor 1 starts locked; floor 1 is
  always free/unlocked.
- `src/hud.ts` — the top HUD (`drawHud`): floor count + total income, drawn on its own
  dedicated `#hud` canvas that sits as the first child inside `.game__scroll` (sticky-
  positioned, `pointer-events:none`, no panel background), so it always stays visible —
  the building canvas is also `position: sticky` but can visually detach from the
  viewport top near the ground floor, which would hide an in-canvas HUD.
- `src/testButton.ts` — the "Add Floor" / "Reset Game" dev/test controls: their markup,
  click wiring, the `addFloor` orchestration (build a floor, redraw), and `wireResetButton`
  (clears saved floors/total income via `gameState.ts`/`totalIncome.ts` and reloads).
- `src/gameState.ts` — `saveFloors`/`loadFloors`/`clearFloors` (localStorage persistence of the
  `Floor[]` array) and `computeViewport` (maps scroll position to which floor rows
  are visible). The canvas is a small, fixed-size "viewport window" inside a `.game__spacer`
  div sized to the full building's scroll height — it must never be resized to match
  the total floor count, or endless scrolling breaks/tanks performance. `main.ts` must
  call `saveFloors` after any action that mutates `floors`. Also the sole owner of `WorkerSlot`
  (`{ boosted }`, whether `coinFloat.ts`'s animation should play on a floor's worker) —
  tracked in its own `WeakMap<Floor, WorkerSlot[]>` since `Floor` itself doesn't carry it,
  same pattern `worker.ts` uses for its own ephemeral walk-animation state.
- `src/utils.ts` — small shared helpers (`loadImage`, `randomInt`, `roundRect`,
  `drawCartoonPanel`, `drawCartoonText`, `drawGlossHighlight`) used by multiple modules.
  Add new cross-cutting helpers here rather than duplicating them.

All canvas-drawn UI (HUD, income panel, floor number, star, upgrade button) shares one
cartoon look: flat fill colors, a hard-edged (unblurred) offset shadow
(`CARTOON_SHADOW_OFFSET`) instead of a soft drop shadow, a **white** outline stroke
(`CARTOON_OUTLINE_WIDTH`) around every shape/icon (panels via `drawCartoonPanel`, custom
shapes like `star.ts`'s star via their own stroke call), and a glossy highlight overlay
(`drawGlossHighlight` for rounded rects; clip to the shape's own path and reuse the same
gradient stops for anything else, like `star.ts` does) so nothing reads as flat/matte.
Text is the one exception: `drawCartoonText` keeps a **black** stroke behind a white fill,
since a white stroke on white-ish fills disappears. Match this style — including in the
`upgrade-btn.svg` asset — when adding new HUD/panel/icon elements.

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
