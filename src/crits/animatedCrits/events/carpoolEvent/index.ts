// the "Carpool" event (road race; free hires), a flight-stage event (see
// ../../flightStage) with its own way in, drawn with shared/animationStyles/race's street,
// finish gate and racer wisp in shared/animationStyles/fps's world: its crit's click zooms
// the floors away into a night street race already flat out. Down both
// pavements cat-wisps wait at glowing stops, hopping higher and quicker as the
// car nears; it never brakes, swerving past each stop at full speed as the
// cat leaps aboard: a flash, a chime and a jolt of speed, a free hire on a
// floor in view on that hit. The stops come faster; at the last a crowd all
// leap on at once in the biggest hit yet, and the car, its tail of cat-wisps
// snaking after it, shoots through the finish gate's window (the floors),
// each cat bursting through behind it as the view lands on the floors
import meta from "./meta";
import type { Floor } from "../../../../gameState";
import { COLOR } from "../../../../palette";
import { playSimonNote, playSpinTick, playSwoosh } from "../../../../sound";
import {
  playCritExplosion,
  playSlamExplosion,
} from "../../../../shared/explosionBang";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import {
  drawFpsGround,
  drawFpsSky,
  fillFpsQuad,
  fpsHorizon,
  FPS_NEAR,
  type Fps,
  type FpsCorner,
  type FpsPoint,
} from "../../../../shared/animationStyles/fps";
import {
  createRaceWisp,
  drawFinishGate,
  drawRoadStreet,
  ROAD_STREET,
  type RaceSpot,
} from "../../../../shared/animationStyles/race";
import { drawWhiteBurst } from "../../../../shared/eventFx";
import { shakeScreen } from "../../../../shared/screenShake";
import { clamp01, smoothstep } from "../../../../shared/easing";
import { hash01 } from "../../../../shared/twinkle";
import { drawScreenPart, type ScreenCopy } from "../../../../shared/screenCopy";
import { drawWisp, type Point } from "../../../../shared/wisp";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawPoppingCritText } from "../../../critFlash/critText";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { celebrateWorkerBoost } from "../../../../floors/worker";
import { findRewardHires, giveHire, type RewardHire } from "../../eventRewards";
import {
  FLIGHT_STAGE,
  canStartFlightStage,
  isFlightStageRunning,
  startFlightStage,
  type FlightView,
} from "../../flightStage";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";

const KEY = "carpool";

