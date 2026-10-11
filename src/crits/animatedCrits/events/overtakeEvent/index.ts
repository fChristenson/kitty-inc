// the "Overtake" event (road race; crit tiers), a flight-stage event (see
// ../../flightStage) with its own way in, drawn with shared/race's street and
// racer wisps in shared/fps's world: its crit's click zooms the floors away into a
// street race already flat out, three rival wisps strung out ahead. The racer
// tucks in behind each one, white slipstream streaming off its tail, then
// slingshots out and past with a jolt, the rival dropping back, quicker each
// time, round a bend and down the straight; leading at last, it shoots
// through the finish gate's window in a chain of blasts, the view rushes
// through onto the floors and every bar in view goes a crit tier up
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playSwoosh } from "../../../../sound";
import {
  playCritExplosion,
  playExplosion,
} from "../../../../shared/explosionBang";
import { drawBeam } from "../../../../shared/beam";
import { drawDetonation } from "../../../../shared/explosion";
import {
  drawFpsGround,
  drawFpsSky,
  fpsSight,
  type Fps,
  type FpsCamera,
  type FpsLens,
  type FpsScreen,
} from "../../../../shared/fps";
import {
  createRaceWisp,
  drawFinishGate,
  drawRoadStreet,
  roadBend,
  ROAD_STREET,
  type RoadCurve,
} from "../../../../shared/race";
import { shakeScreen } from "../../../../shared/screenShake";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import { drawScreenPart, type ScreenCopy } from "../../../../shared/screenCopy";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { findRewardBars } from "../../eventRewards";
import {
  canStartFlightStage,
  isFlightStageRunning,
  startFlightStage,
} from "../../flightStage";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";

const KEY = "overtake";

// the view: its lens, how far behind the ship and how high it rides, how far
// it leans after the ship across the road
const FOCAL = 1.2;
const LENS: FpsLens = { focal: FOCAL, horizon: 0.42 };
const BEHIND = 1.5;
const EYE = 0.625;
const FOLLOW = 0.5;
// the finish gate at the road's end and its window, as wide as the road
const GATE_Z = 40;
const OPEN_W = ROAD_STREET.half * 2;
// the bend to the right
const CURVE: RoadCurve = { from: 10, to: 20, turn: 0.05 };
// the race: already this share of top speed at the start, the share of it
// spent turning to the gate's window, how far the racer pulls ahead into it
const FLYING_START = 0.5;
const LAND_FROM = 0.86;
const PULL_AHEAD = 0.8;
// the racers' wisps: hover, bob, size and heat (the rivals smaller, dimmer)
const HOVER = 0.18;
const BOB = 0.012;
const BOB_RATE = 0.012;
const RACER = 0.07;
const RIVAL = 0.055;
const RIVAL_HEAT = 0.2;
// the rivals: their lanes and when the racer passes each (shares of the
// race), how fast it closes on them (world units a ms); seen from
// SEEN_FROM ahead to SEEN_TO behind the racer
const RIVALS: { x: number; pass: number }[] = [
  { x: 0.35, pass: 0.24 },
  { x: -0.35, pass: 0.46 },
  { x: 0.35, pass: 0.64 },
];
const CLOSING = 0.0032;
const SEEN_FROM = 18;
const SEEN_TO = -1.3;
// tucking in behind a rival from TUCK_FROM ahead over TUCK_SPAN, swinging
// out to pass from SWING_AT over SWING_SPAN; back to the middle after the last
const TUCK_FROM = 3;
const TUCK_SPAN = 1.5;
const SWING_AT = 0.9;
const SWING_SPAN = 0.5;
const PASSED_MS = 250;
const MIDDLE_MS = 500;
// the slipstream: streaks flowing off a rival's tail while tucked in
const STREAKS = 10;
const STREAK_SPREAD = 0.4;
const STREAK_LOW = 0.1;
const STREAK_HIGH = 0.25;
const STREAK_LONG = 0.5;
const STREAK_RATE = 0.004;
const STREAK_WIDTH = 8;
const STREAK_ALPHA = 0.6;
// the slingshot's flash past each rival
const PASS_GLOW_MS = 400;
const PASS_GLOW = 0.4;
const PASS_Y = 0.25;
// the finish: blasts round the gate's window as the ship gets FINISH_FROM
// short of it, a huge one in the middle
const FINISH_FROM = 1.5;
const FINISH_SPOTS: [number, number][] = [
  [-0.7, 0.2],
  [0.7, 0.5],
  [-0.4, 0.7],
  [0.5, 0.15],
];
const FINISH_GAP = 45;
const FINISH_BLAST = 0.35;
const FINISH_BIG = 0.7;
const ZOOM = 1.2;
const START_SHAKE = 1.2;
const PASS_SHAKE = 1.4;
const FINISH_SHAKE = 1.2;
const FINISH_BIG_SHAKE = 3;

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.overtakeEvent.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) =>
      floor.unlocked &&
      canStartFlightStage(context) &&
      context.applyTierCrit !== undefined,
    arm: startOvertake,
  },
  { label: "Overtake", color: COLOR.fullHouseCrimson },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Overtake
