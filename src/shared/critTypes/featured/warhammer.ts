import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const WARHAMMER_CRITS = {
  emperorsFinest: {
    label: "Emperor's Finest",
    color: COLOR.blue,
    image: "crits/warhammer/emperorsFinest.png",
    description: "Thirty-seven payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.emperorsFinestPayouts),
  },
  eternalDuty: {
    label: "Eternal Duty",
    color: COLOR.red,
    image: "crits/warhammer/eternalDuty.png",
    description: "Twenty-seven free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.eternalDutyUpgrades),
  },
  faithIsOurShield: {
    label: "Faith Is Our Shield",
    color: COLOR.blue,
    image: "crits/warhammer/faithIsOurShield.png",
    description: "One tier promotion and twenty-four upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.faithIsOurShieldTierSteps,
        balance.faithIsOurShieldUpgrades,
      ),
  },
  fearNotThePsyker: {
    label: "Fear Not the Psyker",
    color: COLOR.purple,
    image: "crits/warhammer/fearNotThePsyker.png",
    description: "Thirty-four instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.fearNotThePsykerPayouts),
  },
  neverSurrender: {
    label: "Never Surrender",
    color: COLOR.red,
    image: "crits/warhammer/neverSurrender.png",
    description: "Thirty-five free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.neverSurrenderUpgrades),
  },
  purge: {
    label: "Purge",
    color: COLOR.red,
    image: "crits/warhammer/purge.png",
    description: "Thirty-three free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.purgeUpgrades),
  },
  toTheSkies: {
    label: "To the Skies",
    color: COLOR.blue,
    image: "crits/warhammer/toTheSkies.png",
    description: "Thirty-six upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.toTheSkiesUpgrades),
  },
  whatAreYourOrders: {
    label: "What Are Your Orders",
    color: COLOR.blue,
    image: "crits/warhammer/whatAreYourOrders.png",
    description: "Thirty free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade(
        [lowestLevel(context)],
        balance.whatAreYourOrdersUpgrades,
      ),
  },
  emperorProvidesPurrfection: {
    label: "The Emperor Provides",
    color: COLOR.blue,
    image: "crits/warhammer/emperorProvidesPurrfection.png",
    description: "Forty-four instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(
        context.floors,
        balance.emperorProvidesPurrfectionPayouts,
      ),
  },
  fortyKOfGold: {
    label: "40K of Gold",
    color: COLOR.gold,
    image: "crits/warhammer/40kOfGold.png",
    description: "Forty instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.fortyKOfGoldPayouts),
  },
  chaoticTemptation: {
    label: "Chaotic Temptation",
    color: COLOR.red,
    image: "crits/warhammer/chaoticTemptation.png",
    description: "Thirty-two instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.chaoticTemptationPayouts),
  },
  chaoticTemptation2: {
    label: "Chaos Allure",
    color: COLOR.purple,
    image: "crits/warhammer/chaoticTemptation2.png",
    description: "Thirty-four free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.chaoticTemptation2Upgrades),
  },
  chaoticTemptation3: {
    label: "Chaos Romance",
    color: COLOR.orange,
    image: "crits/warhammer/chaoticTemptation3.png",
    description: "Thirty-six free upgrades on every other floor",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.chaoticTemptation3Upgrades),
  },
  chaoticTemptation4: {
    label: "Chaos Jackpot",
    color: COLOR.heavenlyGold,
    image: "crits/warhammer/chaoticTemptation4.png",
    description: "Forty-two payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.chaoticTemptation4Payouts,
      ),
  },
  emperorsDividends: {
    label: "Emperor's Dividends",
    color: COLOR.blue,
    image: "crits/warhammer/emperorsDividends.png",
    description: "Forty-one instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.emperorsDividendsPayouts),
  },
  heavyHitter: {
    label: "Heavy Hitter",
    color: COLOR.redActive,
    image: "crits/warhammer/heavyHitter.png",
    description: "Forty-six free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.heavyHitterUpgrades),
  },
  iAmSpeed: {
    label: "I Am Speed",
    color: COLOR.cyan,
    image: "crits/warhammer/iAmSpeed.png",
    description: "Thirty-five free upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.iAmSpeedUpgrades),
  },
  neverSurrender2: {
    label: "Never Yield",
    color: COLOR.fullHouseCrimson,
    image: "crits/warhammer/neverSurrender2.png",
    description: "Forty-three free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.neverSurrender2Upgrades),
  },
  powerSword: {
    label: "Power Sword",
    color: COLOR.mysticTeal,
    image: "crits/warhammer/powerSword.png",
    description: "Two tier promotions and eighteen upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.powerSwordTierSteps,
        balance.powerSwordUpgrades,
      ),
  },
  powerSword2: {
    label: "Sword of the Emperor",
    color: COLOR.heavenlyGold,
    image: "crits/warhammer/powerSword2.png",
    description: "Forty-eight free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.powerSword2Upgrades),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
