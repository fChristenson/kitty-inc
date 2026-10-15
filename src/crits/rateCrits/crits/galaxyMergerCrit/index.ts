// Galaxy Merger, a rate crit: the number fades as two tilted star disks,
// turning opposite ways, spin in from either side of the readouts and fall
// towards each other, swinging past closer and quicker each time, the rumble
// rising; every close pass tears tidal arms of stars off the disks, each arm
// whipping onto a bar's readout (a flash, the readout turning over). Then the
// cores collide in one flash, the merged disk flares and flings every star
// left off along its heading onto its own readout in the big blast. The bar's
// next payouts each also pay out the bar next to it
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import type { Floor } from "../../../../gameState";
import { COLOR } from "../../../../palette";
import {
  planDisk,
  scatterDisk,
  type Orbit,
} from "../../../../shared/animationStyles/galaxy";
import { drawChargeGlow } from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { pulseHudTotalFlash } from "../../../../shared/totalIncomeCoins";
import { addTotalIncome } from "../../../../totalIncome";
import {
  currentPayoutAmount,
  punchIncomeBar,
} from "../../../../floors/incomePanel";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

const TAU = Math.PI * 2;
const IN_MS = 140;
const GROW_MS = 240;
// each disk: STARS from INNER to OUTER px round, seen SQUASH tall, the two
// tilted apart and turning opposite ways
const STARS = 170;
const INNER = 14;
const OUTER = 105;
const SQUASH = 0.4;
const RIM_HZ = 0.6;
const STAR = 12;
const DISK_A = planDisk(
  { x: 0, y: 0 },
  { inner: INNER, outer: OUTER, squash: SQUASH, tilt: -0.35, rimHz: RIM_HZ },
);
const DISK_B = planDisk(
  { x: 0, y: 0 },
  {
    inner: INNER,
    outer: OUTER,
    squash: SQUASH,
    tilt: 0.3,
    rimHz: RIM_HZ,
    spin: -1,
  },
);
const DISKS = [DISK_A, DISK_B];
// the merge point MERGE_X of a bar's half width off the bars' middle, kept
// EDGE px inside the screen; the readouts READOUT out, CONTACT_Y off middle
const MERGE_X = -0.15;
const EDGE = 90;
const READOUT = 0.6;
const CONTACT_Y = -20;
// the cores' dance: starting START_SEP of the screen's width either side,
// passing at PASSES (quickening), NEARS px off the merge point, swinging
// FARS px out between, half a turn a leg (LURCH: how much of it is whipped
// round at the pass), on a plane ORBIT_SQUASH tall turned ORBIT_TILT; they
// collide at MERGE_MS
const PASSES = [600, 900, 1130];
const MERGE_MS = 1300;
const START_SEP = 0.4;
const NEARS = [34, 26, 18, 0];
const FARS = [80, 55, 30];
const LURCH = 0.8;
const ORBIT_SQUASH = 0.45;
const ORBIT_TILT = 0.2;
// the disks drawn in to MERGE_SHRINK of their size for the collision, then
// flaring out to FLARE_GROW over FLARE_GROW_MS
const MERGE_SHRINK = 0.65;
const FLARE_GROW = 1.15;
const FLARE_GROW_MS = 120;
// a pass's arms: ARM_STARS stars each (fewer if many), peeling off over
// ARM_PEEL ms from ARM_LEAD before the pass, flung REACH px along their
// heading, landing ARM_LAND after it, each next arm ARM_STAGGER later
const ARM_STARS = 30;
const ARM_SHARE = 0.55;
const ARM_LEAD = 40;
const ARM_PEEL = 70;
const ARM_LAND = 230;
const ARM_STAGGER = 35;
const REACH = 90;
const ARM_WISP = WISP_SIZE * 0.7;
// the last burst: the stars let go FLING_DELAY after the collision over
// FLING_SPREAD (a trickle, then a flood, to PACE), all landing on its own
// readout FLING_FLY after the last lets go
const FLING_DELAY = 50;
const FLING_SPREAD = 110;
const PACE = 0.55;
const FLING_FLY = 130;
const OWN_WISP = WISP_SIZE * 1.3;
// the cores: wisps glowing CORE_GLOW, trembling harder as they close
const CORE_WISP = WISP_SIZE * 0.8;
const CORE_GLOW = 160;
const CORE_TREMBLE = 5;
// the collision's flash and blast; its own readout's blast
const FLARE = 300;
const FLARE_MS = 280;
const MERGE_BLAST = 200;
const OWN_BLAST = 360;
// a readout hit
const HIT_FLASH = 120;
const HIT_FLASH_MS = 170;
// rumble kicks RUMBLE_GAP_MS apart (closing), RUMBLE strong; each pass a
// PASS_SHAKES jolt, the collision MERGE_SHAKE
const RUMBLE_GAP_MS: [number, number] = [150, 45];
const RUMBLE: [number, number] = [0.15, 0.6];
const PASS_SHAKES = [0.7, 1, 1.4];
const MERGE_SHAKE = 2.4;
// shakes by step: unused, a readout hit, its own
const SHAKES = [0.4, 1, 3];

