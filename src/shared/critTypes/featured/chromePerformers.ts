import type { CHROME_PERFORMERS_CRITS } from "../../critData/chromePerformers";
import type { FeaturedRewards } from "./types";

export const CHROME_PERFORMERS_REWARDS = {
  heartOfChrome: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.heartOfChromeTierSteps,
      balance.heartOfChromeUpgrades,
    ),
  heartDrive: (context, { actions }) => actions.armCrit([context.floor], "mega"),
  heartBeam: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.heartBeamPayouts),
  wingedWealth: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.wingedWealthShare),
  cyberSiren: (context, { balance, promoteAndUpgrade, lowestLevel }) =>
    promoteAndUpgrade(lowestLevel(context), balance.cyberSirenTierSteps, balance.cyberSirenUpgrades),
  micDropMaven: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.micDropMavenFloors),
  circuitSerenade: (context, { actions, balance, alternating }) =>
    actions.upgrade(alternating(context), balance.circuitSerenadeUpgrades),
  chromeCrooner: (context, { actions, balance, alternating }) =>
    actions.payCycles(alternating(context), balance.chromeCroonerPayouts),
  sunkissedSignal: (context, { actions }) => actions.giveOfficeChairs(context.floors),
  wiredWarble: (context, { actions }) =>
    actions.giveOfficeSupplies(context.floors),
  beltItOut: (context, { actions, balance }) =>
    actions.hireWorkers(context.floors, balance.beltItOutWorkers),
  holoHeart: (context, { actions, balance, cascadeDown }) =>
    actions.upgrade(cascadeDown(context), balance.holoHeartUpgrades),
  pixelHeart: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.pixelHeartBoostSeconds,
      balance.pixelHeartExtraWorkers,
    ),
  heartProjection: (context, { actions, balance, belowAndHere }) =>
    actions.payCycles(belowAndHere(context), balance.heartProjectionPayouts),
  encore: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.encoreGrowth),
  highNote: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.highNoteGrowth),
  platinumRecord: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.platinumRecordGrowth),
  silverTongue: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.silverTongueGrowth),
  standingOvation: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.standingOvationGrowth),
  headsetMech: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.headsetMechGrowth),
  pageantPump: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.pageantPumpShare),
  pinkSash: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.pinkSashShare),
  sapphireGala: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.sapphireGalaShare),
  satinSalute: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.satinSaluteShare),
} satisfies FeaturedRewards<typeof CHROME_PERFORMERS_CRITS>;
