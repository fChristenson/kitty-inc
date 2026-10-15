// Quantum Leap, a rate crit: the number dives as a wisp into a ring standing
// upright beside it; pair by pair, twin rings snap open beside each readout
// down the column, and the wisp bursts out of the twin by the next readout
// at once with its speed (a flash, the readout turning over, a jolt),
// streaks across it and dives straight back in, each leap quicker, its
// streak stretching; then every ring flares and it bursts out of the last
// twin onto its own readout in the big blast. Each bar's next payouts each
// leap: the fill after it done in a blink, paying again at once
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import { COLOR } from "../../../../palette";
import {
  drawPortal,
  drawPortalPass,
  planWarp,
  portalLook,
  type PortalLook,
  type Warp,
  type WarpLeg,
} from "../../../../shared/animationStyles/portal";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
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

const IN_MS = 140;
// the readouts READOUT of a bar's half width out, CONTACT_Y off its middle
const READOUT = 0.6;
const CONTACT_Y = -20;
// the rings stand upright, RING px from middle to rim (times SIZE, by pair),
// GAP px either side of a readout (by bar), kept EDGE px inside the right
// edge; the first one START px right of the number
const RING = 52;
const SIZE: [number, number] = [0.8, 1.25];
const GAP: [number, number] = [120, 175];
const EDGE = 40;
const START = 150;
const UPRIGHT = Math.PI / 2;
// a pair snaps open OPEN_LEAD ms before its dive, over OPEN_MS; all close
// over CLOSE_MS once it lands
const OPEN_LEAD = 120;
const OPEN_MS = 70;
const CLOSE_MS = 160;
// the dive into the first ring, then each leap LEAP_MS (quickening), all in
// LEAP_SPAN; the last onto its own readout OWN_MS
const DIVE_MS = 200;
const LEAP_MS: [number, number] = [190, 60];
const LEAP_SPAN = 820;
const OWN_MS = 110;
// the rings throbbing harder and faster as it goes, all flaring FLARE_GROW
// bigger with a FLARE_GLOW glow over FLARE_MS at the last dive
const THROB = 0.14;
const THROB_RATE: [number, number] = [0.012, 0.055];
const FLARE_GROW = 0.6;
const FLARE_GLOW = 2.6;
const FLARE_MS = 260;
// the wisp swelling, its streak STREAK_MS long behind it (stretching)
const WISP: [number, number] = [0.9, 1.6];
const STREAK_MS: [number, number] = [35, 120];
const STREAK_W: [number, number] = [6, 18];
// a readout's flash as the wisp bursts out beside it
const HIT_FLASH = 120;
const HIT_FLASH_MS = 180;
const OWN_BLAST = 330;
// a jolt at every dive, harder each, the flare's hardest
const PASS_SHAKE: [number, number] = [0.3, 0.9];
const FLARE_SHAKE = 2.2;
// shakes by step: -, a bar, its own
const SHAKES = [0.4, 1, 3];

interface State {
  bars: Point[];
  half: number;
  // per ring (pair p: its entry 2p, its exit 2p + 1): its bar (-1: the
  // first, by the number), x off the readout, size, look, when it opens and
  // when the wisp goes through
  ringBar: Int16Array;
  ringDx: Float32Array;
  ringSize: Float32Array;
  ringLook: PortalLook[];
  ringOpens: Float32Array;
  ringPass: Float32Array;
  // every leg's start, in order
  legStart: Float32Array;
  // the readouts flashing as it bursts out beside them
  hitBar: Int16Array;
  hitMs: Float32Array;
  warp: Warp;
  runner: (ms: number) => Point | null;
  kickMs: Float32Array;
  kick: Float32Array;
  climaxMs: number;
  landMs: number;
}
const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };
const FLARE_STOPS = fadeStops(COLOR.white, 0.25);
const spot: Point = { x: 0, y: 0 };
const head: Point = { x: 0, y: 0 };
const tail: Point = { x: 0, y: 0 };

function readoutAt(s: State, bar: number, into: Point): Point {
  const b = s.bars[bar] ?? s.bars[0];
  into.x = b.x + s.half * READOUT;
  into.y = b.y + CONTACT_Y;
  return into;
}

function ringAt(s: State, i: number, into: Point): Point {
  const bar = s.ringBar[i];
  if (bar < 0) {
    into.x = START;
    into.y = 0;
    return into;
  }
  readoutAt(s, bar, into);
  into.x += s.ringDx[i];
  return into;
}

