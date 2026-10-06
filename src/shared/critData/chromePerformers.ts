import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const CHROME_PERFORMERS_CRITS = {
  heartOfChrome: {
    label: "Heart of Chrome",
    color: COLOR.pairBlue,
    image: "crits/chromePerformers/heartOfChrome.webp",
    description: "One tier promotion and forty-three upgrades here",
  },
  heartDrive: {
    label: "Heart Drive",
    color: COLOR.internSkyBlue,
    image: "crits/chromePerformers/heartDrive.webp",
    description: "Arms this floor's next click as an x25 crit",
  },
  heartBeam: {
    label: "Heart Beam",
    color: COLOR.peppermintPink,
    image: "crits/chromePerformers/heartBeam.webp",
    description: "Sixty-nine instant payouts on this floor",
  },
  wingedWealth: {
    label: "Winged Wealth",
    color: COLOR.bonusRoundGold,
    image: "crits/chromePerformers/wingedWealth.webp",
    description: "Adds 45.4% of your total income",
  },
  cyberSiren: {
    label: "Cyber Siren",
    color: COLOR.royalFlushPurple,
    image: "crits/chromePerformers/cyberSiren.webp",
    description: "One tier promotion and thirteen upgrades on the lowest-level floor",
  },
  micDropMaven: {
    label: "Mic Drop Maven",
    color: COLOR.nightShiftIndigo,
    image: "crits/chromePerformers/micDropMaven.webp",
    description: "Unlocks the next 3 floors for free",
  },
  circuitSerenade: {
    label: "Circuit Serenade",
    color: COLOR.mysticTeal,
    image: "crits/chromePerformers/circuitSerenade.webp",
    description: "Sixty upgrades on alternating floors",
  },
  chromeCrooner: {
    label: "Chrome Crooner",
    color: COLOR.pairBlue,
    image: "crits/chromePerformers/chromeCrooner.webp",
    description: "Fifty-nine payouts on alternating floors",
  },
  sunkissedSignal: {
    label: "Sunkissed Signal",
    color: COLOR.autumnSaleAmber,
    image: "crits/chromePerformers/sunkissedSignal.webp",
    description: "Free office chairs for every unlocked floor",
  },
  wiredWarble: {
    label: "Wired Warble",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/chromePerformers/wiredWarble.webp",
    description: "Free office supplies for every unlocked floor",
  },
  beltItOut: {
    label: "Belt It Out",
    color: COLOR.doubleDownCrimson,
    image: "crits/chromePerformers/beltItOut.webp",
    description: "Hires 1 free worker on every unlocked floor",
  },
  holoHeart: {
    label: "Holo Heart",
    color: COLOR.internSkyBlue,
    image: "crits/chromePerformers/holoHeart.webp",
    description: "Fifty-nine upgrades rolling down the floors below",
  },
  pixelHeart: {
    label: "Pixel Heart",
    color: COLOR.grandOpeningRose,
    image: "crits/chromePerformers/pixelHeart.webp",
    description: "Boosts every worker for 34s",
  },
  heartProjection: {
    label: "Heart Projection",
    color: COLOR.mysticTeal,
    image: "crits/chromePerformers/heartProjection.webp",
    description: "Fifty-four payouts on this floor and every floor below",
  },
  encore: {
    label: "Encore",
    color: COLOR.cyan,
    image: "crits/chromePerformers/encore.webp",
    description: "Grows this floor's level by 8% in free upgrades",
  },
  highNote: {
    label: "High Note",
    color: COLOR.peppermintPink,
    image: "crits/chromePerformers/highNote.webp",
    description: "Grows this floor's level by 3% in free upgrades",
  },
  platinumRecord: {
    label: "Platinum Record",
    color: COLOR.rainCheckBlue,
    image: "crits/chromePerformers/platinumRecord.webp",
    description: "Grows this floor's level by 25% in free upgrades",
  },
  silverTongue: {
    label: "Silver Tongue",
    color: COLOR.rainCheckBlue,
    image: "crits/chromePerformers/silverTongue.webp",
    description: "Grows this floor's level by 5% in free upgrades",
  },
  standingOvation: {
    label: "Standing Ovation",
    color: COLOR.cyan,
    image: "crits/chromePerformers/standingOvation.webp",
    description: "Grows every unlocked floor's level by 4% in free upgrades",
  },
  headsetMech: {
    label: "Headset Mech",
    color: COLOR.fastForwardBlue,
    image: "crits/chromePerformers/headsetMech.webp",
    description: "Grows this floor's level by 25.6% in free upgrades",
  },
  pageantPump: {
    label: "Pageant Pump",
    color: COLOR.fastForwardBlue,
    image: "crits/chromePerformers/pageantPump.webp",
    description: "Adds 38.9% of your total income",
  },
  pinkSash: {
    label: "Pink Sash",
    color: COLOR.fastForwardBlue,
    image: "crits/chromePerformers/pinkSash.webp",
    description: "Adds 39% of your total income",
  },
  sapphireGala: {
    label: "Sapphire Gala",
    color: COLOR.nightOwlIndigo,
    image: "crits/chromePerformers/sapphireGala.webp",
    description: "Adds 39.7% of your total income",
  },
  satinSalute: {
    label: "Satin Salute",
    color: COLOR.doubleDownCrimson,
    image: "crits/chromePerformers/satinSalute.webp",
    description: "Adds 63.6% of your total income",
  },
} as const satisfies Record<string, FeaturedCritData>;
