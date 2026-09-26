import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const GEMS_CRITS = {
  amethyst: {
    label: "Amethyst",
    color: COLOR.purple,
    image: "crits/gems/amethyst.png",
    description: "Six instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.amethystPayouts),
  },
  diamond: {
    label: "Diamond",
    color: COLOR.cyan,
    image: "crits/gems/diamond.png",
    description: "Twenty-four instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.diamondPayouts),
  },
  emerald: {
    label: "Emerald",
    color: COLOR.moneyGreen,
    image: "crits/gems/emerald.png",
    description: "Nine instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.emeraldPayouts),
  },
  goldNugget: {
    label: "Gold Nugget",
    color: COLOR.gold,
    image: "crits/gems/goldNugget.png",
    description: "Four instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.goldNuggetPayouts),
  },
  goldRush: {
    label: "Gold Rush",
    color: COLOR.gold,
    image: "crits/gems/goldRush.png",
    description: "Ten instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.goldRushPayouts),
  },
  ruby: {
    label: "Ruby",
    color: COLOR.red,
    image: "crits/gems/ruby.png",
    description: "Twelve instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.rubyPayouts),
  },
  saphire: {
    label: "Sapphire",
    color: COLOR.blue,
    image: "crits/gems/saphire.png",
    description: "Eighteen instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.saphirePayouts),
  },
  silverRush: {
    label: "Silver Rush",
    color: COLOR.silverTicketGray,
    image: "crits/gems/silverRush.png",
    description: "Six instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.silverRushPayouts),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
