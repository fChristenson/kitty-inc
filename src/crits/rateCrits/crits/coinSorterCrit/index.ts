// Coin Sorter, a rate crit: the number bursts into hundreds of coins strewn
// over every bar in view; they sort themselves, hopping in four quickening
// waves into neat stacks lined up beside each readout, each wave a click and
// a jolt, the stacks squashing as they grow; then each bar's stacks topple
// like dominoes, the far one first, quicker each, the last slamming into the
// readout (the reward) and every coin pouring in, bar after bar; its own
// last, tallest, trembling and rumbling first, landing in a blast. The bar's
// next payouts pay more for every worker on its floor. The stacks are a
// fixed count per bar: a rate crit's play doesn't hand plan/draw its floors
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import { getRenderedWorkerCount } from "../../../../floors/worker";
import { BLOW_UP, flingOut } from "../../../../shared/animationStyles/clutter";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { easeOut } from "../../../../shared/easing";
import { playSpinTick } from "../../../../sound";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  clamp01,
  drawText,
  lerp,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import {
  BAR_HALF_H,
  holeHash,
  ownLast,
} from "../../../floorCrits/critPlayer/shared";

// the number swelling and bursting, the coins flung out over FLING_MS
const BLOW_MS = 110;
const FLING_MS = 230;
// about BITS coins in all, PER_BAR on a bar, OWN_MORE times as many on its own
const BITS = 320;
const PER_BAR: [number, number] = [36, 96];
const OWN_MORE = 1.6;
// stacks per bar (fixed, see above) and coins per stack
const STACKS = 3;
const OWN_STACKS = 4;
const LEVELS: [number, number] = [8, 13];
const OWN_LEVELS: [number, number] = [12, 20];
// a coin: COIN_W wide, its face COIN_FACE high over a COIN_RIM rim; stacked
// COIN_T apart
const COIN_W = 34;
const COIN_FACE = 13;
const COIN_RIM = 5;
const COIN_T = 6;
const SPR_W = COIN_W + 4;
const SPR_H = COIN_FACE + COIN_RIM + 4;
const SPRITE_SCALE = 2;
const SPIN = 0.03;
// the readout READOUT of a bar's half width out, CONTACT_Y off its middle;
// the nearest stack's foot FIRST_GAP left of it, the others STACK_GAP apart,
// standing on FOOT_Y
const READOUT = 0.6;
const CONTACT_Y = -20;
const FIRST_GAP = 36;
const STACK_GAP = 34;
const FOOT_Y = BAR_HALF_H * 0.7;
const JITTER = 1.5;
// the mess strewn from LEFT of the bar's half width, SPREAD_Y above and below
const LEFT = 0.95;
const SPREAD_Y = BAR_HALF_H * 1.2;
// the sorting waves: each a share of every stack's levels (bottom first)
// hopping HOP_MS on an arc HOP_RISE high, staggered STAGGER_MS over STAGGERS
const WAVE_AT = [340, 500, 625, 720];
const WAVES = WAVE_AT.length;
const HOP_MS = 120;
const HOP_RISE: [number, number] = [50, 120];
const STAGGERS = 5;
const STAGGER_MS = 8;
const WAVE_LAND = WAVE_AT.map(
  (at) => at + HOP_MS + (STAGGER_MS * (STAGGERS - 1)) / 2,
);
const WAVE_SHAKE = [0.4, 0.55, 0.75, 1];
const WAVE_TICK = [1, 1.15, 1.3, 1.5];
// each landing: the strewn coins jumping JUMP px, the stacks squashing
// SQUASH, the stack tops glinting GLINT px, all fading over BEAT_MS
const JUMP = 12;
const SQUASH = 0.2;
const GLINT = 46;
const BEAT_MS = 90;
// the dominoes: from CHAIN_AT, a bar every BAR_GAPS_MS (quickening); each
// stack tipping over TOPPLE_MS (its own OWN_TOPPLE_MS), QUICK times as long
// each one on; a fallen one crashing on down to FALL radians over AFTER_MS
const CHAIN_AT = WAVE_LAND[WAVES - 1] + 50;
const BAR_GAPS_MS: [number, number] = [100, 50];
const TOPPLE_MS = 110;
const OWN_TOPPLE_MS = 130;
const QUICK = 0.78;
const FALL = 1.25;
const AFTER_MS = 80;
const CONTACT_TICK = 1.6;
const CONTACT_SHAKE = 0.5;
const CONTACT_FLASH = 70;
const OWN_CONTACT_FLASH = 100;
const CONTACT_MS = 110;
// its own trembling up to OWN_TREMBLE px at its tops over OWN_WAIT_MS of
// rumble before its first stack tips
const OWN_WAIT_MS = 160;
const OWN_TREMBLE = 9;
const TREMBLE_MS = 16;
const RUMBLE_MS = 40;
const RUMBLE_SHAKE: [number, number] = [0.3, 1];
// a bar's coins pouring into its readout over POUR_MS, the tops and nearest
// stacks first, spread over POUR_SPREAD_MS + POUR_LEVEL_MS
const POUR_MS = 110;
const POUR_SPREAD_MS = 70;
const POUR_LEVEL_MS = 40;
const POUR_LIFT = 40;
const BLAST = 140;
const LAND_FLASH_MS = 160;
const OWN_BLAST = 320;
// shakes by step: -, a readout, its own
const SHAKES = [0.5, 1.3, 3];

