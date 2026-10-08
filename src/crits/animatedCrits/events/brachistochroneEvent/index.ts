// the "Brachistochrone" event (experiment: the curve of fastest descent; a
// crit tier): it covers its crit, whose click freezes the screen while
// three tracks of light snap in from one point high on the screen down to
// the clicked floor's bar: a dead straight ramp, a steep drop that levels
// out, and a cycloid; three wisps are let go at the top together and race
// down them under real gravity, the cycloid's diving steepest and pulling
// ahead, with a whoosh and a jolt halfway; it lands on the bar
// first for a crit tier in a big blast, the others slamming in behind it,
// the last in a huge blast. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import { findRewardBars } from "../../eventRewards";

const KEY = "brachistochrone";
const STEPS = 48;
const TRACK_W = 6;
const TRACK_ALPHA = 0.45;
const BALL = WISP_SIZE * 0.7;
// how far up the screen the start is (of the room above the bar), and left
const RISE = 0.75;
const RUN = 0.8;
const FIRST_SHAKE = 1.4;
const SECOND_SHAKE = 1.0;

// a track's points and when a wisp let go at its top reaches each, sliding
// under gravity (in arbitrary units, scaled later)
function timed(points: Point[]): number[] {
  const times = [0];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const ds = Math.hypot(b.x - a.x, b.y - a.y);
    // its speed at the middle of the step, from the height it's dropped
    const drop = (a.y + b.y) / 2 - points[0].y;
    times.push(times[i - 1] + ds / Math.sqrt(Math.max(1e-6, drop)));
  }
  return times;
}

// the cycloid's turn θ where it meets a point dx across and dy down
function cycloidTurn(dx: number, dy: number): number {
  const want = dx / dy;
  let lo = 1e-4;
  let hi = 2 * Math.PI - 1e-4;
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    if ((mid - Math.sin(mid)) / (1 - Math.cos(mid)) < want) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export const forceBrachistochroneEvent = registerWispEvent(
  KEY,
  "Brachistochrone",
  () => CONFIG.brachistochroneEvent.chance,
  (floor, context, area) => {
    const { growMs, raceMs, holdMs, mergeMs } = CONFIG.brachistochroneEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const end = bar.center;
    const start: Point = {
      x: lerp([end.x, area.right - 60], RUN),
      y: lerp([end.y, area.top + 60], RISE),
    };
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const theta = cycloidTurn(Math.abs(dx), dy);
    const radius = dy / (1 - Math.cos(theta));
    const side = Math.sign(dx) || 1;
    const tracks: Point[][] = [
      // the straight ramp
      Array.from({ length: STEPS + 1 }, (_, i) => ({
        x: lerp([start.x, end.x], i / STEPS),
        y: lerp([start.y, end.y], i / STEPS),
      })),
      // a steep drop that levels out
      Array.from({ length: STEPS + 1 }, (_, i) =>
        bezier(start, { x: start.x, y: end.y }, end, i / STEPS, { x: 0, y: 0 }),
      ),
      // the cycloid
      Array.from({ length: STEPS + 1 }, (_, i) => {
        const t = (theta * i) / STEPS;
        return {
          x: start.x + side * radius * (t - Math.sin(t)),
          y: start.y + radius * (1 - Math.cos(t)),
        };
      }),
    ];
    const raw = tracks.map(timed);
    const slowest = Math.max(...raw.map((t) => t[t.length - 1]));
    const scale = raceMs / slowest;
    const times = raw.map((t) => t.map((v) => growMs + v * scale));
    const arrivals = times.map((t) => t[t.length - 1]);
    const order = [0, 1, 2].sort((a, b) => arrivals[a] - arrivals[b]);
    const spots = tracks.map(() => ({ x: 0, y: 0 }));
    const ats = tracks.map((track, k) => (ms: number): Point | null => {
      const t = times[k];
      if (ms > t[t.length - 1]) return null;
      if (ms <= t[0]) return track[0];
      let lo = 0;
      let hi = t.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (t[mid] <= ms) lo = mid;
        else hi = mid;
      }
      const u = (ms - t[lo]) / (t[hi] - t[lo]);
      spots[k].x = lerp([track[lo].x, track[hi].x], u);
      spots[k].y = lerp([track[lo].y, track[hi].y], u);
      return spots[k];
    });
    const endAt = Math.max(...arrivals);

    const starting = createBeats(
      [growMs],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const passing = createBeats(
      [growMs + (arrivals[order[0]] - growMs) * 0.5],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(0.6);
      },
    );
    const landing = createBeats(
      order,
      (k) => arrivals[k],
      (_, place) => {
        if (place === 0) cover!.tierUp(bar, start);
        if (place === order.length - 1) {
          cover!.slam(bar);
          cover!.blast(end);
          return;
        }
        cover!.burst(end, 0.8 - place * 0.2);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(place === 0 ? FIRST_SHAKE : SECOND_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          starting.tick(ms, now);
          passing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 600) return;
          const grow = easeOut(clamp01(ms / growMs));
          const fade = 1 - clamp01((ms - endAt) / 300);
          const shown = Math.round(STEPS * grow);
          for (let k = 0; k < tracks.length; k++) {
            const track = tracks[k];
            const glow = k === 2 ? 1.4 : 1;
            for (let i = 1; i <= shown; i++)
              drawBeam(
                ctx,
                track[i - 1],
                track[i],
                TRACK_W * glow,
                TRACK_ALPHA * glow * fade,
              );
          }
          for (let k = 0; k < tracks.length; k++)
            drawWispBetween(
              ctx,
              ats[k],
              ms,
              now,
              BALL * (k === 2 ? 1.2 : 1),
              k === 2 ? 0.8 : 0.3,
              0,
              arrivals[k],
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
