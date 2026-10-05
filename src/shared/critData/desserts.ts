import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const DESSERTS_CRITS = {
  berryParfait: {
    label: "Berry Parfait",
    color: COLOR.peppermintPink,
    image: "crits/desserts/berryParfait.webp",
    description: "Thirty-two payouts on every unlocked floor",
  },
  lemonTart: {
    label: "Lemon Tart",
    color: COLOR.sunshineGold,
    image: "crits/desserts/lemonTart.webp",
    description:
      "Repeats the crit on the floor below, 34% chance to keep falling",
  },
  berryShortcake: {
    label: "Berry Shortcake",
    color: COLOR.peppermintPink,
    image: "crits/desserts/berryShortcake.webp",
    description: "Thirty-three instant payouts on this floor",
  },
  cinnamonSwirl: {
    label: "Cinnamon Swirl",
    color: COLOR.autumnSaleAmber,
    image: "crits/desserts/cinnamonSwirl.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
  },
  chocolateCake: {
    label: "Chocolate Cake",
    color: COLOR.teaBreakBrown,
    image: "crits/desserts/chocolateCake.webp",
    description:
      "Repeats the crit on the floor above, 34% chance to keep climbing",
  },
  strawberryShortcake: {
    label: "Strawberry Shortcake",
    color: COLOR.springSalePink,
    image: "crits/desserts/strawberryShortcake.webp",
    description: "Twenty-eight instant payouts on this floor",
  },
  rainbowDonut: {
    label: "Rainbow Donut",
    color: COLOR.starYellow,
    image: "crits/desserts/rainbowDonut.webp",
    description: "Arms the highest floor's next click as an x5 crit",
  },
  iceCreamSundae: {
    label: "Ice Cream Sundae",
    color: COLOR.blue,
    image: "crits/desserts/iceCreamSundae.webp",
    description: "Cuts every price in this building by 4%",
  },
  iceCreamSundae2: {
    label: "Sundae Encore",
    color: COLOR.springSalePink,
    image: "crits/desserts/iceCreamSundae2.webp",
    description: "Boosts this floor's workers for 27s",
  },
  macaronTower: {
    label: "Macaron Tower",
    color: COLOR.springSalePink,
    image: "crits/desserts/macaronTower.webp",
    description: "Arms the lowest-level floor's next click as an x5 crit",
  },
  macaronTower2: {
    label: "Macaron Crown",
    color: COLOR.starYellow,
    image: "crits/desserts/macaronTower2.webp",
    description: "One tier promotion and 14 upgrades here",
  },
  apple: {
    label: "Core Value",
    color: COLOR.red,
    image: "crits/desserts/apple.webp",
    description: "Twenty-two instant payouts on the lowest-level floor",
  },
  cupcake: {
    label: "Buttercream Boom",
    color: COLOR.mysticTeal,
    image: "crits/desserts/cupcake.webp",
    description: "Twenty-six free upgrades on this floor",
  },
  donut: {
    label: "Glaze Runner",
    color: COLOR.springSalePink,
    image: "crits/desserts/donut.webp",
    description: "Thirty instant payouts on this floor",
  },
  berryCreamTray: {
    label: "Berry Cream Tray",
    color: COLOR.chairGiveawayBrown,
    image: "crits/desserts/berryCreamTray.webp",
    description: "Boosts every worker for 174s, counting as 3 extra workers",
  },
  brownieBunch: {
    label: "Brownie Bunch",
    color: COLOR.chairGiveawayBrown,
    image: "crits/desserts/brownieBunch.webp",
    description: "Boosts every worker for 175s, counting as 3 extra workers",
  },
  chocolateSpreadMorning: {
    label: "Chocolate Spread Morning",
    color: COLOR.chairGiveawayBrown,
    image: "crits/desserts/chocolateSpreadMorning.webp",
    description: "Boosts every worker for 176s, counting as 3 extra workers",
  },
  macaronMedley: {
    label: "Macaron Medley",
    color: COLOR.fullHouseCrimson,
    image: "crits/desserts/macaronMedley.webp",
    description: "Boosts every worker for 177s, counting as 3 extra workers",
  },
  pinkFrostingTrio: {
    label: "Pink Frosting Trio",
    color: COLOR.grandOpeningRose,
    image: "crits/desserts/pinkFrostingTrio.webp",
    description: "Boosts every worker for 178s, counting as 3 extra workers",
  },
} as const satisfies Record<string, FeaturedCritData>;
