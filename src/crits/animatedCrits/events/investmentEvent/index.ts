// the "Investment" event: it covers its crit, whose click freezes the screen
// while the button pours coins into the floor's income bar until it slams
// full and pays out; then glimmer lights burst out of the bar into the button,
// which slams and climbs one crit tier, its new tier's label popping above it.
// Then the screen unfreezes and the crit's tier pays out
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playSold, startBoostEventStreamLoop } from "../../../../sound";
import { multiply } from "../../../../shared/bigNumber";
import { isFloorLocked } from "../../../../shared/detachedJob";
import {
  CRIT_TIER_CONFIG,
  CRIT_TIER_ORDER,
  nextCritTier,
  pickCritTierByOdds,
} from "../../../critTypes";
import { drawPoppingCritText } from "../../../critFlash/critText";
import { createEventFx, type EventFx } from "../../../../shared/eventFx";
import { triggerEventEndSlam } from "../../../../shared/eventEndSlam";
import {
  drawEventStreams,
  streamCoins,
  streamGlimmers,
} from "../../../../shared/eventStream";
import { triggerHudTotalFlash } from "../../../../shared/totalIncomeCoins";
import {
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../../../shared/screenFreeze";
import { addTotalIncome } from "../../../../totalIncome";
import {
  BAR_W,
  rewardPayoutAmount,
  drawIncomePanel,
  getIncomeBarCenter,
  incomeBarFill,
  setIncomePanelsHidden,
} from "../../../../floors/incomePanel";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import {
  BTN_H,
  BTN_W,
  clearUpgradeButtonSpotlights,
  drawUpgradeButtonSpotlight,
  getButtonCenter,
  setUpgradeButtonSpotlights,
} from "../../../../floors/upgradeButton";
import {
  endEventProc,
  forceClaimEventProc,
  isVisibleOnFloor,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";

const KEY = "investment";
const LABEL_FONT = 64;

interface RunningInvestment {
  floor: Floor;
  isGroundFloor: boolean;
  bar: { x: number; y: number };
  button: { x: number; y: number };
  startedAt: number;
  startFill: number;
  barFx: EventFx;
  buttonFx: EventFx | null;
  promotedAt: number | null;
}

let running: RunningInvestment | null = null;

function canStart(floor: Floor, context: EventProcContext): boolean {
  if (running || isScreenFrozen()) return false;
  if (!floor.unlocked || isFloorLocked(floor)) return false;
  if (floor.critMultiplierTier === CRIT_TIER_ORDER[0]) return false;
  const entry = context.getOnScreenFloors?.().find((f) => f.floor === floor);
  return (
    entry !== undefined &&
    isVisibleOnFloor(entry, getIncomeBarCenter(context.isGroundFloor).y) &&
    isVisibleOnFloor(entry, getButtonCenter(context.isGroundFloor).y)
  );
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.investmentEvent.chance,
    isInProgress: () => running !== null,
    canArm: canStart,
    arm: startInvestment,
  },
  { label: "Investment", color: COLOR.moneyGreen },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Investment
export function forceInvestmentEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const event = running;
  if (!event) return;
  const rect = getFloorRect(event.floor);
  if (rect) {
    const now = performance.now();
    const { floor, isGroundFloor, bar, button } = event;
    ctx.save();
    ctx.translate(rect.left, rect.top);

    if (event.buttonFx === null) {
      const t = Math.min(
        1,
        (now - event.startedAt) / CONFIG.investmentEvent.fillMs,
      );
      const fill = event.startFill + (1 - event.startFill) * (1 - (1 - t) ** 2);
      event.barFx.draw(ctx, bar.x, bar.y, ({ white, rotation }) =>
        drawIncomePanel(ctx, floor, isGroundFloor, {
          whiteAlpha: white,
          rotation,
          fill,
        }),
      );
      drawUpgradeButtonSpotlight(ctx, floor, isGroundFloor, 0);
    } else {
      drawIncomePanel(ctx, floor, isGroundFloor, {
        whiteAlpha: 0,
        rotation: 0,
      });
      if (event.promotedAt === null)
        event.buttonFx.draw(ctx, button.x, button.y, ({ white }) =>
          drawUpgradeButtonSpotlight(ctx, floor, isGroundFloor, white),
        );
      else drawUpgradeButtonSpotlight(ctx, floor, isGroundFloor, 0);
    }

    const tier = floor.critMultiplierTier;
    if (event.promotedAt !== null && tier)
      drawPoppingCritText(
        ctx,
        CRIT_TIER_CONFIG[tier].label,
        button.x,
        button.y - BTN_H,
        CRIT_TIER_CONFIG[tier].color,
        event.promotedAt,
        now,
        { fontSize: LABEL_FONT, strokeWidth: 8 },
      );
    ctx.restore();
  }
  drawEventStreams(ctx, getFloorRect);
}

function startInvestment(floor: Floor, context: EventProcContext): void {
  if (!canStart(floor, context)) return;
  const { fillMs, liftMs, holdMs, payouts } = CONFIG.investmentEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const event: RunningInvestment = {
    floor,
    isGroundFloor: context.isGroundFloor,
    bar: getIncomeBarCenter(context.isGroundFloor),
    button: getButtonCenter(context.isGroundFloor),
    startedAt: performance.now(),
    startFill: incomeBarFill(floor, Date.now()),
    barFx: createEventFx(fillMs),
    buttonFx: null,
    promotedAt: null,
  };
  running = event;
  const isLive = () => running === event;
  const { bar, button } = event;
  setIncomePanelsHidden([floor]);
  setUpgradeButtonSpotlights([floor]);
  freezeScreen(drawOverlay);
  const stopSound = startBoostEventStreamLoop();

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
      target: bar,
      durationMs: fillMs,
      isRunning: isLive,
      onEachArrive: () => event.barFx.hit(performance.now()),
    },
  );

  // the full bar slams and pays out, then its lights burst into the button
  setTimeout(() => {
    if (!isLive()) return;
    const now = Date.now();
    triggerEventEndSlam(floor, "bar");
    addTotalIncome(multiply(rewardPayoutAmount(floor, now), payouts));
    floor.lastCollectedAt = now;
    triggerHudTotalFlash();
    playSold();
    const buttonFx = createEventFx(liftMs, COLOR.heavenlyGold);
    event.buttonFx = buttonFx;
    streamGlimmers(
      [{ floor, x: bar.x, y: bar.y, spreadX: BAR_W * 0.8, spreadY: 20 }],
      {
        target: button,
        durationMs: liftMs,
        isRunning: isLive,
        onEachArrive: () => buttonFx.hit(performance.now()),
      },
    );
  }, fillMs);

  setTimeout(() => {
    if (!isLive()) return;
    event.promotedAt = performance.now();
    floor.critMultiplierTier = nextCritTier(floor.critMultiplierTier);
    triggerEventEndSlam(floor, "button");
  }, fillMs + liftMs);

  setTimeout(
    () => {
      if (!isLive()) return;
      running = null;
      stopSound();
      setIncomePanelsHidden([]);
      clearUpgradeButtonSpotlights();
      unfreezeScreen();
      // the covered crit's own tier, which also saves the payout and promotion
      context.applyTierCrit?.(floor, tier);
      endEventProc(KEY);
    },
    fillMs + liftMs + holdMs,
  );
}
