// the "Constellation" event: it covers its crit, whose click freezes the screen
// while a star twinkles up over several on-screen workers, then a light draws
// glowing lines linking them into a star pattern. Once it closes, each linked
// worker flares in turn, plays its boost and climbs one perma tier; then the
// screen unfreezes and the crit's tier pays out
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { startBoostEventStreamLoop } from "../../sound";
import { pickAtMost, pickCritTierByOdds } from "../../shared/critTypes";
import { drawGlimmer, hash01, stampGlimmer } from "../../shared/twinkle";
import { drawWisp, WISP_SIZE } from "../../shared/wisp";
import { drawWhiteBurst } from "../../shared/eventFx";
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

const KEY = "constellation";
const STAR_SIZE = WORKER_HEIGHT * 0.22;
// how far above a worker's middle its star hangs, of its height
const STAR_RISE = 0.15;
// the glimmers along each link: their spacing (px), size and sideways scatter
const TRAIL_STEP = 22;
const TRAIL_SIZE = WORKER_HEIGHT * 0.09;
const TRAIL_SCATTER = 6;
const LINE_WIDTH = 7;
// how much of the line shows through, so the glimmers stay the focus
const LINE_ALPHA = 0.35;
const FLARE_MS = 500;

interface Star {
  worker: OnScreenWorker;
  flaredAt: number | null;
}

interface RunningConstellation {
  stars: Star[];
  // indexes into stars, in the order the light links them (back to the first)
  path: number[];
  startedAt: number;
}

let running: RunningConstellation | null = null;

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

// every promotable worker in view, while floor itself is in view
function findCandidates(
  floor: Floor,
  context: EventProcContext,
): OnScreenWorker[] {
  return (findOnScreenWorkers(floor, context.getOnScreenFloors) ?? []).filter(
    (w) => getBoostEventCandidates(w.floor).includes(w.workerIndex),
  );
}

