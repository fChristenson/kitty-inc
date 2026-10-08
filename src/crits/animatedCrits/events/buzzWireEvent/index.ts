// the "Buzz Wire" event (lightning; free upgrade levels): it covers its
// crit, whose click freezes the screen while a wire of light strings itself
// down the screen, weaving low over every income bar like a buzz-wire game,
// and a ring wisp races down it, faster and faster, the wire charging white
// behind it; every time the ring brushes the wire over a bar a jagged bolt
// cracks down into the bar with a blinding flash and a jolt of free levels;
// at the wire's end over the clicked bar the whole wire discharges into it
// in a colossal bolt and a huge blast. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawGlitterLight,
  drawWisp,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { alongRoute } from "../../../../shared/curves";
import { drawBeam } from "../../../../shared/beam";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { measure, pointAlong, sampleLine } from "../../cashFlow";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "buzzWire";
const MAX_BARS = 4;
// px the wire runs above each bar, and the share of the run it starts slow
const ABOVE = 72;
const SLOW = 0.35;
const STEPS = 14;
const SIDE = 50;
const RING = 0.55;
const LOOP = 18;
const BOLT_MS = 220;
const FLASH_MS = 450;
const FINAL_SCALE = 2.2;
const HIT_SHAKE: [number, number] = [0.6, 1.2];

interface Brush {
  bar: RewardBar;
  at: Point;
  to: Point;
  ms: number;
  bolt: Bolt;
  final: boolean;
}

export const forceBuzzWireEvent = registerWispEvent(
  KEY,
  "Buzz Wire",
  () => CONFIG.buzzWireEvent.chance,
  (floor, context, area) => {
    const { runMs, levelShare, holdMs, mergeMs } = CONFIG.buzzWireEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const clicked =
      bars.find((b) => b.floor === floor) ?? bars[bars.length - 1];
    const order = [...bars.filter((b) => b !== clicked), clicked];

    // weaving over each bar in turn, swinging out to a side between them
    const route: Point[] = [
      { x: area.left - 40, y: Math.max(area.top + 40, order[0].box.y - 200) },
    ];
    const stops: { bar: RewardBar; index: number; final: boolean }[] = [];
    order.forEach((bar, k) => {
      const ltr = k % 2 === 0;
      const xs = ltr ? [0.22, 0.62] : [0.78, 0.38];
      for (let j = 0; j < 2; j++) {
        const final = bar === clicked && j === 1;
        route.push({
          x: bar.box.x + bar.box.width * (final ? 0.5 : xs[j]),
          y: bar.box.y - ABOVE + (j === 0 ? 10 : -10),
        });
        stops.push({ bar, index: route.length - 1, final });
      }
      const next = order[k + 1];
      if (next)
        route.push({
          x: ltr ? area.right - SIDE : area.left + SIDE,
          y: (bar.box.y + next.box.y) / 2 - ABOVE,
        });
    });
    const line = sampleLine(
      (u) => alongRoute(route, u, { x: 0, y: 0 }),
      (route.length - 1) * STEPS,
    );
    const along = measure(line);
    const length = along[along.length - 1];
    // accelerating: distance = length·(SLOW·u + (1 − SLOW)·u²)
    const reached = (ms: number) => {
      const u = clamp01(ms / runMs);
      return length * (SLOW * u + (1 - SLOW) * u * u);
    };
    const msAt = (s: number) =>
      ((-SLOW + Math.sqrt(SLOW * SLOW + 4 * (1 - SLOW) * (s / length))) /
        (2 * (1 - SLOW))) *
      runMs;
    const brushes: Brush[] = stops.map(({ bar, index, final }) => {
      const at = line[index * STEPS];
      const to: Point = { x: at.x, y: bar.center.y };
      return {
        bar,
        at,
        to,
        ms: msAt(along[index * STEPS]),
        bolt: createBolt(at, to, final ? 3 : 1),
        final,
      };
    });
    const endAt = runMs + FLASH_MS;

    const ring: Point = { x: 0, y: 0 };
    const ringAt = (ms: number): Point | null =>
      ms < 0 || ms > runMs
        ? null
        : pointAlong(line, along, reached(ms) / length, ring);

    const brushing = createBeats(
      brushes,
      (b) => b.ms,
      (b, k) => {
        if (b.final) {
          cover!.levels(b.bar, levelsFor(b.bar.floor, levelShare * 4, 6), b.at);
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(b.bar.center);
          return;
        }
        cover!.levels(b.bar, levelsFor(b.bar.floor, levelShare, 2), b.at);
        cover!.burst(b.to, 0.4);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, brushes.length - 1)));
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
        tick: (ms, now) => brushing.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          const charged = reached(ms);
          const flash = ms > runMs ? 1 - (ms - runMs) / FLASH_MS : 0;
          for (let i = 2; i < line.length; i += 2) {
            const hot = along[i] <= charged;
            drawBeam(
              ctx,
              line[i - 2],
              line[i],
              flash > 0 ? 6 + 10 * flash : hot ? 7 : 4,
              flash > 0 ? flash : hot ? 0.85 : 0.35,
            );
          }
          for (const b of brushes) {
            const t = (ms - b.ms) / (b.final ? FLASH_MS : BOLT_MS);
            if (t < 0 || t >= 1) continue;
            const scale = b.final ? FINAL_SCALE : 1;
            drawBolt(ctx, b.bolt, 1 - t, scale);
            drawStrike(ctx, b.to, 1 - t, scale, now);
          }
          const at = ringAt(ms);
          if (at)
            for (let k = 0; k < 6; k++) {
              const a = (k / 6) * Math.PI * 2 + ms * 0.012;
              drawGlitterLight(
                ctx,
                at.x + Math.cos(a) * LOOP,
                at.y + Math.sin(a) * LOOP * 0.6,
                7,
                k,
                0.9,
                now,
              );
            }
          drawWisp(ctx, ringAt, ms, now, WISP_SIZE * RING, 0.8);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
