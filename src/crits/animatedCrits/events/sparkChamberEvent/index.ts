// the "Spark Chamber" event (lightning; free upgrade levels): it covers its
// crit, whose click freezes the screen while a charged wisp streaks in from
// a top corner and dives across the screen on a curving track to the
// opposite bottom corner; wherever its track crosses an income bar in view a
// bolt cracks down from it onto the bar like a spark jumping a chamber's
// plates, each a flash, a crack, a jolt and free levels; a second particle
// streaks through the other way, faster, then a third, faster still, the
// last spark slamming into the clicked bar in a huge blast. Then the crit's
// tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "sparkChamber";
const PARTICLES = 3;
// px past the screen's corners the tracks start and end, and how far each
// curls off its straight line (share of the screen's width)
const ENTRY = 80;
const CURL = 0.25;
// px above a bar where the spark leaves the track
const ABOVE = 70;
const PARTICLE = WISP_SIZE * 0.8;
const STRIKE_MS = 260;
const SPARK_SHAKE: [number, number] = [0.4, 1.0];

interface Spark {
  bar: RewardBar;
  bolt: Bolt;
  hits: number;
  levels: number;
  last: boolean;
}

export const forceSparkChamberEvent = registerWispEvent(
  KEY,
  "Spark Chamber",
  () => CONFIG.sparkChamberEvent.chance,
  (floor, context, area) => {
    const { trackMs, gapMs, levelShare, holdMs, mergeMs } =
      CONFIG.sparkChamberEvent;
    const bars = findRewardBars(floor, context);
    const clicked = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!clicked) return;
    const width = area.right - area.left;
    const sparks: Spark[] = [];
    let clock = 0;
    const tracks = Array.from({ length: PARTICLES }, (_, k) => {
      const t = k / (PARTICLES - 1);
      const ms = lerp(trackMs, t);
      const leftFirst = k % 2 === 0;
      const from: Point = {
        x: leftFirst ? area.left - ENTRY : area.right + ENTRY,
        y: area.top - ENTRY,
      };
      const to: Point = {
        x: leftFirst ? area.right + ENTRY : area.left - ENTRY,
        y: area.bottom + ENTRY,
      };
      const bend: Point = {
        x: (from.x + to.x) / 2 + (leftFirst ? -1 : 1) * width * CURL,
        y: (from.y + to.y) / 2,
      };
      const starts = clock;
      clock += ms + gapMs;
      const spot = { x: 0, y: 0 };
      const at = (m: number): Point | null =>
        m > starts + ms
          ? null
          : bezier(from, bend, to, clamp01((m - starts) / ms), spot);
      // where it crosses just above each bar: y only grows along the track
      const probe = { x: 0, y: 0 };
      for (const bar of bars) {
        const y = bar.box.y - ABOVE;
        let lo = 0;
        let hi = 1;
        for (let i = 0; i < 24; i++) {
          const mid = (lo + hi) / 2;
          if (bezier(from, bend, to, mid, probe).y < y) lo = mid;
          else hi = mid;
        }
        const cross = bezier(from, bend, to, lo, { x: 0, y: 0 });
        const onto: Point = {
          x: Math.min(
            bar.box.x + bar.box.width * 0.9,
            Math.max(bar.box.x + bar.box.width * 0.1, cross.x),
          ),
          y: bar.box.y,
        };
        sparks.push({
          bar,
          bolt: createBolt(cross, onto, 1),
          hits: starts + lo * ms,
          levels: levelsFor(bar.floor, levelShare, 1),
          last: false,
        });
      }
      return { starts, ends: starts + ms, at };
    });
    // the last particle's spark onto the clicked bar is the finale
    const finalTrack = tracks[PARTICLES - 1];
    const finalSpark = sparks
      .filter((s) => s.bar === clicked && s.hits >= finalTrack.starts)
      .pop()!;
    finalSpark.last = true;
    const lastHit = Math.max(...sparks.map((s) => s.hits));
    const endAt = Math.max(finalTrack.ends, lastHit + STRIKE_MS);

    const streaking = createBeats(
      tracks,
      (t) => t.starts,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const sparking = createBeats(
      sparks,
      (s) => s.hits,
      (s) => {
        if (s.last) {
          cover!.levels(s.bar, s.levels * 3, s.bolt.from);
          cover!.slam(s.bar);
          cover!.blast(s.bolt.to);
          return;
        }
        cover!.levels(s.bar, s.levels, s.bolt.from);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SPARK_SHAKE, s.hits / lastHit));
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
          streaking.tick(ms, now);
          sparking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 600) return;
          for (const s of sparks) {
            const since = ms - s.hits;
            if (since < 0 || since >= STRIKE_MS) continue;
            const a = 1 - since / STRIKE_MS;
            drawBolt(ctx, s.bolt, a, s.last ? 1.4 : 0.8);
            drawStrike(ctx, s.bolt.to, a, s.last ? 1.6 : 1, now);
          }
          for (const t of tracks)
            drawWispBetween(ctx, t.at, ms, now, PARTICLE, 1, t.starts, t.ends);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
