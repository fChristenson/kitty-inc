import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createWarhammerRewards({
  actions,
  balance,
  highestFloor,
  lowestLevel,
  selectByRate,
  alternating,
  promoteAndUpgrade,
}: RewardHelpers) {
  return {
    emperorsFinest: (context) =>
      actions.payCycles(context.floors, balance.emperorsFinestPayouts),
    eternalDuty: (context) =>
      actions.upgrade(context.floors, balance.eternalDutyUpgrades),
    faithIsOurShield: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.faithIsOurShieldTierSteps,
        balance.faithIsOurShieldUpgrades,
      ),
    fearNotThePsyker: (context) =>
      actions.payCycles([context.floor], balance.fearNotThePsykerPayouts),
    neverSurrender: (context) =>
      actions.upgrade([context.floor], balance.neverSurrenderUpgrades),
    purge: (context) => actions.upgrade([context.floor], balance.purgeUpgrades),
    toTheSkies: (context) =>
      actions.upgrade([highestFloor(context)], balance.toTheSkiesUpgrades),
    whatAreYourOrders: (context) =>
      actions.upgrade(
        [lowestLevel(context)],
        balance.whatAreYourOrdersUpgrades,
      ),
    emperorProvidesPurrfection: (context) =>
      actions.payCycles(
        context.floors,
        balance.emperorProvidesPurrfectionPayouts,
      ),
    fortyKOfGold: (context) =>
      actions.payCycles(context.floors, balance.fortyKOfGoldPayouts),
    chaoticTemptation: (context) =>
      actions.payCycles([context.floor], balance.chaoticTemptationPayouts),
    chaoticTemptation2: (context) =>
      actions.upgrade([context.floor], balance.chaoticTemptation2Upgrades),
    chaoticTemptation3: (context) =>
      actions.upgrade(alternating(context), balance.chaoticTemptation3Upgrades),
    chaoticTemptation4: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.chaoticTemptation4Payouts,
      ),
    emperorsDividends: (context) =>
      actions.payCycles(context.floors, balance.emperorsDividendsPayouts),
    heavyHitter: (context) =>
      actions.upgrade([context.floor], balance.heavyHitterUpgrades),
    iAmSpeed: (context) =>
      actions.upgrade([highestFloor(context)], balance.iAmSpeedUpgrades),
    neverSurrender2: (context) =>
      actions.upgrade(context.floors, balance.neverSurrender2Upgrades),
    powerSword: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.powerSwordTierSteps,
        balance.powerSwordUpgrades,
      ),
    powerSword2: (context) =>
      actions.upgrade([context.floor], balance.powerSword2Upgrades),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
