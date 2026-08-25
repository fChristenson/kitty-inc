---
description: Keep game/canvas logic split into dedicated modules
applyTo: "src/**"
---

# Module structure for this project

This is a canvas-based idle/clicker game (Vite + TypeScript, no framework). Each floor
is a real DOM element: `main.ts` creates one fixed-size (`FLOOR_W` x `FLOOR_H`) `<canvas>`
per `Floor`, appended/prepended into `.game__floors` (a plain flex column inside the
native-scrolling `.game__scroll`). There is no shared/virtualized canvas, no manual
spacer-height or scroll-offset math anywhere — the browser's own scrolling and layout
position every floor, which is what guarantees every floor renders at exactly the same
size no matter the floor count. All `draw*(ctx, floor, ...)` functions draw at floor-local
coordinates (0,0 origin) only; none of them take an `offsetY` parameter. Keep each
distinct game element in its own dedicated file under `src/`:

- `src/sprites.ts` — furniture sprite loading, size-tier target heights, and random
  sprite selection. Nothing else should load or pick sprites directly.
- `src/floors.ts` — floor state (`Floor`, `Placement` types), building a floor
  (`buildFloor`), and drawing a floor slab (`drawFloor(ctx, bgImage, floor)`, always at
  the canvas's own origin). Also owns `FLOOR_W`/`FLOOR_H`.
- `src/outerWall.ts` — `drawOuterWall(ctx)`, a flat exterior facade strip drawn along
  both edges of a floor's own canvas right after `drawFloor`, masking bg.png's raw
  left/right image edges now that the blue sky/clouds show past the canvas on each side.
- `src/upgradeButton.ts` — the upgrade button drawing/hover/hit-testing only, all in
  floor-local coordinates (`hitTestUpgradeButton(x, y)`, no floor/row lookup). Spawning a
  coin burst from it is done by calling `coins.ts` directly (see below).
- `src/coins.ts` — the shared outward/gravity coin-burst particle system (`spawnCoinBurst`,
  `hasActiveCoins`, `drawCoins`; state + rAF loop fully encapsulated here). Particles are
  tagged with the `Floor` they were spawned from but physics stay in that floor's local
  (`FLOOR_W`/`FLOOR_H`) coordinate space; `drawCoins(ctx, getFloorRect)` draws them onto
  `main.ts`'s full-viewport `#coin-overlay` canvas by mapping each particle through
  `getFloorRect(floor)` (that floor's current on-screen rect), so a burst can never be
  clipped by the floor's own canvas edges. Used by the upgrade button and `worker.ts`'s
  click reaction.
- `src/coinFloat.ts` — a separate, quieter coin animation: a few small coins that bubble
  straight up from a point and fade out (`spawnFloatingCoins`, `hasActiveFloatingCoins`,
  `drawFloatingCoins(ctx, floor)`), tagged per-`Floor` the same way, with its own particle
  array/rAF loop, independent of `coins.ts`. Unlike `coins.ts`'s bursts, these stay drawn
  directly onto their own floor's canvas since they don't need to escape its bounds.
- `src/incomePanel.ts` — the per-floor "Income" panel (title, fill bar, `$X/Ns` text)
  and `increaseIncomeRate`, the only way a floor's `incomeAmount`/`incomeIntervalSeconds`
  should be mutated. The bar's fill duration always matches `incomeIntervalSeconds`.
- `src/floorNumber.ts` — the top-left "N / total" floor number label drawn on each floor
  (plain bold cartoon text, no panel background).
- `src/star.ts` — the small gold star + upgrade-count number drawn just under the floor
  number label (`drawUpgradeStar`), reflecting `floor.upgradeCount`.
- `src/worker.ts` — the small cartoon office worker (`drawWorker(ctx, floor, now)`) that
  paces back and forth across the floor's walkable band (`FLOOR_X_MIN`/`FLOOR_X_MAX` from
  `floors.ts`); per-floor position/direction state lives in its own `WeakMap<Floor, ...>`,
  same pattern as `incomePanel.ts`'s fill-cycle clock. No-ops on locked floors. Also owns
  click handling: `hitTestWorker(x, y, floor)`, `clickWorker` (triggers its little bounce
  reaction), and `getWorkerCenter(floor)` (floor-local, for aiming `coins.ts`'s bursts).
- `src/totalIncome.ts` — accrual + persistence of the running total income:
  `startTotalIncomeTicker` (the only thing allowed to accrue floors' income into the
  total, skipping any floor that isn't `unlocked`), `getTotalIncome`, `addTotalIncome`
  (used by the "Add Money" dev control), and `spendTotalIncome` (the only way to deduct
  from the total, used to pay for
  upgrades/unlocks). Drawing the total is `hud.ts`'s job, not this file's.
- `src/floorLock.ts` — locked-floor state: `drawFloorLock(ctx, floor)` (grey overlay +
  unlock-price panel, a no-op once `floor.unlocked`), `hitTestFloorLock(x, y, floor)`, and
  `unlockFloor` (the only way `floor.unlocked` should be mutated). `ensureLockedFloorAbove`
  keeps exactly one locked floor waiting above the topmost unlocked one — it just builds
  the `Floor` and calls `onAdd(floor)`; `main.ts`'s `onAdd` mounts a new DOM canvas for it,
  no scroll-position math involved. Every floor above floor 1 starts locked; floor 1 is
  always free/unlocked.
- `src/hud.ts` — the top HUD (`drawHud`): floor count + total income, drawn on its own
  dedicated `#hud` canvas that sits as the first child inside `.game__scroll` (sticky-
  positioned, `pointer-events:none`, no panel background), so it always stays visible.
- `src/clouds.ts` — `drawClouds`, decorative clouds slowly drifting right-to-left across
  the `#clouds` canvas's sky band (its own `.game__clouds` sticky canvas, widened via a
  negative margin to span the side gutters `.game__scroll`'s padding reveals, sitting
  behind the HUD/floors in DOM order). Purely time-based off `now` — no particle array
  or rAF loop of its own; `main.ts` redraws it every frame from the same perpetual loop
  `startIncomeTicker` already drives.
- `src/actionBar.ts` — the fixed action bar overlaying the bottom of the viewport
  (`.action-bar`, independent of scroll/floor position): up/down arrows to jump to the
  top/ground floor, a lightning bolt to open `boostMenu.ts`'s boost menu, and
  a plus to open `workerMenu.ts`'s hire menu. `createActionBarMarkup`/`wireActionBar`
  only build and wire the bar itself; `main.ts` owns what each button actually does.
- `src/workerMenu.ts` — the "Hire Workers" full-screen menu (`createWorkerMenuMarkup`/
  `wireWorkerMenu`) listing every floor with an "Add new worker" button, plus
  `getWorkerCost`/`buyWorker` (the only way `floor.workerCount` should be mutated). A
  floor's next worker costs its floor price (`unlockCost`, or a fallback for floor 1
  since that's permanently free) times its current `workerCount`. `incomePanel.ts` uses
  `workerCount` to scale how much a boost divides the income interval by.
- `src/boostMenu.ts` — the "Boosts" full-screen menu (`createBoostMenuMarkup`/
  `wireBoostMenu`, reusing `workerMenu.ts`'s `.worker-menu` styling/shape so more boost
  options can be added to the same list later), plus `getBoostAllCost`/`buyBoostAll` —
  the only way every unlocked floor's rendered workers should get boosted at once. Costs
  15s of current (unboosted) income, i.e. `sum(incomeAmount / incomeIntervalSeconds)`
  across unlocked floors, times 15, spent via `totalIncome.ts`'s `spendTotalIncome`.
- `src/testButton.ts` — the "Add Money" / "Reset Game" dev/test controls: their markup,
  click wiring (`wireTestButton` grants a flat 100 trillion via `totalIncome.ts`'s
  `addTotalIncome`), the `addFloor` helper (build a floor, call `onAdd(floor)` — still
  used for the initial ground floor), and `wireResetButton` (clears saved floors/total
  income via `gameState.ts`/`totalIncome.ts` and reloads).
- `src/gameState.ts` — `saveFloors`/`loadFloors`/`clearFloors` (localStorage persistence of
  the `Floor[]` array). `main.ts` must call `saveFloors` after any action that mutates
  `floors`. Also the sole owner of `WorkerSlot` (`{ boosted }`, whether `coinFloat.ts`'s
  animation should play on a floor's worker) — tracked in its own
  `WeakMap<Floor, WorkerSlot[]>` since `Floor` itself doesn't carry it, same pattern
  `worker.ts` uses for its own ephemeral walk-animation state. Also owns `computeIdleIncome`
  (call once per page load): using real wall-clock time (not `performance.now()`, which
  resets every load) against the last-visit timestamp it stamps in localStorage, it sums
  what every unlocked floor would've earned at its own unboosted rate while the page was
  closed, returning 0 if that gap was under a second. `popup.ts` shows the result.
- `src/popup.ts` — the "Welcome back!" confirm dialog (`createPopupMarkup`/
  `showIdlePopup`), shown once on load only when `gameState.ts`'s `computeIdleIncome`
  returns more than $0. Clicking OK is the only place that idle income should be added
  to the total (via `totalIncome.ts`'s `addTotalIncome`) — the dialog itself never
  mutates game state, it just reports the number and fires the caller's callback.
- `src/utils.ts` — small shared helpers (`loadImage`, `randomInt`, `roundRect`,
  `drawCartoonPanel`, `drawCartoonText`, `drawGlossHighlight`), plus `formatPrice`
  (the only way any `$` amount should be formatted, e.g. `"$1.23M"`) and `formatTime`
  (the only way any duration/interval should be formatted, e.g. `"1.50h"`) — both
  always truncate to exactly 2 decimal places and compact with the same magnitude
  suffixes (K/M/B/T/...) once big enough, so numbers can never overflow into a raw
  unformatted string at large values. Add new cross-cutting helpers here rather than
  duplicating them.

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
- Owning top-level game state (e.g. the `floors` array, `hoveredFloor`, the
  `WeakMap<Floor, HTMLCanvasElement>` of mounted floor canvases).
- Mounting a floor: create its canvas (`width=FLOOR_W height=FLOOR_H`, never resized),
  wire its click/mousemove/mouseleave listeners in floor-local coordinates, and
  prepend/append it into `.game__floors` — prepend for a newly-added (higher) floor so
  it appears above everything else, append when restoring floors in topmost-first order.
- Driving the render loop by calling each module's `draw*(ctx, floor, ...)` function per
  floor canvas — it should not contain drawing logic, physics, or asset-loading logic
  itself. Only floors currently in or near the viewport (checked via
  `getBoundingClientRect`) are actually redrawn each frame.

When adding a new game element (a new UI widget, animation, or mechanic), create a new
`src/<elementName>.ts` file for it instead of adding it directly to `main.ts`. Export
only what other modules need (types, a loader, a `draw*` function, and any
hit-testing/interaction helpers); keep internal state (e.g. particle arrays,
animation-frame ids) private to that module.
