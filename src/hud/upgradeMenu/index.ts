import type { Floor } from "../../gameState";
import {
  formatPrice,
  triggerButtonPress,
  animateDialogClose,
} from "../../utils";
import { spendTotalIncome, getTotalIncome } from "../../totalIncome";
import {
  MAX_RENDERED_WORKERS,
  getWorkerIconUrl,
  getManagerIconUrl,
} from "../../floors";
import { playSwoosh, playSold } from "../../sound";
import { getImageUrl } from "../../loadAssets";
import {
  type BigNumber,
  fromNumber,
  multiply,
  gt,
  gte,
  lt,
} from "../../shared/bigNumber";

const officeChairsIconUrl = getImageUrl("officeChairsIcon");
const officeSuppliesIconUrl = getImageUrl("officeSuppliesIcon");

// floor 1's unlockCost is permanently 0 (always free to unlock), so worker pricing
// needs its own floor price for it instead of reading straight from unlockCost
const WORKER_BASE_PRICE_FLOOR_1 = 100;

function getFloorPrice(floor: Floor): BigNumber {
  return gt(floor.unlockCost, fromNumber(0))
    ? floor.unlockCost
    : fromNumber(WORKER_BASE_PRICE_FLOOR_1);
}

// the $ cost of a floor's next worker: its floor price (unlock cost, or the floor-1
// fallback above) times how many workers it already has
export function getWorkerCost(floor: Floor): BigNumber {
  return multiply(getFloorPrice(floor), floor.workerCount);
}

// what the floor's own 3rd worker would cost (i.e. getWorkerCost at workerCount=2),
// independent of however many workers it actually has right now — shared pricing
// basis for the one-time office chairs/supplies purchases below
function getThirdWorkerCost(floor: Floor): BigNumber {
  return multiply(getFloorPrice(floor), 2);
}

// buys one more worker for the floor if affordable; returns whether it succeeded. capped
// at MAX_RENDERED_WORKERS since only that many little figures can ever be drawn per floor
export function buyWorker(floor: Floor): boolean {
  if (floor.workerCount >= MAX_RENDERED_WORKERS) return false;
  if (!spendTotalIncome(getWorkerCost(floor))) return false;
  floor.workerCount += 1;
  return true;
}

// a one-time, non-stacking per-floor purchase (unlike the worker button above, which
// can be bought over and over) — priced the same as the floor's own 3rd worker.
// Once floor.hasOfficeChairs flips true it never resets, and this item just stops
// being listed for that floor (see render below)
export function getOfficeChairsCost(floor: Floor): BigNumber {
  return getThirdWorkerCost(floor);
}

export function buyOfficeChairs(floor: Floor): boolean {
  if (floor.hasOfficeChairs) return false;
  if (!spendTotalIncome(getOfficeChairsCost(floor))) return false;
  floor.hasOfficeChairs = true;
  return true;
}

// a second one-time, non-stacking per-floor purchase, same shape (and same
// third-worker pricing) as office chairs above (own flag, never resets once bought)
export function getOfficeSuppliesCost(floor: Floor): BigNumber {
  return getThirdWorkerCost(floor);
}

export function buyOfficeSupplies(floor: Floor): boolean {
  if (floor.hasOfficeSupplies) return false;
  if (!spendTotalIncome(getOfficeSuppliesCost(floor))) return false;
  floor.hasOfficeSupplies = true;
  return true;
}

// a third one-time, non-stacking per-floor purchase, same shape (and same
// third-worker pricing) as office chairs/supplies above (own flag, never resets
// once bought) — but also gated behind the floor's own "level" (upgradeCount),
// so a manager can only be hired once a floor's been upgraded enough to justify one
const MANAGER_MIN_UPGRADE_COUNT = 50;

export function getManagerCost(floor: Floor): BigNumber {
  return getThirdWorkerCost(floor);
}

export function isManagerUnlocked(floor: Floor): boolean {
  return floor.upgradeCount >= MANAGER_MIN_UPGRADE_COUNT;
}

