import { playBubble, playSold } from "../../sound";
import { drawCartoonText, formatPrice } from "../../utils";
import { COLOR } from "../../palette";
import { getWiggleRotation } from "../../shared/wiggle";
import { advanceTrail } from "../../shared/canvasGame";
import { spawnCoinBurstAt, drawActiveCoinBursts } from "../../coinBurst";
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
import {
  wireConferenceMinigame,
  TRAIL_SAMPLE_DX,
  LINE_WIDTH,
  HEAD_X_OFFSET_FROM_CENTER,
  computeMaxTrailLength,
  END_BTN_H,
  END_BTN_BOTTOM_MARGIN,
  type MinigameState,
  type ConferenceMinigame,
} from "../../shared/conferenceMinigame";
import { LABEL_ABOVE_AUDIENCE_OFFSET } from "../../shared/pressConferenceScene";

// physics constants for the line's head — same "flappy bird" feel: constant
// downward gravity, a fixed upward kick on every flap, no in-between speeds.
// the world (grid + trail) scrolls left under a fixed head X, giving the
// illusion of the line constantly moving right, same convention endless
// runners use instead of actually moving the head across a finite canvas.
// The shared canvas/scene/line/tap-to-begin/End button/open-close shell now
// lives in shared/conferenceMinigame — this file only supplies its own
// physics (step), its own extra world content (renderGraph — the market
// event headlines), and its own tap/reward logic
const SCROLL_SPEED_PX_S = 160;
// same angle-cap the shared engine's own trail draws with
const TAIL_MAX_ANGLE_TAN = Math.tan((60 * Math.PI) / 180);
const GRAVITY_PX_S2 = 1400;
// FLAP_VELOCITY_PX_S is deliberately capped at -SCROLL_SPEED_PX_S *
// TAIL_MAX_ANGLE_TAN: a trail sample lands every TRAIL_SAMPLE_DX/
// SCROLL_SPEED_PX_S seconds, so keeping |velocityY| at or below that cap keeps
// each sample-to-sample rise within the shared engine's own angle cap on its
// own, instead of relying on its clamp to visibly correct it after the fact.
// Scaled back to half that cap, then up 25% twice — the full-strength kick
// felt too strong to control
const FLAP_STRENGTH_SCALE = 0.78125;
const FLAP_VELOCITY_PX_S =
  -SCROLL_SPEED_PX_S * TAIL_MAX_ANGLE_TAN * FLAP_STRENGTH_SCALE;
// gravity accelerates the fall up to this same speed and no further (see
// step) — the same angle-equivalent cap as FLAP_VELOCITY_PX_S, just downward,
// so an unbroken fall settles into a constant angle descent instead of
// accelerating past it
const TERMINAL_FALL_VELOCITY_PX_S = SCROLL_SPEED_PX_S * TAIL_MAX_ANGLE_TAN;
// each flap eases the head's velocity toward FLAP_VELOCITY_PX_S over this
// fixed duration instead of snapping straight to it (see step) — a fixed
// wall-clock duration, not a threshold-based "close enough" check: gravity
// keeps pulling the whole time too, and racing an open-ended ease against
// gravity forever could settle into an equilibrium short of the actual
// target, leaving it permanently "stuck" easing and never handing control
// back to gravity (the head just drifting up forever)
const FLAP_RAMP_DURATION_MS = 150;
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
// the round opens (see onOpen's totalIncomeAtOpen), is this game's own
// "fuel": every second it's played burns BASE_BURN_PERCENT_PER_SECOND of
// whatever that snapshot has left (see step), scaling by wealth instead of a
// fixed $ amount so this stays meaningful at any point in the game's
// progression. Nothing is actually deducted from any company in real time —
// the round only tracks how much it WOULD have spent
// (state.totalExpensesThisSession), and onGameOver spends that whole amount
// for real in one shot at the very end
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
// same 40px gap the budget label always sat above the timer/score
const BUDGET_ABOVE_SCORE_OFFSET = 40;
const SCORE_LABELS_EXTRA_LIFT_PX = 20;

interface MarketEvent {
  text: string;
  good: boolean;
  isCrash: boolean; // the special "Market Crash" event (see getCrashChance); always bad, but ends the round on hit instead of a normal hit's coin burst
  x: number;
  y: number;
  width: number; // measured once at spawn time
}

