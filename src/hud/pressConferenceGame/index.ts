import { playSwoosh, playBubble, playExplosion, playSold } from "../../sound";
import { drawPill, drawCartoonText, formatPrice, randomInt } from "../../utils";
import { COLOR } from "../../palette";
import { getScreenShakeOffset } from "../../screenShake";
import { getWiggleRotation } from "../../shared/wiggle";
import {
  loadCoinBurstImages,
  spawnCoinBurstAt,
  drawActiveCoinBursts,
} from "../../coinBurst";
import {
  spendFromAllCompanies,
  getAllCompaniesTotalIncome,
} from "../../totalIncome";
import {
  type BigNumber,
  ZERO,
  fromNumber,
  add,
  subtract,
  multiply,
  gt,
  lt,
} from "../../shared/bigNumber";
import { addMarketInfluencePercent } from "../corporationBoostMenu";
import { generateMarketEventText, MARKET_CRASH_TEXT } from "./marketEventText";
import { loadSprite, loadImageByName } from "../../loadAssets";

// physics constants for the line's head — same "flappy bird" feel: constant
// downward gravity, a fixed upward kick on every flap, no in-between speeds.
// the world (grid + trail) scrolls left under a fixed head X, giving the
// illusion of the line constantly moving right, same convention endless
// runners use instead of actually moving the head across a finite canvas
const SCROLL_SPEED_PX_S = 160;
// every point behind the head is clamped to at most this many degrees off the
// x axis from its neighbor (see drawLine), recomputed fresh every frame from
// the stable raw trail data — no gradient/falloff, no persisted "frozen"
// state, just a hard cap applied uniformly along the whole tail
const TAIL_MAX_ANGLE_DEG = 60;
const TAIL_MAX_ANGLE_TAN = Math.tan((TAIL_MAX_ANGLE_DEG * Math.PI) / 180);
const GRAVITY_PX_S2 = 1400;
// FLAP_VELOCITY_PX_S is deliberately capped at -SCROLL_SPEED_PX_S *
// TAIL_MAX_ANGLE_TAN: a trail sample lands every TRAIL_SAMPLE_DX/
// SCROLL_SPEED_PX_S seconds, so keeping |velocityY| at or below that cap keeps
// each sample-to-sample rise within TAIL_MAX_ANGLE_DEG on its own, instead of
// relying on the clamp below to visibly correct it after the fact. Scaled back
// to half that cap, then up 25% twice — the full-strength kick felt too strong
// to control
const FLAP_STRENGTH_SCALE = 0.78125;
const FLAP_VELOCITY_PX_S =
  -SCROLL_SPEED_PX_S * TAIL_MAX_ANGLE_TAN * FLAP_STRENGTH_SCALE;
// gravity accelerates the fall up to this same speed and no further (see
// step) — the same angle-equivalent cap as FLAP_VELOCITY_PX_S, just downward,
// so an unbroken fall settles into a constant TAIL_MAX_ANGLE_DEG descent
// instead of accelerating past it
const TERMINAL_FALL_VELOCITY_PX_S = SCROLL_SPEED_PX_S * TAIL_MAX_ANGLE_TAN;
// each flap eases the head's velocity toward FLAP_VELOCITY_PX_S over this
// fixed duration instead of snapping straight to it (see step) — a fixed
// wall-clock duration, not a threshold-based "close enough" check: gravity
// keeps pulling the whole time too, and racing an open-ended ease against
// gravity forever could settle into an equilibrium short of the actual
// target, leaving it permanently "stuck" easing and never handing control
// back to gravity (the head just drifting up forever)
const FLAP_RAMP_DURATION_MS = 150;
const GRID_CELL_PX = 48;
// the head's own fixed x, this many px left of the canvas's own horizontal center
const HEAD_X_OFFSET_FROM_CENTER = 40;
// how far above vertical mid-canvas the head/tail start each round (see
// freshState/open)
const HEAD_START_Y_LIFT_PX = 100;
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

