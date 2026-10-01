// the reveal stage, shared by every "reveal" event: the event's crit click
// freezes the screen and a blue stage streaked with speed stripes slides in
// from the right like a camera pan, pushing the floors off to the left. The
// event reveals its reward on it, then the stage slides on out the left as
// the floors come back in from the right, the screen unfreezes and the event
// pays out. The event only draws its reveal and times its own beats
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { playSwoosh } from "../../sound";
import {
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
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
  // ms counts from the stage being fully in: negative while it slides in and
  // past durationMs while it slides out, the stage carrying the reveal along
  draw: (
    ctx: CanvasRenderingContext2D,
    stage: StageRect,
    ms: number,
    now: number,
  ) => void;
  // once the stage has slid back out and the screen unfroze
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

let running: RunningStage | null = null;

const ease = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

export function isRevealStageRunning(key?: string): boolean {
  return running !== null && (key === undefined || running.key === key);
}

export function canStartRevealStage(context: EventProcContext): boolean {
  return (
    !running && !isScreenFrozen() && context.getScreenAreaLocal !== undefined
  );
}

// the stage's left edge, of the screen's width from its left, `ms` after it
// started sliding in
function stageLeftShare(ms: number, durationMs: number): number {
  const { slideMs } = CONFIG.revealStage;
  return (
    1 -
    ease(clamp01(ms / slideMs)) -
    ease(clamp01((ms - slideMs - durationMs) / slideMs))
  );
}

// how far the frozen floors slide along with it, of the screen's width
export function revealStagePan(ms: number, durationMs: number): number {
  const share = stageLeftShare(ms, durationMs);
  return ms < CONFIG.revealStage.slideMs + durationMs ? share - 1 : share + 1;
}

// the stage and its reveal `ms` after it started sliding in over the screen
export function drawRevealStage(
  ctx: CanvasRenderingContext2D,
  screen: StageRect,
  content: Pick<RevealContent, "durationMs" | "draw">,
  ms: number,
  now: number,
): void {
  const { slideMs } = CONFIG.revealStage;
  const share = stageLeftShare(ms, content.durationMs);
  if (share >= 1 || share <= -1) return;
  const stage = { ...screen, x: screen.x + screen.w * share };
  ctx.save();
  ctx.beginPath();
  ctx.rect(screen.x, screen.y, screen.w, screen.h);
  ctx.clip();
  const endAt = slideMs * 2 + content.durationMs;
  ctx.globalAlpha = clamp01(Math.min(ms, endAt - ms) / (slideMs * EDGE_FADE));
  drawStageBackdrop(ctx, stage, now);
  ctx.globalAlpha = 1;
  content.draw(ctx, stage, ms - slideMs, now);
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
  const { slideMs } = CONFIG.revealStage;
  const { durationMs } = content;
  freezeScreen(drawOverlay, {
    framePan: () =>
      revealStagePan(performance.now() - stage.startedAt, durationMs),
  });
  playSwoosh();
  const beat: StageBeat = (ms, fn) =>
    setTimeout(() => {
      if (isLive()) fn();
    }, slideMs + ms);
  beat(durationMs, playSwoosh);
  beat(durationMs + slideMs, () => {
    running = null;
    unfreezeScreen();
    content.onEnd();
  });
  return beat;
}
