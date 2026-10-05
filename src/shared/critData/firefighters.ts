import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const FIREFIGHTERS_CRITS = {
  blazeBusters: {
    label: "Blaze Busters",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/firefighters/blazeBusters.webp",
    description: "Adds 41.5% of your total income",
  },
  fireBrigade: {
    label: "Fire Brigade",
    color: COLOR.headhunterRust,
    image: "crits/firefighters/fireBrigade.webp",
    description: "Adds 41.6% of your total income",
  },
  helmetHeroes: {
    label: "Helmet Heroes",
    color: COLOR.gold,
    image: "crits/firefighters/helmetHeroes.webp",
    description: "Adds 41.7% of your total income",
  },
} as const satisfies Record<string, FeaturedCritData>;