interface State {
  bars: Point[];
  half: number;
  viewportWidth: number;
  // the merge point this frame
  m: Point;
  startSep: number;
  // per star: its disk, orbit, target bar (-1: the merge point), when it's
  // flung and lands, where off the merge point and which way
  disk: Uint8Array;
  orbits: Orbit[];
  target: Int16Array;
  release: Float32Array;
  land: Float32Array;
  relX: Float32Array;
  relY: Float32Array;
  dirX: Float32Array;
  dirY: Float32Array;
  // per arm: its bar (-1: none), landing, the star leading it
  armBar: Int16Array;
  armLand: Float32Array;
  armLead: Int16Array;
  armAt: ((ms: number) => Point | null)[];
  ownLead: number;
  ownLand: number;
  ownAt: (ms: number) => Point | null;
  coreAt: ((ms: number) => Point | null)[];
  kickMs: Float32Array;
  kick: Float32Array;
}
const states = new WeakMap<Running, State>();
const ORBIT_COS = Math.cos(ORBIT_TILT);
const ORBIT_SIN = Math.sin(ORBIT_TILT);
const FLARE_STOPS = fadeStops(COLOR.white);
const star: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };
const coreA: Point = { x: 0, y: 0 };
const coreB: Point = { x: 0, y: 0 };
const glow: Point = { x: 0, y: 0 };

// half a turn over a leg, whipped round fastest at the passes
function sweep(u: number): number {
  return Math.PI * (u + (LURCH * Math.sin(TAU * u)) / TAU);
}

// core `which`'s offset off the merge point at ms (B mirrors A)
function coreOffset(s: State, which: number, ms: number, into: Point): Point {
  if (ms >= MERGE_MS) {
    into.x = 0;
    into.y = 0;
    return into;
  }
  let sep: number;
  let theta: number;
  if (ms < PASSES[0]) {
    const u = 0.5 + 0.5 * clamp01((ms - IN_MS) / (PASSES[0] - IN_MS));
    sep = NEARS[0] + (s.startSep - NEARS[0]) * Math.sin(Math.PI * u);
    theta = Math.PI / 2 + sweep(u);
  } else {
    let k = 0;
    while (k < PASSES.length - 1 && ms >= PASSES[k + 1]) k++;
    const to = k + 1 < PASSES.length ? PASSES[k + 1] : MERGE_MS;
    const u = (ms - PASSES[k]) / (to - PASSES[k]);
    sep = lerp(NEARS[k], NEARS[k + 1], u) + FARS[k] * Math.sin(Math.PI * u);
    theta = Math.PI * (1.5 + k) + sweep(u);
  }
  const side = which === 0 ? sep : -sep;
  const x = Math.cos(theta) * side;
  const y = Math.sin(theta) * side * ORBIT_SQUASH;
  into.x = x * ORBIT_COS - y * ORBIT_SIN;
  into.y = x * ORBIT_SIN + y * ORBIT_COS;
  return into;
}

// how big the disks are at ms: growing in, drawn in for the collision, then
// flaring out
function growAt(ms: number): number {
  const g = clamp01((ms - IN_MS) / GROW_MS);
  const grown = g * (2 - g);
  if (ms >= MERGE_MS)
    return lerp(
      MERGE_SHRINK,
      FLARE_GROW,
      clamp01((ms - MERGE_MS) / FLARE_GROW_MS),
    );
  return (
    grown *
    lerp(
      1,
      MERGE_SHRINK,
      clamp01(
        (ms - PASSES[PASSES.length - 1]) /
          (MERGE_MS - PASSES[PASSES.length - 1]),
      ),
    )
  );
}

