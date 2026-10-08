import type { HEROES_CRITS } from "../critData/heroes";
import type { FeaturedRewards } from "./types";

export const HEROES_REWARDS = {
  blessed: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.blessedTierSteps,
      balance.blessedUpgrades,
    ),
  centurion: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.centurionBoostSeconds,
      balance.centurionExtraWorkers,
    ),
  checkUp: (context, { actions, balance, lowestLevel }) => {
    const floor = lowestLevel(context);
    actions.upgrade([floor], balance.checkUpUpgrades);
    actions.payCycles([floor], balance.checkUpPayouts);
  },
  fireman: (context, { actions, balance }) => {
    actions.upgrade(context.floors, balance.firemanUpgrades);
    actions.payCycles(context.floors, balance.firemanPayouts);
  },
  forTheEmperor: (context, { actions, balance }) =>
    actions.upgrade(context.floors, balance.forTheEmperorUpgrades),
  forTheKing: (context, { actions }) => actions.armCrit([context.floor], "crit"),
  hammerTime: (context, { actions }) => actions.giveOfficeChairs([context.floor]),
  robinHood: (context, { actions }) =>
    actions.giveOfficeSupplies([context.floor]),
  roman: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.romanBoostSeconds,
      balance.romanExtraWorkers,
    ),
  samurai: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.samuraiDiscount),
  spy: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.spyBoostSeconds,
      balance.spyExtraWorkers,
    ),
  theLawWon: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.theLawWonDiscount),
  victorian: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.victorianBoostSeconds,
      balance.victorianExtraWorkers,
    ),
  uchihaItachi: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.uchihaItachiGrowth),
  geralt: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.geraltGrowth),
  purrfectOrigin: (context, { actions }) => actions.armCrit([context.floor], "crit"),
  capeEscape: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.capeEscapeDiscount),
  thunderPaws: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.thunderPawsBoostSeconds,
      balance.thunderPawsExtraWorkers,
    ),
  clawAndOrder: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  felineFury: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.felineFuryUpgrades),
  sidekickShuffle: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.sidekickShuffleWorkers),
  cosmicCatapult: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
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
} satisfies FeaturedRewards<typeof HEROES_CRITS>;
