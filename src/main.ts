import "./style.css";
import {
  FLOOR_W,
  FLOOR_H,
  loadFloorBackground,
  drawFloor,
} from "./uiElements/floors";
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
} from "./uiElements/worker";
import {
  startTotalIncomeTicker,
  getTotalIncome,
  spendTotalIncome,
} from "./uiElements/totalIncome";
import { drawHud, HUD_H } from "./uiElements/hud";
import {
  saveFloors,
  loadFloors,
  isBoosted,
  toggleBoosted,
  type Floor,
} from "./gameState";
import { computeViewport } from "./computeViewport";
import {
  drawUpgradeButton,
  hitTestUpgradeButton,
  getButtonCenter,
} from "./uiElements/upgradeButton";
import { spawnCoinBurst, hasActiveCoins, drawCoins } from "./animations/coins";
import {
  spawnFloatingCoins,
  hasActiveFloatingCoins,
  drawFloatingCoins,
} from "./animations/coinFloat";
import {
  drawFloorLock,
  hitTestFloorLock,
  unlockFloor,
  ensureLockedFloorAbove,
} from "./uiElements/floorLock";

async function main() {
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) throw new Error("#app not found");

  app.innerHTML = `
    <div class="game">
      <header class="game__header">
        <h1>Skyscraper Clicker</h1>
      </header>
      <div class="game__scroll" id="scroll">
        <canvas class="game__hud" id="hud"></canvas>
        <div class="game__spacer" id="spacer">
          <canvas id="building"></canvas>
        </div>
      </div>
      ${createTestButtonMarkup()}
    </div>
  `;

  const canvas = app.querySelector<HTMLCanvasElement>("#building")!;
  const ctx = canvas.getContext("2d")!;
  const hudCanvas = app.querySelector<HTMLCanvasElement>("#hud")!;
  const hudCtx = hudCanvas.getContext("2d")!;
  hudCanvas.width = FLOOR_W;
  hudCanvas.height = HUD_H;
  const scrollEl = app.querySelector<HTMLDivElement>("#scroll")!;
  const spacerEl = app.querySelector<HTMLDivElement>("#spacer")!;

  const [bgImage, furnitureSprites] = await Promise.all([
    loadFloorBackground(),
    loadFurnitureSprites(),
  ]);

  const floors: Floor[] = [];
  let hoveredRow: number | null = null;
  // the floor row + sub-row pixel offset the canvas is currently scrolled to, so
  // hit-testing and coin-burst placement can convert canvas-local <-> building coords
  let viewFirstRow = 0;
  let viewOffsetY = 0;
  const lastFloatSpawn = new WeakMap<Floor, number>();
  const FLOAT_SPAWN_INTERVAL_MS = 300;

  function persist() {
    saveFloors(floors);
  }

  // keeps coinFloat.ts's bubbles going for as long as the floor's worker is boosted,
  // spawning a fresh small batch periodically instead of one that fades and stops
  function maybeSpawnFloatingCoins(floor: Floor, offsetY: number) {
    if (!isBoosted(floor)) return;
    const now = performance.now();
    const last = lastFloatSpawn.get(floor) ?? 0;
    if (now - last < FLOAT_SPAWN_INTERVAL_MS) return;
    lastFloatSpawn.set(floor, now);
    const center = getWorkerCenter(floor, offsetY);
    if (center) spawnFloatingCoins(center.x, center.y, redraw);
  }

  function render() {
    const spacerWidthCss =
      spacerEl.clientWidth || canvas.getBoundingClientRect().width;
    const viewport = computeViewport(scrollEl, spacerWidthCss, floors.length);
    spacerEl.style.height = `${viewport.spacerHeightCss}px`;
    viewFirstRow = viewport.firstRow;
    viewOffsetY = viewport.offsetY;

    const targetHeight = viewport.rows * FLOOR_H;
    // only touch canvas.width/height when the size actually changes: resetting it
    // every frame (this runs ~60x/s from the coin and income tickers) forces a
    // layout reflow of the scroll container each time, which reads as a jiggle.
    // the canvas is a small fixed-size "viewport window" that never grows with the
    // total floor count, which is what keeps redraw cost constant for endless scroll
    if (canvas.width !== FLOOR_W || canvas.height !== targetHeight) {
      canvas.width = FLOOR_W;
      canvas.height = targetHeight;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < viewport.rows; i++) {
      const r = viewport.firstRow + i;
      if (r < 0 || r >= floors.length) continue;
      const floor = floors[floors.length - 1 - r];
      const offsetY = i * FLOOR_H - viewport.offsetY;
      drawFloor(ctx, bgImage, floor, offsetY);
      drawWorker(ctx, floor, offsetY, performance.now());
      maybeSpawnFloatingCoins(floor, offsetY);
      drawFloorNumber(ctx, floors.length - r, floors.length, offsetY);
      drawUpgradeStar(ctx, floor, offsetY);
      drawIncomePanel(ctx, floor, offsetY);
      drawUpgradeButton(
        ctx,
        offsetY,
        r === hoveredRow,
        floor.upgradeCost,
        getTotalIncome() >= floor.upgradeCost,
      );
      drawFloorLock(ctx, floor, offsetY);
    }
  }

  function renderHud() {
    hudCtx.clearRect(0, 0, hudCanvas.width, hudCanvas.height);
    drawHud(hudCtx, hudCanvas.width, getTotalIncome());
  }

  function redraw() {
    render();
    renderHud();
    if (hasActiveCoins()) drawCoins(ctx);
    if (hasActiveFloatingCoins()) drawFloatingCoins(ctx);
    // re-pin to the ground floor if anything shifted the layout (header growing,
    // spacer settling, window resize) and the user hasn't manually scrolled away
    if (
      pinnedToGroundFloor &&
      scrollEl.scrollTop !== scrollEl.scrollHeight - scrollEl.clientHeight
    ) {
      scrollEl.scrollTop = scrollEl.scrollHeight;
    }
  }

  // map a page-space pointer event to a y coordinate in the full building's virtual
  // coordinate space (canvas-local y plus however far the viewport has scrolled)
  function toCanvasPoint(event: MouseEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const localY = (event.clientY - rect.top) * scaleY;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: localY + viewFirstRow * FLOOR_H + viewOffsetY,
    };
  }

  canvas.addEventListener("mousemove", (event) => {
    const { x, y } = toCanvasPoint(event);
    const row = hitTestUpgradeButton(x, y, floors.length);
    const activeRow =
      row !== null &&
      floors[floors.length - 1 - row].unlocked &&
      getTotalIncome() >= floors[floors.length - 1 - row].upgradeCost
        ? row
        : null;
    const onLockPanel = hitTestFloorLock(x, y, floors) !== null;
    const onWorker = hitTestWorker(x, y, floors) !== null;
    canvas.style.cursor =
      activeRow !== null || onLockPanel || onWorker ? "pointer" : "default";
    if (activeRow !== hoveredRow) {
      hoveredRow = activeRow;
      redraw();
    }
  });

  canvas.addEventListener("mouseleave", () => {
    if (hoveredRow !== null) {
      hoveredRow = null;
      redraw();
    }
  });

  // recompute which floors are visible as the user scrolls, throttled to one redraw per frame.
  // also tracks whether the user is intentionally scrolled away from the ground floor, so
  // layout shifts (header growing, spacer settling) don't yank their view back down
  let pinnedToGroundFloor = true;
  let scrollRedrawQueued = false;
  scrollEl.addEventListener("scroll", () => {
    pinnedToGroundFloor =
      scrollEl.scrollTop >= scrollEl.scrollHeight - scrollEl.clientHeight - 1;
    if (scrollRedrawQueued) return;
    scrollRedrawQueued = true;
    requestAnimationFrame(() => {
      scrollRedrawQueued = false;
      redraw();
    });
  });

  // any size change (spacer growing with new floors, header growing as the total income
  // counter gains digits, window resize, initial layout settling) re-pins to the ground
  // floor as long as the user hasn't manually scrolled away from it — handled inside
  // redraw() itself so it self-corrects every frame the app's tickers are already running

  canvas.addEventListener("click", (event) => {
    const { x, y } = toCanvasPoint(event);

    const lockRow = hitTestFloorLock(x, y, floors);
    if (lockRow !== null) {
      const floor = floors[floors.length - 1 - lockRow];
      if (spendTotalIncome(floor.unlockCost)) {
        unlockFloor(floor);
        ensureLockedFloorAbove({
          floors,
          sprites: furnitureSprites,
          scrollEl,
          onChange: redraw,
        });
        persist();
        redraw();
      }
      return;
    }

    // the upgrade button takes priority over the worker: the worker's walking path
    // can overlap the button's area, and a click there should always mean "buy upgrade"
    const row = hitTestUpgradeButton(x, y, floors.length);
    if (row !== null) {
      const floor = floors[floors.length - 1 - row];
      if (floor.unlocked && spendTotalIncome(floor.upgradeCost)) {
        increaseIncomeRate(floor);
        persist();
        // convert the button's absolute row back to where it's actually drawn on-screen right now
        const localOffsetY = (row - viewFirstRow) * FLOOR_H - viewOffsetY;
        const { x: cx, y: cy } = getButtonCenter(localOffsetY);
        spawnCoinBurst(cx, cy, redraw);
      }
      return;
    }

    const workerRow = hitTestWorker(x, y, floors);
    if (workerRow !== null) {
      const floor = floors[floors.length - 1 - workerRow];
      if (clickWorker(floor, performance.now())) {
        const localOffsetY = (workerRow - viewFirstRow) * FLOOR_H - viewOffsetY;
        const center = getWorkerCenter(floor, localOffsetY);
        if (center) {
          spawnCoinBurst(center.x, center.y, redraw);
          // start the float right away rather than waiting for the burst/toggle,
          // and sync the periodic re-spawn timer so it doesn't immediately double up
          spawnFloatingCoins(center.x, center.y, redraw);
          lastFloatSpawn.set(floor, performance.now());
        }
        // flip the boosted state only once the burst has fully played out, not immediately
        const waitForBurstToEnd = () => {
          if (hasActiveCoins()) {
            requestAnimationFrame(waitForBurstToEnd);
            return;
          }
          toggleBoosted(floor);
          persist();
          redraw();
        };
        requestAnimationFrame(waitForBurstToEnd);
      }
    }
  });

  wireTestButton(app, () => {
    addFloor({
      floors,
      sprites: furnitureSprites,
      scrollEl,
      onChange: redraw,
    });
    persist();
  });
  wireResetButton(app);

  const restored = loadFloors(furnitureSprites);
  if (restored.length > 0) {
    floors.push(...restored);
  } else {
    addFloor({
      floors,
      sprites: furnitureSprites,
      scrollEl,
      onChange: redraw,
    }); // ground floor
    persist();
  }
  ensureLockedFloorAbove({
    floors,
    sprites: furnitureSprites,
    scrollEl,
    onChange: redraw,
  });
  persist();

  redraw();
  scrollEl.scrollTop = scrollEl.scrollHeight; // land on floor 1; ResizeObserver keeps it pinned there

  startIncomeTicker(redraw);
  startTotalIncomeTicker(floors);
}

main();
