import {
  FLOOR_W,
  FLOOR_H,
  GROUND_H,
  drawGround,
  drawCoins,
  hasActiveCoins,
  hitTestFloorHover,
  hitTestUpgradeButton,
  handleFloorClick,
  startButtonHoldAnim,
  stopButtonHoldAnim,
  isUpgradeButtonEnabled,
} from "../../floors";
import { drawFloorContent } from "../../gameRenderer";
import { drawClouds, CLOUD_MAX_RADIUS } from "../clouds";
import { drawCity, CITY_MAX_HEIGHT, getCitySkyGroundColor } from "../city";
import { drawStars } from "../stars";
import { drawRoof } from "../../buildings";
import { drawHud } from "../../hud";
import { updateMouse, hitTestMouse, handleMouseClick } from "../../mouse";
import { getTotalIncome } from "../../totalIncome";
import { getScreenShakeOffset, drawCritFlash } from "../../screenShake";
import { COLOR } from "../../palette";
import {
  startPressAndHold,
  type PressAndHoldController,
} from "../../shared/pressAndHold";
import type { Floor } from "../../gameState";

// a floor-room hit-test result: which floor a canvas point landed on, its own
// local coordinates within that floor's room art, and whether it's the ground
// floor (upgrade button hit-testing/rendering treats that one specially)
interface UpgradeHit {
  floor: Floor;
  localX: number;
  localY: number;
  isGroundFloor: boolean;
}

// one building's on-screen slot: a GUTTER_W margin on each side of its floor room art
// (blue sky/ground bleeds through, matching the old CSS `--floor-gutter` padding), so
// buildings don't butt edge-to-edge against each other or the canvas. Shrunk from an
// original 280 down to 100 so the building itself fills more of the fixed-width
// viewport (see floors/constants.ts's GROUND_H comment for how the street's own
// on-screen size is kept from growing along with it)
const GUTTER_W = 100;
const SLOT_W = FLOOR_W + GUTTER_W * 2;

// clouds only appear at/above this floor's altitude — nothing but clear blue sky
// below it. This is a single GLOBAL world-Y threshold (every building's floor N sits
// at the exact same altitude), not something computed per building
const CLOUD_START_FLOOR = 5;
const CLOUD_START_ALTITUDE = CLOUD_START_FLOOR * FLOOR_H;

// stars only appear at/above this floor's altitude, same global-threshold approach as
// clouds above — the sky gradient below transitions from night-navy to space-black
// across this same band, so the star field fades in exactly where the sky actually
// turns black instead of just appearing over a still-blue sky
const STAR_START_FLOOR = 8;
const STAR_START_ALTITUDE = STAR_START_FLOOR * FLOOR_H;

// fixed open-sky margin above the tallest building's own roof — floor rooms are
// opaque and span nearly the whole slot width, so clouds are only ever actually
// visible either in the thin side gutters or up here; this needs to be genuinely
// tall (not just GUTTER_W) or clouds would only ever show as thin edge slivers
// instead of drifting across the whole visible background
const SKY_MARGIN_H = 900;

// night sky: starts at the active theme's own city.png top-edge color (see
// getCitySkyGroundColor — so the seam where that image ends and this programmatic
// gradient begins is as close to invisible as possible, per theme) and deepens
// into near-black space across the same altitude band stars start appearing in
// (STAR_START_ALTITUDE), recomputed as a gradient every frame since which screen-y
// that world altitude falls at depends on the current scroll position
const SKY_COLOR_SPACE = COLOR.skySpace;

const DRAG_THRESHOLD_PX = 6; // pointer movement below this still counts as a click/tap
// touch/mouse momentum: velocity decays by this factor every ms once the pointer
// lifts, so a flick keeps coasting briefly instead of stopping dead on release
const MOMENTUM_DECAY_PER_MS = 0.994;
const MOMENTUM_MIN_SPEED = 0.02; // world units/ms below which momentum just stops
// press-and-hold auto-repeat: while the pointer stays down on an upgrade button,
// its click logic re-fires this often instead of only once on release — short
// enough to read as spamming the button by hand, not a slow metronome tick
const UPGRADE_HOLD_INTERVAL_MS = 50;

