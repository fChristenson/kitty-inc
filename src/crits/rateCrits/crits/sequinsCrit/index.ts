// Sequins, a rate crit: the number bursts into hundreds of sequins strewn in
// a glinting mess round every readout in view, each flashing as it flips;
// then they tidy themselves bar by bar, quicker each: a bar's sequins zip
// round in a swirl and snap into a neat shining ring round its readout (a
// flash, the readout turning over, a jolt), every ring pulsing on each later
// snap; its own mess trembles, spins up and gets pulled in, rumbling, then
// zips into one big double ring as every ring flashes in the big blast.
// Every ringed bar's next payouts pay more for each bar its burst ringed
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import type { Floor } from "../../../../gameState";
import { BLOW_UP, flingOut } from "../../../../shared/animationStyles/clutter";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import {
  beginLightBatch,
  endLightBatch,
  lightArgs,
  queueLightArgs,
} from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { playSpinTick, playSwoosh } from "../../../../sound";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  clamp01,
  drawText,
  lerp,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash, ownLast } from "../../../floorCrits/critPlayer/shared";

const TAU = Math.PI * 2;
// the number swelling and bursting, the sequins flung out over FLING_MS
const BLOW_MS = 110;
const FLING_MS = 230;
// about BITS sequins in all, PER_BAR on a bar, OWN_MORE times as many on its
// own (OWN_BITS)
const BITS = 210;
const PER_BAR: [number, number] = [18, 60];
const OWN_MORE = 1.8;
const OWN_BITS: [number, number] = [40, 96];
// the readout READOUT of a bar's half width out, CONTACT_Y off its middle
const READOUT = 0.6;
const CONTACT_Y = -20;
// rings and mess are ellipses SQUASH as tall as wide round the readout: a
// ring RING_RX px out (its own OWN_RING times, two rows ROW_GAP apart), the
// mess from MESS_R[0] to MESS_R[1] px, RIGHT_SQUEEZE as far out on the right
const SQUASH = 0.42;
const RING_RX = 64;
const OWN_RING = 1.45;
const ROW_GAP = 12;
const MESS_R: [number, number] = [26, 175];
const RIGHT_SQUEEZE = 0.6;
// a sequin SEQ px across, painted SPRITE_SCALE times bigger in a CELL px
// atlas cell per colour
const SEQ = 13;
const SPRITE_SCALE = 3;
const CELL = (SEQ + 2) * SPRITE_SCALE;
const COLORS = [
  COLOR.heavenlyGold,
  COLOR.springSalePink,
  COLOR.cyan,
  COLOR.purple,
  COLOR.silverTicketGray,
];
// flipping FLIP_RATE rad/ms (by sequin) in the mess, glinting GLINT px wide
// past GLINT_AT face-on
const FLIP_RATE: [number, number] = [0.012, 0.03];
const GLINT = 22;
const GLINT_AT = 0.93;
// the tidying: from TIDY_AT a bar every GAP_MS (quickening), fitted into
// SPAN; each bar's sequins zipping in ZIP_MS, swirling ZIP_TURN round
const TIDY_AT = 420;
const GAP_MS: [number, number] = [170, 65];
const SPAN = 620;
const ZIP_MS = 115;
const ZIP_TURN = Math.PI * 0.6;
// a ring popping out POP over POP_MS as it snaps, spinning RING_SPIN rad/ms,
// a shimmer running round it at RING_FLIP; every ring and the mess hopping
// PULSE / JUMP on each later snap, fading over BEAT_MS
const POP = 0.3;
const POP_MS = 120;
const RING_SPIN = 0.0016;
const RING_FLIP = 0.018;
const PULSE = 0.12;
const JUMP = 10;
const BEAT_MS = 100;
// its own charging over CHARGE_MS: pulled in PULL, trembling TREMBLE px,
// flipping CHARGE_SPIN times faster, glowing up to CHARGE_GLOW, a rumble
// every RUMBLE_MS; then zipping in OWN_ZIP_MS
const CHARGE_MS = 270;
const PULL = 0.35;
const TREMBLE = 6;
const TREMBLE_MS = 16;
const CHARGE_SPIN = 2.5;
const CHARGE_GLOW = 110;
const RUMBLE_MS = 45;
const RUMBLE_SHAKE: [number, number] = [0.3, 1.1];
const OWN_ZIP_MS = 130;
// a readout's flash as its ring snaps, every ring flashing over CLIMAX_MS at
// the big blast, all fading FADE_FROM after it over FADE_MS
const BLAST = 130;
const LAND_FLASH_MS = 170;
const RING_FLASH = 100;
const CLIMAX_MS = 220;
const OWN_BLAST = 330;
const FADE_FROM = 160;
const FADE_MS = 220;
const TICK: [number, number] = [1, 1.7];
// shakes by step: -, a ring, its own
const SHAKES = [0.5, 1.1, 3];

