import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createCandyRewards({
  actions,
  balance,
  highestFloor,
  lowestLevel,
  selectByRate,
  alternating,
  cheapest,
  promoteAndUpgrade,
  upgradeAndPay,
}: RewardHelpers) {
  return {
    chocolateFountainOfYouth: (context) =>
      actions.payCycles(
        [context.floor],
        balance.chocolateFountainOfYouthPayouts,
      ),
    gummyBearMarket: (context) =>
      actions.upgrade(context.floors, balance.gummyBearMarketUpgrades),
    jawbreaker: (context) =>
      actions.upgrade([context.floor], balance.jawbreakerUpgrades),
    licoriceLaces: (context) =>
      actions.upgrade([lowestLevel(context)], balance.licoriceLacesUpgrades),
    lollipopGuild: (context) =>
      actions.payCycles(alternating(context), balance.lollipopGuildPayouts),
    marshmallowMountain: (context) =>
      actions.upgrade(
        [highestFloor(context)],
        balance.marshmallowMountainUpgrades,
      ),
    sugarHigh: (context) => {
      actions.upgrade(context.floors, balance.sugarHighUpgrades);
      actions.payCycles(context.floors, balance.sugarHighPayouts);
    },
    bubblegumBalloon: (context) =>
      actions.payCycles([context.floor], balance.bubblegumBalloonPayouts),
    candyCaneClimber: (context) =>
      actions.upgrade(
        [highestFloor(context)],
        balance.candyCaneClimberUpgrades,
      ),
    sherbetSherpa: (context) =>
      actions.payCycles(context.floors, balance.sherbetSherpaPayouts),
    toffeeTrap: (context) =>
      actions.upgrade([context.floor], balance.toffeeTrapUpgrades),
    cottonCandyCloud: (context) =>
      actions.payCycles([context.floor], balance.cottonCandyCloudPayouts),
    fudgeIt: (context) =>
      actions.upgrade([context.floor], balance.fudgeItUpgrades),
    gobstopperGetaway: (context) =>
      actions.upgrade(
        [highestFloor(context)],
        balance.gobstopperGetawayUpgrades,
      ),
    jellyBeanJamboree: (context) =>
      actions.payCycles(alternating(context), balance.jellyBeanJamboreePayouts),
    rockCandyQuarry: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.rockCandyQuarryTierSteps,
        balance.rockCandyQuarryUpgrades,
      ),
    sprinkleStorm: (context) =>
      actions.upgrade(context.floors, balance.sprinkleStormUpgrades),
    candyCastle: (context) =>
      actions.payCycles(context.floors, balance.candyCastlePayouts),
    caramelApple: (context) =>
      actions.upgrade([context.floor], balance.caramelAppleUpgrades),
    moonlitMint: (context) =>
      actions.payCycles(alternating(context), balance.moonlitMintPayouts),
    gumdropGazillionaire: (context) =>
      actions.upgrade(context.floors, balance.gumdropGazillionaireUpgrades),
    candyCornCornucopia: (context) =>
      actions.payCycles(context.floors, balance.candyCornCornucopiaPayouts),
    butterscotchBuyout: (context) =>
      actions.upgrade([cheapest(context)], balance.butterscotchBuyoutUpgrades),
    sourStrawSprint: (context) => {
      const highest = highestFloor(context);
      actions.upgrade([context.floor], balance.sourStrawSprintUpgrades);
      if (highest !== context.floor)
        actions.upgrade([highest], balance.sourStrawSprintUpgrades);
    },
    pralinePremium: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.pralinePremiumTierSteps,
        balance.pralinePremiumUpgrades,
      ),
    fizzyFortune: (context) =>
      actions.payCycles([lowestLevel(context)], balance.fizzyFortunePayouts),
    marzipanMogul: (context) =>
      actions.payCycles([context.floor], balance.marzipanMogulPayouts),
    gummyWormWealth: (context) =>
      actions.upgrade([lowestLevel(context)], balance.gummyWormWealthUpgrades),
    chocolateCoinCartel: (context) =>
      upgradeAndPay(
        [selectByRate(context, true)],
        balance.chocolateCoinCartelUpgrades,
        balance.chocolateCoinCartelPayouts,
      ),
    honeycombHustle: (context) =>
      actions.upgrade(alternating(context), balance.honeycombHustleUpgrades),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
