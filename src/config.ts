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
    specialCritGatewayChance: 0.15,
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
    // "blueprint" crit — unlocks the next floor and copies the triggering
    // floor's upgrades, workers, and manager to it for free
    blueprintChance: 0.04,
    // "boost crit" — a separate, independent roll from chain, but only ever
    // checked once a crit/mega/ultra tier has already landed on this same
    // click: it piggybacks on that tier's own free-upgrade payout instead of
    // replacing it, adding a free worker boost on top
    boostChance: 0.1,
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
    // "booty crit" — a flat one-time effect (not tier-scaled, same as boost):
    // doubles the CURRENTLY ACTIVE company's total income once
    bootyChance: 0.03,
    // "cash flow" — a flat one-time effect: pays one second of the combined
    // income rate across every corporation, without loading dormant buildings
    cashFlowChance: 0.03,
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
    // "skip crit" — unlocks every floor and buys its upgrade items for free,
    // without changing floor tiers or upgrade levels
    skipChance: 0.0001,
    // "mystic crit" — map-only: buys one extra building for free and gives
    // its ground floor exactly 10 normal upgrade-rate increases
    mysticChance: 0.001,
    // "keynote" — grants 10 free upgrades to the floor that crits
    keynoteChance: 0.03,
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
    // "lucky number" — unlocks a random 2-12 floors in this building for free
    luckyNumberChance: 0.001,
    // "open book" — pays the current value of upgrades bought across every building
    openBookChance: 0.02,
    // "tick tock crit" — a flat, not-tier-scaled proc: instantly credits every
    // unlocked floor 2 extra payouts' worth of income at its own current rate,
    // without touching its fill-cycle progress (see shared/income's
    // floor.lastCollectedAt) — the bar keeps ticking from exactly where it was
    tickTockChance: 0.1,
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
    winterSaleChance: 0.04,
    springSaleChance: 0.04,
    summerSaleChance: 0.04,
    autumnSaleChance: 0.04,
    // 0.25 = 25% off; procs multiply the affected cost by 1 - this
    seasonalSaleDiscount: 0.25,
    // "halloween sale" crit — same shape as the 4 seasonal sales above (same
    // floor/upgrade/worker cost cut, same building-wide scope), but its own
    // steeper discount (see shared/critTypes' HALLOWEEN_SALE_DISCOUNT_MULTIPLIER)
    halloweenSaleChance: 0.02,
    // 0.5 = 50% off — double the seasonal sales' own 25%
    halloweenSaleDiscount: 0.5,
    // "easter sale" crit — same shape/steeper discount again as halloween
    // sale above, just its own icon/label/color (see shared/critTypes'
    // EASTER_SALE_DISCOUNT_MULTIPLIER)
    easterSaleChance: 0.02,
    easterSaleDiscount: 0.5,
    // "sunshine crit" — same free-worker-boost reward as boost above, just
    // its own longer duration (see shared/critTypes' SUNSHINE_BOOST_DURATION_MS)
    sunshineChance: 0.08,
    // "snowday crit" — same free-worker-boost reward as sunshine above, just
    // its own longer duration still (see shared/critTypes' SNOWDAY_BOOST_DURATION_MS)
    snowdayChance: 0.06,
    // "fast forward crit" — same instant-income reward as tick tock above,
    // just a steeper multiplier (see shared/critTypes' FAST_FORWARD_PAYOUT_MULTIPLIER)
    fastForwardChance: 0.05,
    // "frozen crit" — starts a window (see
    // upgradeButton.ts's isFrozenActive/triggerFrozenCrit) during which this
    // floor's own upgradeCost stops growing entirely (see incomePanel.ts's
    // increaseIncomeRate) — upgrades still cost real money as normal, just
    // at whatever price was already locked in when the window started
    frozenChance: 0.1,
    frozenDurationMs: 5000,
    // "spending freeze crit" — locks every unlocked floor's current upgrade
    // price for the whole building for a short window
    spendingFreezeChance: 0.05,
    spendingFreezeDurationMs: 5000,
    // "snowball crit" — a flat, not-tier-scaled proc (see shared/critTypes'
    // applySnowballCrit): instantly credits every unlocked floor 1 extra
    // payout's worth of income at its own current rate, multiplied by how
    // many floors are currently unlocked — the more floors owned, the bigger
    // the snowball
    snowballChance: 0.05,
    // "free sale crit" — no reward of its own: just triggers the SAME "Sale"
    // event hud/boostMenu's paid purchase starts (see
    // floorInteractions.ts's applyFreeSaleCrit/upgradeButton.ts's
    // triggerSaleBoost), for free
    freeSaleChance: 0.08,
    // "bull market crit" — doubles every unlocked floor's own upgradeCount
    // building-wide (see floorInteractions.ts's applyBullMarketCrit), same
    // recompute-from-increaseIncomeRate approach applyHeavenlyCrit uses
    bullMarketChance: 0.02,
    // "payday crit" — a flat one-time effect (not tier-scaled, same shape as
    // booty): triples the CURRENTLY ACTIVE company's total income once
    paydayChance: 0.03,
    // "gold standard crit" — same flat one-time effect as payday, just a
    // steeper multiplier
    goldStandardChance: 0.01,
    // "night shift crit" — same building-wide free-worker-boost reward as
    // boost/sunshine/snowday above, but SHORTER than plain boost's own
    // duration, and temporarily counts as +1 worker for boost-strength
    // purposes (see shared/critTypes' NIGHT_SHIFT_BOOST_DURATION_MS)
    nightShiftChance: 0.08,
    // "Intern"/"Union Boss" crits — flat, not-tier-scaled procs: grant the
    // floor being upgraded one free worker/manager (see hud/upgradeMenu's
    // buyWorker/buyManager), free of charge
    internChance: 0.1,
    // "Talent Scout" crit — adds one capped worker, then briefly boosts every
    // actual worker on the critted floor
    talentScoutChance: 0.08,
    unionBossChance: 0.08,
    // "Rush Hour" crit — for rushHourDurationMs, every unlocked floor's own
    // income timer is capped at rushHourIntervalSeconds (never slowed down —
    // see shared/critTypes' isRushHourActive), stacking with whatever worker
    // boost/office-upgrade speedup already applies; a floor already faster
    // than the cap is left completely untouched
    rushHourChance: 0.08,
    rushHourIntervalSeconds: 0.5,
    rushHourDurationMs: 15000,
    // "Rate Lock" crit — for one floor, guarantees a half-length income interval
    // multiplier for a short window without changing its stored interval
    rateLockChance: 0.08,
    rateLockSpeedMultiplier: 0.5,
    rateLockDurationMs: 10000,
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
    // "Grand Opening" crit — if it lands on a map building purchase, buys
    // the next building for free; if it lands on an upgrade/floor unlock,
    // unlocks every remaining floor in that building for free. Big swing,
    // so keep rarer than most flat one-time procs
    grandOpeningChance: 0.001,
    // "Fully Staffed" crit — fills every unlocked floor to its worker cap and
    // grants every manager-eligible unlocked floor a manager for free
    fullyStaffedChance: 0.02,
    // "Shift Change" crit — fills the critted floor and the immediately lower
    // unlocked floor to the rendered worker cap
    shiftChangeChance: 0.08,
    // "Espresso Shot" crit — boosts every unlocked floor's workers for the
    // regular boost duration, with the same canonical worker-speed behavior
    espressoShotChance: 0.08,
    // "Deja Vu" crit — chooses a random crit tier at consumption time and
    // applies that tier's free-upgrade batch twice
    dejaVuChance: 0.02,
    // "Reinforcements" crit - copies the largest unlocked floor workforce to all
    // other unlocked floors for free
    cloneArmyChance: 0.03,
    // "Lucky Clover" crit — instantly pays out 4 back-to-back ultra-tier
    // crits on the floor; rare, since that's 500 free upgrades at once
    luckyCloverChance: 0.004,
    // "Second Wind" crit — refunds everything the active company has ever
    // spent on upgrades, floor unlocks and building purchases
    secondWindChance: 0.008,
    // "Executive Order" crit — promotes every floor in the building one
    // permanent crit tier step at once
    executiveOrderChance: 0.006,
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
    // "Golden Handshake" crit — hands every unlocked floor a free manager at
    // once (Union Boss's building-wide sibling)
    goldenHandshakeChance: 0.03,
    // "Supply Run" crit — free office chairs AND supplies for the floor that
    // crit, in one go
    supplyRunChance: 0.08,
    // "Casual Friday" crit — a flat batch of free upgrades for every unlocked
    // floor in the building
    casualFridayChance: 0.05,
    // "Fancy Friday" crit — Casual Friday's bigger sibling: twice the free
    // upgrades on every unlocked floor
    fancyFridayChance: 0.025,
    // "Fire Drill" crit — instantly completes every unlocked floor's income
    // timer once, paying it out and restarting the bar
    fireDrillChance: 0.08,
    // "Bonus Round" crit — completes the critted floor's income timer twice,
    // paying two current payouts and restarting that floor's bar
    bonusRoundChance: 0.08,
    // "Overflow" crit — pays five current income timer payouts on the critted
    // floor, then restarts that floor's bar
    overflowChance: 0.06,
    // "Performance Bonus" crit — completes one income timer per worker and
    // manager on every unlocked floor
    performanceBonusChance: 0.06,
    // "Double Down" crit — replays the tier that spawned it twice more on the
    // same floor, so it scales with whatever landed (up to 250 extra free
    // upgrades off an ultra); priced like the other tier-scaled repeats
    doubleDownChance: 0.015,
    // "Coffee Run" crit — same building-wide free-worker-boost reward as
    // boost/sunshine/snowday, but the longest duration of the family (a full
    // minute), so rarer than any of them
    coffeeRunChance: 0.03,
    // "Team Building" crit — one free worker on every unlocked floor at once
    // (Intern's building-wide sibling, priced like Golden Handshake)
    teamBuildingChance: 0.03,
    // "Team Lunch" crit — doubles the normal boost duration for every actual
    // worker on only the floor where the crit landed
    teamLunchChance: 0.08,
    // "Spring Cleaning" crit — promotes every unlocked floor one permanent tier
    // AND resets it to a fresh, un-upgraded floor at that higher tier; a floor
    // already at the top tier is left alone. Trades banked upgrades for a
    // permanently better multiplier, so priced with the other tier promotions
    springCleaningChance: 0.006,
    // "Night Owl" crit — Night Shift's reward with twice the virtual-worker
    // bump (+2 instead of +1), so a touch rarer than it
    nightOwlChance: 0.05,
    // "Headhunter" crit — matches the floor that crit to the building's
    // best-staffed floor; a no-op if it's already the best, so priced like
    // the other single-floor staffing procs
    headhunterChance: 0.06,
    // "Dress Code" crit — adds a manager or worker on every unlocked floor
    dressCodeChance: 0.08,
    // "Tea Break" crit — grants one free upgrade to the floor that landed it
    teaBreakChance: 0.08,
    // "Recruitment Drive" crit — fills this floor and contiguous unlocked
    // floors above it, stopping at the first maxed or locked floor
    recruitmentDriveChance: 0.06,
    // "Merger" crit - synchronizes lower unlocked floors to the landing
    // floor's upgrade level, bounded by the levels already earned there
    mergerChance: 0.03,
    // "Golden Parachute" crit — a flat, not-tier-scaled instant payout (see
    // floorInteractions.ts's applyGoldenParachuteCrit): instantly adds 15
    // seconds' worth of the currently active company's own combined income
    // rate (across every one of its buildings), straight to its total
    goldenParachuteChance: 0.03,
    // "Rain Check" crit — pays 5 seconds of the landed building's combined
    // current income rate
    rainCheckChance: 0.03,
    rainCheckSeconds: 5,
    // "Executive Bonus" crit — pays 25% of the active company's asset value
    executiveBonusChance: 0.04,
    powerSurgeChance: 0.05,
    priceMatchChance: 0.05,
    priceMatchDurationMs: 5000,
    firstClassChance: 0.05,
    // "Payout" crit — the biggest flat one-time jackpot: instantly adds the
    // combined total income + upgrades value across EVERY corporation (not
    // just the active one) to the currently active company's own total (see
    // floorInteractions.ts's applyPayoutCrit/totalIncome.ts's
    // getAllCompaniesUpgradesValue) — rare, since a multi-company save could
    // make this enormous
    payoutChance: 0.005,
    shareholdersChance: 0.02,
    ballerinaChance: 0.06,
    ballerinaUpgrades: 3,
    ballerinaPayouts: 3,
    cowboyChance: 0.035,
    cowboyUpgrades: 8,
    dinnerTimeChance: 0.04,
    dinnerTimePayouts: 5,
    fingerGunsChance: 0.07,
    fingerGunsUpgrades: 2,
    flamencoChance: 0.035,
    flamencoUpgrades: 7,
    milestoneChance: 0.025,
    milestoneStep: 25,
    moonwalkerChance: 0.04,
    moonwalkerUpgrades: 6,
    ninjaChance: 0.025,
    ninjaUpgrades: 12,
    obeliskChance: 0.008,
    obeliskTierSteps: 2,
    obeliskUpgrades: 2,
    sharpShooterChance: 0.04,
    sharpShooterPayouts: 10,
    spaceChance: 0.02,
    spaceUpgrades: 20,
    yesChefChance: 0.025,
    yesChefPayouts: 8,
    goldNuggetChance: 0.07,
    goldNuggetPayouts: 4,
    amethystChance: 0.05,
    amethystPayouts: 6,
    emeraldChance: 0.04,
    emeraldPayouts: 9,
    rubyChance: 0.03,
    rubyPayouts: 12,
    saphireChance: 0.025,
    saphirePayouts: 18,
    diamondChance: 0.02,
    diamondPayouts: 24,
    silverRushChance: 0.035,
    silverRushPayouts: 6,
    goldRushChance: 0.02,
    goldRushPayouts: 10,
    blessedChance: 0.01,
    blessedTierSteps: 1,
    blessedUpgrades: 3,
    wizardChance: 0.006,
    wizardTierSteps: 2,
    wizardUpgrades: 5,
    centurionChance: 0.01,
    centurionUpgrades: 100,
    checkUpChance: 0.05,
    checkUpUpgrades: 4,
    checkUpPayouts: 2,
    firemanChance: 0.04,
    firemanUpgrades: 3,
    firemanPayouts: 1,
    forTheKingChance: 0.02,
    forTheKingUpgrades: 15,
    forTheEmperorChance: 0.015,
    forTheEmperorUpgrades: 25,
    hammerTimeChance: 0.04,
    hammerTimeUpgrades: 9,
    robinHoodChance: 0.03,
    robinHoodPayouts: 7,
    robinHoodUpgrades: 3,
    romanChance: 0.03,
    romanUpgrades: 9,
    samuraiChance: 0.015,
    samuraiUpgrades: 30,
    spyChance: 0.022,
    spyUpgrades: 17,
    theLawWonChance: 0.045,
    theLawWonUpgrades: 6,
    theLawWonPayouts: 2,
    victorianChance: 0.03,
    victorianPayouts: 9,
    executiveSpinChance: 0.05,
    executiveSpinUpgrades: 4,
    rubberStampedeChance: 0.025,
    rubberStampedePayouts: 7,
    replyAllChance: 0.06,
    replyAllPayouts: 3,
    stapleOfSuccessChance: 0.04,
    stapleOfSuccessUpgrades: 7,
    faxOfFortuneChance: 0.035,
    faxOfFortunePayouts: 8,
    casualMondayChance: 0.025,
    casualMondayUpgrades: 20,
    deskJockeyChance: 0.05,
    deskJockeyUpgrades: 6,
    inboxZeroGravityChance: 0.03,
    inboxZeroGravityPayouts: 12,
    beanCounterChance: 0.01,
    beanCounterTierSteps: 1,
    beanCounterUpgrades: 6,
    kingOfTheWorldChance: 0.015,
    kingOfTheWorldUpgrades: 30,
    officeClownChance: 0.04,
    officeClownUpgrades: 5,
    fridayTieDayChance: 0.03,
    fridayTieDayPayouts: 10,
    soReadyChance: 0.02,
    soReadyUpgrades: 15,
    doughDivisionChance: 0.06,
    doughDivisionUpgrades: 6,
    profitPopcornChance: 0.04,
    profitPopcornPayouts: 4,
    donutDisturbChance: 0.05,
    donutDisturbUpgrades: 5,
    donutDisturbPayouts: 5,
    cakeDayChance: 0.03,
    cakeDayUpgrades: 12,
    champagneProblemsChance: 0.02,
    champagneProblemsPayouts: 15,
    bonusBurritoChance: 0.04,
    bonusBurritoUpgrades: 8,
    bonusBurritoPayouts: 3,
    sundaeBestChance: 0.025,
    sundaeBestPayouts: 10,
    popTheQuestionChance: 0.01,
    popTheQuestionTierSteps: 1,
    popTheQuestionUpgrades: 4,
    partyCrasherChance: 0.05,
    partyCrasherUpgrades: 3,
    epicChance: 0.012,
    epicUpgrades: 40,
    readyChance: 0.03,
    readyUpgrades: 4,
    readyPayouts: 4,
    workWorkChance: 0.028,
    workWorkUpgrades: 11,
    yesWarchiefChance: 0.018,
    yesWarchiefPayouts: 14,
    youAreNotPreparedChance: 0.005,
    youAreNotPreparedTierSteps: 2,
    youAreNotPreparedUpgrades: 9,
    arcanaChance: 0.009,
    arcanaTierSteps: 1,
    arcanaUpgrades: 12,
    bigDaddyChance: 0.011,
    bigDaddyUpgrades: 45,
    chonkChance: 0.028,
    chonkPayouts: 16,
    cyberPunkChance: 0.024,
    cyberPunkUpgrades: 13,
    dodgeThisChance: 0.045,
    dodgeThisPayouts: 6,
    whiteRabbitChance: 0.035,
    whiteRabbitUpgrades: 5,
    gladiatorChance: 0.022,
    gladiatorUpgrades: 13,
    iDidntAskForThisChance: 0.007,
    iDidntAskForThisTierSteps: 1,
    iDidntAskForThisUpgrades: 20,
    iHatePortalsChance: 0.035,
    iHatePortalsPayouts: 11,
    littleSisterChance: 0.038,
    littleSisterUpgrades: 7,
    magicIsAToolChance: 0.018,
    magicIsAToolUpgrades: 8,
    megaChonkChance: 0.022,
    megaChonkPayouts: 22,
    metalChance: 0.024,
    metalUpgrades: 17,
    princessChance: 0.021,
    princessPayouts: 13,
    spaceAndTimeChance: 0.03,
    spaceAndTimeUpgrades: 9,
    thinkWithYourHeadChance: 0.04,
    thinkWithYourHeadUpgrades: 5,
    thinkWithYourHeadPayouts: 5,
    wouldYouKindlyChance: 0.015,
    wouldYouKindlyPayouts: 16,
    yesYourHighnessChance: 0.017,
    yesYourHighnessUpgrades: 19,
    bulletDodgerChance: 0.022,
    bulletDodgerUpgrades: 14,
    nothingToSeeChance: 0.024,
    nothingToSeePayouts: 20,
    nowIAmSuspiciousChance: 0.013,
    nowIAmSuspiciousPayouts: 17,
    redOrBlueChance: 0.03,
    redOrBlueUpgrades: 6,
    redOrBluePayouts: 6,
    abraCashDabraChance: 0.018,
    abraCashDabraPayouts: 25,
    captainOfIndustryChance: 0.016,
    captainOfIndustryUpgrades: 21,
    clowningAroundChance: 0.03,
    clowningAroundUpgrades: 3,
    clowningAroundPayouts: 3,
    discoDividendChance: 0.024,
    discoDividendPayouts: 11,
    mimeYourBusinessChance: 0.035,
    mimeYourBusinessUpgrades: 8,
    redCarpetTreatmentChance: 0.03,
    redCarpetTreatmentPayouts: 12,
    rockTheStockChance: 0.021,
    rockTheStockUpgrades: 16,
    strongReturnChance: 0.017,
    strongReturnUpgrades: 26,
    theBigCheeseChance: 0.004,
    theBigCheeseTierSteps: 2,
    theBigCheeseUpgrades: 30,
    queenOfQueensChance: 0.013,
    queenOfQueensUpgrades: 28,
    bubbleEconomyChance: 0.045,
    bubbleEconomyPayouts: 7,
    cloudNineToFiveChance: 0.022,
    cloudNineToFivePayouts: 9,
    luckyLaundromatChance: 0.02,
    luckyLaundromatUpgrades: 5,
    luckyLaundromatPayouts: 5,
    moneyMagnetChance: 0.025,
    moneyMagnetPayouts: 14,
    overTheRainbowChance: 0.018,
    overTheRainbowPayouts: 15,
    pocketDimensionChance: 0.02,
    pocketDimensionUpgrades: 18,
    shootingStarEmployeeChance: 0.019,
    shootingStarEmployeeUpgrades: 23,
    treasureMeasureChance: 0.032,
    treasureMeasureUpgrades: 10,
    wishfulBankingChance: 0.0045,
    wishfulBankingTierSteps: 2,
    wishfulBankingUpgrades: 12,
    backToTheFiscalChance: 0.026,
    backToTheFiscalUpgrades: 11,
    despicableFeesChance: 0.016,
    despicableFeesPayouts: 30,
    howToTrainYourManagerChance: 0.04,
    howToTrainYourManagerUpgrades: 4,
    howToTrainYourManagerPayouts: 6,
    jurassicPerkChance: 0.029,
    jurassicPerkPayouts: 13,
    raidersOfTheLostReceiptChance: 0.034,
    raidersOfTheLostReceiptUpgrades: 9,
    theDevilWearsPawdaChance: 0.028,
    theDevilWearsPawdaUpgrades: 14,
    theExpenseMatrixChance: 0.012,
    theExpenseMatrixPayouts: 18,
    theFastAndTheFurriestChance: 0.015,
    theFastAndTheFurriestUpgrades: 12,
    theFellowshipOfTheBlingChance: 0.016,
    theFellowshipOfTheBlingUpgrades: 6,
    theFellowshipOfTheBlingPayouts: 6,
    theGreatCatsbyChance: 0.0065,
    theGreatCatsbyTierSteps: 1,
    theGreatCatsbyUpgrades: 30,
    theLordOfTheRingBindersChance: 0.013,
    theLordOfTheRingBindersUpgrades: 35,
    breakEvenChance: 0.045,
    breakEvenUpgrades: 8,
    chaChaChingChance: 0.042,
    chaChaChingPayouts: 8,
    charlestonChargeChance: 0.031,
    charlestonChargeUpgrades: 11,
    congaCompoundingChance: 0.025,
    congaCompoundingUpgrades: 4,
    congaCompoundingPayouts: 4,
    robotResourcesChance: 0.022,
    robotResourcesUpgrades: 19,
    rumbaReturnsChance: 0.023,
    rumbaReturnsPayouts: 21,
    salsaSalaryChance: 0.027,
    salsaSalaryPayouts: 13,
    shuffleTheFundsChance: 0.025,
    shuffleTheFundsUpgrades: 14,
    tangoTenderChance: 0.028,
    tangoTenderUpgrades: 7,
    tapThatAssetChance: 0.016,
    tapThatAssetPayouts: 17,
    waltzStreetChance: 0.018,
    waltzStreetUpgrades: 17,
    prehistoricChance: 0.0055,
    prehistoricTierSteps: 1,
    prehistoricUpgrades: 40,
    breadyOrNotChance: 0.028,
    breadyOrNotUpgrades: 11,
    eggcellentWorkChance: 0.0095,
    eggcellentWorkTierSteps: 1,
    eggcellentWorkUpgrades: 8,
    holyGuacamoleChance: 0.011,
    holyGuacamolePayouts: 19,
    loafActuallyChance: 0.026,
    loafActuallyUpgrades: 12,
    pastaLaVistaChance: 0.017,
    pastaLaVistaPayouts: 16,
    souperStarChance: 0.019,
    souperStarPayouts: 16,
    tacoBoutItChance: 0.04,
    tacoBoutItUpgrades: 4,
    theGreatPancakeStackChance: 0.018,
    theGreatPancakeStackUpgrades: 21,
    wokAndRollChance: 0.018,
    wokAndRollUpgrades: 24,
    iAmTheNightChance: 0.014,
    iAmTheNightUpgrades: 27,
    tubsChance: 0.017,
    tubsPayouts: 26,
    whySoSeriousChance: 0.0035,
    whySoSeriousTierSteps: 2,
    whySoSeriousUpgrades: 20,
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
