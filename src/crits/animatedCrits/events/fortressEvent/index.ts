// the "Fortress" event (shmup; cash), a flight-stage event (see
// ../../flightStage) with its own way in, on the Shmup look (shared/shmup):
// its crit's click lifts the view high off the floors into space, where a
// fortress core hangs at the top of the screen inside three rings of shield
// wisps turning opposite ways, firing rings of bullets; the ship weaves
// below, its twin guns blowing the rings apart wisp by wisp, outer ring
// first, quicker and quicker, each paying into the live total, then pouring
// into the bare core till it goes up in a chain of blasts; the ship streaks
// off the top and the floors rush up onto the view
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playSwoosh } from "../../../../sound";
import { multiply } from "../../../../shared/bigNumber";
import {
  aimBullet,
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
  easeOutBack,
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
  SHMUP_SHIP,
} from "../../../../shared/shmup";
import { pulseHudTotalFlash } from "../../../../shared/totalIncomeCoins";
import {
  drawWispBetween,
  drawWispHead,
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

const KEY = "fortress";

// the ship: its half span (of the view's width), its height down the view,
// its weave (of the view's width, two sines), how far it banks, the ms it
// starts climbing off the top, its flames and how fast they stream back
const SHIP_SIZE = 0.06;
const SHIP_Y = 0.8;
const WEAVE: [number, number] = [0.22, 0.06];
const WEAVE_HZ: [number, number] = [0.45, 1.1];
const BANK = 4;
const FLAME = WISP_SIZE * 0.35;
const TRAIL = 0.0012;
const TWIN = 0.35;
// the core's spot (shares of the view) and size; the rings' radii (of the
// view's width), wisps, turn (rad a ms) and how flat they're seen
const CORE: [number, number] = [0.5, 0.28];
const CORE_SIZE = WISP_SIZE * 2;
const RINGS = [
  { r: 0.34, n: 18, spin: 0.0012 },
  { r: 0.24, n: 14, spin: -0.0018 },
  { r: 0.145, n: 10, spin: 0.0026 },
];
const SQUASH = 0.55;
const NODE = WISP_SIZE * 0.6;
const GROW_MS = 300;
// the guns open up at FIRST, the gap between kills shrinking from KILL_GAP
// by QUICKEN a kill down to MIN_GAP; each shot flies FLY_MS
const FIRST = 400;
const KILL_GAP = 80;
const QUICKEN = 0.95;
const MIN_GAP = 28;
const FLY_MS = 120;
const SHOT_SIZE = WISP_SIZE * 0.3;
// the shots into the bare core, then its chain of blasts and the last
const CORE_SHOTS = 10;
const CORE_GAP = 35;
const CORE_SPREAD = 0.025;
const CHAIN = 8;
const CHAIN_GAP = 45;
const CHAIN_REACH = 0.07;
// the fortress's bullets: rings at these ms, a spiral over the core phase
const HAIL_RINGS = [500, 1000, 1450, 1850];
const HAIL_RING = 16;
const HAIL_SPEED = 0.00055;
const HAIL_SIZE = WISP_SIZE * 0.4;
// blasts (of the view's width) and shakes
const NODE_BLAST = 0.1;
const CORE_HIT_BLAST = 0.07;
const CHAIN_BLAST = 0.16;
const BOOM_BLAST = 0.95;
const NODE_SHAKE = 0.6;
const CORE_HIT_SHAKE = 0.5;
const CHAIN_SHAKE = 1.4;
const BOOM_SHAKE = 2.6;
const SOUND_GAP_MS = 55;

interface Node {
  ring: (typeof RINGS)[number];
  i: number;
  killAt: number;
  at: (ms: number) => Point | null;
}

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
  payouts: number;
  boom: boolean;
}

interface Plan {
  nodes: Node[];
  core: Point;
  boomAt: number;
  hail: Bullet[];
  shots: Bullet[];
  blasts: Blast[];
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.fortressEvent.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) => floor.unlocked && canStartFlightStage(context),
    arm: startFortress,
  },
  { label: "Fortress", color: COLOR.fullHouseCrimson },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Fortress
export function forceFortressEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

