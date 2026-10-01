// the "Meteor Shower" event: it covers its crit, whose click freezes the
// screen while 3-6 shooting stars (the wisp, shared/wisp) streak down one
// after another, all slanting the same way, each striking a different
// climbable worker in view with a small explosion; every worker struck lights
// up, plays its boost and climbs one perma tier. Then the screen unfreezes
// and the crit's tier pays out
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playExplosion, startBoostEventStreamLoop } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { pickAtMost, pickCritTierByOdds } from "../../shared/critTypes";
import { drawExplosion, drawWhiteBurst } from "../../shared/eventFx";
import { drawWispHead, drawWispTrail, WISP_SIZE } from "../../shared/wisp";
import {
  freezeScreen,
  getScreenFreezeDim,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../shared/screenFreeze";
import { forceTestCrit } from "../upgradeButton";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../eventProcs";
import {
  celebrateWorkerBoost,
  clearWorkerSpotlight,
  drawWorkerSpotlight,
  getBoostEventCandidates,
  promoteWorkerPermaTier,
  setWorkerSpotlights,
  WORKER_HEIGHT,
} from "../worker";
import { findOnScreenWorkers, type OnScreenWorker } from "../onScreenWorkers";

const KEY = "meteorShower";
// every meteor leans this far sideways per px down, give or take SLANT_JITTER,
// and starts this far above the screen
const SLANT = 0.6;
const SLANT_JITTER = 0.15;
const MARGIN = 80;
// each strike's explosion, smaller than the Comet's
const EXPLOSION_SCALE = 0.45;
const EXPLOSION_SHAKE = 0.5;
const SPARK_REACH = WORKER_HEIGHT * 0.8;
const SPARK_SIZE = 14;
const BURST_MS = 500;

interface Point {
  x: number;
  y: number;
}

interface Meteor {
  worker: OnScreenWorker;
  from: Point;
  impact: Point;
  // ms from the shower's start
  launchAt: number;
  hitAt: number | null;
}

interface RunningShower {
  meteors: Meteor[];
  startedAt: number;
}

let running: RunningShower | null = null;

function climbableWorkers(
  floor: Floor,
  context: EventProcContext,
): OnScreenWorker[] {
  return (findOnScreenWorkers(floor, context.getOnScreenFloors) ?? []).filter(
    (w) => getBoostEventCandidates(w.floor).includes(w.workerIndex),
  );
}

// 3-6 different climbable workers in view, struck left to right or right to
// left as the shower slants, each by a meteor coming down from above the screen
function planShower(floor: Floor, context: EventProcContext): Meteor[] | null {
  const rect = context.getFloorRect?.(floor);
  const area = context.getScreenAreaLocal?.(floor);
  if (!rect || !area) return null;
  const workers = climbableWorkers(floor, context);
  if (workers.length === 0) return null;
  const { minMeteors, maxMeteors, gapMs } = CONFIG.meteorShowerEvent;
  const count =
    minMeteors + Math.floor(Math.random() * (maxMeteors - minMeteors + 1));
  const direction = Math.random() < 0.5 ? -1 : 1;
  const top = rect.top + area.top - MARGIN;
  return pickAtMost(workers, count)
    .map((worker) => ({
      worker,
      impact: {
        x:
          (context.getFloorRect?.(worker.floor)?.left ?? rect.left) +
          worker.center.x,
        y: worker.top + worker.center.y,
      },
    }))
    .sort((a, b) => (a.impact.x - b.impact.x) * direction)
    .map(({ worker, impact }, i) => {
      const slant =
        direction * (SLANT + (Math.random() * 2 - 1) * SLANT_JITTER);
      return {
        worker,
        from: { x: impact.x - (impact.y - top) * slant, y: top },
        impact,
        launchAt: i * gapMs,
        hitAt: null,
      };
    });
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.meteorShowerEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, context) =>
      !running &&
      !isScreenFrozen() &&
      climbableWorkers(floor, context).length > 0,
    arm: startShower,
  },
  { label: "Meteor Shower", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Meteor Shower
export function forceMeteorShowerEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

// speeding up as it comes down; ms from its own launch
function meteorAt(meteor: Meteor, ms: number): Point | null {
  const { streakMs } = CONFIG.meteorShowerEvent;
  if (ms < 0 || ms > streakMs) return null;
  const t = (ms / streakMs) ** 1.5;
  return {
    x: meteor.from.x + (meteor.impact.x - meteor.from.x) * t,
    y: meteor.from.y + (meteor.impact.y - meteor.from.y) * t,
  };
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const shower = running;
  if (!shower) return;
  const now = performance.now();
  const ms = now - shower.startedAt;
  const dim = `brightness(${1 - getScreenFreezeDim()})`;
  for (const meteor of shower.meteors) {
    const { floor, workerIndex, center } = meteor.worker;
    const rect = getFloorRect(floor);
    if (!rect) continue;
    ctx.save();
    ctx.translate(rect.left, rect.top);
    ctx.save();
    if (meteor.hitAt === null) ctx.filter = dim;
    drawWorkerSpotlight(ctx, floor, workerIndex, 0, 0);
    ctx.restore();
    if (meteor.hitAt !== null)
      drawWhiteBurst(
        ctx,
        center.x,
        center.y,
        (now - meteor.hitAt) / BURST_MS,
        0.3,
      );
    ctx.restore();
  }
  for (const meteor of shower.meteors) {
    const along = (t: number) => meteorAt(meteor, t - meteor.launchAt);
    drawWispTrail(ctx, along, ms, now, WISP_SIZE);
    if (meteor.hitAt === null)
      drawWispHead(ctx, along, ms, now, WISP_SIZE, 0.4);
    else
      drawExplosion(
        ctx,
        meteor.impact.x,
        meteor.impact.y,
        now - meteor.hitAt,
        now,
        EXPLOSION_SCALE,
        SPARK_REACH,
        SPARK_SIZE,
      );
  }
}

function startShower(floor: Floor, context: EventProcContext): void {
  if (running || isScreenFrozen()) return;
  const meteors = planShower(floor, context);
  if (!meteors) return;
  const { streakMs, holdMs } = CONFIG.meteorShowerEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const shower: RunningShower = { meteors, startedAt: performance.now() };
  running = shower;
  const isLive = () => running === shower;
  const byFloor = new Map<Floor, number[]>();
  for (const { worker } of meteors)
    byFloor.set(worker.floor, [
      ...(byFloor.get(worker.floor) ?? []),
      worker.workerIndex,
    ]);
  setWorkerSpotlights(
    [...byFloor].map(([f, workerIndexes]) => ({ floor: f, workerIndexes })),
  );
  freezeScreen(drawOverlay);
  const stopSound = startBoostEventStreamLoop();

  for (const meteor of meteors)
    setTimeout(() => {
      if (!isLive()) return;
      meteor.hitAt = performance.now();
      playExplosion();
      shakeScreen(EXPLOSION_SHAKE);
      const { floor: f, workerIndex } = meteor.worker;
      promoteWorkerPermaTier(f, workerIndex);
      celebrateWorkerBoost(f, workerIndex, Date.now());
    }, meteor.launchAt + streakMs);

  const lastHit = meteors[meteors.length - 1].launchAt + streakMs;
  setTimeout(stopSound, lastHit);
  setTimeout(() => {
    if (!isLive()) return;
    running = null;
    clearWorkerSpotlight();
    unfreezeScreen();
    // the covered crit's own tier, which also saves the promotions
    context.applyTierCrit?.(floor, tier);
    endEventProc(KEY);
  }, lastHit + holdMs);
}
