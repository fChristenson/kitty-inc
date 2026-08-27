import { activateBoosted, type Floor } from "../../gameState";
import { formatPrice, triggerButtonPress } from "../../utils";
import { spendTotalIncome, getTotalIncome } from "../../totalIncome";
import { MAX_RENDERED_WORKERS } from "../../floors";
import mouseIconUrl from "../../assets/mouse.png";

const BOOST_ALL_SECONDS_COST = 15; // cost is 15s of current (unboosted) income

// $/sec every unlocked floor is currently earning at its own base rate, ignoring any
// boost already in effect — same convention gameState.ts's computeIdleIncome uses
function currentIncomePerSecond(floors: Floor[]): number {
  return floors
    .filter((floor) => floor.unlocked)
    .reduce(
      (sum, floor) => sum + floor.incomeAmount / floor.incomeIntervalSeconds,
      0,
    );
}

export function getBoostAllCost(floors: Floor[]): number {
  return currentIncomePerSecond(floors) * BOOST_ALL_SECONDS_COST;
}

// boosts every rendered worker on every unlocked floor — shared by the paid
// buyBoostAll below and mouse/index.ts's free click-triggered version
export function applyBoostAll(floors: Floor[]): void {
  // Date.now()-based (not performance.now()) so it matches incomePanel.ts's persisted,
  // Date.now()-based cycle tracking that reads the same boost state
  const now = Date.now();
  for (const floor of floors) {
    if (!floor.unlocked) continue;
    const renderedWorkers = Math.min(floor.workerCount, MAX_RENDERED_WORKERS);
    for (let i = 0; i < renderedWorkers; i++) {
      activateBoosted(floor, i, now);
    }
  }
}

// boosts every rendered worker on every unlocked floor if affordable; returns whether it succeeded
export function buyBoostAll(floors: Floor[]): boolean {
  if (!spendTotalIncome(getBoostAllCost(floors))) return false;
  applyBoostAll(floors);
  return true;
}

// reuses .worker-menu's styling — same generic "dialog with a list of buyable items" shape
export function createBoostMenuMarkup(): string {
  return `
    <div class="worker-menu" id="boost-menu" hidden>
      <div class="worker-menu__backdrop" id="boost-menu-backdrop"></div>
      <div class="worker-menu__panel">
        <div class="worker-menu__header">
          <h2>Boosts</h2>
        </div>
        <div class="worker-menu__list" id="boost-menu-list"></div>
      </div>
    </div>
  `;
}

export interface BoostMenu {
  open: () => void;
  close: () => void;
}

// only one boost option today (speed up every worker); more can be added to the list
// alongside it later without changing the dialog's shape
export function wireBoostMenu(
  container: HTMLElement,
  getFloors: () => Floor[],
  onPurchase: () => void,
): BoostMenu {
  const menu = container.querySelector<HTMLDivElement>("#boost-menu")!;
  const backdrop = container.querySelector<HTMLDivElement>(
    "#boost-menu-backdrop",
  )!;
  const list = container.querySelector<HTMLDivElement>("#boost-menu-list")!;

  function render(): void {
    const cost = getBoostAllCost(getFloors());
    const affordable = getTotalIncome() >= cost;
    list.innerHTML = `
      <button
        class="worker-menu__item"
        id="boost-menu-speed-up"
        ${affordable ? "" : "disabled"}
      >
        <span class="worker-menu__item-label">
          <img src="${mouseIconUrl}" class="worker-menu__icon" alt="" />
          Boost workers
        </span>
        <span class="worker-menu__price">${formatPrice(cost)}</span>
      </button>
    `;
  }

  list.addEventListener("click", async (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "#boost-menu-speed-up",
    );
    if (!button) return;
    if (buyBoostAll(getFloors())) {
      await triggerButtonPress(button);
      onPurchase();
      render();
    }
  });

  // re-checks affordability while the menu sits open so a grayed-out "too expensive"
  // button turns clickable again as soon as income catches up, instead of only
  // refreshing on the next open/purchase
  function updateAffordability(): void {
    const button = list.querySelector<HTMLButtonElement>(
      "#boost-menu-speed-up",
    );
    if (button) {
      button.disabled = getTotalIncome() < getBoostAllCost(getFloors());
    }
  }

  let refreshInterval: ReturnType<typeof setInterval> | null = null;

  function open(): void {
    render();
    menu.hidden = false;
    refreshInterval = setInterval(updateAffordability, 250);
  }

  function close(): void {
    menu.hidden = true;
    if (refreshInterval !== null) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  backdrop.addEventListener("click", close);

  return { open, close };
}
