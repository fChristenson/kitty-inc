// the "Canal Locks" event (money; free upgrade levels and cash): it covers
// its crit, whose click freezes the screen while a river of cash floods in
// off the bottom of the screen into a flight of lock chambers climbing up
// beside the income bars, bottom bar first; each chamber churns full into a
// rising pool of coins, then its gate bursts with a splash, a bang and a
// jolt as the bar beside it lands free levels, and the river surges up into
// the next chamber, every surge faster; the top lock bursts over its bar in
// a huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { ringTargets } from "../../../../shared/coinTargets";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  type Pour,
} from "../../cashFlow";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "canalLocks";
const REWARD = 2;
const MAX_LOCKS = 4;
const POOL = 900;
const COIN = 0.42;
// each lock is LOCK_W px wide and LOCK_H tall, GAP px right of its bar, the
// flight stepping STEP px further right each lock up
const LOCK_W = 170;
const LOCK_H = 130;
const GAP = 110;
const STEP = 60;
const EDGE = 100;
// the pool rises from LEVEL of the lock's height to brimming
const LEVEL: [number, number] = [0.12, 1];
const RISE_MS = 320;
const SURGE_ARC = 80;
const SPRAY_STAGGER = 80;
const SPRAY_MS = 380;
const SPRAY_LIFT = 160;
const SPLASH = 16;
const SPLASH_REACH: [number, number] = [30, 120];
const BURST_SHAKE: [number, number] = [0.6, 1.4];

