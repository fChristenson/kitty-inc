// the "Burst" event: it covers its crit, whose click freezes the screen while
// the button blows out one instant explosion of coins and bills covering the
// whole screen, which then merge into the total (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { forceClaimEventProc, registerEventProc } from "../../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startBurstCover,
} from "../../moneyCover";

const KEY = "burst";

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.burstEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      startBurstCover(KEY, floor, context);
    },
  },
  { label: "Burst", color: COLOR.moneyGreen },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Burst
export function forceBurstEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}
