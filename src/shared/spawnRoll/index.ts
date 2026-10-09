// a random spawn's roll: every rollEveryMs it procs with procChance, never
// within cooldownMs of the last one leaving

export interface SpawnRollConfig {
  readonly rollEveryMs: number;
  readonly procChance: number;
  readonly cooldownMs: number;
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
      return Math.random() < config.procChance;
    },
    hold(now) {
      nextAt = Math.max(nextAt, now + config.rollEveryMs);
    },
    coolDown(now) {
      nextAt = now + config.cooldownMs;
    },
  };
}
