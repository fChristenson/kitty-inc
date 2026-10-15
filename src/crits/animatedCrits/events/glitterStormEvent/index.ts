// the "Glitter Storm" event (swarm; crit tiers): it covers its crit, whose
// click freezes the screen while a storm of hundreds of glitter specks and a
// few lead wisps sweeps in off the side as one mass onto the top bar in view
// and coils round it, spiralling in to a tight whirl that packs, pinches and
// bursts a wave into the bar, a crit tier there on the hit; the mass rushes
// on down the building, coil after coil, each quicker; then the whole storm
// wheels up into one churning ball over the clicked floor, trembling and
// glowing white hot, and drives into it in the biggest flash, bang and the
// hardest shake, several crit tiers there. Then the crit's tier pays out
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
  drawSwarm,
  planDives,
  planSwarm,
  swarmAt,
  type Dives,
} from "../../../../shared/animationStyles/swarm";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { FLOOR_H } from "../../../../floors/constants";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { registerWispEvent, startWispCover } from "../../wispCover";

const KEY = "glitterStorm";
const TAU = Math.PI * 2;
const MAX_COILS = 5;
// the storm: COUNT specks SPECK px, LEADS of them lead wisps (the last ones,
// so they stay for the climax), wheeling SPIN_HZ laps a second, trailing up
// to LAG_MS, SQUASH as tall as wide (to wrap the wide bars)
const COUNT = 360;
const SPECK = 20;
const LEADS = 4;
const LEAD = WISP_SIZE * 1.1;
const SPIN_HZ: [number, number] = [0.8, 4.2];
const LAG_MS = 140;
const SQUASH = 0.45;
// sweeping in from ENTRY_OUT of the width off the left, ENTRY_UP of the
// height above the first bar, SWEEP_SPREAD of the width across, bowed
const ENTRY_OUT = 0.35;
const ENTRY_UP = 0.25;
const SWEEP_SPREAD = 0.3;
const SWEEP_BOW = 0.18;
// a coil: its middle spirals COIL_LAPS laps in from COIL_ORBIT of the bar's
// width, the mass tightening from COIL_WIDE to COIL_TIGHT of it, pinching
// PINCH for about PINCH_MS as its wave bursts in
const COIL_ORBIT = 0.22;
const COIL_LAPS = 1.25;
const COIL_SQUASH = 0.4;
const COIL_WIDE = 0.62;
const COIL_TIGHT = 0.26;
const PINCH = 0.4;
const PINCH_MS = 60;
const COIL_GLOW = 200;
// each wave: WAVE_SHARE of the storm in all, peeling off over WAVE_SPREAD_MS,
// each speck diving FLIGHT_MS, landing in a BLAST px blast
const WAVE_SHARE = 0.55;
const WAVE_SPREAD_MS = 70;
const FLIGHT_MS = 130;
const BLAST: [number, number] = [130, 210];
const HIT_BURST = 0.6;
const HIT_SHAKE: [number, number] = [0.8, 1.6];
const LAUNCH_SHAKE = 0.35;
const SOUND_GAP_MS = 55;
// the climax: wheeling up (bowed RISE_BOW) to a ball BALL_UP px over the
// clicked bar (at least BALL_MARGIN under the top), BALL_SPREAD of the width
// across, packing to PACK px, trembling up to TREMBLE px, holding HOLD_MS,
// then driving in over DRIVE_SPREAD_MS
const RISE_BOW = 0.35;
const BALL_UP = 1.1 * FLOOR_H;
const BALL_MARGIN = 120;
const BALL_SPREAD = 0.16;
const PACK = 44;
const TREMBLE = 16;
const BALL_GLOW = 280;
const HOLD_MS = 70;
const DRIVE_SPREAD_MS = 40;
const CLIMAX_BLAST = 380;
const CLIMAX_SHAKE = 3.4;
const CLICKED_SHAKE = 1.4;
// the storm's path and spread, sampled every STEP_MS at arm
const STEP_MS = 4;

const GOLD = fadeStops(COLOR.heavenlyGold);
const WHITE = fadeStops(COLOR.white, 0.2);

