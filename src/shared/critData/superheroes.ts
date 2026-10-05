import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const SUPERHEROES_CRITS = {
  purrfectOrigin: {
    label: "Purrfect Origin",
    color: COLOR.sunshineGold,
    image: "crits/superheroes/purrfectOrigin.webp",
    description: "Arms this floor's next click as an x5 crit",
  },
  capeEscape: {
    label: "Cape Escape",
    color: COLOR.red,
    image: "crits/superheroes/capeEscape.webp",
    description: "Cuts every price in this building by 1.3%",
  },
  thunderPaws: {
    label: "Thunder Paws",
    color: COLOR.blue,
    image: "crits/superheroes/thunderPaws.webp",
    description: "Boosts this floor's workers for 23s",
  },
  clawAndOrder: {
    label: "Claw and Order",
    color: COLOR.cyan,
    image: "crits/superheroes/clawAndOrder.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
  },
  felineFury: {
    label: "Feline Fury",
    color: COLOR.fullHouseCrimson,
    image: "crits/superheroes/felineFury.webp",
    description: "Sixteen free upgrades on this floor",
  },
  sidekickShuffle: {
    label: "Sidekick Shuffle",
    color: COLOR.peppermintPink,
    image: "crits/superheroes/sidekickShuffle.webp",
    description: "Hires 1 free worker on this floor",
  },
  cosmicCatapult: {
    label: "Cosmic Catapult",
    color: COLOR.nightShiftIndigo,
    image: "crits/superheroes/cosmicCatapult.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
  },
} as const satisfies Record<string, FeaturedCritData>;
