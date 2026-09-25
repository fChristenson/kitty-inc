import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createGameQuotesRewards({
  actions,
  balance,
  highestFloor,
  lowestLevel,
  selectByRate,
  alternating,
  promoteAndUpgrade,
}: RewardHelpers) {
  return {
    wizard: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.wizardTierSteps,
        balance.wizardUpgrades,
      ),
    epic: (context) => actions.upgrade([context.floor], balance.epicUpgrades),
    ready: (context) => {
      const topEarner = selectByRate(context, true);
      actions.upgrade([topEarner], balance.readyUpgrades);
      actions.payCycles([topEarner], balance.readyPayouts);
    },
    workWork: (context) =>
      actions.upgrade(context.floors, balance.workWorkUpgrades),
    yesWarchief: (context) =>
      actions.payCycles(context.floors, balance.yesWarchiefPayouts),
    youAreNotPrepared: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.youAreNotPreparedTierSteps,
        balance.youAreNotPreparedUpgrades,
      ),
    arcana: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.arcanaTierSteps,
        balance.arcanaUpgrades,
      ),
    bigDaddy: (context) =>
      actions.upgrade([context.floor], balance.bigDaddyUpgrades),
    chonk: (context) =>
      actions.payCycles([context.floor], balance.chonkPayouts),
    cyberPunk: (context) =>
      actions.upgrade([context.floor], balance.cyberPunkUpgrades),
    dodgeThis: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.dodgeThisPayouts,
      ),
    whiteRabbit: (context) => {
      const lowest = lowestLevel(context);
      actions.upgrade([context.floor], balance.whiteRabbitUpgrades);
      if (lowest !== context.floor)
        actions.upgrade([lowest], balance.whiteRabbitUpgrades);
    },
    gladiator: (context) =>
      actions.upgrade(context.floors, balance.gladiatorUpgrades),
    iDidntAskForThis: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.iDidntAskForThisTierSteps,
        balance.iDidntAskForThisUpgrades,
      ),
    iHatePortals: (context) =>
      actions.payCycles([context.floor], balance.iHatePortalsPayouts),
    littleSister: (context) =>
      actions.upgrade([lowestLevel(context)], balance.littleSisterUpgrades),
    magicIsATool: (context) =>
      actions.upgrade(alternating(context), balance.magicIsAToolUpgrades),
    megaChonk: (context) =>
      actions.payCycles([context.floor], balance.megaChonkPayouts),
    metal: (context) =>
      actions.upgrade([highestFloor(context)], balance.metalUpgrades),
    princess: (context) =>
      actions.payCycles(alternating(context), balance.princessPayouts),
    spaceAndTime: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.spaceAndTimeUpgrades,
      ),
    thinkWithYourHead: (context) => {
      const floor = lowestLevel(context);
      actions.upgrade([floor], balance.thinkWithYourHeadUpgrades);
      actions.payCycles([floor], balance.thinkWithYourHeadPayouts);
    },
    wouldYouKindly: (context) =>
      actions.payCycles(context.floors, balance.wouldYouKindlyPayouts),
    yesYourHighness: (context) =>
      actions.upgrade(context.floors, balance.yesYourHighnessUpgrades),
    bulletDodger: (context) =>
      actions.upgrade([context.floor], balance.bulletDodgerUpgrades),
    nothingToSee: (context) =>
      actions.payCycles([context.floor], balance.nothingToSeePayouts),
    nowIAmSuspicious: (context) =>
      actions.payCycles(context.floors, balance.nowIAmSuspiciousPayouts),
    redOrBlue: (context) => {
      actions.upgrade([lowestLevel(context)], balance.redOrBlueUpgrades);
      actions.payCycles(
        [selectByRate(context, true)],
        balance.redOrBluePayouts,
      );
    },
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
