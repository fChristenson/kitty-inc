import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const SHOWTIME_CRITS = {
  ballerina: {
    label: "Pirouette",
    color: COLOR.peppermintPink,
    image: "crits/showtime/ballerina.png",
    description: "Three free upgrades and three payouts on this floor",
    reward: (context, { actions, balance }) => {
      actions.upgrade([context.floor], balance.ballerinaUpgrades);
      actions.payCycles([context.floor], balance.ballerinaPayouts);
    },
  },
  cowboy: {
    label: "Roundup Rodeo",
    color: COLOR.gold,
    image: "crits/showtime/cowboy.png",
    description: "Eight free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.cowboyUpgrades),
  },
  dinnerTime: {
    label: "Dinner Time",
    color: COLOR.moneyGreen,
    image: "crits/showtime/dinnerTime.png",
    description: "Five instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.dinnerTimePayouts),
  },
  fingerGuns: {
    label: "Finger Guns",
    color: COLOR.blue,
    image: "crits/showtime/fingerGuns.png",
    description: "Two upgrades here and two on the highest floor",
    reward: (context, { actions, balance, highestFloor }) => {
      actions.upgrade([context.floor], balance.fingerGunsUpgrades);
      actions.upgrade([highestFloor(context)], balance.fingerGunsUpgrades);
    },
  },
  flamenco: {
    label: "Flamenco",
    color: COLOR.red,
    image: "crits/showtime/flamenco.png",
    description: "Seven free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.flamencoUpgrades),
  },
  milestone: {
    label: "Milestone",
    color: COLOR.cyan,
    image: "crits/showtime/milestone.png",
    description: "Raises this floor to the next multiple of 25",
    reward: (context, { actions, balance }) => {
      const count =
        balance.milestoneStep -
        (context.floor.upgradeCount % balance.milestoneStep);
      actions.upgrade([context.floor], count);
    },
  },
  moonwalker: {
    label: "Moonwalk",
    color: COLOR.silverTicketGray,
    image: "crits/showtime/moonwalker.png",
    description: "Six upgrades on this floor and every floor below",
    reward: (context, { actions, balance }) => {
      const targets = context.floors.slice(
        0,
        context.floors.indexOf(context.floor) + 1,
      );
      actions.upgrade(targets, balance.moonwalkerUpgrades);
    },
  },
  ninja: {
    label: "Ninja Bonus",
    color: COLOR.nightShiftIndigo,
    image: "crits/showtime/ninja.png",
    description: "Twelve free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.ninjaUpgrades),
  },
  obelisk: {
    label: "Obelisk",
    color: COLOR.mysticTeal,
    image: "crits/showtime/obelisk.png",
    description: "Two tier promotions and two upgrades on this floor",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.obeliskTierSteps,
        balance.obeliskUpgrades,
      ),
  },
  sharpShooter: {
    label: "Sharpshooter",
    color: COLOR.starYellow,
    image: "crits/showtime/sharpShooter.png",
    description: "Ten payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.sharpShooterPayouts,
      ),
  },
  space: {
    label: "Space Race",
    color: COLOR.orange,
    image: "crits/showtime/space.png",
    description: "Twenty free upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.spaceUpgrades),
  },
  yesChef: {
    label: "Yes, Chef",
    color: COLOR.blue,
    image: "crits/showtime/yesChef.png",
    description: "Eight instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.yesChefPayouts),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
