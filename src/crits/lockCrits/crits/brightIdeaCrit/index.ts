// Bright Idea, a lock crit: the number arcs onto the dark locked floor and
// hundreds of gold dots stream in from all round it, faster and faster,
// snapping into a giant light bulb (round glass, screw base, filament); the
// filament flickers on, buzzing, quicker and brighter, the bulb trembling,
// until it blazes white and bursts in a flash that blows the lock open, its
// dots raining down onto the new floor's button: each of its next taps also
// levels every other open floor in the building
import meta from "./meta";
import { defineTapPerk } from "../../../buttonCrits/buttonBonus";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import {
  shapeOutline,
  type Shape,
} from "../../../../shared/animationStyles/drawing";
import { drawGlow } from "../../../../shared/glowSprite";
import { stampGlimmer } from "../../../../shared/twinkle";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { playSpinTick } from "../../../../sound";
import { COLOR } from "../../../../palette";
import { getLockCenter } from "../../../../floors/floorLock";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  lerp,
  drawText,
  glowStops,
} from "../../../floorCrits/critPlayer";

const ARC_MS = 170;
const ARC_RISE = 120;
// the bulb, in px from the lock: its glass round GLASS_Y up, GLASS_R across,
// its neck down to the screw base, NECK px either side
const GLASS_Y = -70;
const GLASS_R = 200;
const GLASS_DOTS = 160;
const NECK = 80;
const NECK_Y = 170;
const BASE_GAP = 9;
const FILAMENT_GAP = 7;
// the dots streaming in from SPAWN px out, one every DOT_GAP_MS (quickening),
// each flying FLY_MS (quickening), swirled SWIRL rad on the way
const SPAWN: [number, number] = [750, 1000];
const DOT_GAP_MS: [number, number] = [3.2, 0.45];
const FLY_MS: [number, number] = [210, 140];
const SWIRL = 0.6;
const TRAIL = 0.12;
const CLICK_EVERY = 30;
const CLICK_SHAKE = 0.25;
const DOT = [24, 22, 20];
const LIT_DOT = 34;
const LAND_POP_MS = 80;
// the filament flickering on, each gap shorter, buzzing louder, the bulb
// trembling up to TREMBLE px
const FLICKS_MS = [100, 80, 64, 50, 40, 32, 26, 21, 17];
const FLICK_SHAKE: [number, number] = [0.35, 1.1];
const BUZZ_RATE: [number, number] = [1, 2.2];
const TREMBLE = 10;
const GLOW: [number, number] = [240, 460];
const CORE = 150;
// steady a beat, then it blazes white and swells to SWELL over BLAZE_MS
const STEADY_MS = 40;
const BLAZE_MS = 130;
const BLAZE_SHAKE = 1.4;
const SWELL = 1.14;
const BLAZE_GLOW = 900;
const FLASH_MS = 220;
const FLASH_GLOW = 760;
const OPEN_BLAST = 460;
// the dots flung KICK px out over OUT_MS, then raining onto the button, up to
// STAGGER_MS apart, RAIN_MS each, landing up to SPLAY px off its middle
const KICK: [number, number] = [120, 260];
const OUT_MS = 110;
const STAGGER_MS = 120;
const RAIN_MS = 180;
const SPLAY = 40;
const RAIN_DOT = 22;
const BUTTON_GLOW = 200;
const TAPS_BLAST = 170;
const TAIL_MS = 900;
// shakes by step: the filament catching, the lock blown open, the button
const SHAKES = [0.8, 3.5, 1.3];

const TAU = Math.PI * 2;
// the glass in a unit box (GLASS_R px a unit): its round from the neck's left
// shoulder over the top to its right, then down the neck
const NECK_HALF = 0.61;
const GLASS: Shape = [
  [
    { x: -NECK / GLASS_R, y: (NECK_Y - GLASS_Y) / GLASS_R },
    ...Array.from({ length: 49 }, (_, k) => {
      const a = Math.PI / 2 + NECK_HALF + (k / 48) * (TAU - 2 * NECK_HALF);
      return { x: Math.cos(a), y: Math.sin(a) };
    }),
    { x: NECK / GLASS_R, y: (NECK_Y - GLASS_Y) / GLASS_R },
  ],
];
// the screw base's threads, sides and tip, and the filament's wires and coil
// (flat x, y runs in px from the lock)
const BASE = [
  [-NECK, 196, NECK, 206],
  [-NECK, 222, NECK, 232],
  [-NECK, 248, NECK, 258],
  [-NECK, NECK_Y, -NECK, 258],
  [NECK, NECK_Y + 10, NECK, 258],
  [-NECK, 258, -36, 292, 0, 300, 36, 292, NECK, 258],
];
const FILAMENT = [
  [-28, NECK_Y, -50, -30],
  [28, NECK_Y, 50, -30],
  Array.from({ length: 18 }, (_, k) => {
    const i = k >> 1;
    return k % 2 === 0 ? -50 + (i * 100) / 8 : i % 2 ? -64 : -30;
  }),
];

