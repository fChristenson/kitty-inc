---
description: "Create special crits individually or in batches: reward balance, shared registration, icon processing, event-specific test controls, and batch reports in docs/critTypes.md"
applyTo: "src/shared/critTypes/**,src/floors/upgradeButton/**,src/floors/floorInteractions/**,src/screenShake/**,src/loadAssets/**,src/hud/corporationBoostMenu/**,src/hud/testButton/**,scripts/process-*.mjs,scripts/lib/process-crit-icon.mjs,scripts/test-featured-crits.mjs,src/config.ts,docs/critTypes.md"
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
   flash (label swap + backdrop icon). The full, canonical list lives in
   `shared/critTypes`'s `CRIT_PROC_KINDS`/`CRIT_PROC_INFO` — read it there
   rather than trusting any list written down elsewhere.

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
3. **Add it to the canonical `CRIT_PROC_INFO` metadata** (directly or through
  the batch catalog described below). The Special Crits menu derives its
  `CRIT_INFO` array from this registry. Supply an icon + label + a brief, one-line
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
   means **none** of the procs get a chance to land, silently.
3. On a gateway hit, roll every proc in `CRIT_PROC_KINDS` independently against
   its own `X_CRIT_CHANCE`.
4. Cap whichever landed to `MAX_SPECIAL_CRIT_PROCS` via `pickAtMost`
  (Fisher-Yates shuffle + slice). Read the current cap from code; never change
  it or bypass it when adding a batch.

Per-floor proc state (`chainCrits`/`boostCrits`/`bounceCrits`/`explosionCrits`/
`bootyCrits`/`upgradeCrits`/`peppermintCrits`/`heavenlyCrits`, all
`WeakSet<Floor>`) also lives in `critTypes`, with
`isXCrit`/`forceXCritProc`/`consumeCritProcs` — this is intentional:
piggyback-proc state stays in one place instead of scattered across
`upgradeButton.ts`.

## Reward application (`floorInteractions/index.ts`, `main.ts`)

Each proc's actual reward is applied where the crit is _consumed_ (the click
handler), not inside `rollCrit` itself:

- Upgrade clicks and floor unlocks both call `applyFloorCrit(deps, floor,
  result)`. It owns the base tier's free upgrades, one reroll, proc dispatch
  through the exhaustive `CRIT_REWARDS` table, bonus tier, and celebration.
  Keep purchase costs and unlocking outside this function. Never restore
  separate click/unlock reward tables, substitute permanent promotions for
  free upgrades on unlock, or suppress a proc only on the unlock path.
- Map/building unlocks retain their own building-level effects in `main.ts`.
  Do not remove map support while consolidating floor behavior, and do not
  claim a floor-only proc works on the map without implementing its effect.
- **Chain**: `applyChainCrit(deps, startIndex, applyToFloor)` — walks upward
  floor-by-floor from `startIndex + 1`, unconditional first step, then rolls
  `CHAIN_CRIT_CONTINUE_CHANCE` per further step. Also used for building-unlock
  chaining in `main.ts`.
- **Bounce**: `applyBounceCrit` walks downward from the triggering floor,
  with its own continuation chance; it does not start from the ground floor.
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
  own free-upgrade count via the cheap `increaseIncomeRate` loop, with effects
  and rerolls once per floor, not once per simulated upgrade.

## Celebration + icon backdrop (`floorInteractions/critCelebration.ts`, `screenShake/index.ts`)

`triggerCritCelebration` accepts a proc-flags object, not a growing list of
positional booleans. Generic proc celebrations use the label/color from
`CRIT_PROC_INFO`. `screenShake/index.ts` derives `CRIT_ICON_BY_LABEL` from the
same metadata and lazy-loads icons through `getCritIcon` when needed.

Do not add a new preload variable, per-label draw block, or duplicated menu
entry for each crit. Register metadata once. Preserve area-based icon sizing
(`targetSize / sqrt(w*h)`) and existing explicit rotation exceptions; do not
rotate new upright/directional artwork by default.