// brief cat-themed market headlines, floating right-to-left across the
// screen like obstacles — green/white for good ones (a coin burst + coin sfx
// on hit), red/white for bad ones (an explosion + screen shake on hit). Text
// itself is generated dynamically each spawn (see ./marketEventText) instead
// of picked from a fixed phrase list
const EVENT_FONT = '700 20px "Fredoka", system-ui, sans-serif';
const EVENT_STROKE_WIDTH = 4;
const EVENT_HIT_HEIGHT = 28; // vertical tolerance for a head/event collision
const EVENT_SPAWN_INTERVAL_MIN_MS = 1400;
const EVENT_SPAWN_INTERVAL_MAX_MS = 2600;
// MARKET_CRASH_TEXT/CHANCE live in ./marketEventText alongside the normal
// text generator; the drawing-only constants below stay here
const MARKET_CRASH_FONT = '900 30px "Fredoka", system-ui, sans-serif';
const MARKET_CRASH_STROKE_WIDTH = 6;
// shown centered on screen, wiggling like the Market Crash text, until the
// first flap sets state.started (see drawTapToBegin)
const TAP_TO_BEGIN_LABEL = "Tap to begin";
const TAP_TO_BEGIN_FONT = '900 30px "Fredoka", system-ui, sans-serif';
const TAP_TO_BEGIN_STROKE_WIDTH = 6;
// how far above the head's own y this sits (see drawTapToBegin)
const TAP_TO_BEGIN_LIFT_PX = 40;
// difficulty ramp: every DIFFICULTY_INTERVAL_MS survived, the good/crash spawn
// ratio shifts further toward crash, events spawn more densely (the interval
// between spawns shrinks), and every event moves EVENT_SPEED_GROWTH_PER_TIER
// faster — all compounding each tier
const DIFFICULTY_INTERVAL_MS = 10_000;
const EVENT_SPEED_GROWTH_PER_TIER = 1.15;
const SPAWN_INTERVAL_SHRINK_PER_TIER = 0.8; // <1: shrinks the gap between spawns, so more text spawns overall
const MIN_SPAWN_INTERVAL_FLOOR_MS = 350; // never crowds spawns closer together than this regardless of tier
// spawnCoinBurstAt's own default scale (1) is sized for a full building-width
// canvas; this screen is much smaller, so its own bursts get shrunk down too
const COIN_BURST_SCALE = 0.35;

// every event is either good (a coin burst on hit) or the special Market
// Crash (ends the round on hit) — no normal "bad" event exists anymore. The
// crash ratio starts low and climbs every difficulty tier, capping out at
// MARKET_CRASH_CHANCE_MAX so a long-surviving round doesn't eventually become
// unwinnable (100% crash, no good events left to hit at all)
const MARKET_CRASH_CHANCE_START = 0.1; // 10% crash / 90% good at round start
const MARKET_CRASH_CHANCE_GROWTH_PER_TIER = 0.08;
const MARKET_CRASH_CHANCE_MAX = 0.9; // 90% crash / 10% good, never past this
// once the crash ratio has capped out, spawns ALSO get denser on top of the
// regular per-tier shrink above — a clear "everything is crashing constantly"
// late-game crunch, not just a quiet continuation of the same gradual shrink
const MAXED_CRASH_SPAWN_INTERVAL_SHRINK = 0.6;

