import type { Floor } from "../gameState";
import type { BuildingDraft, RenovationPlan } from "../shared/buildingJob";
import type { BigNumber } from "../shared/bigNumber";
import { quoteUpgrades } from "./upgradeQuote";
import {
  JOB_SLICE_MS,
  lockBuilding,
  runDetachedJob,
  yieldToFrame,
} from "../shared/detachedJob";
import { cloneWithSnapshotState } from "../shared/snapshotState";
import { withDraftCritCounts, commitCritCounts } from "../crits";

export function planRenovation(
  floors: Floor[],
  money: BigNumber,
): RenovationPlan {
  const quote = quoteUpgrades(floors, money);
  return {
    floors: floors.slice(),
    levels: floors.map((floor) => floor.upgradeCount),
    costs: floors.map((floor) => floor.upgradeCost),
    ...quote,
  };
}

export function isRenovationPlanCurrent(
  plan: RenovationPlan,
  floors: Floor[],
): boolean {
  return (
    floors.length === plan.floors.length &&
    floors.every(
      (floor, index) =>
        floor === plan.floors[index] &&
        floor.upgradeCount === plan.levels[index] &&
        floor.upgradeCost === plan.costs[index],
    )
  );
}

export function createPrepaidRenovationStep(
  plan: RenovationPlan,
  floors: Floor[],
  upgrade: (floor: Floor) => void,
): () => boolean {
  let index = 0;
  let remaining = plan.purchases[0] ?? 0;
  return () => {
    while (remaining === 0) {
      index++;
      if (index >= plan.purchases.length) return false;
      remaining = plan.purchases[index];
    }
    upgrade(floors[index]);
    remaining--;
    return true;
  };
}

// jobs to settle right away when the player leaves (see stopRenovationsNow)
const stoppers = new Set<() => void>();

// called when the player leaves the game: every running renovation stops on
// the spot, keeping what it bought (keepPartialOnStop) or refunding its cost
export function stopRenovationsNow(): void {
  for (const stop of [...stoppers]) stop();
}

export async function renovateFloors(options: {
  plan: RenovationPlan;
  buildings: Floor[][];
  buildingIndex: number;
  spend: (cost: BigNumber) => boolean;
  onPurchased?: () => void;
  refund: (cost: BigNumber) => void;
  getMoney: () => BigNumber;
  upgrade: (draft: BuildingDraft, floor: Floor) => void;
  createStep?: (draft: BuildingDraft) => (() => boolean) | undefined;
  commit: (draft: BuildingDraft, rewardBase: BigNumber) => void;
  isCurrent: () => boolean;
  // the draft's wallet holds the unspent budget, so a stopped job can commit
  keepPartialOnStop?: boolean;
}): Promise<BuildingDraft | null> {
  const floors = options.buildings[options.buildingIndex];
  if (
    options.plan.count === 0 ||
    !isRenovationPlanCurrent(options.plan, floors) ||
    !options.spend(options.plan.cost)
  )
    return null;
  const unlock = lockBuilding(floors);
  const rewardBase = options.getMoney();
  let result: BuildingDraft | null = null;
  let step: (() => boolean) | undefined;
  let readyDraft: BuildingDraft | null = null;
  let stopped = false;
  let settled = false;
  const settle = (): void => {
    if (settled) return;
    settled = true;
    stoppers.delete(stop);
    unlock();
    if (!result) options.refund(options.plan.cost);
  };
  const commit = (draft: BuildingDraft): void => {
    options.commit(draft, rewardBase);
    commitCritCounts(draft.badges);
    result = draft;
  };
  const stop = (): void => {
    stopped = true;
    if (options.keepPartialOnStop && readyDraft && !result) commit(readyDraft);
    settle();
  };
  stoppers.add(stop);
  const isCurrent = (): boolean => !stopped && options.isCurrent();
  try {
    options.onPurchased?.();
    await runDetachedJob({
      exclusive: false,
      isCurrent,
      clone: async (): Promise<BuildingDraft> => {
        const copies: Floor[] = [];
        const draft: BuildingDraft = {
          buildings: options.buildings.slice(),
          money: rewardBase,
          badges: {},
        };
        draft.buildings[options.buildingIndex] = copies;
        let startedAt = performance.now();
        for (const floor of floors) {
          if (!isCurrent()) break;
          copies.push(cloneWithSnapshotState(floor));
          if (performance.now() - startedAt >= JOB_SLICE_MS) {
            await yieldToFrame();
            startedAt = performance.now();
          }
        }
        step =
          options.createStep?.(draft) ??
          createPrepaidRenovationStep(options.plan, copies, (floor) =>
            options.upgrade(draft, floor),
          );
        if (isCurrent()) readyDraft = draft;
        return draft;
      },
      step: (draft) => withDraftCritCounts(draft.badges, () => step!()),
      commit: (draft) => {
        if (!stopped) commit(draft);
      },
    });
    return result;
  } finally {
    settle();
  }
}
