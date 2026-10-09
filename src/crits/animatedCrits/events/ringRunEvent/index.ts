// the "Ring Run" event (flight; cash), a flight-stage event (see
// ../../flightStage): its crit's click dives the view into space, where it
// threads glowing hoops of glitter rushing at it out of the distance, faster
// and faster. Every hoop it passes through bursts into a ring of blasts
// racing round the screen's edge, paying into the live total; the last is a
// huge golden hoop going off all the way round, then the view crash-lands
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

const KEY = "ringRun";

// the hoops: when the first is passed (ms into the flight), the gap to the
// next shrinking by HOOP_QUICKEN each time, the last held back a beat; each
// rushes in from FAR over RUSH_MS to PASS_AT, where it's flown through
const HOOPS = 6;
const FIRST_PASS = 500;
const HOOP_GAP = 380;
const HOOP_QUICKEN = 30;
const BIG_DELAY = 120;
const RUSH_MS = 700;
const FAR = 14;
const PASS_AT = 1.2;
// a hoop's radius and its weave off the middle (screen widths at depth 1),
// its glitter: how many bits, how big (of the screen's width at depth 1),
// how fast they turn
const RADIUS = 0.72;
const WEAVE_X = 0.24;
const WEAVE_Y = 0.2;
const BITS = 22;
const BIT = 0.136;
const BIG_BIT = 0.21;
const TURN = 0.002;
// the ring of blasts each bursts into: how many, the gap between them, size
// (of the screen's width)
const RING = 12;
const BIG_RING = 18;
const RING_EVERY = 25;
const BIG_RING_EVERY = 30;
const BLAST = 0.12;
const BIG_BLAST = 0.18;
const PASS_SHAKE = 1.2;
const BIG_SHAKE = 2.6;
const BLAST_SHAKE = 0.3;
const AFTER = 400;

interface Hoop {
  x: number;
  y: number;
  pass: number;
  big: boolean;
}

interface Burst {
  hoop: Hoop;
  at: number;
  angle: number;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.ringRunEvent.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) => floor.unlocked && canStartFlightStage(context),
    arm: startRingRun,
  },
  { label: "Ring Run", color: COLOR.revealBlue },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Ring Run
export function forceRingRunEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

function planHoops(): Hoop[] {
  return Array.from({ length: HOOPS }, (_, k) => {
    const big = k === HOOPS - 1;
    return {
      x: big ? 0 : (hash01(k, 7401) - 0.5) * 2 * WEAVE_X,
      y: big ? 0 : (hash01(k, 7402) - 0.5) * 2 * WEAVE_Y,
      pass:
        FIRST_PASS + k * (HOOP_GAP - k * HOOP_QUICKEN) + (big ? BIG_DELAY : 0),
      big,
    };
  });
}

const depthOf = (hoop: Hoop, ms: number) =>
  Math.max(
    PASS_AT,
    FAR - ((ms - hoop.pass + RUSH_MS) * (FAR - PASS_AT)) / RUSH_MS,
  );

const rimAt = (view: FlightView, hoop: Hoop, angle: number, z: number): Point =>
  project(
    view,
    hoop.x + Math.cos(angle) * RADIUS,
    hoop.y + Math.sin(angle) * RADIUS,
    z,
  );

function startRingRun(floor: Floor, context: EventProcContext): void {
  const { payoutsPerHoop, payoutsBigHoop } = CONFIG.ringRunEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const hoops = planHoops();
  const bursts: Burst[] = hoops.flatMap((hoop) => {
    const n = hoop.big ? BIG_RING : RING;
    return Array.from({ length: n }, (_, j) => ({
      hoop,
      at: hoop.pass + j * (hoop.big ? BIG_RING_EVERY : RING_EVERY),
      angle: (j / n) * Math.PI * 2 - Math.PI / 2,
    }));
  });
  const flyMs = Math.max(...bursts.map((b) => b.at)) + AFTER;
  const passed = createBeats(
    hoops,
    (h) => h.pass,
    (h) => {
      if (h.big) playCritExplosion();
      else playExplosion();
      shakeScreen(h.big ? BIG_SHAKE : PASS_SHAKE);
      addTotalIncome(
        multiply(
          rewardPayoutAmount(floor, Date.now()),
          h.big ? payoutsBigHoop : payoutsPerHoop,
        ),
      );
      pulseHudTotalFlash();
    },
  );
  const rattled = createBeats(
    bursts,
    (b) => b.at,
    () => shakeScreen(BLAST_SHAKE),
  );
  startFlightStage(
    KEY,
    floor,
    context,
    {
      flyMs,
      draw: (ctx, view, ms, now) => {
        if (ms < 0) return;
        passed.tick(ms, now);
        rattled.tick(ms, now);
        const previous = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = "lighter";
        for (const hoop of hoops) {
          if (ms < hoop.pass - RUSH_MS || ms >= hoop.pass) continue;
          const z = depthOf(hoop, ms);
          const bit = (view.w * (hoop.big ? BIG_BIT : BIT)) / z;
          for (let j = 0; j < BITS; j++) {
            const a = (j / BITS) * Math.PI * 2 + ms * TURN;
            const at = rimAt(view, hoop, a, z);
            stampGlimmer(
              ctx,
              at.x,
              at.y,
              bit,
              a,
              j % 3 ? COLOR.heavenlyGold : COLOR.white,
            );
          }
        }
        ctx.globalCompositeOperation = previous;
        for (const b of bursts)
          drawDetonation(
            ctx,
            rimAt(view, b.hoop, b.angle, PASS_AT),
            ms - b.at,
            view.w * (b.hoop.big ? BIG_BLAST : BLAST),
            now,
          );
      },
      onEnd: () => {
        // any hoop a dropped frame skipped still pays
        passed.tick(Infinity, performance.now());
        context.applyTierCrit?.(floor, tier);
        endEventProc(KEY);
      },
    },
    { spotlightTotal: true },
  );
}
