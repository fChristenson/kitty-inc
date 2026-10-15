// Cash Chute, an income crit: the green amount bursts into coins tossed up in
// arcs that drop into a ring low under the total; they burst at once out of
// its twin over the readout with the speed they fell in at, slamming into it,
// a splash and a share every pour; pass after pass quicker and fuller, a
// second and a third pair opening round the readout, then a torrent through
// all three at once and the huge blast
import {
  drawPortal,
  drawPortalPass,
  portalLook,
  type PortalLook,
} from "../../../../shared/animationStyles/portal";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import {
  beginCoinBatch,
  drawCoinBurstFrame,
  endCoinBatch,
  type CoinBurstSprite,
} from "../../../../coinBurst";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale, drawNumberShrink } from "../shared";

// the ring pairs, from the total: the low ring, its twin round the readout
// aiming at where its coins land, their sizes and looks
const LOW_X = [-170, 240, 40];
const LOW_Y = [520, 450, 600];
const LOW_SIZE = [115, 85, 100];
const LOW_TILT = [0.18, -0.22, 0.06];
const TWIN_X = [0, -390, 400];
const TWIN_Y = [-140, -70, -95];
const TWIN_SIZE = [105, 75, 90];
const LAND_X = [0, -190, 200];
const LAND_SPREAD = [150, 110, 110];
const LAND_Y = 25;
const LOOKS: PortalLook[] = [portalLook(4), portalLook(2), portalLook(5)];
const PAIRS = 3;
// the lowest a low ring sits, of the viewport's width
const LOW_MAX = 0.85;
const OPEN_MS = 140;
const CLOSE_MS = 200;
const PASS_MS = 220;
const SWELL = 0.25;
const TREMBLE = 0.06;
// the number bursting into coins
const BURST = 170;
const FIRST_MS = 90;
// the pours: which pair each goes through, the gaps between them closing,
// fuller each, tossed over POUR_MS, flying FLY_MS into the low ring on an arc
// ARC px high
const ORDER = [0, 0, 1, 0, 1, 2, 1, 0, 2];
const GAP_MS: [number, number] = [230, 70];
const COUNT: [number, number] = [6, 16];
const POUR_MS: [number, number] = [110, 60];
const FLY_MS: [number, number] = [360, 210];
const ARC: [number, number] = [280, 170];
const SPLASH: [number, number] = [90, 160];
// the torrent: every pair at once
const TORRENT = 34;
const TORRENT_MS = 260;
const TORRENT_FLY_MS = 200;
const TORRENT_ARC = 160;
const TORRENT_SPLASH = 230;
const FINALE_GAP_MS = 50;
// the number's spot the coins leave from, and how far into a ring's width
// they dive
const FROM_X = 140;
const FROM_Y = 70;
const ACROSS = 0.7;
const MIN_DROP = 250;
const MIN_EXIT_MS = 25;
const COIN = 26;
const BILL_EVERY = 6;
const COIN_SPIN = 0.02;
// shakes by step: a pour, a torrent's pour, the finale
const SHAKES = [0.45, 1.2, 2.8];

interface State {
  n: number;
  // per coin: tossed at, flying into the low ring for, its arc, from (the
  // flash's middle), into (the total), out of and onto (the total), and the
  // ms it takes from the twin to the readout
  t0: Float32Array;
  fly: Float32Array;
  arc: Float32Array;
  sx: Float32Array;
  sy: Float32Array;
  ix: Float32Array;
  iy: Float32Array;
  ex: Float32Array;
  ey: Float32Array;
  tx: Float32Array;
  ty: Float32Array;
  exit: Float32Array;
  sprites: CoinBurstSprite[];
  // per pour: its pair, its first coin into the ring, its splash on the
  // readout and how big
  pourPair: number[];
  pourIn: number[];
  pourHit: number[];
  pourSize: number[];
  lowY: number[];
  twinTilt: number[];
  openAt: number[];
  heatEnd: number;
  closeAt: number;
  finaleAt: number;
}
const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

