import type { Floor } from "../../gameState";
import { triggerButtonPress, animateDialogClose } from "../../utils";
import { spendTotalIncome, getTotalIncome } from "../../totalIncome";
import {
  MAX_RENDERED_WORKERS,
  getWorkerIconUrl,
  getManagerIconUrl,
  increaseIncomeRate,
  rollCritUpgrade,
} from "../../floors";
import { playSwoosh, playSold } from "../../sound";
import { getImageUrl } from "../../loadAssets";
import {
  type BigNumber,
  fromNumber,
  multiply,
  subtract,
  gt,
  gte,
  lt,
} from "../../shared/bigNumber";

const officeChairsIconUrl = getImageUrl("officeChairsIcon");
const officeSuppliesIconUrl = getImageUrl("officeSuppliesIcon");
const coinIconUrl = getImageUrl("coin");

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
// (also read by hud/floorUpgradeMenu, the per-floor dialog, for its own locked label)
export const MANAGER_MIN_UPGRADE_COUNT = 50;

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

function countRemaining(
  floors: Floor[],
  isEligible: (floor: Floor) => boolean,
): number {
  return floors.filter((floor) => floor.unlocked && isEligible(floor)).length;
}

function findNextEligibleFloor(
  floors: Floor[],
  isEligible: (floor: Floor) => boolean,
): Floor | null {
  return floors.find((floor) => floor.unlocked && isEligible(floor)) ?? null;
}

// buys this one-time upgrade floor by floor from the ground up, stopping the
// moment one is unaffordable — every floor above it costs at least as much
// (unlockCost only ever increases with floor level), so there's no point
// skipping ahead to check a pricier floor. Returns whether at least one bought
function massBuyOneTime(
  floors: Floor[],
  isEligible: (floor: Floor) => boolean,
  buy: (floor: Floor) => boolean,
): boolean {
  let boughtAny = false;
  for (const floor of floors) {
    if (!floor.unlocked || !isEligible(floor)) continue;
    if (!buy(floor)) break;
    boughtAny = true;
  }
  return boughtAny;
}

// same floor-order sweep as massBuyOneTime, but a single floor can take more
// than one worker (up to MAX_RENDERED_WORKERS) before moving to the next
function massHireWorkers(floors: Floor[]): boolean {
  let boughtAny = false;
  for (const floor of floors) {
    if (!floor.unlocked) continue;
    while (floor.workerCount < MAX_RENDERED_WORKERS) {
      if (!buyWorker(floor)) return boughtAny;
      boughtAny = true;
    }
  }
  return boughtAny;
}

// the unlocked floor whose own upgradeCost is currently lowest across the whole
// building — unlike massBuyOneTime/massHireWorkers, a floor's upgradeCost keeps
// climbing every time it's bought (see incomePanel.ts's increaseIncomeRate), so
// the cheapest floor can change from one purchase to the next
function getCheapestUpgradeFloor(floors: Floor[]): Floor | null {
  const unlocked = floors.filter((floor) => floor.unlocked);
  if (unlocked.length === 0) return null;
  return unlocked.reduce((cheapest, floor) =>
    lt(floor.upgradeCost, cheapest.upgradeCost) ? floor : cheapest,
  );
}

// "Renovate floors": repeatedly buys whichever unlocked floor's upgrade is
// currently cheapest (re-picked after every purchase, since that same floor's
// cost just rose), across the whole building, until the cheapest one left is no
// longer affordable
function massRenovateFloors(floors: Floor[]): boolean {
  let boughtAny = false;
  for (;;) {
    const cheapest = getCheapestUpgradeFloor(floors);
    if (!cheapest || !spendTotalIncome(cheapest.upgradeCost)) break;
    increaseIncomeRate(cheapest);
    rollCritUpgrade(cheapest);
    boughtAny = true;
  }
  return boughtAny;
}

// pure preview of how many upgrades massRenovateFloors would actually buy right
// now, for the button's own "x N" label -- runs the identical cheapest-first
// loop against shallow clones of the unlocked floors (increaseIncomeRate only
// ever reassigns a clone's own top-level fields, never mutates a shared nested
// object, so cloning is enough to keep this from touching the real floors or
// spending any real money) and a local running balance instead of spendTotalIncome
function countAffordableRenovations(floors: Floor[]): number {
  const clones = floors
    .filter((floor) => floor.unlocked)
    .map((floor) => ({ ...floor }));
  let remaining = getTotalIncome();
  let count = 0;
  for (;;) {
    if (clones.length === 0) break;
    const cheapest = clones.reduce((min, floor) =>
      lt(floor.upgradeCost, min.upgradeCost) ? floor : min,
    );
    if (lt(remaining, cheapest.upgradeCost)) break;
    remaining = subtract(remaining, cheapest.upgradeCost);
    increaseIncomeRate(cheapest);
    count += 1;
  }
  return count;
}

interface MassActionDef {
  action: string;
  iconUrl: string | null;
  label: string;
  isEligible: (floor: Floor) => boolean;
  getCost: (floor: Floor) => BigNumber;
  massBuy: (floors: Floor[]) => boolean;
}

