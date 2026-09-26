// procs that walk the landed tier's reward across floors: odds and effect sizes, spread into CONFIG.crit
export const CASCADES_BALANCE = {
  // "chain crit" — an extra roll on top of an already-landed crit/mega/ultra
  // (see rollCritUpgrade): applies that same tier's upgrade to the next floor
  // too, then has chainContinueChance to keep going up the building one floor
  // at a time
  chainChance: 0.08,
  chainContinueChance: 0.5,
  // "domino effect" — starts with one free upgrade on the critted floor,
  // then has a 50% chance to reach each floor above it with double the
  // previous floor's upgrade count
  dominoEffectChance: 0.04,
  dominoEffectContinueChance: 0.5,
  // "bounce crit" — same shape as chain (extends the landed tier's
  // free-upgrade payout floor by floor), but starts from the BOTTOM of the
  // building (floor 0) and climbs up, instead of starting at the floor that
  // actually crit
  bounceChance: 0.08,
  bounceContinueChance: 0.5,
  // "explosion crit" — same shape as chain again, but spreads BOTH
  // directions (up AND down) from the floor that actually crit, instead of
  // only upward
  explosionChance: 0.06,
  explosionContinueChance: 0.5,
} as const;
