import {
  drawFloor,
  drawWorker,
  getBoostedWorkerCenters,
  drawUpgradeStar,
  drawIncomePanel,
  drawUpgradeButton,
  drawFloorLock,
  spawnFloatingCoins,
  drawFloatingCoins,
  drawIncomeFloatText,
} from "../floors";
import { drawOuterWall } from "../buildings";
import { drawMouse } from "../mouse";
import { getTotalIncome } from "../totalIncome";
import { gte } from "../shared/bigNumber";
import type { Floor } from "../gameState";

// only re-spawns a floor's boosted-worker float coins this often, instead of every
// single frame, so the bubbles read as a steady trickle rather than one dense burst
const FLOAT_SPAWN_INTERVAL_MS = 300;

const lastFloatSpawn = new WeakMap<Floor, number>();

// keeps coinFloat.ts's bubbles going for as long as a floor's worker is individually
// boosted, spawning a fresh small batch periodically instead of one that fades and
// stops — only at the workers actually boosted, not every worker on the floor
function maybeSpawnFloatingCoins(floor: Floor, now: number): void {
  const centers = getBoostedWorkerCenters(floor, now);
  if (centers.length === 0) return;
  const last = lastFloatSpawn.get(floor) ?? 0;
  if (now - last < FLOAT_SPAWN_INTERVAL_MS) return;
  lastFloatSpawn.set(floor, now);
  for (const center of centers) {
    // gameCanvas.ts redraws every frame regardless, so floating coins don't need to
    // force an extra redraw themselves the way the old per-floor-canvas version did
    spawnFloatingCoins(
      floor,
      center.x,
      center.y,
      () => {},
      center.blinkIntensity,
    );
  }
}

// draws one floor's full content (background, worker, HUD widgets, lock overlay) into
// whatever ctx is given, assuming it's already translated so this floor's own
// top-left sits at (0, 0) — gameCanvas.ts owns figuring out where that is on screen
export function drawFloorContent(
  ctx: CanvasRenderingContext2D,
  deps: {
    backgrounds: HTMLImageElement[];
    floor: Floor;
    floorNumber: number;
    buttonHovered: boolean; // cursor is specifically over this floor's upgrade button
  },
): void {
  const { backgrounds, floor, floorNumber, buttonHovered } = deps;
  // Date.now()-based (not performance.now()) so drawWorker/maybeSpawnFloatingCoins's
  // boost checks match incomePanel.ts's persisted, Date.now()-based boost timestamps
  const now = Date.now();
  const isGroundFloor = floorNumber === 1;
  drawFloor(ctx, backgrounds[floor.bgIndex] ?? backgrounds[0], floor);
  drawOuterWall(ctx);
  drawWorker(ctx, floor, now);
  drawMouse(ctx, floor, now);
  maybeSpawnFloatingCoins(floor, now);
  drawFloatingCoins(ctx, floor);
  drawUpgradeStar(ctx, floor);
  drawIncomePanel(ctx, floor, isGroundFloor);
  drawUpgradeButton(
    ctx,
    floor,
    buttonHovered,
    floor.upgradeCost,
    gte(getTotalIncome(), floor.upgradeCost),
    isGroundFloor,
  );
  drawIncomeFloatText(ctx, floor);
  drawFloorLock(ctx, floor, gte(getTotalIncome(), floor.unlockCost));
}
