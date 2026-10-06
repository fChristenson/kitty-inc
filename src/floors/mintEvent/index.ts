// the "Mint" event (drawing; a crit tier): it covers its crit, whose click
// freezes the screen while glitter starts raining down over the clicked
// floor's bar, every drop falling into place in a giant coin, tile by tile
// from the bottom up like metal poured into a mould, faster and faster,
// every row a click and a jolt; the finished coin blazes, flips edge over
// edge as it drops and lands flat on the bar, which jumps a crit tier in a
// huge blast. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { COLOR } from "../../palette";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { stampGlimmer } from "../../shared/twinkle";
import { drawDots, shapeFill, SHAPES } from "../../shared/drawing";
import { findRewardBars } from "../eventRewards";

const KEY = "mint";
const TILES = 240;
const TILE = 10;
// the coin this high over the bar (at most), a share of the screen's width
// across (at most SIZE px from its middle to its rim)
const ABOVE = 290;
const WIDTH = 0.3;
const SIZE = 200;
// each drop falls from this far above the screen's top
const FALL_FROM = 40;
const FLIPS = 2.5;
const ROW_SHAKE: [number, number] = [0.15, 0.5];
const BLAZE_SHAKE = 1;
const SOUND_GAP_MS = 60;

export const forceMintEvent = registerWispEvent(
  KEY,
  "Mint",
  () => CONFIG.mintEvent.chance,
  (floor, context, area) => {
    const { pourMs, fallMs, blazeMs, dropMs, holdMs, mergeMs } =
      CONFIG.mintEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const size = Math.min(SIZE, (area.right - area.left) * WIDTH);
    const centre: Point = {
      x: bar.center.x,
      y: Math.max(area.top + size + 30, bar.center.y - ABOVE),
    };
    // filled bottom row first, like a mould
    const tiles = shapeFill(SHAPES.coin, TILES, centre, size).reverse();
    const n = tiles.length;
    const lands = tiles.map(
      (_, i) => fallMs + pourMs * (1 - (1 - (i + 1) / n) ** 1.5),
    );
    const doneAt = lands[n - 1];
    const dropAt = doneAt + blazeMs;
    const hitAt = dropAt + dropMs;
    // a beat each time a new row starts landing
    const rows = tiles
      .map((t, i) => ({ y: t.y, ms: lands[i] }))
      .filter((t, i) => i === 0 || Math.abs(tiles[i - 1].y - t.y) > 1);
    let soundAt = -Infinity;

    const pouring = createBeats(
      rows,
      (r) => r.ms,
      (_, k, now) => {
        if (!cover!.isLive()) return;
        shakeScreen(lerp(ROW_SHAKE, k / Math.max(1, rows.length - 1)));
        if (now - soundAt < SOUND_GAP_MS) return;
        soundAt = now;
        playBloop();
      },
    );
    const minting = createBeats(
      [doneAt, dropAt, hitAt],
      (ms) => ms,
      (ms) => {
        if (ms >= hitAt) {
          cover!.tierUp(bar, centre);
          cover!.slam(bar);
          cover!.blast(bar.center);
          return;
        }
        if (ms === doneAt) cover!.burst(centre, 1.2);
        if (!cover!.isLive()) return;
        playSwoosh();
        if (ms === doneAt) shakeScreen(BLAZE_SHAKE);
      },
    );

    const drop: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: hitAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [bar],
        tick: (ms, now) => {
          pouring.tick(ms, now);
          minting.tick(ms, now);
        },
        drawOver: (ctx, ms) => {
          if (ms < 0 || ms > hitAt) return;
          let landed = 0;
          while (landed < n && lands[landed] <= ms) landed++;
          // the coin: flipping edge over edge as it drops onto the bar
          const u = easeIn(clamp01((ms - dropAt) / dropMs));
          const flip = Math.cos(u * FLIPS * Math.PI * 2);
          ctx.save();
          ctx.translate(centre.x, lerp([centre.y, bar.center.y], u));
          ctx.scale(Math.max(0.08, Math.abs(flip)), 1 - 0.5 * u);
          ctx.translate(-centre.x, -centre.y);
          drawDots(ctx, tiles, landed, TILE, ms, clamp01((ms - doneAt) / 150));
          ctx.restore();
          // drops still falling into the mould
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (let i = landed; i < n; i++) {
            const t = (ms - (lands[i] - fallMs)) / fallMs;
            if (t < 0) break;
            drop.x = tiles[i].x;
            drop.y = lerp([area.top - FALL_FROM, tiles[i].y], easeIn(t));
            stampGlimmer(
              ctx,
              drop.x,
              drop.y,
              TILE,
              i,
              i % 3 === 0 ? COLOR.white : COLOR.heavenlyGold,
            );
          }
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
