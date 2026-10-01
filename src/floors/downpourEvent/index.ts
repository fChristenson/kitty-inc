// the "Downpour" event: it covers its crit, whose click freezes the screen
// while coins and bills rain down from above the screen and pool along its
// bottom, the pool rising as they land, then it all drains into the total
// (see ../moneyCover)
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playBoostEventStream } from "../../sound";
import { pickCritTierByOdds } from "../../shared/critTypes";
import { forceTestCrit } from "../upgradeButton";
import { forceClaimEventProc, registerEventProc } from "../eventProcs";
import type { CoinPath } from "../coins";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
  type CoverArea,
} from "../moneyCover";

const KEY = "downpour";
const COINS = 500;
// the pool's depth by the last drop, and its gap to the screen's sides/bottom
const POOL_DEPTH = 140;
const POOL_MARGIN = 30;
// a drop starts this far above the screen, plus up to RAIN_SPREAD more
const RAIN_START = 60;
const RAIN_SPREAD = 220;
// the wind slants every drop the same way, this far (px) over its fall
const WIND: [number, number] = [20, 60];
const HANG_MS = 300;

const between = ([min, max]: [number, number]) =>
  min + Math.random() * (max - min);

// where each drop lands, in fall order: later drops land higher, so the pool rises
function poolSpots(area: CoverArea): { x: number; y: number }[] {
  const left = area.left + POOL_MARGIN;
  const width = area.right - area.left - POOL_MARGIN * 2;
  const floor = area.bottom - POOL_MARGIN;
  return Array.from({ length: COINS }, (_, i) => ({
    x: left + Math.random() * width,
    y: floor - POOL_DEPTH * Math.min(1, (i + Math.random() * 40) / COINS),
  }));
}

// a drop falling, ever faster, from above the screen into its spot
function dropPath(
  area: CoverArea,
  land: { x: number; y: number },
  wind: number,
): CoinPath {
  const x0 = land.x - wind;
  const y0 = area.top - RAIN_START - Math.random() * RAIN_SPREAD;
  return (t) => ({
    x: x0 + wind * t,
    y: y0 + (land.y - y0) * t * t,
  });
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.downpourEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const { streamMs, travelMs, mergeMs, rewardMultiplier } =
        CONFIG.downpourEvent;
      const durationMs = streamMs + travelMs * 1.03 + HANG_MS + mergeMs;
      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs, mergeMs },
        { rewardMultiplier },
      );
      if (!cover) return;
      const wind = between(WIND) * (Math.random() < 0.5 ? -1 : 1);
      const paths = poolSpots(cover.area).map((spot) =>
        dropPath(cover.area, spot, wind),
      );
      cover.flow(paths, streamMs, travelMs, true);
      playBoostEventStream();
    },
  },
  { label: "Downpour", color: COLOR.coinGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Downpour
export function forceDownpourEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
