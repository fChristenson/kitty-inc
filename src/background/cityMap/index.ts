import { drawCartoonText } from "../../utils";
import { COLOR } from "../../palette";
import {
  playSold,
  playCoinDrop,
  playExplosion,
  playJackpot,
  playPayout,
  playSwoosh,
  playAutoPurchase,
} from "../../sound";
import { getBuildingPrice } from "../../buildings";
import { getCityName } from "../../cityName";
import { setActiveCompanyIndex } from "../../company";
import { getEffectiveDpr } from "../../shared/devicePixelRatio";
import { arrowIconMarkup } from "../../shared/arrowIcon";
import { onTapOrHold } from "../../shared/tapEvents";
import {
  spawnCoinBurstAt,
  drawActiveCoinBursts,
  hasActiveCoinBursts,
} from "../../coinBurst";
import {
  MARKER_COUNT,
  MARKER_H,
  CAT_STAND_FRAME,
  CAT_JUMP_FRAME,
  CAT_POSE_SWAP_MS,
  markerCenter,
  hitTestAnyMarker,
  drawCatMarker,
  drawLockedMarkerPrice,
  drawMarkerFloorCount,
  getMarkerJumpOffset,
  MARKER_COIN_BURST_SCALE,
  drawBuyAllFloorsIndicator,
  drawBuyAllBuildingItemsIndicator,
} from "./markers";
import { MAX_FLOORS_PER_BUILDING, rollFloorBuyCrit } from "../../floors";
import {
  CRIT_TIER_CONFIG,
  UPGRADE_CRIT_LABEL,
  UPGRADE_CRIT_COLOR,
  HEAVENLY_CRIT_LABEL,
  HEAVENLY_CRIT_COLOR,
  MYSTIC_CRIT_LABEL,
  MYSTIC_CRIT_COLOR,
  GRAND_OPENING_CRIT_LABEL,
  GRAND_OPENING_CRIT_COLOR,
  runFirstCritProc,
  type CritTier,
  type CritProcKind,
  type CritRollResult,
} from "../../shared/critTypes";
import { loadCityMapState, saveCityMapState } from "./cityMapState";
import { createIncomeReadout } from "./incomeReadout";
import { createCorpBarrel } from "./corpBarrel";
import { createCityTransitions } from "./transitions";
import { createCloudCat } from "./cloudCat";
import {
  createFloatingTextParticle,
  updateFloatingTextParticles,
  drawFloatingTextParticle,
  type FloatingTextParticle,
} from "../../shared/floatingText";
import { loadSprite, loadImageByName } from "../../loadAssets";
import { getCritBadgeOverlay } from "../../shared/critBadgeOverlay";
import { createPurchaseFeedback } from "../../shared/purchaseFeedback";
import {
  createFloatingBadgeParticle,
  updateFloatingBadgeParticles,
  drawFloatingBadgeParticle,
  type FloatingBadgeParticle,
} from "../../shared/floatingBadges";
import { type BigNumber, gte, isZero } from "../../shared/bigNumber";
import {
  triggerScreenShake,
  getScreenShakeOffset,
  drawCritFlash,
  isCritFlashActive,
} from "../../screenShake";

// a static overview map (see docs/prompts.md's "City map tile" prompt), drawn
// zoomed out to fill the view, with a cat marker per building standing in for the
// eventual "pick a building to unlock" map screen: whichever building is currently
// active plays the stand/jump cycle, any other unlocked building just stands, and
// the next building to unlock shows grayed out with its price until bought
// (see ./markers for marker geometry/drawing (its price bounce transform now
// lives in shared/bounceWiggle), ./speedLines for the prev/next transition rays,
// ./corpBarrel for the corp-name barrel, ./incomeReadout for the total-income
// text, ./cityMapState for the persisted "which city page" state)

// gap between the total-income readout and each city's own name, drawn flat right
// below it (see drawStreetText) — the name itself comes from cityName.ts's
// getCityName, keyed by which city (5-building page) is currently being viewed
const STREET_TEXT_GAP_BELOW_INCOME = 12;

// what one tick of the corner mascot's auto-buyer got through — one purchase
// at most, `label` describing it ("+1 floor", "+1 worker", ...) or null when
// nothing was affordable
export interface CheapestBatch {
  label: string | null;
  badges: Partial<Record<CritProcKind, number>>;
}

let mapImage: HTMLImageElement | null = null;
let catSprite: HTMLImageElement | null = null;
let managerSprite: HTMLImageElement | null = null;

// loads the map screen's own backdrop + marker cat sprite
export async function loadCityMapImage(): Promise<HTMLImageElement> {
  [mapImage, catSprite, managerSprite] = await Promise.all([
    loadImageByName("cityMapBackground"),
    loadSprite("worker"),
    loadSprite("manager"),
  ]);
  return mapImage!;
}

