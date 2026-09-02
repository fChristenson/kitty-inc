import { activateBoosted, type Floor } from "../../gameState";
import {
  formatPrice,
  triggerButtonPress,
  animateDialogClose,
} from "../../utils";
import { spendTotalIncome, getTotalIncome } from "../../totalIncome";
import {
  getRenderedWorkerCount,
  triggerJumpAll,
  triggerSaleBoost,
  floorIncomePerSecond,
  SALE_ASSUMED_CLICKS,
} from "../../floors";
import { playSwoosh, playSold } from "../../sound";
import { getImageUrl } from "../../loadAssets";
import {
  type BigNumber,
  ZERO,
  fromNumber,
  add,
  divide,
  multiply,
  max,
  gte,
  lt,
} from "../../shared/bigNumber";

const mouseIconUrl = getImageUrl("mouse");
const coinIconUrl = getImageUrl("coin");

const BOOST_ALL_SECONDS_COST = 5; // cost is 5s of current (unboosted) income

// $/sec every unlocked floor is currently earning at its own base rate, ignoring any
// boost already in effect — same convention gameState.ts's computeIdleIncome uses
function currentIncomePerSecond(floors: Floor[]): BigNumber {
  return floors
    .filter((floor) => floor.unlocked)
    .reduce(
      (sum, floor) =>
        add(sum, divide(floor.incomeAmount, floor.incomeIntervalSeconds)),
      ZERO,
    );
}

export function getBoostAllCost(floors: Floor[]): BigNumber {
  return multiply(currentIncomePerSecond(floors), BOOST_ALL_SECONDS_COST);
}

// a floor's own floorIncomePerSecond (see floors/upgradeButton/index.ts — exactly
// what one Sale click pays out), averaged across every unlocked floor since the
// boost lands on a random one
function averageFloorIncomePerSecond(floors: Floor[]): BigNumber {
  const unlocked = floors.filter((floor) => floor.unlocked);
  if (unlocked.length === 0) return fromNumber(1);
  const total = unlocked.reduce(
    (sum, floor) => add(sum, max(fromNumber(1), floorIncomePerSecond(floor))),
    ZERO,
  );
  return divide(total, unlocked.length);
}

// boosts every rendered worker on every unlocked floor — shared by the paid
// buyBoostAll below and mouse/index.ts's free click-triggered version
export function applyBoostAll(floors: Floor[]): void {
  // Date.now()-based (not performance.now()) so it matches incomePanel.ts's persisted,
  // Date.now()-based cycle tracking that reads the same boost state
  const now = Date.now();
  for (const floor of floors) {
    if (!floor.unlocked) continue;
    const renderedWorkers = getRenderedWorkerCount(floor);
    for (let i = 0; i < renderedWorkers; i++) {
      activateBoosted(floor, i, now);
    }
  }
}

// boosts every rendered worker on every unlocked floor if affordable; returns whether it succeeded
export function buyBoostAll(floors: Floor[]): boolean {
  if (!spendTotalIncome(getBoostAllCost(floors))) return false;
  applyBoostAll(floors);
  // same building-wide "yay!" jump-bounce mouse/index.ts's handleMouseClick triggers
  // for its own free boost, so buying the boost from the dialog reacts identically
  triggerJumpAll(floors, Date.now());
  return true;
}

export function getSaleBoostCost(floors: Floor[]): BigNumber {
  // half of SALE_ASSUMED_CLICKS worth of the floor's own per-second income —
  // clicking through that many sale clicks (see floorInteractions/index.ts) pays
  // that whole amount back, i.e. at least double the cost
  return divide(
    multiply(averageFloorIncomePerSecond(floors), SALE_ASSUMED_CLICKS),
    2,
  );
}

