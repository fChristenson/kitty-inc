// the "Unboxing" event (slice; free hires): it covers its crit, whose click
// freezes the screen while gift boxes of light, ribbon and bow, drop onto
// every floor in view with room to hire; swift slashes cut them open in
// quick fire down the building, quicker and quicker, each box trembling as
// its cut nears, then its lid and sides sliding apart with a flash, a bang
// and a jolt, glitter spilling, and a cat-wisp leaping out onto its floor as
// a new worker; last the clicked floor's big box is cut in a cross with the
// biggest flash, bang and shake, several cats bursting out. Then the crit's
// tier pays out
import meta from "./meta";
import { COLOR } from "../../../../palette";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import {
  drawSlash,
  drawSliceSpill,
  planSlash,
  type Slash,
} from "../../../../shared/animationStyles/slice";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { FLOOR_W } from "../../../../floors/constants";
import { missingWorkerCount } from "../../../../floors/worker";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../../eventRewards";
import { registerWispEvent, startWispCover } from "../../wispCover";

const KEY = "unboxing";
const MAX_OTHERS = 6;
// the boxes: SMALL px wide, the clicked floor's BIG, AWAY of the width from
// their cat's spot toward the middle, dropping DROP_H px over DROP_MS,
// squashing SQUASH on landing for SQUASH_MS
const SMALL = 200;
const BIG = 340;
const AWAY = 0.24;
const EDGE = 0.1;
const DROP_START = 60;
const DROP_MS = 170;
const DROP_H = 700;
const SQUASH = 0.22;
const SQUASH_MS = 140;
// trembling up to TREMBLE px (of a SMALL box) over the WIND_MS before its cut
const WIND_MS = 220;
const TREMBLE = 12;
// the cuts: CUT_W px streaks, CUT_SPILL px glitter, CUT_BLAST px flash,
// shaking CUT_SHAKE (quickening cuts, harder jolts)
const CUT_W = 34;
const CUT_SPILL = 32;
const CUT_SPILL_N = 22;
const CUT_BLAST = 160;
const CUT_SHAKE: [number, number] = [0.8, 1.6];
// the cross on the big box: CROSS_LAG apart, CROSS_MS each
const CROSS_LAG = 60;
const CROSS_MS = 110;
const CROSS_W = 56;
const CROSS_SPILL = 44;
const CROSS_SPILL_N = 32;
const CROSS_JOLT = 2;
const BIG_BLAST = 340;
const BIG_SHAKE = 3.6;
// the pieces, in sprite units: snapping SNAP apart over APART_MS, the lid
// flung up LID_V a ms, the sides out SIDE_V, under gravity G, turning, gone
// by PIECE_MS
const APART_MS = 70;
const SNAP = 40;
const LID_V = 2.4;
const SIDE_V = 1.1;
const G = 0.006;
const LID_SPIN = 0.006;
const SIDE_SPIN = 0.003;
const PIECE_MS = 420;
// the cats: popping out POP_MS after the cut, leaping LEAP_MS in an arc
// LEAP_H px high onto their spot HIRE_UP above where the worker stands; the
// big box's CAT_STAGGER apart, extras SPREAD of the width apart
const POP_MS = 30;
const LEAP_MS = 200;
const LEAP_H = 260;
const HIRE_UP = 40;
const CAT_STAGGER = 40;
const SPREAD = 0.14;
const CAT_WISP = 1.1;
const EAR = WISP_SIZE * 0.32;
const LAND_BURST = 0.6;
const LAND_SHAKE = 0.7;
const SOUND_GAP_MS = 55;

const GOLD = fadeStops(COLOR.heavenlyGold);

// the sprite: the lid (with its bow) above, the body below, in sprite units
const PAD = 10;
const SW = 300;
const BW = 240;
const BH = 190;
const LW = 272;
const LH = 56;
const BOW_H = 84;
const LID_Y0 = 0;
const LID_SH = PAD + BOW_H + LH + PAD;
const BODY_Y0 = LID_SH;
const BODY_SH = BH + 2 * PAD;
// where each piece's middle sits with the box shut, its bottom at 0
const BODY_CY = -BH / 2;
const LID_CY = -BH - LH / 2 + 8 - (PAD + BOW_H + LH / 2 - LID_SH / 2);
// how tall the shut box stands, as a share of its width
const TALL = (BH + LH + BOW_H - 8) / BW;
const OUTLINE = COLOR.goldenHandshakeGold;
const RIBBON = COLOR.springSalePink;
const RIBBON_EDGE = COLOR.peppermintPink;

