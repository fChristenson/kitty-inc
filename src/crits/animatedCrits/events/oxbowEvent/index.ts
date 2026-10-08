// the "Oxbow" event (money; crit tiers and cash): it covers its crit, whose
// click freezes the screen while a river of cash meanders out of the clicked
// floor's button to an income bar and swings in a full loop right round it;
// as the loop closes on itself the bar is cut off like an oxbow lake, with a
// splash, a bang and a jolt, and jumps a crit tier; the river meanders on to
// loop the next bar, quicker each time, the last loop closing in a huge
// blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import { measure, pourDurationMs, pourLine, type Pour } from "../../cashFlow";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "oxbow";
const REWARD = 2;
const MAX_BARS = 4;
const APPROACH_STEPS = 16;
const LAP_STEPS = 48;
const OVERRUN_STEPS = 10;
const LOOP_X = 50;
const LOOP_Y = 46;
const ARCH = 90;
const OVERLAP = 0.7;
const CUT_SHAKE: [number, number] = [0.7, 1.4];

interface Loop {
  bar: RewardBar;
  line: Point[];
  pour: Pour;
  starts: number;
  closes: number;
}

export const forceOxbowEvent = registerWispEvent(
  KEY,
  "Oxbow",
  () => CONFIG.oxbowEvent.chance,
  (floor, context) => {
    const { loopsMs, holdMs, mergeMs } = CONFIG.oxbowEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    let from: Point = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    const loops: Loop[] = bars.map((bar, k) => {
      const span = lerp(loopsMs, k / Math.max(1, bars.length - 1));
      const rx = bar.box.width / 2 + LOOP_X;
      const ry = bar.box.height / 2 + LOOP_Y;
      const { x: cx, y: cy } = bar.center;
      const entry: Point = { x: cx - rx, y: cy };
      const bend: Point = {
        x: (from.x + entry.x) / 2 - ARCH,
        y: Math.min(from.y, entry.y) - ARCH,
      };
      const line: Point[] = [];
      for (let i = 0; i <= APPROACH_STEPS; i++)
        line.push(
          bezier(from, bend, entry, i / APPROACH_STEPS, { x: 0, y: 0 }),
        );
      for (let i = 1; i <= LAP_STEPS + OVERRUN_STEPS; i++) {
        const a = Math.PI + (i / LAP_STEPS) * Math.PI * 2;
        line.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
      }
      const along = measure(line);
      const starts = clock;
      const closes =
        starts +
        (span * along[APPROACH_STEPS + LAP_STEPS]) / along[along.length - 1];
      clock += span * OVERLAP;
      from = line[line.length - 1];
      return {
        bar,
        line,
        starts,
        closes,
        pour: {
          coinsAlong: 240,
          width: 34,
          streamMs: span * 0.6,
          travelMs: span,
        },
      };
    });
    const last = loops[loops.length - 1];
    const endAt = last.closes;
    const durationMs = Math.max(
      ...loops.map((l) => pourDurationMs(l.starts, l.pour)),
      endAt + holdMs + mergeMs,
    );

    const pouring = createBeats(
      loops,
      (l) => l.starts,
      (l) => pourLine(cover!, l.line, l.pour),
    );
    const cutting = createBeats(
      loops,
      (l) => l.closes,
      (l, k) => {
        cover!.tierUp(l.bar, l.line[APPROACH_STEPS]);
        if (l === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(l.bar.center);
          if (cover!.isLive()) playExplosion();
          return;
        }
        cover!.burst(l.line[APPROACH_STEPS], 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CUT_SHAKE, k / Math.max(1, loops.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        bars,
        tick: (ms, now) => {
          pouring.tick(ms, now);
          cutting.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
