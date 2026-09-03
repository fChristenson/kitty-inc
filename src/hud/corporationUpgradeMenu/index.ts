import {
  animateDialogClose,
  formatPrice,
  formatTotalIncomeFull,
} from "../../utils";
import { getAllCompaniesTotalIncome } from "../../totalIncome";
import { getCorporationName } from "../../corporationName";
import {
  getActiveCompanyIndex,
  getActiveCorporationIndices,
} from "../../company";
import { playSwoosh, playSold } from "../../sound";
import { getImageUrl } from "../../loadAssets";
import { type BigNumber, gte, lt } from "../../shared/bigNumber";

const coinIconUrl = getImageUrl("coin");

// company indices currently checked in the "Merge" list below — persists across
// re-renders triggered by other actions in this same dialog (e.g. buying a new
// company), reset fresh every time the dialog is opened
const selectedForMerge = new Set<number>();

// a dialog for picking/creating the corporation shown on the map (see
// cityMap's drawCorporationNames) — just the "Corporation assets"/"Create new
// Company" action. The per-item bulk "Budget approvals" buying feature that
// used to live here has been removed
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

// wires the menu's open/close controls and the "Create new Corporation"/"Merge"
// items; getCorporationPrice renders the live cost (re-read on open and after
// every purchase, since it scales up each time); onCreateNewCorporation and
// onMergeCompanies both fire on click only — the caller (main.ts) is the one
// that checks affordability/spends the cost/does the actual merge + company
// switch, same pattern buyBuilding uses
export function wireCorporationUpgradeMenu(
  container: HTMLElement,
  getCorporationPrice: () => BigNumber,
  onCreateNewCorporation: () => void,
  onMergeCompanies: (companyIndices: number[]) => void,
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

  // one checkbox row per still-active (not yet merged) company, including the
  // currently active one — main.ts's onMergeCompanies handles switching away
  // from/into whichever company survives, so any combination is selectable
  // here. company.ts's getActiveCorporationIndices is the single source of
  // truth for this list, shared with corpBarrel/corporationBoostMenu
  function mergeSectionMarkup(): string {
    const activeCompanyIndex = getActiveCompanyIndex();
    const rows = getActiveCorporationIndices()
      .map((i) => {
        const isActive = i === activeCompanyIndex;
        const checked = selectedForMerge.has(i);
        return `
          <label class="worker-menu__item">
            <span class="worker-menu__item-label">
              <span class="worker-menu__item-name">${getCorporationName(i)}${isActive ? " (current)" : ""}</span>
            </span>
            <input
              type="checkbox"
              class="worker-menu__checkbox"
              data-merge-company-index="${i}"
              ${checked ? "checked" : ""}
            />
          </label>
        `;
      })
      .join("");
    return `
      <h3 class="worker-menu__subheader">Merge companies</h3>
      ${rows}
      <button
        class="worker-menu__item"
        id="merge-companies"
        ${selectedForMerge.size >= 2 ? "" : "disabled"}
      >
        <span class="worker-menu__item-label">
          <img src="${coinIconUrl}" class="worker-menu__icon" alt="" />
          Merge
        </span>
        <span class="worker-menu__price">x${selectedForMerge.size} selected</span>
      </button>
    `;
  }

  function render(): void {
    const allCompaniesTotalIncome = getAllCompaniesTotalIncome();
    const corporationPrice = getCorporationPrice();
    const corporationAffordable = gte(
      allCompaniesTotalIncome,
      corporationPrice,
    );
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
      ${mergeSectionMarkup()}
    `;
  }

  // only the Merge button's own disabled state/selected count depends on which
  // checkboxes are ticked — patched in place instead of a full render() (which
  // would rebuild every checkbox from scratch and reset the list's scroll)
  function updateMergeButton(): void {
    const mergeButton =
      list.querySelector<HTMLButtonElement>("#merge-companies");
    if (!mergeButton) return;
    mergeButton.disabled = selectedForMerge.size < 2;
    const priceEl = mergeButton.querySelector(".worker-menu__price");
    if (priceEl) priceEl.textContent = `x${selectedForMerge.size} selected`;
  }

  list.addEventListener("change", (event) => {
    const target = event.target as HTMLElement;
    const checkbox = target.closest<HTMLInputElement>(
      "input[data-merge-company-index]",
    );
    if (!checkbox) return;
    const index = Number(checkbox.dataset.mergeCompanyIndex);
    if (checkbox.checked) selectedForMerge.add(index);
    else selectedForMerge.delete(index);
    updateMergeButton();
  });

  list.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const mergeButton = target.closest<HTMLButtonElement>("#merge-companies");
    if (mergeButton) {
      if (mergeButton.disabled) return;
      onMergeCompanies(Array.from(selectedForMerge));
      selectedForMerge.clear();
      return;
    }
    const button = target.closest<HTMLButtonElement>("#create-new-corporation");
    if (!button || button.disabled) return;
    onCreateNewCorporation();
    playSold();
    render();
  });

  // re-checks affordability on its own while the menu sits open, same as every
  // other worker-menu (boostMenu/upgradeMenu/corporationBoostMenu/mapMenu), so
  // a grayed-out item turns clickable again as soon as income catches up
  // instead of only refreshing on the next open/purchase
  function updateAffordability(): void {
    const createButton = list.querySelector<HTMLButtonElement>(
      "#create-new-corporation",
    );
    if (createButton) {
      createButton.disabled = lt(
        getAllCompaniesTotalIncome(),
        getCorporationPrice(),
      );
    }
  }

  let refreshInterval: ReturnType<typeof setInterval> | null = null;

  function open(): void {
    selectedForMerge.clear();
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
