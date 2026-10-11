// a random spawn's roll: every rollEveryMs it procs with procChance, never
// within cooldownMs of the last one leaving, never past the gate shared by
// every kind (CONFIG.randomSpawns.gate), and never while something heavy is
// playing (holdSpawnsWhile) with the frames already running slow
import { CONFIG } from "../../config";
import { isFrameLoaded } from "../frameLoad";

export interface SpawnRollConfig {
  readonly rollEveryMs: number;
  readonly procChance: number;
  readonly cooldownMs: number;
}

// performance.now() of every spawn still inside the gate's window (the mouse
// rolls on Date.now(), so the gate keeps its own clock)
const recent: number[] = [];

function gateOpen(): boolean {
  const { count, windowMs } = CONFIG.randomSpawns.gate;
  const now = performance.now();
  while (recent.length && now - recent[0] >= windowMs) recent.shift();
  return recent.length < count;
}

const holds: (() => boolean)[] = [];

// no spawn starts while check() is true and the frames run slow: the crit
// playing keeps its frame rate, the spawn just comes later
export function holdSpawnsWhile(check: () => boolean): void {
  holds.push(check);
}

function held(): boolean {
  if (!isFrameLoaded()) return false;
  for (const check of holds) if (check()) return true;
  return false;
}

export interface SpawnRoll {
  // true when a roll is due and procs; call only while nothing is out
  procs(now: number): boolean;
  // call every frame it can't spawn: the next roll is a full step after
  hold(now: number): void;
  // call every frame one is out: the next roll is cooldownMs after
  coolDown(now: number): void;
}

export function createSpawnRoll(
  config: SpawnRollConfig,
  now: number,
): SpawnRoll {
  let nextAt = now + config.rollEveryMs;
  return {
    procs(now) {
      if (now < nextAt) return false;
      nextAt = now + config.rollEveryMs;
      if (held() || !gateOpen() || Math.random() >= config.procChance)
        return false;
      recent.push(performance.now());
      return true;
    },
    hold(now) {
      nextAt = Math.max(nextAt, now + config.rollEveryMs);
    },
    coolDown(now) {
      nextAt = now + config.cooldownMs;
    },
  };
}
