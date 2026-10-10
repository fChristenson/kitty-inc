// the yo-yo floor crit: the number flies up to a glowing hand over the roof
// and drops off it on a string of light, slamming into a bar in view in a
// blast and zipping back up; the hand moves over and throws it onto the next
// bar down, quicker each time; then it whips it once round the hand and fires
// it straight down into its own bar in a huge blast
import { COLOR } from "../../../../palette";
import { drawBeam } from "../../../../shared/beam";
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  drawText,
  along,
} from "../../critPlayer";
import { BAR_HALF_H, ownLast, skyY } from "../../critPlayer/shared";

const YY_IN_MS = 220;
const YY_ABOVE = 300;
// at most this many bars get a drop before its own, each quicker
const YY_DROPS = 5;
const YY_DOWN_MS: [number, number] = [120, 80];
const YY_UP_MS: [number, number] = [120, 85];
// where along each bar the drops land, in turn
const YY_SIDES = [-0.5, 0.45, -0.25, 0.6, -0.6];
// a slam's blast, then two side blasts YY_SIDE_MS apart, YY_SIDE out
const YY_BLAST = 220;
const YY_SIDE = 0.25;
const YY_SIDE_MS = 45;
const YY_SIDE_BLAST = 120;
// the whip round the hand, then the throw down into its own bar
const YY_LOOP_MS = 260;
const YY_LOOP_R = 240;
const YY_FIRE_MS = 120;
const YY_STRING = 10;
const YY_HAND = 70;
const YY_SIZE = 1.3;
const YY_BOOM = 440;
const YY_CLUSTER = [-0.25, 0.25, -0.5, 0.5];
const YY_CLUSTER_MS = 45;
const YY_CLUSTER_BLAST = 170;
const YY_KICKED_LOOP = 1;
const YY_KICKED_BOOM = 1e6;
const YY_LOOP_SHAKE = 0.8;
// shakes by step: a slam, the last one
const YY_SHAKES = [0.8, 3];
const YY_TAIL_MS = 1000;

interface Drop {
  bar: number;
  side: number;
  start: number;
  hit: number;
  back: number;
  // where it slams, kept on its bar as it scrolls
  at: Point;
}
interface YoYo {
  drops: Drop[];
  loop: number;
  fire: number;
  boom: number;
  // the hand's height and its own bar this frame
  handY: number;
  own: Point;
  hand: (t: number) => Point;
  ball: (t: number) => Point;
}
const yoyos = new WeakMap<Running, YoYo>();

function planYoYo(bars: Point[]): YoYo {
  const others = ownLast(bars).slice(0, -1).slice(0, YY_DROPS);
  let t = YY_IN_MS;
  const drops = others.map((bar, k): Drop => {
    const u = others.length > 1 ? k / (others.length - 1) : 0;
    const start = t;
    const hit = start + lerp(YY_DOWN_MS[0], YY_DOWN_MS[1], u);
    t = hit + lerp(YY_UP_MS[0], YY_UP_MS[1], u);
    return { bar, side: YY_SIDES[k], start, hit, back: t, at: { x: 0, y: 0 } };
  });
  const y: YoYo = {
    drops,
    loop: t,
    fire: t + YY_LOOP_MS,
    boom: t + YY_LOOP_MS + YY_FIRE_MS,
    handY: 0,
    own: { x: 0, y: 0 },
    hand: () => y.own,
    ball: () => y.own,
  };
  y.hand = (ms) => {
    for (let k = 0; k < drops.length; k++) {
      const d = drops[k];
      if (ms < d.hit) return { x: d.at.x, y: y.handY };
      if (ms < d.back) {
        const next = k + 1 < drops.length ? drops[k + 1].at.x : y.own.x;
        const u = (ms - d.hit) / (d.back - d.hit);
        return { x: lerp(d.at.x, next, u * u * (3 - 2 * u)), y: y.handY };
      }
    }
    return { x: y.own.x, y: y.handY };
  };
  y.ball = (ms) => {
    const hand = y.hand(ms);
    for (const d of drops) {
      const top = d.at.y - BAR_HALF_H;
      if (ms < d.hit) {
        const u = clamp01((ms - d.start) / (d.hit - d.start)) ** 2;
        return { x: hand.x, y: lerp(y.handY, top, u) };
      }
      if (ms < d.back) {
        const u = 1 - (1 - (ms - d.hit) / (d.back - d.hit)) ** 2;
        return { x: hand.x, y: lerp(top, y.handY, u) };
      }
    }
    if (ms < y.fire) {
      const u = clamp01((ms - y.loop) / YY_LOOP_MS);
      const a = Math.PI / 2 + u * u * (3 - 2 * u) * Math.PI * 2;
      const r = lerp(0, YY_LOOP_R, Math.sin(u * Math.PI));
      return { x: hand.x + Math.cos(a) * r, y: hand.y + Math.sin(a) * r };
    }
    const u = clamp01((ms - y.fire) / YY_FIRE_MS) ** 2;
    return { x: y.own.x, y: lerp(y.handY, y.own.y, u) };
  };
  return y;
}

