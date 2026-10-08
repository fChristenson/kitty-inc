// the "Travelling Salesman" event (experiment: the travelling salesman
// problem solved by 2-opt; a crit tier): it covers its crit, whose click
// freezes the screen while a dozen city glimmers pop up all over it, strung
// together in a random order by a tangled loop of light; it untangles
// itself one swap at a time, ever faster: two crossing roads flare, snap
// apart and reconnect uncrossed, each a flash and a jolt, until no road
// crosses another; a wisp races once round the finished tour, then the whole
// loop cinches in onto the clicked floor's bar, which jumps a crit tier.
// Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import { stampGlimmer } from "../../../../shared/twinkle";
import { findRewardBars } from "../../eventRewards";

const KEY = "travellingSalesman";
const CITIES = 14;
const MAX_SWAPS = 22;
// cities at least MIN_GAP px apart, MARGIN in from the screen's edges,
// from TOP to BOTTOM of the screen
const MIN_GAP = 110;
const MARGIN = 70;
const TOP = 0.1;
const BOTTOM = 0.85;
const CITY = 30;
const ROAD_W = 5;
const SWAP_W = 12;
const FLARE_MS = 220;
const RUNNER = WISP_SIZE;
const SWAP_SHAKE: [number, number] = [0.3, 0.7];
const CINCH_SHAKE = 0.5;

interface Swap {
  ms: number;
  // the tour once it's made, and the two new roads' first cities
  tour: number[];
  a: number;
  b: number;
}

