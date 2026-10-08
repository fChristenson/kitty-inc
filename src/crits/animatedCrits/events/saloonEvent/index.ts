// the "High Noon" event (flight + fps; levels), a flight-stage event (see
// ../../flightStage) with its own way in, drawn in first person with
// shared/fps: it covers its crit, whose click swings the floors' screen open
// down its middle like a pair of saloon doors onto a dusty western street,
// shops down both sides and a bandit standing in the road. The view steps
// out onto the street; a countdown slams in, 3, 2, 1, SHOOT!, the bandit
// draws and fires, the view staggers, pitches forward and falls into a hole
// opening in the road, dropping through it back onto the floors, which get
// free levels as the crit's tier pays out
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop, playSwoosh } from "../../../../sound";
import { drawMuzzleFlash } from "../../../../shared/bullets";
import { drawWhiteBurst } from "../../../../shared/eventFx";
import {
  playCritExplosion,
  playExplosion,
} from "../../../../shared/explosionBang";
import {
  drawFpsEnemy,
  drawFpsFace,
  drawFpsFlat,
  drawFpsGround,
  drawFpsWall,
  drawFpsWallLines,
  fpsSight,
  type Fps,
  type FpsCamera,
  type FpsEnemyLook,
  type FpsLens,
} from "../../../../shared/fps";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { shakeScreen } from "../../../../shared/screenShake";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { drawScreenPart, type ScreenCopy } from "../../../../shared/screenCopy";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  createCritTextSprite,
  drawCritTextSprite,
  type CritTextSprite,
} from "../../../critFlash/critText";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { levelsFor } from "../../eventRewards";
import {
  canStartFlightStage,
  isFlightStageRunning,
  startFlightStage,
} from "../../flightStage";
import {
  drawFlightHole,
  drawHoleFall,
  holeRadius,
  HOLE_FOCAL,
} from "../../flightStage/hole";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";

const KEY = "saloon";

// the doors stand at z 0, the view starts FOCAL behind them where they fill
// the screen, its eye EYE high, the horizon HORIZON down the screen; looking
// down tips the street TIP screens up
const FOCAL = HOLE_FOCAL;
const EYE = 0.3;
const HORIZON = 0.42;
const TIP = 1.3;
const LENS: FpsLens = { focal: FOCAL, horizon: HORIZON, tip: TIP };
const STEP_TO = 0.5;
const STEP_BOB = 0.02;
// the doors: strips each half is drawn in, how far they swing open and how
// they flap before settling
const DOOR_STRIPS = 12;
const DOOR_OPEN = 1.45;
const DOOR_FLAP = 9;
const DOOR_SETTLE = 5;
// the road, the shopfronts down both sides of it and how far they run
const ROAD = 0.4;
const SHOPS = 9;
const SHOP_FROM = 0.9;
const SHOP_EVERY = 1.4;
// each runs a little into the next so the joins show no gap
const SHOP_OVERLAP = 0.02;
const SHOP_END = SHOP_FROM + SHOPS * SHOP_EVERY;
const SHOP_HIGH: [number, number] = [0.5, 0.85];
const SHOP_COLORS = [
  COLOR.chairGiveawayBrown,
  COLOR.teaBreakBrown,
  COLOR.hourglassWood,
];
// the shops' fronts stand SHOP_X out, SHOP_DEEP deep, the boardwalk in front
const SHOP_X = ROAD + 0.22;
const SHOP_DEEP = 0.8;
const BOARD_EVERY = 0.05;
const BOARDWALK_HIGH = 0.025;
const BOARDWALK_WIDE = 0.2;
const WINDOWS: [number, number][] = [
  [0.18, 0.46],
  [0.94, 1.22],
];
const DOOR: [number, number] = [0.58, 0.82];
const TRIM = COLOR.woodFill;
const TRIM_DARK = COLOR.woodOutline;
const PANE = COLOR.secondWindSky;
const BOARDWALK = COLOR.hourglassWoodDark;
const FAR = 40;
// where the bandit stands, and how he sways
const BANDIT_Z = 4;
const BANDIT_SWAY = 0.01;
const BANDIT: FpsEnemyLook = {
  skin: COLOR.woodFill,
  eyes: COLOR.black,
  body: COLOR.woodRing,
  arms: COLOR.woodRing,
  legs: COLOR.tideDeep,
  boots: COLOR.hourglassWoodDark,
  vest: COLOR.hourglassWood,
  bandana: COLOR.fireDrillRed,
  belt: { strap: COLOR.woodOutline, buckle: COLOR.heavenlyGold },
  holster: COLOR.espressoShotBrown,
  mustache: COLOR.woodOutline,
  hat: { crown: COLOR.hourglassWoodDark, band: COLOR.woodOutline },
  gun: COLOR.cauldronIron,
};
// the sun
const SUN_X = 0.28;
const SUN_Y = 0.12;
const SUN_R = 0.16;
const SUN_GLOW = fadeStops(COLOR.white);
// the countdown: its font, how big each number slams in from and lands (of
// the screen's width per 400 units), where it sits
const COUNT_FONT = 100;
const COUNT_FROM = 1.6;
const COUNT_SIZE = 0.85;
const COUNT_Y = 0.24;
const COUNT_SHAKE = 0.4;
const SHOOT_SHAKE = 0.8;
// the shot: its flash, the bullet's size, the hit's flash and shake
const FLASH_SIZE = 0.12;
const BULLET = 2.2;
const HIT_FLASH_MS = 260;
const FIRE_SHAKE = 1;
const HIT_SHAKE = 2.6;
// the stagger: the sway, how far the knees buckle, the darkening
const STAGGER_SWAY = 0.08;
const STAGGER_RATE = 0.012;
const BUCKLE = 0.15;
const DAZE = 0.3;
// the hole the view falls into, START_DEPTH below, opening as it pitches
const START_DEPTH = 6;
const HOLE_OPENS = 0.4;

