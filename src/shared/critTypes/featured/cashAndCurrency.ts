import type { CASH_AND_CURRENCY_CRITS } from "../../critData/cashAndCurrency";
import type { FeaturedRewards } from "./types";

export const CASH_AND_CURRENCY_REWARDS = {
  bankroll: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.bankrollShare),
  billBlizzard: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  cashCannon: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.cashCannonSeconds),
  fairExchange: (context, { actions }) =>
    actions.startEvent([context.floor], "frozen"),
  liquidAssets: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.liquidAssetsShare),
  moneyPrinter: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.moneyPrinterSeconds),
  moneyTree: (context, { actions }) => actions.hireManagers([context.floor]),
  pennyJar: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.pennyJarDiscount),
  vaultDoor: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.vaultDoorFloors),
  silverCoin: (context, { actions, balance, alternating }) =>
    actions.payCycles(alternating(context), balance.silverCoinPayouts),
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
  fiscalFireworks: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.fiscalFireworksBoostSeconds,
      balance.fiscalFireworksExtraWorkers,
    ),
  payrollPagoda: (context, { actions, balance, belowAndHere }) =>
    actions.payCycles(belowAndHere(context), balance.payrollPagodaPayouts),
  pensionPinata: (context, { actions, balance, lowestLevel }) =>
    actions.payCycles([lowestLevel(context)], balance.pensionPinataPayouts),
  receiptRocket: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.receiptRocketFloors),
  rubberBandReserve: (context, { actions }) =>
    actions.giveOfficeSupplies(context.floors),
  looseChangeLauncher: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.looseChangeLauncherFloors),
} satisfies FeaturedRewards<typeof CASH_AND_CURRENCY_CRITS>;
