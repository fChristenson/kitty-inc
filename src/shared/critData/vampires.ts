import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const VAMPIRES_CRITS = {
  nosferatuSquat: {
    label: "Nosferatu Squat",
    color: COLOR.doubleDownCrimson,
    image: "crits/vampires/nosferatuSquat.webp",
    description: "Cuts every price in this building by 18.5%",
  },
  violetCapeCrusher: {
    label: "Violet Cape Crusher",
    color: COLOR.doubleDownCrimson,
    image: "crits/vampires/violetCapeCrusher.webp",
    description: "Adds 52s of your company's income",
  },
  countCrouch: {
    label: "Count Crouch",
    color: COLOR.nightShiftIndigo,
    image: "crits/vampires/countCrouch.webp",
    description: "Boosts every worker for 141s, counting as 3 extra workers",
  },
} as const satisfies Record<string, FeaturedCritData>;
