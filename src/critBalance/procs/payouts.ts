// instant income payouts: odds and effect sizes, spread into CONFIG.crit
export const PAYOUTS_BALANCE = {
  // "booty crit" — a flat one-time effect (not tier-scaled, same as boost):
  // doubles the CURRENTLY ACTIVE company's total income once
  bootyChance: 0.03,
  // "cash flow" — a flat one-time effect: pays one second of the combined
  // income rate across every corporation, without loading dormant buildings
  cashFlowChance: 0.03,
  // "open book" — pays the current value of upgrades bought across every building
  openBookChance: 0.02,
  // "tick tock crit" — a flat, not-tier-scaled proc: instantly credits every
  // unlocked floor 2 extra payouts' worth of income at its own current rate,
  // without touching its fill-cycle progress (see shared/income's
  // floor.lastCollectedAt) — the bar keeps ticking from exactly where it was
  tickTockChance: 0.1,
  // "fast forward crit" — same instant-income reward as tick tock above,
  // just a steeper multiplier (see shared/critTypes' FAST_FORWARD_PAYOUT_MULTIPLIER)
  fastForwardChance: 0.05,
  // "snowball crit" — a flat, not-tier-scaled proc (see shared/critTypes'
  // applySnowballCrit): instantly credits every unlocked floor 1 extra
  // payout's worth of income at its own current rate, multiplied by how
  // many floors are currently unlocked — the more floors owned, the bigger
  // the snowball
  snowballChance: 0.05,
  // "payday crit" — a flat one-time effect (not tier-scaled, same shape as
  // booty): triples the CURRENTLY ACTIVE company's total income once
  paydayChance: 0.03,
  // "gold standard crit" — same flat one-time effect as payday, just a
  // steeper multiplier
  goldStandardChance: 0.01,
  // "Second Wind" crit — refunds everything the active company has ever
  // spent on upgrades, floor unlocks and building purchases
  secondWindChance: 0.008,
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
  // "Payout" crit — the biggest flat one-time jackpot: instantly adds the
  // combined total income + upgrades value across EVERY corporation (not
  // just the active one) to the currently active company's own total (see
  // floorInteractions.ts's applyPayoutCrit/totalIncome.ts's
  // getAllCompaniesUpgradesValue) — rare, since a multi-company save could
  // make this enormous
  payoutChance: 0.005,
  shareholdersChance: 0.02,
} as const;
