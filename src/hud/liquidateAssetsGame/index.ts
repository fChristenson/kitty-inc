import { playBubble, playSold } from "../../sound";
import { COLOR } from "../../palette";
import { CONFIG } from "../../config";
import {
  advanceTrail,
  computeSmoothedTrailPoints,
  drawTrailLine,
  drawTrailHead,
} from "../../shared/canvasGame";
import {
  wireConferenceMinigame,
  TRAIL_SAMPLE_DX,
  TRAIL_SMOOTHING_RADIUS,
  TAIL_MAX_ANGLE_TAN,
  LINE_WIDTH,
  LINE_COLOR,
  HEAD_RADIUS,
  HEAD_X_OFFSET_FROM_CENTER,
  computeMaxTrailLength,
  type MinigameState,
  type ConferenceMinigame,
} from "../../shared/conferenceMinigame";
import { addSecuredAssetsPercent } from "../corporationBoostMenu";
import {
  spawnFloatingText,
  drawActiveFloatingTexts,
  shiftActiveFloatingTexts,
} from "../../shared/floatingText";
import { drawMainLine } from "./mainLine";
import { drawShortLine } from "./shortLine";
import { renderJumpLines } from "./renderJumpLines";
import type { LineRewardKind } from "./createLines";

// "Liquidate Assets": a Geometry Dash-style endless runner built on the
// shared shared/conferenceMinigame engine (canvas/scene/line/tap-to-begin/End
// button/open-close all live there now) — here the head rests on whatever
// platform is currently under it (no automatic bounce, just follows the
// scroll) across a stream of platforms scrolling right to left, instead of
// hud/pressConferenceGame's own flying-between-market-events graph. Only a
// click ever moves it: the exact same fixed base jump
// (BASE_LAUNCH_VELOCITY_PX_S) every time, sized to cover exactly one
// platform's own gap on its own — holding just repeats that same base jump
// over and over for as long as it's held (see step), letting the player
// stay airborne indefinitely; releasing lets gravity resume normally.
// Falling through a gap (missing every platform, or walking off one without
// jumping away in time) ends the round.

// scroll speed ramps up the longer the round is survived (same
// growth-over-time convention createLines.ts/makeJumpPath.ts already use
// for their own difficulty ramps), capped so it never gets literally
// unreactable
const SCROLL_SPEED_BASE_PX_S = 200;
const SCROLL_SPEED_GROWTH_PER_SEC = 4;
const SCROLL_SPEED_MAX_PX_S = 420;

export function getScrollSpeed(survivedMs: number): number {
  return Math.min(
    SCROLL_SPEED_MAX_PX_S,
    SCROLL_SPEED_BASE_PX_S + (survivedMs / 1000) * SCROLL_SPEED_GROWTH_PER_SEC,
  );
}

const GRAVITY_PX_S2 = 1400;
// collision-only hitbox radius — the drawn head dot is the shared engine's own
// fixed size (identical across every game built on it), not this value
const HITBOX_RADIUS = 8;
const TAIL_LAG_RATE = 10;

// platforms scroll in from the right at getScrollSpeed(survivedMs). Every
// small platform sits exactly one current base gap (see getBaseGapPx) past
// whatever the actual previous platform's own chain reference was,
// regardless of height change — every step is at most
// PLATFORM_STEP_MAX_DELTA_PX, well within what the fixed base jump
// (BASE_LAUNCH_VELOCITY_PX_S, no clicks) can clear. At random (never twice
// in a row), a FORK spawns instead: two platforms ±1 base jump off
// mainLineY, leaving mainLineY itself empty — forcing a choice of jumping
// up or down to keep going. Long (rest-stop) platforms are flat and wide,
// holding REST_PLATFORM_JUMP_COUNT bounces in place before the next
// small-platform run begins, and always sit at the SAME fixed mainLineY
// (never drifting) — their own chainFromX skips ahead by that many
// bounce-lengths so the visible gap after one is identical to the gap
// after any small platform. Only a click/tap ever adds MORE velocity than
// that fixed base — there is no other "auto boost"
export const PLATFORM_H = 2;
export const PLATFORM_COLOR = COLOR.white;

// a small (jump-segment) platform's own width shrinks the longer the round
// is survived — on top of the scroll speeding up, a narrower landing target
// is the other half of "harder over time", floored so it never becomes
// literally unlandable
const PLATFORM_WIDTH_BASE_PX = 50; // +25% over the original 40 — a bit more forgiving to start
const PLATFORM_WIDTH_MIN_PX = 26;
const PLATFORM_WIDTH_SHRINK_PX_PER_SEC = 0.6;

