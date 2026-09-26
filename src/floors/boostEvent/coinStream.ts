import type { Floor } from "../../gameState";
import { EVENT_COIN_TIMING } from "../../shared/floorEvents";
import {
  LONG_PRESS_COIN_ARRIVE_MS,
  LONG_PRESS_TICK_MS,
} from "../../shared/pressAndHold";
import { spawnHomingCoinBurst } from "../coins";
import { BTN_W, BTN_H, getButtonCenter } from "../upgradeButton";

// the whole event freeze, matching arcadeSlotWin.wav's audible length
export const EVENT_STREAM_DURATION_MS = 1_800;

// one overlay-layer coin burst per press-and-hold tick from sourceFloor's
// button into `target` (sourceFloor-local), like holding the button for
// durationMs, stopping early enough that the last coins land as it ends
export function streamEventCoins(
  sourceFloor: Floor,
  isGroundFloor: boolean,
  target: { x: number; y: number },
  durationMs: number,
  isRunning: () => boolean,
): void {
  const button = getButtonCenter(isGroundFloor);
  const bursts =
    Math.floor((durationMs - LONG_PRESS_COIN_ARRIVE_MS) / LONG_PRESS_TICK_MS) +
    1;
  for (let i = 0; i < bursts; i++) {
    setTimeout(() => {
      if (!isRunning()) return;
      spawnHomingCoinBurst(
        sourceFloor,
        button.x + (Math.random() - 0.5) * (BTN_W * 0.75),
        button.y + (Math.random() - 0.5) * (BTN_H / 2),
        { ...EVENT_COIN_TIMING, target, layer: "overlay" },
      );
    }, i * LONG_PRESS_TICK_MS);
  }
}
