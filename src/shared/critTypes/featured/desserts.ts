import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const DESSERTS_CRITS = {
  berryParfait: {
    label: "Berry Parfait",
    color: COLOR.peppermintPink,
    image: "crits/desserts/berryParfait.png",
    description: "Thirty-two payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.berryParfaitPayouts),
  },
  lemonTart: {
    label: "Lemon Tart",
    color: COLOR.sunshineGold,
    image: "crits/desserts/lemonTart.png",
    description: "Thirty-six upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.lemonTartUpgrades),
  },
  berryShortcake: {
    label: "Berry Shortcake",
    color: COLOR.peppermintPink,
    image: "crits/desserts/berryShortcake.png",
    description: "Thirty-three instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.berryShortcakePayouts),
  },
  cinnamonSwirl: {
    label: "Cinnamon Swirl",
    color: COLOR.autumnSaleAmber,
    image: "crits/desserts/cinnamonSwirl.png",
    description: "Twenty-six upgrades on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.cinnamonSwirlUpgrades),
  },
  chocolateCake: {
    label: "Chocolate Cake",
    color: COLOR.teaBreakBrown,
    image: "crits/desserts/chocolateCake.png",
    description: "Thirty free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.chocolateCakeUpgrades),
  },
  strawberryShortcake: {
    label: "Strawberry Shortcake",
    color: COLOR.springSalePink,
    image: "crits/desserts/strawberryShortcake.png",
    description: "Twenty-eight instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.strawberryShortcakePayouts),
  },
  rainbowDonut: {
    label: "Rainbow Donut",
    color: COLOR.starYellow,
    image: "crits/desserts/rainbowDonut.png",
    description: "Twenty-one free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.rainbowDonutUpgrades),
  },
  iceCreamSundae: {
    label: "Ice Cream Sundae",
    color: COLOR.blue,
    image: "crits/desserts/iceCreamSundae.png",
    description: "Thirty-four instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.iceCreamSundaePayouts),
  },
  iceCreamSundae2: {
    label: "Sundae Encore",
    color: COLOR.springSalePink,
    image: "crits/desserts/iceCreamSundae2.png",
    description: "Twenty-nine free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.iceCreamSundae2Upgrades),
  },
  macaronTower: {
    label: "Macaron Tower",
    color: COLOR.springSalePink,
    image: "crits/desserts/macaronTower.png",
    description: "Thirty-three instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.macaronTowerPayouts),
  },
  macaronTower2: {
    label: "Macaron Crown",
    color: COLOR.starYellow,
    image: "crits/desserts/macaronTower2.png",
    description: "Thirty-one free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.macaronTower2Upgrades),
  },
  apple: {
    label: "Core Value",
    color: COLOR.red,
    image: "crits/desserts/apple.png",
    description: "Twenty-two instant payouts on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.payCycles([lowestLevel(context)], balance.applePayouts),
  },
  cupcake: {
    label: "Buttercream Boom",
    color: COLOR.mysticTeal,
    image: "crits/desserts/cupcake.png",
    description: "Twenty-six free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.cupcakeUpgrades),
  },
  donut: {
    label: "Glaze Runner",
    color: COLOR.springSalePink,
    image: "crits/desserts/donut.png",
    description: "Thirty instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.donutPayouts),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
