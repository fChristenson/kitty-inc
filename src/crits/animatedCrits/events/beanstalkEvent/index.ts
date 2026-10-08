// the "Beanstalk" event: it covers its crit, whose click freezes the screen
// while a vine of light, led by the wisp (shared/wisp), sprouts from the top
// unlocked floor and climbs, winding round and round the locked floor above
// and on up into the sky past it, sprouting glowing leaves as it goes. The
// lock flares as the vine closes round it, and it bursts into bloom at its top.
// Then the screen unfreezes, both floors it climbed unlock for free (rolling
// their own unlock crits) and the crit's tier pays out
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import {
  playExplosion,
  playSwoosh,
  startBoostEventStreamLoop,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { isFloorLocked } from "../../../../shared/detachedJob";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawExplosion, drawWhiteBurst } from "../../../../shared/eventFx";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import {
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../../../shared/screenFreeze";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import {
  drawFloorLockPrice,
  getLockCenter,
  MAX_FLOORS_PER_BUILDING,
  setFloorLockPriceHidden,
} from "../../../../floors/floorLock";
import {
  endEventProc,
  forceClaimEventProc,
  isVisibleOnFloor,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";
import { smoothstep as ease } from "../../../../shared/easing";

const KEY = "beanstalk";
// the vine sprouts this far below the locked floor and winds this wide round
// it, TURNS times a floor
const SPROUT = 120;
const RADIUS = FLOOR_W * 0.4;
const TURNS = 1.5;
const POINTS = 240;
// a leaf every LEAF_EVERY points, popping open over LEAF_POP of the climb
const LEAF_EVERY = 10;
const LEAF_POP = 0.04;
const LEAF_SIZE = 30;
const BURST_MS = 500;
const LOCK_SHAKE_MS = 450;

type Point = { x: number; y: number };

interface RunningBeanstalk {
  locked: Floor;
  // world space
  centerX: number;
  baseY: number;
  topY: number;
  // the climb's share at which it closes round the locked floor
  wrapShare: number;
  startedAt: number;
  wrappedAt: number | null;
  bloomedAt: number | null;
}

let running: RunningBeanstalk | null = null;

// the building's locked floor, while it's in view with room for another above
function findLocked(floor: Floor, context: EventProcContext): Floor | null {
  const locked = context.floors.find((f) => !f.unlocked);
  if (!locked || isFloorLocked(locked) || !context.unlockFloorFree) return null;
  if (context.floors.length >= MAX_FLOORS_PER_BUILDING) return null;
  const onScreen = context.getOnScreenFloors?.() ?? [];
  if (!onScreen.some((entry) => entry.floor === floor)) return null;
  const entry = onScreen.find((e) => e.floor === locked);
  return entry && isVisibleOnFloor(entry, getLockCenter().y) ? locked : null;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.beanstalkEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, context) =>
      !running && !isScreenFrozen() && findLocked(floor, context) !== null,
    arm: startBeanstalk,
  },
  { label: "Beanstalk", color: COLOR.potionGreen },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Beanstalk
export function forceBeanstalkEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}


// how far up its climb the vine is ms in, 0..1
function progressAt(ms: number): number {
  return ease(Math.min(1, Math.max(0, ms / CONFIG.beanstalkEvent.growMs)));
}

// when the climb reaches share p
function timeAt(p: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (ease(mid) < p) lo = mid;
    else hi = mid;
  }
  return lo * CONFIG.beanstalkEvent.growMs;
}

// the vine at share p of its climb: where it is, and how far round toward
// the viewer it winds (1 in front of the building, -1 behind)
function vineAt(event: RunningBeanstalk, p: number): Point & { depth: number } {
  const floors = (event.baseY - event.topY) / FLOOR_H;
  const angle = Math.PI * 2 * TURNS * floors * p;
  return {
    x: event.centerX + Math.sin(angle) * RADIUS,
    y: event.baseY + (event.topY - event.baseY) * p,
    depth: Math.cos(angle),
  };
}

// the grown vine's points, shared by its back and front passes each frame
let vinePoints: {
  event: RunningBeanstalk;
  grown: number;
  points: (Point & { depth: number })[];
} | null = null;
function pointsOf(
  event: RunningBeanstalk,
  grown: number,
): (Point & { depth: number })[] {
  if (vinePoints?.event === event && vinePoints.grown === grown)
    return vinePoints.points;
  const count = Math.max(1, Math.round(POINTS * grown));
  const points = Array.from({ length: count + 1 }, (_, i) =>
    vineAt(event, (grown * i) / count),
  );
  vinePoints = { event, grown, points };
  return points;
}