// buys the "Sale" boost: spends the cost, then puts one random unlocked floor's
// upgrade button on sale for its own duration (see floors/upgradeButton's
// triggerSaleBoost/SALE_DURATION_MS). Returns the floor put on sale (so the caller
// can e.g. scroll to it), or null (refunding nothing spent) if there's no unlocked
// floor to put on sale yet
export function buySaleBoost(floors: Floor[]): Floor | null {
  const unlocked = floors.filter((floor) => floor.unlocked);
  if (unlocked.length === 0) return null;
  if (!spendTotalIncome(getSaleBoostCost(floors))) return null;
  const floor = unlocked[Math.floor(Math.random() * unlocked.length)];
  triggerSaleBoost(floor);
  return floor;
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
  // called right after a successful Sale purchase, with the floor it landed on —
  // main.ts uses this to close the menu and scroll the camera to that floor
  onSaleTriggered: (floor: Floor) => void,
): BoostMenu {
  const menu = container.querySelector<HTMLDivElement>("#boost-menu")!;
  const backdrop = container.querySelector<HTMLDivElement>(
    "#boost-menu-backdrop",
  )!;
  const panel = menu.querySelector<HTMLDivElement>(".worker-menu__panel")!;
  const list = container.querySelector<HTMLDivElement>("#boost-menu-list")!;

  // both costs are O(every floor in the building) to compute (see
  // currentIncomePerSecond/averageFloorIncomePerSecond above) — cached here from
  // render() and reused by updateAffordability's own 250ms interval below instead
  // of recomputing them from scratch every tick, which made the dialog's upkeep
  // cost scale with the building's total floor count for as long as it stayed open
  let cachedBoostAllCost: BigNumber = ZERO;
  let cachedSaleBoostCost: BigNumber = ZERO;

  function render(): void {
    cachedBoostAllCost = getBoostAllCost(getFloors());
    const affordable = gte(getTotalIncome(), cachedBoostAllCost);
    cachedSaleBoostCost = getSaleBoostCost(getFloors());
    const saleAffordable = gte(getTotalIncome(), cachedSaleBoostCost);
    list.innerHTML = `
      <button
        class="worker-menu__item"
        id="boost-menu-speed-up"
        ${affordable ? "" : "disabled"}
      >
        <span class="worker-menu__item-label">
          <img src="${mouseIconUrl}" class="worker-menu__icon" alt="" />
          Motivate workers
        </span>
        <span class="worker-menu__price">${formatPrice(cachedBoostAllCost)}</span>
      </button>
      <button
        class="worker-menu__item"
        id="boost-menu-sale"
        ${saleAffordable ? "" : "disabled"}
      >
        <span class="worker-menu__item-label">
          <img src="${coinIconUrl}" class="worker-menu__icon" alt="" />
          Trigger sales event
        </span>
        <span class="worker-menu__price">${formatPrice(cachedSaleBoostCost)}</span>
      </button>
    `;
  }

  list.addEventListener("click", async (event) => {
    const target = event.target as HTMLElement;
    const speedUpButton = target.closest<HTMLButtonElement>(
      "#boost-menu-speed-up",
    );
    if (speedUpButton) {
      if (buyBoostAll(getFloors())) {
        playSold();
        await triggerButtonPress(speedUpButton);
        onPurchase();
        render();
      }
      return;
    }
    const saleButton = target.closest<HTMLButtonElement>("#boost-menu-sale");
    if (saleButton) {
      const floor = buySaleBoost(getFloors());
      if (floor) {
        playSold();
        await triggerButtonPress(saleButton);
        onPurchase();
        onSaleTriggered(floor);
        await close();
      }
    }
  });

  // re-checks affordability while the menu sits open so a grayed-out "too expensive"
  // button turns clickable again as soon as income catches up, instead of only
  // refreshing on the next open/purchase. Reuses render()'s own cached costs
  // instead of recomputing them (see cachedBoostAllCost/cachedSaleBoostCost above)
  // — the only thing that actually changes every 250ms is getTotalIncome() itself
  function updateAffordability(): void {
    const speedUpButton = list.querySelector<HTMLButtonElement>(
      "#boost-menu-speed-up",
    );
    if (speedUpButton) {
      speedUpButton.disabled = lt(getTotalIncome(), cachedBoostAllCost);
    }
    const saleButton =
      list.querySelector<HTMLButtonElement>("#boost-menu-sale");
    if (saleButton) {
      saleButton.disabled = lt(getTotalIncome(), cachedSaleBoostCost);
    }
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
