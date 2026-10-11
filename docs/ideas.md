# Ideas

## List 117: game features ([playground](../tmp/_playground/ideas.html?list=next101))

Small surprise moments in what's already on screen (the total, the buttons, the crit numbers, the cats), in the spirit of the Odometer and the crit chains.

1. **Mystery price**: now and then a floor's button shows `???` instead of its price; tapping it reveals what the level cost: the normal price, half, nothing at all, or nothing plus ten levels on top.
2. **Loose digit**: a digit in the total sometimes wobbles loose and glows; tap it and it pops out as a coin, its value (a 9 most of all) paid into the total before it snaps back in.
3. **Catch the number**: a crit number sometimes hangs a beat longer with a gold rim; tap it then and it jumps a tier (x3 to x10, x10 to x50) before it lands.
4. **Lasso**: a ring of coins spins over a floor; draw a loop round it with a finger and the whole ring is caught and pulled into the total.
5. **High five**: two cats walking past each other sometimes stop and high-five, a coin popping up between them; tap it and both cats light up with a boost.

## List 118: game features

More small moments in the bars, buttons, scrolling and total, each a surprise that only pays.

1. **Golden lap**: now and then a bar's fill runs gold for one lap, glinting as it climbs; when it pays, that payout is ten times the normal one and slams into the total.
2. **Hot hand**: tapping a floor's button fast catches it alight, the flame growing with every quick tap; a run of twenty without a pause makes the next tap a sure crit.
3. **Roof bounce**: fling the building hard up to the top and it overshoots, the roof bouncing off the sky and shaking loose a spray of coins into the total.
4. **Rebound**: one gold coin in a stream flying into the total sometimes bounces off it and drops back onto a floor's bar, filling it at once.
5. **Hundreds**: a floor reaching a round hundred levels (Lvl 100, 200, ...) has its label slam gold and its bar pay out once for every hundred it's reached.

## Built

- **Hold tally** (`src/floors/holdTally`, started and ended by gameCanvas's upgrade-button hold): letting go of a long-press buy (held 0.5s+) rattles the floor's bar with a gold flash per hundred levels the hold gave (up to ten), then slams `+N Lvl` onto it in gold.

- **Unit up** (`src/shared/unitUp`, drawn by `shared/totalIncomeReadout`): the first time ever the total reaches a unit, its unit word spins as a slot reel between gold rims, clicking and braking, three times round onto the new unit, slamming in gold in a cluster of blasts; coins swing up into the total, which pays `CONFIG.unitUp.payShare` of itself. Test: New Effects "Unit Up".
