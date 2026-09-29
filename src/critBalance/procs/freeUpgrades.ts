// free upgrade batches: odds and effect sizes, spread into CONFIG.crit
export const FREE_UPGRADES_BALANCE = {
  // "keynote" — grants 10 free upgrades to the floor that crits
  keynoteChance: 0.03,
  // "bull market crit" — doubles every unlocked floor's own upgradeCount
  // building-wide (see floorInteractions.ts's applyBullMarketCrit), same
  // recompute-from-increaseIncomeRate approach applyHeavenlyCrit uses
  bullMarketChance: 0.02,
  // "Deja Vu" crit — chooses a random crit tier at consumption time and
  // applies that tier's free-upgrade batch twice
  dejaVuChance: 0.02,
  // "Lucky Clover" crit — instantly pays out 4 back-to-back ultra-tier
  // crits on the floor; rare, since that's 500 free upgrades at once
  luckyCloverChance: 0.004,
  // "Round Up" crit — tops every unlocked floor's upgradeCount up to the
  // next multiple of 10, for free
  roundUpChance: 0.04,
  // "Safety Net" crit — gives 5 free upgrades to the most expensive
  // unlocked floor in the building
  safetyNetChance: 0.04,
  // "Floor Share" crit - gives the critted floor one temporary upgrade
  // reward scaled by its own level plus every unlocked floor below it
  floorShareChance: 0.04,
  // "Same Boat" crit - gives the critted floor twice the Floor Share
  // temporary reward
  sameBoatChance: 0.02,
  // "Casual Friday" crit — a flat batch of free upgrades for every unlocked
  // floor in the building
  casualFridayChance: 0.05,
  // "Fancy Friday" crit — Casual Friday's bigger sibling: twice the free
  // upgrades on every unlocked floor
  fancyFridayChance: 0.025,
  // "Double Down" crit — replays the tier that spawned it twice more on the
  // same floor, so it scales with whatever landed (up to 250 extra free
  // upgrades off an ultra); priced like the other tier-scaled repeats
  doubleDownChance: 0.015,
  // "Tea Break" crit — grants one free upgrade to the floor that landed it
  teaBreakChance: 0.08,
  // "Merger" crit - synchronizes lower unlocked floors to the landing
  // floor's upgrade level, bounded by the levels already earned there
  mergerChance: 0.03,
} as const;
