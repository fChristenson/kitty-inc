import type { GOTHAM_CRITS } from "../../critData/gotham";
import type { FeaturedRewards } from "./types";

export const GOTHAM_REWARDS = {
  iAmTheNight: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.iAmTheNightWorkers),
  tubs: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.tubsPayouts),
  whySoSerious: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.whySoSeriousTierSteps,
      balance.whySoSeriousUpgrades,
    ),
  batman: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.batmanContinueChance),
  joker: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.jokerFloors),
  harleyQuinn: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.harleyQuinnContinueChance),
  killerCroc: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.killerCrocShare),
  mrFreeze: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.mrFreezeFloors),
  poisonIvy: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.poisonIvyShare),
  scarecrow: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.scarecrowUpgrades),
  thePenguin: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.thePenguinSeconds),
  theRiddler: (context, { actions }) => {
    actions.giveOfficeChairs([context.floor]);
    actions.giveOfficeSupplies([context.floor]);
  },
  bane: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.baneUpgrades),
  harleyQuinn2: (context, { actions }) =>
    actions.startEvent(context.floors, "spendingFreeze"),
  killerCroc2: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.killerCroc2BoostSeconds,
      balance.killerCroc2ExtraWorkers,
    ),
  poisonIvy2: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.poisonIvy2Upgrades),
  poisonIvy3: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.poisonIvy3Payouts),
  thePenguin2: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.thePenguin2Share),
} satisfies FeaturedRewards<typeof GOTHAM_CRITS>;