interface State {
  count: number;
  bars: number;
  readX: number;
  // each sequin's bar, colour, mess (angle, radius), its angle and radius
  // in the ring, how high it's flung, its flip rate and phase, and its tilt
  barOf: Int16Array;
  colorOf: Uint8Array;
  ma: Float32Array;
  mr: Float32Array;
  sa: Float32Array;
  sr: Float32Array;
  lift: Float32Array;
  rate: Float32Array;
  phase: Float32Array;
  tiltC: Float32Array;
  tiltS: Float32Array;
  // per bar: when its sequins zip, how long, and when they land
  zipAt: Float32Array;
  zipMs: Float32Array;
  landAt: Float32Array;
  chargeFrom: number;
  kickAt: Float32Array;
  kickShake: Float32Array;
  kickTick: Float32Array;
  kickSwoosh: Uint8Array;
  endMs: number;
}
const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };
const flown: Point = { x: 0, y: 0 };

// a sequin per colour: a disc with a glossy spot and a hole, drawn once
let atlas: HTMLCanvasElement | null = null;
function sequinAtlas(): HTMLCanvasElement {
  if (atlas) return atlas;
  const canvas = document.createElement("canvas");
  canvas.width = CELL * COLORS.length;
  canvas.height = CELL;
  const g = canvas.getContext("2d")!;
  const rad = (SEQ / 2) * SPRITE_SCALE;
  for (let c = 0; c < COLORS.length; c++) {
    const cx = c * CELL + CELL / 2;
    const cy = CELL / 2;
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    g.fillStyle = COLORS[c];
    g.beginPath();
    g.arc(cx, cy, rad, 0, TAU);
    g.fill();
    g.globalAlpha = 0.6;
    g.fillStyle = COLOR.white;
    g.beginPath();
    g.arc(cx - rad * 0.32, cy - rad * 0.32, rad * 0.34, 0, TAU);
    g.fill();
    g.globalAlpha = 1;
    g.globalCompositeOperation = "destination-out";
    g.beginPath();
    g.arc(cx, cy, rad * 0.18, 0, TAU);
    g.fill();
  }
  atlas = canvas;
  return canvas;
}

// a set of bars one burst ringed; open while its burst is still landing
interface SequinSet {
  rings: number;
}
let open: { set: SequinSet; own: Floor; at: number } | null = null;
const OPEN_FOR_MS = 4000;

function setPays(set: SequinSet): number {
  const { perRing, min, max } = meta.values;
  return Math.max(min, Math.min(max, 1 + perRing * set.rings));
}

// a sequinned bar's next `left` payouts paying more for each bar in its set
const sequinned = defineBarEffect<{ set: SequinSet; left: number }>({
  payout: (v) => setPays(v.set),
  onPayout: (v) => (v.left > 1 ? { set: v.set, left: v.left - 1 } : undefined),
});

