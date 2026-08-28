import "./style.css";
import {
  loadFloorBackgrounds,
  loadGroundImage,
  loadWorkerSprite,
  loadCoinImage,
  loadFloatingCoinImage,
  startIncomeTicker,
  ensureLockedFloorAbove,
  forceCritUpgrade,
} from "./floors";
import {
  startTotalIncomeTicker,
  addTotalIncome,
  spendTotalIncome,
  getTotalIncome,
} from "./totalIncome";
import {
  saveBuildings,
  schedulePersist,
  loadBuildings,
  computeIdleIncome,
  markAppClosed,
  initSessionGuard,
  isStorageIntact,
  type Floor,
} from "./gameState";
import {
  createTestButtonMarkup,
  wireTestButton,
  wireSpawnMouseButton,
  wireSpawnCritButton,
  wireIdlePopupTestButton,
  wireResetButton,
  createActionBarMarkup,
  wireActionBar,
  createUpgradeMenuMarkup,
  wireUpgradeMenu,
  createBoostMenuMarkup,
  wireBoostMenu,
  createMapMenuMarkup,
  wireMapMenu,
  createPopupMarkup,
  showIdlePopup,
} from "./hud";
import {
  createGameCanvas,
  loadCityImage,
  loadCloudImages,
  loadCityMapImage,
  createCityMapView,
} from "./background";
import {
  createBuilding,
  getBuildingMultiplier,
  getBuildingPrice,
  loadWallMaterial,
  loadRoofImage,
} from "./buildings";
import { loadMouseImage, forceSpawnMouse } from "./mouse";
import { startBackgroundMusic, playSwoosh } from "./sound";

