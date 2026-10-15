// Gumball, a floor crit: the number drops onto the top bar in view as a small
// shiny gumball that rolls along it at speed, the glitter and coins lying on
// it snapping on on stretchy strands of light; it hops down to each bar below
// and rolls back the other way, quicker every pass, each bar flashing and
// levelling as it rolls off with a jolt, the ball swelling, wobbling and
// squashing heavier on every landing; on its own bar it rears up trembling
// and glowing, slams down and pops in a big sticky burst, gum flung off on
// snapping strands with its glitter and coins, in the hardest shake
import { COLOR } from "../../../../palette";
import {
  drawSnowball,
  planSnowball,
  rollAt,
  rolledAt,
  stuckAt,
  type RollPass,
  type Snowball,
} from "../../../../shared/animationStyles/snowball";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { drawSpinCoin, loadSpinCoin } from "../../../../shared/coinFlip";
import { clamp01, easeIn, easeOut } from "../../../../shared/easing";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
} from "../../critPlayer";
import { BAR_HALF_H, holeHash, ownLast } from "../../critPlayer/shared";

// the number fading as the ball lobs out of it onto the top bar
const IN_MS = 180;
const DROP_IN_MS = 220;
const DROP_IN_HOP = 150;
// every roll together, quickening from QUICKEN[0] to [1] of an even share;
// a hop of HOP px over DROP_MS down to the next bar
const ROLL_MS = 1100;
const QUICKEN: [number, number] = [1.5, 0.55];
const DROP_MS = 100;
const HOP = 70;
const INSET = 60;
// lying on each bar's roll: GLITTER specks and COINS coins, within REACH
const GLITTER = 9;
const COINS = 4;
const SPECK = 18;
const COIN = 13;
const COIN_TURN = 0.012;
const COIN_POP = 0.6;
const POP_MS = 120;
const REACH = 40;
// the ball: BALL px, growing GROW px a sqrt of a pickup, squashed SQUASH
// for SQUASH_MS on each landing, always jiggling JIGGLE
const BALL = 14;
const GROW = 8;
const SQUASH = 0.38;
const SQUASH_MS = 160;
const JIGGLE = 0.06;
// a strand of light from where a pickup lay, snapping back over STRAND_MS
const STRAND_MS = 150;
const STRAND_SAG = 30;
// sparks streaming off it as it rolls
const TRAIL = 5;
const TRAIL_GAP_MS = 18;
const TRAIL_SPARK = 26;
const FLASH_MS = 220;
// the climax: rearing RISE px up over RISE_MS, swelling SWELL, trembling
// TREMBLE px, glitter pulled in; then slammed down in SLAM_MS
const RISE_MS = 280;
const RISE = 170;
const SWELL = 0.5;
const TREMBLE = 9;
const PULL = 10;
const SLAM_MS = 90;
// the pop: one blast, a flash, SHARDS of gum flung SHARD_REACH px on strands
// snapping at SNAP of the way, glitter and coins flung FLING px, falling
const POP_BLAST = 380;
const POP_FLASH_MS = 240;
const POP_FLASH = 320;
const SHARDS = 16;
const SHARD_MS = 650;
const SHARD_REACH = 330;
const SHARD = 0.32;
const SNAP = 0.45;
const FLING = 280;
const GRAVITY = 260;
const TAIL_MS = 850;
// shakes by step: a bar rolled off, the pop
const SHAKES = [0.8, 3.4];

const WHITE_GLOW = fadeStops(COLOR.white, 0.3);
const PINK_GLOW = fadeStops(COLOR.peppermintPink);
const GUM_PX = 96;

