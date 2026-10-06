import type { BigNumber } from "../bigNumber";
import { afterStartup } from "../startupGate";

export interface CompanySnapshotValues {
  bankedTotal: BigNumber;
  incomeRatePerSecond: BigNumber;
  assetValue: BigNumber;
  upgradesValue: BigNumber;
}

export function saveCompanySnapshot(
  companyIndex: number,
  values: CompanySnapshotValues,
  saveRecord: (
    companyIndex: number,
    values: CompanySnapshotValues & { updatedAt: number },
  ) => void,
): void {
  saveRecord(companyIndex, { ...values, updatedAt: Date.now() });
}

export interface SaveLifecycle {
  isIntact: () => boolean;
  markClosed: () => void;
  saveNow: () => void;
}

// a busy frame loop (a long press on a phone) never goes idle, so this is how
// often a save forces itself in; leaving the page saves straight away anyway
const IDLE_SAVE_TIMEOUT_MS = 5000;
// a long press asks for a save after every click, and a save serializes every
// building of the company, so background saves keep at least this far apart
const MIN_SAVE_GAP_MS = 2000;

export function createSaveScheduler<T>(save: (state: T) => void): {
  schedule: (state: T) => void;
  saveNow: (state: T) => void;
} {
  let pendingState: T | null = null;
  let scheduled = false;
  let savedAt = -Infinity;

  const run = (): void => {
    scheduled = false;
    if (pendingState === null) return;
    const state = pendingState;
    pendingState = null;
    savedAt = performance.now();
    save(state);
  };
  const request = (): void => {
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(run, { timeout: IDLE_SAVE_TIMEOUT_MS });
    } else {
      window.setTimeout(run, 200);
    }
  };

  return {
    schedule: (state) => {
      pendingState = state;
      if (scheduled) return;
      scheduled = true;
      afterStartup(() => {
        const wait = savedAt + MIN_SAVE_GAP_MS - performance.now();
        if (wait > 0) window.setTimeout(request, wait);
        else request();
      });
    },
    saveNow: (state) => {
      pendingState = null;
      savedAt = performance.now();
      save(state);
    },
  };
}

export function bindSaveLifecycle(lifecycle: SaveLifecycle): void {
  const saveOnExit = (): void => {
    if (!lifecycle.isIntact()) return;
    lifecycle.markClosed();
    lifecycle.saveNow();
  };

  window.addEventListener("beforeunload", saveOnExit);
  window.addEventListener("pagehide", saveOnExit);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveOnExit();
  });
}
