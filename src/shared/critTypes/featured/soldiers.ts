import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const SOLDIERS_CRITS = {
  goggledGrunt: {
    label: "Goggled Grunt",
    color: COLOR.payoutOlive,
    image: "crits/soldiers/goggledGrunt.webp",
    description: "Promotes 63.5% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.goggledGruntShare, 1),
  },
  greenSkullTrooper: {
    label: "Green Skull Trooper",
    color: COLOR.luckyCloverGreen,
    image: "crits/soldiers/greenSkullTrooper.webp",
    description: "Promotes 86.5% of this floor's workers two perma tiers",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers([context.floor], balance.greenSkullTrooperShare, 2),
  },
  wreathedSkullHelm: {
    label: "Wreathed Skull Helm",
    color: COLOR.payoutOlive,
    image: "crits/soldiers/wreathedSkullHelm.webp",
    description: "Promotes 64% of this building's workers one perma tier",
    reward: (context, { actions, balance }) =>
      actions.raiseWorkerTiers(context.floors, balance.wreathedSkullHelmShare, 1),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
