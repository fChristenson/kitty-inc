// the "Corona" event (beam; cash): it covers its crit, whose click freezes
// the screen while a blazing sun wisp swells in the middle of the screen; a
// moon (nothing but a dark gap ringed by beams) slides across it while
// blazing corona beams flare out all round its rim, longer and brighter as
// the eclipse deepens, sweeping round and spraying coins; at totality a
// diamond ring flashes on its rim, then every beam fires outward at once,
// spraying a sea of cash, and it all collapses into the total in a huge
// blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { CoinPath } from "../coins";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import {
  clamp01,
  easeIn,
  easeOut,
  easeOutCubic,
  lerp,
} from "../../shared/easing";
import { drawBeam, drawBeamFlare } from "../../shared/beam";
import { createBeats } from "../../shared/eventBeats";
import { sprayTargets } from "../../shared/coinTargets";
import { hash01 } from "../../shared/twinkle";
import { totalSpot } from "../cashFlow";

const KEY = "corona";
const REWARD = 4;
const RADIUS = 90;
const SUN = 3;
const BEAMS = 24;
// the moon starts this far off the sun (of its radius), and the beams'
// length past the rim (of the radius) as the eclipse deepens
const OFFSET: Point = { x: -2.4, y: 0.6 };
const REACH: [number, number] = [0.25, 2.4];
const WIDTH: [number, number] = [8, 24];
const SWEEP = 0.7;
const FIRED = 900;
const SPRAY_MS = 110;
const SPRAY_COINS = 14;
const CASH = 960;
const CASH_REACH: [number, number] = [30, 560];
const RING = 130;
const RING_ANGLE = -Math.PI / 4;
const BANG_GAP_MS = 60;

