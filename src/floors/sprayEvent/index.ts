// the "Spray" event: it covers its crit, whose click freezes the screen while
// the button sprays a sweeping stream of coins and bills over the whole
// screen, which then merge into the total (see ../moneyCover)
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playBoostEventStream } from "../../sound";
import { pickCritTierByOdds } from "../../shared/critTypes";
import { forceTestCrit } from "../upgradeButton";
import { forceClaimEventProc, registerEventProc } from "../eventProcs";
import {
  canStartMoneyCover,
  coverSpots,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../moneyCover";

const KEY = "spray";
const COINS = 300;

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.sprayEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const cover = startMoneyCover(KEY, floor, context, CONFIG.sprayEvent, {
        layout: (area) => coverSpots(area, COINS),
      });
      if (!cover) return;
      // ordered by angle around the button, so the stream sweeps round it
      const { button } = cover;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const start = Math.random() * Math.PI * 2;
      const angleOf = (p: { x: number; y: number }) =>
        (((dir * Math.atan2(p.y - button.y, p.x - button.x) - start) %
          (Math.PI * 2)) +
          Math.PI * 2) %
        (Math.PI * 2);
      const spots = [...cover.spots].sort((a, b) => angleOf(a) - angleOf(b));
      cover.stream(spots, CONFIG.sprayEvent.streamMs);
      playBoostEventStream();
    },
  },
  { label: "Spray", color: COLOR.coinGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Spray
export function forceSprayEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
