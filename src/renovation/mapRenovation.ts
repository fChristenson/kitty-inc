import type { Floor } from "../gameState";
import type { RenovationPlan } from "../shared/buildingJob";
import { add, ZERO, type BigNumber } from "../shared/bigNumber";
import { createPrepaidRenovationStep } from "./renovateFloors";

export interface BuildingCompletionRules {
  managerLevel: number;
  maxWorkers: number;
  increaseIncomeRate: (floor: Floor) => void;
  workerCost: (floor: Floor) => BigNumber;
  chairsCost: (floor: Floor) => BigNumber;
  suppliesCost: (floor: Floor) => BigNumber;
  managerCost: (floor: Floor) => BigNumber;
}

export function createFixedRenovationPlan(
  floors: Floor[],
  cost: BigNumber,
  count: number,
): RenovationPlan {
  return {
    floors: floors.slice(),
    levels: floors.map((floor) => floor.upgradeCount),
    costs: floors.map((floor) => floor.upgradeCost),
    purchases: floors.map(() => 0),
    cost,
    count,
  };
}

export function planBuildingCompletion(
  floors: Floor[],
  rules: BuildingCompletionRules,
): RenovationPlan {
  const plan = createFixedRenovationPlan(floors, ZERO, 0);
  for (const [index, source] of floors.entries()) {
    if (!source.unlocked) continue;
    const floor = { ...source };
    while (floor.upgradeCount < rules.managerLevel) {
      plan.cost = add(plan.cost, floor.upgradeCost);
      plan.purchases[index]++;
      plan.count++;
      rules.increaseIncomeRate(floor);
    }
    while (floor.workerCount < rules.maxWorkers) {
      plan.cost = add(plan.cost, rules.workerCost(floor));
      plan.count++;
      floor.workerCount++;
    }
    if (!floor.hasOfficeChairs) {
      plan.cost = add(plan.cost, rules.chairsCost(floor));
      plan.count++;
    }
    if (!floor.hasOfficeSupplies) {
      plan.cost = add(plan.cost, rules.suppliesCost(floor));
      plan.count++;
    }
    if (!floor.hasManager) {
      plan.cost = add(plan.cost, rules.managerCost(floor));
      plan.count++;
    }
  }
  return plan;
}

export function createFloorUnlockStep(
  floors: Floor[],
  unlock: (floor: Floor) => boolean,
): () => boolean {
  return () => {
    const target = floors.find((floor) => !floor.unlocked);
    return target !== undefined && unlock(target);
  };
}

export function createBuildingCompletionStep(
  plan: RenovationPlan,
  floors: Floor[],
  upgrade: (floor: Floor) => void,
  rules: Pick<BuildingCompletionRules, "maxWorkers" | "managerLevel">,
): () => boolean {
  const upgrades = createPrepaidRenovationStep(plan, floors, upgrade);
  let upgrading = true;
  let index = 0;
  return () => {
    if (upgrading) {
      if (upgrades()) return true;
      upgrading = false;
    }
    if (index >= plan.floors.length) return false;
    const floor = floors[index++];
    if (floor.unlocked) {
      floor.workerCount = Math.max(floor.workerCount, rules.maxWorkers);
      floor.hasOfficeChairs = true;
      floor.hasOfficeSupplies = true;
      if (floor.upgradeCount >= rules.managerLevel) floor.hasManager = true;
    }
    return true;
  };
}
