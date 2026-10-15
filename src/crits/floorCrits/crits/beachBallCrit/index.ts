// Beach Ball, a floor crit: the number balls up into a big striped beach
// ball lobbed off the left screen edge, ricocheting down the bars in view
// (wall, bar, the other wall, the next bar down) in quickening, flatter
// bounces, each bar landing a squash, flash and jolt (the bar levels) as its
// spin winds up; then it pops sky-high off the last, hangs trembling while a
// wisp whips round it, and is spiked down onto its own bar in one big blast
import { COLOR } from "../../../../palette";
import {
  drawBounceSplash,
  type Bounce,
} from "../../../../shared/animationStyles/bounce";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import {
  drawWispBetween,
  drawWispTrail,
  WISP_SIZE,
  WISP_TRAIL_MS,
} from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  byHeight,
  clamp01,
  drawText,
  glowStops,
  lerp,
} from "../../critPlayer";
import { BAR_HALF_H, skyY } from "../../critPlayer/shared";

// the ball's radius, in the flash's units
const R = 74;
const IN_MS = 150;
const LOB_MS = 230;
const LOB_LIFT = 170;
// each wall-and-bar cycle, first to last, squeezed to fit CYCLE_BUDGET ms
const CYCLE: [number, number] = [360, 190];
const CYCLE_BUDGET = 1000;
// a cycle's share flying from the wall onto the bar
const TO_BAR = 0.42;
const MIN_HOPS = 3;
const MAX_HOPS = 6;
// first to last: how high over its bar it meets the wall, how high it arcs
// up off a bar and down off a wall
const WALL_ABOVE: [number, number] = [250, 110];
const UP_LIFT: [number, number] = [210, 60];
const DOWN_LIFT: [number, number] = [70, 12];
// landings this share of the bar's half width off its middle
const SIDE = 0.36;
const RISE_MS = 260;
const HANG_MS = 270;
const SPIKE_MS = 100;
const SKY_ABOVE = 560;
const TREMBLE = 14;
// its spin in rad per ms, winding up with ms
const SPIN = 0.008;
const SPIN_UP = 1.3e-5;
const SQUASH_MS = 120;
const BAR_SQUASH: [number, number] = [0.3, 0.45];
const WALL_SQUASH = 0.26;
const SPIKE_STRETCH = 0.35;
const LAND_SQUASH = 0.5;
const FLASH_MS = 170;
const SPLASH: [number, number] = [210, 310];
const WALL_SPLASH = 170;
const SPIKE_SPLASH = 260;
const SPIKE_FLASH_MS = 140;
const WALL_SHAKE: [number, number] = [0.2, 0.45];
const SPIKE_SHAKE = 0.7;
const SHAKES = [0.7, 3.4];
// the spiker wisp whipping round the hanging ball, closing in on its top
const SPIKER_REACH = 250;
const SPIKER_TURN = Math.PI * 2.4;
const SPIKER_SIZE = WISP_SIZE * 1.3;
const TRAIL_SIZE = WISP_SIZE * 1.5;
// the climax
const BLAST = 460;
const BIG_FLASH = 620;
const BIG_FLASH_MS = 260;
const FINAL_SPLASH = 520;
const POP_MS = 150;
const TAIL_MS = DETONATION_MS + 60;

const GOLD = glowStops(COLOR.heavenlyGold);
const WHITE = fadeStops(COLOR.white, 0.3);
const PANELS = [
  COLOR.red,
  COLOR.white,
  COLOR.blue,
  COLOR.white,
  COLOR.heavenlyGold,
  COLOR.white,
];
// the sprites' half size and the ball's radius in them, in px
const SPR = 100;
const BALL_PX = 92;
const DRAW_HALF = (R * SPR) / BALL_PX;

let ballSprite: HTMLCanvasElement | null = null;
let shineSprite: HTMLCanvasElement | null = null;

