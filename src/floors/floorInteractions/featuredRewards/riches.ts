import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createRichesRewards({
  actions,
  balance,
  highestFloor,
  lowestLevel,
  selectByRate,
  alternating,
  promoteAndUpgrade,
}: RewardHelpers) {
  return {
    adamWhiskersen: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.adamWhiskersenTierSteps,
        balance.adamWhiskersenUpgrades,
      ),
    bankroll: (context) =>
      actions.upgrade([context.floor], balance.bankrollUpgrades),
    billBlizzard: (context) =>
      actions.payCycles(context.floors, balance.billBlizzardPayouts),
    bobPawge: (context) =>
      actions.upgrade(context.floors, balance.bobPawgeUpgrades),
    bullionStack: (context) =>
      actions.upgrade([context.floor], balance.bullionStackUpgrades),
    cashCannon: (context) =>
      actions.upgrade(alternating(context), balance.cashCannonUpgrades),
    fairExchange: (context) =>
      actions.payCycles(alternating(context), balance.fairExchangePayouts),
    gemMine: (context) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.gemMineUpgrades,
      ),
    goldMine: (context) =>
      actions.payCycles([highestFloor(context)], balance.goldMinePayouts),
    goldenChalice: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.goldenChaliceTierSteps,
        balance.goldenChaliceUpgrades,
      ),
    goldenGoose: (context) =>
      actions.payCycles(context.floors, balance.goldenGoosePayouts),
    goldenStag: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.goldenStagPayouts,
      ),
    handsomeJake: (context) =>
      actions.upgrade([highestFloor(context)], balance.handsomeJakeUpgrades),
    jcDentclaw: (context) =>
      actions.upgrade([context.floor], balance.jcDentclawUpgrades),
    liquidAssets: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.liquidAssetsPayouts,
      ),
    midasTouch: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.midasTouchTierSteps,
        balance.midasTouchUpgrades,
      ),
    moneyPrinter: (context) =>
      actions.upgrade(context.floors, balance.moneyPrinterUpgrades),
    moneyTree: (context) =>
      actions.payCycles(context.floors, balance.moneyTreePayouts),
    nuggetAvalanche: (context) =>
      actions.payCycles([context.floor], balance.nuggetAvalanchePayouts),
    pennyJar: (context) =>
      actions.upgrade([lowestLevel(context)], balance.pennyJarUpgrades),
    purrDenton: (context) =>
      actions.upgrade([lowestLevel(context)], balance.purrDentonUpgrades),
    strikeItRich: (context) =>
      actions.upgrade([highestFloor(context)], balance.strikeItRichUpgrades),
    vaultDoor: (context) =>
      actions.upgrade(context.floors, balance.vaultDoorUpgrades),
    wishingWell: (context) =>
      actions.payCycles([context.floor], balance.wishingWellPayouts),
    youKnowWhatStallion: (context) =>
      actions.upgrade(
        alternating(context),
        balance.youKnowWhatStallionUpgrades,
      ),
    goldBar: (context) =>
      actions.payCycles(context.floors, balance.goldBarPayouts),
    silverCoin: (context) =>
      actions.payCycles(alternating(context), balance.silverCoinPayouts),
    gildedCache: (context) =>
      actions.upgrade(context.floors, balance.gildedCacheUpgrades),
    brassBanker: (context) =>
      actions.upgrade([lowestLevel(context)], balance.brassBankerUpgrades),
    citrusCoin: (context) =>
      actions.payCycles(alternating(context), balance.citrusCoinPayouts),
    coinCascade: (context) =>
      actions.payCycles(context.floors, balance.coinCascadePayouts),
    coinrootGrove: (context) =>
      actions.upgrade(context.floors, balance.coinrootGroveUpgrades),
    allowance: (context) =>
      actions.payCycles([lowestLevel(context)], balance.allowancePayouts),
    allowance2: (context) =>
      actions.upgrade(context.floors, balance.allowance2Upgrades),
    lootBags: (context) =>
      actions.upgrade([highestFloor(context)], balance.lootBagsUpgrades),
    pocketMoney2: (context) =>
      actions.payCycles(context.floors, balance.pocketMoney2Payouts),
    liquidAssets2: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.liquidAssets2Payouts,
      ),
    pocketMoney: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.pocketMoneyTierSteps,
        balance.pocketMoneyUpgrades,
      ),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
