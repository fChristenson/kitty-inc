// the "Head Hop" event: it covers its crit, whose click freezes the screen
// while the wisp bounces in from off the screen's left edge onto the clicked
// floor and hops across its workers' heads one after another, ever faster:
// each head it lands on squashes down with a boing, a flash and a jolt, and
// that worker climbs one perma tier. The last head gets the biggest bounce
// of all, a blast and a big shake that rockets the wisp up off the screen.
// Then the screen unfreezes and the crit's tier pays out
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop, startBoostEventStreamLoop } from "../../../../sound";
import { playSlamExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawExplosion, drawWhiteBurst } from "../../../../shared/eventFx";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import {
  drawFreezeDimmed,
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../../../shared/screenFreeze";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
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
  promoteWorkerPermaTier,
  WORKER_FEET_Y,
  WORKER_HEIGHT,
} from "../../../../floors/worker";
import {
  findOnScreenWorkers,
  isClimber,
  spotlightWorkers,
  type OnScreenWorker,
} from "../../onScreenWorkers";
import { lerp } from "../../../../shared/easing";

const KEY = "headHop";
// the ball's radius, touching each head as it lands
const BALL_R = WISP_SIZE * 0.35;
// it comes in from this far off the screen's left edge, this far above the
// heads, and each hop arcs HOP px high; the last rockets up off the screen
const OUT = 80;
const ENTRY_ABOVE = 240;
const HOP = 150;
// each head: squashed to SQUASH tall, springing back
const SQUASH = 0.6;
const SPRING_MS = 130;
const HOP_SHAKE = 0.6;
const HOP_BURST = 0.3;
const HOP_BURST_MS = 300;
// the last head
const FINAL_SQUASH = 0.4;
const FINAL_SHAKE = 2.4;
const FINAL_SCALE = 1.6;
const SPARK_REACH = 320;
const SPARK_SIZE = 20;

interface Head {
  worker: OnScreenWorker;
  climbs: boolean;
  // where the ball touches it, local to the floor, and when (ms in)
  top: Point;
  at: number;
  hitAt: number | null;
}

interface RunningHop {
  floor: Floor;
  heads: Head[];
  from: Point;
  area: { left: number; top: number; right: number; bottom: number };
  startedAt: number;
}

let running: RunningHop | null = null;