async function main() {
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) throw new Error("#app not found");
  initSessionGuard();
  startBackgroundMusic();

  app.innerHTML = `
    <div class="game">
      <canvas class="game__canvas" id="game-canvas"></canvas>
      <canvas class="game__canvas" id="map-canvas" hidden></canvas>
      ${createActionBarMarkup()}
      ${import.meta.env.MODE !== "production" ? createTestButtonMarkup() : ""}
    </div>
    ${createUpgradeMenuMarkup()}
    ${createBoostMenuMarkup()}
    ${createMapMenuMarkup()}
    ${createPopupMarkup()}
  `;

  const canvas = app.querySelector<HTMLCanvasElement>("#game-canvas")!;
  const mapCanvas = app.querySelector<HTMLCanvasElement>("#map-canvas")!;

  // canvas text doesn't re-render on its own once a web font finishes loading (unlike
  // DOM text), so every weight the canvas draws with must be loaded before the first
  // redraw below, or the very first frame silently falls back to system-ui
  await Promise.all([
    document.fonts.load('700 16px "Fredoka"'),
    document.fonts.load('900 16px "Fredoka"'),
  ]);

  const backgrounds = await loadFloorBackgrounds();
  await loadGroundImage();
  await loadWorkerSprite();
  await loadCityImage();
  await loadCloudImages();
  await loadWallMaterial();
  await loadRoofImage();
  await loadMouseImage();
  await loadCoinImage();
  await loadFloatingCoinImage();
  await loadCityMapImage();

  // one Floor[] per building; only one building is ever shown on screen at a time
  // (see gameCanvas.ts's setActiveFloors) — switching which one is active/visible
  // happens entirely through the map menu below, not by scrolling/swiping
  const buildings: Floor[][] = [];
  let activeBuildingIndex = 0;

  function persist() {
    // debounced/idle-scheduled so a click mid-scroll doesn't synchronously serialize
    // every building's floors + hit localStorage on the same frame (see gameState.ts)
    schedulePersist(buildings);
  }

  const restoredBuildings = loadBuildings();
  if (restoredBuildings.length > 0) {
    buildings.push(...restoredBuildings);
  } else {
    buildings.push(createBuilding(0, backgrounds.length));
  }

  const gameCanvas = createGameCanvas({
    canvas,
    backgrounds,
    floors: buildings[activeBuildingIndex],
    getBuildingMultiplier: () => getBuildingMultiplier(activeBuildingIndex),
    persist,
  });

  // ensures a building's next locked floor is waiting above it; onAdd only forwards
  // to gameCanvas.ts when this is the currently-active/on-screen building — an
  // inactive building's newly-added floor gets picked up automatically the next
  // time the player switches to it (setActiveFloors registers every floor fresh)
  function setupBuilding(buildingIndex: number): void {
    ensureLockedFloorAbove({
      floors: buildings[buildingIndex],
      backgroundCount: backgrounds.length,
      multiplier: getBuildingMultiplier(buildingIndex),
      onAdd: (floor) => {
        if (buildingIndex === activeBuildingIndex) {
          gameCanvas.notifyFloorAdded(floor);
        }
      },
    });
  }

  // switches which building is currently displayed — no travel animation yet, just
  // an instant cut to the new street
  function goToBuilding(buildingIndex: number): void {
    activeBuildingIndex = buildingIndex;
    gameCanvas.setActiveFloors(buildings[buildingIndex]);
  }

  // dev/test-only controls; markup is stripped entirely in production builds
  if (import.meta.env.MODE !== "production") {
    wireTestButton(app, () => {
      // absurdly large: comfortably covers buying several buildings in one go
      addTotalIncome(1e30);
    });
    wireSpawnMouseButton(app, () => {
      forceSpawnMouse(buildings[activeBuildingIndex] ?? []);
    });
    wireSpawnCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceCritUpgrade(floor);
    });
    wireIdlePopupTestButton(app, () => {
      const testAmount = 12345;
      showIdlePopup(app, testAmount, () => addTotalIncome(testAmount));
    });
    wireResetButton(app, buildings);
  }
  const upgradeMenu = wireUpgradeMenu(
    app,
    () => buildings[activeBuildingIndex] ?? [],
    () => persist(),
  );
  const boostMenu = wireBoostMenu(
    app,
    () => buildings[activeBuildingIndex] ?? [],
    () => persist(),
    (floor) => gameCanvas.scrollActiveToFloor(floor),
  );
  // buys the next building outright if affordable (see buildings.ts's
  // getBuildingPrice, which scales 1000x per building same as its economy); returns
  // whether it succeeded so the map menu can decide whether to re-render
  function buyBuilding(): boolean {
    const buildingIndex = buildings.length;
    if (!spendTotalIncome(getBuildingPrice(buildingIndex))) return false;
    buildings.push(createBuilding(buildingIndex, backgrounds.length));
    setupBuilding(buildingIndex);
    persist();
    return true;
  }
  // the old building-picker popup is kept wired (backdrop/list still functional)
  // but nothing opens it anymore — it's replaced by tapping the map's own cat
  // markers (see createCityMapView below)
  wireMapMenu(
    app,
    () => buildings.length,
    () => activeBuildingIndex,
    buyBuilding,
    goToBuilding,
    buildings,
  );
  // toggles between the building canvas and the static city map canvas
  let mapOpen = false;
  function closeMapView(): void {
    mapOpen = false;
    canvas.hidden = false;
    mapCanvas.hidden = true;
    playSwoosh();
    // both hidden canvases' ResizeObserver callbacks fire async, too late to save
    // the very next redraw()/tick from dividing by a stale zero size
    gameCanvas.resize();
    gameCanvas.redraw();
  }
  function openMapView(): void {
    mapOpen = true;
    canvas.hidden = true;
    mapCanvas.hidden = false;
    playSwoosh();
    cityMapView.refresh();
  }
  const cityMapView = createCityMapView(mapCanvas, {
    getTotalIncome,
    getBuildingCount: () => buildings.length,
    getActiveBuildingIndex: () => activeBuildingIndex,
    buyBuilding,
    onSelectBuilding: (index) => {
      goToBuilding(index);
      closeMapView();
    },
  });
  wireActionBar(app, {
    onScrollTop: () => {
      playSwoosh();
      gameCanvas.scrollActiveToTop();
    },
    onScrollBottom: () => {
      playSwoosh();
      gameCanvas.scrollActiveToBottom();
    },
    onBoostAll: () => {
      boostMenu.open();
    },
    onOpenUpgradeMenu: () => {
      upgradeMenu.open();
    },
    onOpenMapMenu: () => {
      if (mapOpen) closeMapView();
      else openMapView();
    },
  });

  buildings.forEach((_, i) => setupBuilding(i));
  persist();

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
  // actually scrolled into view, so this stays cheap no matter how many buildings exist.
  // Skipped while the map view is open: the building canvas is hidden (0x0) then, and
  // its own redraw() math (division by its own now-zero CSS size) would throw
  startIncomeTicker(() => {
    if (!mapOpen) gameCanvas.redraw();
  });
  startTotalIncomeTicker(buildings);

  // markAppClosed stamps "now" as the single source of truth computeIdleIncome reads
  // next load — saveBuildings also runs here so the freshest floor state (workerCount,
  // upgrades, etc.) is what actually gets restored. Skipped entirely if storage was
  // cleared out from under this page load (see isStorageIntact) — otherwise this would
  // just silently undo a player manually clearing their save via DevTools before
  // closing the tab
  window.addEventListener("beforeunload", () => {
    if (!isStorageIntact()) return;
    markAppClosed();
    saveBuildings(buildings);
  });
}

main();
