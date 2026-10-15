# Kitty Inc

Canvas idle/clicker game (Vite + TypeScript, no framework). Every module's header documents its API: read the folder, don't expect it here.

## Rule one: 60fps under the stress test

Everything (crits, events, spawns, menus, HUD, startup, the first tap) holds 60fps on a phone under the stress test: a maxed game (6 companies × 30 buildings × 20 floors, maxed workers/managers) with the coin-burst storm on. Below that it's unfinished.

- **Measure** (dev server up): `node scripts/crit-perf.mjs --warm <kind | event | run:<scenario> ...>` (no names: what git changed). Stress rig at 4x CPU on a phone screen. Pass: fps 58+, frame p95 within one frame, no hitches, no HOT/high finding from `scripts/perf-audit.mjs`. Runs swing ±5–15fps: re-run before fixing and before calling it done. `--rank played|floor|income|button|lock|rate|events` ranks crits by frame cost; a SLOW one gets cheaper or goes.
- **Make the work cheap**, for every browser. The only gate: while frames run slow, a new special crit can't proc until the playing ones finish (`shared/critLoad`). No other gate, budget, skip or delay of crits for frame rate.
- **In a draw:** build sprites, paths, gradients, glyphs and lookups once at arm or first use; no per-item `.map`/`.filter`/`.slice`/spread/closures, sort, `indexOf`/`includes`/`find` in loops or `measureText`; skip what's past its window and return early once done; never `ctx.filter`, `shadowBlur` or pixel readback.

## Code

