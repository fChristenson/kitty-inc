// the "Drift" event (road race; free floors), a flight-stage event (see
// ../../flightStage) with its own way in, drawn with shared/animationStyles/race's street and
// racer wisp in shared/animationStyles/fps's world: its crit's click zooms the floors away into a
// street race already flat out. The street twists into hairpins between the
// blocks, each quicker and tighter: the wisp-car brakes and throws itself
// sideways into each in a long drift, sparks spraying and smoke pouring off
// it, skid marks laid behind, the view swinging round with it; every exit a
// punch of speed, a bang and a jolt. The last bend is a full 180 that swings
// the finish gate into view, its window the locked floor: the car smashes
// through the floor's lock in the biggest blast and shake, bursting it open,
// unlocked for free as the view lands back on the floors
import meta from "./meta";
import type { Floor } from "../../../../gameState";
import { COLOR } from "../../../../palette";
import { playSwoosh } from "../../../../sound";
import {
  playCritExplosion,
  playExplosion,
  playSlamExplosion,
} from "../../../../shared/explosionBang";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import {
  drawFpsGround,
  drawFpsSky,
  fillFpsQuad,
  fpsSight,
  type Fps,
  type FpsCorner,
  type FpsPoint,
  type FpsScreen,
} from "../../../../shared/animationStyles/fps";
import {
  createRaceWisp,
  drawFinishGate,
  drawRoadStreet,
  roadBend,
  ROAD_STREET,
  type RaceSpot,
  type RoadCurve,
} from "../../../../shared/animationStyles/race";
import { drawWhiteBurst } from "../../../../shared/eventFx";
import { shakeScreen } from "../../../../shared/screenShake";
import { clamp01, smoothstep } from "../../../../shared/easing";
import { hash01 } from "../../../../shared/twinkle";
import { drawScreenPart, type ScreenCopy } from "../../../../shared/screenCopy";
import type { Point } from "../../../../shared/wisp";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { findRewardLocked } from "../../eventRewards";
import {
  FLIGHT_STAGE,
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

const KEY = "drift";

// the view: its lens (narrowing by up to EXIT_WIDE in an exit's punch), how
// far behind the car and how high it rides, how far it swings after the car
// round a bend and the most it leaves the road's middle
const FOCAL = 1.2;
const HORIZON = 0.42;
const EXIT_WIDE = 0.2;
const BEHIND = 1.5;
const EYE = 0.625;
const FOLLOW = 0.85;
const CAM_MAX = 0.8;
// the finish gate at the road's end and its window, as wide as the road
const GATE_Z = 40;
const OPEN_W = ROAD_STREET.half * 2;
// the race: its speed at the start and how much it picks up by the end, the
// share it brakes by in a drift (never a crawl) and how early, an exit's
// kick and how fast it fades; how far the car pulls ahead into the window
const SPEED = 0.6;
const PICK_UP = 0.8;
const BRAKE = 0.35;
const BRAKE_LEAD = 120;
const KICK_SPEED = 1.1;
const KICK_MS = 260;
const STEP_MS = 8;
const PULL_AHEAD = 0.8;
// the bends, the 180 last: how far each turns (radians), which way, how far
// the car slides out wide, its exit's punch and shakes; how far before the
// car the bend starts, the drift's throw in and catch at the end
const TURN = [1.0, 1.2, 1.4, 1.6, 2.8];
const SIDE = [1, -1, 1, -1, 1];
const SLIDE = [0.35, 0.42, 0.5, 0.55, 0.62];
const PUNCH = [0.8, 0.9, 1, 1.1, 1.3];
const THROW_SHAKE = [0.9, 1.1, 1.3, 1.5, 2];
const EXIT_SHAKE = [1.4, 1.7, 2, 2.3, 2.8];
const ENTRY_LEAD = 0.3;
const THROW_MS = 110;
const CATCH_MS = 90;
const EXIT_FLASH = 0.3;
const EXIT_FLASH_MS = 150;
// the racer: hover, size, its wisp swelling as it drifts and kicks
const HOVER = 0.12;
const RACER = 0.07;
const RACER_HOT = 0.45;
// skid marks: samples along each drift, the tyres' spread and width
const SKIDS = 14;
const TYRE = 0.12;
const SKID_W = 0.025;
const SKID_ALPHA = 0.55;
// sparks spraying off the car's outside (world units from it, a trip a
// second each), and smoke puffs pouring off it
const SPARKS = 72;
const SPARK_RATE = 0.0032;
const SPARK_REACH = 0.7;
const SPARK_FALL = 0.5;
const SPARK_TAIL = 0.07;
const SPARK_SPREAD = 1.3;
const SPARK_TILT = 0.45;
const PUFFS = 18;
const PUFF_RATE = 0.0016;
const PUFF_OUT = 0.6;
const PUFF_DOWN = 0.35;
const PUFF_SIZE = [0.05, 0.32];
const PUFF_ALPHA = 0.55;
// speed lines tearing out from the horizon on each exit (of the view's width)
const LINES = 22;
const LINE_FROM = 0.24;
const LINE_REACH = 0.72;
const LINE_LONG = 0.22;
const LINE_SPEED = 0.0024;
const LINE_SQUASH = 1.3;
const LINE_WIDTH = 10;
const LINE_ALPHA = 0.75;
// the lock lighting up as the car closes, beating quicker
const PULSE = 0.18;
const PULSE_RATE = 0.00004;
const PULSE_WIDTH = 7;
// the smash: its blast (of the view's width), flash, the floor's burst,
// glass flying out and the shake
const SMASH_BLAST = 1;
const SMASH_FLASH_MS = 300;
const SMASH_WHITE = 0.7;
const FLOOR_BURST_MS = 320;
const SHARDS = 28;
const SHARD_REACH = 0.9;
const SHARD_SIZE = 0.035;
const SMASH_SHAKE = 3.6;
const ZOOM = 1.2;
const START_SHAKE = 1.2;

interface Bend {
  entry: number;
  exit: number;
  k: number;
  curve: RoadCurve;
  xs: Float64Array;
  zs: Float64Array;
}

registerEventProc(
  {
    key: KEY,
    chance: () => meta.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) =>
      floor.unlocked &&
      canStartFlightStage(context) &&
      findRewardLocked(floor, context) !== null,
    arm: startDrift,
  },
  { label: "Drift", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Drift
export function forceDriftEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

// scratch quad and points, refilled for every piece drawn
const QUAD: FpsCorner[] = [
  [0, 0, 0],
  [0, 0, 0],
  [0, 0, 0],
  [0, 0, 0],
];
const SPOT: RaceSpot = { x: 0, y: 0, z: 0 };
const LINE_A: Point = { x: 0, y: 0 };
const LINE_B: Point = { x: 0, y: 0 };

function setCorner(i: number, x: number, y: number, z: number): void {
  const c = QUAD[i];
  c[0] = x;
  c[1] = y;
  c[2] = z;
}

// a drift's hold at ms: thrown in from `lead` before its entry, caught at its exit
function bendHold(b: Bend, ms: number, lead: number): number {
  if (ms < b.entry - lead || ms > b.exit) return 0;
  return (
    smoothstep(clamp01((ms - b.entry + lead) / THROW_MS)) *
    smoothstep(clamp01((b.exit - ms) / CATCH_MS))
  );
}

function startDrift(floor: Floor, context: EventProcContext): void {
  const { enterMs, flyMs, firstBendMs, bendsMs, gapsMs, finalMs, mergeMs } =
    meta.values;
  const locked = findRewardLocked(floor, context);
  const area = context.getScreenAreaLocal?.(floor);
  if (!locked || !area) return;
  // the race's clock runs from the click, through the way in, to the crash
  const raceMs = enterMs + flyMs + FLIGHT_STAGE.arriveMs;
  const landZ = GATE_Z - FOCAL * OPEN_W;
  const u = (ms: number) => clamp01(ms / raceMs);

  // the window shows the frozen screen: where the lock and the locked floor
  // sit on it, in the world
  const vw = area.right - area.left;
  const vh = area.bottom - area.top;
  const high = (OPEN_W * vh) / vw;
  const toX = (localX: number) =>
    (clamp01((localX - area.left) / vw) - 0.5) * OPEN_W;
  const toY = (localY: number) =>
    high * (1 - clamp01((localY - area.top) / vh));
  const lockCenter = getLockCenter();
  const lockX = toX(lockCenter.x);
  const lockY = toY(locked.offsetY + lockCenter.y);
  const floorX0 = toX(0);
  const floorX1 = toX(FLOOR_W);
  const floorY0 = toY(locked.offsetY + FLOOR_H);
  const floorY1 = toY(locked.offsetY);

  const bends: Bend[] = [];
  let at = firstBendMs;
  for (let k = 0; k <= bendsMs.length; k++) {
    const long = k < bendsMs.length ? bendsMs[k] : finalMs;
    bends.push({
      entry: at,
      exit: at + long,
      k,
      curve: { from: 0, to: 0, turn: 0 },
      xs: new Float64Array(SKIDS),
      zs: new Float64Array(SKIDS),
    });
    at += long + (k < gapsMs.length ? gapsMs[k] : 0);
  }
  const final = bends[bends.length - 1];
  const kickAt = (ms: number) => {
    let s = 0;
    for (const b of bends)
      if (ms >= b.exit) s += PUNCH[b.k] * Math.exp(-(ms - b.exit) / KICK_MS);
    return s;
  };
  const brakeAt = (ms: number) => {
    let s = 0;
    for (const b of bends) s = Math.max(s, bendHold(b, ms, BRAKE_LEAD));
    return s;
  };
  // the view's run: faster and faster, braking into each drift, every exit
  // a kick, ending on landZ
  const run: number[] = [];
  let z = 0;
  for (let ms = 0; ms <= raceMs + STEP_MS; ms += STEP_MS) {
    run.push(z);
    z +=
      ((SPEED + PICK_UP * u(ms)) * (1 - BRAKE * brakeAt(ms)) +
        KICK_SPEED * kickAt(ms)) *
      STEP_MS;
  }
  const scale = landZ / run[Math.round(raceMs / STEP_MS)];
  const camZ = (ms: number) =>
    run[Math.max(0, Math.min(run.length - 1, Math.round(ms / STEP_MS)))] *
    scale;
  const mergeFrom = raceMs - mergeMs;
  const landing = (ms: number) =>
    smoothstep(clamp01((ms - mergeFrom) / mergeMs));
  const shipZ = (ms: number) =>
    camZ(ms) + BEHIND + PULL_AHEAD * landing(ms) ** 2;
  let smashMs = raceMs;
  for (let ms = mergeFrom; ms < raceMs; ms += STEP_MS)
    if (shipZ(ms) >= GATE_Z) {
      smashMs = ms;
      break;
    }
  const toLock = (ms: number) =>
    smoothstep(clamp01((ms - mergeFrom) / Math.max(1, smashMs - mergeFrom)));
  // the car across the road: sliding out wide in each drift, then lining up
  // on the lock in the window
  const shipX = (ms: number) => {
    let slide = 0;
    for (const b of bends) slide -= SIDE[b.k] * SLIDE[b.k] * bendHold(b, ms, 0);
    const p = toLock(ms);
    return slide * (1 - p) + lockX * p;
  };
  const shipY = (ms: number) => HOVER + (lockY - HOVER) * toLock(ms);
  for (const b of bends) {
    const from = shipZ(b.entry) - ENTRY_LEAD;
    const to = shipZ(b.exit);
    b.curve.from = from;
    b.curve.to = to;
    b.curve.turn = (SIDE[b.k] * TURN[b.k]) / Math.max(0.5, to - from);
    for (let i = 0; i < SKIDS; i++) {
      const ms = b.entry + ((b.exit - b.entry) * i) / (SKIDS - 1);
      b.xs[i] = shipX(ms);
      b.zs[i] = shipZ(ms);
    }
  }

  // one view, refilled every frame; the road bending round every hairpin
  // from where the view is
  let bendCam = 0;
  const bend = (bz: number) => {
    let s = 0;
    for (let k = 0; k < bends.length; k++)
      s += roadBend(bends[k].curve, bendCam, bz);
    return s;
  };
  const fps: Fps = {
    view: { x: 0, y: 0, w: 1, h: 1, cx: 0 },
    lens: { focal: FOCAL, horizon: HORIZON },
    cam: { x: 0, y: EYE, z: 0, tip: 0 },
    bend,
  };
  let windowCtx: CanvasRenderingContext2D | null = null;
  let windowShot: ScreenCopy | null = null;
  const fillWindow = (a: FpsPoint, b: FpsPoint) => {
    if (!windowCtx || !windowShot) return;
    const v = fps.view;
    drawScreenPart(
      windowCtx,
      windowShot,
      v.x,
      v.y,
      v.w,
      v.h,
      a.x,
      a.y,
      b.x - a.x,
      b.y - a.y,
    );
  };
  const racer = createRaceWisp((ms) => {
    SPOT.x = shipX(ms);
    SPOT.y = shipY(ms);
    SPOT.z = shipZ(ms);
    return SPOT;
  });
  const maxKick = PUNCH[PUNCH.length - 1];

  // the skid marks each drift has laid behind the car so far
  const drawSkids = (ctx: CanvasRenderingContext2D, sz: number) => {
    for (const b of bends)
      for (let i = 0; i + 1 < SKIDS; i++) {
        const z0 = b.zs[i];
        const z1 = b.zs[i + 1];
        if (z1 > sz) break;
        if (z1 < fps.cam.z) continue;
        for (let t = -1; t <= 1; t += 2) {
          const x0 = b.xs[i] + t * TYRE;
          const x1 = b.xs[i + 1] + t * TYRE;
          setCorner(0, x0 - SKID_W, 0.002, z0);
          setCorner(1, x0 + SKID_W, 0.002, z0);
          setCorner(2, x1 + SKID_W, 0.002, z1);
          setCorner(3, x1 - SKID_W, 0.002, z1);
          fillFpsQuad(ctx, fps, QUAD, COLOR.black, SKID_ALPHA);
        }
      }
  };

  // smoke pouring off the car's outside, rolling back at the view
  const drawSmoke = (
    ctx: CanvasRenderingContext2D,
    car: FpsPoint,
    out: number,
    hold: number,
    now: number,
  ) => {
    ctx.fillStyle = COLOR.disabledGray;
    for (let i = 0; i < PUFFS; i++) {
      const h = hash01(i, 9401);
      const age = (now * PUFF_RATE * (0.7 + 0.6 * h) + hash01(i, 9402)) % 1;
      const r = (PUFF_SIZE[0] + (PUFF_SIZE[1] - PUFF_SIZE[0]) * age) * car.s;
      ctx.globalAlpha = PUFF_ALPHA * hold * (1 - age);
      ctx.beginPath();
      ctx.arc(
        car.x + out * age * PUFF_OUT * car.s * (0.5 + h),
        car.y + age * PUFF_DOWN * car.s * (0.4 + hash01(i, 9403)),
        r,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  // sparks spraying off the car's outside in streaks, falling as they go
  const sparkPath = (
    ctx: CanvasRenderingContext2D,
    car: FpsPoint,
    out: number,
    count: number,
    every: number,
    now: number,
  ) => {
    ctx.beginPath();
    for (let i = 0; i < count; i += every) {
      const h = hash01(i, 9411);
      const age = (now * SPARK_RATE * (0.7 + 0.6 * h) + hash01(i, 9412)) % 1;
      const tail = Math.max(0, age - SPARK_TAIL);
      const a =
        (out > 0 ? SPARK_TILT : Math.PI - SPARK_TILT) +
        (hash01(i, 9413) - 0.5) * SPARK_SPREAD;
      const reach = SPARK_REACH * car.s * (0.6 + 0.8 * hash01(i, 9414));
      const cos = Math.cos(a) * reach;
      const sin = Math.sin(a) * reach;
      const fall = SPARK_FALL * car.s;
      ctx.moveTo(car.x + cos * tail, car.y + sin * tail + fall * tail * tail);
      ctx.lineTo(car.x + cos * age, car.y + sin * age + fall * age * age);
    }
  };

  // the race at ms on its clock
  const drawScene = (
    ctx: CanvasRenderingContext2D,
    view: FpsScreen,
    ms: number,
    now: number,
    floors: ScreenCopy,
  ): void => {
    const land = landing(ms);
    const kick = Math.min(1, kickAt(ms) / maxKick) * (1 - land);
    const x = shipX(ms);
    const sy = shipY(ms);
    const sz = shipZ(ms);
    const cz = camZ(ms);
    bendCam = cz;
    fps.view = view;
    fps.lens.focal = FOCAL * (1 - EXIT_WIDE * kick);
    // the view swinging round after the car as the road bends
    const swing = FOLLOW * (x + bend(sz));
    fps.cam.x = Math.max(-CAM_MAX, Math.min(CAM_MAX, swing)) * (1 - land);
    fps.cam.y = EYE + (high / 2 - EYE) * land;
    fps.cam.z = cz;
    drawFpsSky(ctx, fps, COLOR.revealSky);
    drawFpsGround(ctx, fps, COLOR.shareholdersGreen);
    windowCtx = ctx;
    windowShot = floors;
    drawFinishGate(ctx, fps, GATE_Z, OPEN_W, high, fillWindow);
    drawRoadStreet(ctx, fps, ROAD_STREET, GATE_Z);
    drawSkids(ctx, sz);
    // the drift the car is in, if any
    let hold = 0;
    let out = 1;
    let drifting: Bend | null = null;
    for (const b of bends) {
      const h = bendHold(b, ms, 0);
      if (h > hold) {
        hold = h;
        out = -SIDE[b.k];
        drifting = b;
      }
    }
    const car = sz < GATE_Z ? fpsSight(fps, x, sy, sz) : null;
    if (car && hold > 0.05) drawSmoke(ctx, car, out, hold, now);
    if (sz < GATE_Z) {
      const hot = Math.max(hold, kick);
      racer(ctx, fps, ms, now, RACER * (1 + RACER_HOT * hot), 0.5 + hot);
    }
    if (car && drifting && hold > 0.05) {
      const count = Math.round(
        SPARKS * hold * (drifting === final ? 1 : 0.6 + 0.1 * drifting.k),
      );
      ctx.save();
      ctx.lineCap = "round";
      ctx.globalAlpha = hold;
      sparkPath(ctx, car, out, count, 1, now);
      ctx.strokeStyle = COLOR.heavenlyGold;
      ctx.lineWidth = 4;
      ctx.stroke();
      sparkPath(ctx, car, out, count, 3, now);
      ctx.strokeStyle = COLOR.white;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
    // speed lines tearing out from the horizon on each exit's punch
    if (kick > 0.05) {
      const hx = view.cx;
      const hy = view.y + view.h * HORIZON;
      for (let i = 0; i < LINES; i++) {
        const a = hash01(i, 9421) * Math.PI * 2;
        const r =
          view.w *
          (LINE_FROM + ((now * LINE_SPEED + hash01(i, 9422)) % 1) * LINE_REACH);
        const r2 = r + view.w * LINE_LONG;
        LINE_A.x = hx + Math.cos(a) * r;
        LINE_A.y = hy + Math.sin(a) * r * LINE_SQUASH;
        LINE_B.x = hx + Math.cos(a) * r2;
        LINE_B.y = hy + Math.sin(a) * r2 * LINE_SQUASH;
        drawBeam(ctx, LINE_A, LINE_B, LINE_WIDTH, LINE_ALPHA * kick);
      }
    }
    // each exit's flash
    for (const b of bends) {
      const since = ms - b.exit;
      if (since < 0 || since >= EXIT_FLASH_MS) continue;
      ctx.globalAlpha = EXIT_FLASH * (1 - since / EXIT_FLASH_MS) ** 2;
      ctx.fillStyle = COLOR.white;
      ctx.fillRect(view.x, view.y, view.w, view.h);
      ctx.globalAlpha = 1;
    }
    const lock = fpsSight(fps, lockX, lockY, GATE_Z);
    if (!lock) return;
    const since = ms - smashMs;
    // the lock lighting up as the car closes, beating quicker
    if (since < 0 && ms > mergeFrom) {
      const t = ms - mergeFrom;
      const beat = Math.abs(Math.sin(t * t * PULSE_RATE));
      ctx.globalAlpha = toLock(ms) * (0.5 + 0.5 * beat);
      ctx.strokeStyle = COLOR.heavenlyGold;
      ctx.lineWidth = PULSE_WIDTH;
      ctx.beginPath();
      ctx.arc(
        lock.x,
        lock.y,
        PULSE * lock.s * (0.8 + 0.4 * beat),
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (since < 0) return;
    // the smash: the locked floor bursting open in gold and white, glass
    // flying out at the view, the biggest blast and a flash
    if (since < FLOOR_BURST_MS) {
      const f = 1 - since / FLOOR_BURST_MS;
      setCorner(0, floorX0, floorY0, GATE_Z);
      setCorner(1, floorX0, floorY1, GATE_Z);
      setCorner(2, floorX1, floorY1, GATE_Z);
      setCorner(3, floorX1, floorY0, GATE_Z);
      fillFpsQuad(ctx, fps, QUAD, COLOR.heavenlyGold, f);
      fillFpsQuad(ctx, fps, QUAD, COLOR.white, f * f);
      const reach = SHARD_REACH * view.w * Math.sqrt(since / FLOOR_BURST_MS);
      const size = SHARD_SIZE * view.w * (1 + since / FLOOR_BURST_MS);
      ctx.globalAlpha = f;
      ctx.fillStyle = COLOR.white;
      ctx.beginPath();
      for (let i = 0; i < SHARDS; i++) {
        const a = hash01(i, 9431) * Math.PI * 2;
        const r = reach * (0.4 + 0.6 * hash01(i, 9432));
        const s = size * (0.5 + hash01(i, 9433));
        ctx.rect(
          lock.x + Math.cos(a) * r - s / 2,
          lock.y + Math.sin(a) * r - s / 2,
          s,
          s,
        );
      }
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    drawDetonation(ctx, lock, since, view.w * SMASH_BLAST, now);
    drawWhiteBurst(ctx, lock.x, lock.y, since / SMASH_FLASH_MS / 2, 1.8);
    if (since < SMASH_FLASH_MS) {
      ctx.globalAlpha = SMASH_WHITE * (1 - since / SMASH_FLASH_MS) ** 2;
      ctx.fillStyle = COLOR.white;
      ctx.fillRect(view.x, view.y, view.w, view.h);
      ctx.globalAlpha = 1;
    }
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
      context.unlockFloorFree?.(locked.floor);
      endEventProc(KEY);
    },
  });
  if (!beat) return;
  beat(-enterMs, () => {
    playSwoosh();
    shakeScreen(START_SHAKE);
  });
  for (const b of bends) {
    beat(b.entry - enterMs, () => {
      playSwoosh();
      shakeScreen(THROW_SHAKE[b.k]);
    });
    beat(b.exit - enterMs, () => {
      playExplosion();
      shakeScreen(EXIT_SHAKE[b.k]);
    });
  }
  beat(smashMs - enterMs, () => {
    playCritExplosion();
    playSlamExplosion();
    shakeScreen(SMASH_SHAKE);
  });
}
