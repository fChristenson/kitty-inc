import type { FRONTIERS_CRITS } from "../critData/frontiers";
import type { FeaturedRewards } from "./types";

export const FRONTIERS_REWARDS = {
  blackHole: (context, { actions }) => actions.hireManagers([context.floor]),
  bottledNebula: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.bottledNebulaTierSteps,
      balance.bottledNebulaUpgrades,
    ),
  eclipse: (context, { actions, lowestLevel }) =>
    actions.armCrit([lowestLevel(context)], "crit"),
  joinTheDots: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.joinTheDotsGrowth),
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
  treasureMap: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.treasureMapSeconds),
  captainLeFluff: (context, { actions, balance, highestFloor }) =>
    actions.upgrade([highestFloor(context)], balance.captainLeFluffUpgrades),
  divingBell: (context, { actions, balance, cascadeDown }) =>
    actions.upgrade(cascadeDown(context), balance.divingBellUpgrades),
  flooringInspector: (context, { actions, balance }) =>
    actions.upgrade(
      context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
      balance.flooringInspectorUpgrades,
    ),
  kraken: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.krakenPayouts),
  messageInABottle: (context, { actions }) => actions.armCrit([context.floor], "crit"),
  lemonSails: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.lemonSailsGrowth),
} satisfies FeaturedRewards<typeof FRONTIERS_CRITS>;
