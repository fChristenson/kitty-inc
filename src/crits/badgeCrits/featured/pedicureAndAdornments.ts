import type {
  PEDICURE_AND_ADORNMENTS_CRITS,
} from "../critData/pedicureAndAdornments";
import type { FeaturedRewards } from "./types";

export const PEDICURE_AND_ADORNMENTS_REWARDS = {
  pedicurePayout: (context, { actions }) =>
    actions.armCrit(context.floors, "crit"),
  toeRingRiches: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.toeRingRichesDiscount),
  punkRockPedicure: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.punkRockPedicureBoostSeconds, balance.punkRockPedicureExtraWorkers),
  bigHoopHustle: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.bigHoopHustleContinueChance),
  bluePolishPucker: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.bluePolishPuckerMultiple),
  greenToeGreenbacks: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.greenToeGreenbacksPayouts),
  emeraldToeEarnings: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.emeraldToeEarningsShare),
  greenToenailTease: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.greenToenailTeaseMultiple),
  pinkNailPointer: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.pinkNailPointerGrowth),
  tangerineToes: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.tangerineToesGrowth),
  salmonToesTease: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.salmonToesTeaseUpgrades),
  tropicToesKiss: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.tropicToesKissMultiple),
  coralToeCurl: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.coralToeCurlMultiple),
  hoopEarringSmooch: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.hoopEarringSmoochMultiple),
  goldWristbandKiss: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.goldWristbandKissUpgrades),
  bandanaSmooch: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.bandanaSmoochGrowth),
  ankleAsset: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.ankleAssetFloors),
  hotPinkPads: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.hotPinkPadsSeconds),
  hotPinkStreak: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.hotPinkStreakGrowth),
  daisyDuel: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.daisyDuelMultiple),
  pinkHeadbandPointer: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.pinkHeadbandPointerUpgrades),
  redHotSole: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.redHotSoleGrowth),
  lemonSole: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.lemonSoleDiscount),
  goldenBeltGrind: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.goldenBeltGrindBoostSeconds, balance.goldenBeltGrindExtraWorkers),
  bubblegumTwins: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.bubblegumTwinsDiscount),
  sunsetSoleSavings: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.sunsetSoleSavingsShare),
  topBunToes: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.topBunToesGrowth),
} satisfies FeaturedRewards<typeof PEDICURE_AND_ADORNMENTS_CRITS>;
