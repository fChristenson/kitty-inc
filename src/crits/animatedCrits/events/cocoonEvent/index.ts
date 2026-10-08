// the "Cocoon" event (money; free hires and cash): it covers its crit, whose
// click freezes the screen while rivers of cash pour in from both sides of
// the screen onto an empty spot on every floor in view with room, winding up
// round each into a tall whirling cocoon of cash as the screen rumbles; one
// after another the cocoons burst in a flash, a bang and a jolt, flinging
// their cash outward, and a new worker stands in each; the last bursts in a
// huge blast and shake, and the cash sweeps into the total. Pays floor income
// × floor number × REWARD, plus the hires
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";
import { WORKER_HEIGHT } from "../../../../floors/worker";
import type { Point } from "../../../../shared/wisp";

const KEY = "cocoon";
const REWARD = 2;
const MAX_HIRES = 3;
const COINS = 1_500;
const COIN = 0.6;
// each cocoon whirls RADIUS px round, WORKER_HEIGHT * TALL high, at SPIN rad/ms
const RADIUS: [number, number] = [70, 30];
const TALL = 1.1;
const SPIN = 0.012;
const FLING: [number, number] = [120, 300];
const FORM_MS = 280;
const RUMBLE_MS = 70;
const RUMBLE: [number, number] = [0.3, 1.1];
const BURST_SHAKE: [number, number] = [1.1, 1.8];

export const forceCocoonEvent = registerWispEvent(
  KEY,
  "Cocoon",
  () => CONFIG.cocoonEvent.chance,
  (floor, context, area) => {
    const { streamMs, flyMs, gapMs, flingMs, holdMs, mergeMs } =
      CONFIG.cocoonEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const spots: Point[] = hires.map((h) => ({ x: h.x, y: h.y }));
    const bursts = hires.map((_, k) => streamMs + flyMs + k * gapMs);
    const lastBurst = bursts[bursts.length - 1];
    const endAt = lastBurst + flingMs;

    const paths: CoinPath[] = Array.from({ length: COINS }, (_, i) => {
      const k = i % hires.length;
      const spot = spots[k];
      const leaves = (i / COINS) * streamMs;
      const arrives = leaves + flyMs;
      const burstAt = bursts[k];
      const side = i % 2 === 0 ? -1 : 1;
      const start: Point = {
        x: side < 0 ? area.left - 40 : area.right + 40,
        y: spot.y + (Math.random() - 0.5) * 300,
      };
      const rise = (Math.random() - 0.5) * WORKER_HEIGHT * TALL;
      const phase = Math.random() * Math.PI * 2;
      const fling = Math.random() * Math.PI * 2;
      const reach = lerp(FLING, Math.random());
      const bend: Point = { x: (start.x + spot.x) / 2, y: spot.y - 260 };
      const entry: Point = { x: 0, y: 0 };
      const at: Point = { x: 0, y: 0 };
      // its place in the whirl, ms in
      const whirl = (ms: number, into: Point): Point => {
        const tight = clamp01((ms - arrives) / (burstAt - arrives));
        const r = lerp(RADIUS, tight);
        const a = phase + side * ms * SPIN * (1 + tight);
        into.x = spot.x + Math.cos(a) * r;
        into.y = spot.y + rise + Math.sin(a) * r * 0.25;
        return into;
      };
      return (f) => {
        const ms = f * endAt;
        if (ms < leaves) return { x: start.x, y: start.y, scale: 0 };
        if (ms < arrives) {
          whirl(arrives, entry);
          bezier(start, bend, entry, easeIn((ms - leaves) / flyMs), at);
          return { x: at.x, y: at.y, scale: COIN };
        }
        if (ms < burstAt) {
          whirl(ms, at);
          return { x: at.x, y: at.y, scale: COIN };
        }
        whirl(burstAt, entry);
        const u = easeOut(clamp01((ms - burstAt) / flingMs));
        return {
          x: entry.x + Math.cos(fling) * reach * u,
          y: entry.y + Math.sin(fling) * reach * u,
          scale: COIN,
        };
      };
    });

    let lastRumble = -Infinity;
    const bursting = createBeats(
      bursts,
      (ms) => ms,
      (_, k) => {
        const t = k / Math.max(1, hires.length - 1);
        giveHire(hires[k]);
        if (k === hires.length - 1) {
          cover!.blast(spots[k]);
          return;
        }
        cover!.burst(spots[k], 1);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BURST_SHAKE, t));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        tick: (ms, now) => {
          bursting.tick(ms, now);
          if (
            ms < lastBurst &&
            now - lastRumble >= RUMBLE_MS &&
            cover?.isLive()
          ) {
            lastRumble = now;
            shakeScreen(lerp(RUMBLE, clamp01(ms / lastBurst)));
          }
        },
        drawOver: (ctx, _ms, now) => drawRewardHires(ctx, hires, now, FORM_MS),
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
