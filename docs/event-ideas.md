# Event ideas

Rule: coin streams hand the target free money, glimmer lights raise tiers (and similar upgrades).
Every effect is instant and positive. Build on `src/shared/eventStream` (target streams),
`src/floors/moneyCover` (screen covers) and `src/floors/riverPaths` (winding paths).

## Coin streams (free money)

- [x] **Fountain**: coins shoot straight up from the button, arc over and rain down across the screen, then sweep into the total. Pays floor income × floor number.
- [x] **Vortex**: coins spiral in from all four screen edges in a tightening whirlpool under the total, sinking into it. Pays floor income × floor number (like Spray).
- [x] **Ricochet**: one fat stream bounces off the screen edges like a pinball (3–5 bounces) before diving into the total. Payout grows per bounce.
- [x] **Payday**: every on-screen worker sends a short coin stream back to the button, which then fires one big stream into the total. Pays the floor's payout once per worker.
- [x] **Piggy Bank**: coins stream into a piggy that swells and wiggles, then bursts into a coin shower into the total. Pays a lump sum.
- [x] **Jackpot Reels**: coins stream into three slot reels, each stopping on ×1/×2/×5 with a slam. Pays the sum, tripled when all three match.
- [x] **Chain Pay**: coins hop button → nearest worker → next nearest (up to 8), each worker slamming as it's paid, the last firing into the total. The n-th worker reached pays n payouts.
- [x] **Downpour** (was Rain Check, a crit name already): coins rain down from above the screen and pool along its bottom, the pool rising, then it drains into the total. Pays floor income × floor number × 2.
- [x] **Magnet**: coins pop up all over the screen and get yanked in under a big horseshoe magnet, then flung into the total. Pays floor income × floor number × floors on screen.
- [x] **Spillover** (was Overflow, a crit name already): the button pours coins into the income bar until it brims over and slams full, then the overflow spills into the total. Pays the full bar plus 2 bonus payouts and restarts the bar.

## Glimmer streams (upgrades)

- [x] **Constellation**: a light links 3–7 on-screen workers into a star (a pentagram for five), then each node flares. +1 perma tier per linked worker.
- [x] **Ascend**: a glimmer orb zigzags up the building from below the lowest floor in view, touching each income bar (up to 6). +1 floor tier per touched floor (capped at the top tier).
- [x] **Blessing**: lights fall gently like snow onto one floor; each worker they touch glows. Every worker on that floor gets +1 tier.
- [x] **Halo**: lights spiral in to orbit the lowest-tier worker in view, shrink into a halo and settle on its head. That worker jumps to the top tier.
- [x] **Comet**: one big light with a long trail streaks diagonally across the screen. Promotes every worker it passes.
- [x] **Mentor**: the top-tier worker sends a light stream into the lowest-tier one. The lowest catches up by two tiers.
- [x] **Spark Chain**: a light jumps worker to worker like lightning, faster each jump. +1 tier per jump, stopping at the first maxed worker.
- [x] **Polish**: lights swirl around the upgrade button and buff it until it shines. Free upgrade levels.
- [x] **Recruit**: lights stream to an empty spot and form a new worker. A free hire.
- [x] **Promotion Day**: lights rise from every worker into the floor's tier badge. Floor tier +1.

## Combos (both)

- [x] **Alchemy**: coins stream into a cauldron, which bubbles and shoots lights into a worker. Tier upgrade plus a small payout.
- [x] **Investment**: coins flow into the income bar, then lights burst out of it into the floor's tier. Payout, then a floor tier.
- [x] **Dividends**: lights promote a worker, then that worker sprays a coin stream into the total. Tier upgrade plus a payout.
