import { animateDialogClose } from "../../utils";
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
          <button class="worker-menu__item" id="create-new-corporation">
            <span class="worker-menu__item-label">
              <img src="${coinIconUrl}" class="worker-menu__icon" alt="" />
              Create new Company
            </span>
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
// onCreateNewCorporation fires on click, same pattern every other worker-menu
// item purchase uses (see upgradeMenu/boostMenu), just with no cost of its own yet
export function wireCompanySelectMenu(
  container: HTMLElement,
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

  createButton.addEventListener("click", () => {
    onCreateNewCorporation();
  });

  function open(): void {
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
