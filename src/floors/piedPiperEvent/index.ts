// the "Pied Piper" event (wisp; worker perma tiers and a crit tier): it
// covers its crit, whose click freezes the screen while a wisp swirls out of
// the clicked floor's button and weaves past every worker in view; each one
// it passes lights up a perma tier with a flash and a bloop, and a little
// wisp springs off it and falls in behind, the train growing longer and
// faster; then the piper leads the whole train into the clicked floor's
// income bar, one after another, and as the last goes in it jumps a crit
// tier in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { alongRoute } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import {
  findRewardBars,
  findRewardWorkers,
  type RewardWorker,
} from "../eventRewards";

const KEY = "piedPiper";
const MAX_WORKERS = 6;
// each follower trails the one ahead by LAG ms
const LAG = 70;
const FOLLOWER = 0.6;
const PASS_SHAKE: [number, number] = [0.5, 1.2];

export const forcePiedPiperEvent = registerWispEvent(
  KEY,
  "Pied Piper",
  () => CONFIG.piedPiperEvent.chance,
  (floor, context) => {
    const { leadMs, holdMs, mergeMs } = CONFIG.piedPiperEvent;
    const own = findRewardBars(floor, context).find((b) => b.floor === floor);
    if (!own) return;
    const button = getButtonCenter(context.isGroundFloor);
    // nearest worker next, from the button
    const left = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (left.length === 0) return;
    const workers: RewardWorker[] = [];
    let here: Point = button;
    while (left.length) {
      let best = 0;
      for (let i = 1; i < left.length; i++)
        if (
          Math.hypot(left[i].at.x - here.x, left[i].at.y - here.y) <
          Math.hypot(left[best].at.x - here.x, left[best].at.y - here.y)
        )
          best = i;
      const next = left.splice(best, 1)[0];
      workers.push(next);
      here = next.at;
    }
    const route: Point[] = [button, ...workers.map((w) => w.at), own.center];
    const leg = leadMs / (route.length - 1);
    const head: Point = { x: 0, y: 0 };
    const lead = (ms: number, into: Point): Point =>
      alongRoute(route, clamp01(ms / leadMs), into);
    const piper = (ms: number): Point | null =>
      ms < 0 || ms > leadMs ? null : lead(ms, head);
    const followers = workers.map((worker, j) => {
      const passAt = (j + 1) * leg;
      const lag = (j + 1) * LAG;
      const point: Point = { x: 0, y: 0 };
      return {
        worker,
        passAt,
        inAt: leadMs + lag,
        at: (ms: number): Point | null => {
          if (ms < passAt || ms > leadMs + lag) return null;
          if (ms < passAt + lag) return worker.at;
          return lead(ms - lag, point);
        },
      };
    });
    const endAt = followers[followers.length - 1].inAt;

    const passing = createBeats(
      followers,
      (f) => f.passAt,
      (f, k) => {
        const t = k / Math.max(1, followers.length - 1);
        cover!.promote(f.worker);
        cover!.burst(f.worker.at, 0.4 + 0.4 * t);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(PASS_SHAKE, t));
      },
    );
    const entering = createBeats(
      followers,
      (f) => f.inAt,
      (_, k) => {
        if (k === followers.length - 1) {
          cover!.tierUp(own);
          cover!.slam(own);
          cover!.blast(own.center);
          return;
        }
        cover!.burst(own.center, 0.5);
        if (cover!.isLive()) playBloop();
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [own],
        workers,
        tick: (ms, now) => {
          passing.tick(ms, now);
          entering.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const heat = clamp01(ms / endAt);
          for (const f of followers)
            drawWispBetween(
              ctx,
              f.at,
              ms,
              now,
              WISP_SIZE * FOLLOWER,
              heat,
              f.passAt,
              f.inAt,
            );
          drawWispBetween(ctx, piper, ms, now, WISP_SIZE, heat, 0, leadMs);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    findRewardWorkers(floor, context).length > 0 &&
    findRewardBars(floor, context).some((b) => b.floor === floor),
);
