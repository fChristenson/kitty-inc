import { FLOOR_W, FLOOR_H, drawFloor } from "../floors";
import { drawOuterWall } from "../outerWall";
import { drawWorker, getBoostedWorkerCenters } from "../worker";
import { drawFloorNumber } from "../floorNumber";
import { drawUpgradeStar } from "../star";
import { drawIncomePanel } from "../incomePanel";
import { drawUpgradeButton } from "../upgradeButton";
import { drawFloorLock } from "../floorLock";
import { drawCoins, hasActiveCoins } from "../coins";
import { spawnFloatingCoins, drawFloatingCoins } from "../coinFloat";
import { drawClouds } from "../clouds";
import { drawHud } from "../hud";
import { getTotalIncome } from "../totalIncome";
import type { Floor } from "../gameState";

// only re-spawns a floor's boosted-worker float coins this often, instead of every
// single frame, so the bubbles read as a steady trickle rather than one dense burst
const FLOAT_SPAWN_INTERVAL_MS = 300;

export interface GameRendererDeps {
  bgImage: HTMLImageElement;
  floors: Floor[];
  floorCanvases: WeakMap<Floor, HTMLCanvasElement>;
  scrollEl: HTMLElement;
  hudCanvas: HTMLCanvasElement;
  hudCtx: CanvasRenderingContext2D;
  cloudsCanvas: HTMLCanvasElement;
  cloudsCtx: CanvasRenderingContext2D;
  coinOverlayCanvas: HTMLCanvasElement;
  coinOverlayCtx: CanvasRenderingContext2D;
  getHoveredFloor: () => Floor | null;
}

export interface GameRenderer {
  redrawAll: () => void;
  redrawFloor: (floor: Floor) => void;
  renderCoinOverlay: () => void;
  // lets floorInteractions.ts suppress the periodic float-coin spawn right after it
  // manually spawns one itself for immediate click feedback
  markFloatSpawned: (floor: Floor, now: number) => void;
  // registers a newly-mounted floor canvas so redrawAll knows whether it's near the
  // viewport, without any per-frame layout reads (see visibleFloors below)
  observeFloor: (floor: Floor, canvas: HTMLCanvasElement) => void;
}

// owns every draw* call and the small pieces of per-floor animation-throttling state
// that only rendering cares about (lastFloatSpawn); main.ts just wires this up once
// and calls the handful of methods it returns.
export function createGameRenderer(deps: GameRendererDeps): GameRenderer {
  const {
    bgImage,
    floors,
    floorCanvases,
    scrollEl,
    hudCanvas,
    hudCtx,
    cloudsCanvas,
    cloudsCtx,
    coinOverlayCanvas,
    coinOverlayCtx,
    getHoveredFloor,
  } = deps;

  const lastFloatSpawn = new WeakMap<Floor, number>();

  function markFloatSpawned(floor: Floor, now: number): void {
    lastFloatSpawn.set(floor, now);
  }

  // which floors are currently in or near the visible viewport (one viewport-height of
  // buffer above/below, via rootMargin) — kept up to date by the browser's own
  // IntersectionObserver instead of calling getBoundingClientRect on every floor's
  // canvas every single frame, which got expensive as the building grew tall
  const visibleFloors = new Set<Floor>();
  const canvasToFloor = new WeakMap<HTMLCanvasElement, Floor>();
  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const floor = canvasToFloor.get(entry.target as HTMLCanvasElement);
        if (!floor) continue;
        if (entry.isIntersecting) visibleFloors.add(floor);
        else visibleFloors.delete(floor);
      }
    },
    { root: scrollEl, rootMargin: "100% 0px 100% 0px" },
  );

  function observeFloor(floor: Floor, canvas: HTMLCanvasElement): void {
    canvasToFloor.set(canvas, floor);
    visibilityObserver.observe(canvas);
  }

  // keeps coinFloat.ts's bubbles going for as long as a floor's worker is individually
  // boosted, spawning a fresh small batch periodically instead of one that fades and
  // stops — only at the workers actually boosted, not every worker on the floor
  function maybeSpawnFloatingCoins(floor: Floor): void {
    const now = performance.now();
    const centers = getBoostedWorkerCenters(floor, now);
    if (centers.length === 0) return;
    const last = lastFloatSpawn.get(floor) ?? 0;
    if (now - last < FLOAT_SPAWN_INTERVAL_MS) return;
    lastFloatSpawn.set(floor, now);
    for (const center of centers) {
      spawnFloatingCoins(floor, center.x, center.y, redrawAll);
    }
  }

  // draws everything for one floor into its own canvas
  function drawFloorCanvas(floor: Floor, canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, FLOOR_W, FLOOR_H);
    drawFloor(ctx, bgImage, floor);
    drawOuterWall(ctx);
    drawWorker(ctx, floor, performance.now());
    maybeSpawnFloatingCoins(floor);
    drawFloatingCoins(ctx, floor);
    const floorNumber = floors.indexOf(floor) + 1;
    drawFloorNumber(ctx, floorNumber, floors.length);
    drawUpgradeStar(ctx, floor);
    drawIncomePanel(ctx, floor);
    drawUpgradeButton(
      ctx,
      floor === getHoveredFloor(),
      floor.upgradeCost,
      getTotalIncome() >= floor.upgradeCost,
    );
    drawFloorLock(ctx, floor);
  }

  function redrawFloor(floor: Floor): void {
    const canvas = floorCanvases.get(floor);
    if (canvas) drawFloorCanvas(floor, canvas);
  }

  function renderHud(): void {
    hudCtx.clearRect(0, 0, hudCanvas.width, hudCanvas.height);
    drawHud(hudCtx, hudCanvas.width, getTotalIncome());
  }

  function renderClouds(): void {
    drawClouds(
      cloudsCtx,
      cloudsCanvas.width,
      cloudsCanvas.height,
      performance.now(),
    );
  }

  // a floor's current on-screen rect in the coin overlay's own CSS pixel space, or
  // null if that floor doesn't have a mounted canvas (shouldn't happen in practice)
  function getFloorRect(floor: Floor) {
    const canvas = floorCanvases.get(floor);
    if (!canvas) return null;
    const floorRect = canvas.getBoundingClientRect();
    const overlayRect = scrollEl.getBoundingClientRect();
    return {
      left: floorRect.left - overlayRect.left,
      top: floorRect.top - overlayRect.top,
      width: floorRect.width,
    };
  }

  function renderCoinOverlay(): void {
    // skip the clear + full drawCoins pass entirely when idle, instead of paying for a
    // full-viewport clearRect every single frame on the (very common) case of no bursts
    if (!hasActiveCoins()) return;
    const dpr = window.devicePixelRatio || 1;
    coinOverlayCtx.clearRect(
      0,
      0,
      coinOverlayCanvas.width / dpr,
      coinOverlayCanvas.height / dpr,
    );
    drawCoins(coinOverlayCtx, getFloorRect);
  }

  function redrawAll(): void {
    renderHud();
    renderClouds();
    renderCoinOverlay();
    for (const floor of visibleFloors) {
      const canvas = floorCanvases.get(floor);
      if (canvas) drawFloorCanvas(floor, canvas);
    }
  }

  return {
    redrawAll,
    redrawFloor,
    renderCoinOverlay,
    markFloatSpawned,
    observeFloor,
  };
}
