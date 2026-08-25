import "./style.css";
import {
  FLOOR_W,
  FLOOR_H,
  loadFloorBackground,
  drawFloor,
} from "./uiElements/floors";
import { drawOuterWall } from "./uiElements/outerWall";
import { loadFurnitureSprites } from "./sprites/furnitureSprites";
import {
  createTestButtonMarkup,
  wireTestButton,
  wireResetButton,
  addFloor,
} from "./uiElements/testButton";
import {
  drawIncomePanel,
  increaseIncomeRate,
  startIncomeTicker,
} from "./uiElements/incomePanel";
import { drawFloorNumber } from "./uiElements/floorNumber";
import { drawUpgradeStar } from "./uiElements/star";
import {
  drawWorker,
  hitTestWorker,
  clickWorker,
  getWorkerCenter,
  getBoostedWorkerCenters,
} from "./uiElements/worker";
import {
  startTotalIncomeTicker,
  getTotalIncome,
  spendTotalIncome,
  addTotalIncome,
} from "./uiElements/totalIncome";
import { drawHud, HUD_H } from "./uiElements/hud";
import {
  saveFloors,
  loadFloors,
  activateBoosted,
  computeIdleIncome,
  type Floor,
} from "./gameState";
import {
  drawUpgradeButton,
  hitTestUpgradeButton,
  getButtonCenter,
} from "./uiElements/upgradeButton";
import { spawnCoinBurst, drawCoins } from "./animations/coins";
import { spawnFloatingCoins, drawFloatingCoins } from "./animations/coinFloat";
import { drawClouds } from "./uiElements/clouds";
import {
  drawFloorLock,
  hitTestFloorLock,
  unlockFloor,
  ensureLockedFloorAbove,
} from "./uiElements/floorLock";
import { createActionBarMarkup, wireActionBar } from "./uiElements/actionBar";
import {
  createWorkerMenuMarkup,
  wireWorkerMenu,
} from "./uiElements/workerMenu";
import { createBoostMenuMarkup, wireBoostMenu } from "./uiElements/boostMenu";
import { createBadgesMarkup, wireBadgesMenu } from "./uiElements/badges";
import { createPopupMarkup, showIdlePopup } from "./uiElements/popup";

