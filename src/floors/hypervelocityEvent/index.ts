// the "Hypervelocity" event (galaxy; levels): it covers its crit, whose click
// freezes the screen while a two-armed spiral galaxy of glitter swirls up
// in the middle of it, tilted, around a binary core: two wisps whirling
// round each other; bright star wisps sink in out of the arms one after
// another, spiralling down onto ever tighter orbits until they swing past
// the binary, which slings each one out at huge speed in a flash and a
// whoosh, off along its orbit and arcing onto a bar for free levels, ever
// faster; the last is flung onto the clicked bar in a big blast and every
// bar slams. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import {
  drawWisp,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { bezier } from "../../shared/curves";
import { clamp01, easeIn, easeOutBack, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  drawStars,
  planDisk,
  scatterArms,
  type Orbit,
} from "../../shared/galaxy";
import { findRewardBars, levelsFor, type RewardBar } from "../eventRewards";

const KEY = "hypervelocity";
const MAX_FLINGS = 6;
const STARS = 260;
const STAR = 8;
// the galaxy: a share of the screen's width across (at most OUTER), tilted
const DISK = 0.4;
const OUTER = 300;
const INNER = 40;
const SQUASH = 0.5;
const TILT = -0.35;
// the binary: two wisps BINARY px off the middle, whirling BINARY_HZ laps a second
const BINARY = 26;
const BINARY_HZ = 3;
const CORE = WISP_SIZE * 0.8;
// a runner sinks from the arms onto a SLING px orbit, then is flung off
const SLING = 34;
const RUNNER = WISP_SIZE * 0.55;
const FLING = 240;
const SLING_SHAKE: [number, number] = [0.4, 0.9];
const HIT_SHAKE = 0.6;

interface Runner {
  orbit: Orbit;
  sling: Orbit;
  bar: RewardBar;
  sinks: number;
  slingAt: number;
  hitsAt: number;
  from: Point;
  bow: Point;
  to: Point;
  at: (ms: number) => Point | null;
  flight: (ms: number) => Point | null;
}

export const forceHypervelocityEvent = registerWispEvent(
  KEY,
  "Hypervelocity",
  () => CONFIG.hypervelocityEvent.chance,
  (floor, context, area) => {
    const { growMs, sinkMs, gapMs, flyMs, levelShare, holdMs, mergeMs } =
      CONFIG.hypervelocityEvent;
    const bars = findRewardBars(floor, context);
    const clicked = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!clicked) return;
    const centre: Point = {
      x: (area.left + area.right) / 2,
      y: lerp([area.top, area.bottom], 0.36),
    };
    const outer = Math.min(OUTER, (area.right - area.left) * DISK);
    const disk = planDisk(centre, {
      inner: INNER,
      outer,
      squash: SQUASH,
      tilt: TILT,
      rimHz: 0.7,
    });
    const stars = scatterArms(disk, STARS, 2, 0.7, 0.3);
    const others = bars.filter((b) => b !== clicked);
    const count = Math.min(MAX_FLINGS, Math.max(3, bars.length * 2));
    const targets = Array.from({ length: count }, (_, k) =>
      k === count - 1 || others.length === 0
        ? clicked
        : others[k % others.length],
    );
    const levels = new Map(
      bars.map((b) => [b, levelsFor(b.floor, levelShare, 1)]),
    );

    // each runner: off an arm's orbit, sinking onto the sling orbit, then flung
    let slingAt = growMs + sinkMs;
    const runners: Runner[] = targets.map((bar, k) => {
      const orbit: Orbit = {
        radius: lerp([outer * 0.6, outer], Math.random()),
        phase: Math.random() * Math.PI * 2,
      };
      const sling: Orbit = {
        radius: SLING,
        phase: Math.random() * Math.PI * 2,
      };
      const at = slingAt;
      slingAt += gapMs * lerp([1.3, 0.7], k / Math.max(1, count - 1));
      const sinks = at - sinkMs;
      const from = disk.at(sling, at, { x: 0, y: 0 });
      const a = disk.heading(sling, at);
      const to: Point = {
        x: bar.box.x + bar.box.width * lerp([0.2, 0.8], Math.random()),
        y: bar.center.y,
      };
      const bow: Point = {
        x: from.x + Math.cos(a) * FLING,
        y: from.y + Math.sin(a) * FLING,
      };
      const spot: Point = { x: 0, y: 0 };
      const flying: Point = { x: 0, y: 0 };
      return {
        orbit,
        sling,
        bar,
        sinks,
        slingAt: at,
        hitsAt: at + flyMs,
        from,
        bow,
        to,
        at: (ms) =>
          ms < growMs || ms >= at
            ? null
            : disk.drift(
                orbit,
                sling,
                easeIn(clamp01((ms - sinks) / sinkMs)),
                ms,
                spot,
              ),
        flight: (ms) =>
          ms < at || ms > at + flyMs
            ? null
            : bezier(from, bow, to, easeIn((ms - at) / flyMs), flying),
      };
    });
    const last = runners[runners.length - 1];
    const endMs = last.hitsAt;

    const opening = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const slinging = createBeats(
      runners,
      (r) => r.slingAt,
      (r, k) => {
        cover!.burst(r.from, 0.5);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(SLING_SHAKE, k / Math.max(1, runners.length - 1)));
      },
    );
    const hitting = createBeats(
      runners,
      (r) => r.hitsAt,
      (r) => {
        cover!.levels(r.bar, levels.get(r.bar)!, r.from);
        if (r === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(r.to);
          return;
        }
        cover!.burst(r.to, 0.6);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(HIT_SHAKE);
      },
    );

    const binary = [0, Math.PI].map((offset) => {
      const spot: Point = { x: 0, y: 0 };
      return (ms: number): Point =>
        disk.place(
          BINARY,
          offset + (ms / 1000) * BINARY_HZ * Math.PI * 2,
          spot,
        );
    });
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          opening.tick(ms, now);
          slinging.tick(ms, now);
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          const grow = easeOutBack(clamp01(ms / growMs));
          const fade = 1 - clamp01((ms - last.slingAt) / 400);
          drawStars(ctx, disk, stars, ms, STAR, grow, fade);
          for (const b of binary)
            drawWisp(ctx, b, ms, now, CORE * grow * (0.4 + 0.6 * fade), 0.8);
          for (const r of runners) {
            drawWisp(
              ctx,
              r.at,
              ms,
              now,
              RUNNER,
              0.3 + 0.7 * clamp01((ms - r.sinks) / sinkMs),
            );
            drawWispBetween(
              ctx,
              r.flight,
              ms,
              now,
              RUNNER * 1.3,
              1,
              r.slingAt,
              r.hitsAt,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
