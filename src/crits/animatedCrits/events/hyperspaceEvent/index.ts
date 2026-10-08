// the "Hyperspace" event (beam; cash): it covers its crit, whose click
// freezes the screen while stars of light and cash drift out of the clicked
// floor's button; it jumps to light speed with a whoosh and a jolt, every
// star stretching into a blazing streak racing out past the screen's edges,
// faster and faster as the screen rumbles; then it drops out: every streak
// snaps back into the button in a blinding flash and a bang, and it fires
// one colossal beam up into the total, all the cash riding it in, in a huge
// blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { totalSpot } from "../../cashFlow";
import type { Point } from "../../../../shared/wisp";

const KEY = "hyperspace";
const REWARD = 4;
const STREAKS = 32;
const COINS = 1_200;
const COIN = 0.5;
// stars sit at least NEAR px out; a streak is TAIL_MS of its travel long
const NEAR = 30;
const TAIL_MS = 70;
// px per ms: drifting, then flat out
const DRIFT = 0.06;
const WARP = 3.4;
const WIDTH: [number, number] = [3, 12];
const CORE: [number, number] = [14, 70];
const FIRE_WIDTH = 40;
const FIRE_FADE_MS = 220;
const RUMBLE_MS = 160;
const RUMBLE_SHAKE: [number, number] = [0.4, 1.4];

export const forceHyperspaceEvent = registerWispEvent(
  KEY,
  "Hyperspace",
  () => CONFIG.hyperspaceEvent.chance,
  (floor, context, area) => {
    const { chargeMs, warpMs, dropMs, fireMs, holdMs, mergeMs } =
      CONFIG.hyperspaceEvent;
    const fallback = totalSpot(area);
    const c = getButtonCenter(context.isGroundFloor);
    const warpEnd = chargeMs + warpMs;
    const dropEnd = warpEnd + dropMs;
    const endAt = dropEnd + fireMs;
    const span =
      Math.max(
        ...[
          [area.left, area.top],
          [area.right, area.top],
          [area.left, area.bottom],
          [area.right, area.bottom],
        ].map(([x, y]) => Math.hypot(x - c.x, y - c.y)),
      ) - NEAR;
    const warp = (ms: number) =>
      clamp01((Math.min(ms, warpEnd) - chargeMs) / warpMs);
    const speed = (ms: number) => DRIFT + (WARP - DRIFT) * warp(ms) ** 2;
    const travelled = (ms: number) =>
      DRIFT * Math.min(ms, warpEnd) +
      ((WARP - DRIFT) * warpMs * warp(ms) ** 3) / 3;
    // a star's head and tail, px out from the button
    const reach = (r0: number, ms: number) =>
      NEAR + ((r0 + travelled(ms)) % span);
    const shrink = (ms: number) =>
      ms < warpEnd ? 1 : 1 - easeIn(clamp01((ms - warpEnd) / dropMs));

    const streaks = Array.from({ length: STREAKS }, () => {
      const angle = Math.random() * Math.PI * 2;
      return {
        dx: Math.cos(angle),
        dy: Math.sin(angle),
        r0: Math.random() * span,
      };
    });
    const tail: Point = { x: 0, y: 0 };
    const head: Point = { x: 0, y: 0 };

    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      const angle = Math.random() * Math.PI * 2;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      const r0 = Math.random() * span;
      const leaves = dropEnd + Math.random() * fireMs * 0.6;
      const rideMs = fireMs * 0.4;
      return (f) => {
        const ms = f * endAt;
        if (ms < dropEnd) {
          const r = reach(r0, ms) * shrink(ms);
          return {
            x: c.x + dx * r,
            y: c.y + dy * r,
            scale: COIN * (0.6 + 0.4 * (speed(ms) / WARP)),
          };
        }
        const total = cover?.total() ?? fallback;
        const u = easeIn(clamp01((ms - leaves) / rideMs));
        return {
          x: lerp([c.x, total.x], u),
          y: lerp([c.y, total.y], u),
          scale: COIN,
        };
      };
    });

    const jumping = createBeats(
      [chargeMs],
      (ms) => ms,
      () => {
        cover!.burst(c, 0.6);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(1.2);
      },
    );
    const rumbles = Array.from(
      { length: Math.floor(warpMs / RUMBLE_MS) },
      (_, i) => chargeMs + (i + 1) * RUMBLE_MS,
    );
    const rumbling = createBeats(
      rumbles,
      (ms) => ms,
      (_, k) => {
        if (cover?.isLive())
          shakeScreen(lerp(RUMBLE_SHAKE, k / Math.max(1, rumbles.length - 1)));
      },
    );
    const dropping = createBeats(
      [dropEnd],
      (ms) => ms,
      () => {
        cover!.burst(c, 1.2);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(1.6);
      },
    );
    const firing = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          jumping.tick(ms, now);
          rumbling.tick(ms, now);
          dropping.tick(ms, now);
          firing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + FIRE_FADE_MS) return;
          if (ms < dropEnd) {
            const v = speed(ms);
            const fast = v / WARP;
            const s = shrink(ms);
            const width = lerp(WIDTH, fast);
            const alpha = ms < warpEnd ? 0.35 + 0.65 * fast : 1;
            for (const st of streaks) {
              const r = reach(st.r0, ms);
              const rt = Math.max(NEAR, r - v * TAIL_MS);
              tail.x = c.x + st.dx * rt * s;
              tail.y = c.y + st.dy * rt * s;
              head.x = c.x + st.dx * r * s;
              head.y = c.y + st.dy * r * s;
              drawBeam(ctx, tail, head, width, alpha);
            }
            drawBeamFlare(ctx, c, lerp(CORE, Math.max(fast, 1 - s)), 1, now);
            return;
          }
          const total = cover?.total() ?? fallback;
          const u = easeOut(clamp01((ms - dropEnd) / fireMs));
          const fade = 1 - clamp01((ms - endAt) / FIRE_FADE_MS);
          head.x = lerp([c.x, total.x], u);
          head.y = lerp([c.y, total.y], u);
          drawBeam(ctx, c, head, FIRE_WIDTH * (0.4 + 0.6 * u), fade);
          drawBeamFlare(ctx, c, CORE[1] * fade, fade, now);
          drawBeamFlare(ctx, head, CORE[1] * 0.6 * u, fade, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
