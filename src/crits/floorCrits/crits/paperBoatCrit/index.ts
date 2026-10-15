// Paper Boat, a floor crit: the number bursts into a river of hundreds of
// coins gushing along the top of the top bar like a gutter, a paper-boat
// wisp riding its front; off the bar's end it pours in a waterfall onto the
// next bar down and flows back the other way, the boat tumbling down with it
// and riding on, quicker each bar, each bar it runs off splashing and
// levelling; then it leaps off the last and crashes onto its own bar in one
// torrent, the boat tossed up on the crest and diving in with the big blast
import { COLOR } from "../../../../palette";
import {
  beginCoinBatch,
  drawCoinBurstFrame,
  endCoinBatch,
  type CoinBurstSprite,
} from "../../../../coinBurst";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawSplash } from "../../../../shared/animationStyles/ripple";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../critPlayer";
import { BAR_HALF_H, holeHash, ownLast } from "../../critPlayer/shared";

const IN_MS = 120;
const ENTER_MS = 110;
const ENTER_LIFT = 120;
// the river runs RIDE px over a bar's middle, END of its half width either
// side; each run RUN_MS and each waterfall FALL_MS (first to last), curling
// LIP px out past the end; runs and falls squeezed into HEAD_MAX ms in all
const RIDE = BAR_HALF_H + 12;
const END = 0.92;
const RUN_MS: [number, number] = [230, 130];
const FALL_MS: [number, number] = [110, 70];
const LIP = 110;
const HEAD_MAX = 1000;
// the leap off the last bar, ARC px up, onto its own bar's top
const ARC_MS = 190;
const ARC = 260;
const LAND_Y = -BAR_HALF_H * 0.6;
// the river: COINS coins SPACING ms apart behind the boat, WIDTH px thick,
// bobbing BOB px; once the boat lands the rest surges in SURGE times as fast
const COINS = 200;
const SPACING = 4;
const SURGE = 2.8;
const COIN = 26;
const BILL_EVERY = 5;
const COIN_SPIN = 0.025;
const WIDTH = 18;
const BOB = 5;
// the boat: tossed HOP_H px up and HOP_X px about over the torrent (at least
// HOP_MIN ms), then diving in
const BOAT = 84;
const WISP = WISP_SIZE * 1.3;
const HOP_MIN = 260;
const HOP_H = 210;
const HOP_X = 80;
const SPLASH_MS = 260;
const GLOW = 150;
const PLUNGE_GLOW = 240;
const SPECKS = 26;
const LAND_SPECKS = 18;
const CHARGE_GLOW: [number, number] = [90, 300];
const OWN_BLAST = 420;
// shakes by step: a bar it runs off (or the torrent landing), the dive
const SHAKES = [0.9, 2.8];

const GOLD = fadeStops(COLOR.heavenlyGold);
const WHITE = fadeStops(COLOR.white);

const sprites: CoinBurstSprite[] = [];
const coinDx = new Float32Array(COINS);
const coinDy = new Float32Array(COINS);
const coinSize = new Float32Array(COINS);
const coinPhase = new Float32Array(COINS);
for (let i = 0; i < COINS; i++) {
  sprites.push({
    kind: i % BILL_EVERY === 0 ? "bill" : "coin",
    spinFrame: 0,
    axisAngle: (holeHash(i, 7100) - 0.5) * Math.PI,
  });
  coinDx[i] = (holeHash(i, 7101) * 2 - 1) * WIDTH;
  coinDy[i] = (holeHash(i, 7102) * 2 - 1) * WIDTH;
  coinSize[i] = COIN * lerp(0.75, 1.2, holeHash(i, 7103));
  coinPhase[i] = holeHash(i, 7104) * Math.PI * 2;
}

// the paper boat, folded once at first use
let boatSprite: HTMLCanvasElement | null = null;
function boat(): HTMLCanvasElement {
  if (boatSprite) return boatSprite;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 80;
  const g = c.getContext("2d")!;
  g.lineJoin = "round";
  g.lineWidth = 5;
  g.strokeStyle = "#1a1a1a";
  g.beginPath();
  g.moveTo(64, 6);
  g.lineTo(96, 48);
  g.lineTo(32, 48);
  g.closePath();
  g.fillStyle = "#f4f8ff";
  g.fill();
  g.stroke();
  g.beginPath();
  g.moveTo(64, 6);
  g.lineTo(64, 48);
  g.lineTo(32, 48);
  g.closePath();
  g.fillStyle = "#c9d8f0";
  g.fill();
  g.stroke();
  g.beginPath();
  g.moveTo(6, 44);
  g.lineTo(122, 44);
  g.lineTo(100, 74);
  g.lineTo(28, 74);
  g.closePath();
  g.fillStyle = COLOR.white;
  g.fill();
  g.stroke();
  boatSprite = c;
  return c;
}

