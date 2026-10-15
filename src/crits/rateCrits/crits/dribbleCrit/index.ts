// Dribble, a rate crit: the number balls up into a ball of light that slams
// down onto the top bar's readout and is dribbled on it, each bounce lower
// and quicker, squashing flat on every contact, then hops down onto the next
// readout, quicker every bar; each readout turns over on its last bounce. On
// its own readout a rapid-fire dribble, then the ball flies up swelling and
// rumbling and comes down in one huge slam: every bar's speed bounces, flat
// out at the start of every beat like a dribbled ball
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import {
  drawBounceSplash,
  type Bounce,
} from "../../../../shared/animationStyles/bounce";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  clamp01,
  drawText,
  lerp,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { ownLast } from "../../../floorCrits/critPlayer/shared";

// the pop up off the flash and slam onto the top readout
const IN_MS = 170;
const IN_LIFT = 150;
// the readouts READOUT of a bar's half width out; it lands CONTACT_Y off
// their middle
const READOUT = 0.6;
const CONTACT_Y = -20;
// on every other bar: the landing, then DRIBBLE_MS legs DRIBBLE_LIFT px high
// (the last one landing its reward), then a hop onto the next; QUICK times as
// long by the last, all of it fitted into OTHERS_MS
const DRIBBLE_MS = [150, 100];
const DRIBBLE_LIFT = [170, 110];
const HOP_MS = 170;
const HOP_LIFT = 150;
const QUICK = 0.5;
const OTHERS_MS = 950;
// on its own: OWN_DRIBBLES quickening legs, then the slam
const OWN_DRIBBLES = 6;
const OWN_DRIBBLE_MS: [number, number] = [100, 48];
const OWN_DRIBBLE_LIFT: [number, number] = [130, 45];
const SLAM_MS = 400;
const SLAM_LIFT = 360;
// the share of a leg spent rising: a dribbled ball comes down harder than it
// went up
const RISE = 0.56;
const SLAM_RISE = 0.64;
const RUMBLE_MS = 55;
const RUMBLE_SHAKE: [number, number] = [0.3, 1.1];
// the ball, swelling to SLAM_GROW times over the slam; flattened SQUASH on
// contact (over SQUASH_MS either side), stretched up to STRETCH falling
const BALL = WISP_SIZE * 1.15;
const SLAM_GROW = 1.9;
const BODY = 0.9;
const SQUASH = 0.45;
const SQUASH_MS = 45;
const STRETCH = 0.3;
// px per ms it's stretched fully at
const FAST = 2.2;
const SWELL = 260;
const SPLASH = 90;
const REWARD_SPLASH = 140;
const BLAST = 150;
const OWN_SPLASH = 300;
const OWN_BLAST = 360;
// shakes by step: a bounce, a readout turned over, its own slam
const SHAKES = [0.5, 1.3, 3.2];

interface Leg {
  // the readouts it runs from and to (-1: the flash's middle)
  from: number;
  to: number;
  starts: number;
  ends: number;
  lift: number;
  rise: number;
}
interface Contact {
  bar: number;
  ms: number;
  step: number;
}
interface Plan {
  half: number;
  legs: Leg[];
  contacts: Contact[];
  slamStarts: number;
  endMs: number;
  rumbles: number[];
}
const plans = new WeakMap<Running, Plan>();
let frameBars: Point[] = [];
let current: Plan | null = null;
const ball: Point = { x: 0, y: 0 };
const from: Point = { x: 0, y: 0 };
const to: Point = { x: 0, y: 0 };
const splash: Bounce = { at: { x: 0, y: 0 }, ms: 0, normal: -Math.PI / 2 };
const BODY_GOLD = fadeStops(COLOR.heavenlyGold, 0.3);
const BODY_CORE = fadeStops(COLOR.white, 0.45);
const SWELL_GLOW = fadeStops(COLOR.heavenlyGold);

// a dribbled bar: from `from` till `until`, speed times as fast for the
// first share of every beat
const dribbles = defineBarEffect<{ from: number; until: number }>({
  speed: (d, now) =>
    (now - d.from) % meta.values.beatMs < meta.values.beatMs * meta.values.share
      ? meta.values.speed
      : 1,
  ended: (d, now) => now >= d.until,
});

function readoutOf(bar: number, out: Point): void {
  if (bar < 0) {
    out.x = 0;
    out.y = 0;
    return;
  }
  out.x = frameBars[bar].x + current!.half * READOUT;
  out.y = frameBars[bar].y + CONTACT_Y;
}

// the ball at ms: a pure function of ms, so its trail follows it
function ballAt(ms: number): Point {
  const { legs } = current!;
  let lo = 0;
  let hi = legs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (ms >= legs[mid].ends) lo = mid + 1;
    else hi = mid;
  }
  const leg = legs[lo];
  const u = clamp01((ms - leg.starts) / (leg.ends - leg.starts || 1));
  readoutOf(leg.from, from);
  readoutOf(leg.to, to);
  // up fast and easing over the top, then down ever faster
  let h: number;
  if (u < leg.rise) {
    const r = 1 - u / leg.rise;
    h = 1 - r * r;
  } else {
    const f = (u - leg.rise) / (1 - leg.rise);
    h = 1 - f * f;
  }
  ball.x = from.x + (to.x - from.x) * u;
  ball.y = from.y + (to.y - from.y) * u - leg.lift * h;
  return ball;
}

