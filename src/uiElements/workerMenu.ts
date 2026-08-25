import type { Floor } from "../gameState";
import { formatPrice } from "../utils";
import { spendTotalIncome, getTotalIncome } from "./totalIncome";

// floor 1's unlockCost is permanently 0 (always free to unlock), so worker pricing
// needs its own floor price for it instead of reading straight from unlockCost
const WORKER_BASE_PRICE_FLOOR_1 = 100;

// the $ cost of a floor's next worker: its floor price (unlock cost, or the floor-1
// fallback above) times how many workers it already has
export function getWorkerCost(floor: Floor): number {
  const floorPrice = floor.unlockCost > 0 ? floor.unlockCost : WORKER_BASE_PRICE_FLOOR_1;
  return floorPrice * floor.workerCount;
}

// buys one more worker for the floor if affordable; returns whether it succeeded
export function buyWorker(floor: Floor): boolean {
  if (!spendTotalIncome(getWorkerCost(floor))) return false;
  floor.workerCount += 1;
  return true;
}

export function createWorkerMenuMarkup(): string {
  return `
    <div class="worker-menu" id="worker-menu" hidden>
      <div class="worker-menu__backdrop" id="worker-menu-backdrop"></div>
      <div class="worker-menu__panel">
        <div class="worker-menu__header">
          <h2>Hire Workers</h2>
          <button class="worker-menu__close" id="worker-menu-close" aria-label="Close">&times;</button>
        </div>
        <div class="worker-menu__list" id="worker-menu-list"></div>
      </div>
    </div>
  `;
}

export interface WorkerMenu {
  open: () => void;
  close: () => void;
}

// wires the menu's open/close controls and the per-floor "Add new worker" buttons;
// getFloors is called fresh each render so the list always reflects the live floors
// array (including any new floor unlocked while the menu happens to be open)
export function wireWorkerMenu(
  container: HTMLElement,
  getFloors: () => Floor[],
  onPurchase: () => void,
): WorkerMenu {
  const menu = container.querySelector<HTMLDivElement>("#worker-menu")!;
  const backdrop = container.querySelector<HTMLDivElement>(
    "#worker-menu-backdrop",
  )!;
  const closeButton = container.querySelector<HTMLButtonElement>(
    "#worker-menu-close",
  )!;
  const list = container.querySelector<HTMLDivElement>("#worker-menu-list")!;

  function render(): void {
    const floors = getFloors();
    list.innerHTML = floors
      .map((floor, i) => ({ floor, i }))
      .filter(({ floor }) => floor.unlocked) // locked floors have no worker to add yet
      .map(({ floor, i }) => {
        const cost = getWorkerCost(floor);
        const affordable = getTotalIncome() >= cost;
        return `
          <button
            class="worker-menu__item"
            data-floor-index="${i}"
            ${affordable ? "" : "disabled"}
          >
            <span>Floor ${i + 1}: Add new worker x${floor.workerCount}</span>
            <span class="worker-menu__price">${formatPrice(cost)}</span>
          </button>
        `;
      })
      .join("");
  }

  list.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "button[data-floor-index]",
    );
    if (!button) return;
    const floor = getFloors()[Number(button.dataset.floorIndex)];
    if (floor && floor.unlocked && buyWorker(floor)) {
      onPurchase();
      render();
    }
  });

  function open(): void {
    render();
    menu.hidden = false;
  }

  function close(): void {
    menu.hidden = true;
  }

  backdrop.addEventListener("click", close);
  closeButton.addEventListener("click", close);

  return { open, close };
}
