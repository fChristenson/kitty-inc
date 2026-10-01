import type { Floor } from "../../gameState";
import {
  streamCoins,
  streamGlimmers,
  type StreamKind,
} from "../../shared/eventStream";
import { BTN_W, BTN_H, getButtonCenter } from "../upgradeButton";

// a stream from sourceFloor's button into `target` (sourceFloor-local), like
// holding the button for durationMs
export function streamFromButton(
  kind: StreamKind,
  sourceFloor: Floor,
  isGroundFloor: boolean,
  target: { x: number; y: number },
  durationMs: number,
  isRunning: () => boolean,
  onEachArrive?: () => void,
): void {
  const button = getButtonCenter(isGroundFloor);
  const stream = kind === "coins" ? streamCoins : streamGlimmers;
  stream(
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
