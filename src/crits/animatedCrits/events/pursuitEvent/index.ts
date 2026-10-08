// the "Pursuit" event (wisp; free hires): it covers its crit, whose click
// freezes the screen while wisps flare up on the corners of a huge polygon
// round the screen's middle, each chasing the next, so the polygon of
// beams joining them whirls round and shrinks as they close in on each
// other along pursuit spirals, ever faster, every quarter turn a whoosh
// and a jolt; they meet dead in the middle in a bang and shake and burst
// back out, each flying onto an empty spot in view and landing as a new
// worker, the last in a huge blast. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "pursuit";
const MIN_CHASERS = 4;
const MAX_CHASERS = 6;
// the polygon's starting radius (of the screen's smaller side), and how
// close they get before they meet
const RADIUS = 0.42;
const MEET = 16;
// a true pursuit spiral winds cot(π/n) rad per e-fold it closes in; this
// winds it tighter so it whirls
const WIND = 2.4;
const SIZE = WISP_SIZE * 0.8;
const EDGE_W = 6;
const EDGE_ALPHA = 0.35;
const QUARTER = Math.PI / 2;
const BEND = 170;
const TURN_SHAKE: [number, number] = [0.25, 1.0];
const MEET_SHAKE = 1.6;
const HIRE_SHAKE = 1.0;

export const forcePursuitEvent = registerWispEvent(
  KEY,
  "Pursuit",
  () => CONFIG.pursuitEvent.chance,
  (floor, context, area) => {
    const { chaseMs, flyMs, holdMs, mergeMs } = CONFIG.pursuitEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_CHASERS);
    if (hires.length === 0) return;
    const n = Math.max(MIN_CHASERS, hires.length);
    const centre: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const r0 =
      Math.min(area.right - area.left, area.bottom - area.top) * RADIUS;
    const start = Math.random() * Math.PI * 2;
    const wind = WIND / Math.tan(Math.PI / n);
    const radiusAt = (ms: number) =>
      lerp([r0, MEET], easeIn(clamp01(ms / chaseMs)));
    const turnAt = (ms: number) => wind * Math.log(r0 / radiusAt(ms));
    const chase = (i: number, ms: number, into: Point): Point => {
      const r = radiusAt(ms);
      const a = start + (Math.PI * 2 * i) / n + turnAt(ms);
      into.x = centre.x + Math.cos(a) * r;
      into.y = centre.y + Math.sin(a) * r;
      return into;
    };
    // every quarter turn the polygon makes
    const total = turnAt(chaseMs);
    const quarters = Math.floor(total / QUARTER);
    const turns: number[] = [];
    for (let q = 1; q <= quarters; q++) {
      // turnAt rises with ms: find when it passes q quarters
      let lo = 0;
      let hi: number = chaseMs;
      for (let k = 0; k < 24; k++) {
        const mid = (lo + hi) / 2;
        if (turnAt(mid) < q * QUARTER) lo = mid;
        else hi = mid;
      }
      turns.push(hi);
    }
    const flights = Array.from({ length: n }, (_, i) => {
      const hire = hires[i % hires.length];
      const from = chase(i, chaseMs, { x: 0, y: 0 });
      const to: Point = { x: hire.x, y: hire.y - 40 };
      const departs = chaseMs + 90 + i * 40;
      return {
        hire,
        from,
        to,
        bend: { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - BEND },
        departs,
        arrives: departs + flyMs,
      };
    });
    const firstLanding = hires.map((h) =>
      Math.min(...flights.filter((f) => f.hire === h).map((f) => f.arrives)),
    );
    const lastHire = Math.max(...firstLanding);
    const endAt = Math.max(...flights.map((f) => f.arrives));
    const ats = flights.map((f, i) => {
      const spot: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms > f.arrives) return null;
        if (ms <= f.departs) return chase(i, Math.max(0, ms), spot);
        return bezier(
          f.from,
          f.bend,
          f.to,
          easeOut(clamp01((ms - f.departs) / flyMs)),
          spot,
        );
      };
    });
    const corners = Array.from({ length: n }, () => ({ x: 0, y: 0 }));

    const starting = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const turning = createBeats(
      turns,
      (ms) => ms,
      (_, q) => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(TURN_SHAKE, q / Math.max(1, turns.length - 1)));
      },
    );
    const meeting = createBeats(
      [chaseMs],
      (ms) => ms,
      () => {
        cover!.burst(centre, 1);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(MEET_SHAKE);
      },
    );
    const hiring = createBeats(
      hires,
      (_, i) => firstLanding[i],
      (h, i) => {
        giveHire(h);
        const at = { x: h.x, y: h.y - 40 };
        if (firstLanding[i] === lastHire) {
          cover!.blast(at);
          return;
        }
        cover!.burst(at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(HIRE_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          starting.tick(ms, now);
          turning.tick(ms, now);
          meeting.tick(ms, now);
          hiring.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now);
          if (ms < 0 || ms > endAt + 600) return;
          if (ms < chaseMs) {
            for (let i = 0; i < n; i++) chase(i, ms, corners[i]);
            const alpha = EDGE_ALPHA * easeOut(clamp01(ms / 200));
            for (let i = 0; i < n; i++)
              drawBeam(ctx, corners[i], corners[(i + 1) % n], EDGE_W, alpha);
          }
          for (let i = 0; i < n; i++)
            drawWispBetween(
              ctx,
              ats[i],
              ms,
              now,
              SIZE,
              clamp01(ms / chaseMs),
              0,
              flights[i].arrives,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
