// Pachinko, a rate crit: the number drops onto a column of glowing pins that
// snaps in, row by row, over the bars' readouts; balls of light are fired in
// at its top, quicker and quicker, each drop-bouncing pin to pin down the
// column at speed (every pin it hits pinging) and dropping into a bar's
// readout pocket, which turns over; then the top charges, trembling, and the
// jackpot: a flood of balls cascades down all at once, lighting up the whole
// column, pouring into its own bar's pocket till the last lands in the big
// blast. Each bar's next payouts each pay a random whole x2..xmax
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import { COLOR } from "../../../../palette";
import {
  drawBounceSplash,
  hops,
  type BouncePath,
} from "../../../../shared/animationStyles/bounce";
import { drawChargeGlow } from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playSpinTick } from "../../../../sound";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import {
  BAR_HALF_H,
  holeHash,
  ownLast,
  skyY,
} from "../../../floorCrits/critPlayer/shared";

const IN_MS = 140;
// the readouts READOUT of a bar's half width out, CONTACT_Y off its middle
const READOUT = 0.6;
const CONTACT_Y = -20;
// the column: rows ROW apart from ABOVE over the top bar down, none within
// CLEAR of a bar's middle; pins HALF_DX apart half a step, lanes -MAX_H..MAX_H
// (even rows -2..2, odd -3..3); a ball sits ON_PIN over its pin
const ABOVE = 230;
const ROW = 76;
const CLEAR = BAR_HALF_H + 12;
const HALF_DX = 24;
const ON_PIN = 10;
// balls fired in DROP_IN over the top row
const DROP_IN = 70;
// pins snapping in a row every ROW_STAGGER from PINS_FROM, each popping over
// POP_MS; PIN across, a ping PING across over PING_MS
const PINS_FROM = 90;
const ROW_STAGGER = 14;
const POP_MS = 110;
const PIN = 20;
const PING = 52;
const PING_MS = 130;
// the stream: at least MIN_STREAM balls from STREAM_FROM, GAP_MS apart
// (quickening) within STREAM_SPAN, each leg LEG_MS hopping LIFT px
const STREAM_FROM = 300;
const MIN_STREAM = 6;
const GAP_MS: [number, number] = [170, 55];
const STREAM_SPAN = 520;
const LEG_MS: [number, number] = [58, 34];
const LIFT: [number, number] = [16, 8];
const BALL: [number, number] = [0.5, 0.75];
// the jackpot: the top charging CHARGE_MS, then FLOOD balls over FLOOD_SPREAD
const CHARGE_MS = 220;
const CHARGE_GLOW = 200;
const TREMBLE = 7;
const FLOOD = 34;
const FLOOD_SPREAD = 150;
const FLOOD_LEG_MS: [number, number] = [38, 24];
const FLOOD_LIFT: [number, number] = [12, 6];
const FLOOD_BALL = 26;
const FLARE = 300;
const FLARE_MS = 240;
// a pocket landing
const SPLASH = 110;
const HIT_FLASH = 150;
const HIT_FLASH_MS = 170;
const POCKET = 150;
const OWN_BLAST = 380;
const FADE_MS = 220;
// kicks: ticks at least TICK_GAP apart, an extra pocket's shake, the
// charge's rumble and the flood's (gaps closing), the release
const TICK_GAP = 45;
const EXTRA_SHAKE = 0.5;
const CHARGE_RUMBLE: [number, number] = [0.2, 0.7];
const FLOOD_GAP: [number, number] = [70, 30];
const FLOOD_RUMBLE: [number, number] = [0.4, 1.2];
const RELEASE_SHAKE = 1.6;
// shakes by step: -, a bar, its own
const SHAKES = [0.4, 1, 3];

