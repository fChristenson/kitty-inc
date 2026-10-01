// the "Wisp" event: it covers its crit, whose click freezes the screen while a
// playful wisp (shared/wisp) flits in from off screen like a will-o'-the-wisp,
// swooping from target to target and hovering over each to sprinkle golden
// glitter on it: a worker climbs one perma tier, a floor's income bar climbs
// one crit tier, and a floor's "Lvl N" label gains free levels. Then it flits
// off, the screen unfreezes and the crit's tier pays out
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { randomInt } from "../../utils";
import { playSwoosh, startBoostEventStreamLoop } from "../../sound";
import {
  CRIT_TIER_ORDER,
  nextCritTier,
  pickCritTierByOdds,
} from "../../shared/critTypes";
import { triggerEventEndSlam } from "../../shared/eventEndSlam";
import { drawWhiteBurst } from "../../shared/eventFx";
import { hash01 } from "../../shared/twinkle";
import {
  drawGlitterLight,
  drawWisp,
  swoop,
  WISP_SIZE,
} from "../../shared/wisp";
import { isFloorLocked } from "../../shared/detachedJob";
import {
  freezeScreen,
  getScreenFreezeDim,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../shared/screenFreeze";
import {
  BAR_W,
  drawIncomePanel,
  getIncomeBarCenter,
  setIncomePanelsHidden,
} from "../incomePanel";
import {
  drawUpgradeStarSpotlight,
  getStarRightX,
  setUpgradeStarsHidden,
  STAR_BOTTOM_Y,
  STAR_X,
  STAR_Y,
} from "../star";
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
  promoteWorkerPermaTier,
  setWorkerSpotlights,
  WORKER_HEIGHT,
} from "../worker";
import { findOnScreenWorkers } from "../onScreenWorkers";

const KEY = "wisp";
// it hovers this far above each target, sweeping 2-3 times back and forth
// across it (at least SWEEP_MIN px either way) while it sprinkles
const HOVER_RISE = 80;
const SWEEPS: [number, number] = [2, 3];
const SWEEP_MIN = 40;
const SWEEP_DIP = 10;
// each swoop bows out up to SWOOP_BEND of its length, wiggling WIGGLES times
const SWOOP_BEND = 0.35;
const WIGGLES = 1.5;
const WIGGLE_AMP = 26;
// a constant playful bob
const BOB = 7;
// it enters and leaves this far past the screen's edges
const OFF_SCREEN = 120;
// the glitter it sprinkles while sweeping: one speck every SPRINKLE_GAP_MS,
// falling from the wisp straight down onto the target over FALL_MS
const SPRINKLE_GAP_MS = 10;
const FALL_MS = 420;
const SPECK_SIZE = 12;
// the reward lands this far into the sprinkle
const REWARD_AT = 0.7;
const BURST_MS = 450;

type Point = { x: number; y: number };
type StopKind = "worker" | "bar" | "level";

interface Stop {
  kind: StopKind;
  floor: Floor;
  isGroundFloor: boolean;
  workerIndex: number;
  // floor-local target point, and half the width the glitter spreads over
  x: number;
  y: number;
  spread: number;
  reachedAt: number | null;
}

interface RunningWisp {
  stops: Stop[];
  // world space, off the screen's edges
  from: Point;
  to: Point;
  startedAt: number;
}

let running: RunningWisp | null = null;

