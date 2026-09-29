import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const OCEAN_CRITS = {
  treasureMap: {
    label: "Treasure Map",
    color: COLOR.supplyRunTan,
    image: "crits/ocean/treasureMap.webp",
    description: "Adds 12s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.treasureMapSeconds),
  },
  captainLeFluff: {
    label: "Captain Le Fluff",
    color: COLOR.fullHouseCrimson,
    image: "crits/ocean/captainLeFluff.webp",
    description: "Twenty-eight upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.captainLeFluffUpgrades),
  },
  divingBell: {
    label: "Deep Dive",
    color: COLOR.goldenHandshakeGold,
    image: "crits/ocean/divingBell.webp",
    description: "Two free upgrades cascading down from this floor",
    reward: (context, { actions, balance, cascadeDown }) =>
      actions.upgrade(cascadeDown(context), balance.divingBellUpgrades),
  },
  flooringInspector: {
    label: "Flooring Inspector",
    color: COLOR.autumnSaleAmber,
    image: "crits/ocean/flooringInspector.webp",
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
    image: "crits/ocean/kraken.webp",
    description: "Twenty-seven payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.krakenPayouts),
  },
  messageInABottle: {
    label: "Message in a Bottle",
    color: COLOR.threeOfAKindGreen,
    image: "crits/ocean/messageInABottle.webp",
    description: "Arms this floor's next click as an x5 crit",
    reward: (context, { actions }) => actions.armCrit([context.floor], "crit"),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
