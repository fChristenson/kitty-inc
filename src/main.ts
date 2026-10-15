// first: every module's Date.now() reads the game clock
import "./shared/gameClock";
import "./style.css";
import {
  forceTestCrit,
  loadBadgeRewards,
  recordCritProcLanded,
  pickCritTierByOdds,
  getUniformCritTier,
  getCritTier,
  rollFloorBuyCrit,
  hasBadgeCapsule,
  takeBadgeCapsule,
  loadNextEventPart,
  queueEventParts,
  getCritBadgeOverlay,
  warmTierFlashes,
  createBuildingCrits,
} from "./crits";
import { loadSpawns } from "./spawn";
import {
  add,
  subtract,
  fromNumber,
  gt,
  gte,
  isZero,
  ZERO,
  type BigNumber,
} from "./shared/bigNumber";

import {
  loadFloorBackgrounds,
  loadGroundImage,
  loadWorkerSprite,
  loadCoinImage,
  loadFloatingCoinImage,
  startIncomeTicker,
  ensureLockedFloorAbove,
  getActiveBackgrounds,
  currentIncomeRatePerSecond,
  applyBoostAll,
  MAX_RENDERED_WORKERS,
  MAX_FLOORS_PER_BUILDING,
  FLOOR_W,
  FLOOR_H,
  performAutomatedUpgradeClick,
  performAutomatedUpgradeAfterPayment,
  performAutomatedFloorUnlock,
  getUpgradeCost,
  type FloorActionsDeps,
} from "./floors";
import {
  startTotalIncomeTicker,
  switchActiveCompany,
  rebalanceDormantCompanyEconomies,
  addTotalIncome,
  spendTotalIncome,
  getTotalIncome,
  getBuildingsCurrentIncomePerSecond,
  getDormantCompaniesIdleIncome,
  withDraftEconomy,
  addCompanyTotalIncome,
} from "./totalIncome";
import {
  saveBuildings,
  saveBuildingsImmediately,
  schedulePersist,
  loadBuildings,
  computeIdleIncome,
  getLastCloseTimestamp,
  IDLE_INCOME_MIN_SECONDS,
  reconcileBoostedAwayIncome,
  markAppClosed,
  initSessionGuard,
  isStorageIntact,
  isFloorMaxed,
  type Floor,
} from "./gameState";
import { bindSaveLifecycle, saveCompanySnapshot } from "./shared/persistence";
import { suppressNativeContextMenu } from "./shared/tapEvents";
import { type BuildingDraft, type RenovationPlan } from "./shared/buildingJob";
import { isDetachedJobPending, isFloorLocked } from "./shared/detachedJob";

import { createLoadingOverlay } from "./shared/loadingOverlay";
import {
  createRenovationController,
  renovateFloors,
  stopRenovationsNow,
  planRenovation,
  createFixedRenovationPlan,
  createFloorUnlockStep,
  createBuildingCompletionStep,
} from "./renovation";
import {
  getActiveCompanyIndex,
  setActiveCompanyIndex,
  companyStorageKey,
  saveCompanyRecord,
} from "./company";
import {
  wireActionBar,
  wireUpgradeMenu,
  wireFloorUpgradeMenu,
  wireCorporationUpgradeMenu,
  wireBoostMenu,
  wireBadgeCollection,
  wireCorporationStats,
  getGlobalIncomeBoostMultiplier,
  getCompanyAssetValue,
  getCompanyUpgradesValue,
  getWorkerCost,
  getOfficeChairsCost,
  getOfficeSuppliesCost,
  getManagerCost,
  buyWorker,
  buyOfficeChairs,
  buyOfficeSupplies,
  buyManager,
  isManagerUnlocked,
  MANAGER_MIN_UPGRADE_COUNT,
  mergeCompanies,
  wireMapMenu,
  wireTotalEarnedOverlay,
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
  configureBuildingFloorPrices,
  getBuildingMultiplier,
  repairZeroedFloors,
  getBuildingPrice,
  canBuyNextBuilding,
  loadWallMaterial,
  loadRoofImage,
} from "./buildings";
import {
  startBackgroundMusic,
  preloadSounds,
  prepareAudio,
  playSwoosh,
} from "./sound";
import { createNewCorporation } from "./corporationName";
import { observeActionBarHeight } from "./utils";
import { getBackgroundUrls } from "./loadAssets";

import {
  drainSoon,
  loadWhenIdle,
  runWhenIdle,
  runWhenIdleWithin,
} from "./shared/idle";
import { preheat, runPreheat } from "./shared/preheat";
import {
  afterStartup,
  isStartupSettled,
  markStartupSettled,
  whenDocumentReady,
} from "./shared/startupGate";
import { isDialogOpen, isDialogSliding } from "./shared/dialogVisibility";

