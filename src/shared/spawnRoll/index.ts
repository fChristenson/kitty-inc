// a random spawn's roll: every rollEveryMs it procs with procChance

export interface SpawnRollConfig {
  readonly rollEveryMs: number;
  readonly procChance: number;
}

export interface SpawnRoll {
  // true when a roll is due and procs; call only while nothing is out
  procs(now: number): boolean;
  // call every frame something is out (or can't spawn): the next roll is a
  // full step after the last such call
  hold(now: number): void;
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
      nextAt = now + config.rollEveryMs;
    },
  };
}
