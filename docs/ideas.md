# Enhancement ideas: addictive reward-cycle / "slot machine" feel

Grounded in what's already built (upgrade/boost economy, `mouse` random bonus,
`sound` SFX, coin bursts, squash/stretch dialogs, city map tiers with stars).
Organized by the psychological lever each one pulls.

## Variable reward (the actual "slot machine" part)

- **Random upgrade payout multiplier**: occasionally (say 1-in-15 clicks) an
  upgrade-button click pays 2x-5x its normal `incomeAmount` bump, with a distinct
  SFX/flash and a "CRIT!" text pop. This is the single highest-leverage change —
  variable-ratio reinforcement is *the* addictive mechanism slot machines rely
  on, and right now every upgrade click is 100% predictable.
- **"Near miss" framing on the boost/upgrade costs**: when the player is close
  (e.g. within 90-99%) of affording something, flash the price/button with a
  pulsing glow instead of just flat-disabled gray. Near-misses are proven to
  increase continued play more than either clear wins or clear losses.
- **Lucky mouse variants**: the free `handleMouseClick` bonus already exists —
  add a rare "golden mouse" variant (different tint/sprite, maybe 1-in-20
  spawns) that pays out 5-10x a normal mouse click, with its own SFX and a
  screen-flash. Same underlying `applyBoostAll`/`spawnCoinBurst` plumbing, just
  gated by a random roll in the spawn logic.

## Escalating stimulation (combo/streak system)

- **Click combo meter**: track rapid consecutive upgrade-button clicks (e.g.
  within 800ms of each other) and escalate: pitch-shift `playCoinDrop`/
  `playBloop` up slightly per combo step (`sfx.playbackRate += 0.05` capped),
  scale the coin-burst particle count, and add a small screen-shake
  (`ctx.translate` jitter for 2-3 frames) at combo milestones (5, 10, 25).
  Cheap to build on the existing `spawnCoinBurst`/sound modules and gives
  escalating juice without new assets.
- **Milestone escalation** (half-exists already): the every-10th-upgrade bonus
  burst exists — extend it so the visual/audio intensity scales with
  `floor.upgradeCount / UPGRADE_MILESTONE_STEP` (bigger burst, louder/layered
  SFX, maybe a brief golden tint on the floor) so milestone 50 feels bigger
  than milestone 10, not identical.

## Loss aversion / sunk cost hooks

- **Boost expiration urgency**: boosted workers already have a timer
  (`boostedAt`) — surface a visible countdown ring or pulsing glow on boosted
  workers in their last ~2 seconds, so letting a boost "run out" feels like
  losing something, nudging players to re-boost.
- **Idle-income "you missed out" framing** (partially exists via the
  welcome-back popup): make the popup itself feel more like a reveal — animate
  the number counting up from 0 to the earned amount over ~1s with a ticking
  SFX, rather than appearing instantly. Counting-up numbers are a well-known
  perceived-value amplifier.

## Progression/prestige (long-term retention)

- **Building tiers already exist (1-5 stars)** — add a genuine prestige layer:
  once all 5 buildings are owned, offer a "reset for a permanent multiplier"
  mechanic (classic idle-game prestige), reusing `BUILDING_COST_MULTIPLIER`-style
  scaling so the math is already familiar in this codebase.
- **Daily streak bonus**: `last-close`/session state is already persisted for
  idle income — add a `cash-clicker:last-login-day` key, and grant an
  escalating bonus (day 1 small, day 7 big) on first load each calendar day,
  with its own popup+SFX moment.

## Cheap juice wins (small effort, real payoff)

- **Screen/canvas shake** on big purchases (buildings, milestones) — a few
  frames of small random `ctx.translate` offset in `redraw()`.
- **Button idle "breathing" animation** on affordable-but-unclicked upgrade
  buttons (subtle scale pulse) to draw the eye back to the next action, same
  squash/stretch language already used for dialogs.
- **Confetti/particle burst variety**: `spawnCoinBurst` could pick from 2-3
  particle types (coins vs. stars vs. bills — bill-flutter art already exists
  per this doc's own sprite-sheet prompts below) for milestone events
  specifically, so celebrations feel distinct from routine clicks.

## Suggested starting point

Combo meter + near-miss glow + escalating milestone burst — best "addictive
slot-machine feel per line of code" if starting somewhere concrete.

## Boost variety (beyond the single "speed up workers" option)

`boostMenu`'s own comment already says more items can join the list without
changing the dialog's shape — these all reuse that same list-of-buyable-items
pattern, and most reuse the existing `boosted`/`boostedAt` per-worker-slot
timer (`gameState`'s `activateBoosted`/`countBoostedWorkers`) rather than
inventing a new expiring-effect mechanism from scratch.

- **Double income (not just double speed)**: current boost halves the income
  interval; a separate boost could instead multiply `incomeAmount` directly
  for its duration (stacks differently — good for a player who wants one big
  payout now vs. faster smaller ones). Same `boostedAt` expiry pattern, just
  read by `effectiveIncomeCycle` as an amount multiplier instead of an
  interval divisor.
- **Crit-chance boost**: a temporary buy that raises `upgradeButton`'s
  `CRIT_CHANCE` (currently a flat 5%) for e.g. 30s — turns "jackpot" upgrades
  from a passive rare event into something the player can actively gamble on.
- **Upgrade discount boost**: temporarily multiplies `upgradeCost` by <1 for
  every unlocked floor, so upgrade-spam during the window feels like a "sale" —
  pairs naturally with a countdown-timer HUD element (same visual language as
  the boost-expiration-urgency idea above).
- **Unlock discount boost**: same idea but aimed at the next floor/building
  unlock price (`getBuildingPrice`/floor unlock cost) instead of upgrades —
  useful lever specifically for players saving up for the next big unlock.
- **Auto-collector boost**: for its duration, every floor's fill cycle
  auto-collects the instant it completes (no click needed) — good "borrowed
  time" power-up that visibly changes how the game plays for a bit, not just
  a number multiplier.
- **Single-floor "focus" boost**: unlike `applyBoostAll` (every floor), a
  cheaper boost that only affects one floor's workers, at a much stronger
  multiplier — gives the boost menu a cheap/small vs. expensive/global choice
  instead of one size fits all.
- **Permanent (non-expiring) boosts as a rare drop**: instead of a timed
  effect, a very rare `mouse`-click bonus or milestone reward grants a small
  permanent bump (e.g. +1% global income) — distinguishes "boosts you buy"
  (temporary) from "boosts you find" (permanent), and gives long-term players
  a reason to keep clicking well after timed boosts stop feeling exciting.
- **Combo-linked boost discount**: if the click-combo meter idea above ships,
  let a maxed-out combo grant one free/discounted boost-menu purchase as the
  payoff for keeping the streak alive, tying two systems together instead of
  leaving boosts and combos independent.
