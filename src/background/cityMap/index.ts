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
import {
  getActiveCompanyIndex,
  setActiveCompanyIndex,
  companyStorageKey,
} from "../../company";
import cityMapUrl from "../../assets/city2Bg.png";
import catSpriteUrl from "../../assets/sprites/kitty1Walk.png";
import starUrl from "../../assets/star.png";

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
const MARKER_H = 100;
const MARKER_HIT_PADDING = 16; // generous click/hover target beyond the sprite's own bounds
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
  { cxFrac: 0.88, feetYFrac: 0.78, centerShiftPx: 300 }, // building 1 (2 stars): far right
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
// tier star row drawn under each marker: building index 0 shows 1 filled star (of
// 5), the last building (index MARKER_COUNT-1) shows all 5 filled
const STAR_ROW_Y_OFFSET = 12; // below the marker's feetY
const STAR_SIZE = 18; // rendered square size (star.png is roughly square already)
const STAR_SPACING = 20;
// outline stamped behind each star icon, offset in a ring of directions — star.png is a
// raster sprite with transparency, not a path, so there's nothing to ctx.stroke() directly.
// Offsets are placed evenly around a circle (equal true radius) rather than by cardinal/
// diagonal deltas, so the stamped ring dilates uniformly in every direction instead of
// bulging out further on the diagonals (sqrt(2)x a matching cardinal delta) and reading
// as octagonal/faceted instead of round
const STAR_STROKE_WIDTH = 2;
const STAR_STROKE_SAMPLE_COUNT = 16;
const STAR_STROKE_OFFSETS: [number, number][] = Array.from(
  { length: STAR_STROKE_SAMPLE_COUNT },
  (_, i) => {
    const angle = (i / STAR_STROKE_SAMPLE_COUNT) * Math.PI * 2;
    return [
      Math.cos(angle) * STAR_STROKE_WIDTH,
      Math.sin(angle) * STAR_STROKE_WIDTH,
    ];
  },
);

// gap between the total-income readout and each city's own name, drawn flat right
// below it (see drawStreetText) — the name itself comes from cityName.ts's
// getCityName, keyed by which city (5-building page) is currently being viewed
const STREET_TEXT_GAP_BELOW_INCOME = 12;

let mapImage: HTMLImageElement | null = null;
let catSprite: HTMLImageElement | null = null;
let starImage: HTMLImageElement | null = null;
// star.png's own silhouette with alpha hardened to fully opaque/transparent (no
// anti-aliased fringe) — stamped at each offset above to build the outline; keeping
// the source's own soft edges would layer up into a blurry haze instead of a sharp
// ring once dilated. Built once since star.png/STAR_SIZE never change after load
let starOutline: HTMLCanvasElement | null = null;

