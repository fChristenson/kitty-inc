import type { Floor } from "../../gameState";
import {
  formatPrice,
  triggerButtonPress,
  animateDialogClose,
} from "../../utils";
import { getTotalIncome } from "../../totalIncome";
import {
  MAX_RENDERED_WORKERS,
  getWorkerIconUrl,
  getManagerIconUrl,
} from "../../floors";
import { playSwoosh, playSold } from "../../sound";
import { getImageUrl } from "../../loadAssets";
import { gte, lt, type BigNumber } from "../../shared/bigNumber";
import {
  getWorkerCost,
  buyWorker,
  getOfficeChairsCost,
  buyOfficeChairs,
  getOfficeSuppliesCost,
  buyOfficeSupplies,
  getManagerCost,
  buyManager,
  isManagerUnlocked,
  MANAGER_MIN_UPGRADE_COUNT,
} from "../upgradeMenu";

const officeChairsIconUrl = getImageUrl("officeChairsIcon");
const officeSuppliesIconUrl = getImageUrl("officeSuppliesIcon");

// whether this floor has at least one of its own per-floor purchases (worker,
// office chairs/supplies, manager) both unlocked/not-yet-bought AND actually
// affordable right now — read by floors/upgradeArrow (via gameRenderer, since
// floors/ can't import hud/) to decide whether its own arrow button should
// wiggle to draw attention, or sit still and gray
export function hasAffordableFloorUpgrade(floor: Floor): boolean {
  const totalIncome = getTotalIncome();
  const workerBuyable =
    floor.workerCount < MAX_RENDERED_WORKERS &&
    gte(totalIncome, getWorkerCost(floor));
  const chairsBuyable =
    !floor.hasOfficeChairs && gte(totalIncome, getOfficeChairsCost(floor));
  const suppliesBuyable =
    !floor.hasOfficeSupplies && gte(totalIncome, getOfficeSuppliesCost(floor));
  const managerBuyable =
    !floor.hasManager &&
    isManagerUnlocked(floor) &&
    gte(totalIncome, getManagerCost(floor));
  return workerBuyable || chairsBuyable || suppliesBuyable || managerBuyable;
}

// reuses .worker-menu's styling (same generic "dialog with a list of buyable
// items" shape every other hud dialog uses) — opened via the green arrow drawn
// on each floor's own room (floors/upgradeArrow), scoped to that one floor only
export function createFloorUpgradeMenuMarkup(): string {
  return `
    <div class="worker-menu" id="floor-upgrade-menu" hidden>
      <div class="worker-menu__backdrop" id="floor-upgrade-menu-backdrop"></div>
      <div class="worker-menu__panel">
        <div class="worker-menu__header">
          <h2 id="floor-upgrade-menu-title">Floor upgrades</h2>
        </div>
        <div class="worker-menu__list" id="floor-upgrade-menu-list"></div>
      </div>
    </div>
  `;
}

export interface FloorUpgradeMenu {
  // floorNumber is 1-indexed, matching what floors/floorNumber.ts already shows
  open: (floor: Floor, floorNumber: number) => void;
  close: () => void;
}