// the stars in order round their middle, linked skipping the most stars that
// still visits every one in a single loop: a pentagram for five
function starPath(points: { x: number; y: number }[]): number[] {
  const n = points.length;
  const cx = points.reduce((sum, p) => sum + p.x, 0) / n;
  const cy = points.reduce((sum, p) => sum + p.y, 0) / n;
  const round = points
    .map((p, i) => ({ i, angle: Math.atan2(p.y - cy, p.x - cx) }))
    .sort((a, b) => a.angle - b.angle)
    .map((p) => p.i);
  let step = 1;
  for (let s = Math.ceil(n / 2) - 1; s > 1; s--)
    if (gcd(n, s) === 1) {
      step = s;
      break;
    }
  return Array.from({ length: n + 1 }, (_, k) => round[(k * step) % n]);
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.constellationEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, context) =>
      !running &&
      !isScreenFrozen() &&
      findCandidates(floor, context).length >= 3,
    arm: startConstellation,
  },
  { label: "Constellation", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Constellation
export function forceConstellationEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

// a star's point in the overlay's space; null when its floor is out of view
function starPoint(
  star: Star,
  getFloorRect: FloorRectResolver,
): { x: number; y: number } | null {
  const rect = getFloorRect(star.worker.floor);
  if (!rect) return null;
  const { center } = star.worker;
  return {
    x: rect.left + center.x,
    y: rect.top + center.y - WORKER_HEIGHT * STAR_RISE,
  };
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const event = running;
  if (!event) return;
  const { appearMs, linkMs } = CONFIG.constellationEvent;
  const now = performance.now();
  const elapsed = now - event.startedAt;
  const drawStar = (
    c: CanvasRenderingContext2D,
    star: (typeof event.stars)[number],
  ) => {
    const rect = getFloorRect(star.worker.floor);
    if (!rect) return;
    c.save();
    c.translate(rect.left, rect.top);
    drawWorkerSpotlight(c, star.worker.floor, star.worker.workerIndex, 0, 0);
    c.restore();
  };
  drawFreezeDimmed(
    ctx,
    (layer) => {
      for (const star of event.stars)
        if (star.flaredAt === null) drawStar(layer, star);
    },
    [event, event.stars.filter((star) => star.flaredAt === null).length],
  );
  for (const star of event.stars)
    if (star.flaredAt !== null) drawStar(ctx, star);
  const points = event.stars.map((star) => starPoint(star, getFloorRect));

  // the glimmer trails laid so far, then the light laying the next one
  const segments = event.path.length - 1;
  const linked = Math.min(
    segments,
    Math.max(0, ((elapsed - appearMs) / linkMs) * segments),
  );
  for (let s = 0; s < Math.ceil(linked); s++) {
    const a = points[event.path[s]];
    const b = points[event.path[s + 1]];
    if (!a || !b) continue;
    const t = Math.min(1, linked - s);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy) || 1;
    const laid = length * t;
    // the glowing line, faint, under the glimmers
    const endX = a.x + dx * t;
    const endY = a.y + dy * t;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (const [width, color, alpha] of [
      [LINE_WIDTH * 2.5, COLOR.heavenlyGold, 0.25],
      [LINE_WIDTH, COLOR.heavenlyGold, 0.8],
      [LINE_WIDTH * 0.35, COLOR.white, 1],
    ] as const) {
      ctx.globalAlpha = alpha * LINE_ALPHA;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let k = 0, d = TRAIL_STEP / 2; d < laid; k++, d += TRAIL_STEP) {
      const scatter = (hash01(s, k) - 0.5) * 2 * TRAIL_SCATTER;
      const twinkle = 0.5 + 0.5 * Math.sin(now / 140 + hash01(k, s) * 20);
      // fresh glimmers near the light start big and settle
      const fresh = Math.max(0, 1 - (laid - d) / (TRAIL_STEP * 4));
      stampGlimmer(
        ctx,
        a.x + (dx * d) / length - (dy / length) * scatter,
        a.y + (dy * d) / length + (dx / length) * scatter,
        TRAIL_SIZE * (0.45 + 0.55 * twinkle) * (1 + fresh),
        now / 300 + k,
        COLOR.heavenlyGold,
      );
    }
    ctx.restore();
  }

  // each star twinkling up, then flaring as its worker is promoted
  event.stars.forEach((star, i) => {
    const point = points[i];
    if (!point) return;
    const grow = Math.min(1, Math.max(0, (elapsed - i * 60) / appearMs));
    const pulse = 1 + 0.15 * Math.sin(now / 160 + i * 1.7);
    if (star.flaredAt !== null) {
      const t = (now - star.flaredAt) / FLARE_MS;
      drawWhiteBurst(ctx, point.x, point.y, t, 0.35);
    }
    drawGlimmer(
      ctx,
      point.x,
      point.y,
      STAR_SIZE * grow * pulse * (star.flaredAt !== null ? 1.4 : 1),
      now / 700 + i,
      COLOR.heavenlyGold,
    );
  });
  // the light laying the lines, `t` ms in; gone once they're all laid
  const headAt = (t: number) => {
    const at = ((t - appearMs) / linkMs) * segments;
    if (at <= 0 || at >= segments) return null;
    const s = Math.floor(at);
    const a = points[event.path[s]];
    const b = points[event.path[s + 1]];
    if (!a || !b) return null;
    const f = at - s;
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  };
  drawWisp(ctx, headAt, elapsed, now, WISP_SIZE);
}

function startConstellation(floor: Floor, context: EventProcContext): void {
  if (running || isScreenFrozen()) return;
  const found = findCandidates(floor, context);
  if (found.length < 3) return;
  const { appearMs, linkMs, flareGapMs, maxStars } = CONFIG.constellationEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const workers = pickAtMost(found, maxStars);
  const stars: Star[] = workers.map((worker) => ({ worker, flaredAt: null }));
  const event: RunningConstellation = {
    stars,
    path: starPath(
      workers.map((w) => ({ x: w.center.x, y: w.center.y + w.top })),
    ),
    startedAt: performance.now(),
  };
  running = event;
  const isLive = () => running === event;
  setWorkerSpotlights(
    workers.map(({ floor: f, workerIndex }) => ({
      floor: f,
      workerIndexes: [workerIndex],
    })),
  );
  freezeScreen(drawOverlay);
  const stopSound = startBoostEventStreamLoop();

  // once the star closes, each node flares in the order the light linked them
  const linkedAt = appearMs + linkMs;
  event.path.slice(0, -1).forEach((index, k) => {
    setTimeout(
      () => {
        if (!isLive()) return;
        const star = stars[index];
        star.flaredAt = performance.now();
        promoteWorkerPermaTier(star.worker.floor, star.worker.workerIndex);
        celebrateWorkerBoost(
          star.worker.floor,
          star.worker.workerIndex,
          Date.now(),
        );
      },
      linkedAt + k * flareGapMs,
    );
  });

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
    linkedAt + stars.length * flareGapMs + FLARE_MS,
  );
}
