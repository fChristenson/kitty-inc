// the "Wrecking Ball" event: it covers its crit, whose click freezes the screen
// while the wisp drops like a heavy ball from above the screen onto the
// clicked floor's income bar and bounces on it, each bounce lower, drifting
// across it; every hit is an explosion and a shake that lands free upgrade
// levels, the last bursting into the bar. Then the screen unfreezes and the
// crit's tier pays out
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playExplosion, startBoostEventStreamLoop } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { pickCritTierByOdds } from "../../shared/critTypes";
import { drawPoppingCritText } from "../../shared/critText";
import { triggerEventEndSlam } from "../../shared/eventEndSlam";
import { drawExplosion } from "../../shared/eventFx";
import { drawWisp, WISP_SIZE, type Point } from "../../shared/wisp";
import {
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../shared/screenFreeze";
import {
  drawIncomePanel,
  getIncomeBarBox,
  setIncomePanelsHidden,
} from "../incomePanel";
import { forceTestCrit } from "../upgradeButton";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../eventProcs";

const KEY = "wreckingBall";
// dropped from this far above the screen
const DROP_ABOVE = 80;
// the ball's radius, resting on the bar's top edge as it hits
const BALL_R = WISP_SIZE * 0.35;
// each hit: its share of the levels, shake and explosion size; the drop hits
// hardest, the bounces less, and the last bursts into the bar
const HIT_WEIGHT = [2, 1, 3];
const SHAKES = [1.3, 0.8, 1.6];
const BLASTS = [1.1, 0.7, 1.4];
const SPARK_REACH = 240;
const SPARK_SIZE = 18;
// the first hit lands this far in from the bar's middle, drifting across it
// by DRIFT of its width by the last
const START_IN = 0.22;
const DRIFT = 0.44;
const FLASH_MS = 350;
const FLASH_ALPHA = 0.85;
const LABEL_FONT = 56;

interface RunningBall {
  floor: Floor;
  isGroundFloor: boolean;
  from: Point;
  // the ball's center's height as it hits, and its sideways speed (px/ms)
  impactY: number;
  vx: number;
  gravity: number;
  // when each hit lands, ms in
  hitTimes: number[];
  startedAt: number;
  hits: number[];
  levels: number;
}

let running: RunningBall | null = null;

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.wreckingBallEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, context) =>
      !running &&
      !isScreenFrozen() &&
      context.upgradeFloorFree !== undefined &&
      context.getScreenAreaLocal !== undefined &&
      context.getOnScreenFloors?.().some((entry) => entry.floor === floor) ===
        true,
    arm: startWreckingBall,
  },
  { label: "Wrecking Ball", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Wrecking Ball
export function forceWreckingBallEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

// falling, then bouncing off the bar on each hit; null once it's burst
function ballAt(ball: RunningBall, ms: number): Point | null {
  const { hitTimes, gravity, impactY, from } = ball;
  if (ms < 0 || ms >= hitTimes[hitTimes.length - 1]) return null;
  const x = from.x + ball.vx * ms;
  if (ms < hitTimes[0]) return { x, y: from.y + 0.5 * gravity * ms * ms };
  const k = hitTimes.findLastIndex((t) => t <= ms);
  const up = (gravity * (hitTimes[k + 1] - hitTimes[k])) / 2;
  const t = ms - hitTimes[k];
  return { x, y: impactY - up * t + 0.5 * gravity * t * t };
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const ball = running;
  if (!ball) return;
  const rect = getFloorRect(ball.floor);
  if (!rect) return;
  const now = performance.now();
  const ms = now - ball.startedAt;
  const lastHit = ball.hits[ball.hits.length - 1];
  ctx.save();
  ctx.translate(rect.left, rect.top);

  drawIncomePanel(ctx, ball.floor, ball.isGroundFloor, {
    whiteAlpha:
      lastHit === undefined
        ? 0
        : FLASH_ALPHA * Math.max(0, 1 - (now - lastHit) / FLASH_MS),
    rotation: 0,
  });
  drawWisp(ctx, (t) => ballAt(ball, t), ms, now, WISP_SIZE, 1);

  ball.hits.forEach((hitAt, k) => {
    const x = ball.from.x + ball.vx * ball.hitTimes[k];
    drawExplosion(
      ctx,
      x,
      ball.impactY + BALL_R,
      now - hitAt,
      now,
      BLASTS[k],
      SPARK_REACH * BLASTS[k],
      SPARK_SIZE,
    );
  });
  if (lastHit !== undefined) {
    const box = getIncomeBarBox(ball.isGroundFloor);
    const done = HIT_WEIGHT.slice(0, ball.hits.length).reduce((a, b) => a + b);
    const total = HIT_WEIGHT.reduce((a, b) => a + b);
    drawPoppingCritText(
      ctx,
      `+${Math.round((ball.levels * done) / total)} Lvl`,
      box.x + box.width / 2,
      box.y - LABEL_FONT * 0.6,
      COLOR.heavenlyGold,
      lastHit,
      now,
      { fontSize: LABEL_FONT, strokeWidth: 8 },
    );
  }
  ctx.restore();
}

function startWreckingBall(floor: Floor, context: EventProcContext): void {
  const area = context.getScreenAreaLocal?.(floor);
  if (running || isScreenFrozen() || !context.upgradeFloorFree || !area) return;
  const upgradeFloorFree = context.upgradeFloorFree;
  const { dropMs, bounce, holdMs, levelShare, minLevels } =
    CONFIG.wreckingBallEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const box = getIncomeBarBox(context.isGroundFloor);
  const cx = box.x + box.width / 2;
  // drifting toward whichever side of the bar has more room
  const side = cx < (area.left + area.right) / 2 ? 1 : -1;
  // each bounce's air time is `bounce` times the last's, the first twice the
  // drop's times `bounce`
  const hitTimes: number[] = [dropMs];
  for (let k = 1; k < HIT_WEIGHT.length; k++)
    hitTimes.push(hitTimes[k - 1] + 2 * dropMs * bounce ** k);
  const impactY = box.y - BALL_R;
  const fromY = area.top - DROP_ABOVE;
  const firstX = cx - side * START_IN * box.width;
  const vx =
    (side * DRIFT * box.width) / (hitTimes[hitTimes.length - 1] - dropMs);
  const ball: RunningBall = {
    floor,
    isGroundFloor: context.isGroundFloor,
    from: { x: firstX - vx * dropMs, y: fromY },
    impactY,
    vx,
    gravity: (2 * (impactY - fromY)) / dropMs ** 2,
    hitTimes,
    startedAt: performance.now(),
    hits: [],
    levels: Math.max(minLevels, Math.round(floor.upgradeCount * levelShare)),
  };
  running = ball;
  const isLive = () => running === ball;
  setIncomePanelsHidden([floor]);
  freezeScreen(drawOverlay);
  const stopSound = startBoostEventStreamLoop();

  const total = HIT_WEIGHT.reduce((a, b) => a + b);
  let given = 0;
  hitTimes.forEach((hitMs, k) =>
    setTimeout(() => {
      if (!isLive()) return;
      ball.hits.push(performance.now());
      playExplosion();
      shakeScreen(SHAKES[k]);
      triggerEventEndSlam(floor, "bar");
      const upTo = Math.round(
        (ball.levels * HIT_WEIGHT.slice(0, k + 1).reduce((a, b) => a + b)) /
          total,
      );
      upgradeFloorFree(floor, upTo - given);
      given = upTo;
    }, hitMs),
  );

  setTimeout(
    () => {
      if (!isLive()) return;
      running = null;
      stopSound();
      setIncomePanelsHidden([]);
      unfreezeScreen();
      // the covered crit's own tier, which also saves the levels
      context.applyTierCrit?.(floor, tier);
      endEventProc(KEY);
    },
    hitTimes[hitTimes.length - 1] + holdMs,
  );
}