// every worker on floor in view, left to right
function headsOn(floor: Floor, context: EventProcContext): OnScreenWorker[] {
  return (findOnScreenWorkers(floor, context.getOnScreenFloors) ?? [])
    .filter((w) => w.floor === floor)
    .sort((a, b) => a.center.x - b.center.x);
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.headHopEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, context) =>
      !running &&
      !isScreenFrozen() &&
      context.getScreenAreaLocal !== undefined &&
      headsOn(floor, context).some(isClimber),
    arm: startHop,
  },
  { label: "Head Hop", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Head Hop
export function forceHeadHopEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

// the ball ms in: dropping in, hopping head to head in arcs, then rocketing
// up off the screen from the last
function ballAt(hop: RunningHop, ms: number): Point | null {
  const { entryMs, launchMs } = CONFIG.headHopEvent;
  const { heads, from, area } = hop;
  if (ms < 0) return null;
  const first = heads[0];
  if (ms < first.at) {
    const u = ms / entryMs;
    return {
      x: from.x + (first.top.x - from.x) * u,
      y: from.y + (first.top.y - from.y) * u * u,
    };
  }
  for (let i = 1; i < heads.length; i++) {
    const a = heads[i - 1];
    const b = heads[i];
    if (ms < b.at) {
      const u = (ms - a.at) / (b.at - a.at);
      return {
        x: a.top.x + (b.top.x - a.top.x) * u,
        y: a.top.y + (b.top.y - a.top.y) * u - HOP * 4 * u * (1 - u),
      };
    }
  }
  const last = heads[heads.length - 1];
  const u = (ms - last.at) / launchMs;
  if (u >= 1) return null;
  return {
    x: last.top.x + 120 * u,
    y: last.top.y + (area.top - OUT - last.top.y) * (1 - (1 - u) ** 2),
  };
}

// a head's squash since it was landed on
function squashOf(head: Head, last: boolean, now: number): number {
  if (head.hitAt === null) return 1;
  const t = now - head.hitAt;
  const depth = 1 - (last ? FINAL_SQUASH : SQUASH);
  return 1 - depth * Math.exp(-t / SPRING_MS) * Math.cos(t / 40);
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const hop = running;
  if (!hop) return;
  const rect = getFloorRect(hop.floor);
  if (!rect) return;
  const now = performance.now();
  const ms = now - hop.startedAt;
  hop.heads.forEach((head, i) => {
    if (head.hitAt === null && ms >= head.at)
      land(head, i === hop.heads.length - 1, now);
  });
  ctx.save();
  ctx.translate(rect.left, rect.top);

  const drawHead = (c: CanvasRenderingContext2D, head: Head, last: boolean) => {
    const { worker } = head;
    const scaleY = squashOf(head, last, now);
    c.save();
    c.translate(worker.center.x, WORKER_FEET_Y);
    c.scale(1 / Math.sqrt(scaleY), scaleY);
    c.translate(-worker.center.x, -WORKER_FEET_Y);
    drawWorkerSpotlight(c, worker.floor, worker.workerIndex, 0, 0);
    c.restore();
  };
  drawFreezeDimmed(
    ctx,
    (layer) =>
      hop.heads.forEach((head, i) => {
        if (head.hitAt === null)
          drawHead(layer, head, i === hop.heads.length - 1);
      }),
    [hop, hop.heads.filter((head) => head.hitAt === null).length],
  );
  hop.heads.forEach((head, i) => {
    if (head.hitAt === null) return;
    const last = i === hop.heads.length - 1;
    drawHead(ctx, head, last);
    if (last)
      drawExplosion(
        ctx,
        head.top.x,
        head.top.y,
        now - head.hitAt,
        now,
        FINAL_SCALE,
        SPARK_REACH,
        SPARK_SIZE,
      );
    else
      drawWhiteBurst(
        ctx,
        head.top.x,
        head.top.y,
        (now - head.hitAt) / HOP_BURST_MS,
        HOP_BURST,
      );
  });
  drawWisp(ctx, (t) => ballAt(hop, t), ms, now, WISP_SIZE, 1);
  ctx.restore();
}

// on the frame the ball lands on a head
function land(head: Head, last: boolean, now: number): void {
  head.hitAt = now;
  if (last) {
    playSlamExplosion();
    shakeScreen(FINAL_SHAKE);
  } else {
    playBloop();
    shakeScreen(HOP_SHAKE);
  }
  if (!head.climbs) return;
  promoteWorkerPermaTier(head.worker.floor, head.worker.workerIndex);
  celebrateWorkerBoost(head.worker.floor, head.worker.workerIndex, Date.now());
}

function startHop(floor: Floor, context: EventProcContext): void {
  const area = context.getScreenAreaLocal?.(floor);
  const workers = headsOn(floor, context);
  if (running || isScreenFrozen() || !area || workers.length === 0) return;
  const { entryMs, firstHopMs, lastHopMs, launchMs, holdMs } =
    CONFIG.headHopEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const headY = WORKER_FEET_Y - WORKER_HEIGHT - BALL_R;
  let at = entryMs;
  const heads: Head[] = workers.map((worker, i) => {
    const head: Head = {
      worker,
      climbs: isClimber(worker),
      top: { x: worker.center.x, y: headY },
      at,
      hitAt: null,
    };
    at += lerp([firstHopMs, lastHopMs], i / Math.max(1, workers.length - 2));
    return head;
  });
  const hop: RunningHop = {
    floor,
    heads,
    from: { x: area.left - OUT, y: headY - ENTRY_ABOVE },
    area,
    startedAt: performance.now(),
  };
  running = hop;
  const isLive = () => running === hop;
  spotlightWorkers(workers);
  freezeScreen(drawOverlay);
  const stopSound = startBoostEventStreamLoop();

  setTimeout(
    () => {
      if (!isLive()) return;
      for (const head of heads)
        if (head.hitAt === null && head.climbs)
          promoteWorkerPermaTier(head.worker.floor, head.worker.workerIndex);
      running = null;
      stopSound();
      clearWorkerSpotlight();
      unfreezeScreen();
      // the covered crit's own tier, which also saves the promotions
      context.applyTierCrit?.(floor, tier);
      endEventProc(KEY);
    },
    heads[heads.length - 1].at + Math.max(launchMs, holdMs),
  );
}
