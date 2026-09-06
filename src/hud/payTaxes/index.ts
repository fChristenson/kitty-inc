import { playExplosion } from "../../sound";
import { drawCartoonText } from "../../utils";
import { COLOR } from "../../palette";
import {
  drawTrailLine,
  drawTrailHead,
  type TrailPoint,
} from "../../shared/canvasGame";
import { drawActiveCoinBursts } from "../../coinBurst";
import { triggerScreenShake } from "../../screenShake";
import {
  wireConferenceMinigame,
  TRAIL_SAMPLE_DX,
  LINE_WIDTH,
  LINE_COLOR,
  HEAD_RADIUS,
  HEAD_X_OFFSET_FROM_CENTER,
  computeMaxTrailLength,
  type MinigameState,
  type ConferenceMinigame,
} from "../../shared/conferenceMinigame";
import { addTaxRebatePercent } from "../corporationBoostMenu";

// "Declare Taxes": built on the same shared/conferenceMinigame engine as
// pressConferenceGame/liquidateAssetsGame, but with no physics of its own at
// all — the line head is fully drag-controlled (see MinigameState's own
// headX, set once in onOpen below and then moved directly by the shared
// engine's own pointermove handling), free to move anywhere on screen while
// held. Hitting either the left or right edge, or a homing Taxes word (see
// spawnTaxWord), ends the round outright; the vertical position is just
// clamped to the playable area instead (see step)
const SCROLL_SPEED_PX_S = 160;
// spaceship-style easing: the ship accelerates toward wherever the drag
// target (state.headX/headY, moved 1:1 by the shared engine's own
// pointermove handling) currently is, rather than snapping straight to it —
// SHIP_SPRING_PER_S2 pulls it in, SHIP_DAMPING_PER_S bleeds off velocity so
// it settles instead of oscillating forever
const SHIP_SPRING_PER_S2 = 30;
const SHIP_DAMPING_PER_S = 5;
// "Tax rebate %" (see hud/corporationBoostMenu's own persisted stat) — flat
// rate per second survived, same ambient-only convention the other two
// games' own modifiers start from
const TAX_REBATE_PERCENT_PER_SECOND = 0.05;
// a second tap landing within this window of the first counts as a double
// tap (see onTap below) instead of two separate single taps
const DOUBLE_TAP_WINDOW_MS = 300;
// how long a double tap's explosion is on cooldown for afterward — see
// drawDoubleTapCooldown's own clockwise wipe, which visualizes exactly this
// duration
const DOUBLE_TAP_COOLDOWN_MS = 5000;
const COOLDOWN_INDICATOR_RADIUS = 3; // 6px circle (8px, reduced 25%)
const COOLDOWN_INDICATOR_COLOR = "rgba(229, 231, 235, 0.85)";
// sits above the head, not directly on top of it
const COOLDOWN_INDICATOR_OFFSET_Y = 8;
// "Taxes" obstacles: same big bold red/white cartoon-text style
// pressConferenceGame's own MARKET_CRASH_TEXT uses — the shared "danger red
// text" convention
const TAXES_FONT = '900 15px "Fredoka", system-ui, sans-serif';
const TAXES_STROKE_WIDTH = 6;
// re-aimed at the head's own current position every frame (a true homing
// seek, not just drifting left), at roughly half the line/ship's own
// scroll speed — see the difficulty ramp below for how this grows over time
const TAXES_HOMING_SPEED_PX_S = 70;
const TAXES_SPAWN_INTERVAL_MS = 2200;
// approximates the rendered text's own half-size (halved along with
// TAXES_FONT) for a circle-vs-circle touch check against the head
const TAXES_COLLISION_RADIUS = 13;
// every DIFFICULTY_INTERVAL_MS survived, words spawn more densely (shrinking
// gap between spawns) and move faster — both compounding each tier, same
// convention pressConferenceGame's own market-event ramp uses
const TAXES_DIFFICULTY_INTERVAL_MS = 10_000;
const TAXES_SPEED_GROWTH_PER_TIER = 1.25;
const TAXES_SPAWN_INTERVAL_SHRINK_PER_TIER = 0.8;
const TAXES_MIN_SPAWN_INTERVAL_MS = 600;
// how long a double-tapped word spends frozen/harmless and blinking before
// it's actually removed (see step's own vanishRemainingMs countdown)
const VANISH_DURATION_MS = 600;
const VANISH_BLINK_INTERVAL_MS = 100;

