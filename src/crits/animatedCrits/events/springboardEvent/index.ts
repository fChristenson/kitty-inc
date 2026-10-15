// the "Springboard" event (fps; free levels), a flight-stage event (see
// ../../flightStage) with its own way in, drawn in first person with
// shared/animationStyles/fps: its crit's click bows the floors' screen like a trampoline and
// flings the view up an atrium; it bounces higher and higher, the balconies
// dropping past, and at the top of every bounce a guard at a rail is dropped,
// a big imp on the highest taking two. The last bounce flies it through a lit
// window high in the back wall onto the floors, and every bar in view takes
// its levels
import meta from "./meta";
import { levelsFor, type Floor } from "../../../../gameState";
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
  fpsEnemyPose,
  fpsOpeningLanding,
  fpsSight,
  FPS_GUARD,
  FPS_IMP,
  FPS_ROUND_MS,
  type Fps,
  type FpsEnemyLook,
  type FpsLens,
  type FpsShot,
} from "../../../../shared/animationStyles/fps";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { shakeScreen } from "../../../../shared/screenShake";
import { clamp01, lerp } from "../../../../shared/easing";
import { drawScreenPart, type ScreenCopy } from "../../../../shared/screenCopy";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { findRewardBars } from "../../eventRewards";
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

const KEY = "springboard";

// the view stands CAM_Z out from the back wall at BACK_Z, eye EYE up off the
// trampoline, bouncing under GRAVITY (world units a second squared)
const FOCAL = 1.2;
const LENS: FpsLens = { focal: FOCAL, horizon: 0.5 };
const CAM_Z = -1.1;
const EYE = 0.6;
const GRAVITY = 46;
const SAG = 0.12;
const SAG_MS = 60;
// the atrium: WIDE either side of the middle, its walls TOP high, its
// balconies at LEDGES jutting out to LEDGE_Z, an apex APEX over each
const WIDE = 1.4;
const BACK_Z = 2.6;
const TOP = 12;
const BOTTOM = -1;
const LEDGES = [1.6, 3.2, 4.8];
const APEX = 0.55;
const LEDGE_Z = 1.7;
const SLAB = 0.14;
const RAIL = 0.3;
const RAIL_BAR = 0.05;
const RAIL_Z = 1.68;
const GLASS = 0.15;
// the back wall: a lit doorway either side at every level, a trim line, its
// pillars
const DOORWAYS = [-1, 0.55];
const DOORWAY: [number, number] = [0.45, 0.9];
const TRIM: [number, number] = [1.2, 1.26];
const PILLARS = [-0.05, -1.25, 1.15];
const PILLAR = 0.1;
// the side walls' windows at every level
const SIDE_WINDOWS = 3;
const SIDE_WINDOW: [number, number] = [0.6, 1.2];
const SIDE_FROM = -0.6;
const SIDE_EVERY = 1.1;
const SIDE_LONG = 0.5;
// the trampoline's gold frame on the floor
const PAD: [number, number, number, number] = [-0.9, 0.9, -0.9, 1];
const PAD_RIM = 0.1;
// the lit window high in the back wall, the floors in it
const WIN_W = 1;
const SILL = 6.1;
const WIN_FRAME = 0.06;
const WIN_GLOW = fadeStops(COLOR.heavenlyGold);
const WIN_GLOW_ALPHA = 0.5;
const WIN_GLOW_R = 0.9;
// a guard at the rail of each balcony, x across, the big imp twice on the last
const FOES = [
  { x: -0.6, side: -1, look: FPS_GUARD, shots: [-40] },
  { x: 0.6, side: 1, look: FPS_GUARD, shots: [-40] },
  { x: 0, side: -1, look: { ...FPS_IMP, scale: 1.4 }, shots: [-90, 70] },
];
const FOE_Z = 2.05;
const AIM_LEAD = 260;
const CHEST = 0.42;
const HIT_BLAST = 0.15;
const KILL_BLAST = 0.3;
const BOSS_BLAST = 0.55;
const GUN_UP_MS = 250;
const GUN_DOWN = 3;
const LAUNCH_SHAKE = 1;
const LAND_SHAKE = [0.8, 1.2, 1.6];
const SHOT_SHAKE = 0.6;
const KILL_SHAKE = 1.4;
const BOSS_SHAKE = 3;

