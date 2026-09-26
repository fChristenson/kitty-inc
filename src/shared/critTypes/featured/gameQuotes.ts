import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const GAME_QUOTES_CRITS = {
  wizard: {
    label: "Wizard",
    color: COLOR.purple,
    image: "crits/gameQuotes/wizard.png",
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
    image: "crits/gameQuotes/epic.png",
    description: "Forty free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.epicUpgrades),
  },
  ready: {
    label: "Dual Wield",
    color: COLOR.fourOfAKindIndigo,
    image: "crits/gameQuotes/ready.png",
    description: "Four upgrades and four payouts on the top earner",
    reward: (context, { actions, balance, selectByRate }) => {
      const topEarner = selectByRate(context, true);
      actions.upgrade([topEarner], balance.readyUpgrades);
      actions.payCycles([topEarner], balance.readyPayouts);
    },
  },
  workWork: {
    label: "Work Work",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/gameQuotes/workWork.png",
    description: "Eleven free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.workWorkUpgrades),
  },
  yesWarchief: {
    label: "Yes, Warchief",
    color: COLOR.doubleDownCrimson,
    image: "crits/gameQuotes/yesWarchief.png",
    description: "Fourteen instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.yesWarchiefPayouts),
  },
  youAreNotPrepared: {
    label: "Not Prepared",
    color: COLOR.threeOfAKindGreen,
    image: "crits/gameQuotes/youAreNotPrepared.png",
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
    image: "crits/gameQuotes/arcana.png",
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
    image: "crits/gameQuotes/bigDaddy.png",
    description: "Forty-five free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.bigDaddyUpgrades),
  },
  chonk: {
    label: "Chonk",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/gameQuotes/chonk.png",
    description: "Sixteen instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.chonkPayouts),
  },
  cyberPunk: {
    label: "Cyberpunk",
    color: COLOR.cyan,
    image: "crits/gameQuotes/cyberPunk.png",
    description: "Thirteen free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.cyberPunkUpgrades),
  },
  dodgeThis: {
    label: "Dodge This",
    color: COLOR.unionBossSlate,
    image: "crits/gameQuotes/dodgeThis.png",
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
    image: "crits/gameQuotes/whiteRabbit.png",
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
    image: "crits/gameQuotes/gladiator.png",
    description: "Thirteen free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.gladiatorUpgrades),
  },
  iDidntAskForThis: {
    label: "I Didn't Ask For This",
    color: COLOR.rainCheckBlue,
    image: "crits/gameQuotes/iDidntAskForThis.png",
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
    image: "crits/gameQuotes/iHatePortals.png",
    description: "Eleven instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.iHatePortalsPayouts),
  },
  littleSister: {
    label: "Little Sister",
    color: COLOR.easterSalePink,
    image: "crits/gameQuotes/littleSister.png",
    description: "Seven free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.littleSisterUpgrades),
  },
  magicIsATool: {
    label: "Magic Is a Tool",
    color: COLOR.halloweenSalePurple,
    image: "crits/gameQuotes/magicIsATool.png",
    description: "Eight upgrades on alternating floors, from the ground",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.magicIsAToolUpgrades),
  },
  megaChonk: {
    label: "Mega Chonk",
    color: COLOR.fullHouseCrimson,
    image: "crits/gameQuotes/megaChonk.png",
    description: "Twenty-two instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.megaChonkPayouts),
  },
  metal: {
    label: "Heavy Metal",
    color: COLOR.goldStandardAmber,
    image: "crits/gameQuotes/metal.png",
    description: "Seventeen free upgrades on the highest floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.metalUpgrades),
  },
  princess: {
    label: "Princess Cut",
    color: COLOR.springSalePink,
    image: "crits/gameQuotes/princess.png",
    description: "Thirteen payouts on alternating floors, from the ground",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.princessPayouts),
  },
  spaceAndTime: {
    label: "Space and Time",
    color: COLOR.nightShiftIndigo,
    image: "crits/gameQuotes/spaceAndTime.png",
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
    image: "crits/gameQuotes/thinkWithYourHead.png",
    description: "Five upgrades and five payouts on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) => {
      const floor = lowestLevel(context);
      actions.upgrade([floor], balance.thinkWithYourHeadUpgrades);
      actions.payCycles([floor], balance.thinkWithYourHeadPayouts);
    },
  },
  wouldYouKindly: {
    label: "Would You Kindly",
    color: COLOR.espressoShotBrown,
    image: "crits/gameQuotes/wouldYouKindly.png",
    description: "Sixteen instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.wouldYouKindlyPayouts),
  },
  yesYourHighness: {
    label: "Yes, Your Highness",
    color: COLOR.heavenlyGold,
    image: "crits/gameQuotes/yesYourHighness.png",
    description: "Nineteen free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.yesYourHighnessUpgrades),
  },
  bulletDodger: {
    label: "Bullet Dodger",
    color: COLOR.pairBlue,
    image: "crits/gameQuotes/bulletDodger.png",
    description: "Fourteen free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.bulletDodgerUpgrades),
  },
  nothingToSee: {
    label: "Nothing to See",
    color: COLOR.bullMarketGreen,
    image: "crits/gameQuotes/nothingToSee.png",
    description: "Twenty instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.nothingToSeePayouts),
  },
  nowIAmSuspicious: {
    label: "Now I'm Suspicious",
    color: COLOR.nightOwlIndigo,
    image: "crits/gameQuotes/nowIAmSuspicious.png",
    description: "Seventeen instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.nowIAmSuspiciousPayouts),
  },
  redOrBlue: {
    label: "Red or Blue",
    color: COLOR.grandOpeningRose,
    image: "crits/gameQuotes/redOrBlue.png",
    description: "Six upgrades on the lowest floor; six top-earner payouts",
    reward: (context, { actions, balance, lowestLevel, selectByRate }) => {
      actions.upgrade([lowestLevel(context)], balance.redOrBlueUpgrades);
      actions.payCycles(
        [selectByRate(context, true)],
        balance.redOrBluePayouts,
      );
    },
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