// matches style.css's worker-menu-slide-out-* keyframes (0.352s) — the company
// select menu's own close animation duration
const DIALOG_CLOSE_MS = 352;
// how far ahead of the dialog fully disappearing the map's own switch-company
// animation should kick in, so the two transitions blend together instead of
// the switch happening while the dialog hasn't even started moving yet
const SWITCH_LEAD_MS = 100;
// Sale and Overtime scroll their floor's button this far down the screen,
// below the middle, nearer a phone user's thumb
const BOOST_BUTTON_SCREEN_SHARE = 0.6;
// a buy-out always ends, even if something keeps being affordable
const BUY_ALL_MAX_PURCHASES = 20_000;
// matches style.css's .splash--out transition
const SPLASH_FADE_MS = 150;
// the most the splash waits on the preheat, and the frames drawn behind it
const PREHEAT_MS = 2500;
const PREHEAT_FRAMES = 3;
// index.html's splash as it first showed, for the test button to bring back
let splashCopy: HTMLElement | null = null;

// fades a splash out and drops it
function hideSplash(splash: HTMLElement): void {
  splash.classList.add("splash--out");
  setTimeout(() => splash.remove(), SPLASH_FADE_MS);
}

// the splash screen again over the game until it's clicked (test button)
function showSplashTest(app: HTMLElement): void {
  if (!splashCopy) return;
  const splash = splashCopy.cloneNode(true) as HTMLElement;
  splash.addEventListener("click", () => hideSplash(splash), { once: true });
  app.append(splash);
}

