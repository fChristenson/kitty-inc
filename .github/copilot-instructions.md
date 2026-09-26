# Workspace instructions

These rules are always loaded before planning, editing, or validating any task.
Keep them in force regardless of the current file path.

## Kitty Inc architecture

A canvas-based idle/clicker game (Vite + TypeScript, no framework). Click workers on
each floor to earn money, buy upgrades/workers/boosts, unlock new floors up the
skyscraper, and collect badges — income keeps accruing while the tab is closed too.

### Module-first rule

All game logic should be added to its own folder under `src`. Each folder should have a single `index.ts` entry point, and all related code for that module should stay within that folder.
Files that grow bigger than a few hundred lines should be split into additional files within the same module folder, and imported into the module's `index.ts`.

### Sharing code

All code that is shared between game modules should be placed in its own dedicated folder under `src/shared/`. The same pattern of organization applies to each shared module folder. Game modules only import other modules from the shared folder.

### Code generalization

Animations and UI elements are to be created as general implementations and reused. Do not duplicate code across different modules. Any code that is not strictly tied to a specific game module should be made into a generalized implementation that can be used across multiple modules. Only duplicate similar logic if it is strictly necessary.

## Artwork prompt suggestions

The template for prompts used to AI-generate special crit artwork is:

"Flat vector cartoon of [SUBJECT], bold thick black outlines, cel-shaded flat colors with simple glossy highlights, vibrant saturated palette, clean sticker/game-icon style, centered composition, slight 3D depth but no gradients or textures, isolated on a plain solid white background, no shadows, no text."

The following keywords should be referenced in prompts. The content should replace the template's `[SUBJECT]`.

Every full prompt (template with `[SUBJECT]` filled in) must be at most 480 characters. The template itself is 296 characters, so each subject must be at most 184 characters. Count the finished prompt before suggesting it and shorten the subject if it runs over.

## Special crits

A "crit" is a random bonus on an upgrade click. There are two independent layers,
and they must not be confused:

1. **Tier** (`CritTier = "crit" | "mega" | "ultra"`, `src/shared/critTypes/index.ts`)
   — rolled rarest-first via `CRIT_TIER_ORDER`. Decides the free-upgrade count /
   sale multiplier / permanent rate multiplier (`CRIT_TIER_CONFIG[tier].multiplier`)
   and the button/flash color.
2. **Piggyback procs** ("special crits") — extra effects that can ride along on
   top of an already-landed tier. A proc never fires standalone and never changes
   the upgrade button's idle appearance; it is invisible until the armed crit is
   actually clicked, at which point it reveals itself only via the celebration
   flash (label swap + backdrop icon). The full, canonical list lives in
   `shared/critTypes`'s `CRIT_PROC_KINDS`/`CRIT_PROC_INFO` — read it there
   rather than trusting any list written down elsewhere.

All odds/multipliers live in `src/config.ts`'s `CONFIG.crit` (featured crits' values in the per-category `src/critBalance/` files it spreads in) — never hardcode a
chance or multiplier anywhere else.

### Every new special crit needs all three

Adding a brand new piggyback proc is not done until all three of the following are true:

1. Process and size-optimize its backdrop icon from raw art into a shipped, size-capped PNG. Never skip the 250x250 cap or `palette: true` quantization.
2. Wire it into the actual game: roll chance, reward application, celebration flash/icon, and dev test button.
3. Add it to the canonical `CRIT_PROC_INFO` metadata with icon, label, and a brief one-line description. A proc with no metadata is invisible to players.

### The one shared roll: `rollCrit`

`shared/critTypes/index.ts`'s `rollCrit(onLanded)` is the single entry point for rolling a crit. Both `rollCritUpgrade` and `rollFloorBuyCrit` go through it; never hand-roll a second tier/proc cascade elsewhere.

Roll order:

1. Walk `CRIT_TIER_ORDER` rarest-first. The first tier whose chance hits wins; a full miss calls `onLanded` zero times.
2. Once a tier lands, roll `SPECIAL_CRIT_GATEWAY_CHANCE` once. A miss means none of the procs get a chance to land.
3. On a gateway hit, roll every proc in `CRIT_PROC_KINDS` independently against its own chance.
4. Cap whichever landed to `MAX_SPECIAL_CRIT_PROCS` via `pickAtMost` (Fisher-Yates shuffle plus slice). Never bypass this cap.

Per-floor proc state stays in `critTypes`, with `isXCrit`, `forceXCritProc`, and `consumeCritProcs`; do not scatter piggyback-proc state across `upgradeButton.ts`.

### Reward application

Each proc's actual reward is applied where the crit is consumed, not inside `rollCrit` itself.

