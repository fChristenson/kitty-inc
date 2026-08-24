import "./style.css";
import {
  FLOOR_W,
  FLOOR_H,
  loadFloorBackground,
  drawFloor,
  type Floor,
} from "./floors";
import { loadFurnitureSprites } from "./sprites";
import { createTestButtonMarkup, wireTestButton, addFloor } from "./testButton";
import {
  loadUpgradeButtonImage,
  drawUpgradeButton,
  hitTestUpgradeButton,
  getButtonCenter,
  spawnCoinBurst,
  hasActiveCoins,
  drawCoins,
} from "./upgradeButton";

async function main() {
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) throw new Error("#app not found");

  app.innerHTML = `
    <div class="game">
      <header class="game__header">
        <h1>Skyscraper Clicker</h1>
        <p class="game__floor-count">Floors: <span id="floor-count">0</span></p>
      </header>
      <div class="game__scroll" id="scroll">
        <canvas id="building"></canvas>
      </div>
      ${createTestButtonMarkup()}
    </div>
  `;

  const canvas = app.querySelector<HTMLCanvasElement>("#building")!;
  const ctx = canvas.getContext("2d")!;
  const scrollEl = app.querySelector<HTMLDivElement>("#scroll")!;
  const floorCountEl = app.querySelector<HTMLSpanElement>("#floor-count")!;

  const [bgImage, upgradeBtnImage, furnitureSprites] = await Promise.all([
    loadFloorBackground(),
    loadUpgradeButtonImage(),
    loadFurnitureSprites(),
  ]);

  const floors: Floor[] = [];
  let hoveredRow: number | null = null;

  function render() {
    canvas.width = FLOOR_W;
    canvas.height = Math.max(floors.length, 1) * FLOOR_H;
    for (let r = 0; r < floors.length; r++) {
      const floor = floors[floors.length - 1 - r];
      const offsetY = r * FLOOR_H;
      drawFloor(ctx, bgImage, floor, offsetY);
      drawUpgradeButton(ctx, upgradeBtnImage, offsetY, r === hoveredRow);
    }
  }

  function redraw() {
    render();
    if (hasActiveCoins()) drawCoins(ctx);
  }

  // map a page-space pointer event to canvas pixel coordinates
  function toCanvasPoint(event: MouseEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  canvas.addEventListener("mousemove", (event) => {
    const { x, y } = toCanvasPoint(event);
    const row = hitTestUpgradeButton(x, y, floors.length);
    canvas.style.cursor = row !== null ? "pointer" : "default";
    if (row !== hoveredRow) {
      hoveredRow = row;
      redraw();
    }
  });

  canvas.addEventListener("mouseleave", () => {
    if (hoveredRow !== null) {
      hoveredRow = null;
      redraw();
    }
  });

  canvas.addEventListener("click", (event) => {
    const { x, y } = toCanvasPoint(event);
    const row = hitTestUpgradeButton(x, y, floors.length);
    if (row === null) return;
    const level = floors.length - row;
    console.log(`Upgrade clicked on floor ${level}`);
    const { x: cx, y: cy } = getButtonCenter(row * FLOOR_H);
    spawnCoinBurst(cx, cy, redraw);
  });

  wireTestButton(app, () =>
    addFloor({
      floors,
      sprites: furnitureSprites,
      floorCountEl,
      scrollEl,
      onChange: redraw,
    }),
  );

  addFloor({
    floors,
    sprites: furnitureSprites,
    floorCountEl,
    scrollEl,
    onChange: redraw,
  }); // ground floor
}

main();
