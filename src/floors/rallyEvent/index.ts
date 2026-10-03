// the "Rally" event (beam; cash): it covers its crit, whose click freezes the
// screen while a blazing beam starts tracing a stock chart across the
// screen from its bottom-left, jagging up and down but climbing ever
// steeper, every new high a ding, a jolt and a spurt of coins off the
// peak; at the right edge the line rockets straight up into the total in a
// huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../shared/beam";
import { ringTargets } from "../../shared/coinTargets";
import { totalSpot } from "../cashFlow";
import type { Point } from "../../shared/wisp";

const KEY = "rally";
const REWARD = 4;
const TICKS = 12;
// the chart dips up to DIP of a step back down between climbs
const DIP = 0.6;
const BEAM = 12;
const HEAD = 26;
const PEAK_COINS = 18;
const PEAK_RING: [number, number] = [50, 180];
const PEAK_SHAKE: [number, number] = [0.4, 1.2];

export const forceRallyEvent = registerWispEvent(
  KEY,
  "Rally",
  () => CONFIG.rallyEvent.chance,
  (floor, context, area) => {
    const { traceMs, rocketMs, holdMs, mergeMs } = CONFIG.rallyEvent;
    const fallback = totalSpot(area);
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    // a climbing, jagged chart: each tick a step up or a dip back
    const points: Point[] = [
      { x: area.left + 30, y: area.bottom - height * 0.1 },
    ];
    let high = points[0].y;
    for (let i = 1; i <= TICKS; i++) {
      const climb = height * 0.6 * (i / TICKS) ** 1.6;
      const base = area.bottom - height * 0.1 - climb;
      const dip = i % 3 === 2 ? (DIP * (height * 0.6)) / TICKS : 0;
      points.push({
        x: area.left + 30 + ((width - 60) * i) / TICKS,
        y: base + dip + (Math.random() * 2 - 1) * 12,
      });
    }
    // each tick reached ever faster
    const tickAt = (i: number) => traceMs * Math.sqrt(i / TICKS);
    const peaks = points
      .map((p, i) => ({ p, at: tickAt(i), i }))
      .filter(({ p, i }) => {
        if (i === 0 || p.y >= high) return false;
        high = p.y;
        return true;
      });
    const endAt = traceMs + rocketMs;
    const head: Point = { x: 0, y: 0 };
    const last = points[TICKS];

    const peaking = createBeats(
      peaks,
      (p) => p.at,
      (p, k) => {
        cover!.launchFrom(p.p, ringTargets(p.p, PEAK_COINS, PEAK_RING));
        cover!.burst(p.p, 0.3);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(PEAK_SHAKE, k / Math.max(1, peaks.length - 1)));
      },
    );
    const rocketing = createBeats(
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
        tick: (ms, now) => {
          peaking.tick(ms, now);
          rocketing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 200) return;
          const fade = ms > endAt ? 1 - (ms - endAt) / 200 : 1;
          // every finished segment, then the one being drawn
          let i = 1;
          for (; i <= TICKS && tickAt(i) <= ms; i++)
            drawBeam(ctx, points[i - 1], points[i], BEAM, fade);
          if (i <= TICKS) {
            const u = clamp01(
              (ms - tickAt(i - 1)) / (tickAt(i) - tickAt(i - 1)),
            );
            head.x = lerp([points[i - 1].x, points[i].x], u);
            head.y = lerp([points[i - 1].y, points[i].y], u);
            drawBeam(ctx, points[i - 1], head, BEAM);
            drawBeamFlare(ctx, head, HEAD, 1, now);
            return;
          }
          const total = cover?.total() ?? fallback;
          const u = easeIn(clamp01((ms - traceMs) / rocketMs));
          head.x = lerp([last.x, total.x], u);
          head.y = lerp([last.y, total.y], u);
          drawBeam(ctx, last, head, BEAM * 1.6, fade);
          drawBeamFlare(ctx, head, HEAD * 1.5, fade, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
