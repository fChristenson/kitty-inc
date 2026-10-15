// the "Crate Yard" event (fps; free levels), a flight-stage event (see
// ../../flightStage) with its own way in, drawn in first person with
// shared/animationStyles/fps: its crit's click slides the floors' screen aside like a
// warehouse door onto a yard of stacked crates, the view crouched behind
// one. It leans out, a guard pops up from behind a crate and the pistol drops
// him, it ducks back, again and again, quicker; the last is a big one behind
// a wall of crates, blown apart with him in a chain of blasts. The shutter at
// the back rolls up on the floors, the view rushes through, and every bar in
// view takes free levels as it lands
import meta from "./meta";
import { levelsFor, type Floor } from "../../../../gameState";
import { COLOR } from "../../../../palette";
import { playSwoosh } from "../../../../sound";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
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
  fpsSight,
  FPS_GUARD,
  FPS_ROUND_MS,
  type Fps,
  type FpsEnemyLook,
  type FpsLens,
  type FpsShot,
} from "../../../../shared/animationStyles/fps";
import { shakeScreen } from "../../../../shared/screenShake";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { stampGlimmer } from "../../../../shared/twinkle";
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

const KEY = "crateYard";

// the view crouches CAM_Z in front of the yard, eye EYE up, behind its own
// crate at HIDE across, leaning out to PEEK over LEAN_MS
const FOCAL = 1.2;
const LENS: FpsLens = { focal: FOCAL, horizon: 0.5 };
const CAM_Z = -0.6;
const EYE = 0.35;
const HIDE = -0.35;
const PEEK = 0.2;
const LEAN_MS = 120;
const COVER = { x: -0.55, z: 0.1, w: 0.9, h: 0.5 };
// the warehouse: half wide, high, its back wall's depth, plank seams, lamps
const HALF = 1.6;
const HIGH = 2;
const BACK_Z = 7;
const SEAMS = 0.2;
const LAMP_Y = 1.9;
const LAMP_EVERY = 2;
const LAMP = 0.06;
// the crates (a guard behind each), their depth and band; the last a wall
const CRATES = [
  { x: -0.65, z: 3, w: 0.5, h: 0.5 },
  { x: 0.55, z: 3.6, w: 0.5, h: 0.5 },
  { x: -0.05, z: 4.4, w: 0.55, h: 0.45 },
  { x: 0, z: 5.6, w: 1.8, h: 0.6 },
];
const CRATE_DEEP = 0.4;
// the rush passes crates closer than this undrawn
const CRATE_NEAR = 0.5;
const BAND: [number, number] = [0.45, 0.55];
// the guards: standing BEHIND their crate, each fight's lean out, rise, shot
// and duck back
const BEHIND = 0.3;
const FIRST = 100;
const GAP = 640;
const SQUEEZE = 30;
const RISE_LAG = 150;
const RISE_MS = 150;
const SINK = 0.6;
const SHOT_LAG = 260;
const BIG_SHOTS = [300, 460];
const BIG_SCALE = 1.5;
const DUCK_LAG = 220;
const FALL_LAG = 200;
const FALL_MS = 200;
const CHEST = 0.42;
const HIT_BLAST = 0.3;
const KILL_BLAST = 0.6;
const BOSS_BLAST = 1.1;
// the wall of crates blowing apart: blasts across it, quick-fire
const WALL_BLASTS = [-0.8, -0.4, 0, 0.4, 0.8];
const WALL_Y = 0.3;
const WALL_BLAST = 0.5;
const WALL_LAG = 40;
const WALL_GAP = 45;
const WALL_GONE_MS = 150;
// the shutter rolling up off the opening at the back, its slats
const OUT_W = 1;
const SHUTTER_LAG = 300;
const SHUTTER_MS = 300;
const SLAT_EVERY = 0.08;
const SLAT = 0.01;
const NEAREST = 0.3;
const BOB_RATE = 0.004;
const GUN_UP_MS = 250;
const SHOT_SHAKE = 0.6;
const KILL_SHAKE = 1.4;
const BOSS_SHAKE = 3;
const WALL_SHAKE = 1.2;
const SLIDE_SHAKE = 0.6;
const SHUTTER_SHAKE = 0.6;

type Crate = (typeof CRATES)[number];

interface Fight {
  crate: Crate;
  x: number;
  z: number;
  side: number;
  look: FpsEnemyLook;
  out: number;
  rise: number;
  hits: number[];
  dies: number;
  back: number;
  big: boolean;
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
    arm: startCrateYard,
  },
  { label: "Crate Yard", color: COLOR.hourglassWood },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Crate Yard
