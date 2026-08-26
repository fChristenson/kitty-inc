import "./style.css";
import {
  loadFloorBackgrounds,
  startIncomeTicker,
  ensureLockedFloorAbove,
} from "./floors";
import { startTotalIncomeTicker, addTotalIncome } from "./totalIncome";
import {
  saveBuildings,
  schedulePersist,
  loadBuildings,
  computeIdleIncome,
  type Floor,
} from "./gameState";
import {
  createTestButtonMarkup,
  wireTestButton,
  wireResetButton,
  createActionBarMarkup,
  wireActionBar,
  createWorkerMenuMarkup,
  wireWorkerMenu,
  createBoostMenuMarkup,
  wireBoostMenu,
  createBadgesMarkup,
  wireBadgesMenu,
  getBoughtBadgeCount,
  clearBadges,
  BADGE_COUNT,
  createPopupMarkup,
  showIdlePopup,
} from "./hud";
import { createGameCanvas } from "./background";
import { createBuilding, getBuildingMultiplier } from "./buildings";

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
    ${createWorkerMenuMarkup()}
    ${createBoostMenuMarkup()}
    ${createBadgesMarkup()}
    ${createPopupMarkup()}
  `;

  const buildingLabelEl = app.querySelector<HTMLDivElement>("#building-label")!;
  const canvas = app.querySelector<HTMLCanvasElement>("#game-canvas")!;

  const backgrounds = await loadFloorBackgrounds();

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

  // buildings.ts: once every badge is bought, a new building spawns with a locked
  // ground floor at a 1000x-richer economy than the previous one, and the badge set
  // resets so it's a fresh (equally meaningful) goal again toward the *next* building —
  // checked both right after startup (in case badges were already maxed from a
  // previous session) and after every badge purchase
  function spawnBuildingIfNeeded(): void {
    if (getBoughtBadgeCount() < BADGE_COUNT) return;
    const buildingIndex = buildings.length;
    const floors = createBuilding(buildingIndex, backgrounds.length);
    buildings.push(floors);
    setupBuilding(buildingIndex);
    clearBadges();
    persist();
  }

  wireTestButton(app, () => {
    // absurdly large: comfortably covers buying every badge in one go (the priciest,
    // 20th, alone costs ~$1e25) plus the second building's 1000x-richer economy
    addTotalIncome(1e30);
  });
  wireResetButton(app, buildings);
  const workerMenu = wireWorkerMenu(
    app,
    () => buildings[gameCanvas.getActiveBuildingIndex()] ?? [],
    () => persist(),
  );
  const boostMenu = wireBoostMenu(
    app,
    () => buildings[gameCanvas.getActiveBuildingIndex()] ?? [],
    () => persist(),
  );
  // badges have no gameplay effect of their own beyond potentially spawning a building
  // (and persist themselves via their own localStorage key otherwise), so this is the
  // only reaction needed to a purchase
  const badgesMenu = wireBadgesMenu(app, spawnBuildingIfNeeded);
  wireActionBar(app, {
    onScrollTop: () => gameCanvas.scrollActiveToTop(),
    onScrollBottom: () => gameCanvas.scrollActiveToBottom(),
    onBoostAll: () => {
      boostMenu.open();
    },
    onOpenHireMenu: () => {
      workerMenu.open();
    },
    onOpenBadges: () => {
      badgesMenu.open();
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
  spawnBuildingIfNeeded();
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

  // collectDueIncome keeps each floor's lastCollectedAt caught up to "now" as it pays out
  // live (in every building, not just the active one), but that only updates the
  // in-memory buildings[] — without this, passive play (no worker/upgrade/hire clicks to
  // trigger persist()) would never save it, so a refresh would see a stale
  // lastCollectedAt and re-pay the whole live session as "idle" income. uses
  // saveBuildings directly (not the debounced persist()) since a pending idle callback
  // isn't guaranteed to fire before the page actually unloads
  window.addEventListener("beforeunload", () => saveBuildings(buildings));
}

main();
