import type { Floor } from "../../gameState";
import { COLOR } from "../../palette";
import { drawArrowIcon } from "../../shared/arrowIcon";
import { STAR_Y, STAR_BOTTOM_Y, getStarRightX } from "../star";
import {
  getBounceWiggleTransform,
  BOUNCE_WIGGLE_PERIOD_MS,
} from "../../shared/bounceWiggle";

// green up-arrow icon right after the "Lvl N" star indicator (see floors/star)
// that opens this floor's own per-floor purchase dialog (hire worker / office
// chairs / office supplies / manager — hud/floorUpgradeMenu). Same bare icon
// (no button/circle behind it) as the city map's own prev/next arrows — see
// shared/arrowIcon. Only drawn/hit-testable once a floor is unlocked, since
// there's nothing to buy for one that isn't yet
const GAP_AFTER_STAR = 8;
const ICON_SIZE = 52; // matches the map arrows' own on-screen size
const HIT_RADIUS = 40; // a bit more generous than the icon itself, for tapping

// tracks the star label's own right edge (varies with floor.upgradeCount's
// digit count), so the arrow keeps the same fixed gap as the number grows
function getIconCenter(floor: Floor): { x: number; y: number } {
  return {
    x: getStarRightX(floor) + GAP_AFTER_STAR + ICON_SIZE / 2,
    y: STAR_Y + (STAR_BOTTOM_Y - STAR_Y) / 2,
  };
}

// floor-local center of the icon, e.g. for aiming a future coin-burst at it
export function getUpgradeArrowCenter(floor: Floor): { x: number; y: number } {
  return getIconCenter(floor);
}

export function hitTestUpgradeArrow(
  x: number,
  y: number,
  floor: Floor,
): boolean {
  if (!floor.unlocked) return false;
  const center = getIconCenter(floor);
  return Math.hypot(x - center.x, y - center.y) <= HIT_RADIUS;
}

export function drawUpgradeArrow(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
  affordable: boolean,
): void {
  if (!floor.unlocked) return;
  const center = getIconCenter(floor);

  if (!affordable) {
    drawArrowIcon(ctx, center.x, center.y, ICON_SIZE, COLOR.disabledGray);
    return;
  }

  // same up/down bounce+squash-stretch every other "buyable, come tap me"
  // canvas indicator plays (see shared/bounceWiggle) — draws attention to the
  // arrow only while it actually has something worth buying behind it
  const phase =
    (Date.now() % BOUNCE_WIGGLE_PERIOD_MS) / BOUNCE_WIGGLE_PERIOD_MS;
  const { translateY, scaleX, scaleY } = getBounceWiggleTransform(phase);
  ctx.save();
  ctx.translate(center.x, center.y + translateY);
  ctx.scale(scaleX, scaleY);
  drawArrowIcon(ctx, 0, 0, ICON_SIZE, COLOR.moneyGreen);
  ctx.restore();
}
