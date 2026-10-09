// the swarm war floor crit: the number bursts into a gold swarm while a
// white one dives out of the sky, each a whirl of glitter round its leader
// wisps. They swing out, charge, and lock into a melee: circling each
// other, their whirls spinning opposite ways and tearing through each
// other, bits wiping each other out in a rattling string of blasts; then
// the gold survivors pour onto the bars, a huge blast on its own last
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { easeIn, easeOut, smoothstep } from "../../../../shared/easing";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  byHeight,
  drawText,
  along,
} from "../../critPlayer";
import { holeHash, skyY } from "../../critPlayer/shared";

const SWARM_IN_MS = 220;
// the swarms swinging out (to SWARM_OUT of the viewport's width either side
// and SWARM_LIFT over or under the front), then charging together
const SWARM_SWING_MS = 350;
const SWARM_CHARGE_MS = 280;
const SWARM_OUT = 0.32;
const SWARM_LIFT = 260;
const SWARM_SKY = 700;
// the melee: the swarms circle each other this far apart (of the
// viewport's width), squashed, this fast
const SWARM_CIRCLE = 0.2;
const SWARM_CIRCLE_SQUASH = 0.6;
const SWARM_CIRCLE_SPIN = 0.007;
// each swarm's bits whirling round its middle: how many, their reach, spin
// and size; the first few are its leader wisps
const SWARM_BITS = 54;
const SWARM_REACH: [number, number] = [50, 260];
const SWARM_SPIN: [number, number] = [0.004, 0.011];
const SWARM_BIT = 34;
const SWARM_LEADERS = 3;
const SWARM_LEADER = 1.1;
// the clash: a pair of bits wiping each other out every SWARM_CLASH_EVERY_MS
const SWARM_CLASHES = 24;
const SWARM_CLASH_EVERY_MS = 45;
const SWARM_CLASH = 150;
const SWARM_CLASH_SHAKE = 0.4;
// the gold survivors diving onto each bar, a few a bar, one after another
const SWARM_PER_BAR = 3;
const SWARM_DIVE_MS = 260;
const SWARM_DIVE_EVERY_MS = 45;
const SWARM_HIT = 140;
// the last: the rest of the swarm onto its own bar
const SWARM_LAST_GAP_MS = 150;
const SWARM_BOOM = 380;
const SWARM_SHAKE = 0.7;
const SWARM_BOOM_SHAKE = 2.4;
const SWARM_TAIL_MS = 900;

const outAt = SWARM_IN_MS + SWARM_SWING_MS;
const meetAt = outAt + SWARM_CHARGE_MS;
const pourAt = meetAt + SWARM_CLASHES * SWARM_CLASH_EVERY_MS + 100;
const GOLD = 1;
const WHITE = -1;

// the front's middle: between the top bar and the sky the white swarm leaves
const frontY = (r: Running, bars: Point[]) =>
  (skyY(r, bars, 0) + skyY(r, bars, SWARM_SKY)) / 2;

// a swarm's middle: gold bursting out of the number, white diving from the
// sky, both swinging out to its own side, charging in and circling the other
function swarmMiddle(
  r: Running,
  bars: Point[],
  side: number,
  ms: number,
  into: Point,
): Point {
  const w = r.viewportWidth;
  const fy = frontY(r, bars);
  const from =
    side === GOLD
      ? { x: 0, y: 0 }
      : { x: w * SWARM_OUT, y: skyY(r, bars, SWARM_SKY) - 300 };
  const out = { x: -side * w * SWARM_OUT, y: fy + side * SWARM_LIFT };
  if (ms < outAt) {
    const p = easeOut(clamp01((ms - SWARM_IN_MS) / SWARM_SWING_MS));
    into.x = lerp(from.x, out.x, p);
    into.y = lerp(from.y, out.y, p);
    return into;
  }
  // charging in onto its spot in the circle, then going round it
  const a =
    Math.max(0, ms - meetAt) * SWARM_CIRCLE_SPIN +
    (side === GOLD ? Math.PI : 0);
  const circle = {
    x: Math.cos(a) * w * SWARM_CIRCLE,
    y: fy + Math.sin(a) * w * SWARM_CIRCLE * SWARM_CIRCLE_SQUASH,
  };
  const p = easeIn(clamp01((ms - outAt) / SWARM_CHARGE_MS));
  into.x = lerp(out.x, circle.x, p);
  into.y = lerp(out.y, circle.y, p);
  return into;
}