async function main() {
  performance.mark("game:main");
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) throw new Error("#app not found");
  initSessionGuard();
  suppressNativeContextMenu();
  afterStartup(startBackgroundMusic);
  warmTierFlashes();
  // creating the AudioContext alone blocked the main thread for tens of ms
  runWhenIdle(preloadSounds);
  // what the first seconds would hitch on runs behind the splash
  // (shared/preheat): the badge catalog and rewards and the starter events
  // start downloading, the sprite and text warm-ups and the audio device run
  // while they come in, then they land
  let chunks: Promise<unknown> = Promise.resolve();
  preheat(() => {
    chunks = Promise.all([loadBadgeRewards(), loadNextEventPart()]);
  });
  preheat(drainSoon);
  preheat(prepareAudio);
  preheat(() => chunks);
  // the events and badge crit rewards are most of the code: kept out of the
  // startup bundle, they load one chunk at a time while the game is quiet
  // (crits roll without them till then): the starter pile of events, the
  // badge rewards, then the rest of the events
  queueEventParts(1);
  loadWhenIdle(loadBadgeRewards);
  // the random spawns roll once their chunks land
  loadWhenIdle(loadSpawns);
  queueEventParts();

  // the page's markup (canvas, action bar, dialogs) is in index.html
  const canvas = app.querySelector<HTMLCanvasElement>("#game-canvas")!;
  const cityMapEl = app.querySelector<HTMLDivElement>("#city-map")!;
  observeActionBarHeight(app.querySelector<HTMLDivElement>("#action-bar")!);

  // canvas text doesn't re-render on its own once a web font finishes loading (unlike
  // DOM text), so every weight the canvas draws with must be loaded before the first
  // redraw below, or the very first frame silently falls back to system-ui.
  // Every first-screen download starts at once: awaited in turn, each cost a
  // round trip and a decode before the first frame
  const firstScreen = Promise.all([
    document.fonts.load('700 16px "Fredoka"'),
    document.fonts.load('900 16px "Fredoka"'),
    loadCloudImages(),
    loadCoinImage(),
    loadFloatingCoinImage(),
    loadRoofImage(), // same roof art for every theme, loaded once
    loadBuildingThemeAssets(),
    loadCityImage(),
  ]);
  await firstScreen;
  performance.mark("game:assets");

  // one Floor[] per building; only one building is ever shown on screen at a time
  // (see gameCanvas.ts's setActiveFloors) — switching which one is active/visible
  // happens entirely through the map menu below, not by scrolling/swiping.
  // Belongs entirely to whichever corporation is currently active (see
  // company.ts) — switching companies below empties this array and refills it
  // with that other company's own buildings, never mixing the two
  const buildings: Floor[][] = [];
  let activeBuildingIndex = 0;
  let activeCompanyIndex = getActiveCompanyIndex();
  let mapOpen = false;
  const renovationOverlay = createLoadingOverlay(canvas, "Renovating");
  const renovations = createRenovationController({
    setLoading: renovationOverlay.show,
    showRewards: (rewards) => getCritBadgeOverlay().show(rewards),
  });
  function refreshRenovationView(): void {
    renovations.setView(activeCompanyIndex, activeBuildingIndex, mapOpen);
  }
  // consumed once by the very next onSwitchCompany call (see cityMapView's own
  // deps below) — set right before triggering a post-merge switch animation
  // when the OUTGOING company was itself just merged away, so that switch
  // skips re-snapshotting main.ts's own stale live buildings/total over the
  // clear mergeCompanies already did for it
  let skipNextOutgoingSnapshot = false;

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

  function saveCurrentCompanyStateNow(): void {
    saveBuildingsImmediately(buildings, activeCompanyIndex);
    saveCompanySnapshot(
      activeCompanyIndex,
      {
        bankedTotal: getTotalIncome(),
        incomeRatePerSecond: getBuildingsCurrentIncomePerSecond(
          buildings,
          Date.now(),
        ),
        assetValue: getCompanyAssetValue(buildings),
        upgradesValue: getCompanyUpgradesValue(buildings),
      },
      saveCompanyRecord,
    );
  }

  // the full save serializes every building, so a background job's saves wait
  // until its opening hop and coin burst have played
  let companySaveQueued = false;
  function saveCurrentCompanyStateSoon(): void {
    if (companySaveQueued) return;
    companySaveQueued = true;
    setTimeout(
      () =>
        runWhenIdleWithin(() => {
          companySaveQueued = false;
          saveCurrentCompanyStateNow();
        }, 1000),
      1000,
    );
  }

  // loads every asset the game needs (floor backgrounds, ground, wall material,
  // worker/manager sprites) and makes them the active set every draw* function
  // reads from — call before ever showing a building on screen. Roof isn't part
  // of this set (see loadRoofImage, loaded once above).
  async function loadBuildingThemeAssets(): Promise<void> {
    await Promise.all([
      loadFloorBackgrounds(),
      loadGroundImage(),
      loadWallMaterial(),
      loadWorkerSprite(),
    ]);
  }

  // loads a company's saved buildings, or starts it off with a single fresh
  // building if it's never been played before (a brand new corporation, or the
  // very first run)
  async function loadOrCreateBuildings(
    companyIndex: number,
  ): Promise<Floor[][]> {
    const restored = loadBuildings(companyIndex);
    if (restored.length > 0) {
      restored.forEach(repairZeroedFloors);
      return restored;
    }
    const themeBackgroundCount = getBackgroundUrls().length;
    return [createBuilding(0, themeBackgroundCount)];
  }

  buildings.push(...(await loadOrCreateBuildings(activeCompanyIndex)));
  activeBuildingIndex = Math.min(
    Math.max(loadActiveBuildingIndex(activeCompanyIndex), 0),
    buildings.length - 1,
  );

  const floorUpgradeMenu = wireFloorUpgradeMenu(app, () => persist());
  const corporationStats = wireCorporationStats(app);

  const gameCanvas = createGameCanvas({
    canvas,
    getBackgrounds: getActiveBackgrounds,
    floors: buildings[activeBuildingIndex],
    getBuildingMultiplier: () => getBuildingMultiplier(activeBuildingIndex),
    getCompanyValue: () => getCompanyAssetValue(buildings),
    applyCompanyWideBoost: () => {
      for (const floors of buildings) {
        applyBoostAll(floors);
      }
    },
    createMysticBuilding: () => createMysticBuilding(),
    persist,
    onOpenFloorUpgrades: (floor, floorNumber) =>
      floorUpgradeMenu.open(floor, floorNumber),
    onOpenCorporationStats: () => corporationStats.open(),
  });

  // ensures a building's next locked floor is waiting above it; onAdd only forwards
  // to gameCanvas.ts when this is the currently-active/on-screen building — an
  // inactive building's newly-added floor gets picked up automatically the next
  // time the player switches to it (setActiveFloors registers every floor fresh).
  function setupBuilding(
    buildingIndex: number,
    targetBuildings = buildings,
  ): void {
    configureBuildingFloorPrices(targetBuildings[buildingIndex], buildingIndex);
    ensureLockedFloorAbove({
      floors: targetBuildings[buildingIndex],
      backgroundCount: getBackgroundUrls().length,
      multiplier: getBuildingMultiplier(buildingIndex),
      onAdd: (floor) => {
        if (
          targetBuildings === buildings &&
          buildingIndex === activeBuildingIndex
        ) {
          gameCanvas.notifyFloorAdded(floor);
        }
      },
    });
  }

  // a crit landing on a building bought on the map, and the Mystic crit's
  // free building (see crits' createBuildingCrits)
  const { setBuildingCritTier, createMysticBuilding } = createBuildingCrits({
    buildings,
    backgroundCount: () => getBackgroundUrls().length,
    getBuildingMultiplier,
    onFloorAdded: (targetBuildings, buildingIndex, floor) => {
      if (
        targetBuildings === buildings &&
        buildingIndex === activeBuildingIndex
      )
        gameCanvas.notifyFloorAdded(floor);
    },
    addBuilding: (targetBuildings, options) => {
      const buildingIndex = targetBuildings.length;
      targetBuildings.push(
        createBuilding(buildingIndex, getBackgroundUrls().length, options),
      );
      setupBuilding(buildingIndex, targetBuildings);
      return buildingIndex;
    },
    persist: (targetBuildings) => {
      if (targetBuildings === buildings) persist();
    },
  });

  function floorActionDeps(
    buildingIndex: number,
    targetBuildings = buildings,
  ): FloorActionsDeps {
    return {
      floors: targetBuildings[buildingIndex],
      backgroundCount: getBackgroundUrls().length,
      multiplier: getBuildingMultiplier(buildingIndex),
      persist: () => {
        if (targetBuildings === buildings) persist();
      },
      onFloorAdded: (floor) => {
        if (
          targetBuildings === buildings &&
          buildingIndex === activeBuildingIndex
        )
          gameCanvas.notifyFloorAdded(floor);
      },
      createMysticBuilding: () => createMysticBuilding(targetBuildings),
      getCompanyValue: () => getCompanyAssetValue(targetBuildings),
      applyCompanyWideBoost: () => {
        for (const floors of targetBuildings) applyBoostAll(floors);
      },
      getScreenCenterLocal: () => ({ x: FLOOR_W / 2, y: FLOOR_H / 2 }),
    };
  }

  // switches which building is currently displayed — no travel animation yet, just
  // an instant cut to the new street.
  async function goToBuilding(buildingIndex: number): Promise<void> {
    activeBuildingIndex = buildingIndex;
    saveActiveBuildingIndex(activeCompanyIndex, buildingIndex);
    await loadBuildingThemeAssets();
    gameCanvas.setActiveFloors(buildings[buildingIndex]);
    refreshRenovationView();
  }

  // switches which corporation is active (see company.ts, cityMap's barrel-roll
  // picker): saves the outgoing company's own buildings/active-building under its
  // own key, then empties+refills the same buildings array reference (every
  // closure above captured this array once, not its contents) with the new
  // company's own separate buildings, its own last-active building, and hands
  // totalIncome.ts its own separate running total — nothing here is shared
  // between companies
  async function switchToCompany(
    companyIndex: number,
    // set by the corporation-merge flow below when the OUTGOING company was
    // itself just merged away (see mergeCompanies) — its storage was already
    // cleared there, so snapshotting main.ts's own now-stale live buildings/
    // total over that clear would silently resurrect it. Every other caller
    // (a normal barrel-roll switch, "Create new Corporation") leaves this off
    skipOutgoingSnapshot = false,
  ): Promise<void> {
    if (!skipOutgoingSnapshot) {
      // snapshot the OUTGOING company's ENTIRE CompanyRecord (see company.ts) in
      // one atomic write, while `buildings`/`activeCompanyIndex`/`totalIncome`
      // still hold its data — bankedTotal, its rate, and the timestamp all land
      // together, so a dormant company's derived total can never desync from a
      // separately-written "just the total" value (there isn't one anymore)
      saveCompanySnapshot(
        activeCompanyIndex,
        {
          bankedTotal: getTotalIncome(),
          incomeRatePerSecond: getBuildingsCurrentIncomePerSecond(
            buildings,
            Date.now(),
          ),
          assetValue: getCompanyAssetValue(buildings),
          upgradesValue: getCompanyUpgradesValue(buildings),
        },
        saveCompanyRecord,
      );
      saveBuildings(buildings, activeCompanyIndex);
      saveActiveBuildingIndex(activeCompanyIndex, activeBuildingIndex);
    }

    activeCompanyIndex = companyIndex;
    setActiveCompanyIndex(companyIndex);
    buildings.length = 0;
    buildings.push(...(await loadOrCreateBuildings(companyIndex)));
    activeBuildingIndex = Math.min(
      Math.max(loadActiveBuildingIndex(companyIndex), 0),
      buildings.length - 1,
    );
    buildings.forEach((_, i) => setupBuilding(i));

    switchActiveCompany(companyIndex, buildings);
    // tops up whatever collectDueIncome is about to pay any floor whose own
    // worker boost decayed partway through however long this company just sat
    // dormant (see gameState.ts's own doc comment) — must run AFTER
    // switchActiveCompany so the credit lands in the now-active company's total
    const awayBoostIncome = reconcileBoostedAwayIncome(
      buildings,
      currentIncomeRatePerSecond,
    );
    if (gt(awayBoostIncome, fromNumber(0))) addTotalIncome(awayBoostIncome);
    await loadBuildingThemeAssets();
    await Promise.all([loadCityImage(), loadCityMapImage()]);
    gameCanvas.setActiveFloors(buildings[activeBuildingIndex]);
    refreshRenovationView();
  }

  // the test panel, wired once the game is up; never in the shipped game
  if (import.meta.env.MODE !== "production")
    preheat(() =>
      import("./devTests").then(({ wireDevTests }) =>
        wireDevTests({
          app,
          buildings,
          activeFloors: () => buildings[activeBuildingIndex] ?? [],
          activeCompany: () => activeCompanyIndex,
          gameCanvas,
          goToBuilding,
          switchCompany: (index) => switchToCompany(index),
          showIdleOverlay: () =>
            void totalEarnedOverlay.show(fromNumber(123456)),
          showSplash: () => showSplashTest(app),
        }),
      ),
    );

  function startBuildingRenovation(
    floors: Floor[],
    plan: RenovationPlan,
    action: "upgrades" | "unlock" | "complete" | "buyAll" = "upgrades",
    onPurchased?: () => void,
  ): Promise<boolean> {
    const buildingIndex = buildings.indexOf(floors);
    if (
      buildingIndex < 0 ||
      isDetachedJobPending() ||
      renovations.running ||
      floors.some(isFloorLocked)
    )
      return Promise.resolve(false);
    const companyIndex = activeCompanyIndex;
    let mysticBuildings = 0;
    let companyBoosts = 0;
    const draftDeps = (draft: BuildingDraft): FloorActionsDeps => ({
      ...floorActionDeps(buildingIndex, draft.buildings),
      createMysticBuilding: () => {
        mysticBuildings++;
      },
      applyCompanyWideBoost: () => {
        applyBoostAll(draft.buildings[buildingIndex]);
        companyBoosts++;
      },
    });
    const upgrade = (draft: BuildingDraft, floor: Floor): void => {
      withDraftEconomy(draft, () =>
        performAutomatedUpgradeAfterPayment(
          draftDeps(draft),
          floor,
          draft.buildings[buildingIndex][0] === floor,
          true,
        ),
      );
    };
    refreshRenovationView();
    return renovations.start(companyIndex, buildingIndex, () =>
      renovateFloors({
        plan,
        buildings,
        buildingIndex,
        onPurchased,
        spend: (cost) => {
          if (!spendTotalIncome(cost)) return false;
          saveCurrentCompanyStateSoon();
          return true;
        },
        refund: (cost) => {
          addCompanyTotalIncome(companyIndex, cost);
          persist();
        },
        getMoney: getTotalIncome,
        isCurrent: () =>
          activeCompanyIndex === companyIndex &&
          buildings[buildingIndex] === floors,
        upgrade,
        keepPartialOnStop: action === "buyAll",
        createStep: (draft) => {
          if (action === "unlock")
            return createFloorUnlockStep(
              draft.buildings[buildingIndex],
              (floor) =>
                withDraftEconomy(draft, () =>
                  performAutomatedFloorUnlock(draftDeps(draft), floor, true),
                ),
            );
          if (action === "complete")
            return createBuildingCompletionStep(
              plan,
              draft.buildings[buildingIndex],
              (floor) => upgrade(draft, floor),
              {
                managerLevel: MANAGER_MIN_UPGRADE_COUNT,
                maxWorkers: MAX_RENDERED_WORKERS,
              },
            );
          if (action === "buyAll") {
            // the prepaid budget is the draft's wallet; what's left is refunded on commit
            draft.money = add(draft.money, plan.cost);
            let purchases = 0;
            return () =>
              purchases++ < BUY_ALL_MAX_PURCHASES &&
              withDraftEconomy(
                draft,
                () =>
                  cheapestPurchase(draft.buildings, buildingIndex)?.buy() ??
                  false,
              );
          }
          return undefined;
        },
        commit: (draft, rewardBase) => {
          buildings[buildingIndex] = draft.buildings[buildingIndex];
          addCompanyTotalIncome(
            companyIndex,
            subtract(draft.money, rewardBase),
          );
          for (let count = 0; count < mysticBuildings; count++)
            createMysticBuilding();
          if (companyBoosts > 0)
            for (const targets of buildings) applyBoostAll(targets);
          if (activeBuildingIndex === buildingIndex)
            gameCanvas.setActiveFloors(buildings[buildingIndex], true);
          persist();
        },
      }),
    );
  }
  const upgradeMenu = wireUpgradeMenu(
    app,
    () => buildings[activeBuildingIndex] ?? [],
    () => persist(),
    startBuildingRenovation,
    (floors, budget) => planRenovation(floors, budget),
  );
  // "Create new Corporation" adds a fresh named corporation above the current
  // one in the map's corp-name barrel (see corporationName.ts/cityMap's
  // drawCorporationNames) — roll up with the action bar to reach it.
  // Auto-switches to the new company, playing the exact same swoosh +
  // barrel-roll flourish a manual switch gets (see cityMapView's
  // animateSwitchToCompany) — its own completion is what actually calls
  // switchToCompany, same as a normal roll, so there's only ever one switch.
  // The dialog is shut at once rather than slid out, so the roll has the
  // screen to itself
  const corporationUpgradeMenu = wireCorporationUpgradeMenu(
    app,
    () => {
      const newIndex = createNewCorporation();
      corporationUpgradeMenu.dismiss();
      playSwoosh();
      cityMapView.animateSwitchToCompany(newIndex);
    },
    // "Merge" (see hud/corporationUpgradeMenu's own Merge section): founds a
    // new company from scratch carrying every selected company's value, then
    // closes the dialog and barrel-rolls to it. If the company we're switching
    // AWAY from was one of the merged ones, flag the next switch to skip
    // re-snapshotting its now-stale live state over the clear mergeCompanies
    // already wrote to storage for it
    (companyIndices) => {
      const result = mergeCompanies(companyIndices, buildings);
      if (!result) return;
      skipNextOutgoingSnapshot = companyIndices.includes(activeCompanyIndex);
      corporationUpgradeMenu.close();
      setTimeout(() => {
        playSwoosh();
        cityMapView.animateSwitchToCompany(result.companyIndex);
      }, DIALOG_CLOSE_MS - SWITCH_LEAD_MS);
    },
  );
  const boostMenu = wireBoostMenu(
    app,
    () => buildings[activeBuildingIndex] ?? [],
    () => persist(),
    (floor) => gameCanvas.scrollActiveToFloor(floor, BOOST_BUTTON_SCREEN_SHARE),
    (floor) => gameCanvas.scrollActiveToFloor(floor, BOOST_BUTTON_SCREEN_SHARE),
  );
  const badgeCollection = wireBadgeCollection(app);
  const totalEarnedOverlay = wireTotalEarnedOverlay(app);
  // buys the next building outright if affordable at its milestone price.
  // Returns whether it succeeded so the map menu can decide whether to re-render
  function buyBuilding(targetBuildings = buildings): boolean {
    const buildingIndex = targetBuildings.length;
    if (!canBuyNextBuilding(targetBuildings)) return false;
    const purchaseCost = getBuildingPrice(buildingIndex);
    if (!spendTotalIncome(purchaseCost)) return false;
    targetBuildings.push(
      createBuilding(buildingIndex, getBackgroundUrls().length, {
        purchaseCost,
      }),
    );
    setupBuilding(buildingIndex, targetBuildings);
    if (targetBuildings === buildings) persist();
    return true;
  }

  // a map marker's long-press: a renovation that prepays the whole wallet, buys
  // the building's most expensive affordable item until none is left, and
  // refunds the rest on commit
  function buyOutBuilding(buildingIndex: number): Promise<boolean> {
    const floors = buildings[buildingIndex];
    if (!floors || !cheapestPurchase(buildings, buildingIndex))
      return Promise.resolve(false);
    const budget = structuredClone(getTotalIncome());
    return startBuildingRenovation(
      floors,
      createFixedRenovationPlan(floors, budget, 1),
      "buyAll",
    ).then((bought) => {
      if (bought) saveCurrentCompanyStateSoon();
      return bought;
    });
  }

  interface AutoPurchase {
    cost: BigNumber;
    label: string;
    // spends and applies via the same canonical purchase the menus use;
    // false when it turned out to be unaffordable
    buy: () => boolean;
  }

  // scans every purchasable thing in the company (or just one building, when
  // onlyBuildingIndex is given) and returns the most expensive affordable one,
  // or null once nothing can currently be bought
  function cheapestPurchase(
    targetBuildings = buildings,
    onlyBuildingIndex?: number,
  ): AutoPurchase | null {
    let best: AutoPurchase | null = null;
    const consider = (candidate: AutoPurchase): void => {
      if (
        !gte(getTotalIncome(), candidate.cost) ||
        (best !== null && !gt(candidate.cost, best.cost))
      ) {
        return;
      }
      best = candidate;
    };
    if (
      onlyBuildingIndex === undefined &&
      canBuyNextBuilding(targetBuildings)
    ) {
      consider({
        cost: getBuildingPrice(targetBuildings.length),
        label: "+1 building",
        buy: () => {
          const buildingIndex = targetBuildings.length;
          if (!buyBuilding(targetBuildings)) return false;
          const result = rollFloorBuyCrit(false);
          if (result)
            setBuildingCritTier(buildingIndex, result, targetBuildings);
          return true;
        },
      });
    }
    targetBuildings.forEach((floors, buildingIndex) => {
      if (
        onlyBuildingIndex !== undefined &&
        buildingIndex !== onlyBuildingIndex
      )
        return;
      const top = floors[floors.length - 1];
      if (top && !top.unlocked) {
        consider({
          cost: top.unlockCost,
          label: "+1 floor",
          buy: () =>
            performAutomatedFloorUnlock(
              floorActionDeps(buildingIndex, targetBuildings),
              top,
            ),
        });
      }
      for (const floor of floors) {
        if (!floor.unlocked) continue;
        const armed = getCritTier(floor) !== null;
        const upgradeCost = getUpgradeCost(floor);
        // a broken $0 price would otherwise be bought forever
        if (!isFloorMaxed(floor) && (armed || !isZero(upgradeCost)))
          consider({
            cost: armed ? ZERO : upgradeCost,
            label: "+1 upgrade",
            buy: () =>
              performAutomatedUpgradeClick(
                floorActionDeps(buildingIndex, targetBuildings),
                floor,
                floors[0] === floor,
              ),
          });
        if (floor.workerCount < MAX_RENDERED_WORKERS) {
          consider({
            cost: getWorkerCost(floor),
            label: "+1 worker",
            buy: () => buyWorker(floor),
          });
        }
        if (!floor.hasOfficeChairs) {
          consider({
            cost: getOfficeChairsCost(floor),
            label: "+1 chairs",
            buy: () => buyOfficeChairs(floor),
          });
        }
        if (!floor.hasOfficeSupplies) {
          consider({
            cost: getOfficeSuppliesCost(floor),
            label: "+1 supplies",
            buy: () => buyOfficeSupplies(floor),
          });
        }
        if (!floor.hasManager && isManagerUnlocked(floor)) {
          consider({
            cost: getManagerCost(floor),
            label: "+1 manager",
            buy: () => buyManager(floor),
          });
        }
      }
    });
    return best;
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
  function closeMapView(): void {
    mapOpen = false;
    canvas.hidden = false;
    cityMapEl.hidden = true;
    playSwoosh();
    // both hidden canvases' ResizeObserver callbacks fire async, too late to save
    // the very next redraw()/tick from dividing by a stale zero size
    gameCanvas.resize();
    gameCanvas.redraw();
    refreshRenovationView();
  }
  function openMapView(): void {
    mapOpen = true;
    canvas.hidden = true;
    cityMapEl.hidden = false;
    playSwoosh();
    cityMapView.refresh();
    refreshRenovationView();
  }
  const cityMapView = createCityMapView(app, {
    getTotalIncome,
    getBuildingCount: () => buildings.length,
    getActiveBuildingIndex: () => activeBuildingIndex,
    getBuildingFloorCount: (buildingIndex) =>
      // buildings[i] always includes one extra locked floor waiting above the
      // topmost unlocked one (see ensureLockedFloorAbove) — the marker should
      // only count floors actually unlocked, not that placeholder
      buildings[buildingIndex]?.filter((floor) => floor.unlocked).length ?? 0,
    isBuildingFullyManaged: (buildingIndex) => {
      const floors = buildings[buildingIndex];
      if (!floors) return false;
      const unlockedFloors = floors.filter((floor) => floor.unlocked);
      return (
        unlockedFloors.length >= MAX_FLOORS_PER_BUILDING &&
        unlockedFloors.every((floor) => floor.hasManager)
      );
    },
    getBuildingCritTier: (buildingIndex) =>
      getUniformCritTier(buildings[buildingIndex] ?? []),
    isBuildingRenovating: (buildingIndex) =>
      renovations.isRunning(activeCompanyIndex, buildingIndex),
    hasBadgeCapsule: (buildingIndex) =>
      hasBadgeCapsule(buildings[buildingIndex] ?? []),
    // the reveal plays on the map; its badge then waits on the building's
    // ground floor as an armed crit
    onOpenBadgeCapsule: (buildingIndex) => {
      const floors = buildings[buildingIndex];
      const prize = floors && takeBadgeCapsule(floors);
      if (!prize) return;
      persist();
      cityMapView.playBadgeCapsule(prize.kind, prize.title, () => {
        recordCritProcLanded(prize.kind);
        const ground = floors[0];
        if (ground)
          forceTestCrit(ground, prize.kind, pickCritTierByOdds(), "upgrade");
        persist();
      });
    },
    buyBuilding,
    canBuyBuilding: () => canBuyNextBuilding(buildings),
    onStateChanged: saveCurrentCompanyStateNow,
    buyOutBuilding,
    setBuildingCritTier,
    onSelectBuilding: (index) => {
      goToBuilding(index);
      closeMapView();
    },
    onSwitchCompany: (companyIndex) => {
      const skip = skipNextOutgoingSnapshot;
      skipNextOutgoingSnapshot = false;
      switchToCompany(companyIndex, skip);
    },
    onOpenCorporationStats: () => corporationStats.open(),
  });
  // the map's backdrop is the biggest image in the game (14MB decoded) and
  // nothing shows it until the map opens; it fills the game canvas's slot, so
  // it's scaled for that size at idle, before the first open
  afterStartup(() =>
    loadCityMapImage().then(() =>
      runWhenIdle(() =>
        cityMapView.prepareBackdrop(canvas.clientWidth, canvas.clientHeight),
      ),
    ),
  );
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
    onHoldScrollTop: () => {
      if (!mapOpen) return;
      playSwoosh();
      cityMapView.jumpToEnd(-1);
    },
    onHoldScrollBottom: () => {
      if (!mapOpen) return;
      playSwoosh();
      cityMapView.jumpToEnd(1);
    },
    onBoostAll: () => {
      if (
        isDetachedJobPending() ||
        (!mapOpen && buildings[activeBuildingIndex].some(isFloorLocked))
      )
        return;
      if (mapOpen) badgeCollection.open();
      else boostMenu.open();
    },
    onOpenUpgradeMenu: () => {
      if (
        isDetachedJobPending() ||
        (!mapOpen && buildings[activeBuildingIndex].some(isFloorLocked))
      )
        return;
      if (mapOpen) corporationUpgradeMenu.open();
      else upgradeMenu.open();
    },
    onOpenMapMenu: () => {
      if (mapOpen) closeMapView();
      else openMapView();
    },
  });

  buildings.forEach((_, i) => setupBuilding(i));
  persist();

  rebalanceDormantCompanyEconomies(getGlobalIncomeBoostMultiplier);
  const idleIncome = computeIdleIncome(
    buildings,
    currentIncomeRatePerSecond,
    getGlobalIncomeBoostMultiplier(),
  );
  const lastClose = getLastCloseTimestamp();
  const now = Date.now();
  const dormantIdleIncome =
    lastClose !== null && (now - lastClose) / 1000 > IDLE_INCOME_MIN_SECONDS
      ? getDormantCompaniesIdleIncome(lastClose, now)
      : fromNumber(0);
  const totalIdleIncome = add(idleIncome, dormantIdleIncome);
  // saveBuildings directly (not the debounced persist()): computeIdleIncome advances
  // every floor's lastCollectedAt in memory, and that must land before a second quick
  // reload could otherwise re-collect the same already-paid-out idle time
  saveBuildings(buildings, activeCompanyIndex);
  const idleShown = gt(totalIdleIncome, fromNumber(0));
  if (idleShown) addTotalIncome(idleIncome);

  gameCanvas.redraw();
  performance.mark("game:first-frame");

  // one continuous redraw loop drives every animation (workers, clouds, income bars,
  // coin bursts) — gameCanvas.ts itself only ever draws whichever buildings/floors are
  // actually scrolled into view, so this stays cheap no matter how many buildings exist.
  // Skipped while the map view is open: the building canvas is hidden (0x0) then, and
  // its own redraw() math (division by its own now-zero CSS size) would throw
  // Frozen behind any dialog (open or sliding): the dialog gets the main thread
  startIncomeTicker(() => {
    // the frame drawn above stays under the startup overlay until its intro ends
    if (mapOpen || !isStartupSettled()) return;
    if (isDialogOpen() || isDialogSliding()) return;
    gameCanvas.redraw();
  });
  startTotalIncomeTicker(buildings, getGlobalIncomeBoostMultiplier);

  bindSaveLifecycle({
    isIntact: isStorageIntact,
    markClosed: markAppClosed,
    saveNow: () => {
      stopRenovationsNow();
      saveCurrentCompanyStateNow();
    },
  });

  // a few more frames behind the splash bake the text and sprites the first
  // ones draw, then it lifts on a warm game
  for (let i = 0; i < PREHEAT_FRAMES; i++) preheat(() => gameCanvas.redraw());
  await runPreheat(PREHEAT_MS);
  const splash = document.getElementById("splash");
  if (splash) {
    splashCopy = splash.cloneNode(true) as HTMLElement;
    hideSplash(splash);
  }
  if (idleShown)
    void whenDocumentReady()
      .then(() => totalEarnedOverlay.show(totalIdleIncome))
      .then(markStartupSettled);
  else setTimeout(markStartupSettled, 0);
}

main();

// registers the offline/installable-app shell (public/sw.js) — gated on
// !import.meta.hot rather than MODE, since "npm run dev:prod" (MODE=production)
// is STILL vite's dev server with HMR, not a real build; import.meta.hot only
// exists under any Vite dev server (regardless of --mode), so this is the one
// check that's actually true exclusively for genuinely built/served dist output.
// BASE_URL already carries the "/kitty-inc/" GitHub Pages prefix (see
// vite.config.ts), so this resolves correctly once deployed. The perf build
// skips it, so a rebuilt rig never runs on a cached older one
if (
  "serviceWorker" in navigator &&
  !import.meta.hot &&
  import.meta.env.MODE !== "perf"
) {
  afterStartup(() => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch((err) => console.error("Service worker registration failed", err));
  });
}