const wrap = (a: number) => a - TAU * Math.round(a / TAU);
const clampRound = (v: number, range: [number, number]) =>
  Math.max(range[0], Math.min(range[1], Math.round(v)));

registerFloorCrit("sequinsCrit", {
  reward(t) {
    t.flipRate();
    if (!open || open.own !== t.ownFloor || t.now - open.at > OPEN_FOR_MS)
      open = { set: { rings: 0 }, own: t.ownFloor, at: t.now };
    const set = open.set;
    set.rings++;
    if (t.own) open = null;
    const add = t.own ? meta.values.ownPayouts : meta.values.payouts;
    const was = sequinned.get(t.floor);
    sequinned.set(t.floor, {
      set: was && was.set.rings > set.rings ? was.set : set,
      left: (was?.left ?? 0) + add,
    });
    t.punch(`x${Math.round(setPays(set) * 100) / 100} Set`);
  },
  plan(r, bars, hit) {
    sequinAtlas();
    const n = bars.length;
    const order = ownLast(bars);
    const per = clampRound(BITS / Math.max(1, n - 1 + OWN_MORE), PER_BAR);
    const ownCount = clampRound(per * OWN_MORE, OWN_BITS);
    const count = per * (n - 1) + ownCount;
    const zipAt = new Float32Array(n);
    const zipMs = new Float32Array(n);
    const landAt = new Float32Array(n);
    const kicks: {
      at: number;
      shake: number;
      tick: number;
      swoosh: boolean;
    }[] = [{ at: BLOW_MS, shake: BLOW_UP.shake, tick: 0, swoosh: false }];
    // the bars tidying, quickening, fitted into SPAN; its own last
    let total = 0;
    for (let k = 0; k < n - 2; k++)
      total += lerp(GAP_MS[0], GAP_MS[1], k / Math.max(1, n - 3));
    const scale = total > SPAN ? SPAN / total : 1;
    let t = TIDY_AT;
    for (let k = 0; k < n - 1; k++) {
      const b = order[k];
      zipAt[b] = t;
      zipMs[b] = ZIP_MS;
      landAt[b] = t + ZIP_MS;
      hit(b, landAt[b], 1);
      kicks.push({ at: t, shake: 0, tick: 0, swoosh: true });
      kicks.push({
        at: landAt[b],
        shake: 0,
        tick: lerp(TICK[0], TICK[1], k / Math.max(1, n - 1)),
        swoosh: false,
      });
      t +=
        k < n - 2
          ? lerp(GAP_MS[0], GAP_MS[1], k / Math.max(1, n - 3)) * scale
          : ZIP_MS;
    }
    const chargeFrom = t;
    const rumbles = Math.floor(CHARGE_MS / RUMBLE_MS);
    for (let j = 1; j <= rumbles; j++)
      kicks.push({
        at: chargeFrom + j * RUMBLE_MS,
        shake: lerp(RUMBLE_SHAKE[0], RUMBLE_SHAKE[1], j / rumbles),
        tick: 0.6 + 0.1 * j,
        swoosh: false,
      });
    zipAt[0] = chargeFrom + CHARGE_MS;
    zipMs[0] = OWN_ZIP_MS;
    landAt[0] = zipAt[0] + OWN_ZIP_MS;
    kicks.push({ at: zipAt[0], shake: 0, tick: 0, swoosh: true });
    hit(0, landAt[0], 2);
    kicks.sort((a, b) => a.at - b.at);

    const barOf = new Int16Array(count);
    const colorOf = new Uint8Array(count);
    const ma = new Float32Array(count);
    const mr = new Float32Array(count);
    const sa = new Float32Array(count);
    const sr = new Float32Array(count);
    const lift = new Float32Array(count);
    const rate = new Float32Array(count);
    const phase = new Float32Array(count);
    const tiltC = new Float32Array(count);
    const tiltS = new Float32Array(count);
    let i = 0;
    for (let b = 0; b < n; b++) {
      const own = b === 0;
      const m = own ? ownCount : per;
      const ring = RING_RX * (own ? OWN_RING : 1);
      for (let j = 0; j < m; j++, i++) {
        barOf[i] = b;
        colorOf[i] = Math.floor(Math.random() * COLORS.length);
        const a = Math.random() * TAU;
        ma[i] = a;
        mr[i] =
          lerp(MESS_R[0], MESS_R[1], Math.sqrt(Math.random())) *
          (Math.cos(a) > 0 ? RIGHT_SQUEEZE : 1);
        const slot = (j / m) * TAU + (own ? (j % 2) * (Math.PI / m) : 0);
        sa[i] = a + wrap(slot - a) + ZIP_TURN;
        sr[i] = ring + (own ? (j % 2) * ROW_GAP : 0);
        lift[i] = holeHash(i, 7710);
        rate[i] = lerp(FLIP_RATE[0], FLIP_RATE[1], holeHash(i, 7711));
        phase[i] = holeHash(i, 7712) * TAU;
        const tilt = holeHash(i, 7713) * Math.PI;
        tiltC[i] = Math.cos(tilt);
        tiltS[i] = Math.sin(tilt);
      }
    }
    states.set(r, {
      count,
      bars: n,
      readX: r.play.barHalfWidth * READOUT,
      barOf,
      colorOf,
      ma,
      mr,
      sa,
      sr,
      lift,
      rate,
      phase,
      tiltC,
      tiltS,
      zipAt,
      zipMs,
      landAt,
      chargeFrom,
      kickAt: Float32Array.from(kicks, (k) => k.at),
      kickShake: Float32Array.from(kicks, (k) => k.shake),
      kickTick: Float32Array.from(kicks, (k) => k.tick),
      kickSwoosh: Uint8Array.from(kicks, (k) => (k.swoosh ? 1 : 0)),
      endMs: landAt[0] + FADE_FROM + FADE_MS,
    });
  },
  draw(ctx, r, ms, bars) {
    const s = states.get(r);
    if (!s || !atlas || bars.length === 0) return;
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
      if (s.kickSwoosh[k]) playSwoosh();
      r.kicked++;
    }
    drawDetonation(ctx, ORIGIN, ms - BLOW_MS * 0.5, BLOW_UP.size, now);
    const nb = Math.min(s.bars, bars.length);
    const ownSince = ms - s.landAt[0];
    if (ms >= BLOW_MS && ms < s.endMs) {
      // the latest snap: the beat every ring and the mess hop to
      let beat = 0;
      for (let b = 1; b < nb; b++) {
        const since = ms - s.landAt[b];
        if (since >= 0 && since < BEAT_MS)
          beat = Math.max(beat, 1 - since / BEAT_MS);
      }
      const climax = ownSince >= 0 ? clamp01(1 - ownSince / CLIMAX_MS) : 0;
      const fade = clamp01(1 - (ownSince - FADE_FROM) / FADE_MS);
      const charge =
        ownSince < 0 ? clamp01((ms - s.chargeFrom) / CHARGE_MS) : 0;
      const shiverFrame = Math.floor(ms / TREMBLE_MS);
      const flung = (ms - BLOW_MS) / FLING_MS;
      const alpha = ctx.globalAlpha;
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < s.count; i++) {
        const b = s.barOf[i];
        if (b >= nb) continue;
        const ox = bars[b].x + s.readX;
        const oy = bars[b].y + CONTACT_Y;
        const zip = (ms - s.zipAt[b]) / s.zipMs[b];
        let a: number;
        let rad: number;
        let flip: number;
        let dy = 0;
        let dx = 0;
        if (zip >= 1) {
          const since = ms - s.landAt[b];
          const pop = since < POP_MS ? Math.sin((Math.PI * since) / POP_MS) : 0;
          a = s.sa[i] + RING_SPIN * since;
          rad = s.sr[i] * (1 + POP * pop + PULSE * beat);
          flip = Math.abs(Math.cos(ms * RING_FLIP - 2 * s.sa[i]));
          if (since < POP_MS) flip = Math.max(flip, 1 - since / POP_MS);
          if (climax > flip) flip = climax;
        } else {
          let pulled = s.mr[i];
          let spin = s.rate[i];
          if (b === 0 && charge > 0) {
            pulled *= 1 - PULL * charge * charge;
            spin *= 1 + CHARGE_SPIN * charge;
          }
          if (zip > 0) {
            const e = zip * zip;
            a = lerp(s.ma[i], s.sa[i], e);
            rad = lerp(pulled, s.sr[i], e);
            spin *= 2;
          } else {
            a = s.ma[i];
            rad = pulled;
            dy = -JUMP * beat * (0.5 + s.lift[i]);
            if (b === 0 && charge > 0) {
              const shiver = TREMBLE * charge;
              dx = (holeHash(shiverFrame + i, 7714) * 2 - 1) * shiver;
              dy += (holeHash(shiverFrame + i, 7715) * 2 - 1) * shiver;
            }
          }
          flip = Math.abs(Math.cos(ms * spin + s.phase[i]));
        }
        let x = ox + Math.cos(a) * rad + dx;
        let y = oy + Math.sin(a) * rad * SQUASH + dy;
        if (flung < 1) {
          spot.x = x;
          spot.y = y;
          flingOut(ORIGIN, spot, s.lift[i], flung, flown);
          x = flown.x;
          y = flown.y;
        }
        const w = SEQ * (0.12 + 0.88 * flip);
        const c = s.colorOf[i];
        lightArgs[0] = c * CELL;
        lightArgs[1] = 0;
        lightArgs[2] = CELL;
        lightArgs[3] = CELL;
        lightArgs[4] = x - w / 2;
        lightArgs[5] = y - SEQ / 2;
        lightArgs[6] = w;
        lightArgs[7] = SEQ;
        lightArgs[8] = alpha * fade * (0.45 + 0.55 * flip);
        lightArgs[9] = s.tiltC[i];
        lightArgs[10] = s.tiltS[i];
        if (!queueLightArgs(ctx, atlas))
          ctx.drawImage(
            atlas,
            c * CELL,
            0,
            CELL,
            CELL,
            x - w / 2,
            y - SEQ / 2,
            w,
            SEQ,
          );
        if (flip > GLINT_AT)
          stampGlimmer(
            ctx,
            x,
            y,
            (GLINT * fade * (flip - GLINT_AT)) / (1 - GLINT_AT),
            i,
            COLOR.white,
          );
      }
      // each readout flashing as its ring snaps, all at the big blast
      for (let b = 0; b < nb; b++) {
        const ox = bars[b].x + s.readX;
        const oy = bars[b].y + CONTACT_Y;
        const since = ms - s.landAt[b];
        if (b > 0 && since >= 0 && since < LAND_FLASH_MS)
          stampGlimmer(
            ctx,
            ox,
            oy,
            BLAST * (1 - since / LAND_FLASH_MS),
            b,
            COLOR.white,
          );
        if (b > 0 && climax > 0)
          stampGlimmer(
            ctx,
            ox,
            oy,
            RING_FLASH * climax,
            b + 300,
            COLOR.heavenlyGold,
          );
      }
      if (charge > 0)
        stampGlimmer(
          ctx,
          bars[0].x + s.readX,
          bars[0].y + CONTACT_Y,
          CHARGE_GLOW * charge * (1 + 0.2 * Math.sin(ms * 0.09)),
          600,
          COLOR.heavenlyGold,
        );
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
    }
    spot.x = bars[0].x + s.readX;
    spot.y = bars[0].y + CONTACT_Y;
    drawDetonation(ctx, spot, ownSince, OWN_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