// each leg of the river's head: a quadratic from a, bent to c, onto b, from
// t0 to t1 ms, tumbling the boat a turn if it's a waterfall
const S = 9;
interface Splash {
  bar: number;
  dx: number;
  dy: number;
  at: number;
  glow: number;
  specks: number;
}
interface State {
  seg: Float32Array;
  segs: number;
  splashes: Splash[];
  // when each waterfall (and the leap) starts, for a whoosh
  falls: number[];
  plungeAt: number;
  lastAt: number;
  hopDir: number;
  // bars[0] this frame
  offset: Point;
  boatAt: (ms: number) => Point | null;
}
const states = new WeakMap<Running, State>();
const spot: Point = { x: 0, y: 0 };
const head: Point = { x: 0, y: 0 };
const at: Point = { x: 0, y: 0 };
let poseRot = 0;
let poseFace = 1;

// the leg the head is on at t, or -1 off its route
function legAt(state: State, t: number): number {
  const seg = state.seg;
  if (t < seg[6] || t > state.plungeAt) return -1;
  let k = 0;
  while (k < state.segs - 1 && t > seg[k * S + 7]) k++;
  return k;
}

// the river's head t ms in (relative to bars[0] plus offset), null off it
function pathAt(state: State, t: number, into: Point): Point | null {
  const k = legAt(state, t);
  if (k < 0) return null;
  const seg = state.seg;
  const o = k * S;
  const u = clamp01((t - seg[o + 6]) / (seg[o + 7] - seg[o + 6]));
  const v = 1 - u;
  into.x =
    v * v * seg[o] +
    2 * u * v * seg[o + 2] +
    u * u * seg[o + 4] +
    state.offset.x;
  into.y =
    v * v * seg[o + 1] +
    2 * u * v * seg[o + 3] +
    u * u * seg[o + 5] +
    state.offset.y;
  return into;
}

// the boat at ms: along the river, then tossed over the torrent; sets its
// turn and facing
function boatAt(state: State, ms: number, into: Point): Point | null {
  if (ms <= state.plungeAt) {
    const k = legAt(state, ms);
    if (k < 0) return null;
    const seg = state.seg;
    const o = k * S;
    const u = clamp01((ms - seg[o + 6]) / (seg[o + 7] - seg[o + 6]));
    const tx =
      2 * (1 - u) * (seg[o + 2] - seg[o]) + 2 * u * (seg[o + 4] - seg[o + 2]);
    const ty =
      2 * (1 - u) * (seg[o + 3] - seg[o + 1]) +
      2 * u * (seg[o + 5] - seg[o + 3]);
    poseFace = tx < 0 ? -1 : 1;
    poseRot = Math.atan2(ty, tx * poseFace) + seg[o + 8] * Math.PI * 2 * u;
    return pathAt(state, ms, into);
  }
  if (ms > state.lastAt) return null;
  const u = (ms - state.plungeAt) / (state.lastAt - state.plungeAt);
  into.x = state.offset.x + HOP_X * state.hopDir * Math.sin(Math.PI * 2 * u);
  into.y = state.offset.y + LAND_Y - HOP_H * Math.sin(Math.PI * u);
  poseFace = state.hopDir;
  poseRot = lerp(-0.4, 1.4, u * u);
  return into;
}

