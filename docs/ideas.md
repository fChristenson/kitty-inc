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

## List 119: game features

Still small moments in what's on screen, each a little surprise that only pays.

1. **Keep the change**: a buy now and then clinks, and part of its price (a tenth to a half) rattles back out of the button as coins into the total.
2. **Conga**: boosting every cat on a floor at once sometimes sets them dancing in a conga line across the floor, a coin popping off each one as it passes the bar.
3. **Change of tier**: a floor climbing a crit tier has its bar's new colour pour in from the left like paint, a coin popping out at the end.

## Built

- **New digit** (`src/shared/newDigit`, drawn by `shared/totalIncomeReadout`): the first time ever the total grows a digit, its new leading digit drops in from above in gold, lands with a pop of coins and cools back to green (a digit that starts a new unit plays Unit up instead). Test: New Effects "New Digit".

- **Gold standard** (`floors/incomePanel`): a floor at the level cap gets a coin-gold bar with gloss slashes and gold glimmers twinkling calmly over it.

- **Hold tally** (`src/floors/holdTally`, started and ended by gameCanvas's upgrade-button hold): letting go of a long-press buy (held 0.5s+) rattles the floor's bar with a gold flash per hundred levels the hold gave (up to ten), then the bar does the jackpot slam and lands with `+N Lvl` in gold.

- **Unit up** (`src/shared/unitUp`, drawn by `shared/totalIncomeReadout`): the first time ever the total reaches a unit, its unit word spins as a slot reel between gold rims, clicking and braking, three times round onto the new unit, slamming in gold in a cluster of blasts; coins swing up into the total, which pays `CONFIG.unitUp.payShare` of itself. Test: New Effects "Unit Up".
