// the "Musical Chairs" event (wisp; worker perma tiers and a crit tier): it
// covers its crit, whose click freezes the screen while a ring of wisps, one
// more than there are workers, bursts out of the clicked floor's button and
// races round the workers in view, hopping to the beat, ever faster; the
// music stops dead with a jolt and they scramble, each diving onto a worker
// that lights up a perma tier with a flash, a bloop and a jolt; the odd one
// out crashes into a worker already taken, bounces off and dives into the
// clicked floor's income bar, which jumps a crit tier in a huge blast and
// shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  between,
  clamp01,
  easeIn,
  easeOut,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, findRewardWorkers } from "../../eventRewards";

const KEY = "musicalChairs";
const MAX_WORKERS = 5;
// the ring runs PAD px outside the workers (at least MIN_R), EDGE px inside
// the screen, and goes round LAPS times
const PAD = 90;
const MIN_R = 130;
const EDGE = 50;
const LAPS = 1.8;
// the wisps fan out onto it over ENTER_MS and hop BOB px every BEAT_MS
const ENTER_MS = 260;
const BOB = 16;
const BEAT_MS = 180;
const STOP_MS = 150;
const SCRAMBLE: [number, number] = [0, 90];
// the odd one out bumps BUMP px back off the worker it hits
const BUMP = 70;
const BUMP_MS = 130;
const BUMP_LAG = 60;
const CHAIR = 0.75;
const BEAT_SHAKE = 0.3;
const TAKE_SHAKE: [number, number] = [0.6, 1.3];

