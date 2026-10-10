// the "Apollonian Gasket" event (experiment: an Apollonian gasket, circles
// packed into the gaps between circles; levels): it covers its crit, whose
// click freezes the screen while a giant ring of light pops up with three
// circles kissing inside it; then circles pop into every gap between them,
// each nestled against the three around it, smaller and smaller and faster
// and faster, every burst a click and a jolt, till hundreds pack the ring;
// the gasket blazes, collapses into a wisp, and that bursts into wisps that
// arc onto the bars for free levels, the clicked floor's bar last with a
// slam. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import {
  clamp01,
  easeIn,
  easeOut,
  easeOutBack,
  lerp,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { stampGlimmer } from "../../../../shared/twinkle";
import { findRewardBars } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "apollonianGasket";
// the ring's radius as a share of the screen's width (at most MAX_R px)
const WIDTH = 0.42;
const MAX_R = 480;
// circles smaller than this share of the ring are left out, and at most MAX
const MIN_R = 0.03;
const MAX = 260;
// circles bake into a cache this much smaller than the screen
const CACHE = 0.5;
const PAD = 20;
const POP_MS = 140;
// when the ring and its first three circles pop in, and the gap after
const FIRST = [0, 140, 230, 320];
const REST_GAP_MS = 110;
const CLICK_EVERY = 10;
const BOW = 200;
const SIDE = 160;
const WISP = WISP_SIZE * 1.2;
const BAR_WISP = WISP_SIZE * 0.8;
const CLICK_SHAKE: [number, number] = [0.15, 0.5];
const BLAZE_SHAKE = 0.9;
const LAND_SHAKE = 0.5;
const SOUND_GAP_MS = 60;

interface Circle {
  // curvature (negative for the ring round the outside), centre and radius
  k: number;
  x: number;
  y: number;
  r: number;
}

// the gasket in a ring of radius R round c: the ring, three circles kissing
// inside it, then every gap filled, biggest first
function gasket(c: Point, R: number): Circle[] {
  const outer: Circle = { k: -1 / R, x: c.x, y: c.y, r: R };
  const r = R / (1 + 2 / Math.sqrt(3));
  const [a, b, d] = [0, 1, 2].map((j) => {
    const angle = -Math.PI / 2 + (j * Math.PI * 2) / 3;
    return {
      k: 1 / r,
      x: c.x + Math.cos(angle) * (R - r),
      y: c.y + Math.sin(angle) * (R - r),
      r,
    };
  });
  const found: Circle[] = [];
  // each gap: the three circles round it, and the one on their far side
  const gaps: [Circle, Circle, Circle, Circle][] = [
    [a, b, d, outer],
    [outer, a, b, d],
    [outer, b, d, a],
    [outer, a, d, b],
  ];
  for (let g = 0; g < gaps.length && found.length < MAX * 4; g++) {
    const [p, q, s, o] = gaps[g];
    // Descartes' theorem: curvatures, and centres as complex numbers
    const k = 2 * (p.k + q.k + s.k) - o.k;
    const n: Circle = {
      k,
      x: (2 * (p.k * p.x + q.k * q.x + s.k * s.x) - o.k * o.x) / k,
      y: (2 * (p.k * p.y + q.k * q.y + s.k * s.y) - o.k * o.y) / k,
      r: 1 / k,
    };
    if (n.r < R * MIN_R) continue;
    found.push(n);
    gaps.push([p, q, n, s], [p, s, n, q], [q, s, n, p]);
  }
  found.sort((m, n) => n.r - m.r);
  return [outer, a, b, d, ...found.slice(0, MAX - 4)];
}

// a ring of light: a soft gold halo with a bright core line
function strokeRing(
  ctx: CanvasRenderingContext2D,
  c: Circle,
  r: number,
  i: number,
): void {
  if (r <= 0) return;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.strokeStyle = COLOR.heavenlyGold;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = Math.min(14, Math.max(3, c.r * 0.08));
  ctx.stroke();
  ctx.strokeStyle = i % 3 === 0 ? COLOR.heavenlyGold : COLOR.white;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = Math.min(5, Math.max(1.5, c.r * 0.025));
  ctx.stroke();
  ctx.globalAlpha = 1;
  if (c.r > 12 && i > 0)
    stampGlimmer(
      ctx,
      c.x,
      c.y,
      Math.min(26, r * 0.4),
      i * 0.7,
      i % 2 === 0 ? COLOR.white : COLOR.heavenlyGold,
    );
}