export function forceOvertakeEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

// the window's height, so it has the screen's shape and fills it on landing
const openHigh = (view: FpsScreen) => (OPEN_W * view.h) / view.w;

function startOvertake(floor: Floor, context: EventProcContext): void {
  const { enterMs, flyMs, tierGapMs } = CONFIG.overtakeEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  // the race's clock runs from the click, through the way in, to the crash
  const raceMs = enterMs + flyMs + CONFIG.flightStage.arriveMs;
  const landZ = GATE_Z - FOCAL * OPEN_W;
  const u = (ms: number) => clamp01(ms / raceMs);
  const camZ = (ms: number) =>
    lerp([0, landZ], FLYING_START * u(ms) + (1 - FLYING_START) * u(ms) ** 2);
  const landing = (ms: number) =>
    smoothstep(clamp01((u(ms) - LAND_FROM) / (1 - LAND_FROM)));
  const shipZ = (ms: number) =>
    camZ(ms) + BEHIND + PULL_AHEAD * landing(ms) ** 2;
  const passes = RIVALS.map((r) => r.pass * raceMs);
  const ahead = (k: number, ms: number) => (passes[k] - ms) * CLOSING;
  // the ship's lane: tucked in behind the next rival, swinging out past it
  const shipX = (ms: number) => {
    const last = RIVALS.length - 1;
    if (ms >= passes[last] + PASSED_MS)
      return lerp(
        [-RIVALS[last].x, 0],
        smoothstep(clamp01((ms - passes[last] - PASSED_MS) / MIDDLE_MS)),
      );
    let k = 0;
    while (ms >= passes[k] + PASSED_MS) k++;
    const lane = RIVALS[k].x;
    const from = k === 0 ? 0 : -RIVALS[k - 1].x;
    const rel = ahead(k, ms);
    const tuck = smoothstep(clamp01((TUCK_FROM - rel) / TUCK_SPAN));
    const swing = smoothstep(clamp01((SWING_AT - rel) / SWING_SPAN));
    return lerp([lerp([from, lane], tuck), -lane], swing);
  };
  // when the ship reaches the gate
  let gateMs = raceMs;
  for (let ms = 0; ms < raceMs; ms += 8)
    if (shipZ(ms) >= GATE_Z - FINISH_FROM) {
      gateMs = ms;
      break;
    }
  const finish = FINISH_SPOTS.map((spot, k) => ({
    spot,
    ms: gateMs + k * FINISH_GAP,
  }));
  const bigMs = gateMs + FINISH_SPOTS.length * FINISH_GAP;
  const bob = (ms: number, k: number) =>
    HOVER + Math.sin(ms * BOB_RATE + k) * BOB;
  const racer = createRaceWisp((ms) => ({
    x: shipX(ms),
    y: bob(ms, 0),
    z: shipZ(ms),
  }));
  const rivals = RIVALS.map((r, k) =>
    createRaceWisp((ms) => {
      const rel = ahead(k, ms);
      if (rel > SEEN_FROM || rel < SEEN_TO) return null;
      return { x: r.x, y: bob(ms, k + 1), z: shipZ(ms) + rel };
    }),
  );

  const drawRival = (
    ctx: CanvasRenderingContext2D,
    fps: Fps,
    k: number,
    shipAt: number,
    ms: number,
    now: number,
  ) => {
    const r = RIVALS[k];
    const rel = ahead(k, ms);
    if (rel > SEEN_FROM || rel < SEEN_TO) return;
    const z = shipAt + rel;
    rivals[k](ctx, fps, ms, now, RIVAL, RIVAL_HEAT);
    // its slipstream while the racer is tucked in behind it
    const tucked = clamp01(TUCK_FROM - rel) * clamp01((rel - 0.5) / 0.3);
    if (tucked > 0)
      for (let j = 0; j < STREAKS; j++) {
        const along = (now * STREAK_RATE + j / STREAKS) % 1;
        const x = r.x + (hash01(j, 7901) - 0.5) * STREAK_SPREAD;
        const y = lerp([STREAK_LOW, STREAK_HIGH], hash01(j, 7902));
        const back = z - along * rel;
        const a = fpsSight(fps, x, y, back);
        const b = fpsSight(fps, x, y, back - STREAK_LONG);
        if (a && b)
          drawBeam(
            ctx,
            a,
            b,
            STREAK_WIDTH,
            STREAK_ALPHA * tucked * (1 - along),
          );
      }
    // the slingshot past it
    const since = ms - passes[k];
    if (since < 0 || since >= PASS_GLOW_MS) return;
    const p = fpsSight(fps, r.x, PASS_Y, z);
    if (!p) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    stampGlimmer(
      ctx,
      p.x,
      p.y,
      PASS_GLOW * p.s * (1 - since / PASS_GLOW_MS),
      now * 0.01,
      COLOR.white,
    );
    ctx.restore();
  };

  // the race at ms on its clock
  const drawScene = (
    ctx: CanvasRenderingContext2D,
    view: FpsScreen,
    ms: number,
    now: number,
    floors: ScreenCopy,
  ): void => {
    const z = shipZ(ms);
    const x = shipX(ms);
    const land = landing(ms);
    const cam: FpsCamera = {
      x: x * FOLLOW * (1 - land),
      y: lerp([EYE, openHigh(view) / 2], land),
      z: camZ(ms),
      tip: 0,
    };
    const fps: Fps = {
      view,
      lens: LENS,
      cam,
      bend: (at) => roadBend(CURVE, cam.z, at),
    };
    drawFpsSky(ctx, fps, COLOR.revealSky);
    drawFpsGround(ctx, fps, COLOR.shareholdersGreen);
    drawFinishGate(ctx, fps, GATE_Z, OPEN_W, openHigh(view), (a, b) =>
      drawScreenPart(
        ctx,
        floors,
        view.x,
        view.y,
        view.w,
        view.h,
        a.x,
        a.y,
        b.x - a.x,
        b.y - a.y,
      ),
    );
    drawRoadStreet(ctx, fps, ROAD_STREET, GATE_Z);
    // rivals still ahead far to near, the racer, then any it's just passed
    for (let k = RIVALS.length - 1; k >= 0; k--)
      if (ahead(k, ms) >= 0) drawRival(ctx, fps, k, z, ms, now);
    if (z < GATE_Z) racer(ctx, fps, ms, now, RACER, 0.4 + u(ms));
    for (let k = RIVALS.length - 1; k >= 0; k--)
      if (ahead(k, ms) < 0) drawRival(ctx, fps, k, z, ms, now);
    // the finish's blasts round the window
    const high = openHigh(view);
    for (const b of finish) {
      const p = fpsSight(
        fps,
        (b.spot[0] * OPEN_W) / 2,
        b.spot[1] * high,
        GATE_Z,
      );
      if (p) drawDetonation(ctx, p, ms - b.ms, FINISH_BLAST * p.s, now);
    }
    const middle = fpsSight(fps, 0, high / 2, GATE_Z);
    if (middle)
      drawDetonation(ctx, middle, ms - bigMs, FINISH_BIG * middle.s, now);
  };

  const beat = startFlightStage(KEY, floor, context, {
    flyMs,
    enter: {
      ms: enterMs,
      draw: (ctx, view, ms, now, floors) => {
        drawScene(ctx, view, ms, now, floors);
        // the floors zooming past the view and fading into the race
        const p = smoothstep(clamp01(ms / enterMs));
        const k = 1 + ZOOM * p;
        ctx.globalAlpha = 1 - p;
        drawScreenPart(
          ctx,
          floors,
          view.x,
          view.y,
          view.w,
          view.h,
          view.x + (view.w * (1 - k)) / 2,
          view.y + (view.h * (1 - k)) / 2,
          view.w * k,
          view.h * k,
        );
        ctx.globalAlpha = 1;
      },
    },
    ownLanding: true,
    draw: (ctx, view, ms, now, floors) =>
      drawScene(ctx, view, enterMs + ms, now, floors),
    onEnd: () => {
      const bars = findRewardBars(floor, context);
      if (bars.length === 0) context.applyTierCrit?.(floor, tier);
      bars.forEach((bar, k) =>
        setTimeout(
          () => context.applyTierCrit?.(bar.floor, tier),
          k * tierGapMs,
        ),
      );
      endEventProc(KEY);
    },
  });
  if (!beat) return;
  beat(-enterMs, () => {
    playSwoosh();
    shakeScreen(START_SHAKE);
  });
  for (const ms of passes)
    beat(ms - enterMs, () => {
      playSwoosh();
      shakeScreen(PASS_SHAKE);
    });
  for (const b of finish)
    beat(b.ms - enterMs, () => {
      playExplosion();
      shakeScreen(FINISH_SHAKE);
    });
  beat(bigMs - enterMs, () => {
    playCritExplosion();
    shakeScreen(FINISH_BIG_SHAKE);
  });
}
