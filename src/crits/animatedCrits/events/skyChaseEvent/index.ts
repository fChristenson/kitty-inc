// the "Sky Chase" event (rail shooter; levels), a flight-stage event (see
// ../../flightStage) with its own way in, drawn in shared/animationStyles/fps's
// world with shared/animationStyles/race's racer wisp: its crit's click
// zooms the floors' screen away into a sunset sky over a sea of clouds, the
// ship tearing through rushing clouds after a golden bandit wisp that streaks
// off ahead, weaving. It drops glowing mines behind it that rush at the view;
// the ship locks on and shoots each in a flash, crack and jolt, free levels
// landing on that hit, the mines coming faster, the bandit ducking into cloud
// banks and back out. Last the ship closes in and locks on, beeps quickening,
// a volley blows the bandit apart in one big blast, and the cloud wall ahead
// parts on the floors' screen, the view diving through the gap onto them
import meta from "./meta";
import { isFloorMaxed, levelsFor, type Floor } from "../../../../gameState";
import { COLOR } from "../../../../palette";
import { playSimonNote, playSpinTick, playSwoosh } from "../../../../sound";
import {
  playCritExplosion,
  playExplosion,
  playSlamExplosion,
} from "../../../../shared/explosionBang";
import {
  drawDetonation,
  drawLitFuse,
} from "../../../../shared/animationStyles/explosion";
import {
  drawFpsFace,
  drawFpsOpening,
  fpsHorizon,
  fpsOpeningLanding,
  FPS_NEAR,
  type Fps,
  type FpsLens,
} from "../../../../shared/animationStyles/fps";
import { createRaceWisp } from "../../../../shared/animationStyles/race";
import { drawWhiteBurst } from "../../../../shared/eventFx";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { shakeScreen } from "../../../../shared/screenShake";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { hash01 } from "../../../../shared/twinkle";
import { drawScreenPart, type ScreenCopy } from "../../../../shared/screenCopy";
import {
  drawWisp,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawPoppingCritText } from "../../../critFlash/critText";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
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

const KEY = "skyChase";

// the view rides BEHIND the ship and RIDE above it, leaning after it by
// FOLLOW; the ship's speed through the sky (world units a second)
const FOCAL = 1.2;
const LENS: FpsLens = { focal: FOCAL, horizon: 0.5 };
const BEHIND = 1.4;
const RIDE = 0.3;
const FOLLOW = 0.5;
const SPEED = 6.5;
// the racer: its weave, height over the cloud sea, size and nose
const WEAVE_X = 0.3;
const WEAVE_X_RATE = 0.0026;
const HOVER = 0.9;
const WEAVE_Y = 0.1;
const WEAVE_Y_RATE = 0.0041;
const RACER = 0.09;
const NOSE = 0.5;
const NOSE_UP = 0.04;
const CAM_Y = HOVER + RIDE;
// the sunset: the sun's disc and glow (of the screen's width) on the horizon
const SUN_R = 0.13;
const SUN_GLOW_R = 0.55;
const SUN_GLOW = fadeStops(COLOR.flameYellow);
// the cloud sea's bands rushing at the view
const BAND = 0.9;
const BANDS = 16;
const BAND_ALPHA = 0.28;
// the clouds: one every CLOUD_EVERY along, out to REACH, fading in far off
// and out as they whip past the view
const CLOUD_EVERY = 0.55;
const CLOUD_W: [number, number] = [1.1, 2.4];
const REACH = 14;
const CLOUD_FADE_FAR = 0.35;
const CLOUD_NEAR = 0.35;
const CLOUD_FADE_NEAR = 1.3;
const CLOUD_ALPHA = 0.9;
// the floors' screen this far past where the ship is when the view starts
// after it, its width and gold frame; the cloud wall over it and its parting
const SCREEN_AHEAD = 5;
const SCREEN_W = 1;
const SCREEN_FRAME = 0.06;
const PULL_AHEAD = 5;
const WALL_IN = 0.4;
const WALL_W = 2.4;
const WALL_SIDE = 1.6;
const WALL_ROW = 0.8;
const PART = 2.2;
const PART_MS = 380;
// the bandit: how far ahead, closing in for the kill, its weave, size, aura
const AHEAD = 4;
const AHEAD_FINAL = 2.3;
const INTRO_MS = 320;
const CLOSE_MS = 200;
const BANDIT_X = 0.55;
const BANDIT_X_RATE = 0.0042;
const BANDIT_UP = 0.15;
const BANDIT_Y = 0.25;
const BANDIT_Y_RATE = 0.0057;
const BANDIT = 0.2;
const AURA = 0.35;
const AURA_GOLD = fadeStops(COLOR.heavenlyGold);
const TREMBLE = 0.04;
// its dodges: out to the side and up into a cloud bank, which shows a bit
// before and after
const DODGE_X = 1.3;
const DODGE_Y = 0.35;
const BANK_W = 1.9;
const BANK_LEAD = 160;
const HIDDEN_ALPHA = 0.25;
// a mine: dropped APPROACH_MS before it's shot SHOT_AT ahead of the ship,
// rushing at the view; locked onto LOCK_MS before the shot, which flies SHOT_MS
const APPROACH_MS = 260;
const SHOT_AT = 1.2;
const MINE = 0.12;
const MINE_GLOW = 0.3;
const MINE_RED = fadeStops(COLOR.fullHouseCrimson);
const MINE_AIM_X = 0.28;
const MINE_AIM_Y = 0.16;
const LOCK_MS = 150;
const SHOT_MS = 80;
const SHOT = 1.1;
const VOLLEY_SPREAD = 0.14;
// the blasts (world units), carried along after the view by CARRY
const MINE_BLAST = 0.45;
const VOLLEY_BLAST = 0.3;
const FINAL_BLAST = 1.6;
const CARRY = 0.6;
const BURST_MS = 300;
// the floors' screen zooming away into the horizon
const ZOOM = 14;
const RUSH_LAG = 260;
const BEEPS = 6;
const SPLIT_SHAKE = 0.8;
const SHOT_SHAKE = 0.4;
const HIT_SHAKE = 1;
const HIT_SHAKE_STEP = 0.07;
const VOLLEY_SHAKE = 0.6;
const FINAL_SHAKE = 3.2;
const FINAL_FLASH_MS = 320;
const LABEL_MS = 550;
const LABEL_STYLE = { fontSize: 38, strokeWidth: 6 };
const BIG_LABEL_STYLE = { fontSize: 56, strokeWidth: 8 };