interface Gum {
  glitter: Snowball;
  coins: Snowball;
  // per pass, how high it hops (0 on a roll)
  hops: Float32Array;
  // when each hop lands
  lands: number[];
  // when each bar flashes, and its middle
  flashAt: number[];
  flashX: number[];
  flashY: number[];
  // its own bar where it was planned: the rolls follow the bars as they move
  anchor: Point;
  own: Point;
  rollEnd: number;
  slamMs: number;
  // its radius as it slams, its crust's turn then
  bigR: number;
  finalRoll: number;
}
const states = new WeakMap<Running, Gum>();
const ball: Point = { x: 0, y: 0 };
const trail: Point = { x: 0, y: 0 };
const fade = { alpha: 1 };
const shardAngle = new Float32Array(SHARDS);
const shardReach = new Float32Array(SHARDS);
const shardSize = new Float32Array(SHARDS);
const shardX = new Float32Array(SHARDS);
const shardY = new Float32Array(SHARDS);
for (let i = 0; i < SHARDS; i++) {
  shardAngle[i] = ((i + hash01(i, 91) * 0.6) / SHARDS) * Math.PI * 2;
  shardReach[i] = 0.55 + 0.45 * hash01(i, 92);
  shardSize[i] = 0.6 + 0.6 * hash01(i, 93);
}

