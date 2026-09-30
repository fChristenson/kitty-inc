import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const CYBERPUNK_CRITS = {
  chromeDome: {
    label: "Chrome Dome",
    color: COLOR.cyan,
    image: "crits/cyberpunk/chromeDome.webp",
    description: "Cuts every price in this building by 1.3%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.chromeDomeDiscount),
  },
  skullSyndicate: {
    label: "Skull Syndicate",
    color: COLOR.peppermintPink,
    image: "crits/cyberpunk/skullSyndicate.webp",
    description: "Free office chairs and supplies for this floor",
    reward: (context, { actions }) => {
      actions.giveOfficeChairs([context.floor]);
      actions.giveOfficeSupplies([context.floor]);
    },
  },
  circuitDuchess: {
    label: "Circuit Duchess",
    color: COLOR.cyan,
    image: "crits/cyberpunk/circuitDuchess.webp",
    description: "Cuts every price in this building by 1.1%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.circuitDuchessDiscount),
  },
  cyberCat: {
    label: "Cyber Cat",
    color: COLOR.red,
    image: "crits/cyberpunk/cyberCat.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  chromeChassis: {
    label: "Chrome Chassis",
    color: COLOR.silverTicketGray,
    image: "crits/cyberpunk/chromeChassis.webp",
    description: "Six upgrades, then five payouts on every unlocked floor",
    reward: (context, { balance, upgradeAndPay }) =>
      upgradeAndPay(
        context.floors,
        balance.chromeChassisUpgrades,
        balance.chromeChassisPayouts,
      ),
  },
  elbowRoom: {
    label: "Elbow Room",
    color: COLOR.orange,
    image: "crits/cyberpunk/elbowRoom.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  heartware: {
    label: "Heartware",
    color: COLOR.red,
    image: "crits/cyberpunk/heartware.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  pulseDividend: {
    label: "Pulse Dividend",
    color: COLOR.peppermintPink,
    image: "crits/cyberpunk/pulseDividend.webp",
    description: "Adds 6s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.pulseDividendSeconds),
  },
  neonNegotiator: {
    label: "Neon Negotiator",
    color: COLOR.cyan,
    image: "crits/cyberpunk/neonNegotiator.webp",
    description:
      "Eight upgrades, then eleven payouts on the highest-earning floor",
    reward: (context, { balance, selectByRate, upgradeAndPay }) =>
      upgradeAndPay(
        [selectByRate(context, true)],
        balance.neonNegotiatorUpgrades,
        balance.neonNegotiatorPayouts,
      ),
  },
  platinumRefrain: {
    label: "Platinum Refrain",
    color: COLOR.peppermintPink,
    image: "crits/cyberpunk/platinumRefrain.webp",
    description: "Seven upgrades, then eight payouts on every unlocked floor",
    reward: (context, { balance, upgradeAndPay }) =>
      upgradeAndPay(
        context.floors,
        balance.platinumRefrainUpgrades,
        balance.platinumRefrainPayouts,
      ),
  },
  retinaRoyale: {
    label: "Retina Royale",
    color: COLOR.moneyGreen,
    image: "crits/cyberpunk/retinaRoyale.webp",
    description: "One tier promotion and 11 upgrades on the lowest-level floor",
    reward: (context, { balance, promoteAndUpgrade, lowestLevel }) =>
      promoteAndUpgrade(
        lowestLevel(context),
        balance.retinaRoyaleTierSteps,
        balance.retinaRoyaleUpgrades,
      ),
  },
  silverHandshake: {
    label: "Silver Handshake",
    color: COLOR.gold,
    image: "crits/cyberpunk/silverHandshake.webp",
    description:
      "Repeats the crit on the floor below, 11% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(
        context,
        "down",
        balance.silverHandshakeContinueChance,
      ),
  },
  staticEncore: {
    label: "Static Encore",
    color: COLOR.purple,
    image: "crits/cyberpunk/staticEncore.webp",
    description: "Locks this floor's upgrade price for 5s",
    reward: (context, { actions }) =>
      actions.startEvent([context.floor], "frozen"),
  },
  chromeArm: {
    label: "Chrome Arm",
    color: COLOR.unionBossSlate,
    image: "crits/cyberpunk/chromeArm.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.chromeArmFloors),
  },
  circuitBreaker: {
    label: "Circuit Breaker",
    color: COLOR.threeOfAKindGreen,
    image: "crits/cyberpunk/circuitBreaker.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.circuitBreakerFloors),
  },
  roboticGripper: {
    label: "Robotic Gripper",
    color: COLOR.blue,
    image: "crits/cyberpunk/roboticGripper.webp",
    description: "Thirty-eight free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.roboticGripperUpgrades),
  },
  androidAnalyst: {
    label: "Android Analyst",
    color: COLOR.cyan,
    image: "crits/cyberpunk/androidAnalyst.webp",
    description:
      "Repeats the crit on the floor above, 75% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.androidAnalystContinueChance),
  },
  chromeBear: {
    label: "Chrome Bear",
    color: COLOR.silverTicketGray,
    image: "crits/cyberpunk/chromeBear.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.chromeBearFloors),
  },
  chromeCat: {
    label: "Chrome Cat",
    color: COLOR.internSkyBlue,
    image: "crits/cyberpunk/chromeCat.webp",
    description: "Raises the lowest-level floor to the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  },
  chromeOwl: {
    label: "Chrome Owl",
    color: COLOR.nightShiftIndigo,
    image: "crits/cyberpunk/chromeOwl.webp",
    description: "Sixty-six payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.chromeOwlPayouts,
      ),
  },
  chromeWolf: {
    label: "Chrome Wolf",
    color: COLOR.fastForwardBlue,
    image: "crits/cyberpunk/chromeWolf.webp",
    description: "Unlocks the next 2 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.chromeWolfFloors),
  },
  sterlingSiesta: {
    label: "Sterling Siesta",
    color: COLOR.silverTicketGray,
    image: "crits/cyberpunk/sterlingSiesta.webp",
    description: "Sixty-two upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.sterlingSiestaUpgrades),
  },
  chromeGirl: {
    label: "Chrome Girl",
    color: COLOR.pairBlue,
    image: "crits/cyberpunk/chromeGirl.webp",
    description: "Hires a free manager on alternating floors",
    reward: (context, { actions, alternating }) =>
      actions.hireManagers(alternating(context)),
  },
  flagshipBot: {
    label: "Flagship Bot",
    color: COLOR.overflowBlue,
    image: "crits/cyberpunk/flagshipBot.webp",
    description: "Hires 1 free worker on this floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers([context.floor], balance.flagshipBotWorkers),
  },
  androidAllure: {
    label: "Android Allure",
    color: COLOR.teal,
    image: "crits/cyberpunk/androidAllure.webp",
    description: "Boosts every worker for 59s, counting as 1 extra worker",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.androidAllureBoostSeconds, balance.androidAllureExtraWorkers),
  },
  chromeArmCharm: {
    label: "Chrome Arm Charm",
    color: COLOR.fastForwardBlue,
    image: "crits/cyberpunk/chromeArmCharm.webp",
    description: "Repeats the crit on the floor above, 64% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.chromeArmCharmContinueChance),
  },
  silverCircuitSiren: {
    label: "Silver Circuit Siren",
    color: COLOR.cyan,
    image: "crits/cyberpunk/silverCircuitSiren.webp",
    description: "Two tier promotions and thirty-seven upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(context.floor, balance.silverCircuitSirenTierSteps, balance.silverCircuitSirenUpgrades),
  },
  visorVixen: {
    label: "Visor Vixen",
    color: COLOR.summerSaleOrange,
    image: "crits/cyberpunk/visorVixen.webp",
    description: "Cuts every price in this building by 10.8%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.visorVixenDiscount),
  },
  winkProtocol: {
    label: "Wink Protocol",
    color: COLOR.springCleaningMint,
    image: "crits/cyberpunk/winkProtocol.webp",
    description: "Adds 28s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.winkProtocolSeconds),
  },
  goggleGlam: {
    label: "Goggle Glam",
    color: COLOR.fastForwardBlue,
    image: "crits/cyberpunk/goggleGlam.webp",
    description: "Boosts every worker for 60s, counting as 1 extra worker",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.goggleGlamBoostSeconds, balance.goggleGlamExtraWorkers),
  },
  purpleVisorReaper: {
    label: "Purple Visor Reaper",
    color: COLOR.peppermintPink,
    image: "crits/cyberpunk/purpleVisorReaper.webp",
    description: "Repeats the crit on the floor below, 64% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.purpleVisorReaperContinueChance),
  },
  jawplateJackpot: {
    label: "Jawplate Jackpot",
    color: COLOR.internSkyBlue,
    image: "crits/cyberpunk/jawplateJackpot.webp",
    description: "Two tier promotions and thirty-eight upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(context.floor, balance.jawplateJackpotTierSteps, balance.jawplateJackpotUpgrades),
  },
  cyanCranium: {
    label: "Cyan Cranium",
    color: COLOR.cyan,
    image: "crits/cyberpunk/cyanCranium.webp",
    description: "Cuts every price in this building by 10.9%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.cyanCraniumDiscount),
  },
  redEyeReboot: {
    label: "Red Eye Reboot",
    color: COLOR.cyan,
    image: "crits/cyberpunk/redEyeReboot.webp",
    description: "Adds 10.4% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.redEyeRebootShare),
  },
  headsetHaunt: {
    label: "Headset Haunt",
    color: COLOR.peppermintPink,
    image: "crits/cyberpunk/headsetHaunt.webp",
    description: "Boosts every worker for 61s, counting as 1 extra worker",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.headsetHauntBoostSeconds, balance.headsetHauntExtraWorkers),
  },
  errorEyes: {
    label: "Error Eyes",
    color: COLOR.cyan,
    image: "crits/cyberpunk/errorEyes.webp",
    description: "Repeats the crit on the floor above, 65% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.errorEyesContinueChance),
  },
  sparkheadSentinel: {
    label: "Sparkhead Sentinel",
    color: COLOR.internSkyBlue,
    image: "crits/cyberpunk/sparkheadSentinel.webp",
    description: "Two tier promotions and thirty-nine upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(context.floor, balance.sparkheadSentinelTierSteps, balance.sparkheadSentinelUpgrades),
  },
  blueGlareBot: {
    label: "Blue Glare Bot",
    color: COLOR.internSkyBlue,
    image: "crits/cyberpunk/blueGlareBot.webp",
    description: "Cuts every price in this building by 11%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.blueGlareBotDiscount),
  },
  starstruckSteel: {
    label: "Starstruck Steel",
    color: COLOR.fastForwardBlue,
    image: "crits/cyberpunk/starstruckSteel.webp",
    description: "Adds 10.5% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.starstruckSteelShare),
  },
  miniMechaHelm: {
    label: "Mini Mecha Helm",
    color: COLOR.fastForwardBlue,
    image: "crits/cyberpunk/miniMechaHelm.webp",
    description: "Boosts every worker for 62s, counting as 1 extra worker",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.miniMechaHelmBoostSeconds, balance.miniMechaHelmExtraWorkers),
  },
  deusEx: {
    label: "Deus Ex",
    color: COLOR.overflowBlue,
    image: "crits/cyberpunk/deusEx.webp",
    description: "Grows this floor's level by 12.7% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.deusExGrowth),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
