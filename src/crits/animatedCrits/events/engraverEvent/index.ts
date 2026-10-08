// the "Engraver" event (beam; crit tiers): it covers its crit, whose click
// freezes the screen while a wisp darts out of the clicked floor's button
// and hovers over an income bar like the head of a laser engraver; it
// rasters a blazing beam across the bar line by line, back and forth,
// sparks spraying where it burns, and as the last line is cut the bar
// jumps a crit tier with a flash, a bang and a jolt; bar after bar, ever
// faster; the last one done, every bar slams in a huge blast and shake.
// Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardBars } from "../../eventRewards";

const KEY = "engraver";
const MAX_BARS = 3;
// the head hovers HIGH px over a bar, cutting LINES lines across it
const HIGH = 120;
const LINES = 5;
const BEAM = 10;
const FLARE = 22;
const HEAD = 0.55;
const CUT_SHAKE: [number, number] = [0.9, 1.5];

export const forceEngraverEvent = registerWispEvent(
  KEY,
  "Engraver",
  () => CONFIG.engraverEvent.chance,
  (floor, context) => {
    const { moveMs, rastersMs, holdMs, mergeMs } = CONFIG.engraverEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    let from: Point = button;
    const jobs = bars.map((bar, k) => {
      const head: Point = { x: bar.center.x, y: bar.box.y - HIGH };
      const arrives = clock + moveMs;
      const span = lerp(rastersMs, k / Math.max(1, bars.length - 1));
      const job = {
        bar,
        head,
        from,
        leaves: clock,
        arrives,
        done: arrives + span,
        span,
      };
      clock = job.done;
      from = head;
      return job;
    });
    const endAt = clock;
    const headAt: Point = { x: 0, y: 0 };
    const head = (ms: number): Point | null => {
      if (ms < 0 || ms > endAt) return null;
      for (const j of jobs) {
        if (ms > j.done) continue;
        const u = smoothstep((ms - j.leaves) / moveMs);
        headAt.x = lerp([j.from.x, j.head.x], u);
        headAt.y = lerp([j.from.y, j.head.y], u);
        return headAt;
      }
      return null;
    };
    // where the beam lands as it rasters the bar, line by line
    const cut: Point = { x: 0, y: 0 };
    const cutAt = (j: (typeof jobs)[number], ms: number): Point => {
      const f = Math.min(LINES - 0.001, ((ms - j.arrives) / j.span) * LINES);
      const line = Math.floor(f);
      const u = f - line;
      const { box } = j.bar;
      cut.x = box.x + box.width * (line % 2 === 0 ? u : 1 - u);
      cut.y = box.y + box.height * ((line + 0.5) / LINES);
      return cut;
    };

    const starting = createBeats(
      jobs,
      (j) => j.arrives,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const finishing = createBeats(
      jobs,
      (j) => j.done,
      (j, k) => {
        cover!.tierUp(j.bar, j.head);
        if (k === jobs.length - 1) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(j.bar.center);
          return;
        }
        cover!.burst(j.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CUT_SHAKE, k / Math.max(1, jobs.length - 1)));
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
          finishing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const j of jobs) {
            if (ms < j.arrives || ms >= j.done) continue;
            const at = cutAt(j, ms);
            drawBeam(ctx, j.head, at, BEAM, 0.9);
            drawBeamFlare(ctx, at, FLARE, 1, now);
          }
          drawWispBetween(ctx, head, ms, now, WISP_SIZE * HEAD, 0.9, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