registerFloorCrit("paperBoatCrit", {
  plan(r, bars, hit) {
    boat();
    const half = r.play.barHalfWidth * END;
    const base = bars[0];
    const order = ownLast(bars);
    const others = order.length - 1;
    const seg: number[] = [];
    const splashes: Splash[] = [];
    const falls: number[] = [];
    let t = IN_MS;
    const leg = (
      ax: number,
      ay: number,
      cx: number,
      cy: number,
      bx: number,
      by: number,
      ms: number,
      tumble: number,
    ) => {
      seg.push(ax, ay, cx, cy, bx, by, t, t + ms, tumble);
      t += ms;
    };
    let raw = 0;
    for (let k = 0; k < others; k++) {
      const f = others > 1 ? k / (others - 1) : 1;
      raw += lerp(...RUN_MS, f) + (k < others - 1 ? lerp(...FALL_MS, f) : 0);
    }
    const squeeze = raw > HEAD_MAX ? HEAD_MAX / raw : 1;
    // from the number, in the flash's middle
    let px = -base.x;
    let py = -base.y;
    for (let k = 0; k < others; k++) {
      const bar = order[k];
      const f = others > 1 ? k / (others - 1) : 1;
      const dir = k % 2 ? -1 : 1;
      const bx = bars[bar].x - base.x;
      const gy = bars[bar].y - base.y - RIDE;
      const ax = bx - dir * half;
      const ex = bx + dir * half;
      if (k === 0)
        leg(
          px,
          py,
          (px + ax) / 2,
          Math.min(py, gy) - ENTER_LIFT,
          ax,
          gy,
          ENTER_MS,
          0,
        );
      leg(ax, gy, (ax + ex) / 2, gy, ex, gy, lerp(...RUN_MS, f) * squeeze, 0);
      hit(bar, t, 0);
      splashes.push({
        bar,
        dx: ex - bx,
        dy: -RIDE,
        at: t,
        glow: GLOW,
        specks: SPECKS,
      });
      px = ex;
      py = gy;
      if (k === others - 1) break;
      const next = order[k + 1];
      const nx = bars[next].x - base.x;
      const ny = bars[next].y - base.y - RIDE;
      const lx = nx + dir * half;
      falls.push(t);
      leg(
        ex,
        gy,
        ex + dir * LIP,
        lerp(gy, ny, 0.3),
        lx,
        ny,
        lerp(...FALL_MS, f) * squeeze,
        dir,
      );
      splashes.push({
        bar: next,
        dx: lx - nx,
        dy: -RIDE,
        at: t,
        glow: 0,
        specks: LAND_SPECKS,
      });
      px = lx;
      py = ny;
    }
    falls.push(t);
    leg(
      px,
      py,
      px / 2,
      Math.min(py, LAND_Y) - ARC,
      0,
      LAND_Y,
      others ? ARC_MS : ENTER_MS + ARC_MS,
      0,
    );
    const plungeAt = t;
    const lastAt = plungeAt + Math.max(HOP_MIN, (COINS * SPACING) / SURGE);
    hit(0, plungeAt, 0);
    hit(0, lastAt, 1);
    splashes.push({
      bar: 0,
      dx: 0,
      dy: LAND_Y,
      at: plungeAt,
      glow: PLUNGE_GLOW,
      specks: SPECKS * 1.4,
    });
    const state: State = {
      seg: Float32Array.from(seg),
      segs: seg.length / S,
      splashes,
      falls,
      plungeAt,
      lastAt,
      hopDir: px < 0 ? 1 : -1,
      offset: { x: 0, y: 0 },
      boatAt: (ms) => boatAt(state, ms, head),
    };
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { plungeAt, lastAt } = state;
    const own = bars[0];
    state.offset.x = own.x;
    state.offset.y = own.y;
    if (ms < IN_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 + 0.5 * (ms / IN_MS)),
        { alpha: 1 - ms / IN_MS },
      );
    while (r.kicked < state.falls.length && ms >= state.falls[r.kicked]) {
      playSwoosh();
      r.kicked++;
    }
    // the river, tail first so the coins by the boat are on top; once the
    // boat's in, the rest surges in after it
    const flow = ms <= plungeAt ? ms : plungeAt + (ms - plungeAt) * SURGE;
    if (ms > IN_MS && flow - SPACING < plungeAt) {
      const transform = ctx.getTransform();
      beginCoinBatch(ctx);
      for (let i = COINS - 1; i >= 0; i--) {
        if (!pathAt(state, flow - (i + 1) * SPACING, spot)) continue;
        const coin = sprites[i];
        coin.spinFrame = ms * COIN_SPIN + i;
        drawCoinBurstFrame(
          ctx,
          coin,
          spot.x + coinDx[i],
          spot.y + coinDy[i] + Math.sin(ms * 0.02 + coinPhase[i]) * BOB,
          coinSize[i],
          transform,
        );
      }
      endCoinBatch(ctx);
    }
    const heat =
      ms < plungeAt
        ? 0.3 * clamp01((ms - IN_MS) / (plungeAt - IN_MS))
        : lerp(0.3, 1, clamp01((ms - plungeAt) / (lastAt - plungeAt)));
    drawWispBetween(ctx, state.boatAt, ms, now, WISP, heat, IN_MS, lastAt);
    if (ms >= IN_MS && ms <= lastAt && boatAt(state, ms, at)) {
      const sprite = boat();
      ctx.save();
      ctx.translate(at.x, at.y);
      ctx.scale(poseFace, 1);
      ctx.rotate(poseRot);
      ctx.drawImage(sprite, -BOAT / 2, -BOAT * 0.45, BOAT, BOAT * 0.625);
      ctx.restore();
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    const splashes = state.splashes;
    for (let i = 0; i < splashes.length; i++) {
      const s = splashes[i];
      const since = ms - s.at;
      if (since < 0 || since >= SPLASH_MS) continue;
      at.x = bars[s.bar].x + s.dx;
      at.y = bars[s.bar].y + s.dy;
      if (s.glow > 0) {
        const u = since / SPLASH_MS;
        ctx.globalAlpha = (1 - u) * (1 - u);
        drawGlow(ctx, GOLD, at.x, at.y, s.glow * (0.5 + 0.9 * u), 0.6);
        drawGlow(ctx, WHITE, at.x, at.y, s.glow * 0.45 * (1 - u), 0.6);
        ctx.globalAlpha = 1;
      }
      drawSplash(ctx, at, since, s.specks, 9, SPLASH_MS);
    }
    // its own bar swelling with light under the torrent, throbbing faster
    if (ms > plungeAt && ms < lastAt) {
      const u = (ms - plungeAt) / (lastAt - plungeAt);
      ctx.globalAlpha = 0.5 + 0.5 * u;
      drawGlow(
        ctx,
        GOLD,
        own.x,
        own.y + LAND_Y,
        lerp(...CHARGE_GLOW, u) * (0.85 + 0.15 * Math.sin(u * u * 40)),
        0.5,
      );
      ctx.globalAlpha = 1;
    }
    endLightBatch(ctx);
    ctx.restore();
    at.x = own.x;
    at.y = own.y + LAND_Y;
    drawDetonation(ctx, at, ms - lastAt, OWN_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
