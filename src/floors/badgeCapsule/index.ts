// the mystery badge capsule: a building with every floor at the level cap and
// every upgrade bought earns one, shown as a little capsule beside its marker
// on the city map. Tapping it plays the reveal: the stage slides in, the
// capsule drops onto it and rolls, until a wisp dives into its seam and it
// pops open on a badge the player has never landed (any badge once all are
// found), which then lands on the ground floor. Each building earns one
import type { Floor } from "../../gameState";
import { isFloorMaxed } from "../../gameState";
import { loadImage } from "../../utils";
import { getImageUrl } from "../../loadAssets";
import {
  CRIT_PROC_INFO,
  CRIT_PROC_KINDS,
  getCritProcCount,
  pickCritTierByOdds,
  type CritProcKind,
} from "../../shared/critTypes";
import {
  capsuleRevealTimeline,
  drawCapsuleReveal,
  playCapsuleRevealBeats,
  type CapsuleScene,
} from "../../shared/badgeReveal/capsule";
import type { EventProcContext } from "../eventProcs";
import { canStartRevealStage, startRevealStage } from "../revealStage";
import { MAX_FLOORS_PER_BUILDING } from "../floorLock";
import { MAX_RENDERED_WORKERS } from "../worker";

const KEY = "badgeCapsule";

function isFloorComplete(floor: Floor): boolean {
  return (
    floor.unlocked &&
    isFloorMaxed(floor) &&
    floor.workerCount >= MAX_RENDERED_WORKERS &&
    floor.hasOfficeChairs &&
    floor.hasOfficeSupplies &&
    floor.hasManager
  );
}

// every floor unlocked, at the level cap, with every upgrade bought
export function isBuildingComplete(floors: readonly Floor[]): boolean {
  const unlocked = floors.filter((floor) => floor.unlocked);
  return (
    unlocked.length >= MAX_FLOORS_PER_BUILDING &&
    unlocked.every(isFloorComplete)
  );
}

// a complete building whose capsule is still waiting to be opened
export function hasBadgeCapsule(floors: readonly Floor[]): boolean {
  return !floors[0]?.badgeCapsuleOpened && isBuildingComplete(floors);
}

// the badge a capsule holds: one never landed, any once all are found
function pickCapsuleBadge(): { kind: CritProcKind; title: string } {
  const unseen = CRIT_PROC_KINDS.filter((kind) => getCritProcCount(kind) === 0);
  const pool = unseen.length > 0 ? unseen : CRIT_PROC_KINDS;
  return {
    kind: pool[Math.floor(Math.random() * pool.length)],
    title: unseen.length > 0 ? "New Badge" : "Badge",
  };
}

// opens the building's capsule for a reveal played elsewhere (the city map),
// marking it opened; null when it has none
export function takeBadgeCapsule(
  floors: Floor[],
): { kind: CritProcKind; title: string } | null {
  const ground = floors[0];
  if (!ground || !hasBadgeCapsule(floors)) return null;
  ground.badgeCapsuleOpened = true;
  return pickCapsuleBadge();
}

// the capsule reveal for a stage, its badge's art filled in once it loads
export function capsuleRevealContent(kind: CritProcKind, title: string) {
  const scene: CapsuleScene = { art: null, title };
  // the art loads while the capsule rolls
  loadImage(getImageUrl(CRIT_PROC_INFO[kind].icon)).then(
    (image) => {
      scene.art = image;
    },
    () => {},
  );
  return {
    durationMs: capsuleRevealTimeline().durationMs,
    draw: (
      ctx: CanvasRenderingContext2D,
      stage: { x: number; y: number; w: number; h: number },
      ms: number,
      now: number,
    ) => drawCapsuleReveal(ctx, stage, scene, ms, now),
  };
}

// plays the building's capsule reveal over its floors (the test button, which
// opens one on any building and leaves its capsule in place). True when the
// reveal started
export function openBadgeCapsule(
  floors: Floor[],
  context: EventProcContext,
  force = false,
): boolean {
  const ground = floors[0];
  if (!ground || !canStartRevealStage(context)) return false;
  if (!force && !hasBadgeCapsule(floors)) return false;
  const { kind, title } = pickCapsuleBadge();
  const beat = startRevealStage(KEY, ground, context, {
    ...capsuleRevealContent(kind, title),
    onEnd: () => context.applyProcCrit?.(ground, pickCritTierByOdds(), kind),
  });
  if (!beat) return false;
  if (!force) ground.badgeCapsuleOpened = true;
  playCapsuleRevealBeats(beat);
  return true;
}
