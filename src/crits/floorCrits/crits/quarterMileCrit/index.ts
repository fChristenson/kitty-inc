// Quarter Mile, a floor crit: the number splits into two racer wisps that
// line up side by side at the top bar's left end, revving; three lights
// flash at the line, a tick and a jolt each, then they launch, flat out and
// faster every frame, neck and neck along the bar to its far end, the
// winner a nose ahead into the finish in a blast with its levels; the next
// bar's lights are already counting, quicker each; at its own bar the
// longest, fastest drag and the biggest blast
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import {
  drawWispBetween,
  drawWispHead,
  WISP_SIZE,
} from "../../../../shared/wisp";
import { playSpinTick, playSwoosh } from "../../../../sound";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../critPlayer";
import { BAR_HALF_H, ownLast } from "../../critPlayer/shared";

const IN_MS = 120;
// the lanes LANE px off the bar's middle, the start and finish END of its
// half width out; the lights LIGHTS of them LIGHT_MS apart (quicker each
// bar), the next bar's starting as this one launches
const LANE = BAR_HALF_H + 26;
const END = 0.95;
const LIGHTS = 3;
const LIGHT_MS: [number, number] = [90, 45];
const LIGHT = 60;
const LIGHT_FLASH_MS = 70;
// the drag DRAG_MS (its own OWN_DRAG_MS), accelerating as t^ACCEL, the
// loser LOSE_MS behind
const DRAG_MS: [number, number] = [170, 120];
const OWN_DRAG_MS = 190;
const ACCEL = 1.8;
const LOSE_MS = 25;
const RACER = WISP_SIZE * 1.2;
const REV = 5;
const BLAST = 180;
const OWN_BLAST = 420;
const LIGHT_STOPS = fadeStops(COLOR.white, 0.3);
// shakes by step: a bar, its own
const SHAKES = [0.9, 2.8];

interface Drag {
  bar: number;
  own: boolean;
  lights: number[];
  go: number;
  finish: number;
  // each racer's path, from its bar's middle
  racers: ((ms: number) => Point)[];
  // live: the bar's middle
  at: Point;
}
interface State {
  drags: Drag[];
  ticks: number[];
}
const states = new WeakMap<Running, State>();
const spot: Point = { x: 0, y: 0 };
const head: Point = { x: 0, y: 0 };
const atHead = () => head;

registerFloorCrit("quarterMileCrit", {
  plan(r, bars, hit) {
    const half = r.play.barHalfWidth * END;
    const order = ownLast(bars);
    const drags: Drag[] = [];
    const ticks: number[] = [];
    let t = IN_MS + 80;
    order.forEach((bar, k) => {
      const own = bar === 0;
      const u = k / Math.max(1, order.length - 1);
      const gap = lerp(LIGHT_MS[0], LIGHT_MS[1], u);
      const lights = Array.from({ length: LIGHTS }, (_, i) => t + i * gap);
      ticks.push(...lights);
      const go = t + LIGHTS * gap;
      const ms = own ? OWN_DRAG_MS : lerp(DRAG_MS[0], DRAG_MS[1], u);
      const finish = go + ms;
      const at: Point = { x: 0, y: 0 };
      const racers = [-1, 1].map((lane, i) => {
        const p: Point = { x: 0, y: 0 };
        const late = i === 1 ? LOSE_MS : 0;
        return (now: number): Point => {
          const v = clamp01((now - go) / (ms + late)) ** ACCEL;
          // revving on the line before the off
          const rev = now < go ? Math.sin(now * 0.8 + i) * REV : 0;
          p.x = at.x + lerp(-half, half, v) + rev;
          p.y = at.y + lane * LANE;
          return p;
        };
      });
      drags.push({ bar, own, lights, go, finish, racers, at });
      hit(bar, finish, own ? 1 : 0);
      t = go;
    });
    states.set(r, { drags, ticks });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { drags, ticks } = state;
    if (ms < IN_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 - 0.6 * (ms / IN_MS)),
        {
          alpha: 1 - ms / IN_MS,
        },
      );
    // a tick and a jolt at every light, a roar at every launch
    while (r.kicked < ticks.length && ms >= ticks[r.kicked]) {
      const last = (r.kicked + 1) % LIGHTS === 0;
      playSpinTick(last ? 1.6 : 1.1);
      r.shake(last ? 0.5 : 0.25);
      if (last) playSwoosh();
      r.kicked++;
    }
    const half = r.play.barHalfWidth * END;
    for (const d of drags) {
      const bar = bars[d.bar];
      d.at.x = bar.x;
      d.at.y = bar.y;
      if (ms < IN_MS || ms < d.lights[0] - 80 || ms >= d.finish + LOSE_MS) {
        spot.x = bar.x + half;
        spot.y = bar.y;
        drawDetonation(
          ctx,
          spot,
          ms - d.finish,
          d.own ? OWN_BLAST : BLAST,
          now,
        );
        continue;
      }
      // the lights at the line
      if (ms < d.go + LIGHT_FLASH_MS) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (let i = 0; i < d.lights.length; i++) {
          const since = ms - d.lights[i];
          if (since < 0) continue;
          ctx.globalAlpha = since < LIGHT_FLASH_MS ? 1 : 0.4;
          drawGlow(
            ctx,
            LIGHT_STOPS,
            bar.x - half - 40,
            bar.y - LANE * 2 + i * 40,
            LIGHT * (since < LIGHT_FLASH_MS ? 1.4 : 0.8),
          );
        }
        ctx.restore();
      }
      for (let i = 0; i < d.racers.length; i++) {
        if (ms < d.go) {
          const p = d.racers[i](ms);
          head.x = p.x;
          head.y = p.y;
          drawWispHead(ctx, atHead, ms, now, RACER * (d.own ? 1.3 : 1), 0.5);
        } else
          drawWispBetween(
            ctx,
            d.racers[i],
            ms,
            now,
            RACER * (d.own ? 1.3 : 1),
            1,
            d.go,
            d.finish + (i ? LOSE_MS : 0),
          );
      }
      spot.x = bar.x + half;
      spot.y = bar.y;
      drawDetonation(ctx, spot, ms - d.finish, d.own ? OWN_BLAST : BLAST, now);
    }
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
