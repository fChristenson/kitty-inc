// the "Payday" event: it covers its crit, whose click freezes the screen while
// every on-screen worker and manager streams coins back into the clicked
// floor's button, which then fires them all as one big stream into the total.
// It pays the floor's payout once per worker that chipped in, then the crit's
// tier pays out
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
import { pickAtMost, pickCritTierByOdds } from "../../shared/critTypes";
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
import { currentPayoutAmount } from "../incomePanel";
import {
  BTN_H,
  BTN_W,
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
  findOnScreenWorkers as findWorkers,
  type OnScreenWorker as Worker,
} from "../onScreenWorkers";

const KEY = "payday";

interface RunningPayday {
  floor: Floor;
  isGroundFloor: boolean;
  workers: Worker[];
  // the button swelling as the workers' coins land, then the total as it fills
  buttonFx: EventFx;
  totalFx: EventFx | null;
}

let running: RunningPayday | null = null;

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.paydayEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, { getOnScreenFloors }) =>
      !running &&
      !isScreenFrozen() &&
      (findWorkers(floor, getOnScreenFloors)?.length ?? 0) > 0,
    arm: startPayday,
  },
  { label: "Payday", color: COLOR.moneyGreen },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Payday
export function forcePaydayEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
  totalTarget: { x: number; y: number },
): void {
  const payday = running;
  if (!payday) return;
  const now = performance.now();
  // the workers wiggle while they pay in, then settle
  const { white, rotation } = payday.totalFx
    ? { white: 0, rotation: 0 }
    : payday.buttonFx.tension(now);
  for (const { floor, workerIndex } of payday.workers) {
    const rect = getFloorRect(floor);
    if (!rect) continue;
    ctx.save();
    ctx.translate(rect.left, rect.top);
    drawWorkerSpotlight(ctx, floor, workerIndex, white, rotation);
    ctx.restore();
  }
  const rect = getFloorRect(payday.floor);
  if (rect) {
    ctx.save();
    ctx.translate(rect.left, rect.top);
    const center = getButtonCenter(payday.isGroundFloor);
    payday.buttonFx.draw(ctx, center.x, center.y, (tension) =>
      drawUpgradeButtonSpotlight(
        ctx,
        payday.floor,
        payday.isGroundFloor,
        tension.white,
      ),
    );
    ctx.restore();
  }
  // the spotlit total, with its lights and beats, is drawn live on top by the game canvas
  drawEventStreams(ctx, getFloorRect, totalTarget);
}

function startPayday(floor: Floor, context: EventProcContext): void {
  if (running || isScreenFrozen()) return;
  const found = findWorkers(floor, context.getOnScreenFloors);
  if (!found || found.length === 0) return;
  const { gatherMs, payoutMs, maxWorkers } = CONFIG.paydayEvent;
  const workers = pickAtMost(found, maxWorkers);
  const tier = context.critTier ?? pickCritTierByOdds();
  const floorTop = context.getOnScreenFloors!().find(
    (entry) => entry.floor === floor,
  )!.top;
  const button = getButtonCenter(context.isGroundFloor);
  const payday: RunningPayday = {
    floor,
    isGroundFloor: context.isGroundFloor,
    workers,
    buttonFx: createEventFx(gatherMs),
    totalFx: null,
  };
  running = payday;
  const isLive = () => running === payday;
  setWorkerSpotlights(
    workers.map(({ floor: f, workerIndex }) => ({
      floor: f,
      workerIndexes: [workerIndex],
    })),
  );
  setUpgradeButtonSpotlights([floor]);
  freezeScreen(drawOverlay, { spotlightTotal: true });
  playBoostEventStream();

  // a whole stream from every worker, each aimed at the button as seen from
  // its own floor
  streamCoins(
    workers.map((w) => ({
      floor: w.floor,
      x: w.center.x,
      y: w.center.y,
      target: { x: button.x, y: button.y + floorTop - w.top },
    })),
    {
      durationMs: gatherMs,
      isRunning: isLive,
      onEachArrive: () => payday.buttonFx.hit(performance.now()),
      fullPerSource: true,
    },
  );

  // then the button fires it all into the total
  setTimeout(() => {
    if (!isLive()) return;
    const totalFx = createEventFx(payoutMs);
    payday.totalFx = totalFx;
    addTargetStream(GLOBAL_SLAM, "total", totalFx, true);
    playBoostEventStream();
    streamCoins(
      [
        {
          floor,
          x: button.x,
          y: button.y,
          spreadX: BTN_W * 0.75,
          spreadY: BTN_H / 2,
        },
      ],
      {
        durationMs: payoutMs,
        isRunning: isLive,
        onEachArrive: pulseHudTotalFlash,
      },
    );
  }, gatherMs);

  setTimeout(() => {
    if (!isLive()) return;
    running = null;
    if (payday.totalFx) removeTargetStream(payday.totalFx);
    clearWorkerSpotlight();
    clearUpgradeButtonSpotlights();
    unfreezeScreen();
    addTotalIncome(
      multiply(currentPayoutAmount(floor, Date.now()), workers.length),
    );
    triggerHudTotalFlash();
    // the covered crit's own tier, revealed as the total jumps
    triggerEventEndSlam(GLOBAL_SLAM, "total", () =>
      context.applyTierCrit?.(floor, tier),
    );
    playSold();
    endEventProc(KEY);
  }, gatherMs + payoutMs);
}