// a leaping bar: after each payout its next fill runs `speed` times as fast,
// paying again at once; `left` leaps to go
const leaps = defineBarEffect<{ left: number; leap: boolean }>({
  speed: (v) => (v.leap ? meta.values.speed : 1),
  onPayout: (v) => {
    if (!v.leap) {
      v.leap = true;
      return v;
    }
    if (v.left <= 1) return undefined;
    v.left--;
    v.leap = false;
    return v;
  },
});

registerFloorCrit("quantumLeapCrit", {
  // the leaps, the first one at once
  reward(t) {
    const add = t.own ? meta.values.ownLeaps : meta.values.leaps;
    t.flipRate();
    const v = leaps.get(t.floor);
    if (v) {
      v.left += add;
      v.leap = true;
    } else leaps.set(t.floor, { left: add, leap: true });
    t.punch(`${add} Leaps`);
  },
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const n = order.length;
    const half = r.play.barHalfWidth;
    const right = r.viewportWidth / 2 - EDGE;
    const ringBar = new Int16Array(2 * n);
    const ringDx = new Float32Array(2 * n);
    const ringSize = new Float32Array(2 * n);
    const ringLook: PortalLook[] = [];
    const ringOpens = new Float32Array(2 * n);
    const ringPass = new Float32Array(2 * n);
    const legStart = new Float32Array(n + 1);
    const hitBar = new Int16Array(Math.max(0, n - 1));
    const hitMs = new Float32Array(Math.max(0, n - 1));
    const kickMs = new Float32Array(n);
    const kick = new Float32Array(n);
    // each pair's rings: the entry by the last readout (or the number), the
    // exit by the next, twins in one look and size
    for (let p = 0; p < n; p++) {
      const look = portalLook(p + 1);
      const size = RING * lerp(SIZE[0], SIZE[1], holeHash(p, 7302));
      const gap = lerp(GAP[0], GAP[1], holeHash(order[p], 7301));
      ringBar[2 * p] = p === 0 ? -1 : order[p - 1];
      ringBar[2 * p + 1] = order[p];
      ringDx[2 * p + 1] = -gap;
      if (p > 0) {
        const prev = order[p - 1];
        const readout = bars[prev].x + half * READOUT;
        const back = lerp(GAP[0], GAP[1], holeHash(prev, 7301));
        ringDx[2 * p] = Math.max(RING * 0.6, Math.min(back, right - readout));
      }
      ringSize[2 * p] = size;
      ringSize[2 * p + 1] = size;
      ringLook.push(look, look);
    }
    // the leaps, quickening, fitted into LEAP_SPAN
    let total = 0;
    for (let k = 0; k < n - 1; k++)
      total += lerp(LEAP_MS[0], LEAP_MS[1], k / Math.max(1, n - 2));
    const scale = total > 0 ? Math.min(1, LEAP_SPAN / total) : 1;

    const legs: WarpLeg[] = [];
    const ringSpot = (i: number) => {
      const into: Point = { x: 0, y: 0 };
      return () => ringAt(state, i, into);
    };
    const own: Point = { x: 0, y: 0 };
    legs.push({
      from: { x: 0, y: 0 },
      to: ringSpot(0),
      startMs: IN_MS,
      endMs: IN_MS + DIVE_MS,
      fall: true,
    });
    legStart[0] = IN_MS;
    let t = IN_MS + DIVE_MS;
    for (let k = 0; k < n; k++) {
      // dive into pair k's entry, burst out of its exit by bar order[k]
      ringPass[2 * k] = t;
      ringPass[2 * k + 1] = t;
      const opens = k === 0 ? IN_MS - OPEN_MS : t - OPEN_LEAD;
      ringOpens[2 * k] = opens;
      ringOpens[2 * k + 1] = opens;
      kickMs[k] = t;
      kick[k] =
        k === n - 1
          ? FLARE_SHAKE
          : lerp(PASS_SHAKE[0], PASS_SHAKE[1], k / Math.max(1, n - 1));
      if (k < n - 1) {
        hit(order[k], t, 1);
        hitBar[k] = order[k];
        hitMs[k] = t;
      }
      const last = k === n - 1;
      const ms = last
        ? OWN_MS
        : lerp(LEAP_MS[0], LEAP_MS[1], k / Math.max(1, n - 2)) * scale;
      legs.push({
        from: ringSpot(2 * k + 1),
        to: last ? () => readoutAt(state, 0, own) : ringSpot(2 * k + 2),
        startMs: t,
        endMs: t + ms,
      });
      legStart[k + 1] = t;
      t += ms;
    }
    hit(0, t, 2);
    const warp = planWarp(legs);
    const at: Point = { x: 0, y: 0 };
    const state: State = {
      bars,
      half,
      ringBar,
      ringDx,
      ringSize,
      ringLook,
      ringOpens,
      ringPass,
      legStart,
      hitBar,
      hitMs,
      warp,
      runner: (ms) => warp.at(ms, at),
      kickMs,
      kick,
      climaxMs: kickMs[n - 1],
      landMs: t,
    };
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const s = states.get(r);
    if (!s || bars.length === 0) return;
    s.bars = bars;
    const now = r.startedAt + ms;
    // a whoosh and a jolt at every dive, the flare's hardest
    while (r.kicked < s.kickMs.length && ms >= s.kickMs[r.kicked]) {
      r.shake(s.kick[r.kicked]);
      playSwoosh();
      r.kicked++;
    }
    if (ms < IN_MS) {
      const p = ms / IN_MS;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * lerp(1, 0.25, p * p),
        {
          alpha: 1 - p * p,
        },
      );
    }

    // the rings, throbbing harder as it goes, all flaring at the last dive
    const progress = clamp01((ms - IN_MS) / Math.max(1, s.climaxMs - IN_MS));
    const close = 1 - clamp01((ms - s.landMs) / CLOSE_MS);
    const flared = ms - s.climaxMs;
    const flare = flared >= 0 && flared < FLARE_MS ? 1 - flared / FLARE_MS : 0;
    const throb =
      1 +
      THROB *
        progress *
        Math.sin(ms * lerp(THROB_RATE[0], THROB_RATE[1], progress));
    const alpha = ctx.globalAlpha;
    for (let i = 0; i < s.ringBar.length; i++) {
      if (s.ringBar[i] >= bars.length) continue;
      const o = clamp01((ms - s.ringOpens[i]) / OPEN_MS);
      const open = o * (1 + 0.35 * Math.sin(Math.PI * o)) * close;
      if (open <= 0) continue;
      ringAt(s, i, spot);
      const size = s.ringSize[i] * throb * (1 + FLARE_GROW * flare);
      ctx.save();
      ctx.translate(spot.x, spot.y);
      ctx.rotate(UPRIGHT);
      drawPortal(ctx, ORIGIN, size, open, now, 1, s.ringLook[i]);
      drawPortalPass(ctx, ORIGIN, ms - s.ringPass[i], size);
      if (flare > 0) {
        drawPortalPass(ctx, ORIGIN, flared, size * 1.5);
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = alpha * flare * flare;
        drawGlow(ctx, FLARE_STOPS, 0, 0, size * FLARE_GLOW);
      }
      ctx.restore();
    }

    // its streak, stretching every leap, from where it burst out
    const { warp, legStart } = s;
    if (ms >= warp.startMs && ms <= warp.endMs) {
      let j = 0;
      while (j < legStart.length - 1 && ms >= legStart[j + 1]) j++;
      const u = j / Math.max(1, legStart.length - 1);
      const from = Math.max(
        legStart[j],
        ms - lerp(STREAK_MS[0], STREAK_MS[1], u),
      );
      if (warp.at(ms, head) && warp.at(from, tail)) {
        const previous = ctx.globalCompositeOperation;
        const width = lerp(STREAK_W[0], STREAK_W[1], u);
        ctx.globalCompositeOperation = "lighter";
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(tail.x, tail.y);
        ctx.lineTo(head.x, head.y);
        ctx.globalAlpha = alpha * 0.55;
        ctx.lineWidth = width;
        ctx.strokeStyle = COLOR.heavenlyGold;
        ctx.stroke();
        ctx.globalAlpha = alpha * 0.9;
        ctx.lineWidth = width * 0.35;
        ctx.strokeStyle = COLOR.white;
        ctx.stroke();
        ctx.globalAlpha = alpha;
        ctx.globalCompositeOperation = previous;
      }
    }
    drawWispBetween(
      ctx,
      s.runner,
      ms,
      now,
      WISP_SIZE * lerp(WISP[0], WISP[1], progress),
      progress,
      warp.startMs,
      warp.endMs,
    );

    // each readout flashing as the wisp bursts out beside it
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let k = 0; k < s.hitMs.length; k++) {
      const since = ms - s.hitMs[k];
      if (since < 0 || since >= HIT_FLASH_MS || s.hitBar[k] >= bars.length)
        continue;
      readoutAt(s, s.hitBar[k], spot);
      const p = 1 - since / HIT_FLASH_MS;
      stampGlimmer(ctx, spot.x, spot.y, HIT_FLASH * p, k + 500, COLOR.white);
      stampGlimmer(
        ctx,
        spot.x,
        spot.y,
        HIT_FLASH * 1.4 * p,
        k + 540,
        COLOR.heavenlyGold,
      );
    }
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;

    drawDetonation(ctx, readoutAt(s, 0, spot), ms - s.landMs, OWN_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
