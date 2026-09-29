import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const RICHES_CRITS = {
  adamWhiskersen: {
    label: "Adam Whiskersen",
    color: COLOR.goldStandardAmber,
    image: "crits/riches/adamWhiskersen.webp",
    description: "Two tier promotions and eight upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.adamWhiskersenTierSteps,
        balance.adamWhiskersenUpgrades,
      ),
  },
  bankroll: {
    label: "Bankroll",
    color: COLOR.paydayEmerald,
    image: "crits/riches/bankroll.webp",
    description: "Adds 6.4% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.bankrollShare),
  },
  billBlizzard: {
    label: "Bill Blizzard",
    color: COLOR.shareholdersGreen,
    image: "crits/riches/billBlizzard.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  bobPawge: {
    label: "Bob Pawge",
    color: COLOR.nightShiftIndigo,
    image: "crits/riches/bobPawge.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.bobPawgeFloors),
  },
  bullionStack: {
    label: "Bullion Brigade",
    color: COLOR.gold,
    image: "crits/riches/bullionStack.webp",
    description: "Adds 12s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.bullionStackSeconds),
  },
  cashCannon: {
    label: "Cash Cannon",
    color: COLOR.bonusRoundGold,
    image: "crits/riches/cashCannon.webp",
    description: "Adds 7s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.cashCannonSeconds),
  },
  fairExchange: {
    label: "Fair Exchange",
    color: COLOR.mergerGold,
    image: "crits/riches/fairExchange.webp",
    description: "Locks this floor's upgrade price for 5s",
    reward: (context, { actions }) =>
      actions.startEvent([context.floor], "frozen"),
  },
  gemMine: {
    label: "Gem Mine",
    color: COLOR.pairBlue,
    image: "crits/riches/gemMine.webp",
    description: "Adds 3.9% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.gemMineShare),
  },
  goldMine: {
    label: "Gold Mine",
    color: COLOR.supplyRunTan,
    image: "crits/riches/goldMine.webp",
    description: "Adds 7s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.goldMineSeconds),
  },
  goldenChalice: {
    label: "Golden Chalice",
    color: COLOR.sunshineGold,
    image: "crits/riches/goldenChalice.webp",
    description: "Two tier promotions and seven upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.goldenChaliceTierSteps,
        balance.goldenChaliceUpgrades,
      ),
  },
  goldenGoose: {
    label: "Golden Goose",
    color: COLOR.goldenTicketYellow,
    image: "crits/riches/goldenGoose.webp",
    description: "Adds 5.5% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.goldenGooseShare),
  },
  goldenStag: {
    label: "Golden Stag",
    color: COLOR.heavenlyGold,
    image: "crits/riches/goldenStag.webp",
    description: "Adds 11s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.goldenStagSeconds),
  },
  handsomeJake: {
    label: "Handsome Jake",
    color: COLOR.orange,
    image: "crits/riches/handsomeJake.webp",
    description: "Hires 1 free worker on this floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers([context.floor], balance.handsomeJakeWorkers),
  },
  jcDentclaw: {
    label: "JC Dentclaw",
    color: COLOR.nightOwlIndigo,
    image: "crits/riches/jcDentclaw.webp",
    description: "Twenty-six free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.jcDentclawUpgrades),
  },
  liquidAssets: {
    label: "Liquid Assets",
    color: COLOR.goldenHandshakeGold,
    image: "crits/riches/liquidAssets.webp",
    description: "Adds 5% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.liquidAssetsShare),
  },
  midasTouch: {
    label: "Midas Touch",
    color: COLOR.goldStandardAmber,
    image: "crits/riches/midasTouch.webp",
    description: "One tier promotion and thirteen upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.midasTouchTierSteps,
        balance.midasTouchUpgrades,
      ),
  },
  moneyPrinter: {
    label: "Money Printer",
    color: COLOR.bullMarketGreen,
    image: "crits/riches/moneyPrinter.webp",
    description: "Adds 12s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.moneyPrinterSeconds),
  },
  moneyTree: {
    label: "Money Tree",
    color: COLOR.moneyGreen,
    image: "crits/riches/moneyTree.webp",
    description: "Hires a free manager for this floor",
    reward: (context, { actions }) => actions.hireManagers([context.floor]),
  },
  nuggetAvalanche: {
    label: "Nugget Avalanche",
    color: COLOR.amber,
    image: "crits/riches/nuggetAvalanche.webp",
    description: "Seventeen instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.nuggetAvalanchePayouts),
  },
  pennyJar: {
    label: "Penny Jar",
    color: COLOR.headhunterRust,
    image: "crits/riches/pennyJar.webp",
    description: "Cuts every price in this building by 1.3%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.pennyJarDiscount),
  },
  purrDenton: {
    label: "Purr Denton",
    color: COLOR.fastForwardBlue,
    image: "crits/riches/purrDenton.webp",
    description: "Seventeen free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.purrDentonUpgrades),
  },
  strikeItRich: {
    label: "Strike It Rich",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/riches/strikeItRich.webp",
    description: "Free office chairs for this floor",
    reward: (context, { actions }) => actions.giveOfficeChairs([context.floor]),
  },
  vaultDoor: {
    label: "Vault Door",
    color: COLOR.unionBossSlate,
    image: "crits/riches/vaultDoor.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.vaultDoorFloors),
  },
  wishingWell: {
    label: "Wishing Well",
    color: COLOR.rainCheckBlue,
    image: "crits/riches/wishingWell.webp",
    description: "Arms the highest floor's next click as an x5 crit",
    reward: (context, { actions, highestFloor }) =>
      actions.armCrit([highestFloor(context)], "crit"),
  },
  youKnowWhatStallion: {
    label: "You Know What, Stallion",
    color: COLOR.royalFlushPurple,
    image: "crits/riches/youKnowWhatStallion.webp",
    description: "Boosts this floor's workers for 25s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.youKnowWhatStallionBoostSeconds,
        balance.youKnowWhatStallionExtraWorkers,
      ),
  },
  goldBar: {
    label: "Gold Bar",
    color: COLOR.gold,
    image: "crits/riches/goldBar.webp",
    description: "Free office chairs for every unlocked floor",
    reward: (context, { actions }) => actions.giveOfficeChairs(context.floors),
  },
  silverCoin: {
    label: "Silver Coin",
    color: COLOR.silverTicketGray,
    image: "crits/riches/silverCoin.webp",
    description: "Twenty-five payouts on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.silverCoinPayouts),
  },
  gildedCache: {
    label: "Gilded Cache",
    color: COLOR.gold,
    image: "crits/riches/gildedCache.webp",
    description: "Free office chairs and supplies for this floor",
    reward: (context, { actions }) => {
      actions.giveOfficeChairs([context.floor]);
      actions.giveOfficeSupplies([context.floor]);
    },
  },
  brassBanker: {
    label: "Brass Banker",
    color: COLOR.gold,
    image: "crits/riches/brassBanker.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.brassBankerFloors),
  },
  citrusCoin: {
    label: "Citrus Coin",
    color: COLOR.sunshineGold,
    image: "crits/riches/citrusCoin.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  coinCascade: {
    label: "Coin Cascade",
    color: COLOR.gold,
    image: "crits/riches/coinCascade.webp",
    description:
      "Repeats the crit on the floor below, 53% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.coinCascadeContinueChance),
  },
  coinrootGrove: {
    label: "Coinroot Grove",
    color: COLOR.moneyGreen,
    image: "crits/riches/coinrootGrove.webp",
    description:
      "Repeats the crit on the floor below, 30% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.coinrootGroveContinueChance),
  },
  allowance: {
    label: "Allowance",
    color: COLOR.moneyGreen,
    image: "crits/riches/allowance.webp",
    description: "Boosts every worker for 18s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.allowanceBoostSeconds,
        balance.allowanceExtraWorkers,
      ),
  },
  allowance2: {
    label: "Rainy Day Fund",
    color: COLOR.paydayEmerald,
    image: "crits/riches/allowance2.webp",
    description: "Raises the lowest-level floor to the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  },
  lootBags: {
    label: "Bagged and Tagged",
    color: COLOR.payoutOlive,
    image: "crits/riches/lootBags.webp",
    description: "Thirty-eight upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.lootBagsUpgrades),
  },
  pocketMoney2: {
    label: "Petty Cash",
    color: COLOR.bullMarketGreen,
    image: "crits/riches/pocketMoney2.webp",
    description: "Thirty-seven instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.pocketMoney2Payouts),
  },
  liquidAssets2: {
    label: "Fluid Capital",
    color: COLOR.espressoShotBrown,
    image: "crits/riches/liquidAssets2.webp",
    description: "Raises the lowest-level floor to the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  },
  pocketMoney: {
    label: "Pocket Money",
    color: COLOR.coinGold,
    image: "crits/riches/pocketMoney.webp",
    description: "One tier promotion and fifteen upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.pocketMoneyTierSteps,
        balance.pocketMoneyUpgrades,
      ),
  },
  capitalCarousel: {
    label: "Capital Carousel",
    color: COLOR.grandOpeningRose,
    image: "crits/riches/capitalCarousel.webp",
    description: "Forty-nine payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.capitalCarouselPayouts),
  },
  executiveEscalator: {
    label: "Executive Escalator",
    color: COLOR.fastForwardBlue,
    image: "crits/riches/executiveEscalator.webp",
    description: "Boosts every worker for 54s, counting as 1 extra worker",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.executiveEscalatorBoostSeconds,
        balance.executiveEscalatorExtraWorkers,
      ),
  },
  fiscalFireworks: {
    label: "Fiscal Fireworks",
    color: COLOR.royalFlushPurple,
    image: "crits/riches/fiscalFireworks.webp",
    description: "Boosts every worker for 73s, counting as 2 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.fiscalFireworksBoostSeconds,
        balance.fiscalFireworksExtraWorkers,
      ),
  },
  gildedGong: {
    label: "Gilded Gong",
    color: COLOR.bonusRoundGold,
    image: "crits/riches/gildedGong.webp",
    description: "Raises every floor below this one to its level",
    reward: (context, { actions, belowAndHere }) =>
      actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
  },
  overtimeOracle: {
    label: "Overtime Oracle",
    color: COLOR.dressCodeGreen,
    image: "crits/riches/overtimeOracle.webp",
    description: "Arms this floor's next click as an x25 crit",
    reward: (context, { actions }) => actions.armCrit([context.floor], "mega"),
  },
  paperworkPaladin: {
    label: "Paperwork Paladin",
    color: COLOR.red,
    image: "crits/riches/paperworkPaladin.webp",
    description: "Sixty upgrades on the cheapest floor to upgrade",
    reward: (context, { actions, balance, cheapest }) =>
      actions.upgrade([cheapest(context)], balance.paperworkPaladinUpgrades),
  },
  payrollPagoda: {
    label: "Payroll Pagoda",
    color: COLOR.mysticTeal,
    image: "crits/riches/payrollPagoda.webp",
    description: "Fifty-two payouts on this floor and every floor below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.payCycles(belowAndHere(context), balance.payrollPagodaPayouts),
  },
  pensionPinata: {
    label: "Pension Pinata",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/riches/pensionPinata.webp",
    description: "Sixty-three payouts on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.payCycles([lowestLevel(context)], balance.pensionPinataPayouts),
  },
  profitPretzel: {
    label: "Profit Pretzel",
    color: COLOR.goldStandardAmber,
    image: "crits/riches/profitPretzel.webp",
    description:
      "Repeats the crit on the floor above, 61% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.profitPretzelContinueChance),
  },
  receiptRocket: {
    label: "Receipt Rocket",
    color: COLOR.internSkyBlue,
    image: "crits/riches/receiptRocket.webp",
    description: "Unlocks the next 2 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.receiptRocketFloors),
  },
  rubberBandReserve: {
    label: "Rubber Band Reserve",
    color: COLOR.goldenTicketYellow,
    image: "crits/riches/rubberBandReserve.webp",
    description: "Free office supplies for every unlocked floor",
    reward: (context, { actions }) =>
      actions.giveOfficeSupplies(context.floors),
  },
  sovereignSnowglobe: {
    label: "Sovereign Snowglobe",
    color: COLOR.goldenHandshakeGold,
    image: "crits/riches/sovereignSnowglobe.webp",
    description:
      "One tier promotion and thirty-nine upgrades on the top earner",
    reward: (context, { balance, promoteAndUpgrade, selectByRate }) =>
      promoteAndUpgrade(
        selectByRate(context, true),
        balance.sovereignSnowglobeTierSteps,
        balance.sovereignSnowglobeUpgrades,
      ),
  },
  velvetLockbox: {
    label: "Velvet Lockbox",
    color: COLOR.doubleDownCrimson,
    image: "crits/riches/velvetLockbox.webp",
    description: "Cuts every price in this building by 7.9%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.velvetLockboxDiscount),
  },
  looseChangeLauncher: {
    label: "Loose Change Launcher",
    color: COLOR.rainCheckBlue,
    image: "crits/riches/looseChangeLauncher.webp",
    description: "Unlocks the next 2 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.looseChangeLauncherFloors),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
