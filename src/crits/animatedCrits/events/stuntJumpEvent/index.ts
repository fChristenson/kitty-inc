// the "Stunt Jump" event (road race; perma tiers), a flight-stage event (see
// ../../flightStage) with its own way in, drawn with shared/animationStyles/race's street and
// racer wisp in shared/animationStyles/fps's world: its crit's click zooms the floors away into a
// street race already flat out. The street throws up ramps over chasms cut
// between the blocks, each higher and coming quicker: the wisp-car hits each
// at full speed and launches, hangs with the view punching wide and speed
// lines tearing past, and slams down on the far side in a flash, a bang and
// the hardest shake yet, every landing striking workers in view up a perma
// tier; the last a mega jump over a whole gap between buildings, a huge
// landing, then through the finish gate's window onto the floors, where the
// promoted workers celebrate
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
  drawFpsFace,
  drawFpsFlat,
  drawFpsGround,
  drawFpsSky,
  fillFpsQuad,
  fpsSight,
  FPS_NEAR,
  type Fps,
  type FpsCorner,
  type FpsScreen,
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
import type { Point } from "../../../../shared/wisp";
import { CRIT_TIER_ORDER, pickCritTierByOdds } from "../../../critTypes";
import { drawPoppingCritText } from "../../../critFlash/critText";
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
} from "../../flightStage";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";

const KEY = "stuntJump";

// the view: its lens (widening by the jump's AIR_WIDE at the top of a jump),
// how far behind the car and how high it rides, how far it leans after the
// car and how much it rises with it
const FOCAL = 1.2;
const HORIZON = 0.42;
const BEHIND = 1.5;
const EYE = 0.625;
const FOLLOW = 0.5;
const CAM_LIFT = 0.55;
// the finish gate at the road's end and its window, as wide as the road
const GATE_Z = 40;
const OPEN_W = ROAD_STREET.half * 2;
// the race: its speed at the start and how much it picks up by the end, the
// kick a launch adds and how fast it fades; how far the car pulls ahead into
// the gate's window
const SPEED = 0.6;
const PICK_UP = 0.8;
const KICK_SPEED = 1.3;
const KICK_MS = 300;
const STEP_MS = 8;
const PULL_AHEAD = 0.8;
// the jumps, the mega one last: each ramp's height, the arc's rise over it,
// how wide the view punches, the landing's flash, blast (of the view's width)
// and shake, and how many workers' perma tiers it lands (shares)
const RAMP_H = [0.2, 0.28, 0.36, 0.55];
const APEX = [0.45, 0.65, 0.85, 1.6];
const AIR_WIDE = [0.18, 0.24, 0.3, 0.42];
const LAND_FLASH = [0.35, 0.45, 0.55, 0.85];
const LAND_BLAST = [0.35, 0.45, 0.55, 0.95];
const LAND_SHAKE = [1.4, 1.9, 2.4, 3.4];
const SHARES = [1, 1, 1, 2];
const LAND_FLASH_MS = 260;
const LAUNCH_SHAKE = 0.8;
// a ramp: its length and half width, its hazard bands; the chasm starting
// GAP_LIP past its top and ending LAND_SHORT before the car touches down
const RAMP_LONG = 1.2;
const RAMP_HALF = 0.45;
const RAMP_BANDS = 4;
const RAMP_LIP = 0.04;
const GAP_LIP = 0.05;
const LAND_SHORT = 0.35;
// the chasm: its depth, how far it reaches either side, the traffic's lights
// streaking along its floor, the cliff's gold lip and the blocks' faces
// across it with their windows
const DEEP = 2.5;
const WIDE = 30;
const LIGHTS = 6;
const LIGHT_SPAN = 8;
const LIGHT_LONG = 0.6;
const LIGHT_THIN = 0.06;
const LIGHT_SPEED = 0.004;
const CLIFF_LIP = 0.06;
const FACADE_H = 2.2;
const FACADE_REACH = 12;
const FACADE_WINDOWS = 5;
const FACADE_COLS = 2;
// the racer: weave, hover, its wisp swelling in the air, the dip as it lands
const WEAVE = 0.18;
const WEAVE_RATE = 0.0019;
const HOVER = 0.12;
const RACER = 0.07;
const RACER_AIR = 0.5;
const DIP = 0.8;
const DIP_MS = 110;
const SHADOW = 0.35;
// speed lines tearing out from the horizon in the air (of the view's width)
const LINES = 24;
const LINE_FROM = 0.24;
const LINE_REACH = 0.72;
const LINE_LONG = 0.24;
const LINE_SPEED = 0.0024;
const LINE_SQUASH = 1.3;
const LINE_WIDTH = 10;
const LINE_ALPHA = 0.75;
// a landing's tally over the car: where, how long it shows, how far it rises
const LABEL_Y = 0.26;
const LABEL_MS = 650;
const LABEL_RISE = 0.06;
const LABEL_STYLE = { fontSize: 44, strokeWidth: 7 };
const MEGA_LABEL_STYLE = { fontSize: 64, strokeWidth: 9 };
const ZOOM = 1.2;
const START_SHAKE = 1.2;
const STREET_REACH = 26;

