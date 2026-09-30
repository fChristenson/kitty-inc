import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const GEMS_CRITS = {
  amethyst: {
    label: "Amethyst",
    color: COLOR.purple,
    image: "crits/gems/amethyst.webp",
    description: "Arms this floor's next click as an x5 crit",
    reward: (context, { actions }) => actions.armCrit([context.floor], "crit"),
  },
  diamond: {
    label: "Diamond",
    color: COLOR.cyan,
    image: "crits/gems/diamond.webp",
    description: "Adds 3.5% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.diamondShare),
  },
  emerald: {
    label: "Emerald",
    color: COLOR.moneyGreen,
    image: "crits/gems/emerald.webp",
    description: "Adds 5s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.emeraldSeconds),
  },
  goldNugget: {
    label: "Gold Nugget",
    color: COLOR.gold,
    image: "crits/gems/goldNugget.webp",
    description: "Adds 3% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.goldNuggetShare),
  },
  goldRush: {
    label: "Gold Rush",
    color: COLOR.gold,
    image: "crits/gems/goldRush.webp",
    description: "Boosts this floor's workers for 23s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.goldRushBoostSeconds,
        balance.goldRushExtraWorkers,
      ),
  },
  ruby: {
    label: "Ruby",
    color: COLOR.red,
    image: "crits/gems/ruby.webp",
    description: "Adds 6s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.rubySeconds),
  },
  saphire: {
    label: "Sapphire",
    color: COLOR.blue,
    image: "crits/gems/saphire.webp",
    description: "Free office supplies for this floor",
    reward: (context, { actions }) =>
      actions.giveOfficeSupplies([context.floor]),
  },
  silverRush: {
    label: "Silver Rush",
    color: COLOR.silverTicketGray,
    image: "crits/gems/silverRush.webp",
    description: "Boosts this floor's workers for 21s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.silverRushBoostSeconds,
        balance.silverRushExtraWorkers,
      ),
  },
  rainbowGems: {
    label: "Rainbow Gems",
    color: COLOR.overflowBlue,
    image: "crits/gems/rainbowGems.webp",
    description: "Grows every unlocked floor's level by 2.3% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels(context.floors, balance.rainbowGemsGrowth),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
