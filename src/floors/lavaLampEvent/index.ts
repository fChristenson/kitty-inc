// the "Lava Lamp" event (money; cash): it covers its crit, whose click
// freezes the screen while the clicked floor's button pours cash into gooey
// blobs sitting along the bottom of the screen; one after another, ever
// faster, they peel off and rise up the screen like the wax in a lava lamp,
// stretching tall as they climb and wobbling, each topping out with a bloop
// and a jolt; then every blob oozes together into one huge blob that
// surges into the total in a huge blast and shake. Pays floor income ×
// floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { CoinPath } from "../coins";
import { getButtonCenter } from "../upgradeButton";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import {
  clamp01,
  easeIn,
  easeOut,
  lerp,
  smoothstep,
} from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { totalSpot } from "../cashFlow";

const KEY = "lavaLamp";
const REWARD = 4;
const BLOBS = 6;
const PER_BLOB = 220;
const COIN = 0.5;
// blobs sit FLOOR px up from the bottom, RADIUS px round, and rise to
// between TOP of the way down the screen; climbing they stretch STRETCH
// taller and wobble WOBBLE of their size
const FLOOR = 70;
const RADIUS: [number, number] = [40, 62];
const TOP: [number, number] = [0.18, 0.45];
const STRETCH = 0.7;
const WOBBLE = 0.12;
const JOIN_RADIUS = 120;
const SURGE_SPREAD = 260;
const LIFT = 80;
const PEAK_SHAKE: [number, number] = [0.5, 1.1];

export const forceLavaLampEvent = registerWispEvent(
  KEY,
  "Lava Lamp",
  () => CONFIG.lavaLampEvent.chance,
  (floor, context, area) => {
    const { pourMs, gapsMs, riseMs, joinMs, flightMs, holdMs, mergeMs } =
      CONFIG.lavaLampEvent;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    let clock: number = pourMs;
    const blobs = Array.from({ length: BLOBS }, (_, k) => {
      const rises = clock;
      clock += lerp(gapsMs, k / (BLOBS - 1));
      const x = area.left + width * ((k + 0.5) / BLOBS);
      return {
        rises,
        peaks: rises + riseMs,
        radius: lerp(RADIUS, Math.random()),
        from: { x, y: area.bottom - FLOOR },
        to: {
          x: x + (Math.random() - 0.5) * 60,
          y: area.top + height * lerp(TOP, Math.random()),
        },
      };
    });
    const joinAt = blobs[BLOBS - 1].peaks + 150;
    const joined: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + height * TOP[0] + JOIN_RADIUS,
    };
    const surgeAt = joinAt + joinMs;
    const endAt = surgeAt + SURGE_SPREAD + flightMs;

    const paths: CoinPath[] = [];
    for (const blob of blobs) {
      for (let i = 0; i < PER_BLOB; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random());
        const ox = Math.cos(angle) * r;
        const oy = Math.sin(angle) * r;
        const pours = Math.random() * pourMs * 0.8;
        const leaves = surgeAt + Math.random() * SURGE_SPREAD;
        const jx = joined.x + ox * JOIN_RADIUS;
        const jy = joined.y + oy * JOIN_RADIUS;
        const lift: Point = { x: jx, y: jy - LIFT };
        const seat: Point = { x: jx, y: jy };
        const at: Point = { x: 0, y: 0 };
        paths.push((f) => {
          const ms = f * endAt;
          if (ms < pours) return { x: button.x, y: button.y, scale: 0 };
          const wob = 1 + WOBBLE * Math.sin(angle * 3 + ms / 140);
          if (ms < joinAt) {
            // pouring in, resting, then rising
            const u = smoothstep(clamp01((ms - blob.rises) / riseMs));
            const pace = Math.sin(Math.PI * u);
            const cx = lerp([blob.from.x, blob.to.x], u);
            const cy = lerp([blob.from.y, blob.to.y], u);
            const x = cx + ox * blob.radius * wob * (1 - 0.3 * STRETCH * pace);
            const y = cy + oy * blob.radius * wob * (1 + STRETCH * pace);
            const poured = clamp01((ms - pours) / (pourMs * 0.4));
            if (poured < 1) {
              const p = easeOut(poured);
              return {
                x: lerp([button.x, x], p),
                y: lerp([button.y, y], p),
                scale: COIN,
              };
            }
            return { x, y, scale: COIN };
          }
          if (ms < leaves) {
            const u = smoothstep(clamp01((ms - joinAt) / joinMs));
            return {
              x: lerp([blob.to.x + ox * blob.radius, jx], u),
              y: lerp([blob.to.y + oy * blob.radius, jy], u) + oy * 6 * wob,
              scale: COIN,
            };
          }
          const total = cover?.total() ?? fallback;
          bezier(
            seat,
            lift,
            total,
            easeIn(clamp01((ms - leaves) / flightMs)),
            at,
          );
          return { x: at.x, y: at.y, scale: COIN };
        });
      }
    }

    const peaking = createBeats(
      blobs,
      (b) => b.peaks,
      (b, k) => {
        cover!.burst(b.to, 0.4);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(PEAK_SHAKE, k / (BLOBS - 1)));
      },
    );
    const finale = createBeats(
      [surgeAt, endAt],
      (ms) => ms,
      (_, k) => {
        if (k === 0) {
          cover!.burst(joined, 0.9);
          if (cover!.isLive()) shakeScreen(1.2);
          return;
        }
        cover!.blast(cover!.total() ?? fallback);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          peaking.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
