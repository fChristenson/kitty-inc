import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const SUPERHEROES_CRITS = {
  purrfectOrigin: {
    label: "Purrfect Origin",
    color: COLOR.sunshineGold,
    image: "crits/superheroes/purrfectOrigin.webp",
    description: "Arms this floor's next click as an x5 crit",
    reward: (context, { actions }) => actions.armCrit([context.floor], "crit"),
  },
  capeEscape: {
    label: "Cape Escape",
    color: COLOR.red,
    image: "crits/superheroes/capeEscape.webp",
    description: "Cuts every price in this building by 1.3%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.capeEscapeDiscount),
  },
  thunderPaws: {
    label: "Thunder Paws",
    color: COLOR.blue,
    image: "crits/superheroes/thunderPaws.webp",
    description: "Boosts this floor's workers for 23s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.thunderPawsBoostSeconds,
        balance.thunderPawsExtraWorkers,
      ),
  },
  clawAndOrder: {
    label: "Claw and Order",
    color: COLOR.cyan,
    image: "crits/superheroes/clawAndOrder.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  felineFury: {
    label: "Feline Fury",
    color: COLOR.fullHouseCrimson,
    image: "crits/superheroes/felineFury.webp",
    description: "Sixteen free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.felineFuryUpgrades),
  },
  sidekickShuffle: {
    label: "Sidekick Shuffle",
    color: COLOR.peppermintPink,
    image: "crits/superheroes/sidekickShuffle.webp",
    description: "Hires 1 free worker on this floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers([context.floor], balance.sidekickShuffleWorkers),
  },
  cosmicCatapult: {
    label: "Cosmic Catapult",
    color: COLOR.nightShiftIndigo,
    image: "crits/superheroes/cosmicCatapult.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