interface Foe {
  x: number;
  y: number;
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
      context.upgradeFloorFree !== undefined &&
      findRewardBars(floor, context).length > 0,
    arm: startSpringboard,
  },
  { label: "Springboard", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Springboard
export function forceSpringboardEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

// the same view with the world lowered by `y`: a guard standing on a balcony
const raisedBy = (fps: Fps, y: number): Fps => ({
  ...fps,
  cam: { ...fps.cam, y: fps.cam.y - y },
});

// the atrium round the view: the back wall with its lit window, the side
// walls, the trampoline and every balcony, its guard at the rail
function drawAtrium(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  floors: ScreenCopy,
  aspect: number,
  foes: Foe[],
  ms: number,
  now: number,
): void {
  drawFpsSky(ctx, fps, COLOR.skySpace);
  drawFpsGround(ctx, fps, COLOR.black);
  drawFpsFace(ctx, fps, BACK_Z, -WIDE, WIDE, BOTTOM, TOP, COLOR.wallShadow);
  const wall = BACK_Z - 0.005;
  for (const y of [0, ...LEDGES]) {
    for (const x of DOORWAYS)
      drawFpsFace(
        ctx,
        fps,
        wall,
        x,
        x + DOORWAY[0],
        y,
        y + DOORWAY[1],
        COLOR.amberMuted,
      );
    drawFpsFace(
      ctx,
      fps,
      wall,
      -WIDE,
      WIDE,
      y + TRIM[0],
      y + TRIM[1],
      COLOR.cauldronIronDark,
    );
  }
  for (const x of PILLARS)
    drawFpsFace(
      ctx,
      fps,
      wall - 0.001,
      x,
      x + PILLAR,
      BOTTOM,
      TOP,
      COLOR.cauldronIron,
    );
  const top = SILL + WIN_W * aspect;
  drawFpsFace(
    ctx,
    fps,
    BACK_Z - 0.01,
    -WIN_W / 2 - WIN_FRAME,
    WIN_W / 2 + WIN_FRAME,
    SILL - WIN_FRAME,
    top + WIN_FRAME,
    COLOR.woodOutline,
  );
  drawFpsOpening(ctx, fps, floors, BACK_Z - 0.02, WIN_W, SILL, aspect);
  const win = fpsSight(fps, 0, (SILL + top) / 2, BACK_Z);
  if (win) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = WIN_GLOW_ALPHA;
    drawGlow(ctx, WIN_GLOW, win.x, win.y, WIN_GLOW_R * win.s);
    ctx.restore();
  }
  for (const x of [-WIDE, WIDE]) {
    drawFpsWall(
      ctx,
      fps,
      x,
      BOTTOM,
      TOP,
      CAM_Z - 0.5,
      BACK_Z,
      COLOR.nightShiftIndigo,
    );
    for (const y of [0, ...LEDGES])
      for (let s = 0; s < SIDE_WINDOWS; s++) {
        const za = SIDE_FROM + s * SIDE_EVERY;
        drawFpsWall(
          ctx,
          fps,
          x * 0.999,
          y + SIDE_WINDOW[0],
          y + SIDE_WINDOW[1],
          za,
          za + SIDE_LONG,
          COLOR.amberMuted,
          0.85,
        );
      }
  }
  const [x0, x1, z0, z1] = PAD;
  drawFpsFlat(ctx, fps, 0, x0, x1, z0, z1, COLOR.heavenlyGold);
  drawFpsFlat(
    ctx,
    fps,
    0.002,
    x0 + PAD_RIM,
    x1 - PAD_RIM,
    z0 + PAD_RIM,
    z1 - PAD_RIM,
    COLOR.black,
  );
  // the balconies, highest first, each guard behind its rail
  for (let k = LEDGES.length - 1; k >= 0; k--) {
    const y = LEDGES[k];
    drawFpsFlat(ctx, fps, y, -WIDE, WIDE, LEDGE_Z, BACK_Z, COLOR.cauldronIron);
    drawFpsFace(
      ctx,
      fps,
      LEDGE_Z,
      -WIDE,
      WIDE,
      y - SLAB,
      y,
      COLOR.cauldronIronDark,
    );
    const f = foes[k];
    drawFpsEnemy(
      ctx,
      raisedBy(fps, f.y),
      f.x,
      FOE_Z,
      f.look,
      fpsEnemyPose(ms, f.aims, f.hits, f.side),
      now,
    );
    drawFpsFace(ctx, fps, RAIL_Z, -WIDE, WIDE, y, y + RAIL, COLOR.white, GLASS);
    drawFpsFace(
      ctx,
      fps,
      RAIL_Z,
      -WIDE,
      WIDE,
      y + RAIL - RAIL_BAR / 2,
      y + RAIL + RAIL_BAR / 2,
      COLOR.silverTicketGray,
    );
  }
}