// every worker, bar and level label in view the wisp could bless
function findTargets(floor: Floor, context: EventProcContext): Stop[] {
  const onScreen = context.getOnScreenFloors?.() ?? [];
  if (!onScreen.some((entry) => entry.floor === floor)) return [];
  const stop = (
    kind: StopKind,
    f: Floor,
    x: number,
    y: number,
    spread: number,
    workerIndex = -1,
  ): Stop => ({
    kind,
    floor: f,
    isGroundFloor: context.floors.indexOf(f) === 0,
    workerIndex,
    x,
    y,
    spread,
    reachedAt: null,
  });
  const targets: Stop[] = (
    findOnScreenWorkers(floor, context.getOnScreenFloors) ?? []
  )
    .filter((w) => getBoostEventCandidates(w.floor).includes(w.workerIndex))
    .map((w) =>
      stop(
        "worker",
        w.floor,
        w.center.x,
        w.center.y,
        WORKER_HEIGHT * 0.25,
        w.workerIndex,
      ),
    );
  for (const entry of onScreen) {
    const f = entry.floor;
    if (!f.unlocked || isFloorLocked(f)) continue;
    const bar = getIncomeBarCenter(context.floors.indexOf(f) === 0);
    if (
      f.critMultiplierTier !== CRIT_TIER_ORDER[0] &&
      isVisibleOnFloor(entry, bar.y)
    )
      targets.push(stop("bar", f, bar.x, bar.y, BAR_W * 0.4));
    const labelY = (STAR_Y + STAR_BOTTOM_Y) / 2;
    if (context.upgradeFloorFree && isVisibleOnFloor(entry, labelY)) {
      const halfWidth = (getStarRightX(f) - STAR_X) / 2;
      targets.push(stop("level", f, STAR_X + halfWidth, labelY, halfWidth));
    }
  }
  return targets;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.wispEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, context) =>
      !running &&
      !isScreenFrozen() &&
      context.getScreenAreaLocal !== undefined &&
      findTargets(floor, context).length > 0,
    arm: startWisp,
  },
  { label: "Wisp", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Wisp
export function forceWispEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

// where the wisp hovers over each stop, in world space; null while a floor is out of view
function hoverPoints(
  wisp: RunningWisp,
  getFloorRect: FloorRectResolver,
): (Point | null)[] {
  return wisp.stops.map((stop) => {
    const rect = getFloorRect(stop.floor);
    return rect && { x: rect.left + stop.x, y: rect.top + stop.y - HOVER_RISE };
  });
}

// the wisp `ms` in: swooping to each stop in turn, sweeping back and forth
// over it while it sprinkles, then swooping off the screen
function wispAt(wisp: RunningWisp, hovers: Point[], ms: number): Point {
  const { flyMs, sprinkleMs } = CONFIG.wispEvent;
  const legMs = flyMs + sprinkleMs;
  const k = Math.min(hovers.length, Math.floor(Math.max(0, ms) / legMs));
  const within = Math.max(0, ms) - k * legMs;
  const bob = { x: Math.cos(ms / 260) * BOB, y: Math.sin(ms / 190) * BOB };
  const from = k === 0 ? wisp.from : hovers[k - 1];
  if (k === hovers.length || within < flyMs) {
    const point = swoop(
      from,
      hovers[k] ?? wisp.to,
      clamp01(within / flyMs),
      k,
      SWOOP_BEND,
      WIGGLES,
      WIGGLE_AMP,
    );
    return { x: point.x + bob.x, y: point.y + bob.y };
  }
  const h = (within - flyMs) / sprinkleMs;
  const sweeps =
    SWEEPS[0] + Math.floor(hash01(k, 7) * (SWEEPS[1] - SWEEPS[0] + 1));
  const reach = Math.max(SWEEP_MIN, wisp.stops[k].spread);
  const phase = h * sweeps * Math.PI * 2;
  const settle = Math.min(1, h * 6, (1 - h) * 6);
  return {
    x: hovers[k].x + Math.sin(phase) * reach + bob.x,
    // riding up at each end of a pass, like a pendulum
    y: hovers[k].y - Math.abs(Math.cos(phase)) * SWEEP_DIP * settle + bob.y,
  };
}

// glitter it sprinkles, falling from where it was onto the target
function drawSprinkle(
  ctx: CanvasRenderingContext2D,
  wisp: RunningWisp,
  hovers: Point[],
  k: number,
  ms: number,
  now: number,
): void {
  const { flyMs, sprinkleMs } = CONFIG.wispEvent;
  const start = k * (flyMs + sprinkleMs) + flyMs;
  const targetY = hovers[k].y + HOVER_RISE;
  for (
    let e = Math.floor((ms - start) / SPRINKLE_GAP_MS);
    e >= 0 && e * SPRINKLE_GAP_MS > ms - start - FALL_MS;
    e--
  ) {
    const bornAt = start + e * SPRINKLE_GAP_MS;
    if (bornAt > start + sprinkleMs) continue;
    const t = (ms - bornAt) / FALL_MS;
    const from = wispAt(wisp, hovers, bornAt);
    // flicked out a little sideways, then falling ever faster
    const drift = (hash01(k, e) - 0.5) * 2 * 18;
    drawGlitterLight(
      ctx,
      from.x + drift * Math.sqrt(t) + Math.sin(t * 7 + e) * 4,
      from.y + (targetY - from.y) * t * t,
      SPECK_SIZE * (0.5 + 0.6 * hash01(e, k)) * (1 - 0.5 * t),
      e,
      1,
      now,
    );
  }
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const wisp = running;
  if (!wisp) return;
  const now = performance.now();
  const ms = now - wisp.startedAt;
  const dim = `brightness(${1 - getScreenFreezeDim()})`;

  for (const stop of wisp.stops) {
    const rect = getFloorRect(stop.floor);
    if (!rect) continue;
    ctx.save();
    ctx.translate(rect.left, rect.top);
    if (stop.reachedAt === null) ctx.filter = dim;
    if (stop.kind === "worker")
      drawWorkerSpotlight(ctx, stop.floor, stop.workerIndex, 0, 0);
    else if (stop.kind === "bar")
      drawIncomePanel(ctx, stop.floor, stop.isGroundFloor, {
        whiteAlpha: 0,
        rotation: 0,
      });
    else drawUpgradeStarSpotlight(ctx, stop.floor);
    ctx.filter = "none";
    if (stop.reachedAt !== null)
      drawWhiteBurst(
        ctx,
        stop.x,
        stop.y,
        (now - stop.reachedAt) / BURST_MS,
        0.3,
      );
    ctx.restore();
  }

  const hovers = hoverPoints(wisp, getFloorRect);
  if (hovers.some((h) => h === null)) return;
  const points = hovers as Point[];
  wisp.stops.forEach((_, k) => drawSprinkle(ctx, wisp, points, k, ms, now));
  drawWisp(ctx, (t) => wispAt(wisp, points, t), ms, now, WISP_SIZE);
}

// nearest first from the entry point, so the wisp doesn't zigzag the whole screen
function orderStops(stops: Stop[], from: Point, worldOf: (s: Stop) => Point) {
  const left = [...stops];
  const ordered: Stop[] = [];
  let at = from;
  while (left.length > 0) {
    let best = 0;
    left.forEach((s, i) => {
      const p = worldOf(s);
      const q = worldOf(left[best]);
      if (
        Math.hypot(p.x - at.x, p.y - at.y) < Math.hypot(q.x - at.x, q.y - at.y)
      )
        best = i;
    });
    const [next] = left.splice(best, 1);
    ordered.push(next);
    at = worldOf(next);
  }
  return ordered;
}

function startWisp(floor: Floor, context: EventProcContext): void {
  if (running || isScreenFrozen()) return;
  const rect = context.getFloorRect?.(floor);
  const area = context.getScreenAreaLocal?.(floor);
  const targets = findTargets(floor, context);
  if (!rect || !area || targets.length === 0) return;
  const { flyMs, sprinkleMs, holdMs, minStops, maxStops, levels } =
    CONFIG.wispEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const onScreen = context.getOnScreenFloors?.() ?? [];
  const worldOf = (s: Stop): Point => ({
    x: rect.left + s.x,
    y: (onScreen.find((e) => e.floor === s.floor)?.top ?? rect.top) + s.y,
  });
  // in from one side, out the other
  const fromLeft = Math.random() < 0.5;
  const sideX = (left: boolean) =>
    rect.left + (left ? area.left - OFF_SCREEN : area.right + OFF_SCREEN);
  const screenY = (share: number) =>
    rect.top + area.top + (area.bottom - area.top) * share;
  const from = { x: sideX(fromLeft), y: screenY(0.2 + Math.random() * 0.3) };
  const to = { x: sideX(!fromLeft), y: screenY(0.1 + Math.random() * 0.3) };
  const picked = [...targets]
    .sort(() => Math.random() - 0.5)
    .slice(0, randomInt(minStops, maxStops));
  const wisp: RunningWisp = {
    stops: orderStops(picked, from, worldOf),
    from,
    to,
    startedAt: performance.now(),
  };
  running = wisp;
  const isLive = () => running === wisp;

  const workersByFloor = new Map<Floor, number[]>();
  for (const s of wisp.stops)
    if (s.kind === "worker")
      workersByFloor.set(s.floor, [
        ...(workersByFloor.get(s.floor) ?? []),
        s.workerIndex,
      ]);
  setWorkerSpotlights(
    [...workersByFloor].map(([f, workerIndexes]) => ({
      floor: f,
      workerIndexes,
    })),
  );
  setIncomePanelsHidden(
    wisp.stops.filter((s) => s.kind === "bar").map((s) => s.floor),
  );
  setUpgradeStarsHidden(
    wisp.stops.filter((s) => s.kind === "level").map((s) => s.floor),
  );
  freezeScreen(drawOverlay);
  const stopSound = startBoostEventStreamLoop();

  const legMs = flyMs + sprinkleMs;
  wisp.stops.forEach((stop, k) => {
    setTimeout(() => {
      if (isLive()) playSwoosh();
    }, k * legMs);
    setTimeout(
      () => {
        if (!isLive()) return;
        stop.reachedAt = performance.now();
        if (stop.kind === "worker") {
          promoteWorkerPermaTier(stop.floor, stop.workerIndex);
          celebrateWorkerBoost(stop.floor, stop.workerIndex, Date.now());
        } else if (stop.kind === "bar") {
          stop.floor.critMultiplierTier = nextCritTier(
            stop.floor.critMultiplierTier,
          );
          triggerEventEndSlam(stop.floor, "bar");
        } else {
          context.upgradeFloorFree?.(stop.floor, levels);
          triggerEventEndSlam(stop.floor, "star");
        }
      },
      k * legMs + flyMs + sprinkleMs * REWARD_AT,
    );
  });
  const leaveAt = wisp.stops.length * legMs;
  setTimeout(() => {
    if (isLive()) playSwoosh();
  }, leaveAt);

  setTimeout(
    () => {
      if (!isLive()) return;
      running = null;
      stopSound();
      clearWorkerSpotlight();
      setIncomePanelsHidden([]);
      setUpgradeStarsHidden([]);
      unfreezeScreen();
      // the covered crit's own tier, which also saves the blessings
      context.applyTierCrit?.(floor, tier);
      endEventProc(KEY);
    },
    leaveAt + flyMs + holdMs,
  );
}
