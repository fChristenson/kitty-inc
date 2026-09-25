import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createCyberpunkRewards({
  actions,
  balance,
  lowestLevel,
  selectByRate,
  alternating,
  upgradeAndPay,
}: RewardHelpers) {
  return {
    chromeDome: (context) =>
      upgradeAndPay(
        [context.floor],
        balance.chromeDomeUpgrades,
        balance.chromeDomePayouts,
      ),
    skullSyndicate: (context) =>
      upgradeAndPay(
        context.floors,
        balance.skullSyndicateUpgrades,
        balance.skullSyndicatePayouts,
      ),
    circuitDuchess: (context) =>
      upgradeAndPay(
        [context.floor],
        balance.circuitDuchessUpgrades,
        balance.circuitDuchessPayouts,
      ),
    cyberCat: (context) =>
      upgradeAndPay(
        context.floors,
        balance.cyberCatUpgrades,
        balance.cyberCatPayouts,
      ),
    chromeChassis: (context) =>
      upgradeAndPay(
        context.floors,
        balance.chromeChassisUpgrades,
        balance.chromeChassisPayouts,
      ),
    elbowRoom: (context) =>
      upgradeAndPay(
        [lowestLevel(context)],
        balance.elbowRoomUpgrades,
        balance.elbowRoomPayouts,
      ),
    heartware: (context) =>
      upgradeAndPay(
        [context.floor],
        balance.heartwareUpgrades,
        balance.heartwarePayouts,
      ),
    pulseDividend: (context) =>
      upgradeAndPay(
        [context.floor],
        balance.pulseDividendUpgrades,
        balance.pulseDividendPayouts,
      ),
    neonNegotiator: (context) =>
      upgradeAndPay(
        [selectByRate(context, true)],
        balance.neonNegotiatorUpgrades,
        balance.neonNegotiatorPayouts,
      ),
    platinumRefrain: (context) =>
      upgradeAndPay(
        context.floors,
        balance.platinumRefrainUpgrades,
        balance.platinumRefrainPayouts,
      ),
    retinaRoyale: (context) =>
      upgradeAndPay(
        [selectByRate(context, true)],
        balance.retinaRoyaleUpgrades,
        balance.retinaRoyalePayouts,
      ),
    silverHandshake: (context) =>
      upgradeAndPay(
        [lowestLevel(context)],
        balance.silverHandshakeUpgrades,
        balance.silverHandshakePayouts,
      ),
    staticEncore: (context) =>
      upgradeAndPay(
        alternating(context),
        balance.staticEncoreUpgrades,
        balance.staticEncorePayouts,
      ),
    chromeArm: (context) =>
      actions.upgrade([context.floor], balance.chromeArmUpgrades),
    circuitBreaker: (context) =>
      actions.upgrade([context.floor], balance.circuitBreakerUpgrades),
    roboticGripper: (context) =>
      actions.upgrade([context.floor], balance.roboticGripperUpgrades),
    androidAnalyst: (context) =>
      upgradeAndPay(
        [selectByRate(context, true)],
        balance.androidAnalystUpgrades,
        balance.androidAnalystPayouts,
      ),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
