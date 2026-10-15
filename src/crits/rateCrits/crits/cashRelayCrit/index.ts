// Cash Relay, a rate crit: the number shrinks into a wisp at the top readout
// in view, which drinks in a swirl of coins, a trickle then a flood, swelling
// and trembling, then fires a fat river of cash down onto the next readout (a
// flash, the readout turning over); a new wisp there gulps it, swells and
// fires it on down to the next, the river thicker and each relay quicker down
// the column; the last wisp, beside its own bar, catches the lot, bloats and
// trembles, then blasts the whole river into its own readout. The bars share
// one baton: the bar holding it pays big on its next payout, then hands it on
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import type { Floor } from "../../../../gameState";
import { COLOR } from "../../../../palette";
import {
  beginCoinBatch,
  drawCoinBurstFrame,
  endCoinBatch,
  type CoinBurstSprite,
} from "../../../../coinBurst";
import {
  drawChargeGlow,
  trembleAt,
} from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash, ownLast } from "../../../floorCrits/critPlayer/shared";

const TAU = Math.PI * 2;
const IN_MS = 120;
// the readouts READOUT of a bar's half width out; a relay wisp CATCH_X px
// left of its readout, the last OWN_X left and OWN_LIFT up off its own
const READOUT = 0.6;
const CATCH_X = 40;
const OWN_X = 130;
const OWN_LIFT = 80;
// the first wisp drinking for DRINK_MS: SWIRL coins spiralling in from
// SWIRL_R px round, SWIRL_TURNS turns in SWIRL_MS each (a trickle, then a
// flood: PACE)
const DRINK_MS = 440;
const SWIRL = 110;
const SWIRL_MS = 230;
const SWIRL_R: [number, number] = [90, 200];
const SWIRL_TURNS = 1.3;
const SWIRL_SQUASH = 0.7;
const PACE = 0.55;
// each relay (quickening down the column, all squeezed into LEGS_SPAN): its
// river leaving over POUR_MS, each coin across in TRAVEL_MS, then the catcher
// swelling for HOLD_MS before it fires; LEG_COINS coins COIN px, THICK px
// either side of a line bowed SWING px out to alternate sides
const TRAVEL_MS: [number, number] = [190, 110];
const POUR_MS: [number, number] = [140, 80];
const HOLD_MS: [number, number] = [120, 50];
const LEGS_SPAN = 850;
const LEG_COINS: [number, number] = [36, 84];
const COIN: [number, number] = [18, 26];
const THICK: [number, number] = [10, 30];
const SWING = 110;
const COIN_SPIN = 0.03;
// the last wisp bloating for OWN_HOLD_MS, then its jet into its own readout
const OWN_HOLD_MS = 220;
const JET_COINS = 150;
const JET_POUR_MS = 80;
const JET_TRAVEL_MS = 110;
const JET_COIN = 30;
const JET_THICK = 38;
const JET_SWING = 40;
// the wisps: popping in APPEAR_MS before their catch, WISP of WISP_SIZE
// (growing down the column), swelling SWELL more as they gulp, trembling
// TREMBLE px, kicked up RECOIL px and shrinking by EMPTY as their river
// pours out
const APPEAR_MS = 110;
const WISP: [number, number] = [1, 1.6];
const OWN_WISP = 2.1;
const SWELL = 0.4;
const OWN_SWELL = 0.7;
const TREMBLE = 6;
const OWN_TREMBLE = 14;
const RECOIL = 26;
const EMPTY = 0.6;
const GLOW: [number, number] = [140, 240];
const OWN_GLOW = 360;
// a readout hit
const HIT_FLASH = 130;
const HIT_FLASH_MS = 170;
const MUZZLE_BLAST = 170;
const OWN_BLAST = 440;
// the drink's rumble kicks RUMBLE_GAP_MS apart (closing), RUMBLE strong; a
// fire's kick, the last one's
const RUMBLE_GAP_MS: [number, number] = [130, 50];
const RUMBLE: [number, number] = [0.2, 0.8];
const FIRE_SHAKE = 0.7;
const OWN_FIRE_SHAKE = 1.6;
// shakes by step: a catch, a readout hit, its own
const SHAKES = [0.6, 1.3, 3.4];