export interface CityMapDeps {
  getTotalIncome: () => BigNumber;
  getBuildingCount: () => number; // buildings unlocked so far; building 1 exists once this is >= 2
  getActiveBuildingIndex: () => number; // whichever building's floors are on screen right now
  getBuildingFloorCount: (buildingIndex: number) => number; // for the "X/20" marker readout
  isBuildingFullyManaged: (buildingIndex: number) => boolean;
  // the crit tier EVERY floor of this building currently shares (see
  // setBuildingCritTier below), or null if they don't all match — colors the
  // "X/20" marker readout so a crit-maxed building stands out on the map
  getBuildingCritTier: (buildingIndex: number) => CritTier | null;
  // $ to unlock EVERY remaining locked floor in a building at once — ZERO once
  // there's nothing left to buy (already maxed). Drives the green buy-all-floors
  // dot (see markers.ts's drawBuyAllFloorsIndicator) and its long-press gesture
  getBuildingUnlockAllCost: (buildingIndex: number) => BigNumber;
  // $ to complete every remaining upgrade, worker, and office item on every
  // unlocked floor of an already-bought building. Drives the purple indicator
  // and its higher-priority long-press gesture.
  getBuildingUpgradeAllCost: (buildingIndex: number) => BigNumber;
  buyBuilding: () => boolean; // unlocks building 1 if affordable
  canRenovateBuilding: (buildingIndex: number) => boolean;
  onStateChanged: () => void; // schedules persistence after any map-node purchase
  // long-press-on-the-green-dot gesture below: unlocks every remaining floor of
  // an already-bought building in one shot. Returns whether it succeeded
  buyAllFloors: (
    buildingIndex: number,
    onPurchased?: () => void,
  ) => Promise<boolean>;
  buyAllFloorUpgrades: (
    buildingIndex: number,
    onPurchased?: () => void,
  ) => Promise<boolean>;
  // long-press fallback after all floors are unlocked and the purple action is
  // unavailable: buys as many currently-cheapest floor upgrades as affordable
  buyCheapestFloorUpgrades: (
    buildingIndex: number,
    onPurchased?: () => void,
  ) => Promise<boolean>;
  // one batch of the corner mascot's background auto-buyer: works the next few
  // cheapest floors in the company and reports the badges that landed. Buying
  // nothing is normal (the player may just be broke for the moment) — the job
  // runs until the mascot is toggled back off, not until this stops paying out
  runCheapestBatch: () => Promise<CheapestBatch>;
  // sets EVERY floor this building currently has (locked or not) to
  // result.tier, permanently — the reward for a crit landing on that
  // building's own purchase (see rollFloorBuyCrit below). Does NOT unlock
  // anything itself; a locked floor still has to be bought normally, it'll
  // just already be that tier once it is (any brand new floor added after
  // this also inherits it, see floorLock.ts's ensureLockedFloorAbove).
  // result.chain (see rollFloorBuyCrit's own chain flag) additionally keeps
  // promoting/auto-unlocking floors ABOVE this building's current floor
  // list. result.upgrade instead promotes EVERY floor this building has one
  // further step past whatever tier they were just set to. result.heavenly
  // unlocks every remaining floor of this building for free, maxes every
  // floor's tier, and grants each one a full max-tier free-upgrade batch —
  // the same reward a heavenly crit landing on a normal upgrade click
  // grants, just applied to this whole newly-bought building. result.
  // grandOpening unlocks every remaining floor of this building for free.
  // The other procs don't apply at building scope at all — main.ts's own
  // applyBuildingCritTier simply has no handler for them
  setBuildingCritTier: (buildingIndex: number, result: CritRollResult) => void;
  onSelectBuilding: (index: number) => void; // switch to that building and leave the map view
  // fires once the corporation barrel roll settles on a different company (see
  // rollCorporationSelection) so main.ts can swap in that company's own separate
  // buildings/totalIncome/active building — see company.ts
  onSwitchCompany: (companyIndex: number) => void;
  // fired by a plain tap on the total-income readout at the top of the map
  // (see incomeReadout.ts) — opens the read-only corporation income rate/
  // modifiers breakdown (hud/corporationStats), same as gameCanvas's own HUD
  onOpenCorporationStats: () => void;
}

export interface CityMapView {
  // re-measures the canvas's own CSS size and redraws; call after un-hiding it,
  // since a display:none canvas can't be measured while hidden. Also jumps back to
  // whichever city the player's currently-active building lives in, so opening the
  // map always starts on "where you are" instead of wherever it was last left
  refresh: () => void;
  // flashes the same speed-line rays the city prev/next arrows use, but running
  // vertically — for the action bar's own scroll-to-top/scroll-to-bottom buttons
  // while the map is open (see main.ts). -1 streams upward, 1 streams downward
  flashVerticalRays: (direction: -1 | 1) => void; // same, but jumps the barrel straight to the top/bottommost company instead
  // of one step — for a HELD scroll button (see main.ts's action-bar wiring)
  jumpToEnd: (direction: -1 | 1) => void; // same blur/speed-line/roll flourish as a normal barrel-roll switch, but
  // jumping straight to a given company index in one motion — for a switch
  // triggered OUTSIDE the barrel-roll gesture itself (see main.ts's
  // corporationUpgradeMenu wiring, right after a newly-bought company becomes active)
  animateSwitchToCompany: (companyIndex: number) => void;
  showCritBadges: (counts: Partial<Record<CritProcKind, number>>) => void;
  // switches the corner mascot's auto-buyer off if it's running — leaving the
  // map for a building's floors hands control back to the player
  stopAutoBuyer: () => void;
  destroy: () => void;
}

// up-arrow icon; rotated per direction via CSS (.city-map__arrow--prev/--next in
// style.css) rather than baking rotation into the markup itself. Drawn twice — a
// fat black pass behind, a fatter currentColor pass in front — for a bordered look,
// since these are open stroked lines rather than a fillable shape
const ARROW_SVG = arrowIconMarkup(52);