function getTaxesTier(survivedMs: number): number {
  return Math.floor(survivedMs / TAXES_DIFFICULTY_INTERVAL_MS);
}

function getTaxesSpawnIntervalMs(tier: number): number {
  return Math.max(
    TAXES_MIN_SPAWN_INTERVAL_MS,
    TAXES_SPAWN_INTERVAL_MS * TAXES_SPAWN_INTERVAL_SHRINK_PER_TIER ** tier,
  );
}

function getTaxesSpeedPxS(tier: number): number {
  return TAXES_HOMING_SPEED_PX_S * TAXES_SPEED_GROWTH_PER_TIER ** tier;
}

// a small gray-white circle over the head that erases itself clockwise
// (starting at 12 o'clock) as the double-tap cooldown counts down, fully
// gone right as it becomes usable again — a no-op once remainingMs hits 0
function drawDoubleTapCooldown(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  remainingMs: number,
): void {
  if (remainingMs <= 0) return;
  const elapsedFraction = 1 - remainingMs / DOUBLE_TAP_COOLDOWN_MS;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, COOLDOWN_INDICATOR_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = COOLDOWN_INDICATOR_COLOR;
  ctx.fill();
  // cuts out (reveals transparency in) the wedge that's already elapsed —
  // whatever's left opaque is exactly the remaining cooldown
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(
    x,
    y,
    COOLDOWN_INDICATOR_RADIUS,
    -Math.PI / 2,
    -Math.PI / 2 + elapsedFraction * Math.PI * 2,
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

interface TaxWord {
  x: number;
  y: number;
  // null while active (homing, harmful); counts down once a double tap
  // triggers vanishBlink below — frozen and harmless the whole time, then
  // removed once it hits 0
  vanishRemainingMs: number | null;
}

// spawns just outside a random edge of the canvas, so it always has to travel
// inward toward wherever the head currently is (see step's own homing update)
function spawnTaxWord(cssW: number, cssH: number): TaxWord {
  const side = Math.floor(Math.random() * 4);
  const margin = 40;
  const base = { vanishRemainingMs: null };
  switch (side) {
    case 0: // above
      return { ...base, x: Math.random() * cssW, y: -margin };
    case 1: // below
      return { ...base, x: Math.random() * cssW, y: cssH + margin };
    case 2: // left
      return { ...base, x: -margin, y: Math.random() * cssH };
    default: // right
      return { ...base, x: cssW + margin, y: Math.random() * cssH };
  }
}

export function createPayTaxesGameMarkup(): string {
  return `
    <div class="press-conference-game pay-taxes-game" id="pay-taxes-game" hidden>
      <div class="press-conference-game__header">
        <h2>Declare Taxes</h2>
      </div>
      <div class="press-conference-game__score" id="pay-taxes-game-score">
        <div id="pay-taxes-game-timer">0.0s</div>
      </div>
      <div class="press-conference-game__influence" id="pay-taxes-game-influence">
        <span class="press-conference-game__influence-label">Tax rebate</span>
        <span id="pay-taxes-game-influence-value">+0.00% ▲</span>
      </div>
      <canvas class="press-conference-game__canvas" id="pay-taxes-game-canvas"></canvas>
    </div>
  `;
}

export type PayTaxesGame = ConferenceMinigame;

interface PayTaxesState extends MinigameState {
  // world-anchored breadcrumbs left behind by the ship's own actual path —
  // each point is fixed in place once recorded, then only ever shifted left
  // by the same constant scroll the grid moves by (see step), so it stays
  // exactly where the ship actually passed instead of being redrawn relative
  // to wherever it's since moved to
  breadcrumbs: TrailPoint[];
  // the ship's own actual rendered position/velocity — state.headX/headY is
  // just the raw drag target (see the shared engine's pointermove
  // handling); the ship eases toward it with its own momentum instead of
  // snapping there 1:1 (see step)
  shipX: number;
  shipY: number;
  shipVelX: number;
  shipVelY: number;
  // counts down to 0 after a double tap fires (see onTap/drawDoubleTapCooldown);
  // double-tap detection is disabled the whole time it's above 0
  doubleTapCooldownMs: number;
  taxWords: TaxWord[];
  nextTaxWordInMs: number;
}

export function wirePayTaxesGame(
  container: HTMLElement,
  onClose?: () => void,
): PayTaxesGame {
  // performance.now() of the last single tap, for onTap's own double-tap
  // detection below
  let lastTapAt = 0;

  function freshState(): PayTaxesState {
    return {
      headY: 0,
      worldX: 0,
      survivedMs: 0,
      started: false,
      running: true,
      gameOver: false,
      holding: false,
      marketInfluencePercent: 0,
      breadcrumbs: [],
      shipX: 0,
      shipY: 0,
      shipVelX: 0,
      shipVelY: 0,
      doubleTapCooldownMs: 0,
      taxWords: [],
      nextTaxWordInMs: TAXES_SPAWN_INTERVAL_MS,
    };
  }

  return wireConferenceMinigame<PayTaxesState>(container, {
    elements: {
      screenId: "pay-taxes-game",
      canvasId: "pay-taxes-game-canvas",
      timerId: "pay-taxes-game-timer",
      scoreId: "pay-taxes-game-score",
      influenceValueId: "pay-taxes-game-influence-value",
    },
    createState: freshState,

    onOpen: (state, cssW) => {
      // same starting x the shared engine's own fixed-head default uses, so
      // opening looks identical to before — just draggable from here on
      const startX = cssW / 2 - HEAD_X_OFFSET_FROM_CENTER;
      state.headX = startX;
      state.shipX = startX;
      // the engine already set state.headY to its own default before
      // calling onOpen — start the ship there too, no lag on the very first
      // frame
      state.shipY = state.headY;
    },

    step: (state, dtMs, cssW, _cssH, getFloorTopY, _ctx) => {
      const dt = dtMs / 1000;
      // clamped here (not just the ship below) so a fast drag/flick can't
      // leave the target sitting far outside the canvas — chasing a target
      // that far away builds up enough momentum to overshoot straight
      // through the opposite edge moments after the drag actually stops
      state.headX = Math.max(0, Math.min(cssW, state.headX!));
      state.headY = Math.max(0, Math.min(getFloorTopY(), state.headY));
      const targetX = state.headX;
      const targetY = state.headY;

      // damped-spring chase: pulled toward the target, bleeding off velocity
      // each frame instead of accelerating forever — gives the ship a
      // "heavier", slightly-behind feel instead of tracking the drag exactly
      state.shipVelX += (targetX - state.shipX) * SHIP_SPRING_PER_S2 * dt;
      state.shipVelY += (targetY - state.shipY) * SHIP_SPRING_PER_S2 * dt;
      const damping = Math.exp(-SHIP_DAMPING_PER_S * dt);
      state.shipVelX *= damping;
      state.shipVelY *= damping;
      state.shipX += state.shipVelX * dt;
      state.shipY += state.shipVelY * dt;
      state.shipY = Math.max(0, Math.min(getFloorTopY(), state.shipY));

      if (state.shipX <= 0 || state.shipX >= cssW) {
        state.shipX = Math.max(0, Math.min(cssW, state.shipX));
        state.running = false;
        state.gameOver = true;
      }
      const scrollDeltaPx = SCROLL_SPEED_PX_S * dt;
      const prevWorldX = state.worldX;
      state.worldX += scrollDeltaPx;
      for (const point of state.breadcrumbs) point.x -= scrollDeltaPx;
      const samplesDue =
        Math.floor(state.worldX / TRAIL_SAMPLE_DX) -
        Math.floor(prevWorldX / TRAIL_SAMPLE_DX);
      for (let i = 0; i < samplesDue; i++) {
        state.breadcrumbs.push({ x: state.shipX, y: state.shipY });
      }
      const maxLength = computeMaxTrailLength(cssW);
      if (state.breadcrumbs.length > maxLength) {
        state.breadcrumbs.splice(0, state.breadcrumbs.length - maxLength);
      }
      state.survivedMs += dtMs;
      if (state.running) {
        state.marketInfluencePercent += TAX_REBATE_PERCENT_PER_SECOND * dt;
      }
      state.doubleTapCooldownMs = Math.max(0, state.doubleTapCooldownMs - dtMs);

      state.nextTaxWordInMs -= dtMs;
      const taxesTier = getTaxesTier(state.survivedMs);
      if (state.nextTaxWordInMs <= 0) {
        state.taxWords.push(spawnTaxWord(cssW, getFloorTopY()));
        state.nextTaxWordInMs = getTaxesSpawnIntervalMs(taxesTier);
      }
      const taxesSpeed = getTaxesSpeedPxS(taxesTier);
      for (const word of state.taxWords) {
        if (word.vanishRemainingMs !== null) {
          // frozen in place and harmless while blinking out — no homing
          // movement, no collision check
          word.vanishRemainingMs = Math.max(0, word.vanishRemainingMs - dtMs);
          continue;
        }
        const dx = state.shipX - word.x;
        const dy = state.shipY - word.y;
        const dist = Math.hypot(dx, dy) || 1;
        word.x += (dx / dist) * taxesSpeed * dt;
        word.y += (dy / dist) * taxesSpeed * dt;
        if (dist <= TAXES_COLLISION_RADIUS + HEAD_RADIUS) {
          state.running = false;
          state.gameOver = true;
        }
      }
      state.taxWords = state.taxWords.filter(
        (word) => word.vanishRemainingMs === null || word.vanishRemainingMs > 0,
      );
    },

    renderGraph: (ctx, state, _headX, now) => {
      drawActiveCoinBursts(ctx, now);
      ctx.font = TAXES_FONT;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const word of state.taxWords) {
        // blinks on/off every BLINK_INTERVAL_MS while vanishing instead of
        // just fading, then skips drawing entirely once it's about to be
        // removed
        if (word.vanishRemainingMs !== null) {
          const elapsed = VANISH_DURATION_MS - word.vanishRemainingMs;
          if (Math.floor(elapsed / VANISH_BLINK_INTERVAL_MS) % 2 !== 0) {
            continue;
          }
        }
        drawCartoonText(
          ctx,
          "Taxes",
          word.x,
          word.y,
          COLOR.red,
          COLOR.white,
          TAXES_STROKE_WIDTH,
        );
      }
      const points = [...state.breadcrumbs, { x: state.shipX, y: state.shipY }];
      drawTrailLine(ctx, points, LINE_WIDTH, LINE_COLOR);
      drawTrailHead(ctx, state.shipX, state.shipY, HEAD_RADIUS, LINE_COLOR);
      drawDoubleTapCooldown(
        ctx,
        state.shipX,
        state.shipY - COOLDOWN_INDICATOR_OFFSET_Y,
        state.doubleTapCooldownMs,
      );
    },

    // a double tap sets off an explosion + screen shake and starts every
    // Taxes word on screen blinking out (frozen + harmless — see step's own
    // vanishRemainingMs handling) instead of removing them outright; silent
    // otherwise (no more bubble tap sound); disabled entirely while on
    // cooldown (see drawDoubleTapCooldown)
    onTap: (state) => {
      const now = performance.now();
      if (
        state.doubleTapCooldownMs <= 0 &&
        now - lastTapAt <= DOUBLE_TAP_WINDOW_MS
      ) {
        lastTapAt = 0; // consumed — a third rapid tap starts fresh, not another double
        state.doubleTapCooldownMs = DOUBLE_TAP_COOLDOWN_MS;
        for (const word of state.taxWords) {
          word.vanishRemainingMs = VANISH_DURATION_MS;
        }
        playExplosion();
        triggerScreenShake();
      } else {
        lastTapAt = now;
      }
    },

    onGameOver: (state) => {
      addTaxRebatePercent(state.marketInfluencePercent);
    },

    onClose,
  });
}
