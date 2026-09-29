import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const WARHAMMER_CRITS = {
  emperorsFinest: {
    label: "Emperor's Finest",
    color: COLOR.blue,
    image: "crits/warhammer/emperorsFinest.webp",
    description: "Thirty-seven payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.emperorsFinestPayouts),
  },
  eternalDuty: {
    label: "Eternal Duty",
    color: COLOR.red,
    image: "crits/warhammer/eternalDuty.webp",
    description: "Boosts every worker for 17s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.eternalDutyBoostSeconds,
        balance.eternalDutyExtraWorkers,
      ),
  },
  faithIsOurShield: {
    label: "Faith Is Our Shield",
    color: COLOR.blue,
    image: "crits/warhammer/faithIsOurShield.webp",
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
    image: "crits/warhammer/fearNotThePsyker.webp",
    description:
      "Repeats the crit on the floor above, 37% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.fearNotThePsykerContinueChance),
  },
  neverSurrender: {
    label: "Never Surrender",
    color: COLOR.red,
    image: "crits/warhammer/neverSurrender.webp",
    description: "Arms this floor's next click as an x25 crit",
    reward: (context, { actions }) => actions.armCrit([context.floor], "mega"),
  },
  purge: {
    label: "Purge",
    color: COLOR.red,
    image: "crits/warhammer/purge.webp",
    description: "Arms this floor's next click as an x25 crit",
    reward: (context, { actions }) => actions.armCrit([context.floor], "mega"),
  },
  toTheSkies: {
    label: "To the Skies",
    color: COLOR.blue,
    image: "crits/warhammer/toTheSkies.webp",
    description: "Arms this floor's next click as an x25 crit",
    reward: (context, { actions }) => actions.armCrit([context.floor], "mega"),
  },
  whatAreYourOrders: {
    label: "What Are Your Orders",
    color: COLOR.blue,
    image: "crits/warhammer/whatAreYourOrders.webp",
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
    image: "crits/warhammer/emperorProvidesPurrfection.webp",
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
    image: "crits/warhammer/40kOfGold.webp",
    description: "Forty instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.fortyKOfGoldPayouts),
  },
  chaoticTemptation: {
    label: "Chaotic Temptation",
    color: COLOR.red,
    image: "crits/warhammer/chaoticTemptation.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.chaoticTemptationFloors),
  },
  chaoticTemptation2: {
    label: "Chaos Allure",
    color: COLOR.purple,
    image: "crits/warhammer/chaoticTemptation2.webp",
    description: "Thirty-four free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.chaoticTemptation2Upgrades),
  },
  chaoticTemptation3: {
    label: "Chaos Romance",
    color: COLOR.orange,
    image: "crits/warhammer/chaoticTemptation3.webp",
    description: "Thirty-six free upgrades on every other floor",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.chaoticTemptation3Upgrades),
  },
  chaoticTemptation4: {
    label: "Chaos Jackpot",
    color: COLOR.heavenlyGold,
    image: "crits/warhammer/chaoticTemptation4.webp",
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
    image: "crits/warhammer/emperorsDividends.webp",
    description: "Raises alternating floors to the building's top level",
    reward: (context, { actions, alternating, topLevel }) =>
      actions.raiseLevels(alternating(context), topLevel(context)),
  },
  heavyHitter: {
    label: "Heavy Hitter",
    color: COLOR.redActive,
    image: "crits/warhammer/heavyHitter.webp",
    description: "Raises every floor to the building's top level",
    reward: (context, { actions, topLevel }) =>
      actions.raiseLevels(context.floors, topLevel(context)),
  },
  iAmSpeed: {
    label: "I Am Speed",
    color: COLOR.cyan,
    image: "crits/warhammer/iAmSpeed.webp",
    description: "Boosts every worker for 32s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.iAmSpeedBoostSeconds,
        balance.iAmSpeedExtraWorkers,
      ),
  },
  neverSurrender2: {
    label: "Never Yield",
    color: COLOR.fullHouseCrimson,
    image: "crits/warhammer/neverSurrender2.webp",
    description: "Cuts every price in this building by 12.1%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.neverSurrender2Discount),
  },
  powerSword: {
    label: "Power Sword",
    color: COLOR.mysticTeal,
    image: "crits/warhammer/powerSword.webp",
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
    image: "crits/warhammer/powerSword2.webp",
    description: "Hires 3 free workers and a manager on every unlocked floor",
    reward: (context, { actions, balance }) => {
      actions.hireWorkers(context.floors, balance.powerSword2Workers);
      actions.hireManagers(context.floors);
    },
  },
  cobaltJuggernaut: {
    label: "Cobalt Juggernaut",
    color: COLOR.nightOwlIndigo,
    image: "crits/warhammer/cobaltJuggernaut.webp",
    description: "Repeats the crit on the floor below, 10% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.cobaltJuggernautContinueChance),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
