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
- [x] **Trickle**: rains like Downpour, but every coin bounces on each floor in view on its way down, then settles in the pool and drains into the total. Pays like Downpour.
- [x] **Magnet**: coins pop up all over the screen and get yanked in under a big horseshoe magnet, then flung into the total. Pays floor income × floor number × floors on screen.
- [x] **Spillover** (was Overflow, a crit name already): the button pours coins into the income bar until it brims over and slams full, then the overflow spills into the total. Pays the full bar plus 2 bonus payouts and restarts the bar.
- [x] **Waterfall**: coins spill from the top floor in view and tumble down the building's side floor by floor, every button tipping more in, then the falls pour into the total. Payout grows per floor passed.
- [x] **Coin Toss**: coins stream into one giant coin that flips high, spinning, and lands with a slam. Heads pays ×3, tails ×2 of floor income × floor number.
- [x] **Hourglass**: coins pour into an hourglass that flips over, and the coins trickle out of it into the total. Pays a minute of the building's income.
- [x] **Rocket**: coins pour into a rocket on the clicked floor that launches up through every floor in view and bursts into a coin firework over the total. Pays the floor's payout once per floor it flies past.
- [x] **Night Sky**: the wisp flies out of the button and traces the crit's 5/25/125 outline in twinkling stars, which then stream into the total. Pays like Draw: times that number.
- [x] **Pitcher**: the wisp draws the crit's 5/25/125 in solid lines, each digit open at the top; as each digit closes, money pours down from the top of the screen and fills it, then the full number merges into the total. Pays like Draw.
- [x] **Twister**: a funnel of coins zigzags across the screen, sucking a short stream out of every worker it passes, then spins up into the total. Pays the floor's payout once per worker swept up.

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
- [x] **Conveyor**: glimmer hooks glide in dead straight along a rail, one per worker a floor in view is missing, each dropping its worker onto the floor like a conveyor hook. Fills the floor to its worker cap.
- [x] **Meteor Shower**: 3–6 small shooting stars streak down one after another, each striking a different worker. +1 tier per worker struck.
- [x] **Fireflies**: lights drift in and wander the floor, then settle one by one into its empty spots, each forming a new worker. Fills the floor to its worker cap.
- [x] **Lighthouse**: a beam from the button sweeps round the screen like a lighthouse; every upgrade button it lights shines. Free upgrade levels on every floor in view.
- [x] **Rising Tide**: a glow floods up the building from the street, lifting every floor in view. Each floor's tier rises to the highest tier among them.
- [x] **Tidal Wave**: like Rising Tide, but a wall of water sweeps across the screen from one side, its top leaning out like a breaking wave. Same reward.
- [x] **Beanstalk**: a vine of light grows up from the top floor and curls round the locked floors above. Unlocks the next 2 floors for free.

## Reveals

Built on `src/floors/revealStage`: the crit click slides a blue stage in over the floors like a camera pan, the reward is revealed on it, then the stage slides out and the reward lands.

- [x] **Reveal**: the black silhouette of a badge never landed floats over a pool of light; a wisp bumps it on the head and it spins until it flips to the badge's art. That crit then lands on the floor.

## Combos (both)

- [x] **Alchemy**: coins stream into a cauldron, which bubbles and shoots lights into a worker. Tier upgrade plus a small payout.
- [x] **Investment**: coins flow into the income bar, then lights burst out of it into the floor's tier. Payout, then a floor tier.
- [x] **Dividends**: lights promote a worker, then that worker sprays a coin stream into the total. Tier upgrade plus a payout.
- [x] **Harvest**: the button tosses a seed beside each worker on the floor; each lands in a puff of dirt and a leafy crop shoots up over a ripening gold coin. Left to right, every coin is yanked out like a carrot, spinning up and bursting into a coin stream into the total as its worker climbs. Pays the floor's payout per crop, and the floor's workers each get +1 tier.

## Next ideas

Built only from coins and bills, the wisp, glitter and simple shapes (lines, rings, bursts): no big drawn props.

### Coins (free money)

- [x] **Ripple**: coins burst out of the button in round ripples like a stone dropped in a pond (a wide band, a thin ring or two close behind, then the next wide band), each rolling outward at its own pace while the frozen screen under it refracts like water; then the coins sweep into the total. Pays floor income × floor number once per ring.
- [ ] **Dominoes**: a row of giant coins stands on edge along the floor; the first tips over and they fall one into the next, each flipping up into the total as it lands. Pays the floor's payout per coin.

### Wisp (upgrades)

- [x] **Wrecking Ball**: the wisp drops like a heavy ball from above the screen onto the clicked floor's income bar and bounces on it, each bounce lower as it drifts across; every hit is an explosion and a big shake landing free upgrade levels, the last bursting into the bar.
- [ ] **Lasso**: the wisp circles the clicked floor in a wide loop trailing a glowing rope, tightening it round all its workers until it cinches; the floor's income bar climbs one crit tier.
- [ ] **Jump Rope**: two wisps hold a glowing thread between them and twirl it like a jump rope as they walk it across the floor; each worker it reaches jumps over it and climbs one perma tier.
