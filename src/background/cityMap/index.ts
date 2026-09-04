import { drawCartoonText } from "../../utils";
import { COLOR } from "../../palette";
import {
  playSold,
  playCoinDrop,
  playExplosion,
  playJackpot,
  playPayout,
} from "../../sound";
import { getBuildingPrice } from "../../buildings";
import { getCityName } from "../../cityName";
import { setActiveCompanyIndex } from "../../company";
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
  triggerMarkerJump,
  getMarkerJumpOffset,
  MARKER_COIN_BURST_SCALE,
  drawBuyAllFloorsIndicator,
} from "./markers";
import {
  MAX_FLOORS_PER_BUILDING,
  rollFloorBuyCrit,
  CRIT_TIER_CONFIG,
  type CritTier,
} from "../../floors";
import { loadCityMapState, saveCityMapState } from "./cityMapState";
import { createIncomeReadout } from "./incomeReadout";
import { createCorpBarrel } from "./corpBarrel";
import { createCityTransitions } from "./transitions";
import { loadSprite, loadImageByName } from "../../loadAssets";
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

let mapImage: HTMLImageElement | null = null;
let catSprite: HTMLImageElement | null = null;

// loads the map screen's own backdrop + marker cat sprite
export async function loadCityMapImage(): Promise<HTMLImageElement> {
  [mapImage, catSprite] = await Promise.all([
    loadImageByName("cityMapBackground"),
    loadSprite("worker"),
  ]);
  return mapImage!;
}

export interface CityMapDeps {
  getTotalIncome: () => BigNumber;
  getBuildingCount: () => number; // buildings unlocked so far; building 1 exists once this is >= 2
  getActiveBuildingIndex: () => number; // whichever building's floors are on screen right now
  getBuildingFloorCount: (buildingIndex: number) => number; // for the "X/20" marker readout
  // the crit tier EVERY floor of this building currently shares (see
  // setBuildingCritTier below), or null if they don't all match — colors the
  // "X/20" marker readout so a crit-maxed building stands out on the map
  getBuildingCritTier: (buildingIndex: number) => CritTier | null;
  // $ to unlock EVERY remaining locked floor in a building at once — ZERO once
  // there's nothing left to buy (already maxed). Drives the green buy-all-floors
  // dot (see markers.ts's drawBuyAllFloorsIndicator) and its long-press gesture
  getBuildingUnlockAllCost: (buildingIndex: number) => BigNumber;
  buyBuilding: () => boolean; // unlocks building 1 if affordable
  // long-press-on-the-green-dot gesture below: unlocks every remaining floor of
  // an already-bought building in one shot. Returns whether it succeeded
  buyAllFloors: (buildingIndex: number) => boolean;
  // sets EVERY floor this building currently has (locked or not) to the given
  // crit tier (purple/gold/red), permanently \u2014 the reward for a crit landing
  // on that building's own purchase (see rollFloorBuyCrit below). Does NOT
  // unlock anything itself; a locked floor still has to be bought normally,
  // it'll just already be that tier once it is (any brand new floor added
  // after this also inherits it, see floorLock.ts's ensureLockedFloorAbove)
  setBuildingCritTier: (buildingIndex: number, tier: CritTier) => void;
  onSelectBuilding: (index: number) => void; // switch to that building and leave the map view
  // fires once the corporation barrel roll settles on a different company (see
  // rollCorporationSelection) so main.ts can swap in that company's own separate
  // buildings/totalIncome/active building — see company.ts
  onSwitchCompany: (companyIndex: number) => void;
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
  flashVerticalRays: (direction: -1 | 1) => void;
  // same blur/speed-line/roll flourish as a normal barrel-roll switch, but
  // jumping straight to a given company index in one motion — for a switch
  // triggered OUTSIDE the barrel-roll gesture itself (see main.ts's
  // corporationUpgradeMenu wiring, right after a newly-bought company becomes active)
  animateSwitchToCompany: (companyIndex: number) => void;
  destroy: () => void;
}

