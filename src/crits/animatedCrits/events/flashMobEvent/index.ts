// the "Flash Mob" event (swarm; free hires): it covers its crit, whose click
// freezes the screen while a mob of hundreds of bright specks and a few lead
// wisps pours in off the screen's edges and gathers into one mass that
// wheels round the building, streaming and folding, quicker and quicker; on
// every beat it pinches in and a chunk peels off and piles into a floor in
// view, packing tight and bursting in a flash, a new worker there; the waves
// come quicker, then the rest packs into one trembling ball and drives into
// the clicked floor in one blast and the hardest shake, several hires there.
// Then the crit's tier pays out
import meta from "./meta";
import { COLOR } from "../../../../palette";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import {
  diveAt,
  diveRest,
  drawDives,
  planDives,
  planSwarm,
  swarmAt,
  type Dives,
} from "../../../../shared/animationStyles/swarm";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { shakeScreen } from "../../../../shared/screenShake";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { FLOOR_W } from "../../../../floors/constants";
import { missingWorkerCount } from "../../../../floors/worker";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../../eventRewards";
import { registerWispEvent, startWispCover } from "../../wispCover";

const KEY = "flashMob";
const TAU = Math.PI * 2;
const MAX_WAVES = 6;
// the mob: COUNT specks SPECK px, LEADS of them lead wisps (the last ones, so
// they stay for the climax)
const COUNT = 380;
const SPECK = 22;
const LEADS = 4;
const LEAD = WISP_SIZE * 1.15;
// pouring in off ENTRIES points round the screen's edges (OUTSIDE of the
// width beyond them, JITTER of it either way), each speck flying FLY_IN ms
// bowed BOW of its way
const ENTRIES = 8;
const OUTSIDE = 0.06;
const JITTER = 0.08;
const FLY_IN = 240;
const BOW = 0.22;
// the dance: its middle orbits round the screen's middle ORBIT_X of the width
// across and ORBIT_Y of the height (at most ORBIT_Y_MAX widths) up and down,
// ORBIT_HZ laps a second speeding up; the mob SPREAD of the width across,
// thinning to THIN of it as the waves leave, folding FOLD in and out twice a
// lap, its members trailing up to LAG_MS, wheeling SPIN_HZ laps a second
const ORBIT_X = 0.2;
const ORBIT_Y = 0.17;
const ORBIT_Y_MAX = 0.5;
const ORBIT_HZ: [number, number] = [0.6, 1.6];
const SPREAD = 0.2;
const THIN = 0.75;
const FOLD = 0.22;
const LAG_MS = 160;
const SPIN_HZ: [number, number] = [0.4, 3];
const SQUASH = 0.75;
// on each beat it pinches in PINCH of its spread for about PINCH_MS
const PINCH = 0.45;
const PINCH_MS = 70;
// the waves: WAVE_SHARE of the mob in all, each wave's specks peeling off
// over WAVE_SPREAD_MS, each flying FLIGHT_MS; gaps shrink by GAP_DECAY down to
// GAP_MIN ms; each lands HIRE_UP px over its spot in a BLAST px blast
const WAVE_SHARE = 0.55;
const WAVE_SPREAD_MS = 90;
const FLIGHT_MS = 170;
const GAP_DECAY = 0.78;
const GAP_MIN = 90;
const HIRE_UP = 40;
const BLAST: [number, number] = [120, 200];
const HIRE_BURST = 0.6;
const HIRE_SHAKE: [number, number] = [0.8, 1.7];
const PEEL_SHAKE = 0.4;
const SOUND_GAP_MS = 55;
// the climax: PACK_AFTER ms after the last wave the rest packs into a ball
// PACK px across over packMs, trembling up to TREMBLE px and glowing, holds
// HOLD_MS, then drives in over DRIVE_SPREAD_MS
const PACK_AFTER = 140;
const PACK = 40;
const TREMBLE = 18;
const BALL_GLOW = 260;
const HOLD_MS = 80;
const DRIVE_SPREAD_MS = 50;
const CLIMAX_BLAST = 360;
const CLIMAX_SHAKE = 3.6;
// extra hires on the climax floor stand SPREAD_HIRES of its width apart
const SPREAD_HIRES = 0.14;
const EDGE = 0.12;
// the dance's path and spread, sampled every STEP_MS at arm
const STEP_MS = 4;

