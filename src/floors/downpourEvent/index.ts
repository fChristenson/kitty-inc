// the "Downpour" event: it covers its crit, whose click freezes the screen
// while coins and bills rain down from above the screen and pool along its
// bottom, the pool rising as they land, then it all drains into the total
// (see ../rain)
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { pickCritTierByOdds } from "../../shared/critTypes";
import { forceTestCrit } from "../upgradeButton";
import { forceClaimEventProc, registerEventProc } from "../eventProcs";
import { canStartMoneyCover, isMoneyCoverRunning } from "../moneyCover";
import { startRain } from "../rain";

const KEY = "downpour";

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.downpourEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) =>
      // each drop falls, ever faster, straight into its spot
      startRain(
        KEY,
        floor,
        context,
        CONFIG.downpourEvent,
        ({ from, land }) =>
          (t) => ({
            x: from.x + (land.x - from.x) * t,
            y: from.y + (land.y - from.y) * t * t,
          }),
      ),
  },
  { label: "Downpour", color: COLOR.coinGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Downpour
export function forceDownpourEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