export const forceCanalLocksEvent = registerWispEvent(
  KEY,
  "Canal Locks",
  () => CONFIG.canalLocksEvent.chance,
  (floor, context, area) => {
    const { locksMs, holdMs, mergeMs } = CONFIG.canalLocksEvent;
    const bars = findRewardBars(floor, context).slice(-MAX_LOCKS).reverse();
    if (bars.length === 0) return;
    const n = bars.length;
    let clock = 0;
    const locks = bars.map((bar, k) => {
      const cx = Math.min(
        area.right - EDGE,
        bar.box.x + bar.box.width + GAP + k * STEP,
      );
      const floorY = bar.center.y + LOCK_H / 2;
      const span = lerp(locksMs, k / Math.max(1, n - 1));
      const opens = clock;
      clock += span;
      return {
        bar,
        cx,
        floorY,
        span,
        opens,
        bursts: clock,
        gate: { x: cx, y: floorY - LOCK_H } as Point,
      };
    });
    const first = locks[0];
    const last = locks[n - 1];
    const endAt = last.bursts + SPRAY_STAGGER + SPRAY_MS;
    const source: Point = { x: first.cx, y: area.bottom + 40 };

    // where a coin sits in lock k's churning pool at ms
    const spot = (k: number, w: number, d: number, i: number, ms: number) => {
      const lock = locks[k];
      const level = lerp(LEVEL, clamp01((ms - lock.opens) / (lock.span * 0.8)));
      return {
        x: lock.cx + w * LOCK_W + Math.sin(ms / 70 + i) * 4,
        y:
          lock.floorY -
          d * LOCK_H * level -
          Math.abs(Math.sin(ms / 90 + i * 1.7)) * 6,
      };
    };
    const paths: CoinPath[] = Array.from({ length: POOL }, (_, i) => {
      const w = Math.random() - 0.5;
      const d = Math.random();
      const u = Math.random();
      const fly = locks.map((lock, k) =>
        k === 0 ? RISE_MS : lock.span * 0.35,
      );
      const arrive = locks.map((lock, k) =>
        k === 0
          ? u * lock.span * 0.7
          : lock.opens + lock.span * (0.35 + 0.35 * u),
      );
      const start: Point = { x: source.x + w * 60, y: source.y };
      const sprays = last.bursts + u * SPRAY_STAGGER;
      const sprayTo: Point = {
        x: last.bar.box.x + Math.random() * last.bar.box.width,
        y:
          last.bar.center.y + (Math.random() - 0.5) * last.bar.box.height * 1.4,
      };
      const lift: Point = { x: 0, y: 0 };
      const into: Point = { x: 0, y: 0 };
      return (f) => {
        const ms = f * endAt;
        if (ms < arrive[0] - fly[0])
          return { x: start.x, y: start.y, scale: 0 };
        if (ms >= sprays) {
          const from = spot(n - 1, w, d, i, sprays);
          lift.x = (from.x + sprayTo.x) / 2;
          lift.y = Math.min(from.y, sprayTo.y) - SPRAY_LIFT;
          bezier(
            from,
            lift,
            sprayTo,
            easeOut(clamp01((ms - sprays) / SPRAY_MS)),
            into,
          );
          return { x: into.x, y: into.y, scale: COIN };
        }
        let k = 0;
        while (k < n - 1 && ms >= arrive[k + 1] - fly[k + 1]) k++;
        const here = spot(k, w, d, i, ms);
        if (ms >= arrive[k]) return { x: here.x, y: here.y, scale: COIN };
        const leaves = arrive[k] - fly[k];
        const from = k === 0 ? start : spot(k - 1, w, d, i, leaves);
        const e = easeOut(clamp01((ms - leaves) / fly[k]));
        return {
          x: lerp([from.x, here.x], e),
          y:
            lerp([from.y, here.y], e) -
            (k === 0 ? 0 : Math.sin(Math.PI * e) * SURGE_ARC),
          scale: COIN,
        };
      };
    });

    const inflow: Pour = {
      coinsAlong: 520,
      width: 40,
      streamMs: first.span * 0.8,
      travelMs: 360,
    };
    const rivers = locks.map((lock, k) => {
      if (k === 0)
        return {
          starts: 0,
          pour: inflow,
          line: sampleLine(
            (v) => ({
              x: source.x + Math.sin(v * Math.PI * 3) * 20,
              y: lerp([source.y, lock.floorY - LOCK_H * 0.4], v),
            }),
            30,
          ),
        };
      const from = locks[k - 1].gate;
      const to: Point = { x: lock.cx, y: lock.floorY - LOCK_H * 0.3 };
      const ctrl: Point = {
        x: Math.max(from.x, to.x) + 140,
        y: (from.y + to.y) / 2,
      };
      const p: Point = { x: 0, y: 0 };
      return {
        starts: lock.opens,
        pour: {
          coinsAlong: 560,
          width: 36,
          streamMs: lock.span * 0.6,
          travelMs: Math.max(180, lock.span * 0.45),
        },
        line: sampleLine((v) => ({ ...bezier(from, ctrl, to, v, p) }), 30),
      };
    });
    const sprayPour: Pour = {
      coinsAlong: 400,
      width: 34,
      streamMs: 200,
      travelMs: 300,
    };
    const sprayCtrl: Point = {
      x: (last.gate.x + last.bar.center.x) / 2,
      y: Math.min(last.gate.y, last.bar.center.y) - SPRAY_LIFT,
    };
    const sp: Point = { x: 0, y: 0 };
    const sprayLine = sampleLine(
      (v) => ({ ...bezier(last.gate, sprayCtrl, last.bar.center, v, sp) }),
      30,
    );
    const durationMs = Math.max(
      pourDurationMs(last.bursts, sprayPour),
      ...rivers.map((r) => pourDurationMs(r.starts, r.pour)),
      endAt + holdMs + mergeMs,
    );

    const pouring = createBeats(
      rivers,
      (r) => r.starts,
      (r) => pourLine(cover!, r.line, r.pour),
    );
    const bursting = createBeats(
      locks,
      (l) => l.bursts,
      (l, k) => {
        cover!.levels(l.bar, levelsFor(l.bar.floor), l.gate);
        cover!.launchFrom(l.gate, ringTargets(l.gate, SPLASH, SPLASH_REACH));
        if (l === last) {
          pourLine(cover!, sprayLine, sprayPour);
          cover!.slam(l.bar);
          cover!.blast(l.bar.center);
          return;
        }
        cover!.burst(l.gate, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BURST_SHAKE, k / Math.max(1, n - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        bars,
        tick: (ms, now) => {
          pouring.tick(ms, now);
          bursting.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
