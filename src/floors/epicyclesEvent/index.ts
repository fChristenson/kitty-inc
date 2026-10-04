// the "Epicycles" event (experiment: Fourier epicycles; cash): it covers its
// crit, whose click freezes the screen while a chain of glowing arms unfolds
// out of the middle of the screen, each spinning on the tip of the last at
// its own speed like a Fourier series; the wisp on the last tip sweeps out
// what looks like nonsense until the loops close into a big heart drawn in
// coins, with a jolt as it closes; the heart blazes, bursts outward in a
// blast and shake and its coins pour into the total. Pays floor income ×
// floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { CoinPath } from "../coins";
import {
  drawGlitterLight,
  drawWisp,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { bezier } from "../../shared/curves";
import { drawBeam } from "../../shared/beam";
import { drawDetonation } from "../../shared/explosion";
import { totalSpot } from "../cashFlow";

const KEY = "epicycles";
const REWARD = 4;
// samples of the heart, and the arms (strongest terms) that redraw it
const SAMPLES = 128;
const ARMS = 9;
const COINS = 240;
const COIN = 0.4;
// the heart's span as a share of the screen's width and height
const SPAN: [number, number] = [0.62, 0.42];
const GROW_MS = 260;
const BLAZE_MS = 220;
const BURST_MS = 520;
const BURST = 90;
const BLAST = 420;
const ARM_WIDTH: [number, number] = [10, 3];
const TIP = 0.6;
const CLOSE_SHAKE = 0.8;
const BLAZE_SHAKE = 1.6;

interface Term {
  k: number;
  re: number;
  im: number;
}

// the heart curve, y down
function heart(s: number): Point {
  return {
    x: 16 * Math.sin(s) ** 3,
    y: -(
      13 * Math.cos(s) -
      5 * Math.cos(2 * s) -
      2 * Math.cos(3 * s) -
      Math.cos(4 * s)
    ),
  };
}

// its strongest Fourier terms: the centre (k = 0) first, then by size
function fourier(): Term[] {
  const points = Array.from({ length: SAMPLES }, (_, n) =>
    heart((n / SAMPLES) * Math.PI * 2),
  );
  const terms: Term[] = [];
  for (let k = -SAMPLES / 2; k < SAMPLES / 2; k++) {
    let re = 0;
    let im = 0;
    points.forEach((p, n) => {
      const a = (-2 * Math.PI * k * n) / SAMPLES;
      re += p.x * Math.cos(a) - p.y * Math.sin(a);
      im += p.x * Math.sin(a) + p.y * Math.cos(a);
    });
    terms.push({ k, re: re / SAMPLES, im: im / SAMPLES });
  }
  const centre = terms.find((t) => t.k === 0)!;
  const rest = terms
    .filter((t) => t.k !== 0)
    .sort((a, b) => Math.hypot(b.re, b.im) - Math.hypot(a.re, a.im))
    .slice(0, ARMS);
  return [centre, ...rest];
}

export const forceEpicyclesEvent = registerWispEvent(
  KEY,
  "Epicycles",
  () => CONFIG.epicyclesEvent.chance,
  (floor, context, area) => {
    const { drawMs, holdMs, mergeMs } = CONFIG.epicyclesEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const centre: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + height * 0.48,
    };
    const scale = Math.min((width * SPAN[0]) / 32, (height * SPAN[1]) / 30);
    const total = totalSpot(area);
    const terms = fourier();
    const joints: Point[] = terms.map(() => ({ x: 0, y: 0 }));
    // the chain's joints at angle θ, its arms grown by g
    const chain = (theta: number, g: number) => {
      let x = centre.x;
      let y = centre.y;
      terms.forEach((t, j) => {
        const a = t.k * theta;
        const s = j === 0 ? 1 : g;
        x += (t.re * Math.cos(a) - t.im * Math.sin(a)) * scale * s;
        y += (t.re * Math.sin(a) + t.im * Math.cos(a)) * scale * s;
        joints[j].x = x;
        joints[j].y = y;
      });
      return joints[joints.length - 1];
    };
    const closes = GROW_MS + drawMs;
    const blazes = closes + BLAZE_MS;
    const travel = blazes + BURST_MS;
    const thetaAt = (ms: number) =>
      Math.PI * 2 * clamp01((ms - GROW_MS) / drawMs);
    const growAt = (ms: number) => easeOut(clamp01(ms / GROW_MS));
    const tipAt = (ms: number): Point | null =>
      ms < 0 || ms > closes ? null : chain(thetaAt(ms), growAt(ms));

    // a coin dropped wherever the tip passes, the heart drawn in cash
    const paths: CoinPath[] = [];
    for (let i = 0; i < COINS; i++) {
      const drops = GROW_MS + (i / COINS) * drawMs;
      const p = chain((i / COINS) * Math.PI * 2, 1);
      const spot: Point = { x: p.x, y: p.y };
      const a = Math.atan2(spot.y - centre.y, spot.x - centre.x);
      const out: Point = {
        x: spot.x + Math.cos(a) * BURST,
        y: spot.y + Math.sin(a) * BURST,
      };
      const at: Point = { x: 0, y: 0 };
      paths.push((f) => {
        const ms = f * travel;
        if (ms < drops) return { x: spot.x, y: spot.y, scale: 0 };
        if (ms < blazes) {
          const grow = clamp01((ms - drops) / 120);
          const blaze = ms > closes ? 1.4 : 1;
          return { x: spot.x, y: spot.y, scale: COIN * grow * blaze };
        }
        const q = bezier(
          spot,
          out,
          total,
          easeIn(clamp01((ms - blazes) / BURST_MS)),
          at,
        );
        return { x: q.x, y: q.y, scale: COIN };
      });
    }

    const closing = createBeats(
      [closes],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(CLOSE_SHAKE);
      },
    );
    const blazing = createBeats(
      [blazes],
      (ms) => ms,
      () => {
        cover!.burst(centre, 1);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(BLAZE_SHAKE);
      },
    );
    const landing = createBeats(
      [travel],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travel + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          closing.tick(ms, now);
          blazing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > travel) return;
          drawDetonation(ctx, centre, ms - blazes, BLAST, now);
          if (ms > closes) return;
          // the spinning arms, thinning down the chain to the drawing tip
          chain(thetaAt(ms), growAt(ms));
          for (let j = 1; j < joints.length; j++) {
            const u = j / (joints.length - 1);
            drawBeam(ctx, joints[j - 1], joints[j], lerp(ARM_WIDTH, u), 0.55);
            drawGlitterLight(
              ctx,
              joints[j - 1].x,
              joints[j - 1].y,
              9,
              j,
              0.9,
              now,
            );
          }
          drawWisp(ctx, tipAt, ms, now, WISP_SIZE * TIP, 0.8);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
);
