// permanent tier promotions and guaranteed future tiers: odds and effect sizes, spread into CONFIG.crit
export const TIERS_BALANCE = {
  // "upgrade crit" — a flat one-time effect (not tier-scaled, same as
  // boost/booty): permanently promotes the affected floor's (or, for a
  // building-unlock crit, EVERY floor in that building's) own
  // critMultiplierTier one step further (see shared/critTypes' nextCritTier)
  upgradeChance: 0.012,
  // "peppermint crit" — a flat one-time effect, not tier-scaled, but a much
  // bigger swing than a single upgrade crit: promotes every OTHER unlocked
  // floor in the building one tier step at once (see shared/critTypes'
  // nextCritTier). Rarer than upgradeChance since it's a guaranteed
  // building-wide effect instead of a single floor
  peppermintChance: 0.002,
  // "heavenly crit" — the single biggest reward in the game: unlocks every
  // remaining floor in the building for free, promotes every floor (new
  // ones included) straight to the max tier, then grants that tier's own
  // free-upgrade batch to every floor. Rarer than peppermintChance since a
  // fully-unlocked, fully-maxed building is a far bigger swing than
  // promoting alternating floors one step
  heavenlyChance: 0.0001,
  // "pair"/"three of a kind"/"four of a kind"/"full house" crits — four more
  // flat, not-tier-scaled procs (see shared/critTypes' POKER_HAND_CRIT_COUNTS):
  // each promotes a FIXED number of floors' own permanent crit tier one step
  // (2/3/4/5 respectively), auto-unlocking locked floors along the way if the
  // building doesn't have enough unlocked ones yet. Rarer as the count grows,
  // same "bigger guaranteed swing costs more" logic as peppermint/heavenly
  pairChance: 0.02,
  threeOfAKindChance: 0.012,
  fourOfAKindChance: 0.006,
  fullHouseChance: 0.003,
  // "royal flush crit" — same shape again, the natural next step past full
  // house's 5: promotes 6 floors. Rarer still, same "bigger guaranteed
  // swing costs more" logic
  royalFlushChance: 0.0015,
  // "Golden Ticket" crit — no instant reward: guarantees the very NEXT
  // crit roll on this floor lands ultra, bypassing every tier chance (and
  // every other piggyback proc's own chance) entirely for that one roll
  // (see shared/critTypes' isGoldenTicketCrit / upgradeButton's
  // armGuaranteedUltraCrit). Rare, since it's a guaranteed jackpot
  goldenTicketChance: 0.008,
  // "Silver Ticket" crit — same shape as Golden Ticket, but guarantees
  // only mega instead of ultra (see upgradeButton's armGuaranteedMegaCrit)
  // — a smaller guaranteed swing, so less rare than Golden Ticket
  silverTicketChance: 0.02,
  // "Executive Order" crit — promotes every floor in the building one
  // permanent crit tier step at once
  executiveOrderChance: 0.006,
  // "Spring Cleaning" crit — promotes every unlocked floor one permanent tier
  // AND resets it to a fresh, un-upgraded floor at that higher tier; a floor
  // already at the top tier is left alone. Trades banked upgrades for a
  // permanently better multiplier, so priced with the other tier promotions
  springCleaningChance: 0.006,
} as const;