function startSpringboard(floor: Floor, context: EventProcContext): void {
  const area = context.getScreenAreaLocal?.(floor);
  if (!area) return;
  const aspect = (area.bottom - area.top) / (area.right - area.left);
  const { bowMs, flyMs, levelShare, levelGapMs } = meta.values;
  const { arriveMs } = FLIGHT_STAGE;
  const tier = context.critTier ?? pickCritTierByOdds();
  const land = fpsOpeningLanding(FOCAL, BACK_Z, WIN_W, SILL, aspect);
  // each bounce up to its apex and back down, its half in ms
  const bounces: { from: number; apex: number; half: number }[] = [];
  let t = bowMs;
  for (const ledge of LEDGES) {
    const apex = ledge + APEX;
    const half = Math.sqrt((2 * (apex - EYE)) / GRAVITY) * 1000;
    bounces.push({ from: t, apex, half });
    t += 2 * half;
  }
  const enterMs = t;
  const leapMs = flyMs + arriveMs;
  const lands = bounces
    .slice(1)
    .map((b) => b.from)
    .concat(enterMs);
  const camAt = (ms: number): { y: number; z: number } => {
    if (ms >= enterMs) {
      const u = clamp01((ms - enterMs) / leapMs);
      return {
        y: lerp([EYE, land.y], 1 - (1 - u) ** 2),
        z: lerp([CAM_Z, land.z], u * u),
      };
    }
    for (const b of bounces)
      if (ms < b.from + 2 * b.half) {
        const s = (Math.max(0, ms - b.from) - b.half) / 1000;
        return { y: b.apex - 0.5 * GRAVITY * s * s, z: CAM_Z };
      }
    return { y: EYE, z: CAM_Z };
  };
  const foes: Foe[] = FOES.map((f, k) => {
    const apexAt = bounces[k].from + bounces[k].half;
    const hits = f.shots.map((s) => apexAt + s);
    return {
      x: f.x,
      y: LEDGES[k],
      side: f.side,
      look: f.look,
      aims: apexAt - AIM_LEAD,
      hits,
      dies: hits[hits.length - 1] + FPS_ROUND_MS,
    };
  });
  const shots: FpsShot[] = foes.flatMap((f) =>
    f.hits.map((ms, k) => {
      const scale = f.look.scale ?? 1;
      const kills = k === f.hits.length - 1;
      return createFpsShot(
        ms,
        f.x,
        f.y + CHEST * scale,
        FOE_Z,
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
    const cam = camAt(ms);
    // the trampoline sagging under each landing
    let sag = 0;
    for (const at of lands)
      if (Math.abs(ms - at) < SAG_MS)
        sag = Math.cos(((ms - at) / SAG_MS) * (Math.PI / 2));
    const fps: Fps = {
      view,
      lens: LENS,
      cam: { x: 0, y: cam.y - SAG * sag, z: cam.z, tip: 0 },
    };
    drawAtrium(ctx, fps, floors, aspect, foes, ms, now);
    const lower =
      ms >= enterMs
        ? clamp01((GUN_DOWN * (ms - enterMs)) / leapMs)
        : 1 - clamp01((ms - bowMs) / GUN_UP_MS);
    drawFpsShots(ctx, fps, shots, ms, now, 0, lower);
    // the floors' screen bowing like a trampoline, then dropping away below
    // as the view is flung up
    const drop = clamp01((ms - bowMs) / bowMs);
    if (drop < 1) {
      const bow = Math.sin(Math.PI * clamp01(ms / bowMs));
      const w = view.w * (1 + 0.04 * bow);
      const h = view.h * (1 - 0.12 * bow);
      drawScreenPart(
        ctx,
        floors,
        view.x,
        view.y,
        view.w,
        view.h,
        view.x + (view.w - w) / 2,
        view.y + view.h - h + view.h * drop * drop,
        w,
        h,
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
      findRewardBars(floor, context).forEach((bar, k) =>
        setTimeout(
          () =>
            context.upgradeFloorFree?.(
              bar.floor,
              levelsFor(bar.floor, levelShare),
            ),
          k * levelGapMs,
        ),
      );
      context.applyTierCrit?.(floor, tier);
      endEventProc(KEY);
    },
  });
  if (!beat) return;
  beat(-enterMs, playSwoosh);
  beat(bowMs - enterMs, () => {
    playSwoosh();
    shakeScreen(LAUNCH_SHAKE);
  });
  lands.forEach((at, k) =>
    beat(at - enterMs, () => {
      playSwoosh();
      shakeScreen(LAND_SHAKE[k] ?? LAND_SHAKE[LAND_SHAKE.length - 1]);
    }),
  );
  for (const f of foes) {
    const boss = (f.look.scale ?? 1) > 1;
    for (const ms of f.hits)
      beat(ms - enterMs, () => {
        playExplosion();
        shakeScreen(SHOT_SHAKE);
      });
    beat(f.dies - enterMs, () => {
      if (boss) playCritExplosion();
      shakeScreen(boss ? BOSS_SHAKE : KILL_SHAKE);
    });
  }
  beat(0, playSwoosh);
}