export const forceCoronaEvent = registerWispEvent(
  KEY,
  "Corona",
  () => CONFIG.coronaEvent.chance,
  (floor, context, area) => {
    const { swellMs, eclipseMs, ringMs, fireMs, collapseMs, holdMs, mergeMs } =
      CONFIG.coronaEvent;
    const sun: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 - 40,
    };
    const total = totalSpot(area);
    const totality = swellMs + eclipseMs;
    const fires = totality + ringMs;
    const collapses = fires + fireMs;
    const endAt = collapses + collapseMs;
    const eclipse = (ms: number) => clamp01((ms - swellMs) / eclipseMs);
    const moonAt = (ms: number, into: Point): Point => {
      const k = 1 - easeOut(eclipse(ms));
      into.x = sun.x + OFFSET.x * RADIUS * k;
      into.y = sun.y + OFFSET.y * RADIUS * k;
      return into;
    };
    const depth = (ms: number) => {
      const k = 1 - easeOut(eclipse(ms));
      return clamp01(1 - (Math.hypot(OFFSET.x, OFFSET.y) * k) / 2);
    };
    const turn = (ms: number) => SWEEP * eclipse(ms);
    const beamAngle = (i: number, ms: number) =>
      (i / BEAMS) * Math.PI * 2 + turn(ms);
    const beamReach = (i: number) => 0.6 + 0.4 * hash01(i, 5);
    const sunWisp = (): Point => sun;
    const sunSize = (ms: number) =>
      WISP_SIZE * SUN * easeOut(clamp01(ms / swellMs)) * (1 - depth(ms)) ** 0.7;
    const moon: Point = { x: 0, y: 0 };
    const inner = Array.from({ length: BEAMS }, () => ({ x: 0, y: 0 }));
    const outer = Array.from({ length: BEAMS }, () => ({ x: 0, y: 0 }));
    const ring: Point = {
      x: sun.x + Math.cos(RING_ANGLE) * RADIUS,
      y: sun.y + Math.sin(RING_ANGLE) * RADIUS,
    };

    // the sea of cash the beams fire out, collapsing into the total
    const firedAngle = (i: number) => beamAngle(i, fires);
    const paths: CoinPath[] = Array.from({ length: CASH }, (_, j) => {
      const a = firedAngle(j % BEAMS) + (Math.random() - 0.5) * 0.16;
      const d = RADIUS + lerp(CASH_REACH, Math.random() ** 0.7);
      const from: Point = {
        x: sun.x + Math.cos(a) * RADIUS,
        y: sun.y + Math.sin(a) * RADIUS,
      };
      const out: Point = {
        x: sun.x + Math.cos(a) * d,
        y: sun.y + Math.sin(a) * d,
      };
      const leaves = collapses + collapseMs * 0.4 * Math.random();
      const flightMs = endAt - leaves;
      return (f) => {
        const ms = f * endAt;
        if (ms < fires) return { x: from.x, y: from.y, scale: 0 };
        if (ms < leaves) {
          const p = easeOutCubic(clamp01((ms - fires) / fireMs));
          return {
            x: lerp([from.x, out.x], p),
            y: lerp([from.y, out.y], p),
            scale: 0.75,
          };
        }
        const p = easeIn(clamp01((ms - leaves) / flightMs));
        return {
          x: lerp([out.x, total.x], p),
          y: lerp([out.y, total.y], p),
          scale: 0.75,
        };
      };
    });

    const sprays = Array.from(
      { length: Math.floor(eclipseMs / SPRAY_MS) },
      (_, k) => swellMs + (k + 1) * SPRAY_MS,
    );
    let lastBang = -Infinity;
    const spraying = createBeats(
      sprays,
      (ms) => ms,
      (ms, k) => {
        const i = (k * 7) % BEAMS;
        const a = beamAngle(i, ms);
        moonAt(ms, moon);
        const tip: Point = {
          x: moon.x + Math.cos(a) * RADIUS * (1 + lerp(REACH, depth(ms))),
          y: moon.y + Math.sin(a) * RADIUS * (1 + lerp(REACH, depth(ms))),
        };
        cover!.launchFrom(
          tip,
          sprayTargets(tip, SPRAY_COINS, [60, 220], a, 0.9),
        );
        if (!cover!.isLive()) return;
        shakeScreen(0.2 + 0.5 * depth(ms));
        if (ms - lastBang >= BANG_GAP_MS * 2) {
          lastBang = ms;
          playBloop();
        }
      },
    );
    const climax = createBeats(
      [totality, fires, endAt],
      (ms) => ms,
      (ms) => {
        if (ms === endAt) {
          cover!.blast(cover!.total() ?? total);
          return;
        }
        cover!.burst(ms === totality ? ring : sun, ms === totality ? 0.9 : 1.3);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(ms === totality ? 1 : 1.5);
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
          spraying.tick(ms, now);
          climax.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawWispBetween(ctx, sunWisp, ms, now, sunSize(ms), 1, 0, totality);
          moonAt(ms, moon);
          const deep = depth(ms);
          const fire = clamp01((ms - fires) / fireMs);
          const collapse = clamp01((ms - collapses) / collapseMs);
          const width = lerp(WIDTH, deep) * (1 + fire) * (1 - collapse);
          const alpha = (0.3 + 0.7 * deep) * (1 - collapse);
          for (let i = 0; i < BEAMS; i++) {
            const a = beamAngle(i, ms);
            const c = Math.cos(a);
            const s = Math.sin(a);
            const flicker = 1 + 0.12 * Math.sin(now * 0.02 + i * 1.7);
            const reach =
              RADIUS * (1 + lerp(REACH, deep) * beamReach(i) * flicker) +
              FIRED * easeOutCubic(fire);
            inner[i].x = moon.x + c * RADIUS;
            inner[i].y = moon.y + s * RADIUS;
            outer[i].x = lerp([moon.x + c * reach, total.x], easeIn(collapse));
            outer[i].y = lerp([moon.y + s * reach, total.y], easeIn(collapse));
            drawBeam(ctx, inner[i], outer[i], width, alpha);
          }
          if (ms >= totality && ms < fires + ringMs)
            drawBeamFlare(
              ctx,
              ring,
              RING * (1 - clamp01((ms - totality) / (ringMs * 2))),
              1,
              now,
            );
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
