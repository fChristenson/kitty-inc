import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const CLEANERS_CRITS = {
  bandanaSquad: {
    label: "Bandana Squad",
    color: COLOR.amberMuted,
    image: "crits/cleaners/bandanaSquad.webp",
    description: "Grows this floor's level by 26% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.bandanaSquadGrowth),
  },
  hiVisDuo: {
    label: "Hi Vis Duo",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/cleaners/hiVisDuo.webp",
    description: "Grows this floor's level by 26.1% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.hiVisDuoGrowth),
  },
  overallReady: {
    label: "Overall Ready",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/cleaners/overallReady.webp",
    description: "Grows this floor's level by 26.2% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.overallReadyGrowth),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
