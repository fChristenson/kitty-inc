import type { GAME_QUOTES_CRITS } from "../../critData/gameQuotes";
import type { FeaturedRewards } from "./types";

export const GAME_QUOTES_REWARDS = {
  wizard: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.wizardTierSteps,
      balance.wizardUpgrades,
    ),
  epic: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.epicTierSteps,
      balance.epicUpgrades,
    ),
  ready: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.readyDiscount),
  workWork: (context, { actions }) => actions.giveOfficeChairs([context.floor]),
  yesWarchief: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.yesWarchiefPayouts),
  youAreNotPrepared: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.youAreNotPreparedTierSteps,
      balance.youAreNotPreparedUpgrades,
    ),
  arcana: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.arcanaTierSteps,
      balance.arcanaUpgrades,
    ),
  bigDaddy: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.bigDaddyDiscount),
  chonk: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.chonkPayouts),
  cyberPunk: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  dodgeThis: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, true)],
      balance.dodgeThisPayouts,
    ),
  whiteRabbit: (context, { actions, balance, lowestLevel }) => {
    const lowest = lowestLevel(context);
    actions.upgrade([context.floor], balance.whiteRabbitUpgrades);
    if (lowest !== context.floor)
      actions.upgrade([lowest], balance.whiteRabbitUpgrades);
  },
  gladiator: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  iDidntAskForThis: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.iDidntAskForThisTierSteps,
      balance.iDidntAskForThisUpgrades,
    ),
  iHatePortals: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.iHatePortalsFloors),
  littleSister: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  magicIsATool: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  megaChonk: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.megaChonkPayouts),
  metal: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.metalContinueChance),
  princess: (context, { balance, promoteAndUpgrade, lowestLevel }) =>
    promoteAndUpgrade(
      lowestLevel(context),
      balance.princessTierSteps,
      balance.princessUpgrades,
    ),
  spaceAndTime: (context, { actions, balance }) =>
    actions.upgrade(
      context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
      balance.spaceAndTimeUpgrades,
    ),
  thinkWithYourHead: (context, { actions, balance }) =>
    actions.repeatCrit(
      context,
      "up",
      balance.thinkWithYourHeadContinueChance,
    ),
  wouldYouKindly: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.wouldYouKindlyPayouts),
  yesYourHighness: (context, { actions, balance }) =>
    actions.upgrade(context.floors, balance.yesYourHighnessUpgrades),
  bulletDodger: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  nothingToSee: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.nothingToSeeContinueChance),
  nowIAmSuspicious: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.nowIAmSuspiciousBoostSeconds,
      balance.nowIAmSuspiciousExtraWorkers,
    ),
  redOrBlue: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
} satisfies FeaturedRewards<typeof GAME_QUOTES_CRITS>;
