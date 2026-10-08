// the "Lightspeed" event (flight; cash), a flight-stage event (see
// ../../flightStage): it covers its crit, whose click dives the view into
// space at lightspeed. Spinning coins rush in out of the distance in
// corkscrews, rings and trails and are picked up as they fly past, each paying
// into the live total, until the view crash-lands back on the floors and the
// crit's tier pays out
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playCoinDrop } from "../../../../sound";
import { multiply } from "../../../../shared/bigNumber";
import { drawExplosion } from "../../../../shared/eventFx";
import { hash01 } from "../../../../shared/twinkle";
import { pulseHudTotalFlash } from "../../../../shared/totalIncomeCoins";
import {
  beginCoinBatch,
  drawCoinBurstFrame,
  endCoinBatch,
  COIN_SPIN_FRAME_COUNT,
  type CoinBurstSprite,
} from "../../../../coinBurst";
import { addTotalIncome } from "../../../../totalIncome";
import { rewardPayoutAmount } from "../../../../floors/incomePanel";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import {
  canStartFlightStage,
  isFlightStageRunning,
  project,
  startFlightStage,
} from "../../flightStage";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";

const KEY = "lightspeed";

// coins: how far off they appear (1 is where they're picked up), their size
// there and where they fly past, of the screen's width from its middle
const COIN_FAR = 10;
const COIN_R = 0.11;
const CORKSCREW = 12;
const CORKSCREW_EVERY_MS = 70;
const CORKSCREW_R = 0.34;
const RING = 8;
const RING_AT_MS = 850;
const RING_R = 0.36;
const TRAIL = 6;
const TRAIL_AT_MS = 1000;
const TRAIL_EVERY_MS = 60;
const TRAIL_SPOTS = [
  { x: -0.3, y: 0.2 },
  { x: 0.3, y: 0.2 },
];
const COIN_SPIN = 0.012; // flipbook frames a ms
const PICK_MS = 300;
const PICK_REACH = 0.12;
const PICK_SPARK = 18;
const PICK_BURST = 0.3;

interface Coin {
  x: number;
  y: number;
  spawnAt: number;
  pickAt: number;
  spin: number;
  sprite: CoinBurstSprite;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.lightspeedEvent.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) => floor.unlocked && canStartFlightStage(context),
    arm: startLightspeed,
  },
  { label: "Lightspeed", color: COLOR.revealBlue },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Lightspeed
export function forceLightspeedEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

// every coin's lane (of the screen's width from its middle) and when it
// appears in the flight: a corkscrew, a ring, two trails
function planCoins(approachMs: number): Coin[] {
  const lanes: { x: number; y: number; at: number }[] = [];
  for (let i = 0; i < CORKSCREW; i++) {
    const a = (i * Math.PI) / 4;
    lanes.push({
      x: Math.cos(a) * CORKSCREW_R,
      y: Math.sin(a) * CORKSCREW_R,
      at: i * CORKSCREW_EVERY_MS,
    });
  }
  for (let i = 0; i < RING; i++) {
    const a = (i / RING) * Math.PI * 2;
    lanes.push({
      x: Math.cos(a) * RING_R,
      y: Math.sin(a) * RING_R,
      at: RING_AT_MS,
    });
  }
  for (const spot of TRAIL_SPOTS)
    for (let i = 0; i < TRAIL; i++)
      lanes.push({ ...spot, at: TRAIL_AT_MS + i * TRAIL_EVERY_MS });
  return lanes
    .map((lane, i) => ({
      x: lane.x,
      y: lane.y,
      spawnAt: lane.at,
      pickAt: lane.at + approachMs,
      spin: hash01(i, 5101) * COIN_SPIN_FRAME_COUNT,
      sprite: { kind: "coin" as const, spinFrame: 0, axisAngle: 0 },
    }))
    .sort((a, b) => a.pickAt - b.pickAt);
}

function startLightspeed(floor: Floor, context: EventProcContext): void {
  const { flyMs, coinApproachMs, payoutsPerCoin } = CONFIG.lightspeedEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const coins = planCoins(coinApproachMs);
  let picked = 0;
  const pickUpTo = (ms: number) => {
    while (picked < coins.length && ms >= coins[picked].pickAt) {
      picked++;
      addTotalIncome(
        multiply(rewardPayoutAmount(floor, Date.now()), payoutsPerCoin),
      );
      pulseHudTotalFlash();
      playCoinDrop();
    }
  };
  startFlightStage(
    KEY,
    floor,
    context,
    {
      flyMs,
      draw: (ctx, view, ms, now) => {
        pickUpTo(ms);
        const base = ctx.getTransform();
        beginCoinBatch(ctx);
        for (const coin of coins) {
          if (ms < coin.spawnAt || ms >= coin.pickAt) continue;
          const z =
            COIN_FAR - (COIN_FAR - 1) * ((ms - coin.spawnAt) / coinApproachMs);
          const at = project(view, coin.x, coin.y, z);
          coin.sprite.spinFrame = coin.spin + ms * COIN_SPIN;
          drawCoinBurstFrame(
            ctx,
            coin.sprite,
            at.x,
            at.y,
            (COIN_R * view.w) / z,
            base,
          );
        }
        endCoinBatch(ctx);
        for (let i = 0; i < picked; i++) {
          const coin = coins[i];
          const since = ms - coin.pickAt;
          if (since >= PICK_MS) continue;
          const at = project(view, coin.x, coin.y, 1);
          drawExplosion(
            ctx,
            at.x,
            at.y,
            since,
            now,
            PICK_BURST,
            PICK_REACH * view.w,
            PICK_SPARK,
          );
        }
      },
      onEnd: () => {
        // any coin a dropped frame skipped still pays
        pickUpTo(Infinity);
        context.applyTierCrit?.(floor, tier);
        endEventProc(KEY);
      },
    },
    { spotlightTotal: true },
  );
}
