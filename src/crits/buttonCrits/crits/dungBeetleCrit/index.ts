// Dung Beetle, a button crit: the number shrinks into a little gold ball and
// a beetle wisp (glowing shell, scurrying legs) that zips it to the top of a
// lane beside the button column and rolls it down past every button, back
// up, and down again, each pass quicker; at each button its glitter leaps off
// onto the ball (flash, jolt), the ball swelling bigger and brighter and the
// beetle straining harder; at the bottom it flips the huge ball up onto its
// own button, bursting in the big blast: each of the button's next taps also
// levels its floor one more than the last, +1, +2, +3...
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import type { Floor } from "../../../../gameState";
import { snapshotMap } from "../../../../shared/snapshotState";
import {
  drawSnowball,
  planSnowball,
  rollAt,
  snowballRadius,
  type RollPass,
  type Snowball,
} from "../../../../shared/animationStyles/snowball";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import { BTN_H, BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 140;
// the passes down, up and down the lane, PAST px beyond the end buttons; the
// lane GAP px off the buttons' left ends, clear of the ball at its biggest
const PASS_MS = [420, 300, 210];
const PAST = 90;
const GAP = 14;
// the ball: BALL px round, growing GROW px a sqrt of a speck; JOLT px kicked
// off each button for JOLT_MS
const BALL = 14;
const GROW = 4.5;
const JOLT = 10;
const JOLT_MS = 120;
// each button's glitter for a pass: PER specks EDGE_X px off its left end,
// spread EDGE_Y up and down, leaping LEAP_MS (up to LEAP_SPREAD_MS earlier)
// on a LEAP_HOP px arc onto the ball as it passes
const PER = 4;
const EDGE_X: [number, number] = [8, 34];
const EDGE_Y = BTN_H * 0.36;
const LEAP_MS = 110;
const LEAP_SPREAD_MS = 50;
const LEAP_HOP = 26;
const SPECK = 16;
const FLASH = 90;
const FLASH_MS = 130;
// the flip onto its own button: FLIP_MS on a FLIP_HOP px arc, swelling
// FLIP_SWELL more; the beetle lurching KICK px after it, gone over FADE_MS
const FLIP_MS = 240;
const FLIP_HOP = 160;
const FLIP_SWELL = 0.35;
const KICK = 22;
const FADE_MS = 200;
const BLAST = 440;
const LAND_FLASH = 220;
const LAND_FLASH_MS = 160;
// the beetle: a SHELL_L x SHELL_W shell, legs LEG px, scurrying faster as the
// ball grows, trembling STRAIN px at its biggest
const SHELL_L = 38;
const SHELL_W = 28;
const LEG = 13;
const SCURRY = 1 / 26;
const STRAIN = 4;
// shakes by step: a button passed, a button rewarded, its own
const SHAKES = [0.5, 1.2, 3.2];

const BALL_GLOW = fadeStops(COLOR.heavenlyGold);
const BALL_BODY = fadeStops(COLOR.heavenlyGold, 0.65);
const BALL_CORE = fadeStops(COLOR.white);

interface State {
  ball: Snowball;
  // each speck's place off its button and when it leaps
  homes: Point[];
  leapAt: Float64Array;
  // each button passed: when, and where its flash goes
  flashAt: Float64Array;
  flashX: Float64Array;
  flashY: Float64Array;
  end: number;
  land: number;
  maxR: number;
  // the flip, from the lane's foot onto its own button's left end
  from: Point;
  to: Point;
}
const states = new WeakMap<Running, State>();
const ball: Point = { x: 0, y: 0 };
const beetle: Point = { x: 0, y: 0 };
const probeAt: Point = { x: 0, y: 0 };
const beetleAt = () => beetle;

// each floor's heap taps landed so far in a row
const heaped = snapshotMap<Floor, number>();

// each tap also levelling its floor one more than the last: +1, +2, +3...
const heapTaps = defineTapPerk(
  "Heap",
  (t, left) => {
    const step = (heaped.get(t.floor) ?? 0) + 1;
    if (left > 0) heaped.set(t.floor, step);
    else heaped.delete(t.floor);
    t.levelUp(t.floor, step, `+${step + 1} Lvl`);
  },
  true,
);

// the beetle's shell, head pointing +x, drawn once
let shell: HTMLCanvasElement | null = null;
function shellSprite(): HTMLCanvasElement {
  if (shell) return shell;
  const scale = 2;
  const w = SHELL_L * scale;
  const h = SHELL_W * scale;
  shell = document.createElement("canvas");
  shell.width = w;
  shell.height = h;
  const c = shell.getContext("2d")!;
  c.scale(scale, scale);
  c.lineWidth = 2;
  c.strokeStyle = "#000";
  // head
  c.fillStyle = "#3a2410";
  c.beginPath();
  c.arc(SHELL_L - 7, SHELL_W / 2, 6, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  // shell
  const g = c.createRadialGradient(
    SHELL_L * 0.4,
    SHELL_W * 0.35,
    1,
    SHELL_L * 0.45,
    SHELL_W / 2,
    SHELL_L * 0.5,
  );
  g.addColorStop(0, COLOR.white);
  g.addColorStop(0.3, COLOR.heavenlyGold);
  g.addColorStop(1, "#7a4c10");
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(
    SHELL_L * 0.42,
    SHELL_W / 2,
    SHELL_L * 0.38,
    SHELL_W / 2 - 2,
    0,
    0,
    Math.PI * 2,
  );
  c.fill();
  c.stroke();
  // the split down its back
  c.beginPath();
  c.moveTo(SHELL_L * 0.06, SHELL_W / 2);
  c.lineTo(SHELL_L * 0.78, SHELL_W / 2);
  c.stroke();
  // eyes
  c.fillStyle = COLOR.white;
  c.beginPath();
  c.arc(SHELL_L - 5, SHELL_W / 2 - 3, 1.6, 0, Math.PI * 2);
  c.arc(SHELL_L - 5, SHELL_W / 2 + 3, 1.6, 0, Math.PI * 2);
  c.fill();
  return shell;
}

// the beetle at `beetle`, facing angle, legs at phase, glowing heat 0..1
function drawBeetle(
  ctx: CanvasRenderingContext2D,
  angle: number,
  phase: number,
  heat: number,
  alpha: number,
  ms: number,
  now: number,
): void {
  if (alpha <= 0) return;
  drawWispHead(ctx, beetleAt, ms, now, WISP_SIZE * 0.8, heat, alpha);
  ctx.save();
  ctx.translate(beetle.x, beetle.y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = COLOR.heavenlyGold;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const along = (i - 1) * SHELL_L * 0.25;
    const swing = Math.sin(phase + i * 2.1) * LEG * 0.6;
    ctx.moveTo(along, -SHELL_W * 0.3);
    ctx.lineTo(along + swing, -SHELL_W * 0.3 - LEG);
    ctx.moveTo(along, SHELL_W * 0.3);
    ctx.lineTo(along - swing, SHELL_W * 0.3 + LEG);
  }
  ctx.stroke();
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(shellSprite(), -SHELL_L / 2, -SHELL_W / 2, SHELL_L, SHELL_W);
  ctx.restore();
}

// when the ball crosses height y on pass p (probe: the passes alone)
function crossing(probe: Snowball, p: RollPass, y: number): number {
  const down = p.to.y > p.from.y;
  let lo = p.startMs;
  let hi = p.endMs - 0.01;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    rollAt(probe, mid, probeAt);
    if (probeAt.y < y === down) lo = mid;
    else hi = mid;
  }
  return hi;
}

registerFloorCrit("dungBeetleCrit", {
  reward(t) {
    heapTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const base = bars[0];
    let top = Infinity;
    let bottom = -Infinity;
    let left = Infinity;
    for (const b of bars) {
      top = Math.min(top, b.y - base.y);
      bottom = Math.max(bottom, b.y - base.y);
      left = Math.min(left, b.x - base.x - BTN_W / 2);
    }
    const maxR = BALL + GROW * Math.sqrt(bars.length * PER * PASS_MS.length);
    const laneX = left - GAP - maxR;
    const passes: RollPass[] = [];
    let t = IN_MS;
    for (let p = 0; p < PASS_MS.length; p++) {
      const high = { x: laneX, y: top - PAST };
      const low = { x: laneX, y: bottom + PAST };
      const down = p % 2 === 0;
      passes.push({
        from: down ? high : low,
        to: down ? low : high,
        startMs: t,
        endMs: t + PASS_MS[p],
      });
      t += PASS_MS[p];
    }
    const probe = planSnowball(passes, [], 0);
    const specks: Point[] = [];
    const homes: Point[] = [];
    const picks: number[] = [];
    const leaps: number[] = [];
    const flashAt: number[] = [];
    const flashX: number[] = [];
    const flashY: number[] = [];
    const last = passes.length - 1;
    passes.forEach((pass, p) => {
      bars.forEach((b, bar) => {
        const x = b.x - base.x - BTN_W / 2;
        const y = b.y - base.y;
        const pick = crossing(probe, pass, y);
        for (let i = 0; i < PER; i++) {
          const seed = (p * 40 + bar) * PER + i;
          const home = {
            x: x - lerp(EDGE_X[0], EDGE_X[1], holeHash(seed, 7310)),
            y:
              y +
              (((i + 0.5) / PER) * 2 - 1) * EDGE_Y +
              (holeHash(seed, 7311) - 0.5) * 16,
          };
          homes.push(home);
          specks.push({ x: home.x, y: home.y });
          picks.push(pick);
          leaps.push(pick - LEAP_MS - holeHash(seed, 7312) * LEAP_SPREAD_MS);
        }
        flashAt.push(pick);
        flashX.push(x - EDGE_X[1] * 0.5);
        flashY.push(y);
        hit(bar, pick, p === last && bar !== 0 ? 1 : 0);
      });
    });
    const roll = planSnowball(passes, specks, -1);
    for (let i = 0; i < picks.length; i++) roll.picks[i] = picks[i];
    const land = t + FLIP_MS;
    hit(0, land, 2);
    states.set(r, {
      ball: roll,
      homes,
      leapAt: Float64Array.from(leaps),
      flashAt: Float64Array.from(flashAt),
      flashX: Float64Array.from(flashX),
      flashY: Float64Array.from(flashY),
      end: t,
      land,
      maxR,
      from: passes[last].to,
      to: { x: -BTN_W / 2 - GAP, y: 0 },
    });
  },
  draw(ctx, r, ms, bars) {
    const s = states.get(r);
    if (!s) return;
    const now = r.startedAt + ms;
    const base = bars[0];
    if (ms < IN_MS) {
      const u = ms / IN_MS;
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont * (1 - 0.5 * u), {
        alpha: 1 - u,
      });
    }
    ctx.save();
    ctx.translate(base.x, base.y);
    const { ball: roll, homes, leapAt, flashAt } = s;
    const first = roll.passes[0];

    // the buttons' flashes as the ball passes, the latest jolting it
    let jolt = 0;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let k = 0; k < flashAt.length; k++) {
      const since = ms - flashAt[k];
      if (since < 0 || since > FLASH_MS) continue;
      jolt = Math.max(jolt, 1 - since / JOLT_MS);
      stampGlimmer(
        ctx,
        s.flashX[k],
        s.flashY[k],
        FLASH * (1 - since / FLASH_MS),
        k,
        COLOR.white,
      );
    }
    const landed = ms - s.land;
    if (landed >= 0 && landed < LAND_FLASH_MS)
      stampGlimmer(
        ctx,
        s.to.x,
        s.to.y,
        LAND_FLASH * (1 - landed / LAND_FLASH_MS),
        3,
        COLOR.white,
      );
    endLightBatch(ctx);
    ctx.globalCompositeOperation = "source-over";

    // the ball: zipped out of the number, rolled down the lane, flipped home
    let radius = snowballRadius(roll, ms, BALL, GROW);
    const grown = clamp01((radius - BALL) / (s.maxR - BALL));
    let dirX = 0;
    let dirY = 1;
    if (ms < IN_MS) {
      const u = ms / IN_MS;
      const e = u * u;
      ball.x = lerp(-base.x, first.from.x, e);
      ball.y = lerp(-base.y, first.from.y, e);
      dirX = first.from.x + base.x;
      dirY = first.from.y + base.y;
      const len = Math.hypot(dirX, dirY) || 1;
      dirX /= len;
      dirY /= len;
    } else if (ms < s.end) {
      rollAt(roll, ms, ball);
      let k = 0;
      while (k < roll.passes.length - 1 && ms >= roll.passes[k].endMs) k++;
      dirY = roll.passes[k].to.y > roll.passes[k].from.y ? 1 : -1;
      ball.x -= jolt * JOLT;
    } else {
      const u = clamp01((ms - s.end) / FLIP_MS);
      const e = u * u;
      ball.x = lerp(s.from.x, s.to.x, e);
      ball.y = lerp(s.from.y, s.to.y, e) - FLIP_HOP * 4 * u * (1 - u);
      radius *= 1 + FLIP_SWELL * u;
    }
    if (ms < s.land) {
      // glitter still to stick: sitting off its button, then leaping on
      const { specks, picks } = roll;
      for (let i = 0; i < specks.length; i++) {
        const pick = picks[i];
        if (ms >= pick) continue;
        const home = homes[i];
        const start = leapAt[i];
        if (ms < start) {
          specks[i].x = home.x;
          specks[i].y = home.y;
          continue;
        }
        const u = (ms - start) / (pick - start);
        const e = u * u;
        specks[i].x = lerp(home.x, ball.x, e);
        specks[i].y = lerp(home.y, ball.y, e) - LEAP_HOP * 4 * u * (1 - u);
      }
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      ctx.globalAlpha = 0.35 + 0.5 * grown;
      drawGlow(ctx, BALL_GLOW, ball.x, ball.y, radius * 2.4);
      ctx.globalAlpha = 0.9;
      drawGlow(ctx, BALL_BODY, ball.x, ball.y, radius * 1.05);
      ctx.globalAlpha = 0.4 + 0.6 * grown;
      drawGlow(ctx, BALL_CORE, ball.x, ball.y, radius * 0.6);
      ctx.globalAlpha = 1;
      endLightBatch(ctx);
      ctx.globalCompositeOperation = "source-over";
      drawSnowball(ctx, roll, ms, ball, radius, SPECK);
    }

    // the beetle pushing from behind, straining harder as the ball grows;
    // after the flip lurching after it and gone
    const tremble = STRAIN * (0.3 + grown);
    const jitterX = Math.sin(now * 0.11) * tremble;
    const jitterY = Math.cos(now * 0.137) * tremble;
    const behind = radius + SHELL_L * 0.45;
    let alpha = 1;
    let angle = Math.atan2(dirY, dirX);
    if (ms < s.end) {
      beetle.x = ball.x - dirX * behind + jitterX;
      beetle.y = ball.y - dirY * behind + jitterY;
    } else {
      const since = ms - s.end;
      const lurch = Math.sin(clamp01(since / FLIP_MS) * Math.PI);
      beetle.x = s.from.x + jitterX;
      beetle.y = s.from.y - (s.maxR + SHELL_L * 0.45) + jitterY - lurch * KICK;
      angle = Math.atan2(s.to.y - beetle.y, s.to.x - beetle.x);
      alpha = 1 - clamp01((ms - s.land) / FADE_MS);
    }
    drawBeetle(
      ctx,
      angle,
      ms * SCURRY * (1 + 2 * grown),
      grown,
      alpha,
      ms,
      now,
    );

    if (landed >= 0) drawDetonation(ctx, s.to, landed, BLAST, now);
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
