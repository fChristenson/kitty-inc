// the one on-screen critter a "Hunt" event (crits/animatedCrits/events/huntEvent) can target,
// registered by its owner (src/spawn/mouse) so floors never imports it directly
import type { Floor } from "../../gameState";

export interface HuntTarget {
  floor: Floor;
  // floor-local center of the critter's sprite
  x: number;
  y: number;
}

export interface HuntTargetProvider {
  get(): HuntTarget | null;
  // whether a critter already marked by markHunted is still out
  isHunted(): boolean;
  // grows/tints the critter and restarts its time on screen
  markHunted(): void;
  // draws it into floor-local space, standing still, washed whiteAlpha white
  // and rotated around its feet
  drawStill(
    ctx: CanvasRenderingContext2D,
    floor: Floor,
    whiteAlpha: number,
    rotation: number,
  ): void;
}

let provider: HuntTargetProvider | null = null;

export function registerHuntTarget(next: HuntTargetProvider): void {
  provider = next;
}

export function getHuntTarget(): HuntTarget | null {
  return provider?.get() ?? null;
}

export function markHuntTarget(): void {
  provider?.markHunted();
}

export function isHuntTargetHunted(): boolean {
  return provider?.isHunted() ?? false;
}

// the owner reports each critter leaving (clicked or timed out) here
const goneListeners: (() => void)[] = [];

export function onHuntTargetGone(listener: () => void): void {
  goneListeners.push(listener);
}

export function notifyHuntTargetGone(): void {
  for (const listener of goneListeners) listener();
}

export function drawHuntTargetStill(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
  whiteAlpha: number,
  rotation: number,
): void {
  provider?.drawStill(ctx, floor, whiteAlpha, rotation);
}