interface State {
  count: number;
  bars: number;
  // each coin's bar and stack, its level 0..1 up the stack, where it lies
  // strewn and its slot in the stack (from its bar's middle), how high it's
  // flung and hops, when it hops and pours
  barOf: Int16Array;
  stackOf: Int16Array;
  level: Float32Array;
  sx: Float32Array;
  sy: Float32Array;
  ex: Float32Array;
  ey: Float32Array;
  lift: Float32Array;
  rise: Float32Array;
  hopAt: Float32Array;
  pourAt: Float32Array;
  // each stack's bar, levels, foot's right corner (its pivot, from its
  // bar's middle), whether it's the nearest, when it tips and hits, the
  // angle it hits at and falls to, and where its top hits
  stackBar: Int16Array;
  stackLevels: Int16Array;
  pivotX: Float32Array;
  nearest: Uint8Array;
  toppleAt: Float32Array;
  contactAt: Float32Array;
  contactAng: Float32Array;
  fallAng: Float32Array;
  contactX: Float32Array;
  contactY: Float32Array;
  // this frame's angle and tremble per stack
  cos: Float32Array;
  sin: Float32Array;
  tremble: Float32Array;
  readX: number;
  landAt: Float32Array;
  trembleFrom: number;
  // shakes and ticks kicked by the crit itself, in time order
  kickAt: Float32Array;
  kickShake: Float32Array;
  kickTick: Float32Array;
  endMs: number;
}
const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };
const coin: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

