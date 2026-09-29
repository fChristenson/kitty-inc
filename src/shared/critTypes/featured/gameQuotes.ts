import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const GAME_QUOTES_CRITS = {
  wizard: {
    label: "Wizard",
    color: COLOR.purple,
    image: "crits/gameQuotes/wizard.webp",
    description: "Two tier promotions and five upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.wizardTierSteps,
        balance.wizardUpgrades,
      ),
  },
  epic: {
    label: "Epic Loot",
    color: COLOR.royalFlushPurple,
    image: "crits/gameQuotes/epic.webp",
    description: "One tier promotion and 12 upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.epicTierSteps,
        balance.epicUpgrades,
      ),
  },
  ready: {
    label: "Dual Wield",
    color: COLOR.fourOfAKindIndigo,
    image: "crits/gameQuotes/ready.webp",
    description: "Cuts every price in this building by 1.1%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.readyDiscount),
  },
  workWork: {
    label: "Work Work",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/gameQuotes/workWork.webp",
    description: "Free office chairs for this floor",
    reward: (context, { actions }) => actions.giveOfficeChairs([context.floor]),
  },
  yesWarchief: {
    label: "Yes, Warchief",
    color: COLOR.doubleDownCrimson,
    image: "crits/gameQuotes/yesWarchief.webp",
    description: "Fourteen instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.yesWarchiefPayouts),
  },
  youAreNotPrepared: {
    label: "Not Prepared",
    color: COLOR.threeOfAKindGreen,
    image: "crits/gameQuotes/youAreNotPrepared.webp",
    description: "Two tier promotions and nine upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.youAreNotPreparedTierSteps,
        balance.youAreNotPreparedUpgrades,
      ),
  },
  arcana: {
    label: "Arcane Surge",
    color: COLOR.pairBlue,
    image: "crits/gameQuotes/arcana.webp",
    description: "One tier promotion and twelve upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.arcanaTierSteps,
        balance.arcanaUpgrades,
      ),
  },
  bigDaddy: {
    label: "Big Daddy",
    color: COLOR.mysticTeal,
    image: "crits/gameQuotes/bigDaddy.webp",
    description: "Cuts every price in this building by 2%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.bigDaddyDiscount),
  },
  chonk: {
    label: "Chonk",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/gameQuotes/chonk.webp",
    description: "Sixteen instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.chonkPayouts),
  },
  cyberPunk: {
    label: "Cyberpunk",
    color: COLOR.cyan,
    image: "crits/gameQuotes/cyberPunk.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  dodgeThis: {
    label: "Dodge This",
    color: COLOR.unionBossSlate,
    image: "crits/gameQuotes/dodgeThis.webp",
    description: "Six payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.dodgeThisPayouts,
      ),
  },
  whiteRabbit: {
    label: "White Rabbit",
    color: COLOR.silverTicketGray,
    image: "crits/gameQuotes/whiteRabbit.webp",
    description: "Five upgrades here and five on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) => {
      const lowest = lowestLevel(context);
      actions.upgrade([context.floor], balance.whiteRabbitUpgrades);
      if (lowest !== context.floor)
        actions.upgrade([lowest], balance.whiteRabbitUpgrades);
    },
  },
  gladiator: {
    label: "Gladiator",
    color: COLOR.goldenHandshakeGold,
    image: "crits/gameQuotes/gladiator.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  iDidntAskForThis: {
    label: "I Didn't Ask For This",
    color: COLOR.rainCheckBlue,
    image: "crits/gameQuotes/iDidntAskForThis.webp",
    description: "One tier promotion and twenty upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.iDidntAskForThisTierSteps,
        balance.iDidntAskForThisUpgrades,
      ),
  },
  iHatePortals: {
    label: "I Hate Portals",
    color: COLOR.snowdayFrost,
    image: "crits/gameQuotes/iHatePortals.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.iHatePortalsFloors),
  },
  littleSister: {
    label: "Little Sister",
    color: COLOR.easterSalePink,
    image: "crits/gameQuotes/littleSister.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  magicIsATool: {
    label: "Magic Is a Tool",
    color: COLOR.halloweenSalePurple,
    image: "crits/gameQuotes/magicIsATool.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  megaChonk: {
    label: "Mega Chonk",
    color: COLOR.fullHouseCrimson,
    image: "crits/gameQuotes/megaChonk.webp",
    description: "Twenty-two instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.megaChonkPayouts),
  },
  metal: {
    label: "Heavy Metal",
    color: COLOR.goldStandardAmber,
    image: "crits/gameQuotes/metal.webp",
    description:
      "Repeats the crit on the floor below, 13% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.metalContinueChance),
  },
  princess: {
    label: "Princess Cut",
    color: COLOR.springSalePink,
    image: "crits/gameQuotes/princess.webp",
    description: "One tier promotion and 13 upgrades on the lowest-level floor",
    reward: (context, { balance, promoteAndUpgrade, lowestLevel }) =>
      promoteAndUpgrade(
        lowestLevel(context),
        balance.princessTierSteps,
        balance.princessUpgrades,
      ),
  },
  spaceAndTime: {
    label: "Space and Time",
    color: COLOR.nightShiftIndigo,
    image: "crits/gameQuotes/spaceAndTime.webp",
    description: "Nine upgrades on this floor and every floor below",
    reward: (context, { actions, balance }) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.spaceAndTimeUpgrades,
      ),
  },
  thinkWithYourHead: {
    label: "Think With Your Head",
    color: COLOR.executiveOrderTeal,
    image: "crits/gameQuotes/thinkWithYourHead.webp",
    description:
      "Repeats the crit on the floor above, 10% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(
        context,
        "up",
        balance.thinkWithYourHeadContinueChance,
      ),
  },
  wouldYouKindly: {
    label: "Would You Kindly",
    color: COLOR.espressoShotBrown,
    image: "crits/gameQuotes/wouldYouKindly.webp",
    description: "Sixteen instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.wouldYouKindlyPayouts),
  },
  yesYourHighness: {
    label: "Yes, Your Highness",
    color: COLOR.heavenlyGold,
    image: "crits/gameQuotes/yesYourHighness.webp",
    description: "Nineteen free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.yesYourHighnessUpgrades),
  },
  bulletDodger: {
    label: "Bullet Dodger",
    color: COLOR.pairBlue,
    image: "crits/gameQuotes/bulletDodger.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  nothingToSee: {
    label: "Nothing to See",
    color: COLOR.bullMarketGreen,
    image: "crits/gameQuotes/nothingToSee.webp",
    description:
      "Repeats the crit on the floor below, 14% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.nothingToSeeContinueChance),
  },
  nowIAmSuspicious: {
    label: "Now I'm Suspicious",
    color: COLOR.nightOwlIndigo,
    image: "crits/gameQuotes/nowIAmSuspicious.webp",
    description: "Boosts this floor's workers for 24s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.nowIAmSuspiciousBoostSeconds,
        balance.nowIAmSuspiciousExtraWorkers,
      ),
  },
  redOrBlue: {
    label: "Red or Blue",
    color: COLOR.grandOpeningRose,
    image: "crits/gameQuotes/redOrBlue.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