// the view: its lens (narrowing by up to KICK_WIDE in a hit's jolt), how far
// behind the car and how high it rides, how far it leans after the car
const FOCAL = 1.2;
const HORIZON = 0.42;
const KICK_WIDE = 0.18;
const BEHIND = 1.5;
const EYE = 0.625;
const FOLLOW = 0.55;
const SKY = COLOR.nightShiftIndigo;
const GROUND = COLOR.shareholdersGreen;
// the finish gate at the road's end and its window, as wide as the road
const GATE_Z = 40;
const OPEN_W = ROAD_STREET.half * 2;
// the car shoots through the window this long before the view lands
const THROUGH_MS = 200;
// the race: speed at the start and how much it picks up by the end (never
// a brake), each hit's kick (the crowd's bigger) and how fast it fades
const SPEED = 0.6;
const PICK_UP = 0.8;
const KICK_SPEED = 0.9;
const CROWD_KICK = 1.8;
const KICK_MS = 240;
const STEP_MS = 8;
// the car: hover, size, its wisp swelling on a hit; how far it swerves out
// to a stop (the crowd's wider) and the longest swerve either side of it
const HOVER = 0.12;
const RACER = 0.075;
const RACER_HOT = 0.5;
const SWERVE = 0.55;
const CROWD_SWERVE = 0.62;
const SWERVE_MS = 220;
// the window's aim, up its height
const AIM = 0.5;
// the stops on the pavement: where along it, the post and its sign, the
// glowing pool round it (the crowd's longer), lighting up APPROACH_MS ahead
const STOP_X = ROAD_STREET.half + ROAD_STREET.kerb + ROAD_STREET.pavement / 2;
const POST_X = ROAD_STREET.half + ROAD_STREET.kerb + ROAD_STREET.pavement * 0.9;
const POST_H = 0.5;
const SIGN = 0.07;
const GLOW_W = ROAD_STREET.pavement * 0.6;
const GLOW_L = 0.22;
const CROWD_GLOW_L = 0.45;
const GLOW_FADE_MS = 160;
const APPROACH_MS = 500;
const REACH = 26;
// a cat-wisp: size, where it waits, its hop and tremble as the car nears;
// its leap's arc; aboard: how far it rides over the car, its bob, the lag
// of its slot in the tail and how long it takes to slide back into it
const CAT = 0.055;
const CAT_Y = 0.12;
const HOP = 0.14;
const HOP_RATE = 0.012;
const TREMBLE = 0.025;
const LEAP_H = 0.25;
const RIDE_Y = 0.04;
const BOB = 0.025;
const BOB_RATE = 0.02;
const TAIL_MS = 9;
const SETTLE_MS = 140;
const CROWD_SPREAD = 0.12;
// a hit: the view's flash, the car's burst; the crowd's blast
const HIT_FLASH = 0.28;
const HIT_FLASH_MS = 130;
const CROWD_FLASH = 0.55;
const CROWD_BLAST = 0.9;
const BLAST_MS = 900;
const BURST_MS = 260;
// speed lines tearing out from the horizon, thickest on a kick
const LINES = 22;
const LINE_FROM = 0.24;
const LINE_REACH = 0.72;
const LINE_LONG = 0.22;
const LINE_SPEED = 0.0026;
const LINE_SQUASH = 1.3;
const LINE_WIDTH = 9;
const LINE_ALPHA = 0.75;
const LINE_BASE = 0.3;
// the smash through the window: its blast (of the view's width), flash,
// each cat's burst through after it
const SMASH_BLAST = 1;
const SMASH_FLASH_MS = 300;
const SMASH_WHITE = 0.7;
const CROSS_MS = 220;
const ZOOM = 1.2;
const START_SHAKE = 1.2;
const LEAP_SHAKE = 0.35;
const HIT_SHAKE = 1.2;
const HIT_SHAKE_STEP = 0.12;
const CROWD_SHAKE = 2.6;
const SMASH_SHAKE = 3.6;
const LABEL_MS = 450;
const LABEL_Y = 0.35;
const LABEL_STYLE = { fontSize: 40, strokeWidth: 6 };
const BIG_LABEL_STYLE = { fontSize: 56, strokeWidth: 8 };

interface Stop {
  side: number;
  z: number;
  // when its cat (or crowd) lands aboard, and how long its swerve is
  ms: number;
  wide: number;
  crowd: boolean;
}

interface Cat {
  index: number;
  stop: Stop;
  x: number;
  y: number;
  z: number;
  leap: number;
  land: number;
  // its slot's lag in the tail, when it bursts through the window
  lag: number;
  cross: number;
  s: number;
  pt: Point;
  path: (ms: number) => Point | null;
}

