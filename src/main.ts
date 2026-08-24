import "./style.css";
import {
  FLOOR_W,
  FLOOR_H,
  loadFloorBackground,
  drawFloor,
  type Floor,
} from "./floors";
import { loadFurnitureSprites } from "./sprites";
import {
  createTestButtonMarkup,
  wireTestButton,
  wireResetButton,
  addFloor,
} from "./testButton";
import {
  drawIncomePanel,
  increaseIncomeRate,
  startIncomeTicker,
} from "./incomePanel";
import { drawFloorNumber } from "./floorNumber";
import { drawUpgradeStar } from "./star";
import {
  startTotalIncomeTicker,
  getTotalIncome,
  spendTotalIncome,
} from "./totalIncome";
import { drawHud, HUD_H } from "./hud";
import { saveFloors, loadFloors, computeViewport } from "./gameState";
import {
  drawUpgradeButton,
  hitTestUpgradeButton,
  getButtonCenter,
  spawnCoinBurst,
  hasActiveCoins,
  drawCoins,
} from "./upgradeButton";
import {
  drawFloorLock,
  hitTestFloorLock,
  unlockFloor,
  ensureLockedFloorAbove,
} from "./floorLock";

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

  function persist() {
    saveFloors(floors);
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
    canvas.style.cursor =
      activeRow !== null || onLockPanel ? "pointer" : "default";
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

    const row = hitTestUpgradeButton(x, y, floors.length);
    if (row === null) return;
    const floor = floors[floors.length - 1 - row];
    if (!floor.unlocked) return;
    if (!spendTotalIncome(floor.upgradeCost)) return;
    increaseIncomeRate(floor);
    persist();
    // convert the button's absolute row back to where it's actually drawn on-screen right now
    const localOffsetY = (row - viewFirstRow) * FLOOR_H - viewOffsetY;
    const { x: cx, y: cy } = getButtonCenter(localOffsetY);
    spawnCoinBurst(cx, cy, redraw);
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