// the combined total income across every corporation, snapshotted once when
// the round opens (see open's totalIncomeAtOpen), is this game's own "fuel":
// every second it's played burns BASE_BURN_PERCENT_PER_SECOND of whatever
// that snapshot has left (see step), scaling by wealth instead of a fixed $
// amount so this stays meaningful at any point in the game's progression.
// Nothing is actually deducted from any company in real time — the round
// only tracks how much it WOULD have spent (state.totalExpensesThisSession),
// and endRound spends that whole amount for real in one shot at the very end
const BASE_BURN_PERCENT_PER_SECOND = 0.05;
// a wealth-proportional burn alone would just decay toward zero forever
// without ever actually running out, letting a deep-pocketed player camp here
// indefinitely — so the burn % itself also compounds every DIFFICULTY_INTERVAL_MS
// tier, the same way the other difficulty knobs do, guaranteeing the cost
// eventually outpaces any reserve no matter how large
const BURN_PERCENT_GROWTH_PER_TIER = 1.35;
// "Market Influence %" (see hud/corporationBoostMenu's own persisted stat) —
// flat rate, not tied to the burn rate or anything else about the round: this
// much per second just for surviving, plus a flat instant bump on a good hit.
// Only ever climbs — bad hits never dock it (see step)
const AMBIENT_INFLUENCE_PERCENT_PER_SECOND = 0.05;
const GOOD_HIT_INFLUENCE_PERCENT = 0.1;

// drawn straight onto this screen's own canvas with the exact same utils.ts
// helpers floors/upgradeButton's real "Sale" button uses (drawPill/
// drawCartoonText), instead of a separate DOM element re-approximating that
// look in CSS — same 330:140 proportions (drawPill's own ring-width/radius
// percentages of height do the rest, whatever this button's own size is).
// Only ever shown once state.gameOver is true — while playing, any press on
// the canvas flaps (see the pointerdown handler) instead of needing a button
const END_LABEL = "End";
// the reference button's own label/width — "End" widens to fit this exact
// same left+right margin "Sale" gets in its own reference-width button (see
// getButtonWidth), instead of shrinking the font down to fit a fixed width
const BTN_REFERENCE_LABEL = "Sale";
const BTN_REFERENCE_W = 90;
const END_BTN_H = (BTN_REFERENCE_W * 140) / 330;
const END_BTN_BOTTOM_MARGIN = 28; // fallback margin only, used before the podium sprite has loaded — see getEndButtonRect
// gap between the podium cat's own bottom edge and this button's top edge
// (see getEndButtonRect)
const END_BTN_MARGIN_BELOW_PODIUM = 8;
// identical to floors/upgradeButton's own PRESS_* press-bounce constants
const PRESS_DURATION_MS = 450;
const PRESS_AMPLITUDE = 0.18;
const PRESS_DECAY = 9;
const PRESS_FREQUENCY = 26;

// generated by scripts/process-podium-sprites.mjs from src/assets/podiumSprites.jfif
// — a single row of 5 equal-size cells, podiums aligned to the same bottom row in
// every cell. Sits in the bottom-right corner the whole time the screen is open,
// cycling to a random pose after a random delay (see podiumFrame/
// podiumNextSwitchAt below) so it reads as the cat rambling through the "speech"
// rather than looping a fixed sequence. Its own bottom edge (see drawPodium)
// sits LABEL_ABOVE_AUDIENCE_OFFSET above the audience image's own top edge,
// same reference point the budget/influence labels anchor to
const PODIUM_FRAME_COUNT = 5;
const PODIUM_RENDER_H = 150;
const PODIUM_MARGIN = 16; // matches the 1rem left margin the score/budget labels use on the opposite side — see LABEL_ABOVE_AUDIENCE_OFFSET for vertical
const PODIUM_SWITCH_MIN_MS = 500;
const PODIUM_SWITCH_MAX_MS = 900;

