// the "Hide and Seek" event (wisp; worker perma tiers): it covers its crit,
// whose click freezes the screen while a flurry of little wisps bursts out
// of the clicked floor's button and scatters, each ducking behind a worker
// in view, its glow peeking out round them; a big seeker wisp counts down
// on the button, three throbbing beats, then hunts them down, darting from
// hiding spot to hiding spot, ever faster; every one it finds bursts out
// with a flash, a pop and a jolt and its worker lights up a perma tier; the
// last find is a huge blast and shake. Then the crit's tier pays out
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
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "hideAndSeek";
const MAX_WORKERS = 5;
// a hider peeks PEEK px out to one side of its worker, bobbing BOB px
const PEEK = 26;
const BOB = 6;
const HIDER = 0.4;
// it scatters on a LOFT px arc
const LOFT = 90;
// the seeker throbs COUNT times on the button, swelling THROB of its size
const COUNT = 3;
const THROB = 0.35;
const SEEKER = 1;
// it stops SHORT px short of each hider
const SHORT = 20;
const FIND_SHAKE: [number, number] = [0.6, 1.4];

export const forceHideAndSeekEvent = registerWispEvent(
  KEY,
  "Hide and Seek",
  () => CONFIG.hideAndSeekEvent.chance,
  (floor, context) => {
    const { hideMs, countMs, dashesMs, holdMs, mergeMs } =
      CONFIG.hideAndSeekEvent;
    const left = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (left.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    // nearest worker next, from the button
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
    const seekAt = hideMs + countMs;
    let clock: number = seekAt;
    const hiders = workers.map((worker, k) => {
      const side = Math.random() < 0.5 ? -1 : 1;
      const spot: Point = { x: worker.at.x + side * PEEK, y: worker.at.y };
      const from = clock;
      clock += lerp(dashesMs, k / Math.max(1, workers.length - 1));
      const foundAt = clock;
      const arc: Point = {
        x: (button.x + spot.x) / 2,
        y: Math.min(button.y, spot.y) - LOFT,
      };
      const at: Point = { x: 0, y: 0 };
      return {
        worker,
        spot,
        leaves: from,
        foundAt,
        at: (ms: number): Point | null => {
          if (ms < 0 || ms > foundAt) return null;
          if (ms < hideMs)
            return bezier(button, arc, spot, easeOut(ms / hideMs), at);
          at.x = spot.x;
          at.y = spot.y + Math.sin(ms * 0.012 + k) * BOB;
          return at;
        },
      };
    });
    const endAt = hiders[hiders.length - 1].foundAt;
    const seekerAt: Point = { x: 0, y: 0 };
    // it darts in to stop SHORT of each hider as the last dash ends
    const stop = (k: number): Point => {
      const h = hiders[k];
      const from = k === 0 ? button : hiders[k - 1].spot;
      const dx = h.spot.x - from.x;
      const dy = h.spot.y - from.y;
      const d = Math.hypot(dx, dy) || 1;
      return { x: h.spot.x - (dx / d) * SHORT, y: h.spot.y - (dy / d) * SHORT };
    };
    const stops = hiders.map((_, k) => stop(k));
    const seeker = (ms: number): Point | null => {
      if (ms < hideMs || ms > endAt) return null;
      let k = 0;
      while (k < hiders.length - 1 && ms >= hiders[k].foundAt) k++;
      const from = k === 0 ? button : stops[k - 1];
      const h = hiders[k];
      const u = smoothstep(clamp01((ms - h.leaves) / (h.foundAt - h.leaves)));
      seekerAt.x = lerp([from.x, stops[k].x], u);
      seekerAt.y = lerp([from.y, stops[k].y], u);
      return seekerAt;
    };
    const throb = (ms: number) => {
      const u = (ms - hideMs) / countMs;
      if (u < 0 || u >= 1) return 0;
      return Math.abs(Math.sin(u * COUNT * Math.PI));
    };

    const counts = Array.from(
      { length: COUNT },
      (_, i) => hideMs + ((i + 0.5) / COUNT) * countMs,
    );
    const counting = createBeats(
      counts,
      (ms) => ms,
      (_, k) => {
        if (!cover?.isLive()) return;
        playBloop();
        shakeScreen(0.4 + 0.3 * k);
      },
    );
    const finding = createBeats(
      hiders,
      (h) => h.foundAt,
      (h, k) => {
        const t = k / Math.max(1, hiders.length - 1);
        cover!.promote(h.worker);
        if (k === hiders.length - 1) {
          cover!.blast(h.spot);
          return;
        }
        cover!.burst(h.spot, 0.5 + 0.4 * t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(FIND_SHAKE, t));
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
          counting.tick(ms, now);
          finding.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          for (const h of hiders)
            drawWispBetween(
              ctx,
              h.at,
              ms,
              now,
              WISP_SIZE * HIDER,
              0.4,
              0,
              h.foundAt,
            );
          drawWispBetween(
            ctx,
            seeker,
            ms,
            now,
            WISP_SIZE * SEEKER * (1 + THROB * throb(ms)),
            clamp01(ms / endAt),
            hideMs,
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
