---
description: How the crit-tier + piggyback-proc ("special crit") system works, and how to process/optimize a new crit's backdrop icon and register it in the Special Crits info menu
applyTo: "src/shared/critTypes/**,src/floors/upgradeButton/**,src/floors/floorInteractions/**,src/screenShake/**,src/loadAssets/**,src/hud/corporationBoostMenu/**,scripts/process-*.mjs,src/config.ts"
---

# Special crits

A "crit" is a random bonus on an upgrade click. There are two independent layers,
and they must not be confused:

1. **Tier** (`CritTier = "crit" | "mega" | "ultra"`, `src/shared/critTypes/index.ts`)
   — rolled rarest-first via `CRIT_TIER_ORDER`. Decides the free-upgrade count /
   sale multiplier / permanent rate multiplier (`CRIT_TIER_CONFIG[tier].multiplier`)
   and the button/flash color.
2. **Piggyback procs** ("special crits") — extra effects that can ride along on
   top of an already-landed tier. A proc never fires standalone and never changes
   the upgrade button's idle appearance; it's invisible until the armed crit is
   actually clicked, at which point it reveals itself only via the celebration
   flash (label swap + backdrop icon). Current procs: **Chain**, **Boost**,
   **Bounce**, **Explosion**, **Booty**, **Upgrade**, **Peppermint**, **Heavenly**.

All odds/multipliers live in `src/config.ts`'s `CONFIG.crit` — never hardcode a
chance or multiplier anywhere else.

## Every new special crit needs ALL three of these — never ship just one

Adding a brand new piggyback proc is not done until all three of the
following are true. These are independent, easy-to-forget pieces (icon
processing lives in `scripts/`, game wiring in `shared/critTypes`+`floors/`,
the menu entry in `hud/corporationBoostMenu`) — do not stop after just the
first one or two:

1. **Process + size-optimize its backdrop icon** from raw art into a shipped,
   size-capped PNG (see "Processing a new crit's icon" below) — never skip
   the 250×250 cap + `palette: true` quantization step, even for a quick
   prototype.
