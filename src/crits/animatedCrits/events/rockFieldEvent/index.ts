// the "Rock Field" event (flight; cash), a flight-stage event (see
// ../../flightStage): its crit's click dives the view into space, where
// rocks of glitter rush at it out of the distance. Twin beams from the
// screen's bottom corners crack each into chunks that fly apart and burst
// one after another in a quick cluster of blasts, every chunk paying into
// the live total; the last huge rock splits eight ways, then the view
// crash-lands back on the floors
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { multiply } from "../../../../shared/bigNumber";
import { drawBeam } from "../../../../shared/beam";
import { drawMuzzleFlash } from "../../../../shared/bullets";
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
import type { Point } from "../../../../shared/wisp";
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

const KEY = "rockField";

// the rocks: when each is shot (ms into the flight), the last the big one;
// where they fly (screen widths from its middle at depth 1, so spread across
// the view where they're shot), their rush in from FAR, and their chunks
const SHOTS = [500, 900, 1300, 1700, 2250];
const LANE_X = 1;
const LANE_Y = 0.6;
const FAR = 12;
const SHOT_AT = 2.4;
const BIG_SHOT_AT = 2.8;
const APPROACH_MS = 900;
const CHUNKS = 4;
const BIG_CHUNKS = 8;
// a rock's glitter: how many bits, its radius (of the screen's width at
// depth 1); each bit is BIT of that
const BITS = 24;
const ROCK_R = 1.2;
const BIG_ROCK_R = 2.1;
const BIT = 0.35;
// the chunks: their glitter, radius (of the screen's width), how fast they
// fly apart (of its width a ms), when the first bursts and the gap after
const CHUNK_BITS = 12;
const CHUNK_R = 0.064;
const BIG_CHUNK_R = 0.096;
const CHUNK_SPEED = 0.0006;
const BIG_CHUNK_SPEED = 0.0009;
const FIRST_POP = 120;
const POP_EVERY = 45;
// the guns at the screen's bottom corners and their beams
const GUN_X = 0.12;
const GUN_Y = 0.94;
const BEAM_LEAD = 100;
const BEAM_MS = 160;
const BEAM_W = 40;
const FLASH_MS = 140;
const FLASH = 180;
// blasts (of the screen's width) and shakes
const CRACK = 0.2;
const BIG_CRACK = 0.35;
const POP = 0.12;
const BIG_POP = 0.18;
const CRACK_SHAKE = 1;
const BIG_SHAKE = 2.2;
const POP_SHAKE = 0.6;
const AFTER = 400;

interface Rock {
  x: number;
  y: number;
  shot: number;
  depth: number;
  chunks: number;
  big: boolean;
}

interface Pop {
  rock: Rock;
  angle: number;
  at: number;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.rockFieldEvent.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) => floor.unlocked && canStartFlightStage(context),
    arm: startRockField,
  },
  { label: "Rock Field", color: COLOR.revealBlue },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Rock Field
export function forceRockFieldEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

function planRocks(): Rock[] {
  return SHOTS.map((shot, i) => {
    const big = i === SHOTS.length - 1;
    return {
      x: big ? 0 : (hash01(i, 7101) * 2 - 1) * LANE_X,
      y: big ? -0.03 : (hash01(i, 7102) * 2 - 1) * LANE_Y,
      shot,
      depth: big ? BIG_SHOT_AT : SHOT_AT,
      chunks: big ? BIG_CHUNKS : CHUNKS,
      big,
    };
  });
}

const depthOf = (rock: Rock, ms: number) =>
  lerp(
    [FAR, rock.depth],
    clamp01((ms - rock.shot + APPROACH_MS) / APPROACH_MS),
  );
const rockAt = (view: FlightView, rock: Rock, ms: number): Point =>
  project(view, rock.x, rock.y, depthOf(rock, ms));

