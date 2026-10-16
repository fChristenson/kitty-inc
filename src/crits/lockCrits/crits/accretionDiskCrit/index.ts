// Accretion Disk, a lock crit: the number sinks into the lock and a tilted
// disk of hundreds of stars swirls out round it, spinning up, the inner
// stars racing round faster (Kepler); clumps gather on the rim and spiral in
// one after another, quicker and quicker, each striking the lock in a white
// flash and a jolt, the lock glowing hotter and trembling as matter piles on;
// at the climax a jet of light blasts out of both its poles and it bursts
// open, and every star in the disk is flung off along its heading and curves
// down onto the new floor's bar: every open floor's payout at once
import meta from "./meta";
import {
  drawStars,
  planDisk,
  scatterArms,
  type Disk,
  type Orbit,
} from "../../../../shared/animationStyles/galaxy";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import {
  drawBeam,
  drawBeamFlare,
} from "../../../../shared/animationStyles/beam";
import { drawGlow } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { add, multiply } from "../../../../shared/bigNumber";
import { COLOR } from "../../../../palette";
import {
  FLOOR_H,
  FLOOR_X_MAX,
  FLOOR_X_MIN,
} from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import {
  currentPayoutAmount,
  getIncomeBarBox,
} from "../../../../floors/incomePanel";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  glowStops,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

const TAU = Math.PI * 2;
const BURST_MS = 120;
const GROW_MS = 220;
// the disk: STARS on its arms, its clock running SPIN_UP times faster by
// OPEN_AT, OUTER a share of the room either side of the lock
const STARS = 170;
const ROOM = 0.92;
const INNER_SHARE = 0.2;
const SQUASH = 0.3;
const TILT = -0.18;
const RIM_HZ = 0.35;
const SPIN_MS = 1150;
const SPIN_UP = 3.2;
const OPEN_AT = BURST_MS + SPIN_MS;
const STAR = 20;
// the clumps: CLUMP stars each, striking the lock at these shares of the
// spin-up after spiralling in over INFALL_MS (quicker each), SWIRL rad
// further round on the way
const CLUMP = 10;
const STRIKES = [0.24, 0.42, 0.56, 0.67, 0.76, 0.83, 0.89, 0.94];
const INFALL_MS = [300, 280, 250, 230, 210, 190, 170, 150];
const SWIRL = 2.6;
const CORE_R = 6;
const CLUMP_STAR = 26;
const FLASH_MS = 150;
const FLASH_R = 90;
// the lock's glow, growing with what has struck it, trembling TREMBLE px
// when hottest, swelling SWELL more over the last SWELL_MS
const HEAT_R = 46;
const HEAT_GROWTH = 70;
const TREMBLE = 5;
const SWELL = 0.8;
const SWELL_MS = 260;
// the jets out of both poles: JET_LEN long, out in JET_GROW, gone by JET_MS
const JET_LEN = FLOOR_H * 1.15;
const JET_W = 34;
const JET_GROW = 70;
const JET_MS = 420;
const JET_FLARE = 46;
// the fling: FLING px along its heading over FLING_MS, then onto the bar over
// FALL_MS, STAGGER_MS apart
const FLING = 200;
const FLING_MS = 100;
const FALL_MS = 210;
const STAGGER_MS = 0.6;
const OPEN_BLAST = 440;
const BAR_BLAST = 240;
// shakes by step: a strike, the opening, onto the bar
const SHAKES = [0.7, 3.4, 1.4];

const GOLD = glowStops(COLOR.heavenlyGold);
const WHITE = glowStops(COLOR.white);

interface State {
  disk: Disk;
  stars: Orbit[];
  // each clump's leading orbit and its stars, all clumps' in one list
  leads: Orbit[];
  clumped: Orbit[];
  strikes: number[];
  landAt: number;
  // each disk star's spot at the opening, its heading and its spot on the bar
  sx: Float32Array;
  sy: Float32Array;
  hx: Float32Array;
  hy: Float32Array;
  tx: Float32Array;
  ty: Float32Array;
  bar: Point;
}
const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };
const star: Point = { x: 0, y: 0 };
const heart: Point = { x: 0, y: 0 };
const jetUp: Point = { x: 0, y: 0 };
const jetDown: Point = { x: 0, y: 0 };
// the disk's poles, square to its long axis
const POLE_X = -Math.sin(TILT);
const POLE_Y = Math.cos(TILT);