// a coin seen from above at a slant: a gold face over its rim, drawn once
let sprite: HTMLCanvasElement | null = null;
function coinSprite(): HTMLCanvasElement {
  if (sprite) return sprite;
  const canvas = document.createElement("canvas");
  canvas.width = SPR_W * SPRITE_SCALE;
  canvas.height = SPR_H * SPRITE_SCALE;
  const g = canvas.getContext("2d")!;
  g.scale(SPRITE_SCALE, SPRITE_SCALE);
  const cx = SPR_W / 2;
  const rx = COIN_W / 2;
  const ry = COIN_FACE / 2;
  const top = 2 + ry;
  g.lineWidth = 1.5;
  g.strokeStyle = COLOR.coinOutline;
  g.fillStyle = COLOR.goldenHandshakeGold;
  g.beginPath();
  g.ellipse(cx, top + COIN_RIM, rx, ry, 0, 0, Math.PI);
  g.lineTo(cx - rx, top);
  g.lineTo(cx + rx, top);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = COLOR.coinGold;
  g.beginPath();
  g.ellipse(cx, top, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = COLOR.coinSpriteGold;
  g.beginPath();
  g.ellipse(cx, top, rx * 0.62, ry * 0.55, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = COLOR.white;
  g.globalAlpha = 0.7;
  g.beginPath();
  g.ellipse(
    cx - rx * 0.35,
    top - ry * 0.35,
    rx * 0.22,
    ry * 0.2,
    0,
    0,
    Math.PI * 2,
  );
  g.fill();
  sprite = canvas;
  return canvas;
}

// a bar's next payouts paying `pays` times, `left` to go
const sorted = defineBarEffect<{ pays: number; left: number }>({
  payout: (v) => v.pays,
  onPayout: (v) =>
    v.left > 1 ? { pays: v.pays, left: v.left - 1 } : undefined,
});

const clampRound = (v: number, range: [number, number]) =>
  Math.max(range[0], Math.min(range[1], Math.round(v)));

registerFloorCrit("coinSorterCrit", {
  reward(t) {
    t.flipRate();
    const { payouts, ownPayouts, perWorker, min } = meta.values;
    const pays = Math.max(min, 1 + perWorker * getRenderedWorkerCount(t.floor));
    const left = t.own ? ownPayouts : payouts;
    const was = sorted.get(t.floor);
    sorted.set(
      t.floor,
      was
        ? { pays: Math.max(was.pays, pays), left: was.left + left }
        : { pays, left },
    );
    t.punch(`x${Math.round(pays * 100) / 100}`);
  },
  plan(r, bars, hit) {
    coinSprite();
    const half = r.play.barHalfWidth;
    const n = bars.length;
    const readX = half * READOUT;
    const x0 = -half * LEFT;
    const x1 = readX - 20;
    const per = Math.max(
      PER_BAR[0],
      Math.min(PER_BAR[1], BITS / (n - 1 + OWN_MORE)),
    );
    const levels = new Int16Array(n);
    const firstStack = new Int16Array(n);
    let stackCount = 0;
    let count = 0;
    for (let b = 0; b < n; b++) {
      const own = b === 0;
      const stacks = own ? OWN_STACKS : STACKS;
      levels[b] = own
        ? clampRound((per * OWN_MORE) / stacks, OWN_LEVELS)
        : clampRound(per / stacks, LEVELS);
      firstStack[b] = stackCount;
      stackCount += stacks;
      count += stacks * levels[b];
    }
    const stackBar = new Int16Array(stackCount);
    const stackLevels = new Int16Array(stackCount);
    const stackJ = new Int16Array(stackCount);
    const pivotX = new Float32Array(stackCount);
    const nearest = new Uint8Array(stackCount);
    for (let b = 0; b < n; b++) {
      const stacks = b === 0 ? OWN_STACKS : STACKS;
      for (let j = 0; j < stacks; j++) {
        const g = firstStack[b] + j;
        stackBar[g] = b;
        stackLevels[g] = levels[b];
        stackJ[g] = j;
        pivotX[g] = readX - FIRST_GAP - j * (COIN_W + STACK_GAP);
        nearest[g] = j === 0 ? 1 : 0;
      }
    }
    // the dominoes, bar after bar, its own last
    const toppleAt = new Float32Array(stackCount);
    const contactAt = new Float32Array(stackCount);
    const contactAng = new Float32Array(stackCount);
    const fallAng = new Float32Array(stackCount);
    const contactX = new Float32Array(stackCount);
    const contactY = new Float32Array(stackCount);
    const landAt = new Float32Array(n);
    const kicks: { at: number; shake: number; tick: number }[] = [
      { at: BLOW_MS, shake: BLOW_UP.shake, tick: 0 },
    ];
    for (let w = 0; w < WAVES; w++)
      kicks.push({
        at: WAVE_LAND[w],
        shake: WAVE_SHAKE[w],
        tick: WAVE_TICK[w],
      });
    const order = ownLast(bars);
    let start = CHAIN_AT;
    let trembleFrom = 0;
    order.forEach((b, k) => {
      if (k > 0)
        start += lerp(
          BAR_GAPS_MS[0],
          BAR_GAPS_MS[1],
          (k - 1) / Math.max(1, order.length - 2),
        );
      const own = b === 0;
      let t = start;
      if (own) {
        trembleFrom = t;
        const rumbles = Math.floor(OWN_WAIT_MS / RUMBLE_MS);
        for (let j = 1; j <= rumbles; j++)
          kicks.push({
            at: t + j * RUMBLE_MS,
            shake: lerp(RUMBLE_SHAKE[0], RUMBLE_SHAKE[1], j / rumbles),
            tick: 0,
          });
        t += OWN_WAIT_MS;
      }
      const stacks = own ? OWN_STACKS : STACKS;
      const height = SPR_H + (levels[b] - 1) * COIN_T;
      for (let j = stacks - 1; j >= 0; j--) {
        const g = firstStack[b] + j;
        const dur =
          (own ? OWN_TOPPLE_MS : TOPPLE_MS) * QUICK ** (stacks - 1 - j);
        toppleAt[g] = t;
        contactAt[g] = t + dur;
        t += dur;
        const reach = j > 0 ? STACK_GAP : FIRST_GAP;
        const a = Math.asin(Math.min(1, reach / height));
        contactAng[g] = a;
        fallAng[g] = j > 0 ? Math.max(a, FALL) : a;
        // the top's middle at the angle it hits at
        const dx = -COIN_W / 2;
        const dy = -height;
        contactX[g] = pivotX[g] + dx * Math.cos(a) - dy * Math.sin(a);
        contactY[g] = FOOT_Y + dx * Math.sin(a) + dy * Math.cos(a);
        if (j > 0)
          kicks.push({
            at: contactAt[g],
            shake: own ? CONTACT_SHAKE : 0,
            tick: CONTACT_TICK + 0.15 * (stacks - 1 - j),
          });
      }
      landAt[b] = t;
      hit(b, t, own ? 2 : 1);
    });
    kicks.sort((a, b) => a.at - b.at);
    // the coins, each stack bottom up
    const barOf = new Int16Array(count);
    const stackOf = new Int16Array(count);
    const level = new Float32Array(count);
    const sx = new Float32Array(count);
    const sy = new Float32Array(count);
    const ex = new Float32Array(count);
    const ey = new Float32Array(count);
    const lift = new Float32Array(count);
    const rise = new Float32Array(count);
    const hopAt = new Float32Array(count);
    const pourAt = new Float32Array(count);
    let endMs = 0;
    let i = 0;
    for (let g = 0; g < stackCount; g++) {
      const b = stackBar[g];
      const h = stackLevels[g];
      const stacks = b === 0 ? OWN_STACKS : STACKS;
      for (let k = 0; k < h; k++, i++) {
        barOf[i] = b;
        stackOf[i] = g;
        level[i] = h > 1 ? k / (h - 1) : 1;
        sx[i] = lerp(x0, x1, Math.random());
        sy[i] = (Math.random() * 2 - 1) * SPREAD_Y;
        ex[i] = pivotX[g] - COIN_W / 2 + (Math.random() * 2 - 1) * JITTER;
        ey[i] = FOOT_Y - SPR_H / 2 - k * COIN_T;
        lift[i] = holeHash(i, 6120);
        rise[i] = lerp(HOP_RISE[0], HOP_RISE[1], holeHash(i, 6121));
        const wave = Math.min(WAVES - 1, Math.floor((k * WAVES) / h));
        hopAt[i] = WAVE_AT[wave] + (i % STAGGERS) * STAGGER_MS;
        pourAt[i] =
          landAt[b] +
          POUR_SPREAD_MS * (stackJ[g] / Math.max(1, stacks - 1)) +
          (1 - level[i]) * POUR_LEVEL_MS;
        endMs = Math.max(endMs, pourAt[i] + POUR_MS);
      }
    }
    states.set(r, {
      count,
      bars: n,
      barOf,
      stackOf,
      level,
      sx,
      sy,
      ex,
      ey,
      lift,
      rise,
      hopAt,
      pourAt,
      stackBar,
      stackLevels,
      pivotX,
      nearest,
      toppleAt,
      contactAt,
      contactAng,
      fallAng,
      contactX,
      contactY,
      cos: new Float32Array(stackCount),
      sin: new Float32Array(stackCount),
      tremble: new Float32Array(stackCount),
      readX,
      landAt,
      trembleFrom,
      kickAt: Float32Array.from(kicks, (k) => k.at),
      kickShake: Float32Array.from(kicks, (k) => k.shake),
      kickTick: Float32Array.from(kicks, (k) => k.tick),
      endMs,
    });
  },
  draw(ctx, r, ms, bars) {
    const s = states.get(r);
    if (!s || !sprite) return;
    const now = r.startedAt + ms;
    if (ms < BLOW_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 + (0.35 * ms) / BLOW_MS),
      );
    while (r.kicked < s.kickAt.length && ms >= s.kickAt[r.kicked]) {
      const k = r.kicked;
      if (s.kickShake[k] > 0) r.shake(s.kickShake[k]);
      if (s.kickTick[k] > 0) playSpinTick(s.kickTick[k]);
      r.kicked++;
    }
    drawDetonation(ctx, ORIGIN, ms - BLOW_MS * 0.5, BLOW_UP.size, now);
    const n = Math.min(s.bars, bars.length);
    if (ms >= BLOW_MS && ms < s.endMs) {
      // the last wave landed: the beat everything jumps and squashes to
      let wave = -1;
      for (let w = 0; w < WAVES; w++) if (ms >= WAVE_LAND[w]) wave = w;
      const beat =
        wave >= 0 ? clamp01(1 - (ms - WAVE_LAND[wave]) / BEAT_MS) : 0;
      const jump = JUMP * beat;
      const squash = 1 - SQUASH * beat;
      // each stack's angle, its own's tremble
      const shiver =
        clamp01((ms - s.trembleFrom) / OWN_WAIT_MS) *
        OWN_TREMBLE *
        (holeHash(Math.floor(ms / TREMBLE_MS), 6122) * 2 - 1);
      for (let g = 0; g < s.cos.length; g++) {
        const since = ms - s.toppleAt[g];
        let a = 0;
        if (since > 0) {
          const span = s.contactAt[g] - s.toppleAt[g];
          if (since < span) a = s.contactAng[g] * (since / span) ** 2;
          else
            a = lerp(
              s.contactAng[g],
              s.fallAng[g],
              easeOut(clamp01((since - span) / AFTER_MS)),
            );
        }
        s.cos[g] = Math.cos(a);
        s.sin[g] = Math.sin(a);
        s.tremble[g] =
          s.stackBar[g] === 0 && since < 0 && ms > s.trembleFrom ? shiver : 0;
      }
      const flung = (ms - BLOW_MS) / FLING_MS;
      for (let i = 0; i < s.count; i++) {
        const b = s.barOf[i];
        if (b >= n) continue;
        const bx = bars[b].x;
        const by = bars[b].y;
        let squeeze = 1;
        if (flung < 1) {
          spot.x = bx + s.sx[i];
          spot.y = by + s.sy[i];
          flingOut(ORIGIN, spot, s.lift[i], flung, coin);
          squeeze = Math.abs(Math.cos(ms * SPIN + i));
        } else {
          const hop = (ms - s.hopAt[i]) / HOP_MS;
          if (hop < 0) {
            coin.x = bx + s.sx[i];
            coin.y = by + s.sy[i] - jump * (0.5 + s.lift[i]);
          } else if (hop < 1) {
            coin.x = bx + lerp(s.sx[i], s.ex[i], hop);
            coin.y =
              by +
              lerp(s.sy[i], s.ey[i], hop) -
              s.rise[i] * 4 * hop * (1 - hop);
            squeeze = Math.abs(Math.cos(hop * Math.PI * 2 + i));
          } else {
            const pour = (ms - s.pourAt[i]) / POUR_MS;
            if (pour >= 1) continue;
            const g = s.stackOf[i];
            const px = s.pivotX[g];
            const dx = s.ex[i] - px + s.tremble[g] * s.level[i];
            const dy = (s.ey[i] - FOOT_Y) * squash;
            const c = s.cos[g];
            const sn = s.sin[g];
            const x = px + dx * c - dy * sn;
            const y = FOOT_Y + dx * sn + dy * c;
            if (pour > 0) {
              const e = pour * pour;
              coin.x = bx + lerp(x, s.readX, e);
              coin.y =
                by + lerp(y, CONTACT_Y, e) - POUR_LIFT * 4 * pour * (1 - pour);
              squeeze = Math.abs(Math.cos(pour * Math.PI * 3 + i));
            } else {
              coin.x = bx + x;
              coin.y = by + y;
            }
          }
        }
        const w = SPR_W * (0.25 + 0.75 * squeeze);
        ctx.drawImage(sprite, coin.x - w / 2, coin.y - SPR_H / 2, w, SPR_H);
      }
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let g = 0; g < s.cos.length; g++) {
        const b = s.stackBar[g];
        if (b >= n) continue;
        const bx = bars[b].x;
        const by = bars[b].y;
        // the stack tops glinting on each landing
        if (beat > 0 && ms < s.toppleAt[g]) {
          const h = s.stackLevels[g];
          const landed = Math.min(h, Math.ceil(((wave + 1) * h) / WAVES));
          stampGlimmer(
            ctx,
            bx + s.pivotX[g] - COIN_W / 2,
            by + FOOT_Y - SPR_H / 2 - (landed - 1) * COIN_T * squash,
            GLINT * beat,
            g,
            COLOR.white,
          );
        }
        // each domino hitting the next; the nearest's hit is the readout's
        const since = ms - s.contactAt[g];
        if (since < 0) continue;
        if (!s.nearest[g]) {
          if (since < CONTACT_MS)
            stampGlimmer(
              ctx,
              bx + s.contactX[g],
              by + s.contactY[g],
              (b === 0 ? OWN_CONTACT_FLASH : CONTACT_FLASH) *
                (1 - since / CONTACT_MS),
              g,
              COLOR.heavenlyGold,
            );
        } else if (b > 0 && since < LAND_FLASH_MS)
          stampGlimmer(
            ctx,
            bx + s.readX,
            by + CONTACT_Y,
            BLAST * (1 - since / LAND_FLASH_MS),
            b,
            COLOR.white,
          );
      }
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
    }
    spot.x = bars[0].x + s.readX;
    spot.y = bars[0].y + CONTACT_Y;
    drawDetonation(ctx, spot, ms - s.landAt[0], OWN_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