// a chunk flying out of where its rock cracked
function chunkAt(view: FlightView, pop: Pop, ms: number): Point {
  const from = rockAt(view, pop.rock, pop.rock.shot);
  const reach =
    Math.max(0, ms - pop.rock.shot) *
    view.w *
    (pop.rock.big ? BIG_CHUNK_SPEED : CHUNK_SPEED);
  return {
    x: from.x + Math.cos(pop.angle) * reach,
    y: from.y + Math.sin(pop.angle) * reach,
  };
}

// a lump of glitter `r` px round, each bit BIT of that
function drawGlitterLump(
  ctx: CanvasRenderingContext2D,
  at: Point,
  r: number,
  bits: number,
  seed: number,
  now: number,
): void {
  for (let i = 0; i < bits; i++) {
    const a = hash01(i, seed) * Math.PI * 2;
    const d = Math.sqrt(hash01(i, seed + 1)) * r;
    stampGlimmer(
      ctx,
      at.x + Math.cos(a) * d,
      at.y + Math.sin(a) * d * 0.8,
      r * BIT,
      now * 0.001 + i,
      i % 3 ? COLOR.heavenlyGold : COLOR.white,
    );
  }
}

function startRockField(floor: Floor, context: EventProcContext): void {
  const { payoutsPerChunk } = CONFIG.rockFieldEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const rocks = planRocks();
  const pops: Pop[] = rocks.flatMap((rock) =>
    Array.from({ length: rock.chunks }, (_, j) => ({
      rock,
      angle: (j / rock.chunks) * Math.PI * 2 + hash01(rock.shot, j),
      at: rock.shot + FIRST_POP + j * POP_EVERY,
    })),
  );
  const flyMs = Math.max(...pops.map((p) => p.at)) + AFTER;
  const cracks = createBeats(
    rocks,
    (r) => r.shot,
    (r) => {
      if (r.big) playCritExplosion();
      else playExplosion();
      shakeScreen(r.big ? BIG_SHAKE : CRACK_SHAKE);
    },
  );
  const popped = createBeats(
    pops,
    (p) => p.at,
    () => {
      shakeScreen(POP_SHAKE);
      addTotalIncome(
        multiply(rewardPayoutAmount(floor, Date.now()), payoutsPerChunk),
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
        cracks.tick(ms, now);
        popped.tick(ms, now);
        const guns = [
          { x: view.x + view.w * GUN_X, y: view.y + view.h * GUN_Y },
          { x: view.x + view.w * (1 - GUN_X), y: view.y + view.h * GUN_Y },
        ];
        const previous = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = "lighter";
        for (const rock of rocks) {
          if (ms < rock.shot - APPROACH_MS || ms >= rock.shot) continue;
          const z = depthOf(rock, ms);
          drawGlitterLump(
            ctx,
            rockAt(view, rock, ms),
            (view.w * (rock.big ? BIG_ROCK_R : ROCK_R)) / z,
            BITS,
            rock.shot,
            now,
          );
        }
        for (const pop of pops)
          if (ms >= pop.rock.shot && ms < pop.at)
            drawGlitterLump(
              ctx,
              chunkAt(view, pop, ms),
              view.w * (pop.rock.big ? BIG_CHUNK_R : CHUNK_R),
              CHUNK_BITS,
              pop.at,
              now,
            );
        ctx.globalCompositeOperation = previous;
        for (const rock of rocks) {
          const to = rockAt(view, rock, rock.shot);
          const since = ms - (rock.shot - BEAM_LEAD);
          if (since >= 0 && since < BEAM_MS)
            for (const gun of guns) {
              drawBeam(ctx, gun, to, BEAM_W, 1 - since / BEAM_MS);
              drawMuzzleFlash(
                ctx,
                gun,
                Math.atan2(to.y - gun.y, to.x - gun.x),
                since / FLASH_MS,
                FLASH,
              );
            }
          drawDetonation(
            ctx,
            to,
            ms - rock.shot,
            view.w * (rock.big ? BIG_CRACK : CRACK),
            now,
          );
        }
        for (const pop of pops)
          drawDetonation(
            ctx,
            chunkAt(view, pop, pop.at),
            ms - pop.at,
            view.w * (pop.rock.big ? BIG_POP : POP),
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