registerFloorCrit("yoYoCrit", {
  plan(r, bars, hit) {
    const y = planYoYo(bars);
    yoyos.set(r, y);
    for (const d of y.drops) {
      hit(d.bar, d.hit, 0);
      hit(d.bar, d.hit + YY_SIDE_MS, 0);
      hit(d.bar, d.hit + 2 * YY_SIDE_MS, 0);
    }
    hit(0, y.boom, 1);
    YY_CLUSTER.forEach((_, k) => hit(0, y.boom + (k + 1) * YY_CLUSTER_MS, 0));
  },
  draw(ctx, r, ms, bars) {
    const y = yoyos.get(r);
    if (!y) return;
    const now = r.startedAt + ms;
    y.handY = skyY(r, bars, YY_ABOVE);
    y.own.x = bars[0].x;
    y.own.y = bars[0].y;
    for (const d of y.drops) {
      const at = along(r, bars, d.bar, d.side);
      d.at.x = at.x;
      d.at.y = at.y;
    }
    const first = y.drops.length ? y.drops[0].at.x : y.own.x;
    if (ms < YY_IN_MS) {
      const p = (ms / YY_IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        first * p,
        y.handY * p,
        lerp(r.flashFont, 0, p),
      );
    }
    if (ms >= y.loop && r.kicked < YY_KICKED_LOOP) {
      r.kicked = YY_KICKED_LOOP;
      r.shake(YY_LOOP_SHAKE);
    }
    if (ms >= y.boom && r.kicked < YY_KICKED_BOOM) {
      r.kicked = YY_KICKED_BOOM;
      playExplosion();
    }

    if (ms >= YY_IN_MS && ms < y.boom) {
      const hand = y.hand(ms);
      drawBeam(ctx, hand, y.ball(ms), YY_STRING, 0.8);
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      stampGlimmer(ctx, hand.x, hand.y, YY_HAND, ms * 0.004, COLOR.white);
      ctx.globalCompositeOperation = previous;
    }
    drawWispBetween(
      ctx,
      y.ball,
      ms,
      now,
      WISP_SIZE * YY_SIZE,
      0.7,
      YY_IN_MS,
      y.boom,
    );
    for (const d of y.drops) {
      drawDetonation(ctx, d.at, ms - d.hit, YY_BLAST, now);
      for (let k = 0; k < 2; k++)
        drawDetonation(
          ctx,
          along(r, bars, d.bar, d.side + (k ? YY_SIDE : -YY_SIDE)),
          ms - d.hit - (k + 1) * YY_SIDE_MS,
          YY_SIDE_BLAST,
          now,
        );
    }
    drawDetonation(ctx, bars[0], ms - y.boom, YY_BOOM, now);
    for (let k = 0; k < YY_CLUSTER.length; k++)
      drawDetonation(
        ctx,
        along(r, bars, 0, YY_CLUSTER[k]),
        ms - y.boom - (k + 1) * YY_CLUSTER_MS,
        YY_CLUSTER_BLAST,
        now,
      );
  },
  tailMs: YY_TAIL_MS,
  shake: (step) => YY_SHAKES[step] ?? YY_SHAKES[0],
});
