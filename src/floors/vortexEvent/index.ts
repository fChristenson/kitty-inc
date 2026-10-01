// the "Vortex" event: it covers its crit, whose click freezes the screen while
// coins and bills pour in from all four screen edges and swirl round in a
// tightening whirlpool just above the screen's center, then into the total
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
  FLOW_FLIGHT_MS,
  isMoneyCoverRunning,
  startMoneyCover,
  type CoverArea,
} from "../moneyCover";

const KEY = "vortex";
const COINS = 600;
const END_PAUSE_MS = 100;
// the whirlpool's eye, this many px above the screen's center
const EYE_RISE = 140;
// how far outside the screen's edges the coins start
const ENTER_MARGIN = 60;
// full turns each coin swirls on its way in
const TURNS: [number, number] = [1.1, 1.6];
// coins shrink to this (of their size) as they reach the eye
const EYE_SCALE = 0.5;

const between = ([min, max]: [number, number]) =>
  min + Math.random() * (max - min);

// a random spot just outside one of the screen's four edges
function edgeStart(area: CoverArea): { x: number; y: number } {
  const left = area.left - ENTER_MARGIN;
  const right = area.right + ENTER_MARGIN;
  const top = area.top - ENTER_MARGIN;
  const bottom = area.bottom + ENTER_MARGIN;
  const width = right - left;
  const height = bottom - top;
  // picked by length, so every stretch of edge sends as many coins
  let d = Math.random() * (width + height) * 2;
  if (d < width) return { x: left + d, y: top };
  d -= width;
  if (d < height) return { x: right, y: top + d };
  d -= height;
  if (d < width) return { x: right - d, y: bottom };
  d -= width;
  return { x: left, y: bottom - d };
}

// a coin's swirl from its edge spot into the eye, one way round for all
function swirlPath(
  eye: { x: number; y: number },
  start: { x: number; y: number },
  direction: 1 | -1,
): CoinPath {
  const radius = Math.hypot(start.x - eye.x, start.y - eye.y);
  const angle = Math.atan2(start.y - eye.y, start.x - eye.x);
  const turns = between(TURNS) * Math.PI * 2 * direction;
  return (t) => {
    // the radius closes in ever faster, so it speeds up as it nears the eye
    const r = radius * (1 - t) ** 1.3;
    const a = angle + turns * t ** 0.8;
    return {
      x: eye.x + Math.cos(a) * r,
      y: eye.y + Math.sin(a) * r,
      scale: 1 - (1 - EYE_SCALE) * t,
    };
  };
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.vortexEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const { streamMs, travelMs } = CONFIG.vortexEvent;
      const durationMs =
        streamMs + travelMs * 1.03 + FLOW_FLIGHT_MS + END_PAUSE_MS;
      const cover = startMoneyCover(KEY, floor, context, { durationMs }, {});
      if (!cover) return;
      const { area } = cover;
      const eye = {
        x: (area.left + area.right) / 2,
        y: (area.top + area.bottom) / 2 - EYE_RISE,
      };
      const direction = Math.random() < 0.5 ? 1 : -1;
      const paths = Array.from({ length: COINS }, () =>
        swirlPath(eye, edgeStart(area), direction),
      );
      cover.flow(paths, streamMs, travelMs);
      playBoostEventStream();
    },
  },
  { label: "Vortex", color: COLOR.coinGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Vortex
export function forceVortexEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
