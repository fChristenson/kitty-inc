import type { PINUPS_CRITS } from "../../critData/pinups";
import type { FeaturedRewards } from "./types";

export const PINUPS_REWARDS = {
  swimsuitSweetheart: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.swimsuitSweetheartBoostSeconds, balance.swimsuitSweetheartExtraWorkers),
  hoopDreamDiva: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.hoopDreamDivaContinueChance),
  bathtubBullion: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.bathtubBullionMultiple),
  bedroomBudget: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.bedroomBudgetUpgrades),
  burlesqueBonus: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.burlesqueBonusUpgrades),
  cashConfetti: (context, { actions, balance }) =>
    actions.addUpgradePriceCash(context.floors, balance.cashConfettiMultiple),
  cheekyCheckbook: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.cheekyCheckbookMultiple),
  coffeeBreakGains: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.coffeeBreakGainsUpgrades),
  dowagerDividend: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.dowagerDividendGrowth),
  emeraldWindfall: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.emeraldWindfallUpgrades),
  friskyBusiness: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.friskyBusinessUpgrades),
  garterStash: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.garterStashMultiple),
  goldenHandcuffs: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.goldenHandcuffsMultiple),
  housekeepingHaul: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.housekeepingHaulUpgrades),
  hushMoney: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.hushMoneyMultiple),
  jackpotShowgirl: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.jackpotShowgirlMultiple),
  lapOfLuxury: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.lapOfLuxuryGrowth),
  leatherAndLucre: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.leatherAndLucreGrowth),
  maidInGold: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.maidInGoldUpgrades),
  makeItRain: (context, { actions, balance }) =>
    actions.addUpgradePriceCash(context.floors, balance.makeItRainMultiple),
  nightcapNestEgg: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.nightcapNestEggUpgrades),
  pillowTalkProfits: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.pillowTalkProfitsUpgrades),
  roomService: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.roomServiceUpgrades),
  silkAndStocks: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.silkAndStocksUpgrades),
  slotSiren: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.slotSirenMultiple),
  sugarMama: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.sugarMamaGrowth),
  tipMe: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.tipMeMultiple),
  vaultVixen: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.vaultVixenMultiple),
  velvetAllowance: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.velvetAllowanceGrowth),
  bikiniLine: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.bikiniLineShare),
  garterGirls: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.garterGirlsShare),
  goGoBoots: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.goGoBootsShare),
  heelClickers: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.heelClickersShare),
  hipPop: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.hipPopShare),
  kneelAndPeek: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.kneelAndPeekShare),
  lavenderLegs: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.lavenderLegsShare),
  neonLocks: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.neonLocksShare),
  peekabooPair: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.peekabooPairShare),
} satisfies FeaturedRewards<typeof PINUPS_CRITS>;
