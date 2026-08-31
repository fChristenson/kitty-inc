import { playSwoosh, playBloop, playExplosion, playSold } from "../../sound";
import { drawPill, drawCartoonText } from "../../utils";
import { COLOR } from "../../palette";
import { triggerScreenShake, getScreenShakeOffset } from "../../screenShake";
import {
  loadCoinBurstImages,
  spawnCoinBurstAt,
  drawActiveCoinBursts,
} from "../../coinBurst";

// physics constants for the line's head — same "flappy bird" feel: constant
// downward gravity, a fixed upward kick on every flap, no in-between speeds.
// FLAP_VELOCITY_PX_S is deliberately capped at -SCROLL_SPEED_PX_S: a trail
// sample lands every TRAIL_SAMPLE_DX/SCROLL_SPEED_PX_S seconds, so keeping
// |velocityY| at or below SCROLL_SPEED_PX_S keeps each sample-to-sample rise
// within a 45° angle on its own, instead of relying on the clamp below to
// visibly correct it after the fact
const GRAVITY_PX_S2 = 1400;
const FLAP_VELOCITY_PX_S = -160;
// gravity accelerates the fall up to this same speed and no further (see
// step) — the same 45°-equivalent cap as FLAP_VELOCITY_PX_S, just downward,
// so an unbroken fall settles into a constant 45° descent instead of
// accelerating past it
const TERMINAL_FALL_VELOCITY_PX_S = 160;
// each flap eases the head's velocity toward FLAP_VELOCITY_PX_S over this
// fixed duration instead of snapping straight to it (see step) — a fixed
// wall-clock duration, not a threshold-based "close enough" check: gravity
// keeps pulling the whole time too, and racing an open-ended ease against
// gravity forever could settle into an equilibrium short of the actual
// target, leaving it permanently "stuck" easing and never handing control
// back to gravity (the head just drifting up forever)
const FLAP_RAMP_DURATION_MS = 150;
// the world (grid + trail) scrolls left under a fixed head X, giving the
// illusion of the line constantly moving right, same convention endless
// runners use instead of actually moving the head across a finite canvas
const SCROLL_SPEED_PX_S = 160;
const GRID_CELL_PX = 48;
const HEAD_X_FRACTION = 0.28;
// one trail point per this many px of world scroll — independent of frame rate,
// so the line's shape looks the same on any refresh rate
const TRAIL_SAMPLE_DX = 6;
const LINE_WIDTH = 4;
// how many samples on either side of a point get averaged into it before curve
// fitting (see smoothTrailY) — on top of the quadratic through-midpoints curve
// itself, this is what keeps the tail smooth instead of tracking every small
// frame-to-frame velocity change as a visible kink
const TRAIL_SMOOTHING_RADIUS = 3;
// the tail samples this trailing, eased position instead of the head's own
// exact one — higher = more delay before the tail catches up to a sudden move,
// giving the whole line a smoother, whip-like follow instead of tracing the
// head's own sharp changes in direction 1:1
const TAIL_LAG_RATE = 10;
// every point behind the head is clamped to at most this many degrees off the
// x axis from its neighbor (see drawLine), recomputed fresh every frame from
// the stable raw trail data — no gradient/falloff, no persisted "frozen"
// state, just a hard cap applied uniformly along the whole tail
const TAIL_MAX_ANGLE_DEG = 45;
const TAIL_MAX_ANGLE_TAN = Math.tan((TAIL_MAX_ANGLE_DEG * Math.PI) / 180);

// brief cat-themed market headlines, floating right-to-left across the
// screen like obstacles — green/white for good ones (a coin burst + coin sfx
// on hit), red/white for bad ones (an explosion + screen shake on hit)
const GOOD_MARKET_EVENTS = [
  "Purrfect Earnings!",
  "Meow-nificent Quarter",
  "Whisker Rally",
  "Catnip Boom",
  "Nine Lives Profit",
  "Paw-sitive Outlook",
  "Kitten IPO Hype",
  "Feline Bull Run",
];
const BAD_MARKET_EVENTS = [
  "Hairball Crash",
  "Meow-ket Meltdown",
  "Litter Box Losses",
  "Copycat Selloff",
  "Hiss-terical Panic",
  "Claw-Back Losses",
  "Scratched Earnings",
  "Fur-midable Downturn",
];
const EVENT_FONT = '700 20px "Fredoka", system-ui, sans-serif';
const EVENT_STROKE_WIDTH = 4;
const EVENT_HIT_HEIGHT = 28; // vertical tolerance for a head/event collision
const EVENT_SPAWN_INTERVAL_MIN_MS = 1400;
const EVENT_SPAWN_INTERVAL_MAX_MS = 2600;
// spawnCoinBurstAt's own default scale (1) is sized for a full building-width
// canvas; this screen is much smaller, so its own bursts get shrunk down too
const COIN_BURST_SCALE = 0.35;

