// the "Shaped Charge" event (explosion; crit tiers): it covers its crit, whose
// click freezes the screen while a ring of bomb wisps flies out of the
// clicked floor's button and closes round an income bar, fuses fizzing and
// blinking faster; they all go off at once, their blasts driving inward into
// one white blast on the bar with a bang and a big jolt, and it jumps a crit
// tier; the ring of charges sets again round the next bar, quicker each
// time, and the last goes off in a huge blast and shake. Then the crit's
// tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../shared/explosion";
import { findRewardBars } from "../eventRewards";

const KEY = "shapedCharge";
const MAX_BARS = 3;
const CHARGES = 6;
// the ring sits RING px round the bar, the charges closing in over SET_MS
const RING = 120;
const SET_MS = 220;
const CHARGE = 0.32;
const FUSE = 16;
const SMALL = 90;
const BIG = 220;
const BLOW_SHAKE: [number, number] = [0.8, 1.5];

export const forceShapedChargeEvent = registerWispEvent(
  KEY,
  "Shaped Charge",
  () => CONFIG.shapedChargeEvent.chance,
  (floor, context) => {
    const { fusesMs, holdMs, mergeMs } = CONFIG.shapedChargeEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    const sets = bars.map((bar, k) => {
      const turn = Math.random() * Math.PI;
      const ring = Array.from({ length: CHARGES }, (_, i) => {
        const a = turn + (i / CHARGES) * Math.PI * 2;
        return {
          x: bar.center.x + Math.cos(a) * RING,
          y: bar.center.y + Math.sin(a) * RING * 0.7,
        } as Point;
      });
      const placed = clock;
      clock += SET_MS + lerp(fusesMs, k / Math.max(1, bars.length - 1));
      return { bar, ring, placed, blows: clock, from: k === 0 ? null : k - 1 };
    });
    const last = sets[sets.length - 1];
    const endAt = last.blows;
    const charges = sets.flatMap((set) =>
      set.ring.map((spot, i) => {
        const at: Point = { x: 0, y: 0 };
        const start: Point =
          set.from === null ? button : sets[set.from].bar.center;
        return {
          set,
          spot,
          at: (ms: number): Point | null => {
            if (ms < set.placed || ms >= set.blows) return null;
            const u = easeOut(clamp01((ms - set.placed) / SET_MS));
            at.x =
              lerp([start.x, spot.x], u) +
              Math.sin(ms / 30 + i) * (u === 1 ? 1.5 : 0);
            at.y = lerp([start.y, spot.y], u);
            return at;
          },
        };
      }),
    );

    const blowing = createBeats(
      sets,
      (s) => s.blows,
      (s, k) => {
        cover!.tierUp(s.bar);
        if (s === last) {
          cover!.slam(s.bar);
          cover!.blast(s.bar.center);
          return;
        }
        cover!.burst(s.bar.center, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BLOW_SHAKE, k / Math.max(1, sets.length - 1)));
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
        tick: (ms, now) => blowing.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_200) return;
          for (const s of sets) {
            const t = ms - s.blows;
            if (t < 0 || t > 900) continue;
            for (const spot of s.ring) drawDetonation(ctx, spot, t, SMALL, now);
            if (s !== last) drawDetonation(ctx, s.bar.center, t - 80, BIG, now);
          }
          for (const c of charges) {
            const p = c.at(ms);
            if (p)
              drawLitFuse(
                ctx,
                p,
                clamp01((ms - c.set.placed) / (c.set.blows - c.set.placed)),
                FUSE,
                now,
              );
            drawWispBetween(
              ctx,
              c.at,
              ms,
              now,
              WISP_SIZE * CHARGE,
              0.6,
              c.set.placed,
              c.set.blows,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
