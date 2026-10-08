// the "Thunder Rings" event (lightning; cash): it covers its crit, whose
// click freezes the screen while lightning cracks down out of the sky onto
// the screen, and out of every strike a ring of lightning blasts outward,
// a crackling loop of bolts swelling wider and wider; each strike a blinding
// flash, a bang, a jolt and a burst of coins; strike after strike, ever
// quicker, until the last bolt hammers the middle of the screen and three
// rings ripple out of it at once in a huge blast and shake. Pays floor
// income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { createBeats } from "../../../../shared/eventBeats";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "thunderRings";
const REWARD = 4;
const STRIKES = 4;
const EDGE = 120;
const TOP = 150;
// each ring SIDES bolts round, swelling to REACH px over ringMs
const SIDES = 6;
const REACH: [number, number] = [160, 260];
const FINAL_RINGS = 3;
const FINAL_GAP_MS = 90;
const BOLT_MS = 160;
const COINS = 26;
const COIN_REACH: [number, number] = [40, 170];
const HIT_SHAKE: [number, number] = [0.8, 1.4];

interface Ring {
  at: Point;
  starts: number;
  reach: number;
  corners: Point[];
  bolts: Bolt[];
}

export const forceThunderRingsEvent = registerWispEvent(
  KEY,
  "Thunder Rings",
  () => CONFIG.thunderRingsEvent.chance,
  (floor, context, area) => {
    const { strikesMs, ringMs, holdMs, mergeMs } = CONFIG.thunderRingsEvent;
    const ring = (at: Point, starts: number, reach: number): Ring => {
      const corners = Array.from({ length: SIDES }, () => ({
        x: at.x,
        y: at.y,
      }));
      return {
        at,
        starts,
        reach,
        corners,
        bolts: corners.map((c, i) =>
          createBolt(c, corners[(i + 1) % SIDES], 0),
        ),
      };
    };
    const middle: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 + 40,
    };
    let clock = 0;
    const strikes = Array.from({ length: STRIKES + 1 }, (_, k) => {
      const final = k === STRIKES;
      const at: Point = final
        ? middle
        : {
            x: lerp([area.left + EDGE, area.right - EDGE], Math.random()),
            y: lerp([area.top + TOP + 100, area.bottom - EDGE], Math.random()),
          };
      const hits = clock;
      clock += final ? 0 : lerp(strikesMs, k / (STRIKES - 1));
      const sky: Point = {
        x: at.x + (Math.random() - 0.5) * 160,
        y: area.top + TOP - 60,
      };
      const rings = final
        ? Array.from({ length: FINAL_RINGS }, (_, r) =>
            ring(at, hits + r * FINAL_GAP_MS, REACH[1] * (1 + r * 0.35)),
          )
        : [ring(at, hits, lerp(REACH, k / STRIKES))];
      return { at, hits, final, bolt: createBolt(sky, at, 2), rings };
    });
    const last = strikes[STRIKES];
    const rings = strikes.flatMap((s) => s.rings);
    const endAt = last.hits + (FINAL_RINGS - 1) * FINAL_GAP_MS + ringMs;

    const striking = createBeats(
      strikes,
      (s) => s.hits,
      (s, k) => {
        cover!.launchFrom(
          s.at,
          ringTargets(s.at, s.final ? COINS * 2 : COINS, COIN_REACH),
        );
        if (s.final) {
          cover!.blast(s.at);
          return;
        }
        cover!.burst(s.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / (STRIKES - 1)));
      },
    );
    const rippling = createBeats(
      rings.filter((r) => r.starts > last.hits),
      (r) => r.starts,
      () => {
        if (cover?.isLive()) shakeScreen(1.2);
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
          striking.tick(ms, now);
          rippling.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const s of strikes) {
            const t = (ms - s.hits) / BOLT_MS;
            if (t < 0 || t >= 1) continue;
            drawBolt(ctx, s.bolt, 1 - t, s.final ? 1.6 : 1);
            drawStrike(ctx, s.at, 1 - t, s.final ? 2 : 1.2, now);
          }
          for (const r of rings) {
            const t = (ms - r.starts) / ringMs;
            if (t < 0 || t >= 1) continue;
            const radius = r.reach * easeOut(t);
            for (let i = 0; i < SIDES; i++) {
              const a = (i / SIDES) * Math.PI * 2 + t;
              r.corners[i].x = r.at.x + Math.cos(a) * radius;
              r.corners[i].y = r.at.y + Math.sin(a) * radius;
            }
            const alpha = 1 - clamp01((t - 0.6) / 0.4);
            for (const bolt of r.bolts) drawBolt(ctx, bolt, alpha, 0.8);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
