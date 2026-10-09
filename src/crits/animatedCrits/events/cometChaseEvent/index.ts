// the "Comet Chase" event (flight; cash), a flight-stage event (see
// ../../flightStage): its crit's click dives the view into space, chasing a
// huge comet weaving ahead, its glitter tail streaming back. Chunks it sheds
// rush at the view and the guns pop them one after another, each paying
// into the live total; then both beams lock on and blow it apart from the
// end of its tail up to its head in a rattling chain, a huge blast last
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { multiply } from "../../../../shared/bigNumber";
import { drawBeam } from "../../../../shared/beam";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation } from "../../../../shared/explosion";
import {
  playCritExplosion,
  playExplosion,
} from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { pulseHudTotalFlash } from "../../../../shared/totalIncomeCoins";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import { clamp01, lerp } from "../../../../shared/easing";
import {
  drawWisp,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { addTotalIncome } from "../../../../totalIncome";
import { rewardPayoutAmount } from "../../../../floors/incomePanel";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import {
  canStartFlightStage,
  flightGuns,
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

const KEY = "cometChase";

// the comet: its depth, its weave (screen widths from the middle at depth
// 1) and size
const DEPTH = 6;
const WEAVE_X = 0.72;
const WEAVE_Y = 0.24;
const RIDE = -0.2;
const COMET = 3;
// its tail: glitter trailing back along where it's been, lagging this much
// a bit, spreading wider and fading smaller (of the screen's width)
const TAIL_BITS = 30;
const TAIL_LAG = 25;
const TAIL_SPREAD = 0.176;
const TAIL_DROP = 0.0064;
const TAIL_BIT = 0.072;
// the chunks it sheds: the first (ms into the flight) and the gap to the
// next, their rush at the view, how far they fly out (screen widths at
// depth 1) and where they're shot
const CHUNKS = 9;
const FIRST_SHED = 250;
const SHED_EVERY = 170;
const CHUNK_MS = 420;
const CHUNK_SHOT_AT = 2.4;
const CHUNK_OUT_X = 0.48;
const CHUNK_OUT_Y = 0.32;
const CHUNK = 1.2;
// the lock: after the last chunk, the beams hold on it, then blasts walk up
// its tail from the end to its head, a beat apart, and it blows
const LOCK_AFTER = 200;
const LOCK_LEAD = 150;
const TAIL_BLASTS = 8;
const TAIL_STEP_MS = 60;
const POP_GAP = 45;
const BOOM_AFTER = 60;
const SHOT_MS = 60;
const SHOT_W = 0.018;
const LOCK_W = 0.029;
// blasts (of the screen's width) and shakes
const CHUNK_BLAST = 0.16;
const TAIL_BLAST = 0.13;
const TAIL_BLAST_GROW = 0.012;
const BOOM = 0.35;
const SHAKE = 0.7;
const BOOM_SHAKE = 2.6;
const AFTER = 500;

interface Chunk {
  shed: number;
  pop: number;
  angle: number;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.cometChaseEvent.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) => floor.unlocked && canStartFlightStage(context),
    arm: startCometChase,
  },
  { label: "Comet Chase", color: COLOR.revealBlue },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Comet Chase
export function forceCometChaseEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

// the comet's weave, screen widths from the middle at depth 1
const weaveX = (ms: number) => Math.sin(ms * 0.0018) * WEAVE_X;
const weaveY = (ms: number) => RIDE + Math.cos(ms * 0.0013) * WEAVE_Y;
const cometAt = (view: FlightView, ms: number): Point =>
  project(view, weaveX(ms), weaveY(ms), DEPTH);

// a chunk rushing out of where the comet shed it, at the view
function chunkAt(view: FlightView, chunk: Chunk, ms: number): Point {
  const p = clamp01((ms - chunk.shed) / CHUNK_MS);
  // its spot on screen stays put as it nears, plus the fling outward
  const z = lerp([DEPTH, CHUNK_SHOT_AT], p);
  const k = z / DEPTH;
  return project(
    view,
    weaveX(chunk.shed) * k + Math.cos(chunk.angle) * CHUNK_OUT_X * p,
    weaveY(chunk.shed) * k + Math.sin(chunk.angle) * CHUNK_OUT_Y * p,
    z,
  );
}

function startCometChase(floor: Floor, context: EventProcContext): void {
  const { payoutsPerChunk, payoutsComet } = CONFIG.cometChaseEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const chunks: Chunk[] = Array.from({ length: CHUNKS }, (_, k) => {
    const shed = FIRST_SHED + k * SHED_EVERY;
    return { shed, pop: shed + CHUNK_MS, angle: hash01(k, 7701) * Math.PI * 2 };
  });
  const lockAt = chunks[CHUNKS - 1].pop + LOCK_AFTER;
  const tailAt = (j: number) => lockAt + j * POP_GAP;
  const boomAt = tailAt(TAIL_BLASTS) + BOOM_AFTER;
  const flyMs = boomAt + AFTER;
  const pay = (payouts: number) => {
    addTotalIncome(multiply(rewardPayoutAmount(floor, Date.now()), payouts));
    pulseHudTotalFlash();
  };
  const popped = createBeats(
    chunks,
    (c) => c.pop,
    () => {
      playExplosion();
      shakeScreen(SHAKE);
      pay(payoutsPerChunk);
    },
  );
  const tailBlasts = Array.from({ length: TAIL_BLASTS }, (_, j) => j);
  const rattled = createBeats(tailBlasts, tailAt, () => shakeScreen(SHAKE));
  let boomed = false;
  startFlightStage(
    KEY,
    floor,
    context,
    {
      flyMs,
      draw: (ctx, view, ms, now) => {
        if (ms < 0) return;
        popped.tick(ms, now);
        rattled.tick(ms, now);
        if (!boomed && ms >= boomAt) {
          boomed = true;
          playCritExplosion();
          shakeScreen(BOOM_SHAKE);
          pay(payoutsComet);
        }
        const guns = flightGuns(view);
        if (ms < boomAt) {
          // the tail: glitter streaming back along where it's been
          const previous = ctx.globalCompositeOperation;
          ctx.globalCompositeOperation = "lighter";
          for (let j = 0; j < TAIL_BITS; j++) {
            const at = cometAt(view, ms - j * TAIL_LAG);
            const spread = (j / TAIL_BITS) * TAIL_SPREAD * view.w;
            stampGlimmer(
              ctx,
              at.x + Math.sin(j * 2.3 + ms * 0.01) * spread,
              at.y + j * TAIL_DROP * view.w,
              view.w * TAIL_BIT * (1 - j / TAIL_BITS / 1.5),
              j + ms * 0.004,
              j % 3 ? COLOR.heavenlyGold : COLOR.white,
            );
          }
          ctx.globalCompositeOperation = previous;
          drawWisp(ctx, (t) => cometAt(view, t), ms, now, WISP_SIZE * COMET, 1);
        }
        for (const c of chunks) {
          drawWispBetween(
            ctx,
            (t) => chunkAt(view, c, t),
            ms,
            now,
            WISP_SIZE * CHUNK,
            0.5,
            c.shed,
            c.pop,
          );
          const since = ms - (c.pop - SHOT_MS);
          if (since >= 0 && since < SHOT_MS) {
            const to = chunkAt(view, c, ms);
            for (const gun of guns)
              drawBeam(ctx, gun, to, view.w * SHOT_W, 1 - since / SHOT_MS);
          }
          drawDetonation(
            ctx,
            chunkAt(view, c, c.pop),
            ms - c.pop,
            view.w * CHUNK_BLAST,
            now,
          );
        }
        // the lock: both beams on it, then its tail blowing up to its head
        if (ms >= lockAt - LOCK_LEAD && ms < boomAt) {
          const to = cometAt(view, ms);
          for (const gun of guns) drawBeam(ctx, gun, to, view.w * LOCK_W, 0.9);
        }
        for (const j of tailBlasts)
          drawDetonation(
            ctx,
            cometAt(view, tailAt(j) - (TAIL_BLASTS - j) * TAIL_STEP_MS),
            ms - tailAt(j),
            view.w * (TAIL_BLAST + j * TAIL_BLAST_GROW),
            now,
          );
        drawDetonation(
          ctx,
          cometAt(view, boomAt),
          ms - boomAt,
          view.w * BOOM,
          now,
        );
      },
      onEnd: () => {
        // any chunk a dropped frame skipped still pays
        popped.tick(Infinity, performance.now());
        context.applyTierCrit?.(floor, tier);
        endEventProc(KEY);
      },
    },
    { spotlightTotal: true },
  );
}
