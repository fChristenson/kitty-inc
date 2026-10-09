// the "Road Race" event (road race; cash), a flight-stage event (see
// ../../flightStage) with its own way in, drawn with shared/race's street and
// ship in shared/fps's world: its crit's click zooms the floors away into a
// race already flat out, a small ship skimming the street between the
// buildings, weaving through a snake of coins, each paying into the live
// total, round a bend and faster and faster down the straight to the finish
// gate, where the floors fill its window and the view rushes through onto them
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playCoinDrop, playSwoosh } from "../../../../sound";
import { multiply } from "../../../../shared/bigNumber";
import {
  drawFpsGround,
  drawFpsSky,
  fpsSight,
  type Fps,
  type FpsCamera,
  type FpsLens,
  type FpsScreen,
} from "../../../../shared/fps";
import {
  drawFinishGate,
  drawRaceShip,
  drawRoadStreet,
  roadBend,
  ROAD_STREET,
  type RaceShipLook,
  type RoadCurve,
} from "../../../../shared/race";
import { shakeScreen } from "../../../../shared/screenShake";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { drawScreenPart, type ScreenCopy } from "../../../../shared/screenCopy";
import { pulseHudTotalFlash } from "../../../../shared/totalIncomeCoins";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import {
  beginCoinBatch,
  drawCoinBurstFrame,
  endCoinBatch,
  type CoinBurstSprite,
} from "../../../../coinBurst";
import { addTotalIncome } from "../../../../totalIncome";
import { rewardPayoutAmount } from "../../../../floors/incomePanel";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import {
  canStartFlightStage,
  isFlightStageRunning,
  startFlightStage,
} from "../../flightStage";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";

const KEY = "roadRace";

// the view: its lens, how far behind the ship and how high it rides
const FOCAL = 1.2;
const LENS: FpsLens = { focal: FOCAL, horizon: 0.42 };
const BEHIND = 1.5;
const EYE = 0.625;
// the camera leans after the ship across the road by this share
const FOLLOW = 0.6;
// the finish gate at the road's end and its window, as wide as the road
const GATE_Z = 40;
const OPEN_W = ROAD_STREET.half * 2;
// the bend to the right, done before the straight to the gate, and how hard
// the ship leans into it
const CURVE: RoadCurve = { from: 10, to: 20, turn: 0.05 };
const CURVE_LEAN = 0.4;
// coins: the first and last along the road, the gap between them, their
// height, size and the snake they weave in across the road
const COIN_FROM = 2;
const COIN_TO = 36;
const COIN_EVERY = 0.85;
const COIN_Y = 0.18;
const COIN_R = 0.07;
const SNAKE = 0.45;
const SNAKE_RATE = 0.55;
const COIN_SPIN = 0.012;
// the race: already this share of top speed at the start, the share of it
// spent turning to the gate's window, how far the ship pulls ahead into it
const FLYING_START = 0.55;
const LAND_FROM = 0.75;
const PULL_AHEAD = 3;
// the ship: its hover over the road and bob, its bank into the snake's
// turns, its engine flames
const HOVER = 0.18;
const BOB = 0.012;
const BOB_RATE = 0.012;
const BANK = 1.5;
const FLAME = 0.5;
const ZOOM = 1.2;
const START_SHAKE = 1.2;
const SHIP: RaceShipLook = {
  wing: COLOR.silverTicketGray,
  shadow: COLOR.black,
};
const SKY = COLOR.revealSky;
const GRASS = COLOR.shareholdersGreen;

interface Coin {
  x: number;
  z: number;
  spin: number;
  sprite: CoinBurstSprite;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.roadRaceEvent.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) => floor.unlocked && canStartFlightStage(context),
    arm: startRoadRace,
  },
  { label: "Road Race", color: COLOR.fullHouseCrimson },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Road Race
export function forceRoadRaceEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

// where the snake of coins crosses the road at z, and which way it's turning
const laneX = (z: number) => SNAKE * Math.sin((z - COIN_FROM) * SNAKE_RATE);
const laneTurn = (z: number) =>
  SNAKE * SNAKE_RATE * Math.cos((z - COIN_FROM) * SNAKE_RATE);
// 0 on the straights, 1 through the bend
const inCurve = (z: number) =>
  smoothstep(clamp01((z - CURVE.from) / 2)) *
  smoothstep(clamp01((CURVE.to - z) / 2));

// the window's height, so it has the screen's shape and fills it on landing
const openHigh = (view: FpsScreen) => (OPEN_W * view.h) / view.w;

