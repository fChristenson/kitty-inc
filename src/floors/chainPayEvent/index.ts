// the "Chain Pay" event: it covers its crit, whose click freezes the screen
// while a coin stream hops from the clicked floor's button to the nearest
// on-screen worker, then on worker to worker, each one slamming as it's paid,
// and the last one fires it all into the total. The n-th worker reached pays
// the floor's payout n times over, then the crit's tier pays out
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playBoostEventStream, playSold } from "../../sound";
import {
  addTargetStream,
  createEventFx,
  removeTargetStream,
  type EventFx,
} from "../../shared/eventFx";
import { GLOBAL_SLAM, triggerEventEndSlam } from "../../shared/eventEndSlam";
import { multiply } from "../../shared/bigNumber";
import { pickCritTierByOdds } from "../../shared/critTypes";
import {
  pulseHudTotalFlash,
  triggerHudTotalFlash,
} from "../../shared/totalIncomeCoins";
import {
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../shared/screenFreeze";
import { drawEventStreams, streamCoins } from "../../shared/eventStream";
import { addTotalIncome } from "../../totalIncome";
import { rewardPayoutAmount } from "../incomePanel";
import {
  clearUpgradeButtonSpotlights,
  drawUpgradeButtonSpotlight,
  forceTestCrit,
  getButtonCenter,
  setUpgradeButtonSpotlights,
} from "../upgradeButton";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../eventProcs";
import {
  clearWorkerSpotlight,
  drawWorkerSpotlight,
  setWorkerSpotlights,
} from "../worker";
import {
  findOnScreenWorkers,
  nearestChain,
  type OnScreenWorker,
} from "../onScreenWorkers";

const KEY = "chainPay";

interface RunningChain {
  floor: Floor;
  isGroundFloor: boolean;
  workers: OnScreenWorker[];
  totalFx: EventFx | null;
}

let running: RunningChain | null = null;

type Stop = { floor: Floor; top: number; x: number; y: number };

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.chainPayEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, { getOnScreenFloors }) =>
      !running &&
      !isScreenFrozen() &&
      (findOnScreenWorkers(floor, getOnScreenFloors)?.length ?? 0) > 0,
    arm: startChain,
  },
  { label: "Chain Pay", color: COLOR.coinGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Chain Pay
export function forceChainPayEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
  totalTarget: { x: number; y: number },
): void {
  const chain = running;
  if (!chain) return;
  for (const { floor, workerIndex } of chain.workers) {
    const rect = getFloorRect(floor);
    if (!rect) continue;
    ctx.save();
    ctx.translate(rect.left, rect.top);
    drawWorkerSpotlight(ctx, floor, workerIndex, 0, 0);
    ctx.restore();
  }
  const rect = getFloorRect(chain.floor);
  if (rect) {
    ctx.save();
    ctx.translate(rect.left, rect.top);
    drawUpgradeButtonSpotlight(ctx, chain.floor, chain.isGroundFloor, 0);
    ctx.restore();
  }
  drawEventStreams(ctx, getFloorRect, totalTarget);
}

function startChain(floor: Floor, context: EventProcContext): void {
  if (running || isScreenFrozen()) return;
  const found = findOnScreenWorkers(floor, context.getOnScreenFloors);
  if (!found || found.length === 0) return;
  const { hopMs, payoutMs, maxWorkers } = CONFIG.chainPayEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const floorTop = context.getOnScreenFloors!().find(
    (entry) => entry.floor === floor,
  )!.top;
  const button = getButtonCenter(context.isGroundFloor);
  const start: Stop = { floor, top: floorTop, ...button };
  // from the button, always on to the nearest worker not yet reached
  const workers = nearestChain(
    { x: start.x, y: start.y + start.top },
    found,
    maxWorkers,
  );
  const chain: RunningChain = {
    floor,
    isGroundFloor: context.isGroundFloor,
    workers,
    totalFx: null,
  };
  running = chain;
  const isLive = () => running === chain;
  setWorkerSpotlights(
    workers.map(({ floor: f, workerIndex }) => ({
      floor: f,
      workerIndexes: [workerIndex],
    })),
  );
  setUpgradeButtonSpotlights([floor]);
  freezeScreen(drawOverlay, { spotlightTotal: true });
  playBoostEventStream();

  // each hop streams from the last stop into the next worker, seen from the last stop's floor
  const stops: Stop[] = [
    start,
    ...workers.map((w) => ({ floor: w.floor, top: w.top, ...w.center })),
  ];
  workers.forEach((worker, i) => {
    const from = stops[i];
    const to = stops[i + 1];
    setTimeout(() => {
      if (!isLive()) return;
      streamCoins([{ floor: from.floor, x: from.x, y: from.y }], {
        target: { x: to.x, y: to.y + to.top - from.top },
        durationMs: hopMs,
        isRunning: isLive,
      });
    }, i * hopMs);
    setTimeout(
      () => {
        if (isLive())
          triggerEventEndSlam(worker.floor, `worker${worker.workerIndex}`);
      },
      (i + 1) * hopMs,
    );
  });

  // then the last worker fires it all into the total
  const chainMs = workers.length * hopMs;
  setTimeout(() => {
    if (!isLive()) return;
    const totalFx = createEventFx(payoutMs);
    chain.totalFx = totalFx;
    addTargetStream(GLOBAL_SLAM, "total", totalFx, true);
    playBoostEventStream();
    const last = stops[stops.length - 1];
    streamCoins([{ floor: last.floor, x: last.x, y: last.y }], {
      durationMs: payoutMs,
      isRunning: isLive,
      onEachArrive: pulseHudTotalFlash,
    });
  }, chainMs);

  setTimeout(() => {
    if (!isLive()) return;
    running = null;
    if (chain.totalFx) removeTargetStream(chain.totalFx);
    clearWorkerSpotlight();
    clearUpgradeButtonSpotlights();
    unfreezeScreen();
    // the n-th worker reached pays n payouts: 1 + 2 + ... + n
    const n = workers.length;
    addTotalIncome(
      multiply(rewardPayoutAmount(floor, Date.now()), (n * (n + 1)) / 2),
    );
    triggerHudTotalFlash();
    triggerEventEndSlam(GLOBAL_SLAM, "total", () =>
      context.applyTierCrit?.(floor, tier),
    );
    playSold();
    endEventProc(KEY);
  }, chainMs + payoutMs);
}