export interface GameCanvasDeps {
  canvas: HTMLCanvasElement;
  // always reads whichever theme the currently-active building uses (see
  // floors/index.ts's getActiveBackgrounds) — not a fixed array, since different
  // buildings can have completely different themes
  getBackgrounds: () => HTMLImageElement[];
  floors: Floor[]; // the initially-active building's floors
  getBuildingMultiplier: () => number; // the currently-active building's economy scale
  persist: () => void;
}

export interface GameCanvas {
  redraw: () => void;
  // re-measures the canvas's own CSS size; call right after un-hiding it (e.g.
  // switching back from the city map view), since a display:none canvas can't be
  // measured while hidden and its ResizeObserver callback fires async — too late
  // to save the very next redraw() from dividing by its still-stale zero size
  resize: () => void;
  // call right after pushing a new floor onto whatever's currently the active
  // building's own floors array (e.g. unlocking one live) — registers it for
  // hit-testing/coin-rect lookups
  notifyFloorAdded: (floor: Floor) => void;
  // switches which building's floors are currently displayed — no travel animation
  // yet, just an instant cut to the new street — and resets scroll to ground level
  setActiveFloors: (floors: Floor[]) => void;
  scrollActiveToTop: () => void;
  scrollActiveToBottom: () => void;
  // centers the camera on a given floor of the currently-active building (e.g. a
  // boost that landed on a random floor) — no-op if that floor isn't registered
  scrollActiveToFloor: (floor: Floor) => void;
}

