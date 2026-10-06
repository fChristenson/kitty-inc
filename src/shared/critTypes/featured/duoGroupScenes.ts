import type { DUO_GROUP_SCENES_CRITS } from "../../critData/duoGroupScenes";
import type { FeaturedRewards } from "./types";

export const DUO_GROUP_SCENES_REWARDS = {
  ballroomSnapshot: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.ballroomSnapshotSeconds),
  blackTieBall: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.blackTieBallSeconds),
  cocktailHour: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.cocktailHourSeconds),
  discoDiva: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.discoDivaSeconds),
  photoBooth: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.photoBoothShare),
  promenade: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.promenadeShare),
  purpleReign: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.purpleReignShare),
  blueSteelRedHot: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.blueSteelRedHotSeconds),
  fuchsiaFortress: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.fuchsiaFortressShare),
  jadeGiantess: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.jadeGiantessShare),
  mermaidTail: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.mermaidTailShare),
  navyShimmer: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.navyShimmerShare),
  offTheShoulder: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.offTheShoulderShare),
  bodiceBulk: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.bodiceBulkSeconds),
  pixieCuts: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.pixieCutsShare),
  ponytailPride: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.ponytailPrideShare),
  sunnyCurls: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.sunnyCurlsShare),
  candyHairCrew: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.candyHairCrewShare, 2),
  bobSquad: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.bobSquadShare, 2),
  sweatbandSquad: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.sweatbandSquadShare, 1),
  leotardLineup: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.leotardLineupShare, 1),
  earringGlint: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.earringGlintShare),
  primAndProper: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.primAndProperShare, 1),
  eclipseBuns: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.eclipseBunsShare, 1),
  bangsAndBlues: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.bangsAndBluesSeconds),
  jadeAndNavy: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.jadeAndNavyShare),
  pinkGloves: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.pinkGlovesShare),
  rainbowHem: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.rainbowHemShare),
  matchingTrims: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.matchingTrimsShare),
  tallAndTiny: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.tallAndTinyShare),
  jewelTones: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.jewelTonesShare),
} satisfies FeaturedRewards<typeof DUO_GROUP_SCENES_CRITS>;
