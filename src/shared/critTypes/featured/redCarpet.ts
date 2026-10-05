import type { RED_CARPET_CRITS } from "../../critData/redCarpet";
import type { FeaturedRewards } from "./types";

export const RED_CARPET_REWARDS = {
  bombshellBrawn: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.bombshellBrawnShare),
  chromeCoquette: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.chromeCoquetteShare),
  crimsonCascade: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.crimsonCascadeShare),
  eveningStrut: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.eveningStrutShare),
  flamencoFlare: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.flamencoFlareShare),
  garnetGlamour: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.garnetGlamourShare),
  leggyElegance: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.leggyEleganceShare),
  muscleMuse: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.muscleMuseShare),
  roseRecline: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.roseReclineShare),
  ruffleTwirl: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.ruffleTwirlSeconds),
  scarletStrength: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.scarletStrengthSeconds),
  starletSwoon: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.starletSwoonSeconds),
} satisfies FeaturedRewards<typeof RED_CARPET_CRITS>;
