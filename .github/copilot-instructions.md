# Workspace instructions

Kitty Inc: a canvas idle/clicker game (Vite + TypeScript, no framework).

## Code rules

- One folder per module under `src/` with one `index.ts`; split files past a few hundred lines inside it.
- Shared code goes in `src/shared/<name>/`; modules import each other only through `shared/`. Build general, reusable code; never duplicate logic.
- Crit code lives in `src/crits/`: `critTypes` (tiers, procs, rolling), `critFlash` (flash and text; the shake is `shared/screenShake`), `floorCrits` (tier crits, floor/building rewards, and floor crits: one lazy module per kind in `floorCrits/crits/<kind>`, played by `floorCrits/critPlayer`), `badgeCrits` (featured crits, badges, foils, capsule), `animatedCrits` (events and their stages). Outside `src/crits`, import only from its `index.ts`, except the pure-data `crits/config.ts` (spread into `CONFIG`); `crits/critIcons.ts` registers its icons with loadAssets when the crits load (loadAssets only imports its type, so the boot stays small). Inside, files import each other directly.
- Startup: `src/boot.ts` is the page's entry (a few KB): it starts the first screen's downloads (`loadAssets` `preloadFirstScreen`), then imports `main.ts`. Keep `boot`, `loadAssets` and `utils` free of game and crit imports; anything the first frame doesn't draw loads after it (`afterStartup`, `prepareSoon`, `loadWhenIdle`). Measure startup on the perf build (`npm run perf:build`, `npx vite preview --mode perf`): the rig reports `game:*` marks (boot, main, assets, first-frame, settled).
- Crit odds and amounts live only in `CONFIG.crit` (`src/crits/config.ts`; featured values in `src/crits/badgeCrits/balance/<category>.ts`).
- Every orb, wisp or travelling light is `shared/wisp`'s wisp: `drawWisp(ctx, at, ms, now, size, heat?)` with `at(ms)` its path (a fixed point to hover), or `drawWispTrail` + `drawWispHead` for its own transform. Never hand-draw an orb, glow ball or light trail.

## Look and feel

