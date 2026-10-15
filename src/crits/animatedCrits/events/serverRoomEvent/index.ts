// the "Server Room" event (fps; perma tiers), a flight-stage event (see
// ../../flightStage) with its own way in, drawn in first person with
// shared/animationStyles/fps: its crit's click zooms the darkened floors away
// into the vanishing point of a long aisle of server racks, and the view
// dashes down it, rack lights streaking past. Red error lights flare up on
// the racks ahead, trembling brighter; the player wisp's rounds snuff each
// in a flash and crack, a worker in view climbing a perma tier on that hit,
// the errors coming faster and then in pairs. At the aisle's end a mainframe
// swells, sparking and throbbing ever faster; the last volley overloads it
// in one huge blast, every worker in view climbing a perma tier, and the
// view rushes through the opening behind it back onto the floors
import meta from "./meta";
import type { Floor } from "../../../../gameState";
import { COLOR } from "../../../../palette";
import { playSpinTick, playSwoosh } from "../../../../sound";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import {
  playCritExplosion,
  playExplosion,
  playSlamExplosion,
} from "../../../../shared/explosionBang";
import {
  drawFpsFace,
  drawFpsFlat,
  drawFpsGround,
  drawFpsOpening,
  drawFpsSky,
  drawFpsWall,
  drawFpsWallLines,
  fpsHorizon,
  fpsOpeningLanding,
  FPS_NEAR,
  type Fps,
  type FpsLens,
} from "../../../../shared/animationStyles/fps";
import { shakeScreen } from "../../../../shared/screenShake";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { hash01 } from "../../../../shared/twinkle";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { drawScreenPart, type ScreenCopy } from "../../../../shared/screenCopy";
import {
  drawWisp,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { CRIT_TIER_ORDER, pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import {
  celebrateWorkerBoost,
  getWorkerPermaTier,
  promoteWorkerPermaTier,
} from "../../../../floors/worker";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";
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

const KEY = "serverRoom";

// the view starts FOCAL behind z 0, its eye EYE up, bobbing STEP per stride
const FOCAL = 1.2;
const LENS: FpsLens = { focal: FOCAL, horizon: 0.5 };
const EYE = 0.6;
const STRIDE = 6;
const STEP = 0.012;
const SWAY = 0.015;
const SWAY_RATE = 0.003;
// the aisle: racks either side at RACK_X, at least HIGH tall, from RACK_FROM
// to the end wall at END, a rack every RACK long with a post POST thick, its
// units UNIT apart; drawn out to VIEW_DEPTH ahead
const RACK_X = 0.5;
const HIGH = 1.3;
const RACK_FROM = -2;
const END = 12;
const RACK = 0.6;
const POST = 0.04;
const UNIT = 0.11;
const RACKS = Math.ceil((END - RACK_FROM) / RACK);
const VIEW_DEPTH = 7;
const CEIL_LIGHT = 0.05;
// the rack lights: ROWS a rack, blinking every BLINK_MS, stretched into
// streaks by the view's speed (world units per unit/ms)
const ROWS = 6;
const LED_Y0 = 0.22;
const LED_DY = 0.16;
const LED_H = 0.022;
const LED_LEN = 0.05;
const STREAK = 60;
const BLINK_MS = 140;
const LED_OFF = 0.3;
const LED_COLORS = [COLOR.moneyGreen, COLOR.pairBlue];
// the opening onto the floors in the end wall, OPEN_W wide (as tall as the
// screen's shape makes it), its sill SILL up
const OPEN_W = 0.5;
const SILL = 0.1;
const FRAME = 0.02;
// the mainframe in front of it: MF_HALF wide each side, MF_DEEP deep; the
// run eases to STAND short of it by the last volley
const MF_Z = END - 1;
const MF_HALF = 0.34;
const MF_DEEP = 0.5;
const STAND = 2.4;
const STOP_Z = MF_Z - STAND;
const MF_COLS = 6;
const MF_ROWS = 9;
const MF_BLINK_MS = 160;
const CORE_UP = 0.55;
// its charge from CHARGE_FROM of the run: throbbing IDLE_HZ plus PULSES more
// over it (phase from charge, so the beats quicken), swelling and jolted by
// each round, sparks flying off it
const CHARGE_FROM = 0.58;
const IDLE_HZ = 2;
const PULSES = 9;
const SWELL = 0.1;
const THROB_SWELL = 0.05;
const TREMBLE_MF = 0.012;
const JOLT = 0.025;
const JOLT_MS = 90;
const SPARKS = 14;
const SPARK_MS = 70;
// the error lights: when (of the run) each is shot, its side and height;
// flaring ERR_LEAD before, AHEAD of the view when it's snuffed
const ERRORS = [
  { at: 0.3, side: -1, y: 0.8 },
  { at: 0.44, side: 1, y: 0.5 },
  { at: 0.56, side: -1, y: 0.95 },
  { at: 0.65, side: 1, y: 0.7 },
  { at: 0.675, side: -1, y: 0.45 },
  { at: 0.74, side: -1, y: 0.85 },
  { at: 0.765, side: 1, y: 0.95 },
];
const ERR_LEAD = 520;
const AHEAD = 1.7;
const ERR_W = 0.09;
const ERR_H = 0.05;
const ERR_GLOW = 0.16;
const TREMBLE = 0.012;
const ERR_BLAST = 0.5;
const GOLD_MS = 500;
const GOLD_R = 0.35;
// the volley at the mainframe (of the run), quickening, the last at its end
const VOLLEY = [0.84, 0.88, 0.915, 0.945, 0.97, 0.99, 1];
const VOLLEY_BLAST = 0.3;
const VOLLEY_SPREAD = 0.12;
// the player wisp low in the middle, kicked down by each shot; its rounds
const PLAYER_Y = 0.8;
const PLAYER_SIZE = 1.7;
const PLAYER_SWAY = 0.03;
const KICK = 0.025;
const KICK_MS = 160;
const ROUND_MS = 80;
const ROUND_SIZE = 1.3;
const ROUND_SPREAD = 0.04;
const LINGER_MS = 900;
// the floors zooming away, darkened from DARK0
const DARK0 = 0.45;
// the overload: its blast (of the view's width), a second one CHAIN_MS later
// and the white flash
const BLAST_SIZE = 1.5;
const CHAIN_MS = 120;
const CHAIN_SIZE = 0.7;
const FLASH_MS = 260;
const ZOOM_SHAKE = 0.6;
const HIT_SHAKE = 1.2;
const VOLLEY_SHAKE = 0.6;
const BLAST_SHAKE = 3.2;

const RED = fadeStops(COLOR.red);
const WHITE = fadeStops(COLOR.white);
const GOLD = fadeStops(COLOR.heavenlyGold);

interface ErrorLight {
  x: number;
  y: number;
  z: number;
  shot: number;
  hit: number;
  seed: number;
}

interface Shot {
  ms: number;
  // the error it snuffs, or null for the mainframe (dx, dy off its core)
  err: ErrorLight | null;
  dx: number;
  dy: number;
  from: Point;
  to: Point;
  spread: number;
  live: boolean;
  rounds: ((t: number) => Point)[];
}

// the rack lights, laid out once
let ledX: Float32Array | null = null;
let ledY = new Float32Array(0);
let ledZ = new Float32Array(0);
let ledColor = new Uint8Array(0);

function layLeds(): void {
  if (ledX) return;
  const count = 2 * RACKS * ROWS;
  ledX = new Float32Array(count);
  ledY = new Float32Array(count);
  ledZ = new Float32Array(count);
  ledColor = new Uint8Array(count);
  let i = 0;
  for (let s = 0; s < 2; s++)
    for (let r = 0; r < RACKS; r++)
      for (let j = 0; j < ROWS; j++, i++) {
        ledX[i] = (s ? 1 : -1) * RACK_X * 0.997;
        ledY[i] = LED_Y0 + j * LED_DY + (hash01(i, 10) - 0.5) * 0.04;
        ledZ[i] =
          RACK_FROM + r * RACK + POST + 0.06 + hash01(i, 11) * (RACK - 0.3);
        ledColor[i] = hash01(i, 12) < 0.6 ? 0 : 1;
      }
}

// the last sight()'s point on screen and px a unit spans there
let PX = 0;
let PY = 0;
let PS = 0;
let HZ = 0;

// fpsSight without an allocation, into PX/PY/PS (HZ set for the frame)
function sight(fps: Fps, x: number, y: number, z: number): boolean {
  const dz = z - fps.cam.z;
  if (dz < FPS_NEAR) return false;
  PS = (fps.lens.focal * fps.view.w) / dz;
  PX = fps.view.cx + (x - fps.cam.x) * PS;
  PY = HZ + (fps.cam.y - y) * PS;
  return true;
}

// a quad on the wall plane x added to the open path
function addWallQuad(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  x: number,
  y0: number,
  y1: number,
  za: number,
  zb: number,
): void {
  const near = fps.cam.z + FPS_NEAR * 1.01;
  if (zb <= near) return;
  if (za < near) za = near;
  sight(fps, x, y0, za);
  ctx.moveTo(PX, PY);
  sight(fps, x, y1, za);
  ctx.lineTo(PX, PY);
  sight(fps, x, y1, zb);
  ctx.lineTo(PX, PY);
  sight(fps, x, y0, zb);
  ctx.lineTo(PX, PY);
  ctx.closePath();
}

// a quad facing the view at depth z added to the open path
function addFaceQuad(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  z: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): void {
  if (!sight(fps, x0, y1, z)) return;
  const ax = PX;
  const ay = PY;
  const s = PS;
  ctx.rect(ax, ay, (x1 - x0) * s, (y1 - y0) * s);
}

registerEventProc(
  {
    key: KEY,
    chance: () => meta.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) =>
      floor.unlocked &&
      canStartFlightStage(context) &&
      findRewardWorkers(floor, context).length > 0,
    arm: startServerRoom,
  },
  { label: "Server Room", color: COLOR.red },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Server Room
export function forceServerRoomEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

// the end wall round the opening, its frame
function drawEndWall(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  high: number,
  top: number,
): void {
  const half = OPEN_W / 2;
  const wall = COLOR.cauldronIronDark;
  drawFpsFace(ctx, fps, END, -RACK_X, -half, 0, high, wall);
  drawFpsFace(ctx, fps, END, half, RACK_X, 0, high, wall);
  drawFpsFace(ctx, fps, END, -half, half, top, high, wall);
  drawFpsFace(ctx, fps, END, -half, half, 0, SILL, wall);
  ctx.beginPath();
  addFaceQuad(ctx, fps, END, -half - FRAME, -half, SILL, top + FRAME);
  addFaceQuad(ctx, fps, END, half, half + FRAME, SILL, top + FRAME);
  addFaceQuad(ctx, fps, END, -half, half, top, top + FRAME);
  ctx.fillStyle = COLOR.silverTicketGray;
  ctx.fill();
}

// the aisle from the view to the end wall: floor tiles, the ceiling and its
// lights, the racks with their posts and lights streaking past at `speed`
function drawAisle(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  high: number,
  now: number,
  speed: number,
): void {
  const z = fps.cam.z;
  const far = Math.min(END, z + VIEW_DEPTH);
  for (let k = Math.max(RACK_FROM, Math.floor(z)); k < END; k++)
    drawFpsFlat(
      ctx,
      fps,
      0,
      -RACK_X,
      RACK_X,
      k,
      k + 1,
      k & 1 ? COLOR.cauldronIron : COLOR.cauldronIronDark,
    );
  drawFpsFlat(ctx, fps, high, -RACK_X, RACK_X, z, END, COLOR.skySpace);
  ctx.beginPath();
  for (let k = Math.max(RACK_FROM, Math.floor(z)); k < far; k++) {
    const za = Math.max(k + 0.2, z + FPS_NEAR * 1.01);
    if (za >= k + 0.8) continue;
    sight(fps, -CEIL_LIGHT, high, za);
    ctx.moveTo(PX, PY);
    sight(fps, CEIL_LIGHT, high, za);
    ctx.lineTo(PX, PY);
    sight(fps, CEIL_LIGHT, high, k + 0.8);
    ctx.lineTo(PX, PY);
    sight(fps, -CEIL_LIGHT, high, k + 0.8);
    ctx.lineTo(PX, PY);
    ctx.closePath();
  }
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = COLOR.white;
  ctx.fill();
  ctx.globalAlpha = 1;
  for (let side = -1; side <= 1; side += 2) {
    drawFpsWall(
      ctx,
      fps,
      side * RACK_X,
      0,
      high,
      z,
      END,
      COLOR.cauldronIronDark,
    );
    drawFpsWallLines(
      ctx,
      fps,
      side * RACK_X * 0.999,
      UNIT,
      high,
      UNIT,
      z,
      far,
      COLOR.black,
      0.6,
    );
  }
  ctx.beginPath();
  for (let r = 0; r < RACKS; r++) {
    const z0 = RACK_FROM + r * RACK;
    if (z0 + POST < z || z0 > far) continue;
    addWallQuad(ctx, fps, -RACK_X * 0.998, 0, high, z0, z0 + POST);
    addWallQuad(ctx, fps, RACK_X * 0.998, 0, high, z0, z0 + POST);
  }
  ctx.fillStyle = COLOR.black;
  ctx.fill();
  const xs = ledX!;
  const len = LED_LEN + speed * STREAK;
  const blink = Math.floor(now / BLINK_MS);
  for (let c = 0; c < LED_COLORS.length; c++) {
    ctx.beginPath();
    for (let i = 0; i < xs.length; i++) {
      if (ledColor[i] !== c) continue;
      const lz = ledZ[i];
      if (lz + len < z || lz > far) continue;
      if (hash01(i, blink) < LED_OFF) continue;
      addWallQuad(ctx, fps, xs[i], ledY[i], ledY[i] + LED_H, lz, lz + len);
    }
    ctx.fillStyle = LED_COLORS[c];
    ctx.fill();
  }
}

function startServerRoom(floor: Floor, context: EventProcContext): void {
  const area = context.getScreenAreaLocal?.(floor);
  if (!area) return;
  layLeds();
  const aspect = (area.bottom - area.top) / (area.right - area.left);
  const { zoomMs, runMs, holdMs, flyMs, promoteGapMs } = meta.values;
  const tier = context.critTier ?? pickCritTierByOdds();
  const workers = findRewardWorkers(floor, context);
  const openTop = SILL + OPEN_W * aspect;
  const high = Math.max(HIGH, openTop + 0.2);
  const mfHigh = openTop + 0.12;
  const coreY = mfHigh * CORE_UP;
  const land = fpsOpeningLanding(FOCAL, END, OPEN_W, SILL, aspect);
  const runSpan = STOP_Z + FOCAL;
  // the run starts at 1.5x its average speed, easing to half of it
  const endSpeed = (0.5 * runSpan) / runMs;
  const runZ = (ms: number): number => {
    if (ms >= runMs) return STOP_Z + endSpeed * (ms - runMs);
    const u = Math.max(0, ms) / runMs;
    return -FOCAL + runSpan * u * (1.5 - 0.5 * u);
  };
  const blastMs = runMs + ROUND_MS;
  const enterMs = blastMs + holdMs;
  const diveMs = flyMs + FLIGHT_STAGE.arriveMs;
  const zEnter = runZ(enterMs);
  const chargeFrom = CHARGE_FROM * runMs;
  const chargeAt = (ms: number) =>
    clamp01((ms - chargeFrom) / (blastMs - chargeFrom));
  const throbAt = (ms: number) => {
    const c = chargeAt(ms);
    return (IDLE_HZ * Math.max(0, ms - chargeFrom)) / 1000 + PULSES * c * c;
  };

  const errors: ErrorLight[] = ERRORS.map((e, k) => {
    const shot = e.at * runMs;
    return {
      x: e.side * RACK_X * 0.99,
      y: e.y,
      z: runZ(shot + ROUND_MS) + AHEAD + 0.2 * hash01(k, 51),
      shot,
      hit: shot + ROUND_MS,
      seed: k * 13.7,
    };
  });
  const createShot = (
    ms: number,
    err: ErrorLight | null,
    dx: number,
    dy: number,
  ): Shot => {
    const shot: Shot = {
      ms,
      err,
      dx,
      dy,
      from: { x: 0, y: 0 },
      to: { x: 0, y: 0 },
      spread: 0,
      live: false,
      rounds: [],
    };
    for (let k = 0; k < 2; k++) {
      const side = k - 0.5;
      shot.rounds.push((t) => {
        const u = clamp01((t - ms) / ROUND_MS);
        const { from, to } = shot;
        return {
          x: from.x + (to.x + side * shot.spread - from.x) * u,
          y: from.y + (to.y - from.y) * u,
        };
      });
    }
    return shot;
  };
  const shots: Shot[] = errors.map((e) => createShot(e.shot, e, 0, 0));
  VOLLEY.forEach((at, k) =>
    shots.push(
      createShot(
        at * runMs,
        null,
        (hash01(k, 61) - 0.5) * VOLLEY_SPREAD,
        (hash01(k, 62) - 0.5) * VOLLEY_SPREAD,
      ),
    ),
  );
  const volleyFrom = errors.length;

  // the player wisp, swaying low in the middle, kicked down by its shots
  const player = { x: 0, y: 0, w: 0 };
  const playerX = (t: number) =>
    player.x + Math.sin(t * 0.004) * player.w * PLAYER_SWAY;
  const playerY = (t: number) =>
    player.y + Math.sin(t * 0.009) * player.w * 0.012;
  const playerAt = (t: number): Point => ({ x: playerX(t), y: playerY(t) });

  const cam = { x: 0, y: EYE, z: -FOCAL, tip: 0 };
  const fps: Fps = {
    view: { x: 0, y: 0, w: 1, h: 1, cx: 0 },
    lens: LENS,
    cam,
  };
  const blastAt: Point = { x: 0, y: 0 };

  const drawMainframe = (
    ctx: CanvasRenderingContext2D,
    ms: number,
    now: number,
  ): void => {
    if (cam.z > MF_Z - FPS_NEAR * 2) return;
    const c = chargeAt(ms);
    const pulse = 0.5 + 0.5 * Math.cos(2 * Math.PI * throbAt(ms));
    let since = Infinity;
    let hits = 0;
    for (let i = volleyFrom; i < shots.length; i++)
      if (ms >= shots[i].ms + ROUND_MS) {
        since = ms - shots[i].ms - ROUND_MS;
        hits++;
      }
    const cx =
      Math.sin(now * 0.09) * TREMBLE_MF * c +
      (hits & 1 ? 1 : -1) * JOLT * Math.exp(-since / JOLT_MS);
    const swell = 1 + SWELL * c + THROB_SWELL * c * pulse;
    const half = MF_HALF * swell;
    const top = mfHigh * swell;
    const x0 = cx - half;
    const x1 = cx + half;
    const back = MF_Z + MF_DEEP;
    drawFpsWall(ctx, fps, x0, 0, top, MF_Z, back, COLOR.black);
    drawFpsWall(ctx, fps, x1, 0, top, MF_Z, back, COLOR.black);
    drawFpsFlat(ctx, fps, top, x0, x1, MF_Z, back, COLOR.cauldronIronDark);
    drawFpsFace(ctx, fps, MF_Z, x0, x1, 0, top, COLOR.cauldronIron);
    const inset = 0.04 * swell;
    drawFpsFace(
      ctx,
      fps,
      MF_Z,
      x0 + inset,
      x1 - inset,
      2 * inset,
      top - inset,
      COLOR.skySpace,
    );
    // its lights, more of them red and blinking quicker as it charges
    const cycle = Math.floor(now / (MF_BLINK_MS * (1 - 0.75 * c)));
    const w = 0.035 * swell;
    const h = 0.02 * swell;
    const stepX = (2 * half - 4 * inset - w) / (MF_COLS - 1);
    const stepY = (top - 5 * inset - h) / (MF_ROWS - 1);
    for (let pass = 0; pass < 3; pass++) {
      ctx.beginPath();
      for (let row = 0; row < MF_ROWS; row++)
        for (let col = 0; col < MF_COLS; col++) {
          const i = row * MF_COLS + col;
          if (hash01(i, cycle) < LED_OFF) continue;
          const kind = hash01(i + 97, cycle) < c ? 0 : 1 + (i & 1);
          if (kind !== pass) continue;
          const lx = x0 + 2 * inset + col * stepX;
          const ly = 3 * inset + row * stepY;
          addFaceQuad(ctx, fps, MF_Z, lx, lx + w, ly, ly + h);
        }
      ctx.fillStyle = pass === 0 ? COLOR.red : LED_COLORS[pass - 1];
      ctx.fill();
    }
    // its core throbbing and the sparks flying off it
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    if (sight(fps, cx, coreY * swell, MF_Z)) {
      const r = PS * (0.08 + 0.12 * c + 0.1 * c * pulse);
      ctx.globalAlpha = 0.5 + 0.5 * pulse * (0.3 + 0.7 * c);
      drawGlow(ctx, RED, PX, PY, r * 2.2);
      ctx.globalAlpha = 0.4 + 0.6 * c;
      drawGlow(ctx, WHITE, PX, PY, r * (0.3 + 0.5 * c * pulse));
    }
    const base = Math.floor(now / SPARK_MS);
    for (let k = 0; k < SPARKS; k++) {
      const cyc = base + k * 31;
      if (hash01(k, cyc) > c * 0.85) continue;
      const sx = cx + (hash01(k, cyc + 1) * 2 - 1) * half * 1.1;
      const sy = hash01(k, cyc + 2) * top;
      if (!sight(fps, sx, sy, MF_Z)) continue;
      ctx.globalAlpha = 1;
      drawGlow(ctx, GOLD, PX, PY, PS * 0.05 * (0.5 + c));
      drawGlow(ctx, WHITE, PX, PY, PS * 0.02 * (0.5 + c));
    }
    endLightBatch(ctx);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;
  };

  const drawErrors = (
    ctx: CanvasRenderingContext2D,
    ms: number,
    now: number,
  ): void => {
    const near = cam.z + FPS_NEAR * 2;
    // the lights themselves: red till snuffed, then green
    for (let pass = 0; pass < 2; pass++) {
      ctx.beginPath();
      for (let i = 0; i < errors.length; i++) {
        const e = errors[i];
        if (ms < e.shot - ERR_LEAD || e.z < near) continue;
        if (ms < e.hit !== (pass === 0)) continue;
        const z0 = e.z - ERR_W / 2;
        addWallQuad(
          ctx,
          fps,
          e.x,
          e.y - ERR_H / 2,
          e.y + ERR_H / 2,
          z0,
          z0 + ERR_W,
        );
      }
      ctx.fillStyle = pass === 0 ? COLOR.red : COLOR.moneyGreen;
      ctx.fill();
    }
    // their glow: trembling brighter till hit, then a gold flare as it lands
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let i = 0; i < errors.length; i++) {
      const e = errors[i];
      const start = e.shot - ERR_LEAD;
      if (ms < start || e.z < near) continue;
      if (ms < e.hit) {
        const k = clamp01((ms - start) / ERR_LEAD);
        const tx = Math.sin(now * 0.13 + e.seed) * TREMBLE * k;
        const ty = Math.cos(now * 0.17 + e.seed) * TREMBLE * k;
        if (!sight(fps, e.x, e.y + ty, e.z + tx)) continue;
        const r =
          PS *
          ERR_GLOW *
          (0.3 + 0.7 * k) *
          (1 + 0.2 * Math.sin(now * 0.06 + e.seed));
        ctx.globalAlpha = 0.4 + 0.6 * k;
        drawGlow(ctx, RED, PX, PY, r);
        drawGlow(ctx, WHITE, PX, PY, r * 0.35 * k);
      } else {
        const a = (ms - e.hit) / GOLD_MS;
        if (a >= 1 || !sight(fps, e.x, e.y, e.z)) continue;
        const r = PS * GOLD_R * (0.6 + 0.8 * a);
        ctx.globalAlpha = 1 - a;
        drawGlow(ctx, GOLD, PX, PY, r);
        drawGlow(ctx, WHITE, PX, PY, r * 0.3);
      }
    }
    endLightBatch(ctx);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;
  };

  const drawShots = (
    ctx: CanvasRenderingContext2D,
    ms: number,
    now: number,
  ): void => {
    for (let i = 0; i < shots.length; i++) {
      const shot = shots[i];
      if (ms < shot.ms || ms > shot.ms + ROUND_MS + LINGER_MS) continue;
      const e = shot.err;
      shot.live = e
        ? sight(fps, e.x, e.y, e.z)
        : sight(fps, shot.dx, coreY + shot.dy, MF_Z);
      if (!shot.live) continue;
      shot.to.x = PX;
      shot.to.y = PY;
      shot.spread = ROUND_SPREAD * PS;
      shot.from.x = playerX(ms);
      shot.from.y = playerY(ms);
      for (let k = 0; k < shot.rounds.length; k++)
        drawWispBetween(
          ctx,
          shot.rounds[k],
          ms,
          now,
          WISP_SIZE * ROUND_SIZE,
          1,
          shot.ms,
          shot.ms + ROUND_MS,
        );
      drawDetonation(
        ctx,
        shot.to,
        ms - shot.ms - ROUND_MS,
        PS * (e ? ERR_BLAST : VOLLEY_BLAST),
        now,
      );
    }
  };

  const drawScene = (
    ctx: CanvasRenderingContext2D,
    view: FlightView,
    ms: number,
    now: number,
    floors: ScreenCopy,
  ): void => {
    let speed: number;
    if (ms < enterMs) {
      cam.z = runZ(ms);
      cam.x = Math.sin(ms * SWAY_RATE) * SWAY;
      cam.y = EYE + Math.abs(Math.sin(cam.z * STRIDE)) * STEP;
      speed =
        ms < runMs
          ? (runSpan * (1.5 - Math.max(0, ms) / runMs)) / runMs
          : endSpeed;
    } else {
      // the rush through the opening, at speed from the start
      const r = clamp01((ms - enterMs) / diveMs);
      cam.z = lerp([zEnter, land.z], r * (0.6 + 0.4 * r));
      cam.x = 0;
      cam.y = lerp([EYE, land.y], smoothstep(r));
      speed = ((land.z - zEnter) * (0.6 + 0.8 * r)) / diveMs;
    }
    fps.view = view;
    HZ = fpsHorizon(fps);
    drawFpsSky(ctx, fps, COLOR.skySpace);
    drawFpsGround(ctx, fps, COLOR.black);
    drawFpsOpening(ctx, fps, floors, END + 0.01, OPEN_W, SILL, aspect);
    drawEndWall(ctx, fps, high, openTop);
    drawAisle(ctx, fps, high, now, speed);
    if (ms < blastMs) drawMainframe(ctx, ms, now);
    drawErrors(ctx, ms, now);
    // the player wisp, kicked by its latest shot
    let last = -Infinity;
    for (let i = 0; i < shots.length && shots[i].ms <= ms; i++)
      last = shots[i].ms;
    const kick = Math.max(0, 1 - (ms - last) / KICK_MS) ** 2;
    player.x = view.cx;
    player.y = view.y + view.h * PLAYER_Y + kick * KICK * view.h;
    player.w = view.w;
    drawShots(ctx, ms, now);
    // the overload: a blast, a second on its heels, and the white flash
    if (ms >= blastMs && sight(fps, 0, coreY, MF_Z)) {
      blastAt.x = PX;
      blastAt.y = PY;
      drawDetonation(ctx, blastAt, ms - blastMs, view.w * BLAST_SIZE, now);
      drawDetonation(
        ctx,
        blastAt,
        ms - blastMs - CHAIN_MS,
        view.w * BLAST_SIZE * CHAIN_SIZE,
        now,
      );
    }
    const flash = (ms - blastMs) / FLASH_MS;
    if (flash >= 0 && flash < 1) {
      ctx.globalAlpha = 0.85 * (1 - flash) ** 2;
      ctx.fillStyle = COLOR.white;
      ctx.fillRect(view.x, view.y, view.w, view.h);
      ctx.globalAlpha = 1;
    }
    // the darkened floors zooming away into the aisle's vanishing point
    if (ms < zoomMs) {
      const e = smoothstep(clamp01(ms / zoomMs));
      const k = 1 - e;
      const x = view.cx + (view.x - view.cx) * k;
      const y = HZ + (view.y - HZ) * k;
      drawScreenPart(
        ctx,
        floors,
        view.x,
        view.y,
        view.w,
        view.h,
        x,
        y,
        view.w * k,
        view.h * k,
      );
      ctx.globalAlpha = DARK0 + (1 - DARK0) * e * 0.8;
      ctx.fillStyle = COLOR.black;
      ctx.fillRect(x, y, view.w * k, view.h * k);
      ctx.globalAlpha = 1;
    }
    drawWisp(
      ctx,
      playerAt,
      ms,
      now,
      WISP_SIZE * PLAYER_SIZE,
      Math.min(1, 0.6 * kick + 0.6 * chargeAt(ms)),
      clamp01(ms / zoomMs),
    );
  };

  // a perma tier for the next worker in view that can still climb
  let next = 0;
  const promote = (w: RewardWorker): boolean => {
    const { floor: f, workerIndex: i } = w.worker;
    if (getWorkerPermaTier(f, i) === CRIT_TIER_ORDER[0]) return false;
    promoteWorkerPermaTier(f, i);
    return true;
  };
  const promoteNext = (): void => {
    for (let tries = 0; tries < workers.length; tries++) {
      const w = workers[next++ % workers.length];
      if (promote(w)) return;
    }
  };

  const beat = startFlightStage(KEY, floor, context, {
    flyMs,
    enter: { ms: enterMs, draw: drawScene },
    ownLanding: true,
    draw: (ctx, view, ms, now, floors) =>
      drawScene(ctx, view, enterMs + ms, now, floors),
    onEnd: () => {
      workers.forEach(({ worker }, k) =>
        setTimeout(
          () =>
            celebrateWorkerBoost(worker.floor, worker.workerIndex, Date.now()),
          k * promoteGapMs,
        ),
      );
      context.applyTierCrit?.(floor, tier);
      endEventProc(KEY);
    },
  });
  if (!beat) return;
  beat(-enterMs, () => {
    playSwoosh();
    shakeScreen(ZOOM_SHAKE);
  });
  errors.forEach((e, k) => {
    beat(e.shot - ERR_LEAD - enterMs, () => playSpinTick(0.8 + 0.1 * k));
    beat(e.hit - enterMs, () => {
      playExplosion();
      shakeScreen(HIT_SHAKE);
      promoteNext();
    });
  });
  // the mainframe's throbs, quickening and harder as it charges
  let throbs = 0;
  for (let ms = chargeFrom; ms < blastMs; ms += 10) {
    const n = Math.floor(throbAt(ms));
    if (n <= throbs) continue;
    throbs = n;
    const c = chargeAt(ms);
    beat(ms - enterMs, () => {
      playSpinTick(1 + 0.5 * c);
      shakeScreen(0.3 + 0.8 * c);
    });
  }
  for (let i = volleyFrom; i < shots.length - 1; i++) {
    const k = i - volleyFrom;
    beat(shots[i].ms + ROUND_MS - enterMs, () => {
      playExplosion();
      shakeScreen(VOLLEY_SHAKE + 0.2 * k);
    });
  }
  beat(blastMs - enterMs, () => {
    playSlamExplosion();
    playCritExplosion();
    shakeScreen(BLAST_SHAKE);
    for (const w of workers) promote(w);
  });
  beat(0, playSwoosh);
}