export const forceTravellingSalesmanEvent = registerWispEvent(
  KEY,
  "Travelling Salesman",
  () => CONFIG.travellingSalesmanEvent.chance,
  (floor, context, area) => {
    const { growMs, solveMs, lapMs, cinchMs, holdMs, mergeMs } =
      CONFIG.travellingSalesmanEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;

    const cities: Point[] = [];
    const top = lerp([area.top, area.bottom], TOP);
    const bottom = lerp([area.top, area.bottom], BOTTOM);
    for (let tries = 0; cities.length < CITIES && tries < 2000; tries++) {
      const p = {
        x: lerp([area.left + MARGIN, area.right - MARGIN], Math.random()),
        y: lerp([top, bottom], Math.random()),
      };
      if (cities.every((c) => Math.hypot(c.x - p.x, c.y - p.y) >= MIN_GAP))
        cities.push(p);
    }
    const n = cities.length;
    if (n < 4) return;
    const d = (i: number, j: number) =>
      Math.hypot(cities[i].x - cities[j].x, cities[i].y - cities[j].y);

    // the best 2-opt swap each step, till none shortens the tour
    let tour = Array.from({ length: n }, (_, i) => i).sort(
      () => Math.random() - 0.5,
    );
    const start = tour;
    const found: Omit<Swap, "ms">[] = [];
    while (found.length < MAX_SWAPS) {
      let best = 1e-6;
      let bi = -1;
      let bj = -1;
      for (let i = 0; i < n - 1; i++)
        for (let j = i + 2; j < n; j++) {
          if (i === 0 && j === n - 1) continue;
          const a = tour[i];
          const b = tour[i + 1];
          const c = tour[j];
          const e = tour[(j + 1) % n];
          const gain = d(a, b) + d(c, e) - d(a, c) - d(b, e);
          if (gain > best) {
            best = gain;
            bi = i;
            bj = j;
          }
        }
      if (bi < 0) break;
      tour = [
        ...tour.slice(0, bi + 1),
        ...tour.slice(bi + 1, bj + 1).reverse(),
        ...tour.slice(bj + 1),
      ];
      found.push({ tour, a: bi, b: bj });
    }
    const swaps: Swap[] = found.map((s, k) => {
      const u = (k + 1) / found.length;
      return { ...s, ms: growMs + solveMs * (1 - (1 - u) ** 1.6) };
    });
    const solvedAt = growMs + solveMs;
    const lapAt = solvedAt + 120;
    const cinchAt = lapAt + lapMs;
    const endMs = cinchAt + cinchMs;
    const final = tour;

    // the runner's lap: the final tour's corners by distance along it
    const legs = final.map((c, k) => d(c, final[(k + 1) % n]));
    const length = legs.reduce((a, b) => a + b, 0);
    const runner: Point = { x: 0, y: 0 };
    const runnerAt = (ms: number): Point | null => {
      if (ms < lapAt || ms >= cinchAt) return null;
      let s = ((ms - lapAt) / lapMs) * length;
      for (let k = 0; k < n; k++) {
        if (s > legs[k] && k < n - 1) {
          s -= legs[k];
          continue;
        }
        const from = cities[final[k]];
        const to = cities[final[(k + 1) % n]];
        const u = clamp01(s / legs[k]);
        runner.x = lerp([from.x, to.x], u);
        runner.y = lerp([from.y, to.y], u);
        return runner;
      }
      return null;
    };

    const opening = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const swapping = createBeats(
      swaps,
      (s) => s.ms,
      (s, k) => {
        const c = cities[s.tour[s.a + 1]];
        cover!.burst(c, 0.35);
        if (!cover!.isLive()) return;
        shakeScreen(lerp(SWAP_SHAKE, k / Math.max(1, swaps.length - 1)));
        playBloop();
      },
    );
    const finishing = createBeats(
      [lapAt, cinchAt, endMs],
      (ms) => ms,
      (ms) => {
        if (ms === endMs) {
          cover!.tierUp(bar, bar.center);
          cover!.slam(bar);
          cover!.blast(bar.center);
          return;
        }
        if (!cover!.isLive()) return;
        playSwoosh();
        if (ms === cinchAt) shakeScreen(CINCH_SHAKE);
      },
    );

    // every city's spot this frame, cinching in onto the bar at the end
    const spots: Point[] = cities.map((c) => ({ x: c.x, y: c.y }));
    const cinch: Point[] = cities.map((_, i) => ({
      x: bar.box.x + (bar.box.width * (i + 0.5)) / n,
      y: bar.center.y,
    }));
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [bar],
        tick: (ms, now) => {
          opening.tick(ms, now);
          swapping.tick(ms, now);
          finishing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          const pull = easeIn(clamp01((ms - cinchAt) / cinchMs));
          for (let i = 0; i < n; i++) {
            spots[i].x = lerp([cities[i].x, cinch[i].x], pull);
            spots[i].y = lerp([cities[i].y, cinch[i].y], pull);
          }
          let current = start;
          let latest: Swap | null = null;
          for (const s of swaps) {
            if (s.ms > ms) break;
            current = s.tour;
            latest = s;
          }
          const grow = clamp01(ms / growMs);
          const shown = Math.ceil(n * grow);
          for (let k = 0; k < shown; k++)
            drawBeam(
              ctx,
              spots[current[k]],
              spots[current[(k + 1) % n]],
              ROAD_W,
              0.55,
            );
          if (latest && ms - latest.ms < FLARE_MS) {
            const flare = 1 - (ms - latest.ms) / FLARE_MS;
            const t = latest.tour;
            drawBeam(
              ctx,
              spots[t[latest.a]],
              spots[t[latest.a + 1]],
              SWAP_W,
              flare,
            );
            drawBeam(
              ctx,
              spots[t[latest.b]],
              spots[t[(latest.b + 1) % n]],
              SWAP_W,
              flare,
            );
          }
          const blaze = ms >= lapAt ? 1.4 : 1;
          const pop = easeOutBack(grow);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (let i = 0; i < n; i++)
            stampGlimmer(
              ctx,
              spots[i].x,
              spots[i].y,
              CITY * pop * blaze,
              now / 500 + i,
              i % 3 === 0 ? COLOR.white : COLOR.heavenlyGold,
            );
          ctx.restore();
          drawWisp(ctx, runnerAt, ms, now, RUNNER, 1);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
