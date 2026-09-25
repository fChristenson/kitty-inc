import type { CritProcDisplayInfo } from "../index";
import { COLOR } from "../../../palette";

export const DESSERTS_CRIT_INFO = {
  berryParfait: {
    label: "Berry Parfait",
    color: COLOR.peppermintPink,
    icon: "berryParfait",
    description: "Thirty-two payouts on every unlocked floor",
  },
  lemonTart: {
    label: "Lemon Tart",
    color: COLOR.sunshineGold,
    icon: "lemonTart",
    description: "Thirty-six upgrades on the highest unlocked floor",
  },
  berryShortcake: {
    label: "Berry Shortcake",
    color: COLOR.peppermintPink,
    icon: "berryShortcake",
    description: "Thirty-three instant payouts on this floor",
  },
  cinnamonSwirl: {
    label: "Cinnamon Swirl",
    color: COLOR.autumnSaleAmber,
    icon: "cinnamonSwirl",
    description: "Twenty-six upgrades on alternating floors",
  },
  chocolateCake: {
    label: "Chocolate Cake",
    color: COLOR.teaBreakBrown,
    icon: "chocolateCake",
    description: "Thirty free upgrades on this floor",
  },
  strawberryShortcake: {
    label: "Strawberry Shortcake",
    color: COLOR.springSalePink,
    icon: "strawberryShortcake",
    description: "Twenty-eight instant payouts on this floor",
  },
  rainbowDonut: {
    label: "Rainbow Donut",
    color: COLOR.starYellow,
    icon: "rainbowDonut",
    description: "Twenty-one free upgrades on this floor",
  },
  iceCreamSundae: {
    label: "Ice Cream Sundae",
    color: COLOR.blue,
    icon: "iceCreamSundae",
    description: "Thirty-four instant payouts on every unlocked floor",
  },
  iceCreamSundae2: {
    label: "Sundae Encore",
    color: COLOR.springSalePink,
    icon: "iceCreamSundae2",
    description: "Twenty-nine free upgrades on this floor",
  },
  macaronTower: {
    label: "Macaron Tower",
    color: COLOR.springSalePink,
    icon: "macaronTower",
    description: "Thirty-three instant payouts on every unlocked floor",
  },
  macaronTower2: {
    label: "Macaron Crown",
    color: COLOR.starYellow,
    icon: "macaronTower2",
    description: "Thirty-one free upgrades on this floor",
  },
  apple: {
    label: "Core Value",
    color: COLOR.red,
    icon: "apple",
    description: "Twenty-two instant payouts on the lowest-level floor",
  },
  cupcake: {
    label: "Buttercream Boom",
    color: COLOR.mysticTeal,
    icon: "cupcake",
    description: "Twenty-six free upgrades on this floor",
  },
  donut: {
    label: "Glaze Runner",
    color: COLOR.springSalePink,
    icon: "donut",
    description: "Thirty instant payouts on this floor",
  },
} as const satisfies Record<string, CritProcDisplayInfo>;