// generated by scripts/process-audience.mjs from src/assets/audience.jfif — a
// crowd of cats seen from behind, already full-bleed with its own room/seating
// art. Drawn stretched edge-to-edge across the bottom of the canvas, behind
// everything else, so it reads as the crowd the podium cat is speaking to
// (see drawAudience for how its height is derived from cssW)
const AUDIENCE_Y_OFFSET = 120;
// how far above the audience image's own top edge the podium cat and the
// timer/score sit (see getAudienceTopY)
const LABEL_ABOVE_AUDIENCE_OFFSET = 10;
// same 40px gap the budget label always sat above the timer/score, before
// any of this audience-image anchoring existed (see render)
const BUDGET_ABOVE_SCORE_OFFSET = 40;
// extra nudge applied only to the timer/budget labels (see render), on top of
// LABEL_ABOVE_AUDIENCE_OFFSET's shared podium alignment
const SCORE_LABELS_EXTRA_LIFT_PX = 20;
// height of the gradient stage-floor strip the podium cat stands on (see
// drawFloor), sitting right at the podium's own bottom edge
const FLOOR_H = 20;

interface MarketEvent {
  text: string;
  good: boolean;
  isCrash: boolean; // the special "Market Crash" event (see getCrashChance); always bad, but ends the round on hit instead of a normal hit's coin burst
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
  marketInfluencePercent: number; // this session's own accrued total, for display only (the persisted stat lives in corporationBoostMenu)
  totalExpensesThisSession: BigNumber; // cumulative $ actually burned so far this round; only ever grows
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
      <div class="press-conference-game__budget" id="press-conference-game-budget">
        <span class="press-conference-game__budget-label">Remaining budget</span>
        <span id="press-conference-game-budget-value">$0</span>
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
  const scoreEl = container.querySelector<HTMLDivElement>(
    "#press-conference-game-score",
  )!;
  const influenceValueEl = container.querySelector<HTMLSpanElement>(
    "#press-conference-game-influence-value",
  )!;
  const budgetValueEl = container.querySelector<HTMLSpanElement>(
    "#press-conference-game-budget-value",
  )!;
  const budgetEl = container.querySelector<HTMLDivElement>(
    "#press-conference-game-budget",
  )!;
  const canvas = container.querySelector<HTMLCanvasElement>(
    "#press-conference-game-canvas",
  )!;
  const ctx = canvas.getContext("2d")!;

  // same shared sprites/draw math floors/coins's own burst uses (see
  // ../../coinBurst) — loaded independently here since this screen has no
  // Floor to hang that module's own version off of
  loadCoinBurstImages();

  let podiumSprite: HTMLImageElement | null = null;
  loadSprite("podium").then((img) => {
    podiumSprite = img;
  });
  // current pose + when to next roll a new one (see drawPodium) — random
  // instead of a fixed cycle, so the "speech" never reads as a looping gif
  let podiumFrame = 0;
  let podiumNextSwitchAt = 0;

  let audienceSprite: HTMLImageElement | null = null;
  loadImageByName("audience").then((img) => {
    audienceSprite = img;
  });

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
  // overall as the game goes on. Shrinks an EXTRA MAXED_CRASH_SPAWN_INTERVAL_SHRINK
  // on top of that once the crash ratio itself has capped out
  function randomEventDelayMs(tier: number): number {
    const shrink =
      SPAWN_INTERVAL_SHRINK_PER_TIER ** tier *
      (getCrashChance(tier) >= MARKET_CRASH_CHANCE_MAX
        ? MAXED_CRASH_SPAWN_INTERVAL_SHRINK
        : 1);
    const min = Math.max(
      MIN_SPAWN_INTERVAL_FLOOR_MS,
      EVENT_SPAWN_INTERVAL_MIN_MS * shrink,
    );
    const max = Math.max(min + 200, EVENT_SPAWN_INTERVAL_MAX_MS * shrink);
    return min + Math.random() * (max - min);
  }

  // how many full DIFFICULTY_INTERVAL_MS spans have been survived so far —
  // the crash ratio, spawn density, and every event's own drift speed all
  // scale off this
  function getDifficultyTier(): number {
    return Math.floor(state.survivedMs / DIFFICULTY_INTERVAL_MS);
  }

