// free floor and building unlocks: odds and effect sizes, spread into CONFIG.crit
export const FLOOR_UNLOCKS_BALANCE = {
  // "blueprint" crit — unlocks the next floor and copies the triggering
  // floor's upgrades, workers, and manager to it for free
  blueprintChance: 0.04,
  // "skip crit" — unlocks every floor and buys its upgrade items for free,
  // without changing floor tiers or upgrade levels
  skipChance: 0.0001,
  // "mystic crit" — map-only: buys one extra building for free and gives
  // its ground floor exactly 10 normal upgrade-rate increases
  mysticChance: 0.001,
  // "lucky number" — unlocks a random 2-12 floors in this building for free
  luckyNumberChance: 0.001,
  // "Grand Opening" crit — if it lands on a map building purchase, buys
  // the next building for free; if it lands on an upgrade/floor unlock,
  // unlocks every remaining floor in that building for free. Big swing,
  // so keep rarer than most flat one-time procs
  grandOpeningChance: 0.001,
  firstClassChance: 0.05,
} as const;