// dots every `gap` px along the run (x, y pairs), pushed onto out
function dotRun(out: Point[], run: readonly number[], gap: number): void {
  for (let k = 0; k + 3 < run.length; k += 2) {
    const ax = run[k];
    const ay = run[k + 1];
    const bx = run[k + 2];
    const by = run[k + 3];
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / gap));
    for (let i = 0; i < n; i++)
      out.push({ x: ax + ((bx - ax) * i) / n, y: ay + ((by - ay) * i) / n });
  }
  out.push({ x: run[run.length - 2], y: run[run.length - 1] });
}

interface State {
  count: number;
  // each dot's spot from the lock, its part (0 glass, 1 base, 2 filament),
  // where it streams in from, when it's sent and lands
  tx: Float32Array;
  ty: Float32Array;
  part: Uint8Array;
  sx: Float32Array;
  sy: Float32Array;
  fired: Float32Array;
  landed: Float32Array;
  // its fling out when the bulb bursts, and its rain onto the button
  kx: Float32Array;
  ky: Float32Array;
  stagger: Float32Array;
  jx: Float32Array;
  jy: Float32Array;
  // clicks, flickers and the blaze: when, the jolt and the buzz's pitch
  kickAt: number[];
  kickShake: number[];
  kickRate: number[];
  flicks: number[];
  onAt: number;
  steadyAt: number;
  blazeAt: number;
  burstAt: number;
  rainAt: number;
  rewardAt: number;
  button: Point;
}

const states = new WeakMap<Running, State>();
const GOLD = glowStops(COLOR.heavenlyGold);
const WHITE = glowStops(COLOR.white);
const spot: Point = { x: 0, y: 0 };

// the filament's light 0..1: off, flickering on and off (quicker, the "on"
// longer and brighter each time), then steady
function lightAt(s: State, ms: number): number {
  if (ms < s.onAt) return 0;
  if (ms >= s.steadyAt) return 1;
  const f = s.flicks;
  let i = f.length - 1;
  while (i > 0 && ms < f[i]) i--;
  const prog = i / (f.length - 1);
  const gap = (i + 1 < f.length ? f[i + 1] : s.steadyAt) - f[i];
  return ms - f[i] < gap * lerp(0.45, 0.85, prog)
    ? lerp(0.6, 1, prog)
    : lerp(0.1, 0.4, prog);
}

// each of its next taps also levelling the floors within `reach` of it
const brightTaps = defineTapPerk("Bright", (t) => {
  const at = t.floors.indexOf(t.floor);
  const { reach } = meta.values;
  const from = Math.max(0, at - reach);
  const to = Math.min(t.floors.length - 1, at + reach);
  for (let i = from; i <= to; i++) if (i !== at) t.levelUp(t.floors[i], 1);
});

