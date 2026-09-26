import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const CYBERPUNK_CRITS = {
  chromeDome: {
    label: "Chrome Dome",
    color: COLOR.cyan,
    image: "crits/cyberpunk/chromeDome.png",
    description: "Fourteen upgrades, then twenty-three payouts on this floor",
    reward: (context, { balance, upgradeAndPay }) =>
      upgradeAndPay(
        [context.floor],
        balance.chromeDomeUpgrades,
        balance.chromeDomePayouts,
      ),
  },
  skullSyndicate: {
    label: "Skull Syndicate",
    color: COLOR.peppermintPink,
    image: "crits/cyberpunk/skullSyndicate.png",
    description: "Nine upgrades, then seven payouts on every unlocked floor",
    reward: (context, { balance, upgradeAndPay }) =>
      upgradeAndPay(
        context.floors,
        balance.skullSyndicateUpgrades,
        balance.skullSyndicatePayouts,
      ),
  },
  circuitDuchess: {
    label: "Circuit Duchess",
    color: COLOR.cyan,
    image: "crits/cyberpunk/circuitDuchess.png",
    description: "Six upgrades, then thirteen payouts on this floor",
    reward: (context, { balance, upgradeAndPay }) =>
      upgradeAndPay(
        [context.floor],
        balance.circuitDuchessUpgrades,
        balance.circuitDuchessPayouts,
      ),
  },
  cyberCat: {
    label: "Cyber Cat",
    color: COLOR.red,
    image: "crits/cyberpunk/cyberCat.png",
    description: "Four upgrades, then seven payouts on every unlocked floor",
    reward: (context, { balance, upgradeAndPay }) =>
      upgradeAndPay(
        context.floors,
        balance.cyberCatUpgrades,
        balance.cyberCatPayouts,
      ),
  },
  chromeChassis: {
    label: "Chrome Chassis",
    color: COLOR.silverTicketGray,
    image: "crits/cyberpunk/chromeChassis.png",
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
    image: "crits/cyberpunk/elbowRoom.png",
    description: "Nine upgrades, then eight payouts on the lowest-level floor",
    reward: (context, { balance, lowestLevel, upgradeAndPay }) =>
      upgradeAndPay(
        [lowestLevel(context)],
        balance.elbowRoomUpgrades,
        balance.elbowRoomPayouts,
      ),
  },
  heartware: {
    label: "Heartware",
    color: COLOR.red,
    image: "crits/cyberpunk/heartware.png",
    description: "Seven upgrades, then eighteen payouts on this floor",
    reward: (context, { balance, upgradeAndPay }) =>
      upgradeAndPay(
        [context.floor],
        balance.heartwareUpgrades,
        balance.heartwarePayouts,
      ),
  },
  pulseDividend: {
    label: "Pulse Dividend",
    color: COLOR.peppermintPink,
    image: "crits/cyberpunk/pulseDividend.png",
    description: "Nine upgrades, then twenty-four payouts on this floor",
    reward: (context, { balance, upgradeAndPay }) =>
      upgradeAndPay(
        [context.floor],
        balance.pulseDividendUpgrades,
        balance.pulseDividendPayouts,
      ),
  },
  neonNegotiator: {
    label: "Neon Negotiator",
    color: COLOR.cyan,
    image: "crits/cyberpunk/neonNegotiator.png",
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
    image: "crits/cyberpunk/platinumRefrain.png",
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
    image: "crits/cyberpunk/retinaRoyale.png",
    description:
      "Ten upgrades, then sixteen payouts on the highest-earning floor",
    reward: (context, { balance, selectByRate, upgradeAndPay }) =>
      upgradeAndPay(
        [selectByRate(context, true)],
        balance.retinaRoyaleUpgrades,
        balance.retinaRoyalePayouts,
      ),
  },
  silverHandshake: {
    label: "Silver Handshake",
    color: COLOR.gold,
    image: "crits/cyberpunk/silverHandshake.png",
    description: "Four upgrades, then six payouts on the lowest-level floor",
    reward: (context, { balance, lowestLevel, upgradeAndPay }) =>
      upgradeAndPay(
        [lowestLevel(context)],
        balance.silverHandshakeUpgrades,
        balance.silverHandshakePayouts,
      ),
  },
  staticEncore: {
    label: "Static Encore",
    color: COLOR.purple,
    image: "crits/cyberpunk/staticEncore.png",
    description:
      "Five upgrades, then seven payouts on alternating unlocked floors, from the ground",
    reward: (context, { balance, alternating, upgradeAndPay }) =>
      upgradeAndPay(
        alternating(context),
        balance.staticEncoreUpgrades,
        balance.staticEncorePayouts,
      ),
  },
  chromeArm: {
    label: "Chrome Arm",
    color: COLOR.unionBossSlate,
    image: "crits/cyberpunk/chromeArm.png",
    description: "Thirty-seven free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.chromeArmUpgrades),
  },
  circuitBreaker: {
    label: "Circuit Breaker",
    color: COLOR.threeOfAKindGreen,
    image: "crits/cyberpunk/circuitBreaker.png",
    description: "Thirty-six free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.circuitBreakerUpgrades),
  },
  roboticGripper: {
    label: "Robotic Gripper",
    color: COLOR.blue,
    image: "crits/cyberpunk/roboticGripper.png",
    description: "Thirty-eight free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.roboticGripperUpgrades),
  },
  androidAnalyst: {
    label: "Android Analyst",
    color: COLOR.cyan,
    image: "crits/cyberpunk/androidAnalyst.png",
    description:
      "Twenty-three upgrades and twenty-four payouts on the top earner",
    reward: (context, { balance, selectByRate, upgradeAndPay }) =>
      upgradeAndPay(
        [selectByRate(context, true)],
        balance.androidAnalystUpgrades,
        balance.androidAnalystPayouts,
      ),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