export const forceApollonianGasketEvent = registerWispEvent(
  KEY,
  "Apollonian Gasket",
  () => CONFIG.apollonianGasketEvent.chance,
  (floor, context, area) => {
    const {
      growMs,
      blazeMs,
      collapseMs,
      flyMs,
      gapMs,
      levelShare,
      holdMs,
      mergeMs,
    } = CONFIG.apollonianGasketEvent;
    const bars = findRewardBars(floor, context);
    const clicked = bars.find((b) => b.floor === floor);
    if (!clicked) return;
    const order = [...bars.filter((b) => b !== clicked), clicked];
    const R = Math.min(MAX_R, (area.right - area.left) * WIDTH);
    const centre: Point = {
      x: (area.left + area.right) / 2,
      y: Math.max(area.top + R + 60, lerp([area.top, area.bottom], 0.4)),
    };
    const circles = gasket(centre, R);
    const n = circles.length;
    // the ring and its first three on their own beats, then the rest biggest
    // first, ever quicker
    const rest = FIRST[FIRST.length - 1] + REST_GAP_MS;
    const appears = circles.map((_, i) =>
      i < FIRST.length
        ? FIRST[i]
        : rest +
          (growMs - rest) *
            Math.sqrt((i - FIRST.length) / Math.max(1, n - FIRST.length)),
    );
    const grown = appears[n - 1] + POP_MS;
    const blazeEnds = grown + blazeMs;
    const collapsed = blazeEnds + collapseMs;
    const flights = order.map((bar, k) => {
      const leaves = collapsed + k * gapMs;
      const side = bar.center.x < centre.x ? -1 : 1;
      return {
        bar,
        leaves,
        lands: leaves + flyMs,
        bow: {
          x: (centre.x + bar.center.x) / 2 + side * SIDE,
          y: Math.min(centre.y, bar.center.y) - BOW,
        },
        spot: { x: 0, y: 0 } as Point,
        levels: levelsFor(bar.floor, levelShare, 1) * (bar === clicked ? 2 : 1),
      };
    });
    const endMs = flights[flights.length - 1].lands;

    // the cache the circles bake into once they've popped in
    const origin: Point = { x: centre.x - R - PAD, y: centre.y - R - PAD };
    const span = 2 * (R + PAD);
    const cache = document.createElement("canvas");
    cache.width = Math.ceil(span * CACHE);
    cache.height = cache.width;
    const baking = cache.getContext("2d")!;
    baking.scale(CACHE, CACHE);
    baking.translate(-origin.x, -origin.y);
    baking.globalCompositeOperation = "lighter";
    baking.lineCap = "round";
    let baked = 0;

    let soundAt = -Infinity;
    const sound = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playBloop();
    };
    const clicks = appears.filter(
      (_, i) => i < FIRST.length || i % CLICK_EVERY === CLICK_EVERY - 1,
    );
    const popping = createBeats(
      clicks,
      (ms) => ms,
      (_, k, now) => {
        if (!cover!.isLive()) return;
        shakeScreen(lerp(CLICK_SHAKE, k / Math.max(1, clicks.length - 1)));
        sound(now);
      },
    );
    const blazing = createBeats(
      [grown, grown + blazeMs * 0.5, blazeEnds],
      (ms) => ms,
      (ms) => {
        if (ms === blazeEnds) {
          cover!.burst(centre, 1);
          if (cover!.isLive()) playSwoosh();
          return;
        }
        cover!.burst(centre, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(BLAZE_SHAKE);
      },
    );
    const landing = createBeats(
      flights,
      (f) => f.lands,
      (f, _, now) => {
        cover!.levels(f.bar, f.levels, centre);
        if (f.bar === clicked) {
          cover!.slam(f.bar);
          cover!.blast(f.bar.center);
          return;
        }
        cover!.burst(f.bar.center, 0.6);
        if (!cover!.isLive()) return;
        shakeScreen(LAND_SHAKE);
        sound(now);
      },
    );

    const coreAt = (ms: number): Point | null =>
      ms < blazeEnds || ms > flights[flights.length - 1].leaves ? null : centre;
    const flightAt = flights.map(
      (f) =>
        (ms: number): Point | null =>
          ms < f.leaves || ms > f.lands
            ? null
            : bezier(
                centre,
                f.bow,
                f.bar.center,
                easeIn((ms - f.leaves) / flyMs),
                f.spot,
              ),
    );
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          popping.tick(ms, now);
          blazing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          if (ms < collapsed) {
            while (baked < n && appears[baked] + POP_MS <= ms) {
              strokeRing(baking, circles[baked], circles[baked].r, baked);
              baked++;
            }
            const shrink = 1 - easeIn(clamp01((ms - blazeEnds) / collapseMs));
            const blaze = clamp01((ms - grown) / blazeMs);
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.translate(centre.x, centre.y);
            ctx.scale(shrink, shrink);
            ctx.translate(-centre.x, -centre.y);
            ctx.drawImage(cache, origin.x, origin.y, span, span);
            if (blaze > 0) {
              ctx.globalAlpha = Math.sin(Math.PI * blaze) * 0.8 + 0.2;
              ctx.drawImage(cache, origin.x, origin.y, span, span);
              ctx.globalAlpha = 1;
            }
            ctx.lineCap = "round";
            for (let i = baked; i < n && appears[i] <= ms; i++)
              strokeRing(
                ctx,
                circles[i],
                circles[i].r * easeOutBack(clamp01((ms - appears[i]) / POP_MS)),
                i,
              );
            ctx.restore();
          }
          const swell = easeOut(clamp01((ms - blazeEnds) / collapseMs));
          drawWisp(ctx, coreAt, ms, now, WISP * (0.4 + 0.8 * swell), 1);
          for (const at of flightAt) drawWisp(ctx, at, ms, now, BAR_WISP, 1);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    findRewardBars(floor, context).some((b) => b.floor === floor),
);