// bit i of a swarm, whirling round its middle (the two whirl opposite ways),
// spreading out as it bursts out
function bitAt(
  r: Running,
  bars: Point[],
  side: number,
  i: number,
  ms: number,
  into: Point,
): Point {
  swarmMiddle(r, bars, side, ms, into);
  const spread =
    0.25 + 0.75 * smoothstep(clamp01((ms - SWARM_IN_MS) / SWARM_SWING_MS));
  const reach =
    lerp(SWARM_REACH[0], SWARM_REACH[1], holeHash(i, 2101 + side)) * spread;
  const spin = lerp(SWARM_SPIN[0], SWARM_SPIN[1], holeHash(i, 2103 + side));
  const a = holeHash(i, 2105 + side) * Math.PI * 2 + side * spin * ms;
  into.x += Math.cos(a) * reach;
  into.y += Math.sin(a) * reach * 0.8;
  return into;
}

// clash k wipes out white bits 2k and 2k + 1 and one gold bit; the leaders
// go last, and every third gold bit (its leaders among them) lives
const clashAt = (k: number) => meetAt + k * SWARM_CLASH_EVERY_MS;
const whiteDiesAt = (i: number) =>
  clashAt(
    i < SWARM_LEADERS
      ? SWARM_CLASHES - 1 - i
      : Math.floor((i - SWARM_LEADERS) / 2) % SWARM_CLASHES,
  );
const goldLives = (i: number) => i % 3 === 0;
const goldDiesAt = (i: number) =>
  goldLives(i) ? Infinity : clashAt(Math.floor(i / 1.5) % SWARM_CLASHES);

// the bars the survivors dive on, top to bottom, its own last
const diveBars = (bars: Point[]) => byHeight(bars).filter((i) => i !== 0);
const diveAt = (k: number) => pourAt + k * SWARM_DIVE_EVERY_MS;
const lastAt = (bars: Point[]) =>
  diveAt(diveBars(bars).length * SWARM_PER_BAR) +
  SWARM_DIVE_MS +
  SWARM_LAST_GAP_MS;
// enough gold bits that a survivor dives into every slot, a few left over
const goldBits = (bars: Point[]) =>
  Math.max(SWARM_BITS, 3 * (diveBars(bars).length * SWARM_PER_BAR + 4));
const diveSpot = (r: Running, bars: Point[], bar: number, k: number) =>
  along(r, bars, bar, ((k % SWARM_PER_BAR) - 1) * 0.6);

// gold bit i: whirling, then (a survivor) diving from where it was onto its
// slot's bar, or onto its own with the rest
function goldAt(
  r: Running,
  bars: Point[],
  i: number,
  ms: number,
  into: Point,
): Point | null {
  if (ms < SWARM_IN_MS || ms >= goldDiesAt(i)) return null;
  if (ms < pourAt) return bitAt(r, bars, GOLD, i, ms, into);
  const dives = diveBars(bars);
  const k = i / 3;
  const own = k >= dives.length * SWARM_PER_BAR;
  const start = own ? lastAt(bars) - SWARM_DIVE_MS : diveAt(k);
  const d = easeIn(clamp01((ms - start) / SWARM_DIVE_MS));
  if (d >= 1) return null;
  const from = bitAt(r, bars, GOLD, i, Math.min(ms, start), into);
  const to = own
    ? bars[0]
    : diveSpot(r, bars, dives[Math.floor(k / SWARM_PER_BAR)], k);
  into.x = lerp(from.x, to.x, d);
  into.y = lerp(from.y, to.y, d);
  return into;
}

