// the "Josephus" event (experiment: the Josephus problem; a free floor): it
// covers its crit, whose click freezes the screen while a ring of thirteen
// wisps flares up in the middle of the screen, linked by beams; a hunter
// wisp whips round the ring passing over one and blowing up the next, over
// one, blow up the next, round and round, ever faster, every pop a blast
// and a jolt, the ring closing up as it thins and the hunter swelling with
// every one it takes; the lone survivor, the one the puzzle says it will
// be, swallows the hunter, flares and rockets into the lock, blowing it
// open in a huge blast: the floor unlocked for free. Then the crit's tier
// pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWisp,
  drawWispBetween,
  drawWispHead,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import {
  clamp01,
  easeIn,
  easeOut,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import { drawDetonation } from "../../../../shared/explosion";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "josephus";
const COUNT = 13;
// the ring's radius as a share of the screen's shorter side
const RING = 0.34;
const RING_W = 5;
const RING_ALPHA = 0.4;
const MEMBER = WISP_SIZE * 0.6;
const HUNTER = WISP_SIZE * 0.55;
// the hunter swells by this share per wisp it takes
const SWELL = 0.07;
const POP_SIZE: [number, number] = [150, 230];
const POP_SHAKE: [number, number] = [0.45, 1.1];
const SOUND_GAP_MS = 60;
const FLY_LIFT = 260;

interface Hop {
  from: number;
  to: number;
  startsAt: number;
  endsAt: number;
  // the wisp it blows up on landing, or -1 when it passes over one
  kills: number;
}

export const forceJosephusEvent = registerWispEvent(
  KEY,
  "Josephus",
  () => CONFIG.josephusEvent.chance,
  (floor, context, area) => {
    const { growMs, hopMs, flyMs, holdMs, mergeMs } = CONFIG.josephusEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const centre: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const radius =
      RING * Math.min(area.right - area.left, area.bottom - area.top);
    // each member's angle round the ring (top first, clockwise)
    const spots: Point[] = Array.from({ length: COUNT }, (_, i) => {
      const a = -Math.PI / 2 + (i / COUNT) * Math.PI * 2;
      return {
        x: centre.x + Math.cos(a) * radius,
        y: centre.y + Math.sin(a) * radius,
      };
    });
    // play it out: from where the hunter is, the next one standing is
    // passed over and the one after it blown up
    const alive = Array.from({ length: COUNT }, (_, i) => i);
    const order: { from: number; to: number; kills: boolean }[] = [];
    let at = 0;
    while (alive.length > 1) {
      const i = alive.indexOf(at);
      const victim = alive[(i + 1) % alive.length];
      order.push({ from: at, to: victim, kills: true });
      alive.splice(alive.indexOf(victim), 1);
      const next = alive[(alive.indexOf(at) + 1) % alive.length];
      order.push({ from: victim, to: next, kills: false });
      at = next;
    }
    const survivor = alive[0];
    const hops: Hop[] = [];
    let clock: number = growMs;
    order.forEach((o, h) => {
      const ms = lerp(hopMs, h / (order.length - 1));
      hops.push({
        from: o.from,
        to: o.to,
        startsAt: clock,
        endsAt: clock + ms,
        kills: o.kills ? o.to : -1,
      });
      clock += ms;
    });
    const diesAt = new Array<number>(COUNT).fill(Infinity);
    for (const h of hops) if (h.kills >= 0) diesAt[h.kills] = h.endsAt;
    const caughtAt = clock;
    const flyAt = caughtAt + 120;
    const lockAt = flyAt + flyMs;
    const pops = hops.filter((h) => h.kills >= 0);
    const angleOf = (i: number) => -Math.PI / 2 + (i / COUNT) * Math.PI * 2;
    const hunterSpot: Point = { x: 0, y: 0 };
    const hunterAt = (ms: number): Point | null => {
      if (ms < growMs || ms > caughtAt) return null;
      const hop = hops.find((h) => ms < h.endsAt) ?? hops[hops.length - 1];
      const u = smoothstep(
        clamp01((ms - hop.startsAt) / (hop.endsAt - hop.startsAt)),
      );
      const a0 = angleOf(hop.from);
      let a1 = angleOf(hop.to);
      while (a1 <= a0) a1 += Math.PI * 2;
      const a = lerp([a0, a1], u);
      // it skims just inside the ring
      hunterSpot.x = centre.x + Math.cos(a) * radius * 0.86;
      hunterSpot.y = centre.y + Math.sin(a) * radius * 0.86;
      return hunterSpot;
    };
    const taken = (ms: number) => {
      let n = 0;
      for (const p of pops) if (p.endsAt <= ms) n++;
      return n;
    };
    const peak: Point = {
      x: (spots[survivor].x + lock.x) / 2,
      y: Math.min(spots[survivor].y, lock.y) - FLY_LIFT,
    };
    const winnerSpot: Point = { x: 0, y: 0 };
    const winnerAt = (ms: number): Point => {
      if (ms < flyAt) return spots[survivor];
      return bezier(
        spots[survivor],
        peak,
        lock,
        easeIn(clamp01((ms - flyAt) / flyMs)),
        winnerSpot,
      );
    };
    const memberAts = spots.map((p) => () => p);
    let soundAt = -Infinity;

    const opening = createBeats(
      [0, growMs],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const popping = createBeats(
      pops,
      (h) => h.endsAt,
      (h, k, now) => {
        cover!.burst(spots[h.kills], 0.5);
        if (!cover!.isLive()) return;
        if (now - soundAt >= SOUND_GAP_MS) {
          soundAt = now;
          playExplosion();
        }
        shakeScreen(lerp(POP_SHAKE, k / (pops.length - 1)));
      },
    );
    const flying = createBeats(
      [caughtAt, flyAt],
      (ms) => ms,
      (_, k) => {
        if (k === 0) {
          cover!.burst(spots[survivor], 0.9);
          if (cover!.isLive()) shakeScreen(POP_SHAKE[1]);
          return;
        }
        if (cover!.isLive()) playSwoosh();
      },
    );
    const unlocking = createBeats(
      [lockAt],
      (ms) => ms,
      () => cover!.blast(lock),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: lockAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        tick: (ms, now) => {
          opening.tick(ms, now);
          popping.tick(ms, now);
          flying.tick(ms, now);
          unlocking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > lockAt + 900) return;
          const grow = easeOut(clamp01(ms / growMs));
          // the ring's links between the wisps still standing
          if (ms < caughtAt) {
            let first = -1;
            let prev = -1;
            for (let i = 0; i < COUNT; i++) {
              if (ms >= diesAt[i]) continue;
              if (prev >= 0)
                drawBeam(ctx, spots[prev], spots[i], RING_W, RING_ALPHA * grow);
              else first = i;
              prev = i;
            }
            if (first >= 0 && prev !== first)
              drawBeam(
                ctx,
                spots[prev],
                spots[first],
                RING_W,
                RING_ALPHA * grow,
              );
          }
          for (let i = 0; i < COUNT; i++) {
            if (i === survivor || ms >= diesAt[i]) continue;
            // they heat up as the hunter closes in
            const heat = clamp01(1 - (diesAt[i] - ms) / 400);
            drawWispHead(ctx, memberAts[i], ms, now, MEMBER * grow, heat);
          }
          pops.forEach((p, k) =>
            drawDetonation(
              ctx,
              spots[p.kills],
              ms - p.endsAt,
              lerp(POP_SIZE, k / (pops.length - 1)),
              now,
            ),
          );
          const swell = 1 + SWELL * taken(ms);
          drawWispBetween(
            ctx,
            hunterAt,
            ms,
            now,
            HUNTER * swell,
            0.7,
            growMs,
            caughtAt,
          );
          if (ms < lockAt) {
            const big = ms < caughtAt ? 1 : 1 + SWELL * pops.length;
            drawWisp(
              ctx,
              winnerAt,
              ms,
              now,
              MEMBER * grow * big,
              ms < caughtAt ? 0 : 1,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
