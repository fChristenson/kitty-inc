import type { SOLDIERS_CRITS } from "../../critData/soldiers";
import type { FeaturedRewards } from "./types";

export const SOLDIERS_REWARDS = {
  goggledGrunt: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.goggledGruntShare, 1),
  greenSkullTrooper: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.greenSkullTrooperShare, 2),
  wreathedSkullHelm: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.wreathedSkullHelmShare, 1),
} satisfies FeaturedRewards<typeof SOLDIERS_CRITS>;