interface Plan {
  n: number;
  // per wisp: its bar, when it pops in, starts gulping, fires, has poured
  // its river out, and its readout's hit (-1: none)
  order: Int16Array;
  appearAt: Float32Array;
  catchAt: Float32Array;
  fireAt: Float32Array;
  emptyAt: Float32Array;
  hitAt: Float32Array;
  blastAt: number;
  // per group (0: the swirl, k: the relay into wisp k, n: the jet): its
  // coins, the window they fly in, each coin's flight, size and thickness
  gStart: Int32Array;
  gEnd: Int32Array;
  gFrom: Float32Array;
  gTo: Float32Array;
  gTravel: Float32Array;
  gCoin: Float32Array;
  gThick: Float32Array;
  // per coin: when it leaves (or joins the swirl), its offset across the
  // river (or the swirl's angle), the swirl's radius
  leave: Float32Array;
  off: Float32Array;
  rad: Float32Array;
  sprites: CoinBurstSprite[];
  // kicks: when, how hard, and whether it's a fire (a whoosh)
  evMs: Float32Array;
  evShake: Float32Array;
  evFire: Uint8Array;
  wispAt: ((ms: number) => Point | null)[];
}
const plans = new WeakMap<Running, Plan>();
let frameBars: Point[] = [];
let half = 0;
const a: Point = { x: 0, y: 0 };
const b: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };

// the baton: one shared by the bars of a relay, the one holding it paying
// big on its next payout and handing it to the next, lap after lap
interface Relay {
  floors: Floor[];
  holder: number;
  passes: number;
  until: number;
}
interface Baton {
  relay: Relay;
  floor: Floor;
  own: boolean;
}
let joining: Relay | null = null;
const holds = (v: Baton) => v.relay.floors[v.relay.holder] === v.floor;
const batons = defineBarEffect<Baton>({
  payout: (v) =>
    holds(v) ? (v.own ? meta.values.ownPayout : meta.values.payout) : 1,
  onPayout: (v) => {
    const relay = v.relay;
    if (holds(v)) {
      relay.passes--;
      relay.holder = (relay.holder + 1) % relay.floors.length;
    }
    return relay.passes > 0 ? v : undefined;
  },
  ended: (v, now) => v.relay.passes <= 0 || now >= v.relay.until,
});

const isOwnWisp = (p: Plan, k: number) => k === p.n - 1;

function readoutOf(p: Plan, k: number, out: Point): Point {
  const bar = frameBars[p.order[k]];
  out.x = bar.x + half * READOUT;
  out.y = bar.y;
  return out;
}

// where wisp k sits: beside its readout, the last up off its own
function spotOf(p: Plan, k: number, out: Point): Point {
  readoutOf(p, k, out);
  if (isOwnWisp(p, k)) {
    out.x -= OWN_X;
    out.y -= OWN_LIFT;
  } else out.x -= CATCH_X;
  return out;
}

const gulpAt = (p: Plan, k: number, ms: number) =>
  clamp01((ms - p.catchAt[k]) / (p.fireAt[k] - p.catchAt[k]));
const emptiedAt = (p: Plan, k: number, ms: number) =>
  clamp01((ms - p.fireAt[k]) / (p.emptyAt[k] - p.fireAt[k]));

