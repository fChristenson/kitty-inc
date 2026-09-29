import type { Floor } from "../../gameState";
import { EVENT_COIN_TIMING } from "../../shared/floorEvents";
import type { EventFx, StreamTension } from "../../shared/eventFx";
import type { FloorRectResolver } from "../../shared/screenFreeze";
import {
  LONG_PRESS_COIN_ARRIVE_MS,
  LONG_PRESS_TICK_MS,
} from "../../shared/pressAndHold";
import { drawCoins, spawnHomingCoinBurst } from "../coins";
import { BTN_W, BTN_H, getButtonCenter } from "../upgradeButton";

// the freeze overlay of a stream into one floor's target at (x, y), local to
// that floor: its effects with drawTarget in between, then the flying coins
export function drawStreamOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
  floor: Floor,
  fx: EventFx,
  x: number,
  y: number,
  drawTarget: (tension: StreamTension) => void,
): void {
  const rect = getFloorRect(floor);
  if (rect) {
    ctx.save();
    ctx.translate(rect.left, rect.top);
    fx.draw(ctx, x, y, drawTarget);
    ctx.restore();
  }
  drawCoins(ctx, getFloorRect, undefined, "overlay");
}

// the whole event freeze, matching arcadeSlotWin.wav's audible length
export const EVENT_STREAM_DURATION_MS = 1_800;
const STREAM_ARRIVE_SPREAD_TICKS = 6;

// 0..1, eased: a spotlit worker growing from the first coins landing until
// the stream started at startedAt ends
export function streamGrowth(startedAt: number, now: number): number {
  const growMs = EVENT_STREAM_DURATION_MS - LONG_PRESS_COIN_ARRIVE_MS;
  const t = Math.min(
    1,
    Math.max(0, (now - startedAt - LONG_PRESS_COIN_ARRIVE_MS) / growMs),
  );
  return t * t * (3 - 2 * t);
}

// calls spawn() once per press-and-hold tick over durationMs, stopping early
// enough that the last coins land as it ends; stops once isRunning turns false
function scheduleEventStream(
  durationMs: number,
  isRunning: () => boolean,
  spawn: () => void,
): void {
  const bursts =
    Math.floor((durationMs - LONG_PRESS_COIN_ARRIVE_MS) / LONG_PRESS_TICK_MS) +
    1;
  for (let i = 0; i < bursts; i++) {
    setTimeout(() => {
      if (isRunning()) spawn();
    }, i * LONG_PRESS_TICK_MS);
  }
}

export interface StreamSource {
  floor: Floor;
  x: number;
  y: number;
  // each burst starts somewhere within this box around (x, y)
  spreadX?: number;
  spreadY?: number;
}

export interface StreamOptions {
  // floor-local to each source's floor; omitted means the total income
  target?: { x: number; y: number };
  durationMs: number;
  isRunning: () => boolean;
  onEachArrive?: () => void;
}

// the one event coin stream: every tick a burst from each source, their coins
// shared out so any number of sources adds up to one steady, gapless stream
export function streamCoins(
  sources: StreamSource[],
  { target, durationMs, isRunning, onEachArrive }: StreamOptions,
): void {
  if (sources.length === 0) return;
  const coins: [number, number] = [
    Math.max(4, Math.round(18 / sources.length)),
    Math.max(6, Math.round(28 / sources.length)),
  ];
  scheduleEventStream(durationMs, isRunning, () => {
    for (const s of sources)
      spawnHomingCoinBurst(
        s.floor,
        s.x + (Math.random() - 0.5) * (s.spreadX ?? 0),
        s.y + (Math.random() - 0.5) * (s.spreadY ?? 0),
        {
          ...EVENT_COIN_TIMING,
          target,
          layer: "overlay",
          onEachArrive,
          coins,
          arriveSpread: STREAM_ARRIVE_SPREAD_TICKS,
        },
      );
  });
}

// the stream from sourceFloor's button into `target` (sourceFloor-local),
// like holding the button for durationMs
export function streamEventCoins(
  sourceFloor: Floor,
  isGroundFloor: boolean,
  target: { x: number; y: number },
  durationMs: number,
  isRunning: () => boolean,
  onEachArrive?: () => void,
): void {
  const button = getButtonCenter(isGroundFloor);
  streamCoins(
    [
      {
        floor: sourceFloor,
        x: button.x,
        y: button.y,
        spreadX: BTN_W * 0.75,
        spreadY: BTN_H / 2,
      },
    ],
    { target, durationMs, isRunning, onEachArrive },
  );
}
