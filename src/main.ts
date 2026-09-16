import "./style.css";
import { fromNumber, gt, isZero } from "./shared/bigNumber";
import {
  CHAIN_CRIT_CONTINUE_CHANCE,
  nextCritTier,
  CRIT_TIER_ORDER,
  CRIT_TIER_CONFIG,
  applyCritProcs,
  POKER_HAND_CRIT_COUNTS,
  LUCKY_CLOVER_CRIT_COUNT,
  LUCKY_CLOVER_CRIT_TIER,
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
  getBuildingUnlockAllCost,
  unlockAllFloors,
  forceCritUpgrade,
  forceMegaCritUpgrade,
  forceUltraCritUpgrade,
  forceChainCritUpgrade,
  forceBoostCritUpgrade,
  forceBounceCritUpgrade,
  forceExplosionCritUpgrade,
  forceBootyCritUpgrade,
  forceUpgradeCritUpgrade,
  forcePeppermintCritUpgrade,
  forceHeavenlyCritUpgrade,
  forcePairCritUpgrade,
  forceThreeOfAKindCritUpgrade,
  forceFourOfAKindCritUpgrade,
  forceFullHouseCritUpgrade,
  forceRoyalFlushCritUpgrade,
  forceTickTockCritUpgrade,
  forceChairGiveawayCritUpgrade,
  forceSuppliesGiveawayCritUpgrade,
  forceWinterSaleCritUpgrade,
  forceSpringSaleCritUpgrade,
  forceSummerSaleCritUpgrade,
  forceAutumnSaleCritUpgrade,
  forceHalloweenSaleCritUpgrade,
  forceEasterSaleCritUpgrade,
  forceSunshineCritUpgrade,
  forceSnowdayCritUpgrade,
  forceFastForwardCritUpgrade,
  forceFrozenCritUpgrade,
  forceSpendingFreezeCritUpgrade,
  forceSnowballCritUpgrade,
  forceFreeSaleCritUpgrade,
  forceBullMarketCritUpgrade,
  forcePaydayCritUpgrade,
  forceGoldStandardCritUpgrade,
  forceNightShiftCritUpgrade,
  forceInternCritUpgrade,
  forceTalentScoutCritUpgrade,
  forceUnionBossCritUpgrade,
  forceRushHourCritUpgrade,
  forceRateLockCritUpgrade,
  forceGoldenTicketCritUpgrade,
  forceSilverTicketCritUpgrade,
  forceGoldenParachuteCritUpgrade,
  forceCashFlowCritUpgrade,
  forcePayoutCritUpgrade,
  forceGrandOpeningCritUpgrade,
  forceFullyStaffedCritUpgrade,
  forceShiftChangeCritUpgrade,
  forceEspressoShotCritUpgrade,
  forceDejaVuCritUpgrade,
  forceCloneArmyCritUpgrade,
  forceLuckyCloverCritUpgrade,
  forceSecondWindCritUpgrade,
  forceExecutiveOrderCritUpgrade,
  forceRoundUpCritUpgrade,
  forceSafetyNetCritUpgrade,
  forceFloorShareCritUpgrade,
  forceSameBoatCritUpgrade,
  forceGoldenHandshakeCritUpgrade,
  forceSupplyRunCritUpgrade,
  forceCasualFridayCritUpgrade,
  forceFancyFridayCritUpgrade,
  forceFireDrillCritUpgrade,
  forceBonusRoundCritUpgrade,
  forceOverflowCritUpgrade,
  forcePerformanceBonusCritUpgrade,
  forceDoubleDownCritUpgrade,
  forceCoffeeRunCritUpgrade,
  forceDressCodeCritUpgrade,
  forceTeaBreakCritUpgrade,
  forceTeamBuildingCritUpgrade,
  forceTeamLunchCritUpgrade,
  forceSpringCleaningCritUpgrade,
  forceNightOwlCritUpgrade,
  forceHeadhunterCritUpgrade,
  forceRecruitmentDriveCritUpgrade,
  forceMergerCritUpgrade,
  forceShareholdersCritUpgrade,
  forceBonusTierCritUpgrade,
  forceFloorBuyCrit,
  forceGrandOpeningFloorBuyCrit,
  forceFullyStaffedFloorBuyCrit,
  forceEspressoShotFloorBuyCrit,
  forceDejaVuFloorBuyCrit,
  forceCloneArmyFloorBuyCrit,
  forceLuckyCloverFloorBuyCrit,
  forceSecondWindFloorBuyCrit,
  forceExecutiveOrderFloorBuyCrit,
  forceRoundUpFloorBuyCrit,
  forceGoldenHandshakeFloorBuyCrit,
  forceSupplyRunFloorBuyCrit,
  forceCasualFridayFloorBuyCrit,
  forceFancyFridayFloorBuyCrit,
  forceFireDrillFloorBuyCrit,
  forcePerformanceBonusFloorBuyCrit,
  forceDoubleDownFloorBuyCrit,
  forceCoffeeRunFloorBuyCrit,
  forceDressCodeFloorBuyCrit,
  forceTeaBreakFloorBuyCrit,
  forceTeamBuildingFloorBuyCrit,
  forceSpringCleaningFloorBuyCrit,
  forceNightOwlFloorBuyCrit,
  forceHeadhunterFloorBuyCrit,
  forceRecruitmentDriveFloorBuyCrit,
  forcePayoutFloorBuyCrit,
  getActiveBackgrounds,
  applyChainCrit,
  increaseIncomeRate,
  currentIncomeRatePerSecond,
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
  reconcileBoostedAwayIncome,
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
  wireSpawnMegaCritButton,
  wireSpawnUltraCritButton,
  wireSpawnChainCritButton,
  wireSpawnChainMegaCritButton,
  wireSpawnChainUltraCritButton,
  wireSpawnBoostCritButton,
  wireSpawnBounceCritButton,
  wireSpawnBounceMegaCritButton,
  wireSpawnBounceUltraCritButton,
  wireSpawnExplosionCritButton,
  wireSpawnExplosionMegaCritButton,
  wireSpawnExplosionUltraCritButton,
  wireSpawnBootyCritButton,
  wireSpawnUpgradeCritButton,
  wireSpawnPeppermintCritButton,
  wireSpawnHeavenlyCritButton,
  wireSpawnPairCritButton,
  wireSpawnThreeOfAKindCritButton,
  wireSpawnFourOfAKindCritButton,
  wireSpawnFullHouseCritButton,
  wireSpawnRoyalFlushCritButton,
  wireSpawnTickTockCritButton,
  wireSpawnChairGiveawayCritButton,
  wireSpawnSuppliesGiveawayCritButton,
  wireSpawnWinterSaleCritButton,
  wireSpawnSpringSaleCritButton,
  wireSpawnSummerSaleCritButton,
  wireSpawnAutumnSaleCritButton,
  wireSpawnHalloweenSaleCritButton,
  wireSpawnEasterSaleCritButton,
  wireSpawnSunshineCritButton,
  wireSpawnSnowdayCritButton,
  wireSpawnFastForwardCritButton,
  wireSpawnFrozenCritButton,
  wireSpawnSpendingFreezeCritButton,
  wireSpawnSnowballCritButton,
  wireSpawnFreeSaleCritButton,
  wireSpawnBullMarketCritButton,
  wireTestActionsFilter,
  wireSpawnPaydayCritButton,
  wireSpawnGoldStandardCritButton,
  wireSpawnNightShiftCritButton,
  wireSpawnInternCritButton,
  wireSpawnTalentScoutCritButton,
  wireSpawnUnionBossCritButton,
  wireSpawnRushHourCritButton,
  wireSpawnRateLockCritButton,
  wireSpawnGoldenTicketCritButton,
  wireSpawnSilverTicketCritButton,
  wireSpawnGrandOpeningCritButton,
  wireSpawnFullyStaffedCritButton,
  wireSpawnShiftChangeCritButton,
  wireSpawnEspressoShotCritButton,
  wireSpawnDejaVuCritButton,
  wireSpawnCloneArmyCritButton,
  wireSpawnLuckyCloverCritButton,
  wireSpawnSecondWindCritButton,
  wireSpawnExecutiveOrderCritButton,
  wireSpawnRoundUpCritButton,
  wireSpawnSafetyNetCritButton,
  wireSpawnFloorShareCritButton,
  wireSpawnSameBoatCritButton,
  wireSpawnGoldenHandshakeCritButton,
  wireSpawnSupplyRunCritButton,
  wireSpawnCasualFridayCritButton,
  wireSpawnFancyFridayCritButton,
  wireSpawnFireDrillCritButton,
  wireSpawnBonusRoundCritButton,
  wireSpawnOverflowCritButton,
  wireSpawnPerformanceBonusCritButton,
  wireSpawnDoubleDownCritButton,
  wireSpawnCoffeeRunCritButton,
  wireSpawnDressCodeCritButton,
  wireSpawnTeaBreakCritButton,
  wireSpawnTeamBuildingCritButton,
  wireSpawnTeamLunchCritButton,
  wireSpawnSpringCleaningCritButton,
  wireSpawnNightOwlCritButton,
  wireSpawnHeadhunterCritButton,
  wireSpawnRecruitmentDriveCritButton,
  wireSpawnMergerCritButton,
  wireSpawnShareholdersCritButton,
  wireSpawnGoldenParachuteCritButton,
  wireSpawnCashFlowCritButton,
  wireSpawnPayoutCritButton,
  wireForceBonusTierCritButton,
  wireForceBonusTierMegaCritButton,
  wireForceBonusTierUltraCritButton,
  wireFloorBuyCritButton,
  wireFloorBuyBoostCritButton,
  wireFloorBuyMegaCritButton,
  wireFloorBuyUltraCritButton,
  wireFloorBuyChainCritButton,
  wireFloorBuyChainMegaCritButton,
  wireFloorBuyChainUltraCritButton,
  wireFloorBuyBounceCritButton,
  wireFloorBuyBounceMegaCritButton,
  wireFloorBuyBounceUltraCritButton,
  wireFloorBuyExplosionCritButton,
  wireFloorBuyExplosionMegaCritButton,
  wireFloorBuyExplosionUltraCritButton,
  wireFloorBuyBootyCritButton,
  wireFloorBuyUpgradeCritButton,
  wireFloorBuyPeppermintCritButton,
  wireFloorBuyHeavenlyCritButton,
  wireFloorBuyPairCritButton,
  wireFloorBuyThreeOfAKindCritButton,
  wireFloorBuyFourOfAKindCritButton,
  wireFloorBuyFullHouseCritButton,
  wireFloorBuyRoyalFlushCritButton,
  wireFloorBuyTickTockCritButton,
  wireFloorBuyChairGiveawayCritButton,
  wireFloorBuySuppliesGiveawayCritButton,
  wireFloorBuyWinterSaleCritButton,
  wireFloorBuySpringSaleCritButton,
  wireFloorBuySummerSaleCritButton,
  wireFloorBuyAutumnSaleCritButton,
  wireFloorBuyHalloweenSaleCritButton,
  wireFloorBuyEasterSaleCritButton,
  wireFloorBuySunshineCritButton,
  wireFloorBuySnowdayCritButton,
  wireFloorBuyFastForwardCritButton,
  wireFloorBuyFrozenCritButton,
  wireFloorBuySnowballCritButton,
  wireFloorBuyFreeSaleCritButton,
  wireFloorBuyPaydayCritButton,
  wireFloorBuyGoldStandardCritButton,
  wireFloorBuyNightShiftCritButton,
  wireFloorBuyInternCritButton,
  wireFloorBuyUnionBossCritButton,
  wireFloorBuyRushHourCritButton,
  wireFloorBuyGoldenTicketCritButton,
  wireFloorBuySilverTicketCritButton,
  wireFloorBuyGrandOpeningCritButton,
  wireFloorBuyFullyStaffedCritButton,
  wireFloorBuyEspressoShotCritButton,
  wireFloorBuyDejaVuCritButton,
  wireFloorBuyCloneArmyCritButton,
  wireFloorBuyLuckyCloverCritButton,
  wireFloorBuySecondWindCritButton,
  wireFloorBuyExecutiveOrderCritButton,
  wireFloorBuyRoundUpCritButton,
  wireFloorBuyGoldenHandshakeCritButton,
  wireFloorBuySupplyRunCritButton,
  wireFloorBuyCasualFridayCritButton,
  wireFloorBuyFancyFridayCritButton,
  wireFloorBuyFireDrillCritButton,
  wireFloorBuyPerformanceBonusCritButton,
  wireFloorBuyDoubleDownCritButton,
  wireFloorBuyCoffeeRunCritButton,
  wireFloorBuyDressCodeCritButton,
  wireFloorBuyTeaBreakCritButton,
  wireFloorBuyTeamBuildingCritButton,
  wireFloorBuySpringCleaningCritButton,
  wireFloorBuyNightOwlCritButton,
  wireFloorBuyHeadhunterCritButton,
  wireFloorBuyRecruitmentDriveCritButton,
  wireFloorBuyGoldenParachuteCritButton,
  wireFloorBuyPayoutCritButton,
  wireMapUnlockCritButton,
  wireMapUnlockMegaCritButton,
  wireMapUnlockUltraCritButton,
  wireMapUnlockChainCritButton,
  wireMapUnlockChainMegaCritButton,
  wireMapUnlockChainUltraCritButton,
  wireMapUnlockUpgradeCritButton,
  wireMapUnlockGrandOpeningCritButton,
  wireMapUnlockHeavenlyCritButton,
  wireMapUnlockPairCritButton,
  wireMapUnlockThreeOfAKindCritButton,
  wireMapUnlockFourOfAKindCritButton,
  wireMapUnlockFullHouseCritButton,
  wireMapUnlockRoyalFlushCritButton,
  wireIdleOverlayTestButton,
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
  createCorporationBoostMenuMarkup,
  wireCorporationBoostMenu,
  createCorporationStatsMarkup,
  wireCorporationStats,
  getGlobalIncomeBoostMultiplier,
  getCompanyAssetValue,
  getCompanyUpgradesValue,
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
  getBuildingMultiplier,
  getBuildingPrice,
  loadWallMaterial,
  loadRoofImage,
} from "./buildings";
import { loadMouseImage, forceSpawnMouse } from "./mouse";
import { startBackgroundMusic, preloadSounds, playSwoosh } from "./sound";
import { createNewCorporation, getCorporationPrice } from "./corporationName";
import { observeActionBarHeight } from "./utils";
import { getBackgroundUrls } from "./loadAssets";

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
    ${createFloorUpgradeMenuMarkup()}
    ${createCorporationUpgradeMenuMarkup()}
    ${createBoostMenuMarkup()}
    ${createCorporationBoostMenuMarkup()}
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

  await loadCloudImages();
  await loadMouseImage();
  await loadCoinImage();
  await loadFloatingCoinImage();
  await loadRoofImage(); // same roof art for every theme, loaded once

  // one Floor[] per building; only one building is ever shown on screen at a time
  // (see gameCanvas.ts's setActiveFloors) — switching which one is active/visible
  // happens entirely through the map menu below, not by scrolling/swiping.
  // Belongs entirely to whichever corporation is currently active (see
  // company.ts) — switching companies below empties this array and refills it
  // with that other company's own buildings, never mixing the two
  const buildings: Floor[][] = [];
  let activeBuildingIndex = 0;
  let activeCompanyIndex = getActiveCompanyIndex();
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
    persist,
    onOpenFloorUpgrades: (floor, floorNumber) =>
      floorUpgradeMenu.open(floor, floorNumber),
    onOpenCorporationStats: () => corporationStats.open(),
  });

  // ensures a building's next locked floor is waiting above it; onAdd only forwards
  // to gameCanvas.ts when this is the currently-active/on-screen building — an
  // inactive building's newly-added floor gets picked up automatically the next
  // time the player switches to it (setActiveFloors registers every floor fresh).
  function setupBuilding(buildingIndex: number): void {
    ensureLockedFloorAbove({
      floors: buildings[buildingIndex],
      backgroundCount: getBackgroundUrls().length,
      multiplier: getBuildingMultiplier(buildingIndex),
      onAdd: (floor) => {
        if (buildingIndex === activeBuildingIndex) {
          gameCanvas.notifyFloorAdded(floor);
        }
      },
    });
  }

  // switches which building is currently displayed — no travel animation yet, just
  // an instant cut to the new street.
  async function goToBuilding(buildingIndex: number): Promise<void> {
    activeBuildingIndex = buildingIndex;
    saveActiveBuildingIndex(activeCompanyIndex, buildingIndex);
    await loadBuildingThemeAssets();
    gameCanvas.setActiveFloors(buildings[buildingIndex]);
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
      saveCompanyRecord(activeCompanyIndex, {
        bankedTotal: getTotalIncome(),
        incomeRatePerSecond: getBuildingsCurrentIncomePerSecond(
          buildings,
          Date.now(),
        ),
        assetValue: getCompanyAssetValue(buildings),
        upgradesValue: getCompanyUpgradesValue(buildings),
        updatedAt: Date.now(),
      });
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
  }

  // dev/test-only controls; markup is stripped entirely in production builds
  if (import.meta.env.MODE !== "production") {
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
    wireSpawnCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceCritUpgrade(floor);
    });
    wireSpawnMegaCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceMegaCritUpgrade(floor);
    });
    wireSpawnUltraCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceUltraCritUpgrade(floor);
    });
    wireSpawnChainCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceChainCritUpgrade(floor, "crit");
    });
    wireSpawnChainMegaCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceChainCritUpgrade(floor, "mega");
    });
    wireSpawnChainUltraCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceChainCritUpgrade(floor, "ultra");
    });
    wireSpawnBoostCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceBoostCritUpgrade(floor, "crit");
    });
    wireSpawnBounceCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceBounceCritUpgrade(floor, "crit");
    });
    wireSpawnBounceMegaCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceBounceCritUpgrade(floor, "mega");
    });
    wireSpawnBounceUltraCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceBounceCritUpgrade(floor, "ultra");
    });
    wireSpawnExplosionCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceExplosionCritUpgrade(floor, "crit");
    });
    wireSpawnExplosionMegaCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceExplosionCritUpgrade(floor, "mega");
    });
    wireSpawnExplosionUltraCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceExplosionCritUpgrade(floor, "ultra");
    });
    wireSpawnBootyCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceBootyCritUpgrade(floor);
    });
    wireSpawnUpgradeCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceUpgradeCritUpgrade(floor);
    });
    wireSpawnPeppermintCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forcePeppermintCritUpgrade(floor);
    });
    wireSpawnHeavenlyCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceHeavenlyCritUpgrade(floor);
    });
    wireSpawnPairCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forcePairCritUpgrade(floor);
    });
    wireSpawnThreeOfAKindCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceThreeOfAKindCritUpgrade(floor);
    });
    wireSpawnFourOfAKindCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceFourOfAKindCritUpgrade(floor);
    });
    wireSpawnFullHouseCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceFullHouseCritUpgrade(floor);
    });
    wireSpawnRoyalFlushCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceRoyalFlushCritUpgrade(floor);
    });
    wireSpawnTickTockCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceTickTockCritUpgrade(floor);
    });
    wireSpawnChairGiveawayCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceChairGiveawayCritUpgrade(floor);
    });
    wireSpawnSuppliesGiveawayCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceSuppliesGiveawayCritUpgrade(floor);
    });
    wireSpawnWinterSaleCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceWinterSaleCritUpgrade(floor);
    });
    wireSpawnSpringSaleCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceSpringSaleCritUpgrade(floor);
    });
    wireSpawnSummerSaleCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceSummerSaleCritUpgrade(floor);
    });
    wireSpawnAutumnSaleCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceAutumnSaleCritUpgrade(floor);
    });
    wireSpawnHalloweenSaleCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceHalloweenSaleCritUpgrade(floor);
    });
    wireSpawnEasterSaleCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceEasterSaleCritUpgrade(floor);
    });
    wireSpawnSunshineCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceSunshineCritUpgrade(floor);
    });
    wireSpawnSnowdayCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceSnowdayCritUpgrade(floor);
    });
    wireSpawnFastForwardCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceFastForwardCritUpgrade(floor);
    });
    wireSpawnFrozenCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceFrozenCritUpgrade(floor);
    });
    wireSpawnSpendingFreezeCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceSpendingFreezeCritUpgrade(floor);
    });
    wireSpawnSnowballCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceSnowballCritUpgrade(floor);
    });
    wireSpawnFreeSaleCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceFreeSaleCritUpgrade(floor);
    });
    wireSpawnBullMarketCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceBullMarketCritUpgrade(floor);
    });
    wireSpawnPaydayCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forcePaydayCritUpgrade(floor);
    });
    wireSpawnGoldStandardCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceGoldStandardCritUpgrade(floor);
    });
    wireSpawnNightShiftCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceNightShiftCritUpgrade(floor);
    });
    wireSpawnInternCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceInternCritUpgrade(floor);
    });
    wireSpawnTalentScoutCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceTalentScoutCritUpgrade(floor);
    });
    wireSpawnUnionBossCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceUnionBossCritUpgrade(floor);
    });
    wireSpawnRushHourCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceRushHourCritUpgrade(floor);
    });
    wireSpawnRateLockCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceRateLockCritUpgrade(floor);
    });
    wireSpawnGoldenTicketCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceGoldenTicketCritUpgrade(floor);
    });
    wireSpawnSilverTicketCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceSilverTicketCritUpgrade(floor);
    });
    wireSpawnGrandOpeningCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceGrandOpeningCritUpgrade(floor);
    });
    wireSpawnFullyStaffedCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceFullyStaffedCritUpgrade(floor);
    });
    wireSpawnShiftChangeCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceShiftChangeCritUpgrade(floor);
    });
    wireSpawnEspressoShotCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceEspressoShotCritUpgrade(floor);
    });
    wireSpawnDejaVuCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceDejaVuCritUpgrade(floor);
    });
    wireSpawnCloneArmyCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceCloneArmyCritUpgrade(floor);
    });
    wireSpawnLuckyCloverCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceLuckyCloverCritUpgrade(floor);
    });
    wireSpawnSecondWindCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceSecondWindCritUpgrade(floor);
    });
    wireSpawnExecutiveOrderCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceExecutiveOrderCritUpgrade(floor);
    });
    wireSpawnRoundUpCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceRoundUpCritUpgrade(floor);
    });
    wireSpawnSafetyNetCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceSafetyNetCritUpgrade(floor);
    });
    wireSpawnFloorShareCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceFloorShareCritUpgrade(floor);
    });
    wireSpawnSameBoatCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceSameBoatCritUpgrade(floor);
    });
    wireSpawnGoldenHandshakeCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceGoldenHandshakeCritUpgrade(floor);
    });
    wireSpawnSupplyRunCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceSupplyRunCritUpgrade(floor);
    });
    wireSpawnCasualFridayCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceCasualFridayCritUpgrade(floor);
    });
    wireSpawnFancyFridayCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceFancyFridayCritUpgrade(floor);
    });
    wireSpawnFireDrillCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceFireDrillCritUpgrade(floor);
    });
    wireSpawnBonusRoundCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceBonusRoundCritUpgrade(floor);
    });
    wireSpawnOverflowCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceOverflowCritUpgrade(floor);
    });
    wireSpawnPerformanceBonusCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forcePerformanceBonusCritUpgrade(floor);
    });
    wireSpawnDoubleDownCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceDoubleDownCritUpgrade(floor);
    });
    wireSpawnCoffeeRunCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceCoffeeRunCritUpgrade(floor);
    });
    wireSpawnDressCodeCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceDressCodeCritUpgrade(floor);
    });
    wireSpawnTeaBreakCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceTeaBreakCritUpgrade(floor);
    });
    wireSpawnTeamBuildingCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceTeamBuildingCritUpgrade(floor);
    });
    wireSpawnTeamLunchCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceTeamLunchCritUpgrade(floor);
    });
    wireSpawnSpringCleaningCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceSpringCleaningCritUpgrade(floor);
    });
    wireSpawnNightOwlCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceNightOwlCritUpgrade(floor);
    });
    wireSpawnHeadhunterCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceHeadhunterCritUpgrade(floor);
    });
    wireSpawnRecruitmentDriveCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceRecruitmentDriveCritUpgrade(floor);
    });
    wireSpawnMergerCritButton(app, () => {
      const floor = [...(buildings[activeBuildingIndex] ?? [])]
        .reverse()
        .find((candidate) => candidate.unlocked);
      if (floor) forceMergerCritUpgrade(floor);
    });
    wireSpawnShareholdersCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceShareholdersCritUpgrade(floor);
    });
    wireSpawnGoldenParachuteCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceGoldenParachuteCritUpgrade(floor);
    });
    wireSpawnCashFlowCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceCashFlowCritUpgrade(floor);
    });
    wireSpawnPayoutCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forcePayoutCritUpgrade(floor);
    });
    wireForceBonusTierCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceBonusTierCritUpgrade(floor, "crit");
    });
    wireForceBonusTierMegaCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceBonusTierCritUpgrade(floor, "mega");
    });
    wireForceBonusTierUltraCritButton(app, () => {
      const floor = (buildings[activeBuildingIndex] ?? [])[0];
      if (floor) forceBonusTierCritUpgrade(floor, "ultra");
    });
    wireFloorBuyCritButton(app, () => forceFloorBuyCrit("crit"));
    wireFloorBuyBoostCritButton(app, () =>
      forceFloorBuyCrit("crit", false, true),
    );
    wireFloorBuyMegaCritButton(app, () => forceFloorBuyCrit("mega"));
    wireFloorBuyUltraCritButton(app, () => forceFloorBuyCrit("ultra"));
    wireFloorBuyChainCritButton(app, () => forceFloorBuyCrit("crit", true));
    wireFloorBuyChainMegaCritButton(app, () => forceFloorBuyCrit("mega", true));
    wireFloorBuyChainUltraCritButton(app, () =>
      forceFloorBuyCrit("ultra", true),
    );
    wireFloorBuyBounceCritButton(app, () =>
      forceFloorBuyCrit("crit", false, false, true),
    );
    wireFloorBuyBounceMegaCritButton(app, () =>
      forceFloorBuyCrit("mega", false, false, true),
    );
    wireFloorBuyBounceUltraCritButton(app, () =>
      forceFloorBuyCrit("ultra", false, false, true),
    );
    wireFloorBuyExplosionCritButton(app, () =>
      forceFloorBuyCrit("crit", false, false, false, true),
    );
    wireFloorBuyExplosionMegaCritButton(app, () =>
      forceFloorBuyCrit("mega", false, false, false, true),
    );
    wireFloorBuyExplosionUltraCritButton(app, () =>
      forceFloorBuyCrit("ultra", false, false, false, true),
    );
    wireFloorBuyBootyCritButton(app, () =>
      forceFloorBuyCrit("crit", false, false, false, false, true),
    );
    wireFloorBuyUpgradeCritButton(app, () =>
      forceFloorBuyCrit("crit", false, false, false, false, false, true),
    );
    wireFloorBuyPeppermintCritButton(app, () =>
      forceFloorBuyCrit("crit", false, false, false, false, false, false, true),
    );
    wireFloorBuyHeavenlyCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
      ),
    );
    wireFloorBuyPairCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
      ),
    );
    wireFloorBuyThreeOfAKindCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
      ),
    );
    wireFloorBuyFourOfAKindCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
      ),
    );
    wireFloorBuyFullHouseCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
      ),
    );
    wireFloorBuyRoyalFlushCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
      ),
    );
    wireFloorBuyTickTockCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
      ),
    );
    wireFloorBuyChairGiveawayCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
      ),
    );
    wireFloorBuySuppliesGiveawayCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
      ),
    );
    wireFloorBuyWinterSaleCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
      ),
    );
    wireFloorBuySpringSaleCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
      ),
    );
    wireFloorBuySummerSaleCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
      ),
    );
    wireFloorBuyAutumnSaleCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
      ),
    );
    wireFloorBuyHalloweenSaleCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
      ),
    );
    wireFloorBuyEasterSaleCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        null,
        false,
        false,
        true,
      ),
    );
    wireFloorBuySunshineCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
      ),
    );
    wireFloorBuySnowdayCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
      ),
    );
    wireFloorBuyFastForwardCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
      ),
    );
    wireFloorBuyFrozenCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
      ),
    );
    wireFloorBuySnowballCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
      ),
    );
    wireFloorBuyFreeSaleCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
      ),
    );
    wireFloorBuyPaydayCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
        false,
      ),
    );
    wireFloorBuyGoldStandardCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
      ),
    );
    wireFloorBuyNightShiftCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
      ),
    );
    wireFloorBuyInternCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        null,
        true,
      ),
    );
    wireFloorBuyUnionBossCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        null,
        false,
        true,
      ),
    );
    wireFloorBuyRushHourCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        null,
        false,
        false,
        false,
        true,
      ),
    );
    wireFloorBuyGoldenTicketCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        null,
        false,
        false,
        false,
        false,
        true,
      ),
    );
    wireFloorBuySilverTicketCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        null,
        false,
        false,
        false,
        false,
        false,
        true,
      ),
    );
    wireFloorBuyGrandOpeningCritButton(app, () =>
      forceGrandOpeningFloorBuyCrit("crit"),
    );
    wireFloorBuyFullyStaffedCritButton(app, () =>
      forceFullyStaffedFloorBuyCrit("crit"),
    );
    wireFloorBuyEspressoShotCritButton(app, () =>
      forceEspressoShotFloorBuyCrit("crit"),
    );
    wireFloorBuyDejaVuCritButton(app, () => forceDejaVuFloorBuyCrit("crit"));
    wireFloorBuyCloneArmyCritButton(app, () =>
      forceCloneArmyFloorBuyCrit("crit"),
    );
    wireFloorBuyLuckyCloverCritButton(app, () =>
      forceLuckyCloverFloorBuyCrit("crit"),
    );
    wireFloorBuySecondWindCritButton(app, () =>
      forceSecondWindFloorBuyCrit("crit"),
    );
    wireFloorBuyExecutiveOrderCritButton(app, () =>
      forceExecutiveOrderFloorBuyCrit("crit"),
    );
    wireFloorBuyRoundUpCritButton(app, () => forceRoundUpFloorBuyCrit("crit"));
    wireFloorBuyGoldenHandshakeCritButton(app, () =>
      forceGoldenHandshakeFloorBuyCrit("crit"),
    );
    wireFloorBuySupplyRunCritButton(app, () =>
      forceSupplyRunFloorBuyCrit("crit"),
    );
    wireFloorBuyCasualFridayCritButton(app, () =>
      forceCasualFridayFloorBuyCrit("crit"),
    );
    wireFloorBuyFancyFridayCritButton(app, () =>
      forceFancyFridayFloorBuyCrit("crit"),
    );
    wireFloorBuyFireDrillCritButton(app, () =>
      forceFireDrillFloorBuyCrit("crit"),
    );
    wireFloorBuyPerformanceBonusCritButton(app, () =>
      forcePerformanceBonusFloorBuyCrit("crit"),
    );
    wireFloorBuyDoubleDownCritButton(app, () =>
      forceDoubleDownFloorBuyCrit("crit"),
    );
    wireFloorBuyCoffeeRunCritButton(app, () =>
      forceCoffeeRunFloorBuyCrit("crit"),
    );
    wireFloorBuyDressCodeCritButton(app, () =>
      forceDressCodeFloorBuyCrit("crit"),
    );
    wireFloorBuyTeaBreakCritButton(app, () =>
      forceTeaBreakFloorBuyCrit("crit"),
    );
    wireFloorBuyTeamBuildingCritButton(app, () =>
      forceTeamBuildingFloorBuyCrit("crit"),
    );
    wireFloorBuySpringCleaningCritButton(app, () =>
      forceSpringCleaningFloorBuyCrit("crit"),
    );
    wireFloorBuyNightOwlCritButton(app, () =>
      forceNightOwlFloorBuyCrit("crit"),
    );
    wireFloorBuyHeadhunterCritButton(app, () =>
      forceHeadhunterFloorBuyCrit("crit"),
    );
    wireFloorBuyRecruitmentDriveCritButton(app, () =>
      forceRecruitmentDriveFloorBuyCrit("crit"),
    );
    wireFloorBuyGoldenParachuteCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        null,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
      ),
    );
    wireFloorBuyPayoutCritButton(app, () => forcePayoutFloorBuyCrit("crit"));
    wireMapUnlockCritButton(app, () => forceFloorBuyCrit("crit"));
    wireMapUnlockMegaCritButton(app, () => forceFloorBuyCrit("mega"));
    wireMapUnlockUltraCritButton(app, () => forceFloorBuyCrit("ultra"));
    wireMapUnlockChainCritButton(app, () => forceFloorBuyCrit("crit", true));
    wireMapUnlockChainMegaCritButton(app, () =>
      forceFloorBuyCrit("mega", true),
    );
    wireMapUnlockChainUltraCritButton(app, () =>
      forceFloorBuyCrit("ultra", true),
    );
    wireMapUnlockUpgradeCritButton(app, () =>
      forceFloorBuyCrit("crit", false, false, false, false, false, true),
    );
    wireMapUnlockGrandOpeningCritButton(app, () =>
      forceGrandOpeningFloorBuyCrit("crit"),
    );
    wireMapUnlockHeavenlyCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
      ),
    );
    wireMapUnlockPairCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
      ),
    );
    wireMapUnlockThreeOfAKindCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
      ),
    );
    wireMapUnlockFourOfAKindCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
      ),
    );
    wireMapUnlockFullHouseCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
      ),
    );
    wireMapUnlockRoyalFlushCritButton(app, () =>
      forceFloorBuyCrit(
        "crit",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
      ),
    );
    // shows the idle-income "You have earned" overlay (see
    // hud/totalEarnedOverlay) on demand, without needing to actually leave and
    // reopen the tab to earn real idle income first
    wireIdleOverlayTestButton(app, () =>
      totalEarnedOverlay.show(fromNumber(123456)),
    );
    wireResetButton(app, buildings);
    // wired last, so it sees every dropdown/button the block above created
    wireTestActionsFilter(app);
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
  const corporationUpgradeMenu = wireCorporationUpgradeMenu(
    app,
    getCorporationPrice,
    () => {
      if (!spendFromAllCompanies(getCorporationPrice())) return;
      const newIndex = createNewCorporation();
      corporationUpgradeMenu.close();
      setTimeout(() => {
        playSwoosh();
        cityMapView.animateSwitchToCompany(newIndex);
      }, DIALOG_CLOSE_MS - SWITCH_LEAD_MS);
    },
    // "Merge" (see hud/corporationUpgradeMenu's own Merge section): folds every
    // selected company's income/upgrades/stock into whichever one has the most
    // map progression, then closes the dialog and barrel-rolls to it, same
    // close+animate choreography as "Create new Corporation" above. If the
    // company we're switching AWAY from was itself one of the merged-away
    // ones, flag the next switch to skip re-snapshotting its now-stale live
    // state over the clear mergeCompanies already wrote to storage for it
    (companyIndices) => {
      const result = mergeCompanies(companyIndices);
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
    (floor) => gameCanvas.scrollActiveToFloor(floor),
    (floor) => gameCanvas.scrollActiveToFloor(floor),
  );
  const corporationBoostMenu = wireCorporationBoostMenu(app);
  const totalEarnedOverlay = wireTotalEarnedOverlay(app);
  // buys the next building outright if affordable (see buildings.ts's
  // getBuildingPrice, which scales 1000x per building same as its economy).
  // Returns whether it succeeded so the map menu can decide whether to re-render
  function buyBuilding(): boolean {
    const buildingIndex = buildings.length;
    if (!spendTotalIncome(getBuildingPrice(buildingIndex))) return false;
    buildings.push(createBuilding(buildingIndex, getBackgroundUrls().length));
    setupBuilding(buildingIndex);
    persist();
    return true;
  }

  // unlocks every remaining floor of an ALREADY-BOUGHT building in one shot —
  // the city map's long-press-on-the-green-dot gesture (see cityMap/index.ts,
  // markers.ts's drawBuyAllFloorsIndicator). Returns whether it succeeded (false
  // if there's nothing left to unlock, or it's not actually affordable)
  function buyAllFloorsForBuilding(buildingIndex: number): boolean {
    const floors = buildings[buildingIndex];
    if (!floors) return false;
    const multiplier = getBuildingMultiplier(buildingIndex);
    const cost = getBuildingUnlockAllCost(floors, multiplier);
    if (isZero(cost) || !spendTotalIncome(cost)) return false;
    unlockAllFloors({
      floors,
      backgroundCount: getBackgroundUrls().length,
      multiplier,
      onAdd: (floor) => {
        if (buildingIndex === activeBuildingIndex) {
          gameCanvas.notifyFloorAdded(floor);
        }
      },
    });
    persist();
    return true;
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
  ): void {
    const floors = buildings[buildingIndex];
    if (!floors) return;
    const { tier, chain } = result;
    for (const floor of floors) floor.critMultiplierTier = tier;
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
            if (buildingIndex === activeBuildingIndex) {
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
      // grand opening crit: same reward as at floor scope — unlocks every
      // remaining locked floor of this building for free
      grandOpening: (floors) => {
        unlockAllFloors({
          floors,
          backgroundCount: getBackgroundUrls().length,
          multiplier: getBuildingMultiplier(buildingIndex),
          onAdd: (floor) => {
            if (buildingIndex === activeBuildingIndex) {
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
          if (buildingIndex === activeBuildingIndex) {
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
  ): void {
    applyBuildingCritTier(buildingIndex, result);
    if (result.chain) {
      let continueChain = true;
      while (continueChain) {
        const nextIndex = buildings.length;
        buildings.push(createBuilding(nextIndex, getBackgroundUrls().length));
        setupBuilding(nextIndex);
        applyBuildingCritTier(nextIndex, result);
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
        const nextIndex = buildings.length;
        buildings.push(createBuilding(nextIndex, getBackgroundUrls().length));
        setupBuilding(nextIndex);
        applyBuildingCritTier(nextIndex, result);
      }
    }
    persist();
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
    getBuildingFloorCount: (buildingIndex) =>
      // buildings[i] always includes one extra locked floor waiting above the
      // topmost unlocked one (see ensureLockedFloorAbove) — the marker should
      // only count floors actually unlocked, not that placeholder
      buildings[buildingIndex]?.filter((floor) => floor.unlocked).length ?? 0,
    getBuildingCritTier: (buildingIndex) => {
      const floors = buildings[buildingIndex];
      if (!floors || floors.length === 0) return null;
      const tier = floors[0].critMultiplierTier;
      return tier && floors.every((floor) => floor.critMultiplierTier === tier)
        ? tier
        : null;
    },
    getBuildingUnlockAllCost: (buildingIndex) =>
      getBuildingUnlockAllCost(
        buildings[buildingIndex] ?? [],
        getBuildingMultiplier(buildingIndex),
      ),
    buyBuilding,
    buyAllFloors: buyAllFloorsForBuilding,
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
      if (mapOpen) corporationBoostMenu.open();
      else boostMenu.open();
    },
    onOpenUpgradeMenu: () => {
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

  const idleIncome = computeIdleIncome(
    buildings,
    currentIncomeRatePerSecond,
    getGlobalIncomeBoostMultiplier(),
  );
  // saveBuildings directly (not the debounced persist()): computeIdleIncome advances
  // every floor's lastCollectedAt in memory, and that must land before a second quick
  // reload could otherwise re-collect the same already-paid-out idle time
  saveBuildings(buildings, activeCompanyIndex);
  if (gt(idleIncome, fromNumber(0))) {
    addTotalIncome(idleIncome);
    totalEarnedOverlay.show(idleIncome);
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

  // beforeunload alone is unreliable for catching "the player actually left" —
  // especially on mobile, where backgrounding/swiping away/OS-killing a tab
  // very often never fires it at all — which is exactly why the idle-income
  // popup was reported as inconsistent (last-close simply never got stamped
  // for however long that session ran). visibilitychange's "hidden" state
  // fires far more reliably across platforms (backgrounding, locking the
  // screen, switching apps, and a normal close all trigger it), so stamp the
  // same close-timestamp there too. Harmless if the player comes right back —
  // the timestamp just gets refreshed again the next time they actually leave
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "hidden") return;
    if (!isStorageIntact()) return;
    markAppClosed();
    saveBuildings(buildings, activeCompanyIndex);
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
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch((err) => console.error("Service worker registration failed", err));
  });
}
