let runningDetached = false;
let pendingJobs = 0;
const lockedFloors = new WeakSet<object>();

export function lockBuilding(floors: object[]): () => void {
  for (const floor of floors) lockedFloors.add(floor);
  return () => {
    for (const floor of floors) lockedFloors.delete(floor);
  };
}

export function isFloorLocked(floor: object): boolean {
  return lockedFloors.has(floor);
}

export function isDetachedJobPending(): boolean {
  return pendingJobs > 0;
}

export function isDetachedJobRunning(): boolean {
  return runningDetached;
}

export function liveEffect<Args extends unknown[]>(
  effect: (...args: Args) => void,
) {
  return (...args: Args): void => {
    if (!runningDetached) effect(...args);
  };
}

export function runDetachedStep<T>(step: () => T): T {
  const previous = runningDetached;
  runningDetached = true;
  try {
    return step();
  } finally {
    runningDetached = previous;
  }
}

export async function runDetachedJob<T>(options: {
  clone: () => T | Promise<T>;
  step: (draft: T) => boolean;
  commit: (draft: T) => void;
  isCurrent?: () => boolean;
  exclusive?: boolean;
}): Promise<boolean> {
  if (options.exclusive !== false) pendingJobs++;
  try {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    const draft = await options.clone();
    let changed = false;
    for (;;) {
      if (options.isCurrent && !options.isCurrent()) return false;
      const startedAt = performance.now();
      for (let count = 0; count < 64; count++) {
        if (!runDetachedStep(() => options.step(draft))) {
          if (changed) options.commit(draft);
          return changed;
        }
        changed = true;
        if (performance.now() - startedAt >= 8) break;
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  } finally {
    if (options.exclusive !== false) pendingJobs--;
  }
}
