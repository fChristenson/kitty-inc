import { FLOOR_W, FLOOR_H, GROUND_H, drawGround } from "../../floors";
import { drawFloorContent } from "../../gameRenderer";
import { drawClouds, CLOUD_MAX_RADIUS } from "../clouds";
import { drawHud } from "../../hud";
import { drawCoins, hasActiveCoins } from "../../floors/coins";
import { getTotalIncome } from "../../totalIncome";
import {
  hitTestFloorHover,
  handleFloorClick,
} from "../../floors/floorInteractions";
import type { Floor } from "../../gameState";
import type { FurnitureSprite } from "../../floors/sprites";

// one building's on-screen slot: a GUTTER_W margin on each side of its floor room art
// (blue sky/ground bleeds through, matching the old CSS `--floor-gutter` padding), so
// buildings don't butt edge-to-edge against each other or the canvas. Wide enough that
// the sky/clouds flanking a building read as a real, continuous background instead of
// a thin sliver squeezed against the room art
const GUTTER_W = 280;
const SLOT_W = FLOOR_W + GUTTER_W * 2;

// clouds only appear at/above this floor's altitude — nothing but clear blue sky
// below it. This is a single GLOBAL world-Y threshold (every building's floor N sits
// at the exact same altitude), not something computed per building
const CLOUD_START_FLOOR = 5;
const CLOUD_START_ALTITUDE = CLOUD_START_FLOOR * FLOOR_H;

// fixed open-sky margin above the tallest building's own roof — floor rooms are
// opaque and span nearly the whole slot width, so clouds are only ever actually
// visible either in the thin side gutters or up here; this needs to be genuinely
// tall (not just GUTTER_W) or clouds would only ever show as thin edge slivers
// instead of drifting across the whole visible background
const SKY_MARGIN_H = 800;

const SKY_COLOR = "#6ec6ff";

const DRAG_THRESHOLD_PX = 6; // pointer movement below this still counts as a click/tap
// touch/mouse momentum: velocity decays by this factor every ms once the pointer
// lifts, so a flick keeps coasting briefly instead of stopping dead on release
const MOMENTUM_DECAY_PER_MS = 0.994;
const MOMENTUM_MIN_SPEED = 0.02; // world units/ms below which momentum just stops

export interface GameCanvasDeps {
  canvas: HTMLCanvasElement;
  bgImage: HTMLImageElement;
  furnitureSprites: FurnitureSprite[];
  buildings: Floor[][]; // one Floor[] per building; main.ts pushes into this in place
  getBuildingMultiplier: (buildingIndex: number) => number;
  persist: () => void;
  onActiveBuildingChange: (index: number) => void;
}

export interface GameCanvas {
  redraw: () => void;
  // call once right after buildings.push(newFloorsArray) — registers every floor
  // currently in the newest building for hit-testing/coin-rect lookups
  addBuilding: () => void;
  // call after floorLock.ts's ensureLockedFloorAbove pushes a floor directly (used by
  // main.ts's own initial per-building setup, outside of a live unlock click)
  notifyFloorAdded: (buildingIndex: number, floor: Floor) => void;
  scrollActiveToTop: () => void;
  scrollActiveToBottom: () => void;
  getActiveBuildingIndex: () => number;
}

