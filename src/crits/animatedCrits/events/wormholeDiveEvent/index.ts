// the "Wormhole Dive" event (flight; cash), a flight-stage event (see
// ../../flightStage): its crit's click dives the view into a swirling
// vortex of glitter rings winding off into the distance, faster and faster.
// Wisps riding the spiral wall are shot down one after another as they
// wheel past, each paying into the live total, then the view bursts out of
// the far end in a white blast and crash-lands back on the floors
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
import {
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

const KEY = "wormholeDive";

// the vortex: its rings, each of glitter bits, their radius (screen widths
// at depth 1), the nearest and the span they cycle over, the gap between
// them, the twist with depth and its spin, and the view's speed down it,
// picking up with SURGE over SURGE_MS
const RINGS = 14;
const BITS = 18;
const RADIUS = 0.72;
const NEAR = 1.2;
const SPAN = 12.6;
const RING_GAP = 0.9;
const TWIST = 0.8;
const SPIN = 0.002;
const SPEED = 0.0045;
const SURGE = 6;
const SURGE_MS = 2600;
const BIT = 0.096;
// the riders: wisps wheeling up the wall, the first shot (ms into the
// flight) and the gap to the next shrinking by QUICKEN each time; each rides
// in over RIDE_MS from FAR to SHOT_AT, RADIUS out
const RIDERS = 10;
const FIRST_SHOT = 250;
const SHOT_GAP = 200;
const QUICKEN = 8;
const RIDE_MS = 900;
const FAR = 12;
const SHOT_AT = 2.2;
const RIDER_RADIUS = 0.68;
const RIDER = 1.4;
const SHOT_MS = 70;
const SHOT_W = 0.018;
// the burst out of the far end, after the last rider
const OUT_AFTER = 400;
const AFTER = 300;
// blasts (of the screen's width) and shakes
const BLAST = 0.176;
const OUT_BLAST = 0.48;
const SHAKE = 0.8;
const OUT_SHAKE = 2.6;

interface Rider {
  angle: number;
  shot: number;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.wormholeDiveEvent.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) => floor.unlocked && canStartFlightStage(context),
    arm: startWormholeDive,
  },
  { label: "Wormhole Dive", color: COLOR.revealBlue },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Wormhole Dive
export function forceWormholeDiveEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

const travel = (ms: number) => ms * SPEED + (ms / SURGE_MS) ** 3 * SURGE;

function riderAt(view: FlightView, rider: Rider, ms: number): Point {
  const z = Math.max(
    SHOT_AT,
    FAR - ((ms - rider.shot + RIDE_MS) * (FAR - SHOT_AT)) / RIDE_MS,
  );
  const a = rider.angle + z * TWIST + ms * SPIN;
  return project(
    view,
    Math.cos(a) * RIDER_RADIUS,
    Math.sin(a) * RIDER_RADIUS,
    z,
  );
}

function startWormholeDive(floor: Floor, context: EventProcContext): void {
  const { payoutsPerRider, payoutsOut } = CONFIG.wormholeDiveEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const riders: Rider[] = Array.from({ length: RIDERS }, (_, k) => ({
    angle: hash01(k, 7901) * Math.PI * 2,
    shot: FIRST_SHOT + k * (SHOT_GAP - k * QUICKEN),
  }));
  const outAt = riders[RIDERS - 1].shot + OUT_AFTER;
  const flyMs = outAt + AFTER;
  const pay = (payouts: number) => {
    addTotalIncome(multiply(rewardPayoutAmount(floor, Date.now()), payouts));
    pulseHudTotalFlash();
  };
  const shots = createBeats(
    riders,
    (r) => r.shot,
    () => {
      playExplosion();
      shakeScreen(SHAKE);
      pay(payoutsPerRider);
    },
  );
  let out = false;
  startFlightStage(
    KEY,
    floor,
    context,
    {
      flyMs,
      draw: (ctx, view, ms, now) => {
        if (ms < 0) return;
        shots.tick(ms, now);
        if (!out && ms >= outAt) {
          out = true;
          playCritExplosion();
          shakeScreen(OUT_SHAKE);
          pay(payoutsOut);
        }
        ctx.fillStyle = COLOR.skySpace;
        ctx.fillRect(view.x, view.y, view.w, view.h);
        const s = travel(ms);
        const previous = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = "lighter";
        for (let j = 0; j < RINGS; j++) {
          const z = NEAR + ((((j * RING_GAP - s) % SPAN) + SPAN) % SPAN);
          const twist = z * TWIST + ms * SPIN;
          for (let b = 0; b < BITS; b++) {
            const a = (b / BITS) * Math.PI * 2 + twist;
            const at = project(
              view,
              Math.cos(a) * RADIUS,
              Math.sin(a) * RADIUS,
              z,
            );
            stampGlimmer(
              ctx,
              at.x,
              at.y,
              (view.w * BIT) / z,
              a,
              b % 3 ? COLOR.heavenlyGold : COLOR.white,
            );
          }
        }
        ctx.globalCompositeOperation = previous;
        const guns = flightGuns(view);
        for (const r of riders) {
          const at = (t: number) => riderAt(view, r, t);
          drawWispBetween(
            ctx,
            at,
            ms,
            now,
            WISP_SIZE * RIDER,
            0.4,
            r.shot - RIDE_MS,
            r.shot,
          );
          const since = ms - (r.shot - SHOT_MS);
          if (since >= 0 && since < SHOT_MS) {
            const to = at(ms);
            for (const gun of guns)
              drawBeam(ctx, gun, to, view.w * SHOT_W, 1 - since / SHOT_MS);
          }
          drawDetonation(ctx, at(r.shot), ms - r.shot, view.w * BLAST, now);
        }
        drawDetonation(
          ctx,
          { x: view.cx, y: view.cy },
          ms - outAt,
          view.w * OUT_BLAST,
          now,
        );
      },
      onEnd: () => {
        // any rider a dropped frame skipped still pays
        shots.tick(Infinity, performance.now());
        context.applyTierCrit?.(floor, tier);
        endEventProc(KEY);
      },
    },
    { spotlightTotal: true },
  );
}
