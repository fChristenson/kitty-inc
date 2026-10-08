// the "Javelin" event (lightning; free upgrade levels and a crit tier): it
// covers its crit, whose click freezes the screen while bolts of lightning
// crackle into being up in the sky, each drawn back like a javelin by a
// wisp, and are hurled down one after another, quicker each time; each
// spears into an income bar with a blinding crack, a bang and a jolt that
// lands free levels, and sticks there quivering and crackling; the last and
// biggest spears the clicked floor's bar, then every javelin discharges at
// once, forking, and the clicked bar jumps a crit tier in a huge blast and
// shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "javelin";
const MAX_BARS = 4;
// each javelin is LENGTH px long, sinks SINK px in and is thrown from SKY px
// over the screen, drawn back DRAW px over WIND_MS first
const LENGTH = 230;
const SINK = 36;
const SKY = 70;
const DRAW = 70;
const WIND_MS = 240;
const THICK = 0.7;
const LAST_THICK = 1.1;
const STRIKE_MS = 220;
const DISCHARGE_MS = 320;
const DISCHARGE_SCALE = 1.8;
const HAND = 0.6;
const HIT_SHAKE: [number, number] = [0.8, 1.6];

export const forceJavelinEvent = registerWispEvent(
  KEY,
  "Javelin",
  () => CONFIG.javelinEvent.chance,
  (floor, context, area) => {
    const { gapsMs, flyMs, chargeMs, levelShare, holdMs, mergeMs } =
      CONFIG.javelinEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    if (!own) return;
    const bars = [
      ...found.filter((b) => b !== own).slice(0, MAX_BARS - 1),
      own,
    ];
    let clock: number = WIND_MS;
    const throws = bars.map((bar, k) => {
      const fromLeft = k % 2 === 0;
      const launch: Point = {
        x: fromLeft
          ? area.left + 60 + Math.random() * 80
          : area.right - 60 - Math.random() * 80,
        y: area.top - SKY,
      };
      const impact: Point = {
        x: bar.center.x + (fromLeft ? -1 : 1) * bar.box.width * 0.18,
        y: bar.center.y,
      };
      const length = Math.hypot(impact.x - launch.x, impact.y - launch.y);
      const dx = (impact.x - launch.x) / length;
      const dy = (impact.y - launch.y) / length;
      const stuck: Point = { x: impact.x + dx * SINK, y: impact.y + dy * SINK };
      const butt: Point = {
        x: stuck.x - dx * LENGTH,
        y: stuck.y - dy * LENGTH,
      };
      const throwAt = clock;
      clock += lerp(gapsMs, k / Math.max(1, bars.length - 1));
      const head: Point = { x: 0, y: 0 };
      const tail: Point = { x: 0, y: 0 };
      return {
        bar,
        launch,
        impact,
        dx,
        dy,
        stuck,
        throwAt,
        hitAt: throwAt + flyMs,
        head,
        tail,
        bolt: createBolt(tail, head, 0),
        discharge: createBolt(butt, stuck, 3),
        thick: k === bars.length - 1 ? LAST_THICK : THICK,
      };
    });
    const last = throws[throws.length - 1];
    const endAt = last.hitAt + chargeMs;
    // where javelin j's head is at ms, its tail LENGTH px behind
    const place = (j: (typeof throws)[number], ms: number) => {
      if (ms < j.throwAt) {
        const u = easeOut(clamp01((ms - (j.throwAt - WIND_MS)) / WIND_MS));
        j.head.x = j.launch.x - j.dx * DRAW * u;
        j.head.y = j.launch.y - j.dy * DRAW * u;
      } else if (ms < j.hitAt) {
        const u = easeIn((ms - j.throwAt) / flyMs);
        j.head.x = lerp([j.launch.x, j.stuck.x], u);
        j.head.y = lerp([j.launch.y, j.stuck.y], u);
      } else {
        j.head.x = j.stuck.x;
        j.head.y = j.stuck.y;
      }
      j.tail.x = j.head.x - j.dx * LENGTH;
      j.tail.y = j.head.y - j.dy * LENGTH;
    };
    const hands = throws.map((j) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms < j.throwAt - WIND_MS || ms > j.throwAt) return null;
        place(j, ms);
        at.x = j.tail.x;
        at.y = j.tail.y;
        return at;
      };
    });

    const throwing = createBeats(
      throws,
      (j) => j.throwAt,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const hitting = createBeats(
      throws,
      (j) => j.hitAt,
      (j, k) => {
        const t = k / Math.max(1, throws.length - 1);
        cover!.levels(j.bar, levelsFor(j.bar.floor, levelShare, 2), j.launch);
        cover!.burst(j.impact, 0.6 + 0.4 * t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, t));
      },
    );
    const discharging = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        cover!.tierUp(own, last.launch);
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(own.center);
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
          throwing.tick(ms, now);
          hitting.tick(ms, now);
          discharging.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + DISCHARGE_MS) return;
          if (ms >= endAt) {
            const fade = 1 - (ms - endAt) / DISCHARGE_MS;
            for (const j of throws) {
              drawBolt(ctx, j.discharge, fade, DISCHARGE_SCALE * j.thick);
              drawStrike(ctx, j.impact, fade, 1.4, now);
            }
            return;
          }
          // crackling harder as the discharge nears
          const charge = clamp01((ms - last.hitAt) / chargeMs);
          for (const j of throws) {
            if (ms < j.throwAt - WIND_MS) continue;
            place(j, ms);
            const wind = clamp01((ms - (j.throwAt - WIND_MS)) / WIND_MS);
            const stuck = ms >= j.hitAt;
            const alpha = stuck ? 0.75 + 0.25 * Math.random() : wind;
            drawBolt(ctx, j.bolt, alpha, j.thick * (1 + charge * 0.5));
            const t = (ms - j.hitAt) / STRIKE_MS;
            if (t >= 0 && t < 1) drawStrike(ctx, j.impact, 1 - t, 1.2, now);
          }
          throws.forEach((j, k) =>
            drawWispBetween(
              ctx,
              hands[k],
              ms,
              now,
              WISP_SIZE * HAND,
              1,
              j.throwAt - WIND_MS,
              j.throwAt,
            ),
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).some((b) => b.floor === floor),
);
