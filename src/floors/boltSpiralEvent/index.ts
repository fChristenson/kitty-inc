// the "Bolt Spiral" event (lightning; free upgrade levels): it covers its
// crit, whose click freezes the screen while a crackling arm of lightning
// sprouts from the middle of the screen and sweeps round like a clock hand,
// growing longer as it spins faster, spiralling out over the whole stack;
// every time its tip crosses an income bar it cracks down on it in a flash,
// a ping and a jolt with free levels; at full stretch every bar slams and
// the hub blows in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../shared/lightning";
import { findRewardBars, levelsFor, type RewardBar } from "../eventRewards";
import { sampleLine } from "../cashFlow";

const KEY = "boltSpiral";
const MAX_BARS = 5;
const TURNS = 3;
const SAMPLES = 360;
const START_R = 30;
const REACH_PAST = 160;
const STRIKE_MS = 160;
const WISP = 0.6;
const HIT_SHAKE: [number, number] = [0.3, 1];

interface Hit {
  bar: RewardBar;
  at: Point;
  ms: number;
}

export const forceBoltSpiralEvent = registerWispEvent(
  KEY,
  "Bolt Spiral",
  () => CONFIG.boltSpiralEvent.chance,
  (floor, context, area) => {
    const { spinMs, levelShare, holdMs, mergeMs } = CONFIG.boltSpiralEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const hub: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const reach =
      Math.max(...bars.map((b) => Math.abs(b.center.y - hub.y))) + REACH_PAST;
    // turning ever faster, so the angle runs as u squared
    const path = sampleLine((u) => {
      const a = -Math.PI / 2 + TURNS * Math.PI * 2 * u * u;
      const r = lerp([START_R, reach], u);
      return { x: hub.x + Math.cos(a) * r, y: hub.y + Math.sin(a) * r };
    }, SAMPLES);
    const hits: Hit[] = [];
    for (let i = 0; i < SAMPLES; i++) {
      const a = path[i];
      const b = path[i + 1];
      for (const bar of bars) {
        const y = bar.center.y;
        if ((a.y - y) * (b.y - y) > 0 || a.y === b.y) continue;
        const f = (y - a.y) / (b.y - a.y);
        const x = lerp([a.x, b.x], f);
        if (x < bar.box.x || x > bar.box.x + bar.box.width) continue;
        hits.push({ bar, at: { x, y }, ms: (spinMs * (i + f)) / SAMPLES });
      }
    }
    hits.sort((p, q) => p.ms - q.ms);
    const endAt = spinMs;
    const tip: Point = { x: 0, y: 0 };
    const arm = createBolt(hub, path[SAMPLES], 2);
    arm.to = tip;
    const tipAt = (ms: number): Point => {
      const f = clamp01(ms / spinMs) * SAMPLES;
      const i = Math.min(SAMPLES - 1, Math.floor(f));
      tip.x = lerp([path[i].x, path[i + 1].x], f - i);
      tip.y = lerp([path[i].y, path[i + 1].y], f - i);
      return tip;
    };
    const hubAt = () => hub;

    const striking = createBeats(
      hits,
      (h) => h.ms,
      (h, k) => {
        cover!.levels(h.bar, levelsFor(h.bar.floor, levelShare, 1), hub);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, hits.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(hub);
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
          striking.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + STRIKE_MS) return;
          for (const h of hits) {
            const t = (ms - h.ms) / STRIKE_MS;
            if (t >= 0 && t < 1) drawStrike(ctx, h.at, 1 - t, 0.8, now);
          }
          if (ms > endAt) return;
          tipAt(ms);
          drawBolt(ctx, arm, 0.6 + 0.4 * easeIn(ms / spinMs), 0.9);
          drawWispBetween(ctx, hubAt, ms, now, WISP_SIZE * WISP, 0.7, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