  // this tier's own good-vs-crash spawn ratio (see MARKET_CRASH_CHANCE_START/
  // GROWTH/MAX above) — how much of every spawn is the Market Crash instead
  // of a normal good event
  function getCrashChance(tier: number): number {
    return Math.min(
      MARKET_CRASH_CHANCE_MAX,
      MARKET_CRASH_CHANCE_START + MARKET_CRASH_CHANCE_GROWTH_PER_TIER * tier,
    );
  }

  // spawns just off the right edge, drifting left like everything else in
  // this world — a fresh cat-themed headline (see generateMarketEventText),
  // at a random height that leaves the same bottom clearance the End button
  // sits in once the round's over
  function spawnMarketEvent(): void {
    const isCrash = Math.random() < getCrashChance(getDifficultyTier());
    const good = !isCrash;
    const text = isCrash ? MARKET_CRASH_TEXT : generateMarketEventText();
    ctx.font = isCrash ? MARKET_CRASH_FONT : EVENT_FONT;
    const width = ctx.measureText(text).width;
    const topMargin = 30;
    const bottomMargin = END_BTN_H + END_BTN_BOTTOM_MARGIN + 30;
    // never below the floor's own top edge either, whichever bound is more
    // restrictive — the graph itself can no longer reach past that point
    const maxY = Math.min(
      cssH - bottomMargin,
      getFloorTopY() - EVENT_HIT_HEIGHT / 2,
    );
    const y = topMargin + Math.random() * Math.max(1, maxY - topMargin);
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
    const startY = (cssH / 2 || 200) - HEAD_START_Y_LIFT_PX;
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
      marketInfluencePercent: 0,
      totalExpensesThisSession: ZERO,
    };
  }
  let state = freshState();
  // snapshotted once at open() — the round's own fuel/budget is fixed for the
  // whole round instead of tracking whatever companies are earning live, since
  // nothing is actually spent from them until endRound
  let totalIncomeAtOpen: BigNumber = ZERO;

  // identical to floors/upgradeButton's own triggerButtonPress/pressScale —
  // recorded whenever the End button itself is pressed, read back every draw
  // to drive the same squash-then-springy-overshoot bounce
  let endPressedAt: number | null = null;

  function endPressScale(now: number): number {
    if (endPressedAt === null) return 1;
    const elapsedMs = now - endPressedAt;
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
  // BTN_REFERENCE_W-wide button — computed once per label and cached, since
  // neither the font nor any label ever changes
  const endFontSize = Math.round((52 / 140) * END_BTN_H);
  const cachedBtnWidths = new Map<string, number>();
  function getButtonWidth(label: string): number {
    const cached = cachedBtnWidths.get(label);
    if (cached !== undefined) return cached;
    ctx.font = `900 ${endFontSize}px "Fredoka", system-ui, sans-serif`;
    const referenceMargin =
      BTN_REFERENCE_W - ctx.measureText(BTN_REFERENCE_LABEL).width;
    const width = ctx.measureText(label).width + referenceMargin;
    cachedBtnWidths.set(label, width);
    return width;
  }

  // only meaningful once state.gameOver — centered under the podium cat,
  // END_BTN_MARGIN_BELOW_PODIUM below its own bottom edge, falling back to a
  // bottom-center canvas position if the podium sprite hasn't loaded yet
  function getEndButtonRect(): {
    x: number;
    y: number;
    w: number;
    h: number;
  } {
    const w = getButtonWidth(END_LABEL);
    const podium = getPodiumRect();
    const cx = podium ? podium.x + podium.w / 2 : cssW / 2;
    const cy = podium
      ? podium.y + podium.h + END_BTN_MARGIN_BELOW_PODIUM + END_BTN_H / 2
      : cssH - END_BTN_H / 2 - END_BTN_BOTTOM_MARGIN;
    return { x: cx - w / 2, y: cy - END_BTN_H / 2, w, h: END_BTN_H };
  }

  function flap(): void {
    state.started = true;
    // ramps from whatever velocity it actually has right now (not always 0),
    // so a press mid-fall (or a second press mid-ramp) blends smoothly
    // instead of snapping
    state.flapRampFromVelocity = state.velocityY;
    state.flapRampRemainingMs = FLAP_RAMP_DURATION_MS;
    playBubble();
  }

  function formatScore(ms: number): string {
    return `${(ms / 1000).toFixed(1)}s`;
  }

  // canvas-space y of the audience image's own top edge — shared reference
  // point the podium cat and the budget/influence labels all anchor
  // LABEL_ABOVE_AUDIENCE_OFFSET above (see drawPodium/render). Falls back to
  // the very bottom of the canvas before the sprite has actually loaded
  function getAudienceTopY(): number {
    if (!audienceSprite) return cssH;
    const renderH =
      cssW * (audienceSprite.naturalHeight / audienceSprite.naturalWidth);
    return cssH - renderH + AUDIENCE_Y_OFFSET;
  }

  // top edge of the floor riser (see drawFloor) — the graph's own head/line
  // and the grid now both stop here instead of at the audience's top edge,
  // so the floor reads as solid ground rather than something the line could
  // pass through
  function getFloorTopY(): number {
    return getAudienceTopY() - FLOOR_H;
  }

  // width-spanning riser the podium cat stands on, its bottom edge pinned to
  // the same y the podium sprite's own bottom sits (see getPodiumRect) so the
  // cat's feet always line up with the floor regardless of canvas size. A
  // vertical gradient (light top edge to dark front face) reads as a raised
  // platform instead of a flat painted stripe
  function drawFloor(): void {
    const bottom = getAudienceTopY();
    const top = getFloorTopY();
    const gradient = ctx.createLinearGradient(0, top, 0, bottom);
    gradient.addColorStop(0, COLOR.stageFloorLight);
    gradient.addColorStop(1, COLOR.stageFloorDark);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, top, cssW, FLOOR_H);
  }

  // stretched edge-to-edge across the bottom of the canvas, behind everything
  // else drawn on top of it (grid/line/head/events/podium) — width always
  // spans cssW, but height is derived from the sprite's own natural aspect
  // ratio (not a fixed constant) so it scales without distorting/squishing.
  // Pushed AUDIENCE_Y_OFFSET below its own bottom-aligned position, so only
  // its upper portion peeks up into the visible canvas
  function drawAudience(): void {
    if (!audienceSprite) return;
    const renderH =
      cssW * (audienceSprite.naturalHeight / audienceSprite.naturalWidth);
    ctx.globalAlpha = 1; // full opacity — nothing upstream should ever fade this out
    ctx.drawImage(audienceSprite, 0, getAudienceTopY(), cssW, renderH);
  }

  // stops at the floor's own top edge instead of the audience/canvas bottom,
  // so the semi-transparent grid lines never show through underneath the
  // opaque floor riser drawn on top of it (see render's own draw order)
  function drawGrid(headX: number): void {
    const gridBottom = getFloorTopY();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    const scrollOffset = state.worldX % GRID_CELL_PX;
    ctx.beginPath();
    for (let x = headX - scrollOffset; x < cssW; x += GRID_CELL_PX) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, gridBottom);
    }
    for (
      let x = headX - scrollOffset - GRID_CELL_PX;
      x > 0;
      x -= GRID_CELL_PX
    ) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, gridBottom);
    }
    for (let y = 0; y < gridBottom; y += GRID_CELL_PX) {
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

  // good events read as the same green/white the HUD's own total-income text
  // uses; bad ones swap in a mean red fill, same white stroke either way.
  // Market Crash gets its own fatter font/stroke and its own continuous
  // wiggle, to read as the one to really avoid
  function drawMarketEvents(now: number): void {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const event of state.marketEvents) {
      if (event.isCrash) {
        ctx.save();
        ctx.translate(event.x, event.y);
        ctx.rotate(getWiggleRotation(now));
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

  // right edge, its own bottom sitting LABEL_ABOVE_AUDIENCE_OFFSET above the
  // audience image's top edge — null until the sprite's actually loaded, so
  // callers (drawPodium, getEndButtonRect) can fall back gracefully
  function getPodiumRect(): {
    x: number;
    y: number;
    w: number;
    h: number;
  } | null {
    if (!podiumSprite) return null;
    const frameW = podiumSprite.naturalWidth / PODIUM_FRAME_COUNT;
    const frameH = podiumSprite.naturalHeight;
    const w = frameW * (PODIUM_RENDER_H / frameH);
    const x = cssW - PODIUM_MARGIN - w;
    const y = getAudienceTopY() - LABEL_ABOVE_AUDIENCE_OFFSET - PODIUM_RENDER_H;
    return { x, y, w, h: PODIUM_RENDER_H };
  }

  // rolls a fresh random pose after a random delay (see podiumFrame/
  // podiumNextSwitchAt), instead of a fixed walk-style cycle, so it reads as
  // ad-libbed speech
  function drawPodium(now: number): void {
    if (!podiumSprite) return;
    if (now >= podiumNextSwitchAt) {
      podiumFrame = randomInt(0, PODIUM_FRAME_COUNT - 1);
      podiumNextSwitchAt =
        now + randomInt(PODIUM_SWITCH_MIN_MS, PODIUM_SWITCH_MAX_MS);
    }
    const { x, y, w: renderW } = getPodiumRect()!;
    const frameW = podiumSprite.naturalWidth / PODIUM_FRAME_COUNT;
    const frameH = podiumSprite.naturalHeight;
    ctx.drawImage(
      podiumSprite,
      frameW * podiumFrame,
      0,
      frameW,
      frameH,
      x,
      y,
      renderW,
      PODIUM_RENDER_H,
    );
  }

  // straight reuse of the exact same drawPill/drawCartoonText calls
  // floors/upgradeButton's own Sale-state button makes, at this button's own
  // size — only ever drawn once state.gameOver, just the press-bounce
  // feedback on tap, no wiggle
  function drawEndButton(now: number): void {
    const { x, y, w, h } = getEndButtonRect();
    const cx = x + w / 2;
    const cy = y + h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    const scale = endPressScale(now);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
    drawPill(ctx, x, y, w, h, COLOR.disabledGray, true, true, (40 / 140) * h);
    ctx.font = `900 ${endFontSize}px "Fredoka", system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    drawCartoonText(ctx, END_LABEL, cx, cy);
    ctx.restore();
  }

  // stops the round, spends this session's whole accrued expenses for real in
  // one shot (see totalIncomeAtOpen — nothing was actually deducted from any
  // company until now), and banks the accrued state.marketInfluencePercent
  // the same way
  function endRound(): void {
    state.running = false;
    state.gameOver = true;
    playExplosion();
    if (gt(state.totalExpensesThisSession, ZERO)) {
      spendFromAllCompanies(state.totalExpensesThisSession);
    }
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

    // the bottom bound is the floor riser's own top edge, not the audience or
    // canvas bottom — reaching the floor ends the round the same way hitting
    // the top of the screen does
    const bottomBound = getFloorTopY();
    if (state.headY <= 0 || state.headY >= bottomBound) {
      state.headY = Math.max(0, Math.min(bottomBound, state.headY));
      endRound();
    }

    // the snapshotted total (see totalIncomeAtOpen) is this game's own fuel:
    // burn a wealth-proportional slice of it every second, tracked locally
    // only — running dry ends the round the same way hitting a bound does
    if (state.running) {
      const remaining = subtract(
        totalIncomeAtOpen,
        state.totalExpensesThisSession,
      );
      // anything under $1 counts as bankrupt
      if (lt(remaining, fromNumber(1))) {
        endRound();
      } else {
        // flat rate, just for surviving — not tied to the burn cost below at
        // all (see AMBIENT_INFLUENCE_PERCENT_PER_SECOND); only ever kept in
        // session state here, banked for real once by endRound
        state.marketInfluencePercent +=
          AMBIENT_INFLUENCE_PERCENT_PER_SECOND * dt;

        const cost = multiply(
          remaining,
          BASE_BURN_PERCENT_PER_SECOND *
            BURN_PERCENT_GROWTH_PER_TIER ** getDifficultyTier() *
            dt,
        );
        state.totalExpensesThisSession = add(
          state.totalExpensesThisSession,
          cost,
        );
      }
    }

    state.nextEventInMs -= dtMs;
    if (state.nextEventInMs <= 0) {
      spawnMarketEvent();
      state.nextEventInMs = randomEventDelayMs(getDifficultyTier());
    }
    const headX = cssW / 2 - HEAD_X_OFFSET_FROM_CENTER;
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
        } else {
          spawnCoinBurstAt(event.x, event.y, COIN_BURST_SCALE);
          // the buy sfx, not the usual coin-drop one, just for this hit
          playSold();
          // flat bump, on top of the flat ambient climb above — only ever
          // kept in session state here, banked for real once by endRound
          state.marketInfluencePercent += GOOD_HIT_INFLUENCE_PERCENT;
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
    const headX = cssW / 2 - HEAD_X_OFFSET_FROM_CENTER;
    drawAudience();
    drawGrid(headX);
    drawFloor();
    drawMarketEvents(now);
    drawLine(headX);
    drawHead(headX);
    drawActiveCoinBursts(ctx, now);
    drawTapToBegin(now);
    if (state.gameOver) drawEndButton(now);
    drawPodium(now);
    ctx.restore();
    timerEl.textContent = formatScore(state.survivedMs);
    // canvas-space y maps 1:1 to these DOM elements' own "bottom" CSS offset —
    // the canvas fills the container down to its exact bottom edge (see
    // style.css's .press-conference-game__canvas flex:1). Pins the timer/score
    // to the podium cat's own bottom edge (see drawPodium), the same alignment
    // they always had before the audience image pushed the podium up — budget
    // still sits its own BUDGET_ABOVE_SCORE_OFFSET further above that, same as
    // it always sat above the timer
    const scoreBottomPx =
      cssH -
      getAudienceTopY() +
      LABEL_ABOVE_AUDIENCE_OFFSET +
      SCORE_LABELS_EXTRA_LIFT_PX;
    scoreEl.style.bottom = `${scoreBottomPx}px`;
    budgetEl.style.bottom = `${scoreBottomPx + BUDGET_ABOVE_SCORE_OFFSET}px`;
    budgetValueEl.textContent = formatPrice(
      subtract(totalIncomeAtOpen, state.totalExpensesThisSession),
    );
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

  canvas.addEventListener("pointerdown", () => {
    if (state.gameOver) return; // end button is handled on click below
    // no button to hit while playing — any press on the canvas flaps
    flap();
  });

  // the end button is deliberately handled on "click", not "pointerdown": this
  // screen sits on top of the boost menu dialog (see close()'s own comment),
  // and closing it (screen.hidden = true) synchronously inside a pointerdown
  // handler reveals that dialog's own backdrop underneath the pointer BEFORE
  // the browser's compatibility "click" event for this same tap fires —
  // which then landed on that now-visible backdrop instead, closing the
  // boost menu too. Reacting on "click" instead means this tap's one and only
  // click event is consumed right here, with nothing left over to fall
  // through afterward
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
    state = freshState();
    totalIncomeAtOpen = getAllCompaniesTotalIncome();
    lastFrameTime = 0;
    screen.hidden = false;
    playSwoosh();
    resize();
    state.headY = cssH / 2 - HEAD_START_Y_LIFT_PX;
    state.tailY = cssH / 2 - HEAD_START_Y_LIFT_PX;
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
