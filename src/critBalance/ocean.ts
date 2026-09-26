// odds and reward sizes for featured/ocean.ts's crits, spread into CONFIG.crit
export const OCEAN_BALANCE = {
  treasureMapChance: 0.007,
  treasureMapPayouts: 25,
  captainLeFluffChance: 0.006,
  captainLeFluffUpgrades: 28,
  // same downward cascade as bounce above, just a bigger step per floor, so
  // it has to be meaningfully rarer than bounceChance
  divingBellChance: 0.05,
  divingBellUpgrades: 2,
  flooringInspectorChance: 0.01,
  flooringInspectorUpgrades: 15,
  krakenChance: 0.003,
  krakenPayouts: 27,
  messageInABottleChance: 0.016,
  messageInABottleUpgrades: 20,
} as const;
