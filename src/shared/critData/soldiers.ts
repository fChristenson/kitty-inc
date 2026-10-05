import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const SOLDIERS_CRITS = {
  goggledGrunt: {
    label: "Goggled Grunt",
    color: COLOR.payoutOlive,
    image: "crits/soldiers/goggledGrunt.webp",
    description: "Promotes 63.5% of this building's workers one perma tier",
  },
  greenSkullTrooper: {
    label: "Green Skull Trooper",
    color: COLOR.luckyCloverGreen,
    image: "crits/soldiers/greenSkullTrooper.webp",
    description: "Promotes 86.5% of this floor's workers two perma tiers",
  },
  wreathedSkullHelm: {
    label: "Wreathed Skull Helm",
    color: COLOR.payoutOlive,
    image: "crits/soldiers/wreathedSkullHelm.webp",
    description: "Promotes 64% of this building's workers one perma tier",
  },
} as const satisfies Record<string, FeaturedCritData>;