registerEventProc(
  {
    key: KEY,
    chance: () => meta.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) =>
      floor.unlocked &&
      canStartFlightStage(context) &&
      findRewardHires(floor, context).length > 0,
    arm: startCarpool,
  },
  { label: "Carpool", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Carpool
export function forceCarpoolEvent(floor: Floor): void {
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
const WORLD = { x: 0, y: 0, z: 0 };
const A: Point = { x: 0, y: 0 };
const B: Point = { x: 0, y: 0 };

function setCorner(i: number, x: number, y: number, z: number): void {
  const c = QUAD[i];
  c[0] = x;
  c[1] = y;
  c[2] = z;
}

// where (x, y, z) shows, into out; its px a unit there, 0 behind the view
function sightInto(fps: Fps, x: number, y: number, z: number, out: Point) {
  const dz = z - fps.cam.z;
  if (dz < FPS_NEAR) return 0;
  const s = (fps.lens.focal * fps.view.w) / dz;
  out.x = fps.view.cx + (x - fps.cam.x) * s;
  out.y = fpsHorizon(fps) + (fps.cam.y - y) * s;
  return s;
}

// a cat's two ears atop a wisp head at (x, y), r px, added to ctx's path
function addEars(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
): void {
  for (let side = -1; side <= 1; side += 2) {
    ctx.moveTo(x + side * r * 0.95, y - r * 0.25);
    ctx.lineTo(x + side * r * 0.65, y - r * 1.3);
    ctx.lineTo(x + side * r * 0.15, y - r * 0.8);
    ctx.closePath();
  }
}

function startCarpool(floor: Floor, context: EventProcContext): void {
  const {
    enterMs,
    flyMs,
    stopsMs,
    crowdMs,
    crowdCats,
    leapMs,
    mergeMs,
    hireGapMs,
  } = meta.values;
  const area = context.getScreenAreaLocal?.(floor);
  if (!area) return;
  const tier = context.critTier ?? pickCritTierByOdds();
  // the race's clock runs from the click, through the way in, to the landing
  const raceMs = enterMs + flyMs + FLIGHT_STAGE.arriveMs;
  const landZ = GATE_Z - FOCAL * OPEN_W;
  const high = (OPEN_W * (area.bottom - area.top)) / (area.right - area.left);
  const aimY = high * AIM;

  // every hit (each stop's landing, the crowd's last), its kick
  const hitsMs: number[] = [...stopsMs, crowdMs];
  const lastHit = hitsMs.length - 1;
  const kickAt = (ms: number) => {
    let s = 0;
    for (let h = 0; h < hitsMs.length; h++) {
      const d = ms - hitsMs[h];
      if (d >= 0)
        s += (h === lastHit ? CROWD_KICK : 1) * Math.exp(-d / KICK_MS);
    }
    return s;
  };
  // the view's run: faster and faster, a kick on every hit, ending on landZ
  const run: number[] = [];
  let z = 0;
  for (let ms = 0; ms <= raceMs + STEP_MS; ms += STEP_MS) {
    run.push(z);
    z += (SPEED + PICK_UP * (ms / raceMs) + KICK_SPEED * kickAt(ms)) * STEP_MS;
  }
  const scale = landZ / run[Math.round(raceMs / STEP_MS)];
  const camZ = (ms: number) =>
    run[Math.max(0, Math.min(run.length - 1, Math.round(ms / STEP_MS)))] *
    scale;
  const mergeFrom = raceMs - mergeMs;
  const landing = (ms: number) =>
    smoothstep(clamp01((ms - mergeFrom) / mergeMs));
  // the car pulls ahead as the view closes, through the window at smashMs
  const smashMs = raceMs - THROUGH_MS;
  const pull =
    (GATE_Z - camZ(smashMs) - BEHIND) / Math.max(0.01, landing(smashMs) ** 2);
  const shipZ = (ms: number) => camZ(ms) + BEHIND + pull * landing(ms) ** 2;
  const toGate = (ms: number) =>
    smoothstep(clamp01((ms - mergeFrom) / (smashMs - mergeFrom)));

  // the stops, alternating sides, then the crowd's; each swerve as long as
  // its neighbours leave room for
  const stops: Stop[] = [];
  for (let k = 0; k < hitsMs.length; k++) {
    const ms = hitsMs[k];
    const before = k > 0 ? ms - hitsMs[k - 1] : SWERVE_MS;
    const after = k < lastHit ? hitsMs[k + 1] - ms : SWERVE_MS;
    stops.push({
      side: k % 2 ? 1 : -1,
      z: 0,
      ms,
      wide: Math.min(SWERVE_MS, before, after),
      crowd: k === lastHit,
    });
  }
  const swerveAt = (ms: number) => {
    let x = 0;
    for (let k = 0; k < stops.length; k++) {
      const st = stops[k];
      const d = ms - st.ms;
      if (d <= -st.wide || d >= st.wide) continue;
      x +=
        st.side *
        (st.crowd ? CROWD_SWERVE : SWERVE) *
        (0.5 + 0.5 * Math.cos((Math.PI * d) / st.wide));
    }
    return x;
  };
  const shipX = (ms: number) => swerveAt(ms) * (1 - toGate(ms));
  const shipY = (ms: number) => HOVER + (aimY - HOVER) * toGate(ms);
  for (const st of stops) st.z = shipZ(st.ms);

  // the cats: one at each stop, the crowd at the last, each aboard in the
  // tail behind the ones before it
  const fps: Fps = {
    view: { x: 0, y: 0, w: 1, h: 1, cx: 0 },
    lens: { focal: FOCAL, horizon: HORIZON },
    cam: { x: 0, y: EYE, z: 0, tip: 0 },
  };
  const catWorld = (cat: Cat, t: number) => {
    if (t < cat.leap) {
      const near = clamp01(1 - (cat.land - t) / APPROACH_MS);
      WORLD.x = cat.x + TREMBLE * near * Math.sin(t * 0.9 + cat.index);
      WORLD.y =
        cat.y +
        HOP *
          (0.3 + 0.7 * near) *
          Math.abs(Math.sin(t * HOP_RATE * (1 + 2 * near) + cat.index));
      WORLD.z = cat.z;
    } else if (t < cat.land) {
      const u = (t - cat.leap) / leapMs;
      WORLD.x = cat.x + (shipX(t) - cat.x) * u;
      WORLD.y =
        cat.y +
        (shipY(t) + RIDE_Y - cat.y) * u +
        LEAP_H * Math.sin(Math.PI * u);
      WORLD.z = cat.z + (shipZ(t) - cat.z) * u;
    } else {
      const at = t - cat.lag * smoothstep(clamp01((t - cat.land) / SETTLE_MS));
      WORLD.x = shipX(at);
      WORLD.y = shipY(at) + RIDE_Y + BOB * Math.sin(t * BOB_RATE + cat.index);
      WORLD.z = shipZ(at);
    }
  };
  const cats: Cat[] = [];
  const addCat = (stop: Stop, x: number, z: number) => {
    const index = cats.length;
    const lag = (index + 1) * TAIL_MS;
    const cat: Cat = {
      index,
      stop,
      x,
      y: CAT_Y,
      z,
      leap: stop.ms - leapMs,
      land: stop.ms,
      lag,
      cross: smashMs + lag,
      s: 0,
      pt: { x: 0, y: 0 },
      path: () => null,
    };
    cat.path = (t) => {
      catWorld(cat, t);
      if (WORLD.z >= GATE_Z) {
        cat.s = 0;
        return null;
      }
      cat.s = sightInto(fps, WORLD.x, WORLD.y, WORLD.z, cat.pt);
      return cat.s > 0 ? cat.pt : null;
    };
    cats.push(cat);
  };
  for (let k = 0; k < lastHit; k++)
    addCat(stops[k], stops[k].side * STOP_X, stops[k].z);
  const crowd = stops[lastHit];
  for (let i = 0; i < crowdCats; i++)
    addCat(
      crowd,
      crowd.side * (STOP_X + (hash01(i, 8701) - 0.5) * 0.2),
      crowd.z + (i - (crowdCats - 1) / 2) * CROWD_SPREAD,
    );

  // each hit's hires, on whichever floors in view still have room
  const hired: RewardHire[] = [];
  const hitHired = new Int32Array(hitsMs.length);
  const labels: string[] = [""];
  for (let n = 1; n <= crowdCats; n++)
    labels.push(n === 1 ? "+1 Hire" : `+${n} Hires`);
  const hireCat = (cat: Cat, hit: number) => {
    const fresh = findRewardHires(floor, context);
    if (fresh.length === 0) return;
    const hire = fresh[cat.index % fresh.length];
    giveHire(hire);
    if (hire.workerIndex === null) return;
    hired.push(hire);
    hitHired[hit]++;
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

  // a stop: its glowing pool, post and sign, brighter and quicker as the car
  // nears, gone once its cats are aboard
  const drawStop = (
    ctx: CanvasRenderingContext2D,
    st: Stop,
    ms: number,
    now: number,
  ) => {
    const fade = 1 - clamp01((ms - st.ms) / GLOW_FADE_MS);
    if (fade <= 0) return;
    const near = clamp01(1 - (st.ms - ms) / APPROACH_MS);
    const beat = 0.5 + 0.5 * Math.sin(now * (0.01 + 0.03 * near));
    const x = st.side * STOP_X;
    const long = st.crowd ? CROWD_GLOW_L : GLOW_L;
    setCorner(0, x - GLOW_W, 0.003, st.z - long);
    setCorner(1, x + GLOW_W, 0.003, st.z - long);
    setCorner(2, x + GLOW_W, 0.003, st.z + long);
    setCorner(3, x - GLOW_W, 0.003, st.z + long);
    fillFpsQuad(
      ctx,
      fps,
      QUAD,
      near > 0.6 && beat > 0.6 ? COLOR.white : COLOR.goldenTicketYellow,
      fade * (0.35 + 0.55 * near * beat),
    );
    const px = st.side * POST_X;
    const s = sightInto(fps, px, 0, st.z, A);
    if (s === 0 || sightInto(fps, px, POST_H, st.z, B) === 0) return;
    ctx.globalAlpha = fade;
    ctx.strokeStyle = COLOR.silverTicketGray;
    ctx.lineWidth = Math.max(2, 0.02 * s);
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.stroke();
    ctx.fillStyle = beat > 0.5 ? COLOR.heavenlyGold : COLOR.goldenTicketYellow;
    ctx.beginPath();
    ctx.arc(B.x, B.y, SIGN * s * (1 + 0.3 * near * beat), 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = Math.max(2, 0.015 * s);
    ctx.strokeStyle = COLOR.white;
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  // the race at ms on its clock
  const drawScene = (
    ctx: CanvasRenderingContext2D,
    view: FlightView,
    ms: number,
    now: number,
    floors: ScreenCopy,
  ): void => {
    const land = landing(ms);
    const kick = Math.min(1, kickAt(ms) / CROWD_KICK) * (1 - land);
    const x = shipX(ms);
    const sy = shipY(ms);
    const sz = shipZ(ms);
    const cz = camZ(ms);
    fps.view = view;
    fps.lens.focal = FOCAL * (1 - KICK_WIDE * kick);
    fps.cam.x = FOLLOW * x * (1 - land);
    fps.cam.y = EYE + (high / 2 - EYE) * land;
    fps.cam.z = cz;
    drawFpsSky(ctx, fps, SKY);
    drawFpsGround(ctx, fps, GROUND);
    windowCtx = ctx;
    windowShot = floors;
    drawFinishGate(ctx, fps, GATE_Z, OPEN_W, high, fillWindow);
    drawRoadStreet(ctx, fps, ROAD_STREET, GATE_Z);

    // the stops, far to near, then the cats waiting and leaping, far to near
    for (let k = stops.length - 1; k >= 0; k--) {
      const st = stops[k];
      if (st.z < cz + FPS_NEAR || st.z > cz + REACH) continue;
      drawStop(ctx, st, ms, now);
    }
    for (let i = cats.length - 1; i >= 0; i--) {
      const cat = cats[i];
      if (ms >= cat.land || cat.z > cz + REACH) continue;
      if (!cat.path(ms)) continue;
      const near = clamp01(1 - (cat.land - ms) / APPROACH_MS);
      drawWisp(ctx, cat.path, ms, now, CAT * cat.s, 0.4 + 0.6 * near);
    }
    if (sz < GATE_Z)
      racer(ctx, fps, ms, now, RACER * (1 + RACER_HOT * kick), 0.6 + kick);
    // the cats aboard, the tail snaking after the car, nearest it first
    for (let i = 0; i < cats.length; i++) {
      const cat = cats[i];
      if (ms < cat.land || !cat.path(ms)) continue;
      drawWisp(ctx, cat.path, ms, now, CAT * cat.s, 0.8);
    }
    // cat ears on every cat-wisp in view, one path
    ctx.beginPath();
    for (let i = 0; i < cats.length; i++) {
      const cat = cats[i];
      if (cat.z > cz + REACH) continue;
      const p = cat.path(ms);
      if (p) addEars(ctx, p.x, p.y, CAT * cat.s * 0.6);
    }
    ctx.fillStyle = COLOR.heavenlyGold;
    ctx.fill();

    // each hit: a flash over the view, a burst on the car, the crowd's blast
    const car = sightInto(fps, x, sy, sz, A) > 0 && sz < GATE_Z;
    for (let h = 0; h < hitsMs.length; h++) {
      const since = ms - hitsMs[h];
      if (since < 0 || since >= BLAST_MS) continue;
      const big = h === lastHit;
      if (since < HIT_FLASH_MS) {
        ctx.globalAlpha =
          (big ? CROWD_FLASH : HIT_FLASH) * (1 - since / HIT_FLASH_MS) ** 2;
        ctx.fillStyle = COLOR.white;
        ctx.fillRect(view.x, view.y, view.w, view.h);
        ctx.globalAlpha = 1;
      }
      if (big && sightInto(fps, x, sy, sz, B) > 0)
        drawDetonation(ctx, B, since, view.w * CROWD_BLAST, now);
      if (car && since < BURST_MS)
        drawWhiteBurst(ctx, A.x, A.y, since / BURST_MS, big ? 0.8 : 0.35);
    }

    // speed lines tearing out from the horizon, thickest on each kick
    const lines = (LINE_BASE + (1 - LINE_BASE) * kick) * (1 - land);
    if (lines > 0.05) {
      const hx = view.cx;
      const hy = view.y + view.h * HORIZON;
      for (let i = 0; i < LINES; i++) {
        const a = hash01(i, 8711) * Math.PI * 2;
        const r =
          view.w *
          (LINE_FROM + ((now * LINE_SPEED + hash01(i, 8712)) % 1) * LINE_REACH);
        const r2 = r + view.w * LINE_LONG;
        A.x = hx + Math.cos(a) * r;
        A.y = hy + Math.sin(a) * r * LINE_SQUASH;
        B.x = hx + Math.cos(a) * r2;
        B.y = hy + Math.sin(a) * r2 * LINE_SQUASH;
        drawBeam(ctx, A, B, LINE_WIDTH, LINE_ALPHA * lines);
      }
    }

    // the latest hit's tally over the car
    for (let h = lastHit; h >= 0; h--) {
      const since = ms - hitsMs[h];
      if (since < 0) continue;
      const n = hitHired[h];
      if (since < LABEL_MS && n > 0 && sz < GATE_Z) {
        const s = sightInto(fps, x, sy + LABEL_Y, sz, B);
        if (s > 0) {
          ctx.globalAlpha =
            1 - smoothstep(clamp01((since / LABEL_MS - 0.6) / 0.4));
          drawPoppingCritText(
            ctx,
            labels[Math.min(n, labels.length - 1)],
            B.x,
            B.y,
            COLOR.heavenlyGold,
            now - since,
            now,
            h === lastHit ? BIG_LABEL_STYLE : LABEL_STYLE,
          );
          ctx.globalAlpha = 1;
        }
      }
      break;
    }

    // the smash through the window, then each cat bursting through after it
    const since = ms - smashMs;
    if (since < 0 || sightInto(fps, 0, aimY, GATE_Z, B) === 0) return;
    for (let i = 0; i < cats.length; i++) {
      const t = ms - cats[i].cross;
      if (t > 0 && t < CROSS_MS)
        drawWhiteBurst(ctx, B.x, B.y, t / CROSS_MS, 0.3);
    }
    drawDetonation(ctx, B, since, view.w * SMASH_BLAST, now);
    drawWhiteBurst(ctx, B.x, B.y, since / SMASH_FLASH_MS / 2, 1.8);
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
      hired.forEach((hire, k) =>
        setTimeout(() => {
          if (hire.workerIndex !== null)
            celebrateWorkerBoost(hire.floor, hire.workerIndex, Date.now());
        }, k * hireGapMs),
      );
      context.applyTierCrit?.(floor, tier);
      endEventProc(KEY);
    },
  });
  if (!beat) return;
  beat(-enterMs, () => {
    playSwoosh();
    shakeScreen(START_SHAKE);
  });
  for (let k = 0; k < lastHit; k++) {
    const cat = cats[k];
    beat(cat.leap - enterMs, () => {
      playSpinTick(1 + 0.1 * k);
      shakeScreen(LEAP_SHAKE);
    });
    beat(cat.land - enterMs, () => {
      hireCat(cat, k);
      playSimonNote(k);
      shakeScreen(HIT_SHAKE + HIT_SHAKE_STEP * k);
    });
  }
  beat(crowd.ms - leapMs - enterMs, () => {
    playSwoosh();
    shakeScreen(LEAP_SHAKE * 2);
  });
  beat(crowd.ms - enterMs, () => {
    for (let i = lastHit; i < cats.length; i++) hireCat(cats[i], lastHit);
    playSlamExplosion();
    playCritExplosion();
    playSimonNote(lastHit);
    shakeScreen(CROWD_SHAKE);
  });
  beat(smashMs - enterMs, () => {
    playCritExplosion();
    playSlamExplosion();
    shakeScreen(SMASH_SHAKE);
  });
}
