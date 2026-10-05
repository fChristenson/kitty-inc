import type { RICHES_CRITS } from "../../critData/riches";
import type { FeaturedRewards } from "./types";

export const RICHES_REWARDS = {
  adamWhiskersen: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.adamWhiskersenTierSteps,
      balance.adamWhiskersenUpgrades,
    ),
  bankroll: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.bankrollShare),
  billBlizzard: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  bobPawge: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.bobPawgeFloors),
  bullionStack: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.bullionStackSeconds),
  cashCannon: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.cashCannonSeconds),
  fairExchange: (context, { actions }) =>
    actions.startEvent([context.floor], "frozen"),
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
  liquidAssets: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.liquidAssetsShare),
  midasTouch: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.midasTouchTierSteps,
      balance.midasTouchUpgrades,
    ),
  moneyPrinter: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.moneyPrinterSeconds),
  moneyTree: (context, { actions }) => actions.hireManagers([context.floor]),
  nuggetAvalanche: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.nuggetAvalanchePayouts),
  pennyJar: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.pennyJarDiscount),
  purrDenton: (context, { actions, balance, lowestLevel }) =>
    actions.upgrade([lowestLevel(context)], balance.purrDentonUpgrades),
  strikeItRich: (context, { actions }) => actions.giveOfficeChairs([context.floor]),
  vaultDoor: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.vaultDoorFloors),
  wishingWell: (context, { actions, highestFloor }) =>
    actions.armCrit([highestFloor(context)], "crit"),
  youKnowWhatStallion: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.youKnowWhatStallionBoostSeconds,
      balance.youKnowWhatStallionExtraWorkers,
    ),
  goldBar: (context, { actions }) => actions.giveOfficeChairs(context.floors),
  silverCoin: (context, { actions, balance, alternating }) =>
    actions.payCycles(alternating(context), balance.silverCoinPayouts),
  gildedCache: (context, { actions }) => {
    actions.giveOfficeChairs([context.floor]);
    actions.giveOfficeSupplies([context.floor]);
  },
  brassBanker: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.brassBankerFloors),
  citrusCoin: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  coinCascade: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.coinCascadeContinueChance),
  coinrootGrove: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.coinrootGroveContinueChance),
  allowance: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.allowanceBoostSeconds,
      balance.allowanceExtraWorkers,
    ),
  allowance2: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  lootBags: (context, { actions, balance, highestFloor }) =>
    actions.upgrade([highestFloor(context)], balance.lootBagsUpgrades),
  pocketMoney2: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.pocketMoney2Payouts),
  liquidAssets2: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  pocketMoney: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.pocketMoneyTierSteps,
      balance.pocketMoneyUpgrades,
    ),
  capitalCarousel: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.capitalCarouselPayouts),
  executiveEscalator: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.executiveEscalatorBoostSeconds,
      balance.executiveEscalatorExtraWorkers,
    ),
  fiscalFireworks: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.fiscalFireworksBoostSeconds,
      balance.fiscalFireworksExtraWorkers,
    ),
  gildedGong: (context, { actions, belowAndHere }) =>
    actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
  overtimeOracle: (context, { actions }) => actions.armCrit([context.floor], "mega"),
  paperworkPaladin: (context, { actions, balance, cheapest }) =>
    actions.upgrade([cheapest(context)], balance.paperworkPaladinUpgrades),
  payrollPagoda: (context, { actions, balance, belowAndHere }) =>
    actions.payCycles(belowAndHere(context), balance.payrollPagodaPayouts),
  pensionPinata: (context, { actions, balance, lowestLevel }) =>
    actions.payCycles([lowestLevel(context)], balance.pensionPinataPayouts),
  profitPretzel: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.profitPretzelContinueChance),
  receiptRocket: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.receiptRocketFloors),
  rubberBandReserve: (context, { actions }) =>
    actions.giveOfficeSupplies(context.floors),
  sovereignSnowglobe: (context, { balance, promoteAndUpgrade, selectByRate }) =>
    promoteAndUpgrade(
      selectByRate(context, true),
      balance.sovereignSnowglobeTierSteps,
      balance.sovereignSnowglobeUpgrades,
    ),
  velvetLockbox: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.velvetLockboxDiscount),
  looseChangeLauncher: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.looseChangeLauncherFloors),
} satisfies FeaturedRewards<typeof RICHES_CRITS>;