function startRoadRace(floor: Floor, context: EventProcContext): void {
  const { enterMs, flyMs, payoutsPerCoin } = CONFIG.roadRaceEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  // the race's clock runs from the click, through the way in, to the crash
  const raceMs = enterMs + flyMs + CONFIG.flightStage.arriveMs;
  const landZ = GATE_Z - FOCAL * OPEN_W;
  const coins: Coin[] = [];
  for (let z = COIN_FROM, i = 0; z <= COIN_TO; z += COIN_EVERY, i++)
    coins.push({
      x: laneX(z),
      z,
      spin: i * 3,
      sprite: { kind: "coin", spinFrame: 0, axisAngle: 0 },
    });
  // the view's run to the window, already moving, faster and faster
  const u = (ms: number) => clamp01(ms / raceMs);
  const camZ = (ms: number) =>
    lerp([0, landZ], FLYING_START * u(ms) + (1 - FLYING_START) * u(ms) ** 2);
  const landing = (ms: number) =>
    smoothstep(clamp01((u(ms) - LAND_FROM) / (1 - LAND_FROM)));
  const shipZ = (ms: number) =>
    camZ(ms) + BEHIND + PULL_AHEAD * landing(ms) ** 2;
  let picked = 0;
  const pickUpTo = (ms: number) => {
    while (picked < coins.length && shipZ(ms) >= coins[picked].z) {
      picked++;
      addTotalIncome(
        multiply(rewardPayoutAmount(floor, Date.now()), payoutsPerCoin),
      );
      pulseHudTotalFlash();
      playCoinDrop();
    }
  };

  // the race at ms on its clock
  const drawScene = (
    ctx: CanvasRenderingContext2D,
    view: FpsScreen,
    ms: number,
    now: number,
    floors: ScreenCopy,
  ): void => {
    const z = shipZ(ms);
    const shipX = laneX(z);
    const land = landing(ms);
    const cam: FpsCamera = {
      x: shipX * FOLLOW * (1 - land),
      y: lerp([EYE, openHigh(view) / 2], land),
      z: camZ(ms),
      tip: 0,
    };
    const fps: Fps = {
      view,
      lens: LENS,
      cam,
      bend: (at) => roadBend(CURVE, cam.z, at),
    };
    drawFpsSky(ctx, fps, SKY);
    drawFpsGround(ctx, fps, GRASS);
    drawFinishGate(ctx, fps, GATE_Z, OPEN_W, openHigh(view), (a, b) =>
      drawScreenPart(
        ctx,
        floors,
        view.x,
        view.y,
        view.w,
        view.h,
        a.x,
        a.y,
        b.x - a.x,
        b.y - a.y,
      ),
    );
    drawRoadStreet(ctx, fps, ROAD_STREET, GATE_Z);
    // the coins still ahead of the ship, far to near
    const base = ctx.getTransform();
    beginCoinBatch(ctx);
    for (let i = coins.length - 1; i >= picked; i--) {
      const coin = coins[i];
      const at = fpsSight(fps, coin.x, COIN_Y, coin.z);
      if (!at) continue;
      coin.sprite.spinFrame = coin.spin + now * COIN_SPIN;
      drawCoinBurstFrame(ctx, coin.sprite, at.x, at.y, COIN_R * at.s, base);
    }
    endCoinBatch(ctx);
    if (z < GATE_Z) {
      const engines = drawRaceShip(ctx, fps, SHIP, {
        x: shipX,
        z,
        hover: HOVER + Math.sin(now * BOB_RATE) * BOB,
        bank: Math.max(
          -1,
          Math.min(1, (laneTurn(z) + CURVE_LEAN * inCurve(z)) * BANK),
        ),
      });
      for (const engine of engines)
        drawWisp(
          ctx,
          () => engine,
          ms,
          now,
          WISP_SIZE * FLAME * (0.6 + u(ms)),
          1,
        );
    }
  };

  const beat = startFlightStage(
    KEY,
    floor,
    context,
    {
      flyMs,
      enter: {
        ms: enterMs,
        draw: (ctx, view, ms, now, floors) => {
          pickUpTo(ms);
          drawScene(ctx, view, ms, now, floors);
          // the floors zooming past the view and fading into the race
          const p = smoothstep(clamp01(ms / enterMs));
          const k = 1 + ZOOM * p;
          ctx.globalAlpha = 1 - p;
          drawScreenPart(
            ctx,
            floors,
            view.x,
            view.y,
            view.w,
            view.h,
            view.x + (view.w * (1 - k)) / 2,
            view.y + (view.h * (1 - k)) / 2,
            view.w * k,
            view.h * k,
          );
          ctx.globalAlpha = 1;
        },
      },
      ownLanding: true,
      draw: (ctx, view, ms, now, floors) => {
        pickUpTo(enterMs + ms);
        drawScene(ctx, view, enterMs + ms, now, floors);
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
  if (!beat) return;
  beat(-enterMs, () => {
    playSwoosh();
    shakeScreen(START_SHAKE);
  });
}