// up-arrow icon; rotated per direction via CSS (.city-map__arrow--prev/--next in
// style.css) rather than baking rotation into the markup itself. Drawn twice — a
// fat black pass behind, a fatter currentColor pass in front — for a bordered look,
// since these are open stroked lines rather than a fillable shape
const ARROW_SVG = `
  <svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <g stroke="black" stroke-width="9">
      <path d="M12 19V5"></path>
      <path d="M5 12l7-7 7 7"></path>
    </g>
    <g stroke="currentColor" stroke-width="5">
      <path d="M12 19V5"></path>
      <path d="M5 12l7-7 7 7"></path>
    </g>
  </svg>
`;

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
  const transitions = createCityTransitions({
    canvas,
    speedLinesSvg,
    getCssSize: () => ({ cssW, cssH }),
    rollOneStep: (direction) => corpBarrel.rollOneStep(direction),
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

  // set by redraw() whenever the currently-viewed city page has at least one
  // affordable-but-locked marker (see the price-wiggle transform below) — read
  // by the tick loop further down to temporarily run at full frame rate instead
  // of its usual throttled cadence, only while a wiggle actually needs it
  let hasWigglingMarker = false;
  // same idea, for a marker's one-shot unlock hop (see getMarkerJumpOffset)
  let hasActiveMarkerJump = false;

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    cssW = rect.width;
    cssH = rect.height;
    const dpr = window.devicePixelRatio || 1;
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

  function redraw(): void {
    // re-measure every call instead of trusting whatever resize() last cached —
    // otherwise a redraw sandwiched between the canvas becoming visible and its
    // next resize() call draws against a stale size, stretching the map image
    // for one frame until the following resize() corrects it
    resize();
    if (cssW <= 0 || cssH <= 0) return;
    hasWigglingMarker = false; // recomputed below; drives the tick loop's own cadence
    hasActiveMarkerJump = false; // same, for the unlock-hop animation below
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    // buy-all-floors long-press below plays the same shared shake every other
    // big/free action in the game uses (see screenShake.ts) — applied once here
    // so it nudges everything drawn on this canvas, same pattern as
    // gameCanvas.ts/pressConferenceGame.ts's own redraw loops
    const shake = getScreenShakeOffset(Date.now());
    ctx.translate(shake.x, shake.y);
    if (mapImage) {
      // "cover" fit: scale up to whichever axis needs it more, so the image
      // always fills the whole canvas (cropping whatever overflows on the other
      // axis, clipped automatically by the canvas's own bounds) instead of
      // leaving empty space around it
      const fitScale = Math.max(
        cssW / mapImage.naturalWidth,
        cssH / mapImage.naturalHeight,
      );
      const drawW = mapImage.naturalWidth * fitScale;
      const drawH = mapImage.naturalHeight * fitScale;
      ctx.drawImage(
        mapImage,
        (cssW - drawW) / 2,
        (cssH - drawH) / 2,
        drawW,
        drawH,
      );
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
        drawCatMarker(ctx, cssW, cssH, catSprite, i, frame, false, jumpOffsetY);
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
        const unlockAllCost = deps.getBuildingUnlockAllCost(globalIndex);
        if (
          !isZero(unlockAllCost) &&
          gte(deps.getTotalIncome(), unlockAllCost)
        ) {
          drawBuyAllFloorsIndicator(ctx, cssW, cssH, catSprite, i);
        }
        continue;
      }
      drawCatMarker(ctx, cssW, cssH, catSprite, i, CAT_STAND_FRAME, true);
      const { cx, feetY } = markerCenter(cssW, cssH, i);
      const price = getBuildingPrice(globalIndex);
      const affordable = gte(deps.getTotalIncome(), price);
      if (affordable) hasWigglingMarker = true;
      drawLockedMarkerPrice(ctx, cx, feetY, price, affordable);
    }
    drawActiveCoinBursts(ctx, Date.now());

    const incomeBottom = incomeReadout.draw(ctx, cssW, deps.getTotalIncome());
    drawStreetText(
      incomeBottom + STREET_TEXT_GAP_BELOW_INCOME,
      getCityName(cityIndex),
    );
    corpBarrel.draw(ctx, cssH);
    drawCityPageIndicator(buildingCount);

    updateArrows(buildingCount);
    // same crit flash triggerMapCatCritCelebration fires — gameCanvas.ts draws its
    // own copy on the building canvas, but this map canvas is a totally separate
    // <canvas> that never drew it at all, so the "x5"/"x25"/"x125" text (and
    // "MAXED!") never appeared here. Still inside the shake's own translate above,
    // same as gameCanvas.ts, so it rattles along with everything else
    drawCritFlash(ctx, cssW / 2, cssH / 2, cssW, Date.now());
    ctx.restore();
  }

  // no previous city before the first one; the next city only opens up once every
  // building in this one has been bought
  function updateArrows(buildingCount: number): void {
    prevButton.hidden = cityIndex === 0;
    nextButton.hidden = buildingCount < (cityIndex + 1) * MARKER_COUNT;
  }

  function canvasPoint(event: MouseEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function onPointerMove(event: PointerEvent): void {
    const p = canvasPoint(event);
    const hit = hitTestAnyMarker(cssW, cssH, catSprite, p.x, p.y);
    canvas.style.cursor = hit !== null ? "pointer" : "default";
  }

  // same tiered shake/sfx language as floors/floorInteractions/critCelebration.ts's
  // triggerCritCelebration, adapted for this flat map canvas — no Floor to anchor a
  // floors/coins burst on, so this reuses coinBurst's own flat-canvas
  // spawnCoinBurstAt instead (same as pressConferenceGame does)
  function triggerMapCatCritCelebration(
    tier: CritTier,
    cx: number,
    feetY: number,
  ): void {
    const burstY = feetY - MARKER_H / 2;
    const burstCount = tier === "ultra" ? 5 : tier === "mega" ? 3 : 2;
    for (let i = 0; i < burstCount; i++) {
      setTimeout(() => {
        spawnCoinBurstAt(cx, burstY, MARKER_COIN_BURST_SCALE * 1.5);
      }, i * 90);
    }
    if (tier === "ultra") {
      triggerScreenShake({
        intensity: 2.6,
        label: CRIT_TIER_CONFIG.ultra.label,
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
        label: CRIT_TIER_CONFIG.mega.label,
        color: COLOR.amber,
        priority: 1,
      });
      playJackpot();
    } else {
      triggerScreenShake({ label: CRIT_TIER_CONFIG.crit.label });
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
    const p = canvasPoint(event);
    const hit = hitTestAnyMarker(cssW, cssH, catSprite, p.x, p.y);
    if (hit === null) return;
    const globalIndex = cityIndex * MARKER_COUNT + hit;
    const buildingCount = deps.getBuildingCount();
    if (globalIndex === buildingCount) {
      if (deps.buyBuilding()) {
        playSold();
        triggerMarkerJump(globalIndex);
        const { cx, feetY } = markerCenter(cssW, cssH, hit);
        spawnCoinBurstAt(cx, feetY - MARKER_H / 2, MARKER_COIN_BURST_SCALE);
        // rare bonus, same one-shot roll a floor-unlock purchase uses — a hit
        // sets every floor this brand new building already has to that tier
        // (still just the one free ground floor + the one locked floor
        // already queued above it — nothing gets unlocked for free)
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
  // BUY_ALL_HOLD_MS shakes the screen and unlocks every remaining floor of
  // that building at once (see markers.ts's drawBuyAllFloorsIndicator — the
  // green dot is a visual affordability cue only, not the hit target, since
  // its own small radius made the gesture nearly impossible to land in
  // practice). Suppresses a click landing shortly after (see onClick above)
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
    const p = canvasPoint(event);
    const hit = hitTestAnyMarker(cssW, cssH, catSprite, p.x, p.y);
    if (hit === null) return;
    const globalIndex = cityIndex * MARKER_COUNT + hit;
    if (globalIndex >= deps.getBuildingCount()) return;
    const cost = deps.getBuildingUnlockAllCost(globalIndex);
    if (isZero(cost) || !gte(deps.getTotalIncome(), cost)) return;
    buyAllHoldTimeout = setTimeout(() => {
      buyAllHoldTimeout = null;
      if (deps.buyAllFloors(globalIndex)) {
        playSold();
        suppressNextClick = true;
        // same unlock flourish a normal single-floor buy plays — a maxed-out
        // building deserves it even more than any one of them individually
        triggerMarkerJump(globalIndex);
        const { cx, feetY } = markerCenter(cssW, cssH, hit);
        spawnCoinBurstAt(cx, feetY - MARKER_H / 2, MARKER_COIN_BURST_SCALE);
      }
      redraw();
    }, BUY_ALL_HOLD_MS);
  }

  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("click", onClick);
  window.addEventListener("pointerup", clearBuyAllHold);
  window.addEventListener("pointercancel", clearBuyAllHold);

  // both arrows are only ever visible when navigating to their side is actually
  // allowed (see updateArrows in redraw), so a click here never needs to re-check
  function onPrevClick(): void {
    transitions.navigateCity(-1);
  }
  function onNextClick(): void {
    transitions.navigateCity(1);
  }
  prevButton.addEventListener("click", onPrevClick);
  nextButton.addEventListener("click", onNextClick);

  const resizeObserver = new ResizeObserver(() => redraw());
  resizeObserver.observe(canvas);

  // keeps the current-building marker's stand/jump cycle animating even though
  // nothing else on this static map ever changes; cheap to leave running while the
  // view is hidden too (redraw() no-ops on the then-0x0 canvas). Only actually
  // redraws a few times a second — this view has nothing that needs a full 60fps
  // cadence (the pose swap alone is on a 550ms cycle), and each redraw's canvas
  // repaint was expensive enough that running it every animation frame is what
  // made opening the map freeze the whole page. The one exception: while an
  // affordable-but-locked price is actively wiggling (see hasWigglingMarker,
  // set by the previous redraw), or a marker's unlock hop/coin burst is
  // playing, that specific animation needs real frame-rate smoothness, so the
  // throttle is skipped entirely for as long as either is showing
  const TICK_REDRAW_INTERVAL_MS = 100;
  let animationFrameId: number | null = null;
  let lastTickRedraw = 0;
  function tick(): void {
    const now = performance.now();
    const interval =
      hasWigglingMarker ||
      hasActiveMarkerJump ||
      hasActiveCoinBursts() ||
      isCritFlashActive(Date.now())
        ? 0
        : TICK_REDRAW_INTERVAL_MS;
    if (now - lastTickRedraw >= interval) {
      lastTickRedraw = now;
      redraw();
    }
    animationFrameId = requestAnimationFrame(tick);
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
    prevButton.removeEventListener("click", onPrevClick);
    nextButton.removeEventListener("click", onNextClick);
    resizeObserver.disconnect();
    if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
    transitions.destroy();
    corpBarrel.destroy();
  }

  return {
    refresh: () => {
      cityIndex = Math.floor(deps.getActiveBuildingIndex() / MARKER_COUNT);
      persistCityMapState();
      redraw();
    },
    flashVerticalRays: (direction) => transitions.flashVertical(direction),
    animateSwitchToCompany: (companyIndex) =>
      transitions.animateSwitchToCompany(companyIndex),
    destroy,
  };
}
