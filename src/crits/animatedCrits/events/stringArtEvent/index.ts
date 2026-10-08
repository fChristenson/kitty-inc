// the "String Art" event (beam; levels): it covers its crit, whose click
// freezes the screen while gold pins pop up along the clicked floor's bar
// and the bar farthest from it, and two rails of light join their ends; then
// strings of light shoot from pin to rail like string art, corner after
// corner in quick turns, each one twanging taut with a ping and a jolt that
// lands free levels on the bar it's pinned to, until four curves of
// straight strings bow in from the corners and frame a glowing hollow; the
// web blazes, then every string folds flat down onto its bar in a sweep
// and both bars blast and slam. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { COLOR } from "../../../../palette";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { stampGlimmer } from "../../../../shared/twinkle";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "stringArt";
// pins along each side, so PINS - 1 strings per corner
const PINS = 9;
const STRING_W = 5;
const STRING_ALPHA = 0.55;
const RAIL_W = 6;
const RAIL_ALPHA = 0.3;
const PIN = 20;
const FLARE = 16;
const TWANG_SHAKE: [number, number] = [0.15, 0.45];
const BLAZE_SHAKE = 0.8;
const FOLD_SHAKE = 1;
const SOUND_GAP_MS = 45;

interface Thread {
  // pinned on its bar, tied off on a rail
  pin: Point;
  tie: Point;
  bar: RewardBar;
  shotAt: number;
}

export const forceStringArtEvent = registerWispEvent(
  KEY,
  "String Art",
  () => CONFIG.stringArtEvent.chance,
  (floor, context) => {
    const {
      pinMs,
      weaveMs,
      shootMs,
      blazeMs,
      foldMs,
      levelShare,
      holdMs,
      mergeMs,
    } = CONFIG.stringArtEvent;
    const bars = findRewardBars(floor, context);
    const near = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!near) return;
    const far = bars.reduce((best, b) =>
      Math.abs(b.center.y - near.center.y) >
      Math.abs(best.center.y - near.center.y)
        ? b
        : best,
    );
    if (far === near) return;
    const left = Math.min(near.box.x, far.box.x);
    const right = Math.max(
      near.box.x + near.box.width,
      far.box.x + far.box.width,
    );
    const width = right - left;
    const height = Math.abs(far.center.y - near.center.y);
    const top = far.center.y < near.center.y ? far : near;
    const bottom = top === near ? far : near;

    // each corner: its bar, its corner point and which way its bar and rail run
    const corners = [
      { bar: top, x: left, y: top.center.y, ax: 1, by: 1 },
      { bar: top, x: right, y: top.center.y, ax: -1, by: 1 },
      { bar: bottom, x: right, y: bottom.center.y, ax: -1, by: -1 },
      { bar: bottom, x: left, y: bottom.center.y, ax: 1, by: -1 },
    ];
    const count = (PINS - 1) * corners.length;
    const threads: Thread[] = [];
    for (let k = 1; k < PINS; k++)
      corners.forEach((c) => {
        const i = threads.length;
        threads.push({
          pin: { x: c.x + c.ax * width * (k / PINS), y: c.y },
          tie: { x: c.x, y: c.y + c.by * height * (1 - k / PINS) },
          bar: c.bar,
          shotAt: pinMs + (i * weaveMs) / count,
        });
      });
    const pins = [...threads.map((t) => t.pin), ...threads.map((t) => t.tie)];
    const wovenAt = threads[threads.length - 1].shotAt + shootMs;
    const foldAt = wovenAt + blazeMs;
    const foldedAt = foldAt + foldMs;
    const levels = new Map(
      [top, bottom].map((bar) => [bar, levelsFor(bar.floor, levelShare, 1)]),
    );
    let soundAt = -Infinity;

    const opening = createBeats(
      [0, foldAt],
      (ms) => ms,
      (ms) => {
        if (!cover!.isLive()) return;
        playSwoosh();
        if (ms > 0) shakeScreen(BLAZE_SHAKE);
      },
    );
    const twanging = createBeats(
      threads,
      (t) => t.shotAt + shootMs,
      (t, i, now) => {
        cover!.burst(t.tie, 0.25);
        cover!.levels(t.bar, levels.get(t.bar)!, t.tie);
        if (!cover!.isLive()) return;
        shakeScreen(lerp(TWANG_SHAKE, i / (count - 1)));
        if (now - soundAt >= SOUND_GAP_MS) {
          soundAt = now;
          playBloop();
        }
      },
    );
    const folding = createBeats(
      [foldedAt, foldedAt + 120],
      (ms) => ms,
      (_, k) => {
        const bar = k === 0 ? far : near;
        cover!.slam(bar);
        if (k === 0) {
          cover!.burst(bar.center, 1);
          if (cover!.isLive()) shakeScreen(FOLD_SHAKE);
        } else cover!.blast(bar.center);
      },
    );

    const tip: Point = { x: 0, y: 0 };
    const tie: Point = { x: 0, y: 0 };
    const railTop: Point = { x: 0, y: top.center.y };
    const railBottom: Point = { x: 0, y: top.center.y };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: foldedAt + 120 + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [top, bottom],
        tick: (ms, now) => {
          opening.tick(ms, now);
          twanging.tick(ms, now);
          folding.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > foldedAt) return;
          const grow = easeOut(clamp01(ms / pinMs));
          const fold = easeIn(clamp01((ms - foldAt) / foldMs));
          const blaze = ms < wovenAt ? 0 : 1 - fold;
          for (const x of [left, right]) {
            railTop.x = railBottom.x = x;
            railBottom.y = top.center.y + height * grow;
            drawBeam(ctx, railTop, railBottom, RAIL_W, RAIL_ALPHA * (1 - fold));
          }
          const alpha =
            STRING_ALPHA +
            (1 - STRING_ALPHA) * blaze * (0.7 + 0.3 * Math.sin(now / 40));
          for (const t of threads) {
            if (ms < t.shotAt) break;
            const u = easeOut(clamp01((ms - t.shotAt) / shootMs));
            // folded flat onto its bar: the tie swings down level with the pin
            tie.x = t.tie.x;
            tie.y = lerp([t.tie.y, t.pin.y], fold);
            tip.x = lerp([t.pin.x, tie.x], u);
            tip.y = lerp([t.pin.y, tie.y], u);
            drawBeam(ctx, t.pin, tip, STRING_W, alpha);
            if (u < 1) drawBeamFlare(ctx, tip, FLARE, 1, now);
          }
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (let i = 0; i < pins.length; i++) {
            const p = pins[i];
            const onRail = i >= threads.length;
            stampGlimmer(
              ctx,
              p.x,
              onRail
                ? lerp([p.y, threads[i - threads.length].pin.y], fold)
                : p.y,
              PIN * grow * (0.85 + 0.15 * Math.sin(ms / 70 + i)),
              ms * 0.002 + i,
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
  (floor, context) => findRewardBars(floor, context).length > 1,
);