interface Jump {
  launch: number;
  air: number;
  land: number;
  mega: boolean;
  x: number;
  rampFrom: number;
  rampTo: number;
  gapFrom: number;
  gapTo: number;
  landX: number;
  landZ: number;
  workers: RewardWorker[];
  label: string | null;
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
    arm: startStuntJump,
  },
  { label: "Stunt Jump", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Stunt Jump
export function forceStuntJumpEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

// the window's height, so it has the screen's shape and fills it on landing
const openHigh = (view: FpsScreen) => (OPEN_W * view.h) / view.w;

// scratch quads and points, refilled for every piece drawn
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

// the ramp up to a jump, cut where it passes under the view: its sides, then
// its slope in gold and black bands with a white lip at the top
function drawRamp(ctx: CanvasRenderingContext2D, fps: Fps, j: Jump, h: number) {
  const near = fps.cam.z + FPS_NEAR * 1.01;
  if (j.rampTo <= near || j.rampFrom > fps.cam.z + STREET_REACH) return;
  const z0 = Math.max(j.rampFrom, near);
  const y0 = (h * (z0 - j.rampFrom)) / RAMP_LONG;
  for (let side = -1; side <= 1; side += 2) {
    const x = j.x + side * RAMP_HALF;
    setCorner(0, x, 0, z0);
    setCorner(1, x, y0, z0);
    setCorner(2, x, h, j.rampTo);
    setCorner(3, x, 0, j.rampTo);
    fillFpsQuad(ctx, fps, QUAD, COLOR.cauldronIronDark);
  }
  const band = RAMP_LONG / RAMP_BANDS;
  for (let b = 0; b < RAMP_BANDS; b++) {
    const za = Math.max(z0, j.rampFrom + b * band);
    const zb = j.rampFrom + (b + 1) * band;
    if (zb <= za) continue;
    const ya = (h * (za - j.rampFrom)) / RAMP_LONG;
    const yb = (h * (zb - j.rampFrom)) / RAMP_LONG;
    setCorner(0, j.x - RAMP_HALF, ya, za);
    setCorner(1, j.x + RAMP_HALF, ya, za);
    setCorner(2, j.x + RAMP_HALF, yb, zb);
    setCorner(3, j.x - RAMP_HALF, yb, zb);
    fillFpsQuad(
      ctx,
      fps,
      QUAD,
      b % 2 ? COLOR.cauldronIronDark : COLOR.heavenlyGold,
    );
  }
  const zl = Math.max(z0, j.rampTo - RAMP_LIP);
  setCorner(0, j.x - RAMP_HALF, (h * (zl - j.rampFrom)) / RAMP_LONG, zl);
  setCorner(1, j.x + RAMP_HALF, QUAD[0][1], zl);
  setCorner(2, j.x + RAMP_HALF, h, j.rampTo);
  setCorner(3, j.x - RAMP_HALF, h, j.rampTo);
  fillFpsQuad(ctx, fps, QUAD, COLOR.white);
}

// the chasm cut across the city: its floor far below with traffic streaking
// along it, the far cliff with its gold lip, and the blocks' faces across it
function drawChasm(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  j: Jump,
  k: number,
  now: number,
) {
  const { gapFrom: from, gapTo: to } = j;
  drawFpsFlat(ctx, fps, -DEEP, -WIDE, WIDE, from, to, COLOR.skySpace);
  for (let i = 0; i < LIGHTS; i++) {
    const dir = i % 2 ? 1 : -1;
    const run =
      (now * LIGHT_SPEED * (1 + hash01(i, 9301 + k)) +
        hash01(i, 9302 + k) * LIGHT_SPAN) %
      LIGHT_SPAN;
    const lx = dir * (run - LIGHT_SPAN / 2);
    const lz = from + ((to - from) * (i + 0.5)) / LIGHTS;
    drawFpsFlat(
      ctx,
      fps,
      -DEEP + 0.01,
      lx,
      lx + LIGHT_LONG,
      lz,
      lz + LIGHT_THIN,
      i % 3 ? COLOR.heavenlyGold : COLOR.white,
    );
  }
  drawFpsFace(ctx, fps, to, -WIDE, WIDE, -DEEP, 0, COLOR.cauldronIronDark);
  drawFpsFace(ctx, fps, to, -WIDE, WIDE, -CLIFF_LIP, 0, COLOR.heavenlyGold);
  const inner = ROAD_STREET.half + ROAD_STREET.kerb + ROAD_STREET.pavement;
  const outer = inner + ROAD_STREET.depth;
  const windows = to - fps.cam.z < FACADE_REACH;
  for (let side = -1; side <= 1; side += 2) {
    drawFpsFace(
      ctx,
      fps,
      to,
      side < 0 ? -outer : inner,
      side < 0 ? -inner : outer,
      0,
      FACADE_H,
      COLOR.unionBossSlate,
    );
    if (!windows) continue;
    const step = (outer - inner) / FACADE_COLS;
    for (let c = 0; c < FACADE_COLS; c++)
      for (let r = 0; r < FACADE_WINDOWS; r++) {
        const x0 = side * (inner + step * (c + 0.25));
        const x1 = side * (inner + step * (c + 0.75));
        const y = 0.3 + r * 0.38;
        drawFpsFace(
          ctx,
          fps,
          to,
          Math.min(x0, x1),
          Math.max(x0, x1),
          y,
          y + 0.2,
          hash01(c * 7 + r + side * 3, 9303 + k) < 0.55
            ? COLOR.goldenTicketYellow
            : COLOR.cauldronIronDark,
        );
      }
  }
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
  drawFpsFlat(
    ctx,
    fps,
    0,
    -WIDE,
    WIDE,
    Math.max(from, near),
    Math.min(end, near + STREET_REACH),
    COLOR.shareholdersGreen,
  );
  drawRoadStreet(ctx, fps, ROAD_STREET, end, from);
}

function startStuntJump(floor: Floor, context: EventProcContext): void {
  const {
    enterMs,
    flyMs,
    firstJumpMs,
    jumpGapsMs,
    airMs,
    holdMs,
    mergeMs,
    promoteGapMs,
  } = meta.values;
  const tier = context.critTier ?? pickCritTierByOdds();
  // the race's clock runs from the click, through the way in, to the crash
  const raceMs = enterMs + flyMs + FLIGHT_STAGE.arriveMs;
  const landZ = GATE_Z - FOCAL * OPEN_W;
  const u = (ms: number) => clamp01(ms / raceMs);
  const launches: number[] = [firstJumpMs];
  for (const gap of jumpGapsMs)
    launches.push(launches[launches.length - 1] + gap);
  const airs: number[] = [...airMs, holdMs];
  const kickAt = (ms: number) => {
    let s = 0;
    for (const l of launches) if (ms >= l) s += Math.exp(-(ms - l) / KICK_MS);
    return s;
  };
  // the view's run: faster and faster, every launch a kick, ending on landZ
  const run: number[] = [];
  let z = 0;
  for (let ms = 0; ms <= raceMs + STEP_MS; ms += STEP_MS) {
    run.push(z);
    z += (SPEED + PICK_UP * u(ms) + KICK_SPEED * kickAt(ms)) * STEP_MS;
  }
  const scale = landZ / run[Math.round(raceMs / STEP_MS)];
  const camZ = (ms: number) =>
    run[Math.max(0, Math.min(run.length - 1, Math.round(ms / STEP_MS)))] *
    scale;
  const landing = (ms: number) =>
    smoothstep(clamp01((ms - (raceMs - mergeMs)) / mergeMs));
  const shipZ = (ms: number) =>
    camZ(ms) + BEHIND + PULL_AHEAD * landing(ms) ** 2;
  const shipX = (ms: number) =>
    WEAVE * Math.sin(ms * WEAVE_RATE) * (1 - landing(ms));

  // every worker in view, shared out over the landings by SHARES (round
  // again when there are fewer workers than shares)
  const workers = findRewardWorkers(floor, context);
  const shares = SHARES.reduce((a, b) => a + b, 0);
  const total = Math.max(workers.length, shares);
  const jumps: Jump[] = launches.map((launch, k) => {
    const air = airs[k];
    const land = launch + air;
    const rampTo = shipZ(launch);
    const landZ = shipZ(land);
    return {
      launch,
      air,
      land,
      mega: k === launches.length - 1,
      x: shipX(launch),
      rampFrom: rampTo - RAMP_LONG,
      rampTo,
      gapFrom: rampTo + GAP_LIP,
      gapTo: landZ - LAND_SHORT,
      landX: shipX(land),
      landZ,
      workers: [],
      label: null,
    };
  });
  for (let i = 0; i < total; i++) {
    const at = ((i + 0.5) * shares) / total;
    let k = 0;
    for (let sum = SHARES[0]; sum <= at && k < SHARES.length - 1; )
      sum += SHARES[++k];
    if (workers.length > 0) jumps[k].workers.push(workers[i % workers.length]);
  }

  // the car's height over the road: up each ramp, arcing over each chasm,
  // dipping as it slams down
  const shipY = (ms: number, sz: number) => {
    let dip = 1;
    for (let k = 0; k < jumps.length; k++) {
      const j = jumps[k];
      if (ms >= j.launch && ms < j.land) {
        const p = (ms - j.launch) / j.air;
        return HOVER + RAMP_H[k] * (1 - p) + APEX[k] * 4 * p * (1 - p);
      }
      if (sz >= j.rampFrom && sz < j.rampTo)
        return HOVER + (RAMP_H[k] * (sz - j.rampFrom)) / RAMP_LONG;
      if (ms >= j.land)
        dip = Math.min(dip, 1 - DIP * Math.exp(-(ms - j.land) / DIP_MS));
    }
    return HOVER * dip;
  };
  // how wide the view punches: the jump's AIR_WIDE at the top of its arc
  const wideAt = (ms: number) => {
    for (let k = 0; k < jumps.length; k++) {
      const j = jumps[k];
      if (ms >= j.launch && ms < j.land)
        return AIR_WIDE[k] * Math.sin((Math.PI * (ms - j.launch)) / j.air);
    }
    return 0;
  };
  const overChasm = (sz: number) => {
    for (let k = 0; k < jumps.length; k++)
      if (sz >= jumps[k].gapFrom && sz < jumps[k].gapTo) return true;
    return false;
  };
  const racer = createRaceWisp((ms) => {
    SPOT.x = shipX(ms);
    SPOT.z = shipZ(ms);
    SPOT.y = shipY(ms, SPOT.z);
    return SPOT;
  });
  const maxWide = AIR_WIDE[AIR_WIDE.length - 1];

  // the race at ms on its clock
  const drawScene = (
    ctx: CanvasRenderingContext2D,
    view: FpsScreen,
    ms: number,
    now: number,
    floors: ScreenCopy,
  ): void => {
    const land = landing(ms);
    const wide = wideAt(ms);
    const x = shipX(ms);
    const sz = shipZ(ms);
    const sy = shipY(ms, sz);
    const eye = EYE + CAM_LIFT * Math.max(0, sy - HOVER);
    const fps: Fps = {
      view,
      lens: { focal: FOCAL * (1 - wide), horizon: HORIZON },
      cam: {
        x: x * FOLLOW * (1 - land),
        y: eye + (openHigh(view) / 2 - eye) * land,
        z: camZ(ms),
        tip: 0,
      },
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
    // far to near: each stretch of street with the ramp on it, then the
    // chasm before it, so the near lip covers the chasm's depths
    let end = GATE_Z;
    for (let k = jumps.length - 1; k >= 0; k--) {
      const j = jumps[k];
      drawStretch(ctx, fps, j.gapTo, end);
      if (k + 1 < jumps.length) drawRamp(ctx, fps, jumps[k + 1], RAMP_H[k + 1]);
      if (j.gapTo > fps.cam.z && j.gapFrom < fps.cam.z + STREET_REACH)
        drawChasm(ctx, fps, j, k, now);
      end = j.gapFrom;
    }
    drawStretch(ctx, fps, -Infinity, end);
    drawRamp(ctx, fps, jumps[0], RAMP_H[0]);
    // the car's shadow on solid ground, shrinking as it rises
    if (sz < GATE_Z && !overChasm(sz)) {
      const at = fpsSight(fps, x, 0, sz);
      if (at) {
        const r = RACER * at.s * Math.max(0.3, 1 - (sy - HOVER));
        ctx.globalAlpha = SHADOW;
        ctx.fillStyle = COLOR.black;
        ctx.beginPath();
        ctx.ellipse(at.x, at.y, r, r * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    const air = wide / maxWide;
    if (sz < GATE_Z)
      racer(ctx, fps, ms, now, RACER * (1 + RACER_AIR * air), 0.5 + air);
    // speed lines tearing out from the horizon in the air
    if (air > 0.05) {
      const hx = view.cx;
      const hy = view.y + view.h * HORIZON;
      for (let i = 0; i < LINES; i++) {
        const a = hash01(i, 9311) * Math.PI * 2;
        const r =
          view.w *
          (LINE_FROM + ((now * LINE_SPEED + hash01(i, 9312)) % 1) * LINE_REACH);
        const r2 = r + view.w * LINE_LONG;
        LINE_A.x = hx + Math.cos(a) * r;
        LINE_A.y = hy + Math.sin(a) * r * LINE_SQUASH;
        LINE_B.x = hx + Math.cos(a) * r2;
        LINE_B.y = hy + Math.sin(a) * r2 * LINE_SQUASH;
        drawBeam(ctx, LINE_A, LINE_B, LINE_WIDTH, LINE_ALPHA * air);
      }
    }
    // each landing: a blast where the car slammed down, the screen flashing
    // white, the perma tiers it landed tallied over the car
    for (let k = 0; k < jumps.length; k++) {
      const j = jumps[k];
      const since = ms - j.land;
      if (since < 0) continue;
      const at = fpsSight(fps, j.landX, 0, j.landZ);
      if (at) {
        drawDetonation(ctx, at, since, view.w * LAND_BLAST[k], now);
        if (j.mega)
          drawWhiteBurst(ctx, at.x, at.y, since / LAND_FLASH_MS / 2, 1.6);
      }
      if (since < LAND_FLASH_MS) {
        ctx.globalAlpha = LAND_FLASH[k] * (1 - since / LAND_FLASH_MS) ** 2;
        ctx.fillStyle = COLOR.white;
        ctx.fillRect(view.x, view.y, view.w, view.h);
        ctx.globalAlpha = 1;
      }
      if (j.label !== null && since < LABEL_MS) {
        const t = since / LABEL_MS;
        ctx.globalAlpha = 1 - smoothstep(clamp01((t - 0.6) / 0.4));
        drawPoppingCritText(
          ctx,
          j.label,
          view.cx,
          view.y + view.h * (LABEL_Y - LABEL_RISE * t),
          COLOR.heavenlyGold,
          now - since,
          now,
          j.mega ? MEGA_LABEL_STYLE : LABEL_STYLE,
        );
        ctx.globalAlpha = 1;
      }
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
      workers.forEach((w, k) =>
        setTimeout(
          () =>
            celebrateWorkerBoost(
              w.worker.floor,
              w.worker.workerIndex,
              Date.now(),
            ),
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
    shakeScreen(START_SHAKE);
  });
  jumps.forEach((j, k) => {
    beat(j.launch - enterMs, () => {
      playSwoosh();
      shakeScreen(LAUNCH_SHAKE);
    });
    beat(j.land - enterMs, () => {
      // the landing's perma tiers, each worker one up while it can climb
      let given = 0;
      for (const w of j.workers) {
        const { floor: f, workerIndex: i } = w.worker;
        if (getWorkerPermaTier(f, i) === CRIT_TIER_ORDER[0]) continue;
        promoteWorkerPermaTier(f, i);
        given++;
      }
      j.label = given > 0 ? `+${given} Perma` : null;
      shakeScreen(LAND_SHAKE[k]);
      if (j.mega) {
        playCritExplosion();
        playSlamExplosion();
      } else playExplosion();
    });
  });
}
