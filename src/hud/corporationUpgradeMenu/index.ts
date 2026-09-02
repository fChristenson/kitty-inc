import {
  animateDialogClose,
  formatPrice,
  formatTotalIncomeFull,
  formatTotalIncomeParts,
  triggerButtonPress,
} from "../../utils";
import {
  getAllCompaniesTotalIncome,
  getStoredTotalIncome,
} from "../../totalIncome";
import { playSwoosh, playSold } from "../../sound";
import { getImageUrl } from "../../loadAssets";
import { loadBuildings, saveBuildings, type Floor } from "../../gameState";
import { getActiveCompanyIndex } from "../../company";
import { getCorporationCount, getCorporationName } from "../../corporationName";
import {
  startPressAndHold,
  type PressAndHoldController,
} from "../../shared/pressAndHold";
import {
  type FloorTarget,
  getCheapestFloorPurchaseTarget,
  buyCheapestFloor,
  getCheapestUpgradeTarget,
  buyCheapestUpgrade,
  getCheapestWorkerTarget,
  buyCheapestWorker,
  getCheapestOfficeChairsTarget,
  buyCheapestOfficeChairs,
  getCheapestOfficeSuppliesTarget,
  buyCheapestOfficeSupplies,
  getCheapestManagerTarget,
  buyCheapestManager,
} from "../corporationBoostMenu";
import {
  getWorkerCost,
  getOfficeChairsCost,
  getOfficeSuppliesCost,
  getManagerCost,
} from "../upgradeMenu";
import { getWorkerIconUrl, getManagerIconUrl } from "../../floors";

const coinIconUrl = getImageUrl("coin");
const officeChairsIconUrl = getImageUrl("officeChairsIcon");
const officeSuppliesIconUrl = getImageUrl("officeSuppliesIcon");

// one "Building upgrades" row kind, shared across every company's own
// sub-section (see renderCompanyBuildingUpgrades below) — buy takes the
// target company's own index (so it spends from THAT company's wallet, see
// economy.ts) alongside its buildings
interface UpgradeItemKind {
  key: string;
  iconUrl: string | null;
  label: string;
  getTarget: (companyBuildings: Floor[][]) => FloorTarget | null;
  getCost: (floor: Floor) => number;
  buy: (companyIndex: number, companyBuildings: Floor[][]) => boolean;
}

// recomputed fresh each call (icons are cheap cache lookups) rather than
// stored once, since getWorkerIconUrl/getManagerIconUrl reflect whichever
// building's sprite theme is currently loaded. Order mirrors the per-floor
// upgrade menu's own item order (worker, office chairs, office supplies,
// manager) — "Buy floor"/"Upgrade floor" have no per-floor-menu equivalent
// (they're the canvas floor-lock/upgrade buttons instead), kept first as the
// primary actions. notifyFloorAdded only matters for "Buy floor" (see
// economy.ts's buyCheapestFloor) — forwards to gameCanvas.ts ONLY when the
// bought building happens to be the one currently on screen (see main.ts's
// own caller)
function getItemKinds(
  notifyFloorAdded: (
    companyIndex: number,
    buildingIndex: number,
    floor: Floor,
  ) => void,
): UpgradeItemKind[] {
  return [
    {
      key: "floor",
      iconUrl: coinIconUrl,
      label: "Buy floor",
      getTarget: getCheapestFloorPurchaseTarget,
      getCost: (floor) => floor.unlockCost,
      buy: (companyIndex, companyBuildings) =>
        buyCheapestFloor(
          companyIndex,
          companyBuildings,
          (buildingIndex, floor) =>
            notifyFloorAdded(companyIndex, buildingIndex, floor),
        ),
    },
    {
      key: "upgrade",
      iconUrl: coinIconUrl,
      label: "Upgrade floor",
      getTarget: getCheapestUpgradeTarget,
      getCost: (floor) => floor.upgradeCost,
      buy: buyCheapestUpgrade,
    },
    {
      key: "worker",
      iconUrl: getWorkerIconUrl(),
      label: "Hire worker",
      getTarget: getCheapestWorkerTarget,
      getCost: getWorkerCost,
      buy: buyCheapestWorker,
    },
    {
      key: "chairs",
      iconUrl: officeChairsIconUrl,
      label: "Buy office chairs",
      getTarget: getCheapestOfficeChairsTarget,
      getCost: getOfficeChairsCost,
      buy: buyCheapestOfficeChairs,
    },
    {
      key: "supplies",
      iconUrl: officeSuppliesIconUrl,
      label: "Buy office supplies",
      getTarget: getCheapestOfficeSuppliesTarget,
      getCost: getOfficeSuppliesCost,
      buy: buyCheapestOfficeSupplies,
    },
    {
      key: "manager",
      iconUrl: getManagerIconUrl(),
      label: "Hire manager",
      getTarget: getCheapestManagerTarget,
      getCost: getManagerCost,
      buy: buyCheapestManager,
    },
  ];
}