export function getPlatformWidth(survivedMs: number): number {
  return Math.max(
    PLATFORM_WIDTH_MIN_PX,
    PLATFORM_WIDTH_BASE_PX -
      (survivedMs / 1000) * PLATFORM_WIDTH_SHRINK_PX_PER_SEC,
  );
}

// the height (apex above a level platform) a same-height jump reaches with
// no extra tap/hold input — every gap is sized against this one number, so
// tightening/loosening the base jump only ever means changing it here
const BASE_JUMP_HEIGHT_PX = 40;
const BASE_LAUNCH_VELOCITY_PX_S = Math.sqrt(
  2 * GRAVITY_PX_S2 * BASE_JUMP_HEIGHT_PX,
);
// round-trip time for a same-height jump: up to the apex, then back down —
// purely vertical physics, so this stays constant regardless of how fast
// the world is currently scrolling
const BASE_FLIGHT_DURATION_S = (2 * BASE_LAUNCH_VELOCITY_PX_S) / GRAVITY_PX_S2;

// the horizontal distance one fixed-height/fixed-duration jump covers AT a
// given scroll speed — this is what makes every jump math result scale
// correctly as getScrollSpeed(survivedMs) ramps up: recompute this fresh
// (from the CURRENT speed) everywhere a gap is measured, never reuse a
// value computed at a different speed/time
export function getBaseGapPx(scrollSpeed: number): number {
  return scrollSpeed * BASE_FLIGHT_DURATION_S;
}

// how far (either direction) a SMALL platform's height may step from the
// previous platform's own height — exactly one base jump's apex height, the
// most the fixed base jump can climb in one go
export const PLATFORM_STEP_MAX_DELTA_PX = BASE_JUMP_HEIGHT_PX;

// a long (rest-stop) platform is flat and holds exactly this many
// un-boosted same-height bounces before the normal small-platform flow
// resumes — since headX never moves, a continuously-held bounce chain on
// one flat platform advances by exactly one current base gap of scroll per
// bounce, so this many bounces fit within getRestPlatformWidth below
export const REST_PLATFORM_JUMP_COUNT = 5;
// small margin so the head doesn't start flush against the platform's own
// left edge, and the last bounce still has a sliver of platform left to
// land on rather than landing exactly on its last pixel
const REST_PLATFORM_MARGIN_PX = 20;

// a rest platform must physically fit REST_PLATFORM_JUMP_COUNT bounces at
// whatever the CURRENT base gap is — unlike the small jump-segment
// platforms, this one is never deliberately shrunk for difficulty (doing so
// would make its own guaranteed bounce chain literally impossible), it just
// tracks the gap math above
export function getRestPlatformWidth(baseGapPx: number): number {
  return REST_PLATFORM_JUMP_COUNT * baseGapPx + REST_PLATFORM_MARGIN_PX * 2;
}
// how far past the right edge of the screen the platform queue is kept
// topped up to, so the next platform is always already placed instead of
// popping in right as it's needed
const SPAWN_LOOKAHEAD_BUFFER_PX = 200;

// this session's own accrued Secured Assets % — flat rate per second
// survived; landing on a neutral (white) platform itself grants nothing
// extra, only a green (upgrade) platform does (see below)
const AMBIENT_INFLUENCE_PERCENT_PER_SECOND =
  CONFIG.minigames.liquidateAssets.ambientInfluencePercentPerSecond;
// the one reward landing itself ever grants, on top of the ambient rate above
const GREEN_LINE_INFLUENCE_PERCENT =
  CONFIG.minigames.liquidateAssets.greenLineInfluencePercent;

export interface Platform {
  x: number;
  y: number; // height at the platform's own left edge
  // height at the platform's own right edge — equal to y unless this
  // platform is sloped
  endY: number;
  width: number;
  // where the NEXT platform's gap is measured from — always this
  // platform's own left edge (x), same convention for every platform
  // regardless of width, so a launch from anywhere on it always connects
  chainFromX: number;
  kind: "long" | "small";
  // upgrade/white mark from makeJumpPath — only ever set on a "small"
  // platform (jump-segment lines), never on a main/rest-stop line
  reward?: LineRewardKind;
}

