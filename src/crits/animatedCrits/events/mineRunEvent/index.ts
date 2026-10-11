// the "Mine Run" event (fps; crit tiers), a flight-stage event (see
// ../../flightStage) with its own way in, drawn in first person with
// shared/fps: its crit's click drops the floors' screen away under a mine
// cart and the view rides it down a timbered tunnel, faster and faster,
// lanterns streaking past. Imps leap out from behind the props on either side
// and the pistol drops each as the cart rattles by, then a big one standing
// on the rails takes two. The cart bursts out of the tunnel's mouth onto the
// floors and every bar in view takes a crit tier, top to bottom
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
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
  fpsSight,
  FPS_IMP,
  FPS_ROUND_MS,
  type Fps,
  type FpsEnemyLook,
  type FpsLens,
  type FpsShot,
} from "../../../../shared/fps";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { shakeScreen } from "../../../../shared/screenShake";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import { drawScreenPart, type ScreenCopy } from "../../../../shared/screenCopy";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { findRewardBars } from "../../eventRewards";
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

const KEY = "mineRun";

// the view starts FOCAL behind z 0, where a screen-wide face fills the
// screen, its eye EYE up; the cart's speed (world units a second) and how
// fast it picks up
const FOCAL = 1.2;
const LENS: FpsLens = { focal: FOCAL, horizon: 0.5 };
const EYE = 0.4;
const SPEED = 1.5;
const ACCEL = 1.2;
// the tunnel: half wide, at least TUNNEL_HIGH high (or above the mouth's
// opening), a timber frame every FRAME_EVERY with lanterns on its posts,
// sleepers and rails along its floor
const HALF = 0.6;
const TUNNEL_HIGH = 1.3;
const OVER_MOUTH = 0.15;
const FRAME_EVERY = 1.2;
const FRAME_FROM = 0.6;
const POST = 0.1;
const BEAM = 0.12;
const LAMP_X = 0.47;
const LAMP_Y = 1;
const LAMP_SIZE = 0.06;
const SLEEPER_EVERY = 0.3;
const SLEEPER_LONG = 0.08;
const SLEEPER_HALF = 0.25;
const RAIL_X = 0.15;
const RAIL_HALF = 0.02;
// the mouth: its opening a screen's shape OPEN_W wide, the daylight glaring
// through it as the cart closes in from GLARE_FROM away
const OPEN_W = 0.7;
const GLARE_FROM = 12;
const GLARE = fadeStops(COLOR.white);
// the cart's rattle (by its speed) and its front edge at the screen's bottom
const RATTLE = 0.004;
const RATTLE_MS = 25;
const CART = 0.12;
const CART_RIM = 0.013;
const BOB_RATE = 0.004;
const GUN_UP_MS = 250;
// the imps: where each stands, leaping out from LEAP_FROM across over
// LEAP_MS when the view is `out` short of it, shot when it's each of `shots`
// short; the last a big one on the rails
const IMPS = [
  { z: 3, x: -0.3, side: -1, scale: 1, out: 3.2, shots: [2.2] },
  { z: 5.5, x: 0.3, side: 1, scale: 1, out: 3.2, shots: [2.2] },
  { z: 8, x: -0.28, side: -1, scale: 1, out: 3.2, shots: [2.2] },
  { z: 11.5, x: 0, side: 1, scale: 1.5, out: 5, shots: [3.6, 2.9] },
];
const LEAP_FROM = 0.8;
const LEAP_MS = 140;
const AIM_LAG = 100;
const CHEST = 0.42;
const HIT_BLAST = 0.3;
const KILL_BLAST = 0.6;
const BOSS_BLAST = 1.1;
const NEAREST = 0.3;
const SHOT_SHAKE = 0.6;
const KILL_SHAKE = 1.4;
const BOSS_SHAKE = 3;
const DROP_SHAKE = 0.8;

interface Imp {
  x: number;
  z: number;
  side: number;
  look: FpsEnemyLook;
  out: number;
  aims: number;
  hits: number[];
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.mineRunEvent.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) =>
      floor.unlocked &&
      canStartFlightStage(context) &&
      context.applyTierCrit !== undefined,
    arm: startMineRun,
  },
  { label: "Mine Run", color: COLOR.amberMuted },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Mine Run
export function forceMineRunEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

// where the cart is at ms from the click, and when it gets to z
const cartZ = (ms: number) => {
  const t = Math.max(0, ms) / 1000;
  return -FOCAL + SPEED * t + ACCEL * t * t;
};
const cartAt = (z: number) =>
  (1000 * (-SPEED + Math.sqrt(SPEED * SPEED + 4 * ACCEL * (z + FOCAL)))) /
  (2 * ACCEL);

