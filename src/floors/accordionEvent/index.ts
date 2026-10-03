// the "Accordion" event (money; cash): it covers its crit, whose click
// freezes the screen while cash pours out of the clicked floor's button
// and folds itself into a long pleated band across the middle of the
// screen like an accordion's bellows; it squeezes in and stretches out,
// the pleats bunching tall as it squeezes, each squeeze a wheeze, a jolt
// and a puff of coins out of its ends, ever faster and deeper; then it
// stretches out one last time and whips into the total in a huge blast
// and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { CoinPath } from "../coins";
import { getButtonCenter } from "../upgradeButton";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { ringTargets } from "../../shared/coinTargets";
import { totalSpot } from "../cashFlow";

const KEY = "accordion";
const REWARD = 4;
const COINS = 1_100;
const COIN = 0.45;
// the band spans WIDE of the screen in FOLDS pleats FOLD px tall and
// THICK px deep; a squeeze closes it to SQUEEZE of its width
const WIDE = 0.86;
const FOLDS = 9;
const FOLD = 34;
const THICK = 22;
const SQUEEZE = 0.6;
const SQUEEZE_MS = 260;
const PUFF = 6;
const PUFF_REACH: [number, number] = [30, 110];
const SURGE_SPREAD = 260;
const WHEEZE_SHAKE: [number, number] = [0.5, 1.2];

export const forceAccordionEvent = registerWispEvent(
  KEY,
  "Accordion",
  () => CONFIG.accordionEvent.chance,
  (floor, context, area) => {
    const { formMs, gapsMs, flightMs, holdMs, mergeMs } = CONFIG.accordionEvent;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const cx = (area.left + area.right) / 2;
    const cy = (area.top + area.bottom) / 2;
    const half = ((area.right - area.left) * WIDE) / 2;
    const squeezes: number[] = [];
    let clock: number = formMs;
    for (let k = 0; k < gapsMs.length; k++) {
      clock += gapsMs[k];
      squeezes.push(clock);
    }
    const surgeAt = clock + SQUEEZE_MS;
    const endAt = surgeAt + SURGE_SPREAD + flightMs;
    // how squeezed the bellows are at ms, 0..1, deeper each time
    const squeezeAt = (ms: number) => {
      let s = 0;
      for (let k = 0; k < squeezes.length; k++) {
        const u = (ms - squeezes[k]) / SQUEEZE_MS + 0.5;
        if (u > 0 && u < 1)
          s = Math.max(
            s,
            Math.sin(Math.PI * u) * (0.6 + (0.4 * k) / squeezes.length),
          );
      }
      return s;
    };

    const paths: CoinPath[] = Array.from({ length: COINS }, (_, i) => {
      const u = i / (COINS - 1);
      const depth = (Math.random() - 0.5) * THICK;
      const tri = Math.abs(((u * FOLDS) % 1) * 2 - 1) * 2 - 1;
      const sent = u * formMs * 0.6;
      const leaves = surgeAt + u * SURGE_SPREAD;
      const from: Point = { x: 0, y: 0 };
      const lift: Point = { x: 0, y: 0 };
      const at: Point = { x: 0, y: 0 };
      const place = (ms: number, into: Point) => {
        const s = 1 - SQUEEZE * squeezeAt(ms);
        into.x = cx + (u * 2 - 1) * half * s;
        into.y = cy + tri * (FOLD / s) + depth;
        return into;
      };
      return (f) => {
        const ms = f * endAt;
        if (ms < sent) return { x: button.x, y: button.y, scale: 0 };
        place(ms, at);
        if (ms < sent + formMs * 0.4) {
          const p = easeOut((ms - sent) / (formMs * 0.4));
          return {
            x: lerp([button.x, at.x], p),
            y: lerp([button.y, at.y], p),
            scale: COIN,
          };
        }
        if (ms < leaves) return { x: at.x, y: at.y, scale: COIN };
        place(leaves, from);
        lift.x = from.x;
        lift.y = from.y - 80;
        const total = cover?.total() ?? fallback;
        bezier(
          from,
          lift,
          total,
          easeIn(clamp01((ms - leaves) / flightMs)),
          at,
        );
        return { x: at.x, y: at.y, scale: COIN };
      };
    });
    const ends: Point[] = [
      { x: cx - half * (1 - SQUEEZE), y: cy },
      { x: cx + half * (1 - SQUEEZE), y: cy },
    ];

    const wheezing = createBeats(
      squeezes,
      (ms) => ms,
      (_, k) => {
        for (const end of ends)
          cover!.launchFrom(end, ringTargets(end, PUFF, PUFF_REACH));
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(WHEEZE_SHAKE, k / Math.max(1, squeezes.length - 1)));
      },
    );
    const finale = createBeats(
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
          wheezing.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