const GOLD = fadeStops(COLOR.heavenlyGold);
const WHITE = fadeStops(COLOR.white, 0.2);

interface Wave {
  hire: RewardHire;
  peel: number;
  lands: number;
  blast: number;
}

export const forceFlashMobEvent = registerWispEvent(
  KEY,
  "Flash Mob",
  () => meta.chance,
  (floor, context, area) => {
    const {
      firstMs,
      pourMs,
      danceMs,
      waveGapMs,
      packMs,
      clickedHires,
      holdMs,
      mergeMs,
    } = meta.values;
    const found = findRewardHires(floor, context);
    if (found.length === 0) return;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const mid: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };

    // the climax lands on the clicked floor (or, full, the nearest other);
    // the waves on the others, farthest first
    const away = (h: RewardHire) => Math.hypot(h.x - mid.x, h.y - mid.y);
    const own = found.find((h) => h.floor === floor);
    const others = found
      .filter((h) => h !== own)
      .sort((a, b) => away(b) - away(a))
      .slice(0, own ? MAX_WAVES : MAX_WAVES + 1);
    const climax = own ?? others.pop()!;
    const climaxHires = [climax];
    const extra = Math.min(clickedHires, missingWorkerCount(climax.floor)) - 1;
    for (let k = 1; k <= extra; k++) {
      const side = (k % 2 ? 1 : -1) * Math.ceil(k / 2);
      const x = Math.min(
        FLOOR_W * (1 - EDGE),
        Math.max(FLOOR_W * EDGE, climax.x + side * SPREAD_HIRES * FLOOR_W),
      );
      climaxHires.push({ ...climax, x, workerIndex: null, hiredAt: null });
    }
    const hires = [...others, ...climaxHires];

    // the beats: each wave peels off on one, gaps shrinking
    const n = others.length;
    let peel: number = firstMs + pourMs + danceMs;
    let gap: number = waveGapMs;
    const waves: Wave[] = others.map((hire, k) => {
      const wave = {
        hire,
        peel,
        lands: peel + WAVE_SPREAD_MS * 0.7 + FLIGHT_MS,
        blast: lerp(BLAST, k / Math.max(1, n - 1)),
      };
      peel += gap;
      gap = Math.max(GAP_MIN, gap * GAP_DECAY);
      return wave;
    });
    const lastPeel = n ? waves[n - 1].peel : peel;
    const packAt = lastPeel + PACK_AFTER;
    const packEnd = packAt + packMs;
    const driveAt = packEnd + HOLD_MS;
    const climaxLands = driveAt + DRIVE_SPREAD_MS + FLIGHT_MS;
    const endMs = climaxLands + DETONATION_MS;
    const targets: Point[] = [...others, climax].map((h) => ({
      x: h.x,
      y: h.y - HIRE_UP,
    }));
    const climaxAt = targets[n];

    // the dance's middle and spread, sampled at arm
    const orbitX = width * ORBIT_X;
    const orbitY = Math.min(height * ORBIT_Y, width * ORBIT_Y_MAX);
    const span = Math.max(1, packEnd - firstMs) / 1000;
    const base = width * SPREAD;
    const steps = Math.ceil((climaxLands + 200) / STEP_MS) + 2;
    const pathX = new Float32Array(steps);
    const pathY = new Float32Array(steps);
    const spreads = new Float32Array(steps);
    for (let s = 0; s < steps; s++) {
      const ms = s * STEP_MS;
      const t = Math.max(0, ms - firstMs) / 1000;
      const v = Math.min(t, span);
      const [a, b] = ORBIT_HZ;
      const turn =
        -Math.PI / 2 +
        TAU * (a * v + ((b - a) * v * v) / (2 * span) + b * (t - v));
      const grow = smoothstep(clamp01((ms - firstMs) / pourMs));
      let x = mid.x + Math.cos(turn) * orbitX * grow;
      let y = mid.y + Math.sin(turn) * orbitY * grow;
      let pulse = 0;
      for (let k = 0; k < n; k++) {
        const d = (ms - waves[k].peel) / PINCH_MS;
        pulse = Math.max(pulse, Math.exp(-d * d));
      }
      let r =
        base *
        lerp([1, THIN], clamp01((ms - firstMs) / (packAt - firstMs))) *
        (1 + FOLD * Math.sin(2 * turn)) *
        (1 - PINCH * pulse);
      const e = smoothstep(clamp01((ms - packAt) / packMs));
      if (e > 0) {
        const shiver = TREMBLE * clamp01((ms - packAt) / (driveAt - packAt));
        x += (mid.x - x) * e + Math.sin(ms * 0.09) * shiver;
        y += (mid.y - y) * e + Math.cos(ms * 0.11) * shiver;
        r += (PACK - r) * e;
      }
      pathX[s] = x;
      pathY[s] = y;
      spreads[s] = r;
    }
    const sample = (table: Float32Array, ms: number): number => {
      const f = Math.min(steps - 1.001, Math.max(0, ms / STEP_MS));
      const i = f | 0;
      return table[i] + (table[i + 1] - table[i]) * (f - i);
    };
    const swarm = planSwarm(
      (ms, into) => {
        into.x = sample(pathX, ms);
        into.y = sample(pathY, ms);
        return into;
      },
      {
        count: COUNT,
        startMs: firstMs,
        endMs: packEnd,
        spread: (ms) => sample(spreads, ms),
        spinHz: SPIN_HZ,
        lagMs: LAG_MS,
        squash: SQUASH,
      },
    );
    const dives: Dives = planDives(
      swarm,
      waves.map((w) => w.peel),
      WAVE_SPREAD_MS,
      FLIGHT_MS,
      n ? WAVE_SHARE : 0,
    );
    diveRest(dives, n, driveAt, DRIVE_SPREAD_MS);

    // pouring in: each speck off one of the edge points, a trickle then a
    // flood
    const entryX = new Float32Array(ENTRIES);
    const entryY = new Float32Array(ENTRIES);
    for (let k = 0; k < ENTRIES; k++) {
      const a = (k / ENTRIES) * TAU;
      const cx = Math.max(-1, Math.min(1, Math.cos(a) * 1.5));
      const cy = Math.max(-1, Math.min(1, Math.sin(a) * 1.5));
      entryX[k] = mid.x + cx * width * (0.5 + OUTSIDE);
      entryY[k] = mid.y + cy * (height / 2 + width * OUTSIDE);
    }
    const fromX = new Float32Array(COUNT);
    const fromY = new Float32Array(COUNT);
    const enter = new Float32Array(COUNT);
    const bow = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const k = i % ENTRIES;
      fromX[i] = entryX[k] + (hash01(i, 811) * 2 - 1) * JITTER * width;
      fromY[i] = entryY[k] + (hash01(i, 812) * 2 - 1) * JITTER * width;
      enter[i] = firstMs + (pourMs - FLY_IN) * hash01(i, 813) ** 0.6;
      bow[i] = (i % 2 ? 1 : -1) * BOW * (0.4 + 0.6 * hash01(i, 814));
    }
    // member i in the mob at ms (flying in until it's joined)
    const memberAt = (i: number, ms: number, into: Point): Point => {
      swarmAt(swarm, i, ms, into);
      const u = (ms - enter[i]) / FLY_IN;
      if (u >= 1) return into;
      const dx = into.x - fromX[i];
      const dy = into.y - fromY[i];
      const b = bow[i] * Math.sin(Math.PI * u);
      into.x = fromX[i] + dx * u - dy * b;
      into.y = fromY[i] + dy * u + dx * b;
      return into;
    };
    // the lead wisps: the last members, in the mob till the drive
    const leads = Array.from({ length: LEADS }, (_, k) => {
      const i = COUNT - 1 - k;
      const into: Point = { x: 0, y: 0 };
      return {
        from: enter[i],
        at: (ms: number): Point | null => {
          if (ms < enter[i]) return null;
          if (ms < dives.startMs[i]) return memberAt(i, ms, into);
          return diveAt(swarm, dives, i, ms, targets[dives.target[i]], into);
        },
      };
    });

    let soundAt = -Infinity;
    const bang = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playExplosion();
    };
    const peeling = createBeats(
      waves,
      (w) => w.peel,
      () => {
        if (!cover!.isLive()) return;
        shakeScreen(PEEL_SHAKE);
        playSwoosh();
      },
    );
    const landing = createBeats(
      waves,
      (w) => w.lands,
      (w, k, now) => {
        giveHire(w.hire);
        cover!.burst(targets[k], HIRE_BURST);
        if (!cover!.isLive()) return;
        shakeScreen(lerp(HIRE_SHAKE, k / Math.max(1, n - 1)));
        bang(now);
      },
    );
    const moments = createBeats(
      [firstMs, packAt, driveAt, climaxLands],
      (ms) => ms,
      (_, k) => {
        if (k === 3) {
          for (const hire of climaxHires) giveHire(hire);
          cover!.blast(climaxAt);
          if (cover!.isLive()) shakeScreen(CLIMAX_SHAKE);
          return;
        }
        if (!cover!.isLive()) return;
        if (k === 0) playBloop();
        else playSwoosh();
      },
    );

    const p: Point = { x: 0, y: 0 };
    const ball: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: climaxLands + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          moments.tick(ms, now);
          peeling.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now);
          if (ms < firstMs || ms > endMs) return;
          const previous = ctx.globalCompositeOperation;

          // the trembling ball's glow, swelling white hot till the drive
          if (ms >= packAt && ms < driveAt + FLIGHT_MS) {
            const c = clamp01((ms - packAt) / (driveAt - packAt));
            const fade = 1 - clamp01((ms - driveAt) / FLIGHT_MS);
            swarm.center(Math.min(ms, driveAt), ball);
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = c * fade;
            drawGlow(ctx, GOLD, ball.x, ball.y, BALL_GLOW * (0.5 + 0.5 * c));
            drawGlow(ctx, WHITE, ball.x, ball.y, BALL_GLOW * 0.4 * c);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = previous;
          }

          // the mob: every speck flying in or dancing
          ctx.globalCompositeOperation = "lighter";
          beginLightBatch(ctx);
          for (let i = 0; i < COUNT; i++) {
            if (ms < enter[i] || ms >= dives.startMs[i]) continue;
            memberAt(i, ms, p);
            stampGlimmer(
              ctx,
              p.x,
              p.y,
              SPECK * (0.7 + 0.6 * swarm.reach[i]),
              i,
              i % 3 ? COLOR.heavenlyGold : COLOR.white,
            );
          }
          endLightBatch(ctx);
          ctx.globalCompositeOperation = previous;
          drawDives(ctx, swarm, dives, targets, ms, SPECK);
          for (let k = 0; k < LEADS; k++)
            drawWispBetween(
              ctx,
              leads[k].at,
              ms,
              now,
              LEAD,
              0.8,
              leads[k].from,
              climaxLands,
            );

          // each wave landing in a flash, the climax the biggest
          for (let k = 0; k < n; k++)
            drawDetonation(
              ctx,
              targets[k],
              ms - waves[k].lands,
              waves[k].blast,
              now,
            );
          drawDetonation(ctx, climaxAt, ms - climaxLands, CLIMAX_BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