- One folder per module under `src/`, one `index.ts`. Shared code in `src/shared/<name>/`; modules import each other only through `shared/`. Reusable code, never duplicated.
- `src/crits/`: `critTypes` (tiers, procs, rolling), `critFlash`, `floorCrits` (tier crits, rewards, `critPlayer`), `incomeCrits`, `buttonCrits`, `lockCrits`, `rateCrits`, `badgeCrits`, `animatedCrits` (events, stages), `critKit` (played crits' registry, reward targets). Outside `src/crits` import only its `index.ts` and `crits/config.ts`.
- Startup: `src/boot.ts` stays tiny and free of game imports; what the first frame doesn't draw loads after it (`afterStartup`, `prepareSoon`, `loadWhenIdle`); heavy first-seconds work runs behind the splash (`shared/preheat`). Static DOM is in `index.html`. The badge catalog is lazy (`critData/kinds.ts` at startup, `loadBadgeCatalog` later); no module-level tables over every crit kind. Measure startup on `npm run perf:build` + `npx vite preview --mode perf`.
- Global crit amounts (tiers, payouts, the gateway) in `CONFIG.crit` (`src/crits/config.ts`; badge values in `badgeCrits/balance/`); a proc's odds, display and own amounts in `floorCrits/procs/<kind>/meta.ts` (`ProcMeta`); a played crit's or event's odds and own amounts (`values`) in its `meta.ts`, never in `CONFIG`.
- Every orb, wisp or travelling light is `shared/wisp`; every tap/swipe target hit-tests through `shared/tapTarget`.

## Look and feel

- **Drama is the point.** Every crit and event builds up (charging, trembling, glowing, light pulled in, rumble rising, beats quickening) and ends in a climax (biggest blast, hardest shake, loudest bang, landing the reward). Big, bold movement; a crit without build-up and climax gets cut.
- **Never slow, never subtle.** Nothing crawls: every projectile moves at speed and snaps onto its target, crossing the screen in ~250ms; turns and corners are fine, but nothing ever slows to a crawl through them (a long curve is a straight, at full speed). A beat that doesn't hit hard on its own (flash, blast, shake, bang) isn't a beat. No idle decoration: static glitter or stale sparks hanging round a prop add nothing; everything on screen moves with the beat.
- **Never spin the view** (shake, slide, zoom only); **never build on text**. Text moves like our coins (`shared/coinFlip`): one solid piece on one smooth arch, one flip or in-plane turn; never warp, steer or stall it.

## What each part is for

- **Animated crits are the break:** the only thing that stops the game. Always start on the dark frozen overlay, then go all out; they may spend more frame budget (still 60fps).
- **Every other crit plays during gameplay** (floor, income, button, lock, rate, badge): the reward lands at once on its own targets while the player keeps tapping. Props start at or next to the targets; never cover, dim or fill the screen, pull the eye away, block a tap or change behaviour.
- **Random spawns are opt-in detours** (`src/spawn`): one folder `src/spawn/<key>/` with `meta.ts` (`SpawnMeta`) and `index.ts` default-exporting a `SpawnGame` (`shared/spawnGames`); found automatically.
- **The upgrade button never stops upgrading:** a tap upgrades at once whenever payable; button crits may change its look and add to a tap, never stop, delay or replace it, nor draw over or around it.

## Crits

- **Groups** (each its own `CONFIG.specialCrits` slot):
  - **Floor** (multiplier crit): plays onto the income bars in view, every hit levels/payouts.
  - **Income** (cash crit): the green `+$` amount plays onto the total readout, every hit a share; never bars or floors.
  - **Button** (multiplier): onto the upgrade buttons; rewards are tap perks (`buttonCrits/buttonBonus`, shared in `tapPerks`), charges, free taps.
  - **Lock** (multiplier, locked floor in view): onto the locked floor; step 1 opens it, step 2 rewards the opened floor.
  - **Rate** (multiplier): onto every open bar (maxed too); rewards on the bar's rate (bar effects in `rateCrits/rateBonus`, shared in `barEffects`), landing with the readout flipping. Never levels.
  - **Badge** (`badgeCrits`): badges shown by the flash. **Animated** (`animatedCrits/events`): full events, any reward.
- **A played crit is one folder** `src/crits/<group>Crits/crits/<kind>/`: `meta.ts` (`{ label, chance, style, values?, isNew: true } satisfies CritMeta`) and `index.ts` calling `registerFloorCrit(kind, { plan, draw, tailMs, shake, ...reward hook })`. `critKit` finds it (rolls, loader, test button); no lists anywhere. Reward hooks: floor `levels`/`ownLevels`/`payouts`; button/rate/lock `reward(t)` with `t` a `CritTarget` (`critKit/target`).
- **Income bars** fill, or beat like a heart once fast (`shared/pressureBar`), or are solid gold when maxed; under stress nearly all are full or gold. Land bar rewards on the readout, the beat, props on the bar or payout bursts, never on a fill.
- **Two layers:** a tier (crit/mega/ultra) sets free upgrades and multiplier; a proc (special crit) rides on it. Roll only via `rollCrit`. Badge rewards via `CRIT_REWARDS`; map effects in `MAP_CRITS` (`floorCrits/buildingCrits.ts`). Always positive and instant; no two crits share an effect.
- **Badges:** data in `badgeCrits/critData/<category>.ts`, rewards in `badgeCrits/rewards/<category>.ts`; icons register automatically. Odds: a badge roll picks one of `CRIT_GROUPS` evenly, then a crit by chance (`scripts/lib/crit-odds.mjs`, `scripts/rebalance-crit-odds.mjs`). Shares per effect group in `GROUPS` (`scripts/lib/crit-catalog.mjs`). Badges are random images, never sets.
- **Names:** literal to what's seen, fun and unique; the image decides a badge's label (no money words unless the art shows money); check every label is unused (crit metas, event metas, spawns, badge data). `scripts/rename-crit.mjs` renames everywhere.
- **New batch:** first drop `isNew` from every `meta.ts` that has it (the earlier batch is added), then `node scripts/select-animation-style.mjs [count] [--groups a,b]` and build each slot in the style it drew (never re-roll unless the user names styles). `node scripts/crit-dist.mjs [--style x] [--reward x]` shows what exists and the thin spots; make each crit unlike the style's existing ones and vary the beats across a list.

## Events

A slot-machine lever pull: only beneficial, no waiting or input, about 1.5–2.5s (screen-game worlds longer). Each event in `src/crits/animatedCrits/events/<name>Event` with a `meta.ts` (`EventMeta`: label, `style`, `reward`, `chance`, its own `values`, `isNew` on the latest batch), imported into the last `eventLoader` part; never confusable with another. Rewards vary (cash, levels, crit tiers, perma tiers, hires, free floors) and land on screen on the hit that gives them (`animatedCrits/eventRewards`, `wispCover`). Each batch covers the styles plus a few experiments (simulations, puzzles, algorithms, self-playing games).

## Animation styles

Every crit and event uses one style; libs in `src/shared/animationStyles/<style>` (others: `animatedCrits/cashFlow`, `wispCover`, `flightStage`). A new style gets its folder, a line here and its name in `scripts/crit-dist.mjs` `BASE_STYLES`, `scripts/select-animation-style.mjs` `STYLES` and `critKit/meta.ts` `CritStyle`. A style is a behaviour, never one look: vary props, layout, motion and beats.

- **Money:** cash as liquid: rivers, jets, pools, geysers of hundreds of coins.
- **Wisp:** wisps flying, chasing, orbiting, colliding.
- **Mix:** a wisp leading, feeding, drinking or firing a river of cash.
- **Beam:** aim, sweep, scan, cut, lock on.
- **Lightning:** forking bolts in a blink, arcing, chaining; each strike a flash, crack and jolt.
- **Explosion:** big, chain and cluster blasts in every one; lit bombs throbbing ever faster or a time bomb counting down (beeps closing up, each a throb) as the build-up; sparks may fly, but never as a timer (no dials or rings of pips).
- **Gunfire:** wisp bullets in spirals, rings, fans, volleys, crossfire.
- **Bounce:** wisps ricocheting, hopping, drop-bouncing off edges, bars, workers.
- **Drill:** stalls on the bite rumbling, bores in ~8 shoves over 1.5s+, judders, gushing hundreds of sparks both sides; never thin the spray.
- **Spray:** a nozzle wisp hissing gold mist that coats its target until it flashes.
- **Race:** at speed throughout: flat out on straights, braking into tight hairpins round real things and powering out, never crawling; a chaser ~120ms behind; blasts only at the finish.
- **Clutter:** a mess of hundreds of bits tidied fast (broom, plough, hole, force, or self-tidying), brisk beats, the pile landing on the reward; never a swarm of small wisps.
- **Galaxy:** hundreds of stars on a tilted Kepler disk; beats from orbits (clumping, slingshots, collisions); flung off along their heading onto the reward.
- **Drawing:** a big readable picture out of hundreds of dots arriving faster and faster, then blazing onto the reward; never letters or numbers.
- **Charge:** one element gathering power over ~0.8–1.5s (tremble, glow, streaks in, rumble rising with it), bursting at the climax.
- **Portal:** twin rings; whatever dives in bursts out of the twin at once with its speed; passes quicken. Vary ring looks, distances (side by side or across the screen) and legs; no tunnels or vortices.
- **Slice:** 60–80ms swipes in quick fire, pieces sliding apart, glitter spilling; building to a cross or one long cut.
- **Pull:** one element sucking everything in, a trickle then a flood, swelling and trembling, collapsing and bursting; vary what gets sucked in.
- **Summon:** a circle of light drawn flat under the reward, turning faster with a jolt each turn, erupting in a pillar; vary the circle looks.
- **Snowball:** a ball rolling in quickening passes, everything it touches sticking on, bursting on the reward.
- **Ripple:** drops landing in flat rings, drizzle to downpour, one huge last drop.
- **Crush:** slams quickening and deepening (or a relentless press until it crumbles), contact lines, cracks, squash and stretch; only wisps and glitter get crushed; the last slam the hardest.
- **Tornado:** one funnel growing and spinning up, its foot travelling over the targets, catching and spinning everything up, flinging it out at the climax.
- **Swarm:** hundreds of specks and a few lead wisps moving as one mass, wheeling, streaming, packing and bursting; hits in closing waves; the climax drives the whole flock into the reward.
- **Screen-game worlds** (animated only, on the flight stage): **Flight**, **FPS**, **Road race**, **Shmup**, **Rail shooter** (`animatedCrits/flightStage`, `shared/animationStyles/{fps,race,shmup,railShooter}`): palette colours, the player always a wisp, ~3–5s.

## Idea lists

New ideas go in `docs/ideas.md` as `## List N`, each with a playground cell in `tmp/_playground/ideas.ts` (`IDEAS.push({ list: "nextK", ... })`) in the same turn, drawn with the game's libs; build nothing until the user picks. Rejected ideas leave `docs/ideas.md`; an idea the user calls good gets built.

## New images to crits

Work in `tmp/`; only `--apply` writes `public/` and `src/`. Look at one sheet per step.

1. `node scripts/crit-intake.mjs` → fill `tmp/_intake.json` names/categories → `--move`.
2. `node scripts/new-crits.mjs --scan`, then preview `node scripts/new-crits.mjs`; fix poor cuts with `--custom <kind>` (options in `scripts/lib/crit-cutout.mjs`).
3. `node scripts/new-crits.mjs --apply`, then `npm run build`. Never delete a raw unless told.

## Artwork prompts

Subject ≤184 characters; name the crit first: "Flat vector cartoon of [SUBJECT], bold thick black outlines, cel-shaded flat colors with simple glossy highlights, vibrant saturated palette, clean sticker/game-icon style, centered composition, slight 3D depth but no gradients or textures, isolated on a plain solid white background, no shadows, no text."
