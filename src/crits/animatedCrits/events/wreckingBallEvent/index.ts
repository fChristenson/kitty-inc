// the "Wrecking Ball" event: it covers its crit, whose click freezes the screen
// while the wisp drops like a heavy ball from above the screen onto the
// clicked floor's income bar and bounces on it, each bounce lower, drifting
// across it until it rests there. Then it charges up, trembling and swelling,
// leaps high and slams down onto the bar, vanishing in a huge blast. Every
// touch is a hit as strong as its impact: levels, flash, sparks, shake and
// the bar jolting, so the last little bounces are minor. Then the
// screen unfreezes and the crit's tier pays out
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playSwoosh, startBoostEventStreamLoop } from "../../../../sound";
import {
  playExplosion,
  playSlamExplosion,
} from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawPoppingCritText } from "../../../critFlash/critText";
import { drawExplosion } from "../../../../shared/eventFx";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import {
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../../../shared/screenFreeze";
import {
  drawIncomePanel,
  getIncomeBarBox,
  setIncomePanelsHidden,
} from "../../../../floors/incomePanel";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";
import { clamp01 } from "../../../../shared/easing";

const KEY = "wreckingBall";
// dropped from this far above the screen
const DROP_ABOVE = 80;
// the ball's radius, resting on the bar's top edge as it hits
const BALL_R = WISP_SIZE * 0.35;
// every hit, times its strength (its impact speed, of the drop's): its share
// of the levels, shake, white flash, spark spray and the bar's jolt down
// (springing back over a few wobbles)
const SHAKE = 1.2;
const FLASH = 0.7;
const SPRAY = 1.2;
const JOLT = 16;
const JOLT_DECAY_MS = 110;
const JOLT_WOBBLE_MS = 130;
const SLAM_STRENGTH = 1.8;
// it stops bouncing once a bounce would be shorter than this, and rests
const MIN_AIR_MS = 60;
// charging up: trembling up to TREMBLE px, sinking SQUAT px into the bar and
// swelling by SWELL of its size, its core heating from REST_HEAT to white-hot
const TREMBLE = 4;
const SQUAT = 6;
const SWELL = 0.35;
const REST_HEAT = 0.3;
const SPARK_REACH = 240;
const SPARK_SIZE = 18;
// the first hit lands this far in from the bar's middle, drifting across it
// by DRIFT of its width by the time it rests
const START_IN = 0.22;
const DRIFT = 0.44;
const FLASH_MS = 350;
const FLASH_ALPHA = 0.85;
const LABEL_FONT = 56;
// each bounce's own "+n" label, sized by its strength (down to MIN_LABEL of
// LABEL_FONT), stacking up above the bar as newer ones push in under it over
// PUSH_MS, and fading out by LABEL_LIFE_MS; the slam's shows the total
const MIN_LABEL = 0.5;
const PUSH_MS = 120;
const LABEL_LIFE_MS = 1_100;
const LABEL_FADE_MS = 300;

interface Impact {
  ms: number;
  x: number;
  strength: number;
}

interface RunningBall {
  floor: Floor;
  isGroundFloor: boolean;
  from: Point;
  // the ball's center's height as it hits, and its sideways speed (px/ms)
  impactY: number;
  vx: number;
  gravity: number;
  // when each bounce lands, ms in, the last where it comes to rest
  hitTimes: number[];
  restX: number;
  jumpAt: number;
  slamAt: number;
  // every touch of the bar: each bounce, then the slam
  impacts: Impact[];
  startedAt: number;
  // when each of impacts went off, as they do
  hits: number[];
  onHit: (impact: Impact, last: boolean) => void;
  // the levels landed so far, and by each hit
  given: number;
  gains: number[];
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

// how far through charging up it is, 0..1
function chargeAt(ball: RunningBall, ms: number): number {
  const restAt = ball.hitTimes[ball.hitTimes.length - 1];
  return clamp01((ms - restAt) / (ball.jumpAt - restAt));
}

// falling, bouncing off the bar until it rests, charging up, leaping and
// slamming down; null once it's slammed
function ballAt(ball: RunningBall, ms: number): Point | null {
  const { hitTimes, gravity, impactY, from, restX, jumpAt, slamAt } = ball;
  if (ms < 0 || ms >= slamAt) return null;
  const restAt = hitTimes[hitTimes.length - 1];
  if (ms < hitTimes[0])
    return { x: from.x + ball.vx * ms, y: from.y + 0.5 * gravity * ms * ms };
  if (ms < restAt) {
    const k = hitTimes.findLastIndex((t) => t <= ms);
    const up = (gravity * (hitTimes[k + 1] - hitTimes[k])) / 2;
    const t = ms - hitTimes[k];
    return {
      x: from.x + ball.vx * ms,
      y: impactY - up * t + 0.5 * gravity * t * t,
    };
  }
  if (ms < jumpAt) {
    const charge = chargeAt(ball, ms);
    return {
      x: restX + Math.sin(ms * 0.9) * TREMBLE * charge,
      y: impactY + SQUAT * charge + Math.cos(ms * 1.3) * TREMBLE * charge,
    };
  }
  const { jumpMs, jumpHeight } = CONFIG.wreckingBallEvent;
  const apex = impactY - jumpHeight;
  if (ms < jumpAt + jumpMs) {
    const u = (ms - jumpAt) / jumpMs;
    return { x: restX, y: impactY - jumpHeight * (1 - (1 - u) ** 2) };
  }
  const u = (ms - jumpAt - jumpMs) / (slamAt - jumpAt - jumpMs);
  return { x: restX, y: apex + jumpHeight * u ** 3 };
}

// sets off every impact due by ms
function landHits(ball: RunningBall, ms: number): void {
  while (
    ball.hits.length < ball.impacts.length &&
    ms >= ball.impacts[ball.hits.length].ms
  ) {
    const k = ball.hits.length;
    ball.hits.push(ball.startedAt + ball.impacts[k].ms);
    ball.onHit(ball.impacts[k], k === ball.impacts.length - 1);
  }
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
  // on the frame the drawn ball reaches the bar, never off a separate timer
  landHits(ball, ms);
  const lastHit = ball.hits[ball.hits.length - 1];
  ctx.save();
  ctx.translate(rect.left, rect.top);

  const jolt = ball.impacts.reduce((dy, { ms: at, strength }) => {
    const t = ms - at;
    if (t < 0) return dy;
    return (
      dy +
      JOLT *
        strength *
        Math.exp(-t / JOLT_DECAY_MS) *
        Math.cos((2 * Math.PI * t) / JOLT_WOBBLE_MS)
    );
  }, 0);
  const lastStrength = ball.impacts[ball.hits.length - 1]?.strength ?? 0;
  ctx.save();
  ctx.translate(0, jolt);
  drawIncomePanel(ctx, ball.floor, ball.isGroundFloor, {
    whiteAlpha:
      lastHit === undefined
        ? 0
        : Math.min(1, FLASH_ALPHA * lastStrength) *
          Math.max(0, 1 - (now - lastHit) / FLASH_MS),
    rotation: 0,
  });
  ctx.restore();

  ball.hits.forEach((hitAt, k) => {
    const { x, strength } = ball.impacts[k];
    drawExplosion(
      ctx,
      x,
      ball.impactY + BALL_R,
      now - hitAt,
      now,
      FLASH * strength,
      SPARK_REACH * SPRAY * strength,
      SPARK_SIZE,
    );
  });
  const charge = chargeAt(ball, ms);
  drawWisp(
    ctx,
    (t) => ballAt(ball, t),
    ms,
    now,
    WISP_SIZE * (1 + SWELL * charge),
    REST_HEAT + (1 - REST_HEAT) * charge,
  );

  const box = getIncomeBarBox(ball.isGroundFloor);
  let lift = 0;
  for (let k = ball.hits.length - 1; k >= 0; k--) {
    const isSlam = k === ball.impacts.length - 1;
    if (!isSlam && ball.gains[k] <= 0) continue;
    const age = now - ball.hits[k];
    const size = isSlam
      ? LABEL_FONT
      : LABEL_FONT *
        (MIN_LABEL + (1 - MIN_LABEL) * Math.min(1, ball.impacts[k].strength));
    const alpha = isSlam ? 1 : clamp01((LABEL_LIFE_MS - age) / LABEL_FADE_MS);
    if (alpha > 0) {
      ctx.globalAlpha = alpha;
      drawPoppingCritText(
        ctx,
        isSlam ? `+${ball.given} Lvl` : `+${ball.gains[k]}`,
        box.x + box.width / 2,
        box.y - size * 0.6 - lift,
        COLOR.heavenlyGold,
        ball.hits[k],
        now,
        { fontSize: size, strokeWidth: size / 7 },
      );
      ctx.globalAlpha = 1;
    }
    lift += size * 1.05 * clamp01(age / PUSH_MS);
  }
  ctx.restore();
}

function startWreckingBall(floor: Floor, context: EventProcContext): void {
  const area = context.getScreenAreaLocal?.(floor);
  if (running || isScreenFrozen() || !context.upgradeFloorFree || !area) return;
  const upgradeFloorFree = context.upgradeFloorFree;
  const {
    dropMs,
    bounce,
    chargeMs,
    jumpMs,
    slamMs,
    holdMs,
    levelShare,
    minLevels,
  } = CONFIG.wreckingBallEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const box = getIncomeBarBox(context.isGroundFloor);
  const cx = box.x + box.width / 2;
  // drifting toward whichever side of the bar has more room
  const side = cx < (area.left + area.right) / 2 ? 1 : -1;
  // each bounce's air time is `bounce` times the last's, the first twice the
  // drop's times `bounce`
  const hitTimes: number[] = [dropMs];
  for (let air = 2 * dropMs * bounce; air >= MIN_AIR_MS; air *= bounce)
    hitTimes.push(hitTimes[hitTimes.length - 1] + air);
  const restAt = hitTimes[hitTimes.length - 1];
  const impactY = box.y - BALL_R;
  const fromY = area.top - DROP_ABOVE;
  const firstX = cx - side * START_IN * box.width;
  const vx = (side * DRIFT * box.width) / (restAt - dropMs);
  const xAt = (ms: number) => firstX + vx * (ms - dropMs);
  const jumpAt = restAt + chargeMs;
  const slamAt = jumpAt + jumpMs + slamMs;
  const impacts: Impact[] = [
    ...hitTimes.map((ms, k) => ({ ms, x: xAt(ms), strength: bounce ** k })),
    { ms: slamAt, x: xAt(restAt), strength: SLAM_STRENGTH },
  ];
  const total = impacts.reduce((sum, impact) => sum + impact.strength, 0);
  let strengthSoFar = 0;
  const ball: RunningBall = {
    floor,
    isGroundFloor: context.isGroundFloor,
    from: { x: xAt(0), y: fromY },
    impactY,
    vx,
    gravity: (2 * (impactY - fromY)) / dropMs ** 2,
    hitTimes,
    restX: xAt(restAt),
    jumpAt,
    slamAt,
    impacts,
    startedAt: performance.now(),
    hits: [],
    onHit: ({ strength }, last) => {
      if (last) playSlamExplosion();
      else playExplosion();
      shakeScreen(SHAKE * strength);
      strengthSoFar += strength;
      const upTo = Math.round((ball.levels * strengthSoFar) / total);
      if (upTo > ball.given) upgradeFloorFree(floor, upTo - ball.given);
      ball.gains.push(upTo - ball.given);
      ball.given = upTo;
    },
    given: 0,
    gains: [],
    levels: Math.max(minLevels, Math.round(floor.upgradeCount * levelShare)),
  };
  running = ball;
  const isLive = () => running === ball;
  setIncomePanelsHidden([floor]);
  freezeScreen(drawOverlay);
  const stopSound = startBoostEventStreamLoop();

  setTimeout(() => {
    if (isLive()) playSwoosh();
  }, jumpAt);

  setTimeout(() => {
    if (!isLive()) return;
    landHits(ball, Infinity);
    running = null;
    stopSound();
    setIncomePanelsHidden([]);
    unfreezeScreen();
    // the covered crit's own tier, which also saves the levels
    context.applyTierCrit?.(floor, tier);
    endEventProc(KEY);
  }, slamAt + holdMs);
}
