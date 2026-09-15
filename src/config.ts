// Central balance sheet for every number that feeds into "how much money is being
// made" — per-floor income growth, upgrade pricing, crit-tier odds/payouts, sale
// boosts, and corporation-wide modifiers. This is
// the one place to tune when rebalancing income across methods so they stay
// proportionate to each other — nothing else in the codebase should hardcode a
// balance number already owned here; add new tunable values as new fields instead
// of a fresh standalone constant elsewhere. Pure data, no imports — safe for any
// module (including circular-import-sensitive ones like floors/index.ts) to read.

export const CONFIG = {
  // src/floors/index.ts's buildFloor — a new floor's starting stats. Each floor
  // above the ground floor multiplies its income by incomeGrowthFactor while its
  // interval only doubles. incomeGrowthFactor is deliberately equal to that
  // doubling (2) — NOT bigger — so a fresh, un-upgraded floor's base $/s is flat
  // across every floor level within a building; only accumulated upgrades (and
  // switching to a whole new, 1000x-richer building) grow $/s from there.
  // Previously this was 3 (a 1.5x-per-floor $/s runaway on floor depth ALONE),
  // which let endlessly climbing one building's floors always out-earn buying a
  // new building by an ever-widening margin — buildings stopped mattering once
  // a single building got tall enough. Keep this <= 2 (the interval-doubling
  // factor) so that snowball never comes back.
  floors: {
    baseIncomeAmount: 1,
    incomeGrowthFactor: 2,
    baseIncomeIntervalSeconds: 1,
    baseUpgradeCost: 1,
    baseUnlockCost: 200,
    baseRateStep: 2,
  },

  // src/floors/incomePanel/index.ts — how a floor's income/interval evolve as
  // it's upgraded, and the bounds its payout cycle is clamped to.
  incomePanel: {
    minIncomeIntervalSeconds: 1,
    maxIncomeIntervalSeconds: 3600,
    upgradesPerIntervalHalving: 10,
    upgradeCostGrowth: 1.3,
    // steeper growth for floors whose natural interval already exceeds
    // maxIncomeIntervalSeconds (see Floor.aboveCapTier) — offsets them
    // otherwise earning far more than their level was meant to
    upgradeCostGrowthAboveCap: 1.6,
  },

  // src/floors/upgradeButton/index.ts's CRIT_TIER_CONFIG — odds + free-upgrade/
  // sale-payout/permanent-rate multiplier per tier (color/label are cosmetic,
  // not balance, and stay defined alongside CRIT_TIER_CONFIG itself).
  crit: {
    crit: { chance: 0.05, multiplier: 5 },
    mega: { chance: 0.01, multiplier: 25 },
    ultra: { chance: 0.001, multiplier: 125 },
    // gateway roll for the whole "special crit" (chain/boost/bounce/
    // explosion/booty/upgrade) system: checked ONCE per landed crit/mega/
    // ultra, before any of the 6 individual proc chances below are even
    // rolled — a miss here means NONE of them get a chance to land at all
    // this time, silently (see rollCrit in shared/critTypes). A hit just
    // opens the door to the existing independent-roll-then-cap-at-2 logic,
    // it doesn't guarantee a proc actually lands
    specialCritGatewayChance: 0.25,
    // "chain crit" — an extra roll on top of an already-landed crit/mega/ultra
    // (see rollCritUpgrade): applies that same tier's upgrade to the next floor
    // too, then has chainContinueChance to keep going up the building one floor
    // at a time
    chainChance: 0.05,
    chainContinueChance: 0.5,
    // "boost crit" — a separate, independent roll from chain, but only ever
    // checked once a crit/mega/ultra tier has already landed on this same
    // click: it piggybacks on that tier's own free-upgrade payout instead of
    // replacing it, adding a free worker boost on top
    boostChance: 0.1,
    // "bounce crit" — same shape as chain (extends the landed tier's
    // free-upgrade payout floor by floor), but starts from the BOTTOM of the
    // building (floor 0) and climbs up, instead of starting at the floor that
    // actually crit
    bounceChance: 0.05,
    bounceContinueChance: 0.5,
    // "explosion crit" — same shape as chain again, but spreads BOTH
    // directions (up AND down) from the floor that actually crit, instead of
    // only upward
    explosionChance: 0.05,
    explosionContinueChance: 0.5,
    // "booty crit" — a flat one-time effect (not tier-scaled, same as boost):
    // doubles the CURRENTLY ACTIVE company's total income once
    bootyChance: 0.05,
    // "upgrade crit" — a flat one-time effect (not tier-scaled, same as
    // boost/booty): permanently promotes the affected floor's (or, for a
    // building-unlock crit, EVERY floor in that building's) own
    // critMultiplierTier one step further (see shared/critTypes' nextCritTier)
    upgradeChance: 0.001,
    // "peppermint crit" — a flat one-time effect, not tier-scaled, but a much
    // bigger swing than a single upgrade crit: promotes every OTHER unlocked
    // floor in the building one tier step at once (see shared/critTypes'
    // nextCritTier). Rarer than upgradeChance since it's a guaranteed
    // building-wide effect instead of a single floor
    peppermintChance: 0.0001,
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
    pairChance: 0.002,
    threeOfAKindChance: 0.001,
    fourOfAKindChance: 0.005,
    fullHouseChance: 0.0005,
    // "royal flush crit" — same shape again, the natural next step past full
    // house's 5: promotes 6 floors. Rarer still, same "bigger guaranteed
    // swing costs more" logic
    royalFlushChance: 0.0002,
    // "tick tock crit" — a flat, not-tier-scaled proc: instantly credits every
    // unlocked floor 2 extra payouts' worth of income at its own current rate,
    // without touching its fill-cycle progress (see shared/income's
    // floor.lastCollectedAt) — the bar keeps ticking from exactly where it was
    tickTockChance: 0.05,
    // "Chair Giveaway"/"Supplies Giveaway" crits — flat, not-tier-scaled procs: grant
    // the floor being upgraded its one-time office chairs/supplies purchase
    // (see hud/upgradeMenu's buyOfficeChairs/buyOfficeSupplies) for free,
    // if it doesn't already have it
    chairGiveawayChance: 0.1,
    suppliesGiveawayChance: 0.1,
    // "winter sale"/"spring sale"/"summer sale"/"autumn sale" crits — four
    // more flat, not-tier-scaled procs, all sharing one effect (see
    // shared/critTypes' SEASONAL_SALE_DISCOUNT_MULTIPLIER): permanently cut
    // every unlocked floor's own upgrade AND worker/office chairs/supplies/
    // manager costs by 25%, for the WHOLE building the roll happened in
    winterSaleChance: 0.05,
    springSaleChance: 0.05,
    summerSaleChance: 0.05,
    autumnSaleChance: 0.05,
    // 0.25 = 25% off; procs multiply the affected cost by 1 - this
    seasonalSaleDiscount: 0.25,
    // "halloween sale" crit — same shape as the 4 seasonal sales above (same
    // floor/upgrade/worker cost cut, same building-wide scope), but its own
    // steeper discount (see shared/critTypes' HALLOWEEN_SALE_DISCOUNT_MULTIPLIER)
    halloweenSaleChance: 0.05,
    // 0.5 = 50% off — double the seasonal sales' own 25%
    halloweenSaleDiscount: 0.5,
    // "easter sale" crit — same shape/steeper discount again as halloween
    // sale above, just its own icon/label/color (see shared/critTypes'
    // EASTER_SALE_DISCOUNT_MULTIPLIER)
    easterSaleChance: 0.05,
    easterSaleDiscount: 0.5,
    // "sunshine crit" — same free-worker-boost reward as boost above, just
    // its own longer duration (see shared/critTypes' SUNSHINE_BOOST_DURATION_MS)
    sunshineChance: 0.1,
    // "snowday crit" — same free-worker-boost reward as sunshine above, just
    // its own longer duration still (see shared/critTypes' SNOWDAY_BOOST_DURATION_MS)
    snowdayChance: 0.1,
    // "fast forward crit" — same instant-income reward as tick tock above,
    // just a steeper multiplier (see shared/critTypes' FAST_FORWARD_PAYOUT_MULTIPLIER)
    fastForwardChance: 0.05,
    // "frozen crit" — starts a window (see
    // upgradeButton.ts's isFrozenActive/triggerFrozenCrit) during which this
    // floor's own upgradeCost stops growing entirely (see incomePanel.ts's
    // increaseIncomeRate) — upgrades still cost real money as normal, just
    // at whatever price was already locked in when the window started
    frozenChance: 0.01,
    frozenDurationMs: 3000,
    // "snowball crit" — a flat, not-tier-scaled proc (see shared/critTypes'
    // applySnowballCrit): instantly credits every unlocked floor 1 extra
    // payout's worth of income at its own current rate, multiplied by how
    // many floors are currently unlocked — the more floors owned, the bigger
    // the snowball
    snowballChance: 0.01,
    // "free sale crit" — no reward of its own: just triggers the SAME "Sale"
    // event hud/boostMenu's paid purchase starts (see
    // floorInteractions.ts's applyFreeSaleCrit/upgradeButton.ts's
    // triggerSaleBoost), for free
    freeSaleChance: 0.05,
    // "bull market crit" — doubles every unlocked floor's own upgradeCount
    // building-wide (see floorInteractions.ts's applyBullMarketCrit), same
    // recompute-from-increaseIncomeRate approach applyHeavenlyCrit uses
    bullMarketChance: 0.01,
    // "payday crit" — a flat one-time effect (not tier-scaled, same shape as
    // booty): triples the CURRENTLY ACTIVE company's total income once
    paydayChance: 0.05,
    // "gold standard crit" — same flat one-time effect as payday, just a
    // steeper multiplier
    goldStandardChance: 0.01,
    // "night shift crit" — same building-wide free-worker-boost reward as
    // boost/sunshine/snowday above, but SHORTER than plain boost's own
    // duration, and temporarily counts as +1 worker for boost-strength
    // purposes (see shared/critTypes' NIGHT_SHIFT_BOOST_DURATION_MS)
    nightShiftChance: 0.1,
    // "Intern"/"Union Boss" crits — flat, not-tier-scaled procs: grant the
    // floor being upgraded one free worker/manager (see hud/upgradeMenu's
    // buyWorker/buyManager), free of charge
    internChance: 0.1,
    unionBossChance: 0.1,
    // "Rush Hour" crit — for rushHourDurationMs, every unlocked floor's own
    // income timer is capped at rushHourIntervalSeconds (never slowed down —
    // see shared/critTypes' isRushHourActive), stacking with whatever worker
    // boost/office-upgrade speedup already applies; a floor already faster
    // than the cap is left completely untouched
    rushHourChance: 0.1,
    rushHourIntervalSeconds: 0.5,
    rushHourDurationMs: 15000,
    // "Golden Ticket" crit — no instant reward: guarantees the very NEXT
    // crit roll on this floor lands ultra, bypassing every tier chance (and
    // every other piggyback proc's own chance) entirely for that one roll
    // (see shared/critTypes' isGoldenTicketCrit / upgradeButton's
    // armGuaranteedUltraCrit). Rare, since it's a guaranteed jackpot
    goldenTicketChance: 0.001,
    // "Silver Ticket" crit — same shape as Golden Ticket, but guarantees
    // only mega instead of ultra (see upgradeButton's armGuaranteedMegaCrit)
    // — a smaller guaranteed swing, so less rare than Golden Ticket
    silverTicketChance: 0.005,
    // "Grand Opening" crit — if it lands on a map building purchase, buys
    // the next building for free; if it lands on an upgrade/floor unlock,
    // unlocks every remaining floor in that building for free. Big swing,
    // so keep rarer than most flat one-time procs
    grandOpeningChance: 0.0005,
    // "Fully Staffed" crit — fills every unlocked floor to its worker cap and
    // grants every manager-eligible unlocked floor a manager for free
    fullyStaffedChance: 0.0005,
    // "Espresso Shot" crit — boosts every unlocked floor's workers for the
    // regular boost duration, with the same canonical worker-speed behavior
    espressoShotChance: 0.0005,
    // "Deja Vu" crit — chooses a random crit tier at consumption time and
    // applies that tier's free-upgrade batch twice
    dejaVuChance: 0.0005,
    // "Golden Parachute" crit — a flat, not-tier-scaled instant payout (see
    // floorInteractions.ts's applyGoldenParachuteCrit): instantly adds 15
    // seconds' worth of the currently active company's own combined income
    // rate (across every one of its buildings), straight to its total
    goldenParachuteChance: 0.03,
    // "Payout" crit — the biggest flat one-time jackpot: instantly adds the
    // combined total income + upgrades value across EVERY corporation (not
    // just the active one) to the currently active company's own total (see
    // floorInteractions.ts's applyPayoutCrit/totalIncome.ts's
    // getAllCompaniesUpgradesValue) — rare, since a multi-company save could
    // make this enormous
    payoutChance: 0.005,
  },

  // src/floors/upgradeButton/index.ts — the purchasable "Sale" boost.
  sale: {
    durationMs: 15_000,
  },

  // src/floors/upgradeButton/index.ts — the purchasable "Work overtime" boost.
  // Each free click during the event adds a tick (crit-scaled, see
  // CRIT_TIER_CONFIG) to the floor's own overtime gauge (incomePanel.ts).
  overtime: {
    durationMs: 15_000,
    tickGoal: 1000, // base goal for a floor with no permanent crit tier yet
    // a floor's CURRENT permanent crit tier raises its own gauge's goal further
    // (multiplies the base tickGoal above) — a higher tier already earns more
    // per tick, so its own gauge should take proportionally longer to fill
    tickGoalMultiplierByTier: {
      crit: 2,
      mega: 3,
      ultra: 4,
    },
    // once the 15s window ends, the gauge doesn't snap back to normal right
    // away — it ticks back down from wherever it ended toward 0 first, at this
    // fixed rate (1 tick per this many ms)
    drainMsPerTick: 500,
  },

  // src/hud/boostMenu/index.ts — one-time paid boosts.
  boostMenu: {
    boostAllSecondsCost: 5, // "Boost all" costs this many seconds of current income
  },

  // src/hud/upgradeMenu/index.ts — per-floor worker/office-upgrade pricing.
  upgradeMenu: {
    workerBasePriceFloor1: 100, // floor 1's unlockCost is always 0, needs its own base
    managerMinUpgradeCount: 50, // a floor must be upgraded this many times to hire a manager
  },

  // src/floors/incomePanel/index.ts's officeUpgradeSpeedMultiplier — each of
  // office chairs / office supplies / a manager doubles a floor's speed once
  // owned; all three stack multiplicatively (up to 8x total).
  officeUpgrades: {
    speedMultiplierPerUpgrade: 2,
  },

  // src/hud/corporationBoostMenu/economy.ts — corporation-wide modifiers.
  corporation: {
    // sqrt(log10(amount)) * this rate — the shared "$ amount -> a small,
    // steadily-growing global-boost %" conversion a company's own
    // size-based baseline contribution uses (see getCompanyBaseModifierPercent)
    baseModifierRate: 0.5,
  },
} as const;
