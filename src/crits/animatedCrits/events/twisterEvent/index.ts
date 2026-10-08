// the "Twister" event: it covers its crit, whose click freezes the screen
// while a funnel of coins spins up on the button and zigzags across the
// screen, row by row, through every worker in view; each one it passes gets
// a short stream sucked out of it into the funnel, which then lifts off and
// spins up into the total. It pays the floor's payout once per worker swept
// up, then the crit's tier pays out
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import {
  playBoostEventStream,
  playSold,
  playSwoosh,
  startBoostEventStreamLoop,
} from "../../../../sound";
import {
  addTargetStream,
  createEventFx,
  removeTargetStream,
  type EventFx,
} from "../../../../shared/eventFx";
import {
  GLOBAL_SLAM,
  triggerEventEndSlam,
} from "../../../../shared/eventEndSlam";
import { multiply } from "../../../../shared/bigNumber";
import { pickAtMost, pickCritTierByOdds } from "../../../critTypes";
import { LONG_PRESS_COIN_ARRIVE_MS } from "../../../../shared/pressAndHold";
import {
  pulseHudTotalFlash,
  triggerHudTotalFlash,
} from "../../../../shared/totalIncomeCoins";
import {
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../../../shared/screenFreeze";
import { drawEventStreams, streamCoins } from "../../../../shared/eventStream";
import { addTotalIncome } from "../../../../totalIncome";
import { rewardPayoutAmount } from "../../../../floors/incomePanel";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";
import {
  clearWorkerSpotlight,
  drawWorkerSpotlight,
  setWorkerSpotlights,
  WORKER_HEIGHT,
} from "../../../../floors/worker";
import {
  findOnScreenWorkers,
  type OnScreenWorker,
} from "../../onScreenWorkers";
import { createFunnel, drawFunnel, funnelBody, type Funnel } from "./funnel";

const KEY = "twister";
// the funnel's tip stands at a worker's feet, half its height below its center
const TIP_DROP = WORKER_HEIGHT / 2;
// coins in the funnel as it forms, and added per worker swept up
const BASE_COINS = 70;
const COINS_PER_WORKER = 12;
// a worker sucked in rocks this far (rad) while it streams
const SUCK_ROCK = 0.18;
// share of the sweep spent speeding up at its start, and slowing at its end
const RAMP = 0.15;

type Point = { x: number; y: number };

interface RunningTwister {
  floor: Floor;
  workers: OnScreenWorker[];
  funnel: Funnel;
  startedAt: number;
  // ms from startedAt
  tipAt: (ms: number) => Point;
  passAt: number[];
  liftAt: number;
  totalFx: EventFx | null;
}

let running: RunningTwister | null = null;

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.twisterEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, { getOnScreenFloors }) =>
      !running &&
      !isScreenFrozen() &&
      (findOnScreenWorkers(floor, getOnScreenFloors)?.length ?? 0) > 0,
    arm: startTwister,
  },
  { label: "Twister", color: COLOR.coinGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Twister
export function forceTwisterEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

// the workers row by row from the one nearest start, each row swept from the
// end nearest where the last one left off: a zigzag across the screen
function sweepOrder<T extends Point & { row: number }>(
  start: Point,
  stops: T[],
): T[] {
  const rows = new Map<number, T[]>();
  for (const s of stops) rows.set(s.row, [...(rows.get(s.row) ?? []), s]);
  const groups = [...rows.values()].sort((a, b) => a[0].y - b[0].y);
  if (
    Math.abs(groups[groups.length - 1][0].y - start.y) <
    Math.abs(groups[0][0].y - start.y)
  )
    groups.reverse();
  const out: T[] = [];
  let x = start.x;
  for (const group of groups) {
    group.sort((a, b) => a.x - b.x);
    if (Math.abs(group[group.length - 1].x - x) < Math.abs(group[0].x - x))
      group.reverse();
    out.push(...group);
    x = group[group.length - 1].x;
  }
  return out;
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
  totalTarget: Point,
): void {
  const twister = running;
  if (!twister) return;
  const now = performance.now();
  const ms = now - twister.startedAt;
  const { formMs, suckMs, payoutMs } = CONFIG.twisterEvent;
  twister.workers.forEach(({ floor, workerIndex }, i) => {
    const rect = getFloorRect(floor);
    if (!rect) return;
    const since = ms - twister.passAt[i] + LONG_PRESS_COIN_ARRIVE_MS;
    const rock =
      since > 0 && since < suckMs + LONG_PRESS_COIN_ARRIVE_MS
        ? SUCK_ROCK * Math.sin(now / 35)
        : 0;
    ctx.save();
    ctx.translate(rect.left, rect.top);
    drawWorkerSpotlight(ctx, floor, workerIndex, 0, rock);
    ctx.restore();
  });

  const rect = getFloorRect(twister.floor);
  if (rect) {
    // fills up as each worker's stream lands in it
    const swept = twister.passAt.reduce(
      (sum, at) =>
        sum +
        Math.min(
          1,
          Math.max(0, (ms - at - LONG_PRESS_COIN_ARRIVE_MS) / suckMs),
        ),
      0,
    );
    const formed = Math.min(1, ms / formMs);
    // a springy pop as it forms
    const pop = 1 + 0.25 * Math.sin(Math.PI * formed) * (1 - formed);
    let scale = formed * pop;
    let shown = BASE_COINS * formed + COINS_PER_WORKER * swept;
    let spin = 1;
    const tip = twister.tipAt(ms);
    let at = { x: rect.left + tip.x, y: rect.top + tip.y };
    const lift = (ms - twister.liftAt) / payoutMs;
    if (lift > 0) {
      // lifts off into the total, shrinking and spinning ever faster as it
      // pours its coins in
      const p = Math.min(1, lift);
      const e = p * p;
      at = {
        x: at.x + (totalTarget.x - at.x) * e,
        y: at.y + (totalTarget.y - at.y) * e,
      };
      scale *= 1 - 0.85 * p;
      shown *= 1 - p;
      spin = 1 + 2 * p;
    }
    drawFunnel(ctx, twister.funnel, at.x, at.y, scale, shown, spin, now);
  }
  drawEventStreams(ctx, getFloorRect, totalTarget);
}

function startTwister(floor: Floor, context: EventProcContext): void {
  if (running || isScreenFrozen()) return;
  const found = findOnScreenWorkers(floor, context.getOnScreenFloors);
  if (!found || found.length === 0) return;
  const {
    formMs,
    speed,
    minSweepMs,
    maxSweepMs,
    suckMs,
    payoutMs,
    maxWorkers,
  } = CONFIG.twisterEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const floorTop = context.getOnScreenFloors!().find(
    (entry) => entry.floor === floor,
  )!.top;
  const button = getButtonCenter(context.isGroundFloor);
  // every stop local to the clicked floor
  const stops = sweepOrder(
    button,
    pickAtMost(found, maxWorkers).map((worker) => ({
      worker,
      row: worker.top,
      x: worker.center.x,
      y: worker.center.y + worker.top - floorTop + TIP_DROP,
    })),
  );
  const workers = stops.map((s) => s.worker);
  const points: Point[] = [button, ...stops];
  const cum = [0];
  for (let i = 1; i < points.length; i++)
    cum.push(
      cum[i - 1] +
        Math.hypot(
          points[i].x - points[i - 1].x,
          points[i].y - points[i - 1].y,
        ),
    );
  const length = cum[cum.length - 1] || 1;
  const sweepMs = Math.min(
    maxSweepMs,
    Math.max(minSweepMs, (length / speed / (1 - RAMP)) * 1000),
  );
  // share of the distance covered by time share u: speeding up over the
  // first RAMP of the sweep, cruising, slowing over the last; and its inverse
  const k = 2 * RAMP * (1 - RAMP);
  const ramped = (u: number) =>
    u < RAMP
      ? (u * u) / k
      : u > 1 - RAMP
        ? 1 - ((1 - u) * (1 - u)) / k
        : (u - RAMP / 2) / (1 - RAMP);
  const edge = (RAMP * RAMP) / k;
  const unramped = (f: number) =>
    f < edge
      ? Math.sqrt(k * f)
      : f > 1 - edge
        ? 1 - Math.sqrt(k * (1 - f))
        : f * (1 - RAMP) + RAMP / 2;
  const passAt = cum
    .slice(1)
    .map((d) => formMs + sweepMs * unramped(d / length));
  const tipAt = (ms: number): Point => {
    const u = Math.min(1, Math.max(0, (ms - formMs) / sweepMs));
    const d = length * ramped(u);
    let i = 1;
    while (i < cum.length - 1 && cum[i] < d) i++;
    const span = cum[i] - cum[i - 1] || 1;
    const f = Math.min(1, (d - cum[i - 1]) / span);
    const a = points[i - 1];
    const b = points[i] ?? a;
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  };
  const liftAt = formMs + sweepMs + suckMs;
  const twister: RunningTwister = {
    floor,
    workers,
    funnel: createFunnel(BASE_COINS + COINS_PER_WORKER * workers.length),
    startedAt: performance.now(),
    tipAt,
    passAt,
    liftAt,
    totalFx: null,
  };
  running = twister;
  const isLive = () => running === twister;
  setWorkerSpotlights(
    workers.map(({ floor: f, workerIndex }) => ({
      floor: f,
      workerIndexes: [workerIndex],
    })),
  );
  freezeScreen(drawOverlay, { spotlightTotal: true });
  playSwoosh();
  const stopWind = startBoostEventStreamLoop();
  setTimeout(stopWind, liftAt);

  // as the funnel passes each worker, a short stream is sucked out of it
  workers.forEach((worker, i) => {
    setTimeout(
      () => {
        if (!isLive()) return;
        const passing = tipAt(passAt[i] + suckMs / 2);
        const body = funnelBody(passing.x, passing.y, 1);
        streamCoins(
          [{ floor: worker.floor, x: worker.center.x, y: worker.center.y }],
          {
            target: { x: body.x, y: body.y + floorTop - worker.top },
            durationMs: suckMs,
            isRunning: isLive,
            fullPerSource: true,
          },
        );
        triggerEventEndSlam(worker.floor, `worker${worker.workerIndex}`);
      },
      Math.max(0, passAt[i] - LONG_PRESS_COIN_ARRIVE_MS),
    );
  });

  // then it lifts off and pours it all into the total
  setTimeout(() => {
    if (!isLive()) return;
    const totalFx = createEventFx(payoutMs);
    twister.totalFx = totalFx;
    addTargetStream(GLOBAL_SLAM, "total", totalFx, true);
    playBoostEventStream();
    const last = tipAt(liftAt);
    const body = funnelBody(last.x, last.y, 1);
    streamCoins(
      [
        {
          floor,
          x: body.x,
          y: body.y,
          spreadX: WORKER_HEIGHT * 0.5,
          spreadY: WORKER_HEIGHT * 0.7,
        },
      ],
      {
        durationMs: payoutMs,
        isRunning: isLive,
        onEachArrive: pulseHudTotalFlash,
      },
    );
  }, liftAt);

  setTimeout(() => {
    if (!isLive()) return;
    running = null;
    if (twister.totalFx) removeTargetStream(twister.totalFx);
    clearWorkerSpotlight();
    unfreezeScreen();
    addTotalIncome(
      multiply(rewardPayoutAmount(floor, Date.now()), workers.length),
    );
    triggerHudTotalFlash();
    // the covered crit's own tier, revealed as the total jumps
    triggerEventEndSlam(GLOBAL_SLAM, "total", () =>
      context.applyTierCrit?.(floor, tier),
    );
    playSold();
    endEventProc(KEY);
  }, liftAt + payoutMs);
}
