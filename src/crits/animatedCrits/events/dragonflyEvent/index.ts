// the "Dragonfly" event (wisp; worker perma tiers): it covers its crit, whose
// click freezes the screen while a dragonfly wisp zips out of the clicked
// floor's button in dead-straight darts, stopping dead to hover trembling
// over one worker after another; each time it dips onto its worker with a
// flash, a pop and a jolt, and they climb a perma tier, its hovers ever
// shorter; on the last it drops in a huge blast and shake. Then the crit's
// tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { easeOutCubic, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "dragonfly";
const MAX_WORKERS = 6;
// it hovers HIGH px over each worker, trembling TREMBLE px, then dips DIP_MS
const HIGH = 60;
const TREMBLE = 4;
const DIP_MS = 90;
const FLY = 0.42;
const DIP_SHAKE: [number, number] = [0.5, 1.2];

export const forceDragonflyEvent = registerWispEvent(
  KEY,
  "Dragonfly",
  () => CONFIG.dragonflyEvent.chance,
  (floor, context) => {
    const { dartMs, hoversMs, holdMs, mergeMs } = CONFIG.dragonflyEvent;
    const found = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (found.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    // nearest worker next, starting from the button
    const workers: RewardWorker[] = [];
    let from: Point = button;
    const left = [...found];
    while (left.length > 0) {
      left.sort(
        (a, b) =>
          Math.hypot(a.at.x - from.x, a.at.y - from.y) -
          Math.hypot(b.at.x - from.x, b.at.y - from.y),
      );
      const next = left.shift()!;
      workers.push(next);
      from = next.at;
    }
    let clock = 0;
    let prev: Point = button;
    const stops = workers.map((worker, k) => {
      const over: Point = { x: worker.at.x, y: worker.at.y - HIGH };
      const s = {
        worker,
        from: prev,
        over,
        leaves: clock,
        arrives: clock + dartMs,
        dips:
          clock + dartMs + lerp(hoversMs, k / Math.max(1, workers.length - 1)),
      };
      clock = s.dips + DIP_MS;
      prev = over;
      return s;
    });
    const last = stops[stops.length - 1];
    const endAt = last.dips + DIP_MS;
    const at: Point = { x: 0, y: 0 };
    const fly = (ms: number): Point | null => {
      if (ms > endAt) return null;
      for (const s of stops) {
        if (ms > s.dips + DIP_MS) continue;
        if (ms < s.arrives) {
          const u = easeOutCubic(Math.max(0, ms - s.leaves) / dartMs);
          at.x = lerp([s.from.x, s.over.x], u);
          at.y = lerp([s.from.y, s.over.y], u);
        } else if (ms < s.dips) {
          at.x = s.over.x + Math.sin(ms / 23) * TREMBLE;
          at.y = s.over.y + Math.cos(ms / 31) * TREMBLE;
        } else {
          const u = (ms - s.dips) / DIP_MS;
          at.x = s.over.x;
          at.y = lerp([s.over.y, s.worker.at.y], Math.sin(Math.PI * u));
        }
        return at;
      }
      return null;
    };

    const darting = createBeats(
      stops,
      (s) => s.leaves,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const dipping = createBeats(
      stops,
      (s) => s.dips + DIP_MS / 2,
      (s, k) => {
        cover!.promote(s.worker);
        if (s === last) {
          cover!.blast(s.worker.at);
          return;
        }
        cover!.burst(s.worker.at, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(DIP_SHAKE, k / Math.max(1, stops.length - 1)));
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
          darting.tick(ms, now);
          dipping.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(ctx, fly, ms, now, WISP_SIZE * FLY, 0.6, 0, endAt),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
