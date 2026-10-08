// the "Stencil" event (spray; levels): it covers its crit, whose click
// freezes the screen while a nozzle wisp sweeps back and forth across it
// row by row like an airbrush over a stencil, hissing a curtain of gold mist
// down; only the cut-out shows through, and row by row a giant gem appears
// out of the mist, every pass a whoosh and a jolt, quicker each time; the
// finished gem blazes and shatters, its glinting tiles arcing down onto the
// bars, each landing free levels on its bar, the last slamming every bar.
// Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { COLOR } from "../../../../palette";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  drawSpray,
  drawSprayMist,
  planSpray,
  sprayLandsAt,
} from "../../../../shared/spray";
import { shapeFill, SHAPES } from "../../../../shared/drawing";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "stencil";
const TILES = 220;
const TILE = 11;
const PASSES = 6;
// the gem's size as a share of the screen's width (at most SIZE px), this
// far down the screen; the nozzle sprays from this high over each row
const WIDTH = 0.34;
const SIZE = 240;
const GEM_AT = 0.36;
const NOZZLE_ABOVE = 70;
const NOZZLE = WISP_SIZE * 0.7;
const SPRAY = WISP_SIZE * 0.7;
const MIST = 60;
const BOW = 160;
const PASS_SHAKE: [number, number] = [0.3, 0.7];
const BLAZE_SHAKE = 1;
const LAND_SHAKE = 0.5;

interface Shard {
  from: Point;
  bar: RewardBar;
  to: Point;
  bow: Point;
  leaves: number;
  lands: number;
}

export const forceStencilEvent = registerWispEvent(
  KEY,
  "Stencil",
  () => CONFIG.stencilEvent.chance,
  (floor, context, area) => {
    const { sprayMs, blazeMs, shatterMs, levelShare, holdMs, mergeMs } =
      CONFIG.stencilEvent;
    const bars = findRewardBars(floor, context);
    if (bars.length === 0) return;
    const size = Math.min(SIZE, (area.right - area.left) * WIDTH);
    const centre: Point = {
      x: (area.left + area.right) / 2,
      y: Math.max(area.top + size + 20, lerp([area.top, area.bottom], GEM_AT)),
    };
    const tiles = shapeFill(SHAPES.gem, TILES, centre, size);
    const left = centre.x - size * 1.15;
    const right = centre.x + size * 1.15;
    const top = centre.y - size;
    const rowH = (2 * size) / PASSES;
    // each pass, quickening, sweeping the other way
    const passes = Array.from({ length: PASSES }, (_, k) => {
      const start = sprayMs * (1 - (1 - k / PASSES) ** 1.4);
      const end = sprayMs * (1 - (1 - (k + 1) / PASSES) ** 1.4);
      return { start, end, y: top + rowH * (k + 0.5), ltr: k % 2 === 0 };
    });
    const nozzle: Point = { x: 0, y: 0 };
    const nozzleAt = (ms: number): Point => {
      let k = 0;
      while (k < PASSES - 1 && ms >= passes[k].end) k++;
      const p = passes[k];
      const u = clamp01((ms - p.start) / (p.end - p.start));
      nozzle.x = lerp(p.ltr ? [left, right] : [right, left], u);
      nozzle.y = p.y - NOZZLE_ABOVE;
      return nozzle;
    };
    const spray = planSpray(nozzleAt, Math.PI / 2, {
      startMs: 0,
      endMs: sprayMs,
      reach: NOZZLE_ABOVE,
      spread: 0.45,
      flightMs: 220,
    });
    // each tile shows once the nozzle has passed over it on its row's pass
    const shows = tiles.map((t) => {
      const k = Math.min(
        PASSES - 1,
        Math.max(0, Math.floor((t.y - top) / rowH)),
      );
      const p = passes[k];
      const u = clamp01((t.x - left) / (right - left));
      return lerp([p.start, p.end], p.ltr ? u : 1 - u) + 120;
    });
    const doneAt = Math.max(...shows);
    const shatterAt = doneAt + blazeMs;
    const levels = new Map(
      bars.map((b) => [b, levelsFor(b.floor, levelShare)]),
    );
    const shards: Shard[] = tiles.map((from, i) => {
      const bar = bars[i % bars.length];
      const to: Point = {
        x: bar.box.x + bar.box.width * lerp([0.1, 0.9], Math.random()),
        y: bar.center.y,
      };
      const leaves = shatterAt + Math.random() * 120;
      return {
        from,
        bar,
        to,
        bow: { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - BOW },
        leaves,
        lands: leaves + shatterMs,
      };
    });
    const firstLands = bars.map((b) =>
      Math.min(...shards.filter((s) => s.bar === b).map((s) => s.lands)),
    );
    const endMs = Math.max(...shards.map((s) => s.lands));

    const sweeping = createBeats(
      passes,
      (p) => p.start,
      (_, k) => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(PASS_SHAKE, k / (PASSES - 1)));
      },
    );
    const finishing = createBeats(
      [doneAt, shatterAt],
      (ms) => ms,
      (ms) => {
        cover!.burst(centre, ms === doneAt ? 1 : 1.3);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(BLAZE_SHAKE);
      },
    );
    const landing = createBeats(
      bars,
      (_, k) => firstLands[k],
      (bar, k) => {
        cover!.levels(bar, levels.get(bar)!, centre);
        if (firstLands[k] === Math.max(...firstLands)) {
          for (const b of bars) cover!.slam(b);
          cover!.blast(bar.center);
          return;
        }
        if (cover!.isLive()) shakeScreen(LAND_SHAKE);
      },
    );

    const mist: Point = { x: 0, y: 0 };
    const flying: Point = { x: 0, y: 0 };
    const nozzleSpot = (ms: number): Point | null =>
      ms < 0 || ms > sprayMs ? null : nozzleAt(ms);
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          sweeping.tick(ms, now);
          finishing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          if (ms < shatterAt) {
            // the tiles the mist has reached
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            for (let i = 0; i < tiles.length; i++) {
              if (ms < shows[i]) continue;
              const pop = clamp01((ms - shows[i]) / 150);
              const blaze = clamp01((ms - doneAt) / 150);
              stampGlimmer(
                ctx,
                tiles[i].x,
                tiles[i].y - NOZZLE_ABOVE * 0.6 * (1 - pop),
                TILE * pop * (1 + 0.6 * blaze),
                i + ms * 0.004,
                blaze > 0.5 || i % 3 === 0 ? COLOR.white : COLOR.heavenlyGold,
              );
            }
            ctx.restore();
            if (ms <= sprayMs) {
              drawSpray(ctx, spray, ms, now, SPRAY);
              drawSprayMist(
                ctx,
                sprayLandsAt(spray, ms, mist),
                ms,
                1,
                MIST,
                now,
              );
              drawWisp(ctx, nozzleSpot, ms, now, NOZZLE, 0.7);
            }
            return;
          }
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (let i = 0; i < shards.length; i++) {
            const s = shards[i];
            if (ms >= s.lands) continue;
            if (ms < s.leaves) {
              flying.x = s.from.x;
              flying.y = s.from.y;
            } else
              bezier(
                s.from,
                s.bow,
                s.to,
                easeIn((ms - s.leaves) / shatterMs),
                flying,
              );
            stampGlimmer(
              ctx,
              flying.x,
              flying.y,
              TILE * 1.2,
              i + ms * 0.005,
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