- Upgrade clicks and floor unlocks both call `applyFloorCrit(deps, floor, result)`. It owns base-tier free upgrades, one reroll, proc dispatch through exhaustive `CRIT_REWARDS`, bonus tier, and celebration. Keep purchase costs and unlocking outside this function.
- Map/building unlocks retain building-level effects in `main.ts`. Do not claim a floor-only proc works on the map without implementing its effect.
- **Chain:** `applyChainCrit` walks upward from `startIndex + 1`, with an unconditional first step and continuation chance thereafter. It is also used for building-unlock chaining.
- **Bounce:** `applyBounceCrit` walks downward from the triggering floor and does not start from the ground floor.
- **Explosion:** `applyExplosionCrit` reuses the upward chain and adds its own downward walk.
- **Boost:** `applyFloorBoost` reuses the existing `applyBoostAll`.
- **Booty:** flat one-shot `addTotalIncome(getTotalIncome())`.
- **Upgrade:** permanently promotes affected floors one tier through `nextCritTier`.
- **Peppermint:** applies the same promotion to every other unlocked floor across the building.
- **Heavenly:** unlocks every remaining floor, promotes every floor to the strongest tier, and grants each floor that tier's free-upgrade count once.

### Celebration and icon backdrop

`triggerCritCelebration` accepts a proc-flags object, not a growing list of positional booleans. Generic proc celebrations use `CRIT_PROC_INFO`. `screenShake/index.ts` derives `CRIT_ICON_BY_LABEL` from the same metadata and lazy-loads icons through `getCritIcon`.

Do not add a new preload variable, per-label draw block, or duplicated menu entry for each crit. Register metadata once. Preserve area-based icon sizing (`targetSize / sqrt(w*h)`) and existing explicit rotation exceptions; do not rotate new upright/directional artwork by default.

### Adding a brand new piggyback proc

Use the batch catalog pattern even when adding one proc. Legacy `X_CRIT_*` constants and force helpers remain for existing callers; do not multiply that boilerplate for a new batch.

1. Add `<kind>Chance` and all reward counts, multipliers, and durations to the matching `src/critBalance/<category>.ts` (same category name as its featured file; create it and spread it in `critBalance/index.ts` for a new category). Those files are spread into `CONFIG.crit`. `getCritProcChance(kind)` expects that naming convention. Pick odds from the bands below and compare neighboring rewards.
2. Add one `{ label, color, image, description, reward }` entry to the matching category file in `src/shared/critTypes/featured/<category>.ts` (create a new category file and spread it in `featured/index.ts` when none fits). `FEATURED_CRITS` is assembled from those files and is the single registry for a featured crit's metadata, icon and effect — `FeaturedCritDefinition` makes every field mandatory, and `featuredProcs.ts` fails the build if `<kind>Chance` is missing from `CONFIG.crit`. Do not create a parallel registry.
3. Write `reward` as `(context, { ...helpers }) => ...`, reusing the shared helpers from `featured/rewardHelpers.ts`. Extend the helper set only for a genuinely new operation.
4. Process the icon and set `image: "crits/<category>/<name>.png"` on the entry; `loadAssets` registers it in `IMAGE_FILES` under the crit's kind automatically, so do not add featured crits to `IMAGE_FILES` by hand. Metadata supplies generic flash, collection menu, and test button behavior.
5. Preserve one test button per proc plus Regular Crit in `hud/testButton/critTestActions.ts`, using shared event, tier, bonus-tier, and `forceTestCrit` controls. Never reintroduce separate Spawn, Floor, Map, Mega, or Ultra buttons for each proc.
6. Map testing must show only procs with actual map rewards. Update `MAP_CRIT_TEST_KINDS` only when map support is implemented, and keep the map bonus-tier selector disabled until such rewards exist.
7. Validate the changed behavior with focused checks. Do not recreate the removed regression scripts unless explicitly requested.

Never bypass `MAX_SPECIAL_CRIT_PROCS`'s cap-then-random-pick path.

Keep crit effects documented in their canonical `CRIT_PROC_INFO` descriptions,
consistent with the reward handlers. Do not create or update separate crit
reports, batch reports, or effect documentation unless explicitly requested.

### Processing a batch

1. Inventory supplied raw assets against the current registry and processing scripts. Account for every requested asset, including explicitly excluded ones.
2. Compare proposed rewards against `CRIT_PROC_INFO` descriptions and reward handlers. Assign unique names and distinct reward values or targets.
3. Sample actual background pixels and make a labeled, ordered contact sheet. Group only images suited to the same removal technique. Use dedicated `process-<image>.mjs` wrappers around `scripts/lib/process-crit-icon.mjs` when compatible.
4. Run wrappers. The shared processor removes border-connected background, drops tiny components, tight-crops, caps at 250x250, writes a quantized PNG, and copies it to `src/assets/processedCrits/<category>`. Preserve raw sources unless removal is requested.
5. Inspect every processed icon on a contrasting background. Verify enclosed light details, disconnected real pieces, outlines, feet, crop bounds, dimensions, alpha, indexed palette, and identical root/shipped copies.
6. Integrate and validate in small slices. Complete metadata, rewards, shipped icons, and generated test controls for every entry before calling the batch done. Do not change unrelated existing crit balance.

### Batch verification

