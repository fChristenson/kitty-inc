import type { CritProcDisplayInfo } from "../index";
import { COLOR } from "../../../palette";

export const WARHAMMER_CRIT_INFO = {
  emperorsFinest: {
    label: "Emperor's Finest",
    color: COLOR.blue,
    icon: "emperorsFinest",
    description: "Thirty-seven payouts on every unlocked floor",
  },
  eternalDuty: {
    label: "Eternal Duty",
    color: COLOR.red,
    icon: "eternalDuty",
    description: "Twenty-seven free upgrades on every unlocked floor",
  },
  faithIsOurShield: {
    label: "Faith Is Our Shield",
    color: COLOR.blue,
    icon: "faithIsOurShield",
    description: "One tier promotion and twenty-four upgrades here",
  },
  fearNotThePsyker: {
    label: "Fear Not the Psyker",
    color: COLOR.purple,
    icon: "fearNotThePsyker",
    description: "Thirty-four instant payouts on this floor",
  },
  neverSurrender: {
    label: "Never Surrender",
    color: COLOR.red,
    icon: "neverSurrender",
    description: "Thirty-five free upgrades on this floor",
  },
  purge: {
    label: "Purge",
    color: COLOR.red,
    icon: "purge",
    description: "Thirty-three free upgrades on this floor",
  },
  toTheSkies: {
    label: "To the Skies",
    color: COLOR.blue,
    icon: "toTheSkies",
    description: "Thirty-six upgrades on the highest unlocked floor",
  },
  whatAreYourOrders: {
    label: "What Are Your Orders",
    color: COLOR.blue,
    icon: "whatAreYourOrders",
    description: "Thirty free upgrades on the lowest-level floor",
  },
  emperorProvidesPurrfection: {
    label: "The Emperor Provides",
    color: COLOR.blue,
    icon: "emperorProvidesPurrfection",
    description: "Forty-four instant payouts on every unlocked floor",
  },
  fortyKOfGold: {
    label: "40K of Gold",
    color: COLOR.gold,
    icon: "fortyKOfGold",
    description: "Forty instant payouts on every unlocked floor",
  },
  chaoticTemptation: {
    label: "Chaotic Temptation",
    color: COLOR.red,
    icon: "chaoticTemptation",
    description: "Thirty-two instant payouts on this floor",
  },
  chaoticTemptation2: {
    label: "Chaos Allure",
    color: COLOR.purple,
    icon: "chaoticTemptation2",
    description: "Thirty-four free upgrades on this floor",
  },
  chaoticTemptation3: {
    label: "Chaos Romance",
    color: COLOR.orange,
    icon: "chaoticTemptation3",
    description: "Thirty-six free upgrades on every other floor",
  },
  chaoticTemptation4: {
    label: "Chaos Jackpot",
    color: COLOR.heavenlyGold,
    icon: "chaoticTemptation4",
    description: "Forty-two payouts from the highest-earning floor",
  },
  emperorsDividends: {
    label: "Emperor's Dividends",
    color: COLOR.blue,
    icon: "emperorsDividends",
    description: "Forty-one instant payouts on every unlocked floor",
  },
  heavyHitter: {
    label: "Heavy Hitter",
    color: COLOR.redActive,
    icon: "heavyHitter",
    description: "Forty-six free upgrades on this floor",
  },
  iAmSpeed: {
    label: "I Am Speed",
    color: COLOR.cyan,
    icon: "iAmSpeed",
    description: "Thirty-five free upgrades on the highest unlocked floor",
  },
  neverSurrender2: {
    label: "Never Yield",
    color: COLOR.fullHouseCrimson,
    icon: "neverSurrender2",
    description: "Forty-three free upgrades on every unlocked floor",
  },
  powerSword: {
    label: "Power Sword",
    color: COLOR.mysticTeal,
    icon: "powerSword",
    description: "Two tier promotions and eighteen upgrades here",
  },
  powerSword2: {
    label: "Sword of the Emperor",
    color: COLOR.heavenlyGold,
    icon: "powerSword2",
    description: "Forty-eight free upgrades on this floor",
  },
} as const satisfies Record<string, CritProcDisplayInfo>;
