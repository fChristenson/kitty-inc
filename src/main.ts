// first: every module's Date.now() reads the game clock
import "./shared/gameClock";
import "./style.css";
import {
  forceTestCrit,
  forceCritUpDown,
  forceMergeCrit,
  forceCritMoment,
} from "./floors";
import { wireCritTestActions } from "./hud";
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
  CHAIN_CRIT_CONTINUE_CHANCE,
  nextCritTier,
  CRIT_TIER_ORDER,
  CRIT_TIER_CONFIG,
  applyCritProcs,
  POKER_HAND_CRIT_COUNTS,
  LUCKY_CLOVER_CRIT_COUNT,
  LUCKY_CLOVER_CRIT_TIER,
  MYSTIC_UPGRADE_COUNT,
  loadFeaturedRewards,
  recordCritProcLanded,
  pickCritTierByOdds,
  type CritRollResult,
} from "./shared/critTypes";
import {
  loadFloorBackgrounds,
  loadGroundImage,
  loadWorkerSprite,
  loadCoinImage,
  loadFloatingCoinImage,
  startIncomeTicker,
  ensureLockedFloorAbove,
  getUniformCritTier,
  unlockAllFloors,
  getActiveBackgrounds,
  applyChainCrit,
  increaseIncomeRate,
  currentIncomeRatePerSecond,
  applyBoostAll,
  MAX_RENDERED_WORKERS,
  MAX_FLOORS_PER_BUILDING,
  FLOOR_W,
  FLOOR_H,
  performAutomatedUpgradeClick,
  performAutomatedUpgradeAfterPayment,
  performAutomatedFloorUnlock,
  getCritTier,
  getUpgradeCost,
  rollFloorBuyCrit,
  hasBadgeCapsule,
  takeBadgeCapsule,
  loadEventCatalog,
  loadNextEventPart,
  type EventCatalog,
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
import { getCritBadgeOverlay } from "./shared/critBadgeOverlay";
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
  createTestButtonMarkup,
  wireTestButton,
  wireSpawnMouseButton,
  wireTestActionsFilter,
  sortTestActionMenus,
  wireIdleOverlayTestButton,
  wireAddBadgesTestButtons,
  wireFoilRevealTestButtons,
  wireBoostEventTestButton,
  wireUnionEventTestButton,
  wireKickbackEventTestButton,
  wireBurstEventTestButton,
  wireSprayEventTestButton,
  wireFountainEventTestButton,
  wireRippleEventTestButton,
  wireWreckingBallEventTestButton,
  wirePiledriverEventTestButton,
  wireOrbitalStrikeEventTestButton,
  wireFuseEventTestButton,
  wireSupernovaEventTestButton,
  wireBowlingEventTestButton,
  wireThunderclapEventTestButton,
  wireChainReactionEventTestButton,
  wireBullseyeEventTestButton,
  wirePopcornEventTestButton,
  wireNewtonsCradleEventTestButton,
  wireJuggleEventTestButton,
  wireBoomerangEventTestButton,
  wireHeartbeatEventTestButton,
  wireClashEventTestButton,
  wireAsteroidsEventTestButton,
  wireWhackAMoleEventTestButton,
  wireDrumrollEventTestButton,
  wireShellGameEventTestButton,
  wireSeesawEventTestButton,
  wireScratchEventTestButton,
  wireTagEventTestButton,
  wireBumpersEventTestButton,
  wireCatcherEventTestButton,
  wireImplosionEventTestButton,
  wireAtomEventTestButton,
  wireSpiralEventTestButton,
  wireLoopEventTestButton,
  wireEternityEventTestButton,
  wireHelixEventTestButton,
  wireYoYoEventTestButton,
  wireRacetrackEventTestButton,
  wireSwingEventTestButton,
  wireEventTestButtons,
  wireSlashEventTestButton,
  wireJackhammerEventTestButton,
  wirePummelEventTestButton,
  wireOverloadEventTestButton,
  wireGatlingEventTestButton,
  wirePressEventTestButton,
  wireDrillEventTestButton,
  wireBurrowEventTestButton,
  wirePingPongEventTestButton,
  wireSlamDunkEventTestButton,
  wireUppercutEventTestButton,
  wireHeadHopEventTestButton,
  wirePaparazziEventTestButton,
  wireMissileBarrageEventTestButton,
  wireSonicBoomEventTestButton,
  wireMitosisEventTestButton,
  wirePlinkoEventTestButton,
  wireHammerThrowEventTestButton,
  wireSnakeEventTestButton,
  wireBreakoutEventTestButton,
  wireLineClearEventTestButton,
  wireBreakShotEventTestButton,
  wireBulletHellEventTestButton,
  wireVortexEventTestButton,
  wireRicochetEventTestButton,
  wireWaterfallEventTestButton,
  wireConveyorEventTestButton,
  wireFirefliesEventTestButton,
  wirePaydayEventTestButton,
  wirePiggyBankEventTestButton,
  wireCoinTossEventTestButton,
  wireHourglassEventTestButton,
  wireRocketEventTestButton,
  wireRevealEventTestButton,
  wireBadgeCapsuleTestButton,
  wireCritUpDownTestButtons,
  wireMergeCritTestButton,
  wireCritMomentTestButtons,
  wireJackpotReelsEventTestButton,
  wireChainPayEventTestButton,
  wireTwisterEventTestButton,
  wireDownpourEventTestButton,
  wireTrickleEventTestButton,
  wireMagnetEventTestButton,
  wireSpilloverEventTestButton,
  wireConstellationEventTestButton,
  wireAscendEventTestButton,
  wireRisingTideEventTestButton,
  wireTidalWaveEventTestButton,
  wireBeanstalkEventTestButton,
  wireBlessingEventTestButton,
  wireHaloEventTestButton,
  wireCometEventTestButton,
  wireMeteorShowerEventTestButton,
  wireMentorEventTestButton,
  wireSparkChainEventTestButton,
  wirePolishEventTestButton,
  wireLighthouseEventTestButton,
  wireRecruitEventTestButton,
  wirePromotionDayEventTestButton,
  wireAlchemyEventTestButton,
  wireInvestmentEventTestButton,
  wireDividendsEventTestButton,
  wireWispEventTestButton,
  wireStreamEventTestButton,
  wireTrailsEventTestButton,
  wireDrawEventTestButton,
  wireNightSkyEventTestButton,
  wirePitcherEventTestButton,
  wireGlimmerEventTestButton,
  wireHuntEventTestButton,
  wireSwarmEventTestButton,
  wireRenovateEventTestButton,
  wireUpgradeEventTestButton,
  wireUnlockEventTestButton,
  wireResetButton,
  createActionBarMarkup,
  wireActionBar,
  createUpgradeMenuMarkup,
  wireUpgradeMenu,
  createFloorUpgradeMenuMarkup,
  wireFloorUpgradeMenu,
  createCorporationUpgradeMenuMarkup,
  wireCorporationUpgradeMenu,
  createBoostMenuMarkup,
  wireBoostMenu,
  createBadgeCollectionMarkup,
  wireBadgeCollection,
  createCorporationStatsMarkup,
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
  createMapMenuMarkup,
  wireMapMenu,
  createTotalEarnedOverlayMarkup,
  wireTotalEarnedOverlay,
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
  configureBuildingFloorPrices,
  getBuildingMultiplier,
  repairZeroedFloors,
  getBuildingPrice,
  canBuyNextBuilding,
  loadWallMaterial,
  loadRoofImage,
} from "./buildings";
import { loadMouseImage, forceSpawnMouse } from "./mouse";
import { startBackgroundMusic, preloadSounds, playSwoosh } from "./sound";
import { createNewCorporation } from "./corporationName";
import { observeActionBarHeight } from "./utils";
import { getBackgroundUrls } from "./loadAssets";
import { warmTierFlashes } from "./shared/critFlash";
import { runWhenIdle } from "./shared/idle";
import {
  afterStartup,
  isStartupSettled,
  markStartupSettled,
  whenDocumentReady,
} from "./shared/startupGate";
import { isDialogOpen, isDialogSliding } from "./shared/dialogVisibility";
import { exposePerfBridge } from "./shared/perfBridge";

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

