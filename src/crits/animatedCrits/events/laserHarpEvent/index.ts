// the "Laser Harp" event (beam; free upgrade levels): it covers its crit,
// whose click freezes the screen while a row of blazing laser strings shoots
// up from the bottom edge to the top like a laser harp; a wisp sweeps in and
// plucks them across the screen and back, ever faster, each string twanging
// where it's plucked with a ping, a flash and a jolt that lands free levels
// on the income bar under its finger; then every string blazes at once, the
// clicked floor's bar takes a pile more and every bar slams in a huge blast
// and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "laserHarp";
const STRINGS = 7;
const MAX_BARS = 5;
const STRING = 8;
// a plucked string bows AMP px, ringing at RING rad/ms and dying over DECAY_MS
const AMP = 46;
const RING = 0.09;
const DECAY_MS = 260;
const FINGER = 0.8;
const FLARE = 26;
const PLUCK_SHAKE: [number, number] = [0.4, 1.2];
const PLUCK_BURST: [number, number] = [0.35, 0.7];

export const forceLaserHarpEvent = registerWispEvent(
  KEY,
  "Laser Harp",
  () => CONFIG.laserHarpEvent.chance,
  (floor, context, area) => {
    const { igniteMs, entryMs, gapsMs, finaleMs, levelShare, holdMs, mergeMs } =
      CONFIG.laserHarpEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const own = bars.find((b) => b.floor === floor) ?? bars[bars.length - 1];
    const width = area.right - area.left;
    const top = area.top - 20;
    const bottom = area.bottom + 20;
    const xs = Array.from(
      { length: STRINGS },
      (_, i) => area.left + (width * (i + 0.5)) / STRINGS,
    );
    // across and back: string order and the bar each pluck lands on
    const order = [...xs.keys(), ...[...xs.keys()].reverse().slice(1)];
    if (Math.random() < 0.5) order.reverse();
    const plucks = order.map((s, k) => {
      const bar = bars[k % bars.length];
      return { s, bar, at: { x: xs[s], y: bar.center.y } };
    });
    const times: number[] = [];
    let clock = igniteMs + entryMs;
    plucks.forEach((_, k) => {
      times.push(clock);
      clock += lerp(gapsMs, k / Math.max(1, plucks.length - 1));
    });
    const finaleAt = times[times.length - 1] + gapsMs[1];
    const endAt = finaleAt + finaleMs;
    const entry: Point = {
      x: plucks[0].at.x + (plucks[0].s < STRINGS / 2 ? -1 : 1) * 160,
      y: plucks[0].at.y - 120,
    };
    // each string's last pluck: when, and how high up it
    const plucked = xs.map(() => ({ at: -Infinity, y: 0 }));

    const finger: Point = { x: 0, y: 0 };
    const hand = (ms: number): Point | null => {
      if (ms < igniteMs || ms >= finaleAt) return null;
      let k = 0;
      while (k + 1 < plucks.length && ms >= times[k + 1]) k++;
      const from = ms < times[0] ? entry : plucks[k].at;
      const to =
        ms < times[0]
          ? plucks[0].at
          : plucks[Math.min(k + 1, plucks.length - 1)].at;
      const t0 = ms < times[0] ? igniteMs : times[k];
      const t1 = ms < times[0] ? times[0] : (times[k + 1] ?? finaleAt);
      const u = smoothstep(clamp01((ms - t0) / (t1 - t0)));
      finger.x = from.x + (to.x - from.x) * u;
      finger.y = from.y + (to.y - from.y) * u - Math.sin(Math.PI * u) * 30;
      return finger;
    };

    const plucking = createBeats(
      plucks,
      (_, k) => times[k],
      (p, k) => {
        const t = k / Math.max(1, plucks.length - 1);
        plucked[p.s].at = times[k];
        plucked[p.s].y = p.at.y;
        cover!.levels(p.bar, levelsFor(p.bar.floor, levelShare, 1), {
          x: p.at.x,
          y: p.at.y - 50,
        });
        cover!.burst(p.at, lerp(PLUCK_BURST, t));
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(PLUCK_SHAKE, t));
      },
    );
    const finale = createBeats(
      [finaleAt],
      (ms) => ms,
      () => {
        cover!.levels(own, levelsFor(own.floor, levelShare * 4, 3));
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(own.center);
      },
    );

    const bend: Point = { x: 0, y: 0 };
    const head: Point = { x: 0, y: 0 };
    const foot: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          plucking.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms >= endAt) return;
          const blaze =
            ms >= finaleAt ? 1 - clamp01((ms - finaleAt) / finaleMs) : 0;
          xs.forEach((x, i) => {
            // each string shoots up from the bottom in turn
            const up = easeOut(
              clamp01((ms - (igniteMs * i) / STRINGS) / (igniteMs / 2)),
            );
            if (up <= 0) return;
            foot.x = x;
            foot.y = bottom;
            head.x = x;
            head.y = bottom + (top - bottom) * up;
            const since = ms - plucked[i].at;
            const ring = since >= 0 && since < DECAY_MS * 3;
            const width =
              STRING *
              (1 + (ring ? 1.2 * Math.exp(-since / DECAY_MS) : 0) + 3 * blaze);
            const alpha =
              0.55 +
              (ring ? 0.45 * Math.exp(-since / DECAY_MS) : 0) +
              0.45 * blaze;
            if (!ring || up < 1) {
              drawBeam(ctx, foot, head, width, alpha);
              return;
            }
            bend.x =
              x +
              AMP *
                Math.exp(-since / DECAY_MS) *
                Math.sin(since * RING + Math.PI / 2);
            bend.y = plucked[i].y;
            drawBeam(ctx, foot, bend, width, alpha);
            drawBeam(ctx, bend, head, width, alpha);
            if (since < 120)
              drawBeamFlare(ctx, bend, FLARE * (1 - since / 120), 1, now);
          });
          drawWispBetween(
            ctx,
            hand,
            ms,
            now,
            WISP_SIZE * FINGER,
            clamp01(ms / finaleAt),
            igniteMs,
            finaleAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);
