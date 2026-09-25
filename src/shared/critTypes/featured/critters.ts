import type { CritProcDisplayInfo } from "../index";
import { COLOR } from "../../../palette";

export const CRITTERS_CRIT_INFO = {
  crownHedgehog: {
    label: "Crown Hedgehog",
    color: COLOR.goldenHandshakeGold,
    icon: "crownHedgehog",
    description: "One tier promotion and twenty-two upgrades here",
  },
  lanternFox: {
    label: "Lantern Fox",
    color: COLOR.orange,
    icon: "lanternFox",
    description: "Thirty-one payouts from the highest-earning floor",
  },
  lanternLynx: {
    label: "Lantern Lynx",
    color: COLOR.orange,
    icon: "lanternLynx",
    description: "Twenty-three free upgrades on the lowest-level floor",
  },
  pearlOtter: {
    label: "Pearl Otter",
    color: COLOR.cyan,
    icon: "pearlOtter",
    description: "Thirty instant payouts on this floor",
  },
  profitPigeon: {
    label: "Profit Pigeon",
    color: COLOR.moneyGreen,
    icon: "profitPigeon",
    description: "Twenty-seven payouts on alternating floors",
  },
  redPanda: {
    label: "Red Panda",
    color: COLOR.red,
    icon: "redPanda",
    description: "Thirty-one upgrades on alternating floors",
  },
  goldenGardenGolem: {
    label: "Golden Garden Golem",
    color: COLOR.goldenHandshakeGold,
    icon: "goldenGardenGolem",
    description: "Thirty-three payouts on every unlocked floor",
  },
  vaultBeetle: {
    label: "Vault Beetle",
    color: COLOR.gold,
    icon: "vaultBeetle",
    description: "Thirty-four free upgrades on this floor",
  },
  antleredFoxFortune: {
    label: "Antlered Fox Fortune",
    color: COLOR.orange,
    icon: "antleredFoxFortune",
    description: "Thirty-four free upgrades on this floor",
  },
  bestestBoy: {
    label: "Bestest Boy",
    color: COLOR.summerSaleOrange,
    icon: "bestestBoy",
    description: "Forty-one free upgrades on this floor",
  },
  doggo: {
    label: "Doggo",
    color: COLOR.roundUpOrange,
    icon: "doggo",
    description: "Thirty-eight instant payouts on every unlocked floor",
  },
  otterlyAdorable: {
    label: "Otterly Adorable",
    color: COLOR.teaBreakBrown,
    icon: "otterlyAdorable",
    description: "Thirty-five instant payouts on this floor",
  },
  sleepyFox: {
    label: "Fox Nap",
    color: COLOR.teaBreakBrown,
    icon: "sleepyFox",
    description: "Thirty-four instant payouts on this floor",
  },
  sleepyPanda: {
    label: "Panda Snooze",
    color: COLOR.nightShiftIndigo,
    icon: "sleepyPanda",
    description: "Forty-three free upgrades on this floor",
  },
} as const satisfies Record<string, CritProcDisplayInfo>;