interface Shop {
  side: number;
  z0: number;
  z1: number;
  high: number;
  color: string;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.saloonEvent.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) =>
      floor.unlocked &&
      canStartFlightStage(context) &&
      context.upgradeFloorFree !== undefined,
    arm: startSaloon,
  },
  { label: "High Noon", color: COLOR.amberMuted },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying High Noon
export function forceSaloonEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

// far ones first
const SHOP_LIST: Shop[] = [-1, 1]
  .flatMap((side) =>
    Array.from({ length: SHOPS }, (_, i) => ({
      side,
      z0: SHOP_FROM + i * SHOP_EVERY,
      z1: SHOP_FROM + (i + 1) * SHOP_EVERY + SHOP_OVERLAP,
      high: lerp(SHOP_HIGH, hash01(i + (side + 1) * 7, 5601)),
      color: SHOP_COLORS[(i + (side + 1) / 2) % SHOP_COLORS.length],
    })),
  )
  .sort((a, b) => b.z0 - a.z0);

function drawStreet(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  alpha: number,
): void {
  const { cam } = fps;
  drawFpsGround(ctx, fps, COLOR.amberMuted, alpha);
  drawFpsFlat(ctx, fps, 0, -ROAD, ROAD, cam.z, FAR, COLOR.coinHighlight, 0.55 * alpha);
  // the boardwalks, their tops and the kerbs facing the road
  for (const side of [-1, 1]) {
    const edge = side * (SHOP_X - BOARDWALK_WIDE);
    const from = Math.max(SHOP_FROM, cam.z);
    drawFpsFlat(ctx, fps, BOARDWALK_HIGH, edge, side * SHOP_X, from, SHOP_END, BOARDWALK, alpha);
    drawFpsWall(ctx, fps, edge, 0, BOARDWALK_HIGH, from, SHOP_END, TRIM_DARK, alpha);
  }
  for (const shop of SHOP_LIST) drawShop(ctx, fps, shop, alpha);
}

// one shop: its end wall, its front with boards, trim, sign, windows and door
function drawShop(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  shop: Shop,
  alpha: number,
): void {
  const { side, z0, z1, high } = shop;
  const x = side * SHOP_X;
  const back = side * (SHOP_X + SHOP_DEEP);
  drawFpsFace(ctx, fps, z0, x, back, 0, high, shop.color, alpha);
  drawFpsFace(ctx, fps, z0, x, back, 0, high, COLOR.black, 0.35 * alpha);
  drawFpsWall(ctx, fps, x, 0, high, z0, z1, shop.color, alpha);
  drawFpsWallLines(ctx, fps, x, BOARD_EVERY, high - 0.16, BOARD_EVERY, z0, z1, COLOR.black, 0.22 * alpha);
  // the cornice along its top and down its front corner
  drawFpsWall(ctx, fps, x, high - 0.025, high, z0, z1, TRIM_DARK, alpha);
  drawFpsWall(ctx, fps, x, 0, high, z0, z0 + 0.03, TRIM_DARK, alpha);
  drawFpsFace(ctx, fps, z0, x, back, high - 0.025, high, TRIM_DARK, alpha);
  // the sign board, framed
  drawFpsWall(ctx, fps, x, high - 0.15, high - 0.04, z0 + 0.12, z1 - 0.12, TRIM, alpha);
  drawFpsWall(ctx, fps, x, high - 0.14, high - 0.05, z0 + 0.14, z1 - 0.14, COLOR.amberMuted, alpha);
  // windows either side of the door, framed, and the door
  for (const [za, zb] of WINDOWS) {
    drawFpsWall(ctx, fps, x, 0.1, 0.3, z0 + za - 0.02, z0 + zb + 0.02, TRIM, alpha);
    drawFpsWall(ctx, fps, x, 0.115, 0.285, z0 + za, z0 + zb, PANE, alpha);
    drawFpsWall(ctx, fps, x, 0.195, 0.205, z0 + za, z0 + zb, TRIM, alpha);
  }
  drawFpsWall(ctx, fps, x, 0, 0.33, z0 + DOOR[0] - 0.02, z0 + DOOR[1] + 0.02, TRIM, alpha);
  drawFpsWall(ctx, fps, x, 0, 0.315, z0 + DOOR[0], z0 + DOOR[1], TRIM_DARK, alpha);
}