let boxSprite: HTMLCanvasElement | null = null;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function getBoxSprite(): HTMLCanvasElement {
  if (boxSprite) return boxSprite;
  const canvas = document.createElement("canvas");
  canvas.width = SW;
  canvas.height = LID_SH + BODY_SH;
  const ctx = canvas.getContext("2d")!;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const mid = SW / 2;
  const band = 40;

  // the body: glowing pale gold, a ribbon down the middle, a glossy stripe
  const bx = mid - BW / 2;
  const by = BODY_Y0 + PAD;
  roundRect(ctx, bx, by, BW, BH, 14);
  ctx.fillStyle = "#FFF6CC";
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillRect(bx + 18, by + 14, 22, BH - 28);
  ctx.fillStyle = RIBBON;
  ctx.fillRect(mid - band / 2, by, band, BH);
  ctx.lineWidth = 4;
  ctx.strokeStyle = RIBBON_EDGE;
  ctx.strokeRect(mid - band / 2, by, band, BH);
  roundRect(ctx, bx, by, BW, BH, 14);
  ctx.lineWidth = 8;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();

  // the lid band
  const lx = mid - LW / 2;
  const ly = LID_Y0 + PAD + BOW_H;
  roundRect(ctx, lx, ly, LW, LH, 12);
  ctx.fillStyle = "#FFFBE6";
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillRect(lx + 16, ly + 10, LW - 32, 10);
  ctx.fillStyle = RIBBON;
  ctx.fillRect(mid - band / 2, ly, band, LH);
  ctx.lineWidth = 4;
  ctx.strokeStyle = RIBBON_EDGE;
  ctx.strokeRect(mid - band / 2, ly, band, LH);
  roundRect(ctx, lx, ly, LW, LH, 12);
  ctx.lineWidth = 8;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();

  // the bow: two loops and a knot on the lid
  const ky = ly - 6;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(mid + side * 46, ky - 36, 50, 30, side * -0.5, 0, Math.PI * 2);
    ctx.fillStyle = RIBBON;
    ctx.fill();
    ctx.lineWidth = 7;
    ctx.strokeStyle = RIBBON_EDGE;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(mid + side * 44, ky - 38, 22, 11, side * -0.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(mid, ky - 10, 20, 0, Math.PI * 2);
  ctx.fillStyle = RIBBON;
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.strokeStyle = RIBBON_EDGE;
  ctx.stroke();
  boxSprite = canvas;
  return canvas;
}

interface Cat {
  hire: RewardHire;
  at: Point;
  start: number;
  lands: number;
  path: (ms: number) => Point | null;
}

interface Box {
  cx: number;
  by: number;
  size: number;
  big: boolean;
  dropAt: number;
  landAt: number;
  cutStart: number;
  cutEnd: number;
  centre: Point;
  dir: number;
  slashes: Slash[];
  cats: Cat[];
}

export const forceUnboxingEvent = registerWispEvent(
  KEY,
  "Unboxing",
  () => meta.chance,
  (floor, context) => {
    const {
      firstMs,
      dropGapMs,
      gapsMs,
      crossGapMs,
      clickedHires,
      holdMs,
      mergeMs,
    } = meta.values;
    const found = findRewardHires(floor, context);
    if (found.length === 0) return;
    getBoxSprite();

    // the big box on the clicked floor (or the nearest one if it's full),
    // the others nearest first, cut top to bottom down the building
    const near = (h: RewardHire) => Math.abs(h.y);
    const sorted = found.slice().sort((a, b) => near(a) - near(b));
    const own = found.find((h) => h.floor === floor) ?? sorted[0];
    const others = sorted
      .filter((h) => h !== own)
      .slice(0, MAX_OTHERS)
      .sort((a, b) => a.y - b.y);
    const ownHires: RewardHire[] = [own];
    const extra = Math.min(clickedHires, missingWorkerCount(own.floor)) - 1;
    for (let k = 1; k <= extra; k++) {
      const side = (k % 2 ? 1 : -1) * Math.ceil(k / 2);
      const x = Math.min(
        FLOOR_W * (1 - EDGE),
        Math.max(FLOOR_W * EDGE, own.x + side * SPREAD * FLOOR_W),
      );
      ownHires.push({ ...own, x, workerIndex: null, hiredAt: null });
    }
    const hires: RewardHire[] = [...others, ...ownHires];

    const makeBox = (hire: RewardHire, big: boolean, k: number): Box => {
      const size = big ? BIG : SMALL;
      const toward = hire.x < FLOOR_W / 2 ? 1 : -1;
      const cx = Math.min(
        FLOOR_W - size / 2 - EDGE * FLOOR_W,
        Math.max(size / 2 + EDGE * FLOOR_W, hire.x + toward * AWAY * FLOOR_W),
      );
      const dropAt = DROP_START + k * dropGapMs;
      const h = size * TALL;
      return {
        cx,
        by: hire.y,
        size,
        big,
        dropAt,
        landAt: dropAt + DROP_MS,
        cutStart: 0,
        cutEnd: 0,
        centre: { x: cx, y: hire.y - h * 0.45 },
        dir: k % 2 ? 1 : -1,
        slashes: [],
        cats: [],
      };
    };
    const boxes: Box[] = others.map((h, k) => makeBox(h, false, k));
    const bigBox = makeBox(own, true, others.length);
    boxes.push(bigBox);

    // a cat leaping out of `box` at `start` onto `hire`
    const makeCat = (box: Box, hire: RewardHire, start: number): Cat => {
      const top = box.by - box.size * TALL * 0.6;
      const to: Point = { x: hire.x, y: hire.y - HIRE_UP };
      const into: Point = { x: 0, y: 0 };
      const lands = start + LEAP_MS;
      return {
        hire,
        at: to,
        start,
        lands,
        path: (ms) => {
          if (ms < start || ms > lands) return null;
          const u = (ms - start) / LEAP_MS;
          into.x = box.cx + (to.x - box.cx) * u;
          into.y = top + (to.y - top) * u - LEAP_H * 4 * u * (1 - u);
          return into;
        },
      };
    };

    // the cuts, quickening down the building, then the cross
    let t: number = firstMs;
    const m = others.length;
    for (let k = 0; k < m; k++) {
      const box = boxes[k];
      const w = box.size;
      const h = w * TALL;
      const y0 = box.by - h * 0.95;
      const y1 = box.by - h * 0.1;
      const slash =
        box.dir > 0
          ? planSlash(
              { x: box.cx - 0.8 * w, y: y0 },
              { x: box.cx + 0.8 * w, y: y1 },
              t,
            )
          : planSlash(
              { x: box.cx + 0.8 * w, y: y0 },
              { x: box.cx - 0.8 * w, y: y1 },
              t,
            );
      box.slashes.push(slash);
      box.cutStart = slash.startMs;
      box.cutEnd = slash.endMs;
      box.cats.push(makeCat(box, others[k], slash.endMs + POP_MS));
      t += lerp(gapsMs, k / Math.max(1, m - 1));
    }
    const crossAt = m > 0 ? boxes[m - 1].cutEnd + crossGapMs : firstMs;
    {
      const w = bigBox.size;
      const h = w * TALL;
      const y0 = bigBox.by - h * 1.05;
      const y1 = bigBox.by + h * 0.05;
      const a = planSlash(
        { x: bigBox.cx - 0.85 * w, y: y0 },
        { x: bigBox.cx + 0.85 * w, y: y1 },
        crossAt,
        CROSS_MS,
      );
      const b = planSlash(
        { x: bigBox.cx + 0.85 * w, y: y0 },
        { x: bigBox.cx - 0.85 * w, y: y1 },
        crossAt + CROSS_LAG,
        CROSS_MS,
      );
      bigBox.slashes.push(a, b);
      bigBox.cutStart = a.startMs;
      bigBox.cutEnd = b.endMs;
      for (let k = 0; k < ownHires.length; k++)
        bigBox.cats.push(
          makeCat(bigBox, ownHires[k], b.endMs + POP_MS + k * CAT_STAGGER),
        );
    }
    const slashes: Slash[] = [];
    const slashBox: Box[] = [];
    const cats: Cat[] = [];
    for (const box of boxes) {
      for (const s of box.slashes) {
        slashes.push(s);
        slashBox.push(box);
      }
      for (const c of box.cats) cats.push(c);
    }
    const lastCat = cats[cats.length - 1];
    const endMs = lastCat.lands;

    let soundAt = -Infinity;
    const bloop = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playBloop();
    };
    const dropping = createBeats(
      boxes,
      (b) => b.landAt,
      (b, _, now) => {
        cover!.burst(b.centre, b.big ? 0.8 : 0.4);
        if (!cover!.isLive()) return;
        bloop(now);
        if (b.big) shakeScreen(0.8);
      },
    );
    const swiping = createBeats(
      slashes,
      (s) => s.startMs,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const cutting = createBeats(
      slashes,
      (s) => s.endMs,
      (s, k) => {
        const box = slashBox[k];
        const opened = s.endMs === box.cutEnd;
        if (box.big && opened) {
          cover!.blast(box.centre);
          if (!cover!.isLive()) return;
          playExplosion();
          shakeScreen(BIG_SHAKE);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(
          box.big ? CROSS_JOLT : lerp(CUT_SHAKE, k / Math.max(1, m - 1)),
        );
      },
    );
    const landing = createBeats(
      cats,
      (c) => c.lands,
      (c, _, now) => {
        giveHire(c.hire);
        cover!.burst(c.at, LAND_BURST);
        if (!cover!.isLive()) return;
        bloop(now);
        shakeScreen(LAND_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          dropping.tick(ms, now);
          swiping.tick(ms, now);
          cutting.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now);
          if (ms < 0 || ms > endMs + 900) return;
          for (let i = 0; i < boxes.length; i++) drawBox(ctx, boxes[i], ms);
          for (let k = 0; k < slashes.length; k++) {
            const s = slashes[k];
            const big = slashBox[k].big;
            drawSlash(ctx, s, ms, big ? CROSS_W : CUT_W, now);
            drawSliceSpill(
              ctx,
              s,
              ms,
              big ? CROSS_SPILL : CUT_SPILL,
              big ? CROSS_SPILL_N : CUT_SPILL_N,
            );
          }
          for (let i = 0; i < boxes.length; i++) {
            const b = boxes[i];
            drawDetonation(
              ctx,
              b.centre,
              ms - b.cutEnd,
              b.big ? BIG_BLAST : CUT_BLAST,
              now,
            );
          }
          for (let k = 0; k < cats.length; k++) {
            const c = cats[k];
            drawWispBetween(
              ctx,
              c.path,
              ms,
              now,
              WISP_SIZE * CAT_WISP,
              0.7,
              c.start,
              c.lands,
            );
            const at = c.path(ms);
            if (at) drawEars(ctx, at);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);

// the box at ms: dropping in, squashing, trembling, then cut, its pieces
// flung apart and fading
function drawBox(ctx: CanvasRenderingContext2D, box: Box, ms: number): void {
  if (ms < box.dropAt) return;
  const t = ms - box.cutEnd;
  if (t > PIECE_MS) return;
  const scale = box.size / BW;
  const previous = ctx.globalCompositeOperation;
  ctx.save();
  if (t < 0) {
    const fall = DROP_H * (1 - easeIn(clamp01((ms - box.dropAt) / DROP_MS)));
    const squash =
      ms > box.landAt
        ? SQUASH * (1 - clamp01((ms - box.landAt) / SQUASH_MS))
        : 0;
    const wind = clamp01(1 - (box.cutStart - ms) / WIND_MS);
    const shiver =
      TREMBLE * (box.size / SMALL) * wind * wind * Math.sin(ms * 0.9 + box.cx);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.45 + 0.55 * wind;
    drawGlow(
      ctx,
      GOLD,
      box.centre.x,
      box.centre.y - fall,
      box.size * (0.85 + 0.35 * wind),
    );
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;
    ctx.translate(box.cx + shiver, box.by - fall);
    ctx.scale(scale * (1 + squash), scale * (1 - squash));
    drawPiece(ctx, 0, BODY_Y0, SW, BODY_SH, 0, BODY_CY, 0);
    drawPiece(ctx, 0, LID_Y0, SW, LID_SH, 0, LID_CY, 0);
  } else {
    const snap = SNAP * easeOut(clamp01(t / APART_MS));
    const drop = 0.5 * G * t * t;
    ctx.globalAlpha = 1 - (t / PIECE_MS) ** 2;
    ctx.translate(box.cx, box.by);
    ctx.scale(scale, scale);
    const side = SIDE_V * t + snap;
    drawPiece(
      ctx,
      0,
      BODY_Y0,
      SW / 2,
      BODY_SH,
      -SW / 4 - side,
      BODY_CY + drop * 0.6,
      -SIDE_SPIN * t,
    );
    drawPiece(
      ctx,
      SW / 2,
      BODY_Y0,
      SW / 2,
      BODY_SH,
      SW / 4 + side,
      BODY_CY + drop * 0.6,
      SIDE_SPIN * t,
    );
    drawPiece(
      ctx,
      0,
      LID_Y0,
      SW,
      LID_SH,
      box.dir * 0.5 * side,
      LID_CY - snap - LID_V * t + drop,
      box.dir * LID_SPIN * t,
    );
  }
  ctx.restore();
}

// the sprite's (sx, sy, sw, sh) with its middle at (x, y), turned `turn`
function drawPiece(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  x: number,
  y: number,
  turn: number,
): void {
  ctx.translate(x, y);
  if (turn) ctx.rotate(turn);
  ctx.drawImage(boxSprite!, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);
  if (turn) ctx.rotate(-turn);
  ctx.translate(-x, -y);
}

// a cat's two ears on the wisp's head at `at`
function drawEars(ctx: CanvasRenderingContext2D, at: Point): void {
  const r = WISP_SIZE * CAT_WISP * 0.32;
  ctx.beginPath();
  ctx.moveTo(at.x - r, at.y - r * 0.4);
  ctx.lineTo(at.x - r * 0.75, at.y - r - EAR);
  ctx.lineTo(at.x - r * 0.1, at.y - r * 0.85);
  ctx.moveTo(at.x + r, at.y - r * 0.4);
  ctx.lineTo(at.x + r * 0.75, at.y - r - EAR);
  ctx.lineTo(at.x + r * 0.1, at.y - r * 0.85);
  ctx.fillStyle = COLOR.heavenlyGold;
  ctx.fill();
}
