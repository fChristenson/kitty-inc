// the reveal stage, shared by every "reveal" event: the event's crit click
// freezes the screen, which rumbles for a beat, then whips over
// like a camera pan, the floors stretching and blurring off to the left as a
// blue stage streaked with speed stripes rushes in from the right and wobbles
// to a stop. The event reveals its reward on it, then the stage rumbles and
// whips out the same way as the floors come back in from the right, the screen
// unfreezes and the event pays out. The event only draws its reveal and times
// its own beats
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playSwoosh } from "../../sound";
import { hash01 } from "../../shared/twinkle";
import {
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
  type FrameMotion,
} from "../../shared/screenFreeze";
import type { EventProcContext } from "../eventProcs";
import { drawStageBackdrop } from "./backdrop";

// the stage's rect in the game canvas's world space
export interface StageRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RevealContent {
  // how long the reveal plays once the stage is in
  durationMs: number;
  // ms counts from the stage being fully in: negative while it comes in and
  // past durationMs while it leaves, the stage carrying the reveal along
  draw: (
    ctx: CanvasRenderingContext2D,
    stage: StageRect,
    ms: number,
    now: number,
  ) => void;
  // once the stage has gone and the screen unfroze
  onEnd: () => void;
}

// runs fn `ms` after the stage is fully in, unless the stage is gone by then
export type StageBeat = (ms: number, fn: () => void) => void;

interface RunningStage {
  key: string;
  floor: Floor;
  // the visible screen in the floor's own coordinates
  area: { left: number; top: number; right: number; bottom: number };
  content: RevealContent;
  startedAt: number;
}

// of the slide spent fading the stage's edge in at the start and out at the end
const EDGE_FADE = 0.3;
// the wind-up: how hard the screen rumbles, of its width
const RUMBLE = 0.004;
const RUMBLE_MS = 16;
// at full whip speed: the horizontal stretch and the floors' blur (CSS px)
const STRETCH = 0.25;
const BLUR = 6;
// the wobble the stage settles with once it's in
const SETTLE = 0.06;
const SETTLE_DECAY_MS = 120;
const SETTLE_WAVE_MS = 45;
// streaks whipping across the whole screen at speed
const WARP_STREAKS = 26;
const WARP_SPEED = 4; // screen widths a second
// the slope of the whip's ease at its fastest, in shares a slide
const WHIP_PEAK = 5;

let running: RunningStage | null = null;

const ease = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
// ease-in-out quint: slow off the mark, a whip through the middle
const whip = (t: number) =>
  t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2;

export function isRevealStageRunning(key?: string): boolean {
  return running !== null && (key === undefined || running.key === key);
}

export function canStartRevealStage(context: EventProcContext): boolean {
  return (
    !running && !isScreenFrozen() && context.getScreenAreaLocal !== undefined
  );
}

// how long the stage takes to come in (and to leave)
function inMs(): number {
  const { windUpMs, slideMs } = CONFIG.revealStage;
  return windUpMs + slideMs;
}

export function revealStageTotalMs(durationMs: number): number {
  return inMs() * 2 + durationMs;
}

// the stage's left edge, of the screen's width from its left
function stageShare(ms: number, durationMs: number): number {
  const { windUpMs, slideMs } = CONFIG.revealStage;
  const leaveAt = inMs() + durationMs;
  return (
    1 -
    whip(clamp01((ms - windUpMs) / slideMs)) -
    whip(clamp01((ms - leaveAt - windUpMs) / slideMs))
  );
}

// where it is and how it's moving `ms` after the stage started coming in:
// warp 0..1 with its speed, windUp 0..1 rumbling before each whip
function stageMotion(ms: number, durationMs: number) {
  const { windUpMs, slideMs } = CONFIG.revealStage;
  const share = stageShare(ms, durationMs);
  const slope =
    Math.abs(stageShare(ms + 4, durationMs) - stageShare(ms - 4, durationMs)) /
    8;
  const leaving = ms >= inMs() + durationMs;
  const t = leaving ? ms - inMs() - durationMs : ms;
  const windUp =
    t < windUpMs
      ? ease(clamp01(t / windUpMs))
      : 1 - clamp01((t - windUpMs) / slideMs);
  return {
    share,
    leaving,
    warp: clamp01((slope * slideMs) / WHIP_PEAK),
    windUp: t > inMs() ? 0 : windUp,
    rumble: Math.sin(ms / RUMBLE_MS) * RUMBLE * (t > inMs() ? 0 : windUp),
  };
}