// the disk's clock at ms: running faster and faster as it spins up
function clock(ms: number): number {
  const s = Math.max(0, Math.min(ms, OPEN_AT) - BURST_MS);
  return s + ((SPIN_UP - 1) * s * s) / (2 * SPIN_MS);
}

registerFloorCrit("accretionDiskCrit", {
  reward(t) {
    let total = currentPayoutAmount(t.floor, t.now);
    for (const floor of t.floors)
      if (floor !== t.floor && floor.unlocked)
        total = add(total, currentPayoutAmount(floor, t.now));
    t.pay(multiply(total, t.count * meta.values.payouts));
    t.punch("Every Payout!");
  },
  plan(r, _bars, hit) {
    const lock = getLockCenter();
    const room = Math.min(lock.x - FLOOR_X_MIN, FLOOR_X_MAX - lock.x);
    const outer = Math.max(80, room * ROOM);
    const disk = planDisk(ORIGIN, {
      inner: outer * INNER_SHARE,
      outer,
      squash: SQUASH,
      tilt: TILT,
      rimHz: RIM_HZ,
    });
    const stars = scatterArms(disk, STARS, 3, 0.8, 0.3);
    const strikes: number[] = [];
    const leads: Orbit[] = [];
    const clumped: Orbit[] = [];
    for (let c = 0; c < STRIKES.length; c++) {
      strikes.push(BURST_MS + SPIN_MS * STRIKES[c]);
      const lead = {
        radius: outer * (0.8 + 0.15 * holeHash(c, 7301)),
        phase: holeHash(c, 7302) * TAU,
      };
      leads.push(lead);
      for (let k = 0; k < CLUMP; k++)
        clumped.push({
          radius: lead.radius * (0.9 + 0.2 * holeHash(c * CLUMP + k, 7303)),
          phase: lead.phase + (holeHash(c * CLUMP + k, 7304) - 0.5) * 0.9,
        });
      hit(0, strikes[c], 0);
    }
    hit(0, OPEN_AT, 1);
    const n = stars.length;
    const sx = new Float32Array(n);
    const sy = new Float32Array(n);
    const hx = new Float32Array(n);
    const hy = new Float32Array(n);
    const tx = new Float32Array(n);
    const ty = new Float32Array(n);
    const box = getIncomeBarBox(false);
    const bar = {
      x: box.x + box.width / 2 - lock.x,
      y: box.y + box.height / 2 - lock.y,
    };
    const openClock = clock(OPEN_AT);
    for (let i = 0; i < n; i++) {
      disk.at(stars[i], openClock, star);
      sx[i] = star.x;
      sy[i] = star.y;
      const h = disk.heading(stars[i], openClock);
      hx[i] = Math.cos(h);
      hy[i] = Math.sin(h);
      tx[i] = bar.x + (holeHash(i, 7305) * 2 - 1) * box.width * 0.45;
      ty[i] = bar.y + (holeHash(i, 7306) - 0.5) * box.height;
    }
    const landAt =
      OPEN_AT + FLING_MS + Math.max(0, n - 1) * STAGGER_MS + FALL_MS;
    hit(0, landAt, 2);
    states.set(r, {
      disk,
      stars,
      leads,
      clumped,
      strikes,
      landAt,
      sx,
      sy,
      hx,
      hy,
      tx,
      ty,
      bar,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const lock = bars[0];
    if (ms < BURST_MS) {
      const p = ms / BURST_MS;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lock.x * p,
        lock.y * p,
        r.flashFont * (1 - 0.7 * p),
      );
      return;
    }
    const { disk, strikes } = state;
    ctx.save();
    ctx.translate(lock.x, lock.y);
    if (ms < OPEN_AT) {
      const g = clamp01((ms - BURST_MS) / GROW_MS);
      const grow = 1 - (1 - g) * (1 - g);
      const t = clock(ms);
      drawStars(ctx, disk, state.stars, t, STAR, grow);
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      drawClumps(ctx, state, ms, t, grow);
      // the lock glowing hotter with every strike, trembling and swelling
      let struck = 0;
      for (let c = 0; c < strikes.length; c++) if (ms >= strikes[c]) struck++;
      const heat = struck / Math.max(1, strikes.length);
      const swell = 1 + SWELL * clamp01(1 - (OPEN_AT - ms) / SWELL_MS) ** 2;
      const shiver = TREMBLE * heat * swell;
      heart.x = Math.sin(ms * 0.11) * shiver;
      heart.y = Math.cos(ms * 0.137) * shiver;
      const hot = (HEAT_R + HEAT_GROWTH * heat) * swell * grow;
      ctx.globalAlpha = 0.55 + 0.45 * heat;
      drawGlow(ctx, GOLD, heart.x, heart.y, hot);
      drawGlow(ctx, WHITE, heart.x, heart.y, hot * (0.3 + 0.25 * heat));
      // each strike a white flash on the lock
      for (let c = 0; c < strikes.length; c++) {
        const p = (ms - strikes[c]) / FLASH_MS;
        if (p < 0 || p >= 1) continue;
        ctx.globalAlpha = 1 - p;
        drawGlow(ctx, WHITE, 0, 0, FLASH_R * (0.6 + 0.4 * p) * (1 + 0.1 * c));
      }
      ctx.globalAlpha = 1;
      endLightBatch(ctx);
    } else {
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      drawJets(ctx, ms - OPEN_AT, now);
      drawFling(ctx, state, ms - OPEN_AT);
      endLightBatch(ctx);
    }
    ctx.globalCompositeOperation = "source-over";
    drawDetonation(ctx, ORIGIN, ms - OPEN_AT, OPEN_BLAST, now);
    drawDetonation(ctx, state.bar, ms - state.landAt, BAR_BLAST, now);
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});

// each clump gathering on its lead, then spiralling in onto the lock,
// speeding up, until it strikes
function drawClumps(
  ctx: CanvasRenderingContext2D,
  state: State,
  ms: number,
  t: number,
  grow: number,
): void {
  const { disk, leads, clumped, strikes } = state;
  for (let c = 0; c < leads.length; c++) {
    const strikeAt = strikes[c];
    if (ms >= strikeAt) continue;
    const span = INFALL_MS[c] ?? INFALL_MS[INFALL_MS.length - 1];
    const u = clamp01(1 - (strikeAt - ms) / span);
    const fall = u * u;
    const lead = disk.angle(leads[c], t);
    const size = CLUMP_STAR * (1 - 0.4 * fall);
    const end = Math.min(clumped.length, (c + 1) * CLUMP);
    for (let i = c * CLUMP; i < end; i++) {
      const o = clumped[i];
      const own = disk.angle(o, t);
      const diff = ((((lead - own) % TAU) + TAU + Math.PI) % TAU) - Math.PI;
      const a = own + diff * clamp01(u * 2.5) + fall * SWIRL;
      const radius = Math.max(0, lerp(o.radius, CORE_R, fall));
      disk.place(radius, a, star, grow);
      stampGlimmer(
        ctx,
        star.x,
        star.y,
        size,
        a * 3,
        i % 2 ? COLOR.white : COLOR.heavenlyGold,
      );
    }
  }
}

// a jet of light blasting out of both poles, flaring at its tips
function drawJets(
  ctx: CanvasRenderingContext2D,
  since: number,
  now: number,
): void {
  if (since >= JET_MS) return;
  const out = 1 - (1 - clamp01(since / JET_GROW)) ** 3;
  const fade = clamp01((since - JET_GROW) / (JET_MS - JET_GROW));
  const len = JET_LEN * out;
  jetUp.x = -POLE_X * len;
  jetUp.y = -POLE_Y * len;
  jetDown.x = POLE_X * len;
  jetDown.y = POLE_Y * len;
  const width = Math.max(0, JET_W * (1 - fade * fade));
  const alpha = 1 - fade;
  drawBeam(ctx, ORIGIN, jetUp, width, alpha);
  drawBeam(ctx, ORIGIN, jetDown, width, alpha);
  drawBeamFlare(ctx, jetUp, JET_FLARE * (1 - fade), alpha, now);
  drawBeamFlare(ctx, jetDown, JET_FLARE * (1 - fade), alpha, now);
}

// every disk star flung off along its heading, then curving onto the bar
function drawFling(
  ctx: CanvasRenderingContext2D,
  state: State,
  since: number,
): void {
  const { sx, sy, hx, hy, tx, ty } = state;
  const fling = clamp01(since / FLING_MS);
  const out = FLING * (1 - (1 - fling) ** 2);
  for (let i = 0; i < sx.length; i++) {
    const fall = clamp01((since - FLING_MS - i * STAGGER_MS) / FALL_MS);
    if (fall >= 1) continue;
    const e = fall * fall;
    star.x = lerp(sx[i] + hx[i] * out, tx[i], e);
    star.y = lerp(sy[i] + hy[i] * out, ty[i], e);
    stampGlimmer(
      ctx,
      star.x,
      star.y,
      STAR * 1.2,
      i,
      i % 2 ? COLOR.heavenlyGold : COLOR.white,
    );
  }
}
