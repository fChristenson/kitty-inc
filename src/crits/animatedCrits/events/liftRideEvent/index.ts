// the "Lift Ride" event (fps; a free floor), a flight-stage event (see
// ../../flightStage) with its own way in, drawn in first person with
// shared/animationStyles/fps: its crit's click slides the floors' screen apart like lift
// doors and the view is standing in a lift. At each stop the doors open on a
// lobby with a guard in it; he draws, the pistol drops him, the steel doors
// clunk shut and the car rattles on up, the shaft's lights strobing through
// the seam; the third guard is a big one taking two. The last doors open back
// onto the floors, the locked floor's lock blows apart and it unlocks free
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playSwoosh } from "../../../../sound";
import { getLockCenter } from "../../../../floors/floorLock";
import { drawBeam } from "../../../../shared/animationStyles/beam";
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
  drawFpsShots,
  drawFpsSky,
  drawFpsWall,
  drawFpsWallLines,
  fpsEnemyPose,
  FPS_GUARD,
  FPS_ROUND_MS,
  type Fps,
  type FpsEnemyLook,
  type FpsLens,
  type FpsShot,
} from "../../../../shared/animationStyles/fps";
import { shakeScreen } from "../../../../shared/screenShake";
import { clamp01, smoothstep } from "../../../../shared/easing";
import { hash01 } from "../../../../shared/twinkle";
import { drawScreenPart, type ScreenCopy } from "../../../../shared/screenCopy";
import type { Point } from "../../../../shared/wisp";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { findRewardLocked } from "../../eventRewards";
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

const KEY = "liftRide";

// the doors stand at z 0, a screen wide and high, filling it from FOCAL
// behind them; the eye level with their middle
const FOCAL = 1.2;
const LENS: FpsLens = { focal: FOCAL, horizon: 0.5 };
// each lobby: half wide, deep, its walls' seams, and its colours (walls,
// floor, back wall)
const LOBBY_HALF = 1;
const LOBBY_DEEP = 3;
const LOBBY_SEAMS = 0.3;
const LOBBIES = [
  [COLOR.secondWindSky, COLOR.cauldronIronDark, COLOR.wallShadow],
  [COLOR.amberMuted, COLOR.hourglassWoodDark, COLOR.amberMutedShadow],
  [COLOR.wallShadow, COLOR.woodOutline, COLOR.cauldronIron],
];
// the steel doors' seam, the car's rattle on the ride and the shaft's
// lights strobing through the seam
const SEAM = 0.012;
const RATTLE = 0.02;
const RATTLE_MS = 30;
const STROBE_MS = 240;
const STROBE_BAND = 0.08;
const STROBE_ALPHA = 0.12;
// each stop's guard: across and how deep, how much bigger, and its shots
// after it starts aiming as the doors finish opening
const GUARDS = [
  { x: -0.14, z: 2, scale: 1, shots: [170] },
  { x: 0.16, z: 2, scale: 1, shots: [170] },
  { x: 0, z: 2.4, scale: 1.45, shots: [200, 360] },
];
const AIM_LAG = -40;
const CHEST = 0.42;
const HIT_BLAST = 0.3;
const KILL_BLAST = 0.6;
const BOSS_BLAST = 1.1;
// after the kill, the doors start shutting
const SHUT_LAG = 260;
const BOB_RATE = 0.003;
const GUN_UP_MS = 250;
// the lock's blast a beat after the last doors open, a cluster round it
const LOCK_LAG = 120;
const LOCK_BLAST = 0.35;
const SIDE_BLAST = 0.14;
const SIDE_GAP = 0.1;
const SIDE_MS = 45;
const DOOR_SHAKE = 0.5;
const SHOT_SHAKE = 0.6;
const KILL_SHAKE = 1.4;
const BOSS_SHAKE = 3;
const LOCK_SHAKE = 3;

interface Stop {
  opens: number;
  aims: number;
  hits: number[];
  dies: number;
  closes: number;
  x: number;
  z: number;
  look: FpsEnemyLook;
  side: number;
  colors: string[];
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.liftRideEvent.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) =>
      floor.unlocked &&
      canStartFlightStage(context) &&
      findRewardLocked(floor, context) !== null,
    arm: startLiftRide,
  },
  { label: "Lift Ride", color: COLOR.secondWindSky },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Lift Ride
export function forceLiftRideEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

