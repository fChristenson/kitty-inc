import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createYakuzaRewards({
  actions,
  balance,
  highestFloor,
  lowestLevel,
  selectByRate,
  alternating,
  belowAndHere,
  hereAnd,
  promoteAndUpgrade,
  upgradeAndPay,
  cascadeDown,
}: RewardHelpers) {
  return {
    oyabunsBlessing: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.oyabunsBlessingTierSteps,
        balance.oyabunsBlessingUpgrades,
      ),
    irezumiInk: (context) =>
      actions.upgrade([context.floor], balance.irezumiInkUpgrades),
    teboriTabby: (context) =>
      actions.payCycles([context.floor], balance.teboriTabbyPayouts),
    indigoInkwell: (context) =>
      upgradeAndPay(
        [context.floor],
        balance.indigoInkwellUpgrades,
        balance.indigoInkwellPayouts,
      ),
    dragonBackpiece: (context) =>
      promoteAndUpgrade(
        selectByRate(context, true),
        balance.dragonBackpieceTierSteps,
        balance.dragonBackpieceUpgrades,
      ),
    dragonPearlPact: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.dragonPearlPactPayouts,
      ),
    gingerDragon: (context) =>
      actions.upgrade(
        [selectByRate(context, true)],
        balance.gingerDragonUpgrades,
      ),
    katanaCashflow: (context) =>
      actions.upgrade(belowAndHere(context), balance.katanaCashflowUpgrades),
    samuraiSpillway: (context) =>
      actions.payCycles(belowAndHere(context), balance.samuraiSpillwayPayouts),
    goldenKoiClan: (context) =>
      actions.upgrade(alternating(context), balance.goldenKoiClanUpgrades),
    koiCoinWhirlpool: (context) =>
      actions.payCycles(alternating(context), balance.koiCoinWhirlpoolPayouts),
    manekiMobster: (context) =>
      actions.payCycles(context.floors, balance.manekiMobsterPayouts),
    hanafudaHeist: (context) =>
      actions.payCycles(
        [selectByRate(context, false)],
        balance.hanafudaHeistPayouts,
      ),
    hannyaMuscle: (context) =>
      actions.upgrade([context.floor], balance.hannyaMuscleUpgrades),
    redMaskGuard: (context) =>
      actions.upgrade([highestFloor(context)], balance.redMaskGuardUpgrades),
    maskedRetainer: (context) =>
      actions.payCycles([highestFloor(context)], balance.maskedRetainerPayouts),
    blackSedanConvoy: (context) =>
      actions.upgrade(cascadeDown(context), balance.blackSedanConvoyUpgrades),
    pompadourPosse: (context) =>
      actions.upgrade(context.floors, balance.pompadourPosseUpgrades),
    sakazukiOath: (context) =>
      actions.payCycles(
        hereAnd(context, highestFloor(context)),
        balance.sakazukiOathPayouts,
      ),
    sakuraSworn: (context) =>
      actions.upgrade([lowestLevel(context)], balance.sakuraSwornUpgrades),
    shogunShakedown: (context) =>
      upgradeAndPay(
        [selectByRate(context, true)],
        balance.shogunShakedownUpgrades,
        balance.shogunShakedownPayouts,
      ),
    tanukiTreasurer: (context) =>
      upgradeAndPay(
        context.floors,
        balance.tanukiTreasurerUpgrades,
        balance.tanukiTreasurerPayouts,
      ),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
