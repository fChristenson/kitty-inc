// the "Comet" event: it covers its crit, whose click freezes the screen while
// one big glimmer light with a long glittering tail streaks diagonally down
// into a worker and explodes: every climbable worker caught in the blast
// lights up, plays its boost and climbs one perma tier. Then the screen
// unfreezes and the crit's tier pays out
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playExplosion, startBoostEventStreamLoop } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { pickCritTierByOdds } from "../../shared/critTypes";
import { drawWhiteBurst } from "../../shared/eventFx";
import { drawGlimmer, hash01 } from "../../shared/twinkle";
import { drawGlimmerOrb } from "../../shared/glimmerOrb";
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

const KEY = "comet";
const HEAD_SIZE = 40;
// the path leans this far sideways per px down, and starts this far above the screen
const SLANT = 0.75;
const MARGIN = 80;
// every climbable worker within BLAST of the impact is caught in it
const BLAST = WORKER_HEIGHT * 1.3;
const TAIL_LEN = 520;
const TAIL_SEGMENTS = 28;
const TAIL_LAYERS = [
  [HEAD_SIZE * 1.6, COLOR.heavenlyGold, 0.25],
  [HEAD_SIZE * 0.8, COLOR.heavenlyGold, 0.55],
  [HEAD_SIZE * 0.25, COLOR.white, 0.9],
] as const;
const TAIL_GLIMMERS = 14;
// after the impact the tail is drawn into it over this long
const TAIL_COLLAPSE_MS = 250;
// loose glitter: a chance every SHED_MS to drop a speck that drifts and fades
const SHED_MS = 18;
const SHED_CHANCE = 0.7;
const SHED_LIFE_MS = 700;
const SHED_SPREAD = HEAD_SIZE * 0.8;
const SHED_FALL = 40;
// the explosion: a white flash and glimmer sparks flung out to SPARK_REACH
const EXPLOSION_SCALE = 1.1;
const EXPLOSION_SHAKE = 1.2;
const SPARKS = 28;
const SPARK_REACH = BLAST * 1.3;
const SPARK_MS = 800;
const BURST_MS = 500;

interface Point {
  x: number;
  y: number;
}

interface CometPlan {
  from: Point;
  impact: Point;
  caught: OnScreenWorker[];
}

interface RunningComet extends CometPlan {
  startedAt: number;
  hitAt: number | null;
}

let running: RunningComet | null = null;

