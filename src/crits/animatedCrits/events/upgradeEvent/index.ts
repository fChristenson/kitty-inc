// the "Upgrade" event: a covered crit (see crits/animatedCrits/events/streamTargetEvent) whose
// glimmer lights stream into the floor's income bar. When the stream ends the floor's
// permanent crit tier becomes the crit's rolled tier, or the tier above its own
// when that roll wouldn't promote it. Never lands on a top-tier floor
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import {
  drawIncomePanel,
  getIncomeBarCenter,
  setIncomePanelHidden,
} from "../../../../floors/incomePanel";
import { canPromote, promotedTier } from "../../eventRewards";
import { registerStreamTargetEvent } from "../streamTargetEvent";

// dev test hook
export const forceUpgradeEvent = registerStreamTargetEvent({
  key: "upgrade",
  cover: { label: "Upgrade", color: COLOR.teal },
  stream: "glimmers",
  chance: () => CONFIG.upgradeEvent.chance,
  target: (_floor, isGroundFloor) => getIncomeBarCenter(isGroundFloor),
  canStart: (floor, { promoteFloorTier }) =>
    promoteFloorTier !== undefined && canPromote(floor),
  setHidden: setIncomePanelHidden,
  slamPart: "bar",
  drawTarget: (ctx, floor, isGroundFloor, whiteAlpha, rotation) =>
    drawIncomePanel(ctx, floor, isGroundFloor, { whiteAlpha, rotation }),
  onEnd: (floor, tier, { promoteFloorTier }) =>
    promoteFloorTier?.(floor, promotedTier(floor, tier)),
});
