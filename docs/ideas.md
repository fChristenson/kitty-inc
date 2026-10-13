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

## List 120: game features

More little surprises in what's already on screen, each one only paying.

1. **Domino**: a floor's payout now and then knocks the floor above into paying early, and it climbs the building floor by floor, each bar jolting as it pays, the last one slamming.
2. **Price drop**: a floor's price sometimes rolls down digit by digit like an odometer running backwards, holding the low price for a few seconds before it rolls back up.
3. **Cat nap**: a cat sometimes nods off at its desk without slowing anything, a little z floating up; tap it and it jolts awake and works at double speed for a while.
4. **Echo**: a crit number sometimes echoes, a smaller copy of it landing on the floor above a beat later with its own levels.

## Built

- **Money gun** (`incomeCrits/crits/moneyGunCrit`): income crit; the number splits into two wisp guns under the total firing fans of bills up into it, left, right, quicker and quicker, a muzzle flash, recoil and pop each volley; then both let rip in one blizzard of bills into the huge blast. Test: New Effects "Money Gun Crit".

- **Lotto drum** (`animatedCrits/events/lottoDrumEvent`): animated crit; wisps pour from the clicked button into a glitter drum and tumble; one by one, quicker each, the drum rattles and a wisp is drawn out of its top onto a bar with levels; then the drum bursts and the rest pour onto the clicked bar, a crit tier up. Test: New Effects "Lotto Drum".

- **Bill counter** (`incomeCrits/crits/billCounterCrit`): income crit; the number bursts into a stack of bills that riffle up into the total one by one like a money counter, faster and faster, the last handful together into the finale. Test: New Effects "Bill Counter Crit".

- **Prize wheel** (`animatedCrits/events/prizeWheelEvent`): animated crit; a ring of wisps spins into a huge wheel past a ticking pointer wisp, slows, crawls and tips onto the winner; the wheel blows apart, every wisp slamming onto a bar with levels, the winner diving onto the clicked one a crit tier up. Test: Animated Crits "Prize Wheel".

- **Mystery stacks** (`animatedCrits/events/mysteryStacksEvent`): animated crit; every bar in view flips into a gold bar with a ?, the ?s flip round onto the crit's number one by one, beams join them, every bar blows into its levels, the clicked one a crit tier up. Test: Animated Crits "Mystery Stacks".

- **Pick me** (`spawn/pickMe`): gesture spawn; x3, x7 and x10 pop up over a bar, wisps fly in and cover them, then shuffle like cups, quicker and quicker; the tapped wisp bursts on its number, which drops onto the bar as that many levels, the other two showing theirs. Test: Random Spawns "Spawn Pick Me".

- **Light rays** (`shared/lightRays` `drawLightRays`): the game's one set of light rays, Overtime's, behind stream targets, end slams, the badge crit flash, the pacman badge and Pick me's number; one gold, one spin speed.

- **Collect** (`floorCrits/crits/collectCrit`): floor crit; a hail of gold orbs onto every bar, then a collector wisp snakes up the bars bottom to top taking them all (levels per pickup) and dives onto its own bar. Test: New Effects "Collect Crit".

- **Third scatter** (`animatedCrits/events/thirdScatterEvent`): animated crit; scatter wisps land on bars one by one, the third hovers and teases while the screen rumbles, then beams link them and every bar blows in a rolling chain (levels), the clicked one last a crit tier up. Test: New Effects "Third Scatter".

- **Money weather** (`floorCrits/crits/moneyWeatherCrit`): floor crit; coins rain over the bars, a drizzle thickening to a slanting downpour, heavy coins slamming the bars quicker and quicker, then a huge one onto its own bar. Test: New Effects "Money Weather Crit".

- **Gesture spawns** (`shared/spawnGames` registry: gameCanvas ticks, draws and hands them its pointer; `CONFIG.randomSpawns.*`; tests in Random Spawns):
  - **Simon says** (`spawn/simonSays`, effects in `effects.ts`): the buttons in view flip and show numbers, a button can carry a later number too; tapped in order, each tap plays its part of the effect and levels its floor, the last pays the total.
  - **Pacman** (`spawn/pacman`): a wisp lays a path of lights ending on a badge; tracing it without straying eats the lights and wins the badge.
  - **Black hole** (`spawn/blackHole`): a nebula; held for 3s it becomes a black hole sucking in coins, crit numbers and struggling wisps, then goes supernova: levels on every bar in view and cash into the total.
  - **Lightning storm** (`spawn/lightningStorm`): a ball of lightning on a bar's left end; dragged along the bar, bolts strike behind the finger, money spilling into the total, a huge bolt at the end.

- **Gold standard** (`floors/incomePanel`): a floor at the level cap gets a coin-gold bar with gloss slashes and gold glimmers twinkling calmly over it. The moment it reaches the cap, the bar pops and wobbles back like its "Lvl" label (`shared/levelPop`), its old colour fading into the gold as it goes (`shared/glossyWidgets` `drawGoldSwitch`). Test: New Effects "Gold Standard".