function startFortress(floor: Floor, context: EventProcContext): void {
  const { enterMs, flyMs, leaveMs, payoutsPerNode, payoutsCore } =
    CONFIG.fortressEvent;
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
            easeIn(clamp01((ms - leaveMs) / (flyMs - leaveMs))),
          );
    into.y = view.y + view.h * y;
    return into;
  };

  // the rings, every shot and blast, planned once the view's known
  const plan = (view: FlightView): Plan => {
    const { w } = view;
    const box: Box = {
      left: view.x - 30,
      right: view.x + w + 30,
      top: view.y - 30,
      bottom: view.y + view.h + 30,
    };
    const core: Point = {
      x: view.x + view.w * CORE[0],
      y: view.y + view.h * CORE[1],
    };
    const ringSpot = (
      ring: (typeof RINGS)[number],
      i: number,
      ms: number,
      into: Point,
    ) => {
      const a = (i / ring.n) * Math.PI * 2 + ms * ring.spin;
      const r = ring.r * w * easeOutBack(clamp01(ms / GROW_MS));
      into.x = core.x + Math.cos(a) * r;
      into.y = core.y + Math.sin(a) * r * SQUASH;
      return into;
    };
    // outer ring first, each ring round in order
    let clock = FIRST;
    const nodes: Node[] = RINGS.flatMap((ring, k) =>
      Array.from({ length: ring.n }, (_, i) => ({ ring, i, k })),
    ).map(({ ring, i }, k) => {
      const killAt = clock;
      clock += Math.max(MIN_GAP, KILL_GAP * QUICKEN ** k);
      const spot: Point = { x: 0, y: 0 };
      return {
        ring,
        i,
        killAt,
        at: (ms: number) =>
          ms < 0 || ms >= killAt ? null : ringSpot(ring, i, ms, spot),
      };
    });
    const coreShots = Array.from(
      { length: CORE_SHOTS },
      (_, k) => clock + 60 + k * CORE_GAP,
    );
    const chainAt = coreShots[CORE_SHOTS - 1] + 80;
    const boomAt = chainAt + CHAIN * CHAIN_GAP + 80;

    const ship = (ms: number) => shipAt(view, ms, { x: 0, y: 0 });
    const gun = (k: number, ms: number): Point => {
      const at = ship(ms);
      return {
        x: at.x + (k % 2 ? 1 : -1) * TWIN * SHIP_SIZE * w,
        y: at.y - SHIP_SIZE * w,
      };
    };
    const shootAt = (k: number, to: Point, hitMs: number) => {
      const from = gun(k, hitMs - FLY_MS);
      const reach = Math.hypot(to.x - from.x, to.y - from.y) || 1;
      return aimBullet(from, to, hitMs - FLY_MS, reach / FLY_MS);
    };
    const coreHits = coreShots.map((ms, k) => ({
      at: {
        x: core.x + (k % 2 ? 1 : -1) * CORE_SPREAD * w,
        y: core.y + CORE_SPREAD * w * ((k % 3) - 1),
      },
      ms,
    }));
    const shots = [
      ...nodes.map((n, k) =>
        shootAt(k, ringSpot(n.ring, n.i, n.killAt, { x: 0, y: 0 }), n.killAt),
      ),
      ...coreHits.map((h, k) => shootAt(k, h.at, h.ms)),
    ];

    const speed = HAIL_SPEED * w;
    const hail: Bullet[] = HAIL_RINGS.flatMap((ms, k) =>
      bulletRing(core, HAIL_RING, ms, speed, box, k * 0.2),
    );
    hail.push(
      ...bulletSpiral(
        core,
        {
          arms: 4,
          rateHz: [8, 16],
          lapsHz: [0.3, 0.7],
          fromMs: clock - 300,
          toMs: chainAt,
          turn: 0,
          spin: 1,
        },
        speed,
        box,
      ),
    );

    const blasts: Blast[] = [
      ...nodes.map((n) => ({
        at: ringSpot(n.ring, n.i, n.killAt, { x: 0, y: 0 }),
        ms: n.killAt,
        size: NODE_BLAST * w,
        shake: NODE_SHAKE,
        payouts: payoutsPerNode,
        boom: false,
      })),
      ...coreHits.map((h) => ({
        at: h.at,
        ms: h.ms,
        size: CORE_HIT_BLAST * w,
        shake: CORE_HIT_SHAKE,
        payouts: 0,
        boom: false,
      })),
      ...Array.from({ length: CHAIN }, (_, k) => {
        const a = k * 2.4;
        const reach = CHAIN_REACH * w * (1 + k * 0.2);
        return {
          at: {
            x: core.x + Math.cos(a) * reach,
            y: core.y + Math.sin(a) * reach * SQUASH,
          },
          ms: chainAt + k * CHAIN_GAP,
          size: CHAIN_BLAST * w,
          shake: CHAIN_SHAKE,
          payouts: 0,
          boom: false,
        };
      }),
      {
        at: core,
        ms: boomAt,
        size: BOOM_BLAST * w,
        shake: BOOM_SHAKE,
        payouts: payoutsCore,
        boom: true,
      },
    ];
    return { nodes, core, boomAt, hail, shots, blasts };
  };

  let planned: Plan | null = null;
  let beats: Beats<Blast> | null = null;
  let soundAt = -Infinity;
  const ship: Point = { x: 0, y: 0 };
  const ahead: Point = { x: 0, y: 0 };
  const coreAt = (): Point => planned!.core;

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
        (b, _, at) => {
          if (b.boom) playSlamExplosion();
          else if (at - soundAt >= SOUND_GAP_MS) {
            soundAt = at;
            playExplosion();
          }
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
    const { nodes, boomAt, hail, shots, blasts } = planned;
    beats?.tick(ms, now);
    drawStarfield(ctx, view, ms, now);
    drawBullets(ctx, hail, ms, now, HAIL_SIZE);
    drawBullets(ctx, shots, ms, now, SHOT_SIZE);
    for (const n of nodes)
      if (ms >= 0 && ms < n.killAt) drawWispHead(ctx, n.at, ms, now, NODE);
    const bare = clamp01(
      (ms - nodes[nodes.length - 1].killAt) /
        (boomAt - nodes[nodes.length - 1].killAt),
    );
    drawWispBetween(
      ctx,
      coreAt,
      ms,
      now,
      CORE_SIZE * easeOutBack(clamp01(ms / GROW_MS)),
      bare,
      0,
      boomAt,
    );
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