registerFloorCrit("cashRelayCrit", {
  reward(t) {
    const { payout, ownPayout, laps, ms } = meta.values;
    const relay = joining ?? {
      floors: [],
      holder: 0,
      passes: laps,
      until: t.now + ms,
    };
    t.flipRate();
    relay.floors.push(t.floor);
    batons.set(t.floor, { relay, floor: t.floor, own: t.own });
    t.punch(`x${t.own ? ownPayout : payout} Relay Baton`);
  },
  plan(r, bars, hit) {
    const order = Int16Array.from(ownLast(bars));
    const n = order.length;
    joining = {
      floors: [],
      holder: 0,
      passes: meta.values.laps * n,
      until: Date.now() + meta.values.ms,
    };
    const legs = n - 1;
    const appearAt = new Float32Array(n);
    const catchAt = new Float32Array(n);
    const fireAt = new Float32Array(n);
    const hitAt = new Float32Array(n).fill(-1);
    const G = n + 1;
    const gStart = new Int32Array(G);
    const gEnd = new Int32Array(G);
    const gFrom = new Float32Array(G);
    const gTo = new Float32Array(G);
    const gTravel = new Float32Array(G);
    const gCoin = new Float32Array(G);
    const gThick = new Float32Array(G);
    // the relays' timings, quickening down the column, squeezed to fit
    const q = (k: number) => k / Math.max(1, legs - 1);
    let natural = 0;
    for (let k = 0; k < legs; k++)
      natural +=
        lerp(POUR_MS[0], POUR_MS[1], q(k)) +
        lerp(TRAVEL_MS[0], TRAVEL_MS[1], q(k)) +
        (k + 1 < legs ? lerp(HOLD_MS[0], HOLD_MS[1], q(k)) : 0);
    const squeeze = Math.min(1, LEGS_SPAN / Math.max(1, natural));
    appearAt[0] = IN_MS - APPEAR_MS;
    catchAt[0] = IN_MS;
    fireAt[0] = IN_MS + DRINK_MS;
    if (n > 1) {
      hitAt[0] = fireAt[0];
      hit(order[0], fireAt[0], 1);
    }
    let coins = SWIRL;
    for (let k = 0; k < legs; k++) {
      const pour = lerp(POUR_MS[0], POUR_MS[1], q(k)) * squeeze;
      const travel = lerp(TRAVEL_MS[0], TRAVEL_MS[1], q(k)) * squeeze;
      const g = k + 1;
      const landAt = fireAt[k] + travel;
      const own = g === n - 1;
      const hold = own
        ? OWN_HOLD_MS
        : lerp(HOLD_MS[0], HOLD_MS[1], q(k)) * squeeze;
      gFrom[g] = fireAt[k];
      gTo[g] = fireAt[k] + pour + travel;
      gTravel[g] = travel;
      gCoin[g] = lerp(COIN[0], COIN[1], q(k));
      gThick[g] = lerp(THICK[0], THICK[1], q(k));
      gStart[g] = coins;
      coins += Math.round(lerp(LEG_COINS[0], LEG_COINS[1], q(k)));
      gEnd[g] = coins;
      appearAt[g] = landAt - APPEAR_MS;
      catchAt[g] = landAt;
      fireAt[g] = gTo[g] + hold;
      if (own) hit(order[g], landAt, 0);
      else {
        hitAt[g] = landAt;
        hit(order[g], landAt, 1);
      }
    }
    const last = n - 1;
    const blastAt = fireAt[last] + JET_POUR_MS + JET_TRAVEL_MS;
    hitAt[last] = blastAt;
    hit(order[last], blastAt, 2);
    gStart[n] = coins;
    coins += JET_COINS;
    gEnd[n] = coins;
    gFrom[n] = fireAt[last];
    gTo[n] = blastAt;
    gTravel[n] = JET_TRAVEL_MS;
    gCoin[n] = JET_COIN;
    gThick[n] = JET_THICK;
    // the swirl: each coin joining as the drink floods in
    const leave = new Float32Array(coins);
    const off = new Float32Array(coins);
    const rad = new Float32Array(coins);
    const swirlTo = fireAt[0] - SWIRL_MS;
    gEnd[0] = SWIRL;
    gFrom[0] = IN_MS - 60;
    gTo[0] = fireAt[0];
    gTravel[0] = SWIRL_MS;
    gCoin[0] = COIN[0];
    for (let i = 0; i < SWIRL; i++) {
      leave[i] = lerp(gFrom[0], swirlTo, holeHash(i, 7301) ** PACE);
      off[i] = holeHash(i, 7302) * TAU;
      rad[i] = lerp(SWIRL_R[0], SWIRL_R[1], holeHash(i, 7303));
    }
    // the rivers: each coin leaving in turn, spread across the stream
    for (let g = 1; g < G; g++) {
      const count = gEnd[g] - gStart[g];
      const pour = gTo[g] - gTravel[g] - gFrom[g];
      for (let i = gStart[g], j = 0; i < gEnd[g]; i++, j++) {
        leave[i] = gFrom[g] + pour * ((j + holeHash(i, 7304)) / count);
        off[i] = holeHash(i, 7305) * 2 - 1;
      }
    }
    const sprites: CoinBurstSprite[] = [];
    for (let i = 0; i < coins; i++)
      sprites.push({
        kind: i % 5 === 0 ? "bill" : "coin",
        spinFrame: 0,
        axisAngle: (holeHash(i, 7306) - 0.5) * Math.PI,
      });
    // the drink's rumble closing up, then a kick at every fire
    const kickMs: number[] = [];
    const kickShake: number[] = [];
    const kickFire: number[] = [];
    for (let k = IN_MS + 40; k < fireAt[0]; ) {
      const c = (k - IN_MS) / DRINK_MS;
      kickMs.push(k);
      kickShake.push(lerp(RUMBLE[0], RUMBLE[1], c));
      kickFire.push(0);
      k += lerp(RUMBLE_GAP_MS[0], RUMBLE_GAP_MS[1], c);
    }
    for (let k = 0; k < n; k++) {
      kickMs.push(fireAt[k]);
      kickShake.push(k === last ? OWN_FIRE_SHAKE : FIRE_SHAKE);
      kickFire.push(1);
    }
    const emptyAt = new Float32Array(n);
    for (let k = 0; k < n; k++) emptyAt[k] = gTo[k + 1] - gTravel[k + 1];
    const p: Plan = {
      n,
      order,
      appearAt,
      catchAt,
      fireAt,
      emptyAt,
      hitAt,
      blastAt,
      gStart,
      gEnd,
      gFrom,
      gTo,
      gTravel,
      gCoin,
      gThick,
      leave,
      off,
      rad,
      sprites,
      evMs: Float32Array.from(kickMs),
      evShake: Float32Array.from(kickShake),
      evFire: Uint8Array.from(kickFire),
      wispAt: [],
    };
    // each wisp trembling harder as it gulps, kicked up as it fires
    for (let k = 0; k < n; k++) {
      const at: Point = { x: 0, y: 0 };
      const amp = isOwnWisp(p, k) ? OWN_TREMBLE : TREMBLE;
      p.wispAt.push((ms) => {
        if (ms < appearAt[k] || ms > emptyAt[k]) return null;
        spotOf(p, k, at);
        trembleAt(gulpAt(p, k, ms), ms, amp, shiver);
        at.x += shiver.x;
        at.y += shiver.y;
        if (ms > fireAt[k])
          at.y -= RECOIL * Math.sin(Math.PI * emptiedAt(p, k, ms));
        return at;
      });
    }
    plans.set(r, p);
  },
  draw(ctx, r, ms, bars) {
    const p = plans.get(r);
    if (!p || bars.length === 0) return;
    frameBars = bars;
    half = r.play.barHalfWidth;
    const now = r.startedAt + ms;
    const { n, appearAt, catchAt, fireAt, hitAt, blastAt } = p;
    const last = n - 1;
    while (r.kicked < p.evMs.length && ms >= p.evMs[r.kicked]) {
      r.shake(p.evShake[r.kicked]);
      if (p.evFire[r.kicked]) playSwoosh();
      r.kicked++;
    }
    if (ms < IN_MS) {
      const e = (ms / IN_MS) ** 2;
      spotOf(p, 0, spot);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, spot.x, e),
        lerp(0, spot.y, e),
        r.flashFont * lerp(1, 0.25, e),
      );
    }

    // the gulping wisp's glow, swelling as it fills
    for (let k = 0; k < n; k++) {
      if (ms < catchAt[k] || ms >= fireAt[k]) continue;
      const own = isOwnWisp(p, k);
      const c = gulpAt(p, k, ms);
      drawChargeGlow(
        ctx,
        spotOf(p, k, spot),
        0.3 + 0.7 * c,
        own ? OWN_GLOW : lerp(GLOW[0], GLOW[1], k / Math.max(1, last)),
        now,
      );
    }

    // the coins: the swirl drunk in, then the rivers fired down the relay
    const transform = ctx.getTransform();
    beginCoinBatch(ctx);
    const { leave, off, rad, sprites } = p;
    if (ms >= p.gFrom[0] && ms < p.gTo[0]) {
      spotOf(p, 0, a);
      for (let i = 0; i < p.gEnd[0]; i++) {
        const u = (ms - leave[i]) / SWIRL_MS;
        if (u < 0 || u >= 1) continue;
        const e = u * u;
        const angle = off[i] + SWIRL_TURNS * TAU * e;
        const reach = rad[i] * (1 - e);
        sprites[i].spinFrame = ms * COIN_SPIN + i;
        drawCoinBurstFrame(
          ctx,
          sprites[i],
          a.x + Math.cos(angle) * reach,
          a.y + Math.sin(angle) * reach * SWIRL_SQUASH,
          p.gCoin[0] * Math.min(1, u * 6) * (1 - 0.6 * e),
          transform,
        );
      }
    }
    for (let g = 1; g <= n; g++) {
      if (ms < p.gFrom[g] || ms >= p.gTo[g]) continue;
      spotOf(p, g - 1, a);
      if (g < n) spotOf(p, g, b);
      else readoutOf(p, last, b);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const bow = (g < n ? SWING : JET_SWING) * (g % 2 ? 1 : -1);
      const cx = (a.x + b.x) / 2 + nx * bow;
      const cy = (a.y + b.y) / 2 + ny * bow;
      const travel = p.gTravel[g];
      const coin = p.gCoin[g];
      const thick = p.gThick[g];
      for (let i = p.gStart[g]; i < p.gEnd[g]; i++) {
        const u = (ms - leave[i]) / travel;
        if (u < 0 || u >= 1) continue;
        // quickening the whole way, snapping onto the catcher
        const e = u * (0.55 + 0.45 * u);
        const w = 1 - e;
        const spread = off[i] * thick * (0.3 + 0.7 * Math.sin(Math.PI * e));
        sprites[i].spinFrame = ms * COIN_SPIN + i;
        drawCoinBurstFrame(
          ctx,
          sprites[i],
          w * w * a.x + 2 * w * e * cx + e * e * b.x + nx * spread,
          w * w * a.y + 2 * w * e * cy + e * e * b.y + ny * spread,
          coin * (1 - 0.35 * e * e),
          transform,
        );
      }
    }
    endCoinBatch(ctx);

    // the wisps, each bigger down the column, swelling as it gulps
    for (let k = 0; k < n; k++) {
      const own = isOwnWisp(p, k);
      const c = gulpAt(p, k, ms);
      const pop = clamp01((ms - appearAt[k]) / APPEAR_MS);
      const size =
        WISP_SIZE *
        (own ? OWN_WISP : lerp(WISP[0], WISP[1], k / Math.max(1, last))) *
        (0.3 + 0.7 * pop) *
        (1 + (own ? OWN_SWELL : SWELL) * c) *
        (1 - EMPTY * emptiedAt(p, k, ms));
      drawWispBetween(
        ctx,
        p.wispAt[k],
        ms,
        now,
        size,
        c,
        appearAt[k],
        p.emptyAt[k],
      );
    }

    // a flash on each readout as its river hits
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let k = 0; k < n; k++) {
      const since = ms - hitAt[k];
      if (hitAt[k] < 0 || since < 0 || since >= HIT_FLASH_MS) continue;
      readoutOf(p, k, spot);
      const f = 1 - since / HIT_FLASH_MS;
      stampGlimmer(ctx, spot.x, spot.y, HIT_FLASH * f, k + 700, COLOR.white);
      stampGlimmer(
        ctx,
        spot.x,
        spot.y,
        HIT_FLASH * 1.4 * f,
        k + 750,
        COLOR.heavenlyGold,
      );
    }
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;

    // the last wisp's muzzle blast, then the whole river landing on its own
    drawDetonation(
      ctx,
      spotOf(p, last, spot),
      ms - fireAt[last],
      MUZZLE_BLAST,
      now,
    );
    drawDetonation(ctx, readoutOf(p, last, spot), ms - blastAt, OWN_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
