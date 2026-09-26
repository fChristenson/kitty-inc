import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const OCEAN_CRITS = {
  treasureMap: {
    label: "Treasure Map",
    color: COLOR.supplyRunTan,
    image: "crits/ocean/treasureMap.png",
    description: "Twenty-five payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.treasureMapPayouts,
      ),
  },
  captainLeFluff: {
    label: "Captain Le Fluff",
    color: COLOR.fullHouseCrimson,
    image: "crits/ocean/captainLeFluff.png",
    description: "Twenty-eight upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.captainLeFluffUpgrades),
  },
  divingBell: {
    label: "Deep Dive",
    color: COLOR.goldenHandshakeGold,
    image: "crits/ocean/divingBell.png",
    description: "Two free upgrades cascading down from this floor",
    reward: (context, { actions, balance, cascadeDown }) =>
      actions.upgrade(cascadeDown(context), balance.divingBellUpgrades),
  },
  flooringInspector: {
    label: "Flooring Inspector",
    color: COLOR.autumnSaleAmber,
    image: "crits/ocean/flooringInspector.png",
    description: "Fifteen upgrades on this floor and every floor below",
    reward: (context, { actions, balance }) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.flooringInspectorUpgrades,
      ),
  },
  kraken: {
    label: "Kraken",
    color: COLOR.royalFlushPurple,
    image: "crits/ocean/kraken.png",
    description: "Twenty-seven payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.krakenPayouts),
  },
  messageInABottle: {
    label: "Message in a Bottle",
    color: COLOR.threeOfAKindGreen,
    image: "crits/ocean/messageInABottle.png",
    description: "Twenty free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.messageInABottleUpgrades),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
