// the "Night Train" event (fps; perma tiers), a flight-stage event (see
// ../../flightStage) with its own way in, drawn in first person with
// shared/animationStyles/fps: its crit's click slides the floors' screen aside like a train's
// door and the view sprints down a speeding night train, city lights
// streaking past the windows, the carriage swaying; each carriage's door
// hisses open on a guard, dropped as the view runs at him, a big one in the
// last taking two. The end door slides open on the floors, the view dives
// through, and every worker in view climbs a perma tier
import meta from "./meta";
import type { Floor } from "../../../../gameState";
import { COLOR } from "../../../../palette";
import { playSwoosh } from "../../../../sound";
import {
  playCritExplosion,
  playExplosion,
} from "../../../../shared/explosionBang";
import {
  createFpsShot,
  drawFpsEnemy,
  drawFpsFace,
  drawFpsFlat,
  drawFpsGround,
  drawFpsOpening,
  drawFpsShots,
  drawFpsSky,
  drawFpsWall,
  drawFpsWallLines,
  fpsEnemyPose,
  fpsOpeningLanding,
  FPS_GUARD,
  FPS_ROUND_MS,
  type Fps,
  type FpsEnemyLook,
  type FpsLens,
  type FpsShot,
} from "../../../../shared/animationStyles/fps";
import { shakeScreen } from "../../../../shared/screenShake";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { hash01 } from "../../../../shared/twinkle";
import { drawScreenPart, type ScreenCopy } from "../../../../shared/screenCopy";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { findRewardWorkers, giveWorkerTier } from "../../eventRewards";
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

const KEY = "nightTrain";

// the view starts FOCAL behind z 0, eye EYE up, and sprints RUN world units a
// second, bobbing STEP with each stride, the carriage swaying SWAY
const FOCAL = 1.2;
const LENS: FpsLens = { focal: FOCAL, horizon: 0.5 };
const EYE = 0.62;
const RUN = 3.6;
const STEP = 0.02;
const STRIDE = 5;
const SWAY = 0.03;
const SWAY_RATE = 0.004;
// the carriages: HALF wide, at least HIGH tall, doorways DOOR either side of
// the middle (as tall as the screen's shape makes them), the doors along at
// DOORS and the end door at END; a door slides open OPEN_AHEAD before the view
// gets to it, over OPEN_MS
const HALF = 0.6;
const HIGH = 1.25;
const OVER_DOOR = 0.15;
const DOOR = 0.425;
const DOORS = [2, 5, 8];
const END = 11;
const OPEN_AHEAD = 2.4;
const OPEN_MS = 200;
const DOOR_PANE = 0.06;
const PANE: [number, number] = [0.55, 0.95];
// the walls: a panel to WAIST, the window band to SILL_TOP, pillars between
// the windows every PILLAR_EVERY; city lights streaking past, LIGHTS of them
// LIGHT_LONG long racing back STREAK a ms, between LIGHT_Y high
const WAIST = 0.55;
const SILL_TOP = 1.15;
const PILLAR_EVERY = 1;
const PILLAR = 0.08;
const LIGHTS = 26;
const LIGHT_EVERY = 0.53;
const LIGHT_LONG = 0.7;
const LIGHT_THIN = 0.025;
const LIGHT_Y: [number, number] = [0.62, 0.92];
const STREAK = 0.014;
const SEAMS: [number, number] = [0.3, 0.2];
// the ceiling's lights, the aisle runner
const CEIL_LIGHT = 0.15;
const CEIL_EVERY = 1;
const RUNNER = 0.18;
// the guards: in each carriage behind its door, shot when the view is
// `ahead` short of the door, the big one twice
const GUARDS = [
  { x: -0.25, side: -1, scale: 1, ahead: 1.5, shots: [0] },
  { x: 0.25, side: 1, scale: 1, ahead: 1.5, shots: [0] },
  { x: 0.12, side: -1, scale: 1.35, ahead: 1.9, shots: [0, 150] },
];
const BEHIND_DOOR = 1.2;
const AIM_LAG = 80;
const CHEST = 0.42;
const HIT_BLAST = 0.15;
const KILL_BLAST = 0.3;
const BOSS_BLAST = 0.55;
const NEAREST = 0.3;
// the dive through the end door, from DIVE_AHEAD short of it
const DIVE_AHEAD = 2.2;
const GUN_UP_MS = 250;
const GUN_DOWN = 3;
const SLIDE_SHAKE = 0.6;
const DOOR_SHAKE = 0.5;
const SHOT_SHAKE = 0.6;
const KILL_SHAKE = 1.4;
const BOSS_SHAKE = 3;

