import type { CritProcDisplayInfo } from "../index";
import { COLOR } from "../../../palette";

export const CYBERPUNK_CRIT_INFO = {
  chromeDome: {
    label: "Chrome Dome",
    color: COLOR.cyan,
    icon: "chromeDome",
    description: "Fourteen upgrades, then twenty-three payouts on this floor",
  },
  skullSyndicate: {
    label: "Skull Syndicate",
    color: COLOR.peppermintPink,
    icon: "skullSyndicate",
    description: "Nine upgrades, then seven payouts on every unlocked floor",
  },
  circuitDuchess: {
    label: "Circuit Duchess",
    color: COLOR.cyan,
    icon: "circuitDuchess",
    description: "Six upgrades, then thirteen payouts on this floor",
  },
  cyberCat: {
    label: "Cyber Cat",
    color: COLOR.red,
    icon: "cyberCat",
    description: "Four upgrades, then seven payouts on every unlocked floor",
  },
  chromeChassis: {
    label: "Chrome Chassis",
    color: COLOR.silverTicketGray,
    icon: "chromeChassis",
    description: "Six upgrades, then five payouts on every unlocked floor",
  },
  elbowRoom: {
    label: "Elbow Room",
    color: COLOR.orange,
    icon: "elbowRoom",
    description: "Nine upgrades, then eight payouts on the lowest-level floor",
  },
  heartware: {
    label: "Heartware",
    color: COLOR.red,
    icon: "heartware",
    description: "Seven upgrades, then eighteen payouts on this floor",
  },
  pulseDividend: {
    label: "Pulse Dividend",
    color: COLOR.peppermintPink,
    icon: "pulseDividend",
    description: "Nine upgrades, then twenty-four payouts on this floor",
  },
  neonNegotiator: {
    label: "Neon Negotiator",
    color: COLOR.cyan,
    icon: "neonNegotiator",
    description:
      "Eight upgrades, then eleven payouts on the highest-earning floor",
  },
  platinumRefrain: {
    label: "Platinum Refrain",
    color: COLOR.peppermintPink,
    icon: "platinumRefrain",
    description: "Seven upgrades, then eight payouts on every unlocked floor",
  },
  retinaRoyale: {
    label: "Retina Royale",
    color: COLOR.moneyGreen,
    icon: "retinaRoyale",
    description:
      "Ten upgrades, then sixteen payouts on the highest-earning floor",
  },
  silverHandshake: {
    label: "Silver Handshake",
    color: COLOR.gold,
    icon: "silverHandshake",
    description: "Four upgrades, then six payouts on the lowest-level floor",
  },
  staticEncore: {
    label: "Static Encore",
    color: COLOR.purple,
    icon: "staticEncore",
    description:
      "Five upgrades, then seven payouts on alternating unlocked floors, from the ground",
  },
  chromeArm: {
    label: "Chrome Arm",
    color: COLOR.unionBossSlate,
    icon: "chromeArm",
    description: "Thirty-seven free upgrades on this floor",
  },
  circuitBreaker: {
    label: "Circuit Breaker",
    color: COLOR.threeOfAKindGreen,
    icon: "circuitBreaker",
    description: "Thirty-six free upgrades on this floor",
  },
  roboticGripper: {
    label: "Robotic Gripper",
    color: COLOR.blue,
    icon: "roboticGripper",
    description: "Thirty-eight free upgrades on this floor",
  },
  androidAnalyst: {
    label: "Android Analyst",
    color: COLOR.cyan,
    icon: "androidAnalyst",
    description:
      "Twenty-three upgrades and twenty-four payouts on the top earner",
  },
} as const satisfies Record<string, CritProcDisplayInfo>;
