import {
  drawFloor,
  drawDiscoFloor,
  drawWorker,
  drawWorkerBoosts,
  tickWorkerOffscreen,
  drawUpgradeStar,
  drawUpgradeArrow,
  drawIncomePanel,
  drawUpgradeButton,
  drawFloorLock,
  drawIncomeFloatText,
} from "../floors";
import { drawOuterWall } from "../buildings";
import { drawMouse } from "../mouse";
import { getTotalIncome } from "../totalIncome";
import { hasAffordableFloorUpgrade } from "../hud";
import { gte } from "../shared/bigNumber";
import type { Floor } from "../gameState";

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
  // Date.now()-based (not performance.now()) so drawWorker/drawWorkerBoosts's
  // boost checks match incomePanel.ts's persisted, Date.now()-based boost timestamps
  const now = Date.now();
  const isGroundFloor = floorNumber === 1;
  drawFloor(ctx, backgrounds[floor.bgIndex] ?? backgrounds[0], floor);
  drawDiscoFloor(ctx, floor, now);
  drawOuterWall(ctx);
  drawWorker(ctx, floor, now);
  drawMouse(ctx, floor, now);
  drawWorkerBoosts(ctx, floor, now);
  drawUpgradeStar(ctx, floor);
  drawUpgradeArrow(ctx, floor, hasAffordableFloorUpgrade(floor));
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
  drawFloorLock(
    ctx,
    floor,
    floor.unlockCost,
    gte(getTotalIncome(), floor.unlockCost),
  );
}

// a floor kept "live" near the viewport but too far off it to draw: only the
// gameplay that normally rides on its draw (a manager's auto-boost) still runs
export function tickFloorOffscreen(floor: Floor): void {
  tickWorkerOffscreen(floor, Date.now());
}

// a floor just off screen: only its rising coin bubbles can reach the view
export function drawFloorBubbles(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
): void {
  tickFloorOffscreen(floor);
  drawWorkerBoosts(ctx, floor, Date.now());
}