// the platform's own surface height at a given world-x — constant for a
// flat platform, linearly interpolated between y and endY for a ramp
function heightAtX(platform: Platform, worldX: number): number {
  if (platform.width <= 0 || platform.endY === platform.y) return platform.y;
  const t = Math.min(1, Math.max(0, (worldX - platform.x) / platform.width));
  return platform.y + (platform.endY - platform.y) * t;
}

// draws a platform's surface as a quad whose top edge follows its own
// (x,y)-(x+width,endY) line and whose bottom edge is that same line
// shifted straight down by PLATFORM_H — for a flat platform (endY===y)
// this is pixel-identical to a plain fillRect, and for a sloped one it
// joins the adjacent flat/ramp segments with no visible seam, since they
// all share this exact same top/bottom convention at the shared edge
export function drawPlatformSurface(
  ctx: CanvasRenderingContext2D,
  platform: Platform,
): void {
  ctx.beginPath();
  ctx.moveTo(platform.x, platform.y);
  ctx.lineTo(platform.x + platform.width, platform.endY);
  ctx.lineTo(platform.x + platform.width, platform.endY + PLATFORM_H);
  ctx.lineTo(platform.x, platform.y + PLATFORM_H);
  ctx.closePath();
  ctx.fill();
}

interface LiquidateAssetsState extends MinigameState {
  // no longer part of the shared MinigameState — this game draws its own
  // profit line (see renderGraph/onOpen below), so it owns these itself
  velocityY: number;
  tailY: number;
  trail: number[];
  platforms: Platform[];
  platformsLanded: number;
  // resting on whatever platform is currently under headX — stays put with
  // no gravity, following the scroll, until either a click launches it away
  // or the platform scrolls out from underneath (see step)
  grounded: boolean;
  // alternates every spawn: false means the NEXT spawn is a whole jump
  // segment (see renderJumpLines), true means it's the following long/rest
  // platform
  nextIsLongPlatform: boolean;
  // the ONE shared height every single small platform spawns on exactly —
  // forks are the only ever deviation from it (+/-1 jump either side).
  // Reset whenever a long/rest platform spawns, to wherever THAT lands
  mainLineY: number;
  // the EXACT platform object currently being rested on — a fork's two
  // branches share the same x/width, so re-deriving "whichever platform is
  // at headX" via a plain find() always ambiguously picks the first one in
  // the array (the fork's top branch) even when the bottom one was what
  // was actually landed on
  groundedPlatform: Platform | null;
  // false only while falling from a platform that scrolled out from under
  // headX with NO click (pure gravity resume, launch velocity never went
  // negative) — used to stop that passive fall from landing back on a
  // same-height-or-higher platform it never actually jumped to reach
  jumpedThisFlight: boolean;
  // the height passively fallen FROM (see jumpedThisFlight) — only a
  // platform strictly below this is a valid landing during that fall
  passiveFallOriginY: number;
}

export function createLiquidateAssetsGameMarkup(): string {
  return `
    <div class="press-conference-game liquidate-assets-game" id="liquidate-assets-game" hidden>
      <div class="press-conference-game__header">
        <h2>Secure stock price</h2>
      </div>
      <div class="press-conference-game__score" id="liquidate-assets-game-score">
        <div id="liquidate-assets-game-timer">0.0s</div>
      </div>
      <div class="press-conference-game__influence" id="liquidate-assets-game-influence">
        <span class="press-conference-game__influence-label">Secured assets</span>
        <span id="liquidate-assets-game-influence-value">+0.00% ▲</span>
      </div>
      <canvas class="press-conference-game__canvas" id="liquidate-assets-game-canvas"></canvas>
    </div>
  `;
}

export type LiquidateAssetsGame = ConferenceMinigame;