export function forceCrateYardEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

// a crate, `gone` 0..1 blown away: its top, the side the view can see, its
// front and the band across it
function drawCrate(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  c: Crate,
  gone = 0,
): void {
  if (gone >= 1 || c.z < fps.cam.z + CRATE_NEAR) return;
  const x0 = c.x - c.w / 2;
  const x1 = c.x + c.w / 2;
  const h = c.h * (1 - gone);
  drawFpsFlat(ctx, fps, h, x0, x1, c.z, c.z + CRATE_DEEP, COLOR.woodFill);
  const side = fps.cam.x < x0 ? x0 : fps.cam.x > x1 ? x1 : null;
  if (side !== null)
    drawFpsWall(
      ctx,
      fps,
      side,
      0,
      h,
      c.z,
      c.z + CRATE_DEEP,
      COLOR.hourglassWoodDark,
    );
  drawFpsFace(ctx, fps, c.z, x0, x1, 0, h, COLOR.hourglassWood);
  drawFpsFace(
    ctx,
    fps,
    c.z,
    x0,
    x1,
    h * BAND[0],
    h * BAND[1],
    COLOR.woodOutline,
    0.6,
  );
}

// the warehouse round the yard: roof, floor, back wall with the floors
// behind its shutter, side walls and lamps
function drawWarehouse(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  floors: ScreenCopy,
  aspect: number,
  up: number,
  now: number,
): void {
  drawFpsSky(ctx, fps, COLOR.woodOutline);
  drawFpsGround(ctx, fps, COLOR.hourglassWoodDark);
  drawFpsFace(ctx, fps, BACK_Z, -HALF, HALF, 0, HIGH, COLOR.cauldronIron);
  drawFpsOpening(ctx, fps, floors, BACK_Z, OUT_W, 0, aspect);
  const top = OUT_W * aspect;
  if (up < 1) {
    const half = OUT_W / 2;
    drawFpsFace(
      ctx,
      fps,
      BACK_Z,
      -half,
      half,
      top * up,
      top,
      COLOR.silverTicketGray,
    );
    for (let y = top * up + SLAT_EVERY; y < top; y += SLAT_EVERY)
      drawFpsFace(
        ctx,
        fps,
        BACK_Z,
        -half,
        half,
        y,
        y + SLAT,
        COLOR.cauldronIronDark,
      );
  }
  for (const x of [-HALF, HALF]) {
    drawFpsWall(ctx, fps, x, 0, HIGH, CAM_Z, BACK_Z, COLOR.wallShadow);
    drawFpsWallLines(
      ctx,
      fps,
      x,
      SEAMS,
      HIGH,
      SEAMS,
      CAM_Z,
      BACK_Z,
      COLOR.black,
      0.3,
    );
  }
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let z = 1; z < BACK_Z; z += LAMP_EVERY) {
    const lamp = fpsSight(fps, 0, LAMP_Y, z);
    if (lamp)
      stampGlimmer(
        ctx,
        lamp.x,
        lamp.y,
        LAMP * lamp.s,
        now * 0.002 + z,
        COLOR.white,
      );
  }
  ctx.restore();
}

