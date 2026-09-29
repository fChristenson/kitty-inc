import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const ATTITUDE_CRITS = {
  goldenSkull: {
    label: "Golden Skull",
    color: COLOR.gold,
    image: "crits/attitude/goldenSkull.webp",
    description: "Adds 3.4% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.goldenSkullShare),
  },
  lordOfMurder: {
    label: "Lord of Murder",
    color: COLOR.red,
    image: "crits/attitude/lordOfMurder.webp",
    description: "One tier promotion and 14 upgrades on the lowest-level floor",
    reward: (context, { balance, promoteAndUpgrade, lowestLevel }) =>
      promoteAndUpgrade(
        lowestLevel(context),
        balance.lordOfMurderTierSteps,
        balance.lordOfMurderUpgrades,
      ),
  },
  speedDemon: {
    label: "Speed Demon",
    color: COLOR.cyan,
    image: "crits/attitude/speedDemon.webp",
    description: "Boosts this floor's workers for 23s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.speedDemonBoostSeconds,
        balance.speedDemonExtraWorkers,
      ),
  },
  badonkadonk: {
    label: "Badonkadonk",
    color: COLOR.gold,
    image: "crits/attitude/badonkadonk.webp",
    description: "Arms this floor's next click as an x5 crit",
    reward: (context, { actions }) => actions.armCrit([context.floor], "crit"),
  },
  demonicBuns: {
    label: "Demonic Buns",
    color: COLOR.red,
    image: "crits/attitude/demoncBuns.webp",
    description: "Sixteen free upgrades, then twenty-one payouts on this floor",
    reward: (context, { actions, balance }) => {
      actions.upgrade([context.floor], balance.demonicBunsUpgrades);
      actions.payCycles([context.floor], balance.demonicBunsPayouts);
    },
  },
  infernalInterest: {
    label: "Infernal Wagon",
    color: COLOR.orange,
    image: "crits/attitude/infernalInterest.webp",
    description: "Boosts this floor's workers for 26s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers([context.floor], balance.infernalInterestBoostSeconds, balance.infernalInterestExtraWorkers),
  },
  dropItLow: {
    label: "Drop It Low",
    color: COLOR.cyan,
    image: "crits/attitude/dropItLow.webp",
    description: "Nine upgrades, then five payouts on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) => {
      const floor = lowestLevel(context);
      actions.upgrade([floor], balance.dropItLowUpgrades);
      actions.payCycles([floor], balance.dropItLowPayouts);
    },
  },
  kittyWagon: {
    label: "Kitty Wagon",
    color: COLOR.moneyGreen,
    image: "crits/attitude/kittyWagon.webp",
    description: "Hires 1 free worker on this floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers([context.floor], balance.kittyWagonWorkers),
  },
  madeYouLook: {
    label: "Made You Look",
    color: COLOR.peppermintPink,
    image: "crits/attitude/madeYouLook.webp",
    description: "Boosts this floor's workers for 20s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.madeYouLookBoostSeconds,
        balance.madeYouLookExtraWorkers,
      ),
  },
  wagonWarrior: {
    label: "Wagon Warrior",
    color: COLOR.silverTicketGray,
    image: "crits/attitude/wagonWarrior.webp",
    description: "Five upgrades, then three payouts on every unlocked floor",
    reward: (context, { actions, balance }) => {
      actions.upgrade(context.floors, balance.wagonWarriorUpgrades);
      actions.payCycles(context.floors, balance.wagonWarriorPayouts);
    },
  },
  bubbleButt: {
    label: "Bubble Butt",
    color: COLOR.orange,
    image: "crits/attitude/bubbleButt.webp",
    description: "Boosts this floor's workers for 21s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.bubbleButtBoostSeconds,
        balance.bubbleButtExtraWorkers,
      ),
  },
  canNotLie: {
    label: "Can Not Lie",
    color: COLOR.moneyGreen,
    image: "crits/attitude/canNotLie.webp",
    description: "Boosts this floor's workers for 22s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.canNotLieBoostSeconds,
        balance.canNotLieExtraWorkers,
      ),
  },
  demonGirl: {
    label: "Demon Girl",
    color: COLOR.fullHouseCrimson,
    image: "crits/attitude/demonGirl.webp",
    description: "Cuts every price in this building by 4.5%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.demonGirlDiscount),
  },
  partnersInCrime: {
    label: "Partners In Crime",
    color: COLOR.nightShiftIndigo,
    image: "crits/attitude/partnersInCrime.webp",
    description: "Arms every floor's next click as an x5 crit",
    reward: (context, { actions }) =>
      actions.armCrit(context.floors, "crit"),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
