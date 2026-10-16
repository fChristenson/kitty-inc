// Milky Way, a button crit: a two-armed spiral galaxy, tilted near upright,
// spins up just left of the button column round a blazing core, spinning
// ever faster; as its arms sweep past the buttons a knot of stars clumps on
// an arm and is slung off along its orbit onto the next button, top to
// bottom, each a flash and a jolt, quicker each; then the core trembles and
// flares, and the whole galaxy is flung off along its heading onto its own
// button in the big blast. Each of their next taps also pays out the next
// floor round the building in turn
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import type { Floor } from "../../../../gameState";
import { snapshotMap } from "../../../../shared/snapshotState";
import {
  planDisk,
  scatterArms,
  type Disk,
  type Orbit,
} from "../../../../shared/animationStyles/galaxy";
import {
  chargeAt,
  planCharge,
  tickCharge,
  trembleAt,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playSpinTick, playSwoosh } from "../../../../sound";
import { COLOR } from "../../../../palette";
import { BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  byHeight,
  clamp01,
  drawText,
  lerp,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

const POP_MS = 90;
// the disk grows out of its core over SPREAD_MS, spinning up from SPIN[0]
// to SPIN[1] times its own pace by the climax
const SPREAD_MS = 220;
const SPIN: [number, number] = [0.4, 1.9];
const STARS = 260;
const ARMS = 2;
const TWIST = 0.8;
const ARM_SPREAD = 0.28;
const INNER = 34;
const OUTER: [number, number] = [230, 400];
const SQUASH = 0.4;
const TILT = 1.15;
const RIM_HZ = 0.7;
// its rim pokes this share of its half-width past the buttons' left ends
const REACH = 0.88;
// a knot of up to CLUMP stars gathers onto an outer-arm star over GATHER_MS,
// then streams off over STREAM_MS, each flying FLY_MS; the first at FIRST_MS,
// the gaps quickening
const CLUMP = 16;
const ARM_MIN = 0.45;
const CLUMP_R = 26;
const CLUMP_W = 34;
const GATHER_MS = 200;
const STREAM_MS = 50;
const FLY_MS = 200;
const FIRST_MS = 440;
const GAP_MS: [number, number] = [170, 80];
// slung along its heading this far before curving onto its button
const SLING = 230;
const JITTER = 70;
// the core flares over CHARGE_MS, the climax at least MIN_CLIMAX_MS in and
// CLIMAX_GAP_MS after the last knot lands; then everything left is flung
// over FLING_STREAM_MS, each flying FLING_MS
const CHARGE_MS = 480;
const MIN_CLIMAX_MS = 900;
const CLIMAX_GAP_MS = 60;
const FLING_STREAM_MS = 80;
const FLING_MS = 230;
const TREMBLE = 10;
// sizes: a star, one clumping, one flying, the core glow and wisp
const STAR = 20;
const CLUMPED = 30;
const FLUNG = 30;
const CORE_GLOW = 70;
const CORE = WISP_SIZE * 1.7;
const KNOT_GLOW = 46;
const TWINKLE = 0.012;
// cheap flashes on a button's end, FLASH_MS long
const LAND_FLASH = 110;
const FLASH_MS = 220;
// the core's flare, and the blast on its own
const CORE_BLAST = 220;
const OWN_BLAST = 380;
// shakes by step: the pop, a knot landing, its own
const SHAKES = [0.6, 1.1, 2.6];
const FLASH_GOLD = fadeStops(COLOR.heavenlyGold);
const FLASH_CORE = fadeStops(COLOR.white, 0.3);

interface State {
  bars: Point[];
  disk: Disk;
  // the disk's centre (live, the disk reads it), off the own button by off*
  centre: Point;
  offX: number;
  offY: number;
  stars: Orbit[];
  // each star's knot (-1 for none), the orbit it clumps onto, when it starts
  // clumping and leaves, its spot then and its sling's pull (off the
  // centre), and its landing jitter
  knot: Int16Array;
  tgt: Orbit[];
  gather: Float32Array;
  leave: Float32Array;
  fromX: Float32Array;
  fromY: Float32Array;
  pullX: Float32Array;
  pullY: Float32Array;
  jx: Float32Array;
  jy: Float32Array;
  leader: Uint8Array;
  // the other buttons top to bottom, each knot's release and landing
  others: Int16Array;
  releaseAt: Float32Array;
  landAt: Float32Array;
  played: number;
  climaxMs: number;
  ownLandMs: number;
  whooshed: boolean;
  charge: Charge;
  core: (ms: number) => Point;
  // each button's left end, live
  ends: Point[];
}

const states = new WeakMap<Running, State>();
const star: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };
const ZERO: Point = { x: 0, y: 0 };

