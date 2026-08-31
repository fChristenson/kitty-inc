import {
  animateDialogClose,
  formatPrice,
  formatTotalIncome,
} from "../../utils";
import { getAllCompaniesTotalIncome } from "../../totalIncome";
import { playSwoosh } from "../../sound";
import coinIconUrl from "../../assets/coin.png";

// same worker-menu look as boostMenu/upgradeMenu — a dialog for picking/creating
// the corporation shown on the map (see cityMap's drawCorporationNames). Right
// now that's just the one "Create new Corporation" placeholder item
export function createCompanySelectMenuMarkup(): string {
  return `
    <div class="worker-menu" id="company-select-menu" hidden>
      <div class="worker-menu__backdrop" id="company-select-menu-backdrop"></div>
      <div class="worker-menu__panel">
        <div class="worker-menu__header">
          <h2>Corporation Upgrades</h2>
        </div>
        <div class="worker-menu__list">
          <h3 class="worker-menu__subheader">Corporation assets</h3>
          <span class="worker-menu__total-income" id="company-select-menu-total-income"></span>
          <button class="worker-menu__item" id="create-new-corporation">
            <span class="worker-menu__item-label">
              <img src="${coinIconUrl}" class="worker-menu__icon" alt="" />
              Create new Company
            </span>
            <span class="worker-menu__price" id="create-new-corporation-price"></span>
          </button>
        </div>
      </div>
    </div>
  `;
}

export interface CompanySelectMenu {
  open: () => void;
  close: () => void;
}

// wires the menu's open/close controls and the "Create new Corporation" item;
// getCorporationPrice renders the live cost (re-read on open and after every
// purchase, since it scales up each time); onCreateNewCorporation fires on click
// only — the caller (main.ts) is the one that checks affordability/spends the
// cost before actually creating the corporation, same pattern buyBuilding uses
export function wireCompanySelectMenu(
  container: HTMLElement,
  getCorporationPrice: () => number,
  onCreateNewCorporation: () => void,
): CompanySelectMenu {
  const menu = container.querySelector<HTMLDivElement>("#company-select-menu")!;
  const backdrop = container.querySelector<HTMLDivElement>(
    "#company-select-menu-backdrop",
  )!;
  const panel = menu.querySelector<HTMLDivElement>(".worker-menu__panel")!;
  const createButton = container.querySelector<HTMLButtonElement>(
    "#create-new-corporation",
  )!;
  const priceLabel = container.querySelector<HTMLSpanElement>(
    "#create-new-corporation-price",
  )!;
  const totalIncomeLabel = container.querySelector<HTMLSpanElement>(
    "#company-select-menu-total-income",
  )!;

  function render(): void {
    priceLabel.textContent = formatPrice(getCorporationPrice());
    totalIncomeLabel.textContent = formatTotalIncome(
      getAllCompaniesTotalIncome(),
    );
  }

  createButton.addEventListener("click", () => {
    onCreateNewCorporation();
    render();
  });

  function open(): void {
    render();
    menu.hidden = false;
    playSwoosh();
  }

  async function close(): Promise<void> {
    playSwoosh();
    await animateDialogClose(panel);
    menu.hidden = true;
  }

  backdrop.addEventListener("click", close);

  return { open, close };
}
