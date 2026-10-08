// the "Bar Hop" event (wisp; free upgrade levels): it covers its crit,
// whose click freezes the screen while a wisp leaps out of the clicked
// floor's button onto the end of the top income bar and bounces down the
// stack like a ball down a staircase, hopping from one end of each bar to
// the opposite end of the next, every landing a thud, a jolt and free
// levels, the bounces quickening; off the last bar it bounces down to the
// floor in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "barHop";
const MAX_BARS = 5;
const HOPS_PER_BAR = 2;
const ARC = 140;
const INSET = 40;
const WISP = 0.55;
const HOP_SHAKE: [number, number] = [0.4, 1.2];

interface Hop {
  from: Point;
  to: Point;
  leaves: number;
  lands: number;
  bar: RewardBar | null;
}

export const forceBarHopEvent = registerWispEvent(
  KEY,
  "Bar Hop",
  () => CONFIG.barHopEvent.chance,
  (floor, context, area) => {
    const { hopsMs, levelShare, holdMs, mergeMs } = CONFIG.barHopEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    // landing spots: both ends of every bar, zigzagging down the stack
    const spots: { at: Point; bar: RewardBar | null }[] = [];
    bars.forEach((bar, k) => {
      const ends = [bar.box.x + INSET, bar.box.x + bar.box.width - INSET];
      if (k % 2 === 1) ends.reverse();
      for (let h = 0; h < HOPS_PER_BAR; h++)
        spots.push({ at: { x: ends[h], y: bar.box.y }, bar });
    });
    spots.push({
      at: { x: (area.left + area.right) / 2, y: area.bottom - 60 },
      bar: null,
    });
    let clock = 0;
    let from: Point = getButtonCenter(context.isGroundFloor);
    const hops: Hop[] = spots.map((s, k) => {
      const leaves = clock;
      clock += lerp(hopsMs, k / (spots.length - 1));
      const hop = { from, to: s.at, leaves, lands: clock, bar: s.bar };
      from = s.at;
      return hop;
    });
    const endAt = clock;
    const ballAt: Point = { x: 0, y: 0 };
    const ball = (ms: number): Point => {
      const t = Math.max(0, ms);
      let h = hops[0];
      for (const hop of hops) if (t >= hop.leaves) h = hop;
      const u = clamp01((t - h.leaves) / (h.lands - h.leaves));
      ballAt.x = lerp([h.from.x, h.to.x], u);
      ballAt.y = lerp([h.from.y, h.to.y], u) - Math.sin(Math.PI * u) * ARC;
      return ballAt;
    };

    const landing = createBeats(
      hops,
      (h) => h.lands,
      (h, k) => {
        if (!h.bar) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(h.to);
          return;
        }
        cover!.levels(h.bar, levelsFor(h.bar.floor, levelShare, 1), h.from);
        cover!.burst(h.to, 0.4);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(HOP_SHAKE, k / (hops.length - 1)));
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
        tick: (ms, now) => landing.tick(ms, now),
        drawOver: (ctx, ms, now) =>
          drawWispBetween(ctx, ball, ms, now, WISP_SIZE * WISP, 0.6, 0, endAt),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