export async function loadCityMapImage(): Promise<HTMLImageElement> {
  [mapImage, catSprite, starImage] = await Promise.all([
    loadImage(cityMapUrl),
    loadImage(catSpriteUrl),
    loadImage(starUrl),
  ]);
  const outlineCanvas = document.createElement("canvas");
  outlineCanvas.width = STAR_SIZE;
  outlineCanvas.height = STAR_SIZE;
  const outlineCtx = outlineCanvas.getContext("2d")!;
  outlineCtx.drawImage(starImage, 0, 0, STAR_SIZE, STAR_SIZE);
  const silhouette = outlineCtx.getImageData(0, 0, STAR_SIZE, STAR_SIZE);
  const ALPHA_THRESHOLD = 40; // out of 255 — anything past this counts as "inside" the star
  for (let i = 0; i < silhouette.data.length; i += 4) {
    const opaque = silhouette.data[i + 3] > ALPHA_THRESHOLD;
    silhouette.data[i] = 255;
    silhouette.data[i + 1] = 255;
    silhouette.data[i + 2] = 255;
    silhouette.data[i + 3] = opaque ? 255 : 0;
  }
  outlineCtx.putImageData(silhouette, 0, 0);
  starOutline = outlineCanvas;
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
  // which corporation (see company.ts) owns whichever buildings/cities are
  // currently loaded — the single source of truth for "selected company" shared
  // with main.ts, so cityIndex below can be namespaced/restored per company
  let selectedCorporationIndex = getActiveCompanyIndex();
  const restoredState = loadCityMapState(selectedCorporationIndex);
  // which city's 5-building page is currently shown; a city is "complete" (and the
  // next one reachable) once all MARKER_COUNT of its buildings are bought — see
  // updateArrows. Restored on load (see loadCityMapState) so a reload lands back
  // on the same page instead of always starting at city 0
  let cityIndex = restoredState.cityIndex;

  // saves cityIndex under the currently-selected company's own key any time it
  // changes, so a reload can restore it
  function persistCityMapState(): void {
    saveCityMapState(selectedCorporationIndex, { cityIndex });
  }

  // same jitter-free centering trick drawHud (hud/index.ts) uses: only remeasured
  // when the amount's own character count changes, not every frame, since
  // centering on the live (constantly-changing, mid-count-up) width every frame is
  // what made the number visibly jitter left/right
  let cachedIncomeAmountWidth = 0;
  let cachedIncomeAmountLength = -1;

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

  // single star.png icon; empty (unfilled) ones get a flat gray tint via canvas
  // filter, same technique drawCatMarker uses for a locked building's marker.
  // targetCtx so this can render into the row cache canvas below as easily as
  // the visible one
  function drawStarIcon(
    targetCtx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    filled: boolean,
  ): void {
    if (!starImage) return;
    targetCtx.save();
    if (starOutline) {
      const ox = cx - STAR_SIZE / 2;
      const oy = cy - STAR_SIZE / 2;
      for (const [dx, dy] of STAR_STROKE_OFFSETS) {
        targetCtx.drawImage(
          starOutline,
          ox + dx,
          oy + dy,
          STAR_SIZE,
          STAR_SIZE,
        );
      }
    }
    if (!filled) {
      targetCtx.filter = "grayscale(1) brightness(0.75)";
      targetCtx.globalAlpha = 0.6;
    }
    targetCtx.drawImage(
      starImage,
      cx - STAR_SIZE / 2,
      cy - STAR_SIZE / 2,
      STAR_SIZE,
      STAR_SIZE,
    );
    targetCtx.restore();
  }

  // a star row only ever looks one of 5 ways (filledCount 1-5), so each variant is
  // rendered once into its own offscreen canvas and reused from then on — redoing
  // every star's 16-offset outline effect (~85 drawImage calls total across a
  // building's row) from scratch on every single animation frame was the actual
  // cost that made opening the map freeze the page
  const STAR_ROW_PAD = STAR_STROKE_WIDTH; // room for the outline's offset stroke past each edge star
  const STAR_ROW_W = STAR_SPACING * 4 + STAR_SIZE + STAR_ROW_PAD * 2;
  const STAR_ROW_H = STAR_SIZE + STAR_ROW_PAD * 2;
  const starRowCache = new Map<number, HTMLCanvasElement>();
  let starRowCacheDpr = 0;
  function getStarRow(filledCount: number): HTMLCanvasElement | null {
    if (!starImage) return null;
    const dpr = window.devicePixelRatio || 1;
    // a device-pixel-resolution cache built at one dpr would upscale (and blur)
    // if the page later renders at a higher one — clear and rebuild instead
    if (dpr !== starRowCacheDpr) {
      starRowCache.clear();
      starRowCacheDpr = dpr;
    }
    const cached = starRowCache.get(filledCount);
    if (cached) return cached;
    const rowCanvas = document.createElement("canvas");
    // backing store sized in device pixels (like the main canvas), not CSS pixels —
    // otherwise this cache is drawn back into the dpr-scaled main context at less
    // than its own resolution, upscaling (and blurring) it on any high-DPR screen
    rowCanvas.width = Math.round(STAR_ROW_W * dpr);
    rowCanvas.height = Math.round(STAR_ROW_H * dpr);
    const rowCtx = rowCanvas.getContext("2d")!;
    rowCtx.scale(dpr, dpr);
    for (let i = 0; i < 5; i++) {
      drawStarIcon(
        rowCtx,
        STAR_ROW_PAD + i * STAR_SPACING + STAR_SIZE / 2,
        STAR_ROW_PAD + STAR_SIZE / 2,
        i < filledCount,
      );
    }
    starRowCache.set(filledCount, rowCanvas);
    return rowCanvas;
  }

  // 5 stars centered under the marker; `filledCount` (buildingIndex + 1) of them
  // solid gold, the rest gray-tinted — shows this building's tier at a glance
  function drawStarRow(buildingIndex: number, filledCount: number): void {
    const row = getStarRow(filledCount);
    if (!row) return;
    const { cx, feetY } = markerCenter(buildingIndex);
    const rowY = feetY + STAR_ROW_Y_OFFSET;
    const startX = cx - (STAR_SPACING * 4) / 2 - STAR_SIZE / 2 - STAR_ROW_PAD;
    // row's own backing store is device-pixel-resolution now, so its size must be
    // given explicitly in CSS pixels here — omitting it would draw at the row
    // canvas's raw (dpr-multiplied) pixel dimensions, dpr times too large
    ctx.drawImage(
      row,
      startX,
      rowY - STAR_SIZE / 2 - STAR_ROW_PAD,
      STAR_ROW_W,
      STAR_ROW_H,
    );
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
      feetY - MARKER_H,
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
  // continuous "which index is centered" — equals selectedCorporationIndex at
  // rest, animates toward the new one mid-roll (see rollCorporationSelection)
  let corpRollFocus = selectedCorporationIndex;
  let corpRollAnimId: number | null = null;

  function drawCorporationNames(): void {
    const count = getCorporationCount();
    if (selectedCorporationIndex > count - 1) {
      selectedCorporationIndex = count - 1;
      corpRollFocus = selectedCorporationIndex;
      setActiveCompanyIndex(selectedCorporationIndex);
      cityIndex = loadCityMapState(selectedCorporationIndex).cityIndex;
      deps.onSwitchCompany(selectedCorporationIndex);
      persistCityMapState();
    }
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
      // higher index draws higher up (smaller y) — new corporations are added
      // above the current one, so "up" should reveal a higher index
      const y = bottom - distance * CORP_NAME_ROW_GAP;
      const name = getCorporationName(i);
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

  // rolls the barrel one step: direction -1 (the action bar's "up") reveals the
  // next-higher (newer) corporation, direction 1 ("down") reveals the next-lower
  // (older) one — a no-op past either end of the list. Drives its own redraw()
  // calls every frame since the throttled tick loop (~10fps) alone would read as
  // choppy for something meant to look like a smoothly spinning reel
  function rollCorporationSelection(direction: -1 | 1): void {
    const count = getCorporationCount();
    const targetIndex = selectedCorporationIndex + (direction < 0 ? 1 : -1);
    if (targetIndex < 0 || targetIndex > count - 1) return;
    if (corpRollAnimId !== null) cancelAnimationFrame(corpRollAnimId);
    const fromFocus = corpRollFocus;
    const start = performance.now();
    function frame(now: number): void {
      const t = Math.min(1, (now - start) / CORP_ROLL_MS);
      const eased = t * t * (3 - 2 * t); // smoothstep: quick but not linear/jerky
      corpRollFocus = fromFocus + (targetIndex - fromFocus) * eased;
      redraw();
      if (t < 1) {
        corpRollAnimId = requestAnimationFrame(frame);
      } else {
        corpRollFocus = targetIndex;
        selectedCorporationIndex = targetIndex;
        corpRollAnimId = null;
        setActiveCompanyIndex(selectedCorporationIndex);
        cityIndex = loadCityMapState(selectedCorporationIndex).cityIndex;
        deps.onSwitchCompany(selectedCorporationIndex);
        redraw();
      }
    }
    corpRollAnimId = requestAnimationFrame(frame);
  }

  function redraw(): void {
    // re-measure every call instead of trusting whatever resize() last cached —
    // otherwise a redraw sandwiched between the canvas becoming visible and its
    // next resize() call draws against a stale size, stretching the map image
    // for one frame until the following resize() corrects it
    resize();
    if (cssW <= 0 || cssH <= 0) return;
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
        drawCatMarker(
          i,
          activeIndex === globalIndex ? pose : CAT_STAND_FRAME,
          false,
        );
        drawStarRow(i, i + 1);
        continue;
      }
      drawCatMarker(i, CAT_STAND_FRAME, true);
      const { cx, feetY } = markerCenter(i);
      ctx.font = '900 22px "Fredoka", system-ui, sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      drawCartoonText(
        ctx,
        formatPrice(getBuildingPrice(globalIndex)),
        cx,
        feetY - 62,
        COLOR.white,
      );
      drawStarRow(i, i + 1);
    }

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
      if (deps.buyBuilding()) playSold();
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
  // made opening the map freeze the whole page
  const TICK_REDRAW_INTERVAL_MS = 100;
  let animationFrameId: number | null = null;
  let lastTickRedraw = 0;
  function tick(): void {
    const now = performance.now();
    if (now - lastTickRedraw >= TICK_REDRAW_INTERVAL_MS) {
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
    destroy,
  };
}
