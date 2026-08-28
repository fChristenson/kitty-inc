import { getTotalIncome, clearTotalIncome } from "../../totalIncome";
import { clearBuildings, type Floor } from "../../gameState";
import { clearCityNames } from "../../cityName";
import { formatPrice, animateDialogClose } from "../../utils";
import { getBuildingPrice } from "../../buildings";
import { playSwoosh, playSold } from "../../sound";

// reuses .worker-menu's styling — same generic "dialog with a list of buyable items"
// shape as boostMenu/upgradeMenu. Lists a button per building already owned (how you
// navigate between streets, since only one building is ever on screen at a time —
// see gameCanvas.ts's setActiveFloors) plus the "buy a new building" item at the end
export function createMapMenuMarkup(): string {
  return `
    <div class="worker-menu" id="map-menu" hidden>
      <div class="worker-menu__backdrop" id="map-menu-backdrop"></div>
      <div class="worker-menu__panel">
        <div class="worker-menu__header">
          <h2>Map</h2>
        </div>
        <div class="worker-menu__list" id="map-menu-list"></div>
      </div>
    </div>
  `;
}

export interface MapMenu {
  open: () => void;
  close: () => void;
}

// wires the menu's open/close controls, one button per owned building, and the
// "buy a new building" item. getBuildingCount/getActiveBuildingIndex are called
// fresh each render so the list always reflects live state. onSelectBuilding fires
// whenever the user picks an existing building's button, or right after a
// successful purchase (with the new building's index) — either way main.ts uses it
// to cut straight to that building's street (no travel animation yet)
export function wireMapMenu(
  container: HTMLElement,
  getBuildingCount: () => number,
  getActiveBuildingIndex: () => number,
  buyBuilding: () => boolean,
  onSelectBuilding: (index: number) => void,
  buildings: Floor[][],
): MapMenu {
  const menu = container.querySelector<HTMLDivElement>("#map-menu")!;
  const backdrop =
    container.querySelector<HTMLDivElement>("#map-menu-backdrop")!;
  const panel = menu.querySelector<HTMLDivElement>(".worker-menu__panel")!;
  const list = container.querySelector<HTMLDivElement>("#map-menu-list")!;

  function render(): void {
    const count = getBuildingCount();
    const activeIndex = getActiveBuildingIndex();
    const buildingButtons = Array.from({ length: count }, (_, i) => {
      const current = i === activeIndex;
      return `
        <button
          class="worker-menu__item"
          data-building-index="${i}"
          ${current ? "disabled" : ""}
        >
          <span>Building ${i + 1}${current ? " (here)" : ""}</span>
        </button>
      `;
    }).join("");

    const price = getBuildingPrice(count);
    const affordable = getTotalIncome() >= price;
    const buyItem = `
      <button
        class="worker-menu__item"
        id="map-menu-buy-building"
        ${affordable ? "" : "disabled"}
      >
        <span>Unlock a new building</span>
        <span class="worker-menu__price">${formatPrice(price)}</span>
      </button>
    `;
    const resetItem = `
      <button class="worker-menu__item worker-menu__item--danger" id="map-menu-reset-game">
        <span>Reset Game</span>
      </button>
    `;
    list.innerHTML = buildingButtons + buyItem + resetItem;
  }

  list.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    if (target.closest("#map-menu-reset-game")) {
      if (!confirm("Reset all progress? This can't be undone.")) return;
      // also truncate the in-memory array: main.ts's beforeunload handler persists
      // buildings on the way out, and without this it would just re-save the stale
      // data right after clearBuildings() removes it, undoing the reset before the
      // reload even happens
      buildings.length = 0;
      clearBuildings();
      clearTotalIncome();
      clearCityNames();
      location.reload();
      return;
    }
    if (target.closest("#map-menu-buy-building")) {
      const newBuildingIndex = getBuildingCount();
      if (buyBuilding()) {
        playSold();
        onSelectBuilding(newBuildingIndex);
        close();
      }
      return;
    }
    const button = target.closest<HTMLButtonElement>(
      "button[data-building-index]",
    );
    if (!button) return;
    onSelectBuilding(Number(button.dataset.buildingIndex));
    close();
  });

  // re-checks affordability while the menu sits open so a grayed-out "too expensive"
  // button turns clickable again as soon as income catches up, instead of only
  // refreshing on the next open/purchase
  function updateAffordability(): void {
    const button = list.querySelector<HTMLButtonElement>(
      "#map-menu-buy-building",
    );
    if (button) {
      button.disabled = getTotalIncome() < getBuildingPrice(getBuildingCount());
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