function startCrateYard(floor: Floor, context: EventProcContext): void {
  const area = context.getScreenAreaLocal?.(floor);
  if (!area) return;
  const aspect = (area.bottom - area.top) / (area.right - area.left);
  const { slideMs, flyMs, levelShare, levelGapMs } = meta.values;
  const { arriveMs } = FLIGHT_STAGE;
  const tier = context.critTier ?? pickCritTierByOdds();
  const land = fpsOpeningLanding(FOCAL, BACK_Z, OUT_W, 0, aspect);
  const fights: Fight[] = CRATES.map((crate, k) => {
    const big = k === CRATES.length - 1;
    const out = slideMs + FIRST + k * GAP - k * k * SQUEEZE;
    const rise = out + RISE_LAG;
    const hits = big ? BIG_SHOTS.map((s) => rise + s) : [rise + SHOT_LAG];
    const dies = hits[hits.length - 1] + FPS_ROUND_MS;
    return {
      crate,
      x: big ? 0 : crate.x,
      z: crate.z + BEHIND,
      side: k % 2 ? 1 : -1,
      look: big ? { ...FPS_GUARD, scale: BIG_SCALE } : FPS_GUARD,
      out,
      rise,
      hits,
      dies,
      back: dies + DUCK_LAG,
      big,
    };
  });
  const last = fights[fights.length - 1];
  const wallAt = WALL_BLASTS.map((_, i) => last.dies + WALL_LAG + i * WALL_GAP);
  const shutterAt = last.dies + SHUTTER_LAG;
  const enterMs = shutterAt + SHUTTER_MS;
  const rushMs = flyMs + arriveMs;
  const shots: FpsShot[] = fights.flatMap((f) =>
    f.hits.map((ms, k) => {
      const scale = f.look.scale ?? 1;
      const kills = k === f.hits.length - 1;
      return createFpsShot(
        ms,
        f.x,
        CHEST * scale,
        f.z,
        kills ? (f.big ? BOSS_BLAST : KILL_BLAST) : HIT_BLAST,
      );
    }),
  );
  // how far out from cover the view leans
  const leanAt = (ms: number) => {
    if (ms >= shutterAt) return 1;
    let lean = 0;
    for (const f of fights)
      lean = Math.max(
        lean,
        Math.min(
          clamp01((ms - f.out) / LEAN_MS),
          1 - clamp01((ms - f.back) / LEAN_MS),
        ),
      );
    return smoothstep(lean);
  };

  const drawScene = (
    ctx: CanvasRenderingContext2D,
    view: FlightView,
    ms: number,
    now: number,
    floors: ScreenCopy,
  ): void => {
    const rush = clamp01((ms - enterMs) / rushMs);
    const fps: Fps = {
      view,
      lens: LENS,
      cam: {
        x: lerp([lerp([HIDE, PEEK], leanAt(ms)), 0], rush),
        y: lerp([EYE, land.y], rush),
        z: lerp([CAM_Z, land.z], rush * rush),
        tip: 0,
      },
    };
    const up = smoothstep(clamp01((ms - shutterAt) / SHUTTER_MS));
    drawWarehouse(ctx, fps, floors, aspect, up, now);
    // far to near: each guard rising behind its crate, then the crate
    for (let k = fights.length - 1; k >= 0; k--) {
      const f = fights[k];
      const gone = f.big ? clamp01((ms - f.dies) / WALL_GONE_MS) : 0;
      const fall = clamp01((ms - f.dies - FALL_LAG) / FALL_MS);
      const feet = fpsSight(fps, f.x, 0, f.z);
      if (ms >= f.out && fall < 1 && feet && f.z > fps.cam.z + NEAREST) {
        const rise = smoothstep(clamp01((ms - f.rise) / RISE_MS));
        ctx.save();
        // never below the floor in front of its crate
        ctx.beginPath();
        ctx.rect(view.x, view.y, view.w, feet.y - view.y);
        ctx.clip();
        ctx.translate(
          0,
          (1 - rise + fall) * SINK * (f.look.scale ?? 1) * feet.s,
        );
        drawFpsEnemy(
          ctx,
          fps,
          f.x,
          f.z,
          f.look,
          fpsEnemyPose(ms, f.rise, f.hits, f.side),
          now,
        );
        ctx.restore();
      }
      drawCrate(ctx, fps, f.crate, gone);
    }
    for (let i = 0; i < WALL_BLASTS.length; i++) {
      const p = fpsSight(fps, WALL_BLASTS[i], WALL_Y, last.crate.z);
      if (p) drawDetonation(ctx, p, ms - wallAt[i], WALL_BLAST * p.s, now);
    }
    if (rush < 1) drawCrate(ctx, fps, COVER);
    const lower =
      ms >= enterMs
        ? clamp01(rush * 3)
        : 1 - clamp01((ms - slideMs) / GUN_UP_MS);
    drawFpsShots(ctx, fps, shots, ms, now, ms * BOB_RATE, lower);
    // the floors' screen sliding aside like a warehouse door
    if (ms < slideMs) {
      const u = clamp01(ms / slideMs);
      drawScreenPart(
        ctx,
        floors,
        view.x,
        view.y,
        view.w,
        view.h,
        view.x + view.w * u * u,
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
  beat(slideMs - enterMs, () => shakeScreen(SLIDE_SHAKE));
  for (const f of fights) {
    for (const ms of f.hits)
      beat(ms - enterMs, () => {
        playExplosion();
        shakeScreen(SHOT_SHAKE);
      });
    beat(f.dies - enterMs, () => {
      if (f.big) playCritExplosion();
      shakeScreen(f.big ? BOSS_SHAKE : KILL_SHAKE);
    });
  }
  for (const at of wallAt) beat(at - enterMs, () => shakeScreen(WALL_SHAKE));
  beat(shutterAt - enterMs, () => shakeScreen(SHUTTER_SHAKE));
  beat(0, playSwoosh);
}