export function wireLiquidateAssetsGame(
  container: HTMLElement,
  onClose?: () => void,
): LiquidateAssetsGame {
  function freshState(): LiquidateAssetsState {
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
      platforms: [],
      platformsLanded: 0,
      grounded: true,
      nextIsLongPlatform: false,
      mainLineY: 0,
      groundedPlatform: null,
      jumpedThisFlight: false,
      passiveFallOriginY: 0,
    };
  }

  // the line's own starting height, used only to seed the very first
  // (starter) platform — every platform after that just steps off whatever
  // came before it, computed fresh from the current floor position so it
  // stays correct across resizes. The extra 200 lifts the whole game
  // (platforms + line) further above the floor
  function getPlatformY(floorTopY: number): number {
    return floorTopY - PLATFORM_H - 24 - 200;
  }

  // a long (rest-stop) platform — always at the SAME state.mainLineY every
  // time (never randomized/drifting), so a cycle's ending main line always
  // returns to wherever the segment's own starting main line was. Flat and
  // wide enough to hold REST_PLATFORM_JUMP_COUNT bounces in place, sized
  // fresh off the CURRENT base gap (see getBaseGapPx) so it stays correct
  // as scroll speed ramps up — the jump segment's drift is clamped to the
  // same PLATFORM_STEP_MAX_DELTA_PX range any small-platform step already
  // clears, so there's nothing special about this particular hop. Its own
  // chainFromX skips ahead by that many base gaps (not its literal left
  // edge) so the visible gap after it matches every other gap exactly
  // instead of being eaten by its extra width
  function spawnLongPlatform(
    state: LiquidateAssetsState,
    previous: Platform,
  ): void {
    const baseGapPx = getBaseGapPx(getScrollSpeed(state.survivedMs));
    const y = state.mainLineY;
    const x = previous.chainFromX + baseGapPx;
    state.platforms.push({
      x,
      y,
      endY: y,
      width: getRestPlatformWidth(baseGapPx),
      chainFromX: x + REST_PLATFORM_JUMP_COUNT * baseGapPx,
      kind: "long",
    });
  }

  // alternates a whole jump segment (renderJumpLines, anchored on
  // state.mainLineY) with a long rest stop, over and over — see
  // nextIsLongPlatform on the state. ctx is null outside a render pass
  // (e.g. the initial queue fill in onOpen), which just skips drawing —
  // the returned platforms still get added to the collision queue either way
  function spawnNextPlatform(
    state: LiquidateAssetsState,
    previous: Platform,
    ctx: CanvasRenderingContext2D | null,
  ): void {
    if (state.nextIsLongPlatform) {
      spawnLongPlatform(state, previous);
    } else {
      state.platforms.push(
        ...renderJumpLines(
          ctx,
          previous.chainFromX,
          state.mainLineY,
          state.survivedMs,
        ),
      );
    }
    state.nextIsLongPlatform = !state.nextIsLongPlatform;
  }

  // keeps spawning off the last queued platform until the queue extends past
  // the right edge of the screen (plus a buffer), so the next platform is
  // always already placed instead of appearing right as it's needed
  function fillPlatformQueue(
    state: LiquidateAssetsState,
    cssW: number,
    ctx: CanvasRenderingContext2D | null,
  ): void {
    let last = state.platforms.at(-1);
    if (!last) return;
    let guard = 0;
    while (
      last.x + last.width < cssW + SPAWN_LOOKAHEAD_BUFFER_PX &&
      guard++ < 20
    ) {
      spawnNextPlatform(state, last, ctx);
      last = state.platforms.at(-1)!;
    }
  }

  return wireConferenceMinigame<LiquidateAssetsState>(container, {
    elements: {
      screenId: "liquidate-assets-game",
      canvasId: "liquidate-assets-game-canvas",
      timerId: "liquidate-assets-game-timer",
      scoreId: "liquidate-assets-game-score",
      influenceValueId: "liquidate-assets-game-influence-value",
    },
    createState: freshState,

    onOpen: (state, cssW, _cssH, getFloorTopY) => {
      // the line starts resting right on top of a wide starter platform
      // (not falling onto it) — sized to hold REST_PLATFORM_JUMP_COUNT
      // un-boosted bounces before the normal small-platform flow takes
      // over, same chainFromX-skips-ahead convention as spawnLongPlatform.
      // survivedMs is always 0 here (a fresh round), so this uses the
      // round's own starting speed/gap
      const headX = cssW / 2 - HEAD_X_OFFSET_FROM_CENTER;
      const platformY = getPlatformY(getFloorTopY());
      const starterX = headX - REST_PLATFORM_MARGIN_PX;
      const baseGapPx = getBaseGapPx(getScrollSpeed(state.survivedMs));
      const starter: Platform = {
        x: starterX,
        y: platformY,
        endY: platformY,
        width: getRestPlatformWidth(baseGapPx),
        chainFromX: starterX + REST_PLATFORM_JUMP_COUNT * baseGapPx,
        kind: "long",
      };
      state.platforms = [starter];
      state.headY = platformY - HITBOX_RADIUS;
      state.tailY = state.headY;
      state.trail = new Array(computeMaxTrailLength(cssW)).fill(state.headY);
      state.grounded = true;
      state.groundedPlatform = starter;
      state.mainLineY = platformY;
      fillPlatformQueue(state, cssW, null);
    },

    step: (state, dtMs, cssW, _cssH, getFloorTopY, ctx) => {
      const dt = dtMs / 1000;
      const headYBefore = state.headY;
      const headX = cssW / 2 - HEAD_X_OFFSET_FROM_CENTER;

      // holding launches away from rest; gravity always applies normally
      // once airborne (see the real-platform-landing check below for how
      // holding then repeats the jump, rather than resting)
      if (state.grounded) {
        if (state.holding) {
          state.grounded = false;
          state.velocityY = -BASE_LAUNCH_VELOCITY_PX_S;
          state.jumpedThisFlight = true;
        } else {
          // just sits at whatever platform it actually landed on, at ITS
          // current height there (heightAtX, not a constant platform.y) —
          // a sloped platform changes height as it scrolls by, which is
          // exactly how the line climbs/drops without a jump. Uses the
          // specific groundedPlatform, not a fresh lookup by x — a fork's
          // two branches share the same x/width, so a plain lookup would
          // always ambiguously resolve to whichever branch is first in the
          // array regardless of which one was actually landed on
          state.velocityY = 0;
          if (state.groundedPlatform) {
            state.headY =
              heightAtX(state.groundedPlatform, headX) - HITBOX_RADIUS;
          }
        }
      }
      if (!state.grounded) {
        // exact kinematic update (y += v*dt + 0.5*a*dt^2, v += a*dt), not
        // Euler's "move by the already-updated velocity" shortcut — Euler
        // systematically overshoots downward by 0.5*a*dt^2 every single
        // frame, which drifts the real trajectory away from the exact
        // parabola the platform gap was derived from, eventually missing
        // after enough accumulated frames in one flight
        state.headY += state.velocityY * dt + 0.5 * GRAVITY_PX_S2 * dt * dt;
        state.velocityY += GRAVITY_PX_S2 * dt;
      }
      state.survivedMs += dtMs;

      // while grounded (flat or sloped), the trail must hug the platform
      // surface EXACTLY — the usual lag/smoothing below is tuned for a
      // parabolic jump arc, and applying it while walking a ramp draws the
      // recorded trail along a visibly different path than the platform
      // itself (looks like a forked "branch" instead of one line)
      if (state.grounded) {
        state.tailY = state.headY;
      } else {
        state.tailY +=
          (state.headY - state.tailY) * (1 - Math.exp(-TAIL_LAG_RATE * dt));
      }
      // read once per frame (survivedMs was just updated above) and reused
      // for both the trail's own advance rate and the platform scroll below
      // — they must always move at the exact same speed, or the trail
      // visibly desyncs from the platforms it's supposed to be following
      const scrollSpeed = getScrollSpeed(state.survivedMs);
      advanceTrail(
        state,
        scrollSpeed * dt,
        state.tailY,
        TRAIL_SAMPLE_DX,
        computeMaxTrailLength(cssW),
      );

      const scrollDx = scrollSpeed * dt;
      shiftActiveFloatingTexts(scrollDx);
      // chainFromX must scroll in lockstep with x — otherwise it goes stale
      // between this platform's own creation and whenever the NEXT one
      // spawns off it, inflating the live gap beyond the current base gap
      // (see getBaseGapPx) by however much scrolled in between
      for (const platform of state.platforms) {
        platform.x -= scrollDx;
        platform.chainFromX -= scrollDx;
      }
      state.platforms = state.platforms.filter(
        (platform) => platform.x + platform.width > 0,
      );

      fillPlatformQueue(state, cssW, ctx);

      // still resting only if the SAME platform it landed on still spans
      // headX — otherwise it just scrolled out from underneath, so gravity
      // resumes
      const groundedSpanContainsHeadX =
        state.groundedPlatform !== null &&
        headX + HITBOX_RADIUS > state.groundedPlatform.x &&
        headX - HITBOX_RADIUS <
          state.groundedPlatform.x + state.groundedPlatform.width;
      if (state.grounded && !groundedSpanContainsHeadX) {
        // a passive scroll-off, never an active launch — starts this
        // flight's headY already sitting exactly at the crossing check's
        // own tolerance band for its OWN platform's height, so without
        // recording where it fell from and excluding that height below,
        // the very next same-height (or higher) platform reads as
        // "crossed" the instant it scrolls into range, even though gravity
        // alone can never actually climb back up to it
        state.jumpedThisFlight = false;
        state.passiveFallOriginY = state.groundedPlatform
          ? heightAtX(state.groundedPlatform, headX)
          : state.headY + HITBOX_RADIUS;
        state.grounded = false;
        state.groundedPlatform = null;
      }

      // landing: only while actually falling (never mid-rise, never already
      // resting), the platform's own surface was crossed SOMEWHERE between
      // last frame's headY and this frame's (not just "currently
      // overlapping" it) so a big single-frame step can never tunnel clean
      // through a thin platform, and headX falls within its horizontal span.
      // A fork's two platforms share the same x, so a single frame's sweep
      // can cross BOTH — picking the first array match (always the fork's
      // TOP one, pushed first) meant dropping to the bottom line always
      // resolved to the top one instead; picking whichever crossed
      // platform's own height is closest to where the head actually ends
      // up this frame lands on the one the fall really reached
      if (!state.grounded && state.velocityY >= 0) {
        let landedOn: Platform | undefined;
        let landedOnTop = 0;
        for (const platform of state.platforms) {
          const withinX =
            headX + HITBOX_RADIUS > platform.x &&
            headX - HITBOX_RADIUS < platform.x + platform.width;
          const platformTop = heightAtX(platform, headX);
          const crossedTop =
            headYBefore - HITBOX_RADIUS <= platformTop &&
            state.headY + HITBOX_RADIUS >= platformTop;
          // a passive (never-jumped) fall starts already sitting at this
          // exact crossing tolerance for its OWN platform's height — only a
          // platform strictly below where it fell from is a REAL drop;
          // anything at or above that would need an actual jump to reach
          const reachableWithoutJumping =
            state.jumpedThisFlight || platformTop > state.passiveFallOriginY;
          if (
            withinX &&
            crossedTop &&
            reachableWithoutJumping &&
            (!landedOn ||
              Math.abs(platformTop - state.headY) <
                Math.abs(landedOnTop - state.headY))
          ) {
            landedOn = platform;
            landedOnTop = platformTop;
          }
        }
        if (landedOn) {
          state.headY = landedOnTop - HITBOX_RADIUS;
          state.groundedPlatform = landedOn;
          if (state.holding) {
            // still held right as it lands — bounce again immediately
            // instead of resting, repeating the jump on THIS real
            // platform only (holding over a gap with nothing to land on
            // never bounces; gravity just keeps pulling it down)
            state.velocityY = -BASE_LAUNCH_VELOCITY_PX_S;
            state.jumpedThisFlight = true;
          } else {
            // just rests here — no automatic bounce; only a click (see
            // step's holding check above) ever moves it again
            state.velocityY = 0;
            state.grounded = true;
          }
          state.platformsLanded += 1;
          // only a green (upgrade) landing grants anything (coin burst + the
          // purchase sfx, since it's the one landing that actually reads as
          // a windfall) — a neutral (white) landing is just... landing,
          // relying on the ambient per-second rate alone. Playing the
          // purchase sfx on EVERY landing (not just this one) fired it on
          // nearly every click while holding/bouncing continuously
          if (landedOn.reward === "upgrade") {
            state.marketInfluencePercent += GREEN_LINE_INFLUENCE_PERCENT;
            playSold();
            spawnFloatingText(
              landedOn.x + landedOn.width / 2,
              landedOnTop,
              GREEN_LINE_INFLUENCE_PERCENT,
            );
          }
        }
      }

      state.marketInfluencePercent += AMBIENT_INFLUENCE_PERCENT_PER_SECOND * dt;

      // fell clean through a gap (past every platform, nothing left to catch
      // it) — the floor riser's own top edge is the bound, not the raw
      // canvas bottom, so the head never visually sinks into the audience
      if (state.headY - HITBOX_RADIUS > getFloorTopY()) {
        state.running = false;
        state.gameOver = true;
      }
      if (state.headY <= 0) {
        state.headY = 0;
        state.velocityY = Math.max(0, state.velocityY);
      }
    },

    renderGraph: (ctx, state, headX, now) => {
      drawMainLine(ctx, state.platforms);
      drawShortLine(ctx, state.platforms);
      drawActiveFloatingTexts(ctx, now);
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
    },

    onTap: (state) => {
      // velocity itself is entirely handled by the state.holding check in
      // step() (it fires next frame, which is imperceptible) — this only
      // plays the tap's sound, and skips it while actually falling in the
      // air (not resting, not rising), when a tap has no effect at all
      if (!state.grounded && state.velocityY >= 0) return;
      playBubble();
    },

    onGameOver: (state) => {
      addSecuredAssetsPercent(state.marketInfluencePercent);
    },

    onClose: onClose,
  });
}
