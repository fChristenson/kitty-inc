import type { CYBERPUNK_CRITS } from "../critData/cyberpunk";
import type { FeaturedRewards } from "./types";

export const CYBERPUNK_REWARDS = {
  chromeDome: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.chromeDomeDiscount),
  skullSyndicate: (context, { actions }) => {
    actions.giveOfficeChairs([context.floor]);
    actions.giveOfficeSupplies([context.floor]);
  },
  circuitDuchess: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.circuitDuchessDiscount),
  cyberCat: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  chromeChassis: (context, { balance, upgradeAndPay }) =>
    upgradeAndPay(
      context.floors,
      balance.chromeChassisUpgrades,
      balance.chromeChassisPayouts,
    ),
  elbowRoom: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  heartware: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  pulseDividend: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.pulseDividendSeconds),
  neonNegotiator: (context, { balance, selectByRate, upgradeAndPay }) =>
    upgradeAndPay(
      [selectByRate(context, true)],
      balance.neonNegotiatorUpgrades,
      balance.neonNegotiatorPayouts,
    ),
  platinumRefrain: (context, { balance, upgradeAndPay }) =>
    upgradeAndPay(
      context.floors,
      balance.platinumRefrainUpgrades,
      balance.platinumRefrainPayouts,
    ),
  retinaRoyale: (context, { balance, promoteAndUpgrade, lowestLevel }) =>
    promoteAndUpgrade(
      lowestLevel(context),
      balance.retinaRoyaleTierSteps,
      balance.retinaRoyaleUpgrades,
    ),
  silverHandshake: (context, { actions, balance }) =>
    actions.repeatCrit(
      context,
      "down",
      balance.silverHandshakeContinueChance,
    ),
  staticEncore: (context, { actions }) =>
    actions.startEvent([context.floor], "frozen"),
  chromeArm: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.chromeArmFloors),
  circuitBreaker: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.circuitBreakerFloors),
  roboticGripper: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.roboticGripperUpgrades),
  androidAnalyst: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.androidAnalystContinueChance),
  chromeBear: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.chromeBearFloors),
  chromeCat: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  chromeOwl: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, true)],
      balance.chromeOwlPayouts,
    ),
  chromeWolf: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.chromeWolfFloors),
  sterlingSiesta: (context, { actions, balance, lowestLevel }) =>
    actions.upgrade([lowestLevel(context)], balance.sterlingSiestaUpgrades),
  chromeGirl: (context, { actions, alternating }) =>
    actions.hireManagers(alternating(context)),
  flagshipBot: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.flagshipBotWorkers),
  androidAllure: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.androidAllureBoostSeconds, balance.androidAllureExtraWorkers),
  chromeArmCharm: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.chromeArmCharmContinueChance),
  silverCircuitSiren: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(context.floor, balance.silverCircuitSirenTierSteps, balance.silverCircuitSirenUpgrades),
  visorVixen: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.visorVixenDiscount),
  winkProtocol: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.winkProtocolSeconds),
  goggleGlam: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.goggleGlamBoostSeconds, balance.goggleGlamExtraWorkers),
  purpleVisorReaper: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.purpleVisorReaperContinueChance),
  jawplateJackpot: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(context.floor, balance.jawplateJackpotTierSteps, balance.jawplateJackpotUpgrades),
  cyanCranium: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.cyanCraniumDiscount),
  redEyeReboot: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.redEyeRebootShare),
  headsetHaunt: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.headsetHauntBoostSeconds, balance.headsetHauntExtraWorkers),
  errorEyes: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.errorEyesContinueChance),
  sparkheadSentinel: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(context.floor, balance.sparkheadSentinelTierSteps, balance.sparkheadSentinelUpgrades),
  blueGlareBot: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.blueGlareBotDiscount),
  starstruckSteel: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.starstruckSteelShare),
  miniMechaHelm: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.miniMechaHelmBoostSeconds, balance.miniMechaHelmExtraWorkers),
  deusEx: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.deusExGrowth),
} satisfies FeaturedRewards<typeof CYBERPUNK_CRITS>;
