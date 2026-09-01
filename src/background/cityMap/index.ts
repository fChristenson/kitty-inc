import {
  loadImage,
  drawCartoonText,
  formatTotalIncomeParts,
  formatPrice,
  getAnimatedTotalIncome,
} from "../../utils";
import { COLOR } from "../../palette";
import { playSold, playSwoosh } from "../../sound";
import { getBuildingPrice } from "../../buildings";
import { getCityName } from "../../cityName";
import { getCorporationName, getCorporationCount } from "../../corporationName";
import { getActiveCompanyIndex, setActiveCompanyIndex, companyStorageKey } from "../../company";
import {
  spawnCoinBurstAt,
  drawActiveCoinBursts,
  hasActiveCoinBursts,
} from "../../coinBurst";
import cityMapUrl from "../../assets/city2Bg.png";
import catSpriteUrl from "../../assets/sprites/kitty1Walk.png";

// a static overview map (see docs/prompts.md's "City map tile" prompt), drawn
// zoomed out to fill the view, with a cat marker per building standing in for the
// eventual "pick a building to unlock" map screen: whichever building is currently
// active plays the stand/jump cycle, any other unlocked building just stands, and
// the next building to unlock shows grayed out with its price until bought

// reuses floors/worker's own sprite sheet (scripts/process-cat-sprites.mjs) rather
// than the recolor/walk-cycle machinery in floors/worker/index.ts — markers here
// are static poses, not walking figures, so that machinery would be unused weight
const CAT_FRAME_COUNT = 5;
const CAT_STAND_FRAME = 0;
const CAT_JUMP_FRAME = 4; // the sheet's "arms-up happy pose", reused as a little hop
const CAT_POSE_SWAP_MS = 550; // how long each pose in the stand/jump cycle holds
const MARKER_H = 75; // 25% smaller than the original 100
// one-shot hop played the instant a building's marker actually unlocks — same
// shape (sin(t*pi)) and CAT_JUMP_FRAME/CLICK_FRAME swap as floors/worker's own
// click-reaction bounce, but slower/lower (worker's 300ms/14px reads as too
// fast/too high at this marker's much smaller MARKER_H=75 scale) — keyed by
// globalIndex so it survives a city-page round trip; getMarkerJumpOffset
// self-prunes expired entries so this map never grows past however many unlocks
// are mid-animation
const MARKER_JUMP_DURATION_MS = 500;
const MARKER_JUMP_HEIGHT_PX = 8;
// spawnCoinBurstAt's default scale (1) is tuned for a full building-width
// canvas; these markers are tiny by comparison, so shrink it the same way
// pressConferenceGame's own COIN_BURST_SCALE does for its smaller canvas
const MARKER_COIN_BURST_SCALE = 0.3;
const markerJumpStartedAt = new Map<number, number>();
function getMarkerJumpOffset(globalIndex: number, now: number): number {
  const startedAt = markerJumpStartedAt.get(globalIndex);
  if (startedAt === undefined) return 0;
  const elapsed = now - startedAt;
  if (elapsed >= MARKER_JUMP_DURATION_MS) {
    markerJumpStartedAt.delete(globalIndex);
    return 0;
  }
  const t = elapsed / MARKER_JUMP_DURATION_MS;
  return -MARKER_JUMP_HEIGHT_PX * Math.sin(Math.PI * t);
}
const MARKER_HIT_PADDING = 16; // generous click/hover target beyond the sprite's own bounds
// same bounce+squash the prev/next arrows play via CSS (city-map-arrow-bounce-move/
// -warp, style.css) — 0.9s period, 10px amplitude — replicated here since the
// price is drawn on canvas, not a DOM element a CSS animation could target
const PRICE_WIGGLE_PERIOD_MS = 900;
const PRICE_WIGGLE_AMPLITUDE_PX = 10;
// smoothstep, the closest plain-math equivalent to CSS's ease-in-out timing
function easeInOut(t: number): number {
  return t * t * (3 - 2 * t);
}
// city-map-arrow-bounce-warp's own keyframe stops (time fraction, scaleX, scaleY);
// interpolated (with the same ease-in-out) between whichever pair of stops the
// current phase falls between
const PRICE_WIGGLE_WARP_STOPS: [number, number, number][] = [
  [0, 1, 1],
  [0.3, 0.88, 1.16],
  [0.5, 1.14, 0.86],
  [0.7, 0.88, 1.16],
  [1, 1, 1],
];
// the exact same translate+scale the arrows' two CSS animations produce at a
// given point (0..1) in their shared 0.9s cycle
function getPriceWiggleTransform(phase: number): {
  translateY: number;
  scaleX: number;
  scaleY: number;
} {
  const translateY =
    phase < 0.5
      ? -PRICE_WIGGLE_AMPLITUDE_PX * easeInOut(phase / 0.5)
      : -PRICE_WIGGLE_AMPLITUDE_PX * easeInOut(1 - (phase - 0.5) / 0.5);
  let scaleX = 1;
  let scaleY = 1;
  for (let i = 0; i < PRICE_WIGGLE_WARP_STOPS.length - 1; i++) {
    const [t0, x0, y0] = PRICE_WIGGLE_WARP_STOPS[i];
    const [t1, x1, y1] = PRICE_WIGGLE_WARP_STOPS[i + 1];
    if (phase >= t0 && phase <= t1) {
      const eased = easeInOut((phase - t0) / (t1 - t0));
      scaleX = x0 + (x1 - x0) * eased;
      scaleY = y0 + (y1 - y0) * eased;
      break;
    }
  }
  return { translateY, scaleX, scaleY };
}
// kitty1Walk.png's own frames are mostly empty transparent padding above the cat
// itself (measured via pixel-scanning the sheet: real content starts ~46% down
// each frame, not at the frame's own top edge) — anything positioned relative to
// "the cat's head" needs this, or it ends up floating far above the actual
// visible art with barely any visual change from a small px tweak
const CAT_CONTENT_TOP_FRACTION = 0.462;
// 5 buildings per city/map "page": within a city, building 0 unlocks first, then
// 1-4 in order, each priced via buildings.ts's getBuildingPrice (scales
// BUILDING_COST_MULTIPLIER per step, same as each building's own economy). Only
// the very first building of the very first city is free — every other city's own
// building 0 is bought the same as any other (see cityIndex/globalIndex below),
// which naturally costs BUILDING_COST_MULTIPLIER(1000)x the previous city's last
// (5-star) building, since building indices count up continuously across cities
const MARKER_COUNT = 5;
// fixed screen fractions (of the canvas's own CSS size) for each building's marker —
// this is a flat, non-scrolling static map, so these never move/recompute per building
// zigzags up the map as tier/star count increases, so higher-tier buildings read
// as literally "higher up": bottom-left, far right, middle-left, far left, far right.
// centerShiftPx pulls a marker that many pixels toward the horizontal center
const MARKER_POSITIONS: {
  cxFrac: number;
  feetYFrac: number;
  cxFixed?: number;
  centerShiftPx?: number;
  cxNudgePx?: number; // extra fine-tune offset, positive = right
  feetYNudgePx?: number; // extra fine-tune offset, positive = down
}[] = [
  { cxFrac: 0, feetYFrac: 1, cxFixed: 70, feetYNudgePx: -80 }, // building 0 (1 star): fixed bottom-right dock (see markerCenter's own override below)
  { cxFrac: 0.88, feetYFrac: 0.78, centerShiftPx: 260 }, // building 1 (2 stars): far right
  {
    cxFrac: 0.28,
    feetYFrac: 0.58,
    centerShiftPx: 100,
    cxNudgePx: 60,
    feetYNudgePx: -10,
  }, // building 2 (3 stars): middle left
  { cxFrac: 0.06, feetYFrac: 0.36, centerShiftPx: 140, feetYNudgePx: 40 }, // building 3 (4 stars): far left
  {
    cxFrac: 0.88,
    feetYFrac: 0.16,
    centerShiftPx: 100,
    cxNudgePx: 80,
    feetYNudgePx: 100,
  }, // building 4 (5 stars): far right
];