// icons recomputed fresh each call (cheap cache lookups), same as the
// per-floor render below, since they reflect whichever building's sprite
// theme is currently loaded
function getMassActionDefs(): MassActionDef[] {
  return [
    {
      action: "workers",
      iconUrl: getWorkerIconUrl(),
      label: "Mass hire workers",
      isEligible: (floor) => floor.workerCount < MAX_RENDERED_WORKERS,
      getCost: getWorkerCost,
      massBuy: massHireWorkers,
    },
    {
      action: "chairs",
      iconUrl: officeChairsIconUrl,
      label: "Bulk buy office chairs",
      isEligible: (floor) => !floor.hasOfficeChairs,
      getCost: getOfficeChairsCost,
      massBuy: (floors) =>
        massBuyOneTime(
          floors,
          (floor) => !floor.hasOfficeChairs,
          buyOfficeChairs,
        ),
    },
    {
      action: "supplies",
      iconUrl: officeSuppliesIconUrl,
      label: "Bulk buy office supplies",
      isEligible: (floor) => !floor.hasOfficeSupplies,
      getCost: getOfficeSuppliesCost,
      massBuy: (floors) =>
        massBuyOneTime(
          floors,
          (floor) => !floor.hasOfficeSupplies,
          buyOfficeSupplies,
        ),
    },
    {
      action: "managers",
      iconUrl: getManagerIconUrl(),
      label: "Mass hire managers",
      isEligible: (floor) => !floor.hasManager && isManagerUnlocked(floor),
      getCost: getManagerCost,
      massBuy: (floors) =>
        massBuyOneTime(
          floors,
          (floor) => !floor.hasManager && isManagerUnlocked(floor),
          buyManager,
        ),
    },
  ];
}

// one "bulk"/"mass" row acting across every floor of the current building at
// once, from the ground floor up (see massBuyOneTime/massHireWorkers) — shows
// how many eligible floors still need it instead of a single $ price, since
// no one price could represent the whole run
function massActionItemMarkup(def: MassActionDef, floors: Floor[]): string {
  const remaining = countRemaining(floors, def.isEligible);
  const nextFloor = findNextEligibleFloor(floors, def.isEligible);
  const affordable =
    !!nextFloor && gte(getTotalIncome(), def.getCost(nextFloor));
  const priceText = remaining > 0 ? `x${remaining}` : "Done";
  return `
    <button
      class="worker-menu__item"
      data-mass-action="${def.action}"
      ${remaining > 0 && affordable ? "" : "disabled"}
    >
      <span class="worker-menu__item-label">
        <img src="${def.iconUrl}" class="worker-menu__icon" alt="" />
        ${def.label}
      </span>
      <span class="worker-menu__price">${priceText}</span>
    </button>
  `;
}

function massActionsMarkup(floors: Floor[]): string {
  const rows = getMassActionDefs()
    .map((def) => massActionItemMarkup(def, floors))
    .join("");
  return `${renovateFloorsItemMarkup(floors)}${rows}`;
}

// top-of-the-list "Renovate floors" row (see massRenovateFloors) — shows how
// many upgrades are affordable right now (see countAffordableRenovations)
// instead of a single $ price, since (unlike the other bulk actions) there's
// no fixed "x N left" count: it just keeps buying across floors until unaffordable
function renovateFloorsItemMarkup(floors: Floor[]): string {
  const count = countAffordableRenovations(floors);
  return `
    <button
      class="worker-menu__item"
      id="renovate-floors"
      ${count > 0 ? "" : "disabled"}
    >
      <span class="worker-menu__item-label">
        <img src="${coinIconUrl}" class="worker-menu__icon" alt="" />
        Renovate floors
      </span>
      <span class="worker-menu__price">x${count}</span>
    </button>
  `;
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

// wires the menu's open/close controls and its bulk-upgrade buttons; getFloors is
// called fresh each render so the list always reflects live state (including a new
// floor unlocked while the menu happens to be open). Per-floor purchases (worker,
// office chairs/supplies, manager) live in their own dialog now — see
// hud/floorUpgradeMenu, opened via the green arrow drawn on each floor's own room
// (floors/upgradeArrow) — this dialog only ever shows the building-wide bulk actions
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
    list.innerHTML = massActionsMarkup(getFloors());
  }

  list.addEventListener("click", async (event) => {
    const target = event.target as HTMLElement;
    const renovateButton =
      target.closest<HTMLButtonElement>("#renovate-floors");
    if (renovateButton) {
      const floors = getFloors();
      if (massRenovateFloors(floors)) {
        playSold();
        await triggerButtonPress(renovateButton);
        onPurchase();
        render();
      }
      return;
    }
    const massButton = target.closest<HTMLButtonElement>(
      "button[data-mass-action]",
    );
    if (massButton) {
      const floors = getFloors();
      const def = getMassActionDefs().find(
        (d) => d.action === massButton.dataset.massAction,
      );
      if (def && def.massBuy(floors)) {
        playSold();
        await triggerButtonPress(massButton);
        onPurchase();
        render();
      }
    }
  });

  // re-checks affordability while the menu sits open (without rebuilding the whole
  // list) so a button already gone gray for being too expensive turns clickable again
  // as soon as income catches up, instead of only refreshing on the next open/purchase
  function updateAffordability(): void {
    const floors = getFloors();
    const renovateButton =
      list.querySelector<HTMLButtonElement>("#renovate-floors");
    if (renovateButton) {
      const count = countAffordableRenovations(floors);
      renovateButton.disabled = count === 0;
      const priceEl = renovateButton.querySelector(".worker-menu__price");
      if (priceEl) priceEl.textContent = `x${count}`;
    }
    list
      .querySelectorAll<HTMLButtonElement>("button[data-mass-action]")
      .forEach((button) => {
        const def = getMassActionDefs().find(
          (d) => d.action === button.dataset.massAction,
        );
        if (!def) return;
        const nextFloor = findNextEligibleFloor(floors, def.isEligible);
        button.disabled =
          !nextFloor || lt(getTotalIncome(), def.getCost(nextFloor));
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
