// the odometer's jackpot (see shared/odometer): the Burst blown out of the
// total instead of a button, paying nothing itself and revealing no crit;
// onEnd runs as the coins have merged back in. False if it can't start
import type { Floor } from "../../../gameState";
import type { EventProcContext } from "../eventProcs";
import { totalSpot } from "../cashFlow";
import { startBurstCover } from "../moneyCover";

export function startOdometerBurst(
  floor: Floor,
  context: EventProcContext,
  onEnd: () => void,
): boolean {
  return startBurstCover(
    "odometer",
    floor,
    { ...context, applyTierCrit: undefined },
    { rewardMultiplier: 0, onEnd },
    totalSpot,
  );
}