// gap between the total-income readout and each city's own name, drawn flat right
// below it (see drawStreetText) — the name itself comes from cityName.ts's
// getCityName, keyed by which city (5-building page) is currently being viewed
const STREET_TEXT_GAP_BELOW_INCOME = 12;

// the corp-name barrel (drawCorporationNames) lists companies alphabetically,
// Z-to-A, by name rather than by creation order — this maps a barrel POSITION
// (0..count-1, what corpRollFocus/selectedPosition below track) to the actual
// company index everything else (setActiveCompanyIndex, onSwitchCompany,
// loadCityMapState) is keyed by. Recomputed on demand rather than cached:
// cheap (a handful of companies at most) and always correct even right after a
// new one is created
function getSortedCorporationIndices(): number[] {
  const count = getCorporationCount();
  return Array.from({ length: count }, (_, i) => i).sort((a, b) =>
    getCorporationName(b).localeCompare(getCorporationName(a)),
  );
}

let mapImage: HTMLImageElement | null = null;
let catSprite: HTMLImageElement | null = null;

export async function loadCityMapImage(): Promise<HTMLImageElement> {
  [mapImage, catSprite] = await Promise.all([
    loadImage(cityMapUrl),
    loadImage(catSpriteUrl),
  ]);
  return mapImage;
}