interface Guard {
  x: number;
  z: number;
  door: number;
  side: number;
  look: FpsEnemyLook;
  aims: number;
  hits: number[];
  dies: number;
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
    arm: startNightTrain,
  },
  { label: "Night Train", color: COLOR.nightShiftIndigo },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Night Train
export function forceNightTrainEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

// a bulkhead at z round its doorway, the two halves of its door slid `open`
// 0..1 into it
function drawDoor(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  z: number,
  open: number,
  doorHigh: number,
  high: number,
): void {
  drawFpsFace(ctx, fps, z, -HALF, -DOOR, 0, high, COLOR.cauldronIronDark);
  drawFpsFace(ctx, fps, z, DOOR, HALF, 0, high, COLOR.cauldronIronDark);
  drawFpsFace(ctx, fps, z, -DOOR, DOOR, doorHigh, high, COLOR.cauldronIronDark);
  const w = DOOR * (1 - open);
  if (w <= 0.01) return;
  for (const x0 of [-DOOR, DOOR - w]) {
    drawFpsFace(ctx, fps, z, x0, x0 + w, 0, doorHigh, COLOR.silverTicketGray);
    if (w > 3 * DOOR_PANE)
      drawFpsFace(
        ctx,
        fps,
        z,
        x0 + DOOR_PANE,
        x0 + w - DOOR_PANE,
        PANE[0],
        PANE[1],
        COLOR.skySpace,
      );
  }
}

// the carriages' walls, ceiling and floor from the view to the end door, the
// city's lights streaking past their windows
function drawCarriages(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  high: number,
  ms: number,
): void {
  const z = fps.cam.z;
  const span = END + 2;
  for (const x of [-HALF, HALF]) {
    drawFpsWall(ctx, fps, x, 0, WAIST, z, END, COLOR.cauldronIron);
    drawFpsWall(ctx, fps, x, WAIST, SILL_TOP, z, END, COLOR.skySpace);
    drawFpsWall(ctx, fps, x, SILL_TOP, high, z, END, COLOR.wallShadow);
    for (let k = 0; k < LIGHTS; k++) {
      const lz =
        ((((k * LIGHT_EVERY - ms * STREAK) % span) + span) % span) - FOCAL;
      const ly = lerp(LIGHT_Y, hash01(k, 7701));
      drawFpsWall(
        ctx,
        fps,
        x * 0.998,
        ly,
        ly + LIGHT_THIN,
        lz,
        lz + LIGHT_LONG,
        k % 3 ? COLOR.heavenlyGold : COLOR.white,
        0.8,
      );
    }
    for (let p = 0; p < END; p += PILLAR_EVERY)
      drawFpsWall(
        ctx,
        fps,
        x * 0.996,
        WAIST,
        SILL_TOP,
        p,
        p + PILLAR,
        COLOR.black,
      );
    drawFpsWallLines(
      ctx,
      fps,
      x * 0.995,
      SEAMS[0],
      WAIST,
      SEAMS[1],
      z,
      END,
      COLOR.black,
      0.4,
    );
  }
  drawFpsFlat(ctx, fps, high, -HALF, HALF, z, END, COLOR.wallShadow);
  for (let p = CEIL_EVERY / 2; p < END; p += CEIL_EVERY)
    drawFpsFlat(
      ctx,
      fps,
      high - 0.002,
      -CEIL_LIGHT,
      CEIL_LIGHT,
      p,
      p + CEIL_EVERY / 2,
      COLOR.white,
      0.85,
    );
  drawFpsFlat(
    ctx,
    fps,
    0.001,
    -RUNNER,
    RUNNER,
    z,
    END,
    COLOR.hourglassWoodDark,
  );
}

