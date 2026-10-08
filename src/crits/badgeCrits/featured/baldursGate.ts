import type { BALDURS_GATE_CRITS } from "../critData/baldursGate";
import type { FeaturedRewards } from "./types";

export const BALDURS_GATE_REWARDS = {
  astapurrion: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.astapurrionPayouts),
  astralclawSkyblade: (context, { actions }) => actions.hireManagers([context.floor]),
  drizztDoPurrden: (context, { actions }) => actions.armCrit([context.floor], "crit"),
  elmiaowster: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.elmiaowsterTierSteps,
      balance.elmiaowsterUpgrades,
    ),
  elvenSongblade: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.elvenSongbladeDiscount),
  galepaw: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.galepawPayouts),
  halsinpaw: (context, { actions, balance }) =>
    actions.upgrade(context.floors, balance.halsinpawUpgrades),
  hearthpawShadowagent: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, true)],
      balance.hearthpawShadowagentPayouts,
    ),
  imeown: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  jaheirball: (context, { actions, balance, alternating }) =>
    actions.payCycles(alternating(context), balance.jaheirballPayouts),
  karlachonk: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  laezclaw: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  minscAndMeow: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.minscAndMeowContinueChance),
  sarevmeowk: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.sarevmeowkBoostSeconds,
      balance.sarevmeowkExtraWorkers,
    ),
  shadowpurr: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.shadowpurrTierSteps,
      balance.shadowpurrUpgrades,
    ),
  theEmpurror: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.theEmpurrorBoostSeconds,
      balance.theEmpurrorExtraWorkers,
    ),
  thisIsTheEnd: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.thisIsTheEndUpgrades),
  whiskerWyll: (context, { actions }) => {
    actions.giveOfficeChairs([context.floor]);
    actions.giveOfficeSupplies([context.floor]);
  },
  winkWink: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
} satisfies FeaturedRewards<typeof BALDURS_GATE_CRITS>;
