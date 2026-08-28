import type { Floor } from "../../gameState";
import {
  formatPrice,
  triggerButtonPress,
  animateDialogClose,
} from "../../utils";
import { spendTotalIncome, getTotalIncome } from "../../totalIncome";
import { MAX_RENDERED_WORKERS } from "../../floors";
import { playSwoosh, playSold } from "../../sound";
import kittyIconUrl from "../../assets/kittyIcon.png";

// floor 1's unlockCost is permanently 0 (always free to unlock), so worker pricing
// needs its own floor price for it instead of reading straight from unlockCost
const WORKER_BASE_PRICE_FLOOR_1 = 100;

// the $ cost of a floor's next worker: its floor price (unlock cost, or the floor-1
// fallback above) times how many workers it already has
export function getWorkerCost(floor: Floor): number {
  const floorPrice =
    floor.unlockCost > 0 ? floor.unlockCost : WORKER_BASE_PRICE_FLOOR_1;
  return floorPrice * floor.workerCount;
}

// buys one more worker for the floor if affordable; returns whether it succeeded. capped
// at MAX_RENDERED_WORKERS since only that many little figures can ever be drawn per floor
export function buyWorker(floor: Floor): boolean {
  if (floor.workerCount >= MAX_RENDERED_WORKERS) return false;
  if (!spendTotalIncome(getWorkerCost(floor))) return false;
  floor.workerCount += 1;
  return true;
}

export function createUpgradeMenuMarkup(): string {
  return `
    <div class="worker-menu" id="upgrade-menu" hidden>
      <div class="worker-menu__backdrop" id="upgrade-menu-backdrop"></div>
      <div class="worker-menu__panel">
        <div class="worker-menu__header">
          <h2>Upgrades</h2>
        </div>
        <div class="worker-menu__list" id="upgrade-menu-list"></div>
      </div>
    </div>
  `;
}

export interface UpgradeMenu {
  open: () => void;
  close: () => void;
}

// wires the menu's open/close controls and the per-floor "Add new worker" buttons;
// getFloors is called fresh each render so the list always reflects live state
// (including a new floor unlocked while the menu happens to be open)
export function wireUpgradeMenu(
  container: HTMLElement,
  getFloors: () => Floor[],
  onPurchase: () => void,
): UpgradeMenu {
  const menu = container.querySelector<HTMLDivElement>("#upgrade-menu")!;
  const backdrop = container.querySelector<HTMLDivElement>(
    "#upgrade-menu-backdrop",
  )!;
  const panel = menu.querySelector<HTMLDivElement>(".worker-menu__panel")!;
  const list = container.querySelector<HTMLDivElement>("#upgrade-menu-list")!;

  function render(): void {
    const floors = getFloors();
    const floorItems = floors
      .map((floor, i) => ({ floor, i }))
      .filter(({ floor }) => floor.unlocked) // locked floors have no worker to add yet
      .map(({ floor, i }) => {
        const maxed = floor.workerCount >= MAX_RENDERED_WORKERS;
        const cost = getWorkerCost(floor);
        const affordable = !maxed && getTotalIncome() >= cost;
        return `
          <button
            class="worker-menu__item"
            data-floor-index="${i}"
            ${affordable ? "" : "disabled"}
          >
            <span class="worker-menu__item-label">
              <img src="${kittyIconUrl}" class="worker-menu__icon" alt="" />
              Floor ${i + 1}: Add worker x${floor.workerCount}
            </span>
            <span class="worker-menu__price">${maxed ? "Max" : formatPrice(cost)}</span>
          </button>
        `;
      })
      .join("");
    list.innerHTML = floorItems;
  }

  list.addEventListener("click", async (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>(
      "button[data-floor-index]",
    );
    if (!button) return;
    const floor = getFloors()[Number(button.dataset.floorIndex)];
    if (floor && floor.unlocked && buyWorker(floor)) {
      playSold();
      await triggerButtonPress(button);
      onPurchase();
      render();
    }
  });

  // re-checks affordability while the menu sits open (without rebuilding the whole
  // list) so a button already gone gray for being too expensive turns clickable again
  // as soon as income catches up, instead of only refreshing on the next open/purchase
  function updateAffordability(): void {
    list
      .querySelectorAll<HTMLButtonElement>("button[data-floor-index]")
      .forEach((button) => {
        const floor = getFloors()[Number(button.dataset.floorIndex)];
        if (!floor) return;
        const maxed = floor.workerCount >= MAX_RENDERED_WORKERS;
        button.disabled = maxed || getTotalIncome() < getWorkerCost(floor);
      });
  }

  let refreshInterval: ReturnType<typeof setInterval> | null = null;

  function open(): void {
    render();
    menu.hidden = false;
    playSwoosh();
    refreshInterval = setInterval(updateAffordability, 250);
  }

  async function close(): Promise<void> {
    playSwoosh();
    await animateDialogClose(panel);
    menu.hidden = true;
    if (refreshInterval !== null) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  backdrop.addEventListener("click", close);

  return { open, close };
}
