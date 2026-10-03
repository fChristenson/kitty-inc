// the "Influx" event (money; cash): it covers its crit, whose click freezes
// the screen while eight rivers of cash pour in at once off all four edges
// and corners of the screen, swirling in like a pinwheel onto the middle,
// where they pile into a churning, growing heap of coins; every river's
// arrival is a splash, a bang and a jolt; the heap swells and quakes, then
// erupts straight up into the total in a huge blast and shake. Pays floor
// income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { CoinPath } from "../coins";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { ringTargets } from "../../shared/coinTargets";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../cashFlow";

const KEY = "influx";
const REWARD = 4;
const OUT = 40;
// rivers set off in this order, STAGGER ms apart, bowed BEND of their length
const ORDER = [0, 4, 2, 6, 1, 5, 3, 7];
const STAGGER = 60;
const BEND = 0.22;
const HEAP = 700;
const COIN = 0.42;
const POP_MS = 120;
// the heap's radius grows over HEAP_R, flattened to SQUASH tall, mounded MOUND
const HEAP_R: [number, number] = [30, 170];
const SQUASH = 0.55;
const MOUND = 0.6;
const SPIN = 0.004;
const QUAKE = 10;
const ERUPT_STAGGER = 160;
const SPLASH = 10;
const SPLASH_REACH: [number, number] = [30, 120];
const ARRIVE_SHAKE: [number, number] = [0.4, 1.2];
const ERUPT_SHAKE = 1.6;
const BANG_GAP_MS = 60;

export const forceInfluxEvent = registerWispEvent(
  KEY,
  "Influx",
  () => CONFIG.influxEvent.chance,
  (floor, context, area) => {
    const { riverMs, churnMs, eruptMs, holdMs, mergeMs } = CONFIG.influxEvent;
    const fallback = totalSpot(area);
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: lerp([area.top, area.bottom], 0.55),
    };
    const l = area.left - OUT;
    const r = area.right + OUT;
    const t = area.top - OUT;
    const b = area.bottom + OUT;
    const sources: Point[] = [
      { x: l, y: t },
      { x: center.x, y: t },
      { x: r, y: t },
      { x: r, y: center.y },
      { x: r, y: b },
      { x: center.x, y: b },
      { x: l, y: b },
      { x: l, y: center.y },
    ];
    const far = Math.max(
      ...sources.map((s) => Math.hypot(s.x - center.x, s.y - center.y)),
    );
    const p: Point = { x: 0, y: 0 };
    const rivers = sources.map((src, k) => {
      const dx = center.x - src.x;
      const dy = center.y - src.y;
      const length = Math.hypot(dx, dy);
      const ctrl: Point = {
        x: (src.x + center.x) / 2 - dy * BEND,
        y: (src.y + center.y) / 2 + dx * BEND,
      };
      const travelMs = riverMs * (0.7 + (0.3 * length) / far);
      const starts = ORDER.indexOf(k) * STAGGER;
      const pour: Pour = {
        coinsAlong: 380,
        width: 30,
        streamMs: travelMs * 0.8,
        travelMs,
      };
      const toward = 1 / (length || 1);
      return {
        starts,
        arrives: starts + travelMs,
        pour,
        line: sampleLine((v) => ({ ...bezier(src, ctrl, center, v, p) }), 30),
        splash: {
          x: center.x - dx * toward * HEAP_R[0],
          y: center.y - dy * toward * HEAP_R[0] * SQUASH,
        } as Point,
      };
    });
    const firstIn = Math.min(...rivers.map((v) => v.arrives));
    const lastIn = Math.max(...rivers.map((v) => v.arrives));
    const eruptAt = lastIn + churnMs;
    const endAt = eruptAt + ERUPT_STAGGER + eruptMs;
    const radiusAt = (ms: number) =>
      lerp(HEAP_R, clamp01((ms - firstIn) / (eruptAt - firstIn)));
    // the heap quakes harder as it nears the eruption
    const quakeAt = (ms: number) =>
      QUAKE * clamp01((ms - lastIn) / churnMs) * Math.sin(ms * 0.09);

    const paths: CoinPath[] = Array.from({ length: HEAP }, () => {
      const r = Math.sqrt(Math.random());
      const angle = Math.random() * Math.PI * 2;
      const pops = firstIn + Math.random() * (lastIn - firstIn + 80);
      const leaves = eruptAt + r * ERUPT_STAGGER;
      const place = (ms: number) => {
        const radius = radiusAt(ms);
        const a = angle + ms * SPIN * (1.3 - r);
        return {
          x: center.x + Math.cos(a) * r * radius + quakeAt(ms),
          y:
            center.y +
            Math.sin(a) * r * radius * SQUASH -
            (1 - r) * radius * MOUND,
        };
      };
      return (f) => {
        const ms = f * endAt;
        if (ms < pops) return { x: center.x, y: center.y, scale: 0 };
        if (ms < leaves) {
          const at = place(ms);
          return {
            x: at.x,
            y: at.y,
            scale: COIN * easeOut(clamp01((ms - pops) / POP_MS)),
          };
        }
        const from = place(leaves);
        const total = cover?.total() ?? fallback;
        const u = clamp01((ms - leaves) / eruptMs);
        return {
          x: lerp([from.x, total.x], easeIn(u)),
          y: lerp([from.y, total.y], u ** 1.5),
          scale: COIN,
        };
      };
    });
    const durationMs = Math.max(
      ...rivers.map((v) => pourDurationMs(v.starts, v.pour)),
      endAt + holdMs + mergeMs,
    );

    let lastBang = -Infinity;
    const pouring = createBeats(
      rivers,
      (v) => v.starts,
      (v) => pourLine(cover!, v.line, v.pour),
    );
    const arriving = createBeats(
      rivers,
      (v) => v.arrives,
      (v, k, now) => {
        cover!.burst(v.splash, 0.5);
        cover!.launchFrom(
          v.splash,
          ringTargets(v.splash, SPLASH, SPLASH_REACH),
        );
        if (!cover!.isLive()) return;
        shakeScreen(lerp(ARRIVE_SHAKE, ORDER.indexOf(k) / (ORDER.length - 1)));
        if (now - lastBang < BANG_GAP_MS) return;
        lastBang = now;
        playExplosion();
      },
    );
    const erupting = createBeats(
      [eruptAt],
      (ms) => ms,
      () => {
        cover!.burst(center, 1);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(ERUPT_SHAKE);
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
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          pouring.tick(ms, now);
          arriving.tick(ms, now);
          erupting.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
