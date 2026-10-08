// the "Shuttle Run" event (wisp; worker perma tiers): it covers its crit,
// whose click freezes the screen while a runner wisp bursts out of the
// clicked floor's button to a start line at the side of the screen and runs
// shuttles: a flat-out sprint to a worker, a tag with a flash, a pop and a
// jolt as they climb a perma tier, and a sprint straight back to the line;
// each shuttle further and faster, the last tag landing in a huge blast and
// shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "shuttleRun";
const MAX_WORKERS = 6;
const EDGE = 60;
const SETUP_MS = 200;
const RUNNER = 0.45;
const TAG_SHAKE: [number, number] = [0.5, 1.2];

export const forceShuttleRunEvent = registerWispEvent(
  KEY,
  "Shuttle Run",
  () => CONFIG.shuttleRunEvent.chance,
  (floor, context, area) => {
    const { runsMs, holdMs, mergeMs } = CONFIG.shuttleRunEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const ltr = button.x < (area.left + area.right) / 2;
    const lineX = ltr ? area.left + EDGE : area.right - EDGE;
    // nearest the line first, so every run is longer than the last
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => Math.abs(a.at.x - lineX) - Math.abs(b.at.x - lineX));
    if (workers.length === 0) return;
    let clock: number = SETUP_MS;
    const runs = workers.map((worker, k) => {
      const line: Point = { x: lineX, y: worker.at.y };
      const half = lerp(runsMs, k / Math.max(1, workers.length - 1)) / 2;
      const leaves = clock;
      const tags = leaves + half;
      clock = tags + (k === workers.length - 1 ? 0 : half);
      return { worker, line, leaves, tags, back: clock };
    });
    const last = runs[runs.length - 1];
    const endAt = last.tags;
    const runnerAt: Point = { x: 0, y: 0 };
    const runner = (ms: number): Point => {
      const first = runs[0];
      if (ms < first.leaves) {
        const u = easeOut(clamp01(ms / SETUP_MS));
        runnerAt.x = lerp([button.x, first.line.x], u);
        runnerAt.y = lerp([button.y, first.line.y], u);
        return runnerAt;
      }
      let r = first;
      for (const run of runs) if (ms >= run.leaves) r = run;
      const out = ms < r.tags;
      const u = smoothstep(
        clamp01(
          out
            ? (ms - r.leaves) / (r.tags - r.leaves)
            : (ms - r.tags) / Math.max(1, r.back - r.tags),
        ),
      );
      const next = runs[runs.indexOf(r) + 1] ?? r;
      runnerAt.x = out
        ? lerp([r.line.x, r.worker.at.x], u)
        : lerp([r.worker.at.x, next.line.x], u);
      runnerAt.y = out
        ? lerp([r.line.y, r.worker.at.y], u)
        : lerp([r.worker.at.y, next.line.y], u);
      return runnerAt;
    };

    const tagging = createBeats(
      runs,
      (r) => r.tags,
      (r, k) => {
        cover!.promote(r.worker);
        if (r === last) {
          cover!.blast(r.worker.at);
          return;
        }
        cover!.burst(r.worker.at, 0.45);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(TAG_SHAKE, k / Math.max(1, runs.length - 1)));
      },
    );
    const touching = createBeats(
      runs.slice(1),
      (r) => r.leaves,
      () => {
        if (cover?.isLive()) playBloop();
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          tagging.tick(ms, now);
          touching.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms <= endAt)
            drawWispBetween(
              ctx,
              runner,
              ms,
              now,
              WISP_SIZE * RUNNER,
              0.8,
              0,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
