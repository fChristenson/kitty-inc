// price cuts, price freezes and free sales: odds and effect sizes, spread into CONFIG.crit
export const SALES_BALANCE = {
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
  // "free sale crit" — no reward of its own: just triggers the SAME "Sale"
  // event hud/boostMenu's paid purchase starts (see
  // floorInteractions.ts's applyFreeSaleCrit/upgradeButton.ts's
  // triggerSaleBoost), for free
  freeSaleChance: 0.08,
  priceMatchChance: 0.05,
  priceMatchDurationMs: 5000,
} as const;
