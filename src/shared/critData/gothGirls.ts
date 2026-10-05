import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const GOTH_GIRLS_CRITS = {
  fishnetSleeves: {
    label: "Fishnet Sleeves",
    color: COLOR.sameBoatCoral,
    image: "crits/gothGirls/fishnetSleeves.webp",
    description: "Spreads 144 free upgrades over the lowest-level floors",
  },
  greenEyeshadow: {
    label: "Green Eyeshadow",
    color: COLOR.doubleDownCrimson,
    image: "crits/gothGirls/greenEyeshadow.webp",
    description: "Pays 134 times this floor's upgrade price in cash",
  },
  heartTattoo: {
    label: "Heart Tattoo",
    color: COLOR.doubleDownCrimson,
    image: "crits/gothGirls/heartTattoo.webp",
    description: "Grows every unlocked floor's level by 7.6% in free upgrades",
  },
  lilacBiceps: {
    label: "Lilac Biceps",
    color: COLOR.nightOwlIndigo,
    image: "crits/gothGirls/lilacBiceps.webp",
    description: "Spreads 145 free upgrades over the lowest-level floors",
  },
  moonPendant: {
    label: "Moon Pendant",
    color: COLOR.nightOwlIndigo,
    image: "crits/gothGirls/moonPendant.webp",
    description: "Pays 135 times this floor's upgrade price in cash",
  },
  motoJacket: {
    label: "Moto Jacket",
    color: COLOR.unionBossSlate,
    image: "crits/gothGirls/motoJacket.webp",
    description: "Grows every unlocked floor's level by 7.7% in free upgrades",
  },
  noseStudSmirk: {
    label: "Nose Stud Smirk",
    color: COLOR.nightOwlIndigo,
    image: "crits/gothGirls/noseStudSmirk.webp",
    description: "Spreads 146 free upgrades over the lowest-level floors",
  },
  operaGloves: {
    label: "Opera Gloves",
    color: COLOR.nightShiftIndigo,
    image: "crits/gothGirls/operaGloves.webp",
    description: "Pays 136 times this floor's upgrade price in cash",
  },
  pinkEdgeBangs: {
    label: "Pink Edge Bangs",
    color: COLOR.fancyFridayIndigo,
    image: "crits/gothGirls/pinkEdgeBangs.webp",
    description: "Grows every unlocked floor's level by 7.8% in free upgrades",
  },
  plumMiniskirt: {
    label: "Plum Miniskirt",
    color: COLOR.unionBossSlate,
    image: "crits/gothGirls/plumMiniskirt.webp",
    description: "Spreads 147 free upgrades over the lowest-level floors",
  },
  ringChoker: {
    label: "Ring Choker",
    color: COLOR.nightShiftIndigo,
    image: "crits/gothGirls/ringChoker.webp",
    description: "Pays 137 times this floor's upgrade price in cash",
  },
  septumSiren: {
    label: "Septum Siren",
    color: COLOR.nightShiftIndigo,
    image: "crits/gothGirls/septumSiren.webp",
    description: "Grows every unlocked floor's level by 7.9% in free upgrades",
  },
  skullBarrette: {
    label: "Skull Barrette",
    color: COLOR.nightShiftIndigo,
    image: "crits/gothGirls/skullBarrette.webp",
    description: "Spreads 148 free upgrades over the lowest-level floors",
  },
  studdedVestFlex: {
    label: "Studded Vest Flex",
    color: COLOR.peppermintPink,
    image: "crits/gothGirls/studdedVestFlex.webp",
    description: "Pays 138 times this floor's upgrade price in cash",
  },
  tealStreakBob: {
    label: "Teal Streak Bob",
    color: COLOR.coffeeRunTeal,
    image: "crits/gothGirls/tealStreakBob.webp",
    description: "Grows this floor's level by 18.1% in free upgrades",
  },
  violetCropTop: {
    label: "Violet Crop Top",
    color: COLOR.peppermintPink,
    image: "crits/gothGirls/violetCropTop.webp",
    description: "Spreads 149 free upgrades over the lowest-level floors",
  },
} as const satisfies Record<string, FeaturedCritData>;
