import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const ICE_CREAM_CRITS = {
  bananaSplitBonus: {
    label: "Banana Split Bonus",
    color: COLOR.springCleaningMint,
    image: "crits/iceCream/bananaSplitBonus.webp",
    description: "Boosts every worker for 39s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.bananaSplitBonusBoostSeconds,
        balance.bananaSplitBonusExtraWorkers,
      ),
  },
  brainFreezeBonus: {
    label: "Brain Freeze Bonus",
    color: COLOR.teaBreakBrown,
    image: "crits/iceCream/brainFreezeBonus.webp",
    description: "Free office chairs for this floor",
    reward: (context, { actions }) => actions.giveOfficeChairs([context.floor]),
  },
  coneCapital: {
    label: "Cone Capital",
    color: COLOR.cyan,
    image: "crits/iceCream/coneCapital.webp",
    description:
      "Repeats the crit on the floor below, 12% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.coneCapitalContinueChance),
  },
  cookieDoughCash: {
    label: "Cookie Dough Cash",
    color: COLOR.coinGold,
    image: "crits/iceCream/cookieDoughCash.webp",
    description: "One tier promotion and nine upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.cookieDoughCashTierSteps,
        balance.cookieDoughCashUpgrades,
      ),
  },
  doubleScoopDividend: {
    label: "Double Scoop Dividend",
    color: COLOR.springCleaningMint,
    image: "crits/iceCream/doubleScoopDividend.webp",
    description: "Raises the lowest-level floor to the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  },
  frozenAssets: {
    label: "Frozen Assets",
    color: COLOR.fastForwardBlue,
    image: "crits/iceCream/frozenAssets.webp",
    description: "Unlocks the next 2 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.frozenAssetsFloors),
  },
  gelatoGains: {
    label: "Gelato Gains",
    color: COLOR.gold,
    image: "crits/iceCream/gelatoGains.webp",
    description: "Cuts every price in this building by 1.2%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.gelatoGainsDiscount),
  },
  hotFudgeHustle: {
    label: "Hot Fudge Hustle",
    color: COLOR.coinGold,
    image: "crits/iceCream/hotFudgeHustle.webp",
    description: "Adds 3% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.hotFudgeHustleShare),
  },
  maraschinoMoney: {
    label: "Maraschino Money",
    color: COLOR.teaBreakBrown,
    image: "crits/iceCream/maraschinoMoney.webp",
    description:
      "Repeats the crit above and below, 66% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(
        context,
        "both",
        balance.maraschinoMoneyContinueChance,
      ),
  },
  meltingMargin: {
    label: "Melting Margin",
    color: COLOR.doubleDownCrimson,
    image: "crits/iceCream/meltingMargin.webp",
    description: "Boosts every worker for 20s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.meltingMarginBoostSeconds,
        balance.meltingMarginExtraWorkers,
      ),
  },
  mintChipMoney: {
    label: "Mint Chip Money",
    color: COLOR.gold,
    image: "crits/iceCream/mintChipMoney.webp",
    description: "Free office chairs for every unlocked floor",
    reward: (context, { actions }) => actions.giveOfficeChairs(context.floors),
  },
  neapolitanNetWorth: {
    label: "Neapolitan Net Worth",
    color: COLOR.supplyRunTan,
    image: "crits/iceCream/neapolitanNetWorth.webp",
    description:
      "Repeats the crit on the floor above, 52% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(
        context,
        "up",
        balance.neapolitanNetWorthContinueChance,
      ),
  },
  popsicleProfits: {
    label: "Popsicle Profits",
    color: COLOR.fastForwardBlue,
    image: "crits/iceCream/popsicleProfits.webp",
    description: "One tier promotion and six upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.popsicleProfitsTierSteps,
        balance.popsicleProfitsUpgrades,
      ),
  },
  rockyRoadReturns: {
    label: "Rocky Road Returns",
    color: COLOR.teamBuildingCoral,
    image: "crits/iceCream/rockyRoadReturns.webp",
    description: "Arms this floor's next click as an x5 crit",
    reward: (context, { actions }) => actions.armCrit([context.floor], "crit"),
  },
  scoopDreams: {
    label: "Scoop Dreams",
    color: COLOR.blue,
    image: "crits/iceCream/scoopDreams.webp",
    description: "Raises the lowest-level floor to the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  },
  sherbetShares: {
    label: "Sherbet Shares",
    color: COLOR.amber,
    image: "crits/iceCream/sherbetShares.webp",
    description: "Unlocks the next 5 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.sherbetSharesFloors),
  },
  softServeSavings: {
    label: "Soft Serve Savings",
    color: COLOR.coinGold,
    image: "crits/iceCream/softServeSavings.webp",
    description: "Cuts every price in this building by 2.2%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.softServeSavingsDiscount),
  },
  sprinkleSurplus: {
    label: "Sprinkle Surplus",
    color: COLOR.overflowBlue,
    image: "crits/iceCream/sprinkleSurplus.webp",
    description: "Adds 25s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.sprinkleSurplusSeconds),
  },
  sundaeFunday: {
    label: "Sundae Funday",
    color: COLOR.supplyRunTan,
    image: "crits/iceCream/sundaeFunday.webp",
    description: "Boosts every worker for 40s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.sundaeFundayBoostSeconds,
        balance.sundaeFundayExtraWorkers,
      ),
  },
  waffleWealth: {
    label: "Dairy Wealth",
    color: COLOR.supplyRunTan,
    image: "crits/iceCream/waffleWealth.webp",
    description: "Free office supplies for this floor",
    reward: (context, { actions }) =>
      actions.giveOfficeSupplies([context.floor]),
  },
  coneZoneCredit: {
    label: "Cone Zone Credit",
    color: COLOR.teal,
    image: "crits/iceCream/coneZoneCredit.webp",
    description: "Adds 6% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.coneZoneCreditShare),
  },
  rainbowSherbetSurge: {
    label: "Rainbow Sherbet Surge",
    color: COLOR.fastForwardBlue,
    image: "crits/iceCream/rainbowSherbetSurge.webp",
    description: "Boosts every worker for 42s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.rainbowSherbetSurgeBoostSeconds,
        balance.rainbowSherbetSurgeExtraWorkers,
      ),
  },
  scoopStacker: {
    label: "Scoop Stacker",
    color: COLOR.amberMuted,
    image: "crits/iceCream/scoopStacker.webp",
    description:
      "Repeats the crit above and below, 69% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "both", balance.scoopStackerContinueChance),
  },
  dripLickDrake: {
    label: "Drip Lick Drake",
    color: COLOR.rainCheckBlue,
    image: "crits/iceCream/dripLickDrake.webp",
    description: "Repeats the crit on the floor below, 83% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.dripLickDrakeContinueChance),
  },
  scoopSplashDrake: {
    label: "Scoop Splash Drake",
    color: COLOR.rainCheckBlue,
    image: "crits/iceCream/scoopSplashDrake.webp",
    description: "Cuts every price in this building by 17.6%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.scoopSplashDrakeDiscount),
  },
  tankTopSherbet: {
    label: "Tank Top Sherbet",
    color: COLOR.rainCheckBlue,
    image: "crits/iceCream/tankTopSherbet.webp",
    description: "Adds 14.6% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.tankTopSherbetShare),
  },
  mintChipMuscle: {
    label: "Mint Chip Muscle",
    color: COLOR.coffeeRunTeal,
    image: "crits/iceCream/mintChipMuscle.webp",
    description: "Boosts every worker for 130s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.mintChipMuscleBoostSeconds, balance.mintChipMuscleExtraWorkers),
  },
  fingerLickFrost: {
    label: "Finger Lick Frost",
    color: COLOR.rainCheckBlue,
    image: "crits/iceCream/fingerLickFrost.webp",
    description: "Repeats the crit on the floor above, 84% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.fingerLickFrostContinueChance),
  },
  doubleScoopDrake: {
    label: "Double Scoop Drake",
    color: COLOR.overflowBlue,
    image: "crits/iceCream/doubleScoopDrake.webp",
    description: "Cuts every price in this building by 17.7%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.doubleScoopDrakeDiscount),
  },
  rockyRoadRumble: {
    label: "Rocky Road Rumble",
    color: COLOR.mysticTeal,
    image: "crits/iceCream/rockyRoadRumble.webp",
    description: "Adds 14.7% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.rockyRoadRumbleShare),
  },
  vanillaWyrm: {
    label: "Vanilla Wyrm",
    color: COLOR.coinGold,
    image: "crits/iceCream/vanillaWyrm.webp",
    description: "Boosts every worker for 131s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.vanillaWyrmBoostSeconds, balance.vanillaWyrmExtraWorkers),
  },
  blueRaspberryBrawler: {
    label: "Blue Raspberry Brawler",
    color: COLOR.rainCheckBlue,
    image: "crits/iceCream/blueRaspberryBrawler.webp",
    description: "Repeats the crit on the floor below, 84% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.blueRaspberryBrawlerContinueChance),
  },
  coldHardCash: {
    label: "Cold Hard Cash",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/iceCream/coldHardCash.webp",
    description: "Adds 23.4% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.coldHardCashShare),
  },
  coneglomerate: {
    label: "Coneglomerate",
    color: COLOR.teaBreakBrown,
    image: "crits/iceCream/coneglomerate.webp",
    description: "Thirty-nine free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.coneglomerateUpgrades),
  },
  jointAccount: {
    label: "Joint Account",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/iceCream/jointAccount.webp",
    description: "Adds 23.5% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.jointAccountShare),
  },
  shareTheWealth: {
    label: "Share the Wealth",
    color: COLOR.coinGold,
    image: "crits/iceCream/shareTheWealth.webp",
    description: "Adds 23.6% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.shareTheWealthShare),
  },
  sweetDeal: {
    label: "Sweet Deal",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/iceCream/sweetDeal.webp",
    description: "Fifteen instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.sweetDealPayouts),
  },
  vanillaVenture: {
    label: "Vanilla Venture",
    color: COLOR.starYellow,
    image: "crits/iceCream/vanillaVenture.webp",
    description: "Forty free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.vanillaVentureUpgrades),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
