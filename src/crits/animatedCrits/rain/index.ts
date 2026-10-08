// the rain the Downpour and Trickle events pour: drops of coins and bills from
// above the screen, all slanted by one wind, landing in a pool that rises
// along its bottom, which then drains into the total (see ../moneyCover)
import { playBoostEventStream } from "../../../sound";
import type { Floor } from "../../../gameState";
import type { EventProcContext } from "../eventProcs";
import type { CoinPath } from "../../../floors/coins";
import { startMoneyCover, type CoverArea } from "../moneyCover";

const COINS = 500;
// the pool's depth by the last drop, and its gap to the screen's sides/bottom
const POOL_DEPTH = 140;
const POOL_MARGIN = 30;
// a drop starts this far above the screen, plus up to RAIN_SPREAD more
const RAIN_START = 60;
const RAIN_SPREAD = 220;
// the wind slants every drop the same way, this far (px) over its fall
const WIND: [number, number] = [20, 60];

type Pt = { x: number; y: number };

export interface RainDrop {
  from: Pt;
  land: Pt;
}

export interface RainTiming {
  streamMs: number; // how long it keeps raining
  travelMs: number; // each drop's fall
  hangMs: number; // the pool resting after the last drop lands
  mergeMs: number; // the pool draining into the total
  rewardMultiplier: number;
}

// floor-local limits on where the rain falls, inside the screen's own
export interface RainBounds {
  // the pool never rises above this, nor deeper than poolDepth
  poolTop?: number;
  poolDepth?: number;
  // every drop stays between these, start to landing
  left?: number;
  right?: number;
}

const between = ([min, max]: [number, number]) =>
  min + Math.random() * (max - min);

// every drop in fall order: later drops land higher, so the pool rises
function rainDrops(area: CoverArea, bounds: RainBounds): RainDrop[] {
  const wind = between(WIND) * (Math.random() < 0.5 ? -1 : 1);
  const left =
    Math.max(area.left, bounds.left ?? -Infinity) +
    POOL_MARGIN +
    Math.max(0, wind);
  const right =
    Math.min(area.right, bounds.right ?? Infinity) -
    POOL_MARGIN +
    Math.min(0, wind);
  const bottom = area.bottom - POOL_MARGIN;
  const depth = Math.max(
    0,
    Math.min(
      bounds.poolDepth ?? POOL_DEPTH,
      bottom - (bounds.poolTop ?? -Infinity),
    ),
  );
  return Array.from({ length: COINS }, (_, i) => {
    const land = {
      x: left + Math.random() * Math.max(0, right - left),
      y: bottom - depth * Math.min(1, (i + Math.random() * 40) / COINS),
    };
    return {
      from: {
        x: land.x - wind,
        y: area.top - RAIN_START - Math.random() * RAIN_SPREAD,
      },
      land,
    };
  });
}

// rains on the clicked floor's screen, each drop following its own path
export function startRain(
  key: string,
  floor: Floor,
  context: EventProcContext,
  { streamMs, travelMs, hangMs, mergeMs, rewardMultiplier }: RainTiming,
  pathFor: (drop: RainDrop) => CoinPath,
  bounds?: (area: CoverArea) => RainBounds,
): void {
  const durationMs = streamMs + travelMs * 1.03 + hangMs + mergeMs;
  const cover = startMoneyCover(
    key,
    floor,
    context,
    { durationMs, mergeMs },
    { rewardMultiplier },
  );
  if (!cover) return;
  const drops = rainDrops(cover.area, bounds?.(cover.area) ?? {});
  cover.flow(drops.map(pathFor), streamMs, travelMs, true);
  playBoostEventStream();
}
