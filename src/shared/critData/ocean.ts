import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const OCEAN_CRITS = {
  treasureMap: {
    label: "Treasure Map",
    color: COLOR.supplyRunTan,
    image: "crits/ocean/treasureMap.webp",
    description: "Adds 12s of your company's income",
  },
  captainLeFluff: {
    label: "Captain Le Fluff",
    color: COLOR.fullHouseCrimson,
    image: "crits/ocean/captainLeFluff.webp",
    description: "Twenty-eight upgrades on the highest unlocked floor",
  },
  divingBell: {
    label: "Deep Dive",
    color: COLOR.goldenHandshakeGold,
    image: "crits/ocean/divingBell.webp",
    description: "Two free upgrades cascading down from this floor",
  },
  flooringInspector: {
    label: "Flooring Inspector",
    color: COLOR.autumnSaleAmber,
    image: "crits/ocean/flooringInspector.webp",
    description: "Fifteen upgrades on this floor and every floor below",
  },
  kraken: {
    label: "Kraken",
    color: COLOR.royalFlushPurple,
    image: "crits/ocean/kraken.webp",
    description: "Twenty-seven payouts on every unlocked floor",
  },
  messageInABottle: {
    label: "Message in a Bottle",
    color: COLOR.threeOfAKindGreen,
    image: "crits/ocean/messageInABottle.webp",
    description: "Arms this floor's next click as an x5 crit",
  },
  lemonSails: {
    label: "Lemon Sails",
    color: COLOR.starYellow,
    image: "crits/ocean/lemonSails.webp",
    description: "Grows this floor's level by 20% in free upgrades",
  },
} as const satisfies Record<string, FeaturedCritData>;
