import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createTreasuresRewards({
  actions,
  balance,
  highestFloor,
  lowestLevel,
  selectByRate,
  alternating,
  promoteAndUpgrade,
}: RewardHelpers) {
  return {
    theMoonstoneKey: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.theMoonstoneKeyTierSteps,
        balance.theMoonstoneKeyUpgrades,
      ),
    spellbookSupreme: (context) =>
      actions.upgrade([context.floor], balance.spellbookSupremeUpgrades),
    prismPotion: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.prismPotionPayouts,
      ),
    galaxyGumball: (context) =>
      actions.payCycles([context.floor], balance.galaxyGumballPayouts),
    treasureTruffle: (context) => {
      actions.upgrade([context.floor], balance.treasureTruffleUpgrades);
      actions.payCycles([context.floor], balance.treasureTrufflePayouts);
    },
    wizardsWaffle: (context) =>
      actions.upgrade(context.floors, balance.wizardsWaffleUpgrades),
    goldenFortuneCookie: (context) =>
      actions.upgrade(
        [lowestLevel(context)],
        balance.goldenFortuneCookieUpgrades,
      ),
    crystalDragonEgg: (context) =>
      actions.upgrade([context.floor], balance.crystalDragonEggUpgrades),
    diamondCompass: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.diamondCompassPayouts,
      ),
    emeraldCrown: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.emeraldCrownTierSteps,
        balance.emeraldCrownUpgrades,
      ),
    goldenFleece: (context) =>
      actions.payCycles(context.floors, balance.goldenFleecePayouts),
    imperialScepter: (context) =>
      actions.upgrade([highestFloor(context)], balance.imperialScepterUpgrades),
    rubyHeartRelic: (context) =>
      actions.payCycles([context.floor], balance.rubyHeartRelicPayouts),
    sapphireHourglass: (context) =>
      actions.payCycles(alternating(context), balance.sapphireHourglassPayouts),
    vaultOfJewels: (context) =>
      actions.upgrade(context.floors, balance.vaultOfJewelsUpgrades),
    goldenIdol: (context) =>
      actions.upgrade([context.floor], balance.goldenIdolUpgrades),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
