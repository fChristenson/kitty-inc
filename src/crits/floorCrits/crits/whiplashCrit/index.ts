// Whiplash, a floor crit: the number is sucked up into a dark-gold storm
// cloud of glitter gathering above the building, and a long thin rope funnel
// drops out of it; its tip whips down and lashes across the bars in view one
// after another, snaking side to side, ripping the glitter off each bar and
// spinning it up the rope (a flash and levels on each), the lashes
// quickening as the funnel thickens and spins up; then the whole funnel slams
// down onto its own bar, whips round flat out, rumbling, and flings
// everything back down onto it in the big blast
import {
  drawTornado,
  flingFrom,
  liftAt,
  planTornado,
  type Tornado,
} from "../../../../shared/animationStyles/tornado";
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
import { quicken, quickenAt } from "../../../../shared/easing";
import { playSpinTick, playSwoosh } from "../../../../sound";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  byHeight,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../critPlayer";
import { BAR_HALF_H, holeHash, skyY } from "../../critPlayer/shared";

const IN_MS = 140;
// the cloud: CLOUD specks churning in a CLOUD_W x CLOUD_H oval ABOVE px over
// the top bar, pulled in over GATHER_MS
const ABOVE = 300;
const CLOUD = 40;
const CLOUD_W = 270;
const CLOUD_H = 70;
const CLOUD_SPECK = 26;
const GATHER_MS = 320;
// the rope drops from DROP_START over DROP_MS, lashes for LASH_MS along each
// bar END in from its ends (arcing ARC px up mid-lash), slams onto its own
// bar over SLAM_MS, whips round for WHIP_MS, flings for FLING_MS
const DROP_START = 200;
const DROP_MS = 160;
const LASH_START = DROP_START + DROP_MS;
const LASH_MS = 880;
const LASH_END = LASH_START + LASH_MS;
const SLAM_MS = 110;
const SLAM_END = LASH_END + SLAM_MS;
const WHIP_MS = 300;
const FLING_START = SLAM_END + WHIP_MS;
const FLING_MS = 200;
const LAND_MS = FLING_START + FLING_MS;
const COLLAPSE_MS = 260;
const END = 0.85;
const ARC = 34;
// the funnel: a thin rope thickening as it lashes, spinning up to a blur
const FOOT: [number, number] = [10, 34];
const TOP: [number, number] = [50, 170];
const SPIN_HZ: [number, number] = [1, 7];
const SWAY = 20;
const TREMBLE = 16;
// CATCH specks ripped off each bar it lashes, popping off over TEAR_MS
const CATCH = 12;
const TEAR_MS = 80;
const SPECK = 20;
// cheap flashes: a lash, the slam; FLASH_MS long
const LASH_FLASH = 110;
const SLAM_FLASH = 170;
const FLASH_MS = 220;
const OWN_BLAST = 420;
// shakes by step: a lash, the landing on its own; and the slam's
const SHAKES = [0.7, 1, 3];
const SLAM_SHAKE = 1.4;
const FLASH_GOLD = fadeStops(COLOR.heavenlyGold);
const FLASH_CORE = fadeStops(COLOR.white, 0.3);
const CLOUD_DARK = fadeStops(COLOR.chairGiveawayBrown);

interface State {
  bars: Point[];
  tornado: Tornado;
  charge: Charge;
  // the cloud's middle, live
  cx: number;
  cy: number;
  // the tip's path: each point's bar and offset along it, and the distance
  // along the path to it
  pathBar: Int16Array;
  pathX: Float32Array;
  along: Float32Array;
  length: number;
  // the bars lashed, when each is, and how many have played
  lashed: Int16Array;
  lashMs: Float32Array;
  played: number;
  dropped: boolean;
  slammed: boolean;
  // each speck: its bar and spot on it, when it's caught, its seed, and its
  // spot on its own bar
  bar: Int16Array;
  ox: Float32Array;
  oy: Float32Array;
  caughtMs: Float32Array;
  seed: Float32Array;
  hx: Float32Array;
  hy: Float32Array;
}
const states = new WeakMap<Running, State>();
const spot: Point = { x: 0, y: 0 };
const home: Point = { x: 0, y: 0 };
const pa: Point = { x: 0, y: 0 };
const pb: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };
const feet: Point = { x: 0, y: 0 };

function pathPoint(state: State, k: number, into: Point): Point {
  const bar = state.bars[state.pathBar[k]];
  into.x = bar.x + state.pathX[k];
  into.y = bar.y;
  return into;
}

