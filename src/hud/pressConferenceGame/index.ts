import { playSwoosh, playBloop, playExplosion, playSold } from "../../sound";
import { drawPill, drawCartoonText, formatPrice } from "../../utils";
import { COLOR } from "../../palette";
import { triggerScreenShake, getScreenShakeOffset } from "../../screenShake";
import {
  loadCoinBurstImages,
  spawnCoinBurstAt,
  drawActiveCoinBursts,
} from "../../coinBurst";
import {
  spendFromAllCompanies,
  getAllCompaniesTotalIncome,
} from "../../totalIncome";
import { addMarketInfluencePercent } from "../corporationBoostMenu";

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
// on hit), red/white for bad ones (an explosion + screen shake on hit).
// Generated dynamically each spawn (see generateMarketEventText) instead of
// picked from a fixed phrase list: one cat-themed word plus one market-mood
// word (positive for good events, negative for bad), so the same handful of
// small pools keeps producing fresh-feeling combinations
const CAT_WORDS = [
  "Purr",
  "Whisker",
  "Meow",
  "Catnip",
  "Kitten",
  "Feline",
  "Paw",
  "Hairball",
  "Fur",
  "Tabby",
  "Nine Lives",
  "Litter Box",
];
const POSITIVE_MARKET_WORDS = [
  "Boom",
  "Rally",
  "Surge",
  "Spike",
  "Bull Run",
  "Soar",
  "Profit",
  "Hype",
];
const NEGATIVE_MARKET_WORDS = [
  "Crash",
  "Meltdown",
  "Selloff",
  "Slump",
  "Panic",
  "Plunge",
  "Losses",
  "Downturn",
];
const EVENT_FONT = '700 20px "Fredoka", system-ui, sans-serif';
const EVENT_STROKE_WIDTH = 4;
const EVENT_HIT_HEIGHT = 28; // vertical tolerance for a head/event collision
const EVENT_SPAWN_INTERVAL_MIN_MS = 1400;
const EVENT_SPAWN_INTERVAL_MAX_MS = 2600;
// a special bad event, substituted in for a normal one MARKET_CRASH_CHANCE of
// the time — fatter (bigger, heavier weight, thicker stroke) and vibrates the
// same WIGGLE_PERIOD_MS/WIGGLE_MAX_RADIANS wiggle the sales button plays.
// Hitting it ends the round outright, same as hitting a bound, instead of the
// usual bad-hit explosion+shake+burn-rate penalty
const MARKET_CRASH_TEXT = "Market Crash";
const MARKET_CRASH_CHANCE = 0.12;
const MARKET_CRASH_FONT = '900 30px "Fredoka", system-ui, sans-serif';
const MARKET_CRASH_STROKE_WIDTH = 6;
// difficulty ramp: every DIFFICULTY_INTERVAL_MS survived, bad events get 25%
// more likely (relative to good's own unchanged odds), events spawn more
// densely (the interval between spawns shrinks), and every event moves
// EVENT_SPEED_GROWTH_PER_TIER faster — all compounding each tier
const DIFFICULTY_INTERVAL_MS = 10_000;
const BAD_SPAWN_WEIGHT_GROWTH_PER_TIER = 1.25;
const EVENT_SPEED_GROWTH_PER_TIER = 1.15;
const SPAWN_INTERVAL_SHRINK_PER_TIER = 0.8; // <1: shrinks the gap between spawns, so more text spawns overall
const MIN_SPAWN_INTERVAL_FLOOR_MS = 350; // never crowds spawns closer together than this regardless of tier
// spawnCoinBurstAt's own default scale (1) is sized for a full building-width
// canvas; this screen is much smaller, so its own bursts get shrunk down too
const COIN_BURST_SCALE = 0.35;

