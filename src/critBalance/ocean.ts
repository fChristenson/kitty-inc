// odds and reward sizes for featured/ocean.ts's crits, spread into CONFIG.crit
export const OCEAN_BALANCE = {
  treasureMapChance: 0.00818262184,
  treasureMapSeconds: 12,
  captainLeFluffChance: 0.011655067,
  captainLeFluffUpgrades: 28,
  // same downward cascade as bounce above, just a bigger step per floor, so
  // it has to be meaningfully rarer than bounceChance
  divingBellChance: 0.012924,
  divingBellUpgrades: 2,
  flooringInspectorChance: 0.0124689054,
  flooringInspectorUpgrades: 15,
  krakenChance: 0.00491948481,
  krakenPayouts: 27,
  messageInABottleChance: 0.0122791926,
  lemonSailsChance: 0.00167153004,
  lemonSailsGrowth: 0.2,
} as const;