interface State {
  colX: number;
  topY: number;
  pinX: Float32Array;
  pinY: Float32Array;
  pinRow: Int16Array;
  heat: Float32Array;
  pocketX: Float32Array;
  pocketY: Float32Array;
  // per ball (the stream's first, then the flood's): its path, the pin of
  // each bounce (-1: the pocket), its bar, whether it lands the reward
  paths: BouncePath[];
  pins: Int16Array[];
  cursor: Int16Array;
  bar: Int16Array;
  rewards: Uint8Array;
  stream: number;
  lead: number;
  floodMs: number;
  ownLand: number;
  kickAt: Float32Array;
  kickShake: Float32Array;
  kickTick: Float32Array;
}
const states = new WeakMap<Running, State>();
const FLARE_STOPS = fadeStops(COLOR.white);
const spot: Point = { x: 0, y: 0 };

// a jackpot: payouts left, and what the coming one pays (rolled ahead, so
// the readout shows it); the top number pays a free one more
interface Jackpot {
  left: number;
  mult: number;
}
const rollJackpot = () => 2 + Math.floor(Math.random() * (meta.values.max - 1));
const jackpots = defineBarEffect<Jackpot>({
  payout: (v) => v.mult,
  onPayout: (v) => {
    if (v.mult < meta.values.max) v.left--;
    if (v.left <= 0) return undefined;
    v.mult = rollJackpot();
    return v;
  },
});

interface Kick {
  ms: number;
  shake: number;
  tick: number;
}

