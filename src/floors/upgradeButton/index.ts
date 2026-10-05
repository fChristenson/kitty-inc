// Barrel for src/floors/upgradeButton/ — every sibling import (incomePanel.ts,
// floorLock.ts, critCelebration.ts, floorInteractions.ts, floors/index.ts's own
// facade, main.ts) keeps importing from "../upgradeButton"/"./upgradeButton"
// unchanged; only this directory's own internal layout changed.
//
// Layout:
//   shared.ts   — button geometry/hit-testing and press+hold animations. The
//                 "event crit" framework every event file below plugs into
//                 lives in src/shared/floorEvents.
//   crit.ts     — the base crit-TIER system (x5/x25/x125 rolls + every
//                 piggyback proc's dev-test force helper).
//   sale.ts / overtime.ts — one file per "event crit" (a temporary window
//                 that takes over the button's own color/label/wiggle while
//                 active). Adding a new one is just a new file in this same
//                 shape — see shared/floorEvents' own header comment
//                 for the exact recipe. Every OTHER piggyback proc (including
//                 Snowball/Frozen, both formerly event crits here) is a flat,
//                 not-button-appearance-changing proc with no file of its
//                 own in this folder — its state (if any beyond a plain
//                 landed/not-landed flag) lives in shared/critTypes instead.
//
// Import order below is also the event-button PRIORITY order (see
// shared/floorEvents' registerEventButton) for the rare case more than one is active on the same
// floor at once — boost/hunt/swarm come first because their click branches in
// floorInteractions run before sale/overtime; keep sale/overtime in this order unless
// deliberately reprioritizing.
import { drawCachedCartoonText, formatPrice } from "../../utils";
import {
  drawJellyButton,
  getJellyPose,
  prewarmJellyButton,
} from "../../shared/glossyWidgets";
import { runWhenIdle } from "../../shared/idle";
import { COLOR } from "../../palette";
import { getWiggleRotation } from "../../shared/wiggle";
import { drawSlamTarget, getSlamPose } from "../../shared/eventEndSlam";
import type { BigNumber } from "../../shared/bigNumber";
import { gte } from "../../shared/bigNumber";
import { getTotalIncome } from "../../totalIncome";
import { isFloorMaxed, type Floor } from "../../gameState";
import {
  BTN_W,
  BTN_H,
  BTN_X,
  getBtnY,
  getHoldHeat,
  peekHoldAnim,
  pressScale,
  resolveButtonFloor,
  stepHoldAnim,
} from "./shared";
import { getActiveEventButton } from "../../shared/floorEvents";
import { getCritTier, CRIT_TIER_CONFIG, type CritTier } from "./crit";
import { getClaimedEventCover } from "../eventProcs";
import { isSaleActive } from "./sale";
import { isOvertimeActive } from "./overtime";
import "./boost";
import "./hunt";
import "./swarm";
import "./union";
import "./sale";
import "./overtime";

export * from "./shared";
export * from "./crit";
export * from "./boost";
export * from "./hunt";
export * from "./swarm";
export * from "./union";
export * from "./sale";
export * from "./overtime";

// how hard the button and its bar boil: a long press, or a full boil all
// through a Sale or Overtime
// every color the button takes on outside a covering event's own
runWhenIdle(() =>
  prewarmJellyButton(BTN_W, BTN_H, 40, [
    COLOR.moneyGreen,
    COLOR.disabledGray,
    COLOR.amber,
    COLOR.cyan,
    COLOR.red,
    COLOR.purple,
    ...Object.values(CRIT_TIER_CONFIG).map((tier) => tier.color),
  ]),
);

export function getBoilHeat(floor: Floor, now: number): number {
  const source = resolveButtonFloor(floor);
  if (isSaleActive(source, now) || isOvertimeActive(source, now)) return 1;
  return getHoldHeat(source, now);
}

// the buttons a screen freeze's overlay redraws itself (see
// drawUpgradeButtonSpotlight), so the normal pass leaves them out
const spotlights = new Set<Floor>();

export function setUpgradeButtonSpotlights(floors: Floor[]): void {
  spotlights.clear();
  for (const floor of floors) spotlights.add(floor);
}

export function clearUpgradeButtonSpotlights(): void {
  spotlights.clear();
}

// the spotlighted button in its live state, washed whiteAlpha white
export function drawUpgradeButtonSpotlight(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
  isGroundFloor: boolean,
  whiteAlpha: number,
): void {
  renderUpgradeButton(
    ctx,
    floor,
    false,
    floor.upgradeCost,
    gte(getTotalIncome(), floor.upgradeCost),
    isGroundFloor,
    whiteAlpha,
  );
}

