import type { RESCUE_SQUAD_CRITS } from "../critData/rescueSquad";
import type { FeaturedRewards } from "./types";

export const RESCUE_SQUAD_REWARDS = {
  bedsideManner: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.bedsideMannerShare),
  houseCall: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.houseCallShare),
  scrubsUp: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.scrubsUpShare),
  stethoscopes: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.stethoscopesShare),
  pinkScrubs: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.pinkScrubsShare),
  headMirror: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.headMirrorGrowth),
  kneeJerk: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.kneeJerkUpgrades),
  scrubbedIn: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.scrubbedInGrowth),
  blazeBusters: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.blazeBustersShare),
  fireBrigade: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.fireBrigadeShare),
  helmetHeroes: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.helmetHeroesShare),
  backwardGlance: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.backwardGlanceUpgrades),
  beatCopBiceps: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.beatCopBicepsGrowth),
  bustedBurglar: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.bustedBurglarUpgrades),
  closeShave: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.closeShaveGrowth),
  greenCollar: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.greenCollarUpgrades),
  nightstick: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.nightstickGrowth),
  ravenCurls: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.ravenCurlsUpgrades),
  silverShield: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.silverShieldGrowth),
  topBrass: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.topBrassUpgrades),
  goggledGrunt: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.goggledGruntShare, 1),
  greenSkullTrooper: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.greenSkullTrooperShare, 2),
  wreathedSkullHelm: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.wreathedSkullHelmShare, 1),
} satisfies FeaturedRewards<typeof RESCUE_SQUAD_CRITS>;