registerFloorCrit("pachinkoCrit", {
  reward(t) {
    t.flipRate();
    const add = t.own ? meta.values.ownPayouts : meta.values.payouts;
    let v = jackpots.get(t.floor);
    if (v) v.left += add;
    else {
      v = { left: add, mult: rollJackpot() };
      jackpots.set(t.floor, v);
    }
    t.punch(`x${v.mult} Pachinko!`);
  },
  plan(r, bars, hit) {
    const base = bars[0];
    const half = r.play.barHalfWidth;
    const n = bars.length;
    const pocketX = new Float32Array(n);
    const pocketY = new Float32Array(n);
    let bottom = -Infinity;
    for (let b = 0; b < n; b++) {
      pocketX[b] = bars[b].x - base.x + half * READOUT;
      pocketY[b] = bars[b].y - base.y + CONTACT_Y;
      bottom = Math.max(bottom, bars[b].y - base.y);
    }
    const colX = pocketX[0];
    const topY = skyY(r, bars, ABOVE) - base.y;
    // the rows, in the gaps between the bars
    const rows: number[] = [];
    for (let y = topY; y < bottom - CLEAR; y += ROW) {
      let clear = true;
      for (let b = 0; b < n; b++)
        if (Math.abs(bars[b].y - base.y - y) < CLEAR) clear = false;
      if (clear) rows.push(y);
    }
    const rowStart: number[] = [];
    const px: number[] = [];
    const py: number[] = [];
    const pr: number[] = [];
    rows.forEach((y, i) => {
      rowStart.push(px.length);
      for (let h = i % 2 ? -3 : -2; h <= (i % 2 ? 3 : 2); h += 2) {
        px.push(colX + h * HALF_DX);
        py.push(y);
        pr.push(i);
      }
    });

    // a ball fired in at lane h0, bouncing down the rows over bar b's top
    // and into its pocket
    const paths: BouncePath[] = [];
    const pins: Int16Array[] = [];
    const ballBar: number[] = [];
    const drop = (
      seed: number,
      b: number,
      startMs: number,
      legMs: [number, number],
      lift: [number, number],
    ) => {
      let h = 2 * Math.floor(holeHash(seed, 7301) * 3) - 2;
      const points: Point[] = [{ x: colX + h * HALF_DX, y: topY - DROP_IN }];
      const of: number[] = [];
      const floor = bars[b].y - base.y - BAR_HALF_H;
      for (let i = 0; i < rows.length && rows[i] < floor; i++) {
        if (i > 0) {
          h += holeHash(seed * 31 + i, 7302) < 0.5 ? -1 : 1;
          const top = i % 2 ? 3 : 2;
          if (h > top) h -= 2;
          if (h < -top) h += 2;
        }
        points.push({ x: colX + h * HALF_DX, y: rows[i] - ON_PIN });
        of.push(rowStart[i] + ((h + (i % 2 ? 3 : 2)) >> 1));
      }
      points.push({ x: pocketX[b], y: pocketY[b] });
      of.push(-1);
      paths.push(hops(points, legMs, lift, startMs));
      pins.push(Int16Array.from(of));
      ballBar.push(b);
    };

    // the stream, one ball a bar (at least MIN_STREAM), top to bottom
    const order = ownLast(bars);
    const others = n > 1 ? order.slice(0, -1) : [0];
    const stream = Math.max(MIN_STREAM, others.length);
    let total = 0;
    for (let j = 1; j < stream; j++)
      total += lerp(GAP_MS[0], GAP_MS[1], j / (stream - 1));
    const scale = Math.min(1, STREAM_SPAN / Math.max(1, total));
    let launch = STREAM_FROM;
    for (let j = 0; j < stream; j++) {
      if (j > 0) launch += lerp(GAP_MS[0], GAP_MS[1], j / (stream - 1)) * scale;
      drop(j, others[j % others.length], launch, LEG_MS, LIFT);
    }
    // the jackpot flood, all into its own pocket, its last home after every
    // stream ball (put off if its own bar is high and quick to reach)
    let streamEnd = 0;
    for (let j = 0; j < stream; j++)
      streamEnd = Math.max(streamEnd, paths[j].endMs);
    let floodMs = launch + CHARGE_MS + 40;
    let ownLand = 0;
    let lead = stream;
    for (let pass = 0; pass < 2; pass++) {
      paths.length = pins.length = ballBar.length = stream;
      ownLand = 0;
      for (let k = 0; k < FLOOD; k++) {
        drop(
          100 + k,
          0,
          floodMs + (FLOOD_SPREAD * k) / FLOOD,
          FLOOD_LEG_MS,
          FLOOD_LIFT,
        );
        const end = paths[stream + k].endMs;
        if (end > ownLand) {
          ownLand = end;
          lead = stream + k;
        }
      }
      if (ownLand >= streamEnd + 80) break;
      floodMs += streamEnd + 80 - ownLand;
    }

    // each other bar's first ball home lands its reward, its own the flood's
    // last; the rest only jolt
    const rewards = new Uint8Array(paths.length);
    const kicks: Kick[] = [];
    if (n > 1)
      for (const b of others) {
        let first = -1;
        for (let j = 0; j < stream; j++)
          if (
            ballBar[j] === b &&
            (first < 0 || paths[j].endMs < paths[first].endMs)
          )
            first = j;
        rewards[first] = 1;
        hit(b, paths[first].endMs, 1);
      }
    hit(0, ownLand, 2);
    rewards[lead] = 1;
    const pings: number[] = [];
    for (let j = 0; j < stream; j++) {
      const bounces = paths[j].bounces;
      for (let k = 0; k < bounces.length - 1; k++) pings.push(bounces[k].ms);
      if (!rewards[j])
        kicks.push({ ms: paths[j].endMs, shake: EXTRA_SHAKE, tick: 1.4 });
    }
    pings.sort((a, b) => a - b);
    let last = -Infinity;
    for (const ms of pings) {
      if (ms - last < TICK_GAP) continue;
      last = ms;
      kicks.push({
        ms,
        shake: 0,
        tick: 1 + 0.6 * clamp01((ms - STREAM_FROM) / (floodMs - STREAM_FROM)),
      });
    }
    for (let ms = floodMs - CHARGE_MS; ms < floodMs; ms += 50) {
      const u = 1 - (floodMs - ms) / CHARGE_MS;
      kicks.push({
        ms,
        shake: lerp(CHARGE_RUMBLE[0], CHARGE_RUMBLE[1], u),
        tick: 0,
      });
    }
    kicks.push({ ms: floodMs, shake: RELEASE_SHAKE, tick: 2 });
    for (let ms = floodMs; ms < ownLand; ) {
      const u = (ms - floodMs) / (ownLand - floodMs);
      ms += lerp(FLOOD_GAP[0], FLOOD_GAP[1], u);
      if (ms >= ownLand) break;
      kicks.push({
        ms,
        shake: lerp(FLOOD_RUMBLE[0], FLOOD_RUMBLE[1], u),
        tick: 1.6 + u,
      });
    }
    kicks.sort((a, b) => a.ms - b.ms);

    states.set(r, {
      colX,
      topY,
      pinX: Float32Array.from(px),
      pinY: Float32Array.from(py),
      pinRow: Int16Array.from(pr),
      heat: new Float32Array(px.length),
      pocketX,
      pocketY,
      paths,
      pins,
      cursor: new Int16Array(paths.length),
      bar: Int16Array.from(ballBar),
      rewards,
      stream,
      lead,
      floodMs,
      ownLand,
      kickAt: Float32Array.from(kicks, (k) => k.ms),
      kickShake: Float32Array.from(kicks, (k) => k.shake),
      kickTick: Float32Array.from(kicks, (k) => k.tick),
    });
  },
  draw(ctx, r, ms, bars) {
    const s = states.get(r);
    if (!s || bars.length === 0) return;
    const now = r.startedAt + ms;
    const { colX, topY, floodMs, ownLand, stream, paths } = s;
    while (r.kicked < s.kickAt.length && ms >= s.kickAt[r.kicked]) {
      if (s.kickShake[r.kicked] > 0) r.shake(s.kickShake[r.kicked]);
      if (s.kickTick[r.kicked] > 0) playSpinTick(s.kickTick[r.kicked]);
      r.kicked++;
    }
    const base = bars[0];
    if (ms < IN_MS) {
      const p = (ms / IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, base.x + colX, p),
        lerp(0, base.y + topY - DROP_IN, p),
        r.flashFont * lerp(1, 0.25, p),
      );
    }
    ctx.save();
    ctx.translate(base.x, base.y);
    const previous = ctx.globalCompositeOperation;

    // every ball's latest pin pinging
    const { heat, pins, cursor } = s;
    heat.fill(0);
    for (let j = 0; j < paths.length; j++) {
      const bounces = paths[j].bounces;
      let c = cursor[j];
      while (c < bounces.length && ms >= bounces[c].ms) c++;
      cursor[j] = c;
      if (c === 0) continue;
      const pin = pins[j][c - 1];
      if (pin < 0) continue;
      const ping = 1 - (ms - bounces[c - 1].ms) / PING_MS;
      if (ping > heat[pin]) heat[pin] = ping;
    }

    // the pins: snapping in row by row, the whole column lit by the flood,
    // popping off after the jackpot
    const lit = clamp01((ms - floodMs) / (ownLand - floodMs));
    const gone = clamp01((ms - ownLand) / FADE_MS);
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    if (gone < 1) {
      const { pinX, pinY, pinRow } = s;
      for (let p = 0; p < pinX.length; p++) {
        const u = clamp01((ms - PINS_FROM - pinRow[p] * ROW_STAGGER) / POP_MS);
        if (u <= 0) continue;
        const pop = u + 0.7 * Math.sin(Math.PI * u);
        const glow = 1 + 0.6 * heat[p] + 0.5 * lit;
        stampGlimmer(
          ctx,
          pinX[p],
          pinY[p],
          PIN * pop * glow * (1 - gone),
          p,
          COLOR.heavenlyGold,
        );
        if (heat[p] > 0)
          stampGlimmer(
            ctx,
            pinX[p],
            pinY[p],
            PING * heat[p],
            p + 200,
            COLOR.white,
          );
        if (u < 1)
          stampGlimmer(
            ctx,
            pinX[p],
            pinY[p],
            PING * (1 - u),
            p + 400,
            COLOR.white,
          );
      }
    }

    // a flash on each pocket as a stream ball drops in
    for (let j = 0; j < stream; j++) {
      const since = ms - paths[j].endMs;
      if (since < 0 || since >= HIT_FLASH_MS) continue;
      const b = s.bar[j];
      const p = 1 - since / HIT_FLASH_MS;
      const big = s.rewards[j] ? 1.3 : 0.8;
      stampGlimmer(
        ctx,
        s.pocketX[b],
        s.pocketY[b],
        HIT_FLASH * big * p,
        j + 600,
        COLOR.white,
      );
      stampGlimmer(
        ctx,
        s.pocketX[b],
        s.pocketY[b],
        HIT_FLASH * 1.4 * big * p,
        j + 650,
        COLOR.heavenlyGold,
      );
    }

    // the flood: balls streaking down, its own pocket swelling as they pour in
    let landed = 0;
    for (let j = stream; j < paths.length; j++) {
      const path = paths[j];
      if (ms >= path.endMs) landed++;
      if (j === s.lead || ms < path.startMs || ms >= path.endMs) continue;
      const tail = path.at(ms - 18);
      const tx = tail.x;
      const ty = tail.y;
      stampGlimmer(ctx, tx, ty, FLOOD_BALL * 0.6, j, COLOR.heavenlyGold);
      const head = path.at(ms);
      stampGlimmer(ctx, head.x, head.y, FLOOD_BALL, j + 50, COLOR.white);
    }
    if (ms >= floodMs && ms < ownLand) {
      const fill = landed / (paths.length - stream);
      const throb = 1 + 0.12 * Math.sin(ms * 0.06);
      stampGlimmer(
        ctx,
        s.pocketX[0],
        s.pocketY[0],
        POCKET * (0.3 + fill) * throb,
        900,
        COLOR.heavenlyGold,
      );
      stampGlimmer(
        ctx,
        s.pocketX[0],
        s.pocketY[0],
        POCKET * 0.5 * (0.2 + fill) * throb,
        901,
        COLOR.white,
      );
    }
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;

    // the top charging for the jackpot, flaring as the flood lets go
    const charge = (ms - (floodMs - CHARGE_MS)) / CHARGE_MS;
    if (charge > 0 && charge < 1) {
      const c = charge * charge;
      spot.x = colX + Math.sin(ms * 0.13) * TREMBLE * c;
      spot.y = topY - DROP_IN + Math.cos(ms * 0.17) * TREMBLE * 0.5 * c;
      drawChargeGlow(ctx, spot, 0.3 + 0.7 * c, CHARGE_GLOW, now);
    }
    const flared = ms - floodMs;
    if (flared >= 0 && flared < FLARE_MS) {
      const p = flared / FLARE_MS;
      const alpha = ctx.globalAlpha;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = alpha * (1 - p) * (1 - p);
      drawGlow(ctx, FLARE_STOPS, colX, topY - DROP_IN, FLARE * (0.6 + 0.8 * p));
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = previous;
    }

    // the stream's balls and the flood's lead, swelling as they quicken
    for (let j = 0; j < stream; j++) {
      const path = paths[j];
      const u = clamp01((path.startMs - STREAM_FROM) / (floodMs - STREAM_FROM));
      drawWispBetween(
        ctx,
        path.at,
        ms,
        now,
        WISP_SIZE * lerp(BALL[0], BALL[1], u),
        u,
        path.startMs,
        path.endMs,
      );
      drawBounceSplash(
        ctx,
        path.bounces[path.bounces.length - 1],
        ms - path.endMs,
        SPLASH,
        now,
      );
    }
    const lead = paths[s.lead];
    drawWispBetween(
      ctx,
      lead.at,
      ms,
      now,
      WISP_SIZE * 0.9,
      1,
      lead.startMs,
      lead.endMs,
    );

    // the last ball home: the big blast on its own readout
    spot.x = s.pocketX[0];
    spot.y = s.pocketY[0];
    drawDetonation(ctx, spot, ms - ownLand, OWN_BLAST, now);
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
