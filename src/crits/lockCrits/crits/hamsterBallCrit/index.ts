// Hamster Ball, a lock crit: the number drops onto the dark locked floor as a
// clear glowing ball with a wisp running inside it, legs a blur; it rolls at
// the lock from one wall and bumps it (a flash, a jolt, sparks), bounces back
// under it and up to the other wall and rolls in again, each pass quicker,
// the glitter it rolls over sticking to its shell so it swells and blazes;
// then it rams the lock flat out and both burst in one blast, its crust and
// shell flung off, the wisp tumbling out onto the new floor's button: each of
// its next taps also levels the next open floors above it
import meta from "./meta";
import { defineTapPerk } from "../../../buttonCrits/buttonBonus";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import {
  drawSnowball,
  planSnowball,
  rollAt,
  type RollPass,
  type Snowball,
} from "../../../../shared/animationStyles/snowball";
import { drawGlow } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import {
  FLOOR_H,
  FLOOR_X_MAX,
  FLOOR_X_MIN,
} from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
  glowStops,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

const DROP_MS = 170;
// the walls WIDE of the floor's half width out, at least MIN_RUN px past where
// the ball meets the lock (LOCK_HALF px plus its radius off the middle); its
// way back runs under the lock, LANE of the floor's half height down
const WIDE = 0.86;
const MIN_RUN = 140;
const LOCK_HALF = 130;
const LANE = 0.6;
// BUMPS passes into the lock, then the ram; each IN_MS in and two RECOIL_MS
// legs back, the last QUICKEN as long as the first
const BUMPS = 4;
const IN_MS = 240;
const RECOIL_MS = 90;
const QUICKEN = 0.45;
// the glitter along its way; it picks up what's within REACH of its line
const SPECKS = 110;
const REACH = 46;
const SPECK = 18;
const BASE = 34;
const GROW = 6;
const SHELL_W = 5;
const SHELL_FILL = "rgba(255,255,255,0.08)";
const SHELL_EDGE = "rgba(255,255,255,0.9)";
// each bump squashes the ball SQUASH and flings BUMP_SPARKS sparks
const SQUASH = 0.22;
const BUMP_MS = 150;
const BUMP_FLASH: [number, number] = [150, 320];
const BUMP_SPARKS = 10;
const BUMP_FLING: [number, number] = [90, 210];
const BUMP_SHAKE: [number, number] = [0.4, 1.3];
// the wisp inside: its legs' spin (rad a ms), slow to flat out, and its size
const LEG_SPIN: [number, number] = [0.03, 0.12];
const LEGS = 4;
const LEG_R = 10;
const WISP: [number, number] = [0.6, 0.95];
// the burst: crust and shell flung FLING px out over FLING_MS
const FLING_MS = 380;
const FLING = 520;
const SHARDS = 18;
const OPEN_BLAST = 440;
const FLASH_MS = 200;
const FLASH_GLOW = 720;
// the wisp tumbling onto the button
const TUMBLE_MS = 300;
const TUMBLE_RISE = 170;
const TUMBLE_WOBBLE = 22;
const BUTTON_GLOW = 190;
const TAPS_BLAST = 170;
// shakes by step: a bump, the lock rammed open, the button
const SHAKES = [0.5, 3.6, 1.3];

const TAU = Math.PI * 2;
const GOLD = glowStops(COLOR.heavenlyGold);
const WHITE = glowStops(COLOR.white);

interface State {
  ball: Snowball;
  // the pick times sorted, for counting what's stuck by a binary search
  sorted: Float64Array;
  // each pass's heading (-1 left, 1 right) and the wisp's leg spin on it
  dir: Float32Array;
  spin: Float32Array;
  bumpAt: number[];
  bumpSide: number[];
  inMs: number;
  rewardAt: number;
  ram: Point;
  blast: Point;
  button: Point;
  wispAt: (ms: number) => Point | null;
}
const states = new WeakMap<Running, State>();
const head: Point = { x: 0, y: 0 };

