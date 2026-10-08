// the "Print Head" event (beam; free hires): it covers its crit, whose click
// freezes the screen while a print-head wisp darts out of the clicked
// floor's button to an empty spot and prints: it zips back and forth
// laying down line after line of light from the floor up, building a
// glowing column, which bursts in a flash, a pop and a jolt as a new worker
// forms out of it; then on to the next spot, printing ever faster, the last
// worker printed in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { drawBeam } from "../../../../shared/beam";
import { createBeats } from "../../../../shared/eventBeats";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "printHead";
const MAX_HIRES = 5;
const FORM_MS = 300;
// LINES lines LINE_GAP px apart, each WIDE px across
const LINES = 7;
const LINE_GAP = 14;
const WIDE = 70;
const LINE_WIDTH = 12;
const FADE_MS = 200;
const HOP_MS = 120;
const HEAD = 0.35;
const DONE_SHAKE: [number, number] = [0.6, 1.2];

export const forcePrintHeadEvent = registerWispEvent(
  KEY,
  "Print Head",
  () => CONFIG.printHeadEvent.chance,
  (floor, context) => {
    const { linesMs, holdMs, mergeMs } = CONFIG.printHeadEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    let from: Point = button;
    const jobs = hires.map((hire, k) => {
      const lineMs = lerp(linesMs, k / Math.max(1, hires.length - 1));
      const arrives = clock + HOP_MS;
      const done = arrives + LINES * lineMs;
      const base: Point = { x: hire.x, y: hire.y };
      // each line: its left and right end, printed in turn
      const lines = Array.from({ length: LINES }, (_, i) => {
        const y = base.y - i * LINE_GAP;
        const ltr = i % 2 === 0;
        return {
          a: { x: base.x + (ltr ? -WIDE : WIDE) / 2, y },
          b: { x: base.x + (ltr ? WIDE : -WIDE) / 2, y },
          tip: { x: 0, y },
          starts: arrives + i * lineMs,
        };
      });
      const job = {
        hire,
        base,
        from,
        leaves: clock,
        arrives,
        done,
        lineMs,
        lines,
      };
      clock = done;
      from = lines[LINES - 1].b;
      return job;
    });
    const last = jobs[jobs.length - 1];
    const endAt = last.done;
    const headAt: Point = { x: 0, y: 0 };
    const head = (ms: number): Point => {
      let j = jobs[0];
      for (const job of jobs) if (ms >= job.leaves) j = job;
      if (ms < j.arrives) {
        const u = easeOut(clamp01((ms - j.leaves) / HOP_MS));
        headAt.x = lerp([j.from.x, j.lines[0].a.x], u);
        headAt.y = lerp([j.from.y, j.lines[0].a.y], u);
        return headAt;
      }
      const i = Math.min(LINES - 1, Math.floor((ms - j.arrives) / j.lineMs));
      const line = j.lines[i];
      const u = clamp01((ms - line.starts) / j.lineMs);
      headAt.x = lerp([line.a.x, line.b.x], u);
      headAt.y = line.a.y;
      return headAt;
    };

    const starting = createBeats(
      jobs,
      (j) => j.arrives,
      () => {
        if (cover?.isLive()) playBloop();
      },
    );
    const printing = createBeats(
      jobs,
      (j) => j.done,
      (j, k) => {
        giveHire(j.hire);
        if (j === last) {
          cover!.blast(j.base);
          return;
        }
        cover!.burst(j.base, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(DONE_SHAKE, k / Math.max(1, jobs.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          starting.tick(ms, now);
          printing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt + FADE_MS) return;
          for (const j of jobs) {
            if (ms < j.arrives) continue;
            const fade = 1 - clamp01((ms - j.done) / FADE_MS);
            if (fade <= 0) continue;
            for (const line of j.lines) {
              if (ms < line.starts) break;
              const u = clamp01((ms - line.starts) / j.lineMs);
              line.tip.x = lerp([line.a.x, line.b.x], u);
              drawBeam(ctx, line.a, line.tip, LINE_WIDTH, fade);
            }
          }
          if (ms <= endAt)
            drawWispBetween(ctx, head, ms, now, WISP_SIZE * HEAD, 1, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
