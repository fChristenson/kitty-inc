import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createBaldursGateRewards({
  actions,
  balance,
  highestFloor,
  lowestLevel,
  selectByRate,
  alternating,
  promoteAndUpgrade,
}: RewardHelpers) {
  return {
    astapurrion: (context) =>
      actions.payCycles([context.floor], balance.astapurrionPayouts),
    astralclawSkyblade: (context) =>
      actions.upgrade([context.floor], balance.astralclawSkybladeUpgrades),
    drizztDoPurrden: (context) =>
      actions.upgrade(alternating(context), balance.drizztDoPurrdenUpgrades),
    elmiaowster: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.elmiaowsterTierSteps,
        balance.elmiaowsterUpgrades,
      ),
    elvenSongblade: (context) =>
      actions.payCycles(context.floors, balance.elvenSongbladePayouts),
    galepaw: (context) =>
      actions.payCycles(context.floors, balance.galepawPayouts),
    halsinpaw: (context) =>
      actions.upgrade(context.floors, balance.halsinpawUpgrades),
    hearthpawShadowagent: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.hearthpawShadowagentPayouts,
      ),
    imeown: (context) =>
      actions.upgrade([lowestLevel(context)], balance.imeownUpgrades),
    jaheirball: (context) =>
      actions.payCycles(alternating(context), balance.jaheirballPayouts),
    karlachonk: (context) =>
      actions.upgrade([context.floor], balance.karlachonkUpgrades),
    laezclaw: (context) =>
      actions.upgrade([context.floor], balance.laezclawUpgrades),
    minscAndMeow: (context) =>
      actions.upgrade(context.floors, balance.minscAndMeowUpgrades),
    sarevmeowk: (context) =>
      actions.upgrade([highestFloor(context)], balance.sarevmeowkUpgrades),
    shadowpurr: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.shadowpurrTierSteps,
        balance.shadowpurrUpgrades,
      ),
    theEmpurror: (context) =>
      actions.payCycles(context.floors, balance.theEmpurrorPayouts),
    thisIsTheEnd: (context) =>
      actions.upgrade([context.floor], balance.thisIsTheEndUpgrades),
    whiskerWyll: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.whiskerWyllPayouts,
      ),
    winkWink: (context) =>
      actions.upgrade([lowestLevel(context)], balance.winkWinkUpgrades),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