// the worker whose blast catches the most climbable workers in view, and the
// diagonal coming down into it from above the screen
function planComet(floor: Floor, context: EventProcContext): CometPlan | null {
  const rect = context.getFloorRect?.(floor);
  const area = context.getScreenAreaLocal?.(floor);
  if (!rect || !area) return null;
  const workers = (
    findOnScreenWorkers(floor, context.getOnScreenFloors) ?? []
  ).filter((w) => getBoostEventCandidates(w.floor).includes(w.workerIndex));
  if (workers.length === 0) return null;
  const pointOf = (w: OnScreenWorker): Point => ({
    x: (context.getFloorRect?.(w.floor)?.left ?? rect.left) + w.center.x,
    y: w.top + w.center.y,
  });
  const top = rect.top + area.top - MARGIN;
  let best: CometPlan | null = null;
  for (const target of [...workers].sort(() => Math.random() - 0.5)) {
    const impact = pointOf(target);
    const caught = workers.filter((w) => {
      const p = pointOf(w);
      return Math.hypot(p.x - impact.x, p.y - impact.y) <= BLAST;
    });
    if (best && caught.length <= best.caught.length) continue;
    const slant = (Math.random() < 0.5 ? -1 : 1) * SLANT;
    best = {
      from: { x: impact.x - (impact.y - top) * slant, y: top },
      impact,
      caught,
    };
  }
  return best;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.cometEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, context) =>
      !running && !isScreenFrozen() && planComet(floor, context) !== null,
    arm: startComet,
  },
  { label: "Comet", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Comet
export function forceCometEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

// speeding up as it comes down
function headAt(comet: RunningComet, ms: number): Point {
  const t = Math.min(1, Math.max(0, ms / CONFIG.cometEvent.streakMs)) ** 1.5;
  return {
    x: comet.from.x + (comet.impact.x - comet.from.x) * t,
    y: comet.from.y + (comet.impact.y - comet.from.y) * t,
  };
}

function drawComet(
  ctx: CanvasRenderingContext2D,
  comet: RunningComet,
  ms: number,
  now: number,
): void {
  const { streakMs } = CONFIG.cometEvent;
  const dx = comet.impact.x - comet.from.x;
  const dy = comet.impact.y - comet.from.y;
  const length = Math.hypot(dx, dy);
  const ux = dx / length;
  const uy = dy / length;
  const head = headAt(comet, ms);
  const tailLen =
    TAIL_LEN * Math.max(0, 1 - Math.max(0, ms - streakMs) / TAIL_COLLAPSE_MS);
  const behind = (d: number, side: number): Point => ({
    x: head.x - ux * d - uy * side,
    y: head.y - uy * d + ux * side,
  });

  // glitter shed along the way, drifting off the path and down as it fades
  for (let e = Math.floor(ms / SHED_MS); e * SHED_MS > ms - SHED_LIFE_MS; e--) {
    if (e < 0 || e * SHED_MS > streakMs || hash01(e, 1) > SHED_CHANCE) continue;
    const age = (ms - e * SHED_MS) / SHED_LIFE_MS;
    const at = headAt(comet, e * SHED_MS);
    const side = (hash01(e, 2) - 0.5) * 2 * SHED_SPREAD * (0.4 + age);
    drawGlimmer(
      ctx,
      at.x - uy * side,
      at.y + ux * side + SHED_FALL * age,
      HEAD_SIZE * 0.35 * (1 - age) * (0.4 + 0.6 * hash01(e, 3)),
      now / 200 + e,
      COLOR.heavenlyGold,
    );
  }
  if (tailLen <= 0) return;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const [width, color, alpha] of TAIL_LAYERS) {
    ctx.strokeStyle = color;
    for (let s = 0; s < TAIL_SEGMENTS; s++) {
      const f = s / TAIL_SEGMENTS;
      const a = behind(tailLen * f, 0);
      const b = behind(tailLen * (f + 1 / TAIL_SEGMENTS), 0);
      ctx.globalAlpha = alpha * (1 - f);
      ctx.lineWidth = width * (1 - f);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
  ctx.restore();

  // glimmers riding the tail, wavering wider toward its end
  for (let k = TAIL_GLIMMERS; k >= 1; k--) {
    const f = k / (TAIL_GLIMMERS + 1);
    const point = behind(
      tailLen * f,
      Math.sin(now / 110 + k * 1.7) * HEAD_SIZE * 0.35 * f,
    );
    drawGlimmer(
      ctx,
      point.x,
      point.y,
      HEAD_SIZE * 0.5 * (1 - f),
      now / 180 + k,
      COLOR.heavenlyGold,
    );
  }
  if (comet.hitAt === null)
    drawGlimmerOrb(ctx, head.x, head.y, HEAD_SIZE, 0.4, now);
}

// the impact: a big white flash and glimmer sparks flung out, slowing and fading
function drawExplosion(
  ctx: CanvasRenderingContext2D,
  at: Point,
  ms: number,
  now: number,
): void {
  drawWhiteBurst(ctx, at.x, at.y, ms / BURST_MS, EXPLOSION_SCALE);
  const t = ms / SPARK_MS;
  if (t >= 1) return;
  const out = 1 - (1 - t) ** 3;
  for (let i = 0; i < SPARKS; i++) {
    const angle = ((i + hash01(i, 4) * 0.5) / SPARKS) * Math.PI * 2;
    const reach = SPARK_REACH * (0.45 + 0.55 * hash01(i, 5)) * out;
    drawGlimmer(
      ctx,
      at.x + Math.cos(angle) * reach,
      at.y + Math.sin(angle) * reach,
      HEAD_SIZE * 0.45 * (0.5 + 0.5 * hash01(i, 6)) * (1 - t),
      now / 150 + i,
      COLOR.heavenlyGold,
    );
  }
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const comet = running;
  if (!comet) return;
  const now = performance.now();
  const dim = `brightness(${1 - getScreenFreezeDim()})`;
  for (const { floor, workerIndex, center } of comet.caught) {
    const rect = getFloorRect(floor);
    if (!rect) continue;
    ctx.save();
    ctx.translate(rect.left, rect.top);
    ctx.save();
    if (comet.hitAt === null) ctx.filter = dim;
    drawWorkerSpotlight(ctx, floor, workerIndex, 0, 0);
    ctx.restore();
    if (comet.hitAt !== null)
      drawWhiteBurst(
        ctx,
        center.x,
        center.y,
        (now - comet.hitAt) / BURST_MS,
        0.35,
      );
    ctx.restore();
  }
  drawComet(ctx, comet, now - comet.startedAt, now);
  if (comet.hitAt !== null)
    drawExplosion(ctx, comet.impact, now - comet.hitAt, now);
}

function startComet(floor: Floor, context: EventProcContext): void {
  if (running || isScreenFrozen()) return;
  const plan = planComet(floor, context);
  if (!plan) return;
  const { streakMs, holdMs } = CONFIG.cometEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const comet: RunningComet = {
    ...plan,
    startedAt: performance.now(),
    hitAt: null,
  };
  running = comet;
  const isLive = () => running === comet;
  const byFloor = new Map<Floor, number[]>();
  for (const worker of plan.caught)
    byFloor.set(worker.floor, [
      ...(byFloor.get(worker.floor) ?? []),
      worker.workerIndex,
    ]);
  setWorkerSpotlights(
    [...byFloor].map(([f, workerIndexes]) => ({ floor: f, workerIndexes })),
  );
  freezeScreen(drawOverlay);
  const stopSound = startBoostEventStreamLoop();

  setTimeout(() => {
    if (!isLive()) return;
    comet.hitAt = performance.now();
    playExplosion();
    shakeScreen(EXPLOSION_SHAKE);
    for (const worker of plan.caught) {
      promoteWorkerPermaTier(worker.floor, worker.workerIndex);
      celebrateWorkerBoost(worker.floor, worker.workerIndex, Date.now());
    }
  }, streakMs);

  setTimeout(() => {
    if (!isLive()) return;
    running = null;
    stopSound();
    clearWorkerSpotlight();
    unfreezeScreen();
    // the covered crit's own tier, which also saves the promotions
    context.applyTierCrit?.(floor, tier);
    endEventProc(KEY);
  }, streakMs + holdMs);
}
