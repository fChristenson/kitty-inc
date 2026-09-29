import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const SHOWTIME_CRITS = {
  ballerina: {
    label: "Pirouette",
    color: COLOR.peppermintPink,
    image: "crits/showtime/ballerina.webp",
    description: "Locks this floor's upgrade price for 5s",
    reward: (context, { actions }) =>
      actions.startEvent([context.floor], "frozen"),
  },
  cowboy: {
    label: "Roundup Rodeo",
    color: COLOR.gold,
    image: "crits/showtime/cowboy.webp",
    description: "Eight free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.cowboyUpgrades),
  },
  dinnerTime: {
    label: "Dinner Time",
    color: COLOR.moneyGreen,
    image: "crits/showtime/dinnerTime.webp",
    description: "Five instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.dinnerTimePayouts),
  },
  fingerGuns: {
    label: "Finger Guns",
    color: COLOR.blue,
    image: "crits/showtime/fingerGuns.webp",
    description: "Free office supplies for this floor",
    reward: (context, { actions }) =>
      actions.giveOfficeSupplies([context.floor]),
  },
  flamenco: {
    label: "Flamenco",
    color: COLOR.red,
    image: "crits/showtime/flamenco.webp",
    description: "Boosts this floor's workers for 21s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.flamencoBoostSeconds,
        balance.flamencoExtraWorkers,
      ),
  },
  milestone: {
    label: "Milestone",
    color: COLOR.cyan,
    image: "crits/showtime/milestone.webp",
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
    image: "crits/showtime/moonwalker.webp",
    description: "Boosts this floor's workers for 21s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.moonwalkerBoostSeconds,
        balance.moonwalkerExtraWorkers,
      ),
  },
  ninja: {
    label: "Ninja Bonus",
    color: COLOR.nightShiftIndigo,
    image: "crits/showtime/ninja.webp",
    description: "Boosts this floor's workers for 22s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.ninjaBoostSeconds,
        balance.ninjaExtraWorkers,
      ),
  },
  obelisk: {
    label: "Obelisk",
    color: COLOR.mysticTeal,
    image: "crits/showtime/obelisk.webp",
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
    image: "crits/showtime/sharpShooter.webp",
    description: "Boosts this floor's workers for 21s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.sharpShooterBoostSeconds,
        balance.sharpShooterExtraWorkers,
      ),
  },
  space: {
    label: "Space Race",
    color: COLOR.orange,
    image: "crits/showtime/space.webp",
    description: "Twenty free upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.spaceUpgrades),
  },
  yesChef: {
    label: "Yes, Chef",
    color: COLOR.blue,
    image: "crits/showtime/yesChef.webp",
    description: "Eight instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.yesChefPayouts),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
