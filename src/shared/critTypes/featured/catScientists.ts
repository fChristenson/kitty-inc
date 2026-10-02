import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const CAT_SCIENTISTS_CRITS = {
  calicoChemist: {
    label: "Calico Chemist",
    color: COLOR.amberMuted,
    image: "crits/catScientists/calicoChemist.webp",
    description: "Spreads 165 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.calicoChemistUpgrades),
  },
  fourEyes: {
    label: "Four Eyes",
    color: COLOR.amberMuted,
    image: "crits/catScientists/fourEyes.webp",
    description: "Grows this floor's level by 19.8% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.fourEyesGrowth),
  },
  underTheMicroscope: {
    label: "Under The Microscope",
    color: COLOR.amberMuted,
    image: "crits/catScientists/underTheMicroscope.webp",
    description: "Spreads 166 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.underTheMicroscopeUpgrades),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
