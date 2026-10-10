// every random spawn's way out once its time runs out, the same for all: it
// blinks harder over its last pulseMs, then shrinks and fades away over
// SPAWN_VANISH_MS. msLeft is the time until it runs out, negative after
import { clamp01 } from "../easing";
import { urgentBlink } from "../urgentBlink";

export const SPAWN_VANISH_MS = 250;

export interface SpawnFade {
  // multiply into everything the spawn draws: its alpha and its size
  alpha: number;
  scale: number;
}

// one object, refilled by every call: read it straight away
const fade: SpawnFade = { alpha: 1, scale: 1 };

export function spawnFade(
  msLeft: number,
  pulseMs: number,
  now: number,
): SpawnFade {
  const vanish = 1 - clamp01(-msLeft / SPAWN_VANISH_MS);
  fade.scale = vanish;
  fade.alpha = vanish * urgentBlink(msLeft, pulseMs, now);
  return fade;
}

// whether a spawn msLeft from running out has vanished
export const isSpawnGone = (msLeft: number): boolean =>
  msLeft <= -SPAWN_VANISH_MS;
