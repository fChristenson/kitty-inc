import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const DESSERTS_CRITS = {
  berryParfait: {
    label: "Berry Parfait",
    color: COLOR.peppermintPink,
    image: "crits/desserts/berryParfait.webp",
    description: "Thirty-two payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.berryParfaitPayouts),
  },
  lemonTart: {
    label: "Lemon Tart",
    color: COLOR.sunshineGold,
    image: "crits/desserts/lemonTart.webp",
    description:
      "Repeats the crit on the floor below, 34% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.lemonTartContinueChance),
  },
  berryShortcake: {
    label: "Berry Shortcake",
    color: COLOR.peppermintPink,
    image: "crits/desserts/berryShortcake.webp",
    description: "Thirty-three instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.berryShortcakePayouts),
  },
  cinnamonSwirl: {
    label: "Cinnamon Swirl",
    color: COLOR.autumnSaleAmber,
    image: "crits/desserts/cinnamonSwirl.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  chocolateCake: {
    label: "Chocolate Cake",
    color: COLOR.teaBreakBrown,
    image: "crits/desserts/chocolateCake.webp",
    description:
      "Repeats the crit on the floor above, 34% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.chocolateCakeContinueChance),
  },
  strawberryShortcake: {
    label: "Strawberry Shortcake",
    color: COLOR.springSalePink,
    image: "crits/desserts/strawberryShortcake.webp",
    description: "Twenty-eight instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.strawberryShortcakePayouts),
  },
  rainbowDonut: {
    label: "Rainbow Donut",
    color: COLOR.starYellow,
    image: "crits/desserts/rainbowDonut.webp",
    description: "Arms the highest floor's next click as an x5 crit",
    reward: (context, { actions, highestFloor }) =>
      actions.armCrit([highestFloor(context)], "crit"),
  },
  iceCreamSundae: {
    label: "Ice Cream Sundae",
    color: COLOR.blue,
    image: "crits/desserts/iceCreamSundae.webp",
    description: "Cuts every price in this building by 4%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.iceCreamSundaeDiscount),
  },
  iceCreamSundae2: {
    label: "Sundae Encore",
    color: COLOR.springSalePink,
    image: "crits/desserts/iceCreamSundae2.webp",
    description: "Boosts this floor's workers for 27s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers([context.floor], balance.iceCreamSundae2BoostSeconds, balance.iceCreamSundae2ExtraWorkers),
  },
  macaronTower: {
    label: "Macaron Tower",
    color: COLOR.springSalePink,
    image: "crits/desserts/macaronTower.webp",
    description: "Arms the lowest-level floor's next click as an x5 crit",
    reward: (context, { actions, lowestLevel }) =>
      actions.armCrit([lowestLevel(context)], "crit"),
  },
  macaronTower2: {
    label: "Macaron Crown",
    color: COLOR.starYellow,
    image: "crits/desserts/macaronTower2.webp",
    description: "One tier promotion and 14 upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.macaronTower2TierSteps,
        balance.macaronTower2Upgrades,
      ),
  },
  apple: {
    label: "Core Value",
    color: COLOR.red,
    image: "crits/desserts/apple.webp",
    description: "Twenty-two instant payouts on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.payCycles([lowestLevel(context)], balance.applePayouts),
  },
  cupcake: {
    label: "Buttercream Boom",
    color: COLOR.mysticTeal,
    image: "crits/desserts/cupcake.webp",
    description: "Twenty-six free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.cupcakeUpgrades),
  },
  donut: {
    label: "Glaze Runner",
    color: COLOR.springSalePink,
    image: "crits/desserts/donut.webp",
    description: "Thirty instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.donutPayouts),
  },
  berryCreamTray: {
    label: "Berry Cream Tray",
    color: COLOR.chairGiveawayBrown,
    image: "crits/desserts/berryCreamTray.webp",
    description: "Boosts every worker for 174s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.berryCreamTrayBoostSeconds, balance.berryCreamTrayExtraWorkers),
  },
  brownieBunch: {
    label: "Brownie Bunch",
    color: COLOR.chairGiveawayBrown,
    image: "crits/desserts/brownieBunch.webp",
    description: "Boosts every worker for 175s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.brownieBunchBoostSeconds, balance.brownieBunchExtraWorkers),
  },
  chocolateSpreadMorning: {
    label: "Chocolate Spread Morning",
    color: COLOR.chairGiveawayBrown,
    image: "crits/desserts/chocolateSpreadMorning.webp",
    description: "Boosts every worker for 176s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.chocolateSpreadMorningBoostSeconds, balance.chocolateSpreadMorningExtraWorkers),
  },
  macaronMedley: {
    label: "Macaron Medley",
    color: COLOR.fullHouseCrimson,
    image: "crits/desserts/macaronMedley.webp",
    description: "Boosts every worker for 177s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.macaronMedleyBoostSeconds, balance.macaronMedleyExtraWorkers),
  },
  pinkFrostingTrio: {
    label: "Pink Frosting Trio",
    color: COLOR.grandOpeningRose,
    image: "crits/desserts/pinkFrostingTrio.webp",
    description: "Boosts every worker for 178s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.pinkFrostingTrioBoostSeconds, balance.pinkFrostingTrioExtraWorkers),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