interface Spot {
  x: number;
  y: number;
  z: number;
}

interface Cloud {
  x: number;
  y: number;
  z: number;
  w: number;
}

interface Mine {
  index: number;
  drop: number;
  lock: number;
  fire: number;
  hit: number;
  from: Spot;
  to: Spot;
  nose: Spot;
  s: number;
  label: string | null;
  path: (ms: number) => Point | null;
  shotPath: (ms: number) => Point | null;
}

interface Volley {
  fire: number;
  hit: number;
  from: Spot;
  to: Spot;
  path: (ms: number) => Point | null;
}

// where (x, y, z) shows, into out; its px a unit there, 0 behind the view
function sightInto(fps: Fps, x: number, y: number, z: number, out: Point) {
  const dz = z - fps.cam.z;
  if (dz < FPS_NEAR) return 0;
  const s = (fps.lens.focal * fps.view.w) / dz;
  out.x = fps.view.cx + (x - fps.cam.x) * s;
  out.y = fpsHorizon(fps) + (fps.cam.y - y) * s;
  return s;
}

// a puffy sunset cloud, lit gold on top, built once
const SPRITE_W = 256;
const SPRITE_H = 128;
const PUFFS: readonly (readonly [number, number, number])[] = [
  [0.22, 0.66, 0.22],
  [0.4, 0.5, 0.3],
  [0.62, 0.44, 0.34],
  [0.8, 0.62, 0.22],
  [0.5, 0.72, 0.24],
  [0.32, 0.76, 0.18],
  [0.7, 0.76, 0.2],
];
let cloudSprite: HTMLCanvasElement | null = null;
function getCloudSprite(): HTMLCanvasElement {
  if (cloudSprite) return cloudSprite;
  const sprite = document.createElement("canvas");
  sprite.width = SPRITE_W;
  sprite.height = SPRITE_H;
  const ctx = sprite.getContext("2d")!;
  const body = ctx.createLinearGradient(0, 0, 0, SPRITE_H);
  body.addColorStop(0, COLOR.easterSalePink);
  body.addColorStop(0.5, COLOR.springSalePink);
  body.addColorStop(1, COLOR.purple);
  ctx.beginPath();
  for (const [x, y, r] of PUFFS) {
    ctx.moveTo(x * SPRITE_W + r * SPRITE_H, y * SPRITE_H);
    ctx.arc(x * SPRITE_W, y * SPRITE_H, r * SPRITE_H, 0, Math.PI * 2);
  }
  ctx.fillStyle = body;
  ctx.fill();
  ctx.beginPath();
  for (const [x, y, r] of PUFFS) {
    const cx = x * SPRITE_W - r * SPRITE_H * 0.2;
    const cy = y * SPRITE_H - r * SPRITE_H * 0.35;
    const rr = r * SPRITE_H * 0.6;
    ctx.moveTo(cx + rr, cy);
    ctx.arc(cx, cy, rr, 0, Math.PI * 2);
  }
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = COLOR.flameYellow;
  ctx.fill();
  cloudSprite = sprite;
  return sprite;
}