// how many specks are stuck on by ms
function stuckBy(sorted: Float64Array, ms: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (sorted[m] <= ms) lo = m + 1;
    else hi = m;
  }
  return lo;
}

function passAt(ball: Snowball, ms: number): number {
  const { passes } = ball;
  let k = 0;
  while (k < passes.length - 1 && ms >= passes[k].endMs) k++;
  return k;
}

// each of its next taps also levelling the next open floors above
const scurryTaps = defineTapPerk("Scurry", (t) => {
  let left = meta.values.floors;
  for (
    let i = t.floors.indexOf(t.floor) + 1;
    i < t.floors.length && left > 0;
    i++
  ) {
    if (!t.floors[i].unlocked) continue;
    t.levelUp(t.floors[i], 1);
    left--;
  }
});

registerFloorCrit("hamsterBallCrit", {
  reward(t) {
    scurryTaps.add(t.floor, meta.values.taps);
    t.flipButton();
  },
  plan(r, _bars, hit) {
    const lock = getLockCenter();
    const mid = (FLOOR_X_MIN + FLOOR_X_MAX) / 2 - lock.x;
    const w = ((FLOOR_X_MAX - FLOOR_X_MIN) / 2) * WIDE;
    const under: Point = { x: 0, y: (FLOOR_H / 2) * LANE };
    const top = BASE + GROW * Math.sqrt(SPECKS);
    const wall = (side: number, contact: number): Point => ({
      x: side * Math.max(side * (mid + side * w), contact + MIN_RUN),
      y: 0,
    });
    const passes: RollPass[] = [];
    const bumpAt: number[] = [];
    const bumpSide: number[] = [];
    let t = DROP_MS;
    let side = -1;
    let last: Point = { x: 0, y: 0 };
    for (let k = 0; k <= BUMPS; k++) {
      const q = lerp(1, QUICKEN, k / BUMPS);
      const contact = LOCK_HALF + lerp(BASE, top, k / BUMPS);
      const from = wall(side, contact);
      if (k > 0) {
        // bounced back off the lock, under it and up to the other wall
        passes.push({
          from: last,
          to: under,
          startMs: t,
          endMs: t + RECOIL_MS * q,
        });
        t += RECOIL_MS * q;
        passes.push({
          from: under,
          to: from,
          startMs: t,
          endMs: t + RECOIL_MS * q,
        });
        t += RECOIL_MS * q;
      }
      const to: Point = { x: side * contact, y: 0 };
      passes.push({ from, to, startMs: t, endMs: t + IN_MS * q });
      t += IN_MS * q;
      if (k < BUMPS) {
        bumpAt.push(t);
        bumpSide.push(side);
      }
      last = to;
      side = -side;
    }
    const n = passes.length;
    const specks: Point[] = [];
    for (let i = 0; i < SPECKS; i++) {
      const p = passes[Math.min(n - 1, Math.floor(holeHash(i, 5101) * n))];
      const dx = p.to.x - p.from.x;
      const dy = p.to.y - p.from.y;
      const len = Math.hypot(dx, dy) || 1;
      const u = 0.12 + 0.82 * holeHash(i, 5102);
      const off = (holeHash(i, 5103) * 2 - 1) * REACH * 0.8;
      specks.push({
        x: p.from.x + dx * u - (dy / len) * off,
        y: p.from.y + dy * u + (dx / len) * off,
      });
    }
    const ball = planSnowball(passes, specks, REACH);
    const dir = new Float32Array(n);
    const spin = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      dir[k] = Math.sign(passes[k].to.x - passes[k].from.x) || 1;
      spin[k] = lerp(LEG_SPIN[0], LEG_SPIN[1], k / Math.max(1, n - 1));
    }
    const inMs = t;
    const ram = passes[n - 1].to;
    const btn = getButtonCenter(false);
    const wisp: Point = { x: 0, y: 0 };
    const s: State = {
      ball,
      sorted: Float64Array.from(ball.picks).sort(),
      dir,
      spin,
      bumpAt,
      bumpSide,
      inMs,
      rewardAt: inMs + TUMBLE_MS,
      ram,
      blast: { x: ram.x / 2, y: 0 },
      button: { x: btn.x - lock.x, y: btn.y - lock.y },
      wispAt: (ms) => {
        if (ms < DROP_MS || ms > s.rewardAt) return null;
        if (ms <= inMs) {
          // running at the bottom of the ball, a touch ahead, bobbing
          rollAt(ball, ms, wisp);
          const k = passAt(ball, ms);
          const rad = BASE + GROW * Math.sqrt(stuckBy(s.sorted, ms));
          wisp.x += dir[k] * rad * 0.2;
          wisp.y += rad * 0.42 + Math.sin(ms * spin[k] * 2) * rad * 0.05;
          return wisp;
        }
        // tumbling out in a hop onto the button
        const u = (ms - inMs) / TUMBLE_MS;
        const wob = TUMBLE_WOBBLE * (1 - u);
        wisp.x = lerp(ram.x, s.button.x, u) + Math.cos(ms * 0.05) * wob;
        wisp.y =
          lerp(ram.y, s.button.y, u) -
          TUMBLE_RISE * 4 * u * (1 - u) +
          Math.sin(ms * 0.05) * wob;
        return wisp;
      },
    };
    states.set(r, s);
    for (const at of bumpAt) hit(0, at, 0);
    hit(0, inMs, 1);
    hit(0, s.rewardAt, 2);
  },
  draw(ctx, r, ms, bars) {
    const s = states.get(r);
    if (!s) return;
    const now = r.startedAt + ms;
    const lock = bars[0];
    const ball = s.ball;
    const first = ball.passes[0].from;
    if (ms < DROP_MS) {
      const p = (ms / DROP_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, lock.x + first.x, p),
        lerp(0, lock.y + first.y, p),
        r.flashFont * lerp(1, 0.3, p),
      );
    }
    const bumps = s.bumpAt.length;
    while (r.kicked < bumps && ms >= s.bumpAt[r.kicked]) {
      r.shake(
        lerp(BUMP_SHAKE[0], BUMP_SHAKE[1], r.kicked / Math.max(1, bumps - 1)),
      );
      r.kicked++;
    }
    const stuck = stuckBy(s.sorted, ms);
    const glow = stuck / SPECKS;
    ctx.save();
    ctx.translate(lock.x, lock.y);
    const previous = ctx.globalCompositeOperation;
    if (ms < s.inMs) {
      const c = rollAt(ball, ms, head);
      const rad = BASE + GROW * Math.sqrt(stuck);
      if (ms >= DROP_MS) {
        let sq = 0;
        for (let k = 0; k < bumps; k++) {
          const since = ms - s.bumpAt[k];
          if (since >= 0 && since < BUMP_MS)
            sq = SQUASH * (1 - since / BUMP_MS);
        }
        ctx.globalCompositeOperation = "lighter";
        // the lock straining, the ball blazing brighter as it swells
        ctx.globalAlpha = 0.15 + 0.35 * glow;
        drawGlow(ctx, GOLD, 0, 0, LOCK_HALF * (1.2 + glow));
        ctx.globalAlpha = 0.3 + 0.5 * glow;
        drawGlow(ctx, GOLD, c.x, c.y, rad * (1.8 + 1.4 * glow));
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.ellipse(
          c.x,
          c.y,
          Math.max(0, rad * (1 - sq)),
          Math.max(0, rad * (1 + sq * 0.6)),
          0,
          0,
          TAU,
        );
        ctx.fillStyle = SHELL_FILL;
        ctx.fill();
        ctx.lineWidth = SHELL_W;
        ctx.strokeStyle = SHELL_EDGE;
        ctx.globalAlpha = 0.55 + 0.45 * glow;
        ctx.stroke();
        ctx.globalAlpha = 1;
        drawGlow(ctx, WHITE, c.x - rad * 0.38, c.y - rad * 0.42, rad * 0.4);
        ctx.globalCompositeOperation = previous;
      }
      drawSnowball(ctx, ball, ms, c, rad, SPECK);
    }
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    if (ms >= DROP_MS && ms < s.inMs) {
      // the wisp's legs, a spinning blur under it
      const w = s.wispAt(ms);
      if (w) {
        const wx = w.x;
        const wy = w.y + WISP_SIZE * 0.3;
        const a = ms * s.spin[passAt(ball, ms)];
        for (let j = 0; j < LEGS; j++) {
          const b = a + (j * TAU) / LEGS;
          stampGlimmer(
            ctx,
            wx + Math.cos(b) * LEG_R,
            wy + Math.sin(b) * LEG_R * 0.45,
            10,
            j,
            COLOR.white,
          );
        }
      }
    }
    // each bump: a flash on the lock and sparks off it
    for (let k = 0; k < bumps; k++) {
      const since = ms - s.bumpAt[k];
      if (since < 0 || since >= BUMP_MS) continue;
      const f = 1 - since / BUMP_MS;
      const prog = k / Math.max(1, bumps - 1);
      const x = s.bumpSide[k] * LOCK_HALF;
      ctx.globalAlpha = f * f;
      drawGlow(ctx, WHITE, x, 0, lerp(BUMP_FLASH[0], BUMP_FLASH[1], prog));
      ctx.globalAlpha = f;
      const out = lerp(BUMP_FLING[0], BUMP_FLING[1], prog) * (1 - f * f);
      for (let j = 0; j < BUMP_SPARKS; j++) {
        const b = (j * TAU) / BUMP_SPARKS + k;
        stampGlimmer(
          ctx,
          x + Math.cos(b) * out,
          Math.sin(b) * out * 0.7,
          SPECK * 1.2,
          j + k * 13,
          j % 2 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
    }
    if (ms >= s.inMs && ms < s.inMs + FLING_MS) {
      // the crust and the shell flung off all round
      const since = ms - s.inMs;
      if (since < FLASH_MS) {
        const f = 1 - since / FLASH_MS;
        ctx.globalAlpha = f * f;
        drawGlow(ctx, WHITE, s.blast.x, 0, FLASH_GLOW * (1 + 0.4 * (1 - f)));
      }
      const u = since / FLING_MS;
      const out = FLING * (1 - (1 - u) ** 2);
      ctx.globalAlpha = 1 - u;
      for (let i = 0; i < SPECKS; i++) {
        if (ball.picks[i] > s.inMs) continue;
        const a = ball.angles[i];
        stampGlimmer(
          ctx,
          s.ram.x + Math.cos(a) * out,
          Math.sin(a) * out * 0.6,
          SPECK * 1.3,
          i,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      for (let j = 0; j < SHARDS; j++) {
        const a = (j * TAU) / SHARDS;
        stampGlimmer(
          ctx,
          s.ram.x + Math.cos(a) * out * 1.2,
          Math.sin(a) * out * 0.8,
          SPECK * 2,
          j + 500,
          COLOR.white,
        );
      }
    }
    // the button lighting up as the wisp lands on it
    const land = ms - s.rewardAt;
    if (land > -150 && land < 250) {
      ctx.globalAlpha = land < 0 ? 1 + land / 150 : 1 - land / 250;
      drawGlow(ctx, GOLD, s.button.x, s.button.y, BUTTON_GLOW);
    }
    endLightBatch(ctx);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;
    drawWispBetween(
      ctx,
      s.wispAt,
      ms,
      now,
      WISP_SIZE * lerp(WISP[0], WISP[1], glow),
      glow,
      DROP_MS,
      s.rewardAt,
    );
    drawDetonation(ctx, s.blast, ms - s.inMs, OPEN_BLAST, now);
    drawDetonation(ctx, s.button, ms - s.rewardAt, TAPS_BLAST, now);
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
