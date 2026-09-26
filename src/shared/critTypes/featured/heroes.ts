import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const HEROES_CRITS = {
  blessed: {
    label: "Blessed",
    color: COLOR.heavenlyGold,
    image: "crits/heroes/blessed.png",
    description: "One tier promotion and three upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.blessedTierSteps,
        balance.blessedUpgrades,
      ),
  },
  centurion: {
    label: "Centurion",
    color: COLOR.red,
    image: "crits/heroes/centurion.png",
    description: "One hundred free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.centurionUpgrades),
  },
  checkUp: {
    label: "Check Up",
    color: COLOR.cyan,
    image: "crits/heroes/checkUp.png",
    description: "Four upgrades and two payouts on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) => {
      const floor = lowestLevel(context);
      actions.upgrade([floor], balance.checkUpUpgrades);
      actions.payCycles([floor], balance.checkUpPayouts);
    },
  },
  fireman: {
    label: "First Responder",
    color: COLOR.orange,
    image: "crits/heroes/fireman.png",
    description: "Three upgrades, then one payout on every floor",
    reward: (context, { actions, balance }) => {
      actions.upgrade(context.floors, balance.firemanUpgrades);
      actions.payCycles(context.floors, balance.firemanPayouts);
    },
  },
  forTheEmperor: {
    label: "For the Emperor",
    color: COLOR.blue,
    image: "crits/heroes/forTheEmperor.png",
    description: "Twenty-five upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.forTheEmperorUpgrades),
  },
  forTheKing: {
    label: "For the King",
    color: COLOR.starYellow,
    image: "crits/heroes/forTheKing.png",
    description: "Fifteen upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.forTheKingUpgrades),
  },
  hammerTime: {
    label: "Hammer Time",
    color: COLOR.red,
    image: "crits/heroes/hammerTime.png",
    description: "Nine free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.hammerTimeUpgrades),
  },
  robinHood: {
    label: "Honor among thieves",
    color: COLOR.moneyGreen,
    image: "crits/heroes/robinHood.png",
    description: "Seven top-earner payouts; three lowest-level upgrades",
    reward: (context, { actions, balance, lowestLevel, selectByRate }) => {
      actions.payCycles(
        [selectByRate(context, true)],
        balance.robinHoodPayouts,
      );
      actions.upgrade([lowestLevel(context)], balance.robinHoodUpgrades);
    },
  },
  roman: {
    label: "Roman Holiday",
    color: COLOR.fullHouseCrimson,
    image: "crits/heroes/roman.png",
    description: "Nine upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.romanUpgrades),
  },
  samurai: {
    label: "Samurai",
    color: COLOR.fullHouseCrimson,
    image: "crits/heroes/samurai.png",
    description: "Thirty free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.samuraiUpgrades),
  },
  spy: {
    label: "Undercover",
    color: COLOR.nightShiftIndigo,
    image: "crits/heroes/spy.png",
    description: "Seventeen upgrades on the lowest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.upgrade([selectByRate(context, false)], balance.spyUpgrades),
  },
  theLawWon: {
    label: "The Law Won",
    color: COLOR.blue,
    image: "crits/heroes/theLawWon.png",
    description: "Six upgrades and two payouts on the cheapest floor",
    reward: (context, { actions, balance, cheapest }) => {
      const floor = cheapest(context);
      actions.upgrade([floor], balance.theLawWonUpgrades);
      actions.payCycles([floor], balance.theLawWonPayouts);
    },
  },
  victorian: {
    label: "High Society",
    color: COLOR.gold,
    image: "crits/heroes/victorian.png",
    description: "Nine payouts on alternating floors, from the ground",
    reward: (context, { actions, balance }) =>
      actions.payCycles(
        context.floors.filter(
          (floor, index) => floor.unlocked && index % 2 === 0,
        ),
        balance.victorianPayouts,
      ),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