export const forceGlitterStormEvent = registerWispEvent(
  KEY,
  "Glitter Storm",
  () => meta.chance,
  (floor, context, area) => {
    const {
      firstMs,
      sweepMs,
      coilMs,
      moveMs,
      riseMs,
      packMs,
      clickedTiers,
      clickedGapMs,
      holdMs,
      mergeMs,
    } = meta.values;
    const bars = findRewardBars(floor, context);
    if (bars.length === 0) return;
    // the clicked floor's bar, or the one nearest it when it has none
    let clicked: RewardBar = bars[0];
    for (const bar of bars) {
      if (bar.floor === floor) {
        clicked = bar;
        break;
      }
      if (
        Math.abs(bar.center.y - FLOOR_H / 2) <
        Math.abs(clicked.center.y - FLOOR_H / 2)
      )
        clicked = bar;
    }
    const impact = clicked.center;
    const width = area.right - area.left;
    const height = area.bottom - area.top;

    // the coils: the bars nearest the clicked one, top down
    const coils = bars
      .filter((bar) => bar !== clicked)
      .sort(
        (a, b) =>
          Math.abs(a.center.y - impact.y) - Math.abs(b.center.y - impact.y),
      )
      .slice(0, MAX_COILS)
      .sort((a, b) => a.box.y - b.box.y);
    const n = coils.length;

    // the beats: each coil arrives, packs and launches its wave, quicker
    const coilStart = firstMs + sweepMs;
    const arrive: number[] = [];
    const launch: number[] = [];
    const hit: number[] = [];
    let at = coilStart;
    for (let k = 0; k < n; k++) {
      arrive.push(at);
      at += lerp(coilMs, k / Math.max(1, n - 1));
      launch.push(at);
      hit.push(at + WAVE_SPREAD_MS * 0.7 + FLIGHT_MS);
      at += moveMs;
    }
    const lastLaunch = n ? launch[n - 1] : coilStart;
    const packAt = lastLaunch + riseMs;
    const packEnd = packAt + packMs;
    const driveAt = packEnd + HOLD_MS;
    const climaxLands = driveAt + DRIVE_SPREAD_MS + FLIGHT_MS;
    const tierTimes = Array.from(
      { length: clickedTiers },
      (_, k) => climaxLands + k * clickedGapMs,
    );
    const endMs = tierTimes[clickedTiers - 1];
    const drawEnd = climaxLands + DETONATION_MS;
    const targets: Point[] = [...coils.map((bar) => bar.center), impact];

    const ball: Point = {
      x: impact.x,
      y: Math.max(area.top + BALL_MARGIN, impact.y - BALL_UP),
    };
    const entry: Point = {
      x: area.left - width * ENTRY_OUT,
      y: (n ? coils[0].center.y : ball.y) - height * ENTRY_UP,
    };
    const ballSpread = width * BALL_SPREAD;
    const wide = (k: number) => coils[k].box.width * COIL_WIDE;
    const tight = (k: number) => coils[k].box.width * COIL_TIGHT;

    // the storm's middle and spread, sampled at arm
    const c: Point = { x: 0, y: 0 };
    const a: Point = { x: 0, y: 0 };
    const coilPoint = (k: number, u: number, into: Point) => {
      const bar = coils[k];
      const r = bar.box.width * COIL_ORBIT * (1 - u);
      const turn = Math.PI + TAU * COIL_LAPS * u;
      into.x = bar.center.x + Math.cos(turn) * r;
      into.y = bar.center.y + Math.sin(turn) * r * COIL_SQUASH;
    };
    const glide = (from: Point, to: Point, u: number, bow: number) => {
      const e = smoothstep(u);
      const b = bow * Math.sin(Math.PI * u);
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      c.x = from.x + dx * e - dy * b;
      c.y = from.y + dy * e + dx * b;
      return e;
    };
    const steps = Math.ceil((climaxLands + 200) / STEP_MS) + 2;
    const pathX = new Float32Array(steps);
    const pathY = new Float32Array(steps);
    const spreads = new Float32Array(steps);
    for (let s = 0; s < steps; s++) {
      const ms = s * STEP_MS;
      let r: number;
      if (ms < coilStart) {
        if (n) coilPoint(0, 0, a);
        else {
          a.x = ball.x;
          a.y = ball.y;
        }
        const e = glide(entry, a, clamp01((ms - firstMs) / sweepMs), SWEEP_BOW);
        const to = n ? wide(0) : ballSpread;
        r = width * SWEEP_SPREAD + (to - width * SWEEP_SPREAD) * e;
      } else if (ms < lastLaunch) {
        let k = 0;
        while (k < n - 1 && ms >= arrive[k + 1]) k++;
        if (ms < launch[k]) {
          const u = (ms - arrive[k]) / (launch[k] - arrive[k]);
          coilPoint(k, u, c);
          r = wide(k) + (tight(k) - wide(k)) * smoothstep(u);
        } else {
          coilPoint(k + 1, 0, a);
          const e = glide(coils[k].center, a, (ms - launch[k]) / moveMs, 0);
          r = tight(k) + (wide(k + 1) - tight(k)) * e;
        }
      } else if (ms < packAt) {
        const from = n ? coils[n - 1].center : ball;
        const e = glide(from, ball, (ms - lastLaunch) / riseMs, RISE_BOW);
        const r0 = n ? tight(n - 1) : ballSpread;
        r = r0 + (ballSpread - r0) * e;
      } else {
        const e = smoothstep(clamp01((ms - packAt) / packMs));
        const shiver = TREMBLE * clamp01((ms - packAt) / (driveAt - packAt));
        c.x = ball.x + Math.sin(ms * 0.09) * shiver;
        c.y = ball.y + Math.cos(ms * 0.11) * shiver;
        r = ballSpread + (PACK - ballSpread) * e;
      }
      let pulse = 0;
      for (let k = 0; k < n; k++) {
        const d = (ms - launch[k]) / PINCH_MS;
        pulse = Math.max(pulse, Math.exp(-d * d));
      }
      pathX[s] = c.x;
      pathY[s] = c.y;
      spreads[s] = r * (1 - PINCH * pulse);
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
      launch,
      WAVE_SPREAD_MS,
      FLIGHT_MS,
      n ? WAVE_SHARE : 0,
    );
    diveRest(dives, n, driveAt, DRIVE_SPREAD_MS);
    // the lead wisps: the last members, in the storm till the drive
    const leads = Array.from({ length: LEADS }, (_, k) => {
      const i = COUNT - 1 - k;
      const into: Point = { x: 0, y: 0 };
      return (ms: number): Point | null =>
        ms < dives.startMs[i]
          ? swarmAt(swarm, i, ms, into)
          : diveAt(swarm, dives, i, ms, targets[dives.target[i]], into);
    });
    const blasts = new Float32Array(n);
    for (let k = 0; k < n; k++) blasts[k] = lerp(BLAST, k / Math.max(1, n - 1));

    let soundAt = -Infinity;
    const order = coils.map((_, k) => k);
    const launching = createBeats(
      order,
      (k) => launch[k],
      () => {
        if (!cover!.isLive()) return;
        shakeScreen(LAUNCH_SHAKE);
        playSwoosh();
      },
    );
    const hitting = createBeats(
      order,
      (k) => hit[k],
      (k, _, now) => {
        cover!.tierUp(coils[k]);
        cover!.burst(coils[k].center, HIT_BURST);
        if (!cover!.isLive()) return;
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, n - 1)));
        if (now - soundAt < SOUND_GAP_MS) return;
        soundAt = now;
        playExplosion();
      },
    );
    const moments = createBeats(
      [firstMs, packAt, driveAt],
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        if (k === 0) playBloop();
        else playSwoosh();
      },
    );
    const landing = createBeats(
      tierTimes,
      (ms) => ms,
      (_, k) => {
        cover!.tierUp(clicked);
        if (k === 0) {
          cover!.blast(impact);
          cover!.slam(clicked);
          if (cover!.isLive()) shakeScreen(CLIMAX_SHAKE);
          return;
        }
        cover!.burst(impact, 0.9);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(CLICKED_SHAKE);
      },
    );

    const center: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          moments.tick(ms, now);
          launching.tick(ms, now);
          hitting.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < firstMs || ms > drawEnd) return;
          const previous = ctx.globalCompositeOperation;
          ctx.globalCompositeOperation = "lighter";
          // each coiled bar glowing hotter as its whirl packs
          for (let k = 0; k < n; k++) {
            if (ms < arrive[k] || ms >= hit[k]) continue;
            const g = (ms - arrive[k]) / (hit[k] - arrive[k]);
            ctx.globalAlpha = g;
            const to = targets[k];
            drawGlow(ctx, GOLD, to.x, to.y, COIL_GLOW * (0.4 + 0.6 * g));
          }
          // the churning ball's glow, swelling white hot till the drive
          if (ms >= packAt && ms < driveAt + FLIGHT_MS) {
            const g = clamp01((ms - packAt) / (driveAt - packAt));
            const fade = 1 - clamp01((ms - driveAt) / FLIGHT_MS);
            swarm.center(Math.min(ms, driveAt), center);
            ctx.globalAlpha = g * fade;
            drawGlow(
              ctx,
              GOLD,
              center.x,
              center.y,
              BALL_GLOW * (0.5 + 0.5 * g),
            );
            drawGlow(ctx, WHITE, center.x, center.y, BALL_GLOW * 0.4 * g);
          }
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = previous;

          drawSwarm(ctx, swarm, ms, SPECK, dives);
          drawDives(ctx, swarm, dives, targets, ms, SPECK);
          for (let k = 0; k < LEADS; k++)
            drawWispBetween(
              ctx,
              leads[k],
              ms,
              now,
              LEAD,
              0.8,
              firstMs,
              climaxLands,
            );

          // each wave bursting into its bar, the climax the biggest
          for (let k = 0; k < n; k++)
            drawDetonation(ctx, targets[k], ms - hit[k], blasts[k], now);
          drawDetonation(ctx, impact, ms - climaxLands, CLIMAX_BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