registerFloorCrit("cashChuteCrit", {
  plan(r, bars, hit) {
    const to = bars[0];
    const lowY: number[] = [];
    const twinTilt: number[] = [];
    for (let p = 0; p < PAIRS; p++) {
      lowY.push(Math.min(LOW_Y[p], r.viewportWidth * LOW_MAX - to.y));
      twinTilt.push(
        Math.atan2(-TWIN_Y[p], LAND_X[p] - TWIN_X[p]) - Math.PI / 2,
      );
    }
    const total = ORDER.length;
    let max = PAIRS * TORRENT;
    for (let k = 0; k < total; k++)
      max += Math.round(lerp(COUNT[0], COUNT[1], k / (total - 1)));
    const s: State = {
      n: 0,
      t0: new Float32Array(max),
      fly: new Float32Array(max),
      arc: new Float32Array(max),
      sx: new Float32Array(max),
      sy: new Float32Array(max),
      ix: new Float32Array(max),
      iy: new Float32Array(max),
      ex: new Float32Array(max),
      ey: new Float32Array(max),
      tx: new Float32Array(max),
      ty: new Float32Array(max),
      exit: new Float32Array(max),
      sprites: [],
      pourPair: [],
      pourIn: [],
      pourHit: [],
      pourSize: [],
      lowY,
      twinTilt,
      openAt: [Infinity, Infinity, Infinity],
      heatEnd: 0,
      closeAt: 0,
      finaleAt: 0,
    };
    let last = 0;
    // a coin of pair p tossed at t0, returning when it lands
    const toss = (p: number, t0: number, fly: number, height: number) => {
      const i = s.n++;
      const across = (holeHash(i, 4401) * 2 - 1) * ACROSS;
      const sx = (holeHash(i, 4402) - 0.5) * FROM_X;
      const sy = (holeHash(i, 4403) - 0.5) * FROM_Y;
      const ix = LOW_X[p] + Math.cos(LOW_TILT[p]) * across * LOW_SIZE[p];
      const iy = lowY[p] + Math.sin(LOW_TILT[p]) * across * LOW_SIZE[p];
      // always dropping into the ring from above
      const arc = Math.max(height, (sy - (to.y + iy) + MIN_DROP) / 4);
      const speed = Math.hypot(to.x + ix - sx, to.y + iy - sy + 4 * arc) / fly;
      const ex = TWIN_X[p] + Math.cos(twinTilt[p]) * across * TWIN_SIZE[p];
      const ey = TWIN_Y[p] + Math.sin(twinTilt[p]) * across * TWIN_SIZE[p];
      const tx = LAND_X[p] + (holeHash(i, 4404) * 2 - 1) * LAND_SPREAD[p];
      const ty = (holeHash(i, 4405) * 2 - 1) * LAND_Y;
      const exit = Math.max(MIN_EXIT_MS, Math.hypot(tx - ex, ty - ey) / speed);
      s.t0[i] = t0;
      s.fly[i] = fly;
      s.arc[i] = arc;
      s.sx[i] = sx;
      s.sy[i] = sy;
      s.ix[i] = ix;
      s.iy[i] = iy;
      s.ex[i] = ex;
      s.ey[i] = ey;
      s.tx[i] = tx;
      s.ty[i] = ty;
      s.exit[i] = exit;
      const axis = (holeHash(i, 4406) - 0.5) * Math.PI;
      s.sprites.push({
        kind: i % BILL_EVERY === 0 ? "bill" : "coin",
        spinFrame: i,
        axisAngle: axis,
        axisCos: Math.cos(axis),
        axisSin: Math.sin(axis),
      });
      const lands = t0 + fly + exit;
      last = Math.max(last, lands);
      return lands;
    };
    // a pour of `count` coins through pair p, a hit on its middle coin in
    const pour = (
      p: number,
      at: number,
      count: number,
      spread: number,
      fly: number,
      height: number,
      size: number,
      step: number,
    ) => {
      s.openAt[p] = Math.min(s.openAt[p], at);
      let middle = 0;
      for (let c = 0; c < count; c++) {
        const lands = toss(p, at + (spread * c) / count, fly, height);
        if (c === count >> 1) middle = lands;
      }
      s.pourPair.push(p);
      s.pourIn.push(at + fly);
      s.pourHit.push(middle);
      s.pourSize.push(size);
      hit(0, middle, step);
    };
    let t = FIRST_MS;
    for (let k = 0; k < total; k++) {
      const u = k / (total - 1);
      pour(
        ORDER[k],
        t,
        Math.round(lerp(COUNT[0], COUNT[1], u)),
        lerp(POUR_MS[0], POUR_MS[1], u),
        lerp(FLY_MS[0], FLY_MS[1], u),
        lerp(ARC[0], ARC[1], u),
        lerp(SPLASH[0], SPLASH[1], u),
        0,
      );
      t += lerp(GAP_MS[0], GAP_MS[1], u ** 0.8);
    }
    s.heatEnd = t + TORRENT_FLY_MS;
    for (let p = 0; p < PAIRS; p++)
      pour(
        p,
        t,
        TORRENT,
        TORRENT_MS,
        TORRENT_FLY_MS,
        TORRENT_ARC,
        TORRENT_SPLASH,
        1,
      );
    s.finaleAt = last + FINALE_GAP_MS;
    s.closeAt = s.finaleAt;
    hit(0, s.finaleAt, 2);
    states.set(r, s);
  },
  draw(ctx, r, ms, bars) {
    const s = states.get(r);
    if (!s) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    drawNumberShrink(ctx, r, ms);
    drawDetonation(ctx, ORIGIN, ms, BURST, now);
    const heat = clamp01(ms / s.heatEnd);
    const shut = 1 - clamp01((ms - s.closeAt) / CLOSE_MS);
    const swell = 1 + SWELL * heat + TREMBLE * heat * Math.sin(now * 0.07);
    for (let p = 0; p < PAIRS; p++) {
      const open = clamp01((ms - s.openAt[p]) / OPEN_MS) * shut;
      if (open <= 0) continue;
      ctx.save();
      ctx.translate(to.x + LOW_X[p], to.y + s.lowY[p]);
      ctx.rotate(LOW_TILT[p]);
      drawPortal(ctx, ORIGIN, LOW_SIZE[p] * swell, open, now, 1, LOOKS[p]);
      ctx.restore();
      ctx.save();
      ctx.translate(to.x + TWIN_X[p], to.y + TWIN_Y[p]);
      ctx.rotate(s.twinTilt[p]);
      drawPortal(ctx, ORIGIN, TWIN_SIZE[p] * swell, open, now, -1, LOOKS[p]);
      ctx.restore();
    }
    const base = ctx.getTransform();
    beginCoinBatch(ctx);
    for (let i = 0; i < s.n; i++) {
      const e = ms - s.t0[i];
      if (e < 0) continue;
      const fly = s.fly[i];
      if (e < fly) {
        const u = e / fly;
        spot.x = s.sx[i] + (to.x + s.ix[i] - s.sx[i]) * u;
        spot.y =
          s.sy[i] + (to.y + s.iy[i] - s.sy[i]) * u - s.arc[i] * 4 * u * (1 - u);
      } else if (e < fly + s.exit[i]) {
        const u = (e - fly) / s.exit[i];
        spot.x = to.x + s.ex[i] + (s.tx[i] - s.ex[i]) * u;
        spot.y = to.y + s.ey[i] + (s.ty[i] - s.ey[i]) * u;
      } else continue;
      const sprite = s.sprites[i];
      sprite.spinFrame = ms * COIN_SPIN + i;
      drawCoinBurstFrame(ctx, sprite, spot.x, spot.y, COIN, base);
    }
    endCoinBatch(ctx);
    for (let k = 0; k < s.pourPair.length; k++) {
      const p = s.pourPair[k];
      const since = ms - s.pourIn[k];
      if (since >= 0 && since <= PASS_MS) {
        ctx.save();
        ctx.translate(to.x + LOW_X[p], to.y + s.lowY[p]);
        ctx.rotate(LOW_TILT[p]);
        drawPortalPass(ctx, ORIGIN, since, LOW_SIZE[p] * swell);
        ctx.restore();
        ctx.save();
        ctx.translate(to.x + TWIN_X[p], to.y + TWIN_Y[p]);
        ctx.rotate(s.twinTilt[p]);
        drawPortalPass(ctx, ORIGIN, since, TWIN_SIZE[p] * swell);
        ctx.restore();
      }
      spot.x = to.x + LAND_X[p];
      spot.y = to.y;
      drawDetonation(ctx, spot, ms - s.pourHit[k], s.pourSize[k], now);
    }
    drawFinale(ctx, to, ms - s.finaleAt, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
