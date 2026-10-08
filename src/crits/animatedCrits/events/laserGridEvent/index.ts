// the "Laser Grid" event (beam): it covers its crit, whose click freezes the
// screen while lasers snap across it one after another, across then down,
// each flickering as a thin aim line before it blazes from edge to edge,
// cash popping out all along it as it fires and every crossing a flash, a
// bloop and a jolt; once the grid is built every beam collapses at once and
// all the cash pours into the total-income readout in a huge blast and
// shake. Pays floor income × floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { drawAimLaser, drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { totalSpot } from "../../cashFlow";
import type { Point } from "../../../../shared/wisp";

const KEY = "laserGrid";
const REWARD = 4;
// the lasers in firing order: across at a share of the screen's height, or
// down at a share of its width
const LASERS: { across: boolean; at: number }[] = [
  { across: true, at: 0.36 },
  { across: false, at: 0.3 },
  { across: true, at: 0.62 },
  { across: false, at: 0.7 },
  { across: true, at: 0.84 },
  { across: false, at: 0.5 },
];
// each beam BEAM px across, blazing BLAZE times that as it fires
const BEAM = 18;
const BLAZE = 2;
const COLLAPSE_MS = 160;
// COINS_EACH pop out along each, up to SPREAD px off it
const COINS_EACH = 150;
const SPREAD = 14;
const COIN = 0.8;
const POP_MS = 80;
const FIRE_SHAKE = 1;
const CROSS_BURST = 0.6;
const CROSS_SHAKE = 1.4;

export const forceLaserGridEvent = registerWispEvent(
  KEY,
  "Laser Grid",
  () => CONFIG.laserGridEvent.chance,
  (floor, context, area) => {
    const { gapMs, aimMs, zipMs, flightMs, holdMs, mergeMs } =
      CONFIG.laserGridEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const fallback = totalSpot(area);
    const lasers = LASERS.map((l, k) => {
      const aimAt = k * gapMs;
      const fireAt = aimAt + aimMs;
      // alternately fired from either end
      const flip = k % 4 >= 2;
      const ends: [Point, Point] = l.across
        ? [
            { x: area.left, y: area.top + height * l.at },
            { x: area.right, y: area.top + height * l.at },
          ]
        : [
            { x: area.left + width * l.at, y: area.bottom },
            { x: area.left + width * l.at, y: area.top + height * 0.2 },
          ];
      const [from, to] = flip ? [ends[1], ends[0]] : ends;
      return { ...l, aimAt, fireAt, from, to };
    });
    const builtAt = lasers[lasers.length - 1].fireAt + zipMs;
    const collapseAt = builtAt + gapMs;
    const travelMs = collapseAt + COLLAPSE_MS + flightMs;
    const tip = (
      l: (typeof lasers)[number],
      ms: number,
      into: Point,
    ): Point => {
      const u = clamp01((ms - l.fireAt) / zipMs);
      into.x = l.from.x + (l.to.x - l.from.x) * u;
      into.y = l.from.y + (l.to.y - l.from.y) * u;
      return into;
    };
    // where each down laser crosses each across one, and when the later of
    // the two reaches it
    const crossings: { at: Point; ms: number }[] = [];
    for (const a of lasers.filter((l) => l.across))
      for (const d of lasers.filter((l) => !l.across)) {
        const at = { x: d.from.x, y: a.from.y };
        if (at.y < Math.min(d.from.y, d.to.y)) continue;
        const reach = (l: typeof a) =>
          l.fireAt +
          zipMs *
            (Math.hypot(at.x - l.from.x, at.y - l.from.y) /
              Math.hypot(l.to.x - l.from.x, l.to.y - l.from.y));
        crossings.push({ at, ms: Math.max(reach(a), reach(d)) });
      }

    const paths: CoinPath[] = lasers.flatMap((l) =>
      Array.from({ length: COINS_EACH }, () => {
        const s = Math.random();
        const shownAt = l.fireAt + s * zipMs;
        const off = (Math.random() - 0.5) * SPREAD * 2;
        const spot = {
          x: l.from.x + (l.to.x - l.from.x) * s + (l.across ? 0 : off),
          y: l.from.y + (l.to.y - l.from.y) * s + (l.across ? off : 0),
        };
        const leave = collapseAt + Math.random() * COLLAPSE_MS;
        return (f) => {
          const ms = f * travelMs;
          if (ms < shownAt) return { x: spot.x, y: spot.y, scale: 0 };
          if (ms < leave)
            return {
              x: spot.x,
              y: spot.y,
              scale: COIN * Math.min(1, (ms - shownAt) / POP_MS),
            };
          const total = cover?.total() ?? fallback;
          const p = bezier(
            spot,
            { x: spot.x, y: total.y },
            total,
            easeIn(clamp01((ms - leave) / flightMs)),
            {
              x: 0,
              y: 0,
            },
          );
          return { x: p.x, y: p.y, scale: COIN };
        };
      }),
    );

    const fires = createBeats(
      lasers,
      (l) => l.fireAt,
      () => {
        if (!cover?.isLive()) return;
        playSwoosh();
        shakeScreen(FIRE_SHAKE);
      },
    );
    const crossing = createBeats(
      crossings,
      (c) => c.ms,
      (c) => {
        cover!.burst(c.at, CROSS_BURST);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(CROSS_SHAKE);
      },
    );
    const finale = createBeats(
      [travelMs],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );
    const head = { x: 0, y: 0 };

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travelMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          fires.tick(ms, now);
          crossing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms) => {
          if (ms >= collapseAt + COLLAPSE_MS) return;
          const fade = 1 - clamp01((ms - collapseAt) / COLLAPSE_MS);
          for (const l of lasers) {
            if (ms < l.aimAt) continue;
            if (ms < l.fireAt) {
              drawAimLaser(ctx, l.from, l.to);
              continue;
            }
            const blaze = lerp(
              [BLAZE, 1],
              clamp01((ms - l.fireAt) / (zipMs * 2)),
            );
            tip(l, ms, head);
            drawBeam(ctx, l.from, head, BEAM * blaze * fade);
            drawBeamFlare(
              ctx,
              head,
              BEAM * (ms < l.fireAt + zipMs ? 1.5 : 0.8),
              fade,
            );
          }
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travelMs);
    playBoostEventStream();
  },
);
