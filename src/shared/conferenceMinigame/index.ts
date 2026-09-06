import { playSwoosh, playExplosion } from "../../sound";
import { drawPill, drawCartoonText } from "../../utils";
import { COLOR } from "../../palette";
import { getScreenShakeOffset } from "../../screenShake";
import { getWiggleRotation } from "../../shared/wiggle";
import {
  setupResizableCanvas,
  createRafLoop,
  formatElapsedSeconds,
  computePressBounceScale,
  computeSmoothedTrailPoints,
  drawTrailLine,
  drawTrailHead,
} from "../canvasGame";
import {
  createPressConferenceScene,
  LABEL_ABOVE_AUDIENCE_OFFSET,
} from "../pressConferenceScene";

// the shared "conference stage" mini-game shell every game like this needs
// (hud/pressConferenceGame, hud/liquidateAssetsGame): canvas/resize/rAF loop,
// the audience/floor/grid/podium backdrop (see ../pressConferenceScene), the
// shared "line head" trail drawing, the tap-to-begin prompt, the End button
// (with its own press-bounce + click-not-pointerdown anti-ghost-click
// handling), pointer input plumbing, and open/close lifecycle. Each specific
// game only supplies its own physics/world (step), its own extra world
// content drawn under the shared line (renderGraph — market events for press
// conference, scrolling platforms for liquidate assets), and its own
// tap/reward/open logic
export const TRAIL_SAMPLE_DX = 6;
const TRAIL_SMOOTHING_RADIUS = 3;
const TAIL_MAX_ANGLE_DEG = 60;
const TAIL_MAX_ANGLE_TAN = Math.tan((TAIL_MAX_ANGLE_DEG * Math.PI) / 180);
export const LINE_WIDTH = 4;
const LINE_COLOR = "#22c55e";
// same head dot for every game built on this engine — never a per-game option
const HEAD_RADIUS = LINE_WIDTH / 2;
export const HEAD_X_OFFSET_FROM_CENTER = 40;
const HEAD_START_Y_LIFT_PX = 100;

export function computeMaxTrailLength(cssW: number): number {
  return Math.ceil(cssW / TRAIL_SAMPLE_DX) + 2;
}

const TAP_TO_BEGIN_LABEL = "Tap to begin";
const TAP_TO_BEGIN_FONT = '900 30px "Fredoka", system-ui, sans-serif';
const TAP_TO_BEGIN_STROKE_WIDTH = 6;
const TAP_TO_BEGIN_LIFT_PX = 40;

const END_LABEL = "End";
const BTN_REFERENCE_LABEL = "Sale";
const BTN_REFERENCE_W = 90;
export const END_BTN_H = (BTN_REFERENCE_W * 140) / 330;
const END_BTN_MARGIN_BELOW_PODIUM = 8;
export const END_BTN_BOTTOM_MARGIN = 28; // fallback margin only, used before the podium sprite has loaded
const SCORE_LABELS_EXTRA_LIFT_PX = 20;

export interface MinigameState {
  headY: number;
  velocityY: number;
  tailY: number;
  trail: number[];
  worldX: number;
  survivedMs: number;
  started: boolean;
  running: boolean;
  gameOver: boolean;
  holding: boolean;
  marketInfluencePercent: number;
}

export interface ConferenceMinigameElements {
  screenId: string;
  canvasId: string;
  timerId: string;
  scoreId: string; // the score wrapper, positioned above the audience every frame
  influenceValueId: string;
}

