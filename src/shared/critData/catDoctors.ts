import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const CAT_DOCTORS_CRITS = {
  headMirror: {
    label: "Head Mirror",
    color: COLOR.amberMuted,
    image: "crits/catDoctors/headMirror.webp",
    description: "Grows this floor's level by 19.6% in free upgrades",
  },
  kneeJerk: {
    label: "Knee Jerk",
    color: COLOR.summerSaleOrange,
    image: "crits/catDoctors/kneeJerk.webp",
    description: "Spreads 164 free upgrades over the lowest-level floors",
  },
  scrubbedIn: {
    label: "Scrubbed In",
    color: COLOR.teal,
    image: "crits/catDoctors/scrubbedIn.webp",
    description: "Grows this floor's level by 19.7% in free upgrades",
  },
} as const satisfies Record<string, FeaturedCritData>;
