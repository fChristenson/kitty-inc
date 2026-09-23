import type { BuildingDraft } from "../shared/buildingJob";
import type { CritProcKind } from "../shared/critTypes";

export {
  renovateFloors,
  planRenovation,
  isRenovationPlanCurrent,
  createPrepaidRenovationStep,
} from "./renovateFloors";
export {
  createFixedRenovationPlan,
  planBuildingCompletion,
  createFloorUnlockStep,
  createBuildingCompletionStep,
} from "./mapRenovation";

type Rewards = Partial<Record<CritProcKind, number>>;

export function createRenovationController(options: {
  setLoading: (loading: boolean) => void;
  showRewards: (rewards: Rewards) => void;
}) {
  let running: string | null = null;
  let visible: string | null = null;
  const rewards = new Map<string, Rewards>();
  const key = (company: number, building: number) => `${company}:${building}`;

  function refresh(): void {
    options.setLoading(running !== null && running === visible);
    if (visible === null || running === visible) return;
    const earned = rewards.get(visible);
    if (!earned) return;
    rewards.delete(visible);
    options.showRewards(earned);
  }

  return {
    get running(): boolean {
      return running !== null;
    },
    setView(company: number, building: number, mapOpen: boolean): void {
      visible = mapOpen ? null : key(company, building);
      refresh();
    },
    async start(
      company: number,
      building: number,
      job: () => Promise<BuildingDraft | null>,
    ): Promise<boolean> {
      if (running !== null) return false;
      const target = key(company, building);
      running = target;
      refresh();
      try {
        const result = await job();
        if (!result) return false;
        if (Object.keys(result.badges).length > 0) {
          const accumulated = rewards.get(target) ?? {};
          for (const [kind, count] of Object.entries(result.badges)) {
            const proc = kind as CritProcKind;
            accumulated[proc] = (accumulated[proc] ?? 0) + count;
          }
          rewards.set(target, accumulated);
        }
        return true;
      } finally {
        running = null;
        refresh();
      }
    },
  };
}
