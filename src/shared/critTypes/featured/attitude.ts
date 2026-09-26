import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const ATTITUDE_CRITS = {
  goldenSkull: {
    label: "Golden Skull",
    color: COLOR.gold,
    image: "crits/attitude/goldenSkull.png",
    description: "Thirteen free upgrades, then nineteen payouts on this floor",
    reward: (context, { actions, balance }) => {
      actions.upgrade([context.floor], balance.goldenSkullUpgrades);
      actions.payCycles([context.floor], balance.goldenSkullPayouts);
    },
  },
  lordOfMurder: {
    label: "Lord of Murder",
    color: COLOR.red,
    image: "crits/attitude/lordOfMurder.png",
    description: "Eight upgrades, then six payouts on every unlocked floor",
    reward: (context, { actions, balance }) => {
      actions.upgrade(context.floors, balance.lordOfMurderUpgrades);
      actions.payCycles(context.floors, balance.lordOfMurderPayouts);
    },
  },
  speedDemon: {
    label: "Speed Demon",
    color: COLOR.cyan,
    image: "crits/attitude/speedDemon.png",
    description:
      "Eleven upgrades, then seventeen payouts on the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) => {
      const floor = selectByRate(context, true);
      actions.upgrade([floor], balance.speedDemonUpgrades);
      actions.payCycles([floor], balance.speedDemonPayouts);
    },
  },
  badonkadonk: {
    label: "Badonkadonk",
    color: COLOR.gold,
    image: "crits/attitude/badonkadonk.png",
    description: "Ten free upgrades, then twelve payouts on this floor",
    reward: (context, { actions, balance }) => {
      actions.upgrade([context.floor], balance.badonkadonkUpgrades);
      actions.payCycles([context.floor], balance.badonkadonkPayouts);
    },
  },
  demonicBuns: {
    label: "Demonic Buns",
    color: COLOR.red,
    image: "crits/attitude/demoncBuns.png",
    description: "Sixteen free upgrades, then twenty-one payouts on this floor",
    reward: (context, { actions, balance }) => {
      actions.upgrade([context.floor], balance.demonicBunsUpgrades);
      actions.payCycles([context.floor], balance.demonicBunsPayouts);
    },
  },
  infernalInterest: {
    label: "Infernal Wagon",
    color: COLOR.orange,
    image: "crits/attitude/infernalInterest.png",
    description:
      "Twenty free upgrades, then twenty-seven payouts on this floor",
    reward: (context, { actions, balance }) => {
      actions.upgrade([context.floor], balance.infernalInterestUpgrades);
      actions.payCycles([context.floor], balance.infernalInterestPayouts);
    },
  },
  dropItLow: {
    label: "Drop It Low",
    color: COLOR.cyan,
    image: "crits/attitude/dropItLow.png",
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
    image: "crits/attitude/kittyWagon.png",
    description: "Three upgrades, then two payouts on every unlocked floor",
    reward: (context, { actions, balance }) => {
      actions.upgrade(context.floors, balance.kittyWagonUpgrades);
      actions.payCycles(context.floors, balance.kittyWagonPayouts);
    },
  },
  madeYouLook: {
    label: "Made You Look",
    color: COLOR.peppermintPink,
    image: "crits/attitude/madeYouLook.png",
    description: "Six free upgrades, then seven payouts on this floor",
    reward: (context, { actions, balance }) => {
      actions.upgrade([context.floor], balance.madeYouLookUpgrades);
      actions.payCycles([context.floor], balance.madeYouLookPayouts);
    },
  },
  wagonWarrior: {
    label: "Wagon Warrior",
    color: COLOR.silverTicketGray,
    image: "crits/attitude/wagonWarrior.png",
    description: "Five upgrades, then three payouts on every unlocked floor",
    reward: (context, { actions, balance }) => {
      actions.upgrade(context.floors, balance.wagonWarriorUpgrades);
      actions.payCycles(context.floors, balance.wagonWarriorPayouts);
    },
  },
  bubbleButt: {
    label: "Bubble Butt",
    color: COLOR.orange,
    image: "crits/attitude/bubbleButt.png",
    description: "Eight free upgrades, then nine payouts on this floor",
    reward: (context, { actions, balance }) => {
      actions.upgrade([context.floor], balance.bubbleButtUpgrades);
      actions.payCycles([context.floor], balance.bubbleButtPayouts);
    },
  },
  canNotLie: {
    label: "Can Not Lie",
    color: COLOR.moneyGreen,
    image: "crits/attitude/canNotLie.png",
    description: "Twelve free upgrades, then fifteen payouts on this floor",
    reward: (context, { actions, balance }) => {
      actions.upgrade([context.floor], balance.canNotLieUpgrades);
      actions.payCycles([context.floor], balance.canNotLiePayouts);
    },
  },
  demonGirl: {
    label: "Demon Girl",
    color: COLOR.fullHouseCrimson,
    image: "crits/attitude/demonGirl.png",
    description: "Thirty-four upgrades and thirty-six payouts on this floor",
    reward: (context, { balance, upgradeAndPay }) =>
      upgradeAndPay(
        [context.floor],
        balance.demonGirlUpgrades,
        balance.demonGirlPayouts,
      ),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