// a lobby beyond the open doors, its guard in it
function drawLobby(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  stop: Stop,
  high: number,
  ms: number,
  now: number,
): void {
  const [walls, floor, back] = stop.colors;
  drawFpsSky(ctx, fps, back);
  drawFpsGround(ctx, fps, floor);
  drawFpsFace(ctx, fps, LOBBY_DEEP, -LOBBY_HALF, LOBBY_HALF, 0, high, back);
  for (const x of [-LOBBY_HALF, LOBBY_HALF]) {
    drawFpsWall(ctx, fps, x, 0, high, 0, LOBBY_DEEP, walls);
    drawFpsWallLines(
      ctx,
      fps,
      x,
      LOBBY_SEAMS,
      high,
      LOBBY_SEAMS,
      0,
      LOBBY_DEEP,
      COLOR.black,
      0.3,
    );
  }
  drawFpsFlat(
    ctx,
    fps,
    high,
    -LOBBY_HALF,
    LOBBY_HALF,
    0,
    LOBBY_DEEP,
    COLOR.black,
    0.35,
  );
  drawFpsEnemy(
    ctx,
    fps,
    stop.x,
    stop.z,
    stop.look,
    fpsEnemyPose(ms, stop.aims, stop.hits, stop.side),
    now,
  );
}

// the steel doors, `open` 0..1 apart, the shaft's lights strobing through
// their seam while the car rides
function drawDoors(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  view: FlightView,
  high: number,
  open: number,
  riding: boolean,
  ms: number,
): void {
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? -0.5 - 0.5 * open : 0.5 * open;
    const edge = side < 0 ? x0 + 0.5 : x0;
    drawFpsFace(
      ctx,
      fps,
      0,
      x0,
      x0 + 0.5,
      -0.1,
      high + 0.1,
      COLOR.cauldronIron,
    );
    drawFpsFace(
      ctx,
      fps,
      0,
      edge - SEAM,
      edge + SEAM,
      -0.1,
      high + 0.1,
      COLOR.cauldronIronDark,
    );
  }
  if (!riding) return;
  const flicker = 0.5 + 0.5 * Math.sin(ms * 0.05);
  drawBeam(
    ctx,
    { x: view.cx, y: view.y },
    { x: view.cx, y: view.y + view.h },
    0.012 * view.w,
    0.25 + 0.4 * flicker,
  );
  const y = view.y + ((ms % STROBE_MS) / STROBE_MS) * view.h;
  ctx.globalAlpha = STROBE_ALPHA;
  ctx.fillStyle = COLOR.white;
  ctx.fillRect(
    view.x,
    y - STROBE_BAND * view.h,
    view.w,
    2 * STROBE_BAND * view.h,
  );
  ctx.globalAlpha = 1;
}

