// Hole Saw, a lock crit: the number arcs onto the dark locked floor's lock and
// a glowing ring saw, a toothed circle of light spinning to a blur, slams down
// round it; it stalls on the bite rumbling, then bores in shove by quickening
// shove, each a jolt and a gush of sparks spraying out both sides, the cut
// circle glowing hotter round the lock; on the last it breaks through, the
// floor bursts open and the white-hot cut-out disc pops out spinning and flies
// onto the new floor's button, welding on: its next crit sticks there for a
// few taps
import meta from "./meta";
import { addNails } from "../../../buttonCrits/buttonBonus";
import { drawDrillSpray } from "../../../../shared/animationStyles/drill";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow } from "../../../../shared/glowSprite";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import { getLockCenter } from "../../../../floors/floorLock";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  clamp01,
  drawText,
  glowStops,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

const ARC_MS = 150;
const ARC_RISE = 120;
// the saw slamming down from SLAM_FROM times its size onto the lock
const SLAM_MS = 110;
const SLAM_FROM = 2.6;
const BITE = ARC_MS + SLAM_MS;
// stalled on the bite rumbling, then SHOVES quickening shoves through
const STALL_MS = 300;
const GIVES = BITE + STALL_MS;
const RUMBLE_MS = 60;
const RUMBLE_SHAKE = 0.4;
const SHOVES = 8;
const BORE_MS = 1450;
const THROUGH = GIVES + BORE_MS;
const SHOVE_MS = 70;
const KICK_MS = 140;
const SHOVE_AT = new Float64Array(SHOVES);
{
  let sum = 0;
  for (let k = 0; k < SHOVES; k++) sum += lerp(1.35, 0.65, k / (SHOVES - 1));
  let clock = GIVES;
  for (let k = 0; k < SHOVES; k++) {
    SHOVE_AT[k] = clock;
    clock += (BORE_MS * lerp(1.35, 0.65, k / (SHOVES - 1))) / sum;
  }
}
// the saw: R px to its rim, TEETH teeth TOOTH px tall, spinning SPIN rad/ms
const R = 170;
const TOOTH = 34;
const TEETH = 28;
const SPIN: [number, number] = [0.03, 0.055];
const BLUR_MS = 300;
const GHOSTS = 2;
const GHOST_STEP = 0.12;
// px it judders stalled and boring, and how far each shove sinks it
const JUDDER: [number, number] = [10, 4];
const KICK_JUDDER = 6;
const SINK = 0.14;
const SHOVE_SINK = 0.07;
const BREAK_MS = 200;
// the sparks gushing off the rim
const SPRAY = 100;
const SPRAY_BORING: [number, number] = [0.85, 1.5];
const SPRAY_KICK = 0.5;
const SPRAY_FADE_MS = 300;
const GLOW_ALPHA: [number, number] = [0.25, 0.75];
const THROUGH_BLAST = 340;
// the cut-out disc popping out and flying onto the new floor's button
const DISC_R = R - 6;
const POP_DELAY_MS = 40;
const DISC_MS = 240;
const DISC_ARC = 150;
const DISC_SPIN = 0.04;
const DISC_POP = 1.35;
const DISC_END = 0.4;
const POP_AT = THROUGH + POP_DELAY_MS;
const LAND_AT = POP_AT + DISC_MS;
const LAND_BLAST = 170;
// shakes by step: a bite or shove, the breakthrough, the disc landing
const SHAKES = [0.8, 3.4, 1.4];

const GOLD = glowStops(COLOR.heavenlyGold);
const WHITE = glowStops(COLOR.white);
const BAND = COLOR.heavenlyGold;
const KERF_GOLD = "#ffb02e";
const KERF_WHITE = COLOR.white;

// the toothed ring and the disc it cuts, built on first use
let sawCanvas: HTMLCanvasElement | null = null;
let discCanvas: HTMLCanvasElement | null = null;
const SAW_HALF = R + TOOTH + 8;
const DISC_HALF = DISC_R + 4;

