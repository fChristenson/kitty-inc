// the "Haunt" event (wisp; worker perma tiers): it covers its crit, whose
// click freezes the screen while a ghostly wisp swoops out of the clicked
// floor's button and goes haunting: it dives straight through a worker, in
// one side and out the other, loops back round in a wide swoop and passes
// through the next, every pass a chill flash, a whoosh and a jolt as the
// worker climbs a perma tier; it swoops ever faster, the last pass a huge
// blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { alongRoute } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { findRewardWorkers } from "../eventRewards";

const KEY = "haunt";
const MAX_WORKERS = 6;
// after each worker it swings out SWOOP px before turning back
const SWOOP = 150;
// time runs u ** PACE along the route, so it quickens
const PACE = 1.35;
const GHOST = 0.6;
const PASS_SHAKE: [number, number] = [0.5, 1.3];

export const forceHauntEvent = registerWispEvent(
  KEY,
  "Haunt",
  () => CONFIG.hauntEvent.chance,
  (floor, context, area) => {
    const { hauntMs, holdMs, mergeMs } = CONFIG.hauntEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const cx = (area.left + area.right) / 2;
    const route: Point[] = [button];
    const passIndex: number[] = [];
    let prev: Point = button;
    for (const w of workers) {
      route.push(w.at);
      passIndex.push(route.length - 1);
      // carry on through and out the far side, then swoop back
      const dx = w.at.x - prev.x;
      const dy = w.at.y - prev.y;
      const d = Math.hypot(dx, dy) || 1;
      route.push({
        x: Math.min(
          area.right - 40,
          Math.max(
            area.left + 40,
            w.at.x + (dx / d) * SWOOP + (w.at.x < cx ? -40 : 40),
          ),
        ),
        y: w.at.y + (dy / d) * SWOOP * 0.6 - 60,
      });
      prev = w.at;
    }
    const last = route.length - 1;
    const timeOf = (i: number) => hauntMs * (i / last) ** (1 / PACE);
    const passes = workers.map((worker, k) => ({
      worker,
      ms: timeOf(passIndex[k]),
    }));
    const lastPass = passes[passes.length - 1];
    const endAt = lastPass.ms;
    const ghostAt: Point = { x: 0, y: 0 };
    const ghost = (ms: number): Point =>
      alongRoute(route, clamp01(ms / hauntMs) ** PACE, ghostAt);

    const passing = createBeats(
      passes,
      (p) => p.ms,
      (p, k) => {
        cover!.promote(p.worker);
        if (p === lastPass) {
          cover!.blast(p.worker.at);
          return;
        }
        cover!.burst(p.worker.at, 0.5);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(PASS_SHAKE, k / Math.max(1, passes.length - 1)));
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
        tick: (ms, now) => passing.tick(ms, now),
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            ghost,
            ms,
            now,
            WISP_SIZE * GHOST,
            0.3,
            0,
            endAt,
          ),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
