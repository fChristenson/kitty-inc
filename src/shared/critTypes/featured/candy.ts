import type { CANDY_CRITS } from "../../critData/candy";
import type { FeaturedRewards } from "./types";

export const CANDY_REWARDS = {
  chocolateFountainOfYouth: (context, { actions, balance }) =>
    actions.payCycles(
      [context.floor],
      balance.chocolateFountainOfYouthPayouts,
    ),
  gummyBearMarket: (context, { actions, balance }) =>
    actions.upgrade(context.floors, balance.gummyBearMarketUpgrades),
  jawbreaker: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  licoriceLaces: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.licoriceLacesDiscount),
  lollipopGuild: (context, { actions }) => actions.giveOfficeChairs([context.floor]),
  marshmallowMountain: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.marshmallowMountainBoostSeconds,
      balance.marshmallowMountainExtraWorkers,
    ),
  sugarHigh: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.sugarHighBoostSeconds,
      balance.sugarHighExtraWorkers,
    ),
  bubblegumBalloon: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.bubblegumBalloonContinueChance),
  candyCaneClimber: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.candyCaneClimberFloors),
  sherbetSherpa: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.sherbetSherpaPayouts),
  toffeeTrap: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.toffeeTrapUpgrades),
  cottonCandyCloud: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.cottonCandyCloudPayouts),
  fudgeIt: (context, { actions }) => actions.armCrit([context.floor], "crit"),
  gobstopperGetaway: (context, { actions, balance, highestFloor }) =>
    actions.upgrade(
      [highestFloor(context)],
      balance.gobstopperGetawayUpgrades,
    ),
  jellyBeanJamboree: (context, { actions, balance, alternating }) =>
    actions.payCycles(alternating(context), balance.jellyBeanJamboreePayouts),
  rockCandyQuarry: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.rockCandyQuarryTierSteps,
      balance.rockCandyQuarryUpgrades,
    ),
  sprinkleStorm: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.sprinkleStormContinueChance),
  candyCastle: (context, { actions }) => actions.armCrit([context.floor], "mega"),
  caramelApple: (context, { actions, highestFloor }) =>
    actions.armCrit([highestFloor(context)], "crit"),
  moonlitMint: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.moonlitMintWorkers),
  gumdropGazillionaire: (context, { actions, balance }) =>
    actions.discountPrices(
      context.floors,
      balance.gumdropGazillionaireDiscount,
    ),
  candyCornCornucopia: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.candyCornCornucopiaPayouts),
  butterscotchBuyout: (context, { actions, balance }) =>
    actions.discountPrices(
      context.floors,
      balance.butterscotchBuyoutDiscount,
    ),
  sourStrawSprint: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.sourStrawSprintBoostSeconds,
      balance.sourStrawSprintExtraWorkers,
    ),
  pralinePremium: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.pralinePremiumTierSteps,
      balance.pralinePremiumUpgrades,
    ),
  fizzyFortune: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.fizzyFortuneShare),
  marzipanMogul: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.marzipanMogulSeconds),
  gummyWormWealth: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.gummyWormWealthSeconds),
  chocolateCoinCartel: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.chocolateCoinCartelShare),
  honeycombHustle: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.honeycombHustleBoostSeconds,
      balance.honeycombHustleExtraWorkers,
    ),
  candyComet: (context, { actions, balance, cascadeDown }) =>
    actions.upgrade(cascadeDown(context), balance.candyCometUpgrades),
  taffyTornado: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.taffyTornadoContinueChance),
  candyGrudge: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.candyGrudgeDiscount),
  caramelCascade: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.caramelCascadeContinueChance),
  chocolateComet: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.chocolateCometBoostSeconds, balance.chocolateCometExtraWorkers),
  mintyFreshStart: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(context.floor, balance.mintyFreshStartTierSteps, balance.mintyFreshStartUpgrades),
  nougatNap: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.nougatNapSeconds),
  sourPower: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.sourPowerDiscount),
  truffleShuffle: (context, { actions, belowAndHere }) =>
    actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
  chocBlockJumble: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.chocBlockJumbleUpgrades),
  pinwheelPile: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.pinwheelPileGrowth),
  twistWrapTumble: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.twistWrapTumbleUpgrades),
} satisfies FeaturedRewards<typeof CANDY_CRITS>;