export interface CityMapDeps {
  getTotalIncome: () => number;
  getBuildingCount: () => number; // buildings unlocked so far; building 1 exists once this is >= 2
  getActiveBuildingIndex: () => number; // whichever building's floors are on screen right now
  buyBuilding: () => boolean; // unlocks building 1 if affordable
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
  // companySelectMenu wiring, right after a newly-bought company becomes active)
  animateSwitchToCompany: (companyIndex: number) => void;
  destroy: () => void;
}

interface MarkerBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
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

// how many speed-line rays the transition draws; their actual shape (position/
// length) is computed fresh each time in playSpeedLines below, since it depends
// on the canvas's current on-screen size
const SPEED_LINE_COUNT = 12;
const SPEED_LINE_MS = 180;

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
// namespaced per company (see company.ts's companyStorageKey) since each company
// has its own separate set of cities/buildings
const CITY_MAP_STATE_KEY = "cash-clicker:city-map-state";

interface PersistedCityMapState {
  cityIndex: number;
}

function loadCityMapState(companyIndex: number): PersistedCityMapState {
  try {
    const raw = localStorage.getItem(
      companyStorageKey(CITY_MAP_STATE_KEY, companyIndex),
    );
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      cityIndex: Number.isFinite(parsed?.cityIndex) ? parsed.cityIndex : 0,
    };
  } catch {
    return { cityIndex: 0 };
  }
}

