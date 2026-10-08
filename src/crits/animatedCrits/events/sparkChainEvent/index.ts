// the "Spark Chain" event: it covers its crit, whose click freezes the screen
// while a glimmer light charges on the clicked floor's button, then jumps like
// lightning to the nearest worker and on worker to worker, faster each jump:
// each worker it strikes climbs one perma tier, and the chain fizzles out on
// the first maxed worker it reaches. Then the screen unfreezes and the crit's
// tier pays out
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import {
  playBloop,
  playSwoosh,
  startBoostEventStreamLoop,
} from "../../../../sound";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawWhiteBurst } from "../../../../shared/eventFx";
import { drawGlimmer, hash01 } from "../../../../shared/twinkle";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import {
  freezeScreen,
  drawFreezeDimmed,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../../../shared/screenFreeze";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import {
  clearUpgradeButtonSpotlights,
  drawUpgradeButtonSpotlight,
  getButtonCenter,
  setUpgradeButtonSpotlights,
} from "../../../../floors/upgradeButton";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";
import {
  celebrateWorkerBoost,
  clearWorkerSpotlight,
  drawWorkerSpotlight,
  getBoostEventCandidates,
  promoteWorkerPermaTier,
  setWorkerSpotlights,
} from "../../../../floors/worker";
import {
  findOnScreenWorkers,
  nearestChain,
  type OnScreenWorker,
} from "../../onScreenWorkers";

const KEY = "sparkChain";
// the orb grows on the button before the first strike
const CHARGE_MS = 400;
// each jump flies the light this share of its time, then it rests on the worker
const FLY_SHARE = 0.35;
// the bolt: BOLT_KINKS jagged bends JAG px out (of its length, at most), re-drawn every FLICKER_MS
const BOLT_KINKS = 7;
const JAG = 0.12;
const FLICKER_MS = 45;
const BOLT_FADE_MS = 280;
// sparks crackling off a bolt for as long as it shows: flung out, then falling
const BOLT_SPARKS = 22;
const SPARK_LIFE_MS = 450;
const SPARK_SPEED = 0.15; // px/ms, at most
const SPARK_GRAVITY = 0.0012; // px/ms²
const SPARK_SIZE = 8;
const BOLT_LAYERS = [
  [16, COLOR.heavenlyGold, 0.25],
  [7, COLOR.heavenlyGold, 0.7],
  [2.5, COLOR.white, 1],
] as const;
const FADE_MS = 350;
const BURST_MS = 450;

interface Stop {
  floor: Floor;
  x: number;
  y: number;
  worker: OnScreenWorker | null;
  // the chain ends here, on a worker already at the top tier
  maxed: boolean;
  // ms into the event the jump into it starts and lands
  jumpAt: number;
  landAt: number;
}

interface RunningSpark {
  floor: Floor;
  isGroundFloor: boolean;
  stops: Stop[];
  startedAt: number;
  struck: Map<number, number>; // stop index -> when it was struck
}

let running: RunningSpark | null = null;

const isClimbable = (w: OnScreenWorker) =>
  getBoostEventCandidates(w.floor).includes(w.workerIndex);

