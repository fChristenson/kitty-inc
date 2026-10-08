// the "Kite" event: it covers its crit, whose click freezes the screen while
// a wisp soars up off the clicked floor's button like a kite on a sagging,
// rippling string of cash that pours up it nonstop; the kite swoops back and
// forth high over the screen, then the string snaps off the button with a
// crack and a jolt and the kite dives into the total-income readout dragging
// the whole string behind it like a tail, in a huge blast and shake, and the
// coins sweep into the total. Pays floor income × floor number × REWARD (see
// ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
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
import {
  clamp01,
  easeIn,
  easeOut,
  easeOutBack,
} from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";

const KEY = "kite";
const REWARD = 4;
const COINS = 900;
const COIN = 0.8;
// the kite flies HIGH of the screen's height down from its top, swooping
// SWOOP of its width either side and BOB of its height up and down
const HIGH = 0.3;
const SWOOP = 0.3;
const BOB = 0.08;
const SWOOP_HZ = 0.7;
// the string sags SAG of the screen's height, rippling RIPPLE px
const SAG = 0.16;
const RIPPLE = 10;
// once it snaps, the string trails the kite by up to TAIL_MS
const TAIL_MS = 380;
const BLEND_MS = 220;
// the kite, as a share of the screen's width
const KITE = 0.09;
const POP_MS = 200;
const SNAP_BURST = 1;
const SNAP_SHAKE = 2;

export const forceKiteEvent = registerWispEvent(
  KEY,
  "Kite",
  () => CONFIG.kiteEvent.chance,
  (floor, context, area) => {
    const { riseMs, flyMs, flowMs, diveMs, holdMs, mergeMs } = CONFIG.kiteEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const button = getButtonCenter(context.isGroundFloor);
    const fallback = totalSpot(area);
    const mid = (area.left + area.right) / 2;
    const way = Math.random() < 0.5 ? 1 : -1;
    const snapAt = riseMs + flyMs;
    const inAt = snapAt + diveMs;
    const travelMs = inAt + TAIL_MS;
    const flying = (ms: number, into: Point): Point => {
      const v = (ms / 1000) * SWOOP_HZ * Math.PI * 2;
      into.x = mid + way * width * SWOOP * Math.sin(v);
      into.y = area.top + height * HIGH - height * BOB * Math.sin(v * 2);
      return into;
    };
    const lift = flying(riseMs, { x: 0, y: 0 });
    const from = flying(snapAt, { x: 0, y: 0 });
    // the kite at ms in: up off the button, swooping, then diving in
    const kiteAt = (ms: number, into: Point): Point => {
      if (ms <= 0) return Object.assign(into, button);
      if (ms < riseMs) {
        const u = easeOut(ms / riseMs);
        const at = flying(ms, into);
        const w = easeOut(clamp01(ms / riseMs));
        into.x = button.x + (at.x - button.x) * w;
        into.y = button.y + (lift.y - button.y) * u;
        return into;
      }
      if (ms < snapAt) return flying(ms, into);
      const total = cover?.total() ?? fallback;
      const u = easeIn(clamp01((ms - snapAt) / diveMs));
      return bezier(from, { x: from.x, y: area.top }, total, u, into);
    };
    // the point s 0..1 up the string from the button to the kite at ms in
    const stringAt = (ms: number, s: number, into: Point): Point => {
      const kite = kiteAt(ms, into);
      const kx = kite.x;
      const ky = kite.y;
      const sag = height * SAG;
      const ripple =
        RIPPLE * Math.sin(s * 12 - ms / 60) * Math.sin(Math.PI * s);
      bezier(
        button,
        { x: (button.x + kx) / 2, y: (button.y + ky) / 2 + sag },
        { x: kx, y: ky },
        s,
        into,
      );
      into.x += ripple;
      return into;
    };
    const kite = { x: 0, y: 0 };
    const kitePos = (ms: number): Point | null =>
      ms < 0 || ms >= inAt ? null : kiteAt(ms, kite);

    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      const offset = Math.random();
      const lag = Math.random();
      return (f) => {
        const ms = f * travelMs;
        const s = ms / flowMs - offset;
        if (s < 0) return { x: button.x, y: button.y, scale: 0 };
        const up = s % 1;
        const onString = stringAt(Math.min(ms, snapAt), up, { x: 0, y: 0 });
        if (ms < snapAt) return { x: onString.x, y: onString.y, scale: COIN };
        // whipped off the string into the kite's tail
        const tail = kiteAt(ms - lag * TAIL_MS, { x: 0, y: 0 });
        const w = easeOut(clamp01((ms - snapAt) / BLEND_MS));
        return {
          x: onString.x + (tail.x - onString.x) * w,
          y: onString.y + (tail.y - onString.y) * w,
          scale: COIN,
        };
      };
    });

    const snap = createBeats(
      [snapAt],
      (ms) => ms,
      () => {
        cover!.burst(button, SNAP_BURST);
        if (!cover!.isLive()) return;
        playExplosion();
        playSwoosh();
        shakeScreen(SNAP_SHAKE);
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
          snap.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const size =
            Math.max(WISP_SIZE, width * KITE) *
            easeOutBack(clamp01(ms / POP_MS));
          drawWispBetween(
            ctx,
            kitePos,
            ms,
            now,
            size,
            clamp01(ms / inAt),
            0,
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
