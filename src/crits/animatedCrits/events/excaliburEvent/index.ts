// the "Excalibur" event (lightning; free upgrade levels): it covers its
// crit, whose click freezes the screen while a sword of crackling lightning
// stands stuck point-first in the clicked floor's button; a wisp grips its
// hilt and heaves, and every heave jerks it a little further out with a
// blinding crack, an arc leaping from the blade into an income bar for free
// levels and a jolt, each heave quicker; on the last it rips free, is
// thrust high overhead and forks of lightning crack down from it into every
// bar at once in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "excalibur";
const MAX_BARS = 4;
const BLADE = 220;
const GUARD = 60;
const GUARD_DOWN = 40;
// how far each heave jerks it out, and how much of that it keeps
const JERK = 50;
const KEEP = 0.5;
const RAISE = 420;
const JERK_MS = 90;
const ARC_MS = 260;
const FORK_MS = 420;
const HAND = 0.6;
const HEAVE_SHAKE: [number, number] = [0.6, 1.3];

export const forceExcaliburEvent = registerWispEvent(
  KEY,
  "Excalibur",
  () => CONFIG.excaliburEvent.chance,
  (floor, context) => {
    const { heavesMs, firstMs, raiseMs, levelShare, holdMs, mergeMs } =
      CONFIG.excaliburEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock: number = firstMs;
    const heaves = bars.map((bar, k) => {
      const at = clock;
      clock += lerp(heavesMs, k / Math.max(1, bars.length - 1));
      return { bar, at, out: (k + 1) * JERK * KEEP };
    });
    const yankAt = clock;
    const forkAt = yankAt + raiseMs;
    const kept = heaves[heaves.length - 1].out;
    // how far the blade has come out of the stone at ms
    const liftAt = (ms: number) => {
      if (ms >= yankAt)
        return lerp([kept, RAISE], easeOut(clamp01((ms - yankAt) / raiseMs)));
      let lift = 0;
      for (const h of heaves) {
        if (ms < h.at) break;
        const since = ms - h.at;
        const kick =
          since < JERK_MS ? Math.sin((Math.PI * since) / JERK_MS) * JERK : 0;
        lift = h.out + kick;
      }
      return lift;
    };
    const tip: Point = { x: button.x, y: button.y };
    const hilt: Point = { x: button.x, y: button.y - BLADE };
    const guardL: Point = { x: 0, y: 0 };
    const guardR: Point = { x: 0, y: 0 };
    const blade = createBolt(hilt, tip, 0);
    const guard = createBolt(guardL, guardR, 0);
    const arcs = heaves.map((h) => createBolt(tip, h.bar.center, 1));
    const forks = bars.map((bar) => createBolt(hilt, bar.center, 2));
    const hand: Point = { x: button.x, y: 0 };
    const handAt = (ms: number): Point => {
      hand.y = button.y - BLADE - 16 - liftAt(ms);
      return hand;
    };

    const heaving = createBeats(
      heaves,
      (h) => h.at,
      (h, k) => {
        cover!.levels(
          h.bar,
          levelsFor(h.bar.floor, levelShare, 2),
          h.bar.center,
        );
        cover!.burst(h.bar.center, 0.5);
        cover!.burst(button, 0.4);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HEAVE_SHAKE, k / Math.max(1, heaves.length - 1)));
      },
    );
    const forking = createBeats(
      [forkAt],
      (ms) => ms,
      () => {
        for (const bar of bars) {
          cover!.levels(bar, levelsFor(bar.floor, levelShare, 2), bar.center);
          cover!.slam(bar);
        }
        cover!.blast({ x: hilt.x, y: hilt.y });
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: forkAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          heaving.tick(ms, now);
          forking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > forkAt + FORK_MS) return;
          const lift = liftAt(Math.min(ms, forkAt));
          tip.y = button.y - lift;
          hilt.y = button.y - BLADE - lift;
          guardL.x = button.x - GUARD;
          guardR.x = button.x + GUARD;
          guardL.y = guardR.y = hilt.y + GUARD_DOWN;
          const fade = ms > forkAt ? 1 - (ms - forkAt) / FORK_MS : 1;
          drawBolt(ctx, blade, fade, 0.7);
          drawBolt(ctx, guard, fade, 0.45);
          if (ms < yankAt) drawStrike(ctx, button, 0.5, 0.6, now);
          for (let k = 0; k < heaves.length; k++) {
            const since = ms - heaves[k].at;
            if (since < 0 || since >= ARC_MS) continue;
            const a = 1 - since / ARC_MS;
            drawBolt(ctx, arcs[k], a, 0.8);
            drawStrike(ctx, heaves[k].bar.center, a, 1, now);
          }
          if (ms >= forkAt) {
            for (const fork of forks) drawBolt(ctx, fork, fade, 1.1);
            for (const bar of bars) drawStrike(ctx, bar.center, fade, 1.2, now);
          }
          drawWispBetween(
            ctx,
            handAt,
            ms,
            now,
            WISP_SIZE * HAND,
            0.8,
            0,
            forkAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