// the button, then the nearest workers in turn, ending on the first maxed one
function planStops(floor: Floor, context: EventProcContext): Stop[] | null {
  const found = findOnScreenWorkers(floor, context.getOnScreenFloors);
  const top = context
    .getOnScreenFloors?.()
    .find((entry) => entry.floor === floor)?.top;
  if (!found || found.length === 0 || top === undefined) return null;
  const { firstJumpMs, speedUp, maxJumps } = CONFIG.sparkChainEvent;
  const button = getButtonCenter(context.isGroundFloor);
  const chain = nearestChain(
    { x: button.x, y: button.y + top },
    found,
    maxJumps,
  );
  const end = chain.findIndex((w) => !isClimbable(w));
  if (end === 0) return null;
  const reached = end === -1 ? chain : chain.slice(0, end + 1);
  const stops: Stop[] = [
    {
      floor,
      ...button,
      worker: null,
      maxed: false,
      jumpAt: 0,
      landAt: CHARGE_MS,
    },
  ];
  let at = CHARGE_MS;
  reached.forEach((worker, k) => {
    const jumpMs = firstJumpMs * speedUp ** k;
    stops.push({
      floor: worker.floor,
      ...worker.center,
      worker,
      maxed: !isClimbable(worker),
      jumpAt: at,
      landAt: at + jumpMs * FLY_SHARE,
    });
    at += jumpMs;
  });
  return stops;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.sparkChainEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, context) =>
      !running && !isScreenFrozen() && planStops(floor, context) !== null,
    arm: startSparkChain,
  },
  { label: "Spark Chain", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Spark Chain
export function forceSparkChainEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

type Point = { x: number; y: number };

// a jagged lightning bolt from a to b, its kinks re-rolled every FLICKER_MS
function drawBolt(
  ctx: CanvasRenderingContext2D,
  a: Point,
  b: Point,
  alpha: number,
  now: number,
): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const flicker = Math.floor(now / FLICKER_MS);
  const points: Point[] = [a];
  for (let i = 1; i <= BOLT_KINKS; i++) {
    const t = i / (BOLT_KINKS + 1);
    const off = (hash01(flicker, i) - 0.5) * 2 * JAG * length;
    points.push({
      x: a.x + dx * t - (dy / length) * off,
      y: a.y + dy * t + (dx / length) * off,
    });
  }
  points.push(b);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const [width, color, layerAlpha] of BOLT_LAYERS) {
    ctx.globalAlpha = layerAlpha * alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (const p of points.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  ctx.restore();
}

// bolt `seed`'s sparks `ms` after it struck: each pops off a random point of
// it while it shows, flies out, falls and shrinks away
function drawBoltSparks(
  ctx: CanvasRenderingContext2D,
  a: Point,
  b: Point,
  seed: number,
  ms: number,
  flyMs: number,
  now: number,
): void {
  const showMs = flyMs + BOLT_FADE_MS;
  for (let j = 0; j < BOLT_SPARKS; j++) {
    const age = ms - hash01(seed, j) * showMs;
    if (age < 0 || age >= SPARK_LIFE_MS) continue;
    // only off the part of the bolt the light has already drawn
    const along = hash01(j, seed) * Math.min(1, ms / Math.max(1, flyMs));
    const angle = hash01(seed + 0.5, j) * Math.PI * 2;
    const speed = SPARK_SPEED * (0.3 + 0.7 * hash01(j + 0.5, seed));
    drawGlimmer(
      ctx,
      a.x + (b.x - a.x) * along + Math.cos(angle) * speed * age,
      a.y +
        (b.y - a.y) * along +
        Math.sin(angle) * speed * age +
        0.5 * SPARK_GRAVITY * age * age,
      SPARK_SIZE *
        (0.5 + 0.5 * hash01(seed, j + 0.5)) *
        (1 - age / SPARK_LIFE_MS),
      now / 90 + j,
      j % 3 === 0 ? COLOR.white : COLOR.heavenlyGold,
    );
  }
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const spark = running;
  if (!spark) return;
  const now = performance.now();
  const ms = now - spark.startedAt;
  const points: (Point | null)[] = spark.stops.map((stop) => {
    const rect = getFloorRect(stop.floor);
    return rect && { x: rect.left + stop.x, y: rect.top + stop.y };
  });

  const buttonRect = getFloorRect(spark.floor);
  if (buttonRect) {
    ctx.save();
    ctx.translate(buttonRect.left, buttonRect.top);
    drawUpgradeButtonSpotlight(ctx, spark.floor, spark.isGroundFloor, 0);
    ctx.restore();
  }
  const drawStopWorker = (
    c: CanvasRenderingContext2D,
    stop: (typeof spark.stops)[number],
  ) => {
    const rect = getFloorRect(stop.floor);
    if (!stop.worker || !rect) return;
    c.save();
    c.translate(rect.left, rect.top);
    drawWorkerSpotlight(c, stop.floor, stop.worker.workerIndex, 0, 0);
    c.restore();
  };
  drawFreezeDimmed(
    ctx,
    (layer) =>
      spark.stops.forEach((stop, i) => {
        if (!spark.struck.has(i)) drawStopWorker(layer, stop);
      }),
    [spark, spark.struck.size],
  );
  spark.stops.forEach((stop, i) => {
    if (spark.struck.has(i)) drawStopWorker(ctx, stop);
  });

  // the bolts: lit while the light flies, fading once it lands
  for (let i = 1; i < spark.stops.length; i++) {
    const stop = spark.stops[i];
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b || ms < stop.jumpAt) continue;
    const alpha = ms < stop.landAt ? 1 : 1 - (ms - stop.landAt) / BOLT_FADE_MS;
    if (alpha > 0) drawBolt(ctx, a, b, alpha, now);
    drawBoltSparks(
      ctx,
      a,
      b,
      i,
      ms - stop.jumpAt,
      stop.landAt - stop.jumpAt,
      now,
    );
  }
  for (const [i, at] of spark.struck) {
    const point = points[i];
    if (point)
      drawWhiteBurst(
        ctx,
        point.x,
        point.y,
        (now - at) / BURST_MS,
        spark.stops[i].maxed ? 0.2 : 0.35,
      );
  }

  // the light: on its current stop, or flying the bolt to the next
  const lightAt = (t: number): Point | null => {
    if (t < 0) return null;
    let k = 0;
    while (k + 1 < spark.stops.length && t >= spark.stops[k + 1].jumpAt) k++;
    const stop = spark.stops[k];
    const to = points[k];
    const from = points[Math.max(0, k - 1)];
    if (!to || !from) return null;
    const q =
      k === 0
        ? 1
        : Math.min(
            1,
            Math.max(
              0,
              (t - stop.jumpAt) / Math.max(1, stop.landAt - stop.jumpAt),
            ),
          );
    return { x: from.x + (to.x - from.x) * q, y: from.y + (to.y - from.y) * q };
  };
  const last = spark.stops[spark.stops.length - 1];
  const grow = Math.min(
    1,
    ms / CHARGE_MS,
    Math.max(0, 1 - (ms - last.landAt) / FADE_MS),
  );
  drawWisp(ctx, lightAt, ms, now, WISP_SIZE * grow, 0.3);
}