async function main() {
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) throw new Error("#app not found");
  initSessionGuard();
  suppressNativeContextMenu();
  afterStartup(startBackgroundMusic);
  warmTierFlashes();
  // creating the AudioContext alone blocked the main thread for tens of ms
  runWhenIdle(preloadSounds, 1500);
  // the events and featured crit rewards are most of the code: kept out of the
  // startup bundle, they load once the first screen is up (crits roll without
  // them till then); only the starter pile of events, the rest after events play
  runWhenIdle(() => void loadFeaturedRewards(), 2000);
  runWhenIdle(() => void loadNextEventPart(), 3000);

  app.innerHTML = `
    <div class="game">
      <canvas class="game__canvas" id="game-canvas"></canvas>
      ${createCityMapMarkup()}
      ${createActionBarMarkup()}
      ${import.meta.env.MODE !== "production" ? createTestButtonMarkup() : ""}
    </div>
    ${createUpgradeMenuMarkup()}
    ${createFloorUpgradeMenuMarkup()}
    ${createCorporationUpgradeMenuMarkup()}
    ${createBoostMenuMarkup()}
    ${createBadgeCollectionMarkup()}
    ${createCorporationStatsMarkup()}
    ${createMapMenuMarkup()}
    ${createTotalEarnedOverlayMarkup()}
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

  await Promise.all([
    loadCloudImages(),
    loadMouseImage(),
    loadCoinImage(),
    loadFloatingCoinImage(),
    loadRoofImage(), // same roof art for every theme, loaded once
  ]);

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
        runWhenIdle(() => {
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
  await loadBuildingThemeAssets();
  await loadCityImage();
  await loadCityMapImage();

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

  function createMysticBuilding(targetBuildings = buildings): void {
    const mysticBuildingIndex = targetBuildings.length;
    targetBuildings.push(
      createBuilding(mysticBuildingIndex, getBackgroundUrls().length, {
        groundFloorLocked: false,
        initialUpgradeCount: MYSTIC_UPGRADE_COUNT,
      }),
    );
    const groundFloor = targetBuildings[mysticBuildingIndex]?.[0];
    if (groundFloor) {
      setupBuilding(mysticBuildingIndex, targetBuildings);
    }
  }

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

  // dev/test-only controls; markup is stripped entirely in production builds
  if (import.meta.env.MODE !== "production") {
    exposePerfBridge({
      getActiveFloors: () => buildings[activeBuildingIndex],
      floorToClient: gameCanvas.floorToClient,
      scrollToFloor: gameCanvas.scrollActiveToFloor,
      wrapRedraw: (wrap) => {
        gameCanvas.redraw = wrap(gameCanvas.redraw);
      },
      buildingCount: () => buildings.length,
      goToBuilding,
      activeCompany: () => activeCompanyIndex,
      switchCompany: (index) => switchToCompany(index),
    });
    wireTestButton(app, () => {
      // absurdly large: comfortably covers buying dozens of buildings in one go,
      // many cities deep (see cityName/cityMap's continuously-compounding
      // BUILDING_COST_MULTIPLIER pricing) — formatCompactNumber's suffix (utils.ts)
      // is generated algorithmically, not from a fixed list, so it never runs out
      // of a name for however big this (or totalIncome) ever gets
      addTotalIncome(fromNumber(1e150));
    });
    wireSpawnMouseButton(app, () => {
      forceSpawnMouse(buildings[activeBuildingIndex] ?? []);
    });
    wireCritTestActions(app, (kind, tier, bonusTier, event) => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (floor) forceTestCrit(floor, kind, tier, bonusTier, event);
    });
    // shows the idle-income "You have earned" overlay (see
    // hud/totalEarnedOverlay) on demand, without needing to actually leave and
    // reopen the tab to earn real idle income first
    wireIdleOverlayTestButton(app, () => {
      void totalEarnedOverlay.show(fromNumber(123456));
    });
    wireAddBadgesTestButtons(app);
    wireFoilRevealTestButtons(app, (kind) => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (floor) forceTestCrit(floor, kind, "crit", null, "upgrade");
    });
    wireCritUpDownTestButtons(app, (up) => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (floor) forceCritUpDown(floor, up);
    });
    wireMergeCritTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (floor) forceMergeCrit(floor);
    });
    wireCritMomentTestButtons(app, (moment) => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (floor) forceCritMoment(floor, moment);
    });
    // the event modules load in their own chunk (floors/eventLoader): each
    // event test button loads it first, then runs with it as `ev`
    let ev!: EventCatalog;
    const later =
      <A extends unknown[]>(run: (...args: A) => void) =>
      (...args: A): void => {
        void loadEventCatalog().then((events) => {
          ev = events;
          run(...args);
        });
      };
    // arms the "Boost!" event button on the lowest floor that still has an
    // un-boosted worker, and scrolls to it
    wireBoostEventTestButton(
      app,
      later(() => {
        const floor = ev.forceBoostEvent(buildings[activeBuildingIndex] ?? []);
        if (floor) gameCanvas.scrollActiveToFloor(floor);
      }),
    );
    // arms "Union!" on the lowest floor with workers to merge, and scrolls to it
    wireUnionEventTestButton(
      app,
      later(() => {
        const floor = ev.forceUnionEvent(buildings[activeBuildingIndex] ?? []);
        if (floor) gameCanvas.scrollActiveToFloor(floor);
      }),
    );
    // scrolls to the ground floor and arms a crit there carrying Kickback
    wireKickbackEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceKickbackEvent(floor);
      }),
    );
    // same, for the Burst event
    wireBurstEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceBurstEvent(floor);
      }),
    );
    // same, for the Spray event
    wireSprayEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceSprayEvent(floor);
      }),
    );
    // same, for the Fountain event
    wireFountainEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceFountainEvent(floor);
      }),
    );
    // same, for the Ripple event
    wireRippleEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceRippleEvent(floor);
      }),
    );
    // same, for the Wrecking Ball event
    wireWreckingBallEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceWreckingBallEvent(floor);
      }),
    );
    // same, for the Piledriver event
    wirePiledriverEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forcePiledriverEvent(floor);
      }),
    );
    // same, for the Orbital Strike event
    wireOrbitalStrikeEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceOrbitalStrikeEvent(floor);
      }),
    );
    // same, for the Fuse event
    wireFuseEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceFuseEvent(floor);
      }),
    );
    // same, for the Supernova event
    wireSupernovaEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceSupernovaEvent(floor);
      }),
    );
    // same, for the Bowling event
    wireBowlingEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceBowlingEvent(floor);
      }),
    );
    // same, for the Thunderclap event
    wireThunderclapEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceThunderclapEvent(floor);
      }),
    );
    // same, for the Chain Reaction event
    wireChainReactionEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceChainReactionEvent(floor);
      }),
    );
    // same, for the Bullseye event
    wireBullseyeEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceBullseyeEvent(floor);
      }),
    );
    // same, for the Popcorn event
    wirePopcornEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forcePopcornEvent(floor);
      }),
    );
    // same, for the Newton's Cradle event
    wireNewtonsCradleEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceNewtonsCradleEvent(floor);
      }),
    );
    // same, for the Juggle event
    wireJuggleEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceJuggleEvent(floor);
      }),
    );
    // same, for the Boomerang event
    wireBoomerangEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceBoomerangEvent(floor);
      }),
    );
    // same, for the Heartbeat event
    wireHeartbeatEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceHeartbeatEvent(floor);
      }),
    );
    // same, for the Clash event
    wireClashEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceClashEvent(floor);
      }),
    );
    // same, for the Asteroids event
    wireAsteroidsEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceAsteroidsEvent(floor);
      }),
    );
    // same, for the Whack-a-Mole event
    wireWhackAMoleEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceWhackAMoleEvent(floor);
      }),
    );
    // same, for the Drumroll event
    wireDrumrollEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceDrumrollEvent(floor);
      }),
    );
    // same, for the Shell Game event
    wireShellGameEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceShellGameEvent(floor);
      }),
    );
    // same, for the Seesaw event
    wireSeesawEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceSeesawEvent(floor);
      }),
    );
    // same, for the Scratch event
    wireScratchEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceScratchEvent(floor);
      }),
    );
    // same, for the Tag event
    wireTagEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceTagEvent(floor);
      }),
    );
    // same, for the Bumpers event
    wireBumpersEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceBumpersEvent(floor);
      }),
    );
    // same, for the Catcher event
    wireCatcherEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceCatcherEvent(floor);
      }),
    );
    // same, for the Implosion event
    wireImplosionEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceImplosionEvent(floor);
      }),
    );
    // same, for the Atom event
    wireAtomEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceAtomEvent(floor);
      }),
    );
    // same, for the Spiral event
    wireSpiralEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceSpiralEvent(floor);
      }),
    );
    // same, for the Loop event
    wireLoopEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceLoopEvent(floor);
      }),
    );
    // same, for the Eternity event
    wireEternityEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceEternityEvent(floor);
      }),
    );
    // same, for the Helix event
    wireHelixEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceHelixEvent(floor);
      }),
    );
    // same, for the Yo-Yo event
    wireYoYoEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceYoYoEvent(floor);
      }),
    );
    // same, for the Racetrack event
    wireRacetrackEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceRacetrackEvent(floor);
      }),
    );
    // same, for the Swing event
    wireSwingEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceSwingEvent(floor);
      }),
    );
    // the rest of the event test buttons, each forcing its event on the
    // active building's ground floor
    const forceOnActive = (
      pick: (events: EventCatalog) => (floor: Floor) => void,
    ) =>
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        pick(ev)(floor);
      });
    wireEventTestButtons(app, {
      kaleidoscope: forceOnActive((e) => e.forceKaleidoscopeEvent),
      zipper: forceOnActive((e) => e.forceZipperEvent),
      screensaver: forceOnActive((e) => e.forceScreensaverEvent),
      sprinkler: forceOnActive((e) => e.forceSprinklerEvent),
      clockwork: forceOnActive((e) => e.forceClockworkEvent),
      "hole-in-one": forceOnActive((e) => e.forceHoleInOneEvent),
      leapfrog: forceOnActive((e) => e.forceLeapfrogEvent),
      lineup: forceOnActive((e) => e.forceLineupEvent),
      stampede: forceOnActive((e) => e.forceStampedeEvent),
      wormhole: forceOnActive((e) => e.forceWormholeEvent),
      splat: forceOnActive((e) => e.forceSplatEvent),
      roulette: forceOnActive((e) => e.forceRouletteEvent),
      "free-kick": forceOnActive((e) => e.forceFreeKickEvent),
      slalom: forceOnActive((e) => e.forceSlalomEvent),
      lightning: forceOnActive((e) => e.forceLightningEvent),
      "fire-hose": forceOnActive((e) => e.forceFireHoseEvent),
      confluence: forceOnActive((e) => e.forceConfluenceEvent),
      slosh: forceOnActive((e) => e.forceSloshEvent),
      siphon: forceOnActive((e) => e.forceSiphonEvent),
      crossfire: forceOnActive((e) => e.forceCrossfireEvent),
      "gravity-well": forceOnActive((e) => e.forceGravityWellEvent),
      splashdown: forceOnActive((e) => e.forceSplashdownEvent),
      geysers: forceOnActive((e) => e.forceGeysersEvent),
      "cash-cannon": forceOnActive((e) => e.forceCashCannonEvent),
      hoover: forceOnActive((e) => e.forceHooverEvent),
      "air-show": forceOnActive((e) => e.forceAirShowEvent),
      leak: forceOnActive((e) => e.forceLeakEvent),
      climb: forceOnActive((e) => e.forceClimbEvent),
      kite: forceOnActive((e) => e.forceKiteEvent),
      rainbow: forceOnActive((e) => e.forceRainbowEvent),
      branches: forceOnActive((e) => e.forceBranchesEvent),
      "tug-of-war": forceOnActive((e) => e.forceTugOfWarEvent),
      waterwheel: forceOnActive((e) => e.forceWaterwheelEvent),
      braid: forceOnActive((e) => e.forceBraidEvent),
      skim: forceOnActive((e) => e.forceSkimEvent),
      lattice: forceOnActive((e) => e.forceLatticeEvent),
      fireworks: forceOnActive((e) => e.forceFireworksEvent),
      slingshot: forceOnActive((e) => e.forceSlingshotEvent),
      marquee: forceOnActive((e) => e.forceMarqueeEvent),
      "crop-duster": forceOnActive((e) => e.forceCropDusterEvent),
      bolas: forceOnActive((e) => e.forceBolasEvent),
      countdown: forceOnActive((e) => e.forceCountdownEvent),
      sparkler: forceOnActive((e) => e.forceSparklerEvent),
      slinky: forceOnActive((e) => e.forceSlinkyEvent),
      pipeline: forceOnActive((e) => e.forcePipelineEvent),
      prism: forceOnActive((e) => e.forcePrismEvent),
      trampoline: forceOnActive((e) => e.forceTrampolineEvent),
      hummingbird: forceOnActive((e) => e.forceHummingbirdEvent),
      "dive-bomb": forceOnActive((e) => e.forceDiveBombEvent),
      "ski-jump": forceOnActive((e) => e.forceSkiJumpEvent),
      jetpack: forceOnActive((e) => e.forceJetpackEvent),
      "bass-drop": forceOnActive((e) => e.forceBassDropEvent),
      scanner: forceOnActive((e) => e.forceScannerEvent),
      "laser-grid": forceOnActive((e) => e.forceLaserGridEvent),
      etch: forceOnActive((e) => e.forceEtchEvent),
      searchlights: forceOnActive((e) => e.forceSearchlightsEvent),
      "tractor-beam": forceOnActive((e) => e.forceTractorBeamEvent),
      "beam-clash": forceOnActive((e) => e.forceBeamClashEvent),
      butterfly: forceOnActive((e) => e.forceButterflyEvent),
      kelp: forceOnActive((e) => e.forceKelpEvent),
      "pendulum-wave": forceOnActive((e) => e.forcePendulumWaveEvent),
      formation: forceOnActive((e) => e.forceFormationEvent),
      ouroboros: forceOnActive((e) => e.forceOuroborosEvent),
      bowstring: forceOnActive((e) => e.forceBowstringEvent),
      superlaser: forceOnActive((e) => e.forceSuperlaserEvent),
      "ion-storm": forceOnActive((e) => e.forceIonStormEvent),
      glitch: forceOnActive((e) => e.forceGlitchEvent),
      magnifier: forceOnActive((e) => e.forceMagnifierEvent),
      "water-show": forceOnActive((e) => e.forceWaterShowEvent),
      mercury: forceOnActive((e) => e.forceMercuryEvent),
      alignment: forceOnActive((e) => e.forceAlignmentEvent),
      dandelion: forceOnActive((e) => e.forceDandelionEvent),
      bobber: forceOnActive((e) => e.forceBobberEvent),
      fishing: forceOnActive((e) => e.forceFishingEvent),
      scissors: forceOnActive((e) => e.forceScissorsEvent),
      "pulse-rifle": forceOnActive((e) => e.forcePulseRifleEvent),
      split: forceOnActive((e) => e.forceSplitEvent),
      pixelate: forceOnActive((e) => e.forcePixelateEvent),
      "dam-burst": forceOnActive((e) => e.forceDamBurstEvent),
      spiderweb: forceOnActive((e) => e.forceSpiderwebEvent),
      curtain: forceOnActive((e) => e.forceCurtainEvent),
      jellyfish: forceOnActive((e) => e.forceJellyfishEvent),
      polarity: forceOnActive((e) => e.forcePolarityEvent),
      collider: forceOnActive((e) => e.forceColliderEvent),
      sheepdog: forceOnActive((e) => e.forceSheepdogEvent),
      dragon: forceOnActive((e) => e.forceDragonEvent),
      reflector: forceOnActive((e) => e.forceReflectorEvent),
      "cookie-cutter": forceOnActive((e) => e.forceCookieCutterEvent),
      cinematic: forceOnActive((e) => e.forceCinematicEvent),
      negative: forceOnActive((e) => e.forceNegativeEvent),
      "chain-lightning": forceOnActive((e) => e.forceChainLightningEvent),
      "lock-on": forceOnActive((e) => e.forceLockOnEvent),
      stitch: forceOnActive((e) => e.forceStitchEvent),
      stockpile: forceOnActive((e) => e.forceStockpileEvent),
      "spot-weld": forceOnActive((e) => e.forceSpotWeldEvent),
      reels: forceOnActive((e) => e.forceReelsEvent),
      "cash-shower": forceOnActive((e) => e.forceCashShowerEvent),
      "catherine-wheel": forceOnActive((e) => e.forceCatherineWheelEvent),
      multiball: forceOnActive((e) => e.forceMultiballEvent),
      whip: forceOnActive((e) => e.forceWhipEvent),
      battery: forceOnActive((e) => e.forceBatteryEvent),
      "tesla-coil": forceOnActive((e) => e.forceTeslaCoilEvent),
      "jacobs-ladder": forceOnActive((e) => e.forceJacobsLadderEvent),
      "comic-book": forceOnActive((e) => e.forceComicBookEvent),
      avalanche: forceOnActive((e) => e.forceAvalancheEvent),
      beehive: forceOnActive((e) => e.forceBeehiveEvent),
      pogo: forceOnActive((e) => e.forcePogoEvent),
      "laser-harp": forceOnActive((e) => e.forceLaserHarpEvent),
      lichtenberg: forceOnActive((e) => e.forceLichtenbergEvent),
      shatter: forceOnActive((e) => e.forceShatterEvent),
      funnel: forceOnActive((e) => e.forceFunnelEvent),
      grapple: forceOnActive((e) => e.forceGrappleEvent),
      surf: forceOnActive((e) => e.forceSurfEvent),
      "laser-tag": forceOnActive((e) => e.forceLaserTagEvent),
      "ball-lightning": forceOnActive((e) => e.forceBallLightningEvent),
      "event-horizon": forceOnActive((e) => e.forceEventHorizonEvent),
      "tile-flip": forceOnActive((e) => e.forceTileFlipEvent),
      gusher: forceOnActive((e) => e.forceGusherEvent),
      pinata: forceOnActive((e) => e.forcePinataEvent),
      "gift-wrap": forceOnActive((e) => e.forceGiftWrapEvent),
      triangulate: forceOnActive((e) => e.forceTriangulateEvent),
      "spark-of-life": forceOnActive((e) => e.forceSparkOfLifeEvent),
      "glass-rain": forceOnActive((e) => e.forceGlassRainEvent),
      fold: forceOnActive((e) => e.forceFoldEvent),
      cocoon: forceOnActive((e) => e.forceCocoonEvent),
      "gravity-assist": forceOnActive((e) => e.forceGravityAssistEvent),
      "zip-line": forceOnActive((e) => e.forceZipLineEvent),
      breach: forceOnActive((e) => e.forceBreachEvent),
      "storm-surge": forceOnActive((e) => e.forceStormSurgeEvent),
      "smash-and-grab": forceOnActive((e) => e.forceSmashAndGrabEvent),
      "shrink-ray": forceOnActive((e) => e.forceShrinkRayEvent),
      sandstorm: forceOnActive((e) => e.forceSandstormEvent),
      juggernaut: forceOnActive((e) => e.forceJuggernautEvent),
      "fuel-line": forceOnActive((e) => e.forceFuelLineEvent),
      checkout: forceOnActive((e) => e.forceCheckoutEvent),
      "lightning-rod": forceOnActive((e) => e.forceLightningRodEvent),
      flag: forceOnActive((e) => e.forceFlagEvent),
      terraces: forceOnActive((e) => e.forceTerracesEvent),
      "battering-ram": forceOnActive((e) => e.forceBatteringRamEvent),
      tetherball: forceOnActive((e) => e.forceTetherballEvent),
      projector: forceOnActive((e) => e.forceProjectorEvent),
      clear: forceOnActive((e) => e.forceClearEvent),
      "infinity-mirror": forceOnActive((e) => e.forceInfinityMirrorEvent),
      elevator: forceOnActive((e) => e.forceElevatorEvent),
      migration: forceOnActive((e) => e.forceMigrationEvent),
      corkscrew: forceOnActive((e) => e.forceCorkscrewEvent),
      "mirror-ball": forceOnActive((e) => e.forceMirrorBallEvent),
      "plasma-globe": forceOnActive((e) => e.forcePlasmaGlobeEvent),
      jelly: forceOnActive((e) => e.forceJellyEvent),
      shockwave: forceOnActive((e) => e.forceShockwaveEvent),
      "pass-the-parcel": forceOnActive((e) => e.forcePassTheParcelEvent),
      "garden-hose": forceOnActive((e) => e.forceGardenHoseEvent),
      "burning-glass": forceOnActive((e) => e.forceBurningGlassEvent),
      "storm-front": forceOnActive((e) => e.forceStormFrontEvent),
      "slide-puzzle": forceOnActive((e) => e.forceSlidePuzzleEvent),
      whirlpool: forceOnActive((e) => e.forceWhirlpoolEvent),
      satellites: forceOnActive((e) => e.forceSatellitesEvent),
      typewriter: forceOnActive((e) => e.forceTypewriterEvent),
      railgun: forceOnActive((e) => e.forceRailgunEvent),
      thunderdome: forceOnActive((e) => e.forceThunderdomeEvent),
      melt: forceOnActive((e) => e.forceMeltEvent),
      flood: forceOnActive((e) => e.forceFloodEvent),
      "pied-piper": forceOnActive((e) => e.forcePiedPiperEvent),
      tentacles: forceOnActive((e) => e.forceTentaclesEvent),
      "laser-pendulum": forceOnActive((e) => e.forceLaserPendulumEvent),
      "electric-eel": forceOnActive((e) => e.forceElectricEelEvent),
      "double-vision": forceOnActive((e) => e.forceDoubleVisionEvent),
      honey: forceOnActive((e) => e.forceHoneyEvent),
      "musical-chairs": forceOnActive((e) => e.forceMusicalChairsEvent),
      "bubble-wand": forceOnActive((e) => e.forceBubbleWandEvent),
      hyperspace: forceOnActive((e) => e.forceHyperspaceEvent),
      javelin: forceOnActive((e) => e.forceJavelinEvent),
      shuffle: forceOnActive((e) => e.forceShuffleEvent),
      "mushroom-cloud": forceOnActive((e) => e.forceMushroomCloudEvent),
      relay: forceOnActive((e) => e.forceRelayEvent),
      "laser-pointer": forceOnActive((e) => e.forceLaserPointerEvent),
      "storm-chaser": forceOnActive((e) => e.forceStormChaserEvent),
      "bait-ball": forceOnActive((e) => e.forceBaitBallEvent),
      "video-wall": forceOnActive((e) => e.forceVideoWallEvent),
      ferrofluid: forceOnActive((e) => e.forceFerrofluidEvent),
      "hide-and-seek": forceOnActive((e) => e.forceHideAndSeekEvent),
      "magic-carpet": forceOnActive((e) => e.forceMagicCarpetEvent),
      spirograph: forceOnActive((e) => e.forceSpirographEvent),
      "electric-net": forceOnActive((e) => e.forceElectricNetEvent),
      demolition: forceOnActive((e) => e.forceDemolitionEvent),
      "shooting-gallery": forceOnActive((e) => e.forceShootingGalleryEvent),
      collapse: forceOnActive((e) => e.forceCollapseEvent),
      volcano: forceOnActive((e) => e.forceVolcanoEvent),
      skydivers: forceOnActive((e) => e.forceSkydiversEvent),
      speedboat: forceOnActive((e) => e.forceSpeedboatEvent),
      peacock: forceOnActive((e) => e.forcePeacockEvent),
      "storm-wings": forceOnActive((e) => e.forceStormWingsEvent),
      "cluster-bomb": forceOnActive((e) => e.forceClusterBombEvent),
      "strafing-run": forceOnActive((e) => e.forceStrafingRunEvent),
      "stained-glass": forceOnActive((e) => e.forceStainedGlassEvent),
      uprising: forceOnActive((e) => e.forceUprisingEvent),
      "swing-ride": forceOnActive((e) => e.forceSwingRideEvent),
      lawnmower: forceOnActive((e) => e.forceLawnmowerEvent),
      "light-show": forceOnActive((e) => e.forceLightShowEvent),
      "bug-zapper": forceOnActive((e) => e.forceBugZapperEvent),
      firecrackers: forceOnActive((e) => e.forceFirecrackersEvent),
      "six-shooter": forceOnActive((e) => e.forceSixShooterEvent),
      thermal: forceOnActive((e) => e.forceThermalEvent),
      stalactites: forceOnActive((e) => e.forceStalactitesEvent),
      kintsugi: forceOnActive((e) => e.forceKintsugiEvent),
      galaxy: forceOnActive((e) => e.forceGalaxyEvent),
      snowdrift: forceOnActive((e) => e.forceSnowdriftEvent),
      snowball: forceOnActive((e) => e.forceSnowballEvent),
      cartwheel: forceOnActive((e) => e.forceCartwheelEvent),
      matryoshka: forceOnActive((e) => e.forceMatryoshkaEvent),
      "salmon-run": forceOnActive((e) => e.forceSalmonRunEvent),
      "moon-tide": forceOnActive((e) => e.forceMoonTideEvent),
      "candy-floss": forceOnActive((e) => e.forceCandyFlossEvent),
      "figure-skater": forceOnActive((e) => e.forceFigureSkaterEvent),
      tripwire: forceOnActive((e) => e.forceTripwireEvent),
      sunrise: forceOnActive((e) => e.forceSunriseEvent),
      rally: forceOnActive((e) => e.forceRallyEvent),
      ignition: forceOnActive((e) => e.forceIgnitionEvent),
      trident: forceOnActive((e) => e.forceTridentEvent),
      crawl: forceOnActive((e) => e.forceCrawlEvent),
      "carpet-bombing": forceOnActive((e) => e.forceCarpetBombingEvent),
      "time-bomb": forceOnActive((e) => e.forceTimeBombEvent),
      "bunker-buster": forceOnActive((e) => e.forceBunkerBusterEvent),
      "grenade-toss": forceOnActive((e) => e.forceGrenadeTossEvent),
      "depth-charges": forceOnActive((e) => e.forceDepthChargesEvent),
      "firing-squad": forceOnActive((e) => e.forceFiringSquadEvent),
      akimbo: forceOnActive((e) => e.forceAkimboEvent),
      "flak-barrage": forceOnActive((e) => e.forceFlakBarrageEvent),
      "sniper-nest": forceOnActive((e) => e.forceSniperNestEvent),
      rewind: forceOnActive((e) => e.forceRewindEvent),
      "morse-code": forceOnActive((e) => e.forceMorseCodeEvent),
      "stadium-wave": forceOnActive((e) => e.forceStadiumWaveEvent),
      "knights-tour": forceOnActive((e) => e.forceKnightsTourEvent),
      "lava-lamp": forceOnActive((e) => e.forceLavaLampEvent),
      dominoes: forceOnActive((e) => e.forceDominoesEvent),
      inkblot: forceOnActive((e) => e.forceInkblotEvent),
      "soft-serve": forceOnActive((e) => e.forceSoftServeEvent),
      "dollar-sign": forceOnActive((e) => e.forceDollarSignEvent),
      mobius: forceOnActive((e) => e.forceMobiusEvent),
      "swiss-roll": forceOnActive((e) => e.forceSwissRollEvent),
      dodgeball: forceOnActive((e) => e.forceDodgeballEvent),
      "conga-line": forceOnActive((e) => e.forceCongaLineEvent),
      "spinning-top": forceOnActive((e) => e.forceSpinningTopEvent),
      gobbler: forceOnActive((e) => e.forceGobblerEvent),
      majorette: forceOnActive((e) => e.forceMajoretteEvent),
      "hula-hoop": forceOnActive((e) => e.forceHulaHoopEvent),
      calligraphy: forceOnActive((e) => e.forceCalligraphyEvent),
      "snake-charmer": forceOnActive((e) => e.forceSnakeCharmerEvent),
      "plate-spinner": forceOnActive((e) => e.forcePlateSpinnerEvent),
      "ferris-wheel": forceOnActive((e) => e.forceFerrisWheelEvent),
      "bucket-brigade": forceOnActive((e) => e.forceBucketBrigadeEvent),
      "sky-lanterns": forceOnActive((e) => e.forceSkyLanternsEvent),
      engraver: forceOnActive((e) => e.forceEngraverEvent),
      "x-ray": forceOnActive((e) => e.forceXRayEvent),
      "laser-lasso": forceOnActive((e) => e.forceLaserLassoEvent),
      "hex-ring": forceOnActive((e) => e.forceHexRingEvent),
      portcullis: forceOnActive((e) => e.forcePortcullisEvent),
      keyhole: forceOnActive((e) => e.forceKeyholeEvent),
      defibrillator: forceOnActive((e) => e.forceDefibrillatorEvent),
      "circuit-board": forceOnActive((e) => e.forceCircuitBoardEvent),
      mjolnir: forceOnActive((e) => e.forceMjolnirEvent),
      "arc-flash": forceOnActive((e) => e.forceArcFlashEvent),
      "four-corners": forceOnActive((e) => e.forceFourCornersEvent),
      "bolt-wheel": forceOnActive((e) => e.forceBoltWheelEvent),
      minefield: forceOnActive((e) => e.forceMinefieldEvent),
      cannonade: forceOnActive((e) => e.forceCannonadeEvent),
      "sticky-bombs": forceOnActive((e) => e.forceStickyBombsEvent),
      crossblast: forceOnActive((e) => e.forceCrossblastEvent),
      mortar: forceOnActive((e) => e.forceMortarEvent),
      flashbang: forceOnActive((e) => e.forceFlashbangEvent),
      "sentry-turret": forceOnActive((e) => e.forceSentryTurretEvent),
      shotgun: forceOnActive((e) => e.forceShotgunEvent),
      "boss-fight": forceOnActive((e) => e.forceBossFightEvent),
      gunship: forceOnActive((e) => e.forceGunshipEvent),
      "bullet-time": forceOnActive((e) => e.forceBulletTimeEvent),
      flechettes: forceOnActive((e) => e.forceFlechettesEvent),
      radar: forceOnActive((e) => e.forceRadarEvent),
      bingo: forceOnActive((e) => e.forceBingoEvent),
      "lane-hopper": forceOnActive((e) => e.forceLaneHopperEvent),
      "simon-says": forceOnActive((e) => e.forceSimonSaysEvent),
      equalizer: forceOnActive((e) => e.forceEqualizerEvent),
      "loading-bar": forceOnActive((e) => e.forceLoadingBarEvent),
      "dice-roll": forceOnActive((e) => e.forceDiceRollEvent),
      mandala: forceOnActive((e) => e.forceMandalaEvent),
      "zen-garden": forceOnActive((e) => e.forceZenGardenEvent),
      accordion: forceOnActive((e) => e.forceAccordionEvent),
      fizz: forceOnActive((e) => e.forceFizzEvent),
      soundwave: forceOnActive((e) => e.forceSoundwaveEvent),
      taffy: forceOnActive((e) => e.forceTaffyEvent),
      "drip-painting": forceOnActive((e) => e.forceDripPaintingEvent),
      moths: forceOnActive((e) => e.forceMothsEvent),
      curling: forceOnActive((e) => e.forceCurlingEvent),
      clothesline: forceOnActive((e) => e.forceClotheslineEvent),
      "balloon-pop": forceOnActive((e) => e.forceBalloonPopEvent),
      "spin-bottle": forceOnActive((e) => e.forceSpinBottleEvent),
      "sky-writer": forceOnActive((e) => e.forceSkyWriterEvent),
      "gold-pan": forceOnActive((e) => e.forceGoldPanEvent),
      bulldozer: forceOnActive((e) => e.forceBulldozerEvent),
      "koi-pond": forceOnActive((e) => e.forceKoiPondEvent),
      "pipe-organ": forceOnActive((e) => e.forcePipeOrganEvent),
      "ant-trail": forceOnActive((e) => e.forceAntTrailEvent),
      "hot-air-balloon": forceOnActive((e) => e.forceHotAirBalloonEvent),
      "lens-flare": forceOnActive((e) => e.forceLensFlareEvent),
      tightrope: forceOnActive((e) => e.forceTightropeEvent),
      "neon-sign": forceOnActive((e) => e.forceNeonSignEvent),
      "light-cage": forceOnActive((e) => e.forceLightCageEvent),
      stairway: forceOnActive((e) => e.forceStairwayEvent),
      beacons: forceOnActive((e) => e.forceBeaconsEvent),
      "anvil-crawler": forceOnActive((e) => e.forceAnvilCrawlerEvent),
      neurons: forceOnActive((e) => e.forceNeuronsEvent),
      "bottled-bolt": forceOnActive((e) => e.forceBottledBoltEvent),
      thunderbird: forceOnActive((e) => e.forceThunderbirdEvent),
      "spark-gap": forceOnActive((e) => e.forceSparkGapEvent),
      "static-shock": forceOnActive((e) => e.forceStaticShockEvent),
      "rocket-jump": forceOnActive((e) => e.forceRocketJumpEvent),
      torpedoes: forceOnActive((e) => e.forceTorpedoesEvent),
      airstrike: forceOnActive((e) => e.forceAirstrikeEvent),
      dambuster: forceOnActive((e) => e.forceDambusterEvent),
      airburst: forceOnActive((e) => e.forceAirburstEvent),
      "bomb-pinwheel": forceOnActive((e) => e.forceBombPinwheelEvent),
      "bullet-curtain": forceOnActive((e) => e.forceBulletCurtainEvent),
      "trick-shot": forceOnActive((e) => e.forceTrickShotEvent),
      "rail-shooter": forceOnActive((e) => e.forceRailShooterEvent),
      "skeet-shoot": forceOnActive((e) => e.forceSkeetShootEvent),
      "triple-tap": forceOnActive((e) => e.forceTripleTapEvent),
      "tommy-gun": forceOnActive((e) => e.forceTommyGunEvent),
      sweeper: forceOnActive((e) => e.forceSweeperEvent),
      "claw-machine": forceOnActive((e) => e.forceClawMachineEvent),
      lottery: forceOnActive((e) => e.forceLotteryEvent),
      "word-guess": forceOnActive((e) => e.forceWordGuessEvent),
      "memory-match": forceOnActive((e) => e.forceMemoryMatchEvent),
      "tic-tac-toe": forceOnActive((e) => e.forceTicTacToeEvent),
      "rev-counter": forceOnActive((e) => e.forceRevCounterEvent),
      sluice: forceOnActive((e) => e.forceSluiceEvent),
      foundry: forceOnActive((e) => e.forceFoundryEvent),
      "jet-stream": forceOnActive((e) => e.forceJetStreamEvent),
      moat: forceOnActive((e) => e.forceMoatEvent),
      seep: forceOnActive((e) => e.forceSeepEvent),
      meander: forceOnActive((e) => e.forceMeanderEvent),
      waltz: forceOnActive((e) => e.forceWaltzEvent),
      gyroscope: forceOnActive((e) => e.forceGyroscopeEvent),
      dragonfly: forceOnActive((e) => e.forceDragonflyEvent),
      "ring-toss": forceOnActive((e) => e.forceRingTossEvent),
      slipstream: forceOnActive((e) => e.forceSlipstreamEvent),
      "sheet-music": forceOnActive((e) => e.forceSheetMusicEvent),
      "leaf-blower": forceOnActive((e) => e.forceLeafBlowerEvent),
      loom: forceOnActive((e) => e.forceLoomEvent),
      "high-dive": forceOnActive((e) => e.forceHighDiveEvent),
      sower: forceOnActive((e) => e.forceSowerEvent),
      courier: forceOnActive((e) => e.forceCourierEvent),
      rodeo: forceOnActive((e) => e.forceRodeoEvent),
      crosshair: forceOnActive((e) => e.forceCrosshairEvent),
      iris: forceOnActive((e) => e.forceIrisEvent),
      "bank-shot": forceOnActive((e) => e.forceBankShotEvent),
      sunbeams: forceOnActive((e) => e.forceSunbeamsEvent),
      stargate: forceOnActive((e) => e.forceStargateEvent),
      "cats-cradle": forceOnActive((e) => e.forceCatsCradleEvent),
      thunderhead: forceOnActive((e) => e.forceThunderheadEvent),
      pitchfork: forceOnActive((e) => e.forcePitchforkEvent),
      "jumper-cables": forceOnActive((e) => e.forceJumperCablesEvent),
      lash: forceOnActive((e) => e.forceLashEvent),
      "spark-plug": forceOnActive((e) => e.forceSparkPlugEvent),
      "live-wire": forceOnActive((e) => e.forceLiveWireEvent),
      "fuse-race": forceOnActive((e) => e.forceFuseRaceEvent),
      "bouncing-betty": forceOnActive((e) => e.forceBouncingBettyEvent),
      "pressure-cooker": forceOnActive((e) => e.forcePressureCookerEvent),
      "hot-potato": forceOnActive((e) => e.forceHotPotatoEvent),
      "daisy-chain": forceOnActive((e) => e.forceDaisyChainEvent),
      "shaped-charge": forceOnActive((e) => e.forceShapedChargeEvent),
      detcord: forceOnActive((e) => e.forceDetcordEvent),
      "bullet-bloom": forceOnActive((e) => e.forceBulletBloomEvent),
      "high-noon": forceOnActive((e) => e.forceHighNoonEvent),
      hailfire: forceOnActive((e) => e.forceHailfireEvent),
      dervish: forceOnActive((e) => e.forceDervishEvent),
      invaders: forceOnActive((e) => e.forceInvadersEvent),
      "gun-kata": forceOnActive((e) => e.forceGunKataEvent),
      lockbuster: forceOnActive((e) => e.forceLockbusterEvent),
      "connect-four": forceOnActive((e) => e.forceConnectFourEvent),
      combo: forceOnActive((e) => e.forceComboEvent),
      "skee-ball": forceOnActive((e) => e.forceSkeeBallEvent),
      "bubble-shooter": forceOnActive((e) => e.forceBubbleShooterEvent),
      delta: forceOnActive((e) => e.forceDeltaEvent),
      hydrant: forceOnActive((e) => e.forceHydrantEvent),
      cloverleaf: forceOnActive((e) => e.forceCloverleafEvent),
      pinstripe: forceOnActive((e) => e.forcePinstripeEvent),
      faucet: forceOnActive((e) => e.forceFaucetEvent),
      showerhead: forceOnActive((e) => e.forceShowerheadEvent),
      "binary-star": forceOnActive((e) => e.forceBinaryStarEvent),
      hopscotch: forceOnActive((e) => e.forceHopscotchEvent),
      tadpoles: forceOnActive((e) => e.forceTadpolesEvent),
      blink: forceOnActive((e) => e.forceBlinkEvent),
      "bumper-cars": forceOnActive((e) => e.forceBumperCarsEvent),
      pigeons: forceOnActive((e) => e.forcePigeonsEvent),
      squid: forceOnActive((e) => e.forceSquidEvent),
      "water-pistol": forceOnActive((e) => e.forceWaterPistolEvent),
      poi: forceOnActive((e) => e.forcePoiEvent),
      bartender: forceOnActive((e) => e.forceBartenderEvent),
      "pole-vault": forceOnActive((e) => e.forcePoleVaultEvent),
      "paint-roller": forceOnActive((e) => e.forcePaintRollerEvent),
      buzzsaw: forceOnActive((e) => e.forceBuzzsawEvent),
      "light-cycles": forceOnActive((e) => e.forceLightCyclesEvent),
      "fiber-optic": forceOnActive((e) => e.forceFiberOpticEvent),
      "daddy-longlegs": forceOnActive((e) => e.forceDaddyLonglegsEvent),
      knighthood: forceOnActive((e) => e.forceKnighthoodEvent),
      "cutting-torch": forceOnActive((e) => e.forceCuttingTorchEvent),
      "st-elmos-fire": forceOnActive((e) => e.forceStElmosFireEvent),
      "stepped-leader": forceOnActive((e) => e.forceSteppedLeaderEvent),
      trolley: forceOnActive((e) => e.forceTrolleyEvent),
      "bolt-bounce": forceOnActive((e) => e.forceBoltBounceEvent),
      "storm-crown": forceOnActive((e) => e.forceStormCrownEvent),
      "van-de-graaff": forceOnActive((e) => e.forceVanDeGraaffEvent),
      "barrel-roll": forceOnActive((e) => e.forceBarrelRollEvent),
      "bomb-stack": forceOnActive((e) => e.forceBombStackEvent),
      "roman-candle": forceOnActive((e) => e.forceRomanCandleEvent),
      whistlers: forceOnActive((e) => e.forceWhistlersEvent),
      trebuchet: forceOnActive((e) => e.forceTrebuchetEvent),
      "drop-pods": forceOnActive((e) => e.forceDropPodsEvent),
      "bomb-carousel": forceOnActive((e) => e.forceBombCarouselEvent),
      "last-stand": forceOnActive((e) => e.forceLastStandEvent),
      "tin-can": forceOnActive((e) => e.forceTinCanEvent),
      "point-defense": forceOnActive((e) => e.forcePointDefenseEvent),
      "target-practice": forceOnActive((e) => e.forceTargetPracticeEvent),
      "flare-gun": forceOnActive((e) => e.forceFlareGunEvent),
      rappel: forceOnActive((e) => e.forceRappelEvent),
      stacker: forceOnActive((e) => e.forceStackerEvent),
      "coin-pusher": forceOnActive((e) => e.forceCoinPusherEvent),
      "high-striker": forceOnActive((e) => e.forceHighStrikerEvent),
      "note-highway": forceOnActive((e) => e.forceNoteHighwayEvent),
      safecracker: forceOnActive((e) => e.forceSafecrackerEvent),
      "gumball-machine": forceOnActive((e) => e.forceGumballMachineEvent),
      ninja: forceOnActive((e) => e.forceNinjaEvent),
      bungee: forceOnActive((e) => e.forceBungeeEvent),
      "funnel-cake": forceOnActive((e) => e.forceFunnelCakeEvent),
      chrysanthemum: forceOnActive((e) => e.forceChrysanthemumEvent),
      crossroads: forceOnActive((e) => e.forceCrossroadsEvent),
      waterslide: forceOnActive((e) => e.forceWaterslideEvent),
      banner: forceOnActive((e) => e.forceBannerEvent),
      haunt: forceOnActive((e) => e.forceHauntEvent),
      "maple-seeds": forceOnActive((e) => e.forceMapleSeedsEvent),
      donuts: forceOnActive((e) => e.forceDonutsEvent),
      "hamster-wheel": forceOnActive((e) => e.forceHamsterWheelEvent),
      "lunar-lander": forceOnActive((e) => e.forceLunarLanderEvent),
      dowsing: forceOnActive((e) => e.forceDowsingEvent),
      matador: forceOnActive((e) => e.forceMatadorEvent),
      "flash-flood": forceOnActive((e) => e.forceFlashFloodEvent),
      dolphin: forceOnActive((e) => e.forceDolphinEvent),
      puffer: forceOnActive((e) => e.forcePufferEvent),
      "hockey-stop": forceOnActive((e) => e.forceHockeyStopEvent),
      twirl: forceOnActive((e) => e.forceTwirlEvent),
      whale: forceOnActive((e) => e.forceWhaleEvent),
      "light-painting": forceOnActive((e) => e.forceLightPaintingEvent),
      "saber-throw": forceOnActive((e) => e.forceSaberThrowEvent),
      "laser-maze": forceOnActive((e) => e.forceLaserMazeEvent),
      "tape-measure": forceOnActive((e) => e.forceTapeMeasureEvent),
      pulsar: forceOnActive((e) => e.forcePulsarEvent),
      "short-circuit": forceOnActive((e) => e.forceShortCircuitEvent),
      conductor: forceOnActive((e) => e.forceConductorEvent),
      "double-strike": forceOnActive((e) => e.forceDoubleStrikeEvent),
      "lightning-fence": forceOnActive((e) => e.forceLightningFenceEvent),
      "heat-lightning": forceOnActive((e) => e.forceHeatLightningEvent),
      "powder-kegs": forceOnActive((e) => e.forcePowderKegsEvent),
      "bomb-fountain": forceOnActive((e) => e.forceBombFountainEvent),
      "frag-out": forceOnActive((e) => e.forceFragOutEvent),
      "fault-line": forceOnActive((e) => e.forceFaultLineEvent),
      "willow-shells": forceOnActive((e) => e.forceWillowShellsEvent),
      "swarm-strike": forceOnActive((e) => e.forceSwarmStrikeEvent),
      concentric: forceOnActive((e) => e.forceConcentricEvent),
      graze: forceOnActive((e) => e.forceGrazeEvent),
      hotfoot: forceOnActive((e) => e.forceHotfootEvent),
      dogfight: forceOnActive((e) => e.forceDogfightEvent),
      "bullet-rose": forceOnActive((e) => e.forceBulletRoseEvent),
      "armor-piercer": forceOnActive((e) => e.forceArmorPiercerEvent),
      spotter: forceOnActive((e) => e.forceSpotterEvent),
      "peg-solitaire": forceOnActive((e) => e.forcePegSolitaireEvent),
      "marble-drop": forceOnActive((e) => e.forceMarbleDropEvent),
      statues: forceOnActive((e) => e.forceStatuesEvent),
      "flappy-wisp": forceOnActive((e) => e.forceFlappyWispEvent),
      "buried-treasure": forceOnActive((e) => e.forceBuriedTreasureEvent),
      "air-hockey": forceOnActive((e) => e.forceAirHockeyEvent),
      "bolt-of-cash": forceOnActive((e) => e.forceBoltOfCashEvent),
      "pendulum-pour": forceOnActive((e) => e.forcePendulumPourEvent),
      "pop-the-cork": forceOnActive((e) => e.forcePopTheCorkEvent),
      "wall-jump": forceOnActive((e) => e.forceWallJumpEvent),
      superball: forceOnActive((e) => e.forceSuperballEvent),
      "spin-dash": forceOnActive((e) => e.forceSpinDashEvent),
      cupid: forceOnActive((e) => e.forceCupidEvent),
      stork: forceOnActive((e) => e.forceStorkEvent),
      "paper-plane": forceOnActive((e) => e.forcePaperPlaneEvent),
      spike: forceOnActive((e) => e.forceSpikeEvent),
      toaster: forceOnActive((e) => e.forceToasterEvent),
      xylophone: forceOnActive((e) => e.forceXylophoneEvent),
      "birthday-candles": forceOnActive((e) => e.forceBirthdayCandlesEvent),
      "drop-tower": forceOnActive((e) => e.forceDropTowerEvent),
      "arrow-volley": forceOnActive((e) => e.forceArrowVolleyEvent),
      "make-a-wish": forceOnActive((e) => e.forceMakeAWishEvent),
      blunderbuss: forceOnActive((e) => e.forceBlunderbussEvent),
      genie: forceOnActive((e) => e.forceGenieEvent),
      "solar-flare": forceOnActive((e) => e.forceSolarFlareEvent),
      "heat-vision": forceOnActive((e) => e.forceHeatVisionEvent),
      "print-head": forceOnActive((e) => e.forcePrintHeadEvent),
      aurora: forceOnActive((e) => e.forceAuroraEvent),
      "thunder-rings": forceOnActive((e) => e.forceThunderRingsEvent),
      "arc-weld": forceOnActive((e) => e.forceArcWeldEvent),
      "storm-kite": forceOnActive((e) => e.forceStormKiteEvent),
      "volcanic-lightning": forceOnActive((e) => e.forceVolcanicLightningEvent),
      sculptor: forceOnActive((e) => e.forceSculptorEvent),
      "grand-finale": forceOnActive((e) => e.forceGrandFinaleEvent),
      "bomb-bouquet": forceOnActive((e) => e.forceBombBouquetEvent),
      cascade: forceOnActive((e) => e.forceCascadeEvent),
      "pinball-bomb": forceOnActive((e) => e.forcePinballBombEvent),
      "bomb-train": forceOnActive((e) => e.forceBombTrainEvent),
      "breaching-charge": forceOnActive((e) => e.forceBreachingChargeEvent),
      "confetti-cannon": forceOnActive((e) => e.forceConfettiCannonEvent),
      "ammo-belt": forceOnActive((e) => e.forceAmmoBeltEvent),
      gauntlet: forceOnActive((e) => e.forceGauntletEvent),
      "turret-tower": forceOnActive((e) => e.forceTurretTowerEvent),
      "shell-casings": forceOnActive((e) => e.forceShellCasingsEvent),
      darts: forceOnActive((e) => e.forceDartsEvent),
      battleship: forceOnActive((e) => e.forceBattleshipEvent),
      interceptors: forceOnActive((e) => e.forceInterceptorsEvent),
      "land-grab": forceOnActive((e) => e.forceLandGrabEvent),
      "duck-duck-goose": forceOnActive((e) => e.forceDuckDuckGooseEvent),
      ringer: forceOnActive((e) => e.forceRingerEvent),
      hurdles: forceOnActive((e) => e.forceHurdlesEvent),
      "lucky-roll": forceOnActive((e) => e.forceLuckyRollEvent),
      "cash-register": forceOnActive((e) => e.forceCashRegisterEvent),
      "horse-race": forceOnActive((e) => e.forceHorseRaceEvent),
      "dunk-tank": forceOnActive((e) => e.forceDunkTankEvent),
      "half-pipe": forceOnActive((e) => e.forceHalfPipeEvent),
      knot: forceOnActive((e) => e.forceKnotEvent),
      "ticker-tape": forceOnActive((e) => e.forceTickerTapeEvent),
      "cash-bridge": forceOnActive((e) => e.forceCashBridgeEvent),
      "skipping-stone": forceOnActive((e) => e.forceSkippingStoneEvent),
      woodpecker: forceOnActive((e) => e.forceWoodpeckerEvent),
      frisbee: forceOnActive((e) => e.forceFrisbeeEvent),
      kangaroo: forceOnActive((e) => e.forceKangarooEvent),
      badminton: forceOnActive((e) => e.forceBadmintonEvent),
      tumbleweed: forceOnActive((e) => e.forceTumbleweedEvent),
      "shuttle-run": forceOnActive((e) => e.forceShuttleRunEvent),
      echolocation: forceOnActive((e) => e.forceEcholocationEvent),
      lacrosse: forceOnActive((e) => e.forceLacrosseEvent),
      "jet-ski": forceOnActive((e) => e.forceJetSkiEvent),
      "drinking-straw": forceOnActive((e) => e.forceDrinkingStrawEvent),
      "sea-serpent": forceOnActive((e) => e.forceSeaSerpentEvent),
      "magic-trick": forceOnActive((e) => e.forceMagicTrickEvent),
      "fountain-pen": forceOnActive((e) => e.forceFountainPenEvent),
      spool: forceOnActive((e) => e.forceSpoolEvent),
      "laser-rain": forceOnActive((e) => e.forceLaserRainEvent),
      "cross-cut": forceOnActive((e) => e.forceCrossCutEvent),
      heliograph: forceOnActive((e) => e.forceHeliographEvent),
      starburst: forceOnActive((e) => e.forceStarburstEvent),
      "thunder-drum": forceOnActive((e) => e.forceThunderDrumEvent),
      "bolt-barrage": forceOnActive((e) => e.forceBoltBarrageEvent),
      coilgun: forceOnActive((e) => e.forceCoilgunEvent),
      snowflake: forceOnActive((e) => e.forceSnowflakeEvent),
      "bomb-snake": forceOnActive((e) => e.forceBombSnakeEvent),
      "spider-mines": forceOnActive((e) => e.forceSpiderMinesEvent),
      crossette: forceOnActive((e) => e.forceCrossetteEvent),
      "spiral-charge": forceOnActive((e) => e.forceSpiralChargeEvent),
      "bomb-bubbles": forceOnActive((e) => e.forceBombBubblesEvent),
      "rocket-sled": forceOnActive((e) => e.forceRocketSledEvent),
      "dynamite-fishing": forceOnActive((e) => e.forceDynamiteFishingEvent),
      "charge-shot": forceOnActive((e) => e.forceChargeShotEvent),
      "corkscrew-rounds": forceOnActive((e) => e.forceCorkscrewRoundsEvent),
      "orbital-guns": forceOnActive((e) => e.forceOrbitalGunsEvent),
      "tracer-rounds": forceOnActive((e) => e.forceTracerRoundsEvent),
      "pellet-storm": forceOnActive((e) => e.forcePelletStormEvent),
      "bullet-snake": forceOnActive((e) => e.forceBulletSnakeEvent),
      "rock-paper-scissors": forceOnActive(
        (e) => e.forceRockPaperScissorsEvent,
      ),
      limbo: forceOnActive((e) => e.forceLimboEvent),
      "quiz-show": forceOnActive((e) => e.forceQuizShowEvent),
      sumo: forceOnActive((e) => e.forceSumoEvent),
      "paper-toss": forceOnActive((e) => e.forcePaperTossEvent),
      "arm-wrestling": forceOnActive((e) => e.forceArmWrestlingEvent),
      "keepy-uppy": forceOnActive((e) => e.forceKeepyUppyEvent),
      "pin-the-tail": forceOnActive((e) => e.forcePinTheTailEvent),
      "trust-fall": forceOnActive((e) => e.forceTrustFallEvent),
      "bubble-gum": forceOnActive((e) => e.forceBubbleGumEvent),
      "canal-locks": forceOnActive((e) => e.forceCanalLocksEvent),
      bobsled: forceOnActive((e) => e.forceBobsledEvent),
      "spring-loaded": forceOnActive((e) => e.forceSpringLoadedEvent),
      influx: forceOnActive((e) => e.forceInfluxEvent),
      "uneven-bars": forceOnActive((e) => e.forceUnevenBarsEvent),
      bumblebee: forceOnActive((e) => e.forceBumblebeeEvent),
      "shot-put": forceOnActive((e) => e.forceShotPutEvent),
      "human-cannonball": forceOnActive((e) => e.forceHumanCannonballEvent),
      "fox-and-hounds": forceOnActive((e) => e.forceFoxAndHoundsEvent),
      kingfisher: forceOnActive((e) => e.forceKingfisherEvent),
      joust: forceOnActive((e) => e.forceJoustEvent),
      pelican: forceOnActive((e) => e.forcePelicanEvent),
      dragster: forceOnActive((e) => e.forceDragsterEvent),
      "fire-breather": forceOnActive((e) => e.forceFireBreatherEvent),
      "bucket-swing": forceOnActive((e) => e.forceBucketSwingEvent),
      puppeteer: forceOnActive((e) => e.forcePuppeteerEvent),
      corona: forceOnActive((e) => e.forceCoronaEvent),
      pillars: forceOnActive((e) => e.forcePillarsEvent),
      "laser-ladder": forceOnActive((e) => e.forceLaserLadderEvent),
      "beam-splitter": forceOnActive((e) => e.forceBeamSplitterEvent),
      teleporter: forceOnActive((e) => e.forceTeleporterEvent),
      "ring-light": forceOnActive((e) => e.forceRingLightEvent),
      taser: forceOnActive((e) => e.forceTaserEvent),
      "arc-furnace": forceOnActive((e) => e.forceArcFurnaceEvent),
      "five-fingers": forceOnActive((e) => e.forceFiveFingersEvent),
      "cattle-prod": forceOnActive((e) => e.forceCattleProdEvent),
      "bolt-sling": forceOnActive((e) => e.forceBoltSlingEvent),
      "colliding-storms": forceOnActive((e) => e.forceCollidingStormsEvent),
      "bomb-juggler": forceOnActive((e) => e.forceBombJugglerEvent),
      "bomb-squad": forceOnActive((e) => e.forceBombSquadEvent),
      splitter: forceOnActive((e) => e.forceSplitterEvent),
      "bomb-pendulum": forceOnActive((e) => e.forceBombPendulumEvent),
      paradrop: forceOnActive((e) => e.forceParadropEvent),
      "bomb-pachinko": forceOnActive((e) => e.forceBombPachinkoEvent),
      "fuse-clock": forceOnActive((e) => e.forceFuseClockEvent),
      hedgehog: forceOnActive((e) => e.forceHedgehogEvent),
      "split-shot": forceOnActive((e) => e.forceSplitShotEvent),
      "bullet-lasso": forceOnActive((e) => e.forceBulletLassoEvent),
      "bullet-weave": forceOnActive((e) => e.forceBulletWeaveEvent),
      "bullet-fountain": forceOnActive((e) => e.forceBulletFountainEvent),
      "covering-fire": forceOnActive((e) => e.forceCoveringFireEvent),
      checkers: forceOnActive((e) => e.forceCheckersEvent),
      minesweeper: forceOnActive((e) => e.forceMinesweeperEvent),
      "jack-in-the-box": forceOnActive((e) => e.forceJackInTheBoxEvent),
      spillway: forceOnActive((e) => e.forceSpillwayEvent),
      crosscurrents: forceOnActive((e) => e.forceCrosscurrentsEvent),
      oxbow: forceOnActive((e) => e.forceOxbowEvent),
      breakers: forceOnActive((e) => e.forceBreakersEvent),
      rivulets: forceOnActive((e) => e.forceRivuletsEvent),
      torrent: forceOnActive((e) => e.forceTorrentEvent),
      lissajous: forceOnActive((e) => e.forceLissajousEvent),
      "moon-hop": forceOnActive((e) => e.forceMoonHopEvent),
      peekaboo: forceOnActive((e) => e.forcePeekabooEvent),
      "tilt-a-whirl": forceOnActive((e) => e.forceTiltAWhirlEvent),
      "water-strider": forceOnActive((e) => e.forceWaterStriderEvent),
      "rope-climb": forceOnActive((e) => e.forceRopeClimbEvent),
      "paddle-steamer": forceOnActive((e) => e.forcePaddleSteamerEvent),
      "jet-wash": forceOnActive((e) => e.forceJetWashEvent),
      bellows: forceOnActive((e) => e.forceBellowsEvent),
      "rain-dance": forceOnActive((e) => e.forceRainDanceEvent),
      "ski-tow": forceOnActive((e) => e.forceSkiTowEvent),
      "ribbon-dancer": forceOnActive((e) => e.forceRibbonDancerEvent),
      "laser-turnstile": forceOnActive((e) => e.forceLaserTurnstileEvent),
      "light-bridge": forceOnActive((e) => e.forceLightBridgeEvent),
      "laser-web": forceOnActive((e) => e.forceLaserWebEvent),
      footlights: forceOnActive((e) => e.forceFootlightsEvent),
      "fusion-beam": forceOnActive((e) => e.forceFusionBeamEvent),
      pinpoint: forceOnActive((e) => e.forcePinpointEvent),
      galvanize: forceOnActive((e) => e.forceGalvanizeEvent),
      "spark-jump": forceOnActive((e) => e.forceSparkJumpEvent),
      "static-cling": forceOnActive((e) => e.forceStaticClingEvent),
      capacitor: forceOnActive((e) => e.forceCapacitorEvent),
      "spark-train": forceOnActive((e) => e.forceSparkTrainEvent),
      "arc-bridge": forceOnActive((e) => e.forceArcBridgeEvent),
      "daisy-cutter": forceOnActive((e) => e.forceDaisyCutterEvent),
      "ripple-mines": forceOnActive((e) => e.forceRippleMinesEvent),
      "bomb-yo-yo": forceOnActive((e) => e.forceBombYoYoEvent),
      "bomb-hail": forceOnActive((e) => e.forceBombHailEvent),
      "ground-pound": forceOnActive((e) => e.forceGroundPoundEvent),
      "cherry-bomb": forceOnActive((e) => e.forceCherryBombEvent),
      "bomb-crown": forceOnActive((e) => e.forceBombCrownEvent),
      "bullet-comb": forceOnActive((e) => e.forceBulletCombEvent),
      "bullet-braid": forceOnActive((e) => e.forceBulletBraidEvent),
      "bullet-cage": forceOnActive((e) => e.forceBulletCageEvent),
      gunslinger: forceOnActive((e) => e.forceGunslingerEvent),
      "bullet-wheel": forceOnActive((e) => e.forceBulletWheelEvent),
      "bullet-ladder": forceOnActive((e) => e.forceBulletLadderEvent),
      "whip-zoom": forceOnActive((e) => e.forceWhipZoomEvent),
      "iris-out": forceOnActive((e) => e.forceIrisOutEvent),
      "screen-reels": forceOnActive((e) => e.forceScreenReelsEvent),
      "gold-leaf": forceOnActive((e) => e.forceGoldLeafEvent),
      "pixel-storm": forceOnActive((e) => e.forcePixelStormEvent),
      "gravity-flip": forceOnActive((e) => e.forceGravityFlipEvent),
      echo: forceOnActive((e) => e.forceEchoEvent),
      "mirror-box": forceOnActive((e) => e.forceMirrorBoxEvent),
      "pull-back": forceOnActive((e) => e.forcePullBackEvent),
      treadmill: forceOnActive((e) => e.forceTreadmillEvent),
      "blast-off": forceOnActive((e) => e.forceBlastOffEvent),
      "pop-up": forceOnActive((e) => e.forcePopUpEvent),
      "sticker-peel": forceOnActive((e) => e.forceStickerPeelEvent),
      glissando: forceOnActive((e) => e.forceGlissandoEvent),
      "vault-doors": forceOnActive((e) => e.forceVaultDoorsEvent),
      "champagne-tower": forceOnActive((e) => e.forceChampagneTowerEvent),
      "pinball-river": forceOnActive((e) => e.forcePinballRiverEvent),
      "pressure-washer": forceOnActive((e) => e.forcePressureWasherEvent),
      irrigation: forceOnActive((e) => e.forceIrrigationEvent),
      waterspout: forceOnActive((e) => e.forceWaterspoutEvent),
      sidewinder: forceOnActive((e) => e.forceSidewinderEvent),
      "orbit-swap": forceOnActive((e) => e.forceOrbitSwapEvent),
      cuckoo: forceOnActive((e) => e.forceCuckooEvent),
      gyre: forceOnActive((e) => e.forceGyreEvent),
      "bar-hop": forceOnActive((e) => e.forceBarHopEvent),
      "comet-plow": forceOnActive((e) => e.forceCometPlowEvent),
      "hose-reel": forceOnActive((e) => e.forceHoseReelEvent),
      "geyser-rider": forceOnActive((e) => e.forceGeyserRiderEvent),
      "bubble-blower": forceOnActive((e) => e.forceBubbleBlowerEvent),
      "pool-dive": forceOnActive((e) => e.forcePoolDiveEvent),
      "rubber-band": forceOnActive((e) => e.forceRubberBandEvent),
      "beam-vise": forceOnActive((e) => e.forceBeamViseEvent),
      "laser-rake": forceOnActive((e) => e.forceLaserRakeEvent),
      "light-dominoes": forceOnActive((e) => e.forceLightDominoesEvent),
      "pry-bar": forceOnActive((e) => e.forcePryBarEvent),
      "tesla-tennis": forceOnActive((e) => e.forceTeslaTennisEvent),
      "tuning-fork": forceOnActive((e) => e.forceTuningForkEvent),
      "bolt-spiral": forceOnActive((e) => e.forceBoltSpiralEvent),
      "ground-current": forceOnActive((e) => e.forceGroundCurrentEvent),
      overcharge: forceOnActive((e) => e.forceOverchargeEvent),
      "bomb-tornado": forceOnActive((e) => e.forceBombTornadoEvent),
      "bomb-boomerang": forceOnActive((e) => e.forceBombBoomerangEvent),
      multistage: forceOnActive((e) => e.forceMultistageEvent),
      "bomb-pile": forceOnActive((e) => e.forceBombPileEvent),
      "bomb-garland": forceOnActive((e) => e.forceBombGarlandEvent),
      "homing-rounds": forceOnActive((e) => e.forceHomingRoundsEvent),
      "wave-cannon": forceOnActive((e) => e.forceWaveCannonEvent),
      snapback: forceOnActive((e) => e.forceSnapbackEvent),
      "bullet-funnel": forceOnActive((e) => e.forceBulletFunnelEvent),
      crisscross: forceOnActive((e) => e.forceCrisscrossEvent),
      "chain-fountain": forceOnActive((e) => e.forceChainFountainEvent),
      "smoke-rings": forceOnActive((e) => e.forceSmokeRingsEvent),
      "water-salute": forceOnActive((e) => e.forceWaterSaluteEvent),
      "double-pendulum": forceOnActive((e) => e.forceDoublePendulumEvent),
      trapeze: forceOnActive((e) => e.forceTrapezeEvent),
      diabolo: forceOnActive((e) => e.forceDiaboloEvent),
      zorb: forceOnActive((e) => e.forceZorbEvent),
      "hoop-dive": forceOnActive((e) => e.forceHoopDiveEvent),
      "spin-art": forceOnActive((e) => e.forceSpinArtEvent),
      "paper-cutter": forceOnActive((e) => e.forcePaperCutterEvent),
      flippers: forceOnActive((e) => e.forceFlippersEvent),
      drawbridge: forceOnActive((e) => e.forceDrawbridgeEvent),
      flail: forceOnActive((e) => e.forceFlailEvent),
      "vine-swing": forceOnActive((e) => e.forceVineSwingEvent),
      "bomb-snowball": forceOnActive((e) => e.forceBombSnowballEvent),
      gerb: forceOnActive((e) => e.forceGerbEvent),
      recoil: forceOnActive((e) => e.forceRecoilEvent),
      "tumble-fire": forceOnActive((e) => e.forceTumbleFireEvent),
      "roll-up": forceOnActive((e) => e.forceRollUpEvent),
      shredder: forceOnActive((e) => e.forceShredderEvent),
      "head-on": forceOnActive((e) => e.forceHeadOnEvent),
      pyramid: forceOnActive((e) => e.forcePyramidEvent),
      "pizza-toss": forceOnActive((e) => e.forcePizzaTossEvent),
      compass: forceOnActive((e) => e.forceCompassEvent),
      skewer: forceOnActive((e) => e.forceSkewerEvent),
      "bomb-comet": forceOnActive((e) => e.forceBombCometEvent),
      kaboom: forceOnActive((e) => e.forceKaboomEvent),
      "return-fire": forceOnActive((e) => e.forceReturnFireEvent),
      "frosted-glass": forceOnActive((e) => e.forceFrostedGlassEvent),
      "switch-off": forceOnActive((e) => e.forceSwitchOffEvent),
      "stunt-track": forceOnActive((e) => e.forceStuntTrackEvent),
      fleas: forceOnActive((e) => e.forceFleasEvent),
      "hand-pump": forceOnActive((e) => e.forceHandPumpEvent),
      "pick-up-sticks": forceOnActive((e) => e.forcePickUpSticksEvent),
      "thunder-shell": forceOnActive((e) => e.forceThunderShellEvent),
      "mid-air": forceOnActive((e) => e.forceMidAirEvent),
      "chain-fire": forceOnActive((e) => e.forceChainFireEvent),
      "rim-shot": forceOnActive((e) => e.forceRimShotEvent),
      "tin-roof": forceOnActive((e) => e.forceTinRoofEvent),
      crumple: forceOnActive((e) => e.forceCrumpleEvent),
      minimize: forceOnActive((e) => e.forceMinimizeEvent),
      "jumping-jets": forceOnActive((e) => e.forceJumpingJetsEvent),
      "bubble-chamber": forceOnActive((e) => e.forceBubbleChamberEvent),
      "cast-net": forceOnActive((e) => e.forceCastNetEvent),
      hoberman: forceOnActive((e) => e.forceHobermanEvent),
      excalibur: forceOnActive((e) => e.forceExcaliburEvent),
      pistons: forceOnActive((e) => e.forcePistonsEvent),
      "william-tell": forceOnActive((e) => e.forceWilliamTellEvent),
      foosball: forceOnActive((e) => e.forceFoosballEvent),
      "rubber-sheet": forceOnActive((e) => e.forceRubberSheetEvent),
      rattle: forceOnActive((e) => e.forceRattleEvent),
      eddies: forceOnActive((e) => e.forceEddiesEvent),
      "tube-man": forceOnActive((e) => e.forceTubeManEvent),
      deflate: forceOnActive((e) => e.forceDeflateEvent),
      "gear-train": forceOnActive((e) => e.forceGearTrainEvent),
      upstrike: forceOnActive((e) => e.forceUpstrikeEvent),
      "creeping-barrage": forceOnActive((e) => e.forceCreepingBarrageEvent),
      "ballistic-pendulum": forceOnActive((e) => e.forceBallisticPendulumEvent),
      "ring-taw": forceOnActive((e) => e.forceRingTawEvent),
      "rainy-window": forceOnActive((e) => e.forceRainyWindowEvent),
      inflate: forceOnActive((e) => e.forceInflateEvent),
      "dome-fountains": forceOnActive((e) => e.forceDomeFountainsEvent),
      "bell-ringers": forceOnActive((e) => e.forceBellRingersEvent),
      "wet-dog": forceOnActive((e) => e.forceWetDogEvent),
      "tower-crane": forceOnActive((e) => e.forceTowerCraneEvent),
      "bead-lightning": forceOnActive((e) => e.forceBeadLightningEvent),
      rockslide: forceOnActive((e) => e.forceRockslideEvent),
      "tight-group": forceOnActive((e) => e.forceTightGroupEvent),
      jacks: forceOnActive((e) => e.forceJacksEvent),
      "reflecting-pool": forceOnActive((e) => e.forceReflectingPoolEvent),
      "pin-art": forceOnActive((e) => e.forcePinArtEvent),
      "twin-whirlpools": forceOnActive((e) => e.forceTwinWhirlpoolsEvent),
      hatchlings: forceOnActive((e) => e.forceHatchlingsEvent),
      butterfingers: forceOnActive((e) => e.forceButterfingersEvent),
      "lock-pick": forceOnActive((e) => e.forceLockPickEvent),
      blacksmith: forceOnActive((e) => e.forceBlacksmithEvent),
      "seismic-charges": forceOnActive((e) => e.forceSeismicChargesEvent),
      "skip-shots": forceOnActive((e) => e.forceSkipShotsEvent),
      "jumping-beans": forceOnActive((e) => e.forceJumpingBeansEvent),
      "swiss-cheese": forceOnActive((e) => e.forceSwissCheeseEvent),
      "exploded-view": forceOnActive((e) => e.forceExplodedViewEvent),
      riptide: forceOnActive((e) => e.forceRiptideEvent),
      fencing: forceOnActive((e) => e.forceFencingEvent),
      "water-tower": forceOnActive((e) => e.forceWaterTowerEvent),
      "barber-pole": forceOnActive((e) => e.forceBarberPoleEvent),
      "ion-cannon": forceOnActive((e) => e.forceIonCannonEvent),
      claymore: forceOnActive((e) => e.forceClaymoreEvent),
      pepperbox: forceOnActive((e) => e.forcePepperboxEvent),
      squash: forceOnActive((e) => e.forceSquashEvent),
      "vertical-hold": forceOnActive((e) => e.forceVerticalHoldEvent),
      halftone: forceOnActive((e) => e.forceHalftoneEvent),
      blowhole: forceOnActive((e) => e.forceBlowholeEvent),
      lamplighter: forceOnActive((e) => e.forceLamplighterEvent),
      "fire-brigade": forceOnActive((e) => e.forceFireBrigadeEvent),
      spokes: forceOnActive((e) => e.forceSpokesEvent),
      "thunder-ring": forceOnActive((e) => e.forceThunderRingEvent),
      "bottle-rocket": forceOnActive((e) => e.forceBottleRocketEvent),
      skeet: forceOnActive((e) => e.forceSkeetEvent),
      tennis: forceOnActive((e) => e.forceTennisEvent),
      interlace: forceOnActive((e) => e.forceInterlaceEvent),
      "mirror-mirror": forceOnActive((e) => e.forceMirrorMirrorEvent),
      "cotton-candy": forceOnActive((e) => e.forceCottonCandyEvent),
      peloton: forceOnActive((e) => e.forcePelotonEvent),
      "drinking-bird": forceOnActive((e) => e.forceDrinkingBirdEvent),
      "laser-drill": forceOnActive((e) => e.forceLaserDrillEvent),
      "hair-raiser": forceOnActive((e) => e.forceHairRaiserEvent),
      detonator: forceOnActive((e) => e.forceDetonatorEvent),
      "bullet-rain": forceOnActive((e) => e.forceBulletRainEvent),
      "bouncy-castle": forceOnActive((e) => e.forceBouncyCastleEvent),
      "game-of-life": forceOnActive((e) => e.forceGameOfLifeEvent),
      labyrinth: forceOnActive((e) => e.forceLabyrinthEvent),
      "tidal-bore": forceOnActive((e) => e.forceTidalBoreEvent),
      scrum: forceOnActive((e) => e.forceScrumEvent),
      "gold-rush": forceOnActive((e) => e.forceGoldRushEvent),
      "suspension-bridge": forceOnActive((e) => e.forceSuspensionBridgeEvent),
      redline: forceOnActive((e) => e.forceRedlineEvent),
      willow: forceOnActive((e) => e.forceWillowEvent),
      quickdraw: forceOnActive((e) => e.forceQuickdrawEvent),
      "galilean-cannon": forceOnActive((e) => e.forceGalileanCannonEvent),
      "chaos-game": forceOnActive((e) => e.forceChaosGameEvent),
      sandpile: forceOnActive((e) => e.forceSandpileEvent),
      auger: forceOnActive((e) => e.forceAugerEvent),
      "fountain-show": forceOnActive((e) => e.forceFountainShowEvent),
      "spinning-plates": forceOnActive((e) => e.forceSpinningPlatesEvent),
      scoops: forceOnActive((e) => e.forceScoopsEvent),
      "solar-furnace": forceOnActive((e) => e.forceSolarFurnaceEvent),
      "lightning-hands": forceOnActive((e) => e.forceLightningHandsEvent),
      "ring-of-fire": forceOnActive((e) => e.forceRingOfFireEvent),
      "bullet-clash": forceOnActive((e) => e.forceBulletClashEvent),
      "bounce-pass": forceOnActive((e) => e.forceBouncePassEvent),
      "oil-strike": forceOnActive((e) => e.forceOilStrikeEvent),
      harmonograph: forceOnActive((e) => e.forceHarmonographEvent),
      quicksort: forceOnActive((e) => e.forceQuicksortEvent),
      capillary: forceOnActive((e) => e.forceCapillaryEvent),
      "battle-tops": forceOnActive((e) => e.forceBattleTopsEvent),
      "pneumatic-tubes": forceOnActive((e) => e.forcePneumaticTubesEvent),
      "star-polygon": forceOnActive((e) => e.forceStarPolygonEvent),
      "volt-spider": forceOnActive((e) => e.forceVoltSpiderEvent),
      "orbital-decay": forceOnActive((e) => e.forceOrbitalDecayEvent),
      "spray-and-pray": forceOnActive((e) => e.forceSprayAndPrayEvent),
      shuttle: forceOnActive((e) => e.forceShuttleEvent),
      "drill-duel": forceOnActive((e) => e.forceDrillDuelEvent),
      "rule-30": forceOnActive((e) => e.forceRule30Event),
      airbrush: forceOnActive((e) => e.forceAirbrushEvent),
      calving: forceOnActive((e) => e.forceCalvingEvent),
      phoenix: forceOnActive((e) => e.forcePhoenixEvent),
      "steam-train": forceOnActive((e) => e.forceSteamTrainEvent),
      "light-sail": forceOnActive((e) => e.forceLightSailEvent),
      inchworm: forceOnActive((e) => e.forceInchwormEvent),
      "critical-mass": forceOnActive((e) => e.forceCriticalMassEvent),
      "knife-thrower": forceOnActive((e) => e.forceKnifeThrowerEvent),
      compactor: forceOnActive((e) => e.forceCompactorEvent),
      "core-sample": forceOnActive((e) => e.forceCoreSampleEvent),
      "foam-party": forceOnActive((e) => e.forceFoamPartyEvent),
      "langtons-ant": forceOnActive((e) => e.forceLangtonsAntEvent),
      othello: forceOnActive((e) => e.forceOthelloEvent),
      gloop: forceOnActive((e) => e.forceGloopEvent),
      "escape-velocity": forceOnActive((e) => e.forceEscapeVelocityEvent),
      sungrazer: forceOnActive((e) => e.forceSungrazerEvent),
      "fractal-tree": forceOnActive((e) => e.forceFractalTreeEvent),
      switchboard: forceOnActive((e) => e.forceSwitchboardEvent),
      interference: forceOnActive((e) => e.forceInterferenceEvent),
      "tower-defense": forceOnActive((e) => e.forceTowerDefenseEvent),
      "bounce-wave": forceOnActive((e) => e.forceBounceWaveEvent),
      mole: forceOnActive((e) => e.forceMoleEvent),
      "car-wash": forceOnActive((e) => e.forceCarWashEvent),
      "dragon-curve": forceOnActive((e) => e.forceDragonCurveEvent),
      "lights-out": forceOnActive((e) => e.forceLightsOutEvent),
      tumbler: forceOnActive((e) => e.forceTumblerEvent),
      "waggle-dance": forceOnActive((e) => e.forceWaggleDanceEvent),
      "water-cycle": forceOnActive((e) => e.forceWaterCycleEvent),
      "folding-rule": forceOnActive((e) => e.forceFoldingRuleEvent),
      "arc-swarm": forceOnActive((e) => e.forceArcSwarmEvent),
      lockstep: forceOnActive((e) => e.forceLockstepEvent),
      "hacky-sack": forceOnActive((e) => e.forceHackySackEvent),
      woodworm: forceOnActive((e) => e.forceWoodwormEvent),
      graffiti: forceOnActive((e) => e.forceGraffitiEvent),
      voronoi: forceOnActive((e) => e.forceVoronoiEvent),
      percolation: forceOnActive((e) => e.forcePercolationEvent),
      dune: forceOnActive((e) => e.forceDuneEvent),
      "string-of-pearls": forceOnActive((e) => e.forceStringOfPearlsEvent),
      "river-juggler": forceOnActive((e) => e.forceRiverJugglerEvent),
      "like-charges": forceOnActive((e) => e.forceLikeChargesEvent),
      "collision-course": forceOnActive((e) => e.forceCollisionCourseEvent),
      "target-wheel": forceOnActive((e) => e.forceTargetWheelEvent),
      "spinning-hexagon": forceOnActive((e) => e.forceSpinningHexagonEvent),
      "bead-drill": forceOnActive((e) => e.forceBeadDrillEvent),
      hydroseeder: forceOnActive((e) => e.forceHydroseederEvent),
      mancala: forceOnActive((e) => e.forceMancalaEvent),
      breakthrough: forceOnActive((e) => e.forceBreakthroughEvent),
      curves: forceOnActive((e) => e.forceCurvesEvent),
      "archimedes-screw": forceOnActive((e) => e.forceArchimedesScrewEvent),
      murmuration: forceOnActive((e) => e.forceMurmurationEvent),
      "spirit-bomb": forceOnActive((e) => e.forceSpiritBombEvent),
      metronome: forceOnActive((e) => e.forceMetronomeEvent),
      "power-grid": forceOnActive((e) => e.forcePowerGridEvent),
      "bomb-bowling": forceOnActive((e) => e.forceBombBowlingEvent),
      showdown: forceOnActive((e) => e.forceShowdownEvent),
      "jump-rope": forceOnActive((e) => e.forceJumpRopeEvent),
      strongbox: forceOnActive((e) => e.forceStrongboxEvent),
      "snow-cannon": forceOnActive((e) => e.forceSnowCannonEvent),
      "hill-climb": forceOnActive((e) => e.forceHillClimbEvent),
      abacus: forceOnActive((e) => e.forceAbacusEvent),
      coral: forceOnActive((e) => e.forceCoralEvent),
      chladni: forceOnActive((e) => e.forceChladniEvent),
      afterimage: forceOnActive((e) => e.forceAfterimageEvent),
      "snow-globe": forceOnActive((e) => e.forceSnowGlobeEvent),
      sundial: forceOnActive((e) => e.forceSundialEvent),
      riveter: forceOnActive((e) => e.forceRiveterEvent),
      "paddle-ball": forceOnActive((e) => e.forcePaddleBallEvent),
      geode: forceOnActive((e) => e.forceGeodeEvent),
      "fog-machine": forceOnActive((e) => e.forceFogMachineEvent),
      chicane: forceOnActive((e) => e.forceChicaneEvent),
      epicycles: forceOnActive((e) => e.forceEpicyclesEvent),
      sieve: forceOnActive((e) => e.forceSieveEvent),
      clutter: forceOnActive((e) => e.forceClutterEvent),
      parting: forceOnActive((e) => e.forcePartingEvent),
      "buzz-wire": forceOnActive((e) => e.forceBuzzWireEvent),
      hiccups: forceOnActive((e) => e.forceHiccupsEvent),
      "cut-the-rope": forceOnActive((e) => e.forceCutTheRopeEvent),
      "whispering-gallery": forceOnActive((e) => e.forceWhisperingGalleryEvent),
      chunnel: forceOnActive((e) => e.forceChunnelEvent),
      sneeze: forceOnActive((e) => e.forceSneezeEvent),
      "grand-prix": forceOnActive((e) => e.forceGrandPrixEvent),
      "pillow-fight": forceOnActive((e) => e.forcePillowFightEvent),
      "dots-and-boxes": forceOnActive((e) => e.forceDotsAndBoxesEvent),
      "holding-pattern": forceOnActive((e) => e.forceHoldingPatternEvent),
      tanker: forceOnActive((e) => e.forceTankerEvent),
      "vapor-cloud": forceOnActive((e) => e.forceVaporCloudEvent),
      "shield-breaker": forceOnActive((e) => e.forceShieldBreakerEvent),
      bottleneck: forceOnActive((e) => e.forceBottleneckEvent),
      skylight: forceOnActive((e) => e.forceSkylightEvent),
      deluge: forceOnActive((e) => e.forceDelugeEvent),
      monaco: forceOnActive((e) => e.forceMonacoEvent),
      "glitter-spill": forceOnActive((e) => e.forceGlitterSpillEvent),
      "rogue-wave": forceOnActive((e) => e.forceRogueWaveEvent),
      "thunder-egg": forceOnActive((e) => e.forceThunderEggEvent),
      hologram: forceOnActive((e) => e.forceHologramEvent),
      "leaf-fall": forceOnActive((e) => e.forceLeafFallEvent),
      "three-body": forceOnActive((e) => e.forceThreeBodyEvent),
      billows: forceOnActive((e) => e.forceBillowsEvent),
      moire: forceOnActive((e) => e.forceMoireEvent),
      "pole-position": forceOnActive((e) => e.forcePolePositionEvent),
      countersink: forceOnActive((e) => e.forceCountersinkEvent),
      "busy-beaver": forceOnActive((e) => e.forceBusyBeaverEvent),
      pursuit: forceOnActive((e) => e.forcePursuitEvent),
      "fractal-charge": forceOnActive((e) => e.forceFractalChargeEvent),
      snowplow: forceOnActive((e) => e.forceSnowplowEvent),
      "franklins-kite": forceOnActive((e) => e.forceFranklinsKiteEvent),
      sokoban: forceOnActive((e) => e.forceSokobanEvent),
      fracking: forceOnActive((e) => e.forceFrackingEvent),
      chopper: forceOnActive((e) => e.forceChopperEvent),
      extinguisher: forceOnActive((e) => e.forceExtinguisherEvent),
      "golden-spiral": forceOnActive((e) => e.forceGoldenSpiralEvent),
      wildfire: forceOnActive((e) => e.forceWildfireEvent),
      "time-trial": forceOnActive((e) => e.forceTimeTrialEvent),
      "dust-bunnies": forceOnActive((e) => e.forceDustBunniesEvent),
      "magnetic-pendulum": forceOnActive((e) => e.forceMagneticPendulumEvent),
      "de-casteljau": forceOnActive((e) => e.forceDeCasteljauEvent),
      "buffons-needle": forceOnActive((e) => e.forceBuffonsNeedleEvent),
      "fuse-maze": forceOnActive((e) => e.forceFuseMazeEvent),
      "bar-billiards": forceOnActive((e) => e.forceBarBilliardsEvent),
      "levy-flight": forceOnActive((e) => e.forceLevyFlightEvent),
      brachistochrone: forceOnActive((e) => e.forceBrachistochroneEvent),
      "ulam-spiral": forceOnActive((e) => e.forceUlamSpiralEvent),
      "galton-board": forceOnActive((e) => e.forceGaltonBoardEvent),
      poohsticks: forceOnActive((e) => e.forcePoohsticksEvent),
      "fire-for-effect": forceOnActive((e) => e.forceFireForEffectEvent),
      eyewall: forceOnActive((e) => e.forceEyewallEvent),
      josephus: forceOnActive((e) => e.forceJosephusEvent),
      podium: forceOnActive((e) => e.forcePodiumEvent),
      robovac: forceOnActive((e) => e.forceRobovacEvent),
      "figure-eight": forceOnActive((e) => e.forceFigureEightEvent),
      bonanza: forceOnActive((e) => e.forceBonanzaEvent),
      "pi-clacks": forceOnActive((e) => e.forcePiClacksEvent),
      incoming: forceOnActive((e) => e.forceIncomingEvent),
      "string-art": forceOnActive((e) => e.forceStringArtEvent),
      petanque: forceOnActive((e) => e.forcePetanqueEvent),
      centipede: forceOnActive((e) => e.forceCentipedeEvent),
      mandelbrot: forceOnActive((e) => e.forceMandelbrotEvent),
      "tower-of-hanoi": forceOnActive((e) => e.forceTowerOfHanoiEvent),
      "rock-the-boat": forceOnActive((e) => e.forceRockTheBoatEvent),
      "window-washer": forceOnActive((e) => e.forceWindowWasherEvent),
      "tandem-drift": forceOnActive((e) => e.forceTandemDriftEvent),
      "post-holes": forceOnActive((e) => e.forcePostHolesEvent),
      clackers: forceOnActive((e) => e.forceClackersEvent),
      "shishi-odoshi": forceOnActive((e) => e.forceShishiOdoshiEvent),
      "ising-model": forceOnActive((e) => e.forceIsingModelEvent),
      "faraday-cage": forceOnActive((e) => e.forceFaradayCageEvent),
      "free-throws": forceOnActive((e) => e.forceFreeThrowsEvent),
      fission: forceOnActive((e) => e.forceFissionEvent),
      hydra: forceOnActive((e) => e.forceHydraEvent),
      "optical-tweezers": forceOnActive((e) => e.forceOpticalTweezersEvent),
      "travelling-salesman": forceOnActive(
        (e) => e.forceTravellingSalesmanEvent,
      ),
      "spin-cycle": forceOnActive((e) => e.forceSpinCycleEvent),
      "pilot-hole": forceOnActive((e) => e.forcePilotHoleEvent),
      "pit-stop": forceOnActive((e) => e.forcePitStopEvent),
      "black-hole-merger": forceOnActive((e) => e.forceBlackHoleMergerEvent),
      accretion: forceOnActive((e) => e.forceAccretionEvent),
      "maxwells-demon": forceOnActive((e) => e.forceMaxwellsDemonEvent),
      "tidal-tails": forceOnActive((e) => e.forceTidalTailsEvent),
      hypervelocity: forceOnActive((e) => e.forceHypervelocityEvent),
      quasar: forceOnActive((e) => e.forceQuasarEvent),
      volleyball: forceOnActive((e) => e.forceVolleyballEvent),
      "smart-rockets": forceOnActive((e) => e.forceSmartRocketsEvent),
      "bomb-mobile": forceOnActive((e) => e.forceBombMobileEvent),
      "ring-galaxy": forceOnActive((e) => e.forceRingGalaxyEvent),
      "gravitational-lens": forceOnActive((e) => e.forceGravitationalLensEvent),
      convection: forceOnActive((e) => e.forceConvectionEvent),
      paintball: forceOnActive((e) => e.forcePaintballEvent),
      "kirkwood-gaps": forceOnActive((e) => e.forceKirkwoodGapsEvent),
      periscope: forceOnActive((e) => e.forcePeriscopeEvent),
      "water-ski": forceOnActive((e) => e.forceWaterSkiEvent),
      "jai-alai": forceOnActive((e) => e.forceJaiAlaiEvent),
      "polar-ring": forceOnActive((e) => e.forcePolarRingEvent),
      kebab: forceOnActive((e) => e.forceKebabEvent),
      katamari: forceOnActive((e) => e.forceKatamariEvent),
      harmonics: forceOnActive((e) => e.forceHarmonicsEvent),
      stairwell: forceOnActive((e) => e.forceStairwellEvent),
      "iron-filings": forceOnActive((e) => e.forceIronFilingsEvent),
      sync: forceOnActive((e) => e.forceSyncEvent),
      "roche-lobe": forceOnActive((e) => e.forceRocheLobeEvent),
      marbles: forceOnActive((e) => e.forceMarblesEvent),
      "bomb-shuffleboard": forceOnActive((e) => e.forceBombShuffleboardEvent),
      "barred-spiral": forceOnActive((e) => e.forceBarredSpiralEvent),
      "bullet-mosaic": forceOnActive((e) => e.forceBulletMosaicEvent),
      "bomb-grapes": forceOnActive((e) => e.forceBombGrapesEvent),
      "flow-field": forceOnActive((e) => e.forceFlowFieldEvent),
      "rally-jump": forceOnActive((e) => e.forceRallyJumpEvent),
      sweetheart: forceOnActive((e) => e.forceSweetheartEvent),
      mint: forceOnActive((e) => e.forceMintEvent),
      "cat-sketch": forceOnActive((e) => e.forceCatSketchEvent),
      stencil: forceOnActive((e) => e.forceStencilEvent),
      denoise: forceOnActive((e) => e.forceDenoiseEvent),
      pincushion: forceOnActive((e) => e.forcePincushionEvent),
      updraft: forceOnActive((e) => e.forceUpdraftEvent),
      plugholes: forceOnActive((e) => e.forcePlugholesEvent),
      "apollonian-gasket": forceOnActive((e) => e.forceApollonianGasketEvent),
      "drone-show": forceOnActive((e) => e.forceDroneShowEvent),
      "marx-generator": forceOnActive((e) => e.forceMarxGeneratorEvent),
      "oort-cloud": forceOnActive((e) => e.forceOortCloudEvent),
      "double-slit": forceOnActive((e) => e.forceDoubleSlitEvent),
      "blast-sweep": forceOnActive((e) => e.forceBlastSweepEvent),
      "hydraulic-jump": forceOnActive((e) => e.forceHydraulicJumpEvent),
      "seed-pods": forceOnActive((e) => e.forceSeedPodsEvent),
      "ripple-fire": forceOnActive((e) => e.forceRippleFireEvent),
      "spark-chamber": forceOnActive((e) => e.forceSparkChamberEvent),
      turbine: forceOnActive((e) => e.forceTurbineEvent),
      "strange-attractor": forceOnActive((e) => e.forceStrangeAttractorEvent),
      "topsy-turvy": forceOnActive((e) => e.forceTopsyTurvyEvent),
      "gold-plating": forceOnActive((e) => e.forceGoldPlatingEvent),
      crosswind: forceOnActive((e) => e.forceCrosswindEvent),
      hailstone: forceOnActive((e) => e.forceHailstoneEvent),
      "hilbert-curve": forceOnActive((e) => e.forceHilbertCurveEvent),
      "le-mans": forceOnActive((e) => e.forceLeMansEvent),
      "tunnel-borer": forceOnActive((e) => e.forceTunnelBorerEvent),
      harpoon: forceOnActive((e) => e.forceHarpoonEvent),
      "eight-queens": forceOnActive((e) => e.forceEightQueensEvent),
      "shortest-path": forceOnActive((e) => e.forceShortestPathEvent),
      sinkhole: forceOnActive((e) => e.forceSinkholeEvent),
      backwash: forceOnActive((e) => e.forceBackwashEvent),
      deflector: forceOnActive((e) => e.forceDeflectorEvent),
      sunflower: forceOnActive((e) => e.forceSunflowerEvent),
      "convex-hull": forceOnActive((e) => e.forceConvexHullEvent),
    });
    // same, for the Slash event
    wireSlashEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceSlashEvent(floor);
      }),
    );
    // same, for the Jackhammer event
    wireJackhammerEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceJackhammerEvent(floor);
      }),
    );
    // same, for the Pummel event
    wirePummelEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forcePummelEvent(floor);
      }),
    );
    // same, for the Overload event
    wireOverloadEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceOverloadEvent(floor);
      }),
    );
    // same, for the Gatling event
    wireGatlingEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceGatlingEvent(floor);
      }),
    );
    // same, for the Press event
    wirePressEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forcePressEvent(floor);
      }),
    );
    // same, for the Drill event
    wireDrillEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceDrillEvent(floor);
      }),
    );
    // same, for the Burrow event
    wireBurrowEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceBurrowEvent(floor);
      }),
    );
    // same, for the Ping Pong event
    wirePingPongEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forcePingPongEvent(floor);
      }),
    );
    // same, for the Slam Dunk event
    wireSlamDunkEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceSlamDunkEvent(floor);
      }),
    );
    // same, for the Uppercut event
    wireUppercutEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceUppercutEvent(floor);
      }),
    );
    // same, for the Head Hop event
    wireHeadHopEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceHeadHopEvent(floor);
      }),
    );
    // same, for the Paparazzi event
    wirePaparazziEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forcePaparazziEvent(floor);
      }),
    );
    // same, for the Missile Barrage event
    wireMissileBarrageEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceMissileBarrageEvent(floor);
      }),
    );
    // same, for the Sonic Boom event
    wireSonicBoomEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceSonicBoomEvent(floor);
      }),
    );
    // same, for the Mitosis event
    wireMitosisEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceMitosisEvent(floor);
      }),
    );
    // same, for the Plinko event
    wirePlinkoEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forcePlinkoEvent(floor);
      }),
    );
    // same, for the Hammer Throw event
    wireHammerThrowEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceHammerThrowEvent(floor);
      }),
    );
    // same, for the Snake event
    wireSnakeEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceSnakeEvent(floor);
      }),
    );
    // same, for the Breakout event
    wireBreakoutEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceBreakoutEvent(floor);
      }),
    );
    // same, for the Line Clear event
    wireLineClearEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceLineClearEvent(floor);
      }),
    );
    // same, for the Break Shot event
    wireBreakShotEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceBreakShotEvent(floor);
      }),
    );
    // same, for the Bullet Hell event
    wireBulletHellEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceBulletHellEvent(floor);
      }),
    );
    // same, for the Vortex event
    wireVortexEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceVortexEvent(floor);
      }),
    );
    // same, for the Ricochet event
    wireRicochetEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceRicochetEvent(floor);
      }),
    );
    // same, for the Waterfall event
    wireWaterfallEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceWaterfallEvent(floor);
      }),
    );
    // same, for the Conveyor event
    wireConveyorEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceConveyorEvent(floor);
      }),
    );
    // same, for the Fireflies event
    wireFirefliesEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceFirefliesEvent(floor);
      }),
    );
    // same, for the Payday event
    wirePaydayEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forcePaydayEvent(floor);
      }),
    );
    // same, for the Piggy Bank event
    wirePiggyBankEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forcePiggyBankEvent(floor);
      }),
    );
    // same, for the Coin Toss event
    wireCoinTossEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceCoinTossEvent(floor);
      }),
    );
    // same, for the Hourglass event
    wireHourglassEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceHourglassEvent(floor);
      }),
    );
    // same, for the Rocket event
    wireRocketEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceRocketEvent(floor);
      }),
    );
    // same, for the Reveal event
    wireRevealEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceRevealEvent(floor);
      }),
    );
    wireBadgeCapsuleTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (floor) gameCanvas.scrollActiveToFloor(floor);
      gameCanvas.openBadgeCapsule(true);
    });
    // same, for the Jackpot Reels event
    wireJackpotReelsEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceJackpotReelsEvent(floor);
      }),
    );
    // same, for the Chain Pay event
    wireChainPayEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceChainPayEvent(floor);
      }),
    );
    // same, for the Twister event
    wireTwisterEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceTwisterEvent(floor);
      }),
    );
    // same, for the Downpour event
    wireDownpourEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceDownpourEvent(floor);
      }),
    );
    // same, for the Trickle event
    wireTrickleEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceTrickleEvent(floor);
      }),
    );
    // same, for the Magnet event
    wireMagnetEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceMagnetEvent(floor);
      }),
    );
    // same, for the Spillover event
    wireSpilloverEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceSpilloverEvent(floor);
      }),
    );
    // same, for the Constellation event
    wireConstellationEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceConstellationEvent(floor);
      }),
    );
    // same, for the Ascend event
    wireAscendEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceAscendEvent(floor);
      }),
    );
    // same, for the Rising Tide event
    wireRisingTideEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceRisingTideEvent(floor);
      }),
    );
    // same, for the Tidal Wave event
    wireTidalWaveEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceTidalWaveEvent(floor);
      }),
    );
    // same, for the Beanstalk event, on the top unlocked floor so the locked
    // one above it is in view
    wireBeanstalkEventTestButton(
      app,
      later(() => {
        const floors = buildings[activeBuildingIndex];
        if (!floors) return;
        const lockedIndex = floors.findIndex((f) => !f.unlocked);
        const floor = floors[lockedIndex - 1] ?? floors[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceBeanstalkEvent(floor);
      }),
    );
    // same, for the Blessing event
    wireBlessingEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceBlessingEvent(floor);
      }),
    );
    // same, for the Halo event
    wireHaloEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceHaloEvent(floor);
      }),
    );
    // same, for the Comet event
    wireCometEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceCometEvent(floor);
      }),
    );
    // same, for the Meteor Shower event
    wireMeteorShowerEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceMeteorShowerEvent(floor);
      }),
    );
    // same, for the Mentor event
    wireMentorEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceMentorEvent(floor);
      }),
    );
    // same, for the Spark Chain event
    wireSparkChainEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceSparkChainEvent(floor);
      }),
    );
    // same, for the Polish event
    wirePolishEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forcePolishEvent(floor);
      }),
    );
    // same, for the Lighthouse event
    wireLighthouseEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceLighthouseEvent(floor);
      }),
    );
    // same, for the Recruit event
    wireRecruitEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceRecruitEvent(floor);
      }),
    );
    // same, for the Promotion Day event
    wirePromotionDayEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forcePromotionDayEvent(floor);
      }),
    );
    // same, for the Alchemy event
    wireAlchemyEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceAlchemyEvent(floor);
      }),
    );
    // same, for the Investment event
    wireInvestmentEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceInvestmentEvent(floor);
      }),
    );
    // same, for the Dividends event
    wireDividendsEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceDividendsEvent(floor);
      }),
    );
    // same, for the Wisp event
    wireWispEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceWispEvent(floor);
      }),
    );
    // same, for the Stream event
    wireStreamEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceStreamEvent(floor);
      }),
    );
    // same, for the Trails event
    wireTrailsEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceTrailsEvent(floor);
      }),
    );
    // same, for the Draw event
    wireDrawEventTestButton(
      app,
      later((tier) => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceDrawEvent(floor, tier);
      }),
    );
    // same, for the Night Sky event
    wireNightSkyEventTestButton(
      app,
      later((tier) => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceNightSkyEvent(floor, tier);
      }),
    );
    // same, for the Pitcher event
    wirePitcherEventTestButton(
      app,
      later((tier) => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forcePitcherEvent(floor, tier);
      }),
    );
    // same, for the Glimmer event
    wireGlimmerEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceGlimmerEvent(floor);
      }),
    );
    // spawns a mouse if none is out, arms "Hunt!" on its floor and scrolls there
    wireHuntEventTestButton(
      app,
      later(() => {
        let floor = ev.forceHuntEvent();
        if (!floor) {
          forceSpawnMouse(buildings[activeBuildingIndex] ?? []);
          floor = ev.forceHuntEvent();
        }
        if (floor) gameCanvas.scrollActiveToFloor(floor);
      }),
    );
    // scrolls to the ground floor and plays the Swarm proc on its button
    wireSwarmEventTestButton(
      app,
      later(() => {
        const floors = buildings[activeBuildingIndex] ?? [];
        const floor = floors[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.startSwarmEvent(floor, true, floors, gameCanvas.getFloorRect);
      }),
    );
    // scrolls to the ground floor and arms an x5 crit there carrying Renovate
    wireRenovateEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceRenovateEvent(floor);
      }),
    );
    // same, for the Upgrade event
    wireUpgradeEventTestButton(
      app,
      later(() => {
        const floor = buildings[activeBuildingIndex]?.[0];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceUpgradeEvent(floor);
      }),
    );
    // arms the Unlock event on the floor right below the locked one
    wireUnlockEventTestButton(
      app,
      later((unlockCrit) => {
        const floors = buildings[activeBuildingIndex] ?? [];
        const floor = floors[floors.findIndex((f) => !f.unlocked) - 1];
        if (!floor) return;
        gameCanvas.scrollActiveToFloor(floor);
        ev.forceUnlockEvent(floor, unlockCrit);
      }),
    );
    wireResetButton(app, buildings);
    // wired last, so it sees every dropdown/button the block above created
    sortTestActionMenus(app);
    wireTestActionsFilter(app);
  }
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
    // "Merge" (see hud/corporationUpgradeMenu's own Merge section): folds every
    // selected company's income/upgrades/stock into whichever one has the most
    // map progression, then closes the dialog and barrel-rolls to it. If the
    // company we're switching AWAY from was itself one of the merged-away
    // ones, flag the next switch to skip re-snapshotting its now-stale live
    // state over the clear mergeCompanies already wrote to storage for it
    (companyIndices) => {
      const result = mergeCompanies(companyIndices, buildings);
      if (!result) return;
      const mergedAway = new Set(
        companyIndices.filter((index) => index !== result.survivorIndex),
      );
      skipNextOutgoingSnapshot = mergedAway.has(activeCompanyIndex);
      corporationUpgradeMenu.close();
      setTimeout(() => {
        playSwoosh();
        cityMapView.animateSwitchToCompany(result.survivorIndex);
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

  // sets EVERY floor a building currently has (locked or not) to the given crit
  // tier, permanently — no unlocking, no cost (see cityMap/index.ts's map-buy
  // crit celebration). A brand new building only has its one free ground floor
  // + the one locked floor already queued above it at this point; any floor
  // added later inherits this same tier automatically (see floorLock.ts's
  // ensureLockedFloorAbove). `chain` (see rollFloorBuyCrit's own chain flag)
  // additionally UNLOCKS that already-queued locked floor (it already got the
  // tier from the loop below, but was still sitting locked) and keeps climbing
  // further above it — same "chain crit" behavior the other 2 crit events
  // share. Chain must start from index 0 (the ground floor), NOT
  // floors.length-1 — the walker's first step lands on startIndex+1, and the
  // queued locked floor is always index 1 at this point (a brand new building
  // is always exactly [ground, one queued locked floor] here), so starting
  // any later just skips over it and the chain never actually unlocks anything
  function applyBuildingCritTier(
    buildingIndex: number,
    result: CritRollResult,
    targetBuildings = buildings,
  ): void {
    const floors = targetBuildings[buildingIndex];
    if (!floors) return;
    const { tier, chain } = result;
    for (const floor of floors) {
      if (!result.skip) floor.critMultiplierTier = tier;
    }
    if (result.mystic) createMysticBuilding(targetBuildings);
    // reward side of every proc this building-buy event actually supports —
    // one handler per proc kind (see shared/critTypes's applyCritProcs), so
    // this is the ONE place that has to say what "upgrade"/"heavenly" mean
    // for a whole building; a proc with no entry here (boost/bounce/
    // explosion/booty/peppermint don't apply at building scope) is simply
    // skipped
    applyCritProcs(result, floors, {
      // upgrade crit: promotes every floor this building has one further
      // step past the tier they were just set to above (see
      // rollFloorBuyCrit's own upgrade flag, applied here instead of
      // floorInteractions.ts since this is a whole-building event, not a
      // single Floor)
      upgrade: (floors) => {
        for (const floor of floors) {
          floor.critMultiplierTier = nextCritTier(floor.critMultiplierTier);
        }
      },
      // heavenly crit: the biggest reward of all, applied building-wide —
      // unlocks every remaining floor for free, maxes every floor's tier,
      // then grants each one a full max-tier free-upgrade batch. Uses
      // increaseIncomeRate directly (not floorInteractions.ts's
      // applyUpgradeTick, which also spawns a coin burst/re-rolls a crit at
      // a specific ON-SCREEN floor button position) since this building may
      // not even be the one currently displayed
      heavenly: (floors) => {
        unlockAllFloors({
          floors,
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
        const maxTier = CRIT_TIER_ORDER[0];
        const count = CRIT_TIER_CONFIG[maxTier].multiplier;
        for (const floor of floors) {
          floor.critMultiplierTier = maxTier;
          for (let i = 0; i < count; i++) {
            increaseIncomeRate(floor);
          }
        }
      },
      // skip crit: unlocks every floor and grants its free workers, manager,
      // office chairs, and supplies without changing tiers or levels
      skip: (floors) => {
        unlockAllFloors({
          floors,
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
        for (const floor of floors) {
          if (!floor.unlocked) continue;
          floor.workerCount = MAX_RENDERED_WORKERS;
          floor.hasManager = true;
          floor.hasOfficeChairs = true;
          floor.hasOfficeSupplies = true;
        }
      },
      // grand opening crit: same reward as at floor scope — unlocks every
      // remaining locked floor of this building for free
      grandOpening: (floors) => {
        unlockAllFloors({
          floors,
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
      },
      luckyClover: (floors) => {
        const count = CRIT_TIER_CONFIG[LUCKY_CLOVER_CRIT_TIER].multiplier;
        for (const floor of floors) {
          if (!floor.unlocked) continue;
          for (let run = 0; run < LUCKY_CLOVER_CRIT_COUNT; run++) {
            for (let i = 0; i < count; i++) increaseIncomeRate(floor);
          }
        }
      },
    });
    if (!chain) return;
    applyChainCrit(
      {
        floors,
        backgroundCount: getBackgroundUrls().length,
        multiplier: getBuildingMultiplier(buildingIndex),
        onFloorAdded: (floor) => {
          if (
            targetBuildings === buildings &&
            buildingIndex === activeBuildingIndex
          ) {
            gameCanvas.notifyFloorAdded(floor);
          }
        },
      },
      0,
      (floor) => {
        floor.critMultiplierTier = tier;
      },
    );
  }
  // a chain crit ALWAYS has at least +1 impact area — same guarantee
  // applyChainCrit's own floor walker already gives (its first extra floor is
  // unconditional, only whether it keeps going past that is a coin flip).
  // "The building" being unlocked for THIS event is a whole building, not a
  // floor, so a chain here must always unlock at least one MORE building
  // (free, same tier, its own floor-chain too) — only whether it climbs PAST
  // that first extra building is CHAIN_CRIT_CONTINUE_CHANCE
  function setBuildingCritTier(
    buildingIndex: number,
    result: CritRollResult,
    targetBuildings = buildings,
  ): void {
    applyBuildingCritTier(buildingIndex, result, targetBuildings);
    if (result.chain) {
      let continueChain = true;
      while (continueChain) {
        const nextIndex = targetBuildings.length;
        targetBuildings.push(
          createBuilding(nextIndex, getBackgroundUrls().length),
        );
        setupBuilding(nextIndex, targetBuildings);
        applyBuildingCritTier(nextIndex, result, targetBuildings);
        continueChain = Math.random() < CHAIN_CRIT_CONTINUE_CHANCE;
      }
    }
    // pair/three of a kind/four of a kind/full house crits (see
    // shared/critTypes' POKER_HAND_CRIT_COUNTS): at floor scope these
    // promote a fixed number of floors; at this whole-building scope they
    // unlock/create that many buildings instead (the building this event is
    // already for counts as the first of them, so only count-1 MORE get
    // created here), each set to the same landed tier. Applied independently
    // per landed kind (MAX_SPECIAL_CRIT_PROCS allows up to 2 to land
    // together), same as every other proc's reward. Royal Flush is the ONE
    // exception at floor scope (unlocks/upgrades every floor above it
    // instead of a fixed 6 — see floorInteractions.ts's applyPokerHandCrit
    // call), but at this map/building scope it still just unlocks 6
    // buildings, same as every other poker-hand crit here
    for (const count of [
      result.pair && POKER_HAND_CRIT_COUNTS.pair,
      result.threeOfAKind && POKER_HAND_CRIT_COUNTS.threeOfAKind,
      result.fourOfAKind && POKER_HAND_CRIT_COUNTS.fourOfAKind,
      result.fullHouse && POKER_HAND_CRIT_COUNTS.fullHouse,
      result.royalFlush && POKER_HAND_CRIT_COUNTS.royalFlush,
    ]) {
      if (!count) continue;
      for (let i = 1; i < count; i++) {
        const nextIndex = targetBuildings.length;
        targetBuildings.push(
          createBuilding(nextIndex, getBackgroundUrls().length),
        );
        setupBuilding(nextIndex, targetBuildings);
        applyBuildingCritTier(nextIndex, result, targetBuildings);
      }
    }
    if (targetBuildings === buildings) persist();
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
          forceTestCrit(
            ground,
            prize.kind,
            pickCritTierByOdds(),
            null,
            "upgrade",
          );
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
  if (gt(totalIdleIncome, fromNumber(0))) {
    addTotalIncome(idleIncome);
    void whenDocumentReady()
      .then(() => totalEarnedOverlay.show(totalIdleIncome))
      .then(markStartupSettled);
  } else {
    setTimeout(markStartupSettled, 0);
  }

  gameCanvas.redraw();

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
}

main();

// registers the offline/installable-app shell (public/sw.js) — gated on
// !import.meta.hot rather than MODE, since "npm run dev:prod" (MODE=production)
// is STILL vite's dev server with HMR, not a real build; import.meta.hot only
// exists under any Vite dev server (regardless of --mode), so this is the one
// check that's actually true exclusively for genuinely built/served dist output.
// BASE_URL already carries the "/kitty-inc/" GitHub Pages prefix (see
// vite.config.ts), so this resolves correctly once deployed
if ("serviceWorker" in navigator && !import.meta.hot) {
  afterStartup(() => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch((err) => console.error("Service worker registration failed", err));
  });
}
