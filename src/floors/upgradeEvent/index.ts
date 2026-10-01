// the "Upgrade" event: a covered crit (see floors/streamTargetEvent) whose
// glimmer lights stream into the floor's income bar. When the stream ends the floor's
// permanent crit tier becomes the crit's rolled tier, or the tier above its own
// when that roll wouldn't promote it. Never lands on a top-tier floor
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import {
  CRIT_TIER_ORDER,
  nextCritTier,
  pickHigherCritTier,
  type CritTier,
} from "../../shared/critTypes";
import {
  drawIncomePanel,
  getIncomeBarCenter,
  setIncomePanelHidden,
} from "../incomePanel";
import { registerStreamTargetEvent } from "../streamTargetEvent";

function promotedTier(floor: Floor, rolled: CritTier): CritTier {
  const current = floor.critMultiplierTier;
  return pickHigherCritTier(current, rolled) === current
    ? nextCritTier(current)
    : rolled;
}

// dev test hook
export const forceUpgradeEvent = registerStreamTargetEvent({
  key: "upgrade",
  cover: { label: "Upgrade", color: COLOR.teal },
  stream: "glimmers",
  chance: () => CONFIG.upgradeEvent.chance,
  target: (_floor, isGroundFloor) => getIncomeBarCenter(isGroundFloor),
  canStart: (floor, { promoteFloorTier }) =>
    promoteFloorTier !== undefined &&
    floor.critMultiplierTier !== CRIT_TIER_ORDER[0],
  setHidden: setIncomePanelHidden,
  slamPart: "bar",
  drawTarget: (ctx, floor, isGroundFloor, whiteAlpha, rotation) =>
    drawIncomePanel(ctx, floor, isGroundFloor, { whiteAlpha, rotation }),
  onEnd: (floor, tier, { promoteFloorTier }) =>
    promoteFloorTier?.(floor, promotedTier(floor, tier)),
});