// same worker-menu look as boostMenu/upgradeMenu — a dialog for picking/creating
// the corporation shown on the map (see cityMap's drawCorporationNames), plus a
// "Building upgrades" section (see render() below), one sub-section per
// existing corporation, each acting only on that corporation's own buildings
export function createCorporationUpgradeMenuMarkup(): string {
  return `
    <div class="worker-menu" id="corporation-upgrade-menu" hidden>
      <div class="worker-menu__backdrop" id="corporation-upgrade-menu-backdrop"></div>
      <div class="worker-menu__panel">
        <div class="worker-menu__header">
          <h2>Corporation Upgrades</h2>
        </div>
        <div class="worker-menu__list" id="corporation-upgrade-menu-list"></div>
      </div>
    </div>
  `;
}

export interface CorporationUpgradeMenu {
  open: () => void;
  close: () => void;
}

// wires the menu's open/close controls, the "Create new Corporation" item, and
// every company's own "Building upgrades" items; getCorporationPrice renders
// the live cost (re-read on open and after every purchase, since it scales up
// each time); onCreateNewCorporation fires on click only — the caller
// (main.ts) is the one that checks affordability/spends the cost before
// actually creating the corporation, same pattern buyBuilding uses.
// buildings/persist are the ACTIVE company's own live floors array + save
// trigger (see main.ts) — every OTHER company's own buildings are loaded/saved
// on demand (see getBuildingsForCompany/persistBuildingsForCompany below)
// since only the active company's floors are ever kept live in memory
export function wireCorporationUpgradeMenu(
  container: HTMLElement,
  buildings: Floor[][],
  persist: () => void,
  notifyFloorAdded: (
    companyIndex: number,
    buildingIndex: number,
    floor: Floor,
  ) => void,
  getCorporationPrice: () => number,
  onCreateNewCorporation: () => void,
): CorporationUpgradeMenu {
  const menu = container.querySelector<HTMLDivElement>(
    "#corporation-upgrade-menu",
  )!;
  const backdrop = container.querySelector<HTMLDivElement>(
    "#corporation-upgrade-menu-backdrop",
  )!;
  const panel = menu.querySelector<HTMLDivElement>(".worker-menu__panel")!;
  const list = container.querySelector<HTMLDivElement>(
    "#corporation-upgrade-menu-list",
  )!;

  function getBuildingsForCompany(companyIndex: number): Floor[][] {
    return companyIndex === getActiveCompanyIndex()
      ? buildings
      : loadBuildings(companyIndex);
  }

  function persistBuildingsForCompany(
    companyIndex: number,
    companyBuildings: Floor[][],
  ): void {
    if (companyIndex === getActiveCompanyIndex()) {
      persist();
    } else {
      saveBuildings(companyBuildings, companyIndex);
    }
  }

  // shared markup for one "Building upgrades" row: shows the target floor's
  // own cost, or blocks the button (dash, disabled) once target is null (no
  // eligible floor left — e.g. every floor already has office chairs).
  // buttonKey uniquely identifies this row across every company's section
  // (`${kind.key}:${companyIndex}`)
  function buildingUpgradeItemMarkup(
    buttonKey: string,
    companyIndex: number,
    kind: UpgradeItemKind,
    target: FloorTarget | null,
  ): string {
    const affordable =
      target !== null &&
      getStoredTotalIncome(companyIndex) >= kind.getCost(target.floor);
    return `
      <button
        class="worker-menu__item"
        data-buy-key="${buttonKey}"
        ${affordable ? "" : "disabled"}
      >
        <span class="worker-menu__item-label">
          <img src="${kind.iconUrl}" class="worker-menu__icon" alt="" />
          <span class="worker-menu__item-name">${kind.label}</span>
        </span>
        <span class="worker-menu__price">${target ? formatPrice(kind.getCost(target.floor)) : "—"}</span>
      </button>
    `;
  }

  // a company's own current total income, amount and unit name (e.g.
  // "Undecillion") each on their own line — formatTotalIncomeFull joins them
  // onto one line instead, which doesn't fit this section's tighter width
  function companyIncomeMarkup(companyIndex: number): string {
    const { amount, unitName } = formatTotalIncomeParts(
      getStoredTotalIncome(companyIndex),
    );
    return `
      <span class="worker-menu__company-income">
        <span class="worker-menu__company-income-amount">${amount}</span>${unitName ? `<span class="worker-menu__company-income-unit">${unitName}</span>` : ""}
      </span>
    `;
  }

  // one company's whole "Building upgrades" sub-section: its own name, its
  // own current total income (the wallet every button below spends from —
  // see economy.ts's spendCompanyTotalIncome), then its own 6 items — every
  // getTarget/getCost call below only ever reads THIS company's own
  // buildings, never any other company's
  function renderCompanyBuildingUpgrades(companyIndex: number): string {
    const companyBuildings = getBuildingsForCompany(companyIndex);
    const rows = getItemKinds(notifyFloorAdded)
      .map((kind) =>
        buildingUpgradeItemMarkup(
          `${kind.key}:${companyIndex}`,
          companyIndex,
          kind,
          kind.getTarget(companyBuildings),
        ),
      )
      .join("");
    return `
      <h3 class="worker-menu__subheader worker-menu__subheader--company">${getCorporationName(companyIndex)}</h3>
      ${companyIncomeMarkup(companyIndex)}
      ${rows}
    `;
  }

  function render(): void {
    const scrollTop = list.scrollTop;
    const allCompaniesTotalIncome = getAllCompaniesTotalIncome();
    const corporationPrice = getCorporationPrice();
    const corporationAffordable = allCompaniesTotalIncome >= corporationPrice;
    const companySections = Array.from(
      { length: getCorporationCount() },
      (_, companyIndex) => renderCompanyBuildingUpgrades(companyIndex),
    ).join("");
    list.innerHTML = `
      <h3 class="worker-menu__subheader">Corporation assets</h3>
      <span class="worker-menu__total-income">${formatTotalIncomeFull(allCompaniesTotalIncome)}</span>
      <button
        class="worker-menu__item"
        id="create-new-corporation"
        ${corporationAffordable ? "" : "disabled"}
      >
        <span class="worker-menu__item-label">
          <img src="${coinIconUrl}" class="worker-menu__icon" alt="" />
          Create new Company
        </span>
        <span class="worker-menu__price">${formatPrice(corporationPrice)}</span>
      </button>
      <h3 class="worker-menu__subheader">Budget approvals</h3>
      ${companySections}
    `;
    list.scrollTop = scrollTop;
  }

  list.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>("#create-new-corporation");
    if (!button || button.disabled) return;
    onCreateNewCorporation();
    playSold();
    render();
  });

  // one shared press-and-hold across every company's every button: fires
  // once on pointerdown, keeps firing every HOLD_INTERVAL_MS while held, stops
  // on pointerup/cancel anywhere or once buyFn fails (no longer affordable, or
  // no eligible floor left). render() runs first (not awaited behind the
  // press-bounce animation) so price/affordability update every tick in real
  // time; triggerButtonPress is fired fire-and-forget on the freshly rendered
  // button purely for the visual bounce (awaiting it here would stall
  // render() during a fast hold — see repo memory on this exact gotcha)
  const HOLD_INTERVAL_MS = 100;
  let heldKey: string | null = null;
  let holdController: PressAndHoldController | null = null;

  function stopHold(): void {
    heldKey = null;
    holdController?.stop();
    holdController = null;
  }

  function fire(buyKey: string): void {
    const separatorIndex = buyKey.lastIndexOf(":");
    const kindKey = buyKey.slice(0, separatorIndex);
    const companyIndex = Number(buyKey.slice(separatorIndex + 1));
    const kind = getItemKinds(notifyFloorAdded).find((k) => k.key === kindKey);
    if (!kind) return;
    const companyBuildings = getBuildingsForCompany(companyIndex);
    if (!kind.buy(companyIndex, companyBuildings)) {
      stopHold();
      return;
    }
    persistBuildingsForCompany(companyIndex, companyBuildings);
    playSold();
    render();
    const button = list.querySelector<HTMLButtonElement>(
      `button[data-buy-key="${buyKey}"]`,
    );
    if (button) void triggerButtonPress(button);
  }

  list.addEventListener("pointerdown", (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>("button[data-buy-key]");
    if (!button || button.disabled) return;
    const buyKey = button.dataset.buyKey!;
    stopHold(); // safety net against stale state from an interrupted previous gesture
    heldKey = buyKey;
    fire(buyKey);
    holdController = startPressAndHold(() => {
      if (heldKey !== buyKey) return;
      fire(buyKey);
    }, HOLD_INTERVAL_MS);
  });

  window.addEventListener("pointerup", stopHold);
  window.addEventListener("pointercancel", stopHold);

  // re-checks affordability on its own while the menu sits open, same as every
  // other worker-menu (boostMenu/upgradeMenu/corporationBoostMenu/mapMenu), so
  // a grayed-out item turns clickable again as soon as income catches up
  // instead of only refreshing on the next open/purchase
  function updateAffordability(): void {
    const createButton = list.querySelector<HTMLButtonElement>(
      "#create-new-corporation",
    );
    if (createButton) {
      createButton.disabled =
        getAllCompaniesTotalIncome() < getCorporationPrice();
    }
    const itemKinds = getItemKinds(notifyFloorAdded);
    for (
      let companyIndex = 0;
      companyIndex < getCorporationCount();
      companyIndex++
    ) {
      const companyBuildings = getBuildingsForCompany(companyIndex);
      const companyTotalIncome = getStoredTotalIncome(companyIndex);
      for (const kind of itemKinds) {
        const button = list.querySelector<HTMLButtonElement>(
          `button[data-buy-key="${kind.key}:${companyIndex}"]`,
        );
        if (!button) continue;
        const target = kind.getTarget(companyBuildings);
        button.disabled =
          target === null || companyTotalIncome < kind.getCost(target.floor);
      }
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
    stopHold();
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
