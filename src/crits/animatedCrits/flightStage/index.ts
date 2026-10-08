// the flight stage, shared by every space-flight event: the event's crit
// click freezes the screen, which rumbles, then dives into the reveal stage's
// blue as if the view jumped to lightspeed, speed lines streaking out of the
// middle. The event flies its own things past the view for flyMs, drawn in
// depth with project(), or comes in its own way (FlightEntrance) instead of
// the dive; then the floors appear far ahead, rush up and the view
// crash-lands back onto them in a blinding blast, the screen unfreezes and the
// event pays out. The event only draws what it flies past and times its beats
import type { Floor } from "../../../gameState";
import { CONFIG } from "../../../config";
import { COLOR } from "../../../palette";
import { playSwoosh, startBoostEventStreamLoop } from "../../../sound";
import { drawBeam } from "../../../shared/beam";
import { drawExplosion, drawWhiteBurst } from "../../../shared/eventFx";
import { playSlamExplosion } from "../../../shared/explosionBang";
import { shakeScreen } from "../../../shared/screenShake";
import { hash01 } from "../../../shared/twinkle";
import { clamp01, smoothstep } from "../../../shared/easing";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../../shared/screenCopy";
import {
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
  type FrameMotion,
} from "../../../shared/screenFreeze";
import type { Point } from "../../../shared/wisp";
import type { EventProcContext } from "../eventProcs";
import { drawStageBackdrop } from "../revealStage/backdrop";

