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
// floor at once — keep sale/overtime in this order unless deliberately
// reprioritizing.
import { drawCartoonText, drawPill, formatPrice } from "../../utils";
import { COLOR } from "../../palette";
import { getWiggleRotation } from "../../shared/wiggle";
import type { BigNumber } from "../../shared/bigNumber";
import type { Floor } from "../../gameState";
import {
  BTN_W,
  BTN_H,
  BTN_X,
  getBtnY,
  pressScale,
  stepHoldAnim,
} from "./shared";
import { getActiveEventButton } from "../../shared/floorEvents";
import { getCritTier, CRIT_TIER_CONFIG, type CritTier } from "./crit";
import "./sale";
import "./overtime";

export * from "./shared";
export * from "./crit";
export * from "./sale";
export * from "./overtime";

export function drawUpgradeButton(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
  hovered: boolean,
  cost: BigNumber,
  affordable: boolean,
  isGroundFloor: boolean,
): void {
  const x = BTN_X;
  const y = getBtnY(isGroundFloor);
  const cx = x + BTN_W / 2;
  const cy = y + BTN_H / 2;
  const now = Date.now();
  const scale = pressScale(floor, now);
  const holdAnim = stepHoldAnim(floor, now, cx, cy);
  const critTier = getCritTier(floor);
  const crit = critTier !== null;
  const critMultiplier = crit
    ? CRIT_TIER_CONFIG[critTier as CritTier].multiplier
    : null;
  // the one event (if any) currently governing this floor's button
  // appearance — see shared.ts's own "event crit framework" comment
  const activeEvent = getActiveEventButton(floor, now);

  ctx.save();
  ctx.translate(cx + holdAnim.shakeX, cy + holdAnim.shakeY);
  if (crit || activeEvent) {
    ctx.rotate(getWiggleRotation(now));
  }
  ctx.rotate(holdAnim.rotation);
  ctx.scale(scale * holdAnim.scale, scale * holdAnim.scale);
  ctx.translate(-cx, -cy);
  if (!crit && !activeEvent?.freeClick) {
    if (!affordable) ctx.globalAlpha = 0.5;
    else if (hovered) ctx.filter = "brightness(0.85)";
  } else if (hovered) {
    ctx.filter = "brightness(0.85)";
  }
  // rounded RECTANGLE, not a full pill — ref.png's button corners are only modestly
  // rounded, unlike the fully-stadium-shaped income bar. Must clear the combined
  // black+white+dark ring inset (~21% of BTN_H) with room to spare, or the
  // innermost green fill's own radius gets clamped to 0 and its corners go square
  // even though the outer rings are still visibly rounded
  drawPill(
    ctx,
    x,
    y,
    BTN_W,
    BTN_H,
    crit
      ? CRIT_TIER_CONFIG[critTier as CritTier].color
      : activeEvent
        ? activeEvent.color
        : floor.critMultiplierTier
          ? CRIT_TIER_CONFIG[floor.critMultiplierTier].color
          : affordable
            ? COLOR.moneyGreen
            : COLOR.disabledGray,
    true,
    true,
    40,
  );

  ctx.font = '900 52px "Fredoka", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const label = activeEvent
    ? activeEvent.label(critMultiplier)
    : crit
      ? CRIT_TIER_CONFIG[critTier as CritTier].label
      : formatPrice(cost);
  drawCartoonText(ctx, label, cx, cy);
  ctx.restore();
}
