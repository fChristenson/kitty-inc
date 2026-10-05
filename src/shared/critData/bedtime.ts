import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const BEDTIME_CRITS = {
  bedtimeSelfie: {
    label: "Bedtime Selfie",
    color: COLOR.summerSaleOrange,
    image: "crits/bedtime/bedtimeSelfie.webp",
    description: "Grows this floor's level by 21% in free upgrades",
  },
  duvetDaydream: {
    label: "Duvet Daydream",
    color: COLOR.overflowBlue,
    image: "crits/bedtime/duvetDaydream.webp",
    description: "Spreads 178 free upgrades over the lowest-level floors",
  },
  lazySunday: {
    label: "Lazy Sunday",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/bedtime/lazySunday.webp",
    description: "Grows this floor's level by 21.1% in free upgrades",
  },
  pillowFort: {
    label: "Pillow Fort",
    color: COLOR.blue,
    image: "crits/bedtime/pillowFort.webp",
    description: "Spreads 179 free upgrades over the lowest-level floors",
  },
  shoulderSlip: {
    label: "Shoulder Slip",
    color: COLOR.overflowBlue,
    image: "crits/bedtime/shoulderSlip.webp",
    description: "Grows this floor's level by 21.2% in free upgrades",
  },
  skyBlueNightshirt: {
    label: "Sky Blue Nightshirt",
    color: COLOR.sameBoatCoral,
    image: "crits/bedtime/skyBlueNightshirt.webp",
    description: "Grows this floor's level by 21.3% in free upgrades",
  },
  sleepoverTwins: {
    label: "Sleepover Twins",
    color: COLOR.fastForwardBlue,
    image: "crits/bedtime/sleepoverTwins.webp",
    description: "Grows this floor's level by 21.4% in free upgrades",
  },
} as const satisfies Record<string, FeaturedCritData>;
