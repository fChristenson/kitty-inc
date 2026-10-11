// the "Arena" event (fps; levels), a flight-stage event (see
// ../../flightStage) with its own way in, drawn in first person with
// shared/fps: its crit's click dives the view through the floors' screen into
// a walled pit under the night sky. Imps teleport in on glowing pads one
// after another, each in a pillar of light, the view strafing side to side as
// the pistol drops them, every kill shooting a gold wisp up off the screen;
// a big champion takes two shots. Then the view is flung up out of the pit,
// the floors drop back into place and the wisps rain down onto the bars,
// each landing free levels, the champion's on the clicked floor's bar
import { levelsFor, type Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playSwoosh } from "../../../../sound";
import { drawBeam } from "../../../../shared/beam";
import { drawDetonation } from "../../../../shared/explosion";
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
  drawFpsShots,
  drawFpsSky,
  drawFpsWall,
  drawFpsWallLines,
  fpsEnemyPose,
  fpsSight,
  FPS_IMP,
  FPS_ROUND_MS,
  type Fps,
  type FpsEnemyLook,
  type FpsLens,
  type FpsShot,
} from "../../../../shared/fps";
import { shakeScreen } from "../../../../shared/screenShake";
import { clamp01, smoothstep } from "../../../../shared/easing";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawScreenPart, type ScreenCopy } from "../../../../shared/screenCopy";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import {
  drawRewardBars,
  findRewardBars,
  giveBarLevels,
  type RewardBar,
} from "../../eventRewards";
import {
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

const KEY = "arena";

// the view stands CAM_Z in front of the pit's near edge, its eye EYE up,
// strafing STRAFE either way, bobbing as it goes
const FOCAL = 1.2;
const LENS: FpsLens = { focal: FOCAL, horizon: 0.5 };
const CAM_Z = -0.8;
const EYE = 0.5;
const STRAFE = 0.45;
const STRAFE_RATE = 0.0022;
const BOB = 0.012;
const BOB_RATE = 0.012;
const GUN_BOB_RATE = 0.006;
const GUN_UP_MS = 250;
// the pit: half wide, deep, its walls' height and seams, its checkered floor
const HALF = 1.6;
const DEEP = 6;
const WALL_HIGH = 0.9;
const WALL_SEAMS = 0.15;
const TILE_W = 0.4;
const TILE_D = 0.85;
// the pads: their size, ring and the pillar of light each imp comes in on,
// with glitter swirling up it
const PAD_R = 0.28;
const PAD_SQUASH = 0.06;
const PAD_RING = 0.02;
const PILLAR_HIGH = 1.2;
const PILLAR_W = 0.18;
const PILLAR_MS = 250;
const PILLAR_SPECKS = 8;
const SPECK = 0.05;
const SWIRL = 0.15;
// an imp shows PILLAR_IN into its pillar, flashing white till FORMED
const PILLAR_IN = 120;
const FORMED = 220;
// the fighters: each pad's imp, then the champion; when each comes in
const PADS = [
  { x: -0.7, z: 3, side: -1 },
  { x: 0.75, z: 3.4, side: 1 },
  { x: -0.1, z: 4.2, side: -1 },
];
const FIRST = 100;
const SPAWN_GAP = 480;
const AIM_LAG = 180;
const SHOT_LAG = 170;
const CHAMP = { x: 0, z: 4.8, side: 1, scale: 1.8 };
const CHAMP_LAG = 250;
const CHAMP_AIM = 200;
const CHAMP_SHOTS = [400, 560];
const CHEST = 0.42;
const HIT_BLAST = 0.3;
const KILL_BLAST = 0.6;
const CHAMP_BLAST = 1.2;
// each kill's gold wisp shooting up off the screen; the launch after the
// champion drops
const KILL_RISE_MS = 300;
const KILL_WISP = 1.3;
const LAUNCH_LAG = 350;
// the floors dropping back in, then the wisps raining onto the bars: when,
// how far apart, each one's fall, its blast and the champion's cluster
const RAIN_AT = 100;
const RAIN_GAP = 80;
const RAIN_FALL_MS = 260;
const RAIN_BLAST = 0.18;
const CHAMP_RAIN_BLAST = 0.35;
const SIDE_BLAST = 0.14;
const SIDE_GAP = 0.1;
const SIDE_MS = 45;
const SHOT_SHAKE = 0.6;
const KILL_SHAKE = 1.4;
const CHAMP_SHAKE = 3;
const RAIN_SHAKE = 1;
const LAUNCH_SHAKE = 1.2;

interface Fighter {
  x: number;
  z: number;
  side: number;
  look: FpsEnemyLook;
  at: number;
  aims: number;
  hits: number[];
  dies: number;
  // its chest on screen and the screen's top, kept up to date for its wisp
  chest: Point;
  top: number;
  rise: (ms: number) => Point;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.arenaEvent.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) =>
      floor.unlocked &&
      canStartFlightStage(context) &&
      context.upgradeFloorFree !== undefined &&
      findRewardBars(floor, context).length > 0,
    arm: startArena,
  },
  { label: "Arena", color: COLOR.fullHouseCrimson },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Arena
