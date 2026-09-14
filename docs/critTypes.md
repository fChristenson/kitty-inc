# Crit ideas

Brainstormed additions to shared/critTypes' 27 existing procs. Not implemented yet.

## Quick wins (reuse an existing pattern or unused art)

- Manager Giveaway — Floor.hasManager is a one-time flag like hasOfficeChairs/hasOfficeSupplies,
  but only those two have a giveaway crit. Copy the Chair/Supplies Giveaway pattern for Manager.
- Elevator — src/assets/elevator.jfif is raw and completely unused. Free instant floor unlock:
  instantly unlocks the next locked floor above, like a mini Chain but for unlocking.
- Market Rally / Insider Trading — src/assets/graph.png is fully processed but never registered
  in loadAssets' IMAGE_FILES. Bull Market sibling, or a Sale-style event whose payout scales off
  the floor's current incomeAmount instead of floorIncomePerSecond.

## Event-window free-click crits (Sale/Overtime/Frozen/Snowball/FreeSale framework)

- Stock Split — temporary building-wide discount window (e.g. halves upgrade/worker costs for
  15s), the "event" counterpart to the permanent seasonal-sale discounts.
- Rush Hour — free clicks temporarily halve the floor's incomeIntervalSeconds per click
  (reverting once the window ends) instead of paying cash — speed-themed, distinct from
  Snowball's growing-cash and Frozen's flat-ultra-cash shapes.

## Instant one-shot economy crits (like Booty/TickTock/FastForward/BullMarket)

- Payday — instantly credits total income equal to N seconds of the whole company's combined
  rate (bigger scope than Booty's single-floor doubling).
- Dividend — pays a lump sum scaled by how many floors are currently unlocked.

## Tier-promotion crits (like Upgrade/Pair/ThreeOfAKind/FullHouse/Peppermint)

- Royal Flush — promotes 6 floors' tier at once, the natural next step past Full House's 5.
- Straight — promotes a contiguous run of floors starting from wherever it landed, a different
  walk shape than the poker-hand crits' simple count.

## Worker/boost crits (like Boost/Sunshine/Snowday)

- Night Shift — shorter boost duration than plain Boost, but also temporarily counts as having
  +1 worker for boost-strength purposes.

## Giveaway/permanent-discount crits

- Black Friday Sale — a rarer, steeper permanent discount than Halloween's 50% (e.g. 75%), same
  shape as the 5 existing seasonal-sale crits.