- **Cluster blasts are the reference.** The Volcano and Meteor Shower floor crits (`floorCrits/crits/volcanoCrit`, `meteorShowerCrit`) set the feel for every special effect: rapid explosions in a cluster sequence. Many hits land quick-fire (about 45–50ms apart) all over the targets, each a `drawDetonation` with its own small shake, so blasts and shakes roll on without a gap, capped by one huge blast with the hardest shake. A rattling barrage of impacts beats one slow hit; stack the biggest blasts at the climax.
- **Fast and dramatic.** Everything hits hard and quick, building to impacts with `shakeScreen`, blasts, slams and sound. Nothing slow, gentle or drawn out.
- **White and gold.** Effects are wisps, coins, beams, bolts, bursts and glitter in the game's white and gold: no new effect colours and no drawn props (the screen-game looks below are the only exceptions).
- **Never spin the view** (shake, slide and zoom only) and **never build on text** (a short callout is garnish; there's no time to read).

## New images to crits

Work in progress lives in the gitignored `tmp/`; only `--apply` writes to `public/` and `src/`. Look at one sheet per step, never at each image, and don't build tools to replace looking.

1. **Intake.** Raws (jfif/jpg/jpeg/webp/png) arrive in the root or `tmp/`. `node scripts/crit-intake.mjs` puts them on `tmp/_sheets/intake.png`.
2. **Name.** Fill `category` and `name` for every entry of `tmp/_intake.json` in one edit (reuse a `public/crits/<category>/` or add a camelCase one to its main category in `src/crits/badgeCrits/critData/groups.ts`; the build fails until it's in one), then `node scripts/crit-intake.mjs --move` (raws to `tmp/<category>/<kind>.<ext>`).
3. **Scan.** `node scripts/new-crits.mjs --scan` builds `tmp/_new-crits.json` (labels from file names; safe to re-run, edits are kept). Fix "already used" names by renaming the raw; tell the user about byte-identical `skip` duplicates and leave them.
4. **Preview.** `node scripts/new-crits.mjs` puts every cut-out on magenta onto `tmp/_sheets/processed.png`. Re-check each name against its art; rename the raw and re-scan if it doesn't fit.
5. **Fix poor cuts** (white patches inside the art, erased light art, art cut at the frame edge, specks): `node scripts/new-crits.mjs --custom <kind> ...` makes `tmp/<category>/process-<kind>.mjs`; tweak it and re-preview until clean.
6. **Apply.** `node scripts/new-crits.mjs --apply` writes icons, stickers, silhouettes, featured entries and balance lines, upscales cuts under about 640×640 area with Real-ESRGAN (`tmp/_esrgan/`), and moves each raw and its script to `tmp/crits/<category>/`. **Never delete a raw**, by script or by hand, unless the user says so.
7. **Verify.** `npm run build`, then check a few in the game.

Cut-out fixes (`cutOutCritIcon`, `scripts/lib/crit-cutout.mjs`):

| Problem                                           | Fix                                                                                                                        |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| White gap enclosed by the art                     | `backgroundSeeds: [[x, y]]` in the gap, only if it's really background (white hair, clothes and teeth look the same)       |
| Art off the frame edge gets eaten                 | `protectedRects` over that edge **and** `dropWhiteHalo: false`                                                             |
| Near-white art erased (chrome, white hair, gloss) | key only the backdrop (`backgroundColor: [252,252,252]`, `backgroundColorTolerance: 6`), then feather light pixels near it |
| Tinted or dark backdrop                           | `backgroundColor` + tolerance, or `darkBackgroundThreshold`                                                                |
| Frame or letterbox                                | `sourceRect`                                                                                                               |
| Debris / specks                                   | `keepLargestComponent` or `dropEdgeComponents`                                                                             |

Shipped icons:

- `node scripts/upscale-crits.mjs [kind ...]` upscales icons under about 640×640 (originals to `tmp/_upscale/backup/`, sheet `tmp/_sheets/upscaled.png`); prefer re-cutting from a raw in `tmp/crits/<category>/` when there is one. `npm run build` rebuilds changed stickers and silhouettes (`scripts/sticker-sources.json`).
- `node scripts/crit-overview.mjs [category ...]` sheets icons with labels (`tmp/_sheets/overview-<category>*.png`); `node scripts/crit-residue.mjs [category ...]` paints residue round the art green (`tmp/_sheets/residue.png`) to re-cut.
- Template ids to pin `template` / `group` / `tier` in the spec are in `scripts/lib/crit-templates.mjs`; pin only when the auto plan fits poorly.

## Event rules

**The goal.** The game is a slot machine: every crit and event is a pull of the lever. Each event is a surprise that's a thrill to watch from the first frame to the payoff, and only ever beneficial: no losses, waiting, downsides or player input. The crazier the better, but never at the cost of performance: a laggy event is worse than a boring one. Events live in `src/crits/animatedCrits/events/*Event` and must all be distinct.

**Rewards.** Vary them so the player never knows what's coming: cash, free levels (`upgradeFloorFree`), crit tiers on floors, perma tiers on workers (`promoteWorkerPermaTier`), hires (`recruitWorker`), unlocks (`unlockFloorFree`), or a mix. The reward lands on screen on the hit that gives it (a bar jolting with `+N Lvl`, a worker lighting up, a floor unlocking); finish on what got rewarded, and keep total-readout finales for cash events. On `wispCover`: targets from `crits/animatedCrits/eventRewards` (`findRewardBars`, `findRewardWorkers`, `levelsFor`) into `startWispCover({ bars, workers })`, landed with `cover.levels` / `tierUp` / `promote` and finished with `cover.slam(bar)`; hires via `findRewardHires` + `giveHire` (drawn by `drawRewardHires` in `drawOver`); a free floor via `findRewardLocked`, then `context.unlockFloorFree` from `onEnd`. `rewardMultiplier: 0` pays no cash and skips the total finale; a cash event ending elsewhere sets `endOnTotal: false`. Gate on targets with `canArm`.

### Looks

Every new event is built on one of eighteen looks, any of which can pay any reward; each batch gets events of every look.

| Look          | What it is                                                                                                                 | Built on                                                            |
| ------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **Money**     | Cash as a liquid: rivers, jets, pools and geysers of hundreds to thousands of coins, never a few dozen in a shape.         | `animatedCrits/cashFlow` (`pourLine`), `cover.flow` / `trace`       |
| **Wisp**      | Wisps flying, chasing, orbiting and colliding; coins only as bursts.                                                       | `animatedCrits/wispCover`                                           |
| **Mix**       | A wisp leading, feeding, drinking or firing a river of cash.                                                               | `cashFlow` (`riverHead`) + `wispCover`                              |
| **Beam**      | Beams that aim, sweep, scan, cut and lock on (Scanner, Orbital Strike).                                                    | `shared/beam`                                                       |
| **Lightning** | Jagged forking bolts striking in a blink, arcing and chaining (Chain Lightning); every strike a flash, a crack and a jolt. | `shared/lightning`                                                  |
| **Explosion** | Lit bomb wisps fizzing down their fuses, then big, chain and cluster blasts (Fuse, Supernova, Chain Reaction).             | `shared/explosion`                                                  |
| **Gunfire**   | Wisp bullets: spirals, rings and fans, bursts with muzzle flashes, volleys, crossfire (Bullet Hell, Gatling).              | `shared/bullets`                                                    |
| **Bounce**    | Wisps ricocheting off the screen's edges, banking off bars and workers, hopping, drop-bouncing (Screensaver, Superball).   | `shared/bounce`                                                     |
| **Drill**     | A drill head grinding into an actor, sparks gushing, punching through onto the reward (Breakthrough).                      | `shared/drill`                                                      |
| **Spray**     | A nozzle wisp hissing gold mist that sweeps and coats its target until it flashes (Airbrush).                              | `shared/spray`                                                      |
| **Race**      | Wisps racing like racecars round things on screen, a chaser on the leader's tail (Curves).                                 | `shared/race` (`planRace`)                                          |
| **Clutter**   | A mess over the whole screen cleaned into one neat heap by a broom, plough, gravity hole or invisible force (Clutter).     | `shared/clutter`                                                    |
| **Galaxy**    | Hundreds of glitter stars orbiting a core on a tilted disk, clumping, swallowed, slung off onto the reward (Accretion).    | `shared/galaxy`                                                     |
| **Drawing**   | A big picture appearing out of hundreds of dots, then blazing onto the reward (Bullet Mosaic).                             | `shared/drawing`                                                    |
| **Flight**    | First-person flight out of the floors through the sky and a crash-landing back (Lightspeed, Starfighter, Freefall).        | `animatedCrits/flightStage`                                         |
| **FPS**       | An old first-person shooter scene: in through the floors, a quick showdown, out a door or hole (Doom, High Noon).          | `shared/fps` on the flight stage                                    |
| **Road race** | A street race behind a small ship: weaving through coins, round a bend, through the finish gate's window (Road Race).      | `shared/race` (street) in `shared/fps`'s world, on the flight stage |
| **Shmup**     | A bullet-hell shooter from above: waves of wisp enemies, a boss, a streaming starfield (Sky Raid).                         | `shared/shmup` + `shared/bullets`, on the flight stage              |

FPS, Road race and Shmup draw their worlds and ships in palette colours (`shared/fps`, `shared/race`, `shared/shmup`); their shots, blasts and glows stay wisps and bursts. Elsewhere a bomb is a wisp over `drawLitFuse`, a bullet a wisp, a gun just a muzzle flash, a drill `drawDrill`'s glitter cone, a spray `drawSpray`'s mist, a broom `drawBroom`, a gravity hole `drawGravityHole`, a star a glitter from `drawStars`, a picture dots from `drawDots`; never drawn.

### Per-look rules

- **Explosion** (Chain Reaction): every event combines big blasts (large `drawDetonation`s, never pops), chain blasts (each setting off the next with its own shake) and cluster blasts (one bursting into several). A shake and a bang on the frame each lands; pile the biggest at each climax.
- **Drill** (Breakthrough): a bit grinding through metal, heavy and slow. It stalls on the bite for a few hundred ms with rumbling shakes, then bores in about 8 shoves over 1.5s+, each a jolt; the head judders (a few px `ctx.translate` jitter, hardest in the stall); `drawDrillSpray` gushes hundreds of sparks out both sides the whole time it bites, building past 1 as it bores and fading about 300ms after it's through. Never thin the spray.
- **Race** (Curves): `planRace(line, raceMs, corners)`, never constant speed: flat out on straights, braking hard over each straight's last third, about 0.3 speed in tight hairpins round real things on screen, accelerating out, finishing above top speed. A chaser about 120ms behind. Corners get only a screech and jolts; save the blasts for the finish (leader big, chaser huge).
- **Clutter** (Clutter): hundreds of bits over the whole screen, evenly or in a pattern (vary it); one cleaner the eye can follow, varied between events (broom, one or two ploughing wisps, gravity hole, invisible force), never a swarm of small wisps. Bits move only when the cleaner reaches them, with friction (`simulateSweep` / `simulateClean` at arm), in brisk passes (each a swoosh and a jolt) into lines, then a heap that settles with a jolt and lands on the reward.
- **Galaxy** (Accretion): hundreds of stars (`scatterDisk` / `scatterArms`) on a tilted disk, varied between events; everything keeps to `disk.at` (Kepler) and changes orbit with `disk.drift`, never jumps. Beats come from the orbits (clumping, swallowing, slingshots, collisions), quickening; the payoff flings wisps off along `disk.heading` onto the reward. The stars turn, the view never does.
- **Drawing** (Bullet Mosaic): a big, instantly readable picture from `SHAPES` (outline or fill, varied; add new ones as unit-box loops; never letters or numbers) out of hundreds of dots that each move to their spot (bullets, a pen wisp, flying wisps, sprayed or rained glitter), faster and faster, each burst a click and a jolt; once complete it blazes (`drawDots` `blaze`) with a shake and lands on the reward.
- **Flight** (Lightspeed): always `startFlightStage` (it freezes, dives, flies the sky and speed lines, brings the floors back and crash-lands; never rebuild these). Leave by the default dive or a `FlightEntrance` drawing the frozen floors, camera readable. Everything flown past lives in depth (`project(view, x, y, z)`, sized by 1/z), few and bold, each meeting a pop or jolt. Land on the reward: cash as things are picked up (`spotlightTotal`), the rest from `onEnd`. About 3–4s.
- **FPS** (Doom): scenes from `shared/fps` quads drawn far to near, never hand-projected; solid, detailed walls with depth and trim; in through the floors' screen (doors, a shutter, a portal) with a head bob; three or so bold enemies, each fight a beat (wind up, `drawFpsGun` fires, a flash, `drawDetonation`, bang and shake, the last biggest); out through a door (`ownLanding`) or a hole (`flightStage/hole`). About 4–5s.
- **Road race** (Road Race): the street from `shared/race` on `shared/fps`, bent with `roadBend`; the floors zoom away straight into a race already flat out (no grid); the camera rides behind the ship, faster and faster, round a bend to the straight; coins vanish when taken (no pop left behind); out through the finish gate's window (`ownLanding`). About 5s.
- **Shmup** (Sky Raid): `shared/shmup` on the flight stage, the floors shrinking away below on the way in and the stage's own landing. Waves that build (small, bigger, a boss) firing fans, rings and spirals, dozens of bullets at the climax; the ship weaves on its own, never hit, its twin guns on the next enemy to fall; every kill a sized blast, bang and shake (`createBeats`), the boss in a chain or cluster. About 5s.

**Experiments.** Each batch also gets a few events breaking from the looks (say which): simulations, puzzles, algorithms, little games playing themselves out, not more warps of the frozen screen.

**Test buttons.** A new batch's buttons go in the **New Events** dropdown at the top of `hud/testButton/critTestActions.ts`; move them into **Events** once the user has tested them.

### Rules for every event

- **Never confusable.** Swapping only the prop or colour of an existing sequence is not a new event. Give each its own motion, layout and beats; compare the plan against existing events first.
- **Share code, not looks.** Reuse the shared plumbing (streams, wisp, freeze, spotlights), never copy it, but every sequence the player sees is unique.
- **Fast.** About 1.5–2.5s, longer only for the flight-stage looks.

### Event drawing libs

Draw with these so events run smoothly on phones; never rebuild them inside an event. Each module's header documents its API.

| Need                               | Use                                                                                                                                                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A wisp or coin event's whole stage | `animatedCrits/wispCover`: `registerWispEvent`, `startWispCover` (`burst`, `blast`, `total()`, `trace(paths, travelMs)` for dancing coins, one fresh point per call); test button via `wireEventTestButtons` in `main.ts` |
| Curves, easing                     | `shared/curves` (`bezier`, `alongRoute`, `catmull`); `shared/easing` (`lerp([a, b], t)`, `clamp01`, `smoothstep` (doesn't clamp), `easeIn`/`easeOut`/`easeOutCubic`/`easeOutBack`)                                        |
| Coin landing spots                 | `shared/coinTargets` (`ringTargets`, `sprayTargets`)                                                                                                                                                                      |
| Beats on the frame they land       | `shared/eventBeats`: `createBeats(items, dueAt, fire)`, `tick(ms, now)` each frame                                                                                                                                        |
| Gold props                         | `shared/glowShape`: `createGlowSprite` at arm, `drawGlowSprite`                                                                                                                                                           |
| Soft glows, flashes                | `shared/glowSprite`: `drawGlow` with stops hoisted to a constant                                                                                                                                                          |
| Beams                              | `shared/beam`: `drawBeam(ctx, from, to, width, alpha)`, `drawAimLaser`, `drawBeamFlare`                                                                                                                                   |
| Lightning                          | `shared/lightning`: `createBolt` at arm, `drawBolt`, `drawStrike`                                                                                                                                                         |
| Explosions, bombs                  | `shared/explosion`: `drawDetonation(ctx, at, msSince, size, now)`, `drawLitFuse`; bangs from `shared/explosionBang` (sound + buzz together, never the sound alone)                                                        |
| Bounces                            | `shared/bounce`: `ricochet`, `ricochetThrough`, `hops`, `dropBounce` (each with `at(ms)` and `bounces` for beats), `drawBounceSplash`                                                                                     |
| Drills                             | `shared/drill`: `planDrill`, `drawDrill`; `planGrind` + `drawGrind` for a stalling bite; `drawDrillSpray`                                                                                                                 |
| Sprays                             | `shared/spray`: `planSpray`, `sweepAim`, `drawSpray`, `drawSprayMist`, `drawSprayCoat`                                                                                                                                    |
| Bullets                            | `shared/bullets`: `fireBullet`, `aimBullet`, `bulletRing` / `bulletFan` / `bulletSpiral` (each with `hitAt`), `drawBullets`, `drawMuzzleFlash`                                                                            |
| Racing                             | `shared/race`: `planRace(line, raceMs, corners)` (`at`, `msAt`)                                                                                                                                                           |
| Clutter                            | `shared/clutter`: `scatter*` patterns, broom (`sweepLane`, `planSweep`, `simulateSweep`, `drawBroom`), other cleaners (`simulateClean` with plough / hole / force, `drawGravityHole`), `heapSpots`                        |
| Galaxies                           | `shared/galaxy`: `planDisk`, `scatterDisk` / `scatterArms`, `disk.at` / `drift` / `heading`, `drawStars`                                                                                                                  |
| Pictures out of dots               | `shared/drawing`: `SHAPES`, `shapeOutline` / `shapeFill`, `penOrder`, `drawDots`                                                                                                                                          |
| Flight stage                       | `animatedCrits/flightStage`: `startFlightStage(key, floor, context, { flyMs, draw, onEnd, enter?, ownLanding? }, { spotlightTotal? })` returns a `FlightBeat`; `project(view, x, y, z)`; timings in `CONFIG.flightStage`  |
| First-person world                 | `shared/fps`: `Fps { view, lens, cam, bend? }`, `fpsSight`, `drawFpsGround` / `Sky` / `Wall` / `Face` / `Flat`, `drawFpsEnemy`, `drawFpsHead`, `drawFpsGun`                                                               |
| Street race                        | `shared/race`: `drawRoadStreet`, `roadBend`, `drawFinishGate`, `drawRaceShip`                                                                                                                                             |
| Shmup                              | `shared/shmup`: `drawStarfield`, `drawShmupShip`, `drawShipFlames`, `shmupEnemy`, `enemySpot`, `planShipGuns`, `shotHeat`                                                                                                 |
| Shattering, screen pieces          | `shared/shatter` (`createPane`, `drawCracks`, `drawShards`, `releasePane`); `shared/screenCopy` (`copyScreen` once, `drawScreenPart`)                                                                                     |
| Sparkles, text, impacts, dimming   | `shared/twinkle` `stampGlimmer` (set `"lighter"` once per loop); `critFlash/critText` `drawCachedCritText`; `shared/eventFx` `drawWhiteBurst` / `drawExplosion`; `shared/screenFreeze` `drawFreezeDimmed` (stable key)    |

Performance: build sprites, paths and lookups once at arm, never allocate in the draw loop; skip anything past its window (`drawWispBetween`) and return early once done; never `ctx.filter` or `shadowBlur` in a frame.

## Crit rules

- **Two layers.** A **tier** (`crit`/`mega`/`ultra`) sets free upgrades and multiplier; a **proc** (special crit) rides on a landed tier, shown only by the flash. Canonical list: `CRIT_PROC_KINDS` / `CRIT_PROC_INFO` (`crits/critTypes`).
- **Rolling.** Only through `rollCrit`: tiers rarest first, one `SPECIAL_CRIT_GATEWAY_CHANCE` roll, every proc independently, then cap to `MAX_SPECIAL_CRIT_PROCS` with `pickAtMost` (never bypass).
- **Rewards.** Applied in `applyFloorCrit` via `CRIT_REWARDS` (`crits/floorCrits/floorCritRewards.ts`); map/building effects in `crits/floorCrits/buildingCrits.ts` (don't claim a floor-only proc works on the map). Always positive and instant; never share an effect or description with another crit.
- **Featured crits.** Data `{ label, color, image, description }` in `src/crits/badgeCrits/critData/<category>.ts` (startup), reward in `src/crits/badgeCrits/featured/<category>.ts` (after startup; they don't roll until it loads), reusing `featured/rewardHelpers.ts`. Icons register automatically: no per-crit draw calls, preloads, menu entries or test buttons.
- **Names.** The image decides the label: fun and unique about who or what it shows, their look, pose, action or props ("Copycats" for twin tabby cat girls, "Heifer Headlock" for one cow girl pinning another). Never bolt a money word onto it unless the art shows money or the pun comes from it ("Moolah Maker" for a cow girl); no bare category or theme words, no words the art doesn't show, no numbers or near-duplicates. Label, camelCase kind and icon basename match; `node scripts/rename-crit.mjs <kind> "<New Label>"` renames everywhere.
- **Effect groups.** `GROUPS` (`scripts/lib/crit-catalog.mjs`) sets each group's target share; new crits go to the groups furthest under it (upgrades and payouts are full). When a group's templates run out, add a group: an action in `FeaturedRewardActions` (`featured/rewardHelpers.ts`, bound in `floorCritRewards.ts`), templates in `scripts/lib/crit-templates.mjs` and a `GROUPS` entry.
- **Odds.** A featured roll picks one of the four main categories in `CRIT_GROUPS` (`critData/groups.ts`: girls, food, misc, wealth) evenly, then one of its crits by chance (`rollFeaturedCrit`). Keep image categories at about 20–50 crits. Each group's summed odds match its share, bigger rewards rarer; `scripts/lib/crit-odds.mjs` sets every chance (`--apply` re-runs it; run `node scripts/rebalance-crit-odds.mjs` after manual edits). Chances stay within about `0.0016`–`0.013` (Heavenly, the rarest, is `0.0001`).
- **Icon files.** `public/crits/<category>/<kind>.webp` (about 640×640 area), plus `public/stickers/…webp` and `public/silhouettes/…png`.

## Idea lists

New ideas go in `docs/ideas.md` as a `## List N` section.

- **Animated ideas** (floor crits, events, anything whose look is the point) are ALWAYS pitched with the playground in the same turn: one `IDEAS.push({ list: "nextK", name, about, ms, shakes, draw })` block each in `tmp/_playground/ideas.ts`, drawn with the game's libs, the list heading linking `tmp/_playground/ideas.html?list=nextK`. Never text only.
- **Everything else** (features, systems, economy, collection) is text only; build nothing until the user picks one.

Rejected ideas leave `docs/ideas.md` (their playground cells stay unless asked). An idea the user calls good gets built.

## Artwork prompts

Subject at most 184 characters, so the whole prompt is at most 480; name the crit before describing its art in any list:

"Flat vector cartoon of [SUBJECT], bold thick black outlines, cel-shaded flat colors with simple glossy highlights, vibrant saturated palette, clean sticker/game-icon style, centered composition, slight 3D depth but no gradients or textures, isolated on a plain solid white background, no shadows, no text."
