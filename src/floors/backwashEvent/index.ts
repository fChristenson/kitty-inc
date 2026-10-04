// the "Backwash" event (clutter; a free floor): it covers its crit, whose
// click freezes the screen while glitter rains down all over the screen
// below the locked floor, landing in wavy rows; then an invisible tide
// surges up the screen, again and again, each surge reaching higher and
// carrying the glitter up on its front into a glittering strandline that
// slides back a little in the backwash; the last surge sweeps it all
// together into a heap under the lock, which bursts open in a huge blast
// and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { COLOR } from "../../palette";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { stampGlimmer } from "../../shared/twinkle";
import { heapSpots, scatterWaves, simulateClean } from "../../shared/clutter";
import { findRewardLocked } from "../eventRewards";
import { FLOOR_H, FLOOR_W } from "../constants";

const KEY = "backwash";
const BITS = 300;
const BIT = 10;
const MARGIN = 40;
// the mess stays this far under the lock
const BELOW = 150;
// how far up the mess each surge reaches, as shares of its height
const REACH = [0.4, 0.7, 0.95];
// a loose bit under a steady push a settles at about TERMINAL * a px/ms
const TERMINAL = 72;
// how much faster than its front a surge carries a bit, and how hard the
// backwash drags it back
const CARRY = 1.4;
const BACK = 0.3;
// the gather's pull eases off within this many px of the lock's foot
const EASE_IN = 80;
const HEAP_W = 130;
const HEAP_H = 60;
const SETTLE_MS = 140;
const BURST_MS = 120;
const FADE_MS = 140;
const SURGE_SHAKE: [number, number] = [0.5, 1.0];
const GATHER_SHAKE = 1.1;
const SETTLE_SHAKE = 0.8;

export const forceBackwashEvent = registerWispEvent(
  KEY,
  "Backwash",
  () => CONFIG.backwashEvent.chance,
  (floor, context, area) => {
    const { rainMs, surgeMs, backMs, gatherMs, holdMs, mergeMs } =
      CONFIG.backwashEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const box = {
      left: area.left + MARGIN,
      top: Math.min(
        area.bottom - 200,
        Math.max(area.top + MARGIN, lock.y + BELOW),
      ),
      right: area.right - MARGIN,
      bottom: area.bottom - MARGIN,
    };
    const height = box.bottom - box.top;
    const spots = scatterWaves(box, BITS);
    const drops = spots.map(() => Math.random() * rainMs * 0.5);
    const foot: Point = { x: lock.x, y: box.top - HEAP_H * 0.2 };

    const surges = REACH.map((share, k) => {
      const starts = rainMs + k * (surgeMs + backMs);
      const to = box.bottom - height * share;
      return {
        starts,
        crests: starts + surgeMs,
        to,
        push: (CARRY * (area.bottom + 40 - to)) / surgeMs / TERMINAL,
      };
    });
    const gatherAt = surges[surges.length - 1].crests + backMs;
    const gathered = gatherAt + gatherMs;
    const farthest = Math.max(
      ...spots.map((s) => Math.hypot(s.x - foot.x, s.y - foot.y)),
    );
    const gatherPush = (CARRY * farthest) / gatherMs / TERMINAL;
    const front = (s: (typeof surges)[number], ms: number) =>
      lerp(
        [area.bottom + 40, s.to],
        easeOut(clamp01((ms - s.starts) / surgeMs)),
      );

    const swept = simulateClean(
      spots,
      [
        {
          kind: "force",
          push: (x, y, ms, into) => {
            if (ms >= gatherAt) {
              const dx = foot.x - x;
              const dy = foot.y - y;
              const d = Math.hypot(dx, dy) || 1;
              const a = gatherPush * Math.min(1, d / EASE_IN);
              into.x = (dx / d) * a;
              into.y = (dy / d) * a;
              return into;
            }
            for (const s of surges) {
              if (ms < s.starts) return null;
              if (ms < s.crests) {
                if (y < front(s, ms)) return null;
                into.x = 0;
                into.y = -s.push;
                return into;
              }
              if (ms < s.crests + backMs) {
                // only what the surge reached slides back
                if (y < s.to - BIT * 4) return null;
                into.x = 0;
                into.y = s.push * BACK;
                return into;
              }
            }
            return null;
          },
        },
      ],
      rainMs,
      gathered,
    );
    const heap = heapSpots(foot, BITS, HEAP_W, HEAP_H);
    const settled = gathered + SETTLE_MS;
    const burstAt = settled + BURST_MS;
    const endAt = burstAt + FADE_MS;

    const surging = createBeats(
      surges,
      (s) => s.starts,
      (_, k) => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(SURGE_SHAKE, k / (surges.length - 1)));
      },
    );
    const gathering = createBeats(
      [gatherAt],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(GATHER_SHAKE);
      },
    );
    const settling = createBeats(
      [settled],
      (ms) => ms,
      () => {
        cover!.burst(foot, 0.6);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(SETTLE_SHAKE);
      },
    );
    const bursting = createBeats(
      [burstAt],
      (ms) => ms,
      () => cover!.blast(lock),
    );

    const bit: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        tick: (ms, now) => {
          surging.tick(ms, now);
          gathering.tick(ms, now);
          settling.tick(ms, now);
          bursting.tick(ms, now);
        },
        drawOver: (ctx, ms) => {
          if (ms < 0 || ms > endAt) return;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = 1 - clamp01((ms - burstAt) / FADE_MS);
          const settle = easeOut(clamp01((ms - gathered) / SETTLE_MS));
          const shove = easeIn(clamp01((ms - settled) / BURST_MS));
          for (let i = 0; i < BITS; i++) {
            if (ms < drops[i]) continue;
            if (ms < rainMs) {
              const u = easeIn(clamp01((ms - drops[i]) / (rainMs * 0.5)));
              bit.x = spots[i].x;
              bit.y = lerp([area.top - 30, spots[i].y], u);
            } else if (ms < gathered) {
              swept.at(i, ms, bit);
            } else {
              const end = swept.end(i);
              bit.x = lerp([lerp([end.x, heap[i].x], settle), lock.x], shove);
              bit.y = lerp([lerp([end.y, heap[i].y], settle), lock.y], shove);
            }
            stampGlimmer(
              ctx,
              bit.x,
              bit.y,
              BIT,
              i * 0.9 + ms * 0.003,
              i % 3 === 0 ? COLOR.white : COLOR.heavenlyGold,
            );
          }
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