// where the tip hangs at ms: dropping out of the cloud, lashing along the
// bars, slamming onto its own, trembling there
function tipAt(state: State, ms: number, into: Point): Point {
  const own = state.bars[0];
  if (ms < LASH_START) {
    const u = clamp01((ms - DROP_START) / DROP_MS);
    pathPoint(state, 0, pa);
    into.x = lerp(state.cx, pa.x, u * u);
    into.y = lerp(state.cy, pa.y, u * u);
    return into;
  }
  if (ms < LASH_END) {
    const { along, length } = state;
    const s = length * quicken((ms - LASH_START) / LASH_MS);
    const last = along.length - 1;
    let k = 0;
    while (k < last - 1 && along[k + 1] < s) k++;
    pathPoint(state, k, pa);
    pathPoint(state, k + 1, pb);
    const f = clamp01((s - along[k]) / (along[k + 1] - along[k] || 1));
    into.x = lerp(pa.x, pb.x, f);
    // arcing up between its ends as it lashes along a bar
    into.y = lerp(pa.y, pb.y, f) - (k % 2 ? 0 : ARC * Math.sin(f * Math.PI));
    return into;
  }
  if (ms < SLAM_END) {
    pathPoint(state, state.pathBar.length - 1, pa);
    const u = ((ms - LASH_END) / SLAM_MS) ** 2;
    into.x = lerp(pa.x, own.x, u);
    into.y = lerp(pa.y, own.y, u);
    return into;
  }
  trembleAt(chargeAt(state.charge, ms), ms, TREMBLE, shiver);
  into.x = own.x + shiver.x;
  into.y = own.y + shiver.y;
  return into;
}

// a quick flash: a gold bloom with a white core
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