// canvas + prev/next city arrows + the anime-style transition overlay (an SVG
// JS animates real <line> rays across, in sync with a swoosh, while cityIndex
// changes underneath — see playSpeedLines), wrapped together so toggling the
// wrapper's hidden attribute hides all of it at once (see main.ts's
// openMapView/closeMapView)
export function createCityMapMarkup(): string {
  return `
    <div class="city-map" id="city-map" hidden>
      <canvas class="game__canvas" id="map-canvas"></canvas>
      <svg class="city-map__speed-lines" id="city-map-speed-lines" aria-hidden="true"></svg>
      <span class="city-map__corp-pointer" aria-hidden="true">${ARROW_SVG}</span>
      <button class="city-map__arrow city-map__arrow--prev" id="city-map-prev" aria-label="Previous city" hidden>${ARROW_SVG}</button>
      <button class="city-map__arrow city-map__arrow--next" id="city-map-next" aria-label="Next city" hidden>${ARROW_SVG}</button>
    </div>
  `;
}

// so a reload lands the player back on the same city page they had selected —
// namespaced per company (see ./cityMapState)

export function createCityMapView(
  container: HTMLElement,
  deps: CityMapDeps,
): CityMapView {
  const canvas = container.querySelector<HTMLCanvasElement>("#map-canvas")!;
  const speedLinesSvg = container.querySelector<SVGSVGElement>(
    "#city-map-speed-lines",
  )!;
  const prevButton =
    container.querySelector<HTMLButtonElement>("#city-map-prev")!;
  const nextButton =
    container.querySelector<HTMLButtonElement>("#city-map-next")!;
  const ctx = canvas.getContext("2d")!;
  let cssW = 0;
  let cssH = 0;
  // pre-scaled copy of mapImage (a large native-resolution source), cached so
  // redraw() never has to ask the browser to resample the huge original down
  // to display size on every single frame — that repeated resampling is what
  // made crit celebrations here visibly lag, since a crit flash forces the
  // tick loop to full frame rate for its whole duration (see isCritFlashActive
  // below). Rebuilt only when the source image or the display size changes
  let scaledMapCanvas: HTMLCanvasElement | null = null;
  let scaledMapForImage: HTMLImageElement | null = null;
  let scaledMapW = 0;
  let scaledMapH = 0;
  function getScaledMapCanvas(): HTMLCanvasElement | null {
    if (!mapImage) return null;
    const dpr = getEffectiveDpr();
    const targetW = Math.round(cssW * dpr);
    const targetH = Math.round(cssH * dpr);
    if (
      scaledMapCanvas &&
      scaledMapForImage === mapImage &&
      scaledMapW === targetW &&
      scaledMapH === targetH
    ) {
      return scaledMapCanvas;
    }
    const offscreen = document.createElement("canvas");
    offscreen.width = targetW;
    offscreen.height = targetH;
    const offCtx = offscreen.getContext("2d")!;
    offCtx.imageSmoothingEnabled = true;
    offCtx.imageSmoothingQuality = "high";
    // same "cover" fit math the old direct-draw used, just done once here
    // instead of every frame
    const fitScale = Math.max(
      targetW / mapImage.naturalWidth,
      targetH / mapImage.naturalHeight,
    );
    const drawW = mapImage.naturalWidth * fitScale;
    const drawH = mapImage.naturalHeight * fitScale;
    offCtx.drawImage(
      mapImage,
      (targetW - drawW) / 2,
      (targetH - drawH) / 2,
      drawW,
      drawH,
    );
    scaledMapCanvas = offscreen;
    scaledMapForImage = mapImage;
    scaledMapW = targetW;
    scaledMapH = targetH;
    return scaledMapCanvas;
  }
  // the income readout's own actual drawn bottom edge as of the last redraw()
  // (see incomeReadout.draw's return value) — read by onClick's own HUD tap
  // hit-test below, since its extent varies once a unit-name line appears
  let incomeBottomY = 0;

  // reacts to the corp barrel settling on a (possibly new) company — sets the
  // active-company pointer, jumps this map's own city page to that company's
  // last one, and lets main.ts swap in its buildings/totalIncome (see
  // CityMapDeps.onSwitchCompany)
  function handleCompanySelected(companyIndex: number): void {
    setActiveCompanyIndex(companyIndex);
    cityIndex = loadCityMapState(companyIndex).cityIndex;
    deps.onSwitchCompany(companyIndex);
    persistCityMapState();
  }

  const corpBarrel = createCorpBarrel({
    redraw: () => redraw(),
    onCompanySelected: handleCompanySelected,
  });
  const incomeReadout = createIncomeReadout();
  const cloudCat = createCloudCat();
  const critBadges = getCritBadgeOverlay();
  const showCritBadges = critBadges.show;
  const purchaseFeedback = createPurchaseFeedback({
    sound: playSold,
    burst: spawnCoinBurstAt,
    redraw: () => redraw(),
  });
  function showPurchaseFeedback(
    globalIndex: number,
    markerIndex: number,
  ): void {
    const { cx, feetY } = markerCenter(cssW, cssH, markerIndex);
    purchaseFeedback(
      globalIndex,
      cx,
      feetY - MARKER_H / 2,
      MARKER_COIN_BURST_SCALE,
    );
  }
  const transitions = createCityTransitions({
    canvas,
    speedLinesSvg,
    getCssSize: () => ({ cssW, cssH }),
    rollOneStep: (direction) => corpBarrel.rollOneStep(direction),
    rollToEnd: (direction) => corpBarrel.rollToEnd(direction),
    resolveCompanyTargetPosition: (companyIndex) =>
      corpBarrel.resolveTargetPosition(companyIndex),
    rollToPosition: (targetPosition) =>
      corpBarrel.rollToPosition(targetPosition),
    getSelectedPosition: () => corpBarrel.getSelectedPosition(),
    shiftCityIndex: (delta) => {
      cityIndex += delta;
      persistCityMapState();
      redraw();
    },
    jumpCityIndexToEnd: (delta) => {
      cityIndex = delta < 0 ? 0 : lastReachableCityIndex();
      persistCityMapState();
      redraw();
    },
  });

  const restoredState = loadCityMapState(
    corpBarrel.companyIndexAtPosition(corpBarrel.getSelectedPosition()),
  );
  // which city's 5-building page is currently shown; a city is "complete" (and the
  // next one reachable) once all MARKER_COUNT of its buildings are bought — see
  // updateArrows. Restored on load (see loadCityMapState) so a reload lands back
  // on the same page instead of always starting at city 0
  let cityIndex = restoredState.cityIndex;

  // saves cityIndex under the currently-selected company's own key any time it
  // changes, so a reload can restore it
  function persistCityMapState(): void {
    saveCityMapState(
      corpBarrel.companyIndexAtPosition(corpBarrel.getSelectedPosition()),
      { cityIndex },
    );
  }

  // set by redraw() whenever a marker's one-shot unlock hop is mid-flight (see
  // getMarkerJumpOffset) — read by the tick loop further down to temporarily run
  // at full frame rate instead of its usual throttled cadence
  let hasActiveMarkerJump = false;

  // the corner mascot's background auto-buyer. Toggled by tapping the cat; runs
  // whether or not the map is on screen, and only stops when toggled back off
  const AUTO_BUY_INTERVAL_MS = 100;
  const BADGE_FLOAT_SIZE = 56;
  const BADGE_FLOAT_RELEASE_MS = 180;
  const badgeFloats: FloatingBadgeParticle[] = [];
  const pendingBadgeFloats: CritProcKind[] = [];
  let nextBadgeReleaseAt = 0;
  const BOUGHT_TEXT_FONT_PX = 11;
  const BOUGHT_TEXT_RISE_PER_TICK = 1.2;
  const BOUGHT_TEXT_SPAWN_Y_OFFSET = 40; // above the mascot, not on top of it
  let autoBuyTimer: ReturnType<typeof setInterval> | null = null;
  const boughtFloats: FloatingTextParticle[] = [];
  let lastBadgeFloatUpdate = 0;

  function toggleAutoBuyer(): void {
    if (autoBuyTimer !== null) {
      stopAutoBuyer();
      return;
    }
    cloudCat.setAwake(true, Date.now());
    playSwoosh();
    autoBuyTimer = setInterval(runAutoBuyBatch, AUTO_BUY_INTERVAL_MS);
  }

  function stopAutoBuyer(): void {
    if (autoBuyTimer === null) return;
    clearInterval(autoBuyTimer);
    autoBuyTimer = null;
    cloudCat.setAwake(false, Date.now());
    playSwoosh();
  }

  let autoBuyRunning = false;
  async function runAutoBuyBatch(): Promise<void> {
    if (autoBuyRunning || critBadges.visible) return;
    autoBuyRunning = true;
    try {
      const { label, badges } = await deps.runCheapestBatch();
      const now = Date.now();
      if (label === null) return;
      indicatorCosts.clear();
      deps.onStateChanged();
      playAutoPurchase();
      const { x, y } = cloudCat.cheer(cssW, cssH, now);
      boughtFloats.push(
        createFloatingTextParticle(x, y - BOUGHT_TEXT_SPAWN_Y_OFFSET, label),
      );
      for (const [kind, count] of Object.entries(badges)) {
        critBadges.loadImage(kind as CritProcKind);
        for (let index = 0; index < count; index++)
          pendingBadgeFloats.push(kind as CritProcKind);
      }
      redraw();
    } catch (error) {
      stopAutoBuyer();
      console.error("Automatic purchase failed", error);
    } finally {
      autoBuyRunning = false;
    }
  }

  function drawBadgeFloats(now: number): void {
    if (pendingBadgeFloats.length > 0 && now >= nextBadgeReleaseAt) {
      const kind = pendingBadgeFloats.shift()!;
      const bounds = cloudCat.bounds(cssW, cssH);
      badgeFloats.push(
        createFloatingBadgeParticle(
          bounds.left - 10 - BADGE_FLOAT_SIZE / 2,
          bounds.top + bounds.size / 2,
          critBadges.loadImage(kind),
        ),
      );
      nextBadgeReleaseAt = now + BADGE_FLOAT_RELEASE_MS;
    }
    if (boughtFloats.length === 0 && badgeFloats.length === 0) {
      lastBadgeFloatUpdate = now;
      return;
    }
    // shared/floatingText's own "~16.67ms per tick" convention
    const dt = Math.min(6, (now - lastBadgeFloatUpdate) / 16.67);
    lastBadgeFloatUpdate = now;
    updateFloatingBadgeParticles(badgeFloats, dt, 1.1);
    for (const badge of badgeFloats)
      drawFloatingBadgeParticle(ctx, badge, BADGE_FLOAT_SIZE);
    updateFloatingTextParticles(boughtFloats, dt, BOUGHT_TEXT_RISE_PER_TICK);
    for (const text of boughtFloats)
      drawFloatingTextParticle(ctx, text, BOUGHT_TEXT_FONT_PX);
  }

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    cssW = rect.width;
    cssH = rect.height;
    const dpr = getEffectiveDpr();
    const targetW = Math.round(cssW * dpr);
    const targetH = Math.round(cssH * dpr);
    // reassigning canvas.width/height reallocates+clears the whole backing store, so
    // skip it when the size hasn't actually changed — redraw() calls resize() every
    // single frame (tick() runs at rAF cadence for as long as the map stays open),
    // and doing that reallocation 60x/sec was the actual source of the reported
    // map-open freeze (each redraw() turning into a full canvas reallocation)
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
  }

  // "Cat City", flat, centered just below the total-income text (drawn right
  // after this in redraw(), which passes down where that text's own bottom edge
  // landed so this doesn't have to duplicate its font/position math)
  function drawStreetText(topY: number, name: string): void {
    ctx.font = '900 22px "Fredoka", system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    drawCartoonText(ctx, name, cssW / 2, topY, COLOR.white, COLOR.black, 5);
  }

  // "1/12" — which city page is currently shown vs how many pages are actually
  // reachable so far — a page becomes reachable the instant the one before it
  // is fully bought out (same "is there a next page yet" condition
  // updateArrows' own nextButton.hidden check uses), even before anything in
  // the new page itself has been bought yet. Fixed top-left corner, independent
  // of everything else on this screen
  const CITY_PAGE_INDICATOR_MARGIN_PX = 20;
  function drawCityPageIndicator(buildingCount: number): void {
    const totalPages = Math.floor(buildingCount / MARKER_COUNT) + 1;
    ctx.font = '900 22px "Fredoka", system-ui, sans-serif';
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    drawCartoonText(
      ctx,
      `${cityIndex + 1}/${totalPages}`,
      CITY_PAGE_INDICATOR_MARGIN_PX,
      CITY_PAGE_INDICATOR_MARGIN_PX,
      COLOR.white,
      COLOR.black,
      5,
    );
  }

  // the indicator dots' costs simulate whole purchase plans; recomputing them on
  // every frame of a celebration (when the redraw throttle lifts) was needless
  const INDICATOR_COST_TTL_MS = 250;
  const indicatorCosts = new Map<
    number,
    { at: number; unlockAllCost: BigNumber; upgradeAllCost: BigNumber | null }
  >();
  function getIndicatorCosts(globalIndex: number): {
    unlockAllCost: BigNumber;
    upgradeAllCost: BigNumber | null;
  } {
    const now = performance.now();
    const cached = indicatorCosts.get(globalIndex);
    if (cached && now - cached.at < INDICATOR_COST_TTL_MS) return cached;
    const unlockAllCost = deps.getBuildingUnlockAllCost(globalIndex);
    const entry = {
      at: now,
      unlockAllCost,
      upgradeAllCost: isZero(unlockAllCost)
        ? deps.getBuildingUpgradeAllCost(globalIndex)
        : null,
    };
    indicatorCosts.set(globalIndex, entry);
    return entry;
  }

  function redraw(): void {
    // re-measure every call instead of trusting whatever resize() last cached —
    // otherwise a redraw sandwiched between the canvas becoming visible and its
    // next resize() call draws against a stale size, stretching the map image
    // for one frame until the following resize() corrects it
    resize();
    if (cssW <= 0 || cssH <= 0) return;
    hasActiveMarkerJump = false; // recomputed below; drives the tick loop's cadence
    const dpr = getEffectiveDpr();
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    // buy-all-floors long-press below plays the same shared shake every other
    // big/free action in the game uses (see screenShake.ts) — applied once here
    // so it nudges everything drawn on this canvas, same pattern as
    // gameCanvas.ts's own redraw loop
    const shake = getScreenShakeOffset(Date.now());
    ctx.translate(shake.x, shake.y);
    // pre-scaled once per size/image change (see getScaledMapCanvas above) —
    // this is a cheap blit of an already-cover-fit bitmap, not a fresh resample
    // of the huge original source every frame
    const scaledMap = getScaledMapCanvas();
    if (scaledMap) {
      ctx.drawImage(scaledMap, 0, 0, cssW, cssH);
    }

    const activeIndex = deps.getActiveBuildingIndex();
    const pose =
      Math.floor(Date.now() / CAT_POSE_SWAP_MS) % 2 === 0
        ? CAT_STAND_FRAME
        : CAT_JUMP_FRAME;
    const buildingCount = deps.getBuildingCount();

    // building 0 (of the very first city only) is always unlocked; whichever
    // building is the currently-active one plays the stand/jump cycle, otherwise
    // it just faces the camera, standing still. every building from here up to
    // this city's own MARKER_COUNT-1 is grayed out with its own scaled unlock
    // price until bought, then behaves exactly like any other unlocked building
    for (let i = 0; i < MARKER_COUNT; i++) {
      const globalIndex = cityIndex * MARKER_COUNT + i;
      if (globalIndex < buildingCount) {
        const markerSprite = deps.isBuildingFullyManaged(globalIndex)
          ? managerSprite
          : catSprite;
        const jumpOffsetY = getMarkerJumpOffset(globalIndex, Date.now());
        if (jumpOffsetY !== 0) hasActiveMarkerJump = true;
        // the hop always wins the pose, same as a worker's click reaction always
        // overriding its own walk/idle frame for CLICK_BOUNCE_MS
        const frame =
          jumpOffsetY !== 0
            ? CAT_JUMP_FRAME
            : activeIndex === globalIndex
              ? pose
              : CAT_STAND_FRAME;
        drawCatMarker(
          ctx,
          cssW,
          cssH,
          markerSprite,
          i,
          frame,
          false,
          jumpOffsetY,
        );
        const { cx, feetY } = markerCenter(cssW, cssH, i);
        const critTier = deps.getBuildingCritTier(globalIndex);
        drawMarkerFloorCount(
          ctx,
          cx,
          feetY,
          deps.getBuildingFloorCount(globalIndex),
          MAX_FLOORS_PER_BUILDING,
          critTier ? CRIT_TIER_CONFIG[critTier].color : undefined,
        );
        const { unlockAllCost, upgradeAllCost } = getIndicatorCosts(globalIndex);
        if (
          !isZero(unlockAllCost) &&
          gte(deps.getTotalIncome(), unlockAllCost)
        ) {
          drawBuyAllFloorsIndicator(ctx, cssW, cssH, markerSprite, i);
        }
        if (
          upgradeAllCost !== null &&
          !isZero(upgradeAllCost) &&
          gte(deps.getTotalIncome(), upgradeAllCost)
        ) {
          drawBuyAllBuildingItemsIndicator(ctx, cssW, cssH, markerSprite, i);
        }
        continue;
      }
      drawCatMarker(ctx, cssW, cssH, catSprite, i, CAT_STAND_FRAME, true);
      const { cx, feetY } = markerCenter(cssW, cssH, i);
      const price = getBuildingPrice(globalIndex);
      const affordable = gte(deps.getTotalIncome(), price);
      drawLockedMarkerPrice(ctx, cx, feetY, price, affordable);
    }
    // before the coin bursts below, so the burst its own tap spawns reads as
    // coins flying out toward the player rather than behind it
    cloudCat.draw(ctx, cssW, cssH, Date.now());
    // performance.now(), NOT Date.now() — drawActiveCoinBursts's own
    // lastActiveUpdateAt gate is shared across every caller of this flat-canvas
    // burst API, and every OTHER caller feeds it a performance.now()-based
    // rAF timestamp. Mixing in a Date.now() epoch timestamp here made its dt
    // swing wildly (a huge clamped-to-max jump, then stuck at 0 for a long
    // stretch afterward) whenever this map's own redraw interleaved with
    // another caller's, instead of just reading a mismatched clock scale
    drawActiveCoinBursts(ctx, performance.now());

    incomeBottomY = incomeReadout.draw(ctx, cssW, deps.getTotalIncome());
    drawStreetText(
      incomeBottomY + STREET_TEXT_GAP_BELOW_INCOME,
      getCityName(cityIndex),
    );
    corpBarrel.draw(ctx, cssH);
    drawCityPageIndicator(buildingCount);

    updateArrows(buildingCount);
    drawCritFlash(ctx, cssW / 2, cssH / 2, cssW, Date.now());
    drawBadgeFloats(Date.now());
    ctx.restore();
  }

  // no previous city before the first one; the next city only opens up once every
  // building in this one has been bought
  function updateArrows(buildingCount: number): void {
    const rewardsVisible = critBadges.visible;
    prevButton.hidden = rewardsVisible || cityIndex === 0;
    nextButton.hidden =
      rewardsVisible || buildingCount < (cityIndex + 1) * MARKER_COUNT;
  }

  // the furthest page updateArrows would ever let the player walk to one tap at
  // a time — the same page count drawCityPageIndicator shows, zero-based
  function lastReachableCityIndex(): number {
    return Math.floor(deps.getBuildingCount() / MARKER_COUNT);
  }

  function canvasPoint(event: MouseEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function onPointerMove(event: PointerEvent): void {
    const p = canvasPoint(event);
    if (p.y < incomeBottomY) {
      canvas.style.cursor = "pointer";
      return;
    }
    const hit = hitTestAnyMarker(cssW, cssH, catSprite, p.x, p.y);
    canvas.style.cursor =
      hit !== null || cloudCat.hitTest(cssW, cssH, p.x, p.y)
        ? "pointer"
        : "default";
  }

  // same tiered shake/sfx language as floors/floorInteractions/critCelebration.ts's
  // triggerCritCelebration, adapted for this flat map canvas — no Floor to anchor a
  // floors/coins burst on, so this reuses coinBurst's own flat-canvas
  // spawnCoinBurstAt instead
  function triggerMapCatCritCelebration(
    result: CritRollResult,
    cx: number,
    feetY: number,
  ): void {
    const { tier, chain } = result;
    const burstY = feetY - MARKER_H / 2;
    const burstCount = tier === "ultra" ? 5 : tier === "mega" ? 3 : 2;
    for (let i = 0; i < burstCount; i++) {
      setTimeout(() => {
        spawnCoinBurstAt(cx, burstY, MARKER_COIN_BURST_SCALE * 1.5);
      }, i * 90);
    }
    // only ONE flash can ever show at once, so Mystic/heavenly/upgrade/grand opening
    // — the only 3 procs this whole-building event supports (see
    // setBuildingCritTier) — are mutually exclusive with each other and with
    // the plain tier flash below, in priority order (heavenly first: it's the
    // bigger moment if both happen to land together). A landed proc with no
    // entry here just falls through to the plain tier flash
    const playedSpecial = runFirstCritProc(
      result,
      undefined,
      {
        mystic: () => {
          triggerScreenShake({
            intensity: 2.2,
            label: MYSTIC_CRIT_LABEL,
            color: MYSTIC_CRIT_COLOR,
            strokeWidth: 15,
            blinkHz: 6,
            holdMs: 900,
            priority: 2,
          });
          playPayout();
        },
        // heavenly crit: the single biggest reward, so it always gets the
        // same "ultra-strength" flash floorInteractions/critCelebration.ts's
        // own celebrateHeavenly uses
        heavenly: () => {
          triggerScreenShake({
            intensity: 2.6,
            label: HEAVENLY_CRIT_LABEL,
            color: HEAVENLY_CRIT_COLOR,
            strokeWidth: 16,
            blinkHz: 6,
            holdMs: 1250,
            priority: 2,
          });
          playPayout();
        },
        // upgrade crit: a flat, non-tier-scaled flash (same shape as
        // floorInteractions/critCelebration.ts's own playSpecialFlash) —
        // the reward itself (promoting every floor's tier one step) is
        // applied by main.ts's setBuildingCritTier
        upgrade: () => {
          triggerScreenShake({
            intensity: 1.8,
            label: UPGRADE_CRIT_LABEL,
            color: UPGRADE_CRIT_COLOR,
            strokeWidth: 14,
            priority: 1,
          });
          playExplosion();
        },
        grandOpening: () => {
          triggerScreenShake({
            intensity: 1.8,
            label: GRAND_OPENING_CRIT_LABEL,
            color: GRAND_OPENING_CRIT_COLOR,
            strokeWidth: 14,
            priority: 1,
          });
          playSold();
        },
      },
      ["mystic", "heavenly", "grandOpening", "upgrade"],
    );
    if (playedSpecial) return;
    // chain crit: the flash shows "Chain" instead of the tier's usual "x5"/
    // "x25"/"x125" number, same swap floorInteractions.ts's own
    // triggerCritCelebration does for the other 2 crit events
    const label = (tierLabel: string) => (chain ? "Chain" : tierLabel);
    if (tier === "ultra") {
      triggerScreenShake({
        intensity: 2.6,
        label: label(CRIT_TIER_CONFIG.ultra.label),
        color: COLOR.red,
        strokeWidth: 16,
        blinkHz: 6,
        holdMs: 1250,
        priority: 2,
      });
      playPayout();
    } else if (tier === "mega") {
      triggerScreenShake({
        intensity: 1.8,
        label: label(CRIT_TIER_CONFIG.mega.label),
        color: COLOR.amber,
        priority: 1,
      });
      playJackpot();
    } else {
      triggerScreenShake({ label: label(CRIT_TIER_CONFIG.crit.label) });
      playCoinDrop();
      playExplosion();
    }
  }

  // clicking the next locked building (buildings unlock strictly in order) buys it
  // (staying on the map so its color/price change is visible); clicking a further,
  // not-yet-reachable locked marker does nothing; an unlocked one switches to it
  // and leaves the map entirely
  function onClick(event: MouseEvent): void {
    // a long-press just fired below (suppressNextClick): eat only the very
    // next click, regardless of how long it takes to arrive — the browser
    // doesn't reliably send a click right after a long, held-down press (it
    // can land well after the timer fired, or occasionally never at all), so
    // a fixed time window after the timer risked expiring before the real
    // click showed up. Tying this to the gesture instead (reset on every
    // fresh pointerdown, see below) can't leak into the player's own NEXT
    // deliberate click either, since that click's own pointerdown already
    // clears the flag before it fires
    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }
    if (critBadges.visible) {
      critBadges.advance();
      return;
    }
    const p = canvasPoint(event);
    if (p.y < incomeBottomY) {
      deps.onOpenCorporationStats();
      return;
    }
    if (cloudCat.hitTest(cssW, cssH, p.x, p.y)) {
      toggleAutoBuyer();
      redraw();
      return;
    }
    const hit = hitTestAnyMarker(cssW, cssH, catSprite, p.x, p.y);
    if (hit === null) return;
    const globalIndex = cityIndex * MARKER_COUNT + hit;
    const buildingCount = deps.getBuildingCount();
    if (globalIndex === buildingCount) {
      if (deps.buyBuilding()) {
        indicatorCosts.clear();
        showPurchaseFeedback(globalIndex, hit);
        deps.onStateChanged();
        const { cx, feetY } = markerCenter(cssW, cssH, hit);
        // rare bonus, same one-shot roll a floor-unlock purchase uses — a hit
        // sets every floor this brand new building already has to that tier
        // (still just the one free ground floor + the one locked floor
        // already queued above it — nothing gets unlocked for free, except
        // whatever a chain crit additionally climbs into above that)
        const buyTier = rollFloorBuyCrit();
        if (buyTier) {
          deps.setBuildingCritTier(globalIndex, buyTier);
          triggerMapCatCritCelebration(buyTier, cx, feetY);
        }
      }
      redraw();
      return;
    }
    // a marker further out than the next unlock isn't reachable yet — ignore it
    if (globalIndex > buildingCount) return;
    deps.onSelectBuilding(globalIndex);
  }

  function onPointerLeave(): void {
    canvas.style.cursor = "default";
  }

  // long-press-anywhere-on-an-eligible-marker gesture: holding it for
  // BUY_ALL_HOLD_MS completes the purple building progression action first,
  // unlocks every remaining floor for the green action, or falls back to buying
  // the currently-cheapest upgrades once the first two dots are processed. The
  // dots are visual affordability cues only, not the hit target, since their
  // small radius made the gesture nearly impossible to land in practice.
  // Suppresses a click landing shortly after (see onClick above)
  const BUY_ALL_HOLD_MS = 1000;
  let buyAllHoldTimeout: ReturnType<typeof setTimeout> | null = null;
  let suppressNextClick = false;

  function clearBuyAllHold(): void {
    if (buyAllHoldTimeout !== null) {
      clearTimeout(buyAllHoldTimeout);
      buyAllHoldTimeout = null;
    }
  }

  function onPointerDown(event: PointerEvent): void {
    clearBuyAllHold(); // safety net against a stale interrupted previous gesture
    suppressNextClick = false; // this is a brand new gesture, not the one that fired
    if (critBadges.visible) return;
    const p = canvasPoint(event);
    const hit = hitTestAnyMarker(cssW, cssH, catSprite, p.x, p.y);
    if (hit === null) return;
    const globalIndex = cityIndex * MARKER_COUNT + hit;
    if (globalIndex >= deps.getBuildingCount()) return;
    const companyIndex = corpBarrel.companyIndexAtPosition(
      corpBarrel.getSelectedPosition(),
    );
    const startedCityIndex = cityIndex;
    buyAllHoldTimeout = setTimeout(async () => {
      buyAllHoldTimeout = null;
      if (
        cityIndex !== startedCityIndex ||
        corpBarrel.companyIndexAtPosition(corpBarrel.getSelectedPosition()) !==
          companyIndex
      )
        return;
      suppressNextClick = true;
      try {
        if (!deps.canRenovateBuilding(globalIndex)) return;
        showPurchaseFeedback(globalIndex, hit);
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        if (
          cityIndex !== startedCityIndex ||
          corpBarrel.companyIndexAtPosition(
            corpBarrel.getSelectedPosition(),
          ) !== companyIndex
        )
          return;
        const floorUnlockCost = deps.getBuildingUnlockAllCost(globalIndex);
        let action: "floors" | "building" | "upgrades";
        if (!isZero(floorUnlockCost)) {
          if (!gte(deps.getTotalIncome(), floorUnlockCost)) return;
          action = "floors";
        } else {
          const upgradeAllCost = deps.getBuildingUpgradeAllCost(globalIndex);
          action =
            !isZero(upgradeAllCost) &&
            gte(deps.getTotalIncome(), upgradeAllCost)
              ? "building"
              : "upgrades";
        }
        const bought = await (action === "building"
          ? deps.buyAllFloorUpgrades(globalIndex)
          : action === "floors"
            ? deps.buyAllFloors(globalIndex)
            : deps.buyCheapestFloorUpgrades(globalIndex));
        if (
          bought &&
          corpBarrel.companyIndexAtPosition(
            corpBarrel.getSelectedPosition(),
          ) === companyIndex
        ) {
          deps.onStateChanged();
        }
        indicatorCosts.clear();
        redraw();
      } catch (error) {
        console.error("Map renovation failed", error);
      }
    }, BUY_ALL_HOLD_MS);
  }

  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("click", onClick);
  window.addEventListener("pointerup", clearBuyAllHold);
  window.addEventListener("pointercancel", clearBuyAllHold);

  // both arrows are only ever visible when navigating to their side is actually
  // allowed (see updateArrows in redraw), so a tap here never needs to re-check.
  // Holding one skips straight to the first/last reachable city page
  const clearPrevHold = onTapOrHold(
    prevButton,
    () => transitions.navigateCity(-1),
    () => transitions.navigateCityToEnd(-1),
  );
  const clearNextHold = onTapOrHold(
    nextButton,
    () => transitions.navigateCity(1),
    () => transitions.navigateCityToEnd(1),
  );

  // tracked from the observer rather than measured per tick: while the building
  // view is up, the hidden map's loop used to force a layout read every frame
  // (every frame of a celebration, since a crit flash lifts its throttle)
  let canvasVisible = false;
  const resizeObserver = new ResizeObserver((entries) => {
    const box = entries[entries.length - 1].contentRect;
    canvasVisible = box.width > 0 && box.height > 0;
    redraw();
  });
  resizeObserver.observe(canvas);

  // keeps the current-building marker's stand/jump cycle animating even though
  // nothing else on this static map ever changes; idles while the view is hidden
  // (see canvasVisible above). Capped at 30 FPS
  // because each redraw repaints the whole canvas, and running that every
  // animation frame is what made opening the map freeze the whole page. The
  // corner mascot's idle float and the affordable-price wiggle both need that
  // floor to glide instead of step. A marker's unlock hop, a coin burst, a crit
  // flash or the mascot's own cheer each need real frame-rate smoothness, so the
  // throttle is skipped entirely for as long as one is showing.
  const REDRAW_INTERVAL_MS = 33;
  let animationFrameId: number | null = null;
  let lastTickRedraw = 0;
  function tick(): void {
    animationFrameId = requestAnimationFrame(tick);
    if (!canvasVisible) return;
    const now = performance.now();
    const interval =
      hasActiveMarkerJump ||
      hasActiveCoinBursts() ||
      badgeFloats.length > 0 ||
      boughtFloats.length > 0 ||
      cloudCat.isAnimating(Date.now()) ||
      isCritFlashActive(Date.now())
        ? 0
        : REDRAW_INTERVAL_MS;
    if (now - lastTickRedraw >= interval) {
      lastTickRedraw = now;
      redraw();
    }
  }
  animationFrameId = requestAnimationFrame(tick);

  function destroy(): void {
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerleave", onPointerLeave);
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("click", onClick);
    window.removeEventListener("pointerup", clearBuyAllHold);
    window.removeEventListener("pointercancel", clearBuyAllHold);
    clearBuyAllHold();
    clearPrevHold();
    clearNextHold();
    if (autoBuyTimer !== null) clearInterval(autoBuyTimer);
    resizeObserver.disconnect();
    if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
    transitions.destroy();
    corpBarrel.destroy();
  }

  return {
    refresh: () => {
      indicatorCosts.clear();
      cityIndex = Math.floor(deps.getActiveBuildingIndex() / MARKER_COUNT);
      persistCityMapState();
      redraw();
    },
    flashVerticalRays: (direction) => transitions.flashVertical(direction),
    jumpToEnd: (direction) => transitions.jumpToEnd(direction),
    animateSwitchToCompany: (companyIndex) =>
      transitions.animateSwitchToCompany(companyIndex),
    showCritBadges,
    stopAutoBuyer,
    destroy,
  };
}
