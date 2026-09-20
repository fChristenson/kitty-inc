import type { BigNumber } from "../bigNumber";

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

export function createSaveScheduler<T>(save: (state: T) => void): {
  schedule: (state: T) => void;
  saveNow: (state: T) => void;
} {
  let pendingState: T | null = null;
  let pendingHandle: number | null = null;

  const run = (): void => {
    pendingHandle = null;
    if (pendingState === null) return;
    const state = pendingState;
    pendingState = null;
    save(state);
  };

  return {
    schedule: (state) => {
      pendingState = state;
      if (pendingHandle !== null) return;
      if (typeof requestIdleCallback === "function") {
        pendingHandle = requestIdleCallback(run, { timeout: 1000 });
      } else {
        pendingHandle = window.setTimeout(run, 200);
      }
    },
    saveNow: (state) => {
      pendingState = null;
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
