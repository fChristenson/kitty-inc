// Snowball Fight, a floor crit: glitter strewn along every bar in view; on
// each two balls roll in from both ends at once, faster and faster, the
// glitter sticking on, swelling and wobbling, and smash head-on in its middle
// in a burst (the hit that levels it), the bars going off top to bottom in a
// quickening ripple; every burst's bits fly to its own bar, building two
// trembling giants at its ends, which roll in rumbling and smash together in
// the biggest burst and the hardest shake
import { COLOR } from "../../../../palette";
import {
  drawSnowball,
  planSnowball,
  rollAt,
  rolledAt,
  stuckAt,
  type RollPass,
  type Snowball,
} from "../../../../shared/animationStyles/snowball";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
import { easeOut } from "../../../../shared/easing";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../critPlayer";
import { BAR_HALF_H, holeHash, ownLast } from "../../critPlayer/shared";

const IN_MS = 150;
// a pair and its glitter pop in APPEAR_MS before it rolls
const APPEAR_MS = 90;
const INSET = 50;
// the other bars: each pair rolls ROLL_MS (top bar to the last, quickening),
// the meetings FIRST_GAP apart shrinking by DECAY, at least MIN_GAP, all
// within SPREAD
const ROLL_MS: [number, number] = [260, 160];
const FIRST_GAP = 90;
const DECAY = 0.8;
const MIN_GAP = 30;
const SPREAD = 360;
// they stop MEET_X px off the middle, overlapping as they smash
const MEET_X = 12;
// the glitter: SPECKS a half bar, SPECK px, picked up within REACH
const SPECKS = 9;
const SPECK = 16;
const REACH = 26;
// a ball: BALL px, growing GROW px a sqrt of a speck, wobbling WOBBLE px
const BALL = 16;
const GROW = 6;
const WOBBLE = 6;
const BALL_WISP = 50;
// a meeting: a flash, then BITS bits kicked KICK px out, flying FLY_MS (plus
// up to FLY_JITTER) onto the giants on its own bar
const FLASH_MS = 240;
const FLASH_R = 150;
const BITS = 14;
const KICK = 190;
const FLY_MS = 180;
const FLY_JITTER = 40;
const BIT = 15;
// the giants: GIANT px, growing GIANT_GROW a sqrt of a speck or bit, at most
// GIANT_MAX of the reach, popping POP_R bigger for POP_MS as a bit lands,
// trembling up to TREMBLE px; HOLD_MS after the last lands they roll in
// GIANT_ROLL_MS (ALONE_WAIT after the start if its bar's alone)
const GIANT_SPECKS = 12;
const GIANT = 34;
const GIANT_GROW = 6.5;
const GIANT_MAX = 0.42;
const POP_R = 0.05;
const POP_MS = 120;
const TREMBLE = 8;
const HOLD_MS = 40;
const GIANT_ROLL_MS = 240;
const ALONE_WAIT = 260;
// a rumble rising as they roll in
const RUMBLE_MS = 40;
const RUMBLE: [number, number] = [0.25, 1];
// the smash: a flash, one blast and a spray of everything they carried
const SMASH_FLASH_MS = 320;
const SMASH_R = 420;
const SMASH_BLAST = 360;
const SPRAY_MIN = 90;
const SPRAY_MS = 620;
const SPRAY_SPEED: [number, number] = [0.6, 1.9];
const GRAVITY = 0.002;
const TAIL_MS = DETONATION_MS;
// shakes by step: a bar's smash, its own bar's
const SHAKES = [1, 3.4];

const GOLD = fadeStops(COLOR.heavenlyGold);
const WHITE = fadeStops(COLOR.white, 0.3);

interface Pair {
  bar: number;
  own: boolean;
  start: number;
  meet: number;
  left: Snowball;
  right: Snowball;
  // each ball's spot at ms, from its bar's middle, wobbling
  atL: (ms: number) => Point;
  atR: (ms: number) => Point;
}
interface State {
  pairs: Pair[];
  own: Pair;
  // the giants' biggest radius
  giantR: number;
  // the bits: the pair they burst from, when they land, which giant (±1),
  // their spot on its crust and their kick out
  bitPair: Int16Array;
  bitLand: Float32Array;
  bitSide: Int8Array;
  bitAngle: Float32Array;
  kickX: Float32Array;
  kickY: Float32Array;
  sprayN: number;
  jolts: number[];
  powers: number[];
}
const states = new WeakMap<Running, State>();
const gL: Point = { x: 0, y: 0 };
const gR: Point = { x: 0, y: 0 };