registerFloorCrit("brightIdeaCrit", {
  reward(t) {
    brightTaps.add(t.floor, meta.values.taps);
    t.flipButton();
  },
  plan(r, _bars, hit) {
    const dots = shapeOutline(GLASS, GLASS_DOTS, { x: 0, y: GLASS_Y }, GLASS_R);
    const glassEnd = dots.length;
    for (const run of BASE) dotRun(dots, run, BASE_GAP);
    const baseEnd = dots.length;
    for (const run of FILAMENT) dotRun(dots, run, FILAMENT_GAP);
    const n = dots.length;
    const s: State = {
      count: n,
      tx: new Float32Array(n),
      ty: new Float32Array(n),
      part: new Uint8Array(n),
      sx: new Float32Array(n),
      sy: new Float32Array(n),
      fired: new Float32Array(n),
      landed: new Float32Array(n),
      kx: new Float32Array(n),
      ky: new Float32Array(n),
      stagger: new Float32Array(n),
      jx: new Float32Array(n),
      jy: new Float32Array(n),
      kickAt: [],
      kickShake: [],
      kickRate: [],
      flicks: [],
      onAt: 0,
      steadyAt: 0,
      blazeAt: 0,
      burstAt: 0,
      rainAt: 0,
      rewardAt: 0,
      button: { x: 0, y: 0 },
    };
    let at = ARC_MS;
    let onAt = 0;
    for (let k = 0; k < n; k++) {
      const p = dots[k];
      const u = k / (n - 1);
      s.tx[k] = p.x;
      s.ty[k] = p.y;
      s.part[k] = k < glassEnd ? 0 : k < baseEnd ? 1 : 2;
      const a = Math.atan2(p.y - GLASS_Y, p.x) + (Math.random() - 0.5) * 0.9;
      const far = lerp(SPAWN[0], SPAWN[1], Math.random());
      s.sx[k] = Math.cos(a) * far;
      s.sy[k] = GLASS_Y + Math.sin(a) * far;
      s.fired[k] = at;
      s.landed[k] = at + lerp(FLY_MS[0], FLY_MS[1], u);
      onAt = Math.max(onAt, s.landed[k]);
      if (k % CLICK_EVERY === 0) {
        s.kickAt.push(at);
        s.kickShake.push(CLICK_SHAKE);
        s.kickRate.push(lerp(0.8, 1.4, u));
      }
      at += lerp(DOT_GAP_MS[0], DOT_GAP_MS[1], u);
      const out = Math.atan2(p.y - GLASS_Y, p.x);
      const kick = lerp(KICK[0], KICK[1], Math.random());
      s.kx[k] = Math.cos(out) * kick;
      s.ky[k] = Math.sin(out) * kick;
      s.stagger[k] = Math.random() * STAGGER_MS;
      s.jx[k] = (Math.random() - 0.5) * 2 * SPLAY;
      s.jy[k] = (Math.random() - 0.5) * SPLAY;
    }
    // the flickers, each a buzz and a jolt, quicker and harder
    let f = onAt;
    for (let i = 0; i < FLICKS_MS.length; i++) {
      const u = i / (FLICKS_MS.length - 1);
      s.flicks.push(f);
      s.kickAt.push(f);
      s.kickShake.push(lerp(FLICK_SHAKE[0], FLICK_SHAKE[1], u));
      s.kickRate.push(lerp(BUZZ_RATE[0], BUZZ_RATE[1], u));
      f += FLICKS_MS[i];
    }
    s.onAt = onAt;
    s.steadyAt = f;
    s.blazeAt = f + STEADY_MS;
    s.kickAt.push(s.blazeAt);
    s.kickShake.push(BLAZE_SHAKE);
    s.kickRate.push(BUZZ_RATE[1] * 1.2);
    s.burstAt = s.blazeAt + BLAZE_MS;
    s.rainAt = s.burstAt + OUT_MS;
    s.rewardAt = s.rainAt + STAGGER_MS + RAIN_MS;
    const btn = getButtonCenter(false);
    const lock = getLockCenter();
    s.button.x = btn.x - lock.x;
    s.button.y = btn.y - lock.y;
    hit(0, s.onAt, 0);
    hit(0, s.burstAt, 1);
    hit(0, s.rewardAt, 2);
    states.set(r, s);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const s = states.get(r)!;
    const c = bars[0];
    const gy = c.y + GLASS_Y;
    if (ms < ARC_MS) {
      const u = ms / ARC_MS;
      const p = u * u * (3 - 2 * u);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        c.x * p,
        gy * p - ARC_RISE * 4 * p * (1 - p),
        r.flashFont,
      );
    }
    while (r.kicked < s.kickAt.length && ms >= s.kickAt[r.kicked]) {
      r.shake(s.kickShake[r.kicked]);
      playSpinTick(s.kickRate[r.kicked]);
      r.kicked++;
    }
    const n = s.count;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    if (ms >= ARC_MS && ms < s.burstAt) {
      const light = lightAt(s, ms);
      const prog = clamp01((ms - s.onAt) / (s.steadyAt - s.onAt));
      const blaze = clamp01((ms - s.blazeAt) / BLAZE_MS);
      const sc = 1 + (SWELL - 1) * blaze * blaze + 0.02 * light;
      const amp = TREMBLE * (prog * prog + 1.5 * blaze);
      const bx = c.x + amp * Math.sin(ms * 0.11);
      const by = c.y + amp * 0.6 * Math.sin(ms * 0.137 + 1);
      if (light > 0) {
        ctx.globalAlpha = 0.25 + 0.5 * light;
        drawGlow(
          ctx,
          GOLD,
          bx,
          by + GLASS_Y,
          lerp(GLOW[0], GLOW[1], light * prog),
        );
        ctx.globalAlpha = light;
        drawGlow(ctx, WHITE, bx, by - 40, CORE * (0.6 + 0.6 * light));
      }
      if (blaze > 0) {
        ctx.globalAlpha = blaze;
        drawGlow(
          ctx,
          WHITE,
          bx,
          by + GLASS_Y,
          BLAZE_GLOW * (0.4 + 0.6 * blaze),
        );
      }
      ctx.globalAlpha = 1;
      beginLightBatch(ctx);
      for (let k = 0; k < n; k++) {
        const fired = s.fired[k];
        if (ms < fired) break;
        const part = s.part[k];
        const land = s.landed[k];
        if (ms < land) {
          // in flight: accelerating in, swirling, a streak behind it
          const u = (ms - fired) / (land - fired);
          const rem = 1 - u * u;
          const ang = SWIRL * rem;
          const cos = Math.cos(ang);
          const sin = Math.sin(ang);
          const dx = s.sx[k] - s.tx[k];
          const dy = s.sy[k] - s.ty[k];
          const rx = dx * cos - dy * sin;
          const ry = dx * sin + dy * cos;
          const back = Math.max(0, u - TRAIL);
          const rem2 = 1 - back * back;
          const x = c.x + s.tx[k];
          const y = c.y + s.ty[k];
          stampGlimmer(
            ctx,
            x + rx * rem2,
            y + ry * rem2,
            DOT[part] * 0.7,
            k + 7,
            COLOR.heavenlyGold,
          );
          stampGlimmer(
            ctx,
            x + rx * rem,
            y + ry * rem,
            DOT[part],
            k,
            COLOR.white,
          );
          continue;
        }
        const pop = Math.max(0, 1 - (ms - land) / LAND_POP_MS);
        const lit = part === 2 && light > 0.5;
        const size =
          (lit ? LIT_DOT * (0.7 + 0.3 * light) : DOT[part]) *
          (1 + 0.8 * pop) *
          (1 + 0.5 * blaze);
        stampGlimmer(
          ctx,
          bx + s.tx[k] * sc,
          by + GLASS_Y + (s.ty[k] - GLASS_Y) * sc,
          size,
          k + ms * 0.004,
          lit || blaze > 0.4 || pop > 0.5 || k % 4 === 0
            ? COLOR.white
            : COLOR.heavenlyGold,
        );
      }
      endLightBatch(ctx);
    }
    if (ms >= s.burstAt && ms < s.rewardAt) {
      // the flash, then the dots flung out and raining onto the button
      const since = ms - s.burstAt;
      if (since < FLASH_MS) {
        const f = 1 - since / FLASH_MS;
        ctx.globalAlpha = f * f;
        drawGlow(ctx, WHITE, c.x, gy, FLASH_GLOW * (1 + 0.4 * (1 - f)));
        ctx.globalAlpha = 1;
      }
      const bx = c.x + s.button.x;
      const by = c.y + s.button.y;
      const gather = clamp01((ms - s.rainAt - RAIN_MS) / STAGGER_MS);
      if (gather > 0) {
        ctx.globalAlpha = gather;
        drawGlow(ctx, GOLD, bx, by, BUTTON_GLOW * (0.5 + 0.5 * gather));
        ctx.globalAlpha = 1;
      }
      const u1 = clamp01(since / OUT_MS);
      const e1 = 1 - (1 - u1) * (1 - u1);
      beginLightBatch(ctx);
      for (let k = 0; k < n; k++) {
        const px = c.x + s.tx[k] * SWELL + s.kx[k] * e1;
        const py = gy + (s.ty[k] - GLASS_Y) * SWELL + s.ky[k] * e1;
        const u2 = (ms - s.rainAt - s.stagger[k]) / RAIN_MS;
        if (u2 >= 1) continue;
        if (u2 <= 0) {
          stampGlimmer(
            ctx,
            px,
            py,
            RAIN_DOT * (1.4 - 0.4 * e1),
            k,
            COLOR.white,
          );
          continue;
        }
        const e2 = u2 * u2;
        stampGlimmer(
          ctx,
          px + (bx + s.jx[k] - px) * e2,
          py + (by + s.jy[k] - py) * e2,
          RAIN_DOT,
          k,
          k % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
    }
    ctx.restore();
    spot.x = c.x;
    spot.y = gy;
    drawDetonation(ctx, spot, ms - s.burstAt, OPEN_BLAST, now);
    spot.x = c.x + s.button.x;
    spot.y = c.y + s.button.y;
    drawDetonation(ctx, spot, ms - s.rewardAt, TAPS_BLAST, now);
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
