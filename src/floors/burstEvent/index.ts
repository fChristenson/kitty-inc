// the "Burst" event: it covers its crit, whose click freezes the screen while
// the button blows out one instant explosion of coins and bills covering the
// whole screen, which then merge into the total (see ../moneyCover)
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { pickCritTierByOdds } from "../../shared/critTypes";
import { forceTestCrit } from "../upgradeButton";
import { forceClaimEventProc, registerEventProc } from "../eventProcs";
import {
  canStartMoneyCover,
  coverSpots,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../moneyCover";

const KEY = "burst";
const COINS = 300;
const EXPLOSION_SHAKE = 1.1;

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.burstEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const cover = startMoneyCover(KEY, floor, context, CONFIG.burstEvent, {
        layout: (area) => coverSpots(area, COINS),
      });
      if (!cover) return;
      cover.launch(cover.spots);
      playExplosion();
      shakeScreen(EXPLOSION_SHAKE);
    },
  },
  { label: "Burst", color: COLOR.moneyGreen },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Burst
export function forceBurstEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