- Use focused checks for the changed behavior and `npm run build`; do not run or recreate the removed regression scripts or add a new test dependency.
- Run `node scripts/check-crit-images.mjs` after adding or processing crit art: every crit image on disk must belong to a crit record and every record's icon, sticker and silhouette must exist. A raw source that is itself a PNG is named `<kind>.source.png` and read with `sourceExtension: ".source.png"` so the processed root copy can't overwrite it.
- Cover concrete reward amounts and targets, single-floor cases, tier caps, milestone boundaries, unchanged timers, proc arming/consuming, tier/gateway misses, shared cap, rarity ordering, and asset properties.
- Control random sequences for deterministic roll tests. Mutating `CONFIG` after module loading does not update legacy cached chance constants.
- `BigNumber.subtract` clamps negative results to zero. For signed test deltas on deliberately small balances, compare `toNumber(after) - toNumber(before)`; do not convert real late-game huge balances this way.
- In a disposable browser session or isolated fixtures, exercise both real upgrade-click and floor-unlock handlers with matching starting state and randomness. Include walker continuation, not only the first-step/failure case.
- Verify one generated button per proc, event and text filters together, supported map choices, selected tiers, clearing stale forced selections, icon loads, menu/celebration rendering, and desktop/mobile text fit. A build alone does not prove that an asset or reward is reachable in-game.

### Crit suggestion quality rules

Every crit name suggestion must have a fun, expressive, unique name grounded in the artwork or reward. Never use a numeric suffix, Roman numeral, version number, or near-duplicate name to distinguish a new entry. The internal camelCase kind, display label, icon basename, source asset, and processor should use the same distinct identity.

Every prompt list entry must name the crit before describing its artwork. Use a
unique player-facing display label and its matching camelCase asset name; never
add an unnamed description-only entry. Keep the display label, internal kind,
icon basename, raw source, processor and shipped PNG aligned. Check both this
instruction list and the implemented crit registry before reusing or slightly
renaming an existing crit.

Crit rewards must always be positive and provide instant gratification. Crits can share an effect when their names and values are distinct. Crit rewards should not be delayed or require special actions to be realized.

Before accepting a suggestion, compare it against the canonical `CRIT_PROC_INFO` descriptions and reward handlers. If it overlaps an existing proc, revise the target or effect until the distinction is explicit and useful.

### Odds must be proportional to the reward

`CONFIG.crit`'s chances are a deliberate ladder. Before adding or touching a chance, place the proc in one of these bands:

| Band     | Chance                       | Reward shape                                                                |
| -------- | ---------------------------- | --------------------------------------------------------------------------- |
| Minor    | `0.06`–`0.10` (hard cap 10%) | one trinket, one floor, one income tick, or a short timed boost             |
| Moderate | `0.02`–`0.05`                | building-wide but bounded upgrades, cost cut, or one-time income multiple   |
| Strong   | `0.005`–`0.015`              | permanent tier promotion, guaranteed future jackpot, or large refund/payout |
| Huge     | `0.001`–`0.003`              | reshapes the whole building                                                 |
| Rarest   | `0.0001`                     | heavenly only; nothing may be rarer                                         |

A family of procs must decrease monotonically with reward size. Do not copy the previous proc's chance without comparing the reward. Odds compound because a proc only rolls after a tier and the special gateway land, so a `0.10` value is nowhere near a 10% per-click chance.

### Processing a new crit's icon

Every special-crit backdrop icon is a raw `src/assets/crits/<category>/<name>.jfif` processed by a dedicated `scripts/crits/<category>/process-<name>.mjs` into `public/crits/<category>/<name>.png` (plus a root copy in `src/assets/crits/<category>/`). Never hand-edit a PNG directly or overwrite the raw source. The script must also copy the finished PNG into `src/assets/processedCrits/<category>/<name>.png`; the shared processors resolve these category folders from the featured entries' `image` paths (and `IMAGE_FILES` for legacy procs) via `scripts/lib/crit-asset-paths.mjs`.

Pick a chroma-key technique based on the raw art's actual background:

- Plain per-pixel whiteness threshold only when there is a clean gap and no enclosed near-white holes.
- Border-seeded flood fill plus whiteness threshold when enclosed light details must remain opaque.
- Global Euclidean distance from a sampled background color for a flat non-white background.
- Border-seeded flood fill with per-step color distance for a photographic or rendered scene with a lighting gradient; use a protected rectangle if needed.
- Always dump actual pixel values first with a throwaway `sharp().raw()` inspection rather than guessing thresholds from a preview.

Clean chroma-key noise carefully. Use `keepLargestOpaqueComponent` only when the real icon is one connected shape; preserve legitimate disconnected scene pieces and use a minimum-area floor where appropriate. If the chroma key ate a desired shadow, use `addDropShadow(croppedRgbaBuffer, w, h)` on the already-cropped icon.

Tight-crop to the bounding box after removing stray components, but do not cut legitimate tapered feet, tails, or tips. Resize to fit within 250x250 with `fit: "inside"` and `withoutEnlargement: true`, and always pass `palette: true` with `compressionLevel: 9` to the final `.png()` call. Verify root and shipped copies match, then set the crit entry's `image: "crits/<category>/<name>.png"`.

Register metadata rather than adding another draw call. The canonical proc entry's `icon` and `label` feed the generic renderer, lazy icon lookup, and Special Crits menu.
