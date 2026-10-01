// the "Blessing" event: it covers its crit, whose click freezes the screen
// while golden glimmers drift down like snow over the clicked floor. One flake
// is meant for each of its workers that can still climb: as it settles on
// them they glow, play their boost and climb one perma tier. Once the last
// has landed the screen unfreezes and the crit's tier pays out
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { startBoostEventStreamLoop } from "../../sound";
import { pickCritTierByOdds } from "../../shared/critTypes";
import { drawWhiteBurst } from "../../shared/eventFx";
import { drawGoldShimmer } from "../../shared/goldShimmer";
import { drawGlimmer } from "../../shared/twinkle";
import {
  freezeScreen,
  drawFreezeDimmed,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../shared/screenFreeze";
import { forceTestCrit } from "../upgradeButton";
import {
  endEventProc,
  forceClaimEventProc,
  isVisibleOnFloor,
  registerEventProc,
  type EventProcContext,
} from "../eventProcs";
import {
  celebrateWorkerBoost,
  clearWorkerSpotlight,
  drawWorkerSpotlight,
  getBoostEventCandidates,
  getWorkerCenter,
  promoteWorkerPermaTier,
  setWorkerSpotlights,
  WORKER_HEIGHT,
} from "../worker";

const KEY = "blessing";
// the drifting flakes that land on no one, and how they look and move
const LOOSE_FLAKES = 45;
const FLAKE_SIZE: [number, number] = [8, 16];
const BLESSING_SIZE = 24;
const FALL_MS: [number, number] = [1_300, 1_900];
const SWAY: [number, number] = [20, 55];
const SWAY_TURNS = 1.3;
// flakes start this far above the screen
const START_ABOVE = 40;
const LAND_FADE_MS = 300;
const BURST_MS = 500;

const between = ([min, max]: [number, number]) =>
  min + Math.random() * (max - min);

interface Flake {
  x0: number;
  x1: number;
  y1: number;
  startAt: number;
  fallMs: number;
  sway: number;
  phase: number;
  size: number;
  // the worker it blesses; loose flakes have none
  worker: number | null;
}

interface RunningBlessing {
  floor: Floor;
  candidates: number[];
  top: number;
  flakes: Flake[];
  blessed: Map<number, number>; // worker index -> when it was blessed
  startedAt: number;
}

let running: RunningBlessing | null = null;

// the clicked floor's workers who can still climb, if the floor is in view
function findCandidates(floor: Floor, context: EventProcContext): number[] {
  const entry = context.getOnScreenFloors?.().find((f) => f.floor === floor);
  const center = getWorkerCenter(floor, 0);
  if (!entry || !center || !isVisibleOnFloor(entry, center.y)) return [];
  return getBoostEventCandidates(floor);
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.blessingEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, context) =>
      !running &&
      !isScreenFrozen() &&
      context.getScreenAreaLocal !== undefined &&
      findCandidates(floor, context).length > 0,
    arm: startBlessing,
  },
  { label: "Blessing", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Blessing
export function forceBlessingEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

// where a flake is, floor-local, `ms` into its fall: drifting side to side,
// the sway calming as it settles
function flakeAt(flake: Flake, top: number, ms: number) {
  const t = Math.min(1, ms / flake.fallMs);
  const sway =
    Math.sin(flake.phase + t * SWAY_TURNS * Math.PI * 2) * flake.sway * (1 - t);
  return {
    x: flake.x0 + (flake.x1 - flake.x0) * t + sway,
    y: top + (flake.y1 - top) * t,
  };
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const event = running;
  if (!event) return;
  const rect = getFloorRect(event.floor);
  if (!rect) return;
  const now = performance.now();
  ctx.save();
  ctx.translate(rect.left, rect.top);
  drawFreezeDimmed(ctx, (layer) => {
    for (const index of event.candidates)
      if (!event.blessed.has(index))
        drawWorkerSpotlight(layer, event.floor, index, 0, 0);
  });
  for (const index of event.candidates)
    if (event.blessed.has(index))
      drawWorkerSpotlight(ctx, event.floor, index, 0, 0);
  for (const [index, at] of event.blessed) {
    const center = getWorkerCenter(event.floor, index);
    if (center)
      drawWhiteBurst(ctx, center.x, center.y, (now - at) / BURST_MS, 0.35);
  }
  for (const flake of event.flakes) {
    const ms = now - event.startedAt - flake.startAt;
    if (ms <= 0) continue;
    // loose flakes melt away once they settle; a blessing one vanishes into its worker
    const fade =
      ms <= flake.fallMs
        ? 1
        : flake.worker === null
          ? 1 - (ms - flake.fallMs) / LAND_FADE_MS
          : 0;
    if (fade <= 0) continue;
    const { x, y } = flakeAt(flake, event.top, ms);
    const size = flake.size * fade;
    if (flake.worker !== null)
      drawGoldShimmer(ctx, x, y, size * 1.6, 1, 2, now);
    drawGlimmer(ctx, x, y, size, now / 600 + flake.phase, COLOR.heavenlyGold);
  }
  ctx.restore();
}

function startBlessing(floor: Floor, context: EventProcContext): void {
  if (running || isScreenFrozen()) return;
  const candidates = findCandidates(floor, context);
  const area = context.getScreenAreaLocal?.(floor);
  if (candidates.length === 0 || !area) return;
  const { snowMs } = CONFIG.blessingEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const top = area.top - START_ABOVE;
  const groundY = (getWorkerCenter(floor, 0)?.y ?? 0) + WORKER_HEIGHT * 0.45;
  const flake = (
    x1: number,
    y1: number,
    worker: number | null,
    size: number,
  ): Flake => {
    const fallMs = between(FALL_MS);
    const sway = between(SWAY);
    return {
      x0: x1 + (Math.random() - 0.5) * 2 * sway,
      x1,
      y1,
      startAt: Math.random() * Math.max(0, snowMs - fallMs),
      fallMs,
      sway,
      phase: Math.random() * Math.PI * 2,
      size,
      worker,
    };
  };
  const flakes: Flake[] = [
    ...Array.from({ length: LOOSE_FLAKES }, () =>
      flake(
        area.left + Math.random() * (area.right - area.left),
        groundY - Math.random() * WORKER_HEIGHT * 0.3,
        null,
        between(FLAKE_SIZE),
      ),
    ),
    ...candidates.map((index) => {
      const center = getWorkerCenter(floor, index)!;
      return flake(center.x, center.y, index, BLESSING_SIZE);
    }),
  ];
  const event: RunningBlessing = {
    floor,
    candidates,
    top,
    flakes,
    blessed: new Map(),
    startedAt: performance.now(),
  };
  running = event;
  const isLive = () => running === event;
  setWorkerSpotlights([{ floor, workerIndexes: candidates }]);
  freezeScreen(drawOverlay);
  const stopSound = startBoostEventStreamLoop();

  let lastLanding = 0;
  for (const f of flakes) {
    if (f.worker === null) continue;
    const index = f.worker;
    const landsAt = f.startAt + f.fallMs;
    lastLanding = Math.max(lastLanding, landsAt);
    setTimeout(() => {
      if (!isLive()) return;
      event.blessed.set(index, performance.now());
      promoteWorkerPermaTier(floor, index);
      celebrateWorkerBoost(floor, index, Date.now());
    }, landsAt);
  }

  setTimeout(
    () => {
      if (!isLive()) return;
      running = null;
      stopSound();
      clearWorkerSpotlight();
      unfreezeScreen();
      // the covered crit's own tier, which also saves the promotions
      context.applyTierCrit?.(floor, tier);
      endEventProc(KEY);
    },
    Math.max(snowMs, lastLanding) + BURST_MS,
  );
}
