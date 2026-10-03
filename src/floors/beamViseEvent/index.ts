// the "Beam Vise" event (beam; crit tiers): it covers its crit, whose click
// freezes the screen while two blazing beams slide in edge to edge, one far
// above an income bar and one far below it, and clamp shut on it like the
// jaws of a vise in three hard cranks, every crank a clunk and a jolt; on
// the third they bite onto the bar in a flash and a bang and it jumps a
// crit tier; the vise springs open onto the next bar, cranking quicker
// each time, the last bite a huge blast and shake. Then the crit's tier
// pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../shared/beam";
import { findRewardBars, type RewardBar } from "../eventRewards";
import type { Point } from "../../shared/wisp";

const KEY = "beamVise";
const MAX_BARS = 4;
const CRANKS = 3;
const OPEN = 190;
const CRANK_MS = 60;
const SLIDE_MS = 120;
const LET_GO_MS = 220;
const JAW = 12;
const CRANK_SHAKE = 0.45;
const BITE_SHAKE: [number, number] = [0.8, 1.5];

interface Grip {
  bar: RewardBar;
  starts: number;
  cranks: number[];
  bites: number;
}

export const forceBeamViseEvent = registerWispEvent(
  KEY,
  "Beam Vise",
  () => CONFIG.beamViseEvent.chance,
  (floor, context, area) => {
    const { gripsMs, holdMs, mergeMs } = CONFIG.beamViseEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    let clock = 0;
    const grips: Grip[] = bars.map((bar, k) => {
      const span = lerp(gripsMs, k / Math.max(1, bars.length - 1));
      const starts = clock;
      const cranks = Array.from(
        { length: CRANKS },
        (_, c) => starts + SLIDE_MS + ((span - SLIDE_MS) * (c + 1)) / CRANKS,
      );
      clock = cranks[CRANKS - 1];
      return { bar, starts, cranks, bites: cranks[CRANKS - 1] };
    });
    const last = grips[grips.length - 1];
    const endAt = last.bites + LET_GO_MS;
    const left: Point = { x: area.left, y: 0 };
    const right: Point = { x: area.right, y: 0 };
    const flare: Point = { x: 0, y: 0 };

    const cranking = createBeats(
      grips.flatMap((g) => g.cranks.slice(0, -1)),
      (ms) => ms,
      () => {
        if (!cover?.isLive()) return;
        playBloop();
        shakeScreen(CRANK_SHAKE);
      },
    );
    const biting = createBeats(
      grips,
      (g) => g.bites,
      (g, k) => {
        cover!.tierUp(g.bar);
        if (g === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(g.bar.center);
          return;
        }
        cover!.burst(g.bar.center, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BITE_SHAKE, k / Math.max(1, grips.length - 1)));
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
          cranking.tick(ms, now);
          biting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (let i = 0; i < grips.length; i++) {
            const g = grips[i];
            const next = grips[i + 1];
            const ends = next ? next.starts + SLIDE_MS : g.bites + LET_GO_MS;
            if (ms < g.starts || ms > ends) continue;
            let shut = 0;
            for (const c of g.cranks)
              shut += easeOut(clamp01((ms - c + CRANK_MS) / CRANK_MS));
            const gap = lerp(
              [OPEN, g.bar.box.height / 2 + JAW / 2],
              shut / CRANKS,
            );
            const slide = easeOut(clamp01((ms - g.starts) / SLIDE_MS));
            const fade =
              ms > g.bites ? 1 - clamp01((ms - g.bites) / LET_GO_MS) : 1;
            for (const side of [-1, 1]) {
              left.y = right.y = g.bar.center.y + side * gap;
              const reach = lerp([0, area.right - area.left], slide);
              right.x = area.left + reach;
              drawBeam(ctx, left, right, JAW, 0.85 * fade);
            }
            right.x = area.right;
            if (ms >= g.bites && ms < g.bites + LET_GO_MS) {
              flare.x = g.bar.center.x;
              flare.y = g.bar.center.y;
              drawBeamFlare(ctx, flare, 40 * fade, fade, now);
            }
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
