import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const RED_CARPET_CRITS = {
  bombshellBrawn: {
    label: "Bombshell Brawn",
    color: COLOR.doubleDownCrimson,
    image: "crits/redCarpet/bombshellBrawn.webp",
    description: "Adds 46.5% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.bombshellBrawnShare),
  },
  chromeCoquette: {
    label: "Chrome Coquette",
    color: COLOR.doubleDownCrimson,
    image: "crits/redCarpet/chromeCoquette.webp",
    description: "Adds 46.6% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.chromeCoquetteShare),
  },
  crimsonCascade: {
    label: "Crimson Cascade",
    color: COLOR.doubleDownCrimson,
    image: "crits/redCarpet/crimsonCascade.webp",
    description: "Adds 46.7% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.crimsonCascadeShare),
  },
  eveningStrut: {
    label: "Evening Strut",
    color: COLOR.sameBoatCoral,
    image: "crits/redCarpet/eveningStrut.webp",
    description: "Adds 46.8% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.eveningStrutShare),
  },
  flamencoFlare: {
    label: "Flamenco Flare",
    color: COLOR.doubleDownCrimson,
    image: "crits/redCarpet/flamencoFlare.webp",
    description: "Adds 46.9% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.flamencoFlareShare),
  },
  garnetGlamour: {
    label: "Garnet Glamour",
    color: COLOR.redActive,
    image: "crits/redCarpet/garnetGlamour.webp",
    description: "Adds 47% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.garnetGlamourShare),
  },
  leggyElegance: {
    label: "Leggy Elegance",
    color: COLOR.redActive,
    image: "crits/redCarpet/leggyElegance.webp",
    description: "Adds 47.2% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.leggyEleganceShare),
  },
  muscleMuse: {
    label: "Muscle Muse",
    color: COLOR.sameBoatCoral,
    image: "crits/redCarpet/muscleMuse.webp",
    description: "Adds 47.3% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.muscleMuseShare),
  },
  roseRecline: {
    label: "Rose Recline",
    color: COLOR.redActive,
    image: "crits/redCarpet/roseRecline.webp",
    description: "Adds 47.4% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.roseReclineShare),
  },
  ruffleTwirl: {
    label: "Ruffle Twirl",
    color: COLOR.redActive,
    image: "crits/redCarpet/ruffleTwirl.webp",
    description: "Adds 151s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.ruffleTwirlSeconds),
  },
  scarletStrength: {
    label: "Scarlet Strength",
    color: COLOR.redActive,
    image: "crits/redCarpet/scarletStrength.webp",
    description: "Adds 152s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.scarletStrengthSeconds),
  },
  starletSwoon: {
    label: "Starlet Swoon",
    color: COLOR.redActive,
    image: "crits/redCarpet/starletSwoon.webp",
    description: "Adds 154s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.starletSwoonSeconds),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