function startMineRun(floor: Floor, context: EventProcContext): void {
  const area = context.getScreenAreaLocal?.(floor);
  if (!area) return;
  const { dropMs, rideMs, flyMs, tierGapMs } = CONFIG.mineRunEvent;
  const { arriveMs } = CONFIG.flightStage;
  const tier = context.critTier ?? pickCritTierByOdds();
  // the mouth's opening has the screen's shape, filling it as the cart lands
  const aspect = (area.bottom - area.top) / (area.right - area.left);
  const openHigh = OPEN_W * aspect;
  const high = Math.max(TUNNEL_HIGH, openHigh + OVER_MOUTH);
  const landAt = rideMs + flyMs + arriveMs;
  const mouth = cartZ(landAt) + FOCAL * OPEN_W;
  const imps: Imp[] = IMPS.map((i) => {
    const out = cartAt(i.z - i.out);
    return {
      x: i.x,
      z: i.z,
      side: i.side,
      look: i.scale === 1 ? FPS_IMP : { ...FPS_IMP, scale: i.scale },
      out,
      aims: out + AIM_LAG,
      hits: i.shots.map((ahead) => cartAt(i.z - ahead)),
    };
  });
  const shots: FpsShot[] = imps.flatMap((imp) =>
    imp.hits.map((ms, k) => {
      const scale = imp.look.scale ?? 1;
      const kills = k === imp.hits.length - 1;
      return createFpsShot(
        ms,
        imp.x,
        CHEST * scale,
        imp.z,
        kills ? (scale > 1 ? BOSS_BLAST : KILL_BLAST) : HIT_BLAST,
      );
    }),
  );
  const frames: number[] = [];
  for (let z = FRAME_FROM; z < mouth - FRAME_EVERY / 2; z += FRAME_EVERY)
    frames.push(z);

  const drawImp = (
    ctx: CanvasRenderingContext2D,
    fps: Fps,
    imp: Imp,
    ms: number,
    now: number,
  ) => {
    if (ms < imp.out || imp.z < fps.cam.z + NEAREST) return;
    const leap = smoothstep(clamp01((ms - imp.out) / LEAP_MS));
    const x = imp.x === 0 ? 0 : lerp([imp.side * LEAP_FROM, imp.x], leap);
    drawFpsEnemy(
      ctx,
      fps,
      x,
      imp.z,
      imp.look,
      fpsEnemyPose(ms, imp.aims, imp.hits, imp.side),
      now,
    );
  };

  // the mouth at its end: the floors through its opening, rock round it,
  // and the daylight glaring
  const drawMouth = (
    ctx: CanvasRenderingContext2D,
    fps: Fps,
    floors: ScreenCopy,
  ) => {
    const half = OPEN_W / 2;
    drawFpsOpening(ctx, fps, floors, mouth, OPEN_W, 0, aspect);
    const rock = COLOR.espressoShotBrown;
    drawFpsFace(ctx, fps, mouth, -HALF, -half, 0, high, rock);
    drawFpsFace(ctx, fps, mouth, half, HALF, 0, high, rock);
    drawFpsFace(ctx, fps, mouth, -half, half, openHigh, high, rock);
    const glare = clamp01(1 - (mouth - fps.cam.z) / GLARE_FROM);
    const middle = fpsSight(fps, 0, openHigh / 2, mouth);
    if (!middle || glare <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = glare;
    drawGlow(ctx, GLARE, middle.x, middle.y, OPEN_W * middle.s);
    ctx.restore();
  };

  const drawScene = (
    ctx: CanvasRenderingContext2D,
    view: FlightView,
    ms: number,
    now: number,
    floors: ScreenCopy,
  ): void => {
    const z = cartZ(ms);
    const speed = SPEED + (2 * ACCEL * Math.max(0, ms)) / 1000;
    const land = smoothstep(clamp01((ms - rideMs) / (landAt - rideMs)));
    const rattle =
      (hash01(Math.floor(ms / RATTLE_MS), 7501) - 0.5) *
      RATTLE *
      speed *
      (1 - land);
    const fps: Fps = {
      view,
      lens: LENS,
      cam: { x: 0, y: lerp([EYE, openHigh / 2], land) + rattle, z, tip: 0 },
    };
    drawFpsSky(ctx, fps, COLOR.black);
    drawFpsGround(ctx, fps, COLOR.woodOutline);
    drawMouth(ctx, fps, floors);
    for (const x of [-HALF, HALF])
      drawFpsWall(ctx, fps, x, 0, high, z, mouth, COLOR.espressoShotBrown);
    drawFpsFlat(ctx, fps, high, -HALF, HALF, z, mouth, COLOR.black, 0.5);
    for (
      let s = Math.floor(mouth / SLEEPER_EVERY) * SLEEPER_EVERY;
      s > z;
      s -= SLEEPER_EVERY
    )
      drawFpsFlat(
        ctx,
        fps,
        0.001,
        -SLEEPER_HALF,
        SLEEPER_HALF,
        s,
        s + SLEEPER_LONG,
        COLOR.hourglassWoodDark,
      );
    for (const x of [-RAIL_X, RAIL_X])
      drawFpsFlat(
        ctx,
        fps,
        0.01,
        x - RAIL_HALF,
        x + RAIL_HALF,
        z,
        mouth,
        COLOR.silverTicketGray,
      );
    // the frames far to near, each imp just in front of those behind it
    let next = imps.length - 1;
    for (let f = frames.length - 1; f >= 0; f--) {
      const fz = frames[f];
      while (next >= 0 && imps[next].z > fz)
        drawImp(ctx, fps, imps[next--], ms, now);
      if (fz < z + 0.05) continue;
      drawFpsFace(
        ctx,
        fps,
        fz,
        -HALF,
        -HALF + POST,
        0,
        high,
        COLOR.hourglassWood,
      );
      drawFpsFace(
        ctx,
        fps,
        fz,
        HALF - POST,
        HALF,
        0,
        high,
        COLOR.hourglassWood,
      );
      drawFpsFace(
        ctx,
        fps,
        fz,
        -HALF,
        HALF,
        high - BEAM,
        high,
        COLOR.hourglassWood,
      );
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const x of [-LAMP_X, LAMP_X]) {
        const lamp = fpsSight(fps, x, LAMP_Y, fz);
        if (lamp)
          stampGlimmer(
            ctx,
            lamp.x,
            lamp.y,
            LAMP_SIZE * lamp.s,
            now * 0.003 + fz,
            COLOR.heavenlyGold,
          );
      }
      ctx.restore();
    }
    while (next >= 0) drawImp(ctx, fps, imps[next--], ms, now);
    // the cart's front edge
    const cart = CART * view.w * (1 - land);
    if (cart > 0) {
      const top = view.y + view.h - cart;
      ctx.fillStyle = COLOR.hourglassWoodDark;
      ctx.fillRect(view.x, top, view.w, cart);
      ctx.fillStyle = COLOR.silverTicketGray;
      ctx.fillRect(view.x, top - CART_RIM * view.w, view.w, CART_RIM * view.w);
    }
    const lower = Math.max(1 - clamp01(ms / GUN_UP_MS), land);
    drawFpsShots(ctx, fps, shots, ms, now, ms * BOB_RATE, lower);
    // the floors' screen dropping away under the cart
    if (ms < dropMs) {
      const u = clamp01(ms / dropMs);
      drawScreenPart(
        ctx,
        floors,
        view.x,
        view.y,
        view.w,
        view.h,
        view.x,
        view.y + view.h * u * u,
        view.w,
        view.h,
      );
    }
  };

  const beat = startFlightStage(KEY, floor, context, {
    flyMs,
    enter: { ms: rideMs, draw: drawScene },
    ownLanding: true,
    draw: (ctx, view, ms, now, floors) =>
      drawScene(ctx, view, rideMs + ms, now, floors),
    onEnd: () => {
      const bars = findRewardBars(floor, context);
      if (bars.length === 0) context.applyTierCrit?.(floor, tier);
      bars.forEach((bar, k) =>
        setTimeout(
          () => context.applyTierCrit?.(bar.floor, tier),
          k * tierGapMs,
        ),
      );
      endEventProc(KEY);
    },
  });
  if (!beat) return;
  beat(-rideMs, () => {
    playSwoosh();
    shakeScreen(DROP_SHAKE);
  });
  for (const imp of imps) {
    const boss = (imp.look.scale ?? 1) > 1;
    imp.hits.forEach((ms, k) => {
      beat(ms - rideMs, () => {
        playExplosion();
        shakeScreen(SHOT_SHAKE);
      });
      if (k < imp.hits.length - 1) return;
      beat(ms + FPS_ROUND_MS - rideMs, () => {
        if (boss) playCritExplosion();
        shakeScreen(boss ? BOSS_SHAKE : KILL_SHAKE);
      });
    });
  }
}