// the striped panels, seams, cap and outline: spun as it flies
function buildBall(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = SPR * 2;
  const g = c.getContext("2d")!;
  g.translate(SPR, SPR);
  const step = (Math.PI * 2) / PANELS.length;
  for (let i = 0; i < PANELS.length; i++) {
    g.beginPath();
    g.moveTo(0, 0);
    g.arc(0, 0, BALL_PX, i * step, (i + 1) * step);
    g.closePath();
    g.fillStyle = PANELS[i];
    g.fill();
  }
  g.strokeStyle = COLOR.black;
  g.lineWidth = 3;
  g.beginPath();
  for (let i = 0; i < PANELS.length; i++) {
    g.moveTo(0, 0);
    g.lineTo(Math.cos(i * step) * BALL_PX, Math.sin(i * step) * BALL_PX);
  }
  g.stroke();
  g.beginPath();
  g.arc(0, 0, BALL_PX * 0.17, 0, Math.PI * 2);
  g.fillStyle = COLOR.white;
  g.fill();
  g.lineWidth = 4;
  g.stroke();
  g.beginPath();
  g.arc(0, 0, BALL_PX, 0, Math.PI * 2);
  g.lineWidth = 9;
  g.stroke();
  return c;
}

// the cel shading and gloss, lit from the top left: never spun
function buildShine(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = SPR * 2;
  const g = c.getContext("2d")!;
  g.translate(SPR, SPR);
  g.save();
  g.beginPath();
  g.arc(0, 0, BALL_PX - 4.5, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = "rgba(0,0,0,0.24)";
  g.fillRect(-SPR, -SPR, SPR * 2, SPR * 2);
  g.globalCompositeOperation = "destination-out";
  g.beginPath();
  g.arc(-BALL_PX * 0.13, -BALL_PX * 0.15, BALL_PX * 0.97, 0, Math.PI * 2);
  g.fill();
  g.restore();
  g.fillStyle = "rgba(255,255,255,0.85)";
  g.beginPath();
  g.ellipse(
    -BALL_PX * 0.4,
    -BALL_PX * 0.42,
    BALL_PX * 0.26,
    BALL_PX * 0.13,
    -0.75,
    0,
    Math.PI * 2,
  );
  g.fill();
  g.beginPath();
  g.arc(-BALL_PX * 0.12, -BALL_PX * 0.62, BALL_PX * 0.06, 0, Math.PI * 2);
  g.fill();
  return c;
}

// planned at launch: the bars it lands on, its own last; the path's nodes
// (the start, wall and bar contacts in turn, the sky, the hang's end, the
// landing), when it reaches each and how high each leg arcs
const order: number[] = [];
let hops = 0;
const nodes: Point[] = [];
const times: number[] = [];
const lifts: number[] = [];
// each contact node's splash, and the spike's and landing's
const contacts: Bounce[] = [];
const spikeHit: Bounce = { at: { x: 0, y: 0 }, ms: 0, normal: -Math.PI / 2 };
const landHit: Bounce = { at: { x: 0, y: 0 }, ms: 0, normal: -Math.PI / 2 };
// node indexes of the sky (the rise's end), and the legs that ease
let skyNode = 0;
const slots: Point[] = [];
for (let i = 0; i < 16; i++) slots.push({ x: 0, y: 0 });
let slot = 0;
const spikerSlots: Point[] = [];
for (let i = 0; i < 16; i++) spikerSlots.push({ x: 0, y: 0 });
let spikerSlot = 0;

const lastNode = () => nodes.length - 1;

// the leg it's on at ms (the node it last passed), -1 before the lob
function legAt(ms: number): number {
  if (ms < times[0]) return -1;
  const last = lastNode();
  let j = 0;
  while (j < last && ms >= times[j + 1]) j++;
  return j;
}

// the ball's middle at ms
function ballAt(ms: number): Point {
  slot = (slot + 1) & 15;
  const p = slots[slot];
  const last = lastNode();
  const j = legAt(ms);
  if (j < 0 || j >= last) {
    const n = nodes[j < 0 ? 0 : last];
    p.x = n.x;
    p.y = n.y;
    return p;
  }
  const a = nodes[j];
  const b = nodes[j + 1];
  let u = (ms - times[j]) / (times[j + 1] - times[j] || 1);
  if (j === skyNode - 1) u = 1 - (1 - u) ** 2;
  else if (j === skyNode + 1) u = u ** 1.5;
  p.x = lerp(a.x, b.x, u);
  p.y = lerp(a.y, b.y, u) - 4 * lifts[j] * u * (1 - u);
  if (j === skyNode) {
    const amp = TREMBLE * u;
    p.x += amp * Math.sin(ms * 0.13);
    p.y += amp * Math.sin(ms * 0.19 + 1);
  }
  return p;
}

// its trail: only while it flies
function trailAt(ms: number): Point | null {
  return ms < times[0] || ms > times[lastNode()] ? null : ballAt(ms);
}

// the spiker wisp: whipping round the hanging ball onto its top, then riding
// it down
function spikerAt(ms: number): Point | null {
  const from = times[skyNode];
  const to = times[skyNode + 1];
  const end = times[lastNode()];
  if (ms < from) return null;
  const ball = ballAt(Math.min(ms, end));
  spikerSlot = (spikerSlot + 1) & 15;
  const q = spikerSlots[spikerSlot];
  if (ms >= to) {
    q.x = ball.x;
    q.y = ball.y - R;
    return q;
  }
  const u = (ms - from) / (to - from);
  const a = -Math.PI / 2 + (1 - u * u) * SPIKER_TURN;
  const reach = lerp(SPIKER_REACH, R * 1.05, u * u);
  q.x = ball.x + Math.cos(a) * reach;
  q.y = ball.y + Math.sin(a) * reach;
  return q;
}

const cycleMs = (k: number) =>
  lerp(CYCLE[0], CYCLE[1], k / Math.max(1, hops - 1));

registerFloorCrit("beachBallCrit", {
  plan(_r, bars, hit) {
    ballSprite ??= buildBall();
    shineSprite ??= buildShine();
    order.length = 0;
    const others = byHeight(bars).filter((bar) => bar !== 0);
    if (others.length > MAX_HOPS)
      for (let i = 0; i < MAX_HOPS; i++)
        order.push(
          others[Math.round((i * (others.length - 1)) / (MAX_HOPS - 1))],
        );
    else order.push(...others);
    while (order.length < MIN_HOPS) order.unshift(0);
    hops = order.length;
    order.push(0);
    const count = 2 * hops + 4;
    skyNode = 2 * hops + 1;
    while (nodes.length < count) nodes.push({ x: 0, y: 0 });
    nodes.length = count;
    times.length = count;
    lifts.length = count - 1;
    while (contacts.length <= 2 * hops)
      contacts.push({ at: { x: 0, y: 0 }, ms: 0, normal: 0 });
    let sum = 0;
    for (let k = 0; k < hops; k++) sum += cycleMs(k);
    const fit = Math.min(1, CYCLE_BUDGET / Math.max(1, sum));
    times[0] = IN_MS;
    lifts[0] = LOB_LIFT;
    let t = IN_MS + LOB_MS;
    for (let k = 0; k < hops; k++) {
      const f = k / Math.max(1, hops - 1);
      times[2 * k + 1] = t;
      contacts[2 * k + 1].ms = t;
      lifts[2 * k + 1] = lerp(DOWN_LIFT[0], DOWN_LIFT[1], f);
      t += cycleMs(k) * fit * TO_BAR;
      times[2 * k + 2] = t;
      contacts[2 * k + 2].ms = t;
      hit(order[k], t, 0);
      if (k < hops - 1) {
        lifts[2 * k + 2] = lerp(UP_LIFT[0], UP_LIFT[1], f);
        t += cycleMs(k + 1) * fit * (1 - TO_BAR);
      }
    }
    lifts[skyNode - 1] = 0;
    t += RISE_MS;
    times[skyNode] = t;
    lifts[skyNode] = 0;
    t += HANG_MS;
    times[skyNode + 1] = t;
    spikeHit.ms = t;
    lifts[skyNode + 1] = 0;
    t += SPIKE_MS;
    times[skyNode + 2] = t;
    landHit.ms = t;
    hit(0, t, 1);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const edge = r.viewportWidth / 2;
    const top = -r.viewportWidth * 0.5;
    const halfW = r.play.barHalfWidth;
    const hangFrom = times[skyNode];
    const hangTo = times[skyNode + 1];
    const end = times[lastNode()];

    // the path, kept on the bars as they scroll
    nodes[0].x = 0;
    nodes[0].y = 0;
    for (let k = 0; k < hops; k++) {
      const f = k / Math.max(1, hops - 1);
      const bar = bars[order[k]] ?? bars[0];
      const fromLeft = k % 2 === 0;
      const by = bar.y - BAR_HALF_H - R;
      const wall = nodes[2 * k + 1];
      wall.x = fromLeft ? -edge + R : edge - R;
      wall.y = Math.max(top, by - lerp(WALL_ABOVE[0], WALL_ABOVE[1], f));
      const wallHit = contacts[2 * k + 1];
      wallHit.at.x = fromLeft ? -edge : edge;
      wallHit.at.y = wall.y;
      wallHit.normal = fromLeft ? 0 : Math.PI;
      const land = nodes[2 * k + 2];
      land.x = bar.x + (fromLeft ? SIDE : -SIDE) * halfW;
      land.y = by;
      const barHit = contacts[2 * k + 2];
      barHit.at.x = land.x;
      barHit.at.y = bar.y - BAR_HALF_H;
      barHit.normal = -Math.PI / 2;
    }
    const own = bars[0];
    const landing = nodes[skyNode + 2];
    landing.x = own.x;
    landing.y = own.y - BAR_HALF_H - R;
    const sky = Math.min(skyY(r, bars, SKY_ABOVE), landing.y - SKY_ABOVE * 0.6);
    nodes[skyNode].x = nodes[skyNode + 1].x = own.x;
    nodes[skyNode].y = nodes[skyNode + 1].y = sky;
    spikeHit.at.x = own.x;
    spikeHit.at.y = sky - R;
    landHit.at.x = own.x;
    landHit.at.y = own.y - BAR_HALF_H;

    // a jolt off each wall and the spike; the bars' come with their hits
    while (r.kicked <= hops) {
      const wall = r.kicked < hops;
      if (ms < (wall ? times[2 * r.kicked + 1] : hangTo)) break;
      r.shake(
        wall
          ? lerp(WALL_SHAKE[0], WALL_SHAKE[1], r.kicked / Math.max(1, hops - 1))
          : SPIKE_SHAKE,
      );
      r.kicked++;
    }

    // the number balling up into the ball
    if (ms < IN_MS) {
      const t = (ms / IN_MS) ** 2;
      drawText(ctx, r.glyphs, r.label, 0, 0, lerp(r.flashFont, 0, t), {
        alpha: 1 - t,
      });
    }

    // every contact's splash, the bars' with a flash along the bar
    const previous = ctx.globalCompositeOperation;
    for (let i = 1; i <= 2 * hops; i++) {
      const c = contacts[i];
      const since = ms - c.ms;
      if (since < 0 || since >= FLASH_MS + 200) continue;
      const onBar = i % 2 === 0;
      const f = (i / 2 - 1) / Math.max(1, hops - 1);
      drawBounceSplash(
        ctx,
        c,
        since,
        onBar ? lerp(SPLASH[0], SPLASH[1], f) : WALL_SPLASH,
        now,
      );
      if (onBar && since < FLASH_MS) {
        const fade = (1 - since / FLASH_MS) ** 2;
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = fade;
        drawGlow(ctx, WHITE, c.at.x, c.at.y, halfW * 0.6, 0.28);
        ctx.globalAlpha = 0.8 * fade;
        drawGlow(ctx, GOLD, c.at.x, c.at.y, R * (2 + f));
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = previous;
      }
    }

    // the hang: its own bar glowing up under it as the ball heats
    const charge =
      ms < hangFrom ? 0 : clamp01((ms - hangFrom) / (hangTo - hangFrom));
    const ball = ms < end + POP_MS ? ballAt(ms) : null;
    if (charge > 0 && ms < end) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.6 * charge * (0.8 + 0.2 * Math.sin(now * 0.06));
      drawGlow(ctx, GOLD, landHit.at.x, landHit.at.y, R * (1.2 + 2 * charge));
      if (ball) {
        ctx.globalAlpha = 0.7 * charge;
        drawGlow(ctx, GOLD, ball.x, ball.y, R * (1.4 + 0.9 * charge));
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = previous;
    }

    if (ms >= IN_MS * 0.5 && ms < end + WISP_TRAIL_MS)
      drawWispTrail(ctx, trailAt, ms, now, TRAIL_SIZE);
    drawWispBetween(ctx, spikerAt, ms, now, SPIKER_SIZE, charge, hangFrom, end);

    // the ball: spun, squashed against what it last hit (stretched as it's
    // spiked, flattened and popping on its own bar)
    if (ball && ballSprite && shineSprite) {
      const since = ms - end;
      let squash = 0;
      let normal = -Math.PI / 2;
      let alpha = 1;
      let size = clamp01(ms / IN_MS);
      const j = legAt(ms);
      if (since >= 0) {
        const p = since / POP_MS;
        squash = LAND_SQUASH * (1 - p);
        size = 1 + 0.6 * p;
        alpha = 1 - p;
      } else if (j === skyNode + 1) {
        squash = -SPIKE_STRETCH * clamp01((ms - hangTo) / SPIKE_MS);
      } else if (j >= 1 && j <= 2 * hops) {
        const after = ms - times[j];
        if (after < SQUASH_MS) {
          const f = (j / 2 - 1) / Math.max(1, hops - 1);
          const most =
            j % 2 === 0 ? lerp(BAR_SQUASH[0], BAR_SQUASH[1], f) : WALL_SQUASH;
          squash = most * (1 - after / SQUASH_MS) ** 2;
          normal = contacts[j].normal;
        }
      }
      if (size > 0 && alpha > 0) {
        const shift = Math.max(0, squash) * R;
        const spin = SPIN * ms + SPIN_UP * ms * ms;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(
          ball.x - Math.cos(normal) * shift,
          ball.y - Math.sin(normal) * shift,
        );
        ctx.rotate(normal);
        ctx.scale((1 - squash) * size, (1 + squash * 0.7) * size);
        ctx.rotate(-normal);
        ctx.rotate(spin);
        ctx.drawImage(
          ballSprite,
          -DRAW_HALF,
          -DRAW_HALF,
          DRAW_HALF * 2,
          DRAW_HALF * 2,
        );
        ctx.rotate(-spin);
        ctx.drawImage(
          shineSprite,
          -DRAW_HALF,
          -DRAW_HALF,
          DRAW_HALF * 2,
          DRAW_HALF * 2,
        );
        ctx.restore();
      }
    }

    // the spike: a white crack on its top as the wisp slams it down
    const spiked = ms - hangTo;
    if (spiked >= 0 && spiked < SPIKE_FLASH_MS + 200) {
      drawBounceSplash(ctx, spikeHit, spiked, SPIKE_SPLASH, now);
      if (spiked < SPIKE_FLASH_MS) {
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = (1 - spiked / SPIKE_FLASH_MS) ** 2;
        drawGlow(ctx, WHITE, spikeHit.at.x, spikeHit.at.y, R * 2.4);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = previous;
      }
    }

    // the climax on its own bar
    const since = ms - end;
    if (since >= 0) {
      drawBounceSplash(ctx, landHit, since, FINAL_SPLASH, now);
      if (since < BIG_FLASH_MS) {
        const fade = (1 - since / BIG_FLASH_MS) ** 2;
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = fade;
        drawGlow(ctx, WHITE, landHit.at.x, landHit.at.y, BIG_FLASH);
        drawGlow(ctx, GOLD, landHit.at.x, landHit.at.y, halfW * 1.2, 0.3);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = previous;
      }
      drawDetonation(ctx, landHit.at, since, BLAST, now);
    }
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
