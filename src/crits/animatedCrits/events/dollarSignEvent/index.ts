// the "Dollar Sign" event (money; cash): it covers its crit, whose click
// freezes the screen while a torrent of cash sprays out of the clicked
// floor's button and writes a giant dollar sign across the whole screen,
// the S swept out end to end and the stroke slashed down through it; it
// throbs three times, ever harder, each a ka-ching and a jolt; then it
// bursts and all of it pours into the total in a huge blast and shake.
// Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";

const KEY = "dollarSign";
const REWARD = 4;
const COINS = 1_400;
const STROKE_SHARE = 0.22;
const COIN = 0.5;
// the S's two loops are each RADIUS of the screen's height tall; the
// stroke overruns them by OVERRUN of that; coins THICK px across the line
const RADIUS = 0.17;
const OVERRUN = 0.6;
const THICK = 22;
const ARC = (Math.PI * 4) / 3;
const FLY_MS = 280;
const THROB = 0.12;
const THROB_MS = 200;
const SURGE_SPREAD = 260;
const THROB_SHAKE: [number, number] = [0.7, 1.4];

export const forceDollarSignEvent = registerWispEvent(
  KEY,
  "Dollar Sign",
  () => CONFIG.dollarSignEvent.chance,
  (floor, context, area) => {
    const { writeMs, throbsMs, flightMs, holdMs, mergeMs } =
      CONFIG.dollarSignEvent;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const cx = (area.left + area.right) / 2;
    const cy = (area.top + area.bottom) / 2;
    const r = Math.min(
      (area.bottom - area.top) * RADIUS,
      (area.right - area.left) * 0.3,
    );
    // u 0..1 along the S: the top loop round anticlockwise, the bottom
    // one clockwise
    const sAt = (u: number): Point => {
      if (u < 0.5) {
        const angle = -Math.PI / 6 - ARC * (u * 2);
        return { x: cx + Math.cos(angle) * r, y: cy - r + Math.sin(angle) * r };
      }
      const angle = -Math.PI / 2 + ARC * ((u - 0.5) * 2);
      return { x: cx + Math.cos(angle) * r, y: cy + r + Math.sin(angle) * r };
    };
    const strokeTop = cy - 2 * r - r * OVERRUN;
    const strokeBottom = cy + 2 * r + r * OVERRUN;
    const throbs: number[] = [];
    let clock: number = writeMs + FLY_MS;
    for (const gap of throbsMs) {
      clock += gap;
      throbs.push(clock);
    }
    const burstAt = throbs[throbs.length - 1] + THROB_MS;
    const endAt = burstAt + SURGE_SPREAD + flightMs;
    const throb = (ms: number) => {
      let swell = 0;
      throbs.forEach((t, k) => {
        const u = (ms - t) / THROB_MS;
        if (u > 0 && u < 1) swell = Math.sin(Math.PI * u) * (1 + k * 0.5);
      });
      return 1 + THROB * swell;
    };

    const paths: CoinPath[] = Array.from({ length: COINS }, (_, i) => {
      const stroke = i < COINS * STROKE_SHARE;
      const u = stroke ? i / (COINS * STROKE_SHARE) : Math.random();
      const line = stroke
        ? { x: cx, y: lerp([strokeTop, strokeBottom], u) }
        : sAt(u);
      const spot: Point = {
        x: line.x + (Math.random() - 0.5) * THICK,
        y: line.y + (Math.random() - 0.5) * THICK,
      };
      // the S is written first, then the stroke slashed down
      const sent = stroke ? writeMs * (0.7 + 0.3 * u) : writeMs * 0.7 * u;
      const leaves = burstAt + Math.random() * SURGE_SPREAD;
      return (f) => {
        const ms = f * endAt;
        if (ms < sent) return { x: button.x, y: button.y, scale: 0 };
        if (ms < sent + FLY_MS) {
          const p = easeOut((ms - sent) / FLY_MS);
          return {
            x: lerp([button.x, spot.x], p),
            y: lerp([button.y, spot.y], p),
            scale: COIN,
          };
        }
        const k = throb(ms);
        const x = cx + (spot.x - cx) * k;
        const y = cy + (spot.y - cy) * k;
        if (ms < leaves) return { x, y, scale: COIN };
        const total = cover?.total() ?? fallback;
        const p = clamp01((ms - leaves) / flightMs);
        const e = easeIn(p);
        const kick = 0.4 * Math.sin(Math.PI * p);
        return {
          x: lerp([x, total.x], e) + (x - cx) * kick,
          y: lerp([y, total.y], e) + (y - cy) * kick,
          scale: COIN,
        };
      };
    });

    const throbbing = createBeats(
      throbs,
      (ms) => ms,
      (_, k) => {
        cover!.burst({ x: cx, y: cy }, 0.4 + 0.2 * k);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(THROB_SHAKE, k / Math.max(1, throbs.length - 1)));
      },
    );
    const finale = createBeats(
      [burstAt, endAt],
      (ms) => ms,
      (_, k) => {
        if (k === 1) {
          cover!.blast(cover!.total() ?? fallback);
          return;
        }
        cover!.burst({ x: cx, y: cy }, 1);
        if (cover!.isLive()) playExplosion();
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
          throbbing.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
