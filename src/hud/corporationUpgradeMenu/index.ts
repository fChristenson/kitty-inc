import {
  animateDialogClose,
  formatPrice,
  formatTotalIncomeFull,
} from "../../utils";
import { getAllCompaniesTotalIncome } from "../../totalIncome";
import { playSwoosh, playSold } from "../../sound";
import { getImageUrl } from "../../loadAssets";
import { type BigNumber, gte, lt } from "../../shared/bigNumber";

const coinIconUrl = getImageUrl("coin");

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

// wires the menu's open/close controls and the "Create new Corporation" item;
// getCorporationPrice renders the live cost (re-read on open and after every
// purchase, since it scales up each time); onCreateNewCorporation fires on
// click only — the caller (main.ts) is the one that checks affordability/
// spends the cost before actually creating the corporation, same pattern
// buyBuilding uses
export function wireCorporationUpgradeMenu(
  container: HTMLElement,
  getCorporationPrice: () => BigNumber,
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
    `;
  }

  list.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
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