// this is the single module that owns the game's 2D world: how big it is (scaled to
// the active building's own floors/gutters) and one shared camera that pans up/down
// through it — only one building is ever on screen at a time (see setActiveFloors),
// so there's no horizontal camera/panning at all.
export function createGameCanvas(deps: GameCanvasDeps): GameCanvas {
  const { canvas, getBackgrounds, getBuildingMultiplier, persist } = deps;
  const ctx = canvas.getContext("2d")!;

  let scale = 1; // world units -> CSS px
  let cssW = 0;
  let cssH = 0;

  // the currently-displayed building's own floors; swapped wholesale by
  // setActiveFloors instead of ever showing more than one building at once
  let activeFloors: Floor[] = deps.floors;

  // the one shared vertical camera; scrollUp is world-space
  let scrollUp = 0; // world units scrolled up from the ground-anchored default (0)
  // exact floor-local point the cursor is over, so the upgrade button can check
  // specifically whether it itself is hovered instead of "is anything on this floor
  // hoverable" (that coarser check is still what drives the pointer cursor below)
  let hoveredPoint: {
    floor: Floor;
    localX: number;
    localY: number;
    isGroundFloor: boolean;
  } | null = null;

  // a floor's index within activeFloors, kept in sync as floors are added, so a
  // hit-test or a coin burst's on-screen rect never has to scan the whole array
  const floorLocation = new WeakMap<Floor, { floorIndex: number }>();

  function registerFloors(floors: Floor[]): void {
    floors.forEach((floor, floorIndex) => {
      floorLocation.set(floor, { floorIndex });
    });
  }

  function notifyFloorAdded(floor: Floor): void {
    floorLocation.set(floor, { floorIndex: activeFloors.length - 1 });
    clampCamera();
  }

  function setActiveFloors(floors: Floor[]): void {
    activeFloors = floors;
    registerFloors(floors);
    scrollUp = 0;
    clampCamera();
  }

  // centers the camera vertically on whichever floor this is, if it's a currently
  // registered floor of the active building
  function scrollActiveToFloor(floor: Floor): void {
    const location = floorLocation.get(floor);
    if (!location) return;
    const { top, bottom } = floorWorldY(location.floorIndex);
    const floorCenterY = (top + bottom) / 2;
    scrollUp = GROUND_H - contentViewportH() / 2 - floorCenterY;
    clampCamera();
  }

  // floor i's (0 = ground) world-Y range — GLOBAL and shared by every building, so
  // floor 1 of a brand new building lines up exactly with floor 1 of every other one.
  // World-Y increases downward, 0 is the top of the ground strip; floors sit above
  // that at negative Y (higher floor number = higher up), identically for everyone.
  // Shifted down by BUILDING_GROUND_OVERLAP so the ground floor's own bottom edge
  // sits a few pixels into the street art below it (rather than exactly flush with
  // it), so the building visually sits on top of the street instead of leaving a
  // seam a hairline of sub-pixel canvas scaling could show through.
  const BUILDING_GROUND_OVERLAP = 32;
  // each floor's own row pitch is shrunk by this much so consecutive floors overlap
  // instead of only meeting exactly edge-to-edge — floor 2 and up all shift by this
  // same amount (it's the translate for the WHOLE floor, divider band and room
  // content together, not a separate adjustment for either)
  const FLOOR_OVERLAP = 14;
  // nudges the whole building (every floor, independent of the ground-overlap seam
  // fix above) up 20px, without moving the ground/street strip itself
  const BUILDING_Y_OFFSET = -20;
  function floorWorldY(floorIndex: number): { top: number; bottom: number } {
    const bottom =
      -floorIndex * (FLOOR_H - FLOOR_OVERLAP) +
      BUILDING_GROUND_OVERLAP +
      BUILDING_Y_OFFSET;
    return { top: bottom - FLOOR_H, bottom };
  }

  // the world's own fixed extent — everything the camera is allowed to move around
  // in, computed straight from the active building's own floors: gutters + content,
  // nothing that grows/shrinks for any other reason.
  // Bug fix: this used to be `-(activeFloors.length * FLOOR_H + SKY_MARGIN_H)`,
  // spacing every floor a full FLOOR_H apart — but floorWorldY (the function that
  // actually POSITIONS floors) packs them FLOOR_OVERLAP px tighter than that. The
  // mismatch was invisible at low floor counts but compounds by FLOOR_OVERLAP per
  // floor, so hundreds of floors left several screens of pure empty scrollable sky
  // above the roof. Deriving straight from floorWorldY keeps this in permanent sync
  // with wherever floors/the roof are actually drawn, at any floor count
  function worldTopY(): number {
    const topFloorIndex = Math.max(0, activeFloors.length - 1);
    return floorWorldY(topFloorIndex).top - SKY_MARGIN_H;
  }
  function worldHeight(): number {
    return GROUND_H - worldTopY();
  }

  function contentViewportH(): number {
    return Math.max(0, cssH / scale);
  }

  function maxScrollUp(): number {
    return Math.max(0, worldHeight() - contentViewportH());
  }

  function viewportBottomY(): number {
    return GROUND_H - scrollUp;
  }
  function viewportTopY(): number {
    return viewportBottomY() - contentViewportH();
  }

  function clampCamera(): void {
    // maxScrollUp() divides by scale (derived from cssW), so while the canvas
    // measures 0x0 (hidden, e.g. behind the city map view) that division is 0/0 —
    // NaN — and once scrollUp becomes NaN it's stuck there forever (Math.min/max
    // with a NaN operand always returns NaN, no future clampCamera call can undo
    // it). Skipping entirely while there's no valid size to clamp against avoids
    // ever poisoning it in the first place
    if (cssW <= 0 || cssH <= 0) return;
    // belt-and-suspenders recovery: if scrollUp somehow already went NaN before this
    // guard existed, Math.min/max can never clear it back out on their own
    if (Number.isNaN(scrollUp)) scrollUp = 0;
    scrollUp = Math.min(Math.max(scrollUp, 0), maxScrollUp());
  }

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    cssW = rect.width;
    cssH = rect.height;
    scale = cssW / SLOT_W;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    clampCamera();
  }

  // a distant city skyline silhouette sitting on the ground line, behind everything
  // else — drawn over the plain blue sky fill but under the clouds/ground/buildings
  function drawWorldCity(): void {
    const visibleTop = viewportTopY();
    const visibleBottom = viewportBottomY();
    if (0 <= visibleTop || -CITY_MAX_HEIGHT >= visibleBottom) return; // entirely out of view
    drawCity(ctx, 0, 0, SLOT_W);
  }

  // one continuous flat ground strip spanning the building's own slot width
  function drawWorldGround(): void {
    if (0 >= viewportBottomY() || GROUND_H <= viewportTopY()) return;
    drawGround(ctx, SLOT_W, 0);
  }

  // stars twinkle in the world above STAR_START_ALTITUDE, same global-threshold
  // pattern as clouds — a short building simply hasn't scrolled high enough to reach
  // them yet
  function drawWorldStars(now: number): void {
    const visibleTop = viewportTopY();
    const visibleBottom = Math.min(viewportBottomY(), -STAR_START_ALTITUDE);
    if (visibleBottom <= visibleTop) return; // nothing at/above floor 8 is on screen
    const visibleLeft = 0;
    const visibleRight = SLOT_W;
    ctx.save();
    ctx.beginPath();
    ctx.rect(
      visibleLeft,
      visibleTop,
      visibleRight - visibleLeft,
      visibleBottom - visibleTop,
    );
    ctx.clip();
    drawStars(
      ctx,
      SLOT_W,
      now,
      visibleLeft,
      visibleRight,
      visibleTop,
      visibleBottom,
    );
    ctx.restore();
  }

  // clouds float in the world above CLOUD_START_ALTITUDE — one global threshold, not
  // computed per building, so a short building simply hasn't reached them yet. Padded
  // downward by CLOUD_MAX_RADIUS so a cloud centered right at that altitude still
  // renders as a full circle instead of getting sliced in half by the clip below
  function drawWorldClouds(now: number): void {
    const visibleTop = viewportTopY();
    const visibleBottom = Math.min(
      viewportBottomY(),
      -CLOUD_START_ALTITUDE + CLOUD_MAX_RADIUS,
    );
    if (visibleBottom <= visibleTop) return; // nothing at/above floor 5 is on screen
    const visibleLeft = 0;
    const visibleRight = SLOT_W;
    ctx.save();
    ctx.beginPath();
    ctx.rect(
      visibleLeft,
      visibleTop,
      visibleRight - visibleLeft,
      visibleBottom - visibleTop,
    );
    ctx.clip();
    drawClouds(
      ctx,
      SLOT_W,
      now,
      visibleLeft,
      visibleRight,
      visibleTop,
      visibleBottom,
    );
    ctx.restore();
  }

  // which floor indices actually need a full drawFloorContent this frame: the
  // visible viewport plus one extra viewport-height of buffer on each side (so a
  // fast scroll/fling never visibly pops a floor in), computed directly from
  // floorWorldY's own linear formula instead of scanning every floor to find them —
  // this is what keeps drawActiveFloors's real cost independent of total floor
  // count (a building with hundreds of floors costs the same as one with a
  // handful, as long as only a few are ever near the viewport at once)
  function visibleFloorIndexRange(): { min: number; max: number } {
    const buffer = contentViewportH();
    const expandedTop = viewportTopY() - buffer;
    const expandedBottom = viewportBottomY() + buffer;
    const step = FLOOR_H - FLOOR_OVERLAP;
    const c = BUILDING_GROUND_OVERLAP + BUILDING_Y_OFFSET;
    // inverse of floorWorldY: bottom(i) = -i*step + c, top(i) = bottom(i) - FLOOR_H
    const maxIndex = Math.floor((c - expandedTop) / step);
    const minIndex = Math.ceil((c - FLOOR_H - expandedBottom) / step);
    return {
      min: Math.max(0, minIndex),
      max: Math.min(activeFloors.length - 1, maxIndex),
    };
  }

  function drawActiveFloors(): void {
    const { min, max } = visibleFloorIndexRange();

    for (let i = min; i <= max; i++) {
      const { top } = floorWorldY(i);
      ctx.save();
      ctx.translate(GUTTER_W, top);
      const buttonHovered =
        hoveredPoint !== null &&
        hoveredPoint.floor === activeFloors[i] &&
        hitTestUpgradeButton(hoveredPoint.localX, hoveredPoint.localY, i === 0);
      drawFloorContent(ctx, {
        backgrounds: getBackgrounds(),
        floor: activeFloors[i],
        floorNumber: i + 1,
        buttonHovered,
      });
      if (i === activeFloors.length - 1) drawRoof(ctx, activeFloors.length);
      ctx.restore();
    }
  }

  // a floor's current on-screen rect in the same frame everything else draws in —
  // coins.ts's particles are floor-local, so this is how a burst maps onto the
  // shared canvas
  function getFloorRect(
    floor: Floor,
  ): { left: number; top: number; width: number } | null {
    const loc = floorLocation.get(floor);
    if (!loc) return null;
    const { top } = floorWorldY(loc.floorIndex);
    return {
      left: GUTTER_W,
      top,
      width: FLOOR_W,
    };
  }

  // converts the current visual screen center (where screenShake's "CRIT!" flash is
  // drawn — dead center of the viewport) into the given floor's own local
  // coordinate space, so a coin burst can be anchored there instead of at a fixed
  // floor-local point (e.g. the upgrade button)
  function screenCenterLocalFor(floor: Floor): { x: number; y: number } {
    const loc = floorLocation.get(floor);
    const floorTop = loc ? floorWorldY(loc.floorIndex).top : 0;
    const worldCenterY = viewportTopY() + contentViewportH() / 2;
    return { x: FLOOR_W / 2, y: worldCenterY - floorTop };
  }

  function redraw(): void {
    // the canvas measures 0x0 while hidden (e.g. the city map view is showing
    // instead) or for a stray frame or two around a visibility toggle before its
    // ResizeObserver catches up — every distance below this point divides by scale
    // (derived from cssW), so drawing anything against a zero/invalid size produces
    // non-finite coordinates and throws (e.g. inside createLinearGradient)
    if (cssW <= 0 || cssH <= 0) return;
    updateMouse(activeFloors, Date.now());
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    // applied before the world scale so its magnitude stays a consistent CSS-pixel
    // rattle regardless of zoom, and before everything else so it shakes the whole
    // frame (world content + HUD) uniformly
    const shake = getScreenShakeOffset(Date.now());
    ctx.translate(shake.x, shake.y);
    ctx.scale(scale, scale);

    // background first, in plain screen space (fills the whole viewport regardless
    // of camera position) — a gradient, not a flat fill, since the night sky itself
    // deepens from navy near the ground to near-black up where the stars start.
    // The ground-to-CITY_MAX_HEIGHT band is held flat at getCitySkyGroundColor()
    // (matching the active theme's own city.png top-edge color) instead of starting
    // to darken immediately — that band is entirely covered by the opaque city art
    // anyway, but without this the gradient would already be a visibly different,
    // darker shade of blue by the time it reaches the image's top edge, showing up
    // as a hard seam line right where the art stops and the plain gradient takes over
    const groundScreenY = 0 - viewportTopY();
    const spaceScreenY = -STAR_START_ALTITUDE - viewportTopY();
    const cityTopFrac = Math.min(CITY_MAX_HEIGHT / STAR_START_ALTITUDE, 1);
    const skyColorGround = getCitySkyGroundColor();
    const sky = ctx.createLinearGradient(0, groundScreenY, 0, spaceScreenY);
    sky.addColorStop(0, skyColorGround);
    sky.addColorStop(cityTopFrac, skyColorGround);
    sky.addColorStop(1, SKY_COLOR_SPACE);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, SLOT_W, contentViewportH());

    // everything below is the shared vertical camera transform — ground/clouds/
    // floors are all drawn in plain world coordinates from here on
    ctx.save();
    ctx.translate(0, -viewportTopY());

    // strict paint order: stars, then city skyline, then ground, then clouds, then
    // the active building's floors on top of all of it — nothing from a later pass
    // can end up underneath one still to come
    drawWorldStars(performance.now());
    drawWorldCity();
    drawWorldGround();
    drawWorldClouds(performance.now());
    drawActiveFloors();

    if (hasActiveCoins()) drawCoins(ctx, getFloorRect);

    ctx.restore();

    // the total-income text is the absolute top layer: no reserved band, no fill
    // behind it, just floating text drawn last in plain screen space so nothing can
    // ever cover it and it never cuts the world off underneath it
    drawHud(ctx, SLOT_W, getTotalIncome());
    // pops up dead center over the whole viewport for the same brief window as the
    // shake above it (still inside the shake's own translate, so it rattles too —
    // reinforces the "this hit hard" feeling rather than floating serenely above it)
    drawCritFlash(ctx, SLOT_W / 2, contentViewportH() / 2, SLOT_W, Date.now());

    ctx.restore();
  }

  // --- input: one pointer drag drives floor-scroll (vertical only — there's no
  // horizontal camera anymore, only one building is ever on screen) ---

  let dragPointerId: number | null = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let lastY = 0;
  let dragging = false;
  let didDrag = false;
  let velocityY = 0;
  let lastMoveTime = 0;
  let momentumFrame: number | null = null;

  function stopMomentum(): void {
    if (momentumFrame !== null) {
      cancelAnimationFrame(momentumFrame);
      momentumFrame = null;
    }
  }

  function runMomentum(): void {
    let lastTime = performance.now();
    const step = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;
      if (Math.abs(velocityY) < MOMENTUM_MIN_SPEED) {
        momentumFrame = null;
        return;
      }
      scrollUp += velocityY * dt;
      clampCamera();
      const decay = Math.pow(MOMENTUM_DECAY_PER_MS, dt);
      velocityY *= decay;
      momentumFrame = requestAnimationFrame(step);
    };
    momentumFrame = requestAnimationFrame(step);
  }

  function canvasPoint(event: PointerEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / scale,
      y: (event.clientY - rect.top) / scale,
    };
  }

  // finds whichever floor of the active building a canvas-local point lands on, and
  // its floor-local coordinates within it — converts to world coordinates first
  // (undoing the same camera transform redraw() applies)
  function hitTestPoint(screenX: number, screenY: number): UpgradeHit | null {
    const worldX = screenX;
    const worldY = screenY + viewportTopY();
    const localX = worldX - GUTTER_W;
    if (localX < 0 || localX >= FLOOR_W) return null; // in the gutter, not the room
    for (let i = 0; i < activeFloors.length; i++) {
      const { top, bottom } = floorWorldY(i);
      if (worldY >= top && worldY < bottom) {
        return {
          floor: activeFloors[i],
          localX,
          localY: worldY - top,
          isGroundFloor: i === 0,
        };
      }
    }
    return null;
  }

  // shared by the upgrade button's hold-repeat interval and a normal tap's release
  function fireHandleFloorClick(hit: UpgradeHit): void {
    handleFloorClick(
      {
        floors: activeFloors,
        backgroundCount: getBackgrounds().length,
        multiplier: getBuildingMultiplier(),
        persist,
        onFloorAdded: (floor) => notifyFloorAdded(floor),
        getScreenCenterLocal: screenCenterLocalFor,
      },
      hit.floor,
      hit.localX,
      hit.localY,
      hit.isGroundFloor,
    );
  }

  // fires the upgrade button's click logic once (same overlapping-mouse-critter
  // courtesy a normal tap gets); called once on pointerdown, then again every
  // auto-repeat tick via fireHandleFloorClick alone (skipping the extra
  // handleMouseClick, which only makes sense for the very first fire)
  function fireUpgradeOnce(hit: UpgradeHit): void {
    handleMouseClick(hit.localX, hit.localY, hit.floor, activeFloors);
    fireHandleFloorClick(hit);
  }

  // press-and-hold auto-repeat on the upgrade button — fires immediately on
  // pointerdown, no tap-vs-drag delay or cancellation
  let holdController: PressAndHoldController | null = null;
  // true once this press has fired the upgrade button (set on pointerdown) —
  // tells onPointerUp not to also run the generic click-elsewhere fallback
  let upgradeFiredOnDown = false;
  // which floor's button the "pressure boiler" grow/burst/deflate animation
  // (see upgradeButton.ts's startButtonHoldAnim) is currently running for, so
  // it can be stopped the instant the hold ends regardless of how it ends
  let heldUpgradeFloor: Floor | null = null;

  function stopHoldRepeat(): void {
    holdController?.stop();
    holdController = null;
    if (heldUpgradeFloor) stopButtonHoldAnim(heldUpgradeFloor);
    heldUpgradeFloor = null;
  }

  function onPointerDown(event: PointerEvent): void {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    stopMomentum();
    dragPointerId = event.pointerId;
    dragStartX = event.clientX;
    dragStartY = lastY = event.clientY;
    dragging = false;
    didDrag = false;
    velocityY = 0;
    lastMoveTime = performance.now();
    canvas.setPointerCapture(event.pointerId);

    stopHoldRepeat(); // safety net against a stale hold from an interrupted previous gesture
    upgradeFiredOnDown = false;
    const p = canvasPoint(event);
    const hit = hitTestPoint(p.x, p.y);
    if (
      hit &&
      hit.floor.unlocked &&
      hitTestUpgradeButton(hit.localX, hit.localY, hit.isGroundFloor)
    ) {
      upgradeFiredOnDown = true;
      // only the greyed-out/disabled state should skip the "pressure boiler"
      // grow animation — the purchase attempt itself still fires/repeats
      // below regardless (a still-unaffordable button just silently fails
      // each tick, same as any other disabled-button click always has)
      if (isUpgradeButtonEnabled(hit.floor)) {
        heldUpgradeFloor = hit.floor;
        startButtonHoldAnim(hit.floor);
      }
      fireUpgradeOnce(hit);
      holdController = startPressAndHold(
        () => fireHandleFloorClick(hit),
        UPGRADE_HOLD_INTERVAL_MS,
      );
    }
  }

  function onPointerMove(event: PointerEvent): void {
    if (dragPointerId !== event.pointerId) {
      const p = canvasPoint(event);
      const hit = hitTestPoint(p.x, p.y);
      const hoverable = hit
        ? hitTestMouse(hit.localX, hit.localY, hit.floor) ||
          hitTestFloorHover(
            hit.localX,
            hit.localY,
            hit.floor,
            hit.isGroundFloor,
          )
        : false;
      canvas.style.cursor = hoverable ? "pointer" : "default";
      hoveredPoint = hit
        ? {
            floor: hit.floor,
            localX: hit.localX,
            localY: hit.localY,
            isGroundFloor: hit.isGroundFloor,
          }
        : null;
      return;
    }

    const dy = event.clientY - lastY;
    const now = performance.now();
    const dt = Math.max(1, now - lastMoveTime);
    lastMoveTime = now;

    if (!dragging) {
      const totalDx = event.clientX - dragStartX;
      const totalDy = event.clientY - dragStartY;
      if (Math.hypot(totalDx, totalDy) < DRAG_THRESHOLD_PX) return;
      dragging = true;
      didDrag = true;
    }

    scrollUp += dy / scale;
    velocityY = dy / scale / dt;
    clampCamera();
    lastY = event.clientY;
  }

  function onPointerUp(event: PointerEvent): void {
    if (dragPointerId !== event.pointerId) return;
    canvas.releasePointerCapture(event.pointerId);
    dragPointerId = null;
    stopHoldRepeat();
    if (didDrag) {
      if (Math.abs(velocityY) > MOMENTUM_MIN_SPEED) {
        runMomentum();
      }
      return;
    }
    if (upgradeFiredOnDown) return;
    const p = canvasPoint(event);
    const hit = hitTestPoint(p.x, p.y);
    if (!hit) return;
    // both run unconditionally on the same click — an overlapping mouse and cat(s)
    // both register, same as clicking overlapping cats already hits every one of them
    handleMouseClick(hit.localX, hit.localY, hit.floor, activeFloors);
    fireHandleFloorClick(hit);
  }

  function onWheel(event: WheelEvent): void {
    event.preventDefault();
    stopMomentum();
    scrollUp -= event.deltaY / scale;
    clampCamera();
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  registerFloors(activeFloors);
  const resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(canvas);
  resize();

  return {
    redraw,
    resize,
    notifyFloorAdded,
    setActiveFloors,
    scrollActiveToTop: () => {
      scrollUp = maxScrollUp(); // all the way to worldTopY, not just the roof
    },
    scrollActiveToBottom: () => {
      scrollUp = 0;
    },
    scrollActiveToFloor,
  };
}