function sawSprite(): HTMLCanvasElement {
  if (sawCanvas) return sawCanvas;
  const c = document.createElement("canvas");
  c.width = c.height = SAW_HALF * 2;
  const g = c.getContext("2d")!;
  g.translate(SAW_HALF, SAW_HALF);
  const step = (Math.PI * 2) / TEETH;
  g.fillStyle = COLOR.heavenlyGold;
  g.beginPath();
  for (let k = 0; k < TEETH; k++) {
    const a = k * step;
    g.moveTo(Math.cos(a) * (R - 2), Math.sin(a) * (R - 2));
    g.lineTo(
      Math.cos(a + step * 0.15) * (R + TOOTH),
      Math.sin(a + step * 0.15) * (R + TOOTH),
    );
    g.lineTo(
      Math.cos(a + step * 0.6) * (R - 2),
      Math.sin(a + step * 0.6) * (R - 2),
    );
    g.closePath();
  }
  g.fill();
  g.lineWidth = 9;
  g.strokeStyle = COLOR.heavenlyGold;
  g.beginPath();
  g.arc(0, 0, R, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 3.5;
  g.strokeStyle = COLOR.white;
  g.stroke();
  sawCanvas = c;
  return c;
}

function discSprite(): HTMLCanvasElement {
  if (discCanvas) return discCanvas;
  const c = document.createElement("canvas");
  c.width = c.height = DISC_HALF * 2;
  const g = c.getContext("2d")!;
  g.translate(DISC_HALF, DISC_HALF);
  const fill = g.createRadialGradient(0, 0, 0, 0, 0, DISC_R);
  fill.addColorStop(0, COLOR.white);
  fill.addColorStop(0.45, COLOR.heavenlyGold);
  fill.addColorStop(1, "#ff7a1a");
  g.fillStyle = fill;
  g.beginPath();
  g.arc(0, 0, DISC_R, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 6;
  g.strokeStyle = "#fff3c4";
  g.stroke();
  // scorch marks so its spin reads, round the pilot hole
  g.lineWidth = 8;
  g.lineCap = "round";
  g.strokeStyle = "#a8460f";
  g.beginPath();
  for (let k = 0; k < 3; k++) {
    const a = (k * Math.PI * 2) / 3;
    g.moveTo(Math.cos(a) * DISC_R * 0.3, Math.sin(a) * DISC_R * 0.3);
    g.lineTo(Math.cos(a) * DISC_R * 0.82, Math.sin(a) * DISC_R * 0.82);
  }
  g.stroke();
  g.fillStyle = "#2a1606";
  g.beginPath();
  g.arc(0, 0, DISC_R * 0.14, 0, Math.PI * 2);
  g.fill();
  discCanvas = c;
  return c;
}

// how far it has bored, 0 at the bite to 1 through
function depthAt(ms: number): number {
  let d = 0;
  for (let k = 0; k < SHOVES; k++) {
    const since = ms - SHOVE_AT[k];
    if (since < 0) break;
    d += Math.min(1, since / SHOVE_MS) ** 0.5;
  }
  return d / SHOVES;
}

// 1 on a shove, dying out over KICK_MS
function kickAt(ms: number): number {
  let last = -1;
  for (let k = 0; k < SHOVES; k++) if (SHOVE_AT[k] <= ms) last = k;
  if (last < 0 || ms >= THROUGH) return 0;
  return Math.max(0, 1 - (ms - SHOVE_AT[last]) / KICK_MS);
}

// the opened floor's button, from the lock's middle
const BUTTON: Point = { x: 0, y: 0 };
const ORIGIN: Point = { x: 0, y: 0 };
const RIM: Point = { x: 0, y: 0 };
const disc: Point = { x: 0, y: 0 };
// the disc from the lock onto the button, on one arch
const discAt = (ms: number): Point | null => {
  if (ms < POP_AT || ms > LAND_AT) return null;
  const u = (ms - POP_AT) / DISC_MS;
  disc.x = BUTTON.x * u;
  disc.y = BUTTON.y * u - DISC_ARC * 4 * u * (1 - u);
  return disc;
};

registerFloorCrit("holeSawCrit", {
  // the hot plug welded onto the opened floor's button: its next crit sticks
  reward(t) {
    addNails(t.floor, meta.values.taps);
    t.flipButton();
  },
  plan(_r, _bars, hit) {
    sawSprite();
    discSprite();
    const lock = getLockCenter();
    const btn = getButtonCenter(false);
    BUTTON.x = btn.x - lock.x;
    BUTTON.y = btn.y - lock.y;
    hit(0, BITE, 0);
    for (let k = 0; k < SHOVES; k++) hit(0, SHOVE_AT[k], 0);
    hit(0, THROUGH, 1);
    hit(0, LAND_AT, 2);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const c = bars[0];
    if (ms < ARC_MS) {
      const u = ms / ARC_MS;
      const p = u * u * (3 - 2 * u);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        c.x * p,
        c.y * p - ARC_RISE * 4 * p * (1 - p),
        r.flashFont * (1 - 0.5 * p),
      );
    }
    // rumbling all through the stall
    const due =
      ms < BITE
        ? 0
        : Math.min(
            STALL_MS / RUMBLE_MS,
            Math.floor((ms - BITE) / RUMBLE_MS) + 1,
          );
    while (r.kicked < due) {
      r.kicked++;
      r.shake(RUMBLE_SHAKE);
    }

    ctx.save();
    ctx.translate(c.x, c.y);
    const depth = depthAt(ms);
    const kick = kickAt(ms);
    const grinding = ms >= BITE && ms < THROUGH;

    if (ms >= ARC_MS && ms < THROUGH + BREAK_MS) {
      const broke = clamp01((ms - THROUGH) / BREAK_MS);
      const slam = clamp01((ms - ARC_MS) / SLAM_MS);
      let scale =
        ms < BITE
          ? lerp(SLAM_FROM, 1, slam * slam)
          : 1 - SINK * depth - SHOVE_SINK * kick;
      scale *= 1 + 0.8 * broke;
      const fade = 1 - broke;
      let jx = 0;
      let jy = 0;
      if (grinding) {
        const amp = (ms < GIVES ? JUDDER[0] : JUDDER[1]) + KICK_JUDDER * kick;
        const tick = Math.floor(ms / 16);
        jx = (holeHash(tick, 7) - 0.5) * 2 * amp;
        jy = (holeHash(tick, 13) - 0.5) * amp;
      }
      ctx.globalCompositeOperation = "lighter";
      // the lock glowing hotter as the cut deepens, flaring on each shove
      if (ms >= BITE) {
        ctx.globalAlpha =
          fade *
          Math.min(1, lerp(GLOW_ALPHA[0], GLOW_ALPHA[1], depth) + 0.3 * kick);
        drawGlow(ctx, GOLD, 0, 0, R * (1.5 + 0.8 * depth));
        // the cut circle, gold to white-hot
        ctx.beginPath();
        ctx.arc(jx, jy, R * scale, 0, Math.PI * 2);
        ctx.lineWidth = 6 + 12 * depth;
        ctx.globalAlpha = fade * (0.4 + 0.6 * depth);
        ctx.strokeStyle = KERF_GOLD;
        ctx.stroke();
        ctx.lineWidth = 2 + 6 * depth;
        ctx.globalAlpha = fade * depth * depth;
        ctx.strokeStyle = KERF_WHITE;
        ctx.stroke();
        if (kick > 0) {
          ctx.globalAlpha = kick * 0.8;
          drawGlow(ctx, WHITE, jx, jy, R * 0.9);
        }
      }
      // the saw: its teeth spun to a blur band, ghosted behind
      const blur = clamp01((ms - ARC_MS) / BLUR_MS);
      const turn = ms * (ms < BITE ? SPIN[0] : SPIN[1]);
      ctx.beginPath();
      ctx.arc(jx, jy, (R + TOOTH * 0.5) * scale, 0, Math.PI * 2);
      ctx.lineWidth = TOOTH * scale;
      ctx.strokeStyle = BAND;
      ctx.globalAlpha = fade * 0.45 * blur;
      ctx.stroke();
      const saw = sawSprite();
      ctx.save();
      ctx.translate(jx, jy);
      ctx.scale(scale, scale);
      ctx.rotate(turn);
      for (let g = 0; g <= GHOSTS; g++) {
        ctx.globalAlpha = fade * (g === 0 ? 1 - 0.5 * blur : (0.5 * blur) / g);
        ctx.drawImage(saw, -SAW_HALF, -SAW_HALF);
        ctx.rotate(-GHOST_STEP);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }

    // sparks gushing off the rim's foot both sides, a surge on every shove
    if (ms >= BITE && ms < THROUGH + SPRAY_FADE_MS) {
      const hard =
        ms < GIVES
          ? 1
          : lerp(SPRAY_BORING[0], SPRAY_BORING[1], depth) *
            (1 + SPRAY_KICK * kick);
      RIM.x = 0;
      RIM.y = R * (1 - SINK * depth);
      drawDrillSpray(
        ctx,
        RIM,
        Math.PI / 2,
        ms - BITE,
        hard * (1 - clamp01((ms - THROUGH) / SPRAY_FADE_MS)),
        SPRAY,
        now,
      );
    }
    drawDetonation(ctx, ORIGIN, ms - THROUGH, THROUGH_BLAST, now);

    // the white-hot disc popping out at the viewer and spinning onto the button
    drawWispBetween(ctx, discAt, ms, now, WISP_SIZE * 1.3, 1, POP_AT, LAND_AT);
    const at = discAt(ms);
    if (at) {
      const u = (ms - POP_AT) / DISC_MS;
      const size =
        u < 0.3
          ? lerp(1, DISC_POP, u / 0.3)
          : lerp(DISC_POP, DISC_END, ((u - 0.3) / 0.7) ** 2);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.7;
      drawGlow(ctx, GOLD, at.x, at.y, DISC_R * size * 1.6);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.save();
      ctx.translate(at.x, at.y);
      ctx.rotate(ms * DISC_SPIN);
      ctx.scale(size, size);
      ctx.drawImage(discSprite(), -DISC_HALF, -DISC_HALF);
      ctx.restore();
    }
    drawDetonation(ctx, BUTTON, ms - LAND_AT, LAND_BLAST, now);
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