registerFloorCrit("whiplashCrit", {
  plan(r, bars, hit) {
    const order = byHeight(bars).filter((b) => b !== 0);
    if (!order.length) order.push(0);
    const half = r.play.barHalfWidth * END;
    const n = order.length;
    const pathBar = new Int16Array(n * 2);
    const pathX = new Float32Array(n * 2);
    const along = new Float32Array(n * 2);
    for (let k = 0; k < n; k++) {
      const dir = k % 2 ? -1 : 1;
      pathBar[k * 2] = pathBar[k * 2 + 1] = order[k];
      pathX[k * 2] = -dir * half;
      pathX[k * 2 + 1] = dir * half;
    }
    for (let k = 1; k < n * 2; k++) {
      const a = bars[pathBar[k - 1]];
      const b = bars[pathBar[k]];
      along[k] =
        along[k - 1] +
        Math.hypot(b.x + pathX[k] - a.x - pathX[k - 1], b.y - a.y);
    }
    const length = along[n * 2 - 1] || 1;
    const msAt = (s: number) => LASH_START + LASH_MS * quickenAt(s / length);
    const lashed = Int16Array.from(order);
    const lashMs = new Float32Array(n);
    const total = n * CATCH;
    const bar = new Int16Array(total);
    const ox = new Float32Array(total);
    const oy = new Float32Array(total);
    const caughtMs = new Float32Array(total);
    const seed = new Float32Array(total);
    const hx = new Float32Array(total);
    const hy = new Float32Array(total);
    for (let k = 0; k < n; k++) {
      const s = along[k * 2];
      lashMs[k] = msAt(s + half);
      hit(order[k], lashMs[k], 0);
      for (let i = 0; i < CATCH; i++) {
        const m = k * CATCH + i;
        const v = (i + 0.5) / CATCH;
        bar[m] = order[k];
        ox[m] = lerp(pathX[k * 2], pathX[k * 2 + 1], v);
        oy[m] = (holeHash(m, 5810) * 2 - 1) * BAR_HALF_H * 0.5;
        caughtMs[m] = msAt(s + v * 2 * half);
        seed[m] = holeHash(m, 5811);
        hx[m] = (holeHash(m, 5812) * 2 - 1) * half * 0.8;
        hy[m] = (holeHash(m, 5813) * 2 - 1) * BAR_HALF_H * 0.6;
      }
    }
    hit(0, LAND_MS, 2);
    const state: State = {
      bars,
      tornado: planTornado((ms, into) => tipAt(state, ms, into), {
        startMs: DROP_START,
        endMs: FLING_START,
        height: ABOVE,
        foot: FOOT[0],
        top: TOP[0],
        spinHz: SPIN_HZ,
        sway: SWAY,
        growMs: 60,
      }),
      charge: planCharge(SLAM_END - 60, WHIP_MS + 60, {
        climaxShake: 1.6,
        bang: false,
      }),
      cx: bars[0].x,
      cy: skyY(r, bars, ABOVE),
      pathBar,
      pathX,
      along,
      length,
      lashed,
      lashMs,
      played: 0,
      dropped: false,
      slammed: false,
      bar,
      ox,
      oy,
      caughtMs,
      seed,
      hx,
      hy,
    };
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    state.bars = bars;
    const now = r.startedAt + ms;
    const { tornado, charge, lashed, lashMs } = state;
    const cx = (state.cx = bars[0].x);
    const cy = (state.cy = skyY(r, bars, ABOVE));
    if (!state.dropped && ms >= DROP_START) {
      state.dropped = true;
      playSwoosh();
    }
    while (state.played < lashMs.length && ms >= lashMs[state.played])
      playSpinTick(1 + 0.15 * state.played++);
    if (!state.slammed && ms >= SLAM_END) {
      state.slammed = true;
      r.shake(SLAM_SHAKE);
      playSwoosh();
    }
    tickCharge(charge, ms, r.shake);
    // the number sucked up into the cloud
    if (ms < IN_MS) {
      const p = ms / IN_MS;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        cy * p * p,
        r.flashFont * (1 - 0.8 * p),
        {
          alpha: 1 - p,
        },
      );
    }
    // the funnel thickening as it lashes, swelling as it whips round
    const tMs = Math.min(ms, FLING_START);
    const thick = clamp01((tMs - LASH_START) / (SLAM_END - LASH_START)) ** 1.5;
    const c = chargeAt(charge, tMs);
    tornado.foot = lerp(FOOT[0], FOOT[1], thick);
    tornado.top = lerp(TOP[0], TOP[1], Math.max(thick * 0.75, c));
    tornado.at(tMs, feet);
    const fy = feet.y;
    tornado.height = Math.max(40, fy - cy - CLOUD_H * 0.3);
    // sheared so its top stays in the cloud as its tip lashes about
    const lean = (cx - feet.x) / tornado.height;
    const fade = 1 - clamp01((ms - FLING_START) / COLLAPSE_MS);
    const base = ctx.globalAlpha;
    // the cloud's dark body
    const gather = clamp01(ms / GATHER_MS);
    const cloudAlpha = gather * (1 - clamp01((ms - FLING_START) / 320));
    if (cloudAlpha > 0) {
      ctx.globalAlpha = base * cloudAlpha * 0.55;
      for (let k = -1; k <= 1; k++)
        drawGlow(
          ctx,
          CLOUD_DARK,
          cx + k * CLOUD_W * 0.55,
          cy,
          CLOUD_H * (k ? 1.6 : 2.1),
        );
      ctx.globalAlpha = base;
    }
    if (fade > 0 && ms >= DROP_START) {
      ctx.save();
      ctx.transform(1, 0, -lean, 1, lean * fy, 0);
      drawTornado(ctx, tornado, tMs, fade);
      ctx.restore();
    }
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    // the cloud's glitter churning, pulled in, flaring on each lash
    if (cloudAlpha > 0) {
      const last = state.played - 1;
      const pulse = last >= 0 ? Math.max(0, 1 - (ms - lashMs[last]) / 140) : 0;
      const pull = 1 + 3 * (1 - gather) ** 2;
      const churn = ms * 0.003 * (1 + 2 * thick);
      for (let i = 0; i < CLOUD; i++) {
        const a =
          holeHash(i, 5814) * Math.PI * 2 + churn * (0.6 + holeHash(i, 5815));
        const rr = (0.35 + 0.65 * holeHash(i, 5816)) * pull;
        ctx.globalAlpha = base * cloudAlpha * (0.55 + 0.45 * pulse);
        stampGlimmer(
          ctx,
          cx + Math.cos(a) * CLOUD_W * rr,
          cy + Math.sin(a) * CLOUD_H * rr,
          CLOUD_SPECK * (0.7 + 0.5 * pulse),
          i + 300,
          i % 4 ? COLOR.goldStandardAmber : COLOR.heavenlyGold,
        );
      }
      ctx.globalAlpha = base;
    }
    // the glitter: ripped off its bar, spun up the rope, flung onto its own
    const { bar, ox, oy, caughtMs, seed, hx, hy } = state;
    const own = bars[0];
    for (let i = 0; i < bar.length; i++) {
      const caught = caughtMs[i];
      const tear = caught - TEAR_MS;
      if (ms < tear || ms >= LAND_MS) continue;
      if (ms >= FLING_START) {
        home.x = own.x + hx[i];
        home.y = own.y + hy[i];
        const u = (ms - FLING_START) / FLING_MS;
        flingFrom(tornado, FLING_START, caught, seed[i], home, u, spot);
        spot.x += lean * (fy - spot.y) * (1 - u);
      } else {
        liftAt(tornado, tMs, caught, seed[i], spot);
        spot.x += lean * (fy - spot.y);
        if (ms < caught) {
          const b = bars[bar[i]];
          const u = ((ms - tear) / TEAR_MS) ** 2;
          spot.x = lerp(b.x + ox[i], spot.x, u);
          spot.y = lerp(b.y + oy[i], spot.y, u);
        }
      }
      stampGlimmer(
        ctx,
        spot.x,
        spot.y,
        SPECK,
        i,
        i % 3 ? COLOR.heavenlyGold : COLOR.white,
      );
    }
    // cheap flashes: each lash, and the slam (its own gets the blast)
    for (let k = 0; k < lashed.length; k++)
      flash(ctx, bars[lashed[k]], ms - lashMs[k], LASH_FLASH, base);
    flash(ctx, own, ms - SLAM_END, SLAM_FLASH, base);
    ctx.globalAlpha = base;
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    drawDetonation(ctx, own, ms - LAND_MS, OWN_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
