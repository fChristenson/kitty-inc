// the "Reveal" event, a reveal-stage event (see ../revealStage): it covers its
// crit, whose click slides the stage in over the floors round the black
// silhouette of a badge the player has never landed (any badge once all are
// found). A wisp bumps it on the head, spinning it until it flips to the
// badge's art under a "New Badge" title. The stage slides off and that crit
// lands, its own flash naming it, counting toward its badge
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { loadImage } from "../../../../utils";
import { getImageUrl } from "../../../../loadAssets";
import { COLOR } from "../../../../palette";
import { getCritProcCount } from "../../../badgeCrits/critProcCounts";
import {
  CRIT_PROC_INFO,
  CRIT_PROC_KINDS,
  pickCritTierByOdds,
} from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";
import {
  canStartRevealStage,
  isRevealStageRunning,
  startRevealStage,
} from "../../revealStage";
import {
  badgeFace,
  badgeRevealTimeline,
  drawBadgeReveal,
  playBadgeRevealBeats,
  silhouetteOf,
  type BadgeScene,
} from "../../../badgeCrits/badgeReveal";

const KEY = "reveal";

const unseenKinds = () =>
  CRIT_PROC_KINDS.filter((kind) => getCritProcCount(kind) === 0);

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.revealEvent.chance,
    isInProgress: () => isRevealStageRunning(KEY),
    canArm: (_floor, context) =>
      canStartRevealStage(context) && context.applyProcCrit !== undefined,
    arm: startReveal,
  },
  { label: "Reveal", color: COLOR.revealBlue },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Reveal
export function forceRevealEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

function startReveal(floor: Floor, context: EventProcContext): void {
  const unseen = unseenKinds();
  const pool = unseen.length > 0 ? unseen : CRIT_PROC_KINDS;
  const kind = pool[Math.floor(Math.random() * pool.length)];
  const tier = context.critTier ?? pickCritTierByOdds();
  const { icon } = CRIT_PROC_INFO[kind];
  const scene: BadgeScene = {
    before: null,
    after: null,
    title: unseen.length > 0 ? "New Badge" : "Badge",
  };
  const tl = badgeRevealTimeline();
  const beat = startRevealStage(KEY, floor, context, {
    durationMs: tl.durationMs,
    draw: (ctx, stage, ms, now) => drawBadgeReveal(ctx, stage, scene, ms, now),
    onEnd: () => {
      context.applyProcCrit?.(floor, tier, kind);
      endEventProc(KEY);
    },
  });
  if (!beat) return;
  // the art loads while the stage slides in and the wisp flies over
  loadImage(getImageUrl(icon)).then(
    (image) => {
      scene.before = badgeFace(silhouetteOf(image));
      scene.after = badgeFace(image);
    },
    () => {},
  );
  playBadgeRevealBeats(beat);
}
