import type { Floor } from "../gameState";
import type { BuildingDraft, RenovationPlan } from "../shared/buildingJob";
import type { BigNumber } from "../shared/bigNumber";
import { CONFIG } from "../config";
import { quoteUpgrades } from "./upgradeQuote";
import { lockBuilding, runDetachedJob } from "../shared/detachedJob";
import { cloneWithSnapshotState } from "../shared/snapshotState";
import { withDraftCritCounts, commitCritCounts } from "../shared/critTypes";

export function planRenovation(
  floors: Floor[],
  money: BigNumber,
): RenovationPlan {
  const quote = quoteUpgrades(floors, money, (floor) =>
    floor.aboveCapTier
      ? CONFIG.incomePanel.upgradeCostGrowthAboveCap
      : CONFIG.incomePanel.upgradeCostGrowth,
  );
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

export async function renovateFloors(options: {
  plan: RenovationPlan;
  buildings: Floor[][];
  buildingIndex: number;
  spend: (cost: BigNumber) => boolean;
  onPurchased?: () => void;
  refund: (cost: BigNumber) => void;
  getMoney: () => BigNumber;
  upgrade: (draft: BuildingDraft, floor: Floor) => void;
  createStep?: (draft: BuildingDraft) => () => boolean;
  commit: (draft: BuildingDraft, rewardBase: BigNumber) => void;
  isCurrent: () => boolean;
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
  try {
    options.onPurchased?.();
    await runDetachedJob({
      exclusive: false,
      isCurrent: options.isCurrent,
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
          if (!options.isCurrent()) break;
          copies.push(cloneWithSnapshotState(floor));
          if (performance.now() - startedAt >= 8) {
            await new Promise<void>((resolve) => setTimeout(resolve, 0));
            startedAt = performance.now();
          }
        }
        step =
          options.createStep?.(draft) ??
          createPrepaidRenovationStep(options.plan, copies, (floor) =>
            options.upgrade(draft, floor),
          );
        return draft;
      },
      step: (draft) => withDraftCritCounts(draft.badges, () => step!()),
      commit: (draft) => {
        options.commit(draft, rewardBase);
        commitCritCounts(draft.badges);
        result = draft;
      },
    });
    return result;
  } finally {
    unlock();
    if (!result) options.refund(options.plan.cost);
  }
}