// how the frozen floors move with it: off to the left as the stage comes in,
// then back in from the right as it leaves
export function revealStageFrameMotion(
  ms: number,
  durationMs: number,
): FrameMotion {
  const { share, leaving, warp, windUp, rumble } = stageMotion(
    ms,
    durationMs,
  );
  return {
    pan: (leaving ? share + 1 : share - 1) + rumble,
    // just wide enough that the rumble never bares a screen edge
    scaleX: 1 + STRETCH * warp + 2 * RUMBLE * windUp,
    scaleY: 1,
    blur: BLUR * warp,
  };
}

// streaks whipping right to left over the whole screen while it moves
function drawWarpStreaks(
  ctx: CanvasRenderingContext2D,
  screen: StageRect,
  warp: number,
  now: number,
): void {
  if (warp <= 0) return;
  const { x, y, w, h } = screen;
  ctx.fillStyle = COLOR.white;
  for (let i = 0; i < WARP_STREAKS; i++) {
    const length = w * (0.2 + 0.5 * hash01(i, 21)) * warp;
    const travel = w + length;
    const speed = (WARP_SPEED * (0.7 + 0.6 * hash01(i, 22)) * w) / 1000;
    const along = (now * speed + hash01(i, 23) * travel) % travel;
    const thickness = 2 + 4 * hash01(i, 24);
    ctx.globalAlpha = 0.55 * warp * (0.4 + 0.6 * hash01(i, 25));
    ctx.fillRect(
      x + w - along,
      y + h * hash01(i, 26) - thickness / 2,
      length,
      thickness,
    );
  }
  ctx.globalAlpha = 1;
}

// the stage and its reveal `ms` after the stage started coming in over the screen
export function drawRevealStage(
  ctx: CanvasRenderingContext2D,
  screen: StageRect,
  content: Pick<RevealContent, "durationMs" | "draw">,
  ms: number,
  now: number,
): void {
  const { windUpMs, slideMs } = CONFIG.revealStage;
  const { durationMs } = content;
  const { share, leaving, warp, rumble } = stageMotion(ms, durationMs);
  const sinceIn = ms - inMs();
  // stretched with its speed, then wobbling sideways once it's in
  const settle =
    sinceIn >= 0 && !leaving
      ? SETTLE *
        Math.exp(-sinceIn / SETTLE_DECAY_MS) *
        Math.sin(sinceIn / SETTLE_WAVE_MS)
      : 0;
  const scaleX = 1 + STRETCH * warp - settle;
  ctx.save();
  ctx.beginPath();
  ctx.rect(screen.x, screen.y, screen.w, screen.h);
  ctx.clip();
  if (share < 1 && share > -1) {
    const stage = {
      ...screen,
      x: screen.x + screen.w * (share + (leaving ? rumble : 0)),
    };
    const cx = stage.x + stage.w / 2;
    ctx.save();
    ctx.translate(cx, 0);
    ctx.scale(scaleX, 1);
    ctx.translate(-cx, 0);
    const fadeMs = slideMs * EDGE_FADE;
    ctx.globalAlpha = clamp01(
      Math.min(ms - windUpMs, revealStageTotalMs(durationMs) - ms) / fadeMs,
    );
    drawStageBackdrop(ctx, stage, now);
    ctx.globalAlpha = 1;
    content.draw(ctx, stage, sinceIn, now);
    ctx.restore();
  }
  drawWarpStreaks(ctx, screen, warp, now);
  ctx.restore();
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const stage = running;
  if (!stage) return;
  const rect = getFloorRect(stage.floor);
  if (!rect) return;
  const now = performance.now();
  const { area } = stage;
  drawRevealStage(
    ctx,
    {
      x: rect.left + area.left,
      y: rect.top + area.top,
      w: area.right - area.left,
      h: area.bottom - area.top,
    },
    stage.content,
    now - stage.startedAt,
    now,
  );
}

// null when a stage can't start now
export function startRevealStage(
  key: string,
  floor: Floor,
  context: EventProcContext,
  content: RevealContent,
): StageBeat | null {
  const area = context.getScreenAreaLocal?.(floor);
  if (!canStartRevealStage(context) || !area) return null;
  const stage: RunningStage = {
    key,
    floor,
    area,
    content,
    startedAt: performance.now(),
  };
  running = stage;
  const isLive = () => running === stage;
  const { windUpMs } = CONFIG.revealStage;
  const { durationMs } = content;
  freezeScreen(drawOverlay, {
    frameMotion: () =>
      revealStageFrameMotion(performance.now() - stage.startedAt, durationMs),
  });
  const beat: StageBeat = (ms, fn) =>
    setTimeout(() => {
      if (isLive()) fn();
    }, inMs() + ms);
  beat(windUpMs - inMs(), playSwoosh);
  beat(durationMs + windUpMs, playSwoosh);
  beat(durationMs + inMs(), () => {
    running = null;
    unfreezeScreen();
    content.onEnd();
  });
  return beat;
}
