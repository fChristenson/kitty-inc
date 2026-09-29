import type { Floor } from "../../gameState";
import type { BigNumber } from "../bigNumber";
import {
  type CritProcKind,
  commitCritCounts,
  withDraftCritCounts,
} from "../critTypes";
import { isDetachedJobPending, runDetachedJob } from "../detachedJob";
import { cloneWithSnapshotState } from "../snapshotState";

export interface BuildingDraft {
  buildings: Floor[][];
  money: BigNumber;
  badges: Partial<Record<CritProcKind, number>>;
}

export async function runBuildingJob(options: {
  buildings: Floor[][];
  getMoney: () => BigNumber;
  step: (draft: BuildingDraft) => boolean;
  commit: (draft: BuildingDraft) => void;
  isCurrent: () => boolean;
}): Promise<boolean> {
  if (isDetachedJobPending()) return false;
  return runDetachedJob({
    clone: async (): Promise<BuildingDraft> => {
      const draft: BuildingDraft = {
        buildings: [],
        money: structuredClone(options.getMoney()),
        badges: {},
      };
      let startedAt = performance.now();
      for (const floors of options.buildings) {
        const copies: Floor[] = [];
        draft.buildings.push(copies);
        for (const floor of floors) {
          if (!options.isCurrent()) return draft;
          copies.push(cloneWithSnapshotState(floor));
          if (performance.now() - startedAt >= 8) {
            await new Promise<void>((resolve) => setTimeout(resolve, 0));
            startedAt = performance.now();
          }
        }
      }
      return draft;
    },
    step: (draft) =>
      withDraftCritCounts(draft.badges, () => options.step(draft)),
    commit: (draft) => {
      options.commit(draft);
      commitCritCounts(draft.badges);
    },
    isCurrent: options.isCurrent,
  });
}

export interface RenovationPlan {
  floors: Floor[];
  levels: number[];
  costs: BigNumber[];
  purchases: number[];
  count: number;
  cost: BigNumber;
}