// how far round the building each button's Star taps have got
const orbited = snapshotMap<Floor, number>();

// each tap also paying out the next open floor round the building, one
// further each tap, wrapping from the top back to the bottom
const starTaps = defineTapPerk("Star", (t, left) => {
  const n = t.floors.length;
  const k = Math.max(0, t.floors.indexOf(t.floor));
  let step = orbited.get(t.floor) ?? 0;
  let landed: Floor = t.floor;
  for (let tries = 1; tries < n; tries++) {
    step = (step % (n - 1)) + 1;
    const floor = t.floors[(k + step) % n];
    if (floor.unlocked) {
      landed = floor;
      break;
    }
  }
  t.payout(landed, 1);
  if (left > 0) orbited.set(t.floor, step);
  else orbited.delete(t.floor);
});

// the disk's own time at ms: spinning up from SPIN[0] to SPIN[1] by the
// climax, then holding
function warpAt(climaxMs: number, ms: number): number {
  const c = Math.max(1, climaxMs);
  if (ms <= c) return ms * (SPIN[0] + ((SPIN[1] - SPIN[0]) / 2) * (ms / c));
  return c * ((SPIN[0] + SPIN[1]) / 2) + SPIN[1] * (ms - c);
}

// a quick flash on a button's end: a gold bloom with a white core
function flash(
  ctx: CanvasRenderingContext2D,
  at: Point,
  ms: number,
  size: number,
  base: number,
): void {
  if (ms < 0 || ms >= FLASH_MS) return;
  const u = ms / FLASH_MS;
  ctx.globalAlpha = base * (1 - u);
  drawGlow(ctx, FLASH_GOLD, at.x, at.y, size * (0.6 + 0.8 * u));
  drawGlow(ctx, FLASH_CORE, at.x, at.y, size * 0.5 * (1 - u));
}

