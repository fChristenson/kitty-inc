// the "Joust" event (mix; crit tiers and cash): it covers its crit, whose
// click freezes the screen while on each income bar in turn (the clicked
// floor's first) two knight wisps charge at each other from the bar's two
// ends, each driving a lance of streaming cash ahead of it; the lances clash
// in the middle of the bar with a huge burst, a bang and a jolt, and the bar
// jumps a crit tier; each joust quicker, the last clash a huge blast as
// every bar slams. Pays floor income × floor number × REWARD, plus the tiers
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
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  riverHead,
  sampleLine,
  type Pour,
} from "../../cashFlow";
import { findRewardBars } from "../../eventRewards";

const KEY = "joust";
const REWARD = 2;
const MAX_BARS = 3;
// knights set off this far past the bar's ends
const OUTSIDE = 50;
const STEPS = 24;
// how far behind its lance's tip a knight rides, of the charge
const LANCE = 0.3;
const KNIGHT = 0.5;
const CLASH_SHAKE: [number, number] = [0.8, 1.4];

export const forceJoustEvent = registerWispEvent(
  KEY,
  "Joust",
  () => CONFIG.joustEvent.chance,
  (floor, context) => {
    const { chargesMs, gapMs, holdMs, mergeMs } = CONFIG.joustEvent;
    const found = findRewardBars(floor, context);
    const bars = [
      ...found.filter((b) => b.floor === floor),
      ...found.filter((b) => b.floor !== floor),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    let clock = 0;
    const jousts = bars.map((bar, k) => {
      const t = k / Math.max(1, bars.length - 1);
      const travelMs = lerp(chargesMs, t);
      const mid = bar.center;
      const y = mid.y;
      const left = sampleLine(
        (u) => ({ x: lerp([bar.box.x - OUTSIDE, mid.x], u), y }),
        STEPS,
      );
      const right = sampleLine(
        (u) => ({
          x: lerp([bar.box.x + bar.box.width + OUTSIDE, mid.x], u),
          y,
        }),
        STEPS,
      );
      const pour: Pour = {
        coinsAlong: 460,
        width: 22,
        streamMs: travelMs * 0.85,
        travelMs,
      };
      const starts = clock;
      const clashes = starts + travelMs;
      clock = clashes + gapMs;
      const lance = travelMs * LANCE;
      const knight = (line: Point[]) => {
        const head = riverHead(line, travelMs, starts);
        return (ms: number): Point | null =>
          head(Math.min(ms, clashes) - lance);
      };
      return {
        bar,
        mid,
        left,
        right,
        pour,
        starts,
        clashes,
        t,
        knights: [knight(left), knight(right)],
      };
    });
    const last = jousts[jousts.length - 1];
    const endAt = last.clashes;
    const durationMs = Math.max(
      pourDurationMs(last.starts, last.pour),
      endAt + holdMs + mergeMs,
    );

    const charging = createBeats(
      jousts,
      (j) => j.starts,
      (j) => {
        pourLine(cover!, j.left, j.pour);
        pourLine(cover!, j.right, j.pour);
        if (cover!.isLive()) playSwoosh();
      },
    );
    const clashing = createBeats(
      jousts,
      (j) => j.clashes,
      (j) => {
        cover!.tierUp(j.bar);
        if (j === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(j.mid);
          return;
        }
        cover!.burst(j.mid, 0.8 + 0.3 * j.t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CLASH_SHAKE, j.t));
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
          charging.tick(ms, now);
          clashing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const j of jousts)
            for (const knight of j.knights)
              drawWispBetween(
                ctx,
                knight,
                ms,
                now,
                WISP_SIZE * KNIGHT,
                0.8,
                j.starts,
                j.clashes,
              );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
