// a badge turning foil on a lucky landing (see shared/critTypes' rollBadgeFoil)
// gets its own reveal once its crit's flash has played: the reveal stage slides
// in and a wisp bumps the badge spinning until it flips to its shimmering or
// glittering self
import type { Floor } from "../../gameState";
import { loadImage } from "../../utils";
import { getImageUrl } from "../../loadAssets";
import {
  CRIT_PROC_INFO,
  type BadgeFoil,
  type CritProcKind,
} from "../../shared/critTypes";
import {
  badgeFace,
  badgeRevealTimeline,
  drawBadgeReveal,
  playBadgeRevealBeats,
  type BadgeScene,
} from "../../shared/badgeReveal";
import type { EventProcContext } from "../eventProcs";
import { canStartRevealStage, startRevealStage } from "../revealStage";

const KEY = "foilReveal";
// past the landed crit's own flash
const AFTER_FLASH_MS = 1500;
const RETRY_MS = 400;
const TITLES: Record<BadgeFoil, string> = {
  shimmer: "Shimmer Badge",
  glitter: "Glitter Badge",
};

interface Pending {
  kind: CritProcKind;
  foil: BadgeFoil;
  floor: Floor;
  context: EventProcContext;
}

const queue: Pending[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

export function revealBadgeFoil(
  kind: CritProcKind,
  foil: BadgeFoil,
  floor: Floor,
  context: EventProcContext,
): void {
  if (!context.getScreenAreaLocal) return;
  queue.push({ kind, foil, floor, context });
  schedule(AFTER_FLASH_MS);
}

function schedule(ms: number): void {
  if (timer === null) timer = setTimeout(playNext, ms);
}

// one at a time, each waiting for any event on screen to finish
function playNext(): void {
  timer = null;
  const next = queue[0];
  if (!next) return;
  if (!canStartRevealStage(next.context)) {
    schedule(RETRY_MS);
    return;
  }
  const { kind, foil, floor, context } = next;
  const scene: BadgeScene = { before: null, after: null, title: TITLES[foil] };
  const beat = startRevealStage(KEY, floor, context, {
    durationMs: badgeRevealTimeline().durationMs,
    draw: (ctx, stage, ms, now) => drawBadgeReveal(ctx, stage, scene, ms, now),
    onEnd: () => schedule(RETRY_MS),
  });
  if (!beat) {
    schedule(RETRY_MS);
    return;
  }
  queue.shift();
  // the art loads while the stage slides in and the wisp flies over
  loadImage(getImageUrl(CRIT_PROC_INFO[kind].icon)).then(
    (image) => {
      scene.before = badgeFace(image, foil === "glitter" ? "shimmer" : null);
      scene.after = badgeFace(image, foil);
    },
    () => {},
  );
  playBadgeRevealBeats(beat);
}
