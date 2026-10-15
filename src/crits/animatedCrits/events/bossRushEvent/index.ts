// the "Boss Rush" event (shmup; crit tiers), a flight-stage event (see
// ../../flightStage) on the Shmup look (shared/animationStyles/shmup): the
// floors shrink away into space under one giant boss, three rings of wisps
// orbiting a core. Each ring fires its own pattern (fans, a whirling spiral,
// rings) while the player's wisp weaves below and its guns peel the ring off
// in a rolling chain of blasts, quicker each; the bare core charges,
// trembling and glowing, and fires a huge beam the wisp swerves from, then
// the wisp's own beam blows the core apart in a chain and the biggest blast;
// the floors rush back up and every bar in view takes a crit tier up
import meta from "./meta";
import type { Floor } from "../../../../gameState";
import { COLOR } from "../../../../palette";
import { playSwoosh } from "../../../../sound";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import {
  bulletFan,
  bulletRing,
  bulletSpiral,
  drawBullets,
  type Box,
  type Bullet,
} from "../../../../shared/animationStyles/bullets";
import {
  chargeAt,
  drawChargeGlow,
  drawChargeStreaks,
  planCharge,
  tickCharge,
  trembleAt,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import { createBeats, type Beats } from "../../../../shared/eventBeats";
import {
  clamp01,
  easeOutCubic,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import {
  playExplosion,
  playSlamExplosion,
} from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { drawScreenPart } from "../../../../shared/screenCopy";
import { drawStarfield } from "../../../../shared/animationStyles/shmup";
import {
  drawWisp,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { findRewardBars } from "../../eventRewards";
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

const KEY = "bossRush";

// the boss: its core (of the view's width and height), arriving over
// ARRIVE_MS; each ring's radius (of the view's width), wisps, fight and the
// ms its wisps blow apart PEEL_MS apart, then a GAP before the next
const BOSS_Y = 0.24;
const ARRIVE_MS = 400;
const SQUASH = 0.6;
const SPIN = 0.0009;
const RINGS = [
  { radius: 0.24, count: 16, fightMs: 600 },
  { radius: 0.17, count: 12, fightMs: 500 },
  { radius: 0.1, count: 8, fightMs: 400 },
];
const PEEL_MS = 40;
const GAP_MS = 100;
const RING_WISP = WISP_SIZE * 1.1;
const RING_BLAST = 0.07;
const RING_BLAST_GROW = 0.015;
const RING_SHAKE = 0.5;
const RING_SHAKE_GROW = 0.25;
const CORE = WISP_SIZE * 3;
const CORE_GROW = WISP_SIZE;
// the core's charge, its beam and the wisp's answer, then the chain
const CHARGE_MS = 500;
const TREMBLE = 18;
const STREAKS = 0.29;
const GLOW = 0.29;
const BEAM_MS = 260;
const BEAM = 0.12;
const ANSWER_MS = 260;
const ANSWER = 0.065;
const CHAIN = 6;
const CHAIN_AFTER_MS = 150;
const CHAIN_EVERY = 60;
const CHAIN_REACH: [number, number] = [0.1, 0.07];
const CHAIN_BLAST = 0.2;
const CHAIN_SHAKE = 1.2;
const BOOM_AFTER_MS = 90;
const BOOM_BLAST = 0.34;
const BOOM_SHAKE = 3;
// the player's wisp: its height down the view, weave (of the view's width),
// the dodge from the core's beam, its twin guns' gap and bolts
const SHIP_Y = 0.84;
const WEAVE = 0.28;
const WEAVE_RATE = 0.002;
const DODGE = 0.3;
const DODGE_LEAD_MS = 250;
const DODGE_MS = 200;
const RACER = WISP_SIZE * 1.6;
const TWIN = 0.02;
const NOSE = 0.03;
const BOLT_MS = 90;
const BOLT_TAIL = 0.15;
const BOLT = 22;
// the boss's bullets: speed (of the view's width a ms) and size
const HAIL_SPEED = 0.00072;
const HAIL_SIZE = WISP_SIZE * 0.5;

interface Ring {
  radius: number;
  count: number;
  from: number;
  kill: number;
  turn: number;
  // each wisp's spot at ms, and when it blows
  wisps: { at: (ms: number) => Point; dies: number }[];
}
interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
  boom: boolean;
}
interface Plan {
  boss: Point;
  rings: Ring[];
  hail: Bullet[];
  charge: Charge;
  beamAt: number;
  answerAt: number;
  boomAt: number;
  blasts: Blast[];
}

registerEventProc(
  {
    key: KEY,
    chance: () => meta.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) => floor.unlocked && canStartFlightStage(context),
    arm: startBossRush,
  },
  { label: "Boss Rush", color: COLOR.fullHouseCrimson },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Boss
// Rush
export function forceBossRushEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

function startBossRush(floor: Floor, context: EventProcContext): void {
  const { enterMs, flyMs, tierGapMs } = meta.values;
  const tier = context.critTier ?? pickCritTierByOdds();

  // the player's wisp at ms on the flight's clock, swerving off the core's
  // beam until its own answer
  const shipAt = (
    view: FlightView,
    plan: Plan,
    ms: number,
    into: Point,
  ): Point => {
    const dodge =
      smoothstep(clamp01((ms - plan.beamAt + DODGE_LEAD_MS) / DODGE_MS)) *
      (1 - smoothstep(clamp01((ms - plan.answerAt) / DODGE_MS)));
    const enter = easeOutCubic(clamp01((ms + enterMs) / enterMs));
    into.x =
      view.cx + view.w * (WEAVE * Math.sin(ms * WEAVE_RATE) + DODGE * dodge);
    into.y = view.y + view.h * lerp([1.2, SHIP_Y], enter);
    return into;
  };

  const plan = (view: FlightView): Plan => {
    const { w } = view;
    const box: Box = {
      left: view.x - 60,
      right: view.x + w + 60,
      top: view.y - 60,
      bottom: view.y + view.h + 60,
    };
    const boss = { x: view.cx, y: view.y + view.h * BOSS_Y };
    let t = ARRIVE_MS;
    const rings: Ring[] = RINGS.map((ring, i) => {
      const from = t;
      const kill = from + ring.fightMs;
      t = kill + ring.count * PEEL_MS + GAP_MS;
      const radius = ring.radius * w;
      const turn = i % 2 ? -1 : 1;
      return {
        radius,
        count: ring.count,
        from,
        kill,
        turn,
        wisps: Array.from({ length: ring.count }, (_, k) => {
          const spot: Point = { x: 0, y: 0 };
          const dies = kill + k * PEEL_MS;
          return {
            dies,
            at: (ms: number) => {
              const grow = easeOutCubic(clamp01(ms / ARRIVE_MS));
              const a =
                (k / ring.count) * Math.PI * 2 +
                Math.min(ms, dies) * SPIN * turn;
              spot.x = boss.x + Math.cos(a) * radius * grow;
              spot.y = boss.y + Math.sin(a) * radius * SQUASH * grow;
              return spot;
            },
          };
        }),
      };
    });
    const speed = HAIL_SPEED * w;
    const hail: Bullet[] = [];
    for (const d of [100, 300, 500])
      hail.push(
        ...bulletFan(boss, Math.PI / 2, 1.3, 9, rings[0].from + d, speed, box),
      );
    hail.push(
      ...bulletSpiral(
        boss,
        {
          arms: 3,
          rateHz: [8, 16],
          lapsHz: [0.3, 0.8],
          fromMs: rings[1].from,
          toMs: rings[1].kill,
          turn: 0,
          spin: 1,
        },
        speed,
        box,
      ),
    );
    [80, 200, 320].forEach((d, k) =>
      hail.push(
        ...bulletRing(boss, 24, rings[2].from + d, speed, box, k * 0.13),
      ),
    );
    const charge = planCharge(t, CHARGE_MS, { bang: false });
    const beamAt = charge.climaxMs;
    const answerAt = beamAt + BEAM_MS + 40;
    const blasts: Blast[] = [];
    rings.forEach((ring, i) => {
      for (const wisp of ring.wisps) {
        const at = wisp.at(wisp.dies);
        blasts.push({
          at: { x: at.x, y: at.y },
          ms: wisp.dies,
          size: (RING_BLAST + RING_BLAST_GROW * i) * w,
          shake: RING_SHAKE + RING_SHAKE_GROW * i,
          boom: false,
        });
      }
    });
    for (let k = 0; k < CHAIN; k++) {
      const a = k * 2.1;
      blasts.push({
        at: {
          x: boss.x + Math.cos(a) * CHAIN_REACH[0] * w,
          y: boss.y + Math.sin(a) * CHAIN_REACH[1] * w,
        },
        ms: answerAt + CHAIN_AFTER_MS + k * CHAIN_EVERY,
        size: CHAIN_BLAST * w,
        shake: CHAIN_SHAKE,
        boom: false,
      });
    }
    const boomAt =
      answerAt + CHAIN_AFTER_MS + CHAIN * CHAIN_EVERY + BOOM_AFTER_MS;
    blasts.push({
      at: boss,
      ms: boomAt,
      size: BOOM_BLAST * w,
      shake: BOOM_SHAKE,
      boom: true,
    });
    return { boss, rings, hail, charge, beamAt, answerAt, boomAt, blasts };
  };

  let planned: Plan | null = null;
  let beats: Beats<Blast> | null = null;
  let shipPath: ((ms: number) => Point) | null = null;
  let corePath: ((ms: number) => Point) | null = null;
  const ship: Point = { x: 0, y: 0 };
  const core: Point = { x: 0, y: 0 };
  const shiver: Point = { x: 0, y: 0 };
  const boltFrom: Point = { x: 0, y: 0 };
  const boltTo: Point = { x: 0, y: 0 };
  const beamTo: Point = { x: 0, y: 0 };
  let coreHeat = 0;

  const drawScene = (
    ctx: CanvasRenderingContext2D,
    view: FlightView,
    ms: number,
    now: number,
  ): void => {
    if (!planned) {
      const p = plan(view);
      planned = p;
      shipPath = (t) => shipAt(view, p, t, ship);
      corePath = () => core;
      beats = createBeats(
        p.blasts,
        (b) => b.ms,
        (b) => {
          if (b.boom) playSlamExplosion();
          else playExplosion();
          shakeScreen(b.shake);
        },
      );
    }
    const { boss, rings, hail, charge, beamAt, answerAt, boomAt, blasts } =
      planned;
    const { w } = view;
    beats?.tick(ms, now);
    tickCharge(charge, ms);
    drawStarfield(ctx, view, ms, now);
    drawBullets(ctx, hail, ms, now, HAIL_SIZE);
    for (const ring of rings)
      for (const wisp of ring.wisps)
        drawWispBetween(
          ctx,
          wisp.at,
          ms,
          now,
          RING_WISP,
          ms >= ring.from ? 0.6 : 0.3,
          -enterMs,
          wisp.dies,
        );
    shipAt(view, planned, ms, ship);
    // its twin guns on the ring it's fighting, its beam on the core
    for (const ring of rings) {
      if (ms < ring.from || ms >= ring.kill + ring.count * PEEL_MS) continue;
      const u = ((ms - ring.from) % BOLT_MS) / BOLT_MS;
      const back = Math.max(0, u - BOLT_TAIL);
      for (let side = -1; side <= 1; side += 2) {
        const fromX = ship.x + side * TWIN * w;
        const fromY = ship.y - NOSE * w;
        const toX = boss.x + side * TWIN * w * 2;
        const toY = boss.y + ring.radius * SQUASH;
        boltFrom.x = lerp([fromX, toX], back);
        boltFrom.y = lerp([fromY, toY], back);
        boltTo.x = lerp([fromX, toX], u);
        boltTo.y = lerp([fromY, toY], u);
        drawBeam(ctx, boltFrom, boltTo, BOLT, 0.9);
      }
    }
    const beam = ms - beamAt;
    if (beam >= 0 && beam < BEAM_MS) {
      beamTo.x = boss.x;
      beamTo.y = view.y + view.h + 60;
      drawBeam(ctx, boss, beamTo, BEAM * w, 1 - beam / BEAM_MS);
    }
    if (ms >= answerAt && ms < boomAt)
      drawBeam(
        ctx,
        ship,
        boss,
        ANSWER * w * Math.min(1, (ms - answerAt) / ANSWER_MS + 0.3),
        0.95,
      );
    if (ms < boomAt) {
      const c = ms >= charge.startMs && ms < beamAt ? chargeAt(charge, ms) : 0;
      trembleAt(c, ms, TREMBLE, shiver);
      core.x = boss.x + shiver.x;
      core.y = boss.y + shiver.y;
      if (c > 0) {
        drawChargeStreaks(ctx, boss, c, STREAKS * w, ms);
        drawChargeGlow(ctx, core, c, GLOW * w, now);
      }
      coreHeat = ms >= answerAt ? 1 : 0.5 + c;
      if (corePath)
        drawWisp(ctx, corePath, ms, now, CORE + CORE_GROW * c, coreHeat);
    }
    if (shipPath) drawWisp(ctx, shipPath, ms, now, RACER, 0.6);
    for (const b of blasts) drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
  };

  const beat = startFlightStage(KEY, floor, context, {
    flyMs,
    enter: {
      ms: enterMs,
      draw: (ctx, view, ms, now, floors) => {
        drawScene(ctx, view, ms - enterMs, now);
        // the floors shrinking away below into space
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
          view.cy - (view.h * k) / 2 + view.h * 0.3 * p,
          view.w * k,
          view.h * k,
        );
        ctx.globalAlpha = 1;
      },
    },
    draw: (ctx, view, ms, now) => drawScene(ctx, view, ms, now),
    onEnd: () => {
      beats?.tick(Infinity, performance.now());
      const bars = findRewardBars(floor, context);
      if (bars.length === 0) context.applyTierCrit?.(floor, tier);
      bars.forEach((bar, k) =>
        setTimeout(
          () => context.applyTierCrit?.(bar.floor, tier),
          k * tierGapMs,
        ),
      );
      endEventProc(KEY);
    },
  });
  if (!beat) return;
  beat(-enterMs, () => {
    playSwoosh();
    shakeScreen(0.8);
  });
}
