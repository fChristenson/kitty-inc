import type { CritProcDisplayInfo } from "../index";
import { COLOR } from "../../../palette";

export const SUPERHEROES_CRIT_INFO = {
  purrfectOrigin: {
    label: "Purrfect Origin",
    color: COLOR.sunshineGold,
    icon: "purrfectOrigin",
    description: "Seven free upgrades on this floor",
  },
  capeEscape: {
    label: "Cape Escape",
    color: COLOR.red,
    icon: "capeEscape",
    description: "Ten payouts from the highest-earning floor",
  },
  thunderPaws: {
    label: "Thunder Paws",
    color: COLOR.blue,
    icon: "thunderPaws",
    description: "Eight free upgrades on every unlocked floor",
  },
  clawAndOrder: {
    label: "Claw and Order",
    color: COLOR.cyan,
    icon: "clawAndOrder",
    description: "Six instant payouts on this floor",
  },
  felineFury: {
    label: "Feline Fury",
    color: COLOR.fullHouseCrimson,
    icon: "felineFury",
    description: "Sixteen free upgrades on this floor",
  },
  sidekickShuffle: {
    label: "Sidekick Shuffle",
    color: COLOR.peppermintPink,
    icon: "sidekickShuffle",
    description: "Seven upgrades on alternating floors, from the ground",
  },
  cosmicCatapult: {
    label: "Cosmic Catapult",
    color: COLOR.nightShiftIndigo,
    icon: "cosmicCatapult",
    description: "Nine payouts on every unlocked floor",
  },
} as const satisfies Record<string, CritProcDisplayInfo>;