export interface ConferenceMinigameOptions<S extends MinigameState> {
  elements: ConferenceMinigameElements;
  createState: () => S;
  // called once per frame right after resize(), before the round starts —
  // for any extra one-time setup a specific game needs (snapshotting a
  // budget, seeding a starter platform, ...)
  onOpen?: (
    state: S,
    cssW: number,
    cssH: number,
    getFloorTopY: () => number,
  ) => void;
  // called once per active frame (state.running && state.started) to advance
  // this game's own physics/world/trail — may set state.running=false and
  // state.gameOver=true to end the round
  step: (
    state: S,
    dtMs: number,
    cssW: number,
    cssH: number,
    getFloorTopY: () => number,
    ctx: CanvasRenderingContext2D,
  ) => void;
  // draws this game's own extra world content (market events / platforms),
  // called after the shared scene backdrop and before the shared line/head
  renderGraph: (
    ctx: CanvasRenderingContext2D,
    state: S,
    headX: number,
    now: number,
  ) => void;
  // called on every pointerdown while the round hasn't ended — apply this
  // game's own tap/flap/bounce impulse; the engine already flips
  // state.started/state.holding itself
  onTap: (state: S) => void;
  // called exactly once, the frame state.gameOver flips true (the engine
  // plays the shared "round over" sound itself) — apply this game's own
  // reward/spend logic. close is provided in case this game ever wants to
  // end the dialog itself instead of waiting for the shared End button
  onGameOver: (state: S, close: () => void) => void;
  onClose?: () => void;
  // any extra per-frame DOM positioning/text a specific game needs (e.g.
  // press conference's own budget readout), called after the shared score
  // label's own position is set
  onLayout?: (state: S, cssH: number, audienceTopY: number) => void;
}

export interface ConferenceMinigame {
  open: () => void;
  close: () => void;
}