export function buyManager(floor: Floor): boolean {
  if (floor.hasManager || !isManagerUnlocked(floor)) return false;
  if (!spendTotalIncome(getManagerCost(floor))) return false;
  floor.hasManager = true;
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

// shared markup for a one-time, non-stacking per-floor item (office chairs,
// office supplies, ...): shows its price while buyable, then permanently switches
// to a disabled "Bought" state — never re-lists as buyable again. lockedLabel (if
// given and not yet bought) shows in place of the price and forces disabled,
// regardless of affordability — for items gated behind something besides money
// (see the manager item's floor-level requirement below)
function oneTimeItemMarkup(options: {
  dataAttr: string;
  floorIndex: number;
  iconUrl: string | null;
  label: string;
  bought: boolean;
  cost: BigNumber;
  lockedLabel?: string;
}): string {
  const { dataAttr, floorIndex, iconUrl, label, bought, cost, lockedLabel } =
    options;
  const affordable = !bought && !lockedLabel && gte(getTotalIncome(), cost);
  const priceText = bought ? "Bought" : (lockedLabel ?? formatPrice(cost));
  return `
    <button
      class="worker-menu__item"
      ${dataAttr}="${floorIndex}"
      ${affordable ? "" : "disabled"}
    >
      <span class="worker-menu__item-label">
        <img src="${iconUrl}" class="worker-menu__icon" alt="" />
        ${label}
      </span>
      <span class="worker-menu__price">${priceText}</span>
    </button>
  `;
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
    const kittyIconUrl = getWorkerIconUrl();
    const managerIconUrl = getManagerIconUrl();
    const floors = getFloors();
    const floorItems = floors
      .map((floor, i) => ({ floor, i }))
      .filter(({ floor }) => floor.unlocked) // locked floors have no worker to add yet
      .map(({ floor, i }) => {
        const subheader = `<h3 class="worker-menu__subheader">Floor ${i + 1}</h3>`;
        const maxed = floor.workerCount >= MAX_RENDERED_WORKERS;
        const cost = getWorkerCost(floor);
        const affordable = !maxed && gte(getTotalIncome(), cost);
        const workerItem = `
          <button
            class="worker-menu__item"
            data-floor-index="${i}"
            ${affordable ? "" : "disabled"}
          >
            <span class="worker-menu__item-label">
              <img src="${kittyIconUrl}" class="worker-menu__icon" alt="" />
              Hire worker x${floor.workerCount}
            </span>
            <span class="worker-menu__price">${maxed ? "Max" : formatPrice(cost)}</span>
          </button>
        `;
        const officeChairsItem = oneTimeItemMarkup({
          dataAttr: "data-office-chairs-floor-index",
          floorIndex: i,
          iconUrl: officeChairsIconUrl,
          label: "Buy office chairs",
          bought: floor.hasOfficeChairs,
          cost: getOfficeChairsCost(floor),
        });
        const officeSuppliesItem = oneTimeItemMarkup({
          dataAttr: "data-office-supplies-floor-index",
          floorIndex: i,
          iconUrl: officeSuppliesIconUrl,
          label: "Buy office supplies",
          bought: floor.hasOfficeSupplies,
          cost: getOfficeSuppliesCost(floor),
        });
        const managerItem = oneTimeItemMarkup({
          dataAttr: "data-manager-floor-index",
          floorIndex: i,
          iconUrl: managerIconUrl,
          label: "Hire manager",
          bought: floor.hasManager,
          cost: getManagerCost(floor),
          lockedLabel: isManagerUnlocked(floor)
            ? undefined
            : `Lvl ${MANAGER_MIN_UPGRADE_COUNT}`,
        });
        return (
          subheader +
          workerItem +
          officeChairsItem +
          officeSuppliesItem +
          managerItem
        );
      })
      .join("");
    list.innerHTML = floorItems;
  }

  list.addEventListener("click", async (event) => {
    const target = event.target as HTMLElement;
    const workerButton = target.closest<HTMLButtonElement>(
      "button[data-floor-index]",
    );
    if (workerButton) {
      const floor = getFloors()[Number(workerButton.dataset.floorIndex)];
      if (floor && floor.unlocked && buyWorker(floor)) {
        playSold();
        await triggerButtonPress(workerButton);
        onPurchase();
        render();
      }
      return;
    }
    const chairsButton = target.closest<HTMLButtonElement>(
      "button[data-office-chairs-floor-index]",
    );
    if (chairsButton) {
      const floor =
        getFloors()[Number(chairsButton.dataset.officeChairsFloorIndex)];
      if (floor && floor.unlocked && buyOfficeChairs(floor)) {
        playSold();
        await triggerButtonPress(chairsButton);
        onPurchase();
        render();
      }
      return;
    }
    const suppliesButton = target.closest<HTMLButtonElement>(
      "button[data-office-supplies-floor-index]",
    );
    if (suppliesButton) {
      const floor =
        getFloors()[Number(suppliesButton.dataset.officeSuppliesFloorIndex)];
      if (floor && floor.unlocked && buyOfficeSupplies(floor)) {
        playSold();
        await triggerButtonPress(suppliesButton);
        onPurchase();
        render();
      }
      return;
    }
    const managerButton = target.closest<HTMLButtonElement>(
      "button[data-manager-floor-index]",
    );
    if (managerButton) {
      const floor =
        getFloors()[Number(managerButton.dataset.managerFloorIndex)];
      if (floor && floor.unlocked && buyManager(floor)) {
        playSold();
        await triggerButtonPress(managerButton);
        onPurchase();
        render();
      }
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
        button.disabled = maxed || lt(getTotalIncome(), getWorkerCost(floor));
      });
    list
      .querySelectorAll<HTMLButtonElement>(
        "button[data-office-chairs-floor-index]",
      )
      .forEach((button) => {
        const floor =
          getFloors()[Number(button.dataset.officeChairsFloorIndex)];
        if (!floor) return;
        button.disabled =
          floor.hasOfficeChairs ||
          lt(getTotalIncome(), getOfficeChairsCost(floor));
      });
    list
      .querySelectorAll<HTMLButtonElement>(
        "button[data-office-supplies-floor-index]",
      )
      .forEach((button) => {
        const floor =
          getFloors()[Number(button.dataset.officeSuppliesFloorIndex)];
        if (!floor) return;
        button.disabled =
          floor.hasOfficeSupplies ||
          lt(getTotalIncome(), getOfficeSuppliesCost(floor));
      });
    list
      .querySelectorAll<HTMLButtonElement>("button[data-manager-floor-index]")
      .forEach((button) => {
        const floor = getFloors()[Number(button.dataset.managerFloorIndex)];
        if (!floor) return;
        button.disabled =
          floor.hasManager ||
          !isManagerUnlocked(floor) ||
          lt(getTotalIncome(), getManagerCost(floor));
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
