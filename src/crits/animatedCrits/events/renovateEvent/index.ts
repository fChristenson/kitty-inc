// the "Renovate" event: a rare crit (crits/animatedCrits/eventProcs' shared pool) whose click
// freezes the screen and plays the same coin stream + sfx as the other events,
// from the floor's button into its own "Lvl N" label, which flashes white and
// wiggles as the coins land. When the stream ends the floor lands one regular
// crit tier (x5/x25/x125 by the crit tier odds), applied and celebrated like
// any crit
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import {
  drawUpgradeStarStill,
  getUpgradeIndicatorCenter,
  setUpgradeStarHidden,
  STAR_BOTTOM_Y,
  STAR_Y,
} from "../../../../floors/star";
import { registerStreamTargetEvent } from "../streamTargetEvent";

// dev test hook
export const forceRenovateEvent = registerStreamTargetEvent({
  key: "renovate",
  cover: { label: "Renovate", color: COLOR.orange },
  stream: "coins",
  chance: () => CONFIG.renovateEvent.chance,
  target: (floor) => ({
    x: getUpgradeIndicatorCenter(floor).x,
    y: (STAR_Y + STAR_BOTTOM_Y) / 2,
  }),
  canStart: (_floor, { applyTierCrit }) => applyTierCrit !== undefined,
  setHidden: setUpgradeStarHidden,
  slamPart: "star",
  drawTarget: (ctx, floor, _isGroundFloor, whiteAlpha, rotation) =>
    drawUpgradeStarStill(ctx, floor, whiteAlpha, rotation),
  onEnd: (floor, tier, { applyTierCrit }) => applyTierCrit?.(floor, tier),
});
