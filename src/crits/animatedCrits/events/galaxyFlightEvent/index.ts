// the "Galaxy Flight" event (flight; cash), a flight-stage event (see
// ../../flightStage): its crit's click dives the view into space, straight
// at a spiral galaxy of glitter stars, its arms wheeling round. The guns
// blow the wisps riding its arms one after another from the core outward,
// each paying into the live total, then the core goes up as the view
// plunges through it
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
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { shakeScreen } from "../../../../shared/screenShake";
import { pulseHudTotalFlash } from "../../../../shared/totalIncomeCoins";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
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

const KEY = "galaxyFlight";

// the galaxy: its depth as the view dives at it, its stars, its radius
// (screen widths at depth 1), squash, the arms' wind and how fast it turns
const FAR = 10;
const NEAR = 1.6;
const DIVE = 0.003;
const STARS = 260;
const RADIUS = 0.88;
const SQUASH = 0.55;
const INNER = 0.08;
const WIND = 3.2;
const SCATTER = 0.5;
const SPIN = 0.0008;
// its stars' sizes and the core's glow (of the screen's width at depth 1)
const STAR: [number, number] = [0.032, 0.064];
const GLOW = 0.72;
const CORE = 6;
// the riders: wisps on the arms, shot one after another from the core out
const RIDERS = 9;
const RIDER_FROM = 0.2;
const RIDER_STEP = 0.09;
const RIDER = 3;
const SHOOT_AT = 750;
const SHOT_EVERY = 90;
const SHOT_MS = 70;
const SHOT_W = 0.019;
const CORE_AFTER = 200;
// blasts (of the screen's width) and shakes
const BLAST = 0.176;
const CORE_BLAST = 0.35;
const SHAKE = 0.8;
const CORE_SHAKE = 2.6;
const AFTER = 500;
const CORE_GLOW = fadeStops(COLOR.heavenlyGold);

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.galaxyFlightEvent.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) => floor.unlocked && canStartFlightStage(context),
    arm: startGalaxyFlight,
  },
  { label: "Galaxy Flight", color: COLOR.revealBlue },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Galaxy Flight
export function forceGalaxyFlightEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

const depthAt = (ms: number) => Math.max(NEAR, FAR - ms * DIVE);

// a spot on arm `arm`, `r` of the way out (0..1), turned by `jitter`
function onArm(
  view: FlightView,
  arm: number,
  r: number,
  jitter: number,
  ms: number,
): Point {
  const a = arm * Math.PI + r * WIND + ms * SPIN + jitter;
  return project(
    view,
    Math.cos(a) * r * RADIUS,
    Math.sin(a) * r * RADIUS * SQUASH,
    depthAt(ms),
  );
}

const riderR = (k: number) => RIDER_FROM + k * RIDER_STEP;
const shotAt = (k: number) => SHOOT_AT + k * SHOT_EVERY;

function startGalaxyFlight(floor: Floor, context: EventProcContext): void {
  const { payoutsPerRider, payoutsCore } = CONFIG.galaxyFlightEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const coreAt = shotAt(RIDERS - 1) + CORE_AFTER;
  const flyMs = coreAt + AFTER;
  const riders = Array.from({ length: RIDERS }, (_, k) => k);
  const pay = (payouts: number) => {
    addTotalIncome(multiply(rewardPayoutAmount(floor, Date.now()), payouts));
    pulseHudTotalFlash();
  };
  const shots = createBeats(riders, shotAt, () => {
    playExplosion();
    shakeScreen(SHAKE);
    pay(payoutsPerRider);
  });
  let cored = false;
  startFlightStage(
    KEY,
    floor,
    context,
    {
      flyMs,
      draw: (ctx, view, ms, now) => {
        if (ms < 0) return;
        shots.tick(ms, now);
        if (!cored && ms >= coreAt) {
          cored = true;
          playCritExplosion();
          shakeScreen(CORE_SHAKE);
          pay(payoutsCore);
        }
        const z = depthAt(ms);
        const middle = project(view, 0, 0, z);
        const previous = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = "lighter";
        drawGlow(ctx, CORE_GLOW, middle.x, middle.y, (view.w * GLOW) / z);
        for (let i = 0; i < STARS; i++) {
          const r = INNER + hash01(i, 7801) ** 0.7 * (1 - INNER);
          const at = onArm(
            view,
            i % 2,
            r,
            (hash01(i, 7802) - 0.5) * SCATTER,
            ms,
          );
          const size = STAR[0] + hash01(i, 7803) * (STAR[1] - STAR[0]);
          stampGlimmer(
            ctx,
            at.x,
            at.y,
            (view.w * size) / z,
            i,
            i % 4 ? COLOR.heavenlyGold : COLOR.white,
          );
        }
        ctx.globalCompositeOperation = previous;
        if (ms < coreAt)
          drawWisp(ctx, () => middle, ms, now, (WISP_SIZE * CORE) / z, 1);
        const guns = flightGuns(view);
        for (const k of riders) {
          const at = (t: number) => onArm(view, k % 2, riderR(k), 0, t);
          drawWispBetween(
            ctx,
            at,
            ms,
            now,
            (WISP_SIZE * RIDER) / z,
            0.4,
            0,
            shotAt(k),
          );
          const since = ms - (shotAt(k) - SHOT_MS);
          if (since >= 0 && since < SHOT_MS) {
            const to = at(ms);
            for (const gun of guns)
              drawBeam(ctx, gun, to, view.w * SHOT_W, 1 - since / SHOT_MS);
          }
          drawDetonation(
            ctx,
            at(shotAt(k)),
            ms - shotAt(k),
            view.w * BLAST,
            now,
          );
        }
        drawDetonation(
          ctx,
          project(view, 0, 0, depthAt(coreAt)),
          ms - coreAt,
          view.w * CORE_BLAST,
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
