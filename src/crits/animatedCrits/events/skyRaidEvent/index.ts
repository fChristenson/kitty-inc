// the "Sky Raid" event (shmup; cash), a flight-stage event (see
// ../../flightStage) with its own way in, on the Shmup look (shared/shmup): a
// bullet hell seen from straight above. Its crit's click lifts the view high
// off the floors into space, the ship flies in from the bottom and weaves up
// a streaming starfield past waves of wisp drones' fans, gunships' rings and
// a boss's whirling spiral, shooting each down in a blast that pays into the
// live total; the boss goes up in a chain of blasts, the ship streaks off the
// top and the floors rush up onto the view
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playSwoosh } from "../../../../sound";
import { multiply } from "../../../../shared/bigNumber";
import {
  bulletFan,
  bulletRing,
  bulletSpiral,
  drawBullets,
  type Box,
  type Bullet,
} from "../../../../shared/bullets";
import { createBeats, type Beats } from "../../../../shared/eventBeats";
import {
  clamp01,
  easeIn,
  easeOutCubic,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { drawDetonation } from "../../../../shared/explosion";
import {
  playExplosion,
  playSlamExplosion,
} from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { drawScreenPart } from "../../../../shared/screenCopy";
import {
  drawShipFlames,
  drawShmupShip,
  drawStarfield,
  enemySpot,
  planShipGuns,
  SHMUP_SHIP,
  shmupEnemy,
  shotHeat,
  type ShipShot,
  type ShmupEnemy,
} from "../../../../shared/shmup";
import { pulseHudTotalFlash } from "../../../../shared/totalIncomeCoins";
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

const KEY = "skyRaid";

// the ship: its half span (of the view's width), its height down the view,
// its weave (of the view's width, two sines), how far it banks, the ms it
// starts climbing off the top, its flames and how fast they stream back (of
// the view's height a ms)
const SHIP_SIZE = 0.06;
const SHIP_Y = 0.8;
const WEAVE: [number, number] = [0.2, 0.08];
const WEAVE_HZ: [number, number] = [0.33, 0.85];
const BANK = 4;
const LEAVE_AT = 3700;
const FLAME = WISP_SIZE * 0.35;
const TRAIL = 0.0012;
// its guns: twin shots every SHOT_EVERY ms at SHOT_SPEED (of the view's width
// a ms), the twins' gap (of its half span), how far ahead they aim
const SHOOT: [number, number] = [250, 3550];
const SHOT_EVERY = 100;
const SHOT_SPEED = 0.0028;
const TWIN = 0.35;
const LEAD_MS = 120;
const SHOT_SIZE = WISP_SIZE * 0.3;
// the enemies' bullets: speed (of the view's width a ms) and size
const HAIL_SPEED = 0.00055;
const HAIL_SIZE = WISP_SIZE * 0.4;
// blasts: each kind's size (of the view's width), then the boss's cluster
const DRONE_BLAST = 0.3;
const GUNSHIP_BLAST = 0.42;
const BOSS_BLAST = 0.95;
const CLUSTER_BLAST = 0.38;
const CLUSTER = 6;
const CLUSTER_EVERY = 80;
const CLUSTER_REACH = 0.22;
const BOSS = 5;

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
  payouts: number;
  boss: boolean;
}

interface Plan {
  enemies: ShmupEnemy[];
  hail: Bullet[];
  shots: ShipShot[];
  shotBullets: Bullet[];
  blasts: Blast[];
  heat: number[];
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.skyRaidEvent.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) => floor.unlocked && canStartFlightStage(context),
    arm: startSkyRaid,
  },
  { label: "Sky Raid", color: COLOR.fullHouseCrimson },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Sky Raid
export function forceSkyRaidEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