function saveCityMapState(
  companyIndex: number,
  state: PersistedCityMapState,
): void {
  try {
    localStorage.setItem(
      companyStorageKey(CITY_MAP_STATE_KEY, companyIndex),
      JSON.stringify(state),
    );
  } catch {
    // storage unavailable: nothing to persist
  }
}

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
  // which BARREL POSITION (0..count-1, alphabetical by name — see
  // getSortedCorporationIndices) is currently selected; the actual company index
  // (see company.ts) is derived via companyIndexAtPosition wherever persistence/
  // switching needs it, so cityIndex below can still be namespaced/restored per
  // company
  let selectedPosition = Math.max(
    0,
    getSortedCorporationIndices().indexOf(getActiveCompanyIndex()),
  );
  function companyIndexAtPosition(position: number): number {
    return getSortedCorporationIndices()[position] ?? 0;
  }
  const restoredState = loadCityMapState(
    companyIndexAtPosition(selectedPosition),
  );
  // which city's 5-building page is currently shown; a city is "complete" (and the
  // next one reachable) once all MARKER_COUNT of its buildings are bought — see
  // updateArrows. Restored on load (see loadCityMapState) so a reload lands back
  // on the same page instead of always starting at city 0
  let cityIndex = restoredState.cityIndex;

  // saves cityIndex under the currently-selected company's own key any time it
  // changes, so a reload can restore it
  function persistCityMapState(): void {
    saveCityMapState(companyIndexAtPosition(selectedPosition), { cityIndex });
  }

  // same jitter-free centering trick drawHud (hud/index.ts) uses: only remeasured
  // when the amount's own character count changes, not every frame, since
  // centering on the live (constantly-changing, mid-count-up) width every frame is
  // what made the number visibly jitter left/right
  let cachedIncomeAmountWidth = 0;
  let cachedIncomeAmountLength = -1;

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

  // building 0's marker always sits bottom-right (fixed) — swapped with the
  // corporation name label, which sits bottom-left (see drawCorporationName) —
  // every other building's marker sits at its own fixed screen fraction, pulled
  // toward center by its own centerShiftPx, see MARKER_POSITIONS above
  function markerCenter(buildingIndex: number): { cx: number; feetY: number } {
    const pos = MARKER_POSITIONS[buildingIndex];
    let cx =
      buildingIndex === 0 ? cssW - 70 : (pos.cxFixed ?? cssW * pos.cxFrac);
    if (pos.centerShiftPx) {
      const center = cssW / 2;
      cx += cx > center ? -pos.centerShiftPx : pos.centerShiftPx;
    }
    cx += pos.cxNudgePx ?? 0;
    return {
      cx,
      feetY:
        (buildingIndex === 0 ? cssH - 40 : cssH * pos.feetYFrac) +
        (pos.feetYNudgePx ?? 0),
    };
  }

  function markerBounds(buildingIndex: number): MarkerBounds {
    const { cx, feetY } = markerCenter(buildingIndex);
    if (!catSprite) {
      return { left: cx, right: cx, top: feetY, bottom: feetY };
    }
    const frameW = catSprite.naturalWidth / CAT_FRAME_COUNT;
    const frameH = catSprite.naturalHeight;
    const renderW = (MARKER_H * frameW) / frameH;
    return {
      left: cx - renderW / 2 - MARKER_HIT_PADDING,
      right: cx + renderW / 2 + MARKER_HIT_PADDING,
      top: feetY - MARKER_H - MARKER_HIT_PADDING,
      bottom: feetY + MARKER_HIT_PADDING,
    };
  }

  function hitTestMarker(buildingIndex: number, x: number, y: number): boolean {
    const b = markerBounds(buildingIndex);
    return x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;
  }

  // any building beyond MARKER_COUNT has no marker here yet
  function hitTestAnyMarker(x: number, y: number): number | null {
    for (let i = 0; i < MARKER_COUNT; i++) {
      if (hitTestMarker(i, x, y)) return i;
    }
    return null;
  }

  function drawCatMarker(
    buildingIndex: number,
    frame: number,
    grayedOut: boolean,
    jumpOffsetY = 0,
  ): void {
    if (!catSprite) return;
    const { cx, feetY } = markerCenter(buildingIndex);
    const frameW = catSprite.naturalWidth / CAT_FRAME_COUNT;
    const frameH = catSprite.naturalHeight;
    const renderW = (MARKER_H * frameW) / frameH;
    ctx.save();
    if (grayedOut) {
      ctx.filter = "grayscale(1) brightness(0.85)";
      ctx.globalAlpha = 0.75;
    }
    ctx.drawImage(
      catSprite,
      frame * frameW,
      0,
      frameW,
      frameH,
      cx - renderW / 2,
      feetY - MARKER_H + jumpOffsetY,
      renderW,
      MARKER_H,
    );
    ctx.restore();
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

  // the corporation that owns every city on the map (see corporationName.ts) — a
  // small corner credit, bottom-left (swapped with building 0's marker, which now
  // docks bottom-right), well below/away from the city's own name up top so the
  // two are never confused for each other. The action bar's "Open upgrades"
  // button (see main.ts) opens the corporation upgrade menu while the map is
  // open. Rendered as a little barrel/reel: the selected corporation full-size
  // and opaque, its neighbors (newer above, older below) smaller and faded, all
  // scrolled by rollCorporationSelection when the action bar's up/down is
  // pressed while the map is open (see flashVerticalTransition)
  const CORPORATION_NAME_MARGIN_PX = 40;
  const CORPORATION_NAME_LEFT_PX = 40; // leaves room for .city-map__corp-pointer
  const CORP_NAME_FONT_SIZE = 22;
  const CORP_NAME_SIDE_SCALE = 1; // side rows' font size, as a fraction of the selected one's
  const CORP_NAME_SIDE_ALPHA = 0.35; // side rows' opacity
  const CORP_NAME_ROW_GAP = 24; // vertical spacing between adjacent rows
  const CORP_ROLL_MS = 260;
  // continuous "which position is centered" — equals selectedPosition at rest,
  // animates toward the new one mid-roll (see rollCorporationSelection)
  let corpRollFocus = selectedPosition;
  let corpRollAnimId: number | null = null;

  function drawCorporationNames(): void {
    const count = getCorporationCount();
    if (selectedPosition > count - 1) {
      selectedPosition = count - 1;
      corpRollFocus = selectedPosition;
      const companyIndex = companyIndexAtPosition(selectedPosition);
      setActiveCompanyIndex(companyIndex);
      cityIndex = loadCityMapState(companyIndex).cityIndex;
      deps.onSwitchCompany(companyIndex);
      persistCityMapState();
    }
    const sortedIndices = getSortedCorporationIndices();
    const bottom = cssH - CORPORATION_NAME_MARGIN_PX;
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    // a couple of rows past the nearest whole ones on each side is plenty — past
    // 1.5 rows away a name is already fully faded (alpha 0), not worth drawing
    const lo = Math.max(0, Math.floor(corpRollFocus) - 2);
    const hi = Math.min(count - 1, Math.ceil(corpRollFocus) + 2);
    for (let i = lo; i <= hi; i++) {
      const distance = i - corpRollFocus;
      const absDistance = Math.abs(distance);
      if (absDistance > 1.5) continue;
      const closeness = 1 - Math.min(1, absDistance); // 1 at the focus, 0 a row away
      const fontSize =
        CORP_NAME_FONT_SIZE *
        (CORP_NAME_SIDE_SCALE + (1 - CORP_NAME_SIDE_SCALE) * closeness);
      const alpha =
        CORP_NAME_SIDE_ALPHA + (1 - CORP_NAME_SIDE_ALPHA) * closeness;
      // higher position draws higher up (smaller y) — the barrel is alphabetical,
      // so "up" reveals the next name later in the alphabet
      const y = bottom - distance * CORP_NAME_ROW_GAP;
      const name = getCorporationName(sortedIndices[i]);
      ctx.font = `900 ${fontSize}px "Fredoka", system-ui, sans-serif`;
      ctx.globalAlpha = alpha;
      drawCartoonText(
        ctx,
        name,
        CORPORATION_NAME_LEFT_PX,
        y,
        COLOR.white,
        COLOR.black,
        5,
      );
      ctx.globalAlpha = 1;
    }
  }

  // rolls the barrel directly to targetPosition in one smooth motion (works for
  // any distance, not just an adjacent step) — shared by
  // rollCorporationSelection's one-step nudge (scroll-top/bottom while the map is
  // open) and animateSwitchToCompany's jump straight to a freshly-created
  // company. Drives its own redraw() calls every frame since the throttled tick
  // loop (~10fps) alone would read as choppy for something meant to look like a
  // smoothly spinning reel
  function rollToCorporation(targetPosition: number): void {
    const count = getCorporationCount();
    if (targetPosition < 0 || targetPosition > count - 1) return;
    if (corpRollAnimId !== null) cancelAnimationFrame(corpRollAnimId);
    const fromFocus = corpRollFocus;
    const start = performance.now();
    function frame(now: number): void {
      const t = Math.min(1, (now - start) / CORP_ROLL_MS);
      const eased = t * t * (3 - 2 * t); // smoothstep: quick but not linear/jerky
      corpRollFocus = fromFocus + (targetPosition - fromFocus) * eased;
      redraw();
      if (t < 1) {
        corpRollAnimId = requestAnimationFrame(frame);
      } else {
        corpRollFocus = targetPosition;
        selectedPosition = targetPosition;
        corpRollAnimId = null;
        const companyIndex = companyIndexAtPosition(selectedPosition);
        setActiveCompanyIndex(companyIndex);
        cityIndex = loadCityMapState(companyIndex).cityIndex;
        deps.onSwitchCompany(companyIndex);
        redraw();
      }
    }
    corpRollAnimId = requestAnimationFrame(frame);
  }

  // rolls the barrel one step: direction -1 (the action bar's "up") reveals the
  // next position (alphabetically later), direction 1 ("down") reveals the
  // previous one — a no-op past either end of the list
  function rollCorporationSelection(direction: -1 | 1): void {
    rollToCorporation(selectedPosition + (direction < 0 ? 1 : -1));
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
        drawCatMarker(i, frame, false, jumpOffsetY);
        continue;
      }
      drawCatMarker(i, CAT_STAND_FRAME, true);
      const { cx, feetY } = markerCenter(i);
      const price = getBuildingPrice(globalIndex);
      const affordable = deps.getTotalIncome() >= price;
      if (affordable) hasWigglingMarker = true;
      // 25% smaller than the original 22px, matching the scaled-down cat marker
      ctx.font = '900 16.5px "Fredoka", system-ui, sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      // 8px above the cat's own actual visible head (not the sprite frame's own
      // top edge, which is mostly transparent padding — see CAT_CONTENT_TOP_FRACTION)
      const priceY = feetY - MARKER_H * (1 - CAT_CONTENT_TOP_FRACTION) - 8;
      if (affordable) {
        // only wiggles (bounce + squash-stretch) once actually affordable — the
        // exact same transform the arrows' own CSS animations produce
        const phase =
          (Date.now() % PRICE_WIGGLE_PERIOD_MS) / PRICE_WIGGLE_PERIOD_MS;
        const { translateY, scaleX, scaleY } = getPriceWiggleTransform(phase);
        ctx.save();
        ctx.translate(cx, priceY + translateY);
        ctx.scale(scaleX, scaleY);
        drawCartoonText(ctx, formatPrice(price), 0, 0, COLOR.white);
        ctx.restore();
      } else {
        drawCartoonText(ctx, formatPrice(price), cx, priceY, COLOR.white);
      }
    }
    drawActiveCoinBursts(ctx, Date.now());

    // total income, top of the map — same green-fill/white-stroke money text look
    // used everywhere else, sized for this canvas's own CSS pixel space (unlike
    // hud/index.ts's drawHud, which is calibrated for the much larger world canvas).
    // the unit (e.g. "Undecillion") is spelled out in full on its own line below
    // the number instead of an abbreviation glued onto it. Same getAnimatedTotalIncome
    // count-up animation as drawHud, so this and the building view's HUD always
    // show the exact same (animated) number
    const incomeFont = '900 32px "Fredoka", system-ui, sans-serif';
    const INCOME_FONT_SIZE = 32;
    const { amount: incomeAmountText, unitName: incomeUnitName } =
      formatTotalIncomeParts(getAnimatedTotalIncome(deps.getTotalIncome()));
    const incomeTop = 20;
    const incomeStrokeWidth = 6;
    ctx.font = incomeFont;
    // left-aligned at a position derived from the cached (not live) width below —
    // still visually centered, but the anchor itself only moves when the number's
    // length does, instead of re-centering (and jittering) on every frame's width
    if (incomeAmountText.length !== cachedIncomeAmountLength) {
      cachedIncomeAmountWidth = ctx.measureText(incomeAmountText).width;
      cachedIncomeAmountLength = incomeAmountText.length;
    }
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    drawCartoonText(
      ctx,
      incomeAmountText,
      cssW / 2 - cachedIncomeAmountWidth / 2,
      incomeTop,
      COLOR.moneyGreen,
      COLOR.white,
      incomeStrokeWidth,
    );
    // measured (not a guessed constant) so the gap stays accurate even if the
    // income font/text ever changes
    const incomeMetrics = ctx.measureText(incomeAmountText);
    let incomeBottom =
      incomeTop +
      incomeMetrics.actualBoundingBoxAscent +
      incomeMetrics.actualBoundingBoxDescent +
      incomeStrokeWidth / 2;

    if (incomeUnitName) {
      const UNIT_NAME_GAP_PX = 8;
      const UNIT_NAME_STROKE_WIDTH = 4;
      const UNIT_NAME_FONT_SIZE = INCOME_FONT_SIZE * 0.8; // 20% smaller than the amount
      ctx.font = `900 ${UNIT_NAME_FONT_SIZE}px "Fredoka", system-ui, sans-serif`;
      ctx.textAlign = "center"; // unlike the amount above, this one's width isn't cached/jittery
      const unitNameTop = incomeBottom + UNIT_NAME_GAP_PX;
      drawCartoonText(
        ctx,
        incomeUnitName,
        cssW / 2,
        unitNameTop,
        COLOR.moneyGreen,
        COLOR.white,
        UNIT_NAME_STROKE_WIDTH,
      );
      const unitNameMetrics = ctx.measureText(incomeUnitName);
      incomeBottom =
        unitNameTop +
        unitNameMetrics.actualBoundingBoxAscent +
        unitNameMetrics.actualBoundingBoxDescent +
        UNIT_NAME_STROKE_WIDTH / 2;
    }

    drawStreetText(
      incomeBottom + STREET_TEXT_GAP_BELOW_INCOME,
      getCityName(cityIndex),
    );
    drawCorporationNames();
    drawCityPageIndicator(buildingCount);

    updateArrows(buildingCount);
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
    const hit = hitTestAnyMarker(p.x, p.y);
    canvas.style.cursor = hit !== null ? "pointer" : "default";
  }

  // clicking the next locked building (buildings unlock strictly in order) buys it
  // (staying on the map so its color/price change is visible); clicking a further,
  // not-yet-reachable locked marker does nothing; an unlocked one switches to it
  // and leaves the map entirely
  function onClick(event: MouseEvent): void {
    const p = canvasPoint(event);
    const hit = hitTestAnyMarker(p.x, p.y);
    if (hit === null) return;
    const globalIndex = cityIndex * MARKER_COUNT + hit;
    const buildingCount = deps.getBuildingCount();
    if (globalIndex === buildingCount) {
      if (deps.buyBuilding()) {
        playSold();
        markerJumpStartedAt.set(globalIndex, Date.now());
        const { cx, feetY } = markerCenter(hit);
        spawnCoinBurstAt(cx, feetY - MARKER_H / 2, MARKER_COIN_BURST_SCALE);
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

  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("click", onClick);

  // real SVG <line> rays, positioned/animated frame-by-frame from JS (not CSS —
  // a CSS gradient can't render an actual ray shape, and driving it here keeps the
  // sweep tightly in sync with the swoosh played alongside it). Regenerated fresh
  // each call since they depend on the canvas's current on-screen size
  let speedLineAnimId: number | null = null;
  function playSpeedLines(delta: -1 | 1): void {
    if (speedLineAnimId !== null) cancelAnimationFrame(speedLineAnimId);
    const w = cssW;
    const h = cssH;
    speedLinesSvg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    speedLinesSvg.innerHTML = "";
    const lines: SVGLineElement[] = [];
    for (let i = 0; i < SPEED_LINE_COUNT; i++) {
      const y = (((i * 37) % 100) / 100) * h; // deterministic spread, not evenly gridded
      const length = (0.22 + ((i * 53) % 48) / 100) * w; // varying "range": 22-70% of width
      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line",
      );
      line.setAttribute("x1", "0");
      line.setAttribute("x2", String(length));
      line.setAttribute("y1", String(y));
      line.setAttribute("y2", String(y));
      speedLinesSvg.appendChild(line);
      lines.push(line);
    }
    // next (delta 1) = the view moving forward/right, so the rays stream the
    // opposite way (right-to-left) past it, same parallax as scenery rushing past
    // a car window; prev mirrors it
    const startX = delta > 0 ? w * 1.2 : -w * 1.3;
    const endX = delta > 0 ? -w * 1.3 : w * 1.2;
    const start = performance.now();
    function frame(now: number): void {
      const t = Math.min(1, (now - start) / SPEED_LINE_MS);
      const eased = t * t * (3 - 2 * t); // smoothstep: quick but not linear/jerky
      const x = startX + (endX - startX) * eased;
      const opacity =
        t < 0.15 ? t / 0.15 : t > 0.75 ? Math.max(0, (1 - t) / 0.25) : 1;
      for (const line of lines) {
        line.setAttribute("transform", `translate(${x} 0)`);
        line.style.opacity = String(opacity);
      }
      if (t < 1) {
        speedLineAnimId = requestAnimationFrame(frame);
      } else {
        speedLinesSvg.innerHTML = "";
        speedLineAnimId = null;
      }
    }
    speedLineAnimId = requestAnimationFrame(frame);
  }

  // same ray sweep as playSpeedLines above, just rotated to run along Y instead
  // of X — for the action bar's own scroll-to-top/scroll-to-bottom buttons while
  // the map is open (see main.ts), not the city prev/next buttons, so it's kept
  // entirely separate rather than folded into playSpeedLines as a shared axis flag
  let verticalSpeedLineAnimId: number | null = null;
  function playVerticalSpeedLines(direction: -1 | 1): void {
    if (verticalSpeedLineAnimId !== null) {
      cancelAnimationFrame(verticalSpeedLineAnimId);
    }
    const w = cssW;
    const h = cssH;
    speedLinesSvg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    speedLinesSvg.innerHTML = "";
    const lines: SVGLineElement[] = [];
    for (let i = 0; i < SPEED_LINE_COUNT; i++) {
      const x = (((i * 37) % 100) / 100) * w; // deterministic spread, not evenly gridded
      const length = (0.22 + ((i * 53) % 48) / 100) * h; // varying "range": 22-70% of height
      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line",
      );
      line.setAttribute("x1", String(x));
      line.setAttribute("x2", String(x));
      line.setAttribute("y1", "0");
      line.setAttribute("y2", String(length));
      speedLinesSvg.appendChild(line);
      lines.push(line);
    }
    // direction 1 ("down", scroll-to-ground) streams downward; -1 ("up",
    // scroll-to-top) streams upward
    const startY = direction > 0 ? -h * 1.3 : h * 1.2;
    const endY = direction > 0 ? h * 1.2 : -h * 1.3;
    const start = performance.now();
    function frame(now: number): void {
      const t = Math.min(1, (now - start) / SPEED_LINE_MS);
      const eased = t * t * (3 - 2 * t); // smoothstep: quick but not linear/jerky
      const y = startY + (endY - startY) * eased;
      const opacity =
        t < 0.15 ? t / 0.15 : t > 0.75 ? Math.max(0, (1 - t) / 0.25) : 1;
      for (const line of lines) {
        line.setAttribute("transform", `translate(0 ${y})`);
        line.style.opacity = String(opacity);
      }
      if (t < 1) {
        verticalSpeedLineAnimId = requestAnimationFrame(frame);
      } else {
        speedLinesSvg.innerHTML = "";
        verticalSpeedLineAnimId = null;
      }
    }
    verticalSpeedLineAnimId = requestAnimationFrame(frame);
  }

  // same blur-then-clear treatment navigateCity gives the horizontal transition
  // below, just without a city swap in the middle — this is purely the action
  // bar's own scroll-to-top/scroll-to-bottom flourish while the map is open.
  // Also rolls the corporation-name barrel one step in the same direction
  let verticalClearTimeoutId: ReturnType<typeof setTimeout> | null = null;
  function flashVerticalTransition(direction: -1 | 1): void {
    canvas.classList.add("city-map__canvas--blurred");
    playVerticalSpeedLines(direction);
    rollCorporationSelection(direction);
    if (verticalClearTimeoutId !== null) clearTimeout(verticalClearTimeoutId);
    verticalClearTimeoutId = setTimeout(() => {
      canvas.classList.remove("city-map__canvas--blurred");
    }, TRANSITION_MS);
  }

  // same blur + speed-line flourish as a normal barrel roll, but jumping straight
  // to companyIndex's own barrel position in one motion instead of one adjacent
  // step — for a company switch that didn't come from the player rolling the
  // barrel themselves (see main.ts's companySelectMenu wiring, right after a
  // newly-bought company becomes active)
  function animateSwitchToCompany(companyIndex: number): void {
    const targetPosition = getSortedCorporationIndices().indexOf(companyIndex);
    if (targetPosition === -1) return;
    const direction: -1 | 1 = targetPosition >= selectedPosition ? -1 : 1;
    canvas.classList.add("city-map__canvas--blurred");
    playVerticalSpeedLines(direction);
    rollToCorporation(targetPosition);
    if (verticalClearTimeoutId !== null) clearTimeout(verticalClearTimeoutId);
    verticalClearTimeoutId = setTimeout(() => {
      canvas.classList.remove("city-map__canvas--blurred");
    }, TRANSITION_MS);
  }

  // anime-style "cut" transition: blur the canvas and flash speed lines across it,
  // swap cityIndex + redraw underneath while the screen is still covered by both,
  // then clear — hides the instant content swap behind the flash instead of it
  // just popping to the new city
  const TRANSITION_MS = 220;
  const SWAP_AT_MS = 90; // mid-flash, once fully covered but before it clears
  let swapTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let clearTimeoutId: ReturnType<typeof setTimeout> | null = null;
  function navigateCity(delta: -1 | 1): void {
    playSwoosh();
    canvas.classList.add("city-map__canvas--blurred");
    playSpeedLines(delta);
    if (swapTimeoutId !== null) clearTimeout(swapTimeoutId);
    if (clearTimeoutId !== null) clearTimeout(clearTimeoutId);
    swapTimeoutId = setTimeout(() => {
      cityIndex += delta;
      persistCityMapState();
      redraw();
    }, SWAP_AT_MS);
    clearTimeoutId = setTimeout(() => {
      canvas.classList.remove("city-map__canvas--blurred");
    }, TRANSITION_MS);
  }

  // both arrows are only ever visible when navigating to their side is actually
  // allowed (see updateArrows in redraw), so a click here never needs to re-check
  function onPrevClick(): void {
    navigateCity(-1);
  }
  function onNextClick(): void {
    navigateCity(1);
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
      hasWigglingMarker || hasActiveMarkerJump || hasActiveCoinBursts()
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
    canvas.removeEventListener("click", onClick);
    prevButton.removeEventListener("click", onPrevClick);
    nextButton.removeEventListener("click", onNextClick);
    resizeObserver.disconnect();
    if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
    if (swapTimeoutId !== null) clearTimeout(swapTimeoutId);
    if (clearTimeoutId !== null) clearTimeout(clearTimeoutId);
    if (speedLineAnimId !== null) cancelAnimationFrame(speedLineAnimId);
    if (verticalSpeedLineAnimId !== null) {
      cancelAnimationFrame(verticalSpeedLineAnimId);
    }
    if (verticalClearTimeoutId !== null) clearTimeout(verticalClearTimeoutId);
    if (corpRollAnimId !== null) cancelAnimationFrame(corpRollAnimId);
  }

  return {
    refresh: () => {
      cityIndex = Math.floor(deps.getActiveBuildingIndex() / MARKER_COUNT);
      persistCityMapState();
      redraw();
    },
    flashVerticalRays: flashVerticalTransition,
    animateSwitchToCompany,
    destroy,
  };
}