function startLiftRide(floor: Floor, context: EventProcContext): void {
  const locked = findRewardLocked(floor, context);
  const area = context.getScreenAreaLocal?.(floor);
  if (!locked || !area) return;
  const { openMs, rideMs, flyMs } = CONFIG.liftRideEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const stops: Stop[] = [];
  let at = 0;
  GUARDS.forEach((g, k) => {
    const aims = at + openMs + AIM_LAG;
    const hits = g.shots.map((s) => aims + s);
    const dies = hits[hits.length - 1] + FPS_ROUND_MS;
    const closes = dies + SHUT_LAG;
    stops.push({
      opens: at,
      aims,
      hits,
      dies,
      closes,
      x: g.x,
      z: g.z,
      look: g.scale === 1 ? FPS_GUARD : { ...FPS_GUARD, scale: g.scale },
      side: k % 2 ? 1 : -1,
      colors: LOBBIES[k % LOBBIES.length],
    });
    at = closes + openMs + rideMs;
  });
  // the last doors start opening as the flight starts
  const enterMs = at;
  const shots: FpsShot[] = stops.flatMap((s) =>
    s.hits.map((ms, i) => {
      const scale = s.look.scale ?? 1;
      const kills = i === s.hits.length - 1;
      return createFpsShot(
        ms,
        s.x,
        CHEST * scale,
        s.z,
        kills ? (scale > 1 ? BOSS_BLAST : KILL_BLAST) : HIT_BLAST,
      );
    }),
  );
  const lock = getLockCenter();
  const lockAt: Point = { x: 0, y: 0 };
  const lockAtMs = openMs + LOCK_LAG;

  // how far apart the doors are at ms, from the click
  const openAt = (ms: number) => {
    if (ms >= enterMs) return smoothstep(clamp01((ms - enterMs) / openMs));
    for (const s of stops)
      if (ms >= s.opens && ms < s.closes + openMs)
        return Math.min(
          smoothstep(clamp01((ms - s.opens) / openMs)),
          1 - smoothstep(clamp01((ms - s.closes) / openMs)),
        );
    return 0;
  };
  const stopAt = (ms: number) => {
    let current = stops[0];
    for (const s of stops) if (ms >= s.opens) current = s;
    return current;
  };
  const ridingAt = (ms: number) => {
    for (const s of stops) {
      const shut = s.closes + openMs;
      if (ms >= shut && ms < shut + rideMs) return true;
    }
    return false;
  };

  // the lift at ms from the click
  const drawScene = (
    ctx: CanvasRenderingContext2D,
    view: FlightView,
    ms: number,
    now: number,
    floors: ScreenCopy,
  ): void => {
    const high = view.h / view.w;
    const riding = ridingAt(ms);
    const rattle = riding
      ? (hash01(Math.floor(ms / RATTLE_MS), 7301) - 0.5) * RATTLE
      : 0;
    const fps: Fps = {
      view,
      lens: LENS,
      cam: { x: 0, y: high / 2 + rattle, z: -FOCAL, tip: 0 },
    };
    const open = openAt(ms);
    if (ms >= enterMs)
      drawScreenPart(
        ctx,
        floors,
        view.x,
        view.y,
        view.w,
        view.h,
        view.x,
        view.y,
        view.w,
        view.h,
      );
    else if (open > 0) drawLobby(ctx, fps, stopAt(ms), high, ms, now);
    if (open < 1) {
      if (ms < stops[0].closes) {
        // the floors' screen itself, sliding apart down its middle
        const half = (view.w / 2) * open;
        drawScreenPart(
          ctx,
          floors,
          view.x,
          view.y,
          view.w / 2,
          view.h,
          view.x - half,
          view.y,
          view.w / 2,
          view.h,
        );
        drawScreenPart(
          ctx,
          floors,
          view.cx,
          view.y,
          view.w / 2,
          view.h,
          view.cx + half,
          view.y,
          view.w / 2,
          view.h,
        );
      } else drawDoors(ctx, fps, view, high, open, riding, ms);
    }
    const lower =
      ms >= enterMs
        ? clamp01((ms - enterMs) / GUN_UP_MS)
        : 1 - clamp01(ms / GUN_UP_MS);
    drawFpsShots(ctx, fps, shots, ms, now, ms * BOB_RATE, lower);
  };

  // the lock's blast: a huge one on it, smaller ones either side
  const drawLockBlast = (
    ctx: CanvasRenderingContext2D,
    view: FlightView,
    ms: number,
    now: number,
  ): void => {
    lockAt.x = view.x - area.left + lock.x;
    lockAt.y = view.y - area.top + locked.offsetY + lock.y;
    drawDetonation(ctx, lockAt, ms - lockAtMs, LOCK_BLAST * view.w, now);
    for (let k = 0; k < 4; k++) {
      const side = (k % 2 ? 1 : -1) * (1 + (k >> 1));
      const p = { x: lockAt.x + side * SIDE_GAP * view.w, y: lockAt.y };
      const since = ms - lockAtMs - SIDE_MS * (k + 1);
      drawDetonation(ctx, p, since, SIDE_BLAST * view.w, now);
    }
  };

  const beat = startFlightStage(KEY, floor, context, {
    flyMs,
    enter: { ms: enterMs, draw: drawScene },
    ownLanding: true,
    draw: (ctx, view, ms, now, floors) => {
      drawScene(ctx, view, enterMs + ms, now, floors);
      drawLockBlast(ctx, view, ms, now);
    },
    onEnd: () => {
      context.unlockFloorFree?.(locked.floor);
      context.applyTierCrit?.(floor, tier);
      endEventProc(KEY);
    },
  });
  if (!beat) return;
  const door = () => {
    playSwoosh();
    shakeScreen(DOOR_SHAKE);
  };
  for (const s of stops) {
    beat(s.opens - enterMs, door);
    beat(s.closes + openMs - enterMs, () => shakeScreen(DOOR_SHAKE));
    s.hits.forEach((ms, i) => {
      beat(ms - enterMs, () => {
        playExplosion();
        shakeScreen(SHOT_SHAKE);
      });
      if (i < s.hits.length - 1) return;
      const boss = (s.look.scale ?? 1) > 1;
      beat(ms + FPS_ROUND_MS - enterMs, () => {
        if (boss) playCritExplosion();
        shakeScreen(boss ? BOSS_SHAKE : KILL_SHAKE);
      });
    });
  }
  beat(0, door);
  beat(lockAtMs, () => {
    playCritExplosion();
    shakeScreen(LOCK_SHAKE);
  });
}