export function forceArenaEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

function fighter(
  x: number,
  z: number,
  side: number,
  look: FpsEnemyLook,
  at: number,
  aims: number,
  hits: number[],
): Fighter {
  const dies = hits[hits.length - 1] + FPS_ROUND_MS;
  const f: Fighter = {
    x,
    z,
    side,
    look,
    at,
    aims,
    hits,
    dies,
    chest: { x: 0, y: 0 },
    top: 0,
    rise: (ms) => {
      const u = clamp01((ms - dies) / KILL_RISE_MS);
      return { x: f.chest.x, y: f.chest.y + (f.top - f.chest.y) * u * u };
    },
  };
  return f;
}

// the pit's shell, far to near: back wall, checkered floor, walls, pads
function drawPit(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  fighters: Fighter[],
): void {
  drawFpsSky(ctx, fps, COLOR.skySpace);
  drawFpsGround(ctx, fps, COLOR.amberMutedShadow);
  drawFpsFace(
    ctx,
    fps,
    DEEP,
    -HALF,
    HALF,
    0,
    WALL_HIGH,
    COLOR.hourglassWoodDark,
  );
  const rows = Math.ceil((DEEP - CAM_Z) / TILE_D);
  const cols = Math.ceil(HALF / TILE_W);
  for (let r = rows - 1; r >= 0; r--) {
    const za = CAM_Z + r * TILE_D;
    for (let c = -cols; c < cols; c++)
      if ((r + c) % 2 === 0)
        drawFpsFlat(
          ctx,
          fps,
          0,
          c * TILE_W,
          (c + 1) * TILE_W,
          za,
          za + TILE_D,
          COLOR.amberMuted,
        );
  }
  for (const x of [-HALF, HALF]) {
    drawFpsWall(ctx, fps, x, 0, WALL_HIGH, CAM_Z, DEEP, COLOR.hourglassWood);
    drawFpsWallLines(
      ctx,
      fps,
      x,
      WALL_SEAMS,
      WALL_HIGH,
      WALL_SEAMS,
      CAM_Z,
      DEEP,
      COLOR.woodOutline,
      0.5,
    );
  }
  ctx.lineWidth = 1;
  ctx.strokeStyle = COLOR.heavenlyGold;
  for (const f of fighters) {
    const p = fpsSight(fps, f.x, 0.003, f.z);
    if (!p) continue;
    ctx.lineWidth = PAD_RING * p.s;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, PAD_R * p.s, PAD_SQUASH * p.s, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// a pillar of light on f's pad, glitter swirling up it
function drawPillar(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  f: Fighter,
  ms: number,
): void {
  const k = clamp01((ms - f.at) / PILLAR_MS);
  if (k <= 0 || k >= 1) return;
  const base = fpsSight(fps, f.x, 0, f.z);
  if (!base) return;
  const top = { x: base.x, y: base.y - PILLAR_HIGH * base.s };
  drawBeam(ctx, base, top, PILLAR_W * base.s, Math.sin(Math.PI * k));
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < PILLAR_SPECKS; i++) {
    const u = (i / PILLAR_SPECKS + k * 2) % 1;
    stampGlimmer(
      ctx,
      base.x + Math.cos(i * 2.4 + ms * 0.02) * SWIRL * base.s,
      base.y + (top.y - base.y) * u,
      SPECK * base.s,
      i + ms * 0.01,
      COLOR.white,
    );
  }
  ctx.restore();
}

function startArena(floor: Floor, context: EventProcContext): void {
  const area = context.getScreenAreaLocal?.(floor);
  const bars = findRewardBars(floor, context);
  if (!area || bars.length === 0) return;
  const { diveMs, flyMs, riseMs, levelShare, champLevelShare } =
    CONFIG.arenaEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const fighters = PADS.map((p, k) => {
    const at = diveMs + FIRST + k * SPAWN_GAP;
    const aims = at + AIM_LAG;
    return fighter(p.x, p.z, p.side, FPS_IMP, at, aims, [aims + SHOT_LAG]);
  });
  const champAt = fighters[fighters.length - 1].dies + CHAMP_LAG;
  const champ = fighter(
    CHAMP.x,
    CHAMP.z,
    CHAMP.side,
    { ...FPS_IMP, scale: CHAMP.scale },
    champAt,
    champAt + CHAMP_AIM,
    CHAMP_SHOTS.map((s) => champAt + s),
  );
  fighters.push(champ);
  const shots: FpsShot[] = fighters.flatMap((f) =>
    f.hits.map((ms, k) => {
      const scale = f.look.scale ?? 1;
      const kills = k === f.hits.length - 1;
      return createFpsShot(
        ms,
        f.x,
        CHEST * scale,
        f.z,
        kills ? (f === champ ? CHAMP_BLAST : KILL_BLAST) : HIT_BLAST,
      );
    }),
  );
  const farFirst = [...fighters].sort((a, b) => b.z - a.z);
  const enterMs = champ.dies + LAUNCH_LAG;
  // each kill's wisp raining onto a bar, the champion's onto the clicked
  // floor's (or the last)
  const own = bars.find((b) => b.floor === floor) ?? bars[bars.length - 1];
  const rain = fighters.map((f, k) => {
    const bar: RewardBar = f === champ ? own : bars[k % bars.length];
    const lands = riseMs + RAIN_AT + k * RAIN_GAP;
    const from: Point = { x: bar.center.x, y: 0 };
    return {
      bar,
      lands,
      champ: f === champ,
      from,
      fall: (ms: number): Point => {
        const u = clamp01((ms - lands + RAIN_FALL_MS) / RAIN_FALL_MS);
        return {
          x: from.x,
          y: from.y + (bar.center.y - from.y) * u * u,
        };
      },
    };
  });

  const drawArena = (
    ctx: CanvasRenderingContext2D,
    view: FlightView,
    ms: number,
    now: number,
  ): void => {
    const strafe = Math.sin(Math.max(0, ms - diveMs) * STRAFE_RATE);
    const fps: Fps = {
      view,
      lens: LENS,
      cam: {
        x: STRAFE * strafe,
        y: EYE + Math.abs(Math.sin(ms * BOB_RATE)) * BOB,
        z: CAM_Z,
        tip: 0,
      },
    };
    drawPit(ctx, fps, fighters);
    for (const f of farFirst) {
      drawPillar(ctx, fps, f, ms);
      if (ms < f.at + PILLAR_IN) continue;
      const pose = fpsEnemyPose(ms, f.aims, f.hits, f.side);
      if (ms < f.at + FORMED) pose.hurt = Math.floor(ms / 40) % 2 === 0;
      drawFpsEnemy(ctx, fps, f.x, f.z, f.look, pose, now);
      const chest = fpsSight(fps, f.x, CHEST * (f.look.scale ?? 1), f.z);
      if (!chest) continue;
      f.chest.x = chest.x;
      f.chest.y = chest.y;
      f.top = view.y - 0.2 * view.w;
      drawWispBetween(
        ctx,
        f.rise,
        ms,
        now,
        WISP_SIZE * KILL_WISP,
        0.6,
        f.dies,
        f.dies + KILL_RISE_MS,
      );
    }
    drawFpsShots(
      ctx,
      fps,
      shots,
      ms,
      now,
      ms * GUN_BOB_RATE,
      1 - clamp01((ms - diveMs) / GUN_UP_MS),
    );
  };

  const drawEnter = (
    ctx: CanvasRenderingContext2D,
    view: FlightView,
    ms: number,
    now: number,
    floors: ScreenCopy,
  ): void => {
    drawArena(ctx, view, ms, now);
    // the floors' screen rushing past as the view dives through it
    if (ms >= diveMs) return;
    const u = clamp01(ms / diveMs);
    const s = 1 + 2.5 * u * u;
    ctx.globalAlpha = 1 - u;
    drawScreenPart(
      ctx,
      floors,
      view.x,
      view.y,
      view.w,
      view.h,
      view.cx - (view.w * s) / 2,
      view.y + view.h / 2 - (view.h * s) / 2,
      view.w * s,
      view.h * s,
    );
    ctx.globalAlpha = 1;
  };

  // flung up out of the pit: it drops away, the floors coming down into
  // place, and the wisps raining onto the bars
  const drawLanding = (
    ctx: CanvasRenderingContext2D,
    view: FlightView,
    ms: number,
    now: number,
    floors: ScreenCopy,
  ): void => {
    const u = smoothstep(clamp01(ms / riseMs));
    if (u < 1) {
      ctx.save();
      ctx.translate(0, view.h * u);
      drawArena(ctx, view, enterMs + ms, now);
      ctx.restore();
    }
    const slide = -view.h * (1 - u);
    drawScreenPart(
      ctx,
      floors,
      view.x,
      view.y,
      view.w,
      view.h,
      view.x,
      view.y + slide,
      view.w,
      view.h,
    );
    ctx.save();
    ctx.translate(view.x - area.left, view.y - area.top + slide);
    drawRewardBars(ctx, bars, now);
    for (const r of rain) {
      r.from.y = area.top - 0.2 * view.w;
      drawWispBetween(
        ctx,
        r.fall,
        ms,
        now,
        WISP_SIZE * KILL_WISP,
        0.6,
        r.lands - RAIN_FALL_MS,
        r.lands,
      );
      const since = ms - r.lands;
      if (!r.champ) {
        drawDetonation(ctx, r.bar.center, since, RAIN_BLAST * view.w, now);
        continue;
      }
      drawDetonation(ctx, r.bar.center, since, CHAMP_RAIN_BLAST * view.w, now);
      for (let k = 0; k < 4; k++) {
        const side = (k % 2 ? 1 : -1) * (1 + (k >> 1));
        drawDetonation(
          ctx,
          { x: r.bar.center.x + side * SIDE_GAP * view.w, y: r.bar.center.y },
          since - SIDE_MS * (k + 1),
          SIDE_BLAST * view.w,
          now,
        );
      }
    }
    ctx.restore();
  };

  const beat = startFlightStage(KEY, floor, context, {
    flyMs,
    enter: { ms: enterMs, draw: drawEnter },
    ownLanding: true,
    draw: drawLanding,
    onEnd: () => {
      context.applyTierCrit?.(floor, tier);
      endEventProc(KEY);
    },
  });
  if (!beat) return;
  beat(-enterMs, playSwoosh);
  for (const f of fighters) {
    f.hits.forEach((ms, k) => {
      beat(ms - enterMs, () => {
        playExplosion();
        shakeScreen(SHOT_SHAKE);
      });
      if (k < f.hits.length - 1) return;
      beat(f.dies - enterMs, () => {
        if (f === champ) playCritExplosion();
        shakeScreen(f === champ ? CHAMP_SHAKE : KILL_SHAKE);
      });
    });
  }
  beat(0, () => {
    playSwoosh();
    shakeScreen(LAUNCH_SHAKE);
  });
  for (const r of rain)
    beat(r.lands, () => {
      giveBarLevels(
        context,
        r.bar,
        levelsFor(r.bar.floor, r.champ ? champLevelShare : levelShare),
      );
      if (r.champ) playCritExplosion();
      else playExplosion();
      shakeScreen(r.champ ? CHAMP_SHAKE : RAIN_SHAKE);
    });
}
