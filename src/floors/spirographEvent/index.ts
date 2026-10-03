// the "Spirograph" event (beam; free upgrade levels): it covers its crit,
// whose click freezes the screen while two wisps fly out of the clicked
// floor's button onto rings round the middle of the screen, a blazing beam
// strung between them, and whirl round opposite ways, ever faster, the
// beam's afterglow tracing a glowing rosette over the screen; every bar the
// beam sweeps across jolts with a flare, a bang and free levels; then both
// spiral into the middle and the beam collapses in a huge blast and shake
// as every bar slams. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../shared/beam";
import { findRewardBars, levelsFor, type RewardBar } from "../eventRewards";

const KEY = "spirograph";
const MAX_BARS = 5;
// the rings' radii as shares of the screen's half-width, and their laps a
// second (the inner ring whirls the other way), ramping up
const OUTER = 0.95;
const INNER = 0.4;
const OUTER_LAPS: [number, number] = [0.35, 1.1];
const INNER_LAPS: [number, number] = [-0.8, -2.2];
// each bar earns levels on at most CUTS sweeps
const CUTS = 3;
const BEAM = 16;
// GHOSTS afterglows, GHOST_MS apart
const GHOSTS = 7;
const GHOST_MS = 45;
const FLARE = 26;
const EMITTER = 0.6;
const SWEEP_SHAKE: [number, number] = [0.4, 1.1];

export const forceSpirographEvent = registerWispEvent(
  KEY,
  "Spirograph",
  () => CONFIG.spirographEvent.chance,
  (floor, context, area) => {
    const { enterMs, whirlMs, collapseMs, levelShare, holdMs, mergeMs } =
      CONFIG.spirographEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const c: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const half = (area.right - area.left) / 2;
    const whirlEnd = enterMs + whirlMs;
    const endAt = whirlEnd + collapseMs;
    const turns = (laps: [number, number], ms: number) => {
      const s = clamp01((ms - enterMs) / whirlMs) * (whirlMs / 1000);
      return (
        Math.PI *
        2 *
        (laps[0] * s + ((laps[1] - laps[0]) * s * s) / (2 * (whirlMs / 1000)))
      );
    };
    const startA = Math.random() * Math.PI * 2;
    const startB = startA + Math.PI * (0.5 + Math.random());
    // an emitter's spot at ms: flying out, whirling, spiralling in
    const emitter = (
      radius: number,
      laps: [number, number],
      start: number,
      ms: number,
      into: Point,
    ): Point => {
      const angle = start + turns(laps, Math.min(ms, whirlEnd));
      const shrink = 1 - easeIn(clamp01((ms - whirlEnd) / collapseMs));
      into.x = c.x + Math.cos(angle) * radius * shrink;
      into.y = c.y + Math.sin(angle) * radius * shrink;
      if (ms < enterMs) {
        const u = easeOut(clamp01(ms / enterMs));
        into.x = lerp([button.x, into.x], u);
        into.y = lerp([button.y, into.y], u);
      }
      return into;
    };
    const a: Point = { x: 0, y: 0 };
    const b: Point = { x: 0, y: 0 };
    const place = (ms: number) => {
      emitter(half * OUTER, OUTER_LAPS, startA, ms, a);
      emitter(half * INNER, INNER_LAPS, startB, ms, b);
    };
    // every time the beam's line sweeps across each bar's middle while the
    // bar lies between its ends
    const sweeps: { bar: RewardBar; at: number }[] = [];
    for (const bar of bars) {
      let before = 0;
      let cuts = 0;
      for (let ms = enterMs; ms <= whirlEnd && cuts < CUTS; ms += 6) {
        place(ms);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const side = dx * (bar.center.y - a.y) - dy * (bar.center.x - a.x);
        const along =
          ((bar.center.x - a.x) * dx + (bar.center.y - a.y) * dy) /
          (dx * dx + dy * dy || 1);
        if (before * side < 0 && along > 0 && along < 1) {
          sweeps.push({ bar, at: ms });
          cuts++;
        }
        before = side;
      }
    }
    sweeps.sort((p, q) => p.at - q.at);
    const pointA: Point = { x: 0, y: 0 };
    const pointB: Point = { x: 0, y: 0 };
    const emitterA = (ms: number): Point | null =>
      ms < 0 || ms > endAt
        ? null
        : emitter(half * OUTER, OUTER_LAPS, startA, ms, pointA);
    const emitterB = (ms: number): Point | null =>
      ms < 0 || ms > endAt
        ? null
        : emitter(half * INNER, INNER_LAPS, startB, ms, pointB);

    const sweeping = createBeats(
      sweeps,
      (s) => s.at,
      (s, k) => {
        const t = k / Math.max(1, sweeps.length - 1);
        cover!.levels(s.bar, levelsFor(s.bar.floor, levelShare, 1), c);
        cover!.burst(s.bar.center, 0.35 + 0.35 * t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SWEEP_SHAKE, t));
      },
    );
    const collapsing = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(c);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          sweeping.tick(ms, now);
          collapsing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          const heat = clamp01(ms / whirlEnd);
          for (let g = GHOSTS; g >= 1; g--) {
            const at = ms - g * GHOST_MS;
            if (at < enterMs) continue;
            place(at);
            drawBeam(
              ctx,
              a,
              b,
              BEAM * 0.6,
              (1 - g / (GHOSTS + 1)) * 0.5 * heat,
            );
          }
          if (ms >= enterMs) {
            place(ms);
            drawBeam(ctx, a, b, BEAM);
            drawBeamFlare(ctx, a, FLARE, 1, now);
            drawBeamFlare(ctx, b, FLARE, 1, now);
          }
          drawWispBetween(
            ctx,
            emitterA,
            ms,
            now,
            WISP_SIZE * EMITTER,
            heat,
            0,
            endAt,
          );
          drawWispBetween(
            ctx,
            emitterB,
            ms,
            now,
            WISP_SIZE * EMITTER,
            heat,
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);