## Adding a brand new piggyback proc

Use the batch catalog pattern for new entries, even when adding just one.
Legacy `X_CRIT_*` constants and per-proc force helpers remain for existing
callers; do not multiply that boilerplate for a new batch.

1. Add `<kind>Chance` and all reward counts/multipliers/durations to
  `CONFIG.crit`. `getCritProcChance(kind)` expects the `<kind>Chance` naming
  convention. Pick odds from the bands below and compare neighboring rewards.
2. Add `{ label, color, icon, description }` to `FEATURED_CRIT_INFO` in
  `src/shared/critTypes/featuredProcs.ts`, using an existing palette color
  where appropriate. `FeaturedCritKind` and `FEATURED_CRIT_KINDS` derive from
  this catalog. The existing integration merges it into `CritRollResult`,
  `CRIT_PROC_KINDS`, `CRIT_PROC_INFO`, `CRIT_PROC_SETS`, roll results, and
  upgrade arming. Check those connections; do not create a parallel registry.
3. Implement the effect in `createFeaturedCritRewards` in
  `src/floors/floorInteractions/featuredCritRewards.ts`, reusing the injected
  upgrade/payout/rate helpers. This table feeds `CRIT_REWARDS`, consumed by
  the same `applyFloorCrit` for upgrade clicks and floor unlocks. Extend the
  helper interface only for a genuinely new operation, not one callback per
  crit. Use cheap numerical loops for bulk upgrades, not repeated particles
  or crit rerolls inside those loops.
4. Process the icon and register its shipped PNG in `loadAssets/IMAGE_FILES`.
  Metadata supplies the generic flash, collection menu, and test button.
5. Preserve one test button per proc plus Regular Crit in
  `hud/testButton/critTestActions.ts`, using the existing `forceTestCrit` and
  shared Event/Tier/Bonus tier controls. Never reintroduce separate Spawn,
  Floor, Map, Mega, or Ultra buttons for every proc.
6. Map testing must show only procs with actual map rewards. If adding map
  support, implement and verify the building-level effect, then update
  `MAP_CRIT_TEST_KINDS`. Text search must respect this event filter; switching
  events must restore eligible buttons. Keep the map bonus-tier selector
  disabled until map bonus-tier rewards actually exist.
7. Extend the existing regression script and write the batch report below.

Never let `MAX_SPECIAL_CRIT_PROCS`'s cap-then-random-pick logic be bypassed for
a new proc — it must go through the same `landed` array + `pickAtMost` path.

## Processing a batch

Use `docs/critTypes.md`'s implemented batch as the report example and the
files above as the implementation example. Read their current contents;
names, balance, and the batch size can change after a rename or removal.

1. Inventory the supplied raw assets against the current registry and
   processing scripts. Do not assume every unprocessed image is new crit
   art, or add a second crit for an already-registered image. Account for
   every requested asset, including any explicitly excluded ones.
2. Compare proposed rewards against `CRIT_PROC_INFO`, their actual handlers,
   and the documentation. Assign unique names and distinct reward values or
   targets. A brainstorm entry is not proof of current game behavior.
3. Sample actual background pixels and make a labeled/ordered contact sheet
   of the raw batch. Group only images that genuinely suit the same removal
   technique. Use dedicated `process-<image>.mjs` wrappers around
   `scripts/lib/process-crit-icon.mjs` for compatible near-white-background
   artwork. Keep each wrapper reproducible; do not copy the entire processor
   into every file. Use a tailored processor for incompatible art rather than
   changing shared thresholds blindly and damaging other icons.
4. Run the wrappers. The shared processor removes border-connected background,
   drops tiny components, tight-crops, caps at 250x250, writes a quantized PNG,
   and automatically copies it to `themes/references/dist`. Preserve raw
   sources unless removal was explicitly requested.
