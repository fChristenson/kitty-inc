import { FLOOR_W, FLOOR_H } from "../floors";
import { hitTestWorker, clickWorker, getWorkerCenter } from "../worker";
import { hitTestUpgradeButton, getButtonCenter } from "../upgradeButton";
import { increaseIncomeRate } from "../incomePanel";
import { spendTotalIncome, getTotalIncome } from "../totalIncome";
import { spawnCoinBurst } from "../coins";
import { spawnFloatingCoins } from "../coinFloat";
import {
  hitTestFloorLock,
  unlockFloor,
  ensureLockedFloorAbove,
} from "../floorLock";
import { activateBoosted, type Floor } from "../gameState";
import type { FurnitureSprite } from "../sprites";
import type { GameRenderer } from "../gameRenderer";

export interface FloorInteractionsDeps {
  floorsEl: HTMLElement;
  floors: Floor[];
  floorCanvases: WeakMap<Floor, HTMLCanvasElement>;
  furnitureSprites: FurnitureSprite[];
  persist: () => void;
  renderer: GameRenderer;
  setHoveredFloor: (floor: Floor | null) => void;
  getHoveredFloor: () => Floor | null;
}

export interface FloorInteractions {
  mountFloor: (floor: Floor, position: "prepend" | "append") => void;
}

// owns every floor canvas's click/mousemove/mouseleave wiring, plus mounting new
// canvases into the DOM; main.ts just calls mountFloor for each Floor it creates/restores
export function createFloorInteractions(
  deps: FloorInteractionsDeps,
): FloorInteractions {
  const {
    floorsEl,
    floors,
    floorCanvases,
    furnitureSprites,
    persist,
    renderer,
    setHoveredFloor,
    getHoveredFloor,
  } = deps;

  // converts a mouse event to floor-local canvas coordinates (0..FLOOR_W, 0..FLOOR_H)
  function localPoint(
    canvas: HTMLCanvasElement,
    event: MouseEvent,
  ): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * FLOOR_W,
      y: ((event.clientY - rect.top) / rect.height) * FLOOR_H,
    };
  }

  // creates, wires, and inserts one floor's canvas; "prepend" for a newly-added
  // (higher) floor so it appears above everything else, "append" for restoring
  // floors in already-topmost-first order
  function mountFloor(floor: Floor, position: "prepend" | "append"): void {
    const canvas = document.createElement("canvas");
    canvas.width = FLOOR_W;
    canvas.height = FLOOR_H;
    floorCanvases.set(floor, canvas);

    canvas.addEventListener("mousemove", (event) => {
      const { x, y } = localPoint(canvas, event);
      const onButton =
        hitTestUpgradeButton(x, y) &&
        floor.unlocked &&
        getTotalIncome() >= floor.upgradeCost;
      const onLock = hitTestFloorLock(x, y, floor);
      const onWorker = hitTestWorker(x, y, floor) !== null;
      canvas.style.cursor =
        onButton || onLock || onWorker ? "pointer" : "default";
      const wasHovered = getHoveredFloor() === floor;
      if (onButton && !wasHovered) {
        setHoveredFloor(floor);
        renderer.redrawFloor(floor);
      } else if (!onButton && wasHovered) {
        setHoveredFloor(null);
        renderer.redrawFloor(floor);
      }
    });

    canvas.addEventListener("mouseleave", () => {
      if (getHoveredFloor() === floor) {
        setHoveredFloor(null);
        renderer.redrawFloor(floor);
      }
    });

    canvas.addEventListener("click", (event) => {
      const { x, y } = localPoint(canvas, event);

      if (hitTestFloorLock(x, y, floor)) {
        if (spendTotalIncome(floor.unlockCost)) {
          unlockFloor(floor);
          ensureLockedFloorAbove({
            floors,
            sprites: furnitureSprites,
            onAdd: (newFloor) => {
              mountFloor(newFloor, "prepend");
              renderer.redrawFloor(newFloor);
            },
          });
          persist();
          renderer.redrawFloor(floor);
        }
        return;
      }

      if (
        hitTestUpgradeButton(x, y) &&
        floor.unlocked &&
        spendTotalIncome(floor.upgradeCost)
      ) {
        increaseIncomeRate(floor);
        persist();
        const center = getButtonCenter();
        spawnCoinBurst(floor, center.x, center.y, () => {
          renderer.redrawFloor(floor);
          renderer.renderCoinOverlay();
        });
        return;
      }

      const workerIndex = hitTestWorker(x, y, floor);
      if (
        workerIndex !== null &&
        clickWorker(floor, workerIndex, performance.now())
      ) {
        const center = getWorkerCenter(floor, workerIndex);
        if (center) {
          spawnCoinBurst(floor, center.x, center.y, () => {
            renderer.redrawFloor(floor);
            renderer.renderCoinOverlay();
          });
          // start the float right away at just this worker, so the boost visibly
          // kicks in immediately instead of waiting for the next periodic tick
          spawnFloatingCoins(floor, center.x, center.y, () =>
            renderer.redrawFloor(floor),
          );
          renderer.markFloatSpawned(floor, performance.now());
        }
        // clicking a worker only (re)activates that specific worker's boost/15s timer
        activateBoosted(floor, workerIndex, performance.now());
        persist();
        renderer.redrawFloor(floor);
      }
    });

    if (position === "prepend") floorsEl.prepend(canvas);
    else floorsEl.append(canvas);
    renderer.observeFloor(floor, canvas);
  }

  return { mountFloor };
}
