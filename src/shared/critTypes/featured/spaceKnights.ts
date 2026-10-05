import type { SPACE_KNIGHTS_CRITS } from "../../critData/spaceKnights";
import type { FeaturedRewards } from "./types";

export const SPACE_KNIGHTS_REWARDS = {
  blueBladeTabby: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.blueBladeTabbyGrowth),
  brassBikini: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.brassBikiniGrowth),
  crimsonEyes: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.crimsonEyesGrowth),
  crimsonGauntlets: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.crimsonGauntletsGrowth),
  goldenGaze: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.goldenGazeGrowth),
  hoodedMenace: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.hoodedMenaceSeconds),
  midnightCape: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.midnightCapeGrowth),
  padawanPaws: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.padawanPawsSeconds),
  redSaberRaise: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.redSaberRaiseGrowth),
  sinisterSmirk: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.sinisterSmirkSeconds),
  tentacleTresses: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.tentacleTressesGrowth),
} satisfies FeaturedRewards<typeof SPACE_KNIGHTS_CRITS>;