// the bandit standing in the road, drawn (0..1) from holster to aimed at
// the view; returns where his gun's muzzle is
function drawBandit(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  drawn: number,
  now: number,
): { x: number; y: number } | null {
  const sway = Math.sin(now * 0.003) * BANDIT_SWAY;
  const muzzle = drawFpsEnemy(ctx, fps, 0, BANDIT_Z, BANDIT, { aim: drawn, sway }, now);
  if (muzzle && drawn > 0) {
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    stampGlimmer(ctx, muzzle.x, muzzle.y, 0.03 * muzzle.s, now * 0.01, COLOR.heavenlyGold);
    ctx.globalCompositeOperation = previous;
  }
  return muzzle;
}

// the floors' screen swung open `swing` radians down its middle like saloon
// doors, out onto the street; drawn while the view's still behind them
function drawDoors(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  floors: ScreenCopy,
  swing: number,
): void {
  const { view } = fps;
  const cos = Math.cos(swing);
  const sin = Math.sin(swing);
  const strip = 0.5 / DOOR_STRIPS;
  const tall = view.h / view.w;
  // the height the screen's middle stands at, so shut they fill it exactly
  const mid = EYE - (0.5 - HORIZON) * tall;
  for (const side of [-1, 1])
    for (let j = 0; j < DOOR_STRIPS; j++) {
      // j strips in from its hinge at the screen's edge
      const d0 = j * strip;
      const d1 = d0 + strip;
      const a = fpsSight(fps, side * (0.5 - d0 * cos), mid, d0 * sin);
      const b = fpsSight(fps, side * (0.5 - d1 * cos), mid, d1 * sin);
      if (!a || !b) continue;
      // a strip stands the screen's height at its depth
      const s = (a.s + b.s) / 2;
      const top = (a.y + b.y) / 2 - (tall / 2) * s;
      const srcX =
        side < 0 ? view.x + d0 * view.w : view.x + view.w - d1 * view.w;
      drawScreenPart(
        ctx,
        floors,
        srcX,
        view.y,
        strip * view.w,
        view.h,
        Math.min(a.x, b.x),
        top,
        Math.abs(b.x - a.x) + 1,
        tall * s,
      );
    }
}

