import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const RED_CARPET_CRITS = {
  bombshellBrawn: {
    label: "Bombshell Brawn",
    color: COLOR.doubleDownCrimson,
    image: "crits/redCarpet/bombshellBrawn.webp",
    description: "Adds 46.5% of your total income",
  },
  chromeCoquette: {
    label: "Chrome Coquette",
    color: COLOR.doubleDownCrimson,
    image: "crits/redCarpet/chromeCoquette.webp",
    description: "Adds 46.6% of your total income",
  },
  crimsonCascade: {
    label: "Crimson Cascade",
    color: COLOR.doubleDownCrimson,
    image: "crits/redCarpet/crimsonCascade.webp",
    description: "Adds 46.7% of your total income",
  },
  eveningStrut: {
    label: "Evening Strut",
    color: COLOR.sameBoatCoral,
    image: "crits/redCarpet/eveningStrut.webp",
    description: "Adds 46.8% of your total income",
  },
  flamencoFlare: {
    label: "Flamenco Flare",
    color: COLOR.doubleDownCrimson,
    image: "crits/redCarpet/flamencoFlare.webp",
    description: "Adds 46.9% of your total income",
  },
  garnetGlamour: {
    label: "Garnet Glamour",
    color: COLOR.redActive,
    image: "crits/redCarpet/garnetGlamour.webp",
    description: "Adds 47% of your total income",
  },
  leggyElegance: {
    label: "Leggy Elegance",
    color: COLOR.redActive,
    image: "crits/redCarpet/leggyElegance.webp",
    description: "Adds 47.2% of your total income",
  },
  muscleMuse: {
    label: "Muscle Muse",
    color: COLOR.sameBoatCoral,
    image: "crits/redCarpet/muscleMuse.webp",
    description: "Adds 47.3% of your total income",
  },
  roseRecline: {
    label: "Rose Recline",
    color: COLOR.redActive,
    image: "crits/redCarpet/roseRecline.webp",
    description: "Adds 47.4% of your total income",
  },
  ruffleTwirl: {
    label: "Ruffle Twirl",
    color: COLOR.redActive,
    image: "crits/redCarpet/ruffleTwirl.webp",
    description: "Adds 151s of your company's income",
  },
  scarletStrength: {
    label: "Scarlet Strength",
    color: COLOR.redActive,
    image: "crits/redCarpet/scarletStrength.webp",
    description: "Adds 152s of your company's income",
  },
  starletSwoon: {
    label: "Starlet Swoon",
    color: COLOR.redActive,
    image: "crits/redCarpet/starletSwoon.webp",
    description: "Adds 154s of your company's income",
  },
} as const satisfies Record<string, FeaturedCritData>;
