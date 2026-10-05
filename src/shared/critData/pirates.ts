import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const PIRATES_CRITS = {
  anchorInk: {
    label: "Anchor Ink",
    color: COLOR.sameBoatCoral,
    image: "crits/pirates/anchorInk.webp",
    description: "Grows this floor's level by 20.1% in free upgrades",
  },
  blueSails: {
    label: "Blue Sails",
    color: COLOR.overflowBlue,
    image: "crits/pirates/blueSails.webp",
    description: "Spreads 169 free upgrades over the lowest-level floors",
  },
  grumpyDeckhands: {
    label: "Grumpy Deckhands",
    color: COLOR.amberMuted,
    image: "crits/pirates/grumpyDeckhands.webp",
    description: "Grows this floor's level by 20.2% in free upgrades",
  },
  hookAndScar: {
    label: "Hook And Scar",
    color: COLOR.sameBoatCoral,
    image: "crits/pirates/hookAndScar.webp",
    description: "Spreads 170 free upgrades over the lowest-level floors",
  },
  plumedPowerhouse: {
    label: "Plumed Powerhouse",
    color: COLOR.summerSaleOrange,
    image: "crits/pirates/plumedPowerhouse.webp",
    description: "Grows this floor's level by 20.3% in free upgrades",
  },
  shipmateSqueeze: {
    label: "Shipmate Squeeze",
    color: COLOR.amberMuted,
    image: "crits/pirates/shipmateSqueeze.webp",
    description: "Spreads 171 free upgrades over the lowest-level floors",
  },
  skullHatCrest: {
    label: "Skull Hat Crest",
    color: COLOR.amberMuted,
    image: "crits/pirates/skullHatCrest.webp",
    description: "Grows this floor's level by 20.4% in free upgrades",
  },
  stripedSkipper: {
    label: "Striped Skipper",
    color: COLOR.amberMuted,
    image: "crits/pirates/stripedSkipper.webp",
    description: "Spreads 172 free upgrades over the lowest-level floors",
  },
  tealPatch: {
    label: "Teal Patch",
    color: COLOR.amberMuted,
    image: "crits/pirates/tealPatch.webp",
    description: "Grows this floor's level by 20.5% in free upgrades",
  },
} as const satisfies Record<string, FeaturedCritData>;