function startNightTrain(floor: Floor, context: EventProcContext): void {
  const area = context.getScreenAreaLocal?.(floor);
  if (!area) return;
  const aspect = (area.bottom - area.top) / (area.right - area.left);
  const { slideMs, flyMs, promoteGapMs } = meta.values;
  const { arriveMs } = FLIGHT_STAGE;
  const tier = context.critTier ?? pickCritTierByOdds();
  const doorHigh = 2 * DOOR * aspect;
  const high = Math.max(HIGH, doorHigh + OVER_DOOR);
  const land = fpsOpeningLanding(FOCAL, END, 2 * DOOR, 0, aspect);
  const runZ = (ms: number) =>
    -FOCAL + (RUN * Math.max(0, ms - slideMs)) / 1000;
  const reach = (z: number) => slideMs + ((z + FOCAL) / RUN) * 1000;
  const opensAt = (z: number) => reach(z - OPEN_AHEAD);
  const openAt = (z: number, ms: number) =>
    smoothstep(clamp01((ms - opensAt(z)) / OPEN_MS));
  const enterMs = reach(END - DIVE_AHEAD);
  const diveMs = flyMs + arriveMs;
  const guards: Guard[] = GUARDS.map((g, k) => {
    const first = reach(DOORS[k] - g.ahead);
    const hits = g.shots.map((s) => first + s);
    return {
      x: g.x,
      z: DOORS[k] + BEHIND_DOOR,
      door: DOORS[k],
      side: g.side,
      look: g.scale === 1 ? FPS_GUARD : { ...FPS_GUARD, scale: g.scale },
      aims: opensAt(DOORS[k]) + AIM_LAG,
      hits,
      dies: hits[hits.length - 1] + FPS_ROUND_MS,
    };
  });
  const shots: FpsShot[] = guards.flatMap((g) =>
    g.hits.map((ms, k) => {
      const scale = g.look.scale ?? 1;
      const kills = k === g.hits.length - 1;
      return createFpsShot(
        ms,
        g.x,
        CHEST * scale,
        g.z,
        kills ? (scale > 1 ? BOSS_BLAST : KILL_BLAST) : HIT_BLAST,
      );
    }),
  );

  const drawScene = (
    ctx: CanvasRenderingContext2D,
    view: FlightView,
    ms: number,
    now: number,
    floors: ScreenCopy,
  ): void => {
    const dive = smoothstep(clamp01((ms - enterMs) / diveMs));
    const z = ms < enterMs ? runZ(ms) : lerp([END - DIVE_AHEAD, land.z], dive);
    const still = 1 - dive;
    const fps: Fps = {
      view,
      lens: LENS,
      cam: {
        x: SWAY * Math.sin(ms * SWAY_RATE) * still,
        y:
          lerp([EYE, land.y], dive) +
          Math.abs(Math.sin(z * STRIDE)) * STEP * still,
        z,
        tip: 0,
      },
    };
    drawFpsSky(ctx, fps, COLOR.black);
    drawFpsGround(ctx, fps, COLOR.woodOutline);
    drawFpsOpening(ctx, fps, floors, END + 0.01, 2 * DOOR, 0, aspect);
    drawCarriages(ctx, fps, high, ms);
    // far to near: the end door, then each carriage's guard and door
    drawDoor(ctx, fps, END, openAt(END, ms), doorHigh, high);
    for (let k = guards.length - 1; k >= 0; k--) {
      const g = guards[k];
      if (g.z > z + NEAREST && ms >= opensAt(g.door))
        drawFpsEnemy(
          ctx,
          fps,
          g.x,
          g.z,
          g.look,
          fpsEnemyPose(ms, g.aims, g.hits, g.side),
          now,
        );
      drawDoor(ctx, fps, g.door, openAt(g.door, ms), doorHigh, high);
    }
    const lower =
      ms >= enterMs
        ? clamp01(GUN_DOWN * dive)
        : 1 - clamp01((ms - slideMs) / GUN_UP_MS);
    drawFpsShots(ctx, fps, shots, ms, now, z * STRIDE, lower);
    // the floors' screen sliding aside like a train's door
    if (ms < slideMs) {
      const u = smoothstep(clamp01(ms / slideMs));
      drawScreenPart(
        ctx,
        floors,
        view.x,
        view.y,
        view.w,
        view.h,
        view.x - view.w * u,
        view.y,
        view.w,
        view.h,
      );
    }
  };

  const beat = startFlightStage(KEY, floor, context, {
    flyMs,
    enter: { ms: enterMs, draw: drawScene },
    ownLanding: true,
    draw: (ctx, view, ms, now, floors) =>
      drawScene(ctx, view, enterMs + ms, now, floors),
    onEnd: () => {
      findRewardWorkers(floor, context).forEach((worker, k) =>
        setTimeout(() => giveWorkerTier(worker), k * promoteGapMs),
      );
      context.applyTierCrit?.(floor, tier);
      endEventProc(KEY);
    },
  });
  if (!beat) return;
  beat(-enterMs, playSwoosh);
  beat(slideMs - enterMs, () => shakeScreen(SLIDE_SHAKE));
  for (const d of [...DOORS, END])
    beat(opensAt(d) - enterMs, () => {
      playSwoosh();
      shakeScreen(DOOR_SHAKE);
    });
  for (const g of guards) {
    const boss = (g.look.scale ?? 1) > 1;
    for (const ms of g.hits)
      beat(ms - enterMs, () => {
        playExplosion();
        shakeScreen(SHOT_SHAKE);
      });
    beat(g.dies - enterMs, () => {
      if (boss) playCritExplosion();
      shakeScreen(boss ? BOSS_SHAKE : KILL_SHAKE);
    });
  }
}