export function drawUpgradeButton(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
  hovered: boolean,
  cost: BigNumber,
  affordable: boolean,
  isGroundFloor: boolean,
): void {
  if (spotlights.has(floor)) return;
  renderUpgradeButton(ctx, floor, hovered, cost, affordable, isGroundFloor, 0);
}

function renderUpgradeButton(
  ctx: CanvasRenderingContext2D,
  own: Floor,
  hovered: boolean,
  ownCost: BigNumber,
  ownAffordable: boolean,
  isGroundFloor: boolean,
  whiteAlpha: number,
): void {
  // a mirrored button (see shared.ts's mirrorUpgradeButton) shows its source's state
  const floor = resolveButtonFloor(own);
  const mirrored = floor !== own;
  const now = Date.now();
  // the one event (if any) currently governing this floor's button
  // appearance — see shared.ts's own "event crit framework" comment
  const activeEvent = getActiveEventButton(floor, now);
  // at the level cap only an event's free clicks still play; any armed crit waits
  const maxed = !activeEvent && isFloorMaxed(floor);
  const cost = mirrored ? floor.upgradeCost : ownCost;
  const affordable =
    !maxed &&
    (mirrored ? gte(getTotalIncome(), floor.upgradeCost) : ownAffordable);
  const x = BTN_X;
  const y = getBtnY(isGroundFloor);
  const cx = x + BTN_W / 2;
  const cy = y + BTN_H / 2;
  const scale = pressScale(floor, now);
  const holdAnim = mirrored
    ? peekHoldAnim(floor, now)
    : stepHoldAnim(floor, now, cx, cy);
  const critTier = maxed ? null : getCritTier(floor);
  const crit = critTier !== null;
  // an event covering this crit (see floors/eventProcs) hides its tier
  const cover = crit ? getClaimedEventCover(floor) : null;
  const critMultiplier = crit
    ? CRIT_TIER_CONFIG[critTier as CritTier].multiplier
    : null;
  const slam = getSlamPose(own, "button", now);
  const box = { x, y, width: BTN_W, height: BTN_H };

  drawSlamTarget(ctx, slam, box, { radius: 40 }, drawBody, now);

  function drawBody(): void {
    const wiggle =
      (crit || activeEvent ? getWiggleRotation(now) : 0) + holdAnim.rotation;
    // a wiggling button (a crit, an event, a Sale) only rocks, like the Sale:
    // squashing it while it's rotated warps it
    const jelly =
      crit || activeEvent
        ? null
        : getJellyPose(own, now, getBoilHeat(floor, now), wiggle);
    ctx.save();
    ctx.translate(cx + holdAnim.shakeX, cy + holdAnim.shakeY);
    if (crit || activeEvent) {
      ctx.rotate(getWiggleRotation(now));
    }
    ctx.rotate(holdAnim.rotation);
    ctx.scale(scale * holdAnim.scale, scale * holdAnim.scale);
    if (jelly) ctx.scale(jelly.sx, jelly.sy);
    ctx.translate(-cx, -cy);
    let dim = false;
    if (!crit && !activeEvent?.freeClick) {
      if (!affordable) ctx.globalAlpha = 0.5;
      else if (hovered) dim = true;
    } else if (hovered) {
      dim = true;
    }
    // rounded RECTANGLE, not a full pill — ref.png's button corners are only
    // modestly rounded, unlike the fully-stadium-shaped income bar
    drawJellyButton(
      ctx,
      x,
      y,
      BTN_W,
      BTN_H,
      40,
      crit
        ? (cover?.color ?? CRIT_TIER_CONFIG[critTier as CritTier].color)
        : activeEvent
          ? activeEvent.color
          : floor.critMultiplierTier && !maxed
            ? CRIT_TIER_CONFIG[floor.critMultiplierTier].color
            : affordable
              ? COLOR.moneyGreen
              : COLOR.disabledGray,
    );

    ctx.font = '900 52px "Fredoka", system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = activeEvent
      ? activeEvent.label(critMultiplier)
      : crit
        ? (cover?.label ?? CRIT_TIER_CONFIG[critTier as CritTier].label)
        : maxed
          ? "MAX"
          : formatPrice(cost);
    drawCachedCartoonText(ctx, label, cx, cy, 52);
    // a hover darkening; ctx.filter here cost every frame of a mouse hold
    if (dim) {
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = COLOR.black;
      ctx.beginPath();
      ctx.roundRect(x, y, BTN_W, BTN_H, 40);
      ctx.fill();
    }
    if (whiteAlpha > 0) {
      ctx.globalAlpha = whiteAlpha;
      ctx.fillStyle = COLOR.white;
      ctx.beginPath();
      ctx.roundRect(x, y, BTN_W, BTN_H, 40);
      ctx.fill();
    }
    ctx.restore();
  }
}