interface PressConferenceState extends MinigameState {
  flapRampRemainingMs: number; // > 0 while easing toward FLAP_VELOCITY_PX_S (see FLAP_RAMP_DURATION_MS); always counts down to exactly 0
  flapRampFromVelocity: number; // velocityY at the moment the current ramp began, lerped from here toward FLAP_VELOCITY_PX_S
  marketEvents: MarketEvent[];
  nextEventInMs: number; // counts down to the next spawn (see EVENT_SPAWN_INTERVAL_*)
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

export type PressConferenceGame = ConferenceMinigame;

export function wirePressConferenceGame(
  container: HTMLElement,
  onClose?: () => void,
): PressConferenceGame {
  const budgetValueEl = container.querySelector<HTMLSpanElement>(
    "#press-conference-game-budget-value",
  )!;
  const budgetEl = container.querySelector<HTMLDivElement>(
    "#press-conference-game-budget",
  )!;

  // takes the tier explicitly (rather than reading state.survivedMs itself)
  // so it's safe to call from freshState() too, before a real state exists
  // yet — shrinks toward MIN_SPAWN_INTERVAL_FLOOR_MS each tier, so more text
  // spawns overall as the game goes on. Shrinks an EXTRA
  // MAXED_CRASH_SPAWN_INTERVAL_SHRINK on top of that once the crash ratio
  // itself has capped out
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
  function getDifficultyTier(state: PressConferenceState): number {
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
  function spawnMarketEvent(
    state: PressConferenceState,
    cssW: number,
    cssH: number,
    getFloorTopY: () => number,
    ctx: CanvasRenderingContext2D,
  ): void {
    const isCrash = Math.random() < getCrashChance(getDifficultyTier(state));
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

  function freshState(): PressConferenceState {
    return {
      headY: 0,
      velocityY: 0,
      tailY: 0,
      trail: [],
      worldX: 0,
      survivedMs: 0,
      started: false,
      running: true,
      gameOver: false,
      holding: false,
      marketInfluencePercent: 0,
      flapRampRemainingMs: 0,
      flapRampFromVelocity: 0,
      marketEvents: [],
      nextEventInMs: randomEventDelayMs(0),
      totalExpensesThisSession: ZERO,
    };
  }
  // snapshotted once at open() — the round's own fuel/budget is fixed for the
  // whole round instead of tracking whatever companies are earning live, since
  // nothing is actually spent from them until onGameOver
  let totalIncomeAtOpen: BigNumber = ZERO;

  // good events read as the same green/white the HUD's own total-income text
  // uses; bad ones swap in a mean red fill, same white stroke either way.
  // Market Crash gets its own fatter font/stroke and its own continuous
  // wiggle, to read as the one to really avoid
  function drawMarketEvents(
    ctx: CanvasRenderingContext2D,
    state: PressConferenceState,
    now: number,
  ): void {
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

  return wireConferenceMinigame<PressConferenceState>(container, {
    elements: {
      screenId: "press-conference-game",
      canvasId: "press-conference-game-canvas",
      timerId: "press-conference-game-timer",
      scoreId: "press-conference-game-score",
      influenceValueId: "press-conference-game-influence-value",
    },
    createState: freshState,

    onOpen: () => {
      totalIncomeAtOpen = getAllCompaniesTotalIncome();
    },

    step: (state, dtMs, cssW, cssH, getFloorTopY, ctx) => {
      const dt = dtMs / 1000;
      if (state.flapRampRemainingMs > 0) {
        // fixed-duration smoothstep, not an open-ended chase — always
        // finishes in exactly FLAP_RAMP_DURATION_MS regardless of gravity's
        // own simultaneous pull, so control always hands back to gravity below
        state.flapRampRemainingMs = Math.max(
          0,
          state.flapRampRemainingMs - dtMs,
        );
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

      // eases toward the head's own position instead of snapping straight to
      // it, so the tail visibly lags a beat behind every sudden flap/fall
      // instead of tracking it 1:1
      state.tailY +=
        (state.headY - state.tailY) * (1 - Math.exp(-TAIL_LAG_RATE * dt));
      advanceTrail(
        state,
        SCROLL_SPEED_PX_S * dt,
        state.tailY,
        TRAIL_SAMPLE_DX,
        computeMaxTrailLength(cssW),
      );

      // the bottom bound is the floor riser's own top edge, not the audience
      // or canvas bottom — reaching the floor ends the round the same way
      // hitting the top of the screen does
      const bottomBound = getFloorTopY();
      if (state.headY <= 0 || state.headY >= bottomBound) {
        state.headY = Math.max(0, Math.min(bottomBound, state.headY));
        state.running = false;
        state.gameOver = true;
      }

      // the snapshotted total (see totalIncomeAtOpen) is this game's own
      // fuel: burn a wealth-proportional slice of it every second, tracked
      // locally only — running dry ends the round the same way hitting a
      // bound does
      if (state.running) {
        const remaining = subtract(
          totalIncomeAtOpen,
          state.totalExpensesThisSession,
        );
        // anything under $1 counts as bankrupt
        if (lt(remaining, fromNumber(1))) {
          state.running = false;
          state.gameOver = true;
        } else {
          // flat rate, just for surviving — not tied to the burn cost below
          // at all; only ever kept in session state here, banked for real
          // once by onGameOver
          state.marketInfluencePercent +=
            AMBIENT_INFLUENCE_PERCENT_PER_SECOND * dt;

          const cost = multiply(
            remaining,
            BASE_BURN_PERCENT_PER_SECOND *
              BURN_PERCENT_GROWTH_PER_TIER ** getDifficultyTier(state) *
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
        spawnMarketEvent(state, cssW, cssH, getFloorTopY, ctx);
        state.nextEventInMs = randomEventDelayMs(getDifficultyTier(state));
      }
      const headX = cssW / 2 - HEAD_X_OFFSET_FROM_CENTER;
      const eventSpeed =
        SCROLL_SPEED_PX_S *
        EVENT_SPEED_GROWTH_PER_TIER ** getDifficultyTier(state);
      for (let i = state.marketEvents.length - 1; i >= 0; i--) {
        const event = state.marketEvents[i];
        event.x -= eventSpeed * dt;
        const withinX =
          Math.abs(event.x - headX) < event.width / 2 + LINE_WIDTH;
        const withinY = Math.abs(event.y - state.headY) < EVENT_HIT_HEIGHT / 2;
        if (withinX && withinY) {
          if (event.isCrash) {
            // ends the round outright, same as hitting a bound
            state.running = false;
            state.gameOver = true;
          } else {
            spawnCoinBurstAt(event.x, event.y, COIN_BURST_SCALE);
            // the buy sfx, not the usual coin-drop one, just for this hit
            playSold();
            // flat bump, on top of the flat ambient climb above — only ever
            // kept in session state here, banked for real once by onGameOver
            state.marketInfluencePercent += GOOD_HIT_INFLUENCE_PERCENT;
          }
          state.marketEvents.splice(i, 1);
          continue;
        }
        if (event.x < -event.width / 2) state.marketEvents.splice(i, 1);
      }
    },

    renderGraph: (ctx, state, _headX, now) => {
      drawMarketEvents(ctx, state, now);
      drawActiveCoinBursts(ctx, now);
    },

    onTap: (state) => {
      // ramps from whatever velocity it actually has right now (not always
      // 0), so a press mid-fall (or a second press mid-ramp) blends smoothly
      // instead of snapping
      state.flapRampFromVelocity = state.velocityY;
      state.flapRampRemainingMs = FLAP_RAMP_DURATION_MS;
      playBubble();
    },

    // spends this session's whole accrued expenses for real in one shot (see
    // totalIncomeAtOpen — nothing was actually deducted from any company
    // until now), and banks the accrued state.marketInfluencePercent the same way
    onGameOver: (state) => {
      if (gt(state.totalExpensesThisSession, ZERO)) {
        spendFromAllCompanies(state.totalExpensesThisSession);
      }
      addMarketInfluencePercent(state.marketInfluencePercent);
    },

    onClose,

    // budget sits its own BUDGET_ABOVE_SCORE_OFFSET further above the shared
    // score label, same as it always did
    onLayout: (state, cssH, audienceTopY) => {
      const scoreBottomPx =
        cssH -
        audienceTopY +
        LABEL_ABOVE_AUDIENCE_OFFSET +
        SCORE_LABELS_EXTRA_LIFT_PX;
      budgetEl.style.bottom = `${scoreBottomPx + BUDGET_ABOVE_SCORE_OFFSET}px`;
      budgetValueEl.textContent = formatPrice(
        subtract(totalIncomeAtOpen, state.totalExpensesThisSession),
      );
    },
  });
}