export function wireConferenceMinigame<S extends MinigameState>(
  container: HTMLElement,
  options: ConferenceMinigameOptions<S>,
): ConferenceMinigame {
  const { elements } = options;
  const screen = container.querySelector<HTMLDivElement>(
    `#${elements.screenId}`,
  )!;
  const scoreEl = container.querySelector<HTMLDivElement>(
    `#${elements.scoreId}`,
  )!;
  const timerEl = container.querySelector<HTMLElement>(`#${elements.timerId}`)!;
  const influenceValueEl = container.querySelector<HTMLElement>(
    `#${elements.influenceValueId}`,
  )!;
  const canvas = container.querySelector<HTMLCanvasElement>(
    `#${elements.canvasId}`,
  )!;
  const ctx = canvas.getContext("2d")!;

  const canvasSize = setupResizableCanvas(canvas);
  let cssW = 0;
  let cssH = 0;
  function resize(): void {
    canvasSize.resize();
    ({ cssW, cssH } = canvasSize.getSize());
  }
  const scene = createPressConferenceScene(ctx, canvasSize.getSize);

  let state = options.createState();
  let wasGameOver = false;
  let endPressedAt: number | null = null;

  const endFontSize = Math.round((52 / 140) * END_BTN_H);
  let cachedEndBtnWidth: number | null = null;
  function getEndButtonRect(): { x: number; y: number; w: number; h: number } {
    if (cachedEndBtnWidth === null) {
      ctx.font = `900 ${endFontSize}px "Fredoka", system-ui, sans-serif`;
      const referenceMargin =
        BTN_REFERENCE_W - ctx.measureText(BTN_REFERENCE_LABEL).width;
      cachedEndBtnWidth = ctx.measureText(END_LABEL).width + referenceMargin;
    }
    const w = cachedEndBtnWidth;
    const podium = scene.getPodiumRect();
    const cx = podium ? podium.x + podium.w / 2 : cssW / 2;
    const cy = podium
      ? podium.y + podium.h + END_BTN_MARGIN_BELOW_PODIUM + END_BTN_H / 2
      : cssH - END_BTN_H / 2 - END_BTN_BOTTOM_MARGIN;
    return { x: cx - w / 2, y: cy - END_BTN_H / 2, w, h: END_BTN_H };
  }

  function drawTapToBegin(now: number): void {
    if (state.started) return;
    ctx.save();
    ctx.translate(cssW / 2, state.headY - TAP_TO_BEGIN_LIFT_PX);
    ctx.rotate(getWiggleRotation(now));
    ctx.font = TAP_TO_BEGIN_FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    drawCartoonText(
      ctx,
      TAP_TO_BEGIN_LABEL,
      0,
      0,
      COLOR.white,
      COLOR.black,
      TAP_TO_BEGIN_STROKE_WIDTH,
    );
    ctx.restore();
  }

  function drawEndButton(now: number): void {
    const { x, y, w, h } = getEndButtonRect();
    const cx = x + w / 2;
    const cy = y + h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    const scale = computePressBounceScale(endPressedAt, now);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
    drawPill(ctx, x, y, w, h, COLOR.disabledGray, true, true, (40 / 140) * h);
    ctx.font = `900 ${endFontSize}px "Fredoka", system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    drawCartoonText(ctx, END_LABEL, cx, cy);
    ctx.restore();
  }

  function render(now: number): void {
    if (cssW <= 0 || cssH <= 0) return;
    ctx.clearRect(0, 0, cssW, cssH);
    // Date.now()-based, not the rAF-supplied now above — triggerScreenShake
    // stamps with Date.now() too (see gameCanvas.ts's own matching call), and
    // diffing across two different clocks breaks the shake entirely. Reads
    // the shared/global shake state so any still-playing shake (e.g. a crit
    // that just landed right before this dialog opened) carries over here too
    ctx.save();
    const shake = getScreenShakeOffset(Date.now());
    ctx.translate(shake.x, shake.y);
    const headX = cssW / 2 - HEAD_X_OFFSET_FROM_CENTER;
    scene.drawAudience();
    scene.drawGrid(headX, state.worldX);
    scene.drawFloor();
    options.renderGraph(ctx, state, headX, now);
    const points = computeSmoothedTrailPoints(
      state,
      TRAIL_SAMPLE_DX,
      TRAIL_SMOOTHING_RADIUS,
      TAIL_MAX_ANGLE_TAN,
      headX,
      state.headY,
    );
    drawTrailLine(ctx, points, LINE_WIDTH, LINE_COLOR);
    drawTrailHead(ctx, headX, state.headY, HEAD_RADIUS, LINE_COLOR);
    drawTapToBegin(now);
    if (state.gameOver) drawEndButton(now);
    scene.drawPodium(now);
    ctx.restore();

    const audienceTopY = scene.getAudienceTopY();
    scoreEl.style.bottom = `${cssH - audienceTopY + LABEL_ABOVE_AUDIENCE_OFFSET + SCORE_LABELS_EXTRA_LIFT_PX}px`;
    timerEl.textContent = formatElapsedSeconds(state.survivedMs);
    influenceValueEl.textContent = `${state.marketInfluencePercent >= 0 ? "+" : ""}${state.marketInfluencePercent.toFixed(2)}% ▲`;
    options.onLayout?.(state, cssH, audienceTopY);
  }

  const rafLoop = createRafLoop((now, dtMs) => {
    if (state.running && state.started) {
      options.step(state, dtMs, cssW, cssH, scene.getFloorTopY, ctx);
      if (state.gameOver && !wasGameOver) {
        wasGameOver = true;
        playExplosion();
        options.onGameOver(state, close);
      }
    }
    render(now);
  });

  canvas.addEventListener("pointerdown", () => {
    if (state.gameOver) return; // end button is handled on click below
    state.started = true;
    state.holding = true;
    options.onTap(state);
  });
  window.addEventListener("pointerup", () => {
    state.holding = false;
  });
  window.addEventListener("pointercancel", () => {
    state.holding = false;
  });

  // the end button is deliberately handled on "click", not "pointerdown":
  // this screen sits on top of the boost menu dialog, and closing it
  // (screen.hidden = true) synchronously inside a pointerdown handler
  // reveals that dialog's own backdrop underneath the pointer BEFORE the
  // browser's compatibility "click" event for this same tap fires — which
  // then lands on that now-visible backdrop instead, closing the boost menu
  // too. Reacting on "click" instead means this tap's one and only click
  // event is consumed right here, with nothing left over to fall through
  canvas.addEventListener("click", (event) => {
    if (!state.gameOver) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const btn = getEndButtonRect();
    if (x < btn.x || x > btn.x + btn.w || y < btn.y || y > btn.y + btn.h)
      return;
    endPressedAt = performance.now();
    close();
  });

  function open(): void {
    state = options.createState();
    wasGameOver = false;
    screen.hidden = false;
    playSwoosh();
    resize();
    const startY = cssH / 2 - HEAD_START_Y_LIFT_PX;
    state.headY = startY;
    state.tailY = startY;
    state.trail = new Array(computeMaxTrailLength(cssW)).fill(startY);
    options.onOpen?.(state, cssW, cssH, scene.getFloorTopY);
    rafLoop.start();
  }

  function close(): void {
    rafLoop.stop();
    screen.hidden = true;
    playSwoosh();
    options.onClose?.();
  }

  return { open, close };
}