registerFloorCrit("milkyWayCrit", {
  reward(t) {
    starTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const own = bars[0] ?? ZERO;
    let top = own.y;
    let bottom = own.y;
    for (let b = 0; b < bars.length; b++) {
      top = Math.min(top, bars[b].y);
      bottom = Math.max(bottom, bars[b].y);
    }
    const order = byHeight(bars);
    const list: number[] = [];
    for (let k = 0; k < order.length; k++)
      if (order[k] !== 0) list.push(order[k]);
    const n = list.length;
    const releaseAt = new Float32Array(n);
    const landAt = new Float32Array(n);
    let at = FIRST_MS;
    for (let k = 0; k < n; k++) {
      releaseAt[k] = at;
      landAt[k] = at + STREAM_MS * 0.5 + FLY_MS;
      at += lerp(GAP_MS[0], GAP_MS[1], k / Math.max(1, n - 2));
    }
    const climaxMs = Math.max(
      MIN_CLIMAX_MS,
      n > 0 ? releaseAt[n - 1] + STREAM_MS + FLY_MS + CLIMAX_GAP_MS : 0,
    );
    const ownLandMs = climaxMs + FLING_MS;
    // tilted near upright along the column, its rim just past the buttons
    const outer = Math.min(
      OUTER[1],
      Math.max(OUTER[0], (bottom - top) * 0.6 + 90),
    );
    const half = outer * Math.hypot(Math.cos(TILT), SQUASH * Math.sin(TILT));
    const centre: Point = {
      x: own.x - BTN_W / 2 - half * REACH,
      y: (top + bottom) / 2,
    };
    const disk = planDisk(centre, {
      inner: INNER,
      outer,
      squash: SQUASH,
      tilt: TILT,
      rimHz: RIM_HZ,
    });
    const stars = scatterArms(disk, STARS, ARMS, TWIST, ARM_SPREAD);
    const knot = new Int16Array(STARS).fill(-1);
    const tgt: Orbit[] = stars.slice();
    const gather = new Float32Array(STARS).fill(Infinity);
    const leave = new Float32Array(STARS);
    const leader = new Uint8Array(STARS);
    for (let i = 0; i < STARS; i++)
      leave[i] = climaxMs + holeHash(i, 7311) * FLING_STREAM_MS;
    // each knot: the outer-arm star nearest its button as it starts to
    // gather, and the stars nearest that one
    const size =
      n > 0 ? Math.max(4, Math.min(CLUMP, Math.floor((STARS * 0.6) / n))) : 0;
    const px = new Float32Array(STARS);
    const py = new Float32Array(STARS);
    for (let k = 0; k < n; k++) {
      const g = releaseAt[k] - GATHER_MS;
      const w = warpAt(climaxMs, g);
      for (let i = 0; i < STARS; i++) {
        disk.at(stars[i], w, star);
        px[i] = star.x;
        py[i] = star.y;
      }
      const end = bars[list[k]];
      const ex = end.x - BTN_W / 2;
      let lead = -1;
      let best = Infinity;
      for (let pass = 0; pass < 2 && lead < 0; pass++)
        for (let i = 0; i < STARS; i++) {
          if (knot[i] >= 0) continue;
          if (pass === 0 && stars[i].radius < outer * ARM_MIN) continue;
          const d = (px[i] - ex) ** 2 + (py[i] - end.y) ** 2;
          if (d < best) {
            best = d;
            lead = i;
          }
        }
      if (lead < 0) break;
      const head = stars[lead];
      const join = (i: number, m: number) => {
        knot[i] = k;
        gather[i] = g;
        leave[i] = releaseAt[k] + holeHash(i, 7312) * STREAM_MS;
        if (m === 0) return;
        tgt[i] = {
          radius: Math.max(
            INNER,
            head.radius + (holeHash(i, 7313) - 0.5) * CLUMP_R,
          ),
          phase:
            head.phase +
            ((holeHash(i, 7314) - 0.5) * CLUMP_W) / Math.max(1, head.radius),
        };
      };
      join(lead, 0);
      leader[lead] = 1;
      for (let m = 1; m < size; m++) {
        let pick = -1;
        let near = Infinity;
        for (let i = 0; i < STARS; i++) {
          if (knot[i] >= 0) continue;
          const d = (px[i] - px[lead]) ** 2 + (py[i] - py[lead]) ** 2;
          if (d < near) {
            near = d;
            pick = i;
          }
        }
        if (pick < 0) break;
        join(pick, m);
      }
    }
    // where each leaves from, and the pull along its heading
    const fromX = new Float32Array(STARS);
    const fromY = new Float32Array(STARS);
    const pullX = new Float32Array(STARS);
    const pullY = new Float32Array(STARS);
    const jx = new Float32Array(STARS);
    const jy = new Float32Array(STARS);
    for (let i = 0; i < STARS; i++) {
      const w = warpAt(climaxMs, leave[i]);
      disk.at(tgt[i], w, star);
      const heading = disk.heading(tgt[i], w);
      fromX[i] = star.x - centre.x;
      fromY[i] = star.y - centre.y;
      pullX[i] = fromX[i] + Math.cos(heading) * SLING;
      pullY[i] = fromY[i] + Math.sin(heading) * SLING;
      jx[i] = (holeHash(i, 7315) - 0.5) * JITTER * 0.6;
      jy[i] = (holeHash(i, 7316) - 0.5) * JITTER * 0.4;
    }
    hit(0, POP_MS, 0);
    for (let k = 0; k < n; k++) hit(list[k], landAt[k], 1);
    hit(0, ownLandMs, 2);
    const ends: Point[] = [];
    for (let b = 0; b < bars.length; b++) ends.push({ x: 0, y: 0 });
    const spot: Point = { x: 0, y: 0 };
    const state: State = {
      bars,
      disk,
      centre,
      offX: centre.x - own.x,
      offY: centre.y - own.y,
      stars,
      knot,
      tgt,
      gather,
      leave,
      fromX,
      fromY,
      pullX,
      pullY,
      jx,
      jy,
      leader,
      others: Int16Array.from(list),
      releaseAt,
      landAt,
      played: 0,
      climaxMs,
      ownLandMs,
      whooshed: false,
      charge: planCharge(climaxMs - CHARGE_MS, CHARGE_MS, {
        climaxShake: 1.8,
        bang: false,
      }),
      // the core flung straight onto its own button, faster and faster
      core: (ms) => {
        const u = clamp01((ms - climaxMs) / FLING_MS);
        const p = u * (0.35 + 0.65 * u);
        const to = state.ends[0] ?? state.centre;
        spot.x = lerp(state.centre.x, to.x, p);
        spot.y = lerp(state.centre.y, to.y, p);
        return spot;
      },
      ends,
    };
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state || bars.length === 0) return;
    state.bars = bars;
    const now = r.startedAt + ms;
    const { disk, centre, stars, knot, tgt, gather, leave, ends } = state;
    const { fromX, fromY, pullX, pullY, jx, jy, leader } = state;
    const { others, releaseAt, landAt, climaxMs, ownLandMs, charge } = state;
    const nEnds = Math.min(bars.length, ends.length);
    for (let b = 0; b < nEnds; b++) {
      ends[b].x = bars[b].x - BTN_W / 2;
      ends[b].y = bars[b].y;
    }
    if (ms < POP_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 + 0.5 * (ms / POP_MS)),
        { alpha: 1 - ms / POP_MS },
      );
    // a tick as each knot is slung, rising
    while (state.played < others.length && ms >= releaseAt[state.played])
      playSpinTick(1 + 0.15 * state.played++);
    if (!state.whooshed && ms >= climaxMs) {
      state.whooshed = true;
      playSwoosh();
    }
    tickCharge(charge, ms, r.shake);
    const c = ms < climaxMs ? chargeAt(charge, ms) : 0;
    trembleAt(c, ms, TREMBLE, shiver);
    centre.x = bars[0].x + state.offX + shiver.x;
    centre.y = bars[0].y + state.offY + shiver.y;
    const grow = 1 - (1 - clamp01((ms - POP_MS) / SPREAD_MS)) ** 3;
    const w = warpAt(climaxMs, ms);
    const base = ctx.globalAlpha;
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    // the core: glowing as it spins up, swelling and flickering as it flares
    if (ms >= POP_MS && ms < climaxMs) {
      const flicker = 1 + 0.12 * c * Math.sin(ms * 0.09);
      const glow = CORE_GLOW * grow * (1 + 1.8 * c) * flicker;
      ctx.globalAlpha = base * (0.7 + 0.3 * c);
      drawGlow(ctx, FLASH_GOLD, centre.x, centre.y, glow * 1.6, 0.7);
      drawGlow(ctx, FLASH_CORE, centre.x, centre.y, glow * 0.6);
      ctx.globalAlpha = base;
    }
    if (ms >= POP_MS && ms < climaxMs + FLING_STREAM_MS + FLING_MS)
      for (let i = 0; i < STARS; i++) {
        const left = leave[i];
        let size = STAR;
        if (ms >= left) {
          const k = knot[i];
          const fly = k >= 0 ? FLY_MS : FLING_MS;
          const u = (ms - left) / fly;
          if (u >= 1) continue;
          // off along its heading, then curving onto its button
          const to = ends[k >= 0 ? others[k] : 0] ?? centre;
          const p = u * (0.45 + 0.55 * u);
          const q = 1 - p;
          const fx = centre.x + fromX[i];
          const fy = centre.y + fromY[i];
          const sx = centre.x + pullX[i];
          const sy = centre.y + pullY[i];
          star.x = q * q * fx + 2 * q * p * sx + p * p * (to.x + jx[i]);
          star.y = q * q * fy + 2 * q * p * sy + p * p * (to.y + jy[i]);
          size = FLUNG;
        } else if (ms >= gather[i]) {
          // drawn in onto its knot's star, swelling as it packs
          const u = clamp01((ms - gather[i]) / GATHER_MS) ** 2;
          disk.drift(stars[i], tgt[i], u, w, star, grow);
          size = lerp(STAR, CLUMPED, u);
          if (leader[i]) {
            ctx.globalAlpha = base * u;
            drawGlow(ctx, FLASH_GOLD, star.x, star.y, KNOT_GLOW * (0.5 + u));
            ctx.globalAlpha = base;
          }
        } else disk.at(stars[i], w, star, grow);
        stampGlimmer(
          ctx,
          star.x,
          star.y,
          size,
          i + ms * TWINKLE,
          i % 5 === 0
            ? COLOR.pairBlue
            : i % 2
              ? COLOR.heavenlyGold
              : COLOR.white,
        );
      }
    // each knot landing in a flash
    for (let k = 0; k < others.length; k++) {
      const end = ends[others[k]];
      if (end) flash(ctx, end, ms - landAt[k], LAND_FLASH, base);
    }
    ctx.globalAlpha = base;
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    drawWispBetween(ctx, state.core, ms, now, CORE, 1, climaxMs, ownLandMs);
    // the core's flare, then its own blast
    drawDetonation(ctx, centre, ms - climaxMs, CORE_BLAST, now);
    drawDetonation(ctx, ends[0], ms - ownLandMs, OWN_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
