# Ideas

## List 117: game features ([playground](../tmp/_playground/ideas.html?list=next101))

Small surprise moments in what's already on screen (the total, the buttons, the crit numbers, the cats), in the spirit of the Odometer and the crit chains.

1. **Mystery price**: now and then a floor's button shows `???` instead of its price; tapping it reveals what the level cost: the normal price, half, nothing at all, or nothing plus ten levels on top.
2. **Loose digit**: a digit in the total sometimes wobbles loose and glows; tap it and it pops out as a coin, its value (a 9 most of all) paid into the total before it snaps back in.
3. **Catch the number**: a crit number sometimes hangs a beat longer with a gold rim; tap it then and it jumps a tier (x3 to x10, x10 to x50) before it lands.
4. **Lasso**: a ring of coins spins over a floor; draw a loop round it with a finger and the whole ring is caught and pulled into the total.
5. **High five**: two cats walking past each other sometimes stop and high-five, a coin popping up between them; tap it and both cats light up with a boost.

## Built

- **Unit up** (`src/shared/unitUp`, drawn by `shared/totalIncomeReadout`): the first time ever the total reaches a unit, its unit word spins as a slot reel between gold rims, clicking and braking, three times round onto the new unit, slamming in gold in a cluster of blasts; coins swing up into the total, which pays `CONFIG.unitUp.payShare` of itself. Test: New Effects "Unit Up".
