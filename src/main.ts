import "./style.css";
import {
  loadFloorBackgrounds,
  loadWorkerSprites,
  startIncomeTicker,
  ensureLockedFloorAbove,
} from "./floors";
import {
  startTotalIncomeTicker,
  addTotalIncome,
  spendTotalIncome,
} from "./totalIncome";
import {
  saveBuildings,
  schedulePersist,
  loadBuildings,
  computeIdleIncome,
  markAppClosed,
  type Floor,
} from "./gameState";
import {
  createTestButtonMarkup,
  wireTestButton,
  wireResetButton,
  createActionBarMarkup,
  wireActionBar,
  createUpgradeMenuMarkup,
  wireUpgradeMenu,
  createBoostMenuMarkup,
  wireBoostMenu,
  createPopupMarkup,
  showIdlePopup,
} from "./hud";
import { createGameCanvas } from "./background";
import {
  createBuilding,
  getBuildingMultiplier,
  getBuildingPrice,
} from "./buildings";

async function main() {
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) throw new Error("#app not found");

  app.innerHTML = `
    <div class="game">
      <div class="game__building-label" id="building-label"></div>
      <canvas class="game__canvas" id="game-canvas"></canvas>
      ${createTestButtonMarkup()}
    </div>
    ${createActionBarMarkup()}
    ${createUpgradeMenuMarkup()}
    ${createBoostMenuMarkup()}
    ${createPopupMarkup()}
  `;

  const buildingLabelEl = app.querySelector<HTMLDivElement>("#building-label")!;
  const canvas = app.querySelector<HTMLCanvasElement>("#game-canvas")!;

  const backgrounds = await loadFloorBackgrounds();
  await loadWorkerSprites();

  // one Floor[] per building, laid out side by side in gameCanvas.ts's single camera
  const buildings: Floor[][] = [];

  function persist() {
    // debounced/idle-scheduled so a click mid-scroll doesn't synchronously serialize
    // every building's floors + hit localStorage on the same frame (see gameState.ts)
    schedulePersist(buildings);
  }

  function setActiveBuilding(index: number): void {
    buildingLabelEl.textContent = `Skyscraper ${index + 1}`;
  }

  const gameCanvas = createGameCanvas({
    canvas,
    backgrounds,
    buildings,
    getBuildingMultiplier,
    persist,
    onActiveBuildingChange: setActiveBuilding,
  });

  // registers a building's floors with gameCanvas.ts (existing ones if restored,
  // otherwise just the fresh ground floor already in buildings[buildingIndex]), then
  // ensures its next locked floor is waiting above it
  function setupBuilding(buildingIndex: number): void {
    gameCanvas.addBuilding();
    ensureLockedFloorAbove({
      floors: buildings[buildingIndex],
      backgroundCount: backgrounds.length,
      multiplier: getBuildingMultiplier(buildingIndex),
      onAdd: (floor) => gameCanvas.notifyFloorAdded(buildingIndex, floor),
    });
  }

  // buys the next building outright if affordable (see buildings.ts's
  // getBuildingPrice, which scales 1000x per building same as its economy); returns
  // whether it succeeded so the upgrade menu can decide whether to re-render
  function buyBuilding(): boolean {
    const buildingIndex = buildings.length;
    if (!spendTotalIncome(getBuildingPrice(buildingIndex))) return false;
    const floors = createBuilding(buildingIndex, backgrounds.length);
    buildings.push(floors);
    setupBuilding(buildingIndex);
    persist();
    return true;
  }

  wireTestButton(app, () => {
    // absurdly large: comfortably covers buying several buildings in one go
    addTotalIncome(1e30);
  });
  wireResetButton(app, buildings);
  const upgradeMenu = wireUpgradeMenu(
    app,
    () => buildings[gameCanvas.getActiveBuildingIndex()] ?? [],
    () => buildings.length,
    buyBuilding,
    () => persist(),
  );
  const boostMenu = wireBoostMenu(
    app,
    () => buildings[gameCanvas.getActiveBuildingIndex()] ?? [],
    () => persist(),
  );
  wireActionBar(app, {
    onScrollTop: () => gameCanvas.scrollActiveToTop(),
    onScrollBottom: () => gameCanvas.scrollActiveToBottom(),
    onBoostAll: () => {
      boostMenu.open();
    },
    onOpenUpgradeMenu: () => {
      upgradeMenu.open();
    },
  });

  const restoredBuildings = loadBuildings();
  if (restoredBuildings.length > 0) {
    restoredBuildings.forEach((floors, i) => {
      buildings.push(floors);
      setupBuilding(i);
    });
  } else {
    const floors = createBuilding(0, backgrounds.length);
    buildings.push(floors);
    setupBuilding(0);
  }
  persist();
  setActiveBuilding(0);

  const idleIncome = computeIdleIncome(buildings);
  // saveBuildings directly (not the debounced persist()): computeIdleIncome advances
  // every floor's lastCollectedAt in memory, and that must land before a second quick
  // reload could otherwise re-collect the same already-paid-out idle time
  saveBuildings(buildings);
  if (idleIncome > 0) {
    showIdlePopup(app, idleIncome, () => addTotalIncome(idleIncome));
  }

  gameCanvas.redraw();

  // one continuous redraw loop drives every animation (workers, clouds, income bars,
  // coin bursts) — gameCanvas.ts itself only ever draws whichever buildings/floors are
  // actually scrolled into view, so this stays cheap no matter how many buildings exist
  startIncomeTicker(() => gameCanvas.redraw());
  startTotalIncomeTicker(buildings);

  // markAppClosed stamps "now" as the single source of truth computeIdleIncome reads
  // next load — saveBuildings also runs here so the freshest floor state (workerCount,
  // upgrades, etc.) is what actually gets restored
  window.addEventListener("beforeunload", () => {
    markAppClosed();
    saveBuildings(buildings);
  });
}

main();
