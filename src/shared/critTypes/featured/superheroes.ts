import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const SUPERHEROES_CRITS = {
  purrfectOrigin: {
    label: "Purrfect Origin",
    color: COLOR.sunshineGold,
    image: "crits/superheroes/purrfectOrigin.png",
    description: "Seven free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.purrfectOriginUpgrades),
  },
  capeEscape: {
    label: "Cape Escape",
    color: COLOR.red,
    image: "crits/superheroes/capeEscape.png",
    description: "Ten payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.capeEscapePayouts,
      ),
  },
  thunderPaws: {
    label: "Thunder Paws",
    color: COLOR.blue,
    image: "crits/superheroes/thunderPaws.png",
    description: "Eight free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.thunderPawsUpgrades),
  },
  clawAndOrder: {
    label: "Claw and Order",
    color: COLOR.cyan,
    image: "crits/superheroes/clawAndOrder.png",
    description: "Six instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.clawAndOrderPayouts),
  },
  felineFury: {
    label: "Feline Fury",
    color: COLOR.fullHouseCrimson,
    image: "crits/superheroes/felineFury.png",
    description: "Sixteen free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.felineFuryUpgrades),
  },
  sidekickShuffle: {
    label: "Sidekick Shuffle",
    color: COLOR.peppermintPink,
    image: "crits/superheroes/sidekickShuffle.png",
    description: "Seven upgrades on alternating floors, from the ground",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.sidekickShuffleUpgrades),
  },
  cosmicCatapult: {
    label: "Cosmic Catapult",
    color: COLOR.nightShiftIndigo,
    image: "crits/superheroes/cosmicCatapult.png",
    description: "Nine payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.cosmicCatapultPayouts),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
