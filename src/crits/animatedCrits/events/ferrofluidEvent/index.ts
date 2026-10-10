// the "Ferrofluid" event (money; free upgrade levels and cash): it covers its
// crit, whose click freezes the screen while the clicked floor's button
// gushes a pool of cash along the screen's bottom that bristles like
// ferrofluid near a magnet: one after another, ever faster, a spike of cash
// shoots up out of it and stabs into an income bar with a splash, a bang
// and a jolt that lands free levels; then the spikes slump back and the
// whole pool surges up into the total in a huge blast and shake. Pays floor
// income × floor number × REWARD, plus the levels
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOutBack, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";
import { findRewardBars } from "../../eventRewards";
import type { Point } from "../../../../shared/wisp";
import { levelsFor } from "../../../../gameState";

const KEY = "ferrofluid";
const REWARD = 2;
const MAX_BARS = 4;
const POOL_COINS = 750;
const SPIKE_COINS = 220;
const COIN = 0.55;
// the pool's surface sits SURFACE px over the screen's bottom, DEPTH deep,
// rippling RIPPLE px; each spike is BASE px wide at its foot
const SURFACE = 70;
const DEPTH = 90;
const RIPPLE = 8;
const BASE = 70;
// coins splash in on a LOFT px arc; the pool surges up in SURGE_SPREAD ms
const LOFT = 160;
const SURGE_SPREAD = 260;
const LIFT = 80;
const STAB_SHAKE: [number, number] = [0.8, 1.6];

export const forceFerrofluidEvent = registerWispEvent(
  KEY,
  "Ferrofluid",
  () => CONFIG.ferrofluidEvent.chance,
  (floor, context, area) => {
    const {
      pourMs,
      gapsMs,
      stabMs,
      slumpMs,
      flightMs,
      levelShare,
      holdMs,
      mergeMs,
    } = CONFIG.ferrofluidEvent;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const surface = area.bottom - SURFACE;
    const bars = findRewardBars(floor, context)
      .filter((b) => b.center.y < surface - 40)
      .slice(-MAX_BARS);
    if (bars.length === 0) return;
    let clock: number = pourMs;
    const spikes = bars.map((bar, k) => {
      const at = clock;
      clock += lerp(gapsMs, k / Math.max(1, bars.length - 1));
      return {
        bar,
        x:
          bar.box.x +
          bar.box.width * (0.15 + (0.7 * k) / Math.max(1, bars.length - 1)),
        tip: bar.center.y,
        at,
        hits: at + stabMs,
      };
    });
    const slumpAt = spikes[spikes.length - 1].hits + 120;
    const surgeAt = slumpAt + slumpMs;
    const endAt = surgeAt + SURGE_SPREAD + flightMs;
    const width = area.right - area.left;
    // a spike's height share at ms: stabbing up, holding, slumping
    const rise = (s: (typeof spikes)[number], ms: number) => {
      if (ms < s.at) return 0;
      if (ms < s.hits) return easeOutBack((ms - s.at) / stabMs);
      if (ms < slumpAt) return 1;
      return 1 - easeIn(clamp01((ms - slumpAt) / slumpMs));
    };
    const wave = (x: number, ms: number) =>
      Math.sin(x * 0.03 + ms * 0.012) * RIPPLE;

    const pooled = (x: number, depth: number, ms: number, into: Point) => {
      into.x = x;
      into.y = surface + depth + wave(x, ms) * (1 - depth / DEPTH);
      return into;
    };
    const coin = (spike: (typeof spikes)[number] | null) => {
      const lands = Math.random() * pourMs;
      const h = Math.random();
      const side = (Math.random() * 2 - 1) * (1 - h);
      const x = spike
        ? spike.x + side * BASE
        : area.left + Math.random() * width;
      const depth = spike ? 0 : DEPTH * Math.random() ** 2;
      const rest: Point = { x: 0, y: 0 };
      pooled(x, depth, lands, rest);
      const arc: Point = {
        x: (button.x + rest.x) / 2,
        y: Math.min(button.y, rest.y) - LOFT,
      };
      const flies = surgeAt + clamp01((x - area.left) / width) * SURGE_SPREAD;
      const start: Point = { x: 0, y: 0 };
      const lift: Point = { x: 0, y: 0 };
      const at: Point = { x: 0, y: 0 };
      const place = (ms: number, into: Point) => {
        pooled(x, depth, ms, into);
        if (spike) into.y -= (into.y - spike.tip) * h * rise(spike, ms);
        return into;
      };
      return (f: number) => {
        const ms = f * endAt;
        const flight = Math.min(250, lands + 1);
        if (ms < lands) {
          const u = clamp01((ms - lands + flight) / flight);
          if (u <= 0) return { x: button.x, y: button.y, scale: 0 };
          bezier(button, arc, rest, u, at);
          return { x: at.x, y: at.y, scale: COIN };
        }
        if (ms < flies) {
          place(ms, at);
          return { x: at.x, y: at.y, scale: COIN };
        }
        place(flies, start);
        lift.x = start.x;
        lift.y = start.y - LIFT;
        const total = cover?.total() ?? fallback;
        bezier(
          start,
          lift,
          total,
          easeIn(clamp01((ms - flies) / flightMs)),
          at,
        );
        return { x: at.x, y: at.y, scale: COIN };
      };
    };
    const paths: CoinPath[] = [
      ...Array.from({ length: POOL_COINS }, () => coin(null)),
      ...spikes.flatMap((s) =>
        Array.from({ length: SPIKE_COINS }, () => coin(s)),
      ),
    ];

    const stabbing = createBeats(
      spikes,
      (s) => s.hits,
      (s, k) => {
        const t = k / Math.max(1, spikes.length - 1);
        cover!.levels(s.bar, levelsFor(s.bar.floor, levelShare, 2), {
          x: s.x,
          y: surface,
        });
        cover!.burst({ x: s.x, y: s.tip }, 0.5 + 0.4 * t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(STAB_SHAKE, t));
      },
    );
    const surging = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          stabbing.tick(ms, now);
          surging.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);