export const forceMusicalChairsEvent = registerWispEvent(
  KEY,
  "Musical Chairs",
  () => CONFIG.musicalChairsEvent.chance,
  (floor, context, area) => {
    const { circleMs, dashMs, outMs, holdMs, mergeMs } =
      CONFIG.musicalChairsEvent;
    const own = findRewardBars(floor, context).find((b) => b.floor === floor);
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (!own || workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const cx = workers.reduce((s, w) => s + w.at.x, 0) / workers.length;
    const cy = workers.reduce((s, w) => s + w.at.y, 0) / workers.length;
    const rx = Math.min(
      Math.max(
        MIN_R,
        Math.max(...workers.map((w) => Math.abs(w.at.x - cx))) + PAD,
      ),
      (area.right - area.left) / 2 - EDGE,
    );
    const ry = Math.max(
      MIN_R,
      Math.max(...workers.map((w) => Math.abs(w.at.y - cy))) + PAD,
    );
    const count = workers.length + 1;
    const lap = (ms: number) => {
      const u = clamp01(ms / circleMs);
      return Math.PI * 2 * LAPS * (0.35 * u + 0.65 * u * u);
    };
    // bobbing to the beat, stilled just before the music stops
    const bob = (ms: number) =>
      BOB *
      Math.abs(Math.sin((ms * Math.PI) / BEAT_MS)) *
      (1 - smoothstep(clamp01((ms - circleMs + 120) / 120)));
    const onRing = (j: number, ms: number, into: Point): Point => {
      const a = (j / count) * Math.PI * 2 + lap(ms);
      into.x = cx + rx * Math.cos(a);
      into.y = cy + ry * Math.sin(a) - bob(ms);
      return into;
    };
    const ring = (j: number, ms: number, into: Point): Point => {
      onRing(j, Math.min(ms, circleMs), into);
      if (ms < ENTER_MS) {
        const u = easeOut(ms / ENTER_MS);
        into.x = lerp([button.x, into.x], u);
        into.y = lerp([button.y, into.y], u);
      }
      return into;
    };
    const stops = Array.from({ length: count }, (_, j) =>
      onRing(j, circleMs, { x: 0, y: 0 }),
    );
    // each worker grabs the nearest wisp still free; one is left over
    const free = stops.map((_, j) => j);
    const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
    const scrambleAt = circleMs + STOP_MS;
    const seats = workers.map((worker) => {
      let best = 0;
      for (let i = 1; i < free.length; i++)
        if (
          dist(stops[free[i]], worker.at) < dist(stops[free[best]], worker.at)
        )
          best = i;
      const j = free.splice(best, 1)[0];
      const leaves = scrambleAt + between(SCRAMBLE);
      return { worker, j, leaves, arrives: leaves + dashMs };
    });
    const odd = free[0];
    let taken = seats[0];
    for (const seat of seats)
      if (dist(stops[odd], seat.worker.at) < dist(stops[odd], taken.worker.at))
        taken = seat;
    const oddStop = stops[odd];
    const bumpAt = taken.arrives + BUMP_LAG;
    const oddLeaves = bumpAt - dashMs;
    const away =
      Math.hypot(
        oddStop.x - taken.worker.at.x,
        oddStop.y - taken.worker.at.y,
      ) || 1;
    const bounced: Point = {
      x: taken.worker.at.x + ((oddStop.x - taken.worker.at.x) / away) * BUMP,
      y: taken.worker.at.y + ((oddStop.y - taken.worker.at.y) / away) * BUMP,
    };
    const endAt = bumpAt + BUMP_MS + outMs;

    const point = (from: Point, to: Point, u: number, into: Point): Point => {
      into.x = lerp([from.x, to.x], u);
      into.y = lerp([from.y, to.y], u);
      return into;
    };
    const wisps = seats.map((seat) => {
      const at: Point = { x: 0, y: 0 };
      return {
        to: seat.arrives,
        at: (ms: number): Point | null => {
          if (ms < 0 || ms > seat.arrives) return null;
          if (ms < seat.leaves) return ring(seat.j, ms, at);
          const u = easeIn((ms - seat.leaves) / dashMs);
          return point(stops[seat.j], seat.worker.at, u, at);
        },
      };
    });
    const oddAt: Point = { x: 0, y: 0 };
    wisps.push({
      to: endAt,
      at: (ms: number): Point | null => {
        if (ms < 0 || ms > endAt) return null;
        if (ms < oddLeaves) return ring(odd, ms, oddAt);
        if (ms < bumpAt)
          return point(
            oddStop,
            taken.worker.at,
            easeIn((ms - oddLeaves) / dashMs),
            oddAt,
          );
        if (ms < bumpAt + BUMP_MS)
          return point(
            taken.worker.at,
            bounced,
            easeOut((ms - bumpAt) / BUMP_MS),
            oddAt,
          );
        return point(
          bounced,
          own.center,
          easeIn((ms - bumpAt - BUMP_MS) / outMs),
          oddAt,
        );
      },
    });

    const beats = Array.from(
      { length: Math.floor((circleMs - 120) / BEAT_MS) },
      (_, i) => (i + 1) * BEAT_MS,
    );
    const hopping = createBeats(
      beats,
      (ms) => ms,
      () => {
        if (!cover?.isLive()) return;
        playBloop();
        shakeScreen(BEAT_SHAKE);
      },
    );
    const stopping = createBeats(
      [circleMs],
      (ms) => ms,
      () => {
        for (const stop of stops) cover!.burst(stop, 0.35);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(1);
      },
    );
    const sitting = createBeats(
      seats,
      (s) => s.arrives,
      (s, k) => {
        const t = k / Math.max(1, seats.length - 1);
        cover!.promote(s.worker);
        cover!.burst(s.worker.at, 0.5 + 0.3 * t);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(TAKE_SHAKE, t));
      },
    );
    const bumping = createBeats(
      [bumpAt],
      (ms) => ms,
      () => {
        cover!.burst(taken.worker.at, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(1.2);
      },
    );
    const finishing = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        cover!.tierUp(own, bounced);
        cover!.slam(own);
        cover!.blast(own.center);
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
          hopping.tick(ms, now);
          stopping.tick(ms, now);
          sitting.tick(ms, now);
          bumping.tick(ms, now);
          finishing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const heat = clamp01(ms / endAt);
          for (const wisp of wisps)
            drawWispBetween(
              ctx,
              wisp.at,
              ms,
              now,
              WISP_SIZE * CHAIR,
              heat,
              0,
              wisp.to,
            );
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