// star i flung: off along its heading, bent onto its readout (or the merge
// point), snapping on faster and faster
function flightAt(s: State, i: number, ms: number, into: Point): Point | null {
  const b = s.target[i];
  if (ms < s.release[i] || ms > s.land[i] || b >= s.bars.length) return null;
  const v = (ms - s.release[i]) / (s.land[i] - s.release[i]);
  const u = v * (0.55 + 0.45 * v);
  const x0 = s.m.x + s.relX[i];
  const y0 = s.m.y + s.relY[i];
  const cx = x0 + s.dirX[i] * REACH;
  const cy = y0 + s.dirY[i] * REACH;
  let ex = s.m.x;
  let ey = s.m.y;
  if (b >= 0) {
    ex = s.bars[b].x + s.half * READOUT;
    ey = s.bars[b].y + CONTACT_Y;
  }
  const w = 1 - u;
  into.x = w * w * x0 + 2 * w * u * cx + u * u * ex;
  into.y = w * w * y0 + 2 * w * u * cy + u * u * ey;
  return into;
}

function placeMerge(s: State): void {
  const { bars } = s;
  let top = bars[0].y;
  let bottom = top;
  for (let b = 1; b < bars.length; b++) {
    if (bars[b].y < top) top = bars[b].y;
    if (bars[b].y > bottom) bottom = bars[b].y;
  }
  const edge = s.viewportWidth / 2 - EDGE;
  s.m.x = Math.max(-edge, Math.min(edge, bars[0].x + s.half * MERGE_X));
  s.m.y = (top + bottom) / 2;
}

// a merged payout: each of the bar's next `left` payouts also pays out the
// bar next to it
const merged = defineBarEffect<{
  floor: Floor;
  partner: Floor;
  left: number;
  color: string;
}>({
  onPayout: (v, now) => {
    if (v.partner.unlocked) {
      addTotalIncome(currentPayoutAmount(v.partner, now));
      punchIncomeBar(v.floor, "Merged", v.color);
      pulseHudTotalFlash();
    }
    v.left--;
    return v.left > 0 ? v : undefined;
  },
});