registerFloorCrit("dribbleCrit", {
  reward(t) {
    t.flipRate();
    dribbles.set(t.floor, {
      from: t.now,
      until: t.now + (t.own ? meta.values.ownMs : meta.values.ms),
    });
    t.punch("Dribble!");
  },
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const legs: Leg[] = [];
    const contacts: Contact[] = [];
    const rumbles: number[] = [];
    const others = order.length - 1;
    const paceOf = (k: number) => lerp(1, QUICK, k / Math.max(1, others - 1));
    let raw = 0;
    for (let k = 0; k < others; k++)
      raw += (DRIBBLE_MS[0] + DRIBBLE_MS[1] + HOP_MS) * paceOf(k);
    const fit = raw > 0 ? Math.min(1, OTHERS_MS / raw) : 1;
    let t = 0;
    let at = -1;
    const leg = (to: number, ms: number, lift: number, rise: number) => {
      legs.push({ from: at, to, starts: t, ends: t + ms, lift, rise });
      t += ms;
      at = to;
    };
    const contact = (step: number) => {
      contacts.push({ bar: at, ms: t, step });
      hit(at, t, step);
    };
    leg(order[0], IN_MS, IN_LIFT, 0.4);
    contact(0);
    for (let k = 0; k < others; k++) {
      const bar = order[k];
      const s = paceOf(k) * fit;
      const tall = Math.sqrt(s);
      for (let j = 0; j < DRIBBLE_MS.length; j++) {
        leg(bar, DRIBBLE_MS[j] * s, DRIBBLE_LIFT[j] * tall, RISE);
        contact(j === DRIBBLE_MS.length - 1 ? 1 : 0);
      }
      leg(order[k + 1], HOP_MS * s, HOP_LIFT * tall, RISE);
      contact(0);
    }
    for (let j = 0; j < OWN_DRIBBLES; j++) {
      const u = j / (OWN_DRIBBLES - 1);
      leg(
        0,
        lerp(OWN_DRIBBLE_MS[0], OWN_DRIBBLE_MS[1], u),
        lerp(OWN_DRIBBLE_LIFT[0], OWN_DRIBBLE_LIFT[1], u),
        RISE,
      );
      contact(0);
    }
    const slamStarts = t;
    for (let ms = t + RUMBLE_MS; ms < t + SLAM_MS; ms += RUMBLE_MS)
      rumbles.push(ms);
    leg(0, SLAM_MS, SLAM_LIFT, SLAM_RISE);
    contact(2);
    plans.set(r, {
      half: r.play.barHalfWidth,
      legs,
      contacts,
      slamStarts,
      endMs: t,
      rumbles,
    });
  },
  draw(ctx, r, ms, bars) {
    const plan = plans.get(r);
    if (!plan) return;
    const now = r.startedAt + ms;
    frameBars = bars;
    current = plan;
    if (ms < IN_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 - (0.6 * ms) / IN_MS),
        { alpha: 1 - ms / IN_MS },
      );
    // the rumble rising as it flies up for the slam
    while (r.kicked < plan.rumbles.length && ms >= plan.rumbles[r.kicked]) {
      r.shake(
        lerp(
          RUMBLE_SHAKE[0],
          RUMBLE_SHAKE[1],
          r.kicked / Math.max(1, plan.rumbles.length - 1),
        ),
      );
      r.kicked++;
    }
    // a splash on every bounce, a blast on every readout it turns over
    const { contacts } = plan;
    let near = Infinity;
    for (let k = 0; k < contacts.length; k++) {
      const c = contacts[k];
      const since = ms - c.ms;
      const gap = since < 0 ? -since : since;
      if (gap < near) near = gap;
      if (since < 0 || since >= DETONATION_MS) continue;
      readoutOf(c.bar, splash.at);
      drawBounceSplash(
        ctx,
        splash,
        since,
        c.step === 2 ? OWN_SPLASH : c.step === 1 ? REWARD_SPLASH : SPLASH,
        now,
      );
      if (c.step > 0)
        drawDetonation(
          ctx,
          splash.at,
          since,
          c.step === 2 ? OWN_BLAST : BLAST,
          now,
        );
    }
    if (ms > plan.endMs + DETONATION_MS) return;
    const slam = clamp01(
      (ms - plan.slamStarts) / (plan.endMs - plan.slamStarts),
    );
    const swell = ms < plan.endMs ? slam * slam : 0;
    const size = BALL * (1 + (SLAM_GROW - 1) * swell);
    drawWispBetween(ctx, ballAt, ms, now, size, swell, 0, plan.endMs);
    if (ms >= plan.endMs) return;
    // the ball's body: stretched falling, flattened on contact
    const y0 = ballAt(ms - 10).y;
    const p = ballAt(ms);
    const fall = clamp01(Math.abs(p.y - y0) / 10 / FAST);
    const flat = near < SQUASH_MS ? 1 - near / SQUASH_MS : 0;
    const squash = flat > 0 ? 1 - (1 - SQUASH) * flat : 1 + STRETCH * fall;
    const radius = size * BODY * (flat > 0 ? 1 + 0.5 * flat : 1 - 0.12 * fall);
    // flattened onto the readout, not round its middle
    const y = p.y + radius * Math.max(0, 1 - squash);
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    if (swell > 0) {
      ctx.globalAlpha = 0.5 * swell;
      drawGlow(ctx, SWELL_GLOW, p.x, p.y, SWELL * swell, 1);
    }
    ctx.globalAlpha = 0.8;
    drawGlow(ctx, BODY_GOLD, p.x, y, radius, squash);
    ctx.globalAlpha = 1;
    drawGlow(ctx, BODY_CORE, p.x, y, radius * 0.5, squash);
    ctx.globalCompositeOperation = previous;
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
