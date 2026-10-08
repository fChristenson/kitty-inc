// the "Crosshair" event (beam; crit tiers): it covers its crit, whose click
// freezes the screen while two blazing beams sweep in from its edges, one
// across and one up and down, their crossing hunting over the screen like a
// rifle's crosshair; it locks onto one income bar after another, the
// crossing flaring as the bar blazes with a flash and a jolt and jumps a
// crit tier, each lock quicker; the last locks on in a huge blast and
// shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawAimLaser, drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardBars } from "../../eventRewards";

const KEY = "crosshair";
const MAX_BARS = 3;
const BEAM = 14;
const FLARE = 34;
const LOCK_SHAKE: [number, number] = [0.8, 1.4];

export const forceCrosshairEvent = registerWispEvent(
  KEY,
  "Crosshair",
  () => CONFIG.crosshairEvent.chance,
  (floor, context, area) => {
    const { sweepMs, huntsMs, holdMs, mergeMs } = CONFIG.crosshairEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock: number = sweepMs;
    let from: Point = button;
    const locks = bars.map((bar, k) => {
      const target: Point = {
        x: bar.center.x + (Math.random() - 0.5) * bar.box.width * 0.5,
        y: bar.center.y,
      };
      const leaves = clock;
      clock += lerp(huntsMs, k / Math.max(1, bars.length - 1));
      const lock = { bar, from, target, leaves, locks: clock };
      from = target;
      return lock;
    });
    const last = locks[locks.length - 1];
    const endAt = last.locks;
    const cross: Point = { x: 0, y: 0 };
    const aim = (ms: number) => {
      let l = locks[0];
      for (const lock of locks) if (ms >= lock.leaves) l = lock;
      const u = smoothstep(clamp01((ms - l.leaves) / (l.locks - l.leaves)));
      cross.x =
        lerp([l.from.x, l.target.x], u) + Math.sin(ms / 70) * 6 * (1 - u);
      cross.y =
        lerp([l.from.y, l.target.y], u) + Math.cos(ms / 90) * 6 * (1 - u);
      return cross;
    };
    const a: Point = { x: 0, y: 0 };
    const b: Point = { x: 0, y: 0 };

    const hunting = createBeats(
      locks,
      (l) => l.leaves,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const locking = createBeats(
      locks,
      (l) => l.locks,
      (l, k) => {
        cover!.tierUp(l.bar, l.target);
        if (l === last) {
          cover!.slam(l.bar);
          cover!.blast(l.target);
          return;
        }
        cover!.burst(l.target, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LOCK_SHAKE, k / Math.max(1, locks.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          hunting.tick(ms, now);
          locking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 300) return;
          const fade = ms > endAt ? 1 - (ms - endAt) / 300 : 1;
          const p = aim(Math.min(ms, endAt));
          const swept = clamp01(ms / sweepMs);
          a.x = lerp([area.left, p.x], swept);
          b.x = lerp([area.left, p.x], swept);
          a.y = area.top;
          b.y = area.bottom;
          if (ms < sweepMs) drawAimLaser(ctx, a, b);
          else drawBeam(ctx, a, b, BEAM, 0.7 * fade);
          a.x = area.left;
          b.x = area.right;
          a.y = b.y = lerp([area.bottom, p.y], swept);
          if (ms < sweepMs) drawAimLaser(ctx, a, b);
          else drawBeam(ctx, a, b, BEAM, 0.7 * fade);
          if (ms >= sweepMs) drawBeamFlare(ctx, p, FLARE * fade, fade, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
