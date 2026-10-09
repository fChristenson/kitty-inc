// the "Fireworks Flight" event (flight; cash), a flight-stage event (see
// ../../flightStage): its crit's click dives the view into space, where it
// flies through a fireworks show: shells streak up out of the dark below
// and burst all round it into glitter chrysanthemums that fly apart and
// droop, each paying into the live total, quicker and quicker, then a
// finale of six bursting at once
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { multiply } from "../../../../shared/bigNumber";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation } from "../../../../shared/explosion";
import {
  playCritExplosion,
  playExplosion,
} from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { pulseHudTotalFlash } from "../../../../shared/totalIncomeCoins";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { addTotalIncome } from "../../../../totalIncome";
import { rewardPayoutAmount } from "../../../../floors/incomePanel";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import {
  canStartFlightStage,
  isFlightStageRunning,
  project,
  startFlightStage,
  type FlightView,
} from "../../flightStage";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";

const KEY = "fireworksFlight";

// the shells: the first bursts (ms into the flight), the gap to the next
// shrinking by QUICKEN each time; then the finale's six, a beat apart
const SHOW = 6;
const FINALE = 6;
const FIRST_BURST = 400;
const BURST_GAP = 260;
const QUICKEN = 20;
const FINALE_AT = 1900;
const FINALE_EVERY = 40;
// where they burst (screen widths from its middle at depth 1, and depth),
// where they rise from, how long they take
const SPREAD_X = 0.96;
const HIGH = -0.32;
const HIGH_SPREAD = 0.4;
const DEPTH: [number, number] = [3, 6];
const RISE_FROM = 1.44;
const RISE_MS = 450;
const SHELL = 3;
// a chrysanthemum: its stars, how far they fly (screen widths at depth 1),
// how far they droop, its life and each star's size (of the screen's width
// at depth 1)
const STARS = 26;
const REACH = 0.68;
const FINALE_REACH = 0.88;
const DROOP = 0.4;
const BLOOM_MS = 900;
const STAR = 0.176;
// blasts (of the screen's width at depth 1) and shakes
const BLAST = 0.56;
const FINALE_BLAST = 0.72;
const SHAKE = 0.9;
const FINALE_SHAKE = 1.6;

interface Shell {
  x: number;
  y: number;
  z: number;
  burst: number;
  finale: boolean;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.fireworksFlightEvent.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) => floor.unlocked && canStartFlightStage(context),
    arm: startFireworksFlight,
  },
  { label: "Fireworks Flight", color: COLOR.revealBlue },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Fireworks Flight
export function forceFireworksFlightEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

function planShells(): Shell[] {
  return Array.from({ length: SHOW + FINALE }, (_, k) => {
    const finale = k >= SHOW;
    return {
      x: (hash01(k, 7501) - 0.5) * 2 * SPREAD_X,
      y: HIGH - hash01(k, 7502) * HIGH_SPREAD,
      z: lerp(DEPTH, hash01(k, 7503)),
      burst: finale
        ? FINALE_AT + (k - SHOW) * FINALE_EVERY
        : FIRST_BURST + k * (BURST_GAP - k * QUICKEN),
      finale,
    };
  });
}

function drawBloom(
  ctx: CanvasRenderingContext2D,
  view: FlightView,
  shell: Shell,
  ms: number,
): void {
  const t = (ms - shell.burst) / BLOOM_MS;
  if (t < 0 || t >= 1) return;
  const reach = (1 - (1 - t) ** 3) * (shell.finale ? FINALE_REACH : REACH);
  const size = (view.w * STAR) / shell.z;
  ctx.globalAlpha = 1 - t;
  for (let j = 0; j < STARS; j++) {
    const a = (j / STARS) * Math.PI * 2;
    const at = project(
      view,
      shell.x + Math.cos(a) * reach,
      shell.y + Math.sin(a) * reach + t * t * DROOP,
      shell.z,
    );
    stampGlimmer(
      ctx,
      at.x,
      at.y,
      size,
      a,
      j % 2 ? COLOR.heavenlyGold : COLOR.white,
    );
  }
  ctx.globalAlpha = 1;
}

function startFireworksFlight(floor: Floor, context: EventProcContext): void {
  const { payoutsPerShell } = CONFIG.fireworksFlightEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const shells = planShells();
  const flyMs = Math.max(...shells.map((s) => s.burst)) + BLOOM_MS;
  let finaled = false;
  const bursts = createBeats(
    shells,
    (s) => s.burst,
    (s) => {
      if (!s.finale) playExplosion();
      else if (!finaled) {
        finaled = true;
        playCritExplosion();
      }
      shakeScreen(s.finale ? FINALE_SHAKE : SHAKE);
      addTotalIncome(
        multiply(rewardPayoutAmount(floor, Date.now()), payoutsPerShell),
      );
      pulseHudTotalFlash();
    },
  );
  startFlightStage(
    KEY,
    floor,
    context,
    {
      flyMs,
      draw: (ctx, view, ms, now) => {
        if (ms < 0) return;
        bursts.tick(ms, now);
        for (const s of shells)
          drawWispBetween(
            ctx,
            (t) =>
              t < s.burst - RISE_MS
                ? null
                : project(
                    view,
                    s.x,
                    lerp(
                      [RISE_FROM, s.y],
                      smoothstep(clamp01((t - s.burst + RISE_MS) / RISE_MS)),
                    ),
                    s.z,
                  ),
            ms,
            now,
            (WISP_SIZE * SHELL) / s.z,
            0.6,
            s.burst - RISE_MS,
            s.burst,
          );
        const previous = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = "lighter";
        for (const s of shells) drawBloom(ctx, view, s, ms);
        ctx.globalCompositeOperation = previous;
        for (const s of shells)
          drawDetonation(
            ctx,
            project(view, s.x, s.y, s.z),
            ms - s.burst,
            (view.w * (s.finale ? FINALE_BLAST : BLAST)) / s.z,
            now,
          );
      },
      onEnd: () => {
        // any shell a dropped frame skipped still pays
        bursts.tick(Infinity, performance.now());
        context.applyTierCrit?.(floor, tier);
        endEventProc(KEY);
      },
    },
    { spotlightTotal: true },
  );
}
