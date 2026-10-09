// a random spawn's roll: every rollEveryMs it procs with procChance

export interface SpawnRollConfig {
  readonly rollEveryMs: number;
  readonly procChance: number;
}

export interface SpawnRoll {
  // true when a roll is due and procs; call only while nothing is out
  procs(now: number): boolean;
  // the next roll is a full step after `at` (when the last spawn ends)
  restart(at: number): void;
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
    restart(at) {
      nextAt = at + config.rollEveryMs;
    },
  };
}