// the glitter on one half of a bar, `side` ±1, `count` specks
function strew(reach: number, side: number, count: number, salt: number) {
  const specks: Point[] = [];
  for (let i = 0; i < count; i++)
    specks.push({
      x: side * (MEET_X + ((i + 0.5) / count) * (reach - MEET_X)),
      y: (holeHash(i + salt, 5120) - 0.5) * BAR_HALF_H * 0.9,
    });
  return specks;
}

// a ball rolling in from the `side` end to the middle over start..meet
function roller(
  reach: number,
  side: number,
  stop: number,
  start: number,
  meet: number,
  count: number,
  salt: number,
): Snowball {
  const passes: RollPass[] = [
    {
      from: { x: side * reach, y: 0 },
      to: { x: side * stop, y: 0 },
      startMs: start,
      endMs: meet,
    },
  ];
  return planSnowball(passes, strew(reach, side, count, salt), REACH);
}

// ball's spot at ms, shaking `shake(ms)` px
function wobbler(
  ball: Snowball,
  salt: number,
  shake: (ms: number) => number,
): (ms: number) => Point {
  const p: Point = { x: 0, y: 0 };
  return (ms) => {
    rollAt(ball, ms, p);
    const s = shake(ms);
    p.x += Math.sin(ms * 0.083 + salt) * s * 0.6;
    p.y += Math.cos(ms * 0.067 + salt * 1.7) * s;
    return p;
  };
}