function startSkyRaid(floor: Floor, context: EventProcContext): void {
  const { enterMs, flyMs, payoutsPerKill, payoutsBoss } = CONFIG.skyRaidEvent;
  const tier = context.critTier ?? pickCritTierByOdds();

  // the ship's middle at ms on the flight's clock (negative on the way in)
  const shipAt = (view: FlightView, ms: number, into: Point): Point => {
    const s = ms / 1000;
    const weave = smoothstep(clamp01((ms + enterMs) / enterMs));
    into.x =
      view.cx +
      view.w *
        weave *
        (WEAVE[0] * Math.sin(s * WEAVE_HZ[0] * Math.PI * 2) +
          WEAVE[1] * Math.sin(s * WEAVE_HZ[1] * Math.PI * 2 + 1));
    const y =
      ms < 0
        ? lerp([1.2, SHIP_Y], easeOutCubic(clamp01((ms + enterMs) / enterMs)))
        : lerp(
            [SHIP_Y, -0.3],
            easeIn(clamp01((ms - LEAVE_AT) / (flyMs - LEAVE_AT))),
          );
    into.y = view.y + view.h * y;
    return into;
  };

  // every enemy, shot and blast, planned once the view's known
  const plan = (view: FlightView): Plan => {
    const { w } = view;
    const box: Box = {
      left: view.x - 30,
      right: view.x + w + 30,
      top: view.y - 30,
      bottom: view.y + view.h + 30,
    };
    const ship = (ms: number) => shipAt(view, ms, { x: 0, y: 0 });
    const drone = WISP_SIZE * 0.8;
    const gunship = WISP_SIZE * 1.1;
    const enemies = [
      // three drones dropping in a V
      { from: [0.3, -0.1], to: [0.3, 0.2], enterAt: 0, killAt: 1150 },
      { from: [0.5, -0.1], to: [0.5, 0.14], enterAt: 100, killAt: 1300 },
      { from: [0.7, -0.1], to: [0.7, 0.2], enterAt: 200, killAt: 1450 },
    ]
      .map(({ from, to, enterAt, killAt }, i) =>
        shmupEnemy(view, {
          from: from as [number, number],
          to: to as [number, number],
          enterAt,
          inMs: 600,
          killAt,
          size: drone,
          sway: 0.03,
          seed: i * 2,
        }),
      )
      .concat(
        // two gunships swooping in from the sides, then the boss from the top
        shmupEnemy(view, {
          from: [-0.15, 0.05],
          to: [0.24, 0.25],
          enterAt: 1250,
          inMs: 500,
          killAt: 2350,
          size: gunship,
          sway: 0.04,
          seed: 1,
        }),
        shmupEnemy(view, {
          from: [1.15, 0.05],
          to: [0.76, 0.25],
          enterAt: 1350,
          inMs: 500,
          killAt: 2500,
          size: gunship,
          sway: 0.04,
          seed: 3,
        }),
        shmupEnemy(view, {
          from: [0.5, -0.25],
          to: [0.5, 0.2],
          enterAt: 2400,
          inMs: 500,
          killAt: 3550,
          size: WISP_SIZE * 2.2,
        }),
      );
    const speed = HAIL_SPEED * w;
    const hail: Bullet[] = [];
    const fan = (i: number, ms: number, count: number, spread: number) => {
      const at = enemySpot(enemies[i], ms);
      const to = ship(ms);
      const aim = Math.atan2(to.y - at.y, to.x - at.x);
      hail.push(...bulletFan(at, aim, spread, count, ms, speed, box));
    };
    for (let i = 0; i < 3; i++) {
      fan(i, 600 + i * 100, 5, 0.8);
      fan(i, 950 + i * 60, 3, 0.4);
    }
    for (const [i, ms, turn] of [
      [3, 1700, 0],
      [4, 1850, 0.2],
      [3, 2050, 0.1],
      [4, 2200, 0.3],
    ])
      hail.push(
        ...bulletRing(enemySpot(enemies[i], ms), 14, ms, speed, box, turn),
      );
    hail.push(
      ...bulletSpiral(
        enemySpot(enemies[BOSS], 2900),
        {
          arms: 5,
          rateHz: [8, 18],
          lapsHz: [0.25, 0.7],
          fromMs: 2850,
          toMs: 3500,
          turn: 0,
          spin: 1,
        },
        speed,
        box,
      ),
    );
    fan(BOSS, 3050, 7, 1.1);
    fan(BOSS, 3300, 7, 1.1);

    const shots = planShipGuns(
      ship,
      enemies,
      {
        fromMs: SHOOT[0],
        toMs: SHOOT[1],
        every: SHOT_EVERY,
        speed: SHOT_SPEED * w,
        twin: TWIN * SHIP_SIZE * w,
        nose: SHIP_SIZE * w,
        lead: LEAD_MS,
      },
      box,
    );

    // each kill a blast that pays, the boss's then bursting into a cluster
    const blasts: Blast[] = enemies.map((e, i) => ({
      at: enemySpot(e, e.killAt),
      ms: e.killAt,
      size: (i < 3 ? DRONE_BLAST : i < BOSS ? GUNSHIP_BLAST : BOSS_BLAST) * w,
      shake: i < 3 ? 1.2 : i < BOSS ? 1.6 : 2.6,
      payouts: i < BOSS ? payoutsPerKill : payoutsBoss,
      boss: i === BOSS,
    }));
    const core = blasts[BOSS].at;
    for (let k = 0; k < CLUSTER; k++) {
      const a = (k / CLUSTER) * Math.PI * 2 + 0.4;
      const reach = CLUSTER_REACH * w * (0.6 + 0.4 * (k % 2));
      blasts.push({
        at: {
          x: core.x + Math.cos(a) * reach,
          y: core.y + Math.sin(a) * reach,
        },
        ms: blasts[BOSS].ms + (k + 1) * CLUSTER_EVERY,
        size: CLUSTER_BLAST * w,
        shake: 1.4,
        payouts: 0,
        boss: false,
      });
    }
    return {
      enemies,
      hail,
      shots,
      shotBullets: shots.map((s) => s.bullet),
      blasts,
      heat: enemies.map(() => 0),
    };
  };

  let planned: Plan | null = null;
  let beats: Beats<Blast> | null = null;
  const ship: Point = { x: 0, y: 0 };
  const ahead: Point = { x: 0, y: 0 };

  const drawScene = (
    ctx: CanvasRenderingContext2D,
    view: FlightView,
    ms: number,
    now: number,
  ): void => {
    if (!planned) {
      planned = plan(view);
      beats = createBeats(
        planned.blasts,
        (b) => b.ms,
        (b) => {
          if (b.boss) playSlamExplosion();
          else playExplosion();
          shakeScreen(b.shake);
          if (b.payouts > 0) {
            addTotalIncome(
              multiply(rewardPayoutAmount(floor, Date.now()), b.payouts),
            );
            pulseHudTotalFlash();
          }
        },
      );
    }
    const { enemies, hail, shots, shotBullets, blasts, heat } = planned;
    beats?.tick(ms, now);
    drawStarfield(ctx, view, ms, now);
    drawBullets(ctx, hail, ms, now, HAIL_SIZE);
    drawBullets(ctx, shotBullets, ms, now, SHOT_SIZE);
    shotHeat(shots, ms, heat);
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      drawWispBetween(ctx, e.at, ms, now, e.size, heat[i], e.enterAt, e.killAt);
    }
    shipAt(view, ms, ship);
    const size = SHIP_SIZE * view.w;
    if (ship.y > view.y - size * 2) {
      const lean = (shipAt(view, ms + 50, ahead).x - ship.x) / size;
      const bank = Math.max(-1, Math.min(1, lean * BANK));
      const exhausts = drawShmupShip(ctx, SHMUP_SHIP, ship, size, bank);
      drawShipFlames(ctx, exhausts, ms, now, FLAME, TRAIL * view.h);
    }
    for (const b of blasts) drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
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
    shakeScreen(0.8);
  });
}