registerEventProc(
  {
    key: KEY,
    chance: () => meta.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) =>
      floor.unlocked &&
      !isFloorMaxed(floor) &&
      canStartFlightStage(context) &&
      context.upgradeFloorFree !== undefined,
    arm: startSkyChase,
  },
  { label: "Sky Chase", color: COLOR.orange },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Sky Chase
export function forceSkyChaseEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

function startSkyChase(floor: Floor, context: EventProcContext): void {
  const area = context.getScreenAreaLocal?.(floor);
  if (!area) return;
  const aspect = (area.bottom - area.top) / (area.right - area.left);
  const {
    splitMs,
    mineHitMs,
    dodgeMs,
    lockAtMs,
    lockMs,
    volley: volleyCount,
    volleyGapMs,
    levelShare,
    finalShare,
  } = meta.values;
  const { arriveMs } = FLIGHT_STAGE;
  const tier = context.critTier ?? pickCritTierByOdds();
  const cloudImage = getCloudSprite();

  const volleyAt = lockAtMs + lockMs;
  const finalMs = volleyAt + (volleyCount - 1) * volleyGapMs + SHOT_MS;
  const enterMs = finalMs + RUSH_LAG;
  const flown = (ms: number) => (SPEED * Math.max(0, ms)) / 1000;
  const screenZ = flown(enterMs) + SCREEN_AHEAD;
  const sill = CAM_Y - (SCREEN_W * aspect) / 2;
  const land = fpsOpeningLanding(FOCAL, screenZ, SCREEN_W, sill, aspect);
  const landing = (ms: number) => smoothstep(clamp01((ms - enterMs) / arriveMs));
  const ship = { x: 0, z: 0, hover: 0 };
  const shipAt = (ms: number) => {
    const t = Math.max(0, ms);
    const w = landing(ms);
    ship.x = WEAVE_X * Math.sin(t * WEAVE_X_RATE) * (1 - w);
    ship.z = flown(ms) + PULL_AHEAD * w * w;
    ship.hover = HOVER + WEAVE_Y * Math.sin(t * WEAVE_Y_RATE);
    return ship;
  };

  // how far into a dodge the bandit is, 0..1..0, and its cloud bank's showing
  const dodgeIn = (ms: number, d: number) => {
    const from = dodgeMs[d][0];
    const to = dodgeMs[d][1];
    return Math.sin(Math.PI * clamp01((ms - from) / (to - from)));
  };
  const bankIn = (ms: number, d: number) => {
    const from = dodgeMs[d][0];
    const to = dodgeMs[d][1];
    const u = clamp01((ms - from + BANK_LEAD) / (to - from + 2 * BANK_LEAD));
    return clamp01(1.8 * Math.sin(Math.PI * u));
  };
  const lockIn = (ms: number) => clamp01((ms - lockAtMs) / lockMs);
  // the bandit's spot: streaking off ahead, weaving, ducking into the banks,
  // then pulled in and trembling under the lock-on
  const banditInto = (ms: number, out: Spot) => {
    const t = Math.max(0, ms - splitMs);
    const intro = clamp01((ms - splitMs / 2) / INTRO_MS);
    const close = smoothstep(clamp01((ms - lockAtMs + CLOSE_MS) / CLOSE_MS));
    const ahead =
      lerp([0.3, AHEAD], 1 - (1 - intro) ** 3) - (AHEAD - AHEAD_FINAL) * close;
    out.x = BANDIT_X * Math.sin(t * BANDIT_X_RATE) * (1 - 0.8 * close);
    out.y = HOVER + BANDIT_UP + BANDIT_Y * Math.sin(t * BANDIT_Y_RATE);
    for (let d = 0; d < dodgeMs.length; d++) {
      const k = dodgeIn(ms, d);
      out.x += (d % 2 ? 1 : -1) * DODGE_X * k;
      out.y += DODGE_Y * k;
    }
    const lock = lockIn(ms);
    if (ms >= lockAtMs) out.x += TREMBLE * (1 + lock) * Math.sin(ms * 0.9);
    out.z = flown(ms) + ahead;
    return out;
  };
  const banditHidden = (ms: number) => {
    let k = 0;
    for (let d = 0; d < dodgeMs.length; d++) k = Math.max(k, dodgeIn(ms, d));
    return 1 - (1 - HIDDEN_ALPHA) * smoothstep(clamp01((k - 0.5) / 0.4));
  };

  // one frame of view, its camera moved every frame
  const fps: Fps = {
    view: { x: 0, y: 0, w: 1, h: 1, cx: 0 },
    lens: LENS,
    cam: { x: 0, y: 0, z: 0, tip: 0 },
  };

  // the clouds rushing past, up to the last stretch before the wall
  const clouds: Cloud[] = [];
  const cloudsEnd = flown(finalMs) + 1;
  for (let i = 0, z = 0.6; z < cloudsEnd; i++, z += CLOUD_EVERY) {
    const side = hash01(i, 9101) < 0.5 ? -1 : 1;
    const wide = hash01(i, 9102) < 0.7;
    clouds.push({
      x: side * (wide ? lerp([0.9, 3], hash01(i, 9103)) : 0.5),
      y: wide
        ? lerp([-0.3, 2.4], hash01(i, 9104))
        : hash01(i, 9104) < 0.5
          ? -0.2
          : 2.3,
      z: z + 0.3 * hash01(i, 9105),
      w: lerp(CLOUD_W, hash01(i, 9106)),
    });
  }

  // the mines: each dropped off the bandit, rushing at the view onto a spot
  // just ahead of the ship, where it's shot
  const bw: Spot = { x: 0, y: 0, z: 0 };
  const mines: Mine[] = [];
  for (let k = 0; k < mineHitMs.length; k++) {
    const hit = mineHitMs[k];
    const drop = hit - APPROACH_MS;
    const b = banditInto(drop, bw);
    const from = { x: b.x, y: b.y, z: b.z };
    const atHit = shipAt(hit);
    const to = {
      x: atHit.x * FOLLOW + (k % 2 ? 1 : -1) * MINE_AIM_X,
      y: atHit.hover + RIDE * 0.5 + (k % 3 === 1 ? MINE_AIM_Y : -MINE_AIM_Y),
      z: atHit.z + SHOT_AT,
    };
    const atFire = shipAt(hit - SHOT_MS);
    const nose = { x: atFire.x, y: atFire.hover + NOSE_UP, z: atFire.z + NOSE };
    const mine: Mine = {
      index: k,
      drop,
      lock: hit - SHOT_MS - LOCK_MS,
      fire: hit - SHOT_MS,
      hit,
      from,
      to,
      nose,
      s: 0,
      label: null,
      path: () => null,
      shotPath: () => null,
    };
    const spot: Point = { x: 0, y: 0 };
    mine.path = (ms) => {
      if (ms < drop) return null;
      const u = clamp01((ms - drop) / (hit - drop));
      const e = u * u;
      mine.s = sightInto(
        fps,
        from.x + (to.x - from.x) * e,
        from.y + (to.y - from.y) * e,
        from.z + (to.z - from.z) * u,
        spot,
      );
      return mine.s > 0 ? spot : null;
    };
    const shotSpot: Point = { x: 0, y: 0 };
    mine.shotPath = (ms) => {
      if (ms < mine.fire) return null;
      const u = clamp01((ms - mine.fire) / SHOT_MS);
      return sightInto(
        fps,
        nose.x + (to.x - nose.x) * u,
        nose.y + (to.y - nose.y) * u,
        nose.z + (to.z - nose.z) * u,
        shotSpot,
      ) > 0
        ? shotSpot
        : null;
    };
    mines.push(mine);
  }

  // the volley, from both sides of the nose onto the trembling bandit
  const volleys: Volley[] = [];
  for (let i = 0; i < volleyCount; i++) {
    const fire = volleyAt + i * volleyGapMs;
    const hit = fire + SHOT_MS;
    const at = shipAt(fire);
    const from = {
      x: at.x + (i % 2 ? 1 : -1) * VOLLEY_SPREAD,
      y: at.hover + NOSE_UP,
      z: at.z + NOSE,
    };
    const b = banditInto(hit, bw);
    const to = { x: b.x, y: b.y, z: b.z };
    const spot: Point = { x: 0, y: 0 };
    volleys.push({
      fire,
      hit,
      from,
      to,
      path: (ms) => {
        if (ms < fire) return null;
        const u = clamp01((ms - fire) / SHOT_MS);
        return sightInto(
          fps,
          from.x + (to.x - from.x) * u,
          from.y + (to.y - from.y) * u,
          from.z + (to.z - from.z) * u,
          spot,
        ) > 0
          ? spot
          : null;
      },
    });
  }
  const finalSpot = volleys[volleys.length - 1].to;

  const banditSpot: Spot = { x: 0, y: 0, z: 0 };
  const banditPoint: Point = { x: 0, y: 0 };
  const banditPath = (ms: number): Point | null => {
    const b = banditInto(ms, banditSpot);
    return sightInto(fps, b.x, b.y, b.z, banditPoint) > 0 ? banditPoint : null;
  };
  const racerSpot = { x: 0, y: 0, z: 0 };
  const racer = createRaceWisp((ms) => {
    const at = shipAt(ms);
    racerSpot.x = at.x;
    racerSpot.y = at.hover;
    racerSpot.z = at.z;
    return racerSpot;
  });

  let total = 0;
  let finalLabel: string | null = null;
  const giveLevels = (share: number) => {
    const n = levelsFor(floor, share, 1);
    context.upgradeFloorFree?.(floor, n);
    total += n;
    return `+${total} Lvl`;
  };

  const a: Point = { x: 0, y: 0 };
  let skyFill: CanvasGradient | null = null;
  let seaFill: CanvasGradient | null = null;
  let fillY = NaN;
  let fillH = NaN;

  const drawCloud = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    z: number,
    w: number,
    alpha: number,
  ) => {
    if (alpha <= 0) return;
    const s = sightInto(fps, x, y, z, a);
    if (s === 0) return;
    const cw = w * s;
    ctx.globalAlpha = alpha;
    ctx.drawImage(cloudImage, a.x - cw / 2, a.y - cw / 4, cw, cw / 2);
  };
  const drawWorldCloud = (ctx: CanvasRenderingContext2D, c: Cloud) => {
    const dz = c.z - fps.cam.z;
    if (dz < CLOUD_NEAR || dz > REACH) return;
    const far = clamp01((REACH - dz) / (REACH * CLOUD_FADE_FAR));
    const near = clamp01((dz - CLOUD_NEAR) / CLOUD_FADE_NEAR);
    drawCloud(ctx, c.x, c.y, c.z, c.w, CLOUD_ALPHA * far * near);
  };

  const drawScene = (
    ctx: CanvasRenderingContext2D,
    view: FlightView,
    ms: number,
    now: number,
    floors: ScreenCopy,
  ): void => {
    const at = shipAt(ms);
    const shipZ = at.z;
    const w = landing(ms);
    fps.view = view;
    fps.cam.x = at.x * FOLLOW;
    fps.cam.y = lerp([at.hover + RIDE, land.y], w);
    fps.cam.z = lerp([flown(ms) - BEHIND, land.z], w);
    const cz = fps.cam.z;
    const horizon = fpsHorizon(fps);

    // the sunset sky, its sun, the cloud sea and its bands rushing in
    if (view.y !== fillY || view.h !== fillH || !skyFill || !seaFill) {
      fillY = view.y;
      fillH = view.h;
      skyFill = ctx.createLinearGradient(0, view.y, 0, horizon);
      skyFill.addColorStop(0, COLOR.halloweenSalePurple);
      skyFill.addColorStop(0.45, COLOR.peppermintPink);
      skyFill.addColorStop(0.8, COLOR.orange);
      skyFill.addColorStop(1, COLOR.flameYellow);
      seaFill = ctx.createLinearGradient(0, horizon, 0, view.y + view.h);
      seaFill.addColorStop(0, COLOR.springSalePink);
      seaFill.addColorStop(0.3, COLOR.royalFlushPurple);
      seaFill.addColorStop(1, COLOR.purpleShadow);
    }
    ctx.fillStyle = skyFill;
    ctx.fillRect(view.x, view.y, view.w, horizon - view.y);
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.8;
    drawGlow(ctx, SUN_GLOW, view.cx, horizon, view.w * SUN_GLOW_R);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;
    ctx.fillStyle = COLOR.flameYellow;
    ctx.beginPath();
    ctx.arc(view.cx, horizon, view.w * SUN_R, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = seaFill;
    ctx.fillRect(view.x, horizon, view.w, view.y + view.h - horizon);
    const bottom = view.y + view.h;
    const near = cz + FPS_NEAR * 1.01;
    const row0 = Math.floor(near / BAND);
    ctx.beginPath();
    for (let row = row0; row < row0 + BANDS; row++) {
      if (((row % 2) + 2) % 2 !== 0) continue;
      const za = Math.max(row * BAND, near);
      const zb = (row + 1) * BAND;
      const ya = Math.min(
        bottom,
        horizon + (fps.cam.y * FOCAL * view.w) / (za - cz),
      );
      const yb = horizon + (fps.cam.y * FOCAL * view.w) / (zb - cz);
      if (ya > yb) ctx.rect(view.x, yb, view.w, ya - yb);
    }
    ctx.globalAlpha = BAND_ALPHA;
    ctx.fillStyle = COLOR.easterSalePink;
    ctx.fill();
    ctx.globalAlpha = 1;

    // the floors' screen in its gold frame, behind the cloud wall until the
    // bandit's blast parts it
    drawFpsFace(
      ctx,
      fps,
      screenZ + 0.01,
      -SCREEN_W / 2 - SCREEN_FRAME,
      SCREEN_W / 2 + SCREEN_FRAME,
      sill - SCREEN_FRAME,
      sill + SCREEN_W * aspect + SCREEN_FRAME,
      COLOR.heavenlyGold,
    );
    drawFpsOpening(ctx, fps, floors, screenZ, SCREEN_W, sill, aspect);
    const part = smoothstep(clamp01((ms - finalMs) / PART_MS));
    for (let col = -1; col <= 1; col++)
      for (let row = -1; row <= 1; row++) {
        const out = col === 0 ? (row === 0 ? 1 : row) : col;
        drawCloud(
          ctx,
          col * WALL_SIDE + out * PART * part,
          CAM_Y + row * WALL_ROW,
          screenZ - WALL_IN,
          WALL_W,
          col === 0 ? 1 - part : 1,
        );
      }

    // the clouds past the bandit, far to near
    const b = banditInto(ms, bw);
    let i = clouds.length - 1;
    for (; i >= 0 && clouds[i].z > b.z; i--) drawWorldCloud(ctx, clouds[i]);
    ctx.globalAlpha = 1;

    // the bandit, its gold aura swelling under the lock-on, and its banks
    const lock = lockIn(ms);
    if (ms >= splitMs / 2 && ms < finalMs) {
      const s = sightInto(fps, b.x, b.y, b.z, a);
      if (s > 0) {
        const hidden = banditHidden(ms);
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = hidden * (0.7 + 0.3 * lock);
        drawGlow(ctx, AURA_GOLD, a.x, a.y, AURA * s * (1 + 1.5 * lock));
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = previous;
        drawWisp(ctx, banditPath, ms, now, BANDIT * s * (1 + 0.5 * lock), 1, hidden);
      }
    }
    for (let d = 0; d < dodgeMs.length; d++)
      drawCloud(
        ctx,
        (d % 2 ? 1 : -1) * DODGE_X,
        HOVER + BANDIT_UP + DODGE_Y,
        b.z - 0.25,
        BANK_W,
        bankIn(ms, d),
      );
    ctx.globalAlpha = 1;

    // the mines rushing at the view, throbbing red and gold, locked onto
    for (let k = 0; k < mines.length; k++) {
      const m = mines[k];
      if (ms < m.drop || ms >= m.hit) continue;
      const p = m.path(ms);
      if (!p) continue;
      const s = m.s;
      const burn = (ms - m.drop) / (m.hit - m.drop);
      ctx.globalAlpha = 0.85;
      drawGlow(ctx, MINE_RED, p.x, p.y, MINE_GLOW * s * (1 + 0.5 * burn));
      ctx.globalAlpha = 1;
      drawLitFuse(ctx, p, burn, MINE_GLOW * 0.8 * s, now);
      drawWisp(ctx, m.path, ms, now, MINE * s, 0.8);
      if (ms < m.lock) continue;
      const q = m.path(ms);
      if (!q) continue;
      const u = clamp01((ms - m.lock) / LOCK_MS);
      drawBrackets(
        ctx,
        q,
        MINE_GLOW * m.s * (1 + 1.6 * (1 - u) * (1 - u)),
        ms >= m.fire ? COLOR.white : COLOR.fullHouseCrimson,
      );
    }
    if (ms >= lockAtMs && ms < finalMs && sightInto(fps, b.x, b.y, b.z, a) > 0) {
      const r = AURA * (fps.lens.focal * view.w) / (b.z - cz);
      const blink = lock < 1 ? (ms - lockAtMs) % (90 - 50 * lock) < 30 : true;
      drawBrackets(
        ctx,
        a,
        r * (1.2 + 2.4 * (1 - lock) * (1 - lock)),
        blink ? COLOR.white : COLOR.fullHouseCrimson,
      );
    }

    // the shots
    for (let k = 0; k < mines.length; k++) {
      const m = mines[k];
      drawWispBetween(ctx, m.shotPath, ms, now, WISP_SIZE * SHOT, 1, m.fire, m.hit);
    }
    for (let k = 0; k < volleys.length; k++) {
      const v = volleys[k];
      drawWispBetween(ctx, v.path, ms, now, WISP_SIZE * SHOT, 1, v.fire, v.hit);
    }

    // the clouds nearer than the bandit, whipping past the view
    for (; i >= 0; i--) drawWorldCloud(ctx, clouds[i]);
    ctx.globalAlpha = 1;

    if (shipZ < screenZ) racer(ctx, fps, ms, now, RACER);

    // the blasts, carried after the view as it flies through them
    const flownNow = flown(ms);
    for (let k = 0; k < mines.length; k++) {
      const m = mines[k];
      const since = ms - m.hit;
      if (since < 0 || since >= 800) continue;
      const carried = CARRY * (flownNow - flown(m.hit));
      const s = sightInto(fps, m.to.x, m.to.y, m.to.z + carried, a);
      if (s === 0) continue;
      drawDetonation(ctx, a, since, MINE_BLAST * s, now);
      if (since < BURST_MS)
        drawWhiteBurst(ctx, a.x, a.y, since / BURST_MS, 0.35);
    }
    for (let k = 0; k < volleys.length; k++) {
      const v = volleys[k];
      const since = ms - v.hit;
      if (since < 0 || since >= 800) continue;
      const last = k === volleys.length - 1;
      const carried = CARRY * (flownNow - flown(v.hit));
      const s = sightInto(fps, v.to.x, v.to.y, v.to.z + carried, a);
      if (s === 0) continue;
      drawDetonation(ctx, a, since, (last ? FINAL_BLAST : VOLLEY_BLAST) * s, now);
      if (since < BURST_MS * (last ? 2 : 1))
        drawWhiteBurst(
          ctx,
          a.x,
          a.y,
          since / (BURST_MS * (last ? 2 : 1)),
          last ? 1.8 : 0.3,
        );
    }

    // each mine's levels tallied where it went off, riding along with the view
    for (let k = 0; k < mines.length; k++) {
      const m = mines[k];
      const since = ms - m.hit;
      if (!m.label || since < 0 || since >= LABEL_MS) continue;
      const carried = flownNow - flown(m.hit);
      const rise = m.to.y + 0.2 + 0.2 * (since / LABEL_MS);
      if (sightInto(fps, m.to.x, rise, m.to.z + carried, a) === 0) continue;
      ctx.globalAlpha = 1 - smoothstep(clamp01((since / LABEL_MS - 0.6) / 0.4));
      drawPoppingCritText(
        ctx,
        m.label,
        a.x,
        a.y,
        COLOR.heavenlyGold,
        now - since,
        now,
        LABEL_STYLE,
      );
      ctx.globalAlpha = 1;
    }
    const sinceFinal = ms - finalMs;
    if (finalLabel && sinceFinal >= 0 && sinceFinal < LABEL_MS * 2) {
      const carried = flownNow - flown(finalMs);
      if (
        sightInto(fps, finalSpot.x, finalSpot.y + 0.35, finalSpot.z + carried, a) > 0
      ) {
        ctx.globalAlpha =
          1 - smoothstep(clamp01((sinceFinal / (LABEL_MS * 2) - 0.6) / 0.4));
        drawPoppingCritText(
          ctx,
          finalLabel,
          a.x,
          a.y,
          COLOR.heavenlyGold,
          now - sinceFinal,
          now,
          BIG_LABEL_STYLE,
        );
        ctx.globalAlpha = 1;
      }
    }

    // the bandit's blast whiting out the whole view
    if (sinceFinal >= 0 && sinceFinal < FINAL_FLASH_MS) {
      ctx.globalAlpha = 0.85 * (1 - sinceFinal / FINAL_FLASH_MS) ** 2;
      ctx.fillStyle = COLOR.white;
      ctx.fillRect(view.x, view.y, view.w, view.h);
      ctx.globalAlpha = 1;
    }

    // the floors' screen zooming away into the horizon
    if (ms < splitMs) {
      const u = clamp01(ms / splitMs);
      const k = 1 / (1 + ZOOM * u * u);
      const fw = view.w * k;
      const fh = view.h * k;
      const cy = lerp([view.y + view.h / 2, horizon], 1 - k);
      ctx.globalAlpha = 1 - smoothstep(clamp01((u - 0.7) / 0.3));
      drawScreenPart(
        ctx,
        floors,
        view.x,
        view.y,
        view.w,
        view.h,
        view.cx - fw / 2,
        cy - fh / 2,
        fw,
        fh,
      );
      ctx.strokeStyle = COLOR.white;
      ctx.lineWidth = 6;
      ctx.strokeRect(view.cx - fw / 2, cy - fh / 2, fw, fh);
      ctx.globalAlpha = 1;
    }
  };

  const beat = startFlightStage(KEY, floor, context, {
    flyMs: 0,
    enter: { ms: enterMs, draw: drawScene },
    ownLanding: true,
    draw: (ctx, view, ms, now, floors) =>
      drawScene(ctx, view, enterMs + ms, now, floors),
    onEnd: () => {
      context.applyTierCrit?.(floor, tier);
      endEventProc(KEY);
    },
  });
  if (!beat) return;
  beat(-enterMs, () => {
    playSwoosh();
    shakeScreen(SPLIT_SHAKE);
  });
  beat(splitMs / 2 - enterMs, playSwoosh);
  for (let d = 0; d < dodgeMs.length; d++)
    beat(dodgeMs[d][0] - enterMs, playSwoosh);
  for (const m of mines) {
    beat(m.drop - enterMs, () => playSpinTick(1.3 + 0.05 * m.index));
    beat(m.fire - enterMs, () => shakeScreen(SHOT_SHAKE));
    beat(m.hit - enterMs, () => {
      m.label = giveLevels(levelShare);
      playExplosion();
      playSimonNote(m.index);
      shakeScreen(HIT_SHAKE + HIT_SHAKE_STEP * m.index);
    });
  }
  for (let k = 0; k < BEEPS; k++) {
    const at = lockAtMs + lockMs * (1 - (1 - k / BEEPS) ** 1.7);
    beat(at - enterMs, () => {
      playSpinTick(1 + 0.15 * k);
      shakeScreen(0.3 + 0.1 * k);
    });
  }
  for (let k = 0; k < volleys.length; k++) {
    const v = volleys[k];
    const last = k === volleys.length - 1;
    beat(v.fire - enterMs, () => shakeScreen(VOLLEY_SHAKE));
    beat(v.hit - enterMs, () => {
      if (!last) {
        playExplosion();
        shakeScreen(HIT_SHAKE);
        return;
      }
      finalLabel = giveLevels(finalShare);
      playSlamExplosion();
      playCritExplosion();
      shakeScreen(FINAL_SHAKE);
    });
  }
  beat(0, playSwoosh);
}

// lock-on brackets of half size r round `at`
function drawBrackets(
  ctx: CanvasRenderingContext2D,
  at: Point,
  r: number,
  color: string,
): void {
  const x = at.x;
  const y = at.y;
  const arm = r * 0.4;
  ctx.beginPath();
  for (let k = 0; k < 4; k++) {
    const sx = k % 2 ? 1 : -1;
    const sy = k < 2 ? -1 : 1;
    ctx.moveTo(x + sx * r, y + sy * (r - arm));
    ctx.lineTo(x + sx * r, y + sy * r);
    ctx.lineTo(x + sx * (r - arm), y + sy * r);
  }
  ctx.lineWidth = 4;
  ctx.strokeStyle = color;
  ctx.stroke();
}
