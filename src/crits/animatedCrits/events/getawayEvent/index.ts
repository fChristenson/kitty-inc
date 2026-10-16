// the "Getaway" event (road race; cash), a flight-stage event (see
// ../../flightStage) with its own way in, drawn with shared/animationStyles/race's street,
// finish gate and racer wisp in shared/animationStyles/fps's world: its crit's click zooms the
// floors away into a night street, the getaway-car wisp already flat out,
// its trunk spilling coins, a chaser wisp flashing red and blue ~120ms on its
// tail. It brakes hard into each hairpin round the blocks, hugs the inside and
// powers out with a punch of speed, a sack of cash flung off the back at
// every exit bursting into a spray of coins past the view that pays into the
// live total; the hairpins come quicker. On the last straight it hits a ramp
// and jumps a gap the chaser can't (it drops short into the dark), lands, and
// shoots through the finish gate's window (the floors) in the big blast,
// paying the most, as the view lands on the floors
import meta from "./meta";
import type { Floor } from "../../../../gameState";
import { COLOR } from "../../../../palette";
import { playCoinDrop, playSwoosh } from "../../../../sound";
import { rewardPayoutAmount } from "../../../../floors/incomePanel";
import { addTotalIncome } from "../../../../totalIncome";
import { multiply } from "../../../../shared/bigNumber";
import {
  playCritExplosion,
  playSlamExplosion,
} from "../../../../shared/explosionBang";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import {
  createFpsCoin,
  drawFpsCoins,
  drawFpsFace,
  drawFpsFlat,
  drawFpsGround,
  drawFpsSky,
  fillFpsQuad,
  fpsSight,
  FPS_NEAR,
  type Fps,
  type FpsCoin,
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
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { shakeScreen } from "../../../../shared/screenShake";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { hash01 } from "../../../../shared/twinkle";
import { pulseHudTotalFlash } from "../../../../shared/totalIncomeCoins";
import { drawScreenPart, type ScreenCopy } from "../../../../shared/screenCopy";
import type { Point } from "../../../../shared/wisp";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
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

const KEY = "getaway";

// the view: its lens (narrowing on an exit's punch, widening in the air), how
// far behind the car and how high it rides (rising with the jump), how far
// it swings after the car round a bend and the most it leaves the middle
const FOCAL = 1.2;
const HORIZON = 0.42;
const EXIT_WIDE = 0.18;
const AIR_WIDE = 0.22;
const BEHIND = 2.2;
const EYE = 0.625;
const CAM_LIFT = 0.6;
const FOLLOW = 0.85;
const CAM_MAX = 0.8;
const SKY = COLOR.nightShiftIndigo;
const GROUND = COLOR.shareholdersGreen;
// the finish gate at the road's end and its window, as wide as the road; the
// car aims at the window's middle
const GATE_Z = 40;
const OPEN_W = ROAD_STREET.half * 2;
const AIM = 0.5;
// the chase: speed at the start and how much it picks up by the end, the
// share it brakes by into a hairpin (never a crawl) and how early, an exit's
// kick and how fast it fades; how far the car pulls ahead into the window
const SPEED = 0.6;
const PICK_UP = 0.8;
const BRAKE = 0.42;
const BRAKE_LEAD = 140;
const KICK_SPEED = 1.1;
const KICK_MS = 240;
const STEP_MS = 8;
const PULL_AHEAD = 0.8;
// the hairpins: how far each turns (radians), which way, its exit's punch and
// shakes; how far before the car the bend starts, how far the car hugs the
// inside, and how fast it turns in and straightens out
const TURN = [1.4, 1.6, 1.8, 2.0];
const SIDE = [1, -1, 1, -1];
const PUNCH = [0.8, 0.9, 1, 1.15];
const BRAKE_SHAKE = [0.8, 1, 1.2, 1.4];
const EXIT_SHAKE = [1.4, 1.7, 2, 2.4];
const ENTRY_LEAD = 0.3;
const APEX = 0.4;
const IN_MS = 110;
const OUT_MS = 90;
// the car: hover, size, its wisp swelling on a punch or in the air
const HOVER = 0.12;
const RACER = 0.075;
const RACER_HOT = 0.5;
// the chaser: how far behind in time, its size, its red and blue lights'
// glow and how fast they swap; dropping short into the gap: its hop, drift
// on and fall (world units a second), gone after CHASER_FALL_MS
const CHASE_MS = 120;
const CHASER = 0.065;
const SIREN = 0.24;
const SIREN_SIDE = 0.06;
const SIREN_MS = 90;
const SIREN_DIM = 0.3;
const RED_GLOW = fadeStops(COLOR.red);
const BLUE_GLOW = fadeStops(COLOR.blue);
const CHASER_HOP = 0.6;
const CHASER_DRIFT = 4;
const CHASER_G = 9;
const CHASER_FALL_MS = 650;
// the sacks: flung off the back at each exit, SACK_MS before they burst;
// fling out (away from the bend) and up, carried on with a share of the
// car's speed; size; the burst's coins, their speeds, life and flash
const SACK_MS = 150;
const SACK_OUT = 2;
const SACK_UP = 1.6;
const SACK_CARRY = 0.3;
const SACK_G = 8;
const SACK_R = 0.08;
const SACK_COINS = 40;
const SACK_SPEED: [number, number] = [1, 2.8];
const COIN_LIFE = 900;
const SACK_FLASH_MS = 240;
const SACK_BURST = 1.3;
const HIT_FLASH = 0.22;
const HIT_FLASH_MS = 130;
// coins trickling out of the trunk all the way
const TRICKLE = 70;
const TRICKLE_CARRY = 0.2;
const TRICKLE_UP: [number, number] = [0.4, 1.1];
const TRICKLE_SIDE = 0.6;
// the ramp: length, half width, height, hazard bands; the arc's rise; the
// gap after it, how far short of the landing it ends, its depth and width;
// the landing's dip
const RAMP_LONG = 1.2;
const RAMP_HALF = 0.45;
const RAMP_H = 0.4;
const RAMP_BANDS = 4;
const RAMP_LIP = 0.05;
const AIR_RISE = 0.7;
const GAP_LIP = 0.1;
const LAND_SHORT = 0.4;
const DEEP = 2;
const WIDE = 6;
const CLIFF_LIP = 0.05;
const DIP = 0.6;
const DIP_MS = 120;
const REACH = 26;
// speed lines tearing out from the horizon on each punch and in the air
const LINES = 22;
const LINE_FROM = 0.24;
const LINE_REACH = 0.72;
const LINE_LONG = 0.22;
const LINE_SPEED = 0.0026;
const LINE_SQUASH = 1.3;
const LINE_WIDTH = 9;
const LINE_ALPHA = 0.75;
// the finish: its blast (of the view's width), flash, the flood of coins out
// of the window at the view (world units a second)
const SMASH_BLAST = 1;
const SMASH_FLASH_MS = 300;
const SMASH_WHITE = 0.7;
const FLOOD = 80;
const FLOOD_LAG_MS = 200;
const FLOOD_SPEED: [number, number] = [5, 11];
const FLOOD_SPREAD = 1.4;
const ZOOM = 1.2;
const START_SHAKE = 1.2;
const LAUNCH_SHAKE = 1.4;
const LAND_SHAKE = 2;
const SMASH_SHAKE = 3.6;

interface Bend {
  entry: number;
  exit: number;
  k: number;
  curve: RoadCurve;
}

interface Sack {
  k: number;
  toss: number;
  burst: number;
  x: number;
  y: number;
  z: number;
  // world units a ms
  vx: number;
  vy: number;
  vz: number;
  bx: number;
  by: number;
  bz: number;
}

registerEventProc(
  {
    key: KEY,
    chance: () => meta.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) => floor.unlocked && canStartFlightStage(context),
    arm: startGetaway,
  },
  { label: "Getaway", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Getaway
export function forceGetawayEvent(floor: Floor): void {
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
const CHASE_SPOT: RaceSpot = { x: 0, y: 0, z: 0 };
const LINE_A: Point = { x: 0, y: 0 };
const LINE_B: Point = { x: 0, y: 0 };

function setCorner(i: number, x: number, y: number, z: number): void {
  const c = QUAD[i];
  c[0] = x;
  c[1] = y;
  c[2] = z;
}

const pick = (values: readonly number[], k: number): number =>
  values[Math.min(k, values.length - 1)];

// how far into a hairpin the car is at ms: turning in from `lead` before its
// entry, straightening out at its exit
function bendHold(b: Bend, ms: number, lead: number): number {
  if (ms < b.entry - lead || ms > b.exit) return 0;
  return (
    smoothstep(clamp01((ms - b.entry + lead) / IN_MS)) *
    smoothstep(clamp01((b.exit - ms) / OUT_MS))
  );
}

// the ground and the street between from and end
function drawStretch(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  from: number,
  end: number,
): void {
  const near = fps.cam.z;
  if (end <= near) return;
  const z0 = Math.max(from, near);
  const z1 = Math.min(end, near + REACH);
  if (z1 > z0) drawFpsFlat(ctx, fps, 0, -WIDE, WIDE, z0, z1, GROUND);
  drawRoadStreet(ctx, fps, ROAD_STREET, end, from);
}

// the ramp up to the gap, cut where it passes under the view: its sides,
// hazard bands, then its white lip
function drawRamp(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  x: number,
  from: number,
  to: number,
): void {
  const near = fps.cam.z + FPS_NEAR;
  if (to <= near || from > fps.cam.z + REACH) return;
  const z0 = Math.max(from, near);
  const y0 = (RAMP_H * (z0 - from)) / RAMP_LONG;
  for (let side = -1; side <= 1; side += 2) {
    const sx = x + side * RAMP_HALF;
    setCorner(0, sx, 0, z0);
    setCorner(1, sx, y0, z0);
    setCorner(2, sx, RAMP_H, to);
    setCorner(3, sx, 0, to);
    fillFpsQuad(ctx, fps, QUAD, COLOR.cauldronIronDark);
  }
  const band = RAMP_LONG / RAMP_BANDS;
  for (let b = 0; b < RAMP_BANDS; b++) {
    const za = Math.max(z0, from + b * band);
    const zb = from + (b + 1) * band;
    if (zb <= za) continue;
    const ya = (RAMP_H * (za - from)) / RAMP_LONG;
    const yb = (RAMP_H * (zb - from)) / RAMP_LONG;
    setCorner(0, x - RAMP_HALF, ya, za);
    setCorner(1, x + RAMP_HALF, ya, za);
    setCorner(2, x + RAMP_HALF, yb, zb);
    setCorner(3, x - RAMP_HALF, yb, zb);
    fillFpsQuad(ctx, fps, QUAD, b % 2 ? COLOR.black : COLOR.heavenlyGold);
  }
  const zl = Math.max(z0, to - RAMP_LIP);
  const yl = (RAMP_H * (zl - from)) / RAMP_LONG;
  setCorner(0, x - RAMP_HALF, yl, zl);
  setCorner(1, x + RAMP_HALF, yl, zl);
  setCorner(2, x + RAMP_HALF, RAMP_H, to);
  setCorner(3, x - RAMP_HALF, RAMP_H, to);
  fillFpsQuad(ctx, fps, QUAD, COLOR.white);
}

// the gap cut across the street: its dark depths and the far cliff with its
// gold lip
function drawGap(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  from: number,
  to: number,
): void {
  drawFpsFlat(ctx, fps, -DEEP, -WIDE, WIDE, from, to, COLOR.black);
  drawFpsFace(ctx, fps, to, -WIDE, WIDE, -DEEP, 0, COLOR.cauldronIronDark);
  drawFpsFace(ctx, fps, to, -WIDE, WIDE, -CLIFF_LIP, 0, COLOR.heavenlyGold);
}

// a sack of cash at p: its body, neck and gold tie
function drawSack(ctx: CanvasRenderingContext2D, p: FpsPoint): void {
  const r = Math.max(1, SACK_R * p.s);
  ctx.fillStyle = COLOR.chairGiveawayBrown;
  ctx.strokeStyle = COLOR.woodOutline;
  ctx.lineWidth = Math.max(1, r * 0.15);
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.moveTo(p.x + r * 0.45, p.y - r * 1.2);
  ctx.arc(p.x, p.y - r * 1.2, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = COLOR.heavenlyGold;
  ctx.lineWidth = Math.max(1, r * 0.25);
  ctx.beginPath();
  ctx.moveTo(p.x - r * 0.5, p.y - r * 0.85);
  ctx.lineTo(p.x + r * 0.5, p.y - r * 0.85);
  ctx.stroke();
}

function startGetaway(floor: Floor, context: EventProcContext): void {
  const {
    enterMs,
    flyMs,
    firstBendMs,
    bendsMs,
    gapsMs,
    straightMs,
    airMs,
    mergeMs,
    payoutsPerSack,
    payoutsFinish,
  } = meta.values;
  const area = context.getScreenAreaLocal?.(floor);
  if (!area) return;
  const tier = context.critTier ?? pickCritTierByOdds();
  // the chase's clock runs from the click, through the way in, to the crash
  const raceMs = enterMs + flyMs + FLIGHT_STAGE.arriveMs;
  const landZ = GATE_Z - FOCAL * OPEN_W;
  const u = (ms: number) => clamp01(ms / raceMs);
  const vw = Math.max(1, area.right - area.left);
  const vh = Math.max(1, area.bottom - area.top);
  const high = (OPEN_W * vh) / vw;
  const aimY = high * AIM;

  const bends: Bend[] = [];
  let at = firstBendMs;
  for (let k = 0; k < bendsMs.length; k++) {
    const long = Math.max(1, bendsMs[k]);
    bends.push({
      entry: at,
      exit: at + long,
      k,
      curve: { from: 0, to: 0, turn: 0 },
    });
    at += long + (k < gapsMs.length ? gapsMs[k] : 0);
  }
  const lastExit = bends.length > 0 ? bends[bends.length - 1].exit : at;
  const launch = lastExit + straightMs;
  const air = Math.max(1, airMs);
  const land = launch + air;
  const kickAt = (ms: number) => {
    let s = 0;
    for (const b of bends)
      if (ms >= b.exit)
        s += pick(PUNCH, b.k) * Math.exp(-(ms - b.exit) / KICK_MS);
    return s;
  };
  const brakeAt = (ms: number) => {
    let s = 0;
    for (const b of bends) s = Math.max(s, bendHold(b, ms, BRAKE_LEAD));
    return s;
  };
  // the view's run: faster and faster, braking into each hairpin, every
  // exit a kick, ending on landZ
  const run: number[] = [];
  let z = 0;
  for (let ms = 0; ms <= raceMs + STEP_MS; ms += STEP_MS) {
    run.push(z);
    z +=
      ((SPEED + PICK_UP * u(ms)) * (1 - BRAKE * brakeAt(ms)) +
        KICK_SPEED * kickAt(ms)) *
      STEP_MS;
  }
  const endRun = run[Math.min(run.length - 1, Math.round(raceMs / STEP_MS))];
  const scale = endRun > 0 ? landZ / endRun : 1;
  const camZ = (ms: number) =>
    run[Math.max(0, Math.min(run.length - 1, Math.round(ms / STEP_MS)))] *
    scale;
  const mergeFrom = raceMs - mergeMs;
  const landing = (ms: number) =>
    smoothstep(clamp01((ms - mergeFrom) / Math.max(1, mergeMs)));
  const shipZ = (ms: number) =>
    camZ(ms) + BEHIND + PULL_AHEAD * landing(ms) ** 2;
  // world units a second the car's going at ms
  const speedAt = (ms: number) =>
    ((shipZ(ms + STEP_MS) - shipZ(ms)) * 1000) / STEP_MS;
  let smashMs = raceMs;
  for (let ms = mergeFrom; ms < raceMs; ms += STEP_MS)
    if (shipZ(ms) >= GATE_Z) {
      smashMs = ms;
      break;
    }
  const toGate = (ms: number) =>
    smoothstep(clamp01((ms - mergeFrom) / Math.max(1, smashMs - mergeFrom)));
  // the car across the road: hugging the inside of each hairpin, then lining
  // up on the window
  const shipX = (ms: number) => {
    let hug = 0;
    for (const b of bends) hug += pick(SIDE, b.k) * APEX * bendHold(b, ms, 0);
    return hug * (1 - toGate(ms));
  };
  const rampTo = shipZ(launch);
  const rampFrom = rampTo - RAMP_LONG;
  const rampX = shipX(launch);
  const gapFrom = rampTo + GAP_LIP;
  const gapTo = Math.max(gapFrom + 0.5, shipZ(land) - LAND_SHORT);
  // the car's height: up the ramp, arcing over the gap, dipping as it lands,
  // then lining up on the window
  const shipY = (ms: number, sz: number) => {
    let y = HOVER;
    if (ms >= launch && ms < land) {
      const p = (ms - launch) / air;
      y = HOVER + RAMP_H * (1 - p) + AIR_RISE * 4 * p * (1 - p);
    } else if (sz >= rampFrom && sz < rampTo)
      y = HOVER + (RAMP_H * (sz - rampFrom)) / RAMP_LONG;
    else if (ms >= land) y = HOVER * (1 - DIP * Math.exp(-(ms - land) / DIP_MS));
    return y + (aimY - y) * toGate(ms);
  };
  const airAt = (ms: number) =>
    ms >= launch && ms < land ? Math.sin((Math.PI * (ms - launch)) / air) : 0;
  for (const b of bends) {
    const from = shipZ(b.entry) - ENTRY_LEAD;
    const to = shipZ(b.exit);
    b.curve.from = from;
    b.curve.to = to;
    b.curve.turn = (pick(SIDE, b.k) * pick(TURN, b.k)) / Math.max(0.5, to - from);
  }

  // a sack flung off the back at each exit, bursting as the car powers out
  const sacks: Sack[] = [];
  const coins: FpsCoin[] = [];
  for (const b of bends) {
    const toss = Math.max(b.entry, b.exit - SACK_MS);
    const t = b.exit - toss;
    const out = -pick(SIDE, b.k);
    const sz = shipZ(toss);
    const sack: Sack = {
      k: b.k,
      toss,
      burst: b.exit,
      x: shipX(toss),
      y: shipY(toss, sz),
      z: sz,
      vx: (out * SACK_OUT) / 1000,
      vy: SACK_UP / 1000,
      vz: (speedAt(toss) * SACK_CARRY) / 1000,
      bx: 0,
      by: 0,
      bz: 0,
    };
    sack.bx = sack.x + sack.vx * t;
    sack.by = sack.y + sack.vy * t - (SACK_G * t * t) / 2e6;
    sack.bz = sack.z + sack.vz * t;
    sacks.push(sack);
    const carry = speedAt(b.exit) * SACK_CARRY;
    for (let i = 0; i < SACK_COINS; i++) {
      const seed = b.k * 100 + i;
      const a = hash01(seed, 8801) * Math.PI * 2;
      const speed = lerp(SACK_SPEED, hash01(seed, 8802));
      coins.push(
        createFpsCoin(
          sack.bx,
          sack.by,
          sack.bz,
          Math.cos(a) * speed,
          Math.abs(Math.sin(a)) * speed + 0.5,
          carry + (hash01(seed, 8803) - 0.5) * speed,
          b.exit,
          seed,
          true,
        ),
      );
    }
  }
  // coins trickling out of the trunk until the jump
  for (let i = 0; i < TRICKLE; i++) {
    const seed = 5000 + i;
    const ms = (launch * (i + hash01(seed, 8811))) / TRICKLE;
    const sz = shipZ(ms);
    coins.push(
      createFpsCoin(
        shipX(ms),
        shipY(ms, sz),
        sz,
        (hash01(seed, 8812) - 0.5) * 2 * TRICKLE_SIDE,
        lerp(TRICKLE_UP, hash01(seed, 8813)),
        speedAt(ms) * TRICKLE_CARRY,
        ms,
        seed,
        true,
      ),
    );
  }
  // the flood out of the window at the view as the car bursts through
  for (let i = 0; i < FLOOD; i++) {
    const seed = 6000 + i;
    const a = hash01(seed, 8821) * Math.PI * 2;
    const r = Math.sqrt(hash01(seed, 8822));
    coins.push(
      createFpsCoin(
        Math.cos(a) * r * OPEN_W * 0.4,
        aimY + Math.sin(a) * r * high * 0.4,
        GATE_Z,
        Math.cos(a) * FLOOD_SPREAD,
        Math.sin(a) * FLOOD_SPREAD,
        -lerp(FLOOD_SPEED, hash01(seed, 8823)),
        smashMs + hash01(seed, 8824) * FLOOD_LAG_MS,
        seed,
        false,
      ),
    );
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
    SPOT.z = shipZ(ms);
    SPOT.y = shipY(ms, SPOT.z);
    return SPOT.z < GATE_Z ? SPOT : null;
  });
  // the chaser on the car's line CHASE_MS behind, until it drops short
  const chaserAt = (ms: number): RaceSpot | null => {
    const c = ms - CHASE_MS;
    if (c < launch) {
      CHASE_SPOT.x = shipX(c);
      CHASE_SPOT.z = shipZ(c);
      CHASE_SPOT.y = shipY(c, CHASE_SPOT.z);
      return CHASE_SPOT;
    }
    if (c - launch > CHASER_FALL_MS) return null;
    const t = (c - launch) / 1000;
    CHASE_SPOT.x = rampX;
    CHASE_SPOT.z = rampTo + CHASER_DRIFT * t;
    CHASE_SPOT.y = HOVER + RAMP_H + CHASER_HOP * t - (CHASER_G * t * t) / 2;
    return CHASE_SPOT;
  };
  const chaser = createRaceWisp(chaserAt);
  const maxKick = pick(PUNCH, PUNCH.length - 1);

  // the race at ms on its clock
  const drawScene = (
    ctx: CanvasRenderingContext2D,
    view: FpsScreen,
    ms: number,
    now: number,
    floors: ScreenCopy,
  ): void => {
    const merge = landing(ms);
    const kick = Math.min(1, kickAt(ms) / maxKick) * (1 - merge);
    const lift = airAt(ms);
    const x = shipX(ms);
    const sz = shipZ(ms);
    const sy = shipY(ms, sz);
    const cz = camZ(ms);
    bendCam = cz;
    fps.view = view;
    fps.lens.focal = FOCAL * (1 - EXIT_WIDE * kick) * (1 + AIR_WIDE * lift);
    const swing = FOLLOW * (x + bend(sz));
    fps.cam.x = Math.max(-CAM_MAX, Math.min(CAM_MAX, swing)) * (1 - merge);
    const eye = EYE + CAM_LIFT * Math.max(0, sy - HOVER) * (1 - merge);
    fps.cam.y = eye + (high / 2 - eye) * merge;
    fps.cam.z = cz;
    drawFpsSky(ctx, fps, SKY);
    drawFpsGround(ctx, fps, GROUND);
    windowCtx = ctx;
    windowShot = floors;
    drawFinishGate(ctx, fps, GATE_Z, OPEN_W, high, fillWindow);
    // far to near: the street past the gap, the gap, the street before it
    drawStretch(ctx, fps, gapTo, GATE_Z);
    if (gapTo > cz && gapFrom < cz + REACH) drawGap(ctx, fps, gapFrom, gapTo);
    drawStretch(ctx, fps, -Infinity, gapFrom);
    drawRamp(ctx, fps, rampX, rampFrom, rampTo);
    const hot = Math.max(kick, lift);
    racer(ctx, fps, ms, now, RACER * (1 + RACER_HOT * hot), 0.5 + hot);
    // each sack in flight off the back
    for (const s of sacks) {
      if (ms < s.toss || ms >= s.burst) continue;
      const t = ms - s.toss;
      const p = fpsSight(
        fps,
        s.x + s.vx * t,
        s.y + s.vy * t - (SACK_G * t * t) / 2e6,
        s.z + s.vz * t,
      );
      if (p) drawSack(ctx, p);
    }
    // the chaser, its lights swapping red and blue
    const c = chaserAt(ms);
    if (c) {
      const p = fpsSight(fps, c.x, c.y, c.z);
      if (p) {
        const r = SIREN * p.s;
        const off = SIREN_SIDE * p.s;
        const redOn = Math.floor(now / SIREN_MS) % 2 === 0;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = redOn ? 1 : SIREN_DIM;
        drawGlow(ctx, RED_GLOW, p.x - off, p.y, r);
        ctx.globalAlpha = redOn ? SIREN_DIM : 1;
        drawGlow(ctx, BLUE_GLOW, p.x + off, p.y, r);
        ctx.restore();
      }
    }
    chaser(ctx, fps, ms, now, CHASER, 0.5);
    drawFpsCoins(ctx, fps, coins, ms, COIN_LIFE);
    // each sack's burst
    for (const s of sacks) {
      const since = ms - s.burst;
      if (since < 0 || since >= SACK_FLASH_MS) continue;
      const p = fpsSight(fps, s.bx, s.by, s.bz);
      if (p) drawWhiteBurst(ctx, p.x, p.y, since / SACK_FLASH_MS, SACK_BURST);
      if (since < HIT_FLASH_MS) {
        ctx.globalAlpha = HIT_FLASH * (1 - since / HIT_FLASH_MS) ** 2;
        ctx.fillStyle = COLOR.white;
        ctx.fillRect(view.x, view.y, view.w, view.h);
        ctx.globalAlpha = 1;
      }
    }
    // speed lines tearing out from the horizon on each punch and in the air
    if (hot > 0.05) {
      const hx = view.cx;
      const hy = view.y + view.h * HORIZON;
      for (let i = 0; i < LINES; i++) {
        const a = hash01(i, 8831) * Math.PI * 2;
        const r =
          view.w *
          (LINE_FROM + ((now * LINE_SPEED + hash01(i, 8832)) % 1) * LINE_REACH);
        const r2 = r + view.w * LINE_LONG;
        LINE_A.x = hx + Math.cos(a) * r;
        LINE_A.y = hy + Math.sin(a) * r * LINE_SQUASH;
        LINE_B.x = hx + Math.cos(a) * r2;
        LINE_B.y = hy + Math.sin(a) * r2 * LINE_SQUASH;
        drawBeam(ctx, LINE_A, LINE_B, LINE_WIDTH, LINE_ALPHA * hot);
      }
    }
    const since = ms - smashMs;
    if (since < 0) return;
    // the finish: the car bursting through the window in the biggest blast
    const gate = fpsSight(fps, 0, aimY, GATE_Z);
    if (!gate) return;
    drawDetonation(ctx, gate, since, view.w * SMASH_BLAST, now);
    drawWhiteBurst(ctx, gate.x, gate.y, since / SMASH_FLASH_MS / 2, 1.8);
    if (since < SMASH_FLASH_MS) {
      ctx.globalAlpha = SMASH_WHITE * (1 - since / SMASH_FLASH_MS) ** 2;
      ctx.fillStyle = COLOR.white;
      ctx.fillRect(view.x, view.y, view.w, view.h);
      ctx.globalAlpha = 1;
    }
  };

  const pay = (payouts: number) => {
    addTotalIncome(multiply(rewardPayoutAmount(floor, Date.now()), payouts));
    pulseHudTotalFlash();
    playCoinDrop();
  };

  const beat = startFlightStage(
    KEY,
    floor,
    context,
    {
      flyMs,
      enter: {
        ms: enterMs,
        draw: (ctx, view, ms, now, floors) => {
          drawScene(ctx, view, ms, now, floors);
          // the floors zooming past the view and fading into the chase
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
        context.applyTierCrit?.(floor, tier);
        endEventProc(KEY);
      },
    },
    { spotlightTotal: true },
  );
  if (!beat) return;
  beat(-enterMs, () => {
    playSwoosh();
    shakeScreen(START_SHAKE);
  });
  for (const b of bends) {
    beat(b.entry - BRAKE_LEAD - enterMs, () => {
      playSwoosh();
      shakeScreen(pick(BRAKE_SHAKE, b.k));
    });
    beat(b.exit - enterMs, () => {
      shakeScreen(pick(EXIT_SHAKE, b.k));
      pay(payoutsPerSack);
    });
  }
  beat(launch - enterMs, () => {
    playSwoosh();
    shakeScreen(LAUNCH_SHAKE);
  });
  beat(land - enterMs, () => shakeScreen(LAND_SHAKE));
  beat(smashMs - enterMs, () => {
    playCritExplosion();
    playSlamExplosion();
    shakeScreen(SMASH_SHAKE);
    pay(payoutsFinish);
  });
}