5. Inspect every processed icon on a contrasting background, not just white.
   Verify enclosed light details, disconnected real pieces, outlines, feet,
   and crop bounds. Assert dimensions, alpha, indexed palette, and identical
   root/shipped copies. Record any image-specific treatment or limitation.
6. Integrate and validate in small slices. Complete metadata, actual rewards,
   shipped icons, and generated test controls for every entry before calling
   the batch done. Do not change unrelated existing crit balance.

## Batch report format

Maintain a section near the top of `docs/critTypes.md`, before brainstorm
ideas, titled `Implemented asset batch` (add a date/name when distinguishing
multiple batches). Reuse this document instead of scattering one report per
crit. Update existing rows after renames, reward changes, or removals.

Start with a short scope paragraph: which events are supported, whether
rewards are immediate, and whether existing crit balance changed. Explain
that proc chances are conditional on a tier and the special gateway landing,
before the shared cap; they are not per-click odds.

Use these exact table columns, one row per implemented crit:

| Image | Crit | Immediate reward | Proc chance | Comparison |
| --- | --- | --- | --- | --- |
| dinnerTime | Dinner Time | 5 payouts on every unlocked floor | 4% | Above Fast Forward's 4 payouts at 5% |

- **Image**: asset basename; distinguish it from the display name.
- **Crit**: exact current canonical label, including later renames.
- **Immediate reward**: concrete count/multiplier, target, and timing; distinguish
  an income cycle from seconds of income or a percentage of banked cash.
- **Proc chance**: current configured probability displayed as a percentage.
- **Comparison**: name the closest existing crit and state the useful difference
  in amount, target, or scope, with odds where relevant. Verify against code.

After the table, state scope and edge cases: current building vs company,
locked-floor exclusions, timer preservation/resets, maximum-tier behavior,
single-floor behavior, repeated-target stacking, and exact milestone boundaries.
Separate map-specific behavior explicitly; do not imply every crit is map-capable.

Finish with processing and verification notes: regeneration command, output
locations and optimization checks, test controls, commands run and their
results, browser checks performed, and any unverified requirements. The final
chat response should summarize the batch and link to this report rather than
repeat the whole table.

## Batch verification

- Extend `scripts/test-featured-crits.mjs`; run
  `node scripts/test-featured-crits.mjs` and `npm run build`. Reuse its Vite
  `ssrLoadModule` harness rather than adding a new test dependency per batch.
  Keep expected batch counts and reward assertions current.
- Cover concrete reward amounts/targets, single-floor cases, tier caps,
  milestone boundaries, unchanged timers where promised, proc arming/consuming,
  tier/gateway misses, the shared cap, rarity ordering, and asset properties.
- Control random sequences for deterministic roll tests. Mutating `CONFIG`
  after module loading does not update legacy cached chance constants.
- `BigNumber.subtract` clamps negative results to zero. For signed test deltas
  on deliberately small balances, compare `toNumber(after) - toNumber(before)`;
  do not convert real late-game huge balances this way.
- In a disposable browser session or isolated fixtures, exercise both real
  upgrade-click and floor-unlock handlers with matching starting state and
  randomness. Include walker continuation, not only the first-step/failure
  case. Verify identical rewards apart from the purchase/unlock itself.
- Verify one generated button per proc, event and text filters together,
  supported map choices, selected tiers, and clearing stale forced selections.
  Check icon loads, menu/celebration rendering, and desktop/mobile text fit.
  State explicitly when browser behavior was not verified; a build alone does
  not prove that an asset or reward is reachable in-game.

## Crit suggestion quality rules

Every crit name suggestion must have a fun unique name.
Crit rewards must always be positive and provide instant gratification.
Crits can have the same reward effect as long as the name is distinct and the values are different.
For example, a crit can upgrade a floor and another crit can do so but they both must have distinct values for the upgrade effect such as one with +1 and another with +2.

Crit rewards should not be delayed rewards or require any special actions to be realized; they must provide immediate benefit without prior knowledge of how they work for the user.