// one buyable row, fixed to a single named DOM id (there's only ever one floor's
// worth of items shown at a time, unlike hud/upgradeMenu's old per-floor list, so
// no data-floor-index bookkeeping is needed here)
function itemMarkup(options: {
  id: string;
  iconUrl: string | null;
  label: string;
  bought: boolean;
  cost: BigNumber;
  lockedLabel?: string;
}): string {
  const { id, iconUrl, label, bought, cost, lockedLabel } = options;
  const affordable = !bought && !lockedLabel && gte(getTotalIncome(), cost);
  const priceText = bought ? "Bought" : (lockedLabel ?? formatPrice(cost));
  return `
    <button
      class="worker-menu__item"
      id="${id}"
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

export function wireFloorUpgradeMenu(
  container: HTMLElement,
  onPurchase: () => void,
): FloorUpgradeMenu {
  const menu = container.querySelector<HTMLDivElement>("#floor-upgrade-menu")!;
  const backdrop = container.querySelector<HTMLDivElement>(
    "#floor-upgrade-menu-backdrop",
  )!;
  const panel = menu.querySelector<HTMLDivElement>(".worker-menu__panel")!;
  const title = container.querySelector<HTMLHeadingElement>(
    "#floor-upgrade-menu-title",
  )!;
  const list = container.querySelector<HTMLDivElement>(
    "#floor-upgrade-menu-list",
  )!;

  // the floor this dialog is currently showing, set on open() — read by every
  // render/click/affordability pass while it stays open, cleared on close()
  let currentFloor: Floor | null = null;

  function render(): void {
    const floor = currentFloor;
    if (!floor) return;
    const maxed = floor.workerCount >= MAX_RENDERED_WORKERS;
    const workerCost = getWorkerCost(floor);
    const workerAffordable = !maxed && gte(getTotalIncome(), workerCost);
    const workerItem = `
      <button
        class="worker-menu__item"
        id="floor-upgrade-menu-worker"
        ${workerAffordable ? "" : "disabled"}
      >
        <span class="worker-menu__item-label">
          <img src="${getWorkerIconUrl()}" class="worker-menu__icon" alt="" />
          Hire worker x${floor.workerCount}
        </span>
        <span class="worker-menu__price">${maxed ? "Max" : formatPrice(workerCost)}</span>
      </button>
    `;
    const chairsItem = itemMarkup({
      id: "floor-upgrade-menu-chairs",
      iconUrl: officeChairsIconUrl,
      label: "Buy office chairs",
      bought: floor.hasOfficeChairs,
      cost: getOfficeChairsCost(floor),
    });
    const suppliesItem = itemMarkup({
      id: "floor-upgrade-menu-supplies",
      iconUrl: officeSuppliesIconUrl,
      label: "Buy office supplies",
      bought: floor.hasOfficeSupplies,
      cost: getOfficeSuppliesCost(floor),
    });
    const managerItem = itemMarkup({
      id: "floor-upgrade-menu-manager",
      iconUrl: getManagerIconUrl(),
      label: "Hire manager",
      bought: floor.hasManager,
      cost: getManagerCost(floor),
      lockedLabel: isManagerUnlocked(floor)
        ? undefined
        : `Lvl ${MANAGER_MIN_UPGRADE_COUNT}`,
    });
    list.innerHTML = workerItem + chairsItem + suppliesItem + managerItem;
  }

  list.addEventListener("click", async (event) => {
    const target = event.target as HTMLElement;
    const floor = currentFloor;
    if (!floor) return;

    const workerButton = target.closest<HTMLButtonElement>(
      "#floor-upgrade-menu-worker",
    );
    if (workerButton && buyWorker(floor)) {
      playSold();
      await triggerButtonPress(workerButton);
      onPurchase();
      render();
      return;
    }
    const chairsButton = target.closest<HTMLButtonElement>(
      "#floor-upgrade-menu-chairs",
    );
    if (chairsButton && buyOfficeChairs(floor)) {
      playSold();
      await triggerButtonPress(chairsButton);
      onPurchase();
      render();
      return;
    }
    const suppliesButton = target.closest<HTMLButtonElement>(
      "#floor-upgrade-menu-supplies",
    );
    if (suppliesButton && buyOfficeSupplies(floor)) {
      playSold();
      await triggerButtonPress(suppliesButton);
      onPurchase();
      render();
      return;
    }
    const managerButton = target.closest<HTMLButtonElement>(
      "#floor-upgrade-menu-manager",
    );
    if (managerButton && buyManager(floor)) {
      playSold();
      await triggerButtonPress(managerButton);
      onPurchase();
      render();
    }
  });

  // re-checks affordability while the menu sits open (without rebuilding the whole
  // list) so a button already gone gray for being too expensive turns clickable
  // again as soon as income catches up, same convention every other hud dialog uses
  function updateAffordability(): void {
    const floor = currentFloor;
    if (!floor) return;
    const workerButton = list.querySelector<HTMLButtonElement>(
      "#floor-upgrade-menu-worker",
    );
    if (workerButton) {
      const maxed = floor.workerCount >= MAX_RENDERED_WORKERS;
      workerButton.disabled =
        maxed || lt(getTotalIncome(), getWorkerCost(floor));
    }
    const chairsButton = list.querySelector<HTMLButtonElement>(
      "#floor-upgrade-menu-chairs",
    );
    if (chairsButton) {
      chairsButton.disabled =
        floor.hasOfficeChairs ||
        lt(getTotalIncome(), getOfficeChairsCost(floor));
    }
    const suppliesButton = list.querySelector<HTMLButtonElement>(
      "#floor-upgrade-menu-supplies",
    );
    if (suppliesButton) {
      suppliesButton.disabled =
        floor.hasOfficeSupplies ||
        lt(getTotalIncome(), getOfficeSuppliesCost(floor));
    }
    const managerButton = list.querySelector<HTMLButtonElement>(
      "#floor-upgrade-menu-manager",
    );
    if (managerButton) {
      managerButton.disabled =
        floor.hasManager ||
        !isManagerUnlocked(floor) ||
        lt(getTotalIncome(), getManagerCost(floor));
    }
  }

  let refreshInterval: ReturnType<typeof setInterval> | null = null;

  function open(floor: Floor, floorNumber: number): void {
    currentFloor = floor;
    title.textContent = `Floor ${floorNumber} upgrades`;
    render();
    menu.hidden = false;
    playSwoosh();
    refreshInterval = setInterval(updateAffordability, 250);
  }

  async function close(): Promise<void> {
    playSwoosh();
    await animateDialogClose(panel);
    menu.hidden = true;
    currentFloor = null;
    if (refreshInterval !== null) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  backdrop.addEventListener("click", close);

  return { open, close };
}