function startSaloon(floor: Floor, context: EventProcContext): void {
  const {
    doorsMs,
    stepMs,
    countMs,
    drawMs,
    boltMs,
    staggerMs,
    tumbleMs,
    flyMs,
    levelShare,
  } = CONFIG.saloonEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const stepAt = doorsMs;
  const countAt = stepAt + stepMs;
  const shootAt = countAt + 3 * countMs;
  const fireAt = shootAt + drawMs;
  const hitAt = fireAt + boltMs;
  const tumbleAt = hitAt + staggerMs;
  const enterMs = tumbleAt + tumbleMs;
  const landMs = flyMs + CONFIG.flightStage.arriveMs;
  const labels: CritTextSprite[] = ["3", "2", "1", "SHOOT!"].map((label, i) =>
    createCritTextSprite(
      label,
      i < 3 ? COLOR.heavenlyGold : COLOR.white,
      { fontSize: COUNT_FONT, strokeWidth: 16 },
      3,
    ),
  );
  const cameraAt = (ms: number): FpsCamera => {
    if (ms < stepAt) return { x: 0, y: EYE, z: -FOCAL, tip: 0 };
    if (ms < hitAt) {
      const p = smoothstep(clamp01((ms - stepAt) / stepMs));
      return {
        x: 0,
        y: EYE + Math.abs(Math.sin(p * Math.PI * 2)) * STEP_BOB,
        z: lerp([-FOCAL, STEP_TO], p),
        tip: 0,
      };
    }
    const since = ms - hitAt;
    return {
      x:
        Math.sin(since * STAGGER_RATE) *
        STAGGER_SWAY *
        Math.exp(-since / staggerMs),
      y: EYE - BUCKLE * smoothstep(clamp01(since / staggerMs)),
      z: STEP_TO,
      tip: smoothstep(clamp01((ms - tumbleAt) / tumbleMs)),
    };
  };
  const beat = startFlightStage(KEY, floor, context, {
    flyMs,
    enter: {
      ms: enterMs,
      draw: (ctx, view, ms, now, floors) => {
        const fps: Fps = { view, lens: LENS, cam: cameraAt(ms) };
        const { cam } = fps;
        // the street fading away under the view as it drops into the hole
        const street = 1 - smoothstep(clamp01((cam.tip - 0.7) / 0.3));
        const previous = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = "lighter";
        drawGlow(
          ctx,
          SUN_GLOW,
          view.x + view.w * (0.5 + SUN_X),
          view.y + view.h * (SUN_Y - cam.tip * TIP),
          view.w * SUN_R,
        );
        ctx.globalCompositeOperation = previous;
        drawStreet(ctx, fps, street);
        const drawn = smoothstep(clamp01((ms - shootAt) / drawMs));
        const muzzle = street > 0 ? drawBandit(ctx, fps, drawn, now) : null;
        if (cam.z < 0) {
          const t = ms / doorsMs;
          const swing =
            DOOR_OPEN *
            (1 - Math.exp(-DOOR_SETTLE * t) * Math.cos(DOOR_FLAP * t));
          drawDoors(ctx, fps, floors, swing);
        }
        if (muzzle && ms >= fireAt) {
          const since = ms - fireAt;
          drawMuzzleFlash(
            ctx,
            muzzle,
            Math.PI / 2,
            since / 160,
            FLASH_SIZE * view.w,
          );
          drawWhiteBurst(ctx, muzzle.x, muzzle.y, since / 300, 0.5);
          // the bullet rushing at the view
          drawWispBetween(
            ctx,
            (t) => {
              const u = clamp01((t - fireAt) / boltMs);
              return {
                x: lerp([muzzle.x, view.cx], u),
                y: lerp([muzzle.y, view.cy + view.h * 0.1], u),
              };
            },
            ms,
            now,
            WISP_SIZE * lerp([0.5, BULLET], clamp01(since / boltMs)),
            1,
            fireAt,
            hitAt,
          );
        }
        // the countdown slamming in, SHOOT! holding till the shot
        for (let i = 0; i < labels.length; i++) {
          const at = countAt + i * countMs;
          const until = i < 3 ? at + countMs : hitAt;
          if (ms < at || ms >= until) continue;
          const p = clamp01((ms - at) / 140);
          ctx.globalAlpha = i < 3 ? 1 - clamp01((ms - until + 120) / 120) : 1;
          drawCritTextSprite(
            ctx,
            labels[i],
            view.cx,
            view.y + view.h * COUNT_Y,
            (view.w / 400) * lerp([COUNT_FROM, COUNT_SIZE], 1 - (1 - p) ** 2),
          );
          ctx.globalAlpha = 1;
        }
        // hit: a blinding flash, then dazed as the view reels
        if (ms >= hitAt) {
          const flash = 1 - clamp01((ms - hitAt) / HIT_FLASH_MS);
          const daze = DAZE * smoothstep(clamp01((ms - hitAt) / staggerMs));
          ctx.globalAlpha = Math.max(flash, daze * street);
          ctx.fillStyle = flash > daze ? COLOR.white : COLOR.black;
          ctx.fillRect(view.x, view.y, view.w, view.h);
          ctx.globalAlpha = 1;
        }
        // the hole opening in the road under the view as it pitches into it
        const open = clamp01((cam.tip - (1 - HOLE_OPENS)) / HOLE_OPENS);
        if (open > 0)
          drawFlightHole(
            ctx,
            view,
            floors,
            view.cy,
            holeRadius(view, START_DEPTH) * smoothstep(open),
            START_DEPTH,
            open,
            now,
          );
      },
    },
    ownLanding: true,
    draw: (ctx, view, ms, now, floors) =>
      drawHoleFall(ctx, view, floors, ms, landMs, START_DEPTH, now),
    onEnd: () => {
      context.upgradeFloorFree?.(floor, levelsFor(floor, levelShare));
      context.applyTierCrit?.(floor, tier);
      endEventProc(KEY);
    },
  });
  if (!beat) return;
  beat(-enterMs, playSwoosh);
  for (let i = 0; i < 3; i++)
    beat(countAt + i * countMs - enterMs, () => {
      playBloop();
      shakeScreen(COUNT_SHAKE);
    });
  beat(shootAt - enterMs, () => shakeScreen(SHOOT_SHAKE));
  beat(fireAt - enterMs, () => {
    playExplosion();
    shakeScreen(FIRE_SHAKE);
  });
  beat(hitAt - enterMs, () => {
    playCritExplosion();
    shakeScreen(HIT_SHAKE);
  });
  beat(tumbleAt - enterMs, playSwoosh);
}
