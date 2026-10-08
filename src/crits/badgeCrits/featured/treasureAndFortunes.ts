import type {
  TREASURE_AND_FORTUNES_CRITS,
} from "../critData/treasureAndFortunes";
import type { FeaturedRewards } from "./types";

export const TREASURE_AND_FORTUNES_REWARDS = {
  adamWhiskersen: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.adamWhiskersenTierSteps,
      balance.adamWhiskersenUpgrades,
    ),
  bobPawge: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.bobPawgeFloors),
  bullionStack: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.bullionStackSeconds),
  gemMine: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.gemMineShare),
  goldMine: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.goldMineSeconds),
  goldenChalice: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.goldenChaliceTierSteps,
      balance.goldenChaliceUpgrades,
    ),
  goldenGoose: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.goldenGooseShare),
  goldenStag: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.goldenStagSeconds),
  handsomeJake: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.handsomeJakeWorkers),
  jcDentclaw: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.jcDentclawUpgrades),
  midasTouch: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.midasTouchTierSteps,
      balance.midasTouchUpgrades,
    ),
  nuggetAvalanche: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.nuggetAvalanchePayouts),
  purrDenton: (context, { actions, balance, lowestLevel }) =>
    actions.upgrade([lowestLevel(context)], balance.purrDentonUpgrades),
  strikeItRich: (context, { actions }) => actions.giveOfficeChairs([context.floor]),
  wishingWell: (context, { actions, highestFloor }) =>
    actions.armCrit([highestFloor(context)], "crit"),
  youKnowWhatStallion: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.youKnowWhatStallionBoostSeconds,
      balance.youKnowWhatStallionExtraWorkers,
    ),
  goldBar: (context, { actions }) => actions.giveOfficeChairs(context.floors),
  gildedCache: (context, { actions }) => {
    actions.giveOfficeChairs([context.floor]);
    actions.giveOfficeSupplies([context.floor]);
  },
  executiveEscalator: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.executiveEscalatorBoostSeconds,
      balance.executiveEscalatorExtraWorkers,
    ),
  gildedGong: (context, { actions, belowAndHere }) =>
    actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
  overtimeOracle: (context, { actions }) => actions.armCrit([context.floor], "mega"),
  paperworkPaladin: (context, { actions, balance, cheapest }) =>
    actions.upgrade([cheapest(context)], balance.paperworkPaladinUpgrades),
  profitPretzel: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.profitPretzelContinueChance),
  sovereignSnowglobe: (context, { balance, promoteAndUpgrade, selectByRate }) =>
    promoteAndUpgrade(
      selectByRate(context, true),
      balance.sovereignSnowglobeTierSteps,
      balance.sovereignSnowglobeUpgrades,
    ),
  velvetLockbox: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.velvetLockboxDiscount),
} satisfies FeaturedRewards<typeof TREASURE_AND_FORTUNES_CRITS>;