// the screen in the game canvas's world space, and its middle
export interface FlightView {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

export interface FlightContent {
  // how long the view flies before the floors appear far ahead
  flyMs: number;
  // ms counts from the flight's start: negative during the dive, past flyMs
  // while the floors rush up and the view crash-lands; `floors` the frozen
  // screen to draw parts of (shared/screenCopy's drawScreenPart)
  draw: (
    ctx: CanvasRenderingContext2D,
    view: FlightView,
    ms: number,
    now: number,
    floors: ScreenCopy,
  ) => void;
  // once the view has crash-landed and the screen unfroze
  onEnd: () => void;
  // the event's own way in, instead of the dive
  enter?: FlightEntrance;
  // the event draws the floors rushing up itself until the crash, filling
  // the screen exactly then, instead of the stage
  ownLanding?: boolean;
}

// drawn over the stage's sky for ms before the flight starts, `floors` the
// frozen screen to draw parts of (shared/screenCopy's drawScreenPart); the
// flight's speed lines quicken in from its start
export interface FlightEntrance {
  ms: number;
  draw: (
    ctx: CanvasRenderingContext2D,
    view: FlightView,
    ms: number,
    now: number,
    floors: ScreenCopy,
  ) => void;
}

// runs fn `ms` after the flight starts, unless the stage is gone by then
export type FlightBeat = (ms: number, fn: () => void) => void;

interface RunningFlight {
  key: string;
  floor: Floor;
  area: { left: number; top: number; right: number; bottom: number };
  content: FlightContent;
  startedAt: number;
  shot: ScreenCopy | null;
}

// the wind-up's rumble (of the screen's width) and zoom, then the dive's zoom
// and blur into the stage
const RUMBLE = 0.004;
const RUMBLE_MS = 16;
const WIND_ZOOM = 0.15;
const DIVE_ZOOM = 3;
const DIVE_BLUR = 6;
const DIVE_SHAKE = 0.6;
const DIVE_BURST = 2.5;
const DIVE_BURST_MS = 450;
// speed lines streaking out of the middle: how many, their trips a second
// from the far distance to past the edge, and their length and width
const LINES = 70;
const LINE_SPEED: [number, number] = [1.2, 2.2];
// the nearest a line starts, of the screen's half diagonal
const LINE_NEAR = 0.04;
const LINE_LENGTH = 0.45;
const LINE_WIDTH: [number, number] = [2, 12];
// the floors rushing up out of the distance, the glowing edge round them and
// the speed lines quickening as they come
const FLOOR_FAR = 14;
const EDGE = 8;
const ARRIVE_WARP = 1.4;
// the crash: its flash, blast and shake
const CRASH_FLASH_MS = 320;
const CRASH_BURST = 3;
const CRASH_REACH = 0.6;
const CRASH_SPARK = 60;
const CRASH_SHAKE = 3;
// an entrance's flight getting up to speed
const ENTERED_RAMP_MS = 250;
const STILL: FrameMotion = { pan: 0, scaleX: 1, scaleY: 1, blur: 0 };

let running: RunningFlight | null = null;

export function isFlightStageRunning(key?: string): boolean {
  return running !== null && (key === undefined || running.key === key);
}

export function canStartFlightStage(context: EventProcContext): boolean {
  return (
    !running && !isScreenFrozen() && context.getScreenAreaLocal !== undefined
  );
}

// the way in, before the flight's ms 0
function enterMs(content: FlightContent): number {
  const { windUpMs, diveMs } = CONFIG.flightStage;
  return content.enter?.ms ?? windUpMs + diveMs;
}

// where a point `x`, `y` (of the screen's width from its middle) at depth z
// shows: 1 is right in front of the view, farther is bigger
export function project(
  view: FlightView,
  x: number,
  y: number,
  z: number,
): Point {
  return { x: view.cx + (x * view.w) / z, y: view.cy + (y * view.w) / z };
}

// how fast the view's flying, 0..ARRIVE_WARP; ms from the stage starting
function warpAt(ms: number, content: FlightContent): number {
  const { windUpMs, diveMs: dive, arriveMs } = CONFIG.flightStage;
  const flyAt = enterMs(content);
  const arriveAt = flyAt + content.flyMs;
  if (ms >= arriveAt + arriveMs) return 0;
  if (ms >= arriveAt)
    return 1 + (ARRIVE_WARP - 1) * ((ms - arriveAt) / arriveMs);
  if (content.enter) return smoothstep(clamp01((ms - flyAt) / ENTERED_RAMP_MS));
  if (ms < windUpMs) return 0;
  return smoothstep(clamp01((ms - windUpMs) / dive));
}

// the frozen floors rumbling, then zooming and blurring as the view dives in
function frameMotion(ms: number): FrameMotion {
  const { windUpMs, diveMs: dive } = CONFIG.flightStage;
  if (ms < windUpMs) {
    const p = smoothstep(clamp01(ms / windUpMs));
    return {
      pan: Math.sin(ms / RUMBLE_MS) * RUMBLE * p,
      scaleX: 1 + WIND_ZOOM * p + 2 * RUMBLE * p,
      scaleY: 1 + WIND_ZOOM * p,
      blur: 0,
    };
  }
  const p = clamp01((ms - windUpMs) / dive);
  // once the stage covers the floors they needn't move
  if (p >= 1) return STILL;
  const zoom = 1 + WIND_ZOOM + DIVE_ZOOM * p * p;
  return { pan: 0, scaleX: zoom, scaleY: zoom, blur: DIVE_BLUR * p };
}

// speed lines streaking out of the view's middle
function drawSpeedLines(
  ctx: CanvasRenderingContext2D,
  view: FlightView,
  warp: number,
  now: number,
): void {
  if (warp <= 0) return;
  const reach = Math.hypot(view.w, view.h) / 2;
  for (let i = 0; i < LINES; i++) {
    const speed =
      LINE_SPEED[0] + (LINE_SPEED[1] - LINE_SPEED[0]) * hash01(i, 5001);
    // z runs from the far distance (1) to right past the view (near 0)
    const z = 1 - ((now * speed * 0.001 + hash01(i, 5002)) % 1) * 0.97;
    const a = hash01(i, 5003) * Math.PI * 2;
    const near = (reach * LINE_NEAR) / z;
    const far = near * (1 + LINE_LENGTH * warp);
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    drawBeam(
      ctx,
      { x: view.cx + cos * near, y: view.cy + sin * near },
      { x: view.cx + cos * far, y: view.cy + sin * far },
      LINE_WIDTH[0] + (LINE_WIDTH[1] - LINE_WIDTH[0]) * (1 - z),
      warp * (0.25 + 0.6 * (1 - z)),
    );
  }
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const stage = running;
  if (!stage) return;
  const rect = getFloorRect(stage.floor);
  if (!rect) return;
  // the floors as they were, for them to rush back up out of the distance
  stage.shot ??= copyScreen(ctx);
  const now = performance.now();
  const ms = now - stage.startedAt;
  const { windUpMs, diveMs: dive, arriveMs } = CONFIG.flightStage;
  const { content } = stage;
  const flyAt = enterMs(content);
  const arriveAt = flyAt + content.flyMs;
  const crashAt = arriveAt + arriveMs;
  const { area } = stage;
  const x = rect.left + area.left;
  const y = rect.top + area.top;
  const w = area.right - area.left;
  const h = area.bottom - area.top;
  const view: FlightView = { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (ms < crashAt && (content.enter || ms >= windUpMs)) {
    ctx.globalAlpha = content.enter
      ? 1
      : smoothstep(clamp01((ms - windUpMs) / dive));
    drawStageBackdrop(ctx, view, now, false);
    ctx.globalAlpha = 1;
  }
  drawSpeedLines(ctx, view, warpAt(ms, content), now);
  if (content.enter && ms < flyAt)
    content.enter.draw(ctx, view, ms, now, stage.shot);
  else if (ms < crashAt) content.draw(ctx, view, ms - flyAt, now, stage.shot);
  if (ms >= crashAt || (ms >= arriveAt && !content.ownLanding)) {
    // the floors rushing up out of the distance until they fill the screen
    const z = Math.max(
      1,
      FLOOR_FAR - (FLOOR_FAR - 1) * ((ms - arriveAt) / arriveMs),
    );
    const fw = w / z;
    const fh = h / z;
    const left = view.cx - fw / 2;
    const top = view.cy - fh / 2;
    drawScreenPart(ctx, stage.shot, x, y, w, h, left, top, fw, fh);
    if (z > 1) {
      ctx.globalAlpha = 1 - 1 / z;
      ctx.strokeStyle = COLOR.white;
      ctx.lineWidth = EDGE;
      ctx.strokeRect(left, top, fw, fh);
      ctx.globalAlpha = 1;
    }
  }
  if (!content.enter)
    drawWhiteBurst(
      ctx,
      view.cx,
      view.cy,
      (ms - flyAt + dive / 2) / DIVE_BURST_MS,
      DIVE_BURST,
    );
  if (ms >= crashAt) {
    const flash = 1 - clamp01((ms - crashAt) / CRASH_FLASH_MS);
    if (flash > 0) {
      ctx.globalAlpha = flash * flash;
      ctx.fillStyle = COLOR.white;
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1;
    }
    drawExplosion(
      ctx,
      view.cx,
      view.cy,
      ms - crashAt,
      now,
      CRASH_BURST,
      CRASH_REACH * w,
      CRASH_SPARK,
    );
  }
  ctx.restore();
}

// null when a stage can't start now; spotlightTotal keeps the total-income
// readout live on top, for an event paying into it as it flies
export function startFlightStage(
  key: string,
  floor: Floor,
  context: EventProcContext,
  content: FlightContent,
  { spotlightTotal = false }: { spotlightTotal?: boolean } = {},
): FlightBeat | null {
  const area = context.getScreenAreaLocal?.(floor);
  if (!canStartFlightStage(context) || !area) return null;
  const stage: RunningFlight = {
    key,
    floor,
    area,
    content,
    startedAt: performance.now(),
    shot: null,
  };
  running = stage;
  const isLive = () => running === stage;
  freezeScreen(drawOverlay, {
    spotlightTotal,
    // an entrance draws the floors itself
    frameMotion: content.enter
      ? undefined
      : () => frameMotion(performance.now() - stage.startedAt),
  });
  const beat: FlightBeat = (ms, fn) =>
    setTimeout(
      () => {
        if (isLive()) fn();
      },
      enterMs(content) + ms,
    );
  const { windUpMs, arriveMs, holdMs } = CONFIG.flightStage;
  let stopSound: (() => void) | null = null;
  if (content.enter) beat(0, () => (stopSound = startBoostEventStreamLoop()));
  else
    beat(windUpMs - enterMs(content), () => {
      playSwoosh();
      shakeScreen(DIVE_SHAKE);
      stopSound = startBoostEventStreamLoop();
    });
  beat(content.flyMs + arriveMs, () => {
    stopSound?.();
    playSlamExplosion();
    shakeScreen(CRASH_SHAKE);
  });
  beat(content.flyMs + arriveMs + holdMs, () => {
    running = null;
    unfreezeScreen();
    content.onEnd();
  });
  return beat;
}