// the combined total income across every corporation is this game's own
// "fuel": every second it's played burns BASE_BURN_PERCENT_PER_SECOND of
// whatever that total currently is (see step's spendFromAllCompanies call),
// scaling by wealth instead of a fixed $ amount so this stays meaningful at
// any point in the game's progression. Running out (spendFromAllCompanies
// failing) ends the round the same way hitting a bound does
const BASE_BURN_PERCENT_PER_SECOND = 0.004;
// a wealth-proportional burn alone would just decay toward zero forever
// without ever actually running out, letting a deep-pocketed player camp here
// indefinitely — so the burn % itself also compounds every DIFFICULTY_INTERVAL_MS
// tier, the same way the other difficulty knobs do, guaranteeing the cost
// eventually outpaces any reserve no matter how large
const BURN_PERCENT_GROWTH_PER_TIER = 1.35;
// "Market Influence %" (see hud/corporationBoostMenu's own persisted stat) —
// flat rates, not tied to the burn rate or anything else about the round: this
// much per second just for surviving, plus a flat instant bump/cut per hit
const AMBIENT_INFLUENCE_PERCENT_PER_SECOND = 0.01;
const GOOD_HIT_INFLUENCE_PERCENT = 0.05;
const BAD_HIT_INFLUENCE_PERCENT = 0.05;

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
  isCrash: boolean; // the special "Market Crash" event (see MARKET_CRASH_CHANCE); always bad, but ends the round on hit instead of the usual bad-hit penalty
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
  totalExpensesThisSession: number; // cumulative $ actually burned so far this round; only ever grows
  marketInfluencePercent: number; // this session's own accrued total, for display only (the persisted stat lives in corporationBoostMenu)
}

