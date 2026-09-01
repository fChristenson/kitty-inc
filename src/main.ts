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
  switchActiveCompany,
  spendFromAllCompanies,
  addTotalIncome,
  spendTotalIncome,
  getTotalIncome,
  getBuildingsCurrentIncomePerSecond,
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
  getActiveCompanyIndex,
  setActiveCompanyIndex,
  companyStorageKey,
  saveCompanyRecord,
} from "./company";
import {
  createTestButtonMarkup,
  wireTestButton,
  wireSpawnMouseButton,
  wireSpawnCritButton,
  wireIdlePopupTestButton,
  wirePressConferenceTestButton,
  wireResetButton,
  createActionBarMarkup,
  wireActionBar,
  createUpgradeMenuMarkup,
  wireUpgradeMenu,
  createCompanySelectMenuMarkup,
  wireCompanySelectMenu,
  createBoostMenuMarkup,
  wireBoostMenu,
  createCorporationBoostMenuMarkup,
  wireCorporationBoostMenu,
  getGlobalIncomeBoostMultiplier,
  getCompanyAssetValue,
  grantFreePressConference,
  createPressConferenceGameMarkup,
  wirePressConferenceGame,
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
  createCityMapMarkup,
} from "./background";
import {
  createBuilding,
  getBuildingMultiplier,
  getBuildingPrice,
  loadWallMaterial,
  loadRoofImage,
} from "./buildings";
import { loadMouseImage, forceSpawnMouse } from "./mouse";
import { startBackgroundMusic, preloadSounds, playSwoosh } from "./sound";
import { createNewCorporation, getCorporationPrice } from "./corporationName";
import { observeActionBarHeight } from "./utils";

// matches style.css's worker-menu-slide-out-* keyframes (0.352s) — the company
// select menu's own close animation duration
const DIALOG_CLOSE_MS = 352;
// how far ahead of the dialog fully disappearing the map's own switch-company
// animation should kick in, so the two transitions blend together instead of
// the switch happening while the dialog hasn't even started moving yet
const SWITCH_LEAD_MS = 100;

