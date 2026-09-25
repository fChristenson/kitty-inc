import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createHeroesRewards({
  actions,
  balance,
  lowestLevel,
  selectByRate,
  cheapest,
  promoteAndUpgrade,
}: RewardHelpers) {
  return {
    blessed: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.blessedTierSteps,
        balance.blessedUpgrades,
      ),
    centurion: (context) =>
      actions.upgrade([context.floor], balance.centurionUpgrades),
    checkUp: (context) => {
      const floor = lowestLevel(context);
      actions.upgrade([floor], balance.checkUpUpgrades);
      actions.payCycles([floor], balance.checkUpPayouts);
    },
    fireman: (context) => {
      actions.upgrade(context.floors, balance.firemanUpgrades);
      actions.payCycles(context.floors, balance.firemanPayouts);
    },
    forTheEmperor: (context) =>
      actions.upgrade(context.floors, balance.forTheEmperorUpgrades),
    forTheKing: (context) =>
      actions.upgrade(context.floors, balance.forTheKingUpgrades),
    hammerTime: (context) =>
      actions.upgrade([context.floor], balance.hammerTimeUpgrades),
    robinHood: (context) => {
      actions.payCycles(
        [selectByRate(context, true)],
        balance.robinHoodPayouts,
      );
      actions.upgrade([lowestLevel(context)], balance.robinHoodUpgrades);
    },
    roman: (context) => actions.upgrade(context.floors, balance.romanUpgrades),
    samurai: (context) =>
      actions.upgrade([context.floor], balance.samuraiUpgrades),
    spy: (context) =>
      actions.upgrade([selectByRate(context, false)], balance.spyUpgrades),
    theLawWon: (context) => {
      const floor = cheapest(context);
      actions.upgrade([floor], balance.theLawWonUpgrades);
      actions.payCycles([floor], balance.theLawWonPayouts);
    },
    victorian: (context) =>
      actions.payCycles(
        context.floors.filter(
          (floor, index) => floor.unlocked && index % 2 === 0,
        ),
        balance.victorianPayouts,
      ),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
