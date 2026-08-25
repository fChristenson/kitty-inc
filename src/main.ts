import "./style.css";
import { FLOOR_W, loadFloorBackground } from "./floors";
import { loadFurnitureSprites } from "./sprites";
import {
  createTestButtonMarkup,
  wireTestButton,
  wireResetButton,
  addFloor,
} from "./testButton";
import { startIncomeTicker } from "./incomePanel";
import { startTotalIncomeTicker, addTotalIncome } from "./totalIncome";
import { HUD_H } from "./hud";
import {
  saveFloors,
  schedulePersist,
  loadFloors,
  computeIdleIncome,
  type Floor,
} from "./gameState";
import { ensureLockedFloorAbove } from "./floorLock";
import { createActionBarMarkup, wireActionBar } from "./actionBar";
import { createWorkerMenuMarkup, wireWorkerMenu } from "./workerMenu";
import { createBoostMenuMarkup, wireBoostMenu } from "./boostMenu";
import { createBadgesMarkup, wireBadgesMenu } from "./badges";
import { createPopupMarkup, showIdlePopup } from "./popup";
import { createGameRenderer } from "./gameRenderer";
import { createFloorInteractions } from "./floorInteractions";

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

  function persist() {
    // debounced/idle-scheduled so a click mid-scroll doesn't synchronously serialize
    // the whole floors array + hit localStorage on the same frame (see gameState.ts)
    schedulePersist(floors);
  }

  const renderer = createGameRenderer({
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
    getHoveredFloor: () => hoveredFloor,
  });

  const { mountFloor } = createFloorInteractions({
    floorsEl,
    floors,
    floorCanvases,
    furnitureSprites,
    persist,
    renderer,
    setHoveredFloor: (floor) => {
      hoveredFloor = floor;
    },
    getHoveredFloor: () => hoveredFloor,
  });

  wireTestButton(app, () => {
    addTotalIncome(1e14);
    renderer.redrawAll();
  });
  wireResetButton(app, floors);
  const workerMenu = wireWorkerMenu(
    app,
    () => floors,
    () => {
      persist();
      renderer.redrawAll();
    },
  );
  const boostMenu = wireBoostMenu(
    app,
    () => floors,
    () => {
      persist();
      renderer.redrawAll();
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
  // saveFloors directly (not the debounced persist()): computeIdleIncome advances each
  // floor's lastCollectedAt in memory, and that must land before a second quick reload
  // could otherwise re-collect the same already-paid-out idle time
  saveFloors(floors);
  if (idleIncome > 0) {
    showIdlePopup(app, idleIncome, () => addTotalIncome(idleIncome));
  }

  renderer.redrawAll();
  scrollEl.scrollTop = scrollEl.scrollHeight; // land on the ground floor

  startIncomeTicker(renderer.redrawAll);
  startTotalIncomeTicker(floors);

  // collectDueIncome keeps each floor's lastCollectedAt caught up to "now" as it pays out
  // live, but that only updates the in-memory floors[] — without this, passive play (no
  // worker/upgrade/hire clicks to trigger persist()) would never save it, so a refresh
  // would see a stale lastCollectedAt and re-pay the whole live session as "idle" income.
  // uses saveFloors directly (not the debounced persist()) since a pending idle callback
  // isn't guaranteed to fire before the page actually unloads
  window.addEventListener("beforeunload", () => saveFloors(floors));
}

main();