async function main() {
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) throw new Error("#app not found");
  initSessionGuard();
  startBackgroundMusic();
  preloadSounds();

  app.innerHTML = `
    <div class="game">
      <canvas class="game__canvas" id="game-canvas"></canvas>
      ${createCityMapMarkup()}
      ${createActionBarMarkup()}
      ${import.meta.env.MODE !== "production" ? createTestButtonMarkup() : ""}
    </div>
    ${createUpgradeMenuMarkup()}
    ${createCompanySelectMenuMarkup()}
    ${createBoostMenuMarkup()}
    ${createCorporationBoostMenuMarkup()}
    ${createPressConferenceGameMarkup()}
    ${createMapMenuMarkup()}
    ${createPopupMarkup()}
  `;

  const canvas = app.querySelector<HTMLCanvasElement>("#game-canvas")!;
  const cityMapEl = app.querySelector<HTMLDivElement>("#city-map")!;
  observeActionBarHeight(app.querySelector<HTMLDivElement>("#action-bar")!);

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
  // happens entirely through the map menu below, not by scrolling/swiping.
  // Belongs entirely to whichever corporation is currently active (see
  // company.ts) — switching companies below empties this array and refills it
  // with that other company's own buildings, never mixing the two
  const buildings: Floor[][] = [];
  let activeBuildingIndex = 0;
  let activeCompanyIndex = getActiveCompanyIndex();

  // so a reload lands back on whichever building the player last selected on the
  // map, namespaced per company (see company.ts's companyStorageKey) since each
  // company remembers its own last-active building independently
  const ACTIVE_BUILDING_KEY = "cash-clicker:active-building-index";

  function loadActiveBuildingIndex(companyIndex: number): number {
    try {
      const parsed = Number(
        localStorage.getItem(
          companyStorageKey(ACTIVE_BUILDING_KEY, companyIndex),
        ),
      );
      return Number.isFinite(parsed) ? parsed : 0;
    } catch {
      return 0;
    }
  }

  function saveActiveBuildingIndex(companyIndex: number, index: number): void {
    try {
      localStorage.setItem(
        companyStorageKey(ACTIVE_BUILDING_KEY, companyIndex),
        String(index),
      );
    } catch {
      // storage unavailable: nothing to persist
    }
  }

  function persist() {
    // debounced/idle-scheduled so a click mid-scroll doesn't synchronously serialize
    // every building's floors + hit localStorage on the same frame (see gameState.ts)
    schedulePersist(buildings, activeCompanyIndex);
  }

  // loads a company's saved buildings, or starts it off with a single fresh
  // building if it's never been played before (a brand new corporation, or the
  // very first run)
  function loadOrCreateBuildings(companyIndex: number): Floor[][] {
    const restored = loadBuildings(companyIndex);
    return restored.length > 0
      ? restored
      : [createBuilding(0, backgrounds.length)];
  }

  buildings.push(...loadOrCreateBuildings(activeCompanyIndex));
  activeBuildingIndex = Math.min(
    Math.max(loadActiveBuildingIndex(activeCompanyIndex), 0),
    buildings.length - 1,
  );

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
    saveActiveBuildingIndex(activeCompanyIndex, buildingIndex);
    gameCanvas.setActiveFloors(buildings[buildingIndex]);
  }

  // switches which corporation is active (see company.ts, cityMap's barrel-roll
  // picker): saves the outgoing company's own buildings/active-building under its
  // own key, then empties+refills the same buildings array reference (every
  // closure above captured this array once, not its contents) with the new
  // company's own separate buildings, its own last-active building, and hands
  // totalIncome.ts its own separate running total — nothing here is shared
  // between companies
  function switchToCompany(companyIndex: number): void {
    // snapshot the OUTGOING company's ENTIRE CompanyRecord (see company.ts) in
    // one atomic write, while `buildings`/`activeCompanyIndex`/`totalIncome`
    // still hold its data — bankedTotal, its rate, and the timestamp all land
    // together, so a dormant company's derived total can never desync from a
    // separately-written "just the total" value (there isn't one anymore)
    saveCompanyRecord(activeCompanyIndex, {
      bankedTotal: getTotalIncome(),
      incomeRatePerSecond: getBuildingsCurrentIncomePerSecond(
        buildings,
        Date.now(),
      ),
      assetValue: getCompanyAssetValue(buildings),
      updatedAt: Date.now(),
    });
    saveBuildings(buildings, activeCompanyIndex);
    saveActiveBuildingIndex(activeCompanyIndex, activeBuildingIndex);

    activeCompanyIndex = companyIndex;
    setActiveCompanyIndex(companyIndex);
    buildings.length = 0;
    buildings.push(...loadOrCreateBuildings(companyIndex));
    activeBuildingIndex = Math.min(
      Math.max(loadActiveBuildingIndex(companyIndex), 0),
      buildings.length - 1,
    );
    buildings.forEach((_, i) => setupBuilding(i));

    switchActiveCompany(companyIndex, buildings);
    gameCanvas.setActiveFloors(buildings[activeBuildingIndex]);
  }

  // dev/test-only controls; markup is stripped entirely in production builds
  if (import.meta.env.MODE !== "production") {
    wireTestButton(app, () => {
      // absurdly large: comfortably covers buying dozens of buildings in one go,
      // many cities deep (see cityName/cityMap's continuously-compounding
      // BUILDING_COST_MULTIPLIER pricing) — formatCompactNumber's suffix (utils.ts)
      // is generated algorithmically, not from a fixed list, so it never runs out
      // of a name for however big this (or totalIncome) ever gets
      addTotalIncome(1e150);
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
    wirePressConferenceTestButton(app, () => pressConferenceGame.open());
    wireResetButton(app, buildings, () => activeCompanyIndex);
  }
  const upgradeMenu = wireUpgradeMenu(
    app,
    () => buildings[activeBuildingIndex] ?? [],
    () => persist(),
  );
  // "Create new Corporation" adds a fresh named corporation above the current
  // one in the map's corp-name barrel (see corporationName.ts/cityMap's
  // drawCorporationNames) — roll up with the action bar to reach it. Costs
  // getCorporationPrice(), same buy-if-affordable pattern as buyBuilding below.
  // Auto-switches to the new company, playing the exact same swoosh +
  // barrel-roll flourish a manual switch gets (see cityMapView's
  // animateSwitchToCompany) — its own completion is what actually calls
  // switchToCompany, same as a normal roll, so there's only ever one switch.
  // Delayed to start SWITCH_LEAD_MS before the dialog's own close animation
  // finishes, instead of firing immediately alongside it while the dialog
  // hasn't even started sliding away yet
  const companySelectMenu = wireCompanySelectMenu(
    app,
    getCorporationPrice,
    () => {
      if (!spendFromAllCompanies(getCorporationPrice())) return;
      const newIndex = createNewCorporation();
      grantFreePressConference();
      companySelectMenu.close();
      setTimeout(() => {
        playSwoosh();
        cityMapView.animateSwitchToCompany(newIndex);
      }, DIALOG_CLOSE_MS - SWITCH_LEAD_MS);
    },
  );
  const boostMenu = wireBoostMenu(
    app,
    () => buildings[activeBuildingIndex] ?? [],
    () => persist(),
    (floor) => gameCanvas.scrollActiveToFloor(floor),
  );
  const corporationBoostMenu = wireCorporationBoostMenu(app, () =>
    pressConferenceGame.open(),
  );
  const pressConferenceGame = wirePressConferenceGame(app, () =>
    corporationBoostMenu.refresh(),
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
    cityMapEl.hidden = true;
    playSwoosh();
    // both hidden canvases' ResizeObserver callbacks fire async, too late to save
    // the very next redraw()/tick from dividing by a stale zero size
    gameCanvas.resize();
    gameCanvas.redraw();
  }
  function openMapView(): void {
    mapOpen = true;
    canvas.hidden = true;
    cityMapEl.hidden = false;
    playSwoosh();
    cityMapView.refresh();
  }
  const cityMapView = createCityMapView(app, {
    getTotalIncome,
    getBuildingCount: () => buildings.length,
    getActiveBuildingIndex: () => activeBuildingIndex,
    buyBuilding,
    onSelectBuilding: (index) => {
      goToBuilding(index);
      closeMapView();
    },
    onSwitchCompany: switchToCompany,
  });
  wireActionBar(app, {
    onScrollTop: () => {
      playSwoosh();
      if (mapOpen) cityMapView.flashVerticalRays(-1);
      else gameCanvas.scrollActiveToTop();
    },
    onScrollBottom: () => {
      playSwoosh();
      if (mapOpen) cityMapView.flashVerticalRays(1);
      else gameCanvas.scrollActiveToBottom();
    },
    onBoostAll: () => {
      if (mapOpen) corporationBoostMenu.open();
      else boostMenu.open();
    },
    onOpenUpgradeMenu: () => {
      if (mapOpen) companySelectMenu.open();
      else upgradeMenu.open();
    },
    onOpenMapMenu: () => {
      if (mapOpen) closeMapView();
      else openMapView();
    },
  });

  buildings.forEach((_, i) => setupBuilding(i));
  persist();

  const idleIncome = computeIdleIncome(
    buildings,
    getGlobalIncomeBoostMultiplier(),
  );
  // saveBuildings directly (not the debounced persist()): computeIdleIncome advances
  // every floor's lastCollectedAt in memory, and that must land before a second quick
  // reload could otherwise re-collect the same already-paid-out idle time
  saveBuildings(buildings, activeCompanyIndex);
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
  startTotalIncomeTicker(buildings, getGlobalIncomeBoostMultiplier);

  // markAppClosed stamps "now" as the single source of truth computeIdleIncome reads
  // next load — saveBuildings also runs here so the freshest floor state (workerCount,
  // upgrades, etc.) is what actually gets restored. Skipped entirely if storage was
  // cleared out from under this page load (see isStorageIntact) — otherwise this would
  // just silently undo a player manually clearing their save via DevTools before
  // closing the tab
  window.addEventListener("beforeunload", () => {
    if (!isStorageIntact()) return;
    markAppClosed();
    saveBuildings(buildings, activeCompanyIndex);
  });
}

main();