// this is the single module that owns the game's 2D world: how big it is (scaled to
// the buildings/floors/gutters actually in it) and one shared camera that pans around
// inside it in both x and y — every building sits on the exact same ground line, side
// by side along the world's x-axis, never with its own independent scroll state.
export function createGameCanvas(deps: GameCanvasDeps): GameCanvas {
  const {
    canvas,
    bgImage,
    furnitureSprites,
    buildings,
    getBuildingMultiplier,
    persist,
    onActiveBuildingChange,
  } = deps;
  const ctx = canvas.getContext("2d")!;

  let scale = 1; // world units -> CSS px
  let cssW = 0;
  let cssH = 0;

  // the one shared camera: cameraX/scrollUp are world-space, identical meaning
  // regardless of which building(s) currently happen to be on screen
  let cameraX = 0; // world-x currently at the viewport's left edge
  let scrollUp = 0; // world units scrolled up from the ground-anchored default (0)
  let activeBuildingIndex = 0;
  let hoveredFloor: Floor | null = null;

  // which building/index a given Floor lives at, kept in sync as floors are added, so
  // a hit-test or a coin burst's on-screen rect never has to scan every building
  const floorLocation = new WeakMap<
    Floor,
    { buildingIndex: number; floorIndex: number }
  >();

  function notifyFloorAdded(buildingIndex: number, floor: Floor): void {
    floorLocation.set(floor, {
      buildingIndex,
      floorIndex: buildings[buildingIndex].length - 1,
    });
  }

  function addBuilding(): void {
    const buildingIndex = buildings.length - 1;
    buildings[buildingIndex].forEach((floor, floorIndex) => {
      floorLocation.set(floor, { buildingIndex, floorIndex });
    });
    clampCamera();
  }

  // floor i's (0 = ground) world-Y range — GLOBAL and shared by every building, so
  // floor 1 of a brand new building lines up exactly with floor 1 of every other one.
  // World-Y increases downward, 0 is the top of the ground strip; floors sit above
  // that at negative Y (higher floor number = higher up), identically for everyone.
  function floorWorldY(floorIndex: number): { top: number; bottom: number } {
    const bottom = -floorIndex * FLOOR_H;
    return { top: bottom - FLOOR_H, bottom };
  }

  function tallestFloorCount(): number {
    return buildings.reduce((max, floors) => Math.max(max, floors.length), 1);
  }

  // the world's own fixed extent — everything the camera is allowed to move around
  // in, computed straight from the buildings given to this module: gutters + content
  // in both directions, nothing more, nothing that grows/shrinks for any other reason
  function worldWidth(): number {
    return buildings.length * SLOT_W;
  }
  function worldTopY(): number {
    return -(tallestFloorCount() * FLOOR_H + SKY_MARGIN_H);
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
    const maxX = Math.max(0, worldWidth() - SLOT_W);
    cameraX = Math.min(Math.max(cameraX, 0), maxX);
    scrollUp = Math.min(Math.max(scrollUp, 0), maxScrollUp());
  }

  function updateActiveBuilding(): void {
    const index = Math.min(
      Math.max(Math.round(cameraX / SLOT_W), 0),
      Math.max(0, buildings.length - 1),
    );
    if (index !== activeBuildingIndex) {
      activeBuildingIndex = index;
      onActiveBuildingChange(index);
    }
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

  // every building whose world-x slot currently overlaps the viewport, usually one,
  // occasionally two mid-drag — everything else is skipped entirely, not just hidden
  function visibleBuildingIndices(): number[] {
    const result: number[] = [];
    for (let b = 0; b < buildings.length; b++) {
      const left = b * SLOT_W - cameraX;
      if (left < SLOT_W && left + SLOT_W > 0) result.push(b);
    }
    return result;
  }

  // one continuous flat ground strip across whatever's currently visible — not drawn
  // per building, so there's never a seam between one building's ground and the next
  function drawWorldGround(): void {
    const left = Math.max(0, cameraX);
    const right = Math.min(worldWidth(), cameraX + SLOT_W);
    if (right <= left) return;
    if (0 >= viewportBottomY() || GROUND_H <= viewportTopY()) return;
    ctx.save();
    ctx.translate(left, 0);
    drawGround(ctx, right - left);
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
    const visibleLeft = cameraX;
    const visibleRight = cameraX + SLOT_W;
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
      worldWidth(),
      now,
      visibleLeft,
      visibleRight,
      visibleTop,
      visibleBottom,
    );
    ctx.restore();
  }

  function drawBuildingFloors(buildingIndex: number): void {
    const floors = buildings[buildingIndex];
    const slotLeft = buildingIndex * SLOT_W + GUTTER_W; // world-x; caller already applied the camera translate
    for (let i = 0; i < floors.length; i++) {
      const { top, bottom } = floorWorldY(i);
      if (bottom < viewportTopY() || top > viewportBottomY()) continue; // scrolled out of view
      ctx.save();
      ctx.translate(slotLeft, top);
      drawFloorContent(ctx, {
        bgImage,
        floor: floors[i],
        floorNumber: i + 1,
        totalFloors: floors.length,
        hovered: floors[i] === hoveredFloor,
      });
      ctx.restore();
    }
  }

  // a floor's current on-screen rect in the same camera-translated frame everything
  // else draws in — coins.ts's particles are floor-local, so this is how a burst
  // maps onto the one shared canvas
  function getFloorRect(
    floor: Floor,
  ): { left: number; top: number; width: number } | null {
    const loc = floorLocation.get(floor);
    if (!loc) return null;
    const { buildingIndex, floorIndex } = loc;
    const { top } = floorWorldY(floorIndex);
    return {
      left: buildingIndex * SLOT_W + GUTTER_W,
      top,
      width: FLOOR_W,
    };
  }

  function redraw(): void {
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.scale(scale, scale);

    // background first, in plain screen space (fills the whole viewport regardless
    // of camera position)
    ctx.fillStyle = SKY_COLOR;
    ctx.fillRect(0, 0, SLOT_W, contentViewportH());

    // everything below is one shared camera transform — ground/clouds/floors are all
    // drawn in plain world coordinates from here on, no per-building offset math
    ctx.save();
    ctx.translate(-cameraX, -viewportTopY());

    // strict paint order: ground, then clouds, then every visible building's floors
    // on top of all of it — nothing from a later pass can end up underneath one
    // still to come
    drawWorldGround();
    drawWorldClouds(performance.now());
    for (const b of visibleBuildingIndices()) drawBuildingFloors(b);

    if (hasActiveCoins()) drawCoins(ctx, getFloorRect);

    ctx.restore();

    // the total-income text is the absolute top layer: no reserved band, no fill
    // behind it, just floating text drawn last in plain screen space so nothing can
    // ever cover it and it never cuts the world off underneath it
    drawHud(ctx, SLOT_W, getTotalIncome());

    ctx.restore();
  }

  // --- input: one pointer drag drives both building-swipe (x) and floor-scroll (y),
  // axis-locked from whichever direction the drag actually started moving in ---

  let dragPointerId: number | null = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let lastX = 0;
  let lastY = 0;
  let dragAxis: "x" | "y" | null = null;
  let didDrag = false;
  let velocityX = 0;
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
      if (
        Math.abs(velocityX) < MOMENTUM_MIN_SPEED &&
        Math.abs(velocityY) < MOMENTUM_MIN_SPEED
      ) {
        momentumFrame = null;
        return;
      }
      cameraX -= velocityX * dt;
      scrollUp += velocityY * dt;
      clampCamera();
      updateActiveBuilding();
      const decay = Math.pow(MOMENTUM_DECAY_PER_MS, dt);
      velocityX *= decay;
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

  // finds whichever visible building/floor a canvas-local point lands on, and its
  // floor-local coordinates within it — converts to world coordinates first (undoing
  // the same camera transform redraw() applies), since that's the one space
  // everything (buildings, floors, ground) is actually laid out in
  function hitTestPoint(
    screenX: number,
    screenY: number,
  ): {
    floor: Floor;
    buildingIndex: number;
    localX: number;
    localY: number;
  } | null {
    const worldX = screenX + cameraX;
    const worldY = screenY + viewportTopY();
    const buildingIndex = Math.floor(worldX / SLOT_W);
    const floors = buildings[buildingIndex];
    if (!floors) return null;
    const slotLeft = buildingIndex * SLOT_W + GUTTER_W;
    const localX = worldX - slotLeft;
    if (localX < 0 || localX >= FLOOR_W) return null; // in the gutter, not the room
    for (let i = 0; i < floors.length; i++) {
      const { top, bottom } = floorWorldY(i);
      if (worldY >= top && worldY < bottom) {
        return {
          floor: floors[i],
          buildingIndex,
          localX,
          localY: worldY - top,
        };
      }
    }
    return null;
  }

  function onPointerDown(event: PointerEvent): void {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    stopMomentum();
    dragPointerId = event.pointerId;
    dragStartX = lastX = event.clientX;
    dragStartY = lastY = event.clientY;
    dragAxis = null;
    didDrag = false;
    velocityX = 0;
    velocityY = 0;
    lastMoveTime = performance.now();
    canvas.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent): void {
    if (dragPointerId !== event.pointerId) {
      const p = canvasPoint(event);
      const hit = hitTestPoint(p.x, p.y);
      const hoverable = hit
        ? hitTestFloorHover(hit.localX, hit.localY, hit.floor)
        : false;
      canvas.style.cursor = hoverable ? "pointer" : "default";
      hoveredFloor = hit && hoverable ? hit.floor : null;
      return;
    }

    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    const now = performance.now();
    const dt = Math.max(1, now - lastMoveTime);
    lastMoveTime = now;

    if (!dragAxis) {
      const totalDx = event.clientX - dragStartX;
      const totalDy = event.clientY - dragStartY;
      if (Math.hypot(totalDx, totalDy) < DRAG_THRESHOLD_PX) return;
      dragAxis = Math.abs(totalDx) > Math.abs(totalDy) ? "x" : "y";
      didDrag = true;
    }

    if (dragAxis === "x") {
      cameraX -= dx / scale;
      velocityX = dx / scale / dt;
    } else {
      scrollUp += dy / scale;
      velocityY = dy / scale / dt;
    }
    clampCamera();
    updateActiveBuilding();
    lastX = event.clientX;
    lastY = event.clientY;
  }

  function onPointerUp(event: PointerEvent): void {
    if (dragPointerId !== event.pointerId) return;
    canvas.releasePointerCapture(event.pointerId);
    dragPointerId = null;
    if (didDrag) {
      if (
        Math.abs(velocityX) > MOMENTUM_MIN_SPEED ||
        Math.abs(velocityY) > MOMENTUM_MIN_SPEED
      ) {
        runMomentum();
      }
      return;
    }
    const p = canvasPoint(event);
    const hit = hitTestPoint(p.x, p.y);
    if (!hit) return;
    handleFloorClick(
      {
        floors: buildings[hit.buildingIndex],
        furnitureSprites,
        multiplier: getBuildingMultiplier(hit.buildingIndex),
        persist,
        onFloorAdded: (floor) => notifyFloorAdded(hit.buildingIndex, floor),
      },
      hit.floor,
      hit.localX,
      hit.localY,
    );
  }

  function onWheel(event: WheelEvent): void {
    event.preventDefault();
    stopMomentum();
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      cameraX += event.deltaX / scale;
    } else {
      scrollUp -= event.deltaY / scale;
    }
    clampCamera();
    updateActiveBuilding();
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  const resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(canvas);
  resize();

  return {
    redraw,
    addBuilding,
    notifyFloorAdded,
    scrollActiveToTop: () => {
      const activeFloors = buildings[activeBuildingIndex]?.length ?? 0;
      scrollUp = GROUND_H - contentViewportH() + activeFloors * FLOOR_H;
      clampCamera();
    },
    scrollActiveToBottom: () => {
      scrollUp = 0;
    },
    getActiveBuildingIndex: () => activeBuildingIndex,
  };
}
