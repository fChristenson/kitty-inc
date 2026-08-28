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