// the glossy gumball, baked once
let gum: HTMLCanvasElement | null = null;
function gumSprite(): HTMLCanvasElement {
  if (gum) return gum;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = GUM_PX * 2;
  const g = canvas.getContext("2d")!;
  const R = GUM_PX;
  g.beginPath();
  g.arc(R, R, R - 1, 0, Math.PI * 2);
  g.fillStyle = COLOR.doubleDownCrimson;
  g.fill();
  const body = g.createRadialGradient(
    R * 0.65,
    R * 0.6,
    R * 0.05,
    R,
    R,
    R * 0.9,
  );
  body.addColorStop(0, COLOR.easterSalePink);
  body.addColorStop(0.35, COLOR.springSalePink);
  body.addColorStop(0.8, COLOR.peppermintPink);
  body.addColorStop(1, COLOR.fullHouseCrimson);
  g.beginPath();
  g.arc(R, R, R * 0.9, 0, Math.PI * 2);
  g.fillStyle = body;
  g.fill();
  g.fillStyle = "rgba(255,255,255,0.9)";
  g.beginPath();
  g.ellipse(R * 0.62, R * 0.55, R * 0.3, R * 0.15, -0.7, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(255,255,255,0.6)";
  g.beginPath();
  g.arc(R * 1.3, R * 1.35, R * 0.07, 0, Math.PI * 2);
  g.fill();
  gum = canvas;
  return canvas;
}

// the ball's spot at ms while it rolls, hopping on the drops
function ballAt(g: Gum, ms: number, into: Point): Point {
  rollAt(g.glitter, ms, into);
  const { passes } = g.glitter;
  let k = 0;
  while (k < passes.length - 1 && ms >= passes[k].endMs) k++;
  const hop = g.hops[k];
  if (hop > 0) {
    const p = passes[k];
    const u = clamp01((ms - p.startMs) / (p.endMs - p.startMs));
    into.y -= Math.sin(Math.PI * u) * hop;
  }
  return into;
}

// a strand of light from where each pickup lay to the crust, snapping back
function drawStrands(
  ctx: CanvasRenderingContext2D,
  sb: Snowball,
  ms: number,
  roll: number,
  radius: number,
): void {
  for (let i = 0; i < sb.picks.length; i++) {
    const since = ms - sb.picks[i];
    if (since < 0 || since >= STRAND_MS) continue;
    const f = 1 - since / STRAND_MS;
    const a = sb.angles[i] + roll;
    const ex = ball.x + Math.cos(a) * radius;
    const ey = ball.y + Math.sin(a) * radius;
    const s = sb.specks[i];
    const pull = easeIn(since / STRAND_MS);
    const fx = s.x + (ex - s.x) * pull;
    const fy = s.y + (ey - s.y) * pull;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.quadraticCurveTo((fx + ex) / 2, (fy + ey) / 2 + STRAND_SAG * f, ex, ey);
    ctx.globalAlpha = f * 0.5;
    ctx.strokeStyle = COLOR.peppermintPink;
    ctx.lineWidth = 2 + 9 * f;
    ctx.stroke();
    ctx.globalAlpha = f;
    ctx.strokeStyle = COLOR.white;
    ctx.lineWidth = 1 + 3 * f;
    ctx.stroke();
  }
}

registerFloorCrit("gumballCrit", {
  plan(r, bars, hit) {
    gumSprite();
    loadSpinCoin();
    const order = ownLast(bars);
    const reach = r.play.barHalfWidth - INSET;
    let total = 0;
    const weights = order.map((_, k) => {
      const w =
        QUICKEN[0] +
        (QUICKEN[1] - QUICKEN[0]) *
          (order.length > 1 ? k / (order.length - 1) : 1);
      total += w;
      return w;
    });
    const unit = ROLL_MS / total;
    const passes: RollPass[] = [];
    const hops: number[] = [];
    const lands: number[] = [];
    const glitter: Point[] = [];
    const coins: Point[] = [];
    const flashAt: number[] = [];
    const flashX: number[] = [];
    const flashY: number[] = [];
    let x = bars[order[0]].x - reach;
    let dir = 1;
    passes.push({
      from: { x: 0, y: 0 },
      to: { x, y: bars[order[0]].y },
      startMs: 0,
      endMs: DROP_IN_MS,
    });
    hops.push(DROP_IN_HOP);
    lands.push(DROP_IN_MS);
    let t = DROP_IN_MS;
    order.forEach((bar, k) => {
      const { x: mid, y } = bars[bar];
      const last = k === order.length - 1;
      if (k > 0) {
        passes.push({
          from: passes[passes.length - 1].to,
          to: { x, y },
          startMs: t,
          endMs: t + DROP_MS,
        });
        hops.push(HOP);
        t += DROP_MS;
        lands.push(t);
      }
      const to = last ? mid : mid + dir * reach;
      const ms = weights[k] * unit;
      passes.push({
        from: { x, y },
        to: { x: to, y },
        startMs: t,
        endMs: t + ms,
      });
      hops.push(0);
      for (let i = 0; i < GLITTER; i++)
        glitter.push({
          x:
            x +
            (to - x) * ((i + 0.3 + 0.4 * holeHash(i + k * 29, 5120)) / GLITTER),
          y: y + (holeHash(i + k * 29, 5121) - 0.5) * REACH,
        });
      for (let i = 0; i < COINS; i++)
        coins.push({
          x: x + (to - x) * ((i + 0.5) / COINS),
          y: y + (holeHash(i + k * 17, 5122) - 0.5) * REACH * 0.6,
        });
      t += ms;
      if (!last) {
        hit(bar, t, 0);
        flashAt.push(t);
        flashX.push(mid);
        flashY.push(y);
      }
      x = to;
      dir = -dir;
    });
    const own = passes[passes.length - 1].to;
    const rollEnd = t;
    const slamMs = rollEnd + RISE_MS + SLAM_MS;
    hit(order[order.length - 1], slamMs, 1);
    flashAt.push(slamMs);
    flashX.push(own.x);
    flashY.push(own.y);
    const glitterBall = planSnowball(passes, glitter, REACH);
    const coinBall = planSnowball(passes, coins, REACH);
    const stuck = stuckAt(glitterBall, rollEnd) + stuckAt(coinBall, rollEnd);
    const bigR0 = BALL + GROW * Math.sqrt(stuck);
    states.set(r, {
      glitter: glitterBall,
      coins: coinBall,
      hops: Float32Array.from(hops),
      lands,
      flashAt,
      flashX,
      flashY,
      anchor: { x: bars[0].x, y: bars[0].y },
      own,
      rollEnd,
      slamMs,
      bigR: bigR0 * (1 + SWELL),
      finalRoll: rolledAt(glitterBall, rollEnd) / Math.max(1, bigR0),
    });
  },
  draw(ctx, r, ms, bars) {
    const g = states.get(r);
    if (!g) return;
    const now = r.startedAt + ms;
    if (ms < IN_MS) {
      fade.alpha = 1 - ms / IN_MS;
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, fade);
    }
    const sprite = gumSprite();
    const previous = ctx.globalCompositeOperation;
    ctx.save();
    ctx.translate(bars[0].x - g.anchor.x, bars[0].y - g.anchor.y);
    // each bar flashing as it rolls off (its own as it pops)
    const half = r.play.barHalfWidth;
    ctx.globalCompositeOperation = "lighter";
    for (let k = 0; k < g.flashAt.length; k++) {
      const f = 1 - (ms - g.flashAt[k]) / FLASH_MS;
      if (f <= 0 || f > 1) continue;
      ctx.globalAlpha = f;
      drawGlow(
        ctx,
        WHITE_GLOW,
        g.flashX[k],
        g.flashY[k],
        half * 1.1,
        (BAR_HALF_H * 2.2) / (half * 1.1),
      );
      drawGlow(
        ctx,
        PINK_GLOW,
        g.flashX[k],
        g.flashY[k],
        half * 1.25,
        (BAR_HALF_H * 3) / (half * 1.25),
      );
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;

    if (ms < g.slamMs) {
      const stuck = stuckAt(g.glitter, ms) + stuckAt(g.coins, ms);
      let radius = BALL + GROW * Math.sqrt(stuck);
      let sx = 1;
      let sy = 1;
      const rolling = ms < g.rollEnd;
      const u = clamp01((ms - g.rollEnd) / RISE_MS);
      if (rolling) {
        ballAt(g, ms, ball);
        let land = -Infinity;
        for (let k = 0; k < g.lands.length; k++)
          if (g.lands[k] <= ms) land = g.lands[k];
        const squash = clamp01(1 - (ms - land) / SQUASH_MS);
        sx = 1 + SQUASH * squash;
        sy = 1 - SQUASH * 0.8 * squash;
      } else {
        const s = clamp01((ms - g.rollEnd - RISE_MS) / SLAM_MS);
        const rise = easeOut(u);
        radius *= 1 + SWELL * rise;
        const shiver = TREMBLE * u * (1 - s);
        ball.x = g.own.x + Math.sin(ms * 1.1) * shiver;
        ball.y =
          g.own.y - RISE * rise * (1 - s * s) + Math.cos(ms * 1.7) * shiver;
        if (s > 0) {
          sx = 0.82;
          sy = 1.22;
        }
      }
      const jiggle = 1 + JIGGLE * Math.sin(ms * 0.045);
      sx *= jiggle;
      sy /= jiggle;

      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      if (rolling) {
        // sparks streaming off behind it
        for (let j = 1; j <= TRAIL; j++) {
          const back = ms - j * TRAIL_GAP_MS;
          if (back < 0) break;
          ballAt(g, back, trail);
          const f = 1 - j / (TRAIL + 1);
          ctx.globalAlpha = f;
          stampGlimmer(
            ctx,
            trail.x,
            trail.y,
            TRAIL_SPARK * f + radius * 0.5,
            j,
            j % 2 ? COLOR.peppermintPink : COLOR.heavenlyGold,
          );
        }
      } else {
        // charging: a throbbing glow, quickening, light pulled in
        const beat = 0.5 + 0.5 * Math.sin((u * 3 + u * u * 6) * Math.PI * 2);
        ctx.globalAlpha = 0.35 + 0.5 * u;
        drawGlow(ctx, PINK_GLOW, ball.x, ball.y, radius * (1.7 + 0.6 * beat));
        for (let j = 0; j < PULL; j++) {
          const c = (u * 3 + j / PULL) % 1;
          const a = j * 2.4;
          const d = radius * (3.2 - 2.2 * c);
          ctx.globalAlpha = c;
          stampGlimmer(
            ctx,
            ball.x + Math.cos(a) * d,
            ball.y + Math.sin(a) * d,
            SPECK * (0.6 + c),
            j,
            COLOR.white,
          );
        }
      }
      endLightBatch(ctx);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = previous;

      ctx.save();
      ctx.translate(ball.x, ball.y);
      ctx.scale(sx, sy);
      ctx.drawImage(sprite, -radius, -radius, radius * 2, radius * 2);
      ctx.restore();

      // the coins: lying on the bars, or stuck in the clump turning with it
      const roll = rolledAt(g.glitter, ms) / Math.max(1, radius);
      const { coins } = g;
      for (let i = 0; i < coins.specks.length; i++) {
        const pick = coins.picks[i];
        const turn = ms * COIN_TURN + i;
        if (ms < pick) {
          drawSpinCoin(
            ctx,
            coins.specks[i].x,
            coins.specks[i].y,
            COIN,
            1,
            turn,
          );
          continue;
        }
        const a = coins.angles[i] + roll;
        const out = radius * 0.92;
        const pop = Math.max(0, 1 - (ms - pick) / POP_MS);
        drawSpinCoin(
          ctx,
          ball.x + Math.cos(a) * out * sx,
          ball.y + Math.sin(a) * out * sy,
          COIN * (1 + COIN_POP * pop),
          1,
          turn,
        );
      }
      drawSnowball(ctx, g.glitter, ms, ball, radius, SPECK);

      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      drawStrands(ctx, g.glitter, ms, roll, radius);
      drawStrands(ctx, g.coins, ms, roll, radius);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = previous;
    } else {
      const since = ms - g.slamMs;
      const t = clamp01(since / SHARD_MS);
      if (t < 1) {
        const { own, bigR } = g;
        const e = easeOut(t);
        const fall = GRAVITY * t * t;
        ctx.globalCompositeOperation = "lighter";
        const flash = 1 - since / POP_FLASH_MS;
        if (flash > 0) {
          ctx.globalAlpha = flash;
          drawGlow(
            ctx,
            PINK_GLOW,
            own.x,
            own.y,
            POP_FLASH * (1.4 - 0.4 * flash),
          );
          drawGlow(ctx, WHITE_GLOW, own.x, own.y, bigR * 2);
        }
        for (let i = 0; i < SHARDS; i++) {
          const d = bigR * 0.5 + SHARD_REACH * shardReach[i] * e;
          shardX[i] = own.x + Math.cos(shardAngle[i]) * d;
          shardY[i] = own.y + Math.sin(shardAngle[i]) * d * 0.8 + fall;
        }
        // sticky strands stretching after the gum, then snapping
        if (t < SNAP) {
          const f = 1 - t / SNAP;
          ctx.beginPath();
          for (let i = 0; i < SHARDS; i++) {
            ctx.moveTo(own.x, own.y);
            ctx.quadraticCurveTo(
              (own.x + shardX[i]) / 2,
              (own.y + shardY[i]) / 2 + STRAND_SAG * 2 * f,
              shardX[i],
              shardY[i],
            );
          }
          ctx.lineCap = "round";
          ctx.globalAlpha = f * 0.5;
          ctx.strokeStyle = COLOR.peppermintPink;
          ctx.lineWidth = 3 + 12 * f;
          ctx.stroke();
          ctx.globalAlpha = f;
          ctx.strokeStyle = COLOR.white;
          ctx.lineWidth = 1 + 4 * f;
          ctx.stroke();
        }
        // the clump's glitter flung off
        beginLightBatch(ctx);
        const { glitter } = g;
        for (let i = 0; i < glitter.specks.length; i++) {
          if (glitter.picks[i] > g.rollEnd) continue;
          const a = glitter.angles[i] + g.finalRoll;
          const d = bigR + FLING * e * (0.5 + hash01(i, 73));
          ctx.globalAlpha = 1 - t;
          stampGlimmer(
            ctx,
            own.x + Math.cos(a) * d,
            own.y + Math.sin(a) * d + fall * 0.6,
            SPECK * 1.5 * (1 - t * 0.7),
            i,
            i % 3 ? COLOR.heavenlyGold : COLOR.white,
          );
        }
        endLightBatch(ctx);
        ctx.globalCompositeOperation = previous;
        // the gum and coins
        ctx.globalAlpha = 1 - t * t * t;
        for (let i = 0; i < SHARDS; i++) {
          const size = Math.max(0, bigR * SHARD * shardSize[i] * (1 - 0.6 * t));
          ctx.drawImage(
            sprite,
            shardX[i] - size,
            shardY[i] - size,
            size * 2,
            size * 2,
          );
        }
        ctx.globalAlpha = 1;
        const { coins } = g;
        for (let i = 0; i < coins.specks.length; i++) {
          if (coins.picks[i] > g.rollEnd) continue;
          const a = coins.angles[i] + g.finalRoll;
          const d = bigR + FLING * e * (0.6 + 0.6 * hash01(i, 74));
          drawSpinCoin(
            ctx,
            own.x + Math.cos(a) * d,
            own.y + Math.sin(a) * d + fall,
            COIN * 1.3,
            1 - t,
            ms * COIN_TURN * 2 + i,
          );
        }
      }
      drawDetonation(ctx, g.own, since, POP_BLAST, now);
    }
    ctx.restore();
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