registerFloorCrit("galaxyMergerCrit", {
  reward(t) {
    t.flipRate();
    const { payouts, ownPayouts } = meta.values;
    const add = t.own ? ownPayouts : payouts;
    const i = t.floors.indexOf(t.floor);
    const above = t.floors[i + 1];
    const below = i > 0 ? t.floors[i - 1] : undefined;
    const partner = above?.unlocked ? above : below?.unlocked ? below : t.floor;
    const left = (merged.get(t.floor)?.left ?? 0) + add;
    merged.set(t.floor, { floor: t.floor, partner, left, color: t.color });
    t.punch(`Merged x${add}`);
  },
  plan(r, bars, hit) {
    const total = STARS * 2;
    // the stars, outer first (the tides strip those), A's then B's
    const orbitsA = scatterDisk(DISK_A, STARS).sort(
      (a, b) => b.radius - a.radius,
    );
    const orbitsB = scatterDisk(DISK_B, STARS).sort(
      (a, b) => b.radius - a.radius,
    );
    const orbits = orbitsA.concat(orbitsB);
    const disk = new Uint8Array(total);
    for (let i = STARS; i < total; i++) disk[i] = 1;

    // the arms: every other bar on one of the passes; a pass without one
    // still tears an arm that falls back into the merger
    const others = bars.length - 1;
    const armBars: number[] = [];
    const armPass: number[] = [];
    for (let k = 0; k < PASSES.length; k++) {
      let any = false;
      for (let j = 0; j < others; j++) {
        if (Math.floor((j * PASSES.length) / others) !== k) continue;
        armBars.push(j + 1);
        armPass.push(k);
        any = true;
      }
      if (!any) {
        armBars.push(-1);
        armPass.push(k);
      }
    }
    const arms = armBars.length;
    const perArm = Math.max(
      6,
      Math.min(ARM_STARS, Math.floor((total * ARM_SHARE) / arms)),
    );

    const state: State = {
      bars,
      half: r.play.barHalfWidth,
      viewportWidth: r.viewportWidth,
      m: { x: 0, y: 0 },
      startSep: r.viewportWidth * START_SEP,
      disk,
      orbits,
      target: new Int16Array(total),
      release: new Float32Array(total),
      land: new Float32Array(total),
      relX: new Float32Array(total),
      relY: new Float32Array(total),
      dirX: new Float32Array(total),
      dirY: new Float32Array(total),
      armBar: Int16Array.from(armBars),
      armLand: new Float32Array(arms),
      armLead: new Int16Array(arms),
      armAt: [],
      ownLead: 0,
      ownLand: 0,
      ownAt: () => null,
      coreAt: [],
      kickMs: new Float32Array(0),
      kick: new Float32Array(0),
    };

    // tear each arm off its disk: peeling outward along the core's swing
    const next = [0, STARS];
    const core: Point = { x: 0, y: 0 };
    const before: Point = { x: 0, y: 0 };
    let inPass = 0;
    for (let a = 0; a < arms; a++) {
      const k = armPass[a];
      inPass = a > 0 && armPass[a - 1] === k ? inPass + 1 : 0;
      const d = a % 2;
      const pass = PASSES[k] + inPass * ARM_STAGGER;
      const landMs = pass + ARM_LAND;
      state.armLand[a] = landMs;
      state.armLead[a] = next[d];
      if (armBars[a] >= 0) hit(armBars[a], landMs, 1);
      for (let q = 0; q < perArm && next[d] < (d + 1) * STARS; q++) {
        const i = next[d]++;
        const rel = pass - ARM_LEAD + (ARM_PEEL * q) / perArm;
        state.target[i] = armBars[a];
        state.release[i] = rel;
        state.land[i] = landMs;
        coreOffset(state, d, rel, core);
        coreOffset(state, d, rel - 8, before);
        DISKS[d].at(orbits[i], rel, star, growAt(rel));
        state.relX[i] = core.x + star.x;
        state.relY[i] = core.y + star.y;
        const sl = Math.hypot(star.x, star.y) || 1;
        const vx = core.x - before.x;
        const vy = core.y - before.y;
        const vl = Math.hypot(vx, vy) || 1;
        const dx = star.x / sl + (0.8 * vx) / vl;
        const dy = star.y / sl + (0.8 * vy) / vl;
        const dl = Math.hypot(dx, dy) || 1;
        state.dirX[i] = dx / dl;
        state.dirY[i] = dy / dl;
      }
    }

    // the rest flung off the merged disk onto its own readout
    const ownLand = MERGE_MS + FLING_DELAY + FLING_SPREAD + FLING_FLY;
    let lead = -1;
    for (let d = 0; d < 2; d++) {
      for (let i = next[d]; i < (d + 1) * STARS; i++) {
        const rel =
          MERGE_MS + FLING_DELAY + FLING_SPREAD * holeHash(i, 7301) ** PACE;
        state.target[i] = 0;
        state.release[i] = rel;
        state.land[i] = ownLand;
        DISKS[d].at(orbits[i], rel, star, growAt(rel));
        state.relX[i] = star.x;
        state.relY[i] = star.y;
        const heading = DISKS[d].heading(orbits[i], rel);
        state.dirX[i] = Math.cos(heading);
        state.dirY[i] = Math.sin(heading);
        if (lead < 0 || rel < state.release[lead]) lead = i;
      }
    }
    state.ownLead = lead;
    state.ownLand = ownLand;
    hit(0, ownLand, 2);

    // the wisps: the arms' and the last burst's leads, and the two cores
    for (let a = 0; a < arms; a++) {
      const into: Point = { x: 0, y: 0 };
      const i = state.armLead[a];
      state.armAt.push((ms) => flightAt(state, i, ms, into));
    }
    const ownInto: Point = { x: 0, y: 0 };
    state.ownAt = (ms) =>
      lead < 0 ? null : flightAt(state, lead, ms, ownInto);
    for (let d = 0; d < 2; d++) {
      const into: Point = { x: 0, y: 0 };
      state.coreAt.push((ms) => {
        coreOffset(state, d, ms, into);
        into.x += state.m.x;
        into.y += state.m.y;
        return into;
      });
    }

    // the rumble closing up, a jolt at each pass, the collision's
    const kicks: [number, number][] = [];
    for (let k = IN_MS + 80; k < MERGE_MS; ) {
      const p = (k - IN_MS) / (MERGE_MS - IN_MS);
      kicks.push([k, lerp(RUMBLE[0], RUMBLE[1], p)]);
      k += lerp(RUMBLE_GAP_MS[0], RUMBLE_GAP_MS[1], p);
    }
    for (let k = 0; k < PASSES.length; k++)
      kicks.push([PASSES[k], PASS_SHAKES[k]]);
    kicks.push([MERGE_MS, MERGE_SHAKE]);
    kicks.sort((a, b) => a[0] - b[0]);
    state.kickMs = Float32Array.from(kicks, (k) => k[0]);
    state.kick = Float32Array.from(kicks, (k) => k[1]);
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const s = states.get(r);
    if (!s || bars.length === 0) return;
    s.bars = bars;
    s.viewportWidth = r.viewportWidth;
    placeMerge(s);
    const now = r.startedAt + ms;
    while (r.kicked < s.kickMs.length && ms >= s.kickMs[r.kicked]) {
      r.shake(s.kick[r.kicked]);
      r.kicked++;
    }
    if (ms < IN_MS + GROW_MS) {
      const p = clamp01(ms / (IN_MS + GROW_MS));
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont * lerp(1, 0.4, p), {
        alpha: 1 - p,
      });
    }
    if (ms < IN_MS) return;

    // the cores charging, trembling harder as they close
    const charge = clamp01((ms - IN_MS) / (MERGE_MS - IN_MS));
    const c2 = charge * charge;
    coreOffset(s, 0, ms, coreA);
    coreOffset(s, 1, ms, coreB);
    if (ms < MERGE_MS) {
      const shiverX = Math.sin(ms * 0.13) * CORE_TREMBLE * c2;
      const shiverY = Math.cos(ms * 0.17) * CORE_TREMBLE * 0.5 * c2;
      glow.x = s.m.x + coreA.x + shiverX;
      glow.y = s.m.y + coreA.y + shiverY;
      drawChargeGlow(ctx, glow, 0.25 + 0.75 * c2, CORE_GLOW, now);
      glow.x = s.m.x + coreB.x - shiverX;
      glow.y = s.m.y + coreB.y - shiverY;
      drawChargeGlow(ctx, glow, 0.25 + 0.75 * c2, CORE_GLOW, now);
    }

    // the stars: on their disks round the cores, or flung
    const g = growAt(ms);
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    const { orbits, disk, release, land } = s;
    for (let i = 0; i < orbits.length; i++) {
      if (ms > land[i]) continue;
      let x: number;
      let y: number;
      let size = STAR;
      if (ms < release[i]) {
        const d = disk[i];
        const c = d === 0 ? coreA : coreB;
        DISKS[d].at(orbits[i], ms, star, g);
        x = s.m.x + c.x + star.x;
        y = s.m.y + c.y + star.y;
      } else {
        if (!flightAt(s, i, ms, spot)) continue;
        x = spot.x;
        y = spot.y;
        size = STAR * 1.25;
      }
      stampGlimmer(
        ctx,
        x,
        y,
        size,
        i,
        i % 2 ? COLOR.heavenlyGold : COLOR.white,
      );
    }
    // a flash on each readout as its arm lands
    for (let a = 0; a < s.armBar.length; a++) {
      const b = s.armBar[a];
      const since = ms - s.armLand[a];
      if (b < 0 || b >= bars.length || since < 0 || since >= HIT_FLASH_MS)
        continue;
      const x = bars[b].x + s.half * READOUT;
      const y = bars[b].y + CONTACT_Y;
      const p = 1 - since / HIT_FLASH_MS;
      stampGlimmer(ctx, x, y, HIT_FLASH * p, a + 400, COLOR.white);
      stampGlimmer(ctx, x, y, HIT_FLASH * 1.4 * p, a + 450, COLOR.heavenlyGold);
    }
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;

    // the cores, the arms' leads and the last burst's
    drawWispBetween(ctx, s.coreAt[0], ms, now, CORE_WISP, c2, IN_MS, MERGE_MS);
    drawWispBetween(ctx, s.coreAt[1], ms, now, CORE_WISP, c2, IN_MS, MERGE_MS);
    for (let a = 0; a < s.armBar.length; a++) {
      if (s.armBar[a] < 0) continue;
      const i = s.armLead[a];
      drawWispBetween(
        ctx,
        s.armAt[a],
        ms,
        now,
        ARM_WISP,
        1,
        release[i],
        land[i],
      );
    }
    if (s.ownLead >= 0)
      drawWispBetween(
        ctx,
        s.ownAt,
        ms,
        now,
        OWN_WISP,
        1,
        release[s.ownLead],
        s.ownLand,
      );

    // the collision: one flash, the merged disk flaring, the blast
    const since = ms - MERGE_MS;
    if (since >= 0 && since < FLARE_MS) {
      const p = since / FLARE_MS;
      const alpha = ctx.globalAlpha;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = alpha * (1 - p) * (1 - p);
      drawGlow(ctx, FLARE_STOPS, s.m.x, s.m.y, FLARE * (0.6 + 0.8 * p));
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = previous;
    }
    drawDetonation(ctx, s.m, since, MERGE_BLAST, now);
    spot.x = bars[0].x + s.half * READOUT;
    spot.y = bars[0].y + CONTACT_Y;
    drawDetonation(ctx, spot, ms - s.ownLand, OWN_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
