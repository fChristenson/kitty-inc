// the "Rev Up" event (charge; cash): it covers its crit, whose click freezes
// the screen while an engine wisp lights up beside the clicked floor's bar and
// revs: each rev a throb (swelling, a pulse of light, exhaust sparks spat out
// behind it, a jolt of the screen), the revs closing up and hitting harder as
// its glow builds white-hot and streaks of light race into it off the floors,
// the rumble rising; at the climax it launches with a bang and the hardest
// shake, rocketing up the screen in a blink onto the total, dragging a river
// of coins that pours in as it lands in a huge blast. Pays floor income ×
// floor number × reward
import meta from "./meta";
import { COLOR } from "../../../../palette";
import { playBlackHoleBubble, playBoostEventStream } from "../../../../sound";
import {
  chargeAt,
  drawChargeGlow,
  drawChargeStreaks,
  planCharge,
  tickCharge,
  trembleAt,
} from "../../../../shared/animationStyles/charge";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import { lerp, type Range } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { shakeScreen } from "../../../../shared/screenShake";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import {
  drawWisp,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import {
  getIncomeBarBox,
  getIncomeBarCenter,
} from "../../../../floors/incomePanel";
import {
  pourDurationMs,
  pourLine,
  riverHead,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";
import { registerWispEvent, startWispCover } from "../../wispCover";

const KEY = "revUp";
// the engine SIDE px left of the bar's start, at least EDGE px in from the side
const SIDE = 64;
const EDGE = 70;
// its glow GLOW of the screen's width across, each throb's flash PULSE of it,
// its streaks REACH across, trembling TREMBLE px
const GLOW = 0.24;
const PULSE = 0.2;
const REACH = 0.3;
const TREMBLE = 14;
const CORE: Range = [WISP_SIZE * 0.8, WISP_SIZE * 2.2];
// each throb swells it by SWELL and kicks it KICK px forward, over THROB_MS
const SWELL = 0.55;
const KICK = 12;
const THROB_MS = 180;
const REV_POWER: Range = [0.45, 1];
const REV_SHAKE: Range = [0.6, 2];
const REV_BURST: Range = [0.25, 0.65];
// rev k lands (k / revs) ** REV_CURVE of the way through: closing up
const REV_CURVE = 0.55;
// exhaust: SPARKS a rev (LAUNCH_SPARKS at launch) spat out over SPARK_MS
// along EXHAUST ± SPREAD / 2, falling DROP px
const SPARKS = 18;
const LAUNCH_SPARKS = 44;
const SPARK_MS = 380;
const SPARK_SPEED: Range = [520, 1400];
const SPARK_SIZE = 26;
const EXHAUST = Math.PI - 0.3;
const LAUNCH_EXHAUST = Math.PI / 2;
const SPREAD = 0.8;
const DROP = 60;
// streaks off each floor's bar: STREAM a bar, each trip CYCLE_MS at first,
// ACCEL times as many by the climax, LENGTH of the trip long
const STREAM = 5;
const CYCLE_MS = 560;
const ACCEL = 4;
const LENGTH = 0.16;
const STREAK_W = 8;
const MAX_FLOORS = 6;
// the launch's river
const RIVER_COINS = 650;
const RIVER_W = 30;
const RIVER_MS = 520;
const LAND_BURST = 0.9;

const from: Point = { x: 0, y: 0 };
const to: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

export const forceRevUpEvent = registerWispEvent(
  KEY,
  "Rev Up",
  () => meta.chance,
  (floor, context, area) => {
    const { firstMs, revMs, revs, launchMs, reward, holdMs, mergeMs } =
      meta.values;
    const width = area.right - area.left;
    const box = getIncomeBarBox(context.floors.indexOf(floor) === 0);
    const home: Point = {
      x: Math.max(area.left + EDGE, box.x - SIDE),
      y: box.y + box.height / 2,
    };
    const climaxMs = firstMs + revMs;
    const landAt = climaxMs + launchMs;
    const charge = planCharge(firstMs, revMs, {
      shake: [0.05, 0.35],
      climaxShake: 3.8,
    });

    // the revs, closing up and hitting harder
    const revAt: number[] = [];
    const revPower: number[] = [];
    for (let k = 0; k < revs; k++) {
      revAt.push(firstMs + revMs * (k / revs) ** REV_CURVE);
      revPower.push(lerp(REV_POWER, k / (revs - 1)));
    }
    // every exhaust puff (each rev, then the launch): when, how hard, and
    // each spark's heading, built once
    const puffAt = [...revAt, climaxMs];
    const puffPower = [...revPower, 1.6];
    const puffCount = puffAt.map((_, j) => (j < revs ? SPARKS : LAUNCH_SPARKS));
    const sparkCos = puffAt.map(() => new Float32Array(LAUNCH_SPARKS));
    const sparkSin = puffAt.map(() => new Float32Array(LAUNCH_SPARKS));
    const sparkSpeed = puffAt.map(() => new Float32Array(LAUNCH_SPARKS));
    for (let j = 0; j < puffAt.length; j++)
      for (let i = 0; i < puffCount[j]; i++) {
        const a =
          (j < revs ? EXHAUST : LAUNCH_EXHAUST) +
          (hash01(i, j + 4410) - 0.5) * SPREAD * (j < revs ? 1 : 1.6);
        sparkCos[j][i] = Math.cos(a);
        sparkSin[j][i] = Math.sin(a);
        sparkSpeed[j][i] =
          lerp(SPARK_SPEED, hash01(i, j + 4411)) * puffPower[j];
      }

    // the floors in view, whose bars the light streaks in off
    const onScreen = context.getOnScreenFloors?.() ?? [];
    const top = onScreen.find((entry) => entry.floor === floor)?.top ?? 0;
    const sourceX: number[] = [];
    const sourceY: number[] = [];
    for (const entry of onScreen) {
      if (sourceX.length >= MAX_FLOORS * STREAM) break;
      const isGround = context.floors.indexOf(entry.floor) === 0;
      const center = getIncomeBarCenter(isGround);
      const bar = getIncomeBarBox(isGround);
      const y = center.y + entry.top - top;
      if (y < area.top || y > area.bottom) continue;
      for (let i = 0; i < STREAM; i++) {
        sourceX.push(bar.x + bar.width * hash01(i, sourceX.length + 4420));
        sourceY.push(y);
      }
    }
    // warped time: the streaks' trips come quicker and quicker
    const trips = (ms: number) => {
      const t = Math.max(0, ms - firstMs);
      return (t + ((ACCEL - 1) * t * t) / (2 * revMs)) / CYCLE_MS;
    };

    // the launch: up the screen onto the total, bowing out a touch
    const total = totalSpot(area);
    const bow: Point = { x: home.x, y: (home.y + total.y) / 2 };
    const line = sampleLine((u) => {
      const v = 1 - u;
      return {
        x: v * v * home.x + 2 * v * u * bow.x + u * u * total.x,
        y: v * v * home.y + 2 * v * u * bow.y + u * u * total.y,
      };
    }, 40);
    const head = riverHead(line, launchMs, climaxMs);
    const river: Pour = {
      coinsAlong: RIVER_COINS,
      width: RIVER_W,
      streamMs: RIVER_MS,
      travelMs: launchMs,
    };

    const throbAt = (ms: number) => {
      let p = 0;
      for (let k = 0; k < revs; k++) {
        const age = ms - revAt[k];
        if (age < 0) break;
        if (age < THROB_MS) {
          const f = 1 - age / THROB_MS;
          p = f * f * revPower[k];
        }
      }
      return p;
    };
    // the engine: trembling and kicking with each rev, then riding the
    // river's head up into the total
    const shiver: Point = { x: 0, y: 0 };
    const engine: Point = { x: 0, y: 0 };
    const engineAt = (ms: number): Point | null => {
      if (ms >= climaxMs) return head(ms);
      trembleAt(chargeAt(charge, ms), ms, TREMBLE, shiver);
      engine.x = home.x + shiver.x + KICK * throbAt(ms);
      engine.y = home.y + shiver.y;
      return engine;
    };

    const revving = createBeats(
      revAt,
      (t) => t,
      (t, k) => {
        cover!.burst(home, lerp(REV_BURST, k / (revs - 1)));
        if (!cover!.isLive()) return;
        shakeScreen(lerp(REV_SHAKE, k / (revs - 1)));
        playBlackHoleBubble(chargeAt(charge, t + 1));
      },
    );
    const launching = createBeats(
      [climaxMs],
      (t) => t,
      () => {
        cover!.burst(home, 1.2);
        pourLine(cover!, line, river);
      },
    );
    const landing = createBeats(
      [landAt],
      (t) => t,
      () => {
        const at = cover!.total() ?? total;
        cover!.burst(at, LAND_BURST);
        cover!.blast(at);
      },
    );

    const drawExhaust = (ctx: CanvasRenderingContext2D, ms: number) => {
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let j = 0; j < puffAt.length; j++) {
        const age = ms - puffAt[j];
        if (age < 0) break;
        if (age > SPARK_MS) continue;
        const f = age / SPARK_MS;
        const size = SPARK_SIZE * (1 - f) * (0.6 + 0.4 * puffPower[j]);
        const reach = (age / 1000) * (1 - 0.4 * f);
        const cos = sparkCos[j];
        const sin = sparkSin[j];
        const speed = sparkSpeed[j];
        for (let i = 0; i < puffCount[j]; i++) {
          const d = speed[i] * reach;
          stampGlimmer(
            ctx,
            home.x + cos[i] * d,
            home.y + sin[i] * d + DROP * f * f,
            size,
            i + j * 7,
            i % 3 ? COLOR.heavenlyGold : COLOR.white,
          );
        }
      }
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
    };

    const drawStreaks = (ctx: CanvasRenderingContext2D, ms: number) => {
      const trip = trips(ms);
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < sourceX.length; i++) {
        const seed = hash01(i, 4421);
        // not set off yet: its first trip would have begun before the start
        if (trip + seed < 1) continue;
        const u = (trip + seed) % 1;
        const e = u * u;
        const b = Math.max(0, u - LENGTH) ** 2;
        from.x = sourceX[i] + (spot.x - sourceX[i]) * b;
        from.y = sourceY[i] + (spot.y - sourceY[i]) * b;
        to.x = sourceX[i] + (spot.x - sourceX[i]) * e;
        to.y = sourceY[i] + (spot.y - sourceY[i]) * e;
        drawBeam(ctx, from, to, STREAK_W, 0.35 + 0.55 * u);
      }
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
    };

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs: Math.max(
          pourDurationMs(climaxMs, river),
          landAt + holdMs + mergeMs,
        ),
        mergeMs,
      },
      {
        rewardMultiplier: reward,
        tick: (ms, now) => {
          if (cover?.isLive()) tickCharge(charge, ms);
          revving.tick(ms, now);
          launching.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < firstMs || ms > landAt + 700) return;
          drawExhaust(ctx, ms);
          if (ms < climaxMs) {
            const c = chargeAt(charge, ms);
            const p = throbAt(ms);
            const at = engineAt(ms)!;
            spot.x = at.x;
            spot.y = at.y;
            drawStreaks(ctx, ms);
            drawChargeStreaks(ctx, spot, c, width * REACH, ms);
            const glow = Math.min(1, c + 0.4 * p);
            drawChargeGlow(ctx, spot, glow, width * GLOW, now);
            drawChargeGlow(ctx, spot, p, width * PULSE * (0.6 + 0.8 * c), now);
            drawWisp(
              ctx,
              engineAt,
              ms,
              now,
              lerp(CORE, c) * (1 + SWELL * p),
              Math.min(1, c + p),
            );
            return;
          }
          const at = head(ms);
          if (at) drawChargeGlow(ctx, at, 1, width * GLOW * 0.6, now);
          drawWispBetween(ctx, engineAt, ms, now, CORE[1], 1, firstMs, landAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