registerFloorCrit("snowballFightCrit", {
  plan(r, bars, hit) {
    const reach = r.play.barHalfWidth - INSET;
    const order = ownLast(bars);
    const others = order.length - 1;
    // the meetings, quickening top to bottom
    const gaps: number[] = [];
    let total = 0;
    for (let k = 0; k < others - 1; k++) {
      const gap = Math.max(MIN_GAP, FIRST_GAP * DECAY ** k);
      gaps.push(gap);
      total += gap;
    }
    const squeeze = total > SPREAD ? SPREAD / total : 1;
    const pairs: Pair[] = [];
    let meet = IN_MS + ROLL_MS[0];
    for (let k = 0; k < others; k++) {
      const bar = order[k];
      const roll = lerp(
        ROLL_MS[0],
        ROLL_MS[1],
        others > 1 ? k / (others - 1) : 0,
      );
      const start = meet - roll;
      const left = roller(reach, -1, MEET_X, start, meet, SPECKS, k * 31);
      const right = roller(reach, 1, MEET_X, start, meet, SPECKS, k * 31 + 17);
      const rolled = (ms: number) => WOBBLE * clamp01((ms - start) / roll);
      pairs.push({
        bar,
        own: false,
        start,
        meet,
        left,
        right,
        atL: wobbler(left, k * 2, rolled),
        atR: wobbler(right, k * 2 + 1, rolled),
      });
      hit(bar, meet, 0);
      if (k < gaps.length) meet += gaps[k] * squeeze;
    }
    // the bits, half onto each giant
    const n = others * BITS;
    const bitPair = new Int16Array(n);
    const bitLand = new Float32Array(n);
    const bitSide = new Int8Array(n);
    const bitAngle = new Float32Array(n);
    const kickX = new Float32Array(n);
    const kickY = new Float32Array(n);
    let firstLand = Infinity;
    let lastLand = 0;
    for (let i = 0; i < n; i++) {
      const k = Math.floor(i / BITS);
      bitPair[i] = k;
      bitLand[i] = pairs[k].meet + FLY_MS + holeHash(i, 5121) * FLY_JITTER;
      bitSide[i] = i % 2 ? 1 : -1;
      bitAngle[i] = holeHash(i, 5122) * Math.PI * 2;
      const a = -Math.PI / 2 + (holeHash(i, 5123) - 0.5) * 2.6;
      kickX[i] = Math.cos(a);
      kickY[i] = Math.sin(a);
      firstLand = Math.min(firstLand, bitLand[i]);
      lastLand = Math.max(lastLand, bitLand[i]);
    }
    const rollStart = n > 0 ? lastLand + HOLD_MS : IN_MS + ALONE_WAIT;
    const smash = rollStart + GIANT_ROLL_MS;
    const swell = n > 0 ? firstLand : IN_MS;
    const giantR = Math.min(
      reach * GIANT_MAX,
      GIANT + GIANT_GROW * Math.sqrt(n / 2 + GIANT_SPECKS),
    );
    const stop = giantR * 0.55;
    const left = roller(reach, -1, stop, rollStart, smash, GIANT_SPECKS, 900);
    const right = roller(reach, 1, stop, rollStart, smash, GIANT_SPECKS, 917);
    const tremble = (ms: number) =>
      ms < rollStart
        ? TREMBLE * clamp01((ms - swell) / Math.max(1, rollStart - swell))
        : TREMBLE * 1.3;
    const own: Pair = {
      bar: order[others],
      own: true,
      start: Math.max(IN_MS, swell - APPEAR_MS),
      meet: smash,
      left,
      right,
      atL: wobbler(left, 40, tremble),
      atR: wobbler(right, 41, tremble),
    };
    pairs.push(own);
    hit(own.bar, smash, 1);
    const jolts: number[] = [];
    const powers: number[] = [];
    for (let t = rollStart; t < smash - RUMBLE_MS / 2; t += RUMBLE_MS) {
      jolts.push(t);
      powers.push(lerp(RUMBLE[0], RUMBLE[1], (t - rollStart) / GIANT_ROLL_MS));
    }
    states.set(r, {
      pairs,
      own,
      giantR,
      bitPair,
      bitLand,
      bitSide,
      bitAngle,
      kickX,
      kickY,
      sprayN: Math.max(SPRAY_MIN, n + GIANT_SPECKS * 2),
      jolts,
      powers,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { pairs, own, jolts, powers } = state;
    const { bitPair, bitLand, bitSide, bitAngle, kickX, kickY } = state;
    if (ms < IN_MS) {
      const p = ms / IN_MS;
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont * (1 + 0.4 * p), {
        alpha: 1 - p,
      });
    }
    while (r.kicked < jolts.length && ms >= jolts[r.kicked])
      r.shake(powers[r.kicked++]);
    const previous = ctx.globalCompositeOperation;

    // the pairs on the other bars: rolling in, swelling and wobbling
    for (let i = 0; i < pairs.length; i++) {
      const p = pairs[i];
      if (p.own || ms < p.start - APPEAR_MS || ms >= p.meet) continue;
      const bar = bars[p.bar];
      const appear = clamp01((ms - (p.start - APPEAR_MS)) / APPEAR_MS);
      const heat = clamp01((ms - p.start) / (p.meet - p.start));
      ctx.save();
      ctx.translate(bar.x, bar.y);
      for (let side = 0; side < 2; side++) {
        // drawWispHead leaves globalAlpha at 1
        ctx.globalAlpha = appear;
        const ball = side ? p.right : p.left;
        const at = side ? p.atR : p.atL;
        const radius =
          (BALL + GROW * Math.sqrt(stuckAt(ball, ms))) *
          (1 + 0.1 * Math.sin(ms * 0.07 + side * 2 + i));
        drawSnowball(ctx, ball, ms, at(ms), radius, SPECK);
        drawWispHead(
          ctx,
          at,
          ms,
          now,
          WISP_SIZE * appear * (0.7 + radius / BALL_WISP),
          heat,
        );
      }
      ctx.restore();
    }

    // the giants on its own bar: popping as each bit lands, then rolling in
    const ownBar = bars[own.bar];
    let landedL = 0;
    let landedR = 0;
    let popL = 0;
    let popR = 0;
    for (let i = 0; i < bitLand.length; i++) {
      const since = ms - bitLand[i];
      if (since < 0) continue;
      const pop = since < POP_MS ? 1 - since / POP_MS : 0;
      if (bitSide[i] < 0) {
        landedL++;
        popL += pop;
      } else {
        landedR++;
        popR += pop;
      }
    }
    const rL =
      Math.min(
        state.giantR,
        GIANT + GIANT_GROW * Math.sqrt(landedL + stuckAt(own.left, ms)),
      ) *
      (1 + POP_R * Math.min(3, popL));
    const rR =
      Math.min(
        state.giantR,
        GIANT + GIANT_GROW * Math.sqrt(landedR + stuckAt(own.right, ms)),
      ) *
      (1 + POP_R * Math.min(3, popR));
    const smashed = ms >= own.meet;
    const appear = clamp01((ms - own.start) / APPEAR_MS);
    const pace = clamp01((ms - own.left.passes[0].startMs) / GIANT_ROLL_MS);
    let rollL = 0;
    let rollR = 0;
    if (!smashed && ms >= own.start) {
      ctx.save();
      ctx.translate(ownBar.x, ownBar.y);
      ctx.globalAlpha = appear;
      const atL = own.atL(ms);
      gL.x = atL.x;
      gL.y = atL.y;
      drawSnowball(ctx, own.left, ms, atL, rL, SPECK * 1.2);
      drawWispHead(
        ctx,
        own.atL,
        ms,
        now,
        WISP_SIZE * appear * (1 + rL / 60),
        0.4 + pace,
      );
      ctx.globalAlpha = appear;
      const atR = own.atR(ms);
      gR.x = atR.x;
      gR.y = atR.y;
      drawSnowball(ctx, own.right, ms, atR, rR, SPECK * 1.2);
      drawWispHead(
        ctx,
        own.atR,
        ms,
        now,
        WISP_SIZE * appear * (1 + rR / 60),
        0.4 + pace,
      );
      ctx.restore();
      rollL = rolledAt(own.left, ms) / Math.max(1, rL);
      rollR = rolledAt(own.right, ms) / Math.max(1, rR);
    }

    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    // the bits: kicked out of each burst, snapping onto a giant's crust, and
    // turning with it once they're on
    if (!smashed)
      for (let i = 0; i < bitLand.length; i++) {
        const p = pairs[bitPair[i]];
        const since = ms - p.meet;
        if (since < 0) continue;
        const left = bitSide[i] < 0;
        const g = left ? gL : gR;
        const radius = left ? rL : rR;
        const a = bitAngle[i] + (left ? rollL : rollR);
        const tx = ownBar.x + g.x + Math.cos(a) * radius * 0.95;
        const ty = ownBar.y + g.y + Math.sin(a) * radius * 0.95;
        const color = i % 3 ? COLOR.heavenlyGold : COLOR.white;
        ctx.globalAlpha = 1;
        if (ms >= bitLand[i]) {
          stampGlimmer(ctx, tx, ty, BIT * 1.2, i, color);
          continue;
        }
        const u = (since / (bitLand[i] - p.meet)) ** 1.3;
        const from = bars[p.bar];
        const cx = from.x + kickX[i] * KICK;
        const cy = from.y + kickY[i] * KICK;
        const w = 1 - u;
        stampGlimmer(
          ctx,
          w * w * from.x + 2 * w * u * cx + u * u * tx,
          w * w * from.y + 2 * w * u * cy + u * u * ty,
          BIT * (1.3 - 0.3 * u),
          i,
          color,
        );
      }
    // each meeting's flash
    for (let i = 0; i < pairs.length; i++) {
      const p = pairs[i];
      const since = ms - p.meet;
      if (p.own || since < 0 || since >= FLASH_MS) continue;
      const bar = bars[p.bar];
      const fade = 1 - since / FLASH_MS;
      const radius = FLASH_R * (0.5 + 0.5 * easeOut(clamp01(since / 50)));
      ctx.globalAlpha = fade * fade;
      drawGlow(ctx, GOLD, bar.x, bar.y, radius);
      drawGlow(ctx, WHITE, bar.x, bar.y, radius * 0.5);
    }
    // the smash: a blinding flash and everything they carried sprayed out
    const since = ms - own.meet;
    if (since >= 0 && since < SMASH_FLASH_MS) {
      const fade = 1 - since / SMASH_FLASH_MS;
      const radius = SMASH_R * (0.5 + 0.5 * easeOut(clamp01(since / 60)));
      ctx.globalAlpha = fade * fade;
      drawGlow(ctx, GOLD, ownBar.x, ownBar.y, radius);
      drawGlow(ctx, WHITE, ownBar.x, ownBar.y, radius * 0.5);
    }
    if (since >= 0 && since < SPRAY_MS) {
      const fade = 1 - since / SPRAY_MS;
      const fall = 0.5 * GRAVITY * since * since;
      ctx.globalAlpha = fade;
      for (let i = 0; i < state.sprayN; i++) {
        const a = holeHash(i, 5124) * Math.PI * 2;
        const speed = lerp(SPRAY_SPEED[0], SPRAY_SPEED[1], holeHash(i, 5125));
        const out = state.giantR * 0.5 + speed * since;
        stampGlimmer(
          ctx,
          ownBar.x + Math.cos(a) * out,
          ownBar.y + Math.sin(a) * out + fall,
          BIT * (0.6 + 0.8 * fade),
          i,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
    }
    endLightBatch(ctx);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;
    drawDetonation(ctx, ownBar, since, SMASH_BLAST, now);
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
