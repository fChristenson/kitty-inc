// Super Ball, a lock crit: the number arcs onto the dark locked floor's lock
// as a ball of light and bounces on it, every bounce higher, harder and
// quicker than the last, a splash, a bang and a jolt each, the ball swelling
// and the floor glowing hotter; then it bounces clean off the top of the
// screen and plunges back down onto the lock, bursting the floor open in
// the biggest blast, and hops off onto its button: its next taps roll crits
// more often
import meta from "./meta";
import { addHotTaps } from "../../../buttonCrits/buttonBonus";
import {
  drawBounceSplash,
  hops,
  type BouncePath,
} from "../../../../shared/animationStyles/bounce";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow } from "../../../../shared/glowSprite";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import { getLockCenter } from "../../../../floors/floorLock";
import { BTN_H, BTN_W, BTN_X, getBtnY } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
  glowStops,
} from "../../../floorCrits/critPlayer";

const ARC_MS = 170;
const ARC_RISE = 120;
// it bounces on TOP px above the lock's middle, HOPS times, LIFT px high
// (rising) over LEG_MS a hop (quickening), then SKY px up and back over SKY_MS
const TOP = -40;
const HOPS = 7;
const LIFT: [number, number] = [70, 620];
const LEG_MS: [number, number] = [220, 160];
const SKY = 1700;
const SKY_MS = 420;
const BALL = WISP_SIZE * 1.3;
const GROW = 0.14;
const SPLASH: [number, number] = [110, 260];
const GLOW = 320;
const GLOW_GROW = 50;
const GLOW_ALPHA = 0.55;
const OPEN_BLAST = 460;
// the hop off onto its button, BUTTON_LIFT px high over BUTTON_MS
const BUTTON_GAP_MS = 90;
const BUTTON_LIFT = 220;
const BUTTON_MS = 160;
const BUTTON_BLAST = 230;
// shakes by step: a bounce, the floor bursting open, onto its button
const SHAKES = [0.7, 3.2, 1.3];

interface State {
  path: BouncePath;
  openAt: number;
  hop: BouncePath;
  button: Point;
}
const states = new WeakMap<Running, State>();
const GOLD = glowStops(COLOR.heavenlyGold);
const ORIGIN: Point = { x: 0, y: 0 };

registerFloorCrit("superBallCrit", {
  reward(t) {
    addHotTaps(t.floor, t.count * meta.values.taps);
    t.flipButton();
  },
  plan(r, _bars, hit) {
    const lock = getLockCenter();
    const top: Point = { x: 0, y: TOP };
    const spots = Array.from({ length: HOPS + 2 }, () => top);
    const bounces = hops(spots, LEG_MS, LIFT, ARC_MS);
    const sky = hops([top, top], [SKY_MS, SKY_MS], [SKY, SKY], bounces.endMs);
    const openAt = sky.endMs;
    // the bounces and the plunge as one path
    const path: BouncePath = {
      bounces: [...bounces.bounces, ...sky.bounces],
      startMs: ARC_MS,
      endMs: openAt,
      at: (ms) => (ms < bounces.endMs ? bounces.at(ms) : sky.at(ms)),
    };
    const button: Point = {
      x: BTN_X + BTN_W / 2 - lock.x,
      y: getBtnY(false) + BTN_H / 2 - lock.y,
    };
    const hop = hops(
      [top, button],
      [BUTTON_MS, BUTTON_MS],
      [BUTTON_LIFT, BUTTON_LIFT],
      openAt + BUTTON_GAP_MS,
    );
    for (const b of bounces.bounces) hit(0, b.ms, 0);
    hit(0, openAt, 1);
    hit(0, hop.endMs, 2);
    states.set(r, { path, openAt, hop, button });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const lock = bars[0];
    const { path, openAt, hop } = state;
    if (ms < ARC_MS) {
      const u = ms / ARC_MS;
      const p = u * u * (3 - 2 * u);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lock.x * p,
        (lock.y + TOP) * p - ARC_RISE * 4 * p * (1 - p),
        r.flashFont * (1 - 0.6 * p),
      );
    }
    let bounced = 0;
    while (bounced < path.bounces.length && ms >= path.bounces[bounced].ms)
      bounced++;
    ctx.save();
    ctx.translate(lock.x, lock.y);
    // the floor glowing hotter with every bounce
    if (ms < openAt && bounced > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = (bounced / path.bounces.length) * GLOW_ALPHA;
      drawGlow(ctx, GOLD, 0, 0, GLOW + bounced * GLOW_GROW, 0.45);
      ctx.restore();
    }
    const n = path.bounces.length - 1;
    for (let k = 0; k < n; k++) {
      const b = path.bounces[k];
      drawBounceSplash(
        ctx,
        b,
        ms - b.ms,
        SPLASH[0] + ((SPLASH[1] - SPLASH[0]) * k) / Math.max(1, n - 1),
        now,
      );
    }
    const size = BALL * (1 + GROW * bounced);
    drawWispBetween(
      ctx,
      path.at,
      ms,
      now,
      size,
      Math.min(1, 0.3 + bounced / n),
      ARC_MS,
      openAt,
    );
    drawDetonation(ctx, path.bounces[n].at, ms - openAt, OPEN_BLAST, now);
    drawWispBetween(
      ctx,
      hop.at,
      ms,
      now,
      BALL * 1.4,
      1,
      hop.startMs,
      hop.endMs,
    );
    drawDetonation(ctx, state.button, ms - hop.endMs, BUTTON_BLAST, now);
    drawDetonation(ctx, ORIGIN, ms - ARC_MS, 120, now);
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
