// the "Lévy Flight" event (wisp; free hires): it covers its crit, whose click
// freezes the screen while a forager wisp darts off the clicked floor's
// button the way animals hunt: a flurry of tiny skittering hops, then a
// sudden long dash clean across the screen, another flurry, another dash;
// every dash is a whoosh and a jolt and lands it on an empty spot in view,
// where its flurry of hops roots out a new worker in a flash; the last
// hire lands in a huge blast. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWisp, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp, smoothstep } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawRewardHires, findRewardHires, giveHire } from "../eventRewards";

const KEY = "levyFlight";
const MAX_HIRES = 5;
// the hops in a flurry, how far each skitters (px), and a dash's bow
const HOPS = 4;
const HOP: [number, number] = [25, 90];
const BOW = 0.25;
const SIZE = WISP_SIZE * 0.85;
const DASH_SHAKE: [number, number] = [0.4, 1.0];
const HIRE_SHAKE = 0.9;

interface Leg {
  from: Point;
  to: Point;
  bend: Point;
  starts: number;
  ends: number;
  dash: boolean;
}

export const forceLevyFlightEvent = registerWispEvent(
  KEY,
  "Lévy Flight",
  () => CONFIG.levyFlightEvent.chance,
  (floor, context) => {
    const { hopMs, dashMs, holdMs, mergeMs } = CONFIG.levyFlightEvent;
    const found = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (found.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    // the spots in the order it forages them: the farthest next, for long dashes
    const order: typeof found = [];
    let at: Point = button;
    const left = [...found];
    while (left.length > 0) {
      left.sort(
        (a, b) =>
          Math.hypot(b.x - at.x, b.y - at.y) -
          Math.hypot(a.x - at.x, a.y - at.y),
      );
      const next = left.shift()!;
      order.push(next);
      at = { x: next.x, y: next.y };
    }
    const legs: Leg[] = [];
    let clock: number = 0;
    let here: Point = button;
    const hop = (to: Point, ms: number, dash: boolean) => {
      const dx = to.x - here.x;
      const dy = to.y - here.y;
      legs.push({
        from: here,
        to,
        bend: {
          x: (here.x + to.x) / 2 - dy * (dash ? BOW : 0.4),
          y: (here.y + to.y) / 2 + dx * (dash ? BOW : 0.4),
        },
        starts: clock,
        ends: clock + ms,
        dash,
      });
      clock += ms;
      here = to;
    };
    // a flurry of skittering hops round where it is
    const flurry = (round: Point) => {
      for (let h = 0; h < HOPS; h++) {
        const a = Math.random() * Math.PI * 2;
        const r = lerp(HOP, Math.random());
        hop(
          { x: round.x + Math.cos(a) * r, y: round.y + Math.sin(a) * r },
          hopMs,
          false,
        );
      }
    };
    const dashes: number[] = [];
    const hiresAt: number[] = [];
    flurry(button);
    order.forEach((h, k) => {
      const spot = { x: h.x, y: h.y - 40 };
      dashes.push(clock);
      hop(spot, lerp(dashMs, k / Math.max(1, order.length - 1)), true);
      flurry(spot);
      hop(spot, hopMs, false);
      hiresAt.push(clock);
    });
    const endAt = clock;
    const spot: Point = { x: 0, y: 0 };
    const wispAt = (ms: number): Point => {
      const t = Math.max(0, ms);
      const leg = legs.find((l) => t < l.ends) ?? legs[legs.length - 1];
      const u = clamp01((t - leg.starts) / (leg.ends - leg.starts));
      const e = leg.dash ? smoothstep(u) : u;
      const v = 1 - e;
      spot.x = v * v * leg.from.x + 2 * v * e * leg.bend.x + e * e * leg.to.x;
      spot.y = v * v * leg.from.y + 2 * v * e * leg.bend.y + e * e * leg.to.y;
      return spot;
    };

    const dashing = createBeats(
      dashes,
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(DASH_SHAKE, k / Math.max(1, dashes.length - 1)));
      },
    );
    const hiring = createBeats(
      hiresAt,
      (ms) => ms,
      (_, k) => {
        const h = order[k];
        giveHire(h);
        const at = { x: h.x, y: h.y - 40 };
        if (k === order.length - 1) {
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
          dashing.tick(ms, now);
          hiring.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, order, now);
          if (ms < 0 || ms > endAt) return;
          drawWisp(ctx, wispAt, ms, now, SIZE, 0.6);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
