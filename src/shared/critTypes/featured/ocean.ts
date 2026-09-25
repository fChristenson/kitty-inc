import type { CritProcDisplayInfo } from "../index";
import { COLOR } from "../../../palette";

export const OCEAN_CRIT_INFO = {
  treasureMap: {
    label: "Treasure Map",
    color: COLOR.supplyRunTan,
    icon: "treasureMap",
    description: "Twenty-five payouts from the highest-earning floor",
  },
  captainLeFluff: {
    label: "Captain Le Fluff",
    color: COLOR.fullHouseCrimson,
    icon: "captainLeFluff",
    description: "Twenty-eight upgrades on the highest unlocked floor",
  },
  divingBell: {
    label: "Deep Dive",
    color: COLOR.goldenHandshakeGold,
    icon: "divingBell",
    description: "Two free upgrades cascading down from this floor",
  },
  flooringInspector: {
    label: "Flooring Inspector",
    color: COLOR.autumnSaleAmber,
    icon: "flooringInspector",
    description: "Fifteen upgrades on this floor and every floor below",
  },
  kraken: {
    label: "Kraken",
    color: COLOR.royalFlushPurple,
    icon: "kraken",
    description: "Twenty-seven payouts on every unlocked floor",
  },
  messageInABottle: {
    label: "Message in a Bottle",
    color: COLOR.threeOfAKindGreen,
    icon: "messageInABottle",
    description: "Twenty free upgrades on the lowest-level floor",
  },
} as const satisfies Record<string, CritProcDisplayInfo>;
