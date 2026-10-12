// a random spawn's roll: every rollEveryMs it procs with procChance, never
// within cooldownMs of the last one leaving, and only while the gateway
// shared by every kind is open (CONFIG.randomSpawns.gate): at most `count`
// spawn in a round, then none roll until cooldownMs after the last is gone
import { CONFIG } from "../../config";

export interface SpawnRollConfig {
  readonly rollEveryMs: number;
  readonly procChance: number;
  readonly cooldownMs: number;
}

// the rolls whose spawn is out (each kind calls procs/hold again only once
// its spawn is gone) and when each came out, the spawns this round, and when
// the last one left. performance.now() clock: the mouse rolls on Date.now()
const out = new Map<object, number>();
let round = 0;
let lastGoneAt = 0;
// a spawn gone this soon never got going (nothing to spawn on): it doesn't count
const STILLBORN_MS = 100;

function gone(roll: object): void {
  const at = out.get(roll);
  if (at === undefined) return;
  out.delete(roll);
  const now = performance.now();
  if (now - at < STILLBORN_MS) round--;
  if (out.size === 0) lastGoneAt = now;
}

function gateOpen(): boolean {
  const { count, cooldownMs } = CONFIG.randomSpawns.gate;
  if (round >= count) {
    if (out.size > 0 || performance.now() < lastGoneAt + cooldownMs)
      return false;
    round = 0;
  }
  return true;
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
  const roll: SpawnRoll = {
    procs(now) {
      gone(roll);
      if (now < nextAt) return false;
      nextAt = now + config.rollEveryMs;
      if (!gateOpen() || Math.random() >= config.procChance) return false;
      out.set(roll, performance.now());
      round++;
      return true;
    },
    hold(now) {
      gone(roll);
      nextAt = Math.max(nextAt, now + config.rollEveryMs);
    },
    coolDown(now) {
      nextAt = now + config.cooldownMs;
    },
  };
  return roll;
}
