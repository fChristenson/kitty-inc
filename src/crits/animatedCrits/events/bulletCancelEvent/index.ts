// the "Bullet Cancel" event (shmup; cash), a flight-stage event (see
// ../../flightStage) with its own way in, on the Shmup look (shared/shmup):
// its crit's click lifts the view high off the floors into space and a boss
// core at the top spins up a bullet curtain, spirals and rings thickening
// till the screen is a storm of hundreds of bullets, the ship weaving
// untouched through it all and glowing hotter. It lets off its bomb: a white
// ring bursts out over the screen and every bullet it touches turns into a
// coin, the coins sucked into the ship paying into the live total; the boss,
// caught in it, blows apart in a chain of blasts, and the stage lands back on
// the floors
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playCoinDrop, playSwoosh } from "../../../../sound";
import { multiply } from "../../../../shared/bigNumber";
import {
  drawBullets,
  fireBullet,
  type Box,
  type Bullet,
} from "../../../../shared/bullets";
import {
  beginCoinBatch,
  drawCoinBurstFrame,
  endCoinBatch,
  type CoinBurstSprite,
} from "../../../../coinBurst";
import { createBeats, type Beats } from "../../../../shared/eventBeats";
import {
  clamp01,
  easeOutCubic,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { drawDetonation } from "../../../../shared/explosion";
import {
  playCritExplosion,
  playExplosion,
  playSlamExplosion,
} from "../../../../shared/explosionBang";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { shakeScreen } from "../../../../shared/screenShake";
import { drawScreenPart } from "../../../../shared/screenCopy";
import { drawStarfield } from "../../../../shared/shmup";
import { pulseHudTotalFlash } from "../../../../shared/totalIncomeCoins";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { addTotalIncome } from "../../../../totalIncome";
import { rewardPayoutAmount } from "../../../../floors/incomePanel";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import {
  canStartFlightStage,
  isFlightStageRunning,
  startFlightStage,
  type FlightView,
} from "../../flightStage";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";

const KEY = "bulletCancel";

// the racer: its height down the view and bob (of its height), its weave (of
// the view's width) and rate, its wisp's size, hotter as the storm thickens
const SHIP_Y = 0.82;
const SHIP_BOB = 0.02;
const SHIP_BOB_RATE = 0.0031;
const WEAVE = 0.3;
const WEAVE_RATE = 0.0016;
const RACER = WISP_SIZE * 1.6;
// its glow as the storm thickens (of the view's width)
const HEAT = fadeStops(COLOR.heavenlyGold);
const HEAT_SIZE: [number, number] = [0.07, 0.18];
const HEAT_ALPHA: [number, number] = [0.3, 0.8];
// the boss: where it sways (of the view), its size, the glints whirling round it
const BOSS_Y = 0.17;
const BOSS_SWAY = 0.13;
const BOSS_SWAY_RATE = 0.0011;
const BOSS = WISP_SIZE * 2.2;
const BOSS_GROW = WISP_SIZE;
const BOSS_SPIN_UP = 400;
const GLINTS = 6;
const GLINT_REACH: [number, number] = [0.12, 0.09];
const GLINT_RATE = 0.006;
const GLINT = 60;
// the curtain: a burst every BURST_EVERY ms from FIRE_FROM to FIRE_TO, a
// whirling spiral thickening from SPIRAL to SPIRAL + SPIRAL_MORE arms, every
// RING_EVERY-th burst a slower ring; bullets' speed (of the view's width a
// ms) and size
const FIRE_FROM = 150;
const FIRE_TO = 1900;
const BURST_EVERY = 55;
const SPIRAL = 8;
const SPIRAL_MORE = 6;
const SPIRAL_TURN = 0.0045;
const RING_EVERY = 4;
const RING = 20;
const RING_SLOW = 0.75;
const SPEED = 0.00055;
const BULLET = WISP_SIZE * 0.4;
// none fly nearer the ship than this (of the view's width): it's never hit
const CLEAR = 0.076;
const CLEAR_STEP = 16;
// the bomb: its ring bursting over RING_MS out to RING_REACH of the view's
// height, its line, the coins it leaves, sucked into the ship after
const BOMB = FIRE_TO + 120;
const RING_MS = 520;
const RING_REACH = 1.15;
const RING_LINE: [number, number] = [0.04, 0.008];
const RING_STEP = 8;
const BOMB_BLAST = 0.2;
const COIN = 0.018;
const COIN_SPIN = 0.02;
const SUCK = BOMB + RING_MS + 150;
const SUCK_MS = 450;
const SUCK_LAG = 12;
const SUCK_LAGS = 9;
const PAYS = 5;
// the boss's chain once the ring reaches it, then its huge blast
const CHAIN_AT = BOMB + RING_MS * 0.7;
const CHAIN = 6;
const CHAIN_GAP = 45;
const CHAIN_REACH: [number, number] = [0.11, 0.09];
const CHAIN_BLAST = 0.1;
const BOSS_BLAST = 0.3;
const END_LAG = 250;
const BOMB_SHAKE = 2.4;
const CHAIN_SHAKE = 1.2;
const BOSS_SHAKE = 3;
const PAY_SHAKE = 0.6;
const ENTER_SHAKE = 0.8;

interface Coin {
  at: Point;
  caught: number;
  lag: number;
  sprite: CoinBurstSprite;
}

interface Blast {
  at: Point;
  ms: number;
  size: number;
  boss: boolean;
}

interface Plan {
  bullets: Bullet[];
  coins: Coin[];
  blasts: Blast[];
  bomb: Point;
  boom: number;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.bulletCancelEvent.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) => floor.unlocked && canStartFlightStage(context),
    arm: startBulletCancel,
  },
  { label: "Bullet Cancel", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Bullet Cancel
export function forceBulletCancelEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

function startBulletCancel(floor: Floor, context: EventProcContext): void {
  const { enterMs, payouts, payoutsBoss } = CONFIG.bulletCancelEvent;
  const flyMs = SUCK + SUCK_MS + END_LAG;
  const tier = context.critTier ?? pickCritTierByOdds();

  const shipAt = (view: FlightView, ms: number, into: Point): Point => {
    const weave = smoothstep(clamp01((ms + enterMs) / enterMs));
    into.x = view.cx + view.w * WEAVE * weave * Math.sin(ms * WEAVE_RATE);
    const y =
      ms < 0
        ? lerp([1.2, SHIP_Y], easeOutCubic(clamp01((ms + enterMs) / enterMs)))
        : SHIP_Y + SHIP_BOB * Math.sin(ms * SHIP_BOB_RATE);
    into.y = view.y + view.h * y;
    return into;
  };
  const bossAt = (view: FlightView, ms: number, into: Point): Point => {
    into.x = view.cx + view.w * BOSS_SWAY * Math.sin(ms * BOSS_SWAY_RATE);
    into.y = view.y + view.h * BOSS_Y;
    return into;
  };

  // every bullet, the coins the bomb makes of them and the boss's blasts,
  // planned once the view's known
  const plan = (view: FlightView): Plan => {
    const { w } = view;
    const box: Box = {
      left: view.x - 30,
      right: view.x + w + 30,
      top: view.y - 30,
      bottom: view.y + view.h + 30,
    };
    const ship = { x: 0, y: 0 };
    const clear = CLEAR * w;
    const fired: Bullet[] = [];
    for (let e = FIRE_FROM, k = 0; e < FIRE_TO; e += BURST_EVERY, k++) {
      const from = bossAt(view, e, { x: 0, y: 0 });
      const ring = k % RING_EVERY === RING_EVERY - 1;
      const n = ring
        ? RING
        : SPIRAL +
          Math.floor((k * BURST_EVERY * SPIRAL_MORE) / (FIRE_TO - FIRE_FROM));
      for (let j = 0; j < n; j++) {
        const a = ring
          ? (j / n) * Math.PI * 2 + k
          : e * SPIRAL_TURN + (j / n) * Math.PI * 2;
        fired.push(
          fireBullet(from, a, e, SPEED * w * (ring ? RING_SLOW : 1), box),
        );
      }
    }
    // never touching the ship: a bullet whose path comes too close isn't fired
    const kept = fired.filter((b) => {
      for (let t = b.firedAt; t < Math.min(b.hitAt, BOMB); t += CLEAR_STEP) {
        const p = b.at(t);
        if (!p) break;
        shipAt(view, t, ship);
        if (Math.hypot(p.x - ship.x, p.y - ship.y) < clear) return false;
      }
      return true;
    });
    // where the bomb's ring catches each bullet still flying, its last spot
    const bomb = shipAt(view, BOMB, { x: 0, y: 0 });
    const reach = RING_REACH * view.h;
    const coins: Coin[] = [];
    const bullets = kept.map((b): Bullet => {
      for (
        let t = Math.max(BOMB, b.firedAt);
        t < Math.min(b.hitAt, BOMB + RING_MS);
        t += RING_STEP
      ) {
        const p = b.at(t);
        if (!p) break;
        if (
          Math.hypot(p.x - bomb.x, p.y - bomb.y) >
          ((t - BOMB) / RING_MS) * reach
        )
          continue;
        coins.push({
          at: { x: p.x, y: p.y },
          caught: t,
          lag: (coins.length % SUCK_LAGS) * SUCK_LAG,
          sprite: { kind: "coin", spinFrame: 0, axisAngle: 0 },
        });
        return { ...b, hitAt: t };
      }
      return b;
    });
    const core = bossAt(view, CHAIN_AT, { x: 0, y: 0 });
    const blasts: Blast[] = Array.from({ length: CHAIN }, (_, k) => ({
      at: {
        x: core.x + Math.cos(k * 1.9) * CHAIN_REACH[0] * w,
        y: core.y + Math.sin(k * 1.9) * CHAIN_REACH[1] * w,
      },
      ms: CHAIN_AT + k * CHAIN_GAP,
      size: CHAIN_BLAST * w,
      boss: false,
    }));
    const boom = CHAIN_AT + CHAIN * CHAIN_GAP;
    blasts.push({ at: core, ms: boom, size: BOSS_BLAST * w, boss: true });
    return { bullets, coins, blasts, bomb, boom };
  };

  let planned: Plan | null = null;
  let beats: Beats<Blast> | null = null;
  let shipPath: ((ms: number) => Point) | null = null;
  const ship: Point = { x: 0, y: 0 };
  const boss: Point = { x: 0, y: 0 };
  const bossPath = () => boss;

  const drawScene = (
    ctx: CanvasRenderingContext2D,
    view: FlightView,
    ms: number,
    now: number,
  ): void => {
    if (!planned) {
      planned = plan(view);
      shipPath = (t) => shipAt(view, t, { x: 0, y: 0 });
      beats = createBeats(
        planned.blasts,
        (b) => b.ms,
        (b) => {
          if (b.boss) {
            playCritExplosion();
            shakeScreen(BOSS_SHAKE);
            pay(payoutsBoss);
          } else {
            playExplosion();
            shakeScreen(CHAIN_SHAKE);
          }
        },
      );
    }
    const { bullets, coins, blasts, bomb, boom } = planned;
    beats?.tick(ms, now);
    drawStarfield(ctx, view, ms, now);
    // the boss, spinning up, glints whirling round it
    if (ms < boom) {
      bossAt(view, ms, boss);
      const spin = clamp01(ms / BOSS_SPIN_UP);
      drawWisp(ctx, bossPath, ms, now, BOSS + BOSS_GROW * spin, spin);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let k = 0; k < GLINTS; k++) {
        const a = ms * GLINT_RATE + (k * Math.PI * 2) / GLINTS;
        stampGlimmer(
          ctx,
          boss.x + Math.cos(a) * GLINT_REACH[0] * view.w * spin,
          boss.y + Math.sin(a) * GLINT_REACH[1] * view.w * spin,
          GLINT,
          k + ms * 0.01,
          COLOR.heavenlyGold,
        );
      }
      ctx.restore();
    }
    drawBullets(ctx, bullets, ms, now, BULLET);
    // the coins the ring left, sucked into the ship
    shipAt(view, ms, ship);
    const base = ctx.getTransform();
    beginCoinBatch(ctx);
    for (const c of coins) {
      if (ms < c.caught) continue;
      const u = clamp01((ms - SUCK - c.lag) / SUCK_MS);
      if (u >= 1) continue;
      const e = u * u;
      c.sprite.spinFrame = ms * COIN_SPIN + c.lag;
      drawCoinBurstFrame(
        ctx,
        c.sprite,
        lerp([c.at.x, ship.x], e),
        lerp([c.at.y, ship.y], e),
        COIN * view.w * (1 - 0.5 * u),
        base,
      );
    }
    endCoinBatch(ctx);
    // the bomb's ring
    if (ms >= BOMB && ms < BOMB + RING_MS) {
      const u = (ms - BOMB) / RING_MS;
      ctx.save();
      ctx.strokeStyle = COLOR.white;
      ctx.globalAlpha = 0.9 * (1 - 0.7 * u);
      ctx.lineWidth = lerp(RING_LINE, u) * view.w;
      ctx.beginPath();
      ctx.arc(bomb.x, bomb.y, u * RING_REACH * view.h, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // the racer, glowing hotter as the storm thickens
    const heat = clamp01((ms - FIRE_FROM) / (BOMB - FIRE_FROM));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = lerp(HEAT_ALPHA, heat);
    drawGlow(ctx, HEAT, ship.x, ship.y, lerp(HEAT_SIZE, heat) * view.w);
    ctx.restore();
    if (shipPath) drawWisp(ctx, shipPath, ms, now, RACER, 0.4 + 0.6 * heat);
    drawDetonation(ctx, bomb, ms - BOMB, BOMB_BLAST * view.w, now);
    for (const b of blasts) drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
  };

  const pay = (share: number) => {
    addTotalIncome(multiply(rewardPayoutAmount(floor, Date.now()), share));
    pulseHudTotalFlash();
    playCoinDrop();
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
          drawScene(ctx, view, ms - enterMs, now);
          // the view lifting high off the floors, which shrink away below
          const p = smoothstep(clamp01(ms / enterMs));
          const k = 1 - 0.9 * p;
          ctx.globalAlpha = 1 - p;
          drawScreenPart(
            ctx,
            floors,
            view.x,
            view.y,
            view.w,
            view.h,
            view.cx - (view.w * k) / 2,
            view.cy - (view.h * k) / 2,
            view.w * k,
            view.h * k,
          );
          ctx.globalAlpha = 1;
        },
      },
      draw: (ctx, view, ms, now) => drawScene(ctx, view, ms, now),
      onEnd: () => {
        // any blast a dropped frame skipped still pays
        beats?.tick(Infinity, performance.now());
        context.applyTierCrit?.(floor, tier);
        endEventProc(KEY);
      },
    },
    { spotlightTotal: true },
  );
  if (!beat) return;
  beat(-enterMs, () => {
    playSwoosh();
    shakeScreen(ENTER_SHAKE);
  });
  beat(FIRE_FROM, playSwoosh);
  beat(BOMB, () => {
    playSlamExplosion();
    shakeScreen(BOMB_SHAKE);
  });
  // the coins paying in as they're sucked into the ship
  for (let k = 0; k < PAYS; k++)
    beat(SUCK + ((k + 1) * SUCK_MS) / PAYS, () => {
      pay(payouts / PAYS);
      shakeScreen(PAY_SHAKE);
    });
}
