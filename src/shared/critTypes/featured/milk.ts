import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const MILK_CRITS = {
  calciumCapital: {
    label: "Calcium Capital",
    color: COLOR.overflowBlue,
    image: "crits/milk/calciumCapital.webp",
    description: "One tier promotion and nine upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(context.floor, balance.calciumCapitalTierSteps, balance.calciumCapitalUpgrades),
  },
  creamOfTheCrop: {
    label: "Cream Of The Crop",
    color: COLOR.chairGiveawayBrown,
    image: "crits/milk/creamOfTheCrop.webp",
    description: "Adds 5.4% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.creamOfTheCropShare),
  },
  dairyDividend: {
    label: "Dairy Dividend",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/milk/dairyDividend.webp",
    description: "Arms the lowest-level floor's next click as an x5 crit",
    reward: (context, { actions, lowestLevel }) =>
      actions.armCrit([lowestLevel(context)], "crit"),
  },
  gotMilk: {
    label: "Got Milk",
    color: COLOR.amber,
    image: "crits/milk/gotMilk.webp",
    description: "Raises the lowest-level floor to the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  },
  lactoseTycoon: {
    label: "Lactose Tycoon",
    color: COLOR.fastForwardBlue,
    image: "crits/milk/lactoseTycoon.webp",
    description: "Unlocks the next 5 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.lactoseTycoonFloors),
  },
  milkMoney: {
    label: "Milk Money",
    color: COLOR.orange,
    image: "crits/milk/milkMoney.webp",
    description: "Cuts every price in this building by 1.1%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.milkMoneyDiscount),
  },
  milkshakeMogul: {
    label: "Milkshake Mogul",
    color: COLOR.overflowBlue,
    image: "crits/milk/milkshakeMogul.webp",
    description: "Boosts every worker for 20s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.milkshakeMogulBoostSeconds, balance.milkshakeMogulExtraWorkers),
  },
  mooJuice: {
    label: "Moo Juice",
    color: COLOR.amberMuted,
    image: "crits/milk/mooJuice.webp",
    description: "Free office chairs for this floor",
    reward: (context, { actions }) =>
      actions.giveOfficeChairs([context.floor]),
  },
  skimProfits: {
    label: "Skim Profits",
    color: COLOR.amberMuted,
    image: "crits/milk/skimProfits.webp",
    description: "Repeats the crit on the floor below, 17% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.skimProfitsContinueChance),
  },
  udderSuccess: {
    label: "Udder Success",
    color: COLOR.sameBoatCoral,
    image: "crits/milk/udderSuccess.webp",
    description: "One tier promotion and six upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(context.floor, balance.udderSuccessTierSteps, balance.udderSuccessUpgrades),
  },
  wholeMilkHustle: {
    label: "Whole Milk Hustle",
    color: COLOR.overflowBlue,
    image: "crits/milk/wholeMilkHustle.webp",
    description: "Adds 22s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.wholeMilkHustleSeconds),
  },
  bottleService: {
    label: "Bottle Service",
    color: COLOR.amberMuted,
    image: "crits/milk/bottleService.webp",
    description: "Repeats the crit on the floor below, 37% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.bottleServiceContinueChance),
  },
  creameryCredit: {
    label: "Creamery Credit",
    color: COLOR.doubleDownCrimson,
    image: "crits/milk/creameryCredit.webp",
    description: "One tier promotion and seven upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(context.floor, balance.creameryCreditTierSteps, balance.creameryCreditUpgrades),
  },
  milkRun: {
    label: "Milk Run",
    color: COLOR.red,
    image: "crits/milk/milkRun.webp",
    description: "Raises alternating floors to the building's top level",
    reward: (context, { actions, alternating, topLevel }) =>
      actions.raiseLevels(alternating(context), topLevel(context)),
  },
  pintSizedProfits: {
    label: "Pint Sized Profits",
    color: COLOR.redActive,
    image: "crits/milk/pintSizedProfits.webp",
    description: "Unlocks the next 2 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.pintSizedProfitsFloors),
  },
  milkMustacheDrake: {
    label: "Milk Mustache Drake",
    color: COLOR.springCleaningMint,
    image: "crits/milk/milkMustacheDrake.webp",
    description: "Adds 14.9% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.milkMustacheDrakeShare),
  },
  bottleChugWyvern: {
    label: "Bottle Chug Wyvern",
    color: COLOR.rainCheckBlue,
    image: "crits/milk/bottleChugWyvern.webp",
    description: "Boosts every worker for 134s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.bottleChugWyvernBoostSeconds, balance.bottleChugWyvernExtraWorkers),
  },
  jadeGlassGuzzle: {
    label: "Jade Glass Guzzle",
    color: COLOR.moneyGreen,
    image: "crits/milk/jadeGlassGuzzle.webp",
    description: "Repeats the crit on the floor below, 85% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.jadeGlassGuzzleContinueChance),
  },
  calciumCrusher: {
    label: "Calcium Crusher",
    color: COLOR.overflowBlue,
    image: "crits/milk/calciumCrusher.webp",
    description: "Cuts every price in this building by 18%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.calciumCrusherDiscount),
  },
  glassHalfFull: {
    label: "Glass Half Full",
    color: COLOR.internSkyBlue,
    image: "crits/milk/glassHalfFull.webp",
    description: "Adds 46s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.glassHalfFullSeconds),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;