const whiteAt = (
  r: Running,
  bars: Point[],
  i: number,
  ms: number,
  into: Point,
): Point | null =>
  ms < SWARM_IN_MS || ms >= whiteDiesAt(i)
    ? null
    : bitAt(r, bars, WHITE, i, ms, into);

const spot: Point = { x: 0, y: 0 };

registerFloorCrit("swarmWarCrit", {
  plan(_r, bars, hit) {
    diveBars(bars).forEach((bar, b) => {
      for (let j = 0; j < SWARM_PER_BAR; j++)
        hit(bar, diveAt(b * SWARM_PER_BAR + j) + SWARM_DIVE_MS);
    });
    hit(0, lastAt(bars), 1);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    if (ms < SWARM_IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / SWARM_IN_MS,
        sx: 1 + ms / SWARM_IN_MS,
        sy: 1 + ms / SWARM_IN_MS,
      });
    let clashed = 0;
    for (let k = 0; k < SWARM_CLASHES; k++) if (ms >= clashAt(k)) clashed++;
    while (r.kicked < clashed) {
      if (r.kicked === 0) playExplosion();
      r.kicked++;
      r.shake(SWARM_CLASH_SHAKE);
    }
    const gold = goldBits(bars);
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    for (let i = SWARM_LEADERS; i < SWARM_BITS; i++) {
      const at = whiteAt(r, bars, i, ms, spot);
      if (at)
        stampGlimmer(ctx, at.x, at.y, SWARM_BIT, now * 0.003 + i, COLOR.white);
    }
    for (let i = 0; i < gold; i++) {
      // the leaders are drawn as wisps below
      if (i % 3 === 0 && i / 3 < SWARM_LEADERS) continue;
      const at = goldAt(r, bars, i, ms, spot);
      if (at)
        stampGlimmer(
          ctx,
          at.x,
          at.y,
          SWARM_BIT * 1.2,
          now * 0.003 + i,
          COLOR.heavenlyGold,
        );
    }
    ctx.globalCompositeOperation = previous;
    // the leader wisps streaking at the head of each swarm
    for (let i = 0; i < SWARM_LEADERS; i++) {
      const lead = i * 3;
      drawWispBetween(
        ctx,
        (t) => goldAt(r, bars, lead, t, { x: 0, y: 0 }),
        ms,
        now,
        WISP_SIZE * SWARM_LEADER,
        0.6,
        SWARM_IN_MS,
        lastAt(bars),
      );
      drawWispBetween(
        ctx,
        (t) => whiteAt(r, bars, i, t, { x: 0, y: 0 }),
        ms,
        now,
        WISP_SIZE * SWARM_LEADER,
        0.3,
        SWARM_IN_MS,
        whiteDiesAt(i),
      );
    }
    // every clash where its white bit went down
    for (let k = 0; k < SWARM_CLASHES; k++) {
      const since = ms - clashAt(k);
      if (since < 0) continue;
      const i =
        k >= SWARM_CLASHES - SWARM_LEADERS
          ? SWARM_CLASHES - 1 - k
          : SWARM_LEADERS + 2 * k;
      const at = bitAt(r, bars, WHITE, i, clashAt(k), spot);
      drawDetonation(ctx, at, since, SWARM_CLASH, now);
    }
    const dives = diveBars(bars);
    dives.forEach((bar, b) => {
      for (let j = 0; j < SWARM_PER_BAR; j++) {
        const k = b * SWARM_PER_BAR + j;
        drawDetonation(
          ctx,
          diveSpot(r, bars, bar, k),
          ms - diveAt(k) - SWARM_DIVE_MS,
          SWARM_HIT,
          now,
        );
      }
    });
    drawDetonation(ctx, bars[0], ms - lastAt(bars), SWARM_BOOM, now);
  },
  tailMs: SWARM_TAIL_MS,
  shake: (step) => (step ? SWARM_BOOM_SHAKE : SWARM_SHAKE),
});