2. **Wire it into the actual game** — roll chance, reward application,
   celebration flash/icon, dev test button (see "Adding a brand new piggyback
   proc" below).
3. **Add it to the "Special Crits" info menu** (`hud/corporationBoostMenu/
index.ts`'s `CRIT_INFO` array) — an icon + label + a brief, one-line
   description (2 lines max, phrase-style like "Boosts every worker for
   free", not a full sentence) so players can look up what it does. A proc
   with no `CRIT_INFO` entry is invisible/undiscoverable to the player even
   though it can still land in-game — treat this as a required step, not an
   optional nicety.

## The one shared roll: `rollCrit`

`shared/critTypes/index.ts`'s `rollCrit(onLanded)` is the single entry point for
rolling a crit. Both call sites (`upgradeButton.ts`'s `rollCritUpgrade`, per-click,
and `rollFloorBuyCrit`, the one-shot floor/building-unlock roll) go through it —
never hand-roll a second tier/proc cascade elsewhere.

Roll order:

1. Walk `CRIT_TIER_ORDER` (rarest-first). First tier whose `chance` hits wins; a
   full miss calls `onLanded` zero times (silent, no null-check needed by callers).
2. Only once a tier lands: roll `SPECIAL_CRIT_GATEWAY_CHANCE` once. A miss here
   means **none** of the 8 procs get a chance to land, silently.
3. On a gateway hit, roll all 8 procs independently (`CHAIN_CRIT_CHANCE`,
   `BOOST_CRIT_CHANCE`, `BOUNCE_CRIT_CHANCE`, `EXPLOSION_CRIT_CHANCE`,
   `BOOTY_CRIT_CHANCE`, `UPGRADE_CRIT_CHANCE`, `PEPPERMINT_CRIT_CHANCE`,
   `HEAVENLY_CRIT_CHANCE`).
4. Cap whichever landed to at most `MAX_SPECIAL_CRIT_PROCS` (2) via `pickAtMost`
   (Fisher-Yates shuffle + slice) — a lucky roll can never stack more than 2 procs.

Per-floor proc state (`chainCrits`/`boostCrits`/`bounceCrits`/`explosionCrits`/
`bootyCrits`/`upgradeCrits`/`peppermintCrits`/`heavenlyCrits`, all
`WeakSet<Floor>`) also lives in `critTypes`, with
`isXCrit`/`forceXCritProc`/`consumeCritProcs` — this is intentional:
piggyback-proc state stays in one place instead of scattered across
`upgradeButton.ts`.

## Reward application (`floorInteractions/index.ts`, `main.ts`)

Each proc's actual reward is applied where the crit is _consumed_ (the click
handler), not inside `rollCrit` itself:

- **Chain**: `applyChainCrit(deps, startIndex, applyToFloor)` — walks upward
  floor-by-floor from `startIndex + 1`, unconditional first step, then rolls
  `CHAIN_CRIT_CONTINUE_CHANCE` per further step. Reused by Bounce (same walker,
  started at `-1` so its first step lands on the ground floor) and building-unlock
  chaining in `main.ts`.
- **Explosion**: `applyExplosionCrit` — reuses `applyChainCrit` for the upward
  half, adds its own simple downward walk (no unlock-handling needed downward,
  since floors below an unlocked one are always already unlocked).
- **Boost**: `applyFloorBoost` — reuses the existing `applyBoostAll` (never a
  hand-rolled single-floor version).
- **Booty**: flat one-shot `addTotalIncome(getTotalIncome())` (doubles current
  income once).
- **Upgrade**: `floor.critMultiplierTier = nextCritTier(floor.critMultiplierTier)`
  — permanently promotes the floor(s) one tier step, via `nextCritTier`.
- **Peppermint**: same `nextCritTier` promotion as Upgrade, but applied to
  every OTHER unlocked floor across the whole building at once (stride-by-2
  over the building's `floors` array) instead of just the one floor.
- **Heavenly**: the biggest reward of all — unlocks every remaining floor in
  the building for free (`unlockAllFloors`), promotes EVERY floor to the
  strongest tier (`CRIT_TIER_ORDER[0]`), then grants each floor that tier's
  own free-upgrade count via `applyUpgradeTick`, same as a real crit of that
  tier landing on each floor individually.

## Celebration + icon backdrop (`floorInteractions/critCelebration.ts`, `screenShake/index.ts`)

`triggerCritCelebration(floor, tier, ..., chain, boost, bounce, explosion, booty,
upgrade, peppermint, heavenly)` swaps the flash's label from the tier's plain
`"x5"/"x25"/"x125"` to the proc's own label (`CHAIN_CRIT_LABEL` etc.) and calls
`triggerScreenShake`.

`screenShake.ts`'s `drawCritFlash` draws each proc's backdrop icon behind the
flash text, gated purely on `flashLabel === "<ProcLabel>"` (e.g. `"Chain"`,
`"Boost"`, `"Bounce"`, `"Boom"`, `"Booty"`, `"Upgrade"`, `"Peppermint"`,
`"Heavenly"`) — this string match is the one and only signal used, don't add
a separate boolean option for it. Every icon is preloaded once at module-eval
time via `loadImageByName("<name>")` into a `loadImageByName("<name>")` into a
module-level `let xIcon: HTMLImageElement | null` (fire-and-forget; the draw just
no-ops if still null) and sized with `fitIconSize(icon, measuredWidth * 0.85)`
— **always match by bounding-box AREA** (`targetSize / sqrt(w*h)`), never by a
single fixed dimension, or icons with different aspect ratios read as
different sizes on screen. Only rotate an icon an extra fixed amount if it's a
symmetric, non-directional shape (chain's infinity-link icon is rotated 45°) —
never rotate a directional sprite (mouse) or an already-upright icon (arrow,
chest, starburst).

## Adding a brand new piggyback proc

1. `config.ts`: add its `xChance` (and `xContinueChance` if it's a "walk a tier
   reward across floors" shape like chain/bounce/explosion) under `CONFIG.crit`.
2. `shared/critTypes/index.ts`: add `X_CRIT_CHANCE`/`X_CRIT_COLOR`/`X_CRIT_LABEL`
   exports, a `xCrits` WeakSet, `isXCrit`/`forceXCritProc`, add it to
   `consumeCritProcs`, add its field to `CritRollResult`, and add its roll line
   to `rollCrit`'s gateway block.
3. `upgradeButton.ts`: re-export the new pieces, add `forceXCritUpgrade(floor,
tier?)` dev helper, thread the flag through `rollCritUpgrade`/
   `rollFloorBuyCrit`/`forceFloorBuyCrit` same as the existing ones — and add
   its export to `floors/index.ts`'s facade re-export list (easy to miss; a
   missing facade export won't show up in `get_errors`/tsserver, only a real
   `npm run build` catches it).
4. `floorInteractions/index.ts` (+ `critCelebration.ts`): apply the actual reward
   at consumption time, add the `x` param to `triggerCritCelebration`.
5. Process + register a backdrop icon (see below) and gate its draw in
   `screenShake.ts` on the new label string.
6. `hud/testButton`: add a "Spawn X Crit" dev button calling `forceXCritUpgrade`
   (+ re-export the new wiring function through `hud/index.ts`'s facade).
7. **`hud/corporationBoostMenu/index.ts`'s `CRIT_INFO` array**: add `{ icon:
getImageUrl("<name>"), label: "<Label>", description: "<brief phrase>" }` —
   this is what makes the new proc show up (icon + name + expandable
   description) in the player-facing "Special Crits" info dialog. Keep the
   description short (2 lines max, phrase-style — "Boosts every worker for
   free", not a full sentence); see the existing 8 entries for tone.

Never let `MAX_SPECIAL_CRIT_PROCS`'s cap-then-random-pick logic be bypassed for
a new proc — it must go through the same `landed` array + `pickAtMost` path.

## Processing a new crit's icon (raw art → shipped PNG)

Every special-crit backdrop icon is a raw `src/assets/<name>.jfif` processed by
a dedicated `scripts/process-<name>.mjs` into `src/assets/<name>.png` — never
hand-edit a PNG directly, and never overwrite the raw `.jfif` source.

**1. Pick a chroma-key technique based on the raw art's own background**, in
this order of preference:

- **Plain per-pixel whiteness threshold** (`WHITE_LO`/`WHITE_HI`, no flood
  fill) — only safe when there's a clean whiteness gap between content and
  background AND the icon has no enclosed near-white holes that must stay
  opaque (a chain link's inner hexagon, e.g., needs a different technique).
- **Border-seeded flood fill + whiteness threshold** (`process-shield.mjs`/
  `process-clock.mjs`/`process-ball.mjs`/`process-upgrade.mjs` pattern) — seed a
  BFS from every border pixel, only admit a neighbor whose whiteness is above
  `FLOOD_LO`; this is what correctly leaves an enclosed lighter detail (a white
  "+", an enclosed panel) opaque while still clearing the real background,
  since the fill can never reach it without crossing a darker outline first.
- **Global Euclidean-distance-from-a-sampled-background-color** (`process-
explosion.mjs`/`process-booty.mjs` pattern, `BG_COLOR`/`DIST_LO`/`DIST_HI`) —
  for a background that's a solid flat NON-white color (sample it directly with
  a throwaway pixel-dump script first, don't guess).
- **Border-seeded flood fill with PER-STEP (not fixed-reference) color
  distance** (`process-elevator.mjs`'s `CHAIN_TOLERANCE` pattern) — for a
  background that's a real photographic/rendered scene with its own lighting
  gradient (not flat, not white); add a hardcoded `PROTECTED_RECT` exclusion
  zone if a smooth color path could otherwise let the fill leak into content
  that shares a similar palette.
- Whichever technique, **always verify empirically first**: dump actual pixel
  values (a throwaway `sharp().raw()` sampling script, see the pattern used to
  inspect `pepperMint.jfif`'s background/dot colors) rather than guessing
  thresholds from a downscaled preview — anti-aliased edges and small preview
  scaling both hide the real pixel values.

**2. Clean up chroma-key noise.** A soft-edged drop shadow or JFIF compression
noise near the former background often survives a whiteness fade as a faint,
disconnected fleck or ghost halo. If the icon's real content is a single
connected shape, run `keepLargestOpaqueComponent` (`scripts/lib/
keep-largest-component.mjs`) after the fade to discard every other opaque blob.
Do **not** use this on a genuinely multi-part scene where separate disconnected
pieces are all real content (e.g. `process-elevator.mjs`'s cab, whose door
leaves/frame/handrail legitimately split apart along their own seams — that
script instead drops components under a `MIN_KEEP_AREA` pixel-count floor).

**3. Re-synthesize a drop shadow if the chroma-key ate the original one.** A
whiteness threshold that fully clears a near-white background necessarily also
clips away most of a soft drop shadow cast on that same background (its edge
blends toward background-whiteness well before reaching true background). If
the icon should keep a shadow, use `scripts/lib/synthetic-drop-shadow.mjs`'s
`addDropShadow(croppedRgbaBuffer, w, h)` on the ALREADY cropped, chroma-keyed
icon — it blurs the icon's own alpha silhouette, offsets it down-right, tints
it black/translucent, and composites it underneath on a padded canvas.

**4. Tight-crop to the bounding box.** Use a real-run-of-opaque-pixels scan
(`MIN_OPAQUE_RUN`, e.g. 20px), not "first pixel above the alpha cutoff" — a
single stray noise pixel otherwise silently inflates the crop box (this exact
bug previously inflated a whole sprite sheet's cell height, see repo memory).

**5. Size-optimize before writing the final PNG** — every special-crit icon is
only ever drawn as a small flash-text backdrop, never full-screen, so:

- Resize to fit within **250×250** (`fit: "inside", withoutEnlargement: true`)
  — this specific cap was chosen after 3 AI-rendered icons shipped at 400×400
  measured 170-300KB each; shrinking the cap to 250 cut them to 25-34KB with no
  visible quality loss at actual on-screen size. Don't ship a new crit icon
  larger than this without a concrete reason.
- Always pass **`palette: true`** to the final `.png()` call alongside
  `compressionLevel: 9` — sharp's libimagequant-backed adaptive color
  quantization, keeps the alpha channel, no visible loss at this size. Plain
  `compressionLevel: 9` alone is nowhere near enough for full-color/AI-rendered
  source art (as opposed to a simple flat vector-style icon).

**6. Register and double-copy.** Add `<name>: "<name>.png"` to `loadAssets/
index.ts`'s `IMAGE_FILES` (with a one-line comment saying which crit flash it
backs), then manually copy the output into `src/assets/themes/references/dist/
<name>.png` too — `getImageUrl` reads from that `dist/` copy, NOT from
`src/assets/<name>.png` directly, and nothing auto-copies between the two.
Re-copy by hand any time the script is re-run.

**7. Wire the draw call.** In `screenShake.ts`: preload via `loadImageByName`
into a new module-level icon variable, add a `flashLabel === "<Label>" &&
xIcon` block using `fitIconSize`, matching the pattern of the existing 8 icons.
