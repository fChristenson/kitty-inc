// the "Splat" event: it covers its crit, whose click freezes the screen while
// the wisp hurtles out of the distance straight at the viewer, swelling
// huge, and splats against the screen's glass in a blinding flash, a bang and
// a big shake, coins splashing out round the hit; it bounces back off into
// the distance and hurtles in again somewhere else, ever faster and harder;
// the last slams dead center in a huge blast, and the coins sweep into the
// total. Pays floor income × floor number × REWARD (see ../moneyCover)
import { CONFIG } from "../../config";
import { playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { between, clamp01, lerp, smoothstep } from "../../shared/easing";
import { ringTargets } from "../../shared/coinTargets";
import { createBeats } from "../../shared/eventBeats";

const KEY = "splat";
const REWARD = 4;
// hits before the last, each EDGE of the screen's width in from its edges
const HITS = 5;
const EDGE = 0.2;
// the wisp: FAR of the screen's width across in the distance, swelling to
// NEAR of it at each hit (growing), with this sharp a rush
const FAR = 0.02;
const NEAR: [number, number] = [0.3, 0.55];
const RUSH = 3;
// each splat: a burst, a bang, a big jolt and a splash of coins
const SPLAT_BURST: [number, number] = [0.9, 1.6];
const SPLAT_SHAKE: [number, number] = [1.2, 2.2];
const SPLAT_COINS: [number, number] = [5, 8];
const SPLASH: [number, number] = [60, 240];

export const forceSplatEvent = registerWispEvent(
  KEY,
  "Splat",
  () => CONFIG.splatEvent.chance,
  (floor, context, area) => {
    const { rushMs, holdMs, mergeMs } = CONFIG.splatEvent;
    const width = area.right - area.left;
    const edge = width * EDGE;
    const middle = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    // where each hits, the last dead center
    const hits: Point[] = Array.from({ length: HITS }, (_, k) =>
      k === HITS - 1
        ? middle
        : {
            x: between([area.left + edge, area.right - edge]),
            y: between([area.top + edge, area.bottom - edge]),
          },
    );
    const hitAt: number[] = [];
    let at = 0;
    for (let k = 0; k < HITS; k++) {
      at += lerp(rushMs, k / (HITS - 1));
      hitAt.push(at);
    }
    const blastAt = at;
    const segmentOf = (ms: number) => {
      for (let k = 0; k < HITS; k++)
        if (ms < hitAt[k]) {
          const from = k === 0 ? 0 : hitAt[k - 1];
          return { k, u: (ms - from) / (hitAt[k] - from) };
        }
      return { k: HITS - 1, u: 1 };
    };

    const point = { x: 0, y: 0 };
    // drifting from the last hit to the next while it bounces off and back
    const wispAt = (ms: number): Point | null => {
      if (ms < 0 || ms >= blastAt) return null;
      const { k, u } = segmentOf(ms);
      const a = k === 0 ? middle : hits[k - 1];
      const b = hits[k];
      const v = smoothstep(u);
      point.x = a.x + (b.x - a.x) * v;
      point.y = a.y + (b.y - a.y) * v;
      return point;
    };
    // huge against the glass at each hit, tiny in the distance in between
    const sizeAt = (ms: number) => {
      const { k, u } = segmentOf(ms);
      const near = width * lerp(NEAR, k / (HITS - 1));
      // the first only rushes in; the rest bounce off first
      const closeness = (k === 0 ? u : Math.abs(1 - 2 * u)) ** RUSH;
      return Math.max(WISP_SIZE * 0.5, lerp([width * FAR, near], closeness));
    };

    const beats = createBeats(
      hits,
      (_, k) => hitAt[k],
      (p, k) => splatted(p, k),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: blastAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => beats.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          const heat = clamp01(ms / blastAt);
          drawWispBetween(ctx, wispAt, ms, now, sizeAt(ms), heat, 0, blastAt);
        },
      },
    );
    if (!cover) return;

    function splatted(p: Point, k: number): void {
      if (k === HITS - 1) {
        cover!.blast(p);
        return;
      }
      const t = k / (HITS - 2);
      cover!.burst(p, lerp(SPLAT_BURST, t));
      cover!.launchFrom(
        p,
        ringTargets(p, Math.round(lerp(SPLAT_COINS, t)), SPLASH),
      );
      if (!cover!.isLive()) return;
      playExplosion();
      shakeScreen(lerp(SPLAT_SHAKE, t));
    }
  },
);