async function main() {
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) throw new Error("#app not found");

  app.innerHTML = `
    <div class="game">
      <header class="game__header">
        <h1>Skyscraper Clicker</h1>
      </header>
      <div class="game__scroll" id="scroll">
        <canvas class="game__clouds" id="clouds"></canvas>
        <canvas class="game__hud" id="hud"></canvas>
        <div class="game__floors" id="floors"></div>
      </div>
      ${createTestButtonMarkup()}
    </div>
    <canvas class="game__coin-overlay" id="coin-overlay"></canvas>
    ${createActionBarMarkup()}
    ${createWorkerMenuMarkup()}
    ${createBoostMenuMarkup()}
    ${createBadgesMarkup()}
    ${createPopupMarkup()}
  `;

  const hudCanvas = app.querySelector<HTMLCanvasElement>("#hud")!;
  const hudCtx = hudCanvas.getContext("2d")!;
  hudCanvas.width = FLOOR_W;
  hudCanvas.height = HUD_H;
  const cloudsCanvas = app.querySelector<HTMLCanvasElement>("#clouds")!;
  const cloudsCtx = cloudsCanvas.getContext("2d")!;
  cloudsCanvas.width = 960;
  cloudsCanvas.height = 280;
  const scrollEl = app.querySelector<HTMLDivElement>("#scroll")!;
  const floorsEl = app.querySelector<HTMLDivElement>("#floors")!;
  const coinOverlayCanvas =
    app.querySelector<HTMLCanvasElement>("#coin-overlay")!;
  const coinOverlayCtx = coinOverlayCanvas.getContext("2d")!;

  // keeps the overlay canvas's CSS box exactly matching the scroll viewport, so
  // floor-local coin-burst coordinates can be mapped straight into it
  function syncCoinOverlayBounds() {
    const rect = scrollEl.getBoundingClientRect();
    coinOverlayCanvas.style.left = `${rect.left}px`;
    coinOverlayCanvas.style.top = `${rect.top}px`;
    coinOverlayCanvas.style.width = `${rect.width}px`;
    coinOverlayCanvas.style.height = `${rect.height}px`;
    const dpr = window.devicePixelRatio || 1;
    coinOverlayCanvas.width = rect.width * dpr;
    coinOverlayCanvas.height = rect.height * dpr;
    coinOverlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  syncCoinOverlayBounds();
  window.addEventListener("resize", syncCoinOverlayBounds);

  const [bgImage, furnitureSprites] = await Promise.all([
    loadFloorBackground(),
    loadFurnitureSprites(),
  ]);

  const floors: Floor[] = [];
  // every floor is a real, fixed-size (FLOOR_W x FLOOR_H) DOM canvas — one draw
  // target per floor, positioned by normal document flow. No shared canvas, no
  // manual spacer/offset math: the browser's own scrolling does all the work.
  const floorCanvases = new WeakMap<Floor, HTMLCanvasElement>();
  let hoveredFloor: Floor | null = null;
  const lastFloatSpawn = new WeakMap<Floor, number>();
  const FLOAT_SPAWN_INTERVAL_MS = 300;

  function persist() {
    saveFloors(floors);
  }

  // keeps coinFloat.ts's bubbles going for as long as a floor's worker is individually
  // boosted, spawning a fresh small batch periodically instead of one that fades and
  // stops — only at the workers actually boosted, not every worker on the floor
  function maybeSpawnFloatingCoins(floor: Floor) {
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
  function drawFloorCanvas(floor: Floor, canvas: HTMLCanvasElement) {
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
      floor === hoveredFloor,
      floor.upgradeCost,
      getTotalIncome() >= floor.upgradeCost,
    );
    drawFloorLock(ctx, floor);
  }

  function redrawFloor(floor: Floor) {
    const canvas = floorCanvases.get(floor);
    if (canvas) drawFloorCanvas(floor, canvas);
  }

  // a floor is only actually redrawn every frame while it's in or near the visible
  // viewport (one viewport-height of buffer above/below) — far-off floors are skipped
  function isNearViewport(canvas: HTMLCanvasElement): boolean {
    const scrollRect = scrollEl.getBoundingClientRect();
    const rect = canvas.getBoundingClientRect();
    const buffer = scrollRect.height;
    return (
      rect.bottom >= scrollRect.top - buffer &&
      rect.top <= scrollRect.bottom + buffer
    );
  }

  function renderHud() {
    hudCtx.clearRect(0, 0, hudCanvas.width, hudCanvas.height);
    drawHud(hudCtx, hudCanvas.width, getTotalIncome());
  }

  function renderClouds() {
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

  function renderCoinOverlay() {
    const dpr = window.devicePixelRatio || 1;
    coinOverlayCtx.clearRect(
      0,
      0,
      coinOverlayCanvas.width / dpr,
      coinOverlayCanvas.height / dpr,
    );
    drawCoins(coinOverlayCtx, getFloorRect);
  }

  function redrawAll() {
    renderHud();
    renderClouds();
    renderCoinOverlay();
    for (const floor of floors) {
      const canvas = floorCanvases.get(floor);
      if (canvas && isNearViewport(canvas)) drawFloorCanvas(floor, canvas);
    }
  }

  // converts a mouse event to floor-local canvas coordinates (0..FLOOR_W, 0..FLOOR_H)
  function localPoint(
    canvas: HTMLCanvasElement,
    event: MouseEvent,
  ): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * FLOOR_W,
      y: ((event.clientY - rect.top) / rect.height) * FLOOR_H,
    };
  }

  // creates, wires, and inserts one floor's canvas; "prepend" for a newly-added
  // (higher) floor so it appears above everything else, "append" for restoring
  // floors in already-topmost-first order
  function mountFloor(floor: Floor, position: "prepend" | "append"): void {
    const canvas = document.createElement("canvas");
    canvas.width = FLOOR_W;
    canvas.height = FLOOR_H;
    floorCanvases.set(floor, canvas);

    canvas.addEventListener("mousemove", (event) => {
      const { x, y } = localPoint(canvas, event);
      const onButton =
        hitTestUpgradeButton(x, y) &&
        floor.unlocked &&
        getTotalIncome() >= floor.upgradeCost;
      const onLock = hitTestFloorLock(x, y, floor);
      const onWorker = hitTestWorker(x, y, floor) !== null;
      canvas.style.cursor =
        onButton || onLock || onWorker ? "pointer" : "default";
      const wasHovered = hoveredFloor === floor;
      if (onButton && !wasHovered) {
        hoveredFloor = floor;
        redrawFloor(floor);
      } else if (!onButton && wasHovered) {
        hoveredFloor = null;
        redrawFloor(floor);
      }
    });

    canvas.addEventListener("mouseleave", () => {
      if (hoveredFloor === floor) {
        hoveredFloor = null;
        redrawFloor(floor);
      }
    });

    canvas.addEventListener("click", (event) => {
      const { x, y } = localPoint(canvas, event);

      if (hitTestFloorLock(x, y, floor)) {
        if (spendTotalIncome(floor.unlockCost)) {
          unlockFloor(floor);
          ensureLockedFloorAbove({
            floors,
            sprites: furnitureSprites,
            onAdd: (newFloor) => {
              mountFloor(newFloor, "prepend");
              redrawFloor(newFloor);
            },
          });
          persist();
          redrawFloor(floor);
        }
        return;
      }

      if (
        hitTestUpgradeButton(x, y) &&
        floor.unlocked &&
        spendTotalIncome(floor.upgradeCost)
      ) {
        increaseIncomeRate(floor);
        persist();
        const center = getButtonCenter();
        spawnCoinBurst(floor, center.x, center.y, () => {
          redrawFloor(floor);
          renderCoinOverlay();
        });
        return;
      }

      const workerIndex = hitTestWorker(x, y, floor);
      if (
        workerIndex !== null &&
        clickWorker(floor, workerIndex, performance.now())
      ) {
        const center = getWorkerCenter(floor, workerIndex);
        if (center) {
          spawnCoinBurst(floor, center.x, center.y, () => {
            redrawFloor(floor);
            renderCoinOverlay();
          });
          // start the float right away at just this worker, so the boost visibly
          // kicks in immediately instead of waiting for the next periodic tick
          spawnFloatingCoins(floor, center.x, center.y, () =>
            redrawFloor(floor),
          );
          lastFloatSpawn.set(floor, performance.now());
        }
        // clicking a worker only (re)activates that specific worker's boost/15s timer
        activateBoosted(floor, workerIndex, performance.now());
        persist();
        redrawFloor(floor);
      }
    });

    if (position === "prepend") floorsEl.prepend(canvas);
    else floorsEl.append(canvas);
  }

  wireTestButton(app, () => {
    addTotalIncome(1e14);
    redrawAll();
  });
  wireResetButton(app, floors);
  const workerMenu = wireWorkerMenu(
    app,
    () => floors,
    () => {
      persist();
      redrawAll();
    },
  );
  const boostMenu = wireBoostMenu(
    app,
    () => floors,
    () => {
      persist();
      redrawAll();
    },
  );
  // badges have no gameplay effect and persist themselves (buyNextBadge saves its own
  // localStorage key), so there's nothing else here that needs to persist/redraw
  const badgesMenu = wireBadgesMenu(app, () => {});
  wireActionBar(app, {
    onScrollTop: () => {
      scrollEl.scrollTop = 0;
    },
    onScrollBottom: () => {
      scrollEl.scrollTop = scrollEl.scrollHeight;
    },
    onBoostAll: () => {
      boostMenu.open();
    },
    onOpenHireMenu: () => {
      workerMenu.open();
    },
    onOpenBadges: () => {
      badgesMenu.open();
    },
  });

  const restored = loadFloors(furnitureSprites);
  if (restored.length > 0) {
    floors.push(...restored);
    // floors[] is ground-first; mount newest-first so DOM order (and thus the visual
    // top-to-bottom stack) puts the newest/highest floor at the top, ground at the bottom
    for (let i = floors.length - 1; i >= 0; i--) {
      mountFloor(floors[i], "append");
    }
  } else {
    addFloor({
      floors,
      sprites: furnitureSprites,
      onAdd: (floor) => mountFloor(floor, "append"),
    }); // ground floor
    persist();
  }
  ensureLockedFloorAbove({
    floors,
    sprites: furnitureSprites,
    onAdd: (floor) => mountFloor(floor, "prepend"),
  });
  persist();

  // stays the last (bottom-most) child forever — every later floor only ever gets
  // prepended above it, so this always remains below the ground floor
  const groundEl = document.createElement("div");
  groundEl.className = "game__ground";
  floorsEl.append(groundEl);

  const idleIncome = computeIdleIncome(floors);
  persist(); // computeIdleIncome advances each floor's lastCollectedAt in memory; save it
  // now so a second quick reload can't re-collect the same already-paid-out idle time
  if (idleIncome > 0) {
    showIdlePopup(app, idleIncome, () => addTotalIncome(idleIncome));
  }

  redrawAll();
  scrollEl.scrollTop = scrollEl.scrollHeight; // land on the ground floor

  startIncomeTicker(redrawAll);
  startTotalIncomeTicker(floors);

  // collectDueIncome keeps each floor's lastCollectedAt caught up to "now" as it pays out
  // live, but that only updates the in-memory floors[] — without this, passive play (no
  // worker/upgrade/hire clicks to trigger persist()) would never save it, so a refresh
  // would see a stale lastCollectedAt and re-pay the whole live session as "idle" income
  window.addEventListener("beforeunload", persist);
}

main();