Before accepting a suggestion, compare it against the canonical
`CRIT_PROC_INFO` table and the current crit documentation. If it overlaps an
existing proc, revise the target or effect until the distinction is explicit
and useful.

## Odds must be proportional to the reward

`CONFIG.crit`'s chances are a single deliberate ladder, not per-proc guesses:
the bigger the swing a proc grants, the rarer it must be. Before adding or
touching a chance, place the proc in one of these bands and use a value from
it; if it doesn't fit cleanly, compare it against the existing procs in the
neighbouring bands rather than inventing a new magnitude.

| Band     | Chance                           | Reward shape                                                                                       | Examples                                                                                                        |
| -------- | -------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Minor    | `0.06`–`0.10` (**hard cap 10%**) | one trinket, one floor, or one tick of income; a short timed boost                                 | chair/supplies giveaway, intern, boost, frozen, tick tock, fire drill, supply run, espresso shot, chain, bounce |
| Moderate | `0.02`–`0.05`                    | building-wide but bounded — a fixed batch of free upgrades, a cost cut, a one-time income multiple | casual/fancy friday, round up, seasonal sales, clone army, golden handshake, payday, golden parachute, pair     |
| Strong   | `0.005`–`0.015`                  | permanent tier promotion, a guaranteed future jackpot, or a large refund/payout                    | upgrade, three/four of a kind, gold standard, golden ticket, second wind, executive order, payout, lucky clover |
| Huge     | `0.001`–`0.003`                  | reshapes the whole building at once                                                                | full house, peppermint, royal flush, grand opening                                                              |
| Rarest   | `0.0001`                         | **heavenly only** — nothing may be rarer                                                           | heavenly                                                                                                        |

Two rules that fall out of this and have both been violated before:

- **A family of procs must decrease monotonically with its own reward size.**
  The poker hands (pair → three → four → full house → royal flush) promote 2,
  3, 4, 5 and 6 floors, so their chances must strictly decrease in that order;
  they were inverted for a long time (four of a kind was 5× likelier than
  three of a kind) without anything catching it.
- **Don't copy the previous proc's chance.** Several procs were shipped at
  `0.0005` purely because that's what the one above them used, leaving a
  one-tick-of-income proc as rare as a whole-building unlock.

Remember the odds compound: a proc only rolls at all once a tier has landed
(`CRIT_TIER_CONFIG`) **and** `SPECIAL_CRIT_GATEWAY_CHANCE` has hit, so a `0.10`
band value is nowhere near a 10% chance per click.

## Processing a new crit's icon (raw art → shipped PNG)

Every special-crit backdrop icon is a raw `src/assets/<name>.jfif` processed by
a dedicated `scripts/process-<name>.mjs` into `src/assets/<name>.png` — never
hand-edit a PNG directly, and never overwrite the raw `.jfif` source. The
script must ALSO copy the finished PNG into
`src/assets/themes/references/dist/<name>.png`: `loadAssets`'s `IMAGE_FILES`
glob only reads that folder, so an icon written solely to `src/assets/` builds
fine and silently never ships.

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

**4. Tight-crop to the bounding box.** Remove stray components before scanning
alpha bounds. A real-run-of-opaque-pixels guard can help when noise remains,
but do not blindly require a wide run after component cleanup: it can cut off
legitimate tapered feet, tails, or tips. Verify the resulting silhouette.

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

**6. Register and verify both copies.** Add `<name>: "<name>.png"` to
`loadAssets/index.ts`'s `IMAGE_FILES`. `getImageUrl` reads from
`src/assets/themes/references/dist/<name>.png`, not the root asset copy.
The batch helper copies automatically; older standalone processors may still
require a manual copy after each run. Always verify the two outputs match.

**7. Register metadata, not another draw call.** The canonical proc entry's
`icon` and `label` feed `screenShake`'s lazy icon lookup and the Special Crits
menu automatically. Verify the rendered result; do not duplicate the renderer.
