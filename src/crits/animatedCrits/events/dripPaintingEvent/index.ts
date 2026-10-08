// the "Drip Painting" event (money; cash): it covers its crit, whose click
// freezes the screen while a wisp darts out of the clicked floor's button
// and starts flicking cash at the screen like a drip painter, each flick a
// long looping splatter of coins that lands with a splat and a jolt, layer
// over layer, ever faster and wilder; then the whole splattered canvas
// slides off into the total in a huge blast and shake. Pays floor income ×
// floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeIn,
  easeOut,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";

const KEY = "dripPainting";
const REWARD = 4;
const FLICKS = 8;
const PER_FLICK = 140;
const COIN = 0.42;
// each splatter loops LOOP px off its line, spattering SPATTER px wide
const LOOP = 120;
const SPATTER = 14;
const THROW_MS = 160;
const LAY_MS = 90;
const EDGE = 0.08;
const PAINTER = 0.55;
const SURGE_SPREAD = 280;
const LIFT = 60;
const SPLAT_SHAKE: [number, number] = [0.4, 1.1];

export const forceDripPaintingEvent = registerWispEvent(
  KEY,
  "Drip Painting",
  () => CONFIG.dripPaintingEvent.chance,
  (floor, context, area) => {
    const { gapsMs, flightMs, holdMs, mergeMs } = CONFIG.dripPaintingEvent;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const w = area.right - area.left;
    const h = area.bottom - area.top;
    const spot = () => ({
      x: area.left + w * lerp([EDGE, 1 - EDGE], Math.random()),
      y: area.top + h * lerp([EDGE, 1 - EDGE], Math.random()),
    });
    let clock = 200;
    const flicks = Array.from({ length: FLICKS }, (_, k) => {
      const at = clock;
      clock += lerp(gapsMs, k / (FLICKS - 1));
      const from = spot();
      const to = spot();
      const ctrl: Point = {
        x: (from.x + to.x) / 2 + (Math.random() - 0.5) * LOOP * 2,
        y: (from.y + to.y) / 2 + (Math.random() - 0.5) * LOOP * 2,
      };
      // the painter flicks from just short of the stroke
      const hand: Point = { x: from.x, y: from.y - 40 };
      return { at, from, to, ctrl, hand };
    });
    const doneAt = clock + THROW_MS;
    const endAt = doneAt + SURGE_SPREAD + flightMs;

    const paths: CoinPath[] = [];
    for (const flick of flicks) {
      for (let i = 0; i < PER_FLICK; i++) {
        const u = i / (PER_FLICK - 1);
        const land = bezier(flick.from, flick.ctrl, flick.to, u, {
          x: 0,
          y: 0,
        });
        // thin flung lines with fat drips here and there
        const drip = Math.random() < 0.15 ? 2.5 : 1;
        land.x += (Math.random() - 0.5) * SPATTER * drip;
        land.y += (Math.random() - 0.5) * SPATTER * drip;
        const thrown = flick.at + u * LAY_MS;
        const leaves = doneAt + Math.random() * SURGE_SPREAD;
        const lift: Point = { x: land.x, y: land.y - LIFT };
        const at: Point = { x: 0, y: 0 };
        paths.push((f) => {
          const ms = f * endAt;
          if (ms < thrown)
            return { x: flick.hand.x, y: flick.hand.y, scale: 0 };
          if (ms < thrown + THROW_MS) {
            const p = easeOut((ms - thrown) / THROW_MS);
            return {
              x: lerp([flick.hand.x, land.x], p),
              y: lerp([flick.hand.y, land.y], p),
              scale: COIN * (0.6 + 0.4 * p),
            };
          }
          if (ms < leaves) return { x: land.x, y: land.y, scale: COIN };
          const total = cover?.total() ?? fallback;
          bezier(
            land,
            lift,
            total,
            easeIn(clamp01((ms - leaves) / flightMs)),
            at,
          );
          return { x: at.x, y: at.y, scale: COIN };
        });
      }
    }
    const painterAt: Point = { x: 0, y: 0 };
    const painter = (ms: number): Point | null => {
      if (ms > doneAt) return null;
      let from: Point = button;
      let leaves = 0;
      for (const f of flicks) {
        if (ms < f.at) {
          const u = smoothstep((ms - leaves) / (f.at - leaves));
          painterAt.x = lerp([from.x, f.hand.x], u);
          painterAt.y = lerp([from.y, f.hand.y], u);
          return painterAt;
        }
        from = f.hand;
        leaves = f.at;
      }
      return from;
    };

    const flicking = createBeats(
      flicks,
      (f) => f.at,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const splatting = createBeats(
      flicks,
      (f) => f.at + THROW_MS,
      (f, k) => {
        cover!.burst(f.to, 0.3);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(SPLAT_SHAKE, k / (FLICKS - 1)));
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
          flicking.tick(ms, now);
          splatting.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            painter,
            ms,
            now,
            WISP_SIZE * PAINTER,
            0.8,
            0,
            doneAt,
          ),
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
