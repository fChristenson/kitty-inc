// Haymaker, a lock crit: the number balls up into a fist of light beside the
// dark locked floor and winds up, drawing back from the lock, trembling
// harder, glowing hotter, light racing into it, the rumble rising; then it
// lunges across in a blink and punches the lock: the hardest shake, a huge
// blast, the floor bursting open; the follow-through carries on into the new
// floor's bar, a second blast: each of the new floor's next taps punches
// harder, landing one more level than the last
import {
  chargeAt,
  drawChargeGlow,
  drawChargeStreaks,
  planCharge,
  tickCharge,
  trembleAt,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import meta from "./meta";
import { defineTapPerk } from "../../../buttonCrits/buttonBonus";
import { getLockCenter } from "../../../../floors/floorLock";
import { getIncomeBarBox } from "../../../../floors/incomePanel";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";

// the number arcing to the fist's spot beside the lock
const ARC_MS = 180;
const ARC_RISE = 120;
const ARRIVE_BLAST = 120;
// the fist popping out of the number, POP times its size, settling over POP_MS
const POP = 0.45;
const POP_MS = 160;
// the wind-up: drawing back from BACK[0] to BACK[1] px left of the lock,
// RAISE px up, cocked COCK radians, FIST px across as it charges
const CHARGE_MS = 1150;
const WIND_END = ARC_MS + CHARGE_MS;
const BACK: [number, number] = [-290, -470];
const RAISE = -50;
const COCK = 0.35;
const FIST: [number, number] = [150, 240];
const TREMBLE = 26;
const LOCK_TREMBLE = 10;
const LOCK_WASH = 0.5;
const GLOW = 480;
const STREAKS = 400;
const HOT = 0.75;
// the lunge: across in a blink, stretched, its knuckles (KNUCKLE of its size
// ahead of its middle) onto the lock
const LUNGE_MS = 70;
const OPEN_MS = WIND_END + LUNGE_MS;
const KNUCKLE = 0.3;
const STRETCH: [number, number] = [1.5, 0.72];
const SQUASH: [number, number] = [0.7, 1.28];
const OPEN_BLAST = 480;
// held on the lock, then following through into the opened floor's bar
const HOLD_MS = 60;
const FOLLOW_FROM = OPEN_MS + HOLD_MS;
const FOLLOW_MS = 130;
const PAY_MS = FOLLOW_FROM + FOLLOW_MS;
const BAR_SPOT = 0.72;
const PAY_BLAST = 320;
// the fist bursting on the bar
const POOF_MS = 180;
const POOF = 0.9;
// the trail behind it, fading TRAIL_FADE_MS after it lands
const TRAIL = 0.55;
const TRAIL_FADE_MS = 150;
// impact lines bursting out round each hit
const LINES = 14;
const LINES_MS = 240;
const LINE_W = 18;
const OPEN_LINES = 560;
const PAY_LINES = 380;
const TAIL_MS = 900;
// shakes by step: the arrival, the punch, the follow-through
const SHAKES = [0.5, 3.8, 2.2];

// the fist's sprite, knuckles to the right, built once
const SPRITE = 256;
let fist: HTMLCanvasElement | null = null;
function fistSprite(): HTMLCanvasElement {
  if (fist) return fist;
  fist = document.createElement("canvas");
  fist.width = fist.height = SPRITE;
  const g = fist.getContext("2d")!;
  g.lineJoin = "round";
  g.lineCap = "round";
  const shape = () => {
    g.beginPath();
    g.roundRect(30, 100, 74, 66, 20);
    g.roundRect(70, 64, 124, 132, 36);
    for (let k = 0; k < 4; k++) g.roundRect(146, 62 + k * 33, 80, 38, 19);
  };
  // the outline round the whole shape, then the body over it
  shape();
  g.strokeStyle = "#c46a00";
  g.lineWidth = 16;
  g.stroke();
  const body = g.createRadialGradient(150, 112, 8, 128, 130, 130);
  body.addColorStop(0, "#ffffff");
  body.addColorStop(0.35, "#fff6c4");
  body.addColorStop(0.75, "#ffd700");
  body.addColorStop(1, "#ffab00");
  g.fillStyle = body;
  shape();
  g.fill();
  // the creases between the fingers
  g.strokeStyle = "#d98a00";
  g.lineWidth = 5;
  g.beginPath();
  for (let k = 1; k < 4; k++) {
    g.moveTo(160, 62 + k * 33);
    g.lineTo(222, 62 + k * 33);
  }
  g.stroke();
  // the thumb folded across the front
  g.beginPath();
  g.roundRect(92, 150, 100, 36, 18);
  g.fillStyle = "#ffe680";
  g.fill();
  g.lineWidth = 7;
  g.strokeStyle = "#c46a00";
  g.stroke();
  // a white glint on every knuckle
  g.fillStyle = "rgba(255,255,255,0.9)";
  for (let k = 0; k < 4; k++) {
    g.beginPath();
    g.ellipse(208, 74 + k * 33, 10, 6, -0.3, 0, Math.PI * 2);
    g.fill();
  }
  return fist;
}

const LINE_COS = new Float32Array(LINES);
const LINE_SIN = new Float32Array(LINES);
const LINE_LEN = new Float32Array(LINES);
for (let i = 0; i < LINES; i++) {
  const a = (i / LINES) * Math.PI * 2 + (i % 2) * 0.18;
  LINE_COS[i] = Math.cos(a);
  LINE_SIN[i] = Math.sin(a);
  LINE_LEN[i] = i % 3 === 0 ? 1 : i % 3 === 1 ? 0.7 : 0.85;
}

interface State {
  charge: Charge;
  // the opened floor's bar spot from the lock's middle, and the
  // follow-through's turn onto it
  bar: Point;
  turn: number;
}
const states = new WeakMap<Running, State>();

// where the fist is this frame and how it's posed
const pose = { x: 0, y: 0, rot: 0, sx: 1, sy: 1, size: 0, alpha: 1, heat: 0 };
const shiver: Point = { x: 0, y: 0 };
const from: Point = { x: 0, y: 0 };
const to: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

function poseAt(ms: number, lock: Point, state: State, c: number): boolean {
  pose.sx = pose.sy = pose.alpha = 1;
  pose.rot = 0;
  pose.heat = c;
  pose.size = FIST[1];
  const knuckle = -KNUCKLE * FIST[1];
  if (ms < ARC_MS) return false;
  if (ms < WIND_END) {
    const u = (ms - ARC_MS) / CHARGE_MS;
    const p = 1 - (1 - u) ** 3;
    trembleAt(c, ms, TREMBLE, shiver);
    pose.x = lock.x + lerp(BACK[0], BACK[1], p) + shiver.x;
    pose.y = lock.y + RAISE * p + shiver.y;
    pose.rot = -COCK * p;
    const k = 1 - clamp01((ms - ARC_MS) / POP_MS);
    pose.size = lerp(FIST[0], FIST[1], c) * (1 + POP * k * k);
    return true;
  }
  if (ms < OPEN_MS) {
    const u = (ms - WIND_END) / LUNGE_MS;
    const e = u * u;
    pose.x = lock.x + lerp(BACK[1], knuckle, e);
    pose.y = lock.y + RAISE * (1 - e);
    pose.rot = -COCK * (1 - e);
    pose.sx = STRETCH[0];
    pose.sy = STRETCH[1];
    return true;
  }
  if (ms < FOLLOW_FROM) {
    const k = (ms - OPEN_MS) / HOLD_MS;
    pose.x = lock.x + knuckle;
    pose.y = lock.y;
    pose.sx = lerp(SQUASH[0], 1, k);
    pose.sy = lerp(SQUASH[1], 1, k);
    return true;
  }
  const bar = state.bar;
  if (ms < PAY_MS) {
    const u = (ms - FOLLOW_FROM) / FOLLOW_MS;
    pose.x = lock.x + lerp(knuckle, bar.x, u);
    pose.y = lock.y + bar.y * u;
    pose.rot = state.turn * Math.min(1, u * 3);
    pose.sx = STRETCH[0];
    pose.sy = STRETCH[1];
    return true;
  }
  if (ms < PAY_MS + POOF_MS) {
    const k = (ms - PAY_MS) / POOF_MS;
    pose.x = lock.x + bar.x;
    pose.y = lock.y + bar.y;
    pose.rot = state.turn;
    pose.size = FIST[1] * (1 + POOF * k);
    pose.alpha = 1 - k;
    pose.heat = 1;
    return true;
  }
  return false;
}

// lines bursting out round a hit, `reach` px, over LINES_MS
function drawImpactLines(
  ctx: CanvasRenderingContext2D,
  at: Point,
  since: number,
  reach: number,
): void {
  if (since < 0 || since >= LINES_MS) return;
  const u = since / LINES_MS;
  const e = 1 - (1 - u) * (1 - u);
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  beginLightBatch(ctx);
  for (let i = 0; i < LINES; i++) {
    const len = reach * LINE_LEN[i];
    const outer = len * (0.2 + 0.8 * e);
    const inner = outer - len * 0.45 * (1 - u);
    from.x = at.x + LINE_COS[i] * inner;
    from.y = at.y + LINE_SIN[i] * inner;
    to.x = at.x + LINE_COS[i] * outer;
    to.y = at.y + LINE_SIN[i] * outer;
    drawBeam(ctx, from, to, LINE_W * (1 - u) + 4, 1 - u);
  }
  endLightBatch(ctx);
  ctx.globalCompositeOperation = previous;
}

// each tap landing one more level than the last on top of its own: +1, +2...
const punchTaps = defineTapPerk(
  "Punch",
  (t, left) => {
    const levels = Math.max(1, meta.values.taps - left);
    t.levelUp(t.floor, levels, `+${levels + 1} Lvl`);
  },
  true,
);

registerFloorCrit("haymakerCrit", {
  reward(t) {
    punchTaps.add(t.floor, meta.values.taps);
    t.flipButton();
  },
  plan(r, _bars, hit) {
    fistSprite();
    const lock = getLockCenter();
    const box = getIncomeBarBox(false);
    const bar = {
      x: box.x + box.width * BAR_SPOT - lock.x,
      y: box.y + box.height / 2 - lock.y,
    };
    const turn = Math.atan2(bar.y, bar.x + KNUCKLE * FIST[1]);
    const charge = planCharge(ARC_MS, CHARGE_MS, {
      climaxShake: 0.8,
      bang: false,
    });
    states.set(r, { charge, bar, turn });
    r.play.hideBars?.([0]);
    hit(0, ARC_MS, 0);
    hit(0, OPEN_MS, 1);
    hit(0, PAY_MS, 2);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const lock = bars[0];
    tickCharge(state.charge, ms, r.shake);
    const c = chargeAt(state.charge, ms);

    // the lock's price, quaking as the fist charges, white as it lands
    if (ms < OPEN_MS) {
      trembleAt(c, ms + 700, LOCK_TREMBLE, shiver);
      ctx.save();
      ctx.translate(lock.x + shiver.x, lock.y + shiver.y);
      r.play.drawBar?.(ctx, 0, ms < WIND_END ? LOCK_WASH * c : 1);
      ctx.restore();
    }
    if (ms < ARC_MS) {
      const u = ms / ARC_MS;
      const p = u * u * (3 - 2 * u);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, lock.x + BACK[0], p),
        lerp(0, lock.y, p) - ARC_RISE * 4 * p * (1 - p),
        r.flashFont * (1 - 0.4 * p),
      );
    }
    spot.x = lock.x + BACK[0];
    spot.y = lock.y;
    drawDetonation(ctx, spot, ms - ARC_MS, ARRIVE_BLAST, now);

    const knuckleX = lock.x - KNUCKLE * FIST[1];
    const barX = lock.x + state.bar.x;
    const barY = lock.y + state.bar.y;
    const shown = poseAt(ms, lock, state, c);

    // the trails: the lunge's, then the follow-through's
    if (ms >= WIND_END && ms < OPEN_MS + TRAIL_FADE_MS) {
      from.x = lock.x + BACK[1];
      from.y = lock.y + RAISE;
      to.x = ms < OPEN_MS ? pose.x : knuckleX;
      to.y = ms < OPEN_MS ? pose.y : lock.y;
      const fade = clamp01((ms - OPEN_MS) / TRAIL_FADE_MS);
      drawBeam(ctx, from, to, FIST[1] * TRAIL, 0.9 * (1 - fade));
    }
    if (ms >= FOLLOW_FROM && ms < PAY_MS + TRAIL_FADE_MS) {
      from.x = knuckleX;
      from.y = lock.y;
      to.x = ms < PAY_MS ? pose.x : barX;
      to.y = ms < PAY_MS ? pose.y : barY;
      const fade = clamp01((ms - PAY_MS) / TRAIL_FADE_MS);
      drawBeam(ctx, from, to, FIST[1] * TRAIL, 0.9 * (1 - fade));
    }

    if (shown) {
      if (ms < WIND_END) drawChargeStreaks(ctx, pose, c, STREAKS, ms);
      if (ms < PAY_MS) drawChargeGlow(ctx, pose, c, GLOW, now);
      const sprite = fist!;
      const half = pose.size / 2;
      ctx.save();
      ctx.globalAlpha *= pose.alpha;
      ctx.translate(pose.x, pose.y);
      ctx.rotate(pose.rot);
      ctx.scale(pose.sx, pose.sy);
      ctx.drawImage(sprite, -half, -half, pose.size, pose.size);
      if (pose.heat > 0) {
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha *= HOT * pose.heat;
        ctx.drawImage(sprite, -half, -half, pose.size, pose.size);
      }
      ctx.restore();
    }

    // the punch bursting the lock, then the follow-through landing on the bar
    drawDetonation(ctx, lock, ms - OPEN_MS, OPEN_BLAST, now);
    drawImpactLines(ctx, lock, ms - OPEN_MS, OPEN_LINES);
    spot.x = barX;
    spot.y = barY;
    drawDetonation(ctx, spot, ms - PAY_MS, PAY_BLAST, now);
    drawImpactLines(ctx, spot, ms - PAY_MS, PAY_LINES);
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