export function createPressConferenceGameMarkup(): string {
  return `
    <div class="press-conference-game" id="press-conference-game" hidden>
      <div class="press-conference-game__header">
        <h2>Press Conference</h2>
      </div>
      <div class="press-conference-game__score" id="press-conference-game-score">
        <div id="press-conference-game-timer">0.0s</div>
      </div>
      <div class="press-conference-game__equation" id="press-conference-game-equation">
        <span class="press-conference-game__money press-conference-game__money--green" id="press-conference-game-total"></span>
        <span>-</span>
        <span class="press-conference-game__money press-conference-game__money--red" id="press-conference-game-expenses"></span>
        <span>=</span>
        <span class="press-conference-game__money press-conference-game__money--green" id="press-conference-game-remaining"></span>
      </div>
      <div class="press-conference-game__influence" id="press-conference-game-influence">
        <span class="press-conference-game__influence-label">Market Influence</span>
        <span id="press-conference-game-influence-value">+0.00% ▲</span>
      </div>
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
  onClose?: () => void,
): PressConferenceGame {
  const screen = container.querySelector<HTMLDivElement>(
    "#press-conference-game",
  )!;
  const timerEl = container.querySelector<HTMLSpanElement>(
    "#press-conference-game-timer",
  )!;
  const totalEl = container.querySelector<HTMLSpanElement>(
    "#press-conference-game-total",
  )!;
  const expensesEl = container.querySelector<HTMLSpanElement>(
    "#press-conference-game-expenses",
  )!;
  const remainingEl = container.querySelector<HTMLSpanElement>(
    "#press-conference-game-remaining",
  )!;
  const influenceValueEl = container.querySelector<HTMLSpanElement>(
    "#press-conference-game-influence-value",
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

  // takes the tier explicitly (rather than reading state.survivedMs itself)
  // so it's safe to call from freshState() too, before `state` exists yet —
  // shrinks toward MIN_SPAWN_INTERVAL_FLOOR_MS each tier, so more text spawns
  // overall as the game goes on
  function randomEventDelayMs(tier: number): number {
    const shrink = SPAWN_INTERVAL_SHRINK_PER_TIER ** tier;
    const min = Math.max(
      MIN_SPAWN_INTERVAL_FLOOR_MS,
      EVENT_SPAWN_INTERVAL_MIN_MS * shrink,
    );
    const max = Math.max(min + 200, EVENT_SPAWN_INTERVAL_MAX_MS * shrink);
    return min + Math.random() * (max - min);
  }

  // how many full DIFFICULTY_INTERVAL_MS spans have been survived so far —
  // the bad-event odds, spawn density, and every event's own drift speed all
  // scale off this
  function getDifficultyTier(): number {
    return Math.floor(state.survivedMs / DIFFICULTY_INTERVAL_MS);
  }

  // one cat-themed word plus one market-mood word (see CAT_WORDS/
  // POSITIVE_MARKET_WORDS/NEGATIVE_MARKET_WORDS above), instead of a fixed
  // pre-written phrase — every spawn combines a fresh random pair
  function generateMarketEventText(good: boolean): string {
    const catWord = CAT_WORDS[Math.floor(Math.random() * CAT_WORDS.length)];
    const moodWords = good ? POSITIVE_MARKET_WORDS : NEGATIVE_MARKET_WORDS;
    const moodWord = moodWords[Math.floor(Math.random() * moodWords.length)];
    return `${catWord} ${moodWord}`;
  }

  // spawns just off the right edge, drifting left like everything else in
  // this world — a fresh cat-themed headline (see generateMarketEventText),
  // at a random height that leaves room for the sales button anchored at the
  // bottom
  function spawnMarketEvent(): void {
    // good keeps flat 1:1 odds; bad's own relative weight compounds each
    // difficulty tier, so it crowds out good more and more over time
    const badWeight = BAD_SPAWN_WEIGHT_GROWTH_PER_TIER ** getDifficultyTier();
    const good = Math.random() >= badWeight / (1 + badWeight);
    // a bad spawn has its own further chance of being the special Market
    // Crash event instead of a normal bad headline
    const isCrash = !good && Math.random() < MARKET_CRASH_CHANCE;
    const text = isCrash ? MARKET_CRASH_TEXT : generateMarketEventText(good);
    ctx.font = isCrash ? MARKET_CRASH_FONT : EVENT_FONT;
    const width = ctx.measureText(text).width;
    const topMargin = 30;
    const bottomMargin = SALES_BTN_H + SALES_BTN_BOTTOM_MARGIN + 30;
    const y =
      topMargin + Math.random() * Math.max(1, cssH - topMargin - bottomMargin);
    state.marketEvents.push({
      text,
      good,
      isCrash,
      x: cssW + width / 2,
      y,
      width,
    });
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
      nextEventInMs: randomEventDelayMs(0),
      totalExpensesThisSession: 0,
      marketInfluencePercent: 0,
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
  // uses; bad ones swap in a mean red fill, same white stroke either way.
  // Market Crash gets its own fatter font/stroke and the same wiggle the
  // sales button plays continuously, to read as the one to really avoid
  function drawMarketEvents(now: number): void {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const event of state.marketEvents) {
      if (event.isCrash) {
        ctx.save();
        ctx.translate(event.x, event.y);
        ctx.rotate(
          Math.sin((now / WIGGLE_PERIOD_MS) * Math.PI * 2) * WIGGLE_MAX_RADIANS,
        );
        ctx.font = MARKET_CRASH_FONT;
        drawCartoonText(
          ctx,
          event.text,
          0,
          0,
          COLOR.red,
          COLOR.white,
          MARKET_CRASH_STROKE_WIDTH,
        );
        ctx.restore();
        continue;
      }
      ctx.font = EVENT_FONT;
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

  // stops the round and banks this session's whole accrued
  // state.marketInfluencePercent in one shot (see corporationBoostMenu's own
  // persisted stat) — the only place that ever writes to it, so a round's
  // gain/loss is never split across many small real-time persists
  function endRound(): void {
    state.running = false;
    state.gameOver = true;
    playExplosion();
    addMarketInfluencePercent(state.marketInfluencePercent);
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
      endRound();
    }

    // the combined total income across every corporation is this game's own
    // fuel: burn a wealth-proportional slice of it every second. Running dry
    // ends the round the same way hitting a bound does — checked explicitly
    // against the actual remaining total, not just left to
    // spendFromAllCompanies: a wealth-proportional cost shrinks right along
    // with a depleted total, so it'd otherwise keep "succeeding" against an
    // ever-smaller sliver of money forever instead of ever actually ending
    if (state.running) {
      const totalBefore = getAllCompaniesTotalIncome();
      // formatPrice floors to whole dollars, so anything under $1 already
      // reads as "$0" to the player — checking <= 0 here let a literal
      // fractional-cent balance (displaying as $0 but not actually 0) keep
      // the round alive forever instead of ending right when it looks empty
      if (totalBefore < 1) {
        endRound();
      } else {
        // flat rate, just for surviving — not tied to the burn cost below at
        // all (see AMBIENT_INFLUENCE_PERCENT_PER_SECOND); only ever kept in
        // session state here, banked for real once by endRound
        state.marketInfluencePercent +=
          AMBIENT_INFLUENCE_PERCENT_PER_SECOND * dt;

        const cost =
          totalBefore *
          BASE_BURN_PERCENT_PER_SECOND *
          BURN_PERCENT_GROWTH_PER_TIER ** getDifficultyTier() *
          dt;
        if (cost > 0) {
          if (spendFromAllCompanies(cost)) {
            state.totalExpensesThisSession += cost;
          } else {
            endRound();
          }
        }
      }
    }

    state.nextEventInMs -= dtMs;
    if (state.nextEventInMs <= 0) {
      spawnMarketEvent();
      state.nextEventInMs = randomEventDelayMs(getDifficultyTier());
    }
    const headX = cssW * HEAD_X_FRACTION;
    const eventSpeed =
      SCROLL_SPEED_PX_S * EVENT_SPEED_GROWTH_PER_TIER ** getDifficultyTier();
    for (let i = state.marketEvents.length - 1; i >= 0; i--) {
      const event = state.marketEvents[i];
      event.x -= eventSpeed * dt;
      const withinX = Math.abs(event.x - headX) < event.width / 2 + LINE_WIDTH;
      const withinY = Math.abs(event.y - state.headY) < EVENT_HIT_HEIGHT / 2;
      if (withinX && withinY) {
        if (event.isCrash) {
          // ends the round outright, same as hitting a bound — no burn-rate
          // penalty or shake, just the same explosion + game over
          endRound();
        } else if (event.good) {
          spawnCoinBurstAt(event.x, event.y, COIN_BURST_SCALE);
          // the buy sfx, not the usual coin-drop one, just for this hit
          playSold();
          // flat bump, on top of the flat ambient climb above — only ever
          // kept in session state here, banked for real once by endRound
          state.marketInfluencePercent += GOOD_HIT_INFLUENCE_PERCENT;
        } else {
          playExplosion();
          triggerScreenShake();
          // flat cut, same flat magnitude as a good hit's own bump above
          state.marketInfluencePercent -= BAD_HIT_INFLUENCE_PERCENT;
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
    drawMarketEvents(now);
    drawLine(headX);
    drawHead(headX);
    drawActiveCoinBursts(ctx, now);
    drawSalesButton(now);
    ctx.restore();
    timerEl.textContent = formatScore(state.survivedMs);
    const remaining = getAllCompaniesTotalIncome();
    totalEl.textContent = formatPrice(
      remaining + state.totalExpensesThisSession,
    );
    expensesEl.textContent = formatPrice(state.totalExpensesThisSession);
    remainingEl.textContent = formatPrice(remaining);
    influenceValueEl.textContent = `${state.marketInfluencePercent >= 0 ? "+" : ""}${state.marketInfluencePercent.toFixed(2)}% ▲`;
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
    // the boost menu sits open behind this screen the whole time (see
    // main.ts), so it never re-renders on its own once a round changes its
    // numbers — force it to catch up now that this screen is going away
    onClose?.();
  }

  return { open, close };
}
