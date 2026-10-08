// the "Folding Rule" event (beam; crit tiers): it covers its crit, whose
// click freezes the screen while a carpenter's folding rule of blazing beam
// segments lies folded up at the end of an income bar; it unfolds joint by
// joint along the bar, each segment swinging up and over its hinge and
// snapping straight with a flare and a jolt, ever quicker, until it lies
// full length and flashes, jumping the bar a crit tier; then the next bar's
// rule unfolds, the last flashing in a huge blast and shake. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "foldingRule";
const MAX_BARS = 4;
const SEGMENTS = 6;
const INSET = 10;
const WIDTH = 7;
const APPEAR_MS = 120;
const FLASH_MS = 220;
const SNAP_MS = 140;
const SNAP_SHAKE: [number, number] = [0.15, 0.45];
const HIT_SHAKE: [number, number] = [0.6, 1.3];

interface Rule {
  bar: RewardBar;
  // the hinge end it unfolds from, and which way along the bar it opens
  from: Point;
  dir: number;
  length: number;
  appears: number;
  // when each hinge after the first snaps straight
  snaps: number[];
  done: number;
}

export const forceFoldingRuleEvent = registerWispEvent(
  KEY,
  "Folding Rule",
  () => CONFIG.foldingRuleEvent.chance,
  (floor, context) => {
    const { hingesMs, holdMs, mergeMs } = CONFIG.foldingRuleEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    let clock = 0;
    const rules: Rule[] = bars.map((bar, k) => {
      const dir = k % 2 ? -1 : 1;
      const { box } = bar;
      const from: Point = {
        x: dir > 0 ? box.x + INSET : box.x + box.width - INSET,
        y: bar.center.y,
      };
      const hingeMs = lerp(hingesMs, k / Math.max(1, bars.length - 1));
      const appears = clock;
      const snaps = Array.from(
        { length: SEGMENTS - 1 },
        (_, j) => appears + APPEAR_MS + (j + 1) * hingeMs,
      );
      const done = snaps[snaps.length - 1];
      clock = done + FLASH_MS * 0.5;
      return {
        bar,
        from,
        dir,
        length: (box.width - INSET * 2) / SEGMENTS,
        appears,
        snaps,
        done,
      };
    });
    const last = rules[rules.length - 1];
    const endAt = last.done + FLASH_MS;
    const joints: Point[] = Array.from({ length: SEGMENTS + 1 }, () => ({
      x: 0,
      y: 0,
    }));
    const snapping = rules.flatMap((r) => r.snaps.slice(0, -1));

    // every hinge folded back on itself until its turn, then swung up and
    // over to lie straight; segments past it ride along folded
    const pose = (r: Rule, ms: number) => {
      let heading = r.dir > 0 ? 0 : Math.PI;
      joints[0].x = r.from.x;
      joints[0].y = r.from.y;
      for (let j = 0; j < SEGMENTS; j++) {
        if (j > 0) {
          const opens = r.snaps[j - 1];
          const starts = j === 1 ? r.appears + APPEAR_MS : r.snaps[j - 2];
          const u = easeIn(clamp01((ms - starts) / (opens - starts)));
          // folded is half a turn back; it swings the upward way round
          heading += Math.PI * (1 + u * r.dir);
        }
        joints[j + 1].x = joints[j].x + Math.cos(heading) * r.length;
        joints[j + 1].y = joints[j].y + Math.sin(heading) * r.length;
      }
    };

    const snappingBeats = createBeats(
      snapping,
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(SNAP_SHAKE, k / Math.max(1, snapping.length - 1)));
      },
    );
    const finishing = createBeats(
      rules,
      (r) => r.done,
      (r, k) => {
        cover!.tierUp(r.bar, r.bar.center);
        if (r === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(r.bar.center);
          return;
        }
        cover!.burst(r.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, rules.length - 1)));
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
          snappingBeats.tick(ms, now);
          finishing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          for (const r of rules) {
            if (ms < r.appears || ms > r.done + FLASH_MS) continue;
            pose(r, ms);
            const appear = clamp01((ms - r.appears) / APPEAR_MS);
            const flash = clamp01((ms - r.done) / FLASH_MS);
            const alpha = appear * (ms > r.done ? 1 - flash : 1);
            const width = WIDTH * (1 + 2 * Math.sin(Math.PI * flash));
            for (let j = 0; j < SEGMENTS; j++)
              drawBeam(ctx, joints[j], joints[j + 1], width, alpha);
            for (let j = 0; j < r.snaps.length; j++) {
              const t = (ms - r.snaps[j]) / SNAP_MS;
              if (t >= 0 && t < 1)
                drawBeamFlare(ctx, joints[j + 1], 18, 1 - t, now);
            }
            if (ms < r.done)
              drawBeamFlare(ctx, joints[SEGMENTS], 10, alpha, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
