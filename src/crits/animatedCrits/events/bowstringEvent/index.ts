// the "Bowstring" event (mix): it covers its crit, whose click freezes the
// screen while a bowstring of flowing cash strings itself across the lower
// screen and a wisp nocks onto its middle; the wisp draws it back, the
// string bending into a deep V, swelling and trembling as the screen
// rumbles; let go, the string twangs with a flash, a bang and a jolt and the
// wisp shoots up into the total-income readout like an arrow, the whole
// string of cash whipping off after it, in a huge blast and shake, and the
// coins sweep into the total. Pays floor income × floor number × REWARD (see
// ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOutCubic, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";

const KEY = "bowstring";
const REWARD = 4;
// the bow's tips SPAN of the screen's width apart, LOW of its height down;
// drawn back DRAW of its height
const SPAN = 0.8;
const LOW = 0.62;
const DRAW = 0.2;
// COINS flowing in to the nock along the string, LANE px either side
const COINS = 900;
const LANE = 5;
const COIN = 0.8;
// after the release coins whip off after the arrow, trailing it by up to
// TAIL_MS
const TAIL_MS = 260;
const BLEND_MS = 120;
const SHIVER = 5;
const ARROW: [number, number] = [0.05, 0.09];
const RUMBLE_MS = 70;
const RUMBLE: [number, number] = [0.3, 1.2];
const TWANG_BURST = 1.1;
const TWANG_SHAKE = 2.2;

export const forceBowstringEvent = registerWispEvent(
  KEY,
  "Bowstring",
  () => CONFIG.bowstringEvent.chance,
  (floor, context, area) => {
    const { stringMs, drawMs, flightMs, flowMs, holdMs, mergeMs } =
      CONFIG.bowstringEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const button = getButtonCenter(context.isGroundFloor);
    const fallback = totalSpot(area);
    const mid = (area.left + area.right) / 2;
    const y = area.top + height * LOW;
    const tips: Point[] = [
      { x: mid - (width * SPAN) / 2, y },
      { x: mid + (width * SPAN) / 2, y },
    ];
    const releaseAt = stringMs + drawMs;
    const inAt = releaseAt + flightMs;
    const travelMs = inAt + TAIL_MS;
    // the nock: strung at rest, drawn back, then the arrow's flight
    const nock = (ms: number, into: Point): Point => {
      if (ms < releaseAt) {
        const pull = easeOutCubic(clamp01((ms - stringMs) / drawMs));
        const t = clamp01((ms - stringMs) / drawMs);
        into.x = mid + Math.sin(ms * 0.9) * SHIVER * t;
        into.y = y + height * DRAW * pull + Math.sin(ms * 1.3) * SHIVER * t;
        return into;
      }
      const total = cover?.total() ?? fallback;
      const from = { x: mid, y: y + height * DRAW };
      return bezier(
        from,
        { x: mid, y: (from.y + total.y) / 2 },
        total,
        easeIn(clamp01((ms - releaseAt) / flightMs)),
        into,
      );
    };
    const arrow = { x: 0, y: 0 };
    const arrowAt = (ms: number): Point | null =>
      ms < stringMs || ms >= inAt ? null : nock(ms, arrow);

    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      const side = Math.random() < 0.5 ? 0 : 1;
      const s0 = Math.random();
      const lane = (Math.random() - 0.5) * LANE * 2;
      // strung out from the button to its spot as the string forms
      const strung = Math.random() * stringMs;
      const along = (ms: number) => (s0 + ms / flowMs) % 1;
      return (f) => {
        const ms = f * travelMs;
        if (ms < strung) return { x: button.x, y: button.y, scale: 0 };
        const s = along(Math.min(ms, releaseAt));
        const n = nock(Math.min(ms, releaseAt - 1), { x: 0, y: 0 });
        const tip = tips[side];
        const onString = {
          x: tip.x + (n.x - tip.x) * s,
          y: tip.y + (n.y - tip.y) * s + lane,
        };
        if (ms < releaseAt) {
          const u = clamp01((ms - strung) / 200);
          return {
            x: button.x + (onString.x - button.x) * u,
            y: button.y + (onString.y - button.y) * u,
            scale: COIN,
          };
        }
        // the coins nearest the nock follow the arrow closest
        const tail = nock(Math.max(releaseAt, ms - (1 - s) * TAIL_MS), {
          x: 0,
          y: 0,
        });
        const w = easeOutCubic(clamp01((ms - releaseAt) / BLEND_MS));
        return {
          x: onString.x + (tail.x - onString.x) * w,
          y: onString.y + (tail.y - onString.y) * w,
          scale: COIN,
        };
      };
    });

    let lastRumble = -Infinity;
    const twang = createBeats(
      [releaseAt],
      (ms) => ms,
      () => {
        cover!.burst({ x: mid, y: y + height * DRAW }, TWANG_BURST);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(TWANG_SHAKE);
      },
    );
    const finale = createBeats(
      [inAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travelMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          twang.tick(ms, now);
          finale.tick(ms, now);
          if (
            ms > stringMs &&
            ms < releaseAt &&
            now - lastRumble >= RUMBLE_MS &&
            cover?.isLive()
          ) {
            lastRumble = now;
            shakeScreen(lerp(RUMBLE, (ms - stringMs) / drawMs));
          }
        },
        drawOver: (ctx, ms, now) => {
          const tension = clamp01((ms - stringMs) / drawMs);
          drawWispBetween(
            ctx,
            arrowAt,
            ms,
            now,
            Math.max(WISP_SIZE, width * lerp(ARROW, tension)),
            tension,
            stringMs,
            inAt,
          );
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travelMs);
    playBoostEventStream();
  },
);