// drawn straight onto this screen's own canvas with the exact same utils.ts
// helpers floors/upgradeButton's real "Sale" button uses (drawPill/
// drawCartoonText), instead of a separate DOM element re-approximating that
// look in CSS — same 330:140 proportions (drawPill's own ring-width/radius
// percentages of height do the rest, whatever this button's own size is)
const SALES_LABEL = "Project Sales";
const END_LABEL = "End press conference";
// the reference button's own label/width — "Project Sales" is longer than
// "Sale", so the button widens to fit it (see getSalesButtonWidth) instead of
// shrinking the font down to fit a same fixed width, but keeps this exact same
// left+right margin around its own (longer) label
const SALES_REFERENCE_LABEL = "Sale";
const SALES_REFERENCE_BTN_W = 90;
const SALES_BTN_H = (SALES_REFERENCE_BTN_W * 140) / 330;
const SALES_BTN_BOTTOM_MARGIN = 28;
// identical to floors/upgradeButton's own WIGGLE_PERIOD_MS/WIGGLE_MAX_RADIANS —
// this button plays that same wiggle continuously instead of only during a
// timed sale
const WIGGLE_PERIOD_MS = 260;
const WIGGLE_MAX_RADIANS = 0.08;
// identical to floors/upgradeButton's own PRESS_* press-bounce constants
const PRESS_DURATION_MS = 450;
const PRESS_AMPLITUDE = 0.18;
const PRESS_DECAY = 9;
const PRESS_FREQUENCY = 26;

interface MarketEvent {
  text: string;
  good: boolean;
  x: number;
  y: number;
  width: number; // measured once at spawn time
}

interface GameState {
  headY: number;
  velocityY: number;
  tailY: number; // eased toward headY every step (see TAIL_LAG_RATE), sampled into trail instead of headY directly
  trail: number[]; // y-position sampled every TRAIL_SAMPLE_DX px of world scroll, oldest first
  flapRampRemainingMs: number; // > 0 while easing toward FLAP_VELOCITY_PX_S (see FLAP_RAMP_DURATION_MS); always counts down to exactly 0
  flapRampFromVelocity: number; // velocityY at the moment the current ramp began, lerped from here toward FLAP_VELOCITY_PX_S
  worldX: number;
  survivedMs: number;
  started: boolean; // gravity/scroll/timer stay frozen until the first press
  running: boolean;
  gameOver: boolean;
  marketEvents: MarketEvent[];
  nextEventInMs: number; // counts down to the next spawn (see EVENT_SPAWN_INTERVAL_*)
}

export function createPressConferenceGameMarkup(): string {
  return `
    <div class="press-conference-game" id="press-conference-game" hidden>
      <div class="press-conference-game__header">
        <h2>Press Conference</h2>
      </div>
      <div class="press-conference-game__score" id="press-conference-game-score">0.0s</div>
      <canvas class="press-conference-game__canvas" id="press-conference-game-canvas"></canvas>
    </div>
  `;
}

export interface PressConferenceGame {
  open: () => void;
  close: () => void;
}