// the grown vine's front or back stretches, glowing
function drawVine(
  ctx: CanvasRenderingContext2D,
  event: RunningBeanstalk,
  grown: number,
  front: boolean,
  now: number,
): void {
  const points = pointsOf(event, grown);
  const count = points.length - 1;
  const path = new Path2D();
  let drawing = false;
  for (const p of points) {
    if (p.depth >= 0 === front) {
      if (drawing) path.lineTo(p.x, p.y);
      else path.moveTo(p.x, p.y);
      drawing = true;
    } else drawing = false;
  }
  const alpha = front ? 1 : 0.35;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.3 * alpha;
  ctx.strokeStyle = COLOR.wispSand;
  ctx.lineWidth = 34;
  ctx.stroke(path);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = COLOR.heavenlyGold;
  ctx.lineWidth = 12;
  ctx.stroke(path);
  ctx.strokeStyle = COLOR.white;
  ctx.lineWidth = 4;
  ctx.stroke(path);

  // leaves sprouting off alternate sides, each popping open as the vine passes
  ctx.fillStyle = COLOR.heavenlyGold;
  for (let i = LEAF_EVERY; i < points.length - 1; i += LEAF_EVERY) {
    const p = points[i];
    if (p.depth >= 0 !== front) continue;
    const share = (grown * i) / count;
    const open = Math.min(1, (grown - share) / LEAF_POP);
    const next = points[i + 1];
    const along = Math.atan2(next.y - p.y, next.x - p.x);
    const side = (i / LEAF_EVERY) % 2 === 0 ? 1 : -1;
    const size = LEAF_SIZE * open * (1 + 0.08 * Math.sin(now / 300 + i));
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(along + side * 1.1);
    ctx.beginPath();
    ctx.ellipse(size, 0, size, size * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const event = running;
  if (!event) return;
  const now = performance.now();
  const ms = now - event.startedAt;
  const grown = progressAt(ms);

  drawVine(ctx, event, grown, false, now);

  // the lock's price, flaring and shaking as the vine closes round it
  const rect = getFloorRect(event.locked);
  if (rect) {
    const since = event.wrappedAt === null ? Infinity : now - event.wrappedAt;
    const shake =
      since < LOCK_SHAKE_MS
        ? 0.15 * Math.sin(since / 25) * (1 - since / LOCK_SHAKE_MS)
        : 0;
    const lock = getLockCenter();
    ctx.save();
    ctx.translate(rect.left, rect.top);
    drawFloorLockPrice(
      ctx,
      event.locked.unlockCost,
      shake,
      Math.max(0, 1 - since / LOCK_SHAKE_MS),
    );
    drawWhiteBurst(ctx, lock.x, lock.y, since / BURST_MS, 0.5);
    ctx.restore();
  }

  drawVine(ctx, event, grown, true, now);
  const { growMs } = CONFIG.beanstalkEvent;
  drawWisp(
    ctx,
    (t) => (t < 0 || t > growMs ? null : vineAt(event, progressAt(t))),
    ms,
    now,
    WISP_SIZE,
  );
  if (event.bloomedAt !== null) {
    const top = vineAt(event, 1);
    drawExplosion(
      ctx,
      top.x,
      top.y,
      now - event.bloomedAt,
      now,
      0.6,
      FLOOR_W * 0.35,
      22,
    );
  }
}

function startBeanstalk(floor: Floor, context: EventProcContext): void {
  if (running || isScreenFrozen()) return;
  const locked = findLocked(floor, context);
  const rect = locked && context.getFloorRect?.(locked);
  const unlockFloorFree = context.unlockFloorFree;
  if (!locked || !rect || !unlockFloorFree) return;
  const { growMs, holdMs, secondUnlockMs } = CONFIG.beanstalkEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  // up from the top unlocked floor, round the locked one and the next above it
  const baseY = rect.top + FLOOR_H + SPROUT;
  const topY = rect.top - FLOOR_H;
  const event: RunningBeanstalk = {
    locked,
    centerX: rect.left + FLOOR_W / 2,
    baseY,
    topY,
    wrapShare: (baseY - rect.top) / (baseY - topY),
    startedAt: performance.now(),
    wrappedAt: null,
    bloomedAt: null,
  };
  running = event;
  const isLive = () => running === event;
  setFloorLockPriceHidden(locked);
  freezeScreen(drawOverlay);
  playSwoosh();
  const stopSound = startBoostEventStreamLoop();

  setTimeout(() => {
    if (!isLive()) return;
    event.wrappedAt = performance.now();
    shakeScreen(0.5);
    playSwoosh();
  }, timeAt(event.wrapShare));
  setTimeout(() => {
    if (!isLive()) return;
    event.bloomedAt = performance.now();
    stopSound();
    playExplosion();
    shakeScreen(0.8);
  }, growMs);

  setTimeout(() => {
    if (!isLive()) return;
    running = null;
    setFloorLockPriceHidden(null);
    unfreezeScreen();
    // the floor it wound round, then the one queued above it in turn
    unlockFloorFree(locked);
    setTimeout(() => {
      const next = context.floors.find((f) => !f.unlocked);
      if (next && !isFloorLocked(next)) unlockFloorFree(next);
      // the covered crit's own tier
      context.applyTierCrit?.(floor, tier);
      endEventProc(KEY);
    }, secondUnlockMs);
  }, growMs + holdMs);
}
