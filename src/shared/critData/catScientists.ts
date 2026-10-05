import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const CAT_SCIENTISTS_CRITS = {
  calicoChemist: {
    label: "Calico Chemist",
    color: COLOR.amberMuted,
    image: "crits/catScientists/calicoChemist.webp",
    description: "Spreads 165 free upgrades over the lowest-level floors",
  },
  fourEyes: {
    label: "Four Eyes",
    color: COLOR.amberMuted,
    image: "crits/catScientists/fourEyes.webp",
    description: "Grows this floor's level by 19.8% in free upgrades",
  },
  underTheMicroscope: {
    label: "Under The Microscope",
    color: COLOR.amberMuted,
    image: "crits/catScientists/underTheMicroscope.webp",
    description: "Spreads 166 free upgrades over the lowest-level floors",
  },
} as const satisfies Record<string, FeaturedCritData>;
