// the "Spillover" event: it covers its crit, whose click freezes the screen
// while the button sprays coins in arcs sweeping back and forth along the
// floor's income bar, filling it to the brim; it slams full and the overflow
// spills out of it in a stream into the total. Pays the full bar plus bonus
// payouts, restarts the bar, then the crit's tier pays out
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBoostEventStream, playSold } from "../../../../sound";
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
import { pickCritTierByOdds } from "../../../critTypes";
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
import {
  BAR_W,
  rewardPayoutAmount,
  drawIncomePanel,
  getIncomeBarCenter,
  incomeBarFill,
  setIncomePanelHidden,
} from "../../../../floors/incomePanel";
import { spawnPathCoins, type CoinPath } from "../../../../floors/coins";
import { launchOver } from "../../moneyCover";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import {
  endEventProc,
  forceClaimEventProc,
  isVisibleOnFloor,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";
import { between } from "../../../../shared/easing";

const KEY = "spillover";
// the spill pours out along this much of the bar's width
const SPILL_WIDTH = 300;
const SPRAY_COINS = 160;
// how often the spray sweeps from one end of the bar to the other and back
const SWEEPS = 2;
// how high each sprayed coin's arc rises above its start and landing
const ARC_RISE: [number, number] = [90, 200];
// each coin's arc, then its short slide into the bar's middle (~16.67ms ticks)
const ARC_MS = 450;
const SLIDE_TICKS: [number, number] = [4, 8];
const TICK_MS = 1000 / 60;

// a coin's arc from the button to the bar, f (0..1) along the bar's width
function sprayArc(
  button: { x: number; y: number },
  bar: { x: number; y: number },
  f: number,
): CoinPath {
  const land = {
    x: bar.x - BAR_W / 2 + BAR_W * f,
    y: bar.y + (Math.random() - 0.5) * 30,
  };
  const rise = between(ARC_RISE);
  return (t) => ({
    x: button.x + (land.x - button.x) * t,
    y: button.y + (land.y - button.y) * t - 4 * rise * t * (1 - t),
  });
}

interface RunningSpill {
  floor: Floor;
  isGroundFloor: boolean;
  bar: { x: number; y: number };
  startedAt: number;
  startFill: number;
  barFx: EventFx;
  totalFx: EventFx | null;
}

let running: RunningSpill | null = null;

function canStart(floor: Floor, context: EventProcContext): boolean {
  if (running || isScreenFrozen()) return false;
  const entry = context.getOnScreenFloors?.().find((f) => f.floor === floor);
  return (
    entry !== undefined &&
    isVisibleOnFloor(entry, getIncomeBarCenter(context.isGroundFloor).y)
  );
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.spilloverEvent.chance,
    isInProgress: () => running !== null,
    canArm: canStart,
    arm: startSpill,
  },
  { label: "Spillover", color: COLOR.moneyGreen },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Spillover
export function forceSpilloverEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
  totalTarget: { x: number; y: number },
): void {
  const spill = running;
  if (!spill) return;
  const rect = getFloorRect(spill.floor);
  if (rect) {
    const t = Math.min(
      1,
      (performance.now() - spill.startedAt) / CONFIG.spilloverEvent.fillMs,
    );
    const fill = spill.startFill + (1 - spill.startFill) * (1 - (1 - t) ** 2);
    ctx.save();
    ctx.translate(rect.left, rect.top);
    spill.barFx.draw(ctx, spill.bar.x, spill.bar.y, ({ white, rotation }) =>
      drawIncomePanel(ctx, spill.floor, spill.isGroundFloor, {
        whiteAlpha: white,
        rotation,
        fill,
      }),
    );
    ctx.restore();
  }
  drawEventStreams(ctx, getFloorRect, totalTarget);
}

function startSpill(floor: Floor, context: EventProcContext): void {
  if (!canStart(floor, context)) return;
  const { fillMs, spillMs, bonusPayouts } = CONFIG.spilloverEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const bar = getIncomeBarCenter(context.isGroundFloor);
  const spill: RunningSpill = {
    floor,
    isGroundFloor: context.isGroundFloor,
    bar,
    startedAt: performance.now(),
    startFill: incomeBarFill(floor, Date.now()),
    barFx: createEventFx(fillMs),
    totalFx: null,
  };
  running = spill;
  const isLive = () => running === spill;
  setIncomePanelHidden(floor);
  freezeScreen(drawOverlay, { spotlightTotal: true });
  playBoostEventStream();
  // a hose sweeping back and forth along the bar
  const button = getButtonCenter(context.isGroundFloor);
  const arcs = Array.from({ length: SPRAY_COINS }, (_, i) => {
    const sweep =
      0.5 - 0.5 * Math.cos((2 * Math.PI * SWEEPS * i) / SPRAY_COINS);
    const f = Math.min(1, Math.max(0, sweep + (Math.random() - 0.5) * 0.1));
    return sprayArc(button, bar, f);
  });
  const arcTicks = ARC_MS / TICK_MS;
  launchOver(arcs, Math.max(1, fillMs - ARC_MS), isLive, (batch, lateMs) =>
    spawnPathCoins(
      floor,
      batch,
      {
        outTicks: [arcTicks * 0.95, arcTicks * 1.05],
        flightTicks: SLIDE_TICKS,
        target: bar,
        onEachArrive: () => spill.barFx.hit(performance.now()),
      },
      lateMs.map((ms) => ms / TICK_MS),
    ),
  );

  // brimming over: the bar slams full and spills into the total
  setTimeout(() => {
    if (!isLive()) return;
    triggerEventEndSlam(floor, "bar");
    const totalFx = createEventFx(spillMs);
    spill.totalFx = totalFx;
    addTargetStream(GLOBAL_SLAM, "total", totalFx, true);
    playBoostEventStream();
    streamCoins(
      [{ floor, x: bar.x, y: bar.y, spreadX: SPILL_WIDTH, spreadY: 20 }],
      {
        durationMs: spillMs,
        isRunning: isLive,
        onEachArrive: pulseHudTotalFlash,
      },
    );
  }, fillMs);

  setTimeout(() => {
    if (!isLive()) return;
    running = null;
    if (spill.totalFx) removeTargetStream(spill.totalFx);
    setIncomePanelHidden(null);
    unfreezeScreen();
    const now = Date.now();
    addTotalIncome(multiply(rewardPayoutAmount(floor, now), 1 + bonusPayouts));
    floor.lastCollectedAt = now;
    triggerHudTotalFlash();
    triggerEventEndSlam(GLOBAL_SLAM, "total", () =>
      context.applyTierCrit?.(floor, tier),
    );
    playSold();
    endEventProc(KEY);
  }, fillMs + spillMs);
}
