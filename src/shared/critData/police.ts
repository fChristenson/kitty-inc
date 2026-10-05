import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const POLICE_CRITS = {
  backwardGlance: {
    label: "Backward Glance",
    color: COLOR.nightShiftIndigo,
    image: "crits/police/backwardGlance.webp",
    description: "Spreads 173 free upgrades over the lowest-level floors",
  },
  beatCopBiceps: {
    label: "Beat Cop Biceps",
    color: COLOR.overflowBlue,
    image: "crits/police/beatCopBiceps.webp",
    description: "Grows this floor's level by 20.6% in free upgrades",
  },
  bustedBurglar: {
    label: "Busted Burglar",
    color: COLOR.nightShiftIndigo,
    image: "crits/police/bustedBurglar.webp",
    description: "Spreads 174 free upgrades over the lowest-level floors",
  },
  closeShave: {
    label: "Close Shave",
    color: COLOR.nightShiftIndigo,
    image: "crits/police/closeShave.webp",
    description: "Grows this floor's level by 20.7% in free upgrades",
  },
  greenCollar: {
    label: "Green Collar",
    color: COLOR.nightShiftIndigo,
    image: "crits/police/greenCollar.webp",
    description: "Spreads 175 free upgrades over the lowest-level floors",
  },
  nightstick: {
    label: "Nightstick",
    color: COLOR.nightShiftIndigo,
    image: "crits/police/nightstick.webp",
    description: "Grows this floor's level by 20.8% in free upgrades",
  },
  ravenCurls: {
    label: "Raven Curls",
    color: COLOR.nightShiftIndigo,
    image: "crits/police/ravenCurls.webp",
    description: "Spreads 176 free upgrades over the lowest-level floors",
  },
  silverShield: {
    label: "Silver Shield",
    color: COLOR.nightShiftIndigo,
    image: "crits/police/silverShield.webp",
    description: "Grows this floor's level by 20.9% in free upgrades",
  },
  topBrass: {
    label: "Top Brass",
    color: COLOR.overflowBlue,
    image: "crits/police/topBrass.webp",
    description: "Spreads 177 free upgrades over the lowest-level floors",
  },
} as const satisfies Record<string, FeaturedCritData>;