function startSparkChain(floor: Floor, context: EventProcContext): void {
  if (running || isScreenFrozen()) return;
  const stops = planStops(floor, context);
  if (!stops) return;
  const tier = context.critTier ?? pickCritTierByOdds();
  const spark: RunningSpark = {
    floor,
    isGroundFloor: context.isGroundFloor,
    stops,
    startedAt: performance.now(),
    struck: new Map(),
  };
  running = spark;
  const isLive = () => running === spark;
  setWorkerSpotlights(
    stops.flatMap(({ worker }) =>
      worker
        ? [{ floor: worker.floor, workerIndexes: [worker.workerIndex] }]
        : [],
    ),
  );
  setUpgradeButtonSpotlights([floor]);
  freezeScreen(drawOverlay);
  const stopSound = startBoostEventStreamLoop();

  stops.forEach((stop, i) => {
    const worker = stop.worker;
    if (!worker) return;
    setTimeout(() => {
      if (isLive()) playSwoosh();
    }, stop.jumpAt);
    setTimeout(() => {
      if (!isLive()) return;
      spark.struck.set(i, performance.now());
      if (stop.maxed) {
        playBloop();
        return;
      }
      promoteWorkerPermaTier(worker.floor, worker.workerIndex);
      celebrateWorkerBoost(worker.floor, worker.workerIndex, Date.now());
    }, stop.landAt);
  });

  const endAt = stops[stops.length - 1].landAt + CONFIG.sparkChainEvent.holdMs;
  setTimeout(() => {
    if (!isLive()) return;
    running = null;
    stopSound();
    clearWorkerSpotlight();
    clearUpgradeButtonSpotlights();
    unfreezeScreen();
    // the covered crit's own tier, which also saves the promotions
    context.applyTierCrit?.(floor, tier);
    endEventProc(KEY);
  }, endAt);
}