export function wirePressConferenceGame(
  container: HTMLElement,
): PressConferenceGame {
  const screen = container.querySelector<HTMLDivElement>(
    "#press-conference-game",
  )!;
  const scoreEl = container.querySelector<HTMLDivElement>(
    "#press-conference-game-score",
  )!;
  const canvas = container.querySelector<HTMLCanvasElement>(
    "#press-conference-game-canvas",
  )!;
  const ctx = canvas.getContext("2d")!;

  // same shared sprites/draw math floors/coins's own burst uses (see
  // ../../coinBurst) — loaded independently here since this screen has no
  // Floor to hang that module's own version off of
  loadCoinBurstImages();

  let cssW = 0;
  let cssH = 0;

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    cssW = rect.width;
    cssH = rect.height;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(canvas);

  // shared with the initial trail fill below, so the trail is never shorter
  // than what a full canvas width of samples would actually need
  function getMaxTrailLength(): number {
    return Math.ceil(cssW / TRAIL_SAMPLE_DX) + 2;
  }

  function randomEventDelayMs(): number {
    return (
      EVENT_SPAWN_INTERVAL_MIN_MS +
      Math.random() *
        (EVENT_SPAWN_INTERVAL_MAX_MS - EVENT_SPAWN_INTERVAL_MIN_MS)
    );
  }

  // spawns just off the right edge, drifting left like everything else in
  // this world — a random pick from the good/bad cat-headline lists, at a
  // random height that leaves room for the sales button anchored at the bottom
  function spawnMarketEvent(): void {
    const good = Math.random() < 0.5;
    const list = good ? GOOD_MARKET_EVENTS : BAD_MARKET_EVENTS;
    const text = list[Math.floor(Math.random() * list.length)];
    ctx.font = EVENT_FONT;
    const width = ctx.measureText(text).width;
    const topMargin = 30;
    const bottomMargin = SALES_BTN_H + SALES_BTN_BOTTOM_MARGIN + 30;
    const y =
      topMargin + Math.random() * Math.max(1, cssH - topMargin - bottomMargin);
    state.marketEvents.push({ text, good, x: cssW + width / 2, y, width });
  }

  function freshState(): GameState {
    const startY = cssH / 2 || 200;
    return {
      headY: startY,
      velocityY: 0,
      tailY: startY,
      trail: [],
      flapRampRemainingMs: 0,
      flapRampFromVelocity: 0,
      worldX: 0,
      survivedMs: 0,
      started: false,
      running: true,
      gameOver: false,
      marketEvents: [],
      nextEventInMs: randomEventDelayMs(),
    };
  }
  let state = freshState();

  // identical to floors/upgradeButton's own triggerButtonPress/pressScale —
  // recorded on every press, read back every draw to drive the same
  // squash-then-springy-overshoot bounce
  let salesPressedAt: number | null = null;

  function salesPressScale(now: number): number {
    if (salesPressedAt === null) return 1;
    const elapsedMs = now - salesPressedAt;
    if (elapsedMs >= PRESS_DURATION_MS) return 1;
    const t = elapsedMs / 1000;
    return (
      1 -
      PRESS_AMPLITUDE *
        Math.exp(-PRESS_DECAY * t) *
        Math.cos(PRESS_FREQUENCY * t)
    );
  }

  // the height-proportional font size "Sale" itself uses (52/140 of BTN_H),
  // and each label's own button width grown just enough to give it, set in
  // that same font, the exact same left+right margin "Sale" gets in its own
  // SALES_REFERENCE_BTN_W-wide button — computed once per label and cached,
  // since neither the font nor any label ever changes
  const salesFontSize = Math.round((52 / 140) * SALES_BTN_H);
  const cachedBtnWidths = new Map<string, number>();
  function getButtonWidth(label: string): number {
    const cached = cachedBtnWidths.get(label);
    if (cached !== undefined) return cached;
    ctx.font = `900 ${salesFontSize}px "Fredoka", system-ui, sans-serif`;
    const referenceMargin =
      SALES_REFERENCE_BTN_W - ctx.measureText(SALES_REFERENCE_LABEL).width;
    const width = ctx.measureText(label).width + referenceMargin;
    cachedBtnWidths.set(label, width);
    return width;
  }

  function getSalesButtonLabel(): string {
    return state.gameOver ? END_LABEL : SALES_LABEL;
  }

  function getSalesButtonRect(): {
    x: number;
    y: number;
    w: number;
    h: number;
  } {
    const w = getButtonWidth(getSalesButtonLabel());
    const cx = cssW / 2;
    const cy = cssH - SALES_BTN_H / 2 - SALES_BTN_BOTTOM_MARGIN;
    return { x: cx - w / 2, y: cy - SALES_BTN_H / 2, w, h: SALES_BTN_H };
  }

  function flap(): void {
    state.started = true;
    // ramps from whatever velocity it actually has right now (not always 0),
    // so a press mid-fall (or a second press mid-ramp) blends smoothly
    // instead of snapping
    state.flapRampFromVelocity = state.velocityY;
    state.flapRampRemainingMs = FLAP_RAMP_DURATION_MS;
    playBloop();
  }

  function formatScore(ms: number): string {
    return `${(ms / 1000).toFixed(1)}s`;
  }

  function drawGrid(headX: number): void {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    const scrollOffset = state.worldX % GRID_CELL_PX;
    ctx.beginPath();
    for (let x = headX - scrollOffset; x < cssW; x += GRID_CELL_PX) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, cssH);
    }
    for (
      let x = headX - scrollOffset - GRID_CELL_PX;
      x > 0;
      x -= GRID_CELL_PX
    ) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, cssH);
    }
    for (let y = 0; y < cssH; y += GRID_CELL_PX) {
      ctx.moveTo(0, y);
      ctx.lineTo(cssW, y);
    }
    ctx.stroke();
  }

  function drawLine(headX: number): void {
    if (state.trail.length === 0) return;
    const partialDx = state.worldX % TRAIL_SAMPLE_DX;
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    const startX =
      headX - (state.trail.length - 1) * TRAIL_SAMPLE_DX - partialDx;
    // light neighbor-averaging over the raw samples (state.trail, never
    // itself smoothed) — recomputed fresh every frame straight from that
    // stable data, so it can never drift or compound across frames the way
    // averaging an already-smoothed result repeatedly would
    const smoothed = state.trail.map((_, i) => {
      let sum = 0;
      let count = 0;
      for (
        let j = Math.max(0, i - TRAIL_SMOOTHING_RADIUS);
        j <= Math.min(state.trail.length - 1, i + TRAIL_SMOOTHING_RADIUS);
        j++
      ) {
        sum += state.trail[j];
        count++;
      }
      return sum / count;
    });
    const points = smoothed.map((y, i) => ({
      x: startX + i * TRAIL_SAMPLE_DX,
      y,
    }));
    points.push({ x: headX, y: state.headY });
    // every point behind the head is clamped to at most TAIL_MAX_ANGLE_DEG
    // off the x axis from its neighbor, walking backward from the head —
    // recomputed fresh from the stable smoothed array above every frame, so
    // it can never drift or compound across frames either
    for (let i = points.length - 1; i > 0; i--) {
      const dx = points[i].x - points[i - 1].x;
      const maxDy = dx * TAIL_MAX_ANGLE_TAN;
      const dy = points[i - 1].y - points[i].y;
      if (dy > maxDy) points[i - 1].y = points[i].y + maxDy;
      else if (dy < -maxDy) points[i - 1].y = points[i].y - maxDy;
    }
    // through-point quadratic smoothing: each curve ends at the midpoint between
    // two samples (a smooth point every segment shares with its neighbor), with
    // the actual sample as that curve's control point — straight lineTo segments
    // between samples this close together read as visibly jagged/kinked
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 1; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2;
      const midY = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  }

  function drawHead(headX: number): void {
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.arc(headX, state.headY, LINE_WIDTH / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // good events read as the same green/white the HUD's own total-income text
  // uses; bad ones swap in a mean red fill, same white stroke either way
  function drawMarketEvents(): void {
    ctx.font = EVENT_FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const event of state.marketEvents) {
      drawCartoonText(
        ctx,
        event.text,
        event.x,
        event.y,
        event.good ? COLOR.moneyGreen : COLOR.red,
        COLOR.white,
        EVENT_STROKE_WIDTH,
      );
    }
  }

  // straight reuse of the exact same drawPill/drawCartoonText calls
  // floors/upgradeButton's own Sale-state button makes, at this button's own
  // size — same rotate-then-scale-around-center order that button uses while
  // playing (wiggle playing continuously instead of gated behind
  // isSaleActive); once the game's over it becomes a still "End press
  // conference" button instead, no wiggle, just the press-bounce feedback
  function drawSalesButton(now: number): void {
    const label = getSalesButtonLabel();
    const { x, y, w, h } = getSalesButtonRect();
    const cx = x + w / 2;
    const cy = y + h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    if (!state.gameOver) {
      ctx.rotate(
        Math.sin((now / WIGGLE_PERIOD_MS) * Math.PI * 2) * WIGGLE_MAX_RADIANS,
      );
    }
    const scale = salesPressScale(now);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
    drawPill(
      ctx,
      x,
      y,
      w,
      h,
      state.gameOver ? COLOR.disabledGray : COLOR.amber,
      true,
      true,
      (40 / 140) * h,
    );
    ctx.font = `900 ${salesFontSize}px "Fredoka", system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    drawCartoonText(ctx, label, cx, cy);
    ctx.restore();
  }

  function step(dtMs: number): void {
    if (!state.running || !state.started) return;
    const dt = dtMs / 1000;
    if (state.flapRampRemainingMs > 0) {
      // fixed-duration smoothstep, not an open-ended chase — always finishes
      // in exactly FLAP_RAMP_DURATION_MS regardless of gravity's own
      // simultaneous pull, so control always hands back to gravity below
      state.flapRampRemainingMs = Math.max(0, state.flapRampRemainingMs - dtMs);
      const t = 1 - state.flapRampRemainingMs / FLAP_RAMP_DURATION_MS;
      const eased = t * t * (3 - 2 * t);
      state.velocityY =
        state.flapRampFromVelocity +
        (FLAP_VELOCITY_PX_S - state.flapRampFromVelocity) * eased;
    }
    state.velocityY += GRAVITY_PX_S2 * dt;
    state.velocityY = Math.min(state.velocityY, TERMINAL_FALL_VELOCITY_PX_S);
    state.headY += state.velocityY * dt;
    state.survivedMs += dtMs;

    // eases toward the head's own position instead of snapping straight to it,
    // so the tail visibly lags a beat behind every sudden flap/fall instead of
    // tracking it 1:1
    state.tailY +=
      (state.headY - state.tailY) * (1 - Math.exp(-TAIL_LAG_RATE * dt));

    const prevWorldX = state.worldX;
    state.worldX += SCROLL_SPEED_PX_S * dt;
    const samplesDue =
      Math.floor(state.worldX / TRAIL_SAMPLE_DX) -
      Math.floor(prevWorldX / TRAIL_SAMPLE_DX);
    for (let i = 0; i < samplesDue; i++) state.trail.push(state.tailY);
    const maxTrailLength = getMaxTrailLength();
    if (state.trail.length > maxTrailLength) {
      state.trail.splice(0, state.trail.length - maxTrailLength);
    }

    if (state.headY <= 0 || state.headY >= cssH) {
      state.headY = Math.max(0, Math.min(cssH, state.headY));
      state.running = false;
      state.gameOver = true;
      playExplosion();
    }

    state.nextEventInMs -= dtMs;
    if (state.nextEventInMs <= 0) {
      spawnMarketEvent();
      state.nextEventInMs = randomEventDelayMs();
    }
    const headX = cssW * HEAD_X_FRACTION;
    for (let i = state.marketEvents.length - 1; i >= 0; i--) {
      const event = state.marketEvents[i];
      event.x -= SCROLL_SPEED_PX_S * dt;
      const withinX = Math.abs(event.x - headX) < event.width / 2 + LINE_WIDTH;
      const withinY = Math.abs(event.y - state.headY) < EVENT_HIT_HEIGHT / 2;
      if (withinX && withinY) {
        if (event.good) {
          spawnCoinBurstAt(event.x, event.y, COIN_BURST_SCALE);
          // the buy sfx, not the usual coin-drop one, just for this hit
          playSold();
        } else {
          playExplosion();
          triggerScreenShake();
        }
        state.marketEvents.splice(i, 1);
        continue;
      }
      if (event.x < -event.width / 2) state.marketEvents.splice(i, 1);
    }
  }

  function render(now: number): void {
    ctx.clearRect(0, 0, cssW, cssH);
    // Date.now()-based, not the rAF-supplied now above — triggerScreenShake
    // stamps with Date.now() too (see gameCanvas.ts's own matching call),
    // and diffing across two different clocks broke the shake entirely
    const shake = getScreenShakeOffset(Date.now());
    ctx.save();
    ctx.translate(shake.x, shake.y);
    const headX = cssW * HEAD_X_FRACTION;
    drawGrid(headX);
    drawMarketEvents();
    drawLine(headX);
    drawHead(headX);
    drawActiveCoinBursts(ctx, now);
    drawSalesButton(now);
    ctx.restore();
    scoreEl.textContent = formatScore(state.survivedMs);
  }

  let rafId: number | null = null;
  let lastFrameTime = 0;
  function frame(now: number): void {
    const dtMs = lastFrameTime ? Math.min(now - lastFrameTime, 50) : 0;
    lastFrameTime = now;
    step(dtMs);
    render(now);
    rafId = requestAnimationFrame(frame);
  }

  canvas.addEventListener("pointerdown", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const btn = getSalesButtonRect();
    if (x < btn.x || x > btn.x + btn.w || y < btn.y || y > btn.y + btn.h)
      return;
    salesPressedAt = performance.now();
    if (state.gameOver) close();
    else flap();
  });

  function open(): void {
    state = freshState();
    lastFrameTime = 0;
    screen.hidden = false;
    playSwoosh();
    resize();
    state.headY = cssH / 2;
    state.tailY = cssH / 2;
    // a full flat line behind the head from frame one, instead of one that only
    // grows in (and so sits bunched up right under the head) over the first
    // couple seconds of play
    state.trail = new Array(getMaxTrailLength()).fill(state.headY);
    rafId = requestAnimationFrame(frame);
  }

  function close(): void {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    screen.hidden = true;
    playSwoosh();
  }

  return { open, close };
}
