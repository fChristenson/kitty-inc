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

// how long one slice of a background job may run each frame
export const JOB_SLICE_MS = 5;

// resolves once the next frame has painted (or after 100ms in a hidden tab,
// where rAF stops), so a job never runs two slices between frames
export function yieldToFrame(): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (): void => {
      if (done) return;
      done = true;
      resolve();
    };
    requestAnimationFrame(() => setTimeout(finish, 0));
    setTimeout(finish, 100);
  });
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
    await yieldToFrame();
    const draft = await options.clone();
    let changed = false;
    for (;;) {
      if (options.isCurrent && !options.isCurrent()) return false;
      const startedAt = performance.now();
      do {
        if (!runDetachedStep(() => options.step(draft))) {
          if (changed) options.commit(draft);
          return changed;
        }
        changed = true;
      } while (performance.now() - startedAt < JOB_SLICE_MS);
      await yieldToFrame();
    }
  } finally {
    if (options.exclusive !== false) pendingJobs--;
  }
}